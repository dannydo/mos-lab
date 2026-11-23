'use client';

import React from 'react';
import { Progress, Typography, theme } from 'antd';
import { Calendar, CheckCircle2, Clock, Headphones, Phone, type LucideIcon } from 'lucide-react';
import type { LocaStaffActivityStats } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { TOUCHPOINT_CHIP_CONFIGS } from './activityTabConstants';

const { Text } = Typography;

export interface LocaStaffActivitySummaryBarProps {
  isDark: boolean;
  stats: LocaStaffActivityStats | null;
  actionTypeFilter: string;
  onActionTypeChange: (val: string) => void;
  selectedTouchpointKey: string;
  onTouchpointKeyChange?: (key: string) => void;
}

interface MetricPillConfig {
  id: string;
  label: string;
  title: string;
  targetActionType: 'CALL' | 'TOUCHPOINT' | 'BOOKED';
  value: React.ReactNode;
  unit?: string;
  icon: LucideIcon;
  activeBorderClass: string;
  activeLabelClass: string;
  valueClass: string;
  iconCircleClass: string;
  footer?: React.ReactNode;
}

interface FunnelStageConfig {
  id: string;
  label: string;
  title: string;
  targetActionType: 'CALL' | 'TOUCHPOINT' | 'BOOKED';
  percent: number;
  activeClass: string;
  valueClass: string;
}

