import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmpresaDto, OptanteStatus, PaymentNoteItemDto, TaxCalculatedItem, TaxRuleOption } from '../types';
import TaxAdjustmentPanel from './TaxAdjustmentPanel';
import Input from './Input';
import Select from './Select';
import Alert from './Alert';
import { findEmpresaByCnpj, getOpcoesReceitaPorEfd } from '../services/api';
import { parseBRCurrency } from '../lib/utils';

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface ItemEditState {
  id?: number;
  description: string;
  value: string;
  taxTipo: OptanteStatus;
  codEfd: string;
  /** Código de receita selecionado pelo usuário (quando há múltiplas opções) */
  codigoReceita: number | null;
  backendItems: TaxCalculatedItem[];
  manualItems: TaxCalculatedItem[];
  isManualAdjustment: boolean;
  /** CNPJ do beneficiário digitado pelo usuário (diferente do CNPJ da NP) */
  beneficiarioCnpj: string;
  /** Empresa beneficiária resolvida (após lookup por CNPJ) */
  beneficiaria: EmpresaDto | null;
}

export const DEFAULT_ITEM: ItemEditState = {
  description: '',
  value: '',
  taxTipo: 'OPTANTE',
  codEfd: '',
  codigoReceita: null,
  backendItems: [],
  manualItems: [],
  isManualAdjustment: false,
  beneficiarioCnpj: '',
  beneficiaria: null,
};

export function itemToEditState(item: PaymentNoteItemDto): ItemEditState {
  return {
    id: item.id,
    description: item.description ?? '',
    value: String(item.value),
    taxTipo: item.tax?.tipo ?? 'OPTANTE',
    codEfd: item.tax?.codEfd ? String(item.tax.codEfd) : '',
    codigoReceita: item.tax?.codigoReceita ?? null,
    backendItems: item.tax?.calculatedItems?.map(i => ({ ...i })) ?? [],
    manualItems: item.tax?.calculatedItems?.map(i => ({ ...i })) ?? [],
    isManualAdjustment: item.tax?.manualAdjustment ?? false,
    beneficiarioCnpj: item.empresaBeneficiaria?.cnpj ?? '',
    beneficiaria: item.empresaBeneficiaria ?? null,
  };
}

