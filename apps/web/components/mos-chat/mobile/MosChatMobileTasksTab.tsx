'use client';

import React, { useState } from 'react';
import { CheckSquare, Square, Clock, User, Plus, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useMosChat } from '../context/MosChatContext';

export interface MosChatMobileTasksTabProps {
  onOpenCreateTaskModal: () => void;
}

export const MosChatMobileTasksTab: React.FC<MosChatMobileTasksTabProps> = ({ onOpenCreateTaskModal }) => {
  const { tasks, toggleTaskDone, activeConvId } = useMosChat();
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');

  const spaceTasks = tasks.filter((t) => !t.conversationId || t.conversationId === activeConvId);

  const displayedTasks = spaceTasks.filter((t) => (filter === 'completed' ? t.done : !t.done));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Title Header */}
      <div className="px-4 pt-3 pb-1">
        <h2 className="text-base font-bold text-white tracking-tight">Kho Công Việc & Nhắc Hẹn</h2>
      </div>

      {/* Header filter bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'pending' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Đang làm ({spaceTasks.filter((t) => !t.done).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'completed' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Đã xong ({spaceTasks.filter((t) => t.done).length})
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCreateTaskModal}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Giao việc</span>
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2.5">
        {displayedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 mt-12">
            <CheckCircle2 className="w-12 h-12 text-slate-700 mb-2" />
            <p className="text-sm font-medium text-slate-400">
              {filter === 'completed' ? 'Chưa có công việc nào hoàn thành' : 'Không có công việc nào đang chờ'}
            </p>
            <p className="text-xs text-slate-600 mt-1">Bấm nút Giao việc để tạo việc mới cho kênh</p>
          </div>
        ) : (
          displayedTasks.map((t) => {
            const isOverdue = t.dueAt && !t.done && dayjs(t.dueAt).isBefore(dayjs());

            return (
              <div
                key={t.id}
                onClick={() => toggleTaskDone(t.id, !t.done)}
                role="button"
                tabIndex={0}
                className={`p-3.5 rounded-2xl border transition-all active:scale-98 select-none ${
                  t.done
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskDone(t.id, !t.done);
                    }}
                    className="mt-0.5 text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    {t.done ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-snug break-words ${
                        t.done ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    >
                      {t.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Priority tag */}
                      {t.priority === 'URGENT' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Khẩn cấp
                        </span>
                      )}
                      {t.priority === 'HIGH' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Ưu tiên cao
                        </span>
                      )}

                      {/* Due date */}
                      {t.dueAt && (
                        <span
                          className={`flex items-center gap-1 text-[11px] font-medium tabular-nums ${
                            isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{dayjs(t.dueAt).format('HH:mm DD/MM')}</span>
                        </span>
                      )}

                      {/* Assignee */}
                      {t.assigneeName && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{t.assigneeName}</span>
                        </span>
                      )}
                    </div>
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
