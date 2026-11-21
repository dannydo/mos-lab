import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpenCheck,
  CalendarCheck,
  Feather,
  FlaskConical,
  LayoutDashboard,
  MessageSquare,
  MessageSquareWarning,
  Rocket,
  Smartphone,
  Trophy,
  Wallet,
} from 'lucide-react';
import {
  canAccessIosConsultationApp,
  hasCcTeamMembership,
  isAdminOrSuperAdminRole,
  isCcRole,
  isCvRole,
  isTelesalesRole,
  MENU_ACCESS_DEFINITIONS,
  normalizeCvFeatherRole,
} from '@mos-lab/shared';

export type EcosystemAppKey = 'general' | 'chat' | 'ios';
export type EcosystemSuiteKey = 'reports' | 'mission' | 'bible' | 'lab' | 'wings-garden' | 'feedback';
export type EcosystemTone = 'sky' | 'emerald' | 'amber' | 'violet' | 'rose' | 'cyan';

export type QuickSwitchRoleGroup = 'CV_FEATHER' | 'CC' | 'CV_STANDARD' | 'ADMIN_MANAGER' | 'OTHER';

export interface EcosystemAppItem {
  key: EcosystemAppKey;
  label: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  tone: EcosystemTone;
  badgeCount?: number;
}

export interface EcosystemSuiteItem {
  key: EcosystemSuiteKey;
  label: string;
  shortLabel?: string;
  subtitle: string;
  href: string;
  action?: 'open-bible' | 'open-feedback';
  icon: LucideIcon;
  tone: EcosystemTone;
  badgeCount?: number;
  comingSoon?: boolean;
}

export interface EcosystemQuickLink {
  key: string;
  menuKey?: string;
  label: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  accent?: boolean;
  badgeCount?: number;
}

export const REPORT_MENU_KEYS = ['kpi', 'cb', 'cc', 'cv', 'bk', 'cs', 'financial-goals'] as const;
export const LAB_EXPLICIT_MENU_KEYS = ['labs-hub', 'pilot-dark-lashes', 'cc-payroll-pilot'] as const;

const OPERATIONAL_GENERAL_MENU_KEYS = MENU_ACCESS_DEFINITIONS.filter(
  (def) => !['reports', 'labs', 'bible'].includes(def.groupKey) && def.key !== 'bug-reports' && def.path.startsWith('/')
).map((def) => def.key);

const LAB_ROUTE_BY_KEY: Record<string, string> = {
  'labs-hub': '/dashboard/labs',
  'pilot-dark-lashes': '/dashboard/pilot-dark-lashes',
  'cc-payroll-pilot': '/dashboard/payroll-pilot',
};

export function isReportPathname(pathname: string): boolean {
  const clean = pathname.split('?')[0];
  return [
    '/dashboard/kpi',
    '/dashboard/cb',
    '/dashboard/cc',
    '/dashboard/cv',
    '/dashboard/bk',
    '/dashboard/cs',
    '/dashboard/financial-goals',
  ].some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
}

export function isMissionPathname(pathname: string): boolean {
  const clean = pathname.split('?')[0];
  return clean === '/dashboard/bug-reports' || clean.startsWith('/dashboard/bug-reports/');
}

