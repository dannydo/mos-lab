'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, LayoutGrid, X } from 'lucide-react';
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
  EcosystemSuiteKey,
  EcosystemTone,
  isLabPathname,
  isMissionPathname,
  isReportPathname,
  isWingsGardenPathname,
} from '../../config/ecosystem-nav';
import { CvFeather1Badge, CvFeather2Badge } from '../../app/ios-app/components/ui-kit/CvFeatherLabels';

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

  const featherTier = normalizeCvFeatherRole(String(effectiveRole || ''));

  const isCoreAppActive = (key: EcosystemAppKey) => {
    if (key === 'general') {
      return (
        currentApp === 'general' &&
        !isReportPathname(pathname) &&
        !isMissionPathname(pathname) &&
        !isLabPathname(pathname) &&
        !isWingsGardenPathname(pathname)
      );
    }
    if (key === 'chat') return currentApp === 'chat' || pathname.startsWith('/chat');
    return currentApp === 'ios' || pathname.startsWith('/ios-app');
  };

  const isSuiteActive = (key: EcosystemSuiteKey) => {
    if (key === 'reports') return isReportPathname(pathname);
    if (key === 'mission') return isMissionPathname(pathname);
    if (key === 'lab') return isLabPathname(pathname);
    if (key === 'wings-garden') return isWingsGardenPathname(pathname);
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

      {open &&
        (() => {
          const overlayNode = (
            <>
              <div
                className="fixed inset-0 z-[2000] bg-black/55 backdrop-blur-[2px] md:hidden"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />

              <div
                ref={panelRef}
                role="dialog"
                aria-label="Hệ sinh thái mOS"
                data-testid="mos-app-launcher-panel"
                style={{
                  ...panelPos,
                  backgroundColor: isDark ? '#0e131f' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)',
                  color: isDark ? '#f8fafc' : '#0f172a',
                }}
                className="z-[2010] rounded-2xl border shadow-2xl p-3.5 select-none"
              >
                {/* Header identity + role/team badge (clickable to open Unified Profile Sheet) */}
                <div
                  className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b"
                  style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
                >
                  <button
                    type="button"
                    data-testid="mos-launcher-profile-btn"
                    onClick={() => {
                      setOpen(false);
                      if (onOpenProfile) {
                        onOpenProfile();
                      } else {
                        setInternalProfileOpen(true);
                      }
                    }}
                    title="Mở Hồ sơ & Giao diện cá nhân"
                    className={`flex items-center gap-2.5 min-w-0 flex-1 rounded-xl p-1 -m-1 text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400/70 bg-amber-400 text-black font-black text-xs flex items-center justify-center shrink-0">
                      {resolvedAvatar ? (
                        <img src={resolvedAvatar} alt={effectiveDisplayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{displayInitial}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold truncate flex items-center gap-1">
                        <span className="truncate">{effectiveDisplayName}</span>
                        <ChevronRight className="w-3 h-3 opacity-50 shrink-0" />
                      </div>
                      <div className="text-[10.5px] opacity-65 truncate">Hồ sơ & Cài đặt cá nhân</div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border leading-none ${
                        isDark
                          ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      {featherTier === 'CVLL' ? (
                        <CvFeather2Badge />
                      ) : featherTier === 'CVL' ? (
                        <CvFeather1Badge />
                      ) : navModel.isCcTeamMember && String(effectiveRole || '').toLowerCase() !== 'cc' ? (
                        `${String(effectiveRole || '').toUpperCase()} · Nhóm CC`
                      ) : (
                        String(effectiveRole || 'STAFF').toUpperCase()
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Đóng bộ chuyển phân hệ"
                      className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer md:hidden ${
                        isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 1: Core Apps */}
                <div className={`grid gap-2 ${navModel.suiteApps.length > 0 ? 'mb-3' : ''} ${coreColsClass}`}>
                  {navModel.coreApps.map((app) => {
                    const Icon = app.icon;
                    const active = isCoreAppActive(app.key);
                    return (
                      <button
                        key={app.key}
                        type="button"
                        data-launcher-app={app.key}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => navigateTo(app.href, app.key)}
                        style={{
                          borderColor: active ? '#ffb400' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
                          backgroundColor: active
                            ? isDark
                              ? 'rgba(255,180,0,0.14)'
                              : 'rgba(245,158,11,0.12)'
                            : isDark
                              ? 'rgba(255,255,255,0.03)'
                              : '#f8fafc',
                        }}
                        className="relative flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer text-center hover:border-amber-400/60"
                      >
                        {app.badgeCount && app.badgeCount > 0 ? (
                          <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold leading-none flex items-center justify-center tabular-nums">
                            {app.badgeCount > 99 ? '99+' : app.badgeCount}
                          </span>
                        ) : null}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${toneClass(app.tone)}`}>
                          <Icon className="w-4.5 h-4.5 stroke-[2.2]" />
                        </div>
                        <div className="text-[11.5px] font-extrabold leading-tight truncate max-w-full">
                          {app.label}
                        </div>
                        <div className="text-[10px] opacity-65 leading-none truncate max-w-full">{app.subtitle}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Row 2: Ecosystem Suites (mOS Reports · mOS Mission · mOS Bible · mOS Lab) */}
                {navModel.suiteApps.length > 0 && (
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-55 mb-1.5 px-0.5">
                      Phân hệ hệ sinh thái
                    </div>
                    <div className={`grid gap-2 ${suiteColsClass}`}>
                      {navModel.suiteApps.map((suite) => {
                        const Icon = suite.icon;
                        const isComingSoon = Boolean(suite.comingSoon);
                        const active = !isComingSoon && isSuiteActive(suite.key);
                        return (
                          <button
                            key={suite.key}
                            type="button"
                            disabled={isComingSoon}
                            aria-disabled={isComingSoon || undefined}
                            data-launcher-suite={suite.key}
                            data-coming-soon={isComingSoon ? 'true' : undefined}
                            aria-current={active ? 'page' : undefined}
                            title={isComingSoon ? `${suite.label} · Coming soon` : suite.label}
                            onClick={() => {
                              if (isComingSoon) return;
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
                            }}
                            style={{
                              borderColor: active
                                ? '#ffb400'
                                : isDark
                                  ? 'rgba(255,255,255,0.08)'
                                  : 'rgba(15,23,42,0.08)',
                              backgroundColor: active
                                ? isDark
                                  ? 'rgba(255,180,0,0.14)'
                                  : 'rgba(245,158,11,0.1)'
                                : isDark
                                  ? 'rgba(255,255,255,0.04)'
                                  : '#f1f5f9',
                            }}
                            className={`p-2.5 rounded-2xl border flex items-center gap-2.5 text-left transition-all ${
                              isComingSoon
                                ? 'cursor-not-allowed opacity-70'
                                : 'active:scale-95 cursor-pointer hover:border-amber-400/50'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${toneClass(suite.tone)}`}
                            >
                              <Icon className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11.5px] font-extrabold leading-tight truncate">{suite.label}</div>
                              {isComingSoon ? (
                                <span
                                  className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide mt-0.5 ${
                                    isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-200/90 text-slate-600'
                                  }`}
                                >
                                  Coming soon
                                </span>
                              ) : (
                                <div className="text-[9.5px] opacity-65 leading-tight truncate mt-0.5">
                                  {suite.subtitle}
                                </div>
                              )}
                            </div>
                            {suite.badgeCount && suite.badgeCount > 0 ? (
                              <span className="min-w-[17px] h-[17px] px-1.5 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold leading-none inline-flex items-center justify-center tabular-nums shrink-0">
                                {suite.badgeCount > 99 ? '99+' : suite.badgeCount}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          );
          return typeof document !== 'undefined' && document.body
            ? createPortal(overlayNode, document.body)
            : overlayNode;
        })()}
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
