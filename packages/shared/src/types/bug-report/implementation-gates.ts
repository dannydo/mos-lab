import type { ActionResponse, PageResponse } from '../api.js';
import type { DeploymentLaneDecision } from '../deploy-lane.js';
import type {
  BugPriority,
  BugReportAgentUpdateStage,
  BugReportCommentCreateResult,
  BugReportCreateResult,
  BugReportDetail,
  BugReportListSummary,
  BugReportRequestType,
  BugReportStatus,
  BugReportSummary,
  CreateBugReportAttachmentRequest,
} from './ticket-core.js';

/** Durable implementation work starts only after a separate, explicit Danny approval. */
export const INBOX_IMPLEMENTATION_JOB_STATUSES = [
  'PENDING',
  'LEASED',
  'RUNNING',
  'AWAITING_COMMIT_REVIEW',
  'CHANGES_REQUESTED',
  'AWAITING_DEPLOY_REVIEW',
  'RELEASED',
  'FAILED',
  'STALE',
  'EXPIRED',
] as const;
export type InboxImplementationJobStatus = (typeof INBOX_IMPLEMENTATION_JOB_STATUSES)[number];

/** Code, tests, commits and releases belong to a visible IDE/AG task.
 * Win AG (`AG_WIN`) is the default worker, with `AUTO` overflow and `AG_MAC` secondary. */
export const INBOX_IMPLEMENTATION_EXECUTION_OWNERS = ['AG_WIN', 'AG_MAC', 'IDE', 'AG', 'AUTO'] as const;
export type InboxImplementationExecutionOwner = (typeof INBOX_IMPLEMENTATION_EXECUTION_OWNERS)[number];

export function isAgExecutionOwner(owner?: string | null): boolean {
  return owner === 'AG_WIN' || owner === 'AG_MAC' || owner === 'AG';
}

export function isSupportedImplementationOwner(owner?: string | null): boolean {
  return ['AG_WIN', 'AG_MAC', 'AG', 'IDE', 'AUTO'].includes(String(owner || ''));
}

export function classifyAgNodeFromProvisionerId(provisionerId?: string | null): 'AG_WIN' | 'AG_MAC' {
  return /\bwin\b|win-ag|windows/i.test(String(provisionerId || '')) ? 'AG_WIN' : 'AG_MAC';
}

export function getExecutionOwnerDisplayName(owner?: string | null): string {
  if (owner === 'AG_WIN') return 'Win AG';
  if (owner === 'AG_MAC') return 'Mac AG';
  if (owner === 'AG') return 'Antigravity';
  if (owner === 'IDE') return 'Codex IDE';
  return 'Win AG (Auto-overflow)';
}

/** Antigravity model tier selected by Danny when approving code/test execution. */
export const INBOX_IMPLEMENTATION_MODEL_TIERS = [
  'hydrogen',
  'orchestrator_neon',
  'orchestrator_carbon',
  'orchestrator_argon',
  'flash',
] as const;
export type InboxImplementationModelTier = (typeof INBOX_IMPLEMENTATION_MODEL_TIERS)[number];

/** Safe, durable IDE task locator rendered by Inbox; never includes the receipt nonce. */
export interface BugReportIdeHandoffState {
  reference: string;
  phase: string;
  taskId: string | null;
}

export interface BindInboxIdeTaskRequest {
  taskId: string;
}

export interface InboxIdeTaskRecentComment {
  id: number;
  authorName?: string | null;
  content: string;
  createdAt: string;
}

/** A bounded local-only request. It never contains a receipt nonce or task prompt. */
export interface InboxIdeTaskProvisioningRequest {
  jobId: string;
  requestId: string;
  reportId: number;
  ticketKey: string;
  title: string;
  branchName: string;
  sourceVersion: string;
  planVersion: string;
  modelTier?: InboxImplementationModelTier;
  recentComments?: InboxIdeTaskRecentComment[];
}

export interface CompleteInboxIdeTaskProvisioningRequest {
  requestId: string;
  taskId: string;
}

export interface DeferInboxIdeTaskProvisioningRequest {
  requestId: string;
  failureCode: string;
}

export interface InboxIdeTaskBridgeHandoff {
  /** Server-authoritative phase; the private nonce is valid only for this operation. */
  phase: 'IDE_HANDOFF_READY' | 'IDE_COMMIT_HANDOFF';
  reportId: number;
  jobId: string;
  sourceVersion: string;
  planVersion: string;
  receiptNonce: string;
  recentComments?: InboxIdeTaskRecentComment[];
}

