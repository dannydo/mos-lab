'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { isAdminOrSuperAdminRole, isCvRole, normalizeCvFeatherRole } from '@mos-lab/shared';
import { apiClient, resolveMediaUrl } from '../../lib/api-client';
import {
  getBugReportBadgeServerSnapshot,
  getBugReportBadgeSummary,
  openBugReport,
  subscribeBugReportBadgeSummary,
} from '../../lib/bug-diagnostics';
import { openMosBible } from '../../lib/mos-bible-launcher';
import { useTheme } from '../../context/ThemeContext';
import {
  buildEcosystemNavModel,
  EcosystemAppKey,
  EcosystemSuiteItem,
  EcosystemSuiteKey,
  EcosystemTone,
  isInventoryPathname,
  isLabPathname,
  isMissionPathname,
  isReportPathname,
  isWingsGardenPathname,
} from '../../config/ecosystem-nav';
import { MosAppLauncherPanel } from './MosAppLauncherPanel';

const UnifiedProfileSheet = dynamic(() => import('../profile/UnifiedProfileSheet'), { ssr: false });

export interface MosAppLauncherProps {
  currentApp: EcosystemAppKey;
  userRole?: string | null;
  teamCodes?: readonly string[] | null;
  displayName?: string | null;
  unreadChatCount?: number;
  missionBadgeCount?: number;
  menuVisibility?: Record<string, boolean> | null;
  onOpenChat?: () => void;
  onAfterNavigate?: () => void;
  onOpenProfile?: () => void;
  /** Compact circular style (used in /chat and /ios-app headers) vs dashboard header button */
  shape?: 'circle' | 'rounded';
  className?: string;
}

