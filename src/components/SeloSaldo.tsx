import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { obterEmpresaAtivaId } from '../db/tenant'
import { useAuth } from '../aws/auth'
import { formatBRL } from '../domain/money'
import { PRECO_REFERENCIA_POR_CREDITO } from '../aws/empresas'

// Selo discreto de saldo de créditos no cabeçalho. Ao passar o mouse,
// exibe um tooltip com informações detalhadas (saldo, valor em R$, regra
// de consumo e aviso de saldo baixo). Só aparece para usuários de empresa.
export function SeloSaldo() {
  const { situacao } = useAuth()

  const empresa = useLiveQuery(() => {
    const id = obterEmpresaAtivaId()
    return id ? db.empresas.get(id) : undefined
  }, [])

  if (situacao !== 'autorizado' || empresa === undefined || empresa === null) return null

  const saldo = empresa.saldoCreditos
  const baixo = saldo <= 5
  const valor = formatBRL(saldo * PRECO_REFERENCIA_POR_CREDITO)

  return (
    <span className="com-tooltip" tabIndex={0}>
      <span className={`selo-saldo${baixo ? ' selo-saldo-baixo' : ''}`}>🪙 {saldo}</span>

      <span className="tooltip-box" role="tooltip">
        <span className="tooltip-titulo">{empresa.nome}</span>
        <span className="tooltip-linha">
          <span>Créditos disponíveis</span>
          <strong>{saldo}</strong>
        </span>
        <span className="tooltip-linha">
          <span>Valor equivalente</span>
          <strong>{valor}</strong>
        </span>
        <span className="tooltip-nota">
          Cada cliente cadastrado consome 1 crédito. Os créditos não expiram.
        </span>
        {baixo && (
          <span className="tooltip-alerta">
            ⚠️ Saldo baixo — contate o administrador para recarregar.
          </span>
        )}
      </span>
    </span>
  )
}
