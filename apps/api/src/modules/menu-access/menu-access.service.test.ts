import assert from 'node:assert/strict';
import test from 'node:test';
import { isCvAllowedPath, resolveMenuKeysForApiPath } from '@mos-lab/shared';
import { isMenuAccessSuperAdmin, MenuAccessService, resolveMenuVisibility } from './menu-access.service.js';

const noScopes = { departmentIds: new Set<number>(), teamIds: new Set<number>(), staffIds: new Set<number>() };

test('keeps every managed menu visible when it has no restrictive policy', () => {
  const visibility = resolveMenuVisibility([], [], noScopes, false);
  assert.equal(visibility.dashboard, true);
  assert.equal(visibility['academy-instructors'], true);
  assert.equal(visibility['academy-workshops'], true);
});

test('matches a restricted menu through department, team, or individual staff scope', () => {
  const policies = [
    { menuKey: 'kpi', isRestricted: true, rules: [{ subjectType: 'DEPARTMENT', subjectId: 4 }] },
    { menuKey: 'cc', isRestricted: true, rules: [{ subjectType: 'TEAM', subjectId: 8 }] },
    { menuKey: 'cv', isRestricted: true, rules: [{ subjectType: 'STAFF', subjectId: 12 }] },
    { menuKey: 'bk', isRestricted: true, rules: [] },
  ];
  const visibility = resolveMenuVisibility(
    policies,
    [],
    { departmentIds: new Set([4]), teamIds: new Set([8]), staffIds: new Set([12]) },
    false
  );

  assert.equal(visibility.kpi, true);
  assert.equal(visibility.cc, true);
  assert.equal(visibility.cv, true);
  assert.equal(visibility.bk, false);
});

test('keeps an Admin visible even when a menu is restricted to another audience', () => {
  const visibility = resolveMenuVisibility(
    [{ menuKey: 'academy-payment-management', isRestricted: true, rules: [] }],
    [],
    noScopes,
    true
  );
  assert.equal(visibility['academy-payment-management'], true);
});

test('applies a restricted category to every menu within that category', () => {
  const visibility = resolveMenuVisibility(
    [],
    [{ menuKey: 'category:academy', isRestricted: true, rules: [{ subjectType: 'DEPARTMENT', subjectId: 4 }] }],
    noScopes,
    false
  );

  assert.equal(visibility['academy-customers'], false);
  assert.equal(visibility['academy-instructors'], false);
  assert.equal(visibility['academy-workshops'], false);
  assert.equal(visibility['post-hub'], false);
  assert.equal(visibility['customers-all'], true);
});

test('governs Chiến Thần through Academy rather than the CRM category', () => {
  const crmVisibility = resolveMenuVisibility(
    [],
    [{ menuKey: 'category:crm', isRestricted: true, rules: [] }],
    noScopes,
    false
  );

  assert.equal(crmVisibility['post-hub'], true);
  assert.equal(crmVisibility['loca'], false);
});

test('category access must match before an individual menu policy can grant visibility', () => {
  const visibility = resolveMenuVisibility(
    [{ menuKey: 'academy-instructors', isRestricted: true, rules: [{ subjectType: 'STAFF', subjectId: 12 }] }],
    [{ menuKey: 'category:academy', isRestricted: true, rules: [{ subjectType: 'DEPARTMENT', subjectId: 4 }] }],
    { departmentIds: new Set<number>(), teamIds: new Set<number>(), staffIds: new Set([12]) },
    false
  );

  assert.equal(visibility['academy-instructors'], false);
});

test('shows a category to a matching organization, then keeps finer per-menu restrictions', () => {
  const visibility = resolveMenuVisibility(
    [{ menuKey: 'academy-payment-management', isRestricted: true, rules: [{ subjectType: 'STAFF', subjectId: 18 }] }],
    [{ menuKey: 'category:academy', isRestricted: true, rules: [{ subjectType: 'DEPARTMENT', subjectId: 4 }] }],
    { departmentIds: new Set([4]), teamIds: new Set<number>(), staffIds: new Set<number>() },
    false
  );

  assert.equal(visibility['academy-customers'], true);
  assert.equal(visibility['academy-payment-management'], false);
});

test('limits policy administration to the explicit Super Admin role', () => {
  assert.equal(isMenuAccessSuperAdmin({ id: 1, role: 'super_admin', username: 'danhdo@gmail.com' }), true);
  assert.equal(isMenuAccessSuperAdmin({ id: 2, role: 'admin', username: 'admin' }), false);
});

