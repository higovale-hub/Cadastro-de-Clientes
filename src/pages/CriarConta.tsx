import { useState } from 'react'
import { criarEmpresaComRecarga, PACOTES, type PacoteCredito } from '../aws/empresas'
import { formatBRL } from '../domain/money'
import { mascararDocumento, rotuloTipoDocumento } from '../domain/mascaras'
import { validarDocumento } from '../domain/validacoes'
import { useAuth } from '../aws/auth'

// Criação de empresa pelo usuário já autenticado (Opção C).
// O usuário logou com Google mas ainda não pertence a nenhuma empresa
// (situacao 'sem_empresa'); aqui ele cria a sua. Como está autenticado, a
// escrita na nuvem é permitida. O e-mail do admin é o do login (travado).
export function CriarConta() {
  const { email, reavaliar, sair } = useAuth()
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [documento, setDocumento] = useState('')
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [pacoteId, setPacoteId] = useState<string>(PACOTES[0].id)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const pacote: PacoteCredito = PACOTES.find((p) => p.id === pacoteId) ?? PACOTES[0]

  function validar(): string | null {
    if (!nomeEmpresa.trim()) return 'Informe o nome da empresa.'
    if (!email) return 'Sessão inválida. Faça login novamente.'
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
        emailAdmin: email!, // e-mail do usuário logado
        nomeAdmin,
        pacote,
      })
      // Reavalia o acesso: agora o e-mail pertence a uma empresa, então o
      // usuário passa a 'autorizado' e entra no app.
      await reavaliar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar conta.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <h1>Criar conta da empresa</h1>
        <button className="voltar" onClick={() => void sair()} aria-label="Sair">
          Sair
        </button>
      </header>
      <div className="container">
        <div className="card" style={{ borderColor: 'var(--azul)' }}>
          👋 Bem-vindo! Seu login foi <strong>{email}</strong>. Para começar, cadastre sua
          empresa e escolha um pacote de créditos.
        </div>

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
            <label>E-mail do administrador</label>
            <input value={email ?? ''} disabled style={{ background: 'var(--cinza-bg)' }} />
            <div className="prevstandalone">É o e-mail com que você fez login.</div>
          </div>

          <div className="form-group">
            <label>Seu nome (opcional)</label>
            <input value={nomeAdmin} onChange={(e) => setNomeAdmin(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="secao-titulo" style={{ marginTop: 0 }}>
            Escolha um pacote de créditos
          </div>
          <div className="prevstandalone" style={{ marginBottom: 10 }}>
            Cada cliente cadastrado consome 1 crédito. Os créditos não expiram.
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

        <button
          className="btn btn-primario btn-bloco"
          onClick={criar}
          disabled={salvando}
        >
          {salvando ? 'Criando...' : `Criar conta e comprar ${pacote.creditos} créditos`}
        </button>
      </div>
    </>
  )
}
