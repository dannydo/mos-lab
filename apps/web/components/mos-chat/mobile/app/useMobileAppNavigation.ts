import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatSearchResultItem,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import type { MosChatActiveSubtab } from '../../types/mos-chat-types';
import { useMosChatVoiceCall } from '../../utils/useMosChatVoiceCall';
import { useMosChatWebPush } from '../../utils/useMosChatWebPush';
import type { MosChatGalleryImage } from '../MosChatMobileMediaGallery';
import type { FilterScope } from '../MosChatMobileSearchSheet';

export interface MobileInitialNavTarget {
  conversationId?: string;
  messageId?: string;
  threadRootMessageId?: string;
  openTab?: MosChatActiveSubtab;
  taskId?: string;
  aiSessionId?: string;
  timestamp?: number;
}

interface UseMobileAppNavigationParams {
  standalone: boolean;
  onStartVoiceCall?: (conversationId: string) => void;
  initialNavTarget?: MobileInitialNavTarget | null;
  currentUser: SafeAny;
  activeConversation: MosChatConversation | null | undefined;
  conversations: MosChatConversation[];
  messages: MosChatMessage[];
  mobileView: 'inbox' | 'room' | 'thread';
  setMobileView: (view: 'inbox' | 'room' | 'thread') => void;
  setActiveThreadMsg: (msg: MosChatMessage | null) => void;
  setActiveConvId: (cid: string) => void;
  openAiSessionById?: (sessionId: string) => Promise<boolean>;
}

