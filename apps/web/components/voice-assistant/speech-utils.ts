// Helper functions for Text-to-Speech (TTS) and Speech-to-Text (STT)

export function cleanMarkdownForSpeech(markdown: string): string {
  if (!markdown) return '';

  return (
    markdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove bold and italic markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
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

export function getBestVietnameseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Exact Vietnamese language match
  const viExact = voices.find(
    (v) =>
      v.lang === 'vi-VN' ||
      v.lang === 'vi_VN' ||
      v.lang.toLowerCase().startsWith('vi') ||
      v.name.toLowerCase().includes('vietnamese') ||
      v.name.toLowerCase().includes('tiếng việt')
  );
  if (viExact) return viExact;

  // 2. Default voice
  const defaultVoice = voices.find((v) => v.default);
  return defaultVoice || voices[0] || null;
}

export function speakText(
  text: string,
  callbacks?: {
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
  const voice = getBestVietnameseVoice();

  if (voice) {
    utterance.voice = voice;
  }
  utterance.lang = voice?.lang || 'vi-VN';
  utterance.rate = 1.05; // Slightly faster natural conversational pacing
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    callbacks?.onStart?.();
  };

  utterance.onend = () => {
    callbacks?.onEnd?.();
  };

  utterance.onerror = (e) => {
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      callbacks?.onError?.();
    }
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
