import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  formatBugReportKey,
  type InboxImplementationTestResult,
  type InboxImplementationWorkerJob,
  type InboxImplementationWorkerResult,
} from '@mos-lab/shared';
import { inboxImplementationSourceVersion } from './inbox-implementation-version.js';
import { InboxPlanService } from './inbox-plan.service.js';

const LEASE_MS = 12 * 60 * 1000;
const RETRY_LIMIT = 3;
const CLI_ARGUMENTS_RECOVERY_ATTEMPT = 'CLI_ARGUMENTS_RECOVERED';
const JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REVIEW_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const FAILURE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

const clean = (value: unknown, limit: number) =>
  Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31));
    })
    .join('')
    .trim()
    .slice(0, limit);

type GateSource = {
  id: number;
  requestType: string;
  title: string;
  description: string;
  status: string;
  priority: string | null;
  clarificationStatus: string;
  clarificationSummary: string | null;
  businessContext: string | null;
  sourcePath: string;
  implementationApprovedAt: Date | null;
  implementationApprovalSourceVersion: string | null;
  implementationActiveJobId: string | null;
  comments: Array<{ id: number; body: string }>;
  inboxPlanJobs: Array<{
    id: string;
    status: string;
    resultAction: string | null;
    sourceVersion: string | null;
    planVersion: string | null;
  }>;
};

type CurrentPlan = { id: string; sourceVersion: string; planVersion: string };

export class InboxImplementationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'INBOX_IMPLEMENTATION_ERROR'
  ) {
    super(message);
  }
}

export function isInboxImplementationBaseEligible(
  source: Pick<GateSource, 'status' | 'priority' | 'clarificationStatus'>
): boolean {
  return source.status === 'APPROVED' && source.clarificationStatus === 'READY' && Boolean(source.priority);
}

export function inboxImplementationCurrentPlan(source: GateSource, sourceVersion: string): CurrentPlan | null {
  const candidate = source.inboxPlanJobs.find(
    (job) =>
      job.status === 'COMPLETED' &&
      job.resultAction === 'POST_PLAN' &&
      job.sourceVersion === sourceVersion &&
      Boolean(job.planVersion)
  );
  return candidate?.planVersion ? { id: candidate.id, sourceVersion, planVersion: candidate.planVersion } : null;
}

export function isInboxImplementationEligible(source: GateSource): {
  sourceVersion: string;
  plan: CurrentPlan | null;
  approved: boolean;
  eligible: boolean;
} {
  const sourceVersion = inboxImplementationSourceVersion(source);
  const plan = inboxImplementationCurrentPlan(source, sourceVersion);
  const approved = Boolean(
    source.implementationApprovedAt && source.implementationApprovalSourceVersion === sourceVersion
  );
  return {
    sourceVersion,
    plan,
    approved,
    eligible: isInboxImplementationBaseEligible(source) && approved && Boolean(plan),
  };
}

/**
 * A retry of a job that already reached `start` keeps the ticket IN_PROGRESS.
 * It still requires the exact recorded approval and native plan, but must not
 * be mistaken for a new approval gate.
 */
export function isInboxImplementationExecutionEligible(source: GateSource): {
  sourceVersion: string;
  plan: CurrentPlan | null;
  approved: boolean;
  eligible: boolean;
} {
  const sourceVersion = inboxImplementationSourceVersion(source);
  const plan = inboxImplementationCurrentPlan(source, sourceVersion);
  const approved = Boolean(
    source.implementationApprovedAt && source.implementationApprovalSourceVersion === sourceVersion
  );
  return {
    sourceVersion,
    plan,
    approved,
    eligible:
      ['APPROVED', 'IN_PROGRESS'].includes(source.status) &&
      source.clarificationStatus === 'READY' &&
      Boolean(source.priority) &&
      approved &&
      Boolean(plan),
  };
}

