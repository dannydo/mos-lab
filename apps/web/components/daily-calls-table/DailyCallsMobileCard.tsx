'use client';

import React from 'react';
import { Avatar, Button } from 'antd';
import dayjs from 'dayjs';
import { Phone, User } from 'lucide-react';
import type { DailyCallEntry } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { getMobileCallStatusMeta } from './dailyCallsTableHelpers';

export interface DailyCallsMobileCardProps {
  record: DailyCallEntry;
  onOpenCustomer: (customerId: number) => void;
  onMakeCall: (phone: string, name?: string, customerId?: number, avatar?: string) => void;
}

export function DailyCallsMobileCard({ record, onOpenCustomer, onMakeCall }: DailyCallsMobileCardProps) {
  const phone = record.customer?.phone;
  const { durationText, statusLabel, statusType } = getMobileCallStatusMeta(record);

  return (
    <div className="daily-call-mobile-card">
      <div className="daily-call-mobile-card-header">
        <Button
          type="link"
          className="daily-call-mobile-customer"
          onClick={() => record.customer && onOpenCustomer(record.customer.id)}
        >
          <Avatar
            size="small"
            src={record.customer?.avatar || undefined}
            icon={<AppIcon icon={User} size="disclosure" />}
          />
          <span>{record.customer?.name || 'Khách hàng chưa xác định'}</span>
        </Button>
        <span className="daily-call-mobile-time tabular-nums">{dayjs(record.createdAt).format('HH:mm')}</span>
      </div>
      <div className="daily-call-mobile-meta">
        {phone ? (
          <Button
            type="link"
            size="small"
            icon={<AppIcon icon={Phone} size="disclosure" />}
            onClick={() =>
              onMakeCall(phone, record.customer?.name, record.customer?.id, record.customer?.avatar || undefined)
            }
          >
            {phone}
          </Button>
        ) : (
          <span>Chưa có số điện thoại</span>
        )}
        <StatusTag status={statusType} label={durationText} className="tabular-nums" />
        <StatusTag status={statusType} label={statusLabel} />
      </div>
      {record.note && <p className="daily-call-mobile-note">{record.note}</p>}
    </div>
  );
}
