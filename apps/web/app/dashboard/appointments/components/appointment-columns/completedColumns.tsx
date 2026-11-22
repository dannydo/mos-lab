'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Appointment } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { APPOINTMENT_GOLD_ACCENT, resolveCompletedOrderStatus } from './constants';
import {
  CustomerDetailActionButton,
  buildAppointmentTimeColumn,
  buildBookerColumn,
  buildBookingChannelColumn,
  buildCustomerColumn,
  buildIndexColumn,
  buildPromotionColumn,
} from './sharedColumns';
import type { CompletedColumnsOptions } from './types';

export const getCompletedColumns = ({
  formatVND,
  openDetailModal,
  makeCall,
}: CompletedColumnsOptions): ColumnsType<Appointment> => {
  return [
    buildIndexColumn(),
    buildCustomerColumn({
      openDetailModal,
      makeCall,
      accentColor: APPOINTMENT_GOLD_ACCENT,
    }),
    buildBookingChannelColumn('Kênh đặt'),
    buildBookerColumn(),
    buildAppointmentTimeColumn('Ngày hẹn'),
    {
      title: 'Dịch vụ chính',
      key: 'serviceName',
      render: (record: Appointment) => (
        <div className="text-slate-900 dark:text-slate-100">
          <div className="font-semibold">{record.serviceName}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Giá: {formatVND(record.servicePrice || 0)} | Giảm: {record.discountPercent || 0}%
          </div>
        </div>
      ),
    },
    buildPromotionColumn(formatVND),
    {
      title: 'Doanh thu Net',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      align: 'right',
      sorter: (a: Appointment, b: Appointment) => (a.netRevenue || 0) - (b.netRevenue || 0),
      render: (val: number) => (
        <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
          {val > 0 ? formatVND(val) : '-'}
        </span>
      ),
    },
    {
      title: 'Tiền tips',
      dataIndex: 'tipAmount',
      key: 'tipAmount',
      align: 'right',
      sorter: (a: Appointment, b: Appointment) => (a.tipAmount || 0) - (b.tipAmount || 0),
      render: (val: number) => (
        <span className="text-slate-900 dark:text-slate-100 tabular-nums">{val > 0 ? formatVND(val) : '-'}</span>
      ),
    },
    {
      title: 'Hoa hồng OC',
      dataIndex: 'bookingBonus',
      key: 'bookingBonus',
      align: 'right',
      sorter: (a: Appointment, b: Appointment) => (a.bookingBonus || 0) - (b.bookingBonus || 0),
      render: (val: number) =>
        val > 0 ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">+{formatVND(val)}</span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">-</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'orderState',
      key: 'orderState',
      render: (state: string, record: Appointment) => (
        <StatusTag status={resolveCompletedOrderStatus(state, record.bookingDateStart)} label={state} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      render: (record: Appointment) => <CustomerDetailActionButton onOpen={() => openDetailModal(record.customerId)} />,
    },
  ];
};
