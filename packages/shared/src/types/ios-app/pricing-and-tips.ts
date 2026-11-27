import { calculateComboBonus, type CvToCvPlusRequirements } from '../career-progression.js';
import type {
  IosActiveActorProfile,
  IosComboRedemption,
  IosSelectedCombo,
  IosSelectedUnderCombo,
  NaturalLashConsultationAttributes,
} from './booking-models.js';
import type { ActorTipBreakdown, IosBookingItem } from './booking-contracts.js';

export function hasCompleteNaturalLashAttributes(attrs?: NaturalLashConsultationAttributes | null): boolean {
  if (!attrs) return false;
  return Boolean(
    String(attrs.naturalLashLength || '').trim() &&
    String(attrs.naturalLashThickness || '').trim() &&
    String(attrs.naturalLashCount || attrs.naturalLashDensity || '').trim() &&
    String(attrs.lashTrail || '').trim() &&
    String(attrs.eyeShape || '').trim() &&
    String(attrs.lashHealth || '').trim() &&
    String(attrs.medicalProblem || '').trim()
  );
}

export function hasCompleteNaturalLashSet(
  booking?: { attributes?: NaturalLashConsultationAttributes | null } | null
): boolean {
  if (!booking?.attributes) return false;
  if (booking.attributes.isNewClientDiagnosticDone === false) return false;
  return hasCompleteNaturalLashAttributes(booking.attributes);
}

export function hasAnyNaturalLashAttribute(attrs?: NaturalLashConsultationAttributes | null): boolean {
  if (!attrs) return false;
  return Boolean(
    String(attrs.naturalLashLength || '').trim() ||
    String(attrs.naturalLashThickness || '').trim() ||
    String(attrs.naturalLashCount || attrs.naturalLashDensity || '').trim() ||
    String(attrs.lashTrail || '').trim() ||
    String(attrs.eyeShape || '').trim() ||
    String(attrs.lashHealth || '').trim() ||
    String(attrs.medicalProblem || '').trim()
  );
}

export function validateNaturalLashConsultationSave(params: {
  incomingAttributes?: NaturalLashConsultationAttributes | null;
  existingAttributes?: NaturalLashConsultationAttributes | null;
  customerVisits?: number;
}): { valid: boolean; error?: string } {
  const incoming = params.incomingAttributes || {};
  const mergedAttrs: NaturalLashConsultationAttributes = {
    ...(params.existingAttributes || {}),
    ...incoming,
  };
  const hasAll7 = hasCompleteNaturalLashAttributes(mergedAttrs);

  if (incoming.isNewClientDiagnosticDone === false || !hasAll7) {
    return {
      valid: false,
      error:
        'Bắt buộc kiểm tra mi thật và chọn đầy đủ 7/7 thông số (không có mặc định) trước khi lưu tư vấn và đến bước Nhiệm Vụ Ca Làm.',
    };
  }

  return { valid: true };
}

/**
 * Thưởng hoa hồng Combo CVL theo công thức đơn giản hóa động từ CAREER_PROGRESSION_RULES (Kinh Thánh mOS Điều răn CV-002 v2.11.0):
 * - Tối thiểu thực thu comboMinCollectedAmount (mặc định 500.000đ): dưới ngưỡng = 0đ
 * - Từ ngưỡng tối thiểu đến dưới 2M (500K - < 2.000.000đ): comboUnder2mBonus (mặc định 50.000đ)
 * - Mỗi 1M kế tiếp từ mốc 2M trở lên: +comboStepPerMillionBonus (mặc định +50.000đ/1M)
 */
export function calculateCvComboTierBonus(comboPrice: number, rules?: Partial<CvToCvPlusRequirements> | null): number {
  return calculateComboBonus(comboPrice, rules);
}

/**
 * Khi khách mua 2 gói Combo cùng 1 lúc trong cùng 1 đơn thanh toán (Mi Trên + Mi Dưới),
 * cộng gộp tổng tiền 2 gói lại trước rồi thưởng 1 lần theo công thức (<2M = 50K, mỗi 1M kế tiếp = +50K),
 * khớp 1-1 với sổ kế toán management.order_service_combo (gom theo order_id) và Báo Cáo CV (career.service.ts).
 */
export function calculateDualComboTierBonus(
  upperComboPrice?: number | null,
  underComboPrice?: number | null,
  rules?: Partial<CvToCvPlusRequirements> | null
): { upperBonus: number; underBonus: number; totalBonus: number; combinedPrice: number } {
  const uPrice = Math.max(0, Number(upperComboPrice || 0));
  const dPrice = Math.max(0, Number(underComboPrice || 0));
  const combinedPrice = uPrice + dPrice;
  if (combinedPrice <= 0) {
    return { upperBonus: 0, underBonus: 0, totalBonus: 0, combinedPrice: 0 };
  }
  const totalBonus = calculateCvComboTierBonus(combinedPrice, rules);
  if (uPrice > 0 && dPrice > 0) {
    return {
      upperBonus: totalBonus,
      underBonus: 0,
      totalBonus,
      combinedPrice,
    };
  }
  return {
    upperBonus: uPrice > 0 ? totalBonus : 0,
    underBonus: dPrice > 0 ? totalBonus : 0,
    totalBonus,
    combinedPrice,
  };
}

export function calculateCvSerumTierBonus(
  unitPrice: number,
  quantity: number,
  rules?: Partial<CvToCvPlusRequirements> | null
): number {
  if (!quantity || quantity <= 0) return 0;
  const origBonus = rules?.serumOriginalPriceBonus ?? 100000;
  const discBonus = rules?.serumDiscountedPriceBonus ?? 50000;
  const deepDiscBonus = rules?.serumDeepDiscountPriceBonus ?? 10000;
  const freeBonus = rules?.serumFreePriceBonus ?? 1000;
  const perUnit =
    unitPrice >= 1000000 ? origBonus : unitPrice > 550000 ? discBonus : unitPrice > 0 ? deepDiscBonus : freeBonus;
  return perUnit * quantity;
}

export const YEPPEUM_PRODUCT_ID = 36;

export function isYeppeumSerumProduct(item: {
  productId?: number;
  productSku?: string | null;
  productName?: string | null;
}): boolean {
  if (Number(item.productId) === YEPPEUM_PRODUCT_ID) return true;
  const haystack = `${item.productSku || ''} ${item.productName || ''}`.toLowerCase();
  return /yeppeum|dưỡng mi/i.test(haystack);
}

export function resolveServicePriceSplit(params: {
  servicePrice?: number;
  serviceName?: string;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  hasUnderMinkCombo?: boolean;
}): { upperServicePrice: number; underServicePrice: number } {
  const baseServicePrice = Math.max(0, Number(params.servicePrice ?? 0));
  const svcNameLower = String(params.serviceName || '').toLowerCase();

  const isPureUnderLash =
    (svcNameLower.includes('mi dưới') || svcNameLower.includes('under mink')) && !svcNameLower.includes('+');

  if (isPureUnderLash) {
    return { upperServicePrice: 0, underServicePrice: baseServicePrice };
  }

  const inferredUnderRetain =
    params.underMinkServiceType === 'Retain' ||
    svcNameLower.includes('mi dưới (dặm') ||
    svcNameLower.includes('dặm 250k');
  const inferredHasPaidUnderMink =
    !params.hasUnderMinkCombo &&
    !svcNameLower.includes('trừ gói mi dưới') &&
    (Boolean(params.hasUnderMink) ||
      svcNameLower.includes('+ mi dưới (mới') ||
      svcNameLower.includes('+ mi dưới (dặm'));

  if (!inferredHasPaidUnderMink) {
    return { upperServicePrice: baseServicePrice, underServicePrice: 0 };
  }

  const underListPrice = inferredUnderRetain ? 250000 : 390000;
  if (baseServicePrice > underListPrice) {
    return {
      upperServicePrice: baseServicePrice - underListPrice,
      underServicePrice: underListPrice,
    };
  }

  return { upperServicePrice: 0, underServicePrice: baseServicePrice };
}

