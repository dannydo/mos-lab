import { calculateComboBonus, type CvToCvPlusRequirements } from './career-progression.js';

export type IosUserRole = 'CVL' | 'CVLL' | 'CC' | 'CV' | 'STORE' | 'INVENTORY';
export type BookingScopeMode = 'MY_CUSTOMERS' | 'STORE_ALL';
export type CustomerBookingTab = 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
export type IosBookingStatus = 'INCOMING' | 'CHECKED_IN' | 'SERVICING' | 'DONE' | 'CANCELLED';
export type IosSettlementStatus = 'SETTLED_COMPLETED' | 'PENDING_COUNTER_SETTLEMENT' | 'DEMO_ONLY' | 'BRIDGE_DEFERRED';

export interface IosBranchConfig {
  id: number;
  code: string;
  name: string;
  shortName: string;
  address: string;
  receiptName: string;
}

export interface IosSegmentCounts {
  incoming: number;
  servicing: number;
  done: number;
  cancel: number;
}

export interface IosStaffMonthlyStats {
  staffId: number;
  month: number;
  monthLabel: string;
  monthlyRevenue: number;
  monthlyRevenueFormatted: string;
  completedShiftsCount: number;
  satisfactionRate: number;
  rating: number;
  completedToday?: number;
  pointsToday?: number;
  monthlyPoints?: number;
  serviceBonusMonth?: number;
  tipEarnedToday?: number;
  tipEarnedMonth?: number;
  comboBonusToday?: number;
  serumBonusToday?: number;
  comboBonusMonth?: number;
  hourlyPayMonth?: number;
  shiftHours?: string;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
}

export interface IosActiveActorProfile {
  staffId: number;
  name: string;
  tier: 'CVL' | 'CVLL' | 'CV' | 'CC' | 'ADMIN';
  badgeLabel: string;
  avatar?: string;
  storeId?: number;
  branchCode?: string;
  branchName?: string;
}

export interface NaturalLashConsultationAttributes {
  naturalLashLength?: string;
  naturalLashThickness?: string;
  naturalLashCount?: string;
  naturalLashDensity?: string;
  lashTrail?: string;
  eyeShape?: string;
  lashHealth?: string;
  medicalProblem?: string;
  isNewClientDiagnosticDone?: boolean;
}

export interface LashHistoryPhoto {
  type: 'before' | 'cleaned' | 'after';
  label: string;
  url: string;
  sublabel?: string;
}

export interface LashHistoryStaffMember {
  role: string;
  name: string;
  avatar?: string;
  tier?: string;
}

export interface LashHistoryItem {
  id?: number;
  orderId?: number;
  date: string;
  serviceName: string;
  staffName: string;
  rating?: number;
  review?: string;
  bookingNote?: string;
  totalPrice?: number;
  photos?: LashHistoryPhoto[];
  staffMembers?: {
    bookedBy?: LashHistoryStaffMember;
    checkInBy?: LashHistoryStaffMember;
    lashedBy?: LashHistoryStaffMember;
    checkOutBy?: LashHistoryStaffMember;
  };
  attributes?: {
    style?: string;
    curl?: string;
    length?: string;
    thickness?: string;
    fanCount?: string;
    volume?: string;
    material?: string;
    color?: string;
    eyeShape?: string;
    naturalLashLength?: string;
    naturalLashThickness?: string;
    notes?: string;
  };
}

export interface ComboPackageOption {
  id: string;
  name: string;
  sessions: number;
  price: number;
  cvBonus: number;
  badge: string;
}

export interface SerumTierOption {
  id: string;
  label: string;
  price: number;
  cvBonus: number;
  desc: string;
}

export interface IosSelectedComboRemaining {
  paidNew: number;
  paidRefill: number;
  bonusNew: number;
  bonusRefill: number;
  totalPaidRemaining: number;
  totalBonusRemaining: number;
  totalRemaining: number;
}

