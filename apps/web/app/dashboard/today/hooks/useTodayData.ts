'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import { DEFAULT_BOOKER_TEAMS, BookerTeamConfig } from '../components/BookerTeamConfigModal';

export interface BookingData {
  key: string;
  customerId?: number;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
  channel?: string;
  category?: 'combo' | 'oc' | 'other';
  createdTime: string;
  avatarColor?: string;
  code?: string;
  email?: string;
  ltv?: string;
  bookingsCount?: number;
  diamonds?: number;
  frequency?: string;
  gender?: string;
  dob?: string;
  daysAway?: string;
  favoriteDay?: string;
  oc?: string;
  historyService?: string;
  historyBranch?: string;
  historyCv?: string;
  historyCcIn?: string;
  historyCcOut?: string;
  historyBooker?: string;
  historyDate?: string;
  historyStatus?: string;
  historyNote?: string;
  branchName?: string;
  bookingDateTime?: string;
  requestedCv?: string;
  bookingNote?: string;
  status?: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late';
}

export interface ComingClientData {
  key: string;
  customerId?: number;
  time: string;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
  channel?: string;
  category?: string;
  branchKey?: string;
  cc: string;
  cv: string;
  service: string;
  status: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late';
  avatarColor?: string;
  code?: string;
  email?: string;
  ltv?: string;
  price?: number;
  tax?: number;
  bookingsCount?: number;
  diamonds?: number;
  frequency?: string;
  gender?: string;
  dob?: string;
  daysAway?: string;
  favoriteDay?: string;
  oc?: string;
  historyService?: string;
  historyBranch?: string;
  historyCv?: string;
  historyCcIn?: string;
  historyCcOut?: string;
  historyBooker?: string;
  historyDate?: string;
  historyStatus?: string;
  historyNote?: string;
}

export interface ShopCCData {
  name: string;
  doing: string;
  clients: number;
  combos: number;
  revenue: number;
  revLe?: number;
  revCombo?: number;
  revProduct?: number;
  netRevenue?: number;
  netLe?: number;
  netCombo?: number;
  netProduct?: number;
  shift: 'sáng' | 'chiều' | 'full' | 'off';
  attendance: 'none' | 'checked_in' | 'checked_out' | 'late';
}

export interface ShopCVData {
  name: string;
  doing: string;
  clients: number;
  shift: 'sáng' | 'chiều' | 'full' | 'off';
  attendance: 'none' | 'checked_in' | 'checked_out' | 'late';
  status: 'busy' | 'available';
}

export interface BranchDetail {
  revLe: number;
  revCombo: number;
  revProduct: number;
  netLe?: number;
  netCombo?: number;
  netProduct?: number;
  cc: ShopCCData[];
  cv: ShopCVData[];
  coming: ComingClientData[];
}

export interface UseTodayDataOptions {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function useTodayData(options?: UseTodayDataOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [dateRangeMode, setDateRangeMode] = useState<'day' | 'week' | 'month'>('day');

  // Auto-refresh states
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60); // default to 60s
  const [countdown, setCountdown] = useState(60);
  const [silentLoading, setSilentLoading] = useState(false);

  // Tabs states
  const [bookingFilter, setBookingFilter] = useState<'all' | 'combo' | 'oc' | 'other'>('all');
  const [bookingBranch, setBookingBranch] = useState<'all' | 'detham' | 'pxl' | 'estella'>('all');
  const [comingBranch, setComingBranch] = useState<'detham' | 'pxl' | 'estella' | 'all'>('detham');
  const [comingCategory, setComingCategory] = useState<'all' | 'combo' | 'oc' | 'other'>('all');
  const [shopBranch, setShopBranch] = useState<'detham' | 'pxl' | 'estella' | 'all'>('detham');
  const [selectedBooker, setSelectedBooker] = useState<string | null>(null);
  const [teamConfig, setTeamConfig] = useState<BookerTeamConfig>(DEFAULT_BOOKER_TEAMS);
  const [teamModalVisible, setTeamModalVisible] = useState(false);

  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SafeAny | null>(null);
  const [showTax, setShowTax] = useState(true);

  // Data states
  const [branchesData, setBranchesData] = useState<Record<string, BranchDetail>>({
    detham: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
    pxl: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
    estella: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
  });

