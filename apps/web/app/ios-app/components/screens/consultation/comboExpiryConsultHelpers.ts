import {
  calculateComboPurchaseAccounting,
  calculateComboPurchaseExpiry,
  calculateComboRedemptionAccounting,
  calculateDualComboTierBonus,
  formatExpiryDateDdMmYyyy,
  matchComboCategoryAndVolumeFromBooking,
  type ComboPurchaseExpiryResult,
  type ComboTodayUsageMode,
  type CvToCvPlusRequirements,
  type ExistingComboSnapshotForExpiry,
  type IosSelectedComboRemaining,
  type MatchedComboPackageOption,
  type WingsComboCategoryId,
} from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import type { ComboExpiryPreviewItem } from '../../ui-kit/WingsUnifiedComboCard';
import { parseDaysSinceLastVisit } from './constraints/comboAndUnderMinkPresets';

/**
 * Kiểm tra đơn đặt lịch có được gắn sẵn Mã khuyến mãi (từ bước book hoặc ở Checkout) hay không.
 * LƯU Ý: Tuyệt đối KHÔNG kiểm tra `hasDiscountTag` vì cờ đó cũng bật `true` khi `combo_sale_required = 1`.
 */
export function hasBookingPreattachedOrServicePromotion(booking?: BookingItem | null): boolean {
  if (!booking) return false;
  return Boolean(
    (booking.servicePromotionId && Number(booking.servicePromotionId) > 0) ||
    booking.servicePromotion ||
    (booking.promotionId && Number(booking.promotionId) > 0) ||
    booking.appliedPromotion
  );
}

/**
 * Trích xuất snapshot gói Combo Mi Trên hiện tại (còn hạn, bảo lưu hoặc đã hết hạn còn buổi tồn)
 * để truyền vào bộ máy tính HSD chuẩn `calculateComboPurchaseExpiry` (COMBO-004).
 */
export function extractExistingUpperExpirySnapshot(
  booking?: BookingItem | null
): ExistingComboSnapshotForExpiry | null {
  if (!booking) return null;
  const resolved = resolveActiveBookingComboWallets(booking);
  const upper = resolved.displayUpperWallet ?? resolved.effectiveComboLiveStatus ?? booking.comboLiveStatus;
  if (!upper) return null;

  const remaining = Math.max(0, Number(upper.remainingSessions || 0));
  if (remaining <= 0 && !upper.isExpired) {
    return null;
  }

  const normalRemaining =
    upper.normalRemaining !== undefined ? Math.max(0, Number(upper.normalRemaining)) : Math.floor(remaining / 2);
  const retainRemaining =
    upper.retainRemaining !== undefined
      ? Math.max(0, Number(upper.retainRemaining))
      : Math.max(0, remaining - normalRemaining);

  if (normalRemaining + retainRemaining <= 0) {
    return null;
  }

  return {
    normalRemaining,
    retainRemaining,
    dateExpired: upper.isFrozen ? null : upper.dateExpired,
    isFrozen: Boolean(upper.isFrozen),
    validityMonthsFallback: 3,
  };
}

/**
 * Trích xuất snapshot gói Combo Mi Dưới hiện tại (còn hạn, bảo lưu hoặc đã hết hạn còn buổi tồn).
 */
export function extractExistingUnderExpirySnapshot(
  booking?: BookingItem | null
): ExistingComboSnapshotForExpiry | null {
  if (!booking) return null;
  const resolved = resolveActiveBookingComboWallets(booking);
  const under = resolved.displayUnderWallet ?? resolved.effectiveUnderMinkComboStatus ?? booking.underMinkComboStatus;
  if (!under) return null;

  const remaining = Math.max(0, Number(under.remainingSessions || 0));
  if (remaining <= 0 && !under.isExpired) {
    return null;
  }

  const rawNormal = Number(under.normalRemaining ?? 0);
  const rawRetain = Number(under.retainRemaining ?? 0);
  const hasExplicitCounts = rawNormal + rawRetain > 0;
  const normalRemaining = hasExplicitCounts ? Math.max(0, rawNormal) : Math.floor(remaining / 2);
  const retainRemaining = hasExplicitCounts ? Math.max(0, rawRetain) : Math.max(0, remaining - normalRemaining);

  if (normalRemaining + retainRemaining <= 0) {
    return null;
  }

  return {
    normalRemaining,
    retainRemaining,
    dateExpired: under.isFrozen ? null : under.dateExpired,
    isFrozen: Boolean(under.isFrozen),
    validityMonthsFallback: 3,
  };
}

export function resolveDefaultUpperTodayUsageMode(booking?: BookingItem | null): ComboTodayUsageMode {
  const savedMode = booking?.selectedCombo?.todayUsageMode;
  if (booking?.skipUpperCombo) {
    return savedMode === 'USE_NEW_COMBO' ? 'USE_NEW_COMBO' : 'RETAIL_OR_VOUCHER';
  }
  if (savedMode === 'USE_NEW_COMBO' || savedMode === 'USE_OLD_COMBO' || savedMode === 'RETAIL_OR_VOUCHER') {
    return savedMode;
  }
  const resolved = booking ? resolveActiveBookingComboWallets(booking) : null;
  if (resolved?.isRedeemingUpperToday) {
    return 'USE_OLD_COMBO';
  }
  if (booking?.selectedCombo?.todaySingleServiceWaived === false) {
    return 'RETAIL_OR_VOUCHER';
  }
  if (hasBookingPreattachedOrServicePromotion(booking)) {
    return 'RETAIL_OR_VOUCHER';
  }
  return 'USE_NEW_COMBO';
}

export function resolveDefaultUnderTodayUsageMode(
  booking?: BookingItem | null,
  hasUnderMink?: boolean
): ComboTodayUsageMode {
  const savedMode = booking?.selectedUnderCombo?.todayUsageMode;
  if (booking?.skipUnderCombo) {
    return savedMode === 'USE_NEW_COMBO' ? 'USE_NEW_COMBO' : 'RETAIL_OR_VOUCHER';
  }
  if (savedMode === 'USE_NEW_COMBO' || savedMode === 'USE_OLD_COMBO' || savedMode === 'RETAIL_OR_VOUCHER') {
    return savedMode;
  }
  const resolved = booking ? resolveActiveBookingComboWallets(booking) : null;
  if (resolved?.isRedeemingUnderToday) {
    return 'USE_OLD_COMBO';
  }
  if (booking?.selectedUnderCombo?.todaySingleServiceWaived === false || hasUnderMink === false) {
    return 'RETAIL_OR_VOUCHER';
  }
  return 'USE_NEW_COMBO';
}

export function computePackageExpiry(params: {
  pkg: MatchedComboPackageOption;
  todayUsageMode: ComboTodayUsageMode;
  todayServiceType?: 'Normal' | 'Retain';
  existingCombo?: ExistingComboSnapshotForExpiry | null;
  todayDate?: string;
}): ComboPurchaseExpiryResult {
  const { pkg, todayUsageMode, todayServiceType = 'Normal', existingCombo = null, todayDate } = params;
  return calculateComboPurchaseExpiry({
    todayDate,
    newComboValidityMonths: pkg.validityMonths || 3,
    newComboNormalCount: (pkg.comboNewCount || 0) + (pkg.bonusNewCount || 0),
    newComboRetainCount: (pkg.comboRefillCount || 0) + (pkg.bonusRefillCount || 0),
    todayUsageMode,
    todayServiceType,
    existingCombo,
  });
}

export function formatExpiryBonusBadge(res: ComboPurchaseExpiryResult): string | undefined {
  if (res.revivedExpiredSessions > 0) {
    return `Cứu ${res.revivedExpiredSessions}b`;
  }
  if (res.earlyRenewalBonusMonths > 0 && res.retailVoucherBonusDays > 0) {
    return `+${res.earlyRenewalBonusMonths}T +${res.retailVoucherBonusDays}N`;
  }
  if (res.earlyRenewalBonusMonths > 0) {
    return `+${res.earlyRenewalBonusMonths}T sớm`;
  }
  if (res.retailVoucherBonusDays > 0) {
    return `+${res.retailVoucherBonusDays}N`;
  }
  return undefined;
}

export function buildPackagesExpiryPreviewMap(params: {
  packages: MatchedComboPackageOption[];
  todayUsageMode: ComboTodayUsageMode;
  todayServiceType?: 'Normal' | 'Retain';
  existingCombo?: ExistingComboSnapshotForExpiry | null;
  todayDate?: string;
}): Record<string, ComboExpiryPreviewItem> {
  const { packages, todayUsageMode, todayServiceType = 'Normal', existingCombo = null, todayDate } = params;
  const out: Record<string, ComboExpiryPreviewItem> = {};
  for (const pkg of packages) {
    const res = computePackageExpiry({
      pkg,
      todayUsageMode,
      todayServiceType,
      existingCombo,
      todayDate,
    });
    out[pkg.id] = {
      dateExpiredDisplay: res.dateExpiredDisplay,
      bonusBadge: formatExpiryBonusBadge(res),
      formulaSummary: res.formulaSummaryVi,
    };
  }
  return out;
}

