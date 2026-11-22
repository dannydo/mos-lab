import type {
  MosChatAccessConfig,
  MosChatBuzzEvent,
  MosChatCustomerCard,
  MosChatEntityContext,
  MosChatFileMimeType,
  MosChatForwardedMetadata,
  MosChatImageAttachment,
  MosChatMessageEditHistoryItem,
  MosChatMissionStage,
  MosChatMissionSummary,
  MosChatReadReceiptEntry,
  MosChatStaffMember,
  MosChatTaskPriority,
  MosChatThreadReadReceiptEntry,
  MosChatUserSidebarPrefs,
  MosChatVoiceCallLog,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
} from './core-entities.types.js';

export interface MosChatThreadReply {
  id: string;
  senderId: number | string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string | null;
  text: string;
  timeLabel: string;
  createdAt: string;
  attachments?: MosChatImageAttachment[];
  customerCard?: MosChatCustomerCard | null;
  forwardedFrom?: MosChatForwardedMetadata | null;
  editedAt?: string | null;
  editedBy?: string | number | null;
  editHistory?: MosChatMessageEditHistoryItem[];
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | number | null;
  deletedByName?: string | null;
  originalText?: string;
  isMissionMilestone?: boolean;
  missionStage?: MosChatMissionStage | null;
  missionId?: number | null;
  syncedCommentId?: number | null;
  reactions?: Record<string, number>;
  reactionUsers?: Record<string, Array<number | string>>;
  isAiBot?: boolean;
  aiThinking?: string | null;
  aiAction?: {
    type: string;
    label: string;
    payload: Record<string, unknown>;
    actions?: Array<{
      type: string;
      label: string;
      payload: Record<string, unknown>;
    }>;
  } | null;
  aiActions?: Array<{
    type: string;
    label: string;
    payload: Record<string, unknown>;
  }> | null;
  roleColor?: string;
  isBuzzed?: boolean;
  buzzedAt?: string | null;
  buzzCount?: number;
  latestBuzz?: MosChatBuzzEvent | null;
  buzzHistory?: MosChatBuzzEvent[];
  callLog?: MosChatVoiceCallLog | null;
}

export interface MosChatQuotedMessage {
  id: string;
  senderId?: number | string;
  senderName: string;
  senderAvatar?: string | null;
  text: string;
}

export interface MosChatMessage {
  id: string;
  conversationId: string;
  senderId: number | string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string | null;
  roleColor?: string;
  text: string;
  timeLabel: string;
  createdAt: string;
  replyToId?: string | null;
  replyTo?: MosChatQuotedMessage | null;
  forwardedFrom?: MosChatForwardedMetadata | null;
  pinned?: boolean;
  reactions?: Record<string, number>;
  reactionUsers?: Record<string, Array<number | string>>;
  customerCard?: MosChatCustomerCard | null;
  attachments?: MosChatImageAttachment[];
  taskId?: string | null;
  missionId?: number | null;
  missionKey?: string | null;
  mission?: MosChatMissionSummary | null;
  missionSyncedStage?: MosChatMissionStage | null;
  missionSyncedCommentIds?: number[];
  thread?: MosChatThreadReply[];
  threadReadReceipts?: MosChatThreadReadReceiptEntry[];
  unreadThreadReplyCount?: number;
  isSystemReminder?: boolean;
  isAiBot?: boolean;
  aiThinking?: string | null;
  aiAction?: {
    type: string;
    label: string;
    payload: Record<string, unknown>;
    actions?: Array<{
      type: string;
      label: string;
      payload: Record<string, unknown>;
    }>;
  } | null;
  aiActions?: Array<{
    type: string;
    label: string;
    payload: Record<string, unknown>;
  }> | null;
  editedAt?: string | null;
  editedBy?: string | number | null;
  editHistory?: MosChatMessageEditHistoryItem[];
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | number | null;
  deletedByName?: string | null;
  originalText?: string;
  workflowInstanceId?: string | null;
  workflow?: MosChatWorkflowInstance | null;
  entityContext?: MosChatEntityContext | null;
  isBuzzed?: boolean;
  buzzedAt?: string | null;
  buzzCount?: number;
  latestBuzz?: MosChatBuzzEvent | null;
  buzzHistory?: MosChatBuzzEvent[];
  callLog?: MosChatVoiceCallLog | null;
}

export interface MosChatTaskChecklistItem {
  id: string;
  title: string;
  done: boolean;
  deadline?: string | null;
  assigneeId?: number | string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  sourceReplyId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  completedAt?: string | null;
  completedByName?: string | null;
}

export type MosChatTaskActivityAction =
  | 'CREATE_TASK'
  | 'ADD_ITEM'
  | 'TOGGLE_ITEM'
  | 'EDIT_ITEM'
  | 'DELETE_ITEM'
  | 'COMPLETE_TASK'
  | 'REOPEN_TASK'
  | 'SUMMARIZE_CHECKLIST';

export interface MosChatTaskActivityLogItem {
  id: string;
  action: MosChatTaskActivityAction;
  actorId?: number | string | null;
  actorName: string;
  description: string;
  timestamp: string;
}

export interface MosChatTaskItem {
  id: string;
  conversationId: string;
  conversationName: string;
  sourceMessageId?: string | null;
  sourceAuthorName?: string;
  title: string;
  summary?: string | null;
  assigneeId?: number | string;
  assigneeName: string;
  creatorName: string;
  assignerName?: string;
  assignerId?: number | string;
  priority: MosChatTaskPriority;
  remindAt: string;
  dueAt?: string | null;
  deadline?: string | null;
  negotiatedDeadline?: string | null;
  negotiationNote?: string | null;
  negotiatedBy?: string | null;
  negotiatedAt?: string | null;
  done: boolean;
  fired?: boolean;
  createdAt: string;
  missionId?: number | null;
  missionKey?: string | null;
  mission?: MosChatMissionSummary | null;
  archived?: boolean;
  archivedAt?: string | null;
  updatedAt?: string;
  checklist?: MosChatTaskChecklistItem[];
  activityLog?: MosChatTaskActivityLogItem[];
}

