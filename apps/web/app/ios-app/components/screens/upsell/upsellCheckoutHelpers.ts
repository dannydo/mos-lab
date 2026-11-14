import {
  WingsComboCategoryId,
  MatchedComboPackageOption,
  calculateComboPurchaseAccounting,
  calculateComboRedemptionAccounting,
  formatExpiryDateDdMmYyyy,
  type ComboPurchaseExpiryResult,
  type ComboTodayUsageMode,
  type IosScannedProductCatalogMatch,
  type IosScannedProductUnit,
} from '@mos-lab/shared';
import { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import { mergeExpiryIntoRemainingWallet } from '../consultation/comboExpiryConsultHelpers';

type PurchaseAccountingResult = ReturnType<typeof calculateComboPurchaseAccounting>;
type RedemptionAccountingResult = ReturnType<typeof calculateComboRedemptionAccounting>;
export type SerumTierItem = (typeof SERUM_TIERS_CVL)[number];

export const YEPPEUM_PRODUCT_ID = 36;

export function isYeppeumProductItem(item: { productId?: number; productName?: string }): boolean {
  return Number(item.productId) === YEPPEUM_PRODUCT_ID || /yeppeum|dưỡng mi/i.test(item.productName || '');
}

/** Hydrate serum stick count & price tier from booking.cartProducts when revisiting Upsell. */
export function resolveInitialSerumSelection(cartProducts?: BookingItem['cartProducts']): {
  count: number;
  tierId: string;
} {
  const matched = (cartProducts || []).find((p) => Number(p.quantity || 0) > 0 && isYeppeumProductItem(p));
  if (!matched) {
    return { count: 0, tierId: SERUM_TIERS_CVL[0].id };
  }
  const byPrice = SERUM_TIERS_CVL.find((tier) => Number(tier.price) === Number(matched.price));
  const byLabel = SERUM_TIERS_CVL.find((tier) => (matched.productName || '').includes(tier.label));
  return {
    count: Math.max(0, Number(matched.quantity || 0)),
    tierId: (byPrice || byLabel || SERUM_TIERS_CVL[0]).id,
  };
}

export function formatCartProductDisplayName(name?: string | null): string {
  return (name || '').replace(/\s*\(\s*Giá gốc[^)]*\)/gi, '').trim();
}

/** Add, update quantity, or remove Dưỡng Mi Yeppeum Korea while preserving non-serum items, scanned units & applied promos. */
export function upsertYeppeumInCartProducts(
  cartProducts: BookingItem['cartProducts'] | undefined,
  count: number,
  tier: SerumTierItem = SERUM_TIERS_CVL[0]
): NonNullable<BookingItem['cartProducts']> {
  const safeCount = Math.max(0, Math.round(count));
  const existing = cartProducts || [];
  const existingYeppeum = existing.find((p) => isYeppeumProductItem(p));
  const others = existing.filter((p) => !isYeppeumProductItem(p));
  if (safeCount <= 0) {
    return others;
  }
  const productName = tier.id === 'serum-orig' ? 'Dưỡng Mi Yeppeum Korea' : `Dưỡng Mi Yeppeum Korea (${tier.label})`;
  const existingUnits = existingYeppeum?.scannedUnits?.slice(0, safeCount);
  return [
    ...others,
    {
      productId: existingYeppeum?.productId || YEPPEUM_PRODUCT_ID,
      productName,
      price: tier.price,
      quantity: safeCount,
      cvBonus: tier.cvBonus,
      ...(existingUnits && existingUnits.length > 0 ? { scannedUnits: existingUnits } : {}),
      ...(existingYeppeum?.appliedPromotion ? { appliedPromotion: existingYeppeum.appliedPromotion } : {}),
      ...(existingYeppeum?.promotionId ? { promotionId: existingYeppeum.promotionId } : {}),
    },
  ];
}

export function applyYeppeumTierToCartProducts(
  cartProducts: BookingItem['cartProducts'] | undefined,
  tier: SerumTierItem
): NonNullable<BookingItem['cartProducts']> {
  const existing = cartProducts || [];
  return existing.map((item) => {
    if (!isYeppeumProductItem(item)) return item;
    const productName = tier.id === 'serum-orig' ? 'Dưỡng Mi Yeppeum Korea' : `Dưỡng Mi Yeppeum Korea (${tier.label})`;
    return {
      ...item,
      productName,
      price: tier.price,
      cvBonus: tier.cvBonus,
    };
  });
}

