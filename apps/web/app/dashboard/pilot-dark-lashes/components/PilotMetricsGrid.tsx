'use client';

import React from 'react';
import { Progress } from 'antd';
import { Award, Package, Phone, Target, Wallet } from 'lucide-react';
import type { PilotMetricsSummary } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

interface PilotMetricsGridProps {
  metrics: PilotMetricsSummary | null;
}

export function PilotMetricsGrid({ metrics }: PilotMetricsGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-2.5 w-full">
      {/* Card 1: Target Progress */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2.5 sm:p-3 transition-all duration-200 hover:shadow-sm flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              Tiến độ 30 Ngày
            </span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <AppIcon icon={Target} size={13} />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-lg sm:text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {metrics?.completedSessions ?? 0}
            </span>
            <span className="text-[11px] font-medium text-slate-400 tabular-nums">
              / {metrics?.targetSessions ?? 30} ca
            </span>
          </div>
        </div>

        <div className="mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-0.5">
          <Progress percent={metrics?.progressPercent ?? 0} size="small" showInfo={false} className="!m-0" />
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {metrics?.progressPercent ?? 0}% mục tiêu
            </span>
            <span>1 ca/ngày</span>
          </div>
        </div>
      </div>

      {/* Card 2: Contribution Margin */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2.5 sm:p-3 transition-all duration-200 hover:shadow-sm flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              Tổng Contribution Margin
            </span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <AppIcon icon={Wallet} size={13} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 truncate mb-1">
            {formatVND(metrics?.totalContribution ?? 0)}
          </div>
        </div>

        <div className="mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
          <div className="flex items-center justify-between truncate">
            <span className="text-slate-400">Thu: {formatVND(metrics?.totalRevenue ?? 0)}</span>
            <span className="text-slate-400">CP: {formatVND(metrics?.totalDirectCost ?? 0)}</span>
          </div>
          <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 truncate">
            Margin TB: {metrics?.avgContributionMarginPct ?? 0}% ({formatVND(metrics?.avgContributionPerSession ?? 0)}
            /ca)
          </div>
        </div>
      </div>

      {/* Card 3: Consumables Cost */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2.5 sm:p-3 transition-all duration-200 hover:shadow-sm flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">Vật tư / Done</span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <AppIcon icon={Package} size={13} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 truncate mb-1">
            {formatVND(metrics?.avgConsumablesCostPerSession ?? 0)}
          </div>
        </div>

        <div className="mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tổng CP:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {formatVND(metrics?.totalConsumablesCost ?? 0)}
            </span>
          </div>
          <div className="text-[10px] font-medium text-teal-600 dark:text-teal-400 truncate">
            Mục tiêu: Chốt Cost/Done
          </div>
        </div>
      </div>

      {/* Card 4: Satisfaction (CSAT) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2.5 sm:p-3 transition-all duration-200 hover:shadow-sm flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              Chỉ số Hài lòng (CSAT)
            </span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AppIcon icon={Award} size={13} />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            {metrics?.avgCsat && metrics.avgCsat > 0 ? (
              <>
                <span className="text-lg sm:text-xl font-bold tabular-nums text-amber-500">{metrics.avgCsat}</span>
                <span className="text-[11px] font-normal text-slate-400">/ 5.0 ⭐</span>
              </>
            ) : (
              <span className="text-base sm:text-lg font-bold text-slate-400">Chưa có</span>
            )}
          </div>
        </div>

        <div className="mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Đã đánh giá:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {metrics?.ratedSessionsCount ?? 0} / {metrics?.completedSessions ?? 0} ca
            </span>
          </div>
          <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate">
            {metrics?.avgCsat && metrics.avgCsat >= 4.5 ? '⭐ Chuẩn chất lượng cao' : 'Theo dõi sát phản hồi'}
          </div>
        </div>
      </div>

      {/* Card 5: Follow-up & Care Alerts */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2.5 sm:p-3 transition-all duration-200 hover:shadow-sm flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              Nhắc việc Follow-up
            </span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AppIcon icon={Phone} size={13} />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-lg sm:text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {metrics?.totalPendingFollowUpCount ?? 0}
            </span>
            <span className="text-[11px] font-medium text-slate-400">ca cần chăm sóc</span>
          </div>
        </div>

        <div className="mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-0.5 text-[10px] tabular-nums">
          <div className="flex items-center gap-1.5">
            <span
              className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold ${
                (metrics?.pendingFollowUp24hCount ?? 0) > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                  : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
              }`}
            >
              24h: {metrics?.pendingFollowUp24hCount ?? 0}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold ${
                (metrics?.pendingFollowUp72hCount ?? 0) > 0
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                  : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
              }`}
            >
              72h: {metrics?.pendingFollowUp72hCount ?? 0}
            </span>
          </div>
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {(metrics?.totalPendingFollowUpCount ?? 0) === 0
              ? '✓ Tất cả ca đã chăm sóc'
              : 'Ưu tiên liên hệ khách đúng hạn'}
          </div>
        </div>
      </div>
    </div>
  );
}
