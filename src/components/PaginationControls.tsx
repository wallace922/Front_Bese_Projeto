import { useState } from 'react';
import Button from './Button';
import Input from './Input';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalElements?: number;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  totalElements,
  loading,
  onPrevious,
  onNext,
  onGoToPage,
}: PaginationControlsProps) {
  const [pageInput, setPageInput] = useState('');

  const handleGo = () => {
    const page = parseInt(pageInput, 10) - 1;
    if (!isNaN(page) && page >= 0 && page < totalPages) {
      onGoToPage(page);
      setPageInput('');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-2">
      <span className="text-xs text-stone-500">
        Página {currentPage + 1} de {totalPages}
        {totalElements !== undefined && ` (${totalElements} registros)`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost" size="sm"
          onClick={onPrevious}
          disabled={currentPage === 0 || loading}
        >
          ← Anterior
        </Button>
        <Input
          placeholder="Pág"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGo()}
          className="w-16 text-center text-xs"
        />
        <Button
          variant="ghost" size="sm"
          onClick={handleGo}
          disabled={loading}
        >
          Ir
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={onNext}
          disabled={currentPage >= totalPages - 1 || loading}
        >
          Próxima →
        </Button>
      </div>
    </div>
  );
}