import { db } from './db'
import type { Cliente, Divida, Parcela, Pagamento, ConsumoCredito } from './types'
import { normalizarTexto, apenasDigitos, pontuarNome } from '../domain/text'
import {
  gerarParcelas,
  parcelaVencida,
  totalEmAberto,
  proximoVencimento,
  vencimentoMaisAtrasado,
  resumirParaEdicao,
  gerarParcelasAbertasEditadas,
  type ResumoEdicaoDivida,
} from '../domain/parcelas'
import { reaisToCentavos, centavosToReais } from '../domain/money'
import { todayISO } from '../domain/dates'
import { exigirEmpresaAtiva } from './tenant'

function novoId(): string {
  // crypto.randomUUID está disponível em navegadores modernos.
  return crypto.randomUUID()
}

function agoraISO(): string {
  return new Date().toISOString()
}

// Erro lançado quando a empresa não tem saldo de créditos para cadastrar.
export class SaldoInsuficienteError extends Error {
  constructor() {
    super('Saldo de créditos insuficiente. Recarregue para cadastrar novos clientes.')
    this.name = 'SaldoInsuficienteError'
  }
}

// Custo em créditos por cliente cadastrado (regra: 1 cliente = 1 crédito).
export const CREDITOS_POR_CLIENTE = 1

// ---------- Clientes ----------

export interface DadosCliente {
  nomeCompleto: string
  telefone: string
  documento?: string
  email?: string
  endereco?: string
}

// Cria um cliente DEBITANDO 1 crédito da empresa ativa e registrando o
// consumo. Lança SaldoInsuficienteError se o saldo não cobrir o custo.
export async function criarCliente(dados: DadosCliente): Promise<Cliente> {
  const empresaId = exigirEmpresaAtiva()
  const agora = agoraISO()
  const documento = dados.documento?.trim() || undefined

  const cliente: Cliente = {
    id: novoId(),
    empresaId,
    nomeCompleto: dados.nomeCompleto.trim(),
    nomeBusca: normalizarTexto(dados.nomeCompleto),
    telefone: dados.telefone.trim(),
    documento,
    documentoBusca: documento ? apenasDigitos(documento) : undefined,
    email: dados.email?.trim() || undefined,
    endereco: dados.endereco?.trim() || undefined,
    criadoEm: agora,
    atualizadoEm: agora,
    syncStatus: 'local',
  }

  await db.transaction('rw', db.clientes, db.empresas, db.consumos, async () => {
    const empresa = await db.empresas.get(empresaId)
    if (!empresa) throw new Error('Empresa ativa não encontrada.')
    if (empresa.saldoCreditos < CREDITOS_POR_CLIENTE) {
      throw new SaldoInsuficienteError()
    }

    await db.clientes.add(cliente)

    // Debita o crédito e registra o consumo (base do relatório).
    await db.empresas.update(empresaId, {
      saldoCreditos: empresa.saldoCreditos - CREDITOS_POR_CLIENTE,
      atualizadoEm: agora,
      syncStatus: 'local',
    })
    const consumo: ConsumoCredito = {
      id: novoId(),
      empresaId,
      creditos: CREDITOS_POR_CLIENTE,
      motivo: 'cliente_cadastrado',
      referenciaId: cliente.id,
      criadoEm: agora,
      syncStatus: 'local',
    }
    await db.consumos.add(consumo)
  })

  return cliente
}

export async function atualizarCliente(id: string, dados: DadosCliente): Promise<void> {
  const documento = dados.documento?.trim() || undefined
  await db.clientes.update(id, {
    nomeCompleto: dados.nomeCompleto.trim(),
    nomeBusca: normalizarTexto(dados.nomeCompleto),
    telefone: dados.telefone.trim(),
    documento,
    documentoBusca: documento ? apenasDigitos(documento) : undefined,
    email: dados.email?.trim() || undefined,
    endereco: dados.endereco?.trim() || undefined,
    atualizadoEm: agoraISO(),
    syncStatus: 'local',
  })
}

export async function obterCliente(id: string): Promise<Cliente | undefined> {
  return db.clientes.get(id)
}

// ---------- Busca (escopada na empresa ativa) ----------

export interface ResultadoBusca {
  cliente: Cliente
  score: number
}

export async function buscarClientes(termo: string, limite = 10): Promise<ResultadoBusca[]> {
  const termoTrim = termo.trim()
  if (termoTrim.length === 0) return []
  const empresaId = exigirEmpresaAtiva()

  const todos = await db.clientes.where('empresaId').equals(empresaId).toArray()
  const digitos = apenasDigitos(termoTrim)
  const termoNorm = normalizarTexto(termoTrim)

  const resultados: ResultadoBusca[] = []
  for (const c of todos) {
    let score = 0
    if (digitos.length >= 3 && c.documentoBusca) {
      if (c.documentoBusca.startsWith(digitos)) score = Math.max(score, 1)
      else if (c.documentoBusca.includes(digitos)) score = Math.max(score, 0.85)
    }
    score = Math.max(score, pontuarNome(termoNorm, c.nomeBusca))
    if (score > 0) resultados.push({ cliente: c, score })
  }

  resultados.sort((a, b) => b.score - a.score)
  return resultados.filter((r) => r.score >= 0.34).slice(0, limite)
}

