import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__, CC_NATIVE_PAYROLL_POLICY_VERSION } from './cc-native-payroll-policy.service.js';
import { __test__ as settlementBuilderTest } from './payroll-settlement-builder.service.js';

const at = new Date('2026-09-10T09:00:00.000Z');
const base = {
  payrollPeriodId: 1,
  periodKey: '2026-09',
  subjectKey: 'staff:cc:bao-han',
};

test('native CC policy captures only mOS evidence and records the 150 percent Xoay hold separately', () => {
  const prepared = __test__.prepareCcNativePayrollCapture({
    ...base,
    events: [
      {
        eventKey: 'mos:daily:1',
        component: 'CC_DAILY_BONUS',
        amountHalfDong: 200,
        sourceReference: 'mos:daily-close:2026-09-10:bao-han',
        sourceHash: 'daily-hash',
        sourceOccurredAt: at,
      },
      {
        eventKey: 'mos:xoay:1',
        component: 'CC_XOAY_CASH',
        amountHalfDong: 400,
        sourceReference: 'mos:visit:9001',
        sourceHash: 'xoay-hash',
        sourceOccurredAt: at,
      },
      {
        eventKey: 'mos:tip:1',
        component: 'CC_TIP_CASH',
        amountHalfDong: 40,
        sourceReference: 'mos:tip:9001',
        sourceHash: 'tip-hash',
        sourceOccurredAt: at,
      },
    ],
  });

  assert.equal(prepared.policy.policyVersion, CC_NATIVE_PAYROLL_POLICY_VERSION);
  assert.equal(prepared.capHalfDong, 300);
  assert.equal(prepared.heldXoayHalfDong, 100);
  assert.deepEqual(
    prepared.ledgerEvents.map((event) => [event.component, event.amountHalfDong]),
    [
      ['CC_DAILY_BONUS', 200],
      ['CC_TIP_CASH', 40],
      ['CC_XOAY_CASH', 400],
      ['CC_XOAY_CAP_HOLD', -100],
      ['CC_POLICY_FINALIZED', 0],
    ]
  );

  const review = settlementBuilderTest.buildReviewRequest(
    {
      periodKey: base.periodKey,
      label: 'September native CC',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T23:59:59.999Z'),
      timezone: 'Asia/Ho_Chi_Minh',
      calculationVersion: CC_NATIVE_PAYROLL_POLICY_VERSION,
      status: 'REVIEWING',
    },
    { periodKey: base.periodKey, settlementVersion: 1, policies: [prepared.policy] },
    prepared.ledgerEvents.map((event) => ({
      eventKey: event.eventKey,
      subjectKey: event.subjectKey,
      component: event.component,
      amountHalfDong: event.amountHalfDong,
      sourceReference: event.sourceReference,
      sourceHash: event.sourceHash,
      sourceOccurredAt: event.sourceOccurredAt,
    }))
  );
  // Daily 100đ + capped Xoay 150đ + cash tip 20đ. The 50đ excess is a
  // separate immutable hold line, not an after-the-fact rewrite.
  assert.equal(review.subjects[0]?.result.receivedAmount, 270);
  assert.equal(review.subjects[0]?.result.holdAmount, 0);
});

test('native CC policy fails closed instead of importing Legacy evidence or inferring a missing cash amount', () => {
  assert.throws(
    () =>
      __test__.prepareCcNativePayrollCapture({
        ...base,
        events: [
          {
            eventKey: 'legacy:cash:1',
            component: 'CC_XOAY_CASH',
            amountHalfDong: 130,
            sourceReference: 'legacy:staff_bonus:1',
            sourceHash: 'legacy-hash',
            sourceOccurredAt: at,
          },
        ],
      }),
    /never a Legacy or iOS reference/
  );
  assert.throws(
    () =>
      __test__.prepareCcNativePayrollCapture({
        ...base,
        events: [
          {
            eventKey: 'mos:daily:half',
            component: 'CC_DAILY_BONUS',
            amountHalfDong: 1,
            sourceReference: 'mos:daily-close:half',
            sourceHash: 'daily-hash',
            sourceOccurredAt: at,
          },
        ],
      }),
    /whole VND/
  );
  assert.throws(
    () =>
      __test__.prepareCcNativePayrollCapture({
        ...base,
        events: [
          {
            eventKey: 'mos:xoay:without-daily-close',
            component: 'CC_XOAY_CASH',
            amountHalfDong: 130,
            sourceReference: 'mos:completed-service:without-daily-close',
            sourceHash: 'xoay-hash',
            sourceOccurredAt: at,
          },
        ],
      }),
    /daily-sales-close evidence/
  );
});

test('native CC Cash matches the operational level formula without rounding a two-CC shift', () => {
  assert.equal(__test__.calculateCcXoayCashHalfDong({ previousPoints: 0, shareCount: 1 }), 130);
  assert.equal(__test__.calculateCcXoayCashHalfDong({ previousPoints: 0, shareCount: 2 }), 65);
  assert.equal(__test__.calculateCcXoayCashHalfDong({ previousPoints: 199, shareCount: 2 }), 130);
  assert.throws(
    () => __test__.calculateCcXoayCashHalfDong({ previousPoints: -1, shareCount: 1 }),
    /non-negative prior point/
  );
});
