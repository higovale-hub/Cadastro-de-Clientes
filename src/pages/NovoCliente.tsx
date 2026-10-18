import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { FormularioCliente } from '../components/FormularioCliente'
import { criarCliente, SaldoInsuficienteError, type DadosCliente } from '../db/repo'

export function NovoCliente() {
  const navigate = useNavigate()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(dados: DadosCliente) {
    setErro(null)
    setSalvando(true)
    try {
      const cliente = await criarCliente(dados)
      // Segue para vincular dívida ao cliente recém-criado.
      navigate(`/clientes/${cliente.id}/dividas/nova`, {
        replace: true,
        state: { novoCliente: true },
      })
    } catch (e) {
      if (e instanceof SaldoInsuficienteError) {
        setErro(e.message)
      } else {
        setErro(e instanceof Error ? e.message : 'Erro ao cadastrar cliente.')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Header titulo="Cadastrar cliente" mostrarVoltar />
      <div className="container">
        {erro && (
          <div className="card" style={{ borderColor: 'var(--vermelho)' }}>
            <div className="form-erro" style={{ margin: 0 }}>
              {erro}
            </div>
          </div>
        )}
        <FormularioCliente
          textoBotao="Salvar e vincular dívida"
          onSubmit={salvar}
          salvando={salvando}
        />
      </div>
    </>
  )
}
