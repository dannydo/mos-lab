'use client';

import React from 'react';
import type { IosCustomerComboWalletItem } from '@mos-lab/shared';
import { History, Cake } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { CvFeather2Badge, CvFeather1Badge } from '../ui-kit/CvFeatherLabels';
import { CustomerAvatarPicker } from '../ui-kit/CustomerAvatarPicker';
import { resolveCustomerTypeMeta } from './LashMaterialConstraintMatrix';
import { QuickCheckInComboCard } from './checkin/QuickCheckInComboCard';
import { CheckInStaffAndProfileCards } from './checkin/CheckInStaffAndProfileCards';
import { CheckInBottomActionBar } from './checkin/CheckInBottomActionBar';
import { CheckInModals } from './checkin/CheckInModals';
import { NewCustomerReferralModal } from './checkin/NewCustomerReferralModal';
import { ReferralDiamondBanner } from './checkin/ReferralDiamondBanner';
import type { Screen02CheckInProfileProps } from './checkin/Screen02CheckInProfile.types';
import { useCheckInProfileState } from './checkin/useCheckInProfileState';

export type { Screen02CheckInProfileProps } from './checkin/Screen02CheckInProfile.types';

export function Screen02CheckInProfile({
  booking,
  actor,
  isAdmin = false,
  isSimulationMode = false,
  onRefreshDb,
  isCheckInLocked = false,
  activeServicingCustomerName,
  onResumeServicing,
  onBack,
  onCheckIn,
  onQuickCheckIn,
  onUpdateAvatar,
  onReferralConfirmed,
  onSelectComboWallet,
}: Screen02CheckInProfileProps) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  const {
    customerName,
    customerPhone,
    birthdayStatus,
    serviceName,
    assignedStaff,
    bookerName,
    visits,
    isFirstTimeClient,
    requiresNaturalLashCheck,
    customerNote,
    resolvedWallets,
    isComboLive,
    remainingSessions,
    isCvlStaff,
    checkInStaffName,
    checkInStaffAvatar,
    assignedStaffAvatar,
    preset,
    quickServiceType,
    setQuickServiceType,
    quickHasUnderMink,
    setQuickHasUnderMink,
    quickUnderServiceType,
    setQuickUnderServiceType,
    quickUnderCurl,
    setQuickUnderCurl,
    quickUnderLength,
    setQuickUnderLength,
    quickUnderCount,
    setQuickUnderCount,
    isOverridden,
    setIsOverridden,
    overrideReason,
    setOverrideReason,
    pendingOverride,
    setPendingOverride,
    pendingComboNewConfirmation,
    setPendingComboNewConfirmation,
    selectedOverrideReasonDraft,
    setSelectedOverrideReasonDraft,
    isRotationExpanded,
    setIsRotationExpanded,
    isRotationInfoOpen,
    setIsRotationInfoOpen,
    selectedLashHistory,
    isLashHistoryOpen,
    setIsLashHistoryOpen,
    isWalletModalOpen,
    setIsWalletModalOpen,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    isNewCustomer,
    canManageReferral,
    referralModalOpen,
    setReferralModalOpen,
    pendingReferral,
    setPendingReferral,
    handleOpenLashHistory,
    handleRequestQuickServiceTypeChange,
    isBookedDirectly,
    activePointsBreakdown,
    handleExecuteQuickCheckIn,
  } = useCheckInProfileState({ booking, actor, onCheckIn, onQuickCheckIn });

  const actorTierLabel =
    actor?.tier === 'CVLL' ? <CvFeather2Badge /> : actor?.tier === 'CVL' ? <CvFeather1Badge /> : 'CC';

  // Quy tắc màu viền avatar (Avatar Ring Color Invariant theo chỉ đạo Danny):
  let avatarRingClass = 'border-[2.5px] border-[#34C759]';
  if (booking?.comboLiveStatus?.isExpired) {
    avatarRingClass = 'border-[2.5px] border-rose-500 ring-2 ring-rose-500/35';
  } else if (isComboLive && remainingSessions > 0) {
    if (remainingSessions <= 2 || booking?.comboLiveStatus?.isExpiringSoon) {
      avatarRingClass = 'border-[2.5px] border-[#FF9500] ring-1 ring-[#FF9500]/40';
    } else {
      avatarRingClass = 'border-[2.5px] border-[#8E8E93]';
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-hidden select-none relative">
      <IosNavigationBar
        title="Hồ Sơ Khách"
        onBack={onBack}
        backTitle="Lịch hẹn"
        rightAction={
          <button
            onClick={
              isComboLive && onQuickCheckIn && !requiresNaturalLashCheck
                ? handleExecuteQuickCheckIn
                : () => onCheckIn(booking?.id)
            }
            className="text-[var(--mos-accent)] font-bold text-sm py-1 px-1 active:opacity-60 cursor-pointer"
          >
            {booking?.status === 'CHECKED_IN' || booking?.status === 'SERVICING' ? 'Tiếp tục' : 'Check In'}
          </button>
        }
      />

      <div className="flex-1 min-h-0 px-3.5 py-3 space-y-3 overflow-y-auto pb-4">
        {/* Card 1: Customer Profile Header */}
        <div className="bg-[var(--mos-surface)] rounded-2xl p-3.5 flex items-center gap-3.5 shadow-sm border border-[var(--mos-surface-border)] text-[var(--mos-text)]">
          <CustomerAvatarPicker
            avatarUrl={booking?.customerAvatar}
            customerName={customerName}
            customerPhone={customerPhone}
            avatarRingClass={avatarRingClass}
            size={56}
            onUpdateAvatar={async (newUrl) => {
              if (onUpdateAvatar) {
                await onUpdateAvatar(newUrl, booking?.id);
              }
            }}
          />
          <div className="flex-1 min-w-0">
            {(() => {
              const typeMeta = resolveCustomerTypeMeta(booking);
              return (
                <div className="flex items-center gap-2">
                  <span className={`text-[14px] font-black select-none ${typeMeta.colorClass}`} title={typeMeta.label}>
                    {typeMeta.symbol}
                  </span>
                  <h2 className="text-[17px] font-bold text-[var(--mos-text)] tracking-tight truncate">
                    {customerName}
                  </h2>
                  {visits >= 5 && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold tracking-tight border ${
                        isDark
                          ? 'bg-amber-400/20 text-amber-400 border-amber-400/30'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      GOLD VIP
                    </span>
                  )}
                </div>
              );
            })()}
            <div className="text-[13px] text-[var(--mos-text-muted)] font-normal mt-0.5 tabular-nums flex flex-wrap items-center gap-2">
              <span>{customerPhone}</span>
              {birthdayStatus.normalizedDob && (
                <span
                  data-testid="checkin-header-birthday-badge"
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none ${
                    birthdayStatus.isBirthdayThisMonth
                      ? isDark
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                        : 'bg-amber-50 border-amber-300 text-amber-800'
                      : isDark
                        ? 'bg-neutral-800/80 border-neutral-700 text-neutral-300'
                        : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                  }`}
                >
                  <Cake className="h-3 w-3 shrink-0" />
                  <span>
                    {birthdayStatus.isBirthdayToday
                      ? `Hôm nay SN (${birthdayStatus.ddMm})`
                      : `Sinh nhật ${birthdayStatus.ddMmYyyy}`}
                  </span>
                </span>
              )}
            </div>
            <div className="text-[12px] text-[var(--mos-text-muted)] font-medium mt-0.5 flex flex-wrap items-center justify-between gap-2">
              <span>
                Lần ghé: <strong className="font-bold text-[var(--mos-text)]">{visits}</strong>
                {preset.daysSinceLastVisit !== null && visits > 1 && (
                  <span className="text-[var(--mos-text-muted)] ml-1">· {preset.daysSinceLastVisit}N</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                data-testid="checkin-header-history-btn"
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-500 hover:bg-emerald-500/25 leading-none"
              >
                <History className="h-3 w-3" />
                <span>Lịch sử &amp; Chi tiêu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: QUICK CHECK-IN GÓI COMBO LIVE / KHÁCH LẺ */}
        <QuickCheckInComboCard
          booking={booking}
          isComboLive={isComboLive}
          remainingSessions={remainingSessions}
          preset={preset}
          quickServiceType={quickServiceType}
          quickHasUnderMink={quickHasUnderMink}
          setQuickHasUnderMink={setQuickHasUnderMink}
          quickUnderServiceType={quickUnderServiceType}
          setQuickUnderServiceType={setQuickUnderServiceType}
          quickUnderCurl={quickUnderCurl}
          setQuickUnderCurl={setQuickUnderCurl}
          quickUnderLength={quickUnderLength}
          setQuickUnderLength={setQuickUnderLength}
          quickUnderCount={quickUnderCount}
          setQuickUnderCount={setQuickUnderCount}
          isOverridden={isOverridden}
          overrideReason={overrideReason}
          onResetOverride={() => {
            setQuickServiceType(preset.expectedServiceType);
            setIsOverridden(false);
            setOverrideReason('');
          }}
          onRequestServiceTypeChange={handleRequestQuickServiceTypeChange}
          onOpenWalletModal={() => setIsWalletModalOpen(true)}
          onSelectUpperWallet={
            onSelectComboWallet
              ? (wallet: IosCustomerComboWalletItem) =>
                  onSelectComboWallet({
                    targetBookingId: booking?.id,
                    selectedUpperComboBalanceId: wallet.balanceId,
                    skipUpperCombo: false,
                  })
              : undefined
          }
          onSkipUpperCombo={
            onSelectComboWallet
              ? () =>
                  onSelectComboWallet({
                    targetBookingId: booking?.id,
                    selectedUpperComboBalanceId: null,
                    skipUpperCombo: true,
                  })
              : undefined
          }
          onSelectUnderWallet={
            onSelectComboWallet
              ? (wallet: IosCustomerComboWalletItem) =>
                  onSelectComboWallet({
                    targetBookingId: booking?.id,
                    selectedUnderComboBalanceId: wallet.balanceId,
                    skipUnderCombo: false,
                  })
              : undefined
          }
          onSkipUnderCombo={
            onSelectComboWallet
              ? () =>
                  onSelectComboWallet({
                    targetBookingId: booking?.id,
                    selectedUnderComboBalanceId: null,
                    skipUnderCombo: true,
                  })
              : undefined
          }
        />

        {/* Cards 3, 3.5, Technical Notes, Natural Lash Profile & Lash History */}
        <CheckInStaffAndProfileCards
          booking={booking}
          bookerName={bookerName}
          checkInStaffName={checkInStaffName}
          checkInStaffAvatar={checkInStaffAvatar}
          assignedStaff={assignedStaff}
          assignedStaffAvatar={assignedStaffAvatar}
          isCvlStaff={isCvlStaff}
          actorTierLabel={actorTierLabel}
          isRotationExpanded={isRotationExpanded}
          setIsRotationExpanded={setIsRotationExpanded}
          setIsRotationInfoOpen={setIsRotationInfoOpen}
          activePointsBreakdown={activePointsBreakdown}
          isComboLive={isComboLive}
          preset={preset}
          serviceName={serviceName}
          quickServiceType={quickServiceType}
          quickUnderServiceType={quickUnderServiceType}
          isBookedDirectly={isBookedDirectly}
          customerNote={customerNote}
          visits={visits}
          isFirstTimeClient={isFirstTimeClient}
          onOpenLashHistory={handleOpenLashHistory}
          onOpenFullHistory={() => setIsHistoryModalOpen(true)}
        />

        {/* Referral Diamond Banner (Khách Mới) */}
        {isNewCustomer && canManageReferral && (
          <ReferralDiamondBanner
            pendingReferral={pendingReferral}
            isDark={isDark}
            onOpenModal={() => setReferralModalOpen(true)}
          />
        )}
      </div>

      {/* Sticky Bottom Action Bar (Native iOS Floating Dock) */}
      <CheckInBottomActionBar
        booking={booking}
        isCheckInLocked={isCheckInLocked}
        activeServicingCustomerName={activeServicingCustomerName}
        onResumeServicing={onResumeServicing}
        isComboLive={isComboLive}
        hasQuickCheckIn={Boolean(onQuickCheckIn)}
        requiresNaturalLashCheck={requiresNaturalLashCheck}
        onExecuteQuickCheckIn={handleExecuteQuickCheckIn}
        onCheckIn={onCheckIn}
      />

      <CheckInModals
        pendingOverride={pendingOverride}
        setPendingOverride={setPendingOverride}
        selectedOverrideReasonDraft={selectedOverrideReasonDraft}
        setSelectedOverrideReasonDraft={setSelectedOverrideReasonDraft}
        pendingComboNewConfirmation={pendingComboNewConfirmation}
        setPendingComboNewConfirmation={setPendingComboNewConfirmation}
        isRotationInfoOpen={isRotationInfoOpen}
        setIsRotationInfoOpen={setIsRotationInfoOpen}
        activePointsBreakdown={activePointsBreakdown}
        isComboLive={isComboLive}
        preset={preset}
        serviceName={serviceName}
        quickServiceType={quickServiceType}
        quickUnderServiceType={quickUnderServiceType}
        booking={booking}
        selectedLashHistory={selectedLashHistory}
        isLashHistoryOpen={isLashHistoryOpen}
        setIsLashHistoryOpen={setIsLashHistoryOpen}
        isWalletModalOpen={isWalletModalOpen}
        setIsWalletModalOpen={setIsWalletModalOpen}
        isAdmin={isAdmin}
        onRefreshDb={onRefreshDb}
        resolvedWallets={resolvedWallets}
        onSelectComboWallet={onSelectComboWallet}
        isHistoryModalOpen={isHistoryModalOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        isSimulationMode={isSimulationMode}
      />

      {/* Referral Diamond Modal (Khách Mới) */}
      {referralModalOpen && isNewCustomer && canManageReferral && (
        <NewCustomerReferralModal
          newCustomerId={booking.customerId || 0}
          newCustomerName={customerName}
          isDark={isDark}
          onConfirm={(referral) => {
            setPendingReferral(referral);
            onReferralConfirmed?.(referral);
            setReferralModalOpen(false);
          }}
          onDismiss={() => setReferralModalOpen(false)}
        />
      )}
    </div>
  );
}
