'use client';

import React from 'react';
import type { GlobalToken } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  MosChatConversation,
  MosChatImageAttachment,
  MosChatMessage,
  MosChatMissionSummary,
  MosChatReadReceiptEntry,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatThreadReadReceiptEntry,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import {
  MosChatComposerEmojiPickerPopover,
  MosChatReactionPickerPopover,
} from '../components/MosChatEmojiPickerPopovers';
import { MosChatLiveMissionCard } from '../components/MosChatLiveMissionCard';
import { MosChatMessageAttachments } from '../components/MosChatMessageAttachments';
import { MosChatMiniSeenAvatarStack, MosChatReadStatusCheckmark } from '../components/MosChatReadReceiptViews';
import { MosChatStagedAttachmentsStrip } from '../components/MosChatStagedAttachmentsStrip';
import { MosChatTaskCard } from '../components/MosChatTaskCard';
import type { usePortalAttachmentsAndPaste } from './usePortalAttachmentsAndPaste';
import type { usePortalAvatarAndPresence } from './usePortalAvatarAndPresence';
import type { usePortalComposerRefs } from './usePortalComposerRefs';
import type { usePortalDockState } from './usePortalDockState';
import type { usePortalMessageMutations } from './usePortalMessageMutations';
import type { usePortalMessageSending } from './usePortalMessageSending';
import type { usePortalMissionActions } from './usePortalMissionActions';
import type { usePortalTaskActions } from './usePortalTaskActions';
import type { usePortalTaskModals } from './usePortalTaskModals';
import type { MosChatStickerPackId } from '../mos-chat-stickers';
import { useChatReadReceipts } from '../shared/hooks/useChatReadReceipts';

export interface UsePortalUiAdaptersParams {
  isDark: boolean;
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  currentUser?: SafeAny;
  currentUserStaffId?: string | number;
  isStrictDannySuperAdmin: boolean;
  conversations: MosChatConversation[];
  activeConversation?: MosChatConversation;
  activeThreadMessage: MosChatMessage | null;
  staffDirectory: MosChatStaffMember[];
  expandedChecklistTaskIds: Record<string, boolean>;
  setExpandedChecklistTaskIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  avatarPresence: ReturnType<typeof usePortalAvatarAndPresence>;
  attachments: ReturnType<typeof usePortalAttachmentsAndPaste>;
  composerRefs: ReturnType<typeof usePortalComposerRefs>;
  dock: ReturnType<typeof usePortalDockState>;
  msgMutations: ReturnType<typeof usePortalMessageMutations>;
  msgSending: ReturnType<typeof usePortalMessageSending>;
  taskModals: ReturnType<typeof usePortalTaskModals>;
  taskActions: ReturnType<typeof usePortalTaskActions>;
  missionActions: ReturnType<typeof usePortalMissionActions>;
  selectConversation: (convId: string) => void;
  handleOpenThread: (msgId: string, convIdOverride?: string, options?: { autoFocus?: boolean }) => void;
  antdMessage: MessageInstance;
}

