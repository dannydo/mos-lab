import {
  canDirectlySettleCounterPayment,
  IosCartProductItem,
  IosPaymentBreakdown,
  IosPaymentMethod,
  IosPromotionOption,
  resolveEffectiveServiceTotal,
  resolveNormalizedPaymentBreakdown,
  SafeAny,
} from '@mos-lab/shared';
import { LegacyOrderCatalogSnapshot } from './ios-legacy-catalog.service.js';
import { buildLegacySelectedProductsForPayment } from './ios-legacy-product-mapper.service.js';
import { resolveLegacyPromotionDiscountsAndCredits } from './ios-promotions.service.js';
import {
  buildUnderLashAttributeMap,
  buildUpperLashAttributeMap,
  type LegacyAttributeOptionEntry,
  type LegacyServiceAttributeMap,
} from './ios-legacy-attributes.mapper.js';

export {
  inferComboTotalSessions,
  inferLegacyUpperServiceKeyCandidates,
  resolveLegacyOrderCatalogSnapshot,
} from './ios-legacy-catalog.service.js';

export type {
  LegacyCatalogComboMatch,
  LegacyCatalogProductMatch,
  LegacyCatalogServiceMatch,
  LegacyOrderCatalogSnapshot,
  LegacySurveyAnswerPayload,
  ResolveLegacyCatalogParams,
} from './ios-legacy-catalog.service.js';

export {
  buildUnderLashAttributeMap,
  buildUpperLashAttributeMap,
  type LegacyAttributeOptionEntry,
  type LegacyServiceAttributeMap,
};

export interface BuildLegacyPaymentPayloadInput {
  orderId: number;
  assignedStaffId: number;
  serviceType?: string;
  upgradePrice?: number;
  attributes?: SafeAny;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  isComboLive?: boolean;
  hasUnderMinkCombo?: boolean;
  selectedCombo?: SafeAny;
  selectedUnderCombo?: SafeAny;
  comboRedemption?: SafeAny;
  cartProducts?: IosCartProductItem[];
  servicePrice?: number;
  serviceName?: string;
  promotionId?: number | null;
  appliedPromotion?: IosPromotionOption | null;
  servicePromotionId?: number | null;
  servicePromotion?: IosPromotionOption | null;
  comboPromotionId?: number | null;
  comboPromotion?: IosPromotionOption | null;
  underComboPromotionId?: number | null;
  underComboPromotion?: IosPromotionOption | null;
  billing?: SafeAny;
  settlementActorTier?: string | null;
  catalog: LegacyOrderCatalogSnapshot;
}

export interface BuiltLegacyOrderPayloads {
  paymentMethod: IosPaymentMethod;
  paymentBreakdown: IosPaymentBreakdown;
  shouldSettleCompletedImmediately: boolean;
  promotionId: number | null;
  discountAmount: number;
  subtotal: number;
  vatAmount: number;
  tipAmount: number;
  diamondCredits: number;
  diamondDiscountVnd: number;
  grandTotal: number;
  bankTransferRef: string;
  selectedService: Array<Record<string, SafeAny>>;
  selectedServiceCombo: Array<Record<string, SafeAny>>;
  selectedProductForPayment: Array<Record<string, SafeAny>>;
  checkInAttributeValue: Record<string, LegacyServiceAttributeMap>;
  preConsultationUpperAttrPayload?: Record<string, SafeAny>;
  consultationPayload: Record<string, SafeAny>;
  paymentUpdatePayload: Record<string, SafeAny>;
}

/**
 * Quy đổi tiền giảm Kim Cương sang số nguyên điểm Credit của PHP Legacy (1 💎 = 1.000đ).
 * Tuyệt đối không truyền số tiền VND thô vào paid_credit_amount vì PHP nhân 1000 khi trừ ví.
 */
export function resolveDiamondCreditUnits(diamondUsed?: number, diamondDiscountAmount?: number): number {
  if (Number.isFinite(diamondUsed) && Number(diamondUsed) > 0) {
    return Math.max(0, Math.round(Number(diamondUsed)));
  }
  if (Number.isFinite(diamondDiscountAmount) && Number(diamondDiscountAmount) > 0) {
    return Math.max(0, Math.round(Number(diamondDiscountAmount) / 1000));
  }
  return 0;
}

