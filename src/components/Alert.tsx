

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant: AlertVariant;
  message: string;
  onClose?: () => void;
}

const styles: Record<AlertVariant, { wrap: string; icon: string }> = {
  error: {
    wrap: 'bg-red-900/50 border border-red-700 text-red-300',
    icon: '✕',
  },
  success: {
    wrap: 'bg-emerald-900/50 border border-emerald-700 text-emerald-300',
    icon: '✔',
  },
  warning: {
    wrap: 'bg-amber-900/50 border border-amber-700 text-amber-300',
    icon: '⚠',
  },
  info: {
    wrap: 'bg-sky-900/50 border border-sky-700 text-sky-300',
    icon: 'ℹ',
  },
};

export default function Alert({ variant, message, onClose }: AlertProps) {
  const s = styles[variant];
  return (
    <div
      className={`flex items-start gap-3 rounded-md px-4 py-3 text-sm font-mono animate-fadeIn ${s.wrap}`}
      role="alert"
    >
      <span className="mt-0.5 shrink-0 font-bold">{s.icon}</span>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-xs font-bold ml-2"
          aria-label="Fechar"
        >
          ✕
        </button>
      )}
    </div>
  );
}
