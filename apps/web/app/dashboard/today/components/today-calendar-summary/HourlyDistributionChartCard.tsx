'use client';

import { Card, Space, Tooltip } from 'antd';
import { BarChart3 } from 'lucide-react';
import { getCalendarBorderClass, getCalendarCardSurfaceClass } from './calendarSummaryConstants';
import type { CalendarThemeMode, HourlyCalendarBucket } from './types';

export interface HourlyDistributionChartCardProps {
  themeMode: CalendarThemeMode;
  hourlyData: HourlyCalendarBucket[];
  maxHourlyVal: number;
  onSelectHour: (hour: string) => void;
}

export function HourlyDistributionChartCard({
  themeMode,
  hourlyData,
  maxHourlyVal,
  onSelectHour,
}: HourlyDistributionChartCardProps) {
  const cardSurfaceClass = getCalendarCardSurfaceClass(themeMode);
  const borderClass = getCalendarBorderClass(themeMode);
  const mutedTextClass =
    themeMode === 'dark' ? 'text-slate-400 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <Card
      title={
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-bold text-sm">Phân Bố 4 Chỉ Số Theo Khung Giờ (08:00 - 21:00)</span>
          </div>
          <Space size="small">
            <span className="text-[11px] text-sky-600">● Created</span>
            <span className="text-[11px] text-amber-500">● Scheduled</span>
            <span className="text-[11px] text-rose-500">● Missed</span>
            <span className="text-[11px] text-emerald-500">● Done</span>
          </Space>
        </div>
      }
      className={`${cardSurfaceClass} rounded-[10px] h-full [&_.ant-card-body]:pt-5 [&_.ant-card-body]:px-4 [&_.ant-card-body]:pb-3`}
    >
      <div className="flex flex-col gap-3">
        <div
          className={`grid grid-cols-[repeat(14,minmax(0,1fr))] gap-2 items-end min-h-[180px] pb-2 border-b ${borderClass}`}
        >
          {hourlyData.map((d) => {
            const bars = [
              {
                key: 'created',
                value: d.created,
                tooltip: `Tạo lúc ${d.hour}: ${d.created}\u00A0đơn`,
                fillClass: 'fill-sky-600',
              },
              {
                key: 'scheduled',
                value: d.scheduled,
                tooltip: `Hẹn ${d.hour}: ${d.scheduled} lượt`,
                fillClass: 'fill-amber-500',
              },
              {
                key: 'missed',
                value: d.missed,
                tooltip: `Lỡ ${d.hour}: ${d.missed} lượt`,
                fillClass: 'fill-rose-500',
              },
              {
                key: 'done',
                value: d.done,
                tooltip: `Xong ${d.hour}: ${d.done} lượt`,
                fillClass: 'fill-emerald-500',
              },
            ];

            return (
              <div
                key={d.hour}
                className="flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer"
                onClick={() => onSelectHour(d.hour)}
              >
                <div className="flex items-end gap-0.5 w-full h-[150px] justify-center px-0.5">
                  {bars.map((bar) => {
                    const pct = maxHourlyVal > 0 ? (bar.value / maxHourlyVal) * 100 : 0;
                    const heightUnits = bar.value > 0 ? Math.max(12, (pct / 100) * 150) : 0;

                    return (
                      <Tooltip key={bar.key} title={bar.tooltip}>
                        <div className="w-[22%] h-full flex items-end">
                          <svg
                            viewBox="0 0 12 150"
                            preserveAspectRatio="none"
                            className="w-full h-full block overflow-hidden"
                            aria-hidden="true"
                          >
                            {heightUnits > 0 && (
                              <rect
                                x={0}
                                y={150 - heightUnits}
                                width={12}
                                height={heightUnits + 3}
                                rx={2.5}
                                ry={2.5}
                                className={`${bar.fillClass} transition-all duration-300 ease-in-out`}
                              />
                            )}
                          </svg>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>

                <span className={`text-[11px] font-semibold tabular-nums ${mutedTextClass}`}>
                  {d.hour.split(':')[0]}h
                </span>
              </div>
            );
          })}
        </div>

        <div className={`flex justify-between text-[11px] ${mutedTextClass}`}>
          <span>
            Khung giờ hoạt động: <strong>08:00 - 21:00</strong>
          </span>
          <span>Nhấp vào cột giờ để xem chi tiết danh sách khách</span>
        </div>
      </div>
    </Card>
  );
}
