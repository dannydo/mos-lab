'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { theme } from 'antd';
import { BarChart3, CalendarCheck, MessageSquare, Sparkles, Trophy, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { isAdminOrSuperAdminRole, isCvRole, normalizeCvFeatherRole } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { HeaderIconButton } from '../ui/HeaderIconButton';

export type QuickSwitchRoleGroup = 'CV_FEATHER' | 'CV_STANDARD' | 'CC' | 'ADMIN_MANAGER' | 'OTHER';

export function resolveQuickSwitchRoleGroup(role?: string | null): QuickSwitchRoleGroup {
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

  if (isCvRole(raw)) {
    return 'CV_STANDARD';
  }

  if (isAdminOrSuperAdminRole(raw) || ['manager', 'fm', 'cho', 'boss'].includes(lower)) {
    return 'ADMIN_MANAGER';
  }

  return 'OTHER';
}

export function canAccessConsultationApp(role?: string | null): boolean {
  const group = resolveQuickSwitchRoleGroup(role);
  return group === 'CV_FEATHER' || group === 'CC' || group === 'ADMIN_MANAGER';
}

export interface QuickSwitchItem {
  key: string;
  label: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  accent?: boolean;
  badgeCount?: number;
}

export interface HeaderRoleQuickSwitchProps {
  userRole?: string | null;
  unreadChatCount?: number;
  onOpenChat?: () => void;
  /**
   * - 'header-icon': renders the consultation HeaderIconButton + desktop quick-links inside dashboard-header
   * - 'sub-header': renders the sleek quick-switch link bar right below dashboard-header on mobile/tablet (or all tiers for CV🪶/CC)
   * - 'standalone-bar': renders the dark top quick-switch bar on /ios-app and /chat
   */
  variant?: 'header-icon' | 'sub-header' | 'standalone-bar';
}

export const HeaderRoleQuickSwitch: React.FC<HeaderRoleQuickSwitchProps> = ({
  userRole,
  unreadChatCount = 0,
  onOpenChat,
  variant = 'header-icon',
}) => {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const responsiveTier = useResponsiveTier();
  const isMobileTier = responsiveTier === 'mobile';

  const roleGroup = resolveQuickSwitchRoleGroup(userRole);
  const featherTier = normalizeCvFeatherRole(String(userRole || ''));
  const consultRoleParam = roleGroup === 'CC' ? 'CC' : featherTier === 'CVLL' ? 'CVLL' : 'CVL';
  const showConsultIcon = canAccessConsultationApp(userRole);

  const items: QuickSwitchItem[] = React.useMemo(() => {
    if (roleGroup === 'CV_FEATHER') {
      return [
        {
          key: 'consult',
          label: 'Tư vấn & Checkout KH',
          shortLabel: 'Tư vấn KH',
          href: `/ios-app?role=${consultRoleParam}`,
          icon: Sparkles,
          accent: true,
        },
        {
          key: 'cv-income',
          label: 'Báo cáo Thu nhập CV',
          shortLabel: 'Thu nhập',
          href: '/dashboard/cv',
          icon: Wallet,
        },
        {
          key: 'career-path',
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
    }

    if (roleGroup === 'CC') {
      return [
        {
          key: 'consult',
          label: 'Tư vấn & Checkout KH',
          shortLabel: 'Tư vấn KH',
          href: '/ios-app?role=CC',
          icon: Sparkles,
          accent: true,
        },
        {
          key: 'today',
          label: 'Khách hàng hôm nay',
          shortLabel: 'Hôm nay',
          href: '/dashboard/today',
          icon: CalendarCheck,
        },
        {
          key: 'cc-kpi',
          label: 'Báo cáo KPI & Thưởng CC',
          shortLabel: 'KPI CC',
          href: '/dashboard/cc',
          icon: BarChart3,
        },
        {
          key: 'career-path',
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

    if (roleGroup === 'CV_STANDARD') {
      return [
        {
          key: 'cv-income',
          label: 'Báo cáo Thu nhập CV',
          shortLabel: 'Thu nhập',
          href: '/dashboard/cv',
          icon: Wallet,
        },
        {
          key: 'career-path',
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
    }

    if (roleGroup === 'ADMIN_MANAGER') {
      return [
        {
          key: 'consult',
          label: 'Tư vấn & Checkout KH',
          shortLabel: 'Tư vấn KH',
          href: '/ios-app',
          icon: Sparkles,
          accent: true,
        },
        {
          key: 'cv-income',
          label: 'Báo cáo CV',
          shortLabel: 'Thu nhập CV',
          href: '/dashboard/cv',
          icon: Wallet,
        },
        {
          key: 'career-path',
          label: 'Lộ trình CV',
          shortLabel: 'Lộ trình',
          href: '/dashboard/career-path',
          icon: Trophy,
        },
        {
          key: 'cc-kpi',
          label: 'Báo cáo KPI CC',
          shortLabel: 'KPI CC',
          href: '/dashboard/cc',
          icon: BarChart3,
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

    return [];
  }, [roleGroup, consultRoleParam, unreadChatCount]);

  const isItemActive = (item: QuickSwitchItem) => {
    const baseHref = item.href.split('?')[0];
    if (baseHref === '/ios-app') return pathname.startsWith('/ios-app');
    if (baseHref === '/chat') return pathname.startsWith('/chat') || pathname.startsWith('/dashboard/chat');
    return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
  };

  const handleNavigate = (item: QuickSwitchItem) => {
    if (item.key === 'chat' && onOpenChat) {
      onOpenChat();
      return;
    }
    router.push(item.href);
  };

  // 1. 'header-icon': Dedicated Consultation Icon on the top Header bar for CV🪶, 🪶CV🪶, CC, and Admin/Manager
  // Plus inline quick-switch pills on Desktop for CV🪶 / CC / CV
  if (variant === 'header-icon') {
    const isDark = themeMode === 'dark';
    const desktopItems = items.filter((item) => item.key !== 'chat');

    return (
      <div className="inline-flex items-center gap-1.5" data-testid="header-role-quick-switch">
        {showConsultIcon && (
          <HeaderIconButton
            action="customer-consultation"
            label="Vào Tư vấn & Checkout khách hàng (CV🪶 / CC)"
            desktopLabel={roleGroup === 'ADMIN_MANAGER' && !isMobileTier ? 'Tư vấn KH' : undefined}
            icon={Sparkles}
            tone="accent"
            showTooltip={!isMobileTier}
            onClick={() => router.push(`/ios-app?role=${consultRoleParam}`)}
          />
        )}

        {!isMobileTier &&
          (roleGroup === 'CV_FEATHER' || roleGroup === 'CC' || roleGroup === 'CV_STANDARD') &&
          desktopItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <button
                key={item.key}
                type="button"
                data-header-quick-link={item.key}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                onClick={() => handleNavigate(item)}
                style={{
                  background: active
                    ? token.colorPrimary
                    : item.accent
                      ? token.colorPrimaryBg
                      : isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.04)',
                  color: active
                    ? '#000000'
                    : item.accent
                      ? token.colorPrimary
                      : isDark
                        ? 'rgba(255,255,255,0.85)'
                        : 'rgba(0,0,0,0.8)',
                  borderColor: active
                    ? token.colorPrimary
                    : item.accent
                      ? token.colorPrimaryBorder
                      : isDark
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,0,0,0.1)',
                }}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold leading-none transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Icon size={14} className="flex-shrink-0" />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
      </div>
    );
  }

  // 2. 'sub-header': Sleek mobile quick-switch bar right below the main Header for CV🪶, 🪶CV🪶, CC, and CV
  if (variant === 'sub-header') {
    if (!isMobileTier || (roleGroup !== 'CV_FEATHER' && roleGroup !== 'CC' && roleGroup !== 'CV_STANDARD')) {
      return null;
    }
    const isDark = themeMode === 'dark';

    return (
      <nav
        aria-label="Menu chuyển nhanh trên Header"
        data-testid="header-role-quick-switch-subheader"
        style={{
          backgroundColor: isDark ? '#0b0f19' : '#f8fafc',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
        className="w-full px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0 select-none"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          return (
            <button
              key={item.key}
              type="button"
              data-header-quick-link={item.key}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => handleNavigate(item)}
              style={{
                background: active
                  ? token.colorPrimary
                  : item.accent
                    ? token.colorPrimaryBg
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#ffffff',
                color: active
                  ? '#000000'
                  : item.accent
                    ? token.colorPrimary
                    : isDark
                      ? 'rgba(255,255,255,0.88)'
                      : '#1e293b',
                borderColor: active
                  ? token.colorPrimary
                  : item.accent
                    ? token.colorPrimaryBorder
                    : isDark
                      ? 'rgba(255,255,255,0.12)'
                      : '#e2e8f0',
              }}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold leading-none transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Icon size={13} className="flex-shrink-0" />
              <span>{item.shortLabel}</span>
              {item.badgeCount && item.badgeCount > 0 ? (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold leading-none tabular-nums">
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    );
  }

  // 3. 'standalone-bar': Compact top bar on /ios-app and /chat
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Chuyển nhanh tính năng"
      data-testid="header-role-quick-switch-bar"
      className="w-full bg-[#090d16] border-b border-white/10 px-2.5 py-1.5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar flex-shrink-0 select-none"
    >
      <div className="flex items-center gap-1 min-w-max mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          return (
            <button
              key={item.key}
              type="button"
              data-header-quick-link={item.key}
              onClick={() => handleNavigate(item)}
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold leading-none transition-all active:scale-95 relative ${
                active
                  ? 'bg-[#FFB400] text-black shadow-sm'
                  : item.accent
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{item.shortLabel}</span>
              {item.badgeCount && item.badgeCount > 0 ? (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold leading-none tabular-nums">
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default HeaderRoleQuickSwitch;
