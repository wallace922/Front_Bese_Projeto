import type { EmpresaDto, TaxCalculatedItem, TaxStatus } from '../types';
import { formatCurrency } from '../lib/utils';

// ── Badge de status do imposto ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaxStatus, { label: string; className: string }> = {
  CALCULATED: { label: 'Calculado', className: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50' },
  PENDING:    { label: 'Pendente',  className: 'text-amber-400 bg-amber-900/30 border-amber-700/50' },
  EXEMPT:     { label: 'Isento',   className: 'text-stone-400 bg-stone-900/30 border-stone-700/50' },
};

function TaxStatusBadge({ status }: { status: TaxStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs uppercase tracking-wider font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface TaxItemsDisplayProps {
  items: TaxCalculatedItem[];
  taxStatus?: TaxStatus;
  /** Empresa beneficiária do imposto retido neste item. Se informado, é exibido em destaque. */
  empresaBeneficiaria?: EmpresaDto | null;
  /** Se true, renderiza em modo compacto (sem título) */
  compact?: boolean;
}

/**
 * Exibe a lista dinâmica de impostos calculados retornada pelo backend.
 * Layout em grid com colunas de largura fixa para alinhamento consistente
 * independente da quantidade ou tamanho dos nomes dos impostos.
 * Quando empresaBeneficiaria é fornecido, exibe o nome/CNPJ do beneficiário
 * para deixar claro qual empresa está sendo tributada em cada item.
 */
export default function TaxItemsDisplay({ items, taxStatus, empresaBeneficiaria, compact = false }: TaxItemsDisplayProps) {
  if (!items || items.length === 0) {
    return (
      <span className="text-stone-600 text-sm italic">Sem impostos calculados</span>
    );
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-1">
      {!compact && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-widest text-stone-500 font-bold">
            Impostos
          </span>
          {taxStatus && <TaxStatusBadge status={taxStatus} />}
        </div>
      )}

      {/* Beneficiário do imposto — exibido quando diferente do CNPJ da NP */}
      {empresaBeneficiaria && (
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs text-stone-500">Beneficiário:</span>
          <span className="text-xs font-semibold text-sky-400">
            {empresaBeneficiaria.nome}
          </span>
          <span className="text-xs text-stone-600 font-mono">
            {empresaBeneficiaria.cnpj}
          </span>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden">
        {/* Cabeçalho fixo das colunas */}
        <div className="grid grid-cols-[6rem_5rem_1fr] gap-0 border-b border-white/10 px-3 py-1.5 bg-black/20">
          <span className="text-xs uppercase tracking-widest text-stone-600 font-bold">Tipo</span>
          <span className="text-xs uppercase tracking-widest text-stone-600 font-bold text-right">Alíq.</span>
          <span className="text-xs uppercase tracking-widest text-stone-600 font-bold text-right">Valor</span>
        </div>

        {/* Linhas de cada imposto */}
        {items.map((item, idx) => {
          const pct = (item.rate * 100).toFixed(4).replace(/\.?0+$/, '') + '%';
          return (
            <div
              key={idx}
              className="grid grid-cols-[6rem_5rem_1fr] gap-0 px-3 py-1.5 border-b border-white/5 last:border-0"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">
                {item.taxType}
              </span>
              <span className="text-xs text-stone-400 text-right font-mono">{pct}</span>
              <span className="text-sm text-gray-200 font-mono font-bold text-right">
                {formatCurrency(item.amount)}
              </span>
            </div>
          );
        })}

        {/* Linha de total */}
        <div className="grid grid-cols-[6rem_5rem_1fr] gap-0 px-3 py-2 border-t border-white/10 bg-black/20">
          <span className="col-span-2 text-xs uppercase tracking-widest text-stone-500 font-bold">Total Retido</span>
          <span className="text-sm text-amber-400 font-bold font-mono text-right">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

