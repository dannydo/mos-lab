import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from './cc-native-pilot-period.service.js';

test('native CC pilot period always opens the current Vietnam calendar month', () => {
  const period = __test__.currentMonth(new Date('2026-09-10T02:00:00.000Z'));
  assert.equal(period.periodKey, '2026-09');
  assert.equal(period.label, 'Pilot CC · Tháng 09/2026');
  assert.equal(period.startDate.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(period.endDate.toISOString(), '2026-09-30T00:00:00.000Z');
});
