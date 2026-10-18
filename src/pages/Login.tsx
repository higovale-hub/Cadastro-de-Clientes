import { useAuth } from '../aws/auth'
import { authMode, trocarUsuarioDev } from '../aws/authProvider'

// Tela de login. Mostrada quando o usuário está deslogado. No modo dev
// (simulação) oferece atalhos de login. No modo real, "Entrar com Google".
// Quem loga e ainda não tem empresa é levado para criar a empresa (Opção C).
export function Login() {
  const { entrarComGoogle, reavaliar } = useAuth()
  const dev = authMode() === 'dev'

  async function entrarComoDev(emailDev: string) {
    trocarUsuarioDev(emailDev)
    await reavaliar()
  }

  return (
    <>
      <header className="app-header">
        <h1>Controle de Clientes</h1>
      </header>
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <div style={{ fontSize: 40 }}>🔐</div>
          <h2 style={{ marginBottom: 6 }}>Entrar</h2>
          <p className="detalhe">
            Use sua conta Google para acessar. Se ainda não tiver uma empresa, você poderá criar
            uma após entrar.
          </p>
          <button
            className="btn btn-primario btn-bloco"
            style={{ marginTop: 16 }}
            onClick={() => entrarComGoogle()}
          >
            Entrar com Google
          </button>

          {dev && (
            <div style={{ marginTop: 18, borderTop: '1px solid var(--cinza-borda)', paddingTop: 14 }}>
              <div className="secao-titulo" style={{ marginTop: 0 }}>
                Modo simulação (dev)
              </div>
              <div className="menu-grid">
                <button
                  className="btn btn-secundario btn-bloco"
                  onClick={() => entrarComoDev('higovale@gmail.com')}
                >
                  Super-admin (backoffice)
                </button>
                <button
                  className="btn btn-secundario btn-bloco"
                  onClick={() => entrarComoDev('admin.empresa@gmail.com')}
                >
                  Admin da empresa (Loja do João)
                </button>
                <button
                  className="btn btn-secundario btn-bloco"
                  onClick={() => entrarComoDev('operador.exemplo@gmail.com')}
                >
                  Operador (Loja do João)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
