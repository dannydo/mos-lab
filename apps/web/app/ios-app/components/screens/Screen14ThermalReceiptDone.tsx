'use client';

import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { ChevronLeft, ChevronDown, ChevronUp, Heart, Gem, Eye, EyeOff } from 'lucide-react';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { CvFeather1Badge, FeatherSvg } from '../ui-kit/CvFeatherLabels';
import { ThermalReceiptComboItemsSection } from './checkout/ReceiptComboExpiryLine';
import {
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
} from '../../state/useIosBillingCheckout';
import type { CvToCvPlusRequirements } from '../../state/useIosBillingCheckout';

interface Screen14ThermalReceiptDoneProps {
  booking: BookingItem;
  actor?: ActiveActorProfile;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  onFinishOrder: () => void;
  onBack?: () => void;
}

export function Screen14ThermalReceiptDone({
  booking,
  actor,
  cvPlusRules,
  onFinishOrder,
  onBack,
}: Screen14ThermalReceiptDoneProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [showStaffRewards, setShowStaffRewards] = useState<boolean>(false);
  const customerName = booking?.customerName || 'Chị Trúc';
  const customerPhone = (booking?.customerPhone || '0933.779.207').replace(/\*+\s*/g, '').trim();
  const assignedStaff = booking?.assignedStaffName || 'Thảo Ly';
  const checkInStaff = booking?.checkInStaffName || assignedStaff;
  const checkOutStaff = booking?.checkOutStaffName || assignedStaff;
  const serviceName = resolveDisplayServiceName(booking);
  const servicePrice = booking?.servicePrice || 770000;
  const selectedCombo = booking?.selectedCombo || null;
  const selectedUnderCombo = booking?.selectedUnderCombo || null;
  const comboRedemption = booking?.comboRedemption || null;
  const cartProducts = booking?.cartProducts || [];
  const tipAmount = booking?.billing?.tipAmount ?? 0;
  const diamondUsed = booking?.billing?.diamondUsed || 0;
  const diamondDiscountAmount = booking?.billing?.diamondDiscountAmount || diamondUsed * 1000;
  const hasUnderMinkCombo = Boolean(
    booking?.underMinkComboStatus?.hasUnderCombo && (booking?.underMinkComboStatus?.remainingSessions ?? 0) > 0
  );
  const effectiveServiceCharge = resolveEffectiveServiceTotal({
    servicePrice,
    upgradePrice: booking?.upgradePrice || 0,
    serviceName: booking?.serviceName,
    isComboLive: Boolean(
      booking?.comboLiveStatus?.isComboLive &&
      (!selectedCombo || !selectedCombo.todayUsageMode || selectedCombo.todayUsageMode === 'USE_OLD_COMBO')
    ),
    hasUnderMink: booking?.attributes?.hasUnderMink,
    underMinkServiceType: booking?.attributes?.underMinkServiceType,
    hasUnderMinkCombo,
    comboRedemption,
    selectedCombo,
    selectedUnderCombo,
  });
  const vatRate = booking?.billing?.vatRate ?? 0.08;
  const subtotal =
    booking?.billing?.subtotal !== undefined
      ? booking.billing.subtotal
      : effectiveServiceCharge +
        (selectedCombo ? selectedCombo.price : 0) +
        (selectedUnderCombo ? selectedUnderCombo.price : 0) +
        cartProducts.reduce((s, p) => s + p.price * p.quantity, 0);
  const vatAmount = booking?.billing?.vatAmount ?? Math.round(subtotal * vatRate);
  const grandTotal =
    booking?.billing?.grandTotal !== undefined
      ? booking.billing.grandTotal
      : Math.max(0, subtotal + vatAmount + tipAmount - diamondDiscountAmount);

  const isCheckoutStaffCc = actor?.tier === 'CC' || booking?.checkOutStaffTier === 'CC';
  const dualComboBonus = calculateDualComboTierBonus(
    selectedCombo ? Number(selectedCombo.price || 0) : 0,
    selectedUnderCombo ? Number(selectedUnderCombo.price || 0) : 0,
    cvPlusRules
  );
  const comboBonus = isCheckoutStaffCc ? 0 : dualComboBonus.totalBonus;
  const serumBonus = isCheckoutStaffCc
    ? 0
    : cartProducts.reduce(
        (s, p) =>
          s +
          (p.cvBonus !== undefined
            ? p.cvBonus * p.quantity
            : calculateCvSerumTierBonus(p.price, p.quantity, cvPlusRules)),
        0
      );
  const settlementStatus = booking?.billing?.settlementStatus;
  const isPendingCounter = settlementStatus === 'PENDING_COUNTER_SETTLEMENT';
  const actorTipBreakdown = calculateActorTipBreakdown(booking, actor, tipAmount);
  const tipEarned = actorTipBreakdown.actorEarnedAmount;

  const isEpStore =
    booking?.branchCode === 'EP' ||
    booking?.storeId === 16 ||
    (booking as any)?.clientStoreId === 16 ||
    (booking as any)?.client_store_id === 16;
  const branchCode = isEpStore ? 'EP' : 'DT';
  const branchInfo = isEpStore
    ? { name: 'CN ESTELLA PLACE', address: 'Tầng 5, L5-08-09 Estella Place, 88 Song Hành, TP. Thủ Đức' }
    : { name: 'CN ĐỀ THÁM', address: '159A Đề Thám, P. Cô Giang, Q.1, TP.HCM' };

  return (
    <div
      className={`flex-1 flex flex-col justify-between bg-[var(--background)] text-[var(--mos-text)] select-none px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)] overflow-y-auto`}
    >
      {/* Top Header */}
      <div className="relative flex items-center justify-center pb-2">
        {onBack && (
          <button
            onClick={onBack}
            className={`absolute left-0 p-1.5 -ml-1 rounded-full ${
              isDark
                ? 'bg-[#1C1C1E] border-neutral-800 text-neutral-300 hover:text-white'
                : 'bg-white border-gray-200 text-gray-700 hover:text-black shadow-xs'
            } border active:scale-95 transition-all flex items-center gap-1 text-[11.5px] font-bold cursor-pointer`}
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Quay lại</span>
          </button>
        )}
        <h1 className="text-[#FFB400] font-bold text-[16px] tracking-tight flex items-center justify-center gap-1 px-20 text-center">
          Chi Tiết Hoá Đơn
        </h1>
      </div>

      {/* Thermal Receipt Card */}
      <div
        className={`${
          isDark
            ? 'bg-[#18181B] text-neutral-100 border border-neutral-800'
            : 'bg-white text-black border border-neutral-200'
        } rounded-2xl p-4 space-y-2.5 shadow-2xl my-auto transition-colors`}
      >
        <div className="text-center space-y-0.5">
          <img
            src="/images/combo-cards/wings-logo-gold.png"
            alt="Wings Lashes"
            className="h-6 w-auto mx-auto object-contain"
          />
          <div className={`text-[16px] font-black tracking-wider ${isDark ? 'text-amber-400' : 'text-black'}`}>
            WINGS LASHES
          </div>
          <div className={`text-[10.5px] ${isDark ? 'text-neutral-400' : 'text-gray-600'} font-medium`}>
            {branchInfo.name} · {branchInfo.address}
          </div>
        </div>

        <div className={`border-b border-dashed ${isDark ? 'border-neutral-700' : 'border-gray-300'}`} />

        <div className="text-center space-y-1">
          <div className={`text-[13px] font-black uppercase tracking-wider text-[var(--mos-text)]`}>
            PHIẾU THANH TOÁN & GHI NHẬN CA
          </div>
          <div className={`text-[11px] text-[var(--mos-text-muted)] font-mono`}>
            HĐ: #{booking?.orderNumber || 'BK-336925'} · {isPendingCounter ? 'Chờ Quầy thu ngân chốt' : 'Hoàn tất'}
          </div>
          <div>
            <span
              className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
                isPendingCounter
                  ? isDark
                    ? 'bg-amber-950/50 text-amber-300 border-amber-700/60'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                  : isDark
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {isPendingCounter
                ? '⏳ Chờ Quầy thu Tiền mặt / POS · Đã khóa thưởng Checkout'
                : '✓ Đã hoàn tất & Ghi sổ kế toán · Báo Cáo CV'}
            </span>
          </div>
        </div>

        <div
          className={`text-[11px] space-y-1 ${isDark ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300' : 'bg-gray-50 border-gray-200 text-gray-700'} p-2.5 rounded-xl border`}
        >
          <div className="flex items-center justify-between">
            <span>Khách hàng:</span>
            <strong className={`font-bold text-[var(--mos-text)]`}>
              {customerName} ({customerPhone})
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Chuyên Viên làm mi:</span>
            <strong className={`font-bold text-[var(--mos-text)] inline-flex items-center gap-1`}>
              {assignedStaff} (<CvFeather1Badge />)
            </strong>
          </div>
          <div
            className={`flex items-center justify-between border-t border-[var(--mos-surface-border)] pt-1 text-[10.5px]`}
          >
            <span>
              Check-in: <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{checkInStaff}</strong>
            </span>
            <span>
              Check-out: <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{checkOutStaff}</strong>
            </span>
          </div>
        </div>

        <div className={`border-b border-dashed ${isDark ? 'border-neutral-700' : 'border-gray-300'}`} />

        {/* Items Table */}
        <div className="space-y-1.5 text-[12px]">
          <div
            className={`flex justify-between font-black ${isDark ? 'text-neutral-400' : 'text-black'} uppercase text-[11px] tracking-wide`}
          >
            <span>TÊN MẶT HÀNG</span>
            <span>THÀNH TIỀN</span>
          </div>

          {/* Item 1: Dịch vụ làm mi */}
          <div className={`flex justify-between items-start ${isDark ? 'text-neutral-300' : 'text-gray-800'}`}>
            <div className="space-y-0.5">
              <span className={`font-bold text-[var(--mos-text)]`}>1. {serviceName}</span>
              {comboRedemption ? (
                <div className={`text-[10.5px] ${isDark ? 'text-sky-400' : 'text-sky-700'} font-bold`}>
                  ✓ Trừ 1 lượt gói · Combo còn{' '}
                  <span className={`tabular-nums font-black ${isDark ? 'text-sky-300' : 'text-sky-900'}`}>
                    ✦ {comboRedemption.paidRemaining ?? 0} · ↻ {comboRedemption.bonusRemaining ?? 0}
                  </span>
                </div>
              ) : (selectedCombo && selectedCombo.todaySingleServiceWaived !== false) ||
                (selectedUnderCombo && selectedUnderCombo.todaySingleServiceWaived !== false) ? (
                <div className={`text-[10.5px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold`}>
                  {effectiveServiceCharge === 0
                    ? '✓ Trừ vào Buổi 1 gói mới mua (Miễn thu lẻ ca này)'
                    : '✓ Đã trừ Buổi 1 gói mới mua · Thu lẻ dịch vụ còn lại'}
                </div>
              ) : selectedCombo ? (
                <div className={`text-[10.5px] ${isDark ? 'text-indigo-400' : 'text-indigo-700'} font-bold`}>
                  ✓ Khách trả lẻ ca này · Giữ trọn số buổi gói mới mua
                </div>
              ) : null}
            </div>
            <div className="text-right shrink-0">
              <span className={`tabular-nums font-bold text-[var(--mos-text)]`}>
                {effectiveServiceCharge.toLocaleString('vi-VN')} đ
              </span>
              {!comboRedemption && effectiveServiceCharge < servicePrice && (
                <span
                  className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-400'} line-through block tabular-nums`}
                >
                  {servicePrice.toLocaleString('vi-VN')} đ
                </span>
              )}
            </div>
          </div>

          <ThermalReceiptComboItemsSection
            isDark={isDark}
            booking={booking}
            selectedCombo={selectedCombo}
            selectedUnderCombo={selectedUnderCombo}
            comboRedemption={comboRedemption}
          />

          {/* Item 3+: Sản phẩm dưỡng mi Yeppeum bán kèm */}
          {cartProducts.map((p, idx) => (
            <div
              key={idx}
              className={`flex justify-between items-center ${isDark ? 'text-neutral-300' : 'text-gray-800'}`}
            >
              <span>
                {selectedCombo ? idx + 3 : idx + 2}. {p.productName} (x{p.quantity})
              </span>
              <span className={`tabular-nums font-bold text-[var(--mos-text)]`}>
                {(p.price * p.quantity).toLocaleString('vi-VN')} đ
              </span>
            </div>
          ))}

          {/* Thuế VAT (8%) */}
          {vatAmount > 0 && (
            <div
              className={`flex justify-between items-center ${isDark ? 'text-neutral-400 border-neutral-800' : 'text-gray-700 border-gray-100'} font-semibold pt-1 border-t`}
            >
              <span>Thuế VAT ({(vatRate * 100).toFixed(0)}%)</span>
              <span className={`tabular-nums font-bold text-[var(--mos-text)]`}>
                +{vatAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}

          {/* Tiền Tip */}
          {tipAmount > 0 && (
            <div
              className={`flex justify-between items-center ${isDark ? 'text-emerald-300 bg-emerald-950/40 border-emerald-800' : 'text-emerald-800 bg-emerald-50/60 border-emerald-200'} font-semibold px-2 py-1 rounded-lg border`}
            >
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                <span>Tiền Tip khách thưởng</span>
              </span>
              <span className="tabular-nums font-bold">+{tipAmount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          {/* Cấn trừ Kim Cương */}
          {diamondUsed > 0 && (
            <div
              className={`flex justify-between items-center ${isDark ? 'text-cyan-300 bg-cyan-950/40 border-cyan-800' : 'text-cyan-900 bg-cyan-50 border-cyan-200'} font-bold px-2 py-1 rounded-lg border`}
            >
              <span className="flex items-center gap-1">
                <Gem className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Cấn trừ Ví Kim Cương ({diamondUsed} 💎)</span>
              </span>
              <span className={`tabular-nums font-black ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
                -{diamondDiscountAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}
        </div>

        <div className={`border-b border-dashed ${isDark ? 'border-neutral-700' : 'border-gray-300'}`} />

        {/* Total & Payment Method */}
        <div className="space-y-1.5">
          <div className={`flex justify-between items-center text-[15px] font-black text-[var(--mos-text)]`}>
            <span>TỔNG THANH TOÁN:</span>
            <span className="tabular-nums text-[18px] text-[#FF9500]">{grandTotal.toLocaleString('vi-VN')} đ</span>
          </div>
          <div
            className={`flex justify-between items-center text-[11px] ${isDark ? 'text-neutral-400' : 'text-gray-600'} font-medium`}
          >
            <span>Hình thức thanh toán:</span>
            <span
              className={`font-bold ${isDark ? 'text-neutral-200 bg-neutral-800' : 'text-black bg-gray-100'} px-2 py-0.5 rounded`}
            >
              {grandTotal === 0 && diamondUsed > 0
                ? '💎 100% Ví Kim Cương'
                : booking?.billing?.paymentMethod === 'VIETQR'
                  ? 'Chuyển khoản QR (Bank)'
                  : booking?.billing?.paymentMethod === 'POS'
                    ? 'Thẻ ngân hàng (POS)'
                    : 'Tiền mặt (Cash)'}
            </span>
          </div>

          {/* Ảnh bill đối soát kế toán */}
          {booking?.billing?.transferProofPhoto && (
            <div
              className={`${isDark ? 'bg-sky-950/30 border-sky-800' : 'bg-sky-50 border-sky-200'} p-2.5 rounded-xl border flex items-center justify-between gap-3`}
            >
              <div className="space-y-0.5 min-w-0">
                <div
                  className={`text-[11px] font-bold ${isDark ? 'text-sky-300' : 'text-sky-950'} flex items-center gap-1.5`}
                >
                  <span className="text-base leading-none">📸</span>
                  <span>Ảnh bill chuyển khoản đối soát (VCB):</span>
                </div>
                <div className={`text-[10px] ${isDark ? 'text-sky-400' : 'text-sky-800'} font-medium truncate`}>
                  Mã GD: {branchCode} {booking?.orderNumber?.replace(/\D/g, '') || booking?.id} DV TIP...
                </div>
              </div>
              <img
                src={booking.billing.transferProofPhoto}
                alt="Bill đối soát"
                className={`w-12 h-12 object-cover rounded-lg border ${isDark ? 'border-sky-700' : 'border-sky-300'} shadow-2xs shrink-0 cursor-pointer`}
              />
            </div>
          )}

          {/* Trạng thái gửi hóa đơn & bảo hành qua Zalo */}
          {booking?.billing?.zaloConsent?.agreed ? (
            <div
              className={`${isDark ? 'bg-sky-950/30 border-sky-800 text-sky-300' : 'bg-[#EBF5FF] border-[#B9E6FE] text-[#004EEB]'} border rounded-xl p-2.5 space-y-1`}
            >
              <div className="flex items-center justify-between font-bold text-[11.5px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none">💬</span>
                  <span className={`${isDark ? 'text-sky-400' : 'text-[#026AA2]'} font-black shrink-0`}>
                    Đã gửi qua Zalo:
                  </span>
                  <span
                    className={`font-extrabold ${isDark ? 'text-sky-300' : 'text-[#004EEB]'} tabular-nums truncate`}
                  >
                    {booking.billing.zaloConsent.phone}
                  </span>
                </div>
                <span
                  className={`${isDark ? 'bg-sky-900/60 text-sky-200' : 'bg-[#D1E9FF] text-[#004EEB]'} px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0`}
                >
                  {booking.billing.zaloConsent.sentAt ? `✓ ${booking.billing.zaloConsent.sentAt}` : '✓ Đã nhận'}
                </span>
              </div>
              <div
                className={`text-[10px] ${isDark ? 'text-sky-400' : 'text-[#026AA2]'} pl-5 flex items-center gap-1.5 flex-wrap`}
              >
                <span>✓ Hóa đơn điện tử</span>
                <span>•</span>
                <span>✓ Bảo hành 3 ngày</span>
                <span>•</span>
                <span>✓ Voucher 50K</span>
              </div>
            </div>
          ) : (
            <div
              className={`${isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-gray-50 border-gray-200 text-gray-500'} border rounded-xl p-2 flex items-center justify-between text-[10.5px] font-medium`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">💬</span>
                <span>Chưa gửi Zalo (Khách không dùng / Bỏ qua)</span>
              </div>
              <span
                className={`text-[10px] font-bold ${isDark ? 'text-neutral-400 bg-neutral-800 border-neutral-700' : 'text-gray-400 bg-white border-gray-200'} px-2 py-0.5 rounded border`}
              >
                Chưa kết nối
              </span>
            </div>
          )}

          {/* Thông tin Ví Kim Cương minh bạch */}
          {diamondUsed > 0 ? (
            <div
              className={`text-[10.5px] ${isDark ? 'text-cyan-300 bg-cyan-950/40 border-cyan-800' : 'text-cyan-900 bg-cyan-50 border-cyan-200'} font-semibold px-2.5 py-1.5 rounded-xl border flex items-center justify-between`}
            >
              <span>
                💎 Đã cấn trừ {diamondUsed} 💎 (-{diamondDiscountAmount.toLocaleString('vi-VN')}đ):
              </span>
              <span className={`font-black ${isDark ? 'text-cyan-200' : 'text-cyan-950'}`}>
                Ví còn {booking?.diamondBalance !== undefined ? booking.diamondBalance : 0} 💎
              </span>
            </div>
          ) : (
            <div
              className={`text-[10.5px] ${isDark ? 'text-cyan-400 bg-cyan-950/30 border-cyan-900' : 'text-cyan-900 bg-cyan-50/60 border-cyan-100'} font-medium px-2.5 py-1 rounded-xl border flex items-center justify-between`}
            >
              <span>💎 Số dư Ví Kim Cương:</span>
              <span className={`font-bold ${isDark ? 'text-cyan-200' : 'text-cyan-950'}`}>
                {booking?.diamondBalance !== undefined ? booking.diamondBalance : 0} 💎 (còn nguyên)
              </span>
            </div>
          )}
        </div>

        {/* Quyền Lợi Chuyên Viên Accordion (Ẩn mặc định, nhấn xem để mở rộng) */}
        {(() => {
          const isCheckoutStaffCc = actor?.tier === 'CC' || booking?.checkOutStaffTier === 'CC';
          return (
            <div className="pt-1.5">
              {!showStaffRewards ? (
                <button
                  type="button"
                  onClick={() => setShowStaffRewards(true)}
                  className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-[0.99] ${
                    isDark
                      ? 'bg-neutral-900/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>Xem</span>
                    {isCheckoutStaffCc ? (
                      <span className="font-bold text-emerald-400">CC</span>
                    ) : (
                      <FeatherSvg className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                </button>
              ) : (
                <div
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-amber-50/40 border-amber-200/70'
                  }`}
                >
                  {/* Header row as toggle to close */}
                  <button
                    type="button"
                    onClick={() => setShowStaffRewards(false)}
                    className={`w-full py-2.5 px-3 flex items-center justify-between text-[11px] font-bold border-b cursor-pointer select-none ${
                      isDark
                        ? 'border-neutral-800 text-amber-400 hover:bg-neutral-800/40'
                        : 'border-amber-200/60 text-amber-900 hover:bg-amber-100/40'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Ẩn</span>
                      {isCheckoutStaffCc ? (
                        <span className="font-bold text-emerald-400">CC</span>
                      ) : (
                        <FeatherSvg className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                    </span>
                    <ChevronUp className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  </button>

                  {/* Body */}
                  <div className="p-3 space-y-2 text-[11px]">
                    <div className={`space-y-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'} font-medium`}>
                      <div className="flex justify-between items-center">
                        <span>Tiền Tip bạn nhận ({actorTipBreakdown.actorEarnedPercent}%):</span>
                        <span className="font-bold tabular-nums text-emerald-400">
                          +{tipEarned.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      {tipAmount > 0 && (
                        <div
                          className={`text-[10px] text-[var(--mos-text-muted)] flex items-center justify-between flex-wrap gap-1 tabular-nums`}
                        >
                          <span>
                            • Làm mi ({actorTipBreakdown.techStaffName} · 70%): +
                            {actorTipBreakdown.techShareAmount.toLocaleString('vi-VN')}đ
                          </span>
                          <span>
                            • In ({actorTipBreakdown.checkInStaffName} · 10%): +
                            {actorTipBreakdown.checkInShareAmount.toLocaleString('vi-VN')}đ
                          </span>
                          <span>
                            • Out ({actorTipBreakdown.checkOutStaffName} · 10%): +
                            {actorTipBreakdown.checkOutShareAmount.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      )}
                      {comboBonus > 0 && (
                        <div className="flex justify-between items-center">
                          <span>
                            Thưởng chốt Combo ({selectedCombo && selectedUnderCombo ? '2 gói độc lập' : '1 gói'}):
                          </span>
                          <span className="font-bold tabular-nums inline-flex items-center gap-0.5 text-amber-400">
                            +{Math.round(comboBonus / 1000)}
                            <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                          </span>
                        </div>
                      )}
                      {isCheckoutStaffCc && (selectedCombo || selectedUnderCombo) && (
                        <div className="flex justify-between items-center text-emerald-400">
                          <span>Thưởng bán Combo (CC Checkout):</span>
                          <span className="font-bold">Tính trên Báo Cáo CC (Combo-Sold)</span>
                        </div>
                      )}
                      {serumBonus > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Thưởng bán Dưỡng mi Yeppeum:</span>
                          <span className="font-bold tabular-nums inline-flex items-center gap-0.5 text-amber-400">
                            +{Math.round(serumBonus / 1000)}
                            <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      className={`pt-2 border-t ${
                        isDark ? 'border-neutral-800' : 'border-amber-200/60'
                      } flex justify-between items-center font-black ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      } text-[11.5px]`}
                    >
                      <span>TỔNG THƯỞNG:</span>
                      <span
                        className={`tabular-nums text-[12px] font-black px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                          isDark
                            ? 'bg-amber-950/40 text-amber-300 border-amber-700/60'
                            : 'bg-white text-amber-900 border-amber-300 shadow-2xs'
                        }`}
                      >
                        {comboBonus + serumBonus > 0 ? (
                          <>
                            +{Math.round((comboBonus + serumBonus) / 1000)}
                            <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                          </>
                        ) : (
                          <>
                            0 <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Bottom Action Area */}
      <div className="pt-3">
        <button
          onClick={booking?.status === 'DONE' ? onBack || onFinishOrder : onFinishOrder}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[15px] shadow-md active:scale-98 transition-transform text-center cursor-pointer"
        >
          {booking?.status === 'DONE' ? 'QUAY VỀ DANH SÁCH LỊCH HẸN' : 'ĐÓNG & QUAY VỀ DANH SÁCH KHÁCH HÀNG'}
        </button>
      </div>
    </div>
  );
}
