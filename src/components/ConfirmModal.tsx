// ── ConfirmModal ──────────────────────────────────────────────────────────────
// Componente reutilizável de modal de confirmação.
// Usado em Admin.tsx e Dashboard.tsx para confirmar ações destrutivas.

interface ConfirmModalProps {
  /** Mensagem exibida ao usuário antes de confirmar. */
  message: string;
  /** Texto do botão de confirmação. Padrão: "Excluir". */
  confirmLabel?: string;
  /** Indica se a operação assíncrona está em andamento (desabilita botões). */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  message,
  confirmLabel = 'Excluir',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-red-500/20 bg-black/90 shadow-2xl p-6 flex flex-col gap-5">
        {/* Ícone + Mensagem */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="text-gray-200 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-white/10 text-stone-400 text-xs font-bold uppercase tracking-widest hover:border-white/30 disabled:opacity-40 transition-colors"
          >
            Cancelar
          </button>
          <button
            id="confirm-modal-action-btn"
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
