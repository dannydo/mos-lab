'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { apiClient } from '~/lib/api-client';
import { BookingItem, INITIAL_BOOKINGS, filterBookingsForCvlScope } from './mockData';
import { mergeServerBookingsWithLocalState } from './iosBookingMerge';
import { enqueueOfflineAction, saveLocalProgressSnapshot } from './offlineSync';
import type {
  BookingScopeMode,
  IosUserRole,
  SegmentCounts,
  StaffMonthlyStats,
  ActiveActorProfile,
} from './iosActorProfile';

export interface UseIosBookingListParams {
  enabled: boolean;
  role: IosUserRole;
  scopeMode: BookingScopeMode;
  actor: ActiveActorProfile;
  initialRole?: IosUserRole;
  activeBookingId: number;
  selectedStoreId?: number;
  isDemoMode?: boolean;
}

export function useIosBookingList({
  enabled,
  role,
  scopeMode,
  actor,
  activeBookingId,
  selectedStoreId = 6,
  isDemoMode = false,
}: UseIosBookingListParams) {
  const isTechnicianRole = role === 'CVL' || role === 'CVLL' || role === 'CV';
  const effectiveStoreId = isTechnicianRole ? actor.storeId || 6 : selectedStoreId;

  const [bookings, setBookings] = useState<BookingItem[]>(() => (isDemoMode ? INITIAL_BOOKINGS : []));
  const [bookingSegment, setBookingSegment] = useState<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>('INCOMING');
  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0);
  const [countsState, setCounts] = useState<SegmentCounts>(() => ({
    incoming: isDemoMode ? 3 : 0,
    servicing: 0,
    done: 0,
    cancel: 0,
  }));
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

  const handleDateOffsetChange = useCallback((offset: number) => {
    setSelectedDateOffset(offset);
  }, []);

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
          if (data?.progress) {
            setBookings((prev) =>
              prev.map((b) =>
                Number(b.id) === targetBookingId
                  ? {
                      ...b,
                      progress: {
                        elapsedSeconds: b.progress?.elapsedSeconds ?? 0,
                        timerRunning: b.progress?.timerRunning ?? false,
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
        }

        enqueueOfflineAction(action, targetBookingId, payload);
        return { success: false };
      } catch (err) {
        console.warn('[useIosBookingList] Failed to persist action, queued offline:', action, err);
        enqueueOfflineAction(action, targetBookingId, payload);
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

      setIsRefreshing(true);
      try {
        const data = await apiClient.ios.getBookings({
          storeId,
          segment: seg,
          scope: effScope,
          role,
          staffId: effStaffId,
          date: targetDateStr,
          limit: 40,
          ...(isDemoMode ? { demo: true } : {}),
        });

        if (data?.success && Array.isArray(data.bookings)) {
          setBookings((prev) => mergeServerBookingsWithLocalState(prev, data.bookings, selectedDateOffset));
          if (data.counts) {
            setCounts(data.counts);
          }
          if (data.staffStats) {
            setStaffStats(data.staffStats);
          }
          setIsLiveDb(true);
          setLastRefreshedAt(new Date().toLocaleTimeString('vi-VN'));
        }
      } catch (err) {
        console.warn('[useIosBookingList] Live DB fetch failed, staying on current data:', err);
        setIsLiveDb(false);
        if (isDemoMode) {
          setBookings((prev) => (prev.length > 0 ? prev : INITIAL_BOOKINGS));
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [
      actor.staffId,
      bookingSegment,
      effectiveStoreId,
      getDateStrForOffset,
      isDemoMode,
      role,
      scopeMode,
      selectedDateOffset,
    ]
  );

  useEffect(() => {
    if (!enabled) return;
    void refreshDb();
  }, [enabled, refreshDb, selectedDateOffset]);

  const visibleBookings = useMemo(() => {
    if (role === 'CVL') {
      return filterBookingsForCvlScope(bookings, actor.staffId);
    }
    return bookings;
  }, [bookings, role, actor.staffId]);

  const counts = useMemo(() => {
    const list = visibleBookings;
    return {
      incoming: list.filter((b) => b.status === 'INCOMING' || b.status === 'CHECKED_IN').length,
      servicing: list.filter((b) => b.status === 'SERVICING').length,
      done: list.filter((b) => b.status === 'DONE').length,
      cancel: list.filter((b) => b.status === 'CANCELLED').length,
    };
  }, [visibleBookings]);

  return {
    bookings,
    setBookings,
    visibleBookings,
    bookingSegment,
    setBookingSegment,
    selectedDateOffset,
    handleDateOffsetChange,
    getDateStrForOffset,
    counts: isLiveDb && countsState.incoming > 0 ? countsState : counts,
    staffStats,
    isRefreshing,
    lastRefreshedAt,
    isLiveDb,
    isDemoMode,
    refreshDb,
    postAction,
  };
}
