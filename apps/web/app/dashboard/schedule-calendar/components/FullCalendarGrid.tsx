'use client';

import React from 'react';
import { Calendar, Badge, Tag, Tooltip, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Appointment } from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { useTheme } from '../../../../context/ThemeContext';

dayjs.extend(isoWeek);

const { Text } = Typography;

interface FullCalendarGridProps {
  loading: boolean;
  referenceDate: Dayjs;
  appointments: Appointment[];
  onSelectDate: (date: Dayjs) => void;
  onViewCustomerDetail?: (customerId: number) => void;
}

export default function FullCalendarGrid({
  loading,
  referenceDate,
  appointments,
  onSelectDate,
}: FullCalendarGridProps) {
  const { themeMode } = useTheme();

  // Group appointments by YYYY-MM-DD
  const appointmentsByDay = React.useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      if (!appt.bookingDateStart) return;
      const apptDay = dayjs(appt.bookingDateStart).format('YYYY-MM-DD');
      if (!map[apptDay]) {
        map[apptDay] = [];
      }
      map[apptDay].push(appt);
    });
    return map;
  }, [appointments]);

  const dateCellRender = (value: Dayjs) => {
    const dateKey = value.format('YYYY-MM-DD');
    const dayAppts = appointmentsByDay[dateKey] || [];
    if (dayAppts.length === 0) return null;

    const completed = dayAppts.filter((a) => a.orderState === 'Completed').length;
    const missed = dayAppts.filter((a) => a.orderState === 'Missed' || a.orderState === 'Cancelled').length;
    const pending = dayAppts.length - completed - missed;
    const totalRev = dayAppts.reduce((sum, a) => sum + (a.totalPrice || 0), 0);

    // Heatmap capacity indicator
    let heatColor = '#10b981'; // Green
    if (dayAppts.length >= 20) {
      heatColor = '#ef4444'; // Red
    } else if (dayAppts.length >= 10) {
      heatColor = '#f59e0b'; // Yellow
    }

    return (
      <div className="calendar-date-cell p-1 rounded-md bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: heatColor }} />
          <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 tabular-nums">
            {dayAppts.length} đơn
          </span>
        </div>

        <div className="flex flex-wrap gap-1 text-[10px]">
          {pending > 0 && (
            <Tag color="processing" className="m-0 px-1 py-0 border-0">
              {pending} chờ
            </Tag>
          )}
          {completed > 0 && (
            <Tag color="success" className="m-0 px-1 py-0 border-0">
              {completed} xong
            </Tag>
          )}
          {missed > 0 && (
            <Tag color="error" className="m-0 px-1 py-0 border-0">
              {missed} hủy
            </Tag>
          )}
        </div>

        <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums truncate">
          {formatVND(totalRev)}
        </div>
      </div>
    );
  };

  return (
    <div className="full-calendar-grid-container bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
      <Calendar
        value={referenceDate}
        cellRender={dateCellRender}
        onSelect={onSelectDate}
        className="custom-antd-calendar"
      />
    </div>
  );
}
