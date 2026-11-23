import {
  calculateComboPurchaseAccounting,
  calculateCvComboTierBonus,
  type ComboPurchaseExpiryResult,
  type ComboTodayUsageMode,
  type MatchedComboPackageOption,
} from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import type { LashMaterialSpec } from '../LashMaterialConstraintMatrix';
import { mergeExpiryIntoRemainingWallet } from './comboExpiryConsultHelpers';

export interface AutoComboSpecShape {
  materialId: string;
  materialCode: string;
  materialShortLabel: string;
  volume: string;
  count: string;
}

export function buildSelectedUpperComboObject({
  selectedNewComboPkg,
  selectedUnderComboPkg,
  comboPurchaseTotal,
  upperTodayUsageMode,
  selectedUpperExpiry,
  isComboLive,
  upperServicePrice,
  autoMatchedCategoryId,
}: {
  selectedNewComboPkg: MatchedComboPackageOption | null;
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  comboPurchaseTotal: number;
  upperTodayUsageMode: ComboTodayUsageMode;
  selectedUpperExpiry: ComboPurchaseExpiryResult | null;
  isComboLive: boolean;
  upperServicePrice: number;
  autoMatchedCategoryId: string;
}): NonNullable<BookingItem['selectedCombo']> | null {
  if (!selectedNewComboPkg) return null;
  const hasBoth = Boolean(selectedNewComboPkg && selectedUnderComboPkg && comboPurchaseTotal > 0);
  const effectiveBonus = hasBoth
    ? calculateCvComboTierBonus(comboPurchaseTotal)
    : calculateCvComboTierBonus(selectedNewComboPkg.comboPrice);
  const shouldWaiveToday = upperTodayUsageMode === 'USE_NEW_COMBO';
  const acct = calculateComboPurchaseAccounting(
    selectedNewComboPkg,
    upperServicePrice || selectedNewComboPkg.newUnitPrice || 770000
  );
  const rawRemaining = shouldWaiveToday
    ? acct.remainingWalletAfterToday
    : {
        paidNew: selectedNewComboPkg.comboNewCount,
        paidRefill: selectedNewComboPkg.comboRefillCount,
        bonusNew: selectedNewComboPkg.bonusNewCount,
        bonusRefill: selectedNewComboPkg.bonusRefillCount,
        totalPaidRemaining: selectedNewComboPkg.comboNewCount + selectedNewComboPkg.comboRefillCount,
        totalBonusRemaining: selectedNewComboPkg.bonusNewCount + selectedNewComboPkg.bonusRefillCount,
        totalRemaining: selectedNewComboPkg.totalSessions,
      };

  return {
    id: selectedNewComboPkg.id,
    name: selectedNewComboPkg.displayName,
    price: selectedNewComboPkg.comboPrice,
    bonus: effectiveBonus,
    sessions: selectedNewComboPkg.totalSessions,
    ruleName: selectedNewComboPkg.ruleName,
    categoryId: selectedNewComboPkg.categoryId,
    categoryName: selectedNewComboPkg.categoryName,
    volume: selectedNewComboPkg.volume,
    paidNewCount: selectedNewComboPkg.comboNewCount,
    paidRefillCount: selectedNewComboPkg.comboRefillCount,
    bonusNewCount: selectedNewComboPkg.bonusNewCount,
    bonusRefillCount: selectedNewComboPkg.bonusRefillCount,
    validityMonths: selectedNewComboPkg.validityMonths,
    retailTotal: selectedNewComboPkg.retailTotal,
    savingsAmount: selectedNewComboPkg.savingsAmount,
    avgPerSessionPrice: selectedNewComboPkg.avgPerSessionPrice,
    todaySingleServiceWaived: shouldWaiveToday,
    todayUsageMode: upperTodayUsageMode,
    dateExpired: selectedUpperExpiry?.dateExpired,
    dateExpiredDisplay: selectedUpperExpiry?.dateExpiredDisplay,
    expiryFormulaSummary: selectedUpperExpiry?.formulaSummaryVi,
    revivedExpiredSessions: selectedUpperExpiry?.revivedExpiredSessions || 0,
    isUpTierUpgrade: selectedNewComboPkg.categoryId !== autoMatchedCategoryId,
    originalServiceCategory: autoMatchedCategoryId,
    recognizedRevenueToday: shouldWaiveToday
      ? acct.recognizedRevenueToday
      : isComboLive && upperTodayUsageMode === 'USE_OLD_COMBO'
        ? 0
        : upperServicePrice,
    deferredRevenueBalance: shouldWaiveToday ? acct.deferredRevenueBalance : selectedNewComboPkg.comboPrice,
    remainingAfterToday: selectedUpperExpiry
      ? mergeExpiryIntoRemainingWallet(rawRemaining, selectedUpperExpiry)
      : rawRemaining,
  };
}

