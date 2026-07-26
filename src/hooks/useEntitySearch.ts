import { useState } from 'react';
import { ApiResult, PaginatedResponse } from '../services/api';

export function useEntitySearch<T>() {
  const [pageSize] = useState(50);

  // Search state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // List state
  const [allResults, setAllResults] = useState<T[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Edit state
  const [found, setFound] = useState<T | null>(null);
  const [editing, setEditing] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetSearch = () => {
    setError(null);
    setAllResults([]);
    setShowAll(false);
    setFound(null);
    setEditing(false);
    setCurrentPage(0);
    setTotalPages(0);
    setTotalElements(0);
  };

  const handleSearchRequest = async (
    request: () => Promise<ApiResult<T>>,
    onSuccess?: (data: T) => void
  ) => {
    resetSearch();
    setLoading(true);
    const res = await request();
    if (res.data) {
      if (onSuccess) onSuccess(res.data);
      else setFound(res.data);
    } else {
      setError(res.errorMessage ?? 'Registro não encontrado.');
    }
    setLoading(false);
  };

  const handleGetAllRequest = async (
    request: (page: number, size: number) => Promise<ApiResult<PaginatedResponse<T>>>
  ) => {
    resetSearch();
    setLoading(true);
    setCurrentPage(0);
    const res = await request(0, pageSize);
    if (res.data && res.data.content.length > 0) {
      setAllResults(res.data.content);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
      setCurrentPage(res.data.pageNumber);
      setShowAll(true);
    } else {
      setError('Nenhum registro encontrado.');
    }
    setLoading(false);
  };

  const handlePageChange = async (
    newPage: number,
    request: (page: number, size: number) => Promise<ApiResult<PaginatedResponse<T>>>
  ) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setLoading(true);
    const res = await request(newPage, pageSize);
    if (res.data && res.data.content.length > 0) {
      setAllResults(res.data.content);
      setCurrentPage(res.data.pageNumber);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } else {
      setError('Nenhum registro encontrado nesta página.');
    }
    setLoading(false);
  };

  const handleNextPage = async (
    request: (page: number, size: number) => Promise<ApiResult<PaginatedResponse<T>>>
  ) => {
    await handlePageChange(currentPage + 1, request);
  };

  const handlePreviousPage = async (
    request: (page: number, size: number) => Promise<ApiResult<PaginatedResponse<T>>>
  ) => {
    await handlePageChange(currentPage - 1, request);
  };

  const handleGoToPage = async (
    page: number,
    request: (page: number, size: number) => Promise<ApiResult<PaginatedResponse<T>>>
  ) => {
    await handlePageChange(page, request);
  };

  const handleSaveRequest = async (
    request: () => Promise<ApiResult<T>>,
    successMessage: string,
    onSuccessCallback?: () => void
  ) => {
    if (!found) return;
    setSaving(true);
    setSaveError(null);
    const res = await request();
    if (res.data) {
      setSuccess(successMessage);
      setTimeout(() => setSuccess(null), 3000);
      setEditing(false);
      if (showAll && onSuccessCallback) onSuccessCallback();
    } else {
      setSaveError(res.errorMessage || 'Erro ao atualizar.');
    }
    setSaving(false);
  };

  return {
    loading, error, setError,
    allResults, setAllResults,
    showAll, setShowAll,
    currentPage, setCurrentPage,
    totalPages, totalElements,
    pageSize,
    found, setFound,
    editing, setEditing,
    saving, setSaving,
    saveError, setSaveError,
    success, setSuccess,
    resetSearch,
    handleSearchRequest,
    handleGetAllRequest,
    handlePageChange,
    handleNextPage,
    handlePreviousPage,
    handleGoToPage,
    handleSaveRequest,
  };
}