import {
  calculateComboPurchaseExpiry,
  type ComboPurchaseExpiryResult,
  type ComboTodayUsageMode,
  type ExistingComboSnapshotForExpiry,
  type IosSelectedComboRemaining,
  type MatchedComboPackageOption,
} from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import type { ComboExpiryPreviewItem } from '../../ui-kit/WingsUnifiedComboCard';

/**
 * Trích xuất snapshot gói Combo Mi Trên hiện tại (còn hạn, bảo lưu hoặc đã hết hạn còn buổi tồn)
 * để truyền vào bộ máy tính HSD chuẩn `calculateComboPurchaseExpiry` (COMBO-004).
 */
export function extractExistingUpperExpirySnapshot(
  booking?: BookingItem | null
): ExistingComboSnapshotForExpiry | null {
  const upper = booking?.comboLiveStatus;
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
  const under = booking?.underMinkComboStatus;
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
  if (savedMode === 'USE_NEW_COMBO' || savedMode === 'USE_OLD_COMBO' || savedMode === 'RETAIL_OR_VOUCHER') {
    return savedMode;
  }
  const isComboLive = Boolean(
    booking?.comboLiveStatus?.isComboLive &&
    !booking?.comboLiveStatus?.isExpired &&
    booking.comboLiveStatus.remainingSessions > 0
  );
  if (isComboLive) {
    return 'USE_OLD_COMBO';
  }
  if (booking?.selectedCombo?.todaySingleServiceWaived === false) {
    return 'RETAIL_OR_VOUCHER';
  }
  return 'USE_NEW_COMBO';
}

export function resolveDefaultUnderTodayUsageMode(
  booking?: BookingItem | null,
  hasUnderMink?: boolean
): ComboTodayUsageMode {
  const savedMode = booking?.selectedUnderCombo?.todayUsageMode;
  if (savedMode === 'USE_NEW_COMBO' || savedMode === 'USE_OLD_COMBO' || savedMode === 'RETAIL_OR_VOUCHER') {
    return savedMode;
  }
  const hasUnderCombo = Boolean(
    booking?.underMinkComboStatus?.hasUnderCombo &&
    !booking?.underMinkComboStatus?.isExpired &&
    (booking?.underMinkComboStatus?.remainingSessions || 0) > 0
  );
  if (hasUnderCombo) {
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
