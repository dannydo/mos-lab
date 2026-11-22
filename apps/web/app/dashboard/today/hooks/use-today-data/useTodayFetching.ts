'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type dayjs from 'dayjs';
import type { RevenueHourlyResponse } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { TodaySandboxContextValue } from '../../context/SandboxModeContext';
import type {
  BookingBranchFilter,
  BookingData,
  BranchDetail,
  PreviousTodaySnapshot,
  TodayDateRangeMode,
  TodayPreviousReportPeriod,
  UseTodayDataOptions,
} from './todayDataTypes';
import {
  TODAY_DATA_REFRESH_EVENTS,
  buildSandboxDashboardSnapshot,
  buildSandboxRevenueData,
  createInitialBranchesData,
  getDashboardDateRange,
} from './todayDataUtils';

interface UseTodayFetchingParams {
  sandbox: TodaySandboxContextValue;
  selectedDate: dayjs.Dayjs | null;
  dateRangeMode: TodayDateRangeMode;
  previousPeriod: TodayPreviousReportPeriod;
  bookingBranch: BookingBranchFilter;
  selectedBooker: string | null;
  showRevenueView: boolean;
  optionsRef: RefObject<UseTodayDataOptions | undefined>;
}

export function useTodayFetching({
  sandbox,
  selectedDate,
  dateRangeMode,
  previousPeriod,
  bookingBranch,
  selectedBooker,
  showRevenueView,
  optionsRef,
}: UseTodayFetchingParams) {
  const dashboardRequestVersion = useRef(0);
  const revenueRequestVersion = useRef(0);

  const [loading, setLoading] = useState(false);
  const [silentLoading, setSilentLoading] = useState(false);
  const [branchesData, setBranchesData] = useState<Record<string, BranchDetail>>(createInitialBranchesData);
  const [bookingsCombo, setBookingsCombo] = useState<BookingData[]>([]);
  const [bookingsOc, setBookingsOc] = useState<BookingData[]>([]);
  const [bookingsOther, setBookingsOther] = useState<BookingData[]>([]);
  const [previousDashboardData, setPreviousDashboardData] = useState<PreviousTodaySnapshot | null>(null);

  const [revenueData, setRevenueData] = useState<RevenueHourlyResponse | null>(null);
  const [previousRevenueData, setPreviousRevenueData] = useState<RevenueHourlyResponse | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const applySandboxDashboardData = useCallback(() => {
    const snapshot = buildSandboxDashboardSnapshot({
      mode: sandbox.mode,
      staffOverrides: sandbox.staffOverrides,
      simulatedCombos: sandbox.simulatedCombos,
      simulatedProducts: sandbox.simulatedProducts,
    });
    if (!snapshot) return;
    setBranchesData(snapshot.branchesData);
    setBookingsCombo(snapshot.bookingsCombo);
    setBookingsOc(snapshot.bookingsOc);
    setBookingsOther(snapshot.bookingsOther);
    setPreviousDashboardData(null);
  }, [sandbox.mode, sandbox.staffOverrides, sandbox.simulatedCombos, sandbox.simulatedProducts]);

  const fetchDashboardData = useCallback(
    async (date: dayjs.Dayjs, mode: TodayDateRangeMode = 'day', isSilent = false, includePreviousPeriod = true) => {
      const requestVersion = ++dashboardRequestVersion.current;
      if (!isSilent) {
        setLoading(true);
      } else {
        setSilentLoading(true);
      }

      if (sandbox.isSandbox) {
        applySandboxDashboardData();
        if (!isSilent) {
          setLoading(false);
        } else {
          setSilentLoading(false);
        }
        return;
      }

      try {
        const previousRequest =
          includePreviousPeriod && previousPeriod
            ? apiClient.dashboard.getToday(previousPeriod.params).catch((error) => {
                console.error('Fetch previous dashboard period error:', error);
                return null;
              })
            : Promise.resolve(null);
        const [response, previousData] = await Promise.all([
          apiClient.dashboard.getToday(getDashboardDateRange(date, mode)),
          previousRequest,
        ]);
        if (requestVersion !== dashboardRequestVersion.current) return;
        const data = response as SafeAny;
        setBranchesData(data.branchesData);
        setBookingsCombo(data.bookingsCombo);
        setBookingsOc(data.bookingsOc || []);
        setBookingsOther(data.bookingsOther);
        setPreviousDashboardData(
          previousData
            ? {
                branchesData: previousData.branchesData as Record<string, BranchDetail>,
                bookingsCombo: previousData.bookingsCombo as BookingData[],
                bookingsOc: (previousData.bookingsOc || []) as BookingData[],
                bookingsOther: previousData.bookingsOther as BookingData[],
              }
            : null
        );
      } catch (err) {
        if (requestVersion !== dashboardRequestVersion.current) return;
        console.error('Fetch dashboard today error:', err);
        if (!isSilent) {
          optionsRef.current?.onError?.('Lỗi khi tải dữ liệu vận hành thực tế!');
        }
      } finally {
        if (requestVersion === dashboardRequestVersion.current) {
          if (!isSilent) {
            setLoading(false);
          } else {
            setSilentLoading(false);
          }
        }
      }
    },
    [applySandboxDashboardData, optionsRef, previousPeriod, sandbox.isSandbox]
  );

  const fetchRevenueData = useCallback(
    async (date: dayjs.Dayjs, mode: TodayDateRangeMode = 'day', includePreviousPeriod = true) => {
      const requestVersion = ++revenueRequestVersion.current;
      setRevenueLoading(true);

      if (sandbox.isSandbox) {
        const mockHourly = buildSandboxRevenueData({
          mode: sandbox.mode,
          totalSimulatedRevenue: sandbox.totalSimulatedRevenue,
          totalSimulatedComboRevenue: sandbox.totalSimulatedComboRevenue,
          totalSimulatedProductRevenue: sandbox.totalSimulatedProductRevenue,
        });
        if (requestVersion === revenueRequestVersion.current) {
          setRevenueData(mockHourly);
          setPreviousRevenueData(null);
          setRevenueLoading(false);
        }
        return;
      }

      try {
        const revParams: SafeAny = { ...getDashboardDateRange(date, mode) };
        if (bookingBranch !== 'all') revParams.branchKey = bookingBranch;
        if (selectedBooker && selectedBooker !== 'all') revParams.bookerFilter = selectedBooker;
        const previousRevenueParams: SafeAny =
          includePreviousPeriod && previousPeriod ? { ...previousPeriod.params } : null;
        if (previousRevenueParams && bookingBranch !== 'all') previousRevenueParams.branchKey = bookingBranch;
        if (previousRevenueParams && selectedBooker && selectedBooker !== 'all') {
          previousRevenueParams.bookerFilter = selectedBooker;
        }
        const previousRevenueRequest = previousRevenueParams
          ? apiClient.dashboard.getRevenueHourly(previousRevenueParams).catch((error) => {
              console.error('Fetch previous revenue period error:', error);
              return null;
            })
          : Promise.resolve(null);
        const [revData, previousRevenue] = await Promise.all([
          apiClient.dashboard.getRevenueHourly(revParams),
          previousRevenueRequest,
        ]);
        if (requestVersion === revenueRequestVersion.current) {
          setRevenueData(revData);
          setPreviousRevenueData(previousRevenue);
        }
      } catch (err) {
        if (requestVersion === revenueRequestVersion.current) {
          console.error('Fetch revenue hourly error:', err);
        }
      } finally {
        if (requestVersion === revenueRequestVersion.current) setRevenueLoading(false);
      }
    },
    [
      bookingBranch,
      previousPeriod,
      sandbox.isSandbox,
      sandbox.mode,
      sandbox.totalSimulatedRevenue,
      sandbox.totalSimulatedComboRevenue,
      sandbox.totalSimulatedProductRevenue,
      selectedBooker,
    ]
  );

  const refreshTodayData = useCallback(
    async (date: dayjs.Dayjs, mode: TodayDateRangeMode = 'day', isSilent = false, includePreviousPeriod = true) => {
      const requests = [fetchDashboardData(date, mode, isSilent, includePreviousPeriod)];
      if (showRevenueView) {
        requests.push(fetchRevenueData(date, mode, includePreviousPeriod));
      }
      await Promise.all(requests);
    },
    [fetchDashboardData, fetchRevenueData, showRevenueView]
  );

  useEffect(() => {
    if (selectedDate) {
      void fetchDashboardData(selectedDate, dateRangeMode);
    }
  }, [selectedDate, dateRangeMode, fetchDashboardData]);

  // Revenue is opt-in: avoid two additional requests until the user opens the revenue view.
  useEffect(() => {
    if (showRevenueView && selectedDate) {
      void fetchRevenueData(selectedDate, dateRangeMode);
    }
  }, [showRevenueView, selectedDate, dateRangeMode, fetchRevenueData]);

  // Synchronize mock data immediately when sandbox state changes
  useEffect(() => {
    if (!sandbox.isSandbox) return;
    applySandboxDashboardData();
  }, [sandbox.isSandbox, applySandboxDashboardData]);

  // When switching back to live data, immediately fetch real data
  useEffect(() => {
    if (sandbox.mode === 'live' && selectedDate) {
      void fetchDashboardData(selectedDate, dateRangeMode);
      if (showRevenueView) {
        void fetchRevenueData(selectedDate, dateRangeMode);
      }
    }
  }, [sandbox.mode, selectedDate, dateRangeMode, showRevenueView, fetchDashboardData, fetchRevenueData]);

  // Instantly refresh today dashboard tables when popup/modal updates data
  useEffect(() => {
    const handleDataChanged = () => {
      if (selectedDate) {
        void refreshTodayData(selectedDate, dateRangeMode, true, false);
      }
    };
    TODAY_DATA_REFRESH_EVENTS.forEach((eventName) => window.addEventListener(eventName, handleDataChanged));
    return () => {
      TODAY_DATA_REFRESH_EVENTS.forEach((eventName) => window.removeEventListener(eventName, handleDataChanged));
    };
  }, [selectedDate, dateRangeMode, refreshTodayData]);

  return {
    loading,
    silentLoading,
    branchesData,
    bookingsCombo,
    bookingsOc,
    bookingsOther,
    previousDashboardData,
    revenueData,
    previousRevenueData,
    revenueLoading,
    fetchDashboardData,
    refreshTodayData,
  };
}
