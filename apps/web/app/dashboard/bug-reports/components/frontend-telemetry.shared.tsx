'use client';

import React from 'react';
import { Activity, AlertOctagon, AlertTriangle, Clock, Flame, MousePointerClick } from 'lucide-react';
import type { FrontendIssueStatus, FrontendIssueType } from '@mos-lab/shared';

export function BadgeTag({
  color,
  children,
  className = '',
}: {
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  const colorClasses: Record<string, string> = {
    magenta: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800/40',
    volcano:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/40',
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40',
    gold: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40',
    purple:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40',
    orange:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/40',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40',
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40',
    error: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40',
    warning:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40',
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const selected = colorClasses[color] || colorClasses.default;
  return (
    <span
      className={`inline-flex items-center justify-center leading-none gap-1 px-2 py-1 rounded text-xs font-medium border ${selected} ${className}`}
    >
      {children}
    </span>
  );
}

export const STATUS_CONFIG: Record<FrontendIssueStatus, { label: string; color: string }> = {
  NEW: { label: 'Mới phát hiện', color: 'error' },
  INVESTIGATING: { label: 'Đang điều tra', color: 'warning' },
  RESOLVED: { label: 'Đã giải quyết', color: 'success' },
  REOPENED: { label: 'Tái phát', color: 'purple' },
  IGNORED: { label: 'Bỏ qua', color: 'default' },
};

export const ISSUE_TYPE_CONFIG: Record<FrontendIssueType, { label: string; color: string; icon: typeof Activity }> = {
  RAGE_CLICK: { label: 'Rage Click (Ức chế)', color: 'magenta', icon: MousePointerClick },
  API_FAILURE: { label: 'Lỗi API (5xx/Timeout)', color: 'volcano', icon: AlertOctagon },
  REACT_CRASH: { label: 'Crash Component', color: 'red', icon: Flame },
  SLOW_INTERACTION: { label: 'Đơ / Chậm (>3s)', color: 'gold', icon: Clock },
  UNCAUGHT_EXCEPTION: { label: 'Lỗi JS Runtime', color: 'purple', icon: AlertTriangle },
  BLOCKED_SUBMIT: { label: 'Bị chặn Submit', color: 'orange', icon: AlertTriangle },
};
