'use client';

import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { CvTipCustomerVisit, CvTipRecord, TipFilterType } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { filterRecordsByTipStatus } from './cvTipUtils';

interface UseCvTipHistoryModalsParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore: string;
  selectedCvName: string | null;
  parentSelectedConsultant?: string;
}

export function useCvTipHistoryModals({
  dateRange,
  selectedStore,
  selectedCvName,
  parentSelectedConsultant,
}: UseCvTipHistoryModalsParams) {
  const [tipHistoryOpen, setTipHistoryOpen] = useState(false);
  const [tipHistoryLoading, setTipHistoryLoading] = useState(false);
  const [tipHistoryFilter, setTipHistoryFilter] = useState<TipFilterType>('ALL');
  const [tipHistoryRecords, setTipHistoryRecords] = useState<CvTipRecord[]>([]);

  const [customerHistoryOpen, setCustomerHistoryOpen] = useState(false);
  const [customerHistoryLoading, setCustomerHistoryLoading] = useState(false);
  const [customerHistoryName, setCustomerHistoryName] = useState('');
  const [customerHistoryRecords, setCustomerHistoryRecords] = useState<CvTipCustomerVisit[]>([]);
  const [customerHistoryFilter, setCustomerHistoryFilter] = useState<TipFilterType>('ALL');

  const openTipHistory = useCallback(async () => {
    setTipHistoryOpen(true);
    setTipHistoryFilter('ALL');
    setTipHistoryLoading(true);

    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');
      const response = await apiClient.kpi.getCvTipRecords({
        dateFrom,
        dateTo,
        storeId: selectedStore,
        consultantId: selectedCvName || parentSelectedConsultant,
        tipFilter: 'ALL',
        page: 1,
        limit: 3000,
        includeSummary: false,
      });
      setTipHistoryRecords(response.data || []);
    } catch (error) {
      console.error('Error fetching CV Tip history:', error);
      setTipHistoryRecords([]);
    } finally {
      setTipHistoryLoading(false);
    }
  }, [dateRange, parentSelectedConsultant, selectedCvName, selectedStore]);

  const closeTipHistory = useCallback(() => {
    setTipHistoryOpen(false);
  }, []);

  const openCustomerHistory = useCallback(async (record: CvTipRecord) => {
    if (!record.clientId) return;

    setCustomerHistoryName(record.clientName || 'Khách hàng');
    setCustomerHistoryOpen(true);
    setCustomerHistoryFilter('ALL');
    setCustomerHistoryLoading(true);

    try {
      const response = await apiClient.kpi.getCvTipCustomerHistory({ clientId: record.clientId });
      setCustomerHistoryRecords(response.data || []);
    } catch (error) {
      console.error('Error fetching CV tip customer history:', error);
      setCustomerHistoryRecords([]);
    } finally {
      setCustomerHistoryLoading(false);
    }
  }, []);

  const closeCustomerHistory = useCallback(() => {
    setCustomerHistoryOpen(false);
  }, []);

  const visibleTipHistoryRecords = useMemo(
    () => filterRecordsByTipStatus(tipHistoryRecords, tipHistoryFilter),
    [tipHistoryFilter, tipHistoryRecords]
  );

  const visibleCustomerHistoryRecords = useMemo(
    () => filterRecordsByTipStatus(customerHistoryRecords, customerHistoryFilter),
    [customerHistoryFilter, customerHistoryRecords]
  );

  return {
    tipHistoryOpen,
    tipHistoryLoading,
    tipHistoryFilter,
    tipHistoryRecords,
    visibleTipHistoryRecords,
    setTipHistoryFilter,
    openTipHistory,
    closeTipHistory,
    customerHistoryOpen,
    customerHistoryLoading,
    customerHistoryName,
    customerHistoryRecords,
    customerHistoryFilter,
    visibleCustomerHistoryRecords,
    setCustomerHistoryFilter,
    openCustomerHistory,
    closeCustomerHistory,
  };
}
