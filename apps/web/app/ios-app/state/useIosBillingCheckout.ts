'use client';

import { useCallback } from 'react';
import { BookingItem } from './mockData';
import { ActiveActorProfile } from './useIosAppState';
import { saveLocalProgressSnapshot, setActiveServicingBookingId, setActiveServicingStep } from './offlineSync';

export type CartProductItem = NonNullable<BookingItem['cartProducts']>[number];

export interface UpsellPayload {
  cartProducts?: CartProductItem[];
  selectedCombo?: NonNullable<BookingItem['selectedCombo']> | null;
  selectedUnderCombo?: NonNullable<BookingItem['selectedUnderCombo']> | null;
  comboRedemption?: NonNullable<BookingItem['comboRedemption']> | null;
}

/**
 * Thưởng hoa hồng Combo CVL (Kinh Thánh mOS Điều răn COMBO-REWARD-001):
 * - Dưới 2M: +50K
 * - Mỗi 1M kế tiếp: +50K (2M -> 100K, 3M -> 150K, 4M -> 200K, 9M -> 450K...)
 */
export function calculateCvComboTierBonus(comboPrice: number): number {
  if (!comboPrice || comboPrice <= 0) return 0;
  if (comboPrice < 2000000) return 50000;
  return Math.floor(comboPrice / 1000000) * 50000;
}

export function calculateCvSerumTierBonus(unitPrice: number, quantity: number): number {
  if (!quantity || quantity <= 0) return 0;
  let perUnit = 1000;
  if (unitPrice >= 1000000) perUnit = 100000;
  else if (unitPrice > 550000) perUnit = 50000;
  else if (unitPrice > 0) perUnit = 10000;
  else perUnit = 1000;
  return perUnit * quantity;
}

/**
 * Chuẩn hóa tiền dịch vụ ca hôm nay (Kinh Thánh mOS):
 * - Nếu khách đang có gói Combo Live và trừ lượt gói (comboRedemption):
 *   luôn ưu tiên lấy theo comboRedemption.totalCustomerPayToday (0đ hoặc phụ thu nâng cấp),
 *   kể cả khi khách đồng thời mua thêm gói Combo mới để gia hạn (selectedCombo)!
 * - Nếu khách không có gói Combo Live cũ mà mua gói mới lần đầu (selectedCombo):
 *   xét selectedCombo.todaySingleServiceWaived ? 0 : servicePrice.
 */
export function resolveEffectiveServiceTotal(params: {
  servicePrice?: number;
  upgradePrice?: number;
  isComboLive?: boolean;
  selectedCombo?: Partial<NonNullable<BookingItem['selectedCombo']>> | null;
  comboRedemption?: Partial<NonNullable<BookingItem['comboRedemption']>> | null;
}): number {
  const baseServicePrice = Number(params.servicePrice ?? 0);
  const upgradePrice = Number(params.upgradePrice ?? 0);

  if (params.comboRedemption) {
    return Number(params.comboRedemption.totalCustomerPayToday ?? 0);
  }
  if (params.selectedCombo) {
    if (params.selectedCombo.todaySingleServiceWaived) {
      return 0;
    }
    return params.isComboLive ? upgradePrice : baseServicePrice;
  }
  if (params.isComboLive) {
    return upgradePrice;
  }
  return baseServicePrice;
}

export interface ActorTipBreakdown {
  tipAmount: number;
  techStaffId: number;
  techStaffName: string;
  techShareAmount: number; // 70%
  checkInStaffId: number;
  checkInStaffName: string;
  checkInShareAmount: number; // 10%
  checkOutStaffId: number;
  checkOutStaffName: string;
  checkOutShareAmount: number; // 10%
  fundShareAmount: number; // 10%
  actorEarnedPercent: number; // 0 | 10 | 20 | 70 | 80 | 90
  actorEarnedAmount: number;
  actorRoleSummary: string;
}

/**
 * Bóc tách tiền Tip theo đúng staffId thực tế từng khâu (Điều răn TIP-001 & CV-002):
 * - 70% Chuyên Viên làm mi (assignedStaffId)
 * - 10% Nhân sự đón khách Check-in (checkInStaffId)
 * - 10% Nhân sự tiễn khách Check-out (checkOutStaffId)
 * - 10% Quỹ vận hành chung
 */
