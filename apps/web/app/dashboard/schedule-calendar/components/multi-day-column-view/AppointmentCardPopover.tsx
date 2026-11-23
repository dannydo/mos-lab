'use client';

import React from 'react';
import { Button } from 'antd';
import { ArrowLeftRight, Eye, Phone } from 'lucide-react';
import { Appointment, maskPhoneNumber } from '@mos-lab/shared';
import { CopyPhoneButton } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import { getAppointmentCustomerId, getAppointmentPrice } from './multiDayColumnUtils';

export interface AppointmentCardPopoverProps {
  appt: Appointment;
  customerName: string;
  phone: string;
  service: string;
  timeFormatted: string;
  statusLabel: string;
  isMaskedRole: boolean;
  onMakeCall: (phone: string, name: string) => void;
  onViewCustomerDetail?: (customerId: number) => void;
  onReschedule?: (appt: Appointment) => void;
}

export const AppointmentCardPopover = React.memo(function AppointmentCardPopover({
  appt,
  customerName,
  phone,
  service,
  timeFormatted,
  statusLabel,
  isMaskedRole,
  onMakeCall,
  onViewCustomerDetail,
  onReschedule,
}: AppointmentCardPopoverProps) {
  const customerId = getAppointmentCustomerId(appt);
  const canRevealPhone = Boolean(phone && !isMaskedRole && !phone.includes('*'));

  return (
    <div className="p-1 max-w-[240px] space-y-2">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{customerName}</div>
        <div className="text-xs text-slate-400 tabular-nums flex items-center gap-1">
          <span>SĐT: {phone ? (isMaskedRole ? maskPhoneNumber(phone) : phone) : '-'}</span>
          {canRevealPhone && <CopyPhoneButton phone={phone} size="xs" />}
        </div>
      </div>
      <div className="text-xs space-y-1">
        <div>
          <span className="text-slate-400">Trạng thái:</span>{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">{statusLabel}</span>
        </div>
        <div>
          <span className="text-slate-400">Dịch vụ:</span>{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">{service}</span>
        </div>
        <div>
          <span className="text-slate-400">Thời gian:</span>{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{timeFormatted}</span>
        </div>
        <div>
          <span className="text-slate-400">CV:</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">{appt.technicianName || 'Chưa gán'}</span>
        </div>
        <div>
          <span className="text-slate-400">Ước tính:</span>{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatVND(getAppointmentPrice(appt))}
          </span>
        </div>
      </div>
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-1 justify-end">
        {canRevealPhone && (
          <Button
            size="small"
            icon={<Phone className="size-3.5 text-emerald-500" />}
            onClick={() => onMakeCall(phone, customerName)}
          >
            Gọi
          </Button>
        )}
        {Boolean(customerId) && customerId !== undefined && onViewCustomerDetail && (
          <Button size="small" icon={<Eye className="size-3.5" />} onClick={() => onViewCustomerDetail(customerId)}>
            Xem
          </Button>
        )}
        {onReschedule && (
          <Button size="small" icon={<ArrowLeftRight className="size-3.5" />} onClick={() => onReschedule(appt)}>
            Đổi lịch / Cập nhật
          </Button>
        )}
      </div>
    </div>
  );
});
