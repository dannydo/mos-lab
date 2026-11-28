'use client';

import React from 'react';
import type { GlobalToken } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  MosChatConversation,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatWorkflowInstance,
  SafeAny,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import type { usePortalAiAndAccessControl } from '../hooks/usePortalAiAndAccessControl';
import type { usePortalAttachmentsAndPaste } from '../hooks/usePortalAttachmentsAndPaste';
import type { usePortalAvatarAndPresence } from '../hooks/usePortalAvatarAndPresence';
import type { usePortalBootstrapAndRealtime } from '../hooks/usePortalBootstrapAndRealtime';
import type { usePortalComposerRefs } from '../hooks/usePortalComposerRefs';
import type { usePortalLayoutAndResize } from '../hooks/usePortalLayoutAndResize';
import type { usePortalMentionAutocomplete } from '../hooks/usePortalMentionAutocomplete';
import type { usePortalMessageMutations } from '../hooks/usePortalMessageMutations';
import type { usePortalMessageSending } from '../hooks/usePortalMessageSending';
import type { usePortalMissionActions } from '../hooks/usePortalMissionActions';
import type { usePortalNavigationAndShortcuts } from '../hooks/usePortalNavigationAndShortcuts';
import type { usePortalSidebarActions } from '../hooks/usePortalSidebarActions';
import type { usePortalSidebarPrefs } from '../hooks/usePortalSidebarPrefs';
import type { usePortalSpacesAndDockActions } from '../hooks/usePortalSpacesAndDockActions';
import type { usePortalTaskActions } from '../hooks/usePortalTaskActions';
import type { usePortalTaskModals } from '../hooks/usePortalTaskModals';
import type { usePortalUiAdapters } from '../hooks/usePortalUiAdapters';
import { MosChatComposer } from './MosChatComposer';
import { MosChatDesktopHeader } from './MosChatDesktopHeader';
import { MosChatFilesPane } from './MosChatFilesPane';
import { MosChatMessageFeed } from './MosChatMessageFeed';
import { MosChatPinnedPane } from './MosChatPinnedPane';
import { MosChatTasksPane } from './MosChatTasksPane';
import { MosChatActiveCallRoomBanner } from './MosChatVoiceCallWidget';

