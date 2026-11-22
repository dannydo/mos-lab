'use client';

import { useCallback, useMemo, useState } from 'react';
import type { BookingData, ComingClientData } from '../../hooks/useTodayData';
import type { BookerTeamConfig } from '../BookerTeamConfigModal';
import { BRANCH_DISPLAY_NAMES } from './calendarSummaryConstants';
import {
  buildBookerOptions,
  buildGroupedBookerOptions,
  buildHourlyCalendarData,
  computeCalendarSummaryTotals,
  computeMaxHourlyValue,
  computeModalSlotItems,
  filterCalendarBookings,
  filterCalendarComingList,
  readIsMaskedPhoneRole,
} from './calendarSummaryHelpers';
import type { CalendarBranchFilter, MatrixStatusFilter, RevenueDetailContext, SelectedCalendarSlot } from './types';

interface UseTodayCalendarSummaryParams {
  allBookings: BookingData[];
  allComingList: ComingClientData[];
  bookingBranch: CalendarBranchFilter;
  selectedBooker: string | null;
  teamConfig?: BookerTeamConfig;
}

export function useTodayCalendarSummary({
  allBookings,
  allComingList,
  bookingBranch,
  selectedBooker,
  teamConfig,
}: UseTodayCalendarSummaryParams) {
  const [matrixStatusFilter, setMatrixStatusFilter] = useState<MatrixStatusFilter>('all');
  const [selectedSlot, setSelectedSlot] = useState<SelectedCalendarSlot | null>(null);
  const [revenueDetailContext, setRevenueDetailContext] = useState<RevenueDetailContext | null>(null);
  const [revenueDetailOpen, setRevenueDetailOpen] = useState(false);

  const isMaskedRole = useMemo(() => readIsMaskedPhoneRole(), []);

  const bookerOptions = useMemo(() => buildBookerOptions(allBookings, allComingList), [allBookings, allComingList]);

  const groupedBookerOptions = useMemo(() => buildGroupedBookerOptions(bookerOptions), [bookerOptions]);

  const filteredBookings = useMemo(
    () => filterCalendarBookings(allBookings, bookingBranch, selectedBooker, teamConfig),
    [allBookings, bookingBranch, selectedBooker, teamConfig]
  );

  const filteredComingList = useMemo(
    () => filterCalendarComingList(allComingList, bookingBranch, selectedBooker, teamConfig),
    [allComingList, bookingBranch, selectedBooker, teamConfig]
  );

  const totals = useMemo(
    () => computeCalendarSummaryTotals(filteredBookings, filteredComingList),
    [filteredBookings, filteredComingList]
  );

  const hourlyData = useMemo(
    () => buildHourlyCalendarData(filteredBookings, filteredComingList),
    [filteredBookings, filteredComingList]
  );

  const maxHourlyVal = useMemo(() => computeMaxHourlyValue(hourlyData), [hourlyData]);

  const modalSlotItems = useMemo(() => computeModalSlotItems(selectedSlot, hourlyData), [selectedSlot, hourlyData]);

  const handleRevenueBarClick = useCallback((hour: string) => {
    setRevenueDetailContext({ hour });
    setRevenueDetailOpen(true);
  }, []);

  const handleRevenueCellClick = useCallback((branchKey: string, hour: string) => {
    setRevenueDetailContext({
      hour,
      branchKey,
      branchName: BRANCH_DISPLAY_NAMES[branchKey] || branchKey,
    });
    setRevenueDetailOpen(true);
  }, []);

  const handleRevenueKpiCardClick = useCallback((type: string) => {
    if (type === 'revenue' || type === 'combo') {
      setRevenueDetailContext({ type });
      setRevenueDetailOpen(true);
    }
  }, []);

  const closeRevenueDetail = useCallback(() => {
    setRevenueDetailOpen(false);
    setRevenueDetailContext(null);
  }, []);

  const openSlotDetail = useCallback((slot: SelectedCalendarSlot) => {
    setSelectedSlot(slot);
  }, []);

  const closeSlotDetail = useCallback(() => {
    setSelectedSlot(null);
  }, []);

  return {
    matrixStatusFilter,
    setMatrixStatusFilter,
    selectedSlot,
    openSlotDetail,
    closeSlotDetail,
    revenueDetailContext,
    revenueDetailOpen,
    handleRevenueBarClick,
    handleRevenueCellClick,
    handleRevenueKpiCardClick,
    closeRevenueDetail,
    isMaskedRole,
    groupedBookerOptions,
    filteredComingList,
    ...totals,
    hourlyData,
    maxHourlyVal,
    modalSlotItems,
  };
}
