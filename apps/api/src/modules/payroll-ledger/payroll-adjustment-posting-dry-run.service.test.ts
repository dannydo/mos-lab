import assert from 'node:assert/strict';
import test from 'node:test';
import { dryRunApprovedAdjustment } from './payroll-adjustment-posting-dry-run.service.js';

test('posting dry run plans exact lines without allowing a write state', () => {
  const result = dryRunApprovedAdjustment({
    status: 'APPROVED',
    targetPeriodKey: 'LAB-2026-12-OPEN',
    lines: [{ lineKey: 'line:1', recipientLegacyStaffId: 1, deltaAmount: -75, postingState: 'NOT_POSTED' }],
  });
  assert.equal(result.mode, 'DRY_RUN_ONLY');
  assert.equal(result.netAmount, -75);
  assert.throws(
    () => dryRunApprovedAdjustment({ status: 'READY_FOR_APPROVAL', targetPeriodKey: 'LAB', lines: [] }),
    /approved adjustment/
  );
});
