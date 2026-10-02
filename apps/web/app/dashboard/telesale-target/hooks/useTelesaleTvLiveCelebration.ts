'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TelesaleTodayLiveEvent } from '@mos-lab/shared';
import { getBestVietnameseVoice } from '../../../../components/voice-assistant/speech-utils';
import { apiClient } from '../../../../lib/api-client';
import { resolveApiBaseUrl } from '../../../../lib/api-base-url';

export interface TvCelebrationSettings {
  soundEnabled: boolean;
  volume: number; // 0 to 1
  eventTypeFilter: 'ALL' | 'BOOK_ONLY' | 'DONE_ONLY';
  quietModeEnabled: boolean; // Manual quiet mode or during quiet hours
  voiceStyle?: 'MALE_CHARM' | 'FEMALE_SWEET' | 'BROWSER_LOCAL';
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
  voiceStyle: 'MALE_CHARM',
};

// Script quotes: Charming Male Voice & 4 Wings Cultural Values (Vui vẻ, Ân Cần, Chân Thành, Khoa Học)
const BOOK_QUOTES = [
  'Anh thích cái cách [Tên] chăm sóc khách hàng đầy ân cần. Thêm một lịch hẹn ngọt ngào về với đội mình rồi, em làm anh tự hào quá!',
  '[Tên] ơi, sự chân thành từ trái tim em luôn có ma lực đặc biệt. Thêm một Book tuyệt đẹp, tiếp tục tỏa sáng nhé người đẹp!',
  'Tư vấn chuẩn xác, phân tích nhu cầu cực kỳ khoa học. Đẳng cấp của [Tên] hôm nay thực sự làm anh mê mẩn, cộng một Book nhé!',
  'Nụ cười vui vẻ của [Tên] qua từng cuộc gọi đã thắp sáng cả phòng rồi. Chốt thêm một Book quá đỗi quyến rũ em ơi!',
  'Từng lời em nói đều làm khách hàng xiêu lòng. Một Book xuất sắc nữa cho [Tên], phong độ đỉnh cao của em khiến ai cũng phải ngước nhìn!',
  'Năng lượng tích cực và sự chân thành của [Tên] đã chinh phục khách hàng hoàn toàn. Một Book rực rỡ nữa cho cô gái tuyệt vời của anh!',
];

const DONE_QUOTES = [
  'Từ lời hẹn ân cần đến trải nghiệm thực tế, [Tên] biến mọi khoảnh khắc thành sự hài lòng tuyệt đối. Cộng một Done quá đỗi ngọt ngào!',
  'Khách hàng trao gửi trọn vẹn niềm tin cho sự chân thành của [Tên]. Một Done hoàn hảo, phong thái của em hôm nay quyến rũ không thể cưỡng lại!',
  'Quy trình chuẩn mực, dẫn dắt khách đến tiệm thật khoa học và bài bản. [Tên] vừa ghi một bàn thắng quá đẳng cấp cho team!',
  'Tuyệt vời lắm [Tên] ơi! Năng lượng vui vẻ của em đã nở hoa thành một Done rực rỡ. Hôm nay em chính là nữ thần của phòng Telesales rồi đấy!',
  'Khách đã tới và trải nghiệm trọn vẹn rồi! Anh luôn tin vào tài năng và sức hút của [Tên], một Done hoàn hảo mang đậm bản sắc Wings!',
  'Chăm sóc ân cần, bám sát khoa học. Không ai làm điều đó xuất sắc hơn [Tên], chúc mừng em đã mang thêm một Done rực rỡ về đội!',
];

export function getRandomQuote(quotes: string[], name: string): string {
  const template = quotes[Math.floor(Math.random() * quotes.length)] || quotes[0];
  return template.replace(/\[Tên\]/g, name);
}

