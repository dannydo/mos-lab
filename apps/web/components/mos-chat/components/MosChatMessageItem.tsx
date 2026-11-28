'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { CornerDownRight, Pin } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatQuotedMessage,
  MosChatTaskItem,
  MosChatStaffMember,
  SafeAny,
} from '@mos-lab/shared';
import { MosChatWorkflowCard } from '../workflows/MosChatWorkflowCard';
import { MosChatCustomerCardAttachment } from './MosChatCustomerCardAttachment';
import { MosChatGoogleWorkspaceCardList } from './MosChatGoogleWorkspaceCard';
import {
  MainMessageInlineEditor,
  MosChatMessageAiReasoning,
  MosChatMessageAiActionsAndVoice,
} from './MosChatMessageAiExtras';
import { MosChatMessageBubble } from './MosChatMessageBubble';
import { MosChatMessageThreadChip, MosChatMessageReactionsRow } from './MosChatMessageThreadAndReactions';
import { MosChatMessageActionBar } from './MosChatMessageActionBar';

export interface MosChatMessageItemProps {
  m: MosChatMessage;
  prevMsg: MosChatMessage | null;
  quotedMessage: MosChatMessage | MosChatQuotedMessage | null | undefined;
  allVisibleMessages: MosChatMessage[];
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  staffDirectory: MosChatStaffMember[];
  linkedTask?: MosChatTaskItem;
  isMobile: boolean;
  isMine: boolean;
  isCont: boolean;
  isAiMessage: boolean;
  canMoveThisMsg: boolean;
  isBeingDragged: boolean;
  isDropTarget: boolean;
  isHighlighted: boolean;
  isEditingThis: boolean;
  isThinkingExpanded: boolean;
  isHeartFlying: boolean;
  isDark: boolean;
  token: SafeAny;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  accentSoftBg: string;
  accentBorder: string;
  AI_COPILOT_CONV_ID: string;
  msgReadBreakdown: { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  stoppedReadersForMsg: SafeAny[];
  taskByMsgOrTaskId: Map<string, MosChatTaskItem>;
  draggingRootMsgId: string | null;
  setDraggingRootMsgId: (id: string | null) => void;
  dragOverTargetMsgId: string | null;
  setDragOverTargetMsgId: (id: string | null) => void;
  setDragOverThreadPane: (val: boolean) => void;
  handleMoveThreadItem: (args: SafeAny) => Promise<void> | void;
  getMemberNickname: (staffId: string | number) => string | undefined;
  renderReadStatusCheckmark: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  setExpandedThinkingIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
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
  openMoreMenuMsgId: string | null;
  setOpenMoreMenuMsgId: React.Dispatch<React.SetStateAction<string | null>>;
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
  handleTogglePin: (msgId: string) => void;
  renderMiniSeenAvatarStack: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  isMessageFromCurrentUser: (m: MosChatMessage | SafeAny) => boolean;
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
  formatMoveTargetSnippet: (msg: MosChatMessage) => string;
  antdMessage: SafeAny;
  renderMessageAttachments?: (attachments?: SafeAny[], compact?: boolean, isMine?: boolean) => React.ReactNode;
  openCustomerDetail?: (customerId: number) => void;
  handleReplyToMessage?: (m: MosChatMessage) => void;
  handleOpenForwardModal?: (m: MosChatMessage) => void;
  accessibleConversationIds?: Set<string>;
  onJumpToForwardedSource?: (sourceConversationId: string, sourceMessageId: string) => void;
  handleOpenReactionUsers?: (target: SafeAny, initialEmoji?: string) => void;
  quickReactionEmojis?: readonly string[];
}

export const MosChatMessageItem: React.FC<MosChatMessageItemProps> = React.memo(
  ({
    m,
    prevMsg,
    quotedMessage,
    allVisibleMessages,
    activeConversation,
    currentUser,
    staffDirectory,
    linkedTask,
    isMobile,
    isMine,
    isCont,
    isAiMessage,
    canMoveThisMsg,
    isBeingDragged,
    isDropTarget,
    isHighlighted,
    isEditingThis,
    isThinkingExpanded,
    isHeartFlying,
    isDark,
    token,
    surfaceRaised,
    borderColor,
    borderStrong,
    accentSoftBg,
    accentBorder,
    AI_COPILOT_CONV_ID,
    msgReadBreakdown,
    stoppedReadersForMsg,
    taskByMsgOrTaskId,
    draggingRootMsgId,
    setDraggingRootMsgId,
    dragOverTargetMsgId,
    setDragOverTargetMsgId,
    setDragOverThreadPane,
    handleMoveThreadItem,
    getMemberNickname,
    renderReadStatusCheckmark,
    renderUserAvatarNode,
    setExpandedThinkingIds,
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
    openMoreMenuMsgId,
    setOpenMoreMenuMsgId,
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
    handleTogglePin,
    renderMiniSeenAvatarStack,
    isMessageFromCurrentUser,
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
    formatMoveTargetSnippet,
    antdMessage,
    renderMessageAttachments,
    openCustomerDetail,
    handleReplyToMessage,
    handleOpenForwardModal,
    accessibleConversationIds,
    onJumpToForwardedSource,
    handleOpenReactionUsers,
    quickReactionEmojis,
  }) => {
    const senderNick = getMemberNickname(m.senderId);
    const activeWorkflow =
      m.workflow || (m.workflowInstanceId ? workflowInstances.find((wf) => wf.id === m.workflowInstanceId) : undefined);

    return (
      <div
        data-message-side={isMine ? 'right' : 'left'}
        draggable={canMoveThisMsg && !isEditingThis}
        onDragStart={(e) => {
          if (!canMoveThisMsg || isEditingThis) {
            e.preventDefault();
            return;
          }
          const sel = typeof window !== 'undefined' ? window.getSelection()?.toString().trim() : '';
          if (sel) {
            e.preventDefault();
            return;
          }
          setDraggingRootMsgId(m.id);
          try {
            e.dataTransfer.setData('application/x-mos-chat-msg-id', m.id);
            e.dataTransfer.effectAllowed = 'move';
          } catch {
            // ignore
          }
        }}
        onDragEnd={() => {
          setDraggingRootMsgId(null);
          setDragOverTargetMsgId(null);
          setDragOverThreadPane(false);
        }}
        onDragOver={(e) => {
          if (!draggingRootMsgId || draggingRootMsgId === m.id || m.isDeleted) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverTargetMsgId !== m.id) {
            setDragOverTargetMsgId(m.id);
          }
        }}
        onDragLeave={(e) => {
          if (dragOverTargetMsgId === m.id && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setDragOverTargetMsgId(null);
          }
        }}
        onDrop={(e) => {
          const srcId =
            draggingRootMsgId ||
            (() => {
              try {
                return e.dataTransfer?.getData('application/x-mos-chat-msg-id') || '';
              } catch {
                return '';
              }
            })();
          if (!srcId || srcId === m.id || m.isDeleted) return;
          e.preventDefault();
          e.stopPropagation();
          setDraggingRootMsgId(null);
          setDragOverTargetMsgId(null);
          setDragOverThreadPane(false);
          void handleMoveThreadItem({
            mode: 'MERGE_ROOT_TO_THREAD',
            sourceMessageId: srcId,
            targetMessageId: m.id,
          });
        }}
        id={`mos-chat-msg-${m.id}`}
        className={`group relative flex items-start gap-2.5 px-4 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${
          isCont ? 'py-0.5' : 'pt-2.5 pb-1'
        } transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${isBeingDragged ? 'opacity-45 scale-[0.99]' : ''}`}
        style={{
          background: isDropTarget
            ? 'rgba(212, 168, 75, 0.14)'
            : isHighlighted
              ? 'rgba(212, 168, 75, 0.18)'
              : linkedTask
                ? 'rgba(212, 168, 75, 0.06)'
                : undefined,
          boxShadow: isDropTarget
            ? 'inset 0 0 0 1.5px #d4a84b'
            : isHighlighted
              ? '0 0 0 2px #d4a84b, inset 0 0 14px rgba(212, 168, 75, 0.28)'
              : undefined,
          borderRadius: isDropTarget || isHighlighted ? 10 : undefined,
        }}
      >
        {isDropTarget && (
          <div
            className="absolute -top-2.5 left-4 z-20 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold inline-flex items-center gap-1 shadow-md pointer-events-none"
            style={{ background: '#d4a84b', color: '#000' }}
          >
            <CornerDownRight size={11} />
            <span>Thả để gộp vào luồng trả lời của {senderNick || m.senderName}</span>
          </div>
        )}

        {isCont ? (
          <div
            className={`w-8 shrink-0 flex flex-col ${isMine ? 'items-start pl-0.5' : 'items-end pr-0.5'} pt-1 select-none gap-0.5`}
          >
            <span className="opacity-0 group-hover:opacity-100 text-[9.5px] text-slate-400 tabular-nums transition-opacity">
              {m.timeLabel}
            </span>
            {isMine &&
              !m.isDeleted &&
              renderReadStatusCheckmark(msgReadBreakdown.seenBy, msgReadBreakdown.unseenBy, {
                compact: true,
                scopeLabel: 'Trạng thái đọc tin nhắn',
              })}
          </div>
        ) : (
          <div className="mt-0.5 shrink-0">
            {renderUserAvatarNode({
              staffId: isMine ? currentUser?.id || m.senderId : m.senderId,
              name: m.senderName,
              rawAvatar: m.senderAvatar,
              bgColor: m.roleColor || (isMine ? '#d4a84b' : '#3b82f6'),
              sizeClass: 'w-8 h-8',
              roundedClass: 'rounded-full',
              isAiBot: isAiMessage,
            })}
          </div>
        )}

        <div className={`flex-1 min-w-0 flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          {!isCont && (
            <div className={`flex items-center gap-1.5 mb-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
              {senderNick && senderNick !== m.senderName ? (
                <span className="flex items-center gap-1">
                  <span className="text-[12.5px] font-bold text-emerald-500 dark:text-emerald-400">{senderNick}</span>
                  <span className="text-[11px] text-slate-400 font-normal">({m.senderName})</span>
                </span>
              ) : (
                <span className="text-[12.5px] font-bold">{m.senderName}</span>
              )}
              {isMine && (
                <span
                  className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9px] font-extrabold"
                  style={{ background: 'rgba(212, 168, 75, 0.2)', color: '#d4a84b' }}
                >
                  Bạn
                </span>
              )}
              <span
                className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                style={{ background: `${m.roleColor || '#d4a84b'}22`, color: m.roleColor || '#d4a84b' }}
              >
                {m.senderRole}
              </span>
              <span className="text-[10.5px] text-slate-400 tabular-nums">{m.timeLabel}</span>
              {isMine &&
                !m.isDeleted &&
                renderReadStatusCheckmark(msgReadBreakdown.seenBy, msgReadBreakdown.unseenBy, {
                  compact: false,
                  scopeLabel: 'Trạng thái đọc tin nhắn',
                })}
              {m.pinned && (
                <Tooltip title="Đã ghim">
                  <span className="inline-flex text-amber-400">
                    <Pin size={12} />
                  </span>
                </Tooltip>
              )}
            </div>
          )}

