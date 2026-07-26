import { useEffect, useRef } from 'react';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ConfirmSaveModalProps {
  /** Se true, o modal é exibido */
  open: boolean;
  /** Título principal do modal */
  title?: string;
  /** Mensagem de aviso exibida em destaque */
  warning?: string;
  /** Texto complementar abaixo do aviso */
  description?: string;
  /** Texto do botão de confirmação */
  confirmLabel?: string;
  /** Texto do botão de cancelamento */
  cancelLabel?: string;
  /** Chamado quando o usuário confirma */
  onConfirm: () => void;
  /** Chamado quando o usuário cancela ou fecha */
  onCancel: () => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * ConfirmSaveModal
 *
 * Modal de confirmação de salvamento.
 * Pode exibir um aviso customizado, ideal para operações com efeitos colaterais
 * como recálculo de impostos.
 */
export default function ConfirmSaveModal({
  open,
  title = 'Confirmar Salvamento',
  warning,
  description,
  confirmLabel = 'Sim, Salvar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmSaveModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Foca o botão de confirmação ao abrir (acessibilidade)
  useEffect(() => {
    if (open) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [open]);

  // Fecha com Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Fundo escurecido — clique fecha */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Caixa do modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md shadow-2xl p-6 space-y-5 animate-fadeIn">

        {/* Ícone + Título */}
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none mt-0.5">💾</span>
          <div>
            <h2 className="text-gray-100 font-black text-base tracking-wide">{title}</h2>
            <p className="text-stone-500 text-xs mt-0.5">Esta ação não pode ser desfeita diretamente.</p>
          </div>
        </div>

        {/* Aviso em destaque */}
        {warning && (
          <div className="rounded-lg border border-amber-600/50 bg-amber-950/40 px-4 py-3 flex gap-3 items-start">
            <span className="text-amber-400 text-lg mt-0.5 shrink-0">⚠️</span>
            <p className="text-amber-300 text-sm leading-relaxed font-semibold">{warning}</p>
          </div>
        )}

        {/* Descrição adicional */}
        {description && (
          <p className="text-stone-400 text-sm leading-relaxed">{description}</p>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-black text-sm py-2.5 px-4 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-sm py-2.5 px-4 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