/**
 * Khi cứu gói cũ hết hạn (`revivedExpiredSessions > 0`), gộp các buổi tồn của gói cũ vào ví chung
 * để tổng buổi còn lại sau hôm nay khớp 100% với `combinedTotalAfterToday` trên bill và sổ cái.
 */
export function mergeExpiryIntoRemainingWallet(
  baseWallet: IosSelectedComboRemaining,
  expiryResult: ComboPurchaseExpiryResult
): IosSelectedComboRemaining {
  if (expiryResult.revivedExpiredSessions <= 0) {
    return baseWallet;
  }

  const paidNew = baseWallet.paidNew + expiryResult.revivedNormalSessions;
  const paidRefill = baseWallet.paidRefill + expiryResult.revivedRetainSessions;
  const totalPaidRemaining = paidNew + paidRefill;
  const totalBonusRemaining = baseWallet.bonusNew + baseWallet.bonusRefill;

  return {
    ...baseWallet,
    paidNew,
    paidRefill,
    totalPaidRemaining,
    totalBonusRemaining,
    totalRemaining: totalPaidRemaining + totalBonusRemaining,
  };
}

export interface BuildSelectedComboObjectsParams {
  upperPkg: MatchedComboPackageOption | null;
  underPkg: MatchedComboPackageOption | null;
  upperTodayUsageMode: ComboTodayUsageMode;
  underTodayUsageMode: ComboTodayUsageMode;
  booking?: BookingItem | null;
  upperServicePrice: number;
  underServicePrice: number;
  autoMatchedCategoryId: WingsComboCategoryId;
  autoMatchedVolume: number | 'under';
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
}

/**
 * Dựng bộ đối tượng chuẩn `selectedCombo`, `selectedUnderCombo` và `comboRedemption`
 * dùng chung cho Bước 3 Tư vấn, Bước 12 Upsell và Bước 13 Checkout.
 */