test('locks CV roles by default to only cv and career-path', () => {
  const cvVisibility = resolveMenuVisibility(
    [],
    [],
    { departmentIds: new Set(), teamIds: new Set(), staffIds: new Set([101]), roleGroupIds: new Set([1]), role: 'cv' },
    false
  );

  assert.equal(cvVisibility.cv, true);
  assert.equal(cvVisibility['career-path'], true);
  assert.equal(cvVisibility.dashboard, false);
  assert.equal(cvVisibility.today, false);
  assert.equal(cvVisibility['schedule-calendar'], false);
  assert.equal(cvVisibility.branches, false);
  assert.equal(cvVisibility['customers-all'], false);
});

test('allows explicitly granting an extra module to CV via ROLE group or STAFF override', () => {
  const cvVisibilityWithRoleGrant = resolveMenuVisibility(
    [{ menuKey: 'schedule-calendar', isRestricted: true, rules: [{ subjectType: 'ROLE', subjectId: 1 }] }],
    [],
    { departmentIds: new Set(), teamIds: new Set(), staffIds: new Set([101]), roleGroupIds: new Set([1]), role: 'cv' },
    false
  );

  assert.equal(cvVisibilityWithRoleGrant.cv, true);
  assert.equal(cvVisibilityWithRoleGrant['career-path'], true);
  assert.equal(cvVisibilityWithRoleGrant['schedule-calendar'], true);
  assert.equal(cvVisibilityWithRoleGrant.branches, false);
});

test('maps API endpoints and paths accurately for strict CV and group security enforcement', () => {
  assert.deepEqual(resolveMenuKeysForApiPath('/api/kpi/cv'), ['cv']);
  assert.deepEqual(resolveMenuKeysForApiPath('/api/cv/leaderboard'), ['cv']);
  assert.deepEqual(resolveMenuKeysForApiPath('/api/career/config'), ['career-path']);
  assert.deepEqual(resolveMenuKeysForApiPath('/api/bug-reports'), ['__BUG_REPORT_BLOCKED_FOR_CV__']);
  assert.deepEqual(resolveMenuKeysForApiPath('/api/today/summary'), ['today', 'dashboard']);
  assert.equal(resolveMenuKeysForApiPath('/api/schedule-calendar/shifts').includes('schedule-calendar'), true);

  assert.equal(isCvAllowedPath('/dashboard/cv'), true);
  assert.equal(isCvAllowedPath('/dashboard/career-path'), true);
  assert.equal(isCvAllowedPath('/dashboard/chat'), true);
  assert.equal(isCvAllowedPath('/dashboard'), false);
  assert.equal(isCvAllowedPath('/dashboard/bug-reports'), false);
  assert.equal(isCvAllowedPath('/dashboard/schedule-calendar'), false);
  assert.equal(isCvAllowedPath('/dashboard/branches'), false);
});

