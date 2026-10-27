export type MosChatPresenceStatus = 'active' | 'dnd' | 'away';

export type MosChatTaskPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export type MosChatImageMimeType =
  'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/heic' | 'image/heif' | 'image/svg+xml' | 'image/bmp';

export type MosChatFileMimeType =
  | MosChatImageMimeType
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-powerpoint'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'text/plain'
  | 'text/csv'
  | 'application/json'
  | 'application/zip'
  | 'application/x-zip-compressed'
  | 'application/x-rar-compressed'
  | 'application/x-7z-compressed'
  | string;

export interface MosChatImageAttachment {
  id: string;
  url: string;
  name: string;
  mimeType: MosChatFileMimeType;
  sizeBytes: number;
  width?: number;
  height?: number;
  source?: 'clipboard' | 'drive' | 'upload';
  fileExt?: string;
}

export type MosChatAttachment = MosChatImageAttachment;

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

export interface MosChatBuzzEvent {
  id: string;
  senderId: number | string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string | null;
  buzzedAt: string;
  note?: string | null;
}

export type MosChatMissionStage =
  'RECEIVED' | 'NEEDS_INFO' | 'BUILDING' | 'AWAITING_RELEASE' | 'READY_FOR_REVIEW' | 'COMPLETED' | 'NOT_PROCEEDING';

export type MosChatMissionExecutionTrack = 'CODE_ENGINEERING' | 'PROCESS_CANON' | 'DATA_DECISION';

export interface MosChatMissionArtifactPreview {
  track: MosChatMissionExecutionTrack;
  trackLabel: string;
  gate1Label: string;
  gate2Label: string;
  gate3Label: string;
  codeReceipt?: {
    changedFilesCount?: number;
    diffStat?: string | null;
    testsSummary?: string | null;
  } | null;
  processDiff?: {
    canonRuleCode?: string | null;
    workflowCode?: string | null;
    beforeSummary?: string | null;
    afterSummary?: string | null;
  } | null;
  dataDryRun?: {
    targetTable?: string | null;
    affectedRows?: number;
    impactSummary?: string | null;
    rollbackReady?: boolean;
  } | null;
}

export interface MosChatMissionSummary {
  reportId: number;
  key: string;
  missionKey: string;
  missionCode: string;
  requestType: 'BUG' | 'FEATURE';
  executionTrack?: MosChatMissionExecutionTrack;
  artifactPreview?: MosChatMissionArtifactPreview | null;
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
  isBuzzed?: boolean;
  buzzedAt?: string | null;
  buzzCount?: number;
  latestBuzz?: MosChatBuzzEvent | null;
  buzzHistory?: MosChatBuzzEvent[];
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
  isBuzzed?: boolean;
  buzzedAt?: string | null;
  buzzCount?: number;
  latestBuzz?: MosChatBuzzEvent | null;
  buzzHistory?: MosChatBuzzEvent[];
}

export interface MosChatTaskChecklistItem {
  id: string;
  title: string;
  done: boolean;
  assigneeId?: number | string | null;
  assigneeName?: string | null;
  sourceReplyId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  completedAt?: string | null;
  completedByName?: string | null;
}

export type MosChatTaskActivityAction =
  'CREATE_TASK' | 'ADD_ITEM' | 'TOGGLE_ITEM' | 'EDIT_ITEM' | 'DELETE_ITEM' | 'COMPLETE_TASK' | 'REOPEN_TASK';

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

export interface MosChatStaffMember {
  id: number;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  departmentCodes?: string[];
  teamCodes?: string[];
  legacyStaffId?: number | null;
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
  source?: 'clipboard' | 'drive' | 'upload';
}

export type UploadMosChatFileRequest = UploadMosChatImageRequest;

export interface UploadMosChatImageResponse {
  success: boolean;
  attachment: MosChatImageAttachment;
}

export type UploadMosChatFileResponse = UploadMosChatImageResponse;

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
  checklist?: Array<{
    title: string;
    done?: boolean;
    assigneeId?: number | string | null;
    assigneeName?: string | null;
    sourceReplyId?: string | null;
  }>;
  importRepliesAsChecklist?: boolean;
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
  checklist?: MosChatTaskChecklistItem[];
  checklistAction?: 'add' | 'toggle' | 'edit' | 'delete' | 'reorder' | 'set';
  checklistItem?: Partial<MosChatTaskChecklistItem>;
  checklistItemId?: string;
}

export interface ExtractMosChatChecklistRequest {
  messageId: string;
  conversationId?: string;
}

export interface ExtractMosChatChecklistSuggestion {
  title: string;
  assigneeName?: string | null;
  assigneeId?: number | string | null;
  sourceReplyId?: string | null;
}

export interface ExtractMosChatChecklistResponse {
  success: boolean;
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
  | 'HEARTBEAT';

export interface MosChatRealtimeEvent {
  id: string;
  type: MosChatRealtimeEventType;
  conversationId?: string | null;
  timestamp: string;
  actorStaffId?: number | string | null;
  payload: Record<string, unknown>;
}
