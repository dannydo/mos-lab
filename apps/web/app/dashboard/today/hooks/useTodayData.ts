'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';

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

  const fetchDashboardData = useCallback(async (date: dayjs.Dayjs, isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    } else {
      setSilentLoading(true);
    }
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const data = (await apiClient.dashboard.getToday({ date: dateStr })) as SafeAny;
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
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDashboardData(selectedDate);
    }
  }, [selectedDate, fetchDashboardData]);

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
          fetchDashboardData(selectedDate, true);
          return refreshInterval;
        }
        return prev - 1;
      });
    };

    const timer = setInterval(tick, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData(selectedDate, true);
        setCountdown(refreshInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, selectedDate, refreshInterval, fetchDashboardData]);

  // Reset countdown if selectedDate changes or refreshInterval changes
  useEffect(() => {
    setCountdown(refreshInterval);
  }, [selectedDate, refreshInterval]);

  const handleRefresh = async () => {
    if (selectedDate) {
      await fetchDashboardData(selectedDate);
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
      if (selectedBooker && (b.booker || '').toLowerCase() !== selectedBooker.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [allBookings, bookingFilter, bookingBranch, selectedBooker]);

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
      if (selectedBooker && (item.booker || '').toLowerCase() !== selectedBooker.toLowerCase()) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => a.time.localeCompare(b.time));
  }, [allComingList, comingBranch, comingCategory, selectedBooker]);

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

    // setters
    setSelectedDate,
    setAutoRefresh,
    setRefreshInterval,
    setCountdown,
    setBookingFilter: changeBookingFilter,
    setBookingBranch: changeBookingBranch,
    setComingBranch: changeComingBranch,
    setComingCategory: changeComingCategory,
    setShopBranch: changeShopBranch,
    setSelectedBooker: changeSelectedBooker,
    setDrawerVisible,
    setSelectedCustomer,
    setShowTax,

    // functions
    openCustomerDrawer,
    fetchDashboardData,
    handleRefresh,
    getBranchLabel,
  };
}