export interface IosSelectedCombo {
  id: string;
  name: string;
  price: number;
  bonus: number;
  sessions: number;
  ruleName?: string;
  categoryId?: string;
  categoryName?: string;
  volume?: number | 'under';
  paidNewCount?: number;
  paidRefillCount?: number;
  bonusNewCount?: number;
  bonusRefillCount?: number;
  validityMonths?: number;
  retailTotal?: number;
  savingsAmount?: number;
  avgPerSessionPrice?: number;
  todaySingleServiceWaived?: boolean;
  isUpTierUpgrade?: boolean;
  originalServiceCategory?: string;
  recognizedRevenueToday?: number;
  deferredRevenueBalance?: number;
  remainingAfterToday?: IosSelectedComboRemaining;
}

export interface IosSelectedUnderCombo {
  id: string;
  name: string;
  price: number;
  bonus: number;
  sessions: number;
  ruleName?: string;
  validityMonths?: number;
  retailTotal?: number;
  savingsAmount?: number;
  avgPerSessionPrice?: number;
  todaySingleServiceWaived?: boolean;
  recognizedRevenueToday?: number;
  deferredRevenueBalance?: number;
  remainingAfterToday?: IosSelectedComboRemaining;
}

export interface IosComboRedemption {
  comboName: string;
  deductedBucket: string;
  typeConversionSurcharge: number;
  upgradeVolumeSurcharge: number;
  totalCustomerPayToday: number;
  recognizedRevenueToday: number;
  remainingAfterToday: number;
  explanation: string;
  totalSessions: number;
  paidRemaining: number;
  bonusRemaining: number;
}

export interface IosBookingAttributes extends NaturalLashConsultationAttributes {
  style: string;
  curl: string;
  length: string;
  thickness: string;
  material?: string;
  color?: string;
  volume?: string;
  count?: string;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  underMinkCurl?: string;
  underMinkThickness?: string;
  underMinkLength?: string;
  underMinkCount?: string;
  underMinkColor?: string;
  isOverridden?: boolean;
  overrideReason?: string;
  notes?: string;
}

export interface IosBookingProgress {
  beforePhotoUrl?: string;
  cleanedPhotoUrl?: string;
  afterPhotoUrl?: string;
  elapsedSeconds: number;
  timerRunning: boolean;
  startedAt?: string;
  completedAt?: string;
  currentStep?: number;
  savedAt?: string;
  updatedAt?: string;
  cloudSynced?: boolean;
  cloudSyncedAt?: string;
  retainLashCountLeft?: number;
  retainLashCountRight?: number;
  retainLashes?: { left: number; right: number };
  retainAttributeValues?: Record<string, { attribute_option_value: string; attribute_key: string }>;
}

export interface IosCartProductItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  cvBonus?: number;
}

