import { useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import EditIconButton from '../../components/EditIconButton';
import PaginationControls from '../../components/PaginationControls';
import { findFinancialPlanningByNumber, getAllFinancialPlanning, updateFinancialPlanning } from '../../services/api';
import type { FinancialPlanningDto } from '../../types';
import { formatDate, toInputDate } from '../../lib/utils';
import { SectionTitle, TableContainer } from './Shared';
import { useEntitySearch } from '../../hooks/useEntitySearch';

export default function BuscaFinancialPlanning() {
  const [sNumero, setSNumero] = useState('');
  const [sAno, setSAno]       = useState('');
  const [numero, setNumero]   = useState('');
  const [data, setData]       = useState('');
  const [vinculation, setVinculation] = useState('');
  const [origin, setOrigin]   = useState('');

  const {
    loading, error, setError,
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
  } = useEntitySearch<FinancialPlanningDto>();

  const handleEdit = (e: FinancialPlanningDto) => {
    setFound(e);
    setNumero(String(e.numero));
    setData(toInputDate(e.data));
    setVinculation(String(e.vinculation));
    setOrigin(String(e.origin));
    setEditing(true);
  };

  const handleSave = () => {
    if (!found) return;
    const payload: FinancialPlanningDto = {
      ...found,
      numero: parseInt(numero, 10),
      data,
      vinculation: parseInt(vinculation, 10),
      origin: parseInt(origin, 10),
    };
    handleSaveRequest(
      () => updateFinancialPlanning(payload),
      'Financial Planning atualizado!',
      () => handleGetAllRequest(getAllFinancialPlanning)
    );
  };

  const handleSearch = () => {
    if (!sNumero) { setError('Informe o Nº PF.'); return; }
    if (!sAno) { setError('Informe o Ano do PF.'); return; }
    handleSearchRequest(
      () => findFinancialPlanningByNumber(parseInt(sNumero, 10), parseInt(sAno, 10)),
      (data) => { handleEdit(data); }
    );
  };

  const handleGetAll = () => {
    handleGetAllRequest(getAllFinancialPlanning);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Buscar Planejamento Financeiro (PF) por Nº + Ano</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Nº PF" type="number" placeholder="1001" value={sNumero}
            onChange={(e) => { setSNumero(e.target.value); setError(null); setAllResults([]); setShowAll(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full sm:w-36" />
          <Input label="Ano" type="number" placeholder="2024" value={sAno}
            onChange={(e) => { setSAno(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full sm:w-28" />
          <Button variant="ghost" size="md" loading={loading} onClick={handleSearch}>🔍 Buscar</Button>
          <Button variant="ghost" size="md" loading={loading} onClick={handleGetAll}>🔍 Buscar Todos</Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {editing && found && (
        <div className="glass-panel p-5 animate-fadeIn mt-6 max-w-2xl">
          <SectionTitle>Atualizar Planejamento Financeiro (PF)</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Input label="Nº PF" type="number" value={numero} onChange={e => setNumero(e.target.value)} />
            <Input label="Data" type="date" value={data} onChange={e => setData(e.target.value)} />
            <Input label="Vinculação" type="number" value={vinculation} onChange={e => setVinculation(e.target.value)} />
            <Input label="Origem" type="number" value={origin} onChange={e => setOrigin(e.target.value)} />
          </div>
          <div className="flex gap-4 mt-6">
            <Button onClick={handleSave} loading={saving}>Salvar Alterações</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
          {saveError && <Alert variant="error" message={saveError} onClose={() => setSaveError(null)} />}
          {success && <Alert variant="success" message={success} onClose={() => setSuccess(null)} />}
        </div>
      )}

      {showAll && !editing && allResults.length > 0 && (
        <>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            loading={loading}
            onPrevious={() => handlePreviousPage(getAllFinancialPlanning)}
            onNext={() => handleNextPage(getAllFinancialPlanning)}
            onGoToPage={(page) => handleGoToPage(page, getAllFinancialPlanning)}
          />
          <TableContainer title="Resultados" count={allResults.length}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 text-xs uppercase border-b border-white/10">
                  <th className="py-2 pr-4">Nº PF</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Vinculação</th>
                  <th className="py-2 pr-4">Origem</th>
                  <th className="py-2 pr-4 w-8">✏️</th>
                </tr>
              </thead>
              <tbody>
                {allResults.map((e, i) => (
                  <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/30">
                    <td className="py-2 pr-4 text-amber-300 font-mono">#{e.numero}</td>
                    <td className="py-2 pr-4 text-gray-300">{formatDate(e.data)}</td>
                    <td className="py-2 pr-4 text-gray-300">{e.vinculation}</td>
                    <td className="py-2 pr-4 text-stone-500">{e.origin}</td>
                    <td className="py-2 pr-4 w-8">
                      <EditIconButton onClick={() => handleEdit(e)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            loading={loading}
            onPrevious={() => handlePreviousPage(getAllFinancialPlanning)}
            onNext={() => handleNextPage(getAllFinancialPlanning)}
            onGoToPage={(page) => handleGoToPage(page, getAllFinancialPlanning)}
          />
        </>
      )}

      {!found && !showAll && !loading && !error && (
        <div className="flex flex-col items-center py-12 text-stone-600 gap-2 animate-fadeIn">
          <span className="text-3xl">🔍</span>
          <p className="text-xs uppercase tracking-widest">Informe o Nº e Ano do PF acima e clique em Buscar.</p>
        </div>
      )}
    </div>
  );
}