import {
  calculateActorTipBreakdown,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  calculateIosItemizedPromotionDiscounts,
  filterBookingsForCvlScope,
  hasCompleteNaturalLashAttributes,
  IosBookingItem,
  IosBookingStatus,
  IosCartProductItem,
  IosPromotionOption,
  IosSegmentCounts,
  IosSettlementStatus,
  maskPhoneNumber,
  matchComboCategoryAndVolumeFromBooking,
  NaturalLashConsultationAttributes,
  resolveEffectiveServiceTotal,
  resolveNormalizedPaymentBreakdown,
  SafeAny,
} from '@mos-lab/shared';
import type { LastVisitSpecSummary, RawIosOrderSnapshot } from './ios-bookings-sql.service.js';

export function stripNewLashLabel(value: string): string {
  return value
    .replace(
      /\b(?:New\s+)+(?=(?:Classic|Volume|Flawless|Hyper(?:light)?|Ultra(?:light)?|Ivy(?:light)?|Mink|Under)\b)/gi,
      ''
    )
    .trim();
}

export function normalizeLashMaterialLabel(value?: string): string | undefined {
  if (!value) return value;
  const cleaned = stripNewLashLabel(value);
  return /^Classic$/i.test(cleaned) ? 'Classic 1D' : cleaned;
}

export function buildCanonicalServiceNameFromSpecs(specs?: LastVisitSpecSummary, visits = 0): string {
  if (!specs?.material) {
    return visits > 1 ? 'HyperLight 4X 770' : 'Chưa chọn mẫu mi (Tư vấn)';
  }
  const matched = matchComboCategoryAndVolumeFromBooking({
    material: specs.material,
    volume: specs.volume,
    count: specs.count,
    serviceKey: specs.serviceKey,
  });
  const sku = typeof matched.volume === 'number' ? matched.volume : 770;
  switch (matched.categoryId) {
    case 'Classic_1D':
    case 'Classic_Volume':
      return `Classic 1D ${sku}`;
    case 'Volume_2D':
      return `Volume 2D ${sku}`;
    case 'Volume_3D':
      return `Volume 3D ${sku}`;
    case 'FlawlessMink':
      return `Flawless Mink ${sku}`;
    case 'HyperLight_2X':
    case 'HyperLight_3X':
    case 'HyperLight_4X':
    case 'HyperLight_5X':
      return `HyperLight ${matched.categoryId.split('_')[1]} ${sku}`;
    case 'IvyLight_3L':
    case 'IvyLight_4L':
    case 'IvyLight_5L':
      return `Ivylight ${matched.categoryId.split('_')[1]} ${sku}`;
    case 'UltraLight_3D':
    case 'UltraLight_4D':
    case 'UltraLight_5D':
      return `UltraLight ${matched.categoryId.split('_')[1]} ${sku}`;
    default:
      return visits > 1 ? `HyperLight 4X ${sku}` : 'Chưa chọn mẫu mi (Tư vấn)';
  }
}

export function hydrateSavedNaturalLashAttributes(
  attrs: IosBookingItem['attributes'],
  savedProfile?: NaturalLashConsultationAttributes
): IosBookingItem['attributes'] {
  if (!attrs || !savedProfile) return attrs;
  if (attrs.isNewClientDiagnosticDone === false) return attrs;
  if (hasCompleteNaturalLashAttributes(attrs)) return attrs;
  return {
    ...savedProfile,
    ...attrs,
    naturalLashLength: attrs.naturalLashLength || savedProfile.naturalLashLength,
    naturalLashThickness: attrs.naturalLashThickness || savedProfile.naturalLashThickness,
    naturalLashCount: attrs.naturalLashCount || savedProfile.naturalLashCount,
    naturalLashDensity: attrs.naturalLashDensity || savedProfile.naturalLashDensity,
    lashTrail: attrs.lashTrail || savedProfile.lashTrail,
    eyeShape: attrs.eyeShape || savedProfile.eyeShape,
    lashHealth: attrs.lashHealth || savedProfile.lashHealth,
    medicalProblem: attrs.medicalProblem || savedProfile.medicalProblem,
    isNewClientDiagnosticDone: true,
  };
}

/**
 * Chuẩn hóa giá dịch vụ niêm yết gốc (gross) trước khuyến mãi để tránh giảm trùng 2 lần (double-discount)
 * và tránh dò sai size gói Combo khi `order.total_price` đã bị trừ sẵn mã 50% từ lúc đặt lịch.
 */
