'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { Form, message } from 'antd';
import { apiClient } from '~/lib/api-client';
import {
  createDefaultOmicallDateRange,
  type OmicallConfigRow,
  type OmicallExtensionFormValues,
  type OmicallLogRow,
  type OmicallLogsApiResponse,
  type OmicallStaffSummary,
  type OmicallStoredUser,
} from './omicallPageTypes';

interface ApiErrorPayload {
  response?: {
    data?: {
      message?: string;
    };
  };
}

/**
 * Manages auth context, OmiCall call log filters/pagination, extension config CRUD, and QA drawer state.
 */
export function useOmicallLogsPage() {
  const [currentUser, setCurrentUser] = useState<OmicallStoredUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState('logs');

  const [logs, setLogs] = useState<OmicallLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => createDefaultOmicallDateRange());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [happyFilter, setHappyFilter] = useState<string>('ALL');
  const [aiFilter, setAiFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [staffList, setStaffList] = useState<OmicallStaffSummary[]>([]);

  const [configs, setConfigs] = useState<OmicallConfigRow[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configForm] = Form.useForm<OmicallExtensionFormValues>();
  const [selectedStaffForConfig, setSelectedStaffForConfig] = useState<OmicallConfigRow | null>(null);
  const [submittingConfig, setSubmittingConfig] = useState(false);

  const [qaDrawerOpen, setQaDrawerOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const logsRequestIdRef = useRef(0);
  const staffRequestIdRef = useRef(0);
  const configsRequestIdRef = useRef(0);

  useEffect(
    () => () => {
      logsRequestIdRef.current += 1;
      staffRequestIdRef.current += 1;
      configsRequestIdRef.current += 1;
    },
    []
  );

  useEffect(() => {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      try {
        const user = JSON.parse(stored) as OmicallStoredUser;
        setCurrentUser(user);
        setIsAdmin(user.role === 'admin');
      } catch (err) {
        console.error('[OmicallLogsPage] Failed to parse stored user:', err);
      }
    }
  }, []);

  const fetchStaffList = useCallback(async () => {
    const requestId = ++staffRequestIdRef.current;
    try {
      const data = await apiClient.staff.list();
      if (requestId === staffRequestIdRef.current) {
        setStaffList(data || []);
      }
    } catch (err) {
      if (requestId === staffRequestIdRef.current) {
        console.error('[OmicallLogsPage] Failed to fetch staff list:', err);
      }
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    const requestId = ++logsRequestIdRef.current;
    setLoadingLogs(true);
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        limit: pageSize,
        direction: 'outbound',
      };

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (happyFilter !== 'ALL') {
        params.happyCallStatus = happyFilter;
      }

      if (aiFilter !== 'ALL') {
        params.analysisStatus = aiFilter;
      }

      // If user is admin, allow filtering by selected staff. Otherwise, backend restricts to current user.
      if (isAdmin && staffFilter !== 'ALL') {
        params.staffId = Number(staffFilter);
      }

      const data = (await apiClient.omicall.listLogs(params)) as OmicallLogsApiResponse;
      if (requestId !== logsRequestIdRef.current) return;

      setLogs(data.logs || []);
      setTotalLogs(data.pagination?.total || data.total || 0);
    } catch (err) {
      if (requestId !== logsRequestIdRef.current) return;

      console.error('[OmicallLogsPage] Failed to fetch call logs:', err);
      message.error('Không thể tải lịch sử cuộc gọi OmiCall');
    } finally {
      if (requestId === logsRequestIdRef.current) {
        setLoadingLogs(false);
      }
    }
  }, [currentPage, pageSize, dateRange, statusFilter, happyFilter, aiFilter, staffFilter, isAdmin]);

  const fetchConfigs = useCallback(async () => {
    if (!isAdmin) return;
    const requestId = ++configsRequestIdRef.current;
    setLoadingConfigs(true);
    try {
      const data = (await apiClient.omicall.getConfigs()) as OmicallConfigRow[];
      if (requestId === configsRequestIdRef.current) {
        setConfigs(data || []);
      }
    } catch (err) {
      if (requestId !== configsRequestIdRef.current) return;

      console.error('[OmicallLogsPage] Failed to fetch extensions configurations:', err);
      message.error('Không thể tải cấu hình máy lẻ extension');
    } finally {
      if (requestId === configsRequestIdRef.current) {
        setLoadingConfigs(false);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    if (currentUser) {
      fetchLogs();
      if (isAdmin) {
        fetchStaffList();
        fetchConfigs();
      }
    }
  }, [currentUser, fetchLogs, fetchStaffList, fetchConfigs, isAdmin]);

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key);
      if (key === 'configs') {
        fetchConfigs();
      } else {
        fetchLogs();
      }
    },
    [fetchConfigs, fetchLogs]
  );

  const handlePageChange = useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);

  const handleSearchLogs = useCallback(() => {
    setCurrentPage(1);
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = useCallback(() => {
    setDateRange(createDefaultOmicallDateRange());
    setStatusFilter('ALL');
    setHappyFilter('ALL');
    setAiFilter('ALL');
    setStaffFilter('ALL');
    setCurrentPage(1);
  }, []);

  const handleCopyUuid = useCallback((uuid: string) => {
    navigator.clipboard.writeText(uuid);
    message.success('Đã sao chép Call UUID vào clipboard!');
  }, []);

  const openQADrawer = useCallback((id: number) => {
    setSelectedLogId(id);
    setQaDrawerOpen(true);
  }, []);

  const closeQADrawer = useCallback(() => {
    setQaDrawerOpen(false);
  }, []);

  const handleOpenConfigModal = useCallback(
    (staff: OmicallConfigRow) => {
      setSelectedStaffForConfig(staff);
      configForm.setFieldsValue({
        extension: staff.extension || '',
        sipPassword: '',
        phoneNumber: staff.phoneNumber || '',
      });
      setConfigModalOpen(true);
    },
    [configForm]
  );

  const closeConfigModal = useCallback(() => {
    setConfigModalOpen(false);
  }, []);

  const handleSaveConfig = useCallback(async () => {
    if (!selectedStaffForConfig) return;
    try {
      const values = await configForm.validateFields();
      setSubmittingConfig(true);

      const payload: {
        staffId: number;
        extension: string;
        phoneNumber: string | null;
        sipPassword?: string;
      } = {
        staffId: selectedStaffForConfig.staffId,
        extension: values.extension.trim(),
        phoneNumber: values.phoneNumber ? values.phoneNumber.trim() : null,
      };

      if (values.sipPassword && values.sipPassword.trim()) {
        payload.sipPassword = values.sipPassword.trim();
      }

      await apiClient.omicall.saveConfig(payload as unknown as Parameters<typeof apiClient.omicall.saveConfig>[0]);

      message.success(`Đã cập nhật máy lẻ cho ${selectedStaffForConfig.displayName}`);
      setConfigModalOpen(false);
      fetchConfigs();
    } catch (err) {
      console.error('[OmicallLogsPage] Failed to save extension config:', err);
      message.error((err as ApiErrorPayload)?.response?.data?.message || 'Lưu cấu hình máy lẻ thất bại');
    } finally {
      setSubmittingConfig(false);
    }
  }, [configForm, fetchConfigs, selectedStaffForConfig]);

  const handleDeleteConfig = useCallback(
    async (staffId: number, displayName: string) => {
      try {
        await apiClient.omicall.deleteConfig(staffId);
        message.success(`Đã xóa cấu hình máy lẻ của ${displayName}`);
        fetchConfigs();
      } catch (err) {
        console.error('[OmicallLogsPage] Failed to delete extension config:', err);
        message.error((err as ApiErrorPayload)?.response?.data?.message || 'Xóa cấu hình máy lẻ thất bại');
      }
    },
    [fetchConfigs]
  );

  return {
    isAdmin,
    activeTab,
    logs,
    loadingLogs,
    currentPage,
    pageSize,
    totalLogs,
    dateRange,
    setDateRange,
    statusFilter,
    setStatusFilter,
    happyFilter,
    setHappyFilter,
    aiFilter,
    setAiFilter,
    staffFilter,
    setStaffFilter,
    staffList,
    configs,
    loadingConfigs,
    configModalOpen,
    configForm,
    selectedStaffForConfig,
    submittingConfig,
    qaDrawerOpen,
    selectedLogId,
    fetchLogs,
    handleTabChange,
    handlePageChange,
    handleSearchLogs,
    handleResetFilters,
    handleCopyUuid,
    openQADrawer,
    closeQADrawer,
    handleOpenConfigModal,
    closeConfigModal,
    handleSaveConfig,
    handleDeleteConfig,
  };
}
