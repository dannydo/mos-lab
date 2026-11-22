'use client';

import React from 'react';
import { CheckCircle2, CheckSquare, Pencil, Square } from 'lucide-react';
import dayjs from 'dayjs';
import type {
  MosChatMessage,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatThreadReply,
  UpdateMosChatTaskRequest,
} from '@mos-lab/shared';
import { MosChatAvatar } from '../MosChatAvatar';
import { MosChatThreadChecklist } from '../components/MosChatThreadChecklist';

export interface MosChatMobileThreadParentTaskCardProps {
  linkedTask: MosChatTaskItem | null;
  liveThreadMsg: MosChatMessage | null;
  staffDirectory: MosChatStaffMember[];
  isDark: boolean;
  toggleTaskDone: (taskId: string, done: boolean) => SafeAny;
  updateTask: (taskId: string, payload: UpdateMosChatTaskRequest) => SafeAny;
  onOpenTaskModal?: (params?: {
    initialTitle?: string;
    sourceMsg?: MosChatMessage | null;
    existingTask?: MosChatTaskItem | null;
    sourceReply?: MosChatThreadReply | null;
    isNew?: boolean;
  }) => void;
}

export const MosChatMobileThreadParentTaskCard: React.FC<MosChatMobileThreadParentTaskCardProps> = ({
  linkedTask,
  liveThreadMsg,
  staffDirectory,
  isDark,
  toggleTaskDone,
  updateTask,
  onOpenTaskModal,
}) => {
  if (!linkedTask) {
    return (
      <div className="mt-2.5 pt-2 border-t border-[var(--mos-surface-border)] flex items-center justify-between">
        <span className="text-[11px] text-[var(--mos-text-muted)]">Chưa gắn công việc chính</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTaskModal?.({
              initialTitle: liveThreadMsg?.text.slice(0, 100) || '',
              sourceMsg: liveThreadMsg,
              existingTask: null,
            });
          }}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 active:scale-95 transition-all ${
            isDark ? 'text-emerald-400' : 'text-emerald-700'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>+ Giao việc cho tin nhắn này</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-2.5 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:border-[var(--mos-surface-border-strong)] transition-colors shadow-sm">
      <div
        className="flex items-start gap-2.5 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onOpenTaskModal?.({
            sourceMsg: liveThreadMsg,
            existingTask: linkedTask,
          });
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggleTaskDone(linkedTask.id, !linkedTask.done);
          }}
          className={`mt-0.5 p-1 rounded-lg hover:bg-[var(--mos-surface)] text-[var(--mos-text-muted)] active:scale-90 transition-transform ${
            isDark ? 'hover:text-emerald-400' : 'hover:text-emerald-600'
          }`}
          aria-label={linkedTask.done ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
        >
          {linkedTask.done ? (
            <CheckCircle2
              className={`w-5 h-5 fill-emerald-500/20 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
            />
          ) : (
            <Square className="w-5 h-5 text-[var(--mos-text-muted)]" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>Main Task</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                linkedTask.priority === 'URGENT'
                  ? `bg-rose-500/20 border border-rose-500/30 ${isDark ? 'text-rose-300' : 'text-rose-700'}`
                  : linkedTask.priority === 'HIGH'
                    ? `bg-amber-500/20 border border-amber-500/30 ${isDark ? 'text-amber-300' : 'text-amber-800'}`
                    : 'bg-[var(--mos-surface)] text-[var(--mos-text-muted)] border border-[var(--mos-surface-border)]'
              }`}
            >
              {linkedTask.priority === 'URGENT' ? 'Khẩn' : linkedTask.priority === 'HIGH' ? 'Cao' : 'Thường'}
            </span>
          </div>

          <p
            className={`text-xs font-semibold leading-snug line-clamp-2 ${linkedTask.done ? 'line-through text-[var(--mos-text-muted)]' : 'text-[var(--mos-text)]'}`}
          >
            {linkedTask.title}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-[var(--mos-text-muted)]">
            <span className="flex items-center gap-1.5 text-[var(--mos-text)] font-medium">
              <MosChatAvatar
                size="xs"
                staffId={linkedTask.assigneeId}
                name={linkedTask.assigneeName || 'Chưa gán'}
                staffDirectory={staffDirectory}
              />
              <span>{linkedTask.assigneeName || 'Chưa gán'}</span>
            </span>
            {(linkedTask.dueAt || linkedTask.deadline) && (
              <span
                className={`tabular-nums ${
                  !linkedTask.done && dayjs(linkedTask.dueAt || linkedTask.deadline).isBefore(dayjs())
                    ? `${isDark ? 'text-rose-400' : 'text-rose-600'} font-semibold`
                    : 'text-[var(--mos-text-muted)]'
                }`}
              >
                ⏱️ {dayjs(linkedTask.dueAt || linkedTask.deadline).format('HH:mm DD/MM')}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTaskModal?.({
              sourceMsg: liveThreadMsg,
              existingTask: linkedTask,
            });
          }}
          className="p-1 rounded-lg hover:bg-[var(--mos-surface)] text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-all"
          aria-label="Chỉnh sửa Main Task"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {liveThreadMsg && (
        <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
          <MosChatThreadChecklist
            task={linkedTask}
            activeThreadMessage={liveThreadMsg}
            onUpdateTask={updateTask}
            staffList={staffDirectory || []}
            onToggleChecklistItem={async (itemId) => {
              await updateTask(linkedTask.id, {
                checklistAction: 'toggle',
                checklistItemId: itemId,
              });
            }}
            onAddChecklistItem={async (title, sourceReplyId) => {
              await updateTask(linkedTask.id, {
                checklistAction: 'add',
                checklistItem: { title, sourceReplyId: sourceReplyId || null },
              });
            }}
            onDeleteChecklistItem={async (itemId) => {
              await updateTask(linkedTask.id, {
                checklistAction: 'delete',
                checklistItemId: itemId,
              });
            }}
            onScrollToReply={(replyId) => {
              const el = document.getElementById(`reply-bubble-${replyId}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-amber-500');
                setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 2000);
              }
            }}
            isDark={isDark}
            isMobile={true}
          />
        </div>
      )}
    </div>
  );
};
