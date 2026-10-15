import assert from 'node:assert/strict';
import test from 'node:test';
import { customerVisitSourceRevision, daysSinceVisit } from './customer-visit-projection.service.js';

test('daysSinceVisit uses the mOS business date rather than elapsed 24-hour periods', () => {
  assert.equal(daysSinceVisit('2026-09-10T16:30:00.000Z', new Date('2026-09-11T16:00:00.000Z')), 1);
  assert.equal(daysSinceVisit(null), null);
});

test('daysSinceVisit preserves MySQL wall-clock calendar date for evening visits (>= 17:00 ICT) without double +7h shift', () => {
  // 2026-10-14 12:00:00Z is 2026-10-14 19:00:00 ICT (CURDATE() = 2026-10-14)
  const nowOnOct14Ict = new Date('2026-10-14T12:00:00.000Z');

  // Chạm 21: completed visit at 2026-09-23 18:05:23 ICT (serialized by Prisma as 2026-09-23T18:05:23.000Z)
  assert.equal(daysSinceVisit(new Date('2026-09-23T18:05:23.000Z'), nowOnOct14Ict), 21);
  assert.equal(daysSinceVisit('2026-09-23T17:35:09.000Z', nowOnOct14Ict), 21);
  assert.equal(daysSinceVisit('2026-09-23 18:56:04', nowOnOct14Ict), 21);

  // Chạm 19: completed visit at 2026-09-25 18:34:31 ICT
  assert.equal(daysSinceVisit(new Date('2026-09-25T18:34:31.000Z'), nowOnOct14Ict), 19);

  // Chạm 14: completed visit at 2026-09-30 20:07:52 ICT
  assert.equal(daysSinceVisit(new Date('2026-09-30T20:07:52.000Z'), nowOnOct14Ict), 14);

  // Chăm sóc 24h: completed visit today at 2026-10-14 18:30:00 ICT must be 0 days, never -1
  assert.equal(daysSinceVisit(new Date('2026-10-14T18:30:00.000Z'), nowOnOct14Ict), 0);
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
