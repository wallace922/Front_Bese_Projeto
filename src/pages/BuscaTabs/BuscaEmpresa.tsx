import { useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import EditIconButton from '../../components/EditIconButton';
import PaginationControls from '../../components/PaginationControls';
import { findEmpresaByCnpj, getAllEmpresa, updateEmpresa } from '../../services/api';
import type { EmpresaDto } from '../../types';
import { formatCNPJ } from '../../lib/utils';
import { SectionTitle, applyCnpjMask, TableContainer } from './Shared';
import { useEntitySearch } from '../../hooks/useEntitySearch';

export default function BuscaEmpresa() {
  const [searchCnpj, setSearchCnpj] = useState('');
  const [nome, setNome] = useState('');
  const [cnpjEdit, setCnpjEdit] = useState('');

  const {
    loading, error, setError,
    allResults, setAllResults,
    showAll, setShowAll,
    currentPage, totalPages, totalElements,
    found, setFound,
    editing, setEditing,
    saving, saveError, setSaveError,
    success, setSuccess,
    resetSearch,
    handleSearchRequest,
    handleGetAllRequest,
    handleNextPage,
    handlePreviousPage,
    handleGoToPage,
    handleSaveRequest
  } = useEntitySearch<EmpresaDto>();

  const handleEdit = (e: EmpresaDto) => {
    setFound(e);
    setNome(e.nome);
    setCnpjEdit(e.cnpj);
    setEditing(true);
  };

  const handleSave = () => {
    if (!found) return;
    const payload: EmpresaDto = { ...found, nome, cnpj: cnpjEdit.replace(/\D/g, '') };
    handleSaveRequest(
      () => updateEmpresa(payload),
      'Empresa atualizada com sucesso!',
      () => handleGetAllRequest(getAllEmpresa)
    );
  };

  const handleSearch = () => {
    if (loading) return;
    const raw = searchCnpj.replace(/\D/g, '');
    if (raw.length !== 14) {
      resetSearch();
      setError('CNPJ inválido (14 dígitos).');
      return;
    }

    handleSearchRequest(
      () => findEmpresaByCnpj(raw),
      (data) => {
        const currentRaw = searchCnpj.replace(/\D/g, '');
        if (raw === currentRaw) {
          handleEdit({ ...data, cnpj: raw });
        }
      }
    );
  };

  const handleGetAll = () => {
    handleGetAllRequest(getAllEmpresa);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <SectionTitle>Buscar Empresa por CNPJ</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
        <Input
          label="CNPJ" placeholder="XX.XXX.XXX/XXXX-XX"
          value={searchCnpj}
          onChange={(e) => { setSearchCnpj(applyCnpjMask(e.target.value)); setError(null); setAllResults([]); setShowAll(false); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          maxLength={18} className="w-full sm:w-52"
        />
        <Button variant="ghost" size="md" loading={loading} onClick={handleSearch}>🔍 Buscar</Button>
        <Button variant="ghost" size="md" loading={loading} onClick={handleGetAll}>🔍 Buscar Todos</Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {editing && found && (
        <div className="glass-panel p-5 animate-fadeIn mt-6 max-w-lg">
          <SectionTitle>Atualizar Empresa</SectionTitle>
          <div className="grid grid-cols-1 gap-4 mb-6">
            <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
            <Input label="CNPJ" value={formatCNPJ(cnpjEdit)} onChange={e => setCnpjEdit(e.target.value)} />
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
            onPrevious={() => handlePreviousPage(getAllEmpresa)}
            onNext={() => handleNextPage(getAllEmpresa)}
            onGoToPage={(page) => handleGoToPage(page, getAllEmpresa)}
          />
          <TableContainer title="Resultados" count={allResults.length}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 text-xs uppercase border-b border-white/10">
                  <th className="py-2 pr-4">CNPJ</th>
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4 w-8">✏️</th>
                </tr>
              </thead>
              <tbody>
                {allResults.map((e, i) => (
                  <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/30">
                    <td className="py-2 pr-4 text-amber-300 font-mono whitespace-nowrap">{formatCNPJ(e.cnpj)}</td>
                    <td className="py-2 pr-4 text-gray-300">{e.nome}</td>
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
            onPrevious={() => handlePreviousPage(getAllEmpresa)}
            onNext={() => handleNextPage(getAllEmpresa)}
            onGoToPage={(page) => handleGoToPage(page, getAllEmpresa)}
          />
        </>
      )}

      {!found && !showAll && !loading && !error && (
        <div className="flex flex-col items-center py-12 text-stone-600 gap-2 animate-fadeIn">
          <span className="text-3xl">🔍</span>
          <p className="text-xs uppercase tracking-widest">Informe o CNPJ acima e clique em Buscar.</p>
        </div>
      )}
    </div>
  );
}