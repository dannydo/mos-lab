'use client';

import React from 'react';
import { CheckCircle2, Handshake, XCircle } from 'lucide-react';
import dayjs from 'dayjs';
import type { MosChatTaskItem } from '@mos-lab/shared';
import { formatTaskCountdown } from './taskDetailHelpers';

interface TaskDetailNegotiationBannerProps {
  task: MosChatTaskItem;
  isDark: boolean;
  canApproveNegotiation: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const TaskDetailNegotiationBanner: React.FC<TaskDetailNegotiationBannerProps> = ({
  task,
  isDark,
  canApproveNegotiation,
  onAccept,
  onReject,
}) => {
  if (!task.negotiatedDeadline) return null;

  return (
    <div
      className={`p-3.5 rounded-2xl border space-y-2.5 ${
        isDark ? 'bg-amber-950/30 border-amber-500/40' : 'bg-amber-50 border-amber-300'
      }`}
    >
      <div className={`flex items-center gap-2 font-bold text-xs ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
        <Handshake className="w-4 h-4 shrink-0" />
        <span>Yêu cầu thương lượng dời hạn chót</span>
      </div>

      <div className="space-y-1 text-xs">
        <p className="text-[var(--mos-text)]">
          <span className="text-[var(--mos-text-muted)]">Đề xuất hạn mới:</span>{' '}
          <strong className={`tabular-nums font-bold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
            {dayjs(task.negotiatedDeadline).format('HH:mm DD/MM/YYYY')}
          </strong>{' '}
          <span className="text-[11px] text-[var(--mos-text-muted)] tabular-nums">
            ({formatTaskCountdown(task.negotiatedDeadline)})
          </span>
        </p>

        {task.negotiationNote && (
          <p className="text-[var(--mos-text)] bg-[var(--mos-surface)] p-2 rounded-xl border border-[var(--mos-surface-border)] italic text-[11px]">
            &ldquo;{task.negotiationNote}&rdquo;
          </p>
        )}

        <p className="text-[10px] text-[var(--mos-text-muted)]">
          Gửi bởi <strong className="text-[var(--mos-text)]">{task.negotiatedBy || 'Người nhận'}</strong>
          {task.negotiatedAt && (
            <span className="tabular-nums"> vào lúc {dayjs(task.negotiatedAt).format('HH:mm DD/MM')}</span>
          )}
        </p>
      </div>

      {/* Action buttons for creator / Super Admin */}
      {canApproveNegotiation ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Duyệt dời hạn</span>
          </button>

          <button
            type="button"
            onClick={onReject}
            className={`flex-1 py-1.5 px-3 rounded-xl bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform ${
              isDark ? 'text-rose-400' : 'text-rose-600'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Từ chối</span>
          </button>
        </div>
      ) : (
        <p className={`text-[10px] font-medium ${isDark ? 'text-amber-400/90' : 'text-amber-700'}`}>
          ⏳ Đang chờ người giao việc ({task.creatorName || 'người tạo'}) phê duyệt đề xuất này.
        </p>
      )}
    </div>
  );
};
