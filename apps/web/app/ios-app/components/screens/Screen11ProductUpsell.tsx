'use client';

import React, { useState, useMemo } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem, SERUM_TIERS_CVL } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { CvFeather2Badge, CvFeather1Badge, FeatherSvg } from '../ui-kit/CvFeatherLabels';
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
  ShoppingCart,
  ChevronDown,
  ChevronUp,
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
import { WingsUnifiedComboCard } from '../ui-kit/WingsUnifiedComboCard';
import { ComboSessionBadge } from '../ui-kit/ComboSessionBadge';
import { parseDaysSinceLastVisit, formatComboName } from './LashMaterialConstraintMatrix';

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
  const remainingSessions = booking?.comboLiveStatus?.remainingSessions ?? 0;

  // Nếu khách có combo và còn > 2 lần: mặc định ẨN (collapsed) phần mua thêm combo
  // CVL có nút tự đóng/mở chủ động bất kỳ lúc nào
  const shouldCollapseNewComboByDefault = isExistingComboLive && remainingSessions > 2;
  const [showNewComboSection, setShowNewComboSection] = useState<boolean>(!shouldCollapseNewComboByDefault);

  React.useEffect(() => {
    setShowNewComboSection(!shouldCollapseNewComboByDefault);
  }, [shouldCollapseNewComboByDefault]);

  // Mặc định cho gói combo mới:
  // - Nếu khách đã có gói combo đang active -> 'NONE' (mặc định chỉ trừ gói cũ cho ca này, không mua thêm)
  // - Nếu khách chưa có gói combo -> chọn gói mở khóa đầu tiên (Gói 2 tặng 1 nếu ngày 1, hoặc 4 tặng 1 nếu lần 2+)
  const existingSelectedComboId = booking?.selectedCombo?.id;
  const defaultNewComboSelection = useMemo(() => {
    if (existingSelectedComboId) {
      const exists = matchedPackages.find((p) => p.id === existingSelectedComboId && !p.isLocked);
      if (exists) return exists.id;
    }
    if (isExistingComboLive) {
      return 'NONE';
    }
    const firstUnlocked =
      matchedPackages.find((p) => !p.isLocked && p.ruleName === '4 tặng 1') || matchedPackages.find((p) => !p.isLocked);
    return firstUnlocked ? firstUnlocked.id : 'NONE';
  }, [existingSelectedComboId, isExistingComboLive, matchedPackages]);

  const [selectedNewComboId, setSelectedNewComboId] = useState<string>(defaultNewComboSelection);
  const [deductTodayIntoCombo, setDeductTodayIntoCombo] = useState<boolean>(true);

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
  const actorTierBadge =
    actor?.tier === 'CVLL' ? <CvFeather2Badge /> : actor?.tier === 'CVL' ? <CvFeather1Badge /> : 'CC';

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
  const newComboTotal = selectedNewComboPkg ? selectedNewComboPkg.comboPrice : 0;
  const newComboBonus = selectedNewComboPkg ? selectedNewComboPkg.cvBonus : 0;

  // Tính tiền dịch vụ hôm nay:
  // - Nếu khách có combo đang chạy: ca hôm nay trừ vào gói combo cũ (0đ hoặc phụ thu nâng cấp/up-size)
  // - Nếu khách KHÔNG có combo cũ và mua combo mới:
  //     + deductTodayIntoCombo = true -> 0đ (buổi 1 trừ vào gói mới)
  //     + deductTodayIntoCombo = false -> trả giá lẻ ca này
  // - Nếu khách KHÔNG có combo cũ và KHÔNG mua combo mới -> trả giá lẻ ca này
  const effectiveServiceChargeToday =
    isExistingComboLive && redemptionAccounting
      ? redemptionAccounting.totalCustomerPayToday
      : selectedNewComboPkg
        ? deductTodayIntoCombo
          ? 0
          : servicePrice
        : servicePrice;

  const subtotal = effectiveServiceChargeToday + newComboTotal + underComboTotal + serumTotal;

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

    const remainingWallet = isExistingComboLive
      ? selectedNewComboPkg
        ? {
            // Mua thêm combo khi đang có combo: Gói mới giữ nguyên 100% số buổi!
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
            bonus: selectedNewComboPkg.cvBonus,
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
            originalServiceCategory: autoMatched.categoryId,
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
            // === Breakdown ví gói chi tiết ===
            totalSessions:
              redemptionAccounting.walletBefore.paidNew +
              redemptionAccounting.walletBefore.paidRefill +
              redemptionAccounting.walletBefore.bonusNew +
              redemptionAccounting.walletBefore.bonusRefill +
              1, // +1 vì chưa trừ buổi hôm nay
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
        {/* 0. Customer & Lash Service Identity Card (Nhận diện khách hàng & Ca phục vụ) */}
        <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-neutral-200/80 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[15px] font-black text-neutral-900 tracking-tight truncate">{customerName}</span>
                {customerPhone && (
                  <span className="text-[11.5px] font-bold text-neutral-500 tabular-nums">· {customerPhone}</span>
                )}
              </div>
              <div className="text-[11.5px] text-neutral-500 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                <span>
                  Dịch vụ: <strong className="text-neutral-900 font-bold">{serviceName}</strong>
                </span>
                <span>·</span>
                <span>
                  CV: <strong className="text-neutral-800 font-bold">{assignedStaffName}</strong>
                </span>
                {assignedStaffTier === 'CVLL' ? <CvFeather2Badge /> : <CvFeather1Badge />}
              </div>
            </div>
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full font-black shrink-0 tracking-tight leading-none inline-flex items-center justify-center ${
                isNewClient
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isNewClient ? 'KHÁCH MỚI' : `LẦN ${customerVisits}`}
            </span>
          </div>
        </div>

        {/* Section 1A: CA HÔM NAY · TRỪ VÀO GÓI COMBO ĐANG CÓ (Chỉ hiện khi khách có combo đang chạy) */}
        {isExistingComboLive && redemptionAccounting && (
          <div>
            <div className="text-[11px] font-extrabold text-sky-900 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-sky-700" />
                1. CA HÔM NAY · TRỪ GÓI ❖ ĐANG CÓ
              </span>
            </div>

            <div className="bg-gradient-to-br from-sky-50/90 to-sky-100/60 rounded-2xl p-3 border border-sky-300 shadow-xs space-y-2">
              <div>
                <div className="text-[14px] font-black text-sky-950 leading-snug">
                  {formatComboName(booking?.comboLiveStatus?.comboName, booking?.comboLiveStatus?.packageKey) ||
                    '❖ Gói Đang Active'}
                </div>
                <div className="text-[12px] text-sky-800 font-semibold mt-0.5 leading-snug">
                  {booking?.serviceType === 'Retain' ||
                  redemptionAccounting.deductedBucket === 'PAID_REFILL' ||
                  redemptionAccounting.deductedBucket === 'BONUS_REFILL'
                    ? 'Trừ 1 lượt dặm'
                    : 'Trừ 1 lượt nối mới'}
                  {redemptionAccounting.totalCustomerPayToday > 0 && (
                    <span className="text-amber-800 font-black ml-1.5">
                      (+{redemptionAccounting.totalCustomerPayToday.toLocaleString('vi-VN')}đ phụ thu)
                    </span>
                  )}
                </div>
              </div>

              {/* Chi tiết số dư ví trước và sau ca */}
              <div className="p-2.5 bg-white rounded-xl border border-sky-200/80 flex items-center justify-between gap-2 text-[11.5px]">
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <span className="font-semibold text-neutral-500">Trước ca:</span>
                  <ComboSessionBadge
                    normalRemaining={
                      redemptionAccounting.walletBefore.paidNew + redemptionAccounting.walletBefore.bonusNew
                    }
                    retainRemaining={
                      redemptionAccounting.walletBefore.paidRefill + redemptionAccounting.walletBefore.bonusRefill
                    }
                    remainingSessions={
                      redemptionAccounting.walletBefore.paidNew +
                      redemptionAccounting.walletBefore.bonusNew +
                      redemptionAccounting.walletBefore.paidRefill +
                      redemptionAccounting.walletBefore.bonusRefill
                    }
                    variant="inline"
                    theme="light"
                  />
                </div>
                <div className="text-neutral-400 font-bold">➔</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sky-900">Sau ca:</span>
                  <ComboSessionBadge
                    normalRemaining={
                      redemptionAccounting.walletAfter.paidNew + redemptionAccounting.walletAfter.bonusNew
                    }
                    retainRemaining={
                      redemptionAccounting.walletAfter.paidRefill + redemptionAccounting.walletAfter.bonusRefill
                    }
                    remainingSessions={
                      redemptionAccounting.walletAfter.paidNew +
                      redemptionAccounting.walletAfter.bonusNew +
                      redemptionAccounting.walletAfter.paidRefill +
                      redemptionAccounting.walletAfter.bonusRefill
                    }
                    size="sm"
                    theme="light"
                  />
                </div>
              </div>

              {/* Nút giả lập test */}
              <div className="pt-1 flex items-center justify-between text-[10px] text-sky-800/80">
                <span>Trạng thái: Đang ưu tiên trừ gói cũ</span>
                <button
                  type="button"
                  onClick={() => setSimulateOnlyRefillLeft((v) => !v)}
                  className="px-2 py-0.5 rounded-md bg-white border border-sky-300 text-sky-900 font-bold hover:bg-sky-50 active:scale-95 cursor-pointer"
                >
                  {simulateOnlyRefillLeft ? 'Đặt lại: Còn suất Nối' : 'Giả lập: Chỉ còn suất Dặm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: CÂY DƯỠNG MI YEPPEUM KOREA (THANG THƯỞNG CV) */}
        <div>
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span>{isExistingComboLive ? '3. DƯỠNG MI YEPPEUM KOREA' : '2. DƯỠNG MI YEPPEUM KOREA'}</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px] tabular-nums">
              {yeppeumCount > 0 ? (
                <span className="inline-flex items-center gap-0.5">
                  +{Math.round(serumBonus / 1000)}
                  <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5">
                  +{Math.round(selectedSerumTier.cvBonus / 1000)}
                  <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                  /cây
                </span>
              )}
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
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 tabular-nums">
                    +{Math.round(selectedSerumTier.cvBonus / 1000)}
                    <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
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

        {/* Section 2: GÓI COMBO MUA THÊM (GỐI ĐẦU / RENEW) HOẶC COMBO CHÍNH */}
        <div>
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span>
              {isExistingComboLive ? '2. MUA THÊM GÓI ❖ (GỐI ĐẦU / RENEW)' : '1. GÓI ❖ ĐÚNG DÒNG MI & HẠCH TOÁN VÍ'}
            </span>
            <div className="flex items-center gap-1.5">
              {showNewComboSection && newComboBonus > 0 && (
                <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px] tabular-nums">
                  +{Math.round(newComboBonus / 1000)}
                  <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                </span>
              )}
              {isExistingComboLive && showNewComboSection && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewComboSection(false);
                    setSelectedNewComboId('NONE');
                    setSelectedUnderComboId('NONE');
                  }}
                  className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700"
                >
                  <span>Thu gọn</span>
                  <ChevronUp className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Khi khách có gói còn > 2 lần và đang ẩn, hiển thị Bar thu gọn (chỉ 1 nút duy nhất) */}
          {isExistingComboLive && !showNewComboSection ? (
            <div
              onClick={() => setShowNewComboSection(true)}
              className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-200/80 hover:border-amber-300 flex items-center justify-between gap-3 cursor-pointer active:scale-99 transition-all select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 font-black text-sm">
                  ❖
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold text-neutral-900 truncate">
                    Khách còn {remainingSessions} lượt gói ❖ · Đang trừ ví ca này
                  </div>
                  <div className="text-[10.5px] text-neutral-500 truncate">
                    Mặc định ẩn · Bấm nếu khách muốn mua gối đầu / renew sớm
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>+ Mua thêm</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
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
                      <>
                        <Sparkles className="w-3 h-3 text-[#FFB400]" />
                        <span>Dịch vụ hôm nay</span>
                      </>
                    )}
                  </div>
                  <div className="text-[13px] font-black text-white leading-snug">
                    {currentCategory.name} {activeVolume === 'under' ? 'Mi Dưới 390' : activeVolume}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold leading-none ${
                        booking?.serviceType === 'Retain'
                          ? 'bg-purple-500/25 text-purple-300 border border-purple-400/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      }`}
                    >
                      {booking?.serviceType === 'Retain' ? 'Dặm' : 'Nối Mới'}
                    </span>
                    <span className="text-neutral-300 text-[10px] font-semibold tabular-nums">
                      {getVolumeFiberMeta(activeCategoryId, activeVolume).countPerEye} sợi
                    </span>
                    {(booking?.attributes?.curl || booking?.attributes?.thickness || booking?.attributes?.length) && (
                      <span className="text-neutral-400 text-[10px] font-medium">
                        {[booking?.attributes?.curl, booking?.attributes?.thickness, booking?.attributes?.length]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
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
                  <span>❖ Menu</span>
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
              {currentCategory.unitPrices.filter((u) => !u.isUnderLash).length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                  <div
                    className="w-7 h-7 rounded-lg bg-[#F2F2F7] text-neutral-600 flex items-center justify-center shrink-0"
                    title="Số trụ/sợi mi trên mắt"
                  >
                    <Eye className="w-3.5 h-3.5 text-neutral-700" />
                  </div>
                  <div
                    className="flex-1 flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {currentCategory.unitPrices
                      .filter((u) => !u.isUnderLash)
                      .map((u) => {
                        const volKey = Number(u.volume);
                        const active = activeVolume === volKey;
                        const meta = getVolumeFiberMeta(currentCategory.id, volKey);
                        const label = `${meta.countPerEye} ${meta.unitWord}`;
                        const compactPrice = `${Math.round(u.newPrice / 1000)}K`;
                        return (
                          <button
                            key={String(u.volume)}
                            type="button"
                            onClick={() => setActiveVolume(volKey)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black shrink-0 border transition-all cursor-pointer flex items-center gap-1.5 ${
                              active
                                ? 'bg-[#1C1C1E] text-[#FFB400] border-[#FFB400] shadow-xs'
                                : 'bg-[#F2F2F7] text-neutral-700 border-transparent hover:bg-neutral-200'
                            }`}
                          >
                            <span>{label}</span>
                            <span
                              className={`text-[9.5px] font-bold tabular-nums ${active ? 'text-amber-200' : 'text-neutral-500'}`}
                            >
                              {compactPrice}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Thanh trạng thái chọn mua thêm gói đối với khách đã có combo */}
              {isExistingComboLive && (
                <div className="px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 text-[12px] bg-neutral-50/90 border-neutral-200">
                  {selectedNewComboPkg ? (
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-emerald-800 font-black text-[12px] flex items-center gap-1 truncate">
                          <span>✓ {selectedNewComboPkg.displayName}</span>
                        </div>
                        <div className="text-[10.5px] text-neutral-500 tabular-nums inline-flex items-center gap-1">
                          <span>+{selectedNewComboPkg.totalSessions} buổi ví</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold">
                            +{Math.round(selectedNewComboPkg.cvBonus / 1000)}
                            <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedNewComboId('NONE')}
                        className="shrink-0 px-2 py-0.5 rounded-lg bg-white border border-rose-200 text-rose-600 font-bold text-[10.5px] hover:bg-rose-50 active:scale-95 cursor-pointer shadow-2xs"
                      >
                        ✕ Bỏ chọn
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 text-neutral-500 text-[11px] flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>Chọn một gói bên dưới nếu khách muốn mua thêm</span>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Matched Combo Packages List — 1 Unified Card với Tier Selector */}
              <WingsUnifiedComboCard
                packages={matchedPackages}
                customerName={customerName}
                customerPhone={booking?.customerPhone}
                customerAvatar={booking?.customerAvatar}
                selectedPackageId={selectedNewComboId === 'NONE' ? null : selectedNewComboId}
                onSelectPackage={(pkg) => {
                  setSelectedNewComboId((prev) => (prev === pkg.id ? 'NONE' : pkg.id));
                }}
                onSelectLocked={() => {
                  setIsLockedWelcomeModalOpen(true);
                }}
              />

              {/* Live Deduction & Wallet Status Card when a New Combo is selected */}
              {selectedNewComboPkg &&
                (isExistingComboLive ? (
                  <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2 text-[12px]">
                    <div className="flex items-center justify-between font-extrabold text-amber-950">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Hạch toán Gói ❖ Mua Thêm:
                      </span>
                      <span className="tabular-nums text-[13.5px] font-black text-amber-900">
                        {selectedNewComboPkg.comboPrice.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200 text-[11px] text-gray-700 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-600">Buổi làm hôm nay:</span>
                        <strong className="text-emerald-700 font-bold">✓ Đã trừ vào Gói cũ (0đ)</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-600">Số buổi Gói mới cộng vào ví:</span>
                        <span className="font-extrabold text-indigo-900 tabular-nums">
                          ✦ {selectedNewComboPkg.comboNewCount + selectedNewComboPkg.bonusNewCount} · ↻{' '}
                          {selectedNewComboPkg.comboRefillCount + selectedNewComboPkg.bonusRefillCount} (Đủ{' '}
                          {selectedNewComboPkg.totalSessions} buổi)
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                        <span className="text-neutral-600">Thưởng chốt cho {actorName}:</span>
                        <strong className="text-emerald-700 font-black tabular-nums inline-flex items-center gap-0.5">
                          +{Math.round(selectedNewComboPkg.cvBonus / 1000)}
                          <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : purchaseAccounting ? (
                  (() => {
                    const bonusRemainingRetailValue = deductTodayIntoCombo
                      ? purchaseAccounting.remainingWalletAfterToday.bonusNew *
                          (selectedNewComboPkg.newUnitPrice || 0) +
                        purchaseAccounting.remainingWalletAfterToday.bonusRefill *
                          (selectedNewComboPkg.refillUnitPrice || 0)
                      : selectedNewComboPkg.bonusNewCount * (selectedNewComboPkg.newUnitPrice || 0) +
                        selectedNewComboPkg.bonusRefillCount * (selectedNewComboPkg.refillUnitPrice || 0);

                    const walletRemainingDisplay = deductTodayIntoCombo
                      ? purchaseAccounting.remainingWalletAfterToday.totalRemaining
                      : selectedNewComboPkg.totalSessions;
                    const paidRemainingDisplay = deductTodayIntoCombo
                      ? purchaseAccounting.remainingWalletAfterToday.totalPaidRemaining
                      : selectedNewComboPkg.comboNewCount + selectedNewComboPkg.comboRefillCount;
                    const paidNewDisplay = deductTodayIntoCombo
                      ? purchaseAccounting.remainingWalletAfterToday.paidNew
                      : selectedNewComboPkg.comboNewCount;
                    const paidRefillDisplay = deductTodayIntoCombo
                      ? purchaseAccounting.remainingWalletAfterToday.paidRefill
                      : selectedNewComboPkg.comboRefillCount;
                    const bonusRemainingDisplay = deductTodayIntoCombo
                      ? purchaseAccounting.remainingWalletAfterToday.totalBonusRemaining
                      : selectedNewComboPkg.bonusNewCount + selectedNewComboPkg.bonusRefillCount;

                    return (
                      <div className="rounded-2xl p-3 bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] border border-[#CBD5E1] shadow-sm space-y-2.5">
                        {/* Segmented Switch: Trừ vào gói vs Trả lẻ ca này */}
                        <div className="bg-slate-200/90 p-1 rounded-xl grid grid-cols-2 gap-1 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setDeductTodayIntoCombo(true)}
                            className={`py-2 px-2.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                              deductTodayIntoCombo
                                ? 'bg-white text-emerald-800 shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900 font-semibold'
                            }`}
                          >
                            {deductTodayIntoCombo && <span>✓</span>}
                            <span>Trừ vào gói</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeductTodayIntoCombo(false)}
                            className={`py-2 px-2.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                              !deductTodayIntoCombo
                                ? 'bg-white text-indigo-900 shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900 font-semibold'
                            }`}
                          >
                            {!deductTodayIntoCombo && <span>✓</span>}
                            <span>Trả lẻ ca này</span>
                          </button>
                        </div>

                        {/* Card Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                deductTodayIntoCombo
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600'
                                  : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-600'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-black text-slate-800 uppercase tracking-wide leading-tight">
                                {deductTodayIntoCombo
                                  ? 'Đặc quyền trừ buổi hôm nay vào gói'
                                  : 'Thanh toán lẻ riêng & Giữ nguyên gói'}
                              </div>
                              <div className="text-[9.5px] text-slate-500 font-medium leading-tight">
                                {deductTodayIntoCombo
                                  ? `Gói ${selectedNewComboPkg.shortRuleLabel || selectedNewComboPkg.ruleName} · Buổi hôm nay tính làm Lượt 1`
                                  : `Gói ${selectedNewComboPkg.shortRuleLabel || selectedNewComboPkg.ruleName} · Giữ nguyên ${selectedNewComboPkg.totalSessions} buổi cho lần sau`}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black tabular-nums shadow-xs flex-shrink-0 ${
                              deductTodayIntoCombo
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700'
                                : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-700'
                            }`}
                          >
                            <span>{deductTodayIntoCombo ? 'Miễn thu lẻ' : 'Thu lẻ riêng'}</span>
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
                                <span>{deductTodayIntoCombo ? 'Buổi hôm nay (Lượt 1)' : 'Buổi hôm nay (Ca lẻ)'}</span>
                              </div>
                              <div className="mt-1 text-[12.5px] font-black text-slate-900 leading-tight">
                                {deductTodayIntoCombo ? 'Trừ vào 1 Buổi Nối Mới' : 'Thanh toán lẻ riêng ca này'}
                              </div>
                              <div className="text-[9.5px] text-slate-500 mt-0.5 leading-snug">
                                {deductTodayIntoCombo
                                  ? 'Không tính tiền lẻ ca này, trừ thẳng vào lượt đầu của gói mới mua.'
                                  : 'Khách trả riêng tiền dịch vụ hôm nay, không trừ vào bất kỳ buổi nào của gói.'}
                              </div>
                            </div>
                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 font-medium">Thu lẻ ca này:</span>
                              <span
                                className={`font-black text-[11px] tabular-nums ${
                                  deductTodayIntoCombo ? 'text-emerald-600' : 'text-slate-900'
                                }`}
                              >
                                {deductTodayIntoCombo ? '0đ' : `${servicePrice.toLocaleString('vi-VN')}đ`}
                              </span>
                            </div>
                          </div>

                          {/* Box 2: Ví còn lại */}
                          <div className="bg-white/95 rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2">
                            <div>
                              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <Wallet className="w-3 h-3 text-indigo-600" />
                                <span>
                                  {deductTodayIntoCombo ? 'Ví còn lại sau ca này' : 'Ví nguyên vẹn cho lần sau'}
                                </span>
                              </div>
                              <div className="mt-1 flex items-baseline gap-1 text-slate-900 leading-tight">
                                <span className="text-[15px] font-black tabular-nums text-indigo-700">
                                  {walletRemainingDisplay}
                                </span>
                                <span className="text-[11px] font-bold text-slate-500">
                                  /{selectedNewComboPkg.totalSessions} buổi
                                </span>
                              </div>
                              <div className="text-[9.5px] text-slate-600 mt-0.5 leading-snug space-y-0.5">
                                <div>
                                  • <strong>{paidRemainingDisplay}</strong> buổi mua (
                                  {paidNewDisplay > 0 ? `${paidNewDisplay} New + ` : ''}
                                  {paidRefillDisplay} Refill)
                                </div>
                                {bonusRemainingDisplay > 0 && (
                                  <div className="text-emerald-700 font-bold">
                                    • <strong>{bonusRemainingDisplay}</strong> buổi tặng{' '}
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
                                {selectedNewComboPkg.validityMonths
                                  ? `${selectedNewComboPkg.validityMonths} tháng`
                                  : '36 tháng'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Value / Savings Footer Strip */}
                        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 rounded-xl px-2.5 py-1.5 border border-amber-500/20 flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            {deductTodayIntoCombo ? (
                              <>
                                <span>
                                  Giá lẻ:{' '}
                                  <strong className="line-through text-slate-400 tabular-nums">
                                    {selectedNewComboPkg.retailTotal.toLocaleString('vi-VN')}đ
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Giá gói:{' '}
                                  <strong className="text-slate-900 tabular-nums">
                                    {selectedNewComboPkg.comboPrice.toLocaleString('vi-VN')}đ
                                  </strong>
                                </span>
                              </>
                            ) : (
                              <>
                                <span>
                                  Lẻ ca này: <strong>{servicePrice.toLocaleString('vi-VN')}đ</strong>
                                </span>
                                <span>+</span>
                                <span>
                                  Gói: <strong>{selectedNewComboPkg.comboPrice.toLocaleString('vi-VN')}đ</strong>
                                </span>
                              </>
                            )}
                          </div>
                          <div className="font-black text-emerald-700 tabular-nums">
                            {deductTodayIntoCombo
                              ? `Tiết kiệm ${selectedNewComboPkg.savingsAmount.toLocaleString('vi-VN')}đ`
                              : `Tổng ${(servicePrice + selectedNewComboPkg.comboPrice).toLocaleString('vi-VN')}đ`}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : null)}

              {!isExistingComboLive && (
                <button
                  onClick={() => setSelectedNewComboId('NONE')}
                  className={`w-full py-2 rounded-xl text-[11px] font-bold transition-colors ${
                    selectedNewComboId === 'NONE' ? 'bg-gray-800 text-white' : 'bg-[#F2F2F7] text-gray-600'
                  }`}
                >
                  {selectedNewComboId === 'NONE' ? '✓ ' : ''}Không mua gói mới · Thanh toán lẻ buổi hôm nay (
                  {servicePrice.toLocaleString('vi-VN')}đ)
                </button>
              )}

              {isExistingComboLive && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewComboSection(false);
                    setSelectedNewComboId('NONE');
                    setSelectedUnderComboId('NONE');
                  }}
                  className="w-full py-2.5 rounded-xl border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs flex items-center justify-center gap-1 active:scale-98 transition-all cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Thu gọn phần mua thêm combo (Chỉ trừ gói cũ hôm nay)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 2B: MUA THÊM GÓI COMBO MI DƯỚI */}
        {(!isExistingComboLive || showNewComboSection) && (
          <div>
            <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#FFB400]" />
                <span>2B. MUA THÊM GÓI ❖ MI DƯỚI (MUA CÙNG LÚC)</span>
              </span>
              {underComboBonus > 0 && (
                <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5">
                  +{Math.round(underComboBonus / 1000)}
                  <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-200 space-y-2.5">
              {/* Không lấy combo mi dưới pill */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUnderComboId('NONE')}
                  className={`py-1.5 px-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                    selectedUnderComboId === 'NONE'
                      ? 'bg-neutral-800 text-white border-neutral-800 shadow-xs'
                      : 'bg-[#F9F9FB] border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Không lấy Mi Dưới
                </button>
                {selectedUnderComboPkg && (
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    Đã chọn gói mi dưới
                  </span>
                )}
              </div>

              {/* Unified Combo Card cho Mi Dưới */}
              {underLashPackages.length > 0 && (
                <WingsUnifiedComboCard
                  packages={underLashPackages}
                  customerName={customerName}
                  customerPhone={booking?.customerPhone}
                  customerAvatar={booking?.customerAvatar}
                  selectedPackageId={selectedUnderComboId !== 'NONE' ? selectedUnderComboId : null}
                  onSelectPackage={(pkg) => {
                    setSelectedUnderComboId((prev) => (prev === pkg.id ? 'NONE' : pkg.id));
                  }}
                  onSelectLocked={() => {
                    setIsLockedWelcomeModalOpen(true);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Section 3: Summary card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-2">
          {/* Row 1: Dịch vụ hôm nay */}
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-gray-500 font-medium">Dịch vụ hôm nay:</span>
            {selectedNewComboPkg ? (
              deductTodayIntoCombo ? (
                <span className="text-emerald-700 font-bold tabular-nums">
                  0đ <span className="text-[11px] font-semibold text-emerald-600">(Trừ vào gói)</span>
                </span>
              ) : (
                <span className="text-gray-900 font-bold tabular-nums">
                  {servicePrice.toLocaleString('vi-VN')}đ{' '}
                  <span className="text-[11px] font-semibold text-indigo-700">(Trả lẻ)</span>
                </span>
              )
            ) : isExistingComboLive && redemptionAccounting ? (
              <span className="text-sky-700 font-bold tabular-nums">
                {redemptionAccounting.totalCustomerPayToday > 0
                  ? `+${redemptionAccounting.totalCustomerPayToday.toLocaleString('vi-VN')}đ (Phụ thu)`
                  : '0đ (Trừ ví)'}
              </span>
            ) : (
              <span className="text-gray-900 font-bold tabular-nums">{servicePrice.toLocaleString('vi-VN')}đ</span>
            )}
          </div>

          {/* Row 2: Gói Combo đã chọn */}
          {selectedNewComboPkg && (
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-gray-700 font-medium">
                Gói {selectedNewComboPkg.shortRuleLabel || selectedNewComboPkg.ruleName}:
              </span>
              <span className="text-gray-900 font-bold tabular-nums">{newComboTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          )}

          {/* Row 2B: Gói Mi Dưới nếu có */}
          {selectedUnderComboPkg && (
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-gray-700 font-medium">
                Gói Mi Dưới ({selectedUnderComboPkg.shortRuleLabel || selectedUnderComboPkg.ruleName}):
              </span>
              <span className="text-gray-900 font-bold tabular-nums">{underComboTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          )}

          {/* Row 2C: Dưỡng mi nếu có */}
          {yeppeumCount > 0 && (
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-gray-700 font-medium">
                Dưỡng mi Yeppeum{yeppeumCount > 1 ? ` (x${yeppeumCount})` : ''}:
              </span>
              {selectedSerumTier.id === 'serum-free' ? (
                <span className="text-emerald-700 font-bold tabular-nums">
                  0đ <span className="text-[11px] font-semibold text-emerald-600">(Tặng kèm)</span>
                </span>
              ) : (
                <span className="text-gray-900 font-bold tabular-nums">{serumTotal.toLocaleString('vi-VN')}đ</span>
              )}
            </div>
          )}

          {/* Row 3: Tổng tạm tính */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[14px] font-extrabold text-gray-900">Tổng thanh toán:</span>
            <span className="text-[18px] font-black text-[#FF9500] tabular-nums">
              {subtotal.toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Row 4: Thưởng chốt đơn */}
          <div className="flex items-center justify-between text-[12px] bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
            <span className="text-emerald-800 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Thưởng chốt đơn:
            </span>
            <span className="text-emerald-700 font-black tabular-nums text-[13px] inline-flex items-center gap-0.5">
              +{Math.round((newComboBonus + underComboBonus + serumBonus) / 1000)}
              <FeatherSvg className="w-3 h-3 text-amber-500" />
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={handleConfirmCheckout}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[15px] shadow-md active:scale-98 transition-transform text-center tracking-wide"
          >
            CHỐT ĐƠN & THANH TOÁN
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
                        +{Math.round(t.cvBonus / 1000)}
                        <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        /cây
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
                <p className="text-[11.5px] font-bold text-amber-700 mt-0.5 inline-flex items-center justify-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chỉ áp dụng trong ngày đầu tiên ghé salon</span>
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
              <span className="font-extrabold text-emerald-800 flex items-center gap-1 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gợi ý tư vấn cho CV:</span>
                <FeatherSvg className="w-3 h-3 text-amber-500" />
              </span>
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
