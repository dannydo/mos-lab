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
  let comboDiscount = 0;
  let productDiscount = 0;
  let isGlobalOrderDiscount = false;

  const apply = normalizePromotionApplyTarget(promotion.promotionApply);
  if (apply === 'single') {
    serviceDiscount = computeBaseDiscount(serviceAmount, promotion, vatRate);
  } else if (apply === 'combo') {
    comboDiscount = computeBaseDiscount(comboAmount, promotion, vatRate);
  } else if (apply === 'upgrade') {
    serviceDiscount = computeBaseDiscount(upgradeAmount, promotion, vatRate);
  } else {
    isGlobalOrderDiscount = true;
    const hasPct = Number(promotion.discountPercentage) > 0;
    const hasFixedOrExact = Number(promotion.discountAmount) > 0 || Number(promotion.exactlyAmount) > 0;

    if (hasPct && !hasFixedOrExact) {
      serviceDiscount = computeBaseDiscount(serviceAmount, promotion, vatRate);
      comboDiscount = computeBaseDiscount(comboAmount, promotion, vatRate);
      productDiscount = computeBaseDiscount(productAmount, promotion, vatRate);
    } else {
      let remaining = computeBaseDiscount(subtotal, promotion, vatRate);
      serviceDiscount = Math.min(serviceAmount, remaining);
      remaining -= serviceDiscount;
      comboDiscount = Math.min(comboAmount, remaining);
      remaining -= comboDiscount;
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
