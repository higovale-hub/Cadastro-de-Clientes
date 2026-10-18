import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { buscarClientes, type ResultadoBusca } from '../db/repo'

export function BuscarCliente() {
  const navigate = useNavigate()
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [buscou, setBuscou] = useState(false)

  // Busca com debounce enquanto digita.
  useEffect(() => {
    const termoTrim = termo.trim()
    if (termoTrim.length === 0) {
      setResultados([])
      setBuscou(false)
      return
    }
    const t = setTimeout(async () => {
      const res = await buscarClientes(termoTrim, 10)
      setResultados(res)
      setBuscou(true)
    }, 250)
    return () => clearTimeout(t)
  }, [termo])

  return (
    <>
      <Header titulo="Buscar cliente" mostrarVoltar />
      <div className="container">
        <div className="card">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nome ou documento</label>
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Digite o nome ou o documento"
              autoFocus
            />
            <div className="prevstandalone">
              A busca por nome retorna até 10 clientes com maior similaridade.
            </div>
          </div>
        </div>

        {buscou && resultados.length === 0 && (
          <div className="vazio">Nenhum cliente encontrado para “{termo.trim()}”.</div>
        )}

        {resultados.map(({ cliente }) => (
          <div
            key={cliente.id}
            className="lista-item"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/clientes/${cliente.id}`)}
            onKeyDown={(e) =>
              (e.key === 'Enter' || e.key === ' ') && navigate(`/clientes/${cliente.id}`)
            }
          >
            <div className="info">
              <div className="nome">{cliente.nomeCompleto}</div>
              <div className="detalhe">
                {cliente.telefone}
                {cliente.documento ? ` · ${cliente.documento}` : ''}
              </div>
            </div>
            <span aria-hidden>›</span>
          </div>
        ))}
      </div>
    </>
  )
}
