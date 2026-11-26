'use client';

import React from 'react';
import { formatQuotePayload } from '../utils/quoteUtils';
import {
  DOCK_PRESET_CONFIGS,
  DOCKED_STORAGE_KEY_V2,
  type MosChatDockDimension,
  type MosChatDockPreset,
  type MosChatDockedWindowsProps,
} from './docked-windows/dockedWindowTypes';
import { useDockedWindowController } from './docked-windows/useDockedWindowController';
import { DockedWindowHeader } from './docked-windows/DockedWindowHeader';
import { DockedThreadView } from './docked-windows/DockedThreadView';
import { DockedTasksView } from './docked-windows/DockedTasksView';
import { DockedMainChatView } from './docked-windows/DockedMainChatView';

export {
  DOCK_PRESET_CONFIGS,
  DOCKED_STORAGE_KEY_V2,
  type MosChatDockDimension,
  type MosChatDockPreset,
  type MosChatDockedWindowsProps,
};

export const MosChatDockedWindows: React.FC<MosChatDockedWindowsProps> = React.memo(
  ({
    isMobile,
    dockedConvIds,
    conversations,
    collapsedDockIds,
    setCollapsedDockIds,
    userPrefs,
    getEffectiveUnreadCount,
    dockAttachments,
    setDockAttachments,
    hasActiveUploadsForScope,
    dockInputs,
    setDockInputs,
    surfaceBg,
    surfaceRaised,
    canvasBg,
    borderColor,
    borderStrong,
    accentColor,
    accentSoftBg,
    accentBorder,
    accentContrast,
    isDark = true,
    currentUser,
    staffDirectory,
    token,
    renderUserAvatarNode,
    isConversationParticipantOnline,
    togglePinConversation,
    toggleManualUnreadConversation,
    selectConversation,
    onToggle,
    setDockedConvIds,
    dockMessagesContainerRefs,
    isMessageFromCurrentUser,
    getMessageReadBreakdown,
    renderReadStatusCheckmark,
    openTaskModalFromMessage,
    renderRichTextMessage,
    renderMessageAttachments,
    renderStagedAttachmentsStrip,
    dockInputRefs,
    handleClipboardPaste,
    isComposingRef,
    lastCompositionEndMsRef,
    handleSendMessage,
    openStickerPopoverKey,
    setOpenStickerPopoverKey,
    renderComposerEmojiPickerContent,
    triggerFilePicker,
    tasks = [],
    onToggleTaskDone,
    onQuickCreateTask,
    onSendThreadReply,
    dockDimensions: externalDimensions,
    setDockDimensions: externalSetDimensions,
    dockActiveTabs: externalActiveTabs,
    setDockActiveTabs: externalSetActiveTabs,
    dockActiveThreadMsgIds: externalThreadMsgIds,
    setDockActiveThreadMsgIds: externalSetThreadMsgIds,
    onStartVoiceCall,
    handleOpenForwardModal,
    onJumpToForwardedSource,
  }) => {
    const controller = useDockedWindowController({
      dockedConvIds,
      conversations,
      dockMessagesContainerRefs,
      dockInputRefs,
      dockInputs,
      setDockInputs,
      dockAttachments,
      setDockAttachments,
      hasActiveUploadsForScope,
      isComposingRef,
      lastCompositionEndMsRef,
      handleSendMessage,
      externalDimensions,
      externalSetDimensions,
      externalActiveTabs,
      externalSetActiveTabs,
      externalThreadMsgIds,
      externalSetThreadMsgIds,
    });

    if (isMobile || dockedConvIds.length === 0) return null;

    return (
      <div
        className="mos-chat-theme-scope fixed bottom-2 right-4 flex items-end gap-3 z-[990]"
        style={{ pointerEvents: 'none', color: token.colorText }}
      >
        {dockedConvIds.map((cid) => {
          const conv = conversations.find((c) => c.id === cid);
          if (!conv) return null;

          const isCollapsed = Boolean(collapsedDockIds[cid]);
          const isDockPinned = (userPrefs.pinnedIds || []).includes(cid);
          const isDockManualUnread = (userPrefs.manualUnreadIds || []).includes(cid);
          const dockUnread = getEffectiveUnreadCount(conv);
          const dockStaged = dockAttachments[cid] || [];

          const currentDimension = controller.dimensions[cid] || DOCK_PRESET_CONFIGS.standard;
          const currentWidth = currentDimension.width || 385;
          const currentHeight = currentDimension.height || 600;
          const currentPreset = currentDimension.preset || 'standard';

          const currentTab = controller.activeTabs[cid] || 'chat';
          const activeThreadId = controller.activeThreadMsgIds[cid] || null;
          const activeThreadMsg = activeThreadId ? conv.messages.find((m) => m.id === activeThreadId) || null : null;

          const convTasks = tasks.filter((t) => t.conversationId === cid && !t.archived);
          const pendingConvTasks = convTasks.filter((t) => !t.done);
          const currentTaskFilter = controller.taskFilterScopes[cid] || 'pending';
          const filteredTasks = convTasks.filter((t) => {
            if (currentTaskFilter === 'pending') return !t.done;
            if (currentTaskFilter === 'completed') return t.done;
            return true;
          });

          const messagesToDisplay = conv.messages.slice(-40);

          return (
            <div
              key={cid}
              data-dock-conv-id={cid}
              className="group relative rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-200 backdrop-blur-xl"
              style={{
                width: `${currentWidth}px`,
                height: isCollapsed ? '46px' : `${currentHeight}px`,
                background: surfaceBg ? `${surfaceBg}f2` : 'rgba(20, 20, 20, 0.95)',
                border: `1px solid ${borderStrong || 'rgba(255, 255, 255, 0.12)'}`,
                pointerEvents: 'auto',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
              }}
            >
              <DockedWindowHeader
                cid={cid}
                conv={conv}
                currentUser={currentUser}
                staffDirectory={staffDirectory}
                isDark={isDark}
                isCollapsed={isCollapsed}
                isDockPinned={isDockPinned}
                isDockManualUnread={isDockManualUnread}
                dockUnread={dockUnread}
                currentPreset={currentPreset}
                currentWidth={currentWidth}
                currentHeight={currentHeight}
                activeThreadId={activeThreadId}
                currentTab={currentTab}
                pendingTasksCount={pendingConvTasks.length}
                surfaceRaised={surfaceRaised}
                borderColor={borderColor}
                accentColor={accentColor}
                accentSoftBg={accentSoftBg}
                accentBorder={accentBorder}
                token={token}
                renderUserAvatarNode={renderUserAvatarNode}
                isConversationParticipantOnline={isConversationParticipantOnline}
                onStartResizing={controller.startResizing}
                onToggleCollapse={(targetId) => setCollapsedDockIds((p) => ({ ...p, [targetId]: !p[targetId] }))}
                onBackFromThread={(targetId) =>
                  controller.setActiveThreadMsgIds((prev) => ({ ...prev, [targetId]: null }))
                }
                onStartVoiceCall={onStartVoiceCall}
                onCyclePreset={controller.handleCyclePreset}
                onTogglePin={togglePinConversation}
                onToggleManualUnread={toggleManualUnreadConversation}
                onExpandFullScreen={(targetId) => {
                  selectConversation(targetId);
                  onToggle();
                }}
                onCloseDock={(targetId) => setDockedConvIds((prev) => prev.filter((id) => id !== targetId))}
                onSelectTab={(targetId, tab) => controller.setActiveTabs((p) => ({ ...p, [targetId]: tab }))}
              />

              {!isCollapsed && (
                <div
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                  style={{ background: canvasBg || 'transparent' }}
                >
                  {activeThreadId && activeThreadMsg ? (
                    <DockedThreadView
                      cid={cid}
                      activeThreadMsg={activeThreadMsg}
                      replyValue={controller.threadReplyInputs[cid] || ''}
                      showScrollBottom={Boolean(controller.showScrollBottomThreadByConv[cid])}
                      surfaceBg={surfaceBg}
                      surfaceRaised={surfaceRaised}
                      borderColor={borderColor}
                      accentColor={accentColor}
                      accentSoftBg={accentSoftBg}
                      accentBorder={accentBorder}
                      accentContrast={accentContrast}
                      token={token}
                      renderUserAvatarNode={renderUserAvatarNode}
                      isMessageFromCurrentUser={isMessageFromCurrentUser}
                      renderRichTextMessage={renderRichTextMessage}
                      renderMessageAttachments={renderMessageAttachments}
                      onAttachThreadFeed={controller.attachThreadFeed}
                      onThreadFeedScroll={controller.handleThreadFeedScroll}
                      onScrollToBottomThread={controller.scrollToBottomThread}
                      onScrollToThreadMessage={controller.scrollToThreadMessage}
                      onChangeReplyInput={(targetId, val) =>
                        controller.setThreadReplyInputs((p) => ({ ...p, [targetId]: val }))
                      }
                      onQuoteReply={(targetId, senderName, text) =>
                        controller.setThreadReplyInputs((p) => ({
                          ...p,
                          [targetId]: formatQuotePayload(senderName, text, p[targetId] || ''),
                        }))
                      }
                      onSendThreadReply={onSendThreadReply}
                      handleOpenForwardModal={handleOpenForwardModal}
                    />
                  ) : currentTab === 'tasks' ? (
                    <DockedTasksView
                      cid={cid}
                      convTasks={convTasks}
                      pendingConvTasksCount={pendingConvTasks.length}
                      currentTaskFilter={currentTaskFilter}
                      filteredTasks={filteredTasks}
                      quickTaskValue={controller.quickTaskInputs[cid] || ''}
                      surfaceRaised={surfaceRaised}
                      borderColor={borderColor}
                      accentColor={accentColor}
                      accentSoftBg={accentSoftBg}
                      accentBorder={accentBorder}
                      token={token}
                      onSelectFilter={(targetId, scope) =>
                        controller.setTaskFilterScopes((p) => ({ ...p, [targetId]: scope }))
                      }
                      onOpenTaskModal={openTaskModalFromMessage}
                      onChangeQuickTaskInput={(targetId, val) =>
                        controller.setQuickTaskInputs((p) => ({ ...p, [targetId]: val }))
                      }
                      onQuickCreateTask={onQuickCreateTask}
                      onToggleTaskDone={onToggleTaskDone}
                    />
                  ) : (
                    <DockedMainChatView
                      cid={cid}
                      conv={conv}
                      conversations={conversations}
                      messagesToDisplay={messagesToDisplay}
                      dockInputValue={dockInputs[cid] || ''}
                      dockStaged={dockStaged}
                      showScrollBottom={Boolean(controller.showScrollBottomByConv[cid])}
                      openStickerPopoverKey={openStickerPopoverKey}
                      surfaceBg={surfaceBg}
                      surfaceRaised={surfaceRaised}
                      borderColor={borderColor}
                      accentColor={accentColor}
                      accentSoftBg={accentSoftBg}
                      accentBorder={accentBorder}
                      accentContrast={accentContrast}
                      isDark={Boolean(isDark)}
                      token={token}
                      renderUserAvatarNode={renderUserAvatarNode}
                      isMessageFromCurrentUser={isMessageFromCurrentUser}
                      getMessageReadBreakdown={getMessageReadBreakdown}
                      renderReadStatusCheckmark={renderReadStatusCheckmark}
                      openTaskModalFromMessage={openTaskModalFromMessage}
                      renderRichTextMessage={renderRichTextMessage}
                      renderMessageAttachments={renderMessageAttachments}
                      renderStagedAttachmentsStrip={renderStagedAttachmentsStrip}
                      handleClipboardPaste={handleClipboardPaste}
                      setOpenStickerPopoverKey={setOpenStickerPopoverKey}
                      renderComposerEmojiPickerContent={renderComposerEmojiPickerContent}
                      triggerFilePicker={triggerFilePicker}
                      handleOpenForwardModal={handleOpenForwardModal}
                      onJumpToForwardedSource={onJumpToForwardedSource}
                      onAttachMessagesContainer={controller.attachMessagesContainer}
                      onAttachDockInput={controller.attachDockInput}
                      onFeedScroll={controller.handleFeedScroll}
                      onScrollToBottom={controller.scrollToBottom}
                      onScrollToDockMessage={controller.scrollToDockMessage}
                      onOpenThread={(targetId, msgId) =>
                        controller.setActiveThreadMsgIds((p) => ({ ...p, [targetId]: msgId }))
                      }
                      onChangeDockInput={(targetId, val) => setDockInputs((p) => ({ ...p, [targetId]: val }))}
                      onMarkCompositionStart={controller.markCompositionStart}
                      onMarkCompositionEnd={controller.markCompositionEnd}
                      isInputComposing={controller.isInputComposing}
                      onSubmitDockMessage={controller.submitDockMessage}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  },
  (prev, next) => {
    if (!prev.dockedConvIds.length && !next.dockedConvIds.length) {
      return true;
    }
    return (
      prev.isMobile === next.isMobile &&
      prev.dockedConvIds === next.dockedConvIds &&
      prev.conversations === next.conversations &&
      prev.collapsedDockIds === next.collapsedDockIds &&
      prev.userPrefs === next.userPrefs &&
      prev.dockAttachments === next.dockAttachments &&
      prev.pendingUploads === next.pendingUploads &&
      prev.dockInputs === next.dockInputs &&
      prev.openStickerPopoverKey === next.openStickerPopoverKey &&
      prev.tasks === next.tasks &&
      prev.dockDimensions === next.dockDimensions &&
      prev.dockActiveTabs === next.dockActiveTabs &&
      prev.dockActiveThreadMsgIds === next.dockActiveThreadMsgIds &&
      prev.surfaceBg === next.surfaceBg
    );
  }
);

MosChatDockedWindows.displayName = 'MosChatDockedWindows';
