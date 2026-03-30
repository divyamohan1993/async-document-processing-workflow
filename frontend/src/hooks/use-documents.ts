'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Document, DocumentListParams, PaginatedResponse } from '@/types';

export function useDocuments(params: DocumentListParams = {}) {
  const [data, setData] = useState<PaginatedResponse<Document> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.documents.list(params);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    params.search,
    params.status,
    params.sort_by,
    params.sort_order,
    params.page,
    params.page_size,
  ]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const interval = setInterval(fetchDocuments, 10000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  return {
    documents: data?.items || [],
    total: data?.total || 0,
    totalPages: data?.total_pages || 0,
    page: data?.page || 1,
    isLoading,
    error,
    refetch: fetchDocuments,
  };
}

export function useDocument(id: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.documents.get(id);
      setDocument(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch document';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  return {
    document,
    isLoading,
    error,
    refetch: fetchDocument,
  };
}
