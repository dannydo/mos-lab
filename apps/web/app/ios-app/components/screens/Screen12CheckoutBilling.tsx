'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { compressLashImage } from '../../utils/imageCompressor';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { CvFeather1Badge, FeatherSvg } from '../ui-kit/CvFeatherLabels';
import { IosCloudSyncBadge, IosCloudSyncStatus } from '../ui-kit/IosCloudSyncBadge';
import { Heart, Sparkles, Eye, EyeOff } from 'lucide-react';
import {
  calculateCvComboTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
} from '../../state/useIosBillingCheckout';

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

function cleanComboTitle(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\(\d+\s*lần\)/gi, '').trim();
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
  const originalBookedPrice = booking?.originalBookedServicePrice || servicePrice;
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

  // 🪶 TÍNH THƯỞNG COMBO CVL DỰA TRÊN TỔNG DOANH THU COMBO THU ĐƯỢC (GỘP 2 GÓI NẾU CÓ)
  const comboTotalRevenue =
    (selectedCombo ? Number(selectedCombo.price || 0) : 0) +
    (selectedUnderCombo ? Number(selectedUnderCombo.price || 0) : 0);
  const totalComboBonus = calculateCvComboTierBonus(comboTotalRevenue);
  const hasBothCombos = Boolean(selectedCombo && selectedUnderCombo && comboTotalRevenue > 0);

  // 💎 TỶ GIÁ VÍ KIM CƯƠNG: 1 💎 = 1.000 VNĐ (Khớp 100% legacy database & iOS App cũ)
  const DIAMOND_RATE = 1000;
  const customerDiamondBalance = booking?.diamondBalance ?? 0;
  const totalBeforeDiamond = totalWithVat + tipAmount;
  const maxDiamondCanUse = Math.min(customerDiamondBalance, Math.floor(totalBeforeDiamond / DIAMOND_RATE));
  const effectiveDiamondUsed = Math.min(diamondUsed, maxDiamondCanUse);
  const diamondDiscountAmount = effectiveDiamondUsed * DIAMOND_RATE;
  const finalGrandTotal = Math.max(0, totalBeforeDiamond - diamondDiscountAmount);

  // 🎯 GỢI Ý LÀM TRÒN TỔNG TIỀN (ROUND-UP EVEN TOTAL)
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

  // 🏦 THÔNG TIN VIETQR CHUẨN GOOGLE SHEET WINGS (VCB 1024731897)
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
    // Với POS / Tiền mặt / 100% Kim Cương: mở Modal xin phép gửi hóa đơn qua Zalo
    setIsZaloModalOpen(true);
  };

  const handleConfirmQrPaid = () => {
    setIsQrModalOpen(false);
    // Sau khi bấm "Đã nhận tiền thành công · Xuất hóa đơn", mở Zalo Modal xin phép gửi hóa đơn
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
        {/* Customer & Specialist iOS Minimal Card */}
        <div
          className={`${
            isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-neutral-200/80'
          } rounded-2xl p-3 shadow-2xs border flex items-center gap-3`}
        >
          {/* Customer Avatar */}
          <div className="relative w-11 h-11 flex-shrink-0">
            <div
              className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-neutral-900 border ${
                isDark ? 'border-neutral-700' : 'border-neutral-200'
              } shadow-xs`}
            >
              {booking?.customerAvatar ? (
                <img
                  src={booking.customerAvatar}
                  alt={customerName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/ios-assets/no-image.png';
                  }}
                />
              ) : (
                <img src="/ios-assets/no-image.png" alt="No Image" className="w-full h-full object-cover" />
              )}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 ${
                isDark ? 'border-neutral-900' : 'border-white'
              } animate-pulse`}
            />
          </div>

          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div
                className={`text-[15px] font-black ${isDark ? 'text-white' : 'text-neutral-900'} tracking-tight truncate`}
              >
                {customerName} ·{' '}
                <span className={`tabular-nums font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {customerPhone}
                </span>
              </div>
              <div
                className={`text-[11.5px] ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                } mt-0.5 font-semibold flex items-center gap-1 flex-wrap`}
              >
                <span>
                  Chuyên viên:{' '}
                  <strong className={isDark ? 'text-neutral-200' : 'text-neutral-900'}>{assignedStaff}</strong>
                </span>
                <CvFeather1Badge />
                {(checkInStaff !== assignedStaff || checkOutStaff !== assignedStaff) && (
                  <span className={`${isDark ? 'text-neutral-500' : 'text-neutral-400'} text-[10.5px] font-normal`}>
                    (In: {checkInStaff} · Out: {checkOutStaff})
                  </span>
                )}
              </div>
            </div>
            <span className="bg-emerald-500 text-white font-black text-[10.5px] px-2.5 py-1 rounded-full shadow-2xs shrink-0 tracking-tight">
              Đã Check-out
            </span>
          </div>
        </div>

        {/* Section 1: Chi Tiết Hóa Đơn Chuẩn Apple Receipt */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider px-1 mb-1.5">
            <span className={isDark ? 'text-neutral-400' : 'text-neutral-500'}>Chi Tiết Hóa Đơn</span>
            <button
              type="button"
              onClick={() => setShowStaffRewards((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer select-none active:scale-95 ${
                showStaffRewards
                  ? isDark
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-700/60 shadow-xs'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                  : isDark
                    ? 'bg-neutral-800/90 text-neutral-400 hover:text-neutral-200 border border-neutral-700'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-800 border border-gray-200'
              }`}
            >
              {showStaffRewards ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="inline-flex items-center gap-1">
                    <span>Ẩn</span>
                    <FeatherSvg className="w-3 h-3 text-amber-500" />
                  </span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="inline-flex items-center gap-1">
                    <span>Xem</span>
                    <FeatherSvg className="w-3 h-3 text-amber-500" />
                  </span>
                </>
              )}
            </button>
          </div>
          <div
            className={`${
              isDark
                ? 'bg-neutral-900/90 border-neutral-800 divide-neutral-800/80'
                : 'bg-white border-neutral-200/80 divide-neutral-100'
            } rounded-2xl shadow-2xs border overflow-hidden divide-y`}
          >
            {/* Item 1: Service */}
            <div className="p-3.5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[13px] font-extrabold ${isDark ? 'text-white' : 'text-neutral-900'} tracking-tight`}
                  >
                    {serviceName}
                  </span>
                  {onEditService && (
                    <button
                      type="button"
                      onClick={onEditService}
                      title="Đổi dịch vụ / Nâng cấp"
                      aria-label="Đổi dịch vụ"
                      className={`w-5 h-5 rounded-full ${
                        isDark
                          ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      } border transition-colors inline-flex items-center justify-center text-[10px] active:scale-90 cursor-pointer shadow-2xs`}
                    >
                      ✏️
                    </button>
                  )}
                </div>
                <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'} font-medium`}>
                  {assignedStaff}
                  {booking?.attributes?.style ? ` · Dáng ${booking.attributes.style}` : ''}
                </div>
                {selectedCombo ? (
                  selectedCombo.todaySingleServiceWaived ? (
                    <div className="pt-0.5">
                      <span
                        className={`inline-flex items-center text-[10px] font-bold ${
                          isDark
                            ? 'text-emerald-300 bg-emerald-950/40 border-emerald-500/40'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        } border px-1.5 py-0.5 rounded`}
                      >
                        Trừ Buổi 1 (Miễn phí ca này)
                      </span>
                    </div>
                  ) : (
                    <div className="pt-0.5">
                      <span
                        className={`inline-flex items-center text-[10px] font-bold ${
                          isDark
                            ? 'text-indigo-300 bg-indigo-950/40 border-indigo-500/40'
                            : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                        } border px-1.5 py-0.5 rounded`}
                      >
                        Trả lẻ ca này · Giữ trọn số buổi gói
                      </span>
                    </div>
                  )
                ) : comboRedemption ? (
                  <div className="pt-0.5 flex items-center gap-1.5 flex-wrap text-[10px]">
                    <span
                      className={`font-bold ${
                        isDark
                          ? 'text-sky-300 bg-sky-950/40 border-sky-500/40'
                          : 'text-sky-700 bg-sky-50 border-sky-200'
                      } border px-1.5 py-0.5 rounded`}
                    >
                      Trừ 1 lượt gói ({comboRedemption.comboName || 'Gói cũ'})
                    </span>
                    <span className={`${isDark ? 'text-neutral-400' : 'text-neutral-400'} font-semibold tabular-nums`}>
                      Ví còn: ✦ {comboRedemption.paidRemaining ?? 0} · ↻ {comboRedemption.bonusRemaining ?? 0}
                    </span>
                  </div>
                ) : (
                  upgradePrice > 0 && (
                    <div className="pt-0.5">
                      <span
                        className={`inline-flex items-center text-[10px] font-bold ${
                          isDark
                            ? 'text-emerald-300 bg-emerald-950/40 border-emerald-500/40'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        } border px-1.5 py-0.5 rounded tabular-nums`}
                      >
                        Nâng cấp (+{upgradePrice.toLocaleString('vi-VN')}đ)
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Price: Zero-Drop 'đ' invariant */}
              <div className="text-right shrink-0">
                {comboRedemption ? (
                  <div className="space-y-0.5">
                    <span
                      className={`text-[13px] ${isDark ? 'text-sky-300' : 'text-sky-800'} font-black tabular-nums whitespace-nowrap block`}
                    >
                      {comboRedemption.totalCustomerPayToday > 0
                        ? `+${comboRedemption.totalCustomerPayToday.toLocaleString('vi-VN')}đ`
                        : '0đ'}
                    </span>
                    <span
                      className={`text-[10px] ${
                        isDark
                          ? 'text-sky-300 bg-sky-950/50 border-sky-500/40'
                          : 'text-sky-700 bg-sky-50 border-sky-200'
                      } font-bold px-1.5 py-0.5 rounded border whitespace-nowrap inline-block`}
                    >
                      Trừ 1 lượt
                    </span>
                  </div>
                ) : selectedCombo ? (
                  selectedCombo.todaySingleServiceWaived !== false ? (
                    <div className="space-y-0.5">
                      <span
                        className={`text-[13px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-black tabular-nums whitespace-nowrap block`}
                      >
                        0đ
                      </span>
                      <span
                        className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-neutral-400'} line-through tabular-nums whitespace-nowrap block`}
                      >
                        {servicePrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  ) : (
                    <span
                      className={`text-[13px] ${isDark ? 'text-white' : 'text-neutral-900'} font-black tabular-nums whitespace-nowrap block`}
                    >
                      {servicePrice.toLocaleString('vi-VN')}đ
                    </span>
                  )
                ) : isComboLive ? (
                  <div className="space-y-0.5">
                    <span
                      className={`text-[13px] ${isDark ? 'text-sky-300' : 'text-sky-800'} font-black tabular-nums whitespace-nowrap block`}
                    >
                      {upgradePrice > 0 ? `+${upgradePrice.toLocaleString('vi-VN')}đ` : '0đ'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap inline-block ${
                        upgradePrice > 0
                          ? isDark
                            ? 'text-emerald-300 bg-emerald-950/50 border-emerald-500/40'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : isDark
                            ? 'text-sky-300 bg-sky-950/50 border-sky-500/40'
                            : 'text-sky-700 bg-sky-50 border-sky-200'
                      }`}
                    >
                      {upgradePrice > 0 ? 'Phụ thu' : 'Trừ lượt'}
                    </span>
                  </div>
                ) : (
                  <span
                    className={`text-[13px] ${isDark ? 'text-white' : 'text-neutral-900'} font-black tabular-nums whitespace-nowrap block`}
                  >
                    {servicePrice.toLocaleString('vi-VN')}đ
                  </span>
                )}
              </div>
            </div>

            {/* Item 2: Combo if selected */}
            {selectedCombo && (
              <div
                className={`p-3.5 flex items-start justify-between gap-3 ${isDark ? 'bg-amber-950/20' : 'bg-amber-50/30'}`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[13px] font-black ${isDark ? 'text-white' : 'text-neutral-900'} tracking-tight`}
                    >
                      {cleanComboTitle(selectedCombo.name)}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-2 flex-wrap text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'} font-medium`}
                  >
                    <span>
                      {selectedCombo.sessions || selectedCombo.remainingAfterToday?.totalRemaining || 10} buổi
                    </span>
                    {!hasBothCombos && showStaffRewards && (
                      <>
                        <span className={isDark ? 'text-neutral-600' : 'text-neutral-300'}>•</span>
                        <span
                          className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold inline-flex items-center gap-0.5`}
                        >
                          Thưởng chốt: +{Math.round(totalComboBonus / 1000)}
                          <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[13px] ${isDark ? 'text-white' : 'text-neutral-900'} font-black tabular-nums whitespace-nowrap shrink-0`}
                >
                  {selectedCombo.price.toLocaleString('vi-VN')}đ
                </span>
              </div>
            )}

            {/* Item 2B: Under Lash Combo if selected */}
            {selectedUnderCombo && (
              <div
                className={`p-3.5 flex items-start justify-between gap-3 ${isDark ? 'bg-purple-950/20' : 'bg-purple-50/30'}`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[13px] font-black ${isDark ? 'text-white' : 'text-neutral-900'} tracking-tight`}
                    >
                      {cleanComboTitle(selectedUnderCombo.name)}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-2 flex-wrap text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'} font-medium`}
                  >
                    <span>{selectedUnderCombo.sessions || 10} buổi (Mi Dưới)</span>
                    {!hasBothCombos && showStaffRewards && (
                      <>
                        <span className={isDark ? 'text-neutral-600' : 'text-neutral-300'}>•</span>
                        <span
                          className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold inline-flex items-center gap-0.5`}
                        >
                          Thưởng chốt: +{Math.round(totalComboBonus / 1000)}
                          <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[13px] ${isDark ? 'text-white' : 'text-neutral-900'} font-black tabular-nums whitespace-nowrap shrink-0`}
                >
                  {selectedUnderCombo.price.toLocaleString('vi-VN')}đ
                </span>
              </div>
            )}

            {/* Item 2C: Combined 2-Combo Bonus Tier Banner */}
            {hasBothCombos && showStaffRewards && (
              <div
                className={`px-3.5 py-2.5 flex items-center justify-between text-[11.5px] border-t ${
                  isDark
                    ? 'bg-gradient-to-r from-amber-950/40 to-purple-950/40 text-amber-200 border-amber-900/40'
                    : 'bg-gradient-to-r from-amber-50 to-purple-50 text-amber-950 border-amber-200/70'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-bold truncate">
                    Thưởng chốt Combo (Gộp 2 gói · {comboTotalRevenue.toLocaleString('vi-VN')}đ):
                  </span>
                </div>
                <span
                  className={`${
                    isDark
                      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  } font-black tabular-nums border px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0 text-[12px]`}
                >
                  +{Math.round(totalComboBonus / 1000)}
                  <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                </span>
              </div>
            )}

            {/* Item 3: Products */}
            {cartProducts.map((p, idx) => (
              <div key={idx} className="p-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className={`text-[13px] font-bold ${isDark ? 'text-white' : 'text-neutral-900'} truncate`}>
                    {p.productName}
                  </div>
                  <div
                    className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'} font-medium inline-flex items-center gap-1`}
                  >
                    <span>SL: {p.quantity}</span>
                    {showStaffRewards && (
                      <>
                        <span className={isDark ? 'text-neutral-600' : 'text-neutral-300'}>•</span>
                        <span
                          className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold inline-flex items-center gap-0.5`}
                        >
                          Thưởng: +{Math.round(((p.cvBonus || 100000) * p.quantity) / 1000)}
                          <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[13px] ${isDark ? 'text-white' : 'text-neutral-900'} font-black tabular-nums whitespace-nowrap shrink-0`}
                >
                  {(p.price * p.quantity).toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))}

            {/* Subtotal & VAT Rows */}
            <div
              className={`p-3.5 ${isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50/50 border-neutral-100'} space-y-1.5 border-t text-[12px]`}
            >
              <div
                className={`flex items-center justify-between ${isDark ? 'text-neutral-400' : 'text-neutral-500'} font-medium`}
              >
                <span>Tạm tính dịch vụ & SP:</span>
                <span
                  className={`${isDark ? 'text-neutral-200' : 'text-neutral-900'} font-bold tabular-nums whitespace-nowrap shrink-0`}
                >
                  {subtotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div
                className={`flex items-center justify-between ${isDark ? 'text-neutral-400' : 'text-neutral-500'} font-medium`}
              >
                <span>Thuế VAT (8%):</span>
                <span
                  className={`${isDark ? 'text-neutral-200' : 'text-neutral-900'} font-bold tabular-nums whitespace-nowrap shrink-0`}
                >
                  +{vatAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
              {tipAmount > 0 && (
                <div
                  className={`flex items-center justify-between ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-semibold`}
                >
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                    <span>Tiền tip chuyên viên:</span>
                  </span>
                  <span className="font-black tabular-nums whitespace-nowrap shrink-0">
                    +{tipAmount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
              {effectiveDiamondUsed > 0 && (
                <div
                  className={`flex items-center justify-between font-bold px-2.5 py-1.5 rounded-xl border ${
                    isDark
                      ? 'text-cyan-300 bg-cyan-950/40 border-cyan-800/60'
                      : 'text-cyan-800 bg-cyan-50/80 border-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>💎 Thanh toán Kim Cương:</span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded border tabular-nums ${
                        isDark
                          ? 'text-cyan-300 bg-neutral-900 border-cyan-700'
                          : 'text-cyan-800 bg-white border-cyan-300'
                      }`}
                    >
                      {effectiveDiamondUsed} 💎
                    </span>
                  </div>
                  <span className="font-black tabular-nums whitespace-nowrap shrink-0">
                    -{diamondDiscountAmount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
            </div>

            {/* Total Row */}
            <div
              className={`p-3.5 ${
                isDark ? 'bg-[#251B08] border-amber-500/30' : 'bg-[#FFFBEB] border-amber-200/80'
              } flex items-center justify-between border-t`}
            >
              <div>
                <span
                  className={`text-[13px] font-black ${isDark ? 'text-amber-200' : 'text-neutral-900'} tracking-tight block`}
                >
                  TỔNG TIỀN THANH TOÁN
                </span>
                <span className={`text-[10.5px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'} font-medium`}>
                  {effectiveDiamondUsed > 0
                    ? `Đã cấn trừ ${effectiveDiamondUsed} 💎 (-${diamondDiscountAmount.toLocaleString('vi-VN')}đ)`
                    : tipAmount > 0
                      ? 'Đã gồm Dịch vụ + 8% VAT + Tiền tip'
                      : 'Đã bao gồm 8% thuế VAT'}
                </span>
              </div>
              <span className="text-[20px] font-black text-[#FF9500] tabular-nums whitespace-nowrap shrink-0 tracking-tight">
                {finalGrandTotal.toLocaleString('vi-VN')}đ
              </span>
            </div>

            {/* CV Rotation Points Recording Banner */}
            {booking?.cvRotationPoints && showStaffRewards && (
              <div
                className={`px-3.5 py-2.5 ${
                  isDark ? 'bg-blue-950/40 border-blue-900/60' : 'bg-blue-50/60 border-blue-100'
                } border-t flex items-center justify-between text-[11.5px]`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                  <span className={`font-black ${isDark ? 'text-blue-300' : 'text-blue-950'} shrink-0`}>
                    ◔ Vòng xoay CV:
                  </span>
                  <span className={`text-[11px] ${isDark ? 'text-blue-400' : 'text-blue-700'} font-medium truncate`}>
                    {booking.cvRotationBreakdown || 'Điểm thưởng ca'}
                  </span>
                </div>
                <span
                  className={`font-black tabular-nums whitespace-nowrap shrink-0 border px-2 py-0.5 rounded-full text-[10.5px] ${
                    isDark
                      ? 'text-blue-300 bg-blue-900/50 border-blue-700'
                      : 'text-blue-800 bg-blue-100/70 border-blue-200'
                  }`}
                >
                  +{booking.cvRotationPoints} pts
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 1B: Tiền Tip Cho Chuyên Viên (Hỗ trợ Tip theo mốc + Làm chẵn tổng thanh toán) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider px-1 mb-1.5">
            <span className={isDark ? 'text-neutral-400' : 'text-gray-500'}>TIỀN TIP CHO CHUYÊN VIÊN</span>
            <span className={`text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} lowercase font-medium`}>
              tùy chọn theo độ hài lòng
            </span>
          </div>
          <div
            className={`${
              isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-neutral-100 shadow-sm'
            } rounded-2xl p-3 border space-y-2.5`}
          >
            {/* Hàng 1: Tip theo mốc cố định + nút Khác */}
            <div>
              <div
                className={`text-[10.5px] ${isDark ? 'text-neutral-400' : 'text-gray-400'} font-semibold mb-1 uppercase tracking-wide`}
              >
                Mốc tip thông dụng:
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[
                  { value: 0, label: '0đ' },
                  { value: 50000, label: '50K' },
                  { value: 100000, label: '100K' },
                  { value: 200000, label: '200K' },
                  { value: 500000, label: '500K' },
                ].map((p) => {
                  const isSelected = tipAmount === p.value && !activeRoundTarget && !isCustomTipOpen;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setTipAmount(p.value);
                        setActiveRoundTarget(null);
                        setIsCustomTipOpen(false);
                      }}
                      className={`py-2 rounded-xl text-[12px] font-extrabold text-center transition-all tabular-nums cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#FFB400] text-black shadow-xs font-black'
                          : isDark
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                            : 'bg-[#F2F2F7] hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsCustomTipOpen(!isCustomTipOpen)}
                  className={`py-2 rounded-xl text-[11px] font-extrabold text-center transition-all cursor-pointer active:scale-95 ${
                    isCustomTipOpen ||
                    (tipAmount > 0 && ![0, 50000, 100000, 200000, 500000].includes(tipAmount) && !activeRoundTarget)
                      ? 'bg-purple-600 text-white shadow-xs font-black'
                      : isDark
                        ? 'bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                  }`}
                >
                  {isCustomTipOpen ? '✕ Đóng' : 'Khác ⌨️'}
                </button>
              </div>
            </div>

            {/* Hàng 2: Gợi ý làm tròn chẵn tổng thanh toán */}
            {roundUpSuggestions.length > 0 && (
              <div className={`pt-1 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}>
                <div
                  className={`text-[10.5px] ${isDark ? 'text-amber-400' : 'text-amber-700'} font-bold mb-1 flex items-center gap-1`}
                >
                  <span>✨</span> HOẶC LÀM TRÒN CHẴN TỔNG ĐƠN (QUẸT THẺ / CHUYỂN KHOẢN):
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {roundUpSuggestions.map((opt) => {
                    const isSelected = activeRoundTarget === opt.targetTotal;
                    return (
                      <button
                        key={opt.targetTotal}
                        type="button"
                        onClick={() => {
                          setTipAmount(opt.tipAmount);
                          setActiveRoundTarget(opt.targetTotal);
                          setIsCustomTipOpen(false);
                        }}
                        className={`p-2 rounded-xl text-center transition-all cursor-pointer active:scale-95 border ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-600 shadow-xs font-black'
                            : isDark
                              ? 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-200 border-amber-600/40'
                              : 'bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 border-amber-200/80'
                        }`}
                      >
                        <div className="text-[12px] font-black tabular-nums">{opt.label}</div>
                        <div
                          className={`text-[10px] tabular-nums font-semibold ${
                            isSelected ? 'text-black' : isDark ? 'text-amber-400' : 'text-amber-700'
                          }`}
                        >
                          (+{Math.round(opt.tipAmount / 1000).toLocaleString('vi-VN')}K tip)
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Khối Nhập Tùy Chỉnh (Custom Tip Amount) khi bấm Khác ⌨️ */}
            {isCustomTipOpen && (
              <div
                className={`${
                  isDark ? 'bg-purple-950/30 border-purple-800' : 'bg-purple-50/70 border-purple-200'
                } border rounded-xl p-2.5 space-y-2 text-[11px] animate-fadeIn`}
              >
                <div
                  className={`flex items-center justify-between ${isDark ? 'text-purple-200' : 'text-purple-950'} font-bold`}
                >
                  <span>Nhập số tiền tip tùy ý (300K, 700K...):</span>
                  <span className={`text-[10px] ${isDark ? 'text-purple-400' : 'text-purple-700'} font-normal`}>
                    Đơn vị: VNĐ
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customTipInput}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setCustomTipInput(digits ? Number(digits).toLocaleString('vi-VN') : '');
                    }}
                    placeholder="Ví dụ: 700.000"
                    className={`flex-1 ${
                      isDark
                        ? 'bg-neutral-900 border-purple-700 text-white placeholder-neutral-500'
                        : 'bg-white border-purple-300 text-black placeholder-neutral-400'
                    } border rounded-xl px-3 py-2 text-[13px] font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-purple-400`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const digits = customTipInput.replace(/\D/g, '');
                      const val = parseInt(digits, 10);
                      if (!isNaN(val) && val >= 0) {
                        setTipAmount(val);
                        setActiveRoundTarget(null);
                        setIsCustomTipOpen(false);
                      }
                    }}
                    className="bg-purple-600 text-white font-extrabold px-3 py-2 rounded-xl text-[12px] hover:bg-purple-700 active:scale-95 cursor-pointer shrink-0"
                  >
                    Áp dụng
                  </button>
                </div>
                {/* Phím tắt nhanh cho tip lớn */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className={`text-[10px] ${isDark ? 'text-purple-300' : 'text-purple-800'} font-semibold`}>
                    Chọn nhanh:
                  </span>
                  {[300000, 500000, 700000, 1000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setTipAmount(amt);
                        setCustomTipInput(amt.toLocaleString('vi-VN'));
                        setActiveRoundTarget(null);
                        setIsCustomTipOpen(false);
                      }}
                      className={`${
                        isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-purple-200 border-purple-800'
                          : 'bg-white hover:bg-purple-100 text-purple-900 border-purple-200'
                      } border rounded-lg px-2 py-0.5 text-[10.5px] font-bold tabular-nums cursor-pointer`}
                    >
                      +{Math.round(amt / 1000)}K
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Thẻ Kết Quả Phân Bổ Tip */}
            {tipAmount > 0 ? (
              <div
                className={`${
                  isDark ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-emerald-50/80 border-emerald-200/80'
                } border rounded-xl p-2.5 space-y-1.5 text-[11px]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base leading-none">💖</span>
                    <div className="min-w-0">
                      <div className={`font-extrabold ${isDark ? 'text-emerald-200' : 'text-emerald-950'} truncate`}>
                        {activeRoundTarget
                          ? `Làm tròn tổng đơn ${activeRoundTarget.toLocaleString('vi-VN')}đ (Tip: +${tipAmount.toLocaleString('vi-VN')}đ)`
                          : `Đã ghi nhận tip ${tipAmount.toLocaleString('vi-VN')}đ`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span
                      className={`text-[11px] font-black ${
                        isDark
                          ? 'text-emerald-300 bg-neutral-900 border-emerald-600'
                          : 'text-emerald-800 bg-white border-emerald-300'
                      } px-2 py-0.5 rounded-lg border tabular-nums`}
                    >
                      +{Math.round(tipAmount / 1000)}K
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTipAmount(0);
                        setActiveRoundTarget(null);
                        setIsCustomTipOpen(false);
                      }}
                      className={`text-[10px] ${
                        isDark
                          ? 'text-neutral-400 hover:text-rose-400 bg-neutral-800 border-neutral-700'
                          : 'text-gray-400 hover:text-red-500 bg-white border-gray-200'
                      } font-bold px-1.5 py-0.5 rounded border cursor-pointer`}
                    >
                      Bỏ tip
                    </button>
                  </div>
                </div>
                {showStaffRewards && (
                  <div
                    className={`pt-1.5 border-t ${
                      isDark ? 'border-emerald-800/50 text-emerald-300' : 'border-emerald-200 text-emerald-800'
                    } text-[10px] font-semibold flex items-center justify-between gap-2 flex-wrap tabular-nums`}
                  >
                    <span>
                      Chia thưởng 70/10/10: Làm mi {actorTipBreakdown.techStaffName} (70%) · In{' '}
                      {actorTipBreakdown.checkInStaffName} (10%) · Out {actorTipBreakdown.checkOutStaffName} (10%)
                    </span>
                    <span className="font-black">
                      Bạn nhận ({actorTipBreakdown.actorEarnedPercent}%): +
                      {actorTipBreakdown.actorEarnedAmount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`${
                  isDark
                    ? 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                } border rounded-xl py-2 px-3 text-center text-[11px] font-medium`}
              >
                Khách không gửi tip trong ca này · Không tính thêm phí
              </div>
            )}
          </div>
        </div>

        {/* Section 1C: Ví Kim Cương (1 💎 = 1.000 VNĐ) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider px-1 mb-1.5">
            <span className={`flex items-center gap-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              <span>💎</span> VÍ KIM CƯƠNG
            </span>
            <span
              className={`text-[10px] font-bold ${
                isDark ? 'text-cyan-300 bg-cyan-950/50 border-cyan-800' : 'text-cyan-800 bg-cyan-50 border-cyan-200'
              } border px-2 py-0.5 rounded-full tabular-nums`}
            >
              Số dư: {customerDiamondBalance} 💎
            </span>
          </div>
          <div
            className={`${
              isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-neutral-100 shadow-sm'
            } rounded-2xl p-3 border space-y-2.5`}
          >
            {customerDiamondBalance > 0 ? (
              <>
                <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-gray-500'} font-medium`}>
                  Chọn số Kim Cương dùng để cấn trừ (1 💎 = 1.000đ):
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 50, 100, 200].map((preset) => {
                    const disabled = preset > maxDiamondCanUse;
                    const isSelected = effectiveDiamondUsed === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={disabled}
                        onClick={() => setDiamondUsed(preset)}
                        className={`py-2 rounded-xl text-[12px] font-extrabold text-center transition-all tabular-nums cursor-pointer active:scale-95 ${
                          disabled
                            ? isDark
                              ? 'bg-neutral-800/40 text-neutral-600 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : isSelected
                              ? 'bg-cyan-600 text-white shadow-xs font-black'
                              : isDark
                                ? 'bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800'
                                : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-100'
                        }`}
                      >
                        {preset} 💎
                      </button>
                    );
                  })}
                  {/* Max Button */}
                  <button
                    type="button"
                    disabled={maxDiamondCanUse <= 0}
                    onClick={() => setDiamondUsed(maxDiamondCanUse)}
                    className={`py-2 rounded-xl text-[12px] font-extrabold text-center transition-all tabular-nums cursor-pointer active:scale-95 ${
                      maxDiamondCanUse <= 0
                        ? isDark
                          ? 'bg-neutral-800/40 text-neutral-600 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : effectiveDiamondUsed === maxDiamondCanUse && maxDiamondCanUse > 0
                          ? 'bg-cyan-600 text-white shadow-xs font-black'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-xs font-black'
                    }`}
                  >
                    {maxDiamondCanUse} 💎
                  </button>
                </div>

                {/* Status banner */}
                {effectiveDiamondUsed > 0 ? (
                  <div
                    className={`${
                      isDark ? 'bg-cyan-950/40 border-cyan-800/60' : 'bg-cyan-50/90 border-cyan-200'
                    } border rounded-xl p-2.5 flex items-center justify-between text-[11px]`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base leading-none">💎</span>
                      <div className="min-w-0">
                        <div className={`font-extrabold ${isDark ? 'text-cyan-200' : 'text-cyan-950'} truncate`}>
                          Đã trừ {effectiveDiamondUsed} 💎 (-{diamondDiscountAmount.toLocaleString('vi-VN')}đ)
                        </div>
                        <div className={`text-[10px] ${isDark ? 'text-cyan-300' : 'text-cyan-800'} font-medium`}>
                          Số dư ví còn lại sau ca:{' '}
                          <strong className={isDark ? 'text-cyan-100' : 'text-cyan-950'}>
                            {customerDiamondBalance - effectiveDiamondUsed} 💎
                          </strong>{' '}
                          (quy đổi{' '}
                          {((customerDiamondBalance - effectiveDiamondUsed) * DIAMOND_RATE).toLocaleString('vi-VN')}đ)
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDiamondUsed(0)}
                      className={`text-[10px] font-bold ${
                        isDark
                          ? 'text-neutral-400 hover:text-rose-400 bg-neutral-800 border-neutral-700'
                          : 'text-gray-500 hover:text-red-600 bg-white border-gray-200'
                      } px-2 py-1 rounded-lg border shrink-0 ml-1 cursor-pointer`}
                    >
                      Bỏ dùng
                    </button>
                  </div>
                ) : (
                  <div
                    className={`${
                      isDark
                        ? 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    } border rounded-xl py-2 px-3 text-center text-[11px] font-medium`}
                  >
                    Chưa dùng Kim Cương · Giữ nguyên {customerDiamondBalance} 💎 trong ví cho các ca sau
                  </div>
                )}
              </>
            ) : (
              <div
                className={`${
                  isDark
                    ? 'bg-neutral-800/40 border-neutral-800 text-neutral-500'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                } border rounded-xl py-2.5 px-3 text-center text-[11px] font-medium`}
              >
                Khách chưa có số dư Kim Cương trong ví (0 💎)
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Hình Thức Thanh Toán */}
        <div>
          <div
            className={`text-[11px] font-black ${isDark ? 'text-neutral-400' : 'text-neutral-400'} uppercase tracking-wider px-1 mb-1.5`}
          >
            Hình Thức Thanh Toán
          </div>
          {finalGrandTotal === 0 ? (
            <div
              className={`${
                isDark ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
              } border-2 rounded-2xl p-4 text-center space-y-1 shadow-2xs`}
            >
              <div
                className={`${
                  isDark ? 'text-emerald-300' : 'text-emerald-800'
                } font-black text-[14px] flex items-center justify-center gap-1.5`}
              >
                <span>✓</span> ĐÃ THANH TOÁN 100% BẰNG VÍ KIM CƯƠNG
              </div>
              <div className={`text-[11px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-medium`}>
                Đã cấn trừ đủ {effectiveDiamondUsed} 💎 (-{diamondDiscountAmount.toLocaleString('vi-VN')}đ). Không cần
                thu thêm tiền mặt hay chuyển khoản.
              </div>
            </div>
          ) : (
            <div
              className={`${
                isDark
                  ? 'bg-neutral-900/90 border-neutral-800 divide-neutral-800/80'
                  : 'bg-white border-neutral-200/80 divide-neutral-100'
              } rounded-2xl shadow-2xs border overflow-hidden divide-y`}
            >
              {(
                [
                  { id: 'VIETQR', label: 'Chuyển khoản QR (Bank)' },
                  { id: 'POS', label: 'Thẻ ngân hàng (POS)' },
                  { id: 'CASH', label: 'Tiền mặt (Cash)' },
                ] as const
              ).map((m) => {
                const active = selectedMethod === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                      active
                        ? isDark
                          ? 'bg-emerald-950/40'
                          : 'bg-emerald-50/60'
                        : isDark
                          ? 'hover:bg-neutral-800/50'
                          : 'hover:bg-neutral-50'
                    }`}
                  >
                    <span
                      className={`text-[13.5px] ${
                        active
                          ? isDark
                            ? 'text-emerald-300 font-black'
                            : 'text-emerald-800 font-black'
                          : isDark
                            ? 'text-neutral-200 font-bold'
                            : 'text-neutral-900 font-bold'
                      }`}
                    >
                      {active && '✓ '}
                      {m.label}
                    </span>
                    <span
                      className={`text-[13.5px] tabular-nums whitespace-nowrap shrink-0 ${
                        active
                          ? isDark
                            ? 'text-emerald-300 font-black'
                            : 'text-emerald-800 font-black'
                          : isDark
                            ? 'text-neutral-500 font-semibold'
                            : 'text-neutral-400 font-semibold'
                      }`}
                    >
                      {active ? `${finalGrandTotal.toLocaleString('vi-VN')}đ` : '0đ'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Khối bắt buộc chụp biên lai POS khi chọn Thẻ ngân hàng (POS) và tổng tiền > 0 */}
          {finalGrandTotal > 0 && selectedMethod === 'POS' && (
            <div
              className={`mt-2.5 ${
                isDark ? 'bg-sky-950/40 border-sky-800/60' : 'bg-sky-50/80 border-sky-200/90'
              } rounded-2xl p-3 border space-y-2`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">📸</span>
                  <span className={`text-[11.5px] font-bold ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>
                    Ảnh biên lai máy POS đối soát (Bắt buộc)
                  </span>
                </div>
                {(transferProofPhoto || proofCloudSyncStatus === 'uploading') && (
                  <IosCloudSyncBadge status={proofCloudSyncStatus} size="sm" />
                )}
              </div>
              {transferProofPhoto ? (
                <div
                  className={`flex items-center gap-2.5 ${
                    isDark ? 'bg-neutral-900 border-sky-800' : 'bg-white border-sky-200'
                  } p-2 rounded-xl border shadow-2xs`}
                >
                  <img
                    src={transferProofPhoto}
                    alt="Ảnh biên lai POS"
                    className="w-11 h-11 object-cover rounded-lg border border-sky-400/40 shrink-0 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'} truncate`}
                    >
                      ✓ Đã lưu ảnh biên lai POS
                    </div>
                    <div className={`text-[9.5px] ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                      Chạm vào ảnh để chụp lại
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-2.5 px-3 ${
                    isDark
                      ? 'bg-neutral-900 hover:bg-sky-950/50 border-sky-700 text-sky-300'
                      : 'bg-white hover:bg-sky-50 border-sky-300 text-sky-800'
                  } active:scale-98 transition-all rounded-xl border-2 border-dashed font-bold text-[11.5px] flex items-center justify-center gap-1.5 cursor-pointer`}
                >
                  <span>📷</span>
                  <span>Chụp hóa đơn / biên lai máy POS</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Hidden file input shared by POS and VietQR modal */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCaptureProof}
        />

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleProceed}
            disabled={finalGrandTotal > 0 && selectedMethod === 'POS' && !transferProofPhoto}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-[15px] shadow-sm transition-all text-center tracking-tight ${
              finalGrandTotal > 0 && selectedMethod === 'POS' && !transferProofPhoto
                ? isDark
                  ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 cursor-not-allowed opacity-60'
                  : 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed opacity-60'
                : finalGrandTotal === 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-98 cursor-pointer'
                  : selectedMethod === 'VIETQR'
                    ? 'bg-gradient-to-r from-[#FF9500] to-[#FFB400] text-black active:scale-98 cursor-pointer'
                    : 'bg-[#FFB400] text-black active:scale-98 cursor-pointer'
            }`}
          >
            {finalGrandTotal === 0
              ? `Xác Nhận Chốt Đơn (Trừ ${effectiveDiamondUsed} 💎 · 0đ)`
              : selectedMethod === 'VIETQR'
                ? `Mở Mã QR Thanh Toán · ${finalGrandTotal.toLocaleString('vi-VN')}đ`
                : selectedMethod === 'POS'
                  ? !transferProofPhoto
                    ? '🔒 Bắt Buộc Chụp Biên Lai POS Để Chốt Đơn'
                    : `Xác Nhận Quẹt Thẻ (POS) · ${finalGrandTotal.toLocaleString('vi-VN')}đ`
                  : `Xác Nhận Thu Tiền Mặt · ${finalGrandTotal.toLocaleString('vi-VN')}đ`}
          </button>
        </div>
      </div>

      {/* 📲 MODAL QR-CODE THANH TOÁN CHUẨN GOOGLE SHEET WINGS */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none">
          <div
            className={`${
              isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-200'
            } rounded-3xl max-w-[390px] w-full overflow-hidden shadow-2xl flex flex-col border`}
          >
            {/* Header đen + logo Wings + badge DT */}
            <div className="bg-black text-white p-3.5 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <img
                  src="/images/combo-cards/wings-logo-gold.png"
                  alt="Wings Lashes Logo"
                  className="h-7 w-auto object-contain shrink-0"
                />
                <div>
                  <div className="text-[14px] font-black tracking-wider text-[#FFB400] leading-tight">WINGS LASHES</div>
                  <div className="text-[10px] text-gray-300 font-medium">Hệ Thống Nối Mi Bóng Tối</div>
                </div>
              </div>
              <div className="bg-[#16A34A] text-white text-[11px] font-black px-2.5 py-1 rounded-lg tracking-wider">
                {branchCode}
              </div>
            </div>

            {/* Dải cam tiêu đề chuẩn Sheet */}
            <div className="bg-[#FF9500] text-black font-black text-center py-1.5 text-[12px] tracking-wider uppercase shadow-xs">
              QR THANH TOÁN DỊCH VỤ
            </div>

            {/* Body: Mã QR & Thông tin thanh toán (Scrollable) */}
            <div className="p-3.5 space-y-2.5 overflow-y-auto max-h-[calc(85vh-150px)]">
              {/* Image QR Code to rõ tối đa */}
              <div className="flex justify-center">
                <div className="bg-white p-2 rounded-2xl border-2 border-neutral-200 shadow-sm max-w-[270px] w-full aspect-square flex items-center justify-center">
                  <img
                    src={vietQrUrl}
                    alt="VietQR Chuyển Khoản Wings"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              </div>

              {/* Thông tin chuyển khoản chi tiết */}
              <div
                className={`${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-gray-50 border-gray-200'
                } rounded-2xl p-2.5 border space-y-1.5 text-[12px]`}
              >
                <div className="flex items-center justify-between">
                  <span className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} font-bold text-[11px]`}>
                    Nội Dung:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#E11D48] font-black text-[13px] tracking-wide tabular-nums">
                      {qrTransferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(qrTransferContent, 'content')}
                      title="Sao chép nội dung"
                      aria-label="Sao chép nội dung"
                      className={`w-6 h-6 rounded-md ${
                        isDark
                          ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      } border flex items-center justify-center text-[11px] active:scale-90 transition-transform cursor-pointer shadow-2xs`}
                    >
                      {copySuccess === 'content' ? (
                        <span className="text-emerald-500 font-bold text-[11px]">✓</span>
                      ) : (
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} font-bold text-[11px]`}>
                    Số Tiền:
                  </span>
                  <span className="text-[#E11D48] font-black text-[15px] tabular-nums">
                    {finalGrandTotal.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>

                <div className={`flex items-center justify-between ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
                  <span className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} font-medium text-[11px]`}>
                    Ngân Hàng:
                  </span>
                  <span className={`font-bold ${isDark ? 'text-neutral-100' : 'text-gray-900'}`}>
                    Vietcombank (VCB)
                  </span>
                </div>

                <div className={`flex items-center justify-between ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
                  <span className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} font-medium text-[11px]`}>
                    Tên Tài Khoản:
                  </span>
                  <span className={`font-black ${isDark ? 'text-neutral-100' : 'text-gray-900'} text-[11px] uppercase`}>
                    CÔNG TY TNHH WINGS&apos; LIFE
                  </span>
                </div>

                <div className={`flex items-center justify-between ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
                  <span className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} font-medium text-[11px]`}>
                    Số Tài Khoản:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-black ${isDark ? 'text-neutral-100' : 'text-gray-900'} tabular-nums text-[13px]`}
                    >
                      1024731897
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('1024731897', 'acc')}
                      title="Sao chép số tài khoản"
                      aria-label="Sao chép số tài khoản"
                      className={`w-6 h-6 rounded-md ${
                        isDark
                          ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      } border flex items-center justify-center text-[11px] active:scale-90 transition-transform cursor-pointer shadow-2xs`}
                    >
                      {copySuccess === 'acc' ? (
                        <span className="text-emerald-500 font-bold text-[11px]">✓</span>
                      ) : (
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Chức năng xin chụp lại màn hình chuyển khoản của khách hàng */}
              <div
                className={`${
                  isDark ? 'bg-sky-950/40 border-sky-800/60' : 'bg-sky-50/80 border-sky-200/90'
                } rounded-2xl p-2.5 border space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">📸</span>
                    <span className={`text-[11.5px] font-bold ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>
                      Ảnh bill chuyển khoản đối soát (Bắt buộc)
                    </span>
                  </div>
                  {(transferProofPhoto || proofCloudSyncStatus === 'uploading') && (
                    <IosCloudSyncBadge status={proofCloudSyncStatus} size="sm" />
                  )}
                </div>

                {transferProofPhoto ? (
                  <div
                    className={`flex items-center gap-2.5 ${
                      isDark ? 'bg-neutral-900 border-sky-800' : 'bg-white border-sky-200'
                    } p-2 rounded-xl border shadow-2xs`}
                  >
                    <img
                      src={transferProofPhoto}
                      alt="Ảnh bill đối soát"
                      className={`w-11 h-11 object-cover rounded-lg border ${
                        isDark ? 'border-neutral-700' : 'border-gray-200'
                      } shadow-2xs shrink-0 cursor-pointer`}
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'} truncate`}
                      >
                        ✓ Đã lưu ảnh bill chuyển khoản
                      </div>
                      <div className={`text-[9.5px] ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                        Chạm vào ảnh để chụp lại
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-2 py-1 text-[10.5px] font-bold ${
                        isDark
                          ? 'text-sky-300 bg-sky-950/60 hover:bg-sky-900/60 border-sky-700'
                          : 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-300'
                      } rounded-lg border cursor-pointer shrink-0 active:scale-95`}
                    >
                      Chụp lại
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-2 px-3 ${
                      isDark
                        ? 'bg-neutral-900 hover:bg-sky-950/50 border-sky-700 text-sky-300'
                        : 'bg-white hover:bg-sky-50 border-sky-300 text-sky-800'
                    } active:scale-98 transition-all rounded-xl border-2 border-dashed font-bold text-[11.5px] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs`}
                  >
                    <span className="text-sm">📷</span>
                    <span>Xin chụp lại màn hình chuyển khoản của khách</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div
              className={`p-3 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100'} border-t space-y-2 shrink-0`}
            >
              <button
                type="button"
                onClick={handleConfirmQrPaid}
                disabled={!transferProofPhoto}
                className={`w-full py-3 px-4 rounded-2xl ${
                  !transferProofPhoto
                    ? isDark
                      ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 cursor-not-allowed opacity-60'
                      : 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed opacity-60'
                    : 'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md active:scale-98 cursor-pointer'
                } font-black transition-all text-center tracking-wide flex flex-col items-center justify-center leading-snug gap-0.5`}
              >
                <span className="text-[13.5px]">
                  {!transferProofPhoto ? '🔒 BẮT BUỘC CHỤP ẢNH BILL CHUYỂN KHOẢN' : '✓ ĐÃ NHẬN TIỀN THÀNH CÔNG'}
                </span>
                <span className="text-[12px] opacity-95 font-extrabold uppercase tracking-wide">
                  {!transferProofPhoto ? 'ĐỂ ĐỐI SOÁT KẾ TOÁN & XUẤT HÓA ĐƠN' : 'XUẤT HÓA ĐƠN'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className={`w-full py-2 px-4 rounded-xl ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                } font-bold text-[12px] text-center cursor-pointer`}
              >
                ‹ Đóng / Đổi hình thức thanh toán khác
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📲 MODAL XIN PHÉP GỬI HÓA ĐƠN & BẢO HÀNH QUA ZALO */}
      {isZaloModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none">
          <div
            className={`${
              isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-200'
            } rounded-3xl max-w-[390px] w-full overflow-hidden shadow-2xl flex flex-col border`}
          >
            {/* Header Xanh Zalo + Logo Wings + Zalo Official Pill */}
            <div className="bg-gradient-to-r from-[#0068FF] to-[#0052CC] text-white p-3.5 flex items-center justify-between border-b border-blue-400/30">
              <div className="flex items-center gap-2.5">
                <img
                  src="/images/combo-cards/wings-logo-gold.png"
                  alt="Wings Lashes Logo"
                  className="h-7 w-auto object-contain shrink-0 brightness-125"
                />
                <div>
                  <div className="text-[13.5px] font-black tracking-wider text-white leading-tight">WINGS LASHES</div>
                  <div className="text-[10px] text-blue-100 font-medium">Hệ Thống Nối Mi Bóng Tối</div>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-xs text-white text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>💬</span> Zalo Official
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3 max-h-[calc(85vh-130px)] overflow-y-auto">
              <div className="text-center space-y-0.5">
                <div className={`text-[15px] font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                  KẾT NỐI ZALO NHẬN HÓA ĐƠN
                </div>
                <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-gray-500'} font-medium`}>
                  Bảo hành dặm mi 3 ngày & Tặng Voucher 50K
                </div>
              </div>

              {/* Hộp gợi ý lời thoại cho CV/Lễ Tân */}
              <div
                className={`${
                  isDark ? 'bg-blue-950/40 border-blue-800/60' : 'bg-blue-50/90 border-blue-200'
                } rounded-2xl p-2.5 space-y-1 border`}
              >
                <div className="text-[10px] font-extrabold text-[#0052CC] flex items-center gap-1 uppercase tracking-wide">
                  <span>🎙️</span> Lời thoại xin phép khách hàng:
                </div>
                <div
                  className={`text-[11.5px] ${isDark ? 'text-blue-200' : 'text-blue-950'} font-medium italic leading-relaxed`}
                >
                  &ldquo;Dạ chị {customerName} ơi, Wings xin phép gửi Hóa đơn điện tử, Thẻ bảo hành dặm mi trong 3 ngày
                  và Voucher ưu đãi 50K qua Zalo số này cho chị nhé ạ!&rdquo;
                </div>
              </div>

              {/* SĐT Zalo */}
              <div className="space-y-1">
                <div
                  className={`flex justify-between items-center text-[10.5px] font-bold ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}
                >
                  <span>SỐ ĐIỆN THOẠI NHẬN ZALO:</span>
                  <span className="text-[10px] text-blue-400 font-semibold">Chạm để sửa nếu dùng số khác</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-700 focus-within:border-[#0068FF] focus-within:bg-neutral-900'
                      : 'bg-gray-50 border-gray-300 focus-within:border-[#0068FF] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100'
                  } border rounded-xl px-3 py-2 transition-all`}
                >
                  <span className="text-base leading-none">📱</span>
                  <input
                    type="tel"
                    value={zaloPhone}
                    onChange={(e) => setZaloPhone(e.target.value)}
                    placeholder="Nhập số điện thoại Zalo..."
                    className={`flex-1 bg-transparent text-[14px] font-extrabold ${
                      isDark ? 'text-white' : 'text-black'
                    } outline-none tabular-nums`}
                  />
                  {zaloPhone !== customerPhone && (
                    <button
                      type="button"
                      onClick={() => setZaloPhone(customerPhone)}
                      className={`text-[10px] text-blue-400 hover:text-blue-300 font-bold ${
                        isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-blue-200'
                      } px-2 py-0.5 rounded border cursor-pointer`}
                    >
                      Đặt lại
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Quyền lợi Zalo */}
              <div
                className={`${
                  isDark
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                } rounded-2xl p-2.5 space-y-1 text-[11px] border`}
              >
                <div
                  className={`font-extrabold ${isDark ? 'text-emerald-300' : 'text-emerald-950'} flex items-center gap-1 text-[11.5px]`}
                >
                  <span>🎁</span> QUYỀN LỢI KHÁCH NHẬN ĐƯỢC QUA ZALO:
                </div>
                <div className="space-y-1 font-medium">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-black shrink-0">✓</span>
                    <span>
                      <strong className={isDark ? 'text-emerald-100' : 'text-emerald-950'}>
                        Hóa đơn điện tử chi tiết:
                      </strong>{' '}
                      Minh bạch từng dịch vụ, tiền tip & số dư ví.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-black shrink-0">✓</span>
                    <span>
                      <strong className={isDark ? 'text-emerald-100' : 'text-emerald-950'}>
                        Thẻ bảo hành dặm mi 3 ngày:
                      </strong>{' '}
                      Bảo hành dặm mi chuẩn Wings hoàn toàn miễn phí.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-black shrink-0">✓</span>
                    <span>
                      <strong className={isDark ? 'text-emerald-100' : 'text-emerald-950'}>Voucher 50.000đ:</strong> Tự
                      động tích lũy vào tài khoản cho lần ghé tới.
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Zalo OA Wings Lashes */}
              <div
                className={`flex items-center gap-3 p-2.5 ${
                  isDark ? 'bg-blue-950/30 border-blue-800/60' : 'bg-blue-50/70 border-blue-200'
                } rounded-2xl border`}
              >
                <div className="w-16 h-16 bg-white p-1 rounded-xl border border-blue-300 shrink-0 shadow-2xs flex items-center justify-center relative overflow-hidden">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-blue-950 fill-current">
                    {/* Corner 1 */}
                    <rect x="5" y="5" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="5" />
                    <rect x="12" y="12" width="12" height="12" rx="2" fill="currentColor" />
                    {/* Corner 2 */}
                    <rect
                      x="69"
                      y="5"
                      width="26"
                      height="26"
                      rx="4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                    />
                    <rect x="76" y="12" width="12" height="12" rx="2" fill="currentColor" />
                    {/* Corner 3 */}
                    <rect
                      x="5"
                      y="69"
                      width="26"
                      height="26"
                      rx="4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                    />
                    <rect x="12" y="76" width="12" height="12" rx="2" fill="currentColor" />
                    {/* Data dots */}
                    <rect x="38" y="8" width="6" height="6" rx="1" />
                    <rect x="48" y="14" width="6" height="6" rx="1" />
                    <rect x="58" y="8" width="6" height="6" rx="1" />
                    <rect x="8" y="38" width="6" height="6" rx="1" />
                    <rect x="18" y="48" width="6" height="6" rx="1" />
                    <rect x="8" y="58" width="6" height="6" rx="1" />
                    <rect x="42" y="35" width="6" height="6" rx="1" />
                    <rect x="52" y="35" width="6" height="6" rx="1" />
                    <rect x="68" y="42" width="6" height="6" rx="1" />
                    <rect x="78" y="48" width="6" height="6" rx="1" />
                    <rect x="88" y="42" width="6" height="6" rx="1" />
                    <rect x="68" y="62" width="6" height="6" rx="1" />
                    <rect x="78" y="72" width="6" height="6" rx="1" />
                    <rect x="88" y="82" width="6" height="6" rx="1" />
                    <rect x="38" y="75" width="6" height="6" rx="1" />
                    <rect x="48" y="85" width="6" height="6" rx="1" />
                    <rect x="58" y="75" width="6" height="6" rx="1" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-[#0068FF] text-white flex items-center justify-center shadow-xs border border-white">
                      <span className="text-[8.5px] font-black tracking-tighter">Zalo</span>
                    </div>
                  </div>
                </div>
                <div className={`text-[10.5px] ${isDark ? 'text-neutral-300' : 'text-gray-700'} space-y-0.5`}>
                  <div className="font-bold text-[#0068FF] flex items-center gap-1">
                    <span>Mã QR Zalo OA Wings Lashes</span>
                  </div>
                  <div className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} leading-snug`}>
                    Khách có thể quét camera để bấm <strong>Quan tâm OA</strong> và nhận tin nhắn kèm hình ảnh hóa đơn
                    ngay.
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div
              className={`p-3 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100'} border-t space-y-2 shrink-0`}
            >
              <button
                type="button"
                onClick={handleConfirmZaloSend}
                disabled={isSendingZalo || isZaloSentSuccess}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0068FF] hover:bg-[#0052CC] text-white font-black text-[13.5px] shadow-md active:scale-98 transition-transform text-center tracking-wide cursor-pointer flex items-center justify-center gap-2"
              >
                {isSendingZalo ? (
                  <>
                    <span className="animate-spin text-base">⏳</span>
                    <span>ĐANG GỬI QUA ZALO...</span>
                  </>
                ) : isZaloSentSuccess ? (
                  <>
                    <span className="text-base text-emerald-300">✓</span>
                    <span className="text-emerald-200">ĐÃ GỬI ZALO THÀNH CÔNG!</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">💬</span>
                    <span>KHÁCH ĐỒNG Ý · GỬI QUA ZALO NGAY</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSkipZalo}
                disabled={isSendingZalo || isZaloSentSuccess}
                className={`w-full py-2 px-4 rounded-xl ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                } font-bold text-[12px] text-center cursor-pointer`}
              >
                Khách không dùng Zalo / Bỏ qua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
