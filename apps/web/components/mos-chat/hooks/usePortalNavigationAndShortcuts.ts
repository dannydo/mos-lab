'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  ForwardMosChatMessageRequest,
  ForwardMosChatMessageResponse,
  MosChatConversation,
  MosChatMessage,
  MosChatSearchResultItem,
  MosChatStaffMember,
  MosChatThreadReply,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import { MOS_CHAT_SESSION_QUERY_KEYS } from '../utils/mos-chat-permalink';
import type { PersonalLayoutSnapshot } from './usePortalLayoutAndResize';

export interface LightboxImageState {
  items: Array<{ id: string; url: string; name: string }>;
  currentIndex: number;
  zoom: number;
  rotate: number;
}

export interface UsePortalNavigationAndShortcutsParams {
  isMobile: boolean;
  isTabVisible: boolean;
  setActiveConvId: (id: string) => void;
  setActiveSubtab: (tab: MosChatActiveSubtab) => void;
  setMobileActiveView: (view: 'inbox' | 'conversation' | 'thread') => void;
  setSidebarFilter: (filter: 'all' | 'unread' | 'spaces') => void;
  setSearchQuery: (q: string) => void;
  setThreadOpen: (open: boolean) => void;
  setActiveThreadMsgId: (id: string | null) => void;
  maximizedRef: React.MutableRefObject<boolean>;
  panelWidthRef: React.MutableRefObject<number>;
  sidebarWidthRef: React.MutableRefObject<number>;
  threadWidthRef: React.MutableRefObject<number>;
  setPanelWidth: (w: number) => void;
  persistPersonalLayout: (patch?: Partial<PersonalLayoutSnapshot>) => void;
  threadInputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  currentUser?: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  conversations: MosChatConversation[];
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  aiCopilotConversation: MosChatConversation | null;
  activeConversation?: MosChatConversation;
  userPrefs: MosChatUserSidebarPrefs;
  setUserPrefs: React.Dispatch<React.SetStateAction<MosChatUserSidebarPrefs>>;
  updateUserPrefsLocalOnly: (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => void;
  updateUserSidebarPrefs: (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => void;
  markConversationReadOptimisticAndSync: (convId: string, msgCount: number, lastMsgId?: string) => void;
  fetchBootstrap: (forceFull?: boolean) => Promise<void>;
  notifyLivePeers: () => void;
  scrollToChatBottom: (target?: 'main' | 'thread' | { dockConvId: string }, behavior?: ScrollBehavior) => void;
  navigateToMessageRef: React.MutableRefObject<(convId: string, msgId?: string) => void>;
  pendingNavRef: React.MutableRefObject<{ convId: string; msgId?: string } | null>;
  retriedMissingMsgRef: React.MutableRefObject<Set<string>>;
  lastVersionRef: React.MutableRefObject<number>;
  standalone: boolean;
  targetNavigation?: {
    conversationId?: string;
    messageId?: string;
    timestamp?: number;
    openTab?: MosChatActiveSubtab;
  } | null;
  antdMessage: MessageInstance;
}

export function usePortalNavigationAndShortcuts({
  standalone,
  isMobile,
  isTabVisible,
  setActiveConvId,
  setActiveSubtab,
  setMobileActiveView,
  setSidebarFilter,
  setSearchQuery,
  setThreadOpen,
  setActiveThreadMsgId,
  maximizedRef,
  panelWidthRef,
  sidebarWidthRef,
  threadWidthRef,
  setPanelWidth,
  persistPersonalLayout,
  threadInputRef,
  currentUser,
  currentUserStaffMember,
  conversations,
  setConversations,
  aiCopilotConversation,
  activeConversation,
  userPrefs,
  setUserPrefs,
  updateUserPrefsLocalOnly,
  updateUserSidebarPrefs,
  markConversationReadOptimisticAndSync,
  fetchBootstrap,
  notifyLivePeers,
  scrollToChatBottom,
  navigateToMessageRef,
  pendingNavRef,
  retriedMissingMsgRef,
  lastVersionRef,
  targetNavigation,
  antdMessage,
}: UsePortalNavigationAndShortcutsParams) {
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [forwardModalTarget, setForwardModalTarget] = useState<{
    sourceConversationId: string;
    message: MosChatMessage;
    reply?: MosChatThreadReply | null;
  } | null>(null);
  const lastProcessedNavRef = useRef<string | null>(null);

  const accessibleConversationIds = useMemo(() => new Set((conversations || []).map((c) => c.id)), [conversations]);

  const markThreadReadOptimisticAndSync = useCallback(
    (convId: string, msgId: string) => {
      if (!convId || !msgId || convId === AI_COPILOT_CONV_ID) return;
      const nowIso = new Date().toISOString();
      const myStaffId = Number(currentUserStaffMember.id || currentUser?.id || 0);
      const myName =
        currentUserStaffMember.displayName || currentUser?.displayName || currentUser?.username || 'Danny Do';
      const myRole = currentUserStaffMember.role || currentUser?.role || 'Staff';
      const myAvatar = currentUserStaffMember.avatarUrl || undefined;

      let resolvedReplyCount = 0;
      let resolvedLastReplyId: string | undefined;

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          let unreadThreadTotal = 0;
          const nextMessages = c.messages.map((m) => {
            if (m.id !== msgId) {
              unreadThreadTotal += m.unreadThreadReplyCount || 0;
              return m;
            }
            const visibleReplies = (m.thread || []).filter((r) => !r.deletedAt);
            resolvedReplyCount = visibleReplies.length;
            resolvedLastReplyId = visibleReplies.length > 0 ? visibleReplies[visibleReplies.length - 1]?.id : undefined;
            const existingReceipts = m.threadReadReceipts || [];
            const updatedReceipts =
              myStaffId > 0
                ? [
                    ...existingReceipts.filter((r) => r.staffId !== myStaffId),
                    {
                      staffId: myStaffId,
                      displayName: myName,
                      role: myRole,
                      avatarUrl: myAvatar,
                      readReplyCount: resolvedReplyCount,
                      lastReadReplyId: resolvedLastReplyId || null,
                      readAt: nowIso,
                    },
                  ]
                : existingReceipts;
            return {
              ...m,
              unreadThreadReplyCount: 0,
              threadReadReceipts: updatedReceipts,
            };
          });
          return {
            ...c,
            unreadThreadCount: unreadThreadTotal,
            messages: nextMessages,
          };
        })
      );

      updateUserPrefsLocalOnly((prev) => ({
        ...prev,
        readThreadReplyCountByMsg: {
          ...(prev.readThreadReplyCountByMsg || {}),
          [msgId]: resolvedReplyCount,
          [`${convId}::${msgId}`]: resolvedReplyCount,
        },
        readThreadAtByMsg: {
          ...(prev.readThreadAtByMsg || {}),
          [msgId]: nowIso,
          [`${convId}::${msgId}`]: nowIso,
        },
        ...(resolvedLastReplyId
          ? {
              lastReadThreadReplyIdByMsg: {
                ...(prev.lastReadThreadReplyIdByMsg || {}),
                [msgId]: resolvedLastReplyId,
                [`${convId}::${msgId}`]: resolvedLastReplyId,
              },
            }
          : {}),
      }));

      apiClient.chat
        ?.markThreadAsRead?.(convId, msgId)
        ?.then((res) => {
          if (res?.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === convId ? res.conversation! : c)));
          }
          notifyLivePeers();
        })
        ?.catch?.(() => {});
    },
    [
      currentUserStaffMember.id,
      currentUserStaffMember.displayName,
      currentUserStaffMember.role,
      currentUserStaffMember.avatarUrl,
      currentUser?.id,
      currentUser?.displayName,
      currentUser?.username,
      currentUser?.role,
      setConversations,
      updateUserPrefsLocalOnly,
      notifyLivePeers,
    ]
  );

  const handleOpenThread = useCallback(
    (msgId: string, convIdOverride?: string, options?: { autoFocus?: boolean }) => {
      setActiveThreadMsgId(msgId);
      setThreadOpen(true);
      if (isMobile) {
        setMobileActiveView('thread');
      } else if (!maximizedRef.current && typeof window !== 'undefined') {
        const minComfort = sidebarWidthRef.current + threadWidthRef.current + 380;
        if (panelWidthRef.current < minComfort) {
          const maxAllowed = Math.max(520, window.innerWidth - 56);
          const nextW = Math.min(maxAllowed, minComfort);
          panelWidthRef.current = nextW;
          setPanelWidth(nextW);
          persistPersonalLayout({ panelWidth: nextW });
        }
      }
      const targetConvId = convIdOverride || activeConversation?.id;
      if (targetConvId && isTabVisible) {
        markThreadReadOptimisticAndSync(targetConvId, msgId);
      }
      scrollToChatBottom('thread', 'auto');
      if (options?.autoFocus !== false) {
        setTimeout(() => {
          threadInputRef.current?.focus();
        }, 120);
      }
    },
    [
      isMobile,
      maximizedRef,
      sidebarWidthRef,
      threadWidthRef,
      panelWidthRef,
      setPanelWidth,
      activeConversation,
      isTabVisible,
      markThreadReadOptimisticAndSync,
      scrollToChatBottom,
      persistPersonalLayout,
      setActiveThreadMsgId,
      setThreadOpen,
      setMobileActiveView,
      threadInputRef,
    ]
  );

  const navigateToMessage = useCallback(
    (convId: string, msgId?: string) => {
      if ((userPrefs.hiddenIds || []).includes(convId)) {
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          hiddenIds: (prev.hiddenIds || []).filter((id) => id !== convId),
        }));
      }
      setSidebarFilter('all');
      setSearchQuery('');
      setActiveConvId(convId);
      setActiveSubtab('chat');
      if (isMobile) setMobileActiveView('conversation');

      if (standalone && typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('convId', convId);
          if (convId !== AI_COPILOT_CONV_ID) {
            for (const key of MOS_CHAT_SESSION_QUERY_KEYS) url.searchParams.delete(key);
          }
          if (msgId) {
            url.searchParams.set('msgId', msgId);
          } else {
            url.searchParams.delete('msgId');
          }
          window.history.replaceState(null, '', url.toString());
        } catch {
          // ignore
        }
      }

      const targetConv =
        convId === AI_COPILOT_CONV_ID ? aiCopilotConversation : conversations.find((c) => c.id === convId);

      if (!targetConv) {
        pendingNavRef.current = { convId, msgId };
        void fetchBootstrap(true);
        return;
      }

      const msgs = targetConv.messages || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
      markConversationReadOptimisticAndSync(convId, msgs.length, lastMsg?.id);

      if (!msgId) {
        scrollToChatBottom('main', 'auto');
        return;
      }

      let rootMsg = targetConv.messages.find((m) => m.id === msgId);
      let isReply = false;

      if (!rootMsg) {
        for (const m of targetConv.messages) {
          const foundReply = (m.thread || []).find((r) => r.id === msgId);
          if (foundReply) {
            rootMsg = m;
            isReply = true;
            break;
          }
        }
      }

      const retryKey = `${convId}:${msgId}`;
      if (!rootMsg && !retriedMissingMsgRef.current.has(retryKey)) {
        retriedMissingMsgRef.current.add(retryKey);
        pendingNavRef.current = { convId, msgId };
        void fetchBootstrap(true);
        return;
      }

      if (rootMsg) {
        const hasSubthread = Boolean(rootMsg.thread && rootMsg.thread.length > 0);
        if (hasSubthread || isReply) {
          handleOpenThread(rootMsg.id, convId);
        }
      }

      setHighlightedMsgId(msgId);

      const attemptScroll = () => {
        const targetId = isReply ? `mos-chat-reply-${msgId}` : `mos-chat-msg-${msgId}`;
        const el = document.getElementById(targetId) || document.getElementById(`mos-chat-msg-${msgId}`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      };

      [60, 200, 450, 800].forEach((delay) => {
        setTimeout(() => {
          attemptScroll();
        }, delay);
      });

      setTimeout(() => {
        setHighlightedMsgId((prev) => (prev === msgId ? null : prev));
      }, 4000);
    },
    [
      conversations,
      aiCopilotConversation,
      isMobile,
      standalone,
      handleOpenThread,
      markConversationReadOptimisticAndSync,
      userPrefs.hiddenIds,
      updateUserSidebarPrefs,
      fetchBootstrap,
      scrollToChatBottom,
      pendingNavRef,
      retriedMissingMsgRef,
      setSidebarFilter,
      setSearchQuery,
      setActiveConvId,
      setActiveSubtab,
      setMobileActiveView,
    ]
  );

  useEffect(() => {
    navigateToMessageRef.current = navigateToMessage;
  }, [navigateToMessage, navigateToMessageRef]);

  const handleSelectSearchResult = useCallback(
    (item: MosChatSearchResultItem) => {
      setSearchModalOpen(false);
      navigateToMessage(item.conversationId, item.id);
    },
    [navigateToMessage]
  );

  const handleOpenForwardModal = useCallback(
    (msg: MosChatMessage, reply?: MosChatThreadReply | null, sourceConvIdOverride?: string) => {
      const cid = sourceConvIdOverride || msg.conversationId || activeConversation?.id || '';
      if (!cid || cid === AI_COPILOT_CONV_ID) return;
      setForwardModalTarget({
        sourceConversationId: cid,
        message: msg,
        reply: reply || null,
      });
    },
    [activeConversation?.id]
  );

  const handleJumpToForwardedSource = useCallback(
    (sourceConvId: string, sourceMsgId: string) => {
      if (!accessibleConversationIds.has(sourceConvId)) return;
      navigateToMessage(sourceConvId, sourceMsgId);
    },
    [accessibleConversationIds, navigateToMessage]
  );

  const handleForwardMessage = useCallback(
    async (payload: ForwardMosChatMessageRequest): Promise<ForwardMosChatMessageResponse | null> => {
      try {
        const res = await apiClient.chat.forwardMessage(payload);
        lastVersionRef.current = Date.now();
        if (Array.isArray(res?.updatedConversations) && res.updatedConversations.length > 0) {
          setConversations((prev) => {
            const byId = new Map(res.updatedConversations.map((c) => [c.id, c]));
            const updatedExisting = prev.map((c) => byId.get(c.id) || c);
            const existingIds = new Set(prev.map((c) => c.id));
            const newlyCreated = res.updatedConversations.filter((c) => !existingIds.has(c.id));
            return [...newlyCreated, ...updatedExisting];
          });
        }
        if (res?.userPrefs) {
          setUserPrefs(res.userPrefs);
        }
        notifyLivePeers();
        const destCount = res?.results?.length || 0;
        const threadCount = res?.results?.[0]?.forwardedThreadCount || 0;
        antdMessage.success(
          threadCount > 0
            ? `Đã chuyển tiếp tin nhắn (kèm ${threadCount} phản hồi trong luồng) tới ${destCount} nơi nhận!`
            : `Đã chuyển tiếp tin nhắn tới ${destCount} nơi nhận!`
        );
        return res;
      } catch (err: SafeAny) {
        antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể chuyển tiếp tin nhắn.');
        return null;
      }
    },
    [notifyLivePeers, antdMessage, lastVersionRef, setConversations, setUserPrefs]
  );

  useEffect(() => {
    if (targetNavigation?.openTab) {
      setActiveSubtab(targetNavigation.openTab);
    }
    if (targetNavigation?.conversationId) {
      const navKey = `${targetNavigation.conversationId}:${targetNavigation.messageId || ''}:${targetNavigation.timestamp || 0}:${targetNavigation.openTab || ''}`;
      if (lastProcessedNavRef.current === navKey) return;
      lastProcessedNavRef.current = navKey;
      navigateToMessageRef.current(targetNavigation.conversationId, targetNavigation.messageId);
    }
  }, [
    targetNavigation?.timestamp,
    targetNavigation?.conversationId,
    targetNavigation?.messageId,
    targetNavigation?.openTab,
    setActiveSubtab,
    navigateToMessageRef,
  ]);

  return {
    highlightedMsgId,
    setHighlightedMsgId,
    searchModalOpen,
    setSearchModalOpen,
    forwardModalTarget,
    setForwardModalTarget,
    accessibleConversationIds,
    markThreadReadOptimisticAndSync,
    handleOpenThread,
    navigateToMessage,
    handleSelectSearchResult,
    handleOpenForwardModal,
    handleJumpToForwardedSource,
    handleForwardMessage,
  };
}
