'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { GlobalToken } from 'antd';
import type {
  MosChatConversation,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  SafeAny,
} from '@mos-lab/shared';
import { ErrorBoundary } from '../../ErrorBoundary';
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
import { MosChatAiAuditReasonModal } from './MosChatAiAuditReasonModal';
import { MosChatAiSessionsModal } from './MosChatAiSessionsModal';
import { MosChatForwardModal } from './MosChatForwardModal';
import { MosChatModals } from './MosChatModals';
import { MosChatNotificationSettingsModal } from './MosChatNotificationSettings';
import { MosChatOmiCallDialerModal } from '../modals/MosChatOmiCallDialerModal';
import { MosChatReactionUsersModal } from './MosChatReactionUsersModal';
import { MosChatSearchModal } from './MosChatSearchModal';

const CustomerDetailDrawer = dynamic(() => import('../../CustomerDetailDrawer'), { ssr: false });

export interface MosChatPortalModalStackProps {
  isDark: boolean;
  themeMode: 'light' | 'dark';
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  currentUser?: SafeAny;
  staffDirectory: MosChatStaffMember[];
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  workflowTemplates: MosChatWorkflowTemplate[];
  setWorkflowTemplates: React.Dispatch<React.SetStateAction<MosChatWorkflowTemplate[]>>;
  setWorkflowInstances: React.Dispatch<React.SetStateAction<MosChatWorkflowInstance[]>>;
  triggerWorkflowModalOpen: boolean;
  setTriggerWorkflowModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialWorkflowCode: string;
  saveThreadWorkflowModalOpen: boolean;
  setSaveThreadWorkflowModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  notifyLivePeers: () => void;
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
}

