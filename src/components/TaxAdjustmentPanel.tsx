import { useEffect, useRef, useState } from 'react';
import type { TaxCalculatedItem } from '../types';
import { formatCurrency } from '../lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function hasDivergence(items: TaxCalculatedItem[]): boolean {
  if (!items || items.length === 0) return false;
  const sumOfParts = round2(
    items.filter(i => i.taxType !== 'DARF').reduce((s, i) => s + round2(i.amount), 0)
  );
  const darfItem = items.find(i => i.taxType === 'DARF');
  if (!darfItem) return false;
  return Math.abs(round2(darfItem.amount) - sumOfParts) >= 0.005;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TaxAdjustmentPanelProps {
  /**
   * Lista ORIGINAL de impostos (calculada pelo backend).
   * Nunca passe de volta os itens editados aqui — isso causa loop.
   */
  items: TaxCalculatedItem[];
  /** Chamado APENAS quando o usuário altera algo (não no mount). */
  onChange: (items: TaxCalculatedItem[], manualAdjustment: boolean) => void;
  compact?: boolean;
}

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * TaxAdjustmentPanel
 *
 * Gerencia seu próprio estado de edição internamente.
 * O prop `items` serve apenas para inicialização e para o botão "Restaurar".
 * Nunca sincroniza de volta items derivados dos próprios callbacks.
 */
