import type { ActionResponse, PageQuery, PageResponse } from './api.js';

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
  'READY_FOR_TRIAGE',
  'QUEUED_FOR_FIX',
  'IMPLEMENTING',
  'VERIFYING',
  'AWAITING_REPORTER_REVIEW',
  'COMPLETED',
  'STOPPED',
] as const;
export type BugReportAgentProgressStage = (typeof BUG_REPORT_AGENT_PROGRESS_STAGES)[number];

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
  description: string;
  context: BugReportContext;
  attachments?: CreateBugReportAttachmentRequest[];
}

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
  type: 'BUG_FIXED_REVIEW' | 'BUG_CLARIFICATION_NEEDED';
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
}

export interface BugReportListQuery extends PageQuery {
  status?: BugReportStatus | 'ALL';
  priority?: BugPriority | 'ALL';
  clarification?: BugReportClarificationFilter;
  search?: string;
}

export interface BugReportListSummary {
  newCount: number;
  approvedCount: number;
  inProgressCount: number;
  fixedCount: number;
  closedCount: number;
  unclearCount: number;
  pendingAgentCount: number;
  waitingReporterCount: number;
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
  title: string;
  status: Extract<BugReportStatus, 'NEW' | 'APPROVED' | 'IN_PROGRESS' | 'FIXED'>;
  priority: BugPriority | null;
  workType: 'CLARIFY' | 'FIX';
  clarification: BugReportClarification;
  agentProgress: BugReportAgentProgress;
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

export function formatBugReportKey(id: number): string {
  return `MOS-BUG-${Math.max(0, Math.trunc(id))}`;
}