export function addScannedProductToCartProducts(
  cartProducts: BookingItem['cartProducts'] | undefined,
  scanned: IosScannedProductCatalogMatch,
  options?: { yeppeumTierOverride?: SerumTierItem }
): NonNullable<BookingItem['cartProducts']> {
  const existing = [...(cartProducts || [])];
  const unit: IosScannedProductUnit = scanned.scannedUnit;

  // Guard against scanning duplicate physical unit anywhere in cart
  const alreadyPresent = existing.some((item) =>
    (item.scannedUnits || []).some((u) => u.inventoryWarehouseItemId === unit.inventoryWarehouseItemId)
  );
  if (alreadyPresent) {
    return existing;
  }

  const isYeppeum = isYeppeumProductItem({ productId: scanned.productId, productName: scanned.productName });
  const tier = options?.yeppeumTierOverride;
  const resolvedProductName =
    isYeppeum && tier
      ? tier.id === 'serum-orig'
        ? formatCartProductDisplayName(scanned.productName) || 'Dưỡng Mi Yeppeum Korea'
        : `${formatCartProductDisplayName(scanned.productName) || 'Dưỡng Mi Yeppeum Korea'} (${tier.label})`
      : formatCartProductDisplayName(scanned.productName);
  const resolvedPrice = isYeppeum && tier ? tier.price : scanned.unitPrice;
  const resolvedCvBonus = isYeppeum && tier ? tier.cvBonus : scanned.cvBonus;

  const targetIdx = existing.findIndex(
    (item) => Number(item.productId) === Number(scanned.productId) || (isYeppeum && isYeppeumProductItem(item))
  );

  if (targetIdx >= 0) {
    const currentItem = existing[targetIdx];
    const nextUnits = [...(currentItem.scannedUnits || []), unit];
    existing[targetIdx] = {
      ...currentItem,
      productId: scanned.productId,
      productName: resolvedProductName || formatCartProductDisplayName(currentItem.productName),
      price: currentItem.price !== undefined && currentItem.quantity > 0 ? currentItem.price : resolvedPrice,
      cvBonus: currentItem.cvBonus ?? resolvedCvBonus,
      scannedUnits: nextUnits,
      quantity: nextUnits.length,
    };
    return existing;
  }

  return [
    ...existing,
    {
      productId: scanned.productId,
      productName: resolvedProductName,
      price: resolvedPrice,
      quantity: 1,
      cvBonus: resolvedCvBonus,
      scannedUnits: [unit],
    },
  ];
}

export function removeScannedUnitFromCartProducts(
  cartProducts: BookingItem['cartProducts'] | undefined,
  productIndex: number,
  inventoryWarehouseItemId?: number
): NonNullable<BookingItem['cartProducts']> {
  const existing = cartProducts || [];
  return existing
    .map((item, idx) => {
      if (idx !== productIndex) return item;
      const units = item.scannedUnits || [];
      if (units.length > 0) {
        const nextUnits =
          inventoryWarehouseItemId !== undefined
            ? units.filter((u) => u.inventoryWarehouseItemId !== inventoryWarehouseItemId)
            : units.slice(0, -1);
        return {
          ...item,
          scannedUnits: nextUnits,
          quantity: nextUnits.length,
        };
      }
      return {
        ...item,
        quantity: Math.max(0, Number(item.quantity || 0) - 1),
      };
    })
    .filter((item) => item.quantity > 0);
}

export function collectScannedWarehouseItemIds(cartProducts?: BookingItem['cartProducts']): number[] {
  const ids: number[] = [];
  for (const item of cartProducts || []) {
    for (const unit of item.scannedUnits || []) {
      if (Number(unit.inventoryWarehouseItemId) > 0) {
        ids.push(Number(unit.inventoryWarehouseItemId));
      }
    }
  }
  return ids;
}

export interface BuildUpsellCheckoutPayloadParams {
  existingCartProducts?: BookingItem['cartProducts'];
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
  existingCartProducts,
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
  const cartProducts = upsertYeppeumInCartProducts(existingCartProducts, yeppeumCount, selectedSerumTier);

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
