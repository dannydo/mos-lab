'use client';

import React, { useState } from 'react';
import { Dropdown, Avatar, Switch, Segmented, theme } from 'antd';
import { ColumnHeightOutlined } from '@ant-design/icons';
import { PhoneCall, Radio, MessageSquareWarning, BarChart3, ChevronRight, LogOut, UserRound } from 'lucide-react';
import type { SafeAny } from '@mos-lab/shared';
import { useOmiCall } from '../../context/OmiCallContext';
import { useBugReportLauncherPreferences } from '../bug-reports/useBugReportLauncherPreferences';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { useTheme } from '../../context/ThemeContext';

interface UserProfileDropdownProps {
  user: SafeAny;
  isImpersonating?: boolean;
  onExitImpersonation?: () => Promise<void> | void;
  desktopDensity: 'compact' | 'standard' | 'comfortable';
  setDesktopDensity: (density: 'compact' | 'standard' | 'comfortable') => void;
  onOpenTelesalesDashboard: () => void;
  onLogout: () => Promise<void> | void;
}

function getRoleBadge(role?: string | null, token?: SafeAny) {
  const normalized = String(role || '')
    .toLowerCase()
    .trim();
  if (normalized === 'super_admin') {
    return {
      label: 'Super Admin',
      bg: 'rgba(245, 158, 11, 0.12)',
      color: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.25)',
    };
  }
  if (normalized === 'admin') {
    return {
      label: 'Admin',
      bg: 'rgba(168, 85, 247, 0.12)',
      color: '#a855f7',
      border: 'rgba(168, 85, 247, 0.25)',
    };
  }
  if (normalized === 'telesales' || normalized === 'booker') {
    return {
      label: 'Telesales',
      bg: 'rgba(14, 165, 233, 0.12)',
      color: '#0ea5e9',
      border: 'rgba(14, 165, 233, 0.25)',
    };
  }
  if (normalized === 'cc' || normalized === 'consultant') {
    return {
      label: 'Tư vấn (CC)',
      bg: 'rgba(16, 185, 129, 0.12)',
      color: '#10b981',
      border: 'rgba(16, 185, 129, 0.25)',
    };
  }
  if (normalized === 'technician' || normalized === 'ktv') {
    return {
      label: 'Kỹ thuật viên',
      bg: 'rgba(20, 184, 166, 0.12)',
      color: '#14b8a6',
      border: 'rgba(20, 184, 166, 0.25)',
    };
  }
  return {
    label: role ? role.toUpperCase() : 'USER',
    bg: token?.colorPrimaryBg || 'rgba(59, 130, 246, 0.12)',
    color: token?.colorPrimary || '#3b82f6',
    border: token?.colorPrimaryBorder || 'rgba(59, 130, 246, 0.25)',
  };
}

