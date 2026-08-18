'use client';

import { TableIndexHeader } from '~/components/ui';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, theme, Space, Button, Input, Tooltip } from 'antd';
import {
  DollarOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
  TrophyOutlined,
  SearchOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import { BkRevenueLeaderboardEntry, BkRevenueRecord, removeVietnameseTones } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import BkAvatar from './BkAvatar';
import BkLeaderboardCard from './BkLeaderboardCard';

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

interface BkRevenueTabProps {
  dateRange: [any, any];
  selectedStore: string;
  selectedBooker: string;
}

export default function BkRevenueTab({ dateRange, selectedStore, selectedBooker }: BkRevenueTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [leaderboard, setLeaderboard] = useState<BkRevenueLeaderboardEntry[]>([]);
  const [summary, setSummary] = useState({
    completedOrdersCount: 0,
    totalRevenue: 0,
    totalCommissionBonus: 0,
  });

  const [selectedBookerId, setSelectedBookerId] = useState<string | null>(null);
  const [selectedBookerName, setSelectedBookerName] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [detailRecords, setDetailRecords] = useState<BkRevenueRecord[]>([]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.bk.getRevenueLeaderboard({
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
      });
      setLeaderboard(res.leaderboard || []);
      setSummary(res.summary || { completedOrdersCount: 0, totalRevenue: 0, totalCommissionBonus: 0 });
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
  }, [dateRange, selectedStore]);

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
        (r.store && removeVietnameseTones(r.store).includes(q))
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
      render: (name: string, record: BkRevenueLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Space
            className="cursor-pointer group whitespace-nowrap"
            size={8}
            role="button"
            tabIndex={0}
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
      title: 'Done',
      dataIndex: 'completedOrdersCount',
      key: 'completedOrdersCount',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-sky-400">{val}</span>,
    },
    {
      title: '∑ Doanh Thu Net',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-indigo-400">{formatCurrency(val)}</span>
      ),
    },
    {
      title: '% Bonus',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      align: 'center' as const,
      render: (val: number) => (
        <Tag color="purple" className="tabular-nums font-semibold px-2 py-0 text-xs rounded-full m-0">
          {val}%
        </Tag>
      ),
    },
    {
      title: 'Bonus Doanh Thu',
      dataIndex: 'totalCommissionBonus',
      key: 'totalCommissionBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-sm text-purple-400">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Chi tiết',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: BkRevenueLeaderboardEntry) => {
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
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums text-xs text-slate-500 font-medium">{index + 1}</span>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (name: string, record: BkRevenueRecord) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <BkAvatar name={name || 'Khách hàng'} src={record.clientAvatar} size={28} />
          <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">{name || 'Khách hàng'}</span>
        </div>
      ),
    },
    {
      title: 'Thời Gian',
      dataIndex: 'orderDate',
      key: 'orderDate',
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
      title: 'Doanh Thu Net',
      dataIndex: 'totalOrderPrice',
      key: 'totalOrderPrice',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-slate-600 dark:text-slate-300">
          {formatCurrency(val)}
        </span>
      ),
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
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Done</span>}
              value={summary.completedOrdersCount}
              valueStyle={{ color: '#2563eb', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<ShoppingCartOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Doanh Thu Net</span>}
              value={summary.totalRevenue}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#4f46e5', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<DollarOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thưởng Doanh Thu</span>}
              value={summary.totalCommissionBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#9333ea', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<TrophyOutlined className="mr-2" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Revenue Leaderboard */}
      <BkLeaderboardCard
        title="BK Leaderboard - Net Revenue"
        description="Chỉ xếp hạng thành tích nhóm Telesales trong khoảng thời gian lọc"
        leaderboard={leaderboard}
        loading={loading}
        columns={columns}
        selectedBooker={selectedBookerId || undefined}
        onSelectBooker={(bId) => handleSelectBooker(bId)}
        mobileMetrics={(record) => [
          { label: 'Đơn done', value: record.completedOrdersCount ?? 0, tone: 'accent' },
          { label: 'Doanh thu net', value: formatCurrency(record.totalRevenue ?? 0), tone: 'accent' },
          { label: 'Hoa hồng', value: formatCurrency(record.totalCommissionBonus ?? 0), tone: 'success' },
        ]}
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
            showTotal: (total) => `Tổng cộng ${total} đơn hàng phát sinh doanh thu`,
          }}
          size="small"
          scroll={{ x: 'max-content' }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        />
      </Card>
    </div>
  );
}
