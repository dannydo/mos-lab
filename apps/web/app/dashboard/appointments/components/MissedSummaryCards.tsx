'use client';

import React from 'react';
import { Card, Progress, Tooltip, theme } from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  PieChartOutlined,
  UsergroupAddOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { MissedSummaryStats } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

export interface MissedSummaryCardsProps {
  summary: MissedSummaryStats | null;
  loading?: boolean;
}

export default function MissedSummaryCards({ summary, loading = false }: MissedSummaryCardsProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const totalMissed = summary?.totalMissed ?? 0;
  const missedRatePct = summary?.missedRatePct ?? 0;
  const taggedCount = summary?.taggedCount ?? 0;
  const untaggedCount = summary?.untaggedCount ?? 0;
  const taggedRatePct = summary?.taggedRatePct ?? 0;

  // Find top reason and top responsibility
  const topReason = summary?.reasonBreakdown?.slice().sort((a, b) => b.count - a.count)[0];
  const topResp = summary?.responsibilityBreakdown?.slice().sort((a, b) => b.count - a.count)[0];

  const cardStyle = {
    background: themeMode === 'dark' ? '#141414' : '#ffffff',
    borderColor: themeMode === 'dark' ? '#262626' : '#f0f0f0',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Missed */}
      <Card loading={loading} style={cardStyle} className="shadow-xs hover:shadow-md transition-shadow rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Tổng số ca Missed
            </div>
            <div className="text-2xl font-bold mt-1 text-red-500 tabular-nums">
              {totalMissed.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-normal">ca</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-500 text-lg">
            <WarningOutlined />
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
          <span>Tổng đơn hẹn trong kỳ:</span>
          <span className="font-semibold tabular-nums">{summary?.totalPlanned ?? 0}</span>
        </div>
      </Card>

      {/* Card 2: Missed Rate */}
      <Card loading={loading} style={cardStyle} className="shadow-xs hover:shadow-md transition-shadow rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Tỷ lệ Lỡ lịch (Missed Rate)
            </div>
            <div
              className={`text-2xl font-bold mt-1 tabular-nums ${
                missedRatePct > 15 ? 'text-red-500' : missedRatePct > 10 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              {missedRatePct}%
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              missedRatePct > 15
                ? 'bg-red-50 dark:bg-red-950/40 text-red-500'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500'
            }`}
          >
            <PieChartOutlined />
          </div>
        </div>
        <div className="mt-2">
          <Progress
            percent={Math.min(100, missedRatePct)}
            showInfo={false}
            status={missedRatePct > 15 ? 'exception' : 'normal'}
            strokeColor={missedRatePct > 15 ? '#ff4d4f' : '#52c41a'}
            size="small"
          />
        </div>
      </Card>

      {/* Card 3: Tagged Reason Progress */}
      <Card loading={loading} style={cardStyle} className="shadow-xs hover:shadow-md transition-shadow rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Đã ghi Lý do & Qui trách nhiệm
            </div>
            <div className="text-2xl font-bold mt-1 text-emerald-500 tabular-nums">
              {taggedCount}{' '}
              <span className="text-xs text-slate-400 font-normal tabular-nums">
                / {totalMissed} ca ({taggedRatePct}%)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500 text-lg">
            <CheckCircleOutlined />
          </div>
        </div>
        <div className="text-xs mt-2 flex items-center justify-between">
          <span className="text-slate-500">Chưa gắn tag lý do:</span>
          <span className={`font-semibold tabular-nums ${untaggedCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
            {untaggedCount} ca
          </span>
        </div>
      </Card>

      {/* Card 4: Top Reason & Responsibility */}
      <Card loading={loading} style={cardStyle} className="shadow-xs hover:shadow-md transition-shadow rounded-xl">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Nguyên nhân chính
            </div>
            <div className="mt-1 text-sm font-semibold truncate text-slate-800 dark:text-slate-200">
              {topReason && topReason.count > 0 ? (
                <Tooltip title={`${topReason.label}: ${topReason.count} ca (${topReason.pct}%)`}>
                  <span>
                    {topReason.label} <span className="text-xs text-slate-400 font-normal">({topReason.count})</span>
                  </span>
                </Tooltip>
              ) : (
                <span className="text-slate-400 font-normal italic">Chưa có dữ liệu</span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 text-lg shrink-0 ml-2">
            <UsergroupAddOutlined />
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
          <span>Quy trách nhiệm hàng đầu: </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {topResp && topResp.count > 0 ? `${topResp.label} (${topResp.count})` : '-'}
          </span>
        </div>
      </Card>
    </div>
  );
}
