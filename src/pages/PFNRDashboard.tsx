import React, { useState, useEffect } from 'react';
import PageShell from '../components/PageShell';
import Button from '../components/Button';
import Input from '../components/Input';
import Alert from '../components/Alert';
import {
  getPaymentEmpenhoSemPlanejamento,
  updatePaymentEmpenho,
  findNpByNumeroEAno,
  findEmpenhoByNumeroEAno,
  findFinancialPlanningByNumber,
} from '../services/api';
import type { PaymentNoteDto, EmpenhoDto } from '../types';
import { formatCurrency, formatCNPJ, formatDate } from '../lib/utils';

const PAGE_SIZE = 20;

// ── Tipo interno normalizado ───────────────────────────────────────────────────
// Independente do nome dos campos retornados pelo backend
// (paymentNote vs paymentNoteBasicDto / empenho vs empenhoDto)

interface NormalizedRow {
  id: number;
  value: number;
  paymentNote: PaymentNoteDto;
  empenho: EmpenhoDto;
}

// Aceita qualquer forma que a API retorne
function normalizeRow(raw: any): NormalizedRow | null {
  try {
    const paymentNote: PaymentNoteDto =
      raw.paymentNote ?? raw.paymentNoteBasicDto ?? null;
    const empenho: EmpenhoDto =
      raw.empenho ?? raw.empenhoDto ?? null;

    if (!paymentNote || !empenho) return null;

    return {
      id: raw.id,
      value: raw.value ?? 0,
      paymentNote,
      empenho,
    };
  } catch {
    return null;
  }
}

