import type {
  MosChatConversation,
  MosChatMessage,
  MosChatThreadReply,
  MosChatTaskItem,
  MosChatStaffMember,
  MosChatImageAttachment,
  MosChatPresenceStatus,
  MosChatTaskPriority,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  SafeAny,
} from '@mos-lab/shared';

export type MosChatMobileView = 'inbox' | 'room' | 'thread';
export type MosChatSidebarFilter = 'all' | 'unread' | 'spaces' | 'dms';
export type MosChatActiveSubtab = 'chat' | 'tasks' | 'pinned';

export interface MosChatContextValue {
  // Authentication & Directory
  currentUser: SafeAny;
  staffDirectory: MosChatStaffMember[];
  presence: MosChatPresenceStatus;
  setPresence: (p: MosChatPresenceStatus) => void;

  // Conversations
  conversations: MosChatConversation[];
  activeConvId: string;
  activeConversation: MosChatConversation | null;
  setActiveConvId: (id: string) => void;
  sidebarFilter: MosChatSidebarFilter;
  setSidebarFilter: (f: MosChatSidebarFilter) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  togglePinConversation: (id: string) => Promise<void>;
  markConversationAsRead: (id: string) => Promise<void>;

  // Messages
  messages: MosChatMessage[];
  allMessagesByConv: Record<string, MosChatMessage[]>;
  isLoadingMessages: boolean;
  sendMessage: (
    text: string,
    options?: {
      attachments?: MosChatImageAttachment[];
      targetConvId?: string;
      replyToId?: string;
    }
  ) => Promise<boolean>;
  reactToMessage: (msgId: string, emoji: string, replyId?: string) => Promise<void>;
  togglePinMessage: (msgId: string) => Promise<void>;
  deleteMessage: (msgId: string) => Promise<void>;
  editMessage: (msgId: string, newText: string) => Promise<void>;
  buzzMessage: (msgId: string) => Promise<void>;

  // Thread
  activeThreadMsg: MosChatMessage | null;
  setActiveThreadMsg: (msg: MosChatMessage | null) => void;
  threadReplies: MosChatThreadReply[];
  sendThreadReply: (text: string, options?: { attachments?: MosChatImageAttachment[] }) => Promise<boolean>;

  // Tasks & Pinned
  activeSubtab: MosChatActiveSubtab;
  setActiveSubtab: (tab: MosChatActiveSubtab) => void;
  tasks: MosChatTaskItem[];
  pinnedMessages: MosChatMessage[];
  createTask: (
    title: string,
    options?: {
      assigneeStaffId?: string;
      assigneeName?: string;
      dueAt?: string | null;
      priority?: MosChatTaskPriority;
      sourceMessageId?: string;
    }
  ) => Promise<boolean>;
  toggleTaskDone: (taskId: string, done: boolean) => Promise<void>;

  // Workflows
  workflowTemplates: MosChatWorkflowTemplate[];
  workflowInstances: MosChatWorkflowInstance[];
  triggerWorkflow: (templateCode: string, title?: string, formData?: Record<string, unknown>) => Promise<boolean>;

  // Mobile Navigation & Interaction
  mobileView: MosChatMobileView;
  setMobileView: (view: MosChatMobileView) => void;
  selectedMsgForAction: MosChatMessage | null;
  setSelectedMsgForAction: (msg: MosChatMessage | null) => void;
  replyingToMessage: MosChatMessage | null;
  setReplyingToMessage: (msg: MosChatMessage | null) => void;

  // Unread & Notifications
  totalUnreadCount: number;
  totalTaskCount: number;

  // Refresh
  refresh: () => Promise<void>;
}
