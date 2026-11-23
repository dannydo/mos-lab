'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  removeVietnameseTones,
  type MosChatConversation,
  type MosChatCustomerCard,
  type MosChatStaffMember,
  type MosChatTaskItem,
  type MosChatUserSidebarPrefs,
  type SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { tabNotificationManager } from '../../../lib/tab-notification';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import { syncConversationIntoUrl } from '../utils/mos-chat-permalink';

export interface UsePortalReadSyncParams {
  open: boolean;
  standalone: boolean;
  isMobile: boolean;
  activeSubtab: MosChatActiveSubtab;
  setActiveConvId: (id: string) => void;
  setActiveSubtab: (tab: MosChatActiveSubtab) => void;
  setMobileActiveView: (view: 'inbox' | 'conversation' | 'thread') => void;
  ensurePortalOpen: () => void;
  currentUser?: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  aiSessionId: string | null;
  conversations: MosChatConversation[];
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  visibleConversations: MosChatConversation[];
  allUserConversations: MosChatConversation[];
  activeConversation?: MosChatConversation;
  uniqueTasks: MosChatTaskItem[];
  userPrefs: MosChatUserSidebarPrefs;
  updateUserPrefsLocalOnly: (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => void;
  updateUserSidebarPrefs: (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => void;
  getEffectiveUnreadCount: (conv: MosChatConversation) => number;
  dockedConvIds: string[];
  collapsedDockIds: Record<string, boolean>;
  notifyLivePeers: () => void;
  navigateToMessageRef: React.MutableRefObject<(convId: string, msgId?: string) => void>;
  scrollToChatBottom: (target?: 'main' | 'thread' | { dockConvId: string }, behavior?: ScrollBehavior) => void;
  onUnreadCountChange?: (unreadCount: number, activeTaskCount: number) => void;
}

/**
 * Manages tab visibility state, global `mos-chat:open` events, header unread reporting,
 * conversation selection, and optimistic/synced read-receipt updates.
 */
export function usePortalReadSync({
  open,
  standalone,
  isMobile,
  activeSubtab,
  setActiveConvId,
  setActiveSubtab,
  setMobileActiveView,
  ensurePortalOpen,
  currentUser,
  currentUserStaffMember,
  aiSessionId,
  conversations,
  setConversations,
  visibleConversations,
  allUserConversations,
  activeConversation,
  uniqueTasks,
  userPrefs,
  updateUserPrefsLocalOnly,
  updateUserSidebarPrefs,
  getEffectiveUnreadCount,
  dockedConvIds,
  collapsedDockIds,
  notifyLivePeers,
  navigateToMessageRef,
  scrollToChatBottom,
  onUnreadCountChange,
}: UsePortalReadSyncParams) {
  const [isTabVisible, setIsTabVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const syncVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        setIsTabVisible(true);
      }
    };
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Listen to global custom event 'mos-chat:open'
  useEffect(() => {
    const handleGlobalChatOpen = async (ev: Event) => {
      const customEv = ev as CustomEvent<{
        conversationId?: string;
        messageId?: string;
        participantStaffId?: number;
        participantName?: string;
        customerCard?: MosChatCustomerCard;
        openTab?: MosChatActiveSubtab;
        taskId?: string;
      }>;
      const detail = customEv.detail || {};

      ensurePortalOpen();

      if (detail.openTab) {
        setActiveSubtab(detail.openTab);
      }

      if (detail.conversationId) {
        navigateToMessageRef.current(detail.conversationId, detail.messageId);
        return;
      }
      if (detail.participantName || detail.participantStaffId) {
        const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
        const targetPeerId = Number(detail.participantStaffId) || 0;
        const normalizedTarget = detail.participantName
          ? removeVietnameseTones(detail.participantName.toLowerCase())
          : '';
        const matched = visibleConversations.find((c) => {
          if (c.type !== 'dm' || c.isSelf) return false;
          if (targetPeerId > 0 && myStaffId > 0 && Array.isArray(c.memberIds)) {
            const nums = c.memberIds.map(Number);
            if (nums.includes(myStaffId) && nums.includes(targetPeerId)) return true;
          }
          if (targetPeerId > 0 && Number(c.participantStaffId) === targetPeerId) return true;
          return Boolean(normalizedTarget && removeVietnameseTones(c.name.toLowerCase()).includes(normalizedTarget));
        });
        if (matched) {
          setActiveConvId(matched.id);
          setActiveSubtab('chat');
          if (isMobile) setMobileActiveView('conversation');
          return;
        }
        try {
          const created = await apiClient.chat.createConversation({
            type: 'dm',
            name: detail.participantName || 'Trò chuyện 1-1',
            participantStaffId: detail.participantStaffId,
          });
          if (created?.conversation) {
            setConversations((prev) => [created.conversation, ...prev.filter((x) => x.id !== created.conversation.id)]);
            setActiveConvId(created.conversation.id);
            setActiveSubtab('chat');
            if (isMobile) setMobileActiveView('conversation');
            notifyLivePeers();
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('mos-chat:open', handleGlobalChatOpen);
    return () => window.removeEventListener('mos-chat:open', handleGlobalChatOpen);
  }, [
    visibleConversations,
    currentUserStaffMember.id,
    currentUser?.id,
    notifyLivePeers,
    isMobile,
    ensurePortalOpen,
    navigateToMessageRef,
    setActiveConvId,
    setActiveSubtab,
    setConversations,
    setMobileActiveView,
  ]);

  // Report unread & active task counts up to Header
  useEffect(() => {
    const totalUnread = visibleConversations.reduce((sum, c) => {
      if ((userPrefs.mutedIds || []).includes(c.id)) return sum;
      return sum + getEffectiveUnreadCount(c);
    }, 0);
    const openTaskCount = uniqueTasks.filter((t) => !t.done && !t.archived).length;
    onUnreadCountChange?.(totalUnread, openTaskCount);
    tabNotificationManager.setUnreadCount('chat', totalUnread);
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('mos_chat_sync');
        syncChannel.postMessage({
          type: 'UNREAD_UPDATE',
          unreadCount: totalUnread,
          activeTaskCount: openTaskCount,
        });
        syncChannel.close();
      } catch {
        // ignore
      }
    }
  }, [visibleConversations, uniqueTasks, userPrefs.mutedIds, getEffectiveUnreadCount, onUnreadCountChange]);

  const markConversationReadOptimisticAndSync = useCallback(
    (convId: string, msgCount: number, lastMsgId?: string) => {
      if (!convId) return;
      const nowIso = new Date().toISOString();
      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      const myName = currentUserStaffMember.displayName || currentUser?.displayName || currentUser?.username || 'Bạn';
      const myRole = currentUserStaffMember.role || currentUser?.role || 'Member';
      const myAvatar = currentUserStaffMember.avatarUrl || null;

      if (convId === AI_COPILOT_CONV_ID) {
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          manualUnreadIds: (prev.manualUnreadIds || []).filter((id) => id !== convId),
          readMessageCountByConv: {
            ...(prev.readMessageCountByConv || {}),
            [convId]: msgCount,
          },
          readAtByConv: {
            ...(prev.readAtByConv || {}),
            [convId]: nowIso,
          },
          ...(lastMsgId
            ? {
                lastReadMessageIdByConv: {
                  ...(prev.lastReadMessageIdByConv || {}),
                  [convId]: lastMsgId,
                },
              }
            : {}),
        }));
        return;
      }

      const targetConv = conversations.find((c) => c.id === convId);
      const threadRepliesUpdates: Record<string, number> = {};
      const threadAtUpdates: Record<string, string> = {};
      const threadLastReplyUpdates: Record<string, string> = {};
      for (const m of targetConv?.messages || []) {
        if (m.thread && m.thread.length > 0) {
          const threadKey = `${convId}::${m.id}`;
          const repCount = m.thread.length;
          threadRepliesUpdates[m.id] = repCount;
          threadRepliesUpdates[threadKey] = repCount;
          threadAtUpdates[m.id] = nowIso;
          threadAtUpdates[threadKey] = nowIso;
          const lastRep = m.thread[m.thread.length - 1];
          if (lastRep?.id) {
            threadLastReplyUpdates[m.id] = lastRep.id;
            threadLastReplyUpdates[threadKey] = lastRep.id;
          }
        }
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const existingReceipts = c.readReceipts || [];
          const updatedReceipts =
            myStaffId > 0
              ? [
                  ...existingReceipts.filter((r) => r.staffId !== myStaffId),
                  {
                    staffId: myStaffId,
                    displayName: myName,
                    role: myRole,
                    avatarUrl: myAvatar,
                    readCount: msgCount,
                    lastReadMessageId: lastMsgId || null,
                    readAt: nowIso,
                  },
                ]
              : existingReceipts;
          const nextMessages = (c.messages || []).map((m) =>
            m.thread && m.thread.length > 0 ? { ...m, unreadThreadReplyCount: 0 } : m
          );
          return {
            ...c,
            unreadCount: 0,
            unreadThreadCount: 0,
            readReceipts: updatedReceipts,
            messages: nextMessages,
          };
        })
      );

