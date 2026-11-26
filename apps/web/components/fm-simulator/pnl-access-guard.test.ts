import { describe, expect, it } from 'vitest';
import { canAccessFmSimulator, isCvAllowedPath, isNonAdminAllowedDashboardPath } from '@mos-lab/shared';
import { getSidebarGroups } from '../../config/sidebar.config';

function collectMenuKeys(
  role: string,
  menuVisibility: Record<string, boolean> = {},
  teamCodes?: string[]
): Set<string> {
  const groups = getSidebarGroups(role, [], false, {}, [], false, menuVisibility, {}, { teamCodes }, 0, []);
  const keys = new Set<string>();
  const walk = (items: ReadonlyArray<{ key: string; children?: ReadonlyArray<{ key: string }> }>) => {
    for (const item of items) {
      keys.add(item.key);
      if (item.children) {
        walk(item.children);
      }
    }
  };
  for (const group of groups) {
    walk(group.items);
  }
  return keys;
}

describe('pnl-simulator Strict Admin-Only access guard', () => {
  it('shows pnl-simulator in sidebar only for admin and super_admin', () => {
    expect(collectMenuKeys('admin').has('pnl-simulator')).toBe(true);
    expect(collectMenuKeys('super_admin').has('pnl-simulator')).toBe(true);
  });

  it('hides pnl-simulator from every non-admin role even if menuVisibility forces true', () => {
    const forceVisible = { 'pnl-simulator': true };
    for (const role of ['manager', 'fm', 'cho', 'sale', 'booker', 'cc', 'cv', 'cvl', 'cvll']) {
      expect(collectMenuKeys(role, forceVisible).has('pnl-simulator')).toBe(false);
    }
  });
});

describe('fm-simulator access for CC, CVL, CVLL, FM, and Admin', () => {
  it('allows CC, CVL, CVLL, FM, CHO, Boss, Admin, and CC team members across guard, routes, and sidebar', () => {
    for (const role of ['cc', 'cvl', 'cvll', 'cv_plus', 'cv_plus_plus', 'fm', 'cho', 'boss', 'admin', 'super_admin']) {
      expect(canAccessFmSimulator(role)).toBe(true);
      expect(collectMenuKeys(role).has('fm-simulator')).toBe(true);
      expect(isNonAdminAllowedDashboardPath('/dashboard/fm-simulator', { career: true }, role)).toBe(true);
      expect(isNonAdminAllowedDashboardPath('/fm-simulator', { career: true }, role)).toBe(true);
    }
    expect(isCvAllowedPath('/dashboard/fm-simulator', {}, 'cvl')).toBe(true);
    expect(isCvAllowedPath('/fm-simulator', {}, 'cvll')).toBe(true);
    expect(canAccessFmSimulator('manager', ['CC'])).toBe(true);
    expect(collectMenuKeys('manager', {}, ['CC']).has('fm-simulator')).toBe(true);
  });

  it('blocks standard CV, KTV, technician, and telesales from FM Simulator', () => {
    for (const role of ['cv', 'ktv', 'technician', 'lt', 'telesales', 'booker']) {
      expect(canAccessFmSimulator(role)).toBe(false);
      expect(collectMenuKeys(role).has('fm-simulator')).toBe(false);
      expect(isNonAdminAllowedDashboardPath('/dashboard/fm-simulator', { cv: true }, role)).toBe(false);
    }
    expect(isCvAllowedPath('/dashboard/fm-simulator', {}, 'cv')).toBe(false);
  });
});
