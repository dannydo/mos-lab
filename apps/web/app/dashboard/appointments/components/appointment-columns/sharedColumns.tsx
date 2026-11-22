'use client';

import React from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Eye } from 'lucide-react';
import type { Appointment } from '@mos-lab/shared';
import { CustomerIdentityCell, StatusTag, TableIndexHeader } from '~/components/ui';
import { APPOINTMENT_GOLD_ACCENT, sortByAppointmentTime } from './constants';
import type { ColumnsOptions } from './types';

const { Text } = Typography;

export function buildIndexColumn(): ColumnsType<Appointment>[number] {
  return {
    title: <TableIndexHeader />,
    key: 'stt',
    width: 55,
    align: 'center' as const,
    render: (_: unknown, __: unknown, index: number) => (
      <span className="font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{index + 1}</span>
    ),
  };
}

interface BuildCustomerColumnOptions {
  openDetailModal: ColumnsOptions['openDetailModal'];
  makeCall: ColumnsOptions['makeCall'];
  accentColor?: string;
  includeForeignBadge?: boolean;
}

export function buildCustomerColumn({
  openDetailModal,
  makeCall,
  accentColor = APPOINTMENT_GOLD_ACCENT,
  includeForeignBadge = false,
}: BuildCustomerColumnOptions): ColumnsType<Appointment>[number] {
  return {
    title: 'Khách hàng',
    key: 'customerName',
    render: (record: Appointment) => (
      <CustomerIdentityCell
        name={record.customerName}
        phone={record.customerPhone}
        avatar={record.customerAvatar}
        accentColor={accentColor}
        isForeign={includeForeignBadge ? Boolean((record as Appointment & { isForeign?: boolean }).isForeign) : false}
        onOpen={() => openDetailModal(record.customerId)}
        onCall={() =>
          makeCall(record.customerPhone, record.customerName, record.customerId, record.customerAvatar || undefined)
        }
      />
    ),
  };
}

export function buildAppointmentTimeColumn(title = 'Thời Gian Hẹn'): ColumnsType<Appointment>[number] {
  return {
    title,
    key: 'appointmentTime',
    sorter: sortByAppointmentTime,
    render: (record: Appointment) => {
      if (!record.bookingDateStart) return <Text type="secondary">-</Text>;
      const start = dayjs(record.bookingDateStart);
      return (
        <Space direction="vertical" size={1}>
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{start.format('HH:mm')}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{start.format('DD/MM/YYYY')}</span>
        </Space>
      );
    },
  };
}

export function buildBookingChannelColumn(title = 'Kênh đặt lịch'): ColumnsType<Appointment>[number] {
  return {
    title,
    dataIndex: 'bookingChannel',
    key: 'bookingChannel',
    render: (channel: string) => <StatusTag status="orange" label={channel?.toLowerCase()} className="capitalize" />,
  };
}

export function buildBookerColumn(): ColumnsType<Appointment>[number] {
  return {
    title: 'Booker / Phân bổ',
    dataIndex: 'bookerName',
    key: 'bookerName',
    render: (name: string | null | undefined, record: Appointment) => {
      const booker = name || record.bookerName;
      if (!booker) {
        return (
          <Text type="secondary" className="italic">
            -
          </Text>
        );
      }
      return <StatusTag status="cyan" label={booker} className="font-medium" />;
    },
  };
}

export function buildPromotionColumn(formatVND: (value: number) => string): ColumnsType<Appointment>[number] {
  return {
    title: 'Khuyến mãi',
    key: 'promotion',
    render: (record: Appointment) => {
      if (!record.promotionName) {
        return (
          <Text type="secondary" className="italic">
            -
          </Text>
        );
      }
      const pct = record.promotionDiscountPercent || 0;
      const amt = record.promotionDiscountAmount || 0;
      return (
        <div className="flex flex-col gap-0.5 items-start">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-fuchsia-500/15 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-500/30 whitespace-nowrap">
            {record.promotionName}
          </span>
          {pct > 0 ? (
            <span className="text-[11px] font-black text-fuchsia-600 dark:text-fuchsia-300 tabular-nums">
              Giảm {pct}%
            </span>
          ) : amt > 0 ? (
            <span className="text-[11px] font-black text-fuchsia-600 dark:text-fuchsia-300 tabular-nums">
              Giảm {formatVND(amt)}
            </span>
          ) : null}
        </div>
      );
    },
  };
}

export function CustomerDetailActionButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Tooltip title="Chi tiết khách hàng">
      <Button
        type="text"
        shape="circle"
        aria-label="Chi tiết khách hàng"
        icon={<Eye className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
        onClick={onOpen}
        className="text-amber-500 dark:text-amber-400 hover:bg-amber-500/10"
      />
    </Tooltip>
  );
}
