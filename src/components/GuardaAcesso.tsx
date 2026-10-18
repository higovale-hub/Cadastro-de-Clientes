import type { ReactNode } from 'react'
import { useAuth } from '../aws/auth'
import { Login } from '../pages/Login'

// Decide o que renderizar conforme a situação de autenticação:
// - 'carregando': tela de carregamento.
// - 'deslogado': tela de Login.
// - 'offline' / 'autorizado' / 'super_admin' / 'sem_empresa': libera o app;
//   o roteamento (App.tsx) decide o destino (ex.: criar empresa quando
//   'sem_empresa', backoffice quando 'super_admin').
export function GuardaAcesso({ children }: { children: ReactNode }) {
  const { situacao } = useAuth()

  if (situacao === 'carregando') {
    return (
      <>
        <header className="app-header">
          <h1>Controle de Clientes</h1>
        </header>
        <div className="container">
          <div className="vazio">Carregando...</div>
        </div>
      </>
    )
  }

  if (situacao === 'deslogado') {
    return <Login />
  }

  return <>{children}</>
}