function isCurrentExecution(source: GateSource, sourceVersion: string, planVersion: string): boolean {
  const gate = isInboxImplementationExecutionEligible(source);
  return gate.eligible && gate.sourceVersion === sourceVersion && gate.plan?.planVersion === planVersion;
}

function safeBranchName(ticketKey: string, id: string): string {
  return `codex/inbox/${ticketKey.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${id.slice(0, 8)}`.slice(0, 160);
}

function snapshot(source: GateSource) {
  return JSON.stringify({
    status: source.status,
    priority: source.priority,
    clarificationStatus: source.clarificationStatus,
    implementationApprovedAt: source.implementationApprovedAt,
    implementationApprovalSourceVersion: source.implementationApprovalSourceVersion,
    implementationActiveJobId: source.implementationActiveJobId,
  });
}

function implementationReportInclude() {
  return {
    comments: { where: { authorType: 'STAFF' }, orderBy: { createdAt: 'desc' as const }, take: 8 },
    inboxPlanJobs: { orderBy: { createdAt: 'desc' as const }, take: 12 },
  };
}

function normalizeTests(value: unknown): InboxImplementationTestResult[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 8)
    .map((entry) => {
      const item = entry && typeof entry === 'object' ? (entry as Partial<InboxImplementationTestResult>) : {};
      const command = redactCommand(item.command);
      const status = item.status;
      return command && ['PASSED', 'FAILED', 'NOT_RUN'].includes(status || '')
        ? { command, status: status as InboxImplementationTestResult['status'] }
        : null;
    })
    .filter((item): item is InboxImplementationTestResult => Boolean(item));
}

function redactCommand(value: unknown): string {
  const command = clean(value, 300);
  if (!command) return '';
  return command
    .replace(/\b(token|secret|password|authorization|api[_-]?key)\s*=\s*[^\s]+/gi, '$1=[redacted]')
    .replace(/([?&](?:token|secret|password|api[_-]?key)=)[^&\s]+/gi, '$1[redacted]');
}

export function normalizeInboxImplementationResult(value: unknown): InboxImplementationWorkerResult {
  const input = value && typeof value === 'object' ? (value as Partial<InboxImplementationWorkerResult>) : {};
  const summary = clean(input.summary, 1_200);
  const risksAndRollback = clean(input.risksAndRollback, 1_200);
  const tests = normalizeTests(input.tests);
  if (!summary || !risksAndRollback) {
    throw new InboxImplementationError('Kết quả implementation phải có tóm tắt và rủi ro/rollback.', 422);
  }
  return { summary, tests, risksAndRollback };
}

function safeFileList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => clean(item, 300))
        .filter(
          (item) =>
            item && !item.startsWith('/') && !item.includes('..') && !/(token|secret|password|api[_-]?key)/i.test(item)
        )
        .slice(0, 100)
    : [];
}

function safeDiffStat(value: unknown): string {
  return clean(value, 4_000)
    .split(/\r?\n/)
    .filter((line) => !/(token|secret|password|api[_-]?key)/i.test(line))
    .join('\n');
}

function safeWorktreePath(value: unknown): string {
  const path = clean(value, 500);
  if (!path || !path.startsWith('/') || path.includes('..')) {
    throw new InboxImplementationError('Đường dẫn worktree không hợp lệ.', 422, 'INVALID_WORKTREE');
  }
  return path;
}

function safeWorkerId(value: unknown): string {
  const workerId = clean(value, 100);
  if (!workerId) throw new InboxImplementationError('Worker ID không hợp lệ.');
  return workerId;
}

function clearGlobalPermit(fastify: FastifyInstance, jobId: string) {
  return fastify.prisma.crm.crmInboxImplementationWorkerLock.updateMany({
    where: { id: 1, activeJobId: jobId },
    data: { activeJobId: null },
  });
}

async function clearTicketActiveJob(fastify: FastifyInstance, reportId: number, jobId: string) {
  await fastify.prisma.crm.crmBugReport.updateMany({
    where: { id: reportId, implementationActiveJobId: jobId },
    data: { implementationActiveJobId: null },
  });
}

