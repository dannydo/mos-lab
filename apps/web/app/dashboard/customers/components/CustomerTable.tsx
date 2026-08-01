'use client';

import React from 'react';
import { Table, Avatar, Tag, Typography, Space, Tooltip, Button, theme } from 'antd';
import { UserOutlined, PhoneOutlined, CheckCircleOutlined, PlusOutlined, MessageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { Customer, CALL_RESULT_LABELS } from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { ResizableHeaderCell } from '../../../../components/ResizableHeaderCell';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import { useTableConfig } from '../../../../hooks/useTableConfig';

const { Text } = Typography;

const formatDuration = (secs?: number | null) => {
  if (secs === undefined || secs === null) return '-';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

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
  dailyPlanList?: number[];
  addingIds?: number[];
  handleAddToPlan?: (customerId: number) => void;
  handleOpenSmsModal?: (customer: Customer) => void;
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
      dailyPlanList = [],
      addingIds = [],
      handleAddToPlan,
      handleOpenSmsModal,
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
          render: (_: SafeAny, __: Customer, index: number) => (
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
              {(currentPage - 1) * pageSize + index + 1}
            </span>
          ),
        },
        {
          title: 'Khách Hàng',
          dataIndex: 'name',
          key: 'name',
          sorter: (a: Customer, b: Customer) => (a.name || '').localeCompare(b.name || ''),
          render: (text: string, record: Customer) => (
            <Space
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => openDetailModal(record)}
            >
              <Avatar
                src={record.avatar || undefined}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
                  color: '#D4A84B',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontWeight: '600', color: token.colorText }} className="hover:underline transition-all">
                  {text}
                </div>
                {record.phone && (
                  <div
                    style={{ fontSize: '12px', color: '#D4A84B', fontWeight: '500' }}
                    className="hover:underline cursor-pointer flex items-center gap-1 mt-0.5 tabular-nums"
                    onClick={(e) => {
                      e.stopPropagation();
                      makeCall(record.phone, record.name, record.id, record.avatar || undefined);
                    }}
                  >
                    <PhoneOutlined style={{ fontSize: '10px' }} />
                    <span>{record.phone}</span>
                  </div>
                )}
                {record.dob && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: themeMode === 'dark' ? '#8c8c8c' : '#595959',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    className="tabular-nums"
                  >
                    <span>
                      🎂{' '}
                      {dayjs(record.dob).year() >= 2024
                        ? dayjs(record.dob).format('DD/MM')
                        : dayjs(record.dob).format('DD/MM/YYYY')}
                    </span>
                    {record.age !== undefined && record.age !== null && dayjs(record.dob).year() < 2024 && (
                      <span
                        style={{
                          background: themeMode === 'dark' ? '#262626' : '#e6f7ff',
                          color: themeMode === 'dark' ? '#1890ff' : '#096dd9',
                          padding: '0 4px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 500,
                        }}
                      >
                        {record.age} tuổi
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Space>
          ),
        },
        {
          title: 'Chưa tới tiệm (Ngày)',
          dataIndex: 'daysSinceLastVisit',
          key: 'daysSinceLastVisit',
          width: 180,
          sorter: (a: Customer, b: Customer) => (a.daysSinceLastVisit ?? 0) - (b.daysSinceLastVisit ?? 0),
          render: (days: number | null, record: Customer) => {
            const hasCallback = record.callbackDate
              ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
              : false;
            if (hasCallback) {
              const callbackFormatted = dayjs(record.callbackDate).format('DD/MM/YYYY');
              return (
                <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#855b00', fontWeight: 'bold' }}>
                  🕒 Hẹn gọi lại: {callbackFormatted}
                </span>
              );
            }

            const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
            if (isBookingInFuture) {
              const state = record.lastBookingState;
              const isBooked = state === 'New' || state === 'Confirmed';
              if (isBooked) {
                const bookingFormatted = dayjs(record.lastBookingDate).format('DD/MM/YYYY');
                return (
                  <span style={{ color: themeMode === 'dark' ? '#95de64' : '#237804', fontWeight: 'bold' }}>
                    📅 Booked: {bookingFormatted}
                  </span>
                );
              }
            }

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

            return days !== null ? (
              `${days} ngày`
            ) : (
              <Text style={{ color: token.colorTextDescription }}>Chưa từng đến</Text>
            );
          },
        },
        {
          title: 'Tổng Chi Tiêu',
          dataIndex: 'totalSpent',
          key: 'totalSpent',
          sorter: (a: Customer, b: Customer) => (a.totalSpent || 0) - (b.totalSpent || 0),
          render: (val: number) => <span className="tabular-nums">{formatVND(val)}</span>,
        },
        {
          title: 'Booker phụ trách',
          dataIndex: 'assignedStaff',
          key: 'assignedStaff',
          render: (staff: SafeAny) => {
            if (staff) {
              const isPending = staff.status === 'PENDING_ACCEPT' || staff.displayName?.includes('(Chờ xác nhận)');
              return <Tag color={isPending ? 'gold' : 'cyan'}>{staff.displayName}</Tag>;
            }
            return (
              <Text type="secondary" style={{ fontStyle: 'italic' }}>
                Chưa phân bổ
              </Text>
            );
          },
        },
        {
          title: 'Ngày gọi gần nhất',
          key: 'lastCallDate',
          render: (_: SafeAny, record: Customer) => {
            if (!record.lastCall?.createdAt) return '-';
            return dayjs(record.lastCall.createdAt).format('DD/MM/YYYY HH:mm');
          },
        },
        {
          title: 'Thời lượng',
          key: 'lastCallDuration',
          render: (_: SafeAny, record: Customer) => {
            if (record.lastCall?.durationSec === undefined || record.lastCall?.durationSec === null) return '-';
            return formatDuration(record.lastCall.durationSec);
          },
        },
        {
          title: 'Trạng thái cuộc gọi',
          key: 'lastCallResult',
          render: (_: SafeAny, record: Customer) => {
            if (!record.lastCall?.callResult) return '-';
            const result = record.lastCall.callResult;
            const label = CALL_RESULT_LABELS[result as keyof typeof CALL_RESULT_LABELS] || result;
            let color = 'default';
            if (result === 'ANSWERED' || result === 'SUCCESS' || result === 'COMPLETED') color = 'success';
            else if (result === 'NO_ANSWER') color = 'warning';
            else if (result === 'BUSY') color = 'orange';
            else if (result === 'FAILED' || result === 'WRONG_NUMBER') color = 'error';
            return <Tag color={color}>{label}</Tag>;
          },
        },
        {
          title: 'Ghi chú cuộc gọi',
          key: 'lastCallNote',
          render: (_: SafeAny, record: Customer) => {
            if (!record.lastCall?.note) return '-';
            const note = record.lastCall.note;
            const compactNote = note.length > 25 ? `${note.substring(0, 25)}...` : note;
            return (
              <Tooltip title={note}>
                <span style={{ cursor: 'pointer' }}>{compactNote}</span>
              </Tooltip>
            );
          },
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
          title: 'Thao tác',
          key: 'actions',
          width: 110,
          align: 'center' as const,
          render: (_: SafeAny, record: Customer) => {
            const isPlanned = dailyPlanList.includes(record.id);
            const isAdding = addingIds.includes(record.id);
            return (
              <Space size="small">
                <Tooltip title={isPlanned ? 'Đã lên lịch gọi' : 'Lên lịch gọi'}>
                  <Button
                    type={isPlanned ? 'dashed' : 'primary'}
                    ghost={!isPlanned}
                    size="small"
                    loading={isAdding}
                    icon={isPlanned ? <CheckCircleOutlined style={{ color: '#52C41A' }} /> : <PlusOutlined />}
                    onClick={() => !isPlanned && !isAdding && handleAddToPlan?.(record.id)}
                    style={
                      !isPlanned
                        ? {
                            borderColor: themeMode === 'dark' ? token.colorPrimary : '#87640a',
                            color: themeMode === 'dark' ? token.colorPrimary : '#87640a',
                          }
                        : {}
                    }
                    disabled={isPlanned || isAdding}
                  />
                </Tooltip>
                <Tooltip title="Gửi SMS">
                  <Button
                    type="default"
                    size="small"
                    icon={<MessageOutlined style={{ color: '#D4A84B' }} />}
                    onClick={() => handleOpenSmsModal?.(record)}
                    style={{
                      borderColor: '#D4A84B',
                      color: '#D4A84B',
                    }}
                  />
                </Tooltip>
              </Space>
            );
          },
        },
      ],
      [
        themeMode,
        token,
        makeCall,
        openDetailModal,
        currentPage,
        pageSize,
        dailyPlanList,
        addingIds,
        handleAddToPlan,
        handleOpenSmsModal,
      ]
    );

    const isManagerOrAdmin =
      currentUser?.role === 'admin' ||
      currentUser?.role === 'manager' ||
      currentUser?.role?.toLowerCase() === 'admin' ||
      currentUser?.role?.toLowerCase() === 'manager';

    const staticColumns = React.useMemo(() => {
      return columns.filter((col) => col.key !== 'assignedStaff' || isManagerOrAdmin);
    }, [columns, isManagerOrAdmin]);

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
            isManagerOrAdmin
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
