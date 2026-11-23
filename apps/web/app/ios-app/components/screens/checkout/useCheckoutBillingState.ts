'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  combinePaymentBreakdowns,
  computePreCheckoutPaymentSummary,
  resolveActiveBookingComboWallets,
  resolveNormalizedPaymentBreakdown,
  type IosPaymentBreakdown,
  type IosPaymentMethod,
  type IosPromotionOption,
  type IosScannedProductCatalogMatch,
} from '@mos-lab/shared';
import { BookingItem, isDoneBookingPendingCheckout } from '../../../state/mockData';
import type { ActiveActorProfile } from '../../../state/useIosAppState';
import {
  buildPercentageTipSuggestions,
  calculateActorTipBreakdown,
  calculateDualComboTierBonus,
  resolveCheckoutTipBaseAmount,
  resolveEffectiveServiceTotal,
  type CvToCvPlusRequirements,
  type SavePromotionTarget,
} from '../../../state/useIosBillingCheckout';
import { buildCheckoutVietQrInfo } from '../../../state/iosBillingMath';
import { useCheckoutItemizedPromotions } from '../../../state/useCheckoutItemizedPromotions';
import { resolveCheckoutBaseServicePrice, useCheckoutComboSelection } from '../../../state/useCheckoutComboSelection';
import { useCheckoutModalControls, useCheckoutProofCapture } from '../../../state/useCheckoutProofCapture';
import { resolveDisplayServiceName } from '../LashMaterialConstraintMatrix';
import { addScannedProductToCartProducts, removeScannedUnitFromCartProducts } from '../upsell/upsellCheckoutHelpers';

export type CheckoutChoosePaymentHandler = (
  method: IosPaymentMethod,
  tipAmount?: number,
  diamondUsed?: number,
  proofPhoto?: string,
  zaloConsent?: {
    agreed: boolean;
    phone: string;
    sentAt?: string;
    voucherCode?: string;
  },
  promotionSelection?: {
    promotionId?: number | null;
    appliedPromotion?: IosPromotionOption | null;
    servicePromotionId?: number | null;
    servicePromotion?: IosPromotionOption | null;
    comboPromotionId?: number | null;
    comboPromotion?: IosPromotionOption | null;
    underComboPromotionId?: number | null;
    underComboPromotion?: IosPromotionOption | null;
    cartProducts?: BookingItem['cartProducts'];
    paymentBreakdown?: IosPaymentBreakdown;
    tipTransferProofPhoto?: string;
    qrSplitTipSeparate?: boolean;
  }
) => void;

export interface UseCheckoutBillingStateParams {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  onChoosePayment: CheckoutChoosePaymentHandler;
  onSavePromotion?: (promotion: IosPromotionOption | null, target?: SavePromotionTarget) => void;
  onUpdateCartProducts?: (cartProducts: NonNullable<BookingItem['cartProducts']>) => void;
  onUpdateCombos?: (payload: {
    selectedCombo: BookingItem['selectedCombo'];
    selectedUnderCombo: BookingItem['selectedUnderCombo'];
    comboRedemption?: BookingItem['comboRedemption'];
  }) => void;
}

const DIAMOND_RATE = 1000;

