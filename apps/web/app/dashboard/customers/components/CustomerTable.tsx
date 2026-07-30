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
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  currentUser: SafeAny;
  openDetailModal: (customer: Customer) => void;
  sentinelRef?: SafeAny;
}

const CustomerTable = React.memo(
  React.forwardRef<{ openConfig: () => void }, CustomerTableProps>(function CustomerTable(
    {
      customers,
      loading,
      total,
      currentPage,
      setCurrentPage,
      pageSize,
      setPageSize,
      selectedRowKeys,
      setSelectedRowKeys,
      currentUser,
      openDetailModal,
    },
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
          title: 'STT',
          key: 'stt',
          width: 60,
          align: 'center' as const,
          render: (_: any, __: any, index: number) => (currentPage - 1) * pageSize + index + 1,
        },
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
                className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text tabular-nums"
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
            return days !== null ? (
              `${days} ngày`
            ) : (
              <Text style={{ color: token.colorTextDescription }}>Chưa từng đến</Text>
            );
          },
        },
        {
          title: 'Chi tiêu',
          dataIndex: 'totalSpent',
          key: 'totalSpent',
          render: (spent: number) => <span className="tabular-nums">{formatVND(spent)}</span>,
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
          title: 'Đã phân bổ',
          key: 'allocatedDays',
          width: 120,
          render: (_: SafeAny, record: Customer) => {
            const assignedAt =
              record.assignedStaff?.assignedAt || record.assignedAt || record.lastAllocation?.assignedAt;

            if (!assignedAt) {
              return (
                <Text type="secondary" style={{ fontStyle: 'italic' }}>
                  Chưa từng phân bổ
                </Text>
              );
            }

            const assignedDate = dayjs(assignedAt);
            const today = dayjs();
            const diffDays = Math.max(0, today.diff(assignedDate, 'day'));
            const formattedDate = assignedDate.format('DD/MM/YYYY HH:mm');

            const isCurrentlyAssigned = !!record.assignedStaff;
            const staffName = record.assignedStaff?.displayName || record.lastAllocation?.staffName;

            const tooltipTitle = isCurrentlyAssigned
              ? `Đang phân bổ cho: ${staffName || 'Booker'} (từ ${formattedDate})`
              : `Lần cuối phân bổ: ${formattedDate}${staffName ? ` (Booker trước: ${staffName})` : ''}`;

            return (
              <Tooltip title={tooltipTitle}>
                <span
                  className="tabular-nums font-semibold"
                  style={{
                    color: isCurrentlyAssigned ? token.colorText : token.colorTextDescription,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {diffDays} ngày
                </span>
              </Tooltip>
            );
          },
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
          title: 'Trạng thái gọi',
          key: 'callStatus',
          width: 140,
          render: (_: SafeAny, record: Customer) => {
            const lastCall = record.lastCall;
            if (!lastCall) {
              return <Tag color="default">Chưa gọi</Tag>;
            }
            const res = lastCall.callResult;
            let color = 'blue';
            let label = res || 'Đã tương tác';
            if (res === 'NO_ANSWER' || res === 'BUSY' || res === 'FAILED') {
              color = 'error';
              label = res === 'BUSY' ? 'Máy bận' : 'Không nhấc máy';
            } else if (res === 'ANSWERED' || res === 'SUCCESS' || res === 'COMPLETED') {
              color = 'success';
              label = 'Đã nghe máy';
            } else if (res === 'CALLBACK') {
              color = 'warning';
              label = 'Hẹn gọi lại';
            }
            const callTime = lastCall.createdAt ? dayjs(lastCall.createdAt).format('HH:mm DD/MM') : '';
            return (
              <Tooltip title={lastCall.note ? `${label} (${callTime}): ${lastCall.note}` : `Gần nhất: ${callTime}`}>
                <Tag color={color}>{label}</Tag>
              </Tooltip>
            );
          },
        },
        {
          title: 'Thao tác',
          key: 'action',
          width: 110,
          render: (_: SafeAny, record: Customer) => (
            <Space size={4}>
              {record.phone && (
                <Tooltip title={`Gọi OmiCall cho ${record.name || 'khách hàng'}`}>
                  <Button
                    type="primary"
                    shape="circle"
                    size="small"
                    icon={<PhoneOutlined />}
                    style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
                    onClick={() => makeCall(record.phone, record.name || `KH #${record.id}`)}
                  />
                </Tooltip>
              )}
              <Tooltip title="Chi tiết khách hàng">
                <Button
                  type="text"
                  shape="circle"
                  icon={<EyeOutlined style={{ color: '#D4A84B' }} />}
                  onClick={() => openDetailModal(record)}
                />
              </Tooltip>
            </Space>
          ),
        },
      ],
      [themeMode, token, makeCall, openDetailModal, currentPage, pageSize]
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
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, size) => {
              setCurrentPage(page);
              if (size !== pageSize) {
                setPageSize(size);
                localStorage.setItem('mos_customers_pageSize', size.toString());
              }
              window.scrollTo({ top: 200, behavior: 'smooth' });
            },
            showTotal: (totalCount) => `Tổng số: ${totalCount} khách hàng`,
          }}
          scroll={{ x: 'max-content', y: 650 }}
          style={{
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: '8px',
            marginBottom: '16px',
          }}
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          className="antd-custom-table"
        />

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
