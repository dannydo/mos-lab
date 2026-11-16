import type { LucideIcon } from 'lucide-react';
import { BarChart3, CalendarCheck, LayoutDashboard, MessageSquare, Smartphone, Trophy, Wallet } from 'lucide-react';
import {
  canAccessIosConsultationApp,
  hasCcTeamMembership,
  isAdminOrSuperAdminRole,
  isCvRole,
  MENU_ACCESS_DEFINITIONS,
  normalizeCvFeatherRole,
} from '@mos-lab/shared';

export type EcosystemAppKey = 'general' | 'chat' | 'ios';

export type QuickSwitchRoleGroup = 'CV_FEATHER' | 'CC' | 'CV_STANDARD' | 'ADMIN_MANAGER' | 'OTHER';

export interface EcosystemAppItem {
  key: EcosystemAppKey;
  label: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  tone: 'sky' | 'emerald' | 'amber';
  badgeCount?: number;
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
  if (isCvRole(userRole)) return '/dashboard/cv';
  if (menuVisibility && Object.keys(menuVisibility).length > 0) {
    if (menuVisibility.dashboard === true) return '/dashboard';
    const firstAllowed = MENU_ACCESS_DEFINITIONS.find((def) => menuVisibility[def.key] === true);
    if (firstAllowed?.path) {
      return firstAllowed.path.split('?')[0] || '/dashboard';
    }
  }
  return '/dashboard';
}

export function buildEcosystemNavModel(params: {
  userRole?: string | null;
  teamCodes?: readonly string[] | null;
  unreadChatCount?: number;
  savedAdminRole?: string | null;
  menuVisibility?: Record<string, boolean> | null;
}): {
  roleGroup: QuickSwitchRoleGroup;
  canAccessIos: boolean;
  isCcTeamMember: boolean;
  consultRoleParam: 'CVL' | 'CVLL' | 'CC';
  coreApps: EcosystemAppItem[];
  quickLinks: EcosystemQuickLink[];
} {
  const { userRole, teamCodes, unreadChatCount = 0, savedAdminRole, menuVisibility } = params;
  const roleGroup = resolveQuickSwitchRoleGroup(userRole, teamCodes);
  const canAccessIos = canAccessIosConsultationApp(userRole, teamCodes);
  const isCcTeamMember = hasCcTeamMembership(teamCodes);
  const consultRoleParam = resolveConsultRoleParam(userRole, teamCodes, savedAdminRole);
  const isCv = isCvRole(userRole);
  const isAdmin = isAdminOrSuperAdminRole(userRole);

  const generalHref = resolveGeneralLandingHref(userRole, menuVisibility);
  const iosHref = roleGroup === 'ADMIN_MANAGER' ? '/ios-app' : `/ios-app?role=${consultRoleParam}`;

  const coreApps: EcosystemAppItem[] = [
    {
      key: 'general',
      label: 'mOS General',
      subtitle: isCv ? 'Thu nhập & Lộ trình' : 'Quản trị & Báo cáo',
      href: generalHref,
      icon: ECOSYSTEM_ICONS.general,
      tone: 'sky',
    },
    {
      key: 'chat',
      label: 'mOS Chat',
      subtitle: 'Nội bộ & MAI AI',
      href: '/chat',
      icon: ECOSYSTEM_ICONS.chat,
      tone: 'emerald',
      badgeCount: unreadChatCount > 0 ? unreadChatCount : undefined,
    },
  ];

  if (canAccessIos) {
    coreApps.push({
      key: 'ios',
      label: 'iOS-App',
      subtitle: 'Tư vấn & Checkout',
      href: iosHref,
      icon: ECOSYSTEM_ICONS.ios,
      tone: 'amber',
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

  if (!isAdmin && menuVisibility && Object.keys(menuVisibility).length > 0) {
    quickLinks = quickLinks.filter((item) => !item.menuKey || menuVisibility[item.menuKey] === true);
  }

  return {
    roleGroup,
    canAccessIos,
    isCcTeamMember,
    consultRoleParam,
    coreApps,
    quickLinks,
  };
}
