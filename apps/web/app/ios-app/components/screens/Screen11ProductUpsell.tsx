'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { IosScannedProductCatalogMatch } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { IosStaffVisibilityToggle } from '../ui-kit/IosStaffVisibilityToggle';
import { BookingItem, SERUM_TIERS_CVL } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import {
  WingsComboCategoryId,
  MatchedComboPackageOption,
  getWingsComboCategory,
  checkWelcomeComboEligibility,
  matchComboCategoryAndVolumeFromBooking,
  getComboPackagesForCategoryAndVolume,
  calculateComboPurchaseAccounting,
  getLashFamilyInfo,
  resolveValidVolumeForCategory,
  getUnderLashComboPackages,
  resolveMatchedUpperComboFromSaved,
  resolveMatchedUnderComboFromSaved,
  resolveServicePriceSplit,
} from '@mos-lab/shared';
import { parseDaysSinceLastVisit } from './LashMaterialConstraintMatrix';
import { UpsellHeaderAndSerumSection } from './upsell/UpsellHeaderAndSerumSection';
import { UpsellMainComboSelector } from './upsell/UpsellMainComboSelector';
import { UpsellUnderComboAndSummary } from './upsell/UpsellUnderComboAndSummary';
import { UpsellOverlays } from './upsell/UpsellOverlays';
import { computeUpsellRedemptionAccounting, computeUpsellTotals } from './upsell/upsellAccountingHelpers';
import {
  addScannedProductToCartProducts,
  applyYeppeumTierToCartProducts,
  buildUpsellCheckoutPayload,
  isYeppeumProductItem,
  removeScannedUnitFromCartProducts,
  resolveInitialSerumSelection,
} from './upsell/upsellCheckoutHelpers';
import { useUpsellComboExpiry } from './upsell/useUpsellComboExpiry';

interface Screen11ProductUpsellProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  isAdmin?: boolean;
  onRefreshDb?: () => Promise<any> | void;
  onBack: () => void;
  onUpdateCartProducts?: (cartProducts: NonNullable<BookingItem['cartProducts']>) => void;
  onGoToBilling: (payload?: {
    cartProducts?: NonNullable<BookingItem['cartProducts']>;
    selectedCombo?: NonNullable<BookingItem['selectedCombo']> | null;
    selectedUnderCombo?: NonNullable<BookingItem['selectedUnderCombo']> | null;
    comboRedemption?: NonNullable<BookingItem['comboRedemption']> | null;
  }) => void;
}

