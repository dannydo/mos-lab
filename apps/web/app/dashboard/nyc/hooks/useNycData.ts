'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import { Customer, Staff } from '@mos-lab/shared';
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
  { id: 'NYC_30', name: 'NYC 30', rangeText: '0 - 30 ngày', minDays: 0, maxDays: 30 },
  { id: 'NYC_60', name: 'NYC 60', rangeText: '31 - 60 ngày', minDays: 31, maxDays: 60 },
  { id: 'NYC_90', name: 'NYC 90', rangeText: '61 - 90 ngày', minDays: 61, maxDays: 90 },
  { id: 'NYC_180', name: 'NYC 180', rangeText: '91 - 180 ngày', minDays: 91, maxDays: 180 },
  { id: 'NYC_365', name: 'NYC 365', rangeText: '181 - 365 ngày', minDays: 181, maxDays: 365 },
  { id: 'NYC_365plus', name: 'NYC 365+', rangeText: '> 365 ngày', minDays: 366, maxDays: undefined },
];

export interface UseNycDataOptions {
  settingsForm?: SafeAny; // Ant Design FormInstance
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onWarning?: (msg: string) => void;
}

export function useNycData(options?: UseNycDataOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Main UI States
  const [activeTab, setActiveTab] = useState<string>('NYC_30');
  const [activeTouchpointKey, setActiveTouchpointKey] = useState<string>('ALL');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('daysSinceLastVisit');
  const [assignedStaffId, setAssignedStaffId] = useState<string | number>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Current User
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);

  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Stats Counters
  const [tabCounts, setTabCounts] = useState<{ [key: string]: number }>({});
  const [touchpointCounts, setTouchpointCounts] = useState<{ [key: string]: number }>({});
  const [overallStats, setOverallStats] = useState({
    totalCalledToday: 0,
    totalPlannedToday: 0,
    totalBookedToday: 0,
  });

  // Dropdown lists
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [configs, setConfigs] = useState<TabConfigs>({});

  // Modals Controls
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [bookingWizardVisible, setBookingWizardVisible] = useState(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<Customer | null>(null);

  // Selected Config Tab
  const [selectedConfigTab, setSelectedConfigTab] = useState<string>('NYC_30');

  const { makeCall } = useOmiCall();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dailyPlanList, setDailyPlanList] = useState<number[]>([]); // Track planned user IDs for today
  const [addingIds, setAddingIds] = useState<number[]>([]);

  // Load configuration & Staff lists on mount
  const fetchConfigs = useCallback(async () => {
    try {
      const data = await apiClient.nyc.getConfig();
      setConfigs(data as SafeAny);
    } catch (err) {
      console.error('Failed to load touchpoint config:', err);
      optionsRef.current?.onError?.('Không thể tải cấu hình touchpoints.');
    }
  }, []);

  const fetchStaffList = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      const data = await apiClient.customers.getStaff({ role: 'telesales' });
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed);
          if (parsed.role === 'telesales') {
            setAssignedStaffId('me');
          }
        } catch (e) {
          console.error('Failed to parse user from localStorage', e);
        }
      }
      const savedPageSize = localStorage.getItem('mos_nyc_pageSize');
      if (savedPageSize) {
        setPageSize(Number(savedPageSize));
      }
    }
  }, []);

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
      setOverallStats({
        totalCalledToday: kpiData?.totalCalled || 0,
        totalPlannedToday: kpiData?.totalPlanned || 0,
        totalBookedToday: kpiData?.totalBooked || 0,
      });
    } catch (err) {
      console.error('Failed to fetch overall stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchOverallStats();
  }, [fetchOverallStats]);

  // Fetch Touchpoint & Tab Counts via 1 single Batch Stats API call
  const fetchTouchpointCounts = useCallback(async () => {
    try {
      const params = {
        search: searchQuery || undefined,
        assignedStaffId:
          assignedStaffId === 'ALL' ? undefined : assignedStaffId === 'me' ? currentUser?.id : assignedStaffId,
      };

      const nycStats = await apiClient.customers.getNycStats(params as SafeAny);

      if (nycStats) {
        const activeTabConfig = configs[activeTab] || [];
        const tpCounts: { [key: string]: number } = {
          ALL: nycStats.tabs[activeTab] || 0,
        };
        activeTabConfig.forEach((tp) => {
          tpCounts[tp.key] = nycStats.touchpoints[tp.key] || 0;
        });

        setTouchpointCounts(tpCounts);
        setTabCounts(nycStats.tabs || {});
      }
    } catch (err) {
      console.error('Failed to load touchpoint counts:', err);
    }
  }, [configs, activeTab, searchQuery, assignedStaffId, currentUser]);

  useEffect(() => {
    if (Object.keys(configs).length > 0) {
      fetchTouchpointCounts();
    }
  }, [configs, activeTab, searchQuery, assignedStaffId, fetchTouchpointCounts]);

  const fetchCustomerList = useCallback(async () => {
    setLoading(true);
    try {
      const activeTabConfig = configs[activeTab] || [];
      const currentTp = activeTabConfig.find((tp) => tp.key === activeTouchpointKey);

      let daysFrom = currentTp ? currentTp.daysMin : undefined;
      let daysTo = currentTp ? currentTp.daysMax : undefined;

      if (activeTouchpointKey === 'ALL') {
        const tkInfo = TAB_KEYS.find((tk) => tk.id === activeTab);
        daysFrom = tkInfo?.minDays;
        daysTo = tkInfo?.maxDays;
      }

      const params = {
        bucket: 'NOT_COMBO_LIVE',
        daysSinceLastVisitMin: daysFrom !== undefined ? daysFrom.toString() : undefined,
        daysSinceLastVisitMax: daysTo !== undefined ? daysTo.toString() : undefined,
        search: searchQuery || undefined,
        sort: sortField || undefined,
        sortField: sortField || undefined,
        page: currentPage,
        limit: pageSize,
        assignedStaffId:
          assignedStaffId === 'ALL' ? undefined : assignedStaffId === 'me' ? currentUser?.id : assignedStaffId,
      };

      const data = await apiClient.customers.list(params as SafeAny);
      setCustomers(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error('Failed to load customer list:', err);
      optionsRef.current?.onError?.('Không thể tải danh sách khách hàng.');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    activeTab,
    activeTouchpointKey,
    searchQuery,
    sortField,
    assignedStaffId,
    configs,
    currentUser,
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
        // Add to dailyPlanList so it gets disabled immediately
        setDailyPlanList((prev) => [...prev, customerId]);
      } else {
        optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể thêm khách hàng.');
      }
    } finally {
      setAddingIds((prev) => prev.filter((id) => id !== customerId));
    }
  };

  // Listen to global call log saved event to refresh NYC list and stats
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
    setSelectedConfigTab('NYC_30');
    const currentTabConfigs = configs['NYC_30'] || [];
    optionsRef.current?.settingsForm?.setFieldsValue({ touchpoints: currentTabConfigs });
    setSettingsModalVisible(true);
  };

  const handleConfigTabChange = (val: string) => {
    setSelectedConfigTab(val);
    const tabConfigs = configs[val] || [];
    optionsRef.current?.settingsForm?.setFieldsValue({ touchpoints: tabConfigs });
  };

  const handleSaveConfig = async () => {
    if (!optionsRef.current?.settingsForm) return;
    try {
      const values = await optionsRef.current.settingsForm.validateFields();
      const updatedConfigs = {
        ...configs,
        [selectedConfigTab]: values.touchpoints,
      };

      await apiClient.nyc.updateConfig(updatedConfigs);
      optionsRef.current.onSuccess?.('Đã xuất bản template cấu hình touchpoints mới thành công!');
      setConfigs(updatedConfigs);
      setSettingsModalVisible(false);
      setActiveTouchpointKey('ALL');
    } catch (err) {
      console.error('Save configs failed:', err);
      optionsRef.current.onError?.((err as SafeAny).response?.data?.message || 'Lưu cấu hình thất bại.');
    }
  };

  const resetConfigDefaults = async () => {
    const defaultConfigs: TabConfigs = {
      NYC_30: [
        { key: 'now', label: 'Chạm Now', daysMin: 0, daysMax: 1, color: 'blue' },
        { key: '3', label: 'Chạm 3', daysMin: 3, daysMax: 3, color: 'cyan' },
        { key: '7', label: 'Chạm 7', daysMin: 7, daysMax: 7, color: 'green' },
        { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17, color: 'orange' },
        { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'red' },
      ],
      NYC_60: [
        { key: '35', label: 'Chạm 35', daysMin: 31, daysMax: 35, color: 'blue' },
        { key: '45', label: 'Chạm 45', daysMin: 41, daysMax: 45, color: 'orange' },
        { key: '55', label: 'Chạm 55', daysMin: 51, daysMax: 55, color: 'red' },
      ],
      NYC_90: [
        { key: '70', label: 'Chạm 70', daysMin: 65, daysMax: 70, color: 'blue' },
        { key: '80', label: 'Chạm 80', daysMin: 75, daysMax: 80, color: 'orange' },
      ],
      NYC_180: [
        { key: '100', label: 'Chạm 100', daysMin: 95, daysMax: 100, color: 'blue' },
        { key: '150', label: 'Chạm 150', daysMin: 145, daysMax: 150, color: 'orange' },
      ],
      NYC_365: [
        { key: '200', label: 'Chạm 200', daysMin: 195, daysMax: 200, color: 'blue' },
        { key: '300', label: 'Chạm 300', daysMin: 295, daysMax: 300, color: 'orange' },
      ],
      NYC_365plus: [
        { key: '400', label: 'Chạm 400', daysMin: 395, daysMax: 400, color: 'blue' },
        { key: '500', label: 'Chạm 500', daysMin: 495, daysMax: 500, color: 'orange' },
      ],
    };
    await apiClient.nyc.updateConfig(defaultConfigs);
    setConfigs(defaultConfigs);
    optionsRef.current?.settingsForm?.setFieldsValue({ touchpoints: defaultConfigs[selectedConfigTab] });
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

    const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
    if (isBookingInPast) {
      const state = record.lastBookingState;
      const isMissed =
        state &&
        state !== 'Completed' &&
        state !== 'ServiceCompleted' &&
        state !== 'CheckIn' &&
        state !== 'CheckOut' &&
        state !== 'ServiceStart';
      if (isMissed) {
        return themeMode === 'dark' ? 'row-missed-dark' : 'row-missed-light';
      }
    }

    return '';
  };

  return {
    currentUser,
    activeTab,
    activeTouchpointKey,
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
    selectedConfigTab,
    selectedCustomer,
    dailyPlanList,
    addingIds,
    // setters
    setActiveTab,
    setActiveTouchpointKey,
    setSearchQuery,
    setSortField,
    setAssignedStaffId,
    setCurrentPage,
    setPageSize,
    setSettingsModalVisible,
    setDetailModalVisible,
    setBookingWizardVisible,
    setBookingInitialCustomer,
    setSelectedConfigTab,
    setSelectedCustomer,
    // handlers
    fetchCustomerList,
    fetchOverallStats,
    handleAddToPlan,
    handleOpenDetailModal,
    handleOpenSettings,
    handleConfigTabChange,
    handleSaveConfig,
    resetConfigDefaults,
    handleAssignTelesales,
    getRowClassName,
  };
}
