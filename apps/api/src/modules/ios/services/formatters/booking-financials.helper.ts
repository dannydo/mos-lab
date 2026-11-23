import {
  calculateActorTipBreakdown,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  calculateIosItemizedPromotionDiscounts,
  IosCartProductItem,
  IosPromotionOption,
  IosSettlementStatus,
  resolveEffectiveServiceTotal,
  resolveNormalizedPaymentBreakdown,
  SafeAny,
} from '@mos-lab/shared';

export function computeBookingFinancials(params: {
  servicePrice: number;
  upgradePrice: number;
  serviceName?: string;
  isComboLive: boolean;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  hasUnderMinkCombo?: boolean;
  selectedCombo: SafeAny;
  selectedUnderCombo: SafeAny;
  comboRedemption: SafeAny;
  cartProducts: IosCartProductItem[];
  overrideBilling: SafeAny;
  legacyTipAmount?: number | null;
  assignedStaffId: number;
  checkInStaffId?: number;
  checkOutStaffId?: number;
  activeStaffId: number;
  dbOrderState?: string | null;
  isTrainingCvlOrder?: boolean;
  promotionId?: number | null;
  appliedPromotion?: IosPromotionOption | null;
  servicePromotion?: IosPromotionOption | null;
  comboPromotion?: IosPromotionOption | null;
  underComboPromotion?: IosPromotionOption | null;
}) {
  const {
    servicePrice,
    upgradePrice,
    serviceName,
    isComboLive,
    hasUnderMink,
    underMinkServiceType,
    hasUnderMinkCombo,
    selectedCombo,
    selectedUnderCombo,
    comboRedemption,
    cartProducts,
    overrideBilling,
    assignedStaffId,
    checkInStaffId,
    checkOutStaffId,
    activeStaffId,
    dbOrderState,
    isTrainingCvlOrder,
    promotionId,
    appliedPromotion,
    servicePromotion,
    comboPromotion,
    underComboPromotion,
  } = params;

  const productTotal = cartProducts.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 1), 0);
  const upperComboTotal = selectedCombo ? Number(selectedCombo.price || 0) : 0;
  const underComboTotal = selectedUnderCombo ? Number(selectedUnderCombo.price || 0) : 0;
  const comboTotal = upperComboTotal + underComboTotal;

  const normalizedSelectedCombo = selectedCombo ? { todaySingleServiceWaived: true, ...selectedCombo } : null;
  const normalizedSelectedUnderCombo = selectedUnderCombo
    ? { todaySingleServiceWaived: true, ...selectedUnderCombo }
    : null;

  const effectiveServiceTotal = resolveEffectiveServiceTotal({
    servicePrice,
    upgradePrice,
    serviceName,
    isComboLive,
    hasUnderMink,
    underMinkServiceType,
    hasUnderMinkCombo,
    selectedCombo: normalizedSelectedCombo,
    selectedUnderCombo: normalizedSelectedUnderCombo,
    comboRedemption,
  });

  const subtotal = effectiveServiceTotal + comboTotal + productTotal;
  const vatRate = 0.08;
  const isSessionWaivedIntoNewCombo = Boolean(
    normalizedSelectedCombo && normalizedSelectedCombo.todaySingleServiceWaived !== false
  );
  const effectiveServicePromo = isSessionWaivedIntoNewCombo ? null : servicePromotion;
  const effectiveFallbackOrderPromo = isSessionWaivedIntoNewCombo ? null : appliedPromotion;
  const hasAnyPromotionObject = Boolean(
    effectiveServicePromo ||
    comboPromotion ||
    underComboPromotion ||
    cartProducts.some((p) => p.appliedPromotion) ||
    effectiveFallbackOrderPromo
  );
  const itemizedPromo = calculateIosItemizedPromotionDiscounts({
    serviceAmount: effectiveServiceTotal,
    upgradeAmount: upgradePrice,
    servicePromotion: effectiveServicePromo,
    comboAmount: upperComboTotal,
    comboPromotion,
    underComboAmount: underComboTotal,
    underComboPromotion,
    products: cartProducts.map((p) => ({
      productId: Number(p.productId),
      amount: Number(p.price || 0) * Number(p.quantity || 1),
      promotion: p.appliedPromotion ?? undefined,
    })),
    fallbackOrderPromotion: effectiveFallbackOrderPromo,
    vatRate,
  });
  const effectivePromotionDiscount = hasAnyPromotionObject
    ? itemizedPromo.totalDiscount
    : !isSessionWaivedIntoNewCombo && promotionId && overrideBilling?.promotionDiscountAmount
      ? Math.max(0, Math.round(Number(overrideBilling.promotionDiscountAmount) || 0))
      : 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - effectivePromotionDiscount);
  const vatAmount = hasAnyPromotionObject ? itemizedPromo.vatAmount : Math.round(subtotalAfterDiscount * vatRate);
  const rawDiamondUsed = Number(overrideBilling?.diamondUsed ?? 0);
  const maxEligibleDiamonds = Math.floor(itemizedPromo.creditEligiblePayableWithVat / 1000);
  const diamondUsed = itemizedPromo.isFullCreditLocked
    ? 0
    : itemizedPromo.hasAnyCreditRestrictedItem
      ? Math.max(0, Math.min(rawDiamondUsed, maxEligibleDiamonds))
      : rawDiamondUsed;
  const diamondDiscountAmount = itemizedPromo.isFullCreditLocked
    ? 0
    : itemizedPromo.hasAnyCreditRestrictedItem
      ? diamondUsed * 1000
      : Number(overrideBilling?.diamondDiscountAmount ?? diamondUsed * 1000);
  const legacyTipFallback =
    params.dbOrderState === 'Completed' && Number(params.legacyTipAmount ?? 0) > 0
      ? Math.round(Number(params.legacyTipAmount))
      : 0;
  const overrideTipRaw = overrideBilling?.tipAmount;
  const tipAmount =
    overrideTipRaw !== undefined && overrideTipRaw !== null && !(Number(overrideTipRaw) === 0 && legacyTipFallback > 0)
      ? Number(overrideTipRaw)
      : legacyTipFallback;

  const dualCombo = calculateDualComboTierBonus(
    Number(selectedCombo?.price || 0),
    Number(selectedUnderCombo?.price || 0)
  );
  const comboBonus = dualCombo.totalBonus;
  const serumBonus = cartProducts.reduce(
    (sum, p) => sum + calculateCvSerumTierBonus(Number(p.price || 0), Number(p.quantity || 1)),
    0
  );

  const effectiveCheckInId = checkInStaffId || assignedStaffId;
  const effectiveCheckOutId = checkOutStaffId || assignedStaffId;
  const targetStaffId = activeStaffId || assignedStaffId;

  const tipBreakdown = calculateActorTipBreakdown(
    {
      assignedStaffId,
      checkInStaffId: effectiveCheckInId,
      checkOutStaffId: effectiveCheckOutId,
      isTrainingCvlOrder: Boolean(isTrainingCvlOrder),
    },
    { staffId: targetStaffId },
    tipAmount
  );

  const rawSettlement = overrideBilling?.settlementStatus as IosSettlementStatus | undefined;
  const settlementStatus: IosSettlementStatus | undefined =
    rawSettlement === 'PENDING_POST_CHECKOUT_ADJUSTMENT'
      ? 'PENDING_POST_CHECKOUT_ADJUSTMENT'
      : dbOrderState === 'Completed'
        ? 'SETTLED_COMPLETED'
        : (dbOrderState === 'CheckOut' || dbOrderState === 'Check-out') && !rawSettlement
          ? 'PENDING_COUNTER_SETTLEMENT'
          : rawSettlement;

  return {
    cvRewardBreakdown: {
      techTipPercent: isTrainingCvlOrder ? 90 : 70,
      checkInTipPercent: isTrainingCvlOrder ? 0 : 10,
      checkOutTipPercent: isTrainingCvlOrder ? 0 : 10,
      cvTotalTipPercent: isTrainingCvlOrder
        ? targetStaffId === assignedStaffId
          ? 90
          : 0
        : tipBreakdown.actorEarnedPercent,
      comboBonusAmount: comboBonus,
      serumBonusAmount: serumBonus,
      totalOrderBonusForCheckoutStaff: comboBonus + serumBonus,
    },
    billing: {
      subtotal,
      vatRate,
      vatAmount,
      promotionId:
        itemizedPromo.unifiedOrderPromotionId ??
        itemizedPromo.primaryPromotion?.promotionId ??
        (isSessionWaivedIntoNewCombo ? null : (promotionId ?? overrideBilling?.promotionId ?? null)),
      promotionName:
        itemizedPromo.primaryPromotion?.name ??
        (isSessionWaivedIntoNewCombo
          ? undefined
          : (appliedPromotion?.name ?? overrideBilling?.promotionName ?? undefined)),
      promotionDiscountAmount: effectivePromotionDiscount,
      serviceDiscountAmount: hasAnyPromotionObject
        ? itemizedPromo.serviceDiscount
        : (overrideBilling?.serviceDiscountAmount ?? 0),
      comboDiscountAmount: hasAnyPromotionObject
        ? itemizedPromo.comboDiscount + itemizedPromo.underComboDiscount
        : (overrideBilling?.comboDiscountAmount ?? 0),
      productDiscountAmount: hasAnyPromotionObject
        ? itemizedPromo.totalProductDiscount
        : (overrideBilling?.productDiscountAmount ?? 0),
      diamondUsed,
      diamondDiscountAmount,
      serviceTotal: effectiveServiceTotal,
      comboTotal,
      productTotal,
      paymentMethod: resolveNormalizedPaymentBreakdown(
        Math.max(0, subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountAmount),
        overrideBilling?.paymentMethod || (settlementStatus === 'PENDING_COUNTER_SETTLEMENT' ? 'CASH' : 'VIETQR'),
        overrideBilling?.paymentBreakdown
      ).paymentMethod,
      paymentBreakdown: resolveNormalizedPaymentBreakdown(
        Math.max(0, subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountAmount),
        overrideBilling?.paymentMethod || (settlementStatus === 'PENDING_COUNTER_SETTLEMENT' ? 'CASH' : 'VIETQR'),
        overrideBilling?.paymentBreakdown
      ).breakdown,
      settlementStatus,
      bankTransferRef: overrideBilling?.bankTransferRef,
      posTransactionId: overrideBilling?.posTransactionId,
      legacySyncedAt: overrideBilling?.legacySyncedAt,
      ...(overrideBilling?.previousPaidGrandTotal !== undefined
        ? { previousPaidGrandTotal: overrideBilling.previousPaidGrandTotal }
        : {}),
      ...(overrideBilling?.previousPaymentMethod
        ? { previousPaymentMethod: overrideBilling.previousPaymentMethod }
        : {}),
      ...(overrideBilling?.previousPaymentBreakdown
        ? { previousPaymentBreakdown: overrideBilling.previousPaymentBreakdown }
        : {}),
      ...(overrideBilling?.lastAdjustmentMode ? { lastAdjustmentMode: overrideBilling.lastAdjustmentMode } : {}),
      ...(overrideBilling?.lastAdjustmentDeltaAmount !== undefined
        ? { lastAdjustmentDeltaAmount: overrideBilling.lastAdjustmentDeltaAmount }
        : {}),
      tipAmount,
      tipCvShare: isTrainingCvlOrder ? Math.round(tipAmount * 0.9) : tipBreakdown.techShareAmount,
      tipCheckInShare: isTrainingCvlOrder ? 0 : tipBreakdown.checkInShareAmount,
      tipCheckOutShare: isTrainingCvlOrder ? 0 : tipBreakdown.checkOutShareAmount,
      tipCcShare: tipBreakdown.fundShareAmount,
      transferProofPhoto: overrideBilling?.transferProofPhoto,
      ...(overrideBilling?.tipTransferProofPhoto
        ? { tipTransferProofPhoto: overrideBilling.tipTransferProofPhoto }
        : {}),
      ...(overrideBilling?.qrSplitTipSeparate !== undefined
        ? { qrSplitTipSeparate: Boolean(overrideBilling.qrSplitTipSeparate) }
        : {}),
      ...(overrideBilling?.preCheckoutTipAmount !== undefined
        ? { preCheckoutTipAmount: Number(overrideBilling.preCheckoutTipAmount) }
        : {}),
      ...(overrideBilling?.preCheckoutServicePaidAmount !== undefined
        ? { preCheckoutServicePaidAmount: Number(overrideBilling.preCheckoutServicePaidAmount) }
        : {}),
      ...(overrideBilling?.preCheckoutPaymentMethod
        ? { preCheckoutPaymentMethod: overrideBilling.preCheckoutPaymentMethod }
        : {}),
      ...(overrideBilling?.preCheckoutPaymentBreakdown
        ? { preCheckoutPaymentBreakdown: overrideBilling.preCheckoutPaymentBreakdown }
        : {}),
      ...(overrideBilling?.preCheckoutQrSplitMode
        ? { preCheckoutQrSplitMode: overrideBilling.preCheckoutQrSplitMode }
        : {}),
      ...(overrideBilling?.preCheckoutTransferProofPhoto
        ? { preCheckoutTransferProofPhoto: overrideBilling.preCheckoutTransferProofPhoto }
        : {}),
      ...(overrideBilling?.preCheckoutTipTransferProofPhoto
        ? { preCheckoutTipTransferProofPhoto: overrideBilling.preCheckoutTipTransferProofPhoto }
        : {}),
      ...(overrideBilling?.preCheckoutRecordedAt
        ? { preCheckoutRecordedAt: overrideBilling.preCheckoutRecordedAt }
        : {}),
      ...(overrideBilling?.preCheckoutRecordedByStaffId !== undefined
        ? { preCheckoutRecordedByStaffId: Number(overrideBilling.preCheckoutRecordedByStaffId) }
        : {}),
      ...(overrideBilling?.preCheckoutRecordedByStaffName
        ? { preCheckoutRecordedByStaffName: String(overrideBilling.preCheckoutRecordedByStaffName) }
        : {}),
      ...(overrideBilling?.preCheckoutNote ? { preCheckoutNote: String(overrideBilling.preCheckoutNote) } : {}),
      zaloConsent: overrideBilling?.zaloConsent,
      completedAt: overrideBilling?.completedAt,
      grandTotal: Math.max(0, subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountAmount),
    },
  };
}
