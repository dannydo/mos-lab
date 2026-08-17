'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag, Typography, theme, Statistic, Button, Space, Progress, Tooltip, message } from 'antd';
import {
  GiftOutlined,
  ShoppingCartOutlined,
  SkinOutlined,
  DollarOutlined,
  RiseOutlined,
  TrophyOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import { CircleDot, UsersRound } from 'lucide-react';
import dayjs from 'dayjs';
import {
  DailySalesBonusConsultantRecord,
  DailySalesBonusLeaderboardEntry,
  removeVietnameseTones,
  calculateFractionToday,
  OPERATIONAL_SHIFT_SYSTEM_CONFIG,
  calculateWheelBonusCap,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import { useResponsiveTier } from '../../../../hooks/useResponsiveTier';
import { formatCompactVND, formatStoreCode } from '../../../../lib/format-utils';
import CcThuongTransactionsModal from './CcThuongTransactionsModal';
import CcAvatar from './CcAvatar';
import { AppIcon, CollapsibleSearchField, DataTable, MobileRecordList } from '~/components/ui';

const { Text } = Typography;

const compactVndStatistic = (value: string | number | undefined) => formatCompactVND(Number(value || 0));

const formatVisitCount = (value: number) =>
  Number(value || 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 1,
  });

interface CcThuongTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  includeVat?: boolean;
  onSelectConsultant?: (consultantName: string) => void;
  refreshKey?: number;
}