/**
 * Safe, server-derived execution metadata for Inbox. It deliberately excludes
 * branch/worktree paths, prompts, source content and worker credentials.
 */
export interface BugReportImplementationState {
  /** Candidate identity for a version-bound review decision; no execution credentials. */
  reviewCandidate?: { jobId: string; sourceVersion: string; planVersion: string } | null;
  status: InboxImplementationJobStatus;
  executionOwner?: InboxImplementationExecutionOwner;
  modelTier?: InboxImplementationModelTier;
  /** Present only for an IDE-owned durable implementation job. */
  ideHandoff?: BugReportIdeHandoffState | null;
  phase: string;
  progressLabel: string | null;
  lastProgressAt: string | null;
  progressCount: number;
  checkpointCount: number;
  failureCode: string | null;
  /** Conservative deployment recommendation computed from the reviewable source diff. */
  deploymentLane?: DeploymentLaneDecision | null;
  /** The durable retry-chain position, exposed so the Inbox never guesses retry authority. */
  retrySequence: number;
  /** Server-authoritative: an ordinary clean retry is still within its bounded budget. */
  canRetryImplementation: boolean;
  /** Server-authoritative: a single recovery retry is allowed only for a known Worker failure. */
  canAuthorizeWorkerRecoveryRetry: boolean;
  /** Server-authoritative: one post-diagnostic retry is allowed only after a verified schema repair. */
  canAuthorizeSchemaRecoveryRetry: boolean;
  /** Server-authoritative: one final retry is allowed only after quality-gate infrastructure was repaired. */
  canAuthorizeQualityGateRecoveryRetry: boolean;
  /** Server-authoritative: one retry is allowed only after the recorded Next build lock was repaired. */
  canAuthorizeBuildLockRecoveryRetry: boolean;
  /** Safe, server-sanitized reason for the latest terminal implementation failure. */
  failure: BugReportImplementationFailure | null;
  hasRetainedDraft: boolean;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface InboxIdeHandoff {
  jobId: string;
  sourceVersion: string;
  planVersion: string;
  /** Receipt nonce is one-time and is never rendered by Inbox. */
  receiptNonce: string;
}

export interface RecordInboxIdeImplementationReceiptRequest {
  handoff: InboxIdeHandoff;
  result: InboxImplementationWorkerResult;
  changedFiles: string[];
  diffStat: string | null;
  baseCommit: string;
  patchHash: string;
}

/**
 * A receipt submitted only by the trusted IDE-task bridge. The task identity
 * comes from the authenticated URL, while the nonce comes from its private
 * handoff file; neither is accepted from the Inbox UI.
 */
export interface RecordInboxIdeTaskReceiptRequest {
  receipt: RecordInboxIdeImplementationReceiptRequest;
}

export type RecordInboxIdeTaskReceiptResponse = RecordInboxIdeImplementationReceiptResponse;

export type RecordInboxIdeImplementationReceiptResponse = ActionResponse<{
  reportId: number;
  outcome: 'RECORDED' | 'DUPLICATE';
}>;

/** A commit receipt can only consume the nonce issued after Danny's commit approval. */
export interface RecordInboxIdeCommitReceiptRequest {
  handoff: InboxIdeHandoff;
  commitSha: string;
}

export type RecordInboxIdeCommitReceiptResponse = ActionResponse<{
  reportId: number;
  outcome: 'RECORDED' | 'DUPLICATE';
}>;

export interface BugReportImplementationFailure {
  command: string | null;
  code: string | null;
  summary: string;
  occurredAt: string | null;
}

export interface InboxImplementationWorkerJob {
  id: string;
  ticketId: number;
  ticketKey: string;
  sourceVersion: string;
  planVersion: string;
  branchName: string;
  /** Present only for the server-authorized DEPLOY operation. */
  commitSha: string | null;
  /** Immutable digest from the native review record; required before a DEPLOY receipt can publish. */
  releaseManifestDigest: string | null;
  operation: 'CODE_TEST' | 'COMMIT' | 'DEPLOY';
  reviewedFiles: string[];
  retryOfJobId: string | null;
  context: {
    requestType: BugReportRequestType;
    title: string;
    description: string;
    priority: BugPriority;
    clarificationSummary: string | null;
    businessContext: string | null;
    sourcePath: string;
  };
  leaseToken: string;
  attemptCount: number;
}

/** Lease renewal is operational metadata only; the server remains the time authority. */
export interface RenewInboxImplementationLeaseRequest {
  leaseToken: string;
  workerId: string;
  processId: number;
}

export interface InboxImplementationTestResult {
  command: string;
  status: 'PASSED' | 'FAILED' | 'NOT_RUN' | 'SUPERSEDED';
  /** Expected for FAILED results; the server supplies a safe fallback when absent. */
  failureCode?: string | null;
  failureSummary?: string | null;
  /**
   * A narrow audit link for a corrected diagnostic measurement.  It never
   * applies to code, build, type, lint, or visual-QA failures.
   */
  supersededBy?: string | null;
}

export interface InboxImplementationWorkerResult {
  summary: string;
  tests: InboxImplementationTestResult[];
  risksAndRollback: string;
  releaseUrl?: string | null;
}

export interface TriageBugReportRequest {
  status: BugReportStatus;
  priority?: BugPriority | null;
  businessContext?: string | null;
  note?: string | null;
  duplicateOfId?: number | null;
}

/** A separate affirmative action; APPROVED triage alone is never implementation authority. */
export interface ApproveBugReportImplementationRequest {
  acknowledged: true;
  planReview?: BugReportPlanReviewCandidate;
  executionOwner?: InboxImplementationExecutionOwner;
  modelTier?: InboxImplementationModelTier;
}

export interface BugReportPlanReviewCandidate {
  planJobId: string;
  sourceVersion: string;
  planVersion: string;
}

export interface RequestBugReportPlanChangesRequest extends BugReportPlanReviewCandidate {
  acknowledged: true;
  reason: string;
}

/** Explicit Danny authorization for the retained review patch to be committed by the trusted Mac worker. */
export interface ApproveBugReportImplementationCommitRequest {
  acknowledged: true;
}

/** Explicit Danny authorization to merge and deploy the recorded implementation commit. */
export interface ApproveBugReportImplementationDeployRequest {
  acknowledged: true;
}

/** A separate, bounded Danny authorization to create one linked retry after a terminal failure. */
export interface RetryBugReportImplementationRequest {
  acknowledged: true;
}

/** A separately audited, one-time recovery retry after the Worker was remediated. */
export interface AuthorizeBugReportWorkerRecoveryRetryRequest {
  acknowledged: true;
}

/** A separately audited, one-time retry after a verified Codex response-schema repair. */
export interface AuthorizeBugReportSchemaRecoveryRetryRequest {
  acknowledged: true;
}

/** A separately audited, final retry after a verified quality-gate infrastructure repair. */
export interface AuthorizeBugReportQualityGateRecoveryRetryRequest {
  acknowledged: true;
}

/** Worker-only, sanitized proof that the private visual-QA harness can run again. */
export interface RecordInboxImplementationQualityGateSelfCheckRequest {
  selfCheck: 'PASSED';
  rootCause: 'SANDBOX_PORT_BINDING';
}

/** The worker receives identifiers only; ticket content remains server-side. */
export interface InboxImplementationQualityGateSelfCheckCandidate {
  id: string;
}

/** A separately audited, one-time retry after the recorded Next build lock was repaired. */
export interface AuthorizeBugReportBuildLockRecoveryRetryRequest {
  acknowledged: true;
}

/**
 * Records a separately approved production release. The reviewed commit must
 * be supplied explicitly and must match the production release marker.
 */
export interface ReleaseBugReportImplementationRequest {
  acknowledged: true;
  /** Omitted by the Inbox UI once the trusted worker has recorded the approved commit. */
  commitSha?: string;
  releaseUrl?: string | null;
}

/** Trusted worker-captured content, subsequently bound by native approval audits. */
export interface InboxReleaseManifest {
  version: 1;
  reportId: number;
  jobId: string;
  sourceVersion: string;
  planVersion: string;
  baseCommit: string;
  patchHash: string;
  changedFiles: string[];
  tests: InboxImplementationTestResult[];
  digest: string;
}

export interface InboxIdeReleaseToken {
  jobId: string;
  manifestDigest: string;
  commitSha: string;
  apiRelease: string;
  webRelease: string | null;
  approvalAuditIds: number[];
  releaseUrl?: string | null;
}

/**
 * Receipt published by the trusted IDE release publisher only after production
 * has started. The API independently rechecks every field before mutating a
 * ticket; this is not a deploy or acceptance command.
 */
export interface InboxIdeReleaseCheckpointMetadata {
  jobId: string;
  manifestDigest: string;
  commitSha: string;
  apiRelease: string;
  webRelease: string | null;
  releaseUrl?: string | null;
}

export interface InboxIdeReleasePreview {
  eligible: boolean;
  code: string | null;
  reason: string;
  token: InboxIdeReleaseToken | null;
}

export interface RecordInboxIdeReleaseRequest {
  acknowledged: true;
  token: InboxIdeReleaseToken | null;
}

/** Reject only this candidate. This does not approve another code/test execution. */
export interface RequestBugReportImplementationChangesRequest {
  acknowledged: true;
  jobId: string;
  sourceVersion: string;
  planVersion: string;
  reason: string;
}

/** The reporter's final decision after checking the deployed implementation. */
export interface ReviewBugReportImplementationAcceptanceRequest {
  decision: 'APPROVE' | 'REOPEN';
  note?: string | null;
}

export interface ApproveBugReportImplementationResult {
  /** Receipt returned immediately after the durable approval/job write. */
  reportId: number;
  implementationQueued: boolean;
  planRequested: boolean;
}

export interface ApproveBugReportImplementationCommitResult {
  reportId: number;
  commitQueued: boolean;
}

export interface ApproveBugReportImplementationDeployResult {
  reportId: number;
  deploymentQueued: boolean;
}

export interface ConfirmCloseBugReportRequest {
  businessContext?: string | null;
  note?: string | null;
}

export interface ReviewBugReportRequest {
  decision: 'APPROVE' | 'REOPEN';
  note?: string | null;
  /** One-tap reporter feedback: the defect remains as originally reported, or full detailed feedback. */
  reopenIntent?: 'UNCHANGED' | 'DETAILS';
  attachments?: CreateBugReportAttachmentRequest[];
}

export interface CancelBugReportRequest {
  reason?: string | null;
}

export interface CancelBugReportResponse {
  success: boolean;
  data: BugReportDetail;
  message: string;
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

export type CreateBugReportResponse = ActionResponse<BugReportCreateResult>;
export type TriageBugReportResponse = ActionResponse<BugReportDetail>;
export type ApproveBugReportImplementationResponse = ActionResponse<ApproveBugReportImplementationResult>;
export type ApproveBugReportImplementationCommitResponse = ActionResponse<ApproveBugReportImplementationCommitResult>;
export type ApproveBugReportImplementationDeployResponse = ActionResponse<ApproveBugReportImplementationDeployResult>;
export type RetryBugReportImplementationResponse = ActionResponse<ApproveBugReportImplementationResult>;
export type AuthorizeBugReportWorkerRecoveryRetryResponse = ActionResponse<ApproveBugReportImplementationResult>;
export type AuthorizeBugReportSchemaRecoveryRetryResponse = ActionResponse<ApproveBugReportImplementationResult>;
export type AuthorizeBugReportQualityGateRecoveryRetryResponse = ActionResponse<ApproveBugReportImplementationResult>;
export type AuthorizeBugReportBuildLockRecoveryRetryResponse = ActionResponse<ApproveBugReportImplementationResult>;
export type ReleaseBugReportImplementationResponse = ActionResponse<BugReportDetail>;
export type ReviewBugReportImplementationAcceptanceResponse = ActionResponse<BugReportDetail>;
export type ConfirmCloseBugReportResponse = ActionResponse<BugReportDetail>;
export type ReviewBugReportResponse = ActionResponse<BugReportDetail>;
export type CreateBugReportCommentResponse = ActionResponse<BugReportCommentCreateResult>;
export type AgentReviewBugReportResponse = ActionResponse<BugReportDetail>;
export type AgentUpdateBugProgressResponse = ActionResponse<BugReportDetail>;
export type MarkBugReportNotificationsReadResponse = ActionResponse<{ updatedCount: number }>;
export type AgentMarkBugFixedResponse = ActionResponse<BugReportDetail>;
export type BugReportListResponse = PageResponse<BugReportSummary, BugReportListSummary>;