export function resolveEffectiveServiceTotal(params: {
  servicePrice?: number;
  upgradePrice?: number;
  serviceName?: string;
  isComboLive?: boolean;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  hasUnderMinkCombo?: boolean;
  selectedCombo?: Partial<IosSelectedCombo> | null;
  selectedUnderCombo?: Partial<IosSelectedUnderCombo> | null;
  comboRedemption?: Partial<IosComboRedemption> | null;
}): number {
  const baseServicePrice = Math.max(0, Number(params.servicePrice ?? 0));
  const upgradePrice = Math.max(0, Number(params.upgradePrice ?? 0));
  const { upperServicePrice, underServicePrice } = resolveServicePriceSplit({
    servicePrice: baseServicePrice,
    serviceName: params.serviceName,
    hasUnderMink: params.hasUnderMink,
    underMinkServiceType: params.underMinkServiceType,
    hasUnderMinkCombo: params.hasUnderMinkCombo,
  });

  const isUnderWaivedByNewCombo = Boolean(
    params.selectedUnderCombo && params.selectedUnderCombo.todaySingleServiceWaived !== false
  );

  if (params.comboRedemption) {
    const redemptionPay = Math.max(0, Number(params.comboRedemption.totalCustomerPayToday ?? 0));
    const extraUnderCharge = isUnderWaivedByNewCombo ? 0 : underServicePrice;
    return redemptionPay + extraUnderCharge;
  }

  if (params.selectedCombo) {
    const isUpperWaived = Boolean(params.selectedCombo.todaySingleServiceWaived);
    if (params.isComboLive) {
      const adjustedUpgrade = isUnderWaivedByNewCombo ? Math.max(0, upgradePrice - underServicePrice) : upgradePrice;
      return isUpperWaived ? 0 : adjustedUpgrade;
    }
    const upperPay = isUpperWaived ? 0 : upperServicePrice;
    const underPay = isUnderWaivedByNewCombo ? 0 : underServicePrice;
    return upperPay + underPay;
  }

  if (params.isComboLive) {
    return isUnderWaivedByNewCombo ? Math.max(0, upgradePrice - underServicePrice) : upgradePrice;
  }

  const underPay = isUnderWaivedByNewCombo ? 0 : underServicePrice;
  return upperServicePrice + underPay;
}

export const CHECKOUT_TIP_PERCENT_TIERS = [5, 10, 15, 20] as const;
export type CheckoutTipPercentTier = (typeof CHECKOUT_TIP_PERCENT_TIERS)[number];

export interface PercentTipSuggestionItem {
  percent: CheckoutTipPercentTier;
  tipAmount: number;
  label: string;
  baseAmount: number;
}

/**
 * Xác định nền giá trị ca phục vụ thực tế (trước VAT 8% và trước trừ Kim Cương)
 * để tính gợi ý tiền Tip theo % bill. Ca trừ gói Combo 0đ hoặc mua Combo lớn vẫn
 * lấy đúng giá trị lẻ của bộ mi vừa thực hiện (+ sản phẩm bán kèm nếu có).
 */
export function resolveCheckoutTipBaseAmount(params: {
  servicePrice?: number;
  effectiveServiceCharge?: number;
  serviceName?: string;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  hasUnderMinkCombo?: boolean;
  cartProducts?: Array<{ price: number; quantity: number }> | null;
}): {
  tipBaseAmount: number;
  serviceRetailValue: number;
  productsTotal: number;
  isVirtualServiceBase: boolean;
} {
  const baseServicePrice = Math.max(0, Number(params.servicePrice ?? 0));
  const effectiveCharge = Math.max(0, Number(params.effectiveServiceCharge ?? 0));
  const svcNameLower = String(params.serviceName || '').toLowerCase();
  const isPureUnderLash =
    (svcNameLower.includes('mi dưới') || svcNameLower.includes('under mink')) && !svcNameLower.includes('+');
  const inferredUnderRetain =
    params.underMinkServiceType === 'Retain' ||
    svcNameLower.includes('mi dưới (dặm') ||
    svcNameLower.includes('dặm 250k');
  const underComboListValue =
    !isPureUnderLash &&
    Boolean(params.hasUnderMink) &&
    (Boolean(params.hasUnderMinkCombo) || svcNameLower.includes('trừ gói mi dưới'))
      ? inferredUnderRetain
        ? 250000
        : 390000
      : 0;

  const serviceRetailValue = Math.max(effectiveCharge, baseServicePrice + underComboListValue);
  const productsTotal = (params.cartProducts || []).reduce(
    (sum, p) => sum + Math.max(0, Number(p.price || 0)) * Math.max(0, Number(p.quantity || 0)),
    0
  );
  const tipBaseAmount = serviceRetailValue + productsTotal;
  const isVirtualServiceBase = effectiveCharge !== serviceRetailValue;

  return {
    tipBaseAmount,
    serviceRetailValue,
    productsTotal,
    isVirtualServiceBase,
  };
}

