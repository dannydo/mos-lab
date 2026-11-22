'use client';

import React from 'react';
import type { GlobalToken } from 'antd';
import type { MosChatConversation, MosChatTaskItem, SafeAny } from '@mos-lab/shared';
import type { usePortalAttachmentsAndPaste } from '../hooks/usePortalAttachmentsAndPaste';
import type { usePortalAvatarAndPresence } from '../hooks/usePortalAvatarAndPresence';
import type { usePortalBootstrapAndRealtime } from '../hooks/usePortalBootstrapAndRealtime';
import type { usePortalComposerRefs } from '../hooks/usePortalComposerRefs';
import type { usePortalDockState } from '../hooks/usePortalDockState';
import type { usePortalLayoutAndResize } from '../hooks/usePortalLayoutAndResize';
import type { usePortalMentionAutocomplete } from '../hooks/usePortalMentionAutocomplete';
import type { usePortalMessageSending } from '../hooks/usePortalMessageSending';
import type { usePortalNavigationAndShortcuts } from '../hooks/usePortalNavigationAndShortcuts';
import type { usePortalReadSync } from '../hooks/usePortalReadSync';
import type { usePortalSidebarActions } from '../hooks/usePortalSidebarActions';
import type { usePortalSidebarPrefs } from '../hooks/usePortalSidebarPrefs';
import type { usePortalSpacesAndDockActions } from '../hooks/usePortalSpacesAndDockActions';
import type { usePortalTaskActions } from '../hooks/usePortalTaskActions';
import type { usePortalTaskModals } from '../hooks/usePortalTaskModals';
import type { usePortalUiAdapters } from '../hooks/usePortalUiAdapters';
import { MosChatDockedWindows } from './MosChatDockedWindows';
import { MosChatReminderAlert } from './MosChatReminderAlert';
import { MosChatVoiceCallWidget } from './MosChatVoiceCallWidget';

export interface MosChatDesktopOverlaysProps {
  isDark: boolean;
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  accentContrast: string;
  currentUser?: SafeAny;
  conversations: MosChatConversation[];
  tasks: MosChatTaskItem[];
  onToggle: () => void;
  layout: ReturnType<typeof usePortalLayoutAndResize>;
  dock: ReturnType<typeof usePortalDockState>;
  composerRefs: ReturnType<typeof usePortalComposerRefs>;
  avatarPresence: ReturnType<typeof usePortalAvatarAndPresence>;
  sidebarPrefs: ReturnType<typeof usePortalSidebarPrefs>;
  sidebarActions: ReturnType<typeof usePortalSidebarActions>;
  attachments: ReturnType<typeof usePortalAttachmentsAndPaste>;
  realtime: ReturnType<typeof usePortalBootstrapAndRealtime>;
  readSync: ReturnType<typeof usePortalReadSync>;
  navActions: ReturnType<typeof usePortalNavigationAndShortcuts>;
  mentions: ReturnType<typeof usePortalMentionAutocomplete>;
  spacesDock: ReturnType<typeof usePortalSpacesAndDockActions>;
  msgSending: ReturnType<typeof usePortalMessageSending>;
  taskModals: ReturnType<typeof usePortalTaskModals>;
  taskActions: ReturnType<typeof usePortalTaskActions>;
  uiAdapters: ReturnType<typeof usePortalUiAdapters>;
}

