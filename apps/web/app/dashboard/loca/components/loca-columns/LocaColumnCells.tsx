'use client';

import type React from 'react';
import { Avatar, Button, Space, Tooltip } from 'antd';
import { CalendarPlus, CheckCircle2, MessageSquare, Phone, User } from 'lucide-react';
import type { Customer } from '@mos-lab/shared';
import { AppIcon, CopyPhoneButton } from '~/components/ui';
import type { LocaColumnsOptions } from './types';

export interface LocaCustomerCellProps {
  name: string;
  record: Customer;
  themeMode: 'light' | 'dark';
  phoneTone?: 'theme' | 'gold';
  onOpenDetail: (record: Customer) => void;
  onMakeCall: LocaColumnsOptions['makeCall'];
}

export function LocaCustomerCell({
  name,
  record,
  themeMode,
  phoneTone = 'theme',
  onOpenDetail,
  onMakeCall,
}: LocaCustomerCellProps) {
  const phoneColorClass =
    phoneTone === 'gold'
      ? 'font-medium text-amber-500'
      : `${themeMode === 'dark' ? 'text-amber-400' : 'text-amber-600'} dark:text-amber-400 font-semibold`;

  const triggerCall = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    onMakeCall(record.phone, record.name, record.id, record.avatar || undefined);
  };

  return (
    <Space className="flex items-center cursor-pointer" onClick={() => onOpenDetail(record)}>
      <Avatar
        src={record.avatar || undefined}
        icon={<AppIcon icon={User} size={14} />}
        className="shrink-0 border border-[var(--avatar-border)] bg-[var(--avatar-bg)] text-amber-500"
      />
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-[var(--client-name-color)] hover:underline transition-all">{name}</span>
        </div>
        {record.phone && (
          <div className="flex items-center gap-1 mt-0.5">
            <div
              className={`text-xs hover:underline cursor-pointer flex items-center gap-1 tabular-nums ${phoneColorClass}`}
              role="button"
              tabIndex={0}
              aria-label={`Gọi điện thoại cho ${record.name || 'khách hàng'}`}
              onClick={triggerCall}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerCall(e);
                }
              }}
            >
              <AppIcon icon={Phone} size={10} />
              <span>{record.phone}</span>
            </div>
            <CopyPhoneButton phone={record.phone} size="xs" />
          </div>
        )}
      </div>
    </Space>
  );
}

export interface LocaActionCellProps {
  customer: Customer;
  isPlanned: boolean;
  isAdding: boolean;
  onAddToPlan: (id: number) => void;
  onOpenSms?: (record: Customer) => void;
}

export function LocaActionCell({ customer, isPlanned, isAdding, onAddToPlan, onOpenSms }: LocaActionCellProps) {
  return (
    <Space size={4} align="center" className="justify-center">
      <Tooltip title={isPlanned ? 'Đã lên lịch gọi' : 'Lên lịch gọi vào KH ngày'}>
        <Button
          type="default"
          size="small"
          aria-label={isPlanned ? 'Đã lên lịch gọi' : 'Thêm vào kế hoạch gọi'}
          loading={isAdding}
          icon={
            isPlanned ? (
              <AppIcon icon={CheckCircle2} size={16} className="text-emerald-400" />
            ) : (
              <AppIcon icon={CalendarPlus} size={16} strokeWidth={2.4} className="text-amber-500" />
            )
          }
          onClick={() => !isPlanned && !isAdding && onAddToPlan(customer.id)}
          className={`inline-flex h-[30px] w-[30px] min-w-[30px] items-center justify-center rounded-md p-0 ${
            isPlanned
              ? 'border-emerald-400/45 bg-emerald-400/12 text-emerald-400'
              : 'border-amber-500/80 bg-amber-500/12 text-amber-500 hover:bg-amber-500/20'
          }`}
          disabled={isPlanned || isAdding}
        />
      </Tooltip>
      <Tooltip title="Gửi tin nhắn SMS">
        <Button
          type="default"
          size="small"
          aria-label="Gửi tin nhắn SMS"
          icon={<AppIcon icon={MessageSquare} size={16} className="text-amber-500" />}
          onClick={() => onOpenSms?.(customer)}
          className="inline-flex h-[30px] w-[30px] min-w-[30px] items-center justify-center rounded-md border-amber-500/80 bg-amber-500/12 p-0 text-amber-500 hover:bg-amber-500/20"
        />
      </Tooltip>
    </Space>
  );
}
