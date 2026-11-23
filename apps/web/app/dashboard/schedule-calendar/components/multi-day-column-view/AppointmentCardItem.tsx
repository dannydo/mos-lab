'use client';

import React from 'react';
import { Avatar, Popover, Tooltip } from 'antd';
import { CheckCircle2, Clock, CreditCard, RefreshCw, XCircle } from 'lucide-react';
import type { Appointment } from '@mos-lab/shared';
import { AppointmentCardPopover } from './AppointmentCardPopover';
import {
  checkIsMaskedPhoneRole,
  getAppointmentDisplayFields,
  getAppointmentKey,
  getAppointmentStatusMeta,
  getBranchBadgeInfo,
  isSameDraggedAppointment,
} from './multiDayColumnUtils';

export interface AppointmentCardItemProps {
  appt: Appointment;
  hourStr: string;
  draggedAppt: Appointment | null;
  onHandleDragStart: (e: React.DragEvent, appt: Appointment) => void;
  onHandleDragEnd: () => void;
  onMakeCall: (phone: string, name: string) => void;
  onViewCustomerDetail?: (customerId: number) => void;
  onReschedule?: (appt: Appointment) => void;
}

export const AppointmentCardItem = React.memo(function AppointmentCardItem({
  appt,
  hourStr,
  draggedAppt,
  onHandleDragStart,
  onHandleDragEnd,
  onMakeCall,
  onViewCustomerDetail,
  onReschedule,
}: AppointmentCardItemProps) {
  const { customerName, phone, service, timeFormatted } = getAppointmentDisplayFields(appt, hourStr);
  const statusMeta = getAppointmentStatusMeta(appt.orderState);
  const branch = getBranchBadgeInfo(appt.storeId, appt.branchName, appt.branchCode);
  const isMaskedRole = React.useMemo(() => checkIsMaskedPhoneRole(), []);
  const isBeingDragged = isSameDraggedAppointment(draggedAppt, appt);

  const renderStatusIcon = () => {
    switch (statusMeta.iconKind) {
      case 'completed':
        return <CheckCircle2 className="size-3.5 text-emerald-500" />;
      case 'pendingCheckout':
        return <CreditCard className="size-3.5 text-purple-500" />;
      case 'servicing':
        return <RefreshCw className="size-3.5 text-blue-500 animate-spin" />;
      case 'missed':
        return <XCircle className="size-3.5 text-rose-500" />;
      default:
        return <Clock className="size-3.5 text-amber-500" />;
    }
  };

  const cardPopoverContent = (
    <AppointmentCardPopover
      appt={appt}
      customerName={customerName}
      phone={phone}
      service={service}
      timeFormatted={timeFormatted}
      statusLabel={statusMeta.popoverStatusLabel}
      isMaskedRole={isMaskedRole}
      onMakeCall={onMakeCall}
      onViewCustomerDetail={onViewCustomerDetail}
      onReschedule={onReschedule}
    />
  );

  return (
    <Popover key={getAppointmentKey(appt)} content={cardPopoverContent} title={undefined} trigger="click">
      <div
        draggable
        onDragStart={(e) => onHandleDragStart(e, appt)}
        onDragEnd={onHandleDragEnd}
        className={`p-2 rounded-lg border text-xs shadow-2xs cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] ${
          isBeingDragged
            ? 'opacity-50 scale-95 border-dashed border-emerald-500 dark:border-emerald-400 shadow-none ring-2 ring-emerald-400/40'
            : statusMeta.cardSurfaceClass
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 min-w-0 mb-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="font-bold font-mono text-[11px] tabular-nums shrink-0">{timeFormatted}</span>
            <span
              className={`text-[9px] font-extrabold px-1 py-0 rounded border uppercase tracking-tighter shrink-0 ${branch.bgClass}`}
            >
              {branch.code}
            </span>
            {appt.technicianName && (
              <Tooltip title={`CV chỉ định: ${appt.technicianName}`}>
                <Avatar
                  src={appt.technicianAvatar || undefined}
                  alt=""
                  size={18}
                  className="shrink-0 border border-emerald-500/40 text-[9px] font-bold bg-emerald-600 text-white shadow-2xs"
                >
                  {appt.technicianName.trim().slice(0, 1).toUpperCase()}
                </Avatar>
              </Tooltip>
            )}
            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{customerName}</span>
          </div>
          <Tooltip title={statusMeta.tooltipTitle}>
            <div className="shrink-0 flex items-center justify-center cursor-help">{renderStatusIcon()}</div>
          </Tooltip>
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{service}</div>
      </div>
    </Popover>
  );
});
