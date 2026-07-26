import { useState, useMemo, Fragment } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import EditIconButton from '../../components/EditIconButton';
import TaxRuleItemEditor from '../../components/TaxRuleItemEditor';
import {
  getTaxRuleById,
  getAllTaxRules,
  updateTaxRule,
} from '../../services/api';
import type { TaxRuleDto, TaxRuleItemDto } from '../../types';
import { SectionTitle, TableContainer } from './Shared';
import { toInputDate } from '../../lib/utils';

// ── DescriptionCell ───────────────────────────────────────────────────────────

function DescriptionCell({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 60;

  if (!isLong) {
    return <span title={text}>{text}</span>;
  }

  return (
    <span>
      {expanded ? (
        <>
          <span className="break-words whitespace-pre-wrap">{text}</span>
          {' '}
          <button
            onClick={() => setExpanded(false)}
            className="text-amber-500/70 hover:text-amber-400 text-[10px] font-bold ml-1 focus:outline-none"
            title="Recolher"
          >
            ▲ menos
          </button>
        </>
      ) : (
        <>
          <span className="truncate block max-w-[200px]" title={text}>{text}</span>
          <button
            onClick={() => setExpanded(true)}
            className="text-amber-500/70 hover:text-amber-400 text-[10px] font-bold focus:outline-none"
            title="Ver descrição completa"
          >
            ▼ mais
          </button>
        </>
      )}
    </span>
  );
}

// ── Tipos locais ──────────────────────────────────────────────────────────────

type Mode = 'idle' | 'edit-details';

// ── Helper: vigência em aberto ─────────────────────────────────────────────

function isOpen(rule: TaxRuleDto): boolean {
  return !rule.dataFimVigencia;
}



// ── Componente ────────────────────────────────────────────────────────────────

export default function BuscaTaxRule() {
  const [sId, setSId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lista completa
  const [allResults, setAllResults] = useState<TaxRuleDto[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Regra selecionada + modo de operação
  const [selected, setSelected] = useState<TaxRuleDto | null>(null);
  const [mode, setMode] = useState<Mode>('idle');

  // Campos do formulário (edit-details e new-version)
  const [description, setDescription] = useState('');
  const [codigoReceita, setCodigoReceita] = useState('');
  const [inicioVigencia, setInicioVigencia] = useState('');  // YYYY-MM-DD (input)
  const [fimVigencia, setFimVigencia] = useState('');        // YYYY-MM-DD (input)
  const [items, setItems] = useState<TaxRuleItemDto[]>([]);

  // Feedback
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Agrupamento por codEfd ─────────────────────────────────────────────────

  const groupedByCodEfd = useMemo(() => {
    const map = new Map<number, TaxRuleDto[]>();
    for (const rule of allResults) {
      const group = map.get(rule.codEfd) ?? [];
      group.push(rule);
      map.set(rule.codEfd, group);
    }
    // Ordenar versões de cada grupo: mais recente primeiro
    for (const [cod, versions] of map) {
      map.set(
        cod,
        versions.sort((a, b) => {
          const toTs = (d: string) => {
            const [day, mon, yr] = d.split('/');
            return new Date(`${yr}-${mon}-${day}`).getTime();
          };
          return toTs(b.dataInicioVigencia) - toTs(a.dataInicioVigencia);
        })
      );
    }
    return map;
  }, [allResults]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  function resetState() {
    setError(null);
    setAllResults([]);
    setShowAll(false);
    setSelected(null);
    setMode('idle');
    setSaveError(null);
    setSuccess(null);
  }

  function closeForm() {
    setMode('idle');
    setSelected(null);
    setSaveError(null);
    if (allResults.length > 0) setShowAll(true);
  }

  // ── Abrir formulários ──────────────────────────────────────────────────────

  function openEditDetails(rule: TaxRuleDto) {
    setSelected(rule);
    setDescription(rule.description);
    setCodigoReceita(String(rule.codigoReceita));
    setInicioVigencia(toInputDate(rule.dataInicioVigencia));
    setFimVigencia(rule.dataFimVigencia ? toInputDate(rule.dataFimVigencia) : '');
    setItems(rule.items.map(it => ({ ...it })));
    setMode('edit-details');
    setShowAll(false);
    setSaveError(null);
    setSuccess(null);
  }



  // ── Busca ─────────────────────────────────────────────────────────────────

  async function handleSearchById() {
    if (!sId) { setError('Informe o ID da regra.'); return; }
    resetState();
    setLoading(true);
    const res = await getTaxRuleById(parseInt(sId, 10));
    if (res.data) {
      setAllResults([res.data]);
      setShowAll(true);
    } else {
      setError(res.errorMessage ?? 'Regra não encontrada.');
    }
    setLoading(false);
  }

  async function handleGetAll() {
    resetState();
    setLoading(true);
    const res = await getAllTaxRules();
    if (res.data && res.data.length > 0) {
      setAllResults(res.data);
      setShowAll(true);
    } else {
      setError('Nenhuma regra de imposto encontrada.');
    }
    setLoading(false);
  }

  // ── Salvar — Editar Detalhes (PUT) ────────────────────────────────────────

  async function handleSaveEditDetails() {
    if (!selected || selected.id === undefined) return;
    if (!description.trim()) { setSaveError('A descrição é obrigatória.'); return; }
    if (description.trim().length > 300) { setSaveError('A descrição deve ter no máximo 300 caracteres.'); return; }
    if (!codigoReceita) { setSaveError('O Código de Receita é obrigatório.'); return; }
    if (!inicioVigencia) { setSaveError('A data de início de vigência é obrigatória.'); return; }
    if (items.some(it => !it.taxType.trim())) { setSaveError('Todos os tipos de imposto devem ser preenchidos.'); return; }

    setSaving(true); setSaveError(null);
    const res = await updateTaxRule(selected.id, {
      codigoReceita: parseInt(codigoReceita, 10),
      description: description.trim(),
      dataInicioVigencia: inicioVigencia,  // formatDate é aplicado dentro de updateTaxRule
      dataFimVigencia: fimVigencia || null,
      items,
    });
    if (res.data) {
      setSuccess('Regra atualizada com sucesso!');
      // Atualizar item na lista local
      setAllResults(prev => prev.map(r => r.id === res.data!.id ? res.data! : r));
      setTimeout(() => { setSuccess(null); closeForm(); }, 2000);
    } else {
      setSaveError(res.errorMessage ?? 'Erro ao atualizar.');
    }
    setSaving(false);
  }

  const handleSave = handleSaveEditDetails;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Painel de busca */}
      <div className="glass-panel p-5">
        <SectionTitle>Buscar Regra de Imposto</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="ID da Regra"
            type="number"
            placeholder="1"
            value={sId}
            onChange={(e) => { setSId(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchById()}
            className="w-full sm:w-36"
          />
          <Button variant="ghost" size="md" loading={loading} onClick={handleSearchById}>
            🔍 Buscar por ID
          </Button>
          <Button variant="ghost" size="md" loading={loading} onClick={handleGetAll}>
            🔍 Buscar Todas
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {/* ── Formulário: Editar Detalhes / Nova Versão / Encerrar Vigência ── */}
      {mode !== 'idle' && selected && (
        <div className="glass-panel p-5 animate-fadeIn space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-center gap-3">
            <SectionTitle>Editar Detalhes da Regra</SectionTitle>
            <span className="text-amber-400 font-mono text-xs">ID #{selected.id}</span>
          </div>

          {/* Cód. EFD e Cód. Receita — sempre somente leitura */}
          <div className="flex items-center gap-6 p-3 rounded-lg border border-white/10 bg-black/20 max-w-md">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 font-bold">Cód. EFD</p>
              <p className="text-amber-400 font-mono font-bold text-lg">{selected.codEfd}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 font-bold">Cód. Receita</p>
              <input
                type="number"
                value={codigoReceita}
                onChange={e => setCodigoReceita(e.target.value)}
                placeholder="1001"
                className="w-24 rounded border border-white/10 bg-black/40 text-amber-300 font-mono font-bold px-2 py-0.5 text-sm focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <p className="text-stone-600 text-xs self-end">EFD não editável</p>
          </div>

          {/* Campos do formulário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Descrição <span className="text-amber-500">*</span>
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-black/60 border border-white/20 text-gray-200 text-sm rounded-md px-3 py-2 placeholder-stone-500 focus:outline-none focus:ring-2 focus:border-amber-500 focus:ring-amber-500/30 transition-all duration-150 resize-none"
              />
              <p className="text-xs text-stone-600">Descrição: {description.length}/300 caracteres</p>
            </div>
          </div>

          {/* Datas de vigência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {/* Início de Vigência */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-stone-500 font-bold">
                Início de Vigência <span className="text-amber-500">*</span>
              </label>
              <input
                type="date"
                value={inicioVigencia}
                readOnly
                className="rounded-lg border border-white/10 bg-black/40 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
              />
              <p className="text-xs text-stone-600">Início de vigência não pode ser alterado neste modo.</p>
            </div>

            {/* Fim de Vigência */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-stone-500 font-bold">
                Fim de Vigência <span className="text-stone-600 ml-1">(opcional)</span>
              </label>
              <input
                type="date"
                value={fimVigencia}
                onChange={e => setFimVigencia(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
              />
              <p className="text-xs text-stone-600">Deixe em branco se a regra não tem previsão de encerramento.</p>
            </div>
          </div>

          {/* Itens de imposto */}
          <div className="max-w-2xl">
            <SectionTitle>Itens de Imposto</SectionTitle>
            <TaxRuleItemEditor items={items} onChange={setItems} />
          </div>



          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleSave} loading={saving}>Salvar Alterações</Button>
            <Button variant="ghost" onClick={closeForm}>Cancelar</Button>
          </div>

          {saveError && <Alert variant="error" message={saveError} onClose={() => setSaveError(null)} />}
          {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}
        </div>
      )}

      {/* ── Tabela agrupada por codEfd ── */}
      {showAll && mode === 'idle' && allResults.length > 0 && (
        <TableContainer title="Regras de Imposto" count={allResults.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-stone-500 text-xs uppercase tracking-wider border-b border-white/10 bg-black/40">
                  <th className="py-2.5 px-3 font-semibold">ID</th>
                  <th className="py-2.5 px-3 font-semibold">Cód. Receita</th>
                  <th className="py-2.5 px-3 font-semibold">Descrição</th>
                  <th className="py-2.5 px-3 font-semibold">Início Vigência</th>
                  <th className="py-2.5 px-3 font-semibold">Fim Vigência</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Impostos</th>
                  <th className="py-2.5 px-3 w-8 font-semibold">✏️</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(groupedByCodEfd.entries()).map(([codEfd, versions]) => {
                  const activeVersion = versions.find(v => isOpen(v));
                  return (
                    <Fragment key={codEfd}>
                      {/* Cabeçalho do grupo */}
                      <tr className="bg-black/40 border-b border-white/5">
                        <td colSpan={8} className="py-2 px-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs uppercase tracking-widest text-stone-500 font-bold">Cód. EFD</span>
                            <span className="text-amber-400 font-mono font-bold text-base">{codEfd}</span>
                            {activeVersion && (
                              <>
                                <span className="text-stone-600 text-xs">|</span>
                                <span className="text-xs uppercase tracking-widest text-stone-500 font-bold">Cód. Receita</span>
                                <span className="text-amber-300 font-mono font-bold text-sm">{activeVersion.codigoReceita}</span>
                              </>
                            )}
                            <span className="text-stone-500 text-xs ml-auto">{versions.length} versão(ões)</span>
                          </div>
                        </td>
                      </tr>
                      {/* Versões do grupo */}
                      {versions.map((rule) => {
                        const open = isOpen(rule);
                        return (
                          <tr
                            key={rule.id}
                            className={`border-b border-stone-800/50 hover:bg-stone-800/20 ${!open ? 'opacity-60' : ''}`}
                          >
                            <td className="py-2 px-3 text-amber-300 font-mono text-sm">{rule.id}</td>
                            <td className="py-2 px-3 text-amber-400 font-mono font-bold text-sm">{rule.codigoReceita}</td>
                            <td className="py-2 px-3 text-gray-300 text-sm max-w-[220px]">
                              <DescriptionCell text={rule.description} />
                            </td>
                            <td className="py-2 px-3 text-gray-300 font-mono text-sm">{rule.dataInicioVigencia}</td>
                            <td className="py-2 px-3 font-mono text-sm">
                              {rule.dataFimVigencia
                                ? <span className="text-stone-400">{rule.dataFimVigencia}</span>
                                : <span className="text-emerald-400">—</span>
                              }
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wider ${
                                open
                                  ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50'
                                  : 'text-stone-500 bg-stone-900/30 border-stone-700/50'
                              }`}>
                                {open ? 'Em Vigor' : 'Encerrada'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-stone-400 text-sm">
                              {rule.items.length > 0 ? rule.items.map(it => it.taxType).join(', ') : '—'}
                            </td>
                            <td className="py-2 px-3 w-8">
                              <EditIconButton
                                onClick={() => openEditDetails(rule)}
                                title="Editar detalhes desta versão"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TableContainer>
      )}
    </div>
  );
}
