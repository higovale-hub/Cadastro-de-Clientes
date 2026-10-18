import { useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Header } from '../components/Header'
import { criarDivida } from '../db/repo'
import { gerarParcelas } from '../domain/parcelas'
import { formatBRL } from '../domain/money'
import { formatBR, parseISODate, todayISO } from '../domain/dates'

export function NovaDivida() {
  const { clienteId } = useParams<{ clienteId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const vindoDeCadastro = Boolean((location.state as { novoCliente?: boolean } | null)?.novoCliente)

  const [descricao, setDescricao] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [numeroParcelas, setNumeroParcelas] = useState('1')
  const [primeiraData, setPrimeiraData] = useState(todayISO())
  const [diaVencimento, setDiaVencimento] = useState(() => String(parseISODate(todayISO()).day))
  const [salvando, setSalvando] = useState(false)

  const valorNum = parseFloat(valorTotal.replace(',', '.'))
  const nParc = parseInt(numeroParcelas, 10)
  const diaVenc = parseInt(diaVencimento, 10)

  const dadosValidos =
    Number.isFinite(valorNum) &&
    valorNum > 0 &&
    Number.isInteger(nParc) &&
    nParc >= 1 &&
    Number.isInteger(diaVenc) &&
    diaVenc >= 1 &&
    diaVenc <= 31 &&
    Boolean(primeiraData)

  // Prévia das parcelas recalculada conforme o usuário digita.
  const previa = useMemo(() => {
    if (!dadosValidos) return []
    return gerarParcelas({
      valorTotal: valorNum,
      numeroParcelas: nParc,
      diaVencimento: diaVenc,
      primeiraData,
    })
  }, [dadosValidos, valorNum, nParc, diaVenc, primeiraData])

  async function salvar() {
    if (!clienteId || !dadosValidos) return
    setSalvando(true)
    try {
      await criarDivida(clienteId, {
        descricao,
        valorTotal: valorNum,
        numeroParcelas: nParc,
        diaVencimento: diaVenc,
        primeiraData,
      })
      navigate(`/clientes/${clienteId}`, { replace: true })
    } finally {
      setSalvando(false)
    }
  }

  function pular() {
    if (!clienteId) return
    navigate(`/clientes/${clienteId}`, { replace: true })
  }

  return (
    <>
      <Header titulo="Vincular dívida" mostrarVoltar />
      <div className="container">
        {vindoDeCadastro && (
          <div className="card" style={{ borderColor: 'var(--verde)' }}>
            ✅ Cliente cadastrado. Agora você pode vincular uma dívida ou pular esta etapa.
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
            <label>
              Valor total (R$) <span className="obrigatorio">*</span>
            </label>
            <input
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="Ex.: 100,00"
              inputMode="decimal"
            />
          </div>

          <div className="linha">
            <div className="form-group">
              <label>
                Nº de parcelas <span className="obrigatorio">*</span>
              </label>
              <input
                value={numeroParcelas}
                onChange={(e) => setNumeroParcelas(e.target.value)}
                inputMode="numeric"
                placeholder="Ex.: 10"
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
              Data do 1º pagamento <span className="obrigatorio">*</span>
            </label>
            <input
              type="date"
              value={primeiraData}
              onChange={(e) => setPrimeiraData(e.target.value)}
            />
            <div className="prevstandalone">
              As demais parcelas vencem todo dia {diaVencimento || '—'} dos meses seguintes. Se o dia
              não existir no mês, usa-se o último dia.
            </div>
          </div>
        </div>

        {previa.length > 0 && (
          <div className="card">
            <div className="secao-titulo" style={{ marginTop: 0 }}>
              Prévia das parcelas ({previa.length})
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

        <div className="botoes">
          <button className="btn btn-secundario" onClick={pular} disabled={salvando}>
            Pular
          </button>
          <button
            className="btn btn-primario btn-bloco"
            onClick={salvar}
            disabled={!dadosValidos || salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar dívida'}
          </button>
        </div>
      </div>
    </>
  )
}
