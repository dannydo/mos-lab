import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTeamCode, TeamConfigurationError } from './team.service.js';

test('normalizes a newly created team code into its stable integration key', () => {
  assert.equal(normalizeTeamCode(' academy_admissions '), 'ACADEMY_ADMISSIONS');
  assert.equal(normalizeTeamCode('SHOP2'), 'SHOP2');
});

test('rejects unsafe team codes before they can become configuration keys', () => {
  assert.throws(() => normalizeTeamCode('2ACADEMY'), TeamConfigurationError);
  assert.throws(() => normalizeTeamCode('ACADEMY-ADMISSIONS'), TeamConfigurationError);
  assert.throws(() => normalizeTeamCode('A'), TeamConfigurationError);
});
