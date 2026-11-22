'use client';

import React from 'react';
import { AlarmClockPlus, Check, CheckCircle2, Clock, Plus } from 'lucide-react';
import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import type { MosChatMessage, MosChatTaskItem, SafeAny } from '@mos-lab/shared';
import type { DockTaskFilterScope } from './dockedWindowTypes';

dayjs.extend(relativeTime);
dayjs.locale('vi');

interface DockedTasksViewProps {
  cid: string;
  convTasks: MosChatTaskItem[];
  pendingConvTasksCount: number;
  currentTaskFilter: DockTaskFilterScope;
  filteredTasks: MosChatTaskItem[];
  quickTaskValue: string;
  surfaceRaised: string;
  borderColor: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  token: SafeAny;
  onSelectFilter: (cid: string, scope: DockTaskFilterScope) => void;
  onOpenTaskModal: (m: MosChatMessage | null) => void;
  onChangeQuickTaskInput: (cid: string, value: string) => void;
  onQuickCreateTask?: (params: { conversationId: string; title: string }) => Promise<void> | void;
  onToggleTaskDone?: (taskId: string) => Promise<void> | void;
}

export const DockedTasksView: React.FC<DockedTasksViewProps> = ({
  cid,
  convTasks,
  pendingConvTasksCount,
  currentTaskFilter,
  filteredTasks,
  quickTaskValue,
  surfaceRaised,
  borderColor,
  accentColor,
  accentSoftBg,
  accentBorder,
  token,
  onSelectFilter,
  onOpenTaskModal,
  onChangeQuickTaskInput,
  onQuickCreateTask,
  onToggleTaskDone,
}) => {
  const getFilterBtnStyle = (scope: DockTaskFilterScope): React.CSSProperties => ({
    background: currentTaskFilter === scope ? accentSoftBg || 'rgba(212, 168, 75, 0.2)' : 'transparent',
    color: currentTaskFilter === scope ? accentColor || '#d4a84b' : token.colorTextSecondary,
    border:
      currentTaskFilter === scope
        ? `1px solid ${accentBorder || 'rgba(212, 168, 75, 0.4)'}`
        : `1px solid ${borderColor || 'transparent'}`,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-150">
      {/* Filter Pills & Add Action Bar */}
      <div
        className="p-2.5 border-b flex items-center justify-between gap-2"
        style={{
          background: surfaceRaised ? `${surfaceRaised}66` : 'rgba(255,255,255,0.02)',
          borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-center gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => onSelectFilter(cid, 'pending')}
            className="px-2.5 py-1 rounded-full cursor-pointer transition-all"
            style={getFilterBtnStyle('pending')}
          >
            Cần làm ({pendingConvTasksCount})
          </button>
          <button
            type="button"
            onClick={() => onSelectFilter(cid, 'completed')}
            className="px-2.5 py-1 rounded-full cursor-pointer transition-all"
            style={getFilterBtnStyle('completed')}
          >
            Đã xong ({convTasks.length - pendingConvTasksCount})
          </button>
          <button
            type="button"
            onClick={() => onSelectFilter(cid, 'all')}
            className="px-2.5 py-1 rounded-full cursor-pointer transition-all"
            style={getFilterBtnStyle('all')}
          >
            Tất cả
          </button>
        </div>

        <Tooltip title="Mở modal tạo task đầy đủ (giao việc, hẹn giờ)">
          <button
            type="button"
            onClick={() => onOpenTaskModal(null)}
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10 text-amber-400"
          >
            <AlarmClockPlus size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Quick Add Task Row (Apple Reminders Input) */}
      <div className="px-3 py-2 border-b" style={{ borderColor: borderColor || 'rgba(255, 255, 255, 0.08)' }}>
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-amber-400 shrink-0" />
          <input
            type="text"
            value={quickTaskValue}
            onChange={(e) => onChangeQuickTaskInput(cid, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = quickTaskValue.trim();
                if (!val) return;
                if (onQuickCreateTask) {
                  onQuickCreateTask({ conversationId: cid, title: val });
                }
                onChangeQuickTaskInput(cid, '');
              }
            }}
            placeholder="Thêm việc mới... (Nhấn Enter để tạo)"
            className="flex-1 text-[12px] bg-transparent outline-none focus:outline-none focus-visible:outline-none"
            style={{ color: token.colorText, outline: 'none', boxShadow: 'none' }}
          />
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[12px] py-10">
            <CheckCircle2 size={32} className="mb-2 opacity-50" style={{ color: token.colorTextSecondary }} />
            <p className="font-semibold" style={{ color: token.colorText }}>
              Không có tác vụ nào
            </p>
            <p className="text-[11px]" style={{ color: token.colorTextSecondary }}>
              Mọi việc đã được xử lý gọn gàng!
            </p>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const deadline = t.dueAt || t.deadline;
            const isOverdue = deadline && !t.done && dayjs(deadline).isBefore(dayjs());
            return (
              <div
                key={t.id}
                className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                  t.done
                    ? 'bg-white/5 border-white/5 opacity-60'
                    : isOverdue
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-white/5 border-white/10 hover:border-amber-500/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleTaskDone && onToggleTaskDone(t.id)}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer mt-0.5 transition-all ${
                    t.done
                      ? 'bg-amber-500 border-amber-500 text-neutral-950'
                      : 'border-amber-400/50 hover:border-amber-400 hover:bg-amber-400/10'
                  }`}
                >
                  {t.done && <Check size={11} strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[12.5px] leading-snug font-medium break-words ${
                      t.done ? 'line-through opacity-60' : ''
                    }`}
                    style={{ color: t.done ? token.colorTextSecondary : token.colorText }}
                  >
                    {t.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                    {t.assigneeName && (
                      <span className="font-semibold text-amber-400/90 truncate max-w-[120px]">@{t.assigneeName}</span>
                    )}
                    {deadline && (
                      <span
                        className={`inline-flex items-center gap-0.5 tabular-nums ${
                          isOverdue ? 'text-rose-400 font-bold' : 'text-neutral-400'
                        }`}
                      >
                        <Clock size={10} />
                        {dayjs(deadline).fromNow()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
