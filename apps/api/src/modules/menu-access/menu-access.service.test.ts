import assert from 'node:assert/strict';
import test from 'node:test';
import { isMenuAccessSuperAdmin, resolveMenuVisibility } from './menu-access.service.js';

const noScopes = { departmentIds: new Set<number>(), teamIds: new Set<number>(), staffIds: new Set<number>() };

test('keeps every managed menu visible when it has no restrictive policy', () => {
  const visibility = resolveMenuVisibility([], [], noScopes, false);
  assert.equal(visibility.dashboard, true);
  assert.equal(visibility['academy-instructors'], true);
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
