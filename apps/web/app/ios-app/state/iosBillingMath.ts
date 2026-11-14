import {
  calculateCvSerumTierBonus,
  calculateIosItemizedPromotionDiscounts,
  resolveEffectiveServiceTotal,
  type CvToCvPlusRequirements,
} from '@mos-lab/shared';
import type { IosPromotionOption, IosPromotionTargetScope } from '@mos-lab/shared';
import type { BookingItem } from './mockData';

export type CartProductItem = NonNullable<BookingItem['cartProducts']>[number];

export interface SavePromotionTarget {
  scope: IosPromotionTargetScope;
  productIndex?: number;
  productId?: number;
}

/**
 * Computes fresh service, combo, product, subtotal, itemized promotion discounts, and VAT totals from a booking's
 * active items so re-checking out an already-billed booking never freezes stale totals.
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
    | 'servicePromotion'
    | 'comboPromotion'
    | 'underComboPromotion'
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
  upperComboDiscountAmount: number;
  underComboDiscountAmount: number;
  productDiscountAmount: number;
  productDiscounts: number[];
  subtotalAfterDiscount: number;
  vatRate: number;
  vatAmount: number;
  creditEligibleSubtotal: number;
  creditEligiblePayableWithVat: number;
  hasAnyCreditRestrictedItem: boolean;
  isFullCreditLocked: boolean;
  unifiedOrderPromotionId: number | null;
  primaryPromotion: IosPromotionOption | null;
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
  const upperComboTotal = booking.selectedCombo ? booking.selectedCombo.price : 0;
  const underComboTotal = booking.selectedUnderCombo ? booking.selectedUnderCombo.price : 0;
  const comboTotal = upperComboTotal + underComboTotal;
  const subtotal = serviceTotal + comboTotal + productTotal;
  const vatRate = booking.billing?.vatRate ?? 0.08;
  const itemized = calculateIosItemizedPromotionDiscounts({
    serviceAmount: serviceTotal,
    upgradeAmount: booking.upgradePrice || 0,
    servicePromotion: booking.servicePromotion,
    comboAmount: upperComboTotal,
    comboPromotion: booking.comboPromotion,
    underComboAmount: underComboTotal,
    underComboPromotion: booking.underComboPromotion,
    products: (booking.cartProducts || []).map((p) => ({
      productId: Number(p.productId),
      amount: Number(p.price || 0) * Number(p.quantity || 1),
      promotion: p.appliedPromotion ?? undefined,
    })),
    fallbackOrderPromotion: booking.appliedPromotion,
    vatRate,
  });

  return {
    serviceTotal,
    comboTotal,
    productTotal,
    subtotal,
    promotionDiscountAmount: itemized.totalDiscount,
    serviceDiscountAmount: itemized.serviceDiscount,
    comboDiscountAmount: itemized.comboDiscount + itemized.underComboDiscount,
    upperComboDiscountAmount: itemized.comboDiscount,
    underComboDiscountAmount: itemized.underComboDiscount,
    productDiscountAmount: itemized.totalProductDiscount,
    productDiscounts: itemized.productDiscounts,
    subtotalAfterDiscount: itemized.subtotalAfterDiscount,
    vatRate,
    vatAmount: itemized.vatAmount,
    creditEligibleSubtotal: itemized.creditEligibleSubtotal,
    creditEligiblePayableWithVat: itemized.creditEligiblePayableWithVat,
    hasAnyCreditRestrictedItem: itemized.hasAnyCreditRestrictedItem,
    isFullCreditLocked: itemized.isFullCreditLocked,
    unifiedOrderPromotionId: itemized.unifiedOrderPromotionId,
    primaryPromotion: itemized.primaryPromotion,
  };
}

export function applyTargetPromotionToBookingDraft(
  prev: BookingItem,
  promotion: IosPromotionOption | null,
  target?: SavePromotionTarget
): { draft: BookingItem; updatedCartProducts?: CartProductItem[] } {
  if (target?.scope === 'service') {
    return {
      draft: {
        ...prev,
        servicePromotionId: promotion?.promotionId ?? null,
        servicePromotion: promotion,
      },
    };
  }
  if (target?.scope === 'product') {
    const updatedProducts = (prev.cartProducts || []).map((item, idx) => {
      const matched =
        target.productIndex !== undefined
          ? idx === target.productIndex
          : target.productId !== undefined
            ? Number(item.productId) === Number(target.productId)
            : false;
      return matched
        ? {
            ...item,
            promotionId: promotion?.promotionId ?? null,
            appliedPromotion: promotion,
          }
        : item;
    });
    return {
      draft: { ...prev, cartProducts: updatedProducts },
      updatedCartProducts: updatedProducts,
    };
  }
  return {
    draft: {
      ...prev,
      promotionId: promotion?.promotionId ?? null,
      appliedPromotion: promotion,
    },
  };
}

/** Shared billing recalculation helper after cart product or promotion edits on Checkout. */
export function buildRecomputedCheckoutBilling(draft: BookingItem) {
  const {
    serviceTotal,
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
  } = computeFreshBillingLineTotals(draft);

  const tipAmount = draft.billing?.tipAmount ?? 0;
  const maxEligibleDiamonds = Math.floor(creditEligiblePayableWithVat / 1000);
  const rawDiamondUsed = draft.billing?.diamondUsed ?? 0;
  const diamondUsed = isFullCreditLocked
    ? 0
    : hasAnyCreditRestrictedItem
      ? Math.max(0, Math.min(rawDiamondUsed, maxEligibleDiamonds))
      : rawDiamondUsed;
  const diamondDiscountAmount = diamondUsed * 1000;
  const grandTotal = Math.max(0, subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountAmount);

  return {
    ...(draft.billing || {}),
    subtotal,
    serviceTotal,
    comboTotal,
    productTotal,
    vatRate,
    vatAmount,
    promotionId: unifiedOrderPromotionId ?? primaryPromotion?.promotionId ?? null,
    promotionName: primaryPromotion?.name ?? undefined,
    promotionDiscountAmount,
    serviceDiscountAmount,
    comboDiscountAmount,
    productDiscountAmount,
    diamondUsed,
    diamondDiscountAmount,
    paymentMethod: draft.billing?.paymentMethod || ('VIETQR' as const),
    tipAmount,
    tipCvShare: draft.billing?.tipCvShare ?? Math.round(tipAmount * 0.7),
    tipCheckInShare: draft.billing?.tipCheckInShare ?? Math.round(tipAmount * 0.1),
    tipCheckOutShare: draft.billing?.tipCheckOutShare ?? Math.round(tipAmount * 0.1),
    tipCcShare: draft.billing?.tipCcShare ?? Math.round(tipAmount * 0.2),
    grandTotal,
  };
}

export function applyCartProductsUpdateToBookingDraft(
  prev: BookingItem,
  nextProducts: CartProductItem[],
  actorTier?: string,
  cvPlusRules?: Partial<CvToCvPlusRequirements>
): BookingItem {
  const draft: BookingItem = {
    ...prev,
    cartProducts: nextProducts,
    _localComboUpdatedAt: Date.now(),
  };
  const nextBilling = buildRecomputedCheckoutBilling(draft);
  const isActorCc = actorTier === 'CC';
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
  const comboBonusAmount = prev.cvRewardBreakdown?.comboBonusAmount ?? 0;
  return {
    ...draft,
    ...(prev.cvRewardBreakdown
      ? {
          cvRewardBreakdown: {
            ...prev.cvRewardBreakdown,
            serumBonusAmount,
            totalOrderBonusForCheckoutStaff: comboBonusAmount + serumBonusAmount,
          },
        }
      : {}),
    billing: nextBilling,
  };
}
