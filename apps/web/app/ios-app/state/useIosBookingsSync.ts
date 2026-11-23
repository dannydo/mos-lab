'use client';

import { useState, useEffect, useCallback, useRef, MutableRefObject, Dispatch, SetStateAction } from 'react';
import { canSwitchIosBranch } from '@mos-lab/shared';
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
import type { IosUserRole, BookingScopeMode, StaffMonthlyStats, ActiveActorProfile } from './iosActorProfile';

export interface UseIosBookingsSyncParams {
  enabled: boolean;
  isDemoMode: boolean;
  isSimulationMode?: boolean;
  menteeStaffId?: number;
  isReadOnlyMentorView?: boolean;
  onSimulationMetaLoaded?: (meta: {
    isReadOnlyMentorView?: boolean;
    simulationActorStaffName?: string;
    simulationActorStaffId?: number;
  }) => void;
  isAdmin?: boolean;
  role: IosUserRole;
  effectiveStoreId: number;
  scopeMode: BookingScopeMode;
  setScopeModeState: Dispatch<SetStateAction<BookingScopeMode>>;
  setSelectedStoreIdState: Dispatch<SetStateAction<number>>;
  setServerAssignedStoreId?: Dispatch<SetStateAction<number | null>>;
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
  isSimulationMode = false,
  menteeStaffId,
  isReadOnlyMentorView = false,
  onSimulationMetaLoaded,
  isAdmin = false,
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
}: UseIosBookingsSyncParams) {
  const [totalStoreCount, setTotalStoreCount] = useState<number | undefined>(undefined);
  const [staffStats, setStaffStats] = useState<StaffMonthlyStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);
  const isRefreshInFlightRef = useRef<boolean>(false);

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
          if (cached && cached.status !== 'DONE' && !cached.completedAt) {
            setBookings((prev) =>
              prev.map((b) =>
                b.id === idNum && b.status !== 'DONE' && !b.billing?.completedAt
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
      if (isReadOnlyMentorView) {
        return { success: false, error: 'Mentor đang ở chế độ chỉ đọc.' };
      }
      const targetBookingId = payload.bookingId !== undefined ? Number(payload.bookingId) : activeBookingId;
      const isSimAction = isSimulationMode || Boolean(payload.simulationMode) || String(action).startsWith('SIM_');

      if (payload.progress) {
        saveLocalProgressSnapshot(targetBookingId, payload.progress);
      }

      if (typeof window !== 'undefined' && !navigator.onLine) {
        if (!isSimAction) {
          enqueueOfflineAction(action, targetBookingId, payload);
        }
        return { success: false, offlineQueued: !isSimAction };
      }

      try {
        const data = (await apiClient.ios.executeBookingAction({
          bookingId: targetBookingId,
          action: action as any,
          actorStaffId: actor.staffId,
          actorStaffName: actor.name,
          actorStaffTier: actor.tier,
          ...(isSimulationMode ? { simulationMode: true } : {}),
          ...payload,
        })) as {
          success?: boolean;
          progress?: Record<string, any>;
          cloudSyncedAt?: string;
          simulationAttemptCount?: number;
          simulationFastForwardUnlocked?: boolean;
          attemptSnapshot?: Record<string, any>;
          [key: string]: any;
        };

        if (data?.success !== false) {
          if (data?.progress || data?.override || data?.simulationAttemptCount !== undefined) {
            setBookings((prev) =>
              prev.map((b) =>
                Number(b.id) === targetBookingId
                  ? {
                      ...b,
                      ...(data?.override?.checkInStaffId
                        ? {
                            checkInStaffId: Number(data.override.checkInStaffId),
                            checkInStaffName: data.override.checkInStaffName || b.checkInStaffName,
                            checkInStaffTier: data.override.checkInStaffTier || b.checkInStaffTier,
                          }
                        : {}),
                      ...(data?.override?.assignedStaffId
                        ? {
                            assignedStaffId: Number(data.override.assignedStaffId),
                            assignedStaffName: data.override.assignedStaffName || b.assignedStaffName,
                          }
                        : {}),
                      ...(data?.override?.orderState
                        ? {
                            orderState: data.override.orderState,
                          }
                        : {}),
                      ...(data?.override?.status
                        ? {
                            status: data.override.status,
                          }
                        : {}),
                      ...(data?.simulationAttemptCount !== undefined
                        ? {
                            simulationAttemptCount: Number(data.simulationAttemptCount),
                            simulationFastForwardUnlocked: Boolean(
                              data.simulationFastForwardUnlocked ?? Number(data.simulationAttemptCount) >= 1
                            ),
                          }
                        : {}),
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

        if (!isSimAction) {
          enqueueOfflineAction(action, targetBookingId, payload);
        }
        return { success: false, data };
      } catch (err) {
        console.warn('[useIosBookingsSync] Failed to persist action:', action, err);
        if (!isSimAction) {
          enqueueOfflineAction(action, targetBookingId, payload);
        }
        return { success: false, error: err };
      }
    },
    [activeBookingId, actor.staffId, actor.name, actor.tier, isReadOnlyMentorView, isSimulationMode, setBookings]
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
      if (options?.isPolling && isRefreshInFlightRef.current) {
        return;
      }
      const seg = options?.segment || bookingSegment;
      const storeId = options?.storeId ?? effectiveStoreId;
      const effScope: BookingScopeMode =
        role === 'CVL' ? 'MY_CUSTOMERS' : role === 'CC' || role === 'STORE' ? 'STORE_ALL' : options?.scope || scopeMode;
      const effStaffId = options?.staffId ?? actor.staffId;
      const targetDateStr = options?.date ?? getDateStrForOffset(selectedDateOffset);

      isRefreshInFlightRef.current = true;
      if (!options?.isPolling) {
        setIsRefreshing(true);
      }
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
            ...(isDemoMode && !isSimulationMode ? { demo: true } : {}),
            ...(isSimulationMode ? { sim: true, ...(menteeStaffId ? { menteeStaffId } : {}) } : {}),
          },
          options?.isPolling ? { isPolling: true } : undefined
        );

        if (isSimulationMode) {
          onSimulationMetaLoaded?.({
            isReadOnlyMentorView: data?.isReadOnlyMentorView,
            simulationActorStaffName: data?.simulationActorStaffName,
            simulationActorStaffId: data?.simulationActorStaffId,
          });
        }

        if (data?.success && Array.isArray(data.bookings)) {
          if (!isAdmin && data.storeId && Number(data.storeId) > 0) {
            setServerAssignedStoreId?.(Number(data.storeId));
          }
          setBookings((prev) => mergeServerBookingsWithLocalState(prev, data.bookings, selectedDateOffset, storeId));
          if (typeof data.totalStoreCount === 'number') {
            setTotalStoreCount(data.totalStoreCount);
          } else if (effScope === 'STORE_ALL') {
            setTotalStoreCount(data.bookings.length);
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
        isRefreshInFlightRef.current = false;
        if (!options?.isPolling) {
          setIsRefreshing(false);
        }
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
      isSimulationMode,
      menteeStaffId,
      onSimulationMetaLoaded,
      activeBookingIdRef,
      setActiveBookingId,
      setBookings,
      isAdmin,
      setServerAssignedStoreId,
    ]
  );

  const setSelectedStoreId = useCallback(
    (newStoreId: number) => {
      if (!canSwitchIosBranch({ isAdmin, iosRole: role })) return;
      setSelectedStoreIdState(newStoreId);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mos_ios_selected_store_id', String(newStoreId));
      }
      setBookings([]);
      setScopeModeState('STORE_ALL');
      void refreshDb({ storeId: newStoreId, scope: 'STORE_ALL' });
    },
    [refreshDb, isAdmin, role, setBookings, setScopeModeState, setSelectedStoreIdState]
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
        await postAction(isSimulationMode ? 'SIM_RESET_TO_INCOMING' : 'REVERT_TO_INCOMING', { bookingId: idNum });
      } catch (err) {
        console.warn('Failed to post revert to incoming action:', err);
      }

      void refreshDb();
    },
    [
      activeBookingIdRef,
      isSimulationMode,
      postAction,
      refreshDb,
      setActiveTab,
      setBookingSegment,
      setBookings,
      setCurrentStep,
    ]
  );

  return {
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
  };
}
