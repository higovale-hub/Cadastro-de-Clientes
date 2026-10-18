import { getCloudAdapter } from './adapters'
import { normalizarEmail } from './constants'
import { apenasDigitos } from '../domain/text'
import { db } from '../db/db'
import type {
  EmpresaRemota,
  RecargaRemota,
  ConsumoCreditoRemoto,
  UsuarioAutorizadoRemoto,
} from './adapters/types'

// Preço de referência por crédito (usado só para exibir valor em R$).
export const PRECO_REFERENCIA_POR_CREDITO = 1.0

// Pacotes de recarga pré-paga (ver DESIGN_BACKOFFICE.md).
export interface PacoteCredito {
  id: string
  nome: string
  creditos: number
  precoReais: number
}

export const PACOTES: PacoteCredito[] = [
  { id: 'inicial', nome: 'Inicial', creditos: 50, precoReais: 49.9 },
  { id: 'padrao', nome: 'Padrão', creditos: 200, precoReais: 169.0 },
  { id: 'pro', nome: 'Pro', creditos: 500, precoReais: 349.0 },
  { id: 'empresarial', nome: 'Empresarial', creditos: 1000, precoReais: 599.0 },
]

function novoId(): string {
  return crypto.randomUUID()
}

export interface DadosNovaEmpresa {
  nomeEmpresa: string
  documento?: string
  emailAdmin: string
  nomeAdmin?: string
  pacote: PacoteCredito
}

export interface ResultadoNovaEmpresa {
  empresaId: string
}

// Cria uma empresa (auto-serviço) com o primeiro usuário (admin_empresa) e a
// recarga inicial do pacote escolhido. O pagamento é externo; aqui a recarga
// é registrada diretamente (simulação / pré-pago).
export async function criarEmpresaComRecarga(
  dados: DadosNovaEmpresa,
): Promise<ResultadoNovaEmpresa> {
  const adapter = await getCloudAdapter()
  if (!adapter) throw new Error('Nuvem não disponível.')

  const email = normalizarEmail(dados.emailAdmin)

  // Impede e-mail já vinculado a outra empresa.
  const existente = await adapter.buscarUsuarioPorEmail(email)
  if (existente) throw new Error('Este e-mail já está vinculado a uma empresa.')

  const agora = new Date().toISOString()
  const empresaId = novoId()
  const documento = dados.documento?.trim() || null

  const empresa: EmpresaRemota = {
    id: empresaId,
    nome: dados.nomeEmpresa.trim(),
    documento,
    documentoBusca: documento ? apenasDigitos(documento) : null,
    saldoCreditos: dados.pacote.creditos,
    criadoEm: agora,
    atualizadoEm: agora,
  }
  await adapter.salvarEmpresa(empresa)

  const usuario: UsuarioAutorizadoRemoto = {
    id: novoId(),
    empresaId,
    email,
    nome: dados.nomeAdmin?.trim() || null,
    papel: 'admin_empresa',
    criadoEm: agora,
    criadoPor: 'auto_cadastro',
  }
  await adapter.criarUsuarioAutorizado(usuario)

  const recarga: RecargaRemota = {
    id: novoId(),
    empresaId,
    creditos: dados.pacote.creditos,
    valorReais: dados.pacote.precoReais,
    origem: 'cadastro',
    criadoEm: agora,
  }
  await adapter.criarRecarga(recarga)

  return { empresaId }
}

// Adiciona créditos a uma empresa existente (recarga pelo backoffice).
export async function recarregarCreditos(params: {
  empresaId: string
  creditos: number
  valorReais: number
  origem?: string
}): Promise<void> {
  const adapter = await getCloudAdapter()
  if (!adapter) throw new Error('Nuvem não disponível.')

  const empresas = await adapter.listarEmpresas()
  const empresa = empresas.find((e) => e.id === params.empresaId)
  if (!empresa) throw new Error('Empresa não encontrada.')

  const agora = new Date().toISOString()
  await adapter.salvarEmpresa({
    ...empresa,
    saldoCreditos: empresa.saldoCreditos + params.creditos,
    atualizadoEm: agora,
  })
  const recarga: RecargaRemota = {
    id: novoId(),
    empresaId: params.empresaId,
    creditos: params.creditos,
    valorReais: params.valorReais,
    origem: params.origem ?? 'backoffice',
    criadoEm: agora,
  }
  await adapter.criarRecarga(recarga)
}

// ---------- Consultas agregadas (backoffice) ----------

export interface EmpresaResumo {
  empresa: EmpresaRemota
  qtdUsuarios: number
  qtdClientes: number
}

export async function listarEmpresasComResumo(): Promise<EmpresaResumo[]> {
  const adapter = await getCloudAdapter()
  if (!adapter) throw new Error('Nuvem não disponível.')
  const [empresas, usuarios, clientes] = await Promise.all([
    adapter.listarEmpresas(),
    adapter.listarUsuariosAutorizados(),
    adapter.listarClientes(),
  ])
  const porEmpresaUsuarios = new Map<string, number>()
  for (const u of usuarios) {
    porEmpresaUsuarios.set(u.empresaId, (porEmpresaUsuarios.get(u.empresaId) ?? 0) + 1)
  }
  const porEmpresaClientes = new Map<string, number>()
  for (const c of clientes) {
    porEmpresaClientes.set(c.empresaId, (porEmpresaClientes.get(c.empresaId) ?? 0) + 1)
  }
  return empresas
    .map((empresa) => ({
      empresa,
      qtdUsuarios: porEmpresaUsuarios.get(empresa.id) ?? 0,
      qtdClientes: porEmpresaClientes.get(empresa.id) ?? 0,
    }))
    .sort((a, b) => a.empresa.nome.localeCompare(b.empresa.nome))
}

// Carrega a empresa (da nuvem/adapter) para o Dexie local, para que a UI
// (ex.: card de saldo) consiga ler o saldo via consulta reativa. Chamado
// após o login e a cada sincronização.
export async function sincronizarEmpresaParaLocal(empresaId: string): Promise<void> {
  const adapter = await getCloudAdapter()
  if (!adapter) return
  const empresas = await adapter.listarEmpresas()
  const empresa = empresas.find((e) => e.id === empresaId)
  if (!empresa) return
  await db.empresas.put({
    id: empresa.id,
    nome: empresa.nome,
    documento: empresa.documento ?? undefined,
    documentoBusca: empresa.documentoBusca ?? undefined,
    saldoCreditos: empresa.saldoCreditos,
    criadoEm: empresa.criadoEm,
    atualizadoEm: empresa.atualizadoEm,
    syncStatus: 'sincronizado',
  })
}

// Consumos de todas as empresas (base do relatório). Opcionalmente filtra
// por período [inicioISO, fimISO] pela data de criação do consumo.
export async function listarConsumos(filtro?: {
  inicio?: string
  fim?: string
}): Promise<ConsumoCreditoRemoto[]> {
  const adapter = await getCloudAdapter()
  if (!adapter) throw new Error('Nuvem não disponível.')
  let consumos = await adapter.listarConsumos()
  if (filtro?.inicio) consumos = consumos.filter((c) => c.criadoEm >= filtro.inicio!)
  if (filtro?.fim) consumos = consumos.filter((c) => c.criadoEm <= filtro.fim!)
  return consumos
}
