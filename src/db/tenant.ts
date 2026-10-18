// Contexto da empresa ativa (tenant).
//
// Guarda qual empresa o usuário logado pertence. O repositório usa este
// valor para carimbar e filtrar todos os dados de negócio por empresaId.
// É definido pela camada de autenticação após o login e persistido em
// localStorage para sobreviver a recargas de página.

const CHAVE = 'empresa-ativa-id'

let empresaAtivaId: string | null =
  typeof localStorage !== 'undefined' ? localStorage.getItem(CHAVE) : null

export function definirEmpresaAtiva(id: string | null): void {
  empresaAtivaId = id
  if (typeof localStorage === 'undefined') return
  if (id) localStorage.setItem(CHAVE, id)
  else localStorage.removeItem(CHAVE)
}

export function obterEmpresaAtivaId(): string | null {
  return empresaAtivaId
}

// Garante que há uma empresa ativa; lança erro caso contrário.
export function exigirEmpresaAtiva(): string {
  if (!empresaAtivaId) {
    throw new Error('Nenhuma empresa ativa. Faça login novamente.')
  }
  return empresaAtivaId
}
