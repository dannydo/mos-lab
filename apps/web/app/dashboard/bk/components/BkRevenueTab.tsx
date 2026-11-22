'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag, Typography, theme, Space, Button, Input, Tooltip } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  BkRevenueLeaderboardEntry,
  BkRevenueRecord,
  removeVietnameseTones,
  type ReportComparisonMode,
  calculateFractionToday,
  getRevCommissionRate,
  DEFAULT_BK_REV_BONUS_TIERS,
} from '@mos-lab/shared';
import { formatCompactVND } from '../../../../lib/format-utils';
import { apiClient } from '../../../../lib/api-client';
import BkLeaderboardCard from './BkLeaderboardCard';
import { usePreviousReportPeriod } from '../../../../hooks/usePreviousReportPeriod';
import { BkRevenueSummaryCards } from './bk-revenue/BkRevenueSummaryCards';
import {
  buildBkRevenueDetailColumns,
  buildBkRevenueLeaderboardColumns,
  formatBkRevenueCurrency,
  formatStoreCode,
} from './bk-revenue/bkRevenueColumns';

export { formatStoreCode };

const { Text } = Typography;

interface BkRevenueTabProps {
  dateRange: [any, any];
  selectedStore: string;
  selectedBooker: string;
  comparisonMode: ReportComparisonMode;
}

