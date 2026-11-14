export type IosPromotionApplyTarget = 'single' | 'combo' | 'upgrade' | 'all';

export interface IosPromotionOption {
  promotionId: number;
  promotionKey: string;
  promotionType: string;
  promotionApply: IosPromotionApplyTarget;
  serviceGroup: string | null;
  name: string;
  shortName: string;
  discountPercentage: number;
  discountAmount: number;
  exactlyAmount: number;
  isOldUserDisabled: boolean;
  isApprovalRequired: boolean;
  isPublic: boolean;
  isSystem: boolean;
  isCreditAllowed: boolean;
  dateExpired: string | null;
  position: number;
}

export interface IosPromotionDiscountInput {
  promotion: IosPromotionOption | null | undefined;
  serviceAmount: number;
  upgradeAmount?: number;
  comboAmount: number;
  productAmount: number;
  vatRate?: number;
}

export interface IosPromotionDiscountBreakdown {
  promotionId: number | null;
  serviceDiscount: number;
  comboDiscount: number;
  productDiscount: number;
  totalDiscount: number;
  isGlobalOrderDiscount: boolean;
  subtotalAfterDiscount: number;
  vatAmount: number;
}

function computeBaseDiscount(
  basePrice: number,
  promotion: Pick<IosPromotionOption, 'discountPercentage' | 'discountAmount' | 'exactlyAmount'>,
  vatRate: number
): number {
  const safeBase = Math.max(0, Math.round(Number(basePrice) || 0));
  if (safeBase <= 0) return 0;

  const exactlyAmount = Math.max(0, Number(promotion.exactlyAmount) || 0);
  if (exactlyAmount > 0) {
    return Math.min(safeBase, Math.max(0, Math.round(safeBase - exactlyAmount)));
  }

  const pct = Math.max(0, Number(promotion.discountPercentage) || 0);
  const fixedAmount = Math.max(0, Number(promotion.discountAmount) || 0);
  const preTaxFixed = fixedAmount > 0 ? fixedAmount / (1 + Math.max(0, vatRate)) : 0;
  const rawDiscount = safeBase * (pct / 100) + preTaxFixed;
  return Math.min(safeBase, Math.max(0, Math.round(rawDiscount)));
}

export function isPromotionEligibleForCustomer(
  promotion: Pick<IosPromotionOption, 'isOldUserDisabled'> | null | undefined,
  customerVisits: number
): boolean {
  if (!promotion) return false;
  if (promotion.isOldUserDisabled && Number(customerVisits || 0) > 1) {
    return false;
  }
  return true;
}

export function normalizePromotionApplyTarget(value: string | null | undefined): IosPromotionApplyTarget {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'combo' || normalized === 'upgrade' || normalized === 'all') {
    return normalized;
  }
  return 'single';
}

export function calculateIosPromotionDiscount(input: IosPromotionDiscountInput): IosPromotionDiscountBreakdown {
  const vatRate = Math.max(0, Number(input.vatRate ?? 0.08));
  const serviceAmount = Math.max(0, Math.round(Number(input.serviceAmount) || 0));
  const upgradeAmount = Math.max(
    0,
    Math.round(Number(input.upgradeAmount !== undefined ? input.upgradeAmount : serviceAmount) || 0)
  );
  const comboAmount = Math.max(0, Math.round(Number(input.comboAmount) || 0));
  const productAmount = Math.max(0, Math.round(Number(input.productAmount) || 0));
  const subtotal = serviceAmount + comboAmount + productAmount;

  const promotion = input.promotion;
  if (!promotion) {
    return {
      promotionId: null,
      serviceDiscount: 0,
      comboDiscount: 0,
      productDiscount: 0,
      totalDiscount: 0,
      isGlobalOrderDiscount: false,
      subtotalAfterDiscount: subtotal,
      vatAmount: Math.round(subtotal * vatRate),
    };
  }

  let serviceDiscount = 0;
  const comboDiscount = 0;
  let productDiscount = 0;
  let isGlobalOrderDiscount = false;

  const apply = normalizePromotionApplyTarget(promotion.promotionApply);
  if (apply === 'single') {
    serviceDiscount = computeBaseDiscount(serviceAmount, promotion, vatRate);
  } else if (apply === 'combo') {
    // Chính sách Wings: không giảm giá cho gói Combo nối mi.
  } else if (apply === 'upgrade') {
    serviceDiscount = computeBaseDiscount(upgradeAmount, promotion, vatRate);
  } else {
    isGlobalOrderDiscount = true;
    const hasPct = Number(promotion.discountPercentage) > 0;
    const hasFixedOrExact = Number(promotion.discountAmount) > 0 || Number(promotion.exactlyAmount) > 0;
    const eligibleSubtotal = serviceAmount + productAmount;

    if (hasPct && !hasFixedOrExact) {
      serviceDiscount = computeBaseDiscount(serviceAmount, promotion, vatRate);
      productDiscount = computeBaseDiscount(productAmount, promotion, vatRate);
    } else {
      let remaining = computeBaseDiscount(eligibleSubtotal, promotion, vatRate);
      serviceDiscount = Math.min(serviceAmount, remaining);
      remaining -= serviceDiscount;
      productDiscount = Math.min(productAmount, remaining);
    }
  }

  const totalDiscount = Math.min(subtotal, Math.max(0, serviceDiscount + comboDiscount + productDiscount));
  const subtotalAfterDiscount = Math.max(0, subtotal - totalDiscount);
  const vatAmount = Math.round(subtotalAfterDiscount * vatRate);

  return {
    promotionId: promotion.promotionId,
    serviceDiscount,
    comboDiscount,
    productDiscount,
    totalDiscount,
    isGlobalOrderDiscount,
    subtotalAfterDiscount,
    vatAmount,
  };
}

