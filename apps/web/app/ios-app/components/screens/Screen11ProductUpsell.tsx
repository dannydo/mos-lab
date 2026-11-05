'use client';

import React, { useState, useMemo } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem, SERUM_TIERS_CVL } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Calculator,
  BookOpen,
  Wallet,
  Gift,
  ArrowUpRight,
  Info,
  X,
  Eye,
} from 'lucide-react';
import {
  WingsComboCategoryId,
  MatchedComboPackageOption,
  getWingsComboCategory,
  getVolumeFiberMeta,
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
import { WingsComboCard } from '../ui-kit/WingsComboCard';
import { parseDaysSinceLastVisit } from './LashMaterialConstraintMatrix';

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

  // Mặc định:
  // - Nếu khách đã chọn gói từ bước trước -> giữ nguyên
  // - Nếu khách đang có gói Combo Live còn lượt -> mặc định 'REDEEM_EXISTING' (trừ gói đang có), nhưng vẫn hiển thị danh sách gói để mua thêm/renew nếu muốn
  // - Nếu khách chưa có gói -> chọn gói mở khóa đầu tiên (Gói 2 tặng 1 nếu ngày đầu, hoặc Gói 4 tặng 1 nếu từ lần 2)
  const existingSelectedComboId = booking?.selectedCombo?.id;
  const defaultComboSelection = useMemo(() => {
    if (existingSelectedComboId) {
      const exists = matchedPackages.find((p) => p.id === existingSelectedComboId && !p.isLocked);
      if (exists) return exists.id;
    }
    if (isExistingComboLive) {
      return 'REDEEM_EXISTING';
    }
    const firstUnlocked =
      matchedPackages.find((p) => !p.isLocked && p.ruleName === '4 tặng 1') || matchedPackages.find((p) => !p.isLocked);
    return firstUnlocked ? firstUnlocked.id : 'NONE';
  }, [existingSelectedComboId, isExistingComboLive, matchedPackages]);

  const [selectedComboId, setSelectedComboId] = useState<string>(defaultComboSelection);

  React.useEffect(() => {
    setSelectedComboId(defaultComboSelection);
  }, [defaultComboSelection]);

  const currentCategory = useMemo(() => getWingsComboCategory(activeCategoryId), [activeCategoryId]);
  const selectedSerumTier = SERUM_TIERS_CVL.find((t) => t.id === selectedSerumTierId) || SERUM_TIERS_CVL[0];
  const selectedComboPkg: MatchedComboPackageOption | null = useMemo(
    () => matchedPackages.find((c) => c.id === selectedComboId && !c.isLocked) || null,
    [matchedPackages, selectedComboId]
  );

  const servicePrice = booking?.servicePrice || 770000;
  const serviceName = booking?.serviceName || 'New Flawless Mink 770';
  const customerName = booking?.customerName || 'Chị Trúc';
  const actorName = actor?.name || 'Thảo Ly';
  const actorTierBadge = actor?.tier === 'CVLL' ? <CvFeather2Badge /> : actor?.tier === 'CVL' ? 'CV🪶' : 'CC';

  // 4. Tính hạch toán khi MUA GÓI MỚI (Trừ luôn buổi đầu vào gói, không thu lẻ buổi hôm nay)
  const purchaseAccounting = useMemo(
    () => (selectedComboPkg ? calculateComboPurchaseAccounting(selectedComboPkg, servicePrice) : null),
    [selectedComboPkg, servicePrice]
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
  const underComboTotal = selectedUnderComboPkg ? selectedUnderComboPkg.comboPrice : 0;
  const underComboBonus = selectedUnderComboPkg ? selectedUnderComboPkg.cvBonus : 0;

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
  const comboTotal = selectedComboPkg ? selectedComboPkg.comboPrice : 0;
  const comboBonus = selectedComboPkg ? selectedComboPkg.cvBonus : 0;

  // Khi MUA GÓI MỚI: buổi hôm nay được trừ luôn vào buổi 1 của gói mới -> todayServiceCharge = 0
  // Khi TRỪ GÓI ĐANG CÓ: buổi hôm nay trừ vào ví gói -> todayServiceCharge = redemptionAccounting.totalCustomerPayToday (0đ hoặc phụ thu chênh lệch)
  // Khi THANH TOÁN LẺ ('NONE'): khách trả servicePrice
  const effectiveServiceChargeToday = selectedComboPkg
    ? 0
    : selectedComboId === 'REDEEM_EXISTING' && redemptionAccounting
      ? redemptionAccounting.totalCustomerPayToday
      : servicePrice;

  const subtotal = effectiveServiceChargeToday + comboTotal + underComboTotal + serumTotal;

  const handleConfirmCheckout = () => {
    const cartProducts =
      yeppeumCount > 0
        ? [
            {
              productId: 36,
              productName: `Cây dưỡng mi Yeppeum Korea (${selectedSerumTier.label})`,
              price: selectedSerumTier.price,
              quantity: yeppeumCount,
              cvBonus: selectedSerumTier.cvBonus,
            },
          ]
        : [];

    const selectedCombo: NonNullable<BookingItem['selectedCombo']> | null =
      selectedComboPkg && purchaseAccounting
        ? {
            id: selectedComboPkg.id,
            name: selectedComboPkg.displayName,
            price: selectedComboPkg.comboPrice,
            bonus: selectedComboPkg.cvBonus,
            sessions: selectedComboPkg.totalSessions,
            ruleName: selectedComboPkg.ruleName,
            categoryId: selectedComboPkg.categoryId,
            categoryName: selectedComboPkg.categoryName,
            volume: selectedComboPkg.volume,
            paidNewCount: selectedComboPkg.comboNewCount,
            paidRefillCount: selectedComboPkg.comboRefillCount,
            bonusNewCount: selectedComboPkg.bonusNewCount,
            bonusRefillCount: selectedComboPkg.bonusRefillCount,
            validityMonths: selectedComboPkg.validityMonths,
            retailTotal: selectedComboPkg.retailTotal,
            savingsAmount: selectedComboPkg.savingsAmount,
            avgPerSessionPrice: selectedComboPkg.avgPerSessionPrice,
            todaySingleServiceWaived: true,
            isUpTierUpgrade: isUpTierPackage,
            originalServiceCategory: autoMatched.categoryId,
            recognizedRevenueToday: purchaseAccounting.recognizedRevenueToday,
            deferredRevenueBalance: purchaseAccounting.deferredRevenueBalance,
            remainingAfterToday: purchaseAccounting.remainingWalletAfterToday,
          }
        : null;

    const comboRedemption: NonNullable<BookingItem['comboRedemption']> | null =
      !selectedComboPkg && selectedComboId === 'REDEEM_EXISTING' && redemptionAccounting
        ? {
            comboName: redemptionAccounting.comboName,
            deductedBucket: redemptionAccounting.deductedBucket,
            typeConversionSurcharge: redemptionAccounting.typeConversionSurcharge,
            upgradeVolumeSurcharge: redemptionAccounting.upgradeVolumeSurcharge,
            totalCustomerPayToday: redemptionAccounting.totalCustomerPayToday,
            recognizedRevenueToday: redemptionAccounting.recognizedRevenueToday,
            remainingAfterToday: redemptionAccounting.walletAfter.totalRemaining,
            explanation: redemptionAccounting.explanation,
          }
        : null;

    const selectedUnderCombo: NonNullable<BookingItem['selectedUnderCombo']> | null =
      selectedUnderComboPkg && underPurchaseAccounting
        ? {
            id: selectedUnderComboPkg.id,
            name: selectedUnderComboPkg.displayName,
            price: selectedUnderComboPkg.comboPrice,
            bonus: selectedUnderComboPkg.cvBonus,
            sessions: selectedUnderComboPkg.totalSessions,
            ruleName: selectedUnderComboPkg.ruleName,
            validityMonths: selectedUnderComboPkg.validityMonths,
            retailTotal: selectedUnderComboPkg.retailTotal,
            savingsAmount: selectedUnderComboPkg.savingsAmount,
            avgPerSessionPrice: selectedUnderComboPkg.avgPerSessionPrice,
            todaySingleServiceWaived: true,
            recognizedRevenueToday: underPurchaseAccounting.recognizedRevenueToday,
            deferredRevenueBalance: underPurchaseAccounting.deferredRevenueBalance,
            remainingAfterToday: underPurchaseAccounting.remainingWalletAfterToday,
          }
        : null;

    onGoToBilling({ cartProducts, selectedCombo, selectedUnderCombo, comboRedemption });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Dưỡng Mi & Combo"
        onBack={onBack}
        backTitle="Ảnh After"
        rightAction={
          <button
            onClick={handleConfirmCheckout}
            className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60"
          >
            Checkout
          </button>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* Section 1: CÂY DƯỠNG MI YEPPEUM KOREA (THANG THƯỞNG CV🪶) */}
        <div>
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span>1. DƯỠNG MI YEPPEUM KOREA</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px] tabular-nums">
              {yeppeumCount > 0
                ? `+${Math.round(serumBonus / 1000)}🪶`
                : `+${Math.round(selectedSerumTier.cvBonus / 1000)}🪶/cây`}
            </span>
          </div>

          <div className="bg-white border-2 border-[#FFB400] rounded-2xl p-3 shadow-sm space-y-2.5">
            <div className="flex gap-3">
              <div className="w-16 h-18 rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-2 shrink-0">
                <span className="text-[#FFB400] font-black text-[10px] tracking-wider text-center leading-tight">
                  YEPPEUM
                </span>
                <span className="text-white text-[9.5px] font-bold mt-0.5 tracking-wider">KOREA</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[14px] font-bold text-black leading-snug">Cây dưỡng mi Yeppeum Korea</span>
                  <div className="bg-[#F2F2F7] rounded-lg px-2 py-0.5 flex items-center gap-2 text-[12px] font-bold text-gray-800 shrink-0">
                    <button
                      onClick={() => setYeppeumCount((c) => Math.max(0, c - 1))}
                      className="px-1 text-gray-500 active:scale-90"
                    >
                      -
                    </button>
                    <span className="tabular-nums">{yeppeumCount}</span>
                    <button
                      onClick={() => setYeppeumCount((c) => c + 1)}
                      className="px-1 text-gray-500 active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-gray-600 mt-1 leading-tight">
                  Phục hồi nang mi thật, khóa gốc keo bền hơn 2 tuần cho {customerName}.
                </div>
              </div>
            </div>

            {/* Compact Tier Selector Bar & (i) Info Button (Full Width) */}
            <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSerumInfoModalOpen(true)}
                className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/90 hover:bg-amber-100/80 transition-all text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-black text-amber-950 truncate">
                    {selectedSerumTier.price > 0
                      ? `${selectedSerumTier.price.toLocaleString('vi-VN')}đ`
                      : 'Tặng kèm (Trị giá 1.100.000đ)'}
                  </span>
                  <span className="text-[10.5px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200 truncate">
                    {selectedSerumTier.label.split('(')[0].trim()}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <span className="text-[11px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 tabular-nums">
                    +{Math.round(selectedSerumTier.cvBonus / 1000)}🪶
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsSerumInfoModalOpen(true)}
                className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 flex items-center justify-center font-bold shrink-0 shadow-xs active:scale-90 transition-transform cursor-pointer border border-amber-300"
                title="Xem chi tiết thang thưởng"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: GÓI COMBO CHỐT TẠI GIƯỜNG — KHỚP ĐÚNG DÒNG MI & SỐ SỢI CỦA CA LÀM */}
        <div>
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span>2. GÓI COMBO ĐÚNG DÒNG MI & HẠCH TOÁN VÍ</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px] tabular-nums">
              +{Math.round(comboBonus / 1000)}🪶
            </span>
          </div>

          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-200 space-y-2.5">
            {/* Smart-Matched Header & Open Full 13-Category Consult Modal Button */}
            <div className="bg-[#1C1C1E] text-white rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#FFB400] uppercase tracking-wider flex items-center gap-1">
                  {isUpTierPackage ? (
                    <>
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Nâng cấp gói</span>
                    </>
                  ) : (
                    <span>🎯 Dịch vụ hôm nay</span>
                  )}
                </div>
                <div className="text-[13px] font-black text-white truncate">
                  {currentCategory.name} · {activeVolume === 'under' ? 'Mi Dưới 390' : `Mã ${activeVolume}`} (
                  {getVolumeFiberMeta(activeCategoryId, activeVolume).fanLabel})
                </div>
                {isUpTierPackage && (
                  <div className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">
                    Gốc làm hôm nay: {getWingsComboCategory(autoMatched.categoryId).name} · Mã {autoMatched.volume}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsConsultModalOpen(true)}
                className="shrink-0 px-2.5 py-1.5 rounded-xl bg-[#FFB400] text-black text-[11px] font-extrabold flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Combo Menu</span>
              </button>
            </div>

            {/* Family Level Quick Switcher (2X, 3X, 4X, 5X | 3ℓ, 4ℓ, 5ℓ | 3D, 4D, 5D) */}
            {familyInfo.siblings.length > 1 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-extrabold text-neutral-600 uppercase px-0.5">
                  <span>Cấp độ {familyInfo.familyName}:</span>
                  {isUpTierPackage && (
                    <span className="text-amber-700 font-extrabold flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3 text-amber-500" /> Nâng cấp gói
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {familyInfo.siblings.map((sib) => {
                    const active = activeCategoryId === sib.categoryId;
                    const isTodayDone = autoMatched.categoryId === sib.categoryId;
                    return (
                      <button
                        key={sib.categoryId}
                        type="button"
                        onClick={() => handleSelectFamilyCategory(sib.categoryId)}
                        className={`py-1.5 px-2 rounded-xl text-center border transition-all cursor-pointer relative flex flex-col items-center justify-center ${
                          active
                            ? 'bg-[#1C1C1E] text-[#FFB400] border-[#FFB400] shadow-xs'
                            : 'bg-[#F2F2F7] text-neutral-700 border-transparent hover:bg-neutral-200/80'
                        }`}
                      >
                        <span className="text-[13.5px] font-black tracking-tight">{sib.shortLabel}</span>
                        <span className="text-[9px] font-semibold opacity-90 truncate max-w-full">
                          {sib.fiberDensityLabel}
                        </span>
                        {isTodayDone ? (
                          <span
                            className={`text-[8px] font-black px-1 rounded-sm mt-0.5 ${
                              active ? 'bg-[#FFB400] text-black' : 'bg-neutral-300 text-neutral-800'
                            }`}
                          >
                            Đang làm
                          </span>
                        ) : (
                          active && (
                            <span className="text-[8px] font-black px-1 rounded-sm mt-0.5 bg-emerald-500 text-white">
                              Nâng cấp
                            </span>
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Up-Tier Upsell Privilege Banner — Minimalist Bedside Pitch */}
            {isUpTierPackage && (
              <div className="rounded-xl px-2.5 py-2 bg-amber-50/90 border border-amber-300 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#FFB400] text-black flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4 text-black" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-black text-amber-950 flex items-center gap-1.5 flex-wrap leading-tight">
                      <span>Nâng cấp gói: {currentCategory.name}</span>
                    </div>
                    <div className="text-[10.5px] text-neutral-600 leading-tight mt-0.5">
                      Trừ thẳng vào Buổi Nối Mới #1 · 0đ thu lẻ hôm nay
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full tabular-nums shadow-xs whitespace-nowrap">
                    Tiết kiệm {servicePrice.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            )}

            {/* Quick Volume Pills for Current Category — Density Only & No Scrollbar */}
            {currentCategory.unitPrices.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-7 h-7 rounded-lg bg-[#F2F2F7] text-neutral-600 flex items-center justify-center shrink-0"
                  title="Số trụ/sợi mi trên mắt"
                >
                  <Eye className="w-4 h-4 text-neutral-700" />
                </div>
                <div
                  className="flex-1 flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {currentCategory.unitPrices.map((u) => {
                    const volKey: number | 'under' = u.isUnderLash ? 'under' : Number(u.volume);
                    const active = activeVolume === volKey;
                    const meta = getVolumeFiberMeta(currentCategory.id, volKey);
                    const label = u.isUnderLash ? 'Mi Dưới' : `${meta.countPerEye} ${meta.unitWord}`;
                    return (
                      <button
                        key={String(u.volume)}
                        type="button"
                        onClick={() => setActiveVolume(volKey)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black shrink-0 border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1C1C1E] text-[#FFB400] border-[#FFB400] shadow-xs'
                            : 'bg-[#F2F2F7] text-neutral-700 border-transparent hover:bg-neutral-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing Combo Redemption Option (if customer has an active combo) */}
            {isExistingComboLive && redemptionAccounting && (
              <div
                onClick={() => setSelectedComboId('REDEEM_EXISTING')}
                className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all space-y-1.5 ${
                  selectedComboId === 'REDEEM_EXISTING'
                    ? 'bg-sky-50/90 border-sky-500 shadow-xs'
                    : 'bg-[#F9F9FB] border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-sky-700" />
                      <span className="text-[12px] font-extrabold text-sky-950">
                        Trừ 1 lượt từ Gói đang có: {booking?.comboLiveStatus?.comboName}
                      </span>
                    </div>
                    <div className="text-[10px] text-sky-800 font-medium mt-0.5">
                      {redemptionAccounting.explanation}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[12px] font-black text-sky-900 tabular-nums block">
                      {redemptionAccounting.totalCustomerPayToday > 0
                        ? `+${redemptionAccounting.totalCustomerPayToday.toLocaleString('vi-VN')} đ`
                        : '0 đ (Trừ gói)'}
                    </span>
                    <span className="text-[9px] font-bold text-sky-700">
                      Còn {redemptionAccounting.walletAfter.totalRemaining} lượt sau ca
                    </span>
                  </div>
                </div>

                {/* Toggle to test/handle case where wallet only has Refill left while customer does New */}
                <div className="pt-1 border-t border-sky-200/70 flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-gray-600">
                    Trạng thái ví gói:{' '}
                    {simulateOnlyRefillLeft
                      ? 'Chỉ còn lượt Refill (Tự động bù chênh lệch New)'
                      : `Còn ${redemptionAccounting.walletBefore.paidNew + redemptionAccounting.walletBefore.bonusNew} New · ${redemptionAccounting.walletBefore.paidRefill + redemptionAccounting.walletBefore.bonusRefill} Refill`}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSimulateOnlyRefillLeft((v) => !v);
                      setSelectedComboId('REDEEM_EXISTING');
                    }}
                    className="px-2 py-0.5 rounded-md bg-white border border-sky-300 text-sky-800 font-bold hover:bg-sky-100 cursor-pointer"
                  >
                    {simulateOnlyRefillLeft ? 'Đặt lại ví còn New' : 'Giả lập ví chỉ còn Refill'}
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Matched Combo Packages List — Luxury Wings Membership Cards */}
            <div className="space-y-2.5">
              {matchedPackages.map((pkg) => {
                const active = selectedComboId === pkg.id;
                return (
                  <WingsComboCard
                    key={pkg.id}
                    pkg={pkg}
                    customerName={customerName}
                    customerPhone={booking?.customerPhone}
                    customerAvatar={booking?.customerAvatar}
                    selected={active}
                    compact
                    onSelect={() => {
                      setSelectedComboId(pkg.id);
                    }}
                    onSelectLocked={() => {
                      setIsLockedWelcomeModalOpen(true);
                    }}
                  />
                );
              })}
            </div>

            {/* Live Deduction & Wallet Status Card when a New Combo is selected */}
            {selectedComboPkg &&
              purchaseAccounting &&
              (() => {
                const bonusRemainingRetailValue =
                  purchaseAccounting.remainingWalletAfterToday.bonusNew * (selectedComboPkg.newUnitPrice || 0) +
                  purchaseAccounting.remainingWalletAfterToday.bonusRefill * (selectedComboPkg.refillUnitPrice || 0);

                return (
                  <div className="rounded-2xl p-3 bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] border border-[#CBD5E1] shadow-sm space-y-2.5">
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 flex-shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-black text-slate-800 uppercase tracking-wide leading-tight">
                            Đặc quyền trừ buổi hôm nay vào gói
                          </div>
                          <div className="text-[9.5px] text-slate-500 font-medium leading-tight">
                            Gói {selectedComboPkg.shortRuleLabel || selectedComboPkg.ruleName} · Buổi hôm nay tính làm
                            Lượt 1
                          </div>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 text-[10.5px] font-black tabular-nums shadow-xs flex-shrink-0">
                        <span>Miễn thu lẻ</span>
                        <span className="font-extrabold">{servicePrice.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>

                    {/* 2-Column Split Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Box 1: Buổi hôm nay */}
                      <div className="bg-white/95 rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2">
                        <div>
                          <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Buổi hôm nay (Lượt 1)</span>
                          </div>
                          <div className="mt-1 text-[12.5px] font-black text-slate-900 leading-tight">
                            Trừ vào 1 Buổi Nối Mới
                          </div>
                          <div className="text-[9.5px] text-slate-500 mt-0.5 leading-snug">
                            Không tính tiền lẻ ca này, trừ thẳng vào lượt đầu của gói mới mua.
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Thu lẻ ca này:</span>
                          <span className="font-black text-emerald-600 text-[11px] tabular-nums">0đ</span>
                        </div>
                      </div>

                      {/* Box 2: Ví còn lại */}
                      <div className="bg-white/95 rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2">
                        <div>
                          <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-indigo-600" />
                            <span>Ví còn lại sau ca này</span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-1 text-slate-900 leading-tight">
                            <span className="text-[15px] font-black tabular-nums text-indigo-700">
                              {purchaseAccounting.remainingWalletAfterToday.totalRemaining}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              /{selectedComboPkg.totalSessions} buổi
                            </span>
                          </div>
                          <div className="text-[9.5px] text-slate-600 mt-0.5 leading-snug space-y-0.5">
                            <div>
                              • <strong>{purchaseAccounting.remainingWalletAfterToday.totalPaidRemaining}</strong> buổi
                              mua (
                              {purchaseAccounting.remainingWalletAfterToday.paidNew > 0
                                ? `${purchaseAccounting.remainingWalletAfterToday.paidNew} New + `
                                : ''}
                              {purchaseAccounting.remainingWalletAfterToday.paidRefill} Refill)
                            </div>
                            {purchaseAccounting.remainingWalletAfterToday.totalBonusRemaining > 0 && (
                              <div className="text-emerald-700 font-bold">
                                • <strong>{purchaseAccounting.remainingWalletAfterToday.totalBonusRemaining}</strong>{' '}
                                buổi tặng{' '}
                                <span className="text-[9px] font-extrabold text-emerald-800">
                                  (Trị giá {bonusRemainingRetailValue.toLocaleString('vi-VN')}đ)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Hạn sử dụng:</span>
                          <span className="font-black text-slate-700 tabular-nums">
                            {selectedComboPkg.validityMonths ? `${selectedComboPkg.validityMonths} tháng` : '36 tháng'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Value / Savings Footer Strip */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 rounded-xl px-2.5 py-1.5 border border-amber-500/20 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <span>
                          Giá lẻ:{' '}
                          <strong className="line-through text-slate-400 tabular-nums">
                            {selectedComboPkg.retailTotal.toLocaleString('vi-VN')}đ
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Giá gói:{' '}
                          <strong className="text-slate-900 tabular-nums">
                            {selectedComboPkg.comboPrice.toLocaleString('vi-VN')}đ
                          </strong>
                        </span>
                      </div>
                      <div className="font-black text-emerald-700 tabular-nums">
                        Tiết kiệm {selectedComboPkg.savingsAmount.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>
                );
              })()}

            <button
              onClick={() => setSelectedComboId('NONE')}
              className={`w-full py-2 rounded-xl text-[11px] font-bold transition-colors ${
                selectedComboId === 'NONE' ? 'bg-gray-800 text-white' : 'bg-[#F2F2F7] text-gray-600'
              }`}
            >
              {selectedComboId === 'NONE' ? '✓ ' : ''}Không mua gói mới · Thanh toán lẻ buổi hôm nay (
              {servicePrice.toLocaleString('vi-VN')}đ)
            </button>
          </div>
        </div>

        {/* Section 2B: MUA THÊM GÓI COMBO MI DƯỚI (MUA CÙNG LÚC VỚI MI TRÊN) */}
        <div>
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB400]" />
              <span>2B. MUA THÊM COMBO MI DƯỚI (MUA CÙNG LÚC)</span>
            </span>
            {underComboBonus > 0 && (
              <span className="text-emerald-700 font-bold">+{Math.round(underComboBonus / 1000)}🪶</span>
            )}
          </div>

          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-black text-black">Gói Combo Mi Dưới 390 (Tùy chọn mua kèm)</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Khách có thể mua đồng thời 1 Combo Mi Trên + 1 Combo Mi Dưới trong cùng 1 hóa đơn!
                </div>
              </div>
              {selectedUnderComboPkg && (
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                  Đã chọn gói mi dưới
                </span>
              )}
            </div>

            {/* Quick Pills for 4 Under Lash Rules */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedUnderComboId('NONE')}
                className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedUnderComboId === 'NONE'
                    ? 'bg-neutral-800 text-white border-neutral-800 font-bold shadow-xs'
                    : 'bg-[#F9F9FB] border-gray-200 text-gray-700'
                }`}
              >
                <div className="text-[11px] font-bold">Không lấy Combo Mi Dưới</div>
                <div className="text-[9px] opacity-80 mt-0.5">Chỉ lấy Mi Trên hoặc thanh toán lẻ</div>
              </button>

              {underLashPackages.map((pkg) => {
                const active = selectedUnderComboId === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    disabled={pkg.isLocked}
                    onClick={() => setSelectedUnderComboId(pkg.id)}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      pkg.isLocked
                        ? 'opacity-40 bg-gray-100 border-gray-200 cursor-not-allowed'
                        : active
                          ? 'bg-linear-to-r from-amber-50 to-emerald-50 border-amber-500 shadow-xs'
                          : 'bg-[#F9F9FB] border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-black">{pkg.ruleName} · Mi Dưới</span>
                      <span className="text-[10px] font-extrabold text-amber-700 tabular-nums">
                        {pkg.comboPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[9px]">
                      <span className="text-gray-500">
                        {pkg.totalSessions} lần (TB ~{pkg.avgPerSessionPrice.toLocaleString('vi-VN')}đ)
                      </span>
                      <span className="font-extrabold text-emerald-700">+{Math.round(pkg.cvBonus / 1000)}🪶</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Under Lash Combo Details Card */}
            {selectedUnderComboPkg && underPurchaseAccounting && (
              <div className="rounded-xl p-2.5 bg-[#1C1C1E] text-white border border-[#FFB400]/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-[#FFB400]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FFB400]" />
                    <span>{selectedUnderComboPkg.displayName}</span>
                  </div>
                  <span className="text-emerald-400 font-extrabold text-[11px] tabular-nums">
                    +{Math.round(selectedUnderComboPkg.cvBonus / 1000)}🪶
                  </span>
                </div>
                <div className="text-[10px] text-gray-300 leading-snug">
                  • <strong>Giá combo:</strong> {selectedUnderComboPkg.comboPrice.toLocaleString('vi-VN')}đ (Giá lẻ{' '}
                  {selectedUnderComboPkg.retailTotal.toLocaleString('vi-VN')}đ · Tiết kiệm{' '}
                  {selectedUnderComboPkg.savingsAmount.toLocaleString('vi-VN')}đ)
                  <br />• <strong>Quyền lợi ví:</strong> {selectedUnderComboPkg.totalSessions} lần làm mi dưới trong{' '}
                  {selectedUnderComboPkg.validityMonths} tháng
                  <br />• <strong>Hạch toán:</strong> Buổi mi dưới hôm nay (nếu có làm) được trừ luôn vào gói (0đ thu
                  lẻ). Số dư còn lại trong ví: {underPurchaseAccounting.remainingWalletAfterToday.totalRemaining} lần.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Summary card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-gray-500">Dịch vụ hôm nay ({serviceName}):</span>
            {selectedComboPkg ? (
              <span className="text-emerald-700 font-bold tabular-nums">
                0 đ{' '}
                <span className="text-[10px] font-semibold">
                  {isUpTierPackage
                    ? `(Nâng cấp: Trừ vào buổi 1 của Gói ${selectedComboPkg.categoryName})`
                    : '(Trừ vào buổi 1 của gói mới)'}
                </span>
              </span>
            ) : selectedComboId === 'REDEEM_EXISTING' && redemptionAccounting ? (
              <span className="text-sky-700 font-bold tabular-nums">
                {redemptionAccounting.totalCustomerPayToday > 0
                  ? `+${redemptionAccounting.totalCustomerPayToday.toLocaleString('vi-VN')} đ (Phụ thu gói)`
                  : '0 đ (Trừ 1 lượt gói đang có)'}
              </span>
            ) : (
              <span className="text-gray-800 font-semibold tabular-nums">{servicePrice.toLocaleString('vi-VN')} đ</span>
            )}
          </div>
          {selectedComboPkg && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-gray-700 font-semibold">{selectedComboPkg.displayName}:</span>
              <span className="text-gray-900 font-bold tabular-nums">{comboTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          {selectedUnderComboPkg && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-gray-700 font-semibold">{selectedUnderComboPkg.displayName}:</span>
              <span className="text-gray-900 font-bold tabular-nums">{underComboTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          {yeppeumCount > 0 && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-gray-500">Dưỡng mi Yeppeum (x{yeppeumCount}):</span>
              <span className="text-gray-800 font-semibold tabular-nums">{serumTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[14px] font-bold text-black">Tổng tạm tính hóa đơn (Chưa VAT):</span>
            <span className="text-[17px] font-black text-[#FF9500] tabular-nums">
              {subtotal.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="pt-1 flex items-center justify-between text-[12px] bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
            <span className="text-emerald-800 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Thưởng chốt đơn của {actorName} ({actorTierBadge}):
            </span>
            <span className="text-emerald-700 font-black tabular-nums">
              +{Math.round((comboBonus + underComboBonus + serumBonus) / 1000)}🪶
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={handleConfirmCheckout}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[15px] shadow-md active:scale-98 transition-transform text-center"
          >
            CHỐT ĐƠN & SANG BƯỚC THANH TOÁN ({actorName})
          </button>
        </div>
      </div>

      {/* Interactive 13-Category Combo Consultation & Comparison Modal */}
      <ComboCatalogConsultModal
        open={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        initialCategoryId={activeCategoryId}
        initialVolume={activeVolume}
        welcomeEligibility={welcomeEligibility}
        selectedPackageId={selectedComboPkg?.id || null}
        todaySingleServicePrice={servicePrice}
        onSelectPackage={(pkg) => {
          setActiveCategoryId(pkg.categoryId);
          setActiveVolume(pkg.volume);
          setSelectedComboId(pkg.id);
        }}
      />

      {/* Yeppeum Serum Commission & Tier Info Modal */}
      {isSerumInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150">
          <div className="fixed inset-0 bg-black/65 backdrop-blur-xs" onClick={() => setIsSerumInfoModalOpen(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto z-10 border border-neutral-200">
            {/* Header: Title on Left, Close [✕] on Right */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-[15px]">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3>Thang Thưởng Dưỡng Mi Yeppeum Korea</h3>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Quy tắc Điều răn CV-002 · Bán đúng giá niêm yết hoặc chọn mức ưu đãi áp dụng
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSerumInfoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of 4 Tiers */}
            <div className="space-y-2.5">
              {SERUM_TIERS_CVL.map((t) => {
                const isSelected = selectedSerumTierId === t.id && yeppeumCount > 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedSerumTierId(t.id);
                      if (yeppeumCount === 0) setYeppeumCount(1);
                      setIsSerumInfoModalOpen(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50/90 border-2 border-[#FF9500] shadow-xs'
                        : 'bg-[#F9F9FB] border-gray-200 hover:bg-gray-100/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-black text-gray-900">{t.label}</span>
                        {isSelected && (
                          <span className="bg-[#FF9500] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                            Đang chọn
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-1 leading-snug">
                        {t.id === 'serum-orig' && 'Bán đúng giá niêm yết khi khách mua lẻ tại giường.'}
                        {t.id === 'serum-disc-light' && 'Áp dụng giảm dưới 50% theo chương trình ưu đãi nhẹ.'}
                        {t.id === 'serum-disc-deep' && 'Áp dụng Flash sale, xả hàng hoặc ưu đãi sâu ≥ 50%.'}
                        {t.id === 'serum-free' &&
                          'Tặng kèm miễn phí (Trị giá 1.100.000đ) khi khách chốt gói Combo lớn.'}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-0.5 text-[12px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg tabular-nums">
                        +{Math.round(t.cvBonus / 1000)}🪶/cây
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <span className="text-[10.5px] font-semibold text-gray-400">Chọn</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer summary */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsSerumInfoModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-800 text-[13px] font-bold hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Locked Welcome Package Explanation Modal */}
      {isLockedWelcomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-xs"
            onClick={() => setIsLockedWelcomeModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-amber-200 space-y-4 z-10 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-[16px] font-black text-neutral-900">Đặc Quyền Gói Welcome (2 Tặng 1)</h3>
                <p className="text-[11.5px] font-bold text-amber-700 mt-0.5">
                  🔒 Chỉ áp dụng trong ngày đầu tiên ghé salon
                </p>
              </div>
            </div>

            <div className="bg-amber-50/80 rounded-2xl p-3.5 border border-amber-200/80 space-y-2 text-[12px] text-neutral-700 leading-relaxed">
              <p>
                Gói <strong>Welcome (2 tặng 1)</strong> là chính sách chào mừng đặc biệt chỉ dành riêng cho khách hàng
                trải nghiệm dịch vụ trong <strong>ngày đầu tiên</strong> tại Wings.
              </p>
              <p className="text-neutral-600">
                Chị <strong>{customerName}</strong> hiện tại đã qua ngày đầu tiên (Lần ghé thứ{' '}
                <strong>{booking?.customerVisits ?? 2}</strong>), nên gói này đã tự động đóng để đảm bảo đúng quy chế
                salon.
              </p>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200 text-[11.5px] text-emerald-900 leading-snug">
              <span className="font-extrabold text-emerald-800 block mb-0.5">💡 Gợi ý tư vấn cho CV🪶:</span>
              Hướng dẫn chị chốt gói <strong>4 tặng 1</strong> (+22%) hoặc <strong>7 tặng 3</strong> (tiết kiệm đến 41%)
              để nhận trọn vẹn đặc quyền và số buổi tối đa nhé!
            </div>

            <button
              type="button"
              onClick={() => setIsLockedWelcomeModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-[#1C1C1E] text-[#FFB400] text-[13.5px] font-extrabold active:scale-98 transition-transform cursor-pointer shadow-md"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
