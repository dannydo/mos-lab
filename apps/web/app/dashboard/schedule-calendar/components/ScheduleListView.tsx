'use client';

import React from 'react';
import { Table, Tag, Button, Space, Tooltip, Typography } from 'antd';
import {
  PhoneOutlined,
  CalendarOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Appointment } from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { useTheme } from '../../../../context/ThemeContext';
import { ResizableHeaderCell } from '../../../../components/ResizableHeaderCell';

const { Text } = Typography;

interface ScheduleListViewProps {
  loading: boolean;
  appointments: Appointment[];
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onViewCustomerDetail: (customerId: number) => void;
  onReschedule: (appointment: Appointment) => void;
  onCancelBooking?: (orderId: number) => void;
}

export default function ScheduleListView({
  loading,
  appointments,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onViewCustomerDetail,
  onReschedule,
}: ScheduleListViewProps) {
  const { makeCall } = useOmiCall();
  const { themeMode } = useTheme();

  const getStatusTag = (state?: string) => {
    switch (state) {
      case 'Completed':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success" className="px-2 py-0.5 rounded-full font-medium">
            Hoàn thành
          </Tag>
        );
      case 'Missed':
        return (
          <Tag icon={<WarningOutlined />} color="error" className="px-2 py-0.5 rounded-full font-medium">
            Missed (Bỏ lỡ)
          </Tag>
        );
      case 'Cancelled':
        return (
          <Tag icon={<CloseCircleOutlined />} color="default" className="px-2 py-0.5 rounded-full font-medium">
            Đã hủy
          </Tag>
        );
      case 'Pending':
      default:
        return (
          <Tag icon={<ClockCircleOutlined />} color="processing" className="px-2 py-0.5 rounded-full font-medium">
            Chờ check-in
          </Tag>
        );
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <span className="text-slate-400 font-mono text-xs tabular-nums">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customerName',
      width: 200,
      render: (_: unknown, record: Appointment) => (
        <div>
          <div
            className="font-semibold text-slate-800 dark:text-slate-100 hover:text-emerald-500 cursor-pointer transition-colors"
            onClick={() =>
              (record.customerId || (record as any).userId) &&
              onViewCustomerDetail(record.customerId || (record as any).userId)
            }
          >
            {record.customerName || (record as any).userName || 'Chưa cập nhật'}
          </div>
          {(record.customerId || (record as any).userId) && (
            <Text type="secondary" className="text-[11px]">
              Mã KH: #{record.customerId || (record as any).userId}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      key: 'customerPhone',
      width: 150,
      render: (_: unknown, record: Appointment) => {
        const phone = record.customerPhone || (record as any).phone || '';
        return (
          <Space size="small">
            <span className="font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200">{phone || '-'}</span>
            {phone && (
              <Tooltip title="Gọi ngay qua OmiCall">
                <Button
                  type="text"
                  size="small"
                  icon={<PhoneOutlined className="text-emerald-500 hover:text-emerald-600" />}
                  onClick={() => makeCall(phone, record.customerName || 'Khách hàng')}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Thời gian hẹn',
      key: 'appointmentTime',
      width: 170,
      render: (_: unknown, record: Appointment) => {
        const dateStr = record.bookingDateStart
          ? dayjs(record.bookingDateStart).format('DD/MM/YYYY HH:mm')
          : (record as any).appointmentTime || '-';
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{dateStr}</span>
            {record.bookingChannel && <span className="text-[11px] text-slate-400">Kênh: {record.bookingChannel}</span>}
          </div>
        );
      },
    },
    {
      title: 'Dịch vụ chính',
      key: 'serviceName',
      width: 220,
      render: (_: unknown, record: Appointment) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {record.serviceName || (record as any).packageName || 'Dịch vụ mi lẻ'}
        </span>
      ),
    },
    {
      title: 'Nhân sự phụ trách',
      key: 'staffInfo',
      width: 180,
      render: (_: unknown, record: Appointment) => (
        <div className="text-xs space-y-0.5">
          {record.technicianName ? (
            <div>
              <span className="text-slate-400">KTV: </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{record.technicianName}</span>
            </div>
          ) : (
            <div className="text-slate-400 font-italic">KTV: Chưa gán</div>
          )}
          {record.bookerName && (
            <div>
              <span className="text-slate-400">Booker: </span>
              <span className="text-slate-600 dark:text-slate-300">{record.bookerName}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Giá trị ước tính',
      key: 'totalPrice',
      width: 140,
      align: 'right' as const,
      render: (_: unknown, record: Appointment) => {
        const price = record.totalPrice || (record as any).orderPrice || 0;
        return (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatVND(price)}</span>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'orderState',
      width: 130,
      align: 'center' as const,
      render: (_: unknown, record: Appointment) => getStatusTag(record.orderState),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 140,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: unknown, record: Appointment) => (
        <Space size="small">
          {(record.customerId || (record as any).userId) && (
            <Tooltip title="Xem Hồ sơ Khách">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onViewCustomerDetail(record.customerId || (record as any).userId)}
              />
            </Tooltip>
          )}
          <Tooltip title="Đổi giờ hẹn">
            <Button
              type="text"
              size="small"
              icon={<CalendarOutlined className="text-amber-500" />}
              onClick={() => onReschedule(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="schedule-list-view-container bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
      <Table
        loading={loading}
        dataSource={appointments}
        rowKey={(record) => String(record.id || (record as any).orderId || Math.random())}
        columns={columns}
        components={{
          header: {
            cell: ResizableHeaderCell,
          },
        }}
        scroll={{ x: 1200 }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: onPageChange,
          showTotal: (totalCount) => `Tổng cộng ${totalCount} lịch hẹn`,
        }}
        rowClassName="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      />
    </div>
  );
}