export default function CcThuongTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  includeVat = true,
  onSelectConsultant: parentOnSelectConsultant,
  refreshKey = 0,
}: CcThuongTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const responsiveTier = useResponsiveTier();
  const isMobile = responsiveTier === 'mobile';
  const dailyBonusKpiColumns = isMobile ? 2 : responsiveTier === 'tablet' ? 3 : 5;
  const dailyBonusKpiCardStyles = isMobile ? { body: { padding: 12 } } : undefined;

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

  const [summary, setSummary] = useState<{
    totalComboSales: number;
    totalProductSales: number;
    totalSales?: number;
    totalCcBonus: number;
    projectedComboSales?: number;
    projectedProductSales?: number;
    projectedTotalSales?: number;
    projectedCcBonus?: number;
    elapsedRatioPercent?: number;
  } | null>(null);
  const [activeStaff, setActiveStaff] = useState<{ userId: number; displayName: string; avatar?: string | null }[]>([]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const res = await apiClient.gamification.getDailySalesBonusConsultants({
        dateFrom,
        dateTo,
        storeId: selectedStore,
        consultantId: 'ALL',
      });

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
      console.error('Lỗi tải dữ liệu thưởng CC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, refreshKey, selectedStore]);

  // Mapped Data based on includeVat (ON: Gross with 8% VAT, OFF: Net before 8% VAT)
  const mappedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((r) => {
      if (!includeVat) {
        // VAT OFF (Tắt VAT 8%): Use Net DB values directly from backend
        return r;
      }

      // VAT ON (Bật VAT 8%): Multiply 1.08 for display sales columns (Gross with 8% VAT)
      const combo_sales = Math.round((r.combo_sales || 0) * 1.08);
      const product_sales = Math.round((r.product_sales || 0) * 1.08);
      const single_sales = Math.round((r.single_sales || 0) * 1.08);
      const debt_collected = Math.round((r.debt_collected || 0) * 1.08);
      const total_sales = Math.round((r.total_sales || 0) * 1.08);

      return {
        ...r,
        combo_sales,
        product_sales,
        single_sales,
        debt_collected,
        total_sales,
        // Keep daily_bonus unchanged as it is calculated on Net sales
      };
    });
  }, [data, includeVat]);

  // Aggregate Top KPI Cards (Prioritize Fastify backend summary calculation)
  const totalComboSales = useMemo(() => {
    return mappedData.reduce((acc, curr) => acc + (curr.combo_sales || 0), 0);
  }, [mappedData]);

  const totalProductSales = useMemo(() => {
    return mappedData.reduce((acc, curr) => acc + (curr.product_sales || 0), 0);
  }, [mappedData]);

  const totalSingleSales = useMemo(() => {
    return mappedData.reduce((acc, curr) => acc + (curr.single_sales || 0), 0);
  }, [mappedData]);

  // totalSales = Total Revenue for display (includes all categories)
  const totalSales = useMemo(() => {
    return mappedData.reduce(
      (acc, curr) =>
        acc +
        (curr.combo_sales || 0) +
        (curr.product_sales || 0) +
        (curr.single_sales || 0) +
        (curr.debt_collected || 0),
      0
    );
  }, [mappedData]);

  const totalCcBonus = useMemo(() => {
    return mappedData.reduce((acc, curr) => acc + (curr.daily_bonus || 0), 0);
  }, [mappedData]);

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

  const projectedComboSales = useMemo(() => {
    if (summary?.projectedComboSales !== undefined) return summary.projectedComboSales;
    const ratio = (elapsedRatioPercent || 100) / 100;
    return Math.round(totalComboSales / (ratio || 1));
  }, [summary, totalComboSales, elapsedRatioPercent]);

  const projectedProductSales = useMemo(() => {
    if (summary?.projectedProductSales !== undefined) return summary.projectedProductSales;
    const ratio = (elapsedRatioPercent || 100) / 100;
    return Math.round(totalProductSales / (ratio || 1));
  }, [summary, totalProductSales, elapsedRatioPercent]);

  const projectedSingleSales = useMemo(() => {
    const ratio = (elapsedRatioPercent || 100) / 100;
    return Math.round(totalSingleSales / (ratio || 1));
  }, [totalSingleSales, elapsedRatioPercent]);

  const projectedTotalSales = useMemo(() => {
    if (summary?.projectedTotalSales !== undefined) return summary.projectedTotalSales;
    return projectedComboSales + projectedProductSales;
  }, [summary, projectedComboSales, projectedProductSales]);

  const projectedCcBonus = useMemo(() => {
    if (summary?.projectedCcBonus !== undefined) return summary.projectedCcBonus;
    const ratio = (elapsedRatioPercent || 100) / 100;
    return Math.round(totalCcBonus / (ratio || 1));
  }, [summary, totalCcBonus, elapsedRatioPercent]);

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
      const greenConversionRate =
        item.greenVisits > 0 ? Math.min(100, Math.round((item.greenComboCount / item.greenVisits) * 100)) : 0;
      return {
        rank: idx + 1,
        consultantId: item.consultantId,
        displayName: item.displayName,
        avatar: item.avatar,
        store: item.store,
        comboSalesCount: item.comboCount,
        greenComboSalesCount: item.greenComboCount,
        comboSales: item.comboSales,
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

  // Level 1 Columns: Leaderboard
  const leaderboardColumns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span style={{ fontSize: '18px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '18px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '18px' }}>🥉</span>;
        return <span className="tabular-nums font-semibold text-slate-500 text-xs">#{rank}</span>;
      },
    },
    {
      title: 'CC',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: DailySalesBonusLeaderboardEntry) => {
        const isSelected = selectedCcName === name;
        return (
          <Space className="cursor-pointer group whitespace-nowrap" size={8}>
            <CcAvatar name={name} src={record.avatar} isSelected={isSelected} size={32} />
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`font-semibold text-xs transition-colors whitespace-nowrap ${
                    isSelected ? 'text-amber-400 underline underline-offset-2' : 'hover:text-amber-400'
                  }`}
                  style={{ color: isSelected ? undefined : token.colorText }}
                >
                  {name}
                </span>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  · {formatStoreCode(record.store)}
                </span>
                {isSelected && (
                  <Tag
                    color="gold"
                    icon={<CheckCircleOutlined />}
                    className="font-semibold text-[10px] m-0 py-0 px-1 whitespace-nowrap"
                  >
                    Đang lọc
                  </Tag>
                )}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Lượt Khách (Tổng / Vòng Xanh)',
      dataIndex: 'totalVisits',
      key: 'totalVisits',
      width: 170,
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={`Tổng lượt khách đã hoàn tất: ${formatVisitCount(val)} lượt | Vòng Xanh: khách chưa COMBO_LIVE tại lúc đặt lịch: ${formatVisitCount(record.greenVisits)} lượt`}
        >
          <div className="w-full text-right">
            <div className="tabular-nums inline-flex items-center justify-end gap-1 font-semibold text-blue-400 text-xs">
              <AppIcon icon={UsersRound} size="sm" aria-hidden />
              {formatVisitCount(val)} lượt
            </div>
            <div className="tabular-nums inline-flex items-center justify-end gap-1 text-[11px] text-emerald-400 font-medium mt-0.5">
              <AppIcon icon={CircleDot} size="sm" aria-hidden />
              {formatVisitCount(record.greenVisits)} Vòng Xanh
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Combo Bán & Tỷ Lệ (Vòng Xanh)',
      dataIndex: 'comboSalesCount',
      key: 'comboSalesCount',
      width: 180,
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={`Đã bán ${formatVisitCount(val)} combo; ${formatVisitCount(record.greenComboSalesCount)} combo đến từ khách Vòng Xanh. Doanh số combo: ${Math.round(record.comboSales || 0).toLocaleString('vi-VN')} đ | Tỷ lệ chốt Vòng Xanh: ${record.greenComboConversionRate}%`}
        >
          <div className="w-full text-right">
            <div className="tabular-nums font-semibold text-blue-400 text-xs">{val} combo</div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="tabular-nums inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                Tỷ lệ
                <Tooltip title="Vòng xanh">
                  <SyncOutlined aria-label="Vòng xanh" className="text-emerald-400" />
                </Tooltip>
                : <strong className="text-emerald-400">{record.greenComboConversionRate}%</strong>
              </span>
              <div className="w-10">
                <Progress
                  percent={record.greenComboConversionRate}
                  size="small"
                  strokeColor={record.greenComboConversionRate >= 15 ? '#52c41a' : '#1890ff'}
                  showInfo={false}
                  className="m-0"
                />
              </div>
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Doanh Thu Combo',
      dataIndex: 'comboSales',
      key: 'comboSales',
      width: 160,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-sky-400 text-xs">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'SP & Single (Tham Khảo)',
      dataIndex: 'productSalesCount',
      key: 'productSalesCount',
      width: 170,
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={`Đã bán ${val} Sản phẩm. Doanh số Single tham khảo: ${Math.round(record.singleSales || 0).toLocaleString('vi-VN')} đ`}
        >
          <div className="w-full text-right">
            <div className="tabular-nums font-semibold text-purple-400 text-xs">{val} SP</div>
            <div className="tabular-nums text-[11px] text-slate-400 mt-0.5">
              Single: {Math.round(record.singleSales || 0).toLocaleString('vi-VN')} đ
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Tổng Doanh Số Tính Thưởng',
      dataIndex: 'totalSales',
      key: 'totalSales',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-amber-400 text-xs">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Thưởng CC Bonus & Tiến Độ',
      dataIndex: 'totalBonus',
      key: 'totalBonus',
      width: 210,
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => {
        const capInfo = calculateWheelBonusCap(val, record.monthlyWheelBonus || 0);
        const isHardcapped = capInfo.capStatus === 'HARDCAPPED';
        const isWarning = capInfo.capStatus === 'WARNING';

        return (
          <Tooltip
            title={
              <div>
                <div className="font-bold text-amber-300">📊 TIẾN ĐỘ & HẠN MỨC THƯỞNG</div>
                <div className="text-xs mt-1">
                  • CC Daily Bonus tháng: <strong>{Math.round(val || 0).toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="text-xs">
                  • Hạn mức Vòng xoay tối đa (1.5x):{' '}
                  <strong className="text-emerald-300">{capInfo.maxWheelBonusAllowed.toLocaleString('vi-VN')} đ</strong>
                </div>
                {isHardcapped && (
                  <div className="text-xs text-rose-300 font-bold mt-1">⛔ ĐÃ ĐẠT TRẦN THƯỞNG VÒNG XOAY 1.5X</div>
                )}
                {isWarning && (
                  <div className="text-xs text-amber-300 font-bold mt-1">
                    ⚠️ SẮP CHẠM TRẦN ({capInfo.wheelCapPercent}%)
                  </div>
                )}
              </div>
            }
          >
            <div className="w-full text-right cursor-help">
              <div className="flex items-center justify-end gap-1.5">
                <span className="tabular-nums font-bold text-emerald-400 text-sm">
                  +{Math.round(val || 0).toLocaleString('vi-VN')} đ
                </span>
                {isHardcapped && (
                  <Tag color="error" className="m-0 text-[10px] font-bold py-0 px-1">
                    ⛔ 1.5X
                  </Tag>
                )}
                {isWarning && (
                  <Tag color="warning" className="m-0 text-[10px] font-bold py-0 px-1">
                    ⚠️ {capInfo.wheelCapPercent}%
                  </Tag>
                )}
              </div>
              <Progress
                percent={record.targetCompletionRate}
                size="small"
                strokeColor={isHardcapped ? '#ff4d4f' : isWarning ? '#faad14' : '#52c41a'}
                className="m-0 mt-0.5"
              />
            </div>
          </Tooltip>
        );
      },
    },
  ];

  // Level 2 Columns: Daily Bonus Table
  const dailyColumns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (val: string) => <span className="tabular-nums font-medium text-xs text-slate-400">{val}</span>,
    },
    {
      title: 'CC',
      dataIndex: 'consultant_name',
      key: 'consultant_name',
      width: 170,
      render: (val: string, record: DailySalesBonusConsultantRecord) => (
        <Space size={6} align="center" className="whitespace-nowrap">
          <CcAvatar name={val} src={record.avatar} size={24} />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="font-medium text-xs whitespace-nowrap">{val}</span>
            {record.store_code && (
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                · {formatStoreCode(record.store_code)}
              </span>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Doanh Số Combo',
      dataIndex: 'combo_sales',
      key: 'combo_sales',
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusConsultantRecord) => (
        <div>
          <span className="tabular-nums font-semibold text-xs text-blue-400">
            {Math.round(val || 0).toLocaleString('vi-VN')} đ
          </span>
          {record.combo_count ? (
            <div className="text-[11px] text-slate-400 tabular-nums">({record.combo_count} combo)</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Doanh Số SP',
      dataIndex: 'product_sales',
      key: 'product_sales',
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusConsultantRecord) => (
        <div>
          <span className="tabular-nums font-semibold text-xs text-purple-400">
            {Math.round(val || 0).toLocaleString('vi-VN')} đ
          </span>
          {record.product_count ? (
            <div className="text-[11px] text-slate-400 tabular-nums">({record.product_count} SP)</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Doanh Số Single',
      dataIndex: 'single_sales',
      key: 'single_sales',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums text-xs text-slate-500">{Math.round(val || 0).toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      title: 'Thu Nợ',
      dataIndex: 'debt_collected',
      key: 'debt_collected',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums text-xs text-slate-400">{Math.round(val || 0).toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      title: '-VAT',
      dataIndex: 'vat',
      key: 'vat',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums text-xs text-rose-400/80">-{Math.round(val || 0).toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      title: '-Debt',
      dataIndex: 'debt',
      key: 'debt',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums text-xs text-orange-400/80">
          -{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: '∑ Doanh Số Tính Thưởng',
      dataIndex: 'total_sales',
      key: 'total_sales',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-amber-400">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: '% Thưởng',
      dataIndex: 'commission_rate_percent',
      key: 'commission_rate_percent',
      align: 'right' as const,
      width: 110,
      render: (val: number) => (
        <Tag
          color={val >= 2 ? 'green' : val >= 1 ? 'gold' : 'blue'}
          className="tabular-nums font-bold text-xs py-0 px-1.5 m-0"
        >
          {val.toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: 'Daily Bonus',
      dataIndex: 'daily_bonus',
      key: 'daily_bonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-emerald-400">
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
  ];

  const isPastPeriod = elapsedRatioPercent >= 100;

  const renderForecastSubtext = (projectedVal: number) => {
    if (isPastPeriod) {
      return (
        <Tooltip title="Dữ liệu tháng đã chốt (100% thời gian)">
          <div
            className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70"
            style={isMobile ? { fontSize: 10, lineHeight: 1.35 } : undefined}
          >
            <span>Thực tế chốt tháng:</span>
            <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">
              {formatCompactVND(projectedVal)}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip
        title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian tháng (Ca 09:00 - 21:00 + 2h buffer checkout)`}
      >
        <div
          className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help"
          style={isMobile ? { fontSize: 10, lineHeight: 1.35 } : undefined}
        >
          <span role="img" aria-label="Dự kiến cuối tháng" className="shrink-0 text-sm leading-none">
            🔮
          </span>
          <span className="tabular-nums font-semibold text-emerald-400 whitespace-nowrap">
            ~{formatCompactVND(projectedVal)}
          </span>
        </div>
      </Tooltip>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 5 TOP KPI SUMMARY CARDS */}
      <div
        className="cc-daily-bonus-stat-grid mb-4 w-full"
        style={{
          display: 'grid',
          gap: isMobile ? 8 : 12,
          gridTemplateColumns: `repeat(${dailyBonusKpiColumns}, minmax(0, 1fr))`,
        }}
      >
        <Card
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          className="shadow-sm rounded-xl flex flex-col justify-between min-w-0"
          styles={dailyBonusKpiCardStyles}
        >
          <Statistic
            title="Doanh Thu Combo"
            value={totalComboSales}
            formatter={compactVndStatistic}
            valueStyle={{
              color: isDark ? '#60a5fa' : '#1890ff',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 'bold',
              fontSize: isMobile ? 20 : undefined,
              whiteSpace: 'nowrap',
            }}
            prefix={<GiftOutlined />}
          />
          {renderForecastSubtext(projectedComboSales)}
        </Card>
        <Card
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          className="shadow-sm rounded-xl flex flex-col justify-between min-w-0"
          styles={dailyBonusKpiCardStyles}
        >
          <Statistic
            title="Doanh Thu Sản Phẩm"
            value={totalProductSales}
            formatter={compactVndStatistic}
            valueStyle={{
              color: isDark ? '#c084fc' : '#722ed1',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 'bold',
              fontSize: isMobile ? 20 : undefined,
              whiteSpace: 'nowrap',
            }}
            prefix={<ShoppingCartOutlined />}
          />
          {renderForecastSubtext(projectedProductSales)}
        </Card>
        <Card
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          className="shadow-sm rounded-xl flex flex-col justify-between min-w-0"
          styles={dailyBonusKpiCardStyles}
        >
          <Statistic
            title="Doanh Thu Single"
            value={totalSingleSales}
            formatter={compactVndStatistic}
            valueStyle={{
              color: isDark ? '#fb923c' : '#d46b08',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 'bold',
              fontSize: isMobile ? 20 : undefined,
              whiteSpace: 'nowrap',
            }}
            prefix={<SkinOutlined />}
          />
          {renderForecastSubtext(projectedSingleSales)}
        </Card>
        <Card
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          className="shadow-sm rounded-xl flex flex-col justify-between min-w-0"
          styles={dailyBonusKpiCardStyles}
        >
          <Statistic
            title="∑ Doanh Thu"
            value={totalSales}
            formatter={compactVndStatistic}
            valueStyle={{
              color: isDark ? '#4ade80' : '#52c41a',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 'bold',
              fontSize: isMobile ? 20 : undefined,
              whiteSpace: 'nowrap',
            }}
            prefix={<RiseOutlined />}
          />
          {renderForecastSubtext(projectedTotalSales)}
        </Card>
        <Card
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: '#d4a84b' }}
          className="shadow-sm rounded-xl flex flex-col justify-between min-w-0"
          styles={dailyBonusKpiCardStyles}
        >
          <Statistic
            title="∑ Thưởng CC Bonus"
            value={totalCcBonus}
            formatter={compactVndStatistic}
            valueStyle={{
              color: '#d4a84b',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 'bold',
              fontSize: isMobile ? 20 : undefined,
              whiteSpace: 'nowrap',
            }}
            prefix={<DollarOutlined />}
          />
          {renderForecastSubtext(projectedCcBonus)}
        </Card>
      </div>

      {/* LEVEL 1: CC LEADERBOARD */}
      <Card
        title={
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <TrophyOutlined className="text-amber-500 text-lg" />
              <span style={{ color: token.colorText }} className="font-bold text-base">
                CC Leaderboard
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <FilterOutlined className="text-amber-500" />
              <span>💡 Mẹo: Click vào tên CC trên bảng để tự động lọc dữ liệu chi tiết bên dưới</span>
            </div>
          </div>
        }
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        className="full-bleed-card shadow-sm rounded-xl"
      >
        {isMobile ? (
          <div className="p-3">
            <MobileRecordList
              records={leaderboardData}
              loading={loading || parentLoading}
              getKey={(record) => String(record.consultantId)}
              emptyDescription="Chưa có dữ liệu xếp hạng CC Thưởng"
              getRecordClassName={(record) =>
                selectedCcName === record.displayName ? 'rounded-lg bg-amber-500/10 ring-1 ring-amber-400/60' : ''
              }
              renderRecord={(record) => {
                const isSelected = selectedCcName === record.displayName;
                const toggleSelection = () => {
                  const newCc = isSelected ? null : record.displayName;
                  setSelectedCcName(newCc);
                  parentOnSelectConsultant?.(newCc || 'ALL');
                };
                return (
                  <button
                    type="button"
                    className="w-full min-w-0 text-left"
                    aria-pressed={isSelected}
                    onClick={toggleSelection}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                        {record.rank === 1
                          ? '🥇'
                          : record.rank === 2
                            ? '🥈'
                            : record.rank === 3
                              ? '🥉'
                              : `#${record.rank}`}
                      </span>
                      <CcAvatar name={record.displayName} src={record.avatar} isSelected={isSelected} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold" style={{ color: token.colorText }}>
                          {record.displayName}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400">
                          <span>{formatStoreCode(record.store)} ·</span>
                          <span className="inline-flex items-center gap-0.5 tabular-nums text-sky-400">
                            <AppIcon icon={UsersRound} size="sm" aria-hidden />
                            {formatVisitCount(record.totalVisits)} lượt
                          </span>
                          <span className="inline-flex items-center gap-0.5 tabular-nums text-emerald-400">
                            <AppIcon icon={CircleDot} size="sm" aria-hidden />
                            {formatVisitCount(record.greenVisits)} Vòng Xanh
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-amber-400">{isSelected ? 'Đang lọc' : 'Xem'}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Combo</dt>
                        <dd className="truncate text-sm font-bold tabular-nums text-sky-400">
                          {record.comboSalesCount}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Doanh số</dt>
                        <dd className="truncate text-sm font-bold tabular-nums text-amber-400">
                          {formatCompactVND(record.totalSales || 0)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Thưởng</dt>
                        <dd className="truncate text-sm font-bold tabular-nums text-emerald-400">
                          +{formatCompactVND(record.totalBonus || 0)}
                        </dd>
                      </div>
                    </dl>
                  </button>
                );
              }}
            />
          </div>
        ) : (
          <Table
            dataSource={leaderboardData}
            columns={leaderboardColumns}
            rowKey="consultantId"
            size="small"
            pagination={false}
            loading={loading || parentLoading}
            scroll={{ x: 'max-content' }}
            className="antd-custom-table"
            locale={{ emptyText: 'Chưa có dữ liệu xếp hạng CC Thưởng' }}
            onRow={(record) => ({
              onClick: () => {
                const newCc = selectedCcName === record.displayName ? null : record.displayName;
                setSelectedCcName(newCc);
                if (parentOnSelectConsultant) {
                  parentOnSelectConsultant(newCc || 'ALL');
                }
              },
              className: 'cursor-pointer hover:bg-amber-500/5 transition-colors',
              style: {
                background:
                  selectedCcName === record.displayName
                    ? themeMode === 'dark'
                      ? 'rgba(212, 168, 75, 0.15)'
                      : 'rgba(212, 168, 75, 0.08)'
                    : undefined,
              },
            })}
          />
        )}
      </Card>

      {/* LEVEL 2: DAILY BONUS REPORT TABLE */}
      <Card
        title={
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base" style={{ color: token.colorText }}>
                Chi Tiết Thưởng Theo Ngày
              </span>
              {selectedCcName && (
                <Tag color="gold" closable onClose={() => setSelectedCcName(null)}>
                  Đang xem: {selectedCcName}
                </Tag>
              )}
              <Tooltip title="Click vào một dòng ngày cụ thể để xem danh sách giao dịch chi tiết trong ngày (Drill-down Cấp 3)">
                <InfoCircleOutlined className="text-gray-400" />
              </Tooltip>
            </div>

            <Space wrap>
              <CollapsibleSearchField
                placeholder="Tìm ngày, CC..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                behavior="filter"
                expandedWidth={220}
                expandButtonLabel="Mở tìm kiếm chi tiết thưởng"
              />
              <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
                <Button
                  icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                  onClick={() => setIsCompact(!isCompact)}
                  aria-label={isCompact ? 'Chuyển chế độ xem chuẩn' : 'Chuyển chế độ xem gọn'}
                  className={`table-toolbar-icon-action${isCompact ? ' text-amber-500 border-amber-500/50' : ''}`}
                />
              </Tooltip>
              <Tooltip title="Làm mới dữ liệu">
                <Button
                  icon={<ReloadOutlined />}
                  aria-label="Làm mới dữ liệu thưởng CC"
                  onClick={fetchData}
                  loading={loading}
                  className="table-toolbar-icon-action"
                />
              </Tooltip>
            </Space>
          </div>
        }
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        className="full-bleed-card shadow-sm rounded-xl"
      >
        <DataTable
          dataSource={filteredDailyData}
          columns={dailyColumns}
          rowKey={(r) => `${r.date}-${r.user_id}`}
          loading={loading || parentLoading}
          size="small"
          bordered
          scroll={{ x: 1300 }}
          pagination={{
            current: dailyPage,
            pageSize: dailyPageSize,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
            showSizeChanger: true,
            showTotal: (totalCount, range) =>
              `Hiển thị ${range[0]}–${range[1]} / ${totalCount.toLocaleString('vi-VN')} bản ghi`,
            onChange: (nextPage, nextPageSize) => {
              if (nextPageSize !== dailyPageSize) {
                setDailyPageSize(nextPageSize);
                setDailyPage(1);
                return;
              }
              setDailyPage(nextPage);
            },
          }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
          locale={{ emptyText: 'Không có dữ liệu thưởng CC trong khoảng thời gian này' }}
          onRow={(record) => ({
            onClick: () => {
              // Open Level 3 drill-down modal for that specific date & CC
              setSelectedTxDate(record.date);
              setSelectedTxConsultantId(record.user_id);
              setSelectedTxConsultantName(record.consultant_name);
              setTxModalOpen(true);
            },
            className: 'cursor-pointer hover:bg-amber-500/10 transition-colors',
          })}
        />
      </Card>

      {/* LEVEL 3 TRANSACTIONS DRILL-DOWN MODAL */}
      <CcThuongTransactionsModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        date={selectedTxDate}
        consultantId={selectedTxConsultantId}
        consultantName={selectedTxConsultantName}
        includeVat={includeVat}
      />
    </div>
  );
}
