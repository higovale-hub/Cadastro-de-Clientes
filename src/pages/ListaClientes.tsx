import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../components/Header'
import { montarListaClientes } from '../db/repo'
import { formatBRL } from '../domain/money'
import { formatBR } from '../domain/dates'

export function ListaClientes() {
  const navigate = useNavigate()
  // useLiveQuery reexecuta automaticamente quando os dados mudam.
  const itens = useLiveQuery(() => montarListaClientes(), [])

  if (itens === undefined) {
    return (
      <>
        <Header titulo="Lista de clientes" mostrarVoltar />
        <div className="container">
          <div className="vazio">Carregando...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header titulo="Lista de clientes" mostrarVoltar />
      <div className="container">
        {itens.length === 0 && (
          <div className="vazio">
            Nenhum cliente cadastrado ainda.
            <br />
            <button
              className="btn btn-primario"
              style={{ marginTop: 12 }}
              onClick={() => navigate('/clientes/novo')}
            >
              Cadastrar cliente
            </button>
          </div>
        )}

        {itens.map((item) => (
          <div
            key={item.cliente.id}
            className="lista-item"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/clientes/${item.cliente.id}`)}
            onKeyDown={(e) =>
              (e.key === 'Enter' || e.key === ' ') && navigate(`/clientes/${item.cliente.id}`)
            }
          >
            <div className="info">
              <div className="nome">{item.cliente.nomeCompleto}</div>
              <div className="detalhe">
                {item.temVencida && item.vencimentoMaisAtrasado ? (
                  <span className="badge badge-vencida">
                    Vencida desde {formatBR(item.vencimentoMaisAtrasado)}
                  </span>
                ) : item.totalEmAberto > 0 && item.proximoVencimento ? (
                  <span className="badge badge-vencer">
                    Vence em {formatBR(item.proximoVencimento)}
                  </span>
                ) : (
                  <span className="detalhe">Sem dívidas em aberto</span>
                )}
              </div>
            </div>
            <div className="valor">
              {item.totalEmAberto > 0 ? formatBRL(item.totalEmAberto) : '—'}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