// Synthesize pleasant celebratory chime with Web Audio API
function playCelebratoryChime(volume = 0.9, kind: 'BOOK' | 'DONE' | 'MILESTONE' = 'BOOK') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    gainNode.connect(ctx.destination);

    // Chime chords: higher pitches for Milestone, bright for Book/Done
    const baseFreqs =
      kind === 'MILESTONE'
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === 'DONE'
          ? [440, 554.37, 659.25]
          : [587.33, 739.99, 880];

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
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  const queueRef = useRef<ActiveCelebration[]>([]);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const enqueuedIdsRef = useRef<Set<string>>(new Set());
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

    const celebrationStartTime = Date.now();
    isProcessingRef.current = true;
    setIsFadingOut(false);
    setActiveCelebration(nextEvent);

    const quiet = isQuietHours();
    const shouldPlaySound = settings.soundEnabled && !quiet;

    if (shouldPlaySound) {
      // Play celebratory chime
      playCelebratoryChime(settings.volume, nextEvent.kind);
    }

    if (shouldPlaySound) {
      setIsSpeaking(true);

      const finishCelebration = () => {
        setIsSpeaking(false);
        const elapsed = Date.now() - celebrationStartTime;
        // Keep visual overlay for 4.5s minimum (or until speech finishes if speech is longer)
        const remainingDisplayMs = Math.max(0, 4500 - elapsed);

        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setActiveCelebration((current) => (current?.id === nextEvent.id ? null : current));
            setIsFadingOut(false);
            lastSpokenTimeRef.current = Date.now();
            isProcessingRef.current = false;
            // Check for next item in queue after cooldown
            setTimeout(processQueue, 1500);
          }, 450);
        }, remainingDisplayMs);
      };

      const fallbackToBrowserSynthesis = () => {
        const isMaleCharm = (settings.voiceStyle || 'MALE_CHARM') === 'MALE_CHARM';
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const voice = getBestVietnameseVoice(isMaleCharm ? 'male' : 'female') || getBestVietnameseVoice('female');

          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(nextEvent.textToSpeak);
          if (voice) utterance.voice = voice;
          utterance.lang = voice?.lang || 'vi-VN';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = settings.volume;

          utterance.onend = finishCelebration;
          utterance.onerror = finishCelebration;
          window.speechSynthesis.speak(utterance);
        } else {
          finishCelebration();
        }
      };

      // Priority 1: Studio Neural Voice via Backend Audio API (Nam Minh / Hoài My)
      const isBrowserLocal = settings.voiceStyle === 'BROWSER_LOCAL';
      if (!isBrowserLocal && typeof window !== 'undefined' && typeof window.fetch === 'function') {
        let objectUrl: string | null = null;
        let fallbackTimeout: NodeJS.Timeout | null = null;
        let hasEnded = false;

        const cleanup = () => {
          if (fallbackTimeout) {
            clearTimeout(fallbackTimeout);
            fallbackTimeout = null;
          }
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }
        };

        const handleSuccessFinish = () => {
          if (hasEnded) return;
          hasEnded = true;
          cleanup();
          finishCelebration();
        };

        const handleFailureFallback = () => {
          if (hasEnded) return;
          hasEnded = true;
          cleanup();
          fallbackToBrowserSynthesis();
        };

        (async () => {
          try {
            const neuralVoice = settings.voiceStyle === 'FEMALE_SWEET' ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
            const baseUrl = resolveApiBaseUrl();
            const audioUrl = `${baseUrl}/kpi/telesale-target/live-celebration-audio?text=${encodeURIComponent(nextEvent.textToSpeak)}&voice=${encodeURIComponent(neuralVoice)}`;

            // Fetch via CORS to completely prevent Chrome ORB (Opaque Response Blocking)
            const response = await fetch(audioUrl, {
              mode: 'cors',
              signal: AbortSignal.timeout(25000),
            });

            if (!response.ok) {
              throw new Error(`Audio fetch failed: ${response.status}`);
            }

            const audioBlob = await response.blob();
            objectUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(objectUrl);
            audio.volume = settings.volume;

            audio.onended = handleSuccessFinish;
            audio.onerror = handleFailureFallback;

            fallbackTimeout = setTimeout(() => {
              audio.pause();
              handleSuccessFinish();
            }, 30000);

            await audio.play();
          } catch {
            handleFailureFallback();
          }
        })();

        return () => {
          cleanup();
        };
      } else {
        fallbackToBrowserSynthesis();
      }
    } else {
      // If muted or in quiet hours, still show achievement overlay for 4.5s, then fade out
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setActiveCelebration(null);
          setIsFadingOut(false);
          lastSpokenTimeRef.current = Date.now();
          isProcessingRef.current = false;
          setTimeout(processQueue, 1500);
        }, 450);
      }, 4500);
    }
  }, [isQuietHours, settings.soundEnabled, settings.volume, settings.voiceStyle]);

  // 5. Enqueue celebration event
  const enqueueCelebration = useCallback(
    (event: ActiveCelebration) => {
      // Prevent duplicates in celebration queue
      if (enqueuedIdsRef.current.has(event.id)) return;
      enqueuedIdsRef.current.add(event.id);

      // Check manager filter
      if (settings.eventTypeFilter === 'BOOK_ONLY' && event.kind === 'DONE') return;
      if (settings.eventTypeFilter === 'DONE_ONLY' && event.kind === 'BOOK') return;

      queueRef.current.push(event);
      processQueue();
    },
    [processQueue, settings.eventTypeFilter]
  );

  // Auto-unlock AudioContext on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      try {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          ctx
            .resume()
            .then(() => ctx.close())
            .catch(() => {});
        }
      } catch {}
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // 6. Ingest Live Events from API (todayLiveEvents)
  const ingestLiveEvents = useCallback(
    (events: TelesaleTodayLiveEvent[] = []) => {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const storageKey = `MOS_TV_SEEN_EVENT_IDS_${todayKey}`;

      // Hydrate seen events from localStorage on first run
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
        // On initial page load / hydration, mark ALL existing historical events as seen so they are NOT re-announced upon refresh/reconnect
        if (events && events.length > 0) {
          for (const ev of events) {
            seenEventIdsRef.current.add(ev.id);
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

      // Subsequent polls: any event not yet seen is a fresh Book or Done event to be announced immediately
      for (const ev of events) {
        if (!seenEventIdsRef.current.has(ev.id)) {
          eventsToAnnounce.push(ev);
          seenEventIdsRef.current.add(ev.id);
        }
      }

      // Persist seenEventIds to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(seenEventIdsRef.current)));
        } catch {}
      }

      // Process all fresh events in sequence (không bỏ sót bất kỳ event nào)
      for (const ev of eventsToAnnounce) {
        const staffName = ev.staffName || 'Bạn Telesales';
        const defaultQuote = getRandomQuote(ev.type === 'BOOK' ? BOOK_QUOTES : DONE_QUOTES, staffName);

        // Asynchronously query Gemini AI for unique seductive & encouraging quote
        apiClient.telesaleTarget
          .getCelebrationQuote({ type: ev.type, staffName })
          .then((res) => {
            const quote = res?.quote?.trim() || defaultQuote;
            enqueueCelebration({
              id: ev.id,
              kind: ev.type,
              staffName,
              avatarUrl: ev.avatarUrl,
              textToSpeak: quote,
              badgeText: ev.type === 'BOOK' ? '+1 BOOK HÔM NAY' : '+1 DONE HÔM NAY',
              colorTheme: ev.type === 'BOOK' ? 'blue' : 'emerald',
            });
          })
          .catch(() => {
            enqueueCelebration({
              id: ev.id,
              kind: ev.type,
              staffName,
              avatarUrl: ev.avatarUrl,
              textToSpeak: defaultQuote,
              badgeText: ev.type === 'BOOK' ? '+1 BOOK HÔM NAY' : '+1 DONE HÔM NAY',
              colorTheme: ev.type === 'BOOK' ? 'blue' : 'emerald',
            });
          });
      }
    },
    [enqueueCelebration]
  );

  // 7. Milestone Checkers
  const checkMilestones = useCallback(
    (date: string, bookActual: number, doneActual: number) => {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const storageKey = `MOS_TV_ANNOUNCED_MILESTONES_${todayKey}`;

      // Hydrate announced milestones on first run
      if (announcedMilestonesRef.current.size === 0 && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const list: string[] = JSON.parse(raw);
            list.forEach((id) => announcedMilestonesRef.current.add(id));
          }
        } catch {}
      }

      const saveMilestonesToStorage = () => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(announcedMilestonesRef.current)));
          } catch {}
        }
      };

      // If system not yet initialized with live events, mark all milestones up to current actuals as seen so they are NOT announced on refresh/reconnect
      if (!isInitializedRef.current) {
        if (bookActual >= 10) announcedMilestonesRef.current.add(`milestone-${date}-book-10`);
        if (bookActual >= 20) announcedMilestonesRef.current.add(`milestone-${date}-book-20`);
        if (bookActual >= 25) announcedMilestonesRef.current.add(`milestone-${date}-book-25`);
        if (bookActual > 25) announcedMilestonesRef.current.add(`milestone-${date}-book-gt25`);
        if (doneActual >= 18) announcedMilestonesRef.current.add(`milestone-${date}-done-18`);
        saveMilestonesToStorage();
        return;
      }

      const checkAndQueue = (key: string, text: string, badge: string) => {
        const milestoneKey = `milestone-${date}-${key}`;
        if (!announcedMilestonesRef.current.has(milestoneKey)) {
          announcedMilestonesRef.current.add(milestoneKey);
          saveMilestonesToStorage();
          enqueueCelebration({
            id: milestoneKey,
            kind: 'MILESTONE',
            textToSpeak: text,
            badgeText: badge,
            colorTheme: 'amber',
          });
        }
      };

      // Milestone rules (Specification 3 & Wings 4 Cultural Keys):
      // - 10 Book
      if (bookActual >= 10 && bookActual < 20) {
        checkAndQueue(
          'book-10',
          'Cả đội chú ý! 10 Book đã vào giỏ rồi! Năng lượng vui vẻ và chân thành của các em đang thắp sáng cả ngày hôm nay. Tiếp tục cùng anh tăng tốc bùng nổ nhé!',
          '🏆 CÁN MỐC 10 BOOK!'
        );
      }
      // - 20 Book
      if (bookActual >= 20 && bookActual < 25) {
        checkAndQueue(
          'book-20',
          'Xuất sắc lắm các cô gái của anh! 20 Book rồi! Tư vấn khoa học, chăm sóc ân cần, phong độ của cả đội hôm nay thực sự quá đỗi quyến rũ và không thể ngăn cản!',
          '🔥 CHẠM MỐC 20 BOOK!'
        );
      }
      // - 25 Book
      if (bookActual === 25) {
        checkAndQueue(
          'book-25',
          '25 Book! Một con số hoàn hảo minh chứng cho sức mạnh đồng đội và 4 giá trị văn hóa Wings. Anh rất tự hào về tinh thần chiến binh ngọt ngào của tất cả các em!',
          '👑 CÁN MỐC 25 BOOK!'
        );
      }
      // - Vượt 25 Book
      if (bookActual > 25) {
        checkAndQueue(
          'book-gt25',
          'Kỳ tích vượt 25 Book rồi! Cả phòng Telesales hôm nay tỏa sáng rực rỡ! Bản lĩnh, khoa học và ngập tràn đam mê, các em luôn là số một trong lòng anh!',
          '🚀 VƯỢT MỐC 25 BOOK!'
        );
      }
      // - 18 Done
      if (doneActual >= 18) {
        checkAndQueue(
          'done-18',
          '18 Done đã hoàn thành trọn vẹn! Trái ngọt xứng đáng cho sự ân cần, chân thành và khoa học của từng cuộc gọi. Anh xin gửi ngàn lời chúc mừng đến các cô gái tuyệt vời của Wings!',
          '🎉 HOÀN THÀNH 18 DONE!'
        );
      }
    },
    [enqueueCelebration]
  );

  // 8. Manual Demo Triggers (For testing & Manager preview)
  const triggerDemoCelebration = useCallback(
    (type: 'BOOK' | 'DONE' | 'MILESTONE') => {
      const demoId = `demo-${Date.now()}`;
      if (type === 'BOOK') {
        const staffName = 'Bích Phượng';
        const defaultQuote = getRandomQuote(BOOK_QUOTES, staffName);
        apiClient.telesaleTarget
          .getCelebrationQuote({ type: 'BOOK', staffName })
          .then((res) => {
            enqueueCelebration({
              id: demoId,
              kind: 'BOOK',
              staffName,
              avatarUrl:
                'https://lh3.googleusercontent.com/a/ACg8ocImU7oxC33vMir9F9rllmN4y1LVBkzJXB5ff9RCZyy-9brDnA=s96-c',
              textToSpeak: res?.quote?.trim() || defaultQuote,
              badgeText: '+1 BOOK (DEMO)',
              colorTheme: 'blue',
            });
          })
          .catch(() => {
            enqueueCelebration({
              id: demoId,
              kind: 'BOOK',
              staffName,
              avatarUrl:
                'https://lh3.googleusercontent.com/a/ACg8ocImU7oxC33vMir9F9rllmN4y1LVBkzJXB5ff9RCZyy-9brDnA=s96-c',
              textToSpeak: defaultQuote,
              badgeText: '+1 BOOK (DEMO)',
              colorTheme: 'blue',
            });
          });
      } else if (type === 'DONE') {
        const staffName = 'Thuý Kiều';
        const defaultQuote = getRandomQuote(DONE_QUOTES, staffName);
        apiClient.telesaleTarget
          .getCelebrationQuote({ type: 'DONE', staffName })
          .then((res) => {
            enqueueCelebration({
              id: demoId,
              kind: 'DONE',
              staffName,
              avatarUrl:
                'https://lh3.googleusercontent.com/a/ACg8ocIDkNj8m3jfUn2iO_gmhiuLwSJ3XF2Gaqvi69RiG3-My5olzA=s96-c',
              textToSpeak: res?.quote?.trim() || defaultQuote,
              badgeText: '+1 DONE (DEMO)',
              colorTheme: 'emerald',
            });
          })
          .catch(() => {
            enqueueCelebration({
              id: demoId,
              kind: 'DONE',
              staffName,
              avatarUrl:
                'https://lh3.googleusercontent.com/a/ACg8ocIDkNj8m3jfUn2iO_gmhiuLwSJ3XF2Gaqvi69RiG3-My5olzA=s96-c',
              textToSpeak: defaultQuote,
              badgeText: '+1 DONE (DEMO)',
              colorTheme: 'emerald',
            });
          });
      } else {
        enqueueCelebration({
          id: demoId,
          kind: 'MILESTONE',
          textToSpeak:
            '25 Book! Một con số hoàn hảo minh chứng cho sức mạnh đồng đội và 4 giá trị văn hóa Wings. Anh rất tự hào về tinh thần chiến binh ngọt ngào của tất cả các em!',
          badgeText: '👑 CÁN MỐC 25 BOOK! (DEMO)',
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
    isFadingOut,
    isQuietHours: isQuietHours(),
    ingestLiveEvents,
    checkMilestones,
    triggerDemoCelebration,
  };
}
