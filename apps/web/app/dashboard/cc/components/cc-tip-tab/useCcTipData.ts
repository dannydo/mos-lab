'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { CcTipLeaderboardEntry, CcTipLeaderboardResponse, CcTipRecord, TipFilterType } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  DEFAULT_TIP_SUMMARY,
  TipComparisonMode,
  computeTipElapsedRatioPercent,
  countTipStatusBuckets,
  filterCcTipRecords,
  projectTipMetric,
} from './cc-tip-utils';

interface UseCcTipDataParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore: string;
  selectedConsultant?: string;
  comparisonMode: TipComparisonMode;
  onSelectConsultant?: (consultantName: string) => void;
}

export function useCcTipData({
  dateRange,
  selectedStore,
  selectedConsultant,
  comparisonMode,
  onSelectConsultant,
}: UseCcTipDataParams) {
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<CcTipLeaderboardEntry[]>([]);
  const [records, setRecords] = useState<CcTipRecord[]>([]);
  const [selectedCcName, setSelectedCcName] = useState<string | null>(null);
  const [tipFilter, setTipFilter] = useState<TipFilterType>('ALL');
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [summary, setSummary] = useState<CcTipLeaderboardResponse['summary']>(DEFAULT_TIP_SUMMARY);

  const latestRequestIdRef = useRef(0);

  // Sync external consultant filter when passed from parent toolbar.
  useEffect(() => {
    if (selectedConsultant && selectedConsultant !== 'ALL') {
      setSelectedCcName(selectedConsultant);
    }
  }, [selectedConsultant]);

  const elapsedRatioPercent = useMemo(() => computeTipElapsedRatioPercent(dateRange), [dateRange]);
  const isPastPeriod = elapsedRatioPercent >= 100;
  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';
  const ratio = (elapsedRatioPercent || 100) / 100;

  const projectedTotalCcTipBonus = useMemo(
    () => projectTipMetric(summary.totalCcTipBonus, ratio),
    [summary.totalCcTipBonus, ratio]
  );

  const projectedTotalCustomerTip = useMemo(
    () => projectTipMetric(summary.totalCustomerTip, ratio),
    [summary.totalCustomerTip, ratio]
  );

  const fetchTipData = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const [lbRes, recRes] = await Promise.all([
        apiClient.kpi.getCcTipLeaderboard({
          dateFrom,
          dateTo,
          storeId: selectedStore,
          comparisonMode,
        }),
        apiClient.kpi.getCcTipRecords({
          dateFrom,
          dateTo,
          storeId: selectedStore,
          consultantId: selectedCcName || 'ALL',
          tipFilter: 'ALL',
          limit: 3000,
        }),
      ]);

      if (latestRequestIdRef.current !== requestId) return;

      if (lbRes && lbRes.leaderboard) {
        setLeaderboard(lbRes.leaderboard);
        setSummary(lbRes.summary);
      }

      if (recRes && recRes.data) {
        setRecords(recRes.data);
      }
    } catch (err) {
      if (latestRequestIdRef.current === requestId) {
        console.error('Lỗi tải dữ liệu thưởng Tip CC:', err);
      }
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [comparisonMode, dateRange, selectedStore, selectedCcName]);

  useEffect(() => {
    void fetchTipData();
  }, [fetchTipData]);

  const toggleConsultantSelection = useCallback(
    (name: string) => {
      const nextName = selectedCcName === name ? null : name;
      setSelectedCcName(nextName);
      onSelectConsultant?.(nextName || 'ALL');
    },
    [onSelectConsultant, selectedCcName]
  );

  const clearSelectedConsultant = useCallback(() => {
    setSelectedCcName(null);
  }, []);

  const toggleCompact = useCallback(() => {
    setIsCompact((prev) => !prev);
  }, []);

  const filteredRecords = useMemo(
    () => filterCcTipRecords(records, tipFilter, searchText),
    [records, tipFilter, searchText]
  );

  const { totalTippedCount, totalSmallChangeCount, totalNoTipCount } = useMemo(
    () => countTipStatusBuckets(records),
    [records]
  );

  return {
    loading,
    leaderboard,
    records,
    summary,
    selectedCcName,
    toggleConsultantSelection,
    clearSelectedConsultant,
    tipFilter,
    setTipFilter,
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    fetchTipData,
    elapsedRatioPercent,
    isPastPeriod,
    isDayMode,
    periodNoun,
    ratio,
    projectedTotalCcTipBonus,
    projectedTotalCustomerTip,
    filteredRecords,
    totalTippedCount,
    totalSmallChangeCount,
    totalNoTipCount,
  };
}