  const [bookingsCombo, setBookingsCombo] = useState<BookingData[]>([]);
  const [bookingsOc, setBookingsOc] = useState<BookingData[]>([]);
  const [bookingsOther, setBookingsOther] = useState<BookingData[]>([]);

  // Load persisted states on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);

      const persistedTeamConfig = localStorage.getItem('booker_team_config');
      if (persistedTeamConfig) {
        try {
          const parsed = JSON.parse(persistedTeamConfig);
          if (parsed && typeof parsed === 'object') {
            setTeamConfig(parsed);
          }
        } catch (e) {
          // ignore
        }
      }
      const persistedDateMode = urlParams.get('dateRangeMode') || localStorage.getItem('today_date_range_mode');
      if (persistedDateMode && ['day', 'week', 'month'].includes(persistedDateMode)) {
        setDateRangeMode(persistedDateMode as 'day' | 'week' | 'month');
      }

      const persistedDate = urlParams.get('date') || localStorage.getItem('today_selected_date');
      setSelectedDate(persistedDate ? dayjs(persistedDate) : dayjs());

      const persistedShowTax = localStorage.getItem('today_show_tax');
      if (persistedShowTax !== null) setShowTax(persistedShowTax === 'true');

      const urlBookingFilter = urlParams.get('bookingFilter') || urlParams.get('tab');
      const persistedBookingFilter = urlBookingFilter || localStorage.getItem('today_booking_filter');
      if (persistedBookingFilter && ['all', 'combo', 'oc', 'other'].includes(persistedBookingFilter)) {
        setBookingFilter(persistedBookingFilter as SafeAny);
      }

      const urlBookingBranch = urlParams.get('bookingBranch');
      const persistedBookingBranch = urlBookingBranch || localStorage.getItem('today_booking_branch');
      if (persistedBookingBranch && ['all', 'detham', 'pxl', 'estella'].includes(persistedBookingBranch)) {
        setBookingBranch(persistedBookingBranch as SafeAny);
      }

      const urlComingBranch = urlParams.get('comingBranch');
      const persistedComingBranch = urlComingBranch || localStorage.getItem('today_coming_branch');
      if (persistedComingBranch && ['detham', 'pxl', 'estella', 'all'].includes(persistedComingBranch)) {
        setComingBranch(persistedComingBranch as SafeAny);
      }

      const urlComingCategory = urlParams.get('comingCategory');
      const persistedComingCategory = urlComingCategory || localStorage.getItem('today_coming_category');
      if (persistedComingCategory && ['all', 'combo', 'oc', 'other'].includes(persistedComingCategory)) {
        setComingCategory(persistedComingCategory as SafeAny);
      }

      const urlShopBranch = urlParams.get('shopBranch');
      const persistedShopBranch = urlShopBranch || localStorage.getItem('today_shop_branch');
      if (persistedShopBranch && ['detham', 'pxl', 'estella', 'all'].includes(persistedShopBranch)) {
        setShopBranch(persistedShopBranch as SafeAny);
      }

      const urlBooker = urlParams.get('booker');
      const persistedBooker = urlBooker || localStorage.getItem('today_selected_booker');
      if (persistedBooker) {
        setSelectedBooker(persistedBooker);
      }

      const persistedAutoRefresh = localStorage.getItem('today_auto_refresh');
      if (persistedAutoRefresh !== null) setAutoRefresh(persistedAutoRefresh === 'true');

