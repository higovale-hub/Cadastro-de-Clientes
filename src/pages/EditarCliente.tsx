import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../components/Header'
import { FormularioCliente } from '../components/FormularioCliente'
import { db } from '../db/db'
import { atualizarCliente, type DadosCliente } from '../db/repo'

export function EditarCliente() {
  const { clienteId } = useParams<{ clienteId: string }>()
  const navigate = useNavigate()
  const [salvando, setSalvando] = useState(false)

  const cliente = useLiveQuery(
    () => (clienteId ? db.clientes.get(clienteId) : undefined),
    [clienteId],
  )

  if (cliente === undefined) {
    return (
      <>
        <Header titulo="Editar cliente" mostrarVoltar />
        <div className="container">
          <div className="vazio">Carregando...</div>
        </div>
      </>
    )
  }

  if (!cliente) {
    return (
      <>
        <Header titulo="Editar cliente" mostrarVoltar />
        <div className="container">
          <div className="vazio">Cliente não encontrado.</div>
        </div>
      </>
    )
  }

  async function salvar(dados: DadosCliente) {
    if (!clienteId) return
    setSalvando(true)
    try {
      await atualizarCliente(clienteId, dados)
      navigate(`/clientes/${clienteId}`, { replace: true })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Header titulo="Editar cliente" mostrarVoltar />
      <div className="container">
        <FormularioCliente
          inicial={{
            nomeCompleto: cliente.nomeCompleto,
            telefone: cliente.telefone,
            documento: cliente.documento,
            email: cliente.email,
            endereco: cliente.endereco,
          }}
          textoBotao="Salvar alterações"
          onSubmit={salvar}
          salvando={salvando}
        />
      </div>
    </>
  )
}
