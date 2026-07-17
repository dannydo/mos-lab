'use client';

import React from 'react';
import { Card, Tabs, Select, Button, Table, Space, Avatar, Tag, Tooltip, Typography, theme } from 'antd';
import { SettingOutlined, PhoneOutlined, EyeOutlined } from '@ant-design/icons';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import { ResizableHeaderCell } from '../../../../components/ResizableHeaderCell';
import { BookingData } from '../hooks/useTodayData';

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
  openCustomerDrawer: (record: SafeAny) => void;
  bookingBranchCounts: { dt: number; pxl: number; ep: number; total: number };
}

const TodayBookingsTable = React.memo(function TodayBookingsTable({
  filteredBookings,
  bookingFilter,
  setBookingFilter,
  bookingBranch,
  setBookingBranch,
  openCustomerDrawer,
  bookingBranchCounts,
}: TodayBookingsTableProps) {
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

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
      render: (b: string) => <span style={{ fontWeight: 500 }}>{b}</span>,
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
      render: (b: string) => (
        <Tag color={getStoreColor(b || 'Đề Thám')} style={{ fontWeight: 'bold' }}>
          {b || 'Đề Thám'}
        </Tag>
      ),
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
    loading: bookingConfigLoading,
    columns: bookingConfigColumns,
    rawConfig: bookingRawConfig,
    configVisible: bookingConfigVisible,
    openConfig: openBookingConfig,
    closeConfig: closeBookingConfig,
    saveConfig: saveBookingConfig,
    resetConfig: resetBookingConfig,
  } = useTableConfig('today_booking_table', bookingColumns);

  return (
    <Card
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '15px', color: token.colorPrimary, fontWeight: 'bold' }}>
            Danh sách khách Booker đặt lịch hôm nay ({filteredBookings.length})
          </span>
          <Space>
            <Select
              value={bookingBranch}
              onChange={(val) => {
                setBookingBranch(val);
                localStorage.setItem('today_booking_branch', val);
              }}
              options={[
                { value: 'all', label: `Tất cả chi nhánh (${bookingBranchCounts.total})` },
                { value: 'detham', label: `Đề Thám (${bookingBranchCounts.dt})` },
                { value: 'pxl', label: `Phan Xích Long (${bookingBranchCounts.pxl})` },
                { value: 'estella', label: `Estella (${bookingBranchCounts.ep})` },
              ]}
              style={{ width: '220px' }}
            />
            <Button icon={<SettingOutlined />} onClick={openBookingConfig}>
              Cấu hình cột
            </Button>
          </Space>
        </div>
      }
      styles={{ body: { padding: '12px' } }}
      style={{
        background: token.colorBgContainer,
        borderColor: token.colorBorderSecondary,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
    >
      <Tabs
        activeKey={bookingFilter}
        onChange={(key) => {
          setBookingFilter(key as SafeAny);
          localStorage.setItem('today_booking_filter', key);
        }}
        items={[
          { key: 'all', label: 'Tất cả booking' },
          { key: 'combo', label: 'Booking gói Combo' },
          { key: 'oc', label: 'Booking Telesales' },
          { key: 'other', label: 'Lẻ / Khác' },
        ]}
        style={{ marginBottom: '12px' }}
      />

      <Table
        dataSource={filteredBookings}
        columns={bookingConfigColumns}
        loading={bookingConfigLoading}
        rowKey="key"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
            localStorage.setItem('today_bookings_page_size', size.toString());
          },
          showTotal: (total) => `Tổng số: ${total} khách`,
        }}
        size="small"
        components={{
          header: {
            cell: ResizableHeaderCell,
          },
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
    </Card>
  );
});

export default TodayBookingsTable;
