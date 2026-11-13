'use client';

import { useState, useEffect, useCallback, MutableRefObject, Dispatch, SetStateAction } from 'react';
import { apiClient } from '~/lib/api-client';
import { BookingItem, INITIAL_BOOKINGS } from './mockData';
import { mergeServerBookingsWithLocalState } from './iosBookingMerge';
import {
  enqueueOfflineAction,
  saveLocalProgressSnapshot,
  syncPendingActions,
  getLocalProgressSnapshotAsync,
  getActiveServicingBookingId,
  getActiveServicingBookingIdAsync,
  setActiveServicingBookingId,
  getActiveServicingStep,
  getActiveServicingStepAsync,
  setActiveServicingStep,
  clearLocalProgressSnapshot,
} from './offlineSync';
import type {
  IosUserRole,
  BookingScopeMode,
  SegmentCounts,
  StaffMonthlyStats,
  ActiveActorProfile,
} from './iosActorProfile';

export interface UseIosBookingsSyncParams {
  enabled: boolean;
  isDemoMode: boolean;
  isAdmin?: boolean;
  role: IosUserRole;
  isTechnicianRole: boolean;
  effectiveStoreId: number;
  scopeMode: BookingScopeMode;
  setScopeModeState: Dispatch<SetStateAction<BookingScopeMode>>;
  setSelectedStoreIdState: Dispatch<SetStateAction<number>>;
  actor: ActiveActorProfile;
  activeBookingId: number;
  setActiveBookingId: Dispatch<SetStateAction<number>>;
  activeBookingIdRef: MutableRefObject<number>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setActiveTab: Dispatch<SetStateAction<string>>;
  bookingSegment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
  setBookingSegment: Dispatch<SetStateAction<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>>;
  selectedDateOffset: number;
  setSelectedDateOffset: Dispatch<SetStateAction<number>>;
  setBookings: Dispatch<SetStateAction<BookingItem[]>>;
}

