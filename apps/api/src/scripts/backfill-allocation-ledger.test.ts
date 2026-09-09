import assert from 'node:assert/strict';
import test from 'node:test';
import {
  legacyEventMetadata,
  legacyEventType,
  normalizeBatchSize,
  type LegacyAssignmentHistory,
} from './backfill-allocation-ledger.js';

test('maps historic ownership actions without changing their source metadata', () => {
  assert.equal(legacyEventType('ACCEPT_ALLOCATION'), 'ACCEPTED');
  assert.equal(legacyEventType('REVOKE'), 'RETURNED_TO_POOL');
  assert.equal(legacyEventType('RESTORE'), 'SYSTEM_REPAIR');
});

test('preserves the immutable legacy action and undone state in backfill metadata', () => {
  const history = { actionType: 'RESTORE', isUndone: 1 } as LegacyAssignmentHistory;
  assert.deepEqual(JSON.parse(legacyEventMetadata(history)), { legacyActionType: 'RESTORE', legacyIsUndone: true });
});

test('limits each resumable backfill invocation to a safe batch range', () => {
  assert.equal(normalizeBatchSize('500'), 500);
  assert.throws(() => normalizeBatchSize('0'));
  assert.throws(() => normalizeBatchSize('1001'));
});
