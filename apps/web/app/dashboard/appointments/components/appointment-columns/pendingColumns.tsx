'use client';

import React from 'react';
import { Button, Popconfirm, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { XCircle } from 'lucide-react';
import type { Appointment } from '@mos-lab/shared';
import CalendarRescheduleIcon from '~/components/icons/CalendarRescheduleIcon';
import { StatusTag } from '~/components/ui';
import { APPOINTMENT_GOLD_ACCENT, resolveAppointmentBranchName, resolvePendingOrderStatus } from './constants';
import {
  CustomerDetailActionButton,
  buildAppointmentTimeColumn,
  buildBookerColumn,
  buildBookingChannelColumn,
  buildCustomerColumn,
  buildIndexColumn,
  buildPromotionColumn,
} from './sharedColumns';
import type { ColumnsOptions } from './types';

const { Text } = Typography;

export const getPendingColumns = ({
  formatVND,
  openDetailModal,
  makeCall,
  setSelectedBookingForReschedule,
  setRescheduleModalVisible,
  handleCancelBooking,
}: ColumnsOptions): ColumnsType<Appointment> => {
  return [
    buildIndexColumn(),
    buildCustomerColumn({
      openDetailModal,
      makeCall,
      accentColor: APPOINTMENT_GOLD_ACCENT,
      includeForeignBadge: true,
    }),
    buildAppointmentTimeColumn('Thời Gian Hẹn'),
    {
      title: 'Giá trị ước tính',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      align: 'right',
      sorter: (a: Appointment, b: Appointment) => a.totalPrice - b.totalPrice,
      render: (price: number) => (
        <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">{formatVND(price)}</span>
      ),
    },
    buildBookingChannelColumn('Kênh đặt lịch'),
    buildBookerColumn(),
    buildPromotionColumn(formatVND),
    {
      title: 'Ghi chú đặt lịch',
      dataIndex: 'bookingNote',
      key: 'bookingNote',
      render: (note: string | null) =>
        note ? (
          <Tooltip
            title={<div className="whitespace-pre-line break-words">{note}</div>}
            classNames={{ root: 'max-w-[400px]' }}
          >
            <div className="line-clamp-2 m-0 max-w-full whitespace-normal break-words text-slate-900 dark:text-slate-100">
              {note}
            </div>
          </Tooltip>
        ) : (
          <Text type="secondary" className="italic">
            Không có
          </Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'orderState',
      key: 'orderState',
      render: (state: string, record: Appointment) => (
        <StatusTag status={resolvePendingOrderStatus(state, record.bookingDateStart)} label={state} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      render: (record: Appointment) => (
        <Space size="middle">
          <CustomerDetailActionButton onOpen={() => openDetailModal(record.customerId)} />
          <Tooltip title="Đổi lịch / Cập nhật">
            <Button
              type="primary"
              size="small"
              aria-label="Đổi lịch / Cập nhật"
              icon={<CalendarRescheduleIcon fontSize={14} />}
              className="rounded-md"
              onClick={() => {
                const bookingObj = {
                  id: record.id,
                  bookingDate: record.bookingDateStart ? dayjs(record.bookingDateStart).format('YYYY-MM-DD') : '',
                  bookingTime: record.bookingDateStart ? dayjs(record.bookingDateStart).format('HH:mm') : '',
                  branchName: resolveAppointmentBranchName(record),
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
              <Button
                type="text"
                shape="circle"
                danger
                icon={<XCircle className="w-4 h-4" />}
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
