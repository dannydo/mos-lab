'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TelesaleTodayLiveEvent, TelesaleTvEventLog } from '@mos-lab/shared';
import { getBestVietnameseVoice } from '../../../../components/voice-assistant/speech-utils';
import { apiClient } from '../../../../lib/api-client';
import { resolveApiBaseUrl } from '../../../../lib/api-base-url';

export interface TvCelebrationSettings {
  soundEnabled: boolean;
  volume: number; // 0 to 1
  eventTypeFilter: 'ALL' | 'BOOK_ONLY' | 'DONE_ONLY';
  quietModeEnabled: boolean; // Manual quiet mode or during quiet hours
  voiceStyle?: 'MALE_CHARM' | 'FEMALE_SWEET' | 'BROWSER_LOCAL';
  fireworksEnabled?: boolean;
}

export interface ActiveCelebration {
  id: string;
  kind: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP' | 'MILESTONE';
  staffId?: number;
  staffName?: string;
  avatarUrl?: string | null;
  textToSpeak: string;
  badgeText: string;
  colorTheme: 'blue' | 'emerald' | 'amber' | 'purple' | 'gold';
  changeResult?: string;
  orderId?: number;
  hasCombo?: boolean;
  comboPackageName?: string;
  comboPrice?: number;
  hasTip?: boolean;
  tipAmount?: number;
  customerPraiseNote?: string;
  customerName?: string;
  assignedStaffName?: string;
  checkInStaffName?: string;
}

const SETTINGS_STORAGE_KEY = 'MOS_TV_MONITOR_VOICE_SETTINGS';

const DEFAULT_SETTINGS: TvCelebrationSettings = {
  soundEnabled: true,
  volume: 0.9,
  eventTypeFilter: 'ALL',
  quietModeEnabled: false,
  voiceStyle: 'MALE_CHARM',
  fireworksEnabled: true,
};

// Script quotes: Charming Male Voice, Playful Cà Khịa, Die Up Die Down & 4 Wings Cultural Values (Vui vẻ, Ân Cần, Chân Thành, Khoa Học)
const BOOK_QUOTES = [
  'Lại thêm một Book từ [Tên]! Em cứ liên tục tỏa sáng thế này làm anh xao xuyến, con tim đập loạn nhịp rồi đấy nhé!',
  'Alo alo, [Tên] lại nổ Book! Em chốt đơn lia lịa như máy chém thế này thì cả phòng chỉ có nước die up die down thôi!',
  '[Tên] ơi là [Tên], em tính thầu luôn cả chỉ tiêu phòng Telesales hôm nay hay sao mà Book về dồn dập thế!',
  'Khách vừa nghe giọng [Tên] là chốt vội lịch hẹn! Duyên dáng thế này bảo sao khách không mê đứ đừ!',
  'Thêm một Book rực rỡ từ [Tên]! Phong độ đỉnh nóc kịch trần, làm anh chết lên chết xuống vì nể phục em rồi đấy!',
  'Một Book ngọt lịm từ [Tên]! Em tư vấn khéo léo thế này thì khách chỉ có nước gật đầu lia lịa rồi chốt lịch cái rụp!',
  'Ting ting! [Tên] vừa tung tuyệt chiêu kéo thêm một Book, làm cả phòng xôn xao náo nhiệt luôn rồi!',
];

const CHECKIN_QUOTES = [
  'Khách của [Tên] đã vào tới cửa tiệm rồi! Chăm sóc kiểu gì mà khách mê mẩn đến đúng từng phút, làm anh chết lên chết xuống vì nể em!',
  '[Tên] vừa kéo thêm một lượt Check-in! Khách nghe giọng ngọt như mía lùi là tự động xách xe phi tới tiệm ngay, đỉnh nóc kịch trần!',
  'Khách vào ghế rồi các em ơi! Sự ân cần của [Tên] làm khách mê say đắm, cả phòng lại chuẩn bị die up die down rồi!',
  'Check-in thành công cho [Tên]! Dẫn dắt khách đến tiệm mượt mà như một cơn gió, đẳng cấp không thể chối từ!',
  'Thêm một khách check-in tươi rói của [Tên]! Năng lượng vui vẻ của em thắp sáng rực rỡ cả salon hôm nay rồi!',
];

