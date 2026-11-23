import dayjs from 'dayjs';
import type { Customer } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export type OperationalTone = 'callback' | 'booked' | 'missed' | 'neutral';

export interface CustomerCallResultBadge {
  status: StatusType;
  label: string;
}

export const formatDuration = (secs?: number | null): string => {
  if (secs === undefined || secs === null) return '-';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function getOperationalStatus(record: Customer): { label: string; tone: OperationalTone } {
  const days = record.daysSinceLastVisit;
  const hasCallback = record.callbackDate
    ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;

  if (hasCallback) {
    return { label: `Hẹn gọi lại: ${dayjs(record.callbackDate).format('DD/MM/YYYY')}`, tone: 'callback' };
  }

  const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
  if (isBookingInFuture && (record.lastBookingState === 'New' || record.lastBookingState === 'Confirmed')) {
    return { label: `Booked: ${dayjs(record.lastBookingDate).format('DD/MM/YYYY')}`, tone: 'booked' };
  }

  const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
  const isMissed =
    isBookingInPast &&
    record.lastBookingState &&
    !['Completed', 'ServiceCompleted', 'CheckIn', 'CheckOut', 'ServiceStart'].includes(record.lastBookingState);
  if (isMissed) {
    const bookingDate = dayjs(record.lastBookingDate).startOf('day');
    return {
      label: `Missed: ${Math.max(0, dayjs().startOf('day').diff(bookingDate, 'day'))} ngày`,
      tone: 'missed',
    };
  }

  return {
    label: days !== null && days !== undefined ? `${days} ngày chưa tới` : 'Chưa từng đến',
    tone: 'neutral',
  };
}

export function getCallResult(record: Customer, labels: Record<string, string>): CustomerCallResultBadge | null {
  const result = record.lastCall?.callResult;
  if (!result) return null;
  let status: StatusType = 'default';
  if (result === 'ANSWERED' || result === 'SUCCESS' || result === 'COMPLETED') status = 'success';
  else if (result === 'NO_ANSWER') status = 'warning';
  else if (result === 'BUSY') status = 'orange';
  else if (result === 'FAILED' || result === 'WRONG_NUMBER') status = 'error';
  return { status, label: labels[result] || result };
}

export function getCustomerRowClassName(record: Customer, themeMode: string): string {
  // 1. check callback date ("có hẹn gọi lại -> màu hy vọng")
  const hasCallback = record.callbackDate
    ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;
  if (hasCallback) {
    return themeMode === 'dark' ? 'row-hope-dark' : 'row-hope-light';
  }

  // 2. check if they have a future booking ("đã booked -> sẽ đến, chuyển sang màu xanh")
  const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
  if (isBookingInFuture) {
    const state = record.lastBookingState;
    const isBooked = state === 'New' || state === 'Confirmed';
    if (isBooked) {
      return themeMode === 'dark' ? 'row-booked-future-dark' : 'row-booked-future-light';
    }
  }

  // 3. check positive daysSinceLastVisit but missed booking ("đã booked mà chưa tới (missed), chuyển sang màu đỏ lợt")
  const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
  if (isBookingInPast) {
    const state = record.lastBookingState;
    const isMissed =
      state &&
      state !== 'Completed' &&
      state !== 'ServiceCompleted' &&
      state !== 'CheckIn' &&
      state !== 'CheckOut' &&
      state !== 'ServiceStart';
    if (isMissed) {
      return themeMode === 'dark' ? 'row-missed-dark' : 'row-missed-light';
    }
  }

  return '';
}

export const CUSTOMER_COLUMN_PRIORITY = {
  stt: 'tertiary',
  name: 'primary',
  daysSinceLastVisit: 'primary',
  totalSpent: 'secondary',
  assignedStaff: 'secondary',
  lastCallDate: 'secondary',
  lastCallDuration: 'tertiary',
  lastCallResult: 'primary',
  lastCallNote: 'tertiary',
  allocatedDays: 'tertiary',
  actions: 'primary',
} as const;
