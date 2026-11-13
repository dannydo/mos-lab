'use client';

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { ComboWalletDetailModal } from '../ui-kit/ComboWalletDetailModal';
import { BookingItem, SERUM_TIERS_CVL } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { Eye, EyeOff } from 'lucide-react';
import {
  WingsComboCategoryId,
  MatchedComboPackageOption,
  getWingsComboCategory,
  checkWelcomeComboEligibility,
  matchComboCategoryAndVolumeFromBooking,
  getComboPackagesForCategoryAndVolume,
  calculateComboPurchaseAccounting,
  calculateComboRedemptionAccounting,
  getLashFamilyInfo,
  resolveValidVolumeForCategory,
  getUnderLashComboPackages,
  resolveMatchedUpperComboFromSaved,
  resolveMatchedUnderComboFromSaved,
  resolveServicePriceSplit,
} from '@mos-lab/shared';
import { ComboCatalogConsultModal } from './ComboCatalogConsultModal';
import { parseDaysSinceLastVisit } from './LashMaterialConstraintMatrix';
import { calculateCvComboTierBonus, resolveEffectiveServiceTotal } from '../../state/useIosBillingCheckout';
import { UpsellHeaderAndSerumSection } from './upsell/UpsellHeaderAndSerumSection';
import { UpsellMainComboSelector } from './upsell/UpsellMainComboSelector';
import { UpsellUnderComboAndSummary } from './upsell/UpsellUnderComboAndSummary';
import { UpsellModals } from './upsell/UpsellModals';
import { buildUpsellCheckoutPayload } from './upsell/upsellCheckoutHelpers';
import { useUpsellComboExpiry } from './upsell/useUpsellComboExpiry';

