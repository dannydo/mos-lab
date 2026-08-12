'use client';

import React from 'react';
import { Space, Avatar, Typography, Tag, Tooltip, Button } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Customer, CALL_RESULT_LABELS } from '@mos-lab/shared';

import { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface NycColumnsOptions {
  themeMode: 'light' | 'dark';
  token: SafeAny;
  handleOpenDetailModal: (record: Customer) => void;
  formatVND: (value: number) => string;
  formatDuration: (secs: number) => string;
  dailyPlanList: number[];
  handleAddToPlan: (id: number) => void;
  makeCall: (
    phone: string,
    name?: string,
    customerId?: number,
    avatar?: string,
    planId?: number
  ) => Promise<void> | void;
  handleOpenSmsModal?: (record: Customer) => void;
  addingIds?: number[];
  sortField?: string;
  currentPage?: number;
  pageSize?: number;
}

export const getNycColumns = ({
  themeMode,
  token,
  handleOpenDetailModal,
  formatVND,
  formatDuration,
  dailyPlanList,
  handleAddToPlan,
  makeCall,
  handleOpenSmsModal,
  addingIds = [],
  sortField = 'daysSinceLastVisit_asc',
  currentPage = 1,
  pageSize = 20,
}: NycColumnsOptions): ColumnsType<Customer> => {
  // Compute the time boundaries once per columns instance rather than once for
  // every rendered row in the table.
  const now = new Date();
  const todayStart = dayjs().startOf('day').toDate();

  return [
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
      title: 'Mã KH',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      sorter: true,
      sortOrder: sortField === 'id_asc' ? ('ascend' as const) : sortField === 'id_desc' ? ('descend' as const) : null,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder:
        sortField === 'name_asc' ? ('ascend' as const) : sortField === 'name_desc' ? ('descend' as const) : null,
      render: (text: string, record: Customer) => (
        <Space
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => handleOpenDetailModal(record)}
        >
          <Avatar
            src={record.avatar || undefined}
            icon={<UserOutlined />}
            style={{
              backgroundColor: 'var(--avatar-bg)',
              color: '#D4A84B',
              border: '1px solid var(--avatar-border)',
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{ fontWeight: '600', color: 'var(--client-name-color)' }}
              className="hover:underline transition-all"
            >
              {text}
            </div>
            {record.phone && (
              <div
                style={{ fontSize: '12px', color: '#D4A84B', fontWeight: '500' }}
                className="hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  makeCall(record.phone, record.name, record.id, record.avatar || undefined);
                }}
              >
                <PhoneOutlined style={{ fontSize: '10px' }} />
                <span>{record.phone}</span>
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
      sorter: true,
      sortOrder:
        sortField === 'daysSinceLastVisit_asc'
          ? ('ascend' as const)
          : sortField === 'daysSinceLastVisit_desc'
            ? ('descend' as const)
            : null,
      render: (days: number | null, record: Customer) => {
        const hasCallback = record.callbackDate ? new Date(record.callbackDate) >= todayStart : false;
        if (hasCallback) {
          const callbackFormatted = dayjs(record.callbackDate).format('DD/MM/YYYY');
          return (
            <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#855b00', fontWeight: 'bold' }}>
              🕒 Hẹn gọi lại: {callbackFormatted}
            </span>
          );
        }

        const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > now : false;
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

        const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < now : false;
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
              const today = new Date(todayStart);
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
          <Text style={{ color: 'var(--client-desc-color)' }}>Chưa từng đến</Text>
        );
      },
    },
    {
      title: 'Tổng Chi Tiêu',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      align: 'right',
      sorter: true,
      sortOrder:
        sortField === 'totalSpent_asc'
          ? ('ascend' as const)
          : sortField === 'totalSpent_desc'
            ? ('descend' as const)
            : null,
      render: (val: number) => <span className="tabular-nums">{formatVND(val)}</span>,
    },
    {
      title: 'Đã phân bổ',
      key: 'allocatedDays',
      width: 120,
      render: (_: SafeAny, record: Customer) => {
        const assignedAt = record.assignedStaff?.assignedAt || record.assignedAt || record.lastAllocation?.assignedAt;
        if (!assignedAt) {
          return <span style={{ fontStyle: 'italic', color: 'var(--client-desc-color)' }}>Chưa từng phân bổ</span>;
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
                opacity: isCurrentlyAssigned ? 1 : 0.7,
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
      render: (staff: SafeAny) =>
        staff ? (
          <Tag color="cyan">{staff.displayName}</Tag>
        ) : (
          <span style={{ fontStyle: 'italic', color: 'var(--client-desc-color)' }}>Chưa phân bổ</span>
        ),
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
        if (result === 'ANSWERED') color = 'success';
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
                onClick={() => !isPlanned && !isAdding && handleAddToPlan(record.id)}
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
  ];
};
