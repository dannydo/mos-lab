import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeStaffAvatarUrl, normalizeTeamCode, TeamConfigurationError } from './team.service.js';

test('normalizes a newly created team code into its stable integration key', () => {
  assert.equal(normalizeTeamCode(' academy_admissions '), 'ACADEMY_ADMISSIONS');
  assert.equal(normalizeTeamCode('SHOP2'), 'SHOP2');
});

test('rejects unsafe team codes before they can become configuration keys', () => {
  assert.throws(() => normalizeTeamCode('2ACADEMY'), TeamConfigurationError);
  assert.throws(() => normalizeTeamCode('ACADEMY-ADMISSIONS'), TeamConfigurationError);
  assert.throws(() => normalizeTeamCode('A'), TeamConfigurationError);
});

test('keeps valid absolute staff avatars and rejects malformed legacy values', () => {
  const avatarUrl = 'https://cdn.wingslashes.com/uploads/user/avatar/407/thumbnail/39407.png';

  assert.equal(normalizeStaffAvatarUrl(avatarUrl), avatarUrl);
  assert.equal(normalizeStaffAvatarUrl(`  ${avatarUrl}  `), avatarUrl);
  assert.equal(normalizeStaffAvatarUrl('javascript:alert(1)'), null);
  assert.equal(normalizeStaffAvatarUrl('39407.png'), null);
  assert.equal(normalizeStaffAvatarUrl(null), null);
});
