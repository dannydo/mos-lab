'use client';

import React from 'react';
import { Radio } from 'antd';
import { AlertTriangle, CheckCircle2, Phone } from 'lucide-react';
import type { MissedSummaryStats } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import MissedSummaryCards from '../components/MissedSummaryCards';
import type { MissedStatusFilter } from './appointmentsPageConstants';

export interface AppointmentsMissedSectionProps {
  missedSummary: MissedSummaryStats | null;
  missedSummaryLoading: boolean;
  missedStatusFilter: MissedStatusFilter;
  onMissedStatusFilterChange: (filter: MissedStatusFilter) => void;
}

export function AppointmentsMissedSection({
  missedSummary,
  missedSummaryLoading,
  missedStatusFilter,
  onMissedStatusFilterChange,
}: AppointmentsMissedSectionProps) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <MissedSummaryCards summary={missedSummary} loading={missedSummaryLoading} />

      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
          Lọc công việc theo dõi Missed:
        </div>
        <Radio.Group
          value={missedStatusFilter}
          onChange={(event) => onMissedStatusFilterChange(event.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="small"
        >
          <Radio.Button value="ALL">Tất cả ({missedSummary?.totalMissed ?? 0})</Radio.Button>
          <Radio.Button value="UNTAGGED">
            <span className="inline-flex items-center gap-1.5">
              <AppIcon icon={AlertTriangle} size={12} className="text-amber-500" />
              <span>Chưa ghi lý do ({missedSummary?.untaggedCount ?? 0})</span>
            </span>
          </Radio.Button>
          <Radio.Button value="FOLLOWUP">
            <span className="inline-flex items-center gap-1.5">
              <AppIcon icon={Phone} size={12} className="text-blue-500" />
              <span>Cần chăm sóc / Hẹn lại</span>
            </span>
          </Radio.Button>
          <Radio.Button value="RESOLVED">
            <span className="inline-flex items-center gap-1.5">
              <AppIcon icon={CheckCircle2} size={12} className="text-emerald-500" />
              <span>Đã giải quyết / Đã hẹn mới</span>
            </span>
          </Radio.Button>
        </Radio.Group>
      </div>
    </div>
  );
}
