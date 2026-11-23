import type {
  MosChatImageAttachment,
  MosChatMissionExecutionTrack,
  MosChatMissionSummary,
  MosChatTaskPriority,
  MosChatUserSidebarPrefs,
  MosChatWorkflowCategory,
  MosChatWorkflowInstance,
  MosChatWorkflowStepType,
  MosChatWorkflowTargetHook,
  MosChatWorkflowTemplate,
} from './core-entities.types.js';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskChecklistItem,
  MosChatTaskItem,
  MosChatThreadReply,
} from './messages-and-tasks.types.js';

export interface UpdateMosChatTaskRequest {
  title?: string;
  summary?: string | null;
  assigneeId?: number | string;
  assigneeName?: string;
  priority?: MosChatTaskPriority;
  remindAt?: string;
  dueAt?: string | null;
  deadline?: string | null;
  negotiatedDeadline?: string | null;
  negotiationNote?: string | null;
  negotiatedBy?: string | null;
  negotiatedAt?: string | null;
  acceptNegotiatedDeadline?: boolean;
  rejectNegotiatedDeadline?: boolean;
  snoozeSeconds?: number;
  remindInSeconds?: number;
  done?: boolean;
  archived?: boolean;
  triggerReminderNow?: boolean;
  checklist?: MosChatTaskChecklistItem[];
  checklistAction?: 'add' | 'toggle' | 'edit' | 'delete' | 'reorder' | 'set' | 'auto_summarize';
  checklistItem?: Partial<MosChatTaskChecklistItem>;
  checklistItemId?: string;
}

export interface ExtractMosChatChecklistRequest {
  messageId: string;
  conversationId?: string;
  taskId?: string;
}

export interface ExtractMosChatChecklistSuggestion {
  title: string;
  deadline?: string | null;
  assigneeName?: string | null;
  assigneeId?: number | string | null;
  assigneeAvatar?: string | null;
  sourceReplyId?: string | null;
}

export interface ExtractMosChatChecklistResponse {
  success: boolean;
  summary?: string | null;
  suggestions: ExtractMosChatChecklistSuggestion[];
}

export interface DeleteMosChatTaskResponse {
  success: boolean;
  taskId: string;
  message?: string;
}

export type MosChatMissionActionType =
  | 'APPROVE_IMPLEMENTATION'
  | 'APPROVE_COMMIT'
  | 'APPROVE_DEPLOY'
  | 'ACCEPT_RESULT'
  | 'REQUEST_REWORK'
  | 'REPORTER_ACCEPT'
  | 'REPORTER_REOPEN';

export interface CreateMosChatMissionRequest {
  conversationId: string;
  messageId?: string | null;
  taskId?: string | null;
  requestType?: 'BUG' | 'FEATURE';
  type?: 'BUG' | 'FEATURE';
  executionTrack?: MosChatMissionExecutionTrack;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  dannyNote?: string | null;
  note?: string | null;
  titleOverride?: string | null;
  title?: string | null;
  pageUrl?: string | null;
  sourceMessage?: MosChatMessage | null;
  /** AI Copilot (MAI) session the message belongs to, so the ticket can link back to the exact session. */
  aiSessionId?: string | null;
}

export interface CreateMosChatMissionResponse {
  success: boolean;
  mission: MosChatMissionSummary;
  message?: MosChatMessage;
  task?: MosChatTaskItem | null;
}

export interface ActionMosChatMissionRequest {
  conversationId?: string;
  messageId?: string | null;
  taskId?: string | null;
  action: MosChatMissionActionType;
  note?: string | null;
  feedback?: string | null;
}

export interface ActionMosChatMissionResponse {
  success: boolean;
  mission: MosChatMissionSummary;
  message?: MosChatMessage | null;
  statusMessage?: string;
  task?: MosChatTaskItem | null;
  systemReply?: MosChatThreadReply | null;
}

export interface ShareMosChatMissionRequest {
  reportId: number;
  targetConversationIds?: string[];
  targetStaffIds?: number[];
  note?: string | null;
}

export interface ShareMosChatMissionResultItem {
  conversationId: string;
  conversationName: string;
  conversationType: 'dm' | 'space';
  message: MosChatMessage;
  createdNewConversation?: boolean;
}

export interface ShareMosChatMissionResponse {
  success: boolean;
  mission: MosChatMissionSummary;
  results: ShareMosChatMissionResultItem[];
  updatedConversations: MosChatConversation[];
  userPrefs?: MosChatUserSidebarPrefs;
}

export interface SharedMosChatMissionPreview {
  reportId: number;
  key: string;
  missionCode: string;
  requestType: 'BUG' | 'FEATURE';
  title: string;
  description: string;
  status: string;
  sourcePath: string;
  reporterStaffId: number;
  reporterName: string | null;
  createdAt: string;
  updatedAt: string;
  resolutionSummary: string | null;
  releaseUrl: string | null;
  mission: MosChatMissionSummary;
}

export interface TogglePinConversationRequest {
  pinned?: boolean;
}

export interface TogglePinConversationResponse {
  success: boolean;
  pinned: boolean;
  userPrefs?: MosChatUserSidebarPrefs;
}

export interface MarkConversationAsUnreadResponse {
  success: boolean;
  unreadCount: number;
  userPrefs?: MosChatUserSidebarPrefs;
}

export interface MarkThreadAsReadRequest {
  conversationId: string;
  messageId: string;
}

export interface MarkThreadAsReadResponse {
  success: boolean;
  unreadThreadReplyCount: number;
  userPrefs?: MosChatUserSidebarPrefs;
  conversation?: MosChatConversation;
}

export type MosChatThreadMoveMode = 'MERGE_ROOT_TO_THREAD' | 'PROMOTE_REPLY_TO_ROOT' | 'MOVE_REPLY_TO_THREAD';

