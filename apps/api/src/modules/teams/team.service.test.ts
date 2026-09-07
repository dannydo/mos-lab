import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { removeVietnameseTones, type TeamStaffOption } from '@mos-lab/shared';
import { normalizeStaffAvatarUrl, normalizeTeamCode, TeamConfigurationError, TeamService } from './team.service.js';

test('normalizes a newly created team code into its stable integration key', () => {
  assert.equal(normalizeTeamCode(' academy_admissions '), 'ACADEMY_ADMISSIONS');
  assert.equal(normalizeTeamCode('SHOP2'), 'SHOP2');
});

const approvedIdentity = { id: 70, legacyStaffId: 52598, isActive: true, role: 'telesales' };

function candidateFixture(
  options: {
    identity?: typeof approvedIdentity | null;
    targetDisabled?: boolean;
    targetProvider?: string;
    targetHasStaffProfile?: boolean;
    crmError?: boolean;
  } = {}
) {
  const rows = [
    { staffId: 47530, displayName: 'Thanh', provider: 'Staff', disabled: false, hasStaffProfile: true },
    { staffId: 32268, displayName: 'Ngọc Điệp', provider: 'Staff', disabled: false, hasStaffProfile: true },
    {
      staffId: 52598,
      displayName: 'Thanh Vũ',
      provider: options.targetProvider ?? 'Staff',
      disabled: options.targetDisabled ?? false,
      hasStaffProfile: options.targetHasStaffProfile ?? false,
    },
    { staffId: 10, displayName: 'Disabled employee', provider: 'Staff', disabled: true, hasStaffProfile: true },
    { staffId: 11, displayName: 'Non-Staff', provider: 'Customer', disabled: false, hasStaffProfile: true },
    // Production-shaped negative population: provider Staff alone does NOT establish employee eligibility.
    ...Array.from({ length: 50778 }, (_, i) => ({
      staffId: 100000 + i,
      displayName: `Thanh customer ${i}`,
      provider: 'Staff',
      disabled: false,
      hasStaffProfile: false,
    })),
  ];
  let crmReads = 0;
  const queries: string[] = [];
  const errors: unknown[] = [];
  const now = new Date('2026-09-07T00:00:00Z');
  const fastify = {
    prisma: {
      crm: {
        crmTeam: {
          findUnique: async ({ where }: { where: { code: string } }) => ({
            id: 4,
            code: where.code,
            name: where.code,
            members: [],
            isActive: true,
            createdAt: now,
            updatedAt: now,
          }),
        },
        crmStaff: {
          findUnique: async (input: unknown) => {
            crmReads++;
            assert.deepEqual(input, {
              where: { id: 70 },
              select: { id: true, legacyStaffId: true, isActive: true, role: true },
            });
            if (options.crmError) throw new Error('CRM lookup unavailable');
            return options.identity === undefined ? approvedIdentity : options.identity;
          },
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          queries.push(sql);
          const union = /\bUNION\b/.test(sql);
          const [normal, exception] = sql.split(/\bUNION\b/);
          assert.match(normal, /SELECT DISTINCT up\.user_id as staffId/);
          assert.match(normal, /JOIN `staff_profile` sp ON sp\.user_id = up\.user_id/);
          assert.match(normal, /WHERE up\.provider = 'Staff' AND up\.is_disabled = 0/);
          assert.doesNotMatch(normal, /LEFT JOIN `staff_profile`/);
          if (union) {
            assert.deepEqual(params, [52598]);
            assert.match(exception, /WHERE up\.provider = 'Staff' AND up\.is_disabled = 0 AND up\.user_id = \?/);
            assert.doesNotMatch(sql, /UNION ALL/);
            assert.match(sql, /ORDER BY displayName ASC/);
          } else {
            assert.deepEqual(params, []);
          }
          // Query-contract fixture; actual SQL is also checked read-only against Production before deploy.
          return rows
            .filter(
              (row) =>
                row.provider === 'Staff' &&
                !row.disabled &&
                (row.hasStaffProfile || (union && row.staffId === params[0]))
            )
            .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'))
            .map(({ staffId, displayName }) => ({ staffId, displayName, username: null, avatarUrl: null }));
        },
      },
    },
    log: {
      error: (error: unknown) => {
        errors.push(error);
      },
    },
  } as unknown as FastifyInstance;
  return { fastify, queries, errors, crmReads: () => crmReads };
}

