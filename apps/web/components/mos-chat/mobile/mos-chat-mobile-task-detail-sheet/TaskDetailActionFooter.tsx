'use client';

import React from 'react';
import { Archive, ArchiveRestore, Edit3, Handshake, MessageSquare, Rocket, Trash2 } from 'lucide-react';
import { Popconfirm } from 'antd';
import type { MosChatTaskItem } from '@mos-lab/shared';

interface TaskDetailActionFooterProps {
  task: MosChatTaskItem;
  isDark: boolean;
  isStrictDannySuperAdmin: boolean;
  hasNegotiation: boolean;
  onDispatchMission: (task: MosChatTaskItem) => void;
  onNegotiateDeadline: (task: MosChatTaskItem) => void;
  onEditTask: (task: MosChatTaskItem) => void;
  onGoToSourceMessage?: (task: MosChatTaskItem) => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

export const TaskDetailActionFooter: React.FC<TaskDetailActionFooterProps> = ({
  task,
  isDark,
  isStrictDannySuperAdmin,
  hasNegotiation,
  onDispatchMission,
  onNegotiateDeadline,
  onEditTask,
  onGoToSourceMessage,
  onToggleArchive,
  onDelete,
}) => {
  return (
    <div className="space-y-2 pt-2 border-t border-[var(--mos-surface-border)]">
      {/* Super Admin Danny: Dispatch to mOS Mission (Điều răn UI-009) */}
      {isStrictDannySuperAdmin && !task.mission && (
        <button
          type="button"
          onClick={() => onDispatchMission(task)}
          className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 active:scale-98 transition-transform"
        >
          <Rocket className="w-4 h-4" />
          <span>Chuyển vào mOS Mission (Super Admin Danny)</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Negotiate deadline button */}
        <button
          type="button"
          onClick={() => onNegotiateDeadline(task)}
          className={`py-2 px-3 rounded-xl border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${
            isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700'
          }`}
        >
          <Handshake className="w-3.5 h-3.5" />
          <span>{hasNegotiation ? 'Sửa đề xuất hạn' : 'Xin dời hạn'}</span>
        </button>

        {/* Edit task button */}
        <button
          type="button"
          onClick={() => onEditTask(task)}
          className="py-2 px-3 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text)] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          <Edit3 className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span>Chỉnh sửa</span>
        </button>
      </div>

      {/* Jump to source message if available */}
      {task.sourceMessageId && onGoToSourceMessage && (
        <button
          type="button"
          onClick={() => onGoToSourceMessage(task)}
          className={`w-full py-2 px-3 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-transform ${
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Mở luồng tin nhắn gốc</span>
        </button>
      )}

      {/* Secondary actions: Archive & Delete */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onToggleArchive}
          className="py-1.5 px-3 rounded-xl text-xs font-medium text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          {task.archived ? (
            <>
              <ArchiveRestore className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <span>Khôi phục việc</span>
            </>
          ) : (
            <>
              <Archive className="w-3.5 h-3.5 text-[var(--mos-text-muted)]" />
              <span>Lưu trữ việc</span>
            </>
          )}
        </button>

        <Popconfirm
          title="Xoá công việc này?"
          description="Bạn có chắc chắn muốn xoá vĩnh viễn công việc này không?"
          onConfirm={onDelete}
          okText="Xoá"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <button
            type="button"
            className={`py-1.5 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-transform ${
              isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xoá việc</span>
          </button>
        </Popconfirm>
      </div>
    </div>
  );
};
