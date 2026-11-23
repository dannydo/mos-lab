export type MosChatPresenceStatus = 'active' | 'dnd' | 'away';

export type MosChatTaskPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export type MosChatImageMimeType =
  'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/heic' | 'image/heif' | 'image/svg+xml' | 'image/bmp';

export type MosChatVideoMimeType = 'video/mp4' | 'video/webm' | 'video/quicktime';

export type MosChatFileMimeType =
  | MosChatImageMimeType
  | MosChatVideoMimeType
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
  durationSec?: number;
  posterUrl?: string;
  isVideo?: boolean;
  source?: 'clipboard' | 'drive' | 'upload';
  fileExt?: string;
  isProcessing?: boolean;
  processingStatus?: string;
}

export type MosChatAttachment = MosChatImageAttachment;

export interface MosChatCustomerCard {
  customerId?: number;
  name: string;
  meta: string;
  cvName?: string;
  phone?: string;
  avatarUrl?: string | null;
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

export interface MosChatForwardedMetadata {
  sourceConversationId: string;
  sourceConversationName: string;
  sourceConversationType: 'dm' | 'space';
  sourceMessageId: string;
  sourceReplyId?: string | null;
  originalSenderId: number | string;
  originalSenderName: string;
  originalSenderRole?: string;
  originalSenderAvatar?: string | null;
  originalCreatedAt: string;
  originalTimeLabel?: string;
  forwardedByStaffId: number | string;
  forwardedByName: string;
  forwardedAt: string;
  forwardedThreadCount?: number;
  note?: string | null;
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

/**
 * Notification filter modes for the tiered notification system.
 * - 'ALL': Receive all notifications (popup + sound) from every conversation.
 * - 'MENTIONS_ONLY': Only receive notifications when explicitly @mentioned or in DMs.
 * - 'NOTHING': No notifications at all (except DMs and @mentions which are always forced).
 */
export type MosChatNotificationMode = 'ALL' | 'MENTIONS_ONLY' | 'NOTHING';

/**
 * Per-conversation notification override.
 * - 'INHERIT': Follow the global default mode.
 * - 'ALL': Always receive all notifications from this conversation.
 * - 'MENTIONS_ONLY': Only receive notifications when @mentioned in this conversation.
 * - 'MUTED': Never receive notifications from this conversation (even @mentions are silenced for popup/sound, but still increment unread badge).
 */
export type MosChatChannelNotificationOverride = 'INHERIT' | 'ALL' | 'MENTIONS_ONLY' | 'MUTED';

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

  /** Global default notification mode. Defaults to 'ALL' for backward compatibility. */
  notificationMode?: MosChatNotificationMode;

  /** Per-conversation notification overrides. Key = conversationId, Value = override mode. */
  channelNotificationOverrides?: Record<string, MosChatChannelNotificationOverride>;
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

// ================= VOICE CALL BASE MODELS =================

export type MosChatVoiceCallStatus = 'RINGING' | 'ACTIVE' | 'ENDED' | 'DECLINED' | 'MISSED';

export interface MosChatVoiceCallParticipant {
  staffId: string;
  name: string;
  role?: string;
  avatar?: string | null;
  roleColor?: string | null;
  isMuted: boolean;
  isSpeaking?: boolean;
  joinedAt: string;
}

export interface MosChatVoiceCallLog {
  callId: string;
  conversationId: string;
  conversationType: 'dm' | 'space';
  status: MosChatVoiceCallStatus;
  initiatorId: string;
  initiatorName: string;
  durationSec: number;
  participantNames: string[];
  startedAt: string;
  endedAt: string;
}

export interface MosChatVoiceCallSession {
  callId: string;
  conversationId: string;
  conversationName: string;
  conversationType: 'dm' | 'space';
  status: MosChatVoiceCallStatus;
  initiatorId: string;
  initiatorName: string;
  initiatorRole?: string;
  initiatorAvatar?: string | null;
  targetStaffIds: string[];
  participants: MosChatVoiceCallParticipant[];
  declinedStaffIds: string[];
  startedAt: string;
  connectedAt?: string | null;
  endedAt?: string | null;
  durationSec?: number;
  livekitUrl?: string | null;
  livekitRoomName?: string | null;
}

export type MosChatVoiceCallSignalType = 'offer' | 'answer' | 'ice-candidate' | 'renegotiate';

export interface MosChatVoiceCallSignalEnvelope {
  id: string;
  callId: string;
  conversationId: string;
  fromStaffId: string;
  fromName: string;
  targetStaffId: string;
  signalType: MosChatVoiceCallSignalType;
  sdp?: unknown;
  candidate?: unknown;
  timestamp: string;
}
