import type React from 'react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';

export type MosChatDockPreset = 'compact' | 'standard' | 'promax' | 'custom';

export interface MosChatDockDimension {
  width: number;
  height: number;
  preset?: MosChatDockPreset;
}

export const DOCK_PRESET_CONFIGS: Record<
  'compact' | 'standard' | 'promax',
  { width: number; height: number; label: string }
> = {
  compact: { width: 340, height: 500, label: 'iPhone Mini (340×500)' },
  standard: { width: 385, height: 600, label: 'iPhone Tiêu chuẩn (385×600)' },
  promax: { width: 430, height: 720, label: 'iPhone Pro Max (430×720)' },
};

export const DOCKED_STORAGE_KEY_V2 = 'mos_chat_docked_state_v2';

export type DockTaskFilterScope = 'pending' | 'completed' | 'all';

export interface MosChatDockedWindowsProps {
  isMobile: boolean;
  dockedConvIds: string[];
  conversations: MosChatConversation[];
  collapsedDockIds: Record<string, boolean>;
  setCollapsedDockIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  userPrefs: SafeAny;
  getEffectiveUnreadCount: (conv: MosChatConversation) => number;
  dockAttachments: Record<string, SafeAny[]>;
  setDockAttachments: React.Dispatch<React.SetStateAction<Record<string, SafeAny[]>>>;
  dockInputs: Record<string, string>;
  setDockInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  surfaceBg: string;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  accentContrast: string;
  isDark?: boolean;
  currentUser?: SafeAny;
  staffDirectory?: MosChatStaffMember[];
  token: SafeAny;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  isConversationParticipantOnline: (conv: MosChatConversation) => boolean;
  togglePinConversation: (cid: string) => void;
  toggleManualUnreadConversation: (conv: MosChatConversation) => void;
  selectConversation: (cid: string) => void;
  onToggle: () => void;
  setDockedConvIds: React.Dispatch<React.SetStateAction<string[]>>;
  dockMessagesContainerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  isMessageFromCurrentUser: (m: MosChatMessage) => boolean;
  getMessageReadBreakdown: (conv: MosChatConversation, m: MosChatMessage) => { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  renderReadStatusCheckmark: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  openTaskModalFromMessage: (m: MosChatMessage | null) => void;
  renderRichTextMessage: (
    text: string,
    isMine?: boolean,
    opts?: { onQuoteClick?: (senderName: string, quotedContent: string) => void }
  ) => React.ReactNode;
  renderMessageAttachments: (atts?: SafeAny[], compact?: boolean) => React.ReactNode;
  renderStagedAttachmentsStrip: (attachments: SafeAny[], scope: SafeAny, convId?: string) => React.ReactNode;
  dockInputRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  handleClipboardPaste: (e: React.ClipboardEvent<SafeAny>, scope?: SafeAny, convId?: string) => void;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  handleSendMessage: (convId: string, text: string, quote?: SafeAny, atts?: SafeAny[]) => void;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  renderComposerEmojiPickerContent: (opts?: SafeAny) => React.ReactNode;
  triggerFilePicker: (scope: 'main' | 'thread' | 'dock', convId?: string) => void;

  // Additional props for iPhone Refactor (threads, tasks, resizing & persistence)
  tasks?: MosChatTaskItem[];
  onToggleTaskDone?: (taskId: string) => Promise<void> | void;
  onQuickCreateTask?: (params: { conversationId: string; title: string }) => Promise<void> | void;
  onSendThreadReply?: (convId: string, rootMsgId: string, text: string, atts?: SafeAny[]) => Promise<void> | void;
  dockDimensions?: Record<string, MosChatDockDimension>;
  setDockDimensions?: React.Dispatch<React.SetStateAction<Record<string, MosChatDockDimension>>>;
  dockActiveTabs?: Record<string, 'chat' | 'tasks'>;
  setDockActiveTabs?: React.Dispatch<React.SetStateAction<Record<string, 'chat' | 'tasks'>>>;
  dockActiveThreadMsgIds?: Record<string, string | null>;
  setDockActiveThreadMsgIds?: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  onStartVoiceCall?: (convId: string) => void;
  handleOpenForwardModal?: (m: MosChatMessage, reply?: MosChatThreadReply | null, sourceConvId?: string) => void;
  onJumpToForwardedSource?: (sourceConversationId: string, sourceMessageId: string) => void;
}