function getCallStatusInfo({
  isRegistered,
  omicallReady,
  callState,
}: {
  isRegistered: boolean;
  omicallReady: boolean;
  callState: string;
}) {
  if (callState === 'connected') {
    return {
      text: 'Đang trong cuộc gọi',
      dotClass: 'bg-rose-500 animate-pulse',
      iconBg: 'bg-rose-500/15',
      iconColor: '#f43f5e',
    };
  }
  if (callState === 'incoming') {
    return {
      text: 'Có cuộc gọi đến...',
      dotClass: 'bg-amber-500 animate-bounce',
      iconBg: 'bg-amber-500/15',
      iconColor: '#f59e0b',
    };
  }
  if (callState === 'ringing') {
    return {
      text: 'Đang đổ chuông...',
      dotClass: 'bg-sky-500 animate-pulse',
      iconBg: 'bg-sky-500/15',
      iconColor: '#0ea5e9',
    };
  }
  if (callState === 'confirming') {
    return {
      text: 'Sẵn sàng gọi ra',
      dotClass: 'bg-emerald-500',
      iconBg: 'bg-emerald-500/15',
      iconColor: '#10b981',
    };
  }
  if (isRegistered) {
    return {
      text: 'Sẵn sàng nhận cuộc gọi',
      dotClass: 'bg-emerald-500',
      iconBg: 'bg-emerald-500/15',
      iconColor: '#10b981',
    };
  }
  if (omicallReady) {
    return {
      text: 'Đang kết nối tổng đài...',
      dotClass: 'bg-sky-500 animate-pulse',
      iconBg: 'bg-sky-500/15',
      iconColor: '#0ea5e9',
    };
  }
  return {
    text: 'Chưa bật nhận cuộc gọi',
    dotClass: 'bg-slate-400',
    iconBg: 'bg-slate-500/10',
    iconColor: 'var(--mos-text-tertiary, #94a3b8)',
  };
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
  isImpersonating = false,
  onExitImpersonation,
  desktopDensity,
  setDesktopDensity,
  onOpenTelesalesDashboard,
  onLogout,
}) => {
  const [open, setOpen] = useState(false);
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const isMobileTier = responsiveTier === 'mobile';

  const {
    isRegistered,
    callState,
    omicallReady,
    setOmicallReady,
    floatingLauncherVisible,
    setFloatingLauncherVisible,
  } = useOmiCall();

  const { preferences, ready: bugReportReady, setVisible: setBugReportVisible } = useBugReportLauncherPreferences();

  const roleBadge = getRoleBadge(user?.role, token);
  const callStatus = getCallStatusInfo({ isRegistered, omicallReady, callState });

  const avatarUrl = user?.avatarUrl
    ? user.avatarUrl.replace(/^https?:\/\/(s|api)\.wingslashes\.com/, 'https://cdn.wingslashes.com')
    : undefined;

  const handleTelesalesClick = () => {
    setOpen(false);
    onOpenTelesalesDashboard();
  };

  const handleExitImpersonationClick = async () => {
    setOpen(false);
    await onExitImpersonation?.();
  };

  const handleLogoutClick = async () => {
    setOpen(false);
    await onLogout();
  };

  const dropdownContent = (
    <div
      className={`${isMobileTier ? 'w-[290px]' : 'w-[320px]'} overflow-hidden rounded-2xl shadow-2xl transition-all duration-200`}
      style={{
        background: token.colorBgElevated,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* User Identity Header */}
      <div
        className="p-3.5 pb-3 border-b"
        style={{
          borderColor: token.colorBorderSecondary,
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.04), transparent)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar
              size={44}
              src={avatarUrl}
              icon={<UserRound size={22} />}
              style={{
                backgroundColor: token.colorPrimaryBg,
                color: token.colorPrimary,
              }}
              className="ring-1 ring-white/10"
            />
            {isRegistered && (
              <span
                className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black"
                title="Đang online tổng đài"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[14px] leading-tight text-slate-800 dark:text-slate-100 truncate">
                {user?.displayName || 'Người dùng'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase leading-none"
                style={{
                  background: roleBadge.bg,
                  color: roleBadge.color,
                  border: `1px solid ${roleBadge.border}`,
                }}
              >
                {roleBadge.label}
              </span>
              {user?.username && (
                <span className="text-[11px] truncate" style={{ color: token.colorTextTertiary }}>
                  @{user.username}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Impersonation Banner */}
        {isImpersonating && (
          <div
            className="mt-2.5 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
            style={{
              background: token.colorWarningBg,
              border: `1px solid ${token.colorWarningBorder}`,
              color: token.colorWarningText,
            }}
          >
            <span className="font-medium">Đang giả lập người dùng</span>
            <button
              type="button"
              onClick={handleExitImpersonationClick}
              className="font-semibold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
            >
              Thoát
            </button>
          </div>
        )}
      </div>

      {/* Section 1: Quick Toggles (OmiCall & UI Launchers) */}
      <div className="p-2 space-y-1">
        <div className="px-2 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Tổng đài & Tiện ích
        </div>

        {/* OmiCall Ready Toggle */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${callStatus.iconBg}`}
              style={{ color: callStatus.iconColor }}
            >
              <PhoneCall size={15} />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium leading-tight text-slate-800 dark:text-slate-200">
                Nhận cuộc gọi tổng đài
              </div>
              <div
                className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-tight"
                style={{ color: token.colorTextSecondary }}
              >
                <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${callStatus.dotClass}`} />
                <span className="truncate">{callStatus.text}</span>
              </div>
            </div>
          </div>
          <Switch
            size="small"
            checked={omicallReady}
            aria-label="Bật nhận cuộc gọi tổng đài OmiCall"
            onChange={(checked) => setOmicallReady(checked)}
          />
        </div>

        {/* Floating Call Launcher Toggle */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500 dark:text-slate-400">
              <Radio size={15} />
            </span>
            <div className="min-w-0 text-[13px] font-medium leading-tight text-slate-800 dark:text-slate-200 truncate">
              Nút gọi nổi màn hình
            </div>
          </div>
          <Switch
            size="small"
            checked={floatingLauncherVisible}
            aria-label="Hiển thị nút gọi nổi OmiCall"
            onChange={setFloatingLauncherVisible}
          />
        </div>

        {/* Bug Report Launcher Toggle */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <MessageSquareWarning size={15} />
            </span>
            <div className="min-w-0 text-[13px] font-medium leading-tight text-slate-800 dark:text-slate-200 truncate">
              Nút phản hồi / báo lỗi
            </div>
          </div>
          <Switch
            size="small"
            checked={bugReportReady && preferences.visible}
            disabled={!bugReportReady}
            aria-label="Hiển thị nút phản hồi mOS"
            onChange={setBugReportVisible}
          />
        </div>
      </div>

      {/* Section 2: Display Density & Tools */}
      <div className="p-2 pt-1 border-t space-y-1.5" style={{ borderColor: token.colorBorderSecondary }}>
        <div className="px-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            <span className="flex items-center gap-1">
              <ColumnHeightOutlined /> Mật độ hiển thị
            </span>
            {isMobileTier && (
              <span className="text-[10px] normal-case font-normal text-slate-400">(Mobile: Compact)</span>
            )}
          </div>
          <Segmented
            block
            size="small"
            value={desktopDensity}
            onChange={(val) => setDesktopDensity(val as 'compact' | 'standard' | 'comfortable')}
            options={[
              { label: 'Compact', value: 'compact' },
              { label: 'Standard', value: 'standard' },
              { label: 'Thoải mái', value: 'comfortable' },
            ]}
          />
        </div>

        {/* Telesales Dashboard Button */}
        <button
          type="button"
          onClick={handleTelesalesClick}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
        >
          <span className="flex items-center gap-2.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">
            <BarChart3 size={16} className="text-amber-500 shrink-0" />
            KPI Đội Telesales
          </span>
          <ChevronRight size={14} className="text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Section 3: Logout & Exit Impersonation */}
      <div className="p-2 pt-1 border-t space-y-0.5" style={{ borderColor: token.colorBorderSecondary }}>
        {isImpersonating && (
          <button
            type="button"
            onClick={handleExitImpersonationClick}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-pointer text-[13px] font-medium"
          >
            <LogOut size={16} className="shrink-0" />
            Thoát chế độ giả lập
          </button>
        )}

        <button
          type="button"
          onClick={handleLogoutClick}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors hover:bg-rose-500/10 dark:hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 cursor-pointer text-[13px] font-medium"
        >
          <LogOut size={16} className="shrink-0" />
          Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
      popupRender={() => dropdownContent}
      getPopupContainer={(trigger) => trigger.parentElement || document.body}
    >
      <button
        type="button"
        className="mos-header-avatar-action"
        data-header-action="user-menu"
        aria-label="Mở menu người dùng"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Mở menu người dùng"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Avatar
          size={32}
          className="mos-header-avatar pointer-events-none"
          src={avatarUrl}
          icon={<UserRound aria-hidden className="mos-header-avatar__icon" />}
          style={{
            width: '32px',
            height: '32px',
            minWidth: '32px',
            minHeight: '32px',
            maxWidth: '32px',
            maxHeight: '32px',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: themeMode === 'dark' ? '#000000' : '#ffffff',
            boxSizing: 'border-box',
          }}
        />
      </button>
    </Dropdown>
  );
};

export default UserProfileDropdown;
