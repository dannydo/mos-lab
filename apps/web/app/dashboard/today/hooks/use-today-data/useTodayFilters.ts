'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type dayjs from 'dayjs';
import { DEFAULT_BOOKER_TEAMS, type BookerTeamConfig } from '../../components/BookerTeamConfigModal';
import type { BookingBranchFilter, TodayBranchFilter, TodayCategoryFilter, TodayDateRangeMode } from './todayDataTypes';
import {
  computeDateBounds,
  persistUrlAndStoragePreference,
  readPersistedTodayPreferences,
  shiftSelectedDate,
} from './todayDataUtils';

export function useTodayFilters() {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [dateRangeMode, setDateRangeMode] = useState<TodayDateRangeMode>('day');

  // Auto-refresh states
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60); // default to 60s
  const [countdown, setCountdown] = useState(60);
  const [refreshResetSignal, setRefreshResetSignal] = useState(0);

  // Filter & modal states
  const [bookingFilter, setBookingFilter] = useState<TodayCategoryFilter>('all');
  const [bookingBranch, setBookingBranch] = useState<BookingBranchFilter>('all');
  const [comingBranch, setComingBranch] = useState<TodayBranchFilter>('detham');
  const [comingCategory, setComingCategory] = useState<TodayCategoryFilter>('all');
  const [shopBranch, setShopBranch] = useState<TodayBranchFilter>('detham');
  const [selectedBooker, setSelectedBooker] = useState<string | null>(null);
  const [teamConfig, setTeamConfig] = useState<BookerTeamConfig>(DEFAULT_BOOKER_TEAMS);
  const [teamModalVisible, setTeamModalVisible] = useState(false);

  // Drawer & revenue display states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SafeAny | null>(null);
  const [showTax, setShowTax] = useState(true);
  const [showRevenueView, setShowRevenueView] = useState(false);

  // Load persisted states on mount
  useEffect(() => {
    const prefs = readPersistedTodayPreferences();
    if (!prefs) return;

    if (prefs.teamConfig) setTeamConfig(prefs.teamConfig);
    if (prefs.dateRangeMode) setDateRangeMode(prefs.dateRangeMode);
    setSelectedDate(prefs.selectedDate);
    if (prefs.showTax !== undefined) setShowTax(prefs.showTax);
    if (prefs.showRevenueView !== undefined) setShowRevenueView(prefs.showRevenueView);
    if (prefs.bookingFilter) setBookingFilter(prefs.bookingFilter);
    if (prefs.bookingBranch) setBookingBranch(prefs.bookingBranch);
    if (prefs.comingBranch) setComingBranch(prefs.comingBranch);
    if (prefs.comingCategory) setComingCategory(prefs.comingCategory);
    if (prefs.shopBranch) setShopBranch(prefs.shopBranch);
    if (prefs.selectedBooker) setSelectedBooker(prefs.selectedBooker);
    if (prefs.autoRefresh !== undefined) setAutoRefresh(prefs.autoRefresh);
    if (prefs.refreshInterval !== undefined) {
      setRefreshInterval(prefs.refreshInterval);
      setCountdown(prefs.refreshInterval);
    }
  }, []);

  // Reset countdown signal if selectedDate changes or refreshInterval changes
  useEffect(() => {
    setCountdown(refreshInterval);
    setRefreshResetSignal((s) => s + 1);
  }, [selectedDate, refreshInterval]);

  const resetCountdown = useCallback(() => {
    setCountdown(refreshInterval);
    setRefreshResetSignal((s) => s + 1);
  }, [refreshInterval]);

  const openCustomerDrawer = useCallback((record: SafeAny) => {
    setSelectedCustomer(record);
    setDrawerVisible(true);
  }, []);

  const dateBounds = useMemo(() => computeDateBounds(selectedDate, dateRangeMode), [selectedDate, dateRangeMode]);

  const handlePrevDate = useCallback(() => {
    if (!selectedDate) return;
    const newDate = shiftSelectedDate(selectedDate, dateRangeMode, 'prev');
    setSelectedDate(newDate);
    localStorage.setItem('today_selected_date', newDate.format('YYYY-MM-DD'));
  }, [selectedDate, dateRangeMode]);

  const handleNextDate = useCallback(() => {
    if (!selectedDate) return;
    const newDate = shiftSelectedDate(selectedDate, dateRangeMode, 'next');
    setSelectedDate(newDate);
    localStorage.setItem('today_selected_date', newDate.format('YYYY-MM-DD'));
  }, [selectedDate, dateRangeMode]);

  const changeDateRangeMode = useCallback((mode: TodayDateRangeMode) => {
    setDateRangeMode(mode);
    localStorage.setItem('today_date_range_mode', mode);
  }, []);

  const saveTeamConfig = useCallback((newConfig: BookerTeamConfig) => {
    setTeamConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('booker_team_config', JSON.stringify(newConfig));
    }
  }, []);

  const changeBookingFilter = useCallback((val: TodayCategoryFilter) => {
    setBookingFilter(val);
    persistUrlAndStoragePreference('today_booking_filter', 'bookingFilter', val);
  }, []);

  const changeBookingBranch = useCallback((val: BookingBranchFilter) => {
    setBookingBranch(val);
    persistUrlAndStoragePreference('today_booking_branch', 'bookingBranch', val);
  }, []);

  const changeComingBranch = useCallback((val: TodayBranchFilter) => {
    setComingBranch(val);
    persistUrlAndStoragePreference('today_coming_branch', 'comingBranch', val);
  }, []);

  const changeComingCategory = useCallback((val: TodayCategoryFilter) => {
    setComingCategory(val);
    persistUrlAndStoragePreference('today_coming_category', 'comingCategory', val);
  }, []);

  const changeShopBranch = useCallback((val: TodayBranchFilter) => {
    setShopBranch(val);
    persistUrlAndStoragePreference('today_shop_branch', 'shopBranch', val);
  }, []);

  const changeSelectedBooker = useCallback((val: string | null) => {
    setSelectedBooker(val);
    persistUrlAndStoragePreference('today_selected_booker', 'booker', val);
  }, []);

  const changeShowRevenueView = useCallback((val: boolean) => {
    setShowRevenueView(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('today_show_revenue_view', String(val));
    }
  }, []);

  return {
    selectedDate,
    dateRangeMode,
    autoRefresh,
    refreshInterval,
    countdown,
    refreshResetSignal,
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
    showRevenueView,
    dateBounds,
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
    setShowRevenueView: changeShowRevenueView,
    openCustomerDrawer,
    handlePrevDate,
    handleNextDate,
    resetCountdown,
  };
}
