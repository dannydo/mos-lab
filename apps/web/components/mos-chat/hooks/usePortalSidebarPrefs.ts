'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatStaffMember,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { countConversationSharedWorkspaceItems } from '../components/MosChatFilesPane';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import {
  computeSidebarSections,
  readStoredUserSidebarPrefs,
  resolveUserSidebarPrefsStorageKey,
  sanitizeSidebarPrefsMutation,
  sortConversationsBySection,
} from '../utils/portal-sidebar-sections';
import { removeVietnameseTones } from '@mos-lab/shared';

export interface UsePortalSidebarPrefsParams {
  currentUser?: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  conversations: MosChatConversation[];
  aiCopilotConversation: MosChatConversation | null;
  canUseAiCopilot: boolean;
  isStrictDannySuperAdmin: boolean;
  open: boolean;
  activeConvId: string;
  activeSubtab: MosChatActiveSubtab;
  sidebarFilter: 'all' | 'unread' | 'spaces';
  searchQuery: string;
  dockedConvIds: string[];
  collapsedDockIds: Record<string, boolean>;
  setAccessConfig: React.Dispatch<React.SetStateAction<MosChatAccessConfig>>;
  setSavingAccessConfig: React.Dispatch<React.SetStateAction<boolean>>;
  notifyLivePeers: () => void;
  antdMessage: MessageInstance;
}