export function resolveCanonicalBookedServicePrice(
  r: Pick<
    RawIosOrderSnapshot,
    | 'os_service_price'
    | 'os_discount_amount'
    | 'catalog_single_price'
    | 'total_price'
    | 'is_temporary'
    | 'promotion_id'
    | 'os_promotion_id'
  >,
  overrideServicePrice?: unknown
): number {
  const explicitOverride = Number(overrideServicePrice);
  if (Number.isFinite(explicitOverride) && explicitOverride > 0) return explicitOverride;
  const osGross = Number(r.os_service_price);
  if (Number.isFinite(osGross) && osGross > 0) return osGross;
  const catalogSingle = Number(r.catalog_single_price);
  if (Number(r.is_temporary) !== 1 && Number.isFinite(catalogSingle) && catalogSingle > 0) {
    return catalogSingle;
  }
  const totalPrice = Number(r.total_price) || 0;
  const osDiscount = Number(r.os_discount_amount) || 0;
  const hasLegacyPromo = Boolean(
    (r.promotion_id && Number(r.promotion_id) > 0) || (r.os_promotion_id && Number(r.os_promotion_id) > 0)
  );
  if (hasLegacyPromo && osDiscount > 0 && totalPrice >= 0 && totalPrice + osDiscount > 0) {
    return totalPrice + osDiscount;
  }
  return totalPrice > 0 ? totalPrice : 550000;
}

export function resolveCustomerAvatar(dbAvatar: string | null | undefined, userId?: number): string | undefined {
  if (!dbAvatar) return undefined;
  const trimmed = String(dbAvatar).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com\//, 'https://cdn.wingslashes.com/');
  }
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  if (userId) {
    return `https://cdn.wingslashes.com/uploads/user/avatar/${userId}/thumbnail/${trimmed}`;
  }
  return undefined;
}

export function resolveStaffAvatar(dbAvatar: string | null | undefined): string | undefined {
  if (!dbAvatar || typeof dbAvatar !== 'string') return undefined;
  const trimmed = dbAvatar.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com\//, 'https://cdn.wingslashes.com/');
  }
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  return undefined;
}

export function formatTime12h(dateStart: Date | string | null): string {
  if (!dateStart) return '09:00 am';
  const start = new Date(dateStart);
  if (Number.isNaN(start.getTime())) return '09:00 am';

  let hours = start.getHours();
  const minutes = start.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours || 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export function formatTimeSlot(dateStart: Date | string | null, durationMinutes: number): string {
  if (!dateStart) return '09:00 - 10:30';
  const start = new Date(dateStart);
  if (Number.isNaN(start.getTime())) return '09:00 - 10:30';

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

export function formatPhoneNumberDots(phone: string | null | undefined, isMasked: boolean = false): string {
  if (!phone) return isMasked ? '**** ******' : '0901.xxx.xxx';
  if (isMasked) {
    return maskPhoneNumber(phone);
  }
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)}.${cleaned.slice(4, 7)}.${cleaned.slice(7)}`;
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)}.${cleaned.slice(5, 8)}.${cleaned.slice(8)}`;
  }
  return phone;
}

export function resolveBookingStatusFromState(
  overrideStatus: IosBookingStatus | undefined,
  state: string | null | undefined,
  targetDate: string,
  todayVn: string
): IosBookingStatus {
  if (overrideStatus) {
    return overrideStatus;
  }
  if (state === 'Parking' || state === 'CheckIn' || state === 'Check-in' || state === 'Consultation') {
    return 'CHECKED_IN';
  }
  if (
    [
      'Preparation',
      'ServiceStart',
      'Service Start',
      'ServiceCleaned',
      'Service Cleaned',
      'ServiceEnd',
      'Service End',
      'ServiceCompleted',
      'Service Completed',
      'In-progress',
    ].includes(String(state || ''))
  ) {
    return 'SERVICING';
  }
  if (['Completed', 'CheckOut', 'Check-out'].includes(String(state || ''))) {
    return 'DONE';
  }
  if (['Cancelled', 'Missed'].includes(String(state || ''))) {
    return 'CANCELLED';
  }
  if (targetDate < todayVn && (state === 'New' || state === 'Confirmed')) {
    return 'DONE';
  }
  return 'INCOMING';
}

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
      cvTotalTipPercent: isTrainingCvlOrder ? (targetStaffId === assignedStaffId ? 90 : 0) : tipBreakdown.actorEarnedPercent,
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
      ...(overrideBilling?.preCheckoutRecordedAt ? { preCheckoutRecordedAt: overrideBilling.preCheckoutRecordedAt } : {}),
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

export function applyIosScopeAndCounts(
  allBookings: IosBookingItem[],
  params: {
    effectiveRole: string;
    scope: string;
    activeStaffId: number;
    storeId?: number;
    targetDate?: string;
    todayVn?: string;
  }
): { effectiveList: IosBookingItem[]; counts: IosSegmentCounts } {
  const { effectiveRole, scope, activeStaffId, storeId, targetDate, todayVn } = params;
  const shouldApplyCvlPrivacyScope =
    effectiveRole === 'CVL' || (effectiveRole !== 'CC' && effectiveRole !== 'STORE' && scope === 'MY_CUSTOMERS');
  const branchFiltered =
    storeId && storeId > 0 && (effectiveRole === 'CVL' || shouldApplyCvlPrivacyScope)
      ? allBookings.filter((b) => !b.storeId || Number(b.storeId) === Number(storeId))
      : allBookings;
  const effectiveList = shouldApplyCvlPrivacyScope
    ? filterBookingsForCvlScope(branchFiltered, activeStaffId, { targetDate, todayVn })
    : branchFiltered;

  const counts: IosSegmentCounts = {
    incoming: effectiveList.filter((b) => b.status === 'INCOMING').length,
    servicing: effectiveList.filter((b) => b.status === 'SERVICING' || b.status === 'CHECKED_IN').length,
    done: effectiveList.filter((b) => b.status === 'DONE').length,
    cancel: effectiveList.filter((b) => b.status === 'CANCELLED').length,
  };

  return { effectiveList, counts };
}

