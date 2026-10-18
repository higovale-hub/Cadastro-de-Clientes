import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../components/Header'
import { db } from '../db/db'
import { editarDivida, listarParcelasDaDivida } from '../db/repo'
import {
  gerarParcelasAbertasEditadas,
  resumirParaEdicao,
} from '../domain/parcelas'
import { formatBRL } from '../domain/money'
import { formatBR, todayISO } from '../domain/dates'

export function EditarDivida() {
  const { clienteId, dividaId } = useParams<{ clienteId: string; dividaId: string }>()
  const navigate = useNavigate()
  const [salvando, setSalvando] = useState(false)

  const divida = useLiveQuery(
    () => (dividaId ? db.dividas.get(dividaId) : undefined),
    [dividaId],
  )
  const parcelas = useLiveQuery(
    () => (dividaId ? listarParcelasDaDivida(dividaId) : []),
    [dividaId],
  )

  const [descricao, setDescricao] = useState('')
  const [valorAberto, setValorAberto] = useState('')
  const [numeroParcelas, setNumeroParcelas] = useState('')
  const [primeiraData, setPrimeiraData] = useState(todayISO())
  const [diaVencimento, setDiaVencimento] = useState('')
  const [preenchido, setPreenchido] = useState(false)

  // Pré-preenche o formulário uma vez, quando os dados chegam.
  useEffect(() => {
    if (preenchido || !divida || parcelas === undefined) return
    const resumo = resumirParaEdicao(parcelas)
    setDescricao(divida.descricao ?? '')
    setValorAberto(resumo.totalAberto.toFixed(2).replace('.', ','))
    setNumeroParcelas(String(resumo.qtdAbertas || 1))
    setDiaVencimento(String(divida.diaVencimento))
    // Primeira data sugerida: o vencimento da parcela aberta mais próxima,
    // ou hoje se não houver abertas.
    const abertas = parcelas.filter((p) => p.status === 'aberta')
    const proxima = abertas.map((p) => p.vencimento).sort()[0]
    setPrimeiraData(proxima ?? todayISO())
    setPreenchido(true)
  }, [preenchido, divida, parcelas])

  const resumo = useMemo(
    () => (parcelas ? resumirParaEdicao(parcelas) : null),
    [parcelas],
  )

  const valorNum = parseFloat(valorAberto.replace(',', '.'))
  const nParc = parseInt(numeroParcelas, 10)
  const diaVenc = parseInt(diaVencimento, 10)

  const dadosValidos =
    Number.isFinite(valorNum) &&
    valorNum >= 0 &&
    Number.isInteger(nParc) &&
    nParc >= 0 &&
    Number.isInteger(diaVenc) &&
    diaVenc >= 1 &&
    diaVenc <= 31 &&
    Boolean(primeiraData)

  // Prévia das novas parcelas abertas.
  const previa = useMemo(() => {
    if (!dadosValidos || !resumo || nParc < 1 || valorNum <= 0) return []
    return gerarParcelasAbertasEditadas({
      novoValorAberto: valorNum,
      numeroParcelasAbertas: nParc,
      diaVencimento: diaVenc,
      primeiraData,
      numeroInicial: resumo.maiorNumeroPago + 1,
    })
  }, [dadosValidos, resumo, valorNum, nParc, diaVenc, primeiraData])

  if (divida === undefined || parcelas === undefined) {
    return (
      <>
        <Header titulo="Editar dívida" mostrarVoltar />
        <div className="container">
          <div className="vazio">Carregando...</div>
        </div>
      </>
    )
  }

  if (!divida) {
    return (
      <>
        <Header titulo="Editar dívida" mostrarVoltar />
        <div className="container">
          <div className="vazio">Dívida não encontrada.</div>
        </div>
      </>
    )
  }

  const pagas = parcelas.filter((p) => p.status === 'paga').sort((a, b) => a.numero - b.numero)

  async function salvar() {
    if (!dividaId || !clienteId || !dadosValidos) return
    setSalvando(true)
    try {
      await editarDivida(dividaId, {
        descricao,
        novoValorAberto: nParc >= 1 ? valorNum : 0,
        numeroParcelasAbertas: nParc,
        diaVencimento: diaVenc,
        primeiraData,
      })
      navigate(`/clientes/${clienteId}`, { replace: true })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Header titulo="Editar dívida" mostrarVoltar />
      <div className="container">
        {resumo && resumo.qtdPagas > 0 && (
          <div className="card" style={{ borderColor: 'var(--verde)' }}>
            <strong>{resumo.qtdPagas}</strong> parcela(s) já paga(s), somando{' '}
            <strong>{formatBRL(resumo.totalPago)}</strong>, serão <strong>mantidas</strong>. Você
            está editando apenas as parcelas em aberto.
          </div>
        )}

        <div className="card">
          <div className="form-group">
            <label>Descrição (opcional)</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Compra na loja"
            />
          </div>

          <div className="form-group">
            <label>Novo valor em aberto (R$)</label>
            <input
              value={valorAberto}
              onChange={(e) => setValorAberto(e.target.value)}
              placeholder="Ex.: 200,00"
              inputMode="decimal"
            />
            <div className="prevstandalone">
              Valor somado das parcelas em aberto. Deixe o nº de parcelas como 0 para quitar o
              restante sem gerar novas parcelas.
            </div>
          </div>

          <div className="linha">
            <div className="form-group">
              <label>Nº de parcelas em aberto</label>
              <input
                value={numeroParcelas}
                onChange={(e) => setNumeroParcelas(e.target.value)}
                inputMode="numeric"
                placeholder="Ex.: 4"
              />
            </div>
            <div className="form-group">
              <label>
                Dia de vencimento <span className="obrigatorio">*</span>
              </label>
              <input
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
                inputMode="numeric"
                placeholder="Ex.: 8"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Data da próxima parcela <span className="obrigatorio">*</span>
            </label>
            <input
              type="date"
              value={primeiraData}
              onChange={(e) => setPrimeiraData(e.target.value)}
            />
          </div>
        </div>

        {pagas.length > 0 && (
          <div className="card">
            <div className="secao-titulo" style={{ marginTop: 0 }}>
              Parcelas pagas (mantidas)
            </div>
            {pagas.map((p) => (
              <div key={p.id} className="parcela-linha">
                <span className="p-num">#{p.numero}</span>
                <span className="p-info">
                  <span className="badge badge-quitada">Paga</span>
                </span>
                <strong>{formatBRL(p.valor)}</strong>
              </div>
            ))}
          </div>
        )}

        {previa.length > 0 && (
          <div className="card">
            <div className="secao-titulo" style={{ marginTop: 0 }}>
              Novas parcelas em aberto ({previa.length})
            </div>
            {previa.map((p) => (
              <div key={p.numero} className="parcela-linha">
                <span className="p-num">#{p.numero}</span>
                <span className="p-info">
                  <span className="p-venc">Vence em {formatBR(p.vencimento)}</span>
                </span>
                <strong>{formatBRL(p.valor)}</strong>
              </div>
            ))}
          </div>
        )}

        <button
          className="btn btn-primario btn-bloco"
          onClick={salvar}
          disabled={!dadosValidos || salvando}
        >
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </>
  )
}