test('simulates Production policies: locks CV strictly while preserving BK_TELESALES and CC workflows', async () => {
  MenuAccessService.invalidateRuntimeCache();
  const prodPolicies = [
    { menuKey: 'category:crm', isRestricted: true, rules: [{ subjectType: 'DEPARTMENT', subjectId: 3 }] },
    { menuKey: 'category:academy', isRestricted: true, rules: [{ subjectType: 'DEPARTMENT', subjectId: 2 }] },
    { menuKey: 'category:operations', isRestricted: true, rules: [] },
    { menuKey: 'category:home', isRestricted: true, rules: [] },
    { menuKey: 'category:quality', isRestricted: true, rules: [] },
    { menuKey: 'category:system', isRestricted: true, rules: [] },
    { menuKey: 'dashboard', isRestricted: true, rules: [] },
    { menuKey: 'today', isRestricted: true, rules: [] },
    { menuKey: 'schedule-calendar', isRestricted: true, rules: [] },
    { menuKey: 'staff-directory', isRestricted: true, rules: [] },
    { menuKey: 'teams', isRestricted: true, rules: [] },
    { menuKey: 'catalog', isRestricted: true, rules: [] },
    {
      menuKey: 'my-customers',
      isRestricted: true,
      rules: [
        { subjectType: 'TEAM', subjectId: 4 },
        { subjectType: 'TEAM', subjectId: 6 },
      ],
    },
    { menuKey: 'nyc-main', isRestricted: true, rules: [{ subjectType: 'TEAM', subjectId: 4 }] },
    { menuKey: 'telesale-target', isRestricted: true, rules: [{ subjectType: 'TEAM', subjectId: 4 }] },
    {
      menuKey: 'bk',
      isRestricted: true,
      rules: [
        { subjectType: 'TEAM', subjectId: 3 },
        { subjectType: 'TEAM', subjectId: 4 },
      ],
    },
    { menuKey: 'cc', isRestricted: true, rules: [{ subjectType: 'TEAM', subjectId: 1 }] },
    { menuKey: 'cv', isRestricted: true, rules: [{ subjectType: 'TEAM', subjectId: 2 }] },
    {
      menuKey: 'career-path',
      isRestricted: true,
      rules: [
        { subjectType: 'TEAM', subjectId: 2 },
        { subjectType: 'TEAM', subjectId: 1 },
      ],
    },
    { menuKey: 'qa-shop', isRestricted: true, rules: [{ subjectType: 'TEAM', subjectId: 11 }] },
  ];

  const mockFastify = {
    prisma: {
      crm: {
        crmMenuAccessPolicy: {
          findMany: async () => prodPolicies,
        },
        crmStaff: {
          findUnique: async ({ where }: { where: { id: number } }) => {
            if (where.id === 20) return { legacyStaffId: 200, role: 'cv' };
            if (where.id === 40) return { legacyStaffId: 400, role: 'bk_telesales' };
            if (where.id === 10) return { legacyStaffId: 100, role: 'cc' };
            return null;
          },
        },
        crmTeamMember: {
          findMany: async ({ where }: { where: { crmStaffId?: number; OR?: Array<{ crmStaffId?: number }> } }) => {
            const id = where.crmStaffId ?? where.OR?.[0]?.crmStaffId;
            if (id === 40) return [{ teamId: 4 }]; // BK_TELESALES
            if (id === 10) return [{ teamId: 1 }]; // CC
            return []; // CV without team membership row still works by role!
          },
        },
        crmTeam: {
          findMany: async () => [
            { id: 1, parentTeamId: null, departmentId: 1 },
            { id: 2, parentTeamId: null, departmentId: 1 },
            { id: 3, parentTeamId: null, departmentId: 3 },
            { id: 4, parentTeamId: 3, departmentId: 3 },
            { id: 11, parentTeamId: 10, departmentId: 1 },
          ],
        },
      },
    },
  } as any;

  // 1. CV User (id: 20, role: 'cv')
  const cvActor = { id: 20, role: 'cv' };
  assert.equal((await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/kpi/cv-xoay', 'GET')).allowed, true);
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/kpi/cv-paystub', 'GET')).allowed,
    true
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/kpi/cv-speed/matrix', 'GET')).allowed,
    true
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/career/config', 'GET')).allowed,
    true
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/chat/channels', 'GET')).allowed,
    true
  );

  // CV blocked from mutations and all other modules
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/kpi/cv-config', 'POST')).allowed,
    false
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/kpi/cv-allowances', 'POST')).allowed,
    false
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/bug-reports', 'GET')).allowed,
    false
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/bug-reports', 'POST')).allowed,
    false
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/customers/booking-slots', 'GET')).allowed,
    false
  );
  assert.equal((await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/staff', 'GET')).allowed, false);
  assert.equal((await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/calls', 'GET')).allowed, false);
  assert.equal((await MenuAccessService.checkApiAccess(mockFastify, cvActor, '/api/qa-shop', 'GET')).allowed, false);

  // 2. BK_TELESALES User (id: 40, role: 'bk_telesales', Team 4, Dept 3)
  const bkActor = { id: 40, role: 'bk_telesales' };
  assert.equal((await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/customers', 'GET')).allowed, true);
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/customers/booking-slots', 'GET')).allowed,
    true
  );
  assert.equal((await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/calls', 'POST')).allowed, true);
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/omicall/config', 'GET')).allowed,
    true
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/telesale-target/overview', 'GET')).allowed,
    true
  );
  assert.equal((await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/staff', 'GET')).allowed, true);
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/catalog/services', 'GET')).allowed,
    true
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/nyc/config', 'GET')).allowed,
    true
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/saved-filters', 'GET')).allowed,
    true
  );
  // BK_TELESALES blocked from unauthorized modules & system mutations
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/qa-shop/sessions', 'GET')).allowed,
    false
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/kpi/cv-xoay', 'GET')).allowed,
    false
  );
  assert.equal((await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/staff', 'POST')).allowed, false);
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, bkActor, '/api/catalog/services', 'POST')).allowed,
    false
  );

  // 3. CC User (id: 10, role: 'cc', Team 1, Dept 1)
  const ccActor = { id: 10, role: 'cc' };
  assert.equal((await MenuAccessService.checkApiAccess(mockFastify, ccActor, '/api/kpi/cc-xoay', 'GET')).allowed, true);
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, ccActor, '/api/gamification/daily-sales-bonus', 'GET'))
      .allowed,
    true
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, ccActor, '/api/career/config', 'GET')).allowed,
    true
  );
  assert.equal(
    (await MenuAccessService.checkApiAccess(mockFastify, ccActor, '/api/kpi/cv-xoay', 'GET')).allowed,
    false
  );

  MenuAccessService.invalidateRuntimeCache();
});
