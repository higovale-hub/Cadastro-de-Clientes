import { getDataClient } from '../client'
import { normalizarEmail } from '../constants'
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

// Adapter de produção: fala com o Amplify Data (AppSync + DynamoDB) na nuvem.

async function listarTudo<T>(
  listar: (args: { nextToken?: string | null }) => Promise<{
    data: T[]
    nextToken?: string | null
    errors?: unknown
  }>,
): Promise<T[]> {
  const itens: T[] = []
  let nextToken: string | null | undefined = undefined
  do {
    const res = await listar({ nextToken })
    if (res.errors) throw new Error('Falha ao listar dados da nuvem.')
    itens.push(...res.data)
    nextToken = res.nextToken
  } while (nextToken)
  return itens
}

export class AmplifyAdapter implements CloudAdapter {
  readonly nome = 'amplify'

  async listarClientes(): Promise<ClienteRemoto[]> {
    const client = getDataClient()
    const itens = await listarTudo((a) => client.models.Cliente.list(a))
    return itens.map((c) => ({
      id: c.id,
      empresaId: c.empresaId,
      nomeCompleto: c.nomeCompleto,
      nomeBusca: c.nomeBusca,
      telefone: c.telefone,
      documento: c.documento,
      documentoBusca: c.documentoBusca,
      email: c.email,
      endereco: c.endereco,
      criadoEm: c.criadoEm,
      atualizadoEm: c.atualizadoEm,
    }))
  }

  async listarDividas(): Promise<DividaRemota[]> {
    const client = getDataClient()
    const itens = await listarTudo((a) => client.models.Divida.list(a))
    return itens.map((d) => ({
      id: d.id,
      empresaId: d.empresaId,
      clienteId: d.clienteId,
      descricao: d.descricao,
      valorTotal: d.valorTotal,
      numeroParcelas: d.numeroParcelas,
      diaVencimento: d.diaVencimento,
      primeiraData: d.primeiraData,
      status: (d.status ?? 'ativa') as 'ativa' | 'quitada',
      criadoEm: d.criadoEm,
      atualizadoEm: d.atualizadoEm,
    }))
  }

  async listarParcelas(): Promise<ParcelaRemota[]> {
    const client = getDataClient()
    const itens = await listarTudo((a) => client.models.Parcela.list(a))
    return itens.map((p) => ({
      id: p.id,
      empresaId: p.empresaId,
      dividaId: p.dividaId,
      clienteId: p.clienteId,
      numero: p.numero,
      valor: p.valor,
      vencimento: p.vencimento,
      status: (p.status ?? 'aberta') as 'aberta' | 'paga',
      pagoEm: p.pagoEm,
      atualizadoEm: p.atualizadoEm,
    }))
  }

  async listarPagamentos(): Promise<PagamentoRemoto[]> {
    const client = getDataClient()
    const itens = await listarTudo((a) => client.models.Pagamento.list(a))
    return itens.map((pg) => ({
      id: pg.id,
      empresaId: pg.empresaId,
      parcelaId: pg.parcelaId,
      dividaId: pg.dividaId,
      clienteId: pg.clienteId,
      valorPago: pg.valorPago,
      dataPagamento: pg.dataPagamento,
    }))
  }

  async salvarCliente(item: ClienteRemoto): Promise<void> {
    const client = getDataClient()
    const upd = await client.models.Cliente.update(item)
    if (upd.errors) await client.models.Cliente.create(item)
  }

  async salvarDivida(item: DividaRemota): Promise<void> {
    const client = getDataClient()
    const upd = await client.models.Divida.update(item)
    if (upd.errors) await client.models.Divida.create(item)
  }

  async salvarParcela(item: ParcelaRemota): Promise<void> {
    const client = getDataClient()
    const upd = await client.models.Parcela.update(item)
    if (upd.errors) await client.models.Parcela.create(item)
  }

  async criarPagamento(item: PagamentoRemoto): Promise<void> {
    const client = getDataClient()
    await client.models.Pagamento.create(item)
  }

  // ---- Empresas / créditos ----
  async listarEmpresas(): Promise<EmpresaRemota[]> {
    const client = getDataClient()
    const itens = await listarTudo((a) => client.models.Empresa.list(a))
    return itens.map((e) => ({
      id: e.id,
      nome: e.nome,
      documento: e.documento,
      documentoBusca: e.documentoBusca,
      saldoCreditos: e.saldoCreditos,
      criadoEm: e.criadoEm,
      atualizadoEm: e.atualizadoEm,
    }))
  }

  async salvarEmpresa(item: EmpresaRemota): Promise<void> {
    const client = getDataClient()
    const upd = await client.models.Empresa.update(item)
    if (upd.errors) await client.models.Empresa.create(item)
  }

  async listarRecargas(): Promise<RecargaRemota[]> {
    const client = getDataClient()
    const itens = await listarTudo((a) => client.models.Recarga.list(a))
    return itens.map((r) => ({
      id: r.id,
      empresaId: r.empresaId,
      creditos: r.creditos,
      valorReais: r.valorReais,
      origem: r.origem,
      criadoEm: r.criadoEm,
    }))
  }

  async criarRecarga(item: RecargaRemota): Promise<void> {
    const client = getDataClient()
    await client.models.Recarga.create(item)
  }

  async listarConsumos(): Promise<ConsumoCreditoRemoto[]> {
    const client = getDataClient()
    const itens = await listarTudo((a) => client.models.ConsumoCredito.list(a))
    return itens.map((c) => ({
      id: c.id,
      empresaId: c.empresaId,
      creditos: c.creditos,
      motivo: c.motivo,
      referenciaId: c.referenciaId,
      criadoEm: c.criadoEm,
    }))
  }

  async criarConsumo(item: ConsumoCreditoRemoto): Promise<void> {
    const client = getDataClient()
    await client.models.ConsumoCredito.create(item)
  }

  // ---- Usuários ----
  async listarUsuariosAutorizados(): Promise<UsuarioAutorizadoRemoto[]> {
    const client = getDataClient()
    const itens = await listarTudo((a) => client.models.UsuarioAutorizado.list(a))
    return itens.map((u) => ({
      id: u.id,
      empresaId: u.empresaId,
      email: u.email,
      nome: u.nome,
      papel: (u.papel ?? 'operador') as 'admin_empresa' | 'operador',
      criadoEm: u.criadoEm,
      criadoPor: u.criadoPor,
    }))
  }

  async buscarUsuarioPorEmail(email: string): Promise<UsuarioAutorizadoRemoto | null> {
    const client = getDataClient()
    const { data } = await client.models.UsuarioAutorizado.list({
      filter: { email: { eq: normalizarEmail(email) } },
    })
    if (!data || data.length === 0) return null
    const u = data[0]
    return {
      id: u.id,
      empresaId: u.empresaId,
      email: u.email,
      nome: u.nome,
      papel: (u.papel ?? 'operador') as 'admin_empresa' | 'operador',
      criadoEm: u.criadoEm,
      criadoPor: u.criadoPor,
    }
  }

  async criarUsuarioAutorizado(item: UsuarioAutorizadoRemoto): Promise<void> {
    const client = getDataClient()
    const { errors } = await client.models.UsuarioAutorizado.create(item)
    if (errors) throw new Error('Falha ao criar usuário.')
  }

  async removerUsuarioAutorizado(id: string): Promise<void> {
    const client = getDataClient()
    const { errors } = await client.models.UsuarioAutorizado.delete({ id })
    if (errors) throw new Error('Falha ao remover usuário.')
  }
}