export default function BkRevenueTab({ dateRange, selectedStore, comparisonMode }: BkRevenueTabProps) {
  const { token } = theme.useToken();
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [leaderboard, setLeaderboard] = useState<BkRevenueLeaderboardEntry[]>([]);
  const [summary, setSummary] = useState({
    completedOrdersCount: 0,
    totalRevenue: 0,
    totalCommissionBonus: 0,
  });
  const [previousSummary, setPreviousSummary] = useState<{
    completedOrdersCount: number;
    totalRevenue: number;
    totalCommissionBonus: number;
  } | null>(null);

  const [selectedBookerId, setSelectedBookerId] = useState<string | null>(null);
  const [selectedBookerName, setSelectedBookerName] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [detailRecords, setDetailRecords] = useState<BkRevenueRecord[]>([]);

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

  const projectedCompletedOrders = Math.round((summary.completedOrdersCount || 0) / (ratio || 1));
  const projectedRevenue = Math.round((summary.totalRevenue || 0) / (ratio || 1));
  const projectedCommissionBonus = useMemo(() => {
    if (leaderboard.length > 0) {
      return leaderboard.reduce((acc, item) => {
        const projRev = Math.round((item.totalRevenue || 0) / (ratio || 1));
        const projRate = getRevCommissionRate(projRev, DEFAULT_BK_REV_BONUS_TIERS);
        return acc + Math.round((projRev * projRate) / 100);
      }, 0);
    }
    const projRev = Math.round((summary.totalRevenue || 0) / (ratio || 1));
    const projRate = getRevCommissionRate(projRev, DEFAULT_BK_REV_BONUS_TIERS);
    return Math.round((projRev * projRate) / 100);
  }, [leaderboard, summary.totalRevenue, ratio]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const [res, previousRes] = await Promise.all([
        apiClient.bk.getRevenueLeaderboard({
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
          storeId: selectedStore,
        }),
        previousPeriod
          ? apiClient.bk.getRevenueLeaderboard({ ...previousPeriod.params, storeId: selectedStore })
          : Promise.resolve(null),
      ]);
      setLeaderboard(res.leaderboard || []);
      setSummary(res.summary || { completedOrdersCount: 0, totalRevenue: 0, totalCommissionBonus: 0 });
      setPreviousSummary(previousRes?.summary || null);
    } catch (err) {
      console.error('Error loading BK revenue leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async () => {
    setDetailsLoading(true);
    try {
      const res = await apiClient.bk.getRevenueDetails({
        bookerId: selectedBookerId || 'ALL',
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
      });
      const data = (res.data || []).map((item: any, idx: number) => ({
        ...item,
        rowKeyId: `${item.orderId || 'rev'}_${idx}`,
      }));
      setDetailRecords(data);
    } catch (err) {
      console.error('Error fetching revenue details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [dateRange, previousPeriod, selectedStore]);

  useEffect(() => {
    fetchDetails();
  }, [dateRange, selectedStore, selectedBookerId]);

  // Instantly refresh BK Revenue Leaderboard & Details when calls/bookings are saved
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
  }, [dateRange, selectedStore, selectedBookerId]);

  const handleSelectBooker = useCallback(
    (bookerId: string, bookerName?: string) => {
      if (selectedBookerId === bookerId) {
        setSelectedBookerId(null);
        setSelectedBookerName(null);
      } else {
        setSelectedBookerId(bookerId);
        const found = leaderboard.find((item) => String(item.bookerId) === bookerId);
        setSelectedBookerName(bookerName || found?.displayName || `BK #${bookerId}`);
      }
    },
    [selectedBookerId, leaderboard]
  );

  const filteredDetailRecords = useMemo(() => {
    if (!searchText) return detailRecords;
    const q = removeVietnameseTones(searchText);
    return detailRecords.filter(
      (r) =>
        removeVietnameseTones(r.clientName).includes(q) ||
        removeVietnameseTones(r.orderKey).includes(q) ||
        (r.store && removeVietnameseTones(r.store).includes(q))
    );
  }, [detailRecords, searchText]);

  const columns = useMemo(
    () =>
      buildBkRevenueLeaderboardColumns({
        selectedBookerId,
        ratio,
        isDayMode,
        isPastPeriod,
        periodNoun,
        onSelectBooker: handleSelectBooker,
      }),
    [selectedBookerId, ratio, isDayMode, isPastPeriod, periodNoun, handleSelectBooker]
  );

  const detailColumns = useMemo(() => buildBkRevenueDetailColumns(), []);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <BkRevenueSummaryCards
        summary={summary}
        previousSummary={previousSummary}
        comparison={previousPeriod?.comparison}
        isDayMode={isDayMode}
        isPastPeriod={isPastPeriod}
        elapsedRatioPercent={elapsedRatioPercent}
        periodNoun={periodNoun}
        projectedCompletedOrders={projectedCompletedOrders}
        projectedRevenue={projectedRevenue}
        projectedCommissionBonus={projectedCommissionBonus}
      />

      {/* Revenue Leaderboard */}
      <BkLeaderboardCard
        title="BK Leaderboard - Net Revenue"
        description="Chỉ xếp hạng thành tích nhóm Telesales trong khoảng thời gian lọc"
        leaderboard={leaderboard}
        loading={loading}
        columns={columns}
        selectedBooker={selectedBookerId || undefined}
        onSelectBooker={(bId) => handleSelectBooker(bId)}
        mobileMetrics={(record) => {
          const projRev = Math.round((record.totalRevenue || 0) / (ratio || 1));
          const projRate = getRevCommissionRate(projRev, DEFAULT_BK_REV_BONUS_TIERS);
          const projBonus = Math.round((projRev * projRate) / 100);
          return [
            { label: 'Đơn done', value: record.completedOrdersCount ?? 0, tone: 'accent' },
            {
              label: 'Doanh thu net',
              value: formatBkRevenueCurrency(record.totalRevenue ?? 0),
              subtext: !isDayMode && !isPastPeriod ? `🔮 ~${formatCompactVND(projRev)}` : undefined,
              tone: 'accent',
            },
            {
              label: 'Hoa hồng',
              value: formatBkRevenueCurrency(record.totalCommissionBonus ?? 0),
              subtext: !isDayMode && !isPastPeriod ? `🔮 ~${formatCompactVND(projBonus)} (${projRate}%)` : undefined,
              tone: 'success',
            },
          ];
        }}
        extraSummary={
          <Text type="secondary" className="text-xs flex items-center gap-1">
            <InfoCircleOutlined className="text-amber-500" />
            <span>Click vào dòng BK để lọc danh sách chi tiết bên dưới</span>
          </Text>
        }
      />

      {/* Embedded Details Table Card */}
      <Card
        className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-6"
        style={{ background: token.colorBgContainer, marginTop: '24px' }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold m-0" style={{ color: token.colorText }}>
                Chi Tiết Doanh Thu Net & Bonus
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
              {selectedBookerName
                ? `Hiển thị chi tiết doanh thu đơn hàng của Telesales ${selectedBookerName}`
                : 'Hiển thị chi tiết doanh thu đơn hàng của nhóm Telesales'}
            </Text>
          </div>

          <Space>
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm tên khách, mã đơn..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              className="w-56"
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
            defaultPageSize: 50,
            pageSizeOptions: ['20', '50', '100', '200'],
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total}\u00a0đơn hàng phát sinh doanh thu`,
          }}
          size="small"
          scroll={{ x: 'max-content' }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        />
      </Card>
    </div>
  );
}
