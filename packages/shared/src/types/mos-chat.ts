export type MosChatPresenceStatus = 'active' | 'dnd' | 'away';

export type MosChatTaskPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export type MosChatImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export interface MosChatImageAttachment {
  id: string;
  url: string;
  name: string;
  mimeType: MosChatImageMimeType;
  sizeBytes: number;
  width?: number;
  height?: number;
  source?: 'clipboard' | 'drive' | 'upload';
}

export interface MosChatCustomerCard {
  customerId?: number;
  name: string;
  meta: string;
  cvName?: string;
  phone?: string;
}

export interface MosChatMessageEditHistoryItem {
  text: string;
  editedAt: string;
  editedBy?: string | number;
  editorName?: string;
}

export type MosChatMissionStage =
  'RECEIVED' | 'NEEDS_INFO' | 'BUILDING' | 'AWAITING_RELEASE' | 'READY_FOR_REVIEW' | 'COMPLETED' | 'NOT_PROCEEDING';

export interface MosChatMissionSummary {
  reportId: number;
  key: string;
  missionKey: string;
  missionCode: string;
  requestType: 'BUG' | 'FEATURE';
  title: string;
  status: string;
  clarificationStatus: string;
  stage: MosChatMissionStage;
  stepIndex: 1 | 2 | 3 | 4;
  humanBadge: string;
  stageLabel: string;
  humanSummary: string;
  humanStatusSummary: string;
  clarificationQuestion?: string | null;
  releaseUrl?: string | null;
  reporterName?: string | null;
  reporterStaffId?: number | null;
  conversationId?: string;
  messageId?: string;
  taskId?: string | null;
  updatedAt: string;
  canSuperAdminApproveCommit?: boolean;
  canSuperAdminApproveDeploy?: boolean;
  canReporterAccept?: boolean;
  superAdminActions?: {
    canApproveImplementation: boolean;
    canApproveCommit: boolean;
    canApproveDeploy: boolean;
    canConfirmClose: boolean;
    activeJobId?: string | null;
    executionPhase?: string | null;
    changedFilesCount?: number;
    diffStat?: string | null;
    agentSummary?: string | null;
  };
  reporterActions?: {
    canAcceptOrReopen: boolean;
  };
}

export interface MosChatReadReceiptEntry {
  staffId: number;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
  readCount: number;
  lastReadMessageId?: string | null;
  readAt: string;
}

export interface MosChatThreadReadReceiptEntry {
  staffId: number;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
  readReplyCount: number;
  lastReadReplyId?: string | null;
  readAt: string;
}

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
}

export interface MosChatTaskItem {
  id: string;
  conversationId: string;
  conversationName: string;
  sourceMessageId?: string | null;
  sourceAuthorName?: string;
  title: string;
  assigneeId?: number | string;
  assigneeName: string;
  creatorName: string;
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
  readReceipts?: MosChatReadReceiptEntry[];
  messages: MosChatMessage[];
  updatedAt: string;
}

export interface MosChatStaffMember {
  id: number;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  departmentCodes?: string[];
  teamCodes?: string[];
}

