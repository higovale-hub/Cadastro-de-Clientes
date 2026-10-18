import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { EMAIL_ADMIN_MESTRE, normalizarEmail } from './constants'
import { iniciarSyncAutomatico, sincronizar } from './sync'
import { getAuthProvider, authMode } from './authProvider'
import { getCloudAdapter, nuvemAtiva } from './adapters'
import { definirEmpresaAtiva } from '../db/tenant'
import { sincronizarEmpresaParaLocal } from './empresas'

export type Papel = 'admin_empresa' | 'operador'

// Situações do usuário:
// - 'offline': sem auth/nuvem (app roda sem login).
// - 'carregando': verificando sessão.
// - 'deslogado': precisa fazer login.
// - 'sem_empresa': logado, mas o e-mail ainda não pertence a nenhuma empresa.
//   Nesse estado o usuário pode CRIAR uma empresa (Opção C). Como está
//   autenticado, a escrita na nuvem é permitida.
// - 'autorizado': usuário de uma empresa (usa o app normal).
// - 'super_admin': e-mail mestre (backoffice).
export type SituacaoAuth =
  | 'offline'
  | 'carregando'
  | 'deslogado'
  | 'sem_empresa'
  | 'autorizado'
  | 'super_admin'

interface ResultadoAvaliacao {
  tipo: 'super_admin' | 'autorizado' | 'sem_empresa'
  papel: Papel | null
  empresaId: string | null
}

interface AuthContextValor {
  situacao: SituacaoAuth
  email: string | null
  papel: Papel | null
  empresaId: string | null
  ehSuperAdmin: boolean
  ehAdminEmpresa: boolean
  entrarComGoogle: () => Promise<void>
  sair: () => Promise<void>
  reavaliar: () => Promise<void>
}

const AuthContext = createContext<AuthContextValor | null>(null)

// Avalia o acesso do e-mail:
// - admin mestre => super_admin (sem empresa; vai para o backoffice).
// - senão, busca o usuário na lista (UsuarioAutorizado) e resolve a empresa.
async function avaliarAcesso(email: string): Promise<ResultadoAvaliacao> {
  const emailNorm = normalizarEmail(email)
  if (emailNorm === EMAIL_ADMIN_MESTRE) {
    return { tipo: 'super_admin', papel: null, empresaId: null }
  }
  try {
    const adapter = await getCloudAdapter()
    if (!adapter) return { tipo: 'sem_empresa', papel: null, empresaId: null }
    const usuario = await adapter.buscarUsuarioPorEmail(emailNorm)
    if (usuario) {
      return {
        tipo: 'autorizado',
        papel: (usuario.papel as Papel) ?? 'operador',
        empresaId: usuario.empresaId,
      }
    }
  } catch {
    // Falha de consulta => trata como sem empresa por segurança.
  }
  return { tipo: 'sem_empresa', papel: null, empresaId: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [situacao, setSituacao] = useState<SituacaoAuth>('carregando')
  const [email, setEmail] = useState<string | null>(null)
  const [papel, setPapel] = useState<Papel | null>(null)
  const [empresaId, setEmpresaId] = useState<string | null>(null)

  const reavaliar = useCallback(async () => {
    const provider = getAuthProvider()
    if (!provider) {
      setSituacao('offline')
      return
    }
    try {
      const emailUsuario = await provider.emailAtual()
      if (!emailUsuario) {
        setSituacao('deslogado')
        setEmail(null)
        setPapel(null)
        setEmpresaId(null)
        definirEmpresaAtiva(null)
        return
      }
      setEmail(emailUsuario)
      const r = await avaliarAcesso(emailUsuario)

      if (r.tipo === 'super_admin') {
        setPapel(null)
        setEmpresaId(null)
        definirEmpresaAtiva(null)
        setSituacao('super_admin')
        return
      }

      if (r.tipo === 'autorizado') {
        setPapel(r.papel)
        setEmpresaId(r.empresaId)
        definirEmpresaAtiva(r.empresaId)
        setSituacao('autorizado')
        // Carrega a empresa (saldo) para o Dexie local, para a UI mostrar.
        if (r.empresaId) await sincronizarEmpresaParaLocal(r.empresaId)
        if (nuvemAtiva()) void sincronizar()
        return
      }

      setPapel(null)
      setEmpresaId(null)
      definirEmpresaAtiva(null)
      setSituacao('sem_empresa')
    } catch {
      setSituacao('deslogado')
      setEmail(null)
      setPapel(null)
      setEmpresaId(null)
      definirEmpresaAtiva(null)
    }
  }, [])

  useEffect(() => {
    iniciarSyncAutomatico()
    void reavaliar()
    const provider = getAuthProvider()
    if (!provider) return
    const cancelar = provider.aoMudar(() => void reavaliar())
    return cancelar
  }, [reavaliar])

  const entrarComGoogle = useCallback(async () => {
    const provider = getAuthProvider()
    if (provider) await provider.entrar()
  }, [])

  const sair = useCallback(async () => {
    const provider = getAuthProvider()
    if (provider) await provider.sair()
    definirEmpresaAtiva(null)
    setSituacao(authMode() === 'off' ? 'offline' : 'deslogado')
    setEmail(null)
    setPapel(null)
    setEmpresaId(null)
  }, [])

  const valor: AuthContextValor = {
    situacao,
    email,
    papel,
    empresaId,
    ehSuperAdmin: situacao === 'super_admin',
    ehAdminEmpresa: papel === 'admin_empresa',
    entrarComGoogle,
    sair,
    reavaliar,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
