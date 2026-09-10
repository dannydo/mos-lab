import type { FalFinancialEligibility, FalRule } from './fal.js';
import type { PayrollPeriodStatus, ShadowSettlementResult } from './payroll-ledger.js';

export const FAL_ADJUSTMENT_CASE_STATUSES = [
  'DRAFT',
  'REQUIRES_REVIEW',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'POSTED',
  'REJECTED',
  'VOIDED',
] as const;
export type FalAdjustmentCaseStatus = (typeof FAL_ADJUSTMENT_CASE_STATUSES)[number];

export const FAL_ADJUSTMENT_EFFECTS = ['CURRENT_PAYROLL_ADJUSTMENT', 'NO_PAYOUT'] as const;
export type FalAdjustmentEffect = (typeof FAL_ADJUSTMENT_EFFECTS)[number];

export interface FalAdjustmentSnapshotInput {
  eventKey: string;
  falRule: Extract<FalRule, 'Fix' | 'Adjust' | 'Log'>;
  financialEligibility: FalFinancialEligibility;
  sourcePeriod: {
    periodKey: string;
    status: PayrollPeriodStatus;
    calculationVersion: string;
  };
  targetPeriod: {
    periodKey: string;
    status: PayrollPeriodStatus;
  };
  beforeSettlement: ShadowSettlementResult;
  afterSettlement: ShadowSettlementResult;
}

export interface FalAdjustmentShadowResult {
  status: Exclude<FalAdjustmentCaseStatus, 'APPROVED' | 'POSTED' | 'REJECTED' | 'VOIDED'>;
  reason: string | null;
  sourcePeriodKey: string;
  targetPeriodKey: string | null;
  beforeNetAmount: number | null;
  afterNetAmount: number | null;
  netDelta: number | null;
  effect: FalAdjustmentEffect;
}
