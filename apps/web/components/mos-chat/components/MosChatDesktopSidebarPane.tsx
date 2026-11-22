'use client';

import React from 'react';
import type { GlobalToken } from 'antd';
import type { MosChatTaskItem, SafeAny } from '@mos-lab/shared';
import type { usePortalAiAndAccessControl } from '../hooks/usePortalAiAndAccessControl';
import type { usePortalAvatarAndPresence } from '../hooks/usePortalAvatarAndPresence';
import type { usePortalDockState } from '../hooks/usePortalDockState';
import type { usePortalLayoutAndResize } from '../hooks/usePortalLayoutAndResize';
import type { usePortalReadSync } from '../hooks/usePortalReadSync';
import type { usePortalSidebarActions } from '../hooks/usePortalSidebarActions';
import type { usePortalSidebarPrefs } from '../hooks/usePortalSidebarPrefs';
import type { usePortalSpacesAndDockActions } from '../hooks/usePortalSpacesAndDockActions';
import type { usePortalUiAdapters } from '../hooks/usePortalUiAdapters';
import { formatChatPreviewWithStickers } from '../mos-chat-stickers';
import { MosChatSidebar } from './MosChatSidebar';

export interface MosChatDesktopSidebarPaneProps {
  isDark: boolean;
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  accentColor: string;
  currentUser?: SafeAny;
  uniqueTasks: MosChatTaskItem[];
  onClose: () => void;
  layout: ReturnType<typeof usePortalLayoutAndResize>;
  dock: ReturnType<typeof usePortalDockState>;
  aiAccess: ReturnType<typeof usePortalAiAndAccessControl>;
  avatarPresence: ReturnType<typeof usePortalAvatarAndPresence>;
  sidebarPrefs: ReturnType<typeof usePortalSidebarPrefs>;
  sidebarActions: ReturnType<typeof usePortalSidebarActions>;
  readSync: ReturnType<typeof usePortalReadSync>;
  spacesDock: ReturnType<typeof usePortalSpacesAndDockActions>;
  uiAdapters: ReturnType<typeof usePortalUiAdapters>;
}

export const MosChatDesktopSidebarPane: React.FC<MosChatDesktopSidebarPaneProps> = ({
  isDark,
  token,
  surfaceBg,
  surfaceRaised,
  borderColor,
  accentColor,
  currentUser,
  uniqueTasks,
  onClose,
  layout,
  dock,
  aiAccess,
  avatarPresence,
  sidebarPrefs,
  sidebarActions,
  readSync,
  spacesDock,
  uiAdapters,
}) => (
  <MosChatSidebar
    isMobile={layout.isMobile}
    mobileActiveView={layout.mobileActiveView}
    setMobileActiveView={layout.setMobileActiveView}
    sidebarWidth={layout.sidebarWidth}
    setSidebarWidth={layout.setSidebarWidth}
    isResizingTarget={layout.isResizingTarget}
    setIsResizingTarget={layout.setIsResizingTarget}
    hoverResizeHandle={layout.hoverResizeHandle}
    setHoverResizeHandle={layout.setHoverResizeHandle}
    sidebarWidthRef={layout.sidebarWidthRef}
    persistPersonalLayout={layout.persistPersonalLayout}
    presence={layout.presence}
    setPresence={layout.setPresence}
    currentUser={currentUser}
    isDannyAccount={aiAccess.isDannyAccount}
    accessConfig={aiAccess.accessConfig}
    userPrefs={sidebarPrefs.userPrefs}
    onOpenAccessConfigModal={() => {
      aiAccess.setAccessConfigTab('chat');
      aiAccess.setAccessConfigModalOpen(true);
    }}
    onOpenSidebarCustomizeModal={(tab) => {
      sidebarPrefs.setSidebarCustomizeTab(tab);
      sidebarPrefs.setSidebarCustomizeModalOpen(true);
    }}
    onOpenNewRoomModal={(type) => {
      if (type) spacesDock.setNewRoomType(type);
      spacesDock.setNewRoomModalOpen(true);
    }}
    onClose={onClose}
    searchQuery={layout.searchQuery}
    setSearchQuery={layout.setSearchQuery}
    sidebarFilter={layout.sidebarFilter}
    setSidebarFilter={layout.setSidebarFilter}
    activeSubtab={layout.activeSubtab}
    setActiveSubtab={layout.setActiveSubtab}
    sidebarSections={sidebarPrefs.sidebarSections}
    visibleConversations={sidebarPrefs.visibleConversations}
    activeConversation={sidebarPrefs.activeConversation}
    uniqueTasks={uniqueTasks}
    selectConversation={readSync.selectConversation}
    togglePinConversation={sidebarActions.togglePinConversation}
    toggleManualUnreadConversation={sidebarActions.toggleManualUnreadConversation}
    toggleMuteConversation={sidebarActions.toggleMuteConversation}
    onChangeChannelNotificationOverride={sidebarActions.handleChangeChannelNotificationOverride}
    moveConversationToSection={sidebarActions.moveConversationToSection}
    moveConversationOrderInSection={sidebarActions.moveConversationOrderInSection}
    reorderConversationByDragDrop={sidebarActions.reorderConversationByDragDrop}
    toggleCollapseSection={sidebarActions.toggleCollapseSection}
    toggleUnreadOnlySection={sidebarActions.toggleUnreadOnlySection}
    handleMoveSectionOrder={sidebarActions.handleMoveSectionOrder}
    handleDeleteCustomSection={sidebarActions.handleDeleteCustomSection}
    handleLeaveOrJoinSpace={sidebarActions.handleLeaveOrJoinSpace}
    getEffectiveUnreadCount={sidebarPrefs.getEffectiveUnreadCount}
    formatChatPreviewWithStickers={formatChatPreviewWithStickers}
    isConversationParticipantOnline={avatarPresence.isConversationParticipantOnline}
    isMessageFromCurrentUser={avatarPresence.isMessageFromCurrentUser}
    getMessageReadBreakdown={uiAdapters.getMessageReadBreakdown}
    renderReadStatusCheckmark={uiAdapters.renderReadStatusCheckmark}
    renderUserAvatarNode={avatarPresence.renderUserAvatarNode}
    setDockedConvIds={dock.setDockedConvIds}
    toggleHideConversation={sidebarActions.toggleHideConversation}
    setActiveConvId={layout.setActiveConvId}
    setSpaceConfigModalOpen={spacesDock.setSpaceConfigModalOpen}
    setEditingSectionId={sidebarPrefs.setEditingSectionId}
    setEditingSectionName={sidebarPrefs.setEditingSectionName}
    setQuickCreateSectionTargetConvId={sidebarPrefs.setQuickCreateSectionTargetConvId}
    setQuickCreateSectionName={sidebarPrefs.setQuickCreateSectionName}
    setQuickCreateSectionModalOpen={sidebarPrefs.setQuickCreateSectionModalOpen}
    isDark={isDark}
    token={token}
    surfaceBg={surfaceBg}
    surfaceRaised={surfaceRaised}
    borderColor={borderColor}
    accentColor={accentColor}
  />
);
