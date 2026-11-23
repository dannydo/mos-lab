'use client';

import React from 'react';
import { Progress } from 'antd';
import dayjs from 'dayjs';
import type { Appointment } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import {
  DEFAULT_CAPACITY_MULTIPLIER,
  DEFAULT_WORKING_KTV_COUNT,
  getAppointmentPrice,
  getCapacityBadge,
} from './multiDayColumnUtils';
import type { DailyCapacityEntry } from './types';

export interface DayColumnHeaderProps {
  day: dayjs.Dayjs;
  dayAppts: Appointment[];
  serverCap?: DailyCapacityEntry;
  onOpenCvDrawer: (day: dayjs.Dayjs) => void;
}

export const DayColumnHeader = React.memo(function DayColumnHeader({
  day,
  dayAppts,
  serverCap,
  onOpenCvDrawer,
}: DayColumnHeaderProps) {
  const totalRev = dayAppts.reduce((sum, appt) => sum + getAppointmentPrice(appt), 0);

  // Calculate dynamic KTV count & max capacity from server schedule (working CVs = total active minus OFF days)
  const ktvCount = serverCap?.workingKtvCount ?? DEFAULT_WORKING_KTV_COUNT;
  const dynamicMaxCapacity = serverCap?.maxCapacity ?? ktvCount * DEFAULT_CAPACITY_MULTIPLIER;
  const fillPercentage = dynamicMaxCapacity > 0 ? Math.round((dayAppts.length / dynamicMaxCapacity) * 100) : 0;
  const capInfo = getCapacityBadge(dayAppts.length, dynamicMaxCapacity);
  const isToday = day.isSame(dayjs(), 'day');

  return (
    <div
      className={`rounded-xl border p-3 flex flex-col justify-between transition-all shadow-xs ${
        isToday
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/50'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {day.format('dddd')} {isToday && '(Hôm nay)'}
          </span>
          <StatusTag
            status={capInfo.status}
            label={capInfo.label}
            bordered={false}
            className="text-[10px] px-1.5 py-0.5 font-medium"
          />
        </div>
        <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
          {day.format('DD/MM/YYYY')}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 dark:text-slate-400">Số đơn:</span>
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {dayAppts.length} / {dynamicMaxCapacity} ({fillPercentage}%)
            </span>
            <button
              type="button"
              onClick={() => onOpenCvDrawer(day)}
              title="Mở Side Slide Lịch CV"
              className="inline-flex items-center justify-center rounded border border-cyan-500/30 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-cyan-700 transition-opacity hover:opacity-80 dark:text-cyan-300 cursor-pointer tabular-nums"
            >
              • {ktvCount} CV
            </button>
          </div>
        </div>
        <Progress
          percent={Math.min(100, fillPercentage)}
          aria-label={`Công suất ${day.format('DD/MM')}: ${fillPercentage}%`}
          size="small"
          showInfo={false}
          status={capInfo.progressStatus}
          strokeColor={capInfo.strokeColor}
          className="m-0"
        />
        <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
          <span>Dự kiến:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatVND(totalRev)}
          </span>
        </div>
      </div>
    </div>
  );
});
