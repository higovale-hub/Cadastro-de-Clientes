import { useEffect, useState, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Toast } from '../components/Toast'
import { useAuth } from '../aws/auth'
import {
  listarEmpresasComResumo,
  recarregarCreditos,
  PRECO_REFERENCIA_POR_CREDITO,
  type EmpresaResumo,
} from '../aws/empresas'
import { formatBRL } from '../domain/money'

// Painel do super-admin: lista empresas com usuários, clientes e saldo, e
// permite recarregar créditos. Só o e-mail mestre acessa.
export function Backoffice() {
  const { ehSuperAdmin, situacao } = useAuth()
  const navigate = useNavigate()
  const [itens, setItens] = useState<EmpresaResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setItens(await listarEmpresasComResumo())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (ehSuperAdmin) void carregar()
  }, [ehSuperAdmin, carregar])

  if (situacao !== 'super_admin') {
    return <Navigate to="/" replace />
  }

  async function recarregar(empresaId: string, nome: string) {
    const entrada = window.prompt(`Quantos créditos adicionar para "${nome}"?`, '100')
    if (entrada === null) return
    const creditos = parseInt(entrada, 10)
    if (!Number.isInteger(creditos) || creditos <= 0) {
      setErro('Informe um número de créditos válido.')
      return
    }
    try {
      await recarregarCreditos({
        empresaId,
        creditos,
        valorReais: creditos * PRECO_REFERENCIA_POR_CREDITO,
      })
      setToast(`${creditos} créditos adicionados a ${nome}.`)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao recarregar.')
    }
  }

  const totalEmpresas = itens.length
  const totalClientes = itens.reduce((s, i) => s + i.qtdClientes, 0)
  const totalSaldo = itens.reduce((s, i) => s + i.empresa.saldoCreditos, 0)

  return (
    <>
      <Header titulo="Backoffice" />
      <div className="container">
        <div className="card">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="detalhe">Empresas</div>
              <strong style={{ fontSize: 20 }}>{totalEmpresas}</strong>
            </div>
            <div>
              <div className="detalhe">Clientes (total)</div>
              <strong style={{ fontSize: 20 }}>{totalClientes}</strong>
            </div>
            <div>
              <div className="detalhe">Saldo (total)</div>
              <strong style={{ fontSize: 20 }}>{totalSaldo} créditos</strong>
            </div>
          </div>
          <div className="botoes" style={{ marginTop: 14 }}>
            <button
              className="btn btn-primario btn-bloco"
              onClick={() => navigate('/backoffice/empresas/nova')}
            >
              ➕ Criar empresa
            </button>
            <button
              className="btn btn-secundario btn-bloco"
              onClick={() => navigate('/backoffice/relatorio')}
            >
              📄 Relatório (CSV)
            </button>
          </div>
        </div>

        <div className="secao-titulo">Empresas</div>

        {erro && <div className="form-erro" style={{ marginBottom: 10 }}>{erro}</div>}
        {carregando && <div className="vazio">Carregando...</div>}
        {!carregando && itens.length === 0 && (
          <div className="vazio">Nenhuma empresa cadastrada ainda.</div>
        )}

        {itens.map((item) => (
          <div key={item.empresa.id} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <strong>{item.empresa.nome}</strong>
                {item.empresa.documento && (
                  <div className="detalhe">{item.empresa.documento}</div>
                )}
                <div className="detalhe">
                  👥 {item.qtdUsuarios} usuário(s) · 👤 {item.qtdClientes} cliente(s)
                </div>
              </div>
              <div className="valor">
                Saldo
                <br />
                <strong>{item.empresa.saldoCreditos}</strong>
                <div className="detalhe">
                  ≈ {formatBRL(item.empresa.saldoCreditos * PRECO_REFERENCIA_POR_CREDITO)}
                </div>
              </div>
            </div>
            <button
              className="btn btn-sucesso btn-bloco"
              style={{ marginTop: 10 }}
              onClick={() => recarregar(item.empresa.id, item.empresa.nome)}
            >
              ➕ Recarregar créditos
            </button>
          </div>
        ))}
      </div>
      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
    </>
  )
}
