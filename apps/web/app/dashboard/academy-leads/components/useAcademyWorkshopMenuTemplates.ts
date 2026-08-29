'use client';

import React from 'react';
import type { AcademyWorkshopMenuTemplate } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

const TEMPLATE_LIBRARY_PAGINATION_KEY = 'academy-workshop:menu-template-library:pagination';

function storedPagination(): { page: number; pageSize: number } {
  if (typeof window === 'undefined') return { page: 1, pageSize: 10 };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TEMPLATE_LIBRARY_PAGINATION_KEY) || '{}') as {
      page?: number;
      pageSize?: number;
    };
    const page = Math.max(1, Math.round(Number(parsed.page) || 1));
    const pageSize = [10, 20, 50, 100].includes(Number(parsed.pageSize)) ? Number(parsed.pageSize) : 10;
    return { page, pageSize };
  } catch {
    return { page: 1, pageSize: 10 };
  }
}

function mutationMessage(cause: unknown, fallback: string): string {
  const error = cause as { response?: { data?: { message?: string } }; message?: string };
  return error.response?.data?.message || error.message || fallback;
}

export function useAcademyWorkshopMenuTemplates(enabled: boolean) {
  const [data, setData] = React.useState<AcademyWorkshopMenuTemplate[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearchValue] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const initialPagination = React.useMemo(() => storedPagination(), []);
  const [page, setPage] = React.useState(initialPagination.page);
  const [pageSize, setPageSize] = React.useState(initialPagination.pageSize);
  const requestVersion = React.useRef(0);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await apiClient.academySales.workshops.listMenuTemplates({
        page,
        limit: pageSize,
        search: deferredSearch.trim() || undefined,
      });
      if (version !== requestVersion.current) return;
      setData(response.data);
      setTotal(response.total);
      setError(null);
    } catch (cause) {
      if (version !== requestVersion.current) return;
      setError(mutationMessage(cause, 'Không thể tải thư viện mẫu thực đơn.'));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [deferredSearch, enabled, page, pageSize]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    window.localStorage.setItem(TEMPLATE_LIBRARY_PAGINATION_KEY, JSON.stringify({ page, pageSize }));
  }, [page, pageSize]);

  const setSearch = React.useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const setPagination = React.useCallback(
    (nextPage: number, nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPage(nextPageSize === pageSize ? nextPage : 1);
    },
    [pageSize]
  );

  const deleteTemplate = React.useCallback(
    async (templateId: number) => {
      await apiClient.academySales.workshops.deleteMenuTemplate(templateId);
      await refresh();
    },
    [refresh]
  );

  const syncTemplateFromWorkshop = React.useCallback(async (workshopId: number, templateId: number) => {
    const template = await apiClient.academySales.workshops.refreshMenuTemplateFromWorkshop(workshopId, templateId);
    setData((rows) => rows.map((row) => (row.id === template.id ? template : row)));
    return template;
  }, []);

  return {
    data,
    total,
    loading,
    error,
    refresh,
    search,
    setSearch,
    page,
    pageSize,
    setPagination,
    syncTemplateFromWorkshop,
    deleteTemplate,
    mutationMessage,
  };
}
