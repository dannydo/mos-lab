'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import {
  BarChart3,
  Building2,
  CalendarPlus,
  Camera,
  ChevronDown,
  ChevronRight,
  Columns3,
  FlaskConical,
  Lock,
  LogOut,
  MessageSquareWarning,
  Phone,
  Shield,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import {
  hasCcTeamMembership,
  isAdminOrSuperAdminRole,
  isCvRole,
  normalizeCvFeatherRole,
  type IosSimulationMenteeOption,
  type SafeAny,
} from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { MobileThemeSelectorBlock } from '../theme/MobileThemeSheet';
import { IosFontSizeControl } from '../../app/ios-app/components/ui-kit/IosFontSizeControl';
import { CvFeather1Badge, CvFeather2Badge } from '../../app/ios-app/components/ui-kit/CvFeatherLabels';
import { resolveMediaUrl } from '../../lib/api-client';
import { getBugReportBadgeSummary, openBugReport, subscribeBugReportBadgeSummary } from '../../lib/bug-diagnostics';
import { ProfileOmiCallSection } from './ProfileOmiCallSection';
import type { ActiveActorProfile, IosBranchConfig, IosUserRole } from '../../app/ios-app/state/useIosAppState';

const AvatarCropModal = dynamic(() => import('../avatar/AvatarCropModal'), { ssr: false });

export type UnifiedProfileAppContext = 'general' | 'chat' | 'ios';

export interface UnifiedProfileSheetProps {
  open: boolean;
  onClose: () => void;
  appContext: UnifiedProfileAppContext;
  user?: SafeAny;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
  onLogout?: () => Promise<void> | void;
  isImpersonating?: boolean;
  onExitImpersonation?: () => Promise<void> | void;
  // General (Dashboard) context
  desktopDensity?: 'compact' | 'standard' | 'comfortable';
  setDesktopDensity?: (density: 'compact' | 'standard' | 'comfortable') => void;
  dailyCallsCount?: number;
  onOpenDailyCalls?: () => void;
  onOpenTelesalesDashboard?: () => void;
  // iOS-App context
  actor?: ActiveActorProfile;
  iosRole?: IosUserRole;
  canSwitchRole?: boolean;
  onRoleChange?: (role: IosUserRole) => void;
  onOpenPaystub?: () => void;
  currentBranch?: IosBranchConfig;
  selectedStoreId?: number;
  onSelectBranch?: (storeId: number) => void;
  availableBranches?: IosBranchConfig[];
  isAdmin?: boolean;
  isSimulationMode?: boolean;
  onToggleSimulationMode?: () => void;
  menteesList?: IosSimulationMenteeOption[];
  selectedMenteeStaffId?: number;
  onSelectMentee?: (staffId: number | undefined) => void;
  onOpenCreateBooking?: () => void;
}

