import {
  calculateActorTipBreakdown,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  canDirectlySettleCounterPayment,
  resolveNormalizedPaymentBreakdown,
} from '@mos-lab/shared';
import type {
  CvToCvPlusRequirements,
  IosPaymentBreakdown,
  IosPaymentMethod,
  IosPromotionOption,
  IosSettlementStatus,
} from '@mos-lab/shared';
import type { BookingItem } from './mockData';
import type { ActiveActorProfile } from './iosActorProfile';
import { computeFreshBillingLineTotals, type CartProductItem } from './iosBillingMath';

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

export interface PaymentZaloConsent {
  agreed: boolean;
  phone: string;
  sentAt?: string;
  voucherCode?: string;
}

export interface PaymentPromotionSelection {
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
  tipTransferProofPhoto?: string;
  qrSplitTipSeparate?: boolean;
}

export interface ChoosePaymentUpdateParams {
  method: IosPaymentMethod;
  chosenTip?: number;
  chosenDiamond?: number;
  proofPhoto?: string;
  zaloConsent?: PaymentZaloConsent;
  promotionSelection?: PaymentPromotionSelection;
  actor: ActiveActorProfile;
  completedAt: string;
}

/**
 * Pure transition builder for moving from Step 12 Upsell to Step 13 Checkout Billing.
 */
