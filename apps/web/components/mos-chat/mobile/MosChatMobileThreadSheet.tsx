'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Loader2, MessageSquareReply } from 'lucide-react';
import { message as antdMessage } from 'antd';
import { useMosChat } from '../context/MosChatContext';
import { useTheme } from '../../../context/ThemeContext';
import { formatStickerToken, type MosChatStickerItem } from '../mos-chat-stickers';
import { type MosChatGalleryImage } from './MosChatMobileMediaGallery';
import { handleSmartListEnterKey } from '../MosChatRichEditorModal';
import { syncTextareaHeightSmart } from '../components/MosChatComposer';
import { uploadMultipleChatImages } from '../utils/chat-upload';
import { formatQuotePayload } from '../utils/quoteUtils';
import type {
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatThreadReply,
  MosChatMessage,
  MosChatTaskItem,
  SafeAny,
} from '@mos-lab/shared';
import { extractMentionedStaff, isStaffInConversationMembers, isUserMessageOwner } from '../utils/chat-helpers';
import { useChatThreadMissionState } from '../shared/hooks/useChatThreadMissionState';
import { useChatSwipeAndDoubleTap } from '../shared/hooks/useChatSwipeAndDoubleTap';
import { MosChatMobileMissionCard } from './MosChatMobileMissionCard';
import { MosChatMobileThreadParentCard } from './MosChatMobileThreadParentCard';
import { MosChatMobileThreadReplyItem } from './MosChatMobileThreadReplyItem';
import { MosChatMobileThreadComposer } from './MosChatMobileThreadComposer';
import { MosChatMobileThreadOverlays } from './MosChatMobileThreadOverlays';

export interface MosChatMobileThreadSheetProps {
  onOpenTaskModal?: (params?: {
    initialTitle?: string;
    sourceMsg?: MosChatMessage | null;
    existingTask?: MosChatTaskItem | null;
    sourceReply?: MosChatThreadReply | null;
    isNew?: boolean;
  }) => void;
  onOpenMoveReply?: (sourceMsg: MosChatMessage, replyId: string) => void;
  onForwardMessage?: (sourceMsg: MosChatMessage, reply?: MosChatThreadReply | null) => void;
}

