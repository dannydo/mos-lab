import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { removeVietnameseTones } from '@mos-lab/shared';
import { normalizeStaffAvatarUrl, normalizeTeamCode, TeamConfigurationError, TeamService } from './team.service.js';

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

for (const code of ['BK', 'BK_TELESALES', 'BK_CS', 'CUSTOM_SUBTEAM']) {
  test(`${code} candidates include active Staff identities without optional staff_profile details`, async () => {
    const identities = [
      {
        staffId: 52598,
        displayName: 'Thanh Vũ',
        username: null,
        provider: 'Staff',
        isDisabled: 0,
        hasStaffProfile: false,
      },
      {
        staffId: 47530,
        displayName: 'Thanh',
        username: 'existing-staff',
        provider: 'Staff',
        isDisabled: 0,
        hasStaffProfile: true,
      },
      {
        staffId: 3,
        displayName: 'Disabled Staff',
        username: null,
        provider: 'Staff',
        isDisabled: 1,
        hasStaffProfile: true,
      },
      {
        staffId: 4,
        displayName: 'Customer',
        username: null,
        provider: 'Customer',
        isDisabled: 0,
        hasStaffProfile: false,
      },
    ];
    const now = new Date('2026-09-07T00:00:00Z');
    let queryCount = 0;
    const fastify = {
      prisma: {
        crm: {
          crmTeam: {
            findUnique: async () => ({
              id: 4,
              code,
              name: code,
              members: [],
              isActive: true,
              createdAt: now,
              updatedAt: now,
            }),
          },
        },
        legacy: {
          // Query-contract fixture: enforce the production eligibility SQL before returning candidate rows.
          $queryRawUnsafe: async (sql: string) => {
            queryCount++;
            assert.match(sql, /SELECT DISTINCT up\.user_id as staffId/);
            assert.match(sql, /FROM `user_profile` up/);
            assert.match(sql, /WHERE up\.provider = 'Staff' AND up\.is_disabled = 0/);
            assert.match(sql, /ORDER BY up\.full_name ASC/);
            assert.doesNotMatch(sql, /\bJOIN\b|staff_profile/i);
            return identities
              .filter((staff) => staff.provider === 'Staff' && staff.isDisabled === 0)
              .map(({ staffId, displayName, username }) => ({ staffId, displayName, username, avatarUrl: null }));
          },
        },
      },
      log: {
        error: (error: unknown) => {
          throw error;
        },
      },
    } as unknown as FastifyInstance;

    const detail = await TeamService.getTeamDetailByCode(fastify, code);
    assert.ok(detail);
    assert.equal(queryCount, 1);
    assert.deepEqual(
      detail.allStaffOptions.map((staff) => staff.staffId),
      [52598, 47530]
    );
    assert.deepEqual(detail.members, []);
    assert.ok(detail.allStaffOptions.every((staff) => staff.isActive === false));

    // Same name/username/legacy-ID search contract as the team picker; missing candidates cannot match.
    for (const input of ['Thanh Vũ', 'thanh vu', 'thanh', '52598']) {
      const query = removeVietnameseTones(input);
      const matches = detail.allStaffOptions.filter(
        (staff) =>
          removeVietnameseTones(staff.displayName).includes(query) ||
          (staff.username && removeVietnameseTones(staff.username).includes(query)) ||
          String(staff.staffId).includes(query)
      );
      assert.ok(
        matches.some((staff) => staff.staffId === 52598),
        input
      );
    }
  });
}
