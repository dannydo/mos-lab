'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, message } from 'antd';
import type { BranchStats, CrmBranch } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  BRANCH_DEFAULT_PAGE_SIZE,
  buildBranchMutationPayload,
  canUserManageBranches,
  getCreateBranchDefaultValues,
  getStoredBranchesViewMode,
  saveBranchesViewMode,
  toBranchFormValues,
  type BranchDetailTab,
  type BranchFormMode,
  type BranchFormValues,
  type StatusFilter,
  type StoreTypeFilter,
  type ViewMode,
} from './branchesPageTypes';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

export function useBranchesPage() {
  const [canManage, setCanManage] = useState<boolean>(false);

  useEffect(() => {
    setCanManage(canUserManageBranches());
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>(getStoredBranchesViewMode);

  const handleViewModeChange = useCallback((val: ViewMode) => {
    setViewMode(val);
    saveBranchesViewMode(val);
  }, []);

  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [branches, setBranches] = useState<CrmBranch[]>([]);
  const [stats, setStats] = useState<BranchStats | null>(null);

  const [search, setSearch] = useState<string>('');
  const [storeTypeFilter, setStoreTypeFilter] = useState<StoreTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(BRANCH_DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState<number>(0);

  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [selectedBranch, setSelectedBranch] = useState<CrmBranch | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<BranchDetailTab>('info');

  const [editDrawerVisible, setEditDrawerVisible] = useState<boolean>(false);
  const [editDrawerMode, setEditDrawerMode] = useState<BranchFormMode>('create');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm();

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await apiClient.catalog.branches.getStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch branch stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const isAllStatus = statusFilter === 'ALL';
      const isHiddenOnly = statusFilter === 'INACTIVE';
      const isActiveOnly = statusFilter === 'ACTIVE';

      const res = await apiClient.catalog.branches.list({
        page,
        pageSize,
        search: search.trim() || undefined,
        storeType: storeTypeFilter === 'ALL' ? undefined : storeTypeFilter,
        includeAll: isAllStatus ? true : undefined,
        onlyHidden: isHiddenOnly ? true : undefined,
        isActive: isActiveOnly ? true : undefined,
      });

      if (res.success) {
        setBranches(res.data);
        setTotal(res.meta.total);
      }
    } catch (err) {
      message.error(extractErrorMessage(err, 'Lỗi tải danh sách chi nhánh'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, storeTypeFilter, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleRefresh = useCallback(() => {
    fetchBranches();
    fetchStats();
  }, [fetchBranches, fetchStats]);

  const handleSearchChange = useCallback((nextSearch: string) => {
    setSearch(nextSearch);
    setPage(1);
  }, []);

  const handleStoreTypeFilterChange = useCallback((nextFilter: StoreTypeFilter) => {
    setStoreTypeFilter(nextFilter);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((nextFilter: StatusFilter) => {
    setStatusFilter(nextFilter);
    setPage(1);
  }, []);

  const handlePaginationChange = useCallback((nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  }, []);

  const handleOpenDetail = useCallback(async (branch: CrmBranch) => {
    setSelectedBranch(branch);
    setActiveDrawerTab('info');
    setDetailVisible(true);
    setDetailLoading(true);

    try {
      const res = await apiClient.catalog.branches.get(branch.id);
      if (res.success && res.data) {
        setSelectedBranch(res.data);
      }
    } catch (err) {
      message.error(extractErrorMessage(err, 'Lỗi tải chi tiết chi nhánh'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleOpenCreate = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(getCreateBranchDefaultValues(branches.length));
    setEditDrawerMode('create');
    setEditDrawerVisible(true);
  }, [branches.length, form]);

  const handleOpenEdit = useCallback(
    (branch: CrmBranch) => {
      setSelectedBranch(branch);
      form.resetFields();
      form.setFieldsValue(toBranchFormValues(branch));
      setEditDrawerMode('edit');
      setEditDrawerVisible(true);
    },
    [form]
  );

  const handleSubmitForm = useCallback(async () => {
    try {
      const values = (await form.validateFields()) as BranchFormValues;
      setSubmitting(true);
      const payload = buildBranchMutationPayload(values);

      if (editDrawerMode === 'create') {
        const res = await apiClient.catalog.branches.create(payload);
        message.success(res.message || 'Tạo chi nhánh thành công');
      } else if (selectedBranch) {
        const res = await apiClient.catalog.branches.update(selectedBranch.id, payload);
        message.success(res.message || 'Cập nhật chi nhánh thành công');
      }

      setEditDrawerVisible(false);
      fetchBranches();
      fetchStats();
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.error(extractErrorMessage(err, 'Lỗi khi lưu thông tin chi nhánh'));
    } finally {
      setSubmitting(false);
    }
  }, [editDrawerMode, fetchBranches, fetchStats, form, selectedBranch]);

  const handleToggleActive = useCallback(
    async (branch: CrmBranch) => {
      try {
        const res = await apiClient.catalog.branches.toggleActive(branch.id);
        message.success(res.message || 'Cập nhật trạng thái thành công');
        fetchBranches();
        fetchStats();
      } catch (err) {
        message.error(extractErrorMessage(err, 'Lỗi đổi trạng thái chi nhánh'));
      }
    },
    [fetchBranches, fetchStats]
  );

  const activeSalonsCount = useMemo(() => {
    if (stats?.totalSalons !== undefined) return stats.totalSalons;
    return branches.filter((b) => b.storeType === 'SALON' && b.isActive).length;
  }, [stats, branches]);

  const activeAcademiesCount = useMemo(() => {
    if (stats?.totalAcademies !== undefined) return stats.totalAcademies;
    return branches.filter((b) => b.storeType === 'ACADEMY' && b.isActive).length;
  }, [stats, branches]);

  const activeOfficesCount = useMemo(() => {
    if (stats?.totalOffices !== undefined) return stats.totalOffices;
    return branches.filter((b) => b.storeType === 'OFFICE' && b.isActive).length;
  }, [stats, branches]);

  return {
    canManage,
    viewMode,
    handleViewModeChange,
    loading,
    statsLoading,
    branches,
    stats,
    search,
    storeTypeFilter,
    statusFilter,
    page,
    pageSize,
    total,
    detailVisible,
    setDetailVisible,
    detailLoading,
    selectedBranch,
    activeDrawerTab,
    setActiveDrawerTab,
    editDrawerVisible,
    setEditDrawerVisible,
    editDrawerMode,
    submitting,
    form,
    handleRefresh,
    handleSearchChange,
    handleStoreTypeFilterChange,
    handleStatusFilterChange,
    handlePaginationChange,
    handleOpenDetail,
    handleOpenCreate,
    handleOpenEdit,
    handleSubmitForm,
    handleToggleActive,
    activeSalonsCount,
    activeAcademiesCount,
    activeOfficesCount,
  };
}
