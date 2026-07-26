
import { useState } from 'react';
import type { PaymentNoteDto } from '../types';
import { formatCNPJ, formatCurrency, formatDate } from '../lib/utils';
import EditIconButton from './EditIconButton';
import TaxItemsDisplay from './TaxItemsDisplay';

interface SearchResultTableProps {
  data: PaymentNoteDto[];
  onEdit: (np: PaymentNoteDto) => void;
}

export default function SearchResultTable({ data, onEdit }: SearchResultTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  function toggleExpand(index: number) {
    setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-stone-500 text-xs uppercase border-b border-white/10">
          <th className="py-2 pr-3">Nº NP</th>
          <th className="py-2 pr-3">Data Liq.</th>
          <th className="py-2 pr-3">Empresa</th>
          <th className="py-2 pr-3">Doc. Origem</th>
          <th className="py-2 pr-3 text-right">Valor</th>
          <th className="py-2 pr-3">Status</th>
          <th className="py-2 pr-3 w-16 text-center">Ações</th>
        </tr>
      </thead>
      <tbody>
        {data.map((np, i) => {
          const isExpanded = expandedRows[i] ?? false;
          // Agrega os items para exibição de tributação
          const firstItemTax = np.items?.[0]?.tax ?? null;
          const totalValue = np.value ?? np.items?.reduce((s, it) => s + it.value, 0) ?? 0;
          return (
            <>
              <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/30 align-top">
                <td className="py-2 pr-3 text-amber-300 font-mono">{np.numeroNp}</td>
                <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">{formatDate(np.dataLiquidacao)}</td>
                <td className="py-2 pr-3 text-gray-300">
                  <span className="block truncate max-w-[180px]" title={np.empresa?.nome}>{np.empresa?.nome || '—'}</span>
                  <span className="text-[10px] text-stone-500 font-mono">{np.empresa?.cnpj ? formatCNPJ(np.empresa.cnpj) : '—'}</span>
                </td>
                <td className="py-2 pr-3 text-stone-500">{np.docOrigin}</td>
                <td className="py-2 pr-3 text-amber-300 text-right">{formatCurrency(totalValue)}</td>
                <td className="py-2 pr-3 text-stone-500">{np.status}</td>
                <td className="py-2 pr-3 w-16">
                  <div className="flex items-center gap-1">
                    {(np.items?.length ?? 0) > 0 && (
                      <button
                        onClick={() => toggleExpand(i)}
                        className={`px-1.5 py-1 rounded text-[10px] font-bold transition-colors ${isExpanded ? 'text-amber-400 bg-amber-500/20' : 'text-stone-500 hover:text-stone-300'}`}
                        title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    )}
                    <EditIconButton onClick={() => onEdit(np)} />
                  </div>
                </td>
              </tr>
              {isExpanded && (
                <tr key={`detail-${i}`} className="bg-stone-900/40 border-b border-stone-700">
                  <td colSpan={7} className="px-3 py-3">
                    <div className="space-y-3">
                      {(np.items ?? []).map((item, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-white/5 pb-2 last:border-0">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                              <span className="text-amber-500 mr-1">■</span>
                              Item {idx + 1}{item.description ? ` — ${item.description}` : ''}
                            </p>
                            <span className="text-amber-300 font-mono text-sm">{formatCurrency(item.value)}</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Tributação</p>
                            {!item.tax ? (
                              <span className="text-stone-600 text-xs">Sem tributação</span>
                            ) : item.tax.tipo === 'OPTANTE' ? (
                              <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-700 uppercase tracking-wider">Optante</span>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-xs text-stone-400">
                                  Cód. EFD: <span className="text-amber-300 font-mono">{item.tax.codEfd}</span>
                                </div>
                                {item.tax.calculatedItems && item.tax.calculatedItems.length > 0 ? (
                                  <TaxItemsDisplay items={item.tax.calculatedItems} taxStatus={item.tax.taxStatus} compact />
                                ) : (
                                  <span className="text-stone-600 text-xs">Aguardando cálculo</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Fallback para NP sem items (dados antigos) */}
                      {(!np.items || np.items.length === 0) && firstItemTax && (
                        <span className="text-stone-600 text-xs">Sem itens detalhados.</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </tbody>
    </table>
  );
}
