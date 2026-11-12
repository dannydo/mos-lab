'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem, LashHistoryItem, resolveStaffAvatarUrl, KNOWN_STAFF_AVATARS } from '../../state/mockData';
import { Screen02LashHistorySheet } from './Screen02LashHistorySheet';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { CvFeather2Badge, CvFeather1Badge } from '../ui-kit/CvFeatherLabels';
import {
  calculateLashPricingAndCvPoints,
  resolveQuickCheckInComboPreset,
  resolveDisplayServiceName,
  resolveCustomerTypeMeta,
  UNDER_MINK_PREP_SPEC,
} from './LashMaterialConstraintMatrix';
import { resolveNaturalLashCountLabel } from './NaturalLashAssessmentData';
import { CustomerAvatarPicker } from '../ui-kit/CustomerAvatarPicker';
import { QuickCheckInComboCard } from './checkin/QuickCheckInComboCard';
import { CheckInStaffAndProfileCards } from './checkin/CheckInStaffAndProfileCards';
import { CheckInBottomActionBar } from './checkin/CheckInBottomActionBar';
import { CheckInModals, PendingComboNewConfirmationState, PendingOverrideState } from './checkin/CheckInModals';

interface Screen02CheckInProfileProps {
  booking: BookingItem;
  actor?: ActiveActorProfile;
  isCheckInLocked?: boolean;
  activeServicingCustomerName?: string;
  onResumeServicing?: () => void;
  onBack: () => void;
  onCheckIn: (bookingId?: number) => void;
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
      naturalLashCount?: string;
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
    } | null,
    targetBookingId?: number
  ) => void;
  onUpdateAvatar?: (avatarUrl: string, targetBookingId?: number) => Promise<any> | void;
}