export function isLabPathname(pathname: string): boolean {
  const clean = pathname.split('?')[0];
  return ['/dashboard/labs', '/dashboard/pilot-dark-lashes', '/dashboard/payroll-pilot', '/dashboard/career-path'].some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`)
  );
}

export function isWingsGardenPathname(pathname: string): boolean {
  const clean = pathname.split('?')[0];
  return clean === '/wings-garden' || clean.startsWith('/wings-garden/');
}

/**
 * Resolves the operational quick-switch group using both the primary role and
 * active CRM team memberships (e.g. a Manager added to the CC team).
 */
export function resolveQuickSwitchRoleGroup(
  role?: string | null,
  teamCodes?: readonly string[] | null
): QuickSwitchRoleGroup {
  const raw = String(role || '').trim();
  const lower = raw.toLowerCase();
  const normalizedFeather = normalizeCvFeatherRole(raw);

  if (
    normalizedFeather === 'CVL' ||
    normalizedFeather === 'CVLL' ||
    ['cvl', 'cvll', 'cv_plus', 'cv_plus_plus'].includes(lower)
  ) {
    return 'CV_FEATHER';
  }

  if (['cc', 'consultant'].includes(lower)) {
    return 'CC';
  }

  if (isAdminOrSuperAdminRole(raw)) {
    return 'ADMIN_MANAGER';
  }

  if (hasCcTeamMembership(teamCodes)) {
    return 'CC';
  }

  if (isCvRole(raw)) {
    return 'CV_STANDARD';
  }

  return 'OTHER';
}

export function resolveConsultRoleParam(
  role?: string | null,
  teamCodes?: readonly string[] | null,
  savedAdminRole?: string | null
): 'CVL' | 'CVLL' | 'CC' {
  const roleGroup = resolveQuickSwitchRoleGroup(role, teamCodes);
  const featherTier = normalizeCvFeatherRole(String(role || ''));
  if (roleGroup === 'CC') return 'CC';
  if (featherTier === 'CVLL') return 'CVLL';
  if (
    roleGroup === 'ADMIN_MANAGER' &&
    (savedAdminRole === 'CC' || savedAdminRole === 'CVLL' || savedAdminRole === 'CVL')
  ) {
    return savedAdminRole;
  }
  return 'CVL';
}

export const ECOSYSTEM_ICONS = {
  general: LayoutDashboard,
  chat: MessageSquare,
  ios: Smartphone,
  reports: BarChart3,
  mission: Rocket,
  bible: BookOpenCheck,
  lab: FlaskConical,
  wingsGarden: Feather,
  feedback: MessageSquareWarning,
  today: CalendarCheck,
  ccKpi: BarChart3,
  cvIncome: Wallet,
  careerPath: Trophy,
} as const;

export function resolveGeneralLandingHref(
  userRole?: string | null,
  menuVisibility?: Record<string, boolean> | null
): string {
  if (isAdminOrSuperAdminRole(userRole)) return '/dashboard';
  if (menuVisibility && Object.keys(menuVisibility).length > 0) {
    if (menuVisibility.dashboard === true) return '/dashboard';
    const firstOperationalKey = OPERATIONAL_GENERAL_MENU_KEYS.find((key) => menuVisibility[key] === true);
    if (firstOperationalKey) {
      const def = MENU_ACCESS_DEFINITIONS.find((item) => item.key === firstOperationalKey);
      if (def?.path && def.path.startsWith('/')) {
        return def.path.split('?')[0] || '/dashboard';
      }
    }
    const firstAllowed = MENU_ACCESS_DEFINITIONS.find(
      (def) => menuVisibility[def.key] === true && def.path.startsWith('/')
    );
    if (firstAllowed?.path) {
      return firstAllowed.path.split('?')[0] || '/dashboard';
    }
  }
  if (isCvRole(userRole)) return '/dashboard/cv';
  return '/dashboard';
}

function resolveReportsSuite(params: {
  userRole?: string | null;
  teamCodes?: readonly string[] | null;
  isAdmin: boolean;
  isCv: boolean;
  hasVisibilityMap: boolean;
  menuVisibility?: Record<string, boolean> | null;
}): EcosystemSuiteItem | null {
  const { userRole, teamCodes, isAdmin, isCv, hasVisibilityMap, menuVisibility } = params;
  const rawRole = String(userRole || '').trim();
  const lowerRole = rawRole.toLowerCase();
  const upperTeams = new Set(
    (teamCodes || []).map((c) =>
      String(c || '')
        .trim()
        .toUpperCase()
    )
  );

  const isCc = isCcRole(rawRole) || hasCcTeamMembership(teamCodes);
  const isBk = isTelesalesRole(rawRole) || upperTeams.has('BK') || upperTeams.has('BK_TELESALES');
  const isCs =
    ['cs', 'coca', 'control'].includes(lowerRole) ||
    upperTeams.has('CS') ||
    upperTeams.has('BK_CS') ||
    upperTeams.has('BK_CONTROL');

  const metaByKey: Record<string, { href: string; subtitle: string }> = {
    cv: { href: '/dashboard/cv', subtitle: 'Thu nhập & Ca làm' },
    cc: { href: '/dashboard/cc', subtitle: 'KPI & Thưởng CC' },
    bk: { href: '/dashboard/bk', subtitle: 'KPI & Hoa hồng BK' },
    cs: { href: '/dashboard/cs', subtitle: 'Báo cáo CSKH' },
    kpi: { href: '/dashboard/kpi', subtitle: 'KPI & Hiệu suất' },
    cb: { href: '/dashboard/cb', subtitle: 'Dashboard $CB' },
    'financial-goals': { href: '/dashboard/financial-goals', subtitle: 'Mục tiêu Tài chính' },
  };

  let priorityOrder: string[];
  if (isAdmin) {
    priorityOrder = ['kpi', 'cc', 'cv', 'bk', 'cs', 'cb', 'financial-goals'];
  } else if (isCv) {
    priorityOrder = ['cv', 'cc', 'bk', 'cs', 'kpi', 'cb', 'financial-goals'];
  } else if (isCc) {
    priorityOrder = ['cc', 'kpi', 'bk', 'cs', 'cv', 'cb', 'financial-goals'];
  } else if (isBk) {
    priorityOrder = ['bk', 'kpi', 'cc', 'cs', 'cv', 'cb', 'financial-goals'];
  } else if (isCs) {
    priorityOrder = ['cs', 'kpi', 'bk', 'cc', 'cv', 'cb', 'financial-goals'];
  } else {
    priorityOrder = ['kpi', 'cc', 'bk', 'cs', 'cv', 'cb', 'financial-goals'];
  }

  let chosenKey: string | undefined;
  if (isAdmin) {
    chosenKey = 'kpi';
  } else if (hasVisibilityMap) {
    chosenKey = priorityOrder.find((key) => {
      if (isCv && key === 'cv') {
        return menuVisibility?.cv !== false;
      }
      return menuVisibility?.[key] === true;
    });
  } else {
    chosenKey = priorityOrder[0];
  }

  if (!chosenKey) return null;
  const meta = metaByKey[chosenKey] || metaByKey.kpi;
  return {
    key: 'reports',
    label: 'mOS Reports',
    shortLabel: 'Reports',
    subtitle: meta.subtitle,
    href: meta.href,
    icon: ECOSYSTEM_ICONS.reports,
    tone: 'violet',
  };
}

export function buildEcosystemNavModel(params: {
  userRole?: string | null;
  teamCodes?: readonly string[] | null;
  unreadChatCount?: number;
  missionBadgeCount?: number;
  bugAttentionCount?: number;
  savedAdminRole?: string | null;
  menuVisibility?: Record<string, boolean> | null;
}): {
  roleGroup: QuickSwitchRoleGroup;
  canAccessIos: boolean;
  isCcTeamMember: boolean;
  consultRoleParam: 'CVL' | 'CVLL' | 'CC';
  coreApps: EcosystemAppItem[];
  suiteApps: EcosystemSuiteItem[];
  quickLinks: EcosystemQuickLink[];
} {
  const {
    userRole,
    teamCodes,
    unreadChatCount = 0,
    missionBadgeCount = 0,
    bugAttentionCount = 0,
    savedAdminRole,
    menuVisibility,
  } = params;
  const roleGroup = resolveQuickSwitchRoleGroup(userRole, teamCodes);
  const canAccessIos = canAccessIosConsultationApp(userRole, teamCodes);
  const isCcTeamMember = hasCcTeamMembership(teamCodes);
  const consultRoleParam = resolveConsultRoleParam(userRole, teamCodes, savedAdminRole);
  const isCv = isCvRole(userRole);
  const isAdmin = isAdminOrSuperAdminRole(userRole);
  const hasVisibilityMap = Boolean(menuVisibility && Object.keys(menuVisibility).length > 0);

  const generalHref = resolveGeneralLandingHref(userRole, menuVisibility);
  const iosHref = roleGroup === 'ADMIN_MANAGER' ? '/ios-app' : `/ios-app?role=${consultRoleParam}`;

  const canSeeGeneral =
    !isCv || (hasVisibilityMap && OPERATIONAL_GENERAL_MENU_KEYS.some((k) => menuVisibility?.[k] === true));

  const coreApps: EcosystemAppItem[] = [];
  if (canSeeGeneral) {
    coreApps.push({
      key: 'general',
      label: 'mOS General',
      subtitle: 'Vận hành & CRM',
      href: generalHref,
      icon: ECOSYSTEM_ICONS.general,
      tone: 'sky',
    });
  }

  coreApps.push({
    key: 'chat',
    label: 'mOS Chat',
    subtitle: 'Nội bộ & MAI AI',
    href: '/chat',
    icon: ECOSYSTEM_ICONS.chat,
    tone: 'emerald',
    badgeCount: unreadChatCount > 0 ? unreadChatCount : undefined,
  });

  if (canAccessIos) {
    coreApps.push({
      key: 'ios',
      label: 'iOS-App',
      subtitle: 'Tư vấn tại sảnh',
      href: iosHref,
      icon: ECOSYSTEM_ICONS.ios,
      tone: 'amber',
    });
  }

  const suiteApps: EcosystemSuiteItem[] = [];

  const reportsItem = resolveReportsSuite({
    userRole,
    teamCodes,
    isAdmin,
    isCv,
    hasVisibilityMap,
    menuVisibility,
  });
  if (reportsItem) {
    suiteApps.push(reportsItem);
  }

  // Zero-Trust: mOS Mission is blocked for CV and requires Admin or explicit 'bug-reports' grant
  const canSeeMission = !isCv && (isAdmin || menuVisibility?.['bug-reports'] === true);
  if (canSeeMission) {
    suiteApps.push({
      key: 'mission',
      label: 'mOS Mission',
      shortLabel: 'Mission',
      subtitle: 'Nhiệm vụ & Lỗi',
      href: '/dashboard/bug-reports',
      icon: ECOSYSTEM_ICONS.mission,
      tone: 'rose',
      badgeCount: missionBadgeCount > 0 ? missionBadgeCount : undefined,
    });
  }

  // mOS Bible is open by default to all staff unless explicitly disabled in Menu Access
  const canSeeBible = isAdmin || !hasVisibilityMap || menuVisibility?.['mos-bible'] !== false;
  if (canSeeBible) {
    suiteApps.push({
      key: 'bible',
      label: 'mOS Bible',
      shortLabel: 'Bible',
      subtitle: 'Kinh Thánh · Quiz',
      href: '#mos-bible',
      action: 'open-bible',
      icon: ECOSYSTEM_ICONS.bible,
      tone: 'amber',
    });
  }

  // Zero-Trust: mOS Lab requires Admin or explicit grant to labs-hub / pilot modules (career-path alone does not unlock Lab)
  const grantedLabKey = isAdmin ? 'labs-hub' : LAB_EXPLICIT_MENU_KEYS.find((key) => menuVisibility?.[key] === true);
  if (grantedLabKey) {
    suiteApps.push({
      key: 'lab',
      label: 'mOS Lab',
      shortLabel: 'Lab',
      subtitle: 'Sản phẩm R&D',
      href: LAB_ROUTE_BY_KEY[grantedLabKey] || '/dashboard/labs',
      icon: ECOSYSTEM_ICONS.lab,
      tone: 'cyan',
    });
  }

  // Wings Garden: Live for Admin / Super Admin, shown as Coming soon for all other role groups
  suiteApps.push({
    key: 'wings-garden',
    label: 'Wings Garden',
    shortLabel: 'Wings Garden',
    subtitle: isAdmin ? 'Thiên Đường Nối Lông' : 'Coming soon',
    href: isAdmin ? '/wings-garden' : '#wings-garden-coming-soon',
    icon: ECOSYSTEM_ICONS.wingsGarden,
    tone: 'emerald',
    comingSoon: !isAdmin,
  });

  // Báo lỗi & Góp ý: Available to all non-CV staff
  if (!isCv) {
    suiteApps.push({
      key: 'feedback',
      label: 'Báo lỗi & Góp ý',
      shortLabel: 'Góp ý',
      subtitle: 'Phản hồi · Theo dõi xử lý',
      href: '#bug-report',
      action: 'open-feedback',
      icon: ECOSYSTEM_ICONS.feedback,
      tone: 'amber',
      badgeCount: bugAttentionCount > 0 ? bugAttentionCount : undefined,
    });
  }

  let quickLinks: EcosystemQuickLink[] = [];
  if (roleGroup === 'CV_FEATHER') {
    quickLinks = [
      {
        key: 'consult',
        label: 'Tư vấn & Checkout KH',
        shortLabel: 'Tư vấn KH',
        href: `/ios-app?role=${consultRoleParam}`,
        icon: ECOSYSTEM_ICONS.ios,
        accent: true,
      },
      {
        key: 'cv-income',
        menuKey: 'cv',
        label: 'Báo cáo Thu nhập CV',
        shortLabel: 'Thu nhập',
        href: '/dashboard/cv',
        icon: ECOSYSTEM_ICONS.cvIncome,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình Thăng tiến CV',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: ECOSYSTEM_ICONS.careerPath,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: ECOSYSTEM_ICONS.chat,
        badgeCount: unreadChatCount,
      },
    ];
  } else if (roleGroup === 'CC') {
    quickLinks = [
      {
        key: 'consult',
        label: 'Tư vấn & Checkout KH',
        shortLabel: 'Tư vấn KH',
        href: '/ios-app?role=CC',
        icon: ECOSYSTEM_ICONS.ios,
        accent: true,
      },
      {
        key: 'today',
        menuKey: 'today',
        label: 'Khách hàng hôm nay',
        shortLabel: 'Hôm nay',
        href: '/dashboard/today',
        icon: ECOSYSTEM_ICONS.today,
      },
      {
        key: 'cc-kpi',
        menuKey: 'cc',
        label: 'Báo cáo KPI & Thưởng CC',
        shortLabel: 'KPI CC',
        href: '/dashboard/cc',
        icon: ECOSYSTEM_ICONS.ccKpi,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình Thăng tiến',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: ECOSYSTEM_ICONS.careerPath,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: ECOSYSTEM_ICONS.chat,
        badgeCount: unreadChatCount,
      },
    ];
  } else if (roleGroup === 'CV_STANDARD') {
    quickLinks = [
      {
        key: 'cv-income',
        menuKey: 'cv',
        label: 'Báo cáo Thu nhập CV',
        shortLabel: 'Thu nhập',
        href: '/dashboard/cv',
        icon: ECOSYSTEM_ICONS.cvIncome,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình Thăng tiến CV',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: ECOSYSTEM_ICONS.careerPath,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: ECOSYSTEM_ICONS.chat,
        badgeCount: unreadChatCount,
      },
    ];
  } else if (roleGroup === 'ADMIN_MANAGER') {
    quickLinks = [
      {
        key: 'consult',
        label: 'Tư vấn & Checkout KH',
        shortLabel: 'Tư vấn KH',
        href: '/ios-app',
        icon: ECOSYSTEM_ICONS.ios,
        accent: true,
      },
      {
        key: 'today',
        menuKey: 'today',
        label: 'Khách hàng hôm nay',
        shortLabel: 'Hôm nay',
        href: '/dashboard/today',
        icon: ECOSYSTEM_ICONS.today,
      },
      {
        key: 'cv-income',
        menuKey: 'cv',
        label: 'Báo cáo CV',
        shortLabel: 'Thu nhập CV',
        href: '/dashboard/cv',
        icon: ECOSYSTEM_ICONS.cvIncome,
      },
      {
        key: 'cc-kpi',
        menuKey: 'cc',
        label: 'Báo cáo KPI CC',
        shortLabel: 'KPI CC',
        href: '/dashboard/cc',
        icon: ECOSYSTEM_ICONS.ccKpi,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình CV',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: ECOSYSTEM_ICONS.careerPath,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: ECOSYSTEM_ICONS.chat,
        badgeCount: unreadChatCount,
      },
    ];
  } else {
    quickLinks = [
      {
        key: 'today',
        menuKey: 'today',
        label: 'Khách hàng hôm nay',
        shortLabel: 'Hôm nay',
        href: '/dashboard/today',
        icon: ECOSYSTEM_ICONS.today,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình Thăng tiến',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: ECOSYSTEM_ICONS.careerPath,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: ECOSYSTEM_ICONS.chat,
        badgeCount: unreadChatCount,
      },
    ];
  }

  if (!isAdmin && hasVisibilityMap) {
    quickLinks = quickLinks.filter((item) => !item.menuKey || menuVisibility?.[item.menuKey] === true);
  }

  return {
    roleGroup,
    canAccessIos,
    isCcTeamMember,
    consultRoleParam,
    coreApps,
    suiteApps,
    quickLinks,
  };
}