export function buildSelectedUnderComboObject({
  selectedUnderComboPkg,
  selectedNewComboPkg,
  comboPurchaseTotal,
  underServicePrice,
  hasUnderMink,
  underTodayUsageMode,
  selectedUnderExpiry,
}: {
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  comboPurchaseTotal: number;
  underServicePrice: number;
  hasUnderMink: boolean;
  underTodayUsageMode: ComboTodayUsageMode;
  selectedUnderExpiry: ComboPurchaseExpiryResult | null;
}): NonNullable<BookingItem['selectedUnderCombo']> | null {
  if (!selectedUnderComboPkg) return null;
  const hasBoth = Boolean(selectedNewComboPkg && selectedUnderComboPkg && comboPurchaseTotal > 0);
  const effectiveUnderBonus = hasBoth ? 0 : calculateCvComboTierBonus(selectedUnderComboPkg.comboPrice);
  const underAcct = calculateComboPurchaseAccounting(selectedUnderComboPkg, underServicePrice || 390000);
  const shouldWaiveUnderToday = Boolean(hasUnderMink && underTodayUsageMode === 'USE_NEW_COMBO');
  const rawUnderRemaining = shouldWaiveUnderToday
    ? underAcct.remainingWalletAfterToday
    : {
        paidNew: selectedUnderComboPkg.comboNewCount,
        paidRefill: selectedUnderComboPkg.comboRefillCount,
        bonusNew: selectedUnderComboPkg.bonusNewCount,
        bonusRefill: selectedUnderComboPkg.bonusRefillCount,
        totalPaidRemaining: selectedUnderComboPkg.comboNewCount + selectedUnderComboPkg.comboRefillCount,
        totalBonusRemaining: selectedUnderComboPkg.bonusNewCount + selectedUnderComboPkg.bonusRefillCount,
        totalRemaining: selectedUnderComboPkg.totalSessions,
      };

  return {
    id: selectedUnderComboPkg.id,
    name: selectedUnderComboPkg.displayName,
    price: selectedUnderComboPkg.comboPrice,
    bonus: effectiveUnderBonus,
    sessions: selectedUnderComboPkg.totalSessions,
    ruleName: selectedUnderComboPkg.ruleName,
    validityMonths: selectedUnderComboPkg.validityMonths,
    retailTotal: selectedUnderComboPkg.retailTotal,
    savingsAmount: selectedUnderComboPkg.savingsAmount,
    avgPerSessionPrice: selectedUnderComboPkg.avgPerSessionPrice,
    todaySingleServiceWaived: shouldWaiveUnderToday,
    todayUsageMode: underTodayUsageMode,
    dateExpired: selectedUnderExpiry?.dateExpired,
    dateExpiredDisplay: selectedUnderExpiry?.dateExpiredDisplay,
    expiryFormulaSummary: selectedUnderExpiry?.formulaSummaryVi,
    revivedExpiredSessions: selectedUnderExpiry?.revivedExpiredSessions || 0,
    recognizedRevenueToday: shouldWaiveUnderToday ? underAcct.recognizedRevenueToday : 0,
    deferredRevenueBalance: shouldWaiveUnderToday ? underAcct.deferredRevenueBalance : selectedUnderComboPkg.comboPrice,
    remainingAfterToday: selectedUnderExpiry
      ? mergeExpiryIntoRemainingWallet(rawUnderRemaining, selectedUnderExpiry)
      : rawUnderRemaining,
  };
}

export function buildConsultationSpecsSummary({
  currentMaterialSpec,
  selectedMaterial,
  selectedVolume,
  selectedStyle,
  selectedCount,
  selectedCurl,
  selectedThickness,
  selectedLengths,
}: {
  currentMaterialSpec?: LashMaterialSpec;
  selectedMaterial: string;
  selectedVolume: string;
  selectedStyle: string;
  selectedCount: string;
  selectedCurl: string;
  selectedThickness: string;
  selectedLengths?: number[];
}): string {
  const rawMat = currentMaterialSpec?.shortLabel || selectedMaterial;
  const cleanMat = rawMat
    .replace(/^New\s+/i, '')
    .replace(/\s*\d+D\b/i, '')
    .trim();
  const cleanCount = (selectedCount || '').replace(/\s*sợi.*$/i, '').trim();
  const cleanThick = (selectedThickness || '').replace(/[^\d.]/g, '');
  const cleanLengths = selectedLengths && selectedLengths.length > 0 ? selectedLengths.join('-') : '10-12';
  return `${cleanMat} ${selectedVolume} ${selectedStyle} ${cleanCount} ${selectedCurl}${cleanThick} ${cleanLengths}`;
}