export interface MosChatAccessConfig {
  allowAllStaff: boolean;
  allowedGroupKeys: string[];
  allowedStaffIds: number[];
  aiCopilotAllowedGroupKeys?: string[];
  aiCopilotAllowedStaffIds?: number[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface UpdateMosChatAccessConfigRequest {
  allowAllStaff?: boolean;
  allowedGroupKeys?: string[];
  allowedStaffIds?: number[];
  aiCopilotAllowedGroupKeys?: string[];
  aiCopilotAllowedStaffIds?: number[];
}

export interface MosChatCustomSection {
  id: string;
  name: string;
  conversationIds: string[];
  collapsed?: boolean;
  unreadOnly?: boolean;
}

export interface MosChatUserSidebarPrefs {
  pinnedIds: string[];
  mutedIds: string[];
  hiddenIds: string[];
  manualUnreadIds: string[];
  readMessageCountByConv?: Record<string, number>;
  readAtByConv?: Record<string, string>;
  lastReadMessageIdByConv?: Record<string, string>;
  readThreadReplyCountByMsg?: Record<string, number>;
  readThreadAtByMsg?: Record<string, string>;
  lastReadThreadReplyIdByMsg?: Record<string, string>;
  collapsedSections: Record<string, boolean>;
  unreadOnlySections: Record<string, boolean>;
  sectionOrder: string[];
  customSections: MosChatCustomSection[];
  conversationOrder: Record<string, string[]>;
  updatedAt?: string;
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

export interface CreateMosChatMessageRequest {
  conversationId: string;
  text: string;
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

export interface CreateMosChatThreadReplyRequest {
  conversationId: string;
  messageId: string;
  text: string;
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

export interface UploadMosChatImageRequest {
  dataBase64: string;
  mimeType: MosChatImageMimeType;
  fileName?: string;
  width?: number;
  height?: number;
  source?: 'clipboard' | 'drive' | 'upload';
}

export interface UploadMosChatImageResponse {
  success: boolean;
  attachment: MosChatImageAttachment;
}

export interface CreateMosChatTaskRequest {
  conversationId: string;
  sourceMessageId?: string | null;
  title: string;
  assigneeId?: number | string;
  assigneeName: string;
  priority: MosChatTaskPriority;
  remindInSeconds?: number;
  remindAt?: string;
  dueAt?: string | null;
  deadline?: string | null;
  negotiationNote?: string | null;
}

export interface CreateMosChatConversationRequest {
  type: 'dm' | 'space';
  name: string;
  participantStaffId?: number;
  memberIds?: number[];
  isSelf?: boolean;
  subtitle?: string;
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

export interface UpdateMosChatTaskRequest {
  title?: string;
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
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  dannyNote?: string | null;
  note?: string | null;
  titleOverride?: string | null;
  title?: string | null;
  pageUrl?: string | null;
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

// ================= DYNAMIC WORKFLOW ENGINE & CONTEXTUAL ENTITY TYPES =================

export type MosChatEntityType =
  'CUSTOMER' | 'ORDER' | 'INVENTORY' | 'CASHFLOW' | 'MISSION' | 'QA' | 'WORKFLOW' | 'CUSTOM';

export interface MosChatEntityContext {
  entityType: MosChatEntityType;
  entityId: string | number;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type MosChatWorkflowCategory = 'FINANCE' | 'INVENTORY' | 'OPERATIONS' | 'BRAINSTORM' | 'CUSTOM';

export type MosChatWorkflowTargetHook = 'CASHFLOW_ENTRY' | 'STOCK_INVENTORY' | 'NONE';

export type MosChatWorkflowStepType =
  'REQUEST' | 'APPROVAL' | 'EXECUTION_PROOF' | 'CONFIRMATION' | 'INVENTORY_CHECK' | 'SYSTEM_SYNC';

export interface MosChatWorkflowStepDefinition {
  id: string;
  index: number;
  title: string;
  description?: string | null;
  stepType: MosChatWorkflowStepType;
  actorRole: string; // e.g., 'REQUESTER', 'MANAGER', 'CEO', 'ACCOUNTANT', 'WAREHOUSE', 'ANY'
  actorStaffId?: number | null;
  actorName?: string | null;
  requireNote?: boolean;
  requireAttachment?: boolean;
  actionButtonLabel?: string;
}

export interface MosChatWorkflowTemplate {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: MosChatWorkflowCategory;
  targetSystemHook: MosChatWorkflowTargetHook;
  steps: MosChatWorkflowStepDefinition[];
  version: number;
  isActive: boolean;
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MosChatWorkflowStepStatus = 'PENDING' | 'COMPLETED' | 'APPROVED' | 'REJECTED';

export interface MosChatWorkflowStepLog {
  stepIndex: number;
  stepId: string;
  stepTitle: string;
  status: MosChatWorkflowStepStatus;
  actorStaffId?: number | string | null;
  actorName?: string | null;
  actorRole?: string | null;
  note?: string | null;
  attachments?: MosChatImageAttachment[];
  payload?: Record<string, unknown> | null;
  actedAt?: string | null;
}

export type MosChatWorkflowInstanceStatus = 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export interface MosChatInventoryVarianceItem {
  materialId?: number | null;
  materialName: string;
  unit: string;
  warehouse: string;
  systemQty: number;
  actualQty: number;
  variance: number;
}

export interface MosChatWorkflowInstance {
  id: string;
  templateId: string;
  templateCode: string;
  templateName: string;
  category: MosChatWorkflowCategory;
  targetSystemHook: MosChatWorkflowTargetHook;
  title: string;
  conversationId: string;
  messageId: string;
  status: MosChatWorkflowInstanceStatus;
  currentStepIndex: number;
  initiatorStaffId?: number | null;
  initiatorName: string;
  steps: MosChatWorkflowStepDefinition[];
  stepLogs: MosChatWorkflowStepLog[];
  formData: {
    amount?: number;
    reason?: string;
    bankInfo?: string;
    cashFlowCategory?: string;
    warehouse?: string;
    inventoryItems?: MosChatInventoryVarianceItem[];
    notes?: string;
    [key: string]: unknown;
  };
  syncedRecordType?: string | null;
  syncedRecordId?: number | null;
  syncedSummary?: string | null;
  createdAt: string;
  updatedAt: string;
}

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
