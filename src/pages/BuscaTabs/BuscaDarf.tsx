import React, { useState } from 'react';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import Select from '../../components/Select';
import Input from '../../components/Input';
import { SectionTitle } from './Shared';
import { getPaymentEmpenhoByMesAno } from '../../services/api';
import type { EmpresaDto, PaymentNoteVinculacaoDto, PaymentNoteItemDto, TaxCalculatedItem } from '../../types';
import { formatCurrency, formatCNPJ } from '../../lib/utils';

// ── Constantes ────────────────────────────────────────────────────────────────

const MONTH_OPTIONS = [
  { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' }, { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

const PAGE_SIZE = 200;

/** Retorna o último dia do mês para a data de pagamento DARF */
function lastDayOfMonth(mes: number, ano: number): string {
  const d = new Date(ano, mes, 0); // dia 0 do mês seguinte = último dia do mês atual
  return `${String(d.getDate()).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
}

// ── Tipos de agrupamento ───────────────────────────────────────────────────────

interface NpRow {
  np: PaymentNoteVinculacaoDto;
  item: PaymentNoteItemDto;
  calc: TaxCalculatedItem[];
  /** Empresa real que é o beneficiário do imposto retido neste item */
  empresaBeneficiaria: EmpresaDto;
}

interface EmpresaGroup {
  /** CNPJ do beneficiário do imposto (pode ser diferente do CNPJ da NP) */
  cnpj: string;
  nome: string;
  rows: NpRow[];
  totalBruto: number;
  totalBaseCalculo: number;
  totalIr: number;
  totalCsll: number;
  totalCofins: number;
  totalPis: number;
  totalDarf: number;
  totalRetAgr: number;
}

interface CodigoGroup {
  codigoReceita: number | null;
  empresas: EmpresaGroup[];
  totalBruto: number;
  totalBaseCalculo: number;
  totalImpostos: number;
  qtdNps: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normaliza o taxType para comparação: uppercase, remove /, _, espaço e hífen. */
function normTaxType(s: string): string {
  const val = s.toUpperCase().replace(/[\/\-_\s]/g, '');
  if (val === 'CLSS' || val === 'CSSL' || val === 'CSL') return 'CSLL';
  return val;
}

/**
 * Busca o valor de um imposto pelo taxType.
 * Tenta match exato primeiro; cai em match normalizado como fallback
 * para tolerar variações do backend (PIS_PASEP vs PIS/PASEP vs PIS PASEP).
 */
function getCalc(calc: TaxCalculatedItem[], type: string): number {
  const exact = calc.find(c => c.taxType === type);
  if (exact) return exact.amount;
  const norm = normTaxType(type);
  const fuzzy = calc.find(c => normTaxType(c.taxType) === norm);
  if (fuzzy) {
    console.warn(`[DARF] taxType fuzzy match: buscado="${type}", encontrado="${fuzzy.taxType}"`);
  }
  return fuzzy?.amount ?? 0;
}

function buildGroups(results: PaymentNoteVinculacaoDto[]): CodigoGroup[] {
  // ── 1. Deduplicar NPs por numeroNp ──
  // Uma NP pode vir duplicada no results se estiver associada a múltiplos empenhos.
  // Como os impostos incidem apenas sobre a NP, processamos cada numeroNp apenas uma vez,
  // juntando os IDs de vinculação para exibição, se houver.
  const uniqueNpsMap = new Map<number, PaymentNoteVinculacaoDto>();
  for (const np of results) {
    const npKey = np.id ?? Number(np.numeroNp);
    if (!uniqueNpsMap.has(npKey)) {
      uniqueNpsMap.set(npKey, { ...np });
    } else {
      const existing = uniqueNpsMap.get(npKey)!;
      // Junta os vinculations como string para exibir todos (gambiarra segura para exibição visual)
      const exVinc = String(existing.vinculation);
      const newVinc = String(np.vinculation);
      if (!exVinc.includes(newVinc)) {
        existing.vinculation = (exVinc + ' / ' + newVinc) as any;
      }
    }
  }
  const uniqueResults = Array.from(uniqueNpsMap.values());

  // Chave: codigoReceita (não agrupa mais por codEfd)
  const codigoMap = new Map<string, {
    codigoReceita: number | null;
    empresaMap: Map<string, { nome: string; rows: NpRow[] }>;
  }>();

  for (const np of uniqueResults) {
    const allItems = np.items ?? [];
    
    // Deduplica itens pelo ID para evitar duplicações causadas por joins no backend (produto cartesiano do Hibernate)
    const seenItemIds = new Set<number>();
    const uniqueItems: PaymentNoteItemDto[] = [];
    for (const it of allItems) {
      if (it.id !== undefined) {
        if (seenItemIds.has(it.id)) continue;
        seenItemIds.add(it.id);
      }
      uniqueItems.push(it);
    }

    const naoOptanteItems = uniqueItems.filter(it => it.tax?.tipo === 'NAO_OPTANTE');
    const fallbackItems = naoOptanteItems.length > 0 ? naoOptanteItems : uniqueItems.slice(0, 1);

    // Agrupa os itens da mesma NP por codigoReceita
    const itemsByReceita = new Map<number | null, PaymentNoteItemDto[]>();
    for (const item of fallbackItems) {
      const codRec = item.tax?.codigoReceita ?? null;
      if (!itemsByReceita.has(codRec)) {
        itemsByReceita.set(codRec, []);
      }
      itemsByReceita.get(codRec)!.push(item);
    }

    // Para cada codigoReceita, cria uma única linha consolidando os itens
    for (const [codRec, itemsInReceita] of itemsByReceita) {
      const key = String(codRec ?? 'SEM');
      if (!codigoMap.has(key)) {
        codigoMap.set(key, {
          codigoReceita: codRec,
          empresaMap: new Map(),
        });
      }
      const grupo = codigoMap.get(key)!;

      // Usa a empresa beneficiária do item quando disponível (nova feature);
      // caso contrário, herda a empresa da própria NP (comportamento original).
      // Como todos os itens em itemsInReceita compartilham o mesmo codRec,
      // usamos o primeiro item para determinar o beneficiário do grupo.
      const primItem = itemsInReceita[0];
      const empresaReal: EmpresaDto = primItem.empresaBeneficiaria ?? np.empresa;
      const cnpj = empresaReal.cnpj;

      if (!grupo.empresaMap.has(cnpj)) {
        grupo.empresaMap.set(cnpj, { nome: empresaReal.nome, rows: [] });
      }

      // Consolda o valor dos itens desse código de receita
      const mergedValue = itemsInReceita.reduce((sum, it) => sum + it.value, 0);

      // Consolida os impostos calculados
      const calcMap = new Map<string, TaxCalculatedItem>();
      for (const it of itemsInReceita) {
        const calcs = it.tax?.calculatedItems ?? [];
        for (const c of calcs) {
          const norm = normTaxType(c.taxType);
          if (!calcMap.has(norm)) {
            calcMap.set(norm, { taxType: c.taxType, rate: c.rate, amount: 0 });
          }
          calcMap.get(norm)!.amount += c.amount;
        }
      }
      const mergedCalc = Array.from(calcMap.values());

      // Combina as descrições
      const descriptions = itemsInReceita
        .map(it => it.tax?.taxRuleDescription)
        .filter((desc): desc is string => typeof desc === 'string' && desc.trim().length > 0);
      const uniqueDescriptions = Array.from(new Set(descriptions));
      const mergedDesc = uniqueDescriptions.join(' | ') || null;

      const mergedItem: PaymentNoteItemDto = {
        value: mergedValue,
        tax: {
          tipo: itemsInReceita[0].tax?.tipo ?? 'NAO_OPTANTE',
          codEfd: itemsInReceita[0].tax?.codEfd ?? null,
          codigoReceita: codRec ?? undefined,
          taxRuleDescription: mergedDesc,
          calculatedItems: mergedCalc,
        },
        // Propaga o beneficiário real para que a tabela possa exibi-lo
        empresaBeneficiaria: primItem.empresaBeneficiaria ?? null,
      };

      grupo.empresaMap.get(cnpj)!.rows.push({ np, item: mergedItem, calc: mergedCalc, empresaBeneficiaria: empresaReal });
    }
  }

  const result: CodigoGroup[] = [];
  for (const [, cod] of codigoMap) {
    const empresas: EmpresaGroup[] = [];
    let codTotalBruto = 0;
    let codTotalBaseCalculo = 0;
    let codTotalImpostos = 0;
    let codNps = 0;

    for (const [cnpj, emp] of cod.empresaMap) {
      let totalBruto = 0, totalBaseCalculo = 0, totalIr = 0, totalCsll = 0, totalCofins = 0, totalPis = 0, totalDarf = 0;
      const seenNps = new Set<number>();
      
      for (const row of emp.rows) {
        // Soma Val. Bruto (np.value) apenas UMA vez por NP no grupo
        const npKey = row.np.id ?? Number(row.np.numeroNp);
        if (!seenNps.has(npKey)) {
          totalBruto += row.np.value;
          seenNps.add(npKey);
        }
        
        totalBaseCalculo += row.item.value;
        totalIr     += getCalc(row.calc, 'IR');
        totalCsll   += getCalc(row.calc, 'CSLL');
        totalCofins += getCalc(row.calc, 'COFINS');
        totalPis    += getCalc(row.calc, 'PIS_PASEP');
        totalDarf   += getCalc(row.calc, 'DARF');
      }
      const totalRetAgr = totalCsll + totalCofins + totalPis;
      empresas.push({ cnpj, nome: emp.nome, rows: emp.rows, totalBruto, totalBaseCalculo, totalIr, totalCsll, totalCofins, totalPis, totalDarf, totalRetAgr });
      codTotalBruto += totalBruto;
      codTotalBaseCalculo += totalBaseCalculo;
      codTotalImpostos += totalIr + totalCsll + totalCofins + totalPis;
      codNps += seenNps.size; // Qnt. = quantidade de NPs únicas no grupo
    }

    result.push({
      codigoReceita: cod.codigoReceita,
      empresas,
      totalBruto: codTotalBruto,
      totalBaseCalculo: codTotalBaseCalculo,
      totalImpostos: codTotalImpostos,
      qtdNps: codNps,
    });
  }

  return result;
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Val({ v, className = '' }: { v: number; className?: string }) {
  if (v === 0) return <span className="text-stone-600">—</span>;
  return <span className={className || 'text-gray-200'}>{formatCurrency(v)}</span>;
}

/** Tabela unificada de um grupo — NPs listadas por empresa, totais somente no rodapé */
function GroupTable({ g, expanded }: { g: CodigoGroup; expanded: boolean }) {
  const hasIr     = g.empresas.some(e => e.totalIr > 0);
  const hasCsll   = g.empresas.some(e => e.totalCsll > 0);
  const hasCofins = g.empresas.some(e => e.totalCofins > 0);
  const hasPis    = g.empresas.some(e => e.totalPis > 0);
  const hasRetAgr = g.empresas.some(e => e.totalRetAgr > 0);

  // Totais do GRUPO INTEIRO (todas as empresas somadas)
  const grpBruto       = g.totalBruto;
  const grpBaseCalculo = g.totalBaseCalculo;
  const grpDarf   = g.empresas.reduce((s, e) => s + e.totalIr + e.totalCsll + e.totalCofins + e.totalPis, 0);
  const grpIr     = g.empresas.reduce((s, e) => s + e.totalIr, 0);
  const grpCsll   = g.empresas.reduce((s, e) => s + e.totalCsll, 0);
  const grpCofins = g.empresas.reduce((s, e) => s + e.totalCofins, 0);
  const grpPis    = g.empresas.reduce((s, e) => s + e.totalPis, 0);
  const grpRetAgr = g.empresas.reduce((s, e) => s + e.totalRetAgr, 0);

  const thCls = 'px-2 py-1.5 text-left text-[9px] uppercase tracking-widest text-stone-500 font-bold whitespace-nowrap';
  const tdCls = 'px-2 py-2 text-xs whitespace-nowrap';
  // 5 colunas de identificação + 3 fixas numéricas + impostos dinâmicos
  const ID_COLS = 5; // favorecido, empresa, nº np, vinculação, doc.orig
  const NUM_COLS = 3 + (hasIr?1:0) + (hasCsll?1:0) + (hasCofins?1:0) + (hasPis?1:0) + (hasRetAgr?1:0);
  const totalCols = ID_COLS + NUM_COLS;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-stone-900/30">
            <th className={thCls}>Favorecido</th>
            <th className={thCls}>Empresa</th>
            <th className={thCls}>Nº NP</th>
            <th className={thCls}>Vinculação</th>
            <th className={thCls}>Doc. Orig.</th>
            <th className={`${thCls} text-right`}>Val. Bruto</th>
            <th className={`${thCls} text-right`}>Base Cálc.</th>
            <th className={`${thCls} text-right`}>DARF</th>
            {hasIr     && <th className={`${thCls} text-right`}>IR</th>}
            {hasCsll   && <th className={`${thCls} text-right`}>CSLL</th>}
            {hasCofins && <th className={`${thCls} text-right`}>COFINS</th>}
            {hasPis    && <th className={`${thCls} text-right`}>PIS/PASEP</th>}
            {hasRetAgr && <th className={`${thCls} text-right`}>Ret. Agr.</th>}
          </tr>
        </thead>
        <tbody>
          {g.empresas.map((emp, eIdx) => (
            <React.Fragment key={eIdx}>
              {/* ── Linha separadora de empresa ── */}
              <tr className="bg-stone-900/60 border-t border-white/8">
                <td colSpan={totalCols} className="px-3 py-0.5">
                  <span className="text-amber-500 font-bold text-[10px] uppercase tracking-wide">{emp.nome}</span>
                  <span className="text-stone-600 font-mono text-[9px] ml-2">{formatCNPJ(emp.cnpj)}</span>
                </td>
              </tr>

              {expanded
                ? emp.rows.map((row, idx) => {
                    const ir      = getCalc(row.calc, 'IR');
                    const csll    = getCalc(row.calc, 'CSLL');
                    const cofins  = getCalc(row.calc, 'COFINS');
                    const pis     = getCalc(row.calc, 'PIS_PASEP');
                    const darfRow = ir + csll + cofins + pis;
                    const retAgr  = csll + cofins + pis;
                    // Beneficiário real do imposto (pode diferir da empresa da NP)
                    const benef = row.empresaBeneficiaria;
                    const isBenefDiferente = benef.cnpj !== row.np.empresa.cnpj;
                    return (
                      <tr key={idx} className="border-b border-white/5 hover:bg-stone-800/20">
                        <td className={`${tdCls} text-stone-500 font-mono text-[10px]`}>
                          {formatCNPJ(benef.cnpj)}
                          {isBenefDiferente && (
                            <span className="block text-[8px] text-sky-500/70 normal-case tracking-normal" title="Beneficiário diferente do CNPJ da NP">
                              ≠ NP: {formatCNPJ(row.np.empresa.cnpj)}
                            </span>
                          )}
                        </td>
                        <td className={`${tdCls} text-gray-400`}>
                          {benef.nome}
                          {isBenefDiferente && (
                            <span className="block text-[9px] text-stone-600 italic">
                              NP: {row.np.empresa.nome}
                            </span>
                          )}
                        </td>
                        <td className={`${tdCls}`}>
                          <span className="text-amber-400 font-bold block">NP {row.np.numeroNp}</span>
                          {row.item.tax?.taxRuleDescription && (
                            <span className="text-[9px] text-stone-500 italic block mt-0.5 truncate max-w-[200px]" title={row.item.tax.taxRuleDescription}>
                              {row.item.tax.taxRuleDescription}
                            </span>
                          )}
                        </td>
                        <td className={`${tdCls} text-amber-300`}>{row.np.vinculation}</td>
                        <td className={`${tdCls} text-gray-400`}>{row.np.docOrigin}</td>
                        <td className={`${tdCls} text-right text-gray-200`}>{formatCurrency(row.np.value)}</td>
                        <td className={`${tdCls} text-right text-gray-200`}>{formatCurrency(row.item.value)}</td>
                        <td className={`${tdCls} text-right`}><Val v={darfRow} className="text-amber-300 font-bold" /></td>
                        {hasIr     && <td className={`${tdCls} text-right`}><Val v={ir} /></td>}
                        {hasCsll   && <td className={`${tdCls} text-right`}><Val v={csll} /></td>}
                        {hasCofins && <td className={`${tdCls} text-right`}><Val v={cofins} /></td>}
                        {hasPis    && <td className={`${tdCls} text-right`}><Val v={pis} /></td>}
                        {hasRetAgr && <td className={`${tdCls} text-right`}><Val v={retAgr} className="text-amber-200" /></td>}
                      </tr>
                    );
                  })
                // Modo recolhido
                : emp.rows.map((row, idx) => {
                    const benef = row.empresaBeneficiaria;
                    const isBenefDiferente = benef.cnpj !== row.np.empresa.cnpj;
                    return (
                      <tr key={idx} className="border-b border-white/5 hover:bg-stone-800/20">
                        <td className={`${tdCls} text-stone-500 font-mono text-[10px]`}>
                          {formatCNPJ(benef.cnpj)}
                          {isBenefDiferente && (
                            <span className="block text-[8px] text-sky-500/70 normal-case tracking-normal">
                              ≠ NP: {formatCNPJ(row.np.empresa.cnpj)}
                            </span>
                          )}
                        </td>
                        <td className={`${tdCls} text-gray-400`}>{benef.nome}</td>
                        <td className={`${tdCls} text-amber-400 font-bold`}>NP {row.np.numeroNp}</td>
                        <td className={`${tdCls} text-amber-300`}>{row.np.vinculation}</td>
                        <td className={`${tdCls} text-gray-400`}>{row.np.docOrigin}</td>
                        <td colSpan={NUM_COLS} />
                      </tr>
                    );
                  })
              }
            </React.Fragment>
          ))}

          {/* ── Rodapé: Total Geral do Grupo (soma de TODAS as empresas) ── */}
          <tr className="bg-amber-950/40 border-t-2 border-amber-600/40">
            <td colSpan={ID_COLS} className="px-3 py-2 text-[9px] uppercase tracking-widest text-amber-500 font-black">
              Total Geral — Cód. {g.codigoReceita ?? '—'}
            </td>
            <td className="px-2 py-2 text-right text-amber-300 font-black text-xs">{formatCurrency(grpBruto)}</td>
            <td className="px-2 py-2 text-right text-amber-300 font-black text-xs">{formatCurrency(grpBaseCalculo)}</td>
            <td className="px-2 py-2 text-right text-amber-300 font-black text-xs">{formatCurrency(grpDarf)}</td>
            {hasIr     && <td className="px-2 py-2 text-right text-gray-200 font-bold text-xs">{formatCurrency(grpIr)}</td>}
            {hasCsll   && <td className="px-2 py-2 text-right text-gray-200 font-bold text-xs">{formatCurrency(grpCsll)}</td>}
            {hasCofins && <td className="px-2 py-2 text-right text-gray-200 font-bold text-xs">{formatCurrency(grpCofins)}</td>}
            {hasPis    && <td className="px-2 py-2 text-right text-gray-200 font-bold text-xs">{formatCurrency(grpPis)}</td>}
            {hasRetAgr && <td className="px-2 py-2 text-right text-amber-200 font-black text-xs">{formatCurrency(grpRetAgr)}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function BuscaDarf() {
  const [mes, setMes]         = useState('');
  const [ano, setAno]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [results, setResults] = useState<PaymentNoteVinculacaoDto[]>([]);
  const [searched, setSearched]               = useState(false);
  const [expandedGroups, setExpandedGroups]   = useState<Set<string>>(new Set());

  async function fetchAll() {
    const mesNum = parseInt(mes, 10);
    const anoNum = parseInt(ano, 10);
    if (!mesNum || mesNum < 1 || mesNum > 12) { setError('Selecione um mês válido.'); return; }
    if (!anoNum || anoNum < 1900 || anoNum > 2100) { setError('Informe um ano válido.'); return; }
    setLoading(true); setError(null);
    const result = await getPaymentEmpenhoByMesAno(mesNum, anoNum, 0, PAGE_SIZE);
    if (result.data) {
      const d = result.data as any;
      setResults(d.content ?? []);
      setSearched(true);
    } else {
      setError(result.errorMessage ?? 'Erro ao buscar relatório.');
    }
    setLoading(false);
  }

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const mesNum   = parseInt(mes, 10);
  const anoNum   = parseInt(ano, 10);
  const mesLabel = MONTH_OPTIONS.find(m => m.value === mes)?.label ?? '';
  const dataPag  = mesNum && anoNum ? lastDayOfMonth(mesNum, anoNum) : '—';

  const groups = buildGroups(results);

  const totalNps       = new Set(results.map(r => r.numeroNp)).size;
  const totalGrupos    = groups.length;
  const totalImpostos  = groups.reduce((s, g) => s + g.totalImpostos, 0);

  return (
    <div className="space-y-5">

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="glass-panel p-4">
        <SectionTitle>Relatório DARF por Mês/Ano</SectionTitle>
        <div className="flex flex-wrap items-end gap-3 mt-3">
          <Select
            label="Mês"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="w-full sm:w-44"
            options={[{ value: '', label: 'Selecione o mês' }, ...MONTH_OPTIONS]}
          />
          <Input
            label="Ano"
            type="number"
            placeholder="Ex: 2025"
            value={ano}
            onChange={e => setAno(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchAll()}
            className="w-full sm:w-32"
          />
          <Button variant="primary" size="md" loading={loading} onClick={fetchAll} className="mb-0.5">
            🔍 Gerar Relatório
          </Button>
        </div>
        {error && <div className="mt-3"><Alert variant="error" message={error} onClose={() => setError(null)} /></div>}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-stone-500 text-sm tracking-widest uppercase">Gerando relatório...</p>
          </div>
        </div>
      )}

      {/* ── Resultados ──────────────────────────────────────────────────────── */}
      {searched && !loading && (
        results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-600 gap-2">
            <span className="text-4xl">📋</span>
            <p className="text-sm tracking-widest uppercase">Nenhuma nota encontrada para o período.</p>
          </div>
        ) : (
          <>
            {/* ── 1. Painel de Informações Gerais ─────────────────────────── */}
            <div className="glass-panel p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">Total de Notas</p>
                  <p className="text-amber-400 font-black text-3xl">{totalNps}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">Grupos (Cód. Receita)</p>
                  <p className="text-amber-400 font-black text-3xl">{totalGrupos}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">Soma dos Impostos</p>
                  <p className="text-amber-400 font-black text-xl">{formatCurrency(totalImpostos)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">Período</p>
                  <p className="text-gray-200 font-black text-2xl">{mesLabel.substring(0, 3).toUpperCase()}/{String(anoNum).slice(2)}</p>
                </div>
              </div>
            </div>

            {/* ── 2. Prévia dos grupos ─────────────────────────────────────── */}
            <div className="glass-panel p-4">
              <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-3 font-bold">Prévia — Totais por Código de Receita</p>
              <div className="space-y-1.5">
                {groups.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-amber-400 font-black font-mono text-sm w-14 shrink-0">
                      {g.codigoReceita ?? 'S/C'}
                    </span>
                    <div className="flex-1 border-b border-dotted border-stone-700 mx-1" />
                    <span className="text-amber-300 font-bold text-sm">{formatCurrency(g.totalImpostos)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. Grupos detalhados ─────────────────────────────────────── */}
            <div className="space-y-4">
              {groups.map((g, gIdx) => {
                const gKey = String(g.codigoReceita ?? gIdx);
                const isExpanded = expandedGroups.has(gKey);
                return (
                  <div key={gKey} className="glass-panel overflow-hidden">
                    {/* Cabeçalho do grupo */}
                    <div className="px-4 py-3 bg-amber-950/30 border-b border-amber-700/20">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Cód. Receita</span>
                          <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black font-mono text-base">
                            {g.codigoReceita ?? '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-stone-500">
                          <span className="uppercase tracking-widest">Qnt.</span>
                          <span className="text-amber-400 font-bold">{g.qtdNps}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-stone-500">
                          <span className="uppercase tracking-widest">Valor Total Retido:</span>
                          <span className="text-amber-400 font-bold">{formatCurrency(g.totalImpostos)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-stone-500">
                          <span className="uppercase tracking-widest">Data Pag.:</span>
                          <span className="text-gray-300 font-bold">{dataPag}</span>
                        </div>
                        <button
                          onClick={() => toggleGroup(gKey)}
                          className="ml-auto text-[10px] uppercase tracking-widest px-3 py-1 rounded border border-amber-600/30 bg-amber-900/20 text-amber-400 hover:bg-amber-800/30 transition-colors font-bold"
                        >
                          {isExpanded ? '▲ Recolher' : '▼ Expandir'}
                        </button>
                      </div>
                    </div>

                    {/* Tabela única do grupo com todas as empresas */}
                    <div className="overflow-hidden">
                      <GroupTable g={g} expanded={isExpanded} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )
      )}
    </div>
  );
}
