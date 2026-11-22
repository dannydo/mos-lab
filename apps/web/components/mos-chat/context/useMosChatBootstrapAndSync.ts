'use client';

import { useCallback, useEffect, useRef } from 'react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AI_COPILOT_CONV_ID, STAFF_DIRECTORY_CACHE_KEY } from '../constants/chat-constants';
import { useMosChatBridgeListener } from '../store/mos-chat-bridge';
import { mergeDeltaConversations, mergeDeltaTasks, useChatRealtimeSync } from '../store/useChatRealtimeSync';
import type { MosChatActiveSubtab, MosChatMobileView } from '../types/mos-chat-types';

export interface UseMosChatBootstrapAndSyncParams {
  activeConvId: string;
  pinnedConvIds: Set<string>;
  lastVersionRef: React.MutableRefObject<number | undefined>;
  setStaffDirectory: React.Dispatch<React.SetStateAction<MosChatStaffMember[]>>;
  setPinnedConvIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setAllMessagesByConv: React.Dispatch<React.SetStateAction<Record<string, MosChatMessage[]>>>;
  setActiveThreadMsg: React.Dispatch<React.SetStateAction<MosChatMessage | null>>;
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  setWorkflowTemplates: React.Dispatch<React.SetStateAction<MosChatWorkflowTemplate[]>>;
  setWorkflowInstances: React.Dispatch<React.SetStateAction<MosChatWorkflowInstance[]>>;
  setActiveConvId: React.Dispatch<React.SetStateAction<string>>;
  setMobileView: React.Dispatch<React.SetStateAction<MosChatMobileView>>;
  setActiveSubtab: React.Dispatch<React.SetStateAction<MosChatActiveSubtab>>;
  syncAiChatSession: (targetSessionId?: string | null) => Promise<void>;
}

/**
 * Handles Context-layer bootstrap polling, incremental realtime delta sync, bridge/custom events,
 * read-marker syncing, and conversation pinning.
 */