export function buildSelectedComboObjectsFromPackages({
  upperPkg,
  underPkg,
  upperTodayUsageMode,
  underTodayUsageMode,
  booking,
  upperServicePrice,
  underServicePrice,
  autoMatchedCategoryId,
  autoMatchedVolume,
  cvPlusRules,
}: BuildSelectedComboObjectsParams): {
  selectedCombo: BookingItem['selectedCombo'];
  selectedUnderCombo: BookingItem['selectedUnderCombo'];
  comboRedemption: BookingItem['comboRedemption'];
} {
  const isExistingComboLive = Boolean(
    booking?.comboLiveStatus?.isComboLive &&
    !booking?.comboLiveStatus?.isExpired &&
    (booking?.comboLiveStatus?.remainingSessions ?? 0) > 0
  );
  const hasUnderMinkComboActive = Boolean(
    booking?.underMinkComboStatus?.hasUnderCombo &&
    !booking?.underMinkComboStatus?.isExpired &&
    (booking?.underMinkComboStatus?.remainingSessions ?? 0) > 0
  );
  const hasUnderServiceToday = Boolean(underServicePrice > 0 || booking?.attributes?.hasUnderMink);

  const existingUpperExpirySnapshot = extractExistingUpperExpirySnapshot(booking);
  const existingUnderExpirySnapshot = extractExistingUnderExpirySnapshot(booking);
  const todayServiceType: 'Normal' | 'Retain' = booking?.serviceType === 'Retain' ? 'Retain' : 'Normal';
  const underServiceType: 'Normal' | 'Retain' =
    booking?.attributes?.underMinkServiceType === 'Retain' ? 'Retain' : 'Normal';

  const dualBonus = calculateDualComboTierBonus(
    upperPkg ? upperPkg.comboPrice : 0,
    underPkg ? underPkg.comboPrice : 0,
    cvPlusRules
  );

  const selectedUpperExpiry = upperPkg
    ? computePackageExpiry({
        pkg: upperPkg,
        todayUsageMode: upperTodayUsageMode,
        todayServiceType,
        existingCombo: existingUpperExpirySnapshot,
      })
    : null;

  const selectedUnderExpiry = underPkg
    ? computePackageExpiry({
        pkg: underPkg,
        todayUsageMode: underTodayUsageMode,
        todayServiceType: underServiceType,
        existingCombo: existingUnderExpirySnapshot,
      })
    : null;

  const shouldUseOldUpperComboToday = Boolean(
    isExistingComboLive && (!upperPkg || upperTodayUsageMode === 'USE_OLD_COMBO')
  );
  const shouldWaiveUpperToday = Boolean(upperPkg && upperTodayUsageMode === 'USE_NEW_COMBO');
  const shouldWaiveUnderToday = Boolean(
    underPkg && hasUnderServiceToday && !hasUnderMinkComboActive && underTodayUsageMode === 'USE_NEW_COMBO'
  );

  let selectedCombo: BookingItem['selectedCombo'] = null;
  if (upperPkg) {
    const acct = calculateComboPurchaseAccounting(upperPkg, upperServicePrice || upperPkg.newUnitPrice || 770000);
    const rawRemaining = shouldWaiveUpperToday
      ? acct.remainingWalletAfterToday
      : {
          paidNew: upperPkg.comboNewCount,
          paidRefill: upperPkg.comboRefillCount,
          bonusNew: upperPkg.bonusNewCount,
          bonusRefill: upperPkg.bonusRefillCount,
          totalPaidRemaining: upperPkg.comboNewCount + upperPkg.comboRefillCount,
          totalBonusRemaining: upperPkg.bonusNewCount + upperPkg.bonusRefillCount,
          totalRemaining: upperPkg.totalSessions,
        };
    selectedCombo = {
      id: upperPkg.id,
      name: upperPkg.displayName,
      price: upperPkg.comboPrice,
      bonus: dualBonus.upperBonus,
      sessions: upperPkg.totalSessions,
      ruleName: upperPkg.ruleName,
      categoryId: upperPkg.categoryId,
      categoryName: upperPkg.categoryName,
      volume: upperPkg.volume,
      paidNewCount: upperPkg.comboNewCount,
      paidRefillCount: upperPkg.comboRefillCount,
      bonusNewCount: upperPkg.bonusNewCount,
      bonusRefillCount: upperPkg.bonusRefillCount,
      validityMonths: upperPkg.validityMonths,
      retailTotal: upperPkg.retailTotal,
      savingsAmount: upperPkg.savingsAmount,
      avgPerSessionPrice: upperPkg.avgPerSessionPrice,
      todaySingleServiceWaived: shouldWaiveUpperToday,
      todayUsageMode: upperTodayUsageMode,
      dateExpired: selectedUpperExpiry?.dateExpired,
      dateExpiredDisplay: selectedUpperExpiry?.dateExpiredDisplay,
      expiryFormulaSummary: selectedUpperExpiry?.formulaSummaryVi,
      revivedExpiredSessions: selectedUpperExpiry?.revivedExpiredSessions || 0,
      isUpTierUpgrade: upperPkg.categoryId !== autoMatchedCategoryId,
      originalServiceCategory: autoMatchedCategoryId,
      recognizedRevenueToday: shouldWaiveUpperToday
        ? acct.recognizedRevenueToday
        : shouldUseOldUpperComboToday
          ? 0
          : upperServicePrice,
      deferredRevenueBalance: shouldWaiveUpperToday ? acct.deferredRevenueBalance : upperPkg.comboPrice,
      remainingAfterToday: selectedUpperExpiry
        ? mergeExpiryIntoRemainingWallet(rawRemaining, selectedUpperExpiry)
        : rawRemaining,
    };
  }

  let selectedUnderCombo: BookingItem['selectedUnderCombo'] = null;
  if (underPkg) {
    const underAcct = calculateComboPurchaseAccounting(underPkg, underServicePrice || 390000);
    const rawUnderRemaining = shouldWaiveUnderToday
      ? underAcct.remainingWalletAfterToday
      : {
          paidNew: underPkg.comboNewCount,
          paidRefill: underPkg.comboRefillCount,
          bonusNew: underPkg.bonusNewCount,
          bonusRefill: underPkg.bonusRefillCount,
          totalPaidRemaining: underPkg.comboNewCount + underPkg.comboRefillCount,
          totalBonusRemaining: underPkg.bonusNewCount + underPkg.bonusRefillCount,
          totalRemaining: underPkg.totalSessions,
        };
    selectedUnderCombo = {
      id: underPkg.id,
      name: underPkg.displayName,
      price: underPkg.comboPrice,
      bonus: dualBonus.underBonus,
      sessions: underPkg.totalSessions,
      ruleName: underPkg.ruleName,
      validityMonths: underPkg.validityMonths,
      retailTotal: underPkg.retailTotal,
      savingsAmount: underPkg.savingsAmount,
      avgPerSessionPrice: underPkg.avgPerSessionPrice,
      todaySingleServiceWaived: shouldWaiveUnderToday,
      todayUsageMode: underTodayUsageMode,
      dateExpired: selectedUnderExpiry?.dateExpired,
      dateExpiredDisplay: selectedUnderExpiry?.dateExpiredDisplay,
      expiryFormulaSummary: selectedUnderExpiry?.formulaSummaryVi,
      revivedExpiredSessions: selectedUnderExpiry?.revivedExpiredSessions || 0,
      recognizedRevenueToday: shouldWaiveUnderToday ? underAcct.recognizedRevenueToday : 0,
      deferredRevenueBalance: shouldWaiveUnderToday ? underAcct.deferredRevenueBalance : underPkg.comboPrice,
      remainingAfterToday: selectedUnderExpiry
        ? mergeExpiryIntoRemainingWallet(rawUnderRemaining, selectedUnderExpiry)
        : rawUnderRemaining,
    };
  }

  let comboRedemption: BookingItem['comboRedemption'] = null;
  if (shouldUseOldUpperComboToday && booking?.comboLiveStatus) {
    const existingComboMatch = matchComboCategoryAndVolumeFromBooking({
      comboName: booking.comboLiveStatus.comboName,
      serviceKey: booking.comboLiveStatus.serviceKey,
      serviceName: booking.originalBookedServiceName || booking.serviceName,
    });
    const totalRem = booking.comboLiveStatus.remainingSessions ?? 2;
    const normalRem = booking.comboLiveStatus.normalRemaining ?? Math.max(1, Math.floor(totalRem / 2));
    const retainRem = booking.comboLiveStatus.retainRemaining ?? Math.max(0, totalRem - normalRem);
    const paidNewRem = normalRem > 1 ? normalRem - 1 : normalRem;
    const bonusNewRem = normalRem > 1 ? 1 : 0;
    const paidRefillRem = retainRem > 1 ? retainRem - 1 : retainRem;
    const bonusRefillRem = retainRem > 1 ? 1 : 0;
    const daysSinceLastVisit = parseDaysSinceLastVisit(booking.lashHistory?.[0]?.date);
    const redemption = calculateComboRedemptionAccounting({
      comboName: booking.comboLiveStatus.comboName || 'Gói Combo Đang Active',
      baseCategoryId: existingComboMatch.categoryId,
      baseVolume: existingComboMatch.volume,
      targetCategoryId: autoMatchedCategoryId,
      targetVolume: autoMatchedVolume,
      requestedServiceType: (booking.serviceType as 'Normal' | 'Retain') || 'Normal',
      daysSinceLastVisit,
      paidNewRemaining: paidNewRem,
      paidRefillRemaining: paidRefillRem,
      bonusNewRemaining: bonusNewRem,
      bonusRefillRemaining: bonusRefillRem,
    });
    const effectiveRedemptionExpiry = selectedUpperExpiry?.dateExpired || booking.comboLiveStatus.dateExpired || null;
    comboRedemption = {
      comboName: redemption.comboName,
      deductedBucket: redemption.deductedBucket,
      typeConversionSurcharge: redemption.typeConversionSurcharge,
      upgradeVolumeSurcharge: redemption.upgradeVolumeSurcharge,
      totalCustomerPayToday: redemption.totalCustomerPayToday,
      recognizedRevenueToday: redemption.recognizedRevenueToday,
      remainingAfterToday: redemption.walletAfter.totalRemaining,
      explanation: redemption.explanation,
      totalSessions:
        redemption.walletBefore.paidNew +
        redemption.walletBefore.paidRefill +
        redemption.walletBefore.bonusNew +
        redemption.walletBefore.bonusRefill +
        1,
      paidRemaining: redemption.walletAfter.paidNew + redemption.walletAfter.paidRefill,
      bonusRemaining: redemption.walletAfter.bonusNew + redemption.walletAfter.bonusRefill,
      dateExpired: effectiveRedemptionExpiry,
      dateExpiredDisplay: formatExpiryDateDdMmYyyy(effectiveRedemptionExpiry) || null,
    };
  }

  return { selectedCombo, selectedUnderCombo, comboRedemption };
}