export const MosChatMobileThreadSheet: React.FC<MosChatMobileThreadSheetProps> = ({
  onOpenTaskModal,
  onOpenMoveReply,
  onForwardMessage,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const {
    activeConversation,
    staffDirectory,
    activeThreadMsg,
    threadReplies,
    sendThreadReply,
    reactToMessage,
    hasUserReacted,
    openReactionUsersSheet,
    deleteThreadReply,
    moveThreadItem,
    markThreadAsRead,
    editMessage,
    currentUser,
    setMobileView,
    tasks,
    toggleTaskDone,
    updateTask,
    executeMissionAction,
    isAiThinking,
    openCustomerDetail,
    getMessageReadBreakdown,
    getThreadReplyReadBreakdown,
    stoppedReadersByReplyId,
    stoppedReadersByMsgId,
    openSeenUsersSheetForReply,
    openSeenUsersSheetForMessage,
  } = useMosChat();

  const [text, setText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [actionSheetReply, setActionSheetReply] = useState<MosChatThreadReply | null>(null);
  const [editingReply, setEditingReply] = useState<MosChatThreadReply | null>(null);
  const [galleryOpen, setGalleryOpen] = useState<boolean>(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);
  const [replyingToReply, setReplyingToReply] = useState<MosChatThreadReply | null>(null);
  const [attachedImages, setAttachedImages] = useState<MosChatImageAttachment[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState<boolean>(false);
  const [stagedCustomerCard, setStagedCustomerCard] = useState<MosChatCustomerCard | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState<boolean>(false);
  const [ckEditorOpen, setCkEditorOpen] = useState<boolean>(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState<boolean>(false);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  const isParentFromMe = activeThreadMsg ? isUserMessageOwner(activeThreadMsg, currentUser) : false;
  const parentBreakdown =
    activeThreadMsg && getMessageReadBreakdown
      ? getMessageReadBreakdown(activeConversation, activeThreadMsg)
      : { seenBy: [], unseenBy: [] };
  const stoppedReadersForParent =
    (stoppedReadersByMsgId && activeThreadMsg && stoppedReadersByMsgId[activeThreadMsg.id]) || [];
  const isParentSeen = parentBreakdown.seenBy.length > 0;

  useEffect(() => {
    if (activeThreadMsg && activeConversation?.id && (activeThreadMsg.unreadThreadReplyCount || 0) > 0) {
      markThreadAsRead(activeConversation.id, activeThreadMsg.id);
    }
  }, [activeThreadMsg?.id, activeThreadMsg?.unreadThreadReplyCount, activeConversation?.id, markThreadAsRead]);

  const {
    showHeartFlyParent,
    parentSwipeOffset,
    showHeartFlyReplyId,
    swipeOffsetMap,
    handleTouchStartParent,
    handleTouchMoveParent,
    handleTouchEndParent,
    handleTouchStartReply,
    handleTouchMoveReply,
    handleTouchEndReply,
  } = useChatSwipeAndDoubleTap({
    activeThreadMsg,
    threadReplies: threadReplies || [],
    reactToMessage,
    setReplyingToReply,
    setActionSheetReply,
  });

  const threadGalleryImages: MosChatGalleryImage[] = useMemo(() => {
    if (!activeThreadMsg) return [];
    const list: MosChatGalleryImage[] = [];

    if (activeThreadMsg.attachments && activeThreadMsg.attachments.length > 0) {
      activeThreadMsg.attachments.forEach((att, idx) => {
        list.push({
          id: att.id || `parent-${activeThreadMsg.id}-att-${idx}`,
          url: att.url,
          name: att.name,
          senderName: activeThreadMsg.senderName,
          senderRole: activeThreadMsg.senderRole,
          createdAt: activeThreadMsg.createdAt,
        });
      });
    }

    (threadReplies || []).forEach((reply) => {
      if (reply.attachments && reply.attachments.length > 0) {
        reply.attachments.forEach((att, idx) => {
          list.push({
            id: att.id || `reply-${reply.id}-att-${idx}`,
            url: att.url,
            name: att.name,
            senderName: reply.senderName,
            senderRole: reply.senderRole,
            createdAt: reply.createdAt,
          });
        });
      }
    });

    return list;
  }, [activeThreadMsg, threadReplies]);

  const handleOpenGallery = (targetUrl: string, targetId?: string) => {
    const idx = threadGalleryImages.findIndex((img) => (targetId && img.id === targetId) || img.url === targetUrl);
    setGalleryInitialIndex(idx >= 0 ? idx : 0);
    setGalleryOpen(true);
  };

  const missionState = useChatThreadMissionState({
    activeConversation,
    activeThreadMsg,
    tasks: tasks || [],
    currentUser,
    executeMissionAction,
  });

  useEffect(() => {
    if (replyingToReply) {
      textareaRef.current?.focus();
    }
  }, [replyingToReply]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    if (el) {
      if (typeof el.scrollTo === 'function') {
        try {
          el.scrollTo({ top: el.scrollHeight, behavior });
        } catch {
          // ignore
        }
      }
      try {
        el.scrollTop = el.scrollHeight;
      } catch {
        // ignore
      }
    }
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      try {
        bottomRef.current.scrollIntoView({ behavior, block: 'end' });
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const execute = () => scrollToBottom('auto');
    execute();
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        execute();
        window.setTimeout(execute, 40);
        window.setTimeout(execute, 150);
        window.setTimeout(execute, 300);
      });
    }
  }, [activeThreadMsg?.id, threadReplies.length, isAiThinking, scrollToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    syncTextareaHeightSmart(el, 100);
  }, [text]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && attachedImages.length === 0 && !stagedCustomerCard) || isSending || isUploadingImages) return;

    if (activeConversation && activeConversation.type?.toLowerCase() === 'space') {
      const mentionedStaff = extractMentionedStaff(trimmed, staffDirectory || [], {
        nicknames: activeConversation.memberNicknames,
      });

      const nonMemberMentions = mentionedStaff.filter(
        (s) => !isStaffInConversationMembers(s, activeConversation, staffDirectory)
      );

      if (nonMemberMentions.length > 0) {
        const names = nonMemberMentions.map((s) => s.displayName || s.username).join(', ');
        antdMessage.warning(
          `Đồng nghiệp ${names} chưa tham gia nhóm này. Bạn hãy mời vào nhóm trước khi nhắc tên nhé!`
        );
        return;
      }
    }

    const sendBaseText =
      trimmed || (stagedCustomerCard?.name ? `Đính kèm thẻ khách hàng ${stagedCustomerCard.name}:` : '');
    let payloadText = sendBaseText;
    if (replyingToReply) {
      payloadText = formatQuotePayload(replyingToReply.senderName, replyingToReply.text, sendBaseText);
    }

    setIsSending(true);
    const success = await sendThreadReply(payloadText, {
      attachments: attachedImages.length > 0 ? attachedImages : undefined,
      customerCard: stagedCustomerCard || undefined,
    });
    setIsSending(false);

    if (success) {
      setText('');
      setAttachedImages([]);
      setStagedCustomerCard(null);
      setReplyingToReply(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleInsertNewline = () => {
    const el = textareaRef.current;
    if (!el) return;
    const isFocused = typeof document !== 'undefined' && document.activeElement === el;
    const start = isFocused ? (el.selectionStart ?? text.length) : text.length;
    const end = isFocused ? (el.selectionEnd ?? text.length) : text.length;
    const smart = handleSmartListEnterKey(text, start, end);
    if (smart?.handled) {
      setText(smart.nextText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(smart.nextCursor, smart.nextCursor);
      }, 0);
    } else {
      const nextText = text.substring(0, start) + '\n' + text.substring(end);
      setText(nextText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + 1, start + 1);
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      const el = e.currentTarget;
      const smart = handleSmartListEnterKey(text, el.selectionStart || 0, el.selectionEnd || 0);
      if (smart?.handled) {
        e.preventDefault();
        setText(smart.nextText);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(smart.nextCursor, smart.nextCursor);
        }, 0);
        return;
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || (e as SafeAny).keyCode === 229) {
        return;
      }
      const el = e.currentTarget;
      const smart = handleSmartListEnterKey(text, el.selectionStart || 0, el.selectionEnd || 0);
      if (smart?.handled) {
        e.preventDefault();
        setText(smart.nextText);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(smart.nextCursor, smart.nextCursor);
        }, 0);
        return;
      }
      e.preventDefault();
      void handleSend();
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const count = files.length;
    setIsUploadingImages(true);
    const hideMsg = antdMessage.loading(`Đang tải ${count} tệp lên...`, 0);

    try {
      const uploaded = await uploadMultipleChatImages(files);
      hideMsg();
      if (uploaded.length > 0) {
        setAttachedImages((prev) => [...prev, ...uploaded]);
        if (uploaded.length === count) {
          antdMessage.success(`Đã đính kèm ${uploaded.length} tệp trong luồng`);
        } else {
          antdMessage.warning(`Đã tải ${uploaded.length}/${count} tệp`);
        }
      } else {
        antdMessage.error('Không thể tải tệp lên');
      }
    } catch {
      hideMsg();
      antdMessage.error('Không thể tải tệp lên');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleSelectSticker = async (sticker: MosChatStickerItem) => {
    setStickerPickerOpen(false);
    const token = formatStickerToken(sticker.id);
    await sendThreadReply(token);
  };

  if (!activeThreadMsg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <MessageSquareReply className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-sm font-medium">Chưa chọn luồng thảo luận nào</p>
        <button
          type="button"
          onClick={() => setMobileView('room')}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
        >
          Quay lại phòng chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] text-[var(--mos-text)] overflow-hidden select-none">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.mp4,.webm,.mov,.heic,.heif,.HEIC,.HEIF,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar"
        onChange={handleImageFileChange}
        className="hidden"
        aria-label="Tải nhiều ảnh đính kèm trong luồng"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.mov"
        onChange={handleImageFileChange}
        className="hidden"
        aria-label="Tải video đính kèm trong luồng"
      />

      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
        <MosChatMobileThreadParentCard
          activeThreadMsg={activeThreadMsg}
          liveThreadMsg={missionState.liveThreadMsg}
          linkedTask={missionState.linkedTask}
          activeConversation={activeConversation}
          currentUser={currentUser}
          staffDirectory={staffDirectory}
          isDark={isDark}
          parentSwipeOffset={parentSwipeOffset}
          showHeartFlyParent={showHeartFlyParent}
          handleTouchStartParent={handleTouchStartParent}
          handleTouchMoveParent={handleTouchMoveParent}
          handleTouchEndParent={handleTouchEndParent}
          isParentFromMe={isParentFromMe}
          parentBreakdown={parentBreakdown}
          stoppedReadersForParent={stoppedReadersForParent}
          isParentSeen={isParentSeen}
          openSeenUsersSheetForMessage={openSeenUsersSheetForMessage}
          onForwardMessage={onForwardMessage}
          openCustomerDetail={openCustomerDetail}
          handleOpenGallery={handleOpenGallery}
          hasUserReacted={hasUserReacted}
          reactToMessage={reactToMessage}
          openReactionUsersSheet={openReactionUsersSheet}
          toggleTaskDone={toggleTaskDone}
          updateTask={updateTask}
          onOpenTaskModal={onOpenTaskModal}
        />

        {missionState.mission && (
          <MosChatMobileMissionCard
            mission={missionState.mission}
            isDark={isDark}
            isStrictDannySuperAdmin={missionState.isStrictDannySuperAdmin}
            canApproveImplementation={missionState.canApproveImplementation}
            canSuperAdminApproveCommit={missionState.canSuperAdminApproveCommit}
            canSuperAdminApproveDeploy={missionState.canSuperAdminApproveDeploy}
            canReporterAccept={missionState.canReporterAccept}
            canRequestUpgradeOrRework={missionState.canRequestUpgradeOrRework}
            actionLoading={missionState.actionLoading}
            isReopenOpen={missionState.isReopenOpen}
            setIsReopenOpen={missionState.setIsReopenOpen}
            reopenFeedback={missionState.reopenFeedback}
            setReopenFeedback={missionState.setReopenFeedback}
            handleExecuteMissionAction={missionState.handleExecuteMissionAction}
          />
        )}

        <div className="flex items-center gap-2 my-2 text-[var(--mos-text-muted)] text-xs font-medium">
          <span className="h-px flex-1 bg-[var(--mos-surface-border)]" />
          <span>{threadReplies.length} phản hồi</span>
          <span className="h-px flex-1 bg-[var(--mos-surface-border)]" />
        </div>

        {threadReplies.map((reply) => {
          const replyBreakdown =
            activeThreadMsg && getThreadReplyReadBreakdown
              ? getThreadReplyReadBreakdown(activeThreadMsg, reply)
              : { seenBy: [], unseenBy: [] };
          const stoppedReadersForReply = (stoppedReadersByReplyId && stoppedReadersByReplyId[reply.id]) || [];

          return (
            <MosChatMobileThreadReplyItem
              key={reply.id}
              reply={reply}
              activeThreadMsg={activeThreadMsg}
              activeConversation={activeConversation}
              currentUser={currentUser}
              staffDirectory={staffDirectory}
              isDark={isDark}
              replyOffset={swipeOffsetMap[reply.id] || 0}
              showHeartFly={showHeartFlyReplyId === reply.id}
              replyBreakdown={replyBreakdown}
              stoppedReadersForReply={stoppedReadersForReply}
              handleTouchStartReply={handleTouchStartReply}
              handleTouchMoveReply={handleTouchMoveReply}
              handleTouchEndReply={handleTouchEndReply}
              setActionSheetReply={setActionSheetReply}
              handleOpenGallery={handleOpenGallery}
              openCustomerDetail={openCustomerDetail}
              openSeenUsersSheetForReply={openSeenUsersSheetForReply}
              hasUserReacted={hasUserReacted}
              reactToMessage={reactToMessage}
              openReactionUsersSheet={openReactionUsersSheet}
            />
          );
        })}

        {isAiThinking && (
          <div
            className={`flex items-center gap-2.5 p-3 my-2 rounded-2xl border text-xs animate-pulse shadow-lg ${
              isDark
                ? 'bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-950/70 border-purple-500/40 text-purple-200'
                : 'bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-purple-500/15 border-purple-500/35 text-purple-900'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <span className={`font-semibold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>MAI Copilot:</span>{' '}
              Đang suy nghĩ và phân tích luồng thảo luận...
            </div>
            <Loader2
              className={`w-3.5 h-3.5 animate-spin shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
            />
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      <MosChatMobileThreadComposer
        isDark={isDark}
        keyboardOffset={keyboardOffset}
        text={text}
        setText={setText}
        textareaRef={textareaRef}
        isSending={isSending}
        isUploadingImages={isUploadingImages}
        attachedImages={attachedImages}
        setAttachedImages={setAttachedImages}
        stagedCustomerCard={stagedCustomerCard}
        setStagedCustomerCard={setStagedCustomerCard}
        replyingToReply={replyingToReply}
        setReplyingToReply={setReplyingToReply}
        hasAnyPendingAction={missionState.hasAnyPendingAction}
        mission={missionState.mission}
        isStrictDannySuperAdmin={missionState.isStrictDannySuperAdmin}
        canApproveImplementation={missionState.canApproveImplementation}
        canSuperAdminApproveCommit={missionState.canSuperAdminApproveCommit}
        canSuperAdminApproveDeploy={missionState.canSuperAdminApproveDeploy}
        canReporterAccept={missionState.canReporterAccept}
        actionLoading={missionState.actionLoading}
        handleExecuteMissionAction={missionState.handleExecuteMissionAction}
        handleKeyDown={handleKeyDown}
        handleInsertNewline={handleInsertNewline}
        handleSend={handleSend}
        setActionSheetOpen={setActionSheetOpen}
        setCkEditorOpen={setCkEditorOpen}
        setStickerPickerOpen={setStickerPickerOpen}
      />

      <MosChatMobileThreadOverlays
        isDark={isDark}
        activeThreadMsg={activeThreadMsg}
        liveThreadMsg={missionState.liveThreadMsg}
        linkedTask={missionState.linkedTask}
        activeConversation={activeConversation}
        currentUser={currentUser}
        actionSheetReply={actionSheetReply}
        setActionSheetReply={setActionSheetReply}
        editingReply={editingReply}
        setEditingReply={setEditingReply}
        setReplyingToReply={setReplyingToReply}
        galleryOpen={galleryOpen}
        setGalleryOpen={setGalleryOpen}
        threadGalleryImages={threadGalleryImages}
        galleryInitialIndex={galleryInitialIndex}
        customerPickerOpen={customerPickerOpen}
        setCustomerPickerOpen={setCustomerPickerOpen}
        stickerPickerOpen={stickerPickerOpen}
        setStickerPickerOpen={setStickerPickerOpen}
        actionSheetOpen={actionSheetOpen}
        setActionSheetOpen={setActionSheetOpen}
        ckEditorOpen={ckEditorOpen}
        setCkEditorOpen={setCkEditorOpen}
        text={text}
        setText={setText}
        attachedImages={attachedImages}
        setAttachedImages={setAttachedImages}
        stagedCustomerCard={stagedCustomerCard}
        setStagedCustomerCard={setStagedCustomerCard}
        setIsSending={setIsSending}
        fileInputRef={fileInputRef}
        videoInputRef={videoInputRef}
        textareaRef={textareaRef}
        hasUserReacted={hasUserReacted}
        reactToMessage={reactToMessage}
        getThreadReplyReadBreakdown={getThreadReplyReadBreakdown}
        openSeenUsersSheetForReply={openSeenUsersSheetForReply}
        openReactionUsersSheet={openReactionUsersSheet}
        updateTask={updateTask}
        onOpenTaskModal={onOpenTaskModal}
        onForwardMessage={onForwardMessage}
        onOpenMoveReply={onOpenMoveReply}
        moveThreadItem={moveThreadItem}
        deleteThreadReply={deleteThreadReply}
        editMessage={editMessage}
        sendThreadReply={sendThreadReply}
        handleSelectSticker={handleSelectSticker}
        handleSend={handleSend}
      />
    </div>
  );
};
