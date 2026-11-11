'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  isAdminOrSuperAdminRole,
  resolveLockedIosRoleForUser,
  maskPhoneNumber,
  canViewUnmaskedCustomerPhone,
} from '@mos-lab/shared';
import {
  BookingItem,
  INITIAL_BOOKINGS,
  SERUM_TIERS_CVL,
  filterBookingsForCvlScope,
  resolveStaffAvatarUrl,
  resolveCustomerBookingTab,
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
  clearLocalProgressSnapshot,
} from './offlineSync';
import { resolveApiBaseUrl } from '~/lib/api-base-url';
import {
  useIosBillingCheckout,
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
} from './useIosBillingCheckout';

export {
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
};

export type IosUserRole = 'CVL' | 'CVLL' | 'CC' | 'CV' | 'STORE' | 'INVENTORY';
export type BookingScopeMode = 'MY_CUSTOMERS' | 'STORE_ALL';

export interface IosBranchConfig {
  id: number;
  code: string;
  name: string;
  shortName: string;
  address: string;
  receiptName: string;
}

export const IOS_AVAILABLE_BRANCHES: IosBranchConfig[] = [
  {
    id: 6,
    code: 'DT',
    name: 'Chi nhánh Đề Thám',
    shortName: 'Đề Thám',
    address: '159A Đề Thám, P. Cô Giang, Q.1, TP.HCM',
    receiptName: 'CN ĐỀ THÁM',
  },
  {
    id: 16,
    code: 'EP',
    name: 'Chi nhánh Estella Place',
    shortName: 'Estella Place',
    address: 'Tầng 3 Estella Place, 88 Song Hành, An Phú, TP. Thủ Đức',
    receiptName: 'CN ESTELLA PLACE',
  },
];

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
  storeId?: number;
  branchCode?: string;
  branchName?: string;
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

  // Chi nhánh gốc của tài khoản người dùng đăng nhập (nếu có)
  const userAssignedStoreId = Number(loggedInUser?.clientStoreId || loggedInUser?.storeId || 0);

  if (role === 'CVLL') {
    const staffId = isActualCvUser ? Number(loggedInUser?.legacyStaffId) || 25337 : 25337;
    const name = isActualCvUser && loggedInUser?.displayName ? loggedInUser.displayName : 'Tuyết Nhi ❤️';
    const storeId = userAssignedStoreId || 6;
    return {
      staffId,
      name,
      tier: 'CVLL',
      badgeLabel: 'CVLL · Chuyên Viên Tự Chủ Cấp Cao',
      avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
      storeId,
      branchCode: storeId === 16 ? 'EP' : 'DT',
      branchName: storeId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám',
    };
  }
  if (role === 'CVL') {
    const isThaoLy =
      isActualCvUser &&
      (Number(loggedInUser?.legacyStaffId) === 46272 || loggedInUser?.displayName?.toLowerCase()?.includes('thảo ly'));
    const defaultStaffId = isThaoLy ? 46272 : 13783;
    const defaultName = isThaoLy ? 'Thảo Ly' : 'Khanh Cao';
    const staffId = isActualCvUser ? Number(loggedInUser?.legacyStaffId) || defaultStaffId : defaultStaffId;
    const name = isActualCvUser && loggedInUser?.displayName ? loggedInUser.displayName : defaultName;
    const storeId = userAssignedStoreId || 6; // Khanh Cao & Thảo Ly thuộc Chi nhánh Đề Thám (DT - 6)
    return {
      staffId,
      name,
      tier: 'CVL',
      badgeLabel: 'CVL · Chuyên Viên Tự Chủ',
      avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
      storeId,
      branchCode: storeId === 16 ? 'EP' : 'DT',
      branchName: storeId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám',
    };
  }
  if (role === 'CV') {
    const staffId = isActualCvUser ? Number(loggedInUser?.legacyStaffId) || 49076 : 49076;
    const name = isActualCvUser && loggedInUser?.displayName ? loggedInUser.displayName : 'Phương Nhi';
    const storeId = userAssignedStoreId || 6;
    return {
      staffId,
      name,
      tier: 'CV',
      badgeLabel: 'CV · Chuyên Viên Kỹ Thuật',
      avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
      storeId,
      branchCode: storeId === 16 ? 'EP' : 'DT',
      branchName: storeId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám',
    };
  }
  const staffId = 37790;
  const name = 'Diễm Hương';
  const storeId = userAssignedStoreId || 6;
  return {
    staffId,
    name,
    tier: 'CC',
    badgeLabel: 'CC · Tư Vấn Viên',
    avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
    storeId,
    branchCode: storeId === 16 ? 'EP' : 'DT',
    branchName: storeId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám',
  };
}

