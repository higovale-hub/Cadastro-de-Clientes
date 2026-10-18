import { useEffect } from 'react'

interface ToastProps {
  mensagem: string
  onFechar: () => void
  duracaoMs?: number
}

// Toast simples de confirmação. Fecha sozinho após alguns segundos.
export function Toast({ mensagem, onFechar, duracaoMs = 2500 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onFechar, duracaoMs)
    return () => clearTimeout(t)
  }, [onFechar, duracaoMs])

  return <div className="toast" role="status">{mensagem}</div>
}
