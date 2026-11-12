'use client';

import React from 'react';
import { Check, Edit3, Eye, Zap, Lock, Sliders } from 'lucide-react';
import { BookingItem } from '../../../state/mockData';

export interface CheckInBottomActionBarProps {
  booking?: BookingItem;
  isCheckInLocked: boolean;
  activeServicingCustomerName?: string;
  onResumeServicing?: () => void;
  isComboLive: boolean;
  hasQuickCheckIn: boolean;
  requiresNaturalLashCheck: boolean;
  onExecuteQuickCheckIn: () => void;
  onCheckIn: (bookingId?: number) => void;
}

export function CheckInBottomActionBar({
  booking,
  isCheckInLocked,
  activeServicingCustomerName,
  onResumeServicing,
  isComboLive,
  hasQuickCheckIn,
  requiresNaturalLashCheck,
  onExecuteQuickCheckIn,
  onCheckIn,
}: CheckInBottomActionBarProps) {
  return (
    <div className="bg-black/95 backdrop-blur-xl border-t border-neutral-800 px-3.5 py-2.5 flex flex-col gap-2 z-30 shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
      {isCheckInLocked ? (
        <div className="w-full space-y-2">
          <div className="bg-amber-500/15 border border-amber-400/40 rounded-xl px-3 py-2 text-center text-[11.5px] text-amber-300 font-medium flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
            <span>
              Đang phục vụ <strong>{activeServicingCustomerName || 'khách khác'}</strong>. Vui lòng hoàn thành checkout
              trước khi check-in khách này.
            </span>
          </div>
          {onResumeServicing ? (
            <button
              type="button"
              onClick={onResumeServicing}
              className="w-full py-3 px-4 rounded-2xl bg-[#FFB400] hover:bg-amber-400 text-black font-black text-[13px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform cursor-pointer"
            >
              <span>Quay lại ca làm {activeServicingCustomerName} →</span>
            </button>
          ) : (
            <button
              disabled
              className="w-full py-3.5 px-4 rounded-2xl bg-neutral-800 text-neutral-500 font-bold text-[13px] flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>Chưa thể check-in khách này</span>
            </button>
          )}
        </div>
      ) : isComboLive && hasQuickCheckIn && !requiresNaturalLashCheck ? (
        <div className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={onExecuteQuickCheckIn}
            className="flex-1 py-3 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[13px] flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-transform cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Nhận ca & Giữ form cũ</span>
          </button>
          <button
            type="button"
            onClick={() => onCheckIn(booking?.id)}
            className="py-3 px-3.5 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-amber-400 border border-amber-500/40 font-bold text-[12.5px] flex items-center justify-center gap-1.5 shrink-0 active:scale-98 transition-transform cursor-pointer"
            title="Đổi dáng / Độ cong / Tư vấn lại"
          >
            <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tư vấn lại</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onCheckIn(booking?.id)}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] hover:bg-amber-400 text-black font-black text-[14px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform cursor-pointer tracking-tight"
        >
          {requiresNaturalLashCheck ? (
            <>
              <Eye className="w-4.5 h-4.5 stroke-[2.5]" />
              <span>Check-in & Kiểm Tra Mi Thật Trước →</span>
            </>
          ) : booking?.status === 'CHECKED_IN' || booking?.status === 'SERVICING' ? (
            <>
              <Edit3 className="w-4 h-4 stroke-[2.5]" />
              <span>Sửa Tư Vấn & Đổi Dịch Vụ</span>
            </>
          ) : (
            <>
              <Check className="w-4.5 h-4.5 stroke-[3]" />
              <span>Check-in & Bắt Đầu Tư Vấn</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
