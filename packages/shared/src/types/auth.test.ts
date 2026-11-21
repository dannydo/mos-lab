import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCvRole,
  getDefaultRouteForRole,
  isTelesalesRole,
  canAccessIosConsultationApp,
  canDirectlySettleCounterPayment,
  canSwitchIosBranch,
  resolveAssignedSalonStoreId,
  resolveLockedIosRoleForUser,
} from './auth.js';
import {
  resolveMenuKeysForApiPath,
  isCvAllowedPath,
  isNonAdminAllowedDashboardPath,
  resolveLandingRoute,
} from './menu-access.js';

describe('Auth Role Invariants & Routing Tests', () => {
  it('should correctly identify CV roles', () => {
    // Valid CV roles
    assert.equal(isCvRole('cv'), true);
    assert.equal(isCvRole('lt'), true);
    assert.equal(isCvRole('technician'), true);
    assert.equal(isCvRole('ktv'), true);
    assert.equal(isCvRole('CV'), true);
    assert.equal(isCvRole('LT'), true);
    assert.equal(isCvRole('Technician'), true);
    assert.equal(isCvRole(' technician '), true);

    // Non-CV roles
    assert.equal(isCvRole('admin'), false);
    assert.equal(isCvRole('super_admin'), false);
    assert.equal(isCvRole('manager'), false);
    assert.equal(isCvRole('telesales'), false);
    assert.equal(isCvRole('booker'), false);
    assert.equal(isCvRole('cc'), false);
    assert.equal(isCvRole('cs'), false);
    assert.equal(isCvRole('qa_qc'), false);
    assert.equal(isCvRole(null), false);
    assert.equal(isCvRole(undefined), false);
    assert.equal(isCvRole(''), false);
  });

  it('should correctly identify Telesales & Booker roles', () => {
    assert.equal(isTelesalesRole('telesales'), true);
    assert.equal(isTelesalesRole('booker'), true);
    assert.equal(isTelesalesRole('TELESALES'), true);
    assert.equal(isTelesalesRole('BOOKER'), true);
    assert.equal(isTelesalesRole('cv'), false);
    assert.equal(isTelesalesRole('admin'), false);
  });

  it('should resolve menu keys accurately for /nyc and /saved-filters API paths', () => {
    const nycKeys = resolveMenuKeysForApiPath('/api/nyc/config');
    assert.ok(nycKeys.includes('nyc-main'));
    assert.ok(nycKeys.includes('nyc-campaigns-mgmt'));

    const savedFilterKeys = resolveMenuKeysForApiPath('/api/saved-filters');
    assert.ok(savedFilterKeys.includes('nyc-main'));
    assert.ok(savedFilterKeys.includes('customers-all'));
  });

  it('should land each role in its own workspace (Operations Center only for management)', () => {
    const expected: Record<string, string> = {
      cv: '/dashboard/cv',
      lt: '/dashboard/cv',
      technician: '/dashboard/cv',
      ktv: '/dashboard/cv',
      cvl: '/dashboard/cv',
      cvll: '/dashboard/cv',
      admin: '/dashboard',
      super_admin: '/dashboard',
      manager: '/dashboard',
      boss: '/dashboard',
      cho: '/dashboard',
      fm: '/dashboard',
      telesales: '/dashboard/telesale-target',
      booker: '/dashboard/telesale-target',
      cc: '/ios-app',
      consultant: '/ios-app',
      cs: '/dashboard/cskh',
      coca: '/dashboard/cskh',
      control: '/dashboard/cskh',
      oc: '/dashboard/today',
      ls: '/dashboard/today',
      qa: '/dashboard/qa-shop',
      qc: '/dashboard/qa-shop',
      qa_qc: '/dashboard/qa-shop',
      hr: '/dashboard/staff',
      accountant: '/dashboard/finance/cash-flow',
    };
    for (const [role, route] of Object.entries(expected)) {
      assert.equal(getDefaultRouteForRole(role), route, role);
    }
    assert.equal(getDefaultRouteForRole(' TELESALES '), '/dashboard/telesale-target');
    // Unknown / missing roles never fall into the Operations Center
    assert.equal(getDefaultRouteForRole('new_role'), '/dashboard/chat');
    assert.equal(getDefaultRouteForRole(null), '/dashboard/chat');
    assert.equal(getDefaultRouteForRole(undefined), '/dashboard/chat');
  });

  it('resolveLandingRoute respects Menu Access and falls back safely', () => {
    // Visibility not loaded / admin -> preferred route as-is
    assert.equal(resolveLandingRoute({ role: 'telesales' }), '/dashboard/telesale-target');
    assert.equal(resolveLandingRoute({ role: 'admin', menuVisibility: { dashboard: false } }), '/dashboard');
    // Preferred route visible
    assert.equal(
      resolveLandingRoute({ role: 'cs', menuVisibility: { 'cs-hub': true, today: true } }),
      '/dashboard/cskh'
    );
    // Preferred route hidden -> first allowed menu entry (menu order)
    assert.equal(
      resolveLandingRoute({ role: 'cs', menuVisibility: { 'cs-hub': false, today: true, kpi: true } }),
      '/dashboard/today'
    );
    // Unknown role -> first allowed menu entry
    assert.equal(resolveLandingRoute({ role: 'new_role', menuVisibility: { kpi: true } }), '/dashboard/kpi');
    // Nothing allowed -> universal chat
    assert.equal(resolveLandingRoute({ role: 'hr', menuVisibility: { today: false } }), '/dashboard/chat');
    assert.equal(resolveLandingRoute({ role: 'new_role' }), '/dashboard/chat');
    // CC always gets /ios-app regardless of menu visibility
    assert.equal(resolveLandingRoute({ role: 'cc', menuVisibility: { today: true } }), '/ios-app');
  });

  it('should strictly lock /ios-app access to only CVL, CVLL, CC, and Admin/SuperAdmin', () => {
    // Allowed roles
    assert.equal(canAccessIosConsultationApp('admin'), true);
    assert.equal(canAccessIosConsultationApp('super_admin'), true);
    assert.equal(canAccessIosConsultationApp('cvl'), true);
    assert.equal(canAccessIosConsultationApp('CV🪶'), true);
    assert.equal(canAccessIosConsultationApp('cvll'), true);
    assert.equal(canAccessIosConsultationApp('🪶CV🪶'), true);
    assert.equal(canAccessIosConsultationApp('cc'), true);
    assert.equal(canAccessIosConsultationApp('consultant'), true);

    // Strictly blocked roles (including standard CV, Manager, FM, CHO, BOSS, Telesales, CS)
    assert.equal(canAccessIosConsultationApp('cv'), false);
    assert.equal(canAccessIosConsultationApp('technician'), false);
    assert.equal(canAccessIosConsultationApp('lt'), false);
    assert.equal(canAccessIosConsultationApp('ktv'), false);
    assert.equal(canAccessIosConsultationApp('manager'), false);
    assert.equal(canAccessIosConsultationApp('fm'), false);
    assert.equal(canAccessIosConsultationApp('cho'), false);
    assert.equal(canAccessIosConsultationApp('boss'), false);
    assert.equal(canAccessIosConsultationApp('telesales'), false);
    assert.equal(canAccessIosConsultationApp('cs'), false);
    assert.equal(canAccessIosConsultationApp('qa_qc'), false);

    // Allowed via active CC team membership (e.g. Manager added to CC team)
    assert.equal(canAccessIosConsultationApp('manager', ['CC']), true);
    assert.equal(canAccessIosConsultationApp('manager', ['cc']), true);
    assert.equal(canAccessIosConsultationApp('manager', ['GROWTH']), false);
    assert.equal(resolveLockedIosRoleForUser('manager', 'CVL', ['CC']), 'CC');
    assert.equal(resolveLockedIosRoleForUser('manager', undefined, ['CC']), 'CC');

    // Lock role param to account role for non-admins
    assert.equal(resolveLockedIosRoleForUser('cvl', 'CVLL'), 'CVL');
    assert.equal(resolveLockedIosRoleForUser('cvl', 'CC'), 'CVL');
    assert.equal(resolveLockedIosRoleForUser('cvll', 'CC'), 'CVLL');
    assert.equal(resolveLockedIosRoleForUser('cc', 'CVL'), 'CC');
    assert.equal(resolveLockedIosRoleForUser('admin', 'CVLL'), 'CVLL');
    assert.equal(resolveLockedIosRoleForUser('super_admin', 'CC'), 'CC');

    // Counter settlement permission: CC / Admin / Cashier settle Cash/POS straight to Completed; CVL / CVLL stop at counter
    assert.equal(canDirectlySettleCounterPayment('CC'), true);
    assert.equal(canDirectlySettleCounterPayment('cc'), true);
    assert.equal(canDirectlySettleCounterPayment('consultant'), true);
    assert.equal(canDirectlySettleCounterPayment('ADMIN'), true);
    assert.equal(canDirectlySettleCounterPayment('super_admin'), true);
    assert.equal(canDirectlySettleCounterPayment('cashier'), true);
    assert.equal(canDirectlySettleCounterPayment('reception'), true);
    assert.equal(canDirectlySettleCounterPayment('CVL'), false);
    assert.equal(canDirectlySettleCounterPayment('CVLL'), false);
    assert.equal(canDirectlySettleCounterPayment('CV'), false);
    assert.equal(canDirectlySettleCounterPayment(null), false);
  });

  it('should enforce Zero-Trust Admin-Only default on unregistered APIs and paths', () => {
    assert.deepEqual(resolveMenuKeysForApiPath('/api/brand-new-unregistered-feature'), ['__ADMIN_ONLY_DEFAULT__']);
    assert.equal(isCvAllowedPath('/ios-app', undefined, 'cv'), false);
    assert.equal(isCvAllowedPath('/ios-app', undefined, 'cvl'), true);
    assert.equal(isCvAllowedPath('/ios-app', undefined, 'cvll'), true);
    assert.equal(
      isNonAdminAllowedDashboardPath('/dashboard/brand-new-unregistered-page', { dashboard: true }, 'cc'),
      false
    );
    assert.equal(isNonAdminAllowedDashboardPath('/dashboard/cc', { cc: true }, 'cc'), true);

    // Dynamic campaign detail operational workspaces vs admin campaign management:
    // Telesales with 'nyc-main' or 'my-customers' is allowed into individual campaign workspaces
    assert.equal(
      isNonAdminAllowedDashboardPath(
        '/dashboard/nyc/campaigns/hoi-sinh-mi',
        { 'nyc-main': true, 'nyc-campaigns-mgmt': false },
        'telesales'
      ),
      true
    );
    // Telesales without 'nyc-campaigns-mgmt' is strictly blocked from the campaign management config page
    assert.equal(
      isNonAdminAllowedDashboardPath(
        '/dashboard/nyc/campaigns',
        { 'nyc-main': true, 'nyc-campaigns-mgmt': false },
        'telesales'
      ),
      false
    );
    // Standard CV is blocked from all campaigns
    assert.equal(
      isNonAdminAllowedDashboardPath('/dashboard/nyc/campaigns/hoi-sinh-mi', { cv: true, 'career-path': true }, 'cv'),
      false
    );
  });

  it('locks non-admin iOS branch switching & normalizes Head Office storeId=4 to Đề Thám (6) (MOS-BUG-237)', () => {
    assert.equal(resolveAssignedSalonStoreId(6), 6);
    assert.equal(resolveAssignedSalonStoreId(16), 16);
    assert.equal(resolveAssignedSalonStoreId(4), 6);
    assert.equal(resolveAssignedSalonStoreId(0), 6);
    assert.equal(resolveAssignedSalonStoreId(null), 6);

    assert.equal(canSwitchIosBranch({ isAdmin: false, iosRole: 'CVL' }), false);
    assert.equal(canSwitchIosBranch({ isAdmin: false, iosRole: 'CVLL' }), false);
    assert.equal(canSwitchIosBranch({ isAdmin: false, iosRole: 'CC' }), false);
    assert.equal(canSwitchIosBranch({ isAdmin: true, iosRole: 'CVL' }), false);
    assert.equal(canSwitchIosBranch({ isAdmin: true, iosRole: 'CVLL' }), false);
    assert.equal(canSwitchIosBranch({ isAdmin: true, iosRole: 'CV' }), false);
    assert.equal(canSwitchIosBranch({ isAdmin: true, iosRole: 'CC' }), true);
    assert.equal(canSwitchIosBranch({ isAdmin: true, iosRole: 'STORE' }), true);
  });
});
