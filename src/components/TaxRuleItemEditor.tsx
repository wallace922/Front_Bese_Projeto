import type { TaxRuleItemDto } from '../types';
import Input from './Input';
import Button from './Button';

interface TaxRuleItemEditorProps {
  items: TaxRuleItemDto[];
  onChange: (items: TaxRuleItemDto[]) => void;
  /** Se true, impede adicionar/remover itens (modo somente-edição de alíquotas) */
  readonly?: boolean;
}

/**
 * Editor dinâmico de itens de uma TaxRule.
 * Permite adicionar, remover e editar taxType + rate de cada item.
 * A lista é completamente dinâmica — sem campos hardcoded.
 */
export default function TaxRuleItemEditor({ items, onChange, readonly = false }: TaxRuleItemEditorProps) {

  function handleTypeChange(idx: number, value: string) {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, taxType: value.toUpperCase() } : item
    );
    onChange(updated);
  }

  function handleRateChange(idx: number, value: string) {
    // Usuário digita em % (ex: 15), armazenamos como decimal (0.15) para a API
    const pct = parseFloat(value);
    const updated = items.map((item, i) =>
      i === idx ? { ...item, rate: isNaN(pct) ? 0 : parseFloat((pct / 100).toFixed(8)) } : item
    );
    onChange(updated);
  }

  function handleAdd() {
    onChange([...items, { taxType: '', rate: 0 }]);
  }

  function handleRemove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      {/* Cabeçalho */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
        <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Tipo</span>
        <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Alíquota (%)</span>
        {!readonly && <span />}
      </div>

      {items.length === 0 && (
        <p className="text-stone-600 text-xs italic px-1">Nenhum imposto adicionado.</p>
      )}

      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Input
            label=""
            placeholder="IR, CSLL, COFINS..."
            value={item.taxType}
            onChange={(e) => handleTypeChange(idx, e.target.value)}
            disabled={readonly}
          />
          <Input
            label=""
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="15.00"
            // Exibe em % (rate decimal → multiplicar × 100)
            value={item.rate === 0 ? '' : String(parseFloat((item.rate * 100).toFixed(6)).toString())}
            onChange={(e) => handleRateChange(idx, e.target.value)}
            disabled={readonly}
          />
          {!readonly && (
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="mb-1 h-9 w-9 flex items-center justify-center rounded-lg border border-red-700/40 text-red-400 hover:bg-red-900/20 transition-colors text-sm"
              title="Remover imposto"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {!readonly && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAdd}
        >
          + Adicionar Imposto
        </Button>
      )}

      {/* Preview das alíquotas */}
      {items.length > 0 && (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 space-y-0.5">
          <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-1">Preview</p>
          {items.map((item, idx) => {
            // rate já está em decimal internamente; converter para % no preview
            const pct = item.rate > 0
              ? parseFloat((item.rate * 100).toFixed(6)).toString() + '%'
              : '—';
            return (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-amber-400 font-mono font-bold w-24">
                  {item.taxType || '—'}
                </span>
                <span className="text-stone-400">{pct}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