export interface MosChatConversation {
  id: string;
  type: 'dm' | 'space';
  name: string;
  subtitle?: string;
  roleTag?: string;
  color: string;
  avatar?: string;
  memberCount?: number;
  participantStaffId?: number;
  isSelf?: boolean;
  memberIds?: number[];
  members?: MosChatStaffMember[];
  memberNicknames?: Record<string, string>; // staffId string -> nickname in this group/space
  unreadCount: number;
  unreadThreadCount?: number;
  hasUnreadBuzz?: boolean;
  unreadBuzzCount?: number;
  readReceipts?: MosChatReadReceiptEntry[];
  messages: MosChatMessage[];
  updatedAt: string;
}

export interface MosChatBootstrapResponse {
  version?: number;
  unchanged?: boolean;
  conversations: MosChatConversation[];
  tasks: MosChatTaskItem[];
  staffDirectory: MosChatStaffMember[];
  accessConfig?: MosChatAccessConfig;
  canAccessChat?: boolean;
  userPrefs?: MosChatUserSidebarPrefs;
  workflowTemplates?: MosChatWorkflowTemplate[];
  workflowInstances?: MosChatWorkflowInstance[];
  storageEngine?: 'PRISMA_RELATIONAL' | 'HYBRID';
}

export interface MosChatUnreadSummaryResponse {
  unreadCount: number;
  urgentTaskCount: number;
  hasUnread: boolean;
  version?: number;
  lastMessageAt?: string | null;
}

export interface CreateMosChatMessageRequest {
  conversationId: string;
  text: string;
  replyToId?: string | null;
  replyTo?: MosChatQuotedMessage | null;
  customerCard?: MosChatCustomerCard | null;
  attachments?: MosChatImageAttachment[];
  isAiBot?: boolean;
  aiThinking?: string | null;
  aiAction?: {
    type: string;
    label: string;
    payload: Record<string, unknown>;
    actions?: Array<{
      type: string;
      label: string;
      payload: Record<string, unknown>;
    }>;
  } | null;
  aiActions?: Array<{
    type: string;
    label: string;
    payload: Record<string, unknown>;
  }> | null;
}

export interface EditMosChatMessageRequest {
  conversationId?: string;
  text: string;
  replyId?: string;
}

export interface DeleteMosChatMessageRequest {
  conversationId?: string;
  replyId?: string;
}

export interface RestoreMosChatMessageRequest {
  conversationId?: string;
  replyId?: string;
}

export interface BuzzMosChatMessageRequest {
  conversationId: string;
  replyId?: string;
  note?: string;
}

export interface BuzzMosChatMessageResponse {
  success: boolean;
  message: MosChatMessage;
  buzzEvent: MosChatBuzzEvent;
  conversation?: MosChatConversation;
}

export interface CreateMosChatThreadReplyRequest {
  conversationId: string;
  messageId: string;
  text: string;
  attachments?: MosChatImageAttachment[];
  customerCard?: MosChatCustomerCard | null;
  isAiBot?: boolean;
  aiThinking?: string | null;
  aiAction?: {
    type: string;
    label: string;
    payload: Record<string, unknown>;
    actions?: Array<{
      type: string;
      label: string;
      payload: Record<string, unknown>;
    }>;
  } | null;
  aiActions?: Array<{
    type: string;
    label: string;
    payload: Record<string, unknown>;
  }> | null;
}

export interface UploadMosChatImageRequest {
  dataBase64: string;
  mimeType: MosChatFileMimeType;
  fileName?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  posterUrl?: string;
  isVideo?: boolean;
  source?: 'clipboard' | 'drive' | 'upload';
}

export type UploadMosChatFileRequest = UploadMosChatImageRequest;

export interface UploadMosChatImageResponse {
  success: boolean;
  attachment: MosChatImageAttachment;
}

export type UploadMosChatFileResponse = UploadMosChatImageResponse;
export type UploadMosChatVideoResponse = UploadMosChatImageResponse;

export interface CreateMosChatTaskRequest {
  conversationId: string;
  sourceMessageId?: string | null;
  title: string;
  summary?: string | null;
  assigneeId?: number | string;
  assigneeName: string;
  priority: MosChatTaskPriority;
  remindInSeconds?: number;
  remindAt?: string;
  dueAt?: string | null;
  deadline?: string | null;
  negotiationNote?: string | null;
  checklist?: Array<{
    title: string;
    done?: boolean;
    deadline?: string | null;
    assigneeId?: number | string | null;
    assigneeName?: string | null;
    assigneeAvatar?: string | null;
    sourceReplyId?: string | null;
  }>;
  importRepliesAsChecklist?: boolean;
  autoSummarizeChecklist?: boolean;
}

export interface CreateMosChatConversationRequest {
  type: 'dm' | 'space';
  name: string;
  participantStaffId?: number;
  memberIds?: number[];
  isSelf?: boolean;
  subtitle?: string;
  avatar?: string;
  color?: string;
}

export interface UpdateMosChatSpaceConfigRequest {
  name?: string;
  subtitle?: string;
  avatar?: string;
  color?: string;
}

export interface AddMosChatMemberRequest {
  conversationId: string;
  staffId?: number;
  staffIds?: number[];
}

export interface RemoveMosChatMemberRequest {
  conversationId: string;
  staffId: number;
}

export interface UpdateMosChatNicknameRequest {
  targetStaffId?: number;
  nickname: string;
}
