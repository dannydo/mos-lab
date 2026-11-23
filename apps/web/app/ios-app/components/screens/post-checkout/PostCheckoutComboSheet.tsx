'use client';

import React from 'react';
import { resolveValidVolumeForCategory, type CvToCvPlusRequirements } from '@mos-lab/shared';
import { AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../../../../../context/ThemeContext';
import type { ActiveActorProfile } from '../../../state/iosActorProfile';
import type { BookingItem } from '../../../state/mockData';
import { IosStaffVisibilityToggle } from '../../ui-kit/IosStaffVisibilityToggle';
import { PostCheckoutComboFormSections } from './PostCheckoutComboFormSections';
import { PostCheckoutPendingPanel, PostCheckoutReconciliationCard } from './PostCheckoutReconciliationCard';
import { PostCheckoutQrModalCluster } from './PostCheckoutQrModalCluster';
import { usePostCheckoutComboSheetState } from './usePostCheckoutComboSheetState';

export interface PostCheckoutComboSheetProps {
  open: boolean;
  onClose: () => void;
  booking: BookingItem;
  actor?: ActiveActorProfile;
  isAdmin?: boolean;
  isSimulationMode?: boolean;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  onAdjusted?: () => Promise<unknown> | void;
}

export function PostCheckoutComboSheet({
  open,
  onClose,
  booking,
  actor,
  isAdmin = false,
  isSimulationMode = false,
  cvPlusRules,
  onAdjusted,
}: PostCheckoutComboSheetProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const {
    staffOptions,
    selectedCheckOutStaffId,
    setSelectedCheckOutStaffId,
    activeCategoryId,
    setActiveCategoryId,
    activeVolume,
    setActiveVolume,
    upperPackages,
    selectedUpperComboId,
    setSelectedUpperComboId,
    selectedUpperPkg,
    underPackages,
    selectedUnderComboId,
    setSelectedUnderComboId,
    todaySingleServiceWaived,
    setTodaySingleServiceWaived,
    yeppeumCount,
    setYeppeumCount,
    selectedSerumTierId,
    setSelectedSerumTierId,
    tipAmount,
    setTipAmount,
    diamondUsed,
    setDiamondUsed,
    maxDiamonds,
    deltaMethod,
    setDeltaMethod,
    deltaSplit,
    setDeltaSplit,
    setPaymentMode,
    reason,
    setReason,
    rejectionReason,
    setRejectionReason,
    showStaffRewards,
    setShowStaffRewards,
    isQrModalOpen,
    setIsQrModalOpen,
    qrProofs,
    setQrProofs,
    isSubmitting,
    errorMsg,
    originalCheckOutStaffId,
    originalCheckOutStaffName,
    resolvedWallets,
    setSelectedUpperComboBalanceId,
    setSelectedUnderComboBalanceId,
    setSkipUpperCombo,
    setSkipUnderCombo,
    dualBonus,
    previousPaidTotal,
    newGrandTotal,
    delta,
    selectedStaff,
    tipBreakdown,
    serumBonusPreview,
    pending,
    canApproveCounter,
    isCheckoutCc,
    handleSubmitAdjustment,
    handleResolvePending,
  } = usePostCheckoutComboSheetState({
    open,
    onClose,
    booking,
    actor,
    isAdmin,
    isSimulationMode,
    cvPlusRules,
    onAdjusted,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-hidden overscroll-contain bg-black/70 backdrop-blur-xs pt-[max(16px,env(safe-area-inset-top,0px))] px-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Điều chỉnh gói Combo sau checkout"
    >
      <div
        className={`w-full max-w-xl max-h-[88dvh] sm:max-h-[86dvh] overflow-y-auto overscroll-contain touch-pan-y ios-touch-scroll pb-[env(safe-area-inset-bottom,0px)] rounded-t-3xl sm:rounded-3xl border shadow-2xl ${
          isDark ? 'bg-[#121214] border-neutral-800 text-neutral-100' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <div
          className={`sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3.5 border-b backdrop-blur-md ${
            isDark ? 'bg-[#121214]/95 border-neutral-800' : 'bg-white/95 border-gray-200'
          }`}
        >
          <div className="min-w-0">
            <h2 className="text-[15px] font-black leading-snug">Bổ Sung / Điều Chỉnh Gói Combo Sau Checkout</h2>
            <p className={`text-[11px] font-semibold truncate ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              {booking.customerName} · #{booking.orderNumber}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <IosStaffVisibilityToggle
              showStaffRewards={showStaffRewards}
              onToggle={() => setShowStaffRewards((v) => !v)}
              isDark={isDark}
            />
            <button
              type="button"
              aria-label="Đóng bảng điều chỉnh gói"
              onClick={onClose}
              className={`p-1.5 rounded-full border cursor-pointer ${
                isDark
                  ? 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  : 'bg-gray-100 border-gray-200 text-gray-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3.5">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/60 bg-rose-500/15 px-3 py-2 text-[11.5px] font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {pending ? (
            <PostCheckoutPendingPanel
              isDark={isDark}
              pending={pending}
              canApproveCounter={canApproveCounter}
              isRequester={Number(actor?.staffId || 0) === Number(pending.requestedByStaffId)}
              isSubmitting={isSubmitting}
              rejectionReason={rejectionReason}
              onChangeRejectionReason={setRejectionReason}
              onApprove={() => void handleResolvePending('APPROVE_POST_CHECKOUT_ADJUSTMENT')}
              onReject={(customReason) => void handleResolvePending('REJECT_POST_CHECKOUT_ADJUSTMENT', customReason)}
            />
          ) : (
            <>
              <PostCheckoutComboFormSections
                isDark={isDark}
                staffOptions={staffOptions}
                selectedCheckOutStaffId={selectedCheckOutStaffId}
                originalCheckOutStaffId={originalCheckOutStaffId}
                originalCheckOutStaffName={originalCheckOutStaffName}
                onSelectStaff={(s) => setSelectedCheckOutStaffId(s.staffId)}
                activeCategoryId={activeCategoryId}
                activeVolume={activeVolume}
                upperPackages={upperPackages}
                selectedUpperComboId={selectedUpperComboId}
                onSelectCategory={(catId) => {
                  setActiveCategoryId(catId);
                  setActiveVolume(resolveValidVolumeForCategory(catId, activeVolume));
                }}
                onSelectVolume={(vol) => setActiveVolume(vol)}
                onSelectUpperComboId={setSelectedUpperComboId}
                underPackages={underPackages}
                selectedUnderComboId={selectedUnderComboId}
                onSelectUnderComboId={setSelectedUnderComboId}
                todaySingleServiceWaived={todaySingleServiceWaived}
                onSetTodaySingleServiceWaived={setTodaySingleServiceWaived}
                yeppeumCount={yeppeumCount}
                selectedSerumTierId={selectedSerumTierId}
                onSetYeppeumCount={setYeppeumCount}
                onSetSelectedSerumTierId={setSelectedSerumTierId}
                tipAmount={tipAmount}
                onSetTipAmount={setTipAmount}
                diamondUsed={diamondUsed}
                maxDiamonds={maxDiamonds}
                onSetDiamondUsed={setDiamondUsed}
                resolvedWallets={resolvedWallets}
                hasUnderMink={Boolean(booking.attributes?.hasUnderMink)}
                onSelectUpperWallet={(balanceId) => {
                  setSelectedUpperComboBalanceId(balanceId);
                  setSkipUpperCombo(false);
                  if (!selectedUpperPkg) {
                    setTodaySingleServiceWaived(false);
                  }
                }}
                onSkipUpperWallet={() => {
                  setSelectedUpperComboBalanceId(null);
                  setSkipUpperCombo(true);
                }}
                onSelectUnderWallet={(balanceId) => {
                  setSelectedUnderComboBalanceId(balanceId);
                  setSkipUnderCombo(false);
                }}
                onSkipUnderWallet={() => {
                  setSelectedUnderComboBalanceId(null);
                  setSkipUnderCombo(true);
                }}
              />

              <PostCheckoutReconciliationCard
                isDark={isDark}
                previousPaidTotal={previousPaidTotal}
                newGrandTotal={newGrandTotal}
                delta={delta}
                deltaMethod={deltaMethod}
                deltaSplit={deltaSplit}
                reason={reason}
                showStaffRewards={showStaffRewards}
                selectedStaff={selectedStaff}
                originalCheckOutStaffName={originalCheckOutStaffName}
                isCheckoutCc={isCheckoutCc}
                dualComboBonusTotal={dualBonus.totalBonus}
                serumBonusPreview={serumBonusPreview}
                tipAmount={tipAmount}
                tipBreakdown={tipBreakdown}
                isSubmitting={isSubmitting}
                onSetPaymentMode={setPaymentMode}
                onSetDeltaMethod={setDeltaMethod}
                onSetDeltaSplit={setDeltaSplit}
                onSetReason={setReason}
                onOpenQr={() => setIsQrModalOpen(true)}
                qrPortionAmount={delta.deltaPaymentBreakdown.vietqrAmount}
                isPureTipDelta={
                  tipAmount > Number(booking.billing?.tipAmount || 0) &&
                  delta.amountToCollectNow > 0 &&
                  delta.amountToCollectNow <= Math.max(0, tipAmount - Number(booking.billing?.tipAmount || 0))
                }
                hasQrProofAttached={Boolean(qrProofs.transferProofPhoto)}
                onSubmit={() => void handleSubmitAdjustment()}
              />
            </>
          )}
        </div>
      </div>

      <PostCheckoutQrModalCluster
        open={isQrModalOpen}
        isDark={isDark}
        booking={booking}
        vietqrAmount={delta.deltaPaymentBreakdown.vietqrAmount}
        tipDeltaAmount={Math.max(0, tipAmount - Number(booking.billing?.tipAmount || 0))}
        onClose={() => setIsQrModalOpen(false)}
        onConfirmProofs={(proofs) => setQrProofs(proofs)}
      />
    </div>
  );
}
