'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BkDoneDetailsFilter, BkDoneLeaderboardEntry, ReportComparisonMode } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { usePreviousReportPeriod } from '~/hooks/usePreviousReportPeriod';
import {
  computeBkDoneForecast,
  EMPTY_BK_DONE_SUMMARY,
  filterBkDoneDetails,
  readIsMaskedRole,
  type BkDoneDetailRow,
  type BkDoneSummary,
} from './bkDoneUtils';

interface UseBkDoneDataParams {
  dateRange: [SafeAny, SafeAny];
  selectedStore: string;
  comparisonMode: ReportComparisonMode;
}

/** Coordinates BK Done leaderboard, summary, period comparison, detail records, and filter/pagination state. */
export function useBkDoneData({ dateRange, selectedStore, comparisonMode }: UseBkDoneDataParams) {
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const isMaskedRole = useMemo(() => readIsMaskedRole(), []);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const [leaderboard, setLeaderboard] = useState<BkDoneLeaderboardEntry[]>([]);
  const [summary, setSummary] = useState<BkDoneSummary>(EMPTY_BK_DONE_SUMMARY);
  const [previousSummary, setPreviousSummary] = useState<BkDoneSummary | null>(null);

  const [selectedBookerId, setSelectedBookerId] = useState<string | null>(null);
  const [selectedBookerName, setSelectedBookerName] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<BkDoneDetailsFilter>('ALL');
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [detailRecords, setDetailRecords] = useState<BkDoneDetailRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const forecast = useMemo(
    () => computeBkDoneForecast(dateRange, comparisonMode, summary),
    [dateRange, comparisonMode, summary]
  );

  const fetchLeaderboard = useCallback(async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) return;
    setLoading(true);
    try {
      const [res, previousRes] = await Promise.all([
        apiClient.bk.getDoneLeaderboard({
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
          storeId: selectedStore,
        }),
        previousPeriod
          ? apiClient.bk.getDoneLeaderboard({ ...previousPeriod.params, storeId: selectedStore })
          : Promise.resolve(null),
      ]);
      setLeaderboard(res.leaderboard || []);
      setSummary(res.summary || { totalDone: 0, avgDoneRate: 0, totalDoneBonus: 0 });
      setPreviousSummary(previousRes?.summary || null);
    } catch (err) {
      console.error('Error loading BK done leaderboard', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, previousPeriod, selectedStore]);

  const fetchDetails = useCallback(async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) return;
    setDetailsLoading(true);
    try {
      const res = await apiClient.bk.getDoneDetails({
        bookerId: selectedBookerId || 'ALL',
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
        status: filterStatus,
      });
      const data: BkDoneDetailRow[] = (res.data || []).map((item: SafeAny, idx: number) => ({
        ...item,
        rowKeyId: `${item.orderId || 'done'}_${idx}`,
      }));
      setDetailRecords(data);
    } catch (err) {
      console.error('Error fetching done details', err);
    } finally {
      setDetailsLoading(false);
    }
  }, [dateRange, selectedStore, selectedBookerId, filterStatus]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, selectedStore, selectedBookerId, filterStatus, searchText]);

  // Instantly refresh BK Done Leaderboard & Details when calls/bookings are saved
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
    (bookerId: string, bookerName?: string) => {
      if (selectedBookerId === bookerId) {
        setSelectedBookerId(null);
        setSelectedBookerName(null);
      } else {
        setSelectedBookerId(bookerId);
        const found = leaderboard.find((item) => String(item.bookerId) === bookerId);
        setSelectedBookerName(bookerName || found?.displayName || `BK #${bookerId}`);
      }
    },
    [leaderboard, selectedBookerId]
  );

  const clearBookerFilter = useCallback(() => {
    setSelectedBookerId(null);
    setSelectedBookerName(null);
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

  const handlePaginationChange = useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);

  const filteredDetailRecords = useMemo(
    () => filterBkDoneDetails(detailRecords, searchText),
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
    filterStatus,
    setFilterStatus,
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    filteredDetailRecords,
    currentPage,
    pageSize,
    handlePaginationChange,
    selectedCustomerId,
    customerDrawerOpen,
    openCustomerDrawer,
    closeCustomerDrawer,
    handleSelectBooker,
    clearBookerFilter,
    fetchDetails,
  };
}
