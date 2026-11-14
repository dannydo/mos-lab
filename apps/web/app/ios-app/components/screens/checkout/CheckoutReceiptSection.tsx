'use client';

import React from 'react';
import type { IosPromotionOption, IosPromotionTargetScope } from '@mos-lab/shared';
import { Sparkles } from 'lucide-react';
import { BookingItem } from '../../../state/mockData';
import { CvFeather1Badge, FeatherSvg } from '../../ui-kit/CvFeatherLabels';
import { ReceiptComboExpiryLine } from './ReceiptComboExpiryLine';
import { ReceiptItemPromotionBadge } from './ReceiptItemPromotionBadge';
import { ReceiptTotalsSummary } from './ReceiptTotalsSummary';
import { ReceiptQuickScanProductRow, ReceiptScannedSerialChips } from './ReceiptQuickSerumControls';
import { formatCartProductDisplayName } from '../upsell/upsellCheckoutHelpers';

export interface ReceiptPromotionOpenTarget {
  scope: IosPromotionTargetScope;
  label: string;
  amount: number;
  productIndex?: number;
  productId?: number;
  currentPromo?: IosPromotionOption | null;
}

export interface ReceiptPromotionClearTarget {
  scope: IosPromotionTargetScope;
  productIndex?: number;
  productId?: number;
}

function cleanComboTitle(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\(\d+\s*lần\)/gi, '').trim();
}

export interface CheckoutReceiptSectionProps {
  isDark: boolean;
  booking?: BookingItem;
  customerName: string;
  customerPhone: string;
  assignedStaff: string;
  checkInStaff: string;
  checkOutStaff: string;
  serviceName: string;
  servicePrice: number;
  effectiveServiceCharge: number;
  upgradePrice: number;
  isComboLive: boolean;
  selectedCombo: BookingItem['selectedCombo'] | null;
  selectedUnderCombo: BookingItem['selectedUnderCombo'] | null;
  comboRedemption: BookingItem['comboRedemption'] | null;
  cartProducts: NonNullable<BookingItem['cartProducts']>;
  hasBothCombos: boolean;
  comboTotalRevenue: number;
  totalComboBonus: number;
  upperComboBonus?: number;
  underComboBonus?: number;
  isCheckoutStaffCc?: boolean;
  subtotal: number;
  vatAmount: number;
  appliedPromotionName?: string | null;
  promotionDiscountAmount?: number;
  servicePromotion?: IosPromotionOption | null;
  serviceDiscountAmount?: number;
  productDiscounts?: number[];
  onOpenItemPromotionPicker?: (target: ReceiptPromotionOpenTarget) => void;
  onClearItemPromotion?: (target: ReceiptPromotionClearTarget) => void;
  onRemoveScannedUnit?: (productIndex: number, inventoryWarehouseItemId?: number) => void;
  onOpenProductQrScanner?: () => void;
  tipAmount: number;
  effectiveDiamondUsed: number;
  diamondDiscountAmount: number;
  finalGrandTotal: number;
  showStaffRewards: boolean;
  onToggleShowStaffRewards?: () => void;
  onEditService?: () => void;
}

