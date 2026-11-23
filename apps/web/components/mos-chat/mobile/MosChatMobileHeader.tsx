'use client';

import React from 'react';
import type { MosChatMobileHeaderProps } from './mos-chat-mobile-header/mobileHeaderTypes';
import { useMobileHeaderState } from './mos-chat-mobile-header/useMobileHeaderState';
import { MobileHeaderInboxBar } from './mos-chat-mobile-header/MobileHeaderInboxBar';
import { MobileHeaderThreadBar } from './mos-chat-mobile-header/MobileHeaderThreadBar';
import { MobileHeaderRoomBar } from './mos-chat-mobile-header/MobileHeaderRoomBar';

export type { MosChatMobileHeaderProps } from './mos-chat-mobile-header/mobileHeaderTypes';

export const MosChatMobileHeader: React.FC<MosChatMobileHeaderProps> = ({
  onOpenSettings,
  onCallRoom,
  onOpenTaskModal,
  onOpenMembersModal,
  onOpenSearch,
  onOpenPushSettings,
  onOpenThemeSheet,
  onOpenNewDm,
  isPushSubscribed = false,
  onClose,
}) => {
  const state = useMobileHeaderState();

  // View: INBOX — Apple Messages style single ~44px header
  if (state.mobileView === 'inbox') {
    return (
      <MobileHeaderInboxBar
        isDark={state.isDark}
        currentUser={state.currentUser}
        totalUnreadCount={state.totalUnreadCount}
        inboxMenuOpen={state.inboxMenuOpen}
        presence={state.presence}
        presenceDotClass={state.presenceDotClass}
        openTaskCount={state.openTaskCount}
        pinnedConvCount={state.pinnedConvCount}
        sidebarFilter={state.sidebarFilter}
        isPushSubscribed={isPushSubscribed}
        onToggleInboxMenu={() => state.setInboxMenuOpen((prev) => !prev)}
        onCloseInboxMenu={() => state.setInboxMenuOpen(false)}
        onSelectPresence={state.setPresence}
        onOpenTasks={() => {
          state.setActiveSubtab('tasks');
          state.setMobileView('room');
        }}
        onTogglePinnedFilter={() => state.setSidebarFilter?.(state.sidebarFilter === 'pinned' ? 'all' : 'pinned')}
        onOpenSearch={onOpenSearch}
        onOpenThemeSheet={onOpenThemeSheet}
        onOpenPushSettings={onOpenPushSettings}
        onOpenNewDm={onOpenNewDm}
        onClose={onClose}
      />
    );
  }

  // View: THREAD
  if (state.mobileView === 'thread') {
    return (
      <MobileHeaderThreadBar
        isDark={state.isDark}
        linkedTask={state.linkedTask}
        onBackToRoom={() => state.setMobileView('room')}
        onOpenTaskModal={onOpenTaskModal}
      />
    );
  }

  // View: ROOM (Active Conversation or Tasks Subtab)
  return (
    <MobileHeaderRoomBar
      isDark={state.isDark}
      totalUnreadCount={state.totalUnreadCount}
      activeSubtab={state.activeSubtab}
      activeConversation={state.activeConversation}
      staffDirectory={state.staffDirectory}
      isAiCopilot={state.isAiCopilot}
      isSpace={state.isSpace}
      isTasksSubtab={state.isTasksSubtab}
      isRoomPinned={state.isRoomPinned}
      roomTitle={state.roomTitle}
      roomSubtitle={state.roomSubtitle}
      openTaskCount={state.openTaskCount}
      pinnedCount={state.pinnedMessages.length}
      filesCount={state.filesCount}
      isPushSubscribed={isPushSubscribed}
      moreMenuOpen={state.moreMenuOpen}
      resetAiConfirmOpen={state.resetAiConfirmOpen}
      onBackToInbox={() => {
        state.setMoreMenuOpen(false);
        state.setActiveSubtab('chat');
        state.setMobileView('inbox');
      }}
      onToggleMoreMenu={() => state.setMoreMenuOpen((prev) => !prev)}
      onCloseMoreMenu={() => state.setMoreMenuOpen(false)}
      onSetActiveSubtab={state.setActiveSubtab}
      onTogglePinConversation={state.togglePinConversation}
      onOpenResetAiConfirm={() => state.setResetAiConfirmOpen(true)}
      onCloseResetAiConfirm={() => state.setResetAiConfirmOpen(false)}
      onConfirmResetAiChat={state.resetAiChat}
      onCallRoom={onCallRoom}
      onOpenSettings={onOpenSettings}
      onOpenMembersModal={onOpenMembersModal}
      onOpenSearch={onOpenSearch}
      onOpenThemeSheet={onOpenThemeSheet}
      onOpenPushSettings={onOpenPushSettings}
      onClose={onClose}
    />
  );
};
