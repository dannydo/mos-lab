/** A matching completed or in-progress period used for trend comparison. */
export type ReportComparisonMode = 'month' | 'week' | 'day';

export interface ReportPeriodComparison {
  mode: ReportComparisonMode;
  dateFrom: string;
  dateTo: string;
}
