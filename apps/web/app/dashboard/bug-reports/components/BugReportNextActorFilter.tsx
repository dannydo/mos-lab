'use client';

import { Select } from 'antd';
import type { BugReportNextActor } from '@mos-lab/shared';
import { NEXT_ACTOR_LABELS } from '../bug-report-presenters';

const OPTIONS = [
  { value: 'ALL' as const, label: 'Mọi người phụ trách tiếp' },
  ...(['REPORTER', 'DANNY', 'AGENT', 'NONE'] as BugReportNextActor[]).map((value) => ({
    value,
    label: NEXT_ACTOR_LABELS[value],
  })),
];

export function BugReportNextActorFilter({
  value,
  onChange,
}: {
  value: BugReportNextActor | 'ALL';
  onChange: (value: BugReportNextActor | 'ALL') => void;
}) {
  return (
    <Select
      aria-label="Lọc người cần hành động tiếp"
      className="min-w-48"
      value={value}
      onChange={onChange}
      options={OPTIONS}
    />
  );
}