export interface IosBookingItem {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerId: number;
  customerVisits: number;
  customerNote: string;
  timeSlot: string;
  time12h?: string;
  serviceName: string;
  serviceType?: string;
  servicePrice: number;
  serviceDuration: number;
  originalBookedServiceName?: string;
  originalBookedServicePrice?: number;
  upgradePrice?: number;
  cvRotationPoints?: number;
  cvRotationBreakdown?: string;
  bookerName?: string;
  bookerAvatar?: string;
  customerTypeIcon?: string;
  hasDiscountTag?: boolean;
  assignedStaffName?: string;
  assignedStaffId?: number;
  assignedStaffAvatar?: string;
  assignedStaffTier?: string;
  isTrainingCvlOrder?: boolean;
  trainingMentorName?: string;
  checkInStaffId?: number;
  checkInStaffName?: string;
  checkInStaffTier?: string;
  checkInStaffAvatar?: string;
  checkOutStaffId?: number;
  checkOutStaffName?: string;
  checkOutStaffTier?: string;
  checkOutStaffAvatar?: string;
  customerAvatar?: string;
  assignedBed?: string;
  isUnassignedQueue?: boolean;
  isNextQueueCustomer?: boolean;
  isBookedInAdvance?: boolean;
  isTuaAssigned?: boolean;
  bookingAccessTag?: 'NEXT_CUSTOMER' | 'NEXT_QUEUE_CUSTOMER' | 'MY_BOOKED_CUSTOMER' | 'STORE_CUSTOMER';
  status: IosBookingStatus;
  comboLiveStatus?: {
    isComboLive: boolean;
    remainingSessions: number;
    normalRemaining?: number;
    retainRemaining?: number;
    comboName: string;
    serviceKey?: string;
    packageKey?: string;
    retainDaysLimit?: number;
    upsellOpportunity: boolean;
  };
  underMinkComboStatus?: {
    hasUnderCombo: boolean;
    remainingSessions: number;
    normalRemaining: number;
    retainRemaining: number;
    comboName: string;
    packageKey?: string;
  };
  diamondBalance?: number;
  debtAmount?: number;
  storeId?: number;
  branchCode?: string;
  branchName?: string;
  lastVisitDate?: string;
  lashHistory?: LashHistoryItem[];
  selectedCombo?: IosSelectedCombo | null;
  selectedUnderCombo?: IosSelectedUnderCombo | null;
  comboRedemption?: IosComboRedemption | null;
  _localComboUpdatedAt?: number;
  attributes?: IosBookingAttributes;
  progress?: IosBookingProgress;
  survey?: {
    rating: number;
    emotion: 'happy' | 'satisfied' | 'neutral' | 'unhappy';
    feedbackNote?: string;
  };
  cartProducts?: IosCartProductItem[];
  cvRewardBreakdown?: {
    techTipPercent: number;
    checkInTipPercent: number;
    checkOutTipPercent: number;
    cvTotalTipPercent: number;
    comboBonusAmount: number;
    serumBonusAmount: number;
    totalOrderBonusForCheckoutStaff: number;
  };
  billing?: {
    subtotal: number;
    vatRate?: number;
    vatAmount?: number;
    serviceTotal: number;
    comboTotal?: number;
    productTotal: number;
    paymentMethod: 'CASH' | 'POS' | 'VIETQR';
    tipAmount: number;
    tipCvShare: number;
    tipCheckInShare?: number;
    tipCheckOutShare?: number;
    tipCcShare: number;
    diamondUsed?: number;
    diamondDiscountAmount?: number;
    transferProofPhoto?: string;
    zaloConsent?: {
      agreed: boolean;
      phone: string;
      sentAt?: string;
      voucherCode?: string;
    };
    grandTotal: number;
    debtAmount?: number;
    completedAt?: string;
    settlementStatus?: IosSettlementStatus;
    bankTransferRef?: string;
    posTransactionId?: string;
    legacySyncedAt?: string;
  };
}

export interface IosBookingListQuery {
  storeId?: number;
  segment?: string;
  scope?: BookingScopeMode | string;
  role?: IosUserRole | string;
  staffId?: number;
  date?: string;
  limit?: number;
  demo?: boolean | '1' | '0';
}

export interface IosBookingListResponse {
  success: boolean;
  source?: 'mysql_live' | 'demo_mode';
  demoMode?: boolean;
  storeId?: number;
  segment?: string;
  role?: string;
  scope?: string;
  activeStaffId?: number;
  targetDate?: string;
  counts: IosSegmentCounts;
  count?: number;
  bookings: IosBookingItem[];
  staffStats?: IosStaffMonthlyStats;
  timestamp?: string;
  error?: string;
}

export type IosBookingActionType =
  | 'CHECK_IN'
  | 'SAVE_CONSULTATION_DRAFT'
  | 'SAVE_CONSULTATION'
  | 'ASSIGN_STAFF'
  | 'SAVE_PROGRESS'
  | 'START_SERVICE'
  | 'SAVE_SURVEY'
  | 'SAVE_UPSELL'
  | 'COMPLETE_CHECKOUT'
  | 'UPDATE_CUSTOMER_AVATAR'
  | 'RESET_DEMO';

