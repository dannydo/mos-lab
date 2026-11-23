'use client';

import React, { useEffect, useState } from 'react';
import {
  canAdjustDoneBookingPostCheckout,
  formatIosPaymentMethodLabel,
  getVietnamDateYmd,
  isDoneBookingPendingPostCheckoutAdjustment,
  resolveActiveBookingComboWallets,
} from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { ChevronLeft, Heart, Gem } from 'lucide-react';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { CvFeather1Badge } from '../ui-kit/CvFeatherLabels';
import { IosStaffVisibilityToggle } from '../ui-kit/IosStaffVisibilityToggle';
import { CustomerPortfolioTriggerButton } from '../ui-kit/CustomerPortfolioTriggerButton';
import { ThermalReceiptComboItemsSection, ThermalServiceComboSubnote } from './checkout/ReceiptComboExpiryLine';
import { ThermalReceiptFooterStatusBlocks } from './checkout/ThermalReceiptFooterStatusBlocks';
import { ThermalReceiptStaffRewardsBox } from './checkout/ThermalReceiptStaffRewardsBox';
import { formatCartProductDisplayName } from './upsell/upsellCheckoutHelpers';
import {
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
} from '../../state/useIosBillingCheckout';
import type { CvToCvPlusRequirements } from '../../state/useIosBillingCheckout';
import { PostCheckoutCvlNoteCard } from './post-checkout/PostCheckoutCvlNoteCard';
import { PostCheckoutComboSheet } from './post-checkout/PostCheckoutComboSheet';
import {
  PostCheckoutAuditTimeline,
  PostCheckoutDoneCtaButton,
  PostCheckoutReceiptReconciliationBox,
} from './post-checkout/PostCheckoutHistorySection';

interface Screen14ThermalReceiptDoneProps {
  booking: BookingItem;
  actor?: ActiveActorProfile;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  isAdmin?: boolean;
  isSimulationMode?: boolean;
  isReadOnlyMentorView?: boolean;
  onRefreshDb?: () => Promise<unknown> | void;
  onFinishOrder: () => void;
  onBack?: () => void;
  simulationReplaySlot?: React.ReactNode;
}

