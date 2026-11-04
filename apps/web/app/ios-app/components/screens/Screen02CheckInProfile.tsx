'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem, LashHistoryItem, resolveStaffAvatarUrl } from '../../state/mockData';
import { Screen02LashHistorySheet } from './Screen02LashHistorySheet';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import {
  Check,
  Sparkles,
  ShieldCheck,
  Eye,
  RotateCw,
  Award,
  ArrowUpRight,
  Zap,
  Lock,
  AlertTriangle,
  Sliders,
  Info,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  calculateLashPricingAndCvPoints,
  parseUnderMinkCountFibers,
  parseUnderMinkLengthMm,
  resolveQuickCheckInComboPreset,
  stepUnderMinkCount,
  stepUnderMinkLength,
  UNDER_MINK_PREP_SPEC,
} from './LashMaterialConstraintMatrix';

interface Screen02CheckInProfileProps {
  booking: BookingItem;
  actor?: ActiveActorProfile;
  onBack: () => void;
  onCheckIn: () => void;
  onQuickCheckIn?: (
    attributes: {
      style: string;
      curl: string;
      length: string;
      thickness: string;
      material?: string;
      color?: string;
      volume?: string;
      count?: string;
      hasUnderMink?: boolean;
      underMinkServiceType?: 'Normal' | 'Retain';
      underMinkCurl?: string;
      underMinkThickness?: string;
      underMinkLength?: string;
      underMinkCount?: string;
      isOverridden?: boolean;
      overrideReason?: string;
      eyeShape?: string;
      naturalLashLength?: string;
      naturalLashThickness?: string;
      naturalLashDensity?: string;
      isNewClientDiagnosticDone?: boolean;
      lashHealth?: string;
      lashTrail?: string;
      medicalProblem?: string;
      notes?: string;
    },
    selectedCombo?: { id: string; name: string; price: number; bonus: number; sessions: number } | null,
    skuPricing?: {
      skuName?: string;
      skuPrice?: number;
      upgradePrice?: number;
      cvPoints?: number;
      cvBreakdown?: string;
      serviceType?: string;
    } | null
  ) => void;
}