export function useCheckoutBillingState({
  booking,
  actor,
  cvPlusRules,
  onChoosePayment,
  onSavePromotion,
  onUpdateCartProducts,
  onUpdateCombos,
}: UseCheckoutBillingStateParams) {
  const initialRawMethod = booking?.billing?.paymentMethod;
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'POS' | 'VIETQR'>(
    initialRawMethod === 'CASH' || initialRawMethod === 'POS' ? initialRawMethod : 'VIETQR'
  );
  const [isSplitPaymentMode, setIsSplitPaymentMode] = useState<boolean>(
    initialRawMethod === 'MIXED' ||
      [
        booking?.billing?.paymentBreakdown?.vietqrAmount || 0,
        booking?.billing?.paymentBreakdown?.posAmount || 0,
        booking?.billing?.paymentBreakdown?.cashAmount || 0,
      ].filter((v) => v > 0).length > 1
  );
  const [customPaymentSplit, setCustomPaymentSplit] = useState<IosPaymentBreakdown>(() => ({
    vietqrAmount: Math.max(0, Math.round(booking?.billing?.paymentBreakdown?.vietqrAmount || 0)),
    posAmount: Math.max(0, Math.round(booking?.billing?.paymentBreakdown?.posAmount || 0)),
    cashAmount: Math.max(0, Math.round(booking?.billing?.paymentBreakdown?.cashAmount || 0)),
  }));
  const [tipAmount, setTipAmount] = useState<number>(booking?.billing?.tipAmount ?? 0);
  const [activeTipPercent, setActiveTipPercent] = useState<number | null>(null);
  const [isCustomTipOpen, setIsCustomTipOpen] = useState<boolean>(false);
  const [customTipInput, setCustomTipInput] = useState<string>('');
  const [diamondUsed, setDiamondUsed] = useState<number>(booking?.billing?.diamondUsed ?? 0);
  const [showStaffRewards, setShowStaffRewards] = useState<boolean>(false);
  const [localCartProducts, setLocalCartProducts] = useState<NonNullable<BookingItem['cartProducts']>>(
    () => booking?.cartProducts || []
  );

  useEffect(() => {
    setShowStaffRewards(false);
  }, [booking?.id]);

  useEffect(() => {
    setLocalCartProducts(booking?.cartProducts || []);
  }, [booking?.id, booking?.cartProducts]);

  const handleForceResetDiamonds = useCallback(() => setDiamondUsed(0), []);
  const [qrSplitMode, setQrSplitMode] = useState<'COMBINED' | 'SEPARATE'>(
    booking?.billing?.qrSplitTipSeparate ? 'SEPARATE' : 'COMBINED'
  );
  const {
    transferProofPhoto,
    proofCloudSyncStatus,
    tipTransferProofPhoto,
    tipProofCloudSyncStatus,
    fileInputRef,
    tipFileInputRef,
    handleCaptureProof,
    handleCaptureTipProof,
  } = useCheckoutProofCapture(
    booking?.billing?.transferProofPhoto || booking?.billing?.preCheckoutTransferProofPhoto,
    booking?.billing?.tipTransferProofPhoto || booking?.billing?.preCheckoutTipTransferProofPhoto
  );

  const customerName = booking?.customerName || 'Chị Trúc';
  const customerPhone = (booking?.customerPhone || '0933.779.207').replace(/\*+\s*/g, '').trim();
  const assignedStaff = booking?.assignedStaffName || 'Thảo Ly';
  const checkInStaff = booking?.checkInStaffName || actor?.name || 'Thảo Ly';
  const checkOutStaff = booking?.checkOutStaffName || actor?.name || 'Thảo Ly';
  const serviceName = resolveDisplayServiceName(booking);
  const servicePrice = useMemo(() => resolveCheckoutBaseServicePrice(booking, serviceName), [booking, serviceName]);
  const upgradePrice = booking?.upgradePrice || 0;
  const resolvedWallets = useMemo(() => resolveActiveBookingComboWallets(booking || {}), [booking]);
  const comboSelection = useCheckoutComboSelection({
    booking,
    serviceName,
    servicePrice,
    cvPlusRules,
    onUpdateCombos,
  });
  const selectedCombo = comboSelection.selectedCombo;
  const selectedUnderCombo = comboSelection.selectedUnderCombo;
  const comboRedemption = comboSelection.comboRedemption;
  const bookingWithLocalSelections = useMemo(
    () =>
      booking
        ? {
            ...booking,
            cartProducts: localCartProducts,
            selectedCombo,
            selectedUnderCombo,
            comboRedemption,
          }
        : undefined,
    [booking, localCartProducts, selectedCombo, selectedUnderCombo, comboRedemption]
  );
  const isComboLive = Boolean(
    resolvedWallets.isRedeemingUpperToday &&
    (!selectedCombo || !selectedCombo.todayUsageMode || selectedCombo.todayUsageMode === 'USE_OLD_COMBO')
  );
  const hasUnderMinkCombo = resolvedWallets.isRedeemingUnderToday;
  const effectiveServiceCharge = resolveEffectiveServiceTotal({
    servicePrice,
    upgradePrice,
    serviceName: booking?.serviceName,
    isComboLive,
    hasUnderMink: booking?.attributes?.hasUnderMink,
    underMinkServiceType: booking?.attributes?.underMinkServiceType,
    hasUnderMinkCombo,
    comboRedemption,
    selectedCombo,
    selectedUnderCombo,
  });
  const actorTipBreakdown = useMemo(
    () => calculateActorTipBreakdown(booking, actor, tipAmount),
    [booking, actor, tipAmount]
  );
  const upperComboPrice = selectedCombo ? selectedCombo.price : 0;
  const underComboPrice = selectedUnderCombo ? selectedUnderCombo.price : 0;
  const comboTotal = upperComboPrice + underComboPrice;
  const vatRate = booking?.billing?.vatRate ?? 0.08;

  const {
    servicePromo,
    rememberedServicePromo,
    isSessionWaivedIntoNewCombo,
    cartProducts,
    promotions,
    isPromotionsLoading,
    promotionsError,
    promoPickerTarget,
    setPromoPickerTarget,
    applyPromoChange,
    handleOpenItemPromotionPicker,
    handleClearItemPromotion,
    fallbackOrderPromo,
    hasAnyPromoObj,
    promoBreakdown,
    appliedPromotionDisplayName,
  } = useCheckoutItemizedPromotions({
    booking: bookingWithLocalSelections,
    actorTier: actor?.tier,
    effectiveServiceCharge,
    upgradePrice,
    upperComboPrice,
    underComboPrice,
    vatRate,
    onSavePromotion,
    onForceResetDiamonds: handleForceResetDiamonds,
  });

  const handleScannedProduct = useCallback(
    (scanned: IosScannedProductCatalogMatch) => {
      setLocalCartProducts((prev) => {
        const nextProducts = addScannedProductToCartProducts(prev, scanned);
        onUpdateCartProducts?.(nextProducts);
        return nextProducts;
      });
    },
    [onUpdateCartProducts]
  );

  const handleRemoveScannedUnit = useCallback(
    (productIndex: number, inventoryWarehouseItemId?: number) => {
      setLocalCartProducts((prev) => {
        const nextProducts = removeScannedUnitFromCartProducts(prev, productIndex, inventoryWarehouseItemId);
        onUpdateCartProducts?.(nextProducts);
        return nextProducts;
      });
    },
    [onUpdateCartProducts]
  );

  const productTotal = cartProducts.reduce((s, p) => s + p.price * p.quantity, 0);
  const subtotal = effectiveServiceCharge + comboTotal + productTotal;
  const promotionDiscountAmount = hasAnyPromoObj
    ? promoBreakdown.totalDiscount
    : !isSessionWaivedIntoNewCombo && booking?.promotionId && booking?.billing?.promotionDiscountAmount
      ? Math.max(0, Math.round(Number(booking.billing.promotionDiscountAmount) || 0))
      : 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - promotionDiscountAmount);
  const vatAmount = hasAnyPromoObj ? promoBreakdown.vatAmount : Math.round(subtotalAfterDiscount * vatRate);
  const totalWithVat = subtotalAfterDiscount + vatAmount;

  const isCheckoutStaffCc =
    actor?.tier === 'CC' || (!booking?.isTrainingCvlOrder && booking?.checkOutStaffTier === 'CC');
  const comboTotalRevenue = upperComboPrice + underComboPrice;
  const dualComboBonus = calculateDualComboTierBonus(upperComboPrice, underComboPrice, cvPlusRules);
  const totalComboBonus = isCheckoutStaffCc ? 0 : dualComboBonus.totalBonus;
  const hasBothCombos = Boolean(selectedCombo && selectedUnderCombo && comboTotalRevenue > 0);

  const customerDiamondBalance = booking?.diamondBalance ?? 0;
  const isSettled =
    booking?.billing?.settlementStatus === 'SETTLED_COMPLETED' ||
    booking?.orderState === 'Completed' ||
    Boolean(booking?.status === 'DONE' && booking?.billing?.completedAt && !isDoneBookingPendingCheckout(booking));
  const isCreditLockedByPromotion = promoBreakdown.isFullCreditLocked;
  const hasPartialCreditRestriction = Boolean(
    promoBreakdown.hasAnyCreditRestrictedItem && !promoBreakdown.isFullCreditLocked
  );
  const totalBeforeDiamond = totalWithVat + tipAmount;
  const maxDiamondCanUse = isCreditLockedByPromotion
    ? 0
    : hasPartialCreditRestriction
      ? Math.min(customerDiamondBalance, Math.floor(promoBreakdown.creditEligiblePayableWithVat / DIAMOND_RATE))
      : Math.min(customerDiamondBalance, Math.floor(totalBeforeDiamond / DIAMOND_RATE));
  const effectiveDiamondUsed = isCreditLockedByPromotion ? 0 : Math.min(diamondUsed, maxDiamondCanUse);
  const diamondDiscountAmount = effectiveDiamondUsed * DIAMOND_RATE;
  const finalGrandTotal = Math.max(0, totalBeforeDiamond - diamondDiscountAmount);

  const { tipBaseAmount } = useMemo(
    () =>
      resolveCheckoutTipBaseAmount({
        servicePrice,
        effectiveServiceCharge,
        serviceName: booking?.serviceName || serviceName,
        hasUnderMink: booking?.attributes?.hasUnderMink,
        underMinkServiceType: booking?.attributes?.underMinkServiceType,
        hasUnderMinkCombo,
        cartProducts,
      }),
    [
      servicePrice,
      effectiveServiceCharge,
      booking?.serviceName,
      serviceName,
      booking?.attributes?.hasUnderMink,
      booking?.attributes?.underMinkServiceType,
      hasUnderMinkCombo,
      cartProducts,
    ]
  );

  const percentTipSuggestions = useMemo(() => buildPercentageTipSuggestions(tipBaseAmount), [tipBaseAmount]);

  useEffect(() => {
    if (activeTipPercent === null) return;
    const matched = percentTipSuggestions.find((item) => item.percent === activeTipPercent);
    if (matched && matched.tipAmount !== tipAmount) {
      setTipAmount(matched.tipAmount);
    }
  }, [activeTipPercent, percentTipSuggestions, tipAmount]);

  const preCheckoutSummary = useMemo(
    () => computePreCheckoutPaymentSummary({ grandTotal: finalGrandTotal, billing: booking?.billing }),
    [finalGrandTotal, booking?.billing]
  );
  const amountDueAtCheckout = preCheckoutSummary.hasPreCheckoutPayment
    ? preCheckoutSummary.remainingDue
    : finalGrandTotal;
  const remainingUnpaidTip = Math.max(0, tipAmount - preCheckoutSummary.preCheckoutTipAmount);

  const effectivePaymentSplit: IosPaymentBreakdown = useMemo(
    () =>
      isSplitPaymentMode
        ? customPaymentSplit
        : {
            vietqrAmount: selectedMethod === 'VIETQR' ? amountDueAtCheckout : 0,
            posAmount: selectedMethod === 'POS' ? amountDueAtCheckout : 0,
            cashAmount: selectedMethod === 'CASH' ? amountDueAtCheckout : 0,
          },
    [isSplitPaymentMode, customPaymentSplit, selectedMethod, amountDueAtCheckout]
  );
  const allocatedPaymentTotal =
    effectivePaymentSplit.vietqrAmount + effectivePaymentSplit.posAmount + effectivePaymentSplit.cashAmount;
  const isPaymentAllocationValid = amountDueAtCheckout === 0 || allocatedPaymentTotal === amountDueAtCheckout;
  const normalizedRemainingPayment = useMemo(
    () =>
      resolveNormalizedPaymentBreakdown(
        amountDueAtCheckout,
        isSplitPaymentMode ? 'MIXED' : selectedMethod,
        effectivePaymentSplit
      ),
    [amountDueAtCheckout, isSplitPaymentMode, selectedMethod, effectivePaymentSplit]
  );
  const normalizedEffectivePayment = useMemo(
    () =>
      preCheckoutSummary.hasPreCheckoutPayment
        ? combinePaymentBreakdowns(
            finalGrandTotal,
            preCheckoutSummary.preCheckoutBreakdown,
            normalizedRemainingPayment.breakdown
          )
        : normalizedRemainingPayment,
    [finalGrandTotal, preCheckoutSummary, normalizedRemainingPayment]
  );
  const vietQrTransferAmount = amountDueAtCheckout === 0 ? 0 : effectivePaymentSplit.vietqrAmount;
  const qrInfo = buildCheckoutVietQrInfo({
    booking,
    tipAmount: remainingUnpaidTip,
    vietQrTransferAmount,
    tipTransferAmount: remainingUnpaidTip,
  });
  const { branchCode, qrTransferContent, vietQrUrl } = qrInfo;

  const handleToggleSplitMode = (nextSplit: boolean) => {
    if (nextSplit) {
      setCustomPaymentSplit({
        vietqrAmount: selectedMethod === 'VIETQR' ? amountDueAtCheckout : 0,
        posAmount: selectedMethod === 'POS' ? amountDueAtCheckout : 0,
        cashAmount: selectedMethod === 'CASH' ? amountDueAtCheckout : 0,
      });
      setIsSplitPaymentMode(true);
      return;
    }
    const dominant: 'CASH' | 'POS' | 'VIETQR' =
      customPaymentSplit.vietqrAmount > 0
        ? 'VIETQR'
        : customPaymentSplit.posAmount > 0
          ? 'POS'
          : customPaymentSplit.cashAmount > 0
            ? 'CASH'
            : selectedMethod;
    setSelectedMethod(dominant);
    setIsSplitPaymentMode(false);
  };

  const dispatchChoosePayment = (zaloConsentData: {
    agreed: boolean;
    phone: string;
    sentAt?: string;
    voucherCode?: string;
  }) => {
    onChoosePayment(
      normalizedEffectivePayment.paymentMethod,
      tipAmount,
      effectiveDiamondUsed,
      transferProofPhoto || undefined,
      zaloConsentData,
      {
        promotionId:
          promoBreakdown.unifiedOrderPromotionId ??
          (isSessionWaivedIntoNewCombo ? null : fallbackOrderPromo?.promotionId) ??
          null,
        appliedPromotion: isSessionWaivedIntoNewCombo ? null : fallbackOrderPromo,
        servicePromotionId: servicePromo?.promotionId ?? null,
        servicePromotion: servicePromo,
        comboPromotionId: null,
        comboPromotion: null,
        underComboPromotionId: null,
        underComboPromotion: null,
        cartProducts,
        paymentBreakdown: normalizedEffectivePayment.breakdown,
        tipTransferProofPhoto: tipTransferProofPhoto || undefined,
        qrSplitTipSeparate: qrSplitMode === 'SEPARATE',
      }
    );
  };

  const {
    isProductQrScannerOpen,
    setIsProductQrScannerOpen,
    isQrModalOpen,
    setIsQrModalOpen,
    isZaloModalOpen,
    setIsZaloModalOpen,
    zaloPhone,
    setZaloPhone,
    isSendingZalo,
    isZaloSentSuccess,
    copySuccess,
    copyToClipboard,
    handleConfirmQrPaid,
    handleConfirmZaloSend,
    handleSkipZalo,
  } = useCheckoutModalControls(
    booking?.billing?.zaloConsent?.phone || booking?.customerPhone || '0938.204.567',
    dispatchChoosePayment
  );

  const handleProceed = () => {
    if (
      amountDueAtCheckout > 0 &&
      (!isPaymentAllocationValid || (effectivePaymentSplit.posAmount > 0 && !transferProofPhoto))
    ) {
      return;
    }
    if (vietQrTransferAmount > 0) {
      setIsQrModalOpen(true);
      return;
    }
    setIsZaloModalOpen(true);
  };

  return {
    selectedMethod,
    setSelectedMethod,
    isSplitPaymentMode,
    setIsSplitPaymentMode,
    setCustomPaymentSplit,
    tipAmount,
    setTipAmount,
    activeTipPercent,
    setActiveTipPercent,
    isCustomTipOpen,
    setIsCustomTipOpen,
    customTipInput,
    setCustomTipInput,
    setDiamondUsed,
    showStaffRewards,
    setShowStaffRewards,
    isProductQrScannerOpen,
    setIsProductQrScannerOpen,
    isQrModalOpen,
    setIsQrModalOpen,
    isZaloModalOpen,
    zaloPhone,
    setZaloPhone,
    isSendingZalo,
    isZaloSentSuccess,
    copySuccess,
    transferProofPhoto,
    proofCloudSyncStatus,
    tipTransferProofPhoto,
    tipProofCloudSyncStatus,
    fileInputRef,
    tipFileInputRef,
    handleCaptureProof,
    handleCaptureTipProof,
    qrSplitMode,
    setQrSplitMode,
    customerName,
    customerPhone,
    assignedStaff,
    checkInStaff,
    checkOutStaff,
    serviceName,
    servicePrice,
    upgradePrice,
    resolvedWallets,
    comboSelection,
    selectedCombo,
    selectedUnderCombo,
    comboRedemption,
    bookingWithLocalSelections,
    isComboLive,
    effectiveServiceCharge,
    actorTipBreakdown,
    comboTotal,
    vatRate,
    servicePromo,
    rememberedServicePromo,
    cartProducts,
    promotions,
    isPromotionsLoading,
    promotionsError,
    promoPickerTarget,
    setPromoPickerTarget,
    applyPromoChange,
    handleOpenItemPromotionPicker,
    handleClearItemPromotion,
    promoBreakdown,
    appliedPromotionDisplayName,
    handleScannedProduct,
    handleRemoveScannedUnit,
    productTotal,
    subtotal,
    promotionDiscountAmount,
    vatAmount,
    isCheckoutStaffCc,
    comboTotalRevenue,
    dualComboBonus,
    totalComboBonus,
    hasBothCombos,
    customerDiamondBalance,
    isSettled,
    isCreditLockedByPromotion,
    hasPartialCreditRestriction,
    maxDiamondCanUse,
    effectiveDiamondUsed,
    diamondDiscountAmount,
    diamondRate: DIAMOND_RATE,
    finalGrandTotal,
    preCheckoutSummary,
    amountDueAtCheckout,
    tipBaseAmount,
    percentTipSuggestions,
    effectivePaymentSplit,
    normalizedRemainingPayment,
    normalizedEffectivePayment,
    vietQrTransferAmount,
    qrInfo,
    branchCode,
    qrTransferContent,
    vietQrUrl,
    copyToClipboard,
    handleToggleSplitMode,
    handleProceed,
    handleConfirmQrPaid,
    handleConfirmZaloSend,
    handleSkipZalo,
  };
}
