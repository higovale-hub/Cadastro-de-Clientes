import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  ScanCommand,
  type ScanCommandOutput,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { DYNAMO_CREDENCIAIS, DYNAMO_ENDPOINT, DYNAMO_REGION, TABELAS } from './dynamoConfig'
import type {
  CloudAdapter,
  ClienteRemoto,
  DividaRemota,
  ParcelaRemota,
  PagamentoRemoto,
  UsuarioAutorizadoRemoto,
  EmpresaRemota,
  RecargaRemota,
  ConsumoCreditoRemoto,
} from './types'

// Adapter de simulação: fala com o DynamoDB Local (Docker) via SDK v3.
// Persistência real, sem custo e sem conta AWS. Ver DESIGN_SIMULACAO.md.
export class DynamoLocalAdapter implements CloudAdapter {
  readonly nome = 'dynamo-local'
  private doc: DynamoDBDocumentClient

  constructor() {
    const client = new DynamoDBClient({
      endpoint: DYNAMO_ENDPOINT,
      region: DYNAMO_REGION,
      credentials: DYNAMO_CREDENCIAIS,
    })
    this.doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    })
  }

  private async scanTudo<T>(tabela: string): Promise<T[]> {
    const itens: T[] = []
    let ExclusiveStartKey: Record<string, unknown> | undefined = undefined
    do {
      const res: ScanCommandOutput = await this.doc.send(
        new ScanCommand({ TableName: tabela, ExclusiveStartKey }),
      )
      itens.push(...((res.Items ?? []) as T[]))
      ExclusiveStartKey = res.LastEvaluatedKey
    } while (ExclusiveStartKey)
    return itens
  }

  private async put(tabela: string, item: Record<string, unknown>): Promise<void> {
    await this.doc.send(new PutCommand({ TableName: tabela, Item: item }))
  }

  // ---- Listagens ----
  listarClientes(): Promise<ClienteRemoto[]> {
    return this.scanTudo<ClienteRemoto>(TABELAS.Cliente)
  }
  listarDividas(): Promise<DividaRemota[]> {
    return this.scanTudo<DividaRemota>(TABELAS.Divida)
  }
  listarParcelas(): Promise<ParcelaRemota[]> {
    return this.scanTudo<ParcelaRemota>(TABELAS.Parcela)
  }
  listarPagamentos(): Promise<PagamentoRemoto[]> {
    return this.scanTudo<PagamentoRemoto>(TABELAS.Pagamento)
  }
  listarUsuariosAutorizados(): Promise<UsuarioAutorizadoRemoto[]> {
    return this.scanTudo<UsuarioAutorizadoRemoto>(TABELAS.UsuarioAutorizado)
  }

  // ---- Upserts (PutCommand já é upsert no DynamoDB) ----
  async salvarCliente(item: ClienteRemoto): Promise<void> {
    await this.put(TABELAS.Cliente, { ...item })
  }
  async salvarDivida(item: DividaRemota): Promise<void> {
    await this.put(TABELAS.Divida, { ...item })
  }
  async salvarParcela(item: ParcelaRemota): Promise<void> {
    await this.put(TABELAS.Parcela, { ...item })
  }
  async criarPagamento(item: PagamentoRemoto): Promise<void> {
    // Pagamento é imutável; Put idempotente pela chave id.
    await this.put(TABELAS.Pagamento, { ...item })
  }

  // ---- Empresas / créditos ----
  listarEmpresas(): Promise<EmpresaRemota[]> {
    return this.scanTudo<EmpresaRemota>(TABELAS.Empresa)
  }
  async salvarEmpresa(item: EmpresaRemota): Promise<void> {
    await this.put(TABELAS.Empresa, { ...item })
  }
  listarRecargas(): Promise<RecargaRemota[]> {
    return this.scanTudo<RecargaRemota>(TABELAS.Recarga)
  }
  async criarRecarga(item: RecargaRemota): Promise<void> {
    await this.put(TABELAS.Recarga, { ...item })
  }
  listarConsumos(): Promise<ConsumoCreditoRemoto[]> {
    return this.scanTudo<ConsumoCreditoRemoto>(TABELAS.ConsumoCredito)
  }
  async criarConsumo(item: ConsumoCreditoRemoto): Promise<void> {
    await this.put(TABELAS.ConsumoCredito, { ...item })
  }

  // ---- UsuarioAutorizado ----
  async buscarUsuarioPorEmail(email: string): Promise<UsuarioAutorizadoRemoto | null> {
    // Usa o índice global por email (criado no bootstrap das tabelas).
    const res = await this.doc.send(
      new QueryCommand({
        TableName: TABELAS.UsuarioAutorizado,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :e',
        ExpressionAttributeValues: { ':e': email.trim().toLowerCase() },
      }),
    )
    const itens = (res.Items ?? []) as UsuarioAutorizadoRemoto[]
    return itens[0] ?? null
  }
  async criarUsuarioAutorizado(item: UsuarioAutorizadoRemoto): Promise<void> {
    await this.put(TABELAS.UsuarioAutorizado, { ...item })
  }
  async removerUsuarioAutorizado(id: string): Promise<void> {
    await this.doc.send(new DeleteCommand({ TableName: TABELAS.UsuarioAutorizado, Key: { id } }))
  }
}
