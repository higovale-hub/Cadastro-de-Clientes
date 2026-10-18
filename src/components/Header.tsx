import { useNavigate } from 'react-router-dom'
import { StatusConexao } from './StatusConexao'
import { StatusSync } from './StatusSync'
import { SeloSaldo } from './SeloSaldo'
import { useAuth } from '../aws/auth'

interface HeaderProps {
  titulo: string
  mostrarVoltar?: boolean
}

export function Header({ titulo, mostrarVoltar }: HeaderProps) {
  const navigate = useNavigate()
  const { situacao, sair } = useAuth()

  return (
    <header className="app-header">
      {mostrarVoltar && (
        <button className="voltar" onClick={() => navigate(-1)} aria-label="Voltar">
          ← Voltar
        </button>
      )}
      <h1>{titulo}</h1>
      {/* Saldo de créditos (discreto) para usuários de empresa. */}
      <SeloSaldo />
      {/* Quando integrado à AWS, mostra status de sync; senão, online/offline. */}
      {situacao === 'autorizado' ? <StatusSync /> : <StatusConexao />}
      {(situacao === 'autorizado' || situacao === 'super_admin') && (
        <button className="voltar" onClick={() => void sair()} aria-label="Sair">
          Sair
        </button>
      )}
    </header>
  )
}
