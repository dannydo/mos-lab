'use client';

import React from 'react';
import { BookOpen, Clock, Pause, Play } from 'lucide-react';
import { formatTheoryExamTimer } from './theory-exam-questions';

interface TheoryExamBannerProps {
  secondsLeft: number;
  timerRunning: boolean;
  onToggleTimer: () => void;
}

export function TheoryExamBanner({ secondsLeft, timerRunning, onToggleTimer }: TheoryExamBannerProps) {
  return (
    <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <span className="font-bold text-blue-900 dark:text-blue-200 text-xs flex items-center gap-1.5">
          <BookOpen size={14} className="text-blue-500" />
          <span>Đề Thi 20 Câu (17 Trắc Nghiệm 68đ + 3 Tự Luận 32đ)</span>
        </span>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
          Đánh giá kiến thức hóa sinh, kiểm soát trục cá heo, dải pH và quy trình ứng phó khẩn.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-black tabular-nums ${
            secondsLeft <= 300
              ? 'text-rose-600 bg-rose-500/10 border-rose-500/30 animate-pulse'
              : 'text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30'
          }`}
        >
          <Clock size={14} />
          <span>{formatTheoryExamTimer(secondsLeft)}</span>
        </div>

        <button
          type="button"
          onClick={onToggleTimer}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          title={timerRunning ? 'Tạm dừng' : 'Tiếp tục'}
        >
          {timerRunning ? <Pause size={13} /> : <Play size={13} />}
        </button>
      </div>
    </div>
  );
}