export function Screen11ProductUpsell({
  booking,
  actor,
  isAdmin = false,
  onRefreshDb,
  onBack,
  onUpdateCartProducts,
  onGoToBilling,
}: Screen11ProductUpsellProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
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
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState<boolean>(false);
  const [isSerumInfoModalOpen, setIsSerumInfoModalOpen] = useState<boolean>(false);
  const [isLockedWelcomeModalOpen, setIsLockedWelcomeModalOpen] = useState<boolean>(false);

  // 1. Tự động nhận diện đúng Dòng Mi (Category) & Số Sợi (Volume SKU) từ dịch vụ khách vừa làm
  const autoMatched = useMemo(
    () =>
      matchComboCategoryAndVolumeFromBooking({
        serviceName: booking?.serviceName,
        servicePrice: booking?.servicePrice,
        material: booking?.attributes?.material,
        volume: booking?.attributes?.volume,
        count: booking?.attributes?.count,
        comboName: booking?.comboLiveStatus?.comboName,
        serviceKey: booking?.comboLiveStatus?.serviceKey,
      }),
    [
      booking?.serviceName,
      booking?.servicePrice,
      booking?.attributes?.material,
      booking?.attributes?.volume,
      booking?.attributes?.count,
      booking?.comboLiveStatus?.comboName,
      booking?.comboLiveStatus?.serviceKey,
    ]
  );

  const preferredUpperSpec = useMemo(() => {
    const savedCombo = booking?.selectedCombo;
    if (savedCombo) {
      const idParts = String(savedCombo.id || '').split(':');
      const rawCat = savedCombo.categoryId || idParts[0];
      const rawVolPart = idParts[2];
      const parsedVol =
        savedCombo.volume ??
        (rawVolPart && rawVolPart !== 'under_390' && rawVolPart !== 'under' && Number.isFinite(Number(rawVolPart))
          ? Number(rawVolPart)
          : undefined);
      if (rawCat && rawCat !== 'VVIP' && parsedVol !== undefined && parsedVol !== 'under') {
        const resolvedCat = getWingsComboCategory(rawCat).id;
        const resolvedVol = resolveValidVolumeForCategory(resolvedCat, parsedVol);
        return { categoryId: resolvedCat, volume: resolvedVol };
      }
    }
    return { categoryId: autoMatched.categoryId, volume: autoMatched.volume };
  }, [booking?.selectedCombo, autoMatched.categoryId, autoMatched.volume]);

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

  const setActiveCategoryAndVolume = React.useCallback(
    (categoryId: WingsComboCategoryId, volume: number | 'under') => {
      setManualSpecEdit({ bookingId: booking?.id, categoryId, volume });
    },
    [booking?.id]
  );

  const familyInfo = useMemo(() => getLashFamilyInfo(activeCategoryId), [activeCategoryId]);
  const isUpTierPackage = activeCategoryId !== autoMatched.categoryId;

  const handleSelectFamilyCategory = (targetCatId: WingsComboCategoryId) => {
    const validVol = resolveValidVolumeForCategory(targetCatId, activeVolume);
    setActiveCategoryAndVolume(targetCatId, validVol);
  };

  // 2. Kiểm tra điều kiện gói Welcome (2 tặng 1): Chỉ mở trong ngày đầu tiên sử dụng dịch vụ
  const welcomeEligibility = useMemo(
    () =>
      checkWelcomeComboEligibility({
        customerVisits: booking?.customerVisits ?? 1,
        lashHistoryDates: (booking?.lashHistory || []).map((h) => h.date),
      }),
    [booking?.customerVisits, booking?.lashHistory]
  );

  // 3. Lấy danh sách gói Combo chuẩn xác cho dòng mi & số sợi hiện tại
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

  const isExistingComboLive = Boolean(
    booking?.comboLiveStatus?.isComboLive && (booking?.comboLiveStatus?.remainingSessions ?? 0) > 0
  );
  const remainingSessions = booking?.comboLiveStatus?.remainingSessions ?? 0;

  // Nếu khách có combo còn hạn > 2 lần (chưa sắp hết hạn và chưa chọn sẵn gói ở Tư Vấn): mặc định ẨN phần mua thêm combo
  const hasPreselectedAnyCombo = Boolean(booking?.selectedCombo || booking?.selectedUnderCombo);
  const shouldAutoExpandRenewal = Boolean(
    booking?.comboLiveStatus?.isExpired ||
    booking?.comboLiveStatus?.isExpiringSoon ||
    remainingSessions <= 2 ||
    hasPreselectedAnyCombo
  );
  const shouldCollapseNewComboByDefault = isExistingComboLive && !shouldAutoExpandRenewal;
  const [showNewComboSection, setShowNewComboSection] = useState<boolean>(!shouldCollapseNewComboByDefault);

  React.useEffect(() => {
    setShowNewComboSection(!shouldCollapseNewComboByDefault);
  }, [shouldCollapseNewComboByDefault]);

  // Mặc định cho gói combo mới:
  // - Nếu booking đã có selectedCombo hợp lệ từ bước Tư vấn -> hydrate chuẩn xác 100% (không bị rơi về Chỉ làm lẻ)
  // - Mặc định an toàn khi chưa chọn gói: 'NONE'
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

  const selectedNewComboId = useMemo(() => {
    if (!rawSelectedNewComboId || rawSelectedNewComboId === 'NONE') return 'NONE';
    const exact = matchedPackages.find((p) => p.id === rawSelectedNewComboId && !p.isLocked);
    if (exact) return exact.id;

    const idParts = rawSelectedNewComboId.split(':');
    const desiredRule = (idParts[1] ? idParts[1].replace(/_/g, ' ') : rawSelectedNewComboId.replace(/^[^_]+_/, ''))
      .trim()
      .toLowerCase();
    const ruleMatch = matchedPackages.find(
      (p) => !p.isLocked && (p.ruleName.toLowerCase() === desiredRule || p.id.toLowerCase().endsWith(desiredRule))
    );
    if (ruleMatch) return ruleMatch.id;

    return defaultNewComboSelection;
  }, [rawSelectedNewComboId, matchedPackages, defaultNewComboSelection]);

  const setSelectedNewComboId: React.Dispatch<React.SetStateAction<string>> = React.useCallback(
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
  const hasUnderMinkComboActive = Boolean(
    booking?.underMinkComboStatus?.hasUnderCombo && (booking?.underMinkComboStatus?.remainingSessions ?? 0) > 0
  );
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

  // 4. Tính hạch toán khi MUA GÓI MỚI (Trừ luôn buổi đầu vào gói nếu khách chưa có combo)
  const purchaseAccounting = useMemo(
    () =>
      selectedNewComboPkg ? calculateComboPurchaseAccounting(selectedNewComboPkg, effectiveUpperSinglePrice) : null,
    [selectedNewComboPkg, effectiveUpperSinglePrice]
  );

  // 4B. Danh sách gói Combo Mi Dưới (Tùy chọn mua kèm cùng lúc với Combo Mi Trên — hydrate từ booking.selectedUnderCombo)
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

  const setSelectedUnderComboId: React.Dispatch<React.SetStateAction<string>> = React.useCallback(
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
  const {
    isWalletModalOpen,
    setIsWalletModalOpen,
    existingUpperExpirySnapshot,
    existingUnderExpirySnapshot,
    upperTodayUsageMode,
    setUpperTodayUsageMode,
    underTodayUsageMode,
    todayServiceType,
    underServiceType,
    deductTodayIntoCombo,
    setDeductTodayIntoCombo,
    upperExpiryPreviewMap,
    underExpiryPreviewMap,
    selectedUpperExpiry,
    selectedUnderExpiry,
    shouldUseOldUpperComboToday,
    shouldWaiveUnderToday,
  } = useUpsellComboExpiry({
    booking,
    matchedPackages,
    underLashPackages,
    selectedNewComboPkg,
    selectedUnderComboPkg,
    isExistingComboLive,
    hasUnderMinkComboActive,
    underServicePrice,
  });

  // 5. Tính hạch toán khi TRỪ GÓI COMBO ĐANG CÓ (FIFO Lượt Mua -> Lượt Tặng 0đ + Phụ thu Refill->New hoặc Up-size Volume)
  const [simulateOnlyRefillLeft, setSimulateOnlyRefillLeft] = useState<boolean>(false);
  const existingComboMatch = useMemo(
    () =>
      matchComboCategoryAndVolumeFromBooking({
        comboName: booking?.comboLiveStatus?.comboName,
        serviceKey: booking?.comboLiveStatus?.serviceKey,
        serviceName: booking?.originalBookedServiceName || booking?.serviceName,
      }),
    [
      booking?.comboLiveStatus?.comboName,
      booking?.comboLiveStatus?.serviceKey,
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

  const {
    serumTotal,
    serumBonus,
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
  } = computeUpsellTotals({
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
        shouldUseOldUpperComboToday,
        selectedNewComboPkg,
        deductTodayIntoCombo,
        upperTodayUsageMode,
        selectedUpperExpiry,
        existingUpperComboDateExpired: booking?.comboLiveStatus?.dateExpired,
        purchaseAccounting,
        newComboBonus,
        isUpTierPackage,
        autoMatchedCategoryId: autoMatched.categoryId,
        servicePrice: effectiveUpperSinglePrice,
        redemptionAccounting,
        selectedUnderComboPkg,
        underPurchaseAccounting,
        underComboBonus,
        deductUnderTodayIntoCombo: shouldWaiveUnderToday,
        underTodayUsageMode,
        selectedUnderExpiry,
      })
    );
  };

  return (
    <div className={`flex-1 flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-y-auto select-none`}>
      <IosNavigationBar
        title="Dưỡng Mi & Combo"
        onBack={onBack}
        backTitle="Ảnh After"
        rightAction={
          <div className="flex items-center gap-1.5">
            <IosStaffVisibilityToggle
              showStaffRewards={showStaffRewards}
              onToggle={() => setShowStaffRewards((prev) => !prev)}
              isDark={isDark}
            />
            <button
              onClick={handleConfirmCheckout}
              className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60 cursor-pointer"
            >
              Checkout
            </button>
          </div>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        <UpsellHeaderAndSerumSection
          isDark={isDark}
          booking={booking}
          customerName={customerName}
          customerPhone={customerPhone}
          customerVisits={customerVisits}
          isNewClient={isNewClient}
          serviceName={serviceName}
          assignedStaffName={assignedStaffName}
          assignedStaffTier={assignedStaffTier}
          isExistingComboLive={isExistingComboLive}
          redemptionAccounting={redemptionAccounting}
          simulateOnlyRefillLeft={simulateOnlyRefillLeft}
          onToggleSimulateOnlyRefillLeft={() => setSimulateOnlyRefillLeft((v) => !v)}
          yeppeumCount={yeppeumCount}
          cartProducts={localCartProducts}
          onOpenQrScanner={() => setIsQrScannerOpen(true)}
          onRemoveScannedUnit={handleRemoveScannedUnit}
          selectedSerumTier={selectedSerumTier}
          showStaffRewards={showStaffRewards}
          onOpenSerumInfoModal={() => setIsSerumInfoModalOpen(true)}
          onOpenWalletModal={() => setIsWalletModalOpen(true)}
        />

        <UpsellMainComboSelector
          isDark={isDark}
          booking={booking}
          customerName={customerName}
          isExistingComboLive={isExistingComboLive}
          remainingSessions={remainingSessions}
          showNewComboSection={showNewComboSection}
          onExpandNewComboSection={() => setShowNewComboSection(true)}
          onCollapseNewComboSection={handleCollapseNewComboSection}
          isUpTierPackage={isUpTierPackage}
          currentCategory={currentCategory}
          activeCategoryId={activeCategoryId}
          activeVolume={activeVolume}
          autoMatchedCategoryId={autoMatched.categoryId}
          autoMatchedVolume={autoMatched.volume}
          familyInfo={familyInfo}
          onSelectFamilyCategory={handleSelectFamilyCategory}
          onSelectVolume={(vol) => setActiveCategoryAndVolume(activeCategoryId, vol)}
          onOpenConsultModal={() => setIsConsultModalOpen(true)}
          servicePrice={effectiveUpperSinglePrice}
          matchedPackages={matchedPackages}
          selectedNewComboId={selectedNewComboId}
          onSetSelectedNewComboId={setSelectedNewComboId}
          selectedNewComboPkg={selectedNewComboPkg}
          purchaseAccounting={purchaseAccounting}
          deductTodayIntoCombo={deductTodayIntoCombo}
          onSetDeductTodayIntoCombo={setDeductTodayIntoCombo}
          upperExpiryPreviewMap={upperExpiryPreviewMap}
          upperTodayUsageMode={upperTodayUsageMode}
          onSetUpperTodayUsageMode={setUpperTodayUsageMode}
          selectedUpperExpiry={selectedUpperExpiry}
          showStaffRewards={showStaffRewards}
          actorName={actorName}
          onOpenLockedWelcomeModal={() => setIsLockedWelcomeModalOpen(true)}
        />

        <UpsellUnderComboAndSummary
          isDark={isDark}
          booking={booking}
          customerName={customerName}
          isExistingComboLive={isExistingComboLive}
          showNewComboSection={showNewComboSection}
          underLashPackages={underLashPackages}
          selectedUnderComboId={selectedUnderComboId}
          onSetSelectedUnderComboId={setSelectedUnderComboId}
          selectedUnderComboPkg={selectedUnderComboPkg}
          selectedNewComboPkg={selectedNewComboPkg}
          deductTodayIntoCombo={deductTodayIntoCombo}
          underExpiryPreviewMap={underExpiryPreviewMap}
          selectedUpperExpiry={selectedUpperExpiry}
          selectedUnderExpiry={selectedUnderExpiry}
          servicePrice={servicePrice}
          effectiveServiceChargeToday={effectiveServiceChargeToday}
          redemptionAccounting={redemptionAccounting}
          newComboTotal={newComboTotal}
          underComboTotal={underComboTotal}
          totalComboPrice={totalComboPrice}
          totalComboBonus={totalComboBonus}
          hasBothCombos={hasBothCombos}
          upperComboStandaloneBonus={upperComboStandaloneBonus}
          underComboStandaloneBonus={underComboStandaloneBonus}
          yeppeumCount={yeppeumCount}
          selectedSerumTier={selectedSerumTier}
          serumTotal={serumTotal}
          serumBonus={serumBonus}
          subtotal={subtotal}
          showStaffRewards={showStaffRewards}
          onOpenLockedWelcomeModal={() => setIsLockedWelcomeModalOpen(true)}
          onConfirmCheckout={handleConfirmCheckout}
        />
      </div>

      <UpsellOverlays
        isDark={isDark}
        booking={booking}
        customerName={customerName}
        isAdmin={isAdmin}
        onRefreshDb={onRefreshDb}
        isConsultModalOpen={isConsultModalOpen}
        onCloseConsultModal={() => setIsConsultModalOpen(false)}
        activeCategoryId={activeCategoryId}
        activeVolume={activeVolume}
        welcomeEligibility={welcomeEligibility}
        selectedNewComboPkg={selectedNewComboPkg}
        selectedUnderComboPkg={selectedUnderComboPkg}
        todaySingleServicePrice={effectiveUpperSinglePrice}
        existingUpperExpirySnapshot={existingUpperExpirySnapshot}
        existingUnderExpirySnapshot={existingUnderExpirySnapshot}
        upperTodayUsageMode={upperTodayUsageMode}
        underTodayUsageMode={underTodayUsageMode}
        todayServiceType={todayServiceType}
        underServiceType={underServiceType}
        onSelectComboPackage={(pkg) => {
          setActiveCategoryAndVolume(pkg.categoryId, pkg.volume);
          setSelectedNewComboId(pkg.id);
        }}
        onApplyComboPackages={({ upperPkg, underPkg }) => {
          if (upperPkg) {
            setActiveCategoryAndVolume(upperPkg.categoryId, upperPkg.volume);
            setSelectedNewComboId(upperPkg.id);
          } else {
            setSelectedNewComboId('NONE');
          }
          if (underPkg) {
            setSelectedUnderComboId(underPkg.id);
          } else {
            setSelectedUnderComboId('NONE');
          }
        }}
        isSerumInfoModalOpen={isSerumInfoModalOpen}
        onCloseSerumInfoModal={() => setIsSerumInfoModalOpen(false)}
        selectedSerumTierId={selectedSerumTierId}
        yeppeumCount={yeppeumCount}
        onSelectSerumTier={(tierId) => {
          setSelectedSerumTierId(tierId);
          const nextTier = SERUM_TIERS_CVL.find((t) => t.id === tierId) || SERUM_TIERS_CVL[0];
          setLocalCartProducts((prev) => {
            const next = applyYeppeumTierToCartProducts(prev, nextTier);
            onUpdateCartProducts?.(next);
            return next;
          });
          setIsSerumInfoModalOpen(false);
          if (yeppeumCount === 0) {
            setIsQrScannerOpen(true);
          }
        }}
        isLockedWelcomeModalOpen={isLockedWelcomeModalOpen}
        onCloseLockedWelcomeModal={() => setIsLockedWelcomeModalOpen(false)}
        isQrScannerOpen={isQrScannerOpen}
        onCloseQrScanner={() => setIsQrScannerOpen(false)}
        localCartProducts={localCartProducts}
        onScannedProduct={handleScannedProduct}
        onRemoveScannedUnit={handleRemoveScannedUnit}
        isWalletModalOpen={isWalletModalOpen}
        onCloseWalletModal={() => setIsWalletModalOpen(false)}
      />
    </div>
  );
}
