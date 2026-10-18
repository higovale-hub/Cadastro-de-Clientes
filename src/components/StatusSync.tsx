import { useEffect, useState } from 'react'
import { useAuth } from '../aws/auth'
import { assinarSync, obterStatus, sincronizar, type StatusSync as Status } from '../aws/sync'

// Mostra o estado da sincronização com a nuvem e permite sincronizar
// manualmente. Só aparece quando o app está integrado à AWS (autorizado).
export function StatusSync() {
  const { situacao } = useAuth()
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    if (situacao !== 'autorizado') return
    let ativo = true
    const atualizar = async () => {
      const s = await obterStatus()
      if (ativo) setStatus(s)
    }
    void atualizar()
    const cancelar = assinarSync(() => void atualizar())
    // Atualiza a contagem de pendências periodicamente.
    const intervalo = setInterval(() => void atualizar(), 4000)
    return () => {
      ativo = false
      cancelar()
      clearInterval(intervalo)
    }
  }, [situacao])

  if (situacao !== 'autorizado' || !status) return null

  const texto =
    status.estado === 'sincronizando'
      ? 'Sincronizando...'
      : status.pendencias > 0
        ? `${status.pendencias} pendente(s)`
        : 'Sincronizado'

  const ultima = status.ultimaSync
    ? new Date(status.ultimaSync).toLocaleString('pt-BR')
    : 'ainda não sincronizado'

  return (
    <span className="com-tooltip" tabIndex={0}>
      <button
        className="status-conexao online"
        style={{ border: 'none', cursor: 'pointer' }}
        onClick={() => void sincronizar()}
        disabled={status.estado === 'sincronizando'}
      >
        <span className="ponto" />
        {texto}
      </button>

      <span className="tooltip-box" role="tooltip">
        <span className="tooltip-titulo">Sincronização</span>
        <span className="tooltip-linha">
          <span>Estado</span>
          <strong>{status.estado === 'sincronizando' ? 'Sincronizando' : 'Em dia'}</strong>
        </span>
        <span className="tooltip-linha">
          <span>Alterações pendentes</span>
          <strong>{status.pendencias}</strong>
        </span>
        <span className="tooltip-linha">
          <span>Última sincronização</span>
        </span>
        <span className="tooltip-nota">{ultima}</span>
        {status.ultimoErro ? (
          <span className="tooltip-alerta">⚠️ {status.ultimoErro}</span>
        ) : (
          <span className="tooltip-nota">Clique no indicador para sincronizar agora.</span>
        )}
      </span>
    </span>
  )
}
