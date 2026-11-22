'use client';

import type { Customer } from '@mos-lab/shared';
import { getOperationalStatus, type OperationalTone } from './customer-table-utils';

const TONE_CLASS_MAP: Record<OperationalTone, string> = {
  callback: 'font-bold text-amber-800 dark:text-amber-400',
  booked: 'font-bold text-emerald-700 dark:text-emerald-400',
  missed:
    'inline-block rounded-md border border-rose-200 bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/20 dark:text-rose-300',
  neutral: 'text-slate-600 dark:text-slate-400',
};

export function CustomerOperationalStatus({ record }: { record: Customer }) {
  const status = getOperationalStatus(record);
  const icon =
    status.tone === 'callback' ? '🕒 ' : status.tone === 'booked' ? '📅 ' : status.tone === 'missed' ? '⚠️ ' : '';

  return (
    <span className={TONE_CLASS_MAP[status.tone]}>
      {icon}
      {status.label}
    </span>
  );
}
