'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import dayjs from 'dayjs';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { CvScheduleDrawer } from './CvScheduleDrawer';
import { DayColumnHeader } from './multi-day-column-view/DayColumnHeader';
import { TimeSlotRow } from './multi-day-column-view/TimeSlotRow';
import { HOURS_RANGE, getBranchBadgeInfo, groupAppointmentsByDay } from './multi-day-column-view/multiDayColumnUtils';
import { useMultiDayDragDrop } from './multi-day-column-view/useMultiDayDragDrop';
import type {
  AppointmentWithLegacyFields,
  BranchBadgeInfo,
  CapacityBadgeInfo,
  DailyCapacityEntry,
  MultiDayColumnViewProps,
  OffStaffSummary,
  WorkingStaffSummary,
} from './multi-day-column-view/types';

export { getBranchBadgeInfo };
export type {
  AppointmentWithLegacyFields,
  BranchBadgeInfo,
  CapacityBadgeInfo,
  DailyCapacityEntry,
  MultiDayColumnViewProps,
  OffStaffSummary,
  WorkingStaffSummary,
};

function MultiDayColumnView({
  loading: _loading,
  startDate,
  daysCount = 5,
  appointments,
  maxCapacityPerDay: _maxCapacityPerDay = 25,
  dailyCapacities,
  onSelectSlot,
  onViewCustomerDetail,
  onReschedule,
}: MultiDayColumnViewProps) {
  const { makeCall } = useOmiCall();
  const {
    draggedAppt,
    activeDragOverSlotKey,
    handleDragStart,
    handleDragEnterSlot,
    handleDragOverSlot,
    handleDragLeaveSlot,
    handleDragEndCard,
    handleDrop,
  } = useMultiDayDragDrop(onReschedule);

  // Side Slide Drawer state for Lịch CV
  const [cvDrawerOpen, setCvDrawerOpen] = useState(false);
  const [selectedCvDrawerDate, setSelectedCvDrawerDate] = useState<dayjs.Dayjs>(startDate);

  const handleOpenCvDrawer = useCallback((day: dayjs.Dayjs) => {
    setSelectedCvDrawerDate(day);
    setCvDrawerOpen(true);
  }, []);

  const handleCloseCvDrawer = useCallback(() => {
    setCvDrawerOpen(false);
  }, []);

  const daysList = useMemo(() => {
    const list: dayjs.Dayjs[] = [];
    for (let i = 0; i < daysCount; i++) {
      list.push(startDate.clone().add(i, 'day'));
    }
    return list;
  }, [startDate, daysCount]);

  const appointmentsByDay = useMemo(() => groupAppointmentsByDay(appointments, daysList), [appointments, daysList]);

  return (
    <div className="multi-day-column-view overflow-x-auto pb-4 w-full">
      <div
        className="grid gap-3 w-full min-w-[900px]"
        style={{ gridTemplateColumns: `80px repeat(${daysCount}, minmax(0, 1fr))` }}
      >
        {/* Leftmost Header Column: a compact horizontal time-axis label. */}
        <div
          aria-label="Cột khung giờ"
          className="sticky left-0 z-20 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            <Clock className="size-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Giờ</span>
          </div>
        </div>

        {/* Day Columns Headers */}
        {daysList.map((day) => {
          const dayKey = day.format('YYYY-MM-DD');
          return (
            <DayColumnHeader
              key={dayKey}
              day={day}
              dayAppts={appointmentsByDay[dayKey] || []}
              serverCap={dailyCapacities?.[dayKey]}
              onOpenCvDrawer={handleOpenCvDrawer}
            />
          );
        })}

        {/* Time Rows */}
        {HOURS_RANGE.map((hourStr) => (
          <TimeSlotRow
            key={hourStr}
            hourStr={hourStr}
            daysList={daysList}
            appointmentsByDay={appointmentsByDay}
            draggedAppt={draggedAppt}
            activeDragOverSlotKey={activeDragOverSlotKey}
            onDragEnterSlot={handleDragEnterSlot}
            onDragOverSlot={handleDragOverSlot}
            onDragLeaveSlot={handleDragLeaveSlot}
            onDrop={handleDrop}
            onHandleDragStart={handleDragStart}
            onHandleDragEnd={handleDragEndCard}
            onSelectSlot={onSelectSlot}
            onMakeCall={makeCall}
            onViewCustomerDetail={onViewCustomerDetail}
            onReschedule={onReschedule}
          />
        ))}
      </div>

      <CvScheduleDrawer
        open={cvDrawerOpen}
        onClose={handleCloseCvDrawer}
        currentDate={selectedCvDrawerDate}
        onDateChange={setSelectedCvDrawerDate}
        dailyCapacities={dailyCapacities}
        appointmentsByDay={appointmentsByDay}
      />
    </div>
  );
}

export default React.memo(MultiDayColumnView);
