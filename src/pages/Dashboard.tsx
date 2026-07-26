import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import Button from '../components/Button';
import Alert from '../components/Alert';
import PaginationControls from '../components/PaginationControls';
import {
  getAllPaymentEmpenhos,
  updatePaymentEmpenho,
  findNpByNumeroEAno,
  findFinancialPlanningByNumber,
} from '../services/api';
import type { PaymentNoteEmpenhoDto } from '../types';
import { formatCurrency, formatCNPJ, formatDate } from '../lib/utils';
import { ReadField } from './BuscaTabs/Shared';
import TaxItemsDisplay from '../components/TaxItemsDisplay';
import Input from '../components/Input';

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface RowEditState {
  id: number;
  numeroNp: string;
  npAno: string;
  numeroEmpenho: string;
  anoEmpenho: string;
  numeroFP: string;
  anoFP: string;
  valorVinculo: string;
}

interface EditingMap {
  [rowIndex: number]: RowEditState | undefined;
}

// ── Helpers visuais ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'CANCELADA' | 'PAGA' | 'A_PAGAR' }) {
  const map: Record<string, string> = {
    CANCELADA: 'bg-red-900/60 text-red-300 border border-red-700',
    PAGA: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
    A_PAGAR: 'bg-amber-900/60 text-amber-300 border border-amber-600',
  };
  const label: Record<string, string> = {
    CANCELADA: 'Cancelada',
    PAGA: 'Paga',
    A_PAGAR: 'A Pagar',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-widest ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function extractNpYear(dataLiquidacao: string): number | null {
  if (!dataLiquidacao) return null;
  if (dataLiquidacao.includes('/')) {
    const parts = dataLiquidacao.split('/');
    return parts.length === 3 ? parseInt(parts[2], 10) : null;
  }
  if (dataLiquidacao.includes('-')) {
    const parts = dataLiquidacao.split('-');
    return parts.length >= 1 ? parseInt(parts[0], 10) : null;
  }
  return null;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PaymentNoteEmpenhoDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(50);

  // Inline editing
  const [editingMap, setEditingMap] = useState<EditingMap>({});
  const [confirmingMap, setConfirmingMap] = useState<Record<number, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  // Accordion expand
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  function toggleExpand(index: number) {
    setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));
  }

  // ── Carregamento inicial ───────────────────────────────────────────────────

  async function loadAll(page = 0) {
    setLoadingList(true);
    setListError(null);
    const result = await getAllPaymentEmpenhos(page, pageSize);
    if (result.data) {
      setRows(result.data.content);
      setTotalPages(result.data.totalPages);
      setTotalElements(result.data.totalElements);
      setCurrentPage(result.data.pageNumber);
    } else {
      setListError(result.errorMessage ?? 'Erro ao carregar registros.');
    }
    setLoadingList(false);
  }

  useEffect(() => { loadAll(0); }, []);

  // ── Inline Editing ─────────────────────────────────────────────────────────

  function extractYear(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.includes('/')) { const p = dateStr.split('/'); return p.length === 3 ? p[2] : ''; }
    if (dateStr.includes('-')) { const p = dateStr.split('-'); return p.length >= 1 ? p[0] : ''; }
    return '';
  }

  function startEdit(index: number, row: PaymentNoteEmpenhoDto) {
    setRowErrors((prev) => { const n = { ...prev }; delete n[index]; return n; });
    setExpandedRows(prev => ({ ...prev, [index]: true }));
    setEditingMap((prev) => ({
      ...prev,
      [index]: {
        id: row.id!,
        numeroNp: String(row.paymentNoteBasicDto.numeroNp),
        npAno: '',
        numeroEmpenho: String(row.empenhoDto.numero),
        anoEmpenho: String(row.empenhoDto.ano),
        numeroFP: row.financialPlanningBasicDto ? String(row.financialPlanningBasicDto.numero) : '',
        anoFP: row.financialPlanningBasicDto ? extractYear(row.financialPlanningBasicDto.data) : '',
        valorVinculo: String(row.value ?? 0),
      }
    }));
  }

  function cancelEdit(index: number) {
    setEditingMap((prev) => { const n = { ...prev }; delete n[index]; return n; });
    setRowErrors((prev) => { const n = { ...prev }; delete n[index]; return n; });
  }

  function updateEditField(index: number, field: keyof RowEditState, value: string) {
    setEditingMap((prev) => ({ ...prev, [index]: { ...prev[index]!, [field]: value } }));
  }

  async function confirmEdit(index: number, originalRow: PaymentNoteEmpenhoDto) {
    const editState = editingMap[index];
    if (!editState) return;

    const npNum = parseInt(editState.numeroNp, 10);
    const empNum = parseInt(editState.numeroEmpenho, 10);
    const empAno = parseInt(editState.anoEmpenho, 10);
    const fpNum = editState.numeroFP ? parseInt(editState.numeroFP, 10) : null;
    const vinculoValor = editState.valorVinculo ? parseFloat(editState.valorVinculo) : originalRow.value;

    if (!npNum || !empNum || !empAno) {
      setRowErrors((prev) => ({ ...prev, [index]: 'Nº NP, Nº Empenho e Ano são obrigatórios.' }));
      return;
    }
    if (isNaN(vinculoValor)) {
      setRowErrors((prev) => ({ ...prev, [index]: 'Valor do vínculo inválido.' }));
      return;
    }
    // PF: se informou número precisa do ano para derivar a data
    const fpAnoRaw = editState.anoFP ? parseInt(editState.anoFP, 10) : null;
    if (fpNum && !fpAnoRaw) {
      setRowErrors((prev) => ({ ...prev, [index]: 'Informe o Ano do PF para realizar a busca.' }));
      return;
    }

    setConfirmingMap((prev) => ({ ...prev, [index]: true }));

    // ── Derivar dataLiquidacao da NP ───────────────────────────────────────────
    // O backend só precisa de { numeroNp, dataLiquidacao } para identificar a NP.
    // Se o usuário não alterou a NP, mantemos o valor original.
    // Se alterou número ou ano, buscamos a NP para obter a dataLiquidacao correta.
    const originalNpYear = extractNpYear(originalRow.paymentNoteBasicDto.dataLiquidacao);
    const npAlterado =
      npNum !== originalRow.paymentNoteBasicDto.numeroNp ||
      (editState.npAno !== '' && parseInt(editState.npAno, 10) !== originalNpYear);

    let npDataLiquidacao = originalRow.paymentNoteBasicDto.dataLiquidacao;
    if (npAlterado) {
      const npAno = editState.npAno ? parseInt(editState.npAno, 10) : originalNpYear;
      const npResult = await findNpByNumeroEAno(npNum, npAno!);
      if (!npResult.data) {
        setRowErrors((prev) => ({ ...prev, [index]: `NP nº ${npNum} não encontrada.` }));
        setConfirmingMap((prev) => ({ ...prev, [index]: false }));
        return;
      }
      npDataLiquidacao = npResult.data.dataLiquidacao;
    }

    // ── Derivar data do PF ─────────────────────────────────────────────────────
    // Se o usuário limpou o PF (fpNum === null), desassocia (null).
    // Se manteve o mesmo PF, reutiliza a data original.
    // Se alterou, busca o PF para obter a data correta.
    let fpPayload: { numero: number; data: string } | null = null;
    if (fpNum !== null) {
      const originalFpNum = originalRow.financialPlanningBasicDto?.numero ?? null;
      const fpAlterado = fpNum !== originalFpNum || editState.anoFP !== '';
      if (!fpAlterado && originalRow.financialPlanningBasicDto) {
        fpPayload = {
          numero: originalRow.financialPlanningBasicDto.numero,
          data: originalRow.financialPlanningBasicDto.data,
        };
      } else {
        const fpResult = await findFinancialPlanningByNumber(fpNum, fpAnoRaw!);
        if (!fpResult.data) {
          setRowErrors((prev) => ({ ...prev, [index]: `Financial Planning nº ${fpNum} não encontrado.` }));
          setConfirmingMap((prev) => ({ ...prev, [index]: false }));
          return;
        }
        fpPayload = {
          numero: fpResult.data.numero,
          data: fpResult.data.data,
        };
      }
    }

    const updateResult = await updatePaymentEmpenho(editState.id, {
      paymentNote: {
        numeroNp: npNum,
        dataLiquidacao: npDataLiquidacao,
      },
      empenho: {
        numero: empNum,
        ano: empAno,
      },
      financialPlanning: fpPayload,
      value: isNaN(vinculoValor) ? originalRow.value : vinculoValor,
    });

    if (updateResult.data) {
      cancelEdit(index);
      await loadAll();
    } else {
      setRowErrors((prev) => ({ ...prev, [index]: updateResult.errorMessage ?? 'Erro ao atualizar.' }));
    }
    setConfirmingMap((prev) => ({ ...prev, [index]: false }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      {/* ── Main Table ─────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-amber-400 font-bold uppercase tracking-widest text-sm">
              ▶ Vínculos Registrados
            </h2>
            {totalElements > 0 && (
              <span className="text-xs text-stone-500 font-mono">
                {totalElements} registro{totalElements !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/pfnr')}
          >
            🔗 PFNR
          </Button>
        </div>

        {listError && <Alert variant="error" message={listError} onClose={() => setListError(null)} />}

        {loadingList ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-stone-500 text-sm tracking-widest uppercase">Aguarde...</p>
            </div>
          </div>
        ) : rows.length === 0 && !listError ? (
          <div className="flex flex-col items-center justify-center py-24 text-stone-600 gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm tracking-widest uppercase">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <>
            {/* ── Paginação (topo) ─────────────────────────────────────────── */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              loading={loadingList}
              onPrevious={() => loadAll(currentPage - 1)}
              onNext={() => loadAll(currentPage + 1)}
              onGoToPage={(page) => loadAll(page)}
            />

            <div className="glass-panel overflow-hidden">
              {/* Mobile: card view */}
              <div className="space-y-3 p-3 lg:hidden">
                {rows.map((row, index) => {
                  const editing = editingMap[index];
                  const confirming = confirmingMap[index] ?? false;
                  const isEditing = !!editing;

                  return (
                    <div key={index} className={`glass-panel p-3 animate-fadeIn ${isEditing ? 'ring-1 ring-inset ring-amber-600/50' : ''}`}>
                      {isEditing ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <Input
                              label="Nº NP"
                              type="number"
                              value={editing.numeroNp}
                              onChange={(e) => updateEditField(index, 'numeroNp', e.target.value)}
                            />
                            <Input
                              label="Ano NP"
                              type="number"
                              value={editing.npAno}
                              placeholder="(inalterado)"
                              onChange={(e) => updateEditField(index, 'npAno', e.target.value)}
                            />
                            <Input
                              label="Nº Empenho"
                              type="number"
                              value={editing.numeroEmpenho}
                              onChange={(e) => updateEditField(index, 'numeroEmpenho', e.target.value)}
                            />
                            <Input
                              label="Ano Empenho"
                              type="number"
                              value={editing.anoEmpenho}
                              onChange={(e) => updateEditField(index, 'anoEmpenho', e.target.value)}
                            />
                            <Input
                              label="Nº PF (opcional)"
                              type="number"
                              value={editing.numeroFP}
                              placeholder="opcional"
                              onChange={(e) => updateEditField(index, 'numeroFP', e.target.value)}
                            />
                            <Input
                              label="Ano PF"
                              type="number"
                              value={editing.anoFP}
                              placeholder="Ex: 2024"
                              onChange={(e) => updateEditField(index, 'anoFP', e.target.value)}
                            />
                            <div className="col-span-2">
                              <Input
                                label="Valor Vínculo"
                                type="number"
                                value={editing.valorVinculo}
                                onChange={(e) => updateEditField(index, 'valorVinculo', e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="primary" size="sm" loading={confirming} onClick={() => confirmEdit(index, row)} className="flex-1">
                              ✔ Confirmar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => cancelEdit(index)} disabled={confirming}>
                              ✕ Cancelar
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-amber-400 font-bold font-mono">NP {row.paymentNoteBasicDto.numeroNp}</span>
                            <StatusBadge status={row.paymentNoteBasicDto.status} />
                          </div>
                          <div className="text-xs text-gray-300 mb-2">
                            <span className="text-stone-500">{row.paymentNoteBasicDto.empresa.nome}</span>
                            <br />
                            <span className="text-stone-500 font-mono">{formatCNPJ(row.paymentNoteBasicDto.empresa.cnpj)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-stone-500">Valor NP:</span>
                              <span className="text-amber-300 font-bold ml-1">{formatCurrency(row.paymentNoteBasicDto.value ?? 0)}</span>
                            </div>
                            <div>
                              <span className="text-stone-500">Vínculo:</span>
                              <span className="text-amber-300 font-bold ml-1">{formatCurrency(row.value)}</span>
                            </div>
                            <div>
                              <span className="text-stone-500">Empenho:</span>
                              <span className="text-amber-400 ml-1">{row.empenhoDto.numero}/{row.empenhoDto.ano}</span>
                            </div>
                            <div>
                              <span className="text-stone-500">Data Liq.:</span>
                              <span className="text-gray-300 ml-1">{formatDate(row.paymentNoteBasicDto.dataLiquidacao)}</span>
                            </div>
                          </div>
                          {row.financialPlanningBasicDto && (
                            <div className="text-xs text-stone-500 mt-1">
                              PF: <span className="text-amber-400">#{row.financialPlanningBasicDto.numero}</span>
                            </div>
                          )}
                          <div className="mt-3 pt-2 border-t border-white/10 flex justify-end">
                            <Button variant="secondary" size="sm" onClick={() => startEdit(index, row)}>
                              ✎ Editar
                            </Button>
                          </div>
                        </>
                      )}
                      {rowErrors[index] && (
                        <div className="mt-2">
                          <Alert variant="error" message={rowErrors[index]} onClose={() =>
                            setRowErrors((prev) => { const n = { ...prev }; delete n[index]; return n; })
                          } />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table view */}
              <div className="hidden lg:block w-full p-4">
                <table className="w-full text-sm divide-y divide-white/5">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-stone-500 bg-stone-900/20">
                      <th className="px-3 py-2 text-left whitespace-nowrap">Nº NP</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Data Liq.</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Empresa</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Doc. Origem</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Valor</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Status</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Empenho</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Plano Interno</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">PF</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Vínculo</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const editing = editingMap[index];
                      const confirming = confirmingMap[index] ?? false;
                      const isEditing = !!editing;
                      const isExpanded = expandedRows[index] ?? false;

                      return (
                        <React.Fragment key={index}>
                          <tr
                            className={`border-b border-stone-800 transition-colors duration-150 ${isEditing ? 'bg-amber-900/20 ring-1 ring-inset ring-amber-600/50' : 'hover:bg-stone-800/30 bg-transparent'}`}
                          >
                            <td className="px-3 py-2.5">
                              <span className="text-amber-400 font-bold font-mono">{row.paymentNoteBasicDto.numeroNp}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">{formatDate(row.paymentNoteBasicDto.dataLiquidacao)}</td>
                            <td className="px-3 py-2.5 text-gray-400">
                              <span className="block text-gray-300 truncate max-w-[180px]" title={row.paymentNoteBasicDto.empresa.nome}>{row.paymentNoteBasicDto.empresa.nome}</span>
                              <span className="text-[10px] text-stone-500 font-mono">{formatCNPJ(row.paymentNoteBasicDto.empresa.cnpj)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-400">{row.paymentNoteBasicDto.docOrigin}</td>
                            <td className="px-3 py-2.5 text-right">
                              <span className="text-amber-300 font-bold">{formatCurrency(row.paymentNoteBasicDto.value ?? 0)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <StatusBadge status={row.paymentNoteBasicDto.status} />
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-amber-400 font-bold font-mono">{row.empenhoDto.numero}<span className="text-stone-500 font-normal">/{row.empenhoDto.ano}</span></span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-400">{row.empenhoDto.internalPlan}</td>
                            <td className="px-3 py-2.5">
                              {row.financialPlanningBasicDto ? (
                                <span className="text-amber-400 font-bold">#{row.financialPlanningBasicDto.numero}</span>
                              ) : (
                                <span className="text-stone-600">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className="text-amber-300 font-bold">{formatCurrency(row.value ?? 0)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isEditing ? (
                                  <>
                                    <Button variant="primary" size="sm" loading={confirming} onClick={() => confirmEdit(index, row)}>
                                      ✔
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => cancelEdit(index)} disabled={confirming}>
                                      ✕
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleExpand(index)}
                                      title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                                    >
                                      {isExpanded ? '▲' : '▼'}
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => startEdit(index, row)}>
                                      ✎
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Linha de detalhe expansível */}
                          {(isExpanded || isEditing) && (
                            <tr className="bg-stone-900/40 border-b border-stone-700">
                              <td colSpan={11} className="px-4 py-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Tributação — por item */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold"><span className="text-amber-500 mr-1">■</span>Tributação</p>
                                    {!row.paymentNoteBasicDto.items || row.paymentNoteBasicDto.items.length === 0 ? (
                                      <span className="text-stone-600 text-xs">Sem itens</span>
                                    ) : (
                                      <div className="space-y-1">
                                        {row.paymentNoteBasicDto.items.map((item, idx) => (
                                          <div key={idx} className="text-xs">
                                            {item.tax?.tipo === 'OPTANTE' ? (
                                              <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-700 uppercase tracking-wider">Optante</span>
                                            ) : item.tax?.tipo === 'NAO_OPTANTE' ? (
                                              <div className="space-y-1">
                                                <ReadField label="EFD" value={item.tax.codEfd ?? 0} />
                                                {item.tax.calculatedItems && item.tax.calculatedItems.length > 0 && (
                                                  <TaxItemsDisplay
                                                    items={item.tax.calculatedItems}
                                                    taxStatus={item.tax.taxStatus}
                                                    compact
                                                  />
                                                )}
                                              </div>
                                            ) : <span className="text-stone-600">—</span>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Empenho — Detalhes */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold"><span className="text-amber-500 mr-1">■</span>Empenho — Detalhes</p>
                                    <ReadField label="Fonte Origem" value={row.empenhoDto.fontDeOrigin ?? '—'} />
                                    <ReadField label="Natureza" value={row.empenhoDto.nature} />
                                  </div>

                                  {/* PF */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold"><span className="text-amber-500 mr-1">■</span>Planejamento Financeiro</p>
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <div className="flex-1">
                                            <Input
                                              label="Nº PF (opcional)"
                                              type="number"
                                              value={editing.numeroFP}
                                              placeholder="opcional"
                                              onChange={(e) => updateEditField(index, 'numeroFP', e.target.value)}
                                            />
                                          </div>
                                          <div className="w-24">
                                            <Input
                                              label="Ano PF"
                                              type="number"
                                              value={editing.anoFP}
                                              placeholder="2024"
                                              onChange={(e) => updateEditField(index, 'anoFP', e.target.value)}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ) : row.financialPlanningBasicDto ? (
                                      <>
                                        <ReadField label="Nº PF" value={row.financialPlanningBasicDto.numero} highlight />
                                        <ReadField label="Data" value={formatDate(row.financialPlanningBasicDto.data)} />
                                        <ReadField label="Vinculação" value={row.financialPlanningBasicDto.vinculation} />
                                        <ReadField label="Origem" value={row.financialPlanningBasicDto.origin} />
                                      </>
                                    ) : (
                                      <span className="text-stone-600 text-xs">Sem PF vinculado</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                          {rowErrors[index] && (
                            <tr className="bg-transparent">
                              <td colSpan={11} className="px-3 pb-2">
                                <Alert variant="error" message={rowErrors[index]} onClose={() =>
                                  setRowErrors((prev) => { const n = { ...prev }; delete n[index]; return n; })
                                } />
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

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              loading={loadingList}
              onPrevious={() => loadAll(currentPage - 1)}
              onNext={() => loadAll(currentPage + 1)}
              onGoToPage={(page) => loadAll(page)}
            />
          </>
        )}
      </div>
    </PageShell>
  );
}
