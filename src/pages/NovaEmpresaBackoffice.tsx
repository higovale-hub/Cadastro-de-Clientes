import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { useAuth } from '../aws/auth'
import { criarEmpresaComRecarga, PACOTES, type PacoteCredito } from '../aws/empresas'
import { formatBRL } from '../domain/money'
import { mascararDocumento, rotuloTipoDocumento } from '../domain/mascaras'
import { validarDocumento, validarEmail } from '../domain/validacoes'

// Opção A: o super-admin cria uma empresa pelo backoffice. Diferente da
// Opção C, aqui o super-admin informa o e-mail do administrador da empresa
// (que depois loga com esse Gmail para acessar).
export function NovaEmpresaBackoffice() {
  const { situacao } = useAuth()
  const navigate = useNavigate()
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [documento, setDocumento] = useState('')
  const [emailAdmin, setEmailAdmin] = useState('')
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [pacoteId, setPacoteId] = useState<string>(PACOTES[0].id)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  if (situacao !== 'super_admin') {
    return <Navigate to="/" replace />
  }

  const pacote: PacoteCredito = PACOTES.find((p) => p.id === pacoteId) ?? PACOTES[0]

  function validar(): string | null {
    if (!nomeEmpresa.trim()) return 'Informe o nome da empresa.'
    if (!emailAdmin.trim() || !validarEmail(emailAdmin)) return 'Informe um e-mail válido.'
    if (documento.trim() && !validarDocumento(documento)) return 'Documento inválido.'
    return null
  }

  async function criar() {
    const msg = validar()
    if (msg) {
      setErro(msg)
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await criarEmpresaComRecarga({
        nomeEmpresa,
        documento,
        emailAdmin,
        nomeAdmin,
        pacote,
      })
      navigate('/backoffice', { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar empresa.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Header titulo="Criar empresa" mostrarVoltar />
      <div className="container">
        <div className="card">
          <div className="form-group">
            <label>
              Nome da empresa <span className="obrigatorio">*</span>
            </label>
            <input
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              placeholder="Ex.: Loja do João"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>
              Documento (CPF/CNPJ)
              {rotuloTipoDocumento(documento) && (
                <span className="badge badge-quitada" style={{ marginLeft: 8 }}>
                  {rotuloTipoDocumento(documento)}
                </span>
              )}
            </label>
            <input
              value={documento}
              onChange={(e) => setDocumento(mascararDocumento(e.target.value))}
              placeholder="CPF ou CNPJ"
              inputMode="numeric"
            />
          </div>

          <div className="form-group">
            <label>
              E-mail do administrador (Google) <span className="obrigatorio">*</span>
            </label>
            <input
              value={emailAdmin}
              onChange={(e) => setEmailAdmin(e.target.value.trim())}
              placeholder="admin@empresa.com"
              inputMode="email"
            />
            <div className="prevstandalone">
              Esta pessoa fará login com este Gmail e será o administrador da empresa.
            </div>
          </div>

          <div className="form-group">
            <label>Nome do administrador (opcional)</label>
            <input value={nomeAdmin} onChange={(e) => setNomeAdmin(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="secao-titulo" style={{ marginTop: 0 }}>
            Créditos iniciais
          </div>
          {PACOTES.map((p) => (
            <label
              key={p.id}
              className="parcela-linha"
              style={{ cursor: 'pointer', alignItems: 'center' }}
            >
              <input
                type="radio"
                name="pacote"
                checked={pacoteId === p.id}
                onChange={() => setPacoteId(p.id)}
                style={{ width: 'auto', marginRight: 8 }}
              />
              <span className="p-info">
                <strong>{p.nome}</strong>
                <div className="p-venc">
                  {p.creditos} créditos · {formatBRL(p.precoReais / p.creditos)}/crédito
                </div>
              </span>
              <strong>{formatBRL(p.precoReais)}</strong>
            </label>
          ))}
        </div>

        {erro && <div className="form-erro" style={{ marginBottom: 10 }}>{erro}</div>}

        <button className="btn btn-primario btn-bloco" onClick={criar} disabled={salvando}>
          {salvando ? 'Criando...' : `Criar empresa com ${pacote.creditos} créditos`}
        </button>
      </div>
    </>
  )
}
