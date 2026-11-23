import type { ActionResponse } from '../api.js';
import type {
  BugReportClarificationStatus,
  BugReportContext,
  BugReportRequestType,
  BugReportStatus,
  CreateBugReportAttachmentRequest,
} from './ticket-core.js';

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

/**
 * The outbound Mac worker reports only operational metadata. It never sends
 * intake text, ticket IDs, attachment names, prompts, or model output here.
 */
export const REQUEST_CLASSIFIER_WORKER_CONNECTION_MODES = ['STARTING', 'WEBSOCKET', 'POLLING', 'RECONNECTING'] as const;
export type RequestClassifierWorkerConnectionMode = (typeof REQUEST_CLASSIFIER_WORKER_CONNECTION_MODES)[number];

/** Server-derived stream availability; this is the value shown in the Inbox. */
export const REQUEST_CLASSIFIER_WORKER_CONNECTION_STATES = [
  'CONNECTED',
  'POLLING',
  'RECONNECTING',
  'UNAVAILABLE',
] as const;
export type RequestClassifierWorkerConnectionState = (typeof REQUEST_CLASSIFIER_WORKER_CONNECTION_STATES)[number];

export const REQUEST_CLASSIFIER_WORKER_JOB_KINDS = [
  'CLASSIFICATION',
  'CONVERSATION',
  'INBOX_FOLLOW_UP',
  'INBOX_PLAN',
  'INBOX_IMPLEMENTATION',
] as const;
export type RequestClassifierWorkerJobKind = (typeof REQUEST_CLASSIFIER_WORKER_JOB_KINDS)[number];

export const REQUEST_CLASSIFIER_WORKER_OUTCOME_STATUSES = ['SUCCEEDED', 'FAILED'] as const;
export type RequestClassifierWorkerOutcomeStatus = (typeof REQUEST_CLASSIFIER_WORKER_OUTCOME_STATUSES)[number];

export const REQUEST_CLASSIFIER_WORKER_OUTCOME_SEVERITIES = ['INFO', 'WARNING', 'ERROR'] as const;
export type RequestClassifierWorkerOutcomeSeverity = (typeof REQUEST_CLASSIFIER_WORKER_OUTCOME_SEVERITIES)[number];

export const REQUEST_CLASSIFIER_WORKER_HEALTH_STATES = ['ONLINE', 'DEGRADED', 'OFFLINE'] as const;
export type RequestClassifierWorkerHealthState = (typeof REQUEST_CLASSIFIER_WORKER_HEALTH_STATES)[number];

/**
 * The first circuit-breaker rollout is deliberately informational. A worker
 * cannot safely checkpoint an arbitrary Codex CLI process, so this signal
 * never stops a job or changes a ticket by itself.
 */
export const REQUEST_CLASSIFIER_WORKER_CIRCUIT_BREAKER_STATES = ['NORMAL', 'WARNING', 'PAUSE_RECOMMENDED'] as const;
export type RequestClassifierWorkerCircuitBreakerState =
  (typeof REQUEST_CLASSIFIER_WORKER_CIRCUIT_BREAKER_STATES)[number];

export interface RequestClassifierWorkerHeartbeatRequest {
  workerId: string;
  workerVersion: string;
  sessionId: string;
  sequence: number;
  sentAt: string;
  connectionMode: RequestClassifierWorkerConnectionMode;
  activeJob: {
    kind: RequestClassifierWorkerJobKind;
    startedAt: string;
  } | null;
  latestOutcome: {
    kind: RequestClassifierWorkerJobKind | 'BRIDGE';
    status: RequestClassifierWorkerOutcomeStatus;
    severity: RequestClassifierWorkerOutcomeSeverity;
    code: string;
    occurredAt: string;
  } | null;
}

export interface RequestClassifierWorkerHealthThresholds {
  onlineWithinSeconds: number;
  offlineAfterSeconds: number;
  sustainedFailureCount: number;
  seriousFailureWindowSeconds: number;
}

export interface RequestClassifierWorkerHealthTransition {
  id: number | null;
  fromState: RequestClassifierWorkerHealthState | null;
  toState: RequestClassifierWorkerHealthState;
  reason: string;
  occurredAt: string;
}

export interface RequestClassifierWorkerHealth {
  workerId: string | null;
  workerVersion: string | null;
  state: RequestClassifierWorkerHealthState;
  stateReason: string;
  stateChangedAt: string | null;
  serverTime: string;
  lastHeartbeatAt: string | null;
  secondsSinceHeartbeat: number | null;
  connectionMode: RequestClassifierWorkerConnectionMode | null;
  connectionState: RequestClassifierWorkerConnectionState;
  activeJob: {
    kind: RequestClassifierWorkerJobKind;
    startedAt: string | null;
  } | null;
  latestOutcome: {
    kind: RequestClassifierWorkerJobKind | 'BRIDGE';
    status: RequestClassifierWorkerOutcomeStatus;
    severity: RequestClassifierWorkerOutcomeSeverity;
    code: string;
    occurredAt: string | null;
  } | null;
  lastCompletedAt: string | null;
  lastFailedAt: string | null;
  consecutiveFailureCount: number;
  circuitBreaker: {
    mode: 'ADVISORY';
    state: RequestClassifierWorkerCircuitBreakerState;
    activeJobKind: RequestClassifierWorkerJobKind | null;
    activeForSeconds: number | null;
    warningAfterSeconds: number | null;
    pauseAfterSeconds: number | null;
    reason: string;
  };
  latestTransition: RequestClassifierWorkerHealthTransition | null;
  thresholds: RequestClassifierWorkerHealthThresholds;
  workers?: InboxDualWorkersHealth;
}