export interface IosBookingActionPayload {
  bookingId: number;
  action: IosBookingActionType | string;
  actorStaffId?: number;
  actorStaffName?: string;
  actorStaffTier?: string;
  [key: string]: unknown;
}

export interface IosBookingActionResponse {
  success: boolean;
  bookingId?: number;
  action?: string;
  updatedOverride?: Record<string, unknown>;
  savedAt?: string;
  error?: string;
}

export interface IosPrintReceiptPayload {
  printerIp?: string;
  printerPort?: number;
  rawText: string;
}

export interface IosPrintReceiptResponse {
  success: boolean;
  printerIp?: string;
  printerPort?: number;
  bytesWritten?: number;
  error?: string;
}

export interface ActorTipBreakdown {
  tipAmount: number;
  techStaffId: number;
  techStaffName: string;
  techShareAmount: number;
  checkInStaffId: number;
  checkInStaffName: string;
  checkInShareAmount: number;
  checkOutStaffId: number;
  checkOutStaffName: string;
  checkOutShareAmount: number;
  fundShareAmount: number;
  actorEarnedPercent: number;
  actorEarnedAmount: number;
  actorRoleSummary: string;
}

export type ServicingSubStatus = {
  key: 'CHECKIN' | 'CLEANING' | 'LASHING' | 'SURVEY' | 'CHECKOUT';
  label: string;
  colorClass: string;
  targetStep: number;
};

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
 * Thưởng hoa hồng Combo CVL theo công thức đơn giản hóa động từ CAREER_PROGRESSION_RULES (Kinh Thánh mOS Điều răn CV-002 v2.8.0):
 * - Dưới 2M (< 2.000.000đ): comboUnder2mBonus (mặc định 50.000đ)
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
  const isTrainingCvl = Boolean(booking?.isTrainingCvlOrder && techStaffId > 0);

  const checkInStaffId = isTrainingCvl
    ? techStaffId
    : Number(booking?.checkInStaffId || techStaffId || actorStaffId || 0);
  const checkInStaffName = isTrainingCvl ? techStaffName : booking?.checkInStaffName || techStaffName;

  const checkOutStaffId = isTrainingCvl
    ? techStaffId
    : Number(booking?.checkOutStaffId || actorStaffId || techStaffId || 0);
  const checkOutStaffName = isTrainingCvl ? techStaffName : booking?.checkOutStaffName || actorName;

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
    actorRoleSummary:
      roles.length > 0 ? roles.join(' + ') : isTrainingCvl ? 'Hỗ trợ ca Đào tạo CVL (0%)' : 'Hỗ trợ ca (0%)',
  };
}

/**
 * Strict CVL (Chuyên Viên Tự Chủ) Customer Visibility Filter (Kinh Thánh mOS Điều răn UI-010):
 * CVL is strictly forbidden from viewing customers assigned to other Chuyên Viên.
 * CVL may ONLY view:
 * 1. Customers booked/assigned/checked-in/checked-out by this CVL.
 * 2. The 1 next upcoming unassigned customer at the head of the salon queue (Đầu tua).
 */
