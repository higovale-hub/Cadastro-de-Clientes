import { useState } from 'react'
import { mascararTelefone, mascararDocumento, rotuloTipoDocumento } from '../domain/mascaras'
import { validarDocumento, validarEmail } from '../domain/validacoes'
import type { DadosCliente } from '../db/repo'

interface FormularioClienteProps {
  // Valores iniciais (edição). Se ausente, começa vazio (cadastro).
  inicial?: Partial<DadosCliente>
  // Rótulo do botão de confirmação.
  textoBotao: string
  // Chamado com os dados válidos ao confirmar.
  onSubmit: (dados: DadosCliente) => Promise<void> | void
  salvando?: boolean
}

// Formulário compartilhado entre cadastro e edição de cliente.
// Aplica máscaras de telefone e documento e valida os campos obrigatórios.
export function FormularioCliente({
  inicial,
  textoBotao,
  onSubmit,
  salvando,
}: FormularioClienteProps) {
  const [nomeCompleto, setNomeCompleto] = useState(inicial?.nomeCompleto ?? '')
  const [telefone, setTelefone] = useState(mascararTelefone(inicial?.telefone ?? ''))
  const [documento, setDocumento] = useState(mascararDocumento(inicial?.documento ?? ''))
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [endereco, setEndereco] = useState(inicial?.endereco ?? '')
  const [erros, setErros] = useState<{
    nome?: string
    telefone?: string
    documento?: string
    email?: string
  }>({})

  function validar(): boolean {
    const novos: { nome?: string; telefone?: string; documento?: string; email?: string } = {}
    if (!nomeCompleto.trim()) novos.nome = 'Informe o nome completo.'
    if (!telefone.trim()) novos.telefone = 'Informe o telefone.'
    // Documento e e-mail são opcionais: só valida se preenchidos.
    if (documento.trim() && !validarDocumento(documento)) {
      novos.documento = 'Documento inválido. Verifique o CPF ou CNPJ.'
    }
    if (email.trim() && !validarEmail(email)) {
      novos.email = 'E-mail inválido.'
    }
    setErros(novos)
    return Object.keys(novos).length === 0
  }

  // Valida o documento ao sair do campo (blur), mostrando o erro na hora.
  function validarDocumentoCampo() {
    setErros((prev) => ({
      ...prev,
      documento:
        documento.trim() && !validarDocumento(documento)
          ? 'Documento inválido. Verifique o CPF ou CNPJ.'
          : undefined,
    }))
  }

  // Valida o e-mail ao sair do campo (blur).
  function validarEmailCampo() {
    setErros((prev) => ({
      ...prev,
      email: email.trim() && !validarEmail(email) ? 'E-mail inválido.' : undefined,
    }))
  }

  async function confirmar() {
    if (!validar()) return
    await onSubmit({ nomeCompleto, telefone, documento, email, endereco })
  }

  return (
    <>
      <div className="card">
        <div className="form-group">
          <label>
            Nome completo <span className="obrigatorio">*</span>
          </label>
          <input
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            placeholder="Ex.: Maria Silva"
            autoFocus
          />
          {erros.nome && <div className="form-erro">{erros.nome}</div>}
        </div>

        <div className="form-group">
          <label>
            Telefone <span className="obrigatorio">*</span>
          </label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
            placeholder="Ex.: (11) 90000-0000"
            inputMode="tel"
          />
          {erros.telefone && <div className="form-erro">{erros.telefone}</div>}
        </div>

        <div className="form-group">
          <label>
            Documento
            {rotuloTipoDocumento(documento) && (
              <span className="badge badge-quitada" style={{ marginLeft: 8 }}>
                {rotuloTipoDocumento(documento)}
              </span>
            )}
          </label>
          <input
            value={documento}
            onChange={(e) => {
              setDocumento(mascararDocumento(e.target.value))
              if (erros.documento) setErros((prev) => ({ ...prev, documento: undefined }))
            }}
            onBlur={validarDocumentoCampo}
            placeholder="CPF ou CNPJ"
            inputMode="numeric"
          />
          {erros.documento && <div className="form-erro">{erros.documento}</div>}
        </div>

        <div className="form-group">
          <label>E-mail</label>
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value.trim())
              if (erros.email) setErros((prev) => ({ ...prev, email: undefined }))
            }}
            onBlur={validarEmailCampo}
            placeholder="email@exemplo.com"
            inputMode="email"
          />
          {erros.email && <div className="form-erro">{erros.email}</div>}
        </div>

        <div className="form-group">
          <label>Endereço</label>
          <textarea
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua, número, bairro, cidade"
            rows={2}
          />
        </div>
      </div>

      <button className="btn btn-primario btn-bloco" onClick={confirmar} disabled={salvando}>
        {salvando ? 'Salvando...' : textoBotao}
      </button>
    </>
  )
}
