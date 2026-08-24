import { useMemo } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { ReportComparisonMode, ReportPeriodComparison } from '@mos-lab/shared';

interface PreviousReportPeriod {
  comparison: ReportPeriodComparison;
  params: {
    dateFrom: string;
    dateTo: string;
    /** Exact cutoff for an in-progress period; end of day for a closed period. */
    endAt: string;
  };
}

/**
 * Matches the selected report period to the previous month, ISO week, or day.
 * An in-progress period is capped at today so its previous counterpart does
 * not include later dates.
 */
export function usePreviousReportPeriod(
  dateRange: [Dayjs, Dayjs] | undefined,
  mode: ReportComparisonMode
): PreviousReportPeriod | null {
  return useMemo(() => {
    if (!dateRange?.[0]?.isValid() || !dateRange?.[1]?.isValid()) return null;

    const now = dayjs();
    const start = dateRange[0].startOf('day');
    const selectedEnd = dateRange[1].endOf('day');

    if (start.isAfter(now)) return null;

    const effectiveEnd = selectedEnd.isAfter(now) ? now : selectedEnd;
    const shift = (date: Dayjs) =>
      mode === 'month' ? date.subtract(1, 'month') : date.subtract(mode === 'week' ? 7 : 1, 'day');
    const previousStart = shift(start);
    const previousEnd = shift(effectiveEnd);
    const dateFrom = previousStart.format('YYYY-MM-DD');
    const dateTo = previousEnd.format('YYYY-MM-DD');

    return {
      comparison: { mode, dateFrom, dateTo },
      params: { dateFrom, dateTo, endAt: previousEnd.format('YYYY-MM-DD HH:mm:ss') },
    };
  }, [dateRange, mode]);
}
