// Tipos "planos" (sem syncStatus) que trafegam entre o app e a nuvem.
// São o contrato do CloudAdapter, independente da implementação
// (Amplify real ou DynamoDB Local simulado).
//
// Multi-tenant: entidades de negócio carregam empresaId.

export interface EmpresaRemota {
  id: string
  nome: string
  documento?: string | null
  documentoBusca?: string | null
  saldoCreditos: number
  criadoEm: string
  atualizadoEm: string
}

export interface RecargaRemota {
  id: string
  empresaId: string
  creditos: number
  valorReais: number
  origem: string
  criadoEm: string
}

export interface ConsumoCreditoRemoto {
  id: string
  empresaId: string
  creditos: number
  motivo: string
  referenciaId?: string | null
  criadoEm: string
}

export interface ClienteRemoto {
  id: string
  empresaId: string
  nomeCompleto: string
  nomeBusca: string
  telefone: string
  documento?: string | null
  documentoBusca?: string | null
  email?: string | null
  endereco?: string | null
  criadoEm: string
  atualizadoEm: string
}

export interface DividaRemota {
  id: string
  empresaId: string
  clienteId: string
  descricao?: string | null
  valorTotal: number
  numeroParcelas: number
  diaVencimento: number
  primeiraData: string
  status: 'ativa' | 'quitada'
  criadoEm: string
  atualizadoEm: string
}

export interface ParcelaRemota {
  id: string
  empresaId: string
  dividaId: string
  clienteId: string
  numero: number
  valor: number
  vencimento: string
  status: 'aberta' | 'paga'
  pagoEm?: string | null
  atualizadoEm: string
}

export interface PagamentoRemoto {
  id: string
  empresaId: string
  parcelaId: string
  dividaId: string
  clienteId: string
  valorPago: number
  dataPagamento: string
}

export interface UsuarioAutorizadoRemoto {
  id: string
  empresaId: string
  email: string
  nome?: string | null
  papel: 'admin_empresa' | 'operador'
  criadoEm: string
  criadoPor?: string | null
}

// Interface única de "nuvem". As duas implementações (Amplify e DynamoDB
// Local) satisfazem este contrato, e a camada de sync depende só dele.
export interface CloudAdapter {
  readonly nome: string

  // Entidades de negócio (sync completo).
  listarClientes(): Promise<ClienteRemoto[]>
  listarDividas(): Promise<DividaRemota[]>
  listarParcelas(): Promise<ParcelaRemota[]>
  listarPagamentos(): Promise<PagamentoRemoto[]>
  salvarCliente(item: ClienteRemoto): Promise<void>
  salvarDivida(item: DividaRemota): Promise<void>
  salvarParcela(item: ParcelaRemota): Promise<void>
  criarPagamento(item: PagamentoRemoto): Promise<void>

  // Empresas / créditos.
  listarEmpresas(): Promise<EmpresaRemota[]>
  salvarEmpresa(item: EmpresaRemota): Promise<void>
  listarRecargas(): Promise<RecargaRemota[]>
  criarRecarga(item: RecargaRemota): Promise<void>
  listarConsumos(): Promise<ConsumoCreditoRemoto[]>
  criarConsumo(item: ConsumoCreditoRemoto): Promise<void>

  // Usuários autorizados (por empresa).
  listarUsuariosAutorizados(): Promise<UsuarioAutorizadoRemoto[]>
  buscarUsuarioPorEmail(email: string): Promise<UsuarioAutorizadoRemoto | null>
  criarUsuarioAutorizado(item: UsuarioAutorizadoRemoto): Promise<void>
  removerUsuarioAutorizado(id: string): Promise<void>
}
