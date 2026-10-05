'use client';

import React from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { Check } from 'lucide-react';

interface Screen02CheckInProfileProps {
  booking: BookingItem;
  onBack: () => void;
  onCheckIn: () => void;
}

export function Screen02CheckInProfile({ booking, onBack, onCheckIn }: Screen02CheckInProfileProps) {
  const customerName = booking?.customerName || 'Khách Hàng';
  const customerPhone = booking?.customerPhone || '0901.xxx.xxx';
  const serviceName = booking?.serviceName || 'Dịch vụ';
  const servicePrice = booking?.servicePrice ? `${booking.servicePrice.toLocaleString('vi-VN')} đ` : '550.000 đ';
  const bookingTime = booking?.time12h || booking?.timeSlot || '09:00 am';
  const assignedStaff = booking?.assignedStaffName || 'Chưa phân công';
  const bookerName = booking?.bookerName || 'Hệ thống';
  const visits = booking?.customerVisits || 1;
  const customerNote = booking?.customerNote || 'Không có ghi chú đặc biệt';

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Check In"
        onBack={onBack}
        backTitle="Booking"
        rightAction={
          <button onClick={onCheckIn} className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60">
            Done
          </button>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
        {/* Card 1: Customer Profile Header */}
        <div className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border border-neutral-100">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#34C759] p-0.5 flex items-center justify-center bg-neutral-100 shrink-0 shadow-sm">
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
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-bold tracking-tight">
                {visits >= 5 ? 'GOLD VIP' : visits > 1 ? 'REGULAR' : 'NEW'}
              </span>
            </div>
            <div className="text-[13px] text-gray-500 font-normal mt-0.5">{customerPhone}</div>
            <div className="text-[13px] text-gray-800 font-medium mt-0.5">
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

        {/* Section 2: Technical Notes Banner */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            DẶN DÒ & LƯU Ý KỸ THUẬT
          </div>
          <div className="bg-[#FFF5F5] border border-red-200 rounded-2xl p-3.5 shadow-sm">
            <p className="text-[13px] text-red-500 font-medium leading-relaxed whitespace-pre-line">
              ⚠️ {customerNote}
            </p>
          </div>
        </div>

        {/* Section 3: Booked Service Info */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            DỊCH VỤ ĐẶT HẸN HÔM NAY
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            <div className="p-3.5 flex items-center justify-between text-[14px]">
              <span className="text-black font-medium">Dịch vụ</span>
              <span className="text-[#FF9500] font-bold">{serviceName}</span>
            </div>
            <div className="p-3.5 flex items-center justify-between text-[14px]">
              <span className="text-black font-medium">Giá niêm yết</span>
              <span className="text-gray-500 font-medium">{servicePrice}</span>
            </div>
            <div className="p-3.5 flex items-center justify-between text-[14px]">
              <span className="text-black font-medium">Giờ hẹn</span>
              <span className="text-gray-500 font-medium">{bookingTime} (Hôm nay)</span>
            </div>
            <div className="p-3.5 flex items-center justify-between text-[14px]">
              <span className="text-black font-medium">Chuyên viên phụ trách</span>
              <span className="text-[#FF9500] font-semibold">{assignedStaff}</span>
            </div>
          </div>
        </div>

        {/* Section 4: History list */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            LỊCH SỬ LÀM MI GẦN NHẤT
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-black">19/01/2026 · New Flawless</div>
                <div className="text-[12px] text-gray-400 mt-0.5">CV {assignedStaff} · Đánh giá: 5.0 ★</div>
              </div>
              <span className="text-[#007AFF] text-[13px] font-medium">Chi tiết &gt;</span>
            </div>
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-black">05/01/2026 · Dặm New Flawless</div>
                <div className="text-[12px] text-gray-400 mt-0.5">CV {assignedStaff} · Đánh giá: 5.0 ★</div>
              </div>
              <span className="text-[#007AFF] text-[13px] font-medium">Chi tiết &gt;</span>
            </div>
          </div>
        </div>

        {/* Big Action Button */}
        <div className="pt-2">
          <button
            onClick={onCheckIn}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>TIẾP NHẬN & CHECK IN KHÁCH</span>
          </button>
        </div>
      </div>
    </div>
  );
}