export function buildGoToBillingBookingUpdate(
  prev: BookingItem,
  upsellPayload: UpsellPayload | undefined,
  actor: ActiveActorProfile,
  cvPlusRules?: Partial<CvToCvPlusRequirements>
): {
  nextBooking: BookingItem;
  postActionPayload: Record<string, any>;
} {
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
    upsellPayload?.skipUpperCombo !== undefined ? Boolean(upsellPayload.skipUpperCombo) : Boolean(prev.skipUpperCombo);
  const nextSkipUnder =
    upsellPayload?.skipUnderCombo !== undefined ? Boolean(upsellPayload.skipUnderCombo) : Boolean(prev.skipUnderCombo);

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

  const postActionPayload: Record<string, any> = {
    cartProducts: nextProducts,
    selectedCombo: resolvedNextCombo,
    selectedUnderCombo: resolvedNextUnderCombo,
    comboRedemption: nextSkipUpper ? null : nextRedemption,
    selectedUpperComboBalanceId: nextUpperBalanceId,
    selectedUnderComboBalanceId: nextUnderBalanceId,
    skipUpperCombo: nextSkipUpper,
    skipUnderCombo: nextSkipUnder,
    hasUnderMinkCombo: !nextSkipUnder && Boolean(prev.underMinkComboStatus?.hasUnderCombo),
  };

  const tipBreakdown = calculateActorTipBreakdown(
    {
      ...prev,
      checkOutStaffId: actor.staffId,
      checkOutStaffName: actor.name,
    },
    actor,
    tipAmount
  );

  const nextBooking: BookingItem = {
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

  return { nextBooking, postActionPayload };
}

/**
 * Pure transition builder for Step 13 One-Stop Checkout payment confirmation.
 */
export function buildChoosePaymentBookingUpdate(
  prev: BookingItem,
  {
    method,
    chosenTip,
    chosenDiamond,
    proofPhoto,
    zaloConsent,
    promotionSelection,
    actor,
    completedAt,
  }: ChoosePaymentUpdateParams
): {
  nextBooking: BookingItem;
  calculatedBilling: NonNullable<BookingItem['billing']>;
  promoActionSnapshot: Record<string, any>;
} {
  const tipAmount = chosenTip !== undefined ? chosenTip : (prev.billing?.tipAmount ?? 0);
  const tipBreakdown = calculateActorTipBreakdown(prev, actor, tipAmount);
  const cvShare = tipBreakdown.techShareAmount;
  const checkInShare = tipBreakdown.checkInShareAmount;
  const checkOutShare = tipBreakdown.checkOutShareAmount;
  const ccShare = checkInShare + checkOutShare;

  const nextBookingDraft: BookingItem = {
    ...prev,
    promotionId: promotionSelection?.promotionId !== undefined ? promotionSelection.promotionId : prev.promotionId,
    appliedPromotion:
      promotionSelection?.appliedPromotion !== undefined ? promotionSelection.appliedPromotion : prev.appliedPromotion,
    servicePromotionId:
      promotionSelection?.servicePromotionId !== undefined
        ? promotionSelection.servicePromotionId
        : prev.servicePromotionId,
    servicePromotion:
      promotionSelection?.servicePromotion !== undefined ? promotionSelection.servicePromotion : prev.servicePromotion,
    comboPromotionId:
      promotionSelection?.comboPromotionId !== undefined ? promotionSelection.comboPromotionId : prev.comboPromotionId,
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
    cartProducts: promotionSelection?.cartProducts !== undefined ? promotionSelection.cartProducts : prev.cartProducts,
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
  const diamondUsed = Math.min(chosenDiamond ?? 0, currentDiamondBalance, Math.floor(maxDiamondVnd / DIAMOND_RATE));
  const diamondDiscountAmount = diamondUsed * DIAMOND_RATE;
  const grandTotal = Math.max(0, totalBeforeDiamond - diamondDiscountAmount);
  const remainingDiamondBalance = Math.max(0, currentDiamondBalance - diamondUsed);

  const isSessionWaivedIntoNewCombo = Boolean(
    nextBookingDraft.selectedCombo && nextBookingDraft.selectedCombo.todaySingleServiceWaived !== false
  );
  const effectiveOrderPromoId =
    unifiedOrderPromotionId ??
    (isSessionWaivedIntoNewCombo ? null : nextBookingDraft.promotionId) ??
    primaryPromotion?.promotionId ??
    null;
  const promoActionSnapshot: Record<string, any> = {
    promotionId: effectiveOrderPromoId,
    appliedPromotion: isSessionWaivedIntoNewCombo ? null : (nextBookingDraft.appliedPromotion ?? null),
    servicePromotionId: isSessionWaivedIntoNewCombo
      ? null
      : (nextBookingDraft.servicePromotion?.promotionId ?? nextBookingDraft.servicePromotionId ?? null),
    servicePromotion: isSessionWaivedIntoNewCombo ? null : (nextBookingDraft.servicePromotion ?? null),
    comboPromotionId: nextBookingDraft.comboPromotion?.promotionId ?? nextBookingDraft.comboPromotionId ?? null,
    comboPromotion: nextBookingDraft.comboPromotion ?? null,
    underComboPromotionId:
      nextBookingDraft.underComboPromotion?.promotionId ?? nextBookingDraft.underComboPromotionId ?? null,
    underComboPromotion: nextBookingDraft.underComboPromotion ?? null,
    cartProducts: nextBookingDraft.cartProducts,
    selectedCombo: nextBookingDraft.selectedCombo ?? null,
    selectedUnderCombo: nextBookingDraft.selectedUnderCombo ?? null,
    comboRedemption: nextBookingDraft.comboRedemption ?? null,
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

  const calculatedBilling: NonNullable<BookingItem['billing']> = {
    ...(prev.billing || {}),
    subtotal,
    serviceTotal: freshServiceTotal,
    comboTotal: freshComboTotal,
    productTotal: freshProductTotal,
    promotionId: effectiveOrderPromoId,
    promotionName:
      primaryPromotion?.name ??
      (isSessionWaivedIntoNewCombo ? undefined : nextBookingDraft.appliedPromotion?.name) ??
      undefined,
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
    ...(promotionSelection?.tipTransferProofPhoto || prev.billing?.tipTransferProofPhoto
      ? { tipTransferProofPhoto: promotionSelection?.tipTransferProofPhoto || prev.billing?.tipTransferProofPhoto }
      : {}),
    ...(promotionSelection?.qrSplitTipSeparate !== undefined
      ? { qrSplitTipSeparate: promotionSelection.qrSplitTipSeparate }
      : prev.billing?.qrSplitTipSeparate !== undefined
        ? { qrSplitTipSeparate: prev.billing.qrSplitTipSeparate }
        : {}),
    zaloConsent: zaloConsent || prev.billing?.zaloConsent,
    grandTotal,
    completedAt,
  };

  const nextBooking: BookingItem = {
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
    billing: calculatedBilling,
  };

  return { nextBooking, calculatedBilling, promoActionSnapshot };
}
