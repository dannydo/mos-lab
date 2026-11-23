'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCustomerBirthdayThisMonthStatus,
  hasCompleteNaturalLashSet,
  resolveActiveBookingComboWallets,
} from '@mos-lab/shared';
import { BookingItem, KNOWN_STAFF_AVATARS, LashHistoryItem, resolveStaffAvatarUrl } from '../../../state/mockData';
import type { ActiveActorProfile } from '../../../state/useIosAppState';
import {
  calculateLashPricingAndCvPoints,
  resolveDisplayServiceName,
  resolveQuickCheckInComboPreset,
  UNDER_MINK_PREP_SPEC,
} from '../LashMaterialConstraintMatrix';
import { resolveNaturalLashCountLabel } from '../NaturalLashAssessmentData';
import type { PendingComboNewConfirmationState, PendingOverrideState } from './CheckInModals';
import type { PendingReferral } from './NewCustomerReferralModal';
import type { Screen02CheckInProfileProps } from './Screen02CheckInProfile.types';

export interface UseCheckInProfileStateParams {
  booking: BookingItem;
  actor?: ActiveActorProfile;
  onCheckIn: Screen02CheckInProfileProps['onCheckIn'];
  onQuickCheckIn?: Screen02CheckInProfileProps['onQuickCheckIn'];
}

