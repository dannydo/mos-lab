'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { MobileThemeSelectorBlock } from '../theme/MobileThemeSheet';
import { IosFontSizeControl } from '../../app/ios-app/components/ui-kit/IosFontSizeControl';
import { ProfileActionRows } from './unified-profile-sheet/ProfileActionRows';
import { ProfileGeneralControls } from './unified-profile-sheet/ProfileGeneralControls';
import { ProfileIosAdminControls } from './unified-profile-sheet/ProfileIosAdminControls';
import { ProfileSheetHeader } from './unified-profile-sheet/ProfileSheetHeader';
import type { UnifiedProfileSheetProps } from './unified-profile-sheet/types';
import { useUnifiedProfileState } from './unified-profile-sheet/useUnifiedProfileState';

export type {
  DesktopDensityOption,
  UnifiedProfileAppContext,
  UnifiedProfileSheetProps,
} from './unified-profile-sheet/types';

const AvatarCropModal = dynamic(() => import('../avatar/AvatarCropModal'), { ssr: false });

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
  const {
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
  } = useUnifiedProfileState({
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
  });

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
          className={`backdrop-blur-2xl rounded-3xl p-4 border space-y-3 shadow-2xl transition-colors max-h-[88vh] overflow-y-auto no-scrollbar ${
            isDark
              ? 'bg-[var(--mos-surface,rgba(14,19,31,1))] border-[var(--mos-surface-border,rgba(255,255,255,0.12))] text-[var(--mos-text,rgba(248,250,252,1))]'
              : 'bg-[var(--mos-surface,rgba(255,255,255,1))] border-[var(--mos-surface-border,rgba(226,232,240,1))] text-[var(--mos-text,rgba(15,23,42,1))]'
          }`}
        >
          <ProfileSheetHeader
            isDark={isDark}
            appContext={appContext}
            displayName={displayName}
            displayInitial={displayInitial}
            resolvedAvatar={resolvedAvatar}
            avatarLoadError={avatarLoadError}
            onAvatarError={() => setAvatarLoadError(true)}
            onOpenAvatarCrop={() => setIsAvatarCropOpen(true)}
            onClose={onClose}
            branchText={branchText}
            isCvll={identity.isCvll}
            isCvl={identity.isCvl}
            effectiveIosRole={identity.effectiveIosRole}
            isCcTeamMember={identity.isCcTeamMember}
            effectiveRoleStr={identity.effectiveRoleStr}
            isImpersonating={isImpersonating}
            onExitImpersonation={onExitImpersonation}
            scopeText={scopeText}
          />

          {/* 3. Giao diện & Tông màu (3 Modes + Font Scale + 7 Color Themes) */}
          <MobileThemeSelectorBlock
            compact
            fontControl={<IosFontSizeControl isDark={isDark} staffId={fontStaffId} />}
          />

          {/* 4A. Contextual Section: mOS General (OmiCall + Density) */}
          {appContext === 'general' && (
            <ProfileGeneralControls
              isDark={isDark}
              desktopDensity={desktopDensity}
              setDesktopDensity={setDesktopDensity}
            />
          )}

          {/* 4B. Contextual Section: iOS-App (Admin Mode Role & Branch) */}
          {appContext === 'ios' && (
            <ProfileIosAdminControls
              isDark={isDark}
              isAdmin={identity.isAdmin}
              canSwitchRole={canSwitchRole}
              effectiveIosRole={identity.effectiveIosRole}
              onRoleChange={onRoleChange}
              selectedStoreId={selectedStoreId}
              onSelectBranch={onSelectBranch}
              availableBranches={availableBranches}
              onClose={onClose}
            />
          )}

          {/* 5. Action Rows (Contextual + Shared Core) */}
          <ProfileActionRows
            isDark={isDark}
            appContext={appContext}
            isCv={identity.isCv}
            isSimulationMode={isSimulationMode}
            onToggleSimulationMode={onToggleSimulationMode}
            menteesList={menteesList}
            selectedMenteeStaffId={selectedMenteeStaffId}
            onSelectMentee={onSelectMentee}
            onOpenCreateBooking={onOpenCreateBooking}
            onOpenPaystub={onOpenPaystub}
            dailyCallsCount={dailyCallsCount}
            onOpenDailyCalls={onOpenDailyCalls}
            onOpenTelesalesDashboard={onOpenTelesalesDashboard}
            bugAttentionCount={bugAttentionCount}
            onOpenAvatarCrop={() => setIsAvatarCropOpen(true)}
            onClose={onClose}
            onLogout={handleLogout}
          />
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
          currentUser={identity.effectiveUser || { id: fontStaffId, displayName }}
          onSuccess={handleAvatarCropSuccess}
        />
      )}
    </>
  );
};

export default UnifiedProfileSheet;
