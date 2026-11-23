import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  DailySalesBonusConsultantRecord,
  DailySalesBonusLeaderboardEntry,
  DailySalesBonusPeriodComparison,
  calculateFractionToday,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { formatStoreCode } from '~/lib/format-utils';

export interface CcThuongSummary {
  totalComboSales: number;
  totalProductSales: number;
  totalSingleSales?: number;
  totalSales?: number;
  totalCcBonus: number;
  projectedComboSales?: number;
  projectedProductSales?: number;
  projectedSingleSales?: number;
  projectedTotalSales?: number;
  projectedCcBonus?: number;
  elapsedRatioPercent?: number;
  comparison?: DailySalesBonusPeriodComparison;
}

interface UseCcThuongDataParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore: string;
  parentSelectedConsultant?: string;
  includeVat: boolean;
  comparisonMode: 'month' | 'week' | 'day';
  refreshKey: number;
}

function projectByElapsed(
  summaryVal: number | undefined,
  totalVal: number,
  vatMultiplier: number,
  elapsedRatioPercent: number
): number {
  if (summaryVal !== undefined) {
    return Math.round(summaryVal * vatMultiplier);
  }
  const ratio = (elapsedRatioPercent || 100) / 100;
  return Math.round(totalVal / (ratio || 1));
}

