'use client';

import { useCallback, useMemo, useState } from 'react';
import type dayjs from 'dayjs';
import type { CcXoayRecord, CcXoayReportResponse } from '@mos-lab/shared';
import {
  aggregateConsultants,
  buildStaffCapMap,
  type CcXoayComparisonMode,
  computeCapSummary,
  computeCcXoayElapsedRatioPercent,
  computeProjectedBonus,
  filterCcXoayData,
} from './cc-xoay-utils';

interface UseCcXoayStateParams {
  data: CcXoayRecord[];
  summary?: CcXoayReportResponse['summary'];
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  comparisonMode?: CcXoayComparisonMode;
}

export function useCcXoayState({ data, summary, dateRange, comparisonMode = 'month' }: UseCcXoayStateParams) {
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);

  const toggleCompact = useCallback(() => {
    setIsCompact((prev) => !prev);
  }, []);

  const isMonthMode = comparisonMode === 'month';
  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';

  const elapsedRatioPercent = useMemo(
    () => computeCcXoayElapsedRatioPercent(dateRange, comparisonMode),
    [dateRange, comparisonMode]
  );

  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  const projectedCheckins = Math.round((summary?.totalCheckins || 0) / (ratio || 1));
  const projectedPoints = Math.round((summary?.totalPoints || 0) / (ratio || 1));

  const consultantAggregates = useMemo(() => aggregateConsultants(data), [data]);

  const projectedBonus = useMemo(
    () => computeProjectedBonus(isMonthMode, consultantAggregates, ratio, summary?.totalBonus),
    [isMonthMode, consultantAggregates, ratio, summary?.totalBonus]
  );

  const staffCapMap = useMemo(() => buildStaffCapMap(data), [data]);
  const capSummary = useMemo(() => computeCapSummary(staffCapMap), [staffCapMap]);
  const filteredData = useMemo(() => filterCcXoayData(data, searchText), [data, searchText]);

  return {
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    isMonthMode,
    isDayMode,
    periodNoun,
    elapsedRatioPercent,
    isPastPeriod,
    projectedCheckins,
    projectedPoints,
    projectedBonus,
    staffCapMap,
    capSummary,
    filteredData,
  };
}