/**
 * Điều răn A3 (Cash Drawer & Tax Gate):
 * - Đơn 0đ (trừ buổi Combo / 100% Kim Cương) hoặc VIETQR chuyển khoản -> Chốt thẳng Completed.
 * - Đơn thu Tiền mặt (CASH) hoặc Máy quẹt thẻ (POS) > 0đ do CC / Thu ngân / Admin bấm trên `/ios-app` -> Chốt thẳng Completed.
 * - Đơn CASH / POS > 0đ do CVL / CVLL thao tác -> Dừng ở CheckOut (Chờ Quầy chốt) để CC / Thu ngân xác nhận hoàn tất.
 */
export function shouldAutoCompleteLegacyOrder(
  paymentMethod: string,
  grandTotal: number,
  actorTierOrRole?: string | null,
  paymentBreakdown?: Partial<IosPaymentBreakdown> | null
): boolean {
  if (Math.round(Number(grandTotal || 0)) <= 0) {
    return true;
  }
  const normalized = resolveNormalizedPaymentBreakdown(grandTotal, paymentMethod, paymentBreakdown);
  if (normalized.isPureVietqrOrZero) {
    return true;
  }
  return canDirectlySettleCounterPayment(actorTierOrRole);
}

/**
 * Xây dựng bộ payload chuẩn 100% cho các endpoint /1/order/booking/check-in, consultation và payment/update của PHP.
 * Đặc biệt bảo toàn căn chỉnh chỉ mục mảng:
 * - Index [0]: Mi Trên + Gói Combo Mi Trên (hoặc {} nếu chỉ mua Gói Mi Dưới)
 * - Index [1]: Mi Dưới + Gói Combo Mi Dưới
 * - Tuyệt đối không gửi trường order_contract rỗng để tránh xóa hợp đồng điện tử hiện hữu.
 */
