'use client';

import React from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { Check, Sparkles, ShieldCheck, Eye, AlertCircle, RotateCw, Award, ArrowUpRight } from 'lucide-react';
import { calculateLashPricingAndCvPoints } from './LashMaterialConstraintMatrix';

interface Screen02CheckInProfileProps {
  booking: BookingItem;
  actor?: ActiveActorProfile;
  onBack: () => void;
  onCheckIn: () => void;
}

export function Screen02CheckInProfile({ booking, actor, onBack, onCheckIn }: Screen02CheckInProfileProps) {
  const customerName = booking?.customerName || 'Khách Hàng';
  const customerPhone = booking?.customerPhone || '0901.xxx.xxx';
  const serviceName = booking?.serviceName || 'Dịch vụ';
  const servicePrice = booking?.servicePrice ? `${booking.servicePrice.toLocaleString('vi-VN')} đ` : '550.000 đ';
  const bookingTime = booking?.time12h || booking?.timeSlot || '09:00 am';
  const assignedStaff = booking?.assignedStaffName || 'Thảo Ly';
  const bookerName = booking?.bookerName || 'Hệ thống';
  const visits = booking?.customerVisits || 1;
  const customerNote = booking?.customerNote || 'Không có ghi chú đặc biệt';
  const isComboLive = Boolean(booking?.comboLiveStatus?.isComboLive);
  const remainingSessions = booking?.comboLiveStatus?.remainingSessions ?? 0;
  const actorName = actor?.name || 'Thảo Ly';
  const actorTierLabel = actor?.tier === 'CVLL' ? '🪶CV🪶' : actor?.tier === 'CVL' ? 'CV🪶' : 'CC';

  // Quy tắc màu viền avatar (Avatar Ring Color Invariant theo chỉ đạo Danny):
  // -> vòng xanh quanh ngoài avatar -> not combo live
  // -> vòng xám -> combo live
  // -> còn 1-2 lần -> vòng vàng
  let avatarRingClass = 'border-[2.5px] border-[#34C759]'; // Vòng xanh (Not combo live)
  if (isComboLive && remainingSessions > 0) {
    if (remainingSessions <= 2) {
      avatarRingClass = 'border-[2.5px] border-[#FF9500] ring-1 ring-[#FF9500]/40'; // Vòng vàng (Còn 1-2 lần)
    } else {
      avatarRingClass = 'border-[2.5px] border-[#8E8E93]'; // Vòng xám (Combo live)
    }
  }

  // Thông số Vòng Xoay CV ban đầu khi Check-in:
  const isNewCust = visits <= 1;
  const initialServiceType =
    booking?.serviceType || (booking?.serviceName?.toLowerCase().includes('dặm') ? 'Retain' : 'Normal');
  const isBookedDirectly = Boolean(booking?.assignedStaffName);

  const initialPointsBreakdown = calculateLashPricingAndCvPoints({
    materialId: booking?.attributes?.material || 'New Classic',
    countStr: booking?.attributes?.count || '90 - 110 sợi/mắt (Chuẩn)',
    volumeStr: booking?.attributes?.volume || '1D (Classic)',
    designId: booking?.attributes?.style || 'Natural',
    originalBookedPrice: booking?.servicePrice || 550000,
    serviceType: initialServiceType,
  });

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Hồ Sơ Khách & Check In"
        onBack={onBack}
        backTitle="Khách Hàng"
        rightAction={
          <button onClick={onCheckIn} className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60">
            Check In
          </button>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* Card 1: Customer Profile Header */}
        <div className="bg-white rounded-2xl p-3.5 flex items-center gap-3.5 shadow-sm border border-neutral-100">
          <div
            className={`w-14 h-14 rounded-full overflow-hidden ${avatarRingClass} p-0.5 flex items-center justify-center bg-neutral-100 shrink-0 shadow-sm`}
          >
            {booking?.customerAvatar ? (
              <img
                src={booking.customerAvatar}
                alt={customerName}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <img src="/ios-assets/no-image.png" alt="No Image" className="w-full h-full object-cover rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold text-black tracking-tight truncate">{customerName}</h2>
              {visits >= 5 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-bold tracking-tight">
                  GOLD VIP
                </span>
              )}
            </div>
            <div className="text-[13px] text-gray-500 font-normal mt-0.5 tabular-nums">{customerPhone}</div>
            <div className="text-[12px] text-gray-800 font-medium mt-0.5">
              <span>
                Lần ghé: <strong className="font-bold">{visits}</strong>
              </span>
              <span className="mx-2 text-gray-300">·</span>
              <span>
                Booker: <strong className="font-bold text-[#FFA000]">{bookerName}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Trạng Thái Gói Combo Live / Not Combo Live (Quan trọng cho CV🪶 Tư vấn) */}
        <div
          className={`rounded-2xl p-3.5 shadow-sm border ${
            isComboLive
              ? 'bg-blue-50/90 border-blue-200'
              : 'bg-gradient-to-r from-amber-50 to-orange-50 border-[#FFB400]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FF9500]" />
              {isComboLive ? 'GÓI COMBO LIVE HIỆN TẠI' : 'CHƯA CÓ GÓI COMBO (CƠ HỘI TƯ VẤN)'}
            </span>
            <span className="bg-[#FFB400] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
              {isComboLive ? `Còn ${booking?.comboLiveStatus?.remainingSessions} lượt` : 'Mục tiêu ≥ 21%'}
            </span>
          </div>
          <div className="text-[12px] text-gray-800 font-semibold mt-1 leading-snug">
            {isComboLive
              ? `Gói hiện tại: ${booking?.comboLiveStatus?.comboName}. Có thể trừ lượt hoặc tư vấn gia hạn thêm gói Combo mới.`
              : 'Khách chưa có gói Combo Live! Khi tự tư vấn & chốt gói Combo 4.5M ở bước tiếp theo, bạn nhận ngay +200.000đ tiền tươi.'}
          </div>
        </div>

        {/* Card 3: Quy tắc Ghi nhận Check-in / Check-out 50/50 */}
        <div className="bg-[#1C1C1E] text-white rounded-2xl p-3.5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#FFB400] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Ghi nhận Nhân sự & Chia Tip 50/50
            </span>
            <span className="text-[10px] font-bold text-emerald-400">Chuẩn Điều Răn CV-002</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] pt-0.5">
            <div className="bg-[#2C2C2E] rounded-xl p-2">
              <div className="text-neutral-400 text-[10px]">Chuyên Viên làm mi</div>
              <div className="font-bold text-white truncate mt-0.5">{assignedStaff}</div>
            </div>
            <div className="bg-[#2C2C2E] rounded-xl p-2 border border-amber-500/40">
              <div className="text-amber-300 text-[10px]">Người Check-in</div>
              <div className="font-bold text-[#FFB400] truncate mt-0.5">
                {booking?.checkInStaffName || `${actorName} (${actorTierLabel})`}
              </div>
            </div>
            <div className="bg-[#2C2C2E] rounded-xl p-2">
              <div className="text-neutral-400 text-[10px]">Người Check-out</div>
              <div className="font-bold text-emerald-400 truncate mt-0.5">
                {booking?.checkOutStaffName || 'Chốt cuối ca'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3.5: Thông Số Vòng Xoay CV (CV Rotation Parameters Card) */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-blue-600" />
              THÔNG SỐ VÒNG XOAY CA LÀM (CV ROTATION)
            </span>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              Điều răn CV-001
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="bg-[#F8F9FA] rounded-xl p-2.5 border border-gray-100">
              <div className="text-gray-500 text-[10px] font-medium">1. Loại ca làm</div>
              <div className="font-bold text-gray-900 mt-0.5 flex items-center justify-between">
                <span className="truncate pr-1">{initialServiceType === 'Normal' ? 'Mi Mới' : 'Dặm'}</span>
                <span className="text-blue-600 font-extrabold">+{initialPointsBreakdown.typePts} pts</span>
              </div>
            </div>

            <div className="bg-[#F8F9FA] rounded-xl p-2.5 border border-gray-100">
              <div className="text-gray-500 text-[10px] font-medium">2. Chất liệu mi</div>
              <div className="font-bold text-gray-900 mt-0.5 flex items-center justify-between">
                <span className="truncate pr-1">{serviceName.split(' ')[0] || 'Classic'}</span>
                <span className="text-blue-600 font-extrabold">+{initialPointsBreakdown.lashPts} pts</span>
              </div>
            </div>

            <div className="bg-[#F8F9FA] rounded-xl p-2.5 border border-gray-100">
              <div className="text-gray-500 text-[10px] font-medium">3. Phân bổ tua</div>
              <div className="font-bold text-gray-900 mt-0.5 truncate">
                {isBookedDirectly ? 'Chỉ định KTV' : 'Xoay tua tiệm'}
              </div>
            </div>
          </div>

          {/* Dự kiến điểm ban đầu & gợi ý nâng cấp */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <div className="text-[12px] font-extrabold text-blue-950">
                  {initialPointsBreakdown.summaryLabel} (Dự kiến ban đầu)
                </div>
                <div className="text-[10px] text-blue-700">
                  CVL được phép đổi Chất liệu/Dáng ở Bước 3 để tăng điểm Vòng xoay & nâng cấp giá.
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
        </div>

        {/* Section 2: Technical Notes Banner */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">
            DẶN DÒ & LƯU Ý KỸ THUẬT
          </div>
          <div className="bg-[#FFF5F5] border border-red-200 rounded-2xl p-3 shadow-sm">
            <p className="text-[12px] text-red-600 font-medium leading-relaxed whitespace-pre-line">
              ⚠️ {customerNote}
            </p>
          </div>
        </div>

        {/* Section 2.5: Kiểm Tra & Đánh Giá Mi Thật (Natural Lash Assessment Card) */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1 flex items-center justify-between">
            <span>KIỂM TRA MI THẬT (NATURAL LASH)</span>
            <span className="text-[10px] font-bold text-amber-700">Tiêu chuẩn Khoa Học Wings</span>
          </div>
          {visits <= 1 ? (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-[#FFB400] rounded-2xl p-3.5 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF9500]" />
                  BẮT BUỘC KHÁM & ĐO ĐẠC MI THẬT
                </span>
                <span className="bg-[#FFB400] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                  Bước 0 Bắt Buộc
                </span>
              </div>
              <p className="text-[12px] text-gray-800 leading-snug font-medium">
                Đây là khách hàng mới lần đầu ghé salon Wings! Chuyên Viên cần soi kính lúp đo chính xác{' '}
                <strong>chiều dài (mm)</strong>, <strong>độ dày sợi</strong> và kiểm tra nang mi ở bước kế tiếp để chọn
                dòng mi an toàn, không lo rụng mi thật.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  HỒ SƠ MI THẬT ĐÃ LƯU
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Đã kiểm tra
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-[#F9F9FB] rounded-xl p-2">
                  <div className="text-gray-500 text-[10px]">Chiều dài mi thật</div>
                  <div className="font-bold text-black mt-0.5">
                    {booking?.attributes?.naturalLashLength || '8 mm (Chuẩn)'}
                  </div>
                </div>
                <div className="bg-[#F9F9FB] rounded-xl p-2">
                  <div className="text-gray-500 text-[10px]">Độ dày sợi mi</div>
                  <div className="font-bold text-black mt-0.5">
                    {booking?.attributes?.naturalLashThickness || '0.07 mm (Mảnh)'}
                  </div>
                </div>
                <div className="bg-[#F9F9FB] rounded-xl p-2">
                  <div className="text-gray-500 text-[10px]">Dáng mắt / Mí</div>
                  <div className="font-bold text-black mt-0.5">
                    {booking?.attributes?.eyeShape?.split(' ')[0] || 'Mí lót'}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 flex items-center gap-1 pt-0.5">
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Chuyên Viên kiểm tra lại độ hồi phục mi hôm nay để điều chỉnh thông số nối mi an toàn.</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Booked Service Info */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">
            DỊCH VỤ ĐẶT HẸN HÔM NAY
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            <div className="p-3 flex items-center justify-between text-[13px]">
              <span className="text-black font-medium">Dịch vụ</span>
              <span className="text-[#FF9500] font-bold">{serviceName}</span>
            </div>
            <div className="p-3 flex items-center justify-between text-[13px]">
              <span className="text-black font-medium">Giá niêm yết</span>
              <span className="text-gray-700 font-bold tabular-nums">{servicePrice}</span>
            </div>
            <div className="p-3 flex items-center justify-between text-[13px]">
              <span className="text-black font-medium">Giờ hẹn · Giường</span>
              <span className="text-gray-600 font-medium">
                {bookingTime} · {booking?.assignedBed || 'Giường 01'}
              </span>
            </div>
            <div className="p-3 flex items-center justify-between text-[13px]">
              <span className="text-black font-medium">Chuyên viên phụ trách</span>
              <span className="text-[#FF9500] font-bold">{assignedStaff}</span>
            </div>
          </div>
        </div>

        {/* Section 4: History list */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">
            LỊCH SỬ LÀM MI GẦN NHẤT
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            {(booking?.lashHistory && booking.lashHistory.length > 0
              ? booking.lashHistory
              : [
                  { date: '19/10/2026', serviceName: 'New Flawless Mink', staffName: assignedStaff },
                  { date: '05/10/2026', serviceName: 'Dặm New Flawless', staffName: assignedStaff },
                ]
            ).map((h, i) => (
              <div key={i} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-black">
                    {h.date} · {h.serviceName}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">Chuyên viên: {h.staffName} · Đánh giá: 5.0 ★</div>
                </div>
                <span className="text-[#007AFF] text-[12px] font-semibold">Đã lưu form</span>
              </div>
            ))}
          </div>
        </div>

        {/* Big Action Button */}
        <div className="pt-1">
          <button
            onClick={onCheckIn}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>
              {booking?.status === 'CHECKED_IN' || booking?.status === 'SERVICING'
                ? `✏️ SỬA TƯ VẤN & ĐỔI DỊCH VỤ MI (BƯỚC 3)`
                : visits <= 1
                  ? `CHECK-IN & BẮT ĐẦU KHÁM MI THẬT (${actorName.toUpperCase()})`
                  : `CHECK-IN (${actorName.toUpperCase()}) & BẮT ĐẦU TƯ VẤN`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
