'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, theme, Space, Button, Input, Tooltip } from 'antd';
import { GiftOutlined, EyeOutlined, DollarOutlined, HeartOutlined, SearchOutlined, ReloadOutlined, InfoCircleOutlined, CheckCircleOutlined, CompressOutlined, ExpandOutlined } from '@ant-design/icons';
import { BkTipLeaderboardEntry, BkTipRecord } from '@mos-lab/shared';
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

interface BkTipTabProps {
  dateRange: [any, any];
  selectedStore: string;
  selectedBooker: string;
}

export default function BkTipTab({ dateRange, selectedStore, selectedBooker }: BkTipTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [leaderboard, setLeaderboard] = useState<BkTipLeaderboardEntry[]>([]);
  const [summary, setSummary] = useState({
    totalBookingsCount: 0,
    tippedBookingsCount: 0,
    totalCustomerTip: 0,
    totalBkTipBonus: 0,
  });

  const [selectedBookerId, setSelectedBookerId] = useState<string | null>(null);
  const [selectedBookerName, setSelectedBookerName] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [detailRecords, setDetailRecords] = useState<BkTipRecord[]>([]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.bk.getTipLeaderboard({
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
      });
      setLeaderboard(res.leaderboard || []);
      setSummary(res.summary || { totalBookingsCount: 0, tippedBookingsCount: 0, totalCustomerTip: 0, totalBkTipBonus: 0 });
    } catch (err) {
      console.error('Error loading BK tip leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async () => {
    setDetailsLoading(true);
    try {
      const res = await apiClient.bk.getTipDetails({
        bookerId: selectedBookerId || 'ALL',
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
      });
      const data = (res.data || []).map((item: any, idx: number) => ({
        ...item,
        rowKeyId: `${item.orderId || 'tip'}_${idx}`,
      }));
      setDetailRecords(data);
    } catch (err) {
      console.error('Error fetching tip details', err);
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
    const lower = searchText.toLowerCase();
    return detailRecords.filter(
      (r) =>
        r.clientName.toLowerCase().includes(lower) ||
        (r.bookerName && r.bookerName.toLowerCase().includes(lower)) ||
        (r.store && r.store.toLowerCase().includes(lower))
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
      render: (name: string, record: BkTipLeaderboardEntry) => {
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
      title: 'Số Đơn Được Tip',
      dataIndex: 'tippedBookingsCount',
      key: 'tippedBookingsCount',
      align: 'center' as const,
      render: (val: number, r: BkTipLeaderboardEntry) => (
        <span className="tabular-nums font-bold text-xs text-pink-400">
          {val} / {r.totalBookingsCount}
        </span>
      ),
    },
    {
      title: 'Tổng Tip Khách Cho',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums font-semibold text-xs text-slate-300">{formatCurrency(val)}</span>,
    },
    {
      title: 'BK Tip Bonus (% Share)',
      dataIndex: 'totalBkTipBonus',
      key: 'totalBkTipBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-sm text-pink-400">
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Chi tiết',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: BkTipLeaderboardEntry) => {
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
      title: 'STT',
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => <span className="tabular-nums text-xs text-slate-500 font-medium">{index + 1}</span>,
    },
    {
      title: 'Thời Gian',
      dataIndex: 'checkinTime',
      key: 'checkinTime',
      render: (dateStr: string) => <span className="tabular-nums text-xs text-slate-400 font-medium whitespace-nowrap">{dateStr ? dateStr.replace('T', ' ').substring(0, 16) : '-'}</span>,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (name: string) => <span className="font-semibold text-xs text-sky-400 whitespace-nowrap">{name || 'Khách hàng'}</span>,
    },
    {
      title: 'Booker',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (bName: string) => <span className="font-medium text-xs text-slate-300 whitespace-nowrap">{bName || '-'}</span>,
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'store',
      key: 'store',
      align: 'center' as const,
      render: (val: string) => <span className="text-xs font-medium text-slate-400 whitespace-nowrap">· {formatStoreCode(val)}</span>,
    },
    {
      title: 'Tip Khách Cho',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums font-semibold text-xs text-slate-300">{formatCurrency(val)}</span>,
    },
    {
      title: 'Thưởng BK Tip (% Share)',
      dataIndex: 'bkTipAmount',
      key: 'bkTipAmount',
      align: 'right' as const,
      render: (val: number, r: BkTipRecord) => (
        <span className="tabular-nums font-bold text-xs text-pink-400 whitespace-nowrap">
          +{formatCurrency(val)} <span className="text-[10px] text-slate-400 font-normal">· {r.bkTipPercentage}%</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl" style={{ background: token.colorBgContainer }}>
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">Đơn Đặt Được Khách Tip</span>}
              value={summary.tippedBookingsCount}
              valueStyle={{ color: '#ec4899', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<HeartOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl" style={{ background: token.colorBgContainer }}>
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">Tổng Tip Khách Cho</span>}
              value={summary.totalCustomerTip}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#8b5cf6', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<GiftOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl" style={{ background: token.colorBgContainer }}>
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">Tổng Thưởng BK Tip (% Share)</span>}
              value={summary.totalBkTipBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#db2777', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<DollarOutlined className="mr-2" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tip Leaderboard */}
      <BkLeaderboardCard
        title="Bảng Xếp Hạng BK Tip (Leaderboard BK Tip)"
        leaderboard={leaderboard}
        loading={loading}
        columns={columns}
        onSelectBooker={(bId) => handleSelectBooker(bId)}
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
                Bảng Dữ Liệu Báo Cáo BK Tip (Chi Tiết Tip Nhận Từ Đơn Đặt)
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
                ? `Hiển thị chi tiết tiền tip khách cho của Booker ${selectedBookerName}`
                : 'Hiển thị chi tiết tiền tip khách cho của tất cả Booker'}
            </Text>
          </div>

          <Space>
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm tên khách, chi nhánh..."
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
            showTotal: (total) => `Tổng cộng ${total} đơn hàng nhận tip`,
          }}
          size="small"
          scroll={{ x: 'max-content' }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        />
      </Card>
    </div>
  );
}