const COMBO_QUOTES = [
  'Ủa ủa [Tên] ơi! Khách đi làm đẹp sương sương mà em chốt luôn gói Combo, tính làm khách mê Wings tới già luôn đúng không?',
  'Bùng nổ rồi [Tên] ơi! Khách tin yêu chốt ngay gói Combo, em tư vấn đỉnh thế này thì ví khách chỉ có nước die up die down!',
  'Siêu phẩm Combo về tay [Tên]! Em chốt đơn bén như máy chém, làm anh xao xuyến cả buổi chiều!',
  'Đẳng cấp tư vấn khoa học của [Tên] là đây! Khách chốt trọn Combo trong một nốt nhạc, quá đỗi quyến rũ em ơi!',
];

const TIP_QUOTES = [
  'Ting ting, khách thưởng Tip cho [Tên]! Vừa duyên dáng lại vừa ân cần, khách thương khách nhớ tip tới tấp thế này thì ai làm lại em!',
  'Khách mê tay nghề Chuyên Viên hay mê nụ cười của [Tên] mà thưởng Tip thế này? Đẳng cấp làm cả phòng die up die down!',
  'Một món quà Tip ngọt ngào từ khách yêu gửi tặng [Tên]! Sự chăm sóc chuẩn 5 sao làm anh chết lên chết xuống vì tự hào!',
  'Khách gửi trọn niềm tin và thưởng Tip liền tay cho [Tên]! Phong độ đỉnh cao của em khiến ai cũng phải trầm trồ thán phục!',
];

const COMBO_TIP_QUOTES = [
  'Siêu phẩm hôm nay đây rồi! Vừa chốt trọn Combo lại vừa được khách thưởng Tip! [Tên] hôm nay làm cả phòng die up die down vì ngỡ ngàng!',
  'Đẳng cấp nhân đôi! Cả Combo lẫn Tip đều về tay [Tên]! Em xuất sắc thế này làm anh xao xuyến, chết lên chết xuống vì tự hào!',
];

const DONE_QUOTES = [
  'Xong một Done ngọt ngào cho [Tên]! Khách làm đẹp xong cười tít mắt, phong độ của em hôm nay đúng là làm cả phòng die up die down!',
  'Một ca Done xuất sắc của [Tên]! Em tư vấn bài bản, khoa học thế này thì khách chỉ có nước khen nức nở rồi mê đứ đừ!',
  'Done về rực rỡ cho [Tên]! Chăm sóc từ A đến Z không một vết xước, em làm con tim anh xao xuyến quá rồi đấy!',
  'Chúc mừng [Tên] thêm một Done hoàn hảo! Em cứ làm việc nhiệt huyết thế này thì tiền thưởng chỉ có nước nhảy múa không ngừng!',
  'Khách làm xong ngắm gương rồi gật gù khen [Tên] nức nở! Dẫn dắt khách chuẩn chỉ thế này thì ai đọ lại em!',
];

export function getRandomQuote(quotes: string[], name: string): string {
  const template = quotes[Math.floor(Math.random() * quotes.length)] || quotes[0];
  return template.replace(/\[Tên\]/g, name);
}

export function formatCurrencyForSpeech(amount?: number | null): string {
  if (!amount || amount <= 0) return '';
  const num = Math.round(Number(amount));
  if (num >= 1_000_000) {
    const millions = Math.floor(num / 1_000_000);
    const remainder = num % 1_000_000;
    const thousands = Math.round(remainder / 1000);
    if (thousands > 0) {
      return `${millions} triệu ${thousands} nghìn đồng`;
    }
    return `${millions} triệu đồng`;
  }
  if (num >= 1000) {
    const thousands = Math.round(num / 1000);
    return `${thousands} nghìn đồng`;
  }
  return `${num} đồng`;
}

