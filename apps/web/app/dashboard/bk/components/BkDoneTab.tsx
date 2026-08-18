'use client';

import { AppIcon, TableIndexHeader } from '~/components/ui';

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
import { CircleCheck, CircleX, DollarSign, ListFilter, Package } from 'lucide-react';
import { BkDoneDetailsFilter, BkDoneLeaderboardEntry, BkDoneRecord, removeVietnameseTones } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import BkAvatar from './BkAvatar';
import BkLeaderboardCard from './BkLeaderboardCard';

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
  done: 'Done',
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
}

export default function BkDoneTab({ dateRange, selectedStore, selectedBooker }: BkDoneTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const [leaderboard, setLeaderboard] = useState<BkDoneLeaderboardEntry[]>([]);
  const [summary, setSummary] = useState({
    totalDone: 0,
    avgDoneRate: 0,
    totalDoneBonus: 0,
  });

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

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.bk.getDoneLeaderboard({
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
      });
      setLeaderboard(res.leaderboard || []);
      setSummary(res.summary || { totalDone: 0, avgDoneRate: 0, totalDoneBonus: 0 });
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
  }, [dateRange, selectedStore]);

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

  const handleSelectBookerMissed = (bookerId: string, bookerName?: string) => {
    setSelectedBookerId(bookerId);
    const found = leaderboard.find((item) => String(item.bookerId) === bookerId);
    setSelectedBookerName(bookerName || found?.displayName || `BK #${bookerId}`);
    setFilterStatus('MISSED');
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
        if (rank === 1) return <span style={{ fontSize: '18px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '18px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '18px' }}>🥉</span>;
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
      title: BK_DONE_LEADERBOARD_LABELS.done,
      dataIndex: 'doneCount',
      key: 'doneCount',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-emerald-400">{val}</span>,
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.missed,
      dataIndex: 'missedCount',
      key: 'missedCount',
      align: 'center' as const,
      render: (val: number, record: BkDoneLeaderboardEntry) => (
        <span
          className="tabular-nums font-semibold text-xs text-rose-400 cursor-pointer hover:underline hover:text-rose-300 transition-colors"
          title="Click để lọc ra và xem chi tiết danh sách khách missed của Booker này"
          role="button"
          tabIndex={0}
          aria-label={`Xem chi tiết danh sách khách missed của booker ${record.displayName}`}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectBookerMissed(String(record.bookerId), record.displayName);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              handleSelectBookerMissed(String(record.bookerId), record.displayName);
            }
          }}
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
      render: (val: number) => (
        <span className={`tabular-nums font-semibold text-xs ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {val > 0 ? `+${formatCurrency(val)}` : val < 0 ? formatCurrency(val) : '-'}
        </span>
      ),
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
          <div className="font-semibold text-xs text-sky-400 group-hover:text-amber-400 transition-colors flex items-center gap-1 whitespace-nowrap">
            <span>{record.clientName || 'Khách hàng'}</span>
            <UserOutlined className="text-[10px] opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity" />
          </div>
          <div className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
            {record.clientPhone || 'Chưa có SĐT'}
          </div>
        </div>
      ),
    },

    {
      title: 'Booker',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (bName: string) => (
        <span className="font-medium text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{bName || '-'}</span>
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
      title: 'Dịch vụ chính',
      key: 'service',
      render: (record: BkDoneRecord) => (
        <div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {record.serviceName || 'Không có thông tin'}
          </div>
          {record.isComboLive ? (
            <div className="text-[10px] font-medium text-violet-400 whitespace-nowrap">Combo Live</div>
          ) : (record.servicePrice || 0) > 0 ? (
            <div className="text-[10px] text-slate-400 tabular-nums">
              Giá: {formatCurrency(record.servicePrice || 0)} | Giảm: {record.discountPercent || 0}%
            </div>
          ) : null}
          {record.comboName && (
            <div className="text-[10px] font-medium text-violet-400 whitespace-nowrap">
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
        <Col xs={24} sm={12} md={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">Lượt Check-in Thắng</span>}
              value={summary.totalDone}
              valueStyle={{ color: '#10b981', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<CheckCircleOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">Tỷ Lệ Done Trung Bình</span>}
              value={summary.avgDoneRate}
              suffix="%"
              valueStyle={{ color: '#f59e0b', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<TrophyOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={
                <span className="text-xs font-semibold text-slate-500 uppercase">∑ Hoa Hồng OC & Thưởng Done</span>
              }
              value={summary.totalDoneBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#059669', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<DollarOutlined className="mr-2" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Done Leaderboard */}
      <BkLeaderboardCard
        title="Bảng Xếp Hạng Thưởng Done Telesales"
        description="Chỉ xếp hạng thành tích nhóm Telesales trong khoảng thời gian lọc"
        leaderboard={leaderboard}
        loading={loading}
        columns={columns}
        selectedBooker={selectedBookerId || undefined}
        onSelectBooker={(bId) => handleSelectBooker(bId)}
        mobileMetrics={(record) => [
          { label: 'Done', value: record.doneCount ?? 0, tone: 'success' },
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
                {selectedBookerName
                  ? `Danh sách Khách hàng đặt lịch của Online Consultant: ${selectedBookerName}`
                  : 'Danh sách Khách hàng đặt lịch của Online Consultant'}
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
              {filterStatus === 'MISSED'
                ? 'Đang hiển thị danh sách tất cả Khách hàng MISSED (đã đặt hẹn nhưng không đến)'
                : filterStatus === 'COMPLETED'
                  ? 'Đang hiển thị danh sách Khách hàng DONE (đã đến làm dịch vụ thành công)'
                  : filterStatus === 'TIP'
                    ? 'Đang hiển thị các đơn Completed có tiền tip'
                    : filterStatus === 'COMBO'
                      ? 'Đang hiển thị các đơn Completed có bán combo'
                      : 'Hiển thị tất cả đơn hàng đặt lịch của Booker'}
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
                aria-pressed={filterStatus === 'COMPLETED'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('COMPLETED')}
              >
                <AppIcon icon={CircleCheck} size={14} />
                <span>Done</span>
              </button>
              <button
                type="button"
                aria-pressed={filterStatus === 'MISSED'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'MISSED'
                    ? 'bg-rose-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('MISSED')}
              >
                <AppIcon icon={CircleX} size={14} />
                <span>Missed</span>
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
              <button
                type="button"
                aria-pressed={filterStatus === 'COMBO'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'COMBO'
                    ? 'bg-violet-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('COMBO')}
              >
                <AppIcon icon={Package} size={14} />
                <span>Combo</span>
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
