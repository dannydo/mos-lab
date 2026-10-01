'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TelesaleTodayLiveEvent } from '@mos-lab/shared';
import { getBestVietnameseVoice } from '../../../../components/voice-assistant/speech-utils';

export interface TvCelebrationSettings {
  soundEnabled: boolean;
  volume: number; // 0 to 1
  eventTypeFilter: 'ALL' | 'BOOK_ONLY' | 'DONE_ONLY';
  quietModeEnabled: boolean; // Manual quiet mode or during quiet hours
}

export interface ActiveCelebration {
  id: string;
  kind: 'BOOK' | 'DONE' | 'MILESTONE';
  staffName?: string;
  avatarUrl?: string | null;
  textToSpeak: string;
  badgeText: string;
  colorTheme: 'blue' | 'emerald' | 'amber';
}

const SETTINGS_STORAGE_KEY = 'MOS_TV_MONITOR_VOICE_SETTINGS';

const DEFAULT_SETTINGS: TvCelebrationSettings = {
  soundEnabled: true,
  volume: 0.9,
  eventTypeFilter: 'ALL',
  quietModeEnabled: false,
};

// Script quotes from ticket specification (MOS-FEAT-83)
const BOOK_QUOTES = [
  'Ting ting! [Tên] vừa chốt thêm một lịch, nóng máy rồi nha!',
  '[Tên] lên điểm! Thêm một Book về đội!',
  '[Tên] vừa bắn trúng mục tiêu, cộng một Book!',
  'Có Book mới! [Tên] hôm nay chạy dữ nha!',
];

const DONE_QUOTES = [
  'Boom! [Tên] vừa mang về thêm một Done!',
  '[Tên] vừa ghi bàn, cộng một Done cho Team!',
  '[Tên] vừa biến Booking thành kết quả, quá đẹp!',
  'Khách tới thật nha! [Tên] có thêm một Done!',
];

export function getRandomQuote(quotes: string[], name: string): string {
  const template = quotes[Math.floor(Math.random() * quotes.length)] || quotes[0];
  return template.replace(/\[Tên\]/g, name);
}

// Synthesize pleasant celebratory chime with Web Audio API
function playCelebratoryChime(volume = 0.9, kind: 'BOOK' | 'DONE' | 'MILESTONE' = 'BOOK') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    gainNode.connect(ctx.destination);

    // Chime chords: higher pitches for Milestone, bright for Book/Done
    const baseFreqs = kind === 'MILESTONE' ? [523.25, 659.25, 783.99, 1046.5] : kind === 'DONE' ? [440, 554.37, 659.25] : [587.33, 739.99, 880];

    baseFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      osc.connect(gainNode);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + 1.2);
    });
  } catch {
    // AudioContext blocked or unsupported
  }
}

