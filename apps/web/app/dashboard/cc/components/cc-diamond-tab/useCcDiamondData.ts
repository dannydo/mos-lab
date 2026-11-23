'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { CcDiamondEntry, CcDiamondResponse } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  computeDiamondElapsedRatioPercent,
  DiamondComparisonMode,
  filterDiamondRecordsBySearch,
  MOBILE_DIAMOND_PAGE_SIZE,
  scopeDiamondRecordsByConsultant,
  summarizeDiamondRecords,
} from './cc-diamond-utils';

interface UseCcDiamondDataParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore: string;
  selectedConsultant: string;
  comparisonMode: DiamondComparisonMode;
}

export function useCcDiamondData({
  dateRange,
  selectedStore,
  selectedConsultant,
  comparisonMode,
}: UseCcDiamondDataParams) {
  const [loading, setLoading] = useState(false);
  const [diamondData, setDiamondData] = useState<CcDiamondResponse | null>(null);
  const [searchText, setSearchText] = useState('');
  const [mobilePage, setMobilePage] = useState(1);

  const [selectedCcRecord, setSelectedCcRecord] = useState<CcDiamondEntry | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const latestRequestIdRef = useRef(0);

  const fetchDiamondData = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setLoading(true);
    try {
      const month = dateRange ? dateRange[0].format('YYYY-MM') : dayjs().format('YYYY-MM');
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;

      const res = await apiClient.kpi.getCcDiamondData({
        month,
        date_from: dateFrom,
        date_to: dateTo,
        comparisonMode,
      });

      if (latestRequestIdRef.current === requestId) {
        setDiamondData(res);
      }
    } catch (err) {
      if (latestRequestIdRef.current === requestId) {
        console.error('Error fetching diamond referral data:', err);
        message.error('Không thể tải dữ liệu Chương trình Kim Cương.');
      }
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [comparisonMode, dateRange]);

  useEffect(() => {
    void fetchDiamondData();
  }, [fetchDiamondData]);

  const selectedPeriodKey = `${dateRange?.[0]?.valueOf() ?? ''}:${dateRange?.[1]?.valueOf() ?? ''}`;

  useEffect(() => {
    setMobilePage(1);
  }, [selectedPeriodKey, selectedConsultant, selectedStore]);

  const allDiamondRecords = useMemo(() => diamondData?.data || [], [diamondData]);

  const consultantScopedData = useMemo(
    () => scopeDiamondRecordsByConsultant(allDiamondRecords, selectedConsultant),
    [allDiamondRecords, selectedConsultant]
  );

  // A text search narrows only the table/list. The global CC selector above also scopes the summary cards.
  const filteredData = useMemo(
    () => filterDiamondRecordsBySearch(consultantScopedData, searchText),
    [consultantScopedData, searchText]
  );

  const { totalReferrals, totalBonus, topCc, rewardRecipientCount } = useMemo(
    () => summarizeDiamondRecords(consultantScopedData),
    [consultantScopedData]
  );

  const mobilePageCount = Math.max(1, Math.ceil(filteredData.length / MOBILE_DIAMOND_PAGE_SIZE));
  const currentMobilePage = Math.min(mobilePage, mobilePageCount);
  const mobileDiamondRecords = useMemo(
    () =>
      filteredData.slice(
        (currentMobilePage - 1) * MOBILE_DIAMOND_PAGE_SIZE,
        currentMobilePage * MOBILE_DIAMOND_PAGE_SIZE
      ),
    [filteredData, currentMobilePage]
  );

  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';

  const elapsedRatioPercent = useMemo(
    () => computeDiamondElapsedRatioPercent(dateRange, comparisonMode),
    [dateRange, comparisonMode]
  );

  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  const projectedReferrals = Math.round(totalReferrals / (ratio || 1));
  const projectedBonus = Math.round(totalBonus / (ratio || 1));

  const handleSearchChange = useCallback((nextValue: string) => {
    setSearchText(nextValue);
    setMobilePage(1);
  }, []);

  const openDiamondDetail = useCallback((record: CcDiamondEntry) => {
    setSelectedCcRecord(record);
    setDetailModalOpen(true);
  }, []);

  const closeDiamondDetail = useCallback(() => {
    setDetailModalOpen(false);
  }, []);

  return {
    loading,
    diamondData,
    searchText,
    handleSearchChange,
    mobilePage,
    setMobilePage,
    currentMobilePage,
    mobileDiamondRecords,
    selectedCcRecord,
    detailModalOpen,
    openDiamondDetail,
    closeDiamondDetail,
    fetchDiamondData,
    allDiamondRecords,
    filteredData,
    totalReferrals,
    totalBonus,
    topCc,
    rewardRecipientCount,
    isDayMode,
    periodNoun,
    elapsedRatioPercent,
    isPastPeriod,
    ratio,
    projectedReferrals,
    projectedBonus,
  };
}
