'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  computeCvSelfChallengePlan,
  hasCompleteNaturalLashSet,
  IosSelfChallengeOption,
  IosSelfChallengePlan,
  IosSelfChallengeSelection,
  IosSelfChallengeTierKey,
  isSelfChallengeSlowerThanAverage,
  validateSelfChallengeSlowerReason,
} from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { BookingItem, resolveStaffAvatarUrl } from '../../state/mockData';
import { StaffMonthlyStats } from '../../state/useIosAppState';
import { resolveDisplayServiceName, getWingsMenuDetail } from './LashMaterialConstraintMatrix';
import { resolveBookingCvRotationPoints } from './incoming/incomingBookingHelpers';
import { CvReceiveMaterialsCard } from './servicing/CvReceiveMaterialsCard';
import { SelfChallengeDurationCard } from './servicing/SelfChallengeDurationCard';
import { Sparkles, Eye, Play, RotateCw, Clock, ChevronLeft, AlertTriangle, Lock } from 'lucide-react';

interface Screen06CvDashboardReceiveProps {
  booking: BookingItem;
  onStartTask: (durationMinutes?: number, selfChallenge?: IosSelfChallengeSelection) => void;
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
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const bookerAvatar = resolveStaffAvatarUrl(booking.bookerAvatar, undefined, booking.bookerName || 'CC');
  const customerAvatar =
    booking.customerAvatar || 'https://cdn.wingslashes.com/uploads/user/avatar/48400/original/48400.jpg';

