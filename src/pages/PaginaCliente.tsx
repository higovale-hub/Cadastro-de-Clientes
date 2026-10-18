import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../components/Header'
import { Toast } from '../components/Toast'
import { ModalConfirmacao } from '../components/ModalConfirmacao'
import { linkTelefone, linkWhatsapp, linkSms } from '../domain/contato'
import { db } from '../db/db'
import {
  baixarDividaInteira,
  baixarParcela,
  listarDividasDoCliente,
  listarParcelasDaDivida,
} from '../db/repo'
import type { Divida, Parcela } from '../db/types'
import { formatBRL } from '../domain/money'
import { formatBR } from '../domain/dates'
import { parcelaVencida, totalEmAberto } from '../domain/parcelas'
import { mascararTelefone, mascararDocumento } from '../domain/mascaras'

export function PaginaCliente() {
  const { clienteId } = useParams<{ clienteId: string }>()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)
  // Link para o qual redirecionar após a confirmação de saída do app.
  const [linkPendente, setLinkPendente] = useState<string | null>(null)

  const cliente = useLiveQuery(
    () => (clienteId ? db.clientes.get(clienteId) : undefined),
    [clienteId],
  )
  const dividas = useLiveQuery(
    () => (clienteId ? listarDividasDoCliente(clienteId) : []),
    [clienteId],
  )

  if (clienteId && cliente === null) {
    // get() resolve para undefined quando não existe; tratamos abaixo.
  }

  if (cliente === undefined || dividas === undefined) {
    return (
      <>
        <Header titulo="Cliente" mostrarVoltar />
        <div className="container">
          <div className="vazio">Carregando...</div>
        </div>
      </>
    )
  }

  if (!cliente) {
    return (
      <>
        <Header titulo="Cliente" mostrarVoltar />
        <div className="container">
          <div className="vazio">Cliente não encontrado.</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header titulo="Cliente" mostrarVoltar />
      <div className="container">
        {/* Dados cadastrais */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div className="nome" style={{ fontSize: 20, flex: 1 }}>
              {cliente.nomeCompleto}
            </div>
            <button
              className="btn btn-secundario"
              onClick={() => navigate(`/clientes/${cliente.id}/editar`)}
            >
              ✏️ Editar
            </button>
          </div>
          <div className="detalhe" style={{ marginTop: 6 }}>
            📞 {mascararTelefone(cliente.telefone)}
          </div>
          {/* Ações de contato — só aparecem no celular (mobile-only). */}
          <div className="acoes-telefone mobile-only">
            <button
              className="btn-icone btn-icone-ligar"
              aria-label="Ligar"
              title="Ligar"
              onClick={() => setLinkPendente(linkTelefone(cliente.telefone))}
            >
              📞
            </button>
            <button
              className="btn-icone btn-icone-whatsapp"
              aria-label="WhatsApp"
              title="WhatsApp"
              onClick={() => setLinkPendente(linkWhatsapp(cliente.telefone))}
            >
              💬
            </button>
            <button
              className="btn-icone btn-icone-sms"
              aria-label="SMS"
              title="SMS"
              onClick={() => setLinkPendente(linkSms(cliente.telefone))}
            >
              ✉️
            </button>
          </div>
          {cliente.documento && (
            <div className="detalhe">🪪 {mascararDocumento(cliente.documento)}</div>
          )}
          {cliente.email && <div className="detalhe">✉️ {cliente.email}</div>}
          {cliente.endereco && <div className="detalhe">📍 {cliente.endereco}</div>}
        </div>

        <button
          className="btn btn-primario btn-bloco"
          onClick={() => navigate(`/clientes/${cliente.id}/dividas/nova`)}
        >
          ➕ Cadastrar nova dívida
        </button>

        <div className="secao-titulo">Dívidas</div>
        {dividas.length === 0 && <div className="vazio">Nenhuma dívida cadastrada.</div>}

        {dividas
          .slice()
          .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
          .map((divida) => (
            <CardDivida
              key={divida.id}
              divida={divida}
              onToast={(m) => setToast(m)}
            />
          ))}
      </div>
      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
      {linkPendente && (
        <ModalConfirmacao
          mensagem="Você está saindo do aplicativo e será redirecionado para aplicativos de terceiros no seu smartphone."
          onCancelar={() => setLinkPendente(null)}
          onConfirmar={() => {
            const destino = linkPendente
            setLinkPendente(null)
            window.location.href = destino
          }}
        />
      )}
    </>
  )
}

function CardDivida({ divida, onToast }: { divida: Divida; onToast: (m: string) => void }) {
  const navigate = useNavigate()
  const parcelas = useLiveQuery(() => listarParcelasDaDivida(divida.id), [divida.id])

  if (parcelas === undefined) return null

  const emAberto = totalEmAberto(parcelas)
  const quitada = divida.status === 'quitada'

  async function darBaixaParcela(p: Parcela) {
    await baixarParcela(p.id)
    onToast(`Parcela #${p.numero} baixada.`)
  }

  async function darBaixaTudo() {
    const confirmar = window.confirm(
      'Dar baixa em TODAS as parcelas abertas desta dívida? A dívida será marcada como quitada.',
    )
    if (!confirmar) return
    await baixarDividaInteira(divida.id)
    onToast('Dívida quitada.')
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <strong>{divida.descricao || 'Dívida'}</strong>
          <div className="detalhe">
            Total {formatBRL(divida.valorTotal)} · {divida.numeroParcelas}x
          </div>
        </div>
        {quitada ? (
          <span className="badge badge-quitada">Quitada</span>
        ) : (
          <div className="valor">
            Em aberto
            <br />
            <strong>{formatBRL(emAberto)}</strong>
          </div>
        )}
      </div>

      {!quitada && (
        <button
          className="btn btn-secundario"
          style={{ marginTop: 10 }}
          onClick={() =>
            navigate(`/clientes/${divida.clienteId}/dividas/${divida.id}/editar`)
          }
        >
          ✏️ Editar dívida
        </button>
      )}

      <div style={{ marginTop: 10 }}>
        {parcelas.map((p) => {
          const vencida = parcelaVencida(p)
          return (
            <div key={p.id} className="parcela-linha">
              <span className="p-num">#{p.numero}</span>
              <span className="p-info">
                <div>{formatBRL(p.valor)}</div>
                <span className="p-venc">
                  {p.status === 'paga' ? (
                    <span className="badge badge-quitada">Paga</span>
                  ) : vencida ? (
                    <span className="badge badge-vencida">Vencida {formatBR(p.vencimento)}</span>
                  ) : (
                    <>Vence {formatBR(p.vencimento)}</>
                  )}
                </span>
              </span>
              {p.status === 'aberta' && (
                <button className="btn btn-sucesso" onClick={() => darBaixaParcela(p)}>
                  Baixar
                </button>
              )}
            </div>
          )
        })}
      </div>

      {!quitada && emAberto > 0 && (
        <button
          className="btn btn-secundario btn-bloco"
          style={{ marginTop: 12 }}
          onClick={darBaixaTudo}
        >
          Baixar dívida inteira
        </button>
      )}
    </div>
  )
}
