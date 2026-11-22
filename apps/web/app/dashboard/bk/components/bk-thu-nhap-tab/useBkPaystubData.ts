'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BkPaystubRecord, ReportComparisonMode, SafeAny } from '@mos-lab/shared';
import { usePreviousReportPeriod } from '~/hooks/usePreviousReportPeriod';
import { apiClient } from '~/lib/api-client';
import {
  computeBkIncomeForecastMeta,
  computeProjectedBkRecord,
  computeProjectedBkSummary,
  EMPTY_BK_INCOME_SUMMARY,
  normalizeBkPaystubSummary,
  type BkIncomeSummary,
} from './bkThuNhapUtils';

interface UseBkPaystubDataParams {
  dateRange: [SafeAny, SafeAny];
  selectedStore: string;
  comparisonMode: ReportComparisonMode;
}

/** Fetches BK paystub records, summary totals, period comparisons, and forecast projections. */
export function useBkPaystubData({ dateRange, selectedStore, comparisonMode }: UseBkPaystubDataParams) {
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [paystubs, setPaystubs] = useState<BkPaystubRecord[]>([]);
  const [summary, setSummary] = useState<BkIncomeSummary>(EMPTY_BK_INCOME_SUMMARY);
  const [previousSummary, setPreviousSummary] = useState<BkIncomeSummary | null>(null);

  const forecastMeta = useMemo(
    () => computeBkIncomeForecastMeta(dateRange, comparisonMode),
    [dateRange, comparisonMode]
  );

  const getProjectedRecord = useCallback(
    (record: BkPaystubRecord) => computeProjectedBkRecord(record, forecastMeta.isPastPeriod, forecastMeta.ratio),
    [forecastMeta.isPastPeriod, forecastMeta.ratio]
  );

  const projectedSummary = useMemo(
    () => computeProjectedBkSummary(summary, paystubs, forecastMeta.isPastPeriod, forecastMeta.ratio),
    [summary, paystubs, forecastMeta.isPastPeriod, forecastMeta.ratio]
  );

  const fetchPaystub = useCallback(async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) return;
    setLoading(true);
    try {
      const [res, previousRes] = await Promise.all([
        apiClient.bk.getPaystub({
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
          storeId: selectedStore,
        }),
        previousPeriod
          ? apiClient.bk.getPaystub({ ...previousPeriod.params, storeId: selectedStore })
          : Promise.resolve(null),
      ]);
      setPaystubs(res.data || []);
      setSummary(normalizeBkPaystubSummary(res.summary));
      setPreviousSummary(previousRes?.summary ? normalizeBkPaystubSummary(previousRes.summary) : null);
    } catch (err) {
      console.error('Error loading BK paystub', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, previousPeriod, selectedStore]);

  useEffect(() => {
    void fetchPaystub();
  }, [fetchPaystub]);

  return {
    loading,
    paystubs,
    summary,
    previousSummary,
    previousPeriod,
    forecastMeta,
    getProjectedRecord,
    projectedSummary,
    fetchPaystub,
  };
}
