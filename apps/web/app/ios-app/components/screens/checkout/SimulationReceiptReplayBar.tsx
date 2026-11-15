'use client';

import React from 'react';
import { FlaskConical, RotateCcw, BarChart3, History } from 'lucide-react';
import { useTheme } from '../../../../../context/ThemeContext';

interface SimulationReceiptReplayBarProps {
  bookingId: number;
  attemptCount?: number;
  isReadOnlyMentorView?: boolean;
  isBusy?: boolean;
  onRevertConsultation: (bookingId: number) => void;
  onOpenHistory: (bookingId: number) => void;
  onResetToIncoming: (bookingId: number) => void;
}

export function SimulationReceiptReplayBar({
  bookingId,
  attemptCount = 1,
  isReadOnlyMentorView = false,
  isBusy = false,
  onRevertConsultation,
  onOpenHistory,
  onResetToIncoming,
}: SimulationReceiptReplayBarProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`rounded-2xl p-3 border space-y-2.5 ${
        isDark ? 'bg-amber-950/35 border-amber-500/40 text-amber-100' : 'bg-amber-50 border-amber-300 text-amber-950'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-500">
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          <span className="tabular-nums">MÔ PHỎNG HOÀN TẤT · PA #{Math.max(1, attemptCount)}</span>
        </div>
        <button
          type="button"
          onClick={() => onOpenHistory(bookingId)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold border cursor-pointer transition-all ${
            isDark ? 'bg-neutral-900 border-neutral-700 text-amber-300' : 'bg-white border-amber-300 text-amber-900'
          }`}
        >
          <BarChart3 className="w-3 h-3" />
          <span>So sánh PA</span>
        </button>
      </div>

      {isReadOnlyMentorView ? (
        <div className={`text-[11px] font-semibold ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
          Bạn đang xem ở chế độ Mentor/Admin (chỉ đọc bài thực hành của Chuyên Viên).
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRevertConsultation(bookingId)}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-[12px] flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Thử lại kịch bản tư vấn (Giữ đo mi 7/7)</span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onResetToIncoming(bookingId)}
            className={`w-full py-2 px-3 rounded-xl border font-bold text-[11.5px] flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer disabled:opacity-60 ${
              isDark
                ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
                : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Reset khách về Bước 1 (Chờ đón)</span>
          </button>
        </div>
      )}
    </div>
  );
}