function readStoredUser(): SafeAny {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('mos_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const UnifiedProfileSheet: React.FC<UnifiedProfileSheetProps> = ({
  open,
  onClose,
  appContext,
  user: userProp,
  onAvatarUpdated,
  onLogout,
  isImpersonating = false,
  onExitImpersonation,
  desktopDensity = 'standard',
  setDesktopDensity,
  dailyCallsCount = 0,
  onOpenDailyCalls,
  onOpenTelesalesDashboard,
  actor,
  iosRole,
  canSwitchRole = false,
  onRoleChange,
  onOpenPaystub,
  currentBranch,
  selectedStoreId = 6,
  onSelectBranch,
  availableBranches = [],
  isAdmin: isAdminProp,
  isSimulationMode = false,
  onToggleSimulationMode,
  menteesList = [],
  selectedMenteeStaffId,
  onSelectMentee,
  onOpenCreateBooking,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
  const [localAvatarOverride, setLocalAvatarOverride] = useState<string | null>(null);

  const storedUser = React.useMemo(() => readStoredUser(), [open]);
  const effectiveUser = userProp || storedUser;
  const effectiveRoleStr = String(effectiveUser?.role || '').trim();
  const teamCodes: string[] | undefined = Array.isArray(effectiveUser?.teamCodes) ? effectiveUser.teamCodes : undefined;

  const isAdmin = isAdminProp ?? isAdminOrSuperAdminRole(effectiveRoleStr);
  const isCv = isCvRole(effectiveRoleStr);
  const isCcTeamMember = hasCcTeamMembership(teamCodes);
  const featherTier = normalizeCvFeatherRole(effectiveRoleStr);

  const effectiveIosRole: IosUserRole | undefined =
    iosRole ?? (isCcTeamMember ? 'CC' : featherTier === 'CVLL' ? 'CVLL' : featherTier === 'CVL' ? 'CVL' : undefined);
  const isCvl = appContext === 'ios' ? effectiveIosRole === 'CVL' : featherTier === 'CVL';
  const isCvll = appContext === 'ios' ? effectiveIosRole === 'CVLL' : featherTier === 'CVLL';

  const displayName = actor?.name || effectiveUser?.displayName || effectiveUser?.username || 'Nhân sự Wings';
  const displayInitial = (displayName || 'W').trim().charAt(0).toUpperCase();

  const rawAvatar = localAvatarOverride || actor?.avatar || effectiveUser?.avatarUrl || effectiveUser?.avatar;
  const resolvedAvatar = rawAvatar
    ? typeof resolveMediaUrl === 'function'
      ? resolveMediaUrl(
          String(rawAvatar).replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com')
        )
      : String(rawAvatar)
    : undefined;

  useEffect(() => {
    setAvatarLoadError(false);
  }, [resolvedAvatar]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const bugBadge = React.useSyncExternalStore(subscribeBugReportBadgeSummary, getBugReportBadgeSummary, () => ({
    actionRequiredCount: 0,
    unreadCount: 0,
  }));
  const bugAttentionCount = !isCv ? bugBadge.actionRequiredCount || bugBadge.unreadCount : 0;

  const fontStaffId = Number(actor?.staffId || effectiveUser?.legacyStaffId || effectiveUser?.id || 0) || undefined;
  const branchText = currentBranch?.name || effectiveUser?.branchName || 'Chi nhánh Đề Thám';

  const scopeText = React.useMemo(() => {
    if (appContext === 'ios') {
      if (effectiveIosRole === 'CVL') return '1 khách đầu tua + khách book đích danh';
      if (effectiveIosRole === 'CVLL') return 'Khách của mình & hỗ trợ toàn chi nhánh';
      if (effectiveIosRole === 'CC') return 'Toàn bộ khách hàng tại chi nhánh';
      return 'Toàn bộ dữ liệu vận hành chi nhánh';
    }
    if (isAdmin) return 'Toàn quyền quản trị hệ thống mOS';
    if (isCcTeamMember && effectiveRoleStr.toLowerCase() !== 'cc') {
      return 'Quản lý vận hành & Tư vấn chi nhánh (CC)';
    }
    if (featherTier === 'CVL' || featherTier === 'CVLL' || isCv) {
      return 'Thu nhập cá nhân & Lộ trình thăng tiến';
    }
    if (effectiveRoleStr.toLowerCase() === 'cc') {
      return 'Toàn bộ khách hàng tại chi nhánh';
    }
    return 'Vận hành & Theo dõi KPI theo phân quyền';
  }, [appContext, effectiveIosRole, isAdmin, isCcTeamMember, effectiveRoleStr, featherTier, isCv]);

  const handleLogout = async () => {
    onClose();
    if (onLogout) {
      await onLogout();
      return;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mos_token');
      window.localStorage.removeItem('mos_user');
      window.localStorage.removeItem('mos_omicall_auto_init');
      window.localStorage.removeItem('mos_original_token');
      window.localStorage.removeItem('mos_original_user');
      window.localStorage.removeItem('mos_original_omicall_auto_init');
      window.localStorage.removeItem('mos_impersonation_audit_id');
      window.location.replace('/login');
    }
  };

  const renderRoleBadge = () => {
    if (appContext === 'ios') {
      if (isCvll) return <CvFeather2Badge />;
      if (isCvl) {
        return (
          <span className="inline-flex items-center gap-1">
            <CvFeather1Badge /> Tự Chủ
          </span>
        );
      }
      return <span>{effectiveIosRole || 'CC'}</span>;
    }
    if (isCvll) return <CvFeather2Badge />;
    if (isCvl) return <CvFeather1Badge />;
    if (isCcTeamMember && effectiveRoleStr.toLowerCase() !== 'cc') {
      return <span>{effectiveRoleStr.toUpperCase()} · Nhóm CC</span>;
    }
    return <span>{(effectiveRoleStr || 'STAFF').toUpperCase()}</span>;
  };

  const sheetNode = open ? (
    <div
      data-testid="unified-profile-sheet"
      className="fixed inset-0 z-[2050] flex items-end md:items-center justify-center px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] md:p-4 select-none"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hồ sơ & Cài đặt cá nhân"
        className="w-full max-w-[420px] z-10 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom duration-200"
      >
        <div
          className="backdrop-blur-2xl rounded-3xl p-4 border space-y-3 shadow-2xl transition-colors max-h-[88vh] overflow-y-auto no-scrollbar"
          style={{
            backgroundColor: 'var(--mos-surface, #0e131f)',
            borderColor: 'var(--mos-surface-border, rgba(255,255,255,0.12))',
            color: 'var(--mos-text, #f8fafc)',
          }}
        >
          {/* 1. Header Staff Identity (Hình 1) */}
          <div
            className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-neutral-800' : 'border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsAvatarCropOpen(true)}
                title="Bấm để đổi ảnh đại diện (AI Coach)"
                aria-label="Đổi ảnh đại diện từ ảnh hồ sơ"
                className="relative w-12 h-12 rounded-full overflow-visible shrink-0 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-amber-400 text-black font-black text-lg flex items-center justify-center shadow-md">
                  {resolvedAvatar && !avatarLoadError ? (
                    <img
                      src={resolvedAvatar}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <span>{displayInitial}</span>
                  )}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border shadow-xs ${
                    isDark
                      ? 'bg-neutral-900 border-amber-400/60 text-amber-400'
                      : 'bg-white border-amber-400 text-amber-600'
                  }`}
                >
                  <Camera className="w-2.5 h-2.5" />
                </span>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`font-extrabold text-[15px] tracking-tight truncate ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {displayName}
                  </span>
                  <span className="bg-amber-400/20 text-amber-500 border border-amber-400/30 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center leading-none">
                    {renderRoleBadge()}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
                  <span>📍 {branchText}</span>
                  <span>·</span>
                  <span className="text-emerald-500 font-semibold">Đang hoạt động</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng menu hồ sơ"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Impersonation Banner */}
          {isImpersonating && (
            <div className="rounded-2xl px-3 py-2 bg-amber-500/15 border border-amber-500/35 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-amber-400">Đang giả lập tài khoản</span>
              <button
                type="button"
                onClick={async () => {
                  onClose();
                  await onExitImpersonation?.();
                }}
                className="font-extrabold text-rose-400 hover:underline cursor-pointer"
              >
                Thoát giả lập
              </button>
            </div>
          )}

          {/* 2. Operational Scope Bar */}
          <div
            className={`border rounded-2xl p-2.5 flex items-center gap-2 text-xs ${
              isDark
                ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
                : 'bg-amber-50/90 border-amber-200 text-amber-900'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="min-w-0 text-[11.5px] leading-tight">
              <span className={isDark ? 'text-neutral-300 font-medium' : 'text-amber-800 font-medium'}>
                {isCvl && appContext === 'ios' ? 'Phạm vi bảo mật: ' : 'Phạm vi vận hành: '}
              </span>
              <span className={isDark ? 'text-amber-400 font-bold' : 'text-amber-900 font-bold'}>{scopeText}</span>
            </div>
          </div>

          {/* 3. Giao diện & Tông màu (3 Modes + Font Scale + 7 Color Themes) */}
          <MobileThemeSelectorBlock
            compact
            fontControl={<IosFontSizeControl isDark={isDark} staffId={fontStaffId} />}
          />

          {/* 4A. Contextual Section: mOS General (OmiCall + Density) */}
          {appContext === 'general' && (
            <>
              <ProfileOmiCallSection isDark={isDark} />

              {setDesktopDensity && (
                <div
                  className="p-3 rounded-2xl border space-y-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--mos-surface-raised, var(--mos-surface))',
                    borderColor: 'var(--mos-surface-border)',
                  }}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-0.5 text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Columns3 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Mật độ hiển thị</span>
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-3 gap-1 p-1 rounded-xl border"
                    style={{
                      backgroundColor: 'var(--mos-surface-muted)',
                      borderColor: 'var(--mos-surface-border)',
                    }}
                  >
                    {(
                      [
                        { id: 'compact', label: 'Compact' },
                        { id: 'standard', label: 'Standard' },
                        { id: 'comfortable', label: 'Thoải mái' },
                      ] as const
                    ).map((opt) => {
                      const active = desktopDensity === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDesktopDensity(opt.id)}
                          aria-pressed={active}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-amber-400 text-black shadow-xs'
                              : isDark
                                ? 'text-neutral-300 hover:text-white'
                                : 'text-neutral-600 hover:text-black'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 4B. Contextual Section: iOS-App (Admin Mode Role & Branch) */}
          {appContext === 'ios' && canSwitchRole && effectiveIosRole && (
            <div className="space-y-1.5 pt-0.5">
              <div
                className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-1 ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Kiểm thử vai trò (Admin Mode):</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['CVL', 'CVLL', 'CC'] as const).map((r) => {
                  const active = effectiveIosRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        onRoleChange?.(r);
                        onClose();
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        active
                          ? 'bg-amber-400 text-black shadow-md'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                            : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200'
                      }`}
                    >
                      {r === 'CVL' ? (
                        <CvFeather1Badge featherClass={active ? 'w-3 h-3 text-black' : 'w-3 h-3 text-amber-400'} />
                      ) : r === 'CVLL' ? (
                        <CvFeather2Badge featherClass={active ? 'w-3 h-3 text-black' : 'w-3 h-3 text-amber-400'} />
                      ) : (
                        'CC Sảnh'
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {appContext === 'ios' &&
            isAdmin &&
            effectiveIosRole !== 'CVL' &&
            effectiveIosRole !== 'CVLL' &&
            effectiveIosRole !== 'CV' &&
            onSelectBranch &&
            availableBranches.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <div
                  className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-1 ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Chi nhánh vận hành (Admin):</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">Toàn bộ sảnh</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {availableBranches.map((b) => {
                    const active = Number(b.id) === Number(selectedStoreId);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          onSelectBranch(b.id);
                          onClose();
                        }}
                        className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-black shadow-md'
                            : isDark
                              ? 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                              : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200'
                        }`}
                      >
                        <span className="text-[10.5px] font-extrabold">{b.code}</span>
                        <span className="truncate">{b.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* 5. Action Rows (Contextual + Shared Core) */}
          <div className="space-y-1.5 pt-0.5">
            {appContext === 'ios' && onToggleSimulationMode && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onToggleSimulationMode();
                }}
                className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
                  isSimulationMode
                    ? isDark
                      ? 'bg-amber-950/60 hover:bg-amber-950/80 border-amber-500/50 text-amber-100'
                      : 'bg-amber-50 hover:bg-amber-100 border-amber-400 text-amber-950'
                    : isDark
                      ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Phòng Tập Luyện (Mô Phỏng)</span>
                      <span
                        className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                          isSimulationMode
                            ? 'bg-amber-500 text-black'
                            : isDark
                              ? 'bg-neutral-800 text-amber-400'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isSimulationMode ? 'ĐANG BẬT' : 'SANDBOX'}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-neutral-400">
                      {isSimulationMode
                        ? 'Bấm để thoát Mô phỏng · Quay về sảnh thật'
                        : 'Thực hành tư vấn, checkout & Revert thoải mái trên data thật'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {appContext === 'ios' && isSimulationMode && menteesList.length > 0 && onSelectMentee && (
              <div
                className={`w-full p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${
                  isDark
                    ? 'bg-pink-500/10 border-pink-400/30 text-pink-100'
                    : 'bg-pink-50 border-pink-300 text-pink-950'
                }`}
              >
                <span className="text-[11px] font-bold shrink-0">Xem bài tập:</span>
                <div className="relative flex-1 max-w-[210px]">
                  <select
                    value={selectedMenteeStaffId ? String(selectedMenteeStaffId) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onSelectMentee(val ? Number(val) : undefined);
                      onClose();
                    }}
                    className={`w-full appearance-none pl-2.5 pr-6 py-1 rounded-xl text-[11px] font-bold border truncate cursor-pointer focus:outline-none ${
                      isDark
                        ? 'bg-neutral-900 border-pink-400/35 text-pink-200'
                        : 'bg-white border-pink-300 text-neutral-900'
                    }`}
                    aria-label="Chọn bài tập mô phỏng trong menu"
                  >
                    <option value="">Sandbox của tôi</option>
                    {menteesList.map((m) => (
                      <option key={m.menteeStaffId} value={String(m.menteeStaffId)}>
                        {m.menteeName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
                </div>
              </div>
            )}

            {appContext === 'ios' && onOpenCreateBooking && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateBooking();
                }}
                className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
                  isDark
                    ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                    <CalendarPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      {isSimulationMode
                        ? 'Đặt Lịch Mô Phỏng (+ Khách Mới / Quen)'
                        : 'Tạo Lịch Hẹn Khách Mới / Khách Quen'}
                    </div>
                    <div className="text-[10.5px] text-neutral-400">
                      {isSimulationMode
                        ? 'Tạo lịch tập luyện trong Sandbox không ghi MySQL'
                        : 'Thêm nhanh booking vào hàng đợi Chờ đón'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {appContext === 'ios' && onOpenPaystub && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPaystub();
                }}
                className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
                  isDark
                    ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-500 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      Thu nhập tạm tính
                    </div>
                    <div className="text-[10.5px] text-neutral-400">Xem bảng kê ca làm & thưởng</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {appContext === 'general' && !isCv && onOpenDailyCalls && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDailyCalls();
                }}
                className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
                  isDark
                    ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      Cuộc gọi hôm nay
                    </div>
                    <div className="text-[10.5px] text-neutral-400">Nhật ký cuộc gọi tổng đài trong ngày</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5">
                  {dailyCallsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                      {dailyCallsCount} cuộc
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </span>
              </button>
            )}

            {appContext === 'general' && !isCv && onOpenTelesalesDashboard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTelesalesDashboard();
                }}
                className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
                  isDark
                    ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      KPI Đội Telesales
                    </div>
                    <div className="text-[10.5px] text-neutral-400">Hiệu suất gọi & chuyển đổi</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {/* Shared Core: Đổi ảnh đại diện (AI Coach) */}
            <button
              type="button"
              onClick={() => setIsAvatarCropOpen(true)}
              className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
                isDark
                  ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                  : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Đổi ảnh đại diện
                  </div>
                  <div className="text-[10.5px] text-neutral-400">Cập nhật & chấm điểm chân dung chuẩn Wings</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25 shrink-0">
                <Sparkles className="w-2.5 h-2.5" /> AI Coach
              </span>
            </button>

            {/* Shared Core: Báo lỗi / Góp ý */}
            {!isCv && (
              <button
                type="button"
                data-user-menu-bug-report
                onClick={() => {
                  onClose();
                  openBugReport(undefined, { preferHistoryIfPending: true });
                }}
                className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
                  isDark
                    ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                    <MessageSquareWarning className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      Báo lỗi / Góp ý
                    </div>
                    <div className="text-[10.5px] text-neutral-400">Gửi phản hồi & theo dõi tiến độ xử lý</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5">
                  {bugAttentionCount > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-amber-500/15 text-amber-500 border border-amber-500/25">
                      {bugAttentionCount > 99 ? '99+' : bugAttentionCount} mới
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </span>
              </button>
            )}

            {/* Shared Core: Đăng xuất tài khoản */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border border-rose-500/20 text-left group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-500">Đăng xuất tài khoản (Logout)</div>
                  <div className="text-[10.5px] text-neutral-400">Thoát phiên làm việc & về màn hình Đăng nhập</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400/50 group-hover:text-rose-500 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {sheetNode &&
        (typeof document !== 'undefined' && document.body ? createPortal(sheetNode, document.body) : sheetNode)}
      {isAvatarCropOpen && (
        <AvatarCropModal
          open={isAvatarCropOpen}
          onClose={() => setIsAvatarCropOpen(false)}
          currentUser={effectiveUser || { id: fontStaffId, displayName }}
          onSuccess={(newAvatarUrl) => {
            setIsAvatarCropOpen(false);
            setLocalAvatarOverride(newAvatarUrl);
            if (typeof window !== 'undefined') {
              try {
                const stored = readStoredUser();
                if (stored) {
                  window.localStorage.setItem('mos_user', JSON.stringify({ ...stored, avatarUrl: newAvatarUrl }));
                }
              } catch {}
            }
            onAvatarUpdated?.(newAvatarUrl);
          }}
        />
      )}
    </>
  );
};

export default UnifiedProfileSheet;
