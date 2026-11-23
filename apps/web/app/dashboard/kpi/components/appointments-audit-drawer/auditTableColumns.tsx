'use client';

import React from 'react';
import { Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { CopyPhoneButton, StatusTag } from '~/components/ui';
import { formatAuditCurrency, type BookerAppointmentItem } from './appointmentsAuditTypes';

export function buildAppointmentsAuditColumns(): ColumnsType<BookerAppointmentItem> {
  return [
    {
      title: 'Khách hàng',
      key: 'client',
      render: (_value, record) => (
        <div>
          <div className="font-semibold text-[var(--mos-text)]">{record.clientName || 'N/A'}</div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--mos-text-muted)]">
            <span className="tabular-nums">{record.clientPhone || 'N/A'}</span>
            {record.clientPhone && <CopyPhoneButton phone={record.clientPhone} size="xs" />}
          </div>
        </div>
      ),
    },
    {
      title: 'Kênh đặt',
      dataIndex: 'channel',
      key: 'channel',
      render: (val: string) => <StatusTag status="processing" label={val} />,
    },
    {
      title: 'Ngày hẹn',
      dataIndex: 'appointmentDate',
      key: 'appointmentDate',
      sorter: (a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime(),
      defaultSortOrder: 'descend',
      render: (val: string | Date) => <span className="tabular-nums">{dayjs(val).format('DD/MM/YYYY HH:mm')}</span>,
    },
    {
      title: 'Dịch vụ chính',
      key: 'service',
      render: (_value, record) => (
        <div>
          <div className="text-[13px] text-[var(--mos-text)]">{record.serviceName}</div>
          {record.servicePrice > 0 && (
            <div className="text-[11px] tabular-nums text-[var(--mos-text-muted)]">
              Giá: {formatAuditCurrency(record.servicePrice)}
              {'\u00A0'}đ | Giảm: {record.discountPercent}%
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Doanh thu Net',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      align: 'right',
      sorter: (a, b) => a.netRevenue - b.netRevenue,
      render: (val: number) =>
        val > 0 ? (
          <span className="font-semibold tabular-nums text-[var(--mos-text)]">
            {formatAuditCurrency(val)}
            {'\u00A0'}đ
          </span>
        ) : (
          <span className="text-[var(--mos-text-muted)]">-</span>
        ),
    },
    {
      title: 'Tiền tips',
      dataIndex: 'tipAmount',
      key: 'tipAmount',
      align: 'right',
      sorter: (a, b) => a.tipAmount - b.tipAmount,
      render: (val: number) =>
        val > 0 ? (
          <span className="tabular-nums text-[var(--mos-text)]">
            {formatAuditCurrency(val)}
            {'\u00A0'}đ
          </span>
        ) : (
          <span className="text-[var(--mos-text-muted)]">-</span>
        ),
    },
    {
      title: 'Hoa hồng OC',
      dataIndex: 'bookingBonus',
      key: 'bookingBonus',
      align: 'right',
      sorter: (a, b) => a.bookingBonus - b.bookingBonus,
      render: (val: number) =>
        val > 0 ? (
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatAuditCurrency(val)}
            {'\u00A0'}đ
          </span>
        ) : (
          <span className="text-[var(--mos-text-muted)]">-</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (val: string, record) => <Badge status={record.isCompleted ? 'success' : 'default'} text={val} />,
    },
  ];
}
