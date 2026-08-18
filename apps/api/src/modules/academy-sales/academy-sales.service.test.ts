import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAcademyLeadSearchText,
  getAcademyIctDayBounds,
  normalizeAcademyPhone,
  normalizeLegacyAcademyStatus,
  parseAcademyIctDate,
} from './academy-sales.service.js';

test('normalizes legacy Academy statuses into the one supported pipeline', () => {
  assert.equal(normalizeLegacyAcademyStatus('contacted'), 'WARM');
  assert.equal(normalizeLegacyAcademyStatus('scheduled'), 'SCHEDULED');
  assert.equal(normalizeLegacyAcademyStatus('visited'), 'TESTED');
  assert.equal(normalizeLegacyAcademyStatus('deposited'), 'WON');
  assert.equal(normalizeLegacyAcademyStatus('spam'), 'LOST');
  assert.equal(normalizeLegacyAcademyStatus('unknown'), 'NEW');
});

test('normalizes phone and Vietnamese search text for deterministic dedupe and search', () => {
  assert.equal(normalizeAcademyPhone('+84 912 345 678'), '0912345678');
  assert.equal(normalizeAcademyPhone(''), null);
  assert.equal(
    buildAcademyLeadSearchText({ name: 'Đặng Thảo My', course: 'Nối mi nâng cao', source: 'TikTok' }),
    'dang thao my tiktok noi mi nang cao'
  );
});

test('treats date-only Academy values and task boundaries as Asia/Ho_Chi_Minh', () => {
  assert.equal(parseAcademyIctDate('2026-08-19')?.toISOString(), '2026-08-18T17:00:00.000Z');
  const bounds = getAcademyIctDayBounds(new Date('2026-08-19T10:30:00.000Z'));
  assert.equal(bounds.start.toISOString(), '2026-08-18T17:00:00.000Z');
  assert.equal(bounds.end.toISOString(), '2026-08-19T16:59:59.999Z');
});
