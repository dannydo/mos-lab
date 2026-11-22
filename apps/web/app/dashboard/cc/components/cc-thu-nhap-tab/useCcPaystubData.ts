'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { CcPaystubRecord, isAdminOrSuperAdminRole } from '@mos-lab/shared';
import type { CcIncomeSummary } from '~/components/cc-thu-nhap/CcIncomeSummaryCards';
import { apiClient } from '~/lib/api-client';
import {
  CcIncomeComparisonMode,
  DEFAULT_CC_INCOME_SUMMARY,
  buildCcIncomeSummary,
  buildProjectedCcRecord,
  buildProjectedCcSummary,
  computeCcIncomeElapsedRatioPercent,
  enrichCcPaystubRecords,
  filterCcPaystubData,
  getComparisonPeriod,
} from './cc-thu-nhap-utils';

interface UseCcPaystubDataParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  comparisonMode: CcIncomeComparisonMode;
}

export function useCcPaystubData({ dateRange, selectedStore, comparisonMode }: UseCcPaystubDataParams) {
  const [loading, setLoading] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [paystubData, setPaystubData] = useState<CcPaystubRecord[]>([]);
  const [summary, setSummary] = useState<CcIncomeSummary>(DEFAULT_CC_INCOME_SUMMARY);
  const [searchText, setSearchText] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CcPaystubRecord | null>(null);

  // Other Allowance Modal State (mOS Flexible Allowances)
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState(false);
  const [allowanceTitle, setAllowanceTitle] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState<number | null>(null);
  const [allowanceNote, setAllowanceNote] = useState('');
  const [allowanceFormType, setAllowanceFormType] = useState<'plus' | 'minus'>('plus');
  const [isSubmittingAllowance, setIsSubmittingAllowance] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('mos_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        setIsAdminUser(isAdminOrSuperAdminRole(parsed?.role));
      }
    } catch {
      setIsAdminUser(false);
    }
  }, []);

  const isDayMode = comparisonMode === 'day';
  const isMonthMode = comparisonMode === 'month';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';

  const elapsedRatioPercent = useMemo(
    () => computeCcIncomeElapsedRatioPercent(dateRange, comparisonMode),
    [dateRange, comparisonMode]
  );

  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  const getProjectedRecord = useCallback(
    (record: CcPaystubRecord) => buildProjectedCcRecord(record, { isPastPeriod, ratio, isMonthMode }),
    [isPastPeriod, ratio, isMonthMode]
  );

  const projectedSummary = useMemo(
    () => buildProjectedCcSummary(summary, paystubData, { isPastPeriod, ratio, isMonthMode }),
    [summary, ratio, isPastPeriod, isMonthMode, paystubData]
  );

  const fetchPaystubData = useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;
      const month = dateRange ? dateRange[0].format('YYYY-MM') : undefined;
      const comparisonPeriod = getComparisonPeriod(dateRange, comparisonMode);

      const [res, diamondRes, comparisonResults] = await Promise.all([
        apiClient.kpi.getCcPaystub({
          dateFrom,
          dateTo,
          storeId: selectedStore,
        }),
        apiClient.kpi
          .getCcDiamondData({
            month,
            date_from: dateFrom,
            date_to: dateTo,
          })
          .catch(() => null),
        comparisonPeriod
          ? Promise.all([
              apiClient.kpi.getCcPaystub({
                dateFrom: comparisonPeriod.dateFrom,
                dateTo: comparisonPeriod.dateTo,
                storeId: selectedStore,
              }),
              apiClient.kpi
                .getCcDiamondData({
                  month: comparisonPeriod.dateFrom.substring(0, 7),
                  date_from: comparisonPeriod.dateFrom,
                  date_to: comparisonPeriod.dateTo,
                  comparisonMode: undefined,
                })
                .catch(() => null),
            ]).catch(() => null)
          : null,
      ]);

      if (res && res.data) {
        const { enrichedData, sumDiamond } = enrichCcPaystubRecords(res.data, diamondRes?.data);

        setPaystubData(enrichedData);
        setSelectedRecord((prev) => {
          if (!prev) return null;
          return enrichedData.find((item) => item.consultantId === prev.consultantId) || prev;
        });

        if (res.summary) {
          const comparisonPaystub = comparisonResults?.[0]?.summary;
          const comparisonDiamondBonus = comparisonResults?.[1]?.totalDiamondBonus || 0;
          setSummary(
            buildCcIncomeSummary(res.summary, sumDiamond, comparisonPeriod, comparisonPaystub, comparisonDiamondBonus)
          );
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Paystub CC:', err);
    } finally {
      setLoading(false);
    }
  }, [comparisonMode, dateRange, selectedStore]);

  useEffect(() => {
    void fetchPaystubData();
  }, [fetchPaystubData]);

  const closeAllowanceModal = useCallback(() => {
    setIsAllowanceModalOpen(false);
    setAllowanceTitle('');
    setAllowanceAmount(null);
    setAllowanceNote('');
    setAllowanceFormType('plus');
  }, []);

  const handleAddAllowance = useCallback(async () => {
    if (!selectedRecord) return;
    if (!allowanceTitle.trim()) {
      message.error('Vui lòng nhập tên hoặc nội dung phụ cấp.');
      return;
    }
    if (!allowanceAmount || allowanceAmount <= 0) {
      message.error('Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    const monthStr = (dateRange?.[0] || dayjs()).format('YYYY-MM');
    const finalAmount = allowanceFormType === 'minus' ? -Math.abs(allowanceAmount) : Math.abs(allowanceAmount);

    setIsSubmittingAllowance(true);
    try {
      const res = await fetch('/api/kpi/cc-allowances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedRecord.consultantId,
          month: monthStr,
          title: allowanceTitle.trim(),
          amount: finalAmount,
          note: allowanceNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể thêm phụ cấp.');
      }
      message.success('Đã thêm phụ cấp thành công!');
      closeAllowanceModal();
      await fetchPaystubData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi khi thêm phụ cấp.';
      message.error(errMsg);
    } finally {
      setIsSubmittingAllowance(false);
    }
  }, [
    selectedRecord,
    allowanceTitle,
    allowanceAmount,
    dateRange,
    allowanceFormType,
    allowanceNote,
    closeAllowanceModal,
    fetchPaystubData,
  ]);

  const handleDeleteAllowance = useCallback(
    async (allowanceId: number | string) => {
      try {
        const res = await fetch(`/api/kpi/cc-allowances/${allowanceId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Không thể xoá phụ cấp.');
        }
        message.success('Đã xoá phụ cấp.');
        await fetchPaystubData();
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Lỗi khi xoá phụ cấp.';
        message.error(errMsg);
      }
    },
    [fetchPaystubData]
  );

  const filteredData = useMemo(() => filterCcPaystubData(paystubData, searchText), [paystubData, searchText]);

  return {
    loading,
    isAdminUser,
    paystubData,
    filteredData,
    summary,
    searchText,
    setSearchText,
    selectedRecord,
    setSelectedRecord,
    isDayMode,
    periodNoun,
    elapsedRatioPercent,
    isPastPeriod,
    getProjectedRecord,
    projectedSummary,
    fetchPaystubData,
    isAllowanceModalOpen,
    setIsAllowanceModalOpen,
    closeAllowanceModal,
    allowanceTitle,
    setAllowanceTitle,
    allowanceAmount,
    setAllowanceAmount,
    allowanceNote,
    setAllowanceNote,
    allowanceFormType,
    setAllowanceFormType,
    isSubmittingAllowance,
    handleAddAllowance,
    handleDeleteAllowance,
  };
}