export function buildDefaultLiveOrderAttributes(params: {
  isFirstVisitClient: boolean;
  savedProfile?: NaturalLashConsultationAttributes;
  isRawOrderPlaceholder: boolean;
  lastSpecs?: {
    material?: string;
    volume?: string;
    count?: string;
    style?: string;
    color?: string;
    serviceKey?: string;
  };
  actualSpecs?: {
    volume?: string;
    count?: string;
    style?: string;
    color?: string;
    hasUnderMink?: boolean;
    underMinkServiceType?: 'Normal' | 'Retain';
  };
  effectiveServiceName: string;
  serviceKey?: string | null;
  servicePrice: number;
  note?: string;
  normalizeLashMaterialLabel: (value?: string) => string | undefined;
}): IosBookingItem['attributes'] {
  const {
    isFirstVisitClient,
    savedProfile,
    isRawOrderPlaceholder,
    lastSpecs,
    actualSpecs,
    effectiveServiceName,
    serviceKey,
    servicePrice,
    note,
    normalizeLashMaterialLabel,
  } = params;

  const matchedSpec = matchComboCategoryAndVolumeFromBooking({
    material: isRawOrderPlaceholder ? lastSpecs?.material : undefined,
    volume: actualSpecs?.volume || (isRawOrderPlaceholder ? lastSpecs?.volume : undefined),
    count: actualSpecs?.count || (isRawOrderPlaceholder ? lastSpecs?.count : undefined),
    serviceName: effectiveServiceName,
    serviceKey: !isRawOrderPlaceholder ? serviceKey || undefined : lastSpecs?.serviceKey,
    servicePrice: !isRawOrderPlaceholder ? servicePrice : undefined,
  });
  const catId = matchedSpec.categoryId;
  const defaultMat =
    catId === 'Classic_1D' || catId === 'Classic_Volume'
      ? 'Classic 1D'
      : catId === 'Volume_2D' || catId === 'Volume_3D'
        ? 'Volume'
        : catId.startsWith('HyperLight')
          ? 'HyperLight'
          : catId.startsWith('IvyLight')
            ? 'Ivylight'
            : catId.startsWith('UltraLight')
              ? 'UltraLight'
              : 'Flawless Mink';
  const defaultVol =
    defaultMat === 'Classic 1D' || defaultMat === 'Flawless Mink'
      ? '1D'
      : catId === 'Volume_3D'
        ? '3D'
        : catId === 'Volume_2D'
          ? '2D'
          : catId.includes('_')
            ? catId.split('_')[1]
            : '4X';
  const unit =
    defaultMat === 'Classic 1D' || defaultMat === 'Flawless Mink' ? 'sợi' : defaultMat === 'Ivylight' ? 'nhịp' : 'fan';
  const fallbackCountPerEye =
    defaultMat === 'Classic 1D' || defaultMat === 'Ivylight'
      ? 90
      : defaultMat === 'Flawless Mink'
        ? 60
        : defaultMat === 'UltraLight' || defaultMat === 'Volume'
          ? 80
          : 70;
  const resolvedCountPerEye =
    matchedSpec.volume !== 'under' && matchedSpec.volumeMeta?.countPerEye
      ? matchedSpec.volumeMeta.countPerEye
      : fallbackCountPerEye;
  const defaultCount = `${resolvedCountPerEye} ${unit}`;
  const normalizedLastMaterial = normalizeLashMaterialLabel(lastSpecs?.material);
  const canInheritLastSpecs = isRawOrderPlaceholder || normalizedLastMaterial === defaultMat;

  return {
    material: canInheritLastSpecs ? normalizedLastMaterial || defaultMat : defaultMat,
    style: actualSpecs?.style || lastSpecs?.style || 'Natural',
    volume: actualSpecs?.volume || (canInheritLastSpecs ? lastSpecs?.volume || defaultVol : defaultVol),
    count: actualSpecs?.count || (canInheritLastSpecs ? lastSpecs?.count || defaultCount : defaultCount),
    color: actualSpecs?.color || lastSpecs?.color,
    hasUnderMink: actualSpecs?.hasUnderMink,
    underMinkServiceType: actualSpecs?.underMinkServiceType,
    curl: 'C',
    length: '10-12 mm',
    thickness: defaultMat === 'Flawless Mink' ? '0.07 mm' : '0.10 mm',
    isNewClientDiagnosticDone: savedProfile ? true : isFirstVisitClient ? false : undefined,
    notes: note || '',
  };
}
