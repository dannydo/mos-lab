'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import { Customer, Staff, TouchpointStatus, LASH_TOUCHUP_SYSTEM_CONFIG } from '@mos-lab/shared';
import { useOmiCall } from '../../../../context/OmiCallContext';

export interface Touchpoint {
  key: string;
  label: string;
  daysMin: number;
  daysMax: number;
  color: string;
}

export interface TabConfigs {
  [key: string]: Touchpoint[];
}

export const TAB_KEYS = [
  { id: 'NEW_LOCA', name: 'New LoCa', description: 'Khách hàng vừa mua Combo mới' },
  { id: 'LOCA_ALL', name: 'LoCa (Tất cả)', description: 'Tất cả khách hàng Combo Live' },
  { id: 'CONTACTED', name: 'Contacted', description: 'Khách hàng đã liên hệ' },
  { id: 'CALLBACK', name: 'Callback', description: 'Khách hàng hẹn gọi lại' },
  { id: 'BOOKED', name: 'Booked', description: 'Khách hàng đã book lịch' },
  { id: 'HSD_30', name: 'HSD 30', description: 'Hạn sử dụng Combo <= 30 ngày' },
  { id: 'LSD_1', name: 'LSD 1', description: 'Lần sử dụng Combo còn 1' },
  { id: 'SP', name: 'SP', description: 'Khách hàng có mua sản phẩm' },
];

export interface UseLocaDataOptions {
  settingsForm?: SafeAny; // Ant Design FormInstance
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onWarning?: (msg: string) => void;
  onCloseDrawer?: () => void;
}

const DEFAULT_LOCA_CONFIGS: TabConfigs = {
  LOCA_ALL: [
    { key: 'now', label: 'Hôm qua', daysMin: 1, daysMax: 1, color: '#10B981' },
    { key: '17', label: '17 ngày', daysMin: 17, daysMax: 17, color: '#3B82F6' },
    { key: '19', label: '19 ngày', daysMin: 19, daysMax: 19, color: '#6366F1' },
    {
      key: String(LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS),
      label: `${LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS} ngày`,
      daysMin: LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS,
      daysMax: LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS,
      color: '#8B5CF6',
    },
    { key: '23', label: '23 ngày', daysMin: 23, daysMax: 23, color: '#EC4899' },
    {
      key: String(LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS),
      label: `${LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS} ngày`,
      daysMin: LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS,
      daysMax: LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS,
      color: '#F43F5E',
    },
    { key: '30', label: '30 ngày', daysMin: 30, daysMax: 30, color: '#EF4444' },
    { key: '35', label: '35 ngày', daysMin: 35, daysMax: 35, color: '#D97706' },
    { key: '40', label: '40 ngày', daysMin: 40, daysMax: 40, color: '#B45309' },
    { key: '45', label: '45 ngày', daysMin: 45, daysMax: 45, color: '#78350F' },
    { key: '50', label: '50 ngày', daysMin: 50, daysMax: 50, color: '#451A03' },
    { key: '55', label: '55 ngày', daysMin: 55, daysMax: 55, color: '#312E81' },
    { key: '60', label: '60+ ngày', daysMin: 60, daysMax: 60, color: '#1E1B4B' },
  ],
};

