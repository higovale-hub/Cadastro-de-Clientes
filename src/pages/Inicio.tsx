import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { useAuth } from '../aws/auth'

export function Inicio() {
  const navigate = useNavigate()
  const { ehAdminEmpresa } = useAuth()

  const opcoes = [
    {
      icone: '➕',
      titulo: 'Cadastrar novo cliente',
      sub: 'Adicionar cliente e vincular dívida',
      rota: '/clientes/novo',
    },
    {
      icone: '🔎',
      titulo: 'Buscar cliente',
      sub: 'Por nome ou documento',
      rota: '/buscar',
    },
    {
      icone: '📋',
      titulo: 'Ver lista de clientes',
      sub: 'Dívidas vencidas e a vencer',
      rota: '/clientes',
    },
    // Usuários da empresa: só para o admin da empresa.
    ...(ehAdminEmpresa
      ? [
          {
            icone: '👥',
            titulo: 'Usuários da empresa',
            sub: 'Autorizar e remover acessos',
            rota: '/empresa/usuarios',
          },
        ]
      : []),
  ]

  return (
    <>
      <Header titulo="Controle de Clientes" />
      <div className="container">
        <div className="menu-grid">
          {opcoes.map((o) => (
            <div
              key={o.rota}
              className="menu-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(o.rota)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(o.rota)}
            >
              <div className="icone" aria-hidden>
                {o.icone}
              </div>
              <div>
                <div className="titulo">{o.titulo}</div>
                <div className="sub">{o.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
