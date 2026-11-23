'use client';

import React from 'react';
import { ListTodo, Loader2, Sparkles } from 'lucide-react';
import { Progress, Tooltip } from 'antd';

export interface ChecklistHeaderAndSummaryProps {
  isDark: boolean;
  summary?: string | null;
  totalCount: number;
  doneCount: number;
  percent: number;
  isSummarizing: boolean;
  onAutoSummarize: () => void;
}

export const ChecklistHeaderAndSummary: React.FC<ChecklistHeaderAndSummaryProps> = ({
  isDark,
  summary,
  totalCount,
  doneCount,
  percent,
  isSummarizing,
  onAutoSummarize,
}) => {
  return (
    <>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-black/5 dark:border-white/5 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <ListTodo size={13} className="text-amber-500 shrink-0" />
          <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200">Checklist đầu việc</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip title="Tóm tắt & chuẩn hóa Checklist từ báo cáo công việc">
            <button
              type="button"
              disabled={isSummarizing}
              onClick={onAutoSummarize}
              aria-label="Tự động tóm tắt và thêm checklist"
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-all bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 disabled:opacity-50"
            >
              {isSummarizing ? (
                <Loader2 size={12} className="animate-spin shrink-0" />
              ) : (
                <Sparkles size={12} className="shrink-0" />
              )}
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
      {summary && (
        <div
          className={`px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed flex items-start gap-1.5 border ${
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
        <Progress
          percent={percent}
          size="small"
          showInfo={false}
          strokeColor={percent === 100 ? 'rgb(16, 185, 129)' : 'rgb(245, 158, 11)'}
          trailColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
          className="!m-0"
        />
      )}
    </>
  );
};
