'use client';

import { Card, Progress } from 'antd';
import { PieChart } from 'lucide-react';
import type { ComingClientData } from '../../hooks/useTodayData';
import {
  BRANCH_CALENDAR_CONFIG,
  getCalendarBorderClass,
  getCalendarCardSurfaceClass,
} from './calendarSummaryConstants';
import type { CalendarThemeMode } from './types';

export interface OperationalBreakdownCardProps {
  themeMode: CalendarThemeMode;
  completionRate: number;
  missedRate: number;
  totalScheduled: number;
  filteredComingList: ComingClientData[];
}

export function OperationalBreakdownCard({
  themeMode,
  completionRate,
  missedRate,
  totalScheduled,
  filteredComingList,
}: OperationalBreakdownCardProps) {
  const isDark = themeMode === 'dark';
  const cardSurfaceClass = getCalendarCardSurfaceClass(themeMode);
  const borderClass = getCalendarBorderClass(themeMode);
  const labelTextClass = isDark ? 'text-slate-100 dark:text-slate-100' : 'text-slate-900 dark:text-slate-100';
  const mutedTextClass = isDark ? 'text-slate-400 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-bold text-sm">Tỷ Lệ Vận Hành & Chi Nhánh</span>
        </div>
      }
      className={`${cardSurfaceClass} rounded-[10px] h-full [&_.ant-card-body]:p-4`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-around items-center">
          <div className="text-center">
            <Progress
              type="dashboard"
              percent={completionRate}
              size={85}
              strokeColor="rgba(82, 196, 26, 1)"
              format={(percent) => <span className="tabular-nums">{percent}%</span>}
            />
            <div className="text-[11px] font-bold mt-1 text-emerald-500">Tỷ lệ Hoàn Thành</div>
          </div>

          <div className="text-center">
            <Progress
              type="dashboard"
              percent={missedRate}
              size={85}
              strokeColor="rgba(255, 77, 79, 1)"
              format={(percent) => <span className="tabular-nums">{percent}%</span>}
            />
            <div className="text-[11px] font-bold mt-1 text-rose-500">Tỷ lệ Lỡ Hẹn</div>
          </div>
        </div>

        <div className={`flex flex-col gap-2.5 pt-2 border-t ${borderClass}`}>
          <div className={`text-xs font-bold ${mutedTextClass}`}>Phân Bổ Đơn Theo Chi Nhánh:</div>

          {Object.entries(BRANCH_CALENDAR_CONFIG).map(([bKey, conf]) => {
            const bCount = filteredComingList.filter((c) => c.branchKey === bKey).length;
            const bPct = totalScheduled > 0 ? Math.round((bCount / totalScheduled) * 100) : 0;

            return (
              <div key={bKey} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-xs">
                  <span className={`font-medium ${labelTextClass}`}>{conf.name}</span>
                  <span className={`tabular-nums ${mutedTextClass}`}>
                    <strong>{bCount}</strong> lượt ({bPct}%)
                  </span>
                </div>
                <Progress percent={bPct} showInfo={false} strokeColor={conf.strokeColor} size="small" />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
