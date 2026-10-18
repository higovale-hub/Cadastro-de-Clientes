import { getCloudAdapter } from './adapters'
import { normalizarEmail } from './constants'
import type { Papel } from './auth'

export interface UsuarioAutorizado {
  id: string
  empresaId: string
  email: string
  nome?: string | null
  papel: Papel
  criadoEm: string
  criadoPor?: string | null
}

function novoId(): string {
  return crypto.randomUUID()
}

// Lista os usuários de uma empresa (ordenados por e-mail).
export async function listarUsuariosDaEmpresa(empresaId: string): Promise<UsuarioAutorizado[]> {
  const adapter = await getCloudAdapter()
  if (!adapter) throw new Error('Nuvem não disponível.')
  const itens = await adapter.listarUsuariosAutorizados()
  return itens
    .filter((u) => u.empresaId === empresaId)
    .map((u) => ({
      id: u.id,
      empresaId: u.empresaId,
      email: u.email,
      nome: u.nome,
      papel: (u.papel as Papel | null) ?? 'operador',
      criadoEm: u.criadoEm,
      criadoPor: u.criadoPor,
    }))
    .sort((a, b) => a.email.localeCompare(b.email))
}

// Autoriza um novo e-mail para uma empresa. Impede duplicatas globais
// (um e-mail não pode pertencer a duas empresas).
export async function autorizarUsuario(params: {
  empresaId: string
  email: string
  nome?: string
  papel: Papel
  criadoPor?: string
}): Promise<void> {
  const adapter = await getCloudAdapter()
  if (!adapter) throw new Error('Nuvem não disponível.')
  const email = normalizarEmail(params.email)

  const existente = await adapter.buscarUsuarioPorEmail(email)
  if (existente) throw new Error('Este e-mail já está vinculado a uma empresa.')

  await adapter.criarUsuarioAutorizado({
    id: novoId(),
    empresaId: params.empresaId,
    email,
    nome: params.nome?.trim() || null,
    papel: params.papel,
    criadoEm: new Date().toISOString(),
    criadoPor: params.criadoPor ?? null,
  })
}

// Remove um usuário.
export async function removerUsuario(id: string): Promise<void> {
  const adapter = await getCloudAdapter()
  if (!adapter) throw new Error('Nuvem não disponível.')
  await adapter.removerUsuarioAutorizado(id)
}
