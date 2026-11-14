'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  calculateIosPromotionDiscount,
  canDirectlySettleCounterPayment,
  type IosPromotionOption,
} from '@mos-lab/shared';
import { GraduationCap } from 'lucide-react';
import { apiClient } from '~/lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { IosStaffVisibilityToggle } from '../ui-kit/IosStaffVisibilityToggle';
import { CvFeather1Badge } from '../ui-kit/CvFeatherLabels';
import { BookingItem } from '../../state/mockData';
import { compressLashImage } from '../../utils/imageCompressor';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { resolveDisplayServiceName, getWingsMenuDetail } from './LashMaterialConstraintMatrix';
import { IosCloudSyncStatus } from '../ui-kit/IosCloudSyncBadge';
import {
  calculateDualComboTierBonus,
  resolveEffectiveServiceTotal,
  resolveCheckoutTipBaseAmount,
  buildPercentageTipSuggestions,
  calculateActorTipBreakdown,
} from '../../state/useIosBillingCheckout';
import type { CvToCvPlusRequirements } from '../../state/useIosBillingCheckout';
import { CheckoutReceiptSection } from './checkout/CheckoutReceiptSection';
import { CheckoutTipAndDiamondSection } from './checkout/CheckoutTipAndDiamondSection';
import { CheckoutPaymentMethodSection } from './checkout/CheckoutPaymentMethodSection';
import { CheckoutVietQrModal } from './checkout/CheckoutVietQrModal';
import { CheckoutZaloConsentModal } from './checkout/CheckoutZaloConsentModal';
import { CheckoutPromotionPickerModal } from './checkout/CheckoutPromotionPickerModal';

interface Screen12CheckoutBillingProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  onBack: () => void;
  onChoosePayment: (
    method: 'CASH' | 'POS' | 'VIETQR',
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
      promotionId: number | null;
      appliedPromotion: IosPromotionOption | null;
    }
  ) => void;
  onSavePromotion?: (promotion: IosPromotionOption | null) => void;
  onEditService?: () => void;
}

