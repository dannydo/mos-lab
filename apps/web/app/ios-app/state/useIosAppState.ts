'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { isAdminOrSuperAdminRole, resolveLockedIosRoleForUser } from '@mos-lab/shared';
import {
  BookingItem,
  INITIAL_BOOKINGS,
  SERUM_TIERS_CVL,
  filterBookingsForCvlScope,
  resolveStaffAvatarUrl,
} from './mockData';
import {
  enqueueOfflineAction,
  saveLocalProgressSnapshot,
  syncPendingActions,
  getLocalProgressSnapshot,
  getLocalProgressSnapshotAsync,
  getActiveServicingBookingId,
  getActiveServicingBookingIdAsync,
  setActiveServicingBookingId,
  getActiveServicingStep,
  getActiveServicingStepAsync,
  setActiveServicingStep,
} from './offlineSync';

export type IosUserRole = 'CVL' | 'CVLL' | 'CC' | 'CV' | 'STORE' | 'INVENTORY';
export type BookingScopeMode = 'MY_CUSTOMERS' | 'STORE_ALL';

export interface SegmentCounts {
  incoming: number;
  servicing: number;
  done: number;
  cancel: number;
}

export interface StaffMonthlyStats {
  staffId: number;
  month: number;
  monthLabel: string;
  monthlyRevenue: number;
  monthlyRevenueFormatted: string;
  completedShiftsCount: number;
  satisfactionRate: number;
  rating: number;
}

export interface ActiveActorProfile {
  staffId: number;
  name: string;
  tier: 'CVL' | 'CVLL' | 'CV' | 'CC' | 'ADMIN';
  badgeLabel: string;
  avatar?: string;
}

export function resolveActorProfile(role: IosUserRole, loggedInUser?: any): ActiveActorProfile {
  const userRole = String(loggedInUser?.role || '').toLowerCase();
  const isActualCvUser =
    userRole === 'cvl' ||
    userRole === 'cvll' ||
    userRole === 'cv' ||
    userRole === 'cv_plus' ||
    userRole === 'cv_plus_plus' ||
    userRole === 'technician';

  if (role === 'CVLL') {
    const staffId = isActualCvUser ? Number(loggedInUser?.legacyStaffId) || 25337 : 25337;
    const name = isActualCvUser && loggedInUser?.displayName ? loggedInUser.displayName : 'Tuyết Nhi ❤️';
    return {
      staffId,
      name,
      tier: 'CVLL',
      badgeLabel: '🪶CV🪶 · Chuyên Viên Tự Chủ Cấp Cao',
      avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
    };
  }
  if (role === 'CVL') {
    const staffId = isActualCvUser ? Number(loggedInUser?.legacyStaffId) || 46272 : 46272;
    const name = isActualCvUser && loggedInUser?.displayName ? loggedInUser.displayName : 'Thảo Ly';
    return {
      staffId,
      name,
      tier: 'CVL',
      badgeLabel: 'CV🪶 · Chuyên Viên Tự Chủ',
      avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
    };
  }
  if (role === 'CV') {
    const staffId = isActualCvUser ? Number(loggedInUser?.legacyStaffId) || 49076 : 49076;
    const name = isActualCvUser && loggedInUser?.displayName ? loggedInUser.displayName : 'Phương Nhi';
    return {
      staffId,
      name,
      tier: 'CV',
      badgeLabel: 'CV · Chuyên Viên Kỹ Thuật',
      avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
    };
  }
  const staffId = 37790;
  const name = 'Diễm Hương';
  return {
    staffId,
    name,
    tier: 'CC',
    badgeLabel: 'CC · Tư Vấn Viên',
    avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
  };
}

