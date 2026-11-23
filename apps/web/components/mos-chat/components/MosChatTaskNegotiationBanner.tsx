'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Check, Handshake, X } from 'lucide-react';
import type { MosChatTaskItem } from '@mos-lab/shared';
import { formatRelativeTime } from '../../../lib/date-utils';

export interface MosChatTaskNegotiationBannerProps {
  task: MosChatTaskItem;
  isDark: boolean;
  canApproveNegotiation: boolean;
  onAcceptNegotiatedDeadline: (task: MosChatTaskItem) => void;
  onRejectNegotiatedDeadline: (task: MosChatTaskItem) => void;
}

export const MosChatTaskNegotiationBanner: React.FC<MosChatTaskNegotiationBannerProps> = ({
  task,
  isDark,
  canApproveNegotiation,
  onAcceptNegotiatedDeadline,
  onRejectNegotiatedDeadline,
}) => {
  return (
    <div
      className="p-2.5 rounded-xl text-left space-y-2"
      style={{
        background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
        border: '1.5px dashed rgba(245, 158, 11, 0.5)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-[11.5px]">
          <Handshake size={14} className="shrink-0" />
          <span>Đề xuất thương lượng dời hạn chót</span>
        </div>
        <span className="text-[10px] text-slate-400 tabular-nums">
          {task.negotiatedAt ? dayjs(task.negotiatedAt).format('HH:mm DD/MM') : ''}
        </span>
      </div>

      <div className="text-[11.5px] space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-slate-400">Đề xuất hạn mới:</span>
          <span className="font-extrabold text-amber-400 tabular-nums">
            {dayjs(task.negotiatedDeadline).format('HH:mm DD/MM/YYYY')}
          </span>
          {(() => {
            const relText = formatRelativeTime(task.negotiatedDeadline);
            if (!relText) return null;
            return <span className="text-[10px] text-amber-500 font-semibold">({relText})</span>;
          })()}
        </div>
        {task.negotiationNote && (
          <div className="text-slate-300 italic bg-black/20 p-1.5 rounded-lg text-[11px] leading-relaxed">
            &ldquo;{task.negotiationNote}&rdquo;
          </div>
        )}
        <div className="text-[10.5px] text-slate-400">
          Bởi: <span className="font-semibold text-slate-300">{task.negotiatedBy || 'Người nhận task'}</span>
        </div>
      </div>

      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
        {canApproveNegotiation ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAcceptNegotiatedDeadline(task)}
              className="h-6 px-2.5 rounded-lg text-[10.5px] font-extrabold inline-flex items-center gap-1 cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
            >
              <Check size={12} strokeWidth={3} />
              <span>Duyệt dời hạn</span>
            </button>
            <button
              type="button"
              onClick={() => onRejectNegotiatedDeadline(task)}
              className="h-6 px-2.5 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
            >
              <X size={12} />
              <span>Từ chối</span>
            </button>
          </div>
        ) : (
          <span className="text-[10.5px] text-amber-400 italic">
            Đang chờ người giao ({task.creatorName || 'người tạo'}) xét duyệt...
          </span>
        )}
      </div>
    </div>
  );
};
