import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { MosChatConversation, SafeAny } from '@mos-lab/shared';
import { scrollToMessageAndFlash } from '../../utils/quoteUtils';
import {
  DOCK_PRESET_CONFIGS,
  type DockTaskFilterScope,
  type MosChatDockDimension,
  type MosChatDockPreset,
} from './dockedWindowTypes';

interface UseDockedWindowControllerParams {
  dockedConvIds: string[];
  conversations: MosChatConversation[];
  dockMessagesContainerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  dockInputRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  dockInputs: Record<string, string>;
  setDockInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dockAttachments: Record<string, SafeAny[]>;
  setDockAttachments: React.Dispatch<React.SetStateAction<Record<string, SafeAny[]>>>;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  handleSendMessage: (convId: string, text: string, quote?: SafeAny, atts?: SafeAny[]) => void;
  externalDimensions?: Record<string, MosChatDockDimension>;
  externalSetDimensions?: React.Dispatch<React.SetStateAction<Record<string, MosChatDockDimension>>>;
  externalActiveTabs?: Record<string, 'chat' | 'tasks'>;
  externalSetActiveTabs?: React.Dispatch<React.SetStateAction<Record<string, 'chat' | 'tasks'>>>;
  externalThreadMsgIds?: Record<string, string | null>;
  externalSetThreadMsgIds?: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
}

function safeScrollToBottom(el: HTMLElement | null, smooth = true) {
  if (!el) return;
  if (typeof el.scrollTo === 'function') {
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  } else {
    el.scrollTop = el.scrollHeight;
  }
}