export function resolveComboBasePrices({
  catalogNewPrice,
  catalogRefillPrice,
  comboName,
  bookingServicePrice,
}: {
  catalogNewPrice?: number;
  catalogRefillPrice?: number;
  comboName: string;
  bookingServicePrice?: number;
}): {
  comboBaseServicePrice: number;
  comboBaseRetainPrice: number;
} {
  let comboBaseServicePrice = 770000;
  if (catalogNewPrice && catalogNewPrice > 0) {
    comboBaseServicePrice = catalogNewPrice;
  } else {
    const match = comboName.match(/\b(390|440|550|660|770|880|990|1110|1220|1330|1440|1550|1770|2110)\b/);
    if (match) {
      comboBaseServicePrice = Number(match[1]) * 1000;
    } else if (bookingServicePrice && bookingServicePrice > 0) {
      comboBaseServicePrice = bookingServicePrice;
    }
  }

  let comboBaseRetainPrice: number;
  if (catalogRefillPrice && catalogRefillPrice > 0) {
    comboBaseRetainPrice = catalogRefillPrice;
  } else if (comboBaseServicePrice <= 440000) {
    comboBaseRetainPrice = 220000;
  } else if (comboBaseServicePrice <= 550000) {
    comboBaseRetainPrice = 280000;
  } else if (comboBaseServicePrice <= 770000) {
    comboBaseRetainPrice = 340000;
  } else if (comboBaseServicePrice <= 880000) {
    comboBaseRetainPrice = 530000;
  } else if (comboBaseServicePrice <= 990000) {
    comboBaseRetainPrice = 590000;
  } else {
    comboBaseRetainPrice = Math.round(comboBaseServicePrice / 2);
  }

  return { comboBaseServicePrice, comboBaseRetainPrice };
}

export function computeIsSameAsComboService({
  isComboLive,
  currentMaterialSpec,
  autoComboSpec,
  selectedCount,
  selectedVolume,
}: {
  isComboLive: boolean;
  currentMaterialSpec: LashMaterialSpec;
  autoComboSpec: AutoComboSpecShape;
  selectedCount: string;
  selectedVolume: string;
}): boolean {
  if (!isComboLive) return false;
  const sameMaterial =
    currentMaterialSpec.code === autoComboSpec.materialCode ||
    currentMaterialSpec.id === autoComboSpec.materialId ||
    currentMaterialSpec.shortLabel.toLowerCase() === autoComboSpec.materialShortLabel.toLowerCase();

  const selectedCountNum = parseInt(selectedCount.replace(/\D/g, ''), 10) || 70;
  const comboCountNum = parseInt((autoComboSpec.count || '70').replace(/\D/g, ''), 10) || 70;
  const withinCount = selectedCountNum <= comboCountNum;

  const selectedVolNum = parseInt(selectedVolume.replace(/\D/g, ''), 10) || 1;
  const comboVolNum = parseInt((autoComboSpec.volume || '1D').replace(/\D/g, ''), 10) || 1;
  const withinVolume = selectedVolNum <= comboVolNum;

  return sameMaterial && withinCount && withinVolume;
}

export function computeSingleUpgradeDiff({
  isComboLive,
  isSameAsComboService,
  serviceType,
  isAlwaysFullSet,
  hasComboNormalRemaining,
  hasComboRetainRemaining,
  retainUpgradeMode,
  comboBaseServicePrice,
  comboBaseRetainPrice,
  skuPrice,
  upgradePrice,
}: {
  isComboLive: boolean;
  isSameAsComboService: boolean;
  serviceType: 'Normal' | 'Retain';
  isAlwaysFullSet: boolean;
  hasComboNormalRemaining: boolean;
  hasComboRetainRemaining: boolean;
  retainUpgradeMode: 'DEDUCT_NORMAL' | 'PAY_DIFF';
  comboBaseServicePrice: number;
  comboBaseRetainPrice: number;
  skuPrice: number;
  upgradePrice: number;
}): number {
  if (!isComboLive) {
    return upgradePrice;
  }

  if (isSameAsComboService) {
    if (serviceType === 'Retain' || isAlwaysFullSet) {
      return 0;
    }
    if (hasComboNormalRemaining && retainUpgradeMode === 'DEDUCT_NORMAL') {
      return 0;
    }
    if (hasComboRetainRemaining) {
      return Math.max(0, comboBaseServicePrice - comboBaseRetainPrice);
    }
    return comboBaseServicePrice;
  }

  if (serviceType === 'Normal') {
    if (hasComboNormalRemaining && retainUpgradeMode === 'DEDUCT_NORMAL') {
      return Math.max(0, skuPrice - comboBaseServicePrice);
    }
    if (hasComboRetainRemaining) {
      return Math.max(0, skuPrice - comboBaseRetainPrice);
    }
    return skuPrice;
  }

  return Math.max(0, skuPrice - comboBaseRetainPrice);
}
