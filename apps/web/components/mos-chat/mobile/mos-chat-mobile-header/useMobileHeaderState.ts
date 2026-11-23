'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useMosChat } from '../../context/MosChatContext';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import { countConversationSharedWorkspaceItems } from '../../components/MosChatFilesPane';
import { getPresenceDotClass } from './mobileHeaderTypes';

/**
 * Encapsulates theme, chat context bindings, derived room/task counts, and menu state for MosChatMobileHeader.
 */
export function useMobileHeaderState() {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const {
    currentUser,
    mobileView,
    setMobileView,
    activeConversation,
    presence,
    setPresence,
    activeSubtab,
    setActiveSubtab,
    sidebarFilter,
    setSidebarFilter,
    tasks,
    pinnedMessages,
    totalUnreadCount,
    staffDirectory,
    activeThreadMsg,
    resetAiChat,
    pinnedConvIds,
    togglePinConversation,
  } = useMosChat();

  const linkedTask = useMemo(() => {
    if (!activeThreadMsg) return null;
    return (
      (tasks || []).find(
        (t) => t.sourceMessageId === activeThreadMsg.id || (activeThreadMsg.taskId && t.id === activeThreadMsg.taskId)
      ) || null
    );
  }, [tasks, activeThreadMsg]);

  const openTaskCount = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);
  const pinnedConvCount = pinnedConvIds?.size || 0;
  const filesCount = useMemo(() => countConversationSharedWorkspaceItems(activeConversation), [activeConversation]);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [inboxMenuOpen, setInboxMenuOpen] = useState(false);
  const [resetAiConfirmOpen, setResetAiConfirmOpen] = useState(false);

  useEffect(() => {
    setMoreMenuOpen(false);
    setInboxMenuOpen(false);
    setResetAiConfirmOpen(false);
  }, [mobileView]);

  const presenceDotClass = getPresenceDotClass(presence);
  const isAiCopilot = activeConversation?.id === AI_COPILOT_CONV_ID;
  const isSpace = activeConversation?.type === 'space';
  const isTasksSubtab = activeSubtab === 'tasks';
  const roomTitle = isTasksSubtab ? 'Kho Công việc' : activeConversation?.name || 'Phòng trò chuyện';
  const roomSubtitle = isTasksSubtab
    ? activeConversation?.name || 'Nhắc hẹn & Công việc'
    : activeConversation?.subtitle ||
      (isSpace ? `${activeConversation?.memberCount || 12} thành viên` : 'Cuộc trò chuyện trực tiếp');
  const isRoomPinned = Boolean(activeConversation && pinnedConvIds?.has(activeConversation.id));

  return {
    isDark,
    currentUser,
    mobileView,
    setMobileView,
    activeConversation,
    presence,
    setPresence,
    activeSubtab,
    setActiveSubtab,
    sidebarFilter,
    setSidebarFilter,
    pinnedMessages,
    totalUnreadCount,
    staffDirectory,
    resetAiChat,
    togglePinConversation,
    linkedTask,
    openTaskCount,
    pinnedConvCount,
    filesCount,
    moreMenuOpen,
    setMoreMenuOpen,
    inboxMenuOpen,
    setInboxMenuOpen,
    resetAiConfirmOpen,
    setResetAiConfirmOpen,
    presenceDotClass,
    isAiCopilot,
    isSpace,
    isTasksSubtab,
    roomTitle,
    roomSubtitle,
    isRoomPinned,
  };
}
