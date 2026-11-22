'use client';

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  calculateComboPurchaseAccounting,
  checkWelcomeComboEligibility,
  getComboPackagesForCategoryAndVolume,
  getLashFamilyInfo,
  getUnderLashComboPackages,
  getWingsComboCategory,
  matchComboCategoryAndVolumeFromBooking,
  resolveActiveBookingComboWallets,
  resolveMatchedUnderComboFromSaved,
  resolveMatchedUpperComboFromSaved,
  resolveServicePriceSplit,
  resolveValidVolumeForCategory,
  type IosScannedProductCatalogMatch,
  type MatchedComboPackageOption,
  type WingsComboCategoryId,
} from '@mos-lab/shared';
import { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import type { ActiveActorProfile } from '../../../state/useIosAppState';
import { parseDaysSinceLastVisit } from '../LashMaterialConstraintMatrix';
import { hasBookingPreattachedOrServicePromotion } from '../consultation/comboExpiryConsultHelpers';
import { computeUpsellRedemptionAccounting, computeUpsellTotals } from './upsellAccountingHelpers';
import {
  addScannedProductToCartProducts,
  applyYeppeumTierToCartProducts,
  buildUpsellCheckoutPayload,
  isYeppeumProductItem,
  removeScannedUnitFromCartProducts,
  resolveInitialSerumSelection,
  resolveUpsellAutoAndPreferredSpec,
  resolveValidSelectedNewComboId,
} from './upsellCheckoutHelpers';
import { useUpsellComboExpiry } from './useUpsellComboExpiry';

export type UpsellGoToBillingPayload = {
  cartProducts?: NonNullable<BookingItem['cartProducts']>;
  selectedCombo?: NonNullable<BookingItem['selectedCombo']> | null;
  selectedUnderCombo?: NonNullable<BookingItem['selectedUnderCombo']> | null;
  comboRedemption?: NonNullable<BookingItem['comboRedemption']> | null;
  selectedUpperComboBalanceId?: number | null;
  selectedUnderComboBalanceId?: number | null;
  skipUpperCombo?: boolean;
  skipUnderCombo?: boolean;
};

interface UseUpsellScreenStateParams {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  onUpdateCartProducts?: (cartProducts: NonNullable<BookingItem['cartProducts']>) => void;
  onGoToBilling: (payload?: UpsellGoToBillingPayload) => void;
}

export function useUpsellScreenState({
  booking,
  actor,
  onUpdateCartProducts,
  onGoToBilling,
}: UseUpsellScreenStateParams) {
  const isSettled =
    booking?.billing?.settlementStatus === 'SETTLED_COMPLETED' ||
    booking?.orderState === 'Completed' ||
    Boolean(booking?.status === 'DONE' && booking?.billing?.completedAt);

  const initialSerum = resolveInitialSerumSelection(booking?.cartProducts);
  const [selectedSerumTierId, setSelectedSerumTierId] = useState<string>(initialSerum.tierId);
  const [localCartProducts, setLocalCartProducts] = useState<NonNullable<BookingItem['cartProducts']>>(
    () => booking?.cartProducts || []
  );

  useEffect(() => {
    const synced = resolveInitialSerumSelection(booking?.cartProducts);
    setSelectedSerumTierId(synced.tierId);
    setLocalCartProducts(booking?.cartProducts || []);
  }, [booking?.id, booking?.cartProducts]);

  const yeppeumCount = useMemo(
    () =>
      localCartProducts
        .filter((p) => isYeppeumProductItem(p))
        .reduce((sum, p) => sum + Math.max(0, Number(p.quantity || 0)), 0),
    [localCartProducts]
  );

  const resolvedWallets = useMemo(() => resolveActiveBookingComboWallets(booking || {}), [booking]);
  const effectiveUpperStatus = resolvedWallets.effectiveComboLiveStatus;

  const { autoMatched, preferredUpperSpec } = useMemo(
    () => resolveUpsellAutoAndPreferredSpec(booking, effectiveUpperStatus.comboName, effectiveUpperStatus.serviceKey),
    [booking, effectiveUpperStatus.comboName, effectiveUpperStatus.serviceKey]
  );

  const [manualSpecEdit, setManualSpecEdit] = useState<{
    bookingId: number | undefined;
    categoryId: WingsComboCategoryId;
    volume: number | 'under';
  } | null>(null);

  const activeCategoryId: WingsComboCategoryId =
    manualSpecEdit && manualSpecEdit.bookingId === booking?.id
      ? manualSpecEdit.categoryId
      : preferredUpperSpec.categoryId;
  const activeVolume: number | 'under' =
    manualSpecEdit && manualSpecEdit.bookingId === booking?.id ? manualSpecEdit.volume : preferredUpperSpec.volume;

  const setActiveCategoryAndVolume = useCallback(
    (categoryId: WingsComboCategoryId, volume: number | 'under') =>
      setManualSpecEdit({ bookingId: booking?.id, categoryId, volume }),
    [booking?.id]
  );

  const familyInfo = useMemo(() => getLashFamilyInfo(activeCategoryId), [activeCategoryId]);
  const isUpTierPackage = activeCategoryId !== autoMatched.categoryId;

  const handleSelectFamilyCategory = (targetCatId: WingsComboCategoryId) => {
    const validVol = resolveValidVolumeForCategory(targetCatId, activeVolume);
    setActiveCategoryAndVolume(targetCatId, validVol);
  };

  const welcomeEligibility = useMemo(
    () =>
      checkWelcomeComboEligibility({
        customerVisits: booking?.customerVisits ?? 1,
        lashHistoryDates: (booking?.lashHistory || []).map((h) => h.date),
      }),
    [booking?.customerVisits, booking?.lashHistory]
  );

  const matchedPackages = useMemo(
    () =>
      getComboPackagesForCategoryAndVolume({
        categoryId: activeCategoryId,
        volume: activeVolume,
        welcomeEligibility,
        includeVvipPass: true,
      }),
    [activeCategoryId, activeVolume, welcomeEligibility]
  );

  const isExistingComboLive = resolvedWallets.isRedeemingUpperToday;
  const remainingSessions = effectiveUpperStatus.remainingSessions ?? 0;

  const hasPreselectedAnyCombo = Boolean(booking?.selectedCombo || booking?.selectedUnderCombo);
  const activeBookingPromotion = booking?.servicePromotion ?? booking?.appliedPromotion ?? null;
  const shouldAutoExpandRenewal = Boolean(
    effectiveUpperStatus.isExpired ||
    effectiveUpperStatus.isExpiringSoon ||
    remainingSessions <= 2 ||
    hasPreselectedAnyCombo ||
    hasBookingPreattachedOrServicePromotion(booking)
  );
  const shouldCollapseNewComboByDefault = isExistingComboLive && !shouldAutoExpandRenewal;
  const [showNewComboSection, setShowNewComboSection] = useState<boolean>(!shouldCollapseNewComboByDefault);

  useEffect(() => {
    setShowNewComboSection(!shouldCollapseNewComboByDefault);
  }, [shouldCollapseNewComboByDefault]);

  const hydratedUpperComboPkg = useMemo(
    () =>
      resolveMatchedUpperComboFromSaved(booking?.selectedCombo, welcomeEligibility, {
        categoryId: activeCategoryId,
        volume: activeVolume,
      }),
    [booking?.selectedCombo, welcomeEligibility, activeCategoryId, activeVolume]
  );
  const defaultNewComboSelection = hydratedUpperComboPkg?.id || 'NONE';

  const [manualUpperComboEdit, setManualUpperComboEdit] = useState<{
    bookingId: number | undefined;
    comboId: string;
  } | null>(null);

  const rawSelectedNewComboId =
    manualUpperComboEdit && manualUpperComboEdit.bookingId === booking?.id
      ? manualUpperComboEdit.comboId
      : defaultNewComboSelection;

  const selectedNewComboId = useMemo(
    () => resolveValidSelectedNewComboId(rawSelectedNewComboId, matchedPackages, defaultNewComboSelection),
    [rawSelectedNewComboId, matchedPackages, defaultNewComboSelection]
  );

  const setSelectedNewComboId: Dispatch<SetStateAction<string>> = useCallback(
    (next) => {
      setManualUpperComboEdit((prev) => {
        const current = prev && prev.bookingId === booking?.id ? prev.comboId : selectedNewComboId;
        const resolved = typeof next === 'function' ? next(current) : next;
        return { bookingId: booking?.id, comboId: resolved };
      });
    },
    [booking?.id, selectedNewComboId]
  );

  const [showStaffRewards, setShowStaffRewards] = useState<boolean>(false);

  useEffect(() => {
    setShowStaffRewards(false);
  }, [booking?.id]);

  const currentCategory = useMemo(() => getWingsComboCategory(activeCategoryId), [activeCategoryId]);
  const selectedSerumTier = SERUM_TIERS_CVL.find((t) => t.id === selectedSerumTierId) || SERUM_TIERS_CVL[0];
  const selectedNewComboPkg: MatchedComboPackageOption | null = useMemo(
    () => matchedPackages.find((c) => c.id === selectedNewComboId && !c.isLocked) || null,
    [matchedPackages, selectedNewComboId]
  );

  const servicePrice = booking?.servicePrice || 770000;
  const serviceName = booking?.serviceName || 'Flawless Mink 770';
  const hasUnderMinkComboActive = resolvedWallets.isRedeemingUnderToday;
  const { upperServicePrice, underServicePrice } = useMemo(
    () =>
      resolveServicePriceSplit({
        servicePrice,
        serviceName: booking?.serviceName,
        hasUnderMink: booking?.attributes?.hasUnderMink,
        underMinkServiceType: booking?.attributes?.underMinkServiceType,
        hasUnderMinkCombo: hasUnderMinkComboActive,
      }),
    [
      servicePrice,
      booking?.serviceName,
      booking?.attributes?.hasUnderMink,
      booking?.attributes?.underMinkServiceType,
      hasUnderMinkComboActive,
    ]
  );
  const effectiveUpperSinglePrice = upperServicePrice > 0 ? upperServicePrice : servicePrice;

  const customerName = (booking?.customerName || 'Chị Trúc').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  const customerPhone = booking?.customerPhone || '';
  const customerVisits = booking?.customerVisits ?? 1;
  const isNewClient = customerVisits <= 1;
  const assignedStaffName = booking?.assignedStaffName || actor?.name || 'Phương Nhi';
  const assignedStaffTier = booking?.assignedStaffTier || actor?.tier || 'CVL';
  const actorName = actor?.name || 'Thảo Ly';

  const purchaseAccounting = useMemo(
    () =>
      selectedNewComboPkg ? calculateComboPurchaseAccounting(selectedNewComboPkg, effectiveUpperSinglePrice) : null,
    [selectedNewComboPkg, effectiveUpperSinglePrice]
  );

  const underLashPackages = useMemo(() => getUnderLashComboPackages(welcomeEligibility), [welcomeEligibility]);
  const hydratedUnderComboPkg = useMemo(
    () => resolveMatchedUnderComboFromSaved(booking?.selectedUnderCombo, welcomeEligibility),
    [booking?.selectedUnderCombo, welcomeEligibility]
  );
  const defaultUnderComboSelection = hydratedUnderComboPkg?.id || 'NONE';

  const [manualUnderComboEdit, setManualUnderComboEdit] = useState<{
    bookingId: number | undefined;
    comboId: string;
  } | null>(null);

  const selectedUnderComboId =
    manualUnderComboEdit && manualUnderComboEdit.bookingId === booking?.id
      ? manualUnderComboEdit.comboId
      : defaultUnderComboSelection;

  const setSelectedUnderComboId: Dispatch<SetStateAction<string>> = useCallback(
    (next) => {
      setManualUnderComboEdit((prev) => {
        const current = prev && prev.bookingId === booking?.id ? prev.comboId : selectedUnderComboId;
        const resolved = typeof next === 'function' ? next(current) : next;
        return { bookingId: booking?.id, comboId: resolved };
      });
    },
    [booking?.id, selectedUnderComboId]
  );

  const selectedUnderComboPkg: MatchedComboPackageOption | null = useMemo(
    () => underLashPackages.find((p) => p.id === selectedUnderComboId && !p.isLocked) || null,
    [underLashPackages, selectedUnderComboId]
  );
  const underPurchaseAccounting = useMemo(
    () =>
      selectedUnderComboPkg
        ? calculateComboPurchaseAccounting(selectedUnderComboPkg, underServicePrice || 390000)
        : null,
    [selectedUnderComboPkg, underServicePrice]
  );

  const comboExpiryState = useUpsellComboExpiry({
    booking,
    matchedPackages,
    underLashPackages,
    selectedNewComboPkg,
    selectedUnderComboPkg,
    isExistingComboLive,
    hasUnderMinkComboActive,
    underServicePrice,
  });

  const [simulateOnlyRefillLeft, setSimulateOnlyRefillLeft] = useState<boolean>(false);
  const existingComboMatch = useMemo(
    () =>
      matchComboCategoryAndVolumeFromBooking({
        comboName: effectiveUpperStatus.comboName,
        serviceKey: effectiveUpperStatus.serviceKey,
        serviceName: booking?.originalBookedServiceName || booking?.serviceName,
      }),
    [
      effectiveUpperStatus.comboName,
      effectiveUpperStatus.serviceKey,
      booking?.originalBookedServiceName,
      booking?.serviceName,
    ]
  );

  const daysSinceLastVisit = useMemo(
    () => parseDaysSinceLastVisit(booking?.lashHistory?.[0]?.date),
    [booking?.lashHistory]
  );

  const redemptionAccounting = useMemo(
    () =>
      computeUpsellRedemptionAccounting({
        isExistingComboLive,
        simulateOnlyRefillLeft,
        booking,
        existingComboCategoryId: existingComboMatch.categoryId,
        existingComboVolume: existingComboMatch.volume,
        targetCategoryId: autoMatched.categoryId,
        targetVolume: autoMatched.volume,
        daysSinceLastVisit,
      }),
    [isExistingComboLive, simulateOnlyRefillLeft, booking, existingComboMatch, autoMatched, daysSinceLastVisit]
  );

  const handleScannedProduct = useCallback(
    (scanned: IosScannedProductCatalogMatch) => {
      setLocalCartProducts((prev) => {
        const next = addScannedProductToCartProducts(prev, scanned, {
          yeppeumTierOverride: selectedSerumTier,
        });
        onUpdateCartProducts?.(next);
        return next;
      });
    },
    [selectedSerumTier, onUpdateCartProducts]
  );

  const handleRemoveScannedUnit = useCallback(
    (productIndex: number, inventoryWarehouseItemId?: number) => {
      setLocalCartProducts((prev) => {
        const next = removeScannedUnitFromCartProducts(prev, productIndex, inventoryWarehouseItemId);
        onUpdateCartProducts?.(next);
        return next;
      });
    },
    [onUpdateCartProducts]
  );

  const applySerumTierSelection = useCallback(
    (tierId: string) => {
      setSelectedSerumTierId(tierId);
      const nextTier = SERUM_TIERS_CVL.find((t) => t.id === tierId) || SERUM_TIERS_CVL[0];
      setLocalCartProducts((prev) => {
        const next = applyYeppeumTierToCartProducts(prev, nextTier);
        onUpdateCartProducts?.(next);
        return next;
      });
    },
    [onUpdateCartProducts]
  );

  const totals = computeUpsellTotals({
    booking,
    localCartProducts,
    yeppeumCount,
    selectedSerumTier,
    selectedNewComboPkg,
    selectedUnderComboPkg,
    servicePrice,
    shouldUseOldUpperComboToday: comboExpiryState.shouldUseOldUpperComboToday,
    hasUnderMinkComboActive,
    upperTodayUsageMode: comboExpiryState.upperTodayUsageMode,
    shouldWaiveUnderToday: comboExpiryState.shouldWaiveUnderToday,
    redemptionAccounting,
  });

  const handleCollapseNewComboSection = () => {
    setShowNewComboSection(false);
    setSelectedNewComboId('NONE');
    setSelectedUnderComboId('NONE');
  };

  const handleConfirmCheckout = () => {
    onGoToBilling(
      buildUpsellCheckoutPayload({
        existingCartProducts: localCartProducts,
        yeppeumCount,
        selectedSerumTier,
        isExistingComboLive,
        shouldUseOldUpperComboToday: comboExpiryState.shouldUseOldUpperComboToday,
        selectedNewComboPkg,
        deductTodayIntoCombo: comboExpiryState.deductTodayIntoCombo,
        upperTodayUsageMode: comboExpiryState.upperTodayUsageMode,
        selectedUpperExpiry: comboExpiryState.selectedUpperExpiry,
        existingUpperComboDateExpired: effectiveUpperStatus.dateExpired,
        purchaseAccounting,
        newComboBonus: totals.newComboBonus,
        isUpTierPackage,
        autoMatchedCategoryId: autoMatched.categoryId,
        servicePrice: effectiveUpperSinglePrice,
        redemptionAccounting,
        selectedUnderComboPkg,
        underPurchaseAccounting,
        underComboBonus: totals.underComboBonus,
        deductUnderTodayIntoCombo: comboExpiryState.shouldWaiveUnderToday,
        underTodayUsageMode: comboExpiryState.underTodayUsageMode,
        selectedUnderExpiry: comboExpiryState.selectedUnderExpiry,
        selectedUpperComboBalanceId: resolvedWallets.selectedUpperComboBalanceId,
        selectedUnderComboBalanceId: resolvedWallets.selectedUnderComboBalanceId,
        skipUpperCombo: resolvedWallets.skipUpperCombo,
        skipUnderCombo: resolvedWallets.skipUnderCombo,
      })
    );
  };

  return {
    isSettled,
    selectedSerumTierId,
    localCartProducts,
    yeppeumCount,
    resolvedWallets,
    autoMatched,
    activeCategoryId,
    activeVolume,
    setActiveCategoryAndVolume,
    familyInfo,
    isUpTierPackage,
    handleSelectFamilyCategory,
    welcomeEligibility,
    matchedPackages,
    isExistingComboLive,
    remainingSessions,
    activeBookingPromotion,
    showNewComboSection,
    setShowNewComboSection,
    selectedNewComboId,
    setSelectedNewComboId,
    showStaffRewards,
    setShowStaffRewards,
    currentCategory,
    selectedSerumTier,
    selectedNewComboPkg,
    servicePrice,
    serviceName,
    effectiveUpperSinglePrice,
    customerName,
    customerPhone,
    customerVisits,
    isNewClient,
    assignedStaffName,
    assignedStaffTier,
    actorName,
    purchaseAccounting,
    underLashPackages,
    selectedUnderComboId,
    setSelectedUnderComboId,
    selectedUnderComboPkg,
    comboExpiryState,
    simulateOnlyRefillLeft,
    setSimulateOnlyRefillLeft,
    redemptionAccounting,
    handleScannedProduct,
    handleRemoveScannedUnit,
    applySerumTierSelection,
    totals,
    handleCollapseNewComboSection,
    handleConfirmCheckout,
  };
}