export const LocaStaffActivitySummaryBar: React.FC<LocaStaffActivitySummaryBarProps> = ({
  isDark,
  stats,
  actionTypeFilter,
  onActionTypeChange,
  selectedTouchpointKey,
  onTouchpointKeyChange,
}) => {
  const { token } = theme.useToken();

  const toggleActionFilter = (target: string) => {
    onActionTypeChange(actionTypeFilter === target ? 'ALL' : target);
  };

  const metricPills: MetricPillConfig[] = [
    {
      id: 'calls',
      label: '∑ Cuộc Gọi',
      title: 'Nhấn để lọc các hành động Cuộc Gọi',
      targetActionType: 'CALL',
      value: stats?.totalCalls || 0,
      unit: 'cuộc',
      icon: Phone,
      activeBorderClass: 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold',
      activeLabelClass: isDark ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold',
      valueClass: 'text-base font-bold mt-0.5 tabular-nums flex items-baseline gap-1',
      iconCircleClass: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      id: 'answerRate',
      label: 'Tỷ Lệ Bắt Máy',
      title: 'Nhấn để lọc các cuộc gọi',
      targetActionType: 'CALL',
      value: `${stats?.answerRate || 0}%`,
      icon: Headphones,
      activeBorderClass: 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold',
      activeLabelClass: isDark ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold',
      valueClass: 'text-base font-bold mt-0.5 tabular-nums text-emerald-500',
      iconCircleClass: 'bg-blue-500/10 text-blue-500',
      footer: (
        <Progress
          percent={stats?.answerRate || 0}
          showInfo={false}
          strokeColor={token.colorSuccess}
          size="small"
          className="mt-0.5 mb-0"
        />
      ),
    },
    {
      id: 'touchpoints',
      label: 'Điểm Chạm Đã Xử Lý',
      title: 'Nhấn để lọc các hành động Điểm Chạm',
      targetActionType: 'TOUCHPOINT',
      value: stats?.totalTouchpointsChecked || 0,
      unit: 'chạm',
      icon: CheckCircle2,
      activeBorderClass: 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.2)] font-bold',
      activeLabelClass: isDark ? 'text-indigo-400 font-bold' : 'text-indigo-600 font-bold',
      valueClass: 'text-base font-bold mt-0.5 tabular-nums text-blue-500 flex items-baseline gap-1',
      iconCircleClass: 'bg-indigo-500/10 text-indigo-500',
    },
    {
      id: 'booked',
      label: 'Chốt Booked Thành Công',
      title: 'Nhấn để lọc các đơn Đặt Lịch Hẹn',
      targetActionType: 'BOOKED',
      value: stats?.totalBooked || 0,
      unit: 'đơn',
      icon: Calendar,
      activeBorderClass: 'border-purple-400 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.2)] font-bold',
      activeLabelClass: isDark ? 'text-purple-400 font-bold' : 'text-purple-600 font-bold',
      valueClass: 'text-base font-bold mt-0.5 tabular-nums text-purple-500 flex items-baseline gap-1',
      iconCircleClass: 'bg-purple-500/10 text-purple-500',
    },
    {
      id: 'duration',
      label: 'Thời Lượng Thoại',
      title: 'Nhấn để lọc các cuộc gọi thoại',
      targetActionType: 'CALL',
      value: stats?.formattedDuration || '0m 00s',
      icon: Clock,
      activeBorderClass: 'border-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold',
      activeLabelClass: isDark ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold',
      valueClass: 'text-sm font-bold mt-0.5 tabular-nums text-amber-500 truncate',
      iconCircleClass: 'bg-amber-500/10 text-amber-500',
    },
  ];

  const funnelStages: FunnelStageConfig[] = [
    {
      id: 'callToAnswer',
      label: 'Gọi→Bắt:',
      title: 'Nhấn để lọc Cuộc gọi',
      targetActionType: 'CALL',
      percent: stats?.conversionRates?.callToAnswer || 0,
      activeClass: 'border-emerald-400 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-bold',
      valueClass: 'text-emerald-500 dark:text-emerald-400',
    },
    {
      id: 'answerToTouchpoint',
      label: 'Bắt→Chạm:',
      title: 'Nhấn để lọc Điểm chạm',
      targetActionType: 'TOUCHPOINT',
      percent: stats?.conversionRates?.answerToTouchpoint || 0,
      activeClass: 'border-blue-400 bg-blue-500/10 text-blue-500 dark:text-blue-400 font-bold',
      valueClass: 'text-blue-500 dark:text-blue-400',
    },
    {
      id: 'touchpointToBooked',
      label: 'Chạm→Booked:',
      title: 'Nhấn để lọc Chốt Booked',
      targetActionType: 'BOOKED',
      percent: stats?.conversionRates?.touchpointToBooked || 0,
      activeClass: 'border-purple-400 bg-purple-500/10 text-purple-500 dark:text-purple-400 font-bold',
      valueClass: 'text-purple-500 dark:text-purple-400',
    },
  ];

  const idleCardClass = isDark
    ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
    : 'bg-slate-50 border-slate-200 hover:border-slate-300';

  return (
    <div
      className={`rounded-2xl p-3 space-y-2.5 mb-4 border transition-all ${
        isDark
          ? 'bg-slate-900/60 border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {metricPills.map((pill) => {
          const isActive = actionTypeFilter === pill.targetActionType;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => toggleActionFilter(pill.targetActionType)}
              title={pill.title}
              className={`w-full text-left rounded-xl border px-3 py-2 cursor-pointer select-none transition-all duration-200 hover:scale-[1.01] flex flex-col justify-between ${
                isActive ? pill.activeBorderClass : idleCardClass
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div className="min-w-0">
                  <Text
                    type="secondary"
                    className={`text-[10px] uppercase font-semibold tracking-wider block truncate ${
                      isActive ? pill.activeLabelClass : ''
                    }`}
                  >
                    {pill.label}
                  </Text>
                  <div className={pill.valueClass}>
                    <span>{pill.value}</span>
                    {pill.unit ? <span className="text-[10px] font-normal text-slate-400">{pill.unit}</span> : null}
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ${pill.iconCircleClass}`}
                >
                  <AppIcon icon={pill.icon} size={12} />
                </div>
              </div>
              {pill.footer}
            </button>
          );
        })}
      </div>

      <div
        className={`flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-2 border-t ${
          isDark ? 'border-slate-800/60' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] py-0.5">
          <Text
            type="secondary"
            className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0"
          >
            Mốc Chạm:
          </Text>
          {TOUCHPOINT_CHIP_CONFIGS.map((item) => {
            const count = stats?.touchpointBreakdown?.[item.key] || 0;
            const isSelected = selectedTouchpointKey === item.key;
            const isZero = count === 0;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onTouchpointKeyChange?.(isSelected ? 'ALL' : item.key)}
                title={`Nhấn để lọc mốc ${item.label}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all duration-200 shrink-0 ${
                  isSelected
                    ? `border-amber-400 bg-amber-400/15 font-bold shadow-[0_0_10px_rgba(251,191,36,0.25)] scale-[1.03] ${
                        isDark ? 'text-amber-300' : 'text-amber-700'
                      }`
                    : isZero
                      ? `border-transparent opacity-50 hover:opacity-100 ${
                          isDark
                            ? 'bg-slate-800/30 text-slate-500 hover:border-slate-700'
                            : 'bg-slate-100 text-slate-400 hover:border-slate-300'
                        }`
                      : isDark
                        ? 'border-slate-700/50 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                        : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="font-medium text-[10px]">{item.label}</span>
                <span
                  className={`font-bold tabular-nums text-[11px] rounded px-1 ${
                    isSelected
                      ? 'bg-amber-400/20 text-amber-500'
                      : isZero
                        ? isDark
                          ? 'bg-slate-700/30 text-slate-500'
                          : 'bg-slate-200/70 text-slate-400'
                        : `${isDark ? 'bg-slate-900/40' : 'bg-white/80'} ${item.textColorClass}`
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`flex items-center gap-1.5 shrink-0 xl:border-l xl:pl-2.5 ${
            isDark ? 'border-slate-800/60' : 'border-slate-200'
          }`}
        >
          <Text type="secondary" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-0.5">
            Phễu:
          </Text>

          {funnelStages.map((stage) => {
            const isStageActive = actionTypeFilter === stage.targetActionType;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => toggleActionFilter(stage.targetActionType)}
                title={stage.title}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                  isStageActive
                    ? stage.activeClass
                    : `border-transparent text-slate-500 dark:text-slate-400 ${
                        isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'
                      }`
                }`}
              >
                <span className="text-[10px]">{stage.label}</span>
                <span className={`font-bold tabular-nums text-[11px] ${stage.valueClass}`}>{stage.percent}%</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