export function CheckoutReceiptSection({
  isDark,
  booking,
  customerName,
  customerPhone,
  assignedStaff,
  checkInStaff,
  checkOutStaff,
  serviceName,
  servicePrice,
  effectiveServiceCharge,
  upgradePrice,
  isComboLive,
  selectedCombo,
  selectedUnderCombo,
  comboRedemption,
  cartProducts,
  hasBothCombos,
  comboTotalRevenue,
  totalComboBonus,
  upperComboBonus = 0,
  underComboBonus = 0,
  isCheckoutStaffCc = false,
  subtotal,
  vatAmount,
  appliedPromotionName,
  promotionDiscountAmount = 0,
  servicePromotion,
  serviceDiscountAmount = 0,
  productDiscounts = [],
  onOpenItemPromotionPicker,
  onClearItemPromotion,
  onRemoveScannedUnit,
  onOpenProductQrScanner,
  tipAmount,
  effectiveDiamondUsed,
  diamondDiscountAmount,
  finalGrandTotal,
  showStaffRewards,
  onToggleShowStaffRewards,
  onEditService,
}: CheckoutReceiptSectionProps) {
  const hasNewComboWaiver =
    !comboRedemption &&
    (Boolean(selectedCombo && selectedCombo.todaySingleServiceWaived !== false) ||
      Boolean(selectedUnderCombo && selectedUnderCombo.todaySingleServiceWaived !== false));
  return (
    <>
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
            <div className={`text-[15px] font-black text-[var(--mos-text)] tracking-tight truncate`}>
              {customerName} ·{' '}
              <span className={`tabular-nums font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                {customerPhone}
              </span>
            </div>
            {showStaffRewards && (
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
            )}
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
                <span className={`text-[13px] font-extrabold text-[var(--mos-text)] tracking-tight`}>
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
              {(showStaffRewards || booking?.attributes?.style) && (
                <div className={`text-[11px] text-[var(--mos-text-muted)] font-medium`}>
                  {showStaffRewards ? assignedStaff : ''}
                  {showStaffRewards && booking?.attributes?.style ? ' · ' : ''}
                  {booking?.attributes?.style ? `Dáng ${booking.attributes.style}` : ''}
                </div>
              )}
              {comboRedemption ? (
                <div className="pt-0.5 space-y-0.5 text-[10px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`font-bold ${
                        isDark
                          ? 'text-sky-300 bg-sky-950/40 border-sky-500/40'
                          : 'text-sky-700 bg-sky-50 border-sky-200'
                      } border px-1.5 py-0.5 rounded`}
                    >
                      Trừ 1 lượt gói ({comboRedemption.comboName || 'Gói cũ'})
                    </span>
                    <span className="text-neutral-400 font-semibold tabular-nums">
                      Combo còn: ✦ {comboRedemption.paidRemaining ?? 0} · ↻ {comboRedemption.bonusRemaining ?? 0}
                    </span>
                  </div>
                  <ReceiptComboExpiryLine
                    dateExpired={comboRedemption.dateExpired ?? booking?.comboLiveStatus?.dateExpired}
                    dateExpiredDisplay={comboRedemption.dateExpiredDisplay}
                    isDark={isDark}
                    variant="redemption"
                  />
                </div>
              ) : hasNewComboWaiver ? (
                <div className="pt-0.5">
                  <span
                    className={`inline-flex items-center text-[10px] font-bold ${
                      isDark
                        ? 'text-emerald-300 bg-emerald-950/40 border-emerald-500/40'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    } border px-1.5 py-0.5 rounded`}
                  >
                    {effectiveServiceCharge === 0
                      ? 'Trừ Buổi 1 (Miễn phí ca này)'
                      : 'Trừ Buổi 1 gói đã chọn · Thu lẻ phần còn lại'}
                  </span>
                </div>
              ) : selectedCombo ? (
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
              <ReceiptItemPromotionBadge
                isDark={isDark}
                itemAmount={effectiveServiceCharge}
                appliedPromotion={servicePromotion}
                discountAmount={serviceDiscountAmount}
                testIdPrefix="service"
                onOpenPicker={
                  onOpenItemPromotionPicker
                    ? () =>
                        onOpenItemPromotionPicker({
                          scope: 'service',
                          label: serviceName,
                          amount: effectiveServiceCharge,
                          currentPromo: servicePromotion,
                        })
                    : undefined
                }
                onClear={onClearItemPromotion ? () => onClearItemPromotion({ scope: 'service' }) : undefined}
              />
            </div>

            {/* Price: Zero-Drop 'đ' invariant */}
            <div className="text-right shrink-0">
              {comboRedemption ? (
                <div className="space-y-0.5">
                  <span
                    className={`text-[13px] ${isDark ? 'text-sky-300' : 'text-sky-800'} font-black tabular-nums whitespace-nowrap block`}
                  >
                    {effectiveServiceCharge > 0
                      ? `+${Math.max(0, effectiveServiceCharge - serviceDiscountAmount).toLocaleString('vi-VN')}đ`
                      : '0đ'}
                  </span>
                  {serviceDiscountAmount > 0 && effectiveServiceCharge > 0 && (
                    <span
                      className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-neutral-400'} line-through tabular-nums whitespace-nowrap block`}
                    >
                      +{effectiveServiceCharge.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                  <span
                    className={`text-[10px] ${
                      isDark ? 'text-sky-300 bg-sky-950/50 border-sky-500/40' : 'text-sky-700 bg-sky-50 border-sky-200'
                    } font-bold px-1.5 py-0.5 rounded border whitespace-nowrap inline-block`}
                  >
                    Trừ 1 lượt
                  </span>
                </div>
              ) : hasNewComboWaiver ? (
                <div className="space-y-0.5">
                  <span
                    className={`text-[13px] ${
                      Math.max(0, effectiveServiceCharge - serviceDiscountAmount) === 0
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-700'
                        : isDark
                          ? 'text-white'
                          : 'text-neutral-900'
                    } font-black tabular-nums whitespace-nowrap block`}
                  >
                    {effectiveServiceCharge === 0
                      ? '0đ'
                      : `${Math.max(0, effectiveServiceCharge - serviceDiscountAmount).toLocaleString('vi-VN')}đ`}
                  </span>
                  {(effectiveServiceCharge < servicePrice || serviceDiscountAmount > 0) && (
                    <span
                      className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-neutral-400'} line-through tabular-nums whitespace-nowrap block`}
                    >
                      {(serviceDiscountAmount > 0 ? effectiveServiceCharge : servicePrice).toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
              ) : isComboLive ? (
                <div className="space-y-0.5">
                  <span
                    className={`text-[13px] ${isDark ? 'text-sky-300' : 'text-sky-800'} font-black tabular-nums whitespace-nowrap block`}
                  >
                    {effectiveServiceCharge > 0
                      ? `+${Math.max(0, effectiveServiceCharge - serviceDiscountAmount).toLocaleString('vi-VN')}đ`
                      : '0đ'}
                  </span>
                  {serviceDiscountAmount > 0 && effectiveServiceCharge > 0 && (
                    <span
                      className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-neutral-400'} line-through tabular-nums whitespace-nowrap block`}
                    >
                      +{effectiveServiceCharge.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap inline-block ${
                      effectiveServiceCharge > 0
                        ? isDark
                          ? 'text-emerald-300 bg-emerald-950/50 border-emerald-500/40'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : isDark
                          ? 'text-sky-300 bg-sky-950/50 border-sky-500/40'
                          : 'text-sky-700 bg-sky-50 border-sky-200'
                    }`}
                  >
                    {effectiveServiceCharge > 0 ? 'Phụ thu' : 'Trừ lượt'}
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <span
                    className={`text-[13px] text-[var(--mos-text)] font-black tabular-nums whitespace-nowrap block`}
                  >
                    {Math.max(0, effectiveServiceCharge - serviceDiscountAmount).toLocaleString('vi-VN')}đ
                  </span>
                  {serviceDiscountAmount > 0 && effectiveServiceCharge > 0 && (
                    <span
                      className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-neutral-400'} line-through tabular-nums whitespace-nowrap block`}
                    >
                      {effectiveServiceCharge.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
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
                  <span className={`text-[13px] font-black text-[var(--mos-text)] tracking-tight`}>
                    {cleanComboTitle(selectedCombo.name)}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 flex-wrap text-[11px] text-[var(--mos-text-muted)] font-medium`}
                >
                  <span>{selectedCombo.sessions || selectedCombo.remainingAfterToday?.totalRemaining || 10} buổi</span>
                  {showStaffRewards &&
                    !isCheckoutStaffCc &&
                    !hasBothCombos &&
                    (upperComboBonus || totalComboBonus) > 0 && (
                      <>
                        <span className={isDark ? 'text-neutral-600' : 'text-neutral-300'}>•</span>
                        <span
                          className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold inline-flex items-center gap-0.5`}
                        >
                          Thưởng gói: +{Math.round((upperComboBonus || totalComboBonus) / 1000)}
                          <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        </span>
                      </>
                    )}
                </div>
                <ReceiptComboExpiryLine
                  dateExpired={selectedCombo.dateExpired}
                  dateExpiredDisplay={selectedCombo.dateExpiredDisplay}
                  expiryFormulaSummary={selectedCombo.expiryFormulaSummary}
                  revivedExpiredSessions={selectedCombo.revivedExpiredSessions}
                  isDark={isDark}
                  variant="combo"
                  showFormula
                />
              </div>
              <span className={`text-[13px] text-[var(--mos-text)] font-black tabular-nums whitespace-nowrap shrink-0`}>
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
                  <span className={`text-[13px] font-black text-[var(--mos-text)] tracking-tight`}>
                    {cleanComboTitle(selectedUnderCombo.name)}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 flex-wrap text-[11px] text-[var(--mos-text-muted)] font-medium`}
                >
                  <span>{selectedUnderCombo.sessions || 10} buổi (Mi Dưới)</span>
                  {showStaffRewards &&
                    !isCheckoutStaffCc &&
                    !hasBothCombos &&
                    (underComboBonus || totalComboBonus) > 0 && (
                      <>
                        <span className={isDark ? 'text-neutral-600' : 'text-neutral-300'}>•</span>
                        <span
                          className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold inline-flex items-center gap-0.5`}
                        >
                          Thưởng gói: +{Math.round((underComboBonus || totalComboBonus) / 1000)}
                          <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        </span>
                      </>
                    )}
                </div>
                <ReceiptComboExpiryLine
                  dateExpired={selectedUnderCombo.dateExpired}
                  dateExpiredDisplay={selectedUnderCombo.dateExpiredDisplay}
                  expiryFormulaSummary={selectedUnderCombo.expiryFormulaSummary}
                  revivedExpiredSessions={selectedUnderCombo.revivedExpiredSessions}
                  isDark={isDark}
                  variant="under"
                  showFormula
                />
              </div>
              <span className={`text-[13px] text-[var(--mos-text)] font-black tabular-nums whitespace-nowrap shrink-0`}>
                {selectedUnderCombo.price.toLocaleString('vi-VN')}đ
              </span>
            </div>
          )}

          {/* Item 2C: Combined 2-Combo Bonus Summary Banner */}
          {hasBothCombos && showStaffRewards && !isCheckoutStaffCc && (
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
                  Thưởng gộp 2 gói mua cùng lúc ({comboTotalRevenue.toLocaleString('vi-VN')}đ):
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
          {cartProducts.map((p, idx) => {
            const lineGross = p.price * p.quantity;
            const lineDiscount = productDiscounts[idx] ?? 0;
            const displayProductName = formatCartProductDisplayName(p.productName);
            return (
              <div key={idx} className="p-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className={`text-[13px] font-bold text-[var(--mos-text)] truncate`}>{displayProductName}</div>
                  <div
                    className={`text-[11px] text-[var(--mos-text-muted)] font-medium inline-flex items-center gap-1`}
                  >
                    <span>SL: {p.quantity}</span>
                    {showStaffRewards && !isCheckoutStaffCc && (
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
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {onRemoveScannedUnit && (
                      <ReceiptScannedSerialChips
                        isDark={isDark}
                        productName={displayProductName}
                        scannedUnits={p.scannedUnits}
                        onRemoveUnit={(unitId) => onRemoveScannedUnit(idx, unitId)}
                        onOpenScanner={onOpenProductQrScanner}
                      />
                    )}
                    <ReceiptItemPromotionBadge
                      isDark={isDark}
                      itemAmount={lineGross}
                      appliedPromotion={p.appliedPromotion}
                      discountAmount={lineDiscount}
                      testIdPrefix={`product-${idx}`}
                      onOpenPicker={
                        onOpenItemPromotionPicker
                          ? () =>
                              onOpenItemPromotionPicker({
                                scope: 'product',
                                label: displayProductName,
                                amount: lineGross,
                                productIndex: idx,
                                productId: p.productId,
                                currentPromo: p.appliedPromotion,
                              })
                          : undefined
                      }
                      onClear={
                        onClearItemPromotion
                          ? () =>
                              onClearItemPromotion({
                                scope: 'product',
                                productIndex: idx,
                                productId: p.productId,
                              })
                          : undefined
                      }
                    />
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <span
                    className={`text-[13px] text-[var(--mos-text)] font-black tabular-nums whitespace-nowrap block`}
                  >
                    {Math.max(0, lineGross - lineDiscount).toLocaleString('vi-VN')}đ
                  </span>
                  {lineDiscount > 0 && (
                    <span
                      className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-neutral-400'} line-through tabular-nums whitespace-nowrap block`}
                    >
                      {lineGross.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {onOpenProductQrScanner && (
            <ReceiptQuickScanProductRow isDark={isDark} onOpenScanner={onOpenProductQrScanner} />
          )}

          <ReceiptTotalsSummary
            isDark={isDark}
            booking={booking}
            subtotal={subtotal}
            appliedPromotionName={appliedPromotionName}
            promotionDiscountAmount={promotionDiscountAmount}
            vatAmount={vatAmount}
            tipAmount={tipAmount}
            effectiveDiamondUsed={effectiveDiamondUsed}
            diamondDiscountAmount={diamondDiscountAmount}
            finalGrandTotal={finalGrandTotal}
            showStaffRewards={showStaffRewards}
          />
        </div>
      </div>
    </>
  );
}