export function filterBookingsForCvlScope<T extends IosBookingItem>(bookings: T[], activeStaffId: number): T[] {
  let nextUnassignedIncluded = false;
  const result: T[] = [];

  for (const b of bookings) {
    const isServicing =
      b.status === 'SERVICING' ||
      (b.status === 'CHECKED_IN' && Boolean(b.progress?.startedAt) && !b.progress?.completedAt);

    const isStaffAssigned =
      (b.assignedStaffId && b.assignedStaffId === activeStaffId) ||
      (b.checkInStaffId && b.checkInStaffId === activeStaffId) ||
      (b.checkOutStaffId && b.checkOutStaffId === activeStaffId);

    if (isStaffAssigned) {
      result.push({
        ...b,
        status: isServicing ? 'SERVICING' : b.status,
        isNextQueueCustomer: false,
        bookingAccessTag: 'MY_BOOKED_CUSTOMER',
      });
      continue;
    }

    const isUnassignedIncoming =
      !isServicing &&
      (b.status === 'INCOMING' || b.status === 'CHECKED_IN') &&
      (b.isUnassignedQueue === true || !b.assignedStaffId || b.assignedStaffId === 0);

    if (isUnassignedIncoming && !nextUnassignedIncluded) {
      nextUnassignedIncluded = true;
      result.push({
        ...b,
        isUnassignedQueue: true,
        isNextQueueCustomer: true,
        bookingAccessTag: 'NEXT_CUSTOMER',
      });
    }
  }

  return result;
}

export function resolveCustomerBookingTab(
  b: Pick<IosBookingItem, 'id' | 'status' | 'billing' | 'progress'>,
  activeServicingBookingId?: number | null
): CustomerBookingTab {
  if (b.status === 'CANCELLED') return 'CANCEL';

  const isDone =
    b.status === 'DONE' ||
    Boolean(b.billing?.completedAt) ||
    (Boolean(b.progress?.completedAt) && b.status !== 'SERVICING');

  if (isDone) {
    return 'DONE';
  }

  if (b.status === 'CHECKED_IN') {
    return 'SERVICING';
  }

  const isServicing =
    b.status === 'SERVICING' ||
    Boolean(activeServicingBookingId && Number(b.id) === Number(activeServicingBookingId)) ||
    Boolean(b.progress?.startedAt && !b.progress?.completedAt) ||
    Boolean(b.progress?.currentStep && b.progress.currentStep >= 3 && !b.progress?.completedAt);

  if (isServicing) return 'SERVICING';

  return 'INCOMING';
}

export function resolveServicingSubStatus(
  b: Pick<IosBookingItem, 'status' | 'billing' | 'progress'>
): ServicingSubStatus {
  const step = b.progress?.currentStep ?? (b.status === 'CHECKED_IN' ? 3 : 6);

  if (step >= 12 || Boolean(b.billing?.completedAt)) {
    return {
      key: 'CHECKOUT',
      label: 'Checkout',
      colorClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      targetStep: 12,
    };
  }
  if (step >= 10) {
    return {
      key: 'SURVEY',
      label: 'Survey',
      colorClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      targetStep: 10,
    };
  }
  if (step >= 9 || b.progress?.timerRunning || (b.progress?.elapsedSeconds && b.progress.elapsedSeconds > 0)) {
    return {
      key: 'LASHING',
      label: 'Lashing',
      colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      targetStep: 9,
    };
  }
  if (step >= 7) {
    return {
      key: 'CLEANING',
      label: 'Cleaning',
      colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      targetStep: 8,
    };
  }
  return {
    key: 'CHECKIN',
    label: 'Check-in',
    colorClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    targetStep: 3,
  };
}

export function resolveIosCustomerTypeIcon(note: string, visits: number, isNew: number): string {
  const lowerNote = (note || '').toLowerCase();
  if (
    lowerNote.includes('[50%]') ||
    lowerNote.includes('wake up') ||
    lowerNote.includes('dính') ||
    lowerNote.includes('welcome') ||
    lowerNote.includes('uudai') ||
    lowerNote.includes('ưu đãi') ||
    lowerNote.includes('discount')
  ) {
    return '🙃';
  }
  if (isNew === 1 || visits <= 1) return '☕';
  return '🔄';
}

export function resolveIosHasDiscountTag(note: string, comboRequired: number, promotionId: unknown): boolean {
  const lowerNote = (note || '').toLowerCase();
  return (
    lowerNote.includes('[50%]') ||
    lowerNote.includes('uu dai') ||
    lowerNote.includes('ưu đãi') ||
    Boolean(promotionId) ||
    comboRequired === 1
  );
}