export function useLocaData(options?: UseLocaDataOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Current User initialized synchronously from localStorage
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse user from localStorage', e);
        }
      }
    }
    return null;
  });

  // Main UI States
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab') || urlParams.get('activeTab');
      const savedTab = urlTab || localStorage.getItem('mos_loca_activeTab');
      if (savedTab && TAB_KEYS.some((t) => t.id === savedTab)) {
        return savedTab;
      }
    }
    return 'LOCA_ALL';
  });
  const [activeTouchpointKey, setActiveTouchpointKey] = useState<string>('ALL');
  const [contactSubTab, setContactSubTab] = useState<'ALL' | 'CALL' | 'TEXT'>('ALL');

  // Date Navigation States for New LoCa
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month'>('today');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('daysSinceLastVisit');
  const [assignedStaffId, setAssignedStaffId] = useState<string | number>('ALL');
  const [bookingStatusFilter, setBookingStatusFilterState] = useState<'ALL' | 'BOOKED' | 'NOT_BOOKED'>('ALL');

  // Request ID Guard to prevent out-of-order API responses from overwriting data
  const lastRequestIdRef = useRef(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPageSize = localStorage.getItem('mos_loca_pageSize');
      if (savedPageSize) return Number(savedPageSize);
    }
    return 20;
  });

  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Stats Counters
  const [tabCounts, setTabCounts] = useState<{ [key: string]: number }>({});
  const [touchpointCounts, setTouchpointCounts] = useState<{ [key: string]: number }>({});
  const [overallStats, setOverallStats] = useState({
    totalComboLive: 0,
    hsd30Count: 0,
    lsd1Count: 0,
    totalCalledToday: 0,
    totalBookedToday: 0,
  });

  // Dropdown lists
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [configs, setConfigs] = useState<TabConfigs>(DEFAULT_LOCA_CONFIGS);

  // Modals Controls
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [bookingWizardVisible, setBookingWizardVisible] = useState(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<Customer | null>(null);

  const { makeCall } = useOmiCall();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dailyPlanList, setDailyPlanList] = useState<number[]>([]);
  const [addingIds, setAddingIds] = useState<number[]>([]);

  // Load configuration & Staff lists on mount
  const fetchConfigs = useCallback(async () => {
    try {
      const data = await apiClient.loca.getConfig();
      setConfigs(data as SafeAny);
    } catch (err) {
      console.error('Failed to load touchpoint config:', err);
      optionsRef.current?.onError?.('Không thể tải cấu hình touchpoints LoCa.');
    }
  }, []);

  const fetchStaffList = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      const data = await apiClient.customers.getStaff();
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    if (currentUser) {
      fetchStaffList();
    }
  }, [currentUser, fetchStaffList]);

  // Fetch planned list for today
  const fetchTodayPlans = useCallback(async () => {
    try {
      const response = await apiClient.plans.listToday();
      if (response && Array.isArray(response)) {
        setDailyPlanList(response.map((prog: SafeAny) => prog.legacyUserId));
      }
    } catch (err) {
      console.error('Failed to load today call plans:', err);
    }
  }, []);

  useEffect(() => {
    fetchTodayPlans();
  }, [fetchTodayPlans]);

  const fetchOverallStats = useCallback(async () => {
    try {
      const params = {
        startDate: dayjs().startOf('day').toISOString(),
        endDate: dayjs().endOf('day').toISOString(),
      };
      const kpiData = await apiClient.kpi.getSummary(params);

      setOverallStats((prev) => ({
        ...prev,
        totalCalledToday: kpiData?.totalCalled || 0,
        totalBookedToday: kpiData?.totalBooked || 0,
      }));
    } catch (err) {
      console.error('Failed to fetch overall stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchOverallStats();
  }, [fetchOverallStats]);

  // Date Range calculation for New LoCa
  const dateRange = useMemo(() => {
    if (datePreset === 'month') {
      return {
        dateFrom: selectedDate.startOf('month').format('YYYY-MM-DD 00:00:00'),
        dateTo: selectedDate.endOf('month').format('YYYY-MM-DD 23:59:59'),
      };
    } else if (datePreset === 'week') {
      return {
        dateFrom: selectedDate.startOf('isoWeek').format('YYYY-MM-DD 00:00:00'),
        dateTo: selectedDate.endOf('isoWeek').format('YYYY-MM-DD 23:59:59'),
      };
    } else {
      return {
        dateFrom: selectedDate.format('YYYY-MM-DD 00:00:00'),
        dateTo: selectedDate.format('YYYY-MM-DD 23:59:59'),
      };
    }
  }, [datePreset, selectedDate]);

  const handlePrevDate = useCallback(() => {
    if (datePreset === 'month') setSelectedDate((d) => d.subtract(1, 'month'));
    else if (datePreset === 'week') setSelectedDate((d) => d.subtract(1, 'week'));
    else setSelectedDate((d) => d.subtract(1, 'day'));
  }, [datePreset]);

  const handleNextDate = useCallback(() => {
    if (datePreset === 'month') setSelectedDate((d) => d.add(1, 'month'));
    else if (datePreset === 'week') setSelectedDate((d) => d.add(1, 'week'));
    else setSelectedDate((d) => d.add(1, 'day'));
  }, [datePreset]);

  // Fetch Touchpoint & Tab Counts via 1 single Batch Stats API call
  const fetchTouchpointCounts = useCallback(async () => {
    try {
      const params = {
        search: searchQuery || undefined,
        assignedStaffId: assignedStaffId || 'ALL',
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
      };

      const locaStats = await apiClient.customers.getLocaStats(params as SafeAny);

      if (locaStats) {
        setTouchpointCounts(locaStats.touchpoints || {});
        setTabCounts(locaStats.tabs || {});

        // Set overall stats summary from batch counts
        setOverallStats((prev) => ({
          ...prev,
          totalComboLive: locaStats.tabs?.LOCA_ALL || 0,
          hsd30Count: locaStats.tabs?.HSD_30 || 0,
          lsd1Count: locaStats.tabs?.LSD_1 || 0,
        }));
      }
    } catch (err) {
      console.error('Failed to load touchpoint counts:', err);
    }
  }, [searchQuery, assignedStaffId, currentUser, dateRange]);

  useEffect(() => {
    if (Object.keys(configs).length > 0) {
      fetchTouchpointCounts();
    }
  }, [configs, searchQuery, assignedStaffId, fetchTouchpointCounts]);

  const fetchCustomerList = useCallback(async () => {
    const requestId = ++lastRequestIdRef.current;
    setLoading(true);
    try {
      const activeTabConfig = configs['LOCA_ALL'] || [];
      const currentTp = activeTabConfig.find((tp) => tp.key === activeTouchpointKey);

      const daysFrom = currentTp ? currentTp.daysMin : undefined;
      const daysTo = currentTp ? currentTp.daysMax : undefined;

      const params: SafeAny = {
        bucket: activeTab === 'NEW_LOCA' ? 'NEW_LOCA' : 'COMBO_LIVE',
        daysSinceLastVisitMin:
          activeTab === 'NEW_LOCA' ? undefined : daysFrom !== undefined ? daysFrom.toString() : undefined,
        daysSinceLastVisitMax:
          activeTab === 'NEW_LOCA' ? undefined : daysTo !== undefined ? daysTo.toString() : undefined,
        search: searchQuery || undefined,
        sort:
          activeTab === 'NEW_LOCA' && sortField === 'daysSinceLastVisit' ? 'purchaseDate_desc' : sortField || undefined,
        sortField:
          activeTab === 'NEW_LOCA' && sortField === 'daysSinceLastVisit' ? 'purchaseDate_desc' : sortField || undefined,
        page: currentPage,
        limit: pageSize,
        assignedStaffId:
          assignedStaffId === 'ALL' ? undefined : assignedStaffId === 'me' ? currentUser?.id : assignedStaffId,
      };

      if (activeTab === 'NEW_LOCA') {
        params.dateFrom = dateRange.dateFrom;
        params.dateTo = dateRange.dateTo;
      }

      if (activeTab === 'HSD_30') params.hsd30 = 'true';
      if (activeTab === 'LSD_1') params.lsd1 = 'true';
      if (activeTab === 'SP') params.hasProduct = 'true';
      if (activeTab === 'CALLBACK') params.hasCallback = 'true';
      if (activeTab === 'BOOKED') params.hasFutureBooking = 'true';
      if (bookingStatusFilter === 'BOOKED') params.hasFutureBooking = 'true';
      if (bookingStatusFilter === 'NOT_BOOKED') params.hasFutureBooking = 'false';
      if (activeTab === 'CONTACTED') {
        params.contacted = 'true';
        if (contactSubTab !== 'ALL') {
          params.contactType = contactSubTab;
        }
      }

      const data = await apiClient.customers.list(params);
      if (requestId === lastRequestIdRef.current) {
        setCustomers(data.data);
        setTotal(data.pagination.total);
      }
    } catch (err) {
      if (requestId === lastRequestIdRef.current) {
        console.error('Failed to load customer list:', err);
        optionsRef.current?.onError?.('Không thể tải danh sách khách hàng LoCa.');
      }
    } finally {
      if (requestId === lastRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    currentPage,
    pageSize,
    activeTab,
    activeTouchpointKey,
    contactSubTab,
    searchQuery,
    sortField,
    assignedStaffId,
    bookingStatusFilter,
    configs,
    currentUser,
    dateRange,
  ]);

  useEffect(() => {
    if (Object.keys(configs).length > 0) {
      fetchCustomerList();
    }
  }, [
    configs,
    currentPage,
    pageSize,
    activeTab,
    activeTouchpointKey,
    contactSubTab,
    searchQuery,
    sortField,
    assignedStaffId,
    fetchCustomerList,
  ]);

  // Actions
  const handleAddToPlan = async (customerId: number) => {
    if (addingIds.includes(customerId)) return;
    setAddingIds((prev) => [...prev, customerId]);
    try {
      await apiClient.plans.create({
        legacyUserId: customerId,
        date: dayjs().format('YYYY-MM-DD'),
      });
      optionsRef.current?.onSuccess?.('Đã thêm khách hàng vào kế hoạch gọi hôm nay!');
      setDailyPlanList((prev) => [...prev, customerId]);
    } catch (err) {
      console.error('Failed to add to call plan:', err);
      if ((err as SafeAny).response?.status === 409) {
        optionsRef.current?.onWarning?.(
          (err as SafeAny).response?.data?.message || 'Khách hàng này đã có trong kế hoạch gọi.'
        );
        setDailyPlanList((prev) => [...prev, customerId]);
      } else {
        optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể thêm khách hàng.');
      }
    } finally {
      setAddingIds((prev) => prev.filter((id) => id !== customerId));
    }
  };

  useEffect(() => {
    const handleLogSaved = () => {
      fetchOverallStats();
      fetchCustomerList();
    };
    window.addEventListener('mos-data-updated', handleLogSaved);
    window.addEventListener('mos-call-log-saved', handleLogSaved);
    window.addEventListener('mos-customer-updated', handleLogSaved);
    window.addEventListener('mos-booking-updated', handleLogSaved);
    return () => {
      window.removeEventListener('mos-data-updated', handleLogSaved);
      window.removeEventListener('mos-call-log-saved', handleLogSaved);
      window.removeEventListener('mos-customer-updated', handleLogSaved);
      window.removeEventListener('mos-booking-updated', handleLogSaved);
    };
  }, [fetchOverallStats, fetchCustomerList]);

  const handleOpenDetailModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailModalVisible(true);
  };

  const handleOpenSettings = () => {
    const currentConfigs = configs['LOCA_ALL'] || [];
    optionsRef.current?.settingsForm?.setFieldsValue({ touchpoints: currentConfigs });
    setSettingsModalVisible(true);
  };

  const handleSaveConfig = async () => {
    if (!optionsRef.current?.settingsForm) return;
    try {
      const values = await optionsRef.current.settingsForm.validateFields();
      const updatedConfigs = {
        LOCA_ALL: values.touchpoints,
      };

      await apiClient.loca.updateConfig(updatedConfigs);
      optionsRef.current.onSuccess?.('Đã xuất bản cấu hình mốc chạm LoCa thành công!');
      setConfigs(updatedConfigs);
      setSettingsModalVisible(false);
      setActiveTouchpointKey('ALL');
      if (optionsRef.current.onCloseDrawer) {
        optionsRef.current.onCloseDrawer();
      }
    } catch (err) {
      console.error('Save configs failed:', err);
      optionsRef.current.onError?.((err as SafeAny).response?.data?.message || 'Lưu cấu hình thất bại.');
    }
  };

  const resetConfigDefaults = async () => {
    const defaultConfigs: TabConfigs = {
      LOCA_ALL: [
        { key: 'now', label: 'Chạm 24h', daysMin: 1, daysMax: 1, color: 'blue' },
        { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17, color: 'cyan' },
        { key: '19', label: 'Chạm 19', daysMin: 19, daysMax: 19, color: 'cyan' },
        { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'green' },
        { key: '23', label: 'Chạm 23', daysMin: 23, daysMax: 23, color: 'green' },
        { key: '25', label: 'Chạm 25', daysMin: 25, daysMax: 25, color: 'green' },
        { key: '30', label: 'Chạm 30', daysMin: 30, daysMax: 30, color: 'orange' },
        { key: '35', label: 'Chạm 35', daysMin: 35, daysMax: 35, color: 'orange' },
        { key: '40', label: 'Chạm 40', daysMin: 40, daysMax: 40, color: 'orange' },
        { key: '45', label: 'Chạm 45', daysMin: 45, daysMax: 45, color: 'red' },
        { key: '50', label: 'Chạm 50', daysMin: 50, daysMax: 50, color: 'red' },
        { key: '55', label: 'Chạm 55', daysMin: 55, daysMax: 55, color: 'red' },
        { key: '60', label: 'Chạm 60', daysMin: 60, daysMax: 60, color: 'red' },
      ],
    };
    await apiClient.loca.updateConfig(defaultConfigs);
    setConfigs(defaultConfigs);
    optionsRef.current?.settingsForm?.setFieldsValue({ touchpoints: defaultConfigs['LOCA_ALL'] });
  };

  const handleAssignTelesales = async (customerIds: number[], staffId: number) => {
    try {
      await apiClient.customers.assign({
        customerIds,
        staffId,
      });
      optionsRef.current?.onSuccess?.('Phân bổ Telesales thành công!');
      fetchCustomerList();
      fetchOverallStats();
    } catch (err) {
      console.error('Failed to assign staff:', err);
      optionsRef.current?.onError?.('Lỗi khi phân bổ nhân viên chăm sóc.');
    }
  };

  const getRowClassName = (record: Customer, themeMode: string) => {
    const hasCallback = record.callbackDate
      ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
      : false;
    if (hasCallback) {
      return themeMode === 'dark' ? 'row-hope-dark' : 'row-hope-light';
    }

    const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
    if (isBookingInFuture) {
      const state = record.lastBookingState;
      const isBooked = state === 'New' || state === 'Confirmed';
      if (isBooked) {
        return themeMode === 'dark' ? 'row-booked-future-dark' : 'row-booked-future-light';
      }
    }

    return '';
  };

  const handleToggleTouchpoint = useCallback(
    async (
      customerId: number,
      touchpointKey: string,
      isChecked: boolean,
      note?: string,
      status?: TouchpointStatus | null,
      hasReferredDiamond?: boolean,
      callbackDate?: string
    ) => {
      // 1. Optimistically update local customer state
      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) => {
          if (cust.id === customerId) {
            const currentTps = cust.touchpoints || {};
            const staffName = currentUser?.displayName || currentUser?.username || 'Staff';
            return {
              ...cust,
              callbackDate: callbackDate || cust.callbackDate,
              touchpoints: {
                ...currentTps,
                [touchpointKey]: {
                  isChecked,
                  status: status !== undefined ? status : isChecked ? 'SUCCESS' : null,
                  checkedAt: isChecked ? new Date().toISOString() : currentTps[touchpointKey]?.checkedAt || null,
                  checkedByStaffId: isChecked
                    ? currentUser?.id || null
                    : currentTps[touchpointKey]?.checkedByStaffId || null,
                  checkedByStaffName: isChecked ? staffName : currentTps[touchpointKey]?.checkedByStaffName || null,
                  note: note !== undefined ? note : currentTps[touchpointKey]?.note || null,
                },
              },
            };
          }
          return cust;
        })
      );

      // 2. Call API endpoint
      try {
        await apiClient.customers.toggleTouchpoint({
          customerId,
          touchpointKey,
          isChecked,
          status,
          note,
          callbackDate,
        });
      } catch (err) {
        console.error('Failed to toggle touchpoint:', err);
        optionsRef.current?.onError?.('Không thể lưu trạng thái Chạm. Vui lòng thử lại.');
        fetchCustomerList();
      }
    },
    [currentUser, fetchCustomerList]
  );

  const changeActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activeTab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  return {
    // states
    currentUser,
    activeTab,
    activeTouchpointKey,
    contactSubTab,
    searchQuery,
    sortField,
    assignedStaffId,
    currentPage,
    pageSize,
    customers,
    total,
    loading,
    tabCounts,
    touchpointCounts,
    overallStats,
    staffList,
    configs,
    settingsModalVisible,
    detailModalVisible,
    bookingWizardVisible,
    bookingInitialCustomer,
    selectedCustomer,
    dailyPlanList,
    addingIds,
    datePreset,
    selectedDate,
    bookingStatusFilter,
    // setters
    setActiveTab: changeActiveTab,
    setActiveTouchpointKey,
    setContactSubTab,
    setSearchQuery,
    setSortField,
    setAssignedStaffId,
    setBookingStatusFilter: (val: 'ALL' | 'BOOKED' | 'NOT_BOOKED') => {
      setBookingStatusFilterState(val);
      setCurrentPage(1);
    },
    setCurrentPage,
    setPageSize,
    setDatePreset,
    setSelectedDate,
    setSettingsModalVisible,
    setDetailModalVisible,
    setBookingWizardVisible,
    setBookingInitialCustomer,
    setSelectedCustomer,
    // handlers
    fetchCustomerList,
    fetchOverallStats,
    handlePrevDate,
    handleNextDate,
    handleAddToPlan,
    handleOpenDetailModal,
    handleOpenSettings,
    handleSaveConfig,
    resetConfigDefaults,
    handleAssignTelesales,
    handleToggleTouchpoint,
    getRowClassName,
  };
}
