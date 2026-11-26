import type React from 'react';
import type { PendingChatUploadItem } from '../shared/hooks/useChatUploadQueue';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatCustomerCard,
  UpdateMosChatTaskRequest,
  MosChatStaffMember,
  SafeAny,
} from '@mos-lab/shared';

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
  handleSendThreadReply: (
    replyTextOverride?: string,
    cardOverride?: SafeAny,
    targetMsgIdOverride?: string
  ) => Promise<void> | void;
  threadAttachments: SafeAny[];
  setThreadAttachments: React.Dispatch<React.SetStateAction<SafeAny[]>>;
  pendingUploads?: PendingChatUploadItem[];
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
  threadTextRef?: React.MutableRefObject<string>;
  threadHasText?: boolean;
  updateThreadInput?: (val: string) => void;
  threadHasTextListenerRef?: React.MutableRefObject<((hasText: boolean) => void) | null>;
  mentionRenderKey?: string;
  handleOpenReactionUsers?: (target: SafeAny, initialEmoji?: string) => void;
  staffDirectory?: MosChatStaffMember[];
  handleOpenForwardModal?: (m: MosChatMessage, reply?: MosChatThreadReply | null) => void;
  accessibleConversationIds?: Set<string>;
  onJumpToForwardedSource?: (sourceConversationId: string, sourceMessageId: string) => void;
}
