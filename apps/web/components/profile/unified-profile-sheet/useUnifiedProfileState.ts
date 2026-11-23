'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { SafeAny } from '@mos-lab/shared';
import type { ActiveActorProfile, IosBranchConfig, IosUserRole } from '../../../app/ios-app/state/useIosAppState';
import { useTheme } from '../../../context/ThemeContext';
import {
  getBugReportBadgeServerSnapshot,
  getBugReportBadgeSummary,
  subscribeBugReportBadgeSummary,
} from '../../../lib/bug-diagnostics';
import {
  clearStoredAuthSession,
  computeOperationalScopeText,
  persistStoredUserAvatar,
  readStoredUser,
  resolveProfileAvatarUrl,
  resolveProfileIdentity,
} from './profileSheetUtils';
import type { UnifiedProfileAppContext } from './types';

interface UseUnifiedProfileStateParams {
  open: boolean;
  onClose: () => void;
  appContext: UnifiedProfileAppContext;
  userProp?: SafeAny;
  actor?: ActiveActorProfile;
  iosRole?: IosUserRole;
  currentBranch?: IosBranchConfig;
  isAdminProp?: boolean;
  onLogout?: () => Promise<void> | void;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
}

export function useUnifiedProfileState({
  open,
  onClose,
  appContext,
  userProp,
  actor,
  iosRole,
  currentBranch,
  isAdminProp,
  onLogout,
  onAvatarUpdated,
}: UseUnifiedProfileStateParams) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
  const [localAvatarOverride, setLocalAvatarOverride] = useState<string | null>(null);

  const storedUser = useMemo(() => readStoredUser(), [open]);
  const effectiveUser = userProp || storedUser;

  const identity = resolveProfileIdentity({
    appContext,
    effectiveUser,
    iosRole,
    isAdminProp,
  });

  const displayName = actor?.name || effectiveUser?.displayName || effectiveUser?.username || 'Nhân sự Wings';
  const displayInitial = (displayName || 'W').trim().charAt(0).toUpperCase();

  const rawAvatar = localAvatarOverride || actor?.avatar || effectiveUser?.avatarUrl || effectiveUser?.avatar;
  const resolvedAvatar = resolveProfileAvatarUrl(rawAvatar);

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

  const bugBadge = useSyncExternalStore(
    subscribeBugReportBadgeSummary,
    getBugReportBadgeSummary,
    getBugReportBadgeServerSnapshot
  );
  const bugAttentionCount = !identity.isCv ? bugBadge.actionRequiredCount || bugBadge.unreadCount : 0;

  const fontStaffId = Number(actor?.staffId || effectiveUser?.legacyStaffId || effectiveUser?.id || 0) || undefined;
  const branchText = currentBranch?.name || effectiveUser?.branchName || 'Chi nhánh Đề Thám';

  const scopeText = useMemo(
    () =>
      computeOperationalScopeText({
        appContext,
        effectiveIosRole: identity.effectiveIosRole,
        isAdmin: identity.isAdmin,
        isCcTeamMember: identity.isCcTeamMember,
        effectiveRoleStr: identity.effectiveRoleStr,
        featherTier: identity.featherTier,
        isCv: identity.isCv,
      }),
    [
      appContext,
      identity.effectiveIosRole,
      identity.isAdmin,
      identity.isCcTeamMember,
      identity.effectiveRoleStr,
      identity.featherTier,
      identity.isCv,
    ]
  );

  const handleLogout = async () => {
    onClose();
    if (onLogout) {
      await onLogout();
      return;
    }
    clearStoredAuthSession();
  };

  const handleAvatarCropSuccess = (newAvatarUrl: string) => {
    setIsAvatarCropOpen(false);
    setLocalAvatarOverride(newAvatarUrl);
    persistStoredUserAvatar(newAvatarUrl);
    onAvatarUpdated?.(newAvatarUrl);
  };

  return {
    isDark,
    avatarLoadError,
    setAvatarLoadError,
    isAvatarCropOpen,
    setIsAvatarCropOpen,
    identity,
    displayName,
    displayInitial,
    resolvedAvatar,
    bugAttentionCount,
    fontStaffId,
    branchText,
    scopeText,
    handleLogout,
    handleAvatarCropSuccess,
  };
}
