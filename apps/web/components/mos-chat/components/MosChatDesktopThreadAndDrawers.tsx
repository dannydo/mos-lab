'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { GlobalToken } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { MosChatStaffMember, MosChatTaskItem, SafeAny } from '@mos-lab/shared';
import { handleSmartListEnterKey } from '../MosChatRichEditorModal';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import type { usePortalAiAndAccessControl } from '../hooks/usePortalAiAndAccessControl';
import type { usePortalAttachmentsAndPaste } from '../hooks/usePortalAttachmentsAndPaste';
import type { usePortalAvatarAndPresence } from '../hooks/usePortalAvatarAndPresence';
import type { usePortalComposerRefs } from '../hooks/usePortalComposerRefs';
import type { usePortalLayoutAndResize } from '../hooks/usePortalLayoutAndResize';
import type { usePortalMentionAutocomplete } from '../hooks/usePortalMentionAutocomplete';
import type { usePortalMessageMutations } from '../hooks/usePortalMessageMutations';
import type { usePortalMessageSending } from '../hooks/usePortalMessageSending';
import type { usePortalMissionActions } from '../hooks/usePortalMissionActions';
import type { usePortalNavigationAndShortcuts } from '../hooks/usePortalNavigationAndShortcuts';
import type { usePortalSidebarPrefs } from '../hooks/usePortalSidebarPrefs';
import type { usePortalSpacesAndDockActions } from '../hooks/usePortalSpacesAndDockActions';
import type { usePortalTaskActions } from '../hooks/usePortalTaskActions';
import type { usePortalTaskModals } from '../hooks/usePortalTaskModals';
import type { usePortalUiAdapters } from '../hooks/usePortalUiAdapters';
import { MosChatThreadDrawer } from './MosChatThreadDrawer';

const MosChatGoogleWorkspaceDrawer = dynamic(
  () => import('./MosChatGoogleWorkspaceDrawer').then((m) => m.MosChatGoogleWorkspaceDrawer),
  { ssr: false }
);

export interface MosChatDesktopThreadAndWorkspaceProps {
  open: boolean;
  standalone: boolean;
  isDark: boolean;
  token: GlobalToken;
  antdMessage: MessageInstance;
  surfaceBg: string;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  currentUser?: SafeAny;
  staffDirectory: MosChatStaffMember[];
  uniqueTasks: MosChatTaskItem[];
  setSaveThreadWorkflowModalOpen: (open: boolean) => void;
  setTriggerWorkflowModalOpen: (open: boolean) => void;
  setInitialWorkflowCode: (code: string) => void;
  layout: ReturnType<typeof usePortalLayoutAndResize>;
  composerRefs: ReturnType<typeof usePortalComposerRefs>;
  aiAccess: ReturnType<typeof usePortalAiAndAccessControl>;
  avatarPresence: ReturnType<typeof usePortalAvatarAndPresence>;
  sidebarPrefs: ReturnType<typeof usePortalSidebarPrefs>;
  attachments: ReturnType<typeof usePortalAttachmentsAndPaste>;
  navActions: ReturnType<typeof usePortalNavigationAndShortcuts>;
  msgMutations: ReturnType<typeof usePortalMessageMutations>;
  mentions: ReturnType<typeof usePortalMentionAutocomplete>;
  spacesDock: ReturnType<typeof usePortalSpacesAndDockActions>;
  msgSending: ReturnType<typeof usePortalMessageSending>;
  taskModals: ReturnType<typeof usePortalTaskModals>;
  taskActions: ReturnType<typeof usePortalTaskActions>;
  missionActions: ReturnType<typeof usePortalMissionActions>;
  uiAdapters: ReturnType<typeof usePortalUiAdapters>;
}