export function buildLegacyOrderPayloads(input: BuildLegacyPaymentPayloadInput): BuiltLegacyOrderPayloads {
  const {
    orderId,
    assignedStaffId,
    upgradePrice = 0,
    attributes = {},
    hasUnderMink = false,
    underMinkServiceType = 'Normal',
    isComboLive = false,
    hasUnderMinkCombo = false,
    selectedCombo = null,
    selectedUnderCombo = null,
    comboRedemption = null,
    cartProducts = [],
    servicePrice = 0,
    serviceName = '',
    billing = {},
    settlementActorTier,
    catalog,
  } = input;

  const hasUpperComboPurchase = Boolean(selectedCombo && Number(selectedCombo.price || 0) > 0 && catalog.upperCombo);
  const hasUnderComboPurchase = Boolean(
    selectedUnderCombo && Number(selectedUnderCombo.price || 0) > 0 && catalog.underCombo
  );
  const includeUnderServiceSlot = Boolean((hasUnderMink || hasUnderComboPurchase) && catalog.underService);

  const upperUsesBalancePackage = Boolean(
    comboRedemption?.redeemSession ||
    (isComboLive && !hasUpperComboPurchase) ||
    (hasUpperComboPurchase && selectedCombo?.todaySingleServiceWaived !== false)
  );

  const underUsesBalancePackage = Boolean(
    hasUnderMinkCombo || (hasUnderComboPurchase && selectedUnderCombo?.todaySingleServiceWaived !== false)
  );

  const upperPriceId = upperUsesBalancePackage
    ? catalog.upperService.balancePriceId || catalog.upperService.singlePriceId
    : catalog.upperService.singlePriceId;

  const normalizedUpperCombo = selectedCombo ? { todaySingleServiceWaived: true, ...selectedCombo } : null;
  const normalizedUnderCombo = selectedUnderCombo ? { todaySingleServiceWaived: true, ...selectedUnderCombo } : null;

  const effectiveServiceTotal = resolveEffectiveServiceTotal({
    servicePrice: Number(servicePrice || catalog.upperService.singlePriceAmount || 0),
    upgradePrice: Number(upgradePrice || 0),
    serviceName,
    isComboLive,
    hasUnderMink,
    underMinkServiceType,
    hasUnderMinkCombo,
    selectedCombo: normalizedUpperCombo,
    selectedUnderCombo: normalizedUnderCombo,
    comboRedemption,
  });

  const upperComboPrice = hasUpperComboPurchase
    ? Number(selectedCombo?.price || catalog.upperCombo?.comboPriceAmount || 0)
    : 0;
  const underComboPrice = hasUnderComboPurchase
    ? Number(selectedUnderCombo?.price || catalog.underCombo?.comboPriceAmount || 0)
    : 0;
  const comboTotal = upperComboPrice + underComboPrice;
  const productTotal = cartProducts.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 1), 0);

  const rawPromoId =
    input.promotionId !== undefined
      ? input.promotionId
      : billing?.promotionId !== undefined
        ? billing.promotionId
        : catalog.promotionId;
  const effectivePromotionId = rawPromoId && Number(rawPromoId) > 0 ? Number(rawPromoId) : null;
  const appliedPromotion =
    effectivePromotionId &&
    input.appliedPromotion &&
    Number(input.appliedPromotion.promotionId) === effectivePromotionId
      ? input.appliedPromotion
      : null;

  const servicePromotion = input.servicePromotion ?? null;
  const comboPromotion = input.comboPromotion ?? null;
  const underComboPromotion = input.underComboPromotion ?? null;
  const isSessionWaivedIntoNewCombo = Boolean(
    hasUpperComboPurchase && selectedCombo?.todaySingleServiceWaived !== false
  );
  const hasSuspendedSessionPromo = Boolean(
    isSessionWaivedIntoNewCombo && (appliedPromotion || servicePromotion || input.promotionId === null)
  );
  const {
    hasAnyItemizedPromoObj,
    hasAnyPromoObj,
    itemizedPromo,
    serviceDiscount,
    comboDiscount,
    productDiscount,
    orderDiscountTotal,
    diamondCredits,
  } = resolveLegacyPromotionDiscountsAndCredits({
    effectiveServiceTotal,
    upgradePrice: Number(upgradePrice || 0),
    upperComboPrice,
    underComboPrice,
    comboTotal,
    productTotal,
    cartProducts,
    servicePromotion,
    comboPromotion,
    underComboPromotion,
    appliedPromotion,
    effectivePromotionId,
    isSessionWaivedIntoNewCombo,
    billing,
    rawDiamondCredits: resolveDiamondCreditUnits(billing?.diamondUsed, billing?.diamondDiscountAmount),
  });

  const resolvedServicePromoId = isSessionWaivedIntoNewCombo
    ? null
    : (servicePromotion?.promotionId ??
      (input.servicePromotionId && Number(input.servicePromotionId) > 0 ? Number(input.servicePromotionId) : null) ??
      effectivePromotionId);
  const resolvedUpperComboPromoId =
    comboPromotion?.promotionId ??
    (input.comboPromotionId && Number(input.comboPromotionId) > 0 ? Number(input.comboPromotionId) : null) ??
    (isSessionWaivedIntoNewCombo ? null : effectivePromotionId);
  const resolvedUnderComboPromoId =
    underComboPromotion?.promotionId ??
    (input.underComboPromotionId && Number(input.underComboPromotionId) > 0
      ? Number(input.underComboPromotionId)
      : null) ??
    (isSessionWaivedIntoNewCombo ? null : effectivePromotionId);

  const isServiceCreditRestricted = Boolean(
    !isSessionWaivedIntoNewCombo &&
    ((servicePromotion && servicePromotion.isCreditAllowed === false && serviceDiscount > 0) ||
      (!hasAnyItemizedPromoObj &&
        appliedPromotion &&
        appliedPromotion.isCreditAllowed === false &&
        serviceDiscount > 0))
  );

  const chargeIncludesSingleUnder = Boolean(includeUnderServiceSlot && !underUsesBalancePackage);
  const upperServiceChargeCap =
    (upperUsesBalancePackage
      ? 0
      : Math.max(0, Math.round(Number(catalog.upperService.singlePriceAmount || effectiveServiceTotal)))) +
    Math.max(0, Math.round(Number(upgradePrice || 0)));
  const upperServiceDiscount =
    chargeIncludesSingleUnder && serviceDiscount > 0
      ? Math.min(upperServiceChargeCap, serviceDiscount)
      : serviceDiscount;
  const underServiceDiscount =
    chargeIncludesSingleUnder && serviceDiscount > 0 ? Math.max(0, serviceDiscount - upperServiceDiscount) : 0;

  const serviceLineCredits = !isServiceCreditRestricted ? diamondCredits : 0;
  const remainingProductCreditsToAssign = isServiceCreditRestricted ? diamondCredits : 0;

  const selectedService: Array<Record<string, SafeAny>> = [
    {
      ...(catalog.existingOrderServiceIds[0] ? { order_service_id: String(catalog.existingOrderServiceIds[0]) } : {}),
      service_id: String(catalog.upperService.serviceId),
      service_price_id: String(upperPriceId),
      service_price_ids: [String(upperPriceId)],
      assigned_staff_id: String(assignedStaffId),
      upgrade_price: String(Math.max(0, Math.round(Number(upgradePrice || 0)))),
      downgrade_price: '0',
      ...(resolvedServicePromoId && upperServiceDiscount > 0 ? { promotion_id: String(resolvedServicePromoId) } : {}),
      discount_amount: String(upperServiceDiscount),
      paid_credit_amount: String(serviceLineCredits),
    },
  ];

  if (includeUnderServiceSlot && catalog.underService) {
    const underPriceId = underUsesBalancePackage
      ? catalog.underService.balancePriceId || catalog.underService.singlePriceId
      : catalog.underService.singlePriceId;
    selectedService.push({
      ...(catalog.existingOrderServiceIds[1] ? { order_service_id: String(catalog.existingOrderServiceIds[1]) } : {}),
      service_id: String(catalog.underService.serviceId),
      service_price_id: String(underPriceId),
      service_price_ids: [String(underPriceId)],
      assigned_staff_id: String(assignedStaffId),
      upgrade_price: '0',
      downgrade_price: '0',
      ...(resolvedServicePromoId && underServiceDiscount > 0 ? { promotion_id: String(resolvedServicePromoId) } : {}),
      discount_amount: String(underServiceDiscount),
      paid_credit_amount: '0',
    });
  }

  const upperComboDiscount = hasAnyPromoObj
    ? itemizedPromo.comboDiscount
    : comboDiscount > 0 && hasUpperComboPurchase && comboTotal > 0
      ? hasUnderComboPurchase
        ? Math.min(upperComboPrice, Math.round((comboDiscount * upperComboPrice) / comboTotal))
        : comboDiscount
      : 0;
  const underComboDiscount = hasAnyPromoObj
    ? itemizedPromo.underComboDiscount
    : comboDiscount > 0 && hasUnderComboPurchase
      ? Math.max(0, comboDiscount - upperComboDiscount)
      : 0;

  const selectedServiceCombo: Array<Record<string, SafeAny>> = [];
  if (hasUpperComboPurchase && catalog.upperCombo) {
    selectedServiceCombo.push({
      service_id: String(catalog.upperCombo.serviceId),
      service_price_id: String(catalog.upperCombo.servicePriceId),
      service_price_ids: [String(catalog.upperCombo.servicePriceId)],
      ...(resolvedUpperComboPromoId && upperComboDiscount > 0
        ? { promotion_id: String(resolvedUpperComboPromoId) }
        : {}),
      discount_amount: String(upperComboDiscount),
    });
  } else if (hasUnderComboPurchase && includeUnderServiceSlot) {
    // Giữ chỗ {} ở index 0 để OrderServiceCombo::saveOrderService gắn đúng gói Mi Dưới vào $orderServices[1]
    selectedServiceCombo.push({});
  }

  if (hasUnderComboPurchase && catalog.underCombo && includeUnderServiceSlot) {
    selectedServiceCombo.push({
      service_id: String(catalog.underCombo.serviceId),
      service_price_id: String(catalog.underCombo.servicePriceId),
      service_price_ids: [String(catalog.underCombo.servicePriceId)],
      ...(resolvedUnderComboPromoId && underComboDiscount > 0
        ? { promotion_id: String(resolvedUnderComboPromoId) }
        : {}),
      discount_amount: String(underComboDiscount),
    });
  }

  const subtotal = Math.round(Number(billing?.subtotal ?? effectiveServiceTotal + comboTotal + productTotal));
  const subtotalAfterDiscount = Math.max(0, subtotal - orderDiscountTotal);
  const vatAmount = Math.round(Number(billing?.vatAmount ?? Math.round(subtotalAfterDiscount * 0.08)));
  const tipAmount = Math.max(0, Math.round(Number(billing?.tipAmount ?? 0)));
  const diamondDiscountVnd = diamondCredits * 1000;
  const grandTotal = Math.max(
    0,
    Math.round(Number(billing?.grandTotal ?? subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountVnd))
  );

  const normalizedPayment = resolveNormalizedPaymentBreakdown(
    grandTotal,
    billing?.paymentMethod,
    billing?.paymentBreakdown
  );
  const paymentMethod = normalizedPayment.paymentMethod;
  const shouldSettleCompletedImmediately = shouldAutoCompleteLegacyOrder(
    paymentMethod,
    grandTotal,
    settlementActorTier,
    normalizedPayment.breakdown
  );

  const bankTransferRef =
    String(billing?.bankTransferRef || '').trim() ||
    (normalizedPayment.hasVietqr && grandTotal > 0 ? `MOS-VIETQR-${orderId}-${Date.now()}` : '');

  const selectedProductForPayment = buildLegacySelectedProductsForPayment({
    orderId,
    catalogProducts: catalog.products,
    cartProducts,
    productDiscount,
    effectivePromotionId: hasSuspendedSessionPromo ? null : effectivePromotionId,
    hasAnyPromoObj,
    itemizedProductDiscounts: itemizedPromo.productDiscounts,
    remainingProductCreditsToAssign,
  });

  const orderLevelPromotionId = hasAnyItemizedPromoObj
    ? itemizedPromo.unifiedOrderPromotionId
    : hasSuspendedSessionPromo
      ? null
      : effectivePromotionId;

  const upperAttrMap = buildUpperLashAttributeMap({ attributes, serviceName, selectedCombo });
  const underAttrMap = buildUnderLashAttributeMap(attributes);
  const upperGroupKey = catalog.upperService.serviceGroup || 'LashesTop';
  const underGroupKey = catalog.underService?.serviceGroup || 'LashesUnder';

  const checkInAttributeValue: Record<string, LegacyServiceAttributeMap> = {
    [upperGroupKey]: upperAttrMap,
    ...(includeUnderServiceSlot ? { [underGroupKey]: underAttrMap } : {}),
  };

  const consultationAttributeValue: LegacyServiceAttributeMap[] = includeUnderServiceSlot
    ? [upperAttrMap, underAttrMap]
    : [upperAttrMap];

  const assignedStaffArr = selectedService.map(() => ({ user_id: String(assignedStaffId) }));

  const consultationPayload: Record<string, SafeAny> = {
    order_id: String(orderId),
    order_service_index: '0',
    assigned_staff_id: String(assignedStaffId),
    ...(catalog.bookingDateStart ? { booking_date_start: catalog.bookingDateStart } : {}),
    selected_service: selectedService,
    selected_service_combo: selectedServiceCombo,
    assigned_staff: assignedStaffArr,
    attribute_value: consultationAttributeValue,
  };

  // Tách riêng attribute_group_key (PHP dùng time() 1 giây) giữa Mi Trên và Mi Dưới:
  // Bước 2A lưu riêng attribute Mi Trên (index 1 để rỗng {}), chờ qua giây kế tiếp rồi Bước 2B mới lưu attribute Mi Dưới.
  const preConsultationUpperAttrPayload: Record<string, SafeAny> | undefined = includeUnderServiceSlot
    ? {
        ...consultationPayload,
        attribute_value: [upperAttrMap, {}],
      }
    : undefined;

  const paymentUpdatePayload: Record<string, SafeAny> = {
    order_id: String(orderId),
    assigned_staff_id: String(assignedStaffId),
    ...(catalog.bookingDateStart ? { booking_date_start: catalog.bookingDateStart } : {}),
    selected_service: selectedService,
    selected_service_combo: selectedServiceCombo,
    selected_product: selectedProductForPayment,
    ...(orderLevelPromotionId && orderLevelPromotionId > 0 ? { promotion_id: String(orderLevelPromotionId) } : {}),
    ...(catalog.userUrlId && catalog.userUrlId > 0 ? { user_url_id: String(catalog.userUrlId) } : {}),
    paid_cash_amount: String(normalizedPayment.breakdown.cashAmount),
    paid_credit_card_amount: String(normalizedPayment.breakdown.posAmount),
    paid_bank_transfer_amount: String(normalizedPayment.breakdown.vietqrAmount),
    ...(normalizedPayment.hasVietqr && bankTransferRef ? { paid_bank_transfer_transaction_id: bankTransferRef } : {}),
    paid_credit_amount: String(diamondCredits),
    discount_amount: String(orderDiscountTotal),
    prepaid_amount: '0',
    debt_amount: '0',
    deposit_amount: '0',
    tip_amount: String(tipAmount),
    tax_amount: String(vatAmount),
  };

  return {
    paymentMethod,
    paymentBreakdown: normalizedPayment.breakdown,
    shouldSettleCompletedImmediately,
    promotionId: orderLevelPromotionId,
    discountAmount: orderDiscountTotal,
    subtotal,
    vatAmount,
    tipAmount,
    diamondCredits,
    diamondDiscountVnd,
    grandTotal,
    bankTransferRef,
    selectedService,
    selectedServiceCombo,
    selectedProductForPayment,
    checkInAttributeValue,
    preConsultationUpperAttrPayload,
    consultationPayload,
    paymentUpdatePayload,
  };
}
