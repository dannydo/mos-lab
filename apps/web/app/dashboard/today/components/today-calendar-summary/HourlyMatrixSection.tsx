'use client';

import { Card, Radio, Tooltip } from 'antd';
import { Clock, Store } from 'lucide-react';
import {
  BRANCH_CALENDAR_CONFIG,
  CALENDAR_HOURS,
  getCalendarBorderClass,
  getCalendarCardSurfaceClass,
} from './calendarSummaryConstants';
import type { CalendarThemeMode, HourlyCalendarBucket, MatrixStatusFilter, SelectedCalendarSlot } from './types';

export interface HourlyMatrixSectionProps {
  themeMode: CalendarThemeMode;
  hourlyData: HourlyCalendarBucket[];
  matrixStatusFilter: MatrixStatusFilter;
  onChangeMatrixStatusFilter: (value: MatrixStatusFilter) => void;
  totalCreated: number;
  totalScheduled: number;
  totalMissed: number;
  totalDone: number;
  onSelectSlot: (slot: SelectedCalendarSlot) => void;
}

export function HourlyMatrixSection({
  themeMode,
  hourlyData,
  matrixStatusFilter,
  onChangeMatrixStatusFilter,
  totalCreated,
  totalScheduled,
  totalMissed,
  totalDone,
  onSelectSlot,
}: HourlyMatrixSectionProps) {
  const isDark = themeMode === 'dark';
  const cardSurfaceClass = getCalendarCardSurfaceClass(themeMode);
  const borderClass = getCalendarBorderClass(themeMode);
  const tableTextClass = isDark ? 'text-slate-100 dark:text-slate-100' : 'text-slate-900 dark:text-slate-100';

  return (
    <Card
      title={
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-bold text-[15px]">Ma Trận Lịch Phân Giờ Theo Chi Nhánh (Hourly Calendar Matrix)</span>
          </div>

          <Radio.Group
            value={matrixStatusFilter}
            onChange={(e) => onChangeMatrixStatusFilter(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="all">Tất cả ({totalCreated + totalScheduled})</Radio.Button>
            <Radio.Button value="created">
              <span className={matrixStatusFilter === 'created' ? 'text-white font-bold' : 'text-sky-600 font-bold'}>
                📝 Created ({totalCreated})
              </span>
            </Radio.Button>
            <Radio.Button value="scheduled">
              <span
                className={matrixStatusFilter === 'scheduled' ? 'text-white font-bold' : 'text-amber-500 font-bold'}
              >
                📅 Scheduled ({totalScheduled})
              </span>
            </Radio.Button>
            <Radio.Button value="missed">
              <span className={matrixStatusFilter === 'missed' ? 'text-white font-bold' : 'text-rose-500 font-bold'}>
                ⚠️ Missed ({totalMissed})
              </span>
            </Radio.Button>
            <Radio.Button value="done">
              <span className={matrixStatusFilter === 'done' ? 'text-white font-bold' : 'text-emerald-500 font-bold'}>
                ✅ Done ({totalDone})
              </span>
            </Radio.Button>
          </Radio.Group>
        </div>
      }
      className={`${cardSurfaceClass} rounded-[10px] [&_.ant-card-body]:px-4 [&_.ant-card-body]:py-3`}
    >
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse text-xs ${tableTextClass}`}>
          <thead>
            <tr
              className={`border-b-2 ${borderClass} ${
                isDark ? 'bg-slate-800 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800'
              }`}
            >
              <th className="p-2.5 text-left min-w-[120px]">Chi nhánh</th>
              {CALENDAR_HOURS.map((h) => (
                <th key={h} className="py-2.5 px-1 text-center min-w-[78px] tabular-nums">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(BRANCH_CALENDAR_CONFIG).map(([bKey, conf]) => (
              <tr key={bKey} className={`border-b ${borderClass}`}>
                <td className={`py-3 px-2.5 font-bold ${conf.textClass}`}>
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 shrink-0" />
                    <span>{conf.name}</span>
                  </div>
                </td>

                {hourlyData.map((d) => {
                  const breakdown = d.branchBreakdown[bKey] || { created: 0, scheduled: 0, missed: 0, done: 0 };
                  const { created: c, scheduled: s, missed: m, done: dCount } = breakdown;
                  const cellSum = c + s + m + dCount;
                  const hasData = cellSum > 0;

                  const isVisible =
                    matrixStatusFilter === 'all' ||
                    (matrixStatusFilter === 'created' && c > 0) ||
                    (matrixStatusFilter === 'scheduled' && s > 0) ||
                    (matrixStatusFilter === 'missed' && m > 0) ||
                    (matrixStatusFilter === 'done' && dCount > 0);

                  const cPct = cellSum > 0 ? (c / cellSum) * 100 : 0;
                  const sPct = cellSum > 0 ? (s / cellSum) * 100 : 0;
                  const mPct = cellSum > 0 ? (m / cellSum) * 100 : 0;
                  const dPct = cellSum > 0 ? (dCount / cellSum) * 100 : 0;

                  let offset = 0;
                  const barSegments = [
                    { key: 'created', width: cPct, fillClass: 'fill-sky-600', visible: c > 0 },
                    { key: 'scheduled', width: sPct, fillClass: 'fill-amber-500', visible: s > 0 },
                    { key: 'missed', width: mPct, fillClass: 'fill-rose-500', visible: m > 0 },
                    { key: 'done', width: dPct, fillClass: 'fill-emerald-500', visible: dCount > 0 },
                  ]
                    .filter((seg) => seg.visible)
                    .map((seg) => {
                      const x = offset;
                      offset += seg.width;
                      return { ...seg, x };
                    });

                  const pills = [
                    {
                      key: 'created',
                      show: (matrixStatusFilter === 'all' || matrixStatusFilter === 'created') && c > 0,
                      count: c,
                      pillClass: 'bg-sky-600/15 text-sky-600 border-sky-600/30',
                    },
                    {
                      key: 'scheduled',
                      show: (matrixStatusFilter === 'all' || matrixStatusFilter === 'scheduled') && s > 0,
                      count: s,
                      pillClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
                    },
                    {
                      key: 'missed',
                      show: (matrixStatusFilter === 'all' || matrixStatusFilter === 'missed') && m > 0,
                      count: m,
                      pillClass: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
                    },
                    {
                      key: 'done',
                      show: (matrixStatusFilter === 'all' || matrixStatusFilter === 'done') && dCount > 0,
                      count: dCount,
                      pillClass: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
                    },
                  ].filter((pill) => pill.show);

                  const tooltipTitle = (
                    <div className="text-[11px] leading-snug p-0.5">
                      <div className="font-bold border-b border-neutral-600 pb-0.5 mb-1">
                        Khung giờ {d.hour} - {conf.name}
                      </div>
                      <div>
                        📝 Đã tạo (Created): <strong className="tabular-nums">{c}</strong>
                      </div>
                      <div>
                        📅 Đã hẹn (Scheduled): <strong className="tabular-nums">{s}</strong>
                      </div>
                      <div>
                        ⚠️ Lỡ hẹn (Missed): <strong className="tabular-nums">{m}</strong>
                      </div>
                      <div>
                        ✅ Hoàn thành (Done): <strong className="tabular-nums">{dCount}</strong>
                      </div>
                    </div>
                  );

                  return (
                    <td
                      key={d.hour}
                      onClick={() =>
                        isVisible && onSelectSlot({ hour: d.hour, branchKey: bKey, type: matrixStatusFilter })
                      }
                      className={`py-2 px-1 text-center min-w-[78px] transition-all duration-200 ${
                        isVisible
                          ? `cursor-pointer opacity-100 hover:bg-amber-500/20 ${
                              isDark ? 'bg-slate-800/50 dark:bg-slate-800/50' : 'bg-slate-100/70 dark:bg-slate-800/50'
                            }`
                          : 'cursor-default opacity-20 bg-transparent'
                      }`}
                    >
                      <Tooltip title={tooltipTitle}>
                        {hasData ? (
                          <div className="flex flex-col gap-[5px] items-center w-full">
                            <svg
                              viewBox="0 0 100 6"
                              preserveAspectRatio="none"
                              className={`block w-full h-1.5 rounded-[3px] overflow-hidden ${
                                isDark ? 'bg-slate-700 dark:bg-slate-700' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                              aria-hidden="true"
                            >
                              {barSegments.map((seg) => (
                                <rect
                                  key={seg.key}
                                  x={seg.x}
                                  y={0}
                                  width={seg.width}
                                  height={6}
                                  className={seg.fillClass}
                                />
                              ))}
                            </svg>

                            <div className="flex gap-[3px] flex-wrap justify-center text-[11px]">
                              {pills.map((pill) => (
                                <span
                                  key={pill.key}
                                  className={`border px-1 rounded font-bold tabular-nums leading-4 ${pill.pillClass}`}
                                >
                                  {pill.count}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="opacity-20 text-[11px]">-</span>
                        )}
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