      const persistedRefreshInterval = localStorage.getItem('today_refresh_interval');
      if (persistedRefreshInterval !== null) {
        const parsed = parseInt(persistedRefreshInterval, 10);
        if (!isNaN(parsed)) {
          setRefreshInterval(parsed);
          setCountdown(parsed);
        }
      }
    }
  }, []);

  const openCustomerDrawer = (record: SafeAny) => {
    setSelectedCustomer(record);
    setDrawerVisible(true);
  };

  const fetchDashboardData = useCallback(
    async (date: dayjs.Dayjs, mode: 'day' | 'week' | 'month' = 'day', isSilent = false) => {
      if (!isSilent) {
        setLoading(true);
      } else {
        setSilentLoading(true);
      }
      try {
        let dateFrom = date.format('YYYY-MM-DD');
        let dateTo = date.format('YYYY-MM-DD');

        if (mode === 'week') {
          dateFrom = date.startOf('isoWeek').format('YYYY-MM-DD');
          dateTo = date.endOf('isoWeek').format('YYYY-MM-DD');
        } else if (mode === 'month') {
          dateFrom = date.startOf('month').format('YYYY-MM-DD');
          dateTo = date.endOf('month').format('YYYY-MM-DD');
        }

        const data = (await apiClient.dashboard.getToday({ dateFrom, dateTo })) as SafeAny;
        setBranchesData(data.branchesData);
        setBookingsCombo(data.bookingsCombo);
        setBookingsOc(data.bookingsOc || []);
        setBookingsOther(data.bookingsOther);
      } catch (err) {
        console.error('Fetch dashboard today error:', err);
        if (!isSilent) {
          optionsRef.current?.onError?.('Lỗi khi tải dữ liệu vận hành thực tế!');
        }
      } finally {
        if (!isSilent) {
          setLoading(false);
        } else {
          setSilentLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (selectedDate) {
      fetchDashboardData(selectedDate, dateRangeMode);
    }
  }, [selectedDate, dateRangeMode, fetchDashboardData]);

  const dateBounds = useMemo(() => {
    if (!selectedDate) {
      const todayStr = dayjs().format('YYYY-MM-DD');
      return { dateFrom: todayStr, dateTo: todayStr, label: '' };
    }

    if (dateRangeMode === 'week') {
      const startOfWeek = selectedDate.startOf('isoWeek');
      const endOfWeek = selectedDate.endOf('isoWeek');
      return {
        dateFrom: startOfWeek.format('YYYY-MM-DD'),
        dateTo: endOfWeek.format('YYYY-MM-DD'),
        label: `Tuần ${selectedDate.isoWeek()} (${startOfWeek.format('DD/MM')} - ${endOfWeek.format('DD/MM/YYYY')})`,
      };
    }

    if (dateRangeMode === 'month') {
      const startOfMonth = selectedDate.startOf('month');
      const endOfMonth = selectedDate.endOf('month');
      return {
        dateFrom: startOfMonth.format('YYYY-MM-DD'),
        dateTo: endOfMonth.format('YYYY-MM-DD'),
        label: `Tháng ${selectedDate.format('MM/YYYY')}`,
      };
    }

    const dateStr = selectedDate.format('YYYY-MM-DD');
    return {
      dateFrom: dateStr,
      dateTo: dateStr,
      label: selectedDate.format('DD/MM/YYYY'),
    };
  }, [selectedDate, dateRangeMode]);

  const handlePrevDate = () => {
    if (!selectedDate) return;
    let newDate = selectedDate;
    if (dateRangeMode === 'day') newDate = selectedDate.subtract(1, 'day');
    else if (dateRangeMode === 'week') newDate = selectedDate.subtract(1, 'week');
    else if (dateRangeMode === 'month') newDate = selectedDate.subtract(1, 'month');

    setSelectedDate(newDate);
    localStorage.setItem('today_selected_date', newDate.format('YYYY-MM-DD'));
  };

  const handleNextDate = () => {
    if (!selectedDate) return;
    let newDate = selectedDate;
    if (dateRangeMode === 'day') newDate = selectedDate.add(1, 'day');
    else if (dateRangeMode === 'week') newDate = selectedDate.add(1, 'week');
    else if (dateRangeMode === 'month') newDate = selectedDate.add(1, 'month');

    setSelectedDate(newDate);
    localStorage.setItem('today_selected_date', newDate.format('YYYY-MM-DD'));
  };

  const changeDateRangeMode = (mode: 'day' | 'week' | 'month') => {
    setDateRangeMode(mode);
    localStorage.setItem('today_date_range_mode', mode);
  };

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh || !selectedDate) return;

    const isToday = selectedDate.isSame(dayjs(), 'day');
    if (!isToday) return;

    const tick = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardData(selectedDate, dateRangeMode, true);
          return refreshInterval;
        }
        return prev - 1;
      });
    };

    const timer = setInterval(tick, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData(selectedDate, dateRangeMode, true);
        setCountdown(refreshInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, selectedDate, dateRangeMode, refreshInterval, fetchDashboardData]);

  // Reset countdown if selectedDate changes or refreshInterval changes
  useEffect(() => {
    setCountdown(refreshInterval);
  }, [selectedDate, refreshInterval]);

  const handleRefresh = async () => {
    if (selectedDate) {
      await fetchDashboardData(selectedDate, dateRangeMode);
      optionsRef.current?.onSuccess?.('Đã làm mới dữ liệu vận hành từ cơ sở dữ liệu!');
      setCountdown(refreshInterval);
    }
  };

  const getBranchLabel = (key: string) => {
    if (key === 'detham') return 'Đề Thám';
    if (key === 'pxl') return 'PXL';
    if (key === 'estella') return 'Estella';
    return '';
  };

  const allBookings = useMemo(() => {
    const combined = [
      ...bookingsCombo.map((b) => ({ ...b, category: 'combo' as const })),
      ...bookingsOc.map((b) => ({ ...b, category: 'oc' as const })),
      ...bookingsOther.map((b) => ({ ...b, category: 'other' as const })),
    ];
    return combined.sort((a, b) => Number(b.key) - Number(a.key));
  }, [bookingsCombo, bookingsOc, bookingsOther]);

  const matchesBookerFilter = useCallback(
    (bookerName: string | undefined, filter: string | null) => {
      if (!filter || filter === 'all') return true;
      const name = (bookerName || '').trim().toLowerCase();
      if (!name) return false;

      if (filter === 'team:telesales') {
        return (teamConfig.telesales || []).some((n) => n.trim().toLowerCase() === name);
      }
      if (filter === 'team:control_cs') {
        return (teamConfig.control_cs || []).some((n) => n.trim().toLowerCase() === name);
      }
      if (filter === 'team:other') {
        return (teamConfig.other || []).some((n) => n.trim().toLowerCase() === name);
      }

      return name === filter.trim().toLowerCase();
    },
    [teamConfig]
  );

  const saveTeamConfig = useCallback((newConfig: BookerTeamConfig) => {
    setTeamConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('booker_team_config', JSON.stringify(newConfig));
    }
  }, []);

  const bookingBranchCounts = useMemo(() => {
    let dt = 0;
    let pxl = 0;
    let ep = 0;
    allBookings.forEach((b) => {
      if (b.branchName === 'Đề Thám') dt++;
      else if (b.branchName === 'PXL') pxl++;
      else if (b.branchName === 'Estella') ep++;
    });
    return { dt, pxl, ep, total: allBookings.length };
  }, [allBookings]);

  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (bookingFilter !== 'all' && b.category !== bookingFilter) {
        return false;
      }
      if (bookingBranch !== 'all') {
        if (bookingBranch === 'detham' && b.branchName !== 'Đề Thám') return false;
        if (bookingBranch === 'pxl' && b.branchName !== 'PXL') return false;
        if (bookingBranch === 'estella' && b.branchName !== 'Estella') return false;
      }
      if (!matchesBookerFilter(b.booker, selectedBooker)) {
        return false;
      }
      return true;
    });
  }, [allBookings, bookingFilter, bookingBranch, selectedBooker, matchesBookerFilter]);

  const allComingList = useMemo(() => {
    return Object.keys(branchesData).flatMap((branchKey) =>
      (branchesData[branchKey].coming || []).map((item) => ({
        ...item,
        branchName: getBranchLabel(branchKey),
        branchKey,
      }))
    );
  }, [branchesData]);

  const activeComingList = useMemo(() => {
    const filtered = allComingList.filter((item) => {
      if (comingBranch !== 'all' && item.branchKey !== comingBranch) {
        return false;
      }
      if (comingCategory !== 'all' && item.category !== comingCategory) {
        return false;
      }
      if (!matchesBookerFilter(item.booker, selectedBooker)) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => a.time.localeCompare(b.time));
  }, [allComingList, comingBranch, comingCategory, selectedBooker, matchesBookerFilter]);

  const activeShopData = useMemo(() => {
    const raw =
      shopBranch === 'all'
        ? {
            revLe: Object.values(branchesData).reduce((sum, b) => sum + (b.revLe || 0), 0),
            revCombo: Object.values(branchesData).reduce((sum, b) => sum + (b.revCombo || 0), 0),
            revProduct: Object.values(branchesData).reduce((sum, b) => sum + (b.revProduct || 0), 0),
            netLe: Object.values(branchesData).reduce((sum, b) => sum + (b.netLe || 0), 0),
            netCombo: Object.values(branchesData).reduce((sum, b) => sum + (b.netCombo || 0), 0),
            netProduct: Object.values(branchesData).reduce((sum, b) => sum + (b.netProduct || 0), 0),
            cc: Object.entries(branchesData).flatMap(([branchKey, b]) =>
              b.cc.map((item) => ({ ...item, branchName: getBranchLabel(branchKey) }))
            ),
            cv: Object.entries(branchesData).flatMap(([branchKey, b]) =>
              b.cv.map((item) => ({ ...item, branchName: getBranchLabel(branchKey) }))
            ),
            coming: [] as SafeAny[],
          }
        : {
            ...branchesData[shopBranch],
            cc: (branchesData[shopBranch]?.cc || []).map((item) => ({
              ...item,
              branchName: getBranchLabel(shopBranch),
            })),
            cv: (branchesData[shopBranch]?.cv || []).map((item) => ({
              ...item,
              branchName: getBranchLabel(shopBranch),
            })),
          };

    return {
      revLe: showTax ? raw.revLe || 0 : raw.netLe || 0,
      revCombo: showTax ? raw.revCombo || 0 : raw.netCombo || 0,
      revProduct: showTax ? raw.revProduct || 0 : raw.netProduct || 0,
      cc: (raw.cc || []).map((c: SafeAny) => ({
        ...c,
        revLe: showTax ? c.revLe || 0 : c.netLe || 0,
        revCombo: showTax ? c.revCombo || 0 : c.netCombo || 0,
        revProduct: showTax ? c.revProduct || 0 : c.netProduct || 0,
        revenue: showTax ? c.revenue || 0 : c.netRevenue || 0,
      })),
      cv: raw.cv || [],
      coming: raw.coming || [],
    };
  }, [branchesData, shopBranch, showTax]);

  const changeBookingFilter = useCallback((val: 'all' | 'combo' | 'oc' | 'other') => {
    setBookingFilter(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('today_booking_filter', val);
      const url = new URL(window.location.href);
      url.searchParams.set('bookingFilter', val);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const changeBookingBranch = useCallback((val: 'all' | 'detham' | 'pxl' | 'estella') => {
    setBookingBranch(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('today_booking_branch', val);
      const url = new URL(window.location.href);
      url.searchParams.set('bookingBranch', val);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const changeComingBranch = useCallback((val: 'detham' | 'pxl' | 'estella' | 'all') => {
    setComingBranch(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('today_coming_branch', val);
      const url = new URL(window.location.href);
      url.searchParams.set('comingBranch', val);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const changeComingCategory = useCallback((val: 'all' | 'combo' | 'oc' | 'other') => {
    setComingCategory(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('today_coming_category', val);
      const url = new URL(window.location.href);
      url.searchParams.set('comingCategory', val);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const changeShopBranch = useCallback((val: 'detham' | 'pxl' | 'estella' | 'all') => {
    setShopBranch(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('today_shop_branch', val);
      const url = new URL(window.location.href);
      url.searchParams.set('shopBranch', val);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  const changeSelectedBooker = useCallback((val: string | null) => {
    setSelectedBooker(val);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (val) {
        localStorage.setItem('today_selected_booker', val);
        url.searchParams.set('booker', val);
      } else {
        localStorage.removeItem('today_selected_booker');
        url.searchParams.delete('booker');
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, []);

  return {
    // states
    loading,
    selectedDate,
    dateRangeMode,
    autoRefresh,
    refreshInterval,
    countdown,
    silentLoading,
    bookingFilter,
    bookingBranch,
    comingBranch,
    comingCategory,
    shopBranch,
    selectedBooker,
    teamConfig,
    teamModalVisible,
    drawerVisible,
    selectedCustomer,
    showTax,
    branchesData,
    bookingsCombo,
    bookingsOc,
    bookingsOther,

    // computed
    allBookings,
    bookingBranchCounts,
    filteredBookings,
    allComingList,
    activeComingList,
    activeShopData,
    dateBounds,

    // setters
    setSelectedDate,
    setDateRangeMode: changeDateRangeMode,
    setAutoRefresh,
    setRefreshInterval,
    setCountdown,
    setBookingFilter: changeBookingFilter,
    setBookingBranch: changeBookingBranch,
    setComingBranch: changeComingBranch,
    setComingCategory: changeComingCategory,
    setShopBranch: changeShopBranch,
    setSelectedBooker: changeSelectedBooker,
    setTeamConfig,
    setTeamModalVisible,
    saveTeamConfig,
    setDrawerVisible,
    setSelectedCustomer,
    setShowTax,

    // functions
    openCustomerDrawer,
    fetchDashboardData,
    handleRefresh,
    handlePrevDate,
    handleNextDate,
    getBranchLabel,
  };
}
