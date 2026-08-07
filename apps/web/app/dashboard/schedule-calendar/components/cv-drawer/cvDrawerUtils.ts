import dayjs, { Dayjs } from 'dayjs';
import { Appointment, CvStaffRealtimeStatus, CvQueueEntry } from '@mos-lab/shared';

export type CvAvailabilityState = 'IDLE' | 'UPCOMING' | 'BUSY' | 'ENDING_SOON' | 'OVERTIME' | 'LOCKED';

export interface CvAvailabilityInfo {
  state: CvAvailabilityState;
  label: string;
  badgeStyle: string;
  cardStyle: string;
  customerName?: string;
  minutesRemaining?: number;
  minutesUntilNext?: number;
  /** Benchmark-based ETA info when CV is busy */
  etaInfo?: {
    etaMinutes: number;
    layer: 1 | 2 | 3;
    lashStyle?: string;
    source?: string;
  };
}

export interface StaffWorkingItem {
  id: number;
  name: string;
  avatarUrl?: string | null;
  branchName?: string;
  shift?: string;
  bookedCount?: number;
  doneCount?: number;
  avgDurationMinutes?: {
    normalAvg?: number;
    retainAvg?: number;
    removalAvg?: number;
    overallAvg?: number;
  };
}

export interface StaffOffItem {
  id: number;
  name: string;
  avatarUrl?: string | null;
  branchName?: string;
  reason: string;
  type?: string;
}

export interface DailyCapInfo {
  workingKtvCount: number;
  maxCapacity: number;
  workingStaffList?: StaffWorkingItem[];
  offStaffList?: StaffOffItem[];
}

/**
 * Returns badge and card CSS classes for different availability states
 */
export function getStatusStyles(state: CvAvailabilityState): { badgeStyle: string; cardStyle: string } {
  switch (state) {
    case 'BUSY':
      return {
        badgeStyle: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 font-bold',
        cardStyle:
          'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60 shadow-xs hover:border-blue-400',
      };
    case 'ENDING_SOON':
      return {
        badgeStyle: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold',
        cardStyle:
          'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 shadow-xs hover:border-amber-400',
      };
    case 'OVERTIME':
      return {
        badgeStyle: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 font-extrabold animate-pulse',
        cardStyle:
          'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 shadow-xs hover:border-rose-400',
      };
    case 'UPCOMING':
      return {
        badgeStyle: 'bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-500/40 font-bold',
        cardStyle:
          'bg-yellow-50/60 dark:bg-yellow-950/30 border-yellow-200/80 dark:border-yellow-800/60 shadow-xs hover:border-yellow-400',
      };
    case 'LOCKED':
      return {
        badgeStyle: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30 font-medium',
        cardStyle: 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/60',
      };
    case 'IDLE':
    default:
      return {
        badgeStyle: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold',
        cardStyle:
          'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/50 shadow-2xs hover:border-emerald-400',
      };
  }
}

/**
 * Converts real-time server status to CvAvailabilityInfo for display
 */
export function realtimeStatusToAvailability(status: CvStaffRealtimeStatus): CvAvailabilityInfo {
  const state = (status.liveStatus || 'IDLE') as CvAvailabilityState;
  const styles = getStatusStyles(state);
  return {
    state,
    label: status.liveLabel || '🟢 Đang rảnh',
    ...styles,
    customerName: status.currentCustomerName || undefined,
    minutesRemaining: status.estimatedEndMinutes ?? undefined,
  };
}

/**
 * Fallback: Calculates availability from appointments when realtime API is unavailable
 */
