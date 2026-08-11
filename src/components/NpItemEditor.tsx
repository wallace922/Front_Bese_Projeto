import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmpresaDto, OptanteStatus, PaymentNoteItemDto, TaxCalculatedItem, TaxDto, TaxRuleOption } from '../types';
import TaxAdjustmentPanel from './TaxAdjustmentPanel';
import Input from './Input';
import Select from './Select';
import Alert from './Alert';
import { findEmpresaByCnpj, getOpcoesReceitaPorEfd } from '../services/api';
import { parseBRCurrency } from '../lib/utils';

// ── Estado de um grupo de imposto ─────────────────────────────────────────────

/**
 * Estado de edição de UM grupo de imposto dentro de um item.
 * Um item pode ter N grupos (ex.: IR + CSLL com codEfd diferentes).
 * Todos incidem sobre o mesmo `value` do item.
 */
export interface TaxGroupState {
  taxTipo: OptanteStatus;
  codEfd: string;
  /** Código de receita selecionado pelo usuário (quando há múltiplas opções) */
  codigoReceita: number | null;
  backendItems: TaxCalculatedItem[];
  manualItems: TaxCalculatedItem[];
  isManualAdjustment: boolean;
}

export const DEFAULT_TAX_GROUP: TaxGroupState = {
  taxTipo: 'OPTANTE',
  codEfd: '',
  codigoReceita: null,
  backendItems: [],
  manualItems: [],
  isManualAdjustment: false,
};

// ── Estado do item de NP ──────────────────────────────────────────────────────

export interface ItemEditState {
  id?: number;
  description: string;
  value: string;
  /** Lista de grupos de imposto — substitui os campos únicos taxTipo/codEfd/etc. */
  taxGroups: TaxGroupState[];
  /** CNPJ do beneficiário digitado pelo usuário (diferente do CNPJ da NP) */
  beneficiarioCnpj: string;
  /** Empresa beneficiária resolvida (após lookup por CNPJ) */
  beneficiaria: EmpresaDto | null;
}

export const DEFAULT_ITEM: ItemEditState = {
  description: '',
  value: '',
  taxGroups: [{ ...DEFAULT_TAX_GROUP }],
  beneficiarioCnpj: '',
  beneficiaria: null,
};

// ── Helpers de conversão ──────────────────────────────────────────────────────

/** Converte um TaxDto do backend em TaxGroupState de edição. */
function taxDtoToGroup(tax: TaxDto): TaxGroupState {
  return {
    taxTipo: tax.tipo,
    codEfd: tax.codEfd ? String(tax.codEfd) : '',
    codigoReceita: tax.codigoReceita ?? null,
    backendItems: tax.calculatedItems?.map(i => ({ ...i })) ?? [],
    manualItems: tax.calculatedItems?.map(i => ({ ...i })) ?? [],
    isManualAdjustment: tax.manualAdjustment ?? false,
  };
}

/** Resolve a lista de TaxDto do item — usa `taxes` (novo) ou `tax` singular (legado). */
function resolveTaxDtos(item: PaymentNoteItemDto): TaxDto[] {
  if (item.taxes && item.taxes.length > 0) return item.taxes;
  if (item.tax) return [item.tax];
  return [];
}

export function itemToEditState(item: PaymentNoteItemDto): ItemEditState {
  const taxDtos = resolveTaxDtos(item);
  const taxGroups: TaxGroupState[] = taxDtos.length > 0
    ? taxDtos.map(taxDtoToGroup)
    : [{ ...DEFAULT_TAX_GROUP }];

  return {
    id: item.id,
    description: item.description ?? '',
    value: String(item.value),
    taxGroups,
    beneficiarioCnpj: item.empresaBeneficiaria?.cnpj ?? '',
    beneficiaria: item.empresaBeneficiaria ?? null,
  };
}

export function editStateToItem(s: ItemEditState): PaymentNoteItemDto {
  const taxes: TaxDto[] = s.taxGroups.map(g => {
    const isManual = g.isManualAdjustment && g.manualItems.length > 0;
    return {
      tipo: g.taxTipo,
      codEfd: g.taxTipo === 'NAO_OPTANTE' && g.codEfd ? parseInt(g.codEfd, 10) : null,
      ...(g.codigoReceita != null ? { codigoReceita: g.codigoReceita } : {}),
      ...(isManual
        ? { manualAdjustment: true, calculatedItems: g.manualItems }
        : {}),
    };
  });

  return {
    ...(s.id !== undefined ? { id: s.id } : {}),
    description: s.description,
    value: parseBRCurrency(s.value) || 0,
    // Envia o novo campo taxes (lista) — backend já suporta
    taxes,
    // Mantém o campo tax legado com o primeiro grupo (para frontend mais antigo / rollback)
    tax: taxes[0],
    empresaBeneficiaria: s.beneficiaria ?? null,
  };
}

