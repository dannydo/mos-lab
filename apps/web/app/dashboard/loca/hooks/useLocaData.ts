'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import {
  Customer,
  isTelesalesRole,
  Staff,
  TouchpointStatus,
  LASH_TOUCHUP_SYSTEM_CONFIG,
  LocaStaffActivityStats,
  LocaStaffActivityLogItem,
} from '@mos-lab/shared';
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

export interface CustomTouchpoint {
  key: string;
  daysMin: number;
  daysMax: number;
}

export const DEFAULT_CUSTOM_TOUCHPOINTS: CustomTouchpoint[] = [
  { key: 'CUSTOM_0', daysMin: 31, daysMax: 35 },
  { key: 'CUSTOM_1', daysMin: 36, daysMax: 40 },
  { key: 'CUSTOM_2', daysMin: 41, daysMax: 45 },
];

export const TAB_KEYS = [
  { id: 'NEW_LOCA', name: 'New LoCa', description: 'Khách hàng vừa mua Combo mới' },
  { id: 'LOCA_ALL', name: 'LoCa (Tất cả)', description: 'Tất cả khách hàng Combo Live' },
  { id: 'CONTACTED', name: 'Contacted', description: 'Khách hàng đã liên hệ' },
  { id: 'CALLBACK', name: 'Callback', description: 'Khách hàng hẹn gọi lại' },
  { id: 'BOOKED', name: 'Booked', description: 'Khách hàng đã book lịch' },
  { id: 'HSD_30', name: 'HSD 30', description: 'Hạn sử dụng Combo <= 30 ngày' },
  { id: 'LSD_1', name: 'LSD 1', description: 'Lần sử dụng Combo còn 1' },
  { id: 'SP', name: 'SP', description: 'Khách hàng có mua sản phẩm' },
  {
    id: 'STAFF_ACTIVITY',
    name: '📊 Báo cáo Nhân viên',
    description: 'Chi tiết công việc & hiệu suất hoạt động từng ngày/tuần/tháng',
  },
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

  // ===== Performance: Initialization Gate + Debounce (Phase 1 Optimization) =====
  // Prevents 6x duplicate API calls on mount caused by useEffect dependency cascade
  const isInitializedRef = useRef(false);
  const isInitialTouchpointFetchRef = useRef(true);
  const isInitialCustomerFetchRef = useRef(true);
  const touchpointDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // Custom Touchpoints (3 filter range boxes after Chạm 30)
  const [customTouchpoints, setCustomTouchpoints] = useState<CustomTouchpoint[]>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCtp0 = urlParams.get('ctp0');
      const urlCtp1 = urlParams.get('ctp1');
      const urlCtp2 = urlParams.get('ctp2');
      if (urlCtp0 || urlCtp1 || urlCtp2) {
        const parseCtp = (str: string | null, defMin: number, defMax: number, key: string) => {
          if (!str) return { key, daysMin: defMin, daysMax: defMax };
          const parts = str.split('-').map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { key, daysMin: parts[0], daysMax: parts[1] };
          }
          return { key, daysMin: defMin, daysMax: defMax };
        };
        return [
          parseCtp(urlCtp0, 31, 35, 'CUSTOM_0'),
          parseCtp(urlCtp1, 36, 40, 'CUSTOM_1'),
          parseCtp(urlCtp2, 41, 45, 'CUSTOM_2'),
        ];
      }
      const saved = localStorage.getItem('mos_loca_custom_touchpoints');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 3) {
            return parsed;
          }
        } catch (e) {
          console.error('Failed to parse custom touchpoints:', e);
        }
      }
    }
    return DEFAULT_CUSTOM_TOUCHPOINTS;
  });

  const [activeTouchpointKey, setActiveTouchpointKeyState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTp = urlParams.get('touchpoint') || urlParams.get('activeTouchpointKey');
      const savedTp = urlTp || localStorage.getItem('mos_loca_activeTouchpointKey');
      if (savedTp) {
        return savedTp;
      }
    }
    return 'ALL';
  });

  const setActiveTouchpointKey = useCallback((key: string) => {
    setActiveTouchpointKeyState(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activeTouchpointKey', key);
      const url = new URL(window.location.href);
      if (url.searchParams.get('touchpoint') !== key) {
        url.searchParams.set('touchpoint', key);
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }
  }, []);

  const updateCustomTouchpoint = useCallback((index: number, daysMin: number, daysMax: number) => {
    setCustomTouchpoints((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], daysMin, daysMax };
      }
      return next;
    });
  }, []);

  // Sync customTouchpoints to localStorage and URL search params safely in useEffect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_custom_touchpoints', JSON.stringify(customTouchpoints));
      const url = new URL(window.location.href);
      let updated = false;
      customTouchpoints.forEach((item, idx) => {
        const paramKey = `ctp${idx}`;
        const paramVal = `${item.daysMin}-${item.daysMax}`;
        if (url.searchParams.get(paramKey) !== paramVal) {
          url.searchParams.set(paramKey, paramVal);
          updated = true;
        }
      });
      if (updated) {
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }
  }, [customTouchpoints]);

  const [contactSubTab, setContactSubTab] = useState<'ALL' | 'CALL' | 'TEXT'>('ALL');

  // Date Navigation States for New LoCa
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month'>('today');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('daysSinceLastVisit');
  const [assignedStaffId, setAssignedStaffId] = useState<string | number>('ALL');
  const [bookingStatusFilter, setBookingStatusFilterState] = useState<'ALL' | 'BOOKED' | 'NOT_BOOKED'>('ALL');

  // The API enforces this boundary too. Keeping the client state aligned
  // prevents stale browser state from asking the LoCa workspace for a wider
  // customer scope after a role change.
  useEffect(() => {
    if (isTelesalesRole(currentUser?.role)) {
      setAssignedStaffId('me');
    }
  }, [currentUser?.role]);

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

  // Staff Activity Report States (Persistent on F5 reload & URL search params)
  const [selectedActivityStaffId, setSelectedActivityStaffIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlStaff = urlParams.get('activityStaffId');
      const savedStaff = urlStaff || localStorage.getItem('mos_loca_activity_staffId');
      if (savedStaff) return savedStaff;
    }
    return 'ALL';
  });

  const setSelectedActivityStaffId = useCallback((staffId: string) => {
    setSelectedActivityStaffIdState(staffId);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_staffId', staffId);
      localStorage.setItem('mos_loca_activity_page', '1');
      const url = new URL(window.location.href);
      url.searchParams.set('activityStaffId', staffId);
      url.searchParams.set('activityPage', '1');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const [activityViewMode, setActivityViewModeState] = useState<'month' | 'week' | 'day'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get('activityViewMode');
      const savedMode = urlMode || localStorage.getItem('mos_loca_activity_viewMode');
      if (savedMode && ['month', 'week', 'day'].includes(savedMode)) {
        return savedMode as 'month' | 'week' | 'day';
      }
    }
    return 'month';
  });

  const setActivityViewMode = useCallback((mode: 'month' | 'week' | 'day') => {
    setActivityViewModeState(mode);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_viewMode', mode);
      localStorage.setItem('mos_loca_activity_page', '1');
      const url = new URL(window.location.href);
      url.searchParams.set('activityViewMode', mode);
      url.searchParams.set('activityPage', '1');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const [activityReferenceDate, setActivityReferenceDateState] = useState<dayjs.Dayjs>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRefDate = urlParams.get('activityRefDate');
      const savedRefDate = urlRefDate || localStorage.getItem('mos_loca_activity_refDate');
      if (savedRefDate && dayjs(savedRefDate).isValid()) {
        return dayjs(savedRefDate);
      }
    }
    return dayjs();
  });

  const setActivityReferenceDate = useCallback((date: dayjs.Dayjs) => {
    setActivityReferenceDateState(date);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      const dateStr = date.format('YYYY-MM-DD');
      localStorage.setItem('mos_loca_activity_refDate', dateStr);
      localStorage.setItem('mos_loca_activity_page', '1');
      const url = new URL(window.location.href);
      url.searchParams.set('activityRefDate', dateStr);
      url.searchParams.set('activityPage', '1');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const handleNavigateActivityDate = useCallback(
    (direction: number) => {
      const unit = activityViewMode === 'month' ? 'month' : activityViewMode === 'week' ? 'week' : 'day';
      const nextDate = direction > 0 ? activityReferenceDate.add(1, unit) : activityReferenceDate.subtract(1, unit);
      setActivityReferenceDate(nextDate);
    },
    [activityViewMode, activityReferenceDate, setActivityReferenceDate]
  );

  const [activitySearchQuery, setActivitySearchQueryState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSearch = urlParams.get('activitySearch');
      const savedSearch = urlSearch || localStorage.getItem('mos_loca_activity_search');
      if (savedSearch) return savedSearch;
    }
    return '';
  });

  const setActivitySearchQuery = useCallback((query: string) => {
    setActivitySearchQueryState(query);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_search', query);
      localStorage.setItem('mos_loca_activity_page', '1');
      const url = new URL(window.location.href);
      if (query) {
        url.searchParams.set('activitySearch', query);
      } else {
        url.searchParams.delete('activitySearch');
      }
      url.searchParams.set('activityPage', '1');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const [activityActionTypeFilter, setActivityActionTypeFilterState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlType = urlParams.get('activityActionType');
      const savedType = urlType || localStorage.getItem('mos_loca_activity_actionType');
      if (savedType) return savedType;
    }
    return 'ALL';
  });

  const setActivityActionTypeFilter = useCallback((type: string) => {
    setActivityActionTypeFilterState(type);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_actionType', type);
      localStorage.setItem('mos_loca_activity_page', '1');
      const url = new URL(window.location.href);
      url.searchParams.set('activityActionType', type);
      url.searchParams.set('activityPage', '1');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const [activityTouchpointKey, setActivityTouchpointKeyState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlKey = urlParams.get('activityTouchpointKey');
      const savedKey = urlKey || localStorage.getItem('mos_loca_activity_touchpointKey');
      if (savedKey) return savedKey;
    }
    return 'ALL';
  });

  const setActivityTouchpointKey = useCallback((key: string) => {
    setActivityTouchpointKeyState(key);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_touchpointKey', key);
      localStorage.setItem('mos_loca_activity_page', '1');
      const url = new URL(window.location.href);
      url.searchParams.set('activityTouchpointKey', key);
      url.searchParams.set('activityPage', '1');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const [activityPage, setActivityPageState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPage = urlParams.get('activityPage');
      const savedPage = urlPage || localStorage.getItem('mos_loca_activity_page');
      if (savedPage && !isNaN(Number(savedPage))) return Number(savedPage);
    }
    return 1;
  });

  const setActivityPage = useCallback(
    (p: number) => {
      setActivityPageState(p);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mos_loca_activity_page', String(p));
        const url = new URL(window.location.href);
        url.searchParams.set('activityPage', String(p));
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    },
    [setActivityPageState]
  );

  const [activityPageSize, setActivityPageSizeState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSize = urlParams.get('activityPageSize');
      const savedSize = urlSize || localStorage.getItem('mos_loca_activity_pageSize');
      if (savedSize && !isNaN(Number(savedSize))) return Number(savedSize);
    }
    return 20;
  });

  const setActivityPageSize = useCallback(
    (s: number) => {
      setActivityPageSizeState((prevSize) => {
        if (prevSize !== s) {
          setActivityPageState(1);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mos_loca_activity_pageSize', String(s));
            localStorage.setItem('mos_loca_activity_page', '1');
            const url = new URL(window.location.href);
            url.searchParams.set('activityPageSize', String(s));
            url.searchParams.set('activityPage', '1');
            window.history.replaceState(null, '', url.pathname + url.search);
          }
        }
        return s;
      });
    },
    [setActivityPageState]
  );

  const [staffActivityStats, setStaffActivityStats] = useState<LocaStaffActivityStats | null>(null);
  const [staffActivityLogs, setStaffActivityLogs] = useState<LocaStaffActivityLogItem[]>([]);
  const [staffActivityTotal, setStaffActivityTotal] = useState(0);
  const [staffActivityLoading, setStaffActivityLoading] = useState(false);

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
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) return;
    try {
      const data = await apiClient.customers.getStaff({ role: 'cs' });
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  }, [currentUser]);

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

  // ===== Consolidated Initialization Effect =====
  // Load configuration before enabling the data effects. The list and tab-count
  // effects below own their initial fetch, so they are not also requested here.
  // Calling them from both places made the first render fetch each endpoint twice.
  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      // Step 1: Load touchpoint configs (required before list/stats fetches)
      try {
        const data = await apiClient.loca.getConfig();
        if (!cancelled) setConfigs(data as SafeAny);
      } catch (err) {
        console.error('Failed to load touchpoint config:', err);
        optionsRef.current?.onError?.('Không thể tải cấu hình touchpoints LoCa.');
        // Trigger the data effects with the built-in configuration when the
        // remote config is temporarily unavailable.
        if (!cancelled) setConfigs({ ...DEFAULT_LOCA_CONFIGS });
      }

      // Step 2: Enable the debounced list/stats effects, then fetch the remaining
      // independent page data in parallel.
      if (!cancelled) {
        isInitializedRef.current = true;
        await Promise.allSettled([fetchStaffList(), fetchTodayPlans(), fetchOverallStats()]);
      }
    };
    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Stabilize customTouchpoints reference for dependency tracking
  const customTouchpointsKey = useMemo(() => JSON.stringify(customTouchpoints), [customTouchpoints]);

  // Fetch Touchpoint & Tab Counts via 1 single Batch Stats API call
  const fetchTouchpointCounts = useCallback(async () => {
    try {
      const params = {
        search: searchQuery || undefined,
        assignedStaffId: assignedStaffId || 'ALL',
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
        customTouchpoints: customTouchpointsKey,
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
  }, [searchQuery, assignedStaffId, currentUser, dateRange, customTouchpointsKey]);

  // Fetch immediately after configuration is ready; debounce subsequent filters.
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (Object.keys(configs).length === 0) return;
    if (touchpointDebounceRef.current) clearTimeout(touchpointDebounceRef.current);
    const delay = isInitialTouchpointFetchRef.current ? 0 : 300;
    isInitialTouchpointFetchRef.current = false;
    touchpointDebounceRef.current = setTimeout(() => {
      fetchTouchpointCounts();
    }, delay);
    return () => {
      if (touchpointDebounceRef.current) clearTimeout(touchpointDebounceRef.current);
    };
  }, [configs, searchQuery, assignedStaffId, fetchTouchpointCounts]);

  const fetchCustomerList = useCallback(async () => {
    const requestId = ++lastRequestIdRef.current;
    setLoading(true);
    try {
      const activeTabConfig = configs['LOCA_ALL'] || [];
      let currentTp = activeTabConfig.find((tp) => tp.key === activeTouchpointKey);

      if (!currentTp && activeTouchpointKey.startsWith('CUSTOM_')) {
        const cTp = customTouchpoints.find((ctp) => ctp.key === activeTouchpointKey);
        if (cTp) {
          currentTp = {
            key: cTp.key,
            label: `${cTp.daysMin}-${cTp.daysMax} ngày`,
            daysMin: cTp.daysMin,
            daysMax: cTp.daysMax,
            color: '#F59E0B',
          };
        }
      }

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
    customTouchpointsKey,
    currentUser,
    dateRange,
  ]);

  // Fetch immediately after configuration is ready; debounce subsequent filters.
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (Object.keys(configs).length === 0) return;
    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    const delay = isInitialCustomerFetchRef.current ? 0 : 300;
    isInitialCustomerFetchRef.current = false;
    customerDebounceRef.current = setTimeout(() => {
      fetchCustomerList();
    }, delay);
    return () => {
      if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    };
  }, [configs, currentPage, pageSize, activeTab, activeTouchpointKey, assignedStaffId, fetchCustomerList]);

  // Fetch Staff Activity Data
  const fetchStaffActivityData = useCallback(async () => {
    setStaffActivityLoading(true);
    try {
      let startDateStr: string;
      let endDateStr: string;

      if (activityViewMode === 'month') {
        startDateStr = activityReferenceDate.startOf('month').format('YYYY-MM-DD');
        endDateStr = activityReferenceDate.endOf('month').format('YYYY-MM-DD');
      } else if (activityViewMode === 'week') {
        startDateStr = activityReferenceDate.startOf('isoWeek').format('YYYY-MM-DD');
        endDateStr = activityReferenceDate.endOf('isoWeek').format('YYYY-MM-DD');
      } else {
        startDateStr = activityReferenceDate.startOf('day').format('YYYY-MM-DD');
        endDateStr = activityReferenceDate.endOf('day').format('YYYY-MM-DD');
      }

      const params: Record<string, unknown> = {
        staffId: selectedActivityStaffId,
        datePreset: 'custom',
        startDate: startDateStr,
        endDate: endDateStr,
        page: activityPage,
        pageSize: activityPageSize,
        actionType: activityActionTypeFilter,
        touchpointKey: activityTouchpointKey,
        search: activitySearchQuery,
      };

      const res = await apiClient.customers.getLocaStaffActivity(params);
      setStaffActivityStats(res.stats);
      setStaffActivityLogs(res.logs || []);
      setStaffActivityTotal(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load staff activity data:', err);
    } finally {
      setStaffActivityLoading(false);
    }
  }, [
    selectedActivityStaffId,
    activityViewMode,
    activityReferenceDate,
    activitySearchQuery,
    activityActionTypeFilter,
    activityTouchpointKey,
    activityPage,
    activityPageSize,
  ]);

  useEffect(() => {
    if (activeTab === 'STAFF_ACTIVITY') {
      fetchStaffActivityData();
    }
  }, [activeTab, fetchStaffActivityData]);

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
    customTouchpoints,
    bookingStatusFilter,
    // Staff Activity Report States
    selectedActivityStaffId,
    activityViewMode,
    activityReferenceDate,
    activitySearchQuery,
    activityActionTypeFilter,
    activityTouchpointKey,
    activityPage,
    activityPageSize,
    staffActivityStats,
    staffActivityLogs,
    staffActivityTotal,
    staffActivityLoading,
    // setters
    setActiveTab: changeActiveTab,
    setActiveTouchpointKey,
    updateCustomTouchpoint,
    setContactSubTab,
    setSearchQuery,
    setSortField,
    setAssignedStaffId,
    setSelectedActivityStaffId,
    setActivityViewMode,
    setActivityReferenceDate,
    handleNavigateActivityDate,
    setActivitySearchQuery,
    setActivityActionTypeFilter,
    setActivityTouchpointKey,
    setActivityPage,
    setActivityPageSize,
    fetchStaffActivityData,
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
