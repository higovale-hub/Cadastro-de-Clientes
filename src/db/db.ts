import Dexie, { type Table } from 'dexie'
import type {
  Cliente,
  Divida,
  Parcela,
  Pagamento,
  Empresa,
  Recarga,
  ConsumoCredito,
  UsuarioAutorizado,
} from './types'

// Metadados de sincronização (chave/valor), ex.: carimbo do último pull.
export interface SyncMeta {
  chave: string
  valor: string
}

// Banco local (IndexedDB) via Dexie.
// Esta é a fonte de verdade do offline-first. A camada de sincronização
// (src/aws/sync.ts) envia/recebe esses dados da AWS quando há conexão.
export class AppDatabase extends Dexie {
  clientes!: Table<Cliente, string>
  dividas!: Table<Divida, string>
  parcelas!: Table<Parcela, string>
  pagamentos!: Table<Pagamento, string>
  syncMeta!: Table<SyncMeta, string>
  // Multi-tenant / créditos (ver DESIGN_BACKOFFICE.md)
  empresas!: Table<Empresa, string>
  recargas!: Table<Recarga, string>
  consumos!: Table<ConsumoCredito, string>
  usuarios!: Table<UsuarioAutorizado, string>

  constructor() {
    super('controle-de-clientes')
    this.version(1).stores({
      // Índices declarados para acelerar as consultas usadas nas telas.
      clientes: 'id, nomeBusca, documentoBusca, atualizadoEm, syncStatus',
      dividas: 'id, clienteId, status, atualizadoEm, syncStatus',
      parcelas: 'id, dividaId, clienteId, status, vencimento, syncStatus',
      pagamentos: 'id, parcelaId, dividaId, clienteId, syncStatus',
    })
    // Versão 2: adiciona a tabela de metadados de sync.
    this.version(2).stores({
      clientes: 'id, nomeBusca, documentoBusca, atualizadoEm, syncStatus',
      dividas: 'id, clienteId, status, atualizadoEm, syncStatus',
      parcelas: 'id, dividaId, clienteId, status, vencimento, syncStatus',
      pagamentos: 'id, parcelaId, dividaId, clienteId, syncStatus',
      syncMeta: 'chave',
    })
    // Versão 3: multi-tenant. Adiciona empresaId aos índices das entidades
    // de negócio e cria as tabelas empresas/recargas/consumos/usuarios.
    // Dexie migra sem apagar os dados existentes (registros antigos ficam
    // sem empresaId; a migração abaixo os associa, se necessário).
    this.version(3)
      .stores({
        clientes: 'id, empresaId, nomeBusca, documentoBusca, atualizadoEm, syncStatus',
        dividas: 'id, empresaId, clienteId, status, atualizadoEm, syncStatus',
        parcelas: 'id, empresaId, dividaId, clienteId, status, vencimento, syncStatus',
        pagamentos: 'id, empresaId, parcelaId, dividaId, clienteId, syncStatus',
        syncMeta: 'chave',
        empresas: 'id, documentoBusca, atualizadoEm, syncStatus',
        recargas: 'id, empresaId, criadoEm, syncStatus',
        consumos: 'id, empresaId, criadoEm, syncStatus',
        usuarios: 'id, empresaId, email, syncStatus',
      })
  }
}

export const db = new AppDatabase()