interface Screen11ProductUpsellProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  isAdmin?: boolean;
  onRefreshDb?: () => Promise<any> | void;
  onBack: () => void;
  onGoToBilling: (payload?: {
    cartProducts?: Array<{ productId: number; productName: string; price: number; quantity: number; cvBonus?: number }>;
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
  onGoToBilling,
}: Screen11ProductUpsellProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [selectedSerumTierId, setSelectedSerumTierId] = useState<string>(SERUM_TIERS_CVL[0].id);
  const [yeppeumCount, setYeppeumCount] = useState<number>(0);
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

  const redemptionAccounting = useMemo(() => {
    if (!isExistingComboLive) return null;
    const totalRem = booking?.comboLiveStatus?.remainingSessions ?? 2;
    const normalRem = simulateOnlyRefillLeft
      ? 0
      : (booking?.comboLiveStatus?.normalRemaining ?? Math.max(1, Math.floor(totalRem / 2)));
    const retainRem = simulateOnlyRefillLeft
      ? Math.max(1, totalRem)
      : (booking?.comboLiveStatus?.retainRemaining ?? Math.max(0, totalRem - normalRem));

    // Tách lượt Mua vs lượt Tặng 0đ (1 lượt cuối mặc định là lượt tặng 0đ nếu tổng còn <= 1, hoặc tách theo tỷ lệ gói)
    const paidNewRem = normalRem > 1 ? normalRem - 1 : normalRem;
    const bonusNewRem = normalRem > 1 ? 1 : 0;
    const paidRefillRem = retainRem > 1 ? retainRem - 1 : retainRem;
    const bonusRefillRem = retainRem > 1 ? 1 : 0;

    return calculateComboRedemptionAccounting({
      comboName: booking?.comboLiveStatus?.comboName || 'Gói Combo Đang Active',
      baseCategoryId: existingComboMatch.categoryId,
      baseVolume: existingComboMatch.volume,
      targetCategoryId: autoMatched.categoryId,
      targetVolume: autoMatched.volume,
      requestedServiceType: (booking?.serviceType as 'Normal' | 'Retain') || 'Normal',
      daysSinceLastVisit,
      paidNewRemaining: paidNewRem,
      paidRefillRemaining: paidRefillRem,
      bonusNewRemaining: bonusNewRem,
      bonusRefillRemaining: bonusRefillRem,
    });
  }, [
    isExistingComboLive,
    simulateOnlyRefillLeft,
    booking?.comboLiveStatus,
    booking?.serviceType,
    existingComboMatch,
    autoMatched,
    daysSinceLastVisit,
  ]);

  const serumTotal = yeppeumCount > 0 ? selectedSerumTier.price * yeppeumCount : 0;
  const serumBonus = yeppeumCount > 0 ? selectedSerumTier.cvBonus * yeppeumCount : 0;
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

  const subtotal = effectiveServiceChargeToday + newComboTotal + underComboTotal + serumTotal;

  const handleCollapseNewComboSection = () => {
    setShowNewComboSection(false);
    setSelectedNewComboId('NONE');
    setSelectedUnderComboId('NONE');
  };

  const handleConfirmCheckout = () => {
    onGoToBilling(
      buildUpsellCheckoutPayload({
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
            <button
              type="button"
              onClick={() => setShowStaffRewards((prev) => !prev)}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                showStaffRewards
                  ? 'text-amber-400 bg-amber-950/60 border border-amber-500/40'
                  : isDark
                    ? 'text-neutral-500 hover:text-neutral-300'
                    : 'text-neutral-400 hover:text-neutral-600'
              }`}
              title={showStaffRewards ? 'Đang hiện thưởng CV (Nhấn để ẩn toàn bộ)' : 'Đang ẩn thưởng CV (Nhấn để xem)'}
            >
              {showStaffRewards ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
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
          onDecrementYeppeum={() => setYeppeumCount((c) => Math.max(0, c - 1))}
          onIncrementYeppeum={() => setYeppeumCount((c) => c + 1)}
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

      {/* Interactive 13-Category Combo Consultation & Comparison Modal */}
      <ComboCatalogConsultModal
        open={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        initialCategoryId={activeCategoryId}
        initialVolume={activeVolume}
        welcomeEligibility={welcomeEligibility}
        selectedPackageId={selectedNewComboPkg?.id || null}
        todaySingleServicePrice={effectiveUpperSinglePrice}
        existingUpperExpirySnapshot={existingUpperExpirySnapshot}
        existingUnderExpirySnapshot={existingUnderExpirySnapshot}
        upperTodayUsageMode={upperTodayUsageMode}
        underTodayUsageMode={underTodayUsageMode}
        todayServiceType={todayServiceType}
        underServiceType={underServiceType}
        initialSelectedUpperPkg={selectedNewComboPkg}
        initialSelectedUnderPkg={selectedUnderComboPkg}
        onSelectPackage={(pkg) => {
          setActiveCategoryAndVolume(pkg.categoryId, pkg.volume);
          setSelectedNewComboId(pkg.id);
        }}
        onApplyPackages={({ upperPkg, underPkg }) => {
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
      />

      <UpsellModals
        isDark={isDark}
        booking={booking}
        customerName={customerName}
        isSerumInfoModalOpen={isSerumInfoModalOpen}
        onCloseSerumInfoModal={() => setIsSerumInfoModalOpen(false)}
        selectedSerumTierId={selectedSerumTierId}
        yeppeumCount={yeppeumCount}
        onSelectSerumTier={(tierId) => {
          setSelectedSerumTierId(tierId);
          if (yeppeumCount === 0) setYeppeumCount(1);
          setIsSerumInfoModalOpen(false);
        }}
        isLockedWelcomeModalOpen={isLockedWelcomeModalOpen}
        onCloseLockedWelcomeModal={() => setIsLockedWelcomeModalOpen(false)}
      />

      <ComboWalletDetailModal
        booking={booking || null}
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        isAdmin={isAdmin}
        theme={isDark ? 'dark' : 'light'}
        onUpdated={onRefreshDb}
      />
    </div>
  );
}