// ---------- Dívidas e parcelas ----------

export interface DadosDivida {
  descricao?: string
  valorTotal: number
  numeroParcelas: number
  diaVencimento: number
  primeiraData: string // YYYY-MM-DD
}

export async function criarDivida(clienteId: string, dados: DadosDivida): Promise<Divida> {
  const empresaId = exigirEmpresaAtiva()
  const agora = agoraISO()
  const divida: Divida = {
    id: novoId(),
    empresaId,
    clienteId,
    descricao: dados.descricao?.trim() || undefined,
    valorTotal: dados.valorTotal,
    numeroParcelas: dados.numeroParcelas,
    diaVencimento: dados.diaVencimento,
    primeiraData: dados.primeiraData,
    status: 'ativa',
    criadoEm: agora,
    atualizadoEm: agora,
    syncStatus: 'local',
  }

  const entradas = gerarParcelas({
    valorTotal: dados.valorTotal,
    numeroParcelas: dados.numeroParcelas,
    diaVencimento: dados.diaVencimento,
    primeiraData: dados.primeiraData,
  })

  const parcelas: Parcela[] = entradas.map((e) => ({
    id: novoId(),
    empresaId,
    dividaId: divida.id,
    clienteId,
    numero: e.numero,
    valor: e.valor,
    vencimento: e.vencimento,
    status: 'aberta',
    atualizadoEm: agora,
    syncStatus: 'local',
  }))

  await db.transaction('rw', db.dividas, db.parcelas, async () => {
    await db.dividas.add(divida)
    await db.parcelas.bulkAdd(parcelas)
  })

  return divida
}

export async function listarDividasDoCliente(clienteId: string): Promise<Divida[]> {
  return db.dividas.where('clienteId').equals(clienteId).toArray()
}

export async function listarParcelasDaDivida(dividaId: string): Promise<Parcela[]> {
  const parcelas = await db.parcelas.where('dividaId').equals(dividaId).toArray()
  return parcelas.sort((a, b) => a.numero - b.numero)
}

export async function listarParcelasDoCliente(clienteId: string): Promise<Parcela[]> {
  return db.parcelas.where('clienteId').equals(clienteId).toArray()
}

// ---------- Baixa de parcela / dívida ----------

export async function baixarParcela(parcelaId: string, dataPagamentoISO?: string): Promise<void> {
  await db.transaction('rw', db.parcelas, db.dividas, db.pagamentos, async () => {
    const parcela = await db.parcelas.get(parcelaId)
    if (!parcela || parcela.status === 'paga') return

    const dataPagamento = dataPagamentoISO ?? agoraISO()
    await db.parcelas.update(parcelaId, {
      status: 'paga',
      pagoEm: dataPagamento,
      atualizadoEm: agoraISO(),
      syncStatus: 'local',
    })

    const pagamento: Pagamento = {
      id: novoId(),
      empresaId: parcela.empresaId,
      parcelaId: parcela.id,
      dividaId: parcela.dividaId,
      clienteId: parcela.clienteId,
      valorPago: parcela.valor,
      dataPagamento,
      syncStatus: 'local',
    }
    await db.pagamentos.add(pagamento)

    await atualizarStatusDividaSePaga(parcela.dividaId)
  })
}

export async function baixarDividaInteira(dividaId: string, dataPagamentoISO?: string): Promise<void> {
  await db.transaction('rw', db.parcelas, db.dividas, db.pagamentos, async () => {
    const abertas = await db.parcelas
      .where('dividaId')
      .equals(dividaId)
      .filter((p) => p.status === 'aberta')
      .toArray()

    const dataPagamento = dataPagamentoISO ?? agoraISO()
    for (const parcela of abertas) {
      await db.parcelas.update(parcela.id, {
        status: 'paga',
        pagoEm: dataPagamento,
        atualizadoEm: agoraISO(),
        syncStatus: 'local',
      })
      const pagamento: Pagamento = {
        id: novoId(),
        empresaId: parcela.empresaId,
        parcelaId: parcela.id,
        dividaId: parcela.dividaId,
        clienteId: parcela.clienteId,
        valorPago: parcela.valor,
        dataPagamento,
        syncStatus: 'local',
      }
      await db.pagamentos.add(pagamento)
    }

    await db.dividas.update(dividaId, {
      status: 'quitada',
      atualizadoEm: agoraISO(),
      syncStatus: 'local',
    })
  })
}

async function atualizarStatusDividaSePaga(dividaId: string): Promise<void> {
  const parcelas = await db.parcelas.where('dividaId').equals(dividaId).toArray()
  const todasPagas = parcelas.length > 0 && parcelas.every((p) => p.status === 'paga')
  if (todasPagas) {
    await db.dividas.update(dividaId, {
      status: 'quitada',
      atualizadoEm: agoraISO(),
      syncStatus: 'local',
    })
  }
}