export function useMobileAppNavigation({
  standalone,
  onStartVoiceCall,
  initialNavTarget,
  currentUser,
  activeConversation,
  conversations,
  messages,
  mobileView,
  setMobileView,
  setActiveThreadMsg,
  setActiveConvId,
  openAiSessionById,
}: UseMobileAppNavigationParams) {
  const [streamGallery, setStreamGallery] = useState<{
    open: boolean;
    images: MosChatGalleryImage[];
    initialIndex: number;
  }>({
    open: false,
    images: [],
    initialIndex: 0,
  });

  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchInitialScope, setSearchInitialScope] = useState<FilterScope>('ALL');

  const pendingPushTargetRef = useRef<{
    convId: string;
    msgId?: string;
    threadRootMsgId?: string;
  } | null>(null);

  const navigateToPushTarget = useCallback(
    (convId: string, msgId?: string, threadRootMsgId?: string) => {
      setActiveConvId(convId);
      const targetConv = conversations.find((c) => c.id === convId);
      const candidateMsgs = targetConv?.messages?.length ? targetConv.messages : messages;
      const parentMsg = threadRootMsgId
        ? candidateMsgs.find((m) => m.id === threadRootMsgId)
        : msgId
          ? candidateMsgs.find((m) => (m.thread || []).some((r) => r.id === msgId))
          : undefined;

      if (parentMsg) {
        setActiveThreadMsg(parentMsg);
        setMobileView('thread');
        pendingPushTargetRef.current = null;
      } else {
        setMobileView('room');
        if (threadRootMsgId || msgId) {
          pendingPushTargetRef.current = { convId, msgId, threadRootMsgId };
        }
      }

      if (msgId && typeof document !== 'undefined') {
        setTimeout(() => {
          const el =
            document.getElementById(`thread-reply-${msgId}`) ||
            document.getElementById(`mos-chat-reply-${msgId}`) ||
            document.getElementById(`mos-chat-msg-${msgId}`) ||
            document.getElementById(`mobile-msg-${msgId}`) ||
            document.getElementById(`msg-${msgId}`);
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 350);
      }
    },
    [conversations, messages, setActiveConvId, setActiveThreadMsg, setMobileView]
  );

  const handledInitialNavKeyRef = useRef<string | null>(null);
  const handledAiSessionNavKeyRef = useRef<string | null>(null);

  // Permalink: /chat?convId=dm-wings-ai-copilot&sessionId=<id>
  useEffect(() => {
    const sessionId = initialNavTarget?.aiSessionId;
    if (!sessionId || !openAiSessionById || !currentUser?.id) return;
    const navKey = `${sessionId}::${initialNavTarget?.timestamp || ''}`;
    if (handledAiSessionNavKeyRef.current === navKey) return;
    handledAiSessionNavKeyRef.current = navKey;
    void openAiSessionById(sessionId).then((ok) => {
      if (ok) setMobileView('room');
    });
  }, [initialNavTarget, openAiSessionById, currentUser, setMobileView]);

  useEffect(() => {
    if (!initialNavTarget?.conversationId) return;
    const navKey = `${initialNavTarget.conversationId}::${initialNavTarget.messageId || ''}::${initialNavTarget.threadRootMessageId || ''}::${initialNavTarget.timestamp || ''}`;
    if (handledInitialNavKeyRef.current === navKey) return;
    handledInitialNavKeyRef.current = navKey;
    navigateToPushTarget(
      initialNavTarget.conversationId,
      initialNavTarget.messageId,
      initialNavTarget.threadRootMessageId
    );
  }, [initialNavTarget, navigateToPushTarget]);

  useEffect(() => {
    const pending = pendingPushTargetRef.current;
    if (!pending || activeConversation?.id !== pending.convId) return;
    if (!messages || messages.length === 0) return;

    const parentMsg = pending.threadRootMsgId
      ? messages.find((m) => m.id === pending.threadRootMsgId)
      : pending.msgId
        ? messages.find((m) => (m.thread || []).some((r) => r.id === pending.msgId))
        : undefined;

    if (parentMsg) {
      setActiveThreadMsg(parentMsg);
      setMobileView('thread');
    }

    if (pending.msgId && typeof document !== 'undefined') {
      setTimeout(() => {
        const el =
          document.getElementById(`thread-reply-${pending.msgId}`) ||
          document.getElementById(`mos-chat-reply-${pending.msgId}`) ||
          document.getElementById(`mos-chat-msg-${pending.msgId}`) ||
          document.getElementById(`mobile-msg-${pending.msgId}`) ||
          document.getElementById(`msg-${pending.msgId}`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    }
    pendingPushTargetRef.current = null;
  }, [activeConversation, messages, setActiveThreadMsg, setMobileView]);

  const webPush = useMosChatWebPush({
    enabled: Boolean(currentUser?.id),
    onSelectConversationFromPush: (convId, msgId, threadRootMsgId) => {
      navigateToPushTarget(convId, msgId, threadRootMsgId);
    },
  });

  const standaloneVoiceCall = useMosChatVoiceCall({
    currentStaffId: currentUser?.id ?? null,
    enabled: Boolean(standalone && currentUser?.id),
  });

  const handleCallCurrentRoom = () => {
    if (!activeConversation?.id || activeConversation.id === AI_COPILOT_CONV_ID) return;
    if (onStartVoiceCall) {
      onStartVoiceCall(activeConversation.id);
    } else {
      void standaloneVoiceCall.startOrJoinVoiceCall(activeConversation.id);
    }
  };

  const handleSelectSearchResult = (item: MosChatSearchResultItem) => {
    setSearchSheetOpen(false);
    setActiveConvId(item.conversationId);
    setMobileView('room');

    if (item.isThreadReply && item.parentMessageId) {
      const targetConv = conversations.find((c) => c.id === item.conversationId);
      const parent = targetConv?.messages?.find((m) => m.id === item.parentMessageId);
      if (parent) {
        setActiveThreadMsg(parent);
        setMobileView('thread');
      } else {
        setActiveThreadMsg({
          id: item.parentMessageId,
          conversationId: item.conversationId,
          senderId: 'system',
          senderName: 'Luồng thảo luận',
          senderRole: 'Hệ thống',
          text: 'Đang mở luồng thảo luận...',
          createdAt: item.createdAt,
          timeLabel: item.timeLabel || '',
          thread: [
            {
              id: item.id,
              senderId: item.senderId,
              senderName: item.senderName,
              senderRole: item.senderRole || 'Nhân sự',
              senderAvatar: item.senderAvatar || undefined,
              text: item.text,
              createdAt: item.createdAt,
              timeLabel: item.timeLabel || '',
            },
          ],
        });
        setMobileView('thread');
      }
    }

    setTimeout(() => {
      const el =
        document.getElementById(`thread-reply-${item.id}`) ||
        document.getElementById(`mos-chat-reply-${item.id}`) ||
        document.getElementById(`mos-chat-msg-${item.id}`) ||
        document.getElementById(`mobile-msg-${item.id}`) ||
        document.getElementById(`msg-${item.id}`);

      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-amber-500/25', 'transition-all', 'duration-500');
        setTimeout(() => {
          el.classList.remove('bg-amber-500/25');
        }, 2500);
      }
    }, 350);
  };

  const handleOpenStreamGallery = (msg: MosChatMessage, attIdx: number) => {
    const list: MosChatGalleryImage[] = [];
    (msg.attachments || []).forEach((att, idx) => {
      list.push({
        id: att.id || `msg-${msg.id}-att-${idx}`,
        url: att.url,
        name: att.name,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        createdAt: msg.createdAt,
      });
    });
    (msg.thread || []).forEach((reply: MosChatThreadReply) => {
      (reply.attachments || []).forEach((att, idx) => {
        list.push({
          id: att.id || `reply-${reply.id}-att-${idx}`,
          url: att.url,
          name: att.name,
          senderName: reply.senderName,
          senderRole: reply.senderRole,
          createdAt: reply.createdAt,
        });
      });
    });
    setStreamGallery({
      open: true,
      images: list,
      initialIndex: attIdx,
    });
  };

  // Edge Swipe-to-Back gesture (iOS Safari style)
  const edgeTouchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    edgeTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - edgeTouchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - edgeTouchStartRef.current.y;

    if (edgeTouchStartRef.current.x < 30 && deltaX > 70 && Math.abs(deltaY) < 50) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
      if (mobileView === 'thread') {
        setMobileView('room');
      } else if (mobileView === 'room') {
        setMobileView('inbox');
      }
    }
  };

  return {
    streamGallery,
    setStreamGallery,
    searchSheetOpen,
    setSearchSheetOpen,
    searchInitialQuery,
    setSearchInitialQuery,
    searchInitialScope,
    setSearchInitialScope,
    webPush,
    standaloneVoiceCall,
    handleCallCurrentRoom,
    handleSelectSearchResult,
    handleOpenStreamGallery,
    handleTouchStart,
    handleTouchEnd,
  };
}