export function useCcThuongData({
  dateRange,
  selectedStore,
  parentSelectedConsultant,
  includeVat,
  comparisonMode,
  refreshKey,
}: UseCcThuongDataParams) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DailySalesBonusConsultantRecord[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [dailyPage, setDailyPage] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return Math.max(1, Number(localStorage.getItem('cc_thuong_daily_page')) || 1);
  });
  const [dailyPageSize, setDailyPageSize] = useState(() => {
    if (typeof window === 'undefined') return 10;
    const saved = Number(localStorage.getItem('cc_thuong_daily_page_size'));
    return [10, 20, 50, 100, 200].includes(saved) ? saved : 10;
  });

  // Selected CC for Level 1 -> Level 2 Drill-down
  const [selectedCcName, setSelectedCcName] = useState<string | null>(null);

  // Level 3 Drill-down modal state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [selectedTxDate, setSelectedTxDate] = useState<string | undefined>(undefined);
  const [selectedTxConsultantId, setSelectedTxConsultantId] = useState<number | undefined>(undefined);
  const [selectedTxConsultantName, setSelectedTxConsultantName] = useState<string | undefined>(undefined);

  const [summary, setSummary] = useState<CcThuongSummary | null>(null);
  const [activeStaff, setActiveStaff] = useState<{ userId: number; displayName: string; avatar?: string | null }[]>([]);
  const inFlightDataKeysRef = useRef(new Set<string>());
  const latestDataKeyRef = useRef<string | null>(null);

  useEffect(() => {
    localStorage.setItem('cc_thuong_daily_page', String(dailyPage));
  }, [dailyPage]);

  useEffect(() => {
    localStorage.setItem('cc_thuong_daily_page_size', String(dailyPageSize));
  }, [dailyPageSize]);

  // Sync external consultant filter if passed
  useEffect(() => {
    if (parentSelectedConsultant && parentSelectedConsultant !== 'ALL') {
      setSelectedCcName(parentSelectedConsultant);
    }
  }, [parentSelectedConsultant]);

  const fetchData = useCallback(async () => {
    const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
    const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');
    const requestKey = `${dateFrom}:${dateTo}:${selectedStore}:${comparisonMode}:${refreshKey}`;

    latestDataKeyRef.current = requestKey;
    if (inFlightDataKeysRef.current.has(requestKey)) return;

    inFlightDataKeysRef.current.add(requestKey);
    setLoading(true);
    try {
      const res = await apiClient.gamification.getDailySalesBonusConsultants({
        dateFrom,
        dateTo,
        storeId: selectedStore,
        consultantId: 'ALL',
        comparisonMode,
      });

      if (latestDataKeyRef.current !== requestKey) return;

      if (res && res.data) {
        setData(res.data);
        if (res.summary) {
          setSummary(res.summary);
        }
        if (res.activeStaff) {
          setActiveStaff(res.activeStaff);
        }
      } else {
        setData([]);
        setSummary(null);
      }
    } catch (err) {
      if (latestDataKeyRef.current === requestKey) {
        console.error('Lỗi tải dữ liệu thưởng CC:', err);
      }
    } finally {
      inFlightDataKeysRef.current.delete(requestKey);
      if (latestDataKeyRef.current === requestKey) {
        setLoading(false);
      }
    }
  }, [comparisonMode, dateRange, refreshKey, selectedStore]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Mapped Data based on includeVat (ON: Gross with 8% VAT, OFF: Net before 8% VAT)
  const mappedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((r) => {
      if (!includeVat) {
        // VAT OFF (Tắt VAT 8%): Use Net DB values directly from backend
        return r;
      }

      // VAT ON (Bật VAT 8%): Multiply 1.08 for display sales columns (Gross with 8% VAT)
      return {
        ...r,
        combo_sales: Math.round((r.combo_sales || 0) * 1.08),
        product_sales: Math.round((r.product_sales || 0) * 1.08),
        single_sales: Math.round((r.single_sales || 0) * 1.08),
        debt_collected: Math.round((r.debt_collected || 0) * 1.08),
        total_sales: Math.round((r.total_sales || 0) * 1.08),
        // Keep daily_bonus unchanged as it is calculated on Net sales
      };
    });
  }, [data, includeVat]);

  const totalComboSales = useMemo(
    () => mappedData.reduce((acc, curr) => acc + (curr.combo_sales || 0), 0),
    [mappedData]
  );

  const totalProductSales = useMemo(
    () => mappedData.reduce((acc, curr) => acc + (curr.product_sales || 0), 0),
    [mappedData]
  );

  const totalSingleSales = useMemo(
    () => mappedData.reduce((acc, curr) => acc + (curr.single_sales || 0), 0),
    [mappedData]
  );

  // totalSales = Total Revenue for display (includes all categories)
  const totalSales = useMemo(
    () =>
      mappedData.reduce(
        (acc, curr) =>
          acc +
          (curr.combo_sales || 0) +
          (curr.product_sales || 0) +
          (curr.single_sales || 0) +
          (curr.debt_collected || 0),
        0
      ),
    [mappedData]
  );

  const totalCcBonus = useMemo(() => mappedData.reduce((acc, curr) => acc + (curr.daily_bonus || 0), 0), [mappedData]);

  // Realtime shift Run-rate Elapsed Ratio & Forecasts
  const elapsedRatioPercent = useMemo(() => {
    if (summary?.elapsedRatioPercent !== undefined) return summary.elapsedRatioPercent;
    const now = dayjs();
    const currentHour = now.hour();
    const fractionToday = calculateFractionToday(currentHour);

    const start = dateRange ? dateRange[0] : dayjs().startOf('month');
    const end = dateRange ? dateRange[1] : dayjs().endOf('month');

    if (now.isBefore(start, 'day')) return 0.1;
    if (now.isAfter(end, 'day')) return 100;

    const totalDays = end.diff(start, 'day') + 1;
    const daysPassed = now.diff(start, 'day');
    const elapsedDays = daysPassed + fractionToday;
    const ratio = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
    return Math.round(ratio * 1000) / 10;
  }, [summary, dateRange]);

  const vatMultiplier = includeVat ? 1.08 : 1;

  const projectedComboSales = useMemo(
    () => projectByElapsed(summary?.projectedComboSales, totalComboSales, vatMultiplier, elapsedRatioPercent),
    [summary, vatMultiplier, totalComboSales, elapsedRatioPercent]
  );

  const projectedProductSales = useMemo(
    () => projectByElapsed(summary?.projectedProductSales, totalProductSales, vatMultiplier, elapsedRatioPercent),
    [summary, vatMultiplier, totalProductSales, elapsedRatioPercent]
  );

  const projectedSingleSales = useMemo(
    () => projectByElapsed(summary?.projectedSingleSales, totalSingleSales, vatMultiplier, elapsedRatioPercent),
    [summary, vatMultiplier, totalSingleSales, elapsedRatioPercent]
  );

  const projectedTotalSales = useMemo(
    () => projectByElapsed(summary?.projectedTotalSales, totalSales, vatMultiplier, elapsedRatioPercent),
    [summary, vatMultiplier, totalSales, elapsedRatioPercent]
  );

  const projectedCcBonus = useMemo(
    () => projectByElapsed(summary?.projectedCcBonus, totalCcBonus, 1, elapsedRatioPercent),
    [summary, totalCcBonus, elapsedRatioPercent]
  );

  // Level 1: Aggregated Leaderboard
  const leaderboardData = useMemo<DailySalesBonusLeaderboardEntry[]>(() => {
    const map = new Map<
      number,
      {
        consultantId: number;
        displayName: string;
        avatar?: string | null;
        store: string;
        comboCount: number;
        greenComboCount: number;
        comboSales: number;
        debtCollected: number;
        productCount: number;
        singleSales: number;
        totalVisits: number;
        greenVisits: number;
        totalSales: number;
        totalBonus: number;
      }
    >();

    activeStaff.forEach((s) => {
      map.set(s.userId, {
        consultantId: s.userId,
        displayName: s.displayName,
        avatar: s.avatar,
        store: formatStoreCode(s.displayName),
        comboCount: 0,
        greenComboCount: 0,
        comboSales: 0,
        debtCollected: 0,
        productCount: 0,
        singleSales: 0,
        totalVisits: 0,
        greenVisits: 0,
        totalSales: 0,
        totalBonus: 0,
      });
    });

    mappedData.forEach((r) => {
      if (!map.has(r.user_id)) {
        map.set(r.user_id, {
          consultantId: r.user_id,
          displayName: r.consultant_name,
          avatar: r.avatar,
          store: formatStoreCode(r.store_code),
          comboCount: 0,
          greenComboCount: 0,
          comboSales: 0,
          debtCollected: 0,
          productCount: 0,
          singleSales: 0,
          totalVisits: 0,
          greenVisits: 0,
          totalSales: 0,
          totalBonus: 0,
        });
      }
      const item = map.get(r.user_id)!;
      item.comboCount += r.combo_count || 0;
      item.greenComboCount += r.green_combo_count || 0;
      item.comboSales += r.combo_sales || 0;
      item.debtCollected = (item.debtCollected || 0) + (r.debt_collected || 0);
      item.productCount += r.product_count || 0;
      item.singleSales += r.single_sales || 0;
      item.totalVisits += r.total_visits || 0;
      item.greenVisits += r.green_visits || 0;
      item.totalSales += r.total_sales || 0;
      item.totalBonus += r.daily_bonus || 0;
      if (r.store_code) item.store = formatStoreCode(r.store_code);
      if (r.avatar && !item.avatar) item.avatar = r.avatar;
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.totalBonus - a.totalBonus);
    const maxBonus = sorted.length > 0 ? sorted[0].totalBonus : 1;

    return sorted.map((item, idx) => {
      // Vòng Xanh is the Legacy combo-sale-required pool captured at booking time.
      // Every Combo sold is measured against that immutable eligibility snapshot.
      const greenConversionRate =
        item.greenVisits > 0 ? Math.min(100, Math.round((item.comboCount / item.greenVisits) * 100)) : 0;
      return {
        rank: idx + 1,
        consultantId: item.consultantId,
        displayName: item.displayName,
        avatar: item.avatar,
        store: item.store,
        comboSalesCount: item.comboCount,
        greenComboSalesCount: item.greenComboCount,
        comboSales: item.comboSales,
        debtCollected: item.debtCollected,
        productSalesCount: item.productCount,
        singleSales: item.singleSales,
        totalVisits: item.totalVisits,
        greenVisits: item.greenVisits,
        greenComboConversionRate: greenConversionRate,
        totalSales: item.totalSales,
        totalBonus: item.totalBonus,
        targetCompletionRate: Math.min(100, Math.round((item.totalBonus / (maxBonus || 1)) * 100)),
      };
    });
  }, [mappedData, activeStaff]);

  // Level 2: Filtered Daily Records Table
  const filteredDailyData = useMemo(() => {
    let result = mappedData;

    if (selectedCcName) {
      result = result.filter((r) => r.consultant_name === selectedCcName);
    }

    if (searchText) {
      const q = removeVietnameseTones(searchText);
      result = result.filter(
        (r) =>
          removeVietnameseTones(r.consultant_name).includes(q) ||
          r.date.includes(searchText) ||
          (r.store_code && removeVietnameseTones(r.store_code).includes(q))
      );
    }

    return result;
  }, [mappedData, selectedCcName, searchText]);

  useEffect(() => {
    setDailyPage(1);
  }, [searchText, selectedCcName]);

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(filteredDailyData.length / dailyPageSize));
    if (dailyPage > lastPage) setDailyPage(lastPage);
  }, [dailyPage, dailyPageSize, filteredDailyData.length]);

  const isPastPeriod = elapsedRatioPercent >= 100;
  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'month' ? 'tháng' : comparisonMode === 'week' ? 'tuần' : 'ngày';
  const ratio = (elapsedRatioPercent || 100) / 100;

  return {
    loading,
    fetchData,
    summary,
    searchText,
    setSearchText,
    isCompact,
    setIsCompact,
    dailyPage,
    setDailyPage,
    dailyPageSize,
    setDailyPageSize,
    selectedCcName,
    setSelectedCcName,
    txModalOpen,
    setTxModalOpen,
    selectedTxDate,
    setSelectedTxDate,
    selectedTxConsultantId,
    setSelectedTxConsultantId,
    selectedTxConsultantName,
    setSelectedTxConsultantName,
    totalComboSales,
    totalProductSales,
    totalSingleSales,
    totalSales,
    totalCcBonus,
    projectedComboSales,
    projectedProductSales,
    projectedSingleSales,
    projectedTotalSales,
    projectedCcBonus,
    elapsedRatioPercent,
    leaderboardData,
    filteredDailyData,
    isPastPeriod,
    isDayMode,
    periodNoun,
    ratio,
  };
}
