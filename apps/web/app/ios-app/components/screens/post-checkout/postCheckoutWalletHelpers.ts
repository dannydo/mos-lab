import {
  calculateComboPurchaseAccounting,
  matchComboCategoryAndVolumeFromBooking,
  type ComboPurchaseExpiryResult,
  type IosCheckoutStaffOption,
  type MatchedComboPackageOption,
  type ResolveActiveBookingComboWalletsResult,
  type WingsComboCategoryId,
} from '@mos-lab/shared';

type PurchaseAccountingResult = ReturnType<typeof calculateComboPurchaseAccounting>;
import type { ActiveActorProfile } from '../../../state/iosActorProfile';
import { computeFreshBillingLineTotals } from '../../../state/iosBillingMath';
import type { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import { parseDaysSinceLastVisit } from '../LashMaterialConstraintMatrix';
import { computeUpsellRedemptionAccounting } from '../upsell/upsellAccountingHelpers';
import { buildUpsellCheckoutPayload } from '../upsell/upsellCheckoutHelpers';

type SerumTierItem = (typeof SERUM_TIERS_CVL)[number];

export function normalizeEligibleTier(rawTier?: string | null): 'CVL' | 'CVLL' | 'CC' {
  const upper = String(rawTier || '')
    .trim()
    .toUpperCase();
  if (upper === 'CVLL') return 'CVLL';
  if (upper === 'CC') return 'CC';
  return 'CVL';
}

export function buildSeedStaffOptions(booking: BookingItem, actor?: ActiveActorProfile): IosCheckoutStaffOption[] {
  const map = new Map<number, IosCheckoutStaffOption>();
  const pushOption = (staffId?: number, name?: string, tier?: string) => {
    const id = Number(staffId || 0);
    if (id <= 0 || !name) return;
    map.set(id, { staffId: id, name, tier: normalizeEligibleTier(tier), storeId: booking.storeId });
  };
  pushOption(booking.checkOutStaffId, booking.checkOutStaffName, booking.checkOutStaffTier || 'CVL');
  pushOption(booking.assignedStaffId, booking.assignedStaffName, booking.assignedStaffTier || 'CVL');
  if (actor && (actor.tier === 'CVL' || actor.tier === 'CVLL' || actor.tier === 'CC')) {
    pushOption(actor.staffId, actor.name, actor.tier);
  }
  return Array.from(map.values());
}

export function computePostCheckoutDraftAndTotals(params: {
  booking: BookingItem;
  effectiveBookingForWallets: BookingItem;
  resolvedWallets: ResolveActiveBookingComboWalletsResult;
  yeppeumCount: number;
  selectedSerumTier: SerumTierItem;
  selectedUpperPkg: MatchedComboPackageOption | null;
  selectedUnderPkg: MatchedComboPackageOption | null;
  todaySingleServiceWaived: boolean;
  selectedUpperExpiry: ComboPurchaseExpiryResult | null;
  selectedUnderExpiry: ComboPurchaseExpiryResult | null;
  purchaseAccounting: PurchaseAccountingResult | null;
  underPurchaseAccounting: PurchaseAccountingResult | null;
  dualBonus: { upperBonus: number; underBonus: number };
  activeCategoryId: WingsComboCategoryId;
  autoMatchedCategoryId: WingsComboCategoryId;
  autoMatchedVolume: number | 'under';
  servicePrice: number;
}) {
  const {
    booking,
    effectiveBookingForWallets,
    resolvedWallets,
    yeppeumCount,
    selectedSerumTier,
    selectedUpperPkg,
    selectedUnderPkg,
    todaySingleServiceWaived,
    selectedUpperExpiry,
    selectedUnderExpiry,
    purchaseAccounting,
    underPurchaseAccounting,
    dualBonus,
    activeCategoryId,
    autoMatchedCategoryId,
    autoMatchedVolume,
    servicePrice,
  } = params;

  const isExistingComboLive = resolvedWallets.isRedeemingUpperToday;
  const shouldUseOldUpperToday = isExistingComboLive && !todaySingleServiceWaived;
  const effectiveUpperStatus = resolvedWallets.effectiveComboLiveStatus;
  const existingComboMatch = matchComboCategoryAndVolumeFromBooking({
    comboName: effectiveUpperStatus.comboName,
    serviceKey: effectiveUpperStatus.serviceKey,
    serviceName: booking.originalBookedServiceName || booking.serviceName,
  });

  const redemptionAccounting = computeUpsellRedemptionAccounting({
    isExistingComboLive: shouldUseOldUpperToday,
    simulateOnlyRefillLeft: false,
    booking: effectiveBookingForWallets,
    existingComboCategoryId: existingComboMatch.categoryId,
    existingComboVolume: existingComboMatch.volume,
    targetCategoryId: autoMatchedCategoryId,
    targetVolume: autoMatchedVolume,
    daysSinceLastVisit: parseDaysSinceLastVisit(booking.lashHistory?.[0]?.date),
  });

  const draftPayload = buildUpsellCheckoutPayload({
    existingCartProducts: booking.cartProducts,
    yeppeumCount,
    selectedSerumTier,
    isExistingComboLive,
    shouldUseOldUpperComboToday: shouldUseOldUpperToday,
    selectedNewComboPkg: selectedUpperPkg,
    deductTodayIntoCombo: todaySingleServiceWaived,
    upperTodayUsageMode: todaySingleServiceWaived ? 'USE_NEW_COMBO' : 'RETAIL_OR_VOUCHER',
    selectedUpperExpiry,
    existingUpperComboDateExpired: effectiveUpperStatus.dateExpired || null,
    purchaseAccounting,
    newComboBonus: dualBonus.upperBonus,
    isUpTierPackage: activeCategoryId !== autoMatchedCategoryId,
    autoMatchedCategoryId,
    servicePrice,
    redemptionAccounting,
    selectedUnderComboPkg: selectedUnderPkg,
    underPurchaseAccounting,
    underComboBonus: dualBonus.underBonus,
    deductUnderTodayIntoCombo: todaySingleServiceWaived,
    underTodayUsageMode: todaySingleServiceWaived ? 'USE_NEW_COMBO' : 'RETAIL_OR_VOUCHER',
    selectedUnderExpiry,
    selectedUpperComboBalanceId: resolvedWallets.selectedUpperComboBalanceId,
    selectedUnderComboBalanceId: resolvedWallets.selectedUnderComboBalanceId,
    skipUpperCombo: resolvedWallets.skipUpperCombo,
    skipUnderCombo: resolvedWallets.skipUnderCombo,
  });

  const effectiveComboRedemption = resolvedWallets.skipUpperCombo
    ? null
    : (draftPayload.comboRedemption ?? (shouldUseOldUpperToday ? (booking.comboRedemption ?? null) : null));

  const lineTotals = computeFreshBillingLineTotals({
    ...effectiveBookingForWallets,
    selectedCombo: draftPayload.selectedCombo,
    selectedUnderCombo: draftPayload.selectedUnderCombo,
    comboRedemption: effectiveComboRedemption,
    selectedUpperComboBalanceId: resolvedWallets.selectedUpperComboBalanceId,
    selectedUnderComboBalanceId: resolvedWallets.selectedUnderComboBalanceId,
    skipUpperCombo: resolvedWallets.skipUpperCombo,
    skipUnderCombo: resolvedWallets.skipUnderCombo,
    cartProducts: draftPayload.cartProducts,
  });

  return { draftPayload, effectiveComboRedemption, lineTotals };
}
