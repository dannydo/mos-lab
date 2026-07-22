'use client';

import React from 'react';
import { Space, Avatar, Typography, Tag, Tooltip, Button } from 'antd';
import { UserOutlined, PhoneOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Customer, CALL_RESULT_LABELS } from '@mos-lab/shared';

const { Text } = Typography;

interface LocaColumnsOptions {
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
  addingIds?: number[];
  sortField?: string;
}

export const getLocaColumns = ({
  themeMode,
  token,
  handleOpenDetailModal,
  formatVND,
  formatDuration,
  dailyPlanList,
  handleAddToPlan,
  makeCall,
  addingIds = [],
  sortField = 'daysSinceLastVisit_asc',
}: LocaColumnsOptions) => {
  return [
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
      title: 'Số Dư Combo',
      key: 'comboBalance',
      width: 140,
      render: (_: SafeAny, record: Customer) => {
        if (!record.comboBalance) return <Text type="secondary">Không có</Text>;
        const totalRemaining = (record.comboBalance.normalCount || 0) + (record.comboBalance.retainCount || 0);
        return (
          <div>
            <Tag color={totalRemaining === 1 ? 'red' : 'green'} style={{ fontWeight: 'bold' }}>
              Còn {totalRemaining} lần
            </Tag>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
              (Mới: {record.comboBalance.normalCount || 0} | Dặm: {record.comboBalance.retainCount || 0})
            </div>
          </div>
        );
      },
    },
    {
      title: 'Hạn Sử Dụng (HSD)',
      key: 'expiryDate',
      width: 140,
      render: (_: SafeAny, record: Customer) => {
        if (!record.comboBalance?.expiryDate) return <Text type="secondary">-</Text>;
        const expDate = dayjs(record.comboBalance.expiryDate);
        const daysLeft = expDate.diff(dayjs(), 'day');
        const isExpiringSoon = daysLeft <= 30;

        return (
          <div>
            <div style={{ fontWeight: '600', color: isExpiringSoon ? '#ff4d4f' : token.colorText }}>
              {expDate.format('DD/MM/YYYY')}
            </div>
            <div style={{ fontSize: '11px', color: isExpiringSoon ? '#ff4d4f' : '#888' }}>
              {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Đã hết hạn'}
            </div>
          </div>
        );
      },
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
      sorter: true,
      sortOrder:
        sortField === 'totalSpent_asc'
          ? ('ascend' as const)
          : sortField === 'totalSpent_desc'
            ? ('descend' as const)
            : null,
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
      width: 120,
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
          </Space>
        );
      },
    },
  ];
};

export const getNewLocaColumns = ({
  themeMode,
  token,
  handleOpenDetailModal,
  formatVND,
  dailyPlanList,
  handleAddToPlan,
  makeCall,
  addingIds = [],
  sortField = 'id_desc',
}: LocaColumnsOptions) => {
  return [
    {
      title: 'Mã KH',
      dataIndex: 'id',
      key: 'id',
      width: 85,
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
      title: 'Combo Mới & Doanh Thu',
      key: 'comboDetails',
      render: (_: SafeAny, record: Customer) => {
        const details = record.newComboDetails;
        if (!details) return <Text type="secondary">Không có thông tin</Text>;
        return (
          <div>
            <div style={{ fontWeight: '600', color: token.colorText }}>{details.comboName || 'Combo Mới Mua'}</div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#D4A84B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
              }}
            >
              {formatVND(details.comboPrice || 0)}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Booker (BK)',
      key: 'booker',
      render: (_: SafeAny, record: Customer) => {
        const booker = record.newComboDetails?.bookerName || record.assignedStaff?.displayName;
        return booker ? (
          <Tag color="cyan">{booker}</Tag>
        ) : (
          <span style={{ fontStyle: 'italic', color: '#888' }}>System</span>
        );
      },
    },
    {
      title: 'CC In / CC Out',
      key: 'ccInOut',
      render: (_: SafeAny, record: Customer) => {
        const details = record.newComboDetails;
        return (
          <div style={{ fontSize: '12px' }}>
            <div>
              <span style={{ opacity: 0.7 }}>In: </span>
              <Tag color="blue" style={{ margin: 0 }}>
                {details?.ccInName || 'Chưa nhận'}
              </Tag>
            </div>
            <div style={{ marginTop: '3px' }}>
              <span style={{ opacity: 0.7 }}>Out: </span>
              <Tag color="purple" style={{ margin: 0 }}>
                {details?.ccOutName || 'Chưa nhận'}
              </Tag>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Chuyên Viên (CV)',
      key: 'cv',
      render: (_: SafeAny, record: Customer) => {
        const cv = record.newComboDetails?.cvName;
        return cv && cv !== 'Chưa phân công' ? (
          <Tag color="gold">{cv}</Tag>
        ) : (
          <span style={{ fontStyle: 'italic', color: '#888' }}>Chưa phân công</span>
        );
      },
    },
    {
      title: 'Ngày Mua',
      key: 'purchaseDate',
      render: (_: SafeAny, record: Customer) => {
        const date = record.newComboDetails?.purchaseDate;
        return date ? (
          <span style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}>
            {dayjs(date).format('DD/MM/YYYY HH:mm')}
          </span>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
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
          </Space>
        );
      },
    },
  ];
};
