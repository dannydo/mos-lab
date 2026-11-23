'use client';

import React from 'react';
import { Avatar, Button, Space, Typography } from 'antd';
import type { TableColumnType } from 'antd';
import dayjs from 'dayjs';
import { Phone, User } from 'lucide-react';
import type { DailyCallEntry } from '@mos-lab/shared';
import { formatOrGenerateCustomerPhone } from '~/components/booking/constants';
import { AppIcon, CopyPhoneButton, StatusTag } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import {
  getDesktopCallStatusMeta,
  getDurationBadgePresentation,
  getHappyCallButtonMeta,
} from './dailyCallsTableHelpers';
import type { DailyCallAssignedStaff, DailyCallsColumnBuildOptions } from './dailyCallsTableTypes';

const { Text } = Typography;

export function buildDailyCallsColumns({
  onOpenCustomer,
  onMakeCall,
  onOpenQaDrawer,
}: DailyCallsColumnBuildOptions): TableColumnType<DailyCallEntry>[] {
  return [
    {
      title: 'Mã KH',
      dataIndex: ['customer', 'id'],
      key: 'customerId',
      width: 80,
      render: (_: unknown, record: DailyCallEntry) => record.customer?.id || '-',
    },
    {
      title: 'Khách Hàng',
      dataIndex: ['customer', 'name'],
      key: 'client',
      render: (_: unknown, record: DailyCallEntry) => {
        if (!record.customer) return '-';
        const displayPhone = formatOrGenerateCustomerPhone(record.customer);
        return (
          <Space
            size="small"
            className="flex cursor-pointer items-center"
            onClick={() => onOpenCustomer(record.customer!.id)}
          >
            <Avatar
              size="small"
              src={record.customer.avatar || undefined}
              icon={<AppIcon icon={User} size="disclosure" />}
              className="shrink-0 border border-[var(--avatar-border)] bg-[var(--avatar-bg)] text-amber-500 dark:text-amber-400"
            />
            <div>
              <span className="font-semibold text-[var(--client-name-color)] hover:underline">
                {record.customer.name}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-[var(--client-phone-color)]">
                <span>{displayPhone}</span>
                <CopyPhoneButton phone={displayPhone} size="xs" />
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Gọi Điện',
      key: 'makeCall',
      width: 130,
      render: (_: unknown, record: DailyCallEntry) => {
        const phone = record.customer?.phone;
        if (!phone) return '-';
        return (
          <div className="flex items-center gap-1">
            <Button
              type="link"
              size="small"
              icon={<AppIcon icon={Phone} size="disclosure" className="text-amber-500 dark:text-amber-400" />}
              onClick={(e) => {
                e.stopPropagation();
                onMakeCall(phone, record.customer!.name, record.customer!.id, record.customer?.avatar || undefined);
              }}
              className="p-0 font-semibold text-[var(--client-name-color)]"
            >
              {phone}
            </Button>
            <CopyPhoneButton phone={phone} size="xs" />
          </div>
        );
      },
    },
    {
      title: 'Last time in bed',
      dataIndex: ['customer', 'daysSinceLastVisit'],
      key: 'lastTimeInBed',
      width: 180,
      render: (_: unknown, record: DailyCallEntry) => {
        if (!record.customer) return '-';
        const days = record.customer.daysSinceLastVisit;
        const lastBookingDate = record.customer.lastBookingDate;

        const isBookingInFuture = lastBookingDate ? new Date(lastBookingDate) > new Date() : false;
        if (isBookingInFuture) {
          const bookingFormatted = dayjs(lastBookingDate).format('DD/MM/YYYY');
          return <span className="font-bold text-green-700 dark:text-lime-400">📅 Booked: {bookingFormatted}</span>;
        }

        return days !== null && days !== undefined ? (
          <span className="tabular-nums">{days} ngày</span>
        ) : (
          <Text className="text-[var(--client-desc-color)]">Chưa từng đến</Text>
        );
      },
    },
    {
      title: 'Lifetime Value',
      dataIndex: ['customer', 'totalSpent'],
      key: 'lifetimeValue',
      width: 140,
      render: (spent: number) => <span className="tabular-nums">{formatVND(spent)}</span>,
    },
    {
      title: 'Booker',
      dataIndex: ['customer', 'assignedStaff'],
      key: 'assignedStaff',
      width: 140,
      render: (staff: DailyCallAssignedStaff | undefined) =>
        staff ? (
          <StatusTag status="cyan" label={staff.displayName} className="font-medium" />
        ) : (
          <span className="italic text-[var(--client-desc-color)]">Chưa phân bổ</span>
        ),
    },
    {
      title: 'Last call',
      dataIndex: 'createdAt',
      key: 'lastCall',
      width: 90,
      render: (dateStr: string) => <span className="tabular-nums">{dayjs(dateStr).format('HH:mm')}</span>,
    },
    {
      title: 'SL Booker (Thời lượng)',
      dataIndex: 'durationSec',
      key: 'duration',
      width: 110,
      render: (sec: number | null) => {
        const { label, className } = getDurationBadgePresentation(sec);
        return <span className={className}>{label}</span>;
      },
    },
    {
      title: 'Call Status',
      dataIndex: 'callResult',
      key: 'callStatus',
      width: 160,
      render: (result: string | null) => {
        const meta = getDesktopCallStatusMeta(result);
        return <StatusTag status={meta.status} label={meta.label} className="rounded font-semibold" />;
      },
    },
    {
      title: 'Call Notes',
      dataIndex: 'note',
      key: 'callNotes',
      render: (text: string | null) => (
        <Text className="text-[13px] text-[var(--client-name-color)]" ellipsis={{ tooltip: text || undefined }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: 'Happy Call',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: DailyCallEntry) => {
        const logId = record.omicallLogId;
        const isAnswered = record.callResult === 'ANSWERED';

        if (!isAnswered) {
          return <span className="text-xs text-zinc-500 dark:text-zinc-400">Không bắt máy</span>;
        }

        if (!logId) {
          return <span className="text-xs italic text-zinc-500 dark:text-zinc-400">Không ghi âm</span>;
        }

        const btnMeta = getHappyCallButtonMeta(record.happyCallStatus);
        return (
          <Button
            size="small"
            type={btnMeta.type}
            onClick={(e) => {
              e.stopPropagation();
              onOpenQaDrawer(logId);
            }}
            className={`rounded-md text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 ${btnMeta.className}`}
          >
            {btnMeta.text}
          </Button>
        );
      },
    },
  ];
}