// ── Sub-componente: editor de um grupo de imposto ─────────────────────────────

interface TaxGroupEditorProps {
  groupIdx: number;
  group: TaxGroupState;
  totalGroups: number;
  dataLiquidacao?: string;
  onChange: (groupIdx: number, next: TaxGroupState) => void;
  onRemove: (groupIdx: number) => void;
}

function TaxGroupEditor({ groupIdx, group, totalGroups, dataLiquidacao, onChange, onRemove }: TaxGroupEditorProps) {
  const [opcoes, setOpcoes] = useState<TaxRuleOption[]>([]);
  const [opcoesLoading, setOpcoesLoading] = useState(false);
  const [opcoesError, setOpcoesError] = useState<string | null>(null);
  const lastFetchedKey = useRef<string>('');

  function set(patch: Partial<TaxGroupState>) {
    onChange(groupIdx, { ...group, ...patch });
  }

  const fetchOpcoes = useCallback(async (forcedEfd?: string, forcedDate?: string) => {
    const targetEfd = forcedEfd ?? group.codEfd;
    const targetDate = forcedDate ?? dataLiquidacao;
    const codEfdNum = parseInt(targetEfd, 10);

    if (group.taxTipo !== 'NAO_OPTANTE' || !targetEfd || isNaN(codEfdNum) || !targetDate) return;

    const fetchKey = `${targetEfd}_${targetDate}`;
    if (lastFetchedKey.current === fetchKey) return;
    lastFetchedKey.current = fetchKey;

    setOpcoesLoading(true);
    setOpcoesError(null);

    const result = await getOpcoesReceitaPorEfd(codEfdNum, targetDate);
    setOpcoesLoading(false);

    if (result.errorMessage) {
      setOpcoesError('Erro ao buscar opções de receita para este EFD.');
      setOpcoes([]);
      return;
    }

    const lista = result.data ?? [];
    setOpcoes(lista);

    if (lista.length === 1) {
      set({ codigoReceita: lista[0].codigoReceita });
    } else if (lista.length > 1) {
      const currentRec = group.codigoReceita;
      const existsInList = currentRec != null && lista.some(o => o.codigoReceita === currentRec);
      if (!existsInList) set({ codigoReceita: null });
    } else {
      setOpcoesError('Nenhuma regra de imposto vigente para este EFD nesta data.');
      set({ codigoReceita: null });
    }
  }, [group.taxTipo, group.codEfd, group.codigoReceita, dataLiquidacao]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (group.taxTipo === 'NAO_OPTANTE' && group.codEfd && dataLiquidacao) {
      const codEfdNum = parseInt(group.codEfd, 10);
      if (!isNaN(codEfdNum)) fetchOpcoes(group.codEfd, dataLiquidacao);
    } else if (!group.codEfd || group.taxTipo === 'OPTANTE') {
      setOpcoes([]);
      setOpcoesError(null);
      lastFetchedKey.current = '';
    }
  }, [group.taxTipo, group.codEfd, dataLiquidacao, fetchOpcoes]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-3">
      {/* Cabeçalho do grupo */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
          <span className="text-amber-500/70 mr-1">◆</span>
          Grupo de Imposto {groupIdx + 1}
        </span>
        {totalGroups > 1 && (
          <button
            type="button"
            onClick={() => onRemove(groupIdx)}
            className="text-[10px] text-red-400/70 hover:text-red-300 border border-red-700/30 px-2 py-0.5 rounded transition-colors"
          >
            ✕ Remover grupo
          </button>
        )}
      </div>

      {/* Tipo de tributação */}
      <div className="w-48">
        <Select
          label="Tipo de Tributação"
          value={group.taxTipo}
          onChange={e => {
            set({
              taxTipo: e.target.value as OptanteStatus,
              codEfd: '',
              codigoReceita: null,
              backendItems: [],
              manualItems: [],
              isManualAdjustment: false,
            });
            setOpcoes([]);
            setOpcoesError(null);
            lastFetchedKey.current = '';
          }}
          options={[
            { value: 'OPTANTE', label: 'OPTANTE' },
            { value: 'NAO_OPTANTE', label: 'NÃO OPTANTE' },
          ]}
        />
      </div>

      {group.taxTipo === 'NAO_OPTANTE' && (
        <div className="animate-fadeIn space-y-3">
          {/* Campo Cód. EFD */}
          <div className="flex gap-3 items-end">
            <Input
              label="Cód. EFD"
              type="number"
              placeholder="Ex: 1708"
              value={group.codEfd}
              onChange={e => {
                set({ codEfd: e.target.value, codigoReceita: null });
                lastFetchedKey.current = '';
                setOpcoes([]);
                setOpcoesError(null);
              }}
              onBlur={() => fetchOpcoes()}
              className="w-36"
            />
            {opcoesLoading && (
              <span className="text-xs text-stone-500 animate-pulse mb-2">
                Buscando regras…
              </span>
            )}
          </div>

          {opcoesError && (
            <Alert variant="warning" message={opcoesError} onClose={() => setOpcoesError(null)} />
          )}

          {/* Select de código de receita — exibido somente quando há mais de 1 opção */}
          {opcoes.length > 1 && (
            <div className="animate-fadeIn">
              <Select
                label="Código de Receita *"
                value={group.codigoReceita != null ? String(group.codigoReceita) : ''}
                onChange={e => set({ codigoReceita: e.target.value ? Number(e.target.value) : null })}
                options={opcoes.map(o => ({
                  value: String(o.codigoReceita),
                  label: `${o.codigoReceita} — ${o.description}`,
                }))}
                className="w-full max-w-xs"
              />
              <p className="text-xs text-amber-400/80 mt-1">
                ⚠ Este EFD possui múltiplos códigos de receita. Selecione o correto para prosseguir.
              </p>
            </div>
          )}

          {/* Seleção automática */}
          {opcoes.length === 1 && group.codigoReceita != null && (
            <p className="text-xs text-emerald-400/80">
              ✔ Código de receita {group.codigoReceita} selecionado automaticamente
              — {opcoes[0].description}
            </p>
          )}

          {/* Painel de ajuste manual — por grupo */}
          {group.backendItems.length > 0 && (
            <div className="animate-fadeIn">
              <TaxAdjustmentPanel
                items={group.backendItems}
                onChange={(items, manual) =>
                  set({ manualItems: items, isManualAdjustment: manual })
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente NpItemEditor ───────────────────────────────────────────────────

interface NpItemEditorProps {
  idx: number;
  item: ItemEditState;
  total: number;
  /** Data de liquidação da NP no formato yyyy-MM-dd — usada para buscar opções de receita */
  dataLiquidacao?: string;
  /** Nome/CNPJ da empresa da NP — exibido como herança padrão */
  nomeEmpresaNp?: string;
  onChange: (idx: number, next: ItemEditState) => void;
  onRemove: (idx: number) => void;
}

export function NpItemEditor({
  idx,
  item,
  total,
  dataLiquidacao,
  nomeEmpresaNp,
  onChange,
  onRemove,
}: NpItemEditorProps) {
  // ── Estado do lookup de beneficiário ────────────────────────────────────────
  const [beneficiarioLoading, setBeneficiarioLoading] = useState(false);
  const [beneficiarioError, setBeneficiarioError] = useState<string | null>(null);

  function set(patch: Partial<ItemEditState>) {
    onChange(idx, { ...item, ...patch });
  }

  function setGroup(groupIdx: number, next: TaxGroupState) {
    const taxGroups = item.taxGroups.map((g, i) => (i === groupIdx ? next : g));
    set({ taxGroups });
  }

  function addGroup() {
    set({ taxGroups: [...item.taxGroups, { ...DEFAULT_TAX_GROUP }] });
  }

  function removeGroup(groupIdx: number) {
    if (item.taxGroups.length <= 1) return; // nunca remover o último
    set({ taxGroups: item.taxGroups.filter((_, i) => i !== groupIdx) });
  }

  // ── Lookup de empresa beneficiária por CNPJ ─────────────────────────────────
  const fetchBeneficiaria = useCallback(async () => {
    const cnpj = item.beneficiarioCnpj.replace(/\D/g, '');
    if (!cnpj) {
      set({ beneficiaria: null });
      setBeneficiarioError(null);
      return;
    }
    if (cnpj.length !== 14) {
      setBeneficiarioError('CNPJ deve ter 14 dígitos.');
      set({ beneficiaria: null });
      return;
    }

    setBeneficiarioLoading(true);
    setBeneficiarioError(null);
    const result = await findEmpresaByCnpj(cnpj);
    setBeneficiarioLoading(false);

    if (result.data) {
      set({ beneficiaria: result.data });
      setBeneficiarioError(null);
    } else {
      set({ beneficiaria: null });
      setBeneficiarioError(
        result.status === 404
          ? 'Empresa não encontrada. Cadastre-a antes de vincular.'
          : 'Erro ao buscar empresa.'
      );
    }
  }, [item.beneficiarioCnpj]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-4 animate-fadeIn">
      {/* Cabeçalho do item */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-stone-500 font-bold">
          <span className="text-amber-500 mr-1">▶</span>Item {idx + 1}
        </span>
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="text-[10px] text-red-400 hover:text-red-300 border border-red-700/40 px-2 py-0.5 rounded transition-colors"
          >
            ✕ Remover
          </button>
        )}
      </div>

      {/* Descrição + Valor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Input
            label="Descrição (opcional)"
            placeholder="Ex: Serviço de manutenção"
            value={item.description}
            onChange={e => set({ description: e.target.value })}
          />
        </div>
        <Input
          label="Valor (R$)"
          type="text"
          placeholder="Ex: 1.500,00"
          value={item.value}
          onChange={e => set({ value: e.target.value })}
        />
      </div>

      {/* Grupos de imposto */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-stone-500 font-bold">
          Tributação
        </p>

        <div className="space-y-2">
          {item.taxGroups.map((group, groupIdx) => (
            <TaxGroupEditor
              key={groupIdx}
              groupIdx={groupIdx}
              group={group}
              totalGroups={item.taxGroups.length}
              dataLiquidacao={dataLiquidacao}
              onChange={setGroup}
              onRemove={removeGroup}
            />
          ))}
        </div>

        {/* Botão de adicionar grupo de imposto */}
        <button
          type="button"
          onClick={addGroup}
          className="w-full text-xs text-amber-500/70 hover:text-amber-400 border border-dashed border-amber-700/30 hover:border-amber-500/50 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5"
        >
          <span className="text-base leading-none">+</span>
          Adicionar grupo de imposto
        </button>

        {item.taxGroups.length > 1 && (
          <p className="text-[10px] text-stone-600 text-center">
            Todos os grupos incidem sobre o mesmo valor (R${' '}
            {parseBRCurrency(item.value)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? item.value}).
            O total da NP não é duplicado.
          </p>
        )}
      </div>

      {/* ── CNPJ do Beneficiário ──────────────────────────────────────────────── */}
      <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="text-xs uppercase tracking-widest text-stone-500 font-bold">
          Beneficiário do Imposto
        </p>

        <div className="flex gap-3 items-end">
          <Input
            label="CNPJ do Beneficiário (opcional)"
            type="text"
            placeholder={nomeEmpresaNp ? `Herdará: ${nomeEmpresaNp}` : 'CNPJ sem formatação'}
            value={item.beneficiarioCnpj}
            onChange={e => {
              set({ beneficiarioCnpj: e.target.value.replace(/\D/g, ''), beneficiaria: null });
              setBeneficiarioError(null);
            }}
            onBlur={fetchBeneficiaria}
            className="w-48"
            maxLength={14}
          />
          {beneficiarioLoading && (
            <span className="text-xs text-stone-500 animate-pulse mb-2">
              Buscando empresa…
            </span>
          )}
        </div>

        {item.beneficiaria && !beneficiarioLoading && (
          <p className="text-xs text-emerald-400">
            ✔ <strong>{item.beneficiaria.nome}</strong> — {item.beneficiaria.cnpj}
          </p>
        )}

        {!item.beneficiarioCnpj && !item.beneficiaria && (
          <p className="text-xs text-stone-600 italic">
            Deixe em branco para usar o CNPJ da NP
            {nomeEmpresaNp ? ` (${nomeEmpresaNp})` : ''}.
          </p>
        )}

        {beneficiarioError && (
          <Alert variant="error" message={beneficiarioError} onClose={() => setBeneficiarioError(null)} />
        )}
      </div>
    </div>
  );
}