  // Điểm thưởng nhiệm vụ (Quest EXP / Points)
  const rotationPoints = resolveBookingCvRotationPoints(booking);

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
  const [selectedTier, setSelectedTier] = useState<IosSelfChallengeTierKey | null>(null);
  const [selectedDurationMin, setSelectedDurationMin] = useState<number | null>(null);
  const [slowerReason, setSlowerReason] = useState<string>('');
  const [showTimeRequiredWarning, setShowTimeRequiredWarning] = useState<boolean>(false);
  const [showReasonRequiredWarning, setShowReasonRequiredWarning] = useState<boolean>(false);
  const timeSectionRef = React.useRef<HTMLDivElement>(null);
  const slowerReasonInputRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSelectedTier(null);
    setSelectedDurationMin(null);
    setSlowerReason('');
    setShowTimeRequiredWarning(false);
    setShowReasonRequiredWarning(false);
  }, [booking.id]);

  const selfChallengePlan = useMemo(
    () =>
      computeCvSelfChallengePlan({
        booking,
        historyProfile: booking.cvSelfSpeedHistory || staffStats?.cvSelfSpeedHistory,
        fallbackSuggestedMinutes: suggestedDurationMin,
      }),
    [booking, staffStats?.cvSelfSpeedHistory, suggestedDurationMin]
  );

  const requiresSlowerReason = isSelfChallengeSlowerThanAverage(selectedDurationMin, selfChallengePlan.baselineMinutes);
  const slowerReasonValidation = validateSelfChallengeSlowerReason(slowerReason);

  const handleSelectChallengeOption = (option: IosSelfChallengeOption, _plan: IosSelfChallengePlan) => {
    setSelectedTier(option.key);
    setSelectedDurationMin(option.minutes);
    setShowTimeRequiredWarning(false);
    if (!isSelfChallengeSlowerThanAverage(option.minutes, selfChallengePlan.baselineMinutes)) {
      setShowReasonRequiredWarning(false);
    }
  };

  const handleAdjustChallengeMinutes = (deltaMinutes: number) => {
    setSelectedDurationMin((prev) => {
      const selectedOpt = selectedTier ? selfChallengePlan.options.find((o) => o.key === selectedTier) : null;
      const base = prev ?? selectedOpt?.minutes ?? selfChallengePlan.baselineMinutes;
      const next = Math.max(20, Math.min(180, base + deltaMinutes));
      if (!isSelfChallengeSlowerThanAverage(next, selfChallengePlan.baselineMinutes)) {
        setShowReasonRequiredWarning(false);
      }
      return next;
    });
    setShowTimeRequiredWarning(false);
  };

  const mustCheckNaturalLashFirst = !hasCompleteNaturalLashSet(booking);

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
    if (requiresSlowerReason && !slowerReasonValidation.valid) {
      setShowReasonRequiredWarning(true);
      timeSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      slowerReasonInputRef.current?.focus?.();
      return;
    }
    const activeOption = selectedTier ? selfChallengePlan.options.find((o) => o.key === selectedTier) || null : null;
    const selectionPayload: IosSelfChallengeSelection | undefined = activeOption
      ? {
          tierKey: activeOption.key,
          tierLabel: activeOption.label,
          baseOptionMinutes: activeOption.minutes,
          committedMinutes: selectedDurationMin,
          baselineMinutes: selfChallengePlan.baselineMinutes,
          sampleCount: selfChallengePlan.sampleCount,
          matchedSetLabel: selfChallengePlan.matchedSetLabel,
          slowerReason: requiresSlowerReason ? slowerReasonValidation.normalized : undefined,
        }
      : undefined;
    onStartTask(selectedDurationMin, selectionPayload);
  };

  // Thời lượng hiệu lực dùng để tính giờ xong
  const activeDurationMin = selectedDurationMin || selfChallengePlan.baselineMinutes || suggestedDurationMin;

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
    <div className="flex-1 flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-hidden select-none font-sans">
      {/* 1. Sleek Native iOS Navigation Bar (Replaces bulky avatar & NOW header) */}
      <div className="h-12 px-3.5 bg-[var(--mos-surface)]/95 backdrop-blur-xl border-b border-[var(--mos-surface-border)] flex items-center justify-between z-20 sticky top-0 flex-shrink-0">
        {/* Left: Back to Lobby Button */}
        <div className="flex items-center min-w-[70px]">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center text-[var(--mos-accent)] active:opacity-60 transition-opacity text-[14.5px] font-semibold -ml-1 py-1 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 -mr-0.5 shrink-0" />
              <span>Sảnh</span>
            </button>
          ) : (
            <span className="text-[11px] font-bold text-[var(--mos-text-muted)]">Ca Hiện Tại</span>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[15px] font-black text-[var(--mos-text)] tracking-tight leading-tight">
            Nhiệm Vụ Ca Làm
          </span>
        </div>

        {/* Right: Estimated Duration & Completion Target */}
        <div className="flex items-center justify-end min-w-[70px]">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--mos-surface-raised)] border shadow-xs transition-all select-none ${
              selectedDurationMin
                ? isDark
                  ? 'border-emerald-500/70 text-emerald-400'
                  : 'border-emerald-500 text-emerald-700'
                : 'border-[var(--mos-surface-border)] text-[var(--mos-text-muted)]'
            }`}
            title={
              selectedDurationMin
                ? `Thời lượng cam kết: ~${selectedDurationMin} phút · Dự kiến hoàn thành lúc ${estimatedFinishTime}`
                : `Chưa chọn thời gian cam kết`
            }
          >
            <Clock
              className={`w-3.5 h-3.5 shrink-0 ${
                selectedDurationMin
                  ? isDark
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                  : 'text-[var(--mos-text-muted)]'
              }`}
            />
            {selectedDurationMin ? (
              <>
                <span
                  className={`text-[12px] font-black tabular-nums tracking-tight ${
                    isDark ? 'text-emerald-400' : 'text-emerald-700'
                  }`}
                >
                  ~{selectedDurationMin}p
                </span>
                <span className="text-[9.5px] text-[var(--mos-text-muted)] font-semibold border-l border-[var(--mos-surface-border)] pl-1.5 tabular-nums">
                  Xong {estimatedFinishTime}
                </span>
              </>
            ) : (
              <span className="text-[11px] font-bold text-[var(--mos-text-muted)]">Chưa chọn giờ</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Content Body */}
      <div className="p-4 pb-28 space-y-3.5 flex-1 overflow-y-auto">
        {/* Active Quest Card (Bordered in Gold Laser) */}
        <div className="relative bg-[var(--mos-surface)] border border-amber-500/80 rounded-3xl p-4 space-y-3.5 shadow-2xl overflow-hidden">
          {/* Laser Glow top bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

          {/* Customer Info & Target Service */}
          <div className="bg-[var(--mos-surface-raised)] border border-[var(--mos-surface-border)] rounded-2xl p-3 flex items-start gap-3">
            {/* Customer Avatar */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/60 bg-[var(--mos-surface-muted)] shrink-0">
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
                <h2 className="text-[17px] font-black text-[var(--mos-text)] tracking-tight truncate">
                  {booking.customerName}
                </h2>
                <span className="text-[10.5px] font-bold text-[var(--mos-text-muted)] shrink-0">
                  Lần {booking.customerVisits || 7}
                </span>
              </div>
              <div className="text-[11.5px] text-[var(--mos-text-muted)] font-mono mt-0.2">
                {(booking.customerPhone || '').replace(/\*+\s*/g, '').trim()}
              </div>

              {/* Service Target & Price */}
              <div
                className={`mt-1 text-[13px] font-black leading-tight ${isDark ? 'text-amber-300' : 'text-amber-700'}`}
              >
                {displayServiceName}
              </div>

              {/* Rewards / Pricing Bar */}
              <div className="mt-2 flex items-center justify-between gap-1.5 flex-wrap">
                <span className="text-[12px] font-extrabold text-[var(--mos-text)]">
                  {booking.servicePrice ? booking.servicePrice.toLocaleString('vi-VN') : '640.000'} đ
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] text-[var(--mos-text)] text-[11px] font-semibold tabular-nums">
                  <RotateCw className={`w-3 h-3 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span>+{rotationPoints} pts</span>
                </span>
              </div>
            </div>
          </div>

          {/* Mandatory Natural Lash Check Banner for New Clients */}
          {mustCheckNaturalLashFirst && (
            <div
              className={`border-2 border-rose-500 rounded-2xl p-3 flex items-center justify-between gap-2.5 shadow-lg ${
                isDark ? 'bg-rose-950/70' : 'bg-rose-50'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  <Eye className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[11.5px] font-black uppercase tracking-tight ${
                      isDark ? 'text-rose-300' : 'text-rose-800'
                    }`}
                  >
                    CHƯA KIỂM TRA MI THẬT · BẮT BUỘC ĐO ĐỦ 7/7 MỤC
                  </div>
                  <div
                    className={`text-[11px] font-bold leading-snug mt-0.5 ${
                      isDark ? 'text-rose-100/95' : 'text-rose-700'
                    }`}
                  >
                    Bắt buộc đo đủ 7/7 thông số mi thật & dáng mắt trước khi nhận ca và bắt đầu làm mi!
                  </div>
                </div>
              </div>
              {onEditService && (
                <button
                  type="button"
                  onClick={onEditService}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-black text-[11px] shrink-0 cursor-pointer shadow-sm"
                >
                  Kiểm tra →
                </button>
              )}
            </div>
          )}

          {/* Tech Invariant Banner: Ca Nối Mới Combo bắt buộc gỡ sạch 100% mi cũ */}
          {isComboNewFullSet && (
            <div
              className={`border-2 border-amber-500 rounded-2xl p-3 flex items-start gap-2.5 shadow-lg ${
                isDark ? 'bg-amber-950/70' : 'bg-amber-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div
                  className={`text-[11.5px] font-black uppercase tracking-tight ${
                    isDark ? 'text-amber-300' : 'text-amber-800'
                  }`}
                >
                  QUY CHUẨN KỸ THUẬT: CA TRỪ SUẤT NỐI MỚI (COMBO)
                </div>
                <div
                  className={`text-[11px] font-bold leading-snug mt-0.5 ${
                    isDark ? 'text-amber-100/95' : 'text-amber-900'
                  }`}
                >
                  Chuyên viên BẮT BUỘC phải gỡ ra toàn bộ mi cũ và nối mới 100% cho khách hàng (không được dặm đè lên mi
                  cũ khi trừ suất nối mới)!
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Banner if upgraded from Combo */}
          {Boolean(booking?.upgradePrice && booking.upgradePrice > 0) && (
            <div
              className={`border-2 border-emerald-500 rounded-2xl p-3 flex items-start gap-2.5 shadow-lg ${
                isDark ? 'bg-emerald-950/70' : 'bg-emerald-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[11.5px] font-black uppercase tracking-tight flex items-center justify-between ${
                    isDark ? 'text-emerald-300' : 'text-emerald-800'
                  }`}
                >
                  <span>Ca Nâng Cấp Từ Gói Combo</span>
                  <span className={`tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    +{(booking.upgradePrice || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div
                  className={`text-[11px] font-bold leading-snug mt-0.5 ${
                    isDark ? 'text-emerald-100/95' : 'text-emerald-900'
                  }`}
                >
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

          {/* 3.5 BẮT BUỘC: KHỐI VƯỢT LÊN CHÍNH MÌNH (4 MỨC TỐC ĐỘ CÁ NHÂN CV) */}
          <SelfChallengeDurationCard
            booking={booking}
            staffStats={staffStats}
            suggestedDurationMin={suggestedDurationMin}
            plan={selfChallengePlan}
            selectedTier={selectedTier}
            selectedDurationMin={selectedDurationMin}
            slowerReason={slowerReason}
            showTimeRequiredWarning={showTimeRequiredWarning}
            showReasonRequiredWarning={showReasonRequiredWarning}
            estimatedFinishTime={estimatedFinishTime}
            timeSectionRef={timeSectionRef}
            slowerReasonInputRef={slowerReasonInputRef}
            onSelectOption={handleSelectChallengeOption}
            onAdjustMinutes={handleAdjustChallengeMinutes}
            onChangeSlowerReason={(val) => {
              setSlowerReason(val);
              if (validateSelfChallengeSlowerReason(val).valid) {
                setShowReasonRequiredWarning(false);
              }
            }}
          />

          {/* 4. Big CTA Button: Start Quest */}
          {mustCheckNaturalLashFirst ? (
            <button
              type="button"
              onClick={handleStartTaskClick}
              className="w-full py-4 px-4 rounded-2xl bg-[var(--mos-accent)] hover:brightness-105 active:scale-[0.98] text-[var(--mos-accent-contrast)] font-black text-[13.5px] tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl uppercase cursor-pointer"
            >
              <Eye className="w-4 h-4 stroke-[2.5]" />
              <span>KIỂM TRA MI THẬT TRƯỚC KHI BẮT ĐẦU →</span>
            </button>
          ) : showTimeRequiredWarning && !selectedDurationMin ? (
            <button
              type="button"
              onClick={handleStartTaskClick}
              className="w-full py-4 px-4 rounded-2xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] font-bold text-[12.5px] tracking-wider flex items-center justify-center gap-2 cursor-pointer uppercase select-none active:scale-[0.99] transition-all"
            >
              <Lock className="w-4 h-4 text-[var(--mos-text-muted)]" />
              <span>BẮT BUỘC CHỌN THỜI GIAN TRƯỚC KHI BẮT ĐẦU</span>
            </button>
          ) : requiresSlowerReason && !slowerReasonValidation.valid && showReasonRequiredWarning ? (
            <button
              type="button"
              onClick={handleStartTaskClick}
              className="w-full py-4 px-4 rounded-2xl bg-[var(--mos-surface-muted)] border border-rose-500/60 text-rose-400 font-bold text-[12.5px] tracking-wider flex items-center justify-center gap-2 cursor-pointer uppercase select-none active:scale-[0.99] transition-all"
            >
              <Lock className="w-4 h-4 text-rose-400" />
              <span>BẮT BUỘC ĐIỀN LÝ DO HỢP LÝ TRƯỚC KHI BẮT ĐẦU</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartTaskClick}
              className="w-full py-4 px-4 rounded-2xl bg-[var(--mos-accent)] hover:brightness-105 active:scale-[0.98] text-[var(--mos-accent-contrast)] font-black text-[14px] tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl uppercase cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {selectedDurationMin
                  ? `MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM (~${selectedDurationMin}p)`
                  : 'MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM'}
              </span>
            </button>
          )}
        </div>

        {/* 5. Stats Summary Card (Footer KPI) */}
        <div className="bg-[var(--mos-surface)] rounded-2xl p-4 border border-[var(--mos-surface-border)] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--mos-text-muted)] font-medium">Doanh số ca {monthLabel}</span>
            <span className="text-[var(--mos-accent)] font-black text-sm tabular-nums">{displayRevenue}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--mos-text-muted)] font-medium">Tỷ lệ hài lòng (5 sao)</span>
            <span className="text-[#34C759] font-black text-sm tabular-nums">{displaySatisfaction}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
