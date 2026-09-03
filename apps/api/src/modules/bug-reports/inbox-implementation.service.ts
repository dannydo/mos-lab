import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import {
  formatBugReportKey,
  type InboxImplementationTestResult,
  type InboxImplementationWorkerJob,
  type InboxImplementationWorkerResult,
  type ReleaseBugReportImplementationRequest,
  type ReviewBugReportImplementationAcceptanceRequest,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { inboxImplementationSourceVersion } from './inbox-implementation-version.js';
import { InboxPlanService } from './inbox-plan.service.js';

const LEASE_MS = 12 * 60 * 1000;
const RETRY_LIMIT = 3;
const CLI_ARGUMENTS_RECOVERY_ATTEMPT = 'CLI_ARGUMENTS_RECOVERED';
const CLI_PROCESS_RECOVERY_ATTEMPT = 'CLI_PROCESS_RECOVERED';
const JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REVIEW_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const FAILURE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const IMPLEMENTATION_CHECKPOINT_LIMIT = 1;
// A separate, explicit Danny action is required for every retry. The cap keeps
// terminal failures reviewable without turning the worker into an auto-loop.
const MAX_DANNY_RETRY_SEQUENCE = 2;
const execFileAsync = promisify(execFile);

const IMPLEMENTATION_PROGRESS_LABELS = {
  CODEX_STARTED: 'Codex đang phân tích và triển khai trong worktree riêng.',
  CODEX_EVENT: 'Codex đang tiếp tục xử lý code/test.',
  FILES_CHANGED: 'Đã có thay đổi mã nguồn trong worktree; Codex đang tiếp tục.',
  NO_PROGRESS_WARNING: 'Chưa có bằng chứng tiến triển mới trong 10 phút.',
  CHECKPOINT_CONTINUING: 'Đã lưu checkpoint an toàn; Codex tiếp tục chặng kế tiếp.',
} as const;

type ImplementationProgressPhase = keyof typeof IMPLEMENTATION_PROGRESS_LABELS;

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
  triageNote: string | null;
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

function implementationProgressPhase(value: unknown): ImplementationProgressPhase {
  const phase = clean(value, 32) as ImplementationProgressPhase;
  if (!(phase in IMPLEMENTATION_PROGRESS_LABELS)) {
    throw new InboxImplementationError('Pha tiến triển implementation không hợp lệ.', 422, 'INVALID_PROGRESS_PHASE');
  }
  return phase;
}

export function isInboxImplementationBaseEligible(
  source: Pick<GateSource, 'status' | 'priority' | 'clarificationStatus'>
): boolean {
  return source.status === 'APPROVED' && source.clarificationStatus === 'READY' && Boolean(source.priority);
}

export function inboxImplementationCurrentPlan(source: GateSource, sourceVersion: string): CurrentPlan | null {
  // A priority controls queue order, not the code/test scope. Reuse the native
  // plan created while the requirement was clarified, rather than making a
  // duplicate plan after Danny assigns a priority.
  const priorityNeutralSourceVersion = inboxImplementationSourceVersion({ ...source, priority: null });
  const candidate = source.inboxPlanJobs.find(
    (job) =>
      job.status === 'COMPLETED' &&
      job.resultAction === 'POST_PLAN' &&
      (job.sourceVersion === sourceVersion || job.sourceVersion === priorityNeutralSourceVersion) &&
      Boolean(job.planVersion)
  );
  return candidate?.planVersion && candidate.sourceVersion
    ? { id: candidate.id, sourceVersion: candidate.sourceVersion, planVersion: candidate.planVersion }
    : null;
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

function safeJsonValue(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function releaseCommitSha(): string {
  const commitSha = clean(process.env.DEPLOY_COMMIT, 64);
  if (!/^[a-f0-9]{7,64}$/i.test(commitSha)) {
    throw new InboxImplementationError(
      'Production chưa có release marker hợp lệ để bàn giao ticket nghiệm thu.',
      503,
      'RELEASE_MARKER_UNAVAILABLE'
    );
  }
  return commitSha;
}

/** A release marker proves the version currently live, not a ticket by itself. */
async function verifiedReleasedCommit(
  input: ReleaseBugReportImplementationRequest
): Promise<{ reviewedCommitSha: string; deployedCommitSha: string }> {
  const reviewedCommitSha = clean(input?.commitSha, 64);
  if (!/^[a-f0-9]{7,64}$/i.test(reviewedCommitSha)) {
    throw new InboxImplementationError(
      'Cần nhập commit đã được duyệt trước khi xác nhận deploy.',
      422,
      'REVIEWED_COMMIT_REQUIRED'
    );
  }
  const deployedCommitSha = releaseCommitSha();
  if (deployedCommitSha.startsWith(reviewedCommitSha) || reviewedCommitSha.startsWith(deployedCommitSha)) {
    return { reviewedCommitSha, deployedCommitSha };
  }
  try {
    await execFileAsync('git', ['merge-base', '--is-ancestor', reviewedCommitSha, deployedCommitSha], {
      cwd: process.cwd(),
      timeout: 5_000,
    });
  } catch {
    throw new InboxImplementationError(
      'Commit đã duyệt chưa khớp release đang chạy trên production. Hãy deploy đúng commit đó trước.',
      409,
      'RELEASE_COMMIT_MISMATCH'
    );
  }
  return { reviewedCommitSha, deployedCommitSha };
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

function safeProcessId(value: unknown): number {
  const processId = Number(value);
  if (!Number.isSafeInteger(processId) || processId <= 0 || processId > 4_294_967_295) {
    throw new InboxImplementationError('PID Codex không hợp lệ.', 422, 'INVALID_PROCESS_ID');
  }
  return processId;
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
      if (
        active &&
        ['PENDING', 'LEASED', 'RUNNING', 'AWAITING_COMMIT_REVIEW', 'AWAITING_DEPLOY_REVIEW'].includes(active.status)
      )
        return false;
      if (active && active.sourceVersion === gate.sourceVersion && active.planVersion === gate.plan.planVersion)
        return false;
      await clearTicketActiveJob(fastify, report.id, activeId);
    }

    const existing = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: {
        reportId,
        sourceVersion: gate.sourceVersion,
        planVersion: gate.plan.planVersion,
      },
      orderBy: { retrySequence: 'desc' },
    });
    if (existing) {
      await fastify.prisma.crm.crmBugReport.updateMany({
        where: { id: reportId, implementationActiveJobId: null },
        data: { implementationActiveJobId: existing.id },
      });
      return false;
    }

    const planVersion = gate.plan.planVersion;
    const id = randomUUID();
    const ticketKey = formatBugReportKey(report.id, report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG');
    try {
      await fastify.prisma.crm.crmInboxImplementationJob.create({
        data: {
          id,
          reportId,
          sourceVersion: gate.sourceVersion,
          planVersion,
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
   * Danny's explicit retry authority creates a new, linked execution record.
   * Terminal evidence remains immutable; only the new row can ever be leased.
   */
  static async retryFailed(fastify: FastifyInstance, reportId: number, actorStaffId: number): Promise<boolean> {
    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: implementationReportInclude(),
    });
    if (!report) throw new InboxImplementationError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
    const gate = isInboxImplementationExecutionEligible(report);
    if (!gate.eligible || !gate.plan || !report.implementationActiveJobId) {
      throw new InboxImplementationError(
        'Ticket không còn đủ điều kiện để retry implementation.',
        409,
        'RETRY_NOT_ELIGIBLE'
      );
    }
    const failed = await fastify.prisma.crm.crmInboxImplementationJob.findUnique({
      where: { id: report.implementationActiveJobId },
    });
    if (
      !failed ||
      failed.status !== 'FAILED' ||
      failed.sourceVersion !== gate.sourceVersion ||
      failed.planVersion !== gate.plan.planVersion
    ) {
      throw new InboxImplementationError(
        'Retry chỉ áp dụng cho job terminal đang khớp approval và plan.',
        409,
        'RETRY_NOT_ALLOWED'
      );
    }
    if (failed.retrySequence >= MAX_DANNY_RETRY_SEQUENCE) {
      throw new InboxImplementationError(
        'Ticket đã dùng hết hai retry có xác nhận riêng; cần rà soát scope hoặc worktree trước khi tạo authorization mới.',
        409,
        'RETRY_LIMIT_REACHED'
      );
    }

    const planVersion = gate.plan.planVersion;
    const id = randomUUID();
    const ticketKey = formatBugReportKey(report.id, report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG');
    const now = new Date();
    const queued = await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmInboxImplementationJob.create({
        data: {
          id,
          reportId,
          sourceVersion: gate.sourceVersion,
          planVersion,
          retryOfJobId: failed.id,
          retrySequence: failed.retrySequence + 1,
          branchName: safeBranchName(ticketKey, id),
          executionPhase: 'QUEUED',
          expiresAt: new Date(now.getTime() + JOB_TTL_MS),
        },
      });
      const attached = await tx.crmBugReport.updateMany({
        where: { id: reportId, implementationActiveJobId: failed.id },
        data: {
          status: 'APPROVED',
          statusSort: 0,
          startedAt: null,
          resolvedAt: null,
          closedAt: null,
          implementationActiveJobId: id,
          updatedAt: now,
        },
      });
      if (!attached.count) {
        await tx.crmInboxImplementationJob.update({
          where: { id },
          data: { status: 'STALE', failureCode: 'ACTIVE_JOB_RACE', executionPhase: 'STALE' },
        });
        return false;
      }
      await tx.crmBugReportAudit.create({
        data: {
          reportId,
          actorStaffId,
          action: 'AGENT_IMPLEMENTATION_RETRY_QUEUED',
          note: 'Danny đã xác nhận retry sạch; job mới liên kết job terminal cũ và vẫn dừng trước commit.',
          beforeJson: snapshot(report),
          afterJson: snapshot({
            ...report,
            status: 'APPROVED',
            implementationActiveJobId: id,
            comments: report.comments,
            inboxPlanJobs: report.inboxPlanJobs,
          }),
        },
      });
      return true;
    });
    return queued;
  }

  /**
   * Danny's commit approval reuses the exact retained review job.  It never
   * creates a fresh patch, stages arbitrary files, pushes, merges, or deploys.
   * The Mac worker receives a short-lived lease for one fixed commit operation.
   */
  static async approveCommit(fastify: FastifyInstance, reportId: number, actorStaffId: number): Promise<boolean> {
    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: implementationReportInclude(),
    });
    if (!report) throw new InboxImplementationError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
    const gate = isInboxImplementationExecutionEligible(report);
    if (!gate.eligible || !gate.plan || !report.implementationActiveJobId) {
      throw new InboxImplementationError(
        'Ticket không còn ở checkpoint duyệt commit hợp lệ.',
        409,
        'COMMIT_NOT_ELIGIBLE'
      );
    }
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: {
        id: report.implementationActiveJobId,
        reportId,
        status: 'AWAITING_COMMIT_REVIEW',
        sourceVersion: gate.sourceVersion,
        planVersion: gate.plan.planVersion,
      },
    });
    if (!job || !safeFileList(safeJsonValue(job.changedFilesJson)).length) {
      throw new InboxImplementationError(
        'Không có danh sách tệp review an toàn để commit. Hãy retry code/test thay vì commit mù.',
        409,
        'COMMIT_REVIEW_ARTIFACT_MISSING'
      );
    }
    const now = new Date();
    const queued = await fastify.prisma.crm.$transaction(async (tx) => {
      const updated = await tx.crmInboxImplementationJob.updateMany({
        where: { id: job.id, status: 'AWAITING_COMMIT_REVIEW', updatedAt: job.updatedAt },
        data: {
          status: 'PENDING',
          executionPhase: 'COMMIT_APPROVED',
          failureCode: null,
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
          processPid: null,
          updatedAt: now,
        },
      });
      if (!updated.count) return false;
      await tx.crmBugReportAudit.create({
        data: {
          reportId,
          actorStaffId,
          action: 'DANNY_COMMIT_APPROVED',
          note: 'Danny đã duyệt commit bản diff đã review. Worker Mac chỉ được stage các tệp đã ghi nhận, commit vào branch riêng, rồi dừng chờ deploy.',
          beforeJson: snapshot(report),
          afterJson: snapshot({ ...report, comments: report.comments, inboxPlanJobs: report.inboxPlanJobs }),
        },
      });
      return true;
    });
    return queued;
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
          id: report.implementationActiveJobId || undefined,
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
            // A process that exited without a lifecycle notification can leave
            // a RUNNING lease to expire. Once the worker gains close-event
            // handling, allow exactly one marked recovery of that same job.
            {
              status: 'PENDING',
              failureCode: 'LEASE_EXPIRED',
              attemptCount: RETRY_LIMIT + 1,
            },
            // The one process-lifecycle recovery was already consumed and its
            // replacement lease expired. Keep this exact job visible as a
            // terminal failure instead of leaving the ticket indefinitely
            // IN_PROGRESS with an unclaimable PENDING row.
            {
              status: 'PENDING',
              failureCode: 'LEASE_EXPIRED',
              attemptCount: { gte: RETRY_LIMIT + 2 },
            },
          ],
        },
      });
      if (!job) continue;
      // Keep the original active-job pointer when it already names this exact
      // recoverable job. A different pointer is a hard stop: never replace a
      // possible concurrent execution.
      if (report.implementationActiveJobId && report.implementationActiveJobId !== job.id) continue;
      const exhaustedLeaseRecovery =
        job.status === 'PENDING' && job.failureCode === 'LEASE_EXPIRED' && job.attemptCount >= RETRY_LIMIT + 2;
      if (exhaustedLeaseRecovery) {
        const now = new Date();
        const failed = await fastify.prisma.crm.$transaction(async (tx) => {
          const terminalized = await tx.crmInboxImplementationJob.updateMany({
            where: {
              id: job.id,
              status: 'PENDING',
              failureCode: 'LEASE_EXPIRED',
              attemptCount: { gte: RETRY_LIMIT + 2 },
            },
            data: {
              status: 'FAILED',
              failureCode: 'LEASE_EXPIRED',
              leaseToken: null,
              leasedBy: null,
              leaseExpiresAt: null,
              processPid: null,
              executionPhase: 'FAILED',
              completedAt: now,
              retainUntil: new Date(now.getTime() + FAILURE_RETENTION_MS),
            },
          });
          if (!terminalized.count) return false;
          const updated = await tx.crmBugReport.update({
            where: { id: report.id },
            data: { status: 'APPROVED', statusSort: 0, updatedAt: now },
          });
          await tx.crmBugReportAudit.create({
            data: {
              reportId: report.id,
              action: 'AGENT_IMPLEMENTATION_FAILED',
              note: 'Implementation worker đã dừng sau số lần thử an toàn; giữ worktree để Danny rà soát.',
              beforeJson: snapshot(report),
              afterJson: snapshot({
                ...report,
                ...updated,
                comments: report.comments,
                inboxPlanJobs: report.inboxPlanJobs,
              }),
            },
          });
          return true;
        });
        if (failed) {
          await clearGlobalPermit(fastify, job.id);
          restored += 1;
        }
        continue;
      }
      const recoveryKind =
        job.status === 'FAILED' ? 'CLI_ARGUMENTS' : job.failureCode === 'LEASE_EXPIRED' ? 'CLI_PROCESS' : 'STALE';
      const recovered = await fastify.prisma.crm.$transaction(async (tx) => {
        const reset = await tx.crmInboxImplementationJob.updateMany({
          where: {
            id: job.id,
            status: job.status,
            failureCode:
              recoveryKind === 'CLI_ARGUMENTS'
                ? 'CODEX_EXEC_EXIT_2'
                : recoveryKind === 'CLI_PROCESS'
                  ? 'LEASE_EXPIRED'
                  : 'STALE_APPROVAL_OR_PLAN',
          },
          data: {
            status: 'PENDING',
            failureCode:
              recoveryKind === 'CLI_ARGUMENTS'
                ? CLI_ARGUMENTS_RECOVERY_ATTEMPT
                : recoveryKind === 'CLI_PROCESS'
                  ? CLI_PROCESS_RECOVERY_ATTEMPT
                  : null,
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
      const expiredLease = await fastify.prisma.crm.crmInboxImplementationJob.updateMany({
        where: { id: job.id, status: { in: ['LEASED', 'RUNNING'] }, leaseExpiresAt: { lte: now } },
        data: {
          status: 'FAILED',
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
          processPid: null,
          executionPhase: 'FAILED',
          failureCode: 'LEASE_EXPIRED',
          retainUntil: new Date(now.getTime() + FAILURE_RETENTION_MS),
        },
      });
      if (!expiredLease.count) continue;
      await fastify.prisma.crm.crmBugReport.updateMany({
        where: { id: job.reportId, implementationActiveJobId: job.id, status: 'IN_PROGRESS' },
        data: { status: 'APPROVED', statusSort: 0 },
      });
      await fastify.prisma.crm.crmBugReportAudit.create({
        data: {
          reportId: job.reportId,
          action: 'AGENT_IMPLEMENTATION_FAILED',
          note: 'Lease implementation đã hết hạn; worker dừng an toàn, giữ worktree và chờ Danny quyết định retry liên kết.',
          beforeJson: '{}',
          afterJson: '{}',
        },
      });
      await clearGlobalPermit(fastify, job.id);
    }

    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: {
        status: 'PENDING',
        expiresAt: { gt: now },
        OR: [
          { attemptCount: { lt: 1 } },
          {
            retryOfJobId: null,
            attemptCount: RETRY_LIMIT,
            failureCode: CLI_ARGUMENTS_RECOVERY_ATTEMPT,
          },
          {
            retryOfJobId: null,
            attemptCount: RETRY_LIMIT + 1,
            failureCode: CLI_PROCESS_RECOVERY_ATTEMPT,
          },
        ],
      },
      include: { report: { include: implementationReportInclude() } },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return null;
    const gate = isInboxImplementationExecutionEligible(job.report);
    const commitOperation = job.executionPhase === 'COMMIT_APPROVED';
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
    const reviewedFiles = safeFileList(safeJsonValue(job.changedFilesJson));
    if (commitOperation && (!reviewedFiles.length || !job.worktreePath)) {
      await fastify.prisma.crm.crmInboxImplementationJob.updateMany({
        where: { id: job.id, status: 'PENDING', executionPhase: 'COMMIT_APPROVED' },
        data: {
          status: 'AWAITING_COMMIT_REVIEW',
          executionPhase: 'AWAITING_COMMIT_REVIEW',
          failureCode: 'COMMIT_REVIEW_ARTIFACT_MISSING',
        },
      });
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
      operation: commitOperation ? 'COMMIT' : 'CODE_TEST',
      reviewedFiles,
      retryOfJobId: job.retryOfJobId,
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
    workerId: unknown,
    worktreePath: unknown,
    processId: unknown
  ): Promise<boolean> {
    const path = safeWorktreePath(worktreePath);
    const worker = safeWorkerId(workerId);
    const pid = safeProcessId(processId);
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: { id, status: 'LEASED', leaseToken, leasedBy: worker, leaseExpiresAt: { gt: new Date() } },
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
          processPid: null,
          executionPhase: 'STALE',
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
          leaseHeartbeatAt: now,
          processPid: pid,
          executionPhase: job.executionPhase === 'COMMIT_APPROVED' ? 'COMMITTING' : 'CODEX_RUNNING',
          progressLabel:
            job.executionPhase === 'COMMIT_APPROVED'
              ? 'Worker Mac đang tạo commit từ bản diff đã duyệt.'
              : IMPLEMENTATION_PROGRESS_LABELS.CODEX_STARTED,
          lastProgressAt: now,
          progressCount: { increment: 1 },
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

  /** Renews only the current process epoch; server time owns lease duration. */
  static async renew(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    workerId: unknown,
    processId: unknown
  ): Promise<boolean> {
    const worker = safeWorkerId(workerId);
    const pid = safeProcessId(processId);
    const now = new Date();
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: {
        id,
        status: 'RUNNING',
        leaseToken,
        leasedBy: worker,
        processPid: pid,
        leaseExpiresAt: { gt: now },
      },
      include: { report: { include: implementationReportInclude() } },
    });
    if (!job)
      throw new InboxImplementationError(
        'Lease implementation đã hết hạn hoặc không còn thuộc worker này.',
        409,
        'LEASE_RENEW_REJECTED'
      );
    if (!isCurrentExecution(job.report, job.sourceVersion, job.planVersion)) {
      throw new InboxImplementationError(
        'Approval hoặc plan implementation không còn hiện hành.',
        409,
        'STALE_BEFORE_RENEW'
      );
    }
    const renewed = await fastify.prisma.crm.crmInboxImplementationJob.updateMany({
      where: {
        id,
        status: 'RUNNING',
        leaseToken,
        leasedBy: worker,
        processPid: pid,
        leaseExpiresAt: { gt: now },
      },
      data: {
        leaseHeartbeatAt: now,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      },
    });
    if (!renewed.count)
      throw new InboxImplementationError(
        'Lease implementation không thể gia hạn an toàn.',
        409,
        'LEASE_RENEW_REJECTED'
      );
    return true;
  }

  /** Records only bounded operational evidence; it never stores Codex output or ticket text. */
  static async progress(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    workerId: unknown,
    processId: unknown,
    rawPhase: unknown,
    hasEvidence: unknown
  ): Promise<boolean> {
    const worker = safeWorkerId(workerId);
    const pid = safeProcessId(processId);
    const phase = implementationProgressPhase(rawPhase);
    const now = new Date();
    const progressed = await fastify.prisma.crm.crmInboxImplementationJob.updateMany({
      where: {
        id,
        status: 'RUNNING',
        leaseToken,
        leasedBy: worker,
        processPid: pid,
        leaseExpiresAt: { gt: now },
      },
      data: {
        executionPhase: phase,
        progressLabel: IMPLEMENTATION_PROGRESS_LABELS[phase],
        ...(hasEvidence === true ? { lastProgressAt: now } : {}),
        progressCount: { increment: 1 },
      },
    });
    if (!progressed.count) {
      throw new InboxImplementationError('Không thể ghi tiến triển cho lease hiện hành.', 409, 'LEASE_RENEW_REJECTED');
    }
    return true;
  }

  /** Starts the one permitted follow-up slice without reopening Danny's approval gate. */
  static async continueAfterCheckpoint(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    workerId: unknown,
    worktreePath: unknown,
    processId: unknown
  ): Promise<boolean> {
    const worker = safeWorkerId(workerId);
    const path = safeWorktreePath(worktreePath);
    const pid = safeProcessId(processId);
    const now = new Date();
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: { id, status: 'RUNNING', leaseToken, leasedBy: worker, leaseExpiresAt: { gt: now } },
      include: { report: { include: implementationReportInclude() } },
    });
    if (!job || job.checkpointCount >= IMPLEMENTATION_CHECKPOINT_LIMIT) {
      throw new InboxImplementationError('Checkpoint implementation không còn hợp lệ.', 409, 'CHECKPOINT_REJECTED');
    }
    if (!isCurrentExecution(job.report, job.sourceVersion, job.planVersion)) {
      throw new InboxImplementationError(
        'Approval hoặc plan implementation không còn hiện hành.',
        409,
        'STALE_BEFORE_RENEW'
      );
    }
    const continued = await fastify.prisma.crm.crmInboxImplementationJob.updateMany({
      where: {
        id,
        status: 'RUNNING',
        leaseToken,
        leasedBy: worker,
        leaseExpiresAt: { gt: now },
        checkpointCount: { lt: IMPLEMENTATION_CHECKPOINT_LIMIT },
      },
      data: {
        worktreePath: path,
        processPid: pid,
        executionPhase: 'CHECKPOINT_CONTINUING',
        progressLabel: IMPLEMENTATION_PROGRESS_LABELS.CHECKPOINT_CONTINUING,
        lastProgressAt: now,
        progressCount: { increment: 1 },
        checkpointCount: { increment: 1 },
        leaseHeartbeatAt: now,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      },
    });
    if (!continued.count)
      throw new InboxImplementationError('Không thể tiếp tục checkpoint an toàn.', 409, 'CHECKPOINT_REJECTED');
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
          processPid: null,
          executionPhase: 'STALE',
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
          leaseHeartbeatAt: now,
          processPid: null,
          executionPhase: 'AWAITING_COMMIT_REVIEW',
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

  /** Completes only the fixed git-commit operation authorized from the Inbox review checkpoint. */
  static async completeCommit(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    rawCommitSha: unknown
  ): Promise<void> {
    const commitSha = clean(rawCommitSha, 64);
    if (!/^[a-f0-9]{7,64}$/i.test(commitSha)) {
      throw new InboxImplementationError('Commit SHA worker trả về không hợp lệ.', 422, 'INVALID_COMMIT_SHA');
    }
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: { id, status: 'RUNNING', executionPhase: 'COMMITTING', leaseToken, leaseExpiresAt: { gt: new Date() } },
      include: { report: { include: implementationReportInclude() } },
    });
    if (!job) throw new InboxImplementationError('Lease commit đã hết hạn.', 409, 'LEASE_EXPIRED');
    if (!isCurrentExecution(job.report, job.sourceVersion, job.planVersion)) {
      throw new InboxImplementationError(
        'Approval hoặc plan không còn hiện hành khi commit.',
        409,
        'STALE_BEFORE_RESULT'
      );
    }
    const now = new Date();
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmInboxImplementationJob.update({
        where: { id },
        data: {
          status: 'AWAITING_DEPLOY_REVIEW',
          executionPhase: 'AWAITING_DEPLOY_REVIEW',
          commitSha,
          completedAt: now,
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
          processPid: null,
          leaseHeartbeatAt: now,
          failureCode: null,
          retainUntil: new Date(now.getTime() + REVIEW_RETENTION_MS),
        },
      });
      await tx.crmBugReportAudit.create({
        data: {
          reportId: job.reportId,
          action: 'AGENT_IMPLEMENTATION_COMMITTED',
          note: 'Worker Mac đã commit đúng danh sách tệp Danny duyệt vào branch riêng; chưa push, merge hoặc deploy.',
          beforeJson: snapshot(job.report),
          afterJson: snapshot(job.report),
        },
      });
    });
    await clearGlobalPermit(fastify, id);
  }

  /**
   * A deploy is a separate, Danny-controlled transition. The worker never calls
   * this method: it only moves a reviewed patch to reporter acceptance once the
   * server can prove the explicitly-recorded reviewed commit is currently live.
   * It then stops at the reporter's acceptance gate; it never closes the ticket.
   */
  static async recordReleasedForReporterAcceptance(
    fastify: FastifyInstance,
    reportId: number,
    actorStaffId: number,
    input: ReleaseBugReportImplementationRequest
  ): Promise<void> {
    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: implementationReportInclude(),
    });
    if (!report) throw new InboxImplementationError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
    if (report.status !== 'IN_PROGRESS' || !report.implementationActiveJobId) {
      throw new InboxImplementationError('Ticket chưa ở checkpoint duyệt commit để bàn giao nghiệm thu.', 409);
    }

    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: {
        id: report.implementationActiveJobId,
        reportId,
        status: 'AWAITING_DEPLOY_REVIEW',
      },
    });
    if (!job) {
      throw new InboxImplementationError('Không tìm thấy commit đang chờ Danny xác nhận deploy.', 409);
    }

    const { reviewedCommitSha, deployedCommitSha } = await verifiedReleasedCommit({
      ...input,
      commitSha: input.commitSha || job.commitSha || '',
    });
    const changedFiles = safeFileList(safeJsonValue(job.changedFilesJson));
    const tests = normalizeTests(safeJsonValue(job.testsJson));
    const now = new Date();
    const key = formatBugReportKey(reportId, report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG');
    const problemSummary = 'Bản sửa đã được phát hành và đang chờ người báo nghiệm thu.';
    const verificationSummary = tests.length
      ? tests.map((test) => `${test.status}: ${test.command}`).join('\n')
      : 'Đã đối chiếu release marker production; không có lệnh kiểm thử được worker ghi nhận.';
    const resolutionSearch = removeVietnameseTones(
      `${report.title} ${report.sourcePath} ${problemSummary} ${changedFiles.join(' ')}`
    );
    const releaseUrl = 'https://lab.masteros.app/dashboard/bug-reports';

    await fastify.prisma.crm.$transaction(async (tx) => {
      const releasedJob = await tx.crmInboxImplementationJob.updateMany({
        where: { id: job.id, reportId, status: 'AWAITING_DEPLOY_REVIEW' },
        data: {
          status: 'RELEASED',
          executionPhase: 'AWAITING_REPORTER_ACCEPTANCE',
          retainUntil: new Date(now.getTime() + REVIEW_RETENTION_MS),
        },
      });
      if (!releasedJob.count) {
        throw new InboxImplementationError('Checkpoint duyệt commit đã thay đổi. Vui lòng tải lại ticket.', 409);
      }

      const fixedReport = await tx.crmBugReport.updateMany({
        where: { id: reportId, status: 'IN_PROGRESS', implementationActiveJobId: job.id },
        data: {
          status: 'FIXED',
          statusSort: 0,
          resolvedAt: now,
          closedAt: null,
          triageNote: problemSummary,
          implementationActiveJobId: null,
          updatedAt: now,
        },
      });
      if (!fixedReport.count) {
        throw new InboxImplementationError('Ticket đã thay đổi trước khi bàn giao nghiệm thu. Vui lòng tải lại.', 409);
      }

      await tx.crmBugReportResolution.upsert({
        where: { reportId },
        create: {
          reportId,
          problemSummary,
          rootCause: 'Bản vá đã hoàn tất checkpoint review, commit đã được Danny ghi nhận và khớp release production.',
          solutionSummary: 'Đã deploy bản thay đổi đã duyệt; mOS chờ người báo nghiệm thu.',
          verificationSummary,
          changedFilesJson: JSON.stringify(changedFiles),
          commitSha: reviewedCommitSha,
          releaseUrl,
          searchNormalized: resolutionSearch,
        },
        update: {
          problemSummary,
          rootCause: 'Bản vá đã hoàn tất checkpoint review, commit đã được Danny ghi nhận và khớp release production.',
          solutionSummary: 'Đã deploy bản thay đổi đã duyệt; mOS chờ người báo nghiệm thu.',
          verificationSummary,
          changedFilesJson: JSON.stringify(changedFiles),
          commitSha: reviewedCommitSha,
          releaseUrl,
          searchNormalized: resolutionSearch,
        },
      });
      await tx.crmBugReportAudit.create({
        data: {
          reportId,
          actorStaffId,
          action: 'DANNY_RELEASED_FOR_REPORTER_ACCEPTANCE',
          note: `Danny đã xác nhận commit ${reviewedCommitSha.slice(0, 12)} đã có trong release ${deployedCommitSha.slice(0, 12)}; ticket chuyển sang chờ người báo nghiệm thu.`,
          beforeJson: snapshot(report),
          afterJson: snapshot({
            ...report,
            status: 'FIXED',
            implementationActiveJobId: null,
          }),
        },
      });
      await tx.crmBugReportComment.create({
        data: {
          reportId,
          authorType: 'AGENT',
          kind: 'COMMENT',
          body: [
            '## Đã phát hành — chờ người báo nghiệm thu',
            '',
            `- Commit đã duyệt: ${reviewedCommitSha}`,
            `- Release đang chạy: ${deployedCommitSha}`,
            `- Ticket: ${key}`,
            '- Bản sửa đã được deploy. Người báo nghiệm thu đạt hoặc yêu cầu chỉnh lại.',
          ].join('\n'),
        },
      });
      await tx.crmBugReportNotification.create({
        data: {
          reportId,
          recipientStaffId: report.reporterStaffId,
          type: report.requestType === 'FEATURE' ? 'FEATURE_IMPLEMENTED_REVIEW' : 'BUG_FIXED_REVIEW',
          title: `${key} đã deploy — mời bạn nghiệm thu`,
          message: 'Bản thay đổi đã lên production. Hãy xác nhận đạt hoặc mô tả điểm cần sửa thêm.',
          actionUrl: `/dashboard?bugReview=${encodeURIComponent(key)}`,
        },
      });
    });
  }

  /**
   * The final business decision belongs to the reporter, after the release is visible
   * in production. Reopening never creates another implementation or deploy.
   */
  static async reviewReporterAcceptance(
    fastify: FastifyInstance,
    reportId: number,
    actorStaffId: number,
    input: ReviewBugReportImplementationAcceptanceRequest
  ): Promise<void> {
    const decision = input?.decision;
    if (decision !== 'APPROVE' && decision !== 'REOPEN') {
      throw new InboxImplementationError('Quyết định nghiệm thu không hợp lệ.', 422);
    }
    const note = clean(input?.note, 2_000) || null;
    if (decision === 'REOPEN' && !note) {
      throw new InboxImplementationError('Cần mô tả điểm vẫn chưa đúng trước khi mở lại ticket.', 422);
    }

    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: implementationReportInclude(),
    });
    if (!report) throw new InboxImplementationError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
    if (report.status !== 'FIXED') {
      throw new InboxImplementationError('Ticket chưa ở bước người báo nghiệm thu.', 409);
    }
    if (report.reporterStaffId !== actorStaffId) {
      throw new InboxImplementationError(
        'Chỉ người báo ticket mới có thể nghiệm thu bản deploy.',
        403,
        'REPORTER_ACCEPTANCE_REQUIRED'
      );
    }
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: {
        reportId,
        status: 'RELEASED',
        executionPhase: 'AWAITING_REPORTER_ACCEPTANCE',
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!job) {
      throw new InboxImplementationError('Không tìm thấy release đang chờ người báo nghiệm thu.', 409);
    }

    const now = new Date();
    const accepted = decision === 'APPROVE';
    await fastify.prisma.crm.$transaction(async (tx) => {
      const reviewedJob = await tx.crmInboxImplementationJob.updateMany({
        where: { id: job.id, reportId, status: 'RELEASED', executionPhase: 'AWAITING_REPORTER_ACCEPTANCE' },
        data: { executionPhase: accepted ? 'ACCEPTED' : 'REOPENED_BY_REPORTER' },
      });
      if (!reviewedJob.count) {
        throw new InboxImplementationError('Bước nghiệm thu đã thay đổi. Vui lòng tải lại ticket.', 409);
      }
      const reviewedReport = await tx.crmBugReport.updateMany({
        where: { id: reportId, status: 'FIXED' },
        data: {
          status: accepted ? 'CLOSED' : 'IN_PROGRESS',
          statusSort: accepted ? 9 : 0,
          startedAt: report.startedAt ?? now,
          resolvedAt: accepted ? (report.resolvedAt ?? now) : null,
          closedAt: accepted ? now : null,
          triageNote: note ?? report.triageNote,
          updatedAt: now,
        },
      });
      if (!reviewedReport.count) {
        throw new InboxImplementationError('Ticket đã thay đổi trước khi lưu nghiệm thu. Vui lòng tải lại.', 409);
      }
      await tx.crmBugReportAudit.create({
        data: {
          reportId,
          actorStaffId,
          action: accepted ? 'REPORTER_IMPLEMENTATION_ACCEPTED' : 'REPORTER_IMPLEMENTATION_REOPENED',
          note: note ?? (accepted ? 'Người báo đã nghiệm thu bản sửa trên production.' : 'Người báo yêu cầu sửa thêm.'),
          beforeJson: snapshot(report),
          afterJson: snapshot({
            ...report,
            status: accepted ? 'CLOSED' : 'IN_PROGRESS',
            comments: report.comments,
            inboxPlanJobs: report.inboxPlanJobs,
          }),
        },
      });
      await tx.crmBugReportComment.create({
        data: {
          reportId,
          authorType: 'AGENT',
          kind: 'COMMENT',
          body: accepted
            ? '## Người báo đã nghiệm thu\n\n- Bản sửa production đạt yêu cầu; ticket đã hoàn tất.'
            : `## Người báo yêu cầu sửa thêm\n\n${note}`,
        },
      });
    });
  }

  static async fail(fastify: FastifyInstance, id: string, leaseToken: string, failureCode: unknown): Promise<void> {
    const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: { id, status: { in: ['LEASED', 'RUNNING'] }, leaseToken },
      include: { report: { include: implementationReportInclude() } },
    });
    if (!job) return;
    const code = clean(failureCode, 100) || 'IMPLEMENTATION_FAILED';
    const now = new Date();
    const commitFailure = job.executionPhase === 'COMMITTING';
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmInboxImplementationJob.update({
        where: { id },
        data: {
          status: commitFailure ? 'AWAITING_COMMIT_REVIEW' : 'FAILED',
          failureCode: code,
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
          processPid: null,
          executionPhase: commitFailure ? 'AWAITING_COMMIT_REVIEW' : 'FAILED',
          retainUntil: new Date(now.getTime() + FAILURE_RETENTION_MS),
        },
      });
      const updated = await tx.crmBugReport.update({
        where: { id: job.reportId },
        data: commitFailure ? { updatedAt: now } : { status: 'APPROVED', statusSort: 0, updatedAt: now },
      });
      await tx.crmBugReportAudit.create({
        data: {
          reportId: job.reportId,
          action: commitFailure ? 'AGENT_IMPLEMENTATION_COMMIT_FAILED' : 'AGENT_IMPLEMENTATION_FAILED',
          note: commitFailure
            ? 'Worker không thể commit an toàn. Bản review được giữ nguyên và ticket quay lại checkpoint duyệt commit.'
            : 'Implementation worker đã dừng an toàn; giữ worktree để Danny rà soát và quyết định một retry liên kết nếu cần.',
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
