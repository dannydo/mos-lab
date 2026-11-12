'use client';

import React, { useMemo, useState } from 'react';
import { BookingItem, resolveStaffAvatarUrl } from '../../state/mockData';
import { StaffMonthlyStats } from '../../state/useIosAppState';
import { resolveDisplayServiceName, getWingsMenuDetail } from './LashMaterialConstraintMatrix';
import { CvReceiveMaterialsCard } from './servicing/CvReceiveMaterialsCard';
import { Sparkles, Eye, Play, RotateCw, Clock, ChevronLeft, AlertTriangle, Minus, Plus, Lock } from 'lucide-react';

interface Screen06CvDashboardReceiveProps {
  booking: BookingItem;
  onStartTask: (durationMinutes?: number) => void;
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
  const bookerAvatar = resolveStaffAvatarUrl(booking.bookerAvatar, undefined, booking.bookerName || 'CC');
  const customerAvatar =
    booking.customerAvatar || 'https://cdn.wingslashes.com/uploads/user/avatar/48400/original/48400.jpg';

  // Điểm thưởng nhiệm vụ (Quest EXP / Points)
  const rotationPoints = booking.cvRotationPoints || (booking.attributes?.hasUnderMink ? 56 : 34);

  // Chuẩn hóa tên dịch vụ hiển thị, triệt tiêu hoàn toàn Any - Lashes
  const displayServiceName = resolveDisplayServiceName(booking);

  // 1. Tính toán thời gian gợi ý theo Ma Trận Kỹ Thuật (Lash Material Constraint Matrix)
  const suggestedDurationMin = useMemo(() => {
    const material = booking.attributes?.material || displayServiceName || '';
    const count = booking.attributes?.count || '';
    const volume = booking.attributes?.volume || '';
    const menuDetail = getWingsMenuDetail(material, count, volume);
    if (menuDetail?.durationMin) {
      let dur = menuDetail.durationMin;
      if (booking.attributes?.hasUnderMink) dur += 25;
      return dur;
    }

    // Fallback thông minh theo tên dịch vụ
    let base = 60;
    const sName = (displayServiceName || '').toLowerCase();
    if (sName.includes('dặm') || sName.includes('refill')) {
      base = 45;
    }
    if (booking.attributes?.hasUnderMink || sName.includes('mi dưới')) {
      base += 25;
    }
    return base;
  }, [booking, displayServiceName]);

  // State thời gian CVL chọn cam kết: khởi tạo null để BẮT BUỘC CVL phải chủ động bấm chạm chọn
  const [selectedDurationMin, setSelectedDurationMin] = useState<number | null>(null);
  const [showTimeRequiredWarning, setShowTimeRequiredWarning] = useState<boolean>(false);
  const timeSectionRef = React.useRef<HTMLDivElement>(null);

  const hasCompleteNaturalLashSet = Boolean(
    booking.attributes?.isNewClientDiagnosticDone === true &&
    booking.attributes?.naturalLashLength?.trim() &&
    booking.attributes?.naturalLashThickness?.trim() &&
    (booking.attributes?.naturalLashCount?.trim() || booking.attributes?.naturalLashDensity?.trim()) &&
    booking.attributes?.lashTrail?.trim() &&
    booking.attributes?.eyeShape?.trim() &&
    booking.attributes?.lashHealth?.trim() &&
    booking.attributes?.medicalProblem?.trim()
  );

  const mustCheckNaturalLashFirst = (booking.customerVisits ?? 1) <= 1 && !hasCompleteNaturalLashSet;

