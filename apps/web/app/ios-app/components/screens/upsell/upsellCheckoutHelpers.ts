import {
  WingsComboCategoryId,
  MatchedComboPackageOption,
  calculateComboPurchaseAccounting,
  calculateComboRedemptionAccounting,
  formatExpiryDateDdMmYyyy,
  type ComboPurchaseExpiryResult,
  type ComboTodayUsageMode,
} from '@mos-lab/shared';
import { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import { mergeExpiryIntoRemainingWallet } from '../consultation/comboExpiryConsultHelpers';

type PurchaseAccountingResult = ReturnType<typeof calculateComboPurchaseAccounting>;
type RedemptionAccountingResult = ReturnType<typeof calculateComboRedemptionAccounting>;
type SerumTierItem = (typeof SERUM_TIERS_CVL)[number];

export interface BuildUpsellCheckoutPayloadParams {
  yeppeumCount: number;
  selectedSerumTier: SerumTierItem;
  isExistingComboLive: boolean;
  shouldUseOldUpperComboToday?: boolean;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  deductTodayIntoCombo: boolean;
  upperTodayUsageMode?: ComboTodayUsageMode;
  selectedUpperExpiry?: ComboPurchaseExpiryResult | null;
  existingUpperComboDateExpired?: string | null;
  purchaseAccounting: PurchaseAccountingResult | null;
  newComboBonus: number;
  isUpTierPackage: boolean;
  autoMatchedCategoryId: WingsComboCategoryId;
  servicePrice: number;
  redemptionAccounting: RedemptionAccountingResult | null;
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  underPurchaseAccounting: PurchaseAccountingResult | null;
  underComboBonus: number;
  deductUnderTodayIntoCombo?: boolean;
  underTodayUsageMode?: ComboTodayUsageMode;
  selectedUnderExpiry?: ComboPurchaseExpiryResult | null;
}

export function buildUpsellCheckoutPayload({
  yeppeumCount,
  selectedSerumTier,
  isExistingComboLive,
  shouldUseOldUpperComboToday,
  selectedNewComboPkg,
  deductTodayIntoCombo,
  upperTodayUsageMode,
  selectedUpperExpiry,
  existingUpperComboDateExpired,
  purchaseAccounting,
  newComboBonus,
  isUpTierPackage,
  autoMatchedCategoryId,
  servicePrice,
  redemptionAccounting,
  selectedUnderComboPkg,
  underPurchaseAccounting,
  underComboBonus,
  deductUnderTodayIntoCombo = true,
  underTodayUsageMode,
  selectedUnderExpiry,
}: BuildUpsellCheckoutPayloadParams) {
  const cartProducts =
    yeppeumCount > 0
      ? [
          {
            productId: 36,
            productName: `Dưỡng Mi Yeppeum Korea (${selectedSerumTier.label})`,
            price: selectedSerumTier.price,
            quantity: yeppeumCount,
            cvBonus: selectedSerumTier.cvBonus,
          },
        ]
      : [];

  const effectiveUseOldComboToday =
    shouldUseOldUpperComboToday !== undefined ? shouldUseOldUpperComboToday : isExistingComboLive;
  const waiveByNewUpperCombo = upperTodayUsageMode
    ? upperTodayUsageMode === 'USE_NEW_COMBO'
    : !isExistingComboLive && deductTodayIntoCombo;

  const rawRemainingWallet = selectedNewComboPkg
    ? waiveByNewUpperCombo && purchaseAccounting
      ? purchaseAccounting.remainingWalletAfterToday
      : {
          paidNew: selectedNewComboPkg.comboNewCount,
          paidRefill: selectedNewComboPkg.comboRefillCount,
          bonusNew: selectedNewComboPkg.bonusNewCount,
          bonusRefill: selectedNewComboPkg.bonusRefillCount,
          totalPaidRemaining: selectedNewComboPkg.comboNewCount + selectedNewComboPkg.comboRefillCount,
          totalBonusRemaining: selectedNewComboPkg.bonusNewCount + selectedNewComboPkg.bonusRefillCount,
          totalRemaining: selectedNewComboPkg.totalSessions,
        }
    : undefined;

  const remainingWallet =
    rawRemainingWallet && selectedUpperExpiry
      ? mergeExpiryIntoRemainingWallet(rawRemainingWallet, selectedUpperExpiry)
      : rawRemainingWallet;

  const selectedCombo: NonNullable<BookingItem['selectedCombo']> | null =
    selectedNewComboPkg && (isExistingComboLive || purchaseAccounting)
      ? {
          id: selectedNewComboPkg.id,
          name: selectedNewComboPkg.displayName,
          price: selectedNewComboPkg.comboPrice,
          bonus: newComboBonus,
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
          todaySingleServiceWaived: waiveByNewUpperCombo,
          todayUsageMode: upperTodayUsageMode,
          dateExpired: selectedUpperExpiry?.dateExpired,
          dateExpiredDisplay: selectedUpperExpiry?.dateExpiredDisplay,
          expiryFormulaSummary: selectedUpperExpiry?.formulaSummaryVi,
          revivedExpiredSessions: selectedUpperExpiry?.revivedExpiredSessions || 0,
          isUpTierUpgrade: isUpTierPackage,
          originalServiceCategory: autoMatchedCategoryId,
          recognizedRevenueToday:
            waiveByNewUpperCombo && purchaseAccounting
              ? purchaseAccounting.recognizedRevenueToday
              : effectiveUseOldComboToday
                ? 0
                : servicePrice,
          deferredRevenueBalance:
            waiveByNewUpperCombo && purchaseAccounting
              ? purchaseAccounting.deferredRevenueBalance
              : selectedNewComboPkg.comboPrice,
          remainingAfterToday: remainingWallet,
        }
      : null;

  const effectiveRedemptionExpiry = selectedUpperExpiry?.dateExpired || existingUpperComboDateExpired || null;
  const comboRedemption: NonNullable<BookingItem['comboRedemption']> | null =
    effectiveUseOldComboToday && redemptionAccounting
      ? {
          comboName: redemptionAccounting.comboName,
          deductedBucket: redemptionAccounting.deductedBucket,
          typeConversionSurcharge: redemptionAccounting.typeConversionSurcharge,
          upgradeVolumeSurcharge: redemptionAccounting.upgradeVolumeSurcharge,
          totalCustomerPayToday: redemptionAccounting.totalCustomerPayToday,
          recognizedRevenueToday: redemptionAccounting.recognizedRevenueToday,
          remainingAfterToday: redemptionAccounting.walletAfter.totalRemaining,
          explanation: redemptionAccounting.explanation,
          totalSessions:
            redemptionAccounting.walletBefore.paidNew +
            redemptionAccounting.walletBefore.paidRefill +
            redemptionAccounting.walletBefore.bonusNew +
            redemptionAccounting.walletBefore.bonusRefill +
            1,
          paidRemaining: redemptionAccounting.walletAfter.paidNew + redemptionAccounting.walletAfter.paidRefill,
          bonusRemaining: redemptionAccounting.walletAfter.bonusNew + redemptionAccounting.walletAfter.bonusRefill,
          dateExpired: effectiveRedemptionExpiry,
          dateExpiredDisplay: formatExpiryDateDdMmYyyy(effectiveRedemptionExpiry) || null,
        }
      : null;

  const rawUnderRemaining = selectedUnderComboPkg
    ? deductUnderTodayIntoCombo && underPurchaseAccounting
      ? underPurchaseAccounting.remainingWalletAfterToday
      : {
          paidNew: selectedUnderComboPkg.comboNewCount,
          paidRefill: selectedUnderComboPkg.comboRefillCount,
          bonusNew: selectedUnderComboPkg.bonusNewCount,
          bonusRefill: selectedUnderComboPkg.bonusRefillCount,
          totalPaidRemaining: selectedUnderComboPkg.comboNewCount + selectedUnderComboPkg.comboRefillCount,
          totalBonusRemaining: selectedUnderComboPkg.bonusNewCount + selectedUnderComboPkg.bonusRefillCount,
          totalRemaining: selectedUnderComboPkg.totalSessions,
        }
    : undefined;

  const selectedUnderCombo: NonNullable<BookingItem['selectedUnderCombo']> | null =
    selectedUnderComboPkg && underPurchaseAccounting
      ? {
          id: selectedUnderComboPkg.id,
          name: selectedUnderComboPkg.displayName,
          price: selectedUnderComboPkg.comboPrice,
          bonus: underComboBonus,
          sessions: selectedUnderComboPkg.totalSessions,
          ruleName: selectedUnderComboPkg.ruleName,
          validityMonths: selectedUnderComboPkg.validityMonths,
          retailTotal: selectedUnderComboPkg.retailTotal,
          savingsAmount: selectedUnderComboPkg.savingsAmount,
          avgPerSessionPrice: selectedUnderComboPkg.avgPerSessionPrice,
          todaySingleServiceWaived: deductUnderTodayIntoCombo,
          todayUsageMode: underTodayUsageMode,
          dateExpired: selectedUnderExpiry?.dateExpired,
          dateExpiredDisplay: selectedUnderExpiry?.dateExpiredDisplay,
          expiryFormulaSummary: selectedUnderExpiry?.formulaSummaryVi,
          revivedExpiredSessions: selectedUnderExpiry?.revivedExpiredSessions || 0,
          recognizedRevenueToday: deductUnderTodayIntoCombo ? underPurchaseAccounting.recognizedRevenueToday : 0,
          deferredRevenueBalance: deductUnderTodayIntoCombo
            ? underPurchaseAccounting.deferredRevenueBalance
            : selectedUnderComboPkg.comboPrice,
          remainingAfterToday:
            rawUnderRemaining && selectedUnderExpiry
              ? mergeExpiryIntoRemainingWallet(rawUnderRemaining, selectedUnderExpiry)
              : rawUnderRemaining,
        }
      : null;

  return { cartProducts, selectedCombo, selectedUnderCombo, comboRedemption };
}