export function calculateActorTipBreakdown(
  booking?: Partial<BookingItem> | null,
  actor?: Partial<ActiveActorProfile> | null,
  overrideTipAmount?: number
): ActorTipBreakdown {
  const tipAmount = Math.max(0, Number(overrideTipAmount ?? booking?.billing?.tipAmount ?? 0));
  const actorStaffId = Number(actor?.staffId || 0);
  const actorName = actor?.name || 'Chuyên Viên';

  const techStaffId = Number(booking?.assignedStaffId || actorStaffId || 0);
  const techStaffName = booking?.assignedStaffName || actorName;

  const checkInStaffId = Number(booking?.checkInStaffId || techStaffId || actorStaffId || 0);
  const checkInStaffName = booking?.checkInStaffName || techStaffName;

  const checkOutStaffId = Number(booking?.checkOutStaffId || actorStaffId || techStaffId || 0);
  const checkOutStaffName = booking?.checkOutStaffName || actorName;

  const techShareAmount = Math.round(tipAmount * 0.7);
  const checkInShareAmount = Math.round(tipAmount * 0.1);
  const checkOutShareAmount = Math.round(tipAmount * 0.1);
  const fundShareAmount = Math.max(0, tipAmount - techShareAmount - checkInShareAmount - checkOutShareAmount);

  const isActorTech = actorStaffId > 0 && techStaffId === actorStaffId;
  const isActorCheckIn = actorStaffId > 0 && checkInStaffId === actorStaffId;
  const isActorCheckOut = actorStaffId > 0 && checkOutStaffId === actorStaffId;

  const actorEarnedPercent = (isActorTech ? 70 : 0) + (isActorCheckIn ? 10 : 0) + (isActorCheckOut ? 10 : 0);
  const actorEarnedAmount =
    (isActorTech ? techShareAmount : 0) +
    (isActorCheckIn ? checkInShareAmount : 0) +
    (isActorCheckOut ? checkOutShareAmount : 0);

  const roles: string[] = [];
  if (isActorTech) roles.push('Làm mi 70%');
  if (isActorCheckIn) roles.push('Check-in 10%');
  if (isActorCheckOut) roles.push('Check-out 10%');

  return {
    tipAmount,
    techStaffId,
    techStaffName,
    techShareAmount,
    checkInStaffId,
    checkInStaffName,
    checkInShareAmount,
    checkOutStaffId,
    checkOutStaffName,
    checkOutShareAmount,
    fundShareAmount,
    actorEarnedPercent,
    actorEarnedAmount,
    actorRoleSummary: roles.length > 0 ? roles.join(' + ') : 'Hỗ trợ ca (0%)',
  };
}

export interface UseIosBillingCheckoutParams {
  activeBookingId: number;
  actor: ActiveActorProfile;
  updateActiveBooking: (updater: (prev: BookingItem) => BookingItem) => void;
  postAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  setCurrentStep: (step: number) => void;
  setBookingSegment: (segment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL') => void;
}

export function useIosBillingCheckout({
  activeBookingId,
  actor,
  updateActiveBooking,
  postAction,
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

        const effectiveServiceTotal = resolveEffectiveServiceTotal({
          servicePrice: prev.servicePrice,
          upgradePrice: prev.upgradePrice,
          isComboLive: Boolean(prev.comboLiveStatus?.isComboLive),
          selectedCombo: nextCombo,
          comboRedemption: nextRedemption,
        });
        const subtotal = effectiveServiceTotal + comboTotal + productTotal;
        const tipAmount = prev.billing?.tipAmount ?? 0;

        const comboBonusAmount = calculateCvComboTierBonus(comboTotal);
        const serumBonusAmount = nextProducts.reduce((sum, p) => sum + (p.cvBonus || 0) * p.quantity, 0);

        let resolvedNextCombo = nextCombo;
        let resolvedNextUnderCombo = nextUnderCombo;
        if (nextCombo && nextUnderCombo && comboTotal > 0) {
          resolvedNextCombo = { ...nextCombo, bonus: comboBonusAmount };
          resolvedNextUnderCombo = { ...nextUnderCombo, bonus: 0 };
        } else if (nextCombo) {
          resolvedNextCombo = { ...nextCombo, bonus: comboBonusAmount };
        } else if (nextUnderCombo) {
          resolvedNextUnderCombo = { ...nextUnderCombo, bonus: comboBonusAmount };
        }

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
    [actor, postAction, setCurrentStep, updateActiveBooking]
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

        const fallbackEffectiveService = resolveEffectiveServiceTotal({
          servicePrice: prev.servicePrice,
          upgradePrice: prev.upgradePrice,
          isComboLive: Boolean(prev.comboLiveStatus?.isComboLive),
          selectedCombo: prev.selectedCombo,
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

        const nextBilling = {
          ...currentBilling,
          paymentMethod: method,
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
      });

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
    [activeBookingId, actor, postAction, setBookingSegment, setCurrentStep, updateActiveBooking]
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
        const grandTotal = subtotal + vatAmount + tipAmount;

        const nextBilling = {
          ...currentBilling,
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

      void postAction('COMPLETE_ORDER', { billing: calculatedBilling, status: 'DONE', completedAt });
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
    [activeBookingId, actor, postAction, setBookingSegment, setCurrentStep, updateActiveBooking]
  );

  // Step 15: Finish Order
  const handleFinishOrder = useCallback(() => {
    const completedAt = new Date().toISOString();
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'DONE',
      progress: {
        ...(prev.progress || { elapsedSeconds: 0, timerRunning: false }),
        completedAt,
        currentStep: 1,
      },
      billing: prev.billing
        ? {
            ...prev.billing,
            completedAt: prev.billing.completedAt || completedAt,
          }
        : undefined,
    }));
    setActiveServicingBookingId(null);
    setActiveServicingStep(null);
    saveLocalProgressSnapshot(activeBookingId, {
      status: 'DONE',
      completedAt,
      currentStep: 1,
    });
    void postAction('COMPLETE_ORDER', { status: 'DONE', completedAt });
    setBookingSegment('DONE');
    setCurrentStep(1);
  }, [activeBookingId, postAction, setBookingSegment, setCurrentStep, updateActiveBooking]);

  return {
    handleGoToBilling,
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
  };
}