      updateUserPrefsLocalOnly((prev) => ({
        ...prev,
        manualUnreadIds: (prev.manualUnreadIds || []).filter((id) => id !== convId),
        hiddenIds: (prev.hiddenIds || []).filter((id) => id !== convId),
        readMessageCountByConv: {
          ...(prev.readMessageCountByConv || {}),
          [convId]: msgCount,
        },
        readAtByConv: {
          ...(prev.readAtByConv || {}),
          [convId]: nowIso,
        },
        ...(lastMsgId
          ? {
              lastReadMessageIdByConv: {
                ...(prev.lastReadMessageIdByConv || {}),
                [convId]: lastMsgId,
              },
            }
          : {}),
        readThreadReplyCountByMsg: {
          ...(prev.readThreadReplyCountByMsg || {}),
          ...threadRepliesUpdates,
        },
        readThreadAtByMsg: {
          ...(prev.readThreadAtByMsg || {}),
          ...threadAtUpdates,
        },
        lastReadThreadReplyIdByMsg: {
          ...(prev.lastReadThreadReplyIdByMsg || {}),
          ...threadLastReplyUpdates,
        },
      }));

      apiClient.chat
        .markAsRead(convId)
        .then((res) => {
          if (res?.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === convId ? res.conversation! : c)));
          }
          notifyLivePeers();
        })
        .catch(() => {});
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
      conversations,
      setConversations,
      updateUserSidebarPrefs,
      updateUserPrefsLocalOnly,
      notifyLivePeers,
    ]
  );

  const selectConversation = useCallback(
    (convId: string) => {
      setActiveConvId(convId);
      setActiveSubtab('chat');
      if (isMobile) {
        setMobileActiveView('conversation');
      }
      if (standalone && typeof window !== 'undefined') {
        try {
          const nextUrl = syncConversationIntoUrl(
            window.location.href,
            convId,
            convId === AI_COPILOT_CONV_ID ? aiSessionId : null
          );
          if (nextUrl) window.history.replaceState(null, '', nextUrl);
        } catch {
          // ignore
        }
      }
      const targetConv = allUserConversations.find((c) => c.id === convId);
      const msgs = targetConv?.messages || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
      if (isTabVisible) {
        markConversationReadOptimisticAndSync(convId, msgs.length, lastMsg?.id);
      }
      scrollToChatBottom('main', 'auto');
    },
    [
      aiSessionId,
      allUserConversations,
      isMobile,
      isTabVisible,
      markConversationReadOptimisticAndSync,
      scrollToChatBottom,
      setActiveConvId,
      setActiveSubtab,
      setMobileActiveView,
      standalone,
    ]
  );

  useEffect(() => {
    if (!isTabVisible) return;
    if (open && activeSubtab === 'chat' && activeConversation) {
      const convId = activeConversation.id;
      const msgs = activeConversation.messages || [];
      const msgCount = msgs.length;
      const lastMsg = msgCount > 0 ? msgs[msgCount - 1] : undefined;
      const currentRead = userPrefs.readMessageCountByConv?.[convId];
      const isManualUnread = (userPrefs.manualUnreadIds || []).includes(convId);
      const hasUnreadThreads = (activeConversation.unreadThreadCount || 0) > 0;
      if (
        !isManualUnread &&
        (currentRead !== msgCount || (activeConversation.unreadCount || 0) > 0 || hasUnreadThreads)
      ) {
        markConversationReadOptimisticAndSync(convId, msgCount, lastMsg?.id);
      }
    }
    for (const dockConvId of dockedConvIds) {
      if (collapsedDockIds[dockConvId]) continue;
      const dockConv = conversations.find((c) => c.id === dockConvId);
      if (!dockConv) continue;
      const msgs = dockConv.messages || [];
      const msgCount = msgs.length;
      const lastMsg = msgCount > 0 ? msgs[msgCount - 1] : undefined;
      const currentRead = userPrefs.readMessageCountByConv?.[dockConvId];
      const isManualUnread = (userPrefs.manualUnreadIds || []).includes(dockConvId);
      const hasUnreadThreads = (dockConv.unreadThreadCount || 0) > 0;
      if (!isManualUnread && (currentRead !== msgCount || (dockConv.unreadCount || 0) > 0 || hasUnreadThreads)) {
        markConversationReadOptimisticAndSync(dockConvId, msgCount, lastMsg?.id);
      }
    }
  }, [
    isTabVisible,
    open,
    activeSubtab,
    activeConversation,
    dockedConvIds,
    collapsedDockIds,
    conversations,
    userPrefs.readMessageCountByConv,
    userPrefs.manualUnreadIds,
    markConversationReadOptimisticAndSync,
  ]);

  return {
    isTabVisible,
    markConversationReadOptimisticAndSync,
    selectConversation,
  };
}
