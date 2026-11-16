'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { theme } from 'antd';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { HeaderIconButton } from '../ui/HeaderIconButton';
import {
  buildEcosystemNavModel,
  ECOSYSTEM_ICONS,
  resolveQuickSwitchRoleGroup,
  type QuickSwitchRoleGroup,
} from '../../config/ecosystem-nav';
import { canAccessIosConsultationApp } from '@mos-lab/shared';

export type { QuickSwitchRoleGroup };
export { resolveQuickSwitchRoleGroup };

export function canAccessConsultationApp(role?: string | null, teamCodes?: readonly string[] | null): boolean {
  return canAccessIosConsultationApp(role, teamCodes);
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
  teamCodes?: readonly string[] | null;
  unreadChatCount?: number;
  menuVisibility?: Record<string, boolean> | null;
  onOpenChat?: () => void;
  onNavigate?: () => void;
  /**
   * - 'header-icon': renders the consultation HeaderIconButton + desktop quick-links inside dashboard-header
   * - 'sub-header': renders the sleek quick-switch link bar right below dashboard-header on mobile/tablet (or all tiers for CV🪶/CC)
   * - 'standalone-bar': renders the dark top quick-switch bar on /ios-app and /chat
   * - 'menu-list': renders compact grouped quick-switch pills inside a mobile overflow menu
   */
  variant?: 'header-icon' | 'sub-header' | 'standalone-bar' | 'menu-list';
}

export const HeaderRoleQuickSwitch: React.FC<HeaderRoleQuickSwitchProps> = ({
  userRole,
  teamCodes,
  unreadChatCount = 0,
  menuVisibility,
  onOpenChat,
  onNavigate,
  variant = 'header-icon',
}) => {
  let pathname = '';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    pathname = usePathname() || '';
  } catch {
    pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  }
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }
  const navigateTo = (href: string) => {
    if (router) {
      router.push(href);
    } else if (typeof window !== 'undefined') {
      window.location.assign(href);
    }
  };
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const responsiveTier = useResponsiveTier();
  const isMobileTier = responsiveTier === 'mobile';

  const savedAdminRole =
    typeof window !== 'undefined' ? (window.localStorage.getItem('mos_ios_selected_role') as string | null) : null;

  const navModel = React.useMemo(
    () =>
      buildEcosystemNavModel({
        userRole,
        teamCodes,
        unreadChatCount,
        savedAdminRole,
        menuVisibility,
      }),
    [userRole, teamCodes, unreadChatCount, savedAdminRole, menuVisibility]
  );

  const { roleGroup, canAccessIos: showConsultIcon, consultRoleParam, quickLinks: items } = navModel;

  const isItemActive = (item: QuickSwitchItem) => {
    const baseHref = item.href.split('?')[0];
    if (baseHref === '/ios-app') return pathname.startsWith('/ios-app');
    if (baseHref === '/chat') return pathname.startsWith('/chat') || pathname.startsWith('/dashboard/chat');
    return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
  };

  const handleNavigate = (item: QuickSwitchItem) => {
    onNavigate?.();
    if (item.key === 'chat' && onOpenChat) {
      onOpenChat();
      return;
    }
    navigateTo(item.href);
  };

  // 1. 'header-icon': Dedicated Consultation Icon on the top Header bar for CV🪶, 🪶CV🪶, CC, and Admin/Manager
  // Plus inline quick-switch pills on Desktop for CV🪶 / CC / CV
  if (variant === 'header-icon') {
    const isDark = themeMode === 'dark';
    const desktopItems = items.filter((item) => item.key !== 'chat' && item.key !== 'consult');

    return (
      <div className="inline-flex items-center gap-1.5" data-testid="header-role-quick-switch">
        {showConsultIcon && (
          <HeaderIconButton
            action="customer-consultation"
            label="Vào Tư vấn & Checkout khách hàng"
            desktopLabel={roleGroup === 'ADMIN_MANAGER' && !isMobileTier ? 'Tư vấn KH' : undefined}
            icon={ECOSYSTEM_ICONS.ios}
            tone="accent"
            showTooltip={!isMobileTier}
            onClick={() => navigateTo(`/ios-app?role=${consultRoleParam}`)}
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

  // 2. 'sub-header': Sleek mobile quick-switch bar right below the main Header for all staff roles
  if (variant === 'sub-header') {
    if (!isMobileTier || items.length === 0) {
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

  // 3. 'menu-list': Compact grouped quick-switch section inside mobile overflow menus
  if (variant === 'menu-list') {
    const menuItems = items.filter((item) => item.key !== 'chat');
    if (menuItems.length === 0) return null;
    const isDark = themeMode === 'dark';

    return (
      <nav
        aria-label="Chuyển nhanh phân hệ"
        data-testid="header-role-quick-switch-menu"
        className="pt-2 mt-1.5 border-t border-[var(--mos-surface-border)]"
      >
        <div className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--mos-text-muted)]">
          Chuyển nhanh phân hệ
        </div>
        <div className="grid grid-cols-2 gap-1.5 px-1 pt-1.5 pb-0.5">
          {menuItems.map((item) => {
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold leading-none transition-colors active:scale-95 cursor-pointer ${
                  active
                    ? 'bg-[var(--mos-accent)] border-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold'
                    : item.accent
                      ? isDark
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                        : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                      : 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] text-[var(--mos-text)] hover:opacity-85'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // 4. 'standalone-bar': Compact top bar on /ios-app and /chat
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
