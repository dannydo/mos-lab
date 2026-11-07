'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';

interface Screen14ThermalReceiptDoneProps {
  booking: BookingItem;
  actor?: ActiveActorProfile;
  onFinishOrder: () => void;
  onBack?: () => void;
}

export function Screen14ThermalReceiptDone({ booking, actor, onFinishOrder, onBack }: Screen14ThermalReceiptDoneProps) {
  const customerName = booking?.customerName || 'Chị Trúc';
  const customerPhone = booking?.customerPhone || '0933.779.207';
  const assignedStaff = booking?.assignedStaffName || 'Thảo Ly';
  const checkInStaff = booking?.checkInStaffName || assignedStaff;
  const checkOutStaff = booking?.checkOutStaffName || assignedStaff;
  const serviceName = resolveDisplayServiceName(booking);
  const servicePrice = booking?.servicePrice || 770000;
  const selectedCombo = booking?.selectedCombo || null;
  const comboRedemption = booking?.comboRedemption || null;
  const cartProducts = booking?.cartProducts || [];
  const tipAmount = booking?.billing?.tipAmount ?? 50000;
  const diamondUsed = booking?.billing?.diamondUsed || 0;
  const diamondDiscountAmount = booking?.billing?.diamondDiscountAmount || diamondUsed * 1000;
  const effectiveServiceCharge = selectedCombo
    ? 0
    : comboRedemption
      ? comboRedemption.totalCustomerPayToday
      : servicePrice;
  const grandTotal =
    booking?.billing?.grandTotal !== undefined
      ? booking.billing.grandTotal
      : Math.max(
          0,
          effectiveServiceCharge +
            (selectedCombo ? selectedCombo.price : 0) +
            cartProducts.reduce((s, p) => s + p.price * p.quantity, 0) +
            tipAmount -
            diamondDiscountAmount
        );

  const comboBonus = selectedCombo?.bonus || 0;
  const serumBonus = cartProducts.reduce((s, p) => s + (p.cvBonus || 100000) * p.quantity, 0);
  const isCheckoutStaffCc = actor?.tier === 'CC' || booking?.checkOutStaffTier === 'CC';
  const tipEarned = isCheckoutStaffCc ? Math.round(tipAmount * 0.2) : Math.round(tipAmount * 0.9);

  const branchCode = booking?.branchCode || 'DT';
  const branchInfo =
    branchCode === 'EP'
      ? { name: 'CN ESTELLA PLACE', address: 'Tầng 5, L5-08-09 Estella Place, 88 Song Hành, TP. Thủ Đức' }
      : { name: 'CN ĐỀ THÁM', address: '159 - 159A Đề Thám, P. Cô Giang, Q.1, TP.HCM' };

  return (
    <div className="flex-1 flex flex-col justify-between bg-black select-none px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)] overflow-y-auto">
      {/* Top Header */}
      <div className="relative flex items-center justify-center pb-2">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute left-0 p-1.5 -ml-1 rounded-full bg-[#1C1C1E] border border-neutral-800 text-neutral-300 hover:text-white active:scale-95 transition-all flex items-center gap-1 text-[11.5px] font-bold cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Quay lại</span>
          </button>
        )}
        <h1 className="text-[#FFB400] font-bold text-[16px] tracking-tight">
          {booking?.status === 'DONE'
            ? 'Chi Tiết Hóa Đơn & Ghi Nhận Thưởng'
            : `Hoàn Tất Ca Làm & Ghi Nhận Thưởng ${isCheckoutStaffCc ? 'CC' : 'CV🪶'}`}
        </h1>
      </div>

      {/* White Thermal Receipt */}
      <div className="bg-white rounded-2xl p-4 text-black space-y-2.5 shadow-2xl my-auto">
        <div className="text-center space-y-0.5">
          <img
            src="/images/combo-cards/wings-logo-gold.png"
            alt="Wings Lashes"
            className="h-6 w-auto mx-auto object-contain"
          />
          <div className="text-[16px] font-black tracking-wider text-black">WINGS LASHES</div>
          <div className="text-[10.5px] text-gray-600 font-medium">
            {branchInfo.name} · {branchInfo.address}
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        <div className="text-center">
          <div className="text-[13px] font-black uppercase tracking-wider text-black">
            PHIẾU THANH TOÁN & GHI NHẬN CA
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
            HĐ: #{booking?.orderNumber || 'BK-336925'} · Hoàn tất
          </div>
        </div>

        <div className="text-[11px] space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <span>Khách hàng:</span>
            <strong className="font-bold text-black">
              {customerName} ({customerPhone})
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Chuyên Viên làm mi:</span>
            <strong className="font-bold text-black">{assignedStaff} (CV🪶)</strong>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-1 text-[10.5px]">
            <span>
              Check-in: <strong className="text-emerald-700">{checkInStaff}</strong>
            </span>
            <span>
              Check-out: <strong className="text-emerald-700">{checkOutStaff}</strong>
            </span>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        {/* Items Table */}
        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between font-black text-black uppercase text-[11px] tracking-wide">
            <span>TÊN MẶT HÀNG</span>
            <span>THÀNH TIỀN</span>
          </div>

          {/* Item 1: Dịch vụ làm mi */}
          <div className="flex justify-between items-start text-gray-800">
            <div className="space-y-0.5">
              <span className="font-bold text-black">1. {serviceName}</span>
              {selectedCombo ? (
                selectedCombo.todaySingleServiceWaived ? (
                  <div className="text-[10.5px] text-emerald-700 font-bold">
                    ✓ Trừ vào Buổi 1 gói mới mua (Miễn thu lẻ ca này)
                  </div>
                ) : (
                  <div className="text-[10.5px] text-indigo-700 font-bold">
                    ✓ Khách trả lẻ ca này · Giữ trọn số buổi gói mới mua
                  </div>
                )
              ) : comboRedemption ? (
                <div className="text-[10.5px] text-sky-700 font-bold">
                  ✓ Trừ 1 lượt gói · Ví còn{' '}
                  <span className="tabular-nums font-black text-sky-900">
                    ✦ {comboRedemption.paidRemaining ?? 0} · ↻ {comboRedemption.bonusRemaining ?? 0}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="text-right shrink-0">
              <span className="tabular-nums font-bold text-black">
                {effectiveServiceCharge.toLocaleString('vi-VN')} đ
              </span>
              {selectedCombo && selectedCombo.todaySingleServiceWaived && (
                <span className="text-[10px] text-gray-400 line-through block tabular-nums">
                  {servicePrice.toLocaleString('vi-VN')} đ
                </span>
              )}
            </div>
          </div>

          {/* Item 2: Gói Combo mua mới nếu có */}
          {selectedCombo && (
            <div className="space-y-1">
              <div className="flex justify-between items-baseline gap-2 text-black">
                <span className="font-bold text-[12.5px] flex-1 min-w-0">
                  {comboRedemption ? '2. Mua thêm: ' : '2. '}
                  {selectedCombo.name}
                </span>
                <span className="tabular-nums text-black font-extrabold whitespace-nowrap shrink-0 text-[12.5px]">
                  {selectedCombo.price.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {selectedCombo.remainingAfterToday && (
                <div className="text-[10px] text-indigo-900 bg-indigo-50/80 px-2 py-1 rounded-md border border-indigo-200 tabular-nums">
                  ✨ Ví gói mới: ✦{' '}
                  <strong>
                    {selectedCombo.remainingAfterToday.paidNew + selectedCombo.remainingAfterToday.bonusNew}
                  </strong>{' '}
                  · ↻{' '}
                  <strong>
                    {selectedCombo.remainingAfterToday.paidRefill + selectedCombo.remainingAfterToday.bonusRefill}
                  </strong>{' '}
                  (Đủ {selectedCombo.remainingAfterToday.totalRemaining} buổi)
                </div>
              )}
            </div>
          )}

          {/* Item nếu trừ gói cũ */}
          {comboRedemption && (
            <div className="text-[10.5px] text-sky-900 bg-sky-50 p-2 rounded-lg border border-sky-200 tabular-nums">
              • {comboRedemption.explanation} · Ví cũ sau ca còn ✦ <strong>{comboRedemption.paidRemaining ?? 0}</strong>{' '}
              · ↻ <strong>{comboRedemption.bonusRemaining ?? 0}</strong>
            </div>
          )}

          {/* Item 3+: Sản phẩm dưỡng mi Yeppeum bán kèm */}
          {cartProducts.map((p, idx) => (
            <div key={idx} className="flex justify-between items-center text-gray-800">
              <span>
                {selectedCombo ? idx + 3 : idx + 2}. {p.productName} (x{p.quantity})
              </span>
              <span className="tabular-nums font-bold text-black">
                {(p.price * p.quantity).toLocaleString('vi-VN')} đ
              </span>
            </div>
          ))}

          {/* Tiền Tip */}
          {tipAmount > 0 && (
            <div className="flex justify-between items-center text-emerald-800 font-semibold bg-emerald-50/60 px-2 py-1 rounded-lg border border-emerald-200">
              <span>💖 Tiền Tip khách thưởng</span>
              <span className="tabular-nums font-bold">+{tipAmount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          {/* Cấn trừ Kim Cương */}
          {diamondUsed > 0 && (
            <div className="flex justify-between items-center text-cyan-900 font-bold bg-cyan-50 px-2 py-1 rounded-lg border border-cyan-200">
              <span>💎 Cấn trừ Ví Kim Cương ({diamondUsed} 💎)</span>
              <span className="tabular-nums font-black text-cyan-800">
                -{diamondDiscountAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}
        </div>

        <div className="border-b border-dashed border-gray-400" />

        {/* Total & Payment Method */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[15px] font-black text-black">
            <span>TỔNG THANH TOÁN:</span>
            <span className="tabular-nums text-[18px] text-[#FF9500]">{grandTotal.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-600 font-medium">
            <span>Hình thức thanh toán:</span>
            <span className="font-bold text-black bg-gray-100 px-2 py-0.5 rounded">
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
            <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[11px] font-bold text-sky-950 flex items-center gap-1.5">
                  <span className="text-base leading-none">📸</span>
                  <span>Ảnh bill chuyển khoản đối soát (VCB):</span>
                </div>
                <div className="text-[10px] text-sky-800 font-medium truncate">
                  Mã GD: {branchCode} {booking?.orderNumber?.replace(/\D/g, '') || booking?.id} DV TIP...
                </div>
              </div>
              <img
                src={booking.billing.transferProofPhoto}
                alt="Bill đối soát"
                className="w-12 h-12 object-cover rounded-lg border border-sky-300 shadow-2xs shrink-0 cursor-pointer"
              />
            </div>
          )}

          {/* Trạng thái gửi hóa đơn & bảo hành qua Zalo */}
          {booking?.billing?.zaloConsent?.agreed ? (
            <div className="bg-[#EBF5FF] border border-[#B9E6FE] rounded-xl p-2.5 space-y-1 text-[#004EEB]">
              <div className="flex items-center justify-between font-bold text-[11.5px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none">💬</span>
                  <span className="text-[#026AA2] font-black shrink-0">Đã gửi qua Zalo:</span>
                  <span className="font-extrabold text-[#004EEB] tabular-nums truncate">
                    {booking.billing.zaloConsent.phone}
                  </span>
                </div>
                <span className="bg-[#D1E9FF] text-[#004EEB] px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                  {booking.billing.zaloConsent.sentAt ? `✓ ${booking.billing.zaloConsent.sentAt}` : '✓ Đã nhận'}
                </span>
              </div>
              <div className="text-[10px] text-[#026AA2] pl-5 flex items-center gap-1.5 flex-wrap">
                <span>✓ Hóa đơn điện tử</span>
                <span>•</span>
                <span>✓ Bảo hành 3 ngày</span>
                <span>•</span>
                <span>✓ Voucher 50K</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 flex items-center justify-between text-[10.5px] text-gray-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">💬</span>
                <span>Chưa gửi Zalo (Khách không dùng / Bỏ qua)</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">
                Chưa kết nối
              </span>
            </div>
          )}

          {/* Thông tin Ví Kim Cương minh bạch */}
          {diamondUsed > 0 ? (
            <div className="text-[10.5px] text-cyan-900 font-semibold bg-cyan-50 px-2.5 py-1.5 rounded-xl border border-cyan-200 flex items-center justify-between">
              <span>
                💎 Đã cấn trừ {diamondUsed} 💎 (-{diamondDiscountAmount.toLocaleString('vi-VN')}đ):
              </span>
              <span className="font-black text-cyan-950">
                Ví còn {booking?.diamondBalance !== undefined ? booking.diamondBalance : 0} 💎
              </span>
            </div>
          ) : (
            <div className="text-[10.5px] text-cyan-900 font-medium bg-cyan-50/60 px-2.5 py-1 rounded-xl border border-cyan-100 flex items-center justify-between">
              <span>💎 Số dư Ví Kim Cương:</span>
              <span className="font-bold text-cyan-950">
                {booking?.diamondBalance !== undefined ? booking.diamondBalance : 350} 💎 (còn nguyên)
              </span>
            </div>
          )}
        </div>

        {/* Reward Summary Box */}
        {(() => {
          const isCheckoutStaffCc = actor?.tier === 'CC' || booking?.checkOutStaffTier === 'CC';
          return (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between font-black text-emerald-950 text-[12px]">
                <span>{isCheckoutStaffCc ? 'Quyền Lợi CC khi checkout' : 'Quyền Lợi CV🪶'}</span>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#16A34A] text-white text-[11px] font-black shadow-xs"
                  title="Done!"
                >
                  ✓
                </span>
              </div>
              <div className="space-y-1 pt-0.5 text-emerald-900 font-medium">
                <div className="flex justify-between">
                  <span>• Tiền Tip phân bổ thực nhận:</span>
                  <span className="font-bold tabular-nums">+{tipEarned.toLocaleString('vi-VN')} đ</span>
                </div>
                {comboBonus > 0 && (
                  <div className="flex justify-between">
                    <span>• Thưởng chốt Gói Combo:</span>
                    <span className="font-bold tabular-nums">+{Math.round(comboBonus / 1000)}🪶</span>
                  </div>
                )}
                {serumBonus > 0 && (
                  <div className="flex justify-between">
                    <span>• Thưởng bán Dưỡng mi Yeppeum:</span>
                    <span className="font-bold tabular-nums">+{Math.round(serumBonus / 1000)}🪶</span>
                  </div>
                )}
              </div>
              <div className="pt-1.5 border-t border-emerald-300/80 flex justify-between items-center font-black text-emerald-950 text-[12px]">
                <span>TỔNG THƯỞNG:</span>
                <span className="tabular-nums text-[13px] text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                  {comboBonus + serumBonus > 0 ? `+${Math.round((comboBonus + serumBonus) / 1000)}🪶` : '0🪶'}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Bottom Action Area */}
      <div className="pt-3 space-y-2">
        <div className="text-center text-[12px] font-bold text-[#22C55E]">
          ✓ Đã ghi nhận check_in_staff_id & check_out_staff_id = {checkOutStaff} ({isCheckoutStaffCc ? 'CC' : 'CV🪶'})
        </div>
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
