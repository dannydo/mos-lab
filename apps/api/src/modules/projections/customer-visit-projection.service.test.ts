import assert from 'node:assert/strict';
import test from 'node:test';
import { customerVisitSourceRevision, daysSinceVisit } from './customer-visit-projection.service.js';

test('daysSinceVisit uses the mOS business date rather than elapsed 24-hour periods', () => {
  assert.equal(daysSinceVisit('2026-09-10T16:30:00.000Z', new Date('2026-09-11T16:00:00.000Z')), 1);
  assert.equal(daysSinceVisit(null), null);
});

test('customer visit revision changes only when the canonical value changes', () => {
  assert.equal(
    customerVisitSourceRevision(42, '2026-09-10T16:30:00.000Z'),
    customerVisitSourceRevision(42, new Date('2026-09-10T16:30:00.000Z'))
  );
  assert.notEqual(
    customerVisitSourceRevision(42, '2026-09-10T16:30:00.000Z'),
    customerVisitSourceRevision(42, '2026-09-11T16:30:00.000Z')
  );
});