export type IosPromotionTargetScope = 'service' | 'product';

export interface IosItemizedPromotionProductInput {
  productId: number;
  amount: number;
  promotion?: IosPromotionOption | null;
}

export interface IosItemizedPromotionInput {
  serviceAmount: number;
  upgradeAmount?: number;
  comboAmount: number;
  underComboAmount?: number;
  products: IosItemizedPromotionProductInput[];
  servicePromotion?: IosPromotionOption | null;
  comboPromotion?: IosPromotionOption | null;
  underComboPromotion?: IosPromotionOption | null;
  /** Legacy fallback when order only has global promotion_id and no per-item fields */
  fallbackOrderPromotion?: IosPromotionOption | null;
  vatRate?: number;
}

export interface IosItemizedPromotionBreakdown {
  serviceDiscount: number;
  comboDiscount: number;
  underComboDiscount: number;
  productDiscounts: number[];
  totalProductDiscount: number;
  totalDiscount: number;
  subtotal: number;
  subtotalAfterDiscount: number;
  vatAmount: number;
  creditEligibleSubtotal: number;
  creditEligiblePayableWithVat: number;
  hasAnyCreditRestrictedItem: boolean;
  isFullCreditLocked: boolean;
  /** Shared promotion ID if all discounted items use the same promotionId, else null */
  unifiedOrderPromotionId: number | null;
  primaryPromotion: IosPromotionOption | null;
}

