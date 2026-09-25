'use client';

import React from 'react';
import { Progress } from 'antd';
import { Award, Package, Phone, Target, Wallet } from 'lucide-react';
import type { PilotMetricsSummary } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { StatCard } from '../../../../components/ui/StatCard';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card 1: Target Progress */}
      <StatCard
        title="Tiến độ Pilot 30 Ngày"
        value={
          <div className="flex items-baseline gap-1.5">
            <span>{metrics?.completedSessions ?? 0}</span>
            <span className="text-xs font-medium text-slate-400">/ {metrics?.targetSessions ?? 30} ca</span>
          </div>
        }
        icon={<AppIcon icon={Target} size="md" className="text-emerald-500" />}
        subValue={
          <div className="w-full mt-1.5">
            <Progress percent={metrics?.progressPercent ?? 0} size="small" showInfo={false} />
          </div>
        }
        trendText={`Đạt ${metrics?.progressPercent ?? 0}% mục tiêu pilot`}
        trend="up"
      />

      {/* Card 2: Contribution & Unit Economics */}
      <StatCard
        title="Tổng Contribution Margin"
        value={formatVND(metrics?.totalContribution ?? 0)}
        icon={<AppIcon icon={Wallet} size="md" className="text-blue-500" />}
        subValue={
          <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-0.5">
            <span>Doanh thu: {formatVND(metrics?.totalRevenue ?? 0)}</span>
            <span>CP trực tiếp: {formatVND(metrics?.totalDirectCost ?? 0)}</span>
          </div>
        }
        trendText={`Margin TB: ${metrics?.avgContributionMarginPct ?? 0}% (${formatVND(
          metrics?.avgContributionPerSession ?? 0
        )}/ca)`}
        trend="up"
      />

      {/* Card 3: Consumables Cost Per Done */}
      <StatCard
        title="Vật tư / Done"
        value={formatVND(metrics?.avgConsumablesCostPerSession ?? 0)}
        icon={<AppIcon icon={Package} size="md" className="text-teal-500" />}
        subValue={
          <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-0.5">
            <span>Tổng CP vật tư: {formatVND(metrics?.totalConsumablesCost ?? 0)}</span>
            <span>Đo lường chi phí thực tế / ca</span>
          </div>
        }
        trendText="Mục tiêu 7 ngày: Chốt Avg Direct Cost / Done"
        trend="neutral"
      />

      {/* Card 4: Satisfaction (CSAT) */}
      <StatCard
        title="Chỉ số Hài lòng (CSAT)"
        value={
          metrics?.avgCsat && metrics.avgCsat > 0 ? (
            <div className="flex items-center gap-1.5 text-amber-500">
              <span>{metrics.avgCsat}</span>
              <span className="text-xs font-normal text-slate-400">/ 5.0 ⭐</span>
            </div>
          ) : (
            <span className="text-slate-400 text-lg">Chưa có</span>
          )
        }
        icon={<AppIcon icon={Award} size="md" className="text-amber-500" />}
        subValue={
          <div className="flex items-center gap-1 mt-1">
            <span className="text-amber-400 text-xs font-medium">
              {metrics?.avgCsat ? `${metrics.avgCsat} ⭐` : 'Chưa đánh giá'}
            </span>
          </div>
        }
        trendText={`Đã đánh giá: ${metrics?.ratedSessionsCount ?? 0} / ${metrics?.completedSessions ?? 0} ca`}
      />

      {/* Card 5: Follow-up & Care Alerts */}
      <StatCard
        title="Nhắc việc Follow-up"
        value={
          <div className="flex items-center gap-2">
            <span>{metrics?.totalPendingFollowUpCount ?? 0}</span>
            <span className="text-xs font-medium text-slate-400">ca cần chăm sóc</span>
          </div>
        }
        icon={<AppIcon icon={Phone} size="md" className="text-rose-500" />}
        subValue={
          <div className="flex items-center gap-2 text-xs mt-1">
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${
                (metrics?.pendingFollowUp24hCount ?? 0) > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                  : 'text-slate-400'
              }`}
            >
              24h: {metrics?.pendingFollowUp24hCount ?? 0}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${
                (metrics?.pendingFollowUp72hCount ?? 0) > 0
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
                  : 'text-slate-400'
              }`}
            >
              72h: {metrics?.pendingFollowUp72hCount ?? 0}
            </span>
          </div>
        }
        trendText={
          (metrics?.totalPendingFollowUpCount ?? 0) === 0
            ? 'Tất cả ca đã được chăm sóc'
            : 'Ưu tiên liên hệ khách đúng hạn'
        }
        trend={(metrics?.totalPendingFollowUpCount ?? 0) === 0 ? 'up' : 'down'}
      />
    </div>
  );
}
