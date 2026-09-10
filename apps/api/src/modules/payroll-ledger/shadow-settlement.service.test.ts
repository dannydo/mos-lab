import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateShadowSettlement } from './shadow-settlement.service.js';

const lockedAugust = {
  periodKey: '2026-08',
  status: 'LOCKED' as const,
  calculationVersion: 'cc-cash-ledger.v1',
};

test('shadow settlement aggregates half-VND source values before one final rounding', () => {
  const result = calculateShadowSettlement({
    sourcePeriod: lockedAugust,
    subjectKey: 'staff:diem-huong:cc-xoay',
    lines: [
      { sourceKey: 'cash-bonus:1', amountHalfDong: 1 },
      { sourceKey: 'cash-bonus:2', amountHalfDong: 1 },
    ],
  });

  assert.equal(result.grossAmount, 1);
  assert.equal(result.receivedAmount, 1);
  assert.equal(result.holdAmount, 0);
});

test('shadow settlement applies a cap only after the source aggregate is rounded', () => {
  const result = calculateShadowSettlement({
    sourcePeriod: lockedAugust,
    subjectKey: 'staff:diem-huong:cc-xoay',
    lines: [{ sourceKey: 'cash-bonus:august', amountHalfDong: 6_471_920 }],
    capAmountHalfDong: 4_034_937,
  });

  assert.deepEqual(result, {
    mode: 'SHADOW_READ_ONLY',
    sourcePeriodKey: '2026-08',
    calculationVersion: 'cc-cash-ledger.v1',
    subjectKey: 'staff:diem-huong:cc-xoay',
    lineCount: 1,
    grossAmount: 3_235_960,
    capAmount: 2_017_469,
    receivedAmount: 2_017_469,
    holdAmount: 1_218_491,
  });
});

test('shadow settlement fails closed for an open period, missing lines, duplicated source keys, or fractional input', () => {
  assert.throws(
    () =>
      calculateShadowSettlement({
        sourcePeriod: { ...lockedAugust, status: 'OPEN' },
        subjectKey: 'staff:1',
        lines: [{ sourceKey: 'cash-bonus:1', amountHalfDong: 1 }],
      }),
    /locked source payroll period/
  );
  assert.throws(
    () => calculateShadowSettlement({ sourcePeriod: lockedAugust, subjectKey: 'staff:1', lines: [] }),
    /at least one source line/
  );
  assert.throws(
    () =>
      calculateShadowSettlement({
        sourcePeriod: lockedAugust,
        subjectKey: 'staff:1',
        lines: [
          { sourceKey: 'cash-bonus:1', amountHalfDong: 1 },
          { sourceKey: 'cash-bonus:1', amountHalfDong: 1 },
        ],
      }),
    /source keys/
  );
  assert.throws(
    () =>
      calculateShadowSettlement({
        sourcePeriod: lockedAugust,
        subjectKey: 'staff:1',
        lines: [{ sourceKey: 'cash-bonus:1', amountHalfDong: 0.5 }],
      }),
    /exact integer/
  );
});
