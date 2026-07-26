import { useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Alert from '../../components/Alert';
import EditIconButton from '../../components/EditIconButton';
import PaginationControls from '../../components/PaginationControls';
import ConfirmSaveModal from '../../components/ConfirmSaveModal';
import { NpItemEditor, itemToEditState, editStateToItem, DEFAULT_ITEM } from '../../components/NpItemEditor';
import type { ItemEditState } from '../../components/NpItemEditor';
import { findNpByNumeroEAno, getAllNp, updatePaymentNote, findEmpresaByCnpj } from '../../services/api';
import type { PaymentNoteDto } from '../../types';
import { toInputDate, formatCurrency, formatDate } from '../../lib/utils';
import { SectionTitle, TableContainer, applyCnpjMask } from './Shared';
import { useEntitySearch } from '../../hooks/useEntitySearch';

const NP_STATUS_STYLE: Record<PaymentNoteDto['status'], string> = {
  PAGA:      'text-emerald-400 bg-emerald-900/30 border-emerald-700/50',
  CANCELADA: 'text-red-400 bg-red-900/30 border-red-700/50',
  A_PAGAR:   'text-amber-400 bg-amber-900/30 border-amber-700/50',
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function BuscaPaymentNote() {
  const [sNumero, setSNumero] = useState('');
  const [sAno, setSAno]       = useState('');
  // Campos da NP
  const [numeroNp, setNumeroNp] = useState('');
  const [dataLiq, setDataLiq] = useState('');
  const [docOrigin, setDocOrigin] = useState('');
  const [status, setStatus] = useState<PaymentNoteDto['status']>('A_PAGAR');
  const [cnpj, setCnpj] = useState('');
  const [cnpjValid, setCnpjValid] = useState<boolean | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState('');
  const [datePayment, setDatePayment] = useState('');
  // Itens editáveis
  const [editItems, setEditItems] = useState<ItemEditState[]>([{ ...DEFAULT_ITEM }]);
  // Modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    loading: searching, error, setError,
    allResults, setAllResults,
    showAll, setShowAll,
    currentPage, totalPages, totalElements,
    found, setFound,
    editing, setEditing,
    saving, saveError, setSaveError,
    success, setSuccess,
    handleSearchRequest,
    handleGetAllRequest,
    handleNextPage,
    handlePreviousPage,
    handleGoToPage,
    handleSaveRequest,
  } = useEntitySearch<PaymentNoteDto>();

  const handleEdit = (np: PaymentNoteDto) => {
    setFound(np);
    setNumeroNp(String(np.numeroNp));
    setDataLiq(toInputDate(np.dataLiquidacao));
    setDocOrigin(np.docOrigin);
    setStatus(np.status);
    setCnpj(applyCnpjMask(np.empresa?.cnpj || ''));
    setEmpresaNome(np.empresa?.nome || '');
    setCnpjValid(true);
    setCnpjError(null);
    setDatePayment(np.datePayment ? toInputDate(np.datePayment) : '');
    // Popula os itens editáveis a partir da NP carregada
    const items = np.items && np.items.length > 0
      ? np.items.map(itemToEditState)
      : [{ ...DEFAULT_ITEM }];
    setEditItems(items);
    setEditing(true);
  };

  function updateItem(idx: number, next: ItemEditState) {
    setEditItems(prev => prev.map((it, i) => i === idx ? next : it));
  }

  function removeItem(idx: number) {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setEditItems(prev => [...prev, { ...DEFAULT_ITEM }]);
  }

  const openConfirm = () => {
    if (!found) return;
    if (!cnpjValid) { setSaveError('Valide o CNPJ antes de salvar.'); return; }
    if (editItems.some(it => !it.value || parseFloat(it.value) <= 0)) {
      setSaveError('Todos os itens devem ter um valor maior que zero.'); return;
    }
    setConfirmOpen(true);
  };

  const handleSaveConfirmed = () => {
    setConfirmOpen(false);
    if (!found) return;
    const payload: PaymentNoteDto = {
      ...found,
      numeroNp: parseInt(numeroNp, 10),
      dataLiquidacao: dataLiq,
      docOrigin,
      status,
      empresa: { nome: empresaNome, cnpj: cnpj.replace(/\D/g, '') },
      items: editItems.map(editStateToItem),
      datePayment: status === 'PAGA' && datePayment ? datePayment : null,
    };
    handleSaveRequest(
      () => updatePaymentNote(payload),
      'Payment Note atualizada!',
      () => handleGetAllRequest(getAllNp)
    );
  };

  function handleCnpj(v: string) { setCnpj(applyCnpjMask(v)); setCnpjValid(null); setCnpjError(null); setEmpresaNome(''); }

  async function handleCnpjBlur() {
    const raw = cnpj.replace(/\D/g, '');
    if (raw.length !== 14) { setCnpjError('CNPJ inválido. Deve conter 14 dígitos.'); setCnpjValid(false); return; }
    if (found && raw === found.empresa?.cnpj) { setCnpjValid(true); setEmpresaNome(found.empresa.nome); return; }
    setCnpjLoading(true); setCnpjError(null);
    const result = await findEmpresaByCnpj(raw);
    if (result.data) { setCnpjValid(true); setEmpresaNome(result.data.nome); }
    else { setCnpjValid(false); setCnpjError('Empresa não encontrada. Cadastre a empresa primeiro.'); }
    setCnpjLoading(false);
  }

  const totalValorItens = editItems.reduce((s, it) => s + (parseFloat(it.value) || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Busca ──────────────────────────────────────────────────────── */}
      <div className="glass-panel p-5">
        <SectionTitle>Buscar Payment Note por Nº e Ano</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Nº NP" type="number" placeholder="2024001" value={sNumero}
            onChange={(e) => { setSNumero(e.target.value); setError(null); setAllResults([]); setShowAll(false); }}
            onKeyDown={(e) => e.key === 'Enter' && (() => {
              if (!sNumero || !sAno) { setError('Informe Nº NP e Ano.'); return; }
              handleSearchRequest(() => findNpByNumeroEAno(parseInt(sNumero, 10), parseInt(sAno, 10)), handleEdit);
            })()}
            className="w-full sm:w-36" />
          <Input label="Ano" type="number" placeholder="2024" value={sAno}
            onChange={(e) => { setSAno(e.target.value); setError(null); setAllResults([]); setShowAll(false); }}
            className="w-full sm:w-28" />
          <Button variant="ghost" size="md" loading={searching} onClick={() => {
            if (!sNumero || !sAno) { setError('Informe Nº NP e Ano.'); return; }
            handleSearchRequest(() => findNpByNumeroEAno(parseInt(sNumero, 10), parseInt(sAno, 10)), handleEdit);
          }}>🔍 Buscar</Button>
          <Button variant="ghost" size="md" loading={searching} onClick={() => handleGetAllRequest(getAllNp)}>
            🔍 Buscar Todos
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {/* ── Formulário de Edição ────────────────────────────────────────── */}
      {editing && found && (
        <div className="glass-panel p-5 animate-fadeIn space-y-6">
          <SectionTitle>Atualizar Payment Note</SectionTitle>

          {/* Campos da NP */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl">
            <Input label="Nº NP" type="number" value={numeroNp} onChange={e => setNumeroNp(e.target.value)} />
            <Input label="Data Liq." type="date" value={dataLiq} onChange={e => setDataLiq(e.target.value)} />
            <Input label="Doc. Origem" value={docOrigin} onChange={e => setDocOrigin(e.target.value)} />
            <Select label="Status" value={status} onChange={e => {
              const newStatus = e.target.value as PaymentNoteDto['status'];
              setStatus(newStatus);
              if (newStatus !== 'PAGA') setDatePayment('');
            }} options={[
              { value: 'A_PAGAR', label: 'A PAGAR' },
              { value: 'PAGA', label: 'PAGA' },
              { value: 'CANCELADA', label: 'CANCELADA' },
            ]} />
            {status === 'PAGA' && (
              <div className="animate-fadeIn">
                <Input label="Data de Pagamento" type="date" value={datePayment} onChange={e => setDatePayment(e.target.value)} />
                <p className="text-xs text-amber-500/70 mt-1">Obrigatório quando status é PAGA.</p>
              </div>
            )}
          </div>

          {/* Empresa */}
          <div>
            <SectionTitle>Empresa (Validação por CNPJ)</SectionTitle>
            <div className="max-w-sm space-y-2">
              <div className="flex items-end gap-3">
                <Input label="CNPJ da Empresa" placeholder="XX.XXX.XXX/XXXX-XX" value={cnpj}
                  onChange={(e) => handleCnpj(e.target.value)} onBlur={handleCnpjBlur}
                  maxLength={18} className="flex-1" error={cnpjError ?? undefined} />
                {cnpjLoading && (
                  <span className="mb-2 text-stone-400 text-xs flex items-center gap-1">
                    <span className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Buscando...
                  </span>
                )}
              </div>
              {cnpjValid === true && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                  <span>✔</span><span>{empresaNome}</span>
                </div>
              )}
            </div>
          </div>

          {/* Itens com tributação — editáveis */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>
                Itens e Tributação
                {totalValorItens > 0 && (
                  <span className="ml-2 text-amber-400 font-mono normal-case">
                    — Total: {formatCurrency(totalValorItens)}
                  </span>
                )}
              </SectionTitle>
            </div>
            <div className="space-y-3 max-w-3xl">
              {editItems.map((item, idx) => (
                <NpItemEditor
                  key={idx}
                  idx={idx}
                  item={item}
                  total={editItems.length}
                  dataLiquidacao={dataLiq || undefined}
                  nomeEmpresaNp={empresaNome || undefined}
                  onChange={updateItem}
                  onRemove={removeItem}
                />
              ))}
              <button
                type="button"
                onClick={addItem}
                className="w-full py-2 rounded-xl border border-dashed border-white/20 text-stone-500 hover:text-amber-400 hover:border-amber-500/40 text-xs uppercase tracking-widest transition-colors"
              >
                + Adicionar Item
              </button>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={openConfirm} loading={saving} disabled={cnpjValid === false || cnpjLoading}>
              Salvar Alterações
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
          {saveError && <Alert variant="error" message={saveError} onClose={() => setSaveError(null)} />}
          {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}
        </div>
      )}

      {/* ── Tabela de resultados ────────────────────────────────────────── */}
      {showAll && !editing && allResults.length > 0 && (
        <>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} totalElements={totalElements}
            loading={searching}
            onPrevious={() => handlePreviousPage(getAllNp)}
            onNext={() => handleNextPage(getAllNp)}
            onGoToPage={(page) => handleGoToPage(page, getAllNp)} />
          <TableContainer title="Resultados" count={allResults.length}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 text-xs uppercase border-b border-white/10">
                  <th className="py-2 pr-4">Nº NP</th>
                  <th className="py-2 pr-4">Data Liq.</th>
                  <th className="py-2 pr-4">Empresa</th>
                  <th className="py-2 pr-4">Valor Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Itens</th>
                  <th className="py-2 pr-4 w-8">✏️</th>
                </tr>
              </thead>
              <tbody>
                {allResults.map((np, i) => {
                  const totalVal = np.value ?? np.items?.reduce((s, it) => s + it.value, 0) ?? 0;
                  return (
                    <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/30">
                      <td className="py-2 pr-4 text-amber-300 font-mono">{np.numeroNp}</td>
                      <td className="py-2 pr-4 text-gray-300 whitespace-nowrap">{formatDate(np.dataLiquidacao)}</td>
                      <td className="py-2 pr-4 text-gray-300 text-xs">{np.empresa?.nome ?? '—'}</td>
                      <td className="py-2 pr-4 text-gray-200 font-mono text-xs">{formatCurrency(totalVal)}</td>
                      <td className="py-2 pr-4">
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${NP_STATUS_STYLE[np.status]}`}>
                            {np.status.replace('_', ' ')}
                          </span>
                          {np.status === 'PAGA' && np.datePayment && (
                            <div className="text-[10px] text-emerald-400/70 font-mono">pago em {formatDate(np.datePayment)}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-stone-500 text-xs">{np.items?.length ?? 0} item(s)</td>
                      <td className="py-2 pr-4 w-8">
                        <EditIconButton onClick={() => handleEdit(np)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} totalElements={totalElements}
            loading={searching}
            onPrevious={() => handlePreviousPage(getAllNp)}
            onNext={() => handleNextPage(getAllNp)}
            onGoToPage={(page) => handleGoToPage(page, getAllNp)} />
        </>
      )}

      <ConfirmSaveModal
        open={confirmOpen}
        title="Confirmar Alterações na Payment Note"
        warning="Ao salvar, o backend recalculará os impostos automaticamente a partir do Código EFD, a menos que o Ajuste Manual esteja ativado."
        description="Deseja mesmo atualizar as informações desta Nota de Pagamento?"
        onConfirm={handleSaveConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}