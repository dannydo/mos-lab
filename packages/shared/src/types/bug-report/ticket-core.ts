import type { PageQuery } from '../api.js';
import type { InboxTicketExecutionTiming } from './execution-timing.js';
import type { BugReportImplementationState, BugReportPlanReviewCandidate } from './implementation-gates.js';
import type { BugReportReopenContext } from './worker-jobs.js';

export const BUG_REPORT_REQUEST_TYPES = ['BUG', 'FEATURE'] as const;
export type BugReportRequestType = (typeof BUG_REPORT_REQUEST_TYPES)[number];

export const FEATURE_REQUEST_AUDIENCES = ['SELF', 'TEAM', 'ALL_STAFF', 'CUSTOMER'] as const;
export type FeatureRequestAudience = (typeof FEATURE_REQUEST_AUDIENCES)[number];

export interface FeatureRequestContext {
  reason: string;
  audience: FeatureRequestAudience;
  desiredOutcome: string | null;
}

export const BUG_REPORT_EXPERT_IMPACT_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type BugReportExpertImpact = (typeof BUG_REPORT_EXPERT_IMPACT_LEVELS)[number];

/** Optional, structured detail for reporters who can reproduce or scope a request precisely. */
export interface BugReportExpertDetails {
  reproductionSteps: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  impact: BugReportExpertImpact | null;
  environment: string | null;
  workaround: string | null;
  relatedTicket: string | null;
}

export const BUG_REPORT_STATUSES = [
  'NEW',
  'APPROVED',
  'IN_PROGRESS',
  'FIXED',
  'CLOSED',
  'REJECTED',
  'DUPLICATE',
  'CANCELLED',
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
  'REOPENED_BY_DANNY',
  'REOPENED_BY_REPORTER',
  'READY_FOR_TRIAGE',
  /** A current plan exists, but Danny has not yet authorized code/test. */
  'AWAITING_DANNY_IMPLEMENTATION_APPROVAL',
  /** Danny has authorized a visible Codex IDE handoff; no background worker may execute it. */
  'AWAITING_IDE_HANDOFF',
  'QUEUED_FOR_FIX',
  'QUEUED_FOR_COMMIT',
  'QUEUED_FOR_DEPLOY',
  'IMPLEMENTING',
  'COMMITTING',
  'DEPLOYING',
  'VERIFYING',
  'AWAITING_DANNY_COMMIT_REVIEW',
  'AWAITING_DANNY_DEPLOY_APPROVAL',
  /** Production is live; the reporter who requested the work owns acceptance. */
  'AWAITING_REPORTER_ACCEPTANCE',
  'IMPLEMENTATION_FAILED',
  'AWAITING_REPORTER_REVIEW',
  'COMPLETED',
  'STOPPED',
] as const;
export type BugReportAgentProgressStage = (typeof BUG_REPORT_AGENT_PROGRESS_STAGES)[number];

export const BUG_REPORT_NEXT_ACTORS = ['REPORTER', 'DANNY', 'AGENT', 'SYSTEM', 'NONE'] as const;
export type BugReportNextActor = (typeof BUG_REPORT_NEXT_ACTORS)[number];

