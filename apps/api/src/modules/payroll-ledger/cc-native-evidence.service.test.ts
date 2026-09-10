import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from './cc-native-evidence.service.js';

const policy = {
  policyVersion: 'cc-daily-sales.v1',
  tiers: [
    { minimumQualifyingSalesVnd: 0, rateBasisPoints: 50 },
    { minimumQualifyingSalesVnd: 5_000_000, rateBasisPoints: 100 },
  ],
} as const;

test('native daily sales evidence preserves the policy snapshot and exact whole-VND outcome', () => {
  const calculated = __test__.calculateDailyBonusHalfDong(5_000_000, policy);
  assert.equal(calculated.amountHalfDong, 100_000);
  assert.equal(typeof calculated.policyHash, 'string');

  const prepared = __test__.prepareEvidence({
    evidenceKey: 'mos:evidence:daily:2026-09-10:bao-han',
    payrollPeriodId: 7,
    subjectKey: 'staff:cc:bao-han',
    sourceReference: 'mos:daily-close:2026-09-10:bao-han',
    sourceOccurredAt: '2026-09-10T14:00:00.000Z',
    payload: { kind: 'DAILY_SALES_CLOSE', qualifyingSalesVnd: 5_000_000, policy },
  });
  assert.equal(prepared.component, 'CC_DAILY_BONUS');
  assert.equal(prepared.amountHalfDong, 100_000);
  assert.equal(prepared.policyVersion, policy.policyVersion);
});

test('native service and tip evidence retain half-dong precision without Legacy fallback', () => {
  const service = __test__.prepareEvidence({
    evidenceKey: 'mos:evidence:service:9001:bao-han',
    payrollPeriodId: 7,
    subjectKey: 'staff:cc:bao-han',
    sourceReference: 'mos:completed-service:9001',
    sourceOccurredAt: '2026-09-10T09:00:00.000Z',
    payload: { kind: 'COMPLETED_SERVICE', previousPoints: 0, shareCount: 2 },
  });
  assert.equal(service.amountHalfDong, 65);

  const tip = __test__.prepareEvidence({
    evidenceKey: 'mos:evidence:tip:9001:bao-han',
    payrollPeriodId: 7,
    subjectKey: 'staff:cc:bao-han',
    sourceReference: 'mos:cash-tip:9001:cc-1',
    sourceOccurredAt: '2026-09-10T09:10:00.000Z',
    payload: { kind: 'CASH_TIP', cashTipPoolVnd: 1_000, ccVisitRole: 'ONE_END' },
  });
  assert.equal(tip.component, 'CC_TIP_CASH');
  assert.equal(tip.amountHalfDong, 200);
  assert.equal(__test__.calculateCashTipHalfDong(1_000, 'BOTH_ENDS'), 400);
});

test('native evidence fails closed for a Legacy reference or an unrepresentable policy result', () => {
  assert.throws(
    () =>
      __test__.prepareEvidence({
        evidenceKey: 'legacy:evidence:1',
        payrollPeriodId: 7,
        subjectKey: 'staff:cc:bao-han',
        sourceReference: 'legacy:order:1',
        sourceOccurredAt: '2026-09-10T09:00:00.000Z',
        payload: { kind: 'COMPLETED_SERVICE', previousPoints: 0, shareCount: 1 },
      }),
    /requires an mOS key/
  );
  assert.throws(() => __test__.calculateDailyBonusHalfDong(1, policy), /sub-VND rounding difference/);
  assert.throws(() => __test__.calculateCashTipHalfDong(1, 'ONE_END'), /cannot be represented exactly/);
  assert.throws(
    () =>
      __test__.prepareEvidence({
        evidenceKey: 'mos:evidence:tip:source-mismatch',
        payrollPeriodId: 7,
        subjectKey: 'staff:cc:bao-han',
        sourceReference: 'mos:completed-service:9001',
        sourceOccurredAt: '2026-09-10T09:10:00.000Z',
        payload: { kind: 'CASH_TIP', cashTipPoolVnd: 1_000, ccVisitRole: 'BOTH_ENDS' },
      }),
    /matching mOS operational source/
  );
});
