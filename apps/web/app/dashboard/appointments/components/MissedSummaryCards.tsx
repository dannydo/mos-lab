'use client';

import React from 'react';
import { Progress, Tooltip, Spin } from 'antd';
import { WarningOutlined, CheckCircleOutlined, PieChartOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { MissedSummaryStats } from '@mos-lab/shared';

export interface MissedSummaryCardsProps {
  summary: MissedSummaryStats | null;
  loading?: boolean;
}

export default function MissedSummaryCards({ summary, loading = false }: MissedSummaryCardsProps) {
  if (loading) {
    return (
      <div className="my-2.5 p-3 flex items-center justify-center rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs">
        <Spin size="small" tip="Đang tải thống kê Missed..." />
      </div>
    );
  }

  const totalMissed = summary?.totalMissed ?? 0;
  const missedRatePct = summary?.missedRatePct ?? 0;
  const taggedCount = summary?.taggedCount ?? 0;
  const untaggedCount = summary?.untaggedCount ?? 0;
  const taggedRatePct = summary?.taggedRatePct ?? 0;

  // Find top reason and top responsibility
  const topReason = summary?.reasonBreakdown?.slice().sort((a, b) => b.count - a.count)[0];

  return (
    <div
      className="my-2.5 w-full text-xs overflow-x-auto"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px' }}
    >
      {/* 1. Ca Missed */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <div className="w-7 h-7 rounded bg-red-500/10 flex items-center justify-center text-red-500 text-sm shrink-0">
          <WarningOutlined />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            ∑ Ca Missed
          </span>
          <div className="text-sm sm:text-base font-extrabold text-red-500 tabular-nums truncate">
            {totalMissed.toLocaleString('vi-VN')} ca{' '}
            <span className="text-[10px] text-slate-400 font-normal">(Tổng: {summary?.totalPlanned ?? 0})</span>
          </div>
        </div>
      </div>

      {/* 2. Tỷ lệ Lỡ lịch */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <div className="w-7 h-7 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 text-sm shrink-0">
          <PieChartOutlined />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              Tỷ lệ Lỡ
            </span>
            <span
              className={`text-sm sm:text-base font-extrabold tabular-nums ${
                missedRatePct > 15 ? 'text-red-500' : missedRatePct > 10 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              {missedRatePct}%
            </span>
          </div>
          <div className="mt-0.5">
            <Progress
              percent={Math.min(100, missedRatePct)}
              showInfo={false}
              status={missedRatePct > 15 ? 'exception' : 'normal'}
              strokeColor={missedRatePct > 15 ? '#ff4d4f' : '#52c41a'}
              size="small"
            />
          </div>
        </div>
      </div>

      {/* 3. Đã ghi lý do */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <div className="w-7 h-7 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm shrink-0">
          <CheckCircleOutlined />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            Đã ghi lý do
          </span>
          <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
            {taggedCount}/{totalMissed} ({taggedRatePct}%){' '}
            {untaggedCount > 0 && (
              <span className="text-amber-500 text-[10px] font-normal">(Chưa: {untaggedCount})</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Lý do chính */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <div className="w-7 h-7 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-sm shrink-0">
          <UsergroupAddOutlined />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            Lý do chính
          </span>
          <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
            {topReason && topReason.count > 0 ? (
              <Tooltip title={`${topReason.label}: ${topReason.count} ca (${topReason.pct}%)`}>
                <span className="cursor-help">
                  {topReason.label} <span className="font-normal text-slate-400">({topReason.count})</span>
                </span>
              </Tooltip>
            ) : (
              <span className="text-slate-400 font-normal italic">Chưa có</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
