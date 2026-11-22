'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { usePreviousReportPeriod } from '~/hooks/usePreviousReportPeriod';
import { useTodaySandbox } from '../context/SandboxModeContext';
import type { UseTodayDataOptions } from './use-today-data/todayDataTypes';
import {
  buildActiveShopData,
  buildAllComingList,
  combineBookingsWithCategory,
  computeBookingBranchCounts,
  filterAndSortComingList,
  filterBookingsList,
  getBranchLabel,
  getDashboardDateRange,
} from './use-today-data/todayDataUtils';
import { useTodayFetching } from './use-today-data/useTodayFetching';
import { useTodayFilters } from './use-today-data/useTodayFilters';

export type {
  BookingData,
  ComingClientData,
  ShopCCData,
  ShopCVData,
  BranchDetail,
  UseTodayDataOptions,
} from './use-today-data/todayDataTypes';

export function useTodayData(options?: UseTodayDataOptions) {
  const sandbox = useTodaySandbox();
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const filters = useTodayFilters();
  const {
    selectedDate,
    dateRangeMode,
    bookingFilter,
    bookingBranch,
    comingBranch,
    comingCategory,
    shopBranch,
    selectedBooker,
    teamConfig,
    showTax,
    showRevenueView,
    resetCountdown,
  } = filters;

  const comparisonRange = useMemo<[dayjs.Dayjs, dayjs.Dayjs] | undefined>(() => {
    if (!selectedDate) return undefined;
    const { dateFrom, dateTo } = getDashboardDateRange(selectedDate, dateRangeMode);
    return [dayjs(dateFrom), dayjs(dateTo)];
  }, [dateRangeMode, selectedDate]);
  const previousPeriod = usePreviousReportPeriod(comparisonRange, dateRangeMode);

  const fetching = useTodayFetching({
    sandbox,
    selectedDate,
    dateRangeMode,
    previousPeriod,
    bookingBranch,
    selectedBooker,
    showRevenueView,
    optionsRef,
  });
  const {
    branchesData,
    bookingsCombo,
    bookingsOc,
    bookingsOther,
    previousDashboardData,
    fetchDashboardData,
    refreshTodayData,
  } = fetching;

  const triggerSilentRefresh = useCallback(() => {
    if (!selectedDate) return;
    void refreshTodayData(selectedDate, dateRangeMode, true, false);
  }, [selectedDate, dateRangeMode, refreshTodayData]);

  const handleRefresh = useCallback(async () => {
    if (selectedDate) {
      await refreshTodayData(selectedDate, dateRangeMode);
      optionsRef.current?.onSuccess?.('Đã làm mới dữ liệu vận hành từ cơ sở dữ liệu!');
      resetCountdown();
    }
  }, [selectedDate, dateRangeMode, refreshTodayData, resetCountdown]);

  const allBookings = useMemo(
    () => combineBookingsWithCategory(bookingsCombo, bookingsOc, bookingsOther, true),
    [bookingsCombo, bookingsOc, bookingsOther]
  );

  const previousAllBookings = useMemo(() => {
    if (!previousDashboardData) return [];
    return combineBookingsWithCategory(
      previousDashboardData.bookingsCombo,
      previousDashboardData.bookingsOc,
      previousDashboardData.bookingsOther
    );
  }, [previousDashboardData]);

  const bookingBranchCounts = useMemo(() => computeBookingBranchCounts(allBookings), [allBookings]);

  const filteredBookings = useMemo(
    () => filterBookingsList(allBookings, bookingFilter, bookingBranch, selectedBooker, teamConfig),
    [allBookings, bookingFilter, bookingBranch, selectedBooker, teamConfig]
  );

  const allComingList = useMemo(() => buildAllComingList(branchesData), [branchesData]);

  const activeComingList = useMemo(
    () => filterAndSortComingList(allComingList, comingBranch, comingCategory, selectedBooker, teamConfig),
    [allComingList, comingBranch, comingCategory, selectedBooker, teamConfig]
  );

  const activeShopData = useMemo(
    () => buildActiveShopData(branchesData, shopBranch, showTax),
    [branchesData, shopBranch, showTax]
  );

  return {
    // Sandbox state
    sandbox,
    isSandbox: sandbox.isSandbox,
    sandboxMode: sandbox.mode,

    // states
    loading: fetching.loading,
    selectedDate,
    dateRangeMode,
    autoRefresh: filters.autoRefresh,
    refreshInterval: filters.refreshInterval,
    countdown: filters.countdown,
    refreshResetSignal: filters.refreshResetSignal,
    silentLoading: fetching.silentLoading,
    bookingFilter,
    bookingBranch,
    comingBranch,
    comingCategory,
    shopBranch,
    selectedBooker,
    teamConfig,
    teamModalVisible: filters.teamModalVisible,
    drawerVisible: filters.drawerVisible,
    selectedCustomer: filters.selectedCustomer,
    showTax,
    branchesData,
    bookingsCombo,
    bookingsOc,
    bookingsOther,
    previousBranchesData: previousDashboardData?.branchesData || null,
    previousAllBookings,
    comparison: previousPeriod?.comparison || null,

    // computed
    allBookings,
    bookingBranchCounts,
    filteredBookings,
    allComingList,
    activeComingList,
    activeShopData,
    dateBounds: filters.dateBounds,

    // setters
    setSelectedDate: filters.setSelectedDate,
    setDateRangeMode: filters.setDateRangeMode,
    setAutoRefresh: filters.setAutoRefresh,
    setRefreshInterval: filters.setRefreshInterval,
    setCountdown: filters.setCountdown,
    setBookingFilter: filters.setBookingFilter,
    setBookingBranch: filters.setBookingBranch,
    setComingBranch: filters.setComingBranch,
    setComingCategory: filters.setComingCategory,
    setShopBranch: filters.setShopBranch,
    setSelectedBooker: filters.setSelectedBooker,
    setTeamConfig: filters.setTeamConfig,
    setTeamModalVisible: filters.setTeamModalVisible,
    saveTeamConfig: filters.saveTeamConfig,
    setDrawerVisible: filters.setDrawerVisible,
    setSelectedCustomer: filters.setSelectedCustomer,
    setShowTax: filters.setShowTax,

    // Revenue View
    revenueData: fetching.revenueData,
    previousRevenueData: fetching.previousRevenueData,
    revenueLoading: fetching.revenueLoading,
    showRevenueView,
    setShowRevenueView: filters.setShowRevenueView,

    // functions
    openCustomerDrawer: filters.openCustomerDrawer,
    fetchDashboardData,
    handleRefresh,
    triggerSilentRefresh,
    handlePrevDate: filters.handlePrevDate,
    handleNextDate: filters.handleNextDate,
    getBranchLabel,
  };
}
