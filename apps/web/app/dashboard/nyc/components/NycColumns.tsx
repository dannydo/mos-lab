'use client';

import React from 'react';
import { Space, Avatar, Typography, Tag, Tooltip, Button } from 'antd';
import { UserOutlined, PhoneOutlined, EyeOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Customer, CALL_RESULT_LABELS } from '@mos-lab/shared';

const { Text } = Typography;

interface NycColumnsOptions {
  themeMode: 'light' | 'dark';
  token: SafeAny;
  handleOpenDetailModal: (record: Customer) => void;
  formatVND: (value: number) => string;
  formatDuration: (secs: number) => string;
  dailyPlanList: number[];
  handleAddToPlan: (id: number) => void;
  handleOpenCallModal: (record: Customer) => void;
  addingIds?: number[];
}

export const getNycColumns = ({
  themeMode,
  token,
  handleOpenDetailModal,
  formatVND,
  formatDuration,
  dailyPlanList,
  handleAddToPlan,
  handleOpenCallModal,
  addingIds = [],
}: NycColumnsOptions) => {
  return [
    {
      title: 'Mã KH',
      dataIndex: 'id',
      key: 'id',
      width: 90,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'name',
      key: 'name',
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
            <div style={{ fontSize: '12px', color: 'var(--client-phone-color)' }}>{record.phone}</div>
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
          <Text style={{ color: 'var(--client-desc-color)' }}>Chưa từng đến</Text>
        );
      },
    },
    {
      title: 'Tổng Chi Tiêu',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      render: (val: number) => formatVND(val),
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
      width: 210,
      render: (_: SafeAny, record: Customer) => {
        const isPlanned = dailyPlanList.includes(record.id);
        const isAdding = addingIds.includes(record.id);
        return (
          <Space size="small">
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
            >
              {isPlanned ? 'Đã lên lịch' : 'Lên lịch gọi'}
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<PhoneOutlined />}
              onClick={() => handleOpenCallModal(record)}
              style={{ background: '#52C41A', borderColor: '#52C41A', color: '#fff' }}
            >
              Gọi
            </Button>
            <Tooltip title="Chi tiết khách hàng">
              <Button
                type="text"
                shape="circle"
                icon={<EyeOutlined style={{ color: themeMode === 'dark' ? '#D4A84B' : '#87640a' }} />}
                onClick={() => handleOpenDetailModal(record)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];
};
