'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AcademyCourse,
  type AcademyFollowUpTask,
  type AcademyLead,
  type AcademyLeadStatus,
  type AcademyLeadSummary,
  type AcademyPlaybook,
  type AcademyStaffOption,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

export type AcademyWorkspaceTab = 'PIPELINE' | 'HOT' | 'FOLLOW_UPS' | 'KNOWLEDGE';

const STORAGE_PREFIX = 'academy-sales-workspace';
const DEFAULT_SUMMARY: AcademyLeadSummary = {
  total: 0,
  newCount: 0,
  warmCount: 0,
  scheduledCount: 0,
  testedCount: 0,
  wonCount: 0,
  lostCount: 0,
  hotCount: 0,
  warmHotCount: 0,
  pendingFollowUps: 0,
  overdueFollowUps: 0,
  wonToday: 0,
};

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window !== 'undefined') window.localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
}

export function useAcademySalesWorkspace() {
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTabState] = useState<AcademyWorkspaceTab>('PIPELINE');
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);
  const [search, setSearchState] = useState('');
  const [status, setStatusState] = useState<AcademyLeadStatus | 'ALL'>('ALL');
  const [ownerStaffId, setOwnerStaffIdState] = useState<number | 'ALL' | 'UNASSIGNED'>('ALL');
  const [hotView, setHotViewState] = useState<'PRIORITY' | 'HOT' | 'WARM' | 'WON_TODAY'>('PRIORITY');
  const [followUpBucket, setFollowUpBucketState] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'UNDATED'>(
    'ALL'
  );
  const [leads, setLeads] = useState<AcademyLead[]>([]);
  const [followUps, setFollowUps] = useState<AcademyFollowUpTask[]>([]);
  const [summary, setSummary] = useState<AcademyLeadSummary>(DEFAULT_SUMMARY);
  const [total, setTotal] = useState(0);
  const [staff, setStaff] = useState<AcademyStaffOption[]>([]);
  const [playbooks, setPlaybooks] = useState<AcademyPlaybook[]>([]);
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    setActiveTabState(readStorage<AcademyWorkspaceTab>('active-tab', 'PIPELINE'));
    setPageState(readStorage<number>('page', 1));
    setPageSizeState(readStorage<number>('page-size', 20));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage('active-tab', activeTab);
    writeStorage('page', page);
    writeStorage('page-size', pageSize);
  }, [activeTab, hydrated, page, pageSize]);

  const setActiveTab = useCallback((next: AcademyWorkspaceTab) => {
    setActiveTabState(next);
    setPageState(1);
  }, []);
  const setPage = useCallback((next: number) => setPageState(Math.max(1, next)), []);
  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPageState(1);
  }, []);
  const setSearch = useCallback((next: string) => {
    setSearchState(next);
    setPageState(1);
  }, []);
  const setStatus = useCallback((next: AcademyLeadStatus | 'ALL') => {
    setStatusState(next);
    setPageState(1);
  }, []);
  const setOwnerStaffId = useCallback((next: number | 'ALL' | 'UNASSIGNED') => {
    setOwnerStaffIdState(next);
    setPageState(1);
  }, []);
  const setHotView = useCallback((next: 'PRIORITY' | 'HOT' | 'WARM' | 'WON_TODAY') => {
    setHotViewState(next);
    setPageState(1);
  }, []);
  const setFollowUpBucket = useCallback((next: 'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'UNDATED') => {
    setFollowUpBucketState(next);
    setPageState(1);
  }, []);

  const loadStaff = useCallback(async () => {
    const result = await apiClient.academySales.listStaff();
    setStaff(result);
  }, []);

  const loadLeads = useCallback(async () => {
    const version = ++requestVersionRef.current;
    setLoading(true);
    try {
      const result = await apiClient.academySales.listLeads({
        page,
        limit: pageSize,
        search: deferredSearch || undefined,
        status,
        ownerStaffId,
        hotView: activeTab === 'HOT' ? hotView : 'ALL',
      });
      if (version !== requestVersionRef.current) return;
      setLeads(result.data);
      setTotal(result.total);
      setSummary(result.summary || DEFAULT_SUMMARY);
      setError(null);
    } catch (loadError) {
      if (version !== requestVersionRef.current) return;
      setError('Không thể tải danh sách Sales Academy. Vui lòng thử lại.');
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  }, [activeTab, deferredSearch, hotView, ownerStaffId, page, pageSize, status]);

  const loadSummary = useCallback(async () => {
    try {
      const result = await apiClient.academySales.listLeads({ page: 1, limit: 1 });
      setSummary(result.summary || DEFAULT_SUMMARY);
    } catch {
      // A tab-specific request can still render its data when the summary refresh fails.
    }
  }, []);

  const loadFollowUps = useCallback(async () => {
    const version = ++requestVersionRef.current;
    setLoading(true);
    try {
      const result = await apiClient.academySales.listFollowUps({
        page,
        limit: pageSize,
        search: deferredSearch || undefined,
        bucket: followUpBucket,
      });
      if (version !== requestVersionRef.current) return;
      setFollowUps(result.data);
      setTotal(result.total);
      setError(null);
    } catch {
      if (version !== requestVersionRef.current) return;
      setError('Không thể tải hàng đợi follow-up. Vui lòng thử lại.');
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  }, [deferredSearch, followUpBucket, page, pageSize]);

  const loadKnowledge = useCallback(async () => {
    const version = ++requestVersionRef.current;
    setLoading(true);
    try {
      const [nextPlaybooks, nextCourses] = await Promise.all([
        apiClient.academySales.listPlaybooks(),
        apiClient.academySales.listCourses(),
      ]);
      if (version !== requestVersionRef.current) return;
      setPlaybooks(nextPlaybooks);
      setCourses(nextCourses);
      setError(null);
    } catch {
      if (version !== requestVersionRef.current) return;
      setError('Không thể tải Playbook và Khóa học. Vui lòng thử lại.');
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (activeTab === 'FOLLOW_UPS') {
      await Promise.all([loadFollowUps(), loadSummary()]);
      return;
    }
    if (activeTab === 'KNOWLEDGE') {
      await Promise.all([loadKnowledge(), loadSummary()]);
      return;
    }
    return loadLeads();
  }, [activeTab, loadFollowUps, loadKnowledge, loadLeads, loadSummary]);

  useEffect(() => {
    if (!hydrated) return;
    void loadStaff().catch(() => setStaff([]));
  }, [hydrated, loadStaff]);

  useEffect(() => {
    if (!hydrated) return;
    void refresh();
  }, [hydrated, refresh]);

  const activeFilterCount = useMemo(
    () =>
      [
        search.trim(),
        status !== 'ALL',
        ownerStaffId !== 'ALL',
        activeTab === 'HOT' && hotView !== 'PRIORITY',
        followUpBucket !== 'ALL',
      ].filter(Boolean).length,
    [activeTab, followUpBucket, hotView, ownerStaffId, search, status]
  );

  return {
    activeTab,
    setActiveTab,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    status,
    setStatus,
    ownerStaffId,
    setOwnerStaffId,
    hotView,
    setHotView,
    followUpBucket,
    setFollowUpBucket,
    leads,
    followUps,
    summary,
    total,
    staff,
    playbooks,
    courses,
    loading,
    error,
    refresh,
    activeFilterCount,
  };
}