// ── Helpers visuais ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    CANCELADA: 'bg-red-900/60 text-red-300 border border-red-700',
    PAGA:      'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
    A_PAGAR:   'bg-amber-900/60 text-amber-300 border border-amber-600',
  };
  const label: Record<string, string> = {
    CANCELADA: 'Cancelada', PAGA: 'Paga', A_PAGAR: 'A Pagar',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${map[status] ?? 'bg-stone-700 text-stone-300 border border-stone-600'}`}>
      {label[status] ?? status}
    </span>
  );
}

function extractYear(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) { const p = dateStr.split('/'); return p.length === 3 ? p[2] : ''; }
  if (dateStr.includes('-')) { const p = dateStr.split('-'); return p.length >= 1 ? p[0] : ''; }
  return '';
}

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface RowEdit { numeroFP: string; anoFP: string; }

// ── Componente ────────────────────────────────────────────────────────────────

export default function PFNRDashboard() {
  const [rows, setRows]               = useState<NormalizedRow[]>([]);
  const [loading, setLoading]         = useState(false);
  const [listError, setListError]     = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageInput, setPageInput]     = useState('');

  const [editMap, setEditMap]     = useState<Record<number, RowEdit>>({});
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [errMap, setErrMap]       = useState<Record<number, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Carregamento ──────────────────────────────────────────────────────────

  async function loadPage(page = 0) {
    setLoading(true);
    setListError(null);
    try {
      const res = await getPaymentEmpenhoSemPlanejamento(page, PAGE_SIZE);
      if (res.data) {
        const d = res.data as any;
        const rawContent: any[] = d.content ?? [];
        const normalized = rawContent.map(normalizeRow).filter(Boolean) as NormalizedRow[];
        setRows(normalized);
        // Backend pode usar "page" ou "pageNumber"
        setCurrentPage(d.page ?? d.pageNumber ?? 0);
        setTotalPages(d.totalPages ?? 0);
        setTotalElements(d.totalElements ?? rawContent.length);
      } else {
        setListError(res.errorMessage ?? 'Erro ao carregar registros.');
      }
    } catch (e) {
      setListError('Erro inesperado ao carregar. Verifique o console.');
      console.error('[PFNRDashboard] loadPage error:', e);
    }
    setLoading(false);
  }

  useEffect(() => { loadPage(0); }, []);

  function handleGoToPage() {
    const page = parseInt(pageInput, 10) - 1;
    if (!isNaN(page) && page >= 0 && page < totalPages) {
      loadPage(page);
      setPageInput('');
    }
  }

  // ── Edição inline ──────────────────────────────────────────────────────────

  function startEdit(id: number) {
    setErrMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    setEditMap(prev => ({ ...prev, [id]: { numeroFP: '', anoFP: '' } }));
  }

  function cancelEdit(id: number) {
    setEditMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    setErrMap(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function updateField(id: number, field: keyof RowEdit, value: string) {
    setEditMap(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function confirmEdit(row: NormalizedRow) {
    const id = row.id;
    const edit = editMap[id];
    if (!edit) return;

    const fpNum = edit.numeroFP ? parseInt(edit.numeroFP, 10) : null;
    const fpAno = edit.anoFP    ? parseInt(edit.anoFP, 10)    : null;

    if (!fpNum) { setErrMap(prev => ({ ...prev, [id]: 'Informe o Nº do PF a associar.' })); return; }
    if (!fpAno) { setErrMap(prev => ({ ...prev, [id]: 'Informe o Ano do PF.' })); return; }

    setSavingMap(prev => ({ ...prev, [id]: true }));

    const npYear = parseInt(extractYear(row.paymentNote.dataLiquidacao) || '0', 10);

    const [npRes, empRes, fpRes] = await Promise.all([
      findNpByNumeroEAno(row.paymentNote.numeroNp, npYear || new Date().getFullYear()),
      findEmpenhoByNumeroEAno(row.empenho.numero, row.empenho.ano),
      findFinancialPlanningByNumber(fpNum, fpAno),
    ]);

    const erros: string[] = [];
    if (!npRes.data)  erros.push(`NP nº ${row.paymentNote.numeroNp}`);
    if (!empRes.data) erros.push(`Empenho nº ${row.empenho.numero}/${row.empenho.ano}`);
    if (!fpRes.data)  erros.push(`PF nº ${fpNum}/${fpAno}`);

    if (erros.length > 0) {
      setErrMap(prev => ({ ...prev, [id]: `Não encontrado(s): ${erros.join(', ')}` }));
      setSavingMap(prev => ({ ...prev, [id]: false }));
      return;
    }

    const updateRes = await updatePaymentEmpenho(id, {
      paymentNote: {
        numeroNp: npRes.data!.numeroNp,
        dataLiquidacao: npRes.data!.dataLiquidacao,
      },
      empenho: {
        numero: empRes.data!.numero,
        ano: empRes.data!.ano,
      },
      financialPlanning: {
        numero: fpRes.data!.numero,
        data: fpRes.data!.data,
      },
      value: row.value,
    });
    if (updateRes.data) {
      cancelEdit(id);
      setSuccessMsg(`Vínculo #${id} associado ao PF nº ${fpNum}/${fpAno} com sucesso!`);
      await loadPage(currentPage);
    } else {
      setErrMap(prev => ({ ...prev, [id]: updateRes.errorMessage ?? 'Erro ao atualizar.' }));
    }
    setSavingMap(prev => ({ ...prev, [id]: false }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      {/* Cabeçalho */}
      <div className="mx-3 sm:mx-6 mt-6 p-4 sm:p-5 glass-panel">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-amber-400 font-black uppercase tracking-widest text-sm">
              🔗 Vínculos Sem Planejamento Financeiro (PFNR)
            </h2>
            <p className="text-stone-500 text-xs mt-1">
              Vínculos NP-Empenho ainda sem PF associado. Use o botão <span className="text-amber-400 font-bold">＋ PF</span> para associar.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => loadPage(currentPage)} disabled={loading}>
            ↺ Recarregar
          </Button>
        </div>
        {successMsg && (
          <div className="mt-3">
            <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg(null)} />
          </div>
        )}
      </div>

      <div className="px-3 sm:px-6 py-6">
        {listError && (
          <div className="mb-4">
            <Alert variant="error" message={listError} onClose={() => setListError(null)} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-stone-500 text-sm tracking-widest uppercase">Aguarde...</p>
            </div>
          </div>
        )}

        {/* Vazio */}
        {!loading && rows.length === 0 && !listError && (
          <div className="flex flex-col items-center justify-center py-24 text-stone-600 gap-2">
            <span className="text-4xl">✅</span>
            <p className="text-sm tracking-widest uppercase">Todos os vínculos possuem PF associado.</p>
          </div>
        )}

        {/* Conteúdo */}
        {!loading && rows.length > 0 && (
          <>
            <p className="text-xs text-stone-500 mb-3">
              <span className="text-amber-400 font-bold">{totalElements}</span> vínculo(s) sem PF encontrado(s).
            </p>

            {/* ── Cards Mobile ──────────────────────────────────────────────── */}
            <div className="space-y-3 lg:hidden">
              {rows.map((row) => {
                const id = row.id;
                const edit = editMap[id];
                const saving = savingMap[id] ?? false;
                return (
                  <div key={id} className={`glass-panel p-3 ${edit ? 'ring-1 ring-inset ring-amber-600/50' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-amber-400 font-bold font-mono">NP {row.paymentNote.numeroNp}</span>
                      <StatusBadge status={row.paymentNote.status} />
                    </div>
                    <div className="text-xs text-stone-400 mb-2">
                      {row.paymentNote.empresa?.nome ?? '—'}
                      <br />
                      <span className="font-mono text-[10px]">{formatCNPJ(row.paymentNote.empresa?.cnpj ?? '')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                      <div>
                        <span className="text-stone-500">Valor: </span>
                        <span className="text-amber-300 font-bold">{formatCurrency(row.value)}</span>
                      </div>
                      <div>
                        <span className="text-stone-500">Empenho: </span>
                        <span className="text-amber-400">{row.empenho.numero}/{row.empenho.ano}</span>
                      </div>
                    </div>

                    {edit ? (
                      <div className="space-y-2 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Nº PF</label>
                            <input type="number" value={edit.numeroFP}
                              onChange={e => updateField(id, 'numeroFP', e.target.value)}
                              className="w-full bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Ano PF</label>
                            <input type="number" value={edit.anoFP}
                              onChange={e => updateField(id, 'anoFP', e.target.value)}
                              className="w-full bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" loading={saving} onClick={() => confirmEdit(row)} className="flex-1">
                            ✔ Confirmar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => cancelEdit(id)} disabled={saving}>✕</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-white/10 flex justify-end">
                        <Button variant="secondary" size="sm" onClick={() => startEdit(id)}>＋ Associar PF</Button>
                      </div>
                    )}

                    {errMap[id] && (
                      <div className="mt-2">
                        <Alert variant="error" message={errMap[id]}
                          onClose={() => setErrMap(prev => { const n = { ...prev }; delete n[id]; return n; })} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Tabela Desktop ────────────────────────────────────────────── */}
            <div className="hidden lg:block glass-panel overflow-hidden">
              <div className="w-full p-4">
                <table className="w-full text-xs divide-y divide-white/5">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-stone-500 bg-stone-900/20">
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Nº NP</th>
                      <th className="px-3 py-2 text-left">Data Liq.</th>
                      <th className="px-3 py-2 text-left">Empresa</th>
                      <th className="px-3 py-2 text-left">Doc. Origem</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-left">Empenho</th>
                      <th className="px-3 py-2 text-left">Plano Interno</th>
                      <th className="px-3 py-2 text-center">Associar PF</th>
                      <th className="px-3 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const id = row.id;
                      const edit = editMap[id];
                      const saving = savingMap[id] ?? false;
                      return (
                        <React.Fragment key={id}>
                          <tr className={`border-b border-stone-800 transition-colors duration-150 ${edit ? 'bg-amber-900/20 ring-1 ring-inset ring-amber-600/50' : 'hover:bg-stone-800/30'}`}>
                            <td className="px-3 py-2.5 text-stone-500 font-mono">{id}</td>
                            <td className="px-3 py-2.5">
                              <span className="text-amber-400 font-bold">{row.paymentNote.numeroNp}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">
                              {formatDate(row.paymentNote.dataLiquidacao)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="block text-gray-300 truncate max-w-[160px]" title={row.paymentNote.empresa?.nome}>
                                {row.paymentNote.empresa?.nome ?? '—'}
                              </span>
                              <span className="text-[10px] text-stone-500 font-mono">
                                {formatCNPJ(row.paymentNote.empresa?.cnpj ?? '')}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-400">{row.paymentNote.docOrigin}</td>
                            <td className="px-3 py-2.5 text-right">
                              <span className="text-amber-300 font-bold">{formatCurrency(row.value)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <StatusBadge status={row.paymentNote.status} />
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-amber-400 font-bold">{row.empenho.numero}</span>
                              <span className="text-stone-500">/{row.empenho.ano}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-400">{row.empenho.internalPlan}</td>
                            <td className="px-3 py-2.5">
                              {edit ? (
                                <div className="flex gap-1">
                                  <input type="number" value={edit.numeroFP} placeholder="Nº PF"
                                    onChange={e => updateField(id, 'numeroFP', e.target.value)}
                                    className="w-20 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                  <input type="number" value={edit.anoFP} placeholder="Ano"
                                    onChange={e => updateField(id, 'anoFP', e.target.value)}
                                    className="w-16 bg-stone-800 border border-amber-600 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </div>
                              ) : (
                                <span className="text-stone-600 text-[10px]">— sem PF —</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {edit ? (
                                  <>
                                    <Button variant="primary" size="sm" loading={saving} onClick={() => confirmEdit(row)}>✔</Button>
                                    <Button variant="ghost" size="sm" onClick={() => cancelEdit(id)} disabled={saving}>✕</Button>
                                  </>
                                ) : (
                                  <Button variant="secondary" size="sm" onClick={() => startEdit(id)}>＋ PF</Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {errMap[id] && (
                            <tr className="bg-transparent">
                              <td colSpan={11} className="px-3 pb-2">
                                <Alert variant="error" message={errMap[id]}
                                  onClose={() => setErrMap(prev => { const n = { ...prev }; delete n[id]; return n; })} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Paginação ─────────────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 gap-4 sm:gap-0">
                <span className="text-xs text-stone-500">
                  Página {currentPage + 1} de {totalPages}
                  {totalElements > 0 && ` (${totalElements} registros)`}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => loadPage(currentPage - 1)} disabled={currentPage === 0 || loading}>
                    ← Anterior
                  </Button>
                  <Input placeholder="Pág" value={pageInput}
                    onChange={e => setPageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGoToPage()}
                    className="w-16 text-center text-xs" />
                  <Button variant="ghost" size="sm" onClick={handleGoToPage} disabled={loading}>Ir</Button>
                  <Button variant="ghost" size="sm" onClick={() => loadPage(currentPage + 1)} disabled={currentPage >= totalPages - 1 || loading}>
                    Próxima →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
