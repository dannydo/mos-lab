import type { ActionResponse, PageQuery, PageResponse } from './api.js';

export const BUG_REPORT_REQUEST_TYPES = ['BUG', 'FEATURE'] as const;
export type BugReportRequestType = (typeof BUG_REPORT_REQUEST_TYPES)[number];

export const FEATURE_REQUEST_AUDIENCES = ['SELF', 'TEAM', 'ALL_STAFF', 'CUSTOMER'] as const;
export type FeatureRequestAudience = (typeof FEATURE_REQUEST_AUDIENCES)[number];

export interface FeatureRequestContext {
  reason: string;
  audience: FeatureRequestAudience;
  desiredOutcome: string | null;
}

export const BUG_REPORT_STATUSES = [
  'NEW',
  'APPROVED',
  'IN_PROGRESS',
  'FIXED',
  'CLOSED',
  'REJECTED',
  'DUPLICATE',
] as const;

export type BugReportStatus = (typeof BUG_REPORT_STATUSES)[number];

export const BUG_REPORT_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type BugPriority = (typeof BUG_REPORT_PRIORITIES)[number];

export const BUG_REPORT_CLARIFICATION_STATUSES = ['PENDING_AGENT', 'WAITING_REPORTER', 'READY'] as const;
export type BugReportClarificationStatus = (typeof BUG_REPORT_CLARIFICATION_STATUSES)[number];

export const BUG_REPORT_CLARIFICATION_FILTERS = ['ALL', 'UNCLEAR', ...BUG_REPORT_CLARIFICATION_STATUSES] as const;
export type BugReportClarificationFilter = (typeof BUG_REPORT_CLARIFICATION_FILTERS)[number];

export const BUG_REPORT_AGENT_PROGRESS_STAGES = [
  'NOT_VIEWED',
  'ANALYZING',
  'CHECKING_BUSINESS_LOGIC',
  'WAITING_REPORTER',
  'REPORTER_REPLIED',
  'REOPENED_BY_REPORTER',
  'READY_FOR_TRIAGE',
  'QUEUED_FOR_FIX',
  'IMPLEMENTING',
  'VERIFYING',
  'AWAITING_REPORTER_REVIEW',
  'COMPLETED',
  'STOPPED',
] as const;
export type BugReportAgentProgressStage = (typeof BUG_REPORT_AGENT_PROGRESS_STAGES)[number];

export const BUG_REPORT_NEXT_ACTORS = ['REPORTER', 'DANNY', 'AGENT', 'NONE'] as const;
export type BugReportNextActor = (typeof BUG_REPORT_NEXT_ACTORS)[number];

export const BUG_REPORT_NEXT_ACTION_TYPES = [
  'ANSWER_CLARIFICATION',
  'REVIEW_CLARIFICATION',
  'TRIAGE',
  'IMPLEMENT',
  'CONTINUE_IMPLEMENTATION',
  'REWORK',
  'REVIEW_RESULT',
  'NONE',
] as const;
export type BugReportNextActionType = (typeof BUG_REPORT_NEXT_ACTION_TYPES)[number];

export const BUG_REPORT_AGENT_UPDATE_STAGES = [
  'ANALYZING',
  'CHECKING_BUSINESS_LOGIC',
  'IMPLEMENTING',
  'VERIFYING',
] as const;
export type BugReportAgentUpdateStage = (typeof BUG_REPORT_AGENT_UPDATE_STAGES)[number];

export const BUG_REPORT_COMMENT_KINDS = ['COMMENT', 'CLARIFICATION_QUESTION', 'CLARIFICATION_REVIEW'] as const;
export type BugReportCommentKind = (typeof BUG_REPORT_COMMENT_KINDS)[number];

export interface BugReportApiFailure {
  occurredAt: string;
  method: string;
  url: string;
  status: number | null;
  code: string | null;
  message: string;
}

export interface BugReportClientError {
  occurredAt: string;
  name: string;
  message: string;
  stack: string | null;
}

export interface BugReportContext {
  capturedAt: string;
  path: string;
  query: Record<string, string>;
  pageTitle: string;
  overlays: string[];
  themeMode: 'light' | 'dark' | 'unknown';
  viewport: { width: number; height: number; devicePixelRatio: number };
  userAgent: string;
  online: boolean;
  timeZone: string;
  webCommit: string | null;
  apiCommit: string | null;
  apiDeployedAt: string | null;
  recentApiFailures: BugReportApiFailure[];
  recentClientErrors: BugReportClientError[];
  errorBoundary?: BugReportClientError | null;
}

