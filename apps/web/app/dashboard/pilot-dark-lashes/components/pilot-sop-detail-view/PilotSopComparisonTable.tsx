'use client';

import React from 'react';
import { CheckCircle2, Clock, Compass } from 'lucide-react';
import { DARK_LASHES_SOP_7_STEPS_DETAILED, type PilotSopStepEmpiricalStat } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui/AppIcon';
import { formatSecondsToDisplay } from './pilot-sop-detail-helpers';

interface PilotSopComparisonTableProps {
  stats: Record<number, PilotSopStepEmpiricalStat>;
  onSelectStep: (stepOrder: number) => void;
}

export function PilotSopComparisonTable({ stats, onSelectStep }: PilotSopComparisonTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <AppIcon icon={Compass} size={16} className="text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
            Bảng Thống Kê Đối Chiếu: Thời Gian Tiêu Chuẩn vs Thời Gian Thực Tế Pilot
          </h3>
        </div>
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          * Không lấy thời gian một ca làm định mức chung
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10.5px] font-semibold">
              <th className="py-2.5 px-3">Thứ tự &amp; Bước kỹ thuật</th>
              <th className="py-2.5 px-3">Chuẩn kỹ thuật (Target)</th>
              <th className="py-2.5 px-3">Thực tế TB (Pilot)</th>
              <th className="py-2.5 px-3">Biến thiên thực tế (Min - Max)</th>
              <th className="py-2.5 px-3">Số ca ghi nhận</th>
              <th className="py-2.5 px-3">Nhận định vận hành</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
            {DARK_LASHES_SOP_7_STEPS_DETAILED.map((step) => {
              const st = stats[step.stepOrder];
              const hasEmpirical = Boolean(st && st.completedCount > 0);
              const avgMinutes = hasEmpirical ? Math.round(st.avgDurationSeconds / 60) : null;
              const delta = avgMinutes !== null ? avgMinutes - step.targetMinutes : null;

              return (
                <tr
                  key={step.stepOrder}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => onSelectStep(step.stepOrder)}
                >
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                        {step.stepOrder}
                      </span>
                      <span>{step.name}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                    {step.targetMinutes} phút
                  </td>
                  <td className="py-3 px-3 tabular-nums font-semibold">
                    {hasEmpirical ? (
                      <div className="space-y-1">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatSecondsToDisplay(st.avgDurationSeconds)} ({avgMinutes}p)
                        </span>
                        {/* Visual comparison bar */}
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 rounded-full h-full w-3/5" />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Đang cập nhật</span>
                    )}
                  </td>
                  <td className="py-3 px-3 tabular-nums text-slate-500 dark:text-slate-400">
                    {hasEmpirical ? (
                      <span>
                        {formatSecondsToDisplay(st.minDurationSeconds)} -{' '}
                        {formatSecondsToDisplay(st.maxDurationSeconds)}
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="py-3 px-3 tabular-nums text-slate-600 dark:text-slate-300">
                    {st ? `${st.completedCount} ca hoàn thành` : '0'}
                  </td>
                  <td className="py-3 px-3">
                    {delta !== null ? (
                      delta > 3 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md font-medium">
                          <AppIcon icon={Clock} size={11} /> Thao tác kỹ lưỡng (+{delta}p)
                        </span>
                      ) : delta < -3 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md font-medium">
                          <AppIcon icon={CheckCircle2} size={11} /> Hoàn thành nhanh ({delta}p)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md font-medium">
                          <AppIcon icon={CheckCircle2} size={11} /> Đúng chuẩn thiết kế
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 text-xs">Theo dõi thêm</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
