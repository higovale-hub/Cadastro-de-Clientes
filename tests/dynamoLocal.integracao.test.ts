import { describe, it, expect, beforeAll } from 'vitest'
import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'

// Teste de integração com o DynamoDB Local (Docker).
// Auto-pula se o serviço não estiver acessível, para não quebrar o CI/local
// quando o Docker está desligado.
const ENDPOINT = process.env.DYNAMO_ENDPOINT ?? 'http://localhost:8001'

const client = new DynamoDBClient({
  endpoint: ENDPOINT,
  region: 'local',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
})
const doc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

async function dynamoDisponivel(): Promise<boolean> {
  try {
    await client.send(new ListTablesCommand({}))
    return true
  } catch {
    return false
  }
}

let disponivel = false

beforeAll(async () => {
  disponivel = await dynamoDisponivel()
  if (!disponivel) return
  // Garante uma tabela de teste isolada.
  const tabelas = await client.send(new ListTablesCommand({}))
  if (!(tabelas.TableNames ?? []).includes('TestCliente')) {
    await client.send(
      new CreateTableCommand({
        TableName: 'TestCliente',
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    )
    // Pequena espera para a tabela ficar ativa.
    await new Promise((r) => setTimeout(r, 500))
  }
})

describe('DynamoDB Local (integração)', () => {
  it('grava e lê um item (upsert via Put)', async () => {
    if (!disponivel) {
      console.warn('DynamoDB Local indisponível — teste pulado.')
      return
    }
    const id = randomUUID()
    await doc.send(
      new PutCommand({
        TableName: 'TestCliente',
        Item: { id, nomeCompleto: 'Teste Sync', atualizadoEm: '2025-01-01T00:00:00.000Z' },
      }),
    )
    const res = await doc.send(new ScanCommand({ TableName: 'TestCliente' }))
    const encontrado = (res.Items ?? []).find((i) => i.id === id)
    expect(encontrado).toBeTruthy()
    expect(encontrado?.nomeCompleto).toBe('Teste Sync')
  })

  it('last-write-wins: sobrescreve com atualizadoEm mais novo', async () => {
    if (!disponivel) return
    const id = randomUUID()
    await doc.send(
      new PutCommand({
        TableName: 'TestCliente',
        Item: { id, nomeCompleto: 'V1', atualizadoEm: '2025-01-01T00:00:00.000Z' },
      }),
    )
    // "Nuvem" traz uma versão mais nova -> deve prevalecer.
    await doc.send(
      new PutCommand({
        TableName: 'TestCliente',
        Item: { id, nomeCompleto: 'V2', atualizadoEm: '2025-02-01T00:00:00.000Z' },
      }),
    )
    const res = await doc.send(
      new QueryCommand({
        TableName: 'TestCliente',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': id },
      }),
    )
    expect(res.Items?.[0]?.nomeCompleto).toBe('V2')
  })
})
