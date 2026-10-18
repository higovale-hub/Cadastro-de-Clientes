import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { useAuth } from '../aws/auth'
import {
  listarEmpresasComResumo,
  listarConsumos,
  PRECO_REFERENCIA_POR_CREDITO,
} from '../aws/empresas'
import { formatBRL } from '../domain/money'
import { todayISO } from '../domain/dates'

interface LinhaRelatorio {
  empresaId: string
  nome: string
  documento: string
  consumoPeriodo: number // créditos consumidos no período
  saldoAtual: number // créditos
  valorConsumoReais: number
  valorSaldoReais: number
}

// Relatório por período (início → fim): para cada empresa, créditos
// consumidos no período, saldo atual e valor equivalente em R$. Exporta CSV.
export function RelatorioBackoffice() {
  const { situacao } = useAuth()
  const hoje = todayISO()
  const [inicio, setInicio] = useState(hoje)
  const [fim, setFim] = useState(hoje)
  const [linhas, setLinhas] = useState<LinhaRelatorio[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (situacao !== 'super_admin') {
    return <Navigate to="/" replace />
  }

  async function gerar() {
    setErro(null)
    setCarregando(true)
    try {
      // Período inclusivo: do começo do dia início ao fim do dia fim (ISO).
      const inicioISO = `${inicio}T00:00:00.000Z`
      const fimISO = `${fim}T23:59:59.999Z`

      const [empresas, consumos] = await Promise.all([
        listarEmpresasComResumo(),
        listarConsumos({ inicio: inicioISO, fim: fimISO }),
      ])

      const consumoPorEmpresa = new Map<string, number>()
      for (const c of consumos) {
        consumoPorEmpresa.set(c.empresaId, (consumoPorEmpresa.get(c.empresaId) ?? 0) + c.creditos)
      }

      const resultado: LinhaRelatorio[] = empresas.map((item) => {
        const consumoPeriodo = consumoPorEmpresa.get(item.empresa.id) ?? 0
        const saldoAtual = item.empresa.saldoCreditos
        return {
          empresaId: item.empresa.id,
          nome: item.empresa.nome,
          documento: item.empresa.documento ?? '',
          consumoPeriodo,
          saldoAtual,
          valorConsumoReais: consumoPeriodo * PRECO_REFERENCIA_POR_CREDITO,
          valorSaldoReais: saldoAtual * PRECO_REFERENCIA_POR_CREDITO,
        }
      })
      setLinhas(resultado)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar relatório.')
    } finally {
      setCarregando(false)
    }
  }

  function exportarCSV() {
    if (!linhas || linhas.length === 0) return
    const cabecalho = [
      'Empresa',
      'Documento',
      'Creditos consumidos no periodo',
      'Valor consumido (R$)',
      'Saldo atual (creditos)',
      'Valor saldo (R$)',
    ]
    const linhasCsv = linhas.map((l) =>
      [
        aspas(l.nome),
        aspas(l.documento),
        String(l.consumoPeriodo),
        l.valorConsumoReais.toFixed(2).replace('.', ','),
        String(l.saldoAtual),
        l.valorSaldoReais.toFixed(2).replace('.', ','),
      ].join(';'),
    )
    const conteudo = [`Periodo;${inicio} a ${fim}`, '', cabecalho.join(';'), ...linhasCsv].join('\n')
    baixarArquivo(`relatorio_${inicio}_a_${fim}.csv`, conteudo)
  }

  return (
    <>
      <Header titulo="Relatório por período" mostrarVoltar />
      <div className="container">
        <div className="card">
          <div className="linha">
            <div className="form-group">
              <label>Início</label>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Fim</label>
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
          {erro && <div className="form-erro">{erro}</div>}
          <button className="btn btn-primario btn-bloco" onClick={gerar} disabled={carregando}>
            {carregando ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>

        {linhas && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="secao-titulo">Resultado ({linhas.length})</div>
              <button className="btn btn-secundario" onClick={exportarCSV} disabled={linhas.length === 0}>
                ⬇️ Exportar CSV
              </button>
            </div>

            {linhas.length === 0 && <div className="vazio">Nenhuma empresa encontrada.</div>}

            {linhas.map((l) => (
              <div key={l.empresaId} className="card">
                <strong>{l.nome}</strong>
                {l.documento && <div className="detalhe">{l.documento}</div>}
                <div className="parcela-linha">
                  <span className="p-info">
                    <div className="p-venc">Consumido no período</div>
                    <strong>
                      {l.consumoPeriodo} créditos · {formatBRL(l.valorConsumoReais)}
                    </strong>
                  </span>
                  <span className="p-info">
                    <div className="p-venc">Saldo atual</div>
                    <strong>
                      {l.saldoAtual} créditos · {formatBRL(l.valorSaldoReais)}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

// Escapa um campo CSV entre aspas, dobrando aspas internas.
function aspas(s: string): string {
  return `"${s.replace(/"/g, '""')}"`
}

// Dispara o download de um arquivo de texto no navegador.
function baixarArquivo(nome: string, conteudo: string) {
  // BOM para o Excel reconhecer acentos (UTF-8).
  const blob = new Blob(['\ufeff' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