          <MosChatMessageAiReasoning
            messageId={m.id}
            aiThinking={m.aiThinking}
            isDark={isDark}
            expanded={isThinkingExpanded}
            onToggle={() => setExpandedThinkingIds((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
            colorTextSecondary={token.colorTextSecondary}
          />

          {isEditingThis ? (
            <MainMessageInlineEditor
              initialText={editingText}
              setEditingText={setEditingText}
              handleCancelEdit={handleCancelEdit}
              handleSaveEdit={handleSaveEdit}
              isSavingEdit={isSavingEdit}
              isComposingRef={isComposingRef}
              lastCompositionEndMsRef={lastCompositionEndMsRef}
              surfaceRaised={surfaceRaised}
              colorText={token.colorText}
              colorTextSecondary={token.colorTextSecondary}
            />
          ) : (
            <MosChatMessageBubble
              m={m}
              quotedMessage={quotedMessage}
              activeConversation={activeConversation}
              isMobile={isMobile}
              isMine={isMine}
              isDannyAccount={isDannyAccount}
              isHeartFlying={isHeartFlying}
              isDark={isDark}
              ttsSpeed={ttsSpeed}
              token={token}
              surfaceRaised={surfaceRaised}
              borderColor={borderColor}
              accentSoftBg={accentSoftBg}
              accentBorder={accentBorder}
              getMemberNickname={getMemberNickname}
              setHistoryModalMessage={setHistoryModalMessage}
              setHistoryModalOpen={setHistoryModalOpen}
              handleRestoreMessage={handleRestoreMessage}
              handleMessageTap={handleMessageTap}
              handleReplyToMessage={handleReplyToMessage}
              renderRichTextMessage={renderRichTextMessage}
              renderMessageAttachments={renderMessageAttachments}
              accessibleConversationIds={accessibleConversationIds}
              onJumpToForwardedSource={onJumpToForwardedSource}
            />
          )}

          <MosChatMessageAiActionsAndVoice
            m={m}
            isAiMessage={isAiMessage}
            appliedActionIds={appliedActionIds}
            handleExecuteAiAction={handleExecuteAiAction}
            speakingMsgId={speakingMsgId}
            ttsSpeed={ttsSpeed}
            handleSpeakAiMessage={handleSpeakAiMessage}
            handleSetTtsSpeed={handleSetTtsSpeed}
            surfaceRaised={surfaceRaised}
            borderColor={borderColor}
            colorTextSecondary={token.colorTextSecondary}
            antdMessage={antdMessage}
          />

          {!m.isDeleted && m.text && (
            <MosChatGoogleWorkspaceCardList
              text={m.text}
              conversationId={activeConversation?.id}
              messageId={m.id}
              isDark={isDark}
              isMe={isMine}
            />
          )}

          {m.customerCard && (
            <MosChatCustomerCardAttachment
              card={m.customerCard}
              isMe={isMine}
              onOpenCustomer={openCustomerDetail}
              className="max-w-[85%]"
            />
          )}

          {linkedTask && renderTaskCard(linkedTask, m, 'inline')}

          {!linkedTask && m.mission && renderLiveMissionCard(m.mission, m, 'inline')}

          {activeWorkflow && (
            <MosChatWorkflowCard
              workflow={activeWorkflow}
              isDark={isDark}
              isSuperAdmin={isStrictDannySuperAdmin}
              currentStaffId={currentUserStaffMember?.id}
              currentUserName={currentUserStaffMember?.displayName || currentUser?.fullName || currentUser?.username}
              onWorkflowUpdated={(updatedWf) => {
                setWorkflowInstances((prev) =>
                  prev.some((w) => w.id === updatedWf.id)
                    ? prev.map((w) => (w.id === updatedWf.id ? updatedWf : w))
                    : [updatedWf, ...prev]
                );
                void fetchBootstrap(true);
              }}
              onOpenLightbox={(url, name) =>
                setLightboxImage({
                  items: [{ id: url, url, name }],
                  currentIndex: 0,
                  zoom: 1,
                  rotate: 0,
                })
              }
            />
          )}

          <MosChatMessageThreadChip
            m={m}
            activeConversation={activeConversation}
            isMine={isMine}
            isMessageFromCurrentUser={isMessageFromCurrentUser}
            getThreadReplyReadBreakdown={getThreadReplyReadBreakdown}
            renderReadStatusCheckmark={renderReadStatusCheckmark}
            renderMiniSeenAvatarStack={renderMiniSeenAvatarStack}
            handleOpenThread={handleOpenThread}
          />

          <div
            className={`mt-1 flex flex-wrap items-center gap-1.5 min-h-[26px] ${
              isMine ? 'flex-row-reverse justify-start' : 'justify-start'
            }`}
          >
            <MosChatMessageReactionsRow
              m={m}
              staffDirectory={staffDirectory}
              currentUser={currentUser}
              surfaceRaised={surfaceRaised}
              borderColor={borderColor}
              colorText={token.colorText}
              hasUserReacted={hasUserReacted}
              handleToggleReaction={handleToggleReaction}
              handleOpenReactionUsers={handleOpenReactionUsers}
            />

            <MosChatMessageActionBar
              m={m}
              prevMsg={prevMsg}
              allVisibleMessages={allVisibleMessages}
              activeConversation={activeConversation}
              linkedTask={linkedTask}
              isMine={isMine}
              isDannyAccount={isDannyAccount}
              isStrictDannySuperAdmin={isStrictDannySuperAdmin}
              canMoveThisMsg={canMoveThisMsg}
              AI_COPILOT_CONV_ID={AI_COPILOT_CONV_ID}
              isDark={isDark}
              token={token}
              surfaceRaised={surfaceRaised}
              borderColor={borderColor}
              borderStrong={borderStrong}
              mobileActiveMsgId={mobileActiveMsgId}
              openMovePopoverKey={openMovePopoverKey}
              openMoreMenuMsgId={openMoreMenuMsgId}
              setOpenMoreMenuMsgId={setOpenMoreMenuMsgId}
              openStickerPopoverKey={openStickerPopoverKey}
              setOpenStickerPopoverKey={setOpenStickerPopoverKey}
              hasUserReacted={hasUserReacted}
              handleToggleReaction={handleToggleReaction}
              renderReactionPickerContent={renderReactionPickerContent}
              handleOpenThread={handleOpenThread}
              handleReplyToMessage={handleReplyToMessage}
              handleOpenForwardModal={handleOpenForwardModal}
              openTaskModalFromMessage={openTaskModalFromMessage}
              handleTogglePin={handleTogglePin}
              handleBuzzMessage={handleBuzzMessage}
              openMissionModalFromChat={openMissionModalFromChat}
              handleStartEdit={handleStartEdit}
              setHistoryModalMessage={setHistoryModalMessage}
              setHistoryModalOpen={setHistoryModalOpen}
              handleDeleteMessage={handleDeleteMessage}
              taskByMsgOrTaskId={taskByMsgOrTaskId}
              getMemberNickname={getMemberNickname}
              formatMoveTargetSnippet={formatMoveTargetSnippet}
              movingThreadItemKey={movingThreadItemKey}
              threadOpen={threadOpen}
              activeThreadMessage={activeThreadMessage}
              handleMoveThreadItem={handleMoveThreadItem}
              quickReactionEmojis={quickReactionEmojis}
            />
          </div>

          {stoppedReadersForMsg.length > 0 && (
            <div className={`mt-0.5 w-full flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              {renderMiniSeenAvatarStack(stoppedReadersForMsg, msgReadBreakdown.unseenBy, {
                align: isMine ? 'right' : 'left',
                scopeLabel: 'Đã xem đến tin nhắn này',
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
);

MosChatMessageItem.displayName = 'MosChatMessageItem';
