'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import type dayjs from 'dayjs';
import type { Appointment } from '@mos-lab/shared';
import { AppointmentCardItem } from './AppointmentCardItem';
import { MINUTE_SLOTS, getAppointmentKey, getSubSlotAppointments } from './multiDayColumnUtils';

export interface TimeSlotRowProps {
  hourStr: string;
  daysList: dayjs.Dayjs[];
  appointmentsByDay: Record<string, Appointment[]>;
  draggedAppt: Appointment | null;
  activeDragOverSlotKey: string | null;
  onDragEnterSlot: (e: React.DragEvent, slotKey: string) => void;
  onDragOverSlot: (e: React.DragEvent, slotKey: string) => void;
  onDragLeaveSlot: (e: React.DragEvent, slotKey: string) => void;
  onDrop: (e: React.DragEvent, targetDate: dayjs.Dayjs, targetHour: string) => void;
  onHandleDragStart: (e: React.DragEvent, appt: Appointment) => void;
  onHandleDragEnd: () => void;
  onSelectSlot?: (date: dayjs.Dayjs, hour: string) => void;
  onMakeCall: (phone: string, name: string) => void;
  onViewCustomerDetail?: (customerId: number) => void;
  onReschedule?: (appointment: Appointment, newDateStr?: string) => void;
}

export const TimeSlotRow = React.memo(function TimeSlotRow({
  hourStr,
  daysList,
  appointmentsByDay,
  draggedAppt,
  activeDragOverSlotKey,
  onDragEnterSlot,
  onDragOverSlot,
  onDragLeaveSlot,
  onDrop,
  onHandleDragStart,
  onHandleDragEnd,
  onSelectSlot,
  onMakeCall,
  onViewCustomerDetail,
  onReschedule,
}: TimeSlotRowProps) {
  const hourNumStr = hourStr.split(':')[0] || '00';
  const targetHourNum = parseInt(hourNumStr, 10);

  return (
    <>
      {/* Only the time repeats for each row; the axis label lives in the header. */}
      <div
        aria-label={`Khung giờ ${hourStr}`}
        className="sticky left-0 z-10 flex min-h-[140px] items-center justify-center rounded-xl border border-slate-200/90 bg-slate-100/90 p-2 font-mono shadow-2xs dark:border-slate-700/60 dark:bg-slate-800/90"
      >
        <div className="text-center text-base font-black tracking-tight text-slate-800 tabular-nums dark:text-slate-100">
          {hourStr}
        </div>
      </div>

      {/* Slots per Day */}
      {daysList.map((day) => {
        const dayKey = day.format('YYYY-MM-DD');
        const dayAppts = appointmentsByDay[dayKey] || [];

        return (
          <div
            key={`${dayKey}-${hourStr}`}
            className="p-1 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-1 min-h-[140px]"
          >
            {MINUTE_SLOTS.map((minStr) => {
              const subSlotTimeStr = `${hourNumStr}:${minStr}`;
              const minTarget = parseInt(minStr, 10);
              const subSlotAppts = getSubSlotAppointments(dayAppts, targetHourNum, minTarget);

              const isEmpty = subSlotAppts.length === 0;
              const slotKey = `${dayKey}-${subSlotTimeStr}`;
              const isDragOver = activeDragOverSlotKey === slotKey;

              return (
                <div
                  key={subSlotTimeStr}
                  onDragEnter={(e) => onDragEnterSlot(e, slotKey)}
                  onDragOver={(e) => onDragOverSlot(e, slotKey)}
                  onDragLeave={(e) => onDragLeaveSlot(e, slotKey)}
                  onDrop={(e) => onDrop(e, day, subSlotTimeStr)}
                  onClick={() => isEmpty && onSelectSlot && onSelectSlot(day, subSlotTimeStr)}
                  className={`sub-slot-zone relative rounded-md p-1 border transition-all flex flex-col gap-1 min-h-[28px] ${
                    isDragOver
                      ? isEmpty
                        ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/15 dark:bg-emerald-950/70 shadow-lg shadow-emerald-500/20 scale-[1.02] z-20'
                        : 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/15 dark:bg-amber-950/70 shadow-lg shadow-amber-500/20 scale-[1.02] z-20'
                      : isEmpty
                        ? 'border-dashed border-slate-200/60 dark:border-slate-800/40 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 cursor-pointer group/slot'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 px-0.5 select-none pointer-events-none">
                    <span
                      className={`font-bold text-[10px] tabular-nums ${
                        isDragOver
                          ? isEmpty
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-amber-700 dark:text-amber-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {subSlotTimeStr}
                    </span>
                    {isDragOver ? (
                      <span
                        className={`font-extrabold flex items-center gap-1 text-[10px] animate-pulse ${
                          isEmpty ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isEmpty ? `🎯 Thả để chuyển sang ${subSlotTimeStr}` : `⚡ Thả để ghép ca ${subSlotTimeStr}`}
                      </span>
                    ) : (
                      isEmpty && (
                        <span className="opacity-0 group-hover/slot:opacity-100 transition-opacity text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 text-[10px]">
                          <Plus className="size-2.5" /> Đặt {subSlotTimeStr}
                        </span>
                      )
                    )}
                  </div>

                  {subSlotAppts.map((appt) => (
                    <AppointmentCardItem
                      key={getAppointmentKey(appt)}
                      appt={appt}
                      hourStr={subSlotTimeStr}
                      draggedAppt={draggedAppt}
                      onHandleDragStart={onHandleDragStart}
                      onHandleDragEnd={onHandleDragEnd}
                      onMakeCall={onMakeCall}
                      onViewCustomerDetail={onViewCustomerDetail}
                      onReschedule={onReschedule}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
});
