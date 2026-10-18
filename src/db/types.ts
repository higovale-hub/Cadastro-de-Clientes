// Tipos de domínio do aplicativo.
// Datas são armazenadas como string ISO (YYYY-MM-DD para vencimentos,
// ISO completo para carimbos de criação/atualização) para facilitar
// indexação no IndexedDB e futura sincronização com a AWS.
//
// Multi-tenant: cada entidade de negócio pertence a uma Empresa (empresaId).
// Cada empresa vê apenas seus próprios dados. Ver DESIGN_BACKOFFICE.md.

export type SyncStatus = 'local' | 'sincronizado'

export type PapelUsuario = 'admin_empresa' | 'operador'

// Empresa (tenant). Tem saldo de créditos pré-pagos (sem validade).
export interface Empresa {
  id: string
  nome: string
  documento?: string // CPF ou CNPJ do responsável
  documentoBusca?: string
  saldoCreditos: number // unidades; 1 crédito = 1 cliente cadastrado
  criadoEm: string // ISO
  atualizadoEm: string // ISO
  syncStatus: SyncStatus
}

// Histórico de créditos adicionados a uma empresa (recarga pré-paga).
export interface Recarga {
  id: string
  empresaId: string
  creditos: number
  valorReais: number // valor pago (referência)
  origem: string // "cadastro" | "backoffice"
  criadoEm: string // ISO
  syncStatus: SyncStatus
}

// Histórico de consumo de crédito (base do relatório por período).
export interface ConsumoCredito {
  id: string
  empresaId: string
  creditos: number // normalmente 1
  motivo: string // "cliente_cadastrado"
  referenciaId?: string // id do cliente que gerou o consumo
  criadoEm: string // ISO (usado no filtro por período)
  syncStatus: SyncStatus
}

// Usuário autorizado, agora vinculado a uma empresa e com papel interno.
export interface UsuarioAutorizado {
  id: string
  empresaId: string
  email: string
  nome?: string
  papel: PapelUsuario
  criadoEm: string // ISO
  criadoPor?: string
  syncStatus: SyncStatus
}

export interface Cliente {
  id: string
  empresaId: string // tenant
  nomeCompleto: string
  nomeBusca: string // nomeCompleto normalizado (minúsculo, sem acento) para busca
  telefone: string
  documento?: string
  documentoBusca?: string // documento apenas com dígitos, para busca por prefixo
  email?: string
  endereco?: string
  criadoEm: string // ISO
  atualizadoEm: string // ISO
  syncStatus: SyncStatus
}

export type DividaStatus = 'ativa' | 'quitada'

export interface Divida {
  id: string
  empresaId: string // tenant
  clienteId: string
  descricao?: string
  valorTotal: number // em reais (ex.: 100.00)
  numeroParcelas: number
  diaVencimento: number // 1..31
  primeiraData: string // YYYY-MM-DD (vencimento da 1ª parcela)
  status: DividaStatus
  criadoEm: string // ISO
  atualizadoEm: string // ISO
  syncStatus: SyncStatus
}

export type ParcelaStatus = 'aberta' | 'paga'

export interface Parcela {
  id: string
  empresaId: string // tenant
  dividaId: string
  clienteId: string // desnormalizado para consultas rápidas na lista
  numero: number // 1..N
  valor: number // em reais
  vencimento: string // YYYY-MM-DD
  status: ParcelaStatus
  pagoEm?: string // ISO, preenchido ao dar baixa
  atualizadoEm: string // ISO
  syncStatus: SyncStatus
}

export interface Pagamento {
  id: string
  empresaId: string // tenant
  parcelaId: string
  dividaId: string
  clienteId: string
  valorPago: number
  dataPagamento: string // ISO
  syncStatus: SyncStatus
}
