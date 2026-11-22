'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  calculateActorTipBreakdown,
  calculateComboPurchaseAccounting,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  canDirectlySettleCounterPayment,
  checkWelcomeComboEligibility,
  computePostCheckoutFinancialDelta,
  getComboPackagesForCategoryAndVolume,
  getUnderLashComboPackages,
  getWingsComboCategory,
  matchComboCategoryAndVolumeFromBooking,
  resolveActiveBookingComboWallets,
  resolveMatchedUnderComboFromSaved,
  resolveMatchedUpperComboFromSaved,
  resolveServicePriceSplit,
  resolveValidVolumeForCategory,
  type CvToCvPlusRequirements,
  type IosCheckoutStaffOption,
  type IosPaymentBreakdown,
  type IosPaymentMethod,
  type IosPostCheckoutPaymentMode,
  type MatchedComboPackageOption,
  type WingsComboCategoryId,
} from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import type { ActiveActorProfile } from '../../../state/iosActorProfile';
import { type BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import {
  computePackageExpiry,
  extractExistingUnderExpirySnapshot,
  extractExistingUpperExpirySnapshot,
} from '../consultation/comboExpiryConsultHelpers';
import { resolveInitialSerumSelection } from '../upsell/upsellCheckoutHelpers';
import { buildSeedStaffOptions, computePostCheckoutDraftAndTotals } from './postCheckoutWalletHelpers';

export interface UsePostCheckoutComboSheetStateParams {
  open: boolean;
  onClose: () => void;
  booking: BookingItem;
  actor?: ActiveActorProfile;
  isAdmin?: boolean;
  isSimulationMode?: boolean;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  onAdjusted?: () => Promise<unknown> | void;
}

export function usePostCheckoutComboSheetState({
  open,
  onClose,
  booking,
  actor,
  isAdmin = false,
  isSimulationMode = false,
  cvPlusRules,
  onAdjusted,
}: UsePostCheckoutComboSheetStateParams) {
  const autoMatched = useMemo(
    () =>
      matchComboCategoryAndVolumeFromBooking({
        serviceName: booking.serviceName,
        servicePrice: booking.servicePrice,
        material: booking.attributes?.material,
        volume: booking.attributes?.volume,
        count: booking.attributes?.count,
        comboName: booking.comboLiveStatus?.comboName,
        serviceKey: booking.comboLiveStatus?.serviceKey,
      }),
    [booking]
  );

  const welcomeEligibility = useMemo(
    () =>
      checkWelcomeComboEligibility({
        customerVisits: booking.customerVisits ?? 1,
        lashHistoryDates: (booking.lashHistory || []).map((h) => h.date),
      }),
    [booking.customerVisits, booking.lashHistory]
  );

  const initialCategoryAndVolume = useMemo(() => {
    const saved = booking.selectedCombo;
    if (saved) {
      const parts = String(saved.id || '').split(':');
      const rawCat = saved.categoryId || parts[0];
      const parsedVol =
        saved.volume ??
        (parts[2] && parts[2] !== 'under_390' && parts[2] !== 'under' && Number.isFinite(Number(parts[2]))
          ? Number(parts[2])
          : undefined);
      if (rawCat && rawCat !== 'VVIP' && parsedVol !== undefined && parsedVol !== 'under') {
        const catId = getWingsComboCategory(rawCat).id;
        return { categoryId: catId, volume: resolveValidVolumeForCategory(catId, parsedVol) };
      }
    }
    return { categoryId: autoMatched.categoryId, volume: autoMatched.volume };
  }, [booking.selectedCombo, autoMatched]);

  const seededStaff = useMemo(() => buildSeedStaffOptions(booking, actor), [booking, actor]);
  const [staffOptions, setStaffOptions] = useState<IosCheckoutStaffOption[]>(seededStaff);
  const [selectedCheckOutStaffId, setSelectedCheckOutStaffId] = useState<number>(
    Number(booking.checkOutStaffId || actor?.staffId || booking.assignedStaffId || 0)
  );
  const [activeCategoryId, setActiveCategoryId] = useState<WingsComboCategoryId>(initialCategoryAndVolume.categoryId);
  const [activeVolume, setActiveVolume] = useState<number | 'under'>(initialCategoryAndVolume.volume);
  const [selectedUpperComboId, setSelectedUpperComboId] = useState<string>('');
  const [selectedUnderComboId, setSelectedUnderComboId] = useState<string>('');
  const initialWallets = useMemo(() => resolveActiveBookingComboWallets(booking), [booking]);
  const [selectedUpperComboBalanceId, setSelectedUpperComboBalanceId] = useState<number | null>(
    initialWallets.selectedUpperComboBalanceId
  );
  const [selectedUnderComboBalanceId, setSelectedUnderComboBalanceId] = useState<number | null>(
    initialWallets.selectedUnderComboBalanceId
  );
  const [skipUpperCombo, setSkipUpperCombo] = useState<boolean>(initialWallets.skipUpperCombo);
  const [skipUnderCombo, setSkipUnderCombo] = useState<boolean>(initialWallets.skipUnderCombo);
  const [todaySingleServiceWaived, setTodaySingleServiceWaived] = useState<boolean>(
    booking.selectedCombo
      ? booking.selectedCombo.todaySingleServiceWaived !== false
      : !initialWallets.isRedeemingUpperToday
  );
  const [yeppeumCount, setYeppeumCount] = useState<number>(0);
  const [selectedSerumTierId, setSelectedSerumTierId] = useState<string>(SERUM_TIERS_CVL[0].id);
  const [tipAmount, setTipAmount] = useState<number>(Number(booking.billing?.tipAmount || 0));
  const [diamondUsed, setDiamondUsed] = useState<number>(Number(booking.billing?.diamondUsed || 0));
  const [paymentMode, setPaymentMode] = useState<IosPostCheckoutPaymentMode>('TOP_UP');
  const [deltaMethod, setDeltaMethod] = useState<IosPaymentMethod>('VIETQR');
  const [deltaSplit, setDeltaSplit] = useState<IosPaymentBreakdown>({ vietqrAmount: 0, posAmount: 0, cashAmount: 0 });
  const [reason, setReason] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showStaffRewards, setShowStaffRewards] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const originalCheckOutStaffId = Number(booking.checkOutStaffId || booking.assignedStaffId || 0);
  const originalCheckOutStaffName = String(
    booking.checkOutStaffName || booking.assignedStaffName || 'Nhân sự Checkout'
  );
  const maxDiamonds = Math.max(0, Number(booking.diamondBalance || 0) + Number(booking.billing?.diamondUsed || 0));

  useEffect(() => {
    if (!open) return;
    const upperPkg = resolveMatchedUpperComboFromSaved(booking.selectedCombo, welcomeEligibility, {
      categoryId: initialCategoryAndVolume.categoryId,
      volume: initialCategoryAndVolume.volume,
    });
    const underPkg = resolveMatchedUnderComboFromSaved(booking.selectedUnderCombo, welcomeEligibility);
    const serum = resolveInitialSerumSelection(booking.cartProducts);
    const resetWallets = resolveActiveBookingComboWallets(booking);
    setStaffOptions(seededStaff);
    setSelectedCheckOutStaffId(Number(booking.checkOutStaffId || actor?.staffId || booking.assignedStaffId || 0));
    setActiveCategoryId(initialCategoryAndVolume.categoryId);
    setActiveVolume(initialCategoryAndVolume.volume);
    setSelectedUpperComboId(upperPkg?.id || '');
    setSelectedUnderComboId(underPkg?.id || '');
    setSelectedUpperComboBalanceId(resetWallets.selectedUpperComboBalanceId);
    setSelectedUnderComboBalanceId(resetWallets.selectedUnderComboBalanceId);
    setSkipUpperCombo(resetWallets.skipUpperCombo);
    setSkipUnderCombo(resetWallets.skipUnderCombo);
    setTodaySingleServiceWaived(
      booking.selectedCombo
        ? booking.selectedCombo.todaySingleServiceWaived !== false
        : !resetWallets.isRedeemingUpperToday
    );
    setYeppeumCount(serum.count);
    setSelectedSerumTierId(serum.tierId);
    setTipAmount(Math.max(0, Number(booking.billing?.tipAmount || 0)));
    setDiamondUsed(Math.max(0, Number(booking.billing?.diamondUsed || 0)));
    setPaymentMode('TOP_UP');
    setDeltaMethod('VIETQR');
    setDeltaSplit({ vietqrAmount: 0, posAmount: 0, cashAmount: 0 });
    setReason('');
    setRejectionReason('');
    setShowStaffRewards(false);
    setErrorMsg(null);

    let active = true;
    void apiClient.ios
      .listCheckoutEligibleStaff(booking.storeId)
      .then((res) => {
        if (!active || !res?.success || !Array.isArray(res.staff) || res.staff.length === 0) return;
        const merged = new Map<number, IosCheckoutStaffOption>();
        for (const s of res.staff) merged.set(Number(s.staffId), s);
        for (const seed of seededStaff) {
          if (!merged.has(Number(seed.staffId))) merged.set(Number(seed.staffId), seed);
        }
        setStaffOptions(Array.from(merged.values()));
      })
      .catch(() => {
        // Seed list remains usable offline / in tests
      });
    return () => {
      active = false;
    };
  }, [open, booking, actor, seededStaff, welcomeEligibility, initialCategoryAndVolume]);

  const upperPackages = useMemo(
    () =>
      getComboPackagesForCategoryAndVolume({
        categoryId: activeCategoryId,
        volume: activeVolume,
        welcomeEligibility,
        includeVvipPass: true,
      }),
    [activeCategoryId, activeVolume, welcomeEligibility]
  );
  const underPackages = useMemo(() => getUnderLashComboPackages(welcomeEligibility), [welcomeEligibility]);

  const selectedUpperPkg: MatchedComboPackageOption | null = useMemo(
    () => upperPackages.find((p) => p.id === selectedUpperComboId && !p.isLocked) || null,
    [upperPackages, selectedUpperComboId]
  );
  const selectedUnderPkg: MatchedComboPackageOption | null = useMemo(
    () => underPackages.find((p) => p.id === selectedUnderComboId && !p.isLocked) || null,
    [underPackages, selectedUnderComboId]
  );

  const effectiveBookingForWallets = useMemo<BookingItem>(
    () => ({
      ...booking,
      selectedUpperComboBalanceId,
      selectedUnderComboBalanceId,
      skipUpperCombo,
      skipUnderCombo,
    }),
    [booking, selectedUpperComboBalanceId, selectedUnderComboBalanceId, skipUpperCombo, skipUnderCombo]
  );
  const resolvedWallets = useMemo(
    () => resolveActiveBookingComboWallets(effectiveBookingForWallets),
    [effectiveBookingForWallets]
  );

  const selectedSerumTier = SERUM_TIERS_CVL.find((t) => t.id === selectedSerumTierId) || SERUM_TIERS_CVL[0];
  const servicePrice = Number(booking.servicePrice || 770000);
  const hasUnderMinkComboActive = resolvedWallets.isRedeemingUnderToday;
  const { upperServicePrice, underServicePrice } = useMemo(
    () =>
      resolveServicePriceSplit({
        servicePrice,
        serviceName: booking.serviceName,
        hasUnderMink: booking.attributes?.hasUnderMink,
        underMinkServiceType: booking.attributes?.underMinkServiceType,
        hasUnderMinkCombo: hasUnderMinkComboActive,
      }),
    [
      servicePrice,
      booking.serviceName,
      booking.attributes?.hasUnderMink,
      booking.attributes?.underMinkServiceType,
      hasUnderMinkComboActive,
    ]
  );

  const purchaseAccounting = useMemo(
    () =>
      selectedUpperPkg ? calculateComboPurchaseAccounting(selectedUpperPkg, upperServicePrice || servicePrice) : null,
    [selectedUpperPkg, upperServicePrice, servicePrice]
  );
  const underPurchaseAccounting = useMemo(
    () => (selectedUnderPkg ? calculateComboPurchaseAccounting(selectedUnderPkg, underServicePrice || 390000) : null),
    [selectedUnderPkg, underServicePrice]
  );
  const dualBonus = useMemo(
    () =>
      calculateDualComboTierBonus(selectedUpperPkg?.comboPrice || 0, selectedUnderPkg?.comboPrice || 0, cvPlusRules),
    [selectedUpperPkg, selectedUnderPkg, cvPlusRules]
  );

  const existingUpperExpiry = useMemo(
    () => extractExistingUpperExpirySnapshot(effectiveBookingForWallets),
    [effectiveBookingForWallets]
  );
  const existingUnderExpiry = useMemo(
    () => extractExistingUnderExpirySnapshot(effectiveBookingForWallets),
    [effectiveBookingForWallets]
  );
  const todayServiceType = booking.serviceType === 'Retain' ? 'Retain' : 'Normal';
  const underServiceType = booking.attributes?.underMinkServiceType === 'Retain' ? 'Retain' : 'Normal';

  const selectedUpperExpiry = useMemo(
    () =>
      selectedUpperPkg
        ? computePackageExpiry({
            pkg: selectedUpperPkg,
            todayUsageMode: todaySingleServiceWaived ? 'USE_NEW_COMBO' : 'RETAIL_OR_VOUCHER',
            todayServiceType,
            existingCombo: existingUpperExpiry,
          })
        : null,
    [selectedUpperPkg, todaySingleServiceWaived, todayServiceType, existingUpperExpiry]
  );
  const selectedUnderExpiry = useMemo(
    () =>
      selectedUnderPkg
        ? computePackageExpiry({
            pkg: selectedUnderPkg,
            todayUsageMode: todaySingleServiceWaived ? 'USE_NEW_COMBO' : 'RETAIL_OR_VOUCHER',
            todayServiceType: underServiceType,
            existingCombo: existingUnderExpiry,
          })
        : null,
    [selectedUnderPkg, todaySingleServiceWaived, underServiceType, existingUnderExpiry]
  );

  const { draftPayload, effectiveComboRedemption, lineTotals } = useMemo(
    () =>
      computePostCheckoutDraftAndTotals({
        booking,
        effectiveBookingForWallets,
        resolvedWallets,
        yeppeumCount,
        selectedSerumTier,
        selectedUpperPkg,
        selectedUnderPkg,
        todaySingleServiceWaived,
        selectedUpperExpiry,
        selectedUnderExpiry,
        purchaseAccounting,
        underPurchaseAccounting,
        dualBonus,
        activeCategoryId,
        autoMatchedCategoryId: autoMatched.categoryId,
        autoMatchedVolume: autoMatched.volume,
        servicePrice,
      }),
    [
      booking,
      effectiveBookingForWallets,
      resolvedWallets,
      yeppeumCount,
      selectedSerumTier,
      selectedUpperPkg,
      selectedUnderPkg,
      todaySingleServiceWaived,
      selectedUpperExpiry,
      selectedUnderExpiry,
      purchaseAccounting,
      underPurchaseAccounting,
      dualBonus,
      activeCategoryId,
      autoMatched.categoryId,
      autoMatched.volume,
      servicePrice,
    ]
  );

  const newGrandTotal =
    Math.max(0, lineTotals.subtotalAfterDiscount + lineTotals.vatAmount - diamondUsed * 1000) + tipAmount;
  const previousPaidTotal = Math.max(0, Math.round(Number(booking.billing?.grandTotal ?? 0)));
  const isAlreadySettledCompleted = booking.billing?.settlementStatus === 'SETTLED_COMPLETED';

  const delta = useMemo(
    () =>
      computePostCheckoutFinancialDelta({
        previousPaidTotal,
        previousPaymentMethod: booking.billing?.paymentMethod,
        previousPaymentBreakdown: booking.billing?.paymentBreakdown,
        newGrandTotal,
        requestedMode: paymentMode,
        deltaPaymentMethod: deltaMethod,
        deltaPaymentBreakdown: deltaMethod === 'MIXED' ? deltaSplit : undefined,
        isAlreadySettledCompleted,
        actorTier: actor?.tier,
        isAdmin,
      }),
    [
      previousPaidTotal,
      booking.billing,
      newGrandTotal,
      paymentMode,
      deltaMethod,
      deltaSplit,
      isAlreadySettledCompleted,
      actor?.tier,
      isAdmin,
    ]
  );

  const selectedStaff =
    staffOptions.find((s) => Number(s.staffId) === Number(selectedCheckOutStaffId)) || staffOptions[0];
  const tipBreakdown = useMemo(() => {
    const mockBookingWithTarget: BookingItem = {
      ...booking,
      checkOutStaffId: selectedStaff?.staffId || selectedCheckOutStaffId,
      checkOutStaffName: selectedStaff?.name || originalCheckOutStaffName,
      checkOutStaffTier: selectedStaff?.tier || booking.checkOutStaffTier,
    };
    const targetAsActor: ActiveActorProfile = {
      staffId: selectedStaff?.staffId || selectedCheckOutStaffId,
      name: selectedStaff?.name || originalCheckOutStaffName,
      tier: selectedStaff?.tier || 'CVL',
      badgeLabel: selectedStaff?.tier || 'CVL',
    };
    return calculateActorTipBreakdown(mockBookingWithTarget, targetAsActor, tipAmount);
  }, [booking, selectedStaff, selectedCheckOutStaffId, originalCheckOutStaffName, tipAmount]);

  const serumBonusPreview = useMemo(
    () =>
      draftPayload.cartProducts.reduce(
        (sum, p) =>
          sum +
          (p.cvBonus !== undefined
            ? p.cvBonus * p.quantity
            : calculateCvSerumTierBonus(p.price, p.quantity, cvPlusRules)),
        0
      ),
    [draftPayload.cartProducts, cvPlusRules]
  );

  const pending = booking.pendingPostCheckoutAdjustment;
  const canApproveCounter = Boolean(isAdmin || canDirectlySettleCounterPayment(actor?.tier));
  const isCheckoutCc = selectedStaff?.tier === 'CC' && !booking.isTrainingCvlOrder;

  const handleSubmitAdjustment = async () => {
    if (delta.requiresReason && !reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do điều chỉnh / hủy thanh toán cũ.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.ios.executeBookingAction({
        bookingId: booking.id,
        action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT',
        simulationMode: Boolean(isSimulationMode),
        bookingDateYmd: booking.bookingDateYmd,
        targetCheckOutStaffId: selectedStaff?.staffId || selectedCheckOutStaffId,
        targetCheckOutStaffName: selectedStaff?.name || originalCheckOutStaffName,
        targetCheckOutStaffTier: selectedStaff?.tier || 'CVL',
        selectedCombo: draftPayload.selectedCombo,
        selectedUnderCombo: draftPayload.selectedUnderCombo,
        comboRedemption: effectiveComboRedemption,
        selectedUpperComboBalanceId: resolvedWallets.selectedUpperComboBalanceId,
        selectedUnderComboBalanceId: resolvedWallets.selectedUnderComboBalanceId,
        skipUpperCombo: resolvedWallets.skipUpperCombo,
        skipUnderCombo: resolvedWallets.skipUnderCombo,
        hasUnderMinkCombo: hasUnderMinkComboActive,
        cartProducts: draftPayload.cartProducts,
        tipAmount,
        diamondUsed,
        paymentMode: delta.effectiveMode,
        deltaPaymentMethod: delta.deltaPaymentMethod,
        deltaPaymentBreakdown: delta.deltaPaymentBreakdown,
        reason: reason.trim() || undefined,
        isTrainingCvlOrder: Boolean(booking.isTrainingCvlOrder),
      });
      if (!res?.success) {
        setErrorMsg(res?.error || 'Không thể lưu điều chỉnh sau checkout.');
        return;
      }
      await onAdjusted?.();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi kết nối khi điều chỉnh gói.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolvePending = async (
    action: 'APPROVE_POST_CHECKOUT_ADJUSTMENT' | 'REJECT_POST_CHECKOUT_ADJUSTMENT',
    customReason?: string
  ) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.ios.executeBookingAction({
        bookingId: booking.id,
        action,
        simulationMode: Boolean(isSimulationMode),
        bookingDateYmd: booking.bookingDateYmd,
        ...(action === 'REJECT_POST_CHECKOUT_ADJUSTMENT'
          ? { rejectionReason: customReason || rejectionReason.trim() || 'Từ chối điều chỉnh' }
          : {}),
      });
      if (!res?.success) {
        setErrorMsg(res?.error || 'Không thể xử lý yêu cầu điều chỉnh.');
        return;
      }
      await onAdjusted?.();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi kết nối khi xử lý yêu cầu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    staffOptions,
    selectedCheckOutStaffId,
    setSelectedCheckOutStaffId,
    activeCategoryId,
    setActiveCategoryId,
    activeVolume,
    setActiveVolume,
    upperPackages,
    selectedUpperComboId,
    setSelectedUpperComboId,
    selectedUpperPkg,
    underPackages,
    selectedUnderComboId,
    setSelectedUnderComboId,
    todaySingleServiceWaived,
    setTodaySingleServiceWaived,
    yeppeumCount,
    setYeppeumCount,
    selectedSerumTierId,
    setSelectedSerumTierId,
    tipAmount,
    setTipAmount,
    diamondUsed,
    setDiamondUsed,
    maxDiamonds,
    deltaMethod,
    setDeltaMethod,
    deltaSplit,
    setDeltaSplit,
    setPaymentMode,
    reason,
    setReason,
    rejectionReason,
    setRejectionReason,
    showStaffRewards,
    setShowStaffRewards,
    isSubmitting,
    errorMsg,
    originalCheckOutStaffId,
    originalCheckOutStaffName,
    resolvedWallets,
    setSelectedUpperComboBalanceId,
    setSelectedUnderComboBalanceId,
    setSkipUpperCombo,
    setSkipUnderCombo,
    dualBonus,
    previousPaidTotal,
    newGrandTotal,
    delta,
    selectedStaff,
    tipBreakdown,
    serumBonusPreview,
    pending,
    canApproveCounter,
    isCheckoutCc,
    handleSubmitAdjustment,
    handleResolvePending,
  };
}
