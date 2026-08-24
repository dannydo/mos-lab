import { ReportComparisonMode } from '@mos-lab/shared';

export interface PreviousReportPeriod extends Record<string, string> {
  dateFrom: string;
  dateTo: string;
  /** Exact timestamp for an in-progress period; full end-of-day otherwise. */
  endAt: string;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalDateTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${formatLocalDate(date)} ${hours}:${minutes}:${seconds}`;
}

function parseLocalDate(date: string, endOfDay = false): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
}

function shiftLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Shift calendar months without allowing 31 March to overflow into March again. */
function shiftLocalMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

/**
 * Returns the matching prior calendar period. When the selected period is
 * active, its end is cut at the same clock time so a partial day is not
 * compared against a full prior day.
 */
export function getPreviousReportPeriod(
  startStr: string,
  endStr: string,
  mode: ReportComparisonMode
): PreviousReportPeriod | null {
  const now = new Date();
  const start = parseLocalDate(startStr);
  const selectedEnd = parseLocalDate(endStr, true);
  const todayStart = parseLocalDate(formatLocalDate(now));

  if (start > now) return null;

  const isActivePeriod = start <= now && selectedEnd >= todayStart;
  const effectiveEnd = isActivePeriod ? now : selectedEnd;
  const shift = (date: Date) =>
    mode === 'month' ? shiftLocalMonths(date, -1) : shiftLocalDays(date, mode === 'week' ? -7 : -1);
  const comparisonStart = shift(start);
  const comparisonEnd = shift(effectiveEnd);

  return {
    dateFrom: formatLocalDate(comparisonStart),
    dateTo: formatLocalDate(comparisonEnd),
    endAt: formatLocalDateTime(comparisonEnd),
  };
}