export function useDockedWindowController({
  dockedConvIds,
  conversations,
  dockMessagesContainerRefs,
  dockInputRefs,
  dockInputs,
  setDockInputs,
  dockAttachments,
  setDockAttachments,
  isComposingRef,
  lastCompositionEndMsRef,
  handleSendMessage,
  externalDimensions,
  externalSetDimensions,
  externalActiveTabs,
  externalSetActiveTabs,
  externalThreadMsgIds,
  externalSetThreadMsgIds,
}: UseDockedWindowControllerParams) {
  const [internalDimensions, setInternalDimensions] = useState<Record<string, MosChatDockDimension>>({});
  const [internalActiveTabs, setInternalActiveTabs] = useState<Record<string, 'chat' | 'tasks'>>({});
  const [internalThreadMsgIds, setInternalThreadMsgIds] = useState<Record<string, string | null>>({});

  const dimensions = externalDimensions || internalDimensions;
  const setDimensions = externalSetDimensions || setInternalDimensions;

  const activeTabs = externalActiveTabs || internalActiveTabs;
  const setActiveTabs = externalSetActiveTabs || setInternalActiveTabs;

  const activeThreadMsgIds = externalThreadMsgIds || internalThreadMsgIds;
  const setActiveThreadMsgIds = externalSetThreadMsgIds || setInternalThreadMsgIds;

  const [threadReplyInputs, setThreadReplyInputs] = useState<Record<string, string>>({});
  const [quickTaskInputs, setQuickTaskInputs] = useState<Record<string, string>>({});
  const [taskFilterScopes, setTaskFilterScopes] = useState<Record<string, DockTaskFilterScope>>({});

  const [showScrollBottomByConv, setShowScrollBottomByConv] = useState<Record<string, boolean>>({});
  const [showScrollBottomThreadByConv, setShowScrollBottomThreadByConv] = useState<Record<string, boolean>>({});
  const threadFeedRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevMsgCountRef = useRef<Record<string, number>>({});

  const handleFeedScroll = (cid: string, e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isFarFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight > 100;
    setShowScrollBottomByConv((prev) => {
      if (prev[cid] === isFarFromBottom) return prev;
      return { ...prev, [cid]: isFarFromBottom };
    });
  };

  const handleThreadFeedScroll = (cid: string, e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isFarFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight > 80;
    setShowScrollBottomThreadByConv((prev) => {
      if (prev[cid] === isFarFromBottom) return prev;
      return { ...prev, [cid]: isFarFromBottom };
    });
  };

  const scrollToBottom = useCallback(
    (cid: string, smooth = true) => {
      const el = dockMessagesContainerRefs.current[cid];
      if (el) {
        safeScrollToBottom(el, smooth);
        setShowScrollBottomByConv((prev) => ({ ...prev, [cid]: false }));
      }
    },
    [dockMessagesContainerRefs]
  );

  const scrollToBottomThread = useCallback((cid: string, smooth = true) => {
    const el = threadFeedRefs.current[cid];
    if (el) {
      safeScrollToBottom(el, smooth);
      setShowScrollBottomThreadByConv((prev) => ({ ...prev, [cid]: false }));
    }
  }, []);

  // Auto scroll to bottom on mount or when messages arrive
  useEffect(() => {
    dockedConvIds.forEach((cid) => {
      const conv = conversations.find((c) => c.id === cid);
      if (!conv) return;
      const count = conv.messages.length;
      const prevCount = prevMsgCountRef.current[cid] ?? 0;
      const el = dockMessagesContainerRefs.current[cid];

      if (el) {
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
        if (prevCount === 0 || isNearBottom) {
          safeScrollToBottom(el, prevCount !== 0);
          setShowScrollBottomByConv((prev) => ({ ...prev, [cid]: false }));
        } else if (count > prevCount) {
          setShowScrollBottomByConv((prev) => ({ ...prev, [cid]: true }));
        }
      }
      prevMsgCountRef.current[cid] = count;
    });
  }, [dockedConvIds, conversations, dockMessagesContainerRefs]);

  // Resizing state
  const resizingRef = useRef<{
    convId: string;
    direction: 'both' | 'top' | 'left';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { convId, direction, startX, startY, startWidth, startHeight } = resizingRef.current;
      const deltaX = startX - e.clientX;
      const deltaY = startY - e.clientY;
      const maxHeight = typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.88) : 800;

      let nextWidth = startWidth;
      let nextHeight = startHeight;

      if (direction === 'both' || direction === 'left') {
        nextWidth = Math.max(320, Math.min(640, startWidth + deltaX));
      }
      if (direction === 'both' || direction === 'top') {
        nextHeight = Math.max(380, Math.min(maxHeight, startHeight + deltaY));
      }

      setDimensions((prev) => ({
        ...prev,
        [convId]: { width: nextWidth, height: nextHeight, preset: 'custom' },
      }));
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setDimensions]);

  const startResizing = (e: React.MouseEvent, convId: string, direction: 'both' | 'top' | 'left') => {
    e.preventDefault();
    e.stopPropagation();
    const currDim = dimensions[convId] || DOCK_PRESET_CONFIGS.standard;
    resizingRef.current = {
      convId,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currDim.width,
      startHeight: currDim.height,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'both' ? 'nwse-resize' : direction === 'top' ? 'ns-resize' : 'ew-resize';
  };

  const handleCyclePreset = (cid: string) => {
    const curr = dimensions[cid]?.preset || 'standard';
    let nextPreset: MosChatDockPreset = 'standard';
    if (curr === 'compact') nextPreset = 'standard';
    else if (curr === 'standard') nextPreset = 'promax';
    else nextPreset = 'compact';

    const cfg = DOCK_PRESET_CONFIGS[nextPreset as 'compact' | 'standard' | 'promax'];
    setDimensions((prev) => ({
      ...prev,
      [cid]: { width: cfg.width, height: cfg.height, preset: nextPreset },
    }));
  };

  const attachMessagesContainer = (cid: string, el: HTMLDivElement | null) => {
    dockMessagesContainerRefs.current[cid] = el;
  };

  const attachThreadFeed = (cid: string, el: HTMLDivElement | null) => {
    threadFeedRefs.current[cid] = el;
  };

  const attachDockInput = (cid: string, el: HTMLTextAreaElement | null) => {
    dockInputRefs.current[cid] = el;
  };

  const scrollToDockMessage = (cid: string, messageId: string) => {
    scrollToMessageAndFlash(messageId, dockMessagesContainerRefs.current[cid]);
  };

  const scrollToThreadMessage = (cid: string, messageId: string) => {
    scrollToMessageAndFlash(messageId, threadFeedRefs.current[cid]);
  };

  const markCompositionStart = () => {
    isComposingRef.current = true;
  };

  const markCompositionEnd = () => {
    lastCompositionEndMsRef.current = Date.now();
    setTimeout(() => {
      isComposingRef.current = false;
    }, 50);
  };

  const isInputComposing = (nativeIsComposing: boolean, keyCode: number) =>
    nativeIsComposing || isComposingRef.current || keyCode === 229 || Date.now() - lastCompositionEndMsRef.current < 60;

  const submitDockMessage = (cid: string) => {
    const val = dockInputs[cid] || '';
    const atts = dockAttachments[cid] || [];
    if (!val.trim() && atts.length === 0) return;
    setDockInputs((p) => ({ ...p, [cid]: '' }));
    setDockAttachments((p) => ({ ...p, [cid]: [] }));
    if (dockInputRefs.current[cid]) {
      dockInputRefs.current[cid]!.style.height = 'auto';
    }
    handleSendMessage(cid, val, null, atts);
  };

  return {
    dimensions,
    activeTabs,
    setActiveTabs,
    activeThreadMsgIds,
    setActiveThreadMsgIds,
    threadReplyInputs,
    setThreadReplyInputs,
    quickTaskInputs,
    setQuickTaskInputs,
    taskFilterScopes,
    setTaskFilterScopes,
    showScrollBottomByConv,
    showScrollBottomThreadByConv,
    handleFeedScroll,
    handleThreadFeedScroll,
    scrollToBottom,
    scrollToBottomThread,
    startResizing,
    handleCyclePreset,
    attachMessagesContainer,
    attachThreadFeed,
    attachDockInput,
    scrollToDockMessage,
    scrollToThreadMessage,
    markCompositionStart,
    markCompositionEnd,
    isInputComposing,
    submitDockMessage,
  };
}