export function useIosAppState(
  initialStep: number = 1,
  enabled: boolean = true,
  initialRole: IosUserRole = 'CVL',
  initialBookingId?: number
) {
  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS);
  const [activeBookingId, setActiveBookingId] = useState<number>(initialBookingId || 336695);
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

  const activeBookingIdRef = useRef<number>(activeBookingId);
  activeBookingIdRef.current = activeBookingId;
  const currentStepRef = useRef<number>(currentStep);
  currentStepRef.current = currentStep;
  const activeTabRef = useRef<string>(activeTab);
  activeTabRef.current = activeTab;
  const [bookingSegment, setBookingSegment] = useState<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>('INCOMING');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // Quản lý ngày xem lịch hẹn (0 = Hôm nay, -1 = Hôm qua, -2 = 2 ngày trước, ...)
  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0);

  const getDateStrForOffset = useCallback((offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }, []);

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

  // Quản lý chi nhánh được chọn (mặc định Đề Thám storeId=6, hoặc Estella Place storeId=16)
  const [selectedStoreId, setSelectedStoreIdState] = useState<number>(6);

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

  const isAdmin = Boolean(
    loggedInUser
      ? isAdminOrSuperAdminRole(loggedInUser?.role)
      : typeof window !== 'undefined' &&
          process.env.NODE_ENV !== 'production' &&
          (window.location.search.includes('admin=1') || window.location.search.includes('role=admin'))
  );

  const canSwitchRole = Boolean(isAdmin);
  const actor = resolveActorProfile(role, loggedInUser);

  // Invariant (UI-010 & Chuyên Viên Salon Anchor):
  // - Chuyên Viên (CV/CVL/CVLL) luôn luôn thuộc về chi nhánh gốc của mình (Khanh Cao, Thảo Ly -> Đề Thám storeId=6).
  // - Kể cả khi Admin kiểm thử chuyển sang vai trò CVL, chi nhánh hiển thị và query BẮT BUỘC là chi nhánh của Chuyên Viên đó.
  // - Chỉ Admin/Quản lý ở vai trò không phải Chuyên Viên (CC/STORE/ADMIN) mới được phép xem/đổi chi nhánh đã chọn.
  const isTechnicianRole = role === 'CVL' || role === 'CVLL' || role === 'CV';
  const effectiveStoreId = isTechnicianRole ? actor.storeId || 6 : selectedStoreId;

  const currentBranch = useMemo(() => {
    return IOS_AVAILABLE_BRANCHES.find((b) => b.id === effectiveStoreId) || IOS_AVAILABLE_BRANCHES[0];
  }, [effectiveStoreId]);

  // Invariant (Kinh Thánh mOS Điều răn UI-010):
  // - CV🪶 (CVL): Luôn luôn bị khóa cứng ở chế độ MY_CUSTOMERS (1 khách kế tiếp đầu tua + khách book của mình)
  //   Tuyệt đối không xem khách của Chuyên Viên khác hoặc các khách chờ phía sau.
  // - Khi vai trò là CVL (kể cả khi Admin đang kiểm thử ?role=CVL), scope BẮT BUỘC là MY_CUSTOMERS.
  // - Admin / Superadmin chỉ xem Toàn bộ sảnh (STORE_ALL) khi ở vai trò CC / STORE / Quản lý.
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
      if (!isAdmin) {
        if (effectiveRole === 'CVL') {
          setScopeModeState('MY_CUSTOMERS');
        } else if (effectiveRole === 'CVLL' || effectiveRole === 'CC' || effectiveRole === 'STORE') {
          setScopeModeState('STORE_ALL');
        }
      }
    },
    [loggedInUser, isAdmin]
  );

  const activeServicingBooking = useMemo(() => {
    return (
      bookings.find((b) => {
        const belongsToActor =
          !['CVL', 'CVLL', 'CV'].includes(role) ||
          b.assignedStaffId === actor.staffId ||
          b.checkInStaffId === actor.staffId ||
          b.checkOutStaffId === actor.staffId;
        if (!belongsToActor) return false;
        // Bất biến: Khách hàng đã DONE hoặc CANCELLED hoặc đã hoàn tất thanh toán/tiến trình thì tuyệt đối không thể là ca làm dở dang!
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
    const shouldFilterCvl = role === 'CVL' || scopeMode === 'MY_CUSTOMERS';
    const list = shouldFilterCvl ? filterBookingsForCvlScope(bookings, actor.staffId) : bookings;

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
  }, [bookings, role, scopeMode, actor.staffId, activeServicingBooking, isAdmin]);

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
    INITIAL_BOOKINGS[0];

  const handleResumeServicing = useCallback(
    async (bookingId?: number) => {
      const targetId =
        bookingId !== undefined
          ? Number(bookingId)
          : activeServicingBooking?.id
            ? Number(activeServicingBooking.id)
            : Number(activeBookingId);
      const targetBooking = bookings.find((b) => Number(b.id) === targetId);
      if (!targetBooking) return;
      setActiveBookingId(targetBooking.id);
      const cached =
        (await getLocalProgressSnapshotAsync(targetBooking.id)) || getLocalProgressSnapshot(targetBooking.id);
      const targetStep =
        targetBooking.progress?.currentStep ||
        cached?.currentStep ||
        (await getActiveServicingStepAsync()) ||
        getActiveServicingStep() ||
        6;
      setActiveTab('task');
      setCurrentStep(targetStep);
    },
    [bookings, activeServicingBooking, activeBookingId]
  );

  const postAction = useCallback(
    async (action: string, payload: Record<string, any> = {}) => {
      const targetBookingId = payload.bookingId !== undefined ? Number(payload.bookingId) : activeBookingId;

      // 1. Chỉ lưu progress thực tế vào snapshot offline nếu có (tránh lưu payload lồng nhau làm phình storage)
      if (payload.progress) {
        saveLocalProgressSnapshot(targetBookingId, payload.progress);
      }

      // 2. Nếu rớt mạng, lưu vào queue chờ sync
      if (typeof window !== 'undefined' && !navigator.onLine) {
        enqueueOfflineAction(action, targetBookingId, payload);
        return { success: false, offlineQueued: true };
      }

      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('mos_token') || '' : '';
        const effectiveAuth = token
          ? `Bearer ${token}`
          : process.env.NODE_ENV !== 'production'
            ? 'Bearer mock-token-for-dev'
            : undefined;
        const apiBase = resolveApiBaseUrl();
        const res = await fetch(`${apiBase}/ios/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(effectiveAuth ? { Authorization: effectiveAuth } : {}),
          },
          body: JSON.stringify({
            bookingId: targetBookingId,
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
            setBookings((prev) =>
              prev.map((b) =>
                Number(b.id) === targetBookingId
                  ? {
                      ...b,
                      progress: {
                        ...(b.progress || {}),
                        ...data.progress,
                        cloudSynced: true,
                        cloudSyncedAt: data.cloudSyncedAt || new Date().toISOString(),
                      },
                    }
                  : b
              )
            );
            saveLocalProgressSnapshot(targetBookingId, {
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
      const storeId = options?.storeId ?? effectiveStoreId;
      const effScope: BookingScopeMode = role === 'CVL' ? 'MY_CUSTOMERS' : options?.scope || scopeMode;
      const effStaffId = options?.staffId ?? actor.staffId;
      const targetDateStr = options?.date ?? getDateStrForOffset(selectedDateOffset);
      const dateQuery = `&date=${encodeURIComponent(targetDateStr)}`;

      setIsRefreshing(true);
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('mos_token') || '' : '';
        const effectiveAuth = token
          ? `Bearer ${token}`
          : process.env.NODE_ENV !== 'production'
            ? 'Bearer mock-token-for-dev'
            : undefined;
        const apiBase = resolveApiBaseUrl();
        const res = await fetch(
          `${apiBase}/ios/bookings?storeId=${storeId}&segment=${seg}&scope=${effScope}&role=${role}&staffId=${effStaffId}${dateQuery}&limit=40`,
          {
            cache: 'no-store',
            headers: effectiveAuth ? { Authorization: effectiveAuth } : undefined,
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.bookings)) {
          setBookings((prev) => {
            const prevMap = new Map(prev.map((p) => [p.id, p]));
            const mergedIncoming = data.bookings.map((incoming: BookingItem) => {
              const existing = prevMap.get(incoming.id);
              const localSnap = getLocalProgressSnapshot(incoming.id);

              // 1. Nếu server hoặc local xác nhận khách hàng này là INCOMING (chưa phục vụ hoặc đã hoàn tác về Chờ đón):
              // Server là nguồn dữ liệu chuẩn xác nhất! Xóa bỏ snapshot rác ở local để triệt tiêu vĩnh viễn Zombie Servicing Session!
              if (incoming.status === 'INCOMING') {
                clearLocalProgressSnapshot(incoming.id);
                const currentActiveServicingId = getActiveServicingBookingId();
                if (currentActiveServicingId && Number(currentActiveServicingId) === Number(incoming.id)) {
                  setActiveServicingBookingId(null);
                  setActiveServicingStep(null);
                }
                return {
                  ...incoming,
                  status: 'INCOMING' as const,
                  progress: undefined,
                  selectedCombo: existing?.selectedCombo || incoming.selectedCombo,
                  selectedUnderCombo: existing?.selectedUnderCombo || incoming.selectedUnderCombo,
                  comboRedemption: existing?.comboRedemption || incoming.comboRedemption,
                };
              }

              // 2. Nếu khách hàng đã hoàn thành (DONE) trên server hoặc ở snapshot/local hoặc có billing.completedAt:
              // Khách hàng hoàn tất thanh toán / dịch vụ BẮT BUỘC nằm ở tab ĐÃ XONG (DONE)!
              const isCompletedDone =
                incoming.status === 'DONE' ||
                existing?.status === 'DONE' ||
                Boolean(incoming.billing?.completedAt) ||
                Boolean(existing?.billing?.completedAt) ||
                (Boolean(incoming.progress?.completedAt) && incoming.status !== 'SERVICING') ||
                (Boolean(existing?.progress?.completedAt) && existing?.status !== 'SERVICING');

              if (isCompletedDone) {
                clearLocalProgressSnapshot(incoming.id);
                const currentActiveServicingId = getActiveServicingBookingId();
                if (currentActiveServicingId && Number(currentActiveServicingId) === Number(incoming.id)) {
                  setActiveServicingBookingId(null);
                  setActiveServicingStep(null);
                }
                return {
                  ...incoming,
                  status: 'DONE' as const,
                  serviceName:
                    existing?.serviceName && !existing.serviceName.toLowerCase().includes('any')
                      ? existing.serviceName
                      : incoming.serviceName,
                  servicePrice: existing?.servicePrice || incoming.servicePrice,
                  serviceType: existing?.serviceType || incoming.serviceType,
                  attributes: { ...(incoming.attributes || {}), ...(existing?.attributes || {}) },
                  selectedCombo: existing?.selectedCombo || incoming.selectedCombo,
                  selectedUnderCombo: existing?.selectedUnderCombo || incoming.selectedUnderCombo,
                  comboRedemption: existing?.comboRedemption || incoming.comboRedemption,
                  cartProducts: existing?.cartProducts || incoming.cartProducts,
                  billing: existing?.billing || incoming.billing,
                  survey: existing?.survey || incoming.survey,
                  checkInStaffId: existing?.checkInStaffId || incoming.checkInStaffId,
                  checkInStaffName: existing?.checkInStaffName || incoming.checkInStaffName,
                  checkOutStaffId: existing?.checkOutStaffId || incoming.checkOutStaffId,
                  checkOutStaffName: existing?.checkOutStaffName || incoming.checkOutStaffName,
                  progress: {
                    ...(incoming.progress || {}),
                    ...(existing?.progress || {}),
                    completedAt:
                      incoming.progress?.completedAt || existing?.progress?.completedAt || new Date().toISOString(),
                    timerRunning: false,
                    currentStep: 1,
                  },
                };
              }

              const isServicing =
                incoming.status === 'SERVICING' ||
                Boolean(incoming.progress?.startedAt && !incoming.progress?.completedAt) ||
                existing?.status === 'SERVICING' ||
                localSnap?.status === 'SERVICING' ||
                Boolean(localSnap?.startedAt && !localSnap?.completedAt) ||
                Boolean(existing?.progress?.startedAt && !existing?.progress?.completedAt);

              if (existing) {
                return {
                  ...incoming,
                  serviceName:
                    existing.serviceName && !existing.serviceName.toLowerCase().includes('any')
                      ? existing.serviceName
                      : incoming.serviceName,
                  servicePrice: existing.servicePrice || incoming.servicePrice,
                  serviceType: existing.serviceType || incoming.serviceType,
                  attributes: { ...(incoming.attributes || {}), ...(existing.attributes || {}) },
                  cvRotationPoints: existing.cvRotationPoints ?? incoming.cvRotationPoints,
                  cvRotationBreakdown: existing.cvRotationBreakdown ?? incoming.cvRotationBreakdown,
                  status: isServicing ? 'SERVICING' : existing.status || incoming.status,
                  progress: isServicing
                    ? {
                        ...(incoming.progress || {}),
                        ...(localSnap || {}),
                        ...(existing.progress || {}),
                      }
                    : undefined,
                  selectedCombo: existing.selectedCombo !== undefined ? existing.selectedCombo : incoming.selectedCombo,
                  selectedUnderCombo:
                    existing.selectedUnderCombo !== undefined
                      ? existing.selectedUnderCombo
                      : incoming.selectedUnderCombo,
                  comboRedemption:
                    existing.comboRedemption !== undefined ? existing.comboRedemption : incoming.comboRedemption,
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
              if (localSnap || isServicing) {
                return {
                  ...incoming,
                  status: isServicing ? 'SERVICING' : incoming.status,
                  progress: isServicing
                    ? {
                        ...(incoming.progress || {}),
                        ...(localSnap || {}),
                      }
                    : undefined,
                };
              }
              return incoming;
            });

            // Bảo toàn ca làm SERVICING hoặc đang có tiến trình dở dang:
            // Chỉ bảo toàn khi đang xem ngày hôm nay (selectedDateOffset === 0),
            // tránh làm rò rỉ khách đang làm của hôm nay sang các ngày quá khứ!
            const incomingIds = new Set(mergedIncoming.map((b: BookingItem) => b.id));
            const preservedServicing =
              selectedDateOffset === 0
                ? prev.filter(
                    (b: BookingItem) =>
                      !incomingIds.has(b.id) &&
                      b.status !== 'DONE' &&
                      b.status !== 'CANCELLED' &&
                      !b.progress?.completedAt &&
                      !b.billing?.completedAt &&
                      (b.status === 'SERVICING' ||
                        (b.status !== 'INCOMING' && Boolean(b.progress?.startedAt) && !b.progress?.completedAt))
                  )
                : [];

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
            ?.filter((b: BookingItem) => {
              const belongsToActor =
                !['CVL', 'CVLL', 'CV'].includes(role) ||
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
              return b.status === 'SERVICING' || (b.status !== 'INCOMING' && Boolean(b.progress?.startedAt));
            })
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

            // Tự động neo setActiveServicingBookingId vào ca làm này nếu chưa có ca làm local ưu tiên hơn
            const currentServicingId = getActiveServicingBookingId();
            if (
              !currentServicingId ||
              !data.bookings?.some(
                (b: BookingItem) => Number(b.id) === Number(currentServicingId) && b.status === 'SERVICING'
              )
            ) {
              setActiveServicingBookingId(servicingId);
            }

            // TUYỆT ĐỐI KHÔNG tự ý ghi đè activeBookingId nếu activeBookingId hiện tại vẫn đang tồn tại trong danh sách!
            // Chỉ đồng bộ khi activeBookingId chưa có hoặc không còn tồn tại trong DB!
            const currentActiveExists = data.bookings.some(
              (b: BookingItem) => Number(b.id) === Number(activeBookingIdRef.current)
            );
            if (!currentActiveExists) {
              setActiveBookingId(servicingId);
            }

            // Chỉ đồng bộ bước servicing, không tự động nhảy màn hình (tránh làm gián đoạn CV đang thao tác)
            if (serverStep && serverStep >= 6) {
              setActiveServicingStep(serverStep);
            }
          } else {
            // Không có ca làm servicing trên server, duy trì active booking an toàn
            const currentActiveExists = data.bookings.some(
              (b: BookingItem) => Number(b.id) === Number(activeBookingIdRef.current)
            );
            if (!currentActiveExists && data.bookings.length > 0) {
              setActiveBookingId(data.bookings[0].id);
            }
          }
        }
      } catch (err) {
        console.warn('Could not refresh from live DB, keeping current state:', err);
      } finally {
        setIsRefreshing(false);
      }
    },
    [bookingSegment, scopeMode, role, actor.staffId, selectedDateOffset, getDateStrForOffset, effectiveStoreId]
  );

  const setSelectedStoreId = useCallback(
    (newStoreId: number) => {
      if (isTechnicianRole) return;
      setSelectedStoreIdState(newStoreId);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mos_ios_selected_store_id', String(newStoreId));
      }
      // Khi Admin đổi chi nhánh: Tự động chuyển xem Toàn Bộ Sảnh (STORE_ALL) của chi nhánh đó
      setScopeModeState('STORE_ALL');
      void refreshDb({ storeId: newStoreId, scope: 'STORE_ALL' });
    },
    [refreshDb, isTechnicianRole]
  );

  const handleDateOffsetChange = useCallback(
    (offset: number) => {
      setSelectedDateOffset(offset);
      const targetDate = getDateStrForOffset(offset);
      // Nếu chuyển về ngày trong quá khứ, tự động chuyển sang tab "Đã xong" (DONE) để xem lịch sử ca làm
      if (offset < 0) {
        setBookingSegment('DONE');
      } else if (offset === 0) {
        setBookingSegment('INCOMING');
      }
      void refreshDb({ date: targetDate });
    },
    [getDateStrForOffset, refreshDb]
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

  // Quyền Admin: Hoàn tác đưa khách hàng từ "Đang làm" trở về "Chờ đón"
  const handleRevertToIncoming = useCallback(
    async (bookingId: number) => {
      const idNum = Number(bookingId);

      // 1. Cập nhật danh sách bookings ngay lập tức: Xóa sạch progress để triệt tiêu Zombie Servicing Session
      setBookings((prev) =>
        prev.map((b) => {
          if (Number(b.id) === idNum) {
            return {
              ...b,
              status: 'INCOMING' as const,
              progress: undefined,
            };
          }
          return b;
        })
      );

      // 2. Xóa snapshot offline và giải phóng khóa active servicing
      clearLocalProgressSnapshot(idNum);
      setActiveServicingBookingId(null);
      setActiveServicingStep(null);

      // 3. Nếu đang mở đúng ca này, quay về màn hình danh sách với tab Chờ đón
      if (Number(activeBookingIdRef.current) === idNum) {
        setActiveTab('schedule');
        setBookingSegment('INCOMING');
        setCurrentStep(1);
      }

      // 4. Đồng bộ hành động lên server
      try {
        await postAction('REVERT_TO_INCOMING', { bookingId: idNum });
      } catch (err) {
        console.warn('Failed to post REVERT_TO_INCOMING:', err);
      }

      // 5. Làm mới DB ngay lập tức để đồng bộ lại các client khác
      void refreshDb();
    },
    [postAction, refreshDb]
  );

  // Step 2: Check-in action (Ai bấm Check-in nhận 10% Tip Check-in)
  const handleCheckIn = (targetBookingId?: number) => {
    const targetId = targetBookingId !== undefined ? Number(targetBookingId) : activeBookingId;
    setActiveBookingId(targetId);
    activeBookingIdRef.current = targetId;

    setBookings((prev) =>
      prev.map((b) => {
        if (Number(b.id) === targetId) {
          const shouldAutoAssignToActor = role === 'CVL';
          return {
            ...b,
            status: 'CHECKED_IN',
            checkInStaffId: actor.staffId,
            checkInStaffName: actor.name,
            checkInStaffTier: actor.tier,
            checkInStaffAvatar: actor.avatar,
            assignedStaffId: b.assignedStaffId || (shouldAutoAssignToActor ? actor.staffId : 0),
            assignedStaffName:
              b.assignedStaffName && b.assignedStaffName !== 'Chờ phân công (Đầu tua)'
                ? b.assignedStaffName
                : shouldAutoAssignToActor
                  ? actor.name
                  : b.assignedStaffName || 'Chờ phân công (Đầu tua)',
            assignedStaffAvatar: b.assignedStaffAvatar || (shouldAutoAssignToActor ? actor.avatar : undefined),
            isUnassignedQueue: shouldAutoAssignToActor ? false : b.isUnassignedQueue,
            isNextQueueCustomer: shouldAutoAssignToActor ? false : b.isNextQueueCustomer,
            progress: {
              ...(b.progress || { elapsedSeconds: 0, timerRunning: false }),
              currentStep: 3,
            },
          };
        }
        return b;
      })
    );
    setBookingSegment('SERVICING');
    void postAction('CHECK_IN', { bookingId: targetId });
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
      naturalLashCount?: string;
      isNewClientDiagnosticDone?: boolean;
      lashHealth?: string;
      lashTrail?: string;
      medicalProblem?: string;
      notes?: string;
    },
    selectedCombo?: BookingItem['selectedCombo'] | null,
    skuPricing?: {
      skuName?: string;
      skuPrice?: number;
      upgradePrice?: number;
      cvPoints?: number;
      cvBreakdown?: string;
      serviceType?: string;
    } | null,
    targetBookingId?: number,
    selectedUnderCombo?: BookingItem['selectedUnderCombo'] | null,
    assignmentMode?: 'SELF_SERVICE' | 'ASSIGN_OTHER'
  ) => {
    const targetId = targetBookingId !== undefined ? Number(targetBookingId) : activeBookingId;
    setActiveBookingId(targetId);
    activeBookingIdRef.current = targetId;

    const targetBooking = bookings.find((b) => Number(b.id) === targetId) || activeBooking;
    const isSelfAssignedCv =
      role === 'CVL' ||
      (role === 'CVLL' &&
        (assignmentMode
          ? assignmentMode === 'SELF_SERVICE'
          : !targetBooking.assignedStaffId || targetBooking.assignedStaffId === actor.staffId));

    if (isSelfAssignedCv) {
      setActiveServicingBookingId(targetId);
      saveLocalProgressSnapshot(targetId, {
        currentStep: 6,
        status: 'SERVICING',
        bookingId: targetId,
      });
    }

    setBookings((prev) =>
      prev.map((b) => {
        if (Number(b.id) !== targetId) return b;
        const nextCombo = selectedCombo !== undefined ? selectedCombo : b.selectedCombo || null;
        const nextUnderCombo = selectedUnderCombo !== undefined ? selectedUnderCombo : b.selectedUnderCombo || null;
        const nextServiceName =
          skuPricing?.skuName ||
          (b.serviceName && !b.serviceName.toLowerCase().includes('any') ? b.serviceName : 'New Hyperlight 550');
        const nextServicePrice = skuPricing?.skuPrice || b.servicePrice;
        const nextUpgradePrice = skuPricing?.upgradePrice ?? b.upgradePrice ?? 0;
        const originalBookedServiceName =
          b.originalBookedServiceName && !b.originalBookedServiceName.toLowerCase().includes('any')
            ? b.originalBookedServiceName
            : nextServiceName;
        const originalBookedServicePrice = b.originalBookedServicePrice || b.servicePrice;

        const isClientComboLive = Boolean(b.comboLiveStatus?.isComboLive);
        const comboPrice = (nextCombo ? nextCombo.price : 0) + (nextUnderCombo ? nextUnderCombo.price : 0);
        const effectiveServiceTotal = resolveEffectiveServiceTotal({
          servicePrice: nextServicePrice,
          upgradePrice: nextUpgradePrice,
          isComboLive: isClientComboLive,
          selectedCombo: nextCombo,
          comboRedemption: b.comboRedemption,
        });
        const productTotal = (b.cartProducts || []).reduce((s, p) => s + p.price * p.quantity, 0);
        const subtotal = effectiveServiceTotal + comboPrice + productTotal;
        const vatRate = 0.08;
        const vatAmount = Math.round(subtotal * vatRate);
        const tipAmount = b.billing?.tipAmount ?? 0;
        const grandTotal = subtotal + vatAmount + tipAmount;

        const nextAssignedStaffId = isSelfAssignedCv
          ? b.assignedStaffId || actor.staffId
          : b.assignedStaffId && b.assignedStaffId !== actor.staffId
            ? b.assignedStaffId
            : 0;
        const nextAssignedStaffName = isSelfAssignedCv
          ? b.assignedStaffName && b.assignedStaffName !== 'Chờ phân công (Đầu tua)'
            ? b.assignedStaffName
            : actor.name
          : b.assignedStaffName && b.assignedStaffName !== actor.name
            ? b.assignedStaffName
            : 'Chờ phân công (Đầu tua)';

        return {
          ...b,
          attributes,
          serviceType: skuPricing?.serviceType || b.serviceType || 'Normal',
          serviceName: nextServiceName,
          servicePrice: nextServicePrice,
          originalBookedServiceName,
          originalBookedServicePrice,
          upgradePrice: nextUpgradePrice,
          cvRotationPoints: skuPricing?.cvPoints ?? b.cvRotationPoints,
          cvRotationBreakdown: skuPricing?.cvBreakdown ?? b.cvRotationBreakdown,
          selectedCombo: nextCombo,
          selectedUnderCombo: nextUnderCombo,
          checkInStaffId: b.checkInStaffId || actor.staffId,
          checkInStaffName: b.checkInStaffName || actor.name,
          checkInStaffTier: b.checkInStaffTier || actor.tier,
          checkInStaffAvatar: b.checkInStaffAvatar || actor.avatar,
          assignedStaffId: nextAssignedStaffId,
          assignedStaffName: nextAssignedStaffName,
          assignedStaffAvatar: isSelfAssignedCv ? b.assignedStaffAvatar || actor.avatar : b.assignedStaffAvatar,
          isUnassignedQueue: !isSelfAssignedCv && nextAssignedStaffId === 0,
          isNextQueueCustomer: !isSelfAssignedCv && nextAssignedStaffId === 0,
          status: isSelfAssignedCv ? 'SERVICING' : 'CHECKED_IN',
          billing: {
            subtotal,
            vatRate,
            vatAmount,
            serviceTotal: effectiveServiceTotal,
            comboTotal: comboPrice,
            productTotal,
            paymentMethod: b.billing?.paymentMethod || 'VIETQR',
            tipAmount,
            tipCvShare: Math.round(tipAmount * 0.7),
            tipCheckInShare: Math.round(tipAmount * 0.1),
            tipCheckOutShare: Math.round(tipAmount * 0.1),
            tipCcShare: Math.round(tipAmount * 0.2),
            grandTotal,
          },
        };
      })
    );

    void postAction('SAVE_CONSULTATION', {
      bookingId: targetId,
      attributes,
      selectedCombo: selectedCombo !== undefined ? selectedCombo : targetBooking.selectedCombo || null,
      selectedUnderCombo:
        selectedUnderCombo !== undefined ? selectedUnderCombo : targetBooking.selectedUnderCombo || null,
      skuPricing,
      assignmentMode: isSelfAssignedCv ? 'SELF_SERVICE' : 'ASSIGN_OTHER',
      nextStatus: isSelfAssignedCv ? 'SERVICING' : 'CHECKED_IN',
    });

    if (consultationReturnStep) {
      const nextStep = consultationReturnStep;
      setConsultationReturnStep(null);
      setCurrentStep(nextStep);
      return;
    }

    if (isSelfAssignedCv) {
      // CV🪶 hoặc 🪶CV🪶 tự nhận làm mi -> vào thẳng màn hình Nhận ca / Chụp ảnh tiến trình mi, không cần qua CC chia ca!
      setBookingSegment('SERVICING');
      setCurrentStep(6);
    } else {
      // 🪶CV🪶 tư vấn chéo hộ CV khác hoặc CC -> sang bước xác nhận CV làm mi (Step 4)
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
  const handleCvStartTask = (durationMinutes?: number) => {
    const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
    const effectiveDuration = durationMinutes || activeBooking.serviceDuration || 60;
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 0 }),
      startedAt,
      timerRunning: true,
      currentStep: 7,
      targetDurationMinutes: effectiveDuration,
    };
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'SERVICING',
      serviceDuration: effectiveDuration,
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
  const handleAutoSavePhoto = async (
    type: 'before' | 'cleaned' | 'after',
    photoUrl: string,
    extraMeta?: { retainLashes?: { left: number; right: number } }
  ) => {
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
      if (extraMeta?.retainLashes) {
        progressPatch.retainLashCountLeft = extraMeta.retainLashes.left;
        progressPatch.retainLashCountRight = extraMeta.retainLashes.right;
        progressPatch.retainLashes = extraMeta.retainLashes;
        progressPatch.retainAttributeValues = {
          '17': {
            attribute_option_value: String(extraMeta.retainLashes.left),
            attribute_key: 'extension-lash-count-left',
          },
          '18': {
            attribute_option_value: String(extraMeta.retainLashes.right),
            attribute_key: 'extension-lash-count-right',
          },
        };
      }
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
  const handleSaveCleanedPhoto = (photoUrl: string, retainLashes?: { left: number; right: number }) => {
    const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
    const progressPatch: any = {
      ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
      cleanedPhotoUrl: photoUrl,
      timerRunning: true,
      startedAt,
      currentStep: 9,
    };
    if (retainLashes) {
      progressPatch.retainLashCountLeft = retainLashes.left;
      progressPatch.retainLashCountRight = retainLashes.right;
      progressPatch.retainLashes = retainLashes;
      progressPatch.retainAttributeValues = {
        '17': {
          attribute_option_value: String(retainLashes.left),
          attribute_key: 'extension-lash-count-left',
        },
        '18': {
          attribute_option_value: String(retainLashes.right),
          attribute_key: 'extension-lash-count-right',
        },
      };
    }
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

  // Delegated Billing & Checkout Handlers (Modular Slice)
  const { handleGoToBilling, handleChoosePaymentMethod, handleRecordTip, handleFinishOrder } = useIosBillingCheckout({
    activeBookingId,
    actor,
    updateActiveBooking,
    postAction,
    setCurrentStep,
    setBookingSegment,
  });

  return {
    bookings: visibleBookings,
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
    handleRevertToIncoming,
    selectedDateOffset,
    handleDateOffsetChange,
    selectedStoreId: effectiveStoreId,
    setSelectedStoreId,
    currentBranch,
    availableBranches: IOS_AVAILABLE_BRANCHES,
  };
}