export const MosChatDesktopOverlays: React.FC<MosChatDesktopOverlaysProps> = ({
  isDark,
  token,
  surfaceBg,
  surfaceRaised,
  canvasBg,
  borderColor,
  borderStrong,
  accentColor,
  accentSoftBg,
  accentBorder,
  accentContrast,
  currentUser,
  conversations,
  tasks,
  onToggle,
  layout,
  dock,
  composerRefs,
  avatarPresence,
  sidebarPrefs,
  sidebarActions,
  attachments,
  realtime,
  readSync,
  navActions,
  mentions,
  spacesDock,
  msgSending,
  taskModals,
  taskActions,
  uiAdapters,
}) => (
  <>
    <MosChatDockedWindows
      isMobile={layout.isMobile}
      dockedConvIds={dock.dockedConvIds}
      conversations={conversations}
      collapsedDockIds={dock.collapsedDockIds}
      setCollapsedDockIds={dock.setCollapsedDockIds}
      userPrefs={sidebarPrefs.userPrefs}
      getEffectiveUnreadCount={sidebarPrefs.getEffectiveUnreadCount}
      dockAttachments={dock.dockAttachments}
      setDockAttachments={dock.setDockAttachments}
      dockInputs={dock.dockInputs}
      setDockInputs={dock.setDockInputs}
      surfaceBg={surfaceBg}
      surfaceRaised={surfaceRaised}
      canvasBg={canvasBg}
      borderColor={borderColor}
      borderStrong={borderStrong}
      accentColor={accentColor}
      accentSoftBg={accentSoftBg}
      accentBorder={accentBorder}
      accentContrast={accentContrast}
      isDark={isDark}
      currentUser={currentUser}
      token={token}
      renderUserAvatarNode={avatarPresence.renderUserAvatarNode}
      isConversationParticipantOnline={avatarPresence.isConversationParticipantOnline}
      togglePinConversation={sidebarActions.togglePinConversation}
      toggleManualUnreadConversation={sidebarActions.toggleManualUnreadConversation}
      selectConversation={readSync.selectConversation}
      onToggle={onToggle}
      setDockedConvIds={dock.setDockedConvIds}
      dockMessagesContainerRefs={dock.dockMessagesContainerRefs}
      isMessageFromCurrentUser={avatarPresence.isMessageFromCurrentUser}
      getMessageReadBreakdown={uiAdapters.getMessageReadBreakdown}
      renderReadStatusCheckmark={uiAdapters.renderReadStatusCheckmark}
      openTaskModalFromMessage={taskModals.openTaskModalFromMessage}
      renderRichTextMessage={mentions.renderRichTextMessage}
      renderMessageAttachments={uiAdapters.renderMessageAttachments}
      renderStagedAttachmentsStrip={uiAdapters.renderStagedAttachmentsStrip}
      dockInputRefs={dock.dockInputRefs}
      handleClipboardPaste={attachments.handleClipboardPaste}
      isComposingRef={composerRefs.isComposingRef}
      lastCompositionEndMsRef={composerRefs.lastCompositionEndMsRef}
      handleSendMessage={msgSending.handleSendMessage}
      openStickerPopoverKey={msgSending.openStickerPopoverKey}
      setOpenStickerPopoverKey={msgSending.setOpenStickerPopoverKey}
      renderComposerEmojiPickerContent={uiAdapters.renderComposerEmojiPickerContent}
      triggerFilePicker={attachments.triggerFilePicker}
      tasks={tasks}
      onToggleTaskDone={taskActions.handleToggleTaskDone}
      onQuickCreateTask={spacesDock.handleQuickCreateTaskForDock}
      onSendThreadReply={spacesDock.handleSendThreadReplyForDock}
      dockDimensions={dock.dockDimensions}
      setDockDimensions={dock.setDockDimensions}
      dockActiveTabs={dock.dockActiveTabs}
      setDockActiveTabs={dock.setDockActiveTabs}
      dockActiveThreadMsgIds={dock.dockActiveThreadMsgIds}
      setDockActiveThreadMsgIds={dock.setDockActiveThreadMsgIds}
      onStartVoiceCall={(cid) => void realtime.voiceCall.startOrJoinVoiceCall(cid)}
      handleOpenForwardModal={navActions.handleOpenForwardModal}
      onJumpToForwardedSource={navActions.handleJumpToForwardedSource}
    />

    <MosChatVoiceCallWidget
      currentCall={realtime.voiceCall.currentCall}
      incomingCall={realtime.voiceCall.incomingCall}
      isMuted={realtime.voiceCall.isMuted}
      isSpeakerMuted={realtime.voiceCall.isSpeakerMuted}
      durationSec={realtime.voiceCall.durationSec}
      speakingStaffIds={realtime.voiceCall.speakingStaffIds}
      audioWarning={realtime.voiceCall.audioWarning}
      isConnecting={realtime.voiceCall.isConnecting}
      isDark={isDark}
      onAcceptIncoming={(callId) => void realtime.voiceCall.acceptIncomingCall(callId)}
      onDeclineIncoming={(callId) => void realtime.voiceCall.declineIncomingCall(callId)}
      onToggleMute={() => void realtime.voiceCall.toggleMute()}
      onToggleSpeakerMute={realtime.voiceCall.toggleSpeakerMute}
      onEndCall={() => void realtime.voiceCall.endCurrentCall()}
    />

    <MosChatReminderAlert
      activeAlertTask={taskActions.activeAlertTask}
      setActiveAlertTask={taskActions.setActiveAlertTask}
      handleToggleTaskDone={taskActions.handleToggleTaskDone}
      handleSnoozeTask={taskActions.handleSnoozeTask}
      selectConversation={readSync.selectConversation}
      surfaceRaised={surfaceRaised}
      accentColor={accentColor}
      borderColor={borderColor}
      token={token}
    />
  </>
);
