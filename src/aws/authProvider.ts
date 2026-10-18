// Abstração do provedor de autenticação, com duas implementações:
// - CognitoAuth (produção): login real com Google via Amplify/Cognito.
// - DevAuth (simulação): login fake em memória, sem servidor.
//
// A escolha é feita por VITE_AUTH_MODE (off | dev | cognito). O AuthContext
// (auth.tsx) usa este provedor e não conhece os detalhes de cada modo.

export type AuthMode = 'off' | 'dev' | 'cognito'

export function authMode(): AuthMode {
  const m = (import.meta.env.VITE_AUTH_MODE as string | undefined)?.toLowerCase()
  if (m === 'dev' || m === 'cognito') return m
  return 'off'
}

export interface AuthProviderApi {
  readonly modo: AuthMode
  // Retorna o e-mail do usuário logado, ou null se não há sessão.
  emailAtual(): Promise<string | null>
  entrar(): Promise<void>
  sair(): Promise<void>
  // Registra callback para eventos de login/logout; retorna função de cancelar.
  aoMudar(cb: () => void): () => void
}

// ---------- Cognito (produção) ----------

class CognitoAuth implements AuthProviderApi {
  readonly modo = 'cognito' as const

  async emailAtual(): Promise<string | null> {
    const { getCurrentUser, fetchUserAttributes } = await import('aws-amplify/auth')
    try {
      await getCurrentUser()
      const attrs = await fetchUserAttributes()
      return attrs.email ?? null
    } catch {
      return null
    }
  }

  async entrar(): Promise<void> {
    const { signInWithRedirect } = await import('aws-amplify/auth')
    await signInWithRedirect({ provider: 'Google' })
  }

  async sair(): Promise<void> {
    const { signOut } = await import('aws-amplify/auth')
    await signOut()
  }

  aoMudar(cb: () => void): () => void {
    let cancelar = () => {}
    void (async () => {
      const { Hub } = await import('aws-amplify/utils')
      cancelar = Hub.listen('auth', ({ payload }) => {
        if (
          payload.event === 'signInWithRedirect' ||
          payload.event === 'signedIn' ||
          payload.event === 'signedOut'
        ) {
          cb()
        }
      })
    })()
    return () => cancelar()
  }
}

// ---------- Dev (simulação, sem Cognito) ----------

// Usuário fake usado no modo dev. Pode ser trocado para testar papéis.
// Persistimos em localStorage para sobreviver a recargas de página.
const CHAVE_DEV = 'dev-auth-email'
const EMAIL_DEV_PADRAO =
  (import.meta.env.VITE_DEV_EMAIL as string | undefined) ?? 'higovale@gmail.com'

class DevAuth implements AuthProviderApi {
  readonly modo = 'dev' as const
  private ouvintes = new Set<() => void>()

  async emailAtual(): Promise<string | null> {
    return localStorage.getItem(CHAVE_DEV)
  }

  async entrar(): Promise<void> {
    localStorage.setItem(CHAVE_DEV, EMAIL_DEV_PADRAO)
    this.notificar()
  }

  async sair(): Promise<void> {
    localStorage.removeItem(CHAVE_DEV)
    this.notificar()
  }

  // Extra do modo dev: troca o usuário logado (para testar operador/admin).
  trocarUsuario(email: string): void {
    localStorage.setItem(CHAVE_DEV, email.trim().toLowerCase())
    this.notificar()
  }

  aoMudar(cb: () => void): () => void {
    this.ouvintes.add(cb)
    return () => this.ouvintes.delete(cb)
  }

  private notificar() {
    for (const fn of this.ouvintes) fn()
  }
}

let instancia: AuthProviderApi | null = null

export function getAuthProvider(): AuthProviderApi | null {
  const modo = authMode()
  if (modo === 'off') return null
  if (instancia && instancia.modo === modo) return instancia
  instancia = modo === 'cognito' ? new CognitoAuth() : new DevAuth()
  return instancia
}

// Acesso à função extra do modo dev (troca de usuário), se aplicável.
export function trocarUsuarioDev(email: string): void {
  const p = getAuthProvider()
  if (p && p.modo === 'dev') {
    ;(p as DevAuth).trocarUsuario(email)
  }
}
