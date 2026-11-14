'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  isAdminOrSuperAdminRole,
  resolveLockedIosRoleForUser,
  maskPhoneNumber,
  canViewUnmaskedCustomerPhone,
} from '@mos-lab/shared';
import { BookingItem, INITIAL_BOOKINGS, filterBookingsForCvlScope, resolveCustomerBookingTab } from './mockData';
import { setActiveServicingBookingId } from './offlineSync';
import { IOS_AVAILABLE_BRANCHES, EMPTY_LIVE_BOOKING_PLACEHOLDER, resolveActorProfile } from './iosActorProfile';
import type {
  IosUserRole,
  BookingScopeMode,
  IosBranchConfig,
  SegmentCounts,
  StaffMonthlyStats,
  ActiveActorProfile,
} from './iosActorProfile';
import { useIosBookingsSync } from './useIosBookingsSync';
import { useIosConsultationAndCheckIn } from './useIosConsultationAndCheckIn';
import { useIosServicingProgress } from './useIosServicingProgress';
import {
  useIosBillingCheckout,
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
} from './useIosBillingCheckout';
import type { ActorTipBreakdown } from './useIosBillingCheckout';

export {
  IOS_AVAILABLE_BRANCHES,
  resolveActorProfile,
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
};

export type {
  IosUserRole,
  BookingScopeMode,
  IosBranchConfig,
  SegmentCounts,
  StaffMonthlyStats,
  ActiveActorProfile,
  ActorTipBreakdown,
};

