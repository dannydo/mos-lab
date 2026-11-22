'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { Popover, Tooltip } from 'antd';
import type { MosChatTaskChecklistItem } from '@mos-lab/shared';
import type { ChecklistDeadlineMeta, ChecklistQuickDeadlineOption } from './checklistTypes';

export interface ChecklistDeadlinePopoverProps {
  item: MosChatTaskChecklistItem;
  deadlineMeta: ChecklistDeadlineMeta | null;
  quickDeadlines: ChecklistQuickDeadlineOption[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDeadline: (deadlineIso: string | null) => void;
}

export const ChecklistDeadlinePopover: React.FC<ChecklistDeadlinePopoverProps> = ({
  item,
  deadlineMeta,
  quickDeadlines,
  isOpen,
  onOpenChange,
  onSelectDeadline,
}) => {
  const defaultDateInput = (() => {
    if (!item.deadline) return '';
    const parsed = new Date(item.deadline);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
  })();

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={isOpen}
      onOpenChange={onOpenChange}
      content={
        <div className="w-52 p-1 space-y-1.5 text-xs">
          <div className="font-bold text-slate-700 dark:text-slate-200 px-1 py-0.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span>Đặt hạn mục việc</span>
            {item.deadline && (
              <button
                type="button"
                onClick={() => onSelectDeadline(null)}
                className="text-[10px] text-rose-500 hover:underline cursor-pointer font-semibold"
              >
                Xoá hạn
              </button>
            )}
          </div>
          <div className="space-y-1">
            {quickDeadlines.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => onSelectDeadline(opt.value)}
                className="w-full text-left px-2 py-1 rounded hover:bg-amber-500/15 hover:text-amber-500 transition-colors cursor-pointer text-[11px] font-medium"
              >
                📅 {opt.label}
              </button>
            ))}
          </div>
          <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
            <div className="text-[10px] text-slate-400 mb-1 px-1">Hoặc chọn ngày cụ thể:</div>
            <input
              type="date"
              aria-label="Chọn ngày hạn cụ thể"
              defaultValue={defaultDateInput}
              onChange={(e) => {
                if (e.target.value) {
                  const d = new Date(`${e.target.value}T18:00:00`);
                  if (!isNaN(d.getTime())) {
                    onSelectDeadline(d.toISOString());
                  }
                }
              }}
              className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-[11px]"
            />
          </div>
        </div>
      }
    >
      {deadlineMeta ? (
        <Tooltip title={`Hạn mục việc: ${deadlineMeta.fullLabel} (Bấm để đổi hạn)`}>
          <button
            type="button"
            aria-label={`Đặt hạn cho mục ${item.title}`}
            className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold tabular-nums inline-flex items-center gap-0.5 cursor-pointer transition-all border ${
              item.done
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : deadlineMeta.isOverdue
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : deadlineMeta.isDueSoon
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-violet-500/12 text-violet-400 border-violet-500/25'
            }`}
          >
            <Calendar size={9} className="shrink-0" />
            <span>{deadlineMeta.label}</span>
          </button>
        </Tooltip>
      ) : (
        <Tooltip title="Đặt hạn chót cho mục này">
          <button
            type="button"
            aria-label={`Đặt hạn cho mục ${item.title}`}
            className="opacity-75 hover:opacity-100 p-1 rounded text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 cursor-pointer transition-all"
          >
            <Calendar size={11} />
          </button>
        </Tooltip>
      )}
    </Popover>
  );
};
