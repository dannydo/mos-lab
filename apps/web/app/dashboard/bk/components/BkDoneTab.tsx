'use client';

import { AppIcon, CopyPhoneButton, TableIndexHeader } from '~/components/ui';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, theme, Space, Button, Input, Tooltip } from 'antd';
import dynamic from 'next/dynamic';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  EyeOutlined,
  DollarOutlined,
  TrophyOutlined,
  SearchOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  UserOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CircleCheck, DollarSign, ListFilter, Package, Sparkles } from 'lucide-react';
import {
  BkDoneDetailsFilter,
  BkDoneLeaderboardEntry,
  BkDoneRecord,
  removeVietnameseTones,
  type ReportComparisonMode,
  calculateFractionToday,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import { formatCompactVND } from '../../../../lib/format-utils';
import BkAvatar from './BkAvatar';
import BkLeaderboardCard from './BkLeaderboardCard';
import { usePreviousReportPeriod } from '../../../../hooks/usePreviousReportPeriod';
import PeriodComparison from '../../../../components/ui/PeriodComparison';

const CustomerDetailDrawer = dynamic(() => import('../../../../components/CustomerDetailDrawer'), { ssr: false });

const { Text } = Typography;

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'HQ';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('HQ') || s.includes('HEAD')) return 'HQ';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

export const BK_DONE_LEADERBOARD_LABELS = {
  booker: 'Booker',
  done: 'Done (Lẻ / Combo)',
  missed: 'Missed',
  doneBonus: 'Thưởng Done',
  rankBonus: 'Thưởng Hạng',
  missedBonus: 'Thưởng/Phạt Missed',
  totalDoneBonus: '∑ Thưởng Done',
} as const;

interface BkDoneTabProps {
  dateRange: [any, any];
  selectedStore: string;
  selectedBooker: string;
  comparisonMode: ReportComparisonMode;
}