export interface InboxWorkerStatusSummary {
  id: 'AG_WIN' | 'AG_MAC' | 'AG' | 'IDE';
  name: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  activeCodingCount?: number;
  maxCodingSlots?: number;
  activeTask: {
    ticketId: number;
    ticketKey: string;
    title?: string;
    phase: string;
    startedAt: string | null;
    lastProgressAt: string | null;
  } | null;
}

export interface InboxDualWorkersHealth {
  agWin?: InboxWorkerStatusSummary;
  agMac?: InboxWorkerStatusSummary;
  ag: InboxWorkerStatusSummary;
  codex: InboxWorkerStatusSummary;
}

export type RequestClassifierWorkerHealthResponse = { data: RequestClassifierWorkerHealth };

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

export type CreateRequestConversationResponse = ActionResponse<RequestConversation>;
export type ReplyRequestConversationResponse = ActionResponse<RequestConversation>;

export const INBOX_FOLLOW_UP_JOB_STATUSES = ['PENDING', 'LEASED', 'COMPLETED', 'FAILED', 'EXPIRED'] as const;
export type InboxFollowUpAction = 'PROGRESS_REVIEWED' | 'REANALYSIS_CONFIRMED' | 'ASK_REPORTER' | 'NO_OP';
/**
 * Bounded, lease-authorized metadata for original ticket evidence. The blob
 * remains in private report storage and is never represented by a URL here.
 */
export interface BugReportOriginalEvidenceRef {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
/** Immutable reporter evidence captured when a previously fixed ticket is reopened. */
export interface BugReportReopenContext {
  auditId: number;
  reason: string;
  reopenedAt: string;
  /** Whether the reporter says the prior symptom is unchanged or supplied new details. */
  intent?: 'UNCHANGED' | 'DETAILS';
  /** Original ticket images the leased Agent must inspect before re-analysis. */
  originalEvidence: BugReportOriginalEvidenceRef[];
  /**
   * Bounded facts mOS captured before the reopen. They are evidence, not a
   * substitute for a new reporter question; Agents must not ask for these
   * facts again.
   */
  knownContext?: {
    sourcePath: string;
    browser: string;
    viewport: { width: number; height: number; devicePixelRatio: number };
    themeMode: 'light' | 'dark' | 'unknown';
    priorResolution: {
      solutionSummary: string;
      verificationSummary: string;
    } | null;
  };
}
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
    /** Present only for REPORTER_REOPENED; never infer this from a later comment. */
    reopen: BugReportReopenContext | null;
  };
  leaseToken: string;
  attemptCount: number;
}
export interface InboxFollowUpWorkerResult {
  action: InboxFollowUpAction;
  note: string;
  question: string | null;
}

/** Durable, outbound-only planning work for a ticket that has passed clarification. */
export const INBOX_PLAN_JOB_STATUSES = ['PENDING', 'LEASED', 'COMPLETED', 'FAILED', 'EXPIRED'] as const;
export type InboxPlanJobStatus = (typeof INBOX_PLAN_JOB_STATUSES)[number];
export const INBOX_PLAN_EVENT_KINDS = [
  'CREATED',
  'REPORTER_COMMENT',
  'CLARITY_READY',
  'TRIAGE_UPDATED',
  'IMPLEMENTATION_APPROVAL',
  'REOPEN_REANALYZED',
] as const;
export type InboxPlanEventKind = (typeof INBOX_PLAN_EVENT_KINDS)[number];
export const INBOX_PLAN_ACTIONS = ['POST_PLAN', 'NO_OP', 'INSUFFICIENT_INFORMATION'] as const;
export type InboxPlanAction = (typeof INBOX_PLAN_ACTIONS)[number];

export interface InboxPlanDraft {
  evidence: string;
  expectedOutcome: string;
  scope: string;
  steps: string[];
  verification: string;
  risksAndRollback: string;
  approvalRequest: string;
}

export interface InboxPlanWorkerJob {
  id: string;
  ticketId: number;
  ticketKey: string;
  eventKind: InboxPlanEventKind;
  eventVersion: string;
  context: {
    requestType: BugReportRequestType;
    title: string;
    description: string;
    status: Extract<BugReportStatus, 'NEW' | 'APPROVED'>;
    clarificationSummary: string | null;
    businessContext: string | null;
    sourcePath: string;
    reporterMessages: string[];
    /** The reporter's immutable reason retained from the reopen event, when applicable. */
    reopen: BugReportReopenContext | null;
  };
  leaseToken: string;
  attemptCount: number;
}

export interface InboxPlanWorkerResult {
  action: InboxPlanAction;
  note: string;
  plan: InboxPlanDraft | null;
}
