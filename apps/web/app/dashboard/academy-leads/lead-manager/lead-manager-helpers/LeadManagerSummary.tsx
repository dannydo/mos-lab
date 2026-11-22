'use client';

import type { ReactNode } from 'react';
import { Button } from 'antd';
import { CalendarDays, CircleCheck, Flame, Trophy } from 'lucide-react';
import type { AcademyLead, AcademyLeadSummary } from '@mos-lab/shared';
import { AppIcon, CopyPhoneButton, StatusTag } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import { STATUS_LABELS, STATUS_TONES, dateLabel } from './lead-manager-utils';

export function pipelineTabLabel(icon: ReactNode, label: string, count: number) {
  return (
    <span className="academy-lead-manager-tab-label">
      {icon}
      <span>
        {label} <span className="tabular-nums">({count})</span>
      </span>
    </span>
  );
}

export function leadMobileCard(
  record: AcademyLead,
  onOpen: (lead: AcademyLead) => void,
  onOpenTalent: (lead: AcademyLead) => void
) {
  return (
    <article className="w-full rounded-xl border border-inherit p-3 text-left">
      <button type="button" className="w-full text-left" onClick={() => onOpen(record)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <strong>{record.name}</strong>
            <div className="mt-1 text-xs opacity-70 flex items-center gap-1">
              <span>{record.phone || 'Chưa có SĐT'}</span>
              {record.phone && <CopyPhoneButton phone={record.phone} size="xs" as="span" />}
              <span>· {record.owner?.displayName || 'Chưa giao'}</span>
            </div>
          </div>
          <StatusTag status={STATUS_TONES[record.status]} label={STATUS_LABELS[record.status]} />
        </div>
        <div className="mt-2 text-xs opacity-70">Lịch test: {dateLabel(record.scheduledAt)}</div>
      </button>
      <div className="mt-3 border-t border-inherit pt-2">
        <Button size="small" icon={<AppIcon icon={Trophy} />} onClick={() => onOpenTalent(record)}>
          Tố Chất
        </Button>
      </div>
    </article>
  );
}

export function LeadManagerMetricStrip({ summary }: { summary: AcademyLeadSummary }) {
  const metrics = [
    {
      key: 'total',
      icon: CalendarDays,
      iconBoxClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      label: 'Tổng lead',
      value: summary.total.toLocaleString('vi-VN'),
      valueClass: 'text-slate-800 dark:text-slate-100',
    },
    {
      key: 'scheduled',
      icon: CalendarDays,
      iconBoxClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      label: 'Đã hẹn test',
      value: summary.scheduledCount.toLocaleString('vi-VN'),
      valueClass: 'text-slate-800 dark:text-slate-100',
    },
    {
      key: 'revenue',
      icon: CircleCheck,
      iconBoxClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      label: 'Doanh thu chốt',
      value: formatVND(summary.wonRevenueVnd),
      valueClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'hot',
      icon: Flame,
      iconBoxClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      label: 'Hot < 72 giờ',
      value: summary.hotCount.toLocaleString('vi-VN'),
      valueClass: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
      {metrics.map((metric) => (
        <div
          key={metric.key}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${metric.iconBoxClass}`}>
            <AppIcon icon={metric.icon} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{metric.label}</div>
            <div className={`text-sm font-bold tabular-nums ${metric.valueClass}`}>{metric.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