export interface CreateBugReportAttachmentRequest {
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  dataBase64: string;
}

export interface CreateBugReportRequest {
  requestType?: BugReportRequestType;
  description: string;
  context: BugReportContext;
  featureRequest?: FeatureRequestContext | null;
  attachments?: CreateBugReportAttachmentRequest[];
  /** Advisory recommendation that the reporter explicitly accepted or overrode. */
  classificationJobId?: string | null;
  /** Optional, reporter-owned guided intake; the reporter's final form remains authoritative. */
  conversationSessionId?: string | null;
}

export const REQUEST_CLASSIFICATION_JOB_STATUSES = ['PENDING', 'LEASED', 'COMPLETED', 'FAILED', 'EXPIRED'] as const;
export type RequestClassificationJobStatus = (typeof REQUEST_CLASSIFICATION_JOB_STATUSES)[number];

export interface RequestClassificationRecommendation {
  requestType: BugReportRequestType;
  confidence: number;
  rationale: string;
  clarificationQuestion: string | null;
}

export interface CreateRequestClassificationJobRequest {
  description: string;
  context: Pick<BugReportContext, 'path' | 'pageTitle' | 'online'>;
  attachments?: CreateBugReportAttachmentRequest[];
}

export interface RequestClassificationJob {
  id: string;
  status: RequestClassificationJobStatus;
  recommendation: RequestClassificationRecommendation | null;
  fallbackReason: string | null;
  expiresAt: string;
  updatedAt: string;
}

export interface RequestClassificationWorkerJob {
  id: string;
  description: string;
  context: Pick<BugReportContext, 'path' | 'pageTitle'>;
  attachments: Array<{ id: number; fileName: string; mimeType: string; sizeBytes: number }>;
  attemptCount: number;
  leaseToken: string;
  leaseExpiresAt: string;
}

export type RequestClassificationWorkerResult = RequestClassificationRecommendation;

export type CreateRequestClassificationJobResponse = ActionResponse<RequestClassificationJob>;

export const REQUEST_CONVERSATION_STATUSES = [
  'PENDING',
  'LEASED',
  'WAITING_REPORTER',
  'READY',
  'FAILED',
  'EXPIRED',
] as const;
export type RequestConversationStatus = (typeof REQUEST_CONVERSATION_STATUSES)[number];

export interface RequestConversationSummary {
  requestType: BugReportRequestType;
  whereItHappened: string | null;
  userAction: string | null;
  observedResult: string | null;
  expectedResult: string | null;
  impact: string | null;
  userOrAudience: string | null;
  problem: string | null;
  desiredOutcome: string | null;
  currentWorkaround: string | null;
  priorityOrImpact: string | null;
  constraints: string | null;
}

export interface RequestConversationMessage {
  id: string;
  role: 'REPORTER' | 'ASSISTANT';
  body: string;
  createdAt: string;
}

export interface CreateRequestConversationRequest {
  description: string;
  preferredRequestType?: BugReportRequestType | null;
  context: Pick<BugReportContext, 'path' | 'pageTitle'>;
  attachmentCount?: number;
}

export interface ReplyRequestConversationRequest {
  message: string;
}

export interface RequestConversation {
  id: string;
  status: RequestConversationStatus;
  summary: RequestConversationSummary;
  messages: RequestConversationMessage[];
  nextQuestion: string | null;
  fallbackReason: string | null;
  expiresAt: string;
  updatedAt: string;
}

export interface RequestConversationWorkerJob {
  id: string;
  description: string;
  preferredRequestType: BugReportRequestType | null;
  context: Pick<BugReportContext, 'path' | 'pageTitle'>;
  attachmentCount: number;
  summary: RequestConversationSummary;
  messages: RequestConversationMessage[];
  leaseToken: string;
  attemptCount: number;
}

export interface RequestConversationWorkerResult {
  requestType: BugReportRequestType;
  summary: RequestConversationSummary;
  nextQuestion: string | null;
  readyToSubmit: boolean;
}

