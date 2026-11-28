'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import type { GlobalToken } from 'antd';
import type { NotificationInstance } from 'antd/es/notification/interface';
import type {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatPresenceStatus,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatUserSidebarPrefs,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { STAFF_DIRECTORY_CACHE_KEY } from '../constants/chat-constants';
import { useMosChatBridgeListener } from '../store/mos-chat-bridge';
import {
  mergeDeltaConversations,
  mergeDeltaTasks,
  mergeWindowedBootstrapConversations,
  prependOlderConversationMessages,
  useChatRealtimeSync,
} from '../store/useChatRealtimeSync';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import { dispatchConversationNotifications, loadNotifiedBuzzKeys } from '../utils/portal-notification-dispatch';
import { useMosChatVoiceCall } from '../utils/useMosChatVoiceCall';
import { useMosChatWebPush } from '../utils/useMosChatWebPush';

export interface UsePortalBootstrapAndRealtimeParams {
  open: boolean;
  openRef: React.MutableRefObject<boolean>;
  activeConvIdRef: React.MutableRefObject<string>;
  activeSubtab: MosChatActiveSubtab;
  setActiveConvId: (id: string) => void;
  currentUser?: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  isStrictDannySuperAdmin: boolean;
  presence: MosChatPresenceStatus;
  maiVoiceAnnounceEnabled: boolean;
  ttsSpeed: number;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  staffDirectory: MosChatStaffMember[];
  setStaffDirectory: React.Dispatch<React.SetStateAction<MosChatStaffMember[]>>;
  setWorkflowTemplates: React.Dispatch<React.SetStateAction<MosChatWorkflowTemplate[]>>;
  setWorkflowInstances: React.Dispatch<React.SetStateAction<MosChatWorkflowInstance[]>>;
  setAccessConfig: React.Dispatch<React.SetStateAction<MosChatAccessConfig>>;
  setServerCanAccessChat: React.Dispatch<React.SetStateAction<boolean | null>>;
  userSidebarPrefsStorageKey: string;
  userPrefs: MosChatUserSidebarPrefs;
  setUserPrefs: React.Dispatch<React.SetStateAction<MosChatUserSidebarPrefs>>;
  lastLocalPrefsMutationAtRef: React.MutableRefObject<number>;
  hasHydratedPrefsFromServerRef: React.MutableRefObject<boolean>;
  dockedConvIds: string[];
  broadcastChannelRef: React.MutableRefObject<BroadcastChannel | null>;
  navigateToMessageRef: React.MutableRefObject<(convId: string, msgId?: string) => void>;
  pendingNavRef: React.MutableRefObject<{ convId: string; msgId?: string } | null>;
  lastVersionRef: React.MutableRefObject<number>;
  ensurePortalOpen: () => void;
  setInitialWorkflowCode: (code: string) => void;
  setTriggerWorkflowModalOpen: (open: boolean) => void;
  updateComposerText: (val: string) => void;
  notification: NotificationInstance;
  surfaceRaised: string;
  accentColor: string;
  accentContrast: string;
  borderColor: string;
  token: GlobalToken;
}

export function usePortalBootstrapAndRealtime({
  open,
  openRef,
  activeConvIdRef,
  activeSubtab,
  setActiveConvId,
  currentUser,
  currentUserStaffMember,
  isStrictDannySuperAdmin,
  presence,
  maiVoiceAnnounceEnabled,
  ttsSpeed,
  setConversations,
  setTasks,
  staffDirectory,
  setStaffDirectory,
  setWorkflowTemplates,
  setWorkflowInstances,
  setAccessConfig,
  setServerCanAccessChat,
  userSidebarPrefsStorageKey,
  userPrefs,
  setUserPrefs,
  lastLocalPrefsMutationAtRef,
  hasHydratedPrefsFromServerRef,
  dockedConvIds,
  broadcastChannelRef,
  navigateToMessageRef,
  pendingNavRef,
  lastVersionRef,
  ensurePortalOpen,
  setInitialWorkflowCode,
  setTriggerWorkflowModalOpen,
  updateComposerText,
  notification,
  surfaceRaised,
  accentColor,
  accentContrast,
  borderColor,
  token,
}: UsePortalBootstrapAndRealtimeParams) {
  const notifiedBuzzIdsRef = useRef<Set<string>>(loadNotifiedBuzzKeys());
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const isInitialBootstrapRef = useRef<boolean>(true);
  const staffDirectoryHashRef = useRef<string>('');
  const staffDirectoryLenRef = useRef<number>(staffDirectory.length);
  staffDirectoryLenRef.current = staffDirectory.length;
  const oldestCursorByConvRef = useRef<Record<string, string | null>>({});
  const manuallyPagedConvsRef = useRef<Set<string>>(new Set());

  // Keep volatile snapshot values in refs so fetchBootstrap stays identity-stable and polling timers do not reset
  const userPrefsRef = useRef(userPrefs);
  userPrefsRef.current = userPrefs;
  const presenceRef = useRef(presence);
  presenceRef.current = presence;
  const activeSubtabRef = useRef(activeSubtab);
  activeSubtabRef.current = activeSubtab;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const currentUserStaffMemberRef = useRef(currentUserStaffMember);
  currentUserStaffMemberRef.current = currentUserStaffMember;
  const isStrictDannyRef = useRef(isStrictDannySuperAdmin);
  isStrictDannyRef.current = isStrictDannySuperAdmin;
  const themeSnapshotRef = useRef({ surfaceRaised, accentColor, accentContrast, borderColor, token });
  themeSnapshotRef.current = { surfaceRaised, accentColor, accentContrast, borderColor, token };

  const fetchBootstrap = useCallback(
    async (forceFull = false) => {
      try {
        const shouldForceFull = forceFull || staffDirectoryLenRef.current === 0;
        const res = await apiClient.chat.bootstrap(
          { sinceVersion: shouldForceFull ? undefined : lastVersionRef.current || undefined },
          { isPolling: true }
        );
        if (res?.accessConfig) {
          setAccessConfig((prev) => {
            try {
              return JSON.stringify(prev) === JSON.stringify(res.accessConfig) ? prev : res.accessConfig!;
            } catch {
              return res.accessConfig!;
            }
          });
        }
        if (typeof res?.canAccessChat === 'boolean') {
          setServerCanAccessChat((prev) => (prev === res.canAccessChat ? prev : res.canAccessChat!));
        }
        if (res?.userPrefs) {
          setUserPrefs((prev) => {
            if (Date.now() - lastLocalPrefsMutationAtRef.current < 4000) {
              return prev;
            }
            const serverTs = res.userPrefs?.updatedAt ? new Date(res.userPrefs.updatedAt).getTime() : 0;
            const localTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
            const hasServerCustomizations =
              (res.userPrefs?.pinnedIds?.length || 0) > 0 ||
              (res.userPrefs?.mutedIds?.length || 0) > 0 ||
              (res.userPrefs?.hiddenIds?.length || 0) > 0 ||
              (res.userPrefs?.customSections?.length || 0) > 0 ||
              Object.keys(res.userPrefs?.conversationOrder || {}).length > 0 ||
              Object.keys(res.userPrefs?.emojiUsage || {}).length > 0 ||
              Boolean(res.userPrefs?.emojiUsageBootstrappedAt);
            const isFirstHydration = !hasHydratedPrefsFromServerRef.current;
            hasHydratedPrefsFromServerRef.current = true;
            const serverPinned = res.userPrefs?.pinnedIds || [];
            const localPinned = prev.pinnedIds || [];
            const hasNewServerPinned = serverPinned.some((id) => !localPinned.includes(id));

            if (
              (isFirstHydration && (hasServerCustomizations || !prev.updatedAt)) ||
              (!prev.updatedAt && (hasServerCustomizations || isFirstHydration)) ||
              serverTs >= localTs ||
              hasNewServerPinned ||
              (serverTs > 0 && Math.abs(serverTs - localTs) < 5000 && hasServerCustomizations)
            ) {
              const effectivePinned = Array.from(
                new Set([
                  ...serverPinned,
                  ...(localPinned.length > 0 && serverPinned.length === 0
                    ? localPinned
                    : serverTs < localTs
                      ? localPinned
                      : []),
                ])
              );
              const effectiveHidden = (res.userPrefs?.hiddenIds || []).filter((id) => !effectivePinned.includes(id));
              const mergedPrefs: MosChatUserSidebarPrefs = {
                ...res.userPrefs!,
                pinnedIds: effectivePinned,
                hiddenIds: effectiveHidden,
              };

              if (localPinned.length > 0 && serverPinned.length === 0) {
                apiClient.chat.updateUserPrefs(mergedPrefs).catch(() => {});
              }

              try {
                if (JSON.stringify(prev) === JSON.stringify(mergedPrefs)) {
                  return prev;
                }
              } catch {
                // ignore
              }
              if (typeof window !== 'undefined') {
                try {
                  window.localStorage.setItem(userSidebarPrefsStorageKey, JSON.stringify(mergedPrefs));
                } catch {
                  // ignore
                }
              }
              return mergedPrefs;
            }
            return prev;
          });
        }
        if (Array.isArray(res?.staffDirectory) && res.staffDirectory.length > 0) {
          let serializedStaff = '';
          try {
            serializedStaff = JSON.stringify(res.staffDirectory);
          } catch {
            // ignore
          }
          if (!serializedStaff || staffDirectoryHashRef.current !== serializedStaff) {
            staffDirectoryHashRef.current = serializedStaff;
            setStaffDirectory(res.staffDirectory);
            if (typeof window !== 'undefined' && serializedStaff) {
              try {
                window.localStorage.setItem(STAFF_DIRECTORY_CACHE_KEY, serializedStaff);
              } catch {
                // ignore
              }
            }
          }
        }
        if (res?.unchanged) {
          return;
        }
        if (res?.version) {
          lastVersionRef.current = res.version;
        }
        if (Array.isArray(res?.conversations)) {
          for (const conv of res.conversations) {
            if (!manuallyPagedConvsRef.current.has(conv.id)) {
              oldestCursorByConvRef.current[conv.id] = conv.oldestLoadedMessageId || conv.messages?.[0]?.id || null;
            }
          }
          setConversations((prev) => mergeWindowedBootstrapConversations(prev, res.conversations));

          if (pendingNavRef.current) {
            const pending = pendingNavRef.current;
            const foundInLoaded = res.conversations.some((c) => c.id === pending.convId);
            if (foundInLoaded) {
              pendingNavRef.current = null;
              setTimeout(() => {
                navigateToMessageRef.current(pending.convId, pending.msgId);
              }, 60);
            }
          }

          dispatchConversationNotifications({
            conversations: res.conversations,
            currentUser: currentUserRef.current,
            currentUserStaffMember: currentUserStaffMemberRef.current,
            userPrefs: userPrefsRef.current,
            isStrictDannySuperAdmin: isStrictDannyRef.current,
            presence: presenceRef.current,
            activeSubtab: activeSubtabRef.current,
            openRef,
            activeConvIdRef,
            isInitialBootstrapRef,
            seenMessageIdsRef,
            notifiedBuzzIdsRef,
            navigateToMessageRef,
            ensurePortalOpen,
            maiVoiceAnnounceEnabled,
            ttsSpeed,
            notification,
            ...themeSnapshotRef.current,
          });
        }
        if (res?.tasks) {
          setTasks((prev) => (JSON.stringify(prev) === JSON.stringify(res.tasks) ? prev : res.tasks));
        }
        if (Array.isArray(res?.workflowTemplates)) {
          setWorkflowTemplates((prev) =>
            JSON.stringify(prev) === JSON.stringify(res.workflowTemplates) ? prev : res.workflowTemplates!
          );
        }
        if (Array.isArray(res?.workflowInstances)) {
          setWorkflowInstances((prev) =>
            JSON.stringify(prev) === JSON.stringify(res.workflowInstances) ? prev : res.workflowInstances!
          );
        }
      } catch {
        // Fallback state already initialized
      }
    },
    [userSidebarPrefsStorageKey, maiVoiceAnnounceEnabled, ttsSpeed]
  );

  useMosChatBridgeListener(
    useCallback(
      (payload) => {
        if (payload.type === 'OPEN_CONVERSATION') {
          navigateToMessageRef.current(payload.conversationId, payload.messageId);
        } else if (payload.type === 'OPEN_WORKFLOW_MODAL' && isStrictDannySuperAdmin) {
          if (payload.conversationId) {
            setActiveConvId(payload.conversationId);
          }
          setInitialWorkflowCode(payload.templateCode || 'WF_CASH_ADVANCE');
          setTriggerWorkflowModalOpen(true);
        } else if (payload.type === 'SHARE_ENTITY_CONTEXT') {
          if (payload.conversationId) {
            setActiveConvId(payload.conversationId);
          }
          if (payload.initialDraftText) {
            updateComposerText(payload.initialDraftText);
          }
        }
      },
      [
        isStrictDannySuperAdmin,
        navigateToMessageRef,
        setActiveConvId,
        setInitialWorkflowCode,
        setTriggerWorkflowModalOpen,
        updateComposerText,
      ]
    )
  );

  useEffect(() => {
    void fetchBootstrap();
    let timer: NodeJS.Timeout;

    const scheduleNext = () => {
      const isHidden = typeof document !== 'undefined' && document.hidden;
      const delay = isHidden ? 20000 : open || dockedConvIds.length > 0 ? 5000 : 15000;
      timer = setTimeout(() => {
        void fetchBootstrap();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        void fetchBootstrap();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchBootstrap, open, dockedConvIds.length]);

  useChatRealtimeSync({
    enabled: Boolean(open || dockedConvIds.length > 0),
    intervalMs: 12_000,
    onDeltaSynced: (delta) => {
      if (
        delta.updatedConversations.length > 0 ||
        delta.updatedMessages.length > 0 ||
        delta.updatedMissions.length > 0
      ) {
        setConversations((prev) =>
          mergeDeltaConversations(prev, delta.updatedConversations, delta.updatedMessages, delta.updatedMissions)
        );
      }
      if (delta.updatedTasks.length > 0 || delta.updatedMissions.length > 0) {
        setTasks((prev) => mergeDeltaTasks(prev, delta.updatedTasks, delta.updatedMissions));
      }
    },
  });

  const voiceCall = useMosChatVoiceCall({
    currentStaffId: currentUser?.id ?? null,
    enabled: Boolean(currentUser?.id),
    onCallSystemMessageCreated: (sysMsg) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== sysMsg.conversationId) return c;
          const exists = (c.messages || []).some((m) => m.id === sysMsg.id);
          if (exists) return c;
          return {
            ...c,
            updatedAt: sysMsg.createdAt,
            messages: [...(c.messages || []), sysMsg],
          };
        })
      );
    },
  });

  useMosChatWebPush({
    enabled: Boolean(currentUser?.id),
    onSelectConversationFromPush: (convId, msgId) => {
      ensurePortalOpen();
      navigateToMessageRef.current(convId, msgId);
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('mos_google_chat_live_v1');
    broadcastChannelRef.current = channel;
    channel.onmessage = () => {
      void fetchBootstrap(true);
    };
    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, [broadcastChannelRef, fetchBootstrap]);

  const loadOlderMessages = useCallback(
    async (conversationId: string) => {
      const beforeCursor = oldestCursorByConvRef.current[conversationId];
      if (!conversationId || !beforeCursor) return;
      try {
        const page = await apiClient.chat.listConversationMessages(conversationId, {
          before: beforeCursor,
          limit: 30,
        });
        manuallyPagedConvsRef.current.add(conversationId);
        const nextOldest = page?.messages?.[0]?.id || page?.nextCursor || null;
        if (nextOldest) {
          oldestCursorByConvRef.current[conversationId] = nextOldest;
        }
        setConversations((prev) => prependOlderConversationMessages(prev, conversationId, page));
      } catch {
        // Ignore transient network errors when loading older history
      }
    },
    [setConversations]
  );

  return {
    notifiedBuzzIdsRef,
    fetchBootstrap,
    loadOlderMessages,
    voiceCall,
  };
}
