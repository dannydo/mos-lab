'use client';

import { TableIndexHeader } from '~/components/ui';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, theme, Space, Button, Input, Tooltip } from 'antd';
import dynamic from 'next/dynamic';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PhoneOutlined,
  EyeOutlined,
  TrophyOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  UserOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import { BkBookingLeaderboardEntry, BkBookingRecord, removeVietnameseTones } from '@mos-lab/shared';
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

interface BkBookingTabProps {
  dateRange: [SafeAny, SafeAny];
  selectedStore: string;
  selectedBooker: string;
}

export default function BkBookingTab({ dateRange, selectedStore, selectedBooker }: BkBookingTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const [leaderboard, setLeaderboard] = useState<BkBookingLeaderboardEntry[]>([]);
  const [summary, setSummary] = useState({
    totalBookings: 0,
    doneBookings: 0,
    conversionRate: 0,
    totalCalls: 0,
    totalPickups: 0,
  });

  const [selectedBookerId, setSelectedBookerId] = useState<string | null>(null);
  const [selectedBookerName, setSelectedBookerName] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [detailRecords, setDetailRecords] = useState<BkBookingRecord[]>([]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.bk.getBookingLeaderboard({
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
      });
      setLeaderboard(res.leaderboard || []);
      setSummary(
        res.summary || { totalBookings: 0, doneBookings: 0, conversionRate: 0, totalCalls: 0, totalPickups: 0 }
      );
    } catch (err) {
      console.error('Error loading BK booking leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async () => {
    setDetailsLoading(true);
    try {
      const res = await apiClient.bk.getBookingDetails({
        bookerId: selectedBookerId || 'ALL',
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
      });
      const data = (res.data || []).map((item: SafeAny, idx: number) => ({
        ...item,
        rowKeyId: `${item.orderId || 'bk'}_${idx}`,
      }));
      setDetailRecords(data);
    } catch (err) {
      console.error('Error fetching booking details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [dateRange, selectedStore]);

  useEffect(() => {
    fetchDetails();
  }, [dateRange, selectedStore, selectedBookerId]);

  // Instantly refresh BK Leaderboard & Details when calls/bookings are saved
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
        (r.bookerName && removeVietnameseTones(r.bookerName).includes(q))
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
      title: 'Booker',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: BkBookingLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Space
            className="cursor-pointer group whitespace-nowrap"
            size={8}
            role="button"
            tabIndex={0}
            aria-label={`Chọn booker ${name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectBooker(String(record.bookerId), name);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                handleSelectBooker(String(record.bookerId), name);
              }
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
      title: 'Số Booking Đã Tạo',
      dataIndex: 'totalCreatedBookings',
      key: 'totalCreatedBookings',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-sky-400">{val}</span>,
    },
    {
      title: '# Cuộc gọi',
      dataIndex: 'callCount',
      key: 'callCount',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-violet-400">{val}</span>,
    },
    {
      title: '# Pickup',
      dataIndex: 'pickupCount',
      key: 'pickupCount',
      align: 'center' as const,
      render: (val: number, record: BkBookingLeaderboardEntry) => (
        <Tooltip title="Tỷ lệ pickup = số pickup / số cuộc gọi">
          <span className="tabular-nums font-bold text-xs text-emerald-400 whitespace-nowrap">
            {val} <span className="font-medium text-emerald-300/80">({record.pickupRate ?? 0}%)</span>
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Booking Thành Công (Done)',
      dataIndex: 'doneBookings',
      key: 'doneBookings',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-emerald-400">{val}</span>,
    },
    {
      title: 'Booking Bị Hủy / Missed',
      dataIndex: 'missedBookings',
      key: 'missedBookings',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-medium text-xs text-slate-500">{val}</span>,
    },
    {
      title: 'Tỷ Lệ Chuyển Đổi (Done/Book)',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      align: 'center' as const,
      render: (val: number) => (
        <Tag
          color={val >= 70 ? 'success' : val >= 50 ? 'warning' : 'default'}
          className="tabular-nums font-semibold px-2 py-0 text-xs rounded-full m-0"
        >
          {val}%
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      render: (_: SafeAny, record: BkBookingLeaderboardEntry) => {
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
      width: 50,
      align: 'center' as const,
      render: (_: SafeAny, __: SafeAny, index: number) => (
        <span className="tabular-nums text-xs text-slate-500 font-medium">{index + 1}</span>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (name: string, r: BkBookingRecord) => (
        <div
          className="cursor-pointer group whitespace-nowrap"
          role="button"
          tabIndex={0}
          aria-label={`Xem chi tiết khách hàng ${name || 'Khách hàng'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (r.customerId) {
              setSelectedCustomerId(r.customerId);
              setCustomerDrawerOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              if (r.customerId) {
                setSelectedCustomerId(r.customerId);
                setCustomerDrawerOpen(true);
              }
            }
          }}
        >
          <div className="flex items-center gap-2">
            <BkAvatar name={name || 'Khách hàng'} src={r.clientAvatar} size={28} />
            <div className="min-w-0">
              <div className="font-semibold text-xs text-sky-400 group-hover:text-amber-400 transition-colors flex items-center gap-1 whitespace-nowrap">
                <span>{name || 'Khách hàng'}</span>
                <UserOutlined className="text-[10px] opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity" />
              </div>
              {r.clientPhone && (
                <div className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">{r.clientPhone}</div>
              )}
            </div>
          </div>
        </div>
      ),
    },

    {
      title: 'Booker Tạo',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (bName: string, r: BkBookingRecord) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <BkAvatar name={bName || 'Booker'} src={r.bookerAvatar} size={28} />
          <span className="font-medium text-xs text-slate-600 dark:text-slate-300">{bName || '-'}</span>
        </div>
      ),
    },
    {
      title: 'Thời Gian Tạo',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (cDate: string) => {
        return (
          <span className="tabular-nums text-xs text-amber-400 font-semibold whitespace-nowrap">
            {cDate ? cDate.replace('T', ' ').substring(0, 16) : '-'}
          </span>
        );
      },
    },
    {
      title: 'Lịch Hẹn Khách',
      dataIndex: 'bookingDate',
      key: 'bookingDate',
      render: (dateStr: string) => (
        <span className="tabular-nums text-xs text-slate-400 font-medium whitespace-nowrap">
          {dateStr ? dateStr.replace('T', ' ').substring(0, 16) : '-'}
        </span>
      ),
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'store',
      key: 'store',
      align: 'center' as const,
      render: (val: string) => (
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">· {formatStoreCode(val)}</span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => {
        if (status === 'Completed' || status === 'Done' || status === 'Check-in thành công') {
          return (
            <Tag color="success" className="font-semibold text-xs py-0 px-2 rounded-full m-0 whitespace-nowrap">
              ✓ Done
            </Tag>
          );
        }
        if (status === 'Cancelled' || status === 'Missed') {
          return (
            <Tag color="error" className="font-semibold text-xs py-0 px-2 rounded-full m-0 whitespace-nowrap">
              🔴 Đã hủy
            </Tag>
          );
        }
        return (
          <Tag color="default" className="font-semibold text-xs py-0 px-2 rounded-full m-0 whitespace-nowrap">
            ⚪ Incoming
          </Tag>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Booking Đã Tạo</span>}
              value={summary.totalBookings}
              valueStyle={{ color: '#2563eb', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<CalendarOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">Booking Done</span>}
              value={summary.doneBookings}
              valueStyle={{ color: '#10b981', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<CheckCircleOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">Tỷ Lệ Chuyển Đổi Done</span>}
              value={summary.conversionRate}
              suffix="%"
              valueStyle={{ color: '#f59e0b', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<TrophyOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Cuộc gọi</span>}
              value={summary.totalCalls}
              valueStyle={{ color: '#8b5cf6', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<PhoneOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Pickup</span>}
              value={summary.totalPickups}
              valueStyle={{ color: '#10b981', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<CheckCircleOutlined className="mr-2" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Booking Leaderboard Card */}
      <BkLeaderboardCard
        title="BK Leaderboard - Booking"
        description="Xếp hạng hiệu suất của nhân viên thuộc nhóm Telesales trong khoảng thời gian lọc"
        leaderboard={leaderboard}
        loading={loading}
        columns={columns}
        selectedBooker={selectedBookerId || undefined}
        onSelectBooker={(bId) => handleSelectBooker(bId)}
        mobileMetrics={(record) => [
          { label: 'Đã tạo', value: record.totalCreatedBookings ?? 0, tone: 'accent' },
          { label: 'Cuộc gọi', value: record.callCount ?? 0, tone: 'accent' },
          { label: 'Pickup', value: `${record.pickupCount ?? 0} (${record.pickupRate ?? 0}%)`, tone: 'success' },
          { label: 'Done', value: record.doneBookings ?? 0, tone: 'success' },
          { label: 'Tỷ lệ', value: `${record.conversionRate ?? 0}%`, tone: 'warning' },
        ]}
        extraSummary={
          <Text type="secondary" className="text-xs flex items-center gap-1">
            <InfoCircleOutlined className="text-amber-500" />
            <span>Click vào dòng BK để lọc danh sách chi tiết bên dưới</span>
          </Text>
        }
      />

      {/* Embedded Details Table Card (Matching CC Report Layout) */}
      <Card
        className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-6"
        style={{ background: token.colorBgContainer, marginTop: '24px' }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold m-0" style={{ color: token.colorText }}>
                Chi Tiết Khách Hàng Đặt Lịch & Trạng Thái
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
                ? `Hiển thị danh sách booking được tạo bởi Booker ${selectedBookerName}`
                : 'Hiển thị tất cả danh sách booking của nhóm Telesales'}
            </Text>
          </div>

          <Space>
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm tên khách, SĐT, mã đơn..."
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
            showTotal: (total) => `Tổng cộng ${total} đơn booking`,
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
