'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { CvTipLeaderboardEntry, CvTipRecord, ReportComparisonMode, TipFilterType } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { usePreviousReportPeriod } from '~/hooks/usePreviousReportPeriod';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import {
  computeCvTipForecast,
  EMPTY_CV_TIP_SUMMARY,
  readSavedCvTipPage,
  readSavedCvTipPageSize,
  saveCvTipPagination,
  type CvTipSummary,
} from './cvTipUtils';

interface UseCvTipDataParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore: string;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
  comparisonMode: ReportComparisonMode;
}

export function useCvTipData({
  dateRange,
  selectedStore,
  selectedConsultant: parentSelectedConsultant,
  onSelectConsultant,
  comparisonMode,
}: UseCvTipDataParams) {
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<CvTipLeaderboardEntry[]>([]);
  const [records, setRecords] = useState<CvTipRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedCvName, setSelectedCvName] = useState<string | null>(null);
  const [tipFilter, setTipFilter] = useState<TipFilterType>('ALL');
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);

  const [summary, setSummary] = useState<CvTipSummary>(EMPTY_CV_TIP_SUMMARY);
  const [previousSummary, setPreviousSummary] = useState<CvTipSummary | null>(null);

  const [pageSize, setPageSize] = useState<number>(readSavedCvTipPageSize);
  const [currentPage, setCurrentPage] = useState<number>(readSavedCvTipPage);
  const deferredSearchText = useDeferredValue(searchText.trim());

  useEffect(() => {
    if (parentSelectedConsultant && parentSelectedConsultant !== 'ALL') {
      setSelectedCvName(parentSelectedConsultant);
      setCurrentPage(1);
    }
  }, [parentSelectedConsultant]);

  const handleSelectCv = useCallback(
    (nextCvName: string | null) => {
      setSelectedCvName(nextCvName);
      setCurrentPage(1);
      onSelectConsultant?.(nextCvName || 'ALL');
    },
    [onSelectConsultant]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const [lbRes, recRes, previousLbRes] = await Promise.all([
        apiClient.kpi.getCvTipLeaderboard({
          dateFrom,
          dateTo,
          storeId: selectedStore,
        }),
        apiClient.kpi.getCvTipRecords({
          dateFrom,
          dateTo,
          storeId: selectedStore,
          consultantId: selectedCvName || parentSelectedConsultant,
          tipFilter,
          page: currentPage,
          limit: pageSize,
          search: deferredSearchText || undefined,
          includeSummary: false,
        }),
        previousPeriod
          ? apiClient.kpi.getCvTipLeaderboard({
              ...previousPeriod.params,
              storeId: selectedStore,
            })
          : Promise.resolve(null),
      ]);

      if (lbRes) {
        setLeaderboard(lbRes.leaderboard || []);
        setSummary(lbRes.summary || EMPTY_CV_TIP_SUMMARY);
        setPreviousSummary(previousLbRes?.summary || null);
      }

      if (recRes) {
        setRecords(recRes.data || []);
        setTotalRecords(recRes.total || 0);
      }
    } catch (err) {
      console.error('Error fetching CV Tip data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    dateRange,
    previousPeriod,
    selectedStore,
    selectedCvName,
    parentSelectedConsultant,
    tipFilter,
    currentPage,
    pageSize,
    deferredSearchText,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const forecast = useMemo(
    () => computeCvTipForecast(dateRange, comparisonMode, summary),
    [dateRange, comparisonMode, summary]
  );

  const handleTipFilterChange = useCallback((nextFilter: TipFilterType) => {
    setCurrentPage(1);
    setTipFilter(nextFilter);
  }, []);

  const handleSearchChange = useCallback((nextSearch: string) => {
    setCurrentPage(1);
    setSearchText(nextSearch);
  }, []);

  const handlePageChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const pageSizeChanged = nextPageSize !== pageSize;
      const resolvedPage = pageSizeChanged ? 1 : nextPage;
      setCurrentPage(resolvedPage);
      setPageSize(nextPageSize);
      saveCvTipPagination(resolvedPage, nextPageSize);
    },
    [pageSize]
  );

  const toggleCompact = useCallback(() => {
    setIsCompact((prev) => !prev);
  }, []);

  return {
    isMobile,
    previousPeriod,
    loading,
    leaderboard,
    records,
    totalRecords,
    selectedCvName,
    tipFilter,
    searchText,
    isCompact,
    summary,
    previousSummary,
    forecast,
    pageSize,
    currentPage,
    handleSelectCv,
    handleTipFilterChange,
    handleSearchChange,
    handlePageChange,
    toggleCompact,
    fetchData,
  };
}
