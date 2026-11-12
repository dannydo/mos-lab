'use client';

import React from 'react';
import { BookingItem, LashHistoryItem } from '../../../state/mockData';
import { CvFeather1Badge } from '../../ui-kit/CvFeatherLabels';
import { calculateLashPricingAndCvPoints, resolveQuickCheckInComboPreset } from '../LashMaterialConstraintMatrix';
import { resolveNaturalLashCountLabel } from '../NaturalLashAssessmentData';
import { getFallbackLashHistory, getStaffInitials } from './checkinHelpers';
import {
  Check,
  Sparkles,
  Eye,
  RotateCw,
  Award,
  ArrowUpRight,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type QuickCheckInPreset = ReturnType<typeof resolveQuickCheckInComboPreset>;
type PointsBreakdown = ReturnType<typeof calculateLashPricingAndCvPoints>;

interface CheckInStaffAndProfileCardsProps {
  booking: BookingItem;
  bookerName: string;
  checkInStaffName: string;
  checkInStaffAvatar?: string;
  assignedStaff: string;
  assignedStaffAvatar?: string;
  isCvlStaff: boolean;
  actorTierLabel: React.ReactNode;
  isRotationExpanded: boolean;
  setIsRotationExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRotationInfoOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activePointsBreakdown: PointsBreakdown;
  isComboLive: boolean;
  preset: QuickCheckInPreset;
  serviceName: string;
  quickServiceType: 'Normal' | 'Retain';
  quickUnderServiceType: 'Normal' | 'Retain';
  isBookedDirectly: boolean;
  customerNote: string;
  visits: number;
  isFirstTimeClient: boolean;
  onOpenLashHistory: (item: LashHistoryItem) => void;
}

export function CheckInStaffAndProfileCards({
  booking,
  bookerName,
  checkInStaffName,
  checkInStaffAvatar,
  assignedStaff,
  assignedStaffAvatar,
  isCvlStaff,
  actorTierLabel,
  isRotationExpanded,
  setIsRotationExpanded,
  setIsRotationInfoOpen,
  activePointsBreakdown,
  isComboLive,
  preset,
  serviceName,
  quickServiceType,
  quickUnderServiceType,
  isBookedDirectly,
  customerNote,
  visits,
  isFirstTimeClient,
  onOpenLashHistory,
}: CheckInStaffAndProfileCardsProps) {
  return (
    <>
      {/* Card 3: 4 Avatars (1. Booked by · 2. Checkin by · 3. Lashed by · 4. Checkout by) */}
      <div className="bg-[#1C1C1E] text-white rounded-2xl px-3 py-2.5 shadow-sm">
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {/* 1. Booked by */}
          <div className="flex flex-col items-center min-w-0">
            <span className="text-[9.5px] font-semibold text-neutral-400 tracking-tight truncate w-full">
              Booked by
            </span>
            <div className="relative mt-1.5">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-sky-400/90 bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white font-extrabold text-[12px] shadow-xs">
                {booking?.bookerAvatar ? (
                  <img
                    src={booking.bookerAvatar}
                    alt={bookerName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{getStaffInitials(bookerName)}</span>
                )}
              </div>
            </div>
            <span className="text-[11px] font-bold text-white truncate w-full mt-1">{bookerName}</span>
          </div>

          {/* 2. Checkin by */}
          <div className="flex flex-col items-center min-w-0">
            <span className="text-[9.5px] font-semibold text-amber-300 tracking-tight truncate w-full">Checkin by</span>
            <div className="relative mt-1.5">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#FFB400] bg-gradient-to-br from-[#FFB400] to-[#FF9500] flex items-center justify-center text-black font-extrabold text-[12px] shadow-xs">
                {checkInStaffAvatar ? (
                  <img
                    src={checkInStaffAvatar}
                    alt={checkInStaffName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{getStaffInitials(checkInStaffName)}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-[#2C2C2E] border border-[#FFB400] text-[#FFB400] text-[8px] font-black px-1 py-0.2 rounded-full leading-tight inline-flex items-center">
                {isCvlStaff ? <CvFeather1Badge featherClass="w-2 h-2 text-[#FFB400]" /> : actorTierLabel}
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#FFB400] truncate w-full mt-1">
              {checkInStaffName.replace(/\s*\(.*?\)/g, '')}
            </span>
          </div>

          {/* 3. Lashed by */}
          <div className="flex flex-col items-center min-w-0">
            <span className="text-[9.5px] font-semibold text-purple-300 tracking-tight truncate w-full">Lashed by</span>
            <div className="relative mt-1.5">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-400 bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center text-white font-extrabold text-[12px] shadow-xs">
                {assignedStaffAvatar ? (
                  <img
                    src={assignedStaffAvatar}
                    alt={assignedStaff}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{getStaffInitials(assignedStaff)}</span>
                )}
              </div>
            </div>
            <span className="text-[11px] font-bold text-white truncate w-full mt-1">{assignedStaff}</span>
          </div>

          {/* 4. Checkout by */}
          <div className="flex flex-col items-center min-w-0">
            <span className="text-[9.5px] font-semibold text-emerald-300 tracking-tight truncate w-full">
              Checkout by
            </span>
            <div className="relative mt-1.5">
              {booking?.checkOutStaffName ? (
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-400 bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-extrabold text-[12px] shadow-xs">
                  {booking?.checkOutStaffAvatar ? (
                    <img
                      src={booking.checkOutStaffAvatar}
                      alt={booking.checkOutStaffName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{getStaffInitials(booking.checkOutStaffName)}</span>
                  )}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-neutral-600 bg-[#2C2C2E] flex items-center justify-center text-neutral-500 font-bold text-[12px]">
                  —
                </div>
              )}
            </div>
            <span
              className={`text-[11px] font-bold truncate w-full mt-1 ${
                booking?.checkOutStaffName ? 'text-emerald-400' : 'text-neutral-500'
              }`}
            >
              {booking?.checkOutStaffName ? booking.checkOutStaffName.replace(/\s*\(.*?\)/g, '') : 'Chờ chốt'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3.5: Thông Số Vòng Xoay (Mặc định thu gọn chỉ hiện tóm tắt · Nhấn vào mở đầy đủ chi tiết) */}
      <div className="bg-[#1C1C1E] rounded-2xl p-3 shadow-sm border border-neutral-800 space-y-2.5 tabular-nums text-white">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsRotationExpanded((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsRotationExpanded((prev) => !prev);
            }
          }}
          className="w-full flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <RotateCw className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            VÒNG XOAY
          </span>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10.5px] font-extrabold truncate leading-none">
              <svg className="w-3.5 h-3.5 -rotate-90 shrink-0" viewBox="0 0 16 16" aria-hidden="true">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  className="opacity-20"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeDasharray={37.7}
                  strokeDashoffset={
                    37.7 * (1 - Math.min(100, Math.max(8, activePointsBreakdown.totalPoints % 100 || 100)) / 100)
                  }
                />
              </svg>
              <span>
                {activePointsBreakdown.serviceSetsCount === 2
                  ? `2 Bộ · +${activePointsBreakdown.totalPoints} pts`
                  : `+${activePointsBreakdown.totalPoints} pts`}
              </span>
            </span>
            <span className="w-5 h-5 rounded-full bg-[#2C2C2E] text-neutral-400 flex items-center justify-center shrink-0">
              {isRotationExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsRotationInfoOpen(true);
              }}
              aria-label="Xem cách tính điểm vòng xoay"
              title="Xem cách tính điểm vòng xoay (CV Xoay)"
              className="w-6 h-6 rounded-full bg-blue-900/50 text-blue-300 hover:bg-blue-800 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              <Info className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {isRotationExpanded && (
          <div className="space-y-2 pt-0.5 border-t border-neutral-800">
            {/* Bộ 1: Mi Trên */}
            <div className="bg-[#2C2C2E] rounded-xl p-2.5 border border-neutral-700/80 space-y-1 tabular-nums">
              <div className="flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9.5px] font-black shrink-0">
                    BỘ 1 · MI TRÊN
                  </span>
                  <span className="font-extrabold text-white truncate">
                    {isComboLive ? preset.materialShortLabel : serviceName.split(' ')[0] || 'Classic'} ·{' '}
                    {preset.isAlwaysFullSet
                      ? 'Mi Mới'
                      : (isComboLive ? quickServiceType : booking?.serviceType) === 'Retain'
                        ? 'Dặm'
                        : 'Mi Mới'}
                  </span>
                </div>
                <span className="text-blue-400 font-black text-[12px] shrink-0">
                  +{activePointsBreakdown.upperSetPoints} pts
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 font-semibold flex items-center justify-between">
                <span>{activePointsBreakdown.upperSetBreakdownLabel}</span>
                <span className="text-neutral-500">{isBookedDirectly ? 'Chỉ định KTV' : 'Xoay tua'}</span>
              </div>
            </div>

            {/* Bộ 2: Mi Dưới (Độc lập về vòng xoay khi khách nối cả Mi Trên và Mi Dưới) */}
            {activePointsBreakdown.serviceSetsCount === 2 && (
              <div className="bg-[#2C2C2E] rounded-xl p-2.5 border border-purple-500/30 space-y-1 tabular-nums">
                <div className="flex items-center justify-between text-[11.5px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9.5px] font-black shrink-0">
                      BỘ 2 · MI DƯỚI
                    </span>
                    <span className="font-extrabold text-white truncate">
                      Under Mink · {quickUnderServiceType === 'Retain' ? 'Dặm' : 'Mi Mới'}
                    </span>
                    {activePointsBreakdown.isUnderMinkComboDeducted && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-extrabold shrink-0">
                        Trừ gói (0đ)
                      </span>
                    )}
                  </div>
                  <span className="text-purple-400 font-black text-[12px] shrink-0">
                    +{activePointsBreakdown.underSetPoints} pts
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 font-semibold flex items-center justify-between whitespace-nowrap">
                  <span>{activePointsBreakdown.underSetBreakdownLabel}</span>
                  <span className="text-purple-400 font-bold">Độc lập</span>
                </div>
              </div>
            )}

            {/* Dự kiến điểm Vòng Xoay thực tế (Chạm để mở giải thích chi tiết) */}
            <button
              type="button"
              onClick={() => setIsRotationInfoOpen(true)}
              className="w-full text-left bg-[#2C2C2E] hover:bg-neutral-800 border border-neutral-700/80 rounded-xl p-2.5 flex items-center justify-between tabular-nums cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Award className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold text-blue-300 truncate">
                    {activePointsBreakdown.summaryLabel}
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate">
                    {activePointsBreakdown.serviceSetsCount === 2
                      ? `Nhận đủ 2 Bộ Mi độc lập vào CV Xoay (Bộ 1: +${activePointsBreakdown.upperSetPoints}p · Bộ 2: +${activePointsBreakdown.underSetPoints}p)`
                      : `${activePointsBreakdown.upperSetBreakdownLabel} · ${isBookedDirectly ? 'Chỉ định KTV' : 'Xoay tua tiệm'}`}
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-blue-400 shrink-0" />
            </button>
          </div>
        )}
      </div>

      {/* Section 2: Technical Notes Banner */}
      {customerNote && (
        <div>
          <div className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider px-1 mb-1">
            DẶN DÒ & LƯU Ý KỸ THUẬT
          </div>
          <div className="bg-[#2C1515] border border-red-500/40 rounded-2xl p-3 shadow-xs">
            <p className="text-[12px] text-red-300 font-medium leading-relaxed whitespace-pre-line flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>{customerNote}</span>
            </p>
          </div>
        </div>
      )}

      {/* Section 2.5: Hồ Sơ Mi Thật */}
      {visits <= 1 ? (
        <div className="bg-[#1C1C1E] border border-amber-500/40 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-2.5 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[11.5px] font-extrabold text-amber-300 uppercase tracking-tight">
                MI THẬT · KHÁCH MỚI
              </div>
              <div className="text-[11px] text-neutral-400 font-medium truncate">
                Đo độ dài, độ dày sợi & dáng mí ở bước tiếp theo
              </div>
            </div>
          </div>
          <span className="bg-[#FFB400] text-black text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 leading-none">
            Cần đo
          </span>
        </div>
      ) : (
        <div className="bg-[#1C1C1E] rounded-2xl p-3 shadow-sm border border-neutral-800 space-y-2 tabular-nums text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              HỒ SƠ MI THẬT
            </span>
            {booking?.attributes?.naturalLashLength &&
            booking?.attributes?.naturalLashThickness &&
            (booking?.attributes?.naturalLashCount || booking?.attributes?.naturalLashDensity) &&
            booking?.attributes?.eyeShape ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 leading-none">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                Đã lưu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 leading-none">
                Chưa đo
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <div className="bg-[#2C2C2E] border border-neutral-700/80 rounded-xl px-2 py-2 flex flex-col justify-between">
              <span className="text-neutral-400 text-[9.5px] font-semibold">Số sợi</span>
              <div className="font-extrabold text-[12px] text-[#FFB400] mt-0.5 truncate">
                {resolveNaturalLashCountLabel(
                  booking?.attributes?.naturalLashCount || booking?.attributes?.naturalLashDensity
                ) || '—'}
              </div>
            </div>
            <div className="bg-[#2C2C2E] border border-neutral-700/80 rounded-xl px-2 py-2 flex flex-col justify-between">
              <span className="text-neutral-400 text-[9.5px] font-semibold">Độ dài</span>
              <div className="font-extrabold text-[12px] text-white mt-0.5 truncate">
                {booking?.attributes?.naturalLashLength
                  ? booking.attributes.naturalLashLength.replace(/\s*mm/gi, '').split('(')[0].trim()
                  : '—'}
              </div>
            </div>
            <div className="bg-[#2C2C2E] border border-neutral-700/80 rounded-xl px-2 py-2 flex flex-col justify-between">
              <span className="text-neutral-400 text-[9.5px] font-semibold">Độ dày</span>
              <div className="font-extrabold text-[11px] text-white mt-0.5 truncate">
                {booking?.attributes?.naturalLashThickness
                  ? booking.attributes.naturalLashThickness.replace(/\s*mm/gi, '').split('(')[0].trim()
                  : '—'}
              </div>
            </div>
            <div className="bg-[#2C2C2E] border border-neutral-700/80 rounded-xl px-2 py-2 flex flex-col justify-between">
              <span className="text-neutral-400 text-[9.5px] font-semibold">Dáng mắt</span>
              <div className="font-extrabold text-[11px] text-white mt-0.5 truncate">
                {booking?.attributes?.eyeShape ? booking.attributes.eyeShape.split('(')[0].trim() : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: History list */}
      <div>
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            LỊCH SỬ LÀM MI GẦN NHẤT
          </span>
          {(!isFirstTimeClient || (booking?.lashHistory && booking.lashHistory.length > 0)) && (
            <span className="text-[10px] text-amber-400 font-bold">Chạm để xem chi tiết & 3 ảnh ↗</span>
          )}
        </div>
        {isFirstTimeClient && (!booking?.lashHistory || booking.lashHistory.length === 0) ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-3.5 shadow-sm border border-amber-500/40 flex items-start gap-2.5 text-white">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-[#FFB400] flex items-center justify-center shrink-0 mt-0.5">
              <Eye className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-black text-amber-300 leading-snug">
                Khách hàng mới lần đầu · Chưa có lịch sử làm mi
              </div>
              <div className="text-[11px] text-neutral-300 font-medium mt-0.5 leading-relaxed">
                Bắt buộc kiểm tra 4 thông số mi thật & dáng mắt trước khi tư vấn thiết kế mi.
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#1C1C1E] rounded-2xl shadow-sm border border-neutral-800 overflow-hidden divide-y divide-neutral-800 text-white">
            {(booking?.lashHistory && booking.lashHistory.length > 0
              ? booking.lashHistory
              : getFallbackLashHistory(assignedStaff)
            ).map((h, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => onOpenLashHistory(h)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenLashHistory(h);
                  }
                }}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#2C2C2E] active:bg-neutral-800 transition-colors group select-none"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[13px] font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                    {h.date} · {h.serviceName}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    Chuyên viên: {h.staffName} · Đánh giá: {'rating' in h && h.rating ? h.rating : 5.0} ★
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2C2C2E] border border-neutral-700 text-amber-400 text-[11px] font-bold shadow-xs group-hover:bg-amber-400 group-hover:text-black transition-all">
                    <span>Đã lưu form</span>
                    <span className="text-[11px] leading-none">›</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
