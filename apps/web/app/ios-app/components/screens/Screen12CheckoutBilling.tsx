'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { compressLashImage } from '../../utils/imageCompressor';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { IosCloudSyncStatus } from '../ui-kit/IosCloudSyncBadge';
import {
  calculateCvComboTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
} from '../../state/useIosBillingCheckout';
import { CheckoutReceiptSection } from './checkout/CheckoutReceiptSection';
import { CheckoutTipAndDiamondSection } from './checkout/CheckoutTipAndDiamondSection';
import { CheckoutPaymentMethodSection } from './checkout/CheckoutPaymentMethodSection';
import { CheckoutVietQrModal } from './checkout/CheckoutVietQrModal';
import { CheckoutZaloConsentModal } from './checkout/CheckoutZaloConsentModal';

interface Screen12CheckoutBillingProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
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
    }
  ) => void;
  onEditService?: () => void;
}

export function Screen12CheckoutBilling({
  booking,
  actor,
  onBack,
  onChoosePayment,
  onEditService,
}: Screen12CheckoutBillingProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'POS' | 'VIETQR'>(
    booking?.billing?.paymentMethod || 'VIETQR'
  );
  const [tipAmount, setTipAmount] = useState<number>(booking?.billing?.tipAmount ?? 0);
  const [activeRoundTarget, setActiveRoundTarget] = useState<number | null>(null);
  const [isCustomTipOpen, setIsCustomTipOpen] = useState<boolean>(false);
  const [customTipInput, setCustomTipInput] = useState<string>('');
  const [diamondUsed, setDiamondUsed] = useState<number>(booking?.billing?.diamondUsed ?? 0);
  const [showStaffRewards, setShowStaffRewards] = useState<boolean>(false);
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
  const servicePrice = booking?.servicePrice || 770000;
  const upgradePrice = booking?.upgradePrice || 0;
  const selectedCombo = booking?.selectedCombo || null;
  const selectedUnderCombo = booking?.selectedUnderCombo || null;
  const comboRedemption = booking?.comboRedemption || null;
  const cartProducts = booking?.cartProducts || [];
  const isComboLive = Boolean(booking?.comboLiveStatus?.isComboLive);
  const effectiveServiceCharge = resolveEffectiveServiceTotal({
    servicePrice,
    upgradePrice,
    isComboLive,
    comboRedemption,
    selectedCombo,
  });
  const actorTipBreakdown = useMemo(
    () => calculateActorTipBreakdown(booking, actor, tipAmount),
    [booking, actor, tipAmount]
  );
  const subtotal =
    effectiveServiceCharge +
    (selectedCombo ? selectedCombo.price : 0) +
    (selectedUnderCombo ? selectedUnderCombo.price : 0) +
    cartProducts.reduce((s, p) => s + p.price * p.quantity, 0);
  const vatRate = booking?.billing?.vatRate ?? 0.08;
  const vatAmount = Math.round(subtotal * vatRate);
  const totalWithVat = subtotal + vatAmount;

  // CVL: TÍNH THƯỞNG COMBO DỰA TRÊN TỔNG DOANH THU COMBO THU ĐƯỢC (GỘP 2 GÓI NẾU CÓ)
  const comboTotalRevenue =
    (selectedCombo ? Number(selectedCombo.price || 0) : 0) +
    (selectedUnderCombo ? Number(selectedUnderCombo.price || 0) : 0);
  const totalComboBonus = calculateCvComboTierBonus(comboTotalRevenue);
  const hasBothCombos = Boolean(selectedCombo && selectedUnderCombo && comboTotalRevenue > 0);

  // TỶ GIÁ VÍ KIM CƯƠNG: 1 💎 = 1.000 VNĐ (Khớp 100% legacy database & iOS App cũ)
  const DIAMOND_RATE = 1000;
  const customerDiamondBalance = booking?.diamondBalance ?? 0;
  const totalBeforeDiamond = totalWithVat + tipAmount;
  const maxDiamondCanUse = Math.min(customerDiamondBalance, Math.floor(totalBeforeDiamond / DIAMOND_RATE));
  const effectiveDiamondUsed = Math.min(diamondUsed, maxDiamondCanUse);
  const diamondDiscountAmount = effectiveDiamondUsed * DIAMOND_RATE;
  const finalGrandTotal = Math.max(0, totalBeforeDiamond - diamondDiscountAmount);

  // GỢI Ý LÀM TRÒN TỔNG TIỀN (ROUND-UP EVEN TOTAL)
  // Tính dựa trên tổng tiền trước khi cộng tip (sau khi trừ kim cương nếu có)
  const baseForRounding = Math.max(0, totalWithVat - diamondDiscountAmount);

  const roundUpSuggestions = useMemo(() => {
    if (baseForRounding <= 0) return [];
    const list: { targetTotal: number; tipAmount: number; label: string }[] = [];

    // Mốc 1: Làm tròn lên hàng 100K gần nhất (đảm bảo số tiền tip >= 15.000đ để có ý nghĩa)
    const ceil100k = Math.ceil(baseForRounding / 100000) * 100000;
    const target1 = ceil100k - baseForRounding >= 15000 ? ceil100k : ceil100k + 100000;
    list.push({
      targetTotal: target1,
      tipAmount: target1 - baseForRounding,
      label: `Tròn ${Math.round(target1 / 1000).toLocaleString('vi-VN')}K`,
    });

    if (baseForRounding < 1000000) {
      if (target1 < 1000000) {
        list.push({
          targetTotal: 1000000,
          tipAmount: 1000000 - baseForRounding,
          label: 'Tròn 1.000K',
        });
      }
      list.push({
        targetTotal: 1200000,
        tipAmount: 1200000 - baseForRounding,
        label: 'Tròn 1.200K',
      });
    } else {
      const next500k = Math.ceil((baseForRounding + 50000) / 500000) * 500000;
      const target2 = next500k > target1 ? next500k : target1 + 200000;
      list.push({
        targetTotal: target2,
        tipAmount: target2 - baseForRounding,
        label: `Tròn ${Math.round(target2 / 1000).toLocaleString('vi-VN')}K`,
      });
      list.push({
        targetTotal: target2 + 300000,
        tipAmount: target2 + 300000 - baseForRounding,
        label: `Tròn ${Math.round((target2 + 300000) / 1000).toLocaleString('vi-VN')}K`,
      });
    }
    return list.slice(0, 3);
  }, [baseForRounding]);

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
        onChoosePayment(selectedMethod, tipAmount, effectiveDiamondUsed, transferProofPhoto || undefined, {
          agreed: true,
          phone: zaloPhone,
          sentAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          voucherCode: 'WINGS50K-ZALO',
        });
      }, 600);
    }, 700);
  };

  const handleSkipZalo = () => {
    setIsZaloModalOpen(false);
    onChoosePayment(selectedMethod, tipAmount, effectiveDiamondUsed, transferProofPhoto || undefined, {
      agreed: false,
      phone: zaloPhone,
    });
  };

  return (
    <div
      className={`flex-1 flex flex-col ${isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-neutral-900'} overflow-y-auto select-none`}
    >
      <IosNavigationBar
        title="Thanh Toán"
        onBack={onBack}
        backTitle={booking?.orderNumber || 'Order'}
        rightAction={
          <button
            onClick={handleProceed}
            className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60"
          >
            Chốt đơn
          </button>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
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
          upgradePrice={upgradePrice}
          isComboLive={isComboLive}
          selectedCombo={selectedCombo}
          selectedUnderCombo={selectedUnderCombo}
          comboRedemption={comboRedemption}
          cartProducts={cartProducts}
          hasBothCombos={hasBothCombos}
          comboTotalRevenue={comboTotalRevenue}
          totalComboBonus={totalComboBonus}
          subtotal={subtotal}
          vatAmount={vatAmount}
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
          activeRoundTarget={activeRoundTarget}
          onSetActiveRoundTarget={setActiveRoundTarget}
          isCustomTipOpen={isCustomTipOpen}
          onSetIsCustomTipOpen={setIsCustomTipOpen}
          customTipInput={customTipInput}
          onSetCustomTipInput={setCustomTipInput}
          roundUpSuggestions={roundUpSuggestions}
          showStaffRewards={showStaffRewards}
          actorTipBreakdown={actorTipBreakdown}
          customerDiamondBalance={customerDiamondBalance}
          maxDiamondCanUse={maxDiamondCanUse}
          effectiveDiamondUsed={effectiveDiamondUsed}
          diamondDiscountAmount={diamondDiscountAmount}
          diamondRate={DIAMOND_RATE}
          onSetDiamondUsed={setDiamondUsed}
        />

        <CheckoutPaymentMethodSection
          isDark={isDark}
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
    </div>
  );
}