export interface MosChatDesktopMainColumnProps {
  standalone: boolean;
  isDark: boolean;
  token: GlobalToken;
  antdMessage: MessageInstance;
  surfaceBg: string;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentSoftBg: string;
  accentBorder: string;
  currentUser?: SafeAny;
  conversations: MosChatConversation[];
  staffDirectory: MosChatStaffMember[];
  uniqueTasks: MosChatTaskItem[];
  workflowInstances: MosChatWorkflowInstance[];
  setWorkflowInstances: React.Dispatch<React.SetStateAction<MosChatWorkflowInstance[]>>;
  onClose: () => void;
  navigateToMessageRef: React.MutableRefObject<(convId: string, msgId?: string) => void>;
  setInitialWorkflowCode: (code: string) => void;
  setTriggerWorkflowModalOpen: (open: boolean) => void;
  layout: ReturnType<typeof usePortalLayoutAndResize>;
  composerRefs: ReturnType<typeof usePortalComposerRefs>;
  aiAccess: ReturnType<typeof usePortalAiAndAccessControl>;
  avatarPresence: ReturnType<typeof usePortalAvatarAndPresence>;
  sidebarPrefs: ReturnType<typeof usePortalSidebarPrefs>;
  sidebarActions: ReturnType<typeof usePortalSidebarActions>;
  attachments: ReturnType<typeof usePortalAttachmentsAndPaste>;
  realtime: ReturnType<typeof usePortalBootstrapAndRealtime>;
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

export const MosChatDesktopMainColumn: React.FC<MosChatDesktopMainColumnProps> = ({
  standalone,
  isDark,
  token,
  antdMessage,
  surfaceBg,
  surfaceRaised,
  canvasBg,
  borderColor,
  borderStrong,
  accentSoftBg,
  accentBorder,
  currentUser,
  conversations,
  staffDirectory,
  uniqueTasks,
  workflowInstances,
  setWorkflowInstances,
  onClose,
  navigateToMessageRef,
  setInitialWorkflowCode,
  setTriggerWorkflowModalOpen,
  layout,
  composerRefs,
  aiAccess,
  avatarPresence,
  sidebarPrefs,
  sidebarActions,
  attachments,
  realtime,
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
  <div
    className="flex-1 flex flex-col min-w-0"
    style={{
      background: canvasBg,
      display: layout.isMobile && layout.mobileActiveView !== 'conversation' ? 'none' : 'flex',
    }}
  >
    <MosChatDesktopHeader
      isDark={isDark}
      isMobile={layout.isMobile}
      standalone={standalone}
      token={token}
      antdMessage={antdMessage}
      surfaceBg={surfaceBg}
      surfaceRaised={surfaceRaised}
      borderColor={borderColor}
      currentUser={currentUser}
      staffDirectory={staffDirectory}
      isDannyAccount={aiAccess.isDannyAccount}
      activeConversation={sidebarPrefs.activeConversation}
      activeSubtab={layout.activeSubtab}
      setActiveSubtab={layout.setActiveSubtab}
      setMobileActiveView={layout.setMobileActiveView}
      uniqueTasks={uniqueTasks}
      workspaceSharedItemsCount={sidebarPrefs.workspaceSharedItemsCount}
      userPrefs={sidebarPrefs.userPrefs}
      accessConfig={aiAccess.accessConfig}
      renderUserAvatarNode={avatarPresence.renderUserAvatarNode}
      isConversationParticipantOnline={avatarPresence.isConversationParticipantOnline}
      setSpaceConfigModalOpen={spacesDock.setSpaceConfigModalOpen}
      setSpaceMembersModalOpen={spacesDock.setSpaceMembersModalOpen}
      voiceCallCurrentCallId={realtime.voiceCall.currentCall?.conversationId}
      voiceCallIsConnecting={realtime.voiceCall.isConnecting}
      startOrJoinVoiceCall={realtime.voiceCall.startOrJoinVoiceCall}
      searchModalOpen={navActions.searchModalOpen}
      setSearchModalOpen={navActions.setSearchModalOpen}
      ensurePortalOpen={layout.ensurePortalOpen}
      navigateToMessageRef={navigateToMessageRef}
      setNotifSettingsModalOpen={spacesDock.setNotifSettingsModalOpen}
      threadOpen={composerRefs.threadOpen}
      setThreadOpen={composerRefs.setThreadOpen}
      activeThreadMsgId={composerRefs.activeThreadMsgId}
      setActiveThreadMsgId={composerRefs.setActiveThreadMsgId}
      maximized={layout.maximized}
      maximizedRef={layout.maximizedRef}
      setMaximized={layout.setMaximized}
      persistPersonalLayout={layout.persistPersonalLayout}
      maiVoiceAnnounceEnabled={aiAccess.maiVoiceAnnounceEnabled}
      ttsSpeed={aiAccess.ttsSpeed}
      aiSessionId={aiAccess.aiSessionId}
      isAiSessionReadOnly={aiAccess.isAiSessionReadOnly}
      aiSessionAccess={aiAccess.aiSessionAccess}
      handleToggleMaiVoiceAnnounce={aiAccess.handleToggleMaiVoiceAnnounce}
      togglePinConversation={sidebarActions.togglePinConversation}
      toggleManualUnreadConversation={sidebarActions.toggleManualUnreadConversation}
      handlePopOutToMiniDock={spacesDock.handlePopOutToMiniDock}
      setAiSessionsModalOpen={aiAccess.setAiSessionsModalOpen}
      handleCopyAiSessionPermalink={aiAccess.handleCopyAiSessionPermalink}
      handleToggleAiSessionSharing={aiAccess.handleToggleAiSessionSharing}
      handleClearAiChat={aiAccess.handleClearAiChat}
      setAccessConfigTab={aiAccess.setAccessConfigTab}
      setAccessConfigModalOpen={aiAccess.setAccessConfigModalOpen}
      onClose={onClose}
    />

    {layout.activeSubtab === 'chat' && (
      <div
        data-chat-main-stream="true"
        className="flex-1 flex flex-col min-h-0 relative"
        onDragOver={(e) => {
          if (msgMutations.draggingRootMsgId || e.dataTransfer?.types?.includes('application/x-mos-chat-msg-id')) {
            return;
          }
          e.preventDefault();
          if (!attachments.isDraggingOver) attachments.setIsDraggingOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            attachments.setIsDraggingOver(false);
          }
        }}
        onDrop={(e) => {
          if (msgMutations.draggingRootMsgId || e.dataTransfer?.types?.includes('application/x-mos-chat-msg-id')) {
            return;
          }
          e.preventDefault();
          attachments.setIsDraggingOver(false);
          attachments.setIsDraggingOverThread(false);
          if (e.dataTransfer?.files?.length) {
            void attachments.handleProcessImageFiles(e.dataTransfer.files, 'upload', 'main');
          }
        }}
      >
        <MosChatActiveCallRoomBanner
          call={realtime.voiceCall.getActiveCallForConversation(sidebarPrefs.activeConversation?.id)}
          currentCallId={realtime.voiceCall.currentCall?.callId}
          isDark={isDark}
          onJoinCall={(cid) => void realtime.voiceCall.startOrJoinVoiceCall(cid)}
        />
        <MosChatMessageFeed
          isMobile={layout.isMobile}
          activeConversation={sidebarPrefs.activeConversation}
          currentUser={currentUser}
          isDark={isDark}
          token={token}
          surfaceRaised={surfaceRaised}
          borderColor={borderColor}
          borderStrong={borderStrong}
          accentSoftBg={accentSoftBg}
          accentBorder={accentBorder}
          pinnedMessages={sidebarPrefs.pinnedMessages}
          pinnedBannerIndex={layout.pinnedBannerIndex}
          setPinnedBannerIndex={layout.setPinnedBannerIndex}
          navigateToMessage={navActions.navigateToMessage}
          setActiveSubtab={layout.setActiveSubtab}
          handleTogglePin={msgMutations.handleTogglePin}
          formatMoveTargetSnippet={msgMutations.formatMoveTargetSnippet}
          mainMessagesContainerRef={composerRefs.mainMessagesContainerRef}
          messagesEndRef={composerRefs.messagesEndRef}
          uniqueTasks={uniqueTasks}
          isMessageFromCurrentUser={avatarPresence.isMessageFromCurrentUser}
          getMessageReadBreakdown={uiAdapters.getMessageReadBreakdown}
          stoppedReadersByMsgId={uiAdapters.stoppedReadersByMsgId}
          canManageChatThreads={aiAccess.canManageChatThreads}
          AI_COPILOT_CONV_ID={AI_COPILOT_CONV_ID}
          draggingRootMsgId={msgMutations.draggingRootMsgId}
          setDraggingRootMsgId={msgMutations.setDraggingRootMsgId}
          dragOverTargetMsgId={msgMutations.dragOverTargetMsgId}
          setDragOverTargetMsgId={msgMutations.setDragOverTargetMsgId}
          setDragOverThreadPane={msgMutations.setDragOverThreadPane}
          handleMoveThreadItem={msgMutations.handleMoveThreadItem}
          highlightedMsgId={navActions.highlightedMsgId}
          getMemberNickname={spacesDock.getMemberNickname}
          renderReadStatusCheckmark={uiAdapters.renderReadStatusCheckmark}
          renderUserAvatarNode={avatarPresence.renderUserAvatarNode}
          expandedThinkingIds={aiAccess.expandedThinkingIds}
          setExpandedThinkingIds={aiAccess.setExpandedThinkingIds}
          editingMessageId={msgMutations.editingMessageId}
          editingReplyId={msgMutations.editingReplyId}
          editingText={msgMutations.editingText}
          setEditingText={msgMutations.setEditingText}
          handleCancelEdit={msgMutations.handleCancelEdit}
          handleSaveEdit={msgMutations.handleSaveEdit}
          isSavingEdit={msgMutations.isSavingEdit}
          isComposingRef={composerRefs.isComposingRef}
          lastCompositionEndMsRef={composerRefs.lastCompositionEndMsRef}
          setHistoryModalMessage={msgMutations.setHistoryModalMessage}
          setHistoryModalOpen={msgMutations.setHistoryModalOpen}
          isDannyAccount={aiAccess.isDannyAccount}
          handleRestoreMessage={msgMutations.handleRestoreMessage}
          handleMessageTap={msgMutations.handleMessageTap}
          heartFlyMsgId={layout.heartFlyMsgId}
          renderRichTextMessage={mentions.renderRichTextMessage}
          appliedActionIds={aiAccess.appliedActionIds}
          handleExecuteAiAction={aiAccess.handleExecuteAiAction}
          speakingMsgId={aiAccess.speakingMsgId}
          ttsSpeed={aiAccess.ttsSpeed}
          handleSpeakAiMessage={aiAccess.handleSpeakAiMessage}
          handleSetTtsSpeed={aiAccess.handleSetTtsSpeed}
          hasUserReacted={msgMutations.hasUserReacted}
          handleToggleReaction={msgMutations.handleToggleReaction}
          handleOpenReactionUsers={msgMutations.handleOpenReactionUsers}
          staffDirectory={staffDirectory}
          mobileActiveMsgId={layout.mobileActiveMsgId}
          openMovePopoverKey={msgMutations.openMovePopoverKey}
          setOpenMovePopoverKey={msgMutations.setOpenMovePopoverKey}
          openStickerPopoverKey={msgSending.openStickerPopoverKey}
          setOpenStickerPopoverKey={msgSending.setOpenStickerPopoverKey}
          renderReactionPickerContent={uiAdapters.renderReactionPickerContent}
          quickReactionEmojis={sidebarPrefs.desktopQuickReactionEmojis}
          handleOpenThread={navActions.handleOpenThread}
          openTaskModalFromMessage={taskModals.openTaskModalFromMessage}
          isStrictDannySuperAdmin={aiAccess.isStrictDannySuperAdmin}
          openMissionModalFromChat={missionActions.openMissionModalFromChat}
          handleBuzzMessage={msgMutations.handleBuzzMessage}
          handleStartEdit={msgMutations.handleStartEdit}
          handleDeleteMessage={msgMutations.handleDeleteMessage}
          renderMiniSeenAvatarStack={uiAdapters.renderMiniSeenAvatarStack}
          aiThinkingActive={aiAccess.aiThinkingActive}
          aiElapsedSec={aiAccess.aiElapsedSec}
          getThreadReplyReadBreakdown={uiAdapters.getThreadReplyReadBreakdown}
          renderTaskCard={uiAdapters.renderTaskCard}
          renderLiveMissionCard={uiAdapters.renderLiveMissionCard}
          workflowInstances={workflowInstances}
          setWorkflowInstances={setWorkflowInstances}
          currentUserStaffMember={aiAccess.currentUserStaffMember}
          fetchBootstrap={realtime.fetchBootstrap}
          setLightboxImage={attachments.setLightboxImage}
          movingThreadItemKey={msgMutations.movingThreadItemKey}
          threadOpen={composerRefs.threadOpen}
          activeThreadMessage={spacesDock.activeThreadMessage}
          isDraggingOver={attachments.isDraggingOver}
          antdMessage={antdMessage}
          renderMessageAttachments={uiAdapters.renderMessageAttachments}
          openCustomerDetail={msgSending.openCustomerDetail}
          handleReplyToMessage={composerRefs.handleReplyToMessage}
          handleOpenForwardModal={navActions.handleOpenForwardModal}
          accessibleConversationIds={navActions.accessibleConversationIds}
          onJumpToForwardedSource={navActions.handleJumpToForwardedSource}
          onLoadOlderMessages={realtime.loadOlderMessages}
        />

        {sidebarPrefs.activeConversation?.id === AI_COPILOT_CONV_ID && aiAccess.isAiSessionReadOnly && (
          <div
            role="status"
            data-testid="mos-chat-ai-session-readonly-banner"
            className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
            style={{
              background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
              borderTop: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a'}`,
              color: isDark ? '#fcd34d' : '#92400e',
            }}
          >
            <span>
              {aiAccess.aiSessionAccess?.mode === 'audit'
                ? 'Rà soát bảo mật: bạn đang xem phiên riêng tư của nhân sự khác (chỉ xem). Lượt xem này đã được ghi lại.'
                : aiAccess.aiSessionAccess?.mode === 'mission'
                  ? 'Phiên này gắn với mOS Mission nên bạn được xem (chỉ xem). Lượt xem này đã được ghi lại.'
                  : 'Phiên được chủ phiên chia sẻ qua liên kết (chỉ xem, không thể nhắn).'}
            </span>
            <button
              type="button"
              onClick={aiAccess.handleClearAiChat}
              className="px-2 py-1 rounded-md font-medium cursor-pointer whitespace-nowrap"
              style={{ background: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fef3c7', color: 'inherit' }}
            >
              Bắt đầu phiên của tôi
            </button>
          </div>
        )}

        <MosChatComposer
          isMobile={layout.isMobile}
          activeConversation={sidebarPrefs.activeConversation}
          currentUser={currentUser}
          canUseAiCopilot={aiAccess.canUseAiCopilot}
          isStrictDannySuperAdmin={aiAccess.isStrictDannySuperAdmin}
          aiThinkingActive={aiAccess.aiThinkingActive}
          isDark={isDark}
          surfaceBg={surfaceBg}
          surfaceRaised={surfaceRaised}
          borderColor={borderColor}
          borderStrong={borderStrong}
          replyingToMessage={composerRefs.replyingToMessage}
          setReplyingToMessage={composerRefs.setReplyingToMessage}
          composerTextRef={composerRefs.composerTextRef}
          composerHasText={composerRefs.composerHasText}
          updateComposerText={composerRefs.updateComposerText}
          setComposerText={composerRefs.setComposerText}
          composerHasTextListenerRef={composerRefs.composerHasTextListenerRef}
          mentionRenderKey={
            mentions.mentionState.open && mentions.mentionState.scope === 'main'
              ? `${mentions.mentionState.query}:${mentions.mentionState.highlightedIndex}`
              : ''
          }
          composerCursorPos={composerRefs.composerCursorPosRef.current}
          setComposerCursorPos={composerRefs.setComposerCursorPos}
          composerInputRef={composerRefs.composerInputRef}
          stagedAttachments={attachments.stagedAttachments}
          pendingUploads={attachments.pendingUploads}
          renderStagedAttachmentsStrip={uiAdapters.renderStagedAttachmentsStrip}
          stagedCustomerCard={msgSending.stagedCustomerCard}
          setStagedCustomerCard={msgSending.setStagedCustomerCard}
          isUrgentSend={aiAccess.isUrgentSend}
          setIsUrgentSend={aiAccess.setIsUrgentSend}
          handleSendMessage={msgSending.handleSendMessage}
          handleSendMain={msgSending.handleSendMain}
          triggerFilePicker={attachments.triggerFilePicker}
          handleSendQuickCustomerCard={msgSending.handleSendQuickCustomerCard}
          handleOpenCustomerPicker={msgSending.handleOpenCustomerPicker}
          openTaskModalFromMessage={taskModals.openTaskModalFromMessage}
          checkForMentionTrigger={mentions.checkForMentionTrigger}
          handleClipboardPaste={attachments.handleClipboardPaste}
          handleMentionKeyDown={mentions.handleMentionKeyDown}
          handleApplyFormat={mentions.handleApplyFormat}
          renderMentionAutocompleteDropdown={mentions.renderMentionAutocompleteDropdown}
          renderAppleNotesFormatToolbar={mentions.renderAppleNotesFormatToolbar}
          renderComposerEmojiPickerContent={uiAdapters.renderComposerEmojiPickerContent}
          renderRichTextMessage={mentions.renderRichTextMessage}
          setDriveLinkModalOpen={attachments.setDriveLinkModalOpen}
          uploadTargetRef={attachments.uploadTargetRef}
          setTriggerWorkflowModalOpen={setTriggerWorkflowModalOpen}
          setInitialWorkflowCode={setInitialWorkflowCode}
          setRichEditorModalState={mentions.setRichEditorModalState}
          isComposingRef={composerRefs.isComposingRef}
          lastCompositionEndMsRef={composerRefs.lastCompositionEndMsRef}
        />
      </div>
    )}

    {layout.activeSubtab === 'tasks' && (
      <MosChatTasksPane
        activeConversation={sidebarPrefs.activeConversation}
        isDark={isDark}
        surfaceBg={surfaceBg}
        surfaceRaised={surfaceRaised}
        borderColor={borderColor}
        token={token}
        uniqueTasks={uniqueTasks}
        taskCounts={taskActions.taskCounts}
        taskSearchQuery={taskActions.taskSearchQuery}
        setTaskSearchQuery={taskActions.setTaskSearchQuery}
        taskScopeFilter={taskActions.taskScopeFilter}
        setTaskScopeFilter={taskActions.setTaskScopeFilter}
        taskFilter={taskActions.taskFilter}
        setTaskFilter={taskActions.setTaskFilter}
        currentSpaceTasks={taskActions.currentSpaceTasks}
        otherSpaceTasks={taskActions.otherSpaceTasks}
        filteredTasks={taskActions.filteredTasks}
        conversations={conversations}
        collapseOtherSpaces={taskActions.collapseOtherSpaces}
        setCollapseOtherSpaces={taskActions.setCollapseOtherSpaces}
        triggerTaskReminderAlert={taskActions.triggerTaskReminderAlert}
        openTaskModalFromMessage={taskModals.openTaskModalFromMessage}
        renderTaskCard={uiAdapters.renderTaskCard}
        renderLiveMissionCard={uiAdapters.renderLiveMissionCard}
      />
    )}

    {layout.activeSubtab === 'pinned' && (
      <MosChatPinnedPane
        pinnedMessages={sidebarPrefs.pinnedMessages}
        activeConversation={sidebarPrefs.activeConversation}
        setActiveSubtab={layout.setActiveSubtab}
        surfaceBg={surfaceBg}
        borderColor={borderColor}
        borderStrong={borderStrong}
        navigateToMessage={navActions.navigateToMessage}
        handleTogglePin={msgMutations.handleTogglePin}
        renderMessageAttachments={uiAdapters.renderMessageAttachments}
      />
    )}

    {layout.activeSubtab === 'files' && (
      <MosChatFilesPane
        activeConversation={sidebarPrefs.activeConversation}
        setActiveSubtab={layout.setActiveSubtab}
        navigateToMessage={navActions.navigateToMessage}
        isDark={isDark}
        surfaceBg={surfaceBg}
        surfaceRaised={surfaceRaised}
        borderColor={borderColor}
        borderStrong={borderStrong}
        isMobile={layout.isMobile}
      />
    )}
  </div>
);
