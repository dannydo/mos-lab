'use client';

import React from 'react';
import { Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { formatExamTimer } from './rubric-config';

interface ExamStickyHeaderProps {
  candidateName: string;
  examinerName: string;
  secondsLeft: number;
  timerRunning: boolean;
  timerColorClass: string;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onClose?: () => void;
}

export function ExamStickyHeader({
  candidateName,
  examinerName,
  secondsLeft,
  timerRunning,
  timerColorClass,
  onToggleTimer,
  onResetTimer,
  onClose,
}: ExamStickyHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              iPhone Coi Thi 1-Chạm
            </span>
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-slate-50 m-0 leading-tight">{candidateName}</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
            Giám khảo: <strong>{examinerName}</strong> · Đề Thám Q.1
          </p>
        </div>

        {/* Built-in Countdown Timer */}
        <div className="flex flex-col items-end">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-black tabular-nums transition-all ${timerColorClass}`}
            data-testid="practical-exam-timer"
          >
            <Clock size={16} />
            <span>{formatExamTimer(secondsLeft)}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <button
              type="button"
              onClick={onToggleTimer}
              className="p-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title={timerRunning ? 'Tạm dừng' : 'Bắt đầu'}
              data-testid="btn-toggle-timer"
            >
              {timerRunning ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              type="button"
              onClick={onResetTimer}
              className="p-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Đặt lại 70 phút"
              data-testid="btn-reset-timer"
            >
              <RotateCcw size={12} />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
