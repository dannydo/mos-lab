import assert from 'node:assert/strict';
import test from 'node:test';
import { validateHrCustomAdjustment } from './hr-custom-adjustment.service.js';

test('HR Custom Adjustment accepts signed whole-VND with a mandatory comment', () => {
  assert.deepEqual(
    validateHrCustomAdjustment({
      amount: -125_000,
      comment: 'Hoàn lại phụ cấp đã chi trùng',
      sourcePeriodKey: '2026-08',
      targetPeriodKey: '2026-09',
      targetPeriodStatus: 'OPEN',
    }),
    {
      sourceType: 'HR',
      adjustmentType: 'HR_CUSTOM',
      amount: -125_000,
      comment: 'Hoàn lại phụ cấp đã chi trùng',
      sourcePeriodKey: '2026-08',
      targetPeriodKey: '2026-09',
    }
  );
});

test('HR Custom Adjustment fails closed without a comment, a whole amount, or an open target period', () => {
  const base = {
    amount: 125_000,
    comment: 'Bổ sung phụ cấp',
    targetPeriodKey: '2026-09',
    targetPeriodStatus: 'OPEN' as const,
  };
  assert.throws(() => validateHrCustomAdjustment({ ...base, comment: '  ' }), /requires a comment/);
  assert.throws(() => validateHrCustomAdjustment({ ...base, amount: 0 }), /non-zero whole-VND/);
  assert.throws(() => validateHrCustomAdjustment({ ...base, targetPeriodStatus: 'LOCKED' }), /open payroll period/);
});
