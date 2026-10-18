// E-mail do usuário mestre (admin). Sempre autorizado e com papel admin,
// independentemente da lista restrita. Deve também estar no grupo Cognito
// "admin" para ter permissão de escrita em UsuarioAutorizado (ver AWS_SETUP.md).
export const EMAIL_ADMIN_MESTRE = 'higovale@gmail.com'

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}
