import type { DailyCallEntry } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';
import { formatDuration } from '~/lib/format-utils';
import type {
  CallStatusMeta,
  DailyCallsScope,
  DurationBadgePresentation,
  HappyCallButtonMeta,
} from './dailyCallsTableTypes';

const DURATION_BADGE_BASE_CLASS =
  'inline-flex items-center justify-center rounded border-[1.5px] px-2 py-0.5 font-mono text-[13px] leading-tight tabular-nums';

export function isValidDailyCallsScope(value: string | null): value is DailyCallsScope {
  return value === 'all' || value === 'me' || value === 'nyc';
}

export function getDurationBadgePresentation(sec: number | null): DurationBadgePresentation {
  const seconds = sec || 0;
  const formatted = seconds === 0 ? '00:00' : formatDuration(seconds);
  const label = formatted === '-' ? '00:00' : formatted;

  if (seconds === 0) {
    return {
      label,
      className: `${DURATION_BADGE_BASE_CLASS} font-normal opacity-50 text-zinc-500 border-zinc-300 bg-black/[0.02] dark:text-zinc-500 dark:border-zinc-700 dark:bg-white/[0.02]`,
    };
  }
  if (seconds < 30) {
    return {
      label,
      className: `${DURATION_BADGE_BASE_CLASS} font-semibold text-cyan-700 border-cyan-300 bg-cyan-50 dark:text-cyan-400 dark:border-cyan-800 dark:bg-cyan-950/70`,
    };
  }
  if (seconds < 60) {
    return {
      label,
      className: `${DURATION_BADGE_BASE_CLASS} font-semibold text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/70`,
    };
  }
  if (seconds < 180) {
    return {
      label,
      className: `${DURATION_BADGE_BASE_CLASS} font-bold text-orange-700 border-orange-300 bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:bg-orange-950/70`,
    };
  }
  return {
    label,
    className: `${DURATION_BADGE_BASE_CLASS} font-extrabold border-2 shadow-2xs text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/70`,
  };
}

export function getDesktopCallStatusMeta(result: string | null): CallStatusMeta {
  if (result === 'ANSWERED') return { status: 'success', label: 'Có bắt máy' };
  if (result === 'NO_ANSWER') return { status: 'warning', label: 'Không trả lời [Gọi nhỡ]' };
  if (result === 'WRONG_NUMBER') return { status: 'error', label: 'Sai số' };
  if (result === 'BUSY') return { status: 'error', label: 'Máy bận' };
  if (result === 'FAILED') return { status: 'error', label: 'Lỗi cuộc gọi' };
  return { status: 'default', label: result || 'Chưa rõ' };
}

export function getMobileCallStatusMeta(record: DailyCallEntry): {
  durationText: string;
  statusLabel: string;
  statusType: StatusType;
} {
  const durationText = record.durationSec ? formatDuration(record.durationSec) : '00:00';
  const statusLabel =
    record.callResult === 'ANSWERED'
      ? 'Có bắt máy'
      : record.callResult === 'NO_ANSWER'
        ? 'Không trả lời'
        : record.callResult === 'WRONG_NUMBER'
          ? 'Sai số'
          : record.callResult === 'BUSY'
            ? 'Máy bận'
            : record.callResult === 'FAILED'
              ? 'Lỗi cuộc gọi'
              : record.callResult || 'Chưa rõ';
  const statusType: StatusType =
    record.callResult === 'ANSWERED' ? 'success' : record.callResult === 'NO_ANSWER' ? 'warning' : 'default';

  return { durationText, statusLabel, statusType };
}

export function getHappyCallButtonMeta(happyCallStatus?: string): HappyCallButtonMeta {
  if (happyCallStatus === 'APPROVED') {
    return {
      text: 'Đồng ý',
      type: 'default',
      className:
        'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 hover:border-emerald-400 hover:text-emerald-500',
    };
  }
  if (happyCallStatus === 'REJECTED') {
    return {
      text: 'Từ chối',
      type: 'default',
      className:
        'border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400 hover:border-rose-400 hover:text-rose-500',
    };
  }
  if (happyCallStatus === 'PENDING_APPROVAL') {
    return {
      text: 'Chờ duyệt',
      type: 'default',
      className:
        'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400 hover:border-amber-400 hover:text-amber-500',
    };
  }
  return {
    text: 'Chưa xét',
    type: 'primary',
    className: 'text-[var(--mos-accent-contrast)]',
  };
}

export function sliceVisibleDailyCalls(
  data: DailyCallEntry[],
  isMobile: boolean,
  currentPage: number,
  pageSize: number
): DailyCallEntry[] {
  if (!isMobile) return data;
  const start = (currentPage - 1) * pageSize;
  return data.slice(start, start + pageSize);
}