/**
 * Sinh 4 gợi ý tiền Tip theo % giá trị ca phục vụ (5%, 10%, 15%, 20%),
 * làm tròn đến 10.000đ gần nhất (tối thiểu 10.000đ).
 */
export function buildPercentageTipSuggestions(tipBaseAmount: number): PercentTipSuggestionItem[] {
  const safeBase = Math.max(0, Number(tipBaseAmount || 0));
  if (safeBase <= 0) return [];
  return CHECKOUT_TIP_PERCENT_TIERS.map((percent) => {
    const rawTip = (safeBase * percent) / 100;
    const roundedTo10k = Math.max(10000, Math.round(rawTip / 10000) * 10000);
    return {
      percent,
      tipAmount: roundedTo10k,
      label: `${percent}%`,
      baseAmount: safeBase,
    };
  });
}

export function calculateActorTipBreakdown(
  booking?: Partial<IosBookingItem> | null,
  actor?: Partial<IosActiveActorProfile> | null,
  overrideTipAmount?: number
): ActorTipBreakdown {
  const tipAmount = Math.max(0, Number(overrideTipAmount ?? booking?.billing?.tipAmount ?? 0));
  const actorStaffId = Number(actor?.staffId || 0);
  const actorName = actor?.name || 'Chuyên Viên';

  const techStaffId = Number(booking?.assignedStaffId || actorStaffId || 0);
  const techStaffName = booking?.assignedStaffName || actorName;
  const isTrainingCvl = Boolean(
    techStaffId > 0 &&
    (booking?.isTrainingCvlOrder || (actor?.isTrainingMentee && actorStaffId > 0 && techStaffId === actorStaffId))
  );

  const checkInStaffId = Number(booking?.checkInStaffId || techStaffId || actorStaffId || 0);
  const checkInStaffName = booking?.checkInStaffName || techStaffName;

  const checkOutStaffId = Number(booking?.checkOutStaffId || actorStaffId || techStaffId || 0);
  const checkOutStaffName = booking?.checkOutStaffName || actorName;

  const techShareAmount = isTrainingCvl ? Math.round(tipAmount * 0.9) : Math.round(tipAmount * 0.7);
  const checkInShareAmount = isTrainingCvl ? 0 : Math.round(tipAmount * 0.1);
  const checkOutShareAmount = isTrainingCvl ? 0 : Math.round(tipAmount * 0.1);
  const fundShareAmount = Math.max(0, tipAmount - techShareAmount - checkInShareAmount - checkOutShareAmount);

  const isActorTech = actorStaffId > 0 && techStaffId === actorStaffId;
  const isActorCheckIn = !isTrainingCvl && actorStaffId > 0 && checkInStaffId === actorStaffId;
  const isActorCheckOut = !isTrainingCvl && actorStaffId > 0 && checkOutStaffId === actorStaffId;

  const actorEarnedPercent = isTrainingCvl
    ? isActorTech
      ? 90
      : 0
    : (isActorTech ? 70 : 0) + (isActorCheckIn ? 10 : 0) + (isActorCheckOut ? 10 : 0);
  const actorEarnedAmount =
    (isActorTech ? techShareAmount : 0) +
    (isActorCheckIn ? checkInShareAmount : 0) +
    (isActorCheckOut ? checkOutShareAmount : 0);

  const roles: string[] = [];
  if (isTrainingCvl) {
    if (isActorTech) roles.push('Làm mi · Training 90%');
  } else {
    if (isActorTech) roles.push('Làm mi 70%');
    if (isActorCheckIn) roles.push('Check-in 10%');
    if (isActorCheckOut) roles.push('Check-out 10%');
  }

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
    actorRoleSummary:
      roles.length > 0 ? roles.join(' + ') : isTrainingCvl ? 'Hỗ trợ ca Đào tạo CVL (0%)' : 'Hỗ trợ ca (0%)',
  };
}
