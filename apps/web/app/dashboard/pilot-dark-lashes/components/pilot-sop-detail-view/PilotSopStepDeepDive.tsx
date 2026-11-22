'use client';

import React from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { PilotSopStepEmpiricalStat } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui/AppIcon';
import { formatSecondsToDisplay } from './pilot-sop-detail-helpers';

interface PilotSopStepDeepDiveProps {
  stepOrder: number;
  stat?: PilotSopStepEmpiricalStat;
  isOpen: boolean;
  onToggle: (stepOrder: number) => void;
  onViewSessionId?: (sessionId: number) => void;
}

export function PilotSopStepDeepDive({
  stepOrder,
  stat,
  isOpen,
  onToggle,
  onViewSessionId,
}: PilotSopStepDeepDiveProps) {
  return (
    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
      <button
        type="button"
        onClick={() => onToggle(stepOrder)}
        className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
        data-testid={`deep-dive-toggle-${stepOrder}`}
      >
        <span className="flex items-center gap-2">
          <AppIcon icon={FileText} size={14} className="text-indigo-600" />
          <span>Dữ liệu Chuyên Sâu &amp; Thống Kê Đo Kiểm Pilot (Deep Dive)</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
          <span>{isOpen ? 'Thu gọn thông số' : 'Mở rộng thông số chuyên sâu'}</span>
          <AppIcon icon={isOpen ? ChevronUp : ChevronDown} size={13} />
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 p-4 rounded-xl border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Đo kiểm thời gian thực tế qua bộ đếm tự động:
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums">
              Số ca ghi nhận: <strong>{stat?.completedCount ?? 0} ca</strong> | Min:{' '}
              {formatSecondsToDisplay(stat?.minDurationSeconds)} | Max:{' '}
              {formatSecondsToDisplay(stat?.maxDurationSeconds)}
            </span>
          </div>

          {stat && stat.sampleSessions && stat.sampleSessions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {stat.sampleSessions.map((samp, sIdx) => (
                <div
                  key={`${samp.sessionId}-${sIdx}`}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex items-center justify-between gap-2 hover:border-emerald-500/40 transition-colors shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                      Ca #{samp.sessionId} · {samp.customerName}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {samp.technicianName} · {samp.sessionDate || 'Gần đây'}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatSecondsToDisplay(samp.durationSeconds)}
                    </span>
                    {onViewSessionId && (
                      <button
                        type="button"
                        onClick={() => onViewSessionId(samp.sessionId)}
                        className="block text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium mt-0.5 cursor-pointer"
                      >
                        Xem ca gốc →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 italic">
              Chưa có dữ liệu ca mẫu cho bước này hoặc đang được cập nhật thêm.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
