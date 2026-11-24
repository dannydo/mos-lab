'use client';

import React from 'react';
import { message as antdMessage } from 'antd';
import type {
  MosChatConversation,
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatMessage,
  MosChatSearchResultItem,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatTaskPriority,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import type { MosChatStickerItem, MosChatStickerPackId } from '../../mos-chat-stickers';
import { MosChatRichEditorModal } from '../../MosChatRichEditorModal';
import { MosChatCustomerPickerModal } from '../../MosChatCustomerPickerModal';
import { MosChatSpaceConfigModal } from '../../MosChatSpaceConfigModal';
import { MosChatSpaceMembersModal } from '../../MosChatSpaceMembersModal';
import { MosChatForwardModal } from '../../components/MosChatForwardModal';
import { MosChatPushNotificationModal } from '../../components/MosChatPushNotificationModal';
import { MosChatVoiceCallWidget } from '../../components/MosChatVoiceCallWidget';
import { MosChatGoogleWorkspaceDrawer } from '../../components/MosChatGoogleWorkspaceDrawer';
import { MosChatOmiCallDialerModal } from '../../modals/MosChatOmiCallDialerModal';
import { UnifiedProfileSheet } from '../../../profile/UnifiedProfileSheet';
import { MosChatMobileActionSheet } from '../MosChatMobileActionSheet';
import { MosChatMobileReactionSheet } from '../MosChatMobileReactionSheet';
import { MosChatMobileReactionUsersSheet } from '../MosChatMobileReactionUsersSheet';
import { MosChatMobileSeenUsersSheet } from '../MosChatMobileSeenUsersSheet';
import { MosChatMobileMoveThreadModal } from '../MosChatMobileMoveThreadModal';
import { MosChatMobileEditModal } from '../MosChatMobileEditModal';
import { MosChatMobileStickerSheet } from '../MosChatMobileStickerSheet';
import { MosChatMobileMediaGallery, type MosChatGalleryImage } from '../MosChatMobileMediaGallery';
import { MosChatMobileTaskDetailSheet } from '../MosChatMobileTaskDetailSheet';
import { MosChatMobileEditTaskModal } from '../MosChatMobileEditTaskModal';
import { MosChatMobileNegotiateTaskModal } from '../MosChatMobileNegotiateTaskModal';
import { MosChatMobileMissionModal } from '../MosChatMobileMissionModal';
import { MosChatMobileSearchSheet, type FilterScope } from '../MosChatMobileSearchSheet';
import { MobileQuickTaskModal } from './MobileQuickTaskModal';
import type { MobileTaskAssigneeOption } from './useMobileTaskWorkflow';

interface MobileAppModalsAndSheetsProps {
  standalone: boolean;
  isDark: boolean;
  currentUser: SafeAny;
  activeConversation: MosChatConversation | null | undefined;
  conversations: MosChatConversation[];
  staffDirectory: MosChatStaffMember[];
  pinnedConvIds?: Set<string>;
  selectedMsgForAction: MosChatMessage | null;
  setSelectedMsgForAction: (m: MosChatMessage | null) => void;
  setActiveThreadMsg: (m: MosChatMessage | null) => void;
  setMobileView: (v: 'inbox' | 'room' | 'thread') => void;
  setActiveConvId: (cid: string) => void;
  setActiveSubtab: (tab: SafeAny) => void;
  sendMessage: (text: string, opts?: SafeAny) => Promise<SafeAny> | SafeAny;
  editMessage: (id: string, text: string) => Promise<SafeAny>;
  forwardMessage?: (payload: SafeAny) => Promise<SafeAny>;
  updateSpaceConfig?: (cid: string, data: SafeAny) => Promise<SafeAny>;
  togglePinConversation: (cid: string) => void;
  actionSheetOpen: boolean;
  setActionSheetOpen: (open: boolean) => void;
  ckEditorOpen: boolean;
  setCkEditorOpen: (open: boolean) => void;
  composerText: string;
  setComposerText: React.Dispatch<React.SetStateAction<string>>;
  attachedImages: MosChatImageAttachment[];
  setAttachedImages: React.Dispatch<React.SetStateAction<MosChatImageAttachment[]>>;
  stagedCustomerCard: MosChatCustomerCard | null;
  setStagedCustomerCard: React.Dispatch<React.SetStateAction<MosChatCustomerCard | null>>;
  customerPickerOpen: boolean;
  setCustomerPickerOpen: (open: boolean) => void;
  stickerPickerOpen: boolean;
  setStickerPickerOpen: (open: boolean) => void;
  stickerPickerInitialPack: MosChatStickerPackId;
  setStickerPickerInitialPack: (pack: MosChatStickerPackId) => void;
  editingMessage: MosChatMessage | null;
  setEditingMessage: (m: MosChatMessage | null) => void;
  movingMsgForThread: MosChatMessage | null;
  setMovingMsgForThread: (m: MosChatMessage | null) => void;
  prevMsgForMoving: MosChatMessage | null;
  movingReplyForThread: { parentMsg: MosChatMessage; replyId: string } | null;
  setMovingReplyForThread: (val: { parentMsg: MosChatMessage; replyId: string } | null) => void;
  forwardTarget: { message: MosChatMessage; reply?: MosChatThreadReply | null } | null;
  setForwardTarget: (val: { message: MosChatMessage; reply?: MosChatThreadReply | null } | null) => void;
  spaceConfigModalOpen: boolean;
  setSpaceConfigModalOpen: (open: boolean) => void;
  spaceMembersModalOpen: boolean;
  setSpaceMembersModalOpen: (open: boolean) => void;
  pushModalOpen: boolean;
  setPushModalOpen: (open: boolean) => void;
  themeSheetOpen: boolean;
  setThemeSheetOpen: (open: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  handleSelectSticker: (sticker: MosChatStickerItem) => void;
  nav: {
    streamGallery: { open: boolean; images: MosChatGalleryImage[]; initialIndex: number };
    setStreamGallery: React.Dispatch<
      React.SetStateAction<{ open: boolean; images: MosChatGalleryImage[]; initialIndex: number }>
    >;
    searchSheetOpen: boolean;
    setSearchSheetOpen: (open: boolean) => void;
    searchInitialQuery: string;
    searchInitialScope: FilterScope;
    handleSelectSearchResult: (item: MosChatSearchResultItem) => void;
    webPush: SafeAny;
    standaloneVoiceCall: SafeAny;
  };
  taskWorkflow: {
    selectedDetailTask: MosChatTaskItem | null;
    setSelectedDetailTaskId: (id: string | null) => void;
    editingTask: MosChatTaskItem | null;
    setEditingTaskId: (id: string | null) => void;
    negotiatingTask: MosChatTaskItem | null;
    setNegotiatingTaskId: (id: string | null) => void;
    missionTask: MosChatTaskItem | null;
    setMissionTaskId: (id: string | null) => void;
    taskModalOpen: boolean;
    editingTaskForModal: MosChatTaskItem | null;
    taskThreadContext: { inThread: boolean; sourceReply?: MosChatThreadReply | null } | null;
    taskTitle: string;
    setTaskTitle: (val: string) => void;
    taskAssigneeId: string | undefined;
    setTaskAssigneeId: (val: string | undefined) => void;
    taskDueAt: string | null;
    setTaskDueAt: (val: string | null) => void;
    taskPriority: MosChatTaskPriority;
    setTaskPriority: (val: MosChatTaskPriority) => void;
    assigneeOptions: MobileTaskAssigneeOption[];
    openCreateTaskModal: (initialTitle?: string, sourceMsg?: MosChatMessage | null) => void;
    handleCreateTaskFromMsg: (msg: MosChatMessage) => void;
    closeTaskModal: () => void;
    handleConfirmCreateTask: () => Promise<void>;
    handleSaveEditedTask: (
      taskId: string,
      updates: {
        title: string;
        assigneeId?: string;
        assigneeName?: string;
        dueAt?: string | null;
        priority: MosChatTaskPriority;
      }
    ) => Promise<void>;
    handleSubmitNegotiation: (task: MosChatTaskItem, proposedDeadline: string, reason: string) => Promise<void>;
    handleSubmitMission: (
      task: MosChatTaskItem,
      missionData: { title: string; type: 'BUG' | 'FEATURE'; note: string }
    ) => Promise<void>;
    handleGoToSourceMessage: (task: MosChatTaskItem) => void;
  };
}

export const MobileAppModalsAndSheets: React.FC<MobileAppModalsAndSheetsProps> = ({
  standalone,
  isDark,
  currentUser,
  activeConversation,
  conversations,
  staffDirectory,
  pinnedConvIds,
  selectedMsgForAction,
  setSelectedMsgForAction,
  setActiveThreadMsg,
  setMobileView,
  setActiveConvId,
  setActiveSubtab,
  sendMessage,
  editMessage,
  forwardMessage,
  updateSpaceConfig,
  togglePinConversation,
  actionSheetOpen,
  setActionSheetOpen,
  ckEditorOpen,
  setCkEditorOpen,
  composerText,
  setComposerText,
  attachedImages,
  setAttachedImages,
  stagedCustomerCard,
  setStagedCustomerCard,
  customerPickerOpen,
  setCustomerPickerOpen,
  stickerPickerOpen,
  setStickerPickerOpen,
  stickerPickerInitialPack,
  setStickerPickerInitialPack,
  editingMessage,
  setEditingMessage,
  movingMsgForThread,
  setMovingMsgForThread,
  prevMsgForMoving,
  movingReplyForThread,
  setMovingReplyForThread,
  forwardTarget,
  setForwardTarget,
  spaceConfigModalOpen,
  setSpaceConfigModalOpen,
  spaceMembersModalOpen,
  setSpaceMembersModalOpen,
  pushModalOpen,
  setPushModalOpen,
  themeSheetOpen,
  setThemeSheetOpen,
  fileInputRef,
  videoInputRef,
  handleSelectSticker,
  nav,
  taskWorkflow,
}) => {
  return (
    <>
      <MosChatMobileActionSheet
        open={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        onSelectCustomer={() => setCustomerPickerOpen(true)}
        onSelectCKEditor={() => setCkEditorOpen(true)}
        onSelectFile={() => fileInputRef.current?.click()}
        onSelectImage={() => fileInputRef.current?.click()}
        onSelectVideo={() => videoInputRef.current?.click()}
        onSelectDrive={() => antdMessage.info('Mở liên kết Google Drive')}
        onSelectTask={() => taskWorkflow.openCreateTaskModal()}
        onSelectWorkflow={() => antdMessage.info('Kích hoạt quy trình làm việc')}
        onSelectSticker={() => {
          setStickerPickerInitialPack('wings');
          setStickerPickerOpen(true);
        }}
        onSelectVoice={() => antdMessage.info('Giữ nút Mic để thu âm giọng nói')}
        onSelectAiCopilot={() => {
          setActiveConvId(AI_COPILOT_CONV_ID);
          setMobileView('room');
          setActiveSubtab('chat');
        }}
      />

      <MosChatRichEditorModal
        open={ckEditorOpen}
        zIndex={2000}
        onClose={() => setCkEditorOpen(false)}
        initialValue={composerText}
        initialMode="compact"
        isDark={isDark}
        title="Soạn thảo phong phú (CKEditor)"
        onApply={(text) => {
          setComposerText(text);
          antdMessage.success('Đã áp dụng nội dung CKEditor vào ô chat');
        }}
        onSend={async (text) => {
          if (text.trim()) {
            await sendMessage(text, {
              attachments: attachedImages.length > 0 ? attachedImages : undefined,
              customerCard: stagedCustomerCard || undefined,
            });
            setComposerText('');
            setAttachedImages([]);
            setStagedCustomerCard(null);
          }
        }}
      />

      <MosChatCustomerPickerModal
        open={customerPickerOpen}
        zIndex={1400}
        onClose={() => setCustomerPickerOpen(false)}
        onSelectCustomerCard={(card, sendImmediately = false) => {
          if (sendImmediately) {
            sendMessage(`Đính kèm thẻ khách hàng ${card.name}:`, { customerCard: card });
            antdMessage.success(`Đã gửi thẻ khách hàng ${card.name}`);
          } else {
            setStagedCustomerCard(card);
            antdMessage.success(`Đã đính kèm thẻ khách hàng ${card.name} vào ô soạn thảo`);
          }
          setCustomerPickerOpen(false);
        }}
      />

      <MosChatMobileReactionSheet
        message={selectedMsgForAction}
        onClose={() => setSelectedMsgForAction(null)}
        onOpenThread={(msg) => {
          setActiveThreadMsg(msg);
          setMobileView('thread');
        }}
        onCreateTaskFromMsg={taskWorkflow.handleCreateTaskFromMsg}
        onEditMessage={(msg) => setEditingMessage(msg)}
        onOpenMoveThread={(msg) => setMovingMsgForThread(msg)}
        onForwardMessage={(msg) => setForwardTarget({ message: msg })}
      />

      <MosChatForwardModal
        open={forwardTarget !== null}
        onClose={() => setForwardTarget(null)}
        sourceConversation={activeConversation}
        sourceMessage={forwardTarget?.message || null}
        sourceReply={forwardTarget?.reply || null}
        conversations={conversations}
        staffDirectory={staffDirectory}
        currentUser={currentUser}
        pinnedIds={Array.from(pinnedConvIds || [])}
        isDark={isDark}
        onSubmit={async (payload) => {
          if (!forwardMessage) return null;
          return forwardMessage(payload);
        }}
        onNavigateToConversation={(cid) => {
          setActiveConvId(cid);
          setActiveSubtab('chat');
          setMobileView('room');
        }}
      />

      <MosChatMobileReactionUsersSheet />
      <MosChatMobileSeenUsersSheet />

      <MosChatMobileMoveThreadModal
        open={movingMsgForThread !== null}
        sourceMessage={movingMsgForThread}
        prevMessage={prevMsgForMoving}
        onClose={() => setMovingMsgForThread(null)}
      />

      <MosChatMobileMoveThreadModal
        open={movingReplyForThread !== null}
        sourceMessage={movingReplyForThread?.parentMsg || null}
        replyId={movingReplyForThread?.replyId}
        onClose={() => setMovingReplyForThread(null)}
      />

      <MosChatMobileEditModal
        open={editingMessage !== null}
        initialText={editingMessage?.text || ''}
        title="Chỉnh sửa tin nhắn"
        onClose={() => setEditingMessage(null)}
        onSave={async (newText) => {
          if (!editingMessage) return;
          await editMessage(editingMessage.id, newText);
          antdMessage.success('Đã lưu chỉnh sửa tin nhắn');
        }}
      />

      <MosChatMobileStickerSheet
        open={stickerPickerOpen}
        onClose={() => setStickerPickerOpen(false)}
        initialPack={stickerPickerInitialPack}
        onSelectSticker={handleSelectSticker}
        onSelectEmoji={(emoji) => {
          setComposerText((prev) => `${prev}${emoji}`);
        }}
        currentText={composerText}
        onSend={() => {
          const trimmed = composerText.trim();
          if (trimmed) {
            sendMessage(trimmed);
            setComposerText('');
          }
        }}
      />

      <MobileQuickTaskModal
        open={taskWorkflow.taskModalOpen}
        editingTaskForModal={taskWorkflow.editingTaskForModal}
        inThread={Boolean(taskWorkflow.taskThreadContext?.inThread)}
        taskTitle={taskWorkflow.taskTitle}
        taskAssigneeId={taskWorkflow.taskAssigneeId}
        taskDueAt={taskWorkflow.taskDueAt}
        taskPriority={taskWorkflow.taskPriority}
        assigneeOptions={taskWorkflow.assigneeOptions}
        staffDirectory={staffDirectory}
        onCancel={taskWorkflow.closeTaskModal}
        onOk={taskWorkflow.handleConfirmCreateTask}
        onChangeTitle={taskWorkflow.setTaskTitle}
        onChangeAssignee={taskWorkflow.setTaskAssigneeId}
        onChangeDueAt={taskWorkflow.setTaskDueAt}
        onChangePriority={taskWorkflow.setTaskPriority}
      />

      <MosChatMobileMediaGallery
        open={nav.streamGallery.open}
        images={nav.streamGallery.images}
        initialIndex={nav.streamGallery.initialIndex}
        onClose={() => nav.setStreamGallery((prev) => ({ ...prev, open: false }))}
      />

      <MosChatMobileTaskDetailSheet
        task={taskWorkflow.selectedDetailTask}
        open={taskWorkflow.selectedDetailTask !== null}
        onClose={() => taskWorkflow.setSelectedDetailTaskId(null)}
        onEditTask={(task) => taskWorkflow.setEditingTaskId(task.id)}
        onNegotiateDeadline={(task) => taskWorkflow.setNegotiatingTaskId(task.id)}
        onDispatchMission={(task) => taskWorkflow.setMissionTaskId(task.id)}
        onGoToSourceMessage={taskWorkflow.handleGoToSourceMessage}
      />

      <MosChatMobileEditTaskModal
        task={taskWorkflow.editingTask}
        open={taskWorkflow.editingTask !== null}
        onClose={() => taskWorkflow.setEditingTaskId(null)}
        onSave={taskWorkflow.handleSaveEditedTask}
      />

      <MosChatMobileNegotiateTaskModal
        task={taskWorkflow.negotiatingTask}
        open={taskWorkflow.negotiatingTask !== null}
        onClose={() => taskWorkflow.setNegotiatingTaskId(null)}
        onSubmit={taskWorkflow.handleSubmitNegotiation}
      />

      <MosChatMobileMissionModal
        task={taskWorkflow.missionTask}
        open={taskWorkflow.missionTask !== null}
        onClose={() => taskWorkflow.setMissionTaskId(null)}
        onSubmit={taskWorkflow.handleSubmitMission}
      />

      <MosChatSpaceConfigModal
        open={spaceConfigModalOpen}
        conversation={activeConversation ?? null}
        onClose={() => setSpaceConfigModalOpen(false)}
        onOpenMembersModal={() => setSpaceMembersModalOpen(true)}
        isPinned={activeConversation ? Boolean(pinnedConvIds?.has(activeConversation.id)) : false}
        togglePinConversation={togglePinConversation}
        onUpdated={(updated) => {
          if (updateSpaceConfig && activeConversation) {
            void updateSpaceConfig(activeConversation.id, {
              name: updated.name,
              subtitle: updated.subtitle,
              avatar: updated.avatar,
              color: updated.color,
            });
          }
        }}
      />

      <MosChatSpaceMembersModal
        open={spaceMembersModalOpen}
        conversation={activeConversation ?? null}
        onClose={() => setSpaceMembersModalOpen(false)}
      />

      <MosChatMobileSearchSheet
        open={nav.searchSheetOpen}
        onClose={() => nav.setSearchSheetOpen(false)}
        activeConversation={activeConversation}
        onSelectMessage={nav.handleSelectSearchResult}
        initialQuery={nav.searchInitialQuery}
        initialScope={nav.searchInitialScope}
      />

      <MosChatPushNotificationModal
        open={pushModalOpen}
        onClose={() => setPushModalOpen(false)}
        isSupported={nav.webPush.isSupported}
        isIos={nav.webPush.isIos}
        isStandalonePwa={nav.webPush.isStandalonePwa}
        needsIosHomeScreen={nav.webPush.needsIosHomeScreen}
        permission={nav.webPush.permission}
        isSubscribed={nav.webPush.isSubscribed}
        subscribedCount={nav.webPush.subscribedCount}
        isLoading={nav.webPush.isLoading}
        testCountdown={nav.webPush.testCountdown}
        onEnablePush={() => void nav.webPush.enablePushNotifications()}
        onDisablePush={() => void nav.webPush.disablePushNotifications()}
        onSendTestPush={() => void nav.webPush.sendDelayedTestPush(4)}
        onSendTestCallPush={() => void nav.webPush.sendTestCallPushNow(activeConversation?.id)}
      />

      {standalone && (
        <MosChatVoiceCallWidget
          currentCall={nav.standaloneVoiceCall.currentCall}
          incomingCall={nav.standaloneVoiceCall.incomingCall}
          isMuted={nav.standaloneVoiceCall.isMuted}
          isSpeakerMuted={nav.standaloneVoiceCall.isSpeakerMuted}
          durationSec={nav.standaloneVoiceCall.durationSec}
          speakingStaffIds={nav.standaloneVoiceCall.speakingStaffIds}
          audioWarning={nav.standaloneVoiceCall.audioWarning}
          isConnecting={nav.standaloneVoiceCall.isConnecting}
          isDark={isDark}
          onAcceptIncoming={(callId) => void nav.standaloneVoiceCall.acceptIncomingCall(callId)}
          onDeclineIncoming={(callId) => void nav.standaloneVoiceCall.declineIncomingCall(callId)}
          onToggleMute={() => void nav.standaloneVoiceCall.toggleMute()}
          onToggleSpeakerMute={nav.standaloneVoiceCall.toggleSpeakerMute}
          onEndCall={() => void nav.standaloneVoiceCall.endCurrentCall()}
        />
      )}

      <UnifiedProfileSheet
        open={themeSheetOpen}
        onClose={() => setThemeSheetOpen(false)}
        appContext="chat"
        user={currentUser}
      />

      <MosChatGoogleWorkspaceDrawer
        isMobile={true}
        isDark={isDark}
        activeConversationId={activeConversation?.id}
        onPostAiReplyToChat={(replyText, docTitle) => {
          void sendMessage(`✨ **Phân tích AI (${docTitle}):**\n\n${replyText}`);
        }}
      />

      <MosChatOmiCallDialerModal isDark={isDark} currentUser={currentUser} />
    </>
  );
};
