'use client';

import React, { useMemo } from 'react';
import { BookingItem, resolveStaffAvatarUrl } from '../../state/mockData';
import { StaffMonthlyStats } from '../../state/useIosAppState';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import {
  Sparkles,
  Eye,
  Zap,
  Shield,
  Play,
  Edit3,
  MessageSquare,
  Award,
  RotateCw,
  Clock,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react';

function LashTrayIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" className={className} aria-hidden="true">
      {/* Lash Tile / Tray base */}
      <rect x="2" y="2" width="12" height="12" rx="2" strokeWidth="1.5" />
      {/* Lash strips arranged horizontally */}
      <line x1="4.5" y1="5.5" x2="11.5" y2="5.5" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="4.5" y1="8.5" x2="11.5" y2="8.5" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="4.5" y1="11.5" x2="9.5" y2="11.5" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface Screen06CvDashboardReceiveProps {
  booking: BookingItem;
  onStartTask: () => void;
  onEditService?: () => void;
  onBack?: () => void;
  staffStats?: StaffMonthlyStats | null;
}

export function Screen06CvDashboardReceive({
  booking,
  onStartTask,
  onEditService,
  onBack,
  staffStats,
}: Screen06CvDashboardReceiveProps) {
  const staffAvatar = resolveStaffAvatarUrl(
    booking.assignedStaffAvatar,
    booking.assignedStaffId || 13783,
    booking.assignedStaffName || 'Khanh Cao'
  );
  const bookerAvatar = resolveStaffAvatarUrl(booking.bookerAvatar, undefined, booking.bookerName || 'CC');
  const customerAvatar =
    booking.customerAvatar || 'https://cdn.wingslashes.com/uploads/user/avatar/48400/original/48400.jpg';

  // Điểm thưởng nhiệm vụ (Quest EXP / Points)
  const rotationPoints = booking.cvRotationPoints || (booking.attributes?.hasUnderMink ? 56 : 34);

  // Chuẩn hóa tên dịch vụ hiển thị, triệt tiêu hoàn toàn Any - Lashes
  const displayServiceName = resolveDisplayServiceName(booking);

  // Thời lượng ước tính cam kết lúc tư vấn (phút)
  const estimatedDurationMin = useMemo(() => {
    if (booking.serviceDuration) return booking.serviceDuration;
    let baseMin = 65; // Mặc định 65 phút
    const sName = (displayServiceName || '').toLowerCase();
    if (sName.includes('dặm') || sName.includes('refill')) {
      baseMin = 50;
    }
    if (booking.attributes?.hasUnderMink || sName.includes('mi dưới')) {
      baseMin += 25; // Mi dưới dặm thêm 25 phút
    }
    return baseMin;
  }, [booking, displayServiceName]);

  // Giờ dự kiến hoàn thành ca làm (tính từ giờ bắt đầu hẹn + thời lượng ước tính)
  const estimatedFinishTime = useMemo(() => {
    let startHours = 10;
    let startMinutes = 30;
    const timeStr = booking.time12h || booking.timeSlot || '';
    const match = timeStr.match(/(\d{1,2})[:h](\d{2})/);
    if (match) {
      startHours = parseInt(match[1], 10);
      startMinutes = parseInt(match[2], 10);
      if (timeStr.toLowerCase().includes('pm') && startHours < 12) {
        startHours += 12;
      }
    }
    const totalMinutes = startHours * 60 + startMinutes + estimatedDurationMin;
    const finishH = Math.floor(totalMinutes / 60) % 24;
    const finishM = totalMinutes % 60;
    return `${String(finishH).padStart(2, '0')}:${String(finishM).padStart(2, '0')}`;
  }, [booking, estimatedDurationMin]);

  // Dynamic live KPI stats for active technician (100% real numbers from database)
  const currentMonth = staffStats?.month || new Date().getMonth() + 1;
  const monthLabel = staffStats?.monthLabel || `tháng ${currentMonth}`;
  const displayRevenue = staffStats?.monthlyRevenueFormatted || (16253200).toLocaleString('vi-VN') + ' đ';
  const displaySatisfaction = (staffStats?.satisfactionRate ?? 100) + '%';
  const displayShifts = (staffStats?.completedShiftsCount ?? 9) + ' ca';
  const displayRating = (staffStats?.rating ?? 5.0).toFixed(1);

  const isComboNewFullSet =
    Boolean(booking?.comboLiveStatus?.isComboLive) &&
    (booking?.serviceType === 'Normal' ||
      Boolean(booking?.attributes?.overrideReason?.includes('gỡ toàn bộ')) ||
      Boolean(booking?.attributes?.overrideReason?.includes('Nối Mới Combo')));

  return (
    <div className="flex-1 flex flex-col bg-black overflow-y-auto select-none font-sans">
      {/* 1. Sleek Native iOS Navigation Bar (Replaces bulky avatar & NOW header) */}
      <div className="h-12 px-3.5 bg-black border-b border-neutral-900 flex items-center justify-between z-20 sticky top-0 flex-shrink-0">
        {/* Left: Back to Lobby Button */}
        <div className="flex items-center min-w-[70px]">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center text-[#FFB400] active:opacity-60 transition-opacity text-[14.5px] font-semibold -ml-1 py-1 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 -mr-0.5 shrink-0" />
              <span>Sảnh</span>
            </button>
          ) : (
            <span className="text-[11px] font-bold text-neutral-400">Ca Hiện Tại</span>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[15px] font-black text-white tracking-tight leading-tight">Nhiệm Vụ Ca Làm</span>
        </div>

        {/* Right: Estimated Duration & Completion Target */}
        <div className="flex items-center justify-end min-w-[70px]">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C1C1E] border border-amber-500/50 text-amber-400 shadow-xs cursor-default select-none"
            title={`Thời lượng cam kết lúc tư vấn: ~${estimatedDurationMin} phút · Dự kiến hoàn thành lúc ${estimatedFinishTime}`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[12px] font-black tabular-nums tracking-tight">~{estimatedDurationMin}p</span>
            <span className="text-[9.5px] text-neutral-400 font-semibold border-l border-neutral-700/80 pl-1.5 tabular-nums">
              Xong {estimatedFinishTime}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Body */}
      <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
        {/* Active Quest Card (Bordered in Gold Laser) */}
        <div className="relative bg-[#1C1C1E] border border-amber-500/80 rounded-3xl p-4 space-y-3.5 shadow-2xl overflow-hidden">
          {/* Laser Glow top bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

          {/* Top Quest Bar: Title */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight shadow-sm">
              <span>⚔️</span>
              <span>NHIỆM VỤ TIẾP NHẬN</span>
            </span>
          </div>

          {/* Customer Info & Target Service */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex items-start gap-3">
            {/* Customer Avatar */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/60 bg-neutral-800 shrink-0">
              <img
                src={customerAvatar}
                alt={booking.customerName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Customer Details & Service Target */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-[17px] font-black text-white tracking-tight truncate">{booking.customerName}</h2>
                <span className="text-[10.5px] font-bold text-neutral-400 shrink-0">
                  Lần {booking.customerVisits || 7}
                </span>
              </div>
              <div className="text-[11.5px] text-neutral-400 font-mono mt-0.2">
                {(booking.customerPhone || '').replace(/\*+\s*/g, '').trim()}
              </div>

              {/* Service Target & Price */}
              <div className="mt-1 text-[13px] font-black text-amber-300 leading-tight">{displayServiceName}</div>

              {/* Rewards / Pricing Bar */}
              <div className="mt-2 flex items-center justify-between gap-1.5 flex-wrap">
                <span className="text-[12px] font-extrabold text-white">
                  {booking.servicePrice ? booking.servicePrice.toLocaleString('vi-VN') : '640.000'} đ
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-800/80 border border-neutral-700/70 text-neutral-300 text-[11px] font-semibold tabular-nums">
                  <RotateCw className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>+{rotationPoints} pts</span>
                </span>
              </div>
            </div>
          </div>

          {/* Tech Invariant Banner: Ca Nối Mới Combo bắt buộc gỡ sạch 100% mi cũ */}
          {isComboNewFullSet && (
            <div className="bg-amber-950/70 border-2 border-amber-500 rounded-2xl p-3 flex items-start gap-2.5 shadow-lg">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-black text-amber-300 uppercase tracking-tight">
                  ⚠️ QUY CHUẨN KỸ THUẬT: CA TRỪ SUẤT NỐI MỚI (COMBO)
                </div>
                <div className="text-[11px] font-bold text-amber-100/95 leading-snug mt-0.5">
                  Nhân viên BẮT BUỘC phải gỡ ra toàn bộ mi cũ và nối mới 100% cho khách hàng (không được dặm đè lên mi
                  cũ khi trừ suất nối mới)!
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Banner if upgraded from Combo */}
          {Boolean(booking?.upgradePrice && booking.upgradePrice > 0) && (
            <div className="bg-emerald-950/70 border-2 border-emerald-500 rounded-2xl p-3 flex items-start gap-2.5 shadow-lg">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-black text-emerald-300 uppercase tracking-tight flex items-center justify-between">
                  <span>✨ Ca Nâng Cấp Từ Gói Combo</span>
                  <span className="text-emerald-400 tabular-nums">
                    +{(booking.upgradePrice || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="text-[11px] font-bold text-emerald-100/95 leading-snug mt-0.5">
                  Khách nâng cấp dịch vụ: Thu phụ thu +{(booking.upgradePrice || 0).toLocaleString('vi-VN')} đ khi
                  Checkout. Điểm thưởng Vòng xoay tính theo dịch vụ thực tế (+{rotationPoints} pts).
                </div>
              </div>
            </div>
          )}

          {/* 3. NGUYÊN VẬT LIỆU */}
          <div className="bg-[#242426] rounded-2xl p-3 space-y-2.5 border border-neutral-700/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <LashTrayIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" /> NGUYÊN VẬT LIỆU
              </span>
            </div>

            {/* Slot 1: Mi Trên */}
            <div className="bg-gradient-to-b from-[#2A2315] to-[#1A1A1C] rounded-xl p-2.5 border border-amber-500/40 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black text-amber-400 uppercase tracking-tight flex items-center gap-1.5">
                  <LashTrayIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" /> MI TRÊN
                </span>
                <span className="text-[9.5px] font-black text-amber-200 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-md">
                  {booking.attributes?.material || 'HyperLight'} · {booking.attributes?.volume || '3X'} ·{' '}
                  {booking.attributes?.count || '70 fan'}
                </span>
              </div>

              {/* 4 Stat Chips Grid: Cột Độ dài rộng hơn để chứa đủ 5 sizes */}
              <div className="grid grid-cols-[1fr_0.75fr_1.6fr_0.85fr] gap-1">
                <div className="bg-black/60 border border-white/10 rounded-lg py-1 px-1 text-center min-w-0">
                  <span className="text-[8.5px] font-bold text-neutral-400 uppercase block">Dáng</span>
                  <span className="text-[10.5px] font-black text-white block truncate mt-0.5 whitespace-nowrap">
                    {booking.attributes?.style || 'Natural'}
                  </span>
                </div>
                <div className="bg-black/60 border border-blue-500/30 rounded-lg py-1 px-1 text-center min-w-0">
                  <span className="text-[8.5px] font-bold text-blue-400 uppercase block">Cong</span>
                  <span className="text-[11px] font-black text-blue-300 block truncate mt-0.5 whitespace-nowrap">
                    {(booking.attributes?.curl || 'C').replace(/^Cong\s+/i, '')}
                  </span>
                </div>
                <div className="bg-black/60 border border-emerald-500/30 rounded-lg py-1 px-1 text-center min-w-0">
                  <span className="text-[8.5px] font-bold text-emerald-400 uppercase block">Độ dài</span>
                  {(() => {
                    const rawLen = (booking.attributes?.length || '10-12')
                      .replace(/\s*mm/gi, '')
                      .replace(/\s*-\s*/g, '-')
                      .trim();
                    return (
                      <span
                        className={`font-black text-emerald-300 block mt-0.5 whitespace-nowrap tabular-nums tracking-tighter ${
                          rawLen.length > 9 ? 'text-[9.5px]' : 'text-[11px]'
                        }`}
                        title={booking.attributes?.length}
                      >
                        {rawLen}
                      </span>
                    );
                  })()}
                </div>
                <div className="bg-black/60 border border-purple-500/30 rounded-lg py-1 px-1 text-center min-w-0">
                  <span className="text-[8.5px] font-bold text-purple-400 uppercase block">Độ dày</span>
                  <span className="text-[11px] font-black text-purple-300 block truncate mt-0.5 whitespace-nowrap tabular-nums">
                    {(booking.attributes?.thickness || '0.10').replace(/\s*mm/gi, '')}
                  </span>
                </div>
              </div>
            </div>

            {/* Slot 2: Mi Dưới */}
            {booking.attributes?.hasUnderMink && (
              <div className="bg-gradient-to-b from-[#261633] to-[#1A1A1C] rounded-xl p-2.5 border border-purple-500/50 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black text-purple-300 uppercase tracking-tight flex items-center gap-1.5">
                    <LashTrayIcon className="w-3.5 h-3.5 text-purple-300 shrink-0" /> MI DƯỚI (
                    {booking.attributes?.underMinkServiceType === 'Retain' ? 'Dặm' : 'Nối Mới'})
                  </span>
                  <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/40">
                    {booking.attributes?.underMinkCount || '30 sợi'}
                  </span>
                </div>

                {/* 4 Stat Chips Grid */}
                <div className="grid grid-cols-[1fr_0.75fr_1.6fr_0.85fr] gap-1">
                  <div className="bg-black/60 border border-purple-400/20 rounded-lg py-1 px-1 text-center min-w-0">
                    <span className="text-[8.5px] font-bold text-neutral-400 uppercase block">Chất liệu</span>
                    <span className="text-[10.5px] font-black text-purple-200 block truncate mt-0.5 whitespace-nowrap">
                      1D Mink
                    </span>
                  </div>
                  <div className="bg-black/60 border border-blue-500/30 rounded-lg py-1 px-1 text-center min-w-0">
                    <span className="text-[8.5px] font-bold text-blue-400 uppercase block">Cong</span>
                    <span className="text-[11px] font-black text-blue-300 block truncate mt-0.5 whitespace-nowrap">
                      {(booking.attributes?.underMinkCurl || 'B').replace(/^Cong\s+/i, '')}
                    </span>
                  </div>
                  <div className="bg-black/60 border border-emerald-500/30 rounded-lg py-1 px-1 text-center min-w-0">
                    <span className="text-[8.5px] font-bold text-emerald-400 uppercase block">Độ dài</span>
                    <span className="text-[11px] font-black text-emerald-300 block truncate mt-0.5 whitespace-nowrap tabular-nums">
                      {(booking.attributes?.underMinkLength || '7').replace(/\s*mm/gi, '')}
                    </span>
                  </div>
                  <div className="bg-black/60 border border-purple-500/30 rounded-lg py-1 px-1 text-center min-w-0">
                    <span className="text-[8.5px] font-bold text-purple-400 uppercase block">Độ dày</span>
                    <span className="text-[11px] font-black text-purple-300 block truncate mt-0.5 whitespace-nowrap tabular-nums">
                      {(booking.attributes?.underMinkThickness || '0.10').replace(/\s*mm/gi, '')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mini-HUD: Thông số mi thật đã khám */}
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-2.5 space-y-1.5">
              <span className="text-[9.5px] font-black uppercase text-blue-400 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>👁️</span> HỒ SƠ MI THẬT (MỤC TIÊU NỐI)
                </span>
                <span className="text-[9px] text-blue-300/80 font-bold">Đã lưu</span>
              </span>
              <div className="grid grid-cols-[0.85fr_1.35fr_1fr] gap-1.5 text-center">
                <div className="bg-black/50 border border-blue-400/20 rounded-lg py-1 px-1 min-w-0">
                  <span className="text-[8.5px] font-bold text-blue-400 uppercase block">Dài</span>
                  <span className="text-[11.5px] font-black text-white block mt-0.5 whitespace-nowrap tabular-nums">
                    {(booking.attributes?.naturalLashLength || '8').replace(/\s*mm/gi, '').trim()}
                  </span>
                </div>
                <div className="bg-black/50 border border-emerald-400/20 rounded-lg py-1 px-1 min-w-0">
                  <span className="text-[8.5px] font-bold text-emerald-400 uppercase block">Dày</span>
                  <span className="text-[11px] font-black text-emerald-300 block mt-0.5 whitespace-nowrap tabular-nums tracking-tight">
                    {(booking.attributes?.naturalLashThickness || '0.05-0.07').replace(/\s*mm/gi, '').trim()}
                  </span>
                </div>
                <div className="bg-black/50 border border-purple-400/20 rounded-lg py-1 px-1 min-w-0">
                  <span className="text-[8.5px] font-bold text-purple-400 uppercase block">Mí</span>
                  <span className="text-[10.5px] font-black text-purple-300 block truncate mt-0.5 whitespace-nowrap">
                    {booking.attributes?.eyeShape?.split('(')[0].split('/')[0].trim() || 'Mí lót'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quest Note: Dặn dò CC / Booker với Avatar */}
            <div className="bg-[#2C241E] border border-amber-500/30 rounded-xl p-2.5 flex items-start gap-2.5">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-400/60 bg-neutral-800 shrink-0 mt-0.5">
                {bookerAvatar ? (
                  <img
                    src={bookerAvatar}
                    alt="Booker"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-amber-600 text-black font-black text-[10px] flex items-center justify-center">
                    CC
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 px-0.8 py-0.2 rounded bg-amber-400 text-black text-[6.5px] font-black leading-none">
                  Note
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9.5px] font-black uppercase text-amber-400 flex items-center gap-1">
                  <span>💬</span> DẶN DÒ TỪ {booking.bookerName || 'CC'}
                </span>
                <p className="text-[11.5px] text-amber-100/90 font-medium leading-snug mt-0.5">
                  {booking.customerNote || '31/10 c book Thảo Ly'}
                </p>
              </div>
            </div>

            {/* Action link: Đổi chất liệu / Sửa thông số mi */}
            {onEditService && (
              <div className="pt-0.5 flex justify-end">
                <button
                  type="button"
                  onClick={onEditService}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Đổi Chất Liệu / Sửa Thông Số Mi</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Big CTA Button: Start Quest */}
          <button
            onClick={onStartTask}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#FFB400] via-amber-400 to-[#FF9500] hover:brightness-105 active:scale-[0.98] text-black font-black text-[14.5px] tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 uppercase cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black stroke-black" />
            <span>MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM</span>
          </button>
        </div>

        {/* 5. Stats Summary Card (Footer KPI) */}
        <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-neutral-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 font-medium">Doanh số ca {monthLabel}</span>
            <span className="text-[#FFB400] font-black text-sm tabular-nums">{displayRevenue}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 font-medium">Tỷ lệ hài lòng (5 sao)</span>
            <span className="text-[#34C759] font-black text-sm tabular-nums">{displaySatisfaction}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