export function useTelesaleTvLiveCelebration() {
  const [settings, setSettings] = useState<TvCelebrationSettings>(DEFAULT_SETTINGS);
  const [activeCelebration, setActiveCelebration] = useState<ActiveCelebration | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const queueRef = useRef<ActiveCelebration[]>([]);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const announcedMilestonesRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef<boolean>(false);
  const lastSpokenTimeRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);

  // 1. Load settings from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  // 2. Persist settings changes
  const updateSettings = useCallback((newSettings: Partial<TvCelebrationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
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

  // 4. Process Celebration Queue with Cooldown (3-5s)
  const processQueue = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;

    const timeSinceLast = Date.now() - lastSpokenTimeRef.current;
    const cooldownMs = 3500; // 3.5s cooldown between announcements

    if (timeSinceLast < cooldownMs) {
      setTimeout(processQueue, cooldownMs - timeSinceLast + 100);
      return;
    }

    const nextEvent = queueRef.current.shift();
    if (!nextEvent) return;

    isProcessingRef.current = true;
    setActiveCelebration(nextEvent);

    const quiet = isQuietHours();
    const shouldPlaySound = settings.soundEnabled && !quiet;

    if (shouldPlaySound) {
      // Play celebratory chime
      playCelebratoryChime(settings.volume, nextEvent.kind);
    }

    if (shouldPlaySound && typeof window !== 'undefined' && window.speechSynthesis) {
      setIsSpeaking(true);
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(nextEvent.textToSpeak);
      const voice = getBestVietnameseVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'vi-VN';
      utterance.rate = 1.05;
      utterance.pitch = 1.05;
      utterance.volume = settings.volume;

      const finishCelebration = () => {
        setIsSpeaking(false);
        lastSpokenTimeRef.current = Date.now();
        isProcessingRef.current = false;

        // Keep visual banner for an extra 1.5s after speech ends
        setTimeout(() => {
          setActiveCelebration((current) => (current?.id === nextEvent.id ? null : current));
          // Check for next item in queue after cooldown
          setTimeout(processQueue, 3500);
        }, 1500);
      };

      utterance.onend = finishCelebration;
      utterance.onerror = finishCelebration;

      // Fallback timeout in case SpeechSynthesis hangs
      const fallbackTimeout = setTimeout(finishCelebration, 12000);

      window.speechSynthesis.speak(utterance);

      return () => clearTimeout(fallbackTimeout);
    } else {
      // If muted or in quiet hours, still show visual banner for 3.5s
      setTimeout(() => {
        lastSpokenTimeRef.current = Date.now();
        isProcessingRef.current = false;
        setActiveCelebration(null);
        setTimeout(processQueue, 2000);
      }, 3500);
    }
  }, [isQuietHours, settings.soundEnabled, settings.volume]);

  // 5. Enqueue celebration event
  const enqueueCelebration = useCallback(
    (event: ActiveCelebration) => {
      // Prevent duplicates
      if (seenEventIdsRef.current.has(event.id)) return;
      seenEventIdsRef.current.add(event.id);

      // Check manager filter
      if (settings.eventTypeFilter === 'BOOK_ONLY' && event.kind === 'DONE') return;
      if (settings.eventTypeFilter === 'DONE_ONLY' && event.kind === 'BOOK') return;

      queueRef.current.push(event);
      processQueue();
    },
    [processQueue, settings.eventTypeFilter]
  );

  // 6. Ingest Live Events from API (todayLiveEvents)
  const ingestLiveEvents = useCallback(
    (events: TelesaleTodayLiveEvent[] = []) => {
      if (!events || events.length === 0) return;

      // On first initial mount, register all existing events as seen to prevent blasting old events
      if (!isInitializedRef.current) {
        events.forEach((e) => seenEventIdsRef.current.add(e.id));
        isInitializedRef.current = true;
        return;
      }

      // Detect new events
      for (const ev of events) {
        if (!seenEventIdsRef.current.has(ev.id)) {
          const staffName = ev.staffName || 'Bạn Telesales';
          if (ev.type === 'BOOK') {
            enqueueCelebration({
              id: ev.id,
              kind: 'BOOK',
              staffName,
              avatarUrl: ev.avatarUrl,
              textToSpeak: getRandomQuote(BOOK_QUOTES, staffName),
              badgeText: '+1 BOOK HÔM NAY',
              colorTheme: 'blue',
            });
          } else if (ev.type === 'DONE') {
            enqueueCelebration({
              id: ev.id,
              kind: 'DONE',
              staffName,
              avatarUrl: ev.avatarUrl,
              textToSpeak: getRandomQuote(DONE_QUOTES, staffName),
              badgeText: '+1 DONE HÔM NAY',
              colorTheme: 'emerald',
            });
          }
        }
      }
    },
    [enqueueCelebration]
  );

  // 7. Milestone Checkers
  const checkMilestones = useCallback(
    (date: string, bookActual: number, doneActual: number) => {
      if (!isInitializedRef.current) return;

      const checkAndQueue = (key: string, text: string, badge: string) => {
        const milestoneKey = `milestone-${date}-${key}`;
        if (!announcedMilestonesRef.current.has(milestoneKey)) {
          announcedMilestonesRef.current.add(milestoneKey);
          enqueueCelebration({
            id: milestoneKey,
            kind: 'MILESTONE',
            textToSpeak: text,
            badgeText: badge,
            colorTheme: 'amber',
          });
        }
      };

      // Milestone rules (Specification 3):
      // - 10 Book
      if (bookActual >= 10 && bookActual < 20) {
        checkAndQueue('book-10', 'Chúc mừng Team đã cán mốc 10 Book! Giữ vững phong độ nha cả nhà!', '🏆 CÁN MỐC 10 BOOK!');
      }
      // - 20 Book
      if (bookActual >= 20 && bookActual < 25) {
        checkAndQueue('book-20', 'Tuyệt vời! Team đã chạm mốc 20 Book rồi! Cố lên mục tiêu tiếp theo!', '🔥 CHẠM MỐC 20 BOOK!');
      }
      // - 25 Book
      if (bookActual === 25) {
        checkAndQueue('book-25', 'Đỉnh cao! Team đã chính thức cán mốc 25 Book hôm nay! Xuất sắc!', '👑 CÁN MỐC 25 BOOK!');
      }
      // - Vượt 25 Book
      if (bookActual > 25) {
        checkAndQueue('book-gt25', 'Cháy quá cả nhà ơi! Team đã vượt mốc 25 Book rồi, bùng nổ hôm nay!', '🚀 VƯỢT MỐC 25 BOOK!');
      }
      // - 18 Done
      if (doneActual >= 18) {
        checkAndQueue('done-18', 'Yeah! Team đã hoàn thành mục tiêu 18 Done hôm nay! Quá xuất sắc!', '🎉 HOÀN THÀNH 18 DONE!');
      }
    },
    [enqueueCelebration]
  );

  // 8. Manual Demo Triggers (For testing & Manager preview)
  const triggerDemoCelebration = useCallback(
    (type: 'BOOK' | 'DONE' | 'MILESTONE') => {
      const demoId = `demo-${Date.now()}`;
      if (type === 'BOOK') {
        enqueueCelebration({
          id: demoId,
          kind: 'BOOK',
          staffName: 'Bích Phượng',
          avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocImU7oxC33vMir9F9rllmN4y1LVBkzJXB5ff9RCZyy-9brDnA=s96-c',
          textToSpeak: getRandomQuote(BOOK_QUOTES, 'Bích Phượng'),
          badgeText: '+1 BOOK HÔM NAY',
          colorTheme: 'blue',
        });
      } else if (type === 'DONE') {
        enqueueCelebration({
          id: demoId,
          kind: 'DONE',
          staffName: 'Thuý Kiều',
          avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIDkNj8m3jfUn2iO_gmhiuLwSJ3XF2Gaqvi69RiG3-My5olzA=s96-c',
          textToSpeak: getRandomQuote(DONE_QUOTES, 'Thuý Kiều'),
          badgeText: '+1 DONE HÔM NAY',
          colorTheme: 'emerald',
        });
      } else {
        enqueueCelebration({
          id: demoId,
          kind: 'MILESTONE',
          textToSpeak: 'Đỉnh cao! Team đã chính thức cán mốc 25 Book hôm nay! Xuất sắc!',
          badgeText: '👑 CÁN MỐC 25 BOOK!',
          colorTheme: 'amber',
        });
      }
    },
    [enqueueCelebration]
  );

  return {
    settings,
    updateSettings,
    activeCelebration,
    isSpeaking,
    isQuietHours: isQuietHours(),
    ingestLiveEvents,
    checkMilestones,
    triggerDemoCelebration,
  };
}
