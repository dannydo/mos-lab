'use client';

import { useCallback } from 'react';
import {
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  resolveEffectiveServiceTotal,
  resolveServicePriceSplit,
  resolveCheckoutTipBaseAmount,
  buildPercentageTipSuggestions,
  CHECKOUT_TIP_PERCENT_TIERS,
  calculateActorTipBreakdown,
} from '@mos-lab/shared';
import type {
  ActorTipBreakdown,
  CheckoutTipPercentTier,
  CvToCvPlusRequirements,
  IosPaymentMethod,
  IosPromotionOption,
  IosSimulationAttemptSummary,
  PercentTipSuggestionItem,
} from '@mos-lab/shared';
import { BookingItem } from './mockData';
import { ActiveActorProfile } from './iosActorProfile';
import { saveLocalProgressSnapshot, setActiveServicingBookingId, setActiveServicingStep } from './offlineSync';
import { buildSimBookingMetaPayload } from './useIosSimulationMode';
import {
  applyCartProductsUpdateToBookingDraft,
  applyCombosUpdateToBookingDraft,
  applyTargetPromotionToBookingDraft,
  buildRecomputedCheckoutBilling,
  buildRecordedTipBillingSnapshot,
  computeFreshBillingLineTotals,
  type CartProductItem,
  type SavePromotionTarget,
} from './iosBillingMath';
import {
  buildChoosePaymentBookingUpdate,
  buildGoToBillingBookingUpdate,
  type PaymentPromotionSelection,
  type PaymentZaloConsent,
  type UpsellPayload,
} from './iosBillingCheckoutBuilders';

export {
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  resolveEffectiveServiceTotal,
  resolveServicePriceSplit,
  resolveCheckoutTipBaseAmount,
  buildPercentageTipSuggestions,
  CHECKOUT_TIP_PERCENT_TIERS,
  calculateActorTipBreakdown,
  computeFreshBillingLineTotals,
};
export type {
  ActorTipBreakdown,
  CartProductItem,
  CheckoutTipPercentTier,
  CvToCvPlusRequirements,
  PercentTipSuggestionItem,
  SavePromotionTarget,
  UpsellPayload,
};

