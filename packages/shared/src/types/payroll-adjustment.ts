export const PAYROLL_ADJUSTMENT_SOURCE_TYPES = ['FAL', 'HR', 'SYSTEM'] as const;
export type PayrollAdjustmentSourceType = (typeof PAYROLL_ADJUSTMENT_SOURCE_TYPES)[number];

/**
 * A generic, review-only adjustment contract. Historical payroll is immutable:
 * the source period explains the difference while the target period receives a
 * separately approved future entry in a later posting phase.
 */
export interface PayrollAdjustmentCaseReference {
  eventKey: string;
  sourceType: PayrollAdjustmentSourceType;
  adjustmentType: string;
  sourcePeriodKey?: string | null;
  targetPeriodKey: string;
  status: 'DRAFT' | 'REQUIRES_REVIEW' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'REJECTED' | 'VOIDED';
}

export interface HrCustomAdjustmentInput {
  amount: number;
  comment: string;
  sourcePeriodKey?: string | null;
  targetPeriodKey: string;
  targetPeriodStatus: 'OPEN' | 'REVIEWING' | 'LOCKED' | 'ARCHIVED';
}
