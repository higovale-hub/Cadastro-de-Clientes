interface ModalConfirmacaoProps {
  mensagem: string
  textoConfirmar?: string
  textoCancelar?: string
  onConfirmar: () => void
  onCancelar: () => void
}

// Modal simples de confirmação (overlay + caixa central).
// Usado, por exemplo, para avisar que o usuário será redirecionado para
// aplicativos de terceiros no celular.
export function ModalConfirmacao({
  mensagem,
  textoConfirmar = 'Continuar',
  textoCancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
}: ModalConfirmacaoProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancelar}>
      <div className="modal-caixa" onClick={(e) => e.stopPropagation()}>
        <p className="modal-mensagem">{mensagem}</p>
        <div className="botoes">
          <button className="btn btn-secundario btn-bloco" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button className="btn btn-primario btn-bloco" onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