export interface UseIosBillingCheckoutParams {
  activeBookingId: number;
  activeBooking?: BookingItem;
  isSimulationMode?: boolean;
  onSimulationAttemptSaved?: (bookingId: number, attempt: IosSimulationAttemptSummary | undefined) => void;
  actor: ActiveActorProfile;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  /** Referral đang pending — sẽ được inject vào COMPLETE_ORDER để backend trao 100 KC */
  pendingReferral?: { referrerUserId: number; referrerName: string } | null;
  /** Callback để reset pendingReferral sau khi COMPLETE_ORDER thành công */
  onReferralGranted?: () => void;
  updateActiveBooking: (updater: (prev: BookingItem) => BookingItem) => void;
  postAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  refreshDb?: () => Promise<any>;
  setCurrentStep: (step: number) => void;
  setBookingSegment: (segment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL') => void;
}

export function useIosBillingCheckout({
  activeBookingId,
  activeBooking,
  isSimulationMode = false,
  onSimulationAttemptSaved,
  actor,
  cvPlusRules,
  pendingReferral,
  onReferralGranted,
  updateActiveBooking,
  postAction,
  refreshDb,
  setCurrentStep,
  setBookingSegment,
}: UseIosBillingCheckoutParams) {
  const dispatchCompleteOrder = useCallback(
    (payload: Record<string, any>) => {
      const simMeta =
        isSimulationMode && activeBooking ? { simBookingMeta: buildSimBookingMetaPayload(activeBooking) } : {};
      const walletSnapshot = activeBooking
        ? {
            selectedUpperComboBalanceId: activeBooking.selectedUpperComboBalanceId ?? null,
            selectedUnderComboBalanceId: activeBooking.selectedUnderComboBalanceId ?? null,
            skipUpperCombo: Boolean(activeBooking.skipUpperCombo),
            skipUnderCombo: Boolean(activeBooking.skipUnderCombo),
            hasUnderMinkCombo:
              !activeBooking.skipUnderCombo && Boolean(activeBooking.underMinkComboStatus?.hasUnderCombo),
          }
        : {};
      void postAction('COMPLETE_ORDER', { ...simMeta, ...walletSnapshot, ...payload }).then((res) => {
        if (res?.data?.attemptSnapshot) {
          onSimulationAttemptSaved?.(activeBookingId, res.data.attemptSnapshot);
        }
        // Reset pendingReferral sau khi order hoàn tất thành công
        if (!isSimulationMode) {
          onReferralGranted?.();
        }
        return refreshDb?.();
      });
    },
    [
      activeBooking,
      activeBookingId,
      isSimulationMode,
      onReferralGranted,
      onSimulationAttemptSaved,
      postAction,
      refreshDb,
    ]
  );

  // Step 12 -> 13: Go To Billing with Upsell
  const handleGoToBilling = useCallback(
    (upsellPayload?: UpsellPayload) => {
      updateActiveBooking((prev) => {
        const { nextBooking, postActionPayload } = buildGoToBillingBookingUpdate(
          prev,
          upsellPayload,
          actor,
          cvPlusRules
        );
        void postAction('SAVE_UPSELL_AND_CHECKOUT', postActionPayload);
        return nextBooking;
      });
      setCurrentStep(13);
    },
    [actor, cvPlusRules, postAction, setCurrentStep, updateActiveBooking]
  );

  // Step 13A: Persist selected/cleared itemized or fallback promotion during Checkout
  const handleSavePromotion = useCallback(
    (promotion: IosPromotionOption | null, target?: SavePromotionTarget) => {
      let nextBillingSnapshot: Record<string, any> | undefined;
      let nextCartProductsSnapshot: CartProductItem[] | undefined;
      let resolvedCustomerVisits = 1;

      updateActiveBooking((prev) => {
        resolvedCustomerVisits = prev.customerVisits ?? 1;

        const { draft: nextBookingDraft, updatedCartProducts } = applyTargetPromotionToBookingDraft(
          prev,
          promotion,
          target
        );
        if (updatedCartProducts) {
          nextCartProductsSnapshot = updatedCartProducts;
        }

        const nextBilling = buildRecomputedCheckoutBilling(nextBookingDraft);
        nextBillingSnapshot = nextBilling;
        return {
          ...nextBookingDraft,
          billing: nextBilling,
        };
      });

      void postAction('SAVE_PROMOTION', {
        promotionId: promotion?.promotionId ?? null,
        appliedPromotion: promotion,
        targetScope: target?.scope,
        productIndex: target?.productIndex,
        productId: target?.productId,
        ...(target?.scope === 'product' && nextCartProductsSnapshot ? { cartProducts: nextCartProductsSnapshot } : {}),
        customerVisits: resolvedCustomerVisits,
        billing: nextBillingSnapshot,
      });
    },
    [postAction, updateActiveBooking]
  );

  // Step 13B: Quick-add / update Yeppeum serum cart products directly from Checkout
  const handleUpdateCartProducts = useCallback(
    (nextProducts: CartProductItem[]) => {
      updateActiveBooking((prev) => applyCartProductsUpdateToBookingDraft(prev, nextProducts, actor.tier, cvPlusRules));
      void postAction('SAVE_UPSELL', { cartProducts: nextProducts });
    },
    [actor.tier, cvPlusRules, postAction, updateActiveBooking]
  );

  // Step 13C: Chọn / đổi / xóa hoặc chuyển chế độ Combo trực tiếp từ Checkout
  const handleUpdateCombos = useCallback(
    (payload: {
      selectedCombo: BookingItem['selectedCombo'];
      selectedUnderCombo: BookingItem['selectedUnderCombo'];
      comboRedemption?: BookingItem['comboRedemption'];
    }) => {
      updateActiveBooking((prev) => applyCombosUpdateToBookingDraft(prev, payload, actor.tier, cvPlusRules));
      void postAction('SAVE_UPSELL', payload);
    },
    [actor.tier, cvPlusRules, postAction, updateActiveBooking]
  );

  // Step 13: Choose Payment Method & Confirm Tip Directly & Diamond Wallet (One-Stop Checkout)
  const handleChoosePaymentMethod = useCallback(
    (
      method: IosPaymentMethod,
      chosenTip?: number,
      chosenDiamond?: number,
      proofPhoto?: string,
      zaloConsent?: PaymentZaloConsent,
      promotionSelection?: PaymentPromotionSelection
    ) => {
      const completedAt = new Date().toISOString();
      let calculatedBilling: any = null;
      let promoActionSnapshot: Record<string, any> = {};

      updateActiveBooking((prev) => {
        const result = buildChoosePaymentBookingUpdate(prev, {
          method,
          chosenTip,
          chosenDiamond,
          proofPhoto,
          zaloConsent,
          promotionSelection,
          actor,
          completedAt,
        });
        calculatedBilling = result.calculatedBilling;
        promoActionSnapshot = result.promoActionSnapshot;
        return result.nextBooking;
      });

      dispatchCompleteOrder({
        ...promoActionSnapshot,
        billing: calculatedBilling,
        status: 'DONE',
        completedAt,
        // Inject referral: backend sẽ kiểm tra guard duplicate và trao 100 KC
        ...(pendingReferral && !isSimulationMode
          ? {
              referralPending: {
                referrerUserId: pendingReferral.referrerUserId,
                referrerName: pendingReferral.referrerName,
              },
            }
          : {}),
      });
      setActiveServicingBookingId(null);
      setActiveServicingStep(null);
      saveLocalProgressSnapshot(activeBookingId, { status: 'DONE', completedAt, currentStep: 1 });
      setBookingSegment('DONE');
      setCurrentStep(15);
    },
    [
      activeBookingId,
      actor,
      dispatchCompleteOrder,
      isSimulationMode,
      pendingReferral,
      setBookingSegment,
      setCurrentStep,
      updateActiveBooking,
    ]
  );

  // Step 14: Record Tip (Kinh Thánh mOS Điều răn TIP-001 & CV-002: 70% Làm mi + 10% Check-in + 10% Check-out)
  const handleRecordTip = useCallback(
    (tipAmount: number) => {
      const completedAt = new Date().toISOString();
      let calculatedBilling: any = null;

      updateActiveBooking((prev) => {
        const nextBilling = buildRecordedTipBillingSnapshot(prev, tipAmount, actor.tier, completedAt);
        calculatedBilling = nextBilling;

        return {
          ...prev,
          status: 'DONE',
          orderState: nextBilling.settlementStatus === 'PENDING_COUNTER_SETTLEMENT' ? 'CheckOut' : 'Completed',
          checkOutStaffId: prev.checkOutStaffId || actor.staffId,
          checkOutStaffName: prev.checkOutStaffName || actor.name,
          checkOutStaffTier: prev.checkOutStaffTier || actor.tier,
          progress: {
            ...(prev.progress || { elapsedSeconds: 0, timerRunning: false }),
            completedAt,
            currentStep: 1,
          },
          billing: nextBilling,
        };
      });

      dispatchCompleteOrder({ billing: calculatedBilling, status: 'DONE', completedAt });
      setActiveServicingBookingId(null);
      setActiveServicingStep(null);
      saveLocalProgressSnapshot(activeBookingId, { status: 'DONE', completedAt, currentStep: 1 });
      setBookingSegment('DONE');
      setCurrentStep(15);
    },
    [activeBookingId, actor, dispatchCompleteOrder, setBookingSegment, setCurrentStep, updateActiveBooking]
  );

  // Step 15: Finish Order
  const handleFinishOrder = useCallback(() => {
    const completedAt = new Date().toISOString();
    let alreadyCompleted = false;
    updateActiveBooking((prev) => {
      alreadyCompleted = Boolean(prev.status === 'DONE' && prev.billing?.completedAt);
      return {
        ...prev,
        status: 'DONE',
        progress: {
          ...(prev.progress || { elapsedSeconds: 0, timerRunning: false }),
          completedAt: prev.progress?.completedAt || completedAt,
          currentStep: 1,
        },
        billing: prev.billing
          ? {
              ...prev.billing,
              completedAt: prev.billing.completedAt || completedAt,
            }
          : undefined,
      };
    });
    setActiveServicingBookingId(null);
    setActiveServicingStep(null);
    saveLocalProgressSnapshot(activeBookingId, { status: 'DONE', completedAt, currentStep: 1 });
    if (!alreadyCompleted) {
      dispatchCompleteOrder({ status: 'DONE', completedAt });
    } else {
      void refreshDb?.();
    }
    setBookingSegment('DONE');
    setCurrentStep(1);
  }, [activeBookingId, dispatchCompleteOrder, refreshDb, setBookingSegment, setCurrentStep, updateActiveBooking]);

  return {
    handleGoToBilling,
    handleSavePromotion,
    handleUpdateCartProducts,
    handleUpdateCombos,
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
  };
}
