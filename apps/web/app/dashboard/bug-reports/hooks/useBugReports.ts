'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  RequestBugReportImplementationChangesRequest,
  RequestBugReportPlanChangesRequest,
  BugReportPlanReviewCandidate,
  BugPriority,
  BugReportClarificationFilter,
  BugReportDetail,
  ApproveBugReportImplementationResult,
  ApproveBugReportImplementationCommitResult,
  ApproveBugReportImplementationDeployResult,
  BugReportListSummary,
  BugReportNextActor,
  BugReportRequestType,
  BugReportStatus,
  BugReportSummary,
  ConfirmCloseBugReportRequest,
  BugReportCommentCreateResult,
  CreateBugReportCommentRequest,
  TriageBugReportRequest,
  InboxImplementationExecutionOwner,
} from '@mos-lab/shared';
import { useDebounce } from '../../../../hooks/useDebounce';
import { apiClient } from '../../../../lib/api-client';

const STORAGE_KEY = 'mos_bug_inbox_state_v3';
const LEGACY_STORAGE_KEYS = ['mos_bug_inbox_state_v2', 'mos_bug_inbox_state_v1'];

export interface BugInboxFilters {
  search: string;
  requestType: BugReportRequestType | 'ALL';
  status: BugReportStatus | 'ALL';
  priority: BugPriority | 'ALL';
  clarification: BugReportClarificationFilter;
  nextActor: BugReportNextActor | 'ALL';
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
  nextActor: 'ALL',
};
const DEFAULT_PAGINATION: BugInboxPagination = { page: 1, pageSize: 20 };
const EMPTY_SUMMARY: BugReportListSummary = {
  bugCount: 0,
  featureCount: 0,
  newCount: 0,
  readyForDannyCount: 0,
  approvedCount: 0,
  inProgressCount: 0,
  fixedCount: 0,
  closedCount: 0,
  unclearCount: 0,
  pendingAgentCount: 0,
  waitingReporterCount: 0,
  openCount: 0,
  reporterActionCount: 0,
  reporterClarificationCount: 0,
  reporterReviewCount: 0,
  dannyActionCount: 0,
  agentActionCount: 0,
  agentClarificationCount: 0,
  agentDeliveryCount: 0,
  liveWorker: null,
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
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
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

const INBOX_DATA_CACHE_KEY = 'mos_bug_reports_cache_v1';

function readCachedInboxData(): { data: BugReportSummary[]; total: number; summary: BugReportListSummary } | null {
  try {
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(INBOX_DATA_CACHE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.data)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCachedInboxData(value: { data: BugReportSummary[]; total: number; summary: BugReportListSummary }): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(INBOX_DATA_CACHE_KEY, JSON.stringify(value));
    }
  } catch {
    // SessionStorage quota full
  }
}

