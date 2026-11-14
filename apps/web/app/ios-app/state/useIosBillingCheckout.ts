'use client';

import { useCallback } from 'react';
import {
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  calculateIosPromotionDiscount,
  canDirectlySettleCounterPayment,
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
  IosPromotionOption,
  IosSettlementStatus,
  PercentTipSuggestionItem,
} from '@mos-lab/shared';
import { BookingItem } from './mockData';
import { ActiveActorProfile } from './iosActorProfile';
import { saveLocalProgressSnapshot, setActiveServicingBookingId, setActiveServicingStep } from './offlineSync';

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
};
export type { ActorTipBreakdown, CheckoutTipPercentTier, CvToCvPlusRequirements, PercentTipSuggestionItem };

export type CartProductItem = NonNullable<BookingItem['cartProducts']>[number];

export interface UpsellPayload {
  cartProducts?: CartProductItem[];
  selectedCombo?: NonNullable<BookingItem['selectedCombo']> | null;
  selectedUnderCombo?: NonNullable<BookingItem['selectedUnderCombo']> | null;
  comboRedemption?: NonNullable<BookingItem['comboRedemption']> | null;
}

export interface UseIosBillingCheckoutParams {
  activeBookingId: number;
  actor: ActiveActorProfile;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  updateActiveBooking: (updater: (prev: BookingItem) => BookingItem) => void;
  postAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  refreshDb?: () => Promise<any>;
  setCurrentStep: (step: number) => void;
  setBookingSegment: (segment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL') => void;
}

/**
 * Computes fresh service, combo, product, subtotal, and VAT totals from a booking's active items
 * so re-checking out an already-billed booking never freezes stale totals.
 */
export function computeFreshBillingLineTotals(
  booking: Pick<
    BookingItem,
    | 'servicePrice'
    | 'upgradePrice'
    | 'serviceName'
    | 'attributes'
    | 'comboLiveStatus'
    | 'underMinkComboStatus'
    | 'cartProducts'
    | 'selectedCombo'
    | 'selectedUnderCombo'
    | 'comboRedemption'
    | 'promotionId'
    | 'appliedPromotion'
    | 'billing'
  >
): {
  serviceTotal: number;
  comboTotal: number;
  productTotal: number;
  subtotal: number;
  promotionDiscountAmount: number;
  serviceDiscountAmount: number;
  comboDiscountAmount: number;
  productDiscountAmount: number;
  subtotalAfterDiscount: number;
  vatRate: number;
  vatAmount: number;
} {
  const hasUnderMinkComboActive = Boolean(
    booking.underMinkComboStatus?.hasUnderCombo && (booking.underMinkComboStatus?.remainingSessions ?? 0) > 0
  );
  const shouldUseOldUpperCombo = Boolean(
    booking.comboLiveStatus?.isComboLive &&
    (!booking.selectedCombo ||
      !booking.selectedCombo.todayUsageMode ||
      booking.selectedCombo.todayUsageMode === 'USE_OLD_COMBO')
  );
  const serviceTotal = resolveEffectiveServiceTotal({
    servicePrice: booking.servicePrice,
    upgradePrice: booking.upgradePrice,
    serviceName: booking.serviceName,
    isComboLive: shouldUseOldUpperCombo,
    hasUnderMink: booking.attributes?.hasUnderMink,
    underMinkServiceType: booking.attributes?.underMinkServiceType,
    hasUnderMinkCombo: hasUnderMinkComboActive,
    selectedCombo: booking.selectedCombo,
    selectedUnderCombo: booking.selectedUnderCombo,
    comboRedemption: booking.comboRedemption,
  });
  const productTotal = (booking.cartProducts || []).reduce((sum, p) => sum + p.price * p.quantity, 0);
  const comboTotal =
    (booking.selectedCombo ? booking.selectedCombo.price : 0) +
    (booking.selectedUnderCombo ? booking.selectedUnderCombo.price : 0);
  const subtotal = serviceTotal + comboTotal + productTotal;
  const vatRate = booking.billing?.vatRate ?? 0.08;
  const promoBreakdown = calculateIosPromotionDiscount({
    promotion: booking.appliedPromotion,
    serviceAmount: serviceTotal,
    upgradeAmount: booking.upgradePrice || 0,
    comboAmount: comboTotal,
    productAmount: productTotal,
    vatRate,
  });

  return {
    serviceTotal,
    comboTotal,
    productTotal,
    subtotal,
    promotionDiscountAmount: promoBreakdown.totalDiscount,
    serviceDiscountAmount: promoBreakdown.serviceDiscount,
    comboDiscountAmount: promoBreakdown.comboDiscount,
    productDiscountAmount: promoBreakdown.productDiscount,
    subtotalAfterDiscount: promoBreakdown.subtotalAfterDiscount,
    vatRate,
    vatAmount: promoBreakdown.vatAmount,
  };
}

export function useIosBillingCheckout({
  activeBookingId,
  actor,
  cvPlusRules,
  updateActiveBooking,
  postAction,
  refreshDb,
  setCurrentStep,
  setBookingSegment,
}: UseIosBillingCheckoutParams) {
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
        } = computeFreshBillingLineTotals({
          ...prev,
          cartProducts: nextProducts,
          selectedCombo: nextCombo,
          selectedUnderCombo: nextUnderCombo,
          comboRedemption: nextRedemption,
        });
        const tipAmount = prev.billing?.tipAmount ?? 0;
        const creditLocked = Boolean(prev.appliedPromotion && prev.appliedPromotion.isCreditAllowed === false);
        const diamondDiscountAmount = creditLocked ? 0 : (prev.billing?.diamondDiscountAmount ?? 0);

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
          comboRedemption: nextRedemption,
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
          comboRedemption: nextRedemption,
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
            promotionId: prev.appliedPromotion?.promotionId ?? prev.promotionId ?? null,
            promotionName: prev.appliedPromotion?.name ?? prev.billing?.promotionName,
            promotionDiscountAmount,
            serviceDiscountAmount,
            comboDiscountAmount,
            productDiscountAmount,
            ...(creditLocked ? { diamondUsed: 0, diamondDiscountAmount: 0 } : {}),
            grandTotal: Math.max(0, subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountAmount),
          },
        };
      });
      setCurrentStep(13);
    },
    [actor, cvPlusRules, postAction, setCurrentStep, updateActiveBooking]
  );

  // Step 13A: Persist selected/cleared promotion during Checkout
  const handleSavePromotion = useCallback(
    (promotion: IosPromotionOption | null) => {
      let nextBillingSnapshot: Record<string, any> | undefined;
      let resolvedCustomerVisits = 1;
      updateActiveBooking((prev) => {
        resolvedCustomerVisits = prev.customerVisits ?? 1;
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
        } = computeFreshBillingLineTotals({
          ...prev,
          promotionId: promotion?.promotionId ?? null,
          appliedPromotion: promotion,
        });
        const tipAmount = prev.billing?.tipAmount ?? 0;
        const creditLocked = Boolean(promotion && promotion.isCreditAllowed === false);
        const diamondUsed = creditLocked ? 0 : (prev.billing?.diamondUsed ?? 0);
        const diamondDiscountAmount = creditLocked ? 0 : diamondUsed * 1000;
        const grandTotal = Math.max(0, subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountAmount);

        const nextBilling = {
          ...(prev.billing || {}),
          subtotal,
          serviceTotal: freshServiceTotal,
          comboTotal: freshComboTotal,
          productTotal: freshProductTotal,
          vatRate,
          vatAmount,
          promotionId: promotion?.promotionId ?? null,
          promotionName: promotion?.name ?? undefined,
          promotionDiscountAmount,
          serviceDiscountAmount,
          comboDiscountAmount,
          productDiscountAmount,
          diamondUsed,
          diamondDiscountAmount,
          paymentMethod: prev.billing?.paymentMethod || ('VIETQR' as const),
          tipAmount,
          tipCvShare: prev.billing?.tipCvShare ?? Math.round(tipAmount * 0.7),
          tipCheckInShare: prev.billing?.tipCheckInShare ?? Math.round(tipAmount * 0.1),
          tipCheckOutShare: prev.billing?.tipCheckOutShare ?? Math.round(tipAmount * 0.1),
          tipCcShare: prev.billing?.tipCcShare ?? Math.round(tipAmount * 0.2),
          grandTotal,
        };
        nextBillingSnapshot = nextBilling;
        return {
          ...prev,
          promotionId: promotion?.promotionId ?? null,
          appliedPromotion: promotion,
          billing: nextBilling,
        };
      });

      void postAction('SAVE_PROMOTION', {
        promotionId: promotion?.promotionId ?? null,
        appliedPromotion: promotion,
        customerVisits: resolvedCustomerVisits,
        billing: nextBillingSnapshot,
      });
    },
    [postAction, updateActiveBooking]
  );

  // Step 13: Choose Payment Method & Confirm Tip Directly & Diamond Wallet (One-Stop Checkout)
  const handleChoosePaymentMethod = useCallback(
    (
      method: 'CASH' | 'POS' | 'VIETQR',
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
        promotionId: number | null;
        appliedPromotion: IosPromotionOption | null;
      }
    ) => {
      const completedAt = new Date().toISOString();
      let calculatedBilling: any = null;
      let chosenPromoId: number | null | undefined;
      let chosenPromoObj: IosPromotionOption | null | undefined;

      updateActiveBooking((prev) => {
        const tipAmount = chosenTip !== undefined ? chosenTip : (prev.billing?.tipAmount ?? 0);
        const cvShare = Math.round(tipAmount * 0.7);
        const checkInShare = Math.round(tipAmount * 0.1);
        const checkOutShare = Math.round(tipAmount * 0.1);
        const ccShare = checkInShare + checkOutShare;

        const effectivePromo =
          promotionSelection !== undefined ? promotionSelection.appliedPromotion : (prev.appliedPromotion ?? null);
        const effectivePromoId =
          promotionSelection !== undefined
            ? promotionSelection.promotionId
            : (effectivePromo?.promotionId ?? prev.promotionId ?? null);
        chosenPromoId = effectivePromoId;
        chosenPromoObj = effectivePromo;

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
        } = computeFreshBillingLineTotals({
          ...prev,
          promotionId: effectivePromoId,
          appliedPromotion: effectivePromo,
        });

        const totalBeforeDiamond = subtotalAfterDiscount + vatAmount + tipAmount;

        // 💎 TỶ GIÁ VÍ KIM CƯƠNG: 1 💎 = 1.000 VNĐ
        const DIAMOND_RATE = 1000;
        const currentDiamondBalance = prev.diamondBalance ?? 0;
        const creditLocked = Boolean(effectivePromo && effectivePromo.isCreditAllowed === false);
        const diamondUsed = creditLocked
          ? 0
          : Math.min(chosenDiamond ?? 0, currentDiamondBalance, Math.floor(totalBeforeDiamond / DIAMOND_RATE));
        const diamondDiscountAmount = diamondUsed * DIAMOND_RATE;
        const grandTotal = Math.max(0, totalBeforeDiamond - diamondDiscountAmount);
        const remainingDiamondBalance = Math.max(0, currentDiamondBalance - diamondUsed);

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
          promotionId: effectivePromoId,
          promotionName: effectivePromo?.name ?? undefined,
          promotionDiscountAmount,
          serviceDiscountAmount,
          comboDiscountAmount,
          productDiscountAmount,
          paymentMethod: method,
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
          ...prev,
          status: 'DONE',
          orderState: optimisticSettlement === 'PENDING_COUNTER_SETTLEMENT' ? 'CheckOut' : 'Completed',
          diamondBalance: remainingDiamondBalance,
          promotionId: effectivePromoId,
          appliedPromotion: effectivePromo,
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

      void postAction('COMPLETE_ORDER', {
        promotionId: chosenPromoId,
        appliedPromotion: chosenPromoObj,
        billing: calculatedBilling,
        status: 'DONE',
        completedAt,
      }).then(() => refreshDb?.());

      setActiveServicingBookingId(null);
      setActiveServicingStep(null);

      saveLocalProgressSnapshot(activeBookingId, {
        status: 'DONE',
        completedAt,
        currentStep: 1,
      });

      setBookingSegment('DONE');
      setCurrentStep(15);
    },
    [activeBookingId, actor, postAction, refreshDb, setBookingSegment, setCurrentStep, updateActiveBooking]
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
        } = computeFreshBillingLineTotals(prev);
        const creditLocked = Boolean(prev.appliedPromotion && prev.appliedPromotion.isCreditAllowed === false);
        const diamondDiscountAmount = creditLocked
          ? 0
          : (prev.billing?.diamondDiscountAmount ?? (prev.billing?.diamondUsed || 0) * 1000);
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

      void postAction('COMPLETE_ORDER', { billing: calculatedBilling, status: 'DONE', completedAt }).then(() =>
        refreshDb?.()
      );
      setActiveServicingBookingId(null);
      setActiveServicingStep(null);
      saveLocalProgressSnapshot(activeBookingId, {
        status: 'DONE',
        completedAt,
        currentStep: 1,
      });
      setBookingSegment('DONE');
      setCurrentStep(15);
    },
    [activeBookingId, actor, postAction, refreshDb, setBookingSegment, setCurrentStep, updateActiveBooking]
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
    saveLocalProgressSnapshot(activeBookingId, {
      status: 'DONE',
      completedAt,
      currentStep: 1,
    });
    if (!alreadyCompleted) {
      void postAction('COMPLETE_ORDER', { status: 'DONE', completedAt }).then(() => refreshDb?.());
    } else {
      void refreshDb?.();
    }
    setBookingSegment('DONE');
    setCurrentStep(1);
  }, [activeBookingId, postAction, refreshDb, setBookingSegment, setCurrentStep, updateActiveBooking]);

  return {
    handleGoToBilling,
    handleSavePromotion,
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
  };
}
