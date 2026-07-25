'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, theme, Space, Button, Input, Badge, Tooltip } from 'antd';
import dynamic from 'next/dynamic';
import {
  CheckCircleOutlined,
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
import { BkDoneLeaderboardEntry, BkDoneRecord } from '@mos-lab/shared';
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
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'MISSED'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [detailRecords, setDetailRecords] = useState<BkDoneRecord[]>([]);

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
    const lower = searchText.toLowerCase();
    return detailRecords.filter(
      (r) =>
        r.clientName.toLowerCase().includes(lower) ||
        r.orderKey.toLowerCase().includes(lower) ||
        (r.clientPhone && r.clientPhone.toLowerCase().includes(lower)) ||
        (r.bookerName && r.bookerName.toLowerCase().includes(lower)) ||
        (r.serviceName && r.serviceName.toLowerCase().includes(lower))
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
      title: 'Booker (Online Consultant)',
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
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">· {formatStoreCode(record.store)}</span>
                {isSelected && (
                  <Tag color="gold" icon={<CheckCircleOutlined />} className="font-semibold text-[10px] m-0 py-0 px-1 whitespace-nowrap">
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
      title: 'Lượt Done',
      dataIndex: 'doneCount',
      key: 'doneCount',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-emerald-400">{val}</span>,
    },
    {
      title: 'Lượt Missed',
      dataIndex: 'missedCount',
      key: 'missedCount',
      align: 'center' as const,
      render: (val: number, record: BkDoneLeaderboardEntry) => (
        <span
          className="tabular-nums font-semibold text-xs text-rose-400 cursor-pointer hover:underline hover:text-rose-300 transition-colors"
          title="Click để lọc ra và xem chi tiết danh sách khách missed của Booker này"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectBookerMissed(String(record.bookerId), record.displayName);
          }}
        >
          {val} <span className="text-[11px] font-normal opacity-90">({record.missedRatePercent || 0}%)</span>
        </span>
      ),
    },
    {
      title: 'Hoa hồng OC (Thưởng Check-in)',
      dataIndex: 'basicBonus',
      key: 'basicBonus',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums font-semibold text-xs text-emerald-400">{formatCurrency(val)}</span>,
    },
    {
      title: 'Thưởng Mốc Done',
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
      title: 'Thưởng / Phạt Missed Rate',
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
      title: 'Tổng Thưởng Done',
      dataIndex: 'totalDoneBonus',
      key: 'totalDoneBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-sm text-emerald-400">
          {formatCurrency(val)}
        </span>
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
      title: 'Khách hàng',
      key: 'client',
      render: (record: BkDoneRecord) => (
        <div
          className="cursor-pointer group whitespace-nowrap"
          onClick={(e) => {
            e.stopPropagation();
            if (record.customerId) {
              setSelectedCustomerId(record.customerId);
              setCustomerDrawerOpen(true);
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
      render: (bName: string) => <span className="font-medium text-xs text-slate-300 whitespace-nowrap">{bName || '-'}</span>,
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
          <div className="text-xs font-medium text-slate-300">{record.serviceName || 'Không có thông tin'}</div>
          {(record.servicePrice || 0) > 0 && (
            <div className="text-[10px] text-slate-400 tabular-nums">
              Giá: {formatCurrency(record.servicePrice || 0)} | Giảm: {record.discountPercent || 0}%
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
      render: (val: number) =>
        val > 0 ? (
          <span className="tabular-nums font-semibold text-xs text-slate-300">{formatCurrency(val)}</span>
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
      title: 'Hoa hồng OC',
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

        if (isComp) {
          color = 'success';
          label = '✓ Done';
        } else if (isCancelled) {
          color = 'error';
          label = '❌ Đã hủy';
        } else if (isFuture) {
          color = 'processing';
          label = '📅 Sắp tới';
        } else {
          color = 'volcano';
          label = '❌ Missed';
        }

        return (
          <Tag
            color={color}
            className="font-semibold text-xs py-0 px-2 rounded-full m-0 whitespace-nowrap"
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
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl" style={{ background: token.colorBgContainer }}>
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">Lượt Check-in Thắng</span>}
              value={summary.totalDone}
              valueStyle={{ color: '#10b981', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<CheckCircleOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl" style={{ background: token.colorBgContainer }}>
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
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl" style={{ background: token.colorBgContainer }}>
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">Tổng Hoa Hồng OC & Thưởng Done</span>}
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
        title="Bảng Xếp Hạng Thưởng Đơn Done & Hoa Hồng OC"
        leaderboard={leaderboard}
        loading={loading}
        columns={columns}
        onSelectBooker={(bId) => handleSelectBooker(bId)}
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
                : 'Hiển thị tất cả đơn hàng đặt lịch của Booker'}
            </Text>
          </div>

          <Space wrap>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'ALL'
                    ? 'bg-amber-500 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('ALL')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('COMPLETED')}
              >
                ✓ Đơn Done
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === 'MISSED'
                    ? 'bg-rose-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setFilterStatus('MISSED')}
              >
                ❌ Đơn Missed
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
              <Button icon={<ReloadOutlined />} size="small" onClick={fetchDetails} loading={detailsLoading} />
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
            showTotal: (total) => `Tổng cộng ${total} đơn hàng`,
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
