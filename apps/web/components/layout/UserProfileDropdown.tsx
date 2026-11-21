'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Avatar, theme } from 'antd';
import { UserRound } from 'lucide-react';
import { isCvRole, type SafeAny } from '@mos-lab/shared';
import { resolveMediaUrl } from '../../lib/api-client';
import {
  getBugReportBadgeServerSnapshot,
  getBugReportBadgeSummary,
  subscribeBugReportBadgeSummary,
} from '../../lib/bug-diagnostics';
import { HeaderActionIndicator } from '../ui/HeaderActionIndicator';

const UnifiedProfileSheet = dynamic(() => import('../profile/UnifiedProfileSheet'), { ssr: false });

interface UserProfileDropdownProps {
  user: SafeAny;
  isImpersonating?: boolean;
  onExitImpersonation?: () => Promise<void> | void;
  desktopDensity: 'compact' | 'standard' | 'comfortable';
  setDesktopDensity: (density: 'compact' | 'standard' | 'comfortable') => void;
  onOpenTelesalesDashboard: () => void;
  onLogout: () => Promise<void> | void;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
  themeMode?: 'light' | 'dark';
  onToggleTheme?: () => void;
  dailyCallsCount?: number;
  onOpenDailyCalls?: () => void;
  /** Hide top-right avatar trigger on compact viewports where profile is opened via 9-dot Launcher or Utility menu */
  hideTrigger?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
  isImpersonating = false,
  onExitImpersonation,
  desktopDensity,
  setDesktopDensity,
  onOpenTelesalesDashboard,
  onLogout,
  onAvatarUpdated,
  dailyCallsCount = 0,
  onOpenDailyCalls,
  hideTrigger = false,
  externalOpen,
  onExternalOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const { token } = theme.useToken();

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onExternalOpenChange?.(next);
  };

  const isCv = isCvRole(user?.role);
  const bugBadge = React.useSyncExternalStore(
    subscribeBugReportBadgeSummary,
    getBugReportBadgeSummary,
    getBugReportBadgeServerSnapshot
  );
  const bugAttentionCount = !isCv ? bugBadge.actionRequiredCount || bugBadge.unreadCount : 0;

  const rawAvatar = user?.avatarUrl || user?.avatar;
  const avatarUrl = rawAvatar
    ? resolveMediaUrl(rawAvatar.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com'))
    : undefined;

  return (
    <>
      {!hideTrigger && (
        <HeaderActionIndicator variant="status" active={bugAttentionCount > 0} color={token.colorWarning}>
          <button
            type="button"
            className="mos-header-avatar-action"
            data-header-action="user-menu"
            aria-label={
              bugAttentionCount > 0
                ? `Mở menu người dùng, có ${bugAttentionCount} phản hồi báo lỗi cần xem`
                : 'Mở menu người dùng'
            }
            aria-haspopup="dialog"
            aria-expanded={open}
            title={
              bugAttentionCount > 0
                ? `Mở menu người dùng (${bugAttentionCount} phản hồi báo lỗi mới)`
                : 'Mở menu người dùng'
            }
            onClick={() => setOpen(!open)}
          >
            <Avatar
              className="mos-header-avatar"
              src={avatarUrl}
              icon={<UserRound aria-hidden className="mos-header-avatar__icon" />}
            />
          </button>
        </HeaderActionIndicator>
      )}

      {open ? (
        <UnifiedProfileSheet
          open={open}
          onClose={() => setOpen(false)}
          appContext="general"
          user={user}
          isImpersonating={isImpersonating}
          onExitImpersonation={onExitImpersonation}
          desktopDensity={desktopDensity}
          setDesktopDensity={setDesktopDensity}
          onOpenTelesalesDashboard={onOpenTelesalesDashboard}
          onLogout={onLogout}
          onAvatarUpdated={onAvatarUpdated}
          dailyCallsCount={dailyCallsCount}
          onOpenDailyCalls={onOpenDailyCalls}
        />
      ) : null}
    </>
  );
};

export default UserProfileDropdown;
