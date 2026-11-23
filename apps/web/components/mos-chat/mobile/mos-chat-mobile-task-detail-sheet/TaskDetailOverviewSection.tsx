'use client';

import React from 'react';
import { Calendar, CheckSquare, Clock, PenLine, Send, Square, UserCheck } from 'lucide-react';
import dayjs from 'dayjs';
import type { MosChatStaffMember, MosChatTaskItem } from '@mos-lab/shared';
import { MosChatAvatar } from '../../MosChatAvatar';
import { formatTaskCountdown, resolveTaskParticipants } from './taskDetailHelpers';
import type { TaskDeadlineState } from './taskDetailTypes';

interface TaskDetailOverviewSectionProps {
  task: MosChatTaskItem;
  deadlineState: TaskDeadlineState;
  staffDirectory: MosChatStaffMember[];
  isDark: boolean;
  onToggleDone: () => void;
}

export const TaskDetailOverviewSection: React.FC<TaskDetailOverviewSectionProps> = ({
  task,
  deadlineState,
  staffDirectory,
  isDark,
  onToggleDone,
}) => {
  const { deadlineDate, isOverdue, isDueSoon } = deadlineState;
  const { creator, assigner, assignee } = resolveTaskParticipants(task);

  const deadlineStatusColor = isOverdue
    ? isDark
      ? 'text-rose-400'
      : 'text-rose-600'
    : isDueSoon
      ? isDark
        ? 'text-amber-400'
        : 'text-amber-600'
      : 'text-[var(--mos-text-muted)]';

  return (
    <>
      {/* Status & Completion Banner */}
      <div
        onClick={onToggleDone}
        role="button"
        tabIndex={0}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors active:scale-[0.99] ${
          task.done
            ? isDark
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] text-[var(--mos-text)]'
        }`}
      >
        <div className="flex items-center gap-3">
          {task.done ? (
            <CheckSquare
              className={`w-6 h-6 shrink-0 ${
                isDark ? 'text-emerald-400 fill-emerald-400/20' : 'text-emerald-600 fill-emerald-500/15'
              }`}
            />
          ) : (
            <Square className="w-6 h-6 text-[var(--mos-text-muted)] shrink-0" />
          )}
          <div>
            <p className="text-sm font-bold">{task.done ? 'Đã hoàn thành công việc' : 'Đang thực hiện'}</p>
            <p className="text-[11px] text-[var(--mos-text-muted)]">
              {task.done ? 'Chạm vào đây để mở lại công việc' : 'Chạm vào đây để đánh dấu hoàn thành'}
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
            task.done
              ? isDark
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-emerald-100 text-emerald-700 border-emerald-300'
              : isOverdue
                ? isDark
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
                : isDueSoon
                  ? isDark
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                  : isDark
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {task.done ? 'Hoàn thành' : isOverdue ? 'Quá hạn' : isDueSoon ? 'Sắp đến hạn' : 'Đang làm'}
        </span>
      </div>

      {/* Task Title */}
      <div>
        <h3
          className={`text-base font-bold leading-relaxed break-words ${
            task.done ? 'line-through text-[var(--mos-text-muted)]' : 'text-[var(--mos-text)]'
          }`}
        >
          {task.title}
        </h3>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-3 gap-2 bg-[var(--mos-surface)] p-3 rounded-2xl border border-[var(--mos-surface-border)] text-xs">
        {/* Người tạo */}
        <div className="space-y-1 min-w-0" title={`Người tạo: ${creator}`}>
          <div
            className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`}
          >
            <PenLine className="w-2.5 h-2.5 shrink-0" />
            <span>Người tạo</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--mos-text)] font-medium min-w-0">
            <MosChatAvatar size="xs" name={creator} staffDirectory={staffDirectory} />
            <span className="truncate text-[11px]">{creator}</span>
          </div>
        </div>

        {/* Người giao (Giao bởi) */}
        <div className="space-y-1 min-w-0" title={`Người giao: ${assigner}`}>
          <div
            className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-sky-400' : 'text-sky-700'
            }`}
          >
            <Send className="w-2.5 h-2.5 shrink-0" />
            <span>Giao bởi</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--mos-text)] font-medium min-w-0">
            <MosChatAvatar size="xs" name={assigner} staffDirectory={staffDirectory} />
            <span className="truncate text-[11px]">{assigner}</span>
          </div>
        </div>

        {/* Người nhận */}
        <div className="space-y-1 min-w-0" title={`Người nhận: ${assignee}`}>
          <div
            className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-amber-400' : 'text-amber-700'
            }`}
          >
            <UserCheck className="w-2.5 h-2.5 shrink-0" />
            <span>Người nhận</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--mos-text)] font-medium min-w-0">
            <MosChatAvatar size="xs" name={assignee} staffId={task.assigneeId} staffDirectory={staffDirectory} />
            <span className={`truncate text-[11px] ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{assignee}</span>
          </div>
        </div>

        {/* Deadline */}
        <div className="space-y-1 col-span-3 pt-2 border-t border-[var(--mos-surface-border)]">
          <span className="text-[10px] font-semibold text-[var(--mos-text-muted)] uppercase tracking-wider">
            Hạn hoàn thành (Deadline)
          </span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[var(--mos-text)] font-medium tabular-nums">
              <Clock className={`w-3.5 h-3.5 shrink-0 ${deadlineStatusColor}`} />
              <span>{deadlineDate ? dayjs(deadlineDate).format('HH:mm DD/MM/YYYY') : 'Không giới hạn'}</span>
            </div>
            {deadlineDate && !task.done && (
              <span className={`text-[11px] font-bold tabular-nums ${deadlineStatusColor}`}>
                ({formatTaskCountdown(deadlineDate)})
              </span>
            )}
          </div>
        </div>

        {/* Created At */}
        <div className="space-y-1 col-span-3 pt-1 border-t border-[var(--mos-surface-border)]">
          <span className="text-[10px] font-semibold text-[var(--mos-text-muted)] uppercase tracking-wider">
            Ngày tạo việc
          </span>
          <div className="flex items-center gap-1.5 text-[var(--mos-text-muted)] tabular-nums">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{dayjs(task.createdAt).format('HH:mm DD/MM/YYYY')}</span>
          </div>
        </div>
      </div>
    </>
  );
};