  const handleStartTaskClick = () => {
    if (mustCheckNaturalLashFirst && onEditService) {
      onEditService();
      return;
    }
    if (!selectedDurationMin) {
      setShowTimeRequiredWarning(true);
      timeSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    onStartTask(selectedDurationMin);
  };

  // Thời lượng hiệu lực dùng để tính giờ xong
  const activeDurationMin = selectedDurationMin || suggestedDurationMin;

  // Danh sách các pill thời gian thông minh (luôn bao gồm số phút gợi ý từ ma trận)
  const quickPillOptions = useMemo(() => {
    const defaultPills = [45, 60, 75, 90, 105];
    const set = new Set([...defaultPills, suggestedDurationMin]);
    return Array.from(set).sort((a, b) => a - b);
  }, [suggestedDurationMin]);

  // Giờ dự kiến hoàn thành ca làm (tính từ giờ bắt đầu hẹn + thời lượng)
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
    const totalMinutes = startHours * 60 + startMinutes + activeDurationMin;
    const finishH = Math.floor(totalMinutes / 60) % 24;
    const finishM = totalMinutes % 60;
    return `${String(finishH).padStart(2, '0')}:${String(finishM).padStart(2, '0')}`;
  }, [booking, activeDurationMin]);

  // Dynamic live KPI stats for active technician (100% real numbers from database)
  const currentMonth = staffStats?.month || new Date().getMonth() + 1;
  const monthLabel = staffStats?.monthLabel || `tháng ${currentMonth}`;
  const displayRevenue = staffStats?.monthlyRevenueFormatted || (16253200).toLocaleString('vi-VN') + ' đ';
  const displaySatisfaction = (staffStats?.satisfactionRate ?? 100) + '%';

  const isComboNewFullSet =
    Boolean(booking?.comboLiveStatus?.isComboLive) &&
    (booking?.serviceType === 'Normal' ||
      Boolean(booking?.attributes?.overrideReason?.includes('gỡ toàn bộ')) ||
      Boolean(booking?.attributes?.overrideReason?.includes('Nối Mới Combo')));

  const isRetain = useMemo(() => {
    const sType = String(booking?.serviceType || '').toLowerCase();
    const sName = (displayServiceName || booking?.serviceName || '').toLowerCase();
    const bAny = booking as any;
    const sKey = (bAny?.serviceKey || '').toLowerCase();
    const cName = (bAny?.categoryName || '').toLowerCase();
    const isRetainService =
      sType === 'retain' ||
      sName.includes('dặm') ||
      sName.includes('dam') ||
      sName.includes('refill') ||
      sKey.includes('retain') ||
      cName.includes('dặm') ||
      cName.includes('dam') ||
      cName.includes('refill') ||
      Boolean(bAny?.isRefill) ||
      Boolean(booking?.attributes && (booking.attributes as any).isRefill) ||
      Boolean(booking?.attributes && (booking.attributes as any).serviceType === 'Retain');

    if (isComboNewFullSet || sType === 'normal' || sType === 'new') {
      return false;
    }
    return isRetainService;
  }, [booking, displayServiceName, isComboNewFullSet]);

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden select-none font-sans">
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C1C1E] border shadow-xs transition-all select-none ${
              selectedDurationMin ? 'border-emerald-500/70 text-emerald-400' : 'border-neutral-700 text-neutral-400'
            }`}
            title={
              selectedDurationMin
                ? `Thời lượng cam kết: ~${selectedDurationMin} phút · Dự kiến hoàn thành lúc ${estimatedFinishTime}`
                : `Chưa chọn thời gian cam kết`
            }
          >
            <Clock
              className={`w-3.5 h-3.5 shrink-0 ${selectedDurationMin ? 'text-emerald-400' : 'text-neutral-500'}`}
            />
            {selectedDurationMin ? (
              <>
                <span className="text-[12px] font-black tabular-nums tracking-tight text-emerald-400">
                  ~{selectedDurationMin}p
                </span>
                <span className="text-[9.5px] text-neutral-300 font-semibold border-l border-neutral-700/80 pl-1.5 tabular-nums">
                  Xong {estimatedFinishTime}
                </span>
              </>
            ) : (
              <span className="text-[11px] font-bold text-neutral-400">Chưa chọn giờ</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Content Body */}
      <div className="p-4 pb-28 space-y-3.5 flex-1 overflow-y-auto">
        {/* Active Quest Card (Bordered in Gold Laser) */}
        <div className="relative bg-[#1C1C1E] border border-amber-500/80 rounded-3xl p-4 space-y-3.5 shadow-2xl overflow-hidden">
          {/* Laser Glow top bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

          {/* Customer Info & Target Service */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex items-start gap-3">
            {/* Customer Avatar */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/60 bg-neutral-800 shrink-0">
              <img
                src={customerAvatar}
                alt={booking.customerName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/ios-assets/no-image.png';
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

          {/* Mandatory Natural Lash Check Banner for New Clients */}
          {mustCheckNaturalLashFirst && (
            <div className="bg-rose-950/70 border-2 border-rose-500 rounded-2xl p-3 flex items-center justify-between gap-2.5 shadow-lg">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Eye className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-black text-rose-300 uppercase tracking-tight">
                    KHÁCH MỚI · CHƯA KIỂM TRA MI THẬT
                  </div>
                  <div className="text-[11px] font-bold text-rose-100/95 leading-snug mt-0.5">
                    Bắt buộc đo 4 thông số mi thật & dáng mắt trước khi bắt đầu làm mi!
                  </div>
                </div>
              </div>
              {onEditService && (
                <button
                  type="button"
                  onClick={onEditService}
                  className="px-2.5 py-1.5 rounded-xl bg-[#FFB400] text-black font-black text-[11px] shrink-0 cursor-pointer shadow-sm"
                >
                  Kiểm tra →
                </button>
              )}
            </div>
          )}

          {/* Tech Invariant Banner: Ca Nối Mới Combo bắt buộc gỡ sạch 100% mi cũ */}
          {isComboNewFullSet && (
            <div className="bg-amber-950/70 border-2 border-amber-500 rounded-2xl p-3 flex items-start gap-2.5 shadow-lg">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-black text-amber-300 uppercase tracking-tight">
                  QUY CHUẨN KỸ THUẬT: CA TRỪ SUẤT NỐI MỚI (COMBO)
                </div>
                <div className="text-[11px] font-bold text-amber-100/95 leading-snug mt-0.5">
                  Chuyên viên BẮT BUỘC phải gỡ ra toàn bộ mi cũ và nối mới 100% cho khách hàng (không được dặm đè lên mi
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
                  <span>Ca Nâng Cấp Từ Gói Combo</span>
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
          <CvReceiveMaterialsCard
            booking={booking}
            isRetain={isRetain}
            bookerAvatar={bookerAvatar}
            onEditService={onEditService}
          />

          {/* 3.5 BẮT BUỘC: KHỐI DỰ ĐOÁN THỜI GIAN HOÀN THÀNH CA (CVL CAM KẾT) */}
          <div
            ref={timeSectionRef}
            className={`rounded-2xl p-3.5 space-y-2.5 transition-all ${
              selectedDurationMin
                ? 'bg-[#1C1C1E] border border-emerald-500/50 shadow-md'
                : showTimeRequiredWarning
                  ? 'bg-[#1C1C1E] border-2 border-rose-500/80 shadow-lg shadow-rose-500/20 animate-pulse'
                  : 'bg-[#1C1C1E] border border-neutral-700/80 shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11.5px] font-black uppercase text-amber-400 tracking-tight">
                  Thời Gian Dự Đoán Hoàn Thành
                </span>
              </div>
              <span
                className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border leading-none ${
                  selectedDurationMin
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : showTimeRequiredWarning
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 animate-pulse'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {selectedDurationMin ? `Đã chọn: ${selectedDurationMin}p` : 'Bắt buộc chọn'}
              </span>
            </div>

            {/* Quick Pills & Stepper */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {quickPillOptions.map((mins) => {
                const isSelected = selectedDurationMin === mins;
                const isSuggested = mins === suggestedDurationMin;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setSelectedDurationMin(mins);
                      setShowTimeRequiredWarning(false);
                    }}
                    className={`relative px-2.5 py-1.5 rounded-xl text-[11.5px] font-bold tabular-nums transition-all active:scale-95 cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-[#FFB400] text-black border-[#FFB400] shadow-sm font-black ring-2 ring-amber-400/50'
                        : isSuggested && selectedDurationMin !== null
                          ? 'bg-[#252528] text-amber-300 border-amber-500/70 hover:border-amber-400'
                          : 'bg-[#141416] text-neutral-300 border-neutral-700/80 hover:border-neutral-500'
                    }`}
                  >
                    <span>{mins}p</span>
                    {isSuggested && (
                      <span
                        className={`text-[8.5px] px-1 py-0.2 rounded font-black leading-none ${
                          isSelected
                            ? 'bg-black text-[#FFB400]'
                            : selectedDurationMin !== null
                              ? 'bg-amber-400/20 text-amber-400'
                              : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        Gợi ý
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Stepper Buttons: -5p and +5p */}
              <div className="inline-flex items-center rounded-xl bg-[#141416] border border-neutral-700/80 overflow-hidden ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    const current = selectedDurationMin ?? suggestedDurationMin;
                    setSelectedDurationMin(
                      selectedDurationMin === null ? suggestedDurationMin : Math.max(30, current - 5)
                    );
                    setShowTimeRequiredWarning(false);
                  }}
                  className="px-2 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors active:scale-95 text-[11px] font-bold cursor-pointer"
                  title="Giảm 5 phút"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  className={`px-2 text-[11.5px] font-extrabold tabular-nums ${selectedDurationMin ? 'text-amber-400' : 'text-neutral-500'}`}
                >
                  {selectedDurationMin ? `${selectedDurationMin}p` : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const current = selectedDurationMin ?? suggestedDurationMin;
                    setSelectedDurationMin(
                      selectedDurationMin === null ? suggestedDurationMin : Math.min(180, current + 5)
                    );
                    setShowTimeRequiredWarning(false);
                  }}
                  className="px-2 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors active:scale-95 text-[11px] font-bold cursor-pointer"
                  title="Tăng 5 phút"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Estimated Finish Time Banner */}
            <div className="pt-1.5 flex items-center justify-between text-[11px] border-t border-neutral-800">
              <span className="text-neutral-400">Dự kiến xong lúc:</span>
              <span className="font-extrabold tabular-nums">
                {selectedDurationMin ? (
                  <span className="text-emerald-400">{estimatedFinishTime} (Cam kết)</span>
                ) : (
                  <span className="text-neutral-500 font-semibold">—</span>
                )}
              </span>
            </div>
          </div>

          {/* 4. Big CTA Button: Start Quest */}
          {mustCheckNaturalLashFirst ? (
            <button
              type="button"
              onClick={handleStartTaskClick}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#FFB400] via-amber-400 to-[#FF9500] hover:brightness-105 active:scale-[0.98] text-black font-black text-[13.5px] tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 uppercase cursor-pointer"
            >
              <Eye className="w-4 h-4 stroke-[2.5]" />
              <span>KIỂM TRA MI THẬT TRƯỚC KHI BẮT ĐẦU →</span>
            </button>
          ) : showTimeRequiredWarning && !selectedDurationMin ? (
            <button
              type="button"
              onClick={handleStartTaskClick}
              className="w-full py-4 px-4 rounded-2xl bg-[#1C1C1E] border border-neutral-800 text-neutral-400 font-bold text-[12.5px] tracking-wider flex items-center justify-center gap-2 cursor-pointer uppercase select-none active:scale-[0.99] transition-all"
            >
              <Lock className="w-4 h-4 text-neutral-400" />
              <span>BẮT BUỘC CHỌN THỜI GIAN TRƯỚC KHI BẮT ĐẦU</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartTaskClick}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#FFB400] via-amber-400 to-[#FF9500] hover:brightness-105 active:scale-[0.98] text-black font-black text-[14px] tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 uppercase cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black stroke-black" />
              <span>
                {selectedDurationMin
                  ? `MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM (~${selectedDurationMin}p)`
                  : 'MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM'}
              </span>
            </button>
          )}
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
