import type { HrCustomAdjustmentInput } from '@mos-lab/shared';

export type ValidatedHrCustomAdjustment = {
  sourceType: 'HR';
  adjustmentType: 'HR_CUSTOM';
  amount: number;
  comment: string;
  sourcePeriodKey: string | null;
  targetPeriodKey: string;
};

/**
 * HR may create an explicit increase or decrease, but it can never be a
 * silent or historical mutation. Posting remains unavailable in this phase.
 */
export function validateHrCustomAdjustment(input: HrCustomAdjustmentInput): ValidatedHrCustomAdjustment {
  if (!Number.isSafeInteger(input.amount) || input.amount === 0) {
    throw new Error('HR Custom Adjustment must be a non-zero whole-VND amount');
  }
  const comment = input.comment.trim();
  if (!comment) throw new Error('HR Custom Adjustment requires a comment');
  if (input.targetPeriodStatus !== 'OPEN') {
    throw new Error('HR Custom Adjustment can only target an open payroll period');
  }
  return {
    sourceType: 'HR',
    adjustmentType: 'HR_CUSTOM',
    amount: input.amount,
    comment,
    sourcePeriodKey: input.sourcePeriodKey?.trim() || null,
    targetPeriodKey: input.targetPeriodKey,
  };
}
