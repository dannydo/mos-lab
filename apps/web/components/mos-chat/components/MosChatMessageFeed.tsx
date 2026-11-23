import React, { useState, useMemo } from 'react';
import { ImagePlus, Loader2, Sparkles } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatStaffMember,
  SafeAny,
} from '@mos-lab/shared';
import { sanitizeMovedThreadDuplicates } from '../store/useChatRealtimeSync';
import { MosChatPinnedBanner } from './MosChatPinnedBanner';
import { MosChatMessageItem } from './MosChatMessageItem';

export interface MosChatMessageFeedProps {
  isMobile: boolean;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  isDark: boolean;
  token: SafeAny;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  accentSoftBg: string;
  accentBorder: string;
  pinnedMessages: MosChatMessage[];
  pinnedBannerIndex: number;
  setPinnedBannerIndex: React.Dispatch<React.SetStateAction<number>>;
  navigateToMessage: (convId: string, msgId: string) => void;
  setActiveSubtab: (tab: SafeAny) => void;
  handleTogglePin: (msgId: string) => void;
  formatMoveTargetSnippet: (msg: MosChatMessage) => string;
  mainMessagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  uniqueTasks: MosChatTaskItem[];
  isMessageFromCurrentUser: (m: MosChatMessage | SafeAny) => boolean;
  getMessageReadBreakdown: (conv: SafeAny, m: SafeAny) => { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  stoppedReadersByMsgId: Record<string, SafeAny[]>;
  canManageChatThreads: boolean;
  AI_COPILOT_CONV_ID: string;
  draggingRootMsgId: string | null;
  setDraggingRootMsgId: (id: string | null) => void;
  dragOverTargetMsgId: string | null;
  setDragOverTargetMsgId: (id: string | null) => void;
  setDragOverThreadPane: (val: boolean) => void;
  handleMoveThreadItem: (args: SafeAny) => Promise<void> | void;
  highlightedMsgId: string | null;
  getMemberNickname: (staffId: string | number) => string | undefined;
  renderReadStatusCheckmark: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  expandedThinkingIds: Record<string, boolean>;
  setExpandedThinkingIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  editingMessageId: string | null;
  editingReplyId: string | null;
  editingText: string;
  setEditingText: (text: string) => void;
  handleCancelEdit: () => void;
  handleSaveEdit: () => void;
  isSavingEdit: boolean;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  setHistoryModalMessage: (m: MosChatMessage | null) => void;
  setHistoryModalOpen: (open: boolean) => void;
  isDannyAccount: boolean;
  handleRestoreMessage: (msgId: string) => void;
  handleMessageTap: (m: MosChatMessage, e: React.MouseEvent) => void;
  heartFlyMsgId: string | null;
  renderRichTextMessage: (text?: string, isMine?: boolean) => React.ReactNode;
  appliedActionIds: Record<string, boolean>;
  handleExecuteAiAction: (action: SafeAny, msgId: string, actionKey: string) => void;
  speakingMsgId: string | null;
  ttsSpeed: number;
  handleSpeakAiMessage: (m: MosChatMessage) => void;
  handleSetTtsSpeed: (speed: number) => void;
  hasUserReacted: (m: SafeAny, emoji: string) => boolean;
  handleToggleReaction: (msgId: string, emoji: string) => void;
  mobileActiveMsgId: string | null;
  openMovePopoverKey: string | null;
  setOpenMovePopoverKey: (key: string | null) => void;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  renderReactionPickerContent: (msgId: string, m: SafeAny, replyId?: string) => React.ReactNode;
  handleOpenThread: (msgId: string) => void;
  openTaskModalFromMessage: (m: MosChatMessage) => void;
  isStrictDannySuperAdmin: boolean;
  openMissionModalFromChat: (m: MosChatMessage, linkedTask?: SafeAny) => void;
  handleBuzzMessage: (msgId: string) => void;
  handleStartEdit: (m: MosChatMessage) => void;
  handleDeleteMessage: (msgId: string) => void;
  renderMiniSeenAvatarStack: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  aiThinkingActive: boolean;
  aiElapsedSec: number;
  getThreadReplyReadBreakdown: (
    conv: SafeAny,
    rootMsg: SafeAny,
    reply: SafeAny
  ) => { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  renderTaskCard: (task: SafeAny, msg?: MosChatMessage | null, mode?: SafeAny) => React.ReactNode;
  renderLiveMissionCard: (mission: SafeAny, msg?: MosChatMessage | null, mode?: SafeAny) => React.ReactNode;
  workflowInstances: SafeAny[];
  setWorkflowInstances: React.Dispatch<React.SetStateAction<SafeAny[]>>;
  currentUserStaffMember: SafeAny;
  fetchBootstrap: (skipCache?: boolean) => Promise<SafeAny>;
  setLightboxImage: (lightbox: SafeAny) => void;
  movingThreadItemKey: string | null;
  threadOpen: boolean;
  activeThreadMessage: MosChatMessage | null;
  isDraggingOver: boolean;
  antdMessage: SafeAny;
  renderMessageAttachments?: (attachments?: SafeAny[], compact?: boolean, isMine?: boolean) => React.ReactNode;
  openCustomerDetail?: (customerId: number) => void;
  handleReplyToMessage?: (m: MosChatMessage) => void;
  handleOpenForwardModal?: (m: MosChatMessage) => void;
  accessibleConversationIds?: Set<string>;
  onJumpToForwardedSource?: (sourceConversationId: string, sourceMessageId: string) => void;
  handleOpenReactionUsers?: (target: SafeAny, initialEmoji?: string) => void;
  staffDirectory?: MosChatStaffMember[];
  onLoadOlderMessages?: (conversationId: string) => Promise<void> | void;
}

export const MosChatMessageFeed: React.FC<MosChatMessageFeedProps> = React.memo(
  ({
    isMobile,
    activeConversation,
    currentUser,
    isDark,
    token,
    surfaceRaised,
    borderColor,
    borderStrong,
    accentSoftBg,
    accentBorder,
    pinnedMessages,
    pinnedBannerIndex,
    setPinnedBannerIndex,
    navigateToMessage,
    setActiveSubtab,
    handleTogglePin,
    formatMoveTargetSnippet,
    mainMessagesContainerRef,
    messagesEndRef,
    uniqueTasks,
    isMessageFromCurrentUser,
    getMessageReadBreakdown,
    stoppedReadersByMsgId,
    canManageChatThreads,
    AI_COPILOT_CONV_ID,
    draggingRootMsgId,
    setDraggingRootMsgId,
    dragOverTargetMsgId,
    setDragOverTargetMsgId,
    setDragOverThreadPane,
    handleMoveThreadItem,
    highlightedMsgId,
    getMemberNickname,
    renderReadStatusCheckmark,
    renderUserAvatarNode,
    expandedThinkingIds,
    setExpandedThinkingIds,
    editingMessageId,
    editingReplyId,
    editingText,
    setEditingText,
    handleCancelEdit,
    handleSaveEdit,
    isSavingEdit,
    isComposingRef,
    lastCompositionEndMsRef,
    setHistoryModalMessage,
    setHistoryModalOpen,
    isDannyAccount,
    handleRestoreMessage,
    handleMessageTap,
    heartFlyMsgId,
    renderRichTextMessage,
    appliedActionIds,
    handleExecuteAiAction,
    speakingMsgId,
    ttsSpeed,
    handleSpeakAiMessage,
    handleSetTtsSpeed,
    hasUserReacted,
    handleToggleReaction,
    mobileActiveMsgId,
    openMovePopoverKey,
    setOpenMovePopoverKey: _setOpenMovePopoverKey,
    openStickerPopoverKey,
    setOpenStickerPopoverKey,
    renderReactionPickerContent,
    handleOpenThread,
    openTaskModalFromMessage,
    isStrictDannySuperAdmin,
    openMissionModalFromChat,
    handleBuzzMessage,
    handleStartEdit,
    handleDeleteMessage,
    renderMiniSeenAvatarStack,
    aiThinkingActive,
    aiElapsedSec,
    getThreadReplyReadBreakdown,
    renderTaskCard,
    renderLiveMissionCard,
    workflowInstances,
    setWorkflowInstances,
    currentUserStaffMember,
    fetchBootstrap,
    setLightboxImage,
    movingThreadItemKey,
    threadOpen,
    activeThreadMessage,
    isDraggingOver,
    antdMessage,
    renderMessageAttachments,
    openCustomerDetail,
    handleReplyToMessage,
    handleOpenForwardModal,
    accessibleConversationIds,
    onJumpToForwardedSource,
    handleOpenReactionUsers,
    staffDirectory = [],
    onLoadOlderMessages,
  }) => {
    const [openMoreMenuMsgId, setOpenMoreMenuMsgId] = useState<string | null>(null);
    const [loadingOlderConvId, setLoadingOlderConvId] = useState<string | null>(null);

    const taskByMsgOrTaskId = useMemo(() => {
      const map = new Map<string, MosChatTaskItem>();
      uniqueTasks.forEach((t) => {
        if (t.id) map.set(t.id, t);
        if (t.sourceMessageId) map.set(t.sourceMessageId, t);
      });
      return map;
    }, [uniqueTasks]);

    const visibleMessages = useMemo(() => {
      const deduplicated = sanitizeMovedThreadDuplicates(activeConversation?.messages || []);
      return deduplicated.filter(
        (m) =>
          !m.isSystemReminder &&
          m.senderId !== 'system-reminder' &&
          m.senderName !== 'mOS Reminder' &&
          !String(m.text || '').startsWith('Đến giờ nhắc việc:') &&
          m.senderName !== 'Hà My'
      );
    }, [activeConversation]);

    return (
      <>
        {isDraggingOver && !draggingRootMsgId && (
          <div
            className="absolute inset-2 rounded-xl z-20 flex flex-col items-center justify-center gap-1.5 pointer-events-none"
            style={{
              background: 'rgba(15, 23, 42, 0.84)',
              border: '2px dashed #d4a84b',
              color: '#fbbf24',
            }}
          >
            <ImagePlus size={28} />
            <span className="text-[13px] font-bold">Thả hình ảnh từ máy tính hoặc Google Drive vào đây</span>
          </div>
        )}

        <MosChatPinnedBanner
          activeConversation={activeConversation}
          pinnedMessages={pinnedMessages}
          pinnedBannerIndex={pinnedBannerIndex}
          setPinnedBannerIndex={setPinnedBannerIndex}
          isDark={isDark}
          borderColor={borderColor}
          navigateToMessage={navigateToMessage}
          setActiveSubtab={setActiveSubtab}
          handleTogglePin={handleTogglePin}
          formatMoveTargetSnippet={formatMoveTargetSnippet}
        />

        <div ref={mainMessagesContainerRef} className="flex-1 overflow-y-auto py-3">
          {activeConversation?.hasMoreMessages && onLoadOlderMessages && (
            <div className="flex justify-center pb-3 pt-1">
              <button
                type="button"
                disabled={loadingOlderConvId === activeConversation.id}
                onClick={() => {
                  const convId = activeConversation.id;
                  setLoadingOlderConvId(convId);
                  Promise.resolve(onLoadOlderMessages(convId)).finally(() => {
                    setLoadingOlderConvId((curr) => (curr === convId ? null : curr));
                  });
                }}
                className="px-3 py-1 rounded-full text-xs font-medium transition-opacity disabled:opacity-60"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                  border: `1px solid ${borderColor}`,
                  color: token.colorTextSecondary,
                }}
              >
                {loadingOlderConvId === activeConversation.id ? 'Đang tải tin nhắn cũ...' : 'Tải thêm tin nhắn cũ'}
              </button>
            </div>
          )}
          {visibleMessages.map((m, idx, filteredMessages) => {
            const linkedTask = (m.taskId ? taskByMsgOrTaskId.get(m.taskId) : undefined) || taskByMsgOrTaskId.get(m.id);
            const isMine = isMessageFromCurrentUser(m);
            const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
            const prevIsMine = prevMsg ? isMessageFromCurrentUser(prevMsg) : false;
            const isCont = Boolean(
              prevMsg &&
              prevMsg.senderName === m.senderName &&
              prevIsMine === isMine &&
              !prevMsg.isSystemReminder &&
              !m.isSystemReminder
            );
            const isAiMessage = Boolean(m.isAiBot || m.senderId === 'wings-ai-copilot');
            const msgReadBreakdown = getMessageReadBreakdown(activeConversation, m);
            const stoppedReadersForMsg = stoppedReadersByMsgId[m.id] || [];
            const canMoveThisMsg =
              (isMine || canManageChatThreads) &&
              !m.isDeleted &&
              !isAiMessage &&
              activeConversation?.id !== AI_COPILOT_CONV_ID;
            const isBeingDragged = draggingRootMsgId === m.id;
            const isDropTarget = Boolean(
              draggingRootMsgId && draggingRootMsgId !== m.id && dragOverTargetMsgId === m.id && !m.isDeleted
            );
            const quotedMessage =
              m.replyTo || (m.replyToId ? filteredMessages.find((x) => x.id === m.replyToId) : null);

            return (
              <MosChatMessageItem
                key={m.id}
                m={m}
                prevMsg={prevMsg}
                quotedMessage={quotedMessage}
                allVisibleMessages={filteredMessages}
                activeConversation={activeConversation}
                currentUser={currentUser}
                staffDirectory={staffDirectory}
                linkedTask={linkedTask}
                isMobile={isMobile}
                isMine={isMine}
                isCont={isCont}
                isAiMessage={isAiMessage}
                canMoveThisMsg={canMoveThisMsg}
                isBeingDragged={isBeingDragged}
                isDropTarget={isDropTarget}
                isHighlighted={highlightedMsgId === m.id}
                isEditingThis={editingMessageId === m.id && !editingReplyId}
                isThinkingExpanded={Boolean(expandedThinkingIds[m.id])}
                isHeartFlying={heartFlyMsgId === m.id}
                isDark={isDark}
                token={token}
                surfaceRaised={surfaceRaised}
                borderColor={borderColor}
                borderStrong={borderStrong}
                accentSoftBg={accentSoftBg}
                accentBorder={accentBorder}
                AI_COPILOT_CONV_ID={AI_COPILOT_CONV_ID}
                msgReadBreakdown={msgReadBreakdown}
                stoppedReadersForMsg={stoppedReadersForMsg}
                taskByMsgOrTaskId={taskByMsgOrTaskId}
                draggingRootMsgId={draggingRootMsgId}
                setDraggingRootMsgId={setDraggingRootMsgId}
                dragOverTargetMsgId={dragOverTargetMsgId}
                setDragOverTargetMsgId={setDragOverTargetMsgId}
                setDragOverThreadPane={setDragOverThreadPane}
                handleMoveThreadItem={handleMoveThreadItem}
                getMemberNickname={getMemberNickname}
                renderReadStatusCheckmark={renderReadStatusCheckmark}
                renderUserAvatarNode={renderUserAvatarNode}
                setExpandedThinkingIds={setExpandedThinkingIds}
                editingText={editingText}
                setEditingText={setEditingText}
                handleCancelEdit={handleCancelEdit}
                handleSaveEdit={handleSaveEdit}
                isSavingEdit={isSavingEdit}
                isComposingRef={isComposingRef}
                lastCompositionEndMsRef={lastCompositionEndMsRef}
                setHistoryModalMessage={setHistoryModalMessage}
                setHistoryModalOpen={setHistoryModalOpen}
                isDannyAccount={isDannyAccount}
                handleRestoreMessage={handleRestoreMessage}
                handleMessageTap={handleMessageTap}
                renderRichTextMessage={renderRichTextMessage}
                appliedActionIds={appliedActionIds}
                handleExecuteAiAction={handleExecuteAiAction}
                speakingMsgId={speakingMsgId}
                ttsSpeed={ttsSpeed}
                handleSpeakAiMessage={handleSpeakAiMessage}
                handleSetTtsSpeed={handleSetTtsSpeed}
                hasUserReacted={hasUserReacted}
                handleToggleReaction={handleToggleReaction}
                mobileActiveMsgId={mobileActiveMsgId}
                openMovePopoverKey={openMovePopoverKey}
                openMoreMenuMsgId={openMoreMenuMsgId}
                setOpenMoreMenuMsgId={setOpenMoreMenuMsgId}
                openStickerPopoverKey={openStickerPopoverKey}
                setOpenStickerPopoverKey={setOpenStickerPopoverKey}
                renderReactionPickerContent={renderReactionPickerContent}
                handleOpenThread={handleOpenThread}
                openTaskModalFromMessage={openTaskModalFromMessage}
                isStrictDannySuperAdmin={isStrictDannySuperAdmin}
                openMissionModalFromChat={openMissionModalFromChat}
                handleBuzzMessage={handleBuzzMessage}
                handleStartEdit={handleStartEdit}
                handleDeleteMessage={handleDeleteMessage}
                handleTogglePin={handleTogglePin}
                renderMiniSeenAvatarStack={renderMiniSeenAvatarStack}
                isMessageFromCurrentUser={isMessageFromCurrentUser}
                getThreadReplyReadBreakdown={getThreadReplyReadBreakdown}
                renderTaskCard={renderTaskCard}
                renderLiveMissionCard={renderLiveMissionCard}
                workflowInstances={workflowInstances}
                setWorkflowInstances={setWorkflowInstances}
                currentUserStaffMember={currentUserStaffMember}
                fetchBootstrap={fetchBootstrap}
                setLightboxImage={setLightboxImage}
                movingThreadItemKey={movingThreadItemKey}
                threadOpen={threadOpen}
                activeThreadMessage={activeThreadMessage}
                formatMoveTargetSnippet={formatMoveTargetSnippet}
                antdMessage={antdMessage}
                renderMessageAttachments={renderMessageAttachments}
                openCustomerDetail={openCustomerDetail}
                handleReplyToMessage={handleReplyToMessage}
                handleOpenForwardModal={handleOpenForwardModal}
                accessibleConversationIds={accessibleConversationIds}
                onJumpToForwardedSource={onJumpToForwardedSource}
                handleOpenReactionUsers={handleOpenReactionUsers}
              />
            );
          })}

          {aiThinkingActive && (
            <div className="px-4 py-2 flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)',
                }}
              >
                <Loader2 size={15} className="animate-spin" />
              </div>
              <div
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold inline-flex items-center gap-2 tabular-nums"
                style={{
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: isDark ? '#c4b5fd' : '#6d28d9',
                }}
              >
                <Sparkles size={13} />
                <span>MAI đang suy luận & phân tích dữ liệu... ({aiElapsedSec}s)</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </>
    );
  },
  (prev, next) => {
    return (
      prev.isMobile === next.isMobile &&
      prev.activeConversation === next.activeConversation &&
      prev.isDark === next.isDark &&
      prev.pinnedMessages === next.pinnedMessages &&
      prev.pinnedBannerIndex === next.pinnedBannerIndex &&
      prev.uniqueTasks === next.uniqueTasks &&
      prev.stoppedReadersByMsgId === next.stoppedReadersByMsgId &&
      prev.draggingRootMsgId === next.draggingRootMsgId &&
      prev.dragOverTargetMsgId === next.dragOverTargetMsgId &&
      prev.highlightedMsgId === next.highlightedMsgId &&
      prev.expandedThinkingIds === next.expandedThinkingIds &&
      prev.editingMessageId === next.editingMessageId &&
      prev.editingReplyId === next.editingReplyId &&
      prev.isSavingEdit === next.isSavingEdit &&
      prev.heartFlyMsgId === next.heartFlyMsgId &&
      prev.appliedActionIds === next.appliedActionIds &&
      prev.speakingMsgId === next.speakingMsgId &&
      prev.ttsSpeed === next.ttsSpeed &&
      prev.mobileActiveMsgId === next.mobileActiveMsgId &&
      prev.openMovePopoverKey === next.openMovePopoverKey &&
      prev.openStickerPopoverKey === next.openStickerPopoverKey &&
      prev.aiThinkingActive === next.aiThinkingActive &&
      prev.aiElapsedSec === next.aiElapsedSec &&
      prev.workflowInstances === next.workflowInstances &&
      prev.movingThreadItemKey === next.movingThreadItemKey &&
      prev.threadOpen === next.threadOpen &&
      prev.activeThreadMessage === next.activeThreadMessage &&
      prev.isDraggingOver === next.isDraggingOver &&
      prev.getMemberNickname === next.getMemberNickname
    );
  }
);

MosChatMessageFeed.displayName = 'MosChatMessageFeed';
