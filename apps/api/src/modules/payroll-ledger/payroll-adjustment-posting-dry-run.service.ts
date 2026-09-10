import { createHash } from 'node:crypto';

export type ApprovedAdjustmentForDryRun = {
  status: string;
  targetPeriodKey: string;
  lines: Array<{ lineKey: string; recipientLegacyStaffId: number; deltaAmount: number; postingState: string }>;
};

/** Plans a posting without writing a payroll line or changing an adjustment state. */
export function dryRunApprovedAdjustment(input: ApprovedAdjustmentForDryRun) {
  if (input.status !== 'APPROVED') throw new Error('Only an approved adjustment can enter posting dry run');
  if (!input.targetPeriodKey.trim() || !input.lines.length)
    throw new Error('Posting dry run requires a target period and lines');
  if (
    input.lines.some(
      (line) =>
        !line.lineKey.trim() ||
        !Number.isSafeInteger(line.recipientLegacyStaffId) ||
        !Number.isSafeInteger(line.deltaAmount) ||
        line.postingState !== 'NOT_POSTED'
    )
  ) {
    throw new Error('Posting dry run requires untouched exact-VND adjustment lines');
  }
  const entries = input.lines.map((line) => ({
    targetPeriodKey: input.targetPeriodKey,
    lineKey: line.lineKey,
    recipientLegacyStaffId: line.recipientLegacyStaffId,
    amount: line.deltaAmount,
  }));
  return {
    mode: 'DRY_RUN_ONLY' as const,
    entryCount: entries.length,
    netAmount: entries.reduce((total, entry) => total + entry.amount, 0),
    entries,
    checksum: createHash('sha256').update(JSON.stringify(entries)).digest('hex'),
  };
}
