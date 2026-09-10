import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcilePayrollComponentParity } from './payroll-component-parity.service.js';

test('payroll parity accepts only exact half-VND component matches', () => {
  const result = reconcilePayrollComponentParity({
    mos: [
      { sourceKey: 'service:101', subjectKey: 'staff:cc:an', component: 'CC_XOAY_CASH', amountHalfDong: 65 },
      { sourceKey: 'service:101', subjectKey: 'staff:cc:binh', component: 'CC_XOAY_CASH', amountHalfDong: 65 },
    ],
    reference: [
      { sourceKey: 'service:101', subjectKey: 'staff:cc:an', component: 'CC_XOAY_CASH', amountHalfDong: 65 },
      { sourceKey: 'service:101', subjectKey: 'staff:cc:binh', component: 'CC_XOAY_CASH', amountHalfDong: 65 },
    ],
  });
  assert.deepEqual(result, { matchedCount: 2, mismatches: [] });
});

test('payroll parity exposes one-half-VND drift and missing source evidence', () => {
  const result = reconcilePayrollComponentParity({
    mos: [
      { sourceKey: 'service:101', subjectKey: 'staff:cc:an', component: 'CC_XOAY_CASH', amountHalfDong: 66 },
      { sourceKey: 'day:2026-09-10', subjectKey: 'staff:cc:an', component: 'CC_DAILY_BONUS', amountHalfDong: 200 },
    ],
    reference: [
      { sourceKey: 'service:101', subjectKey: 'staff:cc:an', component: 'CC_XOAY_CASH', amountHalfDong: 65 },
      { sourceKey: 'tip:101', subjectKey: 'staff:cc:an', component: 'CC_TIP_CASH', amountHalfDong: 20 },
    ],
  });
  assert.deepEqual(result, {
    matchedCount: 0,
    mismatches: [
      {
        sourceKey: 'day:2026-09-10',
        subjectKey: 'staff:cc:an',
        component: 'CC_DAILY_BONUS',
        kind: 'MISSING_REFERENCE',
        mosAmountHalfDong: 200,
        referenceAmountHalfDong: null,
        deltaHalfDong: null,
      },
      {
        sourceKey: 'tip:101',
        subjectKey: 'staff:cc:an',
        component: 'CC_TIP_CASH',
        kind: 'MISSING_MOS',
        mosAmountHalfDong: null,
        referenceAmountHalfDong: 20,
        deltaHalfDong: null,
      },
      {
        sourceKey: 'service:101',
        subjectKey: 'staff:cc:an',
        component: 'CC_XOAY_CASH',
        kind: 'AMOUNT_MISMATCH',
        mosAmountHalfDong: 66,
        referenceAmountHalfDong: 65,
        deltaHalfDong: 1,
      },
    ],
  });
});