export function useIosBookingsSync({
  enabled,
  isDemoMode,
  isAdmin = false,
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
}: UseIosBookingsSyncParams) {
  const [, setCounts] = useState<SegmentCounts>({ incoming: 0, servicing: 0, done: 0, cancel: 0 });
  const [staffStats, setStaffStats] = useState<StaffMonthlyStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);

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
            setBookings((prev) =>
              prev.map((b) =>
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
              )
            );

            const savedStep = cached.currentStep || (await getActiveServicingStepAsync()) || getActiveServicingStep();
            if (savedStep && savedStep >= 6) {
              setCurrentStep(savedStep);
              setActiveTab('task');
            }
          }
        }
      } catch (err) {
        console.warn('[useIosBookingsSync] Failed to restore active session:', err);
      }
    };

    void restoreActiveSession();
  }, [setActiveBookingId, setActiveTab, setBookings, setCurrentStep]);

  const postAction = useCallback(
    async (action: string, payload: Record<string, any> = {}) => {
      const targetBookingId = payload.bookingId !== undefined ? Number(payload.bookingId) : activeBookingId;

      if (payload.progress) {
        saveLocalProgressSnapshot(targetBookingId, payload.progress);
      }

      if (typeof window !== 'undefined' && !navigator.onLine) {
        enqueueOfflineAction(action, targetBookingId, payload);
        return { success: false, offlineQueued: true };
      }

      try {
        const data = (await apiClient.ios.executeBookingAction({
          bookingId: targetBookingId,
          action: action as any,
          actorStaffId: actor.staffId,
          actorStaffName: actor.name,
          actorStaffTier: actor.tier,
          ...payload,
        })) as { success?: boolean; progress?: Record<string, any>; cloudSyncedAt?: string; [key: string]: any };

        if (data?.success !== false) {
          if (data?.progress || data?.override?.billing) {
            setBookings((prev) =>
              prev.map((b) =>
                Number(b.id) === targetBookingId
                  ? {
                      ...b,
                      ...(data?.override?.billing
                        ? {
                            billing: {
                              ...(b.billing || ({} as any)),
                              ...data.override.billing,
                            },
                          }
                        : {}),
                      ...(data?.progress
                        ? {
                            progress: {
                              elapsedSeconds: b.progress?.elapsedSeconds ?? 0,
                              timerRunning: b.progress?.timerRunning ?? false,
                              ...(b.progress || {}),
                              ...data.progress,
                              cloudSynced: true,
                              cloudSyncedAt: data.cloudSyncedAt || new Date().toISOString(),
                            },
                          }
                        : {}),
                    }
                  : b
              )
            );
            if (data?.progress) {
              saveLocalProgressSnapshot(targetBookingId, {
                ...data.progress,
                cloudSynced: true,
                cloudSyncedAt: data.cloudSyncedAt || new Date().toISOString(),
              });
            }
          }
          return { success: true, data };
        }

        enqueueOfflineAction(action, targetBookingId, payload);
        return { success: false };
      } catch (err) {
        console.warn('[useIosBookingsSync] Failed to persist action, queued offline:', action, err);
        enqueueOfflineAction(action, targetBookingId, payload);
        return { success: false, error: err };
      }
    },
    [activeBookingId, actor.staffId, actor.name, actor.tier, setBookings]
  );

  const refreshDb = useCallback(
    async (options?: {
      segment?: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
      storeId?: number;
      scope?: BookingScopeMode;
      staffId?: number;
      date?: string;
      isPolling?: boolean;
    }) => {
      const seg = options?.segment || bookingSegment;
      const storeId = options?.storeId ?? effectiveStoreId;
      const effScope: BookingScopeMode = role === 'CVL' ? 'MY_CUSTOMERS' : options?.scope || scopeMode;
      const effStaffId = options?.staffId ?? actor.staffId;
      const targetDateStr = options?.date ?? getDateStrForOffset(selectedDateOffset);

      setIsRefreshing(true);
      try {
        const data = await apiClient.ios.getBookings(
          {
            storeId,
            segment: seg,
            scope: effScope,
            role,
            staffId: effStaffId,
            date: targetDateStr,
            limit: 200,
            ...(isDemoMode ? { demo: true } : {}),
          },
          options?.isPolling ? { isPolling: true } : undefined
        );

        if (data?.success && Array.isArray(data.bookings)) {
          if (!isAdmin && data.storeId && Number(data.storeId) !== effectiveStoreId) {
            setSelectedStoreIdState(Number(data.storeId));
          }
          setBookings((prev) => mergeServerBookingsWithLocalState(prev, data.bookings, selectedDateOffset));
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

          // Đồng bộ đa thiết bị tức thì (Real-time Cross-Device Session Sync)
          const serverActiveServicing = data.bookings
            ?.filter((b: BookingItem) => {
              if (!['CVL', 'CVLL', 'CV'].includes(role)) return false;
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

            if (serverActiveServicing.progress) {
              saveLocalProgressSnapshot(servicingId, {
                ...serverActiveServicing.progress,
                status: 'SERVICING',
              });
            }

            const currentServicingId = getActiveServicingBookingId();
            if (
              !currentServicingId ||
              !data.bookings?.some(
                (b: BookingItem) => Number(b.id) === Number(currentServicingId) && b.status === 'SERVICING'
              )
            ) {
              setActiveServicingBookingId(servicingId);
            }

            const currentActiveExists = data.bookings.some(
              (b: BookingItem) => Number(b.id) === Number(activeBookingIdRef.current)
            );
            if (!currentActiveExists) {
              setActiveBookingId(servicingId);
            }

            if (serverStep && serverStep >= 6) {
              setActiveServicingStep(serverStep);
            }
          } else {
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
        setIsLiveDb(false);
        if (isDemoMode) {
          setBookings((prev) => (prev.length > 0 ? prev : INITIAL_BOOKINGS));
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [
      bookingSegment,
      scopeMode,
      role,
      actor.staffId,
      selectedDateOffset,
      getDateStrForOffset,
      effectiveStoreId,
      isDemoMode,
      activeBookingIdRef,
      setActiveBookingId,
      setBookings,
      isAdmin,
      setSelectedStoreIdState,
    ]
  );

  const setSelectedStoreId = useCallback(
    (newStoreId: number) => {
      if (!isAdmin || isTechnicianRole) return;
      setSelectedStoreIdState(newStoreId);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mos_ios_selected_store_id', String(newStoreId));
      }
      setScopeModeState('STORE_ALL');
      void refreshDb({ storeId: newStoreId, scope: 'STORE_ALL' });
    },
    [refreshDb, isTechnicianRole, setScopeModeState, setSelectedStoreIdState]
  );

  const handleDateOffsetChange = useCallback(
    (offset: number) => {
      setSelectedDateOffset(offset);
      const targetDate = getDateStrForOffset(offset);
      if (offset < 0) {
        setBookingSegment('DONE');
      } else if (offset === 0) {
        setBookingSegment('INCOMING');
      }
      void refreshDb({ date: targetDate });
    },
    [getDateStrForOffset, refreshDb, setBookingSegment, setSelectedDateOffset]
  );

  useEffect(() => {
    if (!enabled) return;
    void refreshDb();
  }, [bookingSegment, scopeMode, role, enabled, refreshDb]);

  // Tự động đồng bộ tức thì xuyên thiết bị (Cross-device Real-time Sync)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshDb({ isPolling: true });
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

  // Quyền Admin: Hoàn tác đưa khách hàng từ "Đang làm" trở về "Chờ đón"
  const handleRevertToIncoming = useCallback(
    async (bookingId: number) => {
      const idNum = Number(bookingId);

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

      clearLocalProgressSnapshot(idNum);
      setActiveServicingBookingId(null);
      setActiveServicingStep(null);

      if (Number(activeBookingIdRef.current) === idNum) {
        setActiveTab('schedule');
        setBookingSegment('INCOMING');
        setCurrentStep(1);
      }

      try {
        await postAction('REVERT_TO_INCOMING', { bookingId: idNum });
      } catch (err) {
        console.warn('Failed to post REVERT_TO_INCOMING:', err);
      }

      void refreshDb();
    },
    [activeBookingIdRef, postAction, refreshDb, setActiveTab, setBookingSegment, setBookings, setCurrentStep]
  );

  return {
    staffStats,
    isRefreshing,
    lastRefreshedAt,
    isLiveDb,
    refreshDb,
    postAction,
    setSelectedStoreId,
    handleDateOffsetChange,
    handleRevertToIncoming,
  };
}
