'use client';

import React from 'react';
import { Typography } from 'antd';
import { formatVND } from '~/lib/format-utils';
import type { ScheduleStatsSummary } from './scheduleCalendarTypes';

const { Text } = Typography;

interface ScheduleSummaryStripProps {
  statsSummary: ScheduleStatsSummary;
}

export function ScheduleSummaryStrip({ statsSummary }: ScheduleSummaryStripProps) {
  return (
    <div className="schedule-calendar-summary-grid grid grid-cols-2 gap-3 pt-2">
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
        <Text type="secondary" className="text-xs font-medium">
          ∑ Lịch hẹn
        </Text>
        <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
          {statsSummary.totalCount}
        </div>
      </div>

      <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
        <Text type="secondary" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          Hoàn thành
        </Text>
        <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {statsSummary.completedCount}
        </div>
      </div>

      <div className="bg-blue-50/60 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
        <Text type="secondary" className="text-xs font-medium text-blue-600 dark:text-blue-400">
          Chờ check-in
        </Text>
        <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
          {statsSummary.pendingCount}
        </div>
      </div>

      <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40">
        <Text type="secondary" className="text-xs font-medium text-amber-600 dark:text-amber-400">
          Dự kiến thu
        </Text>
        <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
          {formatVND(statsSummary.totalEstRev)}
        </div>
      </div>
    </div>
  );
}