export function Screen14ThermalReceiptDone({
  booking,
  actor,
  cvPlusRules,
  isAdmin = false,
  isSimulationMode = false,
  isReadOnlyMentorView = false,
  onRefreshDb,
  onFinishOrder,
  onBack,
  simulationReplaySlot,
}: Screen14ThermalReceiptDoneProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [showStaffRewards, setShowStaffRewards] = useState<boolean>(false);
  const [isPostCheckoutOpen, setIsPostCheckoutOpen] = useState<boolean>(false);

  const postCheckoutEligibility = canAdjustDoneBookingPostCheckout({
    status: booking?.status,
    bookingDateYmd: booking?.bookingDateYmd,
    todayVnYmd: getVietnamDateYmd(),
    actorTier: actor?.tier,
    isAdmin,
    actorStaffId: actor?.staffId,
    assignedStaffId: booking?.assignedStaffId,
    checkInStaffId: booking?.checkInStaffId,
    checkOutStaffId: booking?.checkOutStaffId,
    isReadOnlyMentorView,
  });
  const isPendingPostAdj = booking?.status === 'DONE' && isDoneBookingPendingPostCheckoutAdjustment(booking);

  useEffect(() => {
    setShowStaffRewards(false);
    setIsPostCheckoutOpen(false);
  }, [booking?.id]);
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
  const resolvedWallets = resolveActiveBookingComboWallets(booking || {});
  const hasUnderMinkCombo = resolvedWallets.isRedeemingUnderToday;
  const effectiveServiceCharge = resolveEffectiveServiceTotal({
    servicePrice,
    upgradePrice: booking?.upgradePrice || 0,
    serviceName: booking?.serviceName,
    isComboLive: Boolean(
      resolvedWallets.isRedeemingUpperToday &&
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
  const activePromoNames = Array.from(
    new Set(
      [booking?.servicePromotion?.name, ...cartProducts.map((p) => p.appliedPromotion?.name)].filter((v): v is string =>
        Boolean(v)
      )
    )
  );
  const promotionName =
    activePromoNames.length > 1
      ? `${activePromoNames.length} ưu đãi`
      : (activePromoNames[0] ?? booking?.appliedPromotion?.name ?? booking?.billing?.promotionName ?? null);
  const promotionDiscountAmount = booking?.billing?.promotionDiscountAmount ?? 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - promotionDiscountAmount);
  const vatAmount = booking?.billing?.vatAmount ?? Math.round(subtotalAfterDiscount * vatRate);
  const grandTotal =
    booking?.billing?.grandTotal !== undefined
      ? booking.billing.grandTotal
      : Math.max(0, subtotalAfterDiscount + vatAmount + tipAmount - diamondDiscountAmount);

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
        <h1 className="text-[#FFB400] font-bold text-[16px] tracking-tight flex items-center justify-center gap-1 px-24 text-center">
          Chi Tiết Hoá Đơn
        </h1>
        <IosStaffVisibilityToggle
          showStaffRewards={showStaffRewards}
          onToggle={() => setShowStaffRewards((prev) => !prev)}
          isDark={isDark}
          className="absolute right-0 -mr-1"
        />
      </div>

      <div className="mb-2.5">
        <CustomerPortfolioTriggerButton booking={booking} compact customerFacingMode={!showStaffRewards} />
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
            HĐ: #{booking?.orderNumber || 'BK-336925'}
            {showStaffRewards ? ` · ${isPendingCounter ? 'Chờ Quầy thu ngân chốt' : 'Hoàn tất'}` : ''}
          </div>
          {showStaffRewards && (
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
          )}
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
          {showStaffRewards && (
            <>
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
                  Check-out:{' '}
                  <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{checkOutStaff}</strong>
                </span>
              </div>
            </>
          )}
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
              <ThermalServiceComboSubnote
                isDark={isDark}
                resolvedWallets={resolvedWallets}
                comboRedemption={comboRedemption}
                selectedCombo={selectedCombo}
                selectedUnderCombo={selectedUnderCombo}
                effectiveServiceCharge={effectiveServiceCharge}
              />
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
                {selectedCombo ? idx + 3 : idx + 2}. {formatCartProductDisplayName(p.productName)} (x{p.quantity})
              </span>
              <span className={`tabular-nums font-bold text-[var(--mos-text)]`}>
                {(p.price * p.quantity).toLocaleString('vi-VN')} đ
              </span>
            </div>
          ))}

          {/* Khuyến mãi (Promotion) */}
          {promotionDiscountAmount > 0 && (
            <div
              data-testid="thermal-receipt-promotion-row"
              className={`flex justify-between items-center ${isDark ? 'text-emerald-300 bg-emerald-950/40 border-emerald-800' : 'text-emerald-800 bg-emerald-50 border-emerald-200'} font-bold px-2 py-1 rounded-lg border`}
            >
              <span className="truncate mr-2">🏷️ Khuyến mãi ({promotionName || 'Ưu đãi'})</span>
              <span className="tabular-nums font-black shrink-0">
                -{promotionDiscountAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}

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
              className={`font-bold ${isDark ? 'text-neutral-200 bg-neutral-800' : 'text-black bg-gray-100'} px-2 py-0.5 rounded text-right`}
            >
              {formatIosPaymentMethodLabel({
                grandTotal,
                diamondUsed,
                paymentMethod: booking?.billing?.paymentMethod,
                paymentBreakdown: booking?.billing?.paymentBreakdown,
                isPendingCounter,
              })}
            </span>
          </div>

          <PostCheckoutReceiptReconciliationBox booking={booking} isDark={isDark} />

          <ThermalReceiptFooterStatusBlocks
            isDark={isDark}
            booking={booking}
            branchCode={branchCode}
            diamondUsed={diamondUsed}
            diamondDiscountAmount={diamondDiscountAmount}
          />
        </div>

        {/* Quyền Lợi Chuyên Viên (Chỉ hiển thị khi bật nút Con mắt trên Header) */}
        {showStaffRewards && (
          <ThermalReceiptStaffRewardsBox
            isDark={isDark}
            isCheckoutStaffCc={isCheckoutStaffCc}
            actorTipBreakdown={actorTipBreakdown}
            tipAmount={tipAmount}
            tipEarned={tipEarned}
            comboBonus={comboBonus}
            serumBonus={serumBonus}
            hasSelectedCombo={Boolean(selectedCombo)}
            hasSelectedUnderCombo={Boolean(selectedUnderCombo)}
          />
        )}
      </div>

      <PostCheckoutCvlNoteCard
        booking={booking}
        isDark={isDark}
        showStaffRewards={showStaffRewards}
        isSimulationMode={isSimulationMode}
        onNoteCreated={() => void onRefreshDb?.()}
      />
      <PostCheckoutAuditTimeline
        booking={booking}
        isDark={isDark}
        showStaffRewards={showStaffRewards}
        onOpenSheet={() => setIsPostCheckoutOpen(true)}
      />

      {simulationReplaySlot && <div className="pt-2">{simulationReplaySlot}</div>}

      {/* Bottom Action Area */}
      <div className="pt-3 space-y-2">
        {booking?.status === 'DONE' && postCheckoutEligibility.allowed && (
          <PostCheckoutDoneCtaButton
            isDark={isDark}
            isPendingPostAdj={isPendingPostAdj}
            onClick={() => setIsPostCheckoutOpen(true)}
            onOpenTipQr={() => setIsPostCheckoutOpen(true)}
          />
        )}

        <button
          onClick={booking?.status === 'DONE' ? onBack || onFinishOrder : onFinishOrder}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[15px] shadow-md active:scale-98 transition-transform text-center cursor-pointer"
        >
          {booking?.status === 'DONE' ? 'QUAY VỀ DANH SÁCH LỊCH HẸN' : 'ĐÓNG & QUAY VỀ DANH SÁCH KHÁCH HÀNG'}
        </button>
      </div>

      {isPostCheckoutOpen && (
        <PostCheckoutComboSheet
          open={isPostCheckoutOpen}
          onClose={() => setIsPostCheckoutOpen(false)}
          booking={booking}
          actor={actor}
          isAdmin={isAdmin}
          isSimulationMode={isSimulationMode}
          cvPlusRules={cvPlusRules}
          onAdjusted={onRefreshDb}
        />
      )}
    </div>
  );
}
