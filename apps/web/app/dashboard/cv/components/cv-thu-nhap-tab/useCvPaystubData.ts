'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { CvPaystubRecord, ReportComparisonMode } from '@mos-lab/shared';
import { usePreviousReportPeriod } from '~/hooks/usePreviousReportPeriod';
import { useCcMobilePortrait } from '~/app/dashboard/cc/components/useCcMobilePortrait';
import { apiClient } from '~/lib/api-client';
import { formatCompactVND, formatVND } from '~/lib/format-utils';
import {
  CV_PAYSTUB_PAGE_SIZE_STORAGE_KEY,
  DEFAULT_CV_PAYSTUB_PAGE_SIZE,
  EMPTY_CV_INCOME_SUMMARY,
  computeCvIncomeForecastMeta,
  computeProjectedCvRecord,
  computeProjectedCvSummary,
  filterCvPaystubRecords,
  normalizeCvIncomeSummary,
  type CvIncomeSummary,
} from './cvThuNhapUtils';

interface UseCvPaystubDataParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  comparisonMode: ReportComparisonMode;
}

/** Fetches CV paystub rows, summaries, period comparisons, and end-of-period projections. */
export function useCvPaystubData({ dateRange, selectedStore, comparisonMode }: UseCvPaystubDataParams) {
  const { tier, showMobilePortrait } = useCcMobilePortrait();
  const isMobile = showMobilePortrait;
  const useCompactMetricFormat = tier === 'mobile' || tier === 'tablet';

  const formatMetricValue = useCallback(
    (value: number) => (useCompactMetricFormat ? formatCompactVND(value) : formatVND(value)),
    [useCompactMetricFormat]
  );

  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [paystubData, setPaystubData] = useState<CvPaystubRecord[]>([]);
  const [summary, setSummary] = useState<CvIncomeSummary>(EMPTY_CV_INCOME_SUMMARY);
  const [previousSummary, setPreviousSummary] = useState<CvIncomeSummary | null>(null);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState<number>(DEFAULT_CV_PAYSTUB_PAGE_SIZE);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CV_PAYSTUB_PAGE_SIZE_STORAGE_KEY);
      if (saved) {
        setPageSize(parseInt(saved, 10));
      }
    }
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CV_PAYSTUB_PAGE_SIZE_STORAGE_KEY, size.toString());
    }
  }, []);

  const toggleCompact = useCallback(() => {
    setIsCompact((prev) => !prev);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const [res, previousRes] = await Promise.all([
        apiClient.kpi.getCvPaystub({ dateFrom, dateTo, storeId: selectedStore }),
        previousPeriod
          ? apiClient.kpi.getCvPaystub({ ...previousPeriod.params, storeId: selectedStore })
          : Promise.resolve(null),
      ]);

      if (res) {
        setPaystubData(res.data || []);
        setSummary(normalizeCvIncomeSummary(res.summary));
        setPreviousSummary(previousRes ? normalizeCvIncomeSummary(previousRes.summary) : null);
      }
    } catch (err) {
      console.error('Error fetching CV Paystub data:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, previousPeriod, selectedStore]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const forecastMeta = useMemo(
    () => computeCvIncomeForecastMeta(dateRange, comparisonMode),
    [dateRange, comparisonMode]
  );

  const getProjectedRecord = useCallback(
    (record: CvPaystubRecord) => computeProjectedCvRecord(record, forecastMeta),
    [forecastMeta]
  );

  const projectedSummary = useMemo(
    () => computeProjectedCvSummary(summary, paystubData, forecastMeta),
    [summary, paystubData, forecastMeta]
  );

  const filteredData = useMemo(() => filterCvPaystubRecords(paystubData, searchText), [paystubData, searchText]);

  return {
    isMobile,
    showMobilePortrait,
    useCompactMetricFormat,
    formatMetricValue,
    previousPeriod,
    loading,
    paystubData,
    filteredData,
    summary,
    previousSummary,
    forecastMeta,
    getProjectedRecord,
    projectedSummary,
    searchText,
    setSearchText,
    pageSize,
    handlePageSizeChange,
    isCompact,
    toggleCompact,
    fetchData,
  };
}
