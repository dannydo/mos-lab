'use client';

import React from 'react';
import { ChevronDown, ChevronUp, History, ListTodo, Sparkles, Wand2 } from 'lucide-react';
import { Progress, Tooltip } from 'antd';

export interface ThreadChecklistHeaderProps {
  isDark: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  summary?: string | null;
  totalCount: number;
  doneCount: number;
  percent: number;
  activityLogCount: number;
  isAiExtracting: boolean;
  onAutoSummarize?: () => void;
  onOpenAiExtract: () => void;
  onOpenHistory: () => void;
}

export const ThreadChecklistHeader: React.FC<ThreadChecklistHeaderProps> = ({
  isDark,
  collapsed,
  onToggleCollapsed,
  summary,
  totalCount,
  doneCount,
  percent,
  activityLogCount,
  isAiExtracting,
  onAutoSummarize,
  onOpenAiExtract,
  onOpenHistory,
}) => {
  return (
    <>
      {/* Header bar */}
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 bg-slate-500/5">
        <div className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0" onClick={onToggleCollapsed}>
          <ListTodo size={14} className="text-amber-500 shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Checklist công việc</span>
          <span className="text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {doneCount}/{totalCount} ({percent}%)
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onAutoSummarize && (
            <Tooltip title="Tóm tắt & chuẩn hóa Checklist từ báo cáo công việc">
              <button
                type="button"
                aria-label="Tóm tắt & Chuẩn hóa"
                onClick={onAutoSummarize}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center transition-all cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30"
              >
                <Sparkles size={12} />
              </button>
            </Tooltip>
          )}

          <Tooltip title="✨ AI trích xuất checklist từ thảo luận subthread">
            <button
              type="button"
              disabled={isAiExtracting}
              aria-label="AI trích xuất"
              onClick={onOpenAiExtract}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center transition-all cursor-pointer bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/25"
            >
              <Wand2 size={12} className={isAiExtracting ? 'animate-spin' : ''} />
            </button>
          </Tooltip>

          {activityLogCount > 0 && (
            <Tooltip title="Lịch sử thao tác checklist">
              <button
                type="button"
                onClick={onOpenHistory}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center transition-all cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-white/10"
              >
                <History size={13} />
              </button>
            </Tooltip>
          )}

          <button
            type="button"
            onClick={onToggleCollapsed}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center transition-all cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-white/10"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Executive Summary Banner */}
      {summary && !collapsed && (
        <div
          className={`mx-3 mt-2 px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed flex items-start gap-1.5 border ${
            isDark
              ? 'bg-violet-500/[0.12] border-violet-500/[0.28] text-slate-200'
              : 'bg-violet-500/[0.08] border-violet-500/20 text-slate-700'
          }`}
        >
          <Sparkles size={12} className="text-purple-500 dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-purple-600 dark:text-purple-300 mr-1">Tóm tắt:</span>
            <span>{summary}</span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="px-3 pt-1.5 pb-1">
          <Progress
            percent={percent}
            size="small"
            showInfo={false}
            strokeColor={percent === 100 ? 'rgb(16, 185, 129)' : 'rgb(245, 158, 11)'}
            trailColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          />
        </div>
      )}
    </>
  );
};
