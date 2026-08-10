'use client';

import React from 'react';
import { Tabs, Select, Button, Table, Space, Avatar, Tag, Tooltip, Typography, theme } from 'antd';
import { SettingOutlined, PhoneOutlined, EyeOutlined } from '@ant-design/icons';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import { BookingData } from '../hooks/useTodayData';
import { SectionCard } from '../../../../components/ui';
import { vietnameseSearchFilter } from '@mos-lab/shared';

const { Text } = Typography;

const getChannelColor = (channel: string) => {
  const c = (channel || '').toUpperCase();
  if (c.includes('FB')) return 'blue';
  if (c.includes('ZALO')) return 'cyan';
  if (c.includes('VL')) return 'magenta';
  if (c.includes('WEB')) return 'orange';
  if (c.includes('HOTLINE')) return 'red';
  if (c.includes('WA')) return 'green';
  if (c.includes('GB')) return 'geekblue';
  return 'purple';
};

const getStoreColor = (store: string) => {
  const s = (store || '').toLowerCase();
  if (s.includes('thám')) return 'gold';
  if (s.includes('pxl') || s.includes('long')) return 'blue';
  if (s.includes('estella') || s.includes('este')) return 'magenta';
  return 'cyan';
};

interface TodayBookingsTableProps {
  filteredBookings: BookingData[];
  bookingFilter: 'all' | 'combo' | 'oc' | 'other';
  setBookingFilter: (filter: 'all' | 'combo' | 'oc' | 'other') => void;
  bookingBranch: 'all' | 'detham' | 'pxl' | 'estella';
  setBookingBranch: (branch: 'all' | 'detham' | 'pxl' | 'estella') => void;
  selectedBooker?: string | null;
  setSelectedBooker?: (booker: string | null) => void;
  openCustomerDrawer: (record: SafeAny) => void;
  bookingBranchCounts: { dt: number; pxl: number; ep: number; total: number };
  allBookings: BookingData[];
}

