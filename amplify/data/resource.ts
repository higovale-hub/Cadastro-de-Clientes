import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

// Schema de dados (AppSync + DynamoDB). Multi-tenant: entidades de negócio
// carregam empresaId. Ver DESIGN_BACKOFFICE.md.
//
// Observação de autorização (Fase 2 real): o isolamento por empresa será
// reforçado com regras por owner/grupo. Aqui mantemos authenticated() para
// o desenvolvimento; o filtro por empresaId é aplicado na camada do app.
const schema = a.schema({
  Empresa: a
    .model({
      nome: a.string().required(),
      documento: a.string(),
      documentoBusca: a.string(),
      saldoCreditos: a.integer().required(),
      criadoEm: a.string().required(),
      atualizadoEm: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Recarga: a
    .model({
      empresaId: a.id().required(),
      creditos: a.integer().required(),
      valorReais: a.float().required(),
      origem: a.string().required(),
      criadoEm: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  ConsumoCredito: a
    .model({
      empresaId: a.id().required(),
      creditos: a.integer().required(),
      motivo: a.string().required(),
      referenciaId: a.string(),
      criadoEm: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Cliente: a
    .model({
      empresaId: a.id().required(),
      nomeCompleto: a.string().required(),
      nomeBusca: a.string().required(),
      telefone: a.string().required(),
      documento: a.string(),
      documentoBusca: a.string(),
      email: a.string(),
      endereco: a.string(),
      criadoEm: a.string().required(),
      atualizadoEm: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Divida: a
    .model({
      empresaId: a.id().required(),
      clienteId: a.id().required(),
      descricao: a.string(),
      valorTotal: a.float().required(),
      numeroParcelas: a.integer().required(),
      diaVencimento: a.integer().required(),
      primeiraData: a.string().required(),
      status: a.enum(['ativa', 'quitada']),
      criadoEm: a.string().required(),
      atualizadoEm: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Parcela: a
    .model({
      empresaId: a.id().required(),
      dividaId: a.id().required(),
      clienteId: a.id().required(),
      numero: a.integer().required(),
      valor: a.float().required(),
      vencimento: a.string().required(),
      status: a.enum(['aberta', 'paga']),
      pagoEm: a.string(),
      atualizadoEm: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Pagamento: a
    .model({
      empresaId: a.id().required(),
      parcelaId: a.id().required(),
      dividaId: a.id().required(),
      clienteId: a.id().required(),
      valorPago: a.float().required(),
      dataPagamento: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  // Usuários autorizados, vinculados a uma empresa.
  UsuarioAutorizado: a
    .model({
      empresaId: a.id().required(),
      email: a.string().required(),
      nome: a.string(),
      papel: a.enum(['admin_empresa', 'operador']),
      criadoEm: a.string().required(),
      criadoPor: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
