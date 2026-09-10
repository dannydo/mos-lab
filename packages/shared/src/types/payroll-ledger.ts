/**
 * Payroll periods are the company-wide boundary for every payroll surface.
 * A locked period is immutable: later corrections are calculated from a
 * snapshot and can only become a separately approved current-period entry.
 */
export const PAYROLL_PERIOD_STATUSES = ['OPEN', 'REVIEWING', 'LOCKED', 'ARCHIVED'] as const;
export type PayrollPeriodStatus = (typeof PAYROLL_PERIOD_STATUSES)[number];

export interface PayrollPeriod {
  id: number;
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
  timezone: string;
  status: PayrollPeriodStatus;
  calculationVersion: string;
  lockedAt?: string | null;
  lockedByStaffId?: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The calculator receives half-VND units, never floating point values.  It
 * allows the established 50/50 CC split and 150% cap to stay exact until one
 * final rounding operation at the settlement total.
 */
export interface ShadowSettlementLine {
  sourceKey: string;
  amountHalfDong: number;
}

export interface ShadowSettlementRequest {
  sourcePeriod: Pick<PayrollPeriod, 'periodKey' | 'status' | 'calculationVersion'>;
  subjectKey: string;
  lines: readonly ShadowSettlementLine[];
  /** Exact cap before final rounding; omit when the source has no cap. */
  capAmountHalfDong?: number | null;
}

export interface ShadowSettlementResult {
  mode: 'SHADOW_READ_ONLY';
  sourcePeriodKey: string;
  calculationVersion: string;
  subjectKey: string;
  lineCount: number;
  grossAmount: number;
  capAmount: number | null;
  receivedAmount: number;
  holdAmount: number;
}
