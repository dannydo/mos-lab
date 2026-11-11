'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { BookingItem, INITIAL_BOOKINGS, filterBookingsForCvlScope } from './mockData';
import {
  enqueueOfflineAction,
  saveLocalProgressSnapshot,
  getLocalProgressSnapshot,
  getActiveServicingBookingId,
  setActiveServicingBookingId,
  setActiveServicingStep,
  clearLocalProgressSnapshot,
} from './offlineSync';
import { resolveApiBaseUrl } from '~/lib/api-base-url';
import { BookingScopeMode, IosUserRole, SegmentCounts, StaffMonthlyStats, ActiveActorProfile } from './useIosAppState';

export interface UseIosBookingListParams {
  enabled: boolean;
  role: IosUserRole;
  scopeMode: BookingScopeMode;
  actor: ActiveActorProfile;
  initialRole?: IosUserRole;
  activeBookingId: number;
  selectedStoreId?: number;
}

export function useIosBookingList({
  enabled,
  role,
  scopeMode,
  actor,
  activeBookingId,
  selectedStoreId = 6,
}: UseIosBookingListParams) {
  const isTechnicianRole = role === 'CVL' || role === 'CVLL' || role === 'CV';
  const effectiveStoreId = isTechnicianRole ? actor.storeId || 6 : selectedStoreId;

  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS);
  const [bookingSegment, setBookingSegment] = useState<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>('INCOMING');
  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0);
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
        console.warn('[useIosBookingList] Failed to persist action, queued offline:', action, err);
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

              if (incoming.status === 'DONE' || localSnap?.status === 'DONE' || incoming.billing?.completedAt) {
                return {
                  ...incoming,
                  status: 'DONE' as const,
                  progress: {
                    ...(incoming.progress || {}),
                    ...(localSnap || {}),
                    completedAt: incoming.billing?.completedAt || localSnap?.completedAt || new Date().toISOString(),
                    currentStep: 1,
                  },
                  billing: incoming.billing || existing?.billing,
                  selectedCombo: existing?.selectedCombo || incoming.selectedCombo,
                  selectedUnderCombo: existing?.selectedUnderCombo || incoming.selectedUnderCombo,
                  comboRedemption: existing?.comboRedemption || incoming.comboRedemption,
                };
              }

              return {
                ...incoming,
                status: (localSnap?.status || incoming.status || existing?.status) as any,
                progress: {
                  ...(incoming.progress || {}),
                  ...(existing?.progress || {}),
                  ...(localSnap || {}),
                },
                selectedCombo: existing?.selectedCombo || incoming.selectedCombo,
                selectedUnderCombo: existing?.selectedUnderCombo || incoming.selectedUnderCombo,
                comboRedemption: existing?.comboRedemption || incoming.comboRedemption,
              };
            });

            const incomingIds = new Set(data.bookings.map((b: BookingItem) => b.id));
            const remainingMocks = prev.filter((b) => !incomingIds.has(b.id));

            return [...mergedIncoming, ...remainingMocks];
          });

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
      } finally {
        setIsRefreshing(false);
      }
    },
    [actor.staffId, bookingSegment, getDateStrForOffset, role, scopeMode, selectedDateOffset]
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
    refreshDb,
    postAction,
  };
}