// ---------- Edição de dívida ----------

export async function obterResumoEdicaoDivida(dividaId: string): Promise<ResumoEdicaoDivida> {
  const parcelas = await listarParcelasDaDivida(dividaId)
  return resumirParaEdicao(parcelas)
}

export interface DadosEdicaoDivida {
  descricao?: string
  novoValorAberto: number
  numeroParcelasAbertas: number
  diaVencimento: number
  primeiraData: string
}

export async function editarDivida(dividaId: string, dados: DadosEdicaoDivida): Promise<void> {
  const empresaId = exigirEmpresaAtiva()
  await db.transaction('rw', db.dividas, db.parcelas, async () => {
    const divida = await db.dividas.get(dividaId)
    if (!divida) throw new Error('Dívida não encontrada.')

    const parcelas = await db.parcelas.where('dividaId').equals(dividaId).toArray()
    const pagas = parcelas.filter((p) => p.status === 'paga')
    const abertas = parcelas.filter((p) => p.status === 'aberta')

    const resumo = resumirParaEdicao(parcelas)
    const agora = agoraISO()

    await db.parcelas.bulkDelete(abertas.map((p) => p.id))

    const entradas =
      dados.numeroParcelasAbertas > 0
        ? gerarParcelasAbertasEditadas({
            novoValorAberto: dados.novoValorAberto,
            numeroParcelasAbertas: dados.numeroParcelasAbertas,
            diaVencimento: dados.diaVencimento,
            primeiraData: dados.primeiraData,
            numeroInicial: resumo.maiorNumeroPago + 1,
          })
        : []

    const novasParcelas: Parcela[] = entradas.map((e) => ({
      id: novoId(),
      empresaId,
      dividaId,
      clienteId: divida.clienteId,
      numero: e.numero,
      valor: e.valor,
      vencimento: e.vencimento,
      status: 'aberta',
      atualizadoEm: agora,
      syncStatus: 'local',
    }))
    if (novasParcelas.length > 0) await db.parcelas.bulkAdd(novasParcelas)

    const novoTotalCentavos =
      reaisToCentavos(resumo.totalPago) + reaisToCentavos(dados.novoValorAberto)
    const totalParcelas = pagas.length + novasParcelas.length
    const novoStatus = novasParcelas.length === 0 ? 'quitada' : 'ativa'

    await db.dividas.update(dividaId, {
      descricao: dados.descricao?.trim() || undefined,
      valorTotal: centavosToReais(novoTotalCentavos),
      numeroParcelas: totalParcelas,
      diaVencimento: dados.diaVencimento,
      status: novoStatus,
      atualizadoEm: agora,
      syncStatus: 'local',
    })
  })
}

// ---------- Lista de clientes (ordenada, escopada na empresa ativa) ----------

export interface ItemLista {
  cliente: Cliente
  totalEmAberto: number
  temVencida: boolean
  vencimentoMaisAtrasado: string | null
  proximoVencimento: string | null
}

export async function montarListaClientes(): Promise<ItemLista[]> {
  const empresaId = exigirEmpresaAtiva()
  const hoje = todayISO()
  const [clientes, parcelas] = await Promise.all([
    db.clientes.where('empresaId').equals(empresaId).toArray(),
    db.parcelas.where('empresaId').equals(empresaId).toArray(),
  ])

  const porCliente = new Map<string, Parcela[]>()
  for (const p of parcelas) {
    const arr = porCliente.get(p.clienteId)
    if (arr) arr.push(p)
    else porCliente.set(p.clienteId, [p])
  }

  const itens: ItemLista[] = clientes.map((cliente) => {
    const ps = porCliente.get(cliente.id) ?? []
    const atrasada = vencimentoMaisAtrasado(ps, hoje)
    return {
      cliente,
      totalEmAberto: totalEmAberto(ps),
      temVencida: ps.some((p) => parcelaVencida(p, hoje)),
      vencimentoMaisAtrasado: atrasada,
      proximoVencimento: proximoVencimento(ps),
    }
  })

  itens.sort((a, b) => {
    if (a.temVencida !== b.temVencida) return a.temVencida ? -1 : 1
    if (a.temVencida && b.temVencida) {
      return (a.vencimentoMaisAtrasado ?? '').localeCompare(b.vencimentoMaisAtrasado ?? '')
    }
    const aTemAberto = a.totalEmAberto > 0
    const bTemAberto = b.totalEmAberto > 0
    if (aTemAberto !== bTemAberto) return aTemAberto ? -1 : 1
    if (aTemAberto && bTemAberto) {
      return (a.proximoVencimento ?? '').localeCompare(b.proximoVencimento ?? '')
    }
    return a.cliente.nomeBusca.localeCompare(b.cliente.nomeBusca)
  })

  return itens
}

// ---------- Saldo da empresa ativa (para a UI) ----------

export async function obterSaldoEmpresaAtiva(): Promise<number> {
  const empresaId = exigirEmpresaAtiva()
  const empresa = await db.empresas.get(empresaId)
  return empresa?.saldoCreditos ?? 0
}