test('BK_TELESALES adds only Thanh Vu to existing candidates, never the Staff-provider customer population', async () => {
  const fixture = candidateFixture();
  const detail = await TeamService.getTeamDetailByCode(fixture.fastify, 'BK_TELESALES');
  assert.ok(detail);
  assert.deepEqual(
    detail.allStaffOptions.map((s) => s.staffId),
    [32268, 47530, 52598]
  );
  assert.equal(detail.allStaffOptions.find((s) => s.staffId === 47530)?.displayName, 'Thanh');
  assert.equal(detail.allStaffOptions.find((s) => s.staffId === 52598)?.displayName, 'Thanh Vũ');
  assert.deepEqual(detail.members, []);
  assert.ok(detail.allStaffOptions.every((s) => !s.isActive));
  for (const input of ['Thanh Vũ', 'thanh vu', '52598']) {
    const query = removeVietnameseTones(input);
    const matches: TeamStaffOption[] = detail.allStaffOptions.filter(
      (s) =>
        removeVietnameseTones(s.displayName).includes(query) ||
        (s.username && removeVietnameseTones(s.username).includes(query)) ||
        String(s.staffId).includes(query)
    );
    assert.deepEqual(
      matches.map((s) => s.staffId),
      [52598],
      input
    );
  }
  assert.equal(fixture.crmReads(), 1);
  assert.deepEqual(fixture.errors, []);
});

test('an already INNER-JOIN eligible Thanh Vu is not duplicated', async () => {
  const fixture = candidateFixture({ targetHasStaffProfile: true });
  const detail = await TeamService.getTeamDetailByCode(fixture.fastify, 'BK_TELESALES');
  assert.equal(detail?.allStaffOptions.filter((s) => s.staffId === 52598).length, 1);
});

for (const [label, identity] of [
  ['missing', null],
  ['inactive', { ...approvedIdentity, isActive: false }],
  ['wrong CRM ID', { ...approvedIdentity, id: 71 }],
  ['wrong legacy link', { ...approvedIdentity, legacyStaffId: 47530 }],
  ['invalid legacy link', { ...approvedIdentity, legacyStaffId: 0 }],
  ['wrong role', { ...approvedIdentity, role: 'office-cleaner' }],
] as const) {
  test(`${label} CRM identity cannot bypass the normal employee gate`, async () => {
    const fixture = candidateFixture({ identity });
    const detail = await TeamService.getTeamDetailByCode(fixture.fastify, 'BK_TELESALES');
    assert.deepEqual(
      detail?.allStaffOptions.map((s) => s.staffId),
      [32268, 47530]
    );
    assert.doesNotMatch(fixture.queries.join(''), /UNION/);
  });
}

for (const options of [{ targetDisabled: true }, { targetProvider: 'Customer' }]) {
  test(`legacy eligibility remains required: ${JSON.stringify(options)}`, async () => {
    const fixture = candidateFixture(options);
    const detail = await TeamService.getTeamDetailByCode(fixture.fastify, 'BK_TELESALES');
    assert.deepEqual(
      detail?.allStaffOptions.map((s) => s.staffId),
      [32268, 47530]
    );
  });
}

test('CRM exception lookup failure preserves the normal candidates', async () => {
  const fixture = candidateFixture({ crmError: true });
  const detail = await TeamService.getTeamDetailByCode(fixture.fastify, 'BK_TELESALES');
  assert.deepEqual(
    detail?.allStaffOptions.map((s) => s.staffId),
    [32268, 47530]
  );
  assert.equal(fixture.errors.length, 1);
  assert.doesNotMatch(fixture.queries.join(''), /UNION/);
});

for (const code of ['BK', 'BK_CS', 'BK_CONTROL', 'CUSTOM_SUBTEAM', 'CC', 'CV']) {
  test(`${code} cannot use the personal BK_TELESALES exception`, async () => {
    const fixture = candidateFixture();
    const detail = await TeamService.getTeamDetailByCode(fixture.fastify, code);
    assert.ok(detail?.allStaffOptions.every((s) => s.staffId !== 52598));
    assert.equal(fixture.crmReads(), 0);
    assert.doesNotMatch(fixture.queries.join(''), /UNION/);
    assert.deepEqual(fixture.errors, []);
  });
}

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
