'use client';

import React from 'react';
import { CheckSquare, ChevronLeft } from 'lucide-react';
import type { MosChatTaskItem } from '@mos-lab/shared';

export interface MobileHeaderThreadBarProps {
  isDark: boolean;
  linkedTask: MosChatTaskItem | null;
  onBackToRoom: () => void;
  onOpenTaskModal?: () => void;
}

export const MobileHeaderThreadBar: React.FC<MobileHeaderThreadBarProps> = ({
  isDark,
  linkedTask,
  onBackToRoom,
  onOpenTaskModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[var(--mos-surface)]/90 backdrop-blur-xl border-b border-[var(--mos-surface-border)] px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2 min-h-[44px] flex items-center justify-between shadow-xs select-none">
      <button
        type="button"
        onClick={onBackToRoom}
        className={`inline-flex items-center gap-1 font-semibold text-sm py-1 pr-2 active:opacity-70 transition-opacity cursor-pointer ${
          isDark ? 'text-amber-400' : 'text-amber-600'
        }`}
      >
        <ChevronLeft className="w-5 h-5 -ml-1" />
        <span>Quay lại</span>
      </button>

      <div className="text-center flex-1 mx-2 min-w-0">
        <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">Luồng thảo luận</h2>
        <p className="text-[11px] text-[var(--mos-text-muted)] leading-none">Trả lời tin nhắn</p>
      </div>

      <div className="flex items-center justify-end min-w-[70px]">
        <button
          type="button"
          onClick={onOpenTaskModal}
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold leading-none transition-all active:scale-95 border cursor-pointer ${
            linkedTask
              ? linkedTask.done
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDark
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-[var(--mos-surface-muted)] hover:opacity-85 text-[var(--mos-text)] border-[var(--mos-surface-border)]'
          }`}
          title={linkedTask ? `Main Task: ${linkedTask.title}` : 'Giao việc cho tin nhắn cha'}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span className="truncate max-w-[70px]">
            {linkedTask ? (linkedTask.done ? 'Đã xong' : 'Việc') : '+ Việc'}
          </span>
        </button>
      </div>
    </header>
  );
};