export function Screen12CheckoutBilling({
  booking,
  actor,
  cvPlusRules,
  onBack,
  onChoosePayment,
  onSavePromotion,
  onEditService,
}: Screen12CheckoutBillingProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'POS' | 'VIETQR'>(
    booking?.billing?.paymentMethod || 'VIETQR'
  );
  const [tipAmount, setTipAmount] = useState<number>(booking?.billing?.tipAmount ?? 0);
  const [activeTipPercent, setActiveTipPercent] = useState<number | null>(null);
  const [isCustomTipOpen, setIsCustomTipOpen] = useState<boolean>(false);
  const [customTipInput, setCustomTipInput] = useState<string>('');
  const [diamondUsed, setDiamondUsed] = useState<number>(booking?.billing?.diamondUsed ?? 0);
  const [selectedPromotion, setSelectedPromotion] = useState<IosPromotionOption | null>(
    booking?.appliedPromotion ?? null
  );
  const [promotions, setPromotions] = useState<IosPromotionOption[]>([]);
  const [isPromotionsLoading, setIsPromotionsLoading] = useState<boolean>(false);
  const [promotionsError, setPromotionsError] = useState<string | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState<boolean>(false);
  const [showStaffRewards, setShowStaffRewards] = useState<boolean>(false);

  useEffect(() => {
    setShowStaffRewards(false);
    setSelectedPromotion(booking?.appliedPromotion ?? null);
    if (booking?.appliedPromotion?.isCreditAllowed === false) {
      setDiamondUsed(0);
    }
  }, [booking?.id, booking?.appliedPromotion]);

  const actorTier = actor?.tier;

  const loadPromotions = useCallback(
    async (signal?: AbortSignal) => {
      setIsPromotionsLoading(true);
      setPromotionsError(null);
      try {
        const res = await apiClient.ios.getPromotions({ role: actorTier }, { signal });
        if (!signal?.aborted && res?.success && Array.isArray(res.promotions)) {
          setPromotions(res.promotions);
        }
      } catch (err: any) {
        if (!signal?.aborted) {
          setPromotionsError(err?.message || 'Không thể tải danh sách khuyến mãi');
        }
      } finally {
        if (!signal?.aborted) {
          setIsPromotionsLoading(false);
        }
      }
    },
    [actorTier]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPromotions(controller.signal);
    return () => controller.abort();
  }, [loadPromotions]);

  const handleSelectPromotion = useCallback(
    (promo: IosPromotionOption | null) => {
      setSelectedPromotion(promo);
      if (promo && promo.isCreditAllowed === false) {
        setDiamondUsed(0);
      }
      onSavePromotion?.(promo);
    },
    [onSavePromotion]
  );
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isZaloModalOpen, setIsZaloModalOpen] = useState<boolean>(false);
  const [zaloPhone, setZaloPhone] = useState<string>(
    booking?.billing?.zaloConsent?.phone || booking?.customerPhone || '0938.204.567'
  );
  const [isSendingZalo, setIsSendingZalo] = useState<boolean>(false);
  const [isZaloSentSuccess, setIsZaloSentSuccess] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [transferProofPhoto, setTransferProofPhoto] = useState<string | null>(
    booking?.billing?.transferProofPhoto || null
  );
  const [proofCloudSyncStatus, setProofCloudSyncStatus] = useState<IosCloudSyncStatus>(
    booking?.billing?.transferProofPhoto ? 'synced' : 'idle'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCaptureProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let instantUrl: string | null = null;
    try {
      // 1. Phản hồi thị giác tức thời (0ms): Hiện ảnh ngay lập tức và kích hoạt spinner
      instantUrl = URL.createObjectURL(file);
      setTransferProofPhoto(instantUrl);
      setProofCloudSyncStatus('uploading');

      // 2. Nén ảnh canvas chuẩn iOS
      const compressed = await compressLashImage(file, 1024, 0.72);
      if (instantUrl) {
        try {
          URL.revokeObjectURL(instantUrl);
        } catch (_) {}
      }
      setTransferProofPhoto(compressed);

      // 3. Thời gian tối thiểu 850ms để mắt người nhận diện rõ animation xoay rồi chuyển sang synced
      await new Promise((resolve) => setTimeout(resolve, 850));
      setProofCloudSyncStatus('synced');
    } catch (err) {
      console.warn('[Screen12] Failed to process proof image:', err);
      setProofCloudSyncStatus('synced');
    }
    e.target.value = '';
  };

  const customerName = booking?.customerName || 'Chị Trúc';
  const customerPhone = (booking?.customerPhone || '0933.779.207').replace(/\*+\s*/g, '').trim();
  const assignedStaff = booking?.assignedStaffName || 'Thảo Ly';
  const checkInStaff = booking?.checkInStaffName || actor?.name || 'Thảo Ly';
  const checkOutStaff = booking?.checkOutStaffName || actor?.name || 'Thảo Ly';
  const serviceName = resolveDisplayServiceName(booking);
  const servicePrice = useMemo(() => {
    if (booking?.servicePrice && booking.servicePrice > 0) return booking.servicePrice;
    const menuDetail = getWingsMenuDetail(
      booking?.attributes?.material || serviceName || '',
      booking?.attributes?.count || '',
      booking?.attributes?.volume || ''
    );
    if (menuDetail) {
      const isRetainSvc =
        String(booking?.serviceType || '').toLowerCase() === 'retain' ||
        serviceName.toLowerCase().includes('dặm') ||
        serviceName.toLowerCase().includes('refill');
      return isRetainSvc ? menuDetail.refillPrice : menuDetail.newPrice;
    }
    return 770000;
  }, [
    booking?.servicePrice,
    booking?.attributes?.material,
    booking?.attributes?.count,
    booking?.attributes?.volume,
    booking?.serviceType,
    serviceName,
  ]);
  const upgradePrice = booking?.upgradePrice || 0;
  const selectedCombo = booking?.selectedCombo || null;
  const selectedUnderCombo = booking?.selectedUnderCombo || null;
  const comboRedemption = booking?.comboRedemption || null;
  const cartProducts = booking?.cartProducts || [];
  const isComboLive = Boolean(
    booking?.comboLiveStatus?.isComboLive &&
    (!selectedCombo || !selectedCombo.todayUsageMode || selectedCombo.todayUsageMode === 'USE_OLD_COMBO')
  );
  const hasUnderMinkCombo = Boolean(
    booking?.underMinkComboStatus?.hasUnderCombo && (booking?.underMinkComboStatus?.remainingSessions ?? 0) > 0
  );
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
  const comboTotal = (selectedCombo ? selectedCombo.price : 0) + (selectedUnderCombo ? selectedUnderCombo.price : 0);
  const productTotal = cartProducts.reduce((s, p) => s + p.price * p.quantity, 0);
  const subtotal = effectiveServiceCharge + comboTotal + productTotal;
  const vatRate = booking?.billing?.vatRate ?? 0.08;

  const promoBreakdown = useMemo(
    () =>
      calculateIosPromotionDiscount({
        promotion: selectedPromotion,
        serviceAmount: effectiveServiceCharge,
        upgradeAmount: upgradePrice,
        comboAmount: comboTotal,
        productAmount: productTotal,
        vatRate,
      }),
    [selectedPromotion, effectiveServiceCharge, upgradePrice, comboTotal, productTotal, vatRate]
  );

  const promotionDiscountAmount = selectedPromotion
    ? promoBreakdown.totalDiscount
    : booking?.promotionId && booking?.billing?.promotionDiscountAmount
      ? Math.max(0, Math.round(Number(booking.billing.promotionDiscountAmount) || 0))
      : 0;
  const appliedPromotionDisplayName =
    selectedPromotion?.name ?? (booking?.promotionId ? booking?.billing?.promotionName : undefined) ?? null;
  const subtotalAfterDiscount = Math.max(0, subtotal - promotionDiscountAmount);
  const vatAmount = selectedPromotion ? promoBreakdown.vatAmount : Math.round(subtotalAfterDiscount * vatRate);
  const totalWithVat = subtotalAfterDiscount + vatAmount;

  // CVL: NẾU MUA 2 COMBO CÙNG LÚC, CỘNG GỘP TỔNG TIỀN TRƯỚC RỒI TÍNH THƯỞNG THEO CÔNG THỨC CAREER_PROGRESSION_RULES (<2M = 50K, MỖI 1M KẾ TIẾP = 50K)
  // Trong kỳ Training (isTrainingCvlOrder): nếu CVL tự mở xem đơn (dù CC bấm checkout giùm), CVL vẫn thấy 100% thưởng của mình
  const isCheckoutStaffCc =
    actor?.tier === 'CC' || (!booking?.isTrainingCvlOrder && booking?.checkOutStaffTier === 'CC');
  const comboTotalRevenue =
    (selectedCombo ? Number(selectedCombo.price || 0) : 0) +
    (selectedUnderCombo ? Number(selectedUnderCombo.price || 0) : 0);
  const dualComboBonus = calculateDualComboTierBonus(
    selectedCombo ? Number(selectedCombo.price || 0) : 0,
    selectedUnderCombo ? Number(selectedUnderCombo.price || 0) : 0,
    cvPlusRules
  );
  const totalComboBonus = isCheckoutStaffCc ? 0 : dualComboBonus.totalBonus;
  const hasBothCombos = Boolean(selectedCombo && selectedUnderCombo && comboTotalRevenue > 0);

  // TỶ GIÁ VÍ KIM CƯƠNG: 1 💎 = 1.000 VNĐ (Khớp 100% legacy database & iOS App cũ)
  const DIAMOND_RATE = 1000;
  const customerDiamondBalance = booking?.diamondBalance ?? 0;
  const isCreditLockedByPromotion = Boolean(selectedPromotion && selectedPromotion.isCreditAllowed === false);
  const totalBeforeDiamond = totalWithVat + tipAmount;
  const maxDiamondCanUse = isCreditLockedByPromotion
    ? 0
    : Math.min(customerDiamondBalance, Math.floor(totalBeforeDiamond / DIAMOND_RATE));
  const effectiveDiamondUsed = isCreditLockedByPromotion ? 0 : Math.min(diamondUsed, maxDiamondCanUse);
  const diamondDiscountAmount = effectiveDiamondUsed * DIAMOND_RATE;
  const finalGrandTotal = Math.max(0, totalBeforeDiamond - diamondDiscountAmount);

  // GỢI Ý TIỀN TIP THEO % GIÁ TRỊ CA PHỤC VỤ (5% · 10% · 15% · 20%, LÀM TRÒN 10.000đ)
  // Luôn tính theo giá trị lẻ thực tế của dịch vụ + sản phẩm bán kèm (trước VAT 8% và trước trừ Kim Cương)
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

  // THÔNG TIN VIETQR CHUẨN GOOGLE SHEET WINGS (VCB 1024731897)
  const branchCode = booking?.branchCode || 'DT';
  const orderNumericCode = booking?.orderNumber?.replace(/\D/g, '') || String(booking?.id || '609609');
  const tipCode = tipAmount > 0 ? (tipAmount >= 1000 ? `${Math.round(tipAmount / 1000)}K` : String(tipAmount)) : '0';
  const qrTransferContent = `${branchCode} ${orderNumericCode} DV TIP ${tipCode}`;
  const vietQrUrl = `https://img.vietqr.io/image/VCB-1024731897-qr_only.png?amount=${finalGrandTotal}&addInfo=${encodeURIComponent(
    qrTransferContent
  )}&accountName=${encodeURIComponent("CONG TY TNHH WINGS' LIFE")}`;

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  const handleProceed = () => {
    if (selectedMethod === 'VIETQR' && finalGrandTotal > 0) {
      setIsQrModalOpen(true);
      return;
    }
    setIsZaloModalOpen(true);
  };

  const handleConfirmQrPaid = () => {
    setIsQrModalOpen(false);
    setIsZaloModalOpen(true);
  };

  const handleConfirmZaloSend = () => {
    setIsSendingZalo(true);
    setTimeout(() => {
      setIsSendingZalo(false);
      setIsZaloSentSuccess(true);
      setTimeout(() => {
        setIsZaloModalOpen(false);
        setIsZaloSentSuccess(false);
        onChoosePayment(
          selectedMethod,
          tipAmount,
          effectiveDiamondUsed,
          transferProofPhoto || undefined,
          {
            agreed: true,
            phone: zaloPhone,
            sentAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            voucherCode: 'WINGS50K-ZALO',
          },
          {
            promotionId: selectedPromotion?.promotionId ?? null,
            appliedPromotion: selectedPromotion,
          }
        );
      }, 600);
    }, 700);
  };

  const handleSkipZalo = () => {
    setIsZaloModalOpen(false);
    onChoosePayment(
      selectedMethod,
      tipAmount,
      effectiveDiamondUsed,
      transferProofPhoto || undefined,
      {
        agreed: false,
        phone: zaloPhone,
      },
      {
        promotionId: selectedPromotion?.promotionId ?? null,
        appliedPromotion: selectedPromotion,
      }
    );
  };

  return (
    <div className={`flex-1 flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-y-auto select-none`}>
      <IosNavigationBar
        title="Thanh Toán"
        onBack={onBack}
        backTitle={booking?.orderNumber || 'Order'}
        rightAction={
          <div className="flex items-center gap-1.5">
            <IosStaffVisibilityToggle
              showStaffRewards={showStaffRewards}
              onToggle={() => setShowStaffRewards((prev) => !prev)}
              isDark={isDark}
            />
            <button
              onClick={handleProceed}
              className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60 cursor-pointer"
            >
              Chốt đơn
            </button>
          </div>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
        {showStaffRewards && booking?.isTrainingCvlOrder && actor?.tier === 'CC' && (
          <div
            className={`rounded-2xl border p-3 text-xs ${
              isDark
                ? 'bg-amber-950/40 border-amber-700/50 text-amber-100'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between gap-2 font-bold">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Ca Đào Tạo</span>
                <CvFeather1Badge className="text-[11px] text-amber-500" />
                <span>{assignedStaff}</span>
              </span>
              {booking.trainingMentorName && (
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300">
                  Mentor: CC {booking.trainingMentorName}
                </span>
              )}
            </div>
            <p className={`mt-1 leading-relaxed text-[11px] ${isDark ? 'text-amber-200/90' : 'text-amber-900/90'}`}>
              100% thưởng Gói Combo
              {dualComboBonus.totalBonus > 0 ? ` (+${dualComboBonus.totalBonus.toLocaleString('vi-VN')}đ)` : ''}, Dưỡng
              mi &amp; +20% Tip ca này cộng trực tiếp cho <strong>{assignedStaff}</strong>. CC bấm Check-out giùm nhận{' '}
              <strong className="tabular-nums">0đ</strong> ca này &bull; Cuối tháng Mentor CC nhận{' '}
              <strong className="tabular-nums">1.000.000đ + 50%</strong> khi tỷ lệ Combo &ge; 20%.
            </p>
          </div>
        )}

        <CheckoutReceiptSection
          isDark={isDark}
          booking={booking}
          customerName={customerName}
          customerPhone={customerPhone}
          assignedStaff={assignedStaff}
          checkInStaff={checkInStaff}
          checkOutStaff={checkOutStaff}
          serviceName={serviceName}
          servicePrice={servicePrice}
          effectiveServiceCharge={effectiveServiceCharge}
          upgradePrice={upgradePrice}
          isComboLive={isComboLive}
          selectedCombo={selectedCombo}
          selectedUnderCombo={selectedUnderCombo}
          comboRedemption={comboRedemption}
          cartProducts={cartProducts}
          hasBothCombos={hasBothCombos}
          comboTotalRevenue={comboTotalRevenue}
          totalComboBonus={totalComboBonus}
          upperComboBonus={isCheckoutStaffCc ? 0 : dualComboBonus.upperBonus}
          underComboBonus={isCheckoutStaffCc ? 0 : dualComboBonus.underBonus}
          isCheckoutStaffCc={isCheckoutStaffCc}
          subtotal={subtotal}
          vatAmount={vatAmount}
          appliedPromotionName={appliedPromotionDisplayName}
          promotionDiscountAmount={promotionDiscountAmount}
          tipAmount={tipAmount}
          effectiveDiamondUsed={effectiveDiamondUsed}
          diamondDiscountAmount={diamondDiscountAmount}
          finalGrandTotal={finalGrandTotal}
          showStaffRewards={showStaffRewards}
          onToggleShowStaffRewards={() => setShowStaffRewards((prev) => !prev)}
          onEditService={onEditService}
        />

        <CheckoutTipAndDiamondSection
          isDark={isDark}
          tipAmount={tipAmount}
          onSetTipAmount={setTipAmount}
          activeTipPercent={activeTipPercent}
          onSetActiveTipPercent={setActiveTipPercent}
          isCustomTipOpen={isCustomTipOpen}
          onSetIsCustomTipOpen={setIsCustomTipOpen}
          customTipInput={customTipInput}
          onSetCustomTipInput={setCustomTipInput}
          percentTipSuggestions={percentTipSuggestions}
          tipBaseAmount={tipBaseAmount}
          showStaffRewards={showStaffRewards}
          actorTipBreakdown={actorTipBreakdown}
          customerDiamondBalance={customerDiamondBalance}
          maxDiamondCanUse={maxDiamondCanUse}
          effectiveDiamondUsed={effectiveDiamondUsed}
          diamondDiscountAmount={diamondDiscountAmount}
          diamondRate={DIAMOND_RATE}
          onSetDiamondUsed={setDiamondUsed}
          selectedPromotion={selectedPromotion}
          promotionDiscountAmount={promotionDiscountAmount}
          promotionCount={promotions.length}
          onOpenPromotionPicker={() => {
            setIsPromotionModalOpen(true);
            if (promotions.length === 0 && !isPromotionsLoading) {
              void loadPromotions();
            }
          }}
          onClearPromotion={() => handleSelectPromotion(null)}
          isCreditLockedByPromotion={isCreditLockedByPromotion}
        />

        <CheckoutPaymentMethodSection
          isDark={isDark}
          showStaffRewards={showStaffRewards}
          canDirectCounterSettle={canDirectlySettleCounterPayment(actor?.tier)}
          selectedMethod={selectedMethod}
          onSelectMethod={setSelectedMethod}
          finalGrandTotal={finalGrandTotal}
          effectiveDiamondUsed={effectiveDiamondUsed}
          diamondDiscountAmount={diamondDiscountAmount}
          transferProofPhoto={transferProofPhoto}
          proofCloudSyncStatus={proofCloudSyncStatus}
          fileInputRef={fileInputRef}
          onCaptureProof={handleCaptureProof}
          onProceed={handleProceed}
        />
      </div>

      <CheckoutVietQrModal
        open={isQrModalOpen}
        isDark={isDark}
        branchCode={branchCode}
        vietQrUrl={vietQrUrl}
        qrTransferContent={qrTransferContent}
        finalGrandTotal={finalGrandTotal}
        copySuccess={copySuccess}
        onCopyToClipboard={copyToClipboard}
        transferProofPhoto={transferProofPhoto}
        proofCloudSyncStatus={proofCloudSyncStatus}
        onTriggerFilePicker={() => fileInputRef.current?.click()}
        onConfirmQrPaid={handleConfirmQrPaid}
        onClose={() => setIsQrModalOpen(false)}
      />

      <CheckoutZaloConsentModal
        open={isZaloModalOpen}
        isDark={isDark}
        customerName={customerName}
        customerPhone={customerPhone}
        zaloPhone={zaloPhone}
        onSetZaloPhone={setZaloPhone}
        isSendingZalo={isSendingZalo}
        isZaloSentSuccess={isZaloSentSuccess}
        onConfirmZaloSend={handleConfirmZaloSend}
        onSkipZalo={handleSkipZalo}
      />

      <CheckoutPromotionPickerModal
        open={isPromotionModalOpen}
        isDark={isDark}
        promotions={promotions}
        isLoading={isPromotionsLoading}
        error={promotionsError}
        selectedPromotionId={selectedPromotion?.promotionId ?? booking?.promotionId ?? null}
        customerVisits={booking?.customerVisits ?? 1}
        serviceAmount={effectiveServiceCharge}
        upgradeAmount={upgradePrice}
        comboAmount={comboTotal}
        productAmount={productTotal}
        vatRate={vatRate}
        onSelectPromotion={handleSelectPromotion}
        onClose={() => setIsPromotionModalOpen(false)}
      />
    </div>
  );
}
