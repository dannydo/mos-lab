import {
  canDirectlySettleCounterPayment,
  IosCartProductItem,
  resolveEffectiveServiceTotal,
  SafeAny,
} from '@mos-lab/shared';
import { LegacyOrderCatalogSnapshot } from './ios-legacy-catalog.service.js';

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

export type LegacyAttributeOptionEntry = {
  attribute_option_id: string;
  attribute_option_value: string;
};

export type LegacyServiceAttributeMap = Record<string, LegacyAttributeOptionEntry[]>;

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
  billing?: SafeAny;
  settlementActorTier?: string | null;
  catalog: LegacyOrderCatalogSnapshot;
}

export interface BuiltLegacyOrderPayloads {
  paymentMethod: 'CASH' | 'POS' | 'VIETQR';
  shouldSettleCompletedImmediately: boolean;
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
  actorTierOrRole?: string | null
): boolean {
  if (Math.round(Number(grandTotal || 0)) <= 0) {
    return true;
  }
  if (String(paymentMethod || 'VIETQR').toUpperCase() === 'VIETQR') {
    return true;
  }
  return canDirectlySettleCounterPayment(actorTierOrRole);
}

export function buildUpperLashAttributeMap(params: {
  attributes?: SafeAny;
  serviceName?: string;
  selectedCombo?: SafeAny;
}): LegacyServiceAttributeMap {
  const attrs = params.attributes || {};
  const upperServiceTitle = String(params.serviceName || '').split(
    /\+\s*(?:mi\s*dưới|(?:new\s+|retain\s+|dặm\s+)?(?:flawless\s+)?under\b)/i
  )[0];
  const upperTextHint = `${upperServiceTitle} ${params.selectedCombo?.id || ''} ${params.selectedCombo?.name || ''}`;

  const rawCurl = String(attrs.curl || 'C')
    .trim()
    .toUpperCase();
  const curlMap: Record<string, LegacyAttributeOptionEntry> = {
    J: { attribute_option_id: '44', attribute_option_value: 'j' },
    B: { attribute_option_id: '45', attribute_option_value: 'b' },
    C: { attribute_option_id: '46', attribute_option_value: 'c' },
    D: { attribute_option_id: '47', attribute_option_value: 'd' },
    L: { attribute_option_id: '48', attribute_option_value: 'l' },
  };
  const curlEntry = curlMap[rawCurl] || curlMap.C;

  // /ios-app lưu dáng mi tại attributes.style ('Natural' | 'Doll' | 'Wing' | 'Kim K' ...), đồng thời tương thích attributes.design
  const rawDesign = String(attrs.style || attrs.design || 'Natural')
    .trim()
    .toLowerCase();
  let designEntry: LegacyAttributeOptionEntry = { attribute_option_id: '49', attribute_option_value: 'natural' };
  if (rawDesign.includes('doll') || rawDesign.includes('búp bê')) {
    designEntry = { attribute_option_id: '102', attribute_option_value: 'doll' };
  } else if (rawDesign.includes('wing') || rawDesign.includes('cat') || rawDesign.includes('fox')) {
    designEntry = { attribute_option_id: '50', attribute_option_value: 'wing' };
  } else if (
    rawDesign.includes('kim') ||
    rawDesign.includes('katun') ||
    rawDesign.includes('anime') ||
    rawDesign.includes('wispy') ||
    rawDesign.includes('wet') ||
    rawDesign.includes('thai') ||
    rawDesign.includes('thiết kế')
  ) {
    designEntry = { attribute_option_id: '101', attribute_option_value: 'kim-k' };
  }

  const rawLengthTokens: string[] =
    Array.isArray(attrs.lengths) && attrs.lengths.length > 0
      ? attrs.lengths.map((n: SafeAny) => String(n))
      : String(attrs.length || '10 - 12mm').match(/\d+/g) || ['10', '12'];
  const parsedLengths: number[] = Array.from(
    new Set<number>(
      rawLengthTokens.map((n: string) => Number(n)).filter((n: number) => Number.isFinite(n) && n >= 6 && n <= 17)
    )
  );
  const effectiveLengths = parsedLengths.length > 0 ? parsedLengths : [10, 12];
  const lengthEntries: LegacyAttributeOptionEntry[] = effectiveLengths.map((len) => ({
    attribute_option_id: String(45 + len),
    attribute_option_value: String(len),
  }));

  // /ios-app lưu số lượng tại attributes.count ('70 fan' | '90 sợi' | '110 trụ'), đồng thời hỗ trợ attributes.lashCount
  const attrCountMatch = String(attrs.count ?? attrs.lashCount ?? '').match(/\d+/);
  const fanMatch = upperTextHint.match(/\((\d{2,3})\s*(?:fan|trụ|sợi|nhịp)\)/i);
  const rawCount = Number(attrCountMatch?.[0] || fanMatch?.[1] || 70);
  const clampedCount = rawCount <= 20 ? 20 : Math.min(230, Math.max(30, Math.round(rawCount / 10) * 10));
  const countOptionId = clampedCount === 20 ? 210 : 60 + clampedCount / 10;
  const lashCountEntry: LegacyAttributeOptionEntry = {
    attribute_option_id: String(countOptionId),
    attribute_option_value: String(clampedCount),
  };

  // Chuẩn hóa Fan theo staff_bonus_rule:
  // - Classic 1D / Flawless Mink -> 1D (id=84, 0 pts)
  // - Volume 2D -> 2D (id=85, 0 pts)
  // - HyperLight/UltraLight 2X hoặc 3D/3X/3L -> 3D (id=86, +1 pt)
  // - 4D/4X/4L -> 4D (id=87, +2 pts)
  // - 5D/5X/5L -> 5D (id=88, +3 pts)
  const matHint = `${attrs.material || ''} ${upperTextHint}`.toLowerCase();
  const volHint = `${attrs.volume || ''} ${upperTextHint}`;
  const isLightOrIvy = matHint.includes('hyper') || matHint.includes('ultra') || matHint.includes('ivy');
  let volDigit = 4;
  if (!isLightOrIvy && (matHint.includes('classic') || matHint.includes('flawless') || matHint.includes('mink'))) {
    volDigit = 1;
  } else if (!isLightOrIvy && matHint.includes('volume')) {
    volDigit = 2;
  } else if (/5\s*[xdlℓ𝓵𝓛]/iu.test(volHint)) {
    volDigit = 5;
  } else if (/4\s*[xdlℓ𝓵𝓛]/iu.test(volHint)) {
    volDigit = 4;
  } else if (/3\s*[xdlℓ𝓵𝓛]/iu.test(volHint) || /\b2\s*x\b/i.test(volHint)) {
    volDigit = 3;
  } else if (/\b2\s*d\b/i.test(volHint)) {
    volDigit = 2;
  } else if (/\b1\s*d\b/i.test(volHint)) {
    volDigit = 1;
  }
  const volumeEntry: LegacyAttributeOptionEntry = {
    attribute_option_id: String(83 + volDigit),
    attribute_option_value: `${volDigit}d`,
  };

  const rawColor = String(attrs.color || 'Black').toLowerCase();
  let colorEntry: LegacyAttributeOptionEntry = { attribute_option_id: '34', attribute_option_value: 'black' };
  if (rawColor.includes('brown') || rawColor.includes('nâu')) {
    colorEntry = { attribute_option_id: '35', attribute_option_value: 'brown' };
  } else if (rawColor.includes('blue') || rawColor.includes('xanh')) {
    colorEntry = { attribute_option_id: '89', attribute_option_value: 'blue' };
  } else if (rawColor.includes('purple') || rawColor.includes('tím')) {
    colorEntry = { attribute_option_id: '90', attribute_option_value: 'purple' };
  } else if (
    rawColor &&
    rawColor !== 'black' &&
    !rawColor.includes('đen') &&
    (rawColor.includes('color') ||
      rawColor.includes('màu') ||
      rawColor.includes('highlight') ||
      rawColor.includes('ombre'))
  ) {
    colorEntry = { attribute_option_id: '35', attribute_option_value: 'brown' };
  }

  const normalizedThick = String(attrs.thickness || (volDigit >= 3 ? '0.05' : '0.07'))
    .replace(/\s*mm/gi, '')
    .trim();
  const thickMap: Record<string, LegacyAttributeOptionEntry> = {
    '0.05': { attribute_option_id: '91', attribute_option_value: '0.05' },
    '0.07': { attribute_option_id: '92', attribute_option_value: '0.07' },
    '0.10': { attribute_option_id: '93', attribute_option_value: '0.10' },
    '0.1': { attribute_option_id: '93', attribute_option_value: '0.10' },
    '0.12': { attribute_option_id: '94', attribute_option_value: '0.12' },
    '0.15': { attribute_option_id: '95', attribute_option_value: '0.15' },
  };
  const thicknessEntry = thickMap[normalizedThick] || thickMap['0.07'];

  return {
    '9': [curlEntry],
    '10': [designEntry],
    '11': lengthEntries,
    '12': [lashCountEntry],
    '13': [volumeEntry],
    '14': [colorEntry],
    '15': [thicknessEntry],
  };
}