export function computeCvAvailability(
  staffId: number,
  dayAppts: Appointment[],
  currentDate: Dayjs
): CvAvailabilityInfo {
  const now = dayjs();
  const isToday = currentDate.isSame(now, 'day');

  if (!isToday) {
    const isPast = currentDate.isBefore(now, 'day');
    return {
      state: 'IDLE',
      label: isPast ? '🏁 Đã xong ca' : '📅 Đã sẵn sàng ca',
      badgeStyle: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-medium',
      cardStyle: 'bg-white dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60',
    };
  }

  const staffAppts = dayAppts.filter(
    (a) =>
      Number((a as any).technicianId) === Number(staffId) && a.orderState !== 'Cancelled' && a.orderState !== 'Missed'
  );

  const activeAppt = staffAppts.find((a) => {
    if (a.orderState === 'Completed' || a.orderState === 'ServiceCompleted' || a.orderState === 'CheckOut')
      return false;
    const startStr = a.bookingDateStart || (a as any).booking_date_start || (a as any).date_start;
    const start = dayjs(startStr);
    if (!start.isValid()) return false;
    const duration = (a as any).durationMinutes || (a as any).estimatedMinutes || 75;
    const end = start.add(duration, 'minute');
    return now.isAfter(start.subtract(5, 'minute')) && now.isBefore(end.add(30, 'minute'));
  });

  if (activeAppt) {
    const startStr =
      activeAppt.bookingDateStart || (activeAppt as any).booking_date_start || (activeAppt as any).date_start;
    const start = dayjs(startStr);
    const duration = (activeAppt as any).durationMinutes || (activeAppt as any).estimatedMinutes || 75;
    const estimatedEnd = start.add(duration, 'minute');
    const diffMinutes = estimatedEnd.diff(now, 'minute');
    const custName = activeAppt.customerName || (activeAppt as any).userName || 'Khách hàng';

    if (diffMinutes < -10) {
      const styles = getStatusStyles('OVERTIME');
      return {
        state: 'OVERTIME',
        label: `🔴 Quá giờ (${Math.abs(diffMinutes)}p) • ${custName}`,
        ...styles,
        customerName: custName,
        minutesRemaining: diffMinutes,
      };
    } else if (diffMinutes <= 10) {
      const styles = getStatusStyles('ENDING_SOON');
      return {
        state: 'ENDING_SOON',
        label: `⚡ Sắp xong (còn ${Math.max(1, diffMinutes)}p) • ${custName}`,
        ...styles,
        customerName: custName,
        minutesRemaining: diffMinutes,
      };
    } else {
      const styles = getStatusStyles('BUSY');
      return {
        state: 'BUSY',
        label: `🔵 Đang nối (còn ${diffMinutes}p) • ${custName}`,
        ...styles,
        customerName: custName,
        minutesRemaining: diffMinutes,
      };
    }
  }

  const upcomingAppt = staffAppts
    .filter((a) => {
      if (a.orderState === 'Completed' || a.orderState === 'ServiceCompleted' || a.orderState === 'CheckOut')
        return false;
      const startStr = a.bookingDateStart || (a as any).booking_date_start || (a as any).date_start;
      const start = dayjs(startStr);
      return start.isValid() && start.isAfter(now);
    })
    .sort((a, b) => dayjs(a.bookingDateStart).diff(dayjs(b.bookingDateStart)))[0];

  if (upcomingAppt) {
    const nextStartStr =
      upcomingAppt.bookingDateStart || (upcomingAppt as any).booking_date_start || (upcomingAppt as any).date_start;
    const nextStart = dayjs(nextStartStr);
    const diffToStart = nextStart.diff(now, 'minute');
    const custName = upcomingAppt.customerName || (upcomingAppt as any).userName || 'Khách hàng';

    if (diffToStart <= 30) {
      const styles = getStatusStyles('UPCOMING');
      return {
        state: 'UPCOMING',
        label: `🟡 Sắp có khách (trong ${Math.max(1, diffToStart)}p) • ${custName}`,
        ...styles,
        customerName: custName,
        minutesUntilNext: diffToStart,
      };
    }
  }

  const styles = getStatusStyles('IDLE');
  return { state: 'IDLE', label: '🟢 Đang rảnh', ...styles };
}

export function getQueueBorderColor(entry: CvQueueEntry, staffStatus?: CvStaffRealtimeStatus): string {
  if (entry.isLockedForBooking) return 'ring-amber-400 dark:ring-amber-500';
  if (!entry.isAvailableNow) return 'ring-blue-500 dark:ring-blue-400';
  return 'ring-emerald-500 dark:ring-emerald-400';
}

export function getQueueBgGlow(entry: CvQueueEntry): string {
  if (entry.isLockedForBooking) return 'shadow-amber-500/20';
  if (!entry.isAvailableNow) return 'shadow-blue-500/20';
  return 'shadow-emerald-500/20';
}
