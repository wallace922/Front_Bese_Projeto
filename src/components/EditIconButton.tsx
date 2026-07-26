
interface EditIconButtonProps {
  onClick: () => void;
  title?: string;
}

export default function EditIconButton({ onClick, title }: EditIconButtonProps) {
  return (
    <button
      aria-label={title ?? 'Editar'}
      title={title}
      className="text-amber-500/50 hover:text-amber-400 transition-colors p-1 rounded hover:bg-amber-500/10"
      onClick={onClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
    </button>
  );
}