export function usePortalSidebarPrefs({
  currentUser,
  currentUserStaffMember,
  conversations,
  aiCopilotConversation,
  canUseAiCopilot,
  isStrictDannySuperAdmin,
  open,
  activeConvId,
  activeSubtab,
  sidebarFilter,
  searchQuery,
  dockedConvIds,
  collapsedDockIds,
  setAccessConfig,
  setSavingAccessConfig,
  notifyLivePeers,
  antdMessage,
}: UsePortalSidebarPrefsParams) {
  const userSidebarPrefsStorageKey = useMemo(
    () => resolveUserSidebarPrefsStorageKey(currentUser),
    [currentUser?.id, currentUser?.username]
  );

  const [userPrefs, setUserPrefs] = useState<MosChatUserSidebarPrefs>(() =>
    readStoredUserSidebarPrefs(userSidebarPrefsStorageKey)
  );
  const lastLocalPrefsMutationAtRef = useRef<number>(0);
  const hasHydratedPrefsFromServerRef = useRef<boolean>(false);
  const [draggingSidebarConv, setDraggingSidebarConv] = useState<{ convId: string; sectionId: string } | null>(null);
  const [dragOverSidebarConvId, setDragOverSidebarConvId] = useState<string | null>(null);
  const [sidebarCustomizeModalOpen, setSidebarCustomizeModalOpen] = useState(false);
  const [sidebarCustomizeTab, setSidebarCustomizeTab] = useState<'sections' | 'conversations'>('sections');
  const [newSectionNameInput, setNewSectionNameInput] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [openConvMenuId, setOpenConvMenuId] = useState<string | null>(null);
  const [openSectionMenuId, setOpenSectionMenuId] = useState<string | null>(null);
  const [quickCreateSectionModalOpen, setQuickCreateSectionModalOpen] = useState(false);
  const [quickCreateSectionName, setQuickCreateSectionName] = useState('');
  const [quickCreateSectionTargetConvId, setQuickCreateSectionTargetConvId] = useState<string | null>(null);

  useEffect(() => {
    hasHydratedPrefsFromServerRef.current = false;
    setUserPrefs(readStoredUserSidebarPrefs(userSidebarPrefsStorageKey));
  }, [userSidebarPrefsStorageKey]);

  const updateUserPrefsLocalOnly = useCallback(
    (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => {
      setUserPrefs((prev) => {
        const next = updater(prev);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(userSidebarPrefsStorageKey, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    [userSidebarPrefsStorageKey]
  );

  const updateUserSidebarPrefs = useCallback(
    (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => {
      lastLocalPrefsMutationAtRef.current = Date.now();
      setUserPrefs((prev) => {
        const computed = updater(prev);
        const next = sanitizeSidebarPrefsMutation(computed);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(userSidebarPrefsStorageKey, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        apiClient.chat
          .updateUserPrefs(next)
          .then((res) => {
            if (res?.userPrefs && typeof window !== 'undefined') {
              try {
                window.localStorage.setItem(userSidebarPrefsStorageKey, JSON.stringify(res.userPrefs));
              } catch {
                // ignore
              }
            }
          })
          .catch(() => {});
        return next;
      });
    },
    [userSidebarPrefsStorageKey]
  );

  const persistAccessConfig = useCallback(
    async (next: MosChatAccessConfig, showToast = false) => {
      setAccessConfig(next);
      setSavingAccessConfig(true);
      try {
        const res = await apiClient.chat.updateAccessConfig({
          allowAllStaff: next.allowAllStaff,
          allowedGroupKeys: next.allowedGroupKeys,
          allowedStaffIds: next.allowedStaffIds,
          aiCopilotAllowedGroupKeys: next.aiCopilotAllowedGroupKeys,
          aiCopilotAllowedStaffIds: next.aiCopilotAllowedStaffIds,
        });
        if (res?.accessConfig) {
          setAccessConfig(res.accessConfig);
        }
        notifyLivePeers();
        if (showToast) {
          antdMessage.success('Đã lưu cấu hình phân quyền mOS Chat');
        }
      } catch (err: SafeAny) {
        antdMessage.error(err?.response?.data?.message || 'Không thể lưu cấu hình phân quyền mOS Chat');
      } finally {
        setSavingAccessConfig(false);
      }
    },
    [antdMessage, notifyLivePeers, setAccessConfig, setSavingAccessConfig]
  );

  const isConversationVisibleToCurrentUser = useCallback(
    (conv: MosChatConversation): boolean => {
      if (conv.id === AI_COPILOT_CONV_ID) return canUseAiCopilot;
      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      if (myStaffId <= 0) return false;
      const convIdStr = String(conv.id || '');
      if (convIdStr === 'dm-tuyetnhi' || convIdStr === 'dm-hamy') return false;

      if (conv.type === 'dm') {
        if (conv.isSelf || convIdStr.startsWith('dm-self-')) {
          return Number(conv.participantStaffId) === myStaffId || convIdStr === `dm-self-${myStaffId}`;
        }
        if (Array.isArray(conv.memberIds) && conv.memberIds.length > 0) {
          const nums = conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
          return nums.length === 2 && nums.includes(myStaffId);
        }
        const pairMatch = convIdStr.match(/^dm-pair-(\d+)-(\d+)$/);
        if (pairMatch) {
          const a = Number(pairMatch[1]);
          const b = Number(pairMatch[2]);
          return a === myStaffId || b === myStaffId;
        }
        return Number(conv.participantStaffId) === myStaffId;
      }

      if (conv.type === 'space') {
        if (isStrictDannySuperAdmin) return true;
        if (Array.isArray(conv.memberIds) && conv.memberIds.length > 0) {
          const nums = conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
          if (nums.length > 0) {
            return nums.includes(myStaffId);
          }
        }
        return true;
      }

      return true;
    },
    [canUseAiCopilot, currentUserStaffMember.id, currentUser?.id, isStrictDannySuperAdmin]
  );

  const visibleConversations = useMemo(
    () => conversations.filter(isConversationVisibleToCurrentUser),
    [conversations, isConversationVisibleToCurrentUser]
  );

  const getEffectiveUnreadCount = useCallback(
    (conv: MosChatConversation): number => {
      const manualUnread = (userPrefs.manualUnreadIds || []).includes(conv.id);
      if (manualUnread) return Math.max(1, conv.unreadCount || 0);

      if (open && activeConvId === conv.id && activeSubtab === 'chat') {
        return 0;
      }

      if (dockedConvIds.includes(conv.id) && !collapsedDockIds[conv.id]) {
        return 0;
      }

      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      const msgs = conv.messages || [];
      if (msgs.length === 0) return 0;

      const unreadThreadTotal = conv.unreadThreadCount || 0;
      const readCount = userPrefs.readMessageCountByConv?.[conv.id];
      if (typeof readCount === 'number') {
        const unreadMsgs = msgs.slice(readCount).filter((m) => Number(m.senderId) !== myStaffId);
        return unreadMsgs.length + unreadThreadTotal;
      }

      if (conv.type === 'dm') {
        let unread = 0;
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i];
          if (Number(m.senderId) === myStaffId) break;
          unread++;
        }
        return Math.max(conv.unreadCount || 0, unread) + unreadThreadTotal;
      }

      return (conv.unreadCount || 0) + unreadThreadTotal;
    },
    [
      userPrefs.manualUnreadIds,
      userPrefs.readMessageCountByConv,
      open,
      activeConvId,
      activeSubtab,
      dockedConvIds,
      collapsedDockIds,
      currentUserStaffMember.id,
      currentUser?.id,
    ]
  );

  const isConversationHiddenByUser = useCallback(
    (conv: MosChatConversation): boolean => {
      if ((userPrefs.pinnedIds || []).includes(conv.id)) return false;
      if (!(userPrefs.hiddenIds || []).includes(conv.id)) return false;
      const hiddenAtMsgCount = userPrefs.readMessageCountByConv?.[conv.id];
      if (typeof hiddenAtMsgCount === 'number' && conv.messages.length > hiddenAtMsgCount) {
        return false;
      }
      return true;
    },
    [userPrefs.pinnedIds, userPrefs.hiddenIds, userPrefs.readMessageCountByConv]
  );

  const activeConversation = useMemo(() => {
    if (activeConvId === AI_COPILOT_CONV_ID && aiCopilotConversation) {
      return aiCopilotConversation;
    }
    return visibleConversations.find((c) => c.id === activeConvId) || aiCopilotConversation || visibleConversations[0];
  }, [visibleConversations, activeConvId, aiCopilotConversation]);

  const pinnedMessages = useMemo(() => {
    return (activeConversation?.messages || []).filter((m) => m.pinned);
  }, [activeConversation?.messages]);

  const workspaceSharedItemsCount = useMemo(() => {
    return countConversationSharedWorkspaceItems(activeConversation);
  }, [activeConversation]);

  const allUserConversations = useMemo<MosChatConversation[]>(() => {
    return aiCopilotConversation ? [aiCopilotConversation, ...visibleConversations] : [...visibleConversations];
  }, [aiCopilotConversation, visibleConversations]);

  const filteredConversations = useMemo(() => {
    const q = removeVietnameseTones(searchQuery.trim().toLowerCase());
    return allUserConversations.filter((c) => {
      if (!q && isConversationHiddenByUser(c)) return false;
      const effUnread = getEffectiveUnreadCount(c);
      if (sidebarFilter === 'unread' && effUnread <= 0) return false;
      if (sidebarFilter === 'spaces' && c.type !== 'space') return false;
      if (!q) return true;
      const inName = removeVietnameseTones(c.name.toLowerCase()).includes(q);
      const inMsg = c.messages.some((m) => removeVietnameseTones(m.text.toLowerCase()).includes(q));
      return inName || inMsg;
    });
  }, [allUserConversations, isConversationHiddenByUser, getEffectiveUnreadCount, sidebarFilter, searchQuery]);

  const sortConversationsForSection = useCallback(
    (items: MosChatConversation[], sectionId: string): MosChatConversation[] =>
      sortConversationsBySection(items, sectionId, userPrefs.pinnedIds, userPrefs.conversationOrder),
    [userPrefs.pinnedIds, userPrefs.conversationOrder]
  );

  const sidebarSections = useMemo(
    () =>
      computeSidebarSections({
        userPrefs,
        searchQuery,
        sidebarFilter,
        filteredConversations,
        sortConversationsForSection,
        getEffectiveUnreadCount,
        activeConversationId: activeConversation?.id,
      }),
    [
      userPrefs,
      searchQuery,
      sidebarFilter,
      filteredConversations,
      sortConversationsForSection,
      getEffectiveUnreadCount,
      activeConversation?.id,
    ]
  );

  return {
    userSidebarPrefsStorageKey,
    userPrefs,
    setUserPrefs,
    lastLocalPrefsMutationAtRef,
    hasHydratedPrefsFromServerRef,
    draggingSidebarConv,
    setDraggingSidebarConv,
    dragOverSidebarConvId,
    setDragOverSidebarConvId,
    sidebarCustomizeModalOpen,
    setSidebarCustomizeModalOpen,
    sidebarCustomizeTab,
    setSidebarCustomizeTab,
    newSectionNameInput,
    setNewSectionNameInput,
    editingSectionId,
    setEditingSectionId,
    editingSectionName,
    setEditingSectionName,
    openConvMenuId,
    setOpenConvMenuId,
    openSectionMenuId,
    setOpenSectionMenuId,
    quickCreateSectionModalOpen,
    setQuickCreateSectionModalOpen,
    quickCreateSectionName,
    setQuickCreateSectionName,
    quickCreateSectionTargetConvId,
    setQuickCreateSectionTargetConvId,
    updateUserPrefsLocalOnly,
    updateUserSidebarPrefs,
    persistAccessConfig,
    isConversationVisibleToCurrentUser,
    visibleConversations,
    getEffectiveUnreadCount,
    isConversationHiddenByUser,
    activeConversation,
    pinnedMessages,
    workspaceSharedItemsCount,
    allUserConversations,
    filteredConversations,
    sortConversationsForSection,
    sidebarSections,
  };
}
