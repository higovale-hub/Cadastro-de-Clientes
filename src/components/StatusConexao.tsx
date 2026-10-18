import { useEffect, useState } from 'react'

// Indicador de conexão. Na Fase 1 apenas reflete online/offline do
// navegador; na Fase 2 mostrará também pendências de sincronização.
export function StatusConexao() {
  const [online, setOnline] = useState<boolean>(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <span className="com-tooltip" tabIndex={0}>
      <span className={`status-conexao ${online ? 'online' : ''}`}>
        <span className="ponto" />
        {online ? 'Online' : 'Offline'}
      </span>

      <span className="tooltip-box" role="tooltip">
        <span className="tooltip-titulo">Conexão</span>
        <span className="tooltip-linha">
          <span>Estado</span>
          <strong>{online ? 'Online' : 'Offline'}</strong>
        </span>
        <span className="tooltip-nota">
          {online
            ? 'Você está conectado à internet.'
            : 'Sem internet. O app continua funcionando e os dados ficam salvos no dispositivo.'}
        </span>
      </span>
    </span>
  )
}
