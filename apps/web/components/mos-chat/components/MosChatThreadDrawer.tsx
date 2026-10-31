import React, { useState } from 'react';
import { Tooltip, Popover, Popconfirm, Dropdown, Input, Avatar } from 'antd';
import dayjs from 'dayjs';
import {
  Activity,
  AlarmClockPlus,
  ArrowUpRight,
  AtSign,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  CornerDownLeft,
  CornerDownRight,
  Eye,
  FilePenLine,
  HardDrive,
  History,
  ImagePlus,
  ListTodo,
  Maximize2,
  MessageSquareReply,
  Minimize2,
  Paperclip,
  Pencil,
  Plus,
  Rocket,
  RotateCcw,
  Search,
  SendHorizontal,
  SmilePlus,
  Sparkles,
  Trash2,
  UserRoundPlus,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  removeVietnameseTones,
  type MosChatConversation,
  type MosChatMessage,
  type MosChatTaskItem,
  type MosChatThreadReply,
  type MosChatCustomerCard,
  type UpdateMosChatTaskRequest,
  type SafeAny,
} from '@mos-lab/shared';
import { MosChatThreadChecklist } from './MosChatThreadChecklist';
import { MosChatCustomerCardAttachment } from './MosChatCustomerCardAttachment';
import { MosChatStickerVisual, parsePureStickerMessage, parseStickerReactionKey } from '../mos-chat-stickers';
import { GOOGLE_CHAT_QUICK_EMOJIS } from '../constants/chat-constants';
import { buildMaiUrgentVoiceAnnouncement } from '../utils/chat-helpers';
import { playNeuralSpeech } from '../../voice-assistant/speech-utils';
import { findSourceMessage, scrollToMessageAndFlash } from '../utils/quoteUtils';

export interface MosChatThreadDrawerProps {
  threadOpen: boolean;
  activeThreadMessage: MosChatMessage | null;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  isMobile: boolean;
  mobileActiveView: string;
  setMobileActiveView: (v: SafeAny) => void;
  threadWidth: number;
  setThreadWidth: (w: number) => void;
  persistPersonalLayout: (layout: SafeAny) => void;
  isResizingTarget: 'panel' | 'sidebar' | 'thread' | null;
  setIsResizingTarget: React.Dispatch<React.SetStateAction<'panel' | 'sidebar' | 'thread' | null>>;
  hoverResizeHandle: 'panel' | 'sidebar' | 'thread' | null;
  setHoverResizeHandle: React.Dispatch<React.SetStateAction<'panel' | 'sidebar' | 'thread' | null>>;
  surfaceBg: string;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  isDark: boolean;
  token: SafeAny;
  draggingRootMsgId: string | null;
  setDraggingRootMsgId: (id: string | null) => void;
  dragOverTargetMsgId: string | null;
  setDragOverTargetMsgId: (id: string | null) => void;
  dragOverThreadPane: boolean;
  setDragOverThreadPane: (val: boolean) => void;
  isDraggingOverThread: boolean;
  setIsDraggingOverThread: (val: boolean) => void;
  isDraggingOver: boolean;
  setIsDraggingOver: (val: boolean) => void;
  handleMoveThreadItem: (args: SafeAny) => Promise<void> | void;
  handleProcessImageFiles: (
    files: FileList | File[],
    source: SafeAny,
    scope?: SafeAny,
    convId?: string
  ) => Promise<void>;
  handleClipboardPaste: (
    e: React.ClipboardEvent<HTMLInputElement | HTMLElement>,
    scope?: SafeAny,
    convId?: string
  ) => void;
  formatMoveTargetSnippet: (msg: MosChatMessage) => string;
  setThreadOpen: (open: boolean) => void;
  navigateToMessage: (convId: string, msgId: string) => void;
  highlightedMsgId: string | null;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  renderRichTextMessage: (
    text?: string,
    isMine?: boolean,
    opts?: { onQuoteClick?: (senderName: string, quotedContent: string) => void }
  ) => React.ReactNode;
  speakingMsgId: string | null;
  ttsSpeed: number;
  handleSpeakAiMessage: (msg: SafeAny) => void;
  handleSetTtsSpeed: (speed: number) => void;
  threadMessagesContainerRef: React.RefObject<HTMLDivElement | null>;
  threadMessagesEndRef: React.RefObject<HTMLDivElement | null>;
  isMessageFromCurrentUser: (m: SafeAny) => boolean;
  canManageChatThreads: boolean;
  AI_COPILOT_CONV_ID: string;
  getMemberNickname: (staffId: string | number) => string | undefined;
  renderReadStatusCheckmark: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  renderMiniSeenAvatarStack: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  editingReplyId: string | null;
  editingText: string;
  setEditingText: (text: string) => void;
  handleCancelEdit: () => void;
  handleSaveEdit: () => void;
  isSavingEdit: boolean;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  handleRestoreMessage: (msgId: string, replyId?: string) => void;
  isDannyAccount: boolean;
  hasUserReacted: (m: SafeAny, emoji: string) => boolean;
  handleToggleReaction: (msgId: string, emoji: string, replyId?: string) => void;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  renderReactionPickerContent: (msgId: string, m: SafeAny, replyId?: string) => React.ReactNode;
  handleBuzzMessage: (msgId: string, replyId?: string) => void;
  handleStartEdit: (msg: MosChatMessage, replyId?: string) => void;
  handleDeleteMessage: (msgId: string, replyId?: string) => void;
  threadInputRef: React.RefObject<HTMLTextAreaElement | null>;
  threadInput: string;
  setThreadInput: React.Dispatch<React.SetStateAction<string>>;
  handleSendThreadReply: (replyTextOverride?: string) => Promise<void> | void;
  threadAttachments: SafeAny[];
  setThreadAttachments: React.Dispatch<React.SetStateAction<SafeAny[]>>;
  triggerFilePicker: (scope: 'main' | 'thread') => void;
  setRichEditorModalState: (state: SafeAny) => void;
  renderComposerEmojiPickerContent: (scope?: SafeAny) => React.ReactNode;
  antdMessage: SafeAny;
  getThreadReplyReadBreakdown: (
    conv: SafeAny,
    rootMsg: SafeAny,
    reply: SafeAny
  ) => { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  stoppedReadersByReplyId: Record<string, SafeAny[]>;
  aiThinkingActive: boolean;
  aiElapsedSec: number;
  renderStagedAttachmentsStrip: (attachments: SafeAny[], scope: SafeAny) => React.ReactNode;
  renderMentionAutocompleteDropdown: (scope: SafeAny) => React.ReactNode;
  renderAppleNotesFormatToolbar: (scope: SafeAny, variant?: SafeAny) => React.ReactNode;
  checkForMentionTrigger: (text: string, cursorPos: number, scope: SafeAny) => void;
  handleMentionKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, scope: SafeAny) => boolean;
  handleApplyFormat: (formatType: SafeAny, scope: SafeAny, extraValue?: string) => void;
  handleSmartListEnterKey: (
    text: string,
    selectionStart: number,
    selectionEnd: number
  ) => { handled: boolean; nextText: string; nextCursor: number };
  setThreadCursorPos: (pos: number) => void;
  canUseAiCopilot: boolean;
  isStrictDannySuperAdmin: boolean;
  openMissionModalFromChat: (m: MosChatMessage, linkedTask?: SafeAny) => void;
  uniqueTasks: MosChatTaskItem[];
  setSaveThreadWorkflowModalOpen: (open: boolean) => void;
  renderMessageAttachments: (attachments?: SafeAny[], isThumb?: boolean, isMine?: boolean) => React.ReactNode;
  renderLiveMissionCard: (mission: SafeAny, msg?: MosChatMessage | null, mode?: SafeAny) => React.ReactNode;
  setHistoryModalMessage: (m: SafeAny) => void;
  setHistoryModalOpen: (open: boolean) => void;
  movingThreadItemKey: string | null;
  openMovePopoverKey: string | null;
  setOpenMovePopoverKey: (key: string | null) => void;
  handleUpdateTask?: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<void> | void;
  renderTaskCard?: (
    task: MosChatTaskItem,
    sourceMsg?: MosChatMessage | null,
    mode?: 'inline' | 'list' | 'thread'
  ) => React.ReactNode;
  openCustomerDetail?: (customerId: number) => void;
  setDriveLinkModalOpen?: (open: boolean) => void;
  uploadTargetRef?: React.MutableRefObject<SafeAny>;
  handleOpenCustomerPicker?: (scope?: 'main' | 'thread') => void;
  stagedCustomerCard?: MosChatCustomerCard | null;
  setStagedCustomerCard?: React.Dispatch<React.SetStateAction<MosChatCustomerCard | null>>;
  openTaskModalFromMessage?: (msg: MosChatMessage | null, reply?: SafeAny) => void;
  isUrgentSendThread?: boolean;
  setIsUrgentSendThread?: React.Dispatch<React.SetStateAction<boolean>>;
  setTriggerWorkflowModalOpen?: (open: boolean) => void;
  setInitialWorkflowCode?: (code: string) => void;
}