export function useIosAppState(initialStep: number = 1, enabled: boolean = true, initialRole: IosUserRole = 'CVL') {
  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS);
  const [activeBookingId, setActiveBookingId] = useState<number>(336695);
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [consultationReturnStep, setConsultationReturnStep] = useState<number | null>(null);

  const handleOpenConsultation = (returnStep?: number) => {
    setConsultationReturnStep(returnStep ?? currentStep);
    setCurrentStep(3);
  };
  const [role, setRoleState] = useState<IosUserRole>(initialRole);
  const [scopeModeState, setScopeModeState] = useState<BookingScopeMode>(
    initialRole === 'CVL' ? 'MY_CUSTOMERS' : 'STORE_ALL'
  );
  const [deviceMode, setDeviceMode] = useState<'iphone' | 'ipad' | 'fullscreen'>('iphone');
  const [activeTab, setActiveTab] = useState<string>('booking');
  const [bookingSegment, setBookingSegment] = useState<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>('INCOMING');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  const [countsState, setCounts] = useState<SegmentCounts>({
    incoming: 3,
    servicing: 0,
    done: 0,
    cancel: 0,
  });
  const [staffStats, setStaffStats] = useState<StaffMonthlyStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('mos_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        setLoggedInUser(parsed);
        const lockedRole = resolveLockedIosRoleForUser(parsed?.role, initialRole);
        setRoleState(lockedRole);
        setScopeModeState(lockedRole === 'CVL' ? 'MY_CUSTOMERS' : 'STORE_ALL');
      }
    } catch {
      // ignore
    }
  }, [initialRole]);

  // Khôi phục ca làm đang phục vụ dở dang từ localStorage / IndexedDB (chuẩn native iOS)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const restoreActiveSession = async () => {
      try {
        const savedActiveId = (await getActiveServicingBookingIdAsync()) || getActiveServicingBookingId();
        if (savedActiveId) {
          const idNum = Number(savedActiveId);
          setActiveBookingId(idNum);

          const cached = await getLocalProgressSnapshotAsync(idNum);
          if (cached) {
            setBookings((prev) => {
              return prev.map((b) =>
                b.id === idNum
                  ? {
                      ...b,
                      status: 'SERVICING',
                      progress: {
                        ...(b.progress || {}),
                        ...cached,
                      },
                    }
                  : b
              );
            });

            // Khôi phục chuẩn xác màn hình đang phục vụ (Bước 7..15) như iOS App cũ khi mở lại app!
            const savedStep = cached.currentStep || (await getActiveServicingStepAsync()) || getActiveServicingStep();
            if (savedStep && savedStep >= 6) {
              setCurrentStep(savedStep);
              setActiveTab('task');
            }
          }
        }
      } catch (err) {
        console.warn('[useIosAppState] Failed to restore active session:', err);
      }
    };

    void restoreActiveSession();
  }, []);

  const canSwitchRole = Boolean(loggedInUser && isAdminOrSuperAdminRole(loggedInUser?.role));
  const actor = resolveActorProfile(role, loggedInUser);

  // Invariant: CV🪶 (CVL) is strictly locked to MY_CUSTOMERS scope (only next customer + own booked customers)
  const scopeMode: BookingScopeMode = role === 'CVL' ? 'MY_CUSTOMERS' : scopeModeState;

  const setScopeMode = useCallback(
    (nextScope: BookingScopeMode) => {
      if (role === 'CVL') {
        setScopeModeState('MY_CUSTOMERS');
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

  const visibleBookings = useMemo(() => {
    if (role === 'CVL' || scopeMode === 'MY_CUSTOMERS') {
      return filterBookingsForCvlScope(bookings, actor.staffId);
    }
    return bookings;
  }, [bookings, role, scopeMode, actor.staffId]);

  const counts: SegmentCounts = useMemo(() => {
    if (role === 'CVL' || scopeMode === 'MY_CUSTOMERS') {
      return {
        incoming: visibleBookings.filter((b) => b.status === 'INCOMING' || b.status === 'CHECKED_IN').length,
        servicing: visibleBookings.filter((b) => b.status === 'SERVICING').length,
        done: visibleBookings.filter((b) => b.status === 'DONE').length,
        cancel: visibleBookings.filter((b) => b.status === 'CANCELLED').length,
      };
    }
    return countsState;
  }, [role, scopeMode, visibleBookings, countsState]);

  const activeBooking =
    visibleBookings.find((b) => b.id === activeBookingId) ||
    visibleBookings[0] ||
    bookings.find((b) => b.id === activeBookingId) ||
    bookings[0] ||
    INITIAL_BOOKINGS[0];

  // Khóa phục vụ độc quyền 1 khách (Single Active Service Session Invariant):
  // Một CVL / CVLL tại một thời điểm chỉ phục vụ 1 khách hàng duy nhất.
  // Khi đang có ca làm dở dang (status === 'SERVICING' hoặc có progress đang chạy và chưa hoàn tất checkout):
  // CVL KHÔNG ĐƯỢC PHÉP check-in bất kỳ khách hàng nào khác cho đến khi hoàn thành checkout (Step 15 -> DONE).
  const activeServicingBooking = useMemo(() => {
    return (
      bookings.find(
        (b) =>
          b.status === 'SERVICING' ||
          (b.status === 'CHECKED_IN' && Boolean(b.progress?.startedAt)) ||
          (Boolean(b.progress) && !b.progress?.completedAt && b.status !== 'DONE')
      ) || null
    );
  }, [bookings]);

  const handleResumeServicing = useCallback(
    async (bookingId?: number) => {
      const targetId = bookingId || activeServicingBooking?.id || activeBookingId;
      const targetBooking = bookings.find((b) => b.id === targetId);
      if (!targetBooking) return;
      setActiveBookingId(targetBooking.id);
      const cached =
        (await getLocalProgressSnapshotAsync(targetBooking.id)) || getLocalProgressSnapshot(targetBooking.id);
      const targetStep =
        targetBooking.progress?.currentStep ||
        cached?.currentStep ||
        (await getActiveServicingStepAsync()) ||
        getActiveServicingStep() ||
        7;
      setActiveTab('task');
      setCurrentStep(targetStep);
    },
    [bookings, activeServicingBooking, activeBookingId]
  );

  const postAction = useCallback(
    async (action: string, payload: Record<string, any> = {}) => {
      // 1. Chỉ lưu progress thực tế vào snapshot offline nếu có (tránh lưu payload lồng nhau làm phình storage)
      if (payload.progress) {
        saveLocalProgressSnapshot(activeBookingId, payload.progress);
      }

      // 2. Nếu rớt mạng, lưu vào queue chờ sync
      if (typeof window !== 'undefined' && !navigator.onLine) {
        enqueueOfflineAction(action, activeBookingId, payload);
        return { success: false, offlineQueued: true };
      }

      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('mos_token') || '' : '';
        const res = await fetch('/api/ios/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            bookingId: activeBookingId,
            action,
            actorStaffId: actor.staffId,
            actorStaffName: actor.name,
            actorStaffTier: actor.tier,
            ...payload,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Cập nhật progress với đường dẫn Cloud URL vĩnh viễn trả về từ server
          if (data.progress) {
            updateActiveBooking((prev) => ({
              ...prev,
              progress: {
                ...(prev.progress || {}),
                ...data.progress,
                cloudSynced: true,
                cloudSyncedAt: data.cloudSyncedAt || new Date().toISOString(),
              },
            }));
            saveLocalProgressSnapshot(activeBookingId, {
              ...data.progress,
              cloudSynced: true,
              cloudSyncedAt: data.cloudSyncedAt || new Date().toISOString(),
            });
          }
          return { success: true, data };
        } else {
          enqueueOfflineAction(action, activeBookingId, payload);
          return { success: false };
        }
      } catch (err) {
        console.warn('[useIosAppState] Failed to persist action, queued offline:', action, err);
        enqueueOfflineAction(action, activeBookingId, payload);
        return { success: false, error: err };
      }
    },
    [activeBookingId, actor.staffId, actor.name, actor.tier]
  );

  const refreshDb = useCallback(
    async (options?: {
      segment?: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
      storeId?: number;
      scope?: BookingScopeMode;
      staffId?: number;
      date?: string;
    }) => {
      const seg = options?.segment || bookingSegment;
      const storeId = options?.storeId ?? 6;
      const effScope: BookingScopeMode = role === 'CVL' ? 'MY_CUSTOMERS' : options?.scope || scopeMode;
      const effStaffId = options?.staffId ?? actor.staffId;
      const dateQuery = options?.date ? `&date=${encodeURIComponent(options.date)}` : '';

      setIsRefreshing(true);
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('mos_token') || '' : '';
        const res = await fetch(
          `/api/ios/bookings?storeId=${storeId}&segment=${seg}&scope=${effScope}&role=${role}&staffId=${effStaffId}${dateQuery}&limit=40`,
          {
            cache: 'no-store',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.bookings)) {
          setBookings((prev) => {
            const prevMap = new Map(prev.map((p) => [p.id, p]));
            const mergedIncoming = data.bookings.map((incoming: BookingItem) => {
              const existing = prevMap.get(incoming.id);
              if (existing) {
                return {
                  ...incoming,
                  serviceName:
                    existing.serviceName && !existing.serviceName.toLowerCase().includes('any')
                      ? existing.serviceName
                      : incoming.serviceName,
                  servicePrice: existing.servicePrice || incoming.servicePrice,
                  serviceType: existing.serviceType || incoming.serviceType,
                  attributes: existing.attributes || incoming.attributes,
                  cvRotationPoints: existing.cvRotationPoints ?? incoming.cvRotationPoints,
                  cvRotationBreakdown: existing.cvRotationBreakdown ?? incoming.cvRotationBreakdown,
                  status:
                    existing.status === 'SERVICING' || getLocalProgressSnapshot(incoming.id)?.status === 'SERVICING'
                      ? 'SERVICING'
                      : existing.status || incoming.status,
                  progress: {
                    ...(incoming.progress || {}),
                    ...(getLocalProgressSnapshot(incoming.id) || {}),
                    ...(existing.progress || {}),
                  },
                  selectedCombo: existing.selectedCombo || incoming.selectedCombo,
                  cartProducts: existing.cartProducts || incoming.cartProducts,
                  billing: existing.billing || incoming.billing,
                  survey: existing.survey || incoming.survey,
                  checkInStaffId: existing.checkInStaffId || incoming.checkInStaffId,
                  checkInStaffName: existing.checkInStaffName || incoming.checkInStaffName,
                  checkInStaffTier: existing.checkInStaffTier || incoming.checkInStaffTier,
                  assignedStaffId: existing.assignedStaffId || incoming.assignedStaffId,
                  assignedStaffName: existing.assignedStaffName || incoming.assignedStaffName,
                };
              }
              return incoming;
            });

            // Bảo toàn ca làm SERVICING hoặc đang có tiến trình dở dang, không để bị xóa khi server chỉ trả segment INCOMING
            const incomingIds = new Set(mergedIncoming.map((b: BookingItem) => b.id));
            const preservedServicing = prev.filter(
              (b: BookingItem) => !incomingIds.has(b.id) && (b.status === 'SERVICING' || b.progress)
            );

            return [...mergedIncoming, ...preservedServicing];
          });
          if (data.counts) {
            setCounts(data.counts);
          }
          if (data.staffStats) {
            setStaffStats(data.staffStats);
          }
          setIsLiveDb(true);
          setLastRefreshedAt(
            new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );

          // Đồng bộ đa thiết bị tức thì (Real-time Cross-Device Session Sync):
          // Nhận diện ca làm đang SERVICING trên server (từ bất kỳ thiết bị nào: Điện thoại, iPad, Desktop)
          const serverActiveServicing = data.bookings
            ?.filter(
              (b: BookingItem) =>
                b.status === 'SERVICING' || (Boolean(b.progress) && !b.progress?.completedAt && b.status !== 'DONE')
            )
            .sort((a: BookingItem, b: BookingItem) => {
              const timeA = new Date(a.progress?.savedAt || a.progress?.updatedAt || 0).getTime();
              const timeB = new Date(b.progress?.savedAt || b.progress?.updatedAt || 0).getTime();
              return timeB - timeA;
            })[0];

          if (serverActiveServicing) {
            const servicingId = serverActiveServicing.id;
            const serverStep = serverActiveServicing.progress?.currentStep;

            // Luôn lưu snapshot từ server vào RAM cache & IndexedDB
            if (serverActiveServicing.progress) {
              saveLocalProgressSnapshot(servicingId, {
                ...serverActiveServicing.progress,
                status: 'SERVICING',
              });
            }

            // Tự động neo activeBookingId và setActiveServicingBookingId vào ca làm này
            setActiveServicingBookingId(servicingId);
            setActiveBookingId(servicingId);

            // Tự động nhảy vào đúng bước phục vụ trên màn hình nếu chưa tới hoặc đang ở tab khác
            if (serverStep && serverStep >= 6) {
              setActiveServicingStep(serverStep);
              setCurrentStep((prevStep) => {
                if (prevStep <= 6 || prevStep < serverStep) {
                  setActiveTab('task');
                  return serverStep;
                }
                return prevStep;
              });
            }
          } else {
            // Không có ca làm servicing trên server, duy trì active booking an toàn
            setBookings((current) => {
              const currentActive = current.find((b) => b.id === activeBookingId);
              const isCurrentlyServicing =
                currentActive?.status === 'SERVICING' ||
                (Boolean(currentActive?.progress) && !currentActive?.progress?.completedAt);
              if (!isCurrentlyServicing) {
                const exists = data.bookings.some((b: BookingItem) => b.id === activeBookingId);
                if (!exists && data.bookings.length > 0) {
                  setActiveBookingId(data.bookings[0].id);
                }
              }
              return current;
            });
          }
        }
      } catch (err) {
        console.warn('Could not refresh from live DB, keeping current state:', err);
      } finally {
        setIsRefreshing(false);
      }
    },
    [bookingSegment, scopeMode, role, actor.staffId, activeBookingId]
  );

  useEffect(() => {
    if (!enabled) return;
    refreshDb();
  }, [bookingSegment, scopeMode, role, enabled, refreshDb]);

  // Tự động đồng bộ tức thì xuyên thiết bị (Cross-device Real-time Sync)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshDb();
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshDb();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refreshDb]);

  // Tự động đồng bộ các action offline khi có mạng hoặc định kỳ mỗi 20 giây
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const runSync = () => {
      if (navigator.onLine) {
        void syncPendingActions({
          staffId: actor.staffId,
          name: actor.name,
          tier: actor.tier,
        });
      }
    };

    window.addEventListener('online', runSync);
    const timer = setInterval(runSync, 20000);

    return () => {
      window.removeEventListener('online', runSync);
      clearInterval(timer);
    };
  }, [actor.staffId, actor.name, actor.tier]);

  const updateActiveBooking = (updater: (prev: BookingItem) => BookingItem) => {
    setBookings((prev) => prev.map((b) => (b.id === activeBookingId ? updater(b) : b)));
  };

  // Step 2: Check-in action (Ai bấm Check-in nhận 10% Tip Check-in)
  const handleCheckIn = () => {
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'CHECKED_IN',
      checkInStaffId: actor.staffId,
      checkInStaffName: actor.name,
      checkInStaffTier: actor.tier,
    }));
    void postAction('CHECK_IN');
    setCurrentStep(3); // Go to Consultation Matrix + Combo Selection
  };

  // Step 3: Save Consultation & Optional Combo Upsell
  const handleSaveConsultation = (
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
    selectedCombo?: {
      id: string;
      name: string;
      price: number;
      bonus: number;
      sessions: number;
    } | null,
    skuPricing?: {
      skuName?: string;
      skuPrice?: number;
      upgradePrice?: number;
      cvPoints?: number;
      cvBreakdown?: string;
      serviceType?: string;
    } | null
  ) => {
    const isSelfAssignedCv =
      role === 'CVL' ||
      (role === 'CVLL' && (!activeBooking.assignedStaffId || activeBooking.assignedStaffId === actor.staffId));

    updateActiveBooking((prev) => {
      const nextCombo = selectedCombo !== undefined ? selectedCombo : prev.selectedCombo || null;
      const nextServiceName =
        skuPricing?.skuName ||
        (prev.serviceName && !prev.serviceName.toLowerCase().includes('any') ? prev.serviceName : 'New Hyperlight 550');
      const nextServicePrice = skuPricing?.skuPrice || prev.servicePrice;
      const nextUpgradePrice = skuPricing?.upgradePrice ?? prev.upgradePrice ?? 0;
      const originalBookedServiceName =
        prev.originalBookedServiceName && !prev.originalBookedServiceName.toLowerCase().includes('any')
          ? prev.originalBookedServiceName
          : nextServiceName;
      const originalBookedServicePrice = prev.originalBookedServicePrice || prev.servicePrice;

      const comboPrice = nextCombo ? nextCombo.price : 0;
      const effectiveServiceTotal = nextCombo ? 0 : nextServicePrice;
      const productTotal = (prev.cartProducts || []).reduce((s, p) => s + p.price * p.quantity, 0);
      const subtotal = effectiveServiceTotal + comboPrice + productTotal;
      const vatRate = 0.08;
      const vatAmount = Math.round(subtotal * vatRate);
      const tipAmount = prev.billing?.tipAmount ?? 50000;
      const grandTotal = subtotal + vatAmount + tipAmount;

      return {
        ...prev,
        attributes,
        serviceType: skuPricing?.serviceType || prev.serviceType || 'Normal',
        serviceName: nextServiceName,
        servicePrice: nextServicePrice,
        originalBookedServiceName,
        originalBookedServicePrice,
        upgradePrice: nextUpgradePrice,
        cvRotationPoints: skuPricing?.cvPoints ?? prev.cvRotationPoints,
        cvRotationBreakdown: skuPricing?.cvBreakdown ?? prev.cvRotationBreakdown,
        selectedCombo: nextCombo,
        checkInStaffId: prev.checkInStaffId || actor.staffId,
        checkInStaffName: prev.checkInStaffName || actor.name,
        checkInStaffTier: prev.checkInStaffTier || actor.tier,
        assignedStaffId: prev.assignedStaffId || actor.staffId,
        assignedStaffName: prev.assignedStaffName || actor.name,
        status: isSelfAssignedCv ? 'SERVICING' : prev.status,
        billing: {
          subtotal,
          vatRate,
          vatAmount,
          serviceTotal: effectiveServiceTotal,
          comboTotal: comboPrice,
          productTotal,
          paymentMethod: prev.billing?.paymentMethod || 'VIETQR',
          tipAmount,
          tipCvShare: Math.round(tipAmount * 0.7),
          tipCheckInShare: Math.round(tipAmount * 0.1),
          tipCheckOutShare: Math.round(tipAmount * 0.1),
          tipCcShare: Math.round(tipAmount * 0.2),
          grandTotal,
        },
      };
    });

    void postAction('SAVE_CONSULTATION', {
      attributes,
      selectedCombo: selectedCombo !== undefined ? selectedCombo : activeBooking.selectedCombo || null,
      skuPricing,
      nextStatus: isSelfAssignedCv ? 'SERVICING' : 'CHECKED_IN',
    });

    if (consultationReturnStep) {
      const nextStep = consultationReturnStep;
      setConsultationReturnStep(null);
      setCurrentStep(nextStep);
      return;
    }

    if (isSelfAssignedCv) {
      // CV🪶 tự tư vấn khách của mình -> vào thẳng màn hình Nhận ca / Chụp ảnh tiến trình mi, không cần qua CC chia ca!
      setBookingSegment('SERVICING');
      setCurrentStep(6);
    } else {
      // 🪶CV🪶 tư vấn chéo hộ CV khác hoặc CC -> sang bước xác nhận CV làm mi
      setCurrentStep(4);
    }
  };

  // Step 4: Assign Staff & Bed
  const handleAssignStaff = (staffId: number, staffName: string, bed: string) => {
    updateActiveBooking((prev) => ({
      ...prev,
      assignedStaffId: staffId,
      assignedStaffName: staffName,
      assignedBed: bed,
      status: 'SERVICING',
    }));
    void postAction('ASSIGN_STAFF', {
      assignedStaffId: staffId,
      assignedStaffName: staffName,
      assignedBed: bed,
    });
    setBookingSegment('SERVICING');
    setCurrentStep(5);
  };

  // Step 5 -> Step 6: Handover to CV
  const handleTransferToCv = () => {
    setCurrentStep(6);
  };

  // Step 6 -> Step 7: CV starts task (Preparation - chiếu theo iOS gốc, đồng hồ tự động chạy ngay)
  const handleCvStartTask = () => {
    const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 0 }),
      startedAt,
      timerRunning: true,
      currentStep: 7,
    };
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'SERVICING',
      progress: progressPatch,
    }));
    setActiveServicingBookingId(activeBooking.id);
    saveLocalProgressSnapshot(activeBooking.id, {
      ...progressPatch,
      bookingId: activeBooking.id,
      startedAt,
      status: 'SERVICING',
    });
    void postAction('UPDATE_PROGRESS', { orderState: 'Preparation', progress: progressPatch });
    setCurrentStep(7);
  };

  // Tự động lưu ảnh ngay khi chụp (ghi đè nếu chụp lại) mà không bắt buộc phải bấm nút chuyển bước:
  // Lưu local tức thời vào RAM & IndexedDB, sau đó tự động đẩy lên Cloud
  const handleAutoSavePhoto = async (type: 'before' | 'cleaned' | 'after', photoUrl: string) => {
    const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
    const progressPatch: any = {
      ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
      startedAt,
      cloudSyncStatus: 'UPLOADING',
    };
    if (type === 'before') {
      progressPatch.beforePhotoUrl = photoUrl;
      progressPatch.beforePhotoSavedAt = new Date().toISOString();
      progressPatch.currentStep = 7;
    } else if (type === 'cleaned') {
      progressPatch.cleanedPhotoUrl = photoUrl;
      progressPatch.cleanedPhotoSavedAt = new Date().toISOString();
      progressPatch.currentStep = 8;
    } else if (type === 'after') {
      progressPatch.afterPhotoUrl = photoUrl;
      progressPatch.afterPhotoSavedAt = new Date().toISOString();
      progressPatch.currentStep = 10;
    }

    // 1. Lưu local tức thời vào RAM & IndexedDB
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'SERVICING',
      progress: progressPatch,
    }));
    setActiveServicingBookingId(activeBooking.id);
    saveLocalProgressSnapshot(activeBooking.id, {
      ...progressPatch,
      bookingId: activeBooking.id,
      status: 'SERVICING',
    });

    // 2. Tự động đẩy lên Cloud ngay lập tức
    const postResult = await postAction('UPDATE_PROGRESS', {
      orderState: `Photo ${type} auto-saved`,
      progress: progressPatch,
    });
    return postResult;
  };

  // Step 7 -> Step 8: Save Before Photo (Mắt mộc) & Chuyển sang Ảnh Vệ Sinh
  const handleSaveBeforePhoto = (photoUrl: string) => {
    const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
      beforePhotoUrl: photoUrl,
      timerRunning: true,
      startedAt,
      currentStep: 8,
    };
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'SERVICING',
      progress: progressPatch,
    }));
    setActiveServicingBookingId(activeBooking.id);
    saveLocalProgressSnapshot(activeBooking.id, {
      ...progressPatch,
      bookingId: activeBooking.id,
      status: 'SERVICING',
    });
    void postAction('UPDATE_PROGRESS', { orderState: 'Service Start', progress: progressPatch });
    setCurrentStep(8);
  };

  // Step 8 -> Step 9: Save Cleaned Photo (Vệ sinh nhắm) & Chuyển sang Bấm Giờ Phục Vụ
  const handleSaveCleanedPhoto = (photoUrl: string) => {
    const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
      cleanedPhotoUrl: photoUrl,
      timerRunning: true,
      startedAt,
      currentStep: 9,
    };
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'SERVICING',
      progress: progressPatch,
    }));
    setActiveServicingBookingId(activeBooking.id);
    saveLocalProgressSnapshot(activeBooking.id, {
      ...progressPatch,
      bookingId: activeBooking.id,
      status: 'SERVICING',
    });
    void postAction('UPDATE_PROGRESS', { orderState: 'Service Cleaned', progress: progressPatch });
    setCurrentStep(9);
  };

  // Step 9: Timer controls
  const handleToggleTimer = () => {
    updateActiveBooking((prev) => ({
      ...prev,
      progress: {
        ...(prev.progress || { elapsedSeconds: 0, timerRunning: false }),
        timerRunning: !prev.progress?.timerRunning,
      },
    }));
  };

  const handleFinishTimer = () => {
    const completedAt = new Date().toISOString();
    const startedAt = activeBooking.progress?.startedAt || new Date(Date.now() - 68 * 60000).toISOString();
    const elapsedSeconds = Math.max(
      1,
      Math.floor((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    );
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds }),
      elapsedSeconds,
      timerRunning: false,
      completedAt,
      currentStep: 10,
    };
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'SERVICING',
      progress: progressPatch,
    }));
    saveLocalProgressSnapshot(activeBooking.id, {
      ...progressPatch,
      bookingId: activeBooking.id,
      completedAt,
      status: 'SERVICING',
    });
    void postAction('UPDATE_PROGRESS', { orderState: 'Service End', progress: progressPatch });
    setCurrentStep(10);
  };

  // Step 10 -> Step 12: Save After Photo & Go to Product Upsell (Bỏ bước khảo sát trực tiếp trước mặt CVL/CC)
  const handleSaveAfterPhoto = (photoUrl: string) => {
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 4468, timerRunning: false }),
      afterPhotoUrl: photoUrl,
      currentStep: 12,
    };
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'SERVICING',
      progress: progressPatch,
    }));
    saveLocalProgressSnapshot(activeBooking.id, {
      ...progressPatch,
      bookingId: activeBooking.id,
      status: 'SERVICING',
    });
    void postAction('UPDATE_PROGRESS', { orderState: 'Service Completed', progress: progressPatch });
    setCurrentStep(12);
  };

  // Step 11 -> Step 10: Quay lại màn hình Ảnh After để Chuyên viên hoặc Khách soi lại hình Before/After
  const handleBackToAfterPhoto = useCallback(() => {
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 4468, timerRunning: false }),
      currentStep: 10,
    };
    updateActiveBooking((prev) => ({
      ...prev,
      progress: progressPatch,
    }));
    saveLocalProgressSnapshot(activeBooking.id, {
      ...progressPatch,
      bookingId: activeBooking.id,
      status: 'SERVICING',
    });
    setActiveServicingStep(10);
    setCurrentStep(10);
    void postAction('UPDATE_PROGRESS', { orderState: 'Photo after auto-saved', progress: progressPatch });
  }, [activeBooking.id, activeBooking.progress, postAction, updateActiveBooking]);

  // Step 11: Complete Survey -> Giữ nguyên quyền điều khiển của CV🪶 / 🪶CV🪶 để tự bán Dưỡng mi / Combo & Tự Checkout!
  const handleCompleteSurvey = (survey: {
    rating: number;
    emotion: 'happy' | 'satisfied' | 'neutral' | 'unhappy';
    feedbackNote?: string;
  }) => {
    updateActiveBooking((prev) => ({
      ...prev,
      survey,
      progress: {
        ...(prev.progress || { elapsedSeconds: 4468, timerRunning: false }),
        currentStep: 12,
      },
    }));
    saveLocalProgressSnapshot(activeBooking.id, {
      survey,
      currentStep: 12,
      bookingId: activeBooking.id,
      status: 'SERVICING',
    });
    void postAction('COMPLETE_SURVEY', { survey });
    setCurrentStep(12); // Go directly to Product Upsell & Combo Checkout as CV🪶 / 🪶CV🪶!
  };

  // Step 12 -> Step 13: Save Product Upsell (Yeppeum) & Optional Combo + Lock in check_out_staff_id = actor!
  const handleGoToBilling = (upsellPayload?: {
    cartProducts?: Array<{ productId: number; productName: string; price: number; quantity: number; cvBonus?: number }>;
    selectedCombo?: NonNullable<BookingItem['selectedCombo']> | null;
    selectedUnderCombo?: NonNullable<BookingItem['selectedUnderCombo']> | null;
    comboRedemption?: NonNullable<BookingItem['comboRedemption']> | null;
  }) => {
    updateActiveBooking((prev) => {
      const nextProducts =
        upsellPayload?.cartProducts !== undefined
          ? upsellPayload.cartProducts
          : prev.cartProducts && prev.cartProducts.length > 0
            ? prev.cartProducts
            : [
                {
                  productId: 36,
                  productName: 'Cây dưỡng mi Yeppeum 6ml (Giá gốc)',
                  price: SERUM_TIERS_CVL[0].price,
                  quantity: 1,
                  cvBonus: SERUM_TIERS_CVL[0].cvBonus,
                },
              ];
      const nextCombo =
        upsellPayload?.selectedCombo !== undefined ? upsellPayload.selectedCombo : prev.selectedCombo || null;
      const nextUnderCombo =
        upsellPayload?.selectedUnderCombo !== undefined
          ? upsellPayload.selectedUnderCombo
          : prev.selectedUnderCombo || null;
      const nextRedemption =
        upsellPayload?.comboRedemption !== undefined ? upsellPayload.comboRedemption : prev.comboRedemption || null;
      const productTotal = nextProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
      const comboTotal = (nextCombo ? nextCombo.price : 0) + (nextUnderCombo ? nextUnderCombo.price : 0);

      // Khi mua gói mới: trừ luôn buổi đầu vào gói -> phí lẻ buổi hôm nay = 0đ
      // Khi trừ gói đang có: phí lẻ = phụ thu quy đổi/nâng cấp (nếu có) hoặc 0đ
      const effectiveServiceTotal = nextCombo
        ? 0
        : nextRedemption
          ? nextRedemption.totalCustomerPayToday
          : prev.servicePrice;
      const subtotal = effectiveServiceTotal + comboTotal + productTotal;
      const tipAmount = prev.billing?.tipAmount ?? 50000;

      const comboBonusAmount = (nextCombo ? nextCombo.bonus : 0) + (nextUnderCombo ? nextUnderCombo.bonus : 0);
      const serumBonusAmount = nextProducts.reduce((sum, p) => sum + (p.cvBonus || 0) * p.quantity, 0);

      void postAction('SAVE_UPSELL_AND_CHECKOUT', {
        cartProducts: nextProducts,
        selectedCombo: nextCombo,
        selectedUnderCombo: nextUnderCombo,
        comboRedemption: nextRedemption,
      });

      return {
        ...prev,
        checkOutStaffId: actor.staffId,
        checkOutStaffName: actor.name,
        checkOutStaffTier: actor.tier,
        cartProducts: nextProducts,
        selectedCombo: nextCombo,
        selectedUnderCombo: nextUnderCombo,
        comboRedemption: nextRedemption,
        cvRewardBreakdown: {
          techTipPercent: 70,
          checkInTipPercent: 10,
          checkOutTipPercent: 10,
          cvTotalTipPercent:
            (prev.assignedStaffId === actor.staffId ? 70 : 0) +
            ((prev.checkInStaffId || actor.staffId) === actor.staffId ? 10 : 0) +
            10,
          comboBonusAmount,
          serumBonusAmount,
          totalOrderBonusForCheckoutStaff: comboBonusAmount + serumBonusAmount,
        },
        billing: {
          subtotal,
          vatRate: 0.08,
          vatAmount: Math.round(subtotal * 0.08),
          serviceTotal: effectiveServiceTotal,
          comboTotal,
          productTotal,
          paymentMethod: prev.billing?.paymentMethod || 'VIETQR',
          tipAmount,
          tipCvShare: Math.round(tipAmount * 0.7),
          tipCheckInShare: Math.round(tipAmount * 0.1),
          tipCheckOutShare: Math.round(tipAmount * 0.1),
          tipCcShare: Math.round(tipAmount * 0.2),
          grandTotal: subtotal + Math.round(subtotal * 0.08) + tipAmount,
        },
      };
    });
    setCurrentStep(13);
  };

  // Step 13: Choose Payment Method
  const handleChoosePaymentMethod = (method: 'CASH' | 'POS' | 'VIETQR') => {
    updateActiveBooking((prev) => ({
      ...prev,
      billing: {
        ...(prev.billing || {
          subtotal: prev.servicePrice,
          vatRate: 0.08,
          vatAmount: Math.round(prev.servicePrice * 0.08),
          serviceTotal: prev.servicePrice,
          comboTotal: 0,
          productTotal: 0,
          tipAmount: 50000,
          tipCvShare: 35000,
          tipCheckInShare: 5000,
          tipCheckOutShare: 5000,
          tipCcShare: 10000,
          grandTotal: prev.servicePrice + Math.round(prev.servicePrice * 0.08) + 50000,
        }),
        paymentMethod: method,
      },
    }));
    setCurrentStep(14);
  };

  // Step 14: Record Tip (Kinh Thánh mOS Điều răn TIP-001 & CV-002: 70% Làm mi + 10% Check-in + 10% Check-out)
  const handleRecordTip = (tipAmount: number) => {
    updateActiveBooking((prev) => {
      const cvShare = Math.round(tipAmount * 0.7);
      const checkInShare = Math.round(tipAmount * 0.1);
      const checkOutShare = Math.round(tipAmount * 0.1);
      const ccShare = checkInShare + checkOutShare;
      const currentBilling = prev.billing || {
        subtotal: prev.servicePrice,
        vatRate: 0.08,
        vatAmount: Math.round(prev.servicePrice * 0.08),
        serviceTotal: prev.servicePrice,
        comboTotal: 0,
        productTotal: 0,
        paymentMethod: 'VIETQR' as const,
      };
      const subtotal = currentBilling.subtotal;
      const vatRate = currentBilling.vatRate ?? 0.08;
      const vatAmount = currentBilling.vatAmount ?? Math.round(subtotal * vatRate);
      const grandTotal = subtotal + vatAmount + tipAmount;

      const nextBilling = {
        ...currentBilling,
        vatRate,
        vatAmount,
        tipAmount,
        tipCvShare: cvShare,
        tipCheckInShare: checkInShare,
        tipCheckOutShare: checkOutShare,
        tipCcShare: ccShare,
        grandTotal,
      };

      void postAction('COMPLETE_ORDER', { billing: nextBilling });

      return {
        ...prev,
        checkOutStaffId: prev.checkOutStaffId || actor.staffId,
        checkOutStaffName: prev.checkOutStaffName || actor.name,
        checkOutStaffTier: prev.checkOutStaffTier || actor.tier,
        billing: nextBilling,
      };
    });
    setCurrentStep(15);
  };

  // Step 15: Finish Order
  const handleFinishOrder = () => {
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'DONE',
      progress: {
        ...(prev.progress || { elapsedSeconds: 0, timerRunning: false }),
        completedAt: new Date().toISOString(),
        currentStep: 1,
      },
    }));
    setActiveServicingBookingId(null);
    saveLocalProgressSnapshot(activeBookingId, {
      status: 'DONE',
      completedAt: new Date().toISOString(),
      currentStep: 1,
    });
    setBookingSegment('DONE');
    setCurrentStep(1);
  };

  return {
    bookings: visibleBookings,
    activeBooking,
    activeBookingId,
    setActiveBookingId,
    activeServicingBooking,
    handleResumeServicing,
    currentStep,
    setCurrentStep,
    role,
    setRole,
    canSwitchRole,
    isAdmin: canSwitchRole,
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
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
  };
}
