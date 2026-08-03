'use client';

import React from 'react';
import { Space, Avatar, Typography, Tag, Tooltip, Button, Popconfirm } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  CalendarOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Appointment } from '@mos-lab/shared';
import CalendarPlusIcon from '../../../../components/icons/CalendarPlusIcon';
import CalendarRescheduleIcon from '../../../../components/icons/CalendarRescheduleIcon';

const { Text, Paragraph } = Typography;

interface ColumnsOptions {
  themeMode: 'light' | 'dark';
  token: SafeAny;
  formatVND: (value: number) => string;
  openDetailModal: (customerId: number) => void;
  makeCall: (phone: string, name: string, id: number, avatar?: string) => void;
  setSelectedBookingForReschedule?: (booking: SafeAny) => void;
  setRescheduleModalVisible?: (visible: boolean) => void;
  handleCancelBooking?: (id: number) => void;
  setBookingInitialCustomer?: (customer: SafeAny) => void;
  setBookingWizardVisible?: (visible: boolean) => void;
  onOpenMissedReasonModal?: (record: Appointment) => void;
}

export const getPendingColumns = ({
  themeMode,
  token,
  formatVND,
  openDetailModal,
  makeCall,
  setSelectedBookingForReschedule,
  setRescheduleModalVisible,
  handleCancelBooking,
}: ColumnsOptions) => {
  return [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <span style={{ fontWeight: 600, color: token.colorTextDescription, fontVariantNumeric: 'tabular-nums' }}>
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customerName',
      render: (record: Appointment) => (
        <Space
          size="middle"
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => openDetailModal(record.customerId)}
        >
          <Avatar
            src={record.customerAvatar || undefined}
            icon={<UserOutlined />}
            style={{
              backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
              color: '#D4A84B',
              border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: '600', color: token.colorText }} className="hover:underline">
              {record.customerName}
            </div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>ID: {record.customerId}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Số Điện Thoại',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      render: (phone: string, record: Appointment) =>
        phone ? (
          <span
            className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
            onClick={() => makeCall(phone, record.customerName, record.customerId, record.customerAvatar || undefined)}
            style={{ color: token.colorText, fontWeight: '600' }}
          >
            <PhoneOutlined style={{ color: '#D4A84B' }} />
            <span>{phone}</span>
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Thời Gian Hẹn',
      key: 'appointmentTime',
      sorter: (a: Appointment, b: Appointment) => {
        const timeA = a.bookingDateStart ? new Date(a.bookingDateStart).getTime() : 0;
        const timeB = b.bookingDateStart ? new Date(b.bookingDateStart).getTime() : 0;
        return timeA - timeB;
      },
      render: (record: Appointment) => {
        if (!record.bookingDateStart) return <Text type="secondary">-</Text>;
        const start = dayjs(record.bookingDateStart);
        return (
          <Space direction="vertical" size={1}>
            <span style={{ fontWeight: '600', color: token.colorText }}>{start.format('HH:mm')}</span>
            <span style={{ fontSize: '12px', color: token.colorTextDescription }}>{start.format('DD/MM/YYYY')}</span>
          </Space>
        );
      },
    },
    {
      title: 'Giá trị ước tính',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      sorter: (a: Appointment, b: Appointment) => a.totalPrice - b.totalPrice,
      render: (price: number) => (
        <span style={{ fontWeight: '500', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}>
          {formatVND(price)}
        </span>
      ),
    },
    {
      title: 'Kênh đặt lịch',
      dataIndex: 'bookingChannel',
      key: 'bookingChannel',
      render: (channel: string) => (
        <Tag color="orange" style={{ textTransform: 'capitalize' }}>
          {channel?.toLowerCase()}
        </Tag>
      ),
    },
    {
      title: 'Booker / Phân bổ',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (name: string | null | undefined, record: Appointment) => {
        const booker = name || record.bookerName;
        if (!booker) {
          return (
            <Text type="secondary" style={{ fontStyle: 'italic' }}>
              -
            </Text>
          );
        }
        return (
          <Tag color="cyan" style={{ margin: 0, fontWeight: 500 }}>
            {booker}
          </Tag>
        );
      },
    },
    {
      title: 'Khuyến mãi',
      key: 'promotion',
      render: (record: Appointment) => {
        if (!record.promotionName) {
          return (
            <Text type="secondary" style={{ fontStyle: 'italic' }}>
              -
            </Text>
          );
        }
        const pct = record.promotionDiscountPercent || 0;
        const amt = record.promotionDiscountAmount || 0;
        return (
          <Space direction="vertical" size={2}>
            <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>
              {record.promotionName}
            </Tag>
            {pct > 0 ? (
              <span
                style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}
              >
                Giảm {pct}%
              </span>
            ) : amt > 0 ? (
              <span
                style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}
              >
                Giảm {formatVND(amt)}
              </span>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: 'Ghi chú đặt lịch',
      dataIndex: 'bookingNote',
      key: 'bookingNote',
      render: (note: string | null) =>
        note ? (
          <Tooltip
            title={<div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{note}</div>}
            styles={{ root: { maxWidth: '400px' } }}
          >
            <Paragraph
              ellipsis={{ rows: 2 }}
              title=""
              style={{
                color: token.colorText,
                margin: 0,
                maxWidth: '100%',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              }}
            >
              {note}
            </Paragraph>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontStyle: 'italic' }}>
            Không có
          </Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'orderState',
      key: 'orderState',
      render: (state: string, record: Appointment) => {
        const isPast = record.bookingDateStart ? dayjs(record.bookingDateStart).isBefore(dayjs()) : false;
        const isCompleted = state === 'Completed';
        const isInService = ['CheckIn', 'ServiceCleaned', 'CheckOut'].includes(state);

        let color = 'default';
        if (isCompleted) {
          color = 'success';
        } else if (isInService) {
          color = 'processing';
        } else if (isPast) {
          color = 'error';
        } else {
          const isToday = record.bookingDateStart ? dayjs(record.bookingDateStart).isSame(dayjs(), 'day') : false;
          color = isToday ? 'warning' : 'cyan';
        }

        return <Tag color={color}>{state}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      render: (record: Appointment) => (
        <Space size="middle">
          <Tooltip title="Chi tiết khách hàng">
            <Button
              type="text"
              shape="circle"
              icon={<EyeOutlined style={{ fontSize: '16px' }} />}
              onClick={() => openDetailModal(record.customerId)}
              style={{ color: '#D4A84B' }}
            />
          </Tooltip>
          <Button
            type="primary"
            size="small"
            icon={<CalendarRescheduleIcon fontSize={15} />}
            style={{
              backgroundColor: '#D4A84B',
              borderColor: '#D4A84B',
              color: '#ffffff',
              fontWeight: 'bold',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={() => {
              const bookingObj = {
                id: record.id,
                bookingDate: record.bookingDateStart ? dayjs(record.bookingDateStart).format('YYYY-MM-DD') : '',
                bookingTime: record.bookingDateStart ? dayjs(record.bookingDateStart).format('HH:mm') : '',
                branchName:
                  record.branchName ||
                  (record.storeId === 16 ? 'Estella Place' : record.storeId === 6 ? 'De Tham' : 'Phan Xích Long'),
                technicianName: record.technicianName,
                technicianId: record.technicianId,
                bookingNote: record.bookingNote,
                customerName: record.customerName,
                customerPhone: record.customerPhone,
                customerId: record.customerId,
              };
              setSelectedBookingForReschedule?.(bookingObj);
              setRescheduleModalVisible?.(true);
            }}
          >
            Đổi lịch
          </Button>
          <Tooltip title="Hủy lịch hẹn">
            <Popconfirm
              title="Xác nhận hủy lịch"
              description="Anh/chị có chắc chắn muốn hủy lịch hẹn này không?"
              okText="Có, Hủy lịch"
              cancelText="Không"
              onConfirm={() => handleCancelBooking?.(record.id)}
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                shape="circle"
                danger
                icon={<CloseCircleOutlined style={{ fontSize: '16px' }} />}
                aria-label="Hủy lịch hẹn"
                title="Hủy lịch hẹn"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];
};

export const getCompletedColumns = ({
  themeMode,
  token,
  formatVND,
  openDetailModal,
}: Omit<
  ColumnsOptions,
  'makeCall' | 'setSelectedBookingForReschedule' | 'setRescheduleModalVisible' | 'handleCancelBooking'
>) => {
  return [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <span style={{ fontWeight: 600, color: token.colorTextDescription, fontVariantNumeric: 'tabular-nums' }}>
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customerName',
      render: (record: Appointment) => (
        <Space
          size="middle"
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => openDetailModal(record.customerId)}
        >
          <Avatar
            src={record.customerAvatar || undefined}
            icon={<UserOutlined />}
            style={{
              backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
              color: '#D4A84B',
              border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: '600', color: token.colorText }} className="hover:underline">
              {record.customerName}
            </div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>ID: {record.customerId}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Kênh đặt',
      dataIndex: 'bookingChannel',
      key: 'bookingChannel',
      render: (channel: string) => (
        <Tag color="orange" style={{ textTransform: 'capitalize' }}>
          {channel?.toLowerCase()}
        </Tag>
      ),
    },
    {
      title: 'Booker / Phân bổ',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (name: string | null | undefined, record: Appointment) => {
        const booker = name || record.bookerName;
        if (!booker) {
          return (
            <Text type="secondary" style={{ fontStyle: 'italic' }}>
              -
            </Text>
          );
        }
        return (
          <Tag color="cyan" style={{ margin: 0, fontWeight: 500 }}>
            {booker}
          </Tag>
        );
      },
    },
    {
      title: 'Ngày hẹn',
      key: 'appointmentTime',
      sorter: (a: Appointment, b: Appointment) => {
        const timeA = a.bookingDateStart ? new Date(a.bookingDateStart).getTime() : 0;
        const timeB = b.bookingDateStart ? new Date(b.bookingDateStart).getTime() : 0;
        return timeA - timeB;
      },
      render: (record: Appointment) => {
        if (!record.bookingDateStart) return <Text type="secondary">-</Text>;
        const start = dayjs(record.bookingDateStart);
        return (
          <Space direction="vertical" size={1}>
            <span style={{ fontWeight: '600', color: token.colorText }}>{start.format('HH:mm')}</span>
            <span style={{ fontSize: '12px', color: token.colorTextDescription }}>{start.format('DD/MM/YYYY')}</span>
          </Space>
        );
      },
    },
    {
      title: 'Dịch vụ chính',
      key: 'serviceName',
      render: (record: Appointment) => (
        <div style={{ color: token.colorText }}>
          <div style={{ fontWeight: '600' }}>{record.serviceName}</div>
          <div style={{ fontSize: '12px', color: token.colorTextDescription, fontVariantNumeric: 'tabular-nums' }}>
            Giá: {formatVND(record.servicePrice || 0)} | Giảm: {record.discountPercent || 0}%
          </div>
        </div>
      ),
    },
    {
      title: 'Khuyến mãi',
      key: 'promotion',
      render: (record: Appointment) => {
        if (!record.promotionName) {
          return (
            <Text type="secondary" style={{ fontStyle: 'italic' }}>
              -
            </Text>
          );
        }
        const pct = record.promotionDiscountPercent || 0;
        const amt = record.promotionDiscountAmount || 0;
        return (
          <Space direction="vertical" size={2}>
            <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>
              {record.promotionName}
            </Tag>
            {pct > 0 ? (
              <span
                style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}
              >
                Giảm {pct}%
              </span>
            ) : amt > 0 ? (
              <span
                style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}
              >
                Giảm {formatVND(amt)}
              </span>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: 'Doanh thu Net',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      sorter: (a: Appointment, b: Appointment) => (a.netRevenue || 0) - (b.netRevenue || 0),
      render: (val: number) => (
        <span style={{ fontWeight: '500', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}>
          {val > 0 ? formatVND(val) : '-'}
        </span>
      ),
    },
    {
      title: 'Tiền tips',
      dataIndex: 'tipAmount',
      key: 'tipAmount',
      sorter: (a: Appointment, b: Appointment) => (a.tipAmount || 0) - (b.tipAmount || 0),
      render: (val: number) => (
        <span style={{ color: token.colorText, fontVariantNumeric: 'tabular-nums' }}>
          {val > 0 ? formatVND(val) : '-'}
        </span>
      ),
    },
    {
      title: 'Hoa hồng OC',
      dataIndex: 'bookingBonus',
      key: 'bookingBonus',
      sorter: (a: Appointment, b: Appointment) => (a.bookingBonus || 0) - (b.bookingBonus || 0),
      render: (val: number) =>
        val > 0 ? (
          <span style={{ color: '#52C41A', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
            +{formatVND(val)}
          </span>
        ) : (
          <span style={{ color: token.colorTextDescription }}>-</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'orderState',
      key: 'orderState',
      render: (state: string, record: Appointment) => {
        const isPast = record.bookingDateStart ? dayjs(record.bookingDateStart).isBefore(dayjs()) : false;
        const isCompleted = state === 'Completed';
        const isInService = ['CheckIn', 'ServiceCleaned', 'CheckOut'].includes(state);

        let color = 'default';
        if (isCompleted) {
          color = 'success';
        } else if (isInService) {
          color = 'processing';
        } else if (isPast) {
          color = 'error';
        } else {
          const isToday = record.bookingDateStart ? dayjs(record.bookingDateStart).isSame(dayjs(), 'day') : false;
          color = isToday ? 'warning' : 'cyan';
        }

        return <Tag color={color}>{state}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      render: (record: Appointment) => (
        <Tooltip title="Chi tiết khách hàng">
          <Button
            type="text"
            shape="circle"
            icon={<EyeOutlined style={{ fontSize: '16px' }} />}
            onClick={() => openDetailModal(record.customerId)}
            style={{ color: '#D4A84B' }}
          />
        </Tooltip>
      ),
    },
  ];
};

export const getMissedColumns = ({
  themeMode,
  token,
  formatVND,
  openDetailModal,
  makeCall,
  setBookingInitialCustomer,
  setBookingWizardVisible,
  onOpenMissedReasonModal,
}: ColumnsOptions) => {
  const REASON_MAP: Record<string, { label: string; color: string }> = {
    KH_DOI_HUY_LICH: { label: 'Khách đổi/hủy', color: 'orange' },
    GOI_KHONG_NGHE: { label: 'Gọi không nghe', color: 'gold' },
    TIEM_QUATAI: { label: 'Tiệm quá tải', color: 'red' },
    BOOKER_LATHUONG: { label: 'Booker nhầm', color: 'purple' },
    KTV_BAN_LOI: { label: 'CV bận/trễ', color: 'volcano' },
    KH_QUEN_LICH: { label: 'Khách quên lịch', color: 'magenta' },
    LY_DO_KHAC: { label: 'Lý do khác', color: 'cyan' },
  };

  const RESP_MAP: Record<string, { label: string; color: string }> = {
    CUSTOMER: { label: 'Khách hàng', color: 'default' },
    BOOKER: { label: 'Booker', color: 'blue' },
    CC: { label: 'Tư vấn viên (CC)', color: 'geekblue' },
    TECHNICIAN: { label: 'Chuyên viên (CV)', color: 'purple' },
    STORE_SYSTEM: { label: 'Hệ thống', color: 'red' },
  };

  const FOLLOWUP_MAP: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Chưa xử lý', color: 'red' },
    CONTACTED: { label: 'Đã gọi chăm sóc', color: 'blue' },
    RESCHEDULED: { label: 'Đã hẹn lại', color: 'green' },
    UNREACHABLE: { label: 'Không liên hệ được', color: 'orange' },
    CANCELLED: { label: 'Khách hủy hẳn', color: 'default' },
  };

  return [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <span style={{ fontWeight: 600, color: token.colorTextDescription, fontVariantNumeric: 'tabular-nums' }}>
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customerName',
      render: (record: Appointment) => (
        <Space
          size="middle"
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => openDetailModal(record.customerId)}
        >
          <Avatar
            src={record.customerAvatar || undefined}
            icon={<UserOutlined />}
            style={{
              backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
              color: '#FF4D4F',
              border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: '600', color: token.colorText }} className="hover:underline">
              {record.customerName}
            </div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>ID: {record.customerId}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Số Điện Thoại',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      render: (phone: string, record: Appointment) =>
        phone ? (
          <span
            className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
            onClick={() => makeCall(phone, record.customerName, record.customerId, record.customerAvatar || undefined)}
            style={{ color: token.colorText, fontWeight: '600' }}
          >
            <PhoneOutlined style={{ color: '#FF4D4F' }} />
            <span>{phone}</span>
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Thời Gian Hẹn',
      key: 'appointmentTime',
      sorter: (a: Appointment, b: Appointment) => {
        const timeA = a.bookingDateStart ? new Date(a.bookingDateStart).getTime() : 0;
        const timeB = b.bookingDateStart ? new Date(b.bookingDateStart).getTime() : 0;
        return timeA - timeB;
      },
      render: (record: Appointment) => {
        if (!record.bookingDateStart) return <Text type="secondary">-</Text>;
        const start = dayjs(record.bookingDateStart);
        return (
          <Space direction="vertical" size={1}>
            <span style={{ fontWeight: '600', color: token.colorText }}>{start.format('HH:mm')}</span>
            <span style={{ fontSize: '12px', color: token.colorTextDescription }}>{start.format('DD/MM/YYYY')}</span>
          </Space>
        );
      },
    },
    {
      title: 'Dịch vụ chính',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (name: string) => (
        <span style={{ fontWeight: '500', color: token.colorText }}>{name || 'Khách chưa chọn'}</span>
      ),
    },
    {
      title: 'Booker / Phân bổ',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (name: string | null | undefined, record: Appointment) => {
        const booker = name || record.bookerName;
        if (!booker) {
          return (
            <Text type="secondary" style={{ fontStyle: 'italic' }}>
              -
            </Text>
          );
        }
        return (
          <Tag color="cyan" style={{ margin: 0, fontWeight: 500 }}>
            {booker}
          </Tag>
        );
      },
    },
    {
      title: 'Lý do Missed & Ghi chú',
      key: 'missedReason',
      render: (record: Appointment) => {
        const log = record.missedLog;
        if (!log || !log.reasonCategory) {
          return (
            <Button
              type="dashed"
              danger
              size="small"
              icon={<EditOutlined />}
              onClick={() => onOpenMissedReasonModal && onOpenMissedReasonModal(record)}
            >
              + Ghi lý do
            </Button>
          );
        }

        const reasonInfo = REASON_MAP[log.reasonCategory] || { label: log.reasonCategory, color: 'volcano' };

        return (
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onOpenMissedReasonModal && onOpenMissedReasonModal(record)}
          >
            <Tag color={reasonInfo.color} style={{ margin: 0, fontWeight: 600 }}>
              {reasonInfo.label}
            </Tag>
            {log.note && (
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px] mt-0.5">{log.note}</div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Qui trách nhiệm',
      key: 'responsibility',
      render: (record: Appointment) => {
        const log = record.missedLog;
        if (!log || !log.responsibility) {
          return (
            <Text type="secondary" className="italic text-xs">
              -
            </Text>
          );
        }

        const respInfo = RESP_MAP[log.responsibility] || { label: log.responsibility, color: 'default' };

        return (
          <Tag color={respInfo.color} style={{ margin: 0 }}>
            {respInfo.label}
          </Tag>
        );
      },
    },
    {
      title: 'Follow-up',
      key: 'followUpStatus',
      render: (record: Appointment) => {
        const log = record.missedLog;
        const statusKey = log?.followUpStatus || 'PENDING';
        const fuInfo = FOLLOWUP_MAP[statusKey] || { label: statusKey, color: 'default' };

        return (
          <Tag color={fuInfo.color} style={{ margin: 0 }}>
            {fuInfo.label}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 170,
      render: (record: Appointment) => (
        <Space size="small">
          <Tooltip title="Ghi Lý do & Qui trách nhiệm">
            <Button
              type="text"
              shape="circle"
              icon={<FileTextOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />}
              onClick={() => onOpenMissedReasonModal && onOpenMissedReasonModal(record)}
            />
          </Tooltip>
          <Tooltip title="Chi tiết khách hàng">
            <Button
              type="text"
              shape="circle"
              icon={<EyeOutlined style={{ fontSize: '16px' }} />}
              onClick={() => openDetailModal(record.customerId)}
              style={{ color: '#D4A84B' }}
            />
          </Tooltip>
          <Button
            type="primary"
            size="small"
            icon={<CalendarPlusIcon fontSize={15} />}
            onClick={() => {
              if (setBookingInitialCustomer) {
                setBookingInitialCustomer({
                  id: record.customerId,
                  fullName: record.customerName,
                  phoneNumber: record.customerPhone,
                  avatar: record.customerAvatar,
                });
              }
              if (setBookingWizardVisible) {
                setBookingWizardVisible(true);
              }
            }}
            style={{
              backgroundColor: '#D4A84B',
              borderColor: '#D4A84B',
              color: '#ffffff',
              fontWeight: 'bold',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Đặt lại
          </Button>
        </Space>
      ),
    },
  ];
};