export function usePortalUiAdapters({
  isDark,
  token,
  surfaceBg,
  surfaceRaised,
  borderColor,
  borderStrong,
  currentUser,
  currentUserStaffId,
  isStrictDannySuperAdmin,
  conversations,
  activeConversation,
  activeThreadMessage,
  staffDirectory,
  expandedChecklistTaskIds,
  setExpandedChecklistTaskIds,
  avatarPresence,
  attachments,
  composerRefs,
  dock,
  msgMutations,
  msgSending,
  taskModals,
  taskActions,
  missionActions,
  selectConversation,
  handleOpenThread,
}: UsePortalUiAdaptersParams) {
  const {
    getMessageReadBreakdown,
    getConversationThreadReplyReadBreakdown: getThreadReplyReadBreakdown,
    stoppedReadersByMsgId,
    stoppedReadersByReplyId,
  } = useChatReadReceipts({
    activeConversation,
    activeThreadMessage,
    currentUserId: currentUserStaffId || currentUser?.id,
  });

  const renderLiveMissionCard = (
    mission: MosChatMissionSummary,
    msg?: MosChatMessage | null,
    mode: 'thread' | 'inline' | 'task' | 'embedded' = 'inline'
  ) => (
    <MosChatLiveMissionCard
      mission={mission}
      msg={msg}
      mode={mode}
      isDark={isDark}
      token={token}
      surfaceBg={surfaceBg}
      surfaceRaised={surfaceRaised}
      borderColor={borderColor}
      borderStrong={borderStrong}
      activeConversation={activeConversation}
      isStrictDannySuperAdmin={isStrictDannySuperAdmin}
      missionReopenInputOpenByReportId={missionActions.missionReopenInputOpenByReportId}
      setMissionReopenInputOpenByReportId={missionActions.setMissionReopenInputOpenByReportId}
      missionReopenFeedbackByReportId={missionActions.missionReopenFeedbackByReportId}
      setMissionReopenFeedbackByReportId={missionActions.setMissionReopenFeedbackByReportId}
      missionActionLoadingKey={missionActions.missionActionLoadingKey}
      handleMissionInlineAction={missionActions.handleMissionInlineAction}
      selectConversation={selectConversation}
      handleOpenThread={handleOpenThread}
    />
  );

  const renderTaskCard = (
    task: MosChatTaskItem,
    sourceMsg?: MosChatMessage | null,
    mode: 'inline' | 'list' | 'thread' = 'inline'
  ) => (
    <MosChatTaskCard
      key={task.id}
      task={task}
      sourceMsg={sourceMsg}
      mode={mode}
      isDark={isDark}
      token={token}
      surfaceRaised={surfaceRaised}
      borderColor={borderColor}
      currentUser={currentUser}
      isStrictDannySuperAdmin={isStrictDannySuperAdmin}
      conversations={conversations}
      activeConversation={activeConversation}
      staffDirectory={staffDirectory}
      expandedChecklistTaskIds={expandedChecklistTaskIds}
      setExpandedChecklistTaskIds={setExpandedChecklistTaskIds}
      renderUserAvatarNode={avatarPresence.renderUserAvatarNode}
      renderLiveMissionCard={renderLiveMissionCard}
      handleToggleTaskDone={taskActions.handleToggleTaskDone}
      selectConversation={selectConversation}
      handleOpenThread={handleOpenThread}
      handleUpdateTask={taskActions.handleUpdateTask}
      openEditTaskModal={taskModals.openEditTaskModal}
      handleAcceptNegotiatedDeadline={taskModals.handleAcceptNegotiatedDeadline}
      handleRejectNegotiatedDeadline={taskModals.handleRejectNegotiatedDeadline}
      handleOpenNegotiateModal={taskModals.handleOpenNegotiateModal}
      openMissionModalFromChat={missionActions.openMissionModalFromChat}
      handleToggleArchiveTask={taskActions.handleToggleArchiveTask}
      handleDeleteTask={taskActions.handleDeleteTask}
      triggerTaskReminderAlert={taskActions.triggerTaskReminderAlert}
    />
  );

  const renderMessageAttachments = (atts?: MosChatImageAttachment[], compact = false, isMine = false) => (
    <MosChatMessageAttachments
      attachments={atts}
      compact={compact}
      isMine={isMine}
      isDark={isDark}
      token={token}
      surfaceRaised={surfaceRaised}
      borderStrong={borderStrong}
      openLightbox={attachments.openLightbox}
    />
  );

  const renderReadStatusCheckmark = (
    seenBy: MosChatReadReceiptEntry[] | MosChatThreadReadReceiptEntry[],
    unseenBy: MosChatReadReceiptEntry[] | MosChatThreadReadReceiptEntry[],
    options?: { compact?: boolean; scopeLabel?: string; showLabel?: boolean }
  ) => (
    <MosChatReadStatusCheckmark
      seenBy={seenBy}
      unseenBy={unseenBy}
      compact={options?.compact}
      scopeLabel={options?.scopeLabel}
      showLabel={options?.showLabel}
      isDark={isDark}
      renderUserAvatarNode={avatarPresence.renderUserAvatarNode}
    />
  );

  const renderMiniSeenAvatarStack = (
    readers: MosChatReadReceiptEntry[] | MosChatThreadReadReceiptEntry[],
    unseenBy: MosChatReadReceiptEntry[] | MosChatThreadReadReceiptEntry[] = [],
    options?: { align?: 'left' | 'right'; compact?: boolean; scopeLabel?: string }
  ) => (
    <MosChatMiniSeenAvatarStack
      readers={readers}
      unseenBy={unseenBy}
      align={options?.align}
      compact={options?.compact}
      scopeLabel={options?.scopeLabel}
      isDark={isDark}
      surfaceBg={surfaceBg}
      renderUserAvatarNode={avatarPresence.renderUserAvatarNode}
    />
  );

  const renderStagedAttachmentsStrip = (
    items: MosChatImageAttachment[],
    scope: 'main' | 'thread' | 'dock',
    convId?: string
  ) => (
    <MosChatStagedAttachmentsStrip
      items={items}
      scope={scope}
      convId={convId}
      uploadingCount={attachments.uploadingCount}
      pendingUploads={attachments.pendingUploads}
      onCancelPendingUpload={attachments.cancelPendingUpload}
      onRetryPendingUpload={attachments.retryPendingUpload}
      onDismissPendingUpload={attachments.dismissPendingUpload}
      token={token}
      surfaceRaised={surfaceRaised}
      borderStrong={borderStrong}
      openLightbox={attachments.openLightbox}
      removeStagedAttachment={attachments.removeStagedAttachment}
    />
  );

  const renderReactionPickerContent = (
    msgId: string,
    msgObj?: MosChatMessage | MosChatThreadReply,
    replyId?: string
  ) => (
    <MosChatReactionPickerPopover
      msgId={msgId}
      msgObj={msgObj}
      replyId={replyId}
      isDark={isDark}
      borderColor={borderColor}
      surfaceRaised={surfaceRaised}
      hasUserReacted={msgMutations.hasUserReacted}
      setOpenStickerPopoverKey={msgSending.setOpenStickerPopoverKey}
      handleToggleReaction={msgMutations.handleToggleReaction}
    />
  );

  const renderComposerEmojiPickerContent = (
    target: 'main' | 'thread' | { dockConvId: string } = 'main',
    defaultPack: MosChatStickerPackId = 'emoji'
  ) => (
    <MosChatComposerEmojiPickerPopover
      target={target}
      defaultPack={defaultPack}
      isDark={isDark}
      borderColor={borderColor}
      surfaceRaised={surfaceRaised}
      composerInputRef={composerRefs.composerInputRef}
      composerTextRef={composerRefs.composerTextRef}
      updateComposerText={composerRefs.updateComposerText}
      threadInputRef={composerRefs.threadInputRef}
      threadTextRef={composerRefs.threadTextRef}
      updateThreadInput={composerRefs.updateThreadInput}
      dockInputRefs={dock.dockInputRefs}
      setDockInputs={dock.setDockInputs}
      setOpenStickerPopoverKey={msgSending.setOpenStickerPopoverKey}
      handleSendSticker={msgSending.handleSendSticker}
    />
  );

  return {
    getMessageReadBreakdown,
    getThreadReplyReadBreakdown,
    stoppedReadersByMsgId,
    stoppedReadersByReplyId,
    renderLiveMissionCard,
    renderTaskCard,
    renderMessageAttachments,
    renderReadStatusCheckmark,
    renderMiniSeenAvatarStack,
    renderStagedAttachmentsStrip,
    renderReactionPickerContent,
    renderComposerEmojiPickerContent,
  };
}