/**
 * Chuẩn hóa thông số Mi Dưới (Under Mink id=127/128) theo đúng quy chuẩn WingsLashes order.php:
 * - Khóa cứng Design=natural (49 -> 0 pts), Lashes=20 (210 -> +17 pts), Fan=1D (84 -> 0 pts), Color=black (34 -> 0 pts)
 * - Kết hợp Class (+5 pts) + Type (Normal +7 / Retain +0) = +29 pts (Mới) hoặc +22 pts (Dặm).
 */
export function buildUnderLashAttributeMap(attributes?: SafeAny): LegacyServiceAttributeMap {
  const attrs = attributes || {};
  const rawUnderCurl = String(attrs.underMinkCurl || 'B')
    .trim()
    .toUpperCase();
  const underCurlMap: Record<string, LegacyAttributeOptionEntry> = {
    J: { attribute_option_id: '44', attribute_option_value: 'j' },
    B: { attribute_option_id: '45', attribute_option_value: 'b' },
    C: { attribute_option_id: '46', attribute_option_value: 'c' },
  };
  const underCurl = underCurlMap[rawUnderCurl] || underCurlMap.B;

  const underLenMatch = String(attrs.underMinkLength || '6').match(/\d+/);
  const underLenNum = underLenMatch ? Math.min(8, Math.max(6, Number(underLenMatch[0]))) : 6;
  const underLenEntry: LegacyAttributeOptionEntry = {
    attribute_option_id: String(45 + underLenNum),
    attribute_option_value: String(underLenNum),
  };

  const normalizedUnderThick = String(attrs.underMinkThickness || '0.07')
    .replace(/\s*mm/gi, '')
    .trim();
  const underThickMap: Record<string, LegacyAttributeOptionEntry> = {
    '0.05': { attribute_option_id: '91', attribute_option_value: '0.05' },
    '0.07': { attribute_option_id: '92', attribute_option_value: '0.07' },
    '0.10': { attribute_option_id: '93', attribute_option_value: '0.10' },
    '0.1': { attribute_option_id: '93', attribute_option_value: '0.10' },
  };
  const underThickEntry = underThickMap[normalizedUnderThick] || underThickMap['0.07'];

  return {
    '9': [underCurl],
    '10': [{ attribute_option_id: '49', attribute_option_value: 'natural' }],
    '11': [underLenEntry],
    '12': [{ attribute_option_id: '210', attribute_option_value: '20' }],
    '13': [{ attribute_option_id: '84', attribute_option_value: '1D' }],
    '14': [{ attribute_option_id: '34', attribute_option_value: 'black' }],
    '15': [underThickEntry],
  };
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

  const diamondCredits = resolveDiamondCreditUnits(billing?.diamondUsed, billing?.diamondDiscountAmount);

  const selectedService: Array<Record<string, SafeAny>> = [
    {
      ...(catalog.existingOrderServiceIds[0] ? { order_service_id: String(catalog.existingOrderServiceIds[0]) } : {}),
      service_id: String(catalog.upperService.serviceId),
      service_price_id: String(upperPriceId),
      service_price_ids: [String(upperPriceId)],
      assigned_staff_id: String(assignedStaffId),
      upgrade_price: String(Math.max(0, Math.round(Number(upgradePrice || 0)))),
      downgrade_price: '0',
      discount_amount: '0',
      paid_credit_amount: String(diamondCredits),
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
      discount_amount: '0',
      paid_credit_amount: '0',
    });
  }

  const selectedServiceCombo: Array<Record<string, SafeAny>> = [];
  if (hasUpperComboPurchase && catalog.upperCombo) {
    selectedServiceCombo.push({
      service_id: String(catalog.upperCombo.serviceId),
      service_price_id: String(catalog.upperCombo.servicePriceId),
      service_price_ids: [String(catalog.upperCombo.servicePriceId)],
      discount_amount: '0',
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
      discount_amount: '0',
    });
  }

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

  const comboTotal =
    (hasUpperComboPurchase ? Number(selectedCombo?.price || catalog.upperCombo?.comboPriceAmount || 0) : 0) +
    (hasUnderComboPurchase ? Number(selectedUnderCombo?.price || catalog.underCombo?.comboPriceAmount || 0) : 0);

  const productTotal = cartProducts.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 1), 0);
  const subtotal = Math.round(Number(billing?.subtotal ?? effectiveServiceTotal + comboTotal + productTotal));
  const vatAmount = Math.round(Number(billing?.vatAmount ?? Math.round(subtotal * 0.08)));
  const tipAmount = Math.max(0, Math.round(Number(billing?.tipAmount ?? 0)));
  const diamondDiscountVnd = diamondCredits * 1000;
  const grandTotal = Math.max(
    0,
    Math.round(Number(billing?.grandTotal ?? subtotal + vatAmount + tipAmount - diamondDiscountVnd))
  );

  const rawMethod = String(billing?.paymentMethod || 'VIETQR').toUpperCase();
  const paymentMethod: 'CASH' | 'POS' | 'VIETQR' =
    rawMethod === 'CASH' ? 'CASH' : rawMethod === 'POS' ? 'POS' : 'VIETQR';
  const shouldSettleCompletedImmediately = shouldAutoCompleteLegacyOrder(
    paymentMethod,
    grandTotal,
    settlementActorTier
  );

  const bankTransferRef =
    String(billing?.bankTransferRef || '').trim() ||
    (paymentMethod === 'VIETQR' && grandTotal > 0 ? `MOS-VIETQR-${orderId}-${Date.now()}` : '');

  const selectedProductForPayment = catalog.products
    .filter((p) => p.firstInventoryWarehouseOrderItemId > 0)
    .map((p) => {
      const grossLine = p.unitPrice * p.quantity;
      const lineAfterDisc = Math.max(0, grossLine - p.discountAmount);
      const lineTax = Math.round(lineAfterDisc * 0.08);
      return {
        order_id: String(orderId),
        product_id: String(p.productId),
        first_inventory_warehouse_order_item_ids: [String(p.firstInventoryWarehouseOrderItemId)],
        product_price: String(grossLine),
        discount_amount: String(p.discountAmount),
        paid_credit_amount: '0',
        tax_amount: String(lineTax),
      };
    });

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
    ...(catalog.promotionId && catalog.promotionId > 0 ? { promotion_id: String(catalog.promotionId) } : {}),
    ...(catalog.userUrlId && catalog.userUrlId > 0 ? { user_url_id: String(catalog.userUrlId) } : {}),
    paid_cash_amount: paymentMethod === 'CASH' ? String(grandTotal) : '0',
    paid_credit_card_amount: paymentMethod === 'POS' ? String(grandTotal) : '0',
    paid_bank_transfer_amount: paymentMethod === 'VIETQR' ? String(grandTotal) : '0',
    ...(paymentMethod === 'VIETQR' && bankTransferRef ? { paid_bank_transfer_transaction_id: bankTransferRef } : {}),
    paid_credit_amount: String(diamondCredits),
    discount_amount: '0',
    prepaid_amount: '0',
    debt_amount: '0',
    deposit_amount: '0',
    tip_amount: String(tipAmount),
    tax_amount: String(vatAmount),
  };

  return {
    paymentMethod,
    shouldSettleCompletedImmediately,
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
