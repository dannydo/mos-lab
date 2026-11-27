import {
  canAccessFmSimulator,
  canAccessLoca,
  CV_DEFAULT_ALLOWED_MENU_KEYS,
  isAdminOrSuperAdminRole,
  isCvRole,
  isManagedMenuAccessKey,
  isSuperAdminRole,
  type SafeAny,
} from '@mos-lab/shared';
import { buildAdminAndReportSidebarGroups } from './sidebar/sidebar-groups-admin';
import { buildPrimarySidebarGroups } from './sidebar/sidebar-groups-core';
import type { SidebarGroupConfig, SidebarItemConfig } from './sidebar/sidebar-types';

export type { SidebarItemConfig, SidebarGroupConfig };
export { getSelectedMenuKey } from './sidebar/sidebar-route-matcher';

// Zero-Trust R&D & Mission keys remain strictly hidden from non-admins unless explicitly granted via menuVisibility
const ZERO_TRUST_EXPLICIT_GRANT_KEYS = new Set([
  'labs-hub',
  'pilot-dark-lashes',
  'cc-payroll-pilot',
  'fm-simulator',
  'bug-reports',
]);
// Strictly Admin-Only keys: NEVER unlockable for non-admins via menuVisibility overrides
const STRICT_ADMIN_ONLY_KEYS = new Set([
  'pnl-simulator',
  'inventory-parent',
  'inventory-items',
  'inventory-limits',
  'inventory-assign',
  'inventory-assets',
  'inventory-scan-logs',
  'inventory-catalog',
]);

export function getSidebarGroups(
  userRole: string = '',
  activeCampaigns: SafeAny[] = [],
  showCustomCampaigns: boolean = true,
  campaignVisibility: Record<string, boolean> = {},
  academySidebarCampaigns: SafeAny[] = [],
  academyAccess: boolean = false,
  menuVisibility: Record<string, boolean> = {},
  categoryVisibility: Record<string, boolean> = {},
  _currentUser: { username?: string | null; email?: string | null; teamCodes?: readonly string[] | null } = {},
  bugInboxApprovalCount: number = 0,
  activeFunds: SafeAny[] = []
): SidebarGroupConfig[] {
  const normalizedRole = userRole?.toLowerCase() || '';
  const isAdmin = isAdminOrSuperAdminRole(normalizedRole);
  const isSuperAdmin = isSuperAdminRole(normalizedRole);
  const isCv = isCvRole(normalizedRole);
  const isLocaAllowed = canAccessLoca(normalizedRole);
  const isCrmCategoryVisible = categoryVisibility.crm !== false;
  const isAcademyCategoryVisible = categoryVisibility.academy !== false;

  const { homeGroup, crmGroup, academyGroup, operationsGroup, qualityGroup } = buildPrimarySidebarGroups({
    normalizedRole,
    isAdmin,
    isLocaAllowed,
    activeCampaigns,
    showCustomCampaigns,
    campaignVisibility,
    academySidebarCampaigns,
    academyAccess,
  });

  const { scheduleGroup, reportsGroup, labsGroup, financeGroup, systemGroup } = buildAdminAndReportSidebarGroups({
    normalizedRole,
    isAdmin,
    isSuperAdmin,
    isCv,
    bugInboxApprovalCount,
    activeFunds,
  });

  const groups: SidebarGroupConfig[] = [homeGroup, crmGroup];
  if (academyGroup) {
    groups.push(academyGroup);
  }
  groups.push(operationsGroup, qualityGroup, scheduleGroup, reportsGroup, labsGroup);
  if (financeGroup) {
    groups.push(financeGroup);
  }
  if (systemGroup) {
    groups.push(systemGroup);
  }

  const filterItems = (items: SidebarItemConfig[]): SidebarItemConfig[] =>
    items.flatMap((item) => {
      if (!isAdmin && STRICT_ADMIN_ONLY_KEYS.has(item.key)) return [];
      if (item.key === 'fm-simulator') {
        if (!isAdmin && menuVisibility[item.key] === false) return [];
        return canAccessFmSimulator(normalizedRole, _currentUser?.teamCodes) ? [item] : [];
      }
      // Dynamic campaign links do not have individual static menu keys. Their
      // parent category therefore enforces the category policy for every child.
      if (!isCrmCategoryVisible && item.key === 'nyc-parent') return [];
      if (!isAcademyCategoryVisible && (item.key === 'academy' || item.key === 'post-hub')) return [];
      if (item.allowedRoles?.length && !isAdmin && !item.allowedRoles.includes(normalizedRole)) {
        return [];
      }
      if (item.children?.length) {
        const visibleChildren = filterItems(item.children);
        // A parent is navigational structure, not a separate permission gate.
        // It stays when at least one visible child remains.
        return visibleChildren.length > 0 ? [{ ...item, children: visibleChildren }] : [];
      }
      // Zero-Trust Admin-Only Default: Any newly added static sidebar entry not yet registered
      // in MENU_ACCESS_DEFINITIONS is strictly locked to Admin-only by default.
      const isDynamicKey =
        item.key.startsWith('nyc-campaign-') ||
        item.key.startsWith('academy-campaign-') ||
        item.key.startsWith('finance-fund-');
      if (!isAdmin && !isDynamicKey && item.key !== 'menu-access' && !isManagedMenuAccessKey(item.key)) {
        return [];
      }
      if (!isAdmin && ZERO_TRUST_EXPLICIT_GRANT_KEYS.has(item.key) && menuVisibility[item.key] !== true) {
        return [];
      }
      // Strict CV Allowlist Invariant: CV accounts only see 'cv' and 'career-path'
      // unless an admin explicitly enabled a module via menuVisibility[item.key] === true.
      if (isCv) {
        if (menuVisibility[item.key] === false) return [];
        if (menuVisibility[item.key] === true) return [item];
        return CV_DEFAULT_ALLOWED_MENU_KEYS.includes(item.key as SafeAny) ? [item] : [];
      }
      return menuVisibility[item.key] === false ? [] : [item];
    });

  return groups
    .map((group) => ({ ...group, items: filterItems(group.items) }))
    .filter((group) => group.items.length > 0);
}