export function calculateIosItemizedPromotionDiscounts(
  input: IosItemizedPromotionInput
): IosItemizedPromotionBreakdown {
  const vatRate = Math.max(0, Number(input.vatRate ?? 0.08));
  const serviceAmount = Math.max(0, Math.round(Number(input.serviceAmount) || 0));
  const upgradeAmount = Math.max(0, Math.round(Number(input.upgradeAmount || 0)));
  const comboAmount = Math.max(0, Math.round(Number(input.comboAmount) || 0));
  const underComboAmount = Math.max(0, Math.round(Number(input.underComboAmount) || 0));
  const productAmounts = input.products.map((p) => Math.max(0, Math.round(Number(p.amount) || 0)));
  const productTotal = productAmounts.reduce((sum, amt) => sum + amt, 0);
  const subtotal = serviceAmount + comboAmount + underComboAmount + productTotal;

  const hasExplicitItemPromos = Boolean(input.servicePromotion || input.products.some((p) => Boolean(p.promotion)));

  const fallbackPromo = !hasExplicitItemPromos ? (input.fallbackOrderPromotion ?? null) : null;

  if (fallbackPromo && !hasExplicitItemPromos) {
    const legacy = calculateIosPromotionDiscount({
      promotion: fallbackPromo,
      serviceAmount,
      upgradeAmount: input.upgradeAmount,
      comboAmount: comboAmount + underComboAmount,
      productAmount: productTotal,
      vatRate,
    });
    const totalComboAmt = comboAmount + underComboAmount;
    const comboDiscount =
      legacy.comboDiscount > 0 && comboAmount > 0 && totalComboAmt > 0
        ? underComboAmount > 0
          ? Math.min(comboAmount, Math.round((legacy.comboDiscount * comboAmount) / totalComboAmt))
          : legacy.comboDiscount
        : 0;
    const underComboDiscount =
      legacy.comboDiscount > 0 && underComboAmount > 0 ? Math.max(0, legacy.comboDiscount - comboDiscount) : 0;

    let remProductDisc = legacy.productDiscount;
    const productDiscounts = productAmounts.map((amt, idx) => {
      if (remProductDisc <= 0 || productTotal <= 0 || amt <= 0) return 0;
      const disc =
        idx === productAmounts.length - 1
          ? Math.min(amt, remProductDisc)
          : Math.min(amt, Math.round((legacy.productDiscount * amt) / productTotal));
      remProductDisc = Math.max(0, remProductDisc - disc);
      return disc;
    });

    const isCreditRestricted = Boolean(fallbackPromo.isCreditAllowed === false && legacy.totalDiscount > 0);
    const creditEligibleSubtotal = isCreditRestricted ? 0 : legacy.subtotalAfterDiscount;
    const creditEligiblePayableWithVat = isCreditRestricted ? 0 : creditEligibleSubtotal + legacy.vatAmount;

    return {
      serviceDiscount: legacy.serviceDiscount,
      comboDiscount,
      underComboDiscount,
      productDiscounts,
      totalProductDiscount: legacy.productDiscount,
      totalDiscount: legacy.totalDiscount,
      subtotal,
      subtotalAfterDiscount: legacy.subtotalAfterDiscount,
      vatAmount: legacy.vatAmount,
      creditEligibleSubtotal,
      creditEligiblePayableWithVat,
      hasAnyCreditRestrictedItem: isCreditRestricted,
      isFullCreditLocked: isCreditRestricted,
      unifiedOrderPromotionId: fallbackPromo.promotionId,
      primaryPromotion: fallbackPromo,
    };
  }

  let serviceDiscount = 0;
  if (serviceAmount > 0 && input.servicePromotion) {
    const apply = normalizePromotionApplyTarget(input.servicePromotion.promotionApply);
    if (apply !== 'combo') {
      const base =
        apply === 'upgrade'
          ? upgradeAmount > 0
            ? Math.min(serviceAmount, upgradeAmount)
            : serviceAmount
          : serviceAmount;
      serviceDiscount = computeBaseDiscount(base, input.servicePromotion, vatRate);
    }
  }

  // Không giảm giá cho combo nối mi (chỉ áp dụng cho dịch vụ và sản phẩm).
  const comboDiscount = 0;
  const underComboDiscount = 0;

  const productDiscounts = input.products.map((p, idx) => {
    const amt = productAmounts[idx] || 0;
    if (amt <= 0 || !p.promotion) return 0;
    const apply = normalizePromotionApplyTarget(p.promotion.promotionApply);
    if (apply === 'combo') return 0;
    return computeBaseDiscount(amt, p.promotion, vatRate);
  });

  const totalProductDiscount = productDiscounts.reduce((sum, d) => sum + d, 0);
  const totalDiscount = Math.min(subtotal, serviceDiscount + totalProductDiscount);
  const subtotalAfterDiscount = Math.max(0, subtotal - totalDiscount);
  const vatAmount = Math.round(subtotalAfterDiscount * vatRate);

  let creditEligibleSubtotal = 0;
  let hasAnyCreditRestrictedItem = false;

  const evaluateCreditItem = (amount: number, discount: number, promo?: IosPromotionOption | null) => {
    if (amount <= 0) return;
    const net = Math.max(0, amount - discount);
    const restricted = Boolean(promo && promo.isCreditAllowed === false && discount > 0);
    if (restricted) {
      hasAnyCreditRestrictedItem = true;
    } else {
      creditEligibleSubtotal += net;
    }
  };

  evaluateCreditItem(serviceAmount, serviceDiscount, input.servicePromotion);
  evaluateCreditItem(comboAmount, 0, null);
  evaluateCreditItem(underComboAmount, 0, null);
  input.products.forEach((p, idx) => {
    evaluateCreditItem(productAmounts[idx] || 0, productDiscounts[idx] || 0, p.promotion);
  });

  const creditEligiblePayableWithVat =
    creditEligibleSubtotal > 0 ? Math.round(creditEligibleSubtotal * (1 + vatRate)) : 0;
  const isFullCreditLocked =
    hasAnyCreditRestrictedItem && subtotalAfterDiscount > 0 && creditEligiblePayableWithVat <= 0;

  const activePromotions: IosPromotionOption[] = [];
  if (serviceAmount > 0 && input.servicePromotion) activePromotions.push(input.servicePromotion);
  input.products.forEach((p, idx) => {
    if ((productAmounts[idx] || 0) > 0 && p.promotion) activePromotions.push(p.promotion);
  });

  const distinctPromoIds = Array.from(new Set(activePromotions.map((p) => p.promotionId)));
  const unifiedOrderPromotionId = distinctPromoIds.length === 1 ? distinctPromoIds[0] : null;
  const primaryPromotion = activePromotions[0] ?? null;

  return {
    serviceDiscount,
    comboDiscount,
    underComboDiscount,
    productDiscounts,
    totalProductDiscount,
    totalDiscount,
    subtotal,
    subtotalAfterDiscount,
    vatAmount,
    creditEligibleSubtotal,
    creditEligiblePayableWithVat,
    hasAnyCreditRestrictedItem,
    isFullCreditLocked,
    unifiedOrderPromotionId,
    primaryPromotion,
  };
}
