import type {
  MosChatConversation,
  MosChatMessage,
  MosChatThreadReply,
  MosChatTaskItem,
  MosChatStaffMember,
  MosChatImageAttachment,
  MosChatCustomerCard,
  MosChatPresenceStatus,
  MosChatTaskPriority,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  MosChatMissionSummary,
  MosChatMissionActionType,
  MosChatThreadMoveMode,
  UpdateMosChatTaskRequest,
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
  startDirectMessage: (staff: MosChatStaffMember) => Promise<string | null>;
  updateSpaceConfig?: (
    id: string,
    payload: { name?: string; subtitle?: string; avatar?: string; color?: string }
  ) => Promise<boolean>;

  // Messages
  messages: MosChatMessage[];
  allMessagesByConv: Record<string, MosChatMessage[]>;
  isLoadingMessages: boolean;
  sendMessage: (
    text: string,
    options?: {
      attachments?: MosChatImageAttachment[];
      customerCard?: MosChatCustomerCard | null;
      targetConvId?: string;
      replyToId?: string;
    }
  ) => Promise<boolean>;
  reactToMessage: (msgId: string, emoji: string, replyId?: string) => Promise<void>;
  togglePinMessage: (msgId: string) => Promise<void>;
  deleteMessage: (msgId: string) => Promise<void>;
  deleteThreadReply: (parentMsgId: string, replyId: string) => Promise<void>;
  editMessage: (msgId: string, newText: string, options?: { replyId?: string }) => Promise<void>;
  buzzMessage: (msgId: string) => Promise<void>;

  // Thread
  activeThreadMsg: MosChatMessage | null;
  setActiveThreadMsg: (msg: MosChatMessage | null) => void;
  threadReplies: MosChatThreadReply[];
  sendThreadReply: (
    text: string,
    options?: { attachments?: MosChatImageAttachment[]; customerCard?: MosChatCustomerCard | null }
  ) => Promise<boolean>;
  moveThreadItem: (params: {
    mode: MosChatThreadMoveMode;
    sourceMessageId: string;
    replyId?: string;
    targetMessageId?: string;
  }) => Promise<boolean>;
  markThreadAsRead: (convId: string, msgId: string) => Promise<void>;

  // AI Copilot
  isAiThinking: boolean;

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
  updateTask: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  acceptNegotiatedDeadline: (task: MosChatTaskItem) => Promise<boolean>;
  rejectNegotiatedDeadline: (task: MosChatTaskItem) => Promise<boolean>;
  dispatchMissionFromTask: (
    task: MosChatTaskItem,
    payload: { title?: string; type?: 'BUG' | 'FEATURE'; note?: string }
  ) => Promise<SafeAny>;
  executeMissionAction: (
    mission: MosChatMissionSummary,
    action: MosChatMissionActionType,
    feedback?: string
  ) => Promise<SafeAny>;

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

  // Space Management
  addMemberToSpace: (staffId: number | number[], spaceId?: string) => Promise<MosChatConversation | null>;
  removeMemberFromSpace?: (staffId: number, spaceId?: string) => Promise<MosChatConversation | null>;
  updateMemberNickname?: (staffId: number, nickname: string, spaceId?: string) => Promise<boolean>;

  // Refresh & AI
  resetAiChat?: () => Promise<void>;
  refresh: () => Promise<void>;

  // Customer Detail Drawer Integration
  openCustomerDetail?: (customerId: number) => void;
}
