// Cria as tabelas no DynamoDB Local (Docker). Idempotente: pula tabelas
// que já existem. Rode com o Docker no ar:  node scripts/criar-tabelas.mjs
import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb'

// Evita que o SDK tente buscar credenciais no metadata do EC2/IMDS,
// o que causa travamentos longos fora da AWS (ex.: Windows local).
process.env.AWS_EC2_METADATA_DISABLED = 'true'

const ENDPOINT = process.env.DYNAMO_ENDPOINT ?? 'http://127.0.0.1:8001'

const client = new DynamoDBClient({
  endpoint: ENDPOINT,
  region: 'local',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  maxAttempts: 3,
})

// Todas as tabelas têm chave primária simples "id" (string).
// UsuarioAutorizado tem um GSI por "email" para a busca da lista restrita.
const tabelas = [
  { TableName: 'Cliente' },
  { TableName: 'Divida' },
  { TableName: 'Parcela' },
  { TableName: 'Pagamento' },
  { TableName: 'Empresa' },
  { TableName: 'Recarga' },
  { TableName: 'ConsumoCredito' },
  {
    TableName: 'UsuarioAutorizado',
    extraAttrs: [{ AttributeName: 'email', AttributeType: 'S' }],
    gsis: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
]

async function existentes() {
  const res = await client.send(new ListTablesCommand({}))
  return new Set(res.TableNames ?? [])
}

async function criar(def) {
  const attrs = [{ AttributeName: 'id', AttributeType: 'S' }, ...(def.extraAttrs ?? [])]
  const params = {
    TableName: def.TableName,
    AttributeDefinitions: attrs,
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
  }
  if (def.gsis) params.GlobalSecondaryIndexes = def.gsis
  await client.send(new CreateTableCommand(params))
  console.log(`✓ Tabela criada: ${def.TableName}`)
}

async function main() {
  console.log(`DynamoDB Local em ${ENDPOINT}`)
  const jaExistem = await existentes()
  for (const def of tabelas) {
    if (jaExistem.has(def.TableName)) {
      console.log(`• Já existe: ${def.TableName}`)
      continue
    }
    await criar(def)
  }
  console.log('Concluído.')
}

main().catch((e) => {
  console.error('Erro ao criar tabelas:', e.message)
  process.exit(1)
})