export interface MoveMosChatThreadItemRequest {
  conversationId: string;
  mode: MosChatThreadMoveMode;
  sourceMessageId: string;
  replyId?: string | null;
  targetMessageId?: string | null;
}

export interface MoveMosChatThreadItemResponse {
  success: boolean;
  mode: MosChatThreadMoveMode;
  conversation: MosChatConversation;
  targetMessage?: MosChatMessage | null;
  promotedMessage?: MosChatMessage | null;
  tasks?: MosChatTaskItem[];
}

export interface ForwardMosChatMessageRequest {
  sourceConversationId: string;
  sourceMessageId: string;
  sourceReplyId?: string | null;
  includeThread?: boolean;
  targetConversationIds?: string[];
  targetStaffIds?: number[];
  note?: string | null;
}

export interface ForwardMosChatMessageResultItem {
  conversationId: string;
  conversationName: string;
  conversationType: 'dm' | 'space';
  message: MosChatMessage;
  forwardedThreadCount: number;
  createdNewConversation?: boolean;
}

export interface ForwardMosChatMessageResponse {
  success: boolean;
  results: ForwardMosChatMessageResultItem[];
  updatedConversations: MosChatConversation[];
  userPrefs?: MosChatUserSidebarPrefs;
}

// ================= DYNAMIC WORKFLOW ENGINE ACTION DTOs =================

export interface CreateMosChatWorkflowInstanceRequest {
  conversationId: string;
  templateCode: string;
  title: string;
  formData?: Record<string, unknown>;
  stepActorOverrides?: Record<number, { actorStaffId?: number; actorName?: string; actorRole?: string }>;
}

export interface CreateMosChatWorkflowInstanceResponse {
  success: boolean;
  workflow: MosChatWorkflowInstance;
  message: MosChatMessage;
  conversation: MosChatConversation;
  task?: MosChatTaskItem | null;
}

export interface ActionMosChatWorkflowInstanceRequest {
  action: 'ADVANCE' | 'APPROVE' | 'REJECT' | 'CONFIRM';
  note?: string | null;
  attachments?: MosChatImageAttachment[];
  payload?: Record<string, unknown>;
}

export interface ActionMosChatWorkflowInstanceResponse {
  success: boolean;
  workflow: MosChatWorkflowInstance;
  message?: MosChatMessage | null;
  conversation?: MosChatConversation | null;
  task?: MosChatTaskItem | null;
  threadReply?: MosChatThreadReply | null;
}

export interface SaveThreadAsWorkflowTemplateRequest {
  conversationId: string;
  messageId?: string | null;
  code?: string | null;
  name: string;
  description?: string | null;
  category?: MosChatWorkflowCategory;
  targetSystemHook?: MosChatWorkflowTargetHook;
  steps?: Array<{
    title: string;
    stepType?: MosChatWorkflowStepType;
    actorRole: string;
    actorStaffId?: number | null;
    actorName?: string | null;
    requireAttachment?: boolean;
    actionButtonLabel?: string;
  }>;
  upgradeInstruction?: string | null;
}

export interface SaveThreadAsWorkflowTemplateResponse {
  success: boolean;
  template: MosChatWorkflowTemplate;
  systemMessage?: MosChatMessage | null;
  systemReply?: MosChatThreadReply | null;
}

// ================= ENTERPRISE SCALE SYNC, PAGINATION & REALTIME EVENT TYPES =================

export interface MosChatPaginatedMessagesQuery {
  before?: string;
  after?: string;
  limit?: number;
}

export interface MosChatPaginatedMessagesResponse {
  success: boolean;
  conversationId: string;
  messages: MosChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MosChatDeltaSyncResponse {
  success: boolean;
  cursor: string;
  serverTime: string;
  updatedConversations: MosChatConversation[];
  updatedMessages: MosChatMessage[];
  updatedTasks: MosChatTaskItem[];
  updatedMissions: MosChatMissionSummary[];
  hasFullReloadRequired?: boolean;
}

export type MosChatRealtimeEventType =
  | 'MESSAGE_CREATED'
  | 'MESSAGE_UPDATED'
  | 'MESSAGE_DELETED'
  | 'THREAD_REPLY_CREATED'
  | 'REACTION_UPDATED'
  | 'MESSAGE_BUZZED'
  | 'TASK_UPDATED'
  | 'MISSION_UPDATED'
  | 'CONVERSATION_UPDATED'
  | 'CALL_STATE_CHANGED'
  | 'CALL_SIGNAL'
  | 'HEARTBEAT';

export interface MosChatRealtimeEvent {
  id: string;
  type: MosChatRealtimeEventType;
  conversationId?: string | null;
  timestamp: string;
  actorStaffId?: number | string | null;
  payload: Record<string, unknown>;
}

export interface SearchMosChatMessagesQuery {
  q: string;
  conversationId?: string;
  inThreadOnly?: boolean;
  hasAttachment?: boolean;
  limit?: number;
}

export interface MosChatSearchResultItem {
  id: string;
  conversationId: string;
  conversationName: string;
  conversationType: 'space' | 'dm';
  isThreadReply: boolean;
  parentMessageId?: string | null;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string | null;
  roleColor?: string | null;
  text: string;
  timeLabel: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedByName?: string | null;
  hasAttachments?: boolean;
  attachmentNames?: string[];
  attachments?: Array<{
    id?: string;
    url: string;
    name?: string;
    mimeType?: string;
    sizeBytes?: number;
  }>;
}

export interface SearchMosChatMessagesResponse {
  success: boolean;
  query: string;
  totalMatches: number;
  items: MosChatSearchResultItem[];
}