function getStaffInitials(name?: string): string {
  const cleaned = String(name || '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^\p{L}\s]/gu, '')
    .trim();
  if (!cleaned) return 'WL';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[parts.length - 2][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function Screen02CheckInProfile({
  booking,
  actor,
  onBack,
  onCheckIn,
  onQuickCheckIn,
}: Screen02CheckInProfileProps) {
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
  const actorTierLabel = actor?.tier === 'CVLL' ? <CvFeather2Badge /> : actor?.tier === 'CVL' ? 'CV🪶' : 'CC';

  // Thảo Ly (CVL): Checkin by và Lashed by là 1 người tự chủ đón tiếp & làm mi cho khách
  const isCvlStaff =
    assignedStaff.toLowerCase().includes('thảo ly') ||
    booking?.assignedStaffId === 46272 ||
    actor?.tier === 'CVL' ||
    actorName.toLowerCase().includes('thảo ly');

  const checkInStaffName = isCvlStaff ? assignedStaff : booking?.checkInStaffName || actorName;
  const checkInStaffAvatar =
    resolveStaffAvatarUrl(
      isCvlStaff ? booking?.checkInStaffAvatar || booking?.assignedStaffAvatar : booking?.checkInStaffAvatar,
      isCvlStaff ? booking?.assignedStaffId || 46272 : booking?.checkInStaffId,
      checkInStaffName
    ) || (isCvlStaff ? 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png' : undefined);

  const assignedStaffAvatar =
    resolveStaffAvatarUrl(booking?.assignedStaffAvatar, booking?.assignedStaffId || 46272, assignedStaff) ||
    (isCvlStaff ? 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png' : undefined);

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

  // ---------------------------------------------------------------------------
  // QUICK CHECK-IN PRESET (DÀNH CHO 80-90% KHÁCH ĐÃ CÓ GÓI COMBO DÙNG LẠI FORM CŨ)
  // ---------------------------------------------------------------------------
  const preset = useMemo(() => resolveQuickCheckInComboPreset(booking), [booking]);

  const [quickServiceType, setQuickServiceType] = useState<'Normal' | 'Retain'>(preset.expectedServiceType);
  const [quickHasUnderMink, setQuickHasUnderMink] = useState<boolean>(preset.hasUnderMink);
  const [quickUnderServiceType, setQuickUnderServiceType] = useState<'Normal' | 'Retain'>(preset.underMinkServiceType);
  const [quickUnderCurl, setQuickUnderCurl] = useState<string>(preset.underMinkCurl);
  const [quickUnderLength, setQuickUnderLength] = useState<string>(preset.underMinkLength);
  const [quickUnderCount, setQuickUnderCount] = useState<string>(preset.underMinkCount);
  const [isOverridden, setIsOverridden] = useState<boolean>(Boolean(booking?.attributes?.isOverridden));
  const [overrideReason, setOverrideReason] = useState<string>(booking?.attributes?.overrideReason || '');
  const [pendingOverride, setPendingOverride] = useState<{
    title: string;
    message: string;
    reasons: string[];
    onConfirm: (reason: string) => void;
  } | null>(null);
  const [selectedOverrideReasonDraft, setSelectedOverrideReasonDraft] = useState<string>('');
  const [isRotationExpanded, setIsRotationExpanded] = useState<boolean>(false);
  const [isRotationInfoOpen, setIsRotationInfoOpen] = useState<boolean>(false);
  const [selectedLashHistory, setSelectedLashHistory] = useState<LashHistoryItem | null>(null);
  const [isLashHistoryOpen, setIsLashHistoryOpen] = useState<boolean>(false);

  const handleOpenLashHistory = (item: LashHistoryItem) => {
    setSelectedLashHistory(item);
    setIsLashHistoryOpen(true);
  };

  useEffect(() => {
    setQuickServiceType(preset.expectedServiceType);
    setQuickHasUnderMink(preset.hasUnderMink);
    setQuickUnderServiceType(preset.underMinkServiceType);
    setQuickUnderCurl(preset.underMinkCurl);
    setQuickUnderLength(preset.underMinkLength);
    setQuickUnderCount(preset.underMinkCount);
    setIsOverridden(Boolean(booking?.attributes?.isOverridden));
    setOverrideReason(booking?.attributes?.overrideReason || '');
  }, [
    booking?.id,
    preset.expectedServiceType,
    preset.hasUnderMink,
    preset.underMinkServiceType,
    preset.underMinkCurl,
    preset.underMinkLength,
    preset.underMinkCount,
  ]);

  const handleRequestQuickServiceTypeChange = (targetType: 'Normal' | 'Retain') => {
    if (targetType === quickServiceType) return;

    // 1. Nếu khách có Gói Combo và muốn NỐI MỚI (dù đi <= 25 ngày) và trong gói CÒN LẦN NỐI MỚI (normalRemaining > 0):
    // -> Cho phép chọn Nối Mới trực tiếp (trừ 1 lần Nối Mới trong gói), KHÔNG bật cảnh báo lỗi Override!
    if (targetType === 'Normal' && isComboLive && !preset.isAlwaysFullSet && preset.hasNormalRemaining) {
      setQuickServiceType('Normal');
      setIsOverridden(false);
      setOverrideReason('');
      return;
    }

    // 2. Nếu quay về đúng chế độ mặc định theo chu kỳ 25 ngày (và còn lượt tương ứng)
    if (targetType === preset.expectedServiceType) {
      setQuickServiceType(targetType);
      setIsOverridden(false);
      setOverrideReason('');
      return;
    }

    // 3. Nếu khách có Gói Combo muốn NỐI MỚI nhưng trong gói ĐÃ HẾT LẦN NỐI MỚI (normalRemaining === 0)
    if (targetType === 'Normal' && isComboLive && !preset.isAlwaysFullSet && !preset.hasNormalRemaining) {
      const reasons = [
        `Quy đổi 2 lần Dặm trong gói thành 1 lần Nối Mới (Quản lý duyệt)`,
        `Khách bù chênh lệch nâng cấp từ suất Dặm lên Nối Mới`,
        `Khách thanh toán lẻ buổi Nối Mới, giữ nguyên ${preset.retainRemaining} lần Dặm`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        title: `⚠️ Gói Combo Đã Hết Lần Nối Mới (Còn ${preset.retainRemaining} Lần Dặm)`,
        message: `Trong gói "${booking?.comboLiveStatus?.comboName}" của khách đã hết lần Nối Mới (0 lần Mới · còn ${preset.retainRemaining} lần Dặm). Vui lòng xác nhận phương án khi khách muốn Nối Mới:`,
        reasons,
        onConfirm: (reason: string) => {
          setQuickServiceType('Normal');
          setIsOverridden(true);
          setOverrideReason(reason);
          setPendingOverride(null);
        },
      });
      return;
    }

    // 4. Nếu khách có Gói Combo muốn DẶM nhưng trong gói ĐÃ HẾT LẦN DẶM (retainRemaining === 0)
    if (targetType === 'Retain' && isComboLive && !preset.isAlwaysFullSet && !preset.hasRetainRemaining) {
      const reasons = [
        `Khách đồng ý dùng 1 lần Nối Mới trong gói để thực hiện Dặm`,
        `Khách thanh toán lẻ buổi Dặm hôm nay, giữ nguyên ${preset.normalRemaining} lần Nối Mới`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        title: `⚠️ Gói Combo Đã Hết Lần Dặm (Còn ${preset.normalRemaining} Lần Nối Mới)`,
        message: `Trong gói của khách đã hết lần Dặm (còn ${preset.normalRemaining} lần Nối Mới · 0 lần Dặm). Vui lòng chọn phương án xử lý:`,
        reasons,
        onConfirm: (reason: string) => {
          setQuickServiceType('Retain');
          setIsOverridden(true);
          setOverrideReason(reason);
          setPendingOverride(null);
        },
      });
      return;
    }

    // 5. Nếu đã quá hạn (Combo > 25 ngày / Single > 21 ngày) mà CV🪶 bấm chọn Dặm -> Cảnh báo Override
    if (targetType === 'Retain' && !preset.isWithinRetainWindow) {
      const daysText =
        preset.daysSinceLastVisit !== null
          ? `lần cuối ngày ${preset.lastVisitDate} (${preset.daysSinceLastVisit} ngày trước — quá hạn ${preset.retainDaysLimit} ngày)`
          : `chưa có lịch sử trong ${preset.retainDaysLimit} ngày`;
      const reasons = [
        `Quản lý duyệt hỗ trợ trễ chu kỳ (≤ 30 ngày) do khách bận/công tác`,
        `Khách VIP xin gia hạn tính dặm 1 lần duy nhất`,
        `Bảo hành / Hỗ trợ đặc biệt theo duyệt Cửa hàng trưởng`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        title: `⚠️ Cảnh Báo Override: Đã Quá ${preset.retainDaysLimit} Ngày (${isComboLive ? 'Combo' : 'Single'})`,
        message: isComboLive
          ? `Khách Gói Combo ghé ${daysText}. Theo quy định khách mua Combo đi trong 25 ngày luôn được tính Dặm, sau 25 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính DẶM.`
          : `Khách lẻ (Single) ghé ${daysText}. Theo quy định khách Single đi trong 21 ngày có Giá Dặm vô điều kiện, sau 21 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính GIÁ DẶM.`,
        reasons,
        onConfirm: (reason: string) => {
          setQuickServiceType('Retain');
          setIsOverridden(true);
          setOverrideReason(reason);
          setPendingOverride(null);
        },
      });
      return;
    }

    // 6. Nếu khách lẻ Single (hoặc Mink/IvyLight) đi trong hạn được hưởng Giá Dặm mà chuyển sang thu Giá Nối Mới
    if (targetType === 'Normal' && preset.isWithinRetainWindow) {
      const reasons = [
        `Mi cũ rụng > 70% không đủ điều kiện dặm — khách đồng ý tính Nối Mới`,
        `Khách yêu cầu tháo làm bộ mới hoàn toàn và tính suất Nối Mới`,
        `Khách đổi sang form / dòng mi mới không áp dụng giá dặm`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        title: `⚠️ Cảnh Báo Override: Đi Trong ${preset.retainDaysLimit} Ngày (${isComboLive ? 'Combo' : 'Single'})`,
        message: isComboLive
          ? `Khách Gói Combo ghé lần cuối ngày ${preset.lastVisitDate} (${preset.daysSinceLastVisit} ngày trước ≤ 25 ngày). Theo quy định khách mua Combo đi trong 25 ngày luôn luôn được tính DẶM, nhưng bạn đang chuyển sang tính GIÁ NỐI MỚI.`
          : `Khách lẻ (Single) ghé lần cuối ngày ${preset.lastVisitDate} (${preset.daysSinceLastVisit} ngày trước ≤ 21 ngày). Theo quy định khách Single đi trong 21 ngày luôn có GIÁ DẶM VÔ ĐIỀU KIỆN, nhưng bạn đang chuyển sang tính GIÁ NỐI MỚI.`,
        reasons,
        onConfirm: (reason: string) => {
          setQuickServiceType('Normal');
          setIsOverridden(true);
          setOverrideReason(reason);
          setPendingOverride(null);
        },
      });
      return;
    }

    setQuickServiceType(targetType);
  };

  // Thông số Vòng Xoay CV thực tế (Tự động lấy từ Gói Combo & chế độ Nối Mới/Dặm của Quick Check-in)
  const isBookedDirectly = Boolean(booking?.assignedStaffName);

  const activePointsBreakdown = useMemo(() => {
    if (isComboLive) {
      return calculateLashPricingAndCvPoints({
        materialId: preset.materialId,
        countStr: preset.count,
        volumeStr: preset.volume,
        designId: preset.style,
        colorStr: preset.color,
        originalBookedPrice: booking?.servicePrice || 550000,
        serviceType: quickServiceType,
        hasUnderMink: quickHasUnderMink,
        underMinkServiceType: quickUnderServiceType,
        hasUnderMinkCombo: preset.hasUnderMinkCombo,
      });
    }
    const initialServiceType =
      booking?.serviceType || (booking?.serviceName?.toLowerCase().includes('dặm') ? 'Retain' : 'Normal');
    return calculateLashPricingAndCvPoints({
      materialId: booking?.attributes?.material || 'New Classic',
      countStr: booking?.attributes?.count || '90 sợi',
      volumeStr: booking?.attributes?.volume || '1D',
      designId: booking?.attributes?.style || 'Natural',
      colorStr: booking?.attributes?.color,
      originalBookedPrice: booking?.servicePrice || 550000,
      serviceType: initialServiceType,
      hasUnderMink: Boolean(booking?.attributes?.hasUnderMink),
      underMinkServiceType: booking?.attributes?.underMinkServiceType,
      hasUnderMinkCombo: Boolean(booking?.underMinkComboStatus?.hasUnderCombo),
    });
  }, [isComboLive, preset, booking, quickServiceType, quickHasUnderMink, quickUnderServiceType]);

  const handleExecuteQuickCheckIn = () => {
    if (!onQuickCheckIn) {
      onCheckIn();
      return;
    }
    onQuickCheckIn(
      {
        style: preset.style,
        curl: preset.curl,
        length: preset.length,
        thickness: preset.thickness,
        material: preset.materialId,
        color: preset.color,
        volume: preset.volume,
        count: preset.count,
        hasUnderMink: quickHasUnderMink,
        underMinkServiceType: quickUnderServiceType,
        underMinkCurl: quickUnderCurl,
        underMinkThickness: UNDER_MINK_PREP_SPEC.fixedThickness,
        underMinkLength: quickUnderLength,
        underMinkCount: quickUnderCount,
        isOverridden,
        overrideReason: isOverridden ? overrideReason : undefined,
        eyeShape: booking?.attributes?.eyeShape || 'Mí lót / Sụp mí (Hooded)',
        naturalLashLength: booking?.attributes?.naturalLashLength || '8mm',
        naturalLashThickness: booking?.attributes?.naturalLashThickness || '0.05-0.07mm',
        naturalLashDensity: booking?.attributes?.naturalLashDensity || 'Vừa (80 - 120 sợi/mắt)',
        isNewClientDiagnosticDone: true,
        lashHealth: booking?.attributes?.lashHealth || 'Mi khỏe (Healthy)',
        lashTrail: booking?.attributes?.lashTrail || 'Chúc xuống (Downwards)',
        notes: booking?.attributes?.notes || '',
      },
      null,
      {
        skuName: activePointsBreakdown.skuName,
        skuPrice: activePointsBreakdown.skuPrice,
        upgradePrice: activePointsBreakdown.upgradePrice,
        cvPoints: activePointsBreakdown.totalPoints,
        cvBreakdown: activePointsBreakdown.breakdownLabel,
        serviceType: quickServiceType,
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Hồ Sơ Khách & Check In"
        onBack={onBack}
        backTitle="Khách Hàng"
        rightAction={
          <button
            onClick={isComboLive && onQuickCheckIn ? handleExecuteQuickCheckIn : onCheckIn}
            className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60 cursor-pointer"
          >
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
            </div>
          </div>
        </div>

        {/* Card 2: QUICK CHECK-IN GÓI COMBO LIVE (Thiết kế Minimalism · Ít chữ · Thao tác 1 chạm) */}
        {isComboLive ? (
          <div className="rounded-2xl p-3 shadow-sm border border-emerald-500/70 bg-gradient-to-b from-emerald-50/70 via-white to-white space-y-2">
            {/* Header gọn: Icon Zap + Tên gói + Badge Ngày ghé cuối & Tổng lượt */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center shrink-0">
                  <Zap className="w-3 h-3 fill-current" />
                </span>
                <span className="text-[12px] font-extrabold text-neutral-900 truncate">
                  {booking?.comboLiveStatus?.comboName || 'Gói Combo Live'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 tabular-nums">
                {preset.daysSinceLastVisit !== null && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      preset.isWithinRetainWindow ? 'bg-emerald-100/90 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}
                    title={preset.lastVisitDate ? `Ghé lần cuối: ${preset.lastVisitDate}` : undefined}
                  >
                    {preset.daysSinceLastVisit} ngày
                  </span>
                )}
                <span className="bg-[#FFB400] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  Còn {remainingSessions}
                </span>
              </div>
            </div>

            {/* Khối Thông số Mi Trên (Lần trước) + 1 dòng Mi Dưới tối giản */}
            <div className="bg-neutral-50/80 rounded-xl p-2.5 border border-neutral-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-extrabold text-neutral-900 truncate">
                      {preset.materialShortLabel} · {preset.volume} · {preset.count}
                    </span>
                    {preset.lastVisitDate && (
                      <span className="text-[10px] text-neutral-400 font-medium tabular-nums shrink-0">
                        ({preset.lastVisitDate.slice(0, 5)})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-neutral-600 truncate mt-0.5">
                    {preset.style} · Cong {preset.curl} · {preset.thickness.replace(/\s+/g, '')} ·{' '}
                    {preset.length.replace(/\s+/g, '')}
                  </div>
                </div>

                {/* Nút bật/tắt Mi Dưới tối giản (bỏ chữ 50 sợi) */}
                <button
                  type="button"
                  onClick={() => setQuickHasUnderMink((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                    quickHasUnderMink
                      ? 'bg-purple-600 border-purple-600 text-white shadow-2xs'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-purple-300'
                  }`}
                >
                  {quickHasUnderMink && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>+Mi dưới</span>
                </button>
              </div>

              {/* 1 Dòng Ngang Duy Nhất Cho Mi Dưới: [B|C] · [6|7|6-7] · [20|30|40] + Chọn độc lập [Mới | Dặm] */}
              {quickHasUnderMink && (
                <div className="pt-2 border-t border-neutral-200/70 flex items-center justify-between gap-1 text-[10px] tabular-nums whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {/* Độ cong: B | C */}
                    <div className="inline-flex items-center bg-white p-0.5 rounded-lg border border-neutral-200">
                      {UNDER_MINK_PREP_SPEC.allowedCurls.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setQuickUnderCurl(c)}
                          className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                            quickUnderCurl === c
                              ? 'bg-purple-600 text-white shadow-2xs'
                              : 'text-neutral-600 hover:text-black'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    {/* Độ dài: default 7 · nút cộng trừ tăng giảm 1 */}
                    <div className="inline-flex items-center bg-white p-0.5 rounded-lg border border-neutral-200 tabular-nums">
                      <button
                        type="button"
                        onClick={() => setQuickUnderLength((prev) => stepUnderMinkLength(prev, -1))}
                        disabled={parseUnderMinkLengthMm(quickUnderLength) <= UNDER_MINK_PREP_SPEC.minLengthMm}
                        className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-100 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[20px] text-center shadow-2xs">
                        {parseUnderMinkLengthMm(quickUnderLength)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickUnderLength((prev) => stepUnderMinkLength(prev, 1))}
                        disabled={parseUnderMinkLengthMm(quickUnderLength) >= UNDER_MINK_PREP_SPEC.maxLengthMm}
                        className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-100 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>

                    {/* Số lượng: default 30 · nút cộng trừ tăng giảm 10 */}
                    <div className="inline-flex items-center bg-white p-0.5 rounded-lg border border-neutral-200 tabular-nums">
                      <button
                        type="button"
                        onClick={() => setQuickUnderCount((prev) => stepUnderMinkCount(prev, -10))}
                        disabled={parseUnderMinkCountFibers(quickUnderCount) <= UNDER_MINK_PREP_SPEC.minCountFibers}
                        className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-100 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[22px] text-center shadow-2xs">
                        {parseUnderMinkCountFibers(quickUnderCount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickUnderCount((prev) => stepUnderMinkCount(prev, 10))}
                        disabled={parseUnderMinkCountFibers(quickUnderCount) >= UNDER_MINK_PREP_SPEC.maxCountFibers}
                        className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-100 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Chọn ĐỘC LẬP Mi Dưới: Mới (390K) hoặc Dặm (250K) — Tự động trừ gói Mi Dưới nếu có */}
                  <div
                    className="inline-flex items-center bg-white p-0.5 rounded-lg border border-purple-200 shrink-0"
                    title={
                      preset.hasUnderMinkCombo
                        ? `Khách có ${preset.underComboName} (Còn ${preset.underComboRemaining} lượt) · Tự động trừ vào gói Mi Dưới (0đ)`
                        : 'Chọn độc lập Mi Dưới: Nối Mới (390K) hoặc Dặm (250K)'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setQuickUnderServiceType('Normal')}
                      className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                        quickUnderServiceType === 'Normal'
                          ? 'bg-[#FFB400] text-black shadow-2xs'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      {preset.hasUnderMinkCombo ? `Mới (${preset.underComboNormalRemaining})` : 'Mới'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickUnderServiceType('Retain')}
                      className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                        quickUnderServiceType === 'Retain'
                          ? 'bg-[#34C759] text-white shadow-2xs'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      {preset.hasUnderMinkCombo ? `Dặm (${preset.underComboRetainRemaining})` : 'Dặm'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Banner Override nhỏ gọn nếu có */}
            {isOverridden && (
              <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-[10px] text-rose-900 font-semibold">
                <span className="truncate">⚠️ {overrideReason}</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuickServiceType(preset.expectedServiceType);
                    setIsOverridden(false);
                    setOverrideReason('');
                  }}
                  className="px-1.5 py-0.5 rounded bg-white text-rose-700 border border-rose-300 text-[9px] font-bold shrink-0 cursor-pointer"
                >
                  Hoàn tác ↺
                </button>
              </div>
            )}

            {/* 2 Nút chọn chế độ tối giản: ✨ Mới (X) | 🔄 Dặm (Y) */}
            <div className="bg-neutral-900 p-1 rounded-xl grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handleRequestQuickServiceTypeChange('Normal')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
                  quickServiceType === 'Normal'
                    ? 'bg-[#FFB400] text-black shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{preset.isAlwaysFullSet ? 'Mới · Giá mới' : `Mới (${preset.normalRemaining})`}</span>
              </button>

              <button
                type="button"
                onClick={() => handleRequestQuickServiceTypeChange('Retain')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
                  quickServiceType === 'Retain'
                    ? 'bg-[#34C759] text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5 shrink-0" />
                <span>{preset.isAlwaysFullSet ? 'Mới · Giá dặm' : `Dặm (${preset.retainRemaining})`}</span>
              </button>
            </div>

            {/* Hàng nút hành động đáy gộp chung 1 hàng: [⚡ Quick Check-in] + [🎛️ Đổi mẫu] */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleExecuteQuickCheckIn}
                className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-[12.5px] flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer ${
                  quickServiceType === 'Normal' && !preset.isAlwaysFullSet
                    ? 'bg-[#FFB400] hover:bg-amber-500 text-black'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Quick Check-in</span>
              </button>

              <button
                type="button"
                onClick={onCheckIn}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 font-bold text-[12px] flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-98"
                title="Đổi Dáng / Độ cong / Dòng mi khác"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Đổi mẫu</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-3.5 shadow-sm border bg-gradient-to-r from-amber-50 to-orange-50 border-[#FFB400]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#FF9500]" />
                CHƯA CÓ GÓI COMBO (KHÁCH SINGLE · CHU KỲ 21N)
              </span>
              <span className="bg-[#FFB400] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                ≤ 21N: Giá Dặm vô điều kiện
              </span>
            </div>
            <div className="text-[12px] text-gray-800 font-semibold mt-1 leading-snug">
              Khách lẻ (Single) đi trong 21 ngày luôn có Giá Dặm vô điều kiện. Tư vấn chốt thêm gói Combo mới nhận ngay
              thưởng bậc thang tới +200.000đ.
            </div>
          </div>
        )}

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
              <span className="text-[9.5px] font-semibold text-amber-300 tracking-tight truncate w-full">
                Checkin by
              </span>
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
                <span className="absolute -bottom-1 -right-1 bg-[#2C2C2E] border border-[#FFB400] text-[#FFB400] text-[8px] font-black px-1 py-0.2 rounded-full leading-tight">
                  {isCvlStaff ? 'CV🪶' : actorTierLabel}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#FFB400] truncate w-full mt-1">
                {checkInStaffName.replace(/\s*\(.*?\)/g, '')}
              </span>
            </div>

            {/* 3. Lashed by */}
            <div className="flex flex-col items-center min-w-0">
              <span className="text-[9.5px] font-semibold text-purple-300 tracking-tight truncate w-full">
                Lashed by
              </span>
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
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 space-y-2.5 tabular-nums">
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
            <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <RotateCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              THÔNG SỐ VÒNG XOAY
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10.5px] font-extrabold truncate leading-none">
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
                    ? `2 Bộ · +${activePointsBreakdown.totalPoints} pts (${activePointsBreakdown.upperSetPoints}p+${activePointsBreakdown.underSetPoints}p)`
                    : `+${activePointsBreakdown.totalPoints} pts`}
                </span>
              </span>
              <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
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
                className="w-6 h-6 rounded-full bg-blue-100/90 text-blue-700 hover:bg-blue-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              >
                <Info className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {isRotationExpanded && (
            <div className="space-y-2 pt-0.5 border-t border-neutral-100">
              {/* Bộ 1: Mi Trên */}
              <div className="bg-[#F8F9FA] rounded-xl p-2.5 border border-gray-100 space-y-1 tabular-nums">
                <div className="flex items-center justify-between text-[11.5px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9.5px] font-black shrink-0">
                      BỘ 1 · MI TRÊN
                    </span>
                    <span className="font-extrabold text-gray-900 truncate">
                      {isComboLive ? preset.materialShortLabel : serviceName.split(' ')[0] || 'Classic'} ·{' '}
                      {preset.isAlwaysFullSet
                        ? 'Mi Mới'
                        : (isComboLive ? quickServiceType : booking?.serviceType) === 'Retain'
                          ? 'Dặm'
                          : 'Mi Mới'}
                    </span>
                  </div>
                  <span className="text-blue-600 font-black text-[12px] shrink-0">
                    +{activePointsBreakdown.upperSetPoints} pts
                  </span>
                </div>
                <div className="text-[10px] text-gray-600 font-semibold flex items-center justify-between">
                  <span>{activePointsBreakdown.upperSetBreakdownLabel}</span>
                  <span className="text-gray-400">{isBookedDirectly ? 'Chỉ định KTV' : 'Xoay tua'}</span>
                </div>
              </div>

              {/* Bộ 2: Mi Dưới (Độc lập về vòng xoay khi khách nối cả Mi Trên và Mi Dưới) */}
              {activePointsBreakdown.serviceSetsCount === 2 && (
                <div className="bg-purple-50/60 rounded-xl p-2.5 border border-purple-200/80 space-y-1 tabular-nums">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9.5px] font-black shrink-0">
                        BỘ 2 · MI DƯỚI
                      </span>
                      <span className="font-extrabold text-purple-950 truncate">
                        Under Mink · {quickUnderServiceType === 'Retain' ? 'Dặm' : 'Mi Mới'}
                      </span>
                      {activePointsBreakdown.isUnderMinkComboDeducted && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold shrink-0">
                          Trừ gói (0đ)
                        </span>
                      )}
                    </div>
                    <span className="text-purple-700 font-black text-[12px] shrink-0">
                      +{activePointsBreakdown.underSetPoints} pts
                    </span>
                  </div>
                  <div className="text-[10px] text-purple-800 font-semibold flex items-center justify-between whitespace-nowrap">
                    <span>{activePointsBreakdown.underSetBreakdownLabel}</span>
                    <span className="text-purple-600 font-bold">Độc lập</span>
                  </div>
                </div>
              )}

              {/* Dự kiến điểm Vòng Xoay thực tế (Chạm để mở giải thích chi tiết) */}
              <button
                type="button"
                onClick={() => setIsRotationInfoOpen(true)}
                className="w-full text-left bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100/70 hover:to-indigo-100/70 border border-blue-200/80 rounded-xl p-2.5 flex items-center justify-between tabular-nums cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Award className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[12px] font-extrabold text-blue-950 truncate">
                      {activePointsBreakdown.summaryLabel}
                    </div>
                    <div className="text-[10px] text-blue-700 truncate">
                      {activePointsBreakdown.serviceSetsCount === 2
                        ? `Nhận đủ 2 Bộ Mi độc lập vào CV Xoay (Bộ 1: +${activePointsBreakdown.upperSetPoints}p · Bộ 2: +${activePointsBreakdown.underSetPoints}p)`
                        : `${activePointsBreakdown.upperSetBreakdownLabel} · ${isBookedDirectly ? 'Chỉ định KTV' : 'Xoay tua tiệm'}`}
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-500 shrink-0" />
              </button>
            </div>
          )}
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

        {/* Section 2.5: Hồ Sơ Mi Thật (Minimalist & Scannable) */}
        {visits <= 1 ? (
          <div className="bg-amber-50/90 border border-[#FFB400] rounded-2xl p-3 shadow-xs flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-[#FFB400]/20 text-amber-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#FF9500]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-extrabold text-amber-950 uppercase tracking-tight">
                  MI THẬT · KHÁCH MỚI
                </div>
                <div className="text-[11px] text-amber-800 font-medium truncate">
                  Đo độ dài, độ dày sợi &amp; dáng mí ở bước tiếp theo
                </div>
              </div>
            </div>
            <span className="bg-[#FFB400] text-black text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 leading-none">
              Cần đo
            </span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 space-y-2 tabular-nums">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                HỒ SƠ MI THẬT
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 leading-none">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                Đã lưu
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F8FAFC] border border-neutral-100 rounded-xl px-2.5 py-2 flex flex-col justify-between">
                <span className="text-neutral-400 text-[10px] font-semibold">Độ dài</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-extrabold text-[12.5px] text-neutral-900">
                    {(booking?.attributes?.naturalLashLength || '8 mm (Chuẩn)').split('(')[0].trim()}
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-500">
                    {(booking?.attributes?.naturalLashLength || '8 mm (Chuẩn)').match(/\(([^)]+)\)/)?.[1] || 'Chuẩn'}
                  </span>
                </div>
              </div>
              <div className="bg-[#F8FAFC] border border-neutral-100 rounded-xl px-2.5 py-2 flex flex-col justify-between">
                <span className="text-neutral-400 text-[10px] font-semibold">Độ dày</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-extrabold text-[12.5px] text-neutral-900">
                    {(booking?.attributes?.naturalLashThickness || '0.07 mm (Mảnh)').split('(')[0].trim()}
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-500">
                    {(booking?.attributes?.naturalLashThickness || '0.07 mm (Mảnh)').match(/\(([^)]+)\)/)?.[1] ||
                      'Mảnh'}
                  </span>
                </div>
              </div>
              <div className="bg-[#F8FAFC] border border-neutral-100 rounded-xl px-2.5 py-2 flex flex-col justify-between">
                <span className="text-neutral-400 text-[10px] font-semibold">Mắt / Mí</span>
                <div className="font-extrabold text-[12.5px] text-neutral-900 mt-0.5 truncate">
                  {booking?.attributes?.eyeShape?.split('(')[0].trim() || 'Mí lót'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Dịch Vụ Hôm Nay (Minimalist & Scannable) */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 space-y-2 tabular-nums">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />
              DỊCH VỤ HÔM NAY
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200/80 leading-none">
              {bookingTime} · {booking?.assignedBed || 'Giường 01'}
            </span>
          </div>

          <div className="bg-[#F8FAFC] border border-neutral-100 rounded-xl p-2.5 space-y-2">
            {/* Bộ 1: Mi Trên */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12.5px] font-extrabold text-neutral-900 truncate">
                  {isComboLive
                    ? `${preset.isAlwaysFullSet ? 'Nối Mới' : quickServiceType === 'Retain' ? 'Dặm' : 'Nối Mới'} ${preset.materialShortLabel} (${preset.volume} · ${preset.count})`
                    : serviceName.toLowerCase().includes('any')
                      ? 'Chưa chọn mẫu mi'
                      : serviceName}
                </div>
                <div className="text-[10.5px] text-neutral-500 font-medium truncate mt-0.5">
                  {isComboLive
                    ? `Dáng ${preset.style} · Cong ${preset.curl} · Dày ${preset.thickness.replace(/\s*mm/i, '')} · Dài ${preset.length.replace(/\s*mm/i, '')}`
                    : serviceName.toLowerCase().includes('any')
                      ? 'Mặc định giữ khung giờ tạm tính · Tư vấn chọn mẫu tại tiệm'
                      : `Chuyên Viên: ${assignedStaff}`}
                </div>
              </div>

              <div className="text-right shrink-0">
                {isComboLive ? (
                  <>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold leading-none">
                      Trừ gói Combo
                    </span>
                    <div className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                      Giá lẻ {Math.round(activePointsBreakdown.skuPrice / 1000)}K
                    </div>
                  </>
                ) : (
                  <span className="text-[12.5px] font-extrabold text-[#FF9500]">{servicePrice}</span>
                )}
              </div>
            </div>

            {/* Bộ 2: Mi Dưới (Hiển thị khi khách có chọn kèm Mi Dưới) */}
            {isComboLive && quickHasUnderMink && (
              <div className="pt-2 border-t border-neutral-200/70 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold text-purple-950 truncate">
                    + Mi Dưới · Under Mink ({quickUnderServiceType === 'Retain' ? 'Dặm' : 'Nối Mới'})
                  </div>
                  <div className="text-[10px] text-purple-700/80 font-medium truncate mt-0.5">
                    Cong {quickUnderCurl} · Dày 0.10 · Dài {parseUnderMinkLengthMm(quickUnderLength)}mm ·{' '}
                    {parseUnderMinkCountFibers(quickUnderCount)} sợi
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {activePointsBreakdown.isUnderMinkComboDeducted ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold leading-none">
                      Trừ gói Mi Dưới
                    </span>
                  ) : (
                    <span className="text-[12px] font-extrabold text-purple-700">
                      +{quickUnderServiceType === 'Retain' ? '250.000' : '390.000'} đ
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: History list */}
        <div>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              LỊCH SỬ LÀM MI GẦN NHẤT
            </span>
            <span className="text-[10px] text-blue-600 font-bold">Chạm để xem chi tiết & 3 ảnh ↗</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            {(booking?.lashHistory && booking.lashHistory.length > 0
              ? booking.lashHistory
              : ([
                  {
                    orderId: 338846,
                    date: '19/10/2026',
                    serviceName: 'New Flawless Mink 880',
                    staffName: assignedStaff,
                    rating: 5.0,
                    review: 'Khách khen nối rất êm, mi giữ form bền đẹp.',
                    bookingNote: '19/10 c book Thảo Ly',
                    photos: [
                      {
                        type: 'before' as const,
                        label: '1. Before · Mắt mộc',
                        url: 'https://cdn.wingslashes.com/uploads/order/service-progress/645/original/1401645.jpg',
                      },
                      {
                        type: 'cleaned' as const,
                        label: '2. Vệ sinh · Nhắm mắt',
                        url: 'https://cdn.wingslashes.com/uploads/order/service-progress/646/original/1401646.jpg',
                      },
                      {
                        type: 'after' as const,
                        label: '3. After · Hoàn thiện',
                        url: 'https://cdn.wingslashes.com/uploads/order/service-progress/685/original/1401685.jpg',
                      },
                    ],
                    staffMembers: {
                      bookedBy: {
                        name: 'Tâm Nguyễn',
                        role: 'Booker',
                        avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/781/original/781.jpg',
                      },
                      checkInBy: {
                        name: assignedStaff,
                        role: 'CV🪶',
                        tier: 'CVL',
                        avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
                      },
                      lashedBy: {
                        name: assignedStaff,
                        role: 'CV🪶',
                        tier: 'CVL',
                        avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
                      },
                      checkOutBy: {
                        name: 'Thanh Vũ',
                        role: 'CC',
                        tier: 'CC',
                        avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/742/original/742.jpg',
                      },
                    },
                    attributes: {
                      style: 'Natural',
                      curl: 'C',
                      length: '10-12 mm',
                      thickness: '0.10 mm',
                      fanCount: '70 sợi',
                      material: 'Mink Silk',
                      eyeShape: 'Mí lót / Sụp mí',
                      notes: 'Mi khách cong nhẹ tự nhiên, chân mi cách bờ 1mm chuẩn kỹ thuật.',
                    },
                  },
                  {
                    orderId: 338845,
                    date: '02/10/2026',
                    serviceName: 'Dặm New Flawless',
                    staffName: assignedStaff,
                    rating: 5.0,
                    review: 'Dáng tự nhiên hài hòa khuôn mặt.',
                    bookingNote: 'Khách quen Thảo Ly',
                    photos: [
                      {
                        type: 'before' as const,
                        label: '1. Before · Mắt mộc',
                        url: 'https://cdn.wingslashes.com/uploads/order/service-progress/683/original/1401683.jpg',
                      },
                      {
                        type: 'cleaned' as const,
                        label: '2. Vệ sinh · Nhắm mắt',
                        url: 'https://cdn.wingslashes.com/uploads/order/service-progress/695/original/1401695.jpg',
                      },
                      {
                        type: 'after' as const,
                        label: '3. After · Hoàn thiện',
                        url: 'https://cdn.wingslashes.com/uploads/order/service-progress/732/original/1401732.jpg',
                      },
                    ],
                    staffMembers: {
                      bookedBy: {
                        name: 'Tâm Nguyễn',
                        role: 'Booker',
                        avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/781/original/781.jpg',
                      },
                      checkInBy: {
                        name: assignedStaff,
                        role: 'CV🪶',
                        tier: 'CVL',
                        avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
                      },
                      lashedBy: {
                        name: assignedStaff,
                        role: 'CV🪶',
                        tier: 'CVL',
                        avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
                      },
                      checkOutBy: {
                        name: 'Thanh Vũ',
                        role: 'CC',
                        tier: 'CC',
                        avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/742/original/742.jpg',
                      },
                    },
                    attributes: {
                      style: 'Natural',
                      curl: 'C',
                      length: '10-12 mm',
                      thickness: '0.10 mm',
                      fanCount: '70 sợi',
                      material: 'Mink Silk',
                      eyeShape: 'Mí lót / Sụp mí',
                      notes: 'Dặm lại những sợi rụng, giữ nguyên form cũ.',
                    },
                  },
                ] as LashHistoryItem[])
            ).map((h, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenLashHistory(h)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenLashHistory(h);
                  }
                }}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-blue-50/40 active:bg-blue-100/50 transition-colors group select-none"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[13px] font-bold text-black group-hover:text-blue-600 transition-colors truncate">
                    {h.date} · {h.serviceName}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                    Chuyên viên: {h.staffName} · Đánh giá: {'rating' in h && h.rating ? h.rating : 5.0} ★
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#007AFF] text-[11.5px] font-bold shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                    <span>Đã lưu form</span>
                    <span className="text-[12px] leading-none">›</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Big Action Button */}
        <div className="pt-1 space-y-2">
          {isComboLive && onQuickCheckIn ? (
            <>
              <button
                type="button"
                onClick={handleExecuteQuickCheckIn}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform cursor-pointer"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>QUICK CHECK-IN · GIỮ FORM CŨ ({quickServiceType === 'Retain' ? 'DẶM COMBO' : 'NỐI MỚI'})</span>
              </button>
              <button
                type="button"
                onClick={onCheckIn}
                className="w-full py-3 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[13px] flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-transform cursor-pointer"
              >
                <Sliders className="w-4 h-4 stroke-[2.5]" />
                <span>ĐỔI THÔNG SỐ / TƯ VẤN LẠI CHI TIẾT (BƯỚC 3)</span>
              </button>
            </>
          ) : (
            <button
              onClick={onCheckIn}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>
                {booking?.status === 'CHECKED_IN' || booking?.status === 'SERVICING'
                  ? `✏️ SỬA TƯ VẤN & ĐỔI DỊCH VỤ MI (BƯỚC 3)`
                  : `CHECK-IN & BẮT ĐẦU TƯ VẤN`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Modal Cảnh Báo Xác Nhận khi CV🪶 Override trái chu kỳ 25 ngày ngay trên màn Quick Check-in */}
      {pendingOverride && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[360px] bg-white rounded-3xl p-4 shadow-2xl border-2 border-rose-500 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[13.5px] font-black text-neutral-900 leading-snug">{pendingOverride.title}</h3>
                <p className="text-[11.5px] text-neutral-600 font-medium mt-1 leading-relaxed">
                  {pendingOverride.message}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10.5px] font-extrabold text-neutral-700 uppercase">
                Chọn lý do CV🪶 Override (Bắt buộc ghi nhận):
              </div>
              <div className="space-y-1.5">
                {pendingOverride.reasons.map((r) => {
                  const active = selectedOverrideReasonDraft === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedOverrideReasonDraft(r)}
                      className={`w-full text-left p-2.5 rounded-xl border text-[11.5px] font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        active
                          ? 'bg-rose-50 border-rose-500 text-rose-950 shadow-2xs'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="leading-snug">{r}</span>
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                          active ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300'
                        }`}
                      >
                        {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingOverride(null)}
                className="py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[12px] font-extrabold cursor-pointer"
              >
                Hủy · Giữ chuẩn
              </button>
              <button
                type="button"
                onClick={() => pendingOverride.onConfirm(selectedOverrideReasonDraft || pendingOverride.reasons[0])}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-black shadow-md cursor-pointer"
              >
                ⚠️ Xác nhận Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet Giải Thích Cách Tính Điểm Vòng Xoay (CV Xoay · Điều răn CV-001) */}
      {isRotationInfoOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsRotationInfoOpen(false)}
        >
          <div
            className="w-full max-w-[400px] bg-white rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl border border-neutral-200 space-y-3 max-h-[86vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Tiêu đề góc trái · Nút đóng [✕] góc phải (Chuẩn UI Invariant) */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-neutral-100">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4 text-blue-600 shrink-0" />
                  <h3 className="text-[13.5px] font-black text-neutral-900">Cách Tính Điểm Vòng Xoay (CV Xoay)</h3>
                </div>
                <p className="text-[10.5px] text-neutral-500 font-medium mt-0.5">
                  Đồng bộ 100% Báo cáo CV → Tab CV Xoay (Điều răn CV-001)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRotationInfoOpen(false)}
                aria-label="Đóng"
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-black flex items-center justify-center shrink-0 cursor-pointer transition-all"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 1. Chi tiết tính điểm của ca làm hiện tại */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 space-y-2 tabular-nums">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-blue-950">
                <span>CA LÀM HIỆN TẠI ({activePointsBreakdown.serviceSetsCount} BỘ MI)</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10.5px] font-black">
                  Tổng +{activePointsBreakdown.totalPoints} pts
                </span>
              </div>

              <div className="bg-white rounded-xl p-2 border border-blue-100 space-y-0.5 text-[10.5px]">
                <div className="flex items-center justify-between font-extrabold text-neutral-900">
                  <span>
                    Bộ 1 · Mi Trên ({isComboLive ? preset.materialShortLabel : serviceName.split(' ')[0]} ·{' '}
                    {preset.isAlwaysFullSet
                      ? 'Mi Mới'
                      : (isComboLive ? quickServiceType : booking?.serviceType) === 'Retain'
                        ? 'Dặm'
                        : 'Mi Mới'}
                    )
                  </span>
                  <span className="text-blue-600 font-black">+{activePointsBreakdown.upperSetPoints} pts</span>
                </div>
                <div className="text-[10px] text-neutral-600 font-medium">
                  {activePointsBreakdown.upperSetBreakdownLabel}
                </div>
              </div>

              {activePointsBreakdown.serviceSetsCount === 2 && (
                <div className="bg-white rounded-xl p-2 border border-purple-200 space-y-0.5 text-[10.5px]">
                  <div className="flex items-center justify-between font-extrabold text-purple-950">
                    <span>Bộ 2 · Mi Dưới (Under Mink · {quickUnderServiceType === 'Retain' ? 'Dặm' : 'Mi Mới'})</span>
                    <span className="text-purple-700 font-black">+{activePointsBreakdown.underSetPoints} pts</span>
                  </div>
                  <div className="text-[10px] text-purple-700 font-medium">
                    {activePointsBreakdown.underSetBreakdownLabel} (Độc lập vòng xoay)
                  </div>
                </div>
              )}

              <div className="text-[10px] text-blue-900 font-medium leading-relaxed pt-0.5">
                💡 Khi khách nối cả <strong>Mi Trên + Mi Dưới</strong>, Chuyên Viên được nhận đủ{' '}
                <strong>2 Bộ Mi độc lập</strong> vào tổng số bộ trong tháng để tính thưởng lũy tiến bậc hai.
              </div>
            </div>

            {/* 2. Bảng quy chuẩn 6 thành phần điểm CV Xoay */}
            <div className="space-y-1.5 text-[10.5px] tabular-nums">
              <div className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">
                BẢNG ĐIỂM CHUẨN 6 THÀNH PHẦN (TAB CV XOAY)
              </div>

              <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-200/80 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-neutral-800 shrink-0">1. Dòng mi (Class):</span>
                  <span className="text-right text-neutral-600 font-medium">
                    Classic <strong>+0</strong> · Volume/Ultra/Hyper <strong>+3</strong> · Mink/Under{' '}
                    <strong>+5</strong> · Ivylight <strong>+20</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-neutral-200/60">
                  <span className="font-bold text-neutral-800 shrink-0">2. Kỹ thuật Fan (Fan):</span>
                  <span className="text-right text-neutral-600 font-medium">
                    1D/2D/Under <strong>+0</strong> · 2X/3D/3X/3L <strong>+1</strong> · 4D/4X/4L <strong>+2</strong> ·
                    5D/5X/5L <strong>+3</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-neutral-200/60">
                  <span className="font-bold text-neutral-800 shrink-0">3. Loại ca (Type):</span>
                  <span className="text-right text-neutral-600 font-medium">
                    Dặm (Retain) <strong>+0</strong> · Nối Mới (Normal) <strong>+7</strong> · Sửa mi (FAL){' '}
                    <strong>+15</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-neutral-200/60">
                  <span className="font-bold text-neutral-800 shrink-0">4. Số lượng (Lash):</span>
                  <span className="text-right text-neutral-600 font-medium">
                    ≤50 (gồm Mi Dưới) <strong>+17</strong> · 60 <strong>+20</strong> · 70 <strong>+23</strong> · 80{' '}
                    <strong>+26</strong> · 90 <strong>+29</strong> · 100 <strong>+32</strong> · 110 <strong>+35</strong>{' '}
                    · 120 <strong>+38</strong> · 130+ <strong>+41</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-neutral-200/60">
                  <span className="font-bold text-neutral-800 shrink-0">5. Dáng mi (Design):</span>
                  <span className="text-right text-neutral-600 font-medium">
                    Natural <strong>+0</strong> · Kim-K / Katun <strong>+5</strong> · Wing / Cat Eye <strong>+6</strong>{' '}
                    · Doll <strong>+7</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-neutral-200/60">
                  <span className="font-bold text-neutral-800 shrink-0">6. Phối màu (Color):</span>
                  <span className="text-right text-neutral-600 font-medium">
                    Đen <strong>+0</strong> · Nâu / Xanh / Tím / Phối màu <strong>+5</strong>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRotationInfoOpen(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-extrabold text-[12px] cursor-pointer transition-all"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Lash History Modal / Bottom Sheet */}
      <Screen02LashHistorySheet
        item={selectedLashHistory}
        isOpen={isLashHistoryOpen}
        onClose={() => setIsLashHistoryOpen(false)}
        onApplySpecs={() => setIsLashHistoryOpen(false)}
      />
    </div>
  );
}
