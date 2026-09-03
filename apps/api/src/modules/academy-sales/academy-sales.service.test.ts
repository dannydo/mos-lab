import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AcademySalesService,
  buildAcademyLeadSearchText,
  canAccessAcademySales,
  canManageAcademyRestricted,
  canManageAcademySales,
  getAcademyWorkspaceAccess,
  getAcademyIctDayBounds,
  normalizeAcademyPhone,
  normalizeAcademyAvatarUrl,
  normalizeLegacyAcademyStatus,
  parseAcademyIctDate,
  getAcademyIctMonthBounds,
  resolveAcademyStatusForSchedule,
  sanitizeAcademyCourseRichText,
} from './academy-sales.service.js';

test('grants Academy operations to every active Academy member while reserving sensitive settings for admins', async () => {
  const adminAccess = await getAcademyWorkspaceAccess({} as never, { id: 1, role: 'admin' });
  assert.deepEqual(adminAccess, { canAccess: true, canManage: true, canManageRestricted: true, scope: 'ADMIN' });
  const superAdminAccess = await getAcademyWorkspaceAccess({} as never, { id: 2, role: 'super_admin' });
  assert.deepEqual(superAdminAccess, { canAccess: true, canManage: true, canManageRestricted: true, scope: 'ADMIN' });

  const teamMemberFastify = {
    prisma: {
      crm: {
        crmTeamMember: {
          findFirst: async (args: { where: { team?: { department?: { code?: string } } } }) =>
            args.where.team?.department?.code === 'ACADEMY' ? { id: 1 } : null,
        },
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: null }),
        },
      },
    },
    log: { error: () => undefined },
  };
  const teamMemberAccess = await getAcademyWorkspaceAccess(teamMemberFastify as never, { id: 12, role: 'telesales' });
  assert.deepEqual(teamMemberAccess, {
    canAccess: true,
    canManage: true,
    canManageRestricted: false,
    scope: 'ACADEMY_TEAM',
  });

  const marketingSalesMemberFastify = {
    prisma: {
      crm: {
        crmTeamMember: {
          findFirst: async (args: { where: { team?: { code?: string; department?: { code?: string } } } }) =>
            args.where.team?.department?.code === 'ACADEMY' || args.where.team?.code === 'MARKETING_SALES'
              ? { id: 2 }
              : null,
        },
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: 1002 }),
        },
      },
    },
    log: { error: () => undefined },
  };
  const marketingSalesAccess = await getAcademyWorkspaceAccess(marketingSalesMemberFastify as never, {
    id: 14,
    role: 'telesales',
  });
  assert.deepEqual(marketingSalesAccess, {
    canAccess: true,
    canManage: true,
    canManageRestricted: false,
    scope: 'ACADEMY_TEAM',
  });

  const nonMemberFastify = {
    prisma: {
      crm: {
        crmTeamMember: {
          findFirst: async () => null,
        },
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: null }),
        },
      },
    },
    log: { error: () => undefined },
  };
  const nonMemberAccess = await getAcademyWorkspaceAccess(nonMemberFastify as never, { id: 13, role: 'manager' });
  assert.deepEqual(nonMemberAccess, { canAccess: false, canManage: false, canManageRestricted: false, scope: null });
  assert.equal(canAccessAcademySales({ id: 12, role: 'telesales', academyAccess: true }), true);
  assert.equal(canManageAcademySales({ id: 14, role: 'telesales', academyCrudAccess: true }), true);
  assert.equal(canManageAcademyRestricted({ id: 1, role: 'admin' }), true);
  assert.equal(canManageAcademyRestricted({ id: 1, role: 'manager' }), false);
  assert.equal(canAccessAcademySales({ id: 12, role: 'cc' }), false);
});

test('keeps non-manager Academy members inside their own lead scope', async () => {
  assert.deepEqual(
    await AcademySalesService.getLeadAccessWhere({} as never, { id: 14, role: 'telesales', academyAccess: true }),
    { ownerStaffId: { in: [14] } }
  );
  assert.deepEqual(
    await AcademySalesService.getLeadAccessWhere({} as never, { id: 1, role: 'manager', academyAccess: true }),
    {}
  );
});

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

test('keeps direct Academy avatar images and rejects imported social profile pages', () => {
  assert.equal(
    normalizeAcademyAvatarUrl('https://scontent.fsgn5-5.fna.fbcdn.net/avatar.jpg'),
    'https://scontent.fsgn5-5.fna.fbcdn.net/avatar.jpg'
  );
  assert.equal(normalizeAcademyAvatarUrl('https://www.facebook.com/daotranvuvyy'), null);
  assert.equal(normalizeAcademyAvatarUrl('javascript:alert(1)'), null);
  assert.equal(normalizeAcademyAvatarUrl(null), null);
});

test('treats date-only Academy values and task boundaries as Asia/Ho_Chi_Minh', () => {
  assert.equal(parseAcademyIctDate('2026-08-19')?.toISOString(), '2026-08-18T17:00:00.000Z');
  const bounds = getAcademyIctDayBounds(new Date('2026-08-19T10:30:00.000Z'));
  assert.equal(bounds.start.toISOString(), '2026-08-18T17:00:00.000Z');
  assert.equal(bounds.end.toISOString(), '2026-08-19T16:59:59.999Z');
});

test('uses ICT month boundaries for the test calendar', () => {
  const bounds = getAcademyIctMonthBounds('2026-08');
  assert.equal(bounds.start.toISOString(), '2026-07-31T17:00:00.000Z');
  assert.equal(bounds.end.toISOString(), '2026-08-31T16:59:59.999Z');
});

test('moves a new or warm customer to scheduled when a test appointment is set', () => {
  assert.equal(resolveAcademyStatusForSchedule('NEW', undefined, '2026-08-20T09:00:00+07:00'), 'SCHEDULED');
  assert.equal(resolveAcademyStatusForSchedule('WARM', undefined, '2026-08-20T09:00:00+07:00'), 'SCHEDULED');
  assert.equal(resolveAcademyStatusForSchedule('TESTED', undefined, '2026-08-20T09:00:00+07:00'), undefined);
  assert.equal(resolveAcademyStatusForSchedule('WARM', 'LOST', '2026-08-20T09:00:00+07:00'), 'LOST');
});

test('keeps only the safe rich-text subset for Academy course material', () => {
  assert.equal(
    sanitizeAcademyCourseRichText(
      '<h3 class="title">Buổi 1</h3><p onclick="bad()">Nội dung <strong>quan trọng</strong></p><script>alert(1)</script>'
    ),
    '<h3>Buổi 1</h3><p>Nội dung <strong>quan trọng</strong></p>'
  );
  assert.equal(sanitizeAcademyCourseRichText('   '), null);
});