export const MosChatDesktopThreadAndWorkspace: React.FC<MosChatDesktopThreadAndWorkspaceProps> = ({
  open,
  standalone,
  isDark,
  token,
  antdMessage,
  surfaceBg,
  surfaceRaised,
  canvasBg,
  borderColor,
  borderStrong,
  accentColor,
  accentSoftBg,
  accentBorder,
  currentUser,
  staffDirectory,
  uniqueTasks,
  setSaveThreadWorkflowModalOpen,
  setTriggerWorkflowModalOpen,
  setInitialWorkflowCode,
  layout,
  composerRefs,
  aiAccess,
  avatarPresence,
  sidebarPrefs,
  attachments,
  navActions,
  msgMutations,
  mentions,
  spacesDock,
  msgSending,
  taskModals,
  taskActions,
  missionActions,
  uiAdapters,
}) => (
  <>
    <MosChatThreadDrawer
      threadOpen={composerRefs.threadOpen}
      activeThreadMessage={spacesDock.activeThreadMessage}
      activeConversation={sidebarPrefs.activeConversation}
      currentUser={currentUser}
      isMobile={layout.isMobile}
      mobileActiveView={layout.mobileActiveView}
      setMobileActiveView={layout.setMobileActiveView}
      threadWidth={layout.threadWidth}
      setThreadWidth={layout.setThreadWidth}
      persistPersonalLayout={layout.persistPersonalLayout}
      isResizingTarget={layout.isResizingTarget}
      setIsResizingTarget={layout.setIsResizingTarget}
      hoverResizeHandle={layout.hoverResizeHandle}
      setHoverResizeHandle={layout.setHoverResizeHandle}
      surfaceBg={surfaceBg}
      surfaceRaised={surfaceRaised}
      canvasBg={canvasBg}
      borderColor={borderColor}
      borderStrong={borderStrong}
      accentColor={accentColor}
      accentSoftBg={accentSoftBg}
      accentBorder={accentBorder}
      isDark={isDark}
      token={token}
      draggingRootMsgId={msgMutations.draggingRootMsgId}
      setDraggingRootMsgId={msgMutations.setDraggingRootMsgId}
      dragOverTargetMsgId={msgMutations.dragOverTargetMsgId}
      setDragOverTargetMsgId={msgMutations.setDragOverTargetMsgId}
      dragOverThreadPane={msgMutations.dragOverThreadPane}
      setDragOverThreadPane={msgMutations.setDragOverThreadPane}
      isDraggingOverThread={attachments.isDraggingOverThread}
      setIsDraggingOverThread={attachments.setIsDraggingOverThread}
      isDraggingOver={attachments.isDraggingOver}
      setIsDraggingOver={attachments.setIsDraggingOver}
      handleMoveThreadItem={msgMutations.handleMoveThreadItem}
      handleProcessImageFiles={attachments.handleProcessImageFiles}
      handleClipboardPaste={attachments.handleClipboardPaste}
      formatMoveTargetSnippet={msgMutations.formatMoveTargetSnippet}
      setThreadOpen={composerRefs.setThreadOpen}
      navigateToMessage={navActions.navigateToMessage}
      highlightedMsgId={navActions.highlightedMsgId}
      renderUserAvatarNode={avatarPresence.renderUserAvatarNode}
      renderRichTextMessage={mentions.renderRichTextMessage}
      speakingMsgId={aiAccess.speakingMsgId}
      ttsSpeed={aiAccess.ttsSpeed}
      handleSpeakAiMessage={aiAccess.handleSpeakAiMessage}
      handleSetTtsSpeed={aiAccess.handleSetTtsSpeed}
      threadMessagesContainerRef={composerRefs.threadMessagesContainerRef}
      threadMessagesEndRef={composerRefs.threadMessagesEndRef}
      isMessageFromCurrentUser={avatarPresence.isMessageFromCurrentUser}
      canManageChatThreads={aiAccess.canManageChatThreads}
      AI_COPILOT_CONV_ID={AI_COPILOT_CONV_ID}
      getMemberNickname={spacesDock.getMemberNickname}
      renderReadStatusCheckmark={uiAdapters.renderReadStatusCheckmark}
      renderMiniSeenAvatarStack={uiAdapters.renderMiniSeenAvatarStack}
      editingReplyId={msgMutations.editingReplyId}
      editingText={msgMutations.editingText}
      setEditingText={msgMutations.setEditingText}
      handleCancelEdit={msgMutations.handleCancelEdit}
      handleSaveEdit={msgMutations.handleSaveEdit}
      isSavingEdit={msgMutations.isSavingEdit}
      isComposingRef={composerRefs.isComposingRef}
      lastCompositionEndMsRef={composerRefs.lastCompositionEndMsRef}
      handleRestoreMessage={msgMutations.handleRestoreMessage}
      isDannyAccount={aiAccess.isDannyAccount}
      hasUserReacted={msgMutations.hasUserReacted}
      handleToggleReaction={msgMutations.handleToggleReaction}
      handleOpenReactionUsers={msgMutations.handleOpenReactionUsers}
      staffDirectory={staffDirectory}
      openStickerPopoverKey={msgSending.openStickerPopoverKey}
      setOpenStickerPopoverKey={msgSending.setOpenStickerPopoverKey}
      renderReactionPickerContent={uiAdapters.renderReactionPickerContent}
      handleBuzzMessage={msgMutations.handleBuzzMessage}
      handleStartEdit={msgMutations.handleStartEdit}
      handleDeleteMessage={msgMutations.handleDeleteMessage}
      threadInputRef={composerRefs.threadInputRef}
      threadInput={composerRefs.threadTextRef.current}
      setThreadInput={composerRefs.setThreadInput}
      threadTextRef={composerRefs.threadTextRef}
      threadHasText={composerRefs.threadHasText}
      updateThreadInput={composerRefs.updateThreadInput}
      threadHasTextListenerRef={composerRefs.threadHasTextListenerRef}
      mentionRenderKey={
        mentions.mentionState.open && mentions.mentionState.scope === 'thread'
          ? `${mentions.mentionState.query}:${mentions.mentionState.highlightedIndex}`
          : ''
      }
      handleSendThreadReply={msgSending.handleSendThreadReply}
      threadAttachments={attachments.threadAttachments}
      setThreadAttachments={attachments.setThreadAttachments}
      triggerFilePicker={attachments.triggerFilePicker}
      setRichEditorModalState={mentions.setRichEditorModalState}
      renderComposerEmojiPickerContent={uiAdapters.renderComposerEmojiPickerContent}
      antdMessage={antdMessage}
      getThreadReplyReadBreakdown={uiAdapters.getThreadReplyReadBreakdown}
      stoppedReadersByReplyId={uiAdapters.stoppedReadersByReplyId}
      aiThinkingActive={aiAccess.aiThinkingActive}
      aiElapsedSec={aiAccess.aiElapsedSec}
      renderStagedAttachmentsStrip={uiAdapters.renderStagedAttachmentsStrip}
      renderMentionAutocompleteDropdown={mentions.renderMentionAutocompleteDropdown}
      renderAppleNotesFormatToolbar={mentions.renderAppleNotesFormatToolbar}
      checkForMentionTrigger={mentions.checkForMentionTrigger}
      handleMentionKeyDown={mentions.handleMentionKeyDown}
      handleApplyFormat={mentions.handleApplyFormat}
      handleSmartListEnterKey={handleSmartListEnterKey}
      setThreadCursorPos={composerRefs.setThreadCursorPos}
      canUseAiCopilot={aiAccess.canUseAiCopilot}
      isStrictDannySuperAdmin={aiAccess.isStrictDannySuperAdmin}
      openMissionModalFromChat={missionActions.openMissionModalFromChat}
      uniqueTasks={uniqueTasks}
      setSaveThreadWorkflowModalOpen={setSaveThreadWorkflowModalOpen}
      renderMessageAttachments={uiAdapters.renderMessageAttachments}
      renderLiveMissionCard={uiAdapters.renderLiveMissionCard}
      setHistoryModalMessage={msgMutations.setHistoryModalMessage}
      setHistoryModalOpen={msgMutations.setHistoryModalOpen}
      movingThreadItemKey={msgMutations.movingThreadItemKey}
      openMovePopoverKey={msgMutations.openMovePopoverKey}
      setOpenMovePopoverKey={msgMutations.setOpenMovePopoverKey}
      handleUpdateTask={taskActions.handleUpdateTask}
      renderTaskCard={uiAdapters.renderTaskCard}
      openCustomerDetail={msgSending.openCustomerDetail}
      setDriveLinkModalOpen={attachments.setDriveLinkModalOpen}
      uploadTargetRef={attachments.uploadTargetRef}
      handleOpenCustomerPicker={msgSending.handleOpenCustomerPicker}
      stagedCustomerCard={msgSending.threadStagedCustomerCard}
      setStagedCustomerCard={msgSending.setThreadStagedCustomerCard}
      openTaskModalFromMessage={taskModals.openTaskModalFromMessage}
      isUrgentSendThread={msgSending.isUrgentSendThread}
      setIsUrgentSendThread={msgSending.setIsUrgentSendThread}
      setTriggerWorkflowModalOpen={setTriggerWorkflowModalOpen}
      setInitialWorkflowCode={setInitialWorkflowCode}
      handleOpenForwardModal={navActions.handleOpenForwardModal}
      accessibleConversationIds={navActions.accessibleConversationIds}
      onJumpToForwardedSource={navActions.handleJumpToForwardedSource}
    />

    <MosChatGoogleWorkspaceDrawer
      isMobile={layout.isMobile}
      isDark={isDark}
      activeConversationId={sidebarPrefs.activeConversation?.id}
      portalOpen={Boolean(standalone || open)}
      surfaceBg={surfaceBg}
      surfaceRaised={surfaceRaised}
      canvasBg={canvasBg}
      borderColor={borderColor}
      onEnsureContainerWidth={(desiredDrawerWidth) => {
        if (standalone || layout.maximizedRef.current || layout.isMobile || typeof window === 'undefined') return;
        const maxPortal = Math.max(520, window.innerWidth - 56);
        const needed = Math.min(maxPortal, Math.round(desiredDrawerWidth + layout.sidebarWidthRef.current + 320));
        if (needed > layout.panelWidthRef.current) {
          layout.panelWidthRef.current = needed;
          layout.setPanelWidth(needed);
          layout.persistPersonalLayout({ panelWidth: needed });
        }
      }}
      onPostAiReplyToChat={(replyText, docTitle) => {
        if (sidebarPrefs.activeConversation?.id) {
          void msgSending.handleSendMessage(
            sidebarPrefs.activeConversation.id,
            `✨ **Phân tích AI (${docTitle}):**\n\n${replyText}`
          );
        }
      }}
    />
  </>
);
