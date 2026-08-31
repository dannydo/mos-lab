'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BugPriority,
  BugReportClarificationFilter,
  BugReportDetail,
  BugReportListSummary,
  BugReportRequestType,
  BugReportStatus,
  BugReportSummary,
  ConfirmCloseBugReportRequest,
  BugReportCommentCreateResult,
  CreateBugReportCommentRequest,
  TriageBugReportRequest,
} from '@mos-lab/shared';
import { useDebounce } from '../../../../hooks/useDebounce';
import { apiClient } from '../../../../lib/api-client';

const STORAGE_KEY = 'mos_bug_inbox_state_v2';
const LEGACY_STORAGE_KEY = 'mos_bug_inbox_state_v1';

export interface BugInboxFilters {
  search: string;
  requestType: BugReportRequestType | 'ALL';
  status: BugReportStatus | 'ALL';
  priority: BugPriority | 'ALL';
  clarification: BugReportClarificationFilter;
}

export interface BugInboxPagination {
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: BugInboxFilters = {
  search: '',
  requestType: 'ALL',
  status: 'ALL',
  priority: 'ALL',
  clarification: 'ALL',
};
const DEFAULT_PAGINATION: BugInboxPagination = { page: 1, pageSize: 20 };
const EMPTY_SUMMARY: BugReportListSummary = {
  bugCount: 0,
  featureCount: 0,
  newCount: 0,
  approvedCount: 0,
  inProgressCount: 0,
  fixedCount: 0,
  closedCount: 0,
  unclearCount: 0,
  pendingAgentCount: 0,
  waitingReporterCount: 0,
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message || response?.data?.error || 'Không thể tải Bug Inbox.';
  }
  return error instanceof Error ? error.message : 'Không thể tải Bug Inbox.';
}

function readPersistedState(): { filters: BugInboxFilters; pagination: BugInboxPagination } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{ filters: BugInboxFilters; pagination: BugInboxPagination }>;
    const pageSize = Number(parsed.pagination?.pageSize);
    const page = Number(parsed.pagination?.page);
    return {
      filters: { ...DEFAULT_FILTERS, ...parsed.filters },
      pagination: {
        page: Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1,
        pageSize: [10, 20, 50, 100].includes(pageSize) ? pageSize : DEFAULT_PAGINATION.pageSize,
      },
    };
  } catch {
    return null;
  }
}

export function useBugReports() {
  const [filters, setFiltersState] = useState<BugInboxFilters>(DEFAULT_FILTERS);
  const [pagination, setPaginationState] = useState<BugInboxPagination>(DEFAULT_PAGINATION);
  const [data, setData] = useState<BugReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<BugReportListSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const requestVersionRef = useRef(0);
  const debouncedSearch = useDebounce(filters.search, 300);

  useEffect(() => {
    const persisted = readPersistedState();
    if (persisted) {
      setFiltersState(persisted.filters);
      setPaginationState(persisted.pagination);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, pagination }));
  }, [filters, hydrated, pagination]);

  const load = useCallback(
    async (showLoading = true) => {
      if (!hydrated) return;
      const requestVersion = ++requestVersionRef.current;
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await apiClient.bugReports.list({
          page: pagination.page,
          limit: pagination.pageSize,
          search: debouncedSearch.trim() || undefined,
          requestType: filters.requestType,
          status: filters.status,
          priority: filters.priority,
          clarification: filters.clarification,
        });
        if (requestVersion !== requestVersionRef.current) return;
        setData(result.data);
        setTotal(result.total);
        setSummary(result.summary ?? EMPTY_SUMMARY);
      } catch (caught) {
        if (requestVersion !== requestVersionRef.current) return;
        if (showLoading) {
          setError(getErrorMessage(caught));
          setData([]);
          setTotal(0);
          setSummary(EMPTY_SUMMARY);
        }
      } finally {
        if (showLoading && requestVersion === requestVersionRef.current) setLoading(false);
      }
    },
    [
      debouncedSearch,
      filters.clarification,
      filters.priority,
      filters.requestType,
      filters.status,
      hydrated,
      pagination.page,
      pagination.pageSize,
    ]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hydrated) return;
    const interval = window.setInterval(() => void load(false), 15_000);
    return () => window.clearInterval(interval);
  }, [hydrated, load]);

  const setFilters = useCallback((next: Partial<BugInboxFilters>) => {
    setFiltersState((current) => ({ ...current, ...next }));
    setPaginationState((current) => ({ ...current, page: 1 }));
  }, []);

  const setPagination = useCallback((next: BugInboxPagination) => {
    setPaginationState({ page: Math.max(1, next.page), pageSize: next.pageSize });
  }, []);

  const getDetail = useCallback((id: number): Promise<BugReportDetail> => apiClient.bugReports.detail(id), []);

  const triage = useCallback(
    async (id: number, request: TriageBugReportRequest): Promise<BugReportDetail> => {
      const response = await apiClient.bugReports.triage(id, request);
      if (!response.data) throw new Error('Máy chủ không trả về ticket sau khi cập nhật.');
      await load();
      return response.data;
    },
    [load]
  );

  const confirmClose = useCallback(
    async (id: number, request: ConfirmCloseBugReportRequest): Promise<BugReportDetail> => {
      const response = await apiClient.bugReports.confirmClose(id, request);
      if (!response.data) throw new Error('Máy chủ không trả về ticket sau khi đóng.');
      await load();
      return response.data;
    },
    [load]
  );

  const comment = useCallback(
    async (id: number, request: CreateBugReportCommentRequest): Promise<BugReportCommentCreateResult> => {
      const response = await apiClient.bugReports.comment(id, request);
      if (!response.data) throw new Error('Máy chủ không trả về hội thoại sau khi bình luận.');
      await load();
      return response.data;
    },
    [load]
  );

  return {
    data,
    total,
    summary,
    loading,
    error,
    filters,
    pagination,
    setFilters,
    setPagination,
    refresh: load,
    getDetail,
    triage,
    confirmClose,
    comment,
  };
}
