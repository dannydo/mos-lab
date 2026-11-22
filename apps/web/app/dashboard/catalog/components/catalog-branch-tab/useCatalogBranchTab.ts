'use client';

import { useCallback, useEffect, useState } from 'react';
import { Form, message } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import type { BranchStats, CrmBranch } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  BRANCH_PAGE_SIZE_STORAGE_KEY,
  BRANCH_PAGE_STORAGE_KEY,
  DEFAULT_BRANCH_PAGE_SIZE,
  type BranchDrawerMode,
  type BranchDrawerTabKey,
  type BranchFormValues,
  buildCreateBranchDto,
  buildUpdateBranchDto,
  getBranchErrorMessage,
  getDefaultBranchFormValues,
  isFormValidationError,
  mapBranchToFormValues,
  persistBranchPagination,
  readStoredBranchPaginationNumber,
} from './branchHelpers';

interface UseCatalogBranchTabOptions {
  onRegisterCreate?: (fn: () => void) => void;
}

export function useCatalogBranchTab({ onRegisterCreate }: UseCatalogBranchTabOptions = {}) {
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [branches, setBranches] = useState<CrmBranch[]>([]);
  const [stats, setStats] = useState<BranchStats | null>(null);

  // Filters & controlled pagination persisted across reloads
  const [search, setSearch] = useState<string>('');
  const [onlyHidden, setOnlyHidden] = useState<boolean>(false);
  const [page, setPage] = useState<number>(() => readStoredBranchPaginationNumber(BRANCH_PAGE_STORAGE_KEY, 1));
  const [pageSize, setPageSize] = useState<number>(() =>
    readStoredBranchPaginationNumber(BRANCH_PAGE_SIZE_STORAGE_KEY, DEFAULT_BRANCH_PAGE_SIZE)
  );
  const [total, setTotal] = useState<number>(0);

  // Drawer & form state
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [drawerMode, setDrawerMode] = useState<BranchDrawerMode>('create');
  const [selectedBranch, setSelectedBranch] = useState<CrmBranch | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<BranchDrawerTabKey>('info');

  const [form] = Form.useForm<BranchFormValues>();

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
      const res = await apiClient.catalog.branches.list({
        page,
        pageSize,
        search: search.trim() || undefined,
        onlyHidden,
      });

      if (res.success) {
        setBranches(res.data);
        setTotal(res.meta.total);
      }
    } catch (err: unknown) {
      message.error(getBranchErrorMessage(err, 'Lỗi tải danh sách chi nhánh'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, onlyHidden]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    void fetchBranches();
  }, [fetchBranches]);

  const handleTableChange = useCallback((pagination: TablePaginationConfig) => {
    const newPage = pagination.current || 1;
    const newPageSize = pagination.pageSize || DEFAULT_BRANCH_PAGE_SIZE;
    setPage(newPage);
    setPageSize(newPageSize);
    persistBranchPagination(newPage, newPageSize);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleOnlyHiddenToggle = useCallback((checked: boolean) => {
    setOnlyHidden(checked);
    setPage(1);
  }, []);

  const handleOpenCreate = useCallback(() => {
    form.resetFields();
    form.setFieldsValue(getDefaultBranchFormValues());
    setSelectedBranch(null);
    setDrawerMode('create');
    setActiveDrawerTab('info');
    setDrawerVisible(true);
  }, [form]);

  useEffect(() => {
    if (onRegisterCreate) {
      onRegisterCreate(handleOpenCreate);
    }
  }, [onRegisterCreate, handleOpenCreate]);

  const handleOpenEditOrView = useCallback(
    async (branch: CrmBranch, mode: 'edit' | 'view') => {
      try {
        setDetailLoading(true);
        setSelectedBranch(branch);
        setDrawerMode(mode);
        setActiveDrawerTab('info');
        setDrawerVisible(true);

        const res = await apiClient.catalog.branches.get(branch.id);
        if (res.success) {
          setSelectedBranch(res.data);
          form.setFieldsValue(mapBranchToFormValues(res.data));
        }
      } catch (err: unknown) {
        message.error(getBranchErrorMessage(err, 'Lỗi tải chi tiết chi nhánh'));
      } finally {
        setDetailLoading(false);
      }
    },
    [form]
  );

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  const handleSubmitForm = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (drawerMode === 'create') {
        const res = await apiClient.catalog.branches.create(buildCreateBranchDto(values));
        message.success(res.message || 'Tạo chi nhánh thành công');
      } else if (drawerMode === 'edit' && selectedBranch) {
        const res = await apiClient.catalog.branches.update(selectedBranch.id, buildUpdateBranchDto(values));
        message.success(res.message || 'Cập nhật chi nhánh thành công');
      }

      setDrawerVisible(false);
      void fetchBranches();
      void fetchStats();
    } catch (err: unknown) {
      if (isFormValidationError(err)) return;
      message.error(getBranchErrorMessage(err, 'Thao tác thất bại'));
    } finally {
      setSubmitting(false);
    }
  }, [drawerMode, fetchBranches, fetchStats, form, selectedBranch]);

  const handleToggleActive = useCallback(
    async (branch: CrmBranch) => {
      try {
        const res = await apiClient.catalog.branches.toggleActive(branch.id);
        message.success(res.message);
        void fetchBranches();
        void fetchStats();
      } catch (err: unknown) {
        message.error(getBranchErrorMessage(err, 'Lỗi chuyển trạng thái'));
      }
    },
    [fetchBranches, fetchStats]
  );

  const handleRefresh = useCallback(() => {
    void fetchBranches();
    void fetchStats();
  }, [fetchBranches, fetchStats]);

  return {
    loading,
    statsLoading,
    branches,
    stats,
    search,
    onlyHidden,
    page,
    pageSize,
    total,
    drawerVisible,
    drawerMode,
    selectedBranch,
    detailLoading,
    submitting,
    activeDrawerTab,
    setActiveDrawerTab,
    form,
    handleTableChange,
    handleSearch,
    handleOnlyHiddenToggle,
    handleOpenCreate,
    handleOpenEditOrView,
    handleCloseDrawer,
    handleSubmitForm,
    handleToggleActive,
    handleRefresh,
  };
}
