import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from './payroll-settlement-closing.service.js';

const review = {
  periodKey: '2026-10',
  label: 'Tháng 10 đang kiểm tra',
  startDate: new Date('2026-10-01T00:00:00.000Z'),
  endDate: new Date('2026-10-31T00:00:00.000Z'),
  timezone: 'Asia/Ho_Chi_Minh',
  calculationVersion: 'cc-cash-ledger.v1',
  settlementVersion: 1,
  sourceCutoffAt: new Date('2026-11-01T05:00:00.000Z'),
  inputHash: 'settlement-input-v1',
  subjects: [
    {
      subjectKey: 'subject:october:01',
      inputJson: '{"source":"mOS-ledger"}',
      result: {
        mode: 'SHADOW_READ_ONLY' as const,
        sourcePeriodKey: '2026-10',
        calculationVersion: 'cc-cash-ledger.v1',
        subjectKey: 'subject:october:01',
        lineCount: 1,
        grossAmount: 2_925,
        capAmount: null,
        receivedAmount: 2_925,
        holdAmount: 0,
      },
    },
  ],
};

test('a reviewing settlement needs complete, period-bound immutable subject evidence', () => {
  assert.doesNotThrow(() => __test__.assertReviewRequest(review));
  assert.throws(
    () =>
      __test__.assertReviewRequest({ ...review, subjects: [{ ...review.subjects[0]!, subjectKey: 'subject:other' }] }),
    /does not match/
  );
  assert.throws(() => __test__.assertReviewRequest({ ...review, subjects: [] }), /at least one subject/);
});
