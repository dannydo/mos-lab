'use client';

import { useCallback } from 'react';
import {
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  canDirectlySettleCounterPayment,
  resolveEffectiveServiceTotal,
  resolveServicePriceSplit,
  resolveCheckoutTipBaseAmount,
  buildPercentageTipSuggestions,
  CHECKOUT_TIP_PERCENT_TIERS,
  calculateActorTipBreakdown,
  resolveNormalizedPaymentBreakdown,
} from '@mos-lab/shared';
import type {
  ActorTipBreakdown,
  CheckoutTipPercentTier,
  CvToCvPlusRequirements,
  IosPaymentBreakdown,
  IosPaymentMethod,
  IosPromotionOption,
  IosSettlementStatus,
  IosSimulationAttemptSummary,
  PercentTipSuggestionItem,
} from '@mos-lab/shared';
import { BookingItem } from './mockData';
import { ActiveActorProfile } from './iosActorProfile';
import { saveLocalProgressSnapshot, setActiveServicingBookingId, setActiveServicingStep } from './offlineSync';
import { buildSimBookingMetaPayload } from './useIosSimulationMode';
import {
  applyCartProductsUpdateToBookingDraft,
  applyTargetPromotionToBookingDraft,
  buildRecomputedCheckoutBilling,
  computeFreshBillingLineTotals,
  type CartProductItem,
  type SavePromotionTarget,
} from './iosBillingMath';

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
};

export interface UpsellPayload {
  cartProducts?: CartProductItem[];
  selectedCombo?: NonNullable<BookingItem['selectedCombo']> | null;
  selectedUnderCombo?: NonNullable<BookingItem['selectedUnderCombo']> | null;
  comboRedemption?: NonNullable<BookingItem['comboRedemption']> | null;
  selectedUpperComboBalanceId?: number | null;
  selectedUnderComboBalanceId?: number | null;
  skipUpperCombo?: boolean;
  skipUnderCombo?: boolean;
}