export const BUG_REPORT_NEXT_ACTION_TYPES = [
  'ANSWER_CLARIFICATION',
  'REVIEW_CLARIFICATION',
  'TRIAGE',
  'IMPLEMENT',
  'REVIEW_COMMIT',
  'REVIEW_DEPLOY',
  'RETRY_IMPLEMENTATION',
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

export const BUG_REPORT_MAX_ATTACHMENTS = 10;
export const BUG_REPORT_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const BUG_REPORT_Z_INDEX = {
  LAUNCHER: 12000,
  SURFACE_MODAL: 12010,
  WORKFLOW_MODAL: 12040,
  REJECTION_MODAL: 12050,
  SHARE_MODAL: 12060,
  PREVIEW: 12200,
} as const;

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
  /** Optional reporter-owned detail. It is never required to submit a request. */
  expertDetails?: BugReportExpertDetails | null;
  attachments?: CreateBugReportAttachmentRequest[];
  /** Advisory recommendation that the reporter explicitly accepted or overrode. */
  classificationJobId?: string | null;
  /** Optional, reporter-owned guided intake; the reporter's final form remains authoritative. */
  conversationSessionId?: string | null;
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

/** Canonical handoff derived by the API from status, clarification and audit history. */
export interface BugReportNextAction {
  actor: BugReportNextActor;
  type: BugReportNextActionType;
  label: string;
  detail: string;
  waitingSince: string;
}

/** Plain-language lifecycle states intended for the person who submitted a request. */
export const BUG_REPORT_REPORTER_STATES = [
  'RECEIVED',
  'REVIEWING',
  'IN_PROGRESS',
  'WAITING_REPORTER',
  'READY_FOR_REVIEW',
  'COMPLETED',
  'NOT_PROCEEDING',
] as const;
export type BugReportReporterState = (typeof BUG_REPORT_REPORTER_STATES)[number];

export interface BugReportReporterUpdate {
  label: string;
  occurredAt: string;
}

/**
 * Server-owned, non-technical view of a ticket for the person who reported it.
 * Internal plan, worker, commit and deployment details remain in the operator Inbox.
 */
export interface BugReportReporterExperience {
  state: BugReportReporterState;
  label: string;
  summary: string;
  nextAction: {
    label: string;
    detail: string;
  };
  updates: BugReportReporterUpdate[];
}

export interface BugReportComment {
  id: number;
  kind: BugReportCommentKind;
  body: string;
  authorType: 'STAFF' | 'AGENT';
  agentModel?: 'AG' | 'G2.5' | 'G2.0' | null;
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
  /** Server-owned, exact native plan eligible for a pre-code review decision. */
  planReview?: BugReportPlanReviewCandidate | null;
  id: number;
  key: string;
  requestType: BugReportRequestType;
  featureRequest: FeatureRequestContext | null;
  /** Optional structured details the reporter supplied for faster Agent analysis. */
  expertDetails: BugReportExpertDetails | null;
  title: string;
  description: string;
  status: BugReportStatus;
  priority: BugPriority | null;
  triageNote?: string | null;
  sourcePath: string;
  overlay: string | null;
  attachmentCount: number;
  commentCount: number;
  clarification: BugReportClarification;
  /** Latest reporter reopen evidence, shown so the current owner can act on the actual reason. */
  reopen: BugReportReopenContext | null;
  agentProgress: BugReportAgentProgress;
  /** The latest durable implementation job, when the ticket has entered code/test. */
  implementation: BugReportImplementationState | null;
  nextAction: BugReportNextAction;
  reporterExperience: BugReportReporterExperience;
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
  executionTiming?: InboxTicketExecutionTiming | null;
}

export interface MyBugReportItem extends BugReportSummary {
  resolution: BugReportResolution | null;
  /** Original image evidence supplied with the request, safe for the reporter's request view. */
  evidenceAttachments: BugReportAttachment[];
  comments: BugReportComment[];
  reviewUrl: string;
  canReview: boolean;
  /** The reporter can resume a reopen without retyping evidence mOS already has. */
  canReopenUnchanged: boolean;
  canCancel?: boolean;
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

export interface BugReportBadgeSummaryResponse {
  unreadCount: number;
  actionRequiredCount: number;
  readyForDannyCount: number;
  unreadNotifications: BugReportNotification[];
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
  /** The one durable implementation job the Mac worker is actively executing, independent of table filters. */
  liveWorker: BugReportLiveWorkerActivity | null;
}

/** Safe, server-derived context for the single live Inbox worker banner. */
export interface BugReportLiveWorkerActivity {
  ticketId: number;
  ticketKey: string;
  workerId: string | null;
  phase: string;
  startedAt: string | null;
  lastProgressAt: string | null;
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

/**
 * Checks whether a bug report / feature was deferred (Won't Do Now) rather than
 * conventionally rejected as an invalid bug.
 */
export function isDeferredBugReport(report?: { status?: string | null; triageNote?: string | null } | null): boolean {
  if (!report || report.status !== 'REJECTED') return false;
  const note = String(report.triageNote || '').toLowerCase();
  return note.includes('[tạm hoãn]') || note.includes('tạm hoãn') || note.includes("won't do");
}

/**
 * Resolves human-facing AI Agent display name to distinguish between Antigravity (AG)
 * and Gemini API models (G2.0, G2.5) as requested by Danny.
 */
export function getBugReportAgentDisplayName(
  comment?: { authorType?: string | null; body?: string | null; agentModel?: string | null } | null,
  options?: { reporterMode?: boolean }
): string {
  if (options?.reporterMode) return 'mOS';
  if (!comment || comment.authorType !== 'AGENT') return 'Nhân viên';

  if (comment.agentModel === 'AG' || comment.agentModel === 'ANTIGRAVITY') return 'AI Agent (AG)';
  if (comment.agentModel === 'G2.5' || comment.agentModel === 'GEMINI_2_5') return 'AI Agent (G2.5)';
  if (comment.agentModel === 'G2.0' || comment.agentModel === 'GEMINI_2_0') return 'AI Agent (G2.0)';

  const body = comment.body || '';
  if (/agent-model:\s*G2\.0|AI Agent \(G2\.0\)|gemini-2\.0/i.test(body)) {
    return 'AI Agent (G2.0)';
  }
  if (/agent-model:\s*G2\.5|AI Agent \(G2\.5\)|gemini-2\.5/i.test(body)) {
    return 'AI Agent (G2.5)';
  }
  if (/agent-model:\s*AG|AI Agent \(AG\)|Antigravity|ide-task-bridge/i.test(body)) {
    return 'AI Agent (AG)';
  }

  // Default for AG when no model specified
  return 'AI Agent (AG)';
}
