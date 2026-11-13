'use client';

import React from 'react';
import { ActiveActorProfile, IosUserRole, IosBranchConfig } from '../../state/useIosAppState';
import { CvFeather2Badge, CvFeather1Badge } from './CvFeatherLabels';
import { IosFontSizeControl } from './IosFontSizeControl';
import {
  Wallet,
  MessageSquare,
  Award,
  Lock,
  ChevronRight,
  X,
  Shield,
  LogOut,
  Building2,
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { MobileThemeSelectorBlock } from '../../../../components/theme/MobileThemeSheet';

interface IosProfileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actor: ActiveActorProfile;
  role: IosUserRole;
  canSwitchRole?: boolean;
  onRoleChange?: (role: IosUserRole) => void;
  onOpenPaystub?: () => void;
  onOpenChat?: () => void;
  onOpenCareer?: () => void;
  onLogout?: () => void;
  currentBranch?: IosBranchConfig;
  selectedStoreId?: number;
  onSelectBranch?: (storeId: number) => void;
  availableBranches?: IosBranchConfig[];
  isAdmin?: boolean;
}

export function IosProfileMenuSheet({
  isOpen,
  onClose,
  actor,
  role,
  canSwitchRole = false,
  onRoleChange,
  onOpenPaystub,
  onOpenChat,
  onOpenCareer,
  onLogout,
  currentBranch,
  selectedStoreId = 6,
  onSelectBranch,
  availableBranches = [],
  isAdmin = false,
}: IosProfileMenuSheetProps) {
  const { themeMode } = useTheme();

  if (!isOpen) return null;

  const actorName = actor?.name || 'Thảo Ly';
  const isCvl = role === 'CVL';
  const isCvll = role === 'CVLL';
  const isDark = themeMode === 'dark';

  const handleLogout = () => {
    onClose();
    if (onLogout) {
      onLogout();
    } else if (typeof window !== 'undefined') {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Sheet Container */}
      <div className="w-full max-w-[420px] z-10 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom duration-200">
        {/* Main Content Box */}
        <div
          className="backdrop-blur-2xl rounded-3xl p-4 border space-y-3.5 shadow-2xl transition-colors max-h-[88vh] overflow-y-auto no-scrollbar"
          style={{
            backgroundColor: 'var(--mos-surface)',
            borderColor: 'var(--mos-surface-border)',
            color: 'var(--mos-text)',
          }}
        >
          {/* Header Staff Identity */}
          <div
            className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-neutral-800' : 'border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-amber-400 text-black font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                <img
                  src={actor?.avatar || 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png'}
                  alt={actorName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-extrabold text-[15px] tracking-tight ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {actorName}
                  </span>
                  <span className="bg-amber-400/20 text-amber-500 border border-amber-400/30 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center">
                    {isCvll ? (
                      <CvFeather2Badge />
                    ) : isCvl ? (
                      <span className="inline-flex items-center gap-1">
                        <CvFeather1Badge /> Tự Chủ
                      </span>
                    ) : (
                      role
                    )}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                  <span>📍 {currentBranch?.name || 'Chi nhánh Đề Thám'}</span>
                  <span>·</span>
                  <span className="text-emerald-500 font-semibold">Đang hoạt động</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng menu hồ sơ"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isDark
                  ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Privacy / Operational Scope Info */}
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
                {isCvl ? 'Phạm vi bảo mật: ' : 'Phạm vi vận hành: '}
              </span>
              <span className={isDark ? 'text-amber-400 font-bold' : 'text-amber-900 font-bold'}>
                {isCvl
                  ? '1 khách đầu tua + khách book đích danh'
                  : isCvll
                    ? 'Khách của mình & hỗ trợ toàn chi nhánh'
                    : role === 'CC'
                      ? 'Toàn bộ khách hàng tại chi nhánh'
                      : 'Toàn bộ dữ liệu vận hành chi nhánh'}
              </span>
            </div>
          </div>

          {/* Giao diện & Tông màu (Appearance & Theme) */}
          <MobileThemeSelectorBlock
            compact
            fontControl={<IosFontSizeControl isDark={isDark} staffId={actor?.staffId} />}
          />

          {/* Admin Test Role Switcher (Hidden in menu as requested by Danny) */}
          {canSwitchRole && (
            <div className="space-y-1.5 pt-1">
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
                  const active = role === r;
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
                      {r === 'CVL' ? <CvFeather1Badge /> : r === 'CVLL' ? <CvFeather2Badge /> : 'CC Sảnh'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin Branch Selector */}
          {isAdmin &&
            role !== 'CVL' &&
            role !== 'CVLL' &&
            role !== 'CV' &&
            onSelectBranch &&
            availableBranches.length > 0 && (
              <div className="space-y-1.5 pt-1">
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

          {/* Quick Action Navigation Rows */}
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPaystub?.();
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

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenChat) {
                  onOpenChat();
                } else {
                  const chatUrl = '/chat';
                  const win = window.open(chatUrl, '_blank');
                  if (!win || win.closed || typeof win.closed === 'undefined') {
                    window.location.href = chatUrl;
                  }
                }
              }}
              className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
                isDark
                  ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                  : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-400/10 text-blue-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Trò chuyện mOS Chat
                  </div>
                  <div className="text-[10.5px] text-neutral-400">Tin nhắn nội bộ sảnh & quản lý</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenCareer) {
                  onOpenCareer();
                } else {
                  const staffIdParam = actor?.staffId ? `?staffId=${actor.staffId}` : '';
                  const careerUrl = `/dashboard/career-path${staffIdParam}`;
                  const win = window.open(careerUrl, '_blank');
                  if (!win || win.closed || typeof win.closed === 'undefined') {
                    window.location.href = careerUrl;
                  }
                }
              }}
              className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
                isDark
                  ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                  : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-400/10 text-purple-500 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Lộ trình thăng tiến
                  </div>
                  <div className="text-[10.5px] text-neutral-400 flex items-center gap-1">
                    <span>Tiêu chuẩn cấp bậc CV</span>
                    <CvFeather1Badge />
                    <span>và CC</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Đăng xuất tài khoản (Logout) */}
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
  );
}
