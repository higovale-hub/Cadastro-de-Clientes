// Popula o DynamoDB Local com dados multi-empresa para testar o backoffice.
// Rode após criar as tabelas:  node scripts/seed.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'

process.env.AWS_EC2_METADATA_DISABLED = 'true'

const ENDPOINT = process.env.DYNAMO_ENDPOINT ?? 'http://127.0.0.1:8001'
const client = new DynamoDBClient({
  endpoint: ENDPOINT,
  region: 'local',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  maxAttempts: 3,
})
const doc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

const agora = new Date().toISOString()

function normalizar(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

async function put(TableName, Item) {
  await doc.send(new PutCommand({ TableName, Item }))
}

// Cria uma empresa completa: empresa + recarga inicial + usuários + alguns
// clientes (cada cliente gera 1 consumo de crédito).
async function criarEmpresa({ nome, documento, saldoInicial, usuarios, clientes }) {
  const empresaId = randomUUID()
  await put('Empresa', {
    id: empresaId,
    nome,
    documento,
    documentoBusca: documento ? documento.replace(/\D+/g, '') : undefined,
    saldoCreditos: saldoInicial,
    criadoEm: agora,
    atualizadoEm: agora,
  })
  await put('Recarga', {
    id: randomUUID(),
    empresaId,
    creditos: saldoInicial,
    valorReais: saldoInicial * 1.0,
    origem: 'cadastro',
    criadoEm: agora,
  })

  for (const u of usuarios) {
    await put('UsuarioAutorizado', {
      id: randomUUID(),
      empresaId,
      email: normalizar(u.email),
      nome: u.nome,
      papel: u.papel,
      criadoEm: agora,
      criadoPor: 'seed',
    })
  }

  for (const c of clientes) {
    const clienteId = randomUUID()
    await put('Cliente', {
      id: clienteId,
      empresaId,
      nomeCompleto: c.nome,
      nomeBusca: normalizar(c.nome),
      telefone: c.telefone,
      documento: c.documento,
      documentoBusca: c.documento ? c.documento.replace(/\D+/g, '') : undefined,
      criadoEm: agora,
      atualizadoEm: agora,
    })
    // Consumo correspondente ao cadastro do cliente.
    await put('ConsumoCredito', {
      id: randomUUID(),
      empresaId,
      creditos: 1,
      motivo: 'cliente_cadastrado',
      referenciaId: clienteId,
      criadoEm: agora,
    })
  }

  console.log(`✓ Empresa "${nome}" (${clientes.length} clientes, saldo ${saldoInicial})`)
  return empresaId
}

async function main() {
  console.log(`Semeando dados multi-empresa em ${ENDPOINT}...`)

  // Empresa 1: o e-mail admin coincide com o atalho dev, para login fácil.
  await criarEmpresa({
    nome: 'Loja do João',
    documento: '11.222.333/0001-81',
    saldoInicial: 50,
    usuarios: [
      { email: 'admin.empresa@gmail.com', nome: 'João (Admin)', papel: 'admin_empresa' },
      { email: 'operador.exemplo@gmail.com', nome: 'Operador Exemplo', papel: 'operador' },
    ],
    clientes: [
      { nome: 'Maria Silva', telefone: '(11) 90000-0000', documento: '529.982.247-25' },
      { nome: 'Carlos Souza', telefone: '(11) 98888-7777' },
    ],
  })

  // Empresa 2: saldo maior, só admin.
  await criarEmpresa({
    nome: 'Mercado Central',
    documento: '12.345.678/0001-99',
    saldoInicial: 200,
    usuarios: [
      { email: 'central.admin@gmail.com', nome: 'Ana (Admin)', papel: 'admin_empresa' },
    ],
    clientes: [
      { nome: 'Pedro Lima', telefone: '(21) 97777-6666' },
    ],
  })

  console.log('✓ Seed concluído.')
  console.log('Super-admin (backoffice): higovale@gmail.com')
  console.log('Admin empresa 1: admin.empresa@gmail.com')
}

main().catch((e) => {
  console.error('Erro no seed:', e.message)
  process.exit(1)
})
