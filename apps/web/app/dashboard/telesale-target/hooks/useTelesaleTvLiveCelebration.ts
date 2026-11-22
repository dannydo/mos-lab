'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TelesaleTodayLiveEvent, TelesaleTvEventLog } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  playCelebrationVoice,
  playCelebratoryChime,
  playCelebratorySFX,
  unlockBrowserAudio,
} from './tv-celebration/tvCelebrationAudio';
import { dispatchLiveEventCelebration, triggerDemoCelebrationEvent } from './tv-celebration/tvCelebrationEventBuilder';
import { evaluateTvMilestones } from './tv-celebration/tvCelebrationMilestones';
import {
  ActiveCelebration,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  TvCelebrationSettings,
  formatCurrencyForSpeech,
  formatViTime,
  getRandomQuote,
  getTodayDateKey,
} from './tv-celebration/tvCelebrationTypes';

export type { ActiveCelebration, TvCelebrationSettings };
export { formatCurrencyForSpeech, getRandomQuote, playCelebratoryChime, playCelebratorySFX };

export function useTelesaleTvLiveCelebration() {
  const [settings, setSettings] = useState<TvCelebrationSettings>(DEFAULT_SETTINGS);
  const [activeCelebration, setActiveCelebration] = useState<ActiveCelebration | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  const queueRef = useRef<ActiveCelebration[]>([]);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const enqueuedIdsRef = useRef<Set<string>>(new Set());
  const announcedMilestonesRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef<boolean>(false);
  const lastSpokenTimeRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);
  const staffStreakMapRef = useRef<Map<string, number>>(new Map());
  const processQueueRef = useRef<() => void>(() => {});

  // 1. Load settings from localStorage and listen to real-time updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadSettings = () => {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // ignore
      }
    };

    loadSettings();

    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<TvCelebrationSettings>>;
      if (customEvent.detail) {
        setSettings((prev) => ({ ...prev, ...customEvent.detail }));
      } else {
        loadSettings();
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    };

    window.addEventListener('mos:tv-settings-updated', handleCustomUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('mos:tv-settings-updated', handleCustomUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // 2. Persist settings changes
  const updateSettings = useCallback((newSettings: Partial<TvCelebrationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('mos:tv-settings-updated', { detail: updated }));
        } catch {
          // ignore
        }
      }
      return updated;
    });
  }, []);

  // 3. Check if current time is within Quiet Hours (e.g. 12:00 - 13:30 or before 08:00 / after 21:00)
  const isQuietHours = useCallback(() => {
    if (settings.quietModeEnabled) return true;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Lunch break: 12:00 to 13:30 (720 to 810 mins)
    if (totalMinutes >= 720 && totalMinutes < 810) return true;
    // Outside working shift: before 08:00 or after 21:30
    if (hours < 8 || (hours === 21 && minutes > 30) || hours > 21) return true;

    return false;
  }, [settings.quietModeEnabled]);

  // Record Live Event execution status into local journal & sync with server
  const recordEventLog = useCallback((log: TelesaleTvEventLog) => {
    const storageKey = `MOS_TV_MONITOR_EVENT_LOGS_${getTodayDateKey()}`;

    let currentLogs: TelesaleTvEventLog[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) currentLogs = JSON.parse(raw);
      } catch {}
    }

    const idx = currentLogs.findIndex((item) => item.id === log.id);
    if (idx >= 0) {
      currentLogs[idx] = { ...currentLogs[idx], ...log };
    } else {
      currentLogs.unshift(log);
    }

    if (currentLogs.length > 150) currentLogs = currentLogs.slice(0, 150);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentLogs));
      } catch {}
    }

    // Background sync to API (fire-and-forget)
    try {
      apiClient?.telesaleTarget?.syncTvJournal?.([log])?.catch?.(() => {});
    } catch {}
  }, []);

  // 4. Process Celebration Queue with Cooldown (3-5s)
  const processQueue = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;

    const timeSinceLast = Date.now() - lastSpokenTimeRef.current;
    const cooldownMs = 3500; // 3.5s cooldown between announcements

    if (timeSinceLast < cooldownMs) {
      setTimeout(() => processQueueRef.current(), cooldownMs - timeSinceLast + 100);
      return;
    }

    const nextEvent = queueRef.current.shift();
    if (!nextEvent) return;

    const celebrationStartTime = Date.now();
    isProcessingRef.current = true;
    setIsFadingOut(false);
    setActiveCelebration(nextEvent);

    const quiet = isQuietHours();
    const shouldPlaySound = settings.soundEnabled && !quiet;

    if (shouldPlaySound) {
      playCelebratorySFX(nextEvent.sfxType, settings.volume, nextEvent.kind);
    }

    const logBase: Omit<TelesaleTvEventLog, 'voiceTriggered' | 'voiceErrorReason' | 'status' | 'errorMessage'> = {
      id: nextEvent.id,
      type: nextEvent.kind,
      staffId: nextEvent.staffId,
      staffName: nextEvent.staffName || 'Telesales',
      avatarUrl: nextEvent.avatarUrl,
      timestamp: new Date().toISOString(),
      timeFormatted: formatViTime(new Date(), false),
      changeResult:
        nextEvent.changeResult ||
        (nextEvent.kind === 'BOOK' ? '+1 Book' : nextEvent.kind === 'DONE' ? '+1 Done' : 'Cán mốc'),
      orderId: nextEvent.orderId,
      personaKey: nextEvent.personaKey,
      personaName: nextEvent.personaName,
      personaIcon: nextEvent.personaIcon,
      eventReceived: true,
      eventReceivedAt: new Date().toISOString(),
      overlayTriggered: true,
      overlayErrorReason: null,
    };

    if (shouldPlaySound) {
      setIsSpeaking(true);

      const finishCelebration = (success = true, voiceErrorReason: string | null = null) => {
        setIsSpeaking(false);
        const elapsed = Date.now() - celebrationStartTime;
        const remainingDisplayMs = Math.max(0, 4500 - elapsed);

        recordEventLog({
          ...logBase,
          voiceTriggered: success,
          voiceErrorReason,
          status: 'SUCCESS',
          errorMessage: success ? null : voiceErrorReason,
        });

        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setActiveCelebration((current) => (current?.id === nextEvent.id ? null : current));
            setIsFadingOut(false);
            lastSpokenTimeRef.current = Date.now();
            isProcessingRef.current = false;
            setTimeout(() => processQueueRef.current(), 1500);
          }, 450);
        }, remainingDisplayMs);
      };

      playCelebrationVoice({ event: nextEvent, settings, onFinish: finishCelebration });
    } else {
      // If muted or in quiet hours, still show achievement overlay for 4.5s, then fade out
      const reason = !settings.soundEnabled
        ? 'Tắt âm thanh trong cài đặt TV'
        : quiet
          ? 'Đang trong giờ im lặng (12:00-13:30 hoặc ngoài ca trực)'
          : 'Âm thanh không được kích hoạt';

      recordEventLog({
        ...logBase,
        voiceTriggered: false,
        voiceErrorReason: reason,
        status: 'SUCCESS',
        errorMessage: null,
      });

      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setActiveCelebration(null);
          setIsFadingOut(false);
          lastSpokenTimeRef.current = Date.now();
          isProcessingRef.current = false;
          setTimeout(() => processQueueRef.current(), 1500);
        }, 450);
      }, 4500);
    }
  }, [isQuietHours, recordEventLog, settings]);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  // 5. Enqueue celebration event
  const enqueueCelebration = useCallback(
    (event: ActiveCelebration) => {
      if (enqueuedIdsRef.current.has(event.id)) return;
      enqueuedIdsRef.current.add(event.id);

      if (
        (settings.eventTypeFilter === 'BOOK_ONLY' && event.kind === 'DONE') ||
        (settings.eventTypeFilter === 'DONE_ONLY' && event.kind === 'BOOK')
      ) {
        recordEventLog({
          id: event.id,
          type: event.kind,
          staffId: event.staffId,
          staffName: event.staffName || 'Telesales',
          avatarUrl: event.avatarUrl,
          timestamp: new Date().toISOString(),
          timeFormatted: formatViTime(new Date(), true),
          changeResult:
            event.changeResult || (event.kind === 'BOOK' ? '+1 Book' : event.kind === 'DONE' ? '+1 Done' : 'Cán mốc'),
          orderId: event.orderId,
          eventReceived: true,
          eventReceivedAt: new Date().toISOString(),
          voiceTriggered: false,
          voiceErrorReason: `Bỏ qua theo cài đặt bộ lọc (${settings.eventTypeFilter})`,
          overlayTriggered: false,
          overlayErrorReason: `Bỏ qua theo cài đặt bộ lọc (${settings.eventTypeFilter})`,
          status: 'SUCCESS',
          errorMessage: null,
        });
        return;
      }

      queueRef.current.push(event);
      processQueue();
    },
    [processQueue, recordEventLog, settings.eventTypeFilter]
  );

  // Auto-unlock AudioContext on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      unlockBrowserAudio();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
  }, []);

  // 6. Ingest Live Events from API (todayLiveEvents)
  const ingestLiveEvents = useCallback(
    (events: TelesaleTodayLiveEvent[] = []) => {
      const todayKey = getTodayDateKey();
      const storageKey = `MOS_TV_SEEN_EVENT_IDS_${todayKey}`;

      if (seenEventIdsRef.current.size === 0 && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const list: string[] = JSON.parse(raw);
            list.forEach((id) => seenEventIdsRef.current.add(id));
          }
        } catch {}
      }

      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        if (events && events.length > 0) {
          let existingLogs: TelesaleTvEventLog[] = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem(`MOS_TV_MONITOR_EVENT_LOGS_${todayKey}`);
              if (raw) existingLogs = JSON.parse(raw);
            } catch {}
          }
          const existingLogMap = new Map<string, TelesaleTvEventLog>(existingLogs.map((l) => [l.id, l]));

          for (const ev of events) {
            seenEventIdsRef.current.add(ev.id);
            if (existingLogMap.has(ev.id)) continue;

            recordEventLog({
              id: ev.id,
              type: ev.type,
              staffId: ev.staffId,
              staffName: ev.staffName || 'Telesales',
              avatarUrl: ev.avatarUrl,
              timestamp: ev.timestamp,
              timeFormatted: formatViTime(ev.timestamp, true),
              changeResult: ev.changeResult || `${ev.type === 'BOOK' ? 'Book' : 'Done'} hôm nay`,
              orderId: ev.orderId,
              eventReceived: false,
              eventReceivedAt: undefined,
              voiceTriggered: false,
              voiceErrorReason: 'Sự kiện trước khi mở TV Monitor (Lịch sử)',
              overlayTriggered: false,
              overlayErrorReason: 'Sự kiện trước khi mở TV Monitor (Lịch sử)',
              status: 'SUCCESS',
              errorMessage: null,
            });
          }
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(storageKey, JSON.stringify(Array.from(seenEventIdsRef.current)));
            } catch {}
          }
        }
        return;
      }

      if (!events || events.length === 0) return;

      const eventsToAnnounce: TelesaleTodayLiveEvent[] = [];
      for (const ev of events) {
        if (!seenEventIdsRef.current.has(ev.id)) {
          eventsToAnnounce.push(ev);
          seenEventIdsRef.current.add(ev.id);
        }
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(seenEventIdsRef.current)));
        } catch {}
      }

      for (const ev of eventsToAnnounce) {
        dispatchLiveEventCelebration({
          ev,
          staffStreakMap: staffStreakMapRef.current,
          settings,
          enqueueCelebration,
          recordEventLog,
        });
      }
    },
    [enqueueCelebration, recordEventLog, settings]
  );

  // 7. Milestone Checkers
  const checkMilestones = useCallback(
    (date: string, bookActual: number, doneActual: number, checkinActual: number = 0) => {
      evaluateTvMilestones({
        date,
        bookActual,
        doneActual,
        checkinActual,
        isInitialized: isInitializedRef.current,
        announcedMilestones: announcedMilestonesRef.current,
        enqueueCelebration,
      });
    },
    [enqueueCelebration]
  );

  // 8. Manual Demo Triggers (For testing & Manager preview)
  const triggerDemoCelebration = useCallback(
    (type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP' | 'MILESTONE' | 'CHECKIN_18') => {
      triggerDemoCelebrationEvent({ type, settings, enqueueCelebration });
    },
    [enqueueCelebration, settings]
  );

  const quietHours = isQuietHours();
  return useMemo(
    () => ({
      settings,
      updateSettings,
      activeCelebration,
      isSpeaking,
      isFadingOut,
      isQuietHours: quietHours,
      ingestLiveEvents,
      checkMilestones,
      triggerDemoCelebration,
      recordEventLog,
    }),
    [
      settings,
      updateSettings,
      activeCelebration,
      isSpeaking,
      isFadingOut,
      quietHours,
      ingestLiveEvents,
      checkMilestones,
      triggerDemoCelebration,
      recordEventLog,
    ]
  );
}
