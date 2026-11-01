import React, { useState } from 'react';
import { Check, Plus, Trash2, ListTodo, Loader2, Sparkles } from 'lucide-react';
import { Tooltip, Input, Progress } from 'antd';
import type { MosChatTaskItem, UpdateMosChatTaskRequest } from '@mos-lab/shared';

export interface MosChatTaskInlineChecklistProps {
  task: MosChatTaskItem;
  onUpdateTask: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<void> | void;
  isDark: boolean;
  token?: any;
}

export const MosChatTaskInlineChecklist: React.FC<MosChatTaskInlineChecklistProps> = ({
  task,
  onUpdateTask,
  isDark,
  token,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [actingItemId, setActingItemId] = useState<string | null>(null);

  const checklist = task.checklist || [];
  const totalCount = checklist.length;
  const doneCount = checklist.filter((c) => c.done).length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleAutoSummarize = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'auto_summarize',
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleToggle = async (itemId: string) => {
    if (actingItemId) return;
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'toggle',
        checklistItemId: itemId,
      });
    } finally {
      setActingItemId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (actingItemId) return;
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'delete',
        checklistItemId: itemId,
      });
    } finally {
      setActingItemId(null);
    }
  };

  const handleAdd = async () => {
    const trimmed = quickTitle.trim();
    if (!trimmed || isAdding) return;
    setIsAdding(true);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'add',
        checklistItem: { title: trimmed },
      });
      setQuickTitle('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className="mt-2 rounded-xl p-2.5 space-y-2 text-left transition-all border"
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(248, 250, 252, 0.95)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-black/5 dark:border-white/5 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <ListTodo size={13} className="text-amber-500 shrink-0" />
          <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200">Checklist đầu việc</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip title="Đọc tin nhắn báo cáo công việc, tự động tóm tắt & thêm vào Checklist">
            <button
              type="button"
              disabled={isSummarizing}
              onClick={handleAutoSummarize}
              aria-label="Tự động tóm tắt và thêm checklist"
              className="px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 disabled:opacity-50"
            >
              {isSummarizing ? (
                <Loader2 size={10} className="animate-spin shrink-0" />
              ) : (
                <Sparkles size={10} className="shrink-0" />
              )}
              <span>{isSummarizing ? 'Đang tóm tắt...' : 'Tóm tắt & Thêm Checklist'}</span>
            </button>
          </Tooltip>
          <div className="flex items-center gap-1 shrink-0 text-[10.5px] font-bold tabular-nums">
            <span
              className={
                percent === 100 ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'
              }
            >
              {doneCount}/{totalCount}
            </span>
            <span className="text-slate-400 text-[10px]">({percent}%)</span>
          </div>
        </div>
      </div>

      {/* Executive Summary Banner */}
      {task.summary && (
        <div
          className="px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed flex items-start gap-1.5"
          style={{
            background: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
            border: isDark ? '1px solid rgba(139, 92, 246, 0.28)' : '1px solid rgba(139, 92, 246, 0.2)',
            color: isDark ? '#e2e8f0' : '#334155',
          }}
        >
          <Sparkles size={12} className="text-purple-500 dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-purple-600 dark:text-purple-300 mr-1">Tóm tắt:</span>
            <span>{task.summary}</span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {totalCount > 0 && (
        <Progress
          percent={percent}
          size="small"
          showInfo={false}
          strokeColor={percent === 100 ? '#10b981' : '#f59e0b'}
          trailColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
          className="!m-0"
        />
      )}

      {/* Checklist Items */}
      <div className="space-y-1 max-h-[260px] overflow-y-auto pr-0.5">
        {checklist.length === 0 ? (
          <div className="py-2 text-center space-y-1.5">
            <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              Chưa có đầu việc nào. Nhập mục việc bên dưới để bắt đầu.
            </div>
            <div>
              <button
                type="button"
                disabled={isSummarizing}
                onClick={handleAutoSummarize}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 disabled:opacity-50"
              >
                {isSummarizing ? (
                  <Loader2 size={11} className="animate-spin shrink-0" />
                ) : (
                  <Sparkles size={11} className="shrink-0" />
                )}
                <span>✨ Đọc công việc của {task.assigneeName || 'nhân sự'} & Tự động thêm Checklist</span>
              </button>
            </div>
          </div>
        ) : (
          checklist.map((item) => {
            const isItemActing = actingItemId === item.id;
            return (
              <div
                key={item.id}
                className={`group/chk flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-all text-[11.5px] ${
                  item.done
                    ? 'bg-emerald-500/5 text-slate-400 dark:text-slate-500'
                    : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                }`}
                style={{
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Checkbox & Title */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    disabled={isItemActing}
                    onClick={() => handleToggle(item.id)}
                    aria-label={item.done ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      item.done
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-400 dark:border-slate-500 hover:border-emerald-500 text-transparent hover:text-emerald-500'
                    }`}
                  >
                    {isItemActing ? (
                      <Loader2 size={10} className="animate-spin text-current" />
                    ) : (
                      <Check size={10} strokeWidth={item.done ? 3 : 2} />
                    )}
                  </button>
                  <span
                    className={`truncate font-medium flex-1 select-text ${
                      item.done ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}
                    title={item.title}
                  >
                    {item.title}
                  </span>
                </div>

                {/* Delete button */}
                <Tooltip title="Xoá mục này">
                  <button
                    type="button"
                    disabled={isItemActing}
                    onClick={() => handleDelete(item.id)}
                    aria-label={`Xoá mục ${item.title}`}
                    className="opacity-0 group-hover/chk:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-all shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </Tooltip>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Row */}
      <div className="pt-1 flex items-center gap-1.5">
        <Input
          size="small"
          placeholder="Thêm đầu việc mới (nhấn Enter)..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onPressEnter={handleAdd}
          disabled={isAdding}
          className="text-xs"
          style={{
            borderRadius: '6px',
            background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isAdding || !quickTitle.trim()}
          className="h-6 px-2.5 rounded-md text-[11px] font-bold inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white cursor-pointer transition-all shrink-0 shadow-sm"
        >
          {isAdding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          <span>Thêm</span>
        </button>
      </div>
    </div>
  );
};
