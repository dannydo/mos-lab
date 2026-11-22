import { getBestVietnameseVoice } from '~/components/voice-assistant/speech-utils';
import { resolveApiBaseUrl } from '~/lib/api-base-url';
import type { ActiveCelebration, TvCelebrationSettings } from './tvCelebrationTypes';

// Synthesize pleasant celebratory chime with Web Audio API
export function playCelebratoryChime(
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

// Synthesize distinct Meme SFX Intro per Persona
export function playCelebratorySFX(
  sfxType?: string,
  volume = 0.9,
  kind: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP' | 'MILESTONE' = 'BOOK'
) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (sfxType === 'vuvuzela_cheer') {
      // 🎪 MC Hội Chợ: Stadium Horn / Vuvuzela Fanfare (B-flat 3, 233Hz, sawtooth with brass filter)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(233.08, now);
      osc2.frequency.setValueAtTime(234.5, now);

      osc1.frequency.exponentialRampToValueAtTime(466.16, now + 0.35);
      osc2.frequency.exponentialRampToValueAtTime(468.0, now + 0.35);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.3);

      gain.gain.setValueAtTime(volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.85);
      osc2.stop(now + 0.85);
      return;
    }

    if (sfxType === 'drama_stinger') {
      // 🎭 Cụ Tổ Drama: Dramatic Stinger (Diminished chords sting - C# minor / diminished hit)
      const freqs = [277.18, 329.63, 392.0, 466.16];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(volume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.9);
      });
      return;
    }

    if (sfxType === 'temple_bell') {
      // 🔮 Thầy Bói: Temple Tibetan singing bowl / bell (deep 174Hz Solfeggio + 528Hz shimmer)
      const freqs = [174.0, 528.0, 1056.0];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const initialGain = (idx === 0 ? 0.5 : 0.2) * volume;
        gain.gain.setValueAtTime(initialGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.6);
      });
      return;
    }

    if (sfxType === 'pop_ting') {
      // 📱 Gen Z: Bubble pop sweep (200Hz -> 850Hz) + High coin ting (2093Hz C7)
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(200, now);
      popOsc.frequency.exponentialRampToValueAtTime(850, now + 0.12);
      popGain.gain.setValueAtTime(volume * 0.4, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      popOsc.connect(popGain);
      popGain.connect(ctx.destination);
      popOsc.start(now);
      popOsc.stop(now + 0.15);

      const tingOsc = ctx.createOscillator();
      const tingGain = ctx.createGain();
      tingOsc.type = 'sine';
      tingOsc.frequency.setValueAtTime(2093, now + 0.12);
      tingGain.gain.setValueAtTime(0, now);
      tingGain.gain.setValueAtTime(volume * 0.35, now + 0.12);
      tingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      tingOsc.connect(tingGain);
      tingGain.connect(ctx.destination);
      tingOsc.start(now + 0.12);
      tingOsc.stop(now + 0.8);
      return;
    }

    if (sfxType === 'smooth_sax') {
      // 🕶️ Tổng Tài: Smooth jazz chords (F4, Ab4, C5, Eb5)
      const freqs = [349.23, 415.3, 523.25, 622.25];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(volume * 0.3, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + 1.1);
      });
      return;
    }

    // Default pleasant chime
    playCelebratoryChime(volume, kind);
  } catch {
    // AudioContext blocked or unsupported
  }
}

export function unlockBrowserAudio() {
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
}

export function playCelebrationVoice(params: {
  event: ActiveCelebration;
  settings: TvCelebrationSettings;
  onFinish: (success?: boolean, voiceErrorReason?: string | null) => void;
}) {
  const { event, settings, onFinish } = params;

  const fallbackToBrowserSynthesis = () => {
    const isMaleCharm = (settings.voiceStyle || 'MALE_CHARM') === 'MALE_CHARM';
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const voice = getBestVietnameseVoice(isMaleCharm ? 'male' : 'female') || getBestVietnameseVoice('female');

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(event.textToSpeak);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = settings.volume;

      utterance.onend = () => onFinish(true);
      utterance.onerror = () => onFinish(false, 'Lỗi tổng hợp giọng nói từ trình duyệt');
      window.speechSynthesis.speak(utterance);
    } else {
      onFinish(false, 'Trình duyệt không hỗ trợ phát âm thanh');
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
      onFinish(true);
    };

    const handleFailureFallback = () => {
      if (hasEnded) return;
      hasEnded = true;
      cleanup();
      fallbackToBrowserSynthesis();
    };

    (async () => {
      try {
        const voice =
          event.voiceParams?.voice ||
          (settings.voiceStyle === 'FEMALE_SWEET' ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural');
        const rate = event.voiceParams?.rate || '+5%';
        const pitch = event.voiceParams?.pitch || '+0Hz';
        const baseUrl = resolveApiBaseUrl();
        const audioUrl = `${baseUrl}/kpi/telesale-target/live-celebration-audio?text=${encodeURIComponent(
          event.textToSpeak
        )}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}&pitch=${encodeURIComponent(pitch)}`;

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

    return cleanup;
  }

  fallbackToBrowserSynthesis();
  return undefined;
}