export class InboxImplementationService {
  /** Stores a distinct Danny approval. It never starts code by itself. */
  static async approve(fastify: FastifyInstance, reportId: number, actorStaffId: number) {
    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: implementationReportInclude(),
    });
    if (!report) throw new InboxImplementationError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
    if (!isInboxImplementationBaseEligible(report)) {
      throw new InboxImplementationError(
        'Ticket cần ở trạng thái Đã duyệt, có priority và đã đủ rõ trước khi duyệt triển khai.',
        409
      );
    }
    const sourceVersion = inboxImplementationSourceVersion(report);
    const now = new Date();
    await fastify.prisma.crm.$transaction(async (tx) => {
      const current = await tx.crmBugReport.update({
        where: { id: reportId },
        data: {
          implementationApprovedByStaffId: actorStaffId,
          implementationApprovedAt: now,
          implementationApprovalSourceVersion: sourceVersion,
        },
      });
      await tx.crmBugReportAudit.create({
        data: {
          reportId,
          actorStaffId,
          action: 'IMPLEMENTATION_APPROVED',
          note: 'Danny đã duyệt AI chỉ sửa code và chạy kiểm thử trong worktree riêng; commit, push và deploy vẫn cần duyệt riêng.',
          beforeJson: snapshot(report),
          afterJson: snapshot({
            ...report,
            ...current,
            comments: report.comments,
            inboxPlanJobs: report.inboxPlanJobs,
          }),
        },
      });
    });
    const queued = await this.enqueueApproved(fastify, reportId);
    const refreshed = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: implementationReportInclude(),
    });
    const planRequested = Boolean(refreshed && !inboxImplementationCurrentPlan(refreshed, sourceVersion));
    return { implementationQueued: queued, planRequested };
  }

  /** Called only by a ticket event (approval or new native plan), never a poller. */
  static async enqueueApproved(fastify: FastifyInstance, reportId: number): Promise<boolean> {
    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: implementationReportInclude(),
    });
    if (!report) return false;
    const gate = isInboxImplementationEligible(report);
    if (!gate.eligible || !gate.plan) return false;

    const activeId = report.implementationActiveJobId;
    if (activeId) {
      const active = await fastify.prisma.crm.crmInboxImplementationJob.findUnique({ where: { id: activeId } });
      if (active && ['PENDING', 'LEASED', 'RUNNING', 'AWAITING_COMMIT_REVIEW'].includes(active.status)) return false;
      if (active && active.sourceVersion === gate.sourceVersion && active.planVersion === gate.plan.planVersion) {
        if (active.status === 'FAILED') {
          await fastify.prisma.crm.crmInboxImplementationJob.update({
            where: { id: active.id },
            data: {
              status: 'PENDING',
              attemptCount: 0,
              failureCode: null,
              leaseToken: null,
              leasedBy: null,
              leaseExpiresAt: null,
            },
          });
          return true;
        }
        return false;
      }
      await clearTicketActiveJob(fastify, report.id, activeId);
    }

    const existing = await fastify.prisma.crm.crmInboxImplementationJob.findUnique({
      where: {
        reportId_sourceVersion_planVersion: {
          reportId,
          sourceVersion: gate.sourceVersion,
          planVersion: gate.plan.planVersion,
        },
      },
    });
    if (existing) {
      await fastify.prisma.crm.crmBugReport.updateMany({
        where: { id: reportId, implementationActiveJobId: null },
        data: { implementationActiveJobId: existing.id },
      });
      return false;
    }

    const id = randomUUID();
    const ticketKey = formatBugReportKey(report.id, report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG');
    try {
      await fastify.prisma.crm.crmInboxImplementationJob.create({
        data: {
          id,
          reportId,
          sourceVersion: gate.sourceVersion,
          planVersion: gate.plan.planVersion,
          branchName: safeBranchName(ticketKey, id),
          expiresAt: new Date(Date.now() + JOB_TTL_MS),
        },
      });
      const claimed = await fastify.prisma.crm.crmBugReport.updateMany({
        where: { id: reportId, implementationActiveJobId: null },
        data: { implementationActiveJobId: id },
      });
      if (claimed.count) return true;
      await fastify.prisma.crm.crmInboxImplementationJob.update({
        where: { id },
        data: { status: 'STALE', failureCode: 'ACTIVE_JOB_RACE' },
      });
      return false;
    } catch (error) {
      if (error && typeof error === 'object' && (error as { code?: string }).code === 'P2002') return false;
      throw error;
    }
  }

  /**
   * Durable outbox recovery for a previously recorded Danny approval. This is
   * invoked by the existing worker claim/fallback path only; it never approves
   * a ticket or starts code, and it is idempotent per source + event kind.
   */
  static async recoverApprovedPlanEvents(fastify: FastifyInstance): Promise<number> {
    const reports = await fastify.prisma.crm.crmBugReport.findMany({
      where: {
        status: 'APPROVED',
        priority: { not: null },
        clarificationStatus: 'READY',
        implementationApprovedAt: { not: null },
      },
      include: implementationReportInclude(),
      orderBy: { implementationApprovedAt: 'asc' },
      take: 20,
    });
    let queued = 0;
    for (const report of reports) {
      const sourceVersion = inboxImplementationSourceVersion(report);
      if (report.implementationApprovalSourceVersion !== sourceVersion) continue;
      if (inboxImplementationCurrentPlan(report, sourceVersion)) continue;
      if (await InboxPlanService.enqueue(fastify, report.id, 'IMPLEMENTATION_APPROVAL')) queued += 1;
    }
    return queued;
  }

  /**
   * Repair only a retryable job that was incorrectly marked stale after its
   * own `start` moved the report to IN_PROGRESS. This is an outbox recovery
   * for the exact existing source/plan/job; it neither records approval nor
   * creates a second worktree or job.
   */
  static async recoverInterruptedImplementationJobs(fastify: FastifyInstance): Promise<number> {
    const reports = await fastify.prisma.crm.crmBugReport.findMany({
      where: {
        status: 'IN_PROGRESS',
        priority: { not: null },
        clarificationStatus: 'READY',
        implementationApprovedAt: { not: null },
      },
      include: implementationReportInclude(),
      orderBy: { startedAt: 'asc' },
      take: 20,
    });
    let restored = 0;
    for (const report of reports) {
      const gate = isInboxImplementationExecutionEligible(report);
      if (!gate.eligible || !gate.plan) continue;
      const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
        where: {
          reportId: report.id,
          sourceVersion: gate.sourceVersion,
          planVersion: gate.plan.planVersion,
          OR: [
            {
              status: 'STALE',
              failureCode: 'STALE_APPROVAL_OR_PLAN',
              attemptCount: { lt: RETRY_LIMIT },
            },
            // One bounded repair for a worker that ran the pre-fix conflicting
            // CLI flags while the API was rolling forward. The marker lets
            // claim grant exactly one fourth invocation, never a retry loop.
            {
              status: 'FAILED',
              failureCode: 'CODEX_EXEC_EXIT_2',
              attemptCount: RETRY_LIMIT,
            },
          ],
        },
      });
      if (!job) continue;
      // Keep the original active-job pointer when it already names this exact
      // recoverable job. A different pointer is a hard stop: never replace a
      // possible concurrent execution.
      if (report.implementationActiveJobId && report.implementationActiveJobId !== job.id) continue;
      const recoveredCliArguments = job.status === 'FAILED';
      const recovered = await fastify.prisma.crm.$transaction(async (tx) => {
        const reset = await tx.crmInboxImplementationJob.updateMany({
          where: {
            id: job.id,
            status: job.status,
            failureCode: recoveredCliArguments ? 'CODEX_EXEC_EXIT_2' : 'STALE_APPROVAL_OR_PLAN',
          },
          data: {
            status: 'PENDING',
            failureCode: recoveredCliArguments ? CLI_ARGUMENTS_RECOVERY_ATTEMPT : null,
            leaseToken: null,
            leasedBy: null,
            leaseExpiresAt: null,
          },
        });
        if (!reset.count) return false;
        if (report.implementationActiveJobId === job.id) return true;
        const attached = await tx.crmBugReport.updateMany({
          where: { id: report.id, implementationActiveJobId: null },
          data: { implementationActiveJobId: job.id },
        });
        if (attached.count) return true;
        await tx.crmInboxImplementationJob.updateMany({
          where: { id: job.id, status: 'PENDING' },
          data: { status: 'STALE', failureCode: 'ACTIVE_JOB_RACE' },
        });
        return false;
      });
      if (recovered) restored += 1;
    }
    return restored;
  }

  static async claim(fastify: FastifyInstance, workerId: string): Promise<InboxImplementationWorkerJob | null> {
    const worker = safeWorkerId(workerId);
    const now = new Date();
    const expired = await fastify.prisma.crm.crmInboxImplementationJob.findMany({
      where: { status: { in: ['LEASED', 'RUNNING'] }, leaseExpiresAt: { lte: now }, expiresAt: { gt: now } },
      take: 20,
    });
    for (const job of expired) {
      await fastify.prisma.crm.crmInboxImplementationJob.updateMany({
        where: { id: job.id, status: { in: ['LEASED', 'RUNNING'] }, leaseExpiresAt: { lte: now } },
        data: {
          status: 'PENDING',
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
          failureCode: 'LEASE_EXPIRED',
        },
      });
      await clearGlobalPermit(fastify, job.id);
    }

    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: {
        status: 'PENDING',
        expiresAt: { gt: now },
        OR: [
          { attemptCount: { lt: RETRY_LIMIT } },
          { attemptCount: RETRY_LIMIT, failureCode: CLI_ARGUMENTS_RECOVERY_ATTEMPT },
        ],
      },
      include: { report: { include: implementationReportInclude() } },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return null;
    const gate = isInboxImplementationExecutionEligible(job.report);
    if (
      !gate.eligible ||
      !gate.plan ||
      job.report.implementationActiveJobId !== job.id ||
      job.sourceVersion !== gate.sourceVersion ||
      job.planVersion !== gate.plan.planVersion
    ) {
      await fastify.prisma.crm.crmInboxImplementationJob.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data: { status: 'STALE', failureCode: 'STALE_APPROVAL_OR_PLAN' },
      });
      await clearTicketActiveJob(fastify, job.reportId, job.id);
      return null;
    }

    await fastify.prisma.crm.crmInboxImplementationWorkerLock.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    const permit = await fastify.prisma.crm.crmInboxImplementationWorkerLock.updateMany({
      where: { id: 1, activeJobId: null },
      data: { activeJobId: job.id },
    });
    if (!permit.count) return null;
    const leaseToken = randomUUID();
    const leased = await fastify.prisma.crm.crmInboxImplementationJob.updateMany({
      where: { id: job.id, status: 'PENDING', updatedAt: job.updatedAt },
      data: {
        status: 'LEASED',
        attemptCount: { increment: 1 },
        leaseToken,
        leasedBy: worker,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      },
    });
    if (!leased.count) {
      await clearGlobalPermit(fastify, job.id);
      return null;
    }
    return {
      id: job.id,
      ticketId: job.report.id,
      ticketKey: formatBugReportKey(job.report.id, job.report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG'),
      sourceVersion: job.sourceVersion,
      planVersion: job.planVersion,
      branchName: job.branchName,
      context: {
        requestType: job.report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG',
        title: clean(job.report.title, 180),
        description: clean(job.report.description, 2_000),
        priority: job.report.priority as InboxImplementationWorkerJob['context']['priority'],
        clarificationSummary: job.report.clarificationSummary ? clean(job.report.clarificationSummary, 1_200) : null,
        businessContext: job.report.businessContext ? clean(job.report.businessContext, 2_000) : null,
        sourcePath: clean(job.report.sourcePath, 500),
      },
      leaseToken,
      attemptCount: job.attemptCount + 1,
    };
  }

  static async start(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    worktreePath: unknown
  ): Promise<boolean> {
    const path = safeWorktreePath(worktreePath);
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: { id, status: 'LEASED', leaseToken, leaseExpiresAt: { gt: new Date() } },
      include: { report: { include: implementationReportInclude() } },
    });
    if (!job) throw new InboxImplementationError('Lease implementation đã hết hạn.', 409, 'LEASE_EXPIRED');
    if (!isCurrentExecution(job.report, job.sourceVersion, job.planVersion)) {
      await fastify.prisma.crm.crmInboxImplementationJob.update({
        where: { id },
        data: {
          status: 'STALE',
          failureCode: 'STALE_BEFORE_START',
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
        },
      });
      await clearGlobalPermit(fastify, id);
      await clearTicketActiveJob(fastify, job.reportId, id);
      return false;
    }
    const now = new Date();
    await fastify.prisma.crm.$transaction(async (tx) => {
      const updated = await tx.crmBugReport.update({
        where: { id: job.reportId },
        data: {
          status: 'IN_PROGRESS',
          statusSort: 0,
          startedAt: job.report.startedAt ?? now,
          resolvedAt: null,
          closedAt: null,
        },
      });
      await tx.crmInboxImplementationJob.update({
        where: { id },
        data: {
          status: 'RUNNING',
          worktreePath: path,
          startedAt: now,
          leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        },
      });
      await tx.crmBugReportAudit.create({
        data: {
          reportId: job.reportId,
          action: 'AGENT_PROGRESS_IMPLEMENTING',
          note: 'Codex CLI đã thực sự bắt đầu trong worktree riêng; chỉ được sửa code và chạy kiểm thử.',
          beforeJson: snapshot(job.report),
          afterJson: snapshot({
            ...job.report,
            ...updated,
            comments: job.report.comments,
            inboxPlanJobs: job.report.inboxPlanJobs,
          }),
        },
      });
    });
    return true;
  }

  static async complete(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    raw: unknown,
    artifacts: { changedFiles?: unknown; diffStat?: unknown }
  ): Promise<void> {
    const result = normalizeInboxImplementationResult(raw);
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: { id, status: 'RUNNING', leaseToken, leaseExpiresAt: { gt: new Date() } },
      include: { report: { include: implementationReportInclude() } },
    });
    if (!job) throw new InboxImplementationError('Lease implementation đã hết hạn.', 409, 'LEASE_EXPIRED');
    if (!isCurrentExecution(job.report, job.sourceVersion, job.planVersion)) {
      await fastify.prisma.crm.crmInboxImplementationJob.update({
        where: { id },
        data: {
          status: 'STALE',
          failureCode: 'STALE_BEFORE_RESULT',
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
        },
      });
      await clearGlobalPermit(fastify, id);
      await clearTicketActiveJob(fastify, job.reportId, id);
      return;
    }
    const changedFiles = safeFileList(artifacts.changedFiles);
    const diffStat = safeDiffStat(artifacts.diffStat);
    const now = new Date();
    // Do not reflect ticket-owned text (including sourcePath) into the durable
    // review artifact.  File paths and bounded test commands below are the only
    // structured execution evidence retained for Danny's review.
    const safeSummary = 'Codex CLI completed approved code/test work in the isolated branch.';
    const safeRisks =
      'Review the isolated diff before any separate commit approval; discard the worktree to roll back this uncommitted patch.';
    const reviewBody = [
      '## Kết quả implementation — chờ Danny duyệt commit',
      '',
      `- Tóm tắt: ${safeSummary}`,
      `- Patch / job: ${job.id}`,
      `- Branch riêng: ${job.branchName}`,
      `- Worktree riêng: ${job.worktreePath || 'đã tạo bởi worker'}`,
      '',
      '### Tệp thay đổi',
      ...(changedFiles.length
        ? changedFiles.map((file) => `- ${file}`)
        : ['- Không có thay đổi source được ghi nhận.']),
      '',
      '### Kiểm thử',
      ...(result.tests.length
        ? result.tests.map((item) => `- ${item.status}: ${item.command}`)
        : ['- NOT_RUN: Chưa có lệnh test được báo cáo.']),
      '',
      '### Diff tóm tắt',
      diffStat || 'Không có diff stat được báo cáo.',
      '',
      '### Rủi ro / rollback',
      safeRisks,
      '',
      'Đã dừng tại checkpoint review. Worker không commit, push, merge, deploy, chạy migration hoặc thay đổi production.',
    ].join('\n');
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmInboxImplementationJob.update({
        where: { id },
        data: {
          status: 'AWAITING_COMMIT_REVIEW',
          summary: safeSummary,
          changedFilesJson: JSON.stringify(changedFiles),
          testsJson: JSON.stringify(result.tests),
          diffStat,
          risksAndRollback: safeRisks,
          failureCode: null,
          completedAt: now,
          retainUntil: new Date(now.getTime() + REVIEW_RETENTION_MS),
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
        },
      });
      const updated = await tx.crmBugReport.update({ where: { id: job.reportId }, data: { updatedAt: now } });
      await tx.crmBugReportComment.create({
        data: { reportId: job.reportId, authorType: 'AGENT', kind: 'COMMENT', body: reviewBody },
      });
      await tx.crmBugReportAudit.create({
        data: {
          reportId: job.reportId,
          action: 'AGENT_IMPLEMENTATION_REVIEW_READY',
          note: 'Code và kiểm thử đã hoàn tất trong worktree riêng; chờ Danny duyệt commit.',
          beforeJson: snapshot(job.report),
          afterJson: snapshot({
            ...job.report,
            ...updated,
            comments: job.report.comments,
            inboxPlanJobs: job.report.inboxPlanJobs,
          }),
        },
      });
    });
    await clearGlobalPermit(fastify, id);
  }

  static async fail(fastify: FastifyInstance, id: string, leaseToken: string, failureCode: unknown): Promise<void> {
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: { id, status: { in: ['LEASED', 'RUNNING'] }, leaseToken },
      include: { report: { include: implementationReportInclude() } },
    });
    if (!job) return;
    const code = clean(failureCode, 100) || 'IMPLEMENTATION_FAILED';
    const retry = job.attemptCount < RETRY_LIMIT;
    const now = new Date();
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmInboxImplementationJob.update({
        where: { id },
        data: retry
          ? { status: 'PENDING', failureCode: code, leaseToken: null, leasedBy: null, leaseExpiresAt: null }
          : {
              status: 'FAILED',
              failureCode: code,
              leaseToken: null,
              leasedBy: null,
              leaseExpiresAt: null,
              retainUntil: new Date(now.getTime() + FAILURE_RETENTION_MS),
            },
      });
      const updated = await tx.crmBugReport.update({ where: { id: job.reportId }, data: { updatedAt: now } });
      await tx.crmBugReportAudit.create({
        data: {
          reportId: job.reportId,
          action: retry ? 'AGENT_IMPLEMENTATION_RETRY_SCHEDULED' : 'AGENT_IMPLEMENTATION_FAILED',
          note: retry
            ? 'Implementation worker đã dừng an toàn; sẽ thử lại cùng worktree, không tạo patch trùng.'
            : 'Implementation worker đã dừng sau số lần thử an toàn; giữ worktree để Danny rà soát.',
          beforeJson: snapshot(job.report),
          afterJson: snapshot({
            ...job.report,
            ...updated,
            comments: job.report.comments,
            inboxPlanJobs: job.report.inboxPlanJobs,
          }),
        },
      });
    });
    await clearGlobalPermit(fastify, id);
  }
}
