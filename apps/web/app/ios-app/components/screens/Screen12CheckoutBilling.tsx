'use client';

import React, { useState } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';

interface Screen12CheckoutBillingProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  onBack: () => void;
  onChoosePayment: (method: 'CASH' | 'POS' | 'VIETQR', tipAmount?: number) => void;
  onEditService?: () => void;
}

export function Screen12CheckoutBilling({
  booking,
  actor,
  onBack,
  onChoosePayment,
  onEditService,
}: Screen12CheckoutBillingProps) {
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'POS' | 'VIETQR'>(
    booking?.billing?.paymentMethod || 'VIETQR'
  );
  const [tipAmount, setTipAmount] = useState<number>(booking?.billing?.tipAmount ?? 50000);

  const handleProceed = () => {
    onChoosePayment(selectedMethod, tipAmount);
  };

  const customerName = booking?.customerName || 'Chị Trúc';
  const customerPhone = booking?.customerPhone || '0933.779.207';
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
  const effectiveServiceCharge = selectedCombo
    ? selectedCombo.todaySingleServiceWaived
      ? 0
      : servicePrice
    : comboRedemption
      ? comboRedemption.totalCustomerPayToday
      : servicePrice;
  const subtotal =
    booking?.billing?.subtotal ??
    effectiveServiceCharge +
      (selectedCombo ? selectedCombo.price : 0) +
      (selectedUnderCombo ? selectedUnderCombo.price : 0) +
      cartProducts.reduce((s, p) => s + p.price * p.quantity, 0);
  const vatRate = booking?.billing?.vatRate ?? 0.08;
  const vatAmount = booking?.billing?.vatAmount ?? Math.round(subtotal * vatRate);
  const totalWithVat = subtotal + vatAmount;
  const finalGrandTotal = totalWithVat + tipAmount;

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Check Out / Thanh Toán"
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
        {/* Customer & 3-Staff Attribution Header Card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-bold text-black">
                {customerName} · <span className="tabular-nums">{customerPhone}</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
                Chuyên viên làm mi: <strong className="text-black">{assignedStaff}</strong>
              </div>
            </div>
            <span className="bg-[#22C55E] text-white font-extrabold text-[11px] px-2.5 py-1 rounded-full shadow-xs">
              Đã Check-out
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 text-[11px]">
            <div className="bg-amber-50 rounded-xl px-2.5 py-1.5 border border-amber-200">
              <span className="text-gray-500 block text-[10px]">Người Check-in:</span>
              <span className="font-bold text-black">{checkInStaff} (CV🪶)</span>
            </div>
            <div className="bg-emerald-50 rounded-xl px-2.5 py-1.5 border border-emerald-200">
              <span className="text-gray-500 block text-[10px]">Người Check-out:</span>
              <span className="font-bold text-emerald-800">{checkOutStaff} (CV🪶)</span>
            </div>
          </div>
        </div>

        {/* Section 1: Chi Tiết Hóa Đơn */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            CHI TIẾT HÓA ĐƠN
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            {/* Item 1: Service */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-bold text-black">1. {serviceName}</span>
                  {onEditService && (
                    <button
                      type="button"
                      onClick={onEditService}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      ✏️ Đổi dịch vụ / Nâng cấp
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Chuyên viên làm mi: {assignedStaff}
                  {booking?.attributes?.style && ` · Dáng ${booking.attributes.style}`}
                </div>
                {selectedCombo ? (
                  selectedCombo.todaySingleServiceWaived ? (
                    <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      ✓ Trừ vào Buổi 1 của gói mới mua (Miễn thu lẻ {servicePrice.toLocaleString('vi-VN')}đ)
                    </div>
                  ) : (
                    <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                      ✓ Khách trả lẻ ca này · Giữ trọn vẹn số buổi gói mới mua
                    </div>
                  )
                ) : comboRedemption ? (
                  <div className="text-[11px] text-sky-700 font-semibold mt-0.5">
                    ✓ {comboRedemption.explanation} (Ví còn {comboRedemption.remainingAfterToday} lần)
                  </div>
                ) : (
                  upgradePrice > 0 && (
                    <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                      Gốc: {originalBookedPrice.toLocaleString('vi-VN')}đ + Nâng cấp: +
                      {upgradePrice.toLocaleString('vi-VN')}đ
                    </div>
                  )
                )}
              </div>
              <div className="text-right">
                {selectedCombo ? (
                  selectedCombo.todaySingleServiceWaived ? (
                    <>
                      <span className="text-[13px] text-emerald-700 font-extrabold tabular-nums block">0 đ</span>
                      <span className="text-[10px] text-gray-400 line-through tabular-nums block">
                        {servicePrice.toLocaleString('vi-VN')} đ
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px] text-gray-900 font-black tabular-nums block">
                      {servicePrice.toLocaleString('vi-VN')} đ
                    </span>
                  )
                ) : comboRedemption ? (
                  <>
                    <span className="text-[13px] text-sky-800 font-extrabold tabular-nums block">
                      {comboRedemption.totalCustomerPayToday > 0
                        ? `+${comboRedemption.totalCustomerPayToday.toLocaleString('vi-VN')} đ`
                        : '0 đ'}
                    </span>
                    <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                      Trừ 1 lượt gói
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[13px] text-gray-800 font-bold tabular-nums block">
                      {servicePrice.toLocaleString('vi-VN')} đ
                    </span>
                    {upgradePrice > 0 && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Đã nâng cấp
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Item 2: Combo if selected */}
            {selectedCombo && (
              <div className="p-3.5 flex items-center justify-between bg-amber-50/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13px] font-bold text-black">2. {selectedCombo.name}</span>
                    {selectedCombo.isUpTierUpgrade && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                        ⭐ Nâng Cấp Gói
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="text-emerald-700 font-bold">
                      Thưởng chốt: +{Math.round(selectedCombo.bonus / 1000)}🪶
                    </span>
                    {selectedCombo.remainingAfterToday && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-indigo-800 font-semibold tabular-nums">
                          Ví còn: {selectedCombo.remainingAfterToday.totalRemaining}/{selectedCombo.sessions} buổi (
                          {selectedCombo.remainingAfterToday.totalPaidRemaining} mua +{' '}
                          {selectedCombo.remainingAfterToday.totalBonusRemaining} tặng)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-[13px] text-gray-800 font-bold tabular-nums shrink-0 ml-2">
                  {selectedCombo.price.toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}

            {/* Item 2B: Under Lash Combo if selected */}
            {selectedUnderCombo && (
              <div className="p-3.5 flex items-center justify-between bg-emerald-50/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13px] font-bold text-black">
                      {selectedCombo ? '3. ' : '2. '}
                      {selectedUnderCombo.name}
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                      ✦ Combo Mi Dưới
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="text-emerald-700 font-bold">
                      Thưởng chốt: +{Math.round(selectedUnderCombo.bonus / 1000)}🪶
                    </span>
                    {selectedUnderCombo.remainingAfterToday && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-emerald-900 font-semibold tabular-nums">
                          Ví còn: {selectedUnderCombo.remainingAfterToday.totalRemaining}/{selectedUnderCombo.sessions}{' '}
                          buổi
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-[13px] text-gray-800 font-bold tabular-nums shrink-0 ml-2">
                  {selectedUnderCombo.price.toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}

            {/* Item 3: Products */}
            {cartProducts.map((p, idx) => {
              const baseIndex = 1 + (selectedCombo ? 1 : 0) + (selectedUnderCombo ? 1 : 0);
              return (
                <div key={idx} className="p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-black">
                      {baseIndex + idx + 1}. {p.productName}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                      SL: {p.quantity} · Thưởng chốt: +{Math.round(((p.cvBonus || 100000) * p.quantity) / 1000)}🪶
                    </div>
                  </div>
                  <span className="text-[13px] text-gray-800 font-bold tabular-nums">
                    {(p.price * p.quantity).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              );
            })}

            {/* Subtotal & VAT Rows */}
            <div className="p-3 bg-white space-y-1.5 border-t border-gray-100 text-[12px]">
              <div className="flex items-center justify-between text-gray-600 font-medium">
                <span>Tạm tính dịch vụ & SP:</span>
                <span className="text-gray-900 font-bold tabular-nums">{subtotal.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex items-center justify-between text-gray-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <span>Thuế VAT (8%):</span>
                  <span className="text-[9.5px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Chuẩn hóa đơn Wings
                  </span>
                </div>
                <span className="text-gray-900 font-bold tabular-nums">+{vatAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-700 font-semibold">
                  <span>💖 Tiền tip chuyên viên:</span>
                  <span className="font-extrabold tabular-nums">+{tipAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
            </div>

            {/* Total Row */}
            <div className="p-3.5 bg-[#FFFBEB] flex items-center justify-between border-t border-amber-200">
              <div>
                <span className="text-[13px] font-extrabold text-black block">TỔNG TIỀN THANH TOÁN</span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {tipAmount > 0 ? 'Đã gồm Dịch vụ + 8% VAT + Tiền tip' : 'Đã bao gồm 8% thuế VAT'}
                </span>
              </div>
              <span className="text-[19px] font-black text-[#FF9500] tabular-nums">
                {finalGrandTotal.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* CV Rotation Points Recording Banner */}
            {booking?.cvRotationPoints && (
              <div className="p-3 bg-blue-50/80 border-t border-blue-100 flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-blue-950">◔ Ghi nhận Vòng Xoay CV:</span>
                  <span className="text-[11px] text-blue-700 font-medium">
                    {booking.cvRotationBreakdown || 'Điểm thưởng cá nhân'}
                  </span>
                </div>
                <span className="font-black text-blue-800 tabular-nums">+{booking.cvRotationPoints} pts</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 1B: Tiền Tip Cho Chuyên Viên (Khách hàng xác nhận trực tiếp tại đây) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            <span>TIỀN TIP CHO CHUYÊN VIÊN</span>
            <span className="text-[10px] text-emerald-700 lowercase font-medium">tùy chọn theo độ hài lòng</span>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 space-y-2.5">
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { value: 0, label: '0đ' },
                { value: 20000, label: '20K' },
                { value: 50000, label: '50K' },
                { value: 100000, label: '100K' },
                { value: 200000, label: '200K' },
              ].map((p) => {
                const isSelected = tipAmount === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setTipAmount(p.value)}
                    className={`py-2 rounded-xl text-[12px] font-extrabold text-center transition-all tabular-nums cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-[#FFB400] text-black shadow-xs font-black'
                        : 'bg-[#F2F2F7] hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isSelected ? `✓ ${p.label}` : p.label}
                  </button>
                );
              })}
            </div>

            {tipAmount > 0 ? (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none">💖</span>
                  <div className="min-w-0">
                    <div className="font-extrabold text-emerald-950 truncate">
                      Đã ghi nhận tip {tipAmount.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium">
                      {assignedStaff} nhận {Math.round(tipAmount * 0.7).toLocaleString('vi-VN')}đ (70%) · Sảnh đón tiếp
                      nhận {Math.round(tipAmount * 0.3).toLocaleString('vi-VN')}đ (30%)
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-300 tabular-nums shrink-0 ml-1">
                  +{Math.round(tipAmount / 1000)}K
                </span>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-center text-[11px] text-gray-500 font-medium">
                Khách không gửi tip trong ca này · Không tính thêm phí
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Hình Thức Thanh Toán */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            HÌNH THỨC THANH TOÁN
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
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
                    active ? 'bg-[#F0FDF4]' : ''
                  }`}
                >
                  <span className={`text-[14px] font-medium ${active ? 'text-[#15803D] font-bold' : 'text-black'}`}>
                    {active && '✓ '}
                    {m.label}
                  </span>
                  <span className={`text-[14px] tabular-nums ${active ? 'text-[#15803D] font-bold' : 'text-gray-400'}`}>
                    {active ? `${finalGrandTotal.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={handleProceed}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[15px] shadow-md active:scale-98 transition-transform text-center tracking-wide"
          >
            CHỐT THANH TOÁN · {finalGrandTotal.toLocaleString('vi-VN')} đ
          </button>
        </div>
      </div>
    </div>
  );
}
