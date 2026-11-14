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
        const productTotal = nextProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
        const comboTotal = (nextCombo ? nextCombo.price : 0) + (nextUnderCombo ? nextUnderCombo.price : 0);

        const hasUnderMinkComboActive = Boolean(
          prev.underMinkComboStatus?.hasUnderCombo && (prev.underMinkComboStatus?.remainingSessions ?? 0) > 0
        );
        const shouldUseOldUpperCombo = Boolean(
          prev.comboLiveStatus?.isComboLive &&
          (!nextCombo || !nextCombo.todayUsageMode || nextCombo.todayUsageMode === 'USE_OLD_COMBO')
        );
        const effectiveServiceTotal = resolveEffectiveServiceTotal({
          servicePrice: prev.servicePrice,
          upgradePrice: prev.upgradePrice,
          serviceName: prev.serviceName,
          isComboLive: shouldUseOldUpperCombo,
          hasUnderMink: prev.attributes?.hasUnderMink,
          underMinkServiceType: prev.attributes?.underMinkServiceType,
          hasUnderMinkCombo: hasUnderMinkComboActive,
          selectedCombo: nextCombo,
          selectedUnderCombo: nextUnderCombo,
          comboRedemption: nextRedemption,
        });
        const subtotal = effectiveServiceTotal + comboTotal + productTotal;
        const tipAmount = prev.billing?.tipAmount ?? 0;

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
            subtotal,
            vatRate: 0.08,
            vatAmount: Math.round(subtotal * 0.08),
            serviceTotal: effectiveServiceTotal,
            comboTotal,
            productTotal,
            paymentMethod: prev.billing?.paymentMethod || 'VIETQR',
            tipAmount,
            tipCvShare: tipBreakdown.techShareAmount,
            tipCheckInShare: tipBreakdown.checkInShareAmount,
            tipCheckOutShare: tipBreakdown.checkOutShareAmount,
            tipCcShare: tipBreakdown.checkInShareAmount + tipBreakdown.checkOutShareAmount,
            grandTotal: subtotal + Math.round(subtotal * 0.08) + tipAmount,
          },
        };
      });
      setCurrentStep(13);
    },
    [actor, cvPlusRules, postAction, setCurrentStep, updateActiveBooking]
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
      }
    ) => {
      const completedAt = new Date().toISOString();
      let calculatedBilling: any = null;

      updateActiveBooking((prev) => {
        const tipAmount = chosenTip !== undefined ? chosenTip : (prev.billing?.tipAmount ?? 0);
        const cvShare = Math.round(tipAmount * 0.7);
        const checkInShare = Math.round(tipAmount * 0.1);
        const checkOutShare = Math.round(tipAmount * 0.1);
        const ccShare = checkInShare + checkOutShare;

        const hasUnderMinkComboActive = Boolean(
          prev.underMinkComboStatus?.hasUnderCombo && (prev.underMinkComboStatus?.remainingSessions ?? 0) > 0
        );
        const shouldUseOldUpperComboFallback = Boolean(
          prev.comboLiveStatus?.isComboLive &&
          (!prev.selectedCombo ||
            !prev.selectedCombo.todayUsageMode ||
            prev.selectedCombo.todayUsageMode === 'USE_OLD_COMBO')
        );
        const fallbackEffectiveService = resolveEffectiveServiceTotal({
          servicePrice: prev.servicePrice,
          upgradePrice: prev.upgradePrice,
          serviceName: prev.serviceName,
          isComboLive: shouldUseOldUpperComboFallback,
          hasUnderMink: prev.attributes?.hasUnderMink,
          underMinkServiceType: prev.attributes?.underMinkServiceType,
          hasUnderMinkCombo: hasUnderMinkComboActive,
          selectedCombo: prev.selectedCombo,
          selectedUnderCombo: prev.selectedUnderCombo,
          comboRedemption: prev.comboRedemption,
        });
        const fallbackProductTotal = (prev.cartProducts || []).reduce((s, p) => s + p.price * p.quantity, 0);
        const fallbackComboTotal =
          (prev.selectedCombo ? prev.selectedCombo.price : 0) +
          (prev.selectedUnderCombo ? prev.selectedUnderCombo.price : 0);
        const fallbackSubtotal = fallbackEffectiveService + fallbackComboTotal + fallbackProductTotal;

        const currentBilling = prev.billing || {
          subtotal: fallbackSubtotal,
          vatRate: 0.08,
          vatAmount: Math.round(fallbackSubtotal * 0.08),
          serviceTotal: fallbackEffectiveService,
          comboTotal: fallbackComboTotal,
          productTotal: fallbackProductTotal,
          paymentMethod: method,
          transferProofPhoto: undefined as string | undefined,
          zaloConsent: undefined as NonNullable<BookingItem['billing']>['zaloConsent'],
        };
        const subtotal = currentBilling.subtotal;
        const vatRate = currentBilling.vatRate ?? 0.08;
        const vatAmount = currentBilling.vatAmount ?? Math.round(subtotal * vatRate);
        const totalBeforeDiamond = subtotal + vatAmount + tipAmount;

        // 💎 TỶ GIÁ VÍ KIM CƯƠNG: 1 💎 = 1.000 VNĐ
        const DIAMOND_RATE = 1000;
        const currentDiamondBalance = prev.diamondBalance ?? 0;
        const diamondUsed = Math.min(
          chosenDiamond ?? 0,
          currentDiamondBalance,
          Math.floor(totalBeforeDiamond / DIAMOND_RATE)
        );
        const diamondDiscountAmount = diamondUsed * DIAMOND_RATE;
        const grandTotal = Math.max(0, totalBeforeDiamond - diamondDiscountAmount);
        const remainingDiamondBalance = Math.max(0, currentDiamondBalance - diamondUsed);

        const optimisticSettlement: IosSettlementStatus =
          grandTotal <= 0 || method === 'VIETQR' ? 'SETTLED_COMPLETED' : 'PENDING_COUNTER_SETTLEMENT';

        const nextBilling = {
          ...currentBilling,
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
          transferProofPhoto: proofPhoto || currentBilling.transferProofPhoto,
          zaloConsent: zaloConsent || currentBilling.zaloConsent,
          grandTotal,
          completedAt,
        };

        calculatedBilling = nextBilling;

        return {
          ...prev,
          status: 'DONE',
          diamondBalance: remainingDiamondBalance,
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
        const currentBilling = prev.billing || {
          subtotal: prev.servicePrice,
          vatRate: 0.08,
          vatAmount: Math.round(prev.servicePrice * 0.08),
          serviceTotal: prev.servicePrice,
          comboTotal: 0,
          productTotal: 0,
          paymentMethod: 'VIETQR' as const,
        };
        const subtotal = currentBilling.subtotal;
        const vatRate = currentBilling.vatRate ?? 0.08;
        const vatAmount = currentBilling.vatAmount ?? Math.round(subtotal * vatRate);
        const diamondDiscountAmount = prev.billing?.diamondDiscountAmount ?? (prev.billing?.diamondUsed || 0) * 1000;
        const grandTotal = Math.max(0, subtotal + vatAmount + tipAmount - diamondDiscountAmount);
        const method = currentBilling.paymentMethod || 'VIETQR';
        const optimisticSettlement: IosSettlementStatus =
          grandTotal <= 0 || method === 'VIETQR' ? 'SETTLED_COMPLETED' : 'PENDING_COUNTER_SETTLEMENT';

        const nextBilling = {
          ...currentBilling,
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
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
  };
}