export default function BkDoneTab({ dateRange, selectedStore, selectedBooker, comparisonMode }: BkDoneTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const [leaderboard, setLeaderboard] = useState<BkDoneLeaderboardEntry[]>([]);
  const [summary, setSummary] = useState<{
    totalDone: number;
    avgDoneRate: number;
    totalDoneBonus: number;
    totalSingleDone?: number;
    totalComboLiveDone?: number;
    totalComboSold?: number;
    comboRevenue?: number;
    singleToComboRate?: number;
  }>({
    totalDone: 0,
    avgDoneRate: 0,
    totalDoneBonus: 0,
    totalSingleDone: 0,
    totalComboLiveDone: 0,
    totalComboSold: 0,
    comboRevenue: 0,
    singleToComboRate: 0,
  });
  const [previousSummary, setPreviousSummary] = useState<{
    totalDone: number;
    avgDoneRate: number;
    totalDoneBonus: number;
    totalSingleDone?: number;
    totalComboLiveDone?: number;
    totalComboSold?: number;
    comboRevenue?: number;
    singleToComboRate?: number;
  } | null>(null);

  const [selectedBookerId, setSelectedBookerId] = useState<string | null>(null);
  const [selectedBookerName, setSelectedBookerName] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<BkDoneDetailsFilter>('ALL');
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [detailRecords, setDetailRecords] = useState<BkDoneRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';

  const elapsedRatioPercent = useMemo(() => {
    const now = dayjs();
    const currentHour = now.hour();
    const fractionToday = calculateFractionToday(currentHour);

    const start = dateRange?.[0]
      ? dayjs(dateRange[0])
      : dayjs().startOf(comparisonMode === 'week' ? 'isoWeek' : 'month');
    const end = dateRange?.[1] ? dayjs(dateRange[1]) : dayjs().endOf(comparisonMode === 'week' ? 'isoWeek' : 'month');

    if (now.isBefore(start, 'day')) return 0.1;
    if (now.isAfter(end, 'day')) return 100;

    const totalDays = end.diff(start, 'day') + 1;
    const daysPassed = now.diff(start, 'day');
    const elapsedDays = daysPassed + fractionToday;
    const r = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
    return Math.round(r * 1000) / 10;
  }, [dateRange, comparisonMode]);

  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  const projectedDone = Math.round((summary.totalDone || 0) / (ratio || 1));
  const projectedSingleDone = Math.round(((summary.totalSingleDone ?? summary.totalDone) || 0) / (ratio || 1));
  const projectedComboLiveDone = Math.round((summary.totalComboLiveDone || 0) / (ratio || 1));
  const projectedDoneBonus = Math.round((summary.totalDoneBonus || 0) / (ratio || 1));

  const renderForecastSubtext = (projectedVal: number, unit = '') => {
    if (isDayMode || !projectedVal) return null;

    if (isPastPeriod) {
      return (
        <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
          <div className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70">
            <span>Thực tế chốt {periodNoun}:</span>
            <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">
              {unit === 'đ' ? formatCurrency(projectedVal) : `${projectedVal.toLocaleString('vi-VN')} ${unit}`}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip
        title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00 + 2h buffer checkout)`}
      >
        <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help">
          <span role="img" aria-label={`Dự kiến cuối ${periodNoun}`} className="shrink-0 text-sm leading-none">
            🔮
          </span>
          <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
            ~{unit === 'đ' ? formatCurrency(projectedVal) : `${projectedVal.toLocaleString('vi-VN')} ${unit}`}
          </span>
        </div>
      </Tooltip>
    );
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const [res, previousRes] = await Promise.all([
        apiClient.bk.getDoneLeaderboard({
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
          storeId: selectedStore,
        }),
        previousPeriod
          ? apiClient.bk.getDoneLeaderboard({ ...previousPeriod.params, storeId: selectedStore })
          : Promise.resolve(null),
      ]);
      setLeaderboard(res.leaderboard || []);
      setSummary(res.summary || { totalDone: 0, avgDoneRate: 0, totalDoneBonus: 0 });
      setPreviousSummary(previousRes?.summary || null);
    } catch (err) {
      console.error('Error loading BK done leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async () => {
    setDetailsLoading(true);
    try {
      const res = await apiClient.bk.getDoneDetails({
        bookerId: selectedBookerId || 'ALL',
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
        status: filterStatus,
      });
      const data = (res.data || []).map((item: any, idx: number) => ({
        ...item,
        rowKeyId: `${item.orderId || 'done'}_${idx}`,
      }));
      setDetailRecords(data);
    } catch (err) {
      console.error('Error fetching done details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [dateRange, previousPeriod, selectedStore]);

  useEffect(() => {
    fetchDetails();
  }, [dateRange, selectedStore, selectedBookerId, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, selectedStore, selectedBookerId, filterStatus, searchText]);

  // Instantly refresh BK Done Leaderboard & Details when calls/bookings are saved
  useEffect(() => {
    const handleDataChanged = () => {
      fetchLeaderboard();
      fetchDetails();
    };
    window.addEventListener('mos-data-updated', handleDataChanged);
    window.addEventListener('mos-call-log-saved', handleDataChanged);
    window.addEventListener('mos-customer-updated', handleDataChanged);
    window.addEventListener('mos-booking-updated', handleDataChanged);
    return () => {
      window.removeEventListener('mos-data-updated', handleDataChanged);
      window.removeEventListener('mos-call-log-saved', handleDataChanged);
      window.removeEventListener('mos-customer-updated', handleDataChanged);
      window.removeEventListener('mos-booking-updated', handleDataChanged);
    };
  }, [dateRange, selectedStore, selectedBookerId, filterStatus]);

  const handleSelectBooker = (bookerId: string, bookerName?: string) => {
    if (selectedBookerId === bookerId) {
      setSelectedBookerId(null);
      setSelectedBookerName(null);
    } else {
      setSelectedBookerId(bookerId);
      const found = leaderboard.find((item) => String(item.bookerId) === bookerId);
      setSelectedBookerName(bookerName || found?.displayName || `BK #${bookerId}`);
    }
  };

  const filteredDetailRecords = useMemo(() => {
    if (!searchText) return detailRecords;
    const q = removeVietnameseTones(searchText);
    return detailRecords.filter(
      (r) =>
        removeVietnameseTones(r.clientName).includes(q) ||
        removeVietnameseTones(r.orderKey).includes(q) ||
        (r.clientPhone && removeVietnameseTones(r.clientPhone).includes(q)) ||
        (r.bookerName && removeVietnameseTones(r.bookerName).includes(q)) ||
        (r.serviceName && removeVietnameseTones(r.serviceName).includes(q))
    );
  }, [detailRecords, searchText]);

  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span className="text-lg leading-none">🥇</span>;
        if (rank === 2) return <span className="text-lg leading-none">🥈</span>;
        if (rank === 3) return <span className="text-lg leading-none">🥉</span>;
        return <span className="tabular-nums font-semibold text-slate-500 text-xs">#{rank}</span>;
      },
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.booker,
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: BkDoneLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Space
            className="cursor-pointer group whitespace-nowrap"
            size={8}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectBooker(String(record.bookerId), name);
            }}
          >
            <BkAvatar name={name} src={record.avatar} size={32} />
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
      title: (
        <Tooltip title="Phân định Khách Lẻ (KPI chính xét Rank & Milestone theo Điều răn BK-005) và Khách đi bằng gói Combo Live">
          <span className="cursor-help font-semibold text-xs">Done (Lẻ / Combo)</span>
        </Tooltip>
      ),
      dataIndex: 'doneCount',
      key: 'doneCount',
      align: 'center' as const,
      render: (_: number, record: BkDoneLeaderboardEntry) => {
        const single = record.singleDoneCount ?? record.doneCount;
        const combo = record.comboLiveDoneCount ?? 0;
        return (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <Tooltip title={`Khách Lẻ Done: ${single} lượt (KPI xếp hạng & thưởng bậc thang Milestone)`}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 tabular-nums">
                <span className="text-[10px] uppercase font-semibold opacity-75">Lẻ</span>
                {single}
              </span>
            </Tooltip>
            {combo > 0 && (
              <Tooltip title={`Combo Live: +${combo} lượt khách dùng gói (+1.000đ/lượt chăm sóc)`}>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 tabular-nums">
                  <span className="text-[9px] uppercase font-semibold opacity-75">Combo</span>+{combo}
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="Số lượng gói Combo bán mới và tỷ lệ chuyển đổi từ Single sang Combo">
          <span className="cursor-help font-semibold text-xs">Bán Combo</span>
        </Tooltip>
      ),
      key: 'comboSold',
      align: 'center' as const,
      render: (_: any, record: BkDoneLeaderboardEntry) => {
        const sold = record.comboSoldCount ?? 0;
        const rev = record.comboRevenue ?? 0;
        const rate = record.singleToComboRate ?? 0;
        if (sold === 0) return <span className="text-slate-500 text-xs">-</span>;
        return (
          <Tooltip title={`Bán ${sold} gói combo (${formatCurrency(rev)}). Tỷ lệ chuyển đổi Single ➔ Combo: ${rate}%`}>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 tabular-nums cursor-help">
              <Sparkles size={11} className="inline text-purple-400" />
              <span>{sold} gói</span>
              <span className="text-[10px] opacity-80">({rate}%)</span>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.missed,
      dataIndex: 'missedCount',
      key: 'missedCount',
      align: 'center' as const,
      render: (val: number, record: BkDoneLeaderboardEntry) => (
        <span
          className="tabular-nums font-semibold text-xs text-rose-400"
          title="Số lượng khách Missed của Booker trong kỳ (đối soát tỷ lệ phạt)"
        >
          {val} <span className="text-[11px] font-normal opacity-90">({record.missedRatePercent || 0}%)</span>
        </span>
      ),
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.doneBonus,
      dataIndex: 'basicBonus',
      key: 'basicBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-emerald-400">{formatCurrency(val)}</span>
      ),
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.rankBonus,
      dataIndex: 'milestoneBonus',
      key: 'milestoneBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-blue-400">
          {val > 0 ? `+${formatCurrency(val)}` : '-'}
        </span>
      ),
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.missedBonus,
      dataIndex: 'penaltyBonus',
      key: 'penaltyBonus',
      align: 'right' as const,
      render: (val: number, record: BkDoneLeaderboardEntry) => {
        const effectiveDone = (record.singleDoneCount ?? 0) > 0 ? (record.singleDoneCount ?? 0) : record.doneCount;
        if (effectiveDone < 100) {
          return (
            <Tooltip title="Chưa đạt mốc tối thiểu 100 khách Done trong kỳ, không tính thưởng/phạt Missed">
              <span className="tabular-nums font-semibold text-xs text-slate-400 dark:text-slate-500">-</span>
            </Tooltip>
          );
        }
        return (
          <span className={`tabular-nums font-semibold text-xs ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {val > 0 ? `+${formatCurrency(val)}` : val < 0 ? formatCurrency(val) : '-'}
          </span>
        );
      },
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.totalDoneBonus,
      dataIndex: 'totalDoneBonus',
      key: 'totalDoneBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-sm text-emerald-400">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Chi tiết',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: BkDoneLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined className="text-amber-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectBooker(String(record.bookerId), record.displayName);
            }}
          >
            {isSelected ? 'Bỏ lọc' : 'Chi tiết'}
          </Button>
        );
      },
    },
  ];

  const detailColumns = [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: any, __: BkDoneRecord, index: number) => (
        <span className="tabular-nums font-semibold text-xs text-slate-500 dark:text-slate-400">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'client',
      render: (record: BkDoneRecord) => (
        <div
          className="cursor-pointer group whitespace-nowrap"
          role="button"
          tabIndex={0}
          aria-label={`Xem chi tiết khách hàng ${record.clientName || 'Khách hàng'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (record.customerId) {
              setSelectedCustomerId(record.customerId);
              setCustomerDrawerOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              if (record.customerId) {
                setSelectedCustomerId(record.customerId);
                setCustomerDrawerOpen(true);
              }
            }
          }}
        >
          <div className="flex items-center gap-2">
            <BkAvatar name={record.clientName || 'Khách hàng'} src={record.clientAvatar} size={28} />
            <div className="min-w-0">
              <div className="font-semibold text-xs text-sky-400 group-hover:text-amber-400 transition-colors flex items-center gap-1 whitespace-nowrap">
                <span>{record.clientName || 'Khách hàng'}</span>
                <UserOutlined className="text-[10px] opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity" />
              </div>
              <div className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap flex items-center gap-1">
                <span>{record.clientPhone || 'Chưa có SĐT'}</span>
                {record.clientPhone && <CopyPhoneButton phone={record.clientPhone} size="xs" />}
              </div>
            </div>
          </div>
        </div>
      ),
    },

    {
      title: 'Booker',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (bName: string, record: BkDoneRecord) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <BkAvatar name={bName || 'Booker'} src={record.bookerAvatar} size={28} />
          <span className="font-medium text-xs text-slate-600 dark:text-slate-300">{bName || '-'}</span>
        </div>
      ),
    },
    {
      title: 'Ngày hẹn',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (dateStr: string) => (
        <span className="tabular-nums text-xs text-slate-400 font-medium whitespace-nowrap">
          {dateStr ? dateStr.replace('T', ' ').substring(0, 16) : '-'}
        </span>
      ),
    },
    {
      title: 'Dịch vụ chính & Phân loại',
      key: 'service',
      render: (record: BkDoneRecord) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {record.isComboLive ? (
              <Tag color="cyan" className="font-semibold text-[10px] py-0 px-1.5 m-0 inline-flex items-center gap-1">
                <Package size={10} /> Combo Live
              </Tag>
            ) : record.isSingle ? (
              <Tag color="green" className="font-semibold text-[10px] py-0 px-1.5 m-0 inline-flex items-center gap-1">
                <CheckCircleOutlined /> Khách Lẻ
              </Tag>
            ) : null}
            {record.isComboSold && (
              <Tag color="purple" className="font-semibold text-[10px] py-0 px-1.5 m-0 inline-flex items-center gap-1">
                <Sparkles size={10} /> Bán Combo
              </Tag>
            )}
          </div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {record.serviceName || 'Không có thông tin'}
          </div>
          {record.isComboLive ? (
            <div className="text-[10px] font-medium text-cyan-500 whitespace-nowrap">Combo Live (+1.000đ)</div>
          ) : (record.servicePrice || 0) > 0 ? (
            <div className="text-[10px] text-slate-400 tabular-nums">
              Giá: {formatCurrency(record.servicePrice || 0)} | Giảm: {record.discountPercent || 0}%
            </div>
          ) : null}
          {record.comboName && (
            <div className="text-[10px] font-medium text-purple-400 whitespace-nowrap">
              Gói combo: {record.comboName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Doanh thu Net',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      align: 'right' as const,
      render: (val: number, record: BkDoneRecord) =>
        val > 0 ? (
          <div className="text-right">
            <div className="tabular-nums font-semibold text-xs text-slate-600 dark:text-slate-300">
              {formatCurrency(val)}
            </div>
            {(record.comboRevenue || 0) > 0 && (
              <div className="tabular-nums text-[10px] font-medium text-violet-400 whitespace-nowrap">
                Combo: {formatCurrency(record.comboRevenue || 0)}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-500 text-xs">-</span>
        ),
    },
    {
      title: 'Tiền tips',
      dataIndex: 'tipAmount',
      key: 'tipAmount',
      align: 'right' as const,
      render: (val: number) =>
        val > 0 ? (
          <span className="tabular-nums font-semibold text-xs text-amber-400">{formatCurrency(val)}</span>
        ) : (
          <span className="text-slate-500 text-xs">-</span>
        ),
    },
    {
      title: 'Bonus Done',
      dataIndex: 'totalDoneBonus',
      key: 'totalDoneBonus',
      align: 'right' as const,
      render: (val: number) =>
        val > 0 ? (
          <span className="tabular-nums font-bold text-xs text-emerald-400">+{formatCurrency(val)}</span>
        ) : (
          <span className="text-slate-500 text-xs">-</span>
        ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center' as const,
      render: (_: any, record: BkDoneRecord) => {
        const isComp =
          record.status === 'Completed' ||
          record.status === 'CheckOut' ||
          (record.netRevenue || 0) > 0 ||
          (record.totalPrice || 0) > 0 ||
          record.status === 'Check-in thành công';
        const isCancelled = record.status === 'Cancelled';
        const orderTime = record.orderDate
          ? new Date(String(record.orderDate).replace('T', ' ').replace(/\..*$/, '').replace('Z', '')).getTime()
          : 0;
        const isFuture = orderTime > Date.now();

        let color = 'default';
        let label = record.status || 'Đặt lịch';
        let statusIcon: React.ReactNode | undefined;

        if (isComp) {
          color = 'success';
          label = 'Done';
          statusIcon = <CheckCircleOutlined />;
        } else if (isCancelled) {
          color = 'error';
          label = 'Đã hủy';
          statusIcon = <CloseCircleOutlined />;
        } else if (isFuture) {
          color = 'processing';
          label = 'Sắp tới';
          statusIcon = <CalendarOutlined />;
        } else {
          color = 'volcano';
          label = 'Missed';
          statusIcon = <CloseCircleOutlined />;
        }

        return (
          <Tag
            color={color}
            icon={statusIcon}
            className="inline-flex items-center font-semibold text-xs py-0 px-2 rounded-full m-0 whitespace-nowrap"
          >
            {label}
          </Tag>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Row gutter={[16, 16]}>
        {/* Card 1: Khách Lẻ Done (KPI Chính) */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={
                <Tooltip title="Đơn khách lẻ hoàn tất check-in trong kỳ. Đây là chỉ số cốt lõi dùng để xếp hạng Rank và tính thưởng bậc thang Milestone Bonus theo Điều răn BK-005.">
                  <span className="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between">
                    <span>Khách Lẻ Done</span>
                    <Tag color="cyan" className="text-[10px] m-0 py-0 px-1 font-bold">
                      KPI Chính
                    </Tag>
                  </span>
                </Tooltip>
              }
              value={summary.totalSingleDone ?? summary.totalDone}
              className="[&_.ant-statistic-content-value]:text-emerald-500 [&_.ant-statistic-content-value]:font-bold [&_.ant-statistic-content-value]:tabular-nums"
              prefix={<UserOutlined className="mr-2 text-emerald-500" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalSingleDone ?? summary.totalDone}
              previousValue={previousSummary?.totalSingleDone ?? previousSummary?.totalDone ?? 0}
              formatter={(value) => `${value.toLocaleString('vi-VN')} lượt`}
            />
            {renderForecastSubtext(projectedSingleDone, 'lượt')}
          </Card>
        </Col>

        {/* Card 2: Combo Live Done */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={
                <Tooltip title="Lượt khách có gói Combo đang hoạt động đến làm dịch vụ trong kỳ. Booker nhận 1.000đ/lượt chăm sóc; không tính vào bậc thang Milestone Bonus theo Điều răn BK-005.">
                  <span className="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between">
                    <span>Combo Live Done</span>
                    <Tag color="purple" className="text-[10px] m-0 py-0 px-1 font-semibold">
                      +1.000đ/lượt
                    </Tag>
                  </span>
                </Tooltip>
              }
              value={summary.totalComboLiveDone ?? 0}
              className="[&_.ant-statistic-content-value]:text-cyan-500 [&_.ant-statistic-content-value]:font-bold [&_.ant-statistic-content-value]:tabular-nums"
              prefix={<Package className="mr-2 inline text-cyan-500" size={18} />}
            />
            <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5">
              <span>Tỷ trọng / Tổng Done:</span>
              <span className="tabular-nums font-semibold text-cyan-400">
                {summary.totalDone > 0
                  ? `${(((summary.totalComboLiveDone || 0) / summary.totalDone) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            {renderForecastSubtext(projectedComboLiveDone, 'lượt')}
          </Card>
        </Col>

        {/* Card 3: Combo Bán Mới & Chuyển đổi */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={
                <Tooltip title="Số lượng gói Combo bán mới trong kỳ và tỷ lệ chuyển đổi từ Khách Lẻ sang mua Combo (Single ➔ Combo).">
                  <span className="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between">
                    <span>Combo Bán Mới</span>
                    <Tag color="magenta" className="text-[10px] m-0 py-0 px-1 font-semibold">
                      Single ➔ Combo
                    </Tag>
                  </span>
                </Tooltip>
              }
              value={summary.totalComboSold ?? 0}
              suffix="gói"
              className="[&_.ant-statistic-content-value]:text-purple-500 [&_.ant-statistic-content-value]:font-bold [&_.ant-statistic-content-value]:tabular-nums"
              prefix={<TrophyOutlined className="mr-2 text-purple-500" />}
            />
            <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5">
              <span>Tỷ lệ chuyển đổi:</span>
              <span className="tabular-nums font-semibold text-purple-400">{summary.singleToComboRate ?? 0}%</span>
            </div>
            {(summary.comboRevenue || 0) > 0 && (
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Doanh thu:</span>
                <span className="tabular-nums font-medium text-purple-300">
                  {formatCompactVND(summary.comboRevenue || 0)}
                </span>
              </div>
            )}
          </Card>
        </Col>

        {/* Card 4: ∑ Thưởng Done & Check-in */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={
                <Tooltip title="Tổng tiền thưởng Done bao gồm thưởng check-in cơ bản, thưởng bậc thang Milestone Rank và thưởng/phạt Missed.">
                  <span className="text-xs font-semibold text-slate-500 uppercase">∑ Thưởng Done & Check-in</span>
                </Tooltip>
              }
              value={summary.totalDoneBonus}
              formatter={(val) => formatCurrency(Number(val))}
              className="[&_.ant-statistic-content-value]:text-emerald-600 [&_.ant-statistic-content-value]:font-bold [&_.ant-statistic-content-value]:tabular-nums"
              prefix={<DollarOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalDoneBonus}
              previousValue={previousSummary?.totalDoneBonus || 0}
              formatter={formatCurrency}
            />
            {renderForecastSubtext(projectedDoneBonus, 'đ')}
          </Card>
        </Col>
      </Row>

      {/* Done Leaderboard */}
      <BkLeaderboardCard
        title="BK Leaderboard - Done"
        description="Xếp hạng thành tích Telesales theo Khách Lẻ Done (Điều răn BK-005) trong khoảng thời gian lọc"
        leaderboard={leaderboard}
        loading={loading}
        columns={columns}
        selectedBooker={selectedBookerId || undefined}
        onSelectBooker={(bId) => handleSelectBooker(bId)}
        mobileMetrics={(record) => [
          {
            label: 'Lẻ / Combo',
            value: `${record.singleDoneCount ?? record.doneCount} Lẻ · +${record.comboLiveDoneCount ?? 0} Combo`,
            tone: 'success',
          },
          { label: 'Missed', value: `${record.missedCount ?? 0} (${record.missedRatePercent ?? 0}%)`, tone: 'danger' },
          { label: 'Thưởng', value: formatCurrency(record.totalDoneBonus ?? 0), tone: 'success' },
        ]}
        extraSummary={
          <Text type="secondary" className="text-xs flex items-center gap-1">
            <InfoCircleOutlined className="text-amber-500" />
            <span>Click vào dòng Booker hoặc con số Missed để xem chi tiết danh sách Khách hàng bên dưới</span>
          </Text>
        }
      />

      {/* Embedded Details Table Card (Danh sách Khách hàng & Hoa hồng OC) */}
      <Card
        className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-6"
        style={{ background: token.colorBgContainer, marginTop: '24px' }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold m-0" style={{ color: token.colorText }}>
                Chi Tiết Khách Hàng Đặt Lịch & Bonus Done
              </h3>
              {selectedBookerName && (
                <Tag
                  color="gold"
                  closable
                  onClose={() => {
                    setSelectedBookerId(null);
                    setSelectedBookerName(null);
                  }}
                  className="font-semibold text-xs"
                >
                  Đang lọc: {selectedBookerName}
                </Tag>
              )}
            </div>
            <Text type="secondary" className="text-xs">
              {filterStatus === 'SINGLE'
                ? 'Đang hiển thị danh sách Khách hàng LẺ DONE (không có gói combo active, tính KPI Rank)'
                : filterStatus === 'COMBO_LIVE'
                  ? 'Đang hiển thị danh sách Khách hàng COMBO LIVE DONE (làm bằng gói combo, +1.000đ/lượt)'
                  : filterStatus === 'COMBO_SOLD'
                    ? 'Đang hiển thị các đơn Completed có bán gói combo mới'
                    : filterStatus === 'COMPLETED'
                      ? 'Đang hiển thị tất cả Khách hàng DONE (cả Lẻ và Combo)'
                      : filterStatus === 'TIP'
                        ? 'Đang hiển thị các đơn Completed có tiền tip'
                        : 'Hiển thị tất cả đơn hàng hoàn thành (Done) của Booker'}
            </Text>
          </div>

          <Space wrap>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                aria-pressed={filterStatus === 'ALL'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'ALL'
                    ? 'bg-amber-500 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('ALL')}
              >
                <AppIcon icon={ListFilter} size={14} />
                <span>Tất cả</span>
              </button>
              <button
                type="button"
                aria-pressed={filterStatus === 'SINGLE'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'SINGLE'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('SINGLE')}
              >
                <AppIcon icon={CircleCheck} size={14} />
                <span>Khách Lẻ</span>
              </button>
              <button
                type="button"
                aria-pressed={filterStatus === 'COMBO_LIVE'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'COMBO_LIVE'
                    ? 'bg-cyan-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('COMBO_LIVE')}
              >
                <AppIcon icon={Package} size={14} />
                <span>Combo Live</span>
              </button>
              <button
                type="button"
                aria-pressed={filterStatus === 'COMBO_SOLD'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'COMBO_SOLD'
                    ? 'bg-violet-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('COMBO_SOLD')}
              >
                <AppIcon icon={Sparkles} size={14} />
                <span>Bán Combo</span>
              </button>
              <button
                type="button"
                aria-pressed={filterStatus === 'TIP'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'TIP'
                    ? 'bg-amber-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('TIP')}
              >
                <AppIcon icon={DollarSign} size={14} />
                <span>Tip</span>
              </button>
            </div>

            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm tên khách, SĐT, dịch vụ..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              className="w-48"
              size="small"
            />
            <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
              <Button
                icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                size="small"
                onClick={() => setIsCompact(!isCompact)}
                className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
              />
            </Tooltip>
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={fetchDetails}
                loading={detailsLoading}
                aria-label="Tải lại dữ liệu"
                title="Tải lại dữ liệu"
              />
            </Tooltip>
          </Space>
        </div>

        <Table
          dataSource={filteredDetailRecords}
          columns={detailColumns}
          rowKey="rowKeyId"
          loading={detailsLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            pageSizeOptions: ['20', '50', '100', '200'],
            showSizeChanger: true,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            showTotal: (total) => `Tổng cộng ${total} đơn hàng`,
          }}
          size="small"
          scroll={{ x: 'max-content' }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        />
      </Card>

      {/* Customer Profile Side Slide Drawer */}
      <CustomerDetailDrawer
        open={customerDrawerOpen}
        customerId={selectedCustomerId}
        onClose={() => setCustomerDrawerOpen(false)}
      />
    </div>
  );
}
