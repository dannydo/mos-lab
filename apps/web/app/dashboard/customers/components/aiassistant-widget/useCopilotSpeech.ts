'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AiChatMessage } from '@mos-lab/shared';
import { speakText, stopSpeaking } from '../../../../../components/voice-assistant/speech-utils';
import {
  PLAYBACK_RATES,
  persistAutoSpeakPreference,
  persistPlaybackRatePreference,
  readAutoSpeakPreference,
  readPlaybackRatePreference,
  sanitizeMessageContent,
} from './copilot-utils';

/**
 * Manages Text-to-Speech playback, playback rate cycling, auto-speak preference, and clipboard copying.
 */
export function useCopilotSpeech(drawerOpen: boolean) {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState<boolean>(() => readAutoSpeakPreference());
  const [playbackRate, setPlaybackRate] = useState<number>(() => readPlaybackRatePreference());

  const handleToggleAutoSpeak = useCallback(() => {
    setAutoSpeakEnabled((prev) => {
      const next = !prev;
      persistAutoSpeakPreference(next);
      return next;
    });
  }, []);

  const handleCyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length] || 1.0;
    setPlaybackRate(nextRate);
    persistPlaybackRatePreference(nextRate);
  }, [playbackRate]);

  const handleToggleSpeak = useCallback(
    (msg: AiChatMessage) => {
      if (speakingMessageId === msg.id) {
        stopSpeaking();
        setSpeakingMessageId(null);
        return;
      }

      stopSpeaking();
      setSpeakingMessageId(msg.id);
      const cleanContent = sanitizeMessageContent(msg.content);
      speakText(cleanContent, {
        rate: playbackRate,
        onStart: () => setSpeakingMessageId(msg.id),
        onEnd: () => setSpeakingMessageId((current) => (current === msg.id ? null : current)),
        onError: () => setSpeakingMessageId((current) => (current === msg.id ? null : current)),
      });
    },
    [speakingMessageId, playbackRate]
  );

  const speakIfAutoEnabled = useCallback(
    (msg: AiChatMessage) => {
      if (autoSpeakEnabled && msg.content) {
        handleToggleSpeak(msg);
      }
    },
    [autoSpeakEnabled, handleToggleSpeak]
  );

  const handleCopyContent = useCallback((msg: AiChatMessage) => {
    const cleanContent = sanitizeMessageContent(msg.content);
    if (!cleanContent) return;
    navigator.clipboard.writeText(cleanContent).then(() => {
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId((cur) => (cur === msg.id ? null : cur)), 2000);
    });
  }, []);

  // Stop speech when drawer closes
  useEffect(() => {
    if (!drawerOpen) {
      stopSpeaking();
      setSpeakingMessageId(null);
    }
  }, [drawerOpen]);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return {
    speakingMessageId,
    copiedMessageId,
    autoSpeakEnabled,
    playbackRate,
    handleToggleAutoSpeak,
    handleCyclePlaybackRate,
    handleToggleSpeak,
    speakIfAutoEnabled,
    handleCopyContent,
  };
}
