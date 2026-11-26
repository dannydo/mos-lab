import {
  UNIVERSAL_LANDING_ROUTE,
  canAccessFmSimulator,
  canAccessIosConsultationApp,
  getPreferredLandingRoute,
  isAdminOrSuperAdminRole,
  isCvRole,
} from '../auth.js';
import { MENU_ACCESS_DEFINITIONS } from './menu-access-definitions.js';

/**
 * Strict allowlist of frontend paths accessible to CV accounts by default.
 * Only Báo Cáo CV (/dashboard/cv), Career Path (/dashboard/career-path), and mOS Chat (/dashboard/chat, /chat) are allowed.
 * `/ios-app` is allowed ONLY for CV🪶 (CVL) and 🪶CV🪶 (CVLL), never for standard CV ('cv', 'technician', 'lt', 'ktv').
 */
export function isCvAllowedPath(
  pathname?: string | null,
  menuVisibility?: Record<string, boolean>,
  userRole?: string | null,
  teamCodes?: readonly string[] | null
): boolean {
  if (!pathname) return false;
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (
    cleanPath === '/dashboard/cv' ||
    cleanPath.startsWith('/dashboard/cv/') ||
    cleanPath === '/dashboard/career-path' ||
    cleanPath.startsWith('/dashboard/career-path/') ||
    cleanPath === '/dashboard/chat' ||
    cleanPath.startsWith('/dashboard/chat/') ||
    cleanPath === '/chat' ||
    cleanPath.startsWith('/chat/')
  ) {
    return true;
  }
  if (cleanPath === '/ios-app' || cleanPath.startsWith('/ios-app/')) {
    return userRole || teamCodes?.length ? canAccessIosConsultationApp(userRole, teamCodes) : false;
  }
  if (
    cleanPath === '/dashboard/fm-simulator' ||
    cleanPath.startsWith('/dashboard/fm-simulator/') ||
    cleanPath === '/fm-simulator' ||
    cleanPath.startsWith('/fm-simulator/')
  ) {
    return userRole || teamCodes?.length ? canAccessFmSimulator(userRole, teamCodes) : false;
  }
  if (menuVisibility) {
    for (const def of MENU_ACCESS_DEFINITIONS) {
      const defBasePath = def.path.split('?')[0].replace(/\/+$/, '');
      if (!defBasePath.startsWith('/')) continue;
      if (defBasePath && defBasePath !== '/dashboard' && cleanPath.startsWith(defBasePath)) {
        if (menuVisibility[def.key] === true) return true;
      }
      if (defBasePath === '/dashboard' && cleanPath === '/dashboard' && menuVisibility.dashboard === true) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Zero-Trust Admin-Only Default Route Guard (Layer 2):
 * Every new page/feature introduced into mOS is Admin-only by default.
 * Non-admin accounts may only visit paths that are explicitly granted to them in `menuVisibility`
 * (or universal session routes like `/chat` and `/dashboard/chat`).
 */
export function isNonAdminAllowedDashboardPath(
  pathname?: string | null,
  menuVisibility?: Record<string, boolean>,
  userRole?: string | null,
  teamCodes?: readonly string[] | null
): boolean {
  if (!pathname) return false;
  if (isAdminOrSuperAdminRole(userRole)) return true;

  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (cleanPath === '/ios-app' || cleanPath.startsWith('/ios-app/')) {
    return canAccessIosConsultationApp(userRole, teamCodes);
  }
  if (
    cleanPath === '/dashboard/fm-simulator' ||
    cleanPath.startsWith('/dashboard/fm-simulator/') ||
    cleanPath === '/fm-simulator' ||
    cleanPath.startsWith('/fm-simulator/')
  ) {
    return canAccessFmSimulator(userRole, teamCodes);
  }
  if (isCvRole(userRole)) {
    return isCvAllowedPath(cleanPath, menuVisibility, userRole, teamCodes);
  }
  if (
    cleanPath === '/dashboard/chat' ||
    cleanPath.startsWith('/dashboard/chat/') ||
    cleanPath === '/chat' ||
    cleanPath.startsWith('/chat/') ||
    cleanPath === '/login' ||
    cleanPath.startsWith('/login/')
  ) {
    return true;
  }

  // Once menuVisibility is loaded from /api/menu-access/sidebar, enforce strict default-deny:
  // Any route not matched to an explicitly allowed menuVisibility[key] === true is blocked for non-admins.
  if (menuVisibility && Object.keys(menuVisibility).length > 0) {
    if (cleanPath === '/dashboard') {
      return menuVisibility.dashboard === true;
    }

    // Dynamic campaign detail operational workspaces:
    // Individual campaign pages (/dashboard/nyc/campaigns/:slug) are operational queues where staff
    // (such as Telesales/Bookers) manage customers and make calls. They are distinct from the
    // campaign management configuration screen (/dashboard/nyc/campaigns).
    if (cleanPath.startsWith('/dashboard/nyc/campaigns/')) {
      const allowedCampaignKeys = ['nyc-main', 'nyc-campaigns-mgmt', 'loca', 'my-customers', 'customers-all'];
      return allowedCampaignKeys.some((k) => menuVisibility[k] === true);
    }

    // Dynamic Academy campaign detail operational workspaces:
    if (cleanPath.startsWith('/dashboard/academy-leads/campaigns/')) {
      const allowedAcademyCampaignKeys = [
        'academy-campaigns',
        'academy-customers',
        'academy-lead-manager',
        'post-hub',
        'academy-workshops',
      ];
      return allowedAcademyCampaignKeys.some((k) => menuVisibility[k] === true);
    }

    // Match the most specific menu definition(s) for this path
    const matchingDefs = MENU_ACCESS_DEFINITIONS.filter((def) => {
      const defBasePath = def.path.split('?')[0].replace(/\/+$/, '');
      if (!defBasePath.startsWith('/')) return false;
      return (
        defBasePath &&
        defBasePath !== '/dashboard' &&
        (cleanPath === defBasePath || cleanPath.startsWith(`${defBasePath}/`))
      );
    });

    if (matchingDefs.length > 0) {
      const maxLen = Math.max(...matchingDefs.map((d) => d.path.split('?')[0].replace(/\/+$/, '').length));
      const mostSpecificDefs = matchingDefs.filter((d) => d.path.split('?')[0].replace(/\/+$/, '').length === maxLen);
      return mostSpecificDefs.some((d) => menuVisibility[d.key] === true);
    }

    // Any unregistered / newly created route under /dashboard/* defaults to Admin-only (false for non-admins)
    return false;
  }

  return true;
}

/**
 * Post-login landing route (used only when there is no `?next=` redirect).
 * Fallback chain:
 *   1. The role's preferred workspace, if the account may open it (Menu Access respected).
 *   2. The first menu entry the account is allowed to see (menu order).
 *   3. The universal mOS Chat page.
 * `menuVisibility` may be omitted/empty (admins, or sidebar visibility not loaded): the preferred route is used as-is.
 */
export function resolveLandingRoute(params: {
  role?: string | null;
  menuVisibility?: Record<string, boolean> | null;
  teamCodes?: readonly string[] | null;
}): string {
  const { role, menuVisibility, teamCodes } = params;
  const visibility = menuVisibility || {};
  const hasVisibility = Object.keys(visibility).length > 0;
  const preferred = getPreferredLandingRoute(role);

  if (preferred && isNonAdminAllowedDashboardPath(preferred, visibility, role, teamCodes)) {
    return preferred;
  }

  if (hasVisibility && !isAdminOrSuperAdminRole(role)) {
    const firstAllowed = MENU_ACCESS_DEFINITIONS.find(
      (def) =>
        visibility[def.key] === true &&
        def.path.startsWith('/') &&
        isNonAdminAllowedDashboardPath(def.path.split('?')[0], visibility, role, teamCodes)
    );
    if (firstAllowed) return firstAllowed.path.split('?')[0];
  }

  return UNIVERSAL_LANDING_ROUTE;
}

/**
 * Maps a normalized backend API path (without `/api` prefix and without query string)
 * to the canonical menu access keys that govern it.
 * - Returns `['__SESSION_ALLOWED__']` for core session/shell/chat endpoints allowed for all signed-in staff.
 * - Returns `['__BUG_REPORT_BLOCKED_FOR_CV__']` for bug report endpoints so CV is strictly blocked.
 * - Returns matching `menuKey`s for module endpoints.
 */
export function resolveMenuKeysForApiPath(apiPath: string): string[] {
  const clean =
    (
      '/' +
      apiPath
        .split('?')[0]
        .replace(/^\/+/, '')
        .replace(/^api\/+/, '')
    ).replace(/\/+$/, '') || '/';

  // 1. Core session, profile, chat, notifications, and shell bootstrap endpoints
  if (
    clean === '/health' ||
    clean.startsWith('/health/') ||
    clean === '/release' ||
    clean.startsWith('/auth/') ||
    clean === '/auth' ||
    clean === '/menu-access/sidebar' ||
    clean.startsWith('/chat/') ||
    clean === '/chat' ||
    clean.startsWith('/ai/') ||
    clean === '/ai' ||
    clean.startsWith('/notifications') ||
    clean.startsWith('/ui-experiences/active') ||
    clean.startsWith('/user-preferences') ||
    clean.startsWith('/table-config') ||
    clean.startsWith('/bible')
  ) {
    return ['__SESSION_ALLOWED__'];
  }

  // 2. Bug Reports (mOS Mission) & Frontend Telemetry — explicitly blocked for CV
  if (
    clean.startsWith('/bug-reports') ||
    clean.startsWith('/telemetry') ||
    clean.startsWith('/frontend-telemetry') ||
    clean.startsWith('/experience-journal')
  ) {
    return ['__BUG_REPORT_BLOCKED_FOR_CV__'];
  }

  // 2.5. Admin-Only Training Mentorship Pairing Config (Điều răn UI-010 Zero-Trust)
  if (clean.startsWith('/kpi/cvl-training-mentorship') || clean.startsWith('/cvl-training-mentorship')) {
    return ['__ADMIN_ONLY_DEFAULT__'];
  }

  // 3. CV Report & Career Path (Allowed for CV)
  if (clean.startsWith('/kpi/cv') || clean.startsWith('/cv')) {
    return ['cv'];
  }
  if (clean.startsWith('/career')) {
    return ['career-path'];
  }

  // 4. Other KPI & Reports & Gamification
  if (
    clean.startsWith('/kpi/cc') ||
    clean.startsWith('/cc') ||
    clean.startsWith('/kpi/cb') ||
    clean.startsWith('/cb') ||
    clean.startsWith('/gamification') ||
    clean.startsWith('/kpi/export-diamond')
  ) {
    return ['cb', 'cc', 'kpi', 'dashboard'];
  }
  if (clean.startsWith('/kpi/bk') || clean.startsWith('/kpi/export-booker-salary') || clean.startsWith('/bk')) {
    return ['bk', 'kpi', 'dashboard'];
  }
  if (clean.startsWith('/kpi/cs')) return ['cs', 'cs-hub', 'kpi', 'dashboard'];
  if (clean.startsWith('/kpi/financial-goals') || clean.startsWith('/financial-goals')) {
    return ['financial-goals', 'kpi'];
  }
  if (clean.startsWith('/kpi')) return ['kpi', 'dashboard', 'cc', 'bk', 'cs', 'telesale-target'];

  // 5. Home & Operations & CRM
  if (clean.startsWith('/dashboard/today') || clean.startsWith('/today')) {
    return ['today', 'dashboard'];
  }
  if (clean.startsWith('/schedule-calendar')) {
    return ['schedule-calendar', 'my-appointments', 'today', 'my-customers', 'customers-all'];
  }
  if (clean.startsWith('/branches')) return ['branches', 'dashboard'];
  if (clean.startsWith('/customers/today')) {
    return ['today', 'dashboard', 'my-customers', 'customers-all', 'cc', 'bk', 'cs'];
  }
  if (
    clean.startsWith('/customers/appointments') ||
    clean.startsWith('/customers/booking-slots') ||
    clean.startsWith('/customers/cv-status') ||
    clean.startsWith('/customers/cv-schedule-roster')
  ) {
    return [
      'my-appointments',
      'schedule-calendar',
      'today',
      'my-customers',
      'customers-all',
      'loca',
      'nyc-main',
      'cs-hub',
      'plans',
      'bk',
      'cs',
      'cc',
    ];
  }
  if (clean.startsWith('/customers')) {
    return [
      'customers-all',
      'my-customers',
      'referrals',
      'loca',
      'nyc-main',
      'nyc-campaigns-mgmt',
      'cs-hub',
      'bk',
      'cs',
      'telesale-target',
    ];
  }
  if (clean.startsWith('/nyc')) {
    return ['nyc-main', 'nyc-campaigns-mgmt', 'loca', 'my-customers', 'customers-all'];
  }
  if (clean.startsWith('/saved-filters')) {
    return ['customers-all', 'my-customers', 'nyc-main', 'loca', 'today', 'bk', 'cs'];
  }
  if (clean.startsWith('/campaigns')) {
    return ['nyc-main', 'nyc-campaigns-mgmt', 'loca', 'my-customers', 'customers-all'];
  }
  if (clean.startsWith('/allocation')) {
    return ['my-customers', 'customers-all', 'plans', 'nyc-main', 'loca', 'bk', 'cs'];
  }
  if (clean.startsWith('/cs')) return ['cs-hub', 'cs', 'my-customers', 'customers-all'];
  if (
    clean.startsWith('/plans') ||
    clean.startsWith('/calls') ||
    clean.startsWith('/omicall') ||
    clean.startsWith('/sms')
  ) {
    return [
      'calls',
      'plans',
      'omicall',
      'my-customers',
      'customers-all',
      'loca',
      'nyc-main',
      'cs-hub',
      'referrals',
      'bk',
      'cs',
      'telesale-target',
      'academy-customers',
      'academy-lead-manager',
      'academy-campaigns',
    ];
  }
  if (clean.startsWith('/telesale-competency')) {
    return ['telesale-competency', 'bk', 'kpi'];
  }
  if (clean.startsWith('/telesale-target')) {
    return ['telesale-target', 'bk', 'kpi'];
  }

  // 6. Quality, Schedule, Academy, Labs, System
  if (clean.startsWith('/qa-shop')) return ['qa-shop'];
  if (clean.startsWith('/fal')) return ['fal-control-tower'];
  if (clean.startsWith('/holiday-work')) return ['holiday-work'];
  if (clean.startsWith('/post-hub')) return ['post-hub'];
  if (clean.startsWith('/academy-workshops')) return ['academy-workshops'];
  if (clean.startsWith('/academy')) {
    return [
      'academy-customers',
      'academy-lead-manager',
      'academy-campaigns',
      'academy-workshops',
      'academy-courses',
      'academy-payment-management',
      'academy-instructors',
    ];
  }
  if (clean.startsWith('/pilot')) return ['pilot-dark-lashes', 'labs-hub'];
  if (clean.startsWith('/payroll-ledger')) return ['cc-payroll-pilot'];
  if (clean.startsWith('/funds-management') || clean.startsWith('/funds')) {
    return ['finance-funds-manage', 'dashboard'];
  }
  if (clean.startsWith('/cash-flow')) return ['finance-cash-flow', 'dashboard'];
  if (clean.startsWith('/catalog')) return ['catalog'];
  if (clean.startsWith('/teams')) return ['teams'];
  if (clean.startsWith('/staff') || clean.startsWith('/roles')) return ['staff-directory', 'teams'];

  // Zero-Trust Admin-Only Default: Any newly designed API route not yet mapped
  // to an explicit module key defaults to Admin-only access.
  return ['__ADMIN_ONLY_DEFAULT__'];
}