export default function TaxAdjustmentPanel({ items, onChange, compact = false }: TaxAdjustmentPanelProps) {
  const [manualMode, setManualMode] = useState(false);
  // Estado interno de edição — nunca sincroniza de volta do pai
  const [editedItems, setEditedItems] = useState<TaxCalculatedItem[]>(() =>
    items.map(i => ({ ...i }))
  );

  // Ref para detectar mudança REAL do prop items (vinda do backend),
  // sem criar loop quando o pai atualiza manualItems a partir do onChange.
  const prevItemsRef = useRef<string>('');

  useEffect(() => {
    const key = JSON.stringify(items);
    if (key === prevItemsRef.current) return; // mesmos dados → ignora
    prevItemsRef.current = key;

    // Só inicializa/reinicia quando os itens do backend mudam de verdade
    // e o usuário não está no meio de uma edição manual.
    setEditedItems(items.map(i => ({ ...i })));
    setManualMode(false);

    // Se já há divergência nos dados do backend, ativa modo manual automaticamente
    if (hasDivergence(items)) {
      setManualMode(true);
      // Notifica pai que divergência foi detectada (modo manual ativo)
      onChange(items.map(i => ({ ...i })), true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (!items || items.length === 0) return null;

  // ── Derivados ──────────────────────────────────────────────────────────────

  const partItems  = editedItems.filter(i => i.taxType !== 'DARF');
  const darfItem   = editedItems.find(i => i.taxType === 'DARF');
  const sumOfParts = round2(partItems.reduce((s, i) => s + round2(i.amount), 0));
  const darfTotal  = darfItem ? round2(darfItem.amount) : 0;
  const remaining  = round2(darfTotal - sumOfParts);
  const isBalanced = Math.abs(remaining) < 0.005;
  const divergence = hasDivergence(editedItems);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleAmountChange(idx: number, raw: string) {
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed < 0) return;
    const next = editedItems.map((item, i) => i === idx ? { ...item, amount: parsed } : item);
    setEditedItems(next);
    // Chama onChange diretamente — sem useEffect — para evitar loop
    onChange(next, true);
  }

  function enableManual() {
    setManualMode(true);
    onChange(editedItems, true);
  }

  function disableManual() {
    const restored = items.map(i => ({ ...i }));
    setEditedItems(restored);
    setManualMode(false);
    onChange(restored, false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-stone-500 font-bold">
            Impostos calculados
          </span>
          {!manualMode ? (
            <button
              type="button"
              onClick={enableManual}
              className="text-[10px] uppercase tracking-widest text-amber-500 hover:text-amber-300 transition-colors font-bold border border-amber-500/30 hover:border-amber-400/60 px-2 py-0.5 rounded"
            >
              ✏️ Ajuste Manual
            </button>
          ) : (
            <button
              type="button"
              onClick={disableManual}
              className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-gray-200 transition-colors font-bold border border-white/10 px-2 py-0.5 rounded"
            >
              ↩ Restaurar Automático
            </button>
          )}
        </div>
      )}

      {/* Aviso de divergência detectada */}
      {divergence && manualMode && (
        <div className="rounded-lg border border-amber-600/50 bg-amber-950/40 px-4 py-3 flex gap-3 items-start">
          <span className="text-amber-400 text-base mt-0.5 shrink-0">⚠️</span>
          <div className="space-y-1">
            <p className="text-amber-300 font-bold text-xs">Divergência de arredondamento detectada</p>
            <p className="text-stone-400 text-xs leading-relaxed">
              A soma das partes{' '}
              <span className="text-gray-200 font-mono">{formatCurrency(sumOfParts)}</span>
              {' '}difere do total DARF{' '}
              <span className="text-gray-200 font-mono">{formatCurrency(darfTotal)}</span>.
              {' '}Ajuste os valores para que a soma corresponda ao total.
            </p>
          </div>
        </div>
      )}

      {/* Tabela de impostos */}
      <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden">
        {/* Cabeçalho das colunas */}
        <div className={`grid gap-0 border-b border-white/10 px-3 py-1.5 bg-black/20 ${manualMode ? 'grid-cols-[6rem_5rem_1fr_1fr]' : 'grid-cols-[6rem_5rem_1fr]'}`}>
          <span className="text-xs uppercase tracking-widest text-stone-600 font-bold">Tipo</span>
          <span className="text-xs uppercase tracking-widest text-stone-600 font-bold text-right">Alíq.</span>
          <span className="text-xs uppercase tracking-widest text-stone-600 font-bold text-right">
            {manualMode ? 'Original' : 'Valor'}
          </span>
          {manualMode && (
            <span className="text-xs uppercase tracking-widest text-amber-600 font-bold text-right">Ajustado</span>
          )}
        </div>

        {/* Linhas */}
        {editedItems.map((item, idx) => {
          const pct = (item.rate * 100).toFixed(4).replace(/\.?0+$/, '') + '%';
          const originalAmount = items[idx]?.amount ?? item.amount;
          const isDarf = item.taxType === 'DARF';

          return (
            <div
              key={idx}
              className={`grid gap-0 px-3 py-1.5 border-b border-white/5 last:border-0 items-center ${manualMode ? 'grid-cols-[6rem_5rem_1fr_1fr]' : 'grid-cols-[6rem_5rem_1fr]'} ${isDarf ? 'bg-black/20' : ''}`}
            >
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">
                {item.taxType}
              </span>
              <span className="text-xs text-stone-400 text-right font-mono">{pct}</span>
              <span className="text-sm text-gray-400 font-mono text-right">
                {formatCurrency(originalAmount)}
              </span>
              {manualMode && (
                <div className="flex justify-end">
                  {isDarf ? (
                    <span className="text-sm text-amber-400 font-bold font-mono text-right">
                      {formatCurrency(item.amount)}
                    </span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      // Usando defaultValue + key para evitar que React re-renderize
                      // o input enquanto o usuário está digitando (causa vibração)
                      key={`${idx}-${items[idx]?.amount}`}
                      defaultValue={item.amount}
                      onBlur={e => handleAmountChange(idx, e.target.value)}
                      onChange={e => handleAmountChange(idx, e.target.value)}
                      className="w-28 bg-black/60 border border-amber-500/40 focus:border-amber-400 text-amber-200 font-mono text-sm rounded px-2 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Rodapé */}
        {manualMode ? (
          <div className="grid grid-cols-[6rem_5rem_1fr_1fr] gap-0 px-3 py-2 border-t border-white/10 bg-black/20">
            <span className="col-span-2 text-xs uppercase tracking-widest text-stone-500 font-bold">
              Soma das Partes
            </span>
            <span />
            <div className="flex flex-col items-end">
              <span className={`text-sm font-bold font-mono ${isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(sumOfParts)}
              </span>
              {!isBalanced && (
                <span className="text-[10px] text-red-400 font-mono">
                  {remaining > 0 ? '+' : ''}{formatCurrency(Math.abs(remaining))} a corrigir
                </span>
              )}
              {isBalanced && (
                <span className="text-[10px] text-emerald-500">✔ Balanceado</span>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[6rem_5rem_1fr] gap-0 px-3 py-2 border-t border-white/10 bg-black/20">
            <span className="col-span-2 text-xs uppercase tracking-widest text-stone-500 font-bold">Total Retido</span>
            <span className="text-sm text-amber-400 font-bold font-mono text-right">
              {formatCurrency(editedItems.reduce((s, i) => s + i.amount, 0))}
            </span>
          </div>
        )}
      </div>

      {/* Badge de modo ativo */}
      {manualMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-600/50 bg-amber-950/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
            🔧 Modo Ajuste Manual Ativo
          </span>
          {isBalanced && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-700/50 bg-emerald-950/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              ✔ Pronto para salvar
            </span>
          )}
        </div>
      )}
    </div>
  );
}
