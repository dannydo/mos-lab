'use client';

import React from 'react';
import { Space, Avatar, Typography, Tag, Tooltip, Button, Popconfirm } from 'antd';
import { UserOutlined, PhoneOutlined, CalendarOutlined, EyeOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Appointment } from '@mos-lab/shared';

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
      render: (price: number) => <span style={{ fontWeight: '500', color: token.colorText }}>{formatVND(price)}</span>,
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
              <span style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold' }}>Giảm {pct}%</span>
            ) : amt > 0 ? (
              <span style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold' }}>Giảm {formatVND(amt)}</span>
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
          <Tooltip title="Dời lịch hẹn">
            <Button
              type="text"
              shape="circle"
              icon={<CalendarOutlined style={{ fontSize: '16px' }} />}
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
              style={{ color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563' }}
            />
          </Tooltip>
          <Tooltip title="Hủy lịch hẹn">
            <Popconfirm
              title="Xác nhận hủy lịch"
              description="Anh/chị có chắc chắn muốn hủy lịch hẹn này không?"
              okText="Có, Hủy lịch"
              cancelText="Không"
              onConfirm={() => handleCancelBooking?.(record.id)}
              okButtonProps={{ danger: true }}
            >
              <Button type="text" shape="circle" danger icon={<CloseCircleOutlined style={{ fontSize: '16px' }} />} />
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
          <div style={{ fontSize: '12px', color: token.colorTextDescription }}>
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
              <span style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold' }}>Giảm {pct}%</span>
            ) : amt > 0 ? (
              <span style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold' }}>Giảm {formatVND(amt)}</span>
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
        <span style={{ fontWeight: '500', color: token.colorText }}>{val > 0 ? formatVND(val) : '-'}</span>
      ),
    },
    {
      title: 'Tiền tips',
      dataIndex: 'tipAmount',
      key: 'tipAmount',
      sorter: (a: Appointment, b: Appointment) => (a.tipAmount || 0) - (b.tipAmount || 0),
      render: (val: number) => <span style={{ color: token.colorText }}>{val > 0 ? formatVND(val) : '-'}</span>,
    },
    {
      title: 'Hoa hồng OC',
      dataIndex: 'bookingBonus',
      key: 'bookingBonus',
      sorter: (a: Appointment, b: Appointment) => (a.bookingBonus || 0) - (b.bookingBonus || 0),
      render: (val: number) =>
        val > 0 ? (
          <span style={{ color: '#52C41A', fontWeight: 'bold' }}>+{formatVND(val)}</span>
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
}: ColumnsOptions) => {
  return [
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
      title: 'Giá trị ước tính',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      sorter: (a: Appointment, b: Appointment) => a.totalPrice - b.totalPrice,
      render: (price: number) => <span style={{ fontWeight: '500', color: token.colorText }}>{formatVND(price)}</span>,
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
              <span style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold' }}>Giảm {pct}%</span>
            ) : amt > 0 ? (
              <span style={{ fontSize: '11px', color: '#722ed1', fontWeight: 'bold' }}>Giảm {formatVND(amt)}</span>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'orderState',
      key: 'orderState',
      render: (state: string) => {
        const isCancelled = state === 'Cancelled';
        return <Tag color={isCancelled ? 'error' : 'volcano'}>{isCancelled ? 'Đã hủy' : 'Bị lỡ (Quá hạn)'}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
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
          <Tooltip title="Đặt lại lịch mới">
            <Button
              type="primary"
              size="small"
              icon={<CalendarOutlined />}
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
              style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', borderRadius: '4px', fontWeight: 'bold' }}
            >
              Đặt lại
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];
};
