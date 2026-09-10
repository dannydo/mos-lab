import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from './payroll-ledger-event.service.js';

const valid = {
  eventKey: 'source:fal:001',
  payrollPeriodId: 1,
  subjectKey: 'subject:cc:001',
  sourceType: 'FAL' as const,
  component: 'Cash Bonus',
  amountHalfDong: -130,
  sourceReference: 'fal:adjust:001',
  sourceHash: 'source-v1',
  sourceOccurredAt: new Date(),
};

test('an immutable payroll event requires exact half-VND and source evidence', () => {
  assert.doesNotThrow(() => __test__.assertTraceable(valid));
  assert.throws(() => __test__.assertTraceable({ ...valid, amountHalfDong: 0.5 }), /exact period and half-VND/);
  assert.throws(() => __test__.assertTraceable({ ...valid, sourceReference: '' }), /source evidence/);
});
