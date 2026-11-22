'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { CvXoayRecord, ReportComparisonMode } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { usePreviousReportPeriod } from '~/hooks/usePreviousReportPeriod';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import {
  buildCvXoayLeaderboard,
  computeCvXoayForecast,
  DEFAULT_CV_XOAY_PAGE_SIZE,
  EMPTY_CV_XOAY_SUMMARY,
  filterCvXoayRecords,
  readSavedCvXoayPageSize,
  saveCvXoayPageSize,
  type CvXoaySummary,
} from './cvXoayUtils';

interface UseCvXoayDataParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore: string;
  selectedConsultant: string;
  comparisonMode: ReportComparisonMode;
}

export function useCvXoayData({ dateRange, selectedStore, selectedConsultant, comparisonMode }: UseCvXoayDataParams) {
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CvXoayRecord[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [summary, setSummary] = useState<CvXoaySummary>(EMPTY_CV_XOAY_SUMMARY);
  const [previousSummary, setPreviousSummary] = useState<CvXoaySummary | null>(null);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_CV_XOAY_PAGE_SIZE);
  const [selectedCvName, setSelectedCvName] = useState<string | null>(null);

  useEffect(() => {
    setPageSize(readSavedCvXoayPageSize());
  }, []);

  useEffect(() => {
    setSelectedCvName(null);
  }, [selectedConsultant]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const query = {
        storeId: selectedStore,
        consultantId: selectedConsultant,
        limit: 10000,
      };
      const [res, previousRes] = await Promise.all([
        apiClient.kpi.getCvXoayReport({ dateFrom, dateTo, ...query }),
        previousPeriod ? apiClient.kpi.getCvXoayReport({ ...previousPeriod.params, ...query }) : Promise.resolve(null),
      ]);

      if (res) {
        setData(res.data || []);
        setSummary(res.summary || EMPTY_CV_XOAY_SUMMARY);
        setPreviousSummary(previousRes?.summary || null);
      }
    } catch (err) {
      console.error('Error fetching CV Xoay report:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, previousPeriod, selectedStore, selectedConsultant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const leaderboard = useMemo(() => buildCvXoayLeaderboard(data), [data]);

  const forecast = useMemo(
    () => computeCvXoayForecast(dateRange, comparisonMode, summary, leaderboard),
    [dateRange, comparisonMode, summary, leaderboard]
  );

  const filteredData = useMemo(
    () => filterCvXoayRecords(data, selectedCvName, searchText),
    [data, selectedCvName, searchText]
  );

  const toggleCompact = useCallback(() => {
    setIsCompact((prev) => !prev);
  }, []);

  const toggleSelectedCvName = useCallback((techName: string) => {
    setSelectedCvName((prev) => (prev && prev.toLowerCase() === techName.toLowerCase() ? null : techName));
  }, []);

  const clearSelectedCvName = useCallback(() => {
    setSelectedCvName(null);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    saveCvXoayPageSize(size);
  }, []);

  return {
    loading,
    isMobile,
    previousPeriod,
    summary,
    previousSummary,
    leaderboard,
    forecast,
    filteredData,
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    pageSize,
    handlePageSizeChange,
    selectedCvName,
    toggleSelectedCvName,
    clearSelectedCvName,
    fetchData,
  };
}
