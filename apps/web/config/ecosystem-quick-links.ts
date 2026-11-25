import { BarChart3, CalendarCheck, MessageSquare, Smartphone, Trophy, Wallet } from 'lucide-react';
import type { EcosystemQuickLink, QuickSwitchRoleGroup } from './ecosystem-nav';

/**
 * Builds role-scoped quick links for the sidebar ecosystem switcher and launcher.
 */
export function buildRoleQuickLinks(params: {
  roleGroup: QuickSwitchRoleGroup;
  consultRoleParam: 'CVL' | 'CVLL' | 'CC';
  unreadChatCount: number;
  isAdmin: boolean;
  hasVisibilityMap: boolean;
  menuVisibility?: Record<string, boolean> | null;
}): EcosystemQuickLink[] {
  const { roleGroup, consultRoleParam, unreadChatCount, isAdmin, hasVisibilityMap, menuVisibility } = params;

  let quickLinks: EcosystemQuickLink[] = [];
  if (roleGroup === 'CV_FEATHER') {
    quickLinks = [
      {
        key: 'consult',
        label: 'Tư vấn & Checkout KH',
        shortLabel: 'Tư vấn KH',
        href: `/ios-app?role=${consultRoleParam}`,
        icon: Smartphone,
        accent: true,
      },
      {
        key: 'cv-income',
        menuKey: 'cv',
        label: 'Báo cáo Thu nhập CV',
        shortLabel: 'Thu nhập',
        href: '/dashboard/cv',
        icon: Wallet,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình Thăng tiến CV',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: Trophy,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: MessageSquare,
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
        icon: Smartphone,
        accent: true,
      },
      {
        key: 'today',
        menuKey: 'today',
        label: 'Khách hàng hôm nay',
        shortLabel: 'Hôm nay',
        href: '/dashboard/today',
        icon: CalendarCheck,
      },
      {
        key: 'cc-kpi',
        menuKey: 'cc',
        label: 'Báo cáo KPI & Thưởng CC',
        shortLabel: 'KPI CC',
        href: '/dashboard/cc',
        icon: BarChart3,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình Thăng tiến',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: Trophy,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: MessageSquare,
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
        icon: Wallet,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình Thăng tiến CV',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: Trophy,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: MessageSquare,
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
        icon: Smartphone,
        accent: true,
      },
      {
        key: 'today',
        menuKey: 'today',
        label: 'Khách hàng hôm nay',
        shortLabel: 'Hôm nay',
        href: '/dashboard/today',
        icon: CalendarCheck,
      },
      {
        key: 'cv-income',
        menuKey: 'cv',
        label: 'Báo cáo CV',
        shortLabel: 'Thu nhập CV',
        href: '/dashboard/cv',
        icon: Wallet,
      },
      {
        key: 'cc-kpi',
        menuKey: 'cc',
        label: 'Báo cáo KPI CC',
        shortLabel: 'KPI CC',
        href: '/dashboard/cc',
        icon: BarChart3,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình CV',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: Trophy,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: MessageSquare,
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
        icon: CalendarCheck,
      },
      {
        key: 'career-path',
        menuKey: 'career-path',
        label: 'Lộ trình Thăng tiến',
        shortLabel: 'Lộ trình',
        href: '/dashboard/career-path',
        icon: Trophy,
      },
      {
        key: 'chat',
        label: 'mOS Chat',
        shortLabel: 'Chat',
        href: '/chat',
        icon: MessageSquare,
        badgeCount: unreadChatCount,
      },
    ];
  }

  if (!isAdmin && hasVisibilityMap) {
    quickLinks = quickLinks.filter((item) => !item.menuKey || menuVisibility?.[item.menuKey] === true);
  }

  return quickLinks;
}
