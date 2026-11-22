'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { TelesaleTvQuoteItem } from '@mos-lab/shared';
import { resolveApiBaseUrl } from '~/lib/api-base-url';
import { buildSampleQuoteText, findPersonaOption } from './tvQuotesConstants';

/** Manages TTS audio preview fetching, playback, and blob URL cleanup for quote items. */
export function useTvQuoteAudioPreview() {
  const [playingQuoteId, setPlayingQuoteId] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (currentBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      } catch {
        // Ignore errors when revoking already-released object URLs
      }
      currentBlobUrlRef.current = null;
    }
    setPlayingQuoteId(null);
    setAudioLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const handlePlayPreview = useCallback(
    async (quote: TelesaleTvQuoteItem) => {
      if (playingQuoteId === quote.id) {
        stopAudio();
        return;
      }

      stopAudio();
      setPlayingQuoteId(quote.id);
      setAudioLoading(true);

      try {
        const persona = findPersonaOption(quote.personaKey);
        const sampleText = buildSampleQuoteText(quote.template);

        const params = new URLSearchParams({
          text: sampleText,
          voice: persona.voice,
          rate: persona.rate,
          pitch: persona.pitch,
        });

        const baseUrl = resolveApiBaseUrl();
        const audioUrl = `${baseUrl}/kpi/telesale-target/live-celebration-audio?${params.toString()}`;

        // Fetch via CORS as blob to avoid Chrome ORB (Opaque Response Blocking)
        const res = await fetch(audioUrl, {
          mode: 'cors',
          signal: AbortSignal.timeout(25000),
        });

        if (!res.ok) {
          throw new Error(`Audio fetch failed: ${res.status}`);
        }

        const audioBlob = await res.blob();
        const blobUrl = URL.createObjectURL(audioBlob);
        currentBlobUrlRef.current = blobUrl;

        const audio = new Audio(blobUrl);
        currentAudioRef.current = audio;

        audio.oncanplaythrough = () => {
          setAudioLoading(false);
        };

        audio.onended = () => {
          stopAudio();
        };

        audio.onerror = () => {
          message.warning('Không thể phát âm thanh nghe thử (mạng hoặc hệ thống TTS bận)');
          stopAudio();
        };

        await audio.play();
        setAudioLoading(false);
      } catch {
        message.warning('Không thể phát âm thanh nghe thử (mạng hoặc hệ thống TTS bận)');
        stopAudio();
      }
    },
    [playingQuoteId, stopAudio]
  );

  return {
    playingQuoteId,
    audioLoading,
    stopAudio,
    handlePlayPreview,
  };
}