export function useMosChatBootstrapAndSync({
  activeConvId,
  pinnedConvIds,
  lastVersionRef,
  setStaffDirectory,
  setPinnedConvIds,
  setConversations,
  setAllMessagesByConv,
  setActiveThreadMsg,
  setTasks,
  setWorkflowTemplates,
  setWorkflowInstances,
  setActiveConvId,
  setMobileView,
  setActiveSubtab,
  syncAiChatSession,
}: UseMosChatBootstrapAndSyncParams) {
  const staffDirectoryHashRef = useRef<string>('');

  const syncServerPinnedPrefs = useCallback(
    (serverPinnedIds?: string[]) => {
      if (!serverPinnedIds) return;
      setPinnedConvIds((prev) => {
        const serverSet = new Set(serverPinnedIds);
        if (serverSet.size === 0 && prev.size > 0) {
          // Self-healing: preserve local pins and re-sync to server to avoid data loss (MOS-BUG-238)
          const localArray = Array.from(prev);
          apiClient.chat.updateUserPrefs({ pinnedIds: localArray }).catch(() => {});
          return prev;
        }
        return serverSet;
      });
    },
    [setPinnedConvIds]
  );

  const fetchBootstrap = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && lastVersionRef.current) {
      return;
    }
    try {
      const res = await apiClient.chat.bootstrap({ sinceVersion: lastVersionRef.current }, { isPolling: true });
      if (res && res.staffDirectory && res.staffDirectory.length > 0) {
        try {
          const serialized = JSON.stringify(res.staffDirectory);
          if (staffDirectoryHashRef.current !== serialized) {
            staffDirectoryHashRef.current = serialized;
            setStaffDirectory(res.staffDirectory);
            if (localStorage.getItem(STAFF_DIRECTORY_CACHE_KEY) !== serialized) {
              localStorage.setItem(STAFF_DIRECTORY_CACHE_KEY, serialized);
            }
          }
        } catch {
          // ignore
        }
      }
      if (res?.userPrefs?.pinnedIds) {
        syncServerPinnedPrefs(res.userPrefs.pinnedIds);
      }
      if (res?.unchanged) {
        return;
      }
      if (res?.version) {
        lastVersionRef.current = res.version;
      }
      if (res && res.conversations) {
        setConversations(res.conversations);
        const map: Record<string, MosChatMessage[]> = {};
        res.conversations.forEach((c) => {
          if (c.messages && c.messages.length > 0) {
            map[c.id] = c.messages;
          }
        });
        setAllMessagesByConv((prev) => ({ ...prev, ...map }));

        setActiveThreadMsg((current) => {
          if (!current) return null;
          for (const c of res.conversations) {
            const found = c.messages?.find((m) => m.id === current.id);
            if (found) return found;
          }
          return current;
        });
      }
      if (res?.userPrefs?.pinnedIds) {
        syncServerPinnedPrefs(res.userPrefs.pinnedIds);
      }
      if (res?.tasks) setTasks(res.tasks);
      if (res?.workflowTemplates) setWorkflowTemplates(res.workflowTemplates);
      if (res?.workflowInstances) setWorkflowInstances(res.workflowInstances);
    } catch {
      // offline or silent error
    }
  }, [
    lastVersionRef,
    setActiveThreadMsg,
    setAllMessagesByConv,
    setConversations,
    setStaffDirectory,
    setTasks,
    setWorkflowInstances,
    setWorkflowTemplates,
    syncServerPinnedPrefs,
  ]);

  useEffect(() => {
    fetchBootstrap();
    const interval = setInterval(fetchBootstrap, 30000);
    return () => clearInterval(interval);
  }, [fetchBootstrap]);

  useChatRealtimeSync({
    enabled: true,
    intervalMs: 12_000,
    onDeltaSynced: (delta) => {
      if (
        delta.updatedConversations.length > 0 ||
        delta.updatedMessages.length > 0 ||
        delta.updatedMissions.length > 0
      ) {
        setConversations((prev) => {
          const merged = mergeDeltaConversations(
            prev,
            delta.updatedConversations,
            delta.updatedMessages,
            delta.updatedMissions
          );
          setAllMessagesByConv((prevMap) => {
            const nextMap = { ...prevMap };
            for (const c of merged) {
              if (c.messages && c.messages.length > 0) {
                nextMap[c.id] = c.messages;
              }
            }
            return nextMap;
          });
          return merged;
        });
      }
      if (delta.updatedTasks.length > 0 || delta.updatedMissions.length > 0) {
        setTasks((prev) => mergeDeltaTasks(prev, delta.updatedTasks, delta.updatedMissions));
      }
      if (activeConvId === AI_COPILOT_CONV_ID) {
        void syncAiChatSession();
      }
    },
  });

  useMosChatBridgeListener(
    useCallback(
      (action) => {
        if (action.type === 'OPEN_CONVERSATION') {
          setActiveConvId(action.conversationId);
          setMobileView('room');
        }
      },
      [setActiveConvId, setMobileView]
    )
  );

  useEffect(() => {
    const handleGlobalOpen = (ev: Event) => {
      const customEv = ev as CustomEvent<{
        conversationId?: string;
        messageId?: string;
        openTab?: MosChatActiveSubtab;
      }>;
      const detail = customEv.detail || {};
      if (detail.openTab) {
        setActiveSubtab(detail.openTab);
      }
      if (detail.conversationId) {
        setActiveConvId(detail.conversationId);
        setMobileView('room');
      }
    };
    window.addEventListener('mos-chat:open', handleGlobalOpen);
    return () => window.removeEventListener('mos-chat:open', handleGlobalOpen);
  }, [setActiveConvId, setActiveSubtab, setMobileView]);

  const markConversationAsRead = useCallback(
    async (convId: string) => {
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)));
      try {
        await apiClient.chat.markAsRead(convId);
      } catch {
        // ignore
      }
    },
    [setConversations]
  );

  const markThreadAsRead = useCallback(
    async (convId: string, msgId: string) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const updatedMessages = (c.messages || []).map((m) =>
            m.id === msgId ? { ...m, unreadThreadReplyCount: 0 } : m
          );
          const newUnreadThreadCount = updatedMessages.reduce((sum, m) => sum + (m.unreadThreadReplyCount || 0), 0);
          return { ...c, messages: updatedMessages, unreadThreadCount: newUnreadThreadCount };
        })
      );
      setAllMessagesByConv((prev) => {
        const list = prev[convId] || [];
        return {
          ...prev,
          [convId]: list.map((m) => (m.id === msgId ? { ...m, unreadThreadReplyCount: 0 } : m)),
        };
      });
      setActiveThreadMsg((current) => {
        if (!current || current.id !== msgId) return current;
        return { ...current, unreadThreadReplyCount: 0 };
      });
      try {
        await apiClient.chat.markThreadAsRead(convId, msgId);
      } catch {
        // ignore
      }
    },
    [setActiveThreadMsg, setAllMessagesByConv, setConversations]
  );

  const isPinnedConversation = useCallback((convId: string) => pinnedConvIds.has(convId), [pinnedConvIds]);

  const togglePinConversation = useCallback(
    async (convId: string, explicitPinned?: boolean) => {
      const isCurrentlyPinned = pinnedConvIds.has(convId);
      const willPin = typeof explicitPinned === 'boolean' ? explicitPinned : !isCurrentlyPinned;
      setPinnedConvIds((prev) => {
        const next = new Set(prev);
        if (willPin) next.add(convId);
        else next.delete(convId);
        return next;
      });
      try {
        await apiClient.chat.togglePinConversation(convId, willPin);
      } catch {
        // ignore
      }
    },
    [pinnedConvIds, setPinnedConvIds]
  );

  return {
    fetchBootstrap,
    markConversationAsRead,
    markThreadAsRead,
    isPinnedConversation,
    togglePinConversation,
  };
}
