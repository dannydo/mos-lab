import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from './locked-settlement-export.service.js';

const valid = JSON.stringify({
  mode: 'SHADOW_READ_ONLY',
  sourcePeriodKey: '2026-08',
  calculationVersion: 'cc-cash-ledger.v1',
  subjectKey: 'subject:8c2a1f',
  lineCount: 1,
  grossAmount: 2_925,
  capAmount: null,
  receivedAmount: 2_925,
  holdAmount: 0,
});

test('exports only a subject result bound to its locked period and calculation version', () => {
  assert.equal(
    __test__.parseSubjectResult(valid, 'subject:8c2a1f', '2026-08', 'cc-cash-ledger.v1').receivedAmount,
    2_925
  );
  assert.throws(
    () => __test__.parseSubjectResult(valid, 'subject:8c2a1f', '2026-09', 'cc-cash-ledger.v1'),
    /does not match/
  );
  assert.throws(
    () => __test__.parseSubjectResult('{', 'subject:8c2a1f', '2026-08', 'cc-cash-ledger.v1'),
    /invalid evidence/
  );
});

test('source evidence hash changes whenever source evidence changes', () => {
  assert.notEqual(__test__.subjectSourceHash('{"a":1}', valid), __test__.subjectSourceHash('{"a":2}', valid));
});