// Synthesize pleasant celebratory chime with Web Audio API
function playCelebratoryChime(
  volume = 0.9,
  kind: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP' | 'MILESTONE' = 'BOOK'
) {
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

    // Chime chords: higher pitches for Milestone, bright for Book/Done/Checkin/Combo/Tip
    const baseFreqs =
      kind === 'MILESTONE'
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === 'COMBO'
          ? [440, 554.37, 659.25, 880]
          : kind === 'TIP'
            ? [587.33, 739.99, 880, 1174.66]
            : kind === 'CHECKIN'
              ? [523.25, 659.25, 783.99]
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
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const storageKey = `MOS_TV_MONITOR_EVENT_LOGS_${todayKey}`;

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

    const logBase: Omit<TelesaleTvEventLog, 'voiceTriggered' | 'voiceErrorReason' | 'status' | 'errorMessage'> = {
      id: nextEvent.id,
      type: nextEvent.kind,
      staffId: nextEvent.staffId,
      staffName: nextEvent.staffName || 'Telesales',
      avatarUrl: nextEvent.avatarUrl,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      changeResult:
        nextEvent.changeResult ||
        (nextEvent.kind === 'BOOK' ? '+1 Book' : nextEvent.kind === 'DONE' ? '+1 Done' : 'Cán mốc'),
      orderId: nextEvent.orderId,
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

          utterance.onend = () => finishCelebration(true);
          utterance.onerror = () => finishCelebration(false, 'Lỗi tổng hợp giọng nói từ trình duyệt');
          window.speechSynthesis.speak(utterance);
        } else {
          finishCelebration(false, 'Trình duyệt không hỗ trợ phát âm thanh');
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
          finishCelebration(true);
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
          setTimeout(processQueue, 1500);
        }, 450);
      }, 4500);
    }
  }, [isQuietHours, recordEventLog, settings.soundEnabled, settings.volume, settings.voiceStyle]);

  // 5. Enqueue celebration event
  const enqueueCelebration = useCallback(
    (event: ActiveCelebration) => {
      // Prevent duplicates in celebration queue
      if (enqueuedIdsRef.current.has(event.id)) return;
      enqueuedIdsRef.current.add(event.id);

      // Check manager filter
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
          timeFormatted: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh',
          }),
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
      try {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx
              .resume()
              .then(() => ctx.close())
              .catch(() => {});
          } else {
            ctx.close().catch(() => {});
          }
        }
        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        silentAudio.volume = 0.01;
        silentAudio
          .play()
          .then(() => silentAudio.pause())
          .catch(() => {});
      } catch {}
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
            // If already processed and recorded in local journal earlier today, preserve its existing record!
            if (existingLogMap.has(ev.id)) continue;

            recordEventLog({
              id: ev.id,
              type: ev.type,
              staffId: ev.staffId,
              staffName: ev.staffName || 'Telesales',
              avatarUrl: ev.avatarUrl,
              timestamp: ev.timestamp,
              timeFormatted: new Date(ev.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Ho_Chi_Minh',
              }),
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

        if (ev.type === 'BOOK') {
          const defaultQuote = getRandomQuote(BOOK_QUOTES, staffName);
          // Fetch quote with 1500ms timeout so we don't delay celebration
          const quotePromise = Promise.race([
            apiClient.telesaleTarget.getCelebrationQuote({ type: 'BOOK', staffName }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);

          quotePromise
            .then((res: SafeAny) => {
              const quote = res?.quote?.trim() || defaultQuote;
              enqueueCelebration({
                id: ev.id,
                kind: 'BOOK',
                staffId: ev.staffId,
                staffName,
                avatarUrl: ev.avatarUrl,
                textToSpeak: quote,
                badgeText: '+1 BOOK HÔM NAY',
                colorTheme: 'blue',
                changeResult: ev.changeResult,
                orderId: ev.orderId,
              });
            })
            .catch(() => {
              enqueueCelebration({
                id: ev.id,
                kind: 'BOOK',
                staffId: ev.staffId,
                staffName,
                avatarUrl: ev.avatarUrl,
                textToSpeak: defaultQuote,
                badgeText: '+1 BOOK HÔM NAY',
                colorTheme: 'blue',
                changeResult: ev.changeResult,
                orderId: ev.orderId,
              });
            });
        } else if (ev.type === 'CHECKIN') {
          const defaultQuote = getRandomQuote(CHECKIN_QUOTES, staffName);
          const quotePromise = Promise.race([
            apiClient.telesaleTarget.getCelebrationQuote({ type: 'CHECKIN', staffName }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);

          quotePromise
            .then((res: SafeAny) => {
              const quote = res?.quote?.trim() || defaultQuote;
              enqueueCelebration({
                id: ev.id,
                kind: 'CHECKIN',
                staffId: ev.staffId,
                staffName,
                avatarUrl: ev.avatarUrl,
                textToSpeak: quote,
                badgeText: '+1 CHECK-IN KHÁCH LẺ',
                colorTheme: 'emerald',
                changeResult: ev.changeResult,
                orderId: ev.orderId,
              });
            })
            .catch(() => {
              enqueueCelebration({
                id: ev.id,
                kind: 'CHECKIN',
                staffId: ev.staffId,
                staffName,
                avatarUrl: ev.avatarUrl,
                textToSpeak: defaultQuote,
                badgeText: '+1 CHECK-IN KHÁCH LẺ',
                colorTheme: 'emerald',
                changeResult: ev.changeResult,
                orderId: ev.orderId,
              });
            });
        } else if (ev.type === 'DONE') {
          // Xử lý các loại vinh danh: Lời khen của khách (Ưu tiên số 1) > Combo & Tip > Combo > Tip
          const hasCombo = !!ev.hasCombo;
          const hasTip = !!ev.hasTip;
          const hasPraise = !!ev.customerPraiseNote;
          const praiseNote = ev.customerPraiseNote || '';
          const customerName = ev.customerName || 'Khách yêu';
          const cvName = ev.assignedStaffName || 'Chuyên Viên';
          const ccName = ev.checkInStaffName || staffName;

          if (hasPraise) {
            // Trường hợp khách có lời nhắn khen ngợi chân thành (đã qua AI sentiment filter)
            let praiseQuote = '';
            const tipSpeech = formatCurrencyForSpeech(ev.tipAmount);
            const tipText = ev.tipAmount ? ` ${ev.tipAmount.toLocaleString('vi-VN')}đ` : '';
            let badgeText = '💌 LỜI KHEN TỪ KHÁCH YÊU!';

            if (hasTip && tipSpeech) {
              badgeText = `👑 TIP${tipText} & LỜI KHEN NGỌT NGÀO!`;
              praiseQuote = `Khách yêu ${customerName} vừa gửi tặng tiền tip ${tipSpeech} cùng lời khen ngọt ngào: "${praiseNote}". Chúc mừng Chuyên Viên ${cvName} và Tư Vấn ${ccName} đã tạo nên trải nghiệm tuyệt vời!`;
            } else {
              badgeText = `💌 LỜI KHEN TỪ KHÁCH YÊU!`;
              praiseQuote = `Khách yêu ${customerName} vừa gửi lời khen ngọt ngào: "${praiseNote}". Chúc mừng Chuyên Viên ${cvName} và Tư Vấn ${ccName} đã đồng hành xuất sắc!`;
            }

            enqueueCelebration({
              id: ev.id,
              kind: 'TIP', // Chime vàng kim vui tươi
              staffId: ev.staffId,
              staffName,
              avatarUrl: ev.avatarUrl,
              textToSpeak: praiseQuote,
              badgeText,
              colorTheme: 'gold',
              changeResult: ev.changeResult,
              orderId: ev.orderId,
              hasCombo,
              comboPackageName: ev.comboPackageName,
              hasTip,
              tipAmount: ev.tipAmount,
              customerPraiseNote: praiseNote,
              customerName,
              assignedStaffName: cvName,
              checkInStaffName: ccName,
            });
          } else if (hasCombo && hasTip) {
            const comboName = ev.comboPackageName || 'gói Combo làm đẹp';
            const priceSpeech = ev.comboPrice ? ` trị giá ${formatCurrencyForSpeech(ev.comboPrice)}` : '';
            const tipSpeech = formatCurrencyForSpeech(ev.tipAmount);
            const tipText = ev.tipAmount ? ` ${ev.tipAmount.toLocaleString('vi-VN')}đ` : '';
            const comboPriceBadge = ev.comboPrice ? ` (${ev.comboPrice.toLocaleString('vi-VN')}đ)` : '';

            const comboTipQuotes = [
              `Ủa ủa ${staffName} ơi! Vừa chốt trọn ${comboName}${priceSpeech}, lại vừa ẵm luôn tiền tip ${tipSpeech}! Em làm ăn kiểu này thì cả phòng chỉ có nước die up die down thôi!`,
              `Kỳ tích chấn động phòng Telesales! Cả ${comboName}${priceSpeech} lẫn tiền tip ${tipSpeech} đều về tay ${staffName} và Chuyên Viên ${cvName}! Em xuất sắc thế này làm anh xao xuyến, chết lên chết xuống vì nể phục!`,
              `Siêu phẩm kép hôm nay đây rồi! Khách mê ${staffName} hay mê Chuyên Viên ${cvName} mà chốt luôn ${comboName}${priceSpeech} rồi tip hẳn ${tipSpeech}! Đẳng cấp đỉnh nóc kịch trần em ơi!`,
            ];
            const defaultQuote = comboTipQuotes[Math.floor(Math.random() * comboTipQuotes.length)];

            const quotePromise = Promise.race([
              apiClient.telesaleTarget.getCelebrationQuote({
                type: 'COMBO',
                staffName,
                comboPackageName: comboName,
                comboPrice: ev.comboPrice,
                tipAmount: ev.tipAmount,
                cvStaffName: cvName,
                customerName,
              }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
            ]);

            const triggerComboTip = (quoteText: string) => {
              enqueueCelebration({
                id: ev.id,
                kind: 'COMBO',
                staffId: ev.staffId,
                staffName,
                avatarUrl: ev.avatarUrl,
                textToSpeak: quoteText,
                badgeText: `👑 +${comboName.toUpperCase()}${comboPriceBadge} & TIP${tipText}!`,
                colorTheme: 'purple',
                changeResult: ev.changeResult,
                orderId: ev.orderId,
                hasCombo: true,
                comboPackageName: ev.comboPackageName,
                comboPrice: ev.comboPrice,
                hasTip: true,
                tipAmount: ev.tipAmount,
                assignedStaffName: cvName,
                checkInStaffName: ccName,
              });
            };

            quotePromise
              .then((res: SafeAny) => triggerComboTip(res?.quote?.trim() || defaultQuote))
              .catch(() => triggerComboTip(defaultQuote));
          } else if (hasCombo) {
            const comboName = ev.comboPackageName || 'gói Combo làm đẹp';
            const priceSpeech = ev.comboPrice ? ` trị giá ${formatCurrencyForSpeech(ev.comboPrice)}` : '';
            const comboPriceBadge = ev.comboPrice ? ` (${ev.comboPrice.toLocaleString('vi-VN')}đ)` : '';

            const comboQuotes = [
              `Ủa ủa ${staffName} ơi! Khách đi làm đẹp sương sương mà em chốt luôn ${comboName}${priceSpeech}, tính làm khách mê Wings tới già luôn đúng không?`,
              `Bùng nổ rồi ${staffName} ơi! Khách tin yêu chốt ngay ${comboName}${priceSpeech}, em tư vấn đỉnh thế này thì ví khách chỉ có nước die up die down!`,
              `Siêu phẩm ${comboName}${priceSpeech} về tay ${staffName}! Em chốt đơn bén như máy chém, làm anh xao xuyến cả buổi chiều!`,
              `Đẳng cấp tư vấn khoa học của ${staffName} và Chuyên Viên ${cvName} là đây! Khách chốt trọn ${comboName}${priceSpeech} trong một nốt nhạc, quá đỗi quyến rũ em ơi!`,
            ];
            const defaultQuote = comboQuotes[Math.floor(Math.random() * comboQuotes.length)];

            const quotePromise = Promise.race([
              apiClient.telesaleTarget.getCelebrationQuote({
                type: 'COMBO',
                staffName,
                comboPackageName: comboName,
                comboPrice: ev.comboPrice,
                cvStaffName: cvName,
                customerName,
              }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
            ]);

            const triggerCombo = (quoteText: string) => {
              enqueueCelebration({
                id: ev.id,
                kind: 'COMBO',
                staffId: ev.staffId,
                staffName,
                avatarUrl: ev.avatarUrl,
                textToSpeak: quoteText,
                badgeText: `✨ +CHỐT ${comboName.toUpperCase()}${comboPriceBadge}!`,
                colorTheme: 'purple',
                changeResult: ev.changeResult,
                orderId: ev.orderId,
                hasCombo: true,
                comboPackageName: ev.comboPackageName,
                comboPrice: ev.comboPrice,
                assignedStaffName: cvName,
                checkInStaffName: ccName,
              });
            };

            quotePromise
              .then((res: SafeAny) => triggerCombo(res?.quote?.trim() || defaultQuote))
              .catch(() => triggerCombo(defaultQuote));
          } else if (hasTip) {
            const tipSpeech = formatCurrencyForSpeech(ev.tipAmount);
            const tipText = ev.tipAmount ? ` ${ev.tipAmount.toLocaleString('vi-VN')}đ` : '';

            const tipQuotes = [
              `Ting ting, khách thưởng tip ${tipSpeech} cho ${ccName} và Chuyên Viên ${cvName}! Vừa duyên dáng lại vừa ân cần, khách thương khách nhớ tip tới tấp thế này thì ai làm lại các em!`,
              `Khách mê tay nghề Chuyên Viên ${cvName} hay mê nụ cười của ${ccName} mà tip hẳn ${tipSpeech} thế này? Đẳng cấp làm cả phòng die up die down!`,
              `Một món quà tip ${tipSpeech} ngọt ngào từ khách yêu gửi tặng ${ccName} và ${cvName}! Sự chăm sóc chuẩn 5 sao làm anh chết lên chết xuống vì tự hào!`,
              `Khách gửi trọn niềm tin và tip ${tipSpeech} liền tay! Phong độ đỉnh cao của ${ccName} và ${cvName} hôm nay khiến ai cũng phải trầm trồ thán phục!`,
            ];
            const defaultQuote = tipQuotes[Math.floor(Math.random() * tipQuotes.length)];

            const quotePromise = Promise.race([
              apiClient.telesaleTarget.getCelebrationQuote({
                type: 'TIP',
                staffName: ccName,
                tipAmount: ev.tipAmount,
                cvStaffName: cvName,
                customerName,
              }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
            ]);

            const triggerTip = (quoteText: string) => {
              enqueueCelebration({
                id: ev.id,
                kind: 'TIP',
                staffId: ev.staffId,
                staffName,
                avatarUrl: ev.avatarUrl,
                textToSpeak: quoteText,
                badgeText: `💛 +TIP KHÁCH THƯỞNG${tipText}!`,
                colorTheme: 'gold',
                changeResult: ev.changeResult,
                orderId: ev.orderId,
                hasTip: true,
                tipAmount: ev.tipAmount,
                assignedStaffName: cvName,
                checkInStaffName: ccName,
              });
            };

            quotePromise
              .then((res: SafeAny) => triggerTip(res?.quote?.trim() || defaultQuote))
              .catch(() => triggerTip(defaultQuote));
          } else {
            // Đơn thường hoàn tất: Ghi nhận êm ái vào nhật ký, không làm phiền phòng trực
            recordEventLog({
              id: ev.id,
              type: 'DONE',
              staffId: ev.staffId,
              staffName,
              avatarUrl: ev.avatarUrl,
              timestamp: ev.timestamp,
              timeFormatted: new Date(ev.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Ho_Chi_Minh',
              }),
              changeResult: ev.changeResult || 'Done (Đơn thường)',
              orderId: ev.orderId,
              eventReceived: true,
              eventReceivedAt: new Date().toISOString(),
              voiceTriggered: false,
              voiceErrorReason: 'Đơn thường hoàn tất (không combo/tip)',
              overlayTriggered: false,
              overlayErrorReason: 'Đơn thường hoàn tất (không combo/tip)',
              status: 'SUCCESS',
              errorMessage: null,
            });
          }
        }
      }
    },
    [enqueueCelebration, recordEventLog]
  );

  // 7. Milestone Checkers
  const checkMilestones = useCallback(
    (date: string, bookActual: number, doneActual: number, checkinActual: number = 0) => {
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
        if (checkinActual >= 18) announcedMilestonesRef.current.add(`milestone-${date}-checkin-18`);
        if (checkinActual > 18) announcedMilestonesRef.current.add(`milestone-${date}-checkin-gt18`);
        if (doneActual >= 18) announcedMilestonesRef.current.add(`milestone-${date}-done-18`);
        saveMilestonesToStorage();
        return;
      }

      const checkAndQueue = (key: string, text: string, badge: string, colorTheme: 'amber' | 'emerald' = 'amber') => {
        const milestoneKey = `milestone-${date}-${key}`;
        if (!announcedMilestonesRef.current.has(milestoneKey)) {
          announcedMilestonesRef.current.add(milestoneKey);
          saveMilestonesToStorage();
          enqueueCelebration({
            id: milestoneKey,
            kind: 'MILESTONE',
            staffName: 'Toàn team Telesales & Sảnh đón',
            textToSpeak: text,
            badgeText: badge,
            colorTheme,
            changeResult: badge,
          });
        }
      };

      // Milestone rules (Specification 3 & Wings 4 Cultural Keys):
      // - 10 Book
      if (bookActual >= 10) {
        checkAndQueue(
          'book-10',
          'Cả đội chú ý! 10 Book đã vào giỏ rồi! Năng lượng vui vẻ và chân thành của các em đang thắp sáng cả ngày hôm nay. Tiếp tục cùng anh tăng tốc bùng nổ nhé!',
          '🏆 CÁN MỐC 10 BOOK!',
          'amber'
        );
      }
      // - 20 Book
      if (bookActual >= 20) {
        checkAndQueue(
          'book-20',
          'Xuất sắc lắm các cô gái của anh! 20 Book rồi! Tư vấn khoa học, chăm sóc ân cần, phong độ của cả đội hôm nay thực sự quá đỗi quyến rũ và không thể ngăn cản!',
          '🔥 CHẠM MỐC 20 BOOK!',
          'amber'
        );
      }
      // - 25 Book
      if (bookActual >= 25) {
        checkAndQueue(
          'book-25',
          '25 Book! Một con số hoàn hảo minh chứng cho sức mạnh đồng đội và 4 giá trị văn hóa Wings. Anh rất tự hào về tinh thần chiến binh ngọt ngào của tất cả các em!',
          '👑 CÁN MỐC 25 BOOK!',
          'amber'
        );
      }
      // - Vượt 25 Book
      if (bookActual > 25) {
        checkAndQueue(
          'book-gt25',
          'Kỳ tích vượt 25 Book rồi! Cả phòng Telesales hôm nay tỏa sáng rực rỡ! Bản lĩnh, khoa học và ngập tràn đam mê, các em luôn là số một trong lòng anh!',
          '🚀 VƯỢT MỐC 25 BOOK!',
          'amber'
        );
      }
      // - 18 Check-in Khách lẻ (100% chỉ tiêu)
      if (checkinActual >= 18) {
        checkAndQueue(
          'checkin-18',
          'Chúc mừng cả đội Telesales và Sảnh đón! 18 lượt Check-in khách lẻ đã hoàn thành trọn vẹn, đạt 100% chỉ tiêu hôm nay! Tinh thần tiếp đón nồng hậu, ân cần và chuyên nghiệp của các em đã tạo nên một ngày rực rỡ. Xin nhiệt liệt chúc mừng tất cả các thiên thần Wings!',
          '🎉 HOÀN THÀNH 18 CHECK-IN!',
          'emerald'
        );
      }
      // - Vượt 18 Check-in Khách lẻ
      if (checkinActual > 18) {
        checkAndQueue(
          'checkin-gt18',
          'Kỳ tích vượt 18 Check-in khách lẻ rồi! Sảnh đón và đội ngũ tư vấn hôm nay làm việc quá xuất sắc! Xin chúc mừng tất cả các thiên thần Wings!',
          '🚀 VƯỢT MỐC 18 CHECK-IN!',
          'emerald'
        );
      }
      // - 18 Done
      if (doneActual >= 18) {
        checkAndQueue(
          'done-18',
          '18 Done đã hoàn thành trọn vẹn! Trái ngọt xứng đáng cho sự ân cần, chân thành và khoa học của từng cuộc gọi. Anh xin gửi ngàn lời chúc mừng đến các cô gái tuyệt vời của Wings!',
          '🎉 HOÀN THÀNH 18 DONE!',
          'amber'
        );
      }
    },
    [enqueueCelebration]
  );

  // 8. Manual Demo Triggers (For testing & Manager preview)
  const triggerDemoCelebration = useCallback(
    (type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP' | 'MILESTONE' | 'CHECKIN_18') => {
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
      } else if (type === 'CHECKIN') {
        const staffName = 'Thuý Kiều';
        const defaultQuote = getRandomQuote(CHECKIN_QUOTES, staffName);
        enqueueCelebration({
          id: demoId,
          kind: 'CHECKIN',
          staffName,
          avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIDkNj8m3jfUn2iO_gmhiuLwSJ3XF2Gaqvi69RiG3-My5olzA=s96-c',
          textToSpeak: defaultQuote,
          badgeText: '+1 CHECK-IN (DEMO)',
          colorTheme: 'emerald',
        });
      } else if (type === 'COMBO') {
        const staffName = 'Bích Phượng';
        const comboName = 'Combo Nàng Thơ 5 Buổi';
        const comboPrice = 5900000;
        const priceSpeech = ` trị giá ${formatCurrencyForSpeech(comboPrice)}`;
        enqueueCelebration({
          id: demoId,
          kind: 'COMBO',
          staffName,
          avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocImU7oxC33vMir9F9rllmN4y1LVBkzJXB5ff9RCZyy-9brDnA=s96-c',
          textToSpeak: `Đỉnh cao tư vấn! Chúc mừng ${staffName} vừa chốt thành công ${comboName}${priceSpeech}! Đẳng cấp và chuyên nghiệp quá em ơi!`,
          badgeText: '✨ +CHỐT COMBO NÀNG THƠ (5.900.000đ)! (DEMO)',
          colorTheme: 'purple',
          hasCombo: true,
          comboPackageName: comboName,
          comboPrice,
        });
      } else if (type === 'TIP') {
        const staffName = 'Thuý Kiều';
        const cvName = 'Thuý Kiều';
        const ccName = 'Bích Phượng';
        const tipAmount = 100000;
        const tipSpeech = formatCurrencyForSpeech(tipAmount);
        enqueueCelebration({
          id: demoId,
          kind: 'TIP',
          staffName,
          avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIDkNj8m3jfUn2iO_gmhiuLwSJ3XF2Gaqvi69RiG3-My5olzA=s96-c',
          textToSpeak: `Khách yêu vừa gửi tặng tiền tip ${tipSpeech}! Chúc mừng Chuyên Viên ${cvName} và Tư Vấn ${ccName} đã mang lại sự hài lòng tuyệt đối!`,
          badgeText: '💛 +TIP KHÁCH THƯỞNG 100.000đ! (DEMO)',
          colorTheme: 'gold',
          hasTip: true,
          tipAmount,
          assignedStaffName: cvName,
          checkInStaffName: ccName,
        });
      } else if (type === 'DONE') {
        const staffName = 'Thuý Kiều';
        const defaultQuote = getRandomQuote(DONE_QUOTES, staffName);
        enqueueCelebration({
          id: demoId,
          kind: 'DONE',
          staffName,
          avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIDkNj8m3jfUn2iO_gmhiuLwSJ3XF2Gaqvi69RiG3-My5olzA=s96-c',
          textToSpeak: defaultQuote,
          badgeText: '+1 DONE (DEMO)',
          colorTheme: 'emerald',
        });
      } else if (type === 'CHECKIN_18') {
        enqueueCelebration({
          id: demoId,
          kind: 'MILESTONE',
          staffName: 'Toàn team Telesales & Sảnh đón',
          textToSpeak:
            'Chúc mừng cả đội Telesales và Sảnh đón! 18 lượt Check-in khách lẻ đã hoàn thành trọn vẹn, đạt 100% chỉ tiêu hôm nay! Tinh thần tiếp đón nồng hậu, ân cần và chuyên nghiệp của các em đã tạo nên một ngày rực rỡ. Xin nhiệt liệt chúc mừng tất cả các thiên thần Wings!',
          badgeText: '🎉 HOÀN THÀNH 18 CHECK-IN! (DEMO)',
          colorTheme: 'emerald',
          changeResult: '18/18 In · 100% ĐẠT',
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
    recordEventLog,
  };
}
