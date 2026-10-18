import { db } from '../db/db'
import { getCloudAdapter, nuvemAtiva } from './adapters'
import type {
  ClienteRemoto,
  DividaRemota,
  ParcelaRemota,
  PagamentoRemoto,
} from './adapters/types'

// Camada de sincronização Dexie (local) <-> nuvem (via CloudAdapter).
//
// Estratégia (decisão A+B):
// - O Dexie é a base offline. Cada registro tem `syncStatus`:
//   'local' = criado/alterado offline e ainda não enviado;
//   'sincronizado' = em dia com a nuvem.
// - PUSH: envia registros 'local' (upsert; pagamentos apenas create).
// - PULL: baixa da nuvem e grava no Dexie com last-write-wins por
//   `atualizadoEm`. Não sobrescreve itens locais ainda pendentes.
// - O adapter concreto (Amplify real ou DynamoDB Local) é escolhido por env.

type Estado = 'ocioso' | 'sincronizando'

let estado: Estado = 'ocioso'
const ouvintes = new Set<() => void>()

export interface StatusSync {
  estado: Estado
  pendencias: number
  ultimoErro: string | null
  ultimaSync: string | null
}

let ultimoErro: string | null = null

export function assinarSync(fn: () => void): () => void {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

function notificar() {
  for (const fn of ouvintes) fn()
}

export async function contarPendencias(): Promise<number> {
  const [c, d, p, pg] = await Promise.all([
    db.clientes.where('syncStatus').equals('local').count(),
    db.dividas.where('syncStatus').equals('local').count(),
    db.parcelas.where('syncStatus').equals('local').count(),
    db.pagamentos.where('syncStatus').equals('local').count(),
  ])
  return c + d + p + pg
}

export async function obterStatus(): Promise<StatusSync> {
  const pendencias = await contarPendencias()
  const ultimaSync = (await db.syncMeta.get('ultimaSync'))?.valor ?? null
  return { estado, pendencias, ultimoErro, ultimaSync }
}

async function marcarSincronizado(
  tabela: 'clientes' | 'dividas' | 'parcelas' | 'pagamentos',
  id: string,
) {
  await db.table(tabela).update(id, { syncStatus: 'sincronizado' })
}

// ---------- PUSH ----------

async function pushClientes(adapter: Awaited<ReturnType<typeof getCloudAdapter>>) {
  if (!adapter) return
  const pendentes = await db.clientes.where('syncStatus').equals('local').toArray()
  for (const c of pendentes) {
    await adapter.salvarCliente({
      id: c.id,
      empresaId: c.empresaId,
      nomeCompleto: c.nomeCompleto,
      nomeBusca: c.nomeBusca,
      telefone: c.telefone,
      documento: c.documento ?? null,
      documentoBusca: c.documentoBusca ?? null,
      email: c.email ?? null,
      endereco: c.endereco ?? null,
      criadoEm: c.criadoEm,
      atualizadoEm: c.atualizadoEm,
    })
    await marcarSincronizado('clientes', c.id)
  }
}

async function pushDividas(adapter: Awaited<ReturnType<typeof getCloudAdapter>>) {
  if (!adapter) return
  const pendentes = await db.dividas.where('syncStatus').equals('local').toArray()
  for (const d of pendentes) {
    await adapter.salvarDivida({
      id: d.id,
      empresaId: d.empresaId,
      clienteId: d.clienteId,
      descricao: d.descricao ?? null,
      valorTotal: d.valorTotal,
      numeroParcelas: d.numeroParcelas,
      diaVencimento: d.diaVencimento,
      primeiraData: d.primeiraData,
      status: d.status,
      criadoEm: d.criadoEm,
      atualizadoEm: d.atualizadoEm,
    })
    await marcarSincronizado('dividas', d.id)
  }
}

async function pushParcelas(adapter: Awaited<ReturnType<typeof getCloudAdapter>>) {
  if (!adapter) return
  const pendentes = await db.parcelas.where('syncStatus').equals('local').toArray()
  for (const p of pendentes) {
    await adapter.salvarParcela({
      id: p.id,
      empresaId: p.empresaId,
      dividaId: p.dividaId,
      clienteId: p.clienteId,
      numero: p.numero,
      valor: p.valor,
      vencimento: p.vencimento,
      status: p.status,
      pagoEm: p.pagoEm ?? null,
      atualizadoEm: p.atualizadoEm,
    })
    await marcarSincronizado('parcelas', p.id)
  }
}

// Envia empresas alteradas localmente (ex.: saldo debitado no cadastro).
async function pushEmpresas(adapter: Awaited<ReturnType<typeof getCloudAdapter>>) {
  if (!adapter) return
  const pendentes = await db.empresas.where('syncStatus').equals('local').toArray()
  for (const e of pendentes) {
    await adapter.salvarEmpresa({
      id: e.id,
      nome: e.nome,
      documento: e.documento ?? null,
      documentoBusca: e.documentoBusca ?? null,
      saldoCreditos: e.saldoCreditos,
      criadoEm: e.criadoEm,
      atualizadoEm: e.atualizadoEm,
    })
    await db.empresas.update(e.id, { syncStatus: 'sincronizado' })
  }
}

// Envia consumos de crédito registrados localmente (imutáveis).
async function pushConsumos(adapter: Awaited<ReturnType<typeof getCloudAdapter>>) {
  if (!adapter) return
  const pendentes = await db.consumos.where('syncStatus').equals('local').toArray()
  for (const c of pendentes) {
    await adapter.criarConsumo({
      id: c.id,
      empresaId: c.empresaId,
      creditos: c.creditos,
      motivo: c.motivo,
      referenciaId: c.referenciaId ?? null,
      criadoEm: c.criadoEm,
    })
    await db.consumos.update(c.id, { syncStatus: 'sincronizado' })
  }
}

async function pushPagamentos(adapter: Awaited<ReturnType<typeof getCloudAdapter>>) {
  if (!adapter) return
  const pendentes = await db.pagamentos.where('syncStatus').equals('local').toArray()
  for (const pg of pendentes) {
    await adapter.criarPagamento({
      id: pg.id,
      empresaId: pg.empresaId,
      parcelaId: pg.parcelaId,
      dividaId: pg.dividaId,
      clienteId: pg.clienteId,
      valorPago: pg.valorPago,
      dataPagamento: pg.dataPagamento,
    })
    await marcarSincronizado('pagamentos', pg.id)
  }
}

// ---------- PULL ----------

// Grava um registro da nuvem no Dexie com last-write-wins.
async function mesclarLocal<T extends { id: string; atualizadoEm?: string | null }>(
  tabela: 'clientes' | 'dividas' | 'parcelas' | 'pagamentos',
  remoto: T,
  temAtualizadoEm: boolean,
) {
  const local = await db.table(tabela).get(remoto.id)
  if (local) {
    if (local.syncStatus === 'local') return // pendente local não é sobrescrito
    if (temAtualizadoEm) {
      const remotoEm = (remoto.atualizadoEm ?? '') as string
      const localEm = (local.atualizadoEm ?? '') as string
      if (remotoEm <= localEm) return
    }
  }
  await db.table(tabela).put({ ...remoto, syncStatus: 'sincronizado' })
}

async function pullTudo(adapter: NonNullable<Awaited<ReturnType<typeof getCloudAdapter>>>) {
  const clientes: ClienteRemoto[] = await adapter.listarClientes()
  for (const c of clientes) {
    await mesclarLocal('clientes', { ...c, documento: c.documento ?? undefined, documentoBusca: c.documentoBusca ?? undefined, email: c.email ?? undefined, endereco: c.endereco ?? undefined }, true)
  }

  const dividas: DividaRemota[] = await adapter.listarDividas()
  for (const d of dividas) {
    await mesclarLocal('dividas', { ...d, descricao: d.descricao ?? undefined }, true)
  }

  const parcelas: ParcelaRemota[] = await adapter.listarParcelas()
  for (const p of parcelas) {
    await mesclarLocal('parcelas', { ...p, pagoEm: p.pagoEm ?? undefined }, true)
  }

  const pagamentos: PagamentoRemoto[] = await adapter.listarPagamentos()
  for (const pg of pagamentos) {
    await mesclarLocal('pagamentos', pg, false)
  }
}

// ---------- Orquestração ----------

export async function sincronizar(): Promise<void> {
  if (!nuvemAtiva()) return
  if (!navigator.onLine) return
  if (estado === 'sincronizando') return

  const adapter = await getCloudAdapter()
  if (!adapter) return

  estado = 'sincronizando'
  ultimoErro = null
  notificar()
  try {
    await pushEmpresas(adapter)
    await pushConsumos(adapter)
    await pushClientes(adapter)
    await pushDividas(adapter)
    await pushParcelas(adapter)
    await pushPagamentos(adapter)
    await pullTudo(adapter)
    await db.syncMeta.put({ chave: 'ultimaSync', valor: new Date().toISOString() })
  } catch (e) {
    ultimoErro = e instanceof Error ? e.message : 'Erro de sincronização.'
  } finally {
    estado = 'ocioso'
    notificar()
  }
}

let listenerRegistrado = false
export function iniciarSyncAutomatico() {
  if (listenerRegistrado) return
  listenerRegistrado = true
  window.addEventListener('online', () => {
    void sincronizar()
  })
}
