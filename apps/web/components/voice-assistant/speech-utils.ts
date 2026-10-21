// Helper functions for Text-to-Speech (TTS) and Speech-to-Text (STT)
import { resolveApiBaseUrl } from '../../lib/api-base-url';

export function cleanMarkdownForSpeech(markdown: string): string {
  if (!markdown) return '';

  return (
    markdown
      // Remove AI thinking blocks
      .replace(/<thinking[\s\S]*?<\/thinking>/gi, '')
      .replace(/<thinking[\s\S]*$/gi, '')
      // Remove AI action tags
      .replace(/<action[\s\S]*?<\/action>/gi, '')
      .replace(/<\/?action[^>]*>/gi, '')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Remove bold and italic markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove markdown headers
      .replace(/^#+\s+/gm, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove bullet points
      .replace(/^[-*+]\s+/gm, '')
      // Remove table borders and separators
      .replace(/\|/g, ', ')
      .replace(/-{3,}/g, '')
      // Normalize spaces and linebreaks
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

export function getBestVietnameseVoice(preferredGender?: 'male' | 'female'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Vietnamese voices list
  const viVoices = voices.filter(
    (v) =>
      v.lang === 'vi-VN' ||
      v.lang === 'vi_VN' ||
      v.lang.toLowerCase().startsWith('vi') ||
      v.name.toLowerCase().includes('vietnamese') ||
      v.name.toLowerCase().includes('tiếng việt')
  );

  // 2. Select by preferred gender if requested
  if (preferredGender === 'male' && viVoices.length > 0) {
    const maleVoice = viVoices.find(
      (v) =>
        v.name.toLowerCase().includes('nam') ||
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('minh')
    );
    if (maleVoice) return maleVoice;
  } else if (preferredGender === 'female' && viVoices.length > 0) {
    const femaleVoice = viVoices.find(
      (v) =>
        v.name.toLowerCase().includes('hoài my') ||
        v.name.toLowerCase().includes('linh') ||
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('nữ')
    );
    if (femaleVoice) return femaleVoice;
  }

  // Fallback to first Vietnamese voice
  if (viVoices.length > 0) return viVoices[0];

  // Default system voice
  const defaultVoice = voices.find((v) => v.default);
  return defaultVoice || voices[0] || null;
}

export interface SpeakTextOptions {
  rate?: number;
  pitch?: number;
  voice?: SpeechSynthesisVoice | null;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error?: unknown) => void;
}

export function speakText(
  text: string,
  optionsOrCallbacks?:
    | SpeakTextOptions
    | {
        onStart?: () => void;
        onEnd?: () => void;
        onError?: () => void;
      }
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  // Cancel prior speech
  window.speechSynthesis.cancel();

  const spokenText = cleanMarkdownForSpeech(text);
  if (!spokenText) return null;

  const utterance = new SpeechSynthesisUtterance(spokenText);
  const options = optionsOrCallbacks as SpeakTextOptions | undefined;
  const voice = options?.voice !== undefined ? options.voice : getBestVietnameseVoice();

  if (voice) {
    utterance.voice = voice;
  }
  utterance.lang = voice?.lang || 'vi-VN';
  utterance.rate = options?.rate !== undefined ? options.rate : 1.05; // Natural conversational pacing
  utterance.pitch = options?.pitch !== undefined ? options.pitch : 1.0;

  utterance.onstart = () => {
    optionsOrCallbacks?.onStart?.();
  };

  utterance.onend = () => {
    optionsOrCallbacks?.onEnd?.();
  };

  utterance.onerror = (e) => {
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      optionsOrCallbacks?.onError?.(e);
    }
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

let activeNeuralAudio: HTMLAudioElement | null = null;
let activeNeuralBlobUrl: string | null = null;

export interface NeuralTtsOptions {
  speed?: number;
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error?: unknown) => void;
}

export function stopNeuralSpeech() {
  if (activeNeuralAudio) {
    try {
      activeNeuralAudio.pause();
      activeNeuralAudio.currentTime = 0;
    } catch {
      // ignore pause error
    }
    activeNeuralAudio = null;
  }
  if (activeNeuralBlobUrl) {
    try {
      URL.revokeObjectURL(activeNeuralBlobUrl);
    } catch {
      // ignore revoke error
    }
    activeNeuralBlobUrl = null;
  }
}

export function setNeuralSpeechSpeed(speed: number) {
  if (activeNeuralAudio) {
    try {
      activeNeuralAudio.playbackRate = speed;
    } catch {
      // ignore playbackRate error
    }
  }
}

export function stopSpeaking() {
  stopNeuralSpeech();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore cancel error
    }
  }
}

export async function playNeuralSpeech(text: string, options?: NeuralTtsOptions): Promise<HTMLAudioElement | null> {
  stopSpeaking();

  const spokenText = cleanMarkdownForSpeech(text);
  if (!spokenText) return null;

  const speed = options?.speed || 1.0;
  const voice = options?.voice || 'vi-VN-HoaiMyNeural';

  try {
    const baseUrl = resolveApiBaseUrl();
    const query = new URLSearchParams({
      text: spokenText,
      voice,
      speed: String(speed),
    });
    const url = `${baseUrl}/chat/tts?${query.toString()}`;

    const res = await fetch(url, {
      mode: 'cors',
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      throw new Error(`TTS server returned status ${res.status}`);
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    activeNeuralBlobUrl = blobUrl;

    const audio = new Audio(blobUrl);
    audio.playbackRate = speed;
    activeNeuralAudio = audio;

    audio.onplay = () => {
      options?.onStart?.();
    };

    audio.onended = () => {
      stopNeuralSpeech();
      options?.onEnd?.();
    };

    audio.onerror = (e) => {
      stopNeuralSpeech();
      // Graceful fallback to browser speech synthesis
      speakText(spokenText, {
        rate: speed,
        onStart: options?.onStart,
        onEnd: options?.onEnd,
        onError: options?.onError,
      });
    };

    await audio.play();
    return audio;
  } catch (_err) {
    stopNeuralSpeech();
    // Fallback to browser speech synthesis on network failure
    speakText(spokenText, {
      rate: speed,
      onStart: options?.onStart,
      onEnd: options?.onEnd,
      onError: options?.onError,
    });
    return null;
  }
}