export interface UseIosBillingCheckoutParams {
  activeBookingId: number;
  activeBooking?: BookingItem;
  isSimulationMode?: boolean;
  onSimulationAttemptSaved?: (bookingId: number, attempt: IosSimulationAttemptSummary | undefined) => void;
  actor: ActiveActorProfile;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
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
        return refreshDb?.();
      });
    },
    [activeBooking, activeBookingId, isSimulationMode, onSimulationAttemptSaved, postAction, refreshDb]
  );

  // Step 12 -> 13: Go To Billing with Upsell
  const handleGoToBilling = useCallback(
    (upsellPayload?: UpsellPayload) => {
      updateActiveBooking((prev) => {
        const nextProducts: CartProductItem[] =
          upsellPayload?.cartProducts !== undefined ? upsellPayload.cartProducts : prev.cartProducts || [];
        const nextCombo =
          upsellPayload?.selectedCombo !== undefined ? upsellPayload.selectedCombo : prev.selectedCombo || null;
        const nextUnderCombo =
          upsellPayload?.selectedUnderCombo !== undefined
            ? upsellPayload.selectedUnderCombo
            : prev.selectedUnderCombo || null;
        const nextRedemption =
          upsellPayload?.comboRedemption !== undefined ? upsellPayload.comboRedemption : prev.comboRedemption || null;
        const nextUpperBalanceId =
          upsellPayload?.selectedUpperComboBalanceId !== undefined
            ? upsellPayload.selectedUpperComboBalanceId
            : (prev.selectedUpperComboBalanceId ?? null);
        const nextUnderBalanceId =
          upsellPayload?.selectedUnderComboBalanceId !== undefined
            ? upsellPayload.selectedUnderComboBalanceId
            : (prev.selectedUnderComboBalanceId ?? null);
        const nextSkipUpper =
          upsellPayload?.skipUpperCombo !== undefined
            ? Boolean(upsellPayload.skipUpperCombo)
            : Boolean(prev.skipUpperCombo);
        const nextSkipUnder =
          upsellPayload?.skipUnderCombo !== undefined
            ? Boolean(upsellPayload.skipUnderCombo)
            : Boolean(prev.skipUnderCombo);
        const {
          serviceTotal: effectiveServiceTotal,
          comboTotal,
          productTotal,
          subtotal,
          promotionDiscountAmount,
          serviceDiscountAmount,
          comboDiscountAmount,
          productDiscountAmount,
          subtotalAfterDiscount,
          vatRate,
          vatAmount,
          creditEligiblePayableWithVat,
          hasAnyCreditRestrictedItem,
          isFullCreditLocked,
          unifiedOrderPromotionId,
          primaryPromotion,
        } = computeFreshBillingLineTotals({
          ...prev,
          cartProducts: nextProducts,
          selectedCombo: nextCombo,
          selectedUnderCombo: nextUnderCombo,
          comboRedemption: nextSkipUpper ? null : nextRedemption,
          selectedUpperComboBalanceId: nextUpperBalanceId,
          selectedUnderComboBalanceId: nextUnderBalanceId,
          skipUpperCombo: nextSkipUpper,
          skipUnderCombo: nextSkipUnder,
        });
        const tipAmount = prev.billing?.tipAmount ?? 0;
        const maxEligibleDiamonds = Math.floor(creditEligiblePayableWithVat / 1000);
        const clampedDiamondUsed = isFullCreditLocked
          ? 0
          : hasAnyCreditRestrictedItem
            ? Math.max(0, Math.min(prev.billing?.diamondUsed ?? 0, maxEligibleDiamonds))
            : (prev.billing?.diamondUsed ?? 0);
        const diamondDiscountAmount = isFullCreditLocked
          ? 0
          : hasAnyCreditRestrictedItem
            ? clampedDiamondUsed * 1000
            : (prev.billing?.diamondDiscountAmount ?? 0);

        const isActorCc = actor.tier === 'CC';
        const isTrainingMenteeOrder = Boolean(prev.isTrainingCvlOrder);
        const dualBonus = calculateDualComboTierBonus(
          nextCombo ? Number(nextCombo.price || 0) : 0,
          nextUnderCombo ? Number(nextUnderCombo.price || 0) : 0,
          cvPlusRules
        );
        const comboBonusAmount = isActorCc ? 0 : dualBonus.totalBonus;
        const serumBonusAmount = isActorCc
          ? 0
          : nextProducts.reduce(
              (sum, p) =>
                sum +
                (p.cvBonus !== undefined
                  ? p.cvBonus * p.quantity
                  : calculateCvSerumTierBonus(p.price, p.quantity, cvPlusRules)),
              0
            );

        const shouldCreditComboToTech = !isActorCc || isTrainingMenteeOrder;
        const resolvedNextCombo = nextCombo
          ? { ...nextCombo, bonus: shouldCreditComboToTech ? dualBonus.upperBonus : 0 }
          : null;
        const resolvedNextUnderCombo = nextUnderCombo
          ? { ...nextUnderCombo, bonus: shouldCreditComboToTech ? dualBonus.underBonus : 0 }
          : null;

        void postAction('SAVE_UPSELL_AND_CHECKOUT', {
          cartProducts: nextProducts,
          selectedCombo: resolvedNextCombo,
          selectedUnderCombo: resolvedNextUnderCombo,
          comboRedemption: nextSkipUpper ? null : nextRedemption,
          selectedUpperComboBalanceId: nextUpperBalanceId,
          selectedUnderComboBalanceId: nextUnderBalanceId,
          skipUpperCombo: nextSkipUpper,
          skipUnderCombo: nextSkipUnder,
          hasUnderMinkCombo: !nextSkipUnder && Boolean(prev.underMinkComboStatus?.hasUnderCombo),
        });

        const tipBreakdown = calculateActorTipBreakdown(
          {
            ...prev,
            checkOutStaffId: actor.staffId,
            checkOutStaffName: actor.name,
          },
          actor,
          tipAmount
        );

        return {
          ...prev,
          checkOutStaffId: actor.staffId,
          checkOutStaffName: actor.name,
          checkOutStaffTier: actor.tier,
          cartProducts: nextProducts,
          selectedCombo: resolvedNextCombo,
          selectedUnderCombo: resolvedNextUnderCombo,
          comboRedemption: nextSkipUpper ? null : nextRedemption,
          selectedUpperComboBalanceId: nextUpperBalanceId,
          selectedUnderComboBalanceId: nextUnderBalanceId,
          skipUpperCombo: nextSkipUpper,
          skipUnderCombo: nextSkipUnder,
          _localComboUpdatedAt: Date.now(),
          cvRewardBreakdown: {
            techTipPercent: 70,
            checkInTipPercent: 10,
            checkOutTipPercent: 10,
            cvTotalTipPercent: tipBreakdown.actorEarnedPercent,
            comboBonusAmount,
            serumBonusAmount,
            totalOrderBonusForCheckoutStaff: comboBonusAmount + serumBonusAmount,
          },
          billing: {
            ...(prev.billing || {}),
            subtotal,
            vatRate,
            vatAmount,
            serviceTotal: effectiveServiceTotal,
            comboTotal,
            productTotal,
            paymentMethod: prev.billing?.paymentMethod || 'VIETQR',
            tipAmount,
            tipCvShare: tipBreakdown.techShareAmount,
            tipCheckInShare: tipBreakdown.checkInShareAmount,
            tipCheckOutShare: tipBreakdown.checkOutShareAmount,
            tipCcShare: tipBreakdown.checkInShareAmount + tipBreakdown.checkOutShareAmount,
            promotionId: unifiedOrderPromotionId ?? primaryPromotion?.promotionId ?? prev.promotionId ?? null,
            promotionName: primaryPromotion?.name ?? prev.billing?.promotionName,
            promotionDiscountAmount,
            serviceDiscountAmount,
            comboDiscountAmount,
            productDiscountAmount,
            ...(isFullCreditLocked || hasAnyCreditRestrictedItem
              ? { diamondUsed: clampedDiamondUsed, diamondDiscountAmount }
              : {}),
            grandTotal: Math.max(0, subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountAmount),
          },
        };
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

  // Step 13: Choose Payment Method & Confirm Tip Directly & Diamond Wallet (One-Stop Checkout)
  const handleChoosePaymentMethod = useCallback(
    (
      method: IosPaymentMethod,
      chosenTip?: number,
      chosenDiamond?: number,
      proofPhoto?: string,
      zaloConsent?: {
        agreed: boolean;
        phone: string;
        sentAt?: string;
        voucherCode?: string;
      },
      promotionSelection?: {
        promotionId?: number | null;
        appliedPromotion?: IosPromotionOption | null;
        servicePromotionId?: number | null;
        servicePromotion?: IosPromotionOption | null;
        comboPromotionId?: number | null;
        comboPromotion?: IosPromotionOption | null;
        underComboPromotionId?: number | null;
        underComboPromotion?: IosPromotionOption | null;
        cartProducts?: CartProductItem[];
        paymentBreakdown?: IosPaymentBreakdown;
      }
    ) => {
      const completedAt = new Date().toISOString();
      let calculatedBilling: any = null;
      let promoActionSnapshot: Record<string, any> = {};

      updateActiveBooking((prev) => {
        const tipAmount = chosenTip !== undefined ? chosenTip : (prev.billing?.tipAmount ?? 0);
        const cvShare = Math.round(tipAmount * 0.7);
        const checkInShare = Math.round(tipAmount * 0.1);
        const checkOutShare = Math.round(tipAmount * 0.1);
        const ccShare = checkInShare + checkOutShare;

        const nextBookingDraft: BookingItem = {
          ...prev,
          promotionId:
            promotionSelection?.promotionId !== undefined ? promotionSelection.promotionId : prev.promotionId,
          appliedPromotion:
            promotionSelection?.appliedPromotion !== undefined
              ? promotionSelection.appliedPromotion
              : prev.appliedPromotion,
          servicePromotionId:
            promotionSelection?.servicePromotionId !== undefined
              ? promotionSelection.servicePromotionId
              : prev.servicePromotionId,
          servicePromotion:
            promotionSelection?.servicePromotion !== undefined
              ? promotionSelection.servicePromotion
              : prev.servicePromotion,
          comboPromotionId:
            promotionSelection?.comboPromotionId !== undefined
              ? promotionSelection.comboPromotionId
              : prev.comboPromotionId,
          comboPromotion:
            promotionSelection?.comboPromotion !== undefined ? promotionSelection.comboPromotion : prev.comboPromotion,
          underComboPromotionId:
            promotionSelection?.underComboPromotionId !== undefined
              ? promotionSelection.underComboPromotionId
              : prev.underComboPromotionId,
          underComboPromotion:
            promotionSelection?.underComboPromotion !== undefined
              ? promotionSelection.underComboPromotion
              : prev.underComboPromotion,
          cartProducts:
            promotionSelection?.cartProducts !== undefined ? promotionSelection.cartProducts : prev.cartProducts,
        };

        const {
          serviceTotal: freshServiceTotal,
          comboTotal: freshComboTotal,
          productTotal: freshProductTotal,
          subtotal,
          promotionDiscountAmount,
          serviceDiscountAmount,
          comboDiscountAmount,
          productDiscountAmount,
          subtotalAfterDiscount,
          vatRate,
          vatAmount,
          creditEligiblePayableWithVat,
          hasAnyCreditRestrictedItem,
          isFullCreditLocked,
          unifiedOrderPromotionId,
          primaryPromotion,
        } = computeFreshBillingLineTotals(nextBookingDraft);

        const totalBeforeDiamond = subtotalAfterDiscount + vatAmount + tipAmount;

        // 💎 TỶ GIÁ VÍ KIM CƯƠNG: 1 💎 = 1.000 VNĐ
        const DIAMOND_RATE = 1000;
        const currentDiamondBalance = prev.diamondBalance ?? 0;
        const maxDiamondVnd = isFullCreditLocked
          ? 0
          : hasAnyCreditRestrictedItem
            ? creditEligiblePayableWithVat
            : totalBeforeDiamond;
        const diamondUsed = Math.min(
          chosenDiamond ?? 0,
          currentDiamondBalance,
          Math.floor(maxDiamondVnd / DIAMOND_RATE)
        );
        const diamondDiscountAmount = diamondUsed * DIAMOND_RATE;
        const grandTotal = Math.max(0, totalBeforeDiamond - diamondDiscountAmount);
        const remainingDiamondBalance = Math.max(0, currentDiamondBalance - diamondUsed);

        const effectiveOrderPromoId =
          unifiedOrderPromotionId ?? nextBookingDraft.promotionId ?? primaryPromotion?.promotionId ?? null;
        promoActionSnapshot = {
          promotionId: effectiveOrderPromoId,
          appliedPromotion: nextBookingDraft.appliedPromotion ?? null,
          servicePromotionId:
            nextBookingDraft.servicePromotion?.promotionId ?? nextBookingDraft.servicePromotionId ?? null,
          servicePromotion: nextBookingDraft.servicePromotion ?? null,
          comboPromotionId: nextBookingDraft.comboPromotion?.promotionId ?? nextBookingDraft.comboPromotionId ?? null,
          comboPromotion: nextBookingDraft.comboPromotion ?? null,
          underComboPromotionId:
            nextBookingDraft.underComboPromotion?.promotionId ?? nextBookingDraft.underComboPromotionId ?? null,
          underComboPromotion: nextBookingDraft.underComboPromotion ?? null,
          cartProducts: nextBookingDraft.cartProducts,
        };

        const normalizedPayment = resolveNormalizedPaymentBreakdown(
          grandTotal,
          method,
          promotionSelection?.paymentBreakdown ?? (method === 'MIXED' ? prev.billing?.paymentBreakdown : undefined)
        );
        const optimisticSettlement: IosSettlementStatus =
          grandTotal <= 0 || normalizedPayment.isPureVietqrOrZero || canDirectlySettleCounterPayment(actor.tier)
            ? 'SETTLED_COMPLETED'
            : 'PENDING_COUNTER_SETTLEMENT';

        const nextBilling = {
          ...(prev.billing || {}),
          subtotal,
          serviceTotal: freshServiceTotal,
          comboTotal: freshComboTotal,
          productTotal: freshProductTotal,
          promotionId: effectiveOrderPromoId,
          promotionName: primaryPromotion?.name ?? nextBookingDraft.appliedPromotion?.name ?? undefined,
          promotionDiscountAmount,
          serviceDiscountAmount,
          comboDiscountAmount,
          productDiscountAmount,
          paymentMethod: normalizedPayment.paymentMethod,
          paymentBreakdown: normalizedPayment.breakdown,
          settlementStatus: optimisticSettlement,
          vatRate,
          vatAmount,
          tipAmount,
          tipCvShare: cvShare,
          tipCheckInShare: checkInShare,
          tipCheckOutShare: checkOutShare,
          tipCcShare: ccShare,
          diamondUsed,
          diamondDiscountAmount,
          transferProofPhoto: proofPhoto || prev.billing?.transferProofPhoto,
          zaloConsent: zaloConsent || prev.billing?.zaloConsent,
          grandTotal,
          completedAt,
        };

        calculatedBilling = nextBilling;

        return {
          ...nextBookingDraft,
          status: 'DONE',
          orderState: optimisticSettlement === 'PENDING_COUNTER_SETTLEMENT' ? 'CheckOut' : 'Completed',
          diamondBalance: remainingDiamondBalance,
          promotionId: effectiveOrderPromoId,
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

      dispatchCompleteOrder({ ...promoActionSnapshot, billing: calculatedBilling, status: 'DONE', completedAt });
      setActiveServicingBookingId(null);
      setActiveServicingStep(null);
      saveLocalProgressSnapshot(activeBookingId, { status: 'DONE', completedAt, currentStep: 1 });
      setBookingSegment('DONE');
      setCurrentStep(15);
    },
    [activeBookingId, actor, dispatchCompleteOrder, setBookingSegment, setCurrentStep, updateActiveBooking]
  );

  // Step 14: Record Tip (Kinh Thánh mOS Điều răn TIP-001 & CV-002: 70% Làm mi + 10% Check-in + 10% Check-out)
  const handleRecordTip = useCallback(
    (tipAmount: number) => {
      const completedAt = new Date().toISOString();
      let calculatedBilling: any = null;

      updateActiveBooking((prev) => {
        const cvShare = Math.round(tipAmount * 0.7);
        const checkInShare = Math.round(tipAmount * 0.1);
        const checkOutShare = Math.round(tipAmount * 0.1);
        const ccShare = checkInShare + checkOutShare;
        const {
          serviceTotal: freshServiceTotal,
          comboTotal: freshComboTotal,
          productTotal: freshProductTotal,
          subtotal,
          promotionDiscountAmount,
          subtotalAfterDiscount,
          vatRate,
          vatAmount,
          creditEligiblePayableWithVat,
          hasAnyCreditRestrictedItem,
          isFullCreditLocked,
        } = computeFreshBillingLineTotals(prev);
        const maxEligibleDiamonds = Math.floor(creditEligiblePayableWithVat / 1000);
        const rawDiamondUsed = prev.billing?.diamondUsed ?? 0;
        const clampedDiamondUsed = isFullCreditLocked
          ? 0
          : hasAnyCreditRestrictedItem
            ? Math.max(0, Math.min(rawDiamondUsed, maxEligibleDiamonds))
            : rawDiamondUsed;
        const diamondDiscountAmount = isFullCreditLocked
          ? 0
          : hasAnyCreditRestrictedItem
            ? clampedDiamondUsed * 1000
            : (prev.billing?.diamondDiscountAmount ?? rawDiamondUsed * 1000);
        const grandTotal = Math.max(0, subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountAmount);
        const method = prev.billing?.paymentMethod || 'VIETQR';
        const optimisticSettlement: IosSettlementStatus =
          grandTotal <= 0 || method === 'VIETQR' || canDirectlySettleCounterPayment(actor.tier)
            ? 'SETTLED_COMPLETED'
            : 'PENDING_COUNTER_SETTLEMENT';

        const nextBilling = {
          ...(prev.billing || {}),
          subtotal,
          serviceTotal: freshServiceTotal,
          comboTotal: freshComboTotal,
          productTotal: freshProductTotal,
          promotionDiscountAmount,
          paymentMethod: method,
          settlementStatus: optimisticSettlement,
          vatRate,
          vatAmount,
          tipAmount,
          tipCvShare: cvShare,
          tipCheckInShare: checkInShare,
          tipCheckOutShare: checkOutShare,
          tipCcShare: ccShare,
          grandTotal,
          completedAt,
        };

        calculatedBilling = nextBilling;

        return {
          ...prev,
          status: 'DONE',
          orderState: optimisticSettlement === 'PENDING_COUNTER_SETTLEMENT' ? 'CheckOut' : 'Completed',
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
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
  };
}