export const MosChatThreadDrawer: React.FC<MosChatThreadDrawerProps> = React.memo(
  ({
    threadOpen,
    activeThreadMessage,
    activeConversation,
    currentUser,
    isMobile,
    mobileActiveView,
    setMobileActiveView,
    threadWidth,
    setThreadWidth,
    persistPersonalLayout,
    isResizingTarget,
    setIsResizingTarget,
    hoverResizeHandle,
    setHoverResizeHandle,
    surfaceBg,
    surfaceRaised,
    canvasBg,
    borderColor,
    borderStrong,
    accentColor,
    accentSoftBg,
    accentBorder,
    isDark,
    token,
    draggingRootMsgId,
    setDraggingRootMsgId,
    dragOverTargetMsgId,
    setDragOverTargetMsgId,
    dragOverThreadPane,
    setDragOverThreadPane,
    isDraggingOverThread,
    setIsDraggingOverThread,
    isDraggingOver,
    setIsDraggingOver,
    handleMoveThreadItem,
    handleProcessImageFiles,
    handleClipboardPaste,
    formatMoveTargetSnippet,
    setThreadOpen,
    navigateToMessage,
    highlightedMsgId,
    renderUserAvatarNode,
    renderRichTextMessage,
    speakingMsgId,
    ttsSpeed,
    handleSpeakAiMessage,
    handleSetTtsSpeed,
    threadMessagesContainerRef,
    threadMessagesEndRef,
    isMessageFromCurrentUser,
    canManageChatThreads,
    AI_COPILOT_CONV_ID,
    getMemberNickname,
    renderReadStatusCheckmark,
    renderMiniSeenAvatarStack,
    editingReplyId,
    editingText,
    setEditingText,
    handleCancelEdit,
    handleSaveEdit,
    isSavingEdit,
    isComposingRef,
    lastCompositionEndMsRef,
    handleRestoreMessage,
    isDannyAccount,
    hasUserReacted,
    handleToggleReaction,
    openStickerPopoverKey,
    setOpenStickerPopoverKey,
    renderReactionPickerContent,
    handleBuzzMessage,
    handleStartEdit,
    handleDeleteMessage,
    threadInputRef,
    threadInput,
    setThreadInput,
    handleSendThreadReply,
    threadAttachments,
    setThreadAttachments,
    triggerFilePicker,
    setRichEditorModalState,
    renderComposerEmojiPickerContent,
    antdMessage,
    getThreadReplyReadBreakdown,
    stoppedReadersByReplyId,
    aiThinkingActive,
    aiElapsedSec,
    renderStagedAttachmentsStrip,
    renderMentionAutocompleteDropdown,
    renderAppleNotesFormatToolbar,
    checkForMentionTrigger,
    handleMentionKeyDown,
    handleApplyFormat,
    handleSmartListEnterKey,
    setThreadCursorPos,
    canUseAiCopilot,
    isStrictDannySuperAdmin,
    openMissionModalFromChat,
    uniqueTasks,
    setSaveThreadWorkflowModalOpen,
    renderMessageAttachments,
    renderLiveMissionCard,
    setHistoryModalMessage,
    setHistoryModalOpen,
    movingThreadItemKey,
    openMovePopoverKey,
    setOpenMovePopoverKey,
    handleUpdateTask,
    renderTaskCard,
    openCustomerDetail,
    setDriveLinkModalOpen,
    uploadTargetRef,
    handleOpenCustomerPicker,
    stagedCustomerCard,
    setStagedCustomerCard,
    openTaskModalFromMessage,
    isUrgentSendThread,
    setIsUrgentSendThread,
    setTriggerWorkflowModalOpen,
    setInitialWorkflowCode,
  }) => {
    const [formatBarOpenThread, setFormatBarOpenThread] = useState<boolean>(true);
    const [isPreviewModeThread, setIsPreviewModeThread] = useState<boolean>(false);
    const [moveThreadSearchQuery, setMoveThreadSearchQuery] = useState<string>('');
    const [replyingToReply, setReplyingToReply] = useState<{ id: string; senderName: string; text: string } | null>(
      null
    );
    const [mobileActionOpen, setMobileActionOpen] = useState<boolean>(false);
    const [localUrgentSend, setLocalUrgentSend] = useState<boolean>(false);
    const isUrgent = isUrgentSendThread ?? localUrgentSend;
    const setIsUrgent = setIsUrgentSendThread ?? setLocalUrgentSend;

    // Auto reset reply quote when active subthread changes
    React.useEffect(() => {
      setReplyingToReply(null);
    }, [activeThreadMessage?.id, threadOpen]);

    // Tự động căn chỉnh chiều cao textarea subthread khi có nhiều dòng (Shift+Enter)
    React.useEffect(() => {
      const el = threadInputRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }, [threadInput, threadInputRef]);

    const handleThreadSubmit = () => {
      const trimmed = threadInput.trim();
      if (!trimmed && threadAttachments.length === 0 && !stagedCustomerCard) return;
      let finalText = trimmed;
      if (replyingToReply) {
        finalText = `> Trích dẫn @${replyingToReply.senderName}: ${replyingToReply.text}\n\n${trimmed}`;
        setReplyingToReply(null);
      }
      handleSendThreadReply(finalText);
    };

    if (!threadOpen || !activeThreadMessage) return null;

    const renderMoveReplyPopover = (parentMsg: MosChatMessage, reply: MosChatThreadReply) => {
      const allMsgs = (activeConversation?.messages || []).filter(
        (m) =>
          m.id !== parentMsg.id &&
          !m.isDeleted &&
          !m.isSystemReminder &&
          m.senderId !== 'system-reminder' &&
          m.senderName !== 'mOS Reminder'
      );
      const qNorm = removeVietnameseTones(moveThreadSearchQuery.trim().toLowerCase());
      const candidates = allMsgs
        .slice()
        .reverse()
        .filter((m) => {
          if (!qNorm) return true;
          const hay = removeVietnameseTones(
            `${m.senderName} ${m.text || ''} ${m.mission?.missionKey || ''}`.toLowerCase()
          );
          return hay.includes(qNorm);
        });

      const isBusy =
        movingThreadItemKey === `PROMOTE_REPLY_TO_ROOT:${parentMsg.id}:${reply.id}` ||
        movingThreadItemKey === `MOVE_REPLY_TO_THREAD:${parentMsg.id}:${reply.id}`;

      return (
        <div
          data-no-chat-autofocus="true"
          onClick={(e) => e.stopPropagation()}
          className="w-[300px] space-y-2 text-[12px]"
          style={{ color: token.colorText }}
        >
          <div
            className="font-extrabold flex items-center gap-1.5 text-[12px] pb-1"
            style={{ borderBottom: `1px solid ${borderColor}` }}
          >
            <ArrowUpRight size={14} className="text-amber-500 shrink-0" />
            <span>Tách hoặc chuyển câu trả lời sang luồng khác</span>
          </div>

          {/* 1-Click Promote Reply to Standalone Root Message */}
          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              void handleMoveThreadItem({
                mode: 'PROMOTE_REPLY_TO_ROOT',
                sourceMessageId: parentMsg.id,
                replyId: reply.id,
              })
            }
            className="w-full p-2 rounded-lg text-left cursor-pointer transition-all hover:brightness-105 disabled:opacity-50"
            style={{
              background: isDark ? 'rgba(212, 168, 75, 0.16)' : 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(212, 168, 75, 0.45)',
            }}
          >
            <div className="font-extrabold text-[11.5px] flex items-center gap-1" style={{ color: '#d4a84b' }}>
              <ArrowUpRight size={13} />
              <span>Tách ra thành tin nhắn riêng ở luồng chính</span>
            </div>
            <div className="text-[10.5px] mt-0.5" style={{ color: token.colorTextSecondary }}>
              Đưa câu trả lời này (kèm hình ảnh) ra ngoài cuộc trò chuyện chính
            </div>
          </button>

          {/* Move Reply to another message's thread */}
          <div className="space-y-1.5 pt-0.5">
            <div className="text-[10.5px] font-bold uppercase text-slate-400">
              Hoặc chuyển sang luồng của tin nhắn khác:
            </div>
            <Input
              size="small"
              allowClear
              placeholder="Tìm tin nhắn đích..."
              value={moveThreadSearchQuery}
              onChange={(e) => setMoveThreadSearchQuery(e.target.value)}
              prefix={<Search size={12} className="text-slate-400" />}
            />
            <div className="max-h-[165px] overflow-y-auto space-y-1 pr-0.5">
              {candidates.length === 0 ? (
                <div className="py-2 text-center text-[11px] text-slate-400">Không có tin nhắn đích khác</div>
              ) : (
                candidates.slice(0, 20).map((target) => {
                  const replyCount = (target.thread || []).filter((r) => !r.deletedAt).length;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void handleMoveThreadItem({
                          mode: 'MOVE_REPLY_TO_THREAD',
                          sourceMessageId: parentMsg.id,
                          replyId: reply.id,
                          targetMessageId: target.id,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-md text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10 flex flex-col gap-0.5"
                      style={{ border: `1px solid ${borderColor}` }}
                    >
                      <div className="flex items-center justify-between gap-1.5 text-[11px]">
                        <span className="font-bold truncate">
                          {target.senderName}{' '}
                          <span className="text-slate-400 font-normal tabular-nums">· {target.timeLabel}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-[10px] font-bold text-blue-400">
                          💬 {replyCount}
                        </span>
                      </div>
                      <div className="text-[11px] truncate" style={{ color: token.colorTextSecondary }}>
                        {formatMoveTargetSnippet(target)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <aside
        data-chat-thread-pane="true"
        onDragOver={(e) => {
          if (draggingRootMsgId) {
            if (draggingRootMsgId === activeThreadMessage.id) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            if (!dragOverThreadPane) setDragOverThreadPane(true);
            return;
          }
          // Dragging files/images into subthread pane
          const hasFiles = Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
          if (hasFiles) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            if (!isDraggingOverThread) setIsDraggingOverThread(true);
            if (isDraggingOver) setIsDraggingOver(false);
          }
        }}
        onDragLeave={(e) => {
          if (dragOverThreadPane && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setDragOverThreadPane(false);
          }
          if (isDraggingOverThread && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsDraggingOverThread(false);
          }
        }}
        onDrop={(e) => {
          if (draggingRootMsgId) {
            if (draggingRootMsgId === activeThreadMessage.id) return;
            e.preventDefault();
            e.stopPropagation();
            const srcId = draggingRootMsgId;
            setDraggingRootMsgId(null);
            setDragOverTargetMsgId(null);
            setDragOverThreadPane(false);
            setIsDraggingOver(false);
            setIsDraggingOverThread(false);
            void handleMoveThreadItem({
              mode: 'MERGE_ROOT_TO_THREAD',
              sourceMessageId: srcId,
              targetMessageId: activeThreadMessage.id,
            });
            return;
          }
          // Dropping files/images into subthread pane
          if (e.dataTransfer?.files?.length) {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingOver(false);
            setIsDraggingOverThread(false);
            void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
          }
        }}
        onPaste={(e) => handleClipboardPaste(e, 'thread')}
        className={`${isMobile ? 'absolute inset-0 z-30 w-full' : ''} flex flex-col shrink-0 relative`}
        style={{
          width: isMobile ? '100%' : threadWidth,
          background: surfaceBg,
          borderLeft: isMobile
            ? 'none'
            : `1px solid ${
                dragOverThreadPane ||
                isDraggingOverThread ||
                isResizingTarget === 'thread' ||
                hoverResizeHandle === 'thread'
                  ? '#d4a84b'
                  : borderColor
              }`,
          display: isMobile && mobileActiveView !== 'thread' ? 'none' : 'flex',
          transition: isResizingTarget === 'thread' ? 'none' : 'width 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {dragOverThreadPane && draggingRootMsgId && draggingRootMsgId !== activeThreadMessage.id && (
          <div
            className="absolute inset-2 rounded-xl z-30 flex flex-col items-center justify-center gap-2 pointer-events-none px-4 text-center"
            style={{
              background: 'rgba(15, 23, 42, 0.86)',
              border: '2px dashed #d4a84b',
              color: '#fbbf24',
            }}
          >
            <CornerDownRight size={28} />
            <div className="text-[13px] font-extrabold">
              Thả vào đây để gộp tin nhắn (kèm ảnh & phản hồi) vào luồng này
            </div>
            <div className="text-[11px] text-slate-300 max-w-[260px] truncate">
              {activeThreadMessage.senderName}: {formatMoveTargetSnippet(activeThreadMessage)}
            </div>
          </div>
        )}
        {isDraggingOverThread && !draggingRootMsgId && (
          <div
            className="absolute inset-2 rounded-xl z-30 flex flex-col items-center justify-center gap-2 pointer-events-none px-4 text-center select-none"
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '2px dashed #d4a84b',
              color: '#fbbf24',
              backdropFilter: 'blur(4px)',
            }}
          >
            <ImagePlus size={32} className="animate-bounce" />
            <div className="text-[13px] font-extrabold">Thả hình ảnh vào luồng phụ này</div>
            <div className="text-[11px] text-amber-200/80">
              Hình ảnh sẽ tự động được tải lên và đính kèm vào câu trả lời luồng
            </div>
          </div>
        )}
        {/* THREAD PANE RESIZE DIVIDER (Drag to resize & persistent width) */}
        {!isMobile && (
          <Tooltip title="Kéo sang trái/phải để đổi độ rộng luồng · Nhấp đúp để đặt lại 440px">
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Kéo để thay đổi độ rộng luồng trả lời"
              data-no-chat-autofocus="true"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizingTarget('thread');
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                setThreadWidth(440);
                persistPersonalLayout({ threadWidth: 440 });
              }}
              onMouseEnter={() => setHoverResizeHandle('thread')}
              onMouseLeave={() => setHoverResizeHandle((prev) => (prev === 'thread' ? null : prev))}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: -5,
                width: 10,
                cursor: 'col-resize',
                zIndex: 25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: isResizingTarget === 'thread' || hoverResizeHandle === 'thread' ? 3.5 : 1.5,
                  height: isResizingTarget === 'thread' || hoverResizeHandle === 'thread' ? 64 : 36,
                  background:
                    isResizingTarget === 'thread' || hoverResizeHandle === 'thread'
                      ? '#d4a84b'
                      : isDark
                        ? 'rgba(148, 163, 184, 0.35)'
                        : 'rgba(100, 116, 139, 0.3)',
                  boxShadow: isResizingTarget === 'thread' ? '0 0 10px rgba(212, 168, 75, 0.65)' : 'none',
                }}
              />
              {isResizingTarget === 'thread' && (
                <div
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shadow-lg pointer-events-none"
                  style={{
                    position: 'absolute',
                    right: 14,
                    background: '#111827',
                    color: '#d4a84b',
                    border: '1px solid rgba(212, 168, 75, 0.45)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {threadWidth}px
                </div>
              )}
            </div>
          </Tooltip>
        )}

        <div
          className="h-[52px] px-3 flex items-center justify-between text-[12.5px] font-extrabold"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isMobile && (
              <button
                type="button"
                aria-label="Quay lại hội thoại"
                onClick={() => {
                  setThreadOpen(false);
                  setMobileActiveView('conversation');
                }}
                className="w-7 h-7 -ml-1 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 shrink-0"
                style={{ color: token.colorText }}
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <span className="flex items-center gap-1.5 truncate">
              <MessageSquareReply size={14} className="shrink-0 text-amber-500" />
              <span>Luồng trả lời</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isStrictDannySuperAdmin && !activeThreadMessage.mission && (
              <Tooltip title="Chuyển vào mOS Mission (Đóng gói trọn luồng & hình ảnh)">
                <button
                  type="button"
                  aria-label="Chuyển vào mOS Mission"
                  onClick={() =>
                    openMissionModalFromChat(
                      activeThreadMessage,
                      uniqueTasks.find(
                        (t) => t.id === activeThreadMessage.taskId || t.sourceMessageId === activeThreadMessage.id
                      ) || null
                    )
                  }
                  className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.45)',
                    color: '#c4b5fd',
                  }}
                >
                  <Rocket size={14} />
                </button>
              </Tooltip>
            )}
            {isStrictDannySuperAdmin && (
              <Tooltip title="✨ Chuẩn hóa luồng thảo luận này thành Quy trình (Workflow)">
                <button
                  type="button"
                  aria-label="Lưu thành Workflow"
                  onClick={() => setSaveThreadWorkflowModalOpen(true)}
                  className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
                  style={{
                    background: 'rgba(59, 130, 246, 0.18)',
                    border: '1px solid rgba(59, 130, 246, 0.45)',
                    color: '#93c5fd',
                  }}
                >
                  <Activity size={14} />
                </button>
              </Tooltip>
            )}
            {/* Nút phóng to / thu gọn nhanh luồng trả lời trên màn hình lớn */}
            {!isMobile && (
              <Tooltip title={threadWidth >= 560 ? 'Thu gọn luồng về 440px' : 'Mở rộng luồng sang 620px (FHD)'}>
                <button
                  type="button"
                  aria-label="Mở rộng hoặc thu gọn luồng"
                  onClick={() => {
                    const targetWidth = threadWidth >= 560 ? 440 : 620;
                    setThreadWidth(targetWidth);
                    persistPersonalLayout({ threadWidth: targetWidth });
                  }}
                  className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                  style={{ color: token.colorTextSecondary }}
                >
                  {threadWidth >= 560 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </Tooltip>
            )}
            <Tooltip title="Đóng luồng">
              <button
                type="button"
                aria-label="Đóng luồng"
                onClick={() => {
                  setThreadOpen(false);
                  if (isMobile) setMobileActiveView('conversation');
                }}
                className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                style={{ color: token.colorTextSecondary }}
              >
                <X size={15} />
              </button>
            </Tooltip>
          </div>
        </div>

        <div ref={threadMessagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Linked Task & Interactive Checklist Pinned at Thread Top */}
          {(() => {
            const linkedTask =
              uniqueTasks?.find(
                (t) => t.id === activeThreadMessage.taskId || t.sourceMessageId === activeThreadMessage.id
              ) || null;
            if (!linkedTask) return null;
            return (
              <div className="mb-2.5">
                {renderTaskCard ? renderTaskCard(linkedTask, activeThreadMessage, 'thread') : null}
                <MosChatThreadChecklist
                  task={linkedTask}
                  activeThreadMessage={activeThreadMessage}
                  onToggleChecklistItem={async (itemId) => {
                    await handleUpdateTask?.(linkedTask.id, {
                      checklistAction: 'toggle',
                      checklistItemId: itemId,
                    });
                  }}
                  onAddChecklistItem={async (title, sourceReplyId) => {
                    await handleUpdateTask?.(linkedTask.id, {
                      checklistAction: 'add',
                      checklistItem: { title, sourceReplyId: sourceReplyId || null },
                    });
                  }}
                  onDeleteChecklistItem={async (itemId) => {
                    await handleUpdateTask?.(linkedTask.id, {
                      checklistAction: 'delete',
                      checklistItemId: itemId,
                    });
                  }}
                  onScrollToReply={(replyId) => {
                    const el =
                      document.getElementById(`mos-chat-thread-reply-${replyId}`) ||
                      document.getElementById(`reply-bubble-${replyId}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-2', 'ring-amber-500');
                      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 2000);
                    }
                  }}
                  isDark={isDark}
                  token={token}
                  isMobile={false}
                />
              </div>
            );
          })()}

          <div
            id={`mos-chat-thread-root-${activeThreadMessage.id}`}
            className="p-2.5 rounded-lg text-[12px] transition-all"
            style={{
              background: surfaceRaised,
              borderLeft: '3px solid #d4a84b',
              boxShadow:
                highlightedMsgId === activeThreadMessage.id
                  ? '0 0 0 2px #d4a84b, 0 0 14px rgba(212, 168, 75, 0.4)'
                  : undefined,
            }}
          >
            <div className="flex items-center justify-between font-bold mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {renderUserAvatarNode({
                  name: activeThreadMessage.senderName,
                  avatarUrl: activeThreadMessage.senderAvatar,
                  sizeClass: 'w-5 h-5',
                  textClass: 'text-[9px]',
                })}
                <span className="truncate">{activeThreadMessage.senderName}</span>
                <span className="text-slate-400 text-[10.5px] tabular-nums">· {activeThreadMessage.timeLabel}</span>
              </div>
              <Tooltip title="Trả lời / Trích dẫn tin nhắn gốc này">
                <button
                  type="button"
                  aria-label="Trả lời tin nhắn gốc trong luồng"
                  onClick={() => {
                    setReplyingToReply({
                      id: activeThreadMessage.id,
                      senderName: activeThreadMessage.senderName,
                      text: activeThreadMessage.text || '',
                    });
                    setTimeout(() => {
                      threadInputRef.current?.focus();
                    }, 50);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-colors shrink-0"
                >
                  <MessageSquareReply size={12} />
                  <span>Trả lời</span>
                </button>
              </Tooltip>
            </div>
            {activeThreadMessage.text && (
              <div className="text-[13px] leading-relaxed break-words">
                {renderRichTextMessage(activeThreadMessage.text)}
              </div>
            )}
            {Boolean(activeThreadMessage.isAiBot || activeThreadMessage.senderId === 'wings-ai-copilot') &&
              activeThreadMessage.text && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Tooltip
                    title={
                      speakingMsgId === activeThreadMessage.id
                        ? 'Dừng đọc giọng nói'
                        : `Đọc câu trả lời bằng giọng Hoài My (${ttsSpeed}x)`
                    }
                  >
                    <button
                      type="button"
                      aria-label="Đọc câu trả lời AI trong luồng"
                      onClick={() => handleSpeakAiMessage(activeThreadMessage)}
                      className="inline-flex items-center justify-center p-1.5 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                      style={{
                        background:
                          speakingMsgId === activeThreadMessage.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                        border: `1px solid ${
                          speakingMsgId === activeThreadMessage.id ? 'rgba(139, 92, 246, 0.5)' : borderColor
                        }`,
                        color: speakingMsgId === activeThreadMessage.id ? '#a78bfa' : token.colorTextSecondary,
                      }}
                    >
                      {speakingMsgId === activeThreadMessage.id ? (
                        <VolumeX size={13} className="animate-pulse" />
                      ) : (
                        <Volume2 size={13} />
                      )}
                    </button>
                  </Tooltip>

                  <Dropdown
                    menu={{
                      items: [
                        { key: '0.8', label: '0.8x (Chậm)' },
                        { key: '1.0', label: '1.0x (Chuẩn)' },
                        { key: '1.25', label: '1.25x (Nhanh vừa)' },
                        { key: '1.5', label: '1.5x (Nhanh)' },
                        { key: '1.75', label: '1.75x (Rất nhanh)' },
                        { key: '2.0', label: '2.0x (Tối đa)' },
                      ],
                      selectedKeys: [String(ttsSpeed)],
                      onClick: ({ key }) => {
                        const s = parseFloat(key);
                        if (s) handleSetTtsSpeed(s);
                      },
                    }}
                    trigger={['click']}
                    placement="bottomLeft"
                  >
                    <button
                      type="button"
                      aria-label="Tùy chỉnh tốc độ đọc"
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium cursor-pointer transition-colors hover:text-violet-400"
                      style={{
                        background: surfaceRaised,
                        border: `1px solid ${borderColor}`,
                        color: token.colorTextSecondary,
                      }}
                      title={`Tốc độ đọc giọng nói cá nhân: ${ttsSpeed}x (nhấp để đổi)`}
                    >
                      <span className="tabular-nums font-semibold">{ttsSpeed}x</span>
                      <ChevronDown size={10} />
                    </button>
                  </Dropdown>

                  <Tooltip title="Sao chép nội dung">
                    <button
                      type="button"
                      aria-label="Sao chép nội dung AI"
                      onClick={() => {
                        void navigator.clipboard?.writeText(activeThreadMessage.text || '');
                        antdMessage.success('Đã sao chép nội dung câu trả lời AI');
                      }}
                      className="inline-flex items-center justify-center p-1.5 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: surfaceRaised,
                        border: `1px solid ${borderColor}`,
                        color: token.colorTextSecondary,
                      }}
                    >
                      <Copy size={13} />
                    </button>
                  </Tooltip>
                </div>
              )}
            {renderMessageAttachments(
              activeThreadMessage.attachments,
              true,
              activeThreadMessage.senderId === currentUser?.id
            )}
            {!activeThreadMessage.isDeleted && activeThreadMessage.customerCard && (
              <div className="mt-2">
                <MosChatCustomerCardAttachment
                  card={activeThreadMessage.customerCard}
                  onOpenCustomer={openCustomerDetail}
                />
              </div>
            )}
            {activeThreadMessage.reactions &&
              Object.entries(activeThreadMessage.reactions).filter(([, count]) => count > 0).length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {Object.entries(activeThreadMessage.reactions)
                    .filter(([, count]) => count > 0)
                    .map(([emoji, count]) => {
                      const reactedByMe = hasUserReacted(activeThreadMessage, emoji);
                      const stickerReaction = parseStickerReactionKey(emoji);
                      const label = stickerReaction ? stickerReaction.caption || stickerReaction.title : emoji;
                      return (
                        <Tooltip
                          key={emoji}
                          title={reactedByMe ? `Đã thả ${label} · Nhấn để gỡ cảm xúc` : `Thả cùng ${label}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleReaction(activeThreadMessage.id, emoji)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer tabular-nums transition-all hover:scale-105"
                            style={{
                              background: reactedByMe ? 'rgba(212, 168, 75, 0.16)' : canvasBg,
                              border: `1px solid ${reactedByMe ? 'rgba(212, 168, 75, 0.55)' : borderColor}`,
                              color: reactedByMe ? '#d4a84b' : token.colorText,
                            }}
                          >
                            {stickerReaction ? (
                              <MosChatStickerVisual sticker={stickerReaction} size="reaction" />
                            ) : (
                              <span>{emoji}</span>
                            )}
                            <span>{count}</span>
                          </button>
                        </Tooltip>
                      );
                    })}
                </div>
              )}
          </div>

          {activeThreadMessage.mission &&
            renderLiveMissionCard(activeThreadMessage.mission, activeThreadMessage, 'thread')}

          <div className="text-[10.5px] font-bold uppercase text-slate-400 tabular-nums">
            {activeThreadMessage.thread?.length || 0} câu trả lời
          </div>

          {(activeThreadMessage.thread || []).map((r) => {
            const isReplyMine = isMessageFromCurrentUser(r);
            const isAiReply = Boolean(r.isAiBot || r.senderId === 'wings-ai-copilot');
            const replyBreakdown = getThreadReplyReadBreakdown(activeConversation, activeThreadMessage, r);
            const stoppedReadersForReply = stoppedReadersByReplyId[r.id] || [];
            return (
              <div key={r.id} data-message-id={r.id} id={`mos-chat-reply-${r.id}`} className="space-y-1">
                <div className={`flex gap-2 items-start ${isReplyMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {renderUserAvatarNode({
                    name: r.senderName,
                    avatarUrl: r.senderAvatar,
                    sizeClass: 'w-6 h-6 mt-0.5',
                    textClass: 'text-[9.5px]',
                    bgStyle: isReplyMine
                      ? 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)'
                      : isAiReply
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)'
                        : '#2563eb',
                    textColor: isReplyMine ? '#000' : '#fff',
                    isAiBot: isAiReply,
                  })}
                  <div
                    onDoubleClick={() => {
                      if (!r.isDeleted) {
                        setReplyingToReply({
                          id: r.id,
                          senderName: r.senderName,
                          text: r.text || '',
                        });
                        setTimeout(() => {
                          threadInputRef.current?.focus();
                        }, 50);
                      }
                    }}
                    className={`max-w-[85%] p-2 rounded-xl text-[12px] text-left group relative transition-all ${
                      isReplyMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                    }`}
                    style={{
                      background: isReplyMine
                        ? accentSoftBg
                        : isAiReply
                          ? isDark
                            ? 'rgba(139, 92, 246, 0.12)'
                            : 'rgba(139, 92, 246, 0.08)'
                          : canvasBg,
                      border: `1px solid ${
                        isReplyMine
                          ? accentBorder
                          : isAiReply
                            ? isDark
                              ? 'rgba(139, 92, 246, 0.4)'
                              : 'rgba(139, 92, 246, 0.3)'
                            : borderColor
                      }`,
                      boxShadow:
                        highlightedMsgId === r.id ? `0 0 0 2px ${accentColor}, 0 0 14px ${accentBorder}` : undefined,
                    }}
                  >
                    <div
                      className={`font-bold text-[10.5px] mb-0.5 flex items-center gap-1 ${
                        isReplyMine ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {(() => {
                        const nick = getMemberNickname(r.senderId);
                        if (nick && nick !== r.senderName) {
                          return (
                            <span className="inline-flex items-center gap-1">
                              <span style={{ color: isReplyMine ? '#d4a84b' : isAiReply ? '#a855f7' : '#10b981' }}>
                                {nick}
                              </span>
                              <span className="text-slate-400 font-normal">({r.senderName})</span>
                            </span>
                          );
                        }
                        return (
                          <span style={{ color: isReplyMine ? '#d4a84b' : isAiReply ? '#a855f7' : token.colorText }}>
                            {r.senderName}
                          </span>
                        );
                      })()}
                      <span className="text-slate-400 tabular-nums">· {r.timeLabel}</span>
                      {isReplyMine &&
                        !r.isDeleted &&
                        renderReadStatusCheckmark(replyBreakdown.seenBy, replyBreakdown.unseenBy, {
                          compact: true,
                          scopeLabel: 'Trạng thái đọc phản hồi',
                        })}
                    </div>

                    {/* Reply Content: Inline Edit vs Soft-Deleted vs Normal Text Bubble */}
                    {editingReplyId === r.id ? (
                      <div
                        className="rounded-xl p-2 space-y-1.5 select-text"
                        style={{ background: surfaceRaised, border: '1.5px solid #d4a84b' }}
                      >
                        <textarea
                          autoFocus
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelEdit();
                            } else if (e.key === 'Enter' && !e.shiftKey) {
                              if (
                                e.nativeEvent.isComposing ||
                                isComposingRef.current ||
                                e.keyCode === 229 ||
                                Date.now() - lastCompositionEndMsRef.current < 60
                              ) {
                                return;
                              }
                              e.preventDefault();
                              handleSaveEdit();
                            }
                          }}
                          rows={2}
                          className="w-full bg-transparent border-0 outline-none text-[12px] leading-relaxed resize-y p-0.5"
                          style={{ color: token.colorText }}
                        />
                        <div className="flex items-center justify-between pt-0.5 border-t border-white/10 text-[10px]">
                          <span className="text-slate-400">Esc: huỷ · Enter: lưu</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-2 py-0.5 rounded cursor-pointer hover:bg-white/10 text-slate-400"
                            >
                              Huỷ
                            </button>
                            <button
                              type="button"
                              disabled={isSavingEdit || !editingText.trim()}
                              onClick={handleSaveEdit}
                              className="px-2 py-0.5 rounded font-bold cursor-pointer disabled:opacity-50"
                              style={{ background: '#d4a84b', color: '#000' }}
                            >
                              {isSavingEdit ? 'Đang lưu...' : 'Lưu'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : r.isDeleted ? (
                      <div className="text-[11.5px] italic text-slate-400 select-none">
                        <span>💬 Phản hồi này đã bị xoá</span>
                        {(isReplyMine || isDannyAccount) && (
                          <button
                            type="button"
                            onClick={() => handleRestoreMessage(activeThreadMessage.id, r.id)}
                            className="ml-1.5 inline-flex items-center gap-0.5 text-[10.5px] font-bold not-italic hover:underline cursor-pointer text-emerald-400"
                          >
                            <RotateCcw size={10} />
                            <span>Khôi phục</span>
                          </button>
                        )}
                        {r.deletedByName && (
                          <div className="text-[9.5px] not-italic mt-0.5 tabular-nums">
                            Bởi {r.deletedByName} · {r.deletedAt ? dayjs(r.deletedAt).format('HH:mm') : r.timeLabel}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Buzz / Bump Urgent Header Banner for Reply */}
                        {r.isBuzzed && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mb-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 flex items-center justify-between gap-1 text-[10px] font-bold text-amber-500 select-none animate-pulse"
                          >
                            <div className="flex items-center gap-1">
                              <Zap size={11} className="fill-amber-500" />
                              <span>
                                BUZZ {r.buzzCount && r.buzzCount > 1 ? `(x${r.buzzCount})` : ''}
                                {r.latestBuzz?.senderName ? ` · ${r.latestBuzz.senderName}` : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              aria-label="Nghe @MAI đọc tin nhắn khẩn cấp"
                              onClick={() => {
                                const spokenText = buildMaiUrgentVoiceAnnouncement({
                                  senderName: r.latestBuzz?.senderName || r.senderName || 'Đồng nghiệp',
                                  conversationName: activeConversation?.name,
                                  isSpace: activeConversation?.type === 'space',
                                  messageText: r.text || '',
                                  note: r.latestBuzz?.note,
                                });
                                void playNeuralSpeech(spokenText, {
                                  voice: 'vi-VN-HoaiMyNeural',
                                  speed: ttsSpeed || 1.0,
                                });
                              }}
                              className="text-[9.5px] font-semibold text-amber-400/90 hover:underline hover:text-amber-300 cursor-pointer inline-flex items-center gap-0.5 ml-1 px-1 rounded bg-amber-500/10"
                              title="Nghe @MAI đọc tin nhắn khẩn cấp"
                            >
                              <Volume2 size={9} />
                              <span>@MAI</span>
                            </button>
                          </div>
                        )}

                        {r.text && (
                          <div className="leading-relaxed break-words text-left">
                            {renderRichTextMessage(r.text, isReplyMine, {
                              onQuoteClick: (senderName, quotedContent) => {
                                const threadReplies = (activeThreadMessage?.thread ?? []) as Array<{
                                  id: string;
                                  senderName?: string;
                                  text?: string | null;
                                }>;
                                const foundId = findSourceMessage(threadReplies, {
                                  senderName,
                                  content: quotedContent,
                                });
                                if (foundId) scrollToMessageAndFlash(foundId, threadMessagesContainerRef.current);
                              },
                            })}
                          </div>
                        )}

                        {/* Quick Voice Read-Aloud for AI Reply in Thread */}
                        {isAiReply && r.text && (
                          <div className="mt-1 flex items-center gap-1">
                            <Tooltip
                              title={
                                speakingMsgId === r.id
                                  ? 'Dừng đọc giọng nói'
                                  : `Đọc câu trả lời bằng giọng Hoài My (${ttsSpeed}x)`
                              }
                            >
                              <button
                                type="button"
                                aria-label="Đọc câu trả lời AI"
                                onClick={() => handleSpeakAiMessage(r)}
                                className="inline-flex items-center justify-center p-1 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                                style={{
                                  background: speakingMsgId === r.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                                  border: `1px solid ${speakingMsgId === r.id ? 'rgba(139, 92, 246, 0.5)' : borderColor}`,
                                  color: speakingMsgId === r.id ? '#a78bfa' : token.colorTextSecondary,
                                }}
                              >
                                {speakingMsgId === r.id ? (
                                  <VolumeX size={11} className="animate-pulse" />
                                ) : (
                                  <Volume2 size={11} />
                                )}
                              </button>
                            </Tooltip>

                            <Tooltip title="Sao chép nội dung">
                              <button
                                type="button"
                                aria-label="Sao chép nội dung AI"
                                onClick={() => {
                                  void navigator.clipboard?.writeText(r.text || '');
                                  antdMessage.success('Đã sao chép nội dung câu trả lời AI');
                                }}
                                className="inline-flex items-center justify-center p-1.5 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                                style={{
                                  background: surfaceRaised,
                                  border: `1px solid ${borderColor}`,
                                  color: token.colorTextSecondary,
                                }}
                              >
                                <Copy size={13} />
                              </button>
                            </Tooltip>
                          </div>
                        )}
                      </>
                    )}

                    {renderMessageAttachments(r.attachments, true, isReplyMine)}

                    {!r.isDeleted && r.customerCard && (
                      <div className="mt-1.5">
                        <MosChatCustomerCardAttachment
                          card={r.customerCard}
                          isMe={isReplyMine}
                          onOpenCustomer={openCustomerDetail}
                        />
                      </div>
                    )}

                    {/* Reaction Pills for Thread Reply */}
                    {r.reactions && Object.entries(r.reactions).filter(([, count]) => count > 0).length > 0 && (
                      <div
                        className={`mt-1.5 flex flex-wrap items-center gap-1 ${
                          isReplyMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {Object.entries(r.reactions)
                          .filter(([, count]) => count > 0)
                          .map(([emoji, count]) => {
                            const reactedByMe = hasUserReacted(r, emoji);
                            const stickerReaction = parseStickerReactionKey(emoji);
                            const label = stickerReaction ? stickerReaction.caption || stickerReaction.title : emoji;
                            return (
                              <Tooltip
                                key={emoji}
                                title={
                                  reactedByMe ? `Bạn đã thả ${label} · Nhấn để gỡ cảm xúc` : `Nhấn để thả cùng ${label}`
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleReaction(activeThreadMessage.id, emoji, r.id)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer tabular-nums transition-all hover:scale-105"
                                  style={{
                                    background: reactedByMe ? 'rgba(212, 168, 75, 0.16)' : surfaceRaised,
                                    border: `1px solid ${reactedByMe ? 'rgba(212, 168, 75, 0.55)' : borderColor}`,
                                    color: reactedByMe ? '#d4a84b' : token.colorText,
                                  }}
                                >
                                  {stickerReaction ? (
                                    <MosChatStickerVisual sticker={stickerReaction} size="reaction" />
                                  ) : (
                                    <span>{emoji}</span>
                                  )}
                                  <span>{count}</span>
                                </button>
                              </Tooltip>
                            );
                          })}
                      </div>
                    )}

                    {/* Reply Hover Action Toolbar */}
                    <div
                      className={`${
                        openMovePopoverKey === `reply:${activeThreadMessage.id}:${r.id}` ||
                        openStickerPopoverKey === `reply:${activeThreadMessage.id}:${r.id}`
                          ? 'opacity-100 pointer-events-auto ring-1 ring-amber-500/50'
                          : 'opacity-0'
                      } group-hover:opacity-100 transition-opacity absolute -top-3.5 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded-full shadow-sm`}
                      style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
                    >
                      {!r.isDeleted && (
                        <>
                          {/* Reply / Quote inside Thread Button */}
                          <Tooltip title="Trả lời phản hồi này">
                            <button
                              type="button"
                              aria-label="Trả lời phản hồi này trong luồng"
                              onClick={() => {
                                setReplyingToReply({
                                  id: r.id,
                                  senderName: r.senderName,
                                  text: r.text || '',
                                });
                                setTimeout(() => {
                                  threadInputRef.current?.focus();
                                }, 50);
                              }}
                              className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer text-amber-500 transition-transform hover:scale-110"
                            >
                              <MessageSquareReply size={11} />
                            </button>
                          </Tooltip>

                          {GOOGLE_CHAT_QUICK_EMOJIS.slice(0, 3).map((emoji) => {
                            const reactedByMe = hasUserReacted(r, emoji);
                            return (
                              <Tooltip
                                key={emoji}
                                title={reactedByMe ? `Đã thả ${emoji} · Nhấn để gỡ` : `Thả nhanh ${emoji}`}
                              >
                                <button
                                  type="button"
                                  aria-label={reactedByMe ? `Gỡ cảm xúc ${emoji}` : `Thả nhanh ${emoji}`}
                                  onClick={() => handleToggleReaction(activeThreadMessage.id, emoji, r.id)}
                                  className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-transform hover:scale-110"
                                  style={{
                                    background: reactedByMe ? 'rgba(212, 168, 75, 0.22)' : 'transparent',
                                    boxShadow: reactedByMe ? 'inset 0 0 0 1px rgba(212, 168, 75, 0.55)' : 'none',
                                  }}
                                >
                                  {emoji}
                                </button>
                              </Tooltip>
                            );
                          })}

                          <Popover
                            trigger="click"
                            placement={isReplyMine ? 'topRight' : 'topLeft'}
                            open={openStickerPopoverKey === `reply:${activeThreadMessage.id}:${r.id}`}
                            onOpenChange={(vis) =>
                              setOpenStickerPopoverKey(vis ? `reply:${activeThreadMessage.id}:${r.id}` : null)
                            }
                            content={renderReactionPickerContent(activeThreadMessage.id, r, r.id)}
                          >
                            <Tooltip title="Chọn biểu tượng cảm xúc">
                              <button
                                type="button"
                                aria-label="Chọn biểu tượng cảm xúc"
                                className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                style={{ color: token.colorTextSecondary }}
                              >
                                <SmilePlus size={11} />
                              </button>
                            </Tooltip>
                          </Popover>

                          <span className="w-px h-3 mx-0.5" style={{ background: borderStrong }} />

                          {/* Add to Task Checklist button */}
                          {(() => {
                            const linkedTask = uniqueTasks?.find(
                              (t) => t.id === activeThreadMessage.taskId || t.sourceMessageId === activeThreadMessage.id
                            );
                            if (!linkedTask || r.isDeleted) return null;
                            return (
                              <Tooltip title="Thêm phản hồi này vào Checklist của Task">
                                <button
                                  type="button"
                                  aria-label="Thêm vào Checklist của Task"
                                  onClick={async () => {
                                    const replyText = (r.text || '').trim().slice(0, 150);
                                    if (replyText) {
                                      await handleUpdateTask?.(linkedTask.id, {
                                        checklistAction: 'add',
                                        checklistItem: { title: replyText, sourceReplyId: r.id },
                                      });
                                      antdMessage.success('Đã thêm phản hồi vào Checklist của Task');
                                    }
                                  }}
                                  className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer text-amber-500 transition-transform hover:scale-110"
                                >
                                  <ListTodo size={11} />
                                </button>
                              </Tooltip>
                            );
                          })()}
                          {/* Create Task & Reminder from this reply */}
                          {openTaskModalFromMessage && !r.isDeleted && (
                            <Tooltip title="Tạo Task & Hẹn giờ nhắc từ phản hồi này">
                              <button
                                type="button"
                                aria-label="Tạo Task & Hẹn giờ nhắc từ phản hồi này"
                                onClick={() => openTaskModalFromMessage(activeThreadMessage, r)}
                                className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer text-amber-500 transition-transform hover:scale-110"
                                style={{
                                  background: 'rgba(212, 168, 75, 0.16)',
                                  color: '#d4a84b',
                                }}
                              >
                                <AlarmClockPlus size={11} />
                              </button>
                            </Tooltip>
                          )}
                        </>
                      )}

                      {/* Buzz / Bump Urgent Reply Button */}
                      {!r.isDeleted && (
                        <Tooltip
                          title={
                            r.isBuzzed
                              ? `Đã Buzz ${r.buzzCount || 1} lần · Nhấp để Buzz lại phản hồi khẩn cấp`
                              : '⚡ Buzz / Bump phản hồi khẩn cấp'
                          }
                        >
                          <Popconfirm
                            title="⚡ Buzz / Bump phản hồi khẩn cấp?"
                            description="Gửi tín hiệu cảnh báo nổi bật kèm âm thanh & rung để người nhận chú ý xử lý ngay."
                            onConfirm={() => handleBuzzMessage(activeThreadMessage.id, r.id)}
                            okText="⚡ Buzz ngay"
                            cancelText="Huỷ"
                            okButtonProps={{
                              style: {
                                backgroundColor: '#f59e0b',
                                borderColor: '#f59e0b',
                                color: '#000',
                                fontWeight: 'bold',
                              },
                            }}
                            zIndex={1350}
                            overlayStyle={{ zIndex: 1350 }}
                          >
                            <button
                              type="button"
                              aria-label="Buzz / Bump phản hồi khẩn cấp"
                              className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer text-amber-500 transition-transform hover:scale-110"
                              style={{
                                background: r.isBuzzed ? 'rgba(245, 158, 11, 0.22)' : 'transparent',
                              }}
                            >
                              <Zap
                                size={11}
                                className={r.isBuzzed ? 'fill-amber-500 animate-pulse text-amber-500' : ''}
                              />
                            </button>
                          </Popconfirm>
                        </Tooltip>
                      )}
                      {(isReplyMine || canManageChatThreads) && !r.isDeleted && !r.isMissionMilestone && (
                        <Popover
                          trigger="click"
                          placement="topRight"
                          open={openMovePopoverKey === `reply:${activeThreadMessage.id}:${r.id}`}
                          onOpenChange={(vis) => {
                            setOpenMovePopoverKey(vis ? `reply:${activeThreadMessage.id}:${r.id}` : null);
                            if (!vis) setMoveThreadSearchQuery('');
                          }}
                          content={renderMoveReplyPopover(activeThreadMessage, r)}
                        >
                          <Tooltip title="Tách ra luồng chính hoặc chuyển sang luồng khác">
                            <button
                              type="button"
                              aria-label="Tách hoặc chuyển câu trả lời sang luồng khác"
                              className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-amber-500/15 cursor-pointer"
                              style={{
                                color:
                                  openMovePopoverKey === `reply:${activeThreadMessage.id}:${r.id}`
                                    ? '#d4a84b'
                                    : token.colorTextSecondary,
                              }}
                            >
                              <ArrowUpRight size={11} />
                            </button>
                          </Tooltip>
                        </Popover>
                      )}
                      {/* Edit Reply Button (author only, and not deleted) */}
                      {isReplyMine && !r.isDeleted && (
                        <Tooltip title="Chỉnh sửa">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(activeThreadMessage, r.id)}
                            className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-white/10 cursor-pointer"
                            style={{ color: token.colorTextSecondary }}
                          >
                            <Pencil size={11} />
                          </button>
                        </Tooltip>
                      )}
                      {(isReplyMine || isDannyAccount) && !r.isDeleted && (
                        <Tooltip title="Xoá câu trả lời">
                          <Popconfirm
                            title="Xoá câu trả lời này?"
                            onConfirm={() => handleDeleteMessage(activeThreadMessage.id, r.id)}
                            okText="Xoá"
                            cancelText="Huỷ"
                            okButtonProps={{ danger: true }}
                            zIndex={1350}
                            overlayStyle={{ zIndex: 1350 }}
                          >
                            <button
                              type="button"
                              className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-rose-500/15 cursor-pointer text-rose-400"
                            >
                              <Trash2 size={11} />
                            </button>
                          </Popconfirm>
                        </Tooltip>
                      )}
                      {(r.isDeleted || (r.editHistory && r.editHistory.length > 0)) && (
                        <Tooltip title="Lịch sử">
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryModalMessage(r as SafeAny);
                              setHistoryModalOpen(true);
                            }}
                            className="w-5 h-5 rounded-full inline-flex items-center justify-center text-amber-400 cursor-pointer hover:bg-amber-500/10"
                          >
                            <History size={11} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
                {stoppedReadersForReply.length > 0 && (
                  <div className={`w-full flex ${isReplyMine ? 'justify-end pr-8' : 'justify-start pl-8'}`}>
                    {renderMiniSeenAvatarStack(stoppedReadersForReply, replyBreakdown.unseenBy, {
                      align: isReplyMine ? 'right' : 'left',
                      scopeLabel: 'Đã xem đến phản hồi này trong luồng',
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {aiThinkingActive && (
            <div className="flex gap-2 items-start text-left p-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)',
                }}
              >
                <Bot size={13} className="animate-spin" />
              </div>
              <div
                className="p-2 rounded-xl text-[11.5px] max-w-[85%]"
                style={{
                  background: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <span className="font-semibold text-purple-400">🤖 MAI</span>
                <span className="text-slate-400 ml-1.5 animate-pulse tabular-nums">
                  Đang phân tích luồng ({aiElapsedSec}s)...
                </span>
              </div>
            </div>
          )}
          <div ref={threadMessagesEndRef} />
        </div>

        <div
          className="p-2.5 space-y-1.5"
          style={{ borderTop: `1px solid ${borderColor}` }}
          onDragOver={(e) => {
            if (draggingRootMsgId) return;
            const hasFiles =
              Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
            if (hasFiles) {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
              if (!isDraggingOverThread) setIsDraggingOverThread(true);
              if (isDraggingOver) setIsDraggingOver(false);
            }
          }}
          onDrop={(e) => {
            if (draggingRootMsgId) return;
            if (e.dataTransfer?.files?.length) {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(false);
              setIsDraggingOverThread(false);
              void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
            }
          }}
        >
          {renderStagedAttachmentsStrip(threadAttachments, 'thread')}
          <div
            className={`relative rounded-2xl px-3 pt-2 pb-1.5 flex flex-col transition-all shadow-sm focus-within:shadow-md focus-within:border-[#d4a84b]/60 ${
              isDraggingOverThread ? 'ring-2 ring-amber-500/70 border-[#d4a84b]' : ''
            }`}
            style={{
              background: surfaceRaised,
              border: `1px solid ${isDraggingOverThread ? '#d4a84b' : borderStrong}`,
            }}
            onDragOver={(e) => {
              if (draggingRootMsgId) return;
              const hasFiles =
                Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
              if (hasFiles) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                if (!isDraggingOverThread) setIsDraggingOverThread(true);
                if (isDraggingOver) setIsDraggingOver(false);
              }
            }}
            onDrop={(e) => {
              if (draggingRootMsgId) return;
              if (e.dataTransfer?.files?.length) {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOver(false);
                setIsDraggingOverThread(false);
                void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
              }
            }}
          >
            {renderMentionAutocompleteDropdown('thread')}

            {/* Staged Customer Card for Thread */}
            {stagedCustomerCard && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs animate-in fade-in slide-in-from-bottom-1 duration-150 mb-1.5"
                style={{
                  background: isDark ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.08)',
                  border: `1px solid ${accentBorder}`,
                }}
              >
                <Avatar
                  size={20}
                  className="shrink-0 font-bold text-[10px]"
                  style={{
                    backgroundColor: '#d4a84b',
                    color: '#000',
                  }}
                >
                  {(stagedCustomerCard.name || 'KH')
                    .trim()
                    .split(/\s+/)
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(-2)
                    .join('')
                    .toUpperCase()}
                </Avatar>
                <span className="font-semibold truncate text-[11.5px]" style={{ color: token.colorText }}>
                  {stagedCustomerCard.name}
                </span>
                <span className="truncate text-amber-500 font-medium text-[11px]">({stagedCustomerCard.meta})</span>
                {stagedCustomerCard.cvName && (
                  <span className="text-slate-400 truncate hidden sm:inline text-[11px]">
                    · {stagedCustomerCard.cvName}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setStagedCustomerCard?.(null)}
                  className="ml-auto w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  style={{ color: token.colorTextSecondary }}
                  title="Bỏ đính kèm thẻ khách hàng khỏi luồng"
                  aria-label="Bỏ đính kèm thẻ khách hàng khỏi luồng"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Quoting Preview Banner inside Subthread */}
            {replyingToReply && (
              <div
                className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs animate-in fade-in slide-in-from-bottom-1 duration-150 mb-1.5"
                style={{
                  background: isDark ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.08)',
                  border: `1px solid ${accentBorder}`,
                }}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <MessageSquareReply size={13} className="text-amber-500 shrink-0" />
                  <div className="truncate text-[11.5px]">
                    <span className="font-bold text-amber-500">Trả lời {replyingToReply.senderName}:</span>{' '}
                    <span className="truncate opacity-80" style={{ color: token.colorTextSecondary }}>
                      {replyingToReply.text}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToReply(null)}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer shrink-0 transition-colors"
                  aria-label="Hủy trích dẫn"
                  title="Hủy trích dẫn (Esc)"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {isMobile ? (
              <div className="flex flex-col gap-2">
                {/* Quick action grid drawer on mobile in Thread */}
                {mobileActionOpen && (
                  <div
                    className="p-3 rounded-2xl grid grid-cols-3 gap-2.5 transition-all shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 mb-1"
                    style={{
                      background: surfaceRaised,
                      border: `1px solid ${borderStrong}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        triggerFilePicker('thread');
                        setMobileActionOpen(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 overflow-hidden shrink-0">
                        <ImagePlus size={16} />
                      </div>
                      <span
                        className="text-[10.5px] font-medium text-center leading-tight"
                        style={{ color: token.colorText }}
                      >
                        Gửi ảnh
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (uploadTargetRef) uploadTargetRef.current = { scope: 'thread' };
                        setDriveLinkModalOpen?.(true);
                        setMobileActionOpen(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20 overflow-hidden shrink-0">
                        <HardDrive size={16} />
                      </div>
                      <span
                        className="text-[10.5px] font-medium text-center leading-tight"
                        style={{ color: token.colorText }}
                      >
                        Drive
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleOpenCustomerPicker?.('thread');
                        setMobileActionOpen(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 overflow-hidden shrink-0">
                        <UserRoundPlus size={16} />
                      </div>
                      <span
                        className="text-[10.5px] font-medium text-center leading-tight"
                        style={{ color: token.colorText }}
                      >
                        Thẻ khách
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openTaskModalFromMessage?.(activeThreadMessage);
                        setMobileActionOpen(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-400/15 text-[#d4a84b] border border-[#d4a84b]/30 overflow-hidden shrink-0">
                        <AlarmClockPlus size={16} />
                      </div>
                      <span
                        className="text-[10.5px] font-medium text-center leading-tight"
                        style={{ color: token.colorText }}
                      >
                        Giao việc
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setThreadInput((prev) => {
                          const next = `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`;
                          setTimeout(() => {
                            threadInputRef.current?.focus();
                            const len = next.length;
                            threadInputRef.current?.setSelectionRange(len, len);
                            checkForMentionTrigger(next, len, 'thread');
                          }, 20);
                          return next;
                        });
                        setMobileActionOpen(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-sky-500/10 text-sky-400 border border-sky-500/20 overflow-hidden shrink-0">
                        <AtSign size={16} />
                      </div>
                      <span
                        className="text-[10.5px] font-medium text-center leading-tight"
                        style={{ color: token.colorText }}
                      >
                        Nhắc tên
                      </span>
                    </button>

                    {canUseAiCopilot && (
                      <button
                        type="button"
                        onClick={() => {
                          setThreadInput((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                          setMobileActionOpen(false);
                          threadInputRef.current?.focus();
                        }}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-500/15 text-purple-400 border border-purple-500/30 overflow-hidden shrink-0 font-black text-[11px]">
                          MAI
                        </div>
                        <span
                          className="text-[10.5px] font-medium text-center leading-tight"
                          style={{ color: token.colorText }}
                        >
                          Gọi @MAI
                        </span>
                      </button>
                    )}

                    {/* CKEditor Mobile Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setRichEditorModalState({
                          open: true,
                          scope: 'thread',
                          title: 'Soạn thảo phản hồi (CKEditor)',
                        });
                        setMobileActionOpen(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-400 border border-amber-500/30 overflow-hidden shrink-0">
                        <FilePenLine size={16} />
                      </div>
                      <span
                        className="text-[10.5px] font-medium text-center leading-tight"
                        style={{ color: token.colorText }}
                      >
                        CKEditor
                      </span>
                    </button>
                  </div>
                )}

                {/* Apple Notes Style Format Toolbar for Mobile */}
                {formatBarOpenThread && renderAppleNotesFormatToolbar('thread', 'inline')}

                {/* Mobile Main Row */}
                <div className="flex items-center gap-1.5">
                  {/* [+] Action expander button */}
                  <button
                    type="button"
                    aria-label={mobileActionOpen ? 'Đóng tiện ích đính kèm' : 'Mở tiện ích đính kèm'}
                    onClick={() => setMobileActionOpen((prev) => !prev)}
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden"
                    style={{
                      background: mobileActionOpen ? '#d4a84b' : surfaceRaised,
                      border: `1px solid ${mobileActionOpen ? '#d4a84b' : borderStrong}`,
                      color: mobileActionOpen ? '#000' : token.colorTextSecondary,
                    }}
                  >
                    {mobileActionOpen ? <X size={15} /> : <Plus size={15} />}
                  </button>

                  {/* [Aa] Apple Notes Format Button for Mobile */}
                  <button
                    type="button"
                    aria-label="Định dạng chữ Apple Notes trong luồng"
                    onClick={() => setFormatBarOpenThread((prev) => !prev)}
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden"
                    style={{
                      background: formatBarOpenThread ? '#d4a84b' : surfaceRaised,
                      border: `1px solid ${formatBarOpenThread ? '#d4a84b' : borderStrong}`,
                      color: formatBarOpenThread ? '#000' : token.colorTextSecondary,
                    }}
                  >
                    <span className="font-serif font-bold text-[13px] tracking-tight">Aa</span>
                  </button>

                  {/* Text Input Pill */}
                  <div
                    className="relative flex-1 min-h-[38px] max-h-[120px] rounded-2xl px-3 py-1 flex items-center gap-1.5"
                    style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
                  >
                    <textarea
                      ref={threadInputRef}
                      rows={1}
                      value={threadInput}
                      onChange={(e) => {
                        const next = e.target.value;
                        setThreadInput(next);
                        const pos = e.target.selectionEnd || 0;
                        setThreadCursorPos(pos);
                        checkForMentionTrigger(next, pos, 'thread');
                      }}
                      onSelect={(e) => {
                        const pos = (e.target as HTMLTextAreaElement).selectionEnd || 0;
                        setThreadCursorPos(pos);
                        checkForMentionTrigger(threadInput, pos, 'thread');
                      }}
                      onKeyDown={(e) => {
                        if (handleMentionKeyDown(e, 'thread')) return;
                        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                          e.preventDefault();
                          handleApplyFormat('bold', 'thread');
                          return;
                        }
                        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                          e.preventDefault();
                          handleApplyFormat('italic', 'thread');
                          return;
                        }
                        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                          e.preventDefault();
                          handleApplyFormat('underline', 'thread');
                          return;
                        }
                        if (e.key === 'Escape' && replyingToReply) {
                          e.preventDefault();
                          setReplyingToReply(null);
                          return;
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          if (
                            e.nativeEvent.isComposing ||
                            isComposingRef.current ||
                            e.keyCode === 229 ||
                            Date.now() - lastCompositionEndMsRef.current < 60
                          ) {
                            return;
                          }
                          e.preventDefault();
                          handleThreadSubmit();
                        }
                      }}
                      placeholder="Trả lời vào luồng..."
                      className="w-full bg-transparent border-0 outline-none text-[13px] resize-none leading-relaxed px-0.5 py-1 min-h-[36px]"
                      style={{ color: token.colorText, maxHeight: 120 }}
                    />

                    <Popover
                      trigger="click"
                      placement="topRight"
                      open={openStickerPopoverKey === 'composer:thread'}
                      onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:thread' : null)}
                      content={renderComposerEmojiPickerContent('thread')}
                    >
                      <button
                        type="button"
                        aria-label="Chọn biểu tượng cảm xúc vào luồng"
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <SmilePlus size={16} />
                      </button>
                    </Popover>
                  </div>

                  {/* Send button */}
                  <button
                    type="button"
                    aria-label="Gửi phản hồi vào luồng"
                    onClick={() => void handleThreadSubmit()}
                    disabled={!threadInput.trim() && threadAttachments.length === 0 && !stagedCustomerCard}
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
                    style={{
                      background:
                        threadInput.trim() || threadAttachments.length > 0 || stagedCustomerCard
                          ? '#d4a84b'
                          : surfaceRaised,
                      color:
                        threadInput.trim() || threadAttachments.length > 0 || stagedCustomerCard
                          ? '#000'
                          : token.colorTextQuaternary,
                      border: `1px solid ${borderStrong}`,
                    }}
                  >
                    <SendHorizontal size={15} />
                  </button>
                </div>
              </div>
            ) : (
              /* Desktop Layout */
              <div>
                {/* Inline Compact Format Toolbar in Thread */}
                {formatBarOpenThread && renderAppleNotesFormatToolbar('thread', 'inline')}

                {isPreviewModeThread ? (
                  <div
                    className="w-full min-h-[50px] max-h-[160px] overflow-y-auto px-1 py-1 rounded-lg select-text mb-1"
                    style={{ color: token.colorText }}
                  >
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-amber-500/20 text-[10.5px] font-bold text-amber-500">
                      <div className="flex items-center gap-1.5">
                        <Eye size={12} />
                        <span>Đang xem trước phản hồi luồng</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPreviewModeThread(false)}
                        className="text-[10.5px] px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-medium transition-colors cursor-pointer"
                      >
                        Quay lại sửa
                      </button>
                    </div>
                    {threadInput.trim() ? (
                      <div className="prose max-w-none text-[13px]">{renderRichTextMessage(threadInput, false)}</div>
                    ) : (
                      <div className="text-zinc-500 text-[11.5px] italic py-1">Chưa có nội dung để xem trước...</div>
                    )}
                  </div>
                ) : (
                  <textarea
                    ref={threadInputRef}
                    rows={1}
                    value={threadInput}
                    onDragOver={(e) => {
                      if (draggingRootMsgId) return;
                      const hasFiles =
                        Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
                      if (hasFiles) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'copy';
                        if (!isDraggingOverThread) setIsDraggingOverThread(true);
                        if (isDraggingOver) setIsDraggingOver(false);
                      }
                    }}
                    onDrop={(e) => {
                      if (draggingRootMsgId) return;
                      if (e.dataTransfer?.files?.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingOver(false);
                        setIsDraggingOverThread(false);
                        void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
                      }
                    }}
                    onChange={(e) => {
                      const next = e.target.value;
                      setThreadInput(next);
                      const pos = e.target.selectionEnd || 0;
                      setThreadCursorPos(pos);
                      checkForMentionTrigger(next, pos, 'thread');
                    }}
                    onSelect={(e) => {
                      const pos = (e.target as HTMLTextAreaElement).selectionEnd || 0;
                      setThreadCursorPos(pos);
                      checkForMentionTrigger(threadInput, pos, 'thread');
                    }}
                    onKeyDown={(e) => {
                      if (handleMentionKeyDown(e, 'thread')) {
                        return;
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                        e.preventDefault();
                        handleApplyFormat('bold', 'thread');
                        return;
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                        e.preventDefault();
                        handleApplyFormat('italic', 'thread');
                        return;
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                        e.preventDefault();
                        handleApplyFormat('underline', 'thread');
                        return;
                      }
                      if (e.key === 'Enter' && e.shiftKey) {
                        const el = e.currentTarget;
                        const smart = handleSmartListEnterKey(
                          threadInput,
                          el.selectionStart || 0,
                          el.selectionEnd || 0
                        );
                        if (smart?.handled) {
                          e.preventDefault();
                          setThreadInput(smart.nextText);
                          setThreadCursorPos(smart.nextCursor);
                          setTimeout(() => {
                            el.focus();
                            el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                          }, 0);
                          return;
                        }
                      }
                      if (e.key === 'Escape' && replyingToReply) {
                        e.preventDefault();
                        setReplyingToReply(null);
                        return;
                      }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        if (
                          e.nativeEvent.isComposing ||
                          isComposingRef.current ||
                          e.keyCode === 229 ||
                          Date.now() - lastCompositionEndMsRef.current < 60
                        ) {
                          return;
                        }
                        e.preventDefault();
                        handleThreadSubmit();
                      }
                    }}
                    placeholder="Trả lời vào luồng... (gõ @MAI để gọi mOS AI, @ để nhắc tên, Shift+Enter xuống dòng)"
                    className="w-full bg-transparent border-0 outline-none text-[13px] resize-none leading-relaxed px-0.5 py-1 min-h-[36px]"
                    style={{
                      color: token.colorText,
                      maxHeight: 140,
                    }}
                  />
                )}

                {/* Bottom row: Tools on Left, Send on Right */}
                <div
                  className="flex items-center justify-between gap-1.5 pt-1 mt-0.5 border-t"
                  style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }}
                >
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {/* [Aa] Inline Quick-Type Format Bar Button in Thread */}
                    <Tooltip title="Thanh định dạng gọn gõ nhanh (B, I, U, Màu chữ, Danh sách •)">
                      <button
                        type="button"
                        aria-label="Định dạng chữ Apple Notes trong luồng"
                        onClick={() => setFormatBarOpenThread((prev) => !prev)}
                        className="w-7 h-7 rounded-lg inline-flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                        style={{
                          background: formatBarOpenThread ? 'rgba(236, 72, 153, 0.18)' : 'transparent',
                          color: formatBarOpenThread ? '#f472b6' : token.colorTextSecondary,
                          border: formatBarOpenThread ? '1px solid rgba(236, 72, 153, 0.35)' : 'none',
                        }}
                      >
                        <span className="font-serif font-bold text-[11.5px] leading-none tracking-tight">Aa</span>
                        <span
                          className="w-3 h-[2px] rounded-full mt-0.5"
                          style={{ background: formatBarOpenThread ? '#f472b6' : 'currentColor', opacity: 0.75 }}
                        />
                      </button>
                    </Tooltip>

                    {/* [⚡ Gọn] Compact Quick-Type Editor in Thread */}
                    <Tooltip title="Mở Bản gọn (Type nhanh) cho luồng phản hồi">
                      <button
                        type="button"
                        aria-label="Mở trình soạn thảo Bản gọn trong luồng"
                        onClick={() => {
                          setRichEditorModalState({
                            open: true,
                            scope: 'thread',
                            title: 'Soạn thảo phản hồi (CKEditor)',
                            initialMode: 'compact',
                          });
                        }}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-pink-500/15 active:scale-95 transition-all text-pink-400"
                      >
                        <Zap size={13} />
                      </button>
                    </Tooltip>

                    {/* [CKEditor] Button in Thread */}
                    <Tooltip title="Mở rộng trình soạn thảo CKEditor cho luồng phản hồi">
                      <button
                        type="button"
                        aria-label="Mở trình soạn thảo phong phú CKEditor trong luồng"
                        onClick={() => {
                          setRichEditorModalState({
                            open: true,
                            scope: 'thread',
                            title: 'Soạn thảo phản hồi (CKEditor)',
                            initialMode: 'split',
                          });
                        }}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-amber-500/15 active:scale-95 transition-all text-amber-500"
                      >
                        <FilePenLine size={14} />
                      </button>
                    </Tooltip>

                    <Popover
                      trigger="click"
                      placement="topRight"
                      open={openStickerPopoverKey === 'composer:thread'}
                      onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:thread' : null)}
                      content={renderComposerEmojiPickerContent('thread')}
                    >
                      <Tooltip title="Gửi Sticker động / Meme / Emoji vào luồng">
                        <button
                          type="button"
                          aria-label="Gửi Sticker động hoặc Emoji vào luồng"
                          className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                          style={{ color: token.colorTextSecondary }}
                        >
                          <SmilePlus size={15} />
                        </button>
                      </Tooltip>
                    </Popover>

                    <Tooltip title="Đính kèm tệp tin (PDF, Excel, Word...)">
                      <button
                        type="button"
                        aria-label="Đính kèm tệp tin vào luồng"
                        onClick={() => triggerFilePicker('thread')}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <Paperclip size={15} />
                      </button>
                    </Tooltip>

                    <Tooltip title="Tải hình vào luồng">
                      <button
                        type="button"
                        aria-label="Tải hình vào luồng"
                        onClick={() => triggerFilePicker('thread')}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <ImagePlus size={15} />
                      </button>
                    </Tooltip>

                    {/* [HardDrive] Đính kèm hình từ Google Drive */}
                    <Tooltip title="Đính kèm hình từ link Google Drive vào luồng">
                      <button
                        type="button"
                        aria-label="Đính kèm hình từ link Google Drive vào luồng"
                        onClick={() => {
                          if (uploadTargetRef) uploadTargetRef.current = { scope: 'thread' };
                          setDriveLinkModalOpen?.(true);
                        }}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <HardDrive size={15} />
                      </button>
                    </Tooltip>

                    {/* [UserRoundPlus] Đính kèm thẻ Khách hàng */}
                    <Tooltip title="Đính kèm thẻ Khách hàng / Booking mOS vào luồng">
                      <button
                        type="button"
                        aria-label="Đính kèm thẻ Khách hàng vào luồng"
                        onClick={() => handleOpenCustomerPicker?.('thread')}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                        style={{ color: stagedCustomerCard ? '#d4a84b' : token.colorTextSecondary }}
                      >
                        <UserRoundPlus size={15} />
                      </button>
                    </Tooltip>

                    {/* [Bot] Call @MAI in Thread */}
                    {canUseAiCopilot && (
                      <Tooltip title="Gọi @MAI để mOS AI phân tích & tư vấn trực tiếp vào luồng này">
                        <button
                          type="button"
                          aria-label="Gọi @MAI trong luồng"
                          onClick={() => {
                            setThreadInput((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                            setTimeout(() => {
                              threadInputRef.current?.focus();
                            }, 20);
                          }}
                          className="h-7 px-2 rounded-lg inline-flex items-center justify-center gap-1 shrink-0 cursor-pointer hover:bg-purple-500/20 active:scale-95 transition-all text-purple-400 hover:text-purple-300 text-[11px] font-black"
                        >
                          <Bot size={14} />
                          <span>@MAI</span>
                        </button>
                      </Tooltip>
                    )}

                    {/* [@] Mention Button in Thread */}
                    <Tooltip title="Nhắc tên đồng nghiệp (@)">
                      <button
                        type="button"
                        aria-label="Nhắc tên đồng nghiệp trong luồng"
                        onClick={() => {
                          setThreadInput((prev) => {
                            const next = `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`;
                            setTimeout(() => {
                              threadInputRef.current?.focus();
                              const len = next.length;
                              threadInputRef.current?.setSelectionRange(len, len);
                              checkForMentionTrigger(next, len, 'thread');
                            }, 20);
                            return next;
                          });
                        }}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <AtSign size={15} />
                      </button>
                    </Tooltip>

                    {/* [Zap] Chế độ khẩn cấp (Buzz) */}
                    <Tooltip
                      title={
                        isUrgent
                          ? 'Đang bật chế độ khẩn cấp (Buzz) trong luồng: Nhấp để tắt'
                          : 'Bật chế độ khẩn cấp (Buzz) trong luồng: Gửi và phát âm thanh cảnh báo @MAI'
                      }
                    >
                      <button
                        type="button"
                        aria-label="Chế độ khẩn cấp trong luồng"
                        onClick={() => setIsUrgent((prev) => !prev)}
                        className={`h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer transition-all ${
                          isUrgent
                            ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400 font-black'
                            : 'hover:bg-amber-500/15 text-amber-500/80 border border-amber-500/30'
                        }`}
                      >
                        <Zap size={13} className={isUrgent ? 'animate-bounce' : ''} />
                        <span>Khẩn cấp</span>
                      </button>
                    </Tooltip>

                    {/* [AlarmClockPlus] Giao Task & Cài nhắc hẹn mới */}
                    <Tooltip title="Giao Task & Cài nhắc hẹn mới từ tin nhắn luồng">
                      <button
                        type="button"
                        aria-label="Giao Task & Cài nhắc hẹn mới từ tin nhắn luồng"
                        onClick={() => openTaskModalFromMessage?.(activeThreadMessage)}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 hover:bg-amber-500/15 cursor-pointer transition-colors"
                        style={{ color: '#d4a84b' }}
                      >
                        <AlarmClockPlus size={15} />
                      </button>
                    </Tooltip>

                    {/* [Activity] ⚡ Quy trình cho Super Admin */}
                    {isStrictDannySuperAdmin && activeConversation?.id !== AI_COPILOT_CONV_ID && (
                      <Tooltip title="⚡ Khởi tạo Quy trình Sống (/tam-ung, /kiem-kho, /tao-quy-trinh) — Chỉ dành cho Super Admin">
                        <button
                          type="button"
                          aria-label="Khởi tạo Quy trình Sống trong luồng"
                          onClick={() => {
                            if (setInitialWorkflowCode) setInitialWorkflowCode('WF_CASH_ADVANCE');
                            setTriggerWorkflowModalOpen?.(true);
                          }}
                          className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold hover:bg-blue-500/15 cursor-pointer transition-colors"
                          style={{
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                          }}
                        >
                          <Activity size={13} />
                          <span>⚡ Quy trình</span>
                        </button>
                      </Tooltip>
                    )}

                    {/* [↵] Quick Down-line / Xuống dòng Button */}
                    <Tooltip title="Xuống dòng (Shift+Enter)">
                      <button
                        type="button"
                        aria-label="Xuống dòng trong luồng"
                        onClick={() => {
                          const el = threadInputRef.current;
                          if (!el) return;
                          const isFocused = typeof document !== 'undefined' && document.activeElement === el;
                          const start = isFocused ? (el.selectionStart ?? threadInput.length) : threadInput.length;
                          const end = isFocused ? (el.selectionEnd ?? threadInput.length) : threadInput.length;
                          const smart = handleSmartListEnterKey(threadInput, start, end);
                          if (smart?.handled) {
                            setThreadInput(smart.nextText);
                            setThreadCursorPos(smart.nextCursor);
                            setTimeout(() => {
                              el.focus();
                              el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                            }, 0);
                          } else {
                            const next = threadInput.substring(0, start) + '\n' + threadInput.substring(end);
                            setThreadInput(next);
                            setThreadCursorPos(start + 1);
                            setTimeout(() => {
                              el.focus();
                              el.setSelectionRange(start + 1, start + 1);
                            }, 0);
                          }
                        }}
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <CornerDownLeft size={14} />
                      </button>
                    </Tooltip>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-[11px] select-none hidden sm:inline"
                      style={{ color: token.colorTextQuaternary }}
                    >
                      Enter gửi · Shift+Enter xuống dòng
                    </span>
                    <Tooltip title="Gửi vào luồng (Enter)">
                      <button
                        type="button"
                        aria-label="Gửi vào luồng"
                        onClick={() => void handleThreadSubmit()}
                        disabled={!threadInput.trim() && threadAttachments.length === 0 && !stagedCustomerCard}
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background:
                            threadInput.trim() || threadAttachments.length > 0 || stagedCustomerCard
                              ? '#d4a84b'
                              : isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'rgba(0, 0, 0, 0.06)',
                          color:
                            threadInput.trim() || threadAttachments.length > 0 || stagedCustomerCard
                              ? '#000'
                              : token.colorTextQuaternary,
                        }}
                      >
                        <SendHorizontal size={14} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    );
  }
);

MosChatThreadDrawer.displayName = 'MosChatThreadDrawer';
