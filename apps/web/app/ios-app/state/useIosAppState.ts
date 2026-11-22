'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiClient } from '~/lib/api-client';
import {
  isAdminOrSuperAdminRole,
  resolveAssignedSalonStoreId,
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
import type { PendingReferral } from '../components/screens/checkin/NewCustomerReferralModal';
import { useIosSimulationMode, IOS_SIM_MODE_SESSION_KEY } from './useIosSimulationMode';

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
  isDemoMode: boolean = false,
  initialSimMode: boolean = false
) {
  const [bookings, setBookings] = useState<BookingItem[]>(() => (isDemoMode ? INITIAL_BOOKINGS : []));
  const [activeBookingId, setActiveBookingId] = useState<number>(initialBookingId ?? (isDemoMode ? 336695 : 0));
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(() => {
    if (initialSimMode) return true;
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem(IOS_SIM_MODE_SESSION_KEY) === '1';
    }
    return false;
  });
  const [selectedMenteeStaffId, setSelectedMenteeStaffId] = useState<number | undefined>(undefined);
  const [isReadOnlyMentorView, setIsReadOnlyMentorView] = useState<boolean>(false);
  const [simulationActorStaffName, setSimulationActorStaffName] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [consultationReturnStep, setConsultationReturnStep] = useState<number | null>(null);
  // ── Referral Diamond State ────────────────────────────────────────────────
  const [pendingReferral, setPendingReferral] = useState<PendingReferral | null>(null);

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
  const [selectedStoreId, setSelectedStoreIdState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedStore = window.localStorage.getItem('mos_ios_selected_store_id');
      if (savedStore && (Number(savedStore) === 6 || Number(savedStore) === 16)) {
        return Number(savedStore);
      }
    }
    return 6;
  });
  const [serverAssignedStoreId, setServerAssignedStoreId] = useState<number | null>(null);

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
    let cancelled = false;
    try {
      const raw = window.localStorage.getItem('mos_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        setLoggedInUser(parsed);
        const userIsAdmin = isAdminOrSuperAdminRole(parsed?.role);
        const savedRole = userIsAdmin
          ? (window.localStorage.getItem('mos_ios_selected_role') as IosUserRole | null)
          : null;
        const allowedRoles: readonly IosUserRole[] = ['CVL', 'CVLL', 'CC', 'CV', 'STORE', 'INVENTORY'];
        const effectiveRequestedRole =
          userIsAdmin && savedRole && allowedRoles.includes(savedRole) && initialRole === 'CVL'
            ? savedRole
            : initialRole;
        const lockedRole = resolveLockedIosRoleForUser(parsed?.role, effectiveRequestedRole, parsed?.teamCodes);
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

      // Làm tươi profile từ /auth/me để tự động vá các phiên cũ thiếu legacyStaffId / avatarUrl / teamCodes
      if (window.localStorage.getItem('mos_token') && typeof apiClient?.auth?.me === 'function') {
        void Promise.resolve(apiClient.auth.me())
          .then((freshUser) => {
            if (cancelled || !freshUser || !freshUser.id) return;
            const freshIsAdmin = isAdminOrSuperAdminRole(freshUser.role);
            const savedRole = freshIsAdmin
              ? (window.localStorage.getItem('mos_ios_selected_role') as IosUserRole | null)
              : null;
            const allowedRoles: readonly IosUserRole[] = ['CVL', 'CVLL', 'CC', 'CV', 'STORE', 'INVENTORY'];
            const effectiveRequested =
              freshIsAdmin && savedRole && allowedRoles.includes(savedRole) && initialRole === 'CVL'
                ? savedRole
                : initialRole;
            const freshLockedRole = resolveLockedIosRoleForUser(
              freshUser.role,
              effectiveRequested,
              freshUser.teamCodes
            );
            setRoleState(freshLockedRole);
            setScopeModeState(freshIsAdmin ? 'STORE_ALL' : freshLockedRole === 'CVL' ? 'MY_CUSTOMERS' : 'STORE_ALL');
            setLoggedInUser((prev: any) => {
              const merged = { ...(prev || {}), ...freshUser };
              try {
                window.localStorage.setItem('mos_user', JSON.stringify(merged));
              } catch {
                // ignore storage quota errors
              }
              return merged;
            });
          })
          .catch(() => {
            // ignore offline / expired token
          });
      }
    } catch {
      // ignore
    }
    return () => {
      cancelled = true;
    };
  }, [initialRole]);

  const isAdmin = Boolean(
    loggedInUser
      ? isAdminOrSuperAdminRole(loggedInUser?.role)
      : typeof window !== 'undefined' &&
          process.env.NODE_ENV !== 'production' &&
          (window.location.search.includes('admin=1') || window.location.search.includes('role=admin'))
  );

  const canSwitchRole = Boolean(isAdmin);
  const rawActor = resolveActorProfile(role, loggedInUser);

  // Invariant (UI-010 & Chuyên Viên / CC Salon Anchor):
  // - Chuyên Viên (CV/CVL/CVLL) và CC không phải Admin luôn bị neo chặt vào duy nhất chi nhánh gốc của mình (kể cả trong Sandbox Mode).
  // - Chỉ Admin / Super Admin được chọn chi nhánh vận hành (DT / EP).
  const assignedStoreId =
    serverAssignedStoreId && serverAssignedStoreId > 0
      ? serverAssignedStoreId
      : resolveAssignedSalonStoreId(loggedInUser?.clientStoreId ?? loggedInUser?.storeId);
  const effectiveStoreId = isAdmin ? selectedStoreId : assignedStoreId;

  const actor = useMemo(() => {
    if (rawActor.storeId !== effectiveStoreId) {
      return {
        ...rawActor,
        storeId: effectiveStoreId,
        branchCode: effectiveStoreId === 16 ? 'EP' : 'DT',
        branchName: effectiveStoreId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám',
      };
    }
    return rawActor;
  }, [rawActor, effectiveStoreId]);

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
          ? resolveLockedIosRoleForUser(loggedInUser?.role, nextRole, loggedInUser?.teamCodes)
          : nextRole;
      setRoleState(effectiveRole);
      if (effectiveRole === 'CVL') {
        setScopeModeState('MY_CUSTOMERS');
      } else if (effectiveRole === 'CVLL' || effectiveRole === 'CC' || effectiveRole === 'STORE') {
        setScopeModeState('STORE_ALL');
      }
      if (typeof window !== 'undefined' && isAdminOrSuperAdminRole(loggedInUser?.role)) {
        try {
          window.localStorage.setItem('mos_ios_selected_role', effectiveRole);
        } catch {
          // ignore
        }
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
    const branchScoped =
      !isAdmin || role === 'CVL'
        ? bookings.filter((b) => !b.storeId || Number(b.storeId) === Number(effectiveStoreId))
        : bookings;
    const shouldFilterCvl = role === 'CVL' || (role !== 'CC' && role !== 'STORE' && scopeMode === 'MY_CUSTOMERS');
    const effectiveStaffId = isSimulationMode && selectedMenteeStaffId ? selectedMenteeStaffId : actor.staffId;
    const baseScoped = shouldFilterCvl
      ? filterBookingsForCvlScope(branchScoped, effectiveStaffId, { isToday: selectedDateOffset === 0 })
      : branchScoped;
    const includedIds = new Set(baseScoped.map((b) => Number(b.id)));
    const list = shouldFilterCvl
      ? [
          ...baseScoped,
          ...branchScoped.filter(
            (b) =>
              b.isSimulationDraftBooking &&
              Number(b.assignedStaffId || 0) === Number(effectiveStaffId) &&
              !includedIds.has(Number(b.id))
          ),
        ]
      : branchScoped;

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
  }, [
    bookings,
    role,
    scopeMode,
    actor.staffId,
    activeServicingBooking,
    isAdmin,
    effectiveStoreId,
    selectedDateOffset,
    isSimulationMode,
    selectedMenteeStaffId,
  ]);

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

  const targetDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDateOffset);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }, [selectedDateOffset]);

  const onSimulationMetaLoaded = useCallback(
    (meta: { isReadOnlyMentorView?: boolean; simulationActorStaffName?: string; simulationActorStaffId?: number }) => {
      setIsReadOnlyMentorView(Boolean(meta.isReadOnlyMentorView));
      setSimulationActorStaffName(meta.simulationActorStaffName);
    },
    []
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
    isSimulationMode,
    menteeStaffId: selectedMenteeStaffId,
    isReadOnlyMentorView,
    onSimulationMetaLoaded,
    isAdmin,
    role,
    effectiveStoreId,
    scopeMode,
    setScopeModeState,
    setSelectedStoreIdState,
    setServerAssignedStoreId,
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

  const isTrainingMentee = Boolean(staffStats?.isTrainingMentee);
  const trainingMentorName = staffStats?.trainingMentorName;
  const effectiveActor = useMemo(
    () =>
      isTrainingMentee
        ? {
            ...actor,
            isTrainingMentee: true,
            trainingMentorName,
          }
        : actor,
    [actor, isTrainingMentee, trainingMentorName]
  );

  const simulation = useIosSimulationMode({
    enabled,
    isSimulationMode,
    setIsSimulationMode,
    selectedMenteeStaffId,
    setSelectedMenteeStaffId,
    isReadOnlyMentorView,
    role,
    isAdmin,
    targetDate: targetDateStr,
    activeBooking,
    setActiveBookingId,
    setCurrentStep,
    setActiveTab,
    setBookingSegment,
    setBookings,
    postAction,
    refreshDb,
  });

  const {
    handleUpdateCustomerAvatar,
    handleCheckIn,
    handleSaveConsultation,
    handleAutoSaveConsultationDraft,
    handleSelectComboWallet,
    handleAssignStaff,
    handleTransferToCv,
  } = useIosConsultationAndCheckIn({
    role,
    actor: effectiveActor,
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
    handleBackFromBeforePhoto,
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

  const {
    handleGoToBilling,
    handleSavePromotion,
    handleUpdateCartProducts,
    handleUpdateCombos,
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
  } = useIosBillingCheckout({
    activeBookingId,
    activeBooking,
    isSimulationMode,
    onSimulationAttemptSaved: simulation.upsertAttemptInCache,
    actor: effectiveActor,
    cvPlusRules: staffStats?.cvPlusRules,
    updateActiveBooking,
    postAction,
    refreshDb,
    setCurrentStep,
    setBookingSegment,
    pendingReferral,
    onReferralGranted: () => setPendingReferral(null),
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
    actor: effectiveActor,
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
    handleBackFromBeforePhoto,
    handleSaveCleanedPhoto,
    handleToggleTimer,
    handleFinishTimer,
    handleSaveAfterPhoto,
    handleBackToAfterPhoto,
    handleCompleteSurvey,
    handleGoToBilling,
    handleSavePromotion,
    handleUpdateCartProducts,
    handleUpdateCombos,
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
    handleRevertToIncoming,
    selectedDateOffset,
    handleDateOffsetChange,
    targetDateStr,
    selectedStoreId: effectiveStoreId,
    setSelectedStoreId,
    currentBranch,
    availableBranches: IOS_AVAILABLE_BRANCHES,
    handleUpdateCustomerAvatar,
    handleAutoSaveConsultationDraft,
    handleSelectComboWallet,
    simulationActorStaffName,
    loggedInUser,
    pendingReferral,
    setPendingReferral,
    ...simulation,
  };
}
