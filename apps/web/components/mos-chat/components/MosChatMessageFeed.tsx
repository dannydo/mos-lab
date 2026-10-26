import React, { useState, useMemo } from 'react';
import { Tooltip, Popover, Popconfirm, Dropdown, Input } from 'antd';
import dayjs from 'dayjs';
import {
  AlarmClockPlus,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  CornerDownRight,
  ExternalLink,
  History,
  ImagePlus,
  Loader2,
  MessageSquareReply,
  Pencil,
  Pin,
  PinOff,
  Rocket,
  RotateCcw,
  Search,
  Sliders,
  SmilePlus,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  removeVietnameseTones,
  type MosChatConversation,
  type MosChatMessage,
  type MosChatTaskItem,
  type SafeAny,
} from '@mos-lab/shared';
import { MosChatStickerVisual, parsePureStickerMessage, parseStickerReactionKey } from '../mos-chat-stickers';
import { GOOGLE_CHAT_QUICK_EMOJIS } from '../constants/chat-constants';
import { buildMaiUrgentVoiceAnnouncement } from '../utils/chat-helpers';
import { playNeuralSpeech } from '../../voice-assistant/speech-utils';
import { MosChatWorkflowCard } from '../workflows/MosChatWorkflowCard';
import { sanitizeMovedThreadDuplicates } from '../store/useChatRealtimeSync';

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
    setOpenMovePopoverKey,
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
  }) => {
    const [moveThreadSearchQuery, setMoveThreadSearchQuery] = useState<string>('');

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
    }, [activeConversation?.messages]);

    const renderMoveRootToThreadPopover = (
      sourceMsg: MosChatMessage,
      prevMsg: MosChatMessage | null,
      allVisibleMessages: MosChatMessage[]
    ) => {
      const qNorm = removeVietnameseTones(moveThreadSearchQuery.trim().toLowerCase());
      const candidates = allVisibleMessages
        .filter((m) => m.id !== sourceMsg.id && !m.isDeleted && !m.isSystemReminder)
        .slice()
        .reverse()
        .filter((m) => {
          if (!qNorm) return true;
          const linkedTask =
            (m.taskId ? taskByMsgOrTaskId.get(m.taskId) : undefined) || taskByMsgOrTaskId.get(m.id);
          const taskCode = linkedTask?.id
            ? `TASK-${linkedTask.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5)}`
            : '';
          const hay = removeVietnameseTones(
            `${m.senderName} ${m.text || ''} ${linkedTask?.title || ''} ${taskCode} ${m.mission?.missionKey || ''}`.toLowerCase()
          );
          return hay.includes(qNorm);
        });

      const isBusy = movingThreadItemKey === `MERGE_ROOT_TO_THREAD:${sourceMsg.id}:`;
      const openThreadTarget =
        threadOpen && activeThreadMessage && activeThreadMessage.id !== sourceMsg.id && !activeThreadMessage.isDeleted
          ? activeThreadMessage
          : null;

      return (
        <div
          data-no-chat-autofocus="true"
          onClick={(e) => e.stopPropagation()}
          className="w-[320px] space-y-2 text-[12px]"
          style={{ color: token.colorText }}
        >
          <div
            className="flex items-center justify-between gap-2 pb-1"
            style={{ borderBottom: `1px solid ${borderColor}` }}
          >
            <div className="font-extrabold flex items-center gap-1.5 text-[12.5px]">
              <CornerDownRight size={14} className="text-amber-500 shrink-0" />
              <span>Gộp tin nhắn vào luồng phụ (Subthread)</span>
            </div>
          </div>

          {/* 1-Click Primary Action: Merge into the message immediately above */}
          {prevMsg && !prevMsg.isDeleted && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                void handleMoveThreadItem({
                  mode: 'MERGE_ROOT_TO_THREAD',
                  sourceMessageId: sourceMsg.id,
                  targetMessageId: prevMsg.id,
                })
              }
              className="w-full p-2 rounded-lg text-left cursor-pointer transition-all hover:brightness-105 disabled:opacity-50"
              style={{
                background: isDark ? 'rgba(212, 168, 75, 0.16)' : 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(212, 168, 75, 0.45)',
              }}
            >
              <div
                className="flex items-center justify-between gap-1.5 font-extrabold text-[11.5px]"
                style={{ color: '#d4a84b' }}
              >
                <span>⚡ Gộp vào luồng ngay phía trên (1-Click)</span>
                <span className="tabular-nums text-[10.5px]">
                  {(prevMsg.thread || []).filter((r) => !r.deletedAt).length} trả lời
                </span>
              </div>
              <div className="mt-0.5 text-[11px] truncate" style={{ color: token.colorText }}>
                <span className="font-bold">{prevMsg.senderName}:</span> {formatMoveTargetSnippet(prevMsg)}
              </div>
            </button>
          )}

          {/* 1-Click Secondary Action: Merge into the currently open Right-Side Thread */}
          {openThreadTarget && openThreadTarget.id !== prevMsg?.id && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                void handleMoveThreadItem({
                  mode: 'MERGE_ROOT_TO_THREAD',
                  sourceMessageId: sourceMsg.id,
                  targetMessageId: openThreadTarget.id,
                })
              }
              className="w-full p-2 rounded-lg text-left cursor-pointer transition-all hover:brightness-105 disabled:opacity-50"
              style={{
                background: isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.42)',
              }}
            >
              <div className="flex items-center justify-between gap-1.5 font-extrabold text-[11.5px] text-indigo-400">
                <span>👉 Gộp vào luồng đang mở bên phải</span>
                <span className="tabular-nums text-[10.5px]">
                  {(openThreadTarget.thread || []).filter((r) => !r.deletedAt).length} trả lời
                </span>
              </div>
              <div className="mt-0.5 text-[11px] truncate" style={{ color: token.colorText }}>
                <span className="font-bold">{openThreadTarget.senderName}:</span>{' '}
                {formatMoveTargetSnippet(openThreadTarget)}
              </div>
            </button>
          )}

          {/* Search & Pick any other message / thread in conversation */}
          <div className="space-y-1.5 pt-0.5">
            <Input
              size="small"
              allowClear
              placeholder="Tìm luồng / tin nhắn đích..."
              value={moveThreadSearchQuery}
              onChange={(e) => setMoveThreadSearchQuery(e.target.value)}
              prefix={<Search size={12} className="text-slate-400" />}
            />
            <div className="max-h-[190px] overflow-y-auto space-y-1 pr-0.5">
              {candidates.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-slate-400">Không tìm thấy tin nhắn đích phù hợp</div>
              ) : (
                candidates.slice(0, 25).map((target) => {
                  const replyCount = (target.thread || []).filter((r) => !r.deletedAt).length;
                  const missionKey = target.mission?.missionKey;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void handleMoveThreadItem({
                          mode: 'MERGE_ROOT_TO_THREAD',
                          sourceMessageId: sourceMsg.id,
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
                        <span className="inline-flex items-center gap-1 shrink-0 tabular-nums text-[10px] font-bold text-blue-400">
                          {missionKey && (
                            <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300">#{missionKey}</span>
                          )}
                          <span>💬 {replyCount}</span>
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

        {/* STICKY PINNED MESSAGE BANNER */}
        {pinnedMessages.length > 0 && activeConversation && (
          <div
            className="px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-10 transition-colors text-[12px]"
            style={{
              background: isDark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(254, 243, 199, 0.65)',
              borderBottom: `1px solid ${borderColor}`,
              backdropFilter: 'blur(6px)',
            }}
          >
            {/* Left: Icon + Text snippet (click to navigate) */}
            <div
              onClick={() => {
                const msg = pinnedMessages[pinnedBannerIndex % pinnedMessages.length];
                if (msg) navigateToMessage(activeConversation.id, msg.id);
              }}
              className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-85 transition-opacity"
              title="Nhấn để đi đến tin nhắn đã ghim"
            >
              <div
                className="w-6 h-6 rounded-md inline-flex items-center justify-center shrink-0"
                style={{ background: 'rgba(212, 168, 75, 0.2)', color: '#d4a84b' }}
              >
                <Pin size={13} className="fill-amber-400" />
              </div>

              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 shrink-0">
                  {pinnedMessages.length > 1
                    ? `Ghim (${(pinnedBannerIndex % pinnedMessages.length) + 1}/${pinnedMessages.length}):`
                    : 'Đã ghim:'}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                  {pinnedMessages[pinnedBannerIndex % pinnedMessages.length]?.senderName}:
                </span>
                <span className="text-slate-600 dark:text-slate-300 truncate">
                  {formatMoveTargetSnippet(pinnedMessages[pinnedBannerIndex % pinnedMessages.length])}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Cycle pinned messages if > 1 */}
              {pinnedMessages.length > 1 && (
                <Tooltip title="Xem tin nhắn đã ghim tiếp theo">
                  <button
                    type="button"
                    aria-label="Tin nhắn ghim tiếp theo"
                    onClick={() => setPinnedBannerIndex((prev) => (prev + 1) % pinnedMessages.length)}
                    className="w-6 h-6 rounded inline-flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <ChevronRight size={13} />
                  </button>
                </Tooltip>
              )}

              {/* Nút bấm dẫn đến tin nhắn */}
              <Tooltip title="Đi đến tin nhắn này trong cuộc trò chuyện">
                <button
                  type="button"
                  aria-label="Đi đến tin nhắn đã ghim"
                  onClick={() => {
                    const msg = pinnedMessages[pinnedBannerIndex % pinnedMessages.length];
                    if (msg) navigateToMessage(activeConversation.id, msg.id);
                  }}
                  className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
                  style={{
                    background: 'rgba(212, 168, 75, 0.18)',
                    color: '#d4a84b',
                    border: '1px solid rgba(212, 168, 75, 0.35)',
                  }}
                >
                  <CornerDownRight size={12} />
                  <span className="hidden sm:inline">Đi đến tin nhắn</span>
                </button>
              </Tooltip>

              {/* Xem danh sách tất cả tin ghim */}
              <Tooltip title="Xem danh sách tất cả tin nhắn đã ghim">
                <button
                  type="button"
                  aria-label="Xem tất cả tin ghim"
                  onClick={() => setActiveSubtab('pinned')}
                  className="h-6 px-1.5 rounded-md inline-flex items-center text-[11px] font-semibold text-slate-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  Tất cả ({pinnedMessages.length})
                </button>
              </Tooltip>

              {/* Bỏ ghim */}
              <Tooltip title="Bỏ ghim tin nhắn này">
                <button
                  type="button"
                  aria-label="Bỏ ghim"
                  onClick={() => {
                    const msg = pinnedMessages[pinnedBannerIndex % pinnedMessages.length];
                    if (msg) handleTogglePin(msg.id);
                  }}
                  className="w-6 h-6 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                >
                  <PinOff size={13} />
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        <div ref={mainMessagesContainerRef} className="flex-1 overflow-y-auto py-3">
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

            return (
              <div
                key={m.id}
                data-message-side={isMine ? 'right' : 'left'}
                draggable={canMoveThisMsg && editingMessageId !== m.id}
                onDragStart={(e) => {
                  if (!canMoveThisMsg || editingMessageId === m.id) {
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
                  } catch (_) {}
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
                } transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${
                  isBeingDragged ? 'opacity-45 scale-[0.99]' : ''
                }`}
                style={{
                  background: isDropTarget
                    ? 'rgba(212, 168, 75, 0.14)'
                    : highlightedMsgId === m.id
                      ? 'rgba(212, 168, 75, 0.18)'
                      : linkedTask
                        ? 'rgba(212, 168, 75, 0.06)'
                        : undefined,
                  boxShadow: isDropTarget
                    ? 'inset 0 0 0 1.5px #d4a84b'
                    : highlightedMsgId === m.id
                      ? '0 0 0 2px #d4a84b, inset 0 0 14px rgba(212, 168, 75, 0.28)'
                      : undefined,
                  borderRadius: isDropTarget || highlightedMsgId === m.id ? 10 : undefined,
                }}
              >
                {isDropTarget && (
                  <div
                    className="absolute -top-2.5 left-4 z-20 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold inline-flex items-center gap-1 shadow-md pointer-events-none"
                    style={{
                      background: '#d4a84b',
                      color: '#000',
                    }}
                  >
                    <CornerDownRight size={11} />
                    <span>Thả để gộp vào luồng trả lời của {getMemberNickname(m.senderId) || m.senderName}</span>
                  </div>
                )}
                {isCont ? (
                  <div
                    className={`w-8 shrink-0 flex flex-col ${
                      isMine ? 'items-start pl-0.5' : 'items-end pr-0.5'
                    } pt-1 select-none gap-0.5`}
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
                      {(() => {
                        const nick = getMemberNickname(m.senderId);
                        if (nick && nick !== m.senderName) {
                          return (
                            <span className="flex items-center gap-1">
                              <span className="text-[12.5px] font-bold text-emerald-500 dark:text-emerald-400">
                                {nick}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">({m.senderName})</span>
                            </span>
                          );
                        }
                        return <span className="text-[12.5px] font-bold">{m.senderName}</span>;
                      })()}
                      {isMine && (
                        <span
                          className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9px] font-extrabold"
                          style={{
                            background: 'rgba(212, 168, 75, 0.2)',
                            color: '#d4a84b',
                          }}
                        >
                          Bạn
                        </span>
                      )}
                      <span
                        className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                        style={{
                          background: `${m.roleColor || '#d4a84b'}22`,
                          color: m.roleColor || '#d4a84b',
                        }}
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

                  {/* Collapsible AI Reasoning (<thinking>) Block */}
                  {m.aiThinking && (
                    <div
                      className="mb-1.5 rounded-lg overflow-hidden w-full max-w-[88%]"
                      style={{
                        background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.06)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedThinkingIds((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                        className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-bold cursor-pointer"
                        style={{ color: isDark ? '#c4b5fd' : '#6d28d9' }}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles size={12} />
                          <span>Quá trình suy luận của MAI</span>
                        </span>
                        {expandedThinkingIds[m.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {expandedThinkingIds[m.id] && (
                        <div
                          className="px-2.5 pb-2 pt-1 text-[11.5px] leading-relaxed whitespace-pre-wrap text-left"
                          style={{
                            color: token.colorTextSecondary,
                            borderTop: '1px dashed rgba(139, 92, 246, 0.2)',
                          }}
                        >
                          {m.aiThinking}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Content: Inline Edit Mode vs Soft-Deleted vs Normal Text Bubble */}
                  {editingMessageId === m.id && !editingReplyId ? (
                    <div
                      className="w-full max-w-[85%] rounded-2xl p-2.5 space-y-2 select-text"
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
                        rows={3}
                        className="w-full bg-transparent border-0 outline-none text-[13px] leading-relaxed resize-y p-1"
                        style={{ color: token.colorText }}
                      />
                      <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
                        <span className="text-slate-400">Shift+Enter: xuống dòng · Esc: huỷ · Enter: lưu</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 rounded-md cursor-pointer hover:bg-white/10"
                            style={{ color: token.colorTextSecondary }}
                          >
                            Huỷ
                          </button>
                          <button
                            type="button"
                            disabled={isSavingEdit || !editingText.trim()}
                            onClick={handleSaveEdit}
                            className="px-3 py-1 rounded-md font-bold cursor-pointer disabled:opacity-50"
                            style={{ background: '#d4a84b', color: '#000' }}
                          >
                            {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : m.isDeleted ? (
                    <div
                      className={`relative inline-block text-left px-3.5 py-2 rounded-2xl ${
                        isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                      } text-[12.5px] italic max-w-[85%] select-none transition-all`}
                      style={{
                        background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                        border: `1px dashed ${borderColor}`,
                        color: token.colorTextSecondary,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="opacity-75">💬 Tin nhắn này đã bị xoá</span>
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryModalMessage(m);
                            setHistoryModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold not-italic hover:underline cursor-pointer"
                          style={{ color: '#d4a84b' }}
                        >
                          <History size={12} />
                          <span>Xem lịch sử</span>
                        </button>
                        {(isMine || isDannyAccount) && (
                          <button
                            type="button"
                            onClick={() => handleRestoreMessage(m.id)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold not-italic hover:underline cursor-pointer text-emerald-400 hover:text-emerald-300"
                          >
                            <RotateCcw size={11} />
                            <span>Khôi phục</span>
                          </button>
                        )}
                      </div>
                      {m.deletedByName && (
                        <div className="text-[10px] text-slate-400 not-italic mt-0.5 tabular-nums">
                          Bởi {m.deletedByName} · {m.deletedAt ? dayjs(m.deletedAt).format('HH:mm') : m.timeLabel}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {m.text
                        ? (() => {
                            const isPureSticker = Boolean(parsePureStickerMessage(m.text));
                            const hasSubthread = Boolean(m.thread && m.thread.length > 0);
                            return (
                              <div
                                onClick={(e) => handleMessageTap(m, e)}
                                title={
                                  hasSubthread
                                    ? `Nhấn để mở luồng trả lời phụ (${m.thread?.length} phản hồi)`
                                    : undefined
                                }
                                className={`relative inline-block text-left ${
                                  isPureSticker
                                    ? 'px-1 py-0.5 rounded-2xl'
                                    : `px-3.5 py-2 rounded-2xl ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`
                                } text-[13px] leading-relaxed break-words max-w-[85%] cursor-pointer select-none active:scale-[0.985] transition-all ${
                                  m.isBuzzed ? 'ring-2 ring-amber-500/70 shadow-lg shadow-amber-500/15' : ''
                                } ${hasSubthread ? 'hover:ring-1 hover:ring-amber-500/50' : ''}`}
                                style={{
                                  background: isPureSticker
                                    ? 'transparent'
                                    : m.isBuzzed
                                      ? isDark
                                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(225, 29, 72, 0.14) 100%)'
                                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(225, 29, 72, 0.1) 100%)'
                                      : isMine
                                        ? accentSoftBg
                                        : surfaceRaised,
                                  border: isPureSticker
                                    ? 'none'
                                    : m.isBuzzed
                                      ? '1px solid rgba(245, 158, 11, 0.8)'
                                      : `1px solid ${isMine ? accentBorder : borderColor}`,
                                  color: token.colorText,
                                }}
                              >
                                {/* Buzz / Bump Urgent Header Banner */}
                                {m.isBuzzed && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="mb-1.5 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/50 flex items-center justify-between gap-1 text-[11px] font-bold text-amber-500 select-none animate-pulse"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <Zap size={12} className="fill-amber-500" />
                                      <span>
                                        TIN NHẮN KHẨN CẤP · BUZZ{' '}
                                        {m.buzzCount && m.buzzCount > 1 ? `(x${m.buzzCount})` : ''}
                                        {m.latestBuzz?.senderName ? ` · bởi ${m.latestBuzz.senderName}` : ''}
                                      </span>
                                      {m.buzzCount && m.buzzCount > 1 && (
                                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9.5px] font-extrabold">
                                          x{m.buzzCount}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      aria-label="Nghe @MAI đọc tin nhắn khẩn cấp"
                                      onClick={() => {
                                        const spokenText = buildMaiUrgentVoiceAnnouncement({
                                          senderName: m.latestBuzz?.senderName || m.senderName || 'Đồng nghiệp',
                                          conversationName: activeConversation?.name,
                                          isSpace: activeConversation?.type === 'space',
                                          messageText: m.text || '',
                                          note: m.latestBuzz?.note,
                                        });
                                        void playNeuralSpeech(spokenText, {
                                          voice: 'vi-VN-HoaiMyNeural',
                                          speed: ttsSpeed || 1.0,
                                        });
                                      }}
                                      className="text-[10px] font-semibold text-amber-400/90 hover:underline hover:text-amber-300 cursor-pointer inline-flex items-center gap-1 shrink-0 ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20"
                                      title="Nghe @MAI đọc tin nhắn khẩn cấp"
                                    >
                                      <Volume2 size={10} />
                                      <span>@MAI đọc</span>
                                    </button>
                                  </div>
                                )}

                                {renderRichTextMessage(m.text, isMine)}

                                {/* Edited Badge with Clickable Audit History */}
                                {m.editHistory && m.editHistory.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHistoryModalMessage(m);
                                      setHistoryModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-amber-500/80 hover:text-amber-400 hover:underline cursor-pointer select-none ml-1.5 align-baseline"
                                    title="Xem lịch sử chỉnh sửa"
                                  >
                                    <History size={10} />
                                    <span>(đã chỉnh sửa)</span>
                                  </button>
                                )}

                                {/* Floating Heart Burst on Double-Tap */}
                                {heartFlyMsgId === m.id && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 select-none overflow-hidden">
                                    <span className="text-[38px] drop-shadow-xl animate-heart-burst leading-none">
                                      ❤️
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        : null}

                      {/* Attachments (Images, Files, Documents) */}
                      {renderMessageAttachments && renderMessageAttachments(m.attachments, isMobile, isMine)}
                    </>
                  )}

                  {/* Suggested AI Action Button(s) (e.g. APPLY_FILTER) */}
                  {(() => {
                    const actionsList =
                      m.aiActions && m.aiActions.length > 0
                        ? m.aiActions
                        : m.aiAction?.actions && m.aiAction.actions.length > 0
                          ? m.aiAction.actions
                          : m.aiAction
                            ? [m.aiAction]
                            : [];
                    if (!actionsList || actionsList.length === 0) return null;

                    return (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {actionsList.map((action, actionIdx) => {
                          const actionKey = `${m.id}-${actionIdx}`;
                          const isApplied = Boolean(
                            appliedActionIds[actionKey] || (actionIdx === 0 && appliedActionIds[m.id])
                          );
                          return (
                            <button
                              key={actionKey}
                              type="button"
                              onClick={() => {
                                handleExecuteAiAction(action, m.id, actionKey);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold cursor-pointer transition-all active:scale-95"
                              style={{
                                background: isApplied ? 'rgba(16, 185, 129, 0.16)' : 'rgba(139, 92, 246, 0.16)',
                                border: `1px solid ${
                                  isApplied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.4)'
                                }`,
                                color: isApplied ? '#10b981' : '#a78bfa',
                              }}
                            >
                              {isApplied ? <Check size={13} /> : <Sliders size={13} />}
                              <span>{isApplied ? `Đã áp dụng: ${action.label}` : action.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Quick Voice Read-Aloud & Copy Bar for AI Bot Replies */}
                  {isAiMessage && m.text && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Tooltip
                        title={
                          speakingMsgId === m.id
                            ? 'Dừng đọc giọng nói'
                            : `Đọc câu trả lời bằng giọng Hoài My (${ttsSpeed}x)`
                        }
                      >
                        <button
                          type="button"
                          aria-label="Đọc câu trả lời AI"
                          onClick={() => handleSpeakAiMessage(m)}
                          className="inline-flex items-center justify-center p-1.5 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: speakingMsgId === m.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                            border: `1px solid ${speakingMsgId === m.id ? 'rgba(139, 92, 246, 0.5)' : borderColor}`,
                            color: speakingMsgId === m.id ? '#a78bfa' : token.colorTextSecondary,
                          }}
                        >
                          {speakingMsgId === m.id ? (
                            <VolumeX size={13} className="animate-pulse" />
                          ) : (
                            <Volume2 size={13} />
                          )}
                        </button>
                      </Tooltip>

                      {/* Tùy chỉnh tốc độ đọc cá nhân */}
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
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer tabular-nums"
                          style={{
                            background: surfaceRaised,
                            border: `1px solid ${borderColor}`,
                            color: token.colorTextSecondary,
                          }}
                        >
                          {ttsSpeed}x
                        </button>
                      </Dropdown>

                      <Tooltip title="Sao chép nội dung">
                        <button
                          type="button"
                          aria-label="Sao chép nội dung AI"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              navigator.clipboard.writeText(m.text || '');
                            }
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

                  {/* Customer Card Attachment */}
                  {m.customerCard && (
                    <div
                      className="mt-2 p-2.5 rounded-xl border flex items-center justify-between gap-3 max-w-[85%]"
                      style={{
                        background: isDark ? 'rgba(212, 168, 75, 0.1)' : 'rgba(212, 168, 75, 0.08)',
                        borderColor: 'rgba(212, 168, 75, 0.3)',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold truncate">
                          {m.customerCard.name} · <span style={{ color: '#d4a84b' }}>{m.customerCard.meta}</span>
                        </div>
                        {m.customerCard.cvName && (
                          <div className="text-[11px] text-slate-400 truncate">{m.customerCard.cvName}</div>
                        )}
                      </div>
                      <Tooltip title="Mở hồ sơ khách hàng">
                        <button
                          type="button"
                          aria-label="Mở hồ sơ khách hàng"
                          onClick={() => antdMessage.info(`Đã mở hồ sơ: ${m.customerCard?.name}`)}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer"
                          style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                        >
                          <ExternalLink size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  )}

                  {/* Inline Task & Reminder Card (mOS Mission Inspired) */}
                  {linkedTask && renderTaskCard(linkedTask, m, 'inline')}

                  {/* Live mOS Mission Card (Only when not already embedded inside linkedTask) */}
                  {!linkedTask && m.mission && renderLiveMissionCard(m.mission, m, 'inline')}

                  {/* Interactive Operational Workflow Card (Cash Advance -> Thu Chi, Inventory Audit -> mOS Kho) */}
                  {(m.workflow ||
                    (m.workflowInstanceId && workflowInstances.find((wf) => wf.id === m.workflowInstanceId))) && (
                    <MosChatWorkflowCard
                      workflow={(m.workflow || workflowInstances.find((wf) => wf.id === m.workflowInstanceId))!}
                      isDark={isDark}
                      isSuperAdmin={isStrictDannySuperAdmin}
                      currentStaffId={currentUserStaffMember?.id}
                      currentUserName={
                        currentUserStaffMember?.displayName || currentUser?.fullName || currentUser?.username
                      }
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

                  {/* Thread Chip with Unread Reply Badge & Seen Indicators */}
                  {m.thread &&
                    m.thread.length > 0 &&
                    (() => {
                      const visibleThreadReplies = m.thread.filter((r) => !r.deletedAt);
                      const lastThreadReply =
                        visibleThreadReplies.length > 0
                          ? visibleThreadReplies[visibleThreadReplies.length - 1]
                          : undefined;
                      const unreadReplyCount = m.unreadThreadReplyCount || 0;
                      const lastReplyBreakdown = lastThreadReply
                        ? getThreadReplyReadBreakdown(activeConversation, m, lastThreadReply)
                        : { seenBy: [], unseenBy: [] };
                      const isLastReplyMine = lastThreadReply ? isMessageFromCurrentUser(lastThreadReply) : false;

                      return (
                        <div
                          className={`mt-1.5 flex items-center gap-1.5 flex-wrap ${
                            isMine ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <Tooltip title="Xem luồng trả lời phụ bên phải (Sub-thread)">
                            <button
                              type="button"
                              onClick={() => handleOpenThread(m.id)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer tabular-nums transition-all hover:brightness-110"
                              style={{
                                background:
                                  unreadReplyCount > 0 ? 'rgba(99, 102, 241, 0.22)' : 'rgba(59, 130, 246, 0.14)',
                                border:
                                  unreadReplyCount > 0
                                    ? '1px solid rgba(99, 102, 241, 0.55)'
                                    : '1px solid rgba(59, 130, 246, 0.3)',
                                color: unreadReplyCount > 0 ? '#818cf8' : '#60a5fa',
                              }}
                            >
                              <MessageSquareReply size={13} />
                              <span>{visibleThreadReplies.length} trả lời</span>
                              {unreadReplyCount > 0 && (
                                <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold tabular-nums">
                                  +{unreadReplyCount} mới
                                </span>
                              )}
                            </button>
                          </Tooltip>

                          {/* Sub-thread outer Seen Status (✓/✓✓ + compact mini avatars for latest reply) */}
                          {lastThreadReply && (
                            <div className="inline-flex items-center gap-1">
                              {isLastReplyMine &&
                                renderReadStatusCheckmark(lastReplyBreakdown.seenBy, lastReplyBreakdown.unseenBy, {
                                  compact: true,
                                  scopeLabel: 'Trạng thái đọc luồng trả lời phụ',
                                })}
                              {lastReplyBreakdown.seenBy.length > 0 &&
                                renderMiniSeenAvatarStack(lastReplyBreakdown.seenBy, lastReplyBreakdown.unseenBy, {
                                  compact: true,
                                  align: isMine ? 'right' : 'left',
                                  scopeLabel: 'Đã xem phản hồi mới nhất trong luồng phụ',
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {/* Unified Message Footer: Reaction Pills + Adjacent Quick Emoji & Action Set */}
                  <div
                    className={`mt-1 flex flex-wrap items-center gap-1.5 min-h-[26px] ${
                      isMine ? 'flex-row-reverse justify-start' : 'justify-start'
                    }`}
                  >
                    {m.reactions &&
                      Object.entries(m.reactions)
                        .filter(([, count]) => count > 0)
                        .map(([emoji, count]) => {
                          const reactedByMe = hasUserReacted(m, emoji);
                          const stickerReaction = parseStickerReactionKey(emoji);
                          const label = stickerReaction ? stickerReaction.caption || stickerReaction.title : emoji;
                          return (
                            <Tooltip
                              key={emoji}
                              title={
                                reactedByMe
                                  ? `Bạn đã thả ${label} · Nhấn để gỡ cảm xúc (Undo)`
                                  : `Nhấn để thả cùng ${label}`
                              }
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleReaction(m.id, emoji)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-bold cursor-pointer tabular-nums transition-all hover:scale-105"
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

                    {/* Adjacent Quick Emoji & Action Bar (placed right next to reaction pills) */}
                    <div
                      className={`${
                        mobileActiveMsgId === m.id || openMovePopoverKey === `root:${m.id}`
                          ? 'opacity-100 pointer-events-auto scale-100 ring-1 ring-amber-500/50 shadow-md'
                          : 'opacity-0 pointer-events-none'
                      } group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-all inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full shadow-sm`}
                      style={{
                        background: surfaceRaised,
                        border: `1px solid ${
                          mobileActiveMsgId === m.id || openMovePopoverKey === `root:${m.id}`
                            ? 'rgba(212, 168, 75, 0.6)'
                            : borderStrong
                        }`,
                      }}
                    >
                      {GOOGLE_CHAT_QUICK_EMOJIS.map((emoji) => {
                        const reactedByMe = hasUserReacted(m, emoji);
                        return (
                          <Tooltip
                            key={emoji}
                            title={reactedByMe ? `Đã thả ${emoji} · Nhấn để gỡ (Undo)` : `Thả nhanh ${emoji}`}
                          >
                            <button
                              type="button"
                              aria-label={reactedByMe ? `Gỡ cảm xúc ${emoji}` : `Thả nhanh ${emoji}`}
                              onClick={() => handleToggleReaction(m.id, emoji)}
                              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[13px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-transform hover:scale-110"
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
                        placement={isMine ? 'topRight' : 'topLeft'}
                        open={openStickerPopoverKey === `react:${m.id}`}
                        onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? `react:${m.id}` : null)}
                        content={renderReactionPickerContent(m.id, m)}
                      >
                        <Tooltip title="Chọn thêm biểu tượng cảm xúc (Wings & phổ biến)">
                          <button
                            type="button"
                            aria-label="Chọn biểu tượng cảm xúc"
                            className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                            style={{ color: token.colorTextSecondary }}
                          >
                            <SmilePlus size={13} />
                          </button>
                        </Tooltip>
                      </Popover>

                      <span className="w-px h-3.5 mx-0.5" style={{ background: borderStrong }} />

                      <Tooltip title="Trả lời theo luồng (Thread)">
                        <button
                          type="button"
                          aria-label="Trả lời theo luồng"
                          onClick={() => handleOpenThread(m.id)}
                          className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                          style={{ color: token.colorTextSecondary }}
                        >
                          <MessageSquareReply size={13} />
                        </button>
                      </Tooltip>

                      {canMoveThisMsg && filteredMessages.length > 1 && (
                        <Popover
                          trigger="click"
                          placement={isMine ? 'topRight' : 'topLeft'}
                          open={openMovePopoverKey === `root:${m.id}`}
                          onOpenChange={(vis) => {
                            setOpenMovePopoverKey(vis ? `root:${m.id}` : null);
                            if (!vis) setMoveThreadSearchQuery('');
                          }}
                          content={renderMoveRootToThreadPopover(m, prevMsg, filteredMessages)}
                        >
                          <Tooltip title="Gộp tin nhắn này vào luồng trả lời phụ (Subthread) của tin nhắn khác">
                            <button
                              type="button"
                              aria-label="Gộp tin nhắn vào luồng trả lời phụ"
                              className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-amber-500/15 cursor-pointer transition-transform hover:scale-110"
                              style={{
                                color: openMovePopoverKey === `root:${m.id}` ? '#d4a84b' : token.colorTextSecondary,
                              }}
                            >
                              <CornerDownRight size={13} />
                            </button>
                          </Tooltip>
                        </Popover>
                      )}

                      <Tooltip title="Tạo Task & Hẹn giờ nhắc từ tin nhắn">
                        <button
                          type="button"
                          aria-label="Tạo Task & Hẹn giờ nhắc từ tin nhắn"
                          onClick={() => openTaskModalFromMessage(m)}
                          className="w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer"
                          style={{
                            background: 'rgba(212, 168, 75, 0.16)',
                            color: '#d4a84b',
                          }}
                        >
                          <AlarmClockPlus size={13} />
                        </button>
                      </Tooltip>

                      {isStrictDannySuperAdmin && (
                        <Tooltip
                          title={
                            m.mission || linkedTask?.mission
                              ? `Mở tiến độ mOS Mission #${(m.mission || linkedTask?.mission)?.missionKey}`
                              : '🚀 Chuyển vào mOS Mission (Đóng gói trọn luồng & hình ảnh)'
                          }
                        >
                          <button
                            type="button"
                            aria-label="Chuyển vào mOS Mission"
                            onClick={() => openMissionModalFromChat(m, linkedTask)}
                            className="w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                            style={{
                              background:
                                m.mission || linkedTask?.mission
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(139, 92, 246, 0.2)',
                              color: m.mission || linkedTask?.mission ? '#10b981' : '#a78bfa',
                            }}
                          >
                            <Rocket size={13} />
                          </button>
                        </Tooltip>
                      )}

                      <Tooltip title={m.pinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}>
                        <button
                          type="button"
                          aria-label="Ghim tin nhắn"
                          onClick={() => handleTogglePin(m.id)}
                          className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                          style={{ color: m.pinned ? '#d4a84b' : token.colorTextSecondary }}
                        >
                          <Pin size={13} />
                        </button>
                      </Tooltip>

                      {/* Buzz / Bump Urgent Message Button */}
                      {!m.isDeleted && (
                        <Tooltip
                          title={
                            m.isBuzzed
                              ? `Đã Buzz ${m.buzzCount || 1} lần · Nhấp để Buzz lại tin nhắn khẩn cấp`
                              : '⚡ Buzz / Bump tin nhắn khẩn cấp (Cảnh báo chuông & rung)'
                          }
                        >
                          <Popconfirm
                            title="⚡ Buzz / Bump tin nhắn khẩn cấp?"
                            description="Gửi tín hiệu cảnh báo nổi bật kèm âm thanh & rung để người nhận chú ý xử lý ngay."
                            onConfirm={() => handleBuzzMessage(m.id)}
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
                              aria-label="Buzz / Bump tin nhắn khẩn cấp"
                              className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer transition-transform hover:scale-110"
                              style={{
                                background: m.isBuzzed ? 'rgba(245, 158, 11, 0.22)' : 'transparent',
                                color: m.isBuzzed ? '#f59e0b' : token.colorTextSecondary,
                              }}
                            >
                              <Zap
                                size={13}
                                className={m.isBuzzed ? 'fill-amber-500 animate-pulse text-amber-500' : ''}
                              />
                            </button>
                          </Popconfirm>
                        </Tooltip>
                      )}

                      {/* Edit Message Button (author only, and not deleted) */}
                      {isMine && !m.isDeleted && (
                        <Tooltip title="Chỉnh sửa tin nhắn">
                          <button
                            type="button"
                            aria-label="Chỉnh sửa tin nhắn"
                            onClick={() => handleStartEdit(m)}
                            className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                            style={{ color: token.colorTextSecondary }}
                          >
                            <Pencil size={13} />
                          </button>
                        </Tooltip>
                      )}

                      {/* Delete Message Button (author or super admin) */}
                      {(isMine || isDannyAccount) && !m.isDeleted && (
                        <Tooltip title="Xoá tin nhắn">
                          <Popconfirm
                            title="Xoá tin nhắn này?"
                            description="Tin nhắn sẽ được chuyển sang trạng thái đã xoá. Lịch sử trước khi xoá vẫn được lưu lại an toàn."
                            onConfirm={() => handleDeleteMessage(m.id)}
                            okText="Xoá"
                            cancelText="Huỷ"
                            okButtonProps={{ danger: true }}
                            zIndex={1350}
                            overlayStyle={{ zIndex: 1350 }}
                          >
                            <button
                              type="button"
                              aria-label="Xoá tin nhắn"
                              className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-rose-500/15 cursor-pointer hover:text-rose-400"
                              style={{ color: token.colorTextSecondary }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </Popconfirm>
                        </Tooltip>
                      )}

                      {/* View History Button (if edited or deleted) */}
                      {(m.isDeleted || (m.editHistory && m.editHistory.length > 0)) && (
                        <Tooltip title="Xem lịch sử chỉnh sửa & xoá">
                          <button
                            type="button"
                            aria-label="Xem lịch sử chỉnh sửa & xoá"
                            onClick={() => {
                              setHistoryModalMessage(m);
                              setHistoryModalOpen(true);
                            }}
                            className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-amber-500/15 cursor-pointer text-amber-400"
                          >
                            <History size={13} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Mini Seen Avatars Stack (Participants whose latest read message stops here) */}
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
  }
);

MosChatMessageFeed.displayName = 'MosChatMessageFeed';
