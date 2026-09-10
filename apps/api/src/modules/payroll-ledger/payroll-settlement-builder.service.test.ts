import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from './payroll-settlement-builder.service.js';

const period = {
  periodKey: 'LAB-2026-11',
  label: 'November local',
  startDate: new Date('2026-11-01T00:00:00.000Z'),
  endDate: new Date('2026-11-30T23:59:59.999Z'),
  timezone: 'Asia/Ho_Chi_Minh',
  calculationVersion: 'payroll-ledger.v1',
  status: 'REVIEWING',
};
const policy = {
  subjectKey: 'subject:cc:one',
  capAmountHalfDong: 6_000,
  policyVersion: 'cc-cap.v1',
  policyReference: 'PAY-001',
  policyHash: 'policy-hash-v1',
};
const events = [
  {
    eventKey: 'event:2',
    subjectKey: 'subject:cc:one',
    component: 'Daily Bonus',
    amountHalfDong: 1,
    sourceReference: 'daily:2',
    sourceHash: 'daily-hash',
    sourceOccurredAt: new Date('2026-11-02T02:00:00.000Z'),
  },
  {
    eventKey: 'event:1',
    subjectKey: 'subject:cc:one',
    component: 'CC Xoay',
    amountHalfDong: 6_000,
    sourceReference: 'cc:1',
    sourceHash: 'cc-hash',
    sourceOccurredAt: new Date('2026-11-01T02:00:00.000Z'),
  },
];

test('the settlement builder freezes ordered immutable events and rounds once', () => {
  const draft = __test__.buildReviewRequest(
    period,
    { periodKey: period.periodKey, settlementVersion: 1, policies: [policy] },
    events
  );
  assert.equal(draft.subjects[0]?.result.receivedAmount, 3_000);
  assert.equal(draft.subjects[0]?.result.holdAmount, 1);
  assert.match(draft.subjects[0]?.inputJson || '', /event:1[\s\S]*event:2/);
  assert.equal(draft.sourceCutoffAt.toISOString(), '2026-11-02T02:00:00.000Z');
});

test('the settlement builder rejects a missing policy or a non-reviewing period', () => {
  assert.throws(
    () =>
      __test__.buildReviewRequest(period, { periodKey: period.periodKey, settlementVersion: 1, policies: [] }, events),
    /policy snapshot/
  );
  assert.throws(
    () =>
      __test__.buildReviewRequest(
        { ...period, status: 'OPEN' },
        { periodKey: period.periodKey, settlementVersion: 1, policies: [policy] },
        events
      ),
    /reviewing payroll period/
  );
});
