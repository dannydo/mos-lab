'use client';

import React from 'react';
import { AlertTriangle, Calendar, CheckCircle2, type LucideIcon } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import type { AppointmentSummaryStats, AppointmentTabKey } from './appointmentsPageConstants';

export interface AppointmentsTabBarProps {
  activeTab: AppointmentTabKey;
  total: number;
  summary: AppointmentSummaryStats | null;
  onTabChange: (tab: AppointmentTabKey) => void;
}

interface TabDescriptor {
  key: AppointmentTabKey;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
  activeClassName: string;
  badgeClassName: string;
  focusRingClassName: string;
  getCount: (summary: AppointmentSummaryStats | null, activeTab: AppointmentTabKey, total: number) => number;
  getMetricLabel: (summary: AppointmentSummaryStats | null) => string;
}

const TAB_ITEMS: ReadonlyArray<TabDescriptor> = [
  {
    key: 'pending',
    label: 'Lịch Hẹn',
    icon: Calendar,
    iconClassName: 'text-amber-500',
    activeClassName:
      'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold shadow-xs border border-amber-500/40',
    badgeClassName: 'px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-sm',
    focusRingClassName: 'focus-visible:ring-amber-500',
    getCount: (summary, activeTab, total) => summary?.totalPending ?? (activeTab === 'pending' ? total : 0),
    getMetricLabel: (summary) => `(${formatVND(summary?.pendingValue || 0)})`,
  },
  {
    key: 'missed',
    label: 'Lịch Missed',
    icon: AlertTriangle,
    iconClassName: 'text-red-500',
    activeClassName:
      'bg-white dark:bg-slate-800 text-red-500 dark:text-red-400 font-bold shadow-xs border border-red-500/40',
    badgeClassName: 'px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 dark:text-red-400 font-black text-sm',
    focusRingClassName: 'focus-visible:ring-red-500',
    getCount: (summary, activeTab, total) => summary?.totalMissed ?? (activeTab === 'missed' ? total : 0),
    getMetricLabel: (summary) => `(${summary?.missedRate ?? summary?.missedRatePct ?? 0}%)`,
  },
  {
    key: 'completed',
    label: 'Lịch Done',
    icon: CheckCircle2,
    iconClassName: 'text-emerald-500',
    activeClassName:
      'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs border border-emerald-500/40',
    badgeClassName:
      'px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-sm',
    focusRingClassName: 'focus-visible:ring-emerald-500',
    getCount: (summary, activeTab, total) => summary?.totalCompleted ?? (activeTab === 'completed' ? total : 0),
    getMetricLabel: (summary) => `(${formatVND(summary?.completedRevenue || summary?.totalNetRev || 0)})`,
  },
];

const INACTIVE_TAB_CLASS =
  'text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40';

export function AppointmentsTabBar({ activeTab, total, summary, onTabChange }: AppointmentsTabBarProps) {
  const selectTab = (tabKey: AppointmentTabKey) => {
    onTabChange(tabKey);
    localStorage.setItem('mos_appointments_activeTab', tabKey);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number, tabKey: AppointmentTabKey) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectTab(tabKey);
      return;
    }

    if (event.key === 'ArrowRight' && index < TAB_ITEMS.length - 1) {
      event.preventDefault();
      const nextTab = TAB_ITEMS[index + 1].key;
      selectTab(nextTab);
      document.getElementById(`tab-${nextTab}`)?.focus();
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      const prevTab = TAB_ITEMS[index - 1].key;
      selectTab(prevTab);
      document.getElementById(`tab-${prevTab}`)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Danh sách trạng thái lịch hẹn"
      className="mb-3 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800 inline-flex flex-row items-center gap-1.5 max-w-full overflow-x-auto"
    >
      {TAB_ITEMS.map((tab, index) => {
        const isActive = activeTab === tab.key;
        const count = tab.getCount(summary, activeTab, total);
        const metricLabel = tab.getMetricLabel(summary);

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={isActive}
            aria-controls="panel-appointments"
            tabIndex={isActive ? 0 : -1}
            onClick={() => selectTab(tab.key)}
            onKeyDown={(event) => handleKeyDown(event, index, tab.key)}
            className={`inline-flex items-center gap-2.5 h-9 px-3.5 rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 ${tab.focusRingClassName} text-xs whitespace-nowrap shrink-0 ${
              isActive ? tab.activeClassName : INACTIVE_TAB_CLASS
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs sm:text-sm">
              <AppIcon icon={tab.icon} size={14} className={tab.iconClassName} />
              <span>{tab.label}</span>
            </span>
            <span className="tabular-nums flex items-center gap-1.5">
              <span className={tab.badgeClassName}>{count}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{metricLabel}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
