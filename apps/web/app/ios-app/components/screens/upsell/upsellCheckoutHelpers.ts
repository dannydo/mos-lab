import {
  WingsComboCategoryId,
  MatchedComboPackageOption,
  calculateComboPurchaseAccounting,
  calculateComboRedemptionAccounting,
} from '@mos-lab/shared';
import { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';

type PurchaseAccountingResult = ReturnType<typeof calculateComboPurchaseAccounting>;
type RedemptionAccountingResult = ReturnType<typeof calculateComboRedemptionAccounting>;
type SerumTierItem = (typeof SERUM_TIERS_CVL)[number];

export interface BuildUpsellCheckoutPayloadParams {
  yeppeumCount: number;
  selectedSerumTier: SerumTierItem;
  isExistingComboLive: boolean;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  deductTodayIntoCombo: boolean;
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
}

export function buildUpsellCheckoutPayload({
  yeppeumCount,
  selectedSerumTier,
  isExistingComboLive,
  selectedNewComboPkg,
  deductTodayIntoCombo,
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

  const remainingWallet = isExistingComboLive
    ? selectedNewComboPkg
      ? {
          paidNew: selectedNewComboPkg.comboNewCount,
          paidRefill: selectedNewComboPkg.comboRefillCount,
          bonusNew: selectedNewComboPkg.bonusNewCount,
          bonusRefill: selectedNewComboPkg.bonusRefillCount,
          totalPaidRemaining: selectedNewComboPkg.comboNewCount + selectedNewComboPkg.comboRefillCount,
          totalBonusRemaining: selectedNewComboPkg.bonusNewCount + selectedNewComboPkg.bonusRefillCount,
          totalRemaining: selectedNewComboPkg.totalSessions,
        }
      : undefined
    : deductTodayIntoCombo && purchaseAccounting
      ? purchaseAccounting.remainingWalletAfterToday
      : selectedNewComboPkg
        ? {
            paidNew: selectedNewComboPkg.comboNewCount,
            paidRefill: selectedNewComboPkg.comboRefillCount,
            bonusNew: selectedNewComboPkg.bonusNewCount,
            bonusRefill: selectedNewComboPkg.bonusRefillCount,
            totalPaidRemaining: selectedNewComboPkg.comboNewCount + selectedNewComboPkg.comboRefillCount,
            totalBonusRemaining: selectedNewComboPkg.bonusNewCount + selectedNewComboPkg.bonusRefillCount,
            totalRemaining: selectedNewComboPkg.totalSessions,
          }
        : undefined;

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
          todaySingleServiceWaived: isExistingComboLive ? false : deductTodayIntoCombo,
          isUpTierUpgrade: isUpTierPackage,
          originalServiceCategory: autoMatchedCategoryId,
          recognizedRevenueToday: isExistingComboLive
            ? 0
            : deductTodayIntoCombo && purchaseAccounting
              ? purchaseAccounting.recognizedRevenueToday
              : servicePrice,
          deferredRevenueBalance: selectedNewComboPkg.comboPrice,
          remainingAfterToday: remainingWallet,
        }
      : null;

  const comboRedemption: NonNullable<BookingItem['comboRedemption']> | null =
    isExistingComboLive && redemptionAccounting
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
        }
      : null;

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
          recognizedRevenueToday: deductUnderTodayIntoCombo ? underPurchaseAccounting.recognizedRevenueToday : 0,
          deferredRevenueBalance: deductUnderTodayIntoCombo
            ? underPurchaseAccounting.deferredRevenueBalance
            : selectedUnderComboPkg.comboPrice,
          remainingAfterToday: deductUnderTodayIntoCombo
            ? underPurchaseAccounting.remainingWalletAfterToday
            : {
                paidNew: selectedUnderComboPkg.comboNewCount,
                paidRefill: selectedUnderComboPkg.comboRefillCount,
                bonusNew: selectedUnderComboPkg.bonusNewCount,
                bonusRefill: selectedUnderComboPkg.bonusRefillCount,
                totalPaidRemaining: selectedUnderComboPkg.comboNewCount + selectedUnderComboPkg.comboRefillCount,
                totalBonusRemaining: selectedUnderComboPkg.bonusNewCount + selectedUnderComboPkg.bonusRefillCount,
                totalRemaining: selectedUnderComboPkg.totalSessions,
              },
        }
      : null;

  return { cartProducts, selectedCombo, selectedUnderCombo, comboRedemption };
}
