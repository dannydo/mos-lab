'use client';

import React, { useState, useMemo } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';

interface Screen12CheckoutBillingProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  onBack: () => void;
  onChoosePayment: (method: 'CASH' | 'POS' | 'VIETQR', tipAmount?: number, diamondUsed?: number) => void;
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
  const [activeRoundTarget, setActiveRoundTarget] = useState<number | null>(null);
  const [isCustomTipOpen, setIsCustomTipOpen] = useState<boolean>(false);
  const [customTipInput, setCustomTipInput] = useState<string>('');
  const [diamondUsed, setDiamondUsed] = useState<number>(booking?.billing?.diamondUsed ?? 0);

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

  // 💎 TỶ GIÁ VÍ KIM CƯƠNG: 1 💎 = 1.000 VNĐ (Khớp 100% legacy database & iOS App cũ)
  const DIAMOND_RATE = 1000;
  const customerDiamondBalance = booking?.diamondBalance ?? 350;
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

  const handleProceed = () => {
    onChoosePayment(selectedMethod, tipAmount, effectiveDiamondUsed);
  };

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
                      title="Đổi dịch vụ / Nâng cấp"
                      aria-label="Đổi dịch vụ"
                      className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors inline-flex items-center justify-center text-[10px] active:scale-90 cursor-pointer shadow-2xs"
                    >
                      ✏️
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
              {effectiveDiamondUsed > 0 && (
                <div className="flex items-center justify-between text-cyan-800 font-bold bg-cyan-50/80 px-2 py-1.5 rounded-xl border border-cyan-200">
                  <div className="flex items-center gap-1.5">
                    <span>💎 Thanh toán Kim Cương:</span>
                    <span className="text-[10px] font-black text-cyan-800 bg-white px-1.5 py-0.5 rounded border border-cyan-300 tabular-nums">
                      {effectiveDiamondUsed} 💎
                    </span>
                  </div>
                  <span className="font-black tabular-nums">-{diamondDiscountAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
            </div>

            {/* Total Row */}
            <div className="p-3.5 bg-[#FFFBEB] flex items-center justify-between border-t border-amber-200">
              <div>
                <span className="text-[13px] font-extrabold text-black block">TỔNG TIỀN THANH TOÁN</span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {effectiveDiamondUsed > 0
                    ? `Đã cấn trừ ${effectiveDiamondUsed} 💎 (-${diamondDiscountAmount.toLocaleString('vi-VN')}đ)`
                    : tipAmount > 0
                      ? 'Đã gồm Dịch vụ + 8% VAT + Tiền tip'
                      : 'Đã bao gồm 8% thuế VAT'}
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

        {/* Section 1B: Tiền Tip Cho Chuyên Viên (Hỗ trợ Tip theo mốc + Làm chẵn tổng thanh toán) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            <span>TIỀN TIP CHO CHUYÊN VIÊN</span>
            <span className="text-[10px] text-emerald-700 lowercase font-medium">tùy chọn theo độ hài lòng</span>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 space-y-2.5">
            {/* Hàng 1: Tip theo mốc cố định + nút Khác */}
            <div>
              <div className="text-[10.5px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">
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
                          : 'bg-[#F2F2F7] hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {isSelected ? `✓ ${p.label}` : p.label}
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
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                  }`}
                >
                  {isCustomTipOpen ? '✕ Đóng' : 'Khác ⌨️'}
                </button>
              </div>
            </div>

            {/* Hàng 2: Gợi ý làm tròn chẵn tổng thanh toán */}
            {roundUpSuggestions.length > 0 && (
              <div className="pt-1 border-t border-gray-100">
                <div className="text-[10.5px] text-amber-700 font-bold mb-1 flex items-center gap-1">
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
                            : 'bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 border-amber-200/80'
                        }`}
                      >
                        <div className="text-[12px] font-black tabular-nums">
                          {isSelected && '✓ '}
                          {opt.label}
                        </div>
                        <div
                          className={`text-[10px] tabular-nums font-semibold ${
                            isSelected ? 'text-black' : 'text-amber-700'
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
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-2.5 space-y-2 text-[11px] animate-fadeIn">
                <div className="flex items-center justify-between text-purple-950 font-bold">
                  <span>Nhập số tiền tip tùy ý (300K, 700K...):</span>
                  <span className="text-[10px] text-purple-700 font-normal">Đơn vị: VNĐ</span>
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
                    className="flex-1 bg-white border border-purple-300 rounded-xl px-3 py-2 text-[13px] font-black text-black tabular-nums focus:outline-none focus:ring-2 focus:ring-purple-400"
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
                  <span className="text-[10px] text-purple-800 font-semibold">Chọn nhanh:</span>
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
                      className="bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg px-2 py-0.5 text-[10.5px] font-bold tabular-nums cursor-pointer"
                    >
                      +{Math.round(amt / 1000)}K
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Thẻ Kết Quả Phân Bổ Tip */}
            {tipAmount > 0 ? (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none">💖</span>
                  <div className="min-w-0">
                    <div className="font-extrabold text-emerald-950 truncate">
                      {activeRoundTarget
                        ? `Làm tròn tổng đơn ${activeRoundTarget.toLocaleString('vi-VN')}đ (Tip: +${tipAmount.toLocaleString('vi-VN')}đ)`
                        : `Đã ghi nhận tip ${tipAmount.toLocaleString('vi-VN')}đ`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  <span className="text-[11px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-300 tabular-nums">
                    +{Math.round(tipAmount / 1000)}K
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTipAmount(0);
                      setActiveRoundTarget(null);
                      setIsCustomTipOpen(false);
                    }}
                    className="text-[10px] text-gray-400 hover:text-red-500 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200 cursor-pointer"
                  >
                    Bỏ tip
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-center text-[11px] text-gray-500 font-medium">
                Khách không gửi tip trong ca này · Không tính thêm phí
              </div>
            )}
          </div>
        </div>

        {/* Section 1C: Ví Kim Cương Của Khách (1 💎 = 1.000 VNĐ) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            <span className="flex items-center gap-1">
              <span>💎</span> VÍ KIM CƯƠNG CỦA KHÁCH
            </span>
            <span className="text-[10px] text-cyan-800 font-bold bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full tabular-nums">
              Số dư: {customerDiamondBalance} 💎 ({(customerDiamondBalance * DIAMOND_RATE).toLocaleString('vi-VN')}đ)
            </span>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 space-y-2.5">
            {customerDiamondBalance > 0 ? (
              <>
                <div className="text-[11px] text-gray-500 font-medium">
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
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : isSelected
                              ? 'bg-cyan-600 text-white shadow-xs font-black'
                              : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-100'
                        }`}
                      >
                        {isSelected && preset > 0 ? `✓ ${preset} 💎` : `${preset} 💎`}
                      </button>
                    );
                  })}
                  {/* Max Button */}
                  <button
                    type="button"
                    disabled={maxDiamondCanUse <= 0}
                    onClick={() => setDiamondUsed(maxDiamondCanUse)}
                    className={`py-2 rounded-xl text-[11px] font-extrabold text-center transition-all tabular-nums cursor-pointer active:scale-95 ${
                      maxDiamondCanUse <= 0
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : effectiveDiamondUsed === maxDiamondCanUse && maxDiamondCanUse > 0
                          ? 'bg-cyan-600 text-white shadow-xs font-black'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-xs font-black'
                    }`}
                  >
                    {effectiveDiamondUsed === maxDiamondCanUse && maxDiamondCanUse > 0
                      ? `✓ Hết ${maxDiamondCanUse} 💎`
                      : `Dùng hết (${maxDiamondCanUse} 💎)`}
                  </button>
                </div>

                {/* Status banner */}
                {effectiveDiamondUsed > 0 ? (
                  <div className="bg-cyan-50/90 border border-cyan-200 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base leading-none">💎</span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-cyan-950 truncate">
                          Đã trừ {effectiveDiamondUsed} 💎 (-{diamondDiscountAmount.toLocaleString('vi-VN')}đ)
                        </div>
                        <div className="text-[10px] text-cyan-800 font-medium">
                          Số dư ví còn lại sau ca:{' '}
                          <strong className="text-cyan-950">{customerDiamondBalance - effectiveDiamondUsed} 💎</strong>{' '}
                          (quy đổi{' '}
                          {((customerDiamondBalance - effectiveDiamondUsed) * DIAMOND_RATE).toLocaleString('vi-VN')}đ)
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDiamondUsed(0)}
                      className="text-[10px] font-bold text-gray-500 hover:text-red-600 bg-white px-2 py-1 rounded-lg border border-gray-200 shrink-0 ml-1 cursor-pointer"
                    >
                      Bỏ dùng
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-center text-[11px] text-gray-500 font-medium">
                    Chưa dùng Kim Cương · Giữ nguyên {customerDiamondBalance} 💎 trong ví cho các ca sau
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-center text-[11px] text-gray-400 font-medium">
                Khách chưa có số dư Kim Cương trong ví (0 💎)
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Hình Thức Thanh Toán */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            HÌNH THỨC THANH TOÁN
          </div>
          {finalGrandTotal === 0 ? (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-center space-y-1 shadow-sm">
              <div className="text-emerald-800 font-black text-[14px] flex items-center justify-center gap-1.5">
                <span>✓</span> ĐÃ THANH TOÁN 100% BẰNG VÍ KIM CƯƠNG
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">
                Đã cấn trừ đủ {effectiveDiamondUsed} 💎 (-{diamondDiscountAmount.toLocaleString('vi-VN')}đ). Không cần
                thu thêm tiền mặt hay chuyển khoản.
              </div>
            </div>
          ) : (
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
                    <span
                      className={`text-[14px] tabular-nums ${active ? 'text-[#15803D] font-bold' : 'text-gray-400'}`}
                    >
                      {active ? `${finalGrandTotal.toLocaleString('vi-VN')} đ` : '0 đ'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={handleProceed}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-[15px] shadow-md active:scale-98 transition-transform text-center tracking-wide ${
              finalGrandTotal === 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                : 'bg-[#FFB400] text-black'
            }`}
          >
            {finalGrandTotal === 0
              ? `XÁC NHẬN CHỐT ĐƠN (TRỪ ${effectiveDiamondUsed} 💎 · 0 Đ)`
              : `CHỐT THANH TOÁN · ${finalGrandTotal.toLocaleString('vi-VN')} đ`}
          </button>
        </div>
      </div>
    </div>
  );
}
