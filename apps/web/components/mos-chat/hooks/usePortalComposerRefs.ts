'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MosChatMessage } from '@mos-lab/shared';

export interface UsePortalComposerRefsParams {
  activeConvId: string;
  dockMessagesContainerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

/**
 * Ref-backed composer/thread text inputs, IME composition guards, and scroll helpers
 * that prevent keystroke re-render cascades across the portal tree.
 */
export function usePortalComposerRefs({ activeConvId, dockMessagesContainerRefs }: UsePortalComposerRefsParams) {
  const [threadOpen, setThreadOpen] = useState(false);
  const [activeThreadMsgId, setActiveThreadMsgId] = useState<string | null>(null);
  const threadTextRef = useRef('');
  const [threadHasText] = useState(false);
  const threadHasTextListenerRef = useRef<((hasText: boolean) => void) | null>(null);

  const composerTextRef = useRef('');
  const [composerHasText] = useState(false);
  const composerHasTextListenerRef = useRef<((hasText: boolean) => void) | null>(null);

  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const threadInputRef = useRef<HTMLTextAreaElement | null>(null);
  const isComposingRef = useRef<boolean>(false);
  const lastCompositionEndMsRef = useRef<number>(0);
  const lastSentRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  const composerCursorPosRef = useRef(0);
  const setComposerCursorPos = useCallback((v: React.SetStateAction<number>) => {
    composerCursorPosRef.current = typeof v === 'function' ? v(composerCursorPosRef.current) : v;
  }, []);
  const threadCursorPosRef = useRef(0);
  const setThreadCursorPos = useCallback((v: React.SetStateAction<number>) => {
    threadCursorPosRef.current = typeof v === 'function' ? v(threadCursorPosRef.current) : v;
  }, []);

  const [replyingToMessage, setReplyingToMessage] = useState<MosChatMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mainMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const threadMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const threadMessagesEndRef = useRef<HTMLDivElement | null>(null);

  const updateComposerText = useCallback((val: string) => {
    composerTextRef.current = val;
    if (composerInputRef.current && composerInputRef.current.value !== val) {
      composerInputRef.current.value = val;
    }
    const hasText = val.trim().length > 0;
    composerHasTextListenerRef.current?.(hasText);
  }, []);

  const updateThreadInput = useCallback((val: string) => {
    threadTextRef.current = val;
    if (threadInputRef.current && threadInputRef.current.value !== val) {
      threadInputRef.current.value = val;
    }
    const hasText = val.trim().length > 0;
    threadHasTextListenerRef.current?.(hasText);
  }, []);

  const setThreadInput = useCallback(
    (valOrFn: string | ((prev: string) => string)) => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(threadTextRef.current) : valOrFn;
      updateThreadInput(nextVal);
    },
    [updateThreadInput]
  );

  const setComposerText = useCallback(
    (valOrFn: string | ((prev: string) => string)) => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(composerTextRef.current) : valOrFn;
      updateComposerText(nextVal);
    },
    [updateComposerText]
  );

  useEffect(() => {
    setReplyingToMessage(null);
  }, [activeConvId]);

  const handleReplyToMessage = useCallback((msg: MosChatMessage) => {
    setReplyingToMessage(msg);
    setTimeout(() => {
      composerInputRef.current?.focus();
      composerInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }, []);

  const scrollToChatBottom = useCallback(
    (target: 'main' | 'thread' | { dockConvId: string } = 'main', behavior: ScrollBehavior = 'smooth') => {
      const executeScroll = (mode: ScrollBehavior) => {
        if (target === 'main') {
          const el = mainMessagesContainerRef.current;
          if (el) {
            if (typeof el.scrollTo === 'function') {
              try {
                el.scrollTo({ top: el.scrollHeight, behavior: mode });
              } catch {
                // ignore
              }
            }
            try {
              el.scrollTop = el.scrollHeight;
            } catch {
              // ignore
            }
          }
          if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            try {
              messagesEndRef.current.scrollIntoView({ behavior: mode, block: 'end' });
            } catch {
              // ignore
            }
          }
        } else if (target === 'thread') {
          const el = threadMessagesContainerRef.current;
          if (el) {
            if (typeof el.scrollTo === 'function') {
              try {
                el.scrollTo({ top: el.scrollHeight, behavior: mode });
              } catch {
                // ignore
              }
            }
            try {
              el.scrollTop = el.scrollHeight;
            } catch {
              // ignore
            }
          }
          if (typeof threadMessagesEndRef.current?.scrollIntoView === 'function') {
            try {
              threadMessagesEndRef.current.scrollIntoView({ behavior: mode, block: 'end' });
            } catch {
              // ignore
            }
          }
        } else if (typeof target === 'object' && target.dockConvId) {
          const el = dockMessagesContainerRefs.current[target.dockConvId];
          if (el) {
            if (typeof el.scrollTo === 'function') {
              try {
                el.scrollTo({ top: el.scrollHeight, behavior: mode });
              } catch {
                // ignore
              }
            }
            try {
              el.scrollTop = el.scrollHeight;
            } catch {
              // ignore
            }
          }
        }
      };

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => executeScroll(behavior));
        window.setTimeout(() => executeScroll(behavior), 90);
        window.setTimeout(() => executeScroll(behavior), 220);
        window.setTimeout(() => executeScroll(behavior), 450);
      }
    },
    [dockMessagesContainerRefs]
  );

  return {
    threadOpen,
    setThreadOpen,
    activeThreadMsgId,
    setActiveThreadMsgId,
    threadTextRef,
    threadHasText,
    threadHasTextListenerRef,
    composerTextRef,
    composerHasText,
    composerHasTextListenerRef,
    composerInputRef,
    threadInputRef,
    isComposingRef,
    lastCompositionEndMsRef,
    lastSentRef,
    composerCursorPosRef,
    setComposerCursorPos,
    threadCursorPosRef,
    setThreadCursorPos,
    replyingToMessage,
    setReplyingToMessage,
    messagesEndRef,
    mainMessagesContainerRef,
    threadMessagesContainerRef,
    threadMessagesEndRef,
    updateComposerText,
    updateThreadInput,
    setThreadInput,
    setComposerText,
    handleReplyToMessage,
    scrollToChatBottom,
  };
}
