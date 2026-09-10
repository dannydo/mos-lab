import type { FalAdjustmentShadowResult, FalAdjustmentSnapshotInput } from '@mos-lab/shared';

function requiresReview(input: FalAdjustmentSnapshotInput, reason: string): FalAdjustmentShadowResult {
  return {
    status: 'REQUIRES_REVIEW',
    reason,
    sourcePeriodKey: input.sourcePeriod.periodKey,
    targetPeriodKey: input.targetPeriod.periodKey || null,
    beforeNetAmount: null,
    afterNetAmount: null,
    netDelta: null,
    effect: 'NO_PAYOUT',
  };
}

/**
 * Produces reviewable late-FAL math only.  It deliberately consumes the
 * versioned FAL eligibility and two previously calculated settlement
 * snapshots; it does not reinterpret duration, mutate legacy records, or
 * post any current-period adjustment.
 */
export function calculateFalAdjustmentShadow(input: FalAdjustmentSnapshotInput): FalAdjustmentShadowResult {
  if (input.sourcePeriod.status !== 'LOCKED') {
    return requiresReview(input, 'The source payroll period is not locked');
  }
  if (input.targetPeriod.status !== 'OPEN') {
    return requiresReview(input, 'The target payroll period is not open');
  }
  if (input.financialEligibility !== 'READY') {
    return requiresReview(input, 'The versioned FAL eligibility is not ready for financial review');
  }
  if (
    input.beforeSettlement.sourcePeriodKey !== input.sourcePeriod.periodKey ||
    input.afterSettlement.sourcePeriodKey !== input.sourcePeriod.periodKey ||
    input.beforeSettlement.calculationVersion !== input.sourcePeriod.calculationVersion ||
    input.afterSettlement.calculationVersion !== input.sourcePeriod.calculationVersion ||
    input.beforeSettlement.subjectKey !== input.afterSettlement.subjectKey
  ) {
    return requiresReview(input, 'Settlement snapshots do not describe one locked source-period subject');
  }

  const beforeNetAmount = input.beforeSettlement.receivedAmount;
  const afterNetAmount = input.afterSettlement.receivedAmount;
  const netDelta = afterNetAmount - beforeNetAmount;

  return {
    status: 'READY_FOR_APPROVAL',
    reason: null,
    sourcePeriodKey: input.sourcePeriod.periodKey,
    targetPeriodKey: input.targetPeriod.periodKey,
    beforeNetAmount,
    afterNetAmount,
    netDelta,
    effect: netDelta === 0 ? 'NO_PAYOUT' : 'CURRENT_PAYROLL_ADJUSTMENT',
  };
}