export const INBOX_FOLLOW_UP_JOB_STATUSES = ['PENDING', 'LEASED', 'COMPLETED', 'FAILED', 'EXPIRED'] as const;
export type InboxFollowUpAction = 'PROGRESS_REVIEWED' | 'ASK_REPORTER' | 'NO_OP';
export interface InboxFollowUpWorkerJob {
  id: string;
  ticketId: number;
  ticketKey: string;
  eventKind: 'CREATED' | 'REPORTER_COMMENT' | 'REPORTER_REOPENED';
  context: {
    requestType: BugReportRequestType;
    title: string;
    description: string;
    status: BugReportStatus;
    clarificationStatus: BugReportClarificationStatus;
    clarificationSummary: string | null;
    sourcePath: string;
    reporterMessages: string[];
  };
  leaseToken: string;
  attemptCount: number;
}
export interface InboxFollowUpWorkerResult {
  action: InboxFollowUpAction;
  note: string;
  question: string | null;
}

export type CreateRequestConversationResponse = ActionResponse<RequestConversation>;
export type ReplyRequestConversationResponse = ActionResponse<RequestConversation>;

export interface BugReportReporter {
  id: number;
  displayName: string;
  role: string;
  avatarUrl: string | null;
}

export interface BugReportTimeline {
  reportedAt: string;
  approvedAt: string | null;
  startedAt: string | null;
  fixedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
}