export function useCheckInProfileState({ booking, actor, onCheckIn, onQuickCheckIn }: UseCheckInProfileStateParams) {
  const customerName = (booking?.customerName || 'Khách Hàng').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  const customerPhone = (booking?.customerPhone || '0901.xxx.xxx').replace(/\*+\s*/g, '').trim();
  const birthdayStatus = getCustomerBirthdayThisMonthStatus(booking?.customerDateOfBirth);
  const serviceName = resolveDisplayServiceName(booking);
  const hasAssignedStaff = Boolean(
    booking?.assignedStaffName &&
    booking.assignedStaffName !== 'Chưa phân công' &&
    booking.assignedStaffName !== 'Chờ phân công (Đầu tua)'
  );
  const actorName = actor?.name || 'Khanh Cao';
  const assignedStaff = hasAssignedStaff
    ? booking!.assignedStaffName!
    : actor?.tier === 'CVL'
      ? actorName
      : 'Chờ phân công';
  const bookerName = booking?.bookerName || 'Hệ thống';
  const visits = booking?.customerVisits || 1;
  const isFirstTimeClient =
    visits <= 1 ||
    Boolean(booking?.attributes?.lashHealth?.includes('Virgin')) ||
    booking?.attributes?.isNewClientDiagnosticDone === false;
  const requiresNaturalLashCheck = !hasCompleteNaturalLashSet(booking);
  const customerNote = booking?.customerNote || 'Không có ghi chú đặc biệt';
  const resolvedWallets = useMemo(() => resolveActiveBookingComboWallets(booking), [booking]);
  const isComboLive = resolvedWallets.isRedeemingUpperToday;
  const remainingSessions = resolvedWallets.effectiveComboLiveStatus.remainingSessions ?? 0;

  // CVL (Khanh Cao / Thảo Ly): Checkin by và Lashed by là 1 người tự chủ đón tiếp & làm mi cho khách
  const isCvlStaff = booking?.checkInStaffName
    ? booking?.checkInStaffTier === 'CVL' ||
      booking?.checkInStaffId === 13783 ||
      booking?.checkInStaffId === 46272 ||
      booking.checkInStaffName.toLowerCase().includes('khanh') ||
      booking.checkInStaffName.toLowerCase().includes('thảo ly')
    : actor?.tier === 'CVL';

  const defaultCvlAvatar =
    actor?.avatar ||
    KNOWN_STAFF_AVATARS[String(actor?.staffId || 13783)] ||
    'https://cdn.wingslashes.com/uploads/user/avatar/400/thumbnail/15400.png';

  const checkInStaffName = isCvlStaff ? assignedStaff : booking?.checkInStaffName || actorName;
  const checkInStaffAvatar =
    resolveStaffAvatarUrl(
      isCvlStaff ? booking?.checkInStaffAvatar || booking?.assignedStaffAvatar : booking?.checkInStaffAvatar,
      isCvlStaff ? booking?.assignedStaffId || actor?.staffId || 13783 : booking?.checkInStaffId || actor?.staffId,
      checkInStaffName
    ) || (isCvlStaff ? defaultCvlAvatar : actor?.avatar);

  const assignedStaffAvatar =
    resolveStaffAvatarUrl(
      booking?.assignedStaffAvatar,
      booking?.assignedStaffId || actor?.staffId || 13783,
      assignedStaff
    ) || (isCvlStaff ? defaultCvlAvatar : undefined);

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
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  const isNewCustomer = visits <= 1 && !booking?.comboLiveStatus?.isComboLive;
  const canManageReferral =
    actor?.tier === 'CVL' || actor?.tier === 'CVLL' || actor?.tier === 'CC' || actor?.tier === 'ADMIN';
  const [referralModalOpen, setReferralModalOpen] = useState<boolean>(false);
  const [pendingReferral, setPendingReferral] = useState<PendingReferral | null>(null);

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

    if (targetType === preset.expectedServiceType) {
      setQuickServiceType(targetType);
      setIsOverridden(false);
      setOverrideReason('');
      return;
    }

    if (targetType === 'Normal' && isComboLive && !preset.hasNormalRemaining) {
      const reasons = [
        'Quy đổi 2 lần Dặm trong gói thành 1 lần Nối Mới (Quản lý duyệt)',
        'Khách bù chênh lệch nâng cấp từ suất Dặm lên Nối Mới',
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

    if (targetType === 'Retain' && isComboLive && !preset.hasRetainRemaining) {
      const reasons = [
        'Khách đồng ý dùng 1 lần Nối Mới trong gói để thực hiện Dặm',
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

    if (targetType === 'Retain' && !preset.isWithinRetainWindow) {
      const daysText =
        preset.daysSinceLastVisit !== null
          ? `lần cuối ngày ${preset.lastVisitDate} (${preset.daysSinceLastVisit} ngày trước — quá hạn ${preset.retainDaysLimit} ngày)`
          : `chưa có lịch sử trong ${preset.retainDaysLimit} ngày`;
      const reasons = [
        'Quản lý duyệt hỗ trợ trễ chu kỳ (≤ 30 ngày) do khách bận/công tác',
        'Khách VIP xin gia hạn tính dặm 1 lần duy nhất',
        'Bảo hành / Hỗ trợ đặc biệt theo duyệt Cửa hàng trưởng',
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

    if (targetType === 'Normal' && !isComboLive && preset.isWithinRetainWindow) {
      const reasons = [
        'Mi cũ rụng > 70% không đủ điều kiện dặm — khách đồng ý tính Nối Mới',
        'Khách yêu cầu tháo làm bộ mới hoàn toàn và tính suất Nối Mới',
        'Khách đổi sang form / dòng mi mới không áp dụng giá dặm',
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
      materialId: booking?.attributes?.material || 'Classic 1D',
      countStr: booking?.attributes?.count || '90 sợi',
      volumeStr: booking?.attributes?.volume || '1D',
      designId: booking?.attributes?.style || 'Natural',
      colorStr: booking?.attributes?.color,
      originalBookedPrice: booking?.servicePrice || 550000,
      serviceType: initialServiceType,
      hasUnderMink: Boolean(booking?.attributes?.hasUnderMink),
      underMinkServiceType: booking?.attributes?.underMinkServiceType,
      hasUnderMinkCombo: resolvedWallets.isRedeemingUnderToday,
    });
  }, [
    isComboLive,
    preset,
    booking,
    quickServiceType,
    quickHasUnderMink,
    quickUnderServiceType,
    resolvedWallets.isRedeemingUnderToday,
  ]);

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
        isNewClientDiagnosticDone: true,
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

  return {
    customerName,
    customerPhone,
    birthdayStatus,
    serviceName,
    assignedStaff,
    bookerName,
    visits,
    isFirstTimeClient,
    requiresNaturalLashCheck,
    customerNote,
    resolvedWallets,
    isComboLive,
    remainingSessions,
    isCvlStaff,
    checkInStaffName,
    checkInStaffAvatar,
    assignedStaffAvatar,
    preset,
    quickServiceType,
    setQuickServiceType,
    quickHasUnderMink,
    setQuickHasUnderMink,
    quickUnderServiceType,
    setQuickUnderServiceType,
    quickUnderCurl,
    setQuickUnderCurl,
    quickUnderLength,
    setQuickUnderLength,
    quickUnderCount,
    setQuickUnderCount,
    isOverridden,
    setIsOverridden,
    overrideReason,
    setOverrideReason,
    pendingOverride,
    setPendingOverride,
    pendingComboNewConfirmation,
    setPendingComboNewConfirmation,
    selectedOverrideReasonDraft,
    setSelectedOverrideReasonDraft,
    isRotationExpanded,
    setIsRotationExpanded,
    isRotationInfoOpen,
    setIsRotationInfoOpen,
    selectedLashHistory,
    isLashHistoryOpen,
    setIsLashHistoryOpen,
    isWalletModalOpen,
    setIsWalletModalOpen,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    isNewCustomer,
    canManageReferral,
    referralModalOpen,
    setReferralModalOpen,
    pendingReferral,
    setPendingReferral,
    handleOpenLashHistory,
    handleRequestQuickServiceTypeChange,
    isBookedDirectly,
    activePointsBreakdown,
    handleExecuteQuickCheckIn,
  };
}