export const MosChatPortalModalStack: React.FC<MosChatPortalModalStackProps> = ({
  isDark,
  themeMode,
  token,
  surfaceBg,
  surfaceRaised,
  canvasBg,
  borderColor,
  borderStrong,
  accentColor,
  currentUser,
  staffDirectory,
  setConversations,
  setTasks,
  workflowTemplates,
  setWorkflowTemplates,
  setWorkflowInstances,
  triggerWorkflowModalOpen,
  setTriggerWorkflowModalOpen,
  initialWorkflowCode,
  saveThreadWorkflowModalOpen,
  setSaveThreadWorkflowModalOpen,
  notifyLivePeers,
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
}) => (
  <>
    {spacesDock.notifSettingsModalOpen && (
      <MosChatNotificationSettingsModal
        open={spacesDock.notifSettingsModalOpen}
        onClose={() => spacesDock.setNotifSettingsModalOpen(false)}
        userPrefs={sidebarPrefs.userPrefs}
        conversations={sidebarPrefs.allUserConversations}
        onChangeGlobalMode={sidebarActions.handleChangeGlobalNotificationMode}
        onChangeChannelOverride={sidebarActions.handleChangeChannelNotificationOverride}
        themeMode={themeMode}
      />
    )}

    {navActions.searchModalOpen && (
      <MosChatSearchModal
        open={navActions.searchModalOpen}
        onClose={() => navActions.setSearchModalOpen(false)}
        activeConversation={sidebarPrefs.activeConversation}
        onSelectMessage={navActions.handleSelectSearchResult}
      />
    )}

    {Boolean(aiAccess.aiAuditPrompt) && (
      <MosChatAiAuditReasonModal
        open={Boolean(aiAccess.aiAuditPrompt)}
        loading={aiAccess.aiAuditLoading}
        onCancel={() => aiAccess.setAiAuditPrompt(null)}
        onConfirm={(reason) => void aiAccess.handleConfirmAiAudit(reason)}
      />
    )}
    {aiAccess.aiSessionsModalOpen && (
      <MosChatAiSessionsModal
        open={aiAccess.aiSessionsModalOpen}
        onClose={() => aiAccess.setAiSessionsModalOpen(false)}
        activeSessionId={aiAccess.aiSessionId}
        onSelectSession={(sessionId) => {
          aiAccess.setAiSessionsModalOpen(false);
          void aiAccess.openAiSessionById(sessionId);
        }}
      />
    )}
    {msgMutations.reactionUsersModalOpen && (
      <MosChatReactionUsersModal
        open={msgMutations.reactionUsersModalOpen}
        target={msgMutations.reactionUsersTarget}
        onClose={msgMutations.handleCloseReactionUsers}
        currentUser={currentUser}
        staffDirectory={staffDirectory}
        onToggleReaction={msgMutations.handleToggleReaction}
        isDark={isDark}
      />
    )}

    {Boolean(navActions.forwardModalTarget) && (
      <MosChatForwardModal
        open={Boolean(navActions.forwardModalTarget)}
        onClose={() => navActions.setForwardModalTarget(null)}
        sourceConversation={
          sidebarPrefs.allUserConversations.find((c) => c.id === navActions.forwardModalTarget?.sourceConversationId) ||
          sidebarPrefs.activeConversation
        }
        sourceMessage={navActions.forwardModalTarget?.message || null}
        sourceReply={navActions.forwardModalTarget?.reply || null}
        conversations={sidebarPrefs.allUserConversations}
        staffDirectory={staffDirectory}
        currentUser={currentUser}
        pinnedIds={sidebarPrefs.userPrefs.pinnedIds}
        isDark={isDark}
        onSubmit={navActions.handleForwardMessage}
        onNavigateToConversation={(cid) => navActions.navigateToMessage(cid)}
      />
    )}

    <MosChatModals
      isDark={isDark}
      isMobile={layout.isMobile}
      token={token}
      surfaceBg={surfaceBg}
      surfaceRaised={surfaceRaised}
      canvasBg={canvasBg}
      borderColor={borderColor}
      borderStrong={borderStrong}
      accentColor={accentColor}
      renderUserAvatarNode={avatarPresence.renderUserAvatarNode}
      currentUser={currentUser}
      isDannyAccount={aiAccess.isDannyAccount}
      isStrictDannySuperAdmin={aiAccess.isStrictDannySuperAdmin}
      canUseAiCopilot={aiAccess.canUseAiCopilot}
      staffDirectory={staffDirectory}
      activeConversation={sidebarPrefs.activeConversation}
      setConversations={setConversations}
      notifyLivePeers={notifyLivePeers}
      taskModalOpen={taskModals.taskModalOpen}
      setTaskModalOpen={taskModals.setTaskModalOpen}
      editingTask={taskModals.editingTask}
      setEditingTask={taskModals.setEditingTask}
      taskModalSourceMsg={taskModals.taskModalSourceMsg}
      taskTitle={taskModals.taskTitle}
      setTaskTitle={taskModals.setTaskTitle}
      taskDoneState={taskModals.taskDoneState}
      setTaskDoneState={taskModals.setTaskDoneState}
      taskArchivedState={taskModals.taskArchivedState}
      setTaskArchivedState={taskModals.setTaskArchivedState}
      taskAssignee={taskModals.taskAssignee}
      setTaskAssignee={taskModals.setTaskAssignee}
      assigneeOptions={spacesDock.assigneeOptions}
      taskPriority={taskModals.taskPriority}
      setTaskPriority={taskModals.setTaskPriority}
      taskDeadline={taskModals.taskDeadline}
      setTaskDeadline={taskModals.setTaskDeadline}
      taskDeadlineMode={taskModals.taskDeadlineMode}
      setTaskDeadlineMode={taskModals.setTaskDeadlineMode}
      selectedDeadlinePresetId={taskModals.selectedDeadlinePresetId}
      setSelectedDeadlinePresetId={taskModals.setSelectedDeadlinePresetId}
      taskNegotiatedDeadline={taskModals.taskNegotiatedDeadline}
      setTaskNegotiatedDeadline={taskModals.setTaskNegotiatedDeadline}
      taskNegotiationNote={taskModals.taskNegotiationNote}
      setTaskNegotiationNote={taskModals.setTaskNegotiationNote}
      taskRemindMode={taskModals.taskRemindMode}
      setTaskRemindMode={taskModals.setTaskRemindMode}
      selectedPresetId={taskModals.selectedPresetId}
      setSelectedPresetId={taskModals.setSelectedPresetId}
      setTaskRemindSeconds={taskModals.setTaskRemindSeconds}
      customRemindDate={taskModals.customRemindDate}
      setCustomRemindDate={taskModals.setCustomRemindDate}
      handleConfirmCreateTask={taskActions.handleConfirmCreateTask}
      negotiateModalOpen={taskModals.negotiateModalOpen}
      setNegotiateModalOpen={taskModals.setNegotiateModalOpen}
      negotiatingTask={taskModals.negotiatingTask}
      setNegotiatingTask={taskModals.setNegotiatingTask}
      negotiateProposedDeadline={taskModals.negotiateProposedDeadline}
      setNegotiateProposedDeadline={taskModals.setNegotiateProposedDeadline}
      negotiateReason={taskModals.negotiateReason}
      setNegotiateReason={taskModals.setNegotiateReason}
      isSubmittingNegotiation={taskModals.isSubmittingNegotiation}
      handleSubmitNegotiation={taskModals.handleSubmitNegotiation}
      missionModalOpen={missionActions.missionModalOpen}
      setMissionModalOpen={missionActions.setMissionModalOpen}
      missionSourceMsg={missionActions.missionSourceMsg}
      missionTitle={missionActions.missionTitle}
      setMissionTitle={missionActions.setMissionTitle}
      missionType={missionActions.missionType}
      setMissionType={missionActions.setMissionType}
      missionNote={missionActions.missionNote}
      setMissionNote={missionActions.setMissionNote}
      isDispatchingMission={missionActions.isDispatchingMission}
      handleConfirmDispatchMission={missionActions.handleConfirmDispatchMission}
      newRoomModalOpen={spacesDock.newRoomModalOpen}
      setNewRoomModalOpen={spacesDock.setNewRoomModalOpen}
      newRoomType={spacesDock.newRoomType}
      roomSearchQuery={spacesDock.roomSearchQuery}
      setRoomSearchQuery={spacesDock.setRoomSearchQuery}
      roomGroupFilter={spacesDock.roomGroupFilter}
      setRoomGroupFilter={spacesDock.setRoomGroupFilter}
      selectedMemberIds={spacesDock.selectedMemberIds}
      setSelectedMemberIds={spacesDock.setSelectedMemberIds}
      newRoomEmoji={spacesDock.newRoomEmoji}
      setNewRoomEmoji={spacesDock.setNewRoomEmoji}
      newRoomColor={spacesDock.newRoomColor}
      setNewRoomColor={spacesDock.setNewRoomColor}
      newRoomName={spacesDock.newRoomName}
      setNewRoomName={spacesDock.setNewRoomName}
      newRoomSubtitle={spacesDock.newRoomSubtitle}
      setNewRoomSubtitle={spacesDock.setNewRoomSubtitle}
      handleCreateSpace={spacesDock.handleCreateSpace}
      handleSelectSelfChat={spacesDock.handleSelectSelfChat}
      handleSelectColleague={spacesDock.handleSelectColleague}
      handleToggleDepartmentOrTeam={spacesDock.handleToggleDepartmentOrTeam}
      spaceMembersModalOpen={spacesDock.spaceMembersModalOpen}
      setSpaceMembersModalOpen={spacesDock.setSpaceMembersModalOpen}
      addMemberSelectedStaffId={spacesDock.addMemberSelectedStaffId}
      setAddMemberSelectedStaffId={spacesDock.setAddMemberSelectedStaffId}
      handleAddMemberToSpace={spacesDock.handleAddMemberToSpace}
      handleBulkAddGroupToSpace={spacesDock.handleBulkAddGroupToSpace}
      handleRemoveMemberFromSpace={spacesDock.handleRemoveMemberFromSpace}
      handleOpenNicknameModal={spacesDock.handleOpenNicknameModal}
      spaceConfigModalOpen={spacesDock.spaceConfigModalOpen}
      setSpaceConfigModalOpen={spacesDock.setSpaceConfigModalOpen}
      editingNicknameTarget={spacesDock.editingNicknameTarget}
      setEditingNicknameTarget={spacesDock.setEditingNicknameTarget}
      nicknameInputVal={spacesDock.nicknameInputVal}
      setNicknameInputVal={spacesDock.setNicknameInputVal}
      isUpdatingNickname={spacesDock.isUpdatingNickname}
      handleSaveNickname={spacesDock.handleSaveNickname}
      driveLinkModalOpen={attachments.driveLinkModalOpen}
      setDriveLinkModalOpen={attachments.setDriveLinkModalOpen}
      driveLinkInput={attachments.driveLinkInput}
      setDriveLinkInput={attachments.setDriveLinkInput}
      handleConfirmDriveLink={attachments.handleConfirmDriveLink}
      triggerFilePicker={attachments.triggerFilePicker}
      uploadTargetRef={attachments.uploadTargetRef}
      lightboxImage={attachments.lightboxImage}
      setLightboxImage={attachments.setLightboxImage}
      accessConfigModalOpen={aiAccess.accessConfigModalOpen}
      setAccessConfigModalOpen={aiAccess.setAccessConfigModalOpen}
      savingAccessConfig={aiAccess.savingAccessConfig}
      accessConfigTab={aiAccess.accessConfigTab}
      setAccessConfigTab={aiAccess.setAccessConfigTab}
      accessConfig={aiAccess.accessConfig}
      persistAccessConfig={sidebarPrefs.persistAccessConfig}
      accessStaffSearch={aiAccess.accessStaffSearch}
      setAccessStaffSearch={aiAccess.setAccessStaffSearch}
      accessGroupFilter={aiAccess.accessGroupFilter}
      setAccessGroupFilter={aiAccess.setAccessGroupFilter}
      isStaffMemberAllowedInChat={aiAccess.isStaffMemberAllowedInChat}
      isStaffMemberAllowedInAi={aiAccess.isStaffMemberAllowedInAi}
      quickCreateSectionModalOpen={sidebarPrefs.quickCreateSectionModalOpen}
      setQuickCreateSectionModalOpen={sidebarPrefs.setQuickCreateSectionModalOpen}
      quickCreateSectionTargetConvId={sidebarPrefs.quickCreateSectionTargetConvId}
      setQuickCreateSectionTargetConvId={sidebarPrefs.setQuickCreateSectionTargetConvId}
      quickCreateSectionName={sidebarPrefs.quickCreateSectionName}
      setQuickCreateSectionName={sidebarPrefs.setQuickCreateSectionName}
      handleCreateCustomSection={sidebarActions.handleCreateCustomSection}
      sidebarCustomizeModalOpen={sidebarPrefs.sidebarCustomizeModalOpen}
      setSidebarCustomizeModalOpen={sidebarPrefs.setSidebarCustomizeModalOpen}
      editingSectionId={sidebarPrefs.editingSectionId}
      setEditingSectionId={sidebarPrefs.setEditingSectionId}
      sidebarCustomizeTab={sidebarPrefs.sidebarCustomizeTab}
      setSidebarCustomizeTab={sidebarPrefs.setSidebarCustomizeTab}
      sidebarSections={sidebarPrefs.sidebarSections}
      allUserConversations={sidebarPrefs.allUserConversations}
      userPrefs={sidebarPrefs.userPrefs}
      handleResetSidebarPrefs={sidebarActions.handleResetSidebarPrefs}
      newSectionNameInput={sidebarPrefs.newSectionNameInput}
      setNewSectionNameInput={sidebarPrefs.setNewSectionNameInput}
      editingSectionNameInput={sidebarPrefs.editingSectionName}
      setEditingSectionNameInput={sidebarPrefs.setEditingSectionName}
      handleRenameCustomSection={sidebarActions.handleRenameCustomSection}
      handleDeleteCustomSection={sidebarActions.handleDeleteCustomSection}
      handleMoveSectionOrder={sidebarActions.handleMoveSectionOrder}
      togglePinConversation={sidebarActions.togglePinConversation}
      toggleMuteConversation={sidebarActions.toggleMuteConversation}
      toggleHideConversation={sidebarActions.toggleHideConversation}
      historyModalOpen={msgMutations.historyModalOpen}
      setHistoryModalOpen={msgMutations.setHistoryModalOpen}
      historyModalMessage={msgMutations.historyModalMessage}
      setHistoryModalMessage={msgMutations.setHistoryModalMessage}
      isMessageFromCurrentUser={avatarPresence.isMessageFromCurrentUser}
      handleRestoreVersion={msgMutations.handleRestoreVersion}
      handleRestoreMessage={msgMutations.handleRestoreMessage}
      triggerWorkflowModalOpen={triggerWorkflowModalOpen}
      setTriggerWorkflowModalOpen={setTriggerWorkflowModalOpen}
      workflowTemplates={workflowTemplates}
      setWorkflowTemplates={setWorkflowTemplates}
      initialWorkflowCode={initialWorkflowCode}
      setWorkflowInstances={setWorkflowInstances}
      setTasks={setTasks}
      saveThreadWorkflowModalOpen={saveThreadWorkflowModalOpen}
      setSaveThreadWorkflowModalOpen={setSaveThreadWorkflowModalOpen}
      activeThreadMessage={spacesDock.activeThreadMessage}
      fetchBootstrap={realtime.fetchBootstrap}
      richEditorModalState={mentions.richEditorModalState}
      setRichEditorModalState={mentions.setRichEditorModalState}
      composerText={composerRefs.composerTextRef.current}
      setComposerText={composerRefs.setComposerText}
      threadInput={composerRefs.threadTextRef.current}
      setThreadInput={composerRefs.setThreadInput}
      composerInputRef={composerRefs.composerInputRef}
      threadInputRef={composerRefs.threadInputRef}
      stagedAttachments={attachments.stagedAttachments}
      setStagedAttachments={attachments.setStagedAttachments}
      handleSendMessage={msgSending.handleSendMessage}
      activeThreadMsgId={composerRefs.activeThreadMsgId}
      threadAttachments={attachments.threadAttachments}
      setThreadAttachments={attachments.setThreadAttachments}
      scrollToChatBottom={composerRefs.scrollToChatBottom}
      customerPickerOpen={msgSending.customerPickerOpen}
      setCustomerPickerOpen={msgSending.setCustomerPickerOpen}
      onSelectCustomerCard={msgSending.handleSelectCustomerCard}
    />

    {msgSending.customerDrawerOpen && msgSending.selectedCustomerId && (
      <ErrorBoundary fallback={null}>
        <CustomerDetailDrawer
          open={msgSending.customerDrawerOpen}
          customerId={msgSending.selectedCustomerId}
          zIndex={2000}
          onClose={() => {
            msgSending.setCustomerDrawerOpen(false);
            msgSending.setSelectedCustomerId(null);
          }}
        />
      </ErrorBoundary>
    )}

    <MosChatOmiCallDialerModal isDark={isDark} currentUser={currentUser} staffDirectory={staffDirectory} />
  </>
);
