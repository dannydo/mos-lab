'use client';

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
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
} from '@mos-lab/shared';
import { ComboCatalogConsultModal } from './ComboCatalogConsultModal';
import { parseDaysSinceLastVisit } from './LashMaterialConstraintMatrix';
import { calculateCvComboTierBonus } from '../../state/useIosBillingCheckout';
import { UpsellHeaderAndSerumSection } from './upsell/UpsellHeaderAndSerumSection';
import { UpsellMainComboSelector } from './upsell/UpsellMainComboSelector';
import { UpsellUnderComboAndSummary } from './upsell/UpsellUnderComboAndSummary';
import { UpsellModals } from './upsell/UpsellModals';
import { buildUpsellCheckoutPayload } from './upsell/upsellCheckoutHelpers';

interface Screen11ProductUpsellProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  onBack: () => void;
  onGoToBilling: (payload?: {
    cartProducts?: Array<{ productId: number; productName: string; price: number; quantity: number; cvBonus?: number }>;
    selectedCombo?: NonNullable<BookingItem['selectedCombo']> | null;
    selectedUnderCombo?: NonNullable<BookingItem['selectedUnderCombo']> | null;
    comboRedemption?: NonNullable<BookingItem['comboRedemption']> | null;
  }) => void;
}

export function Screen11ProductUpsell({ booking, actor, onBack, onGoToBilling }: Screen11ProductUpsellProps) {
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

  const [activeCategoryId, setActiveCategoryId] = useState<WingsComboCategoryId>(autoMatched.categoryId);
  const [activeVolume, setActiveVolume] = useState<number | 'under'>(autoMatched.volume);

  const familyInfo = useMemo(() => getLashFamilyInfo(activeCategoryId), [activeCategoryId]);
  const isUpTierPackage = activeCategoryId !== autoMatched.categoryId;

  const handleSelectFamilyCategory = (targetCatId: WingsComboCategoryId) => {
    setActiveCategoryId(targetCatId);
    const validVol = resolveValidVolumeForCategory(targetCatId, activeVolume);
    setActiveVolume(validVol);
  };

  // Sync khi đổi booking
  React.useEffect(() => {
    setActiveCategoryId(autoMatched.categoryId);
    setActiveVolume(autoMatched.volume);
  }, [booking?.id, autoMatched.categoryId, autoMatched.volume]);

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

  // Nếu khách có combo và còn > 2 lần: mặc định ẨN (collapsed) phần mua thêm combo
  // CVL có nút tự đóng/mở chủ động bất kỳ lúc nào
  const shouldCollapseNewComboByDefault = isExistingComboLive && remainingSessions > 2;
  const [showNewComboSection, setShowNewComboSection] = useState<boolean>(!shouldCollapseNewComboByDefault);

  React.useEffect(() => {
    setShowNewComboSection(!shouldCollapseNewComboByDefault);
  }, [shouldCollapseNewComboByDefault]);

  // Mặc định cho gói combo mới:
  // - Nếu booking đã có selectedCombo hợp lệ từ trước -> giữ nguyên
  // - Mặc định an toàn: 'NONE' (Chỉ làm lẻ ca hôm nay, không ép mua gói ngoài ý muốn)
  const existingSelectedComboId = booking?.selectedCombo?.id;
  const defaultNewComboSelection = useMemo(() => {
    if (existingSelectedComboId) {
      const exists = matchedPackages.find((p) => p.id === existingSelectedComboId && !p.isLocked);
      if (exists) return exists.id;
    }
    return 'NONE';
  }, [existingSelectedComboId, matchedPackages]);

  const [selectedNewComboId, setSelectedNewComboId] = useState<string>(defaultNewComboSelection);
  const [deductTodayIntoCombo, setDeductTodayIntoCombo] = useState<boolean>(true);
  const [showStaffRewards, setShowStaffRewards] = useState<boolean>(false);

  // Sync khi đổi booking hoặc khi category/volume thay đổi nhưng cố gắng giữ nguyên tier tương ứng
  const prevBookingIdRef = React.useRef(booking?.id);
  React.useEffect(() => {
    if (prevBookingIdRef.current !== booking?.id) {
      prevBookingIdRef.current = booking?.id;
      setSelectedNewComboId(defaultNewComboSelection);
      return;
    }

    // Khi đổi dòng mi / độ dày, cố gắng giữ đúng ruleName tương ứng nếu người dùng đã chủ động chọn gói
    setSelectedNewComboId((currentId) => {
      if (!currentId || currentId === 'NONE') return isExistingComboLive ? 'NONE' : defaultNewComboSelection;
      const exact = matchedPackages.find((p) => p.id === currentId && !p.isLocked);
      if (exact) return exact.id;

      // Tìm gói có cùng ruleName trong danh sách mới
      const prevRule = currentId.replace(/^[^_]+_/, '');
      const ruleMatch = matchedPackages.find(
        (p) => !p.isLocked && (p.id.endsWith(prevRule) || p.ruleName === prevRule)
      );
      if (ruleMatch) return ruleMatch.id;

      return defaultNewComboSelection;
    });
  }, [booking?.id, defaultNewComboSelection, isExistingComboLive, matchedPackages]);

  const currentCategory = useMemo(() => getWingsComboCategory(activeCategoryId), [activeCategoryId]);
  const selectedSerumTier = SERUM_TIERS_CVL.find((t) => t.id === selectedSerumTierId) || SERUM_TIERS_CVL[0];
  const selectedNewComboPkg: MatchedComboPackageOption | null = useMemo(
    () => matchedPackages.find((c) => c.id === selectedNewComboId && !c.isLocked) || null,
    [matchedPackages, selectedNewComboId]
  );

  const servicePrice = booking?.servicePrice || 770000;
  const serviceName = booking?.serviceName || 'New Flawless Mink 770';
  const customerName = (booking?.customerName || 'Chị Trúc').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  const customerPhone = booking?.customerPhone || '';
  const customerVisits = booking?.customerVisits ?? 1;
  const isNewClient = customerVisits <= 1;
  const assignedStaffName = booking?.assignedStaffName || actor?.name || 'Phương Nhi';
  const assignedStaffTier = booking?.assignedStaffTier || actor?.tier || 'CVL';
  const actorName = actor?.name || 'Thảo Ly';

  // 4. Tính hạch toán khi MUA GÓI MỚI (Trừ luôn buổi đầu vào gói nếu khách chưa có combo)
  const purchaseAccounting = useMemo(
    () => (selectedNewComboPkg ? calculateComboPurchaseAccounting(selectedNewComboPkg, servicePrice) : null),
    [selectedNewComboPkg, servicePrice]
  );

  // 4B. Danh sách gói Combo Mi Dưới (Tùy chọn mua kèm cùng lúc với Combo Mi Trên)
  const underLashPackages = useMemo(() => getUnderLashComboPackages(welcomeEligibility), [welcomeEligibility]);
  const [selectedUnderComboId, setSelectedUnderComboId] = useState<string>(booking?.selectedUnderCombo?.id || 'NONE');
  const selectedUnderComboPkg: MatchedComboPackageOption | null = useMemo(
    () => underLashPackages.find((p) => p.id === selectedUnderComboId && !p.isLocked) || null,
    [underLashPackages, selectedUnderComboId]
  );
  const underPurchaseAccounting = useMemo(
    () => (selectedUnderComboPkg ? calculateComboPurchaseAccounting(selectedUnderComboPkg, 390000) : null),
    [selectedUnderComboPkg]
  );

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

  const effectiveServiceChargeToday =
    isExistingComboLive && redemptionAccounting
      ? redemptionAccounting.totalCustomerPayToday
      : selectedNewComboPkg
        ? deductTodayIntoCombo
          ? 0
          : servicePrice
        : servicePrice;

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
        selectedNewComboPkg,
        deductTodayIntoCombo,
        purchaseAccounting,
        newComboBonus,
        isUpTierPackage,
        autoMatchedCategoryId: autoMatched.categoryId,
        servicePrice,
        redemptionAccounting,
        selectedUnderComboPkg,
        underPurchaseAccounting,
        underComboBonus,
      })
    );
  };

  return (
    <div
      className={`flex-1 flex flex-col ${isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-neutral-900'} overflow-y-auto select-none`}
    >
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
          onSelectVolume={(vol) => setActiveVolume(vol)}
          onOpenConsultModal={() => setIsConsultModalOpen(true)}
          servicePrice={servicePrice}
          matchedPackages={matchedPackages}
          selectedNewComboId={selectedNewComboId}
          onSetSelectedNewComboId={setSelectedNewComboId}
          selectedNewComboPkg={selectedNewComboPkg}
          purchaseAccounting={purchaseAccounting}
          deductTodayIntoCombo={deductTodayIntoCombo}
          onSetDeductTodayIntoCombo={setDeductTodayIntoCombo}
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
          servicePrice={servicePrice}
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
        todaySingleServicePrice={servicePrice}
        initialSelectedUpperPkg={selectedNewComboPkg}
        initialSelectedUnderPkg={selectedUnderComboPkg}
        onSelectPackage={(pkg) => {
          setActiveCategoryId(pkg.categoryId);
          setActiveVolume(pkg.volume);
          setSelectedNewComboId(pkg.id);
        }}
        onApplyPackages={({ upperPkg, underPkg }) => {
          if (upperPkg) {
            setActiveCategoryId(upperPkg.categoryId);
            setActiveVolume(upperPkg.volume);
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
    </div>
  );
}