export function useIosAppState(
  initialStep: number = 1,
  enabled: boolean = true,
  initialRole: IosUserRole = 'CVL',
  initialBookingId?: number,
  isDemoMode: boolean = false
) {
  const [bookings, setBookings] = useState<BookingItem[]>(() => (isDemoMode ? INITIAL_BOOKINGS : []));
  const [activeBookingId, setActiveBookingId] = useState<number>(initialBookingId ?? (isDemoMode ? 336695 : 0));
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [consultationReturnStep, setConsultationReturnStep] = useState<number | null>(null);

  const handleOpenConsultation = useCallback(
    (returnStep?: number) => {
      setConsultationReturnStep(returnStep ?? currentStep);
      setCurrentStep(3);
    },
    [currentStep]
  );

  const [role, setRoleState] = useState<IosUserRole>(initialRole);
  const [scopeModeState, setScopeModeState] = useState<BookingScopeMode>(
    initialRole === 'CVL' ? 'MY_CUSTOMERS' : 'STORE_ALL'
  );
  const [deviceMode, setDeviceMode] = useState<'iphone' | 'ipad' | 'fullscreen'>('iphone');
  const [activeTab, setActiveTab] = useState<string>('booking');

  const activeBookingIdRef = useRef<number>(activeBookingId);
  activeBookingIdRef.current = activeBookingId;

  const [bookingSegment, setBookingSegment] = useState<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>('INCOMING');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // Quản lý ngày xem lịch hẹn (0 = Hôm nay, -1 = Hôm qua, -2 = 2 ngày trước, ...)
  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0);

  // Quản lý chi nhánh được chọn (mặc định Đề Thám storeId=6, hoặc Estella Place storeId=16)
  const [selectedStoreId, setSelectedStoreIdState] = useState<number>(6);

  const prevDemoModeRef = useRef<boolean>(isDemoMode);
  useEffect(() => {
    if (prevDemoModeRef.current === isDemoMode) return;
    prevDemoModeRef.current = isDemoMode;
    if (isDemoMode) {
      setBookings((prev) => (prev.length > 0 ? prev : INITIAL_BOOKINGS));
      setActiveBookingId((prev) => prev || 336695);
    } else {
      setBookings([]);
      setActiveBookingId(initialBookingId ?? 0);
    }
  }, [isDemoMode, initialBookingId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('mos_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        setLoggedInUser(parsed);
        const userIsAdmin = isAdminOrSuperAdminRole(parsed?.role);
        const lockedRole = resolveLockedIosRoleForUser(parsed?.role, initialRole);
        setRoleState(lockedRole);
        setScopeModeState(userIsAdmin ? 'STORE_ALL' : lockedRole === 'CVL' ? 'MY_CUSTOMERS' : 'STORE_ALL');

        // Khôi phục chi nhánh Admin đã chọn gần nhất từ localStorage
        if (userIsAdmin) {
          const savedStore = window.localStorage.getItem('mos_ios_selected_store_id');
          if (savedStore && (Number(savedStore) === 6 || Number(savedStore) === 16)) {
            setSelectedStoreIdState(Number(savedStore));
          }
        }
      }
    } catch {
      // ignore
    }
  }, [initialRole]);

  const isAdmin = Boolean(
    loggedInUser
      ? isAdminOrSuperAdminRole(loggedInUser?.role)
      : typeof window !== 'undefined' &&
          process.env.NODE_ENV !== 'production' &&
          (window.location.search.includes('admin=1') || window.location.search.includes('role=admin'))
  );

  const canSwitchRole = Boolean(isAdmin);
  const actor = resolveActorProfile(role, loggedInUser);

  // Invariant (UI-010 & Chuyên Viên / CC Salon Anchor):
  // - Chuyên Viên (CV/CVL/CVLL) và CC không phải Admin luôn thuộc về chi nhánh gốc đang làm việc của mình.
  // - Chỉ Admin/Super Admin ở vai trò không phải Chuyên Viên (CC/STORE/ADMIN) mới xem/đổi chi nhánh tùy chọn.
  const isTechnicianRole = role === 'CVL' || role === 'CVLL' || role === 'CV';
  const ccAssignedStoreId =
    !isAdmin && role === 'CC' ? Number(loggedInUser?.clientStoreId || loggedInUser?.storeId || 0) : 0;
  const effectiveStoreId = isTechnicianRole
    ? actor.storeId || 6
    : ccAssignedStoreId > 0
      ? ccAssignedStoreId
      : selectedStoreId;

  const currentBranch = useMemo(() => {
    return IOS_AVAILABLE_BRANCHES.find((b) => b.id === effectiveStoreId) || IOS_AVAILABLE_BRANCHES[0];
  }, [effectiveStoreId]);

  // Invariant (Kinh Thánh mOS Điều răn UI-010):
  // - CVL luôn bị khóa cứng ở chế độ MY_CUSTOMERS (1 khách kế tiếp đầu tua + khách book của mình).
  // - CC & STORE luôn xem toàn bộ sảnh chi nhánh (STORE_ALL), kể cả khi Admin đang kiểm thử dưới góc nhìn CC.
  const scopeMode: BookingScopeMode =
    role === 'CVL' ? 'MY_CUSTOMERS' : role === 'CC' || role === 'STORE' ? 'STORE_ALL' : scopeModeState;

  const setScopeMode = useCallback(
    (nextScope: BookingScopeMode) => {
      if (role === 'CVL') {
        setScopeModeState('MY_CUSTOMERS');
        return;
      }
      if (role === 'CC' || role === 'STORE') {
        setScopeModeState('STORE_ALL');
        return;
      }
      setScopeModeState(nextScope);
    },
    [role]
  );

  const setRole = useCallback(
    (nextRole: IosUserRole) => {
      const effectiveRole =
        loggedInUser && !isAdminOrSuperAdminRole(loggedInUser?.role)
          ? resolveLockedIosRoleForUser(loggedInUser?.role, nextRole)
          : nextRole;
      setRoleState(effectiveRole);
      if (effectiveRole === 'CVL') {
        setScopeModeState('MY_CUSTOMERS');
      } else if (effectiveRole === 'CVLL' || effectiveRole === 'CC' || effectiveRole === 'STORE') {
        setScopeModeState('STORE_ALL');
      }
    },
    [loggedInUser]
  );

  const activeServicingBooking = useMemo(() => {
    if (!['CVL', 'CVLL', 'CV'].includes(role)) return null;
    return (
      bookings.find((b) => {
        const belongsToActor =
          b.assignedStaffId === actor.staffId ||
          b.checkInStaffId === actor.staffId ||
          b.checkOutStaffId === actor.staffId;
        if (!belongsToActor) return false;
        if (
          b.status === 'DONE' ||
          b.status === 'CANCELLED' ||
          Boolean(b.billing?.completedAt) ||
          Boolean(b.progress?.completedAt)
        ) {
          return false;
        }
        return b.status === 'SERVICING' || (b.status === 'CHECKED_IN' && Boolean(b.progress?.startedAt));
      }) || null
    );
  }, [bookings, role, actor.staffId]);

  const visibleBookings = useMemo(() => {
    const shouldFilterCvl = role === 'CVL' || (role !== 'CC' && role !== 'STORE' && scopeMode === 'MY_CUSTOMERS');
    const list = shouldFilterCvl
      ? filterBookingsForCvlScope(bookings, actor.staffId, { isToday: selectedDateOffset === 0 })
      : bookings;

    return list.map((b) => {
      const tab = resolveCustomerBookingTab(b, activeServicingBooking?.id);
      const canViewFull = isAdmin || canViewUnmaskedCustomerPhone(role);
      const rawMasked = !canViewFull ? maskPhoneNumber(b.customerPhone) : b.customerPhone;
      const maskedPhone = rawMasked ? rawMasked.replace(/\*+\s*/g, '').trim() : '';

      if (tab === 'DONE' && b.status !== 'DONE') {
        return {
          ...b,
          customerPhone: maskedPhone,
          status: 'DONE' as const,
        };
      }
      if (tab === 'SERVICING' && b.status !== 'SERVICING') {
        return {
          ...b,
          customerPhone: maskedPhone,
          status: 'SERVICING' as const,
        };
      }
      return {
        ...b,
        customerPhone: maskedPhone,
      };
    });
  }, [bookings, role, scopeMode, actor.staffId, activeServicingBooking, isAdmin, selectedDateOffset]);

  const counts: SegmentCounts = useMemo(() => {
    let incoming = 0;
    let servicing = 0;
    let done = 0;
    let cancel = 0;
    for (const b of visibleBookings) {
      const tab = resolveCustomerBookingTab(b, activeServicingBooking?.id);
      if (tab === 'INCOMING') incoming++;
      else if (tab === 'SERVICING') servicing++;
      else if (tab === 'DONE') done++;
      else if (tab === 'CANCEL') cancel++;
    }
    return { incoming, servicing, done, cancel };
  }, [visibleBookings, activeServicingBooking]);

  const activeBooking =
    visibleBookings.find((b) => Number(b.id) === Number(activeBookingId)) ||
    bookings.find((b) => Number(b.id) === Number(activeBookingId)) ||
    (activeServicingBooking ? bookings.find((b) => Number(b.id) === Number(activeServicingBooking.id)) : null) ||
    visibleBookings[0] ||
    bookings[0] ||
    (isDemoMode ? INITIAL_BOOKINGS[0] : EMPTY_LIVE_BOOKING_PLACEHOLDER);

  const updateActiveBooking = useCallback(
    (updater: (prev: BookingItem) => BookingItem) => {
      setBookings((prev) => prev.map((b) => (Number(b.id) === Number(activeBookingId) ? updater(b) : b)));
    },
    [activeBookingId]
  );

  const {
    totalStoreCount,
    staffStats,
    isRefreshing,
    lastRefreshedAt,
    isLiveDb,
    refreshDb,
    postAction,
    setSelectedStoreId,
    handleDateOffsetChange,
    handleRevertToIncoming,
  } = useIosBookingsSync({
    enabled,
    isDemoMode,
    isAdmin,
    role,
    isTechnicianRole,
    effectiveStoreId,
    scopeMode,
    setScopeModeState,
    setSelectedStoreIdState,
    actor,
    activeBookingId,
    setActiveBookingId,
    activeBookingIdRef,
    setCurrentStep,
    setActiveTab,
    bookingSegment,
    setBookingSegment,
    selectedDateOffset,
    setSelectedDateOffset,
    setBookings,
  });

  const {
    handleUpdateCustomerAvatar,
    handleCheckIn,
    handleSaveConsultation,
    handleAutoSaveConsultationDraft,
    handleAssignStaff,
    handleTransferToCv,
  } = useIosConsultationAndCheckIn({
    role,
    actor,
    bookings,
    setBookings,
    activeBooking,
    activeBookingId,
    setActiveBookingId,
    activeBookingIdRef,
    updateActiveBooking,
    postAction,
    setCurrentStep,
    setBookingSegment,
    consultationReturnStep,
    setConsultationReturnStep,
  });

  const {
    handleResumeServicing,
    handleCvStartTask,
    handleAutoSavePhoto,
    handleSaveBeforePhoto,
    handleSaveCleanedPhoto,
    handleToggleTimer,
    handleFinishTimer,
    handleSaveAfterPhoto,
    handleBackToAfterPhoto,
    handleCompleteSurvey,
  } = useIosServicingProgress({
    bookings,
    activeBooking,
    activeBookingId,
    setActiveBookingId,
    activeServicingBooking,
    updateActiveBooking,
    postAction,
    setCurrentStep,
    setActiveTab,
  });

  const { handleGoToBilling, handleSavePromotion, handleChoosePaymentMethod, handleRecordTip, handleFinishOrder } =
    useIosBillingCheckout({
      activeBookingId,
      actor,
      cvPlusRules: staffStats?.cvPlusRules,
      updateActiveBooking,
      postAction,
      refreshDb,
      setCurrentStep,
      setBookingSegment,
    });

  return {
    bookings: visibleBookings,
    totalStoreBookingsCount: totalStoreCount ?? bookings.length,
    activeBooking,
    activeBookingId,
    setActiveBookingId,
    activeServicingBooking,
    setActiveServicingBookingId,
    handleResumeServicing,
    currentStep,
    setCurrentStep,
    role,
    setRole,
    canSwitchRole,
    isAdmin,
    actor,
    scopeMode,
    setScopeMode,
    deviceMode,
    setDeviceMode,
    activeTab,
    setActiveTab,
    bookingSegment,
    setBookingSegment,
    isSettingsOpen,
    setIsSettingsOpen,
    counts,
    staffStats,
    isRefreshing,
    lastRefreshedAt,
    isLiveDb,
    isDemoMode,
    refreshDb,
    handleOpenConsultation,
    consultationReturnStep,
    handleCheckIn,
    handleSaveConsultation,
    handleAssignStaff,
    handleTransferToCv,
    handleCvStartTask,
    handleAutoSavePhoto,
    handleSaveBeforePhoto,
    handleSaveCleanedPhoto,
    handleToggleTimer,
    handleFinishTimer,
    handleSaveAfterPhoto,
    handleBackToAfterPhoto,
    handleCompleteSurvey,
    handleGoToBilling,
    handleSavePromotion,
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
    handleRevertToIncoming,
    selectedDateOffset,
    handleDateOffsetChange,
    selectedStoreId: effectiveStoreId,
    setSelectedStoreId,
    currentBranch,
    availableBranches: IOS_AVAILABLE_BRANCHES,
    handleUpdateCustomerAvatar,
    handleAutoSaveConsultationDraft,
  };
}