function readStoredUserSnapshot(): {
  role?: string;
  teamCodes?: string[];
  displayName?: string;
  avatarUrl?: string | null;
  avatar?: string | null;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('mos_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export const MosAppLauncher: React.FC<MosAppLauncherProps> = ({
  currentApp,
  userRole,
  teamCodes,
  displayName,
  unreadChatCount = 0,
  missionBadgeCount,
  menuVisibility: menuVisibilityProp,
  onOpenChat,
  onAfterNavigate,
  onOpenProfile,
  shape = 'rounded',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [internalProfileOpen, setInternalProfileOpen] = useState(false);
  const [fetchedVisibility, setFetchedVisibility] = useState<Record<string, boolean> | null>(null);
  const [panelPos, setPanelPos] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

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

  const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
  const stored = useMemo(() => readStoredUserSnapshot(), [userRole, teamCodes]);
  const effectiveRole = userRole ?? stored?.role ?? '';
  const effectiveTeamCodes = teamCodes ?? stored?.teamCodes ?? undefined;
  const effectiveDisplayName = displayName ?? stored?.displayName ?? 'Nhân sự Wings';
  const rawAvatar = stored?.avatarUrl || stored?.avatar;
  const resolvedAvatar = rawAvatar
    ? typeof resolveMediaUrl === 'function'
      ? resolveMediaUrl(
          String(rawAvatar).replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com')
        )
      : String(rawAvatar)
    : undefined;
  const displayInitial = (effectiveDisplayName || 'W').trim().charAt(0).toUpperCase();

  const bugBadge = React.useSyncExternalStore(
    subscribeBugReportBadgeSummary,
    getBugReportBadgeSummary,
    getBugReportBadgeServerSnapshot
  );
  const isCv = isCvRole(effectiveRole);
  const bugAttentionCount = !isCv ? bugBadge.actionRequiredCount || bugBadge.unreadCount : 0;
  const effectiveMissionBadge = missionBadgeCount ?? bugAttentionCount;
  const relevantChatCount = currentApp !== 'chat' ? unreadChatCount : 0;
  const totalOutsideBadgeCount = relevantChatCount + bugAttentionCount;

  useEffect(() => {
    if (menuVisibilityProp || isAdminOrSuperAdminRole(effectiveRole) || typeof window === 'undefined') return;
    if (!window.localStorage.getItem('mos_token')) return;
    if (typeof apiClient?.menuAccess?.getSidebarVisibility !== 'function') return;
    let cancelled = false;
    void Promise.resolve(apiClient.menuAccess.getSidebarVisibility())
      .then((res) => {
        if (!cancelled && res?.data?.visibility) {
          setFetchedVisibility(res.data.visibility);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [menuVisibilityProp, effectiveRole]);

  const effectiveMenuVisibility = menuVisibilityProp ?? fetchedVisibility;
  const savedAdminRole = typeof window !== 'undefined' ? window.localStorage.getItem('mos_ios_selected_role') : null;

  const navModel = useMemo(
    () =>
      buildEcosystemNavModel({
        userRole: effectiveRole,
        teamCodes: effectiveTeamCodes,
        unreadChatCount,
        missionBadgeCount: effectiveMissionBadge,
        bugAttentionCount,
        savedAdminRole,
        menuVisibility: effectiveMenuVisibility,
      }),
    [
      effectiveRole,
      effectiveTeamCodes,
      unreadChatCount,
      effectiveMissionBadge,
      bugAttentionCount,
      savedAdminRole,
      effectiveMenuVisibility,
    ]
  );

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (typeof window === 'undefined') return;
      const rect = buttonRef.current?.getBoundingClientRect();
      const top = rect && rect.bottom > 0 ? Math.round(rect.bottom + 8) : 56;
      if (window.innerWidth < 768) {
        setPanelPos({
          position: 'fixed',
          top,
          left: 12,
          right: 12,
        });
      } else {
        const rawLeft = rect ? rect.left : 16;
        const left = Math.max(12, Math.min(Math.round(rawLeft), window.innerWidth - 380));
        setPanelPos({
          position: 'fixed',
          top,
          left,
          width: 368,
        });
      }
    };
    updatePosition();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [open]);

  const navigateTo = (href: string, key?: string) => {
    setOpen(false);
    if (key !== 'chat' && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('mos_chat_is_open_v1', 'false');
      } catch {}
      window.dispatchEvent(new CustomEvent('mos-chat:close'));
    }
    onAfterNavigate?.();
    if (key === 'chat' && onOpenChat) {
      onOpenChat();
      return;
    }
    if (router) {
      router.push(href);
    } else if (typeof window !== 'undefined') {
      window.location.assign(href);
    }
  };

  const handleSuiteClick = (suite: EcosystemSuiteItem) => {
    if (suite.action === 'open-bible') {
      setOpen(false);
      onAfterNavigate?.();
      openMosBible();
      return;
    }
    if (suite.action === 'open-feedback') {
      setOpen(false);
      onAfterNavigate?.();
      openBugReport(undefined, { preferHistoryIfPending: true });
      return;
    }
    navigateTo(suite.href, suite.key);
  };

  const featherTier = normalizeCvFeatherRole(String(effectiveRole || ''));

  const isCoreAppActive = (key: EcosystemAppKey) => {
    if (key === 'general') {
      return (
        currentApp === 'general' &&
        !isReportPathname(pathname) &&
        !isMissionPathname(pathname) &&
        !isLabPathname(pathname) &&
        !isWingsGardenPathname(pathname) &&
        !isInventoryPathname(pathname, currentSearch)
      );
    }
    if (key === 'chat') return currentApp === 'chat' || pathname.startsWith('/chat');
    return (currentApp === 'ios' || pathname.startsWith('/ios-app')) && !isInventoryPathname(pathname, currentSearch);
  };

  const isSuiteActive = (key: EcosystemSuiteKey) => {
    if (key === 'reports') return isReportPathname(pathname);
    if (key === 'mission') return isMissionPathname(pathname);
    if (key === 'lab') return isLabPathname(pathname);
    if (key === 'wings-garden') return isWingsGardenPathname(pathname);
    if (key === 'inventory') return isInventoryPathname(pathname, currentSearch);
    return false;
  };

  const toneClass = (tone: EcosystemTone) => {
    if (tone === 'sky') {
      return isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600';
    }
    if (tone === 'emerald') {
      return isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600';
    }
    if (tone === 'violet') {
      return isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600';
    }
    if (tone === 'rose') {
      return isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600';
    }
    if (tone === 'cyan') {
      return isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-50 text-cyan-600';
    }
    return isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600';
  };

  const shapeClass = shape === 'circle' ? 'w-8 h-8 rounded-full' : 'w-8 h-8 rounded-xl';
  const coreColsClass =
    navModel.coreApps.length >= 3 ? 'grid-cols-3' : navModel.coreApps.length === 2 ? 'grid-cols-2' : 'grid-cols-1';
  const suiteColsClass = navModel.suiteApps.length <= 1 ? 'grid-cols-1' : 'grid-cols-2';

  const overlayNode = open ? (
    <MosAppLauncherPanel
      panelRef={panelRef}
      panelPos={panelPos}
      isDark={isDark}
      resolvedAvatar={resolvedAvatar}
      effectiveDisplayName={effectiveDisplayName}
      displayInitial={displayInitial}
      featherTier={featherTier}
      effectiveRole={effectiveRole}
      isCcTeamMember={navModel.isCcTeamMember}
      coreApps={navModel.coreApps}
      suiteApps={navModel.suiteApps}
      footerActions={navModel.footerActions}
      coreColsClass={coreColsClass}
      suiteColsClass={suiteColsClass}
      isCoreAppActive={isCoreAppActive}
      isSuiteActive={isSuiteActive}
      toneClass={toneClass}
      onClose={() => setOpen(false)}
      onOpenProfileClick={() => {
        setOpen(false);
        if (onOpenProfile) {
          onOpenProfile();
        } else {
          setInternalProfileOpen(true);
        }
      }}
      onNavigate={navigateTo}
      onSuiteClick={handleSuiteClick}
    />
  ) : null;

  return (
    <div ref={rootRef} className={`relative inline-flex items-center shrink-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        data-testid="mos-app-launcher-btn"
        aria-label="Mở bộ chuyển nhanh Hệ sinh thái mOS"
        aria-expanded={open}
        title={
          totalOutsideBadgeCount > 0
            ? `Chuyển nhanh Hệ sinh thái mOS (${totalOutsideBadgeCount} thông báo mới)`
            : 'Chuyển nhanh Hệ sinh thái mOS'
        }
        onClick={() => setOpen((prev) => !prev)}
        className={`${shapeClass} relative border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
          open
            ? 'bg-amber-400 border-amber-400 text-black shadow-sm'
            : isDark
              ? 'bg-amber-500/12 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
        }`}
      >
        <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
        {totalOutsideBadgeCount > 0 && !open && (
          <span
            className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold leading-none flex items-center justify-center border border-[var(--mos-surface,#0e131f)] tabular-nums"
            aria-hidden="true"
          >
            {totalOutsideBadgeCount > 99 ? '99+' : totalOutsideBadgeCount}
          </span>
        )}
      </button>

      {overlayNode && typeof document !== 'undefined' && document.body
        ? createPortal(overlayNode, document.body)
        : overlayNode}

      {!onOpenProfile && internalProfileOpen && (
        <UnifiedProfileSheet
          open={internalProfileOpen}
          onClose={() => setInternalProfileOpen(false)}
          appContext={currentApp}
        />
      )}
    </div>
  );
};

export default MosAppLauncher;