const TodayBookingsTable = React.memo(function TodayBookingsTable({
  filteredBookings,
  bookingFilter,
  setBookingFilter,
  bookingBranch,
  setBookingBranch,
  selectedBooker,
  setSelectedBooker,
  openCustomerDrawer,
  bookingBranchCounts,
  allBookings,
}: TodayBookingsTableProps) {
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const tabCounts = React.useMemo(() => {
    const branchBookings = (allBookings || []).filter((b) => {
      if (bookingBranch !== 'all') {
        if (bookingBranch === 'detham' && b.branchName !== 'Đề Thám') return false;
        if (bookingBranch === 'pxl' && b.branchName !== 'PXL') return false;
        if (bookingBranch === 'estella' && b.branchName !== 'Estella') return false;
      }
      return true;
    });

    const all = branchBookings.length;
    let combo = 0;
    let oc = 0;
    let other = 0;

    branchBookings.forEach((b) => {
      if (b.category === 'combo') combo++;
      else if (b.category === 'oc') oc++;
      else if (b.category === 'other') other++;
    });

    return { all, combo, oc, other };
  }, [allBookings, bookingBranch]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('today_bookings_page_size');
      if (saved) {
        setPageSize(parseInt(saved, 10));
      }
    }
  }, []);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [bookingFilter, bookingBranch]);

  const renderComingStatus = (status: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late') => {
    switch (status) {
      case 'completed':
        return <Tag color="success">Hoàn thành</Tag>;
      case 'serving':
      case 'arrived':
        return <Tag color="cyan">Đang làm</Tag>;
      case 'confirmed':
        return <Tag color="processing">Đã xác nhận</Tag>;
      case 'pending':
        return <Tag color="warning">Chờ đến</Tag>;
      case 'late':
        return <Tag color="error">Đến muộn</Tag>;
      default:
        return <Tag color="default">Chờ xử lý</Tag>;
    }
  };

  const bookingColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center' as const,
      render: (_: SafeAny, __: SafeAny, index: number) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (t: string) => <Text type="secondary">{t}</Text>,
    },
    {
      title: 'Booker',
      dataIndex: 'booker',
      key: 'booker',
      render: (b: string) => (
        <span
          className="font-semibold text-amber-500 hover:underline cursor-pointer transition-colors"
          onClick={() => setSelectedBooker && setSelectedBooker(b)}
          title={`Lọc danh sách theo Booker: ${b}`}
        >
          {b}
        </span>
      ),
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (c: string) => <Tag color={getChannelColor(c)}>{c || 'N/A'}</Tag>,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: SafeAny, record: BookingData) => (
        <Space size="middle" style={{ cursor: 'pointer' }} onClick={() => openCustomerDrawer(record)}>
          <Avatar
            src={record.avatar || undefined}
            style={{
              backgroundColor: record.avatarColor || '#D4A84B',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
            size="small"
          >
            {record.customer.trim().split(' ').pop()?.substring(0, 2).toUpperCase()}
          </Avatar>
          <strong className="hover:underline">{record.customer}</strong>
        </Space>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (t: string, record: SafeAny) =>
        t ? (
          <span
            className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
            onClick={() => makeCall(t, record.customer, record.customerId, record.avatar || undefined)}
            style={{ color: token.colorText, fontWeight: '600' }}
          >
            <PhoneOutlined style={{ color: '#D4A84B' }} />
            <span>{t}</span>
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (b: string) => {
        const branchName = b || 'Đề Thám';
        const branchKey = branchName === 'Đề Thám' ? 'detham' : branchName === 'PXL' ? 'pxl' : 'estella';
        return (
          <Tag
            color={getStoreColor(branchName)}
            className="cursor-pointer hover:opacity-80 font-bold transition-opacity"
            onClick={() => setBookingBranch(branchKey)}
            title={`Lọc danh sách theo chi nhánh: ${branchName}`}
          >
            {branchName}
          </Tag>
        );
      },
    },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      key: 'group',
      render: (g: 'combo_live' | 'combo_dead' | 'single') => {
        if (g === 'combo_live')
          return (
            <Tag color="gold" style={{ fontWeight: 'bold' }}>
              combo live
            </Tag>
          );
        if (g === 'combo_dead') return <Tag color="error">combo dead</Tag>;
        return <Tag color="blue">single</Tag>;
      },
    },
    {
      title: 'Promo',
      dataIndex: 'promo',
      key: 'promo',
      render: (p: string | null) =>
        p ? (
          <Tag color="pink" style={{ fontSize: '10px' }}>
            {p}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Ngày & Giờ đặt lịch',
      dataIndex: 'bookingDateTime',
      key: 'bookingDateTime',
      render: (t: string) => <strong style={{ color: '#D4A84B' }}>{t}</strong>,
    },
    {
      title: 'Requested CV',
      dataIndex: 'requestedCv',
      key: 'requestedCv',
      render: (cv: string) => <Tag color={cv === 'Chưa phân công' ? 'default' : 'blue'}>{cv}</Tag>,
    },
    {
      title: 'Booking Notes',
      dataIndex: 'bookingNote',
      key: 'bookingNote',
      render: (note: string) =>
        note ? (
          <Tooltip
            title={<div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{note}</div>}
            styles={{ root: { maxWidth: '400px' } }}
          >
            <div
              style={{
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {note}
            </div>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      align: 'right' as const,
      render: (status: SafeAny) => renderComingStatus(status),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: SafeAny, record: BookingData) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined style={{ fontSize: '16px', color: '#D4A84B' }} />}
          onClick={() => openCustomerDrawer(record)}
          style={{ padding: 0 }}
        />
      ),
    },
  ];

  const {
    columns: bookingConfigColumns,
    rawConfig: bookingRawConfig,
    configVisible: bookingConfigVisible,
    openConfig: openBookingConfig,
    closeConfig: closeBookingConfig,
    saveConfig: saveBookingConfig,
    resetConfig: resetBookingConfig,
  } = useTableConfig('today_booking_table', bookingColumns);

  const bookerOptions = React.useMemo(() => {
    const set = new Set<string>();
    (allBookings || []).forEach((b) => {
      if (b.booker) set.add(b.booker);
    });
    return Array.from(set).map((name) => ({ value: name, label: name }));
  }, [allBookings]);

  const groupedBookerOptions = React.useMemo(() => {
    return [
      { value: 'all', label: 'Tất cả Đội Nhóm & Booker' },
      {
        label: '🛡️ Lọc Theo Đội Nhóm',
        options: [
          { value: 'team:telesales', label: '🛡️ Đội Telesales' },
          { value: 'team:control_cs', label: '🎧 Control / CS' },
          { value: 'team:other', label: '🌐 Khác (Web/Direct)' },
        ],
      },
      {
        label: '👤 Lọc Theo Cá Nhân Booker',
        options: bookerOptions,
      },
    ];
  }, [bookerOptions]);

  return (
    <SectionCard
      title={
        <div className="flex justify-between items-center flex-wrap gap-3">
          <span className="text-sm font-bold" style={{ color: token.colorPrimary }}>
            Danh sách khách Booker đặt lịch hôm nay ({filteredBookings.length})
          </span>
          <Space wrap>
            {setSelectedBooker && (
              <Select
                showSearch
                filterOption={vietnameseSearchFilter}
                value={selectedBooker || 'all'}
                onChange={(val) => setSelectedBooker(val === 'all' ? null : val)}
                options={groupedBookerOptions}
                style={{ width: '200px' }}
                placeholder="Lọc Đội / Booker"
              />
            )}
            <Select
              value={bookingBranch}
              onChange={(val) => {
                setBookingBranch(val);
                localStorage.setItem('today_booking_branch', val);
              }}
              options={[
                { value: 'all', label: `Tất cả chi nhánh (${bookingBranchCounts.total})` },
                { value: 'detham', label: `Đề Thám (${bookingBranchCounts.dt})` },
                { value: 'estella', label: `Estella Place (${bookingBranchCounts.ep})` },
              ]}

              style={{ width: '200px' }}
            />
            <Button icon={<SettingOutlined />} onClick={openBookingConfig}>
              Cấu hình cột
            </Button>
          </Space>
        </div>
      }
      bodyPadding="12px"
    >
      <Tabs
        activeKey={bookingFilter}
        onChange={(key) => setBookingFilter(key as SafeAny)}
        items={[
          { key: 'all', label: `All Booking (${tabCounts.all})` },
          { key: 'combo', label: `Combo Live (${tabCounts.combo})` },
          { key: 'oc', label: `by Telesales (${tabCounts.oc})` },
          { key: 'other', label: `by Other (${tabCounts.other})` },
        ]}
        size="small"
        style={{ marginBottom: '12px' }}
      />

      {(bookingBranch !== 'all' || selectedBooker) && (
        <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Bộ lọc đang mở:</span>
          {bookingBranch !== 'all' && (
            <Tag color="cyan" closable onClose={() => setBookingBranch('all')} className="font-semibold text-xs py-0.5">
              Chi nhánh: {bookingBranch === 'detham' ? 'Đề Thám' : bookingBranch === 'pxl' ? 'PXL' : 'Estella'}
            </Tag>
          )}
          {selectedBooker && (
            <Tag
              color="gold"
              closable
              onClose={() => setSelectedBooker && setSelectedBooker(null)}
              className="font-semibold text-xs py-0.5"
            >
              Booker: {selectedBooker}
            </Tag>
          )}
          <Button
            type="link"
            size="small"
            danger
            className="text-xs p-0 h-auto font-medium"
            onClick={() => {
              setBookingBranch('all');
              if (setSelectedBooker) setSelectedBooker(null);
            }}
          >
            Xoá bộ lọc
          </Button>
        </div>
      )}

      <Table
        dataSource={filteredBookings}
        columns={bookingConfigColumns}
        rowKey={(record) => record.key || record.code || `${record.customer}-${record.createdTime}`}
        size="small"
        bordered
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: filteredBookings.length,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
          showTotal: (totalCount) => `Tổng số ${totalCount} khách`,
        }}
        className="antd-custom-table"
      />

      <TableConfigDrawer
        visible={bookingConfigVisible}
        onClose={closeBookingConfig}
        columns={bookingRawConfig}
        onSave={saveBookingConfig}
        onReset={resetBookingConfig}
      />
    </SectionCard>
  );
});

export default TodayBookingsTable;