export interface BugReportResolution {
  problemSummary: string;
  rootCause: string;
  solutionSummary: string;
  verificationSummary: string;
  changedFiles: string[];
  commitSha: string | null;
  releaseUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BugReportAttachment {
  id: number;
  commentId: number | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface BugReportClarification {
  status: BugReportClarificationStatus;
  summary: string | null;
  clarifiedAt: string | null;
}

export interface BugReportAgentProgress {
  stage: BugReportAgentProgressStage;
  note: string | null;
  updatedAt: string;
}

/** Canonical handoff derived by the API from status, clarification and audit history. */
export interface BugReportNextAction {
  actor: BugReportNextActor;
  type: BugReportNextActionType;
  label: string;
  detail: string;
  waitingSince: string;
}

export interface BugReportComment {
  id: number;
  kind: BugReportCommentKind;
  body: string;
  authorType: 'STAFF' | 'AGENT';
  author: BugReportReporter | null;
  attachments: BugReportAttachment[];
  createdAt: string;
}

export interface BugReportAuditEntry {
  id: number;
  action: string;
  actor: BugReportReporter | null;
  note: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface BugReportSummary {
  id: number;
  key: string;
  requestType: BugReportRequestType;
  featureRequest: FeatureRequestContext | null;
  title: string;
  description: string;
  status: BugReportStatus;
  priority: BugPriority | null;
  sourcePath: string;
  overlay: string | null;
  attachmentCount: number;
  commentCount: number;
  clarification: BugReportClarification;
  agentProgress: BugReportAgentProgress;
  nextAction: BugReportNextAction;
  reporter: BugReportReporter;
  approvedAt: string | null;
  timeline: BugReportTimeline;
  createdAt: string;
  updatedAt: string;
}

export interface BugReportDetail extends BugReportSummary {
  businessContext: string | null;
  triageNote: string | null;
  duplicateOfId: number | null;
  duplicateOfKey: string | null;
  approvedBy: BugReportReporter | null;
  resolvedAt: string | null;
  closedAt: string | null;
  context: BugReportContext;
  resolution: BugReportResolution | null;
  attachments: BugReportAttachment[];
  comments: BugReportComment[];
  audits: BugReportAuditEntry[];
}

export interface MyBugReportItem extends BugReportSummary {
  resolution: BugReportResolution | null;
  comments: BugReportComment[];
  reviewUrl: string;
  canReview: boolean;
}

export interface BugReportNotification {
  id: number;
  reportId: number;
  reportKey: string;
  type: 'BUG_FIXED_REVIEW' | 'BUG_CLARIFICATION_NEEDED' | 'FEATURE_IMPLEMENTED_REVIEW' | 'FEATURE_CLARIFICATION_NEEDED';
  title: string;
  message: string;
  actionUrl: string;
  readAt: string | null;
  createdAt: string;
}

export interface MyBugReportsResponse {
  data: MyBugReportItem[];
  notifications: BugReportNotification[];
  unreadCount: number;
  /** Requests that still need a response or acceptance from the reporter. */
  actionRequiredCount: number;
}

export interface BugReportListQuery extends PageQuery {
  requestType?: BugReportRequestType | 'ALL';
  status?: BugReportStatus | 'ALL';
  priority?: BugPriority | 'ALL';
  clarification?: BugReportClarificationFilter;
  nextActor?: BugReportNextActor | 'ALL';
  search?: string;
}

export interface BugReportListSummary {
  bugCount: number;
  featureCount: number;
  newCount: number;
  /** Tickets whose clarification is complete and are waiting for Danny's final triage decision. */
  readyForDannyCount: number;
  approvedCount: number;
  inProgressCount: number;
  fixedCount: number;
  closedCount: number;
  unclearCount: number;
  pendingAgentCount: number;
  waitingReporterCount: number;
  openCount: number;
  reporterActionCount: number;
  reporterClarificationCount: number;
  reporterReviewCount: number;
  dannyActionCount: number;
  agentActionCount: number;
  agentClarificationCount: number;
  agentDeliveryCount: number;
}

export interface TriageBugReportRequest {
  status: BugReportStatus;
  priority?: BugPriority | null;
  businessContext?: string | null;
  note?: string | null;
  duplicateOfId?: number | null;
}

export interface ConfirmCloseBugReportRequest {
  businessContext?: string | null;
  note?: string | null;
}

export interface ReviewBugReportRequest {
  decision: 'APPROVE' | 'REOPEN';
  note?: string | null;
}

export interface CreateBugReportCommentRequest {
  body?: string | null;
  attachments?: CreateBugReportAttachmentRequest[];
}

export interface AgentReviewBugReportRequest {
  decision: 'ASK_REPORTER' | 'READY_FOR_TRIAGE';
  message: string;
  businessContext?: string | null;
}

export interface AgentUpdateBugProgressRequest {
  stage: BugReportAgentUpdateStage;
  note?: string | null;
}

export interface MarkBugReportNotificationsReadRequest {
  notificationIds?: number[];
}

export interface AgentMarkBugFixedRequest {
  problemSummary: string;
  rootCause: string;
  solutionSummary: string;
  verificationSummary: string;
  changedFiles?: string[];
  commitSha?: string | null;
  releaseUrl?: string | null;
}

export interface AgentBugKnowledgeItem extends BugReportResolution {
  key: string;
  title: string;
  sourcePath: string;
  fixedAt: string | null;
}

export interface BugReportCreateResult {
  id: number;
  key: string;
  attachmentWarnings: string[];
}

export interface BugReportCommentCreateResult {
  report: BugReportDetail;
  attachmentWarnings: string[];
}

export type CreateBugReportResponse = ActionResponse<BugReportCreateResult>;
export type TriageBugReportResponse = ActionResponse<BugReportDetail>;
export type ConfirmCloseBugReportResponse = ActionResponse<BugReportDetail>;
export type ReviewBugReportResponse = ActionResponse<BugReportDetail>;
export type CreateBugReportCommentResponse = ActionResponse<BugReportCommentCreateResult>;
export type AgentReviewBugReportResponse = ActionResponse<BugReportDetail>;
export type AgentUpdateBugProgressResponse = ActionResponse<BugReportDetail>;
export type MarkBugReportNotificationsReadResponse = ActionResponse<{ updatedCount: number }>;
export type AgentMarkBugFixedResponse = ActionResponse<BugReportDetail>;
export type BugReportListResponse = PageResponse<BugReportSummary, BugReportListSummary>;

export interface AgentBugQueueItem {
  id: number;
  key: string;
  requestType: BugReportRequestType;
  title: string;
  status: Extract<BugReportStatus, 'NEW' | 'APPROVED' | 'IN_PROGRESS' | 'FIXED'>;
  priority: BugPriority | null;
  workType: 'CLARIFY' | 'FIX';
  clarification: BugReportClarification;
  agentProgress: BugReportAgentProgress;
  nextAction: BugReportNextAction;
  sourcePath: string;
  timeline: BugReportTimeline;
  updatedAt: string;
}

export interface AgentBugAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AgentBugBundle {
  report: BugReportDetail;
  markdown: string;
  attachments: AgentBugAttachment[];
  similarResolutions: AgentBugKnowledgeItem[];
}

export function formatBugReportKey(id: number, requestType: BugReportRequestType = 'BUG'): string {
  const prefix = requestType === 'FEATURE' ? 'MOS-FEAT' : 'MOS-BUG';
  return `${prefix}-${Math.max(0, Math.trunc(id))}`;
}