export function useBugReports() {
  const [filters, setFiltersState] = useState<BugInboxFilters>(() => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;
    return readPersistedState()?.filters ?? DEFAULT_FILTERS;
  });
  const [pagination, setPaginationState] = useState<BugInboxPagination>(() => {
    if (typeof window === 'undefined') return DEFAULT_PAGINATION;
    return readPersistedState()?.pagination ?? DEFAULT_PAGINATION;
  });
  const [data, setData] = useState<BugReportSummary[]>(() => {
    if (typeof window === 'undefined') return [];
    return readCachedInboxData()?.data ?? [];
  });
  const [total, setTotal] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return readCachedInboxData()?.total ?? 0;
  });
  const [summary, setSummary] = useState<BugReportListSummary>(() => {
    if (typeof window === 'undefined') return EMPTY_SUMMARY;
    return readCachedInboxData()?.summary ?? EMPTY_SUMMARY;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !readCachedInboxData();
  });
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const requestVersionRef = useRef(0);
  const debouncedSearch = useDebounce(filters.search, 300);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, pagination }));
    } catch {
      // Private browsing or a full storage quota must not break the Inbox.
    }
  }, [filters, hydrated, pagination]);

  const load = useCallback(
    async (showLoading = true) => {
      if (!hydrated) return;
      const requestVersion = ++requestVersionRef.current;
      const hasCached = Boolean(readCachedInboxData()?.data?.length);
      const isDefaultView =
        pagination.page === 1 && !debouncedSearch.trim() && filters.requestType === 'ALL' && filters.status === 'ALL';
      if (showLoading && !(hasCached && isDefaultView)) {
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
          nextActor: filters.nextActor,
        });
        if (requestVersion !== requestVersionRef.current) return;
        setData(result.data);
        setTotal(result.total);
        setSummary(result.summary ?? EMPTY_SUMMARY);
        writeCachedInboxData({ data: result.data, total: result.total, summary: result.summary ?? EMPTY_SUMMARY });
      } catch (caught) {
        if (requestVersion !== requestVersionRef.current) return;
        if (showLoading && !(hasCached && isDefaultView)) {
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
      filters.nextActor,
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

    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load(false);
    }, 30_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void load(false);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [hydrated, load]);

  const setFilters = useCallback((next: Partial<BugInboxFilters>) => {
    setFiltersState((current) => ({ ...current, ...next }));
    setPaginationState((current) => ({ ...current, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
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
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const approveImplementation = useCallback(
    async (
      id: number,
      planReview?: BugReportPlanReviewCandidate,
      executionOwner?: InboxImplementationExecutionOwner
    ): Promise<ApproveBugReportImplementationResult> => {
      const response = await apiClient.bugReports.approveImplementation(id, {
        acknowledged: true,
        planReview,
        ...(executionOwner ? { executionOwner } : {}),
      });
      if (!response.data) throw new Error('Máy chủ không trả về trạng thái duyệt implementation.');
      // Approval has already been recorded. Refresh the list in the background
      // so a slow list request can never keep the confirmation button spinning.
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const retryImplementation = useCallback(
    async (id: number): Promise<ApproveBugReportImplementationResult> => {
      const response = await apiClient.bugReports.retryImplementation(id, { acknowledged: true });
      if (!response.data) throw new Error('Máy chủ không trả về trạng thái retry implementation.');
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const authorizeWorkerRecoveryRetry = useCallback(
    async (id: number): Promise<ApproveBugReportImplementationResult> => {
      const response = await apiClient.bugReports.authorizeWorkerRecoveryRetry(id, { acknowledged: true });
      if (!response.data) throw new Error('Máy chủ không trả về trạng thái retry khôi phục Worker.');
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const authorizeSchemaRecoveryRetry = useCallback(
    async (id: number): Promise<ApproveBugReportImplementationResult> => {
      const response = await apiClient.bugReports.authorizeSchemaRecoveryRetry(id, { acknowledged: true });
      if (!response.data) throw new Error('Máy chủ không trả về trạng thái retry sau khi sửa schema.');
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const authorizeQualityGateRecoveryRetry = useCallback(
    async (id: number): Promise<ApproveBugReportImplementationResult> => {
      const response = await apiClient.bugReports.authorizeQualityGateRecoveryRetry(id, { acknowledged: true });
      if (!response.data) throw new Error('Máy chủ không trả về trạng thái retry sau khi sửa cổng kiểm thử.');
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const authorizeBuildLockRecoveryRetry = useCallback(
    async (id: number): Promise<ApproveBugReportImplementationResult> => {
      const response = await apiClient.bugReports.authorizeBuildLockRecoveryRetry(id, { acknowledged: true });
      if (!response.data) throw new Error('Máy chủ không trả về trạng thái retry sau khi sửa lock build.');
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const requestImplementationChanges = useCallback(
    async (id: number, input: RequestBugReportImplementationChangesRequest) => {
      const response = await apiClient.bugReports.requestImplementationChanges(id, input);
      if (!response.data) throw new Error('Máy chủ chưa trả về quyết định sửa lại.');
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const requestPlanChanges = useCallback(
    async (id: number, input: RequestBugReportPlanChangesRequest) => {
      const response = await apiClient.bugReports.requestPlanChanges(id, input);
      if (!response.data) throw new Error('Máy chủ chưa trả về quyết định sửa plan.');
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const approveImplementationCommit = useCallback(
    async (id: number): Promise<ApproveBugReportImplementationCommitResult> => {
      const response = await apiClient.bugReports.approveImplementationCommit(id, { acknowledged: true });
      if (!response.data) throw new Error('Máy chủ không trả về trạng thái duyệt commit.');
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const approveImplementationDeploy = useCallback(
    async (id: number): Promise<ApproveBugReportImplementationDeployResult> => {
      const response = await apiClient.bugReports.approveImplementationDeploy(id, { acknowledged: true });
      if (!response.data) throw new Error('Máy chủ không trả về trạng thái duyệt deploy.');
      void load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      return response.data;
    },
    [load]
  );

  const releaseImplementation = useCallback(
    async (id: number): Promise<BugReportDetail> => {
      const response = await apiClient.bugReports.releaseImplementation(id, { acknowledged: true });
      if (!response.data) throw new Error('Máy chủ không trả về ticket sau khi ghi nhận release.');
      await load();
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
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
    clearFilters,
    setPagination,
    refresh: load,
    getDetail,
    triage,
    approveImplementation,
    approveImplementationCommit,
    requestImplementationChanges,
    requestPlanChanges,
    approveImplementationDeploy,
    retryImplementation,
    authorizeWorkerRecoveryRetry,
    authorizeSchemaRecoveryRetry,
    authorizeQualityGateRecoveryRetry,
    authorizeBuildLockRecoveryRetry,
    releaseImplementation,
    confirmClose,
    comment,
  };
}
