import dayjs from 'dayjs';
import { CALL_RESULT_LABELS, type Customer } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';
import type { LocaTouchpointConfigItem } from './types';

export const DEFAULT_LOCA_TOUCHPOINTS: LocaTouchpointConfigItem[] = [
  { key: 'now', label: 'Chạm 24h', daysMin: 1, daysMax: 1 },
  { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17 },
  { key: '19', label: 'Chạm 19', daysMin: 19, daysMax: 19 },
  { key: '21', label: 'Chạm 20', daysMin: 20, daysMax: 20 },
  { key: '23', label: 'Chạm 23', daysMin: 23, daysMax: 23 },
  { key: '25', label: 'Chạm 25', daysMin: 25, daysMax: 25 },
  { key: '30', label: 'Chạm 30', daysMin: 30, daysMax: 30 },
];

export const THIRTY_PLUS_TOUCHPOINT: LocaTouchpointConfigItem = {
  key: '30plus',
  label: '30+',
  daysMin: 31,
  daysMax: 999,
};

export function resolveActiveTouchpoints(touchpointConfigs?: LocaTouchpointConfigItem[]): LocaTouchpointConfigItem[] {
  const baseConfigs =
    touchpointConfigs && touchpointConfigs.length > 0
      ? touchpointConfigs.filter((tp) => tp.key === 'now' || tp.daysMin <= 30)
      : DEFAULT_LOCA_TOUCHPOINTS;

  const has30Plus = baseConfigs.some((tp) => tp.key === '30plus');
  return has30Plus ? baseConfigs : [...baseConfigs, THIRTY_PLUS_TOUCHPOINT];
}

export function getSortOrder(sortField: string, ascKey: string, descKey: string): 'ascend' | 'descend' | null {
  if (sortField === ascKey) return 'ascend';
  if (sortField === descKey) return 'descend';
  return null;
}

export type LastVisitDisplay =
  | { kind: 'callback'; formattedDate: string }
  | { kind: 'booked'; formattedDate: string }
  | { kind: 'days'; days: number }
  | { kind: 'never' };

export function resolveLastVisitDisplay(days: number | null, record: Customer): LastVisitDisplay {
  const hasCallback = record.callbackDate
    ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;
  if (hasCallback) {
    return { kind: 'callback', formattedDate: dayjs(record.callbackDate).format('DD/MM/YYYY') };
  }

  const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
  if (isBookingInFuture) {
    const state = record.lastBookingState;
    if (state === 'New' || state === 'Confirmed') {
      return { kind: 'booked', formattedDate: dayjs(record.lastBookingDate).format('DD/MM/YYYY') };
    }
  }

  if (days !== null) {
    return { kind: 'days', days };
  }

  return { kind: 'never' };
}

export interface AllocationDisplayInfo {
  diffDays: number;
  tooltipTitle: string;
  isCurrentlyAssigned: boolean;
}

export function resolveAllocationDisplayInfo(record: Customer): AllocationDisplayInfo | null {
  const assignedAt = record.assignedStaff?.assignedAt || record.assignedAt || record.lastAllocation?.assignedAt;
  if (!assignedAt) return null;

  const assignedDate = dayjs(assignedAt);
  const diffDays = Math.max(0, dayjs().diff(assignedDate, 'day'));
  const formattedDate = assignedDate.format('DD/MM/YYYY HH:mm');
  const isCurrentlyAssigned = Boolean(record.assignedStaff);
  const staffName = record.assignedStaff?.displayName || record.lastAllocation?.staffName;
  const tooltipTitle = isCurrentlyAssigned
    ? `Đang phân bổ cho: ${staffName || 'Booker'} (từ ${formattedDate})`
    : `Lần cuối phân bổ: ${formattedDate}${staffName ? ` (Booker trước: ${staffName})` : ''}`;

  return { diffDays, tooltipTitle, isCurrentlyAssigned };
}

export interface CallResultMeta {
  rawLabel: string;
  displayLabel: string;
  status: StatusType;
}

export function resolveCallResultMeta(result: string): CallResultMeta {
  const rawLabel = CALL_RESULT_LABELS[result as keyof typeof CALL_RESULT_LABELS] || result;
  const cleanLabel = rawLabel.includes('|') ? rawLabel.split('|')[0].trim() : rawLabel;
  const displayLabel = cleanLabel.length > 14 ? `${cleanLabel.substring(0, 14)}...` : cleanLabel;

  let status: StatusType = 'default';
  if (result === 'ANSWERED' || cleanLabel.includes('Thành công')) status = 'success';
  else if (result === 'NO_ANSWER' || cleanLabel.includes('Không nghe máy') || cleanLabel.includes('Lỡ')) {
    status = 'error';
  } else if (result === 'BUSY' || cleanLabel.includes('Máy bận')) {
    status = 'warning';
  } else if (result === 'FAILED' || result === 'WRONG_NUMBER') {
    status = 'error';
  }

  return { rawLabel, displayLabel, status };
}
