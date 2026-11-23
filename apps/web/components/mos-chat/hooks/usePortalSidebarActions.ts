'use client';

import React, { useCallback, useRef } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  MosChatChannelNotificationOverride,
  MosChatConversation,
  MosChatCustomSection,
  MosChatNotificationMode,
  MosChatStaffMember,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

export interface UsePortalSidebarActionsParams {
  allUserConversations: MosChatConversation[];
  userPrefs: MosChatUserSidebarPrefs;
  updateUserSidebarPrefs: (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => void;
  getEffectiveUnreadCount: (conv: MosChatConversation) => number;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setEditingSectionId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingSectionName: React.Dispatch<React.SetStateAction<string>>;
  currentUser?: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  notifyLivePeers: () => void;
  antdMessage: MessageInstance;
}

export function usePortalSidebarActions({
  allUserConversations,
  userPrefs,
  updateUserSidebarPrefs,
  getEffectiveUnreadCount,
  setConversations,
  setEditingSectionId,
  setEditingSectionName,
  currentUser,
  currentUserStaffMember,
  notifyLivePeers,
  antdMessage,
}: UsePortalSidebarActionsParams) {
  const isSubmittingSectionRef = useRef(false);

  const togglePinConversation = useCallback(
    (convId: string, explicitPinned?: boolean) => {
      const targetConv = allUserConversations.find((c) => c.id === convId);
      const convLabel = targetConv
        ? targetConv.type === 'space'
          ? `#${targetConv.name}`
          : targetConv.name
        : 'mục này';
      const isCurrentlyPinned = (userPrefs.pinnedIds || []).includes(convId);
      const willPin = typeof explicitPinned === 'boolean' ? explicitPinned : !isCurrentlyPinned;

      updateUserSidebarPrefs((prev) => {
        const nextPinned = willPin
          ? [convId, ...(prev.pinnedIds || []).filter((id) => id !== convId)]
          : (prev.pinnedIds || []).filter((id) => id !== convId);
        const nextHidden = willPin ? (prev.hiddenIds || []).filter((id) => id !== convId) : prev.hiddenIds || [];

        const nextConvOrder: Record<string, string[]> = { ...(prev.conversationOrder || {}) };
        const secKey = targetConv?.type === 'space' ? 'spaces' : 'dm';
        if (willPin) {
          const curArr = nextConvOrder[secKey] || [];
          nextConvOrder[secKey] = [convId, ...curArr.filter((id) => id !== convId)];
          for (const [sKey, arr] of Object.entries(nextConvOrder)) {
            if (sKey !== secKey && Array.isArray(arr) && arr.includes(convId)) {
              nextConvOrder[sKey] = [convId, ...arr.filter((id) => id !== convId)];
            }
          }
        }

        antdMessage.success(
          !willPin
            ? `Đã bỏ ghim ${convLabel} khỏi danh sách cá nhân`
            : `📌 Đã ghim ${convLabel} lên đầu danh sách cá nhân (đã lưu)`
        );
        return {
          ...prev,
          pinnedIds: nextPinned,
          hiddenIds: nextHidden,
          conversationOrder: nextConvOrder,
        };
      });
      notifyLivePeers();
      apiClient.chat.togglePinConversation(convId, willPin).catch(() => {});
    },
    [allUserConversations, userPrefs.pinnedIds, updateUserSidebarPrefs, notifyLivePeers, antdMessage]
  );

  const toggleMuteConversation = useCallback(
    (convId: string) => {
      updateUserSidebarPrefs((prev) => {
        const exists = (prev.mutedIds || []).includes(convId);
        const nextMuted = exists
          ? (prev.mutedIds || []).filter((id) => id !== convId)
          : [...(prev.mutedIds || []), convId];
        antdMessage.success(exists ? 'Đã bật lại thông báo' : 'Đã tắt thông báo cuộc trò chuyện này');
        return { ...prev, mutedIds: nextMuted };
      });
    },
    [antdMessage, updateUserSidebarPrefs]
  );

  const handleChangeGlobalNotificationMode = useCallback(
    (mode: MosChatNotificationMode) => {
      updateUserSidebarPrefs((prev) => {
        const modeLabels: Record<MosChatNotificationMode, string> = {
          ALL: 'Nhận tất cả thông báo',
          MENTIONS_ONLY: 'Chỉ nhận khi được @Mention',
          NOTHING: 'Tắt toàn bộ thông báo',
        };
        antdMessage.success(`🔔 Đã đổi chế độ thông báo: ${modeLabels[mode]}`);
        return { ...prev, notificationMode: mode };
      });
    },
    [updateUserSidebarPrefs, antdMessage]
  );

  const handleChangeChannelNotificationOverride = useCallback(
    (convId: string, mode: MosChatChannelNotificationOverride) => {
      updateUserSidebarPrefs((prev) => {
        const nextOverrides = { ...(prev.channelNotificationOverrides || {}) };
        if (mode === 'INHERIT') {
          delete nextOverrides[convId];
        } else {
          nextOverrides[convId] = mode;
        }
        let nextMuted = [...(prev.mutedIds || [])];
        if (mode === 'MUTED') {
          if (!nextMuted.includes(convId)) nextMuted.push(convId);
        } else {
          nextMuted = nextMuted.filter((id) => id !== convId);
        }
        return {
          ...prev,
          channelNotificationOverrides: nextOverrides,
          mutedIds: nextMuted,
        };
      });
    },
    [updateUserSidebarPrefs]
  );

  const toggleManualUnreadConversation = useCallback(
    (conv: MosChatConversation) => {
      const currentlyUnread = getEffectiveUnreadCount(conv) > 0 || (conv.unreadThreadCount || 0) > 0;
      if (currentlyUnread) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id
              ? {
                  ...c,
                  unreadCount: 0,
                  unreadThreadCount: 0,
                  messages: (c.messages || []).map((m) =>
                    m.thread && m.thread.length > 0 ? { ...m, unreadThreadReplyCount: 0 } : m
                  ),
                }
              : c
          )
        );
        const threadRepliesUpdates: Record<string, number> = {};
        for (const m of conv.messages || []) {
          if (m.thread && m.thread.length > 0) {
            threadRepliesUpdates[m.id] = m.thread.length;
            threadRepliesUpdates[`${conv.id}::${m.id}`] = m.thread.length;
          }
        }
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          manualUnreadIds: (prev.manualUnreadIds || []).filter((id) => id !== conv.id),
          readMessageCountByConv: {
            ...(prev.readMessageCountByConv || {}),
            [conv.id]: conv.messages.length,
          },
          readThreadReplyCountByMsg: {
            ...(prev.readThreadReplyCountByMsg || {}),
            ...threadRepliesUpdates,
          },
        }));
        if (conv.id !== AI_COPILOT_CONV_ID) {
          apiClient.chat.markAsRead(conv.id).catch(() => {});
        }
        antdMessage.success('Đã đánh dấu đã đọc');
      } else {
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: Math.max(1, c.unreadCount || 1) } : c))
        );
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          manualUnreadIds: Array.from(new Set([...(prev.manualUnreadIds || []), conv.id])),
          readMessageCountByConv: {
            ...(prev.readMessageCountByConv || {}),
            [conv.id]: Math.max(0, conv.messages.length - 1),
          },
        }));
        if (conv.id !== AI_COPILOT_CONV_ID) {
          apiClient.chat.markAsUnread(conv.id).catch(() => {});
        }
        antdMessage.success('Đã đánh dấu chưa đọc (Mark as unread)');
      }
    },
    [antdMessage, getEffectiveUnreadCount, setConversations, updateUserSidebarPrefs]
  );

  const toggleHideConversation = useCallback(
    (conv: MosChatConversation) => {
      updateUserSidebarPrefs((prev) => {
        const isHidden = (prev.hiddenIds || []).includes(conv.id);
        const nextHidden = isHidden
          ? (prev.hiddenIds || []).filter((id) => id !== conv.id)
          : Array.from(new Set([...(prev.hiddenIds || []), conv.id]));
        antdMessage.success(
          isHidden
            ? `Đã hiển thị lại "${conv.name}" trên danh sách`
            : `Đã ẩn "${conv.name}" khỏi danh sách (tự hiện lại khi có tin nhắn mới)`
        );
        return {
          ...prev,
          hiddenIds: nextHidden,
          readMessageCountByConv: {
            ...(prev.readMessageCountByConv || {}),
            [conv.id]: conv.messages.length,
          },
        };
      });
    },
    [antdMessage, updateUserSidebarPrefs]
  );

  const moveConversationToSection = useCallback(
    (convId: string, targetSectionId: string) => {
      updateUserSidebarPrefs((prev) => {
        const nextCustom = (prev.customSections || []).map((sec) => {
          const filtered = (sec.conversationIds || []).filter((id) => id !== convId);
          if (sec.id === targetSectionId) {
            return { ...sec, conversationIds: [convId, ...filtered] };
          }
          return { ...sec, conversationIds: filtered };
        });
        return {
          ...prev,
          customSections: nextCustom,
          hiddenIds: (prev.hiddenIds || []).filter((id) => id !== convId),
        };
      });
      antdMessage.success('Đã chuyển cuộc trò chuyện sang mục mới');
    },
    [antdMessage, updateUserSidebarPrefs]
  );

  const moveConversationOrderInSection = useCallback(
    (convId: string, sectionId: string, direction: 'up' | 'down', currentItems: MosChatConversation[]) => {
      const currentIds = currentItems.map((c) => c.id);
      const idx = currentIds.indexOf(convId);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= currentIds.length) return;
      const nextOrder = [...currentIds];
      const temp = nextOrder[idx];
      nextOrder[idx] = nextOrder[swapIdx];
      nextOrder[swapIdx] = temp;
      updateUserSidebarPrefs((prev) => {
        const pinnedSet = new Set(prev.pinnedIds || []);
        const reorderedSectionPinned = nextOrder.filter((id) => pinnedSet.has(id));
        const otherPinned = (prev.pinnedIds || []).filter((id) => !currentIds.includes(id));
        return {
          ...prev,
          pinnedIds: [...reorderedSectionPinned, ...otherPinned],
          conversationOrder: {
            ...(prev.conversationOrder || {}),
            [sectionId]: nextOrder,
          },
        };
      });
    },
    [updateUserSidebarPrefs]
  );

  const reorderConversationByDragDrop = useCallback(
    (sourceConvId: string, targetConvId: string, sectionId: string, currentItems: MosChatConversation[]) => {
      if (!sourceConvId || !targetConvId || sourceConvId === targetConvId) return;
      const currentIds = currentItems.map((c) => c.id);
      const fromIdx = currentIds.indexOf(sourceConvId);
      const toIdx = currentIds.indexOf(targetConvId);
      if (fromIdx === -1 || toIdx === -1) return;
      const nextOrder = [...currentIds];
      nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, sourceConvId);

      updateUserSidebarPrefs((prev) => {
        const pinnedSet = new Set(prev.pinnedIds || []);
        if (!pinnedSet.has(sourceConvId) && pinnedSet.has(targetConvId)) {
          pinnedSet.add(sourceConvId);
          antdMessage.success('📌 Đã ghim và sắp xếp vị trí Space theo ý bạn');
        }
        const reorderedSectionPinned = nextOrder.filter((id) => pinnedSet.has(id));
        const otherPinned = (prev.pinnedIds || []).filter((id) => !currentIds.includes(id));
        return {
          ...prev,
          pinnedIds: [...reorderedSectionPinned, ...otherPinned],
          conversationOrder: {
            ...(prev.conversationOrder || {}),
            [sectionId]: nextOrder,
          },
        };
      });
    },
    [antdMessage, updateUserSidebarPrefs]
  );

  const toggleCollapseSection = useCallback(
    (sectionId: string) => {
      updateUserSidebarPrefs((prev) => ({
        ...prev,
        collapsedSections: {
          ...(prev.collapsedSections || {}),
          [sectionId]: !prev.collapsedSections?.[sectionId],
        },
      }));
    },
    [updateUserSidebarPrefs]
  );

  const toggleUnreadOnlySection = useCallback(
    (sectionId: string) => {
      updateUserSidebarPrefs((prev) => {
        const nextVal = !prev.unreadOnlySections?.[sectionId];
        antdMessage.info(
          nextVal ? 'Chỉ hiển thị cuộc trò chuyện chưa đọc trong mục này' : 'Hiển thị tất cả trong mục này'
        );
        return {
          ...prev,
          unreadOnlySections: {
            ...(prev.unreadOnlySections || {}),
            [sectionId]: nextVal,
          },
        };
      });
    },
    [antdMessage, updateUserSidebarPrefs]
  );

  const handleCreateCustomSection = useCallback(
    (rawName: string, targetConvId?: string | null) => {
      const clean = rawName.trim();
      if (!clean) {
        antdMessage.warning('Vui lòng nhập tên mục tuỳ chỉnh');
        return;
      }
      if (isSubmittingSectionRef.current) return;
      isSubmittingSectionRef.current = true;
      setTimeout(() => {
        isSubmittingSectionRef.current = false;
      }, 500);

      let created = false;
      updateUserSidebarPrefs((prev) => {
        const existing = (prev.customSections || []).find((s) => s.name.trim().toLowerCase() === clean.toLowerCase());
        if (existing) {
          antdMessage.warning(`Mục "${clean}" đã tồn tại!`);
          return prev;
        }
        created = true;
        const newSecId = `sec-custom-${Date.now()}`;
        const cleanedCustom = (prev.customSections || []).map((s) =>
          targetConvId ? { ...s, conversationIds: (s.conversationIds || []).filter((id) => id !== targetConvId) } : s
        );
        const newSec: MosChatCustomSection = {
          id: newSecId,
          name: clean,
          conversationIds: targetConvId ? [targetConvId] : [],
          collapsed: false,
          unreadOnly: false,
        };
        return {
          ...prev,
          customSections: [newSec, ...cleanedCustom],
          sectionOrder: [newSecId, ...(prev.sectionOrder || ['dm', 'spaces'])],
        };
      });
      if (created) {
        antdMessage.success(`Đã tạo mục "${clean}"`);
      }
    },
    [antdMessage, updateUserSidebarPrefs]
  );

  const handleRenameCustomSection = useCallback(
    (sectionId: string, rawName: string) => {
      const clean = rawName.trim();
      if (!clean) return;
      updateUserSidebarPrefs((prev) => ({
        ...prev,
        customSections: (prev.customSections || []).map((s) => (s.id === sectionId ? { ...s, name: clean } : s)),
      }));
      setEditingSectionId(null);
      setEditingSectionName('');
      antdMessage.success('Đã đổi tên mục tuỳ chỉnh');
    },
    [antdMessage, setEditingSectionId, setEditingSectionName, updateUserSidebarPrefs]
  );

  const handleDeleteCustomSection = useCallback(
    (sectionId: string) => {
      updateUserSidebarPrefs((prev) => ({
        ...prev,
        customSections: (prev.customSections || []).filter((s) => s.id !== sectionId),
        sectionOrder: (prev.sectionOrder || []).filter((id) => id !== sectionId),
      }));
      antdMessage.success('Đã xoá mục tuỳ chỉnh (các cuộc trò chuyện đã trở về mục mặc định)');
    },
    [antdMessage, updateUserSidebarPrefs]
  );

  const handleMoveSectionOrder = useCallback(
    (sectionId: string, direction: 'up' | 'down') => {
      updateUserSidebarPrefs((prev) => {
        const customIds = (prev.customSections || []).map((s) => s.id);
        const order = Array.from(new Set([...(prev.sectionOrder || []), ...customIds, 'dm', 'spaces'])).filter(
          (id) => id === 'dm' || id === 'spaces' || customIds.includes(id)
        );
        const idx = order.indexOf(sectionId);
        if (idx === -1) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= order.length) return prev;
        const nextOrder = [...order];
        const tmp = nextOrder[idx];
        nextOrder[idx] = nextOrder[swapIdx];
        nextOrder[swapIdx] = tmp;
        return {
          ...prev,
          sectionOrder: nextOrder,
        };
      });
    },
    [updateUserSidebarPrefs]
  );

  const handleResetSidebarPrefs = useCallback(() => {
    updateUserSidebarPrefs(() => ({
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      readMessageCountByConv: {},
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    }));
    antdMessage.success('Đã khôi phục bố cục danh sách về mặc định');
  }, [antdMessage, updateUserSidebarPrefs]);

  const handleLeaveOrJoinSpace = useCallback(
    async (conv: MosChatConversation) => {
      if (conv.type !== 'space') return;
      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      if (myStaffId <= 0) return;
      const isMember = (conv.memberIds || []).map(Number).includes(myStaffId);
      try {
        if (isMember) {
          const res = await apiClient.chat.removeMember(conv.id, myStaffId);
          if (res?.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === conv.id ? res.conversation : c)));
          }
          toggleHideConversation(conv);
          notifyLivePeers();
          antdMessage.success(`Đã rời khỏi #${conv.name}`);
        } else {
          const res = await apiClient.chat.addMember(conv.id, myStaffId);
          if (res?.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === conv.id ? res.conversation : c)));
          }
          updateUserSidebarPrefs((prev) => ({
            ...prev,
            hiddenIds: (prev.hiddenIds || []).filter((id) => id !== conv.id),
          }));
          notifyLivePeers();
          antdMessage.success(`Đã tham gia #${conv.name}`);
        }
      } catch {
        antdMessage.error('Không thể cập nhật trạng thái thành viên Space');
      }
    },
    [
      antdMessage,
      currentUserStaffMember.id,
      currentUser?.id,
      setConversations,
      toggleHideConversation,
      updateUserSidebarPrefs,
      notifyLivePeers,
    ]
  );

  return {
    togglePinConversation,
    toggleMuteConversation,
    handleChangeGlobalNotificationMode,
    handleChangeChannelNotificationOverride,
    toggleManualUnreadConversation,
    toggleHideConversation,
    moveConversationToSection,
    moveConversationOrderInSection,
    reorderConversationByDragDrop,
    toggleCollapseSection,
    toggleUnreadOnlySection,
    handleCreateCustomSection,
    handleRenameCustomSection,
    handleDeleteCustomSection,
    handleMoveSectionOrder,
    handleResetSidebarPrefs,
    handleLeaveOrJoinSpace,
  };
}
