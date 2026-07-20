'use client';

import React from 'react';
import { Table, Avatar, Tag, Typography, Space, Tooltip, Button, Spin, theme } from 'antd';
import { UserOutlined, PhoneOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { Customer, BucketType } from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { ResizableHeaderCell } from '../../../../components/ResizableHeaderCell';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import { useTableConfig } from '../../../../hooks/useTableConfig';

const { Text } = Typography;

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  total: number;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  currentUser: SafeAny;
  openDetailModal: (customer: Customer) => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

const CustomerTable = React.memo(
  React.forwardRef<{ openConfig: () => void }, CustomerTableProps>(function CustomerTable(
    { customers, loading, selectedRowKeys, setSelectedRowKeys, currentUser, openDetailModal, sentinelRef },
    ref
  ) {
    const { themeMode } = useTheme();
    const { token } = theme.useToken();
    const { makeCall } = useOmiCall();

    const getRowClassName = (record: Customer) => {
      // 1. check callback date ("có hẹn gọi lại -> màu hy vọng")
      const hasCallback = record.callbackDate
        ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
        : false;
      if (hasCallback) {
        return themeMode === 'dark' ? 'row-hope-dark' : 'row-hope-light';
      }

      // 2. check if they have a future booking ("đã booked -> sẽ đến, chuyển sang màu xanh")
      const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
      if (isBookingInFuture) {
        const state = record.lastBookingState;
        const isBooked = state === 'New' || state === 'Confirmed';
        if (isBooked) {
          return themeMode === 'dark' ? 'row-booked-future-dark' : 'row-booked-future-light';
        }
      }

      // 3. check positive daysSinceLastVisit but missed booking ("đã booked mà chưa tới (missed), chuyển sang màu đỏ lợt")
      const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
      if (isBookingInPast) {
        const state = record.lastBookingState;
        const isMissed =
          state &&
          state !== 'Completed' &&
          state !== 'ServiceCompleted' &&
          state !== 'CheckIn' &&
          state !== 'CheckOut' &&
          state !== 'ServiceStart';
        if (isMissed) {
          return themeMode === 'dark' ? 'row-missed-dark' : 'row-missed-light';
        }
      }

      return '';
    };

    const columns = React.useMemo(
      () => [
        {
          title: 'Mã KH',
          dataIndex: 'id',
          key: 'id',
          width: 100,
        },
        {
          title: 'Tên Khách Hàng',
          dataIndex: 'name',
          key: 'name',
          render: (text: string, record: Customer) => (
            <Space
              size="small"
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => openDetailModal(record)}
            >
              <Avatar
                size="small"
                src={record.avatar || undefined}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
                  color: '#D4A84B',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
                  flexShrink: 0,
                }}
              />
              <span className="hover:underline" style={{ fontWeight: '600', color: token.colorText }}>
                {text}
              </span>
            </Space>
          ),
        },
        {
          title: 'Số Điện Thoại',
          dataIndex: 'phone',
          key: 'phone',
          render: (phone: string, record: Customer) =>
            phone ? (
              <span
                className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
                onClick={() => makeCall(phone, record.name, record.id, record.avatar || undefined)}
                style={{ color: token.colorText, fontWeight: '600' }}
              >
                <PhoneOutlined style={{ color: '#D4A84B' }} />
                <span>{phone}</span>
              </span>
            ) : (
              <span style={{ color: token.colorTextDescription }}>-</span>
            ),
        },
        {
          title: 'Nhóm',
          dataIndex: 'bucket',
          key: 'bucket',
          render: (bucket: BucketType) => {
            if (bucket === 'COMBO_LIVE') return <Tag color="green">Live Combo</Tag>;
            if (bucket === 'COMBO_DEAD') return <Tag color="red">Dead Combo</Tag>;
            return <Tag color="warning">Single</Tag>;
          },
        },
        {
          title: 'Chưa tới tiệm (Ngày)',
          dataIndex: 'daysSinceLastVisit',
          key: 'daysSinceLastVisit',
          render: (days: number | null, record: Customer) => {
            // 1. check callback date ("có hẹn gọi lại")
            const hasCallback = record.callbackDate
              ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
              : false;
            if (hasCallback) {
              const callbackFormatted = dayjs(record.callbackDate).format('DD/MM/YYYY');
              return (
                <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#d4b106', fontWeight: 'bold' }}>
                  🕒 Hẹn gọi lại: {callbackFormatted}
                </span>
              );
            }

            // 2. check future booking ("đã booked -> sẽ đến")
            const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
            if (isBookingInFuture) {
              const state = record.lastBookingState;
              const isBooked = state === 'New' || state === 'Confirmed';
              if (isBooked) {
                const bookingFormatted = dayjs(record.lastBookingDate).format('DD/MM/YYYY');
                return (
                  <span style={{ color: themeMode === 'dark' ? '#73d13d' : '#389e0d', fontWeight: 'bold' }}>
                    📅 Booked: {bookingFormatted}
                  </span>
                );
              }
            }

            // 3. check missed booking ("đã booked mà chưa tới (missed)")
            const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
            if (isBookingInPast) {
              const state = record.lastBookingState;
              const isMissed =
                state &&
                state !== 'Completed' &&
                state !== 'ServiceCompleted' &&
                state !== 'CheckIn' &&
                state !== 'CheckOut' &&
                state !== 'ServiceStart';
              if (isMissed) {
                let missedDays = days;
                if (record.lastBookingDate) {
                  const bookingDate = new Date(record.lastBookingDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  bookingDate.setHours(0, 0, 0, 0);
                  const diffMs = today.getTime() - bookingDate.getTime();
                  missedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                }
                return (
                  <span style={{ color: themeMode === 'dark' ? '#ff7875' : '#cf1322', fontWeight: 'bold' }}>
                    ⚠️ Missed: {missedDays} ngày
                  </span>
                );
              }
            }

            // 4. normal daysSinceLastVisit ("số dương -> chưa ghé x days, bình thường")
            return days !== null ? `${days} ngày` : <Text style={{ color: '#888' }}>Chưa từng đến</Text>;
          },
        },
        {
          title: 'Chi tiêu',
          dataIndex: 'totalSpent',
          key: 'totalSpent',
          render: (spent: number) => formatVND(spent),
        },
        {
          title: 'Dùng Promo',
          dataIndex: 'totalPromotionsUsed',
          key: 'totalPromotionsUsed',
          render: (count: number) =>
            count > 0 ? <Tag color="blue">{count} lần</Tag> : <Text type="secondary">-</Text>,
        },
        {
          title: 'Giới thiệu bạn',
          dataIndex: 'totalReferrals',
          key: 'totalReferrals',
          render: (count: number) =>
            count > 0 ? <Tag color="purple">{count} người</Tag> : <Text type="secondary">-</Text>,
        },
        {
          title: 'Booker phụ trách',
          dataIndex: 'assignedStaff',
          key: 'assignedStaff',
          render: (staff: SafeAny) => {
            if (staff) {
              return <Tag color="cyan">{staff.displayName}</Tag>;
            }
            return (
              <Text type="secondary" style={{ fontStyle: 'italic' }}>
                Chưa phân bổ
              </Text>
            );
          },
        },
        {
          title: 'Thao tác',
          key: 'action',
          width: 80,
          render: (_: SafeAny, record: Customer) => (
            <Tooltip title="Chi tiết khách hàng">
              <Button
                type="text"
                shape="circle"
                icon={<EyeOutlined style={{ color: '#D4A84B' }} />}
                onClick={() => openDetailModal(record)}
              />
            </Tooltip>
          ),
        },
      ],
      [themeMode, token, makeCall, openDetailModal]
    );

    const staticColumns = React.useMemo(() => {
      return columns.filter((col) => col.key !== 'assignedStaff' || currentUser?.role === 'admin');
    }, [columns, currentUser]);

    const {
      loading: configLoading,
      columns: mergedColumns,
      rawConfig,
      configVisible,
      openConfig,
      closeConfig,
      saveConfig,
      resetConfig,
    } = useTableConfig('customer_table', staticColumns);

    React.useImperativeHandle(ref, () => ({
      openConfig,
    }));

    return (
      <>
        <Table
          dataSource={customers}
          columns={mergedColumns}
          rowKey="id"
          rowClassName={getRowClassName}
          size="small"
          loading={loading || configLoading}
          rowSelection={
            currentUser?.role === 'admin'
              ? {
                  selectedRowKeys,
                  onChange: (newSelectedRowKeys) => {
                    setSelectedRowKeys(newSelectedRowKeys);
                  },
                  preserveSelectedRowKeys: true,
                }
              : undefined
          }
          pagination={false}
          style={{
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: '8px',
          }}
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          className="antd-custom-table"
        />

        <div
          ref={sentinelRef as SafeAny}
          style={{ height: '30px', margin: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          {loading && <Spin size="small" />}
        </div>

        <TableConfigDrawer
          visible={configVisible}
          onClose={closeConfig}
          columns={rawConfig}
          onSave={saveConfig}
          onReset={resetConfig}
        />
      </>
    );
  })
);

export default CustomerTable;
