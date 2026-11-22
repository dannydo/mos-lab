import type { FastifyInstance } from 'fastify';
import type {
  AgentBugBundle,
  AgentBugQueueItem,
  AgentMarkBugFixedRequest,
  AgentReviewBugReportRequest,
  AgentUpdateBugProgressRequest,
  BugReportDetail,
  BugReportListQuery,
  BugReportListResponse,
  CancelBugReportRequest,
  ConfirmCloseBugReportRequest,
  CreateBugReportCommentRequest,
  CreateBugReportRequest,
  MarkBugReportNotificationsReadRequest,
  MyBugReportsResponse,
  ReviewBugReportRequest,
  TriageBugReportRequest,
} from '@mos-lab/shared';
import {
  BugReportError,
  bugReportClarificationWhere,
  bugReportNextActorWhere,
  normalizeBugReportExpertDetails,
  normalizeFeatureRequestContext,
  sanitizeBugReportContext,
  serialize,
} from './service/bug-report-filters.js';
import { bugReportAgentProgress } from './service/bug-report-progress.js';
import {
  assertAgentProgressUpdateAllowed,
  bugReportNextAction,
  bugReportReporterExperience,
  bugReportWorkflowProjection,
} from './service/bug-report-next-action.js';
import {
  assertBugReportTransition,
  bugReportCompletionPath,
  cleanReleaseUrl,
  isAgentReadableBugStatus,
  knowledgeTokens,
  normalizeAgentResolution,
  parseBugReportKey,
  stateSnapshot,
} from './service/bug-report-transitions.js';
import {
  addBugReportComment,
  cleanupExpiredBugReportAttachments,
  createBugReport,
  getBugReportAttachment,
  getBugReportAttachmentForUser,
  getBugReportDetail,
  listBugReports,
  listMyBugReports,
  markBugReportNotificationsRead,
} from './service/bug-report-crud.js';
import {
  cancelBugReport,
  confirmCloseBugReport,
  reviewBugReport,
  triageBugReport,
} from './service/bug-report-lifecycle.js';
import {
  getAgentBugBundle,
  listAgentBugQueue,
  markFixedByAgent,
  markInboxFollowUpReviewed,
  retryClarification,
  reviewClarificationByAgent,
  updateAgentProgress,
} from './service/bug-report-agent.js';

export {
  assertAgentProgressUpdateAllowed,
  assertBugReportTransition,
  bugReportAgentProgress,
  bugReportClarificationWhere,
  bugReportCompletionPath,
  BugReportError,
  bugReportNextAction,
  bugReportNextActorWhere,
  bugReportReporterExperience,
  bugReportWorkflowProjection,
  cleanReleaseUrl,
  isAgentReadableBugStatus,
  knowledgeTokens,
  normalizeAgentResolution,
  normalizeBugReportExpertDetails,
  normalizeFeatureRequestContext,
  parseBugReportKey,
  sanitizeBugReportContext,
  serialize,
  stateSnapshot,
};

export class BugReportService {
  static create(fastify: FastifyInstance, reporterStaffId: number, input: CreateBugReportRequest) {
    return createBugReport(fastify, reporterStaffId, input);
  }

  static list(fastify: FastifyInstance, query: BugReportListQuery): Promise<BugReportListResponse> {
    return listBugReports(fastify, query);
  }

  static detail(fastify: FastifyInstance, id: number): Promise<BugReportDetail> {
    return getBugReportDetail(fastify, id);
  }

  static mine(fastify: FastifyInstance, reporterStaffId: number): Promise<MyBugReportsResponse> {
    return listMyBugReports(fastify, reporterStaffId);
  }

  static addComment(
    fastify: FastifyInstance,
    actorStaffId: number,
    id: number,
    canOverride: boolean,
    input: CreateBugReportCommentRequest
  ) {
    return addBugReportComment(fastify, actorStaffId, id, canOverride, input);
  }

  static attachmentForUser(
    fastify: FastifyInstance,
    actorStaffId: number,
    reportId: number,
    attachmentId: number,
    canOverride: boolean
  ) {
    return getBugReportAttachmentForUser(fastify, actorStaffId, reportId, attachmentId, canOverride);
  }

  static markNotificationsRead(
    fastify: FastifyInstance,
    reporterStaffId: number,
    input: MarkBugReportNotificationsReadRequest
  ): Promise<number> {
    return markBugReportNotificationsRead(fastify, reporterStaffId, input);
  }

  static review(
    fastify: FastifyInstance,
    reporterStaffId: number,
    id: number,
    input: ReviewBugReportRequest
  ): Promise<BugReportDetail> {
    return reviewBugReport(fastify, reporterStaffId, id, input);
  }

  static cancel(
    fastify: FastifyInstance,
    actorStaffId: number,
    id: number,
    canOverride: boolean,
    input?: CancelBugReportRequest
  ): Promise<BugReportDetail> {
    return cancelBugReport(fastify, actorStaffId, id, canOverride, input);
  }

  static triage(fastify: FastifyInstance, actorStaffId: number, id: number, input: TriageBugReportRequest) {
    return triageBugReport(fastify, actorStaffId, id, input);
  }

  static confirmClose(fastify: FastifyInstance, actorStaffId: number, id: number, input: ConfirmCloseBugReportRequest) {
    return confirmCloseBugReport(fastify, actorStaffId, id, input);
  }

  static reviewClarificationByAgent(
    fastify: FastifyInstance,
    key: string,
    input: AgentReviewBugReportRequest
  ): Promise<BugReportDetail> {
    return reviewClarificationByAgent(fastify, key, input);
  }

  static markInboxFollowUpReviewed(fastify: FastifyInstance, key: string, note: string): Promise<boolean> {
    return markInboxFollowUpReviewed(fastify, key, note);
  }

  static retryClarification(fastify: FastifyInstance, id: number, actorStaffId: number): Promise<BugReportDetail> {
    return retryClarification(fastify, id, actorStaffId);
  }

  static updateAgentProgress(
    fastify: FastifyInstance,
    key: string,
    input: AgentUpdateBugProgressRequest,
    options: { dedupeSameStage?: boolean } = {}
  ): Promise<BugReportDetail> {
    return updateAgentProgress(fastify, key, input, options);
  }

  static markFixedByAgent(
    fastify: FastifyInstance,
    key: string,
    input: AgentMarkBugFixedRequest
  ): Promise<BugReportDetail> {
    return markFixedByAgent(fastify, key, input);
  }

  static attachment(fastify: FastifyInstance, reportId: number, attachmentId: number) {
    return getBugReportAttachment(fastify, reportId, attachmentId);
  }

  static agentQueue(fastify: FastifyInstance): Promise<AgentBugQueueItem[]> {
    return listAgentBugQueue(fastify);
  }

  static agentBundle(fastify: FastifyInstance, key: string): Promise<AgentBugBundle> {
    return getAgentBugBundle(fastify, key);
  }

  static cleanupExpiredAttachments(fastify: FastifyInstance, now = new Date()): Promise<number> {
    return cleanupExpiredBugReportAttachments(fastify, now);
  }
}

export function startBugReportCleanup(fastify: FastifyInstance) {
  const run = () =>
    BugReportService.cleanupExpiredAttachments(fastify).catch((error) =>
      fastify.log.warn({ error }, 'Bug report cleanup failed')
    );
  const initial = setTimeout(run, 30_000);
  initial.unref();
  const interval = setInterval(run, 24 * 60 * 60 * 1000);
  interval.unref();
}
