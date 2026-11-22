'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BkBookingDetailsFilter, BkBookingLeaderboardEntry, ReportComparisonMode } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { usePreviousReportPeriod } from '~/hooks/usePreviousReportPeriod';
import {
  computeBkBookingForecast,
  EMPTY_BK_BOOKING_SUMMARY,
  filterBkBookingDetails,
  readIsMaskedRole,
  type BkBookingDetailRow,
  type BkBookingSummary,
} from './bkBookingUtils';

interface UseBkBookingDataParams {
  dateRange: [SafeAny, SafeAny];
  selectedStore: string;
  comparisonMode: ReportComparisonMode;
}

export function useBkBookingData({ dateRange, selectedStore, comparisonMode }: UseBkBookingDataParams) {
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const isMaskedRole = useMemo(() => readIsMaskedRole(), []);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const [leaderboard, setLeaderboard] = useState<BkBookingLeaderboardEntry[]>([]);
  const [summary, setSummary] = useState<BkBookingSummary>(EMPTY_BK_BOOKING_SUMMARY);
  const [previousSummary, setPreviousSummary] = useState<BkBookingSummary | null>(null);

  const [selectedBookerId, setSelectedBookerId] = useState<string | null>(null);
  const [selectedBookerName, setSelectedBookerName] = useState<string | null>(null);
  const [selectedDetailStatus, setSelectedDetailStatus] = useState<BkBookingDetailsFilter>('ALL');
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [detailRecords, setDetailRecords] = useState<BkBookingDetailRow[]>([]);

  const forecast = useMemo(
    () => computeBkBookingForecast(dateRange, comparisonMode, summary),
    [dateRange, comparisonMode, summary]
  );

  const fetchLeaderboard = useCallback(async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) return;
    setLoading(true);
    try {
      const [res, previousRes] = await Promise.all([
        apiClient.bk.getBookingLeaderboard({
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
          storeId: selectedStore,
        }),
        previousPeriod
          ? apiClient.bk.getBookingLeaderboard({ ...previousPeriod.params, storeId: selectedStore })
          : Promise.resolve(null),
      ]);
      setLeaderboard(res.leaderboard || []);
      setSummary(res.summary || EMPTY_BK_BOOKING_SUMMARY);
      setPreviousSummary(previousRes?.summary || null);
    } catch (err) {
      console.error('Error loading BK booking leaderboard', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, previousPeriod, selectedStore]);

  const fetchDetails = useCallback(async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) return;
    setDetailsLoading(true);
    try {
      const res = await apiClient.bk.getBookingDetails({
        bookerId: selectedBookerId || 'ALL',
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
        status: selectedDetailStatus,
      });
      const data: BkBookingDetailRow[] = (res.data || []).map((item: SafeAny, idx: number) => ({
        ...item,
        rowKeyId: `${item.orderId || 'bk'}_${idx}`,
      }));
      setDetailRecords(data);
    } catch (err) {
      console.error('Error fetching booking details', err);
    } finally {
      setDetailsLoading(false);
    }
  }, [dateRange, selectedStore, selectedBookerId, selectedDetailStatus]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Instantly refresh BK Leaderboard & Details when calls/bookings are saved
  useEffect(() => {
    const handleDataChanged = () => {
      fetchLeaderboard();
      fetchDetails();
    };
    window.addEventListener('mos-data-updated', handleDataChanged);
    window.addEventListener('mos-call-log-saved', handleDataChanged);
    window.addEventListener('mos-customer-updated', handleDataChanged);
    window.addEventListener('mos-booking-updated', handleDataChanged);
    return () => {
      window.removeEventListener('mos-data-updated', handleDataChanged);
      window.removeEventListener('mos-call-log-saved', handleDataChanged);
      window.removeEventListener('mos-customer-updated', handleDataChanged);
      window.removeEventListener('mos-booking-updated', handleDataChanged);
    };
  }, [fetchLeaderboard, fetchDetails]);

  const handleSelectBooker = useCallback(
    (bookerId: string, bookerName?: string, detailStatus: BkBookingDetailsFilter = 'ALL') => {
      if (selectedBookerId === bookerId && selectedDetailStatus === detailStatus) {
        setSelectedBookerId(null);
        setSelectedBookerName(null);
        setSelectedDetailStatus('ALL');
      } else {
        setSelectedBookerId(bookerId);
        const found = leaderboard.find((item) => String(item.bookerId) === bookerId);
        setSelectedBookerName(bookerName || found?.displayName || `BK #${bookerId}`);
        setSelectedDetailStatus(detailStatus);
      }
    },
    [leaderboard, selectedBookerId, selectedDetailStatus]
  );

  const clearBookerFilter = useCallback(() => {
    setSelectedBookerId(null);
    setSelectedBookerName(null);
    setSelectedDetailStatus('ALL');
  }, []);

  const clearStatusFilter = useCallback(() => {
    setSelectedDetailStatus('ALL');
  }, []);

  const openCustomerDrawer = useCallback((customerId: number) => {
    setSelectedCustomerId(customerId);
    setCustomerDrawerOpen(true);
  }, []);

  const closeCustomerDrawer = useCallback(() => {
    setCustomerDrawerOpen(false);
  }, []);

  const toggleCompact = useCallback(() => {
    setIsCompact((prev) => !prev);
  }, []);

  const filteredDetailRecords = useMemo(
    () => filterBkBookingDetails(detailRecords, searchText),
    [detailRecords, searchText]
  );

  return {
    loading,
    detailsLoading,
    isMaskedRole,
    previousPeriod,
    leaderboard,
    summary,
    previousSummary,
    forecast,
    selectedBookerId,
    selectedBookerName,
    selectedDetailStatus,
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    filteredDetailRecords,
    selectedCustomerId,
    customerDrawerOpen,
    openCustomerDrawer,
    closeCustomerDrawer,
    handleSelectBooker,
    clearBookerFilter,
    clearStatusFilter,
    fetchDetails,
  };
}
