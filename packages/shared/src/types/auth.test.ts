import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCvRole,
  getDefaultRouteForRole,
  isTelesalesRole,
  canAccessIosConsultationApp,
  resolveLockedIosRoleForUser,
} from './auth.js';
import { resolveMenuKeysForApiPath, isCvAllowedPath, isNonAdminAllowedDashboardPath } from './menu-access.js';

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

  it('should return /dashboard/cv for CV roles and /dashboard for others', () => {
    // CV roles -> /dashboard/cv
    assert.equal(getDefaultRouteForRole('cv'), '/dashboard/cv');
    assert.equal(getDefaultRouteForRole('lt'), '/dashboard/cv');
    assert.equal(getDefaultRouteForRole('technician'), '/dashboard/cv');
    assert.equal(getDefaultRouteForRole('ktv'), '/dashboard/cv');

    // Other roles -> /dashboard
    assert.equal(getDefaultRouteForRole('admin'), '/dashboard');
    assert.equal(getDefaultRouteForRole('super_admin'), '/dashboard');
    assert.equal(getDefaultRouteForRole('manager'), '/dashboard');
    assert.equal(getDefaultRouteForRole('telesales'), '/dashboard');
    assert.equal(getDefaultRouteForRole('cc'), '/dashboard');
    assert.equal(getDefaultRouteForRole('cs'), '/dashboard');
    assert.equal(getDefaultRouteForRole(null), '/dashboard');
    assert.equal(getDefaultRouteForRole(undefined), '/dashboard');
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

    // Lock role param to account role for non-admins
    assert.equal(resolveLockedIosRoleForUser('cvl', 'CVLL'), 'CVL');
    assert.equal(resolveLockedIosRoleForUser('cvl', 'CC'), 'CVL');
    assert.equal(resolveLockedIosRoleForUser('cvll', 'CC'), 'CVLL');
    assert.equal(resolveLockedIosRoleForUser('cc', 'CVL'), 'CC');
    assert.equal(resolveLockedIosRoleForUser('admin', 'CVLL'), 'CVLL');
    assert.equal(resolveLockedIosRoleForUser('super_admin', 'CC'), 'CC');
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
});
