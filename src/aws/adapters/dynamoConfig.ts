// Configuração compartilhada do DynamoDB Local (simulação via Docker).
// O endpoint vem de VITE_DYNAMO_ENDPOINT. Como o DynamoDB Local não suporta
// CORS, no navegador usamos o proxy do Vite ("/dynamo"): o SDK exige uma URL
// absoluta, então resolvemos o caminho relativo contra a origem atual.
function resolverEndpoint(): string {
  const bruto = (import.meta.env?.VITE_DYNAMO_ENDPOINT as string | undefined) ?? 'http://localhost:8001'
  if (bruto.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${bruto}`
  }
  return bruto
}

export const DYNAMO_ENDPOINT = resolverEndpoint()

export const DYNAMO_REGION = 'local'

export const DYNAMO_CREDENCIAIS = {
  accessKeyId: 'local',
  secretAccessKey: 'local',
}

// Nomes das tabelas no DynamoDB Local.
export const TABELAS = {
  Cliente: 'Cliente',
  Divida: 'Divida',
  Parcela: 'Parcela',
  Pagamento: 'Pagamento',
  UsuarioAutorizado: 'UsuarioAutorizado',
  Empresa: 'Empresa',
  Recarga: 'Recarga',
  ConsumoCredito: 'ConsumoCredito',
} as const
