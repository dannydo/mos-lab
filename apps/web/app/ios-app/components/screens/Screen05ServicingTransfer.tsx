'use client';

import React, { useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { Calendar, Phone, ShoppingCart, ArrowRight, ChevronLeft } from 'lucide-react';
import { BookingItem } from '../../state/mockData';
import { IosBranchConfig } from '../../state/useIosAppState';

interface Screen05ServicingTransferProps {
  booking: BookingItem;
  servicingBookings?: BookingItem[];
  currentBranch?: IosBranchConfig;
  onBack?: () => void;
  onTransferToCv: () => void;
}

export function Screen05ServicingTransfer({
  booking,
  servicingBookings = [],
  currentBranch,
  onBack,
  onTransferToCv,
}: Screen05ServicingTransferProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const assignedStaff = booking?.assignedStaffName || 'Chuyên Viên';
  const assignedBed = booking?.assignedBed || 'Giường 01';
  const checkInStaff = booking?.checkInStaffName || 'Tư Vấn Viên';
  const serviceName = booking?.serviceName || 'Dịch vụ nối mi thiết kế';
  const branchHeader = booking?.branchName || currentBranch?.shortName || 'Salon Đề Thám';

  const activeRows = useMemo(() => {
    const others = servicingBookings.filter((b) => Number(b.id) !== Number(booking?.id));
    return booking ? [booking, ...others].slice(0, 5) : others.slice(0, 5);
  }, [booking, servicingBookings]);

  return (
    <div
      className={`flex-1 flex flex-col ${
        isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-[#1C1C1E]'
      } overflow-y-auto select-none`}
    >
      {/* Top Navigation Bar on Black */}
      <header className="w-full pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2.5 px-4 flex items-center justify-between bg-black border-b border-neutral-900 select-none z-40 relative min-h-[50px] shrink-0">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-0.5 text-[#FFB400] text-sm font-semibold active:opacity-60 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Quay lại</span>
            </button>
          ) : (
            <Calendar className="w-5 h-5 text-[#FFB400]" />
          )}
        </div>
        <div className="text-[#FFB400] font-bold text-[17px] tracking-tight">{branchHeader}</div>
        <div className="flex items-center gap-3.5">
          <Phone className="w-5 h-5 text-[#FFB400]" />
          <ShoppingCart className="w-5 h-5 text-[#FFB400]" />
        </div>
      </header>

      {/* Sub-navbar Category Tabs on Black */}
      <div className="bg-black px-4 pt-1 pb-2 flex items-center justify-between border-b border-neutral-900 shrink-0 text-[12px] font-bold">
        <div className="pb-1 relative">
          <span className="text-[#FFB400] tracking-tight">LASHES</span>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FFB400]" />
        </div>
        <div className="pb-1 text-neutral-400">LASH LIFT</div>
        <div className="pb-1 text-neutral-400">NAILS</div>
        <div className="pb-1 text-neutral-400">ALL</div>
      </div>

      {/* Segmented Control on Black */}
      <div className="bg-black px-3 py-2 flex items-center gap-1 shrink-0 border-b border-neutral-900">
        <div className="flex-1 py-1.5 text-center text-[12px] font-medium text-neutral-400 rounded-md">INCOMING</div>
        <div className="flex-[1.4] py-1.5 text-center text-[12px] font-extrabold bg-[#FFB400] text-black rounded-md shadow-xs">
          SERVICING (ĐANG LÀM)
        </div>
        <div className="flex-1 py-1.5 text-center text-[12px] font-medium text-neutral-400 rounded-md">DONE</div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto">
        {/* Booking Items */}
        <div
          className={`${
            isDark ? 'bg-[#1C1C1E] divide-neutral-800 border-neutral-800' : 'bg-white divide-gray-100 border-gray-200'
          } divide-y border-b`}
        >
          {activeRows.map((row, idx) => {
            const isPrimary = Number(row.id) === Number(booking?.id);
            const rowName = row.customerName || 'Khách hàng';
            const rowPhone = (row.customerPhone || '').replace(/\*+\s*/g, '').trim();
            const rowTime = row.time12h || row.timeSlot?.split('-')[0]?.trim() || '--:--';
            const rowBed = row.assignedBed || (isPrimary ? assignedBed : `Giường 0${idx + 1}`);
            const rowStaff = row.assignedStaffName || assignedStaff;

            return (
              <div
                key={row.id}
                onClick={isPrimary ? onTransferToCv : undefined}
                className={`p-3.5 flex items-center gap-3 transition-colors ${
                  isPrimary
                    ? isDark
                      ? 'cursor-pointer active:bg-neutral-800/70'
                      : 'cursor-pointer active:bg-amber-50/50'
                    : 'opacity-80'
                }`}
              >
                <span
                  className={`${isDark ? 'text-neutral-500' : 'text-gray-400'} font-bold text-sm w-4 text-center tabular-nums`}
                >
                  {idx + 1}
                </span>
                <div
                  className={`w-12 h-12 rounded-full border-2 border-[#34C759] p-0.5 flex items-center justify-center font-extrabold text-base shrink-0 shadow-xs ${
                    isPrimary
                      ? 'bg-[#FFB400] text-black'
                      : isDark
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {rowName.charAt(0) || 'K'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[15px] font-bold ${isDark ? 'text-white' : 'text-black'} truncate`}>
                      {rowName}
                    </span>
                    <span className="text-[13px] font-bold text-[#FF3B30] tabular-nums">{rowTime}</span>
                  </div>
                  {rowPhone && (
                    <div
                      className={`text-[12px] ${isDark ? 'text-neutral-400' : 'text-gray-500'} font-normal tabular-nums`}
                    >
                      {rowPhone}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="bg-[#22C55E] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
                      {rowBed}
                    </span>
                    <span className="text-[12px] text-[#FF9500] font-semibold">CV: {rowStaff}</span>
                  </div>
                  <div
                    className={`text-[12px] ${isDark ? 'text-neutral-300' : 'text-gray-700'} font-medium mt-0.5 truncate`}
                  >
                    {row.serviceName || serviceName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Green Notification Card & Handover button */}
        <div className="p-4 space-y-3">
          <div
            className={`${
              isDark ? 'bg-emerald-950/30 border-emerald-700/60' : 'bg-[#F0FDF4] border-[#86EFAC]'
            } border rounded-2xl p-4 shadow-xs`}
          >
            <p className={`text-[13px] ${isDark ? 'text-emerald-300' : 'text-[#15803D]'} font-medium leading-relaxed`}>
              ✓ {checkInStaff} đã dẫn khách {booking?.customerName || ''} vào {assignedBed} và bàn giao thông số nối mi{' '}
              {serviceName} cho CV {assignedStaff}.
            </p>
          </div>

          <button
            onClick={onTransferToCv}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[14px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform cursor-pointer uppercase"
          >
            <span>CHUYỂN SANG MÀN HÌNH CHUYÊN VIÊN (CV {assignedStaff})</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
