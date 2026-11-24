'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { Form, message } from 'antd';
import { isAdminOrSuperAdminRole, type UserRole } from '@mos-lab/shared';
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

export interface UseOmicallLogsPageOptions {
  initialLegacyUserId?: number | null;
  initialCustomerName?: string;
  initialSearch?: string;
  initialLogId?: number | null;
}

const QA_REVIEWER_ROLES = new Set(['admin', 'super_admin', 'manager', 'qa', 'qc', 'qa_qc']);

/**
 * Manages auth context, OmiCall call log filters/pagination, inline playback,
 * on-demand AI re-analysis, historical sync, extension config CRUD, and QA drawer state.
 */
export function useOmicallLogsPage(options: UseOmicallLogsPageOptions = {}) {
  const { initialLegacyUserId = null, initialCustomerName = '', initialSearch = '', initialLogId = null } = options;

  const [currentUser, setCurrentUser] = useState<OmicallStoredUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canReviewQa, setCanReviewQa] = useState(false);

  const [activeTab, setActiveTab] = useState('logs');

  const [logs, setLogs] = useState<OmicallLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalLogs, setTotalLogs] = useState(0);

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => createDefaultOmicallDateRange());
  const [dateRangeDirty, setDateRangeDirty] = useState(false);
  const [legacyUserIdFilter, setLegacyUserIdFilter] = useState<number | null>(initialLegacyUserId);
  const [customerFilterLabel, setCustomerFilterLabel] = useState<string>(initialCustomerName);
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [happyFilter, setHappyFilter] = useState<string>('ALL');
  const [aiFilter, setAiFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [onlyWithRecording, setOnlyWithRecording] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<OmicallStaffSummary[]>([]);

  const [playingLogId, setPlayingLogId] = useState<number | null>(null);
  const [reanalyzingLogId, setReanalyzingLogId] = useState<number | null>(null);
  const [syncingLogs, setSyncingLogs] = useState(false);

  const [configs, setConfigs] = useState<OmicallConfigRow[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configForm] = Form.useForm<OmicallExtensionFormValues>();
  const [selectedStaffForConfig, setSelectedStaffForConfig] = useState<OmicallConfigRow | null>(null);
  const [submittingConfig, setSubmittingConfig] = useState(false);

  const [qaDrawerOpen, setQaDrawerOpen] = useState(Boolean(initialLogId));
  const [selectedLogId, setSelectedLogId] = useState<number | null>(initialLogId);

  const logsRequestIdRef = useRef(0);
  const staffRequestIdRef = useRef(0);
  const configsRequestIdRef = useRef(0);
  const reanalyzeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      logsRequestIdRef.current += 1;
      staffRequestIdRef.current += 1;
      configsRequestIdRef.current += 1;
      if (reanalyzeRefreshTimerRef.current) clearTimeout(reanalyzeRefreshTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      try {
        const user = JSON.parse(stored) as OmicallStoredUser;
        setCurrentUser(user);
        const adminFlag = isAdminOrSuperAdminRole(user.role as UserRole);
        setIsAdmin(adminFlag);
        setCanReviewQa(adminFlag || QA_REVIEWER_ROLES.has(String(user.role || '').toLowerCase()));
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
      };

      if (legacyUserIdFilter) {
        params.legacyUserId = legacyUserIdFilter;
      }
      if ((!legacyUserIdFilter || dateRangeDirty) && dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      if (directionFilter !== 'ALL') params.direction = directionFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (happyFilter !== 'ALL') params.happyCallStatus = happyFilter;
      if (aiFilter !== 'ALL') params.analysisStatus = aiFilter;
      if (onlyWithRecording) params.hasRecording = 'true';
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (canReviewQa && staffFilter !== 'ALL') params.staffId = Number(staffFilter);

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
  }, [
    currentPage,
    pageSize,
    legacyUserIdFilter,
    dateRangeDirty,
    dateRange,
    directionFilter,
    statusFilter,
    happyFilter,
    aiFilter,
    onlyWithRecording,
    searchQuery,
    staffFilter,
    canReviewQa,
  ]);

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
      if (canReviewQa) fetchStaffList();
      if (isAdmin) fetchConfigs();
    }
  }, [currentUser, fetchLogs, fetchStaffList, fetchConfigs, isAdmin, canReviewQa]);

  const handleDateRangeChange = useCallback((dates: [Dayjs, Dayjs]) => {
    setDateRange(dates);
    setDateRangeDirty(true);
  }, []);

  const handleClearCustomerFilter = useCallback(() => {
    setLegacyUserIdFilter(null);
    setCustomerFilterLabel('');
    setDateRange(createDefaultOmicallDateRange());
    setDateRangeDirty(false);
    setCurrentPage(1);
  }, []);

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
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchLogs();
    }
  }, [currentPage, fetchLogs]);

  const handleResetFilters = useCallback(() => {
    setDateRange(createDefaultOmicallDateRange());
    setDateRangeDirty(false);
    setLegacyUserIdFilter(null);
    setCustomerFilterLabel('');
    setDirectionFilter('ALL');
    setStatusFilter('ALL');
    setHappyFilter('ALL');
    setAiFilter('ALL');
    setStaffFilter('ALL');
    setSearchQuery('');
    setOnlyWithRecording(false);
    setPlayingLogId(null);
    setCurrentPage(1);
  }, []);

  const handleTogglePlay = useCallback((logId: number) => {
    setPlayingLogId((prev) => (prev === logId ? null : logId));
  }, []);

  const handleReanalyze = useCallback(
    async (logId: number) => {
      try {
        setReanalyzingLogId(logId);
        await apiClient.omicall.reanalyzeLog(logId);
        message.success('Đã gửi cuộc gọi cho AI phân tích Happy Call. Bảng sẽ tự làm mới sau vài giây.');
        await fetchLogs();
        if (reanalyzeRefreshTimerRef.current) clearTimeout(reanalyzeRefreshTimerRef.current);
        reanalyzeRefreshTimerRef.current = setTimeout(() => {
          void fetchLogs();
        }, 6500);
      } catch (err) {
        message.error((err as ApiErrorPayload)?.response?.data?.message || 'Không thể chạy phân tích AI');
      } finally {
        setReanalyzingLogId(null);
      }
    },
    [fetchLogs]
  );

  const handleSyncFromOmicall = useCallback(async () => {
    try {
      setSyncingLogs(true);
      const res = (await apiClient.omicall.syncLogs({ days: 14, autoAnalyze: false })) as {
        imported?: number;
        updated?: number;
        withRecording?: number;
      };
      message.success(
        `Đã đồng bộ OmiCall: thêm mới ${res.imported || 0}, cập nhật ${res.updated || 0} (${res.withRecording || 0} cuộc có ghi âm).`
      );
      setCurrentPage(1);
      await fetchLogs();
    } catch (err) {
      message.error((err as ApiErrorPayload)?.response?.data?.message || 'Đồng bộ OmiCall thất bại');
    } finally {
      setSyncingLogs(false);
    }
  }, [fetchLogs]);

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
    canReviewQa,
    activeTab,
    logs,
    loadingLogs,
    currentPage,
    pageSize,
    totalLogs,
    dateRange,
    handleDateRangeChange,
    legacyUserIdFilter,
    customerFilterLabel,
    handleClearCustomerFilter,
    directionFilter,
    setDirectionFilter,
    statusFilter,
    setStatusFilter,
    happyFilter,
    setHappyFilter,
    aiFilter,
    setAiFilter,
    staffFilter,
    setStaffFilter,
    searchQuery,
    setSearchQuery,
    onlyWithRecording,
    setOnlyWithRecording,
    staffList,
    playingLogId,
    reanalyzingLogId,
    syncingLogs,
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
    handleTogglePlay,
    handleReanalyze,
    handleSyncFromOmicall,
    handleCopyUuid,
    openQADrawer,
    closeQADrawer,
    handleOpenConfigModal,
    closeConfigModal,
    handleSaveConfig,
    handleDeleteConfig,
  };
}
