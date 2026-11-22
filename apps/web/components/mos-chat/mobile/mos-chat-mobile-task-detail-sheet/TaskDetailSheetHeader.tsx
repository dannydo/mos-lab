'use client';

import React from 'react';
import { Hash, X } from 'lucide-react';
import type { MosChatTaskPriority } from '@mos-lab/shared';

interface TaskDetailSheetHeaderProps {
  taskCode: string;
  conversationName?: string;
  priority?: MosChatTaskPriority;
  isDark: boolean;
  onClose: () => void;
}

export const TaskDetailSheetHeader: React.FC<TaskDetailSheetHeaderProps> = ({
  taskCode,
  conversationName,
  priority,
  isDark,
  onClose,
}) => {
  return (
    <>
      {/* Drag handle pill */}
      <div className="pt-3 pb-1 flex justify-center">
        <div className="w-10 h-1 rounded-full bg-[var(--mos-surface-border-strong)]" />
      </div>

      {/* Sheet Header */}
      <div className="px-5 py-3 border-b border-[var(--mos-surface-border)] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[var(--mos-surface-muted)] border border-amber-500/25 flex items-center gap-1 shrink-0 ${
              isDark ? 'text-amber-400' : 'text-amber-700'
            }`}
          >
            <Hash className={`w-3 h-3 ${isDark ? 'text-amber-500' : 'text-amber-600'}`} />
            <span>{taskCode}</span>
          </span>

          {conversationName && (
            <span className="text-[11px] font-medium text-[var(--mos-text-muted)] truncate max-w-[140px]">
              {conversationName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          {priority === 'URGENT' && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-500/30 ${
                isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-700'
              }`}
            >
              P0 · Khẩn cấp
            </span>
          )}
          {priority === 'HIGH' && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/30 ${
                isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700'
              }`}
            >
              P1 · Ưu tiên cao
            </span>
          )}
          {(!priority || priority === 'NORMAL') && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border border-[var(--mos-surface-border)]">
              P2 · Bình thường
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] active:scale-95 transition-transform"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
