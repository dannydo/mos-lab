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
    comboRedemption?: NonNullable<BookingItem['comboRedemption']> | null;
  }) => void;
}

export function Screen11ProductUpsell({ booking, actor, onBack, onGoToBilling }: Screen11ProductUpsellProps) {
  const [selectedSerumTierId, setSelectedSerumTierId] = useState<string>(SERUM_TIERS_CVL[0].id);
  const [yeppeumCount, setYeppeumCount] = useState<number>(1);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState<boolean>(false);

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

  const subtotal = effectiveServiceChargeToday + comboTotal + serumTotal;

  const handleConfirmCheckout = () => {
    const cartProducts =
      yeppeumCount > 0
        ? [
            {
              productId: 36,
              productName: `Cây dưỡng mi Yeppeum 6ml (${selectedSerumTier.label})`,
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

    onGoToBilling({ cartProducts, selectedCombo, comboRedemption });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Bán Dưỡng Mi & Chốt Check-out"
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
        {/* Rule Banner: Ai Checkout người đó được nhận */}
        <div className="bg-[#1C1C1E] text-white rounded-2xl p-3.5 shadow-sm space-y-1.5 border border-[#FFB400]/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#FFB400] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              QUY TẮC: AI CHECKOUT NGƯỜI ĐÓ ĐƯỢC NHẬN
            </span>
            <span className="bg-[#FFB400] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
              {actorTierBadge} {actorName}
            </span>
          </div>
          <div className="text-[11px] text-neutral-300 leading-snug">
            Khi bấm chốt Check-out bên dưới, hệ thống ghi nhận{' '}
            <strong className="text-white">check_out_staff_id = {actorName}</strong>: nhận{' '}
            <strong className="text-[#FFB400]">
              +{(comboBonus + serumBonus).toLocaleString('vi-VN')}đ Thưởng Tiền Tươi
            </strong>{' '}
            (Combo bậc thang + Dưỡng mi)!
          </div>
        </div>

        {/* Section 1: CÂY DƯỠNG MI YEPPEUM 6ML (4 BẬC THƯỞNG CV🪶 THEO ĐIỀU RĂN CV-002) */}
        <div>
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span>1. DƯỠNG MI YEPPEUM 6ML (THANG THƯỞNG CV🪶)</span>
            <span className="text-emerald-700 font-bold">+{serumBonus.toLocaleString('vi-VN')}đ thưởng</span>
          </div>

          <div className="bg-white border-2 border-[#FFB400] rounded-2xl p-3 shadow-sm space-y-2.5">
            <div className="flex gap-3">
              <div className="w-16 h-20 rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-2 shrink-0">
                <span className="text-[#FFB400] font-black text-[10px] tracking-wider text-center">YEPPEUM</span>
                <span className="text-white text-[10px] font-semibold mt-0.5">6ml</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[14px] font-bold text-black leading-snug">Cây dưỡng mi Yeppeum 6ml</span>
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

            {/* 4 Tier Buttons */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {SERUM_TIERS_CVL.map((t) => {
                const active = selectedSerumTierId === t.id && yeppeumCount > 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedSerumTierId(t.id);
                      if (yeppeumCount === 0) setYeppeumCount(1);
                    }}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      active ? 'bg-amber-50 border-[#FF9500] shadow-xs' : 'bg-[#F9F9FB] border-gray-200'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-black truncate">{t.label}</div>
                    <div className="text-[10px] font-extrabold text-emerald-700 mt-0.5 tabular-nums">
                      Thưởng +{t.cvBonus.toLocaleString('vi-VN')}đ/cây
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: GÓI COMBO CHỐT TẠI GIƯỜNG — KHỚP ĐÚNG DÒNG MI & SỐ SỢI CỦA CA LÀM */}
        <div>
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span>2. GÓI COMBO ĐÚNG DÒNG MI & HẠCH TOÁN VÍ</span>
            <span className="text-emerald-700 font-bold">+{comboBonus.toLocaleString('vi-VN')}đ thưởng</span>
          </div>

          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-200 space-y-2.5">
            {/* Smart-Matched Header & Open Full 13-Category Consult Modal Button */}
            <div className="bg-[#1C1C1E] text-white rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#FFB400] uppercase tracking-wider flex items-center gap-1">
                  {isUpTierPackage ? (
                    <>
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Đang chọn mua gói nâng cấp</span>
                    </>
                  ) : (
                    <span>🎯 Đã khớp tự động theo dịch vụ hôm nay</span>
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
                <span>Bảng 13 Dòng Mi</span>
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
                        <span className="text-[12px] font-black tracking-tight">{sib.shortLabel}</span>
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

            {/* Up-Tier Upsell Privilege Banner */}
            {isUpTierPackage && (
              <div className="rounded-xl p-2.5 bg-linear-to-r from-amber-500/10 via-purple-500/10 to-emerald-500/10 border-2 border-amber-400 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-950">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>ĐẶC QUYỀN NÂNG CẤP GÓI COMBO</span>
                  </div>
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    Miễn thu lẻ {servicePrice.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="text-[10.5px] text-neutral-800 leading-snug">
                  Hôm nay khách làm <strong>{getWingsComboCategory(autoMatched.categoryId).name}</strong> nhưng chốt mua
                  gói <strong>{currentCategory.name}</strong>. Buổi làm hôm nay được{' '}
                  <strong>trừ thẳng làm Buổi Nối Mới #1</strong> của gói mới (0đ thu lẻ ca này). Toàn bộ các buổi còn
                  lại trong ví đều theo chuẩn cao cấp của <strong>{currentCategory.name}</strong>!
                </div>
              </div>
            )}

            {/* Quick Volume Pills for Current Category */}
            {currentCategory.unitPrices.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {currentCategory.unitPrices.map((u) => {
                  const volKey: number | 'under' = u.isUnderLash ? 'under' : Number(u.volume);
                  const active = activeVolume === volKey;
                  return (
                    <button
                      key={String(u.volume)}
                      type="button"
                      onClick={() => setActiveVolume(volKey)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 border transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-100 text-amber-950 border-[#FF9500]'
                          : 'bg-[#F2F2F7] text-gray-600 border-transparent'
                      }`}
                    >
                      {u.isUnderLash
                        ? 'Mi Dưới 390'
                        : `Mã ${u.volume} (${getVolumeFiberMeta(currentCategory.id, volKey).countPerEye} ${getVolumeFiberMeta(currentCategory.id, volKey).unitWord}/mắt)`}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Welcome Package First-Day Eligibility Notice */}
            <div
              className={`rounded-xl px-2.5 py-1.5 border text-[10px] font-semibold flex items-center gap-1.5 ${
                welcomeEligibility.eligible
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {welcomeEligibility.eligible ? (
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
              <span>{welcomeEligibility.reason}</span>
            </div>

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
                    selected={active}
                    compact
                    onSelect={() => {
                      if (!pkg.isLocked) setSelectedComboId(pkg.id);
                    }}
                  />
                );
              })}
            </div>

            {/* Live Accounting & Immediate First-Session Deduction Card when a New Combo is selected */}
            {selectedComboPkg && purchaseAccounting && (
              <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-2.5 space-y-1 text-[11px]">
                <div className="flex items-center justify-between font-extrabold text-indigo-950">
                  <span className="flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-indigo-700" />
                    Hạch Toán Tự Động & Trừ Luôn Buổi Đầu Vào Gói:
                  </span>
                  <span className="text-emerald-700">Miễn thu lẻ {servicePrice.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="text-[10px] text-indigo-900 space-y-0.5 tabular-nums">
                  <div>
                    • <strong>Trừ ngay buổi hôm nay (Lượt 1):</strong> Ghi nhận doanh thu thực hiện{' '}
                    <strong>{purchaseAccounting.recognizedRevenueToday.toLocaleString('vi-VN')}đ</strong>
                  </div>
                  <div>
                    • <strong>Số dư ví gói còn lại sau hôm nay:</strong>{' '}
                    <strong>
                      {purchaseAccounting.remainingWalletAfterToday.totalRemaining}/{selectedComboPkg.totalSessions} lần
                    </strong>{' '}
                    ({purchaseAccounting.remainingWalletAfterToday.paidNew} New mua +{' '}
                    {purchaseAccounting.remainingWalletAfterToday.paidRefill} Refill mua ·{' '}
                    {purchaseAccounting.remainingWalletAfterToday.bonusNew +
                      purchaseAccounting.remainingWalletAfterToday.bonusRefill}{' '}
                    lượt tặng 0đ)
                  </div>
                  <div>
                    • <strong>Doanh thu chờ phân bổ (Deferred Revenue):</strong>{' '}
                    <strong>{purchaseAccounting.deferredRevenueBalance.toLocaleString('vi-VN')}đ</strong>
                  </div>
                </div>
              </div>
            )}

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
              +{(comboBonus + serumBonus).toLocaleString('vi-VN')} đ
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
    </div>
  );
}