export function editStateToItem(s: ItemEditState): PaymentNoteItemDto {
  const isManual = s.isManualAdjustment && s.manualItems.length > 0;
  return {
    ...(s.id !== undefined ? { id: s.id } : {}),
    description: s.description,
    value: parseBRCurrency(s.value) || 0,
    manualAdjustment: isManual,
    tax: {
      tipo: s.taxTipo,
      codEfd: s.taxTipo === 'NAO_OPTANTE' && s.codEfd ? parseInt(s.codEfd, 10) : null,
      ...(s.codigoReceita != null ? { codigoReceita: s.codigoReceita } : {}),
      ...(isManual
        ? { manualAdjustment: true, calculatedItems: s.manualItems }
        : {}),
    },
    empresaBeneficiaria: s.beneficiaria ?? null,
  };
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
  // ── Estado das opções de receita ────────────────────────────────────────────
  const [opcoes, setOpcoes] = useState<TaxRuleOption[]>([]);
  const [opcoesLoading, setOpcoesLoading] = useState(false);
  const [opcoesError, setOpcoesError] = useState<string | null>(null);

  // ── Estado do lookup de beneficiário ────────────────────────────────────────
  const [beneficiarioLoading, setBeneficiarioLoading] = useState(false);
  const [beneficiarioError, setBeneficiarioError] = useState<string | null>(null);

  // Ref para saber a última combinação (codEfd + dataLiquidacao) buscada
  const lastFetchedKey = useRef<string>('');

  function set(patch: Partial<ItemEditState>) {
    onChange(idx, { ...item, ...patch });
  }

  // ── Busca opções de receita para um EFD + Data ────────────────────────────
  const fetchOpcoes = useCallback(async (forcedEfd?: string, forcedDate?: string) => {
    const targetEfd = forcedEfd ?? item.codEfd;
    const targetDate = forcedDate ?? dataLiquidacao;
    const codEfdNum = parseInt(targetEfd, 10);

    if (item.taxTipo !== 'NAO_OPTANTE' || !targetEfd || isNaN(codEfdNum) || !targetDate) return;

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
      // Seleção automática quando só há 1 regra vigente
      set({ codigoReceita: lista[0].codigoReceita });
    } else if (lista.length > 1) {
      // Múltiplos códigos de receita vigentes:
      // Preserva se o item já possui um codigoReceita presente na lista
      const currentRec = item.codigoReceita;
      const existsInList = currentRec != null && lista.some(o => o.codigoReceita === currentRec);
      if (!existsInList) {
        set({ codigoReceita: null });
      }
    } else if (lista.length === 0) {
      setOpcoesError('Nenhuma regra de imposto vigente para este EFD nesta data.');
      set({ codigoReceita: null });
    }
  }, [item.taxTipo, item.codEfd, item.codigoReceita, dataLiquidacao]); // eslint-disable-line react-hooks/exhaustive-deps

  // Efeito automático para buscar opções de receita quando o tipo for NÃO OPTANTE, houver EFD e Data de Liquidação
  useEffect(() => {
    if (item.taxTipo === 'NAO_OPTANTE' && item.codEfd && dataLiquidacao) {
      const codEfdNum = parseInt(item.codEfd, 10);
      if (!isNaN(codEfdNum)) {
        fetchOpcoes(item.codEfd, dataLiquidacao);
      }
    } else if (!item.codEfd || item.taxTipo === 'OPTANTE') {
      setOpcoes([]);
      setOpcoesError(null);
      lastFetchedKey.current = '';
    }
  }, [item.taxTipo, item.codEfd, dataLiquidacao, fetchOpcoes]);

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

      {/* Tributação */}
      <div className="space-y-3">
        <div className="w-48">
          <Select
            label="Tipo de Tributação"
            value={item.taxTipo}
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

        {item.taxTipo === 'NAO_OPTANTE' && (
          <div className="animate-fadeIn space-y-3">
            {/* Campo Cód. EFD */}
            <div className="flex gap-3 items-end">
              <Input
                label="Cód. EFD"
                type="number"
                placeholder="Ex: 1708"
                value={item.codEfd}
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

            {/* Erro: EFD sem regra ativa */}
            {opcoesError && (
              <Alert variant="warning" message={opcoesError} onClose={() => setOpcoesError(null)} />
            )}

            {/* Select de código de receita — exibido somente quando há mais de 1 opção */}
            {opcoes.length > 1 && (
              <div className="animate-fadeIn">
                <Select
                  label="Código de Receita *"
                  value={item.codigoReceita != null ? String(item.codigoReceita) : ''}
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

            {/* Informação quando seleção foi automática */}
            {opcoes.length === 1 && item.codigoReceita != null && (
              <p className="text-xs text-emerald-400/80">
                ✔ Código de receita {item.codigoReceita} selecionado automaticamente
                — {opcoes[0].description}
              </p>
            )}

            {/* Painel de ajuste manual de impostos */}
            {item.backendItems.length > 0 && (
              <div className="animate-fadeIn">
                <TaxAdjustmentPanel
                  items={item.backendItems}
                  onChange={(items, manual) => set({ manualItems: items, isManualAdjustment: manual })}
                />
              </div>
            )}
          </div>
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

        {/* Empresa resolvida */}
        {item.beneficiaria && !beneficiarioLoading && (
          <p className="text-xs text-emerald-400">
            ✔ <strong>{item.beneficiaria.nome}</strong> — {item.beneficiaria.cnpj}
          </p>
        )}

        {/* Sem CNPJ informado — herança da NP */}
        {!item.beneficiarioCnpj && !item.beneficiaria && (
          <p className="text-xs text-stone-600 italic">
            Deixe em branco para usar o CNPJ da NP
            {nomeEmpresaNp ? ` (${nomeEmpresaNp})` : ''}.
          </p>
        )}

        {/* Erro no lookup */}
        {beneficiarioError && (
          <Alert variant="error" message={beneficiarioError} onClose={() => setBeneficiarioError(null)} />
        )}
      </div>
    </div>
  );
}
