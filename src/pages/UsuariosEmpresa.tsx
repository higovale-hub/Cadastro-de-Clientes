import { useEffect, useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Toast } from '../components/Toast'
import { useAuth, type Papel } from '../aws/auth'
import { validarEmail } from '../domain/validacoes'
import {
  autorizarUsuario,
  listarUsuariosDaEmpresa,
  removerUsuario,
  type UsuarioAutorizado,
} from '../aws/usuarios'

// Gestão de usuários DA PRÓPRIA EMPRESA. Só o admin_empresa acessa.
export function UsuariosEmpresa() {
  const { situacao, ehAdminEmpresa, empresaId, email: emailAtual } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioAutorizado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoPapel, setNovoPapel] = useState<Papel>('operador')
  const [erro, setErro] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    if (!empresaId) return
    setCarregando(true)
    setErro(null)
    try {
      setUsuarios(await listarUsuariosDaEmpresa(empresaId))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setCarregando(false)
    }
  }, [empresaId])

  useEffect(() => {
    if (ehAdminEmpresa) void carregar()
  }, [ehAdminEmpresa, carregar])

  if (situacao === 'offline') {
    return (
      <>
        <Header titulo="Usuários da empresa" mostrarVoltar />
        <div className="container">
          <div className="vazio">Esta área requer a integração com a nuvem ativa.</div>
        </div>
      </>
    )
  }
  if (!ehAdminEmpresa) {
    return <Navigate to="/" replace />
  }

  async function adicionar() {
    setErro(null)
    if (!novoEmail.trim() || !validarEmail(novoEmail)) {
      setErro('Informe um e-mail válido.')
      return
    }
    if (!empresaId) return
    setSalvando(true)
    try {
      await autorizarUsuario({
        empresaId,
        email: novoEmail,
        nome: novoNome,
        papel: novoPapel,
        criadoPor: emailAtual ?? undefined,
      })
      setNovoEmail('')
      setNovoNome('')
      setNovoPapel('operador')
      setToast('Usuário autorizado.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao autorizar.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(u: UsuarioAutorizado) {
    // Não permite remover a si mesmo (evita a empresa ficar sem admin por engano).
    if (u.email === emailAtual) {
      setErro('Você não pode remover o seu próprio acesso.')
      return
    }
    if (!window.confirm(`Remover o acesso de ${u.email}?`)) return
    try {
      await removerUsuario(u.id)
      setToast('Acesso removido.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover.')
    }
  }

  return (
    <>
      <Header titulo="Usuários da empresa" mostrarVoltar />
      <div className="container">
        <div className="card">
          <div className="secao-titulo" style={{ marginTop: 0 }}>
            Autorizar novo usuário
          </div>
          <div className="form-group">
            <label>
              E-mail (Google) <span className="obrigatorio">*</span>
            </label>
            <input
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value.trim())}
              placeholder="pessoa@gmail.com"
              inputMode="email"
            />
          </div>
          <div className="linha">
            <div className="form-group">
              <label>Nome (opcional)</label>
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Papel</label>
              <select value={novoPapel} onChange={(e) => setNovoPapel(e.target.value as Papel)}>
                <option value="operador">Operador</option>
                <option value="admin_empresa">Administrador</option>
              </select>
            </div>
          </div>
          {erro && <div className="form-erro">{erro}</div>}
          <button className="btn btn-primario btn-bloco" onClick={adicionar} disabled={salvando}>
            {salvando ? 'Autorizando...' : 'Autorizar'}
          </button>
        </div>

        <div className="secao-titulo">Usuários autorizados</div>

        {carregando && <div className="vazio">Carregando...</div>}

        {!carregando &&
          usuarios.map((u) => (
            <div key={u.id} className="lista-item" style={{ cursor: 'default' }}>
              <div className="info">
                <div className="nome">{u.nome ? `${u.nome} · ${u.email}` : u.email}</div>
                <div className="detalhe">
                  {u.papel === 'admin_empresa' ? 'Administrador' : 'Operador'}
                  {u.email === emailAtual ? ' · você' : ''}
                </div>
              </div>
              {u.email !== emailAtual && (
                <button className="btn btn-perigo" onClick={() => remover(u)}>
                  Remover
                </button>
              )}
            </div>
          ))}

        {!carregando && usuarios.length === 0 && (
          <div className="vazio">Nenhum usuário ainda.</div>
        )}
      </div>
      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
    </>
  )
}