export function Screen02CheckInProfile({
  booking,
  actor,
  isCheckInLocked = false,
  activeServicingCustomerName,
  onResumeServicing,
  onBack,
  onCheckIn,
  onQuickCheckIn,
  onUpdateAvatar,
}: Screen02CheckInProfileProps) {
  const customerName = (booking?.customerName || 'Khách Hàng').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  const customerPhone = (booking?.customerPhone || '0901.xxx.xxx').replace(/\*+\s*/g, '').trim();
  const serviceName = resolveDisplayServiceName(booking);
  const assignedStaff = booking?.assignedStaffName || 'Thảo Ly';
  const bookerName = booking?.bookerName || 'Hệ thống';
  const visits = booking?.customerVisits || 1;
  const isFirstTimeClient =
    visits <= 1 ||
    Boolean(booking?.attributes?.lashHealth?.includes('Virgin')) ||
    booking?.attributes?.isNewClientDiagnosticDone === false;
  const requiresNaturalLashCheck = isFirstTimeClient && booking?.attributes?.isNewClientDiagnosticDone !== true;
  const customerNote = booking?.customerNote || 'Không có ghi chú đặc biệt';
  const isComboLive = Boolean(booking?.comboLiveStatus?.isComboLive);
  const remainingSessions = booking?.comboLiveStatus?.remainingSessions ?? 0;
  const actorName = actor?.name || 'Khanh Cao';
  const actorTierLabel =
    actor?.tier === 'CVLL' ? <CvFeather2Badge /> : actor?.tier === 'CVL' ? <CvFeather1Badge /> : 'CC';

  // CVL (Khanh Cao / Thảo Ly): Checkin by và Lashed by là 1 người tự chủ đón tiếp & làm mi cho khách
  const isCvlStaff =
    assignedStaff.toLowerCase().includes('khanh') ||
    assignedStaff.toLowerCase().includes('thảo ly') ||
    booking?.assignedStaffId === 13783 ||
    booking?.assignedStaffId === 46272 ||
    actor?.tier === 'CVL' ||
    actorName.toLowerCase().includes('khanh') ||
    actorName.toLowerCase().includes('thảo ly');

  const defaultCvlAvatar =
    actor?.avatar ||
    KNOWN_STAFF_AVATARS[String(actor?.staffId || 13783)] ||
    'https://cdn.wingslashes.com/uploads/user/avatar/400/thumbnail/15400.png';

  const checkInStaffName = isCvlStaff ? assignedStaff : booking?.checkInStaffName || actorName;
  const checkInStaffAvatar =
    resolveStaffAvatarUrl(
      isCvlStaff ? booking?.checkInStaffAvatar || booking?.assignedStaffAvatar : booking?.checkInStaffAvatar,
      isCvlStaff ? booking?.assignedStaffId || actor?.staffId || 13783 : booking?.checkInStaffId,
      checkInStaffName
    ) || (isCvlStaff ? defaultCvlAvatar : undefined);

  const assignedStaffAvatar =
    resolveStaffAvatarUrl(
      booking?.assignedStaffAvatar,
      booking?.assignedStaffId || actor?.staffId || 13783,
      assignedStaff
    ) || (isCvlStaff ? defaultCvlAvatar : undefined);

  // Quy tắc màu viền avatar (Avatar Ring Color Invariant theo chỉ đạo Danny):
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
  const [pendingOverride, setPendingOverride] = useState<PendingOverrideState | null>(null);
  const [pendingComboNewConfirmation, setPendingComboNewConfirmation] =
    useState<PendingComboNewConfirmationState | null>(null);
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

    // 1. Khách có Gói Combo và muốn NỐI MỚI (dù đi <= 25 ngày) và trong gói CÒN LẦN NỐI MỚI (normalRemaining > 0)
    if (targetType === 'Normal' && isComboLive && preset.hasNormalRemaining) {
      setPendingComboNewConfirmation({
        title: 'Xác Nhận Nối Mới (Gói Combo)',
        remainingSessions: preset.normalRemaining,
        onConfirm: () => {
          setQuickServiceType('Normal');
          setIsOverridden(false);
          setOverrideReason(
            `[Khách chọn Nối Mới Combo: Trừ 1 lần Mới không hoàn phí (${preset.normalRemaining - 1} lần còn lại) — Nhân viên bắt buộc gỡ toàn bộ mi cũ và nối mới 100%]`
          );
          setPendingComboNewConfirmation(null);
        },
      });
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
    if (targetType === 'Normal' && isComboLive && !preset.hasNormalRemaining) {
      const reasons = [
        `Quy đổi 2 lần Dặm trong gói thành 1 lần Nối Mới (Quản lý duyệt)`,
        `Khách bù chênh lệch nâng cấp từ suất Dặm lên Nối Mới`,
        `Khách thanh toán lẻ buổi Nối Mới, giữ nguyên ${preset.retainRemaining} lần Dặm`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        title: `Gói Combo Đã Hết Lần Nối Mới (Còn ${preset.retainRemaining} Lần Dặm)`,
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
    if (targetType === 'Retain' && isComboLive && !preset.hasRetainRemaining) {
      const reasons = [
        `Khách đồng ý dùng 1 lần Nối Mới trong gói để thực hiện Dặm`,
        `Khách thanh toán lẻ buổi Dặm hôm nay, giữ nguyên ${preset.normalRemaining} lần Nối Mới`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        title: `Gói Combo Đã Hết Lần Dặm (Còn ${preset.normalRemaining} Lần Nối Mới)`,
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

    // 5. Nếu đã quá hạn (Combo > 25 ngày / Single > 21 ngày) mà CVL bấm chọn Dặm -> Cảnh báo Override
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
        title: `Cảnh Báo Override: Đã Quá ${preset.retainDaysLimit} Ngày (${isComboLive ? 'Combo' : 'Khách Lẻ'})`,
        message: isComboLive
          ? `Khách Gói Combo ghé ${daysText}. Theo quy định khách mua Combo đi trong 25 ngày luôn được tính Dặm, sau 25 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính DẶM.`
          : `Khách lẻ ghé ${daysText}. Theo quy định khách lẻ đi trong 21 ngày có Giá Dặm vô điều kiện, sau 21 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính GIÁ DẶM.`,
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

    // 6. Nếu khách lẻ đi trong hạn được hưởng Giá Dặm mà chuyển sang thu Giá Nối Mới
    if (targetType === 'Normal' && !isComboLive && preset.isWithinRetainWindow) {
      const reasons = [
        `Mi cũ rụng > 70% không đủ điều kiện dặm — khách đồng ý tính Nối Mới`,
        `Khách yêu cầu tháo làm bộ mới hoàn toàn và tính suất Nối Mới`,
        `Khách đổi sang form / dòng mi mới không áp dụng giá dặm`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        title: `Cảnh Báo Override: Đi Trong ${preset.retainDaysLimit} Ngày (Khách Lẻ)`,
        message: `Khách lẻ ghé lần cuối ngày ${preset.lastVisitDate} (${preset.daysSinceLastVisit} ngày trước ≤ 21 ngày). Theo quy định khách lẻ đi trong 21 ngày luôn có GIÁ DẶM VÔ ĐIỀU KIỆN, nhưng bạn đang chuyển sang tính GIÁ NỐI MỚI.`,
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

  // Thông số Vòng Xoay CV thực tế
  const isBookedDirectly = Boolean(booking?.assignedStaffName);

  const activePointsBreakdown = useMemo(() => {
    if (isComboLive) {
      const breakdown = calculateLashPricingAndCvPoints({
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
      return {
        ...breakdown,
        upgradePrice: 0,
      };
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
    if (requiresNaturalLashCheck || !onQuickCheckIn) {
      onCheckIn(booking?.id);
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
        eyeShape: booking?.attributes?.eyeShape,
        naturalLashLength: booking?.attributes?.naturalLashLength,
        naturalLashThickness: booking?.attributes?.naturalLashThickness,
        naturalLashDensity: booking?.attributes?.naturalLashDensity,
        naturalLashCount:
          booking?.attributes?.naturalLashCount ||
          resolveNaturalLashCountLabel(booking?.attributes?.naturalLashDensity) ||
          undefined,
        isNewClientDiagnosticDone: booking?.attributes?.isNewClientDiagnosticDone,
        lashHealth: booking?.attributes?.lashHealth,
        lashTrail: booking?.attributes?.lashTrail,
        medicalProblem: booking?.attributes?.medicalProblem,
        notes: booking?.attributes?.notes || '',
      },
      null,
      {
        skuName: activePointsBreakdown.skuName,
        skuPrice: activePointsBreakdown.skuPrice,
        upgradePrice: isComboLive ? 0 : activePointsBreakdown.upgradePrice,
        cvPoints: activePointsBreakdown.totalPoints,
        cvBreakdown: activePointsBreakdown.breakdownLabel,
        serviceType: quickServiceType,
      },
      booking?.id
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-black text-white overflow-hidden select-none relative">
      <IosNavigationBar
        title="Hồ Sơ Khách"
        onBack={onBack}
        backTitle="Lịch hẹn"
        rightAction={
          <button
            onClick={
              isComboLive && onQuickCheckIn && !requiresNaturalLashCheck
                ? handleExecuteQuickCheckIn
                : () => onCheckIn(booking?.id)
            }
            className="text-[#FFB400] font-bold text-sm py-1 px-1 active:opacity-60 cursor-pointer"
          >
            {booking?.status === 'CHECKED_IN' || booking?.status === 'SERVICING' ? 'Tiếp tục' : 'Check In'}
          </button>
        }
      />

      <div className="flex-1 min-h-0 px-3.5 py-3 space-y-3 overflow-y-auto pb-4">
        {/* Card 1: Customer Profile Header */}
        <div className="bg-[#1C1C1E] rounded-2xl p-3.5 flex items-center gap-3.5 shadow-sm border border-neutral-800 text-white">
          <CustomerAvatarPicker
            avatarUrl={booking?.customerAvatar}
            customerName={customerName}
            customerPhone={customerPhone}
            avatarRingClass={avatarRingClass}
            size={56}
            onUpdateAvatar={async (newUrl) => {
              if (onUpdateAvatar) {
                await onUpdateAvatar(newUrl, booking?.id);
              }
            }}
          />
          <div className="flex-1 min-w-0">
            {(() => {
              const typeMeta = resolveCustomerTypeMeta(booking);
              return (
                <div className="flex items-center gap-2">
                  <span className={`text-[14px] font-black select-none ${typeMeta.colorClass}`} title={typeMeta.label}>
                    {typeMeta.symbol}
                  </span>
                  <h2 className="text-[17px] font-bold text-white tracking-tight truncate">{customerName}</h2>
                  {visits >= 5 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 font-bold tracking-tight">
                      GOLD VIP
                    </span>
                  )}
                </div>
              );
            })()}
            <div className="text-[13px] text-neutral-400 font-normal mt-0.5 tabular-nums">{customerPhone}</div>
            <div className="text-[12px] text-neutral-300 font-medium mt-0.5">
              <span>
                Lần ghé: <strong className="font-bold text-white">{visits}</strong>
                {preset.daysSinceLastVisit !== null && visits > 1 && (
                  <span className="text-neutral-400 ml-1">· {preset.daysSinceLastVisit}N</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: QUICK CHECK-IN GÓI COMBO LIVE / KHÁCH LẺ */}
        <QuickCheckInComboCard
          booking={booking}
          isComboLive={isComboLive}
          remainingSessions={remainingSessions}
          preset={preset}
          quickServiceType={quickServiceType}
          quickHasUnderMink={quickHasUnderMink}
          setQuickHasUnderMink={setQuickHasUnderMink}
          quickUnderServiceType={quickUnderServiceType}
          setQuickUnderServiceType={setQuickUnderServiceType}
          quickUnderCurl={quickUnderCurl}
          setQuickUnderCurl={setQuickUnderCurl}
          quickUnderLength={quickUnderLength}
          setQuickUnderLength={setQuickUnderLength}
          quickUnderCount={quickUnderCount}
          setQuickUnderCount={setQuickUnderCount}
          isOverridden={isOverridden}
          overrideReason={overrideReason}
          onResetOverride={() => {
            setQuickServiceType(preset.expectedServiceType);
            setIsOverridden(false);
            setOverrideReason('');
          }}
          onRequestServiceTypeChange={handleRequestQuickServiceTypeChange}
        />

        {/* Cards 3, 3.5, Technical Notes, Natural Lash Profile & Lash History */}
        <CheckInStaffAndProfileCards
          booking={booking}
          bookerName={bookerName}
          checkInStaffName={checkInStaffName}
          checkInStaffAvatar={checkInStaffAvatar}
          assignedStaff={assignedStaff}
          assignedStaffAvatar={assignedStaffAvatar}
          isCvlStaff={isCvlStaff}
          actorTierLabel={actorTierLabel}
          isRotationExpanded={isRotationExpanded}
          setIsRotationExpanded={setIsRotationExpanded}
          setIsRotationInfoOpen={setIsRotationInfoOpen}
          activePointsBreakdown={activePointsBreakdown}
          isComboLive={isComboLive}
          preset={preset}
          serviceName={serviceName}
          quickServiceType={quickServiceType}
          quickUnderServiceType={quickUnderServiceType}
          isBookedDirectly={isBookedDirectly}
          customerNote={customerNote}
          visits={visits}
          isFirstTimeClient={isFirstTimeClient}
          onOpenLashHistory={handleOpenLashHistory}
        />
      </div>

      {/* Sticky Bottom Action Bar (Native iOS Floating Dock) */}
      <CheckInBottomActionBar
        booking={booking}
        isCheckInLocked={isCheckInLocked}
        activeServicingCustomerName={activeServicingCustomerName}
        onResumeServicing={onResumeServicing}
        isComboLive={isComboLive}
        hasQuickCheckIn={Boolean(onQuickCheckIn)}
        requiresNaturalLashCheck={requiresNaturalLashCheck}
        onExecuteQuickCheckIn={handleExecuteQuickCheckIn}
        onCheckIn={onCheckIn}
      />

      <CheckInModals
        pendingOverride={pendingOverride}
        setPendingOverride={setPendingOverride}
        selectedOverrideReasonDraft={selectedOverrideReasonDraft}
        setSelectedOverrideReasonDraft={setSelectedOverrideReasonDraft}
        pendingComboNewConfirmation={pendingComboNewConfirmation}
        setPendingComboNewConfirmation={setPendingComboNewConfirmation}
        isRotationInfoOpen={isRotationInfoOpen}
        setIsRotationInfoOpen={setIsRotationInfoOpen}
        activePointsBreakdown={activePointsBreakdown}
        isComboLive={isComboLive}
        preset={preset}
        serviceName={serviceName}
        quickServiceType={quickServiceType}
        quickUnderServiceType={quickUnderServiceType}
        booking={booking}
      />

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
