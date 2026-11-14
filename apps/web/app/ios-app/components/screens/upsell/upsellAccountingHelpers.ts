import { calculateComboRedemptionAccounting, MatchedComboPackageOption, WingsComboCategoryId } from '@mos-lab/shared';
import { BookingItem } from '../../../state/mockData';
import { calculateCvComboTierBonus, resolveEffectiveServiceTotal } from '../../../state/useIosBillingCheckout';
import { isYeppeumProductItem } from './upsellCheckoutHelpers';

export interface ComputeRedemptionAccountingParams {
  isExistingComboLive: boolean;
  simulateOnlyRefillLeft: boolean;
  booking?: BookingItem;
  existingComboCategoryId: WingsComboCategoryId;
  existingComboVolume: number | 'under';
  targetCategoryId: WingsComboCategoryId;
  targetVolume: number | 'under';
  daysSinceLastVisit: number | null;
}

export function computeUpsellRedemptionAccounting({
  isExistingComboLive,
  simulateOnlyRefillLeft,
  booking,
  existingComboCategoryId,
  existingComboVolume,
  targetCategoryId,
  targetVolume,
  daysSinceLastVisit,
}: ComputeRedemptionAccountingParams) {
  if (!isExistingComboLive) return null;
  const totalRem = booking?.comboLiveStatus?.remainingSessions ?? 2;
  const normalRem = simulateOnlyRefillLeft
    ? 0
    : (booking?.comboLiveStatus?.normalRemaining ?? Math.max(1, Math.floor(totalRem / 2)));
  const retainRem = simulateOnlyRefillLeft
    ? Math.max(1, totalRem)
    : (booking?.comboLiveStatus?.retainRemaining ?? Math.max(0, totalRem - normalRem));

  const paidNewRem = normalRem > 1 ? normalRem - 1 : normalRem;
  const bonusNewRem = normalRem > 1 ? 1 : 0;
  const paidRefillRem = retainRem > 1 ? retainRem - 1 : retainRem;
  const bonusRefillRem = retainRem > 1 ? 1 : 0;

  return calculateComboRedemptionAccounting({
    comboName: booking?.comboLiveStatus?.comboName || 'Gói Combo Đang Active',
    baseCategoryId: existingComboCategoryId,
    baseVolume: existingComboVolume,
    targetCategoryId,
    targetVolume,
    requestedServiceType: (booking?.serviceType as 'Normal' | 'Retain') || 'Normal',
    daysSinceLastVisit,
    paidNewRemaining: paidNewRem,
    paidRefillRemaining: paidRefillRem,
    bonusNewRemaining: bonusNewRem,
    bonusRefillRemaining: bonusRefillRem,
  });
}

export interface ComputeUpsellTotalsParams {
  booking?: BookingItem;
  localCartProducts: NonNullable<BookingItem['cartProducts']>;
  yeppeumCount: number;
  selectedSerumTier: { price: number; cvBonus: number };
  selectedNewComboPkg: MatchedComboPackageOption | null;
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  servicePrice: number;
  shouldUseOldUpperComboToday: boolean;
  hasUnderMinkComboActive: boolean;
  upperTodayUsageMode: string;
  shouldWaiveUnderToday: boolean;
  redemptionAccounting: ReturnType<typeof computeUpsellRedemptionAccounting>;
}

export function computeUpsellTotals({
  booking,
  localCartProducts,
  yeppeumCount,
  selectedSerumTier,
  selectedNewComboPkg,
  selectedUnderComboPkg,
  servicePrice,
  shouldUseOldUpperComboToday,
  hasUnderMinkComboActive,
  upperTodayUsageMode,
  shouldWaiveUnderToday,
  redemptionAccounting,
}: ComputeUpsellTotalsParams) {
  const serumTotal = yeppeumCount > 0 ? selectedSerumTier.price * yeppeumCount : 0;
  const serumBonus = yeppeumCount > 0 ? selectedSerumTier.cvBonus * yeppeumCount : 0;
  const otherProductsTotal = localCartProducts
    .filter((p) => !isYeppeumProductItem(p))
    .reduce((sum, p) => sum + Number(p.price || 0) * Math.max(0, Number(p.quantity || 0)), 0);

  const newComboTotal = selectedNewComboPkg ? selectedNewComboPkg.comboPrice : 0;
  const underComboTotal = selectedUnderComboPkg ? selectedUnderComboPkg.comboPrice : 0;
  const totalComboPrice = newComboTotal + underComboTotal;
  const totalComboBonus = calculateCvComboTierBonus(totalComboPrice);
  const hasBothCombos = Boolean(selectedNewComboPkg && selectedUnderComboPkg && totalComboPrice > 0);

  const upperComboStandaloneBonus = selectedNewComboPkg ? calculateCvComboTierBonus(selectedNewComboPkg.comboPrice) : 0;
  const underComboStandaloneBonus = selectedUnderComboPkg
    ? calculateCvComboTierBonus(selectedUnderComboPkg.comboPrice)
    : 0;

  const newComboBonus = hasBothCombos ? totalComboBonus : upperComboStandaloneBonus;
  const underComboBonus = hasBothCombos ? 0 : underComboStandaloneBonus;

  const effectiveServiceChargeToday = resolveEffectiveServiceTotal({
    servicePrice,
    upgradePrice: booking?.upgradePrice,
    serviceName: booking?.serviceName,
    isComboLive: shouldUseOldUpperComboToday,
    hasUnderMink: booking?.attributes?.hasUnderMink,
    underMinkServiceType: booking?.attributes?.underMinkServiceType,
    hasUnderMinkCombo: hasUnderMinkComboActive,
    selectedCombo: selectedNewComboPkg
      ? {
          price: selectedNewComboPkg.comboPrice,
          todaySingleServiceWaived: upperTodayUsageMode === 'USE_NEW_COMBO',
        }
      : null,
    selectedUnderCombo: selectedUnderComboPkg
      ? {
          price: selectedUnderComboPkg.comboPrice,
          todaySingleServiceWaived: shouldWaiveUnderToday,
        }
      : null,
    comboRedemption:
      shouldUseOldUpperComboToday && redemptionAccounting
        ? { totalCustomerPayToday: redemptionAccounting.totalCustomerPayToday }
        : null,
  });

  const subtotal = effectiveServiceChargeToday + newComboTotal + underComboTotal + serumTotal + otherProductsTotal;

  return {
    serumTotal,
    serumBonus,
    otherProductsTotal,
    newComboTotal,
    underComboTotal,
    totalComboPrice,
    totalComboBonus,
    hasBothCombos,
    upperComboStandaloneBonus,
    underComboStandaloneBonus,
    newComboBonus,
    underComboBonus,
    effectiveServiceChargeToday,
    subtotal,
  };
}
