'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { tabNotificationManager } from '../../lib/tab-notification';
import { readMosChatSessionId } from '../mos-chat/utils/mos-chat-permalink';

export interface MosChatNavOptions {
  conversationId?: string;
  messageId?: string;
  openTab?: 'chat' | 'tasks' | 'pinned';
  taskId?: string;
  aiSessionId?: string;
}

export function openMosChatWindow(options?: {
  conversationId?: string;
  messageId?: string;
  openTab?: string;
  taskId?: string;
  aiSessionId?: string;
}) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (options?.conversationId) params.set('convId', options.conversationId);
  if (options?.messageId) params.set('msgId', options.messageId);
  if (options?.openTab) params.set('tab', options.openTab);
  if (options?.taskId) params.set('taskId', options.taskId);
  if (options?.aiSessionId) params.set('sessionId', options.aiSessionId);
  const qs = params.toString();
  const url = qs ? `/chat?${qs}` : '/chat';
  window.open(url, 'mOS_Chat_Window');
}

export function ChatDeepLinkWatcher({
  onOpenChat,
}: {
  onOpenChat?: (options: { conversationId?: string; messageId?: string; aiSessionId?: string }) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const chatConvId =
      searchParams.get('chatConvId') || searchParams.get('conversationId') || searchParams.get('convId') || undefined;
    const chatMsgId =
      searchParams.get('chatMsgId') || searchParams.get('messageId') || searchParams.get('msgId') || undefined;
    const chatSessionId = readMosChatSessionId((key) => searchParams.get(key));

    if (chatConvId) {
      if (onOpenChat) {
        onOpenChat({ conversationId: chatConvId, messageId: chatMsgId, aiSessionId: chatSessionId });
      } else {
        openMosChatWindow({ conversationId: chatConvId, messageId: chatMsgId, aiSessionId: chatSessionId });
      }
    }
  }, [searchParams, onOpenChat]);

  return null;
}

export function useDashboardChatShell(userRole?: string) {
  const [mosChatUnreadCount, setMosChatUnreadCount] = useState(0);
  const [mosChatTaskCount, setMosChatTaskCount] = useState(0);
  const [canAccessMosChat, setCanAccessMosChat] = useState(true);
  const effectiveCanAccessMosChat = isAdminOrSuperAdminRole(userRole) || canAccessMosChat;

  const [chatDisplayMode, setChatDisplayMode] = useState<'embedded' | 'tab'>(() => {
    if (typeof window === 'undefined') return 'embedded';
    try {
      return (window.localStorage.getItem('mos_chat_display_mode_v1') as 'embedded' | 'tab') || 'embedded';
    } catch {
      return 'embedded';
    }
  });

  const [hasEverOpenedEmbeddedChat, setHasEverOpenedEmbeddedChat] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('mos_chat_is_open_v1') === 'true';
    } catch {
      return false;
    }
  });

  const [isMosChatOpen, setIsMosChatOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('mos_chat_is_open_v1') === 'true';
    } catch {
      return false;
    }
  });

  const [targetChatNavigation, setTargetChatNavigation] = useState<(MosChatNavOptions & { timestamp?: number }) | null>(
    null
  );

  const setAndPersistChatDisplayMode = useCallback((mode: 'embedded' | 'tab') => {
    setChatDisplayMode(mode);
    try {
      window.localStorage.setItem('mos_chat_display_mode_v1', mode);
    } catch {}
  }, []);

  const openChatWithMode = useCallback(
    (modeOverride?: 'embedded' | 'tab', navOptions?: MosChatNavOptions) => {
      const mode = modeOverride || chatDisplayMode;
      if (mode === 'tab') {
        openMosChatWindow(navOptions);
        return;
      }
      setHasEverOpenedEmbeddedChat(true);
      setIsMosChatOpen(true);
      if (
        navOptions?.conversationId ||
        navOptions?.messageId ||
        navOptions?.openTab ||
        navOptions?.taskId ||
        navOptions?.aiSessionId
      ) {
        setTargetChatNavigation({
          conversationId: navOptions.conversationId,
          messageId: navOptions.messageId,
          openTab: navOptions.openTab,
          taskId: navOptions.taskId,
          aiSessionId: navOptions.aiSessionId,
          timestamp: Date.now(),
        });
      }
    },
    [chatDisplayMode]
  );

  const toggleEmbeddedChat = useCallback(() => {
    setHasEverOpenedEmbeddedChat(true);
    setIsMosChatOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('mos_chat_is_open_v1', String(isMosChatOpen));
    } catch {}
  }, [isMosChatOpen]);

  useEffect(() => {
    tabNotificationManager.setUnreadCount('chat-header', mosChatUnreadCount);
  }, [mosChatUnreadCount]);

  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent<MosChatNavOptions & { forceMode?: 'embedded' | 'tab' }>;
      openChatWithMode(customEvent.detail?.forceMode, customEvent.detail);
    };
    const handleCloseChat = () => {
      setIsMosChatOpen(false);
    };
    window.addEventListener('mos-chat:open', handleOpenChat);
    window.addEventListener('mos-chat:close', handleCloseChat);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (chatDisplayMode === 'tab') {
          openMosChatWindow();
        } else {
          toggleEmbeddedChat();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mos-chat:open', handleOpenChat);
      window.removeEventListener('mos-chat:close', handleCloseChat);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [chatDisplayMode, openChatWithMode, toggleEmbeddedChat]);

  // Ultra-lightweight unread summary polling + BroadcastChannel 0ms sync
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let channel: BroadcastChannel | null = null;

    const fetchUnread = async () => {
      try {
        const res = await apiClient.chat.getUnreadSummary({ isPolling: true });
        if (res) {
          setMosChatUnreadCount(res.unreadCount || 0);
          setMosChatTaskCount(res.urgentTaskCount || 0);
          setCanAccessMosChat(true);
        }
      } catch {
        // ignore network error
      }
    };

    fetchUnread();

    const scheduleNext = () => {
      const delay = typeof document !== 'undefined' && document.hidden ? 60_000 : 35_000;
      timer = setTimeout(() => {
        fetchUnread();
        scheduleNext();
      }, delay);
    };
    scheduleNext();

    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('mos_chat_sync');
      channel.onmessage = (e) => {
        if (e.data?.type === 'UNREAD_UPDATE') {
          if (typeof e.data.unreadCount === 'number') {
            setMosChatUnreadCount(e.data.unreadCount);
          }
          if (typeof e.data.activeTaskCount === 'number') {
            setMosChatTaskCount(e.data.activeTaskCount);
          }
        }
      };
    }

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchUnread();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timer);
      channel?.close();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return {
    mosChatUnreadCount,
    mosChatTaskCount,
    effectiveCanAccessMosChat,
    chatDisplayMode,
    hasEverOpenedEmbeddedChat,
    isMosChatOpen,
    targetChatNavigation,
    setIsMosChatOpen,
    setCanAccessMosChat,
    setMosChatUnreadCount,
    setMosChatTaskCount,
    setAndPersistChatDisplayMode,
    openChatWithMode,
    toggleEmbeddedChat,
  };
}
