import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../generated/crm-client/index.js';
import {
  formatBugReportKey,
  type BugReportOriginalEvidenceRef,
  type BugReportReopenContext,
  type InboxPlanDraft,
  type InboxPlanEventKind,
  type InboxPlanWorkerJob,
  type InboxPlanWorkerResult,
} from '@mos-lab/shared';
import { inboxImplementationPlanVersion, inboxImplementationSourceVersion } from './inbox-implementation-version.js';

const TTL = 24 * 60 * 60 * 1000;
const LEASE = 2 * 60 * 1000;
const MAX = 3;

const clean = (value: unknown, limit: number) =>
  Array.from(String(value ?? ''))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31));
    })
    .join('')
    .trim()
    .slice(0, limit);

type PlanningSource = {
  status: string;
  clarificationStatus: string;
};

type EventVersionSource = {
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
  comments: Array<{ id: number; body: string }>;
};

export class InboxPlanError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'INBOX_PLAN_ERROR'
  ) {
    super(message);
  }
}

/** Planning is review-only and deliberately stops before any fix can begin. */
export function isInboxPlanEligible(source: PlanningSource): boolean {
  return source.clarificationStatus === 'READY' && ['NEW', 'APPROVED'].includes(source.status);
}

export function inboxPlanEventVersion(
  source: EventVersionSource,
  eventKind?: InboxPlanEventKind,
  reopen: BugReportReopenContext | null = null
): string {
  // Deliberately exclude operational audit/progress timestamps: they should not
  // invalidate a plan whose material ticket context is unchanged.
  const content = JSON.stringify({
    eventKind: eventKind ?? null,
    requestType: source.requestType,
    title: source.title,
    description: source.description,
    status: source.status,
    priority: source.priority,
    clarificationStatus: source.clarificationStatus,
    clarificationSummary: source.clarificationSummary,
    businessContext: source.businessContext,
    triageNote: source.triageNote,
    sourcePath: source.sourcePath,
    reporterMessages: source.comments.map((comment) => ({ id: comment.id, body: comment.body })),
    reopen,
  });
  return `v1:${createHash('sha256').update(content).digest('hex')}`;
}

export function isInboxPlanStale(
  expectedEventVersion: string,
  current: EventVersionSource,
  eventKind?: InboxPlanEventKind,
  reopen: BugReportReopenContext | null = null
): boolean {
  return expectedEventVersion !== inboxPlanEventVersion(current, eventKind, reopen);
}

function safeOriginalEvidence(value: unknown): BugReportOriginalEvidenceRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const candidate = item && typeof item === 'object' ? (item as Partial<BugReportOriginalEvidenceRef>) : {};
      const id = Number(candidate.id);
      const fileName = clean(candidate.fileName, 255);
      const mimeType = clean(candidate.mimeType, 50);
      const sizeBytes = Number(candidate.sizeBytes);
      return Number.isInteger(id) && id > 0 && fileName && mimeType && Number.isInteger(sizeBytes) && sizeBytes > 0
        ? { id, fileName, mimeType, sizeBytes }
        : null;
    })
    .filter((item): item is BugReportOriginalEvidenceRef => Boolean(item))
    .slice(0, 3);
}

function safeReopenContext(value: unknown): BugReportReopenContext | null {
  try {
    const candidate = JSON.parse(String(value || '{}'))?.reopen as Partial<BugReportReopenContext> | undefined;
    const auditId = Number(candidate?.auditId);
    const reason = clean(candidate?.reason, 2_000);
    const reopenedAt = new Date(String(candidate?.reopenedAt || '')).toISOString();
    if (!Number.isInteger(auditId) || auditId <= 0 || !reason) return null;
    const reopen: BugReportReopenContext = {
      auditId,
      reason,
      reopenedAt,
      originalEvidence: safeOriginalEvidence(candidate?.originalEvidence),
    };
    // Old jobs intentionally remain byte-for-byte equivalent for plan versioning.
    // New reopen jobs already received this bounded snapshot from the follow-up service.
    if (candidate?.intent === 'UNCHANGED' || candidate?.intent === 'DETAILS') reopen.intent = candidate.intent;
    if (candidate?.knownContext && typeof candidate.knownContext === 'object') {
      reopen.knownContext = candidate.knownContext as BugReportReopenContext['knownContext'];
    }
    return reopen;
  } catch {
    return null;
  }
}

function normalizeDraft(value: unknown): InboxPlanDraft {
  const input = value && typeof value === 'object' ? (value as Partial<InboxPlanDraft>) : {};
  const steps = Array.isArray(input.steps)
    ? input.steps
        .map((item) => clean(item, 500))
        .filter(Boolean)
        .slice(0, 7)
    : [];
  const draft = {
    evidence: clean(input.evidence, 1_200),
    expectedOutcome: clean(input.expectedOutcome, 1_200),
    scope: clean(input.scope, 1_200),
    steps,
    verification: clean(input.verification, 1_200),
    risksAndRollback: clean(input.risksAndRollback, 1_200),
    approvalRequest: clean(input.approvalRequest, 1_200),
  };
  if (
    !draft.evidence ||
    !draft.expectedOutcome ||
    !draft.scope ||
    !draft.steps.length ||
    !draft.verification ||
    !draft.risksAndRollback ||
    !draft.approvalRequest
  ) {
    throw new InboxPlanError(
      'Kế hoạch cần đủ bằng chứng, phạm vi, bước làm, kiểm chứng, rủi ro và quyết định duyệt.',
      422
    );
  }
  return draft;
}

export function normalizeInboxPlanResult(value: unknown): InboxPlanWorkerResult {
  const input = value && typeof value === 'object' ? (value as Partial<InboxPlanWorkerResult>) : {};
  const action = input.action;
  const note = clean(input.note, 500);
  if (!['POST_PLAN', 'NO_OP', 'INSUFFICIENT_INFORMATION'].includes(action || '')) {
    throw new InboxPlanError('Hành động lập kế hoạch không hợp lệ.', 422);
  }
  const validatedAction = action as InboxPlanWorkerResult['action'];
  if (!note) throw new InboxPlanError('Thiếu ghi chú kế hoạch an toàn.', 422);
  if (validatedAction === 'POST_PLAN') return { action: validatedAction, note, plan: normalizeDraft(input.plan) };
  if (input.plan !== null && input.plan !== undefined) {
    throw new InboxPlanError('NO_OP hoặc INSUFFICIENT_INFORMATION không được kèm kế hoạch.', 422);
  }
  return { action: validatedAction, note, plan: null };
}

function visiblePlanBody(
  eventKind: string,
  result: InboxPlanWorkerResult,
  planMetadata: { sourceVersion: string; planVersion: string } | null,
  reopen: BugReportReopenContext | null
): string {
  if (result.action !== 'POST_PLAN' || !result.plan) {
    const label = result.action === 'NO_OP' ? 'Không cần phương án mới' : 'Chưa đủ cơ sở để lập phương án';
    return [
      '## Rà soát phương án Agent',
      '',
      `- Kết quả: ${label}.`,
      `- Ghi chú: ${result.note}`,
      '',
      'Không có mã nguồn, cấu hình, dữ liệu, triage, priority hay triển khai nào được thay đổi bởi bước rà soát này.',
    ].join('\n');
  }
  const plan = result.plan;
  return [
    eventKind === 'REOPEN_REANALYZED'
      ? '## Phương án Agent sau reopen — chờ Danny duyệt lại'
      : '## Phương án Agent đề xuất — chờ Danny duyệt',
    '',
    `- Sự kiện: ${eventKind}.`,
    ...(reopen
      ? [
          `- Lý do reopen của người báo: ${reopen.reason}`,
          `- Audit reopen: #${reopen.auditId} lúc ${reopen.reopenedAt}.`,
        ]
      : []),
    ...(reopen
      ? [
          `- Ảnh gốc Agent đã đối chiếu: ${
            reopen.originalEvidence.length
              ? reopen.originalEvidence
                  .map((item) => `#${item.id} (${item.fileName}, ${item.mimeType}, ${item.sizeBytes} B)`)
                  .join('; ')
              : 'Không có ảnh gốc được lưu cùng ticket.'
          }.`,
        ]
      : []),
    `- Tóm tắt: ${result.note}`,
    '',
    '### Bằng chứng / giả thuyết',
    plan.evidence,
    '',
    '### Kết quả cần đạt',
    plan.expectedOutcome,
    '',
    '### Phạm vi ảnh hưởng',
    plan.scope,
    '',
    '### Các bước đề xuất',
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '### Kiểm chứng',
    plan.verification,
    '',
    '### Rủi ro / rollback',
    plan.risksAndRollback,
    '',
    '### Quyết định Danny cần duyệt',
    plan.approvalRequest,
    '',
    'Đây chỉ là phương án. Agent chưa sửa code, thay đổi dữ liệu, đổi triage/priority hay triển khai production.',
    planMetadata ? `<!-- mos-inbox-plan source=${planMetadata.sourceVersion} plan=${planMetadata.planVersion} -->` : '',
  ].join('\n');
}

function snapshot(source: { status: string; clarificationStatus: string; priority: string | null; updatedAt: Date }) {
  return JSON.stringify({
    status: source.status,
    clarificationStatus: source.clarificationStatus,
    priority: source.priority,
    updatedAt: source.updatedAt.toISOString(),
  });
}

export class InboxPlanService {
  /**
   * Re-delivers a reopen plan only when the original worker correctly stopped
   * because Danny's review changed the ticket between claim and completion.
   *
   * The original job remains immutable audit evidence.  The replacement gets
   * a fresh event version from the current ticket, but keeps the exact reopen
   * snapshot (reason and original evidence) that the reporter supplied.  This
   * keeps a valid reopen from being stranded merely because Danny approved the
   * ticket while its re-analysis plan was in flight.
   */
  static async recoverStaleReopenPlanEvents(fastify: FastifyInstance): Promise<number> {
    const staleJobs = await fastify.prisma.crm.crmInboxPlanJob.findMany({
      where: {
        eventKind: 'REOPEN_REANALYZED',
        status: 'COMPLETED',
        resultAction: 'STALE',
        expiresAt: { gt: new Date() },
      },
      include: {
        report: {
          include: { comments: { where: { authorType: 'STAFF' }, orderBy: { createdAt: 'desc' }, take: 8 } },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: 20,
    });
    let queued = 0;
    for (const staleJob of staleJobs) {
      const reopen = safeReopenContext(staleJob.eventContextJson);
      if (!reopen || !isInboxPlanEligible(staleJob.report)) continue;
      if (!(await this.enqueue(fastify, staleJob.reportId, 'REOPEN_REANALYZED', reopen))) continue;
      await fastify.prisma.crm.crmBugReportAudit.create({
        data: {
          reportId: staleJob.reportId,
          action: 'SYSTEM_REOPEN_PLAN_REQUEUED',
          note: 'Đã tự động xếp lại phương án reopen sau khi trạng thái duyệt làm plan trước đó trở nên cũ.',
        },
      });
      queued += 1;
    }
    return queued;
  }

  static async enqueue(
    fastify: FastifyInstance,
    reportId: number,
    eventKind: InboxPlanEventKind,
    reopen: BugReportReopenContext | null = null
  ): Promise<boolean> {
    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: { comments: { where: { authorType: 'STAFF' }, orderBy: { createdAt: 'desc' }, take: 8 } },
    });
    if (!report || !isInboxPlanEligible(report)) return false;
    if (eventKind === 'REOPEN_REANALYZED' && !reopen) return false;
    try {
      await fastify.prisma.crm.crmInboxPlanJob.create({
        data: {
          id: randomUUID(),
          reportId,
          eventKind,
          eventVersion: inboxPlanEventVersion(report, eventKind, reopen),
          eventContextJson: reopen ? JSON.stringify({ reopen }) : null,
          expiresAt: new Date(Date.now() + TTL),
        },
      });
      return true;
    } catch (error) {
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError || (error && typeof error === 'object')) &&
        (error as { code?: string }).code === 'P2002'
      )
        return false;
      throw error;
    }
  }

  static async claim(fastify: FastifyInstance, workerId: string): Promise<InboxPlanWorkerJob | null> {
    const now = new Date();
    const safeWorker = clean(workerId, 100);
    if (!safeWorker) throw new InboxPlanError('Worker ID không hợp lệ.');
    await this.recoverStaleReopenPlanEvents(fastify);
    await fastify.prisma.crm.crmInboxPlanJob.updateMany({
      where: { status: 'LEASED', leaseExpiresAt: { lte: now }, expiresAt: { gt: now } },
      data: { status: 'PENDING', leaseToken: null, leasedBy: null, leaseExpiresAt: null },
    });

    for (let skipped = 0; skipped < 20; skipped += 1) {
      const job = await fastify.prisma.crm.crmInboxPlanJob.findFirst({
        where: { status: 'PENDING', expiresAt: { gt: now }, attemptCount: { lt: MAX } },
        include: {
          report: {
            include: {
              comments: { where: { authorType: 'STAFF' }, orderBy: { createdAt: 'desc' }, take: 8 },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!job) return null;
      if (
        !isInboxPlanEligible(job.report) ||
        isInboxPlanStale(
          job.eventVersion,
          job.report,
          job.eventKind as InboxPlanEventKind,
          safeReopenContext(job.eventContextJson)
        )
      ) {
        await fastify.prisma.crm.crmInboxPlanJob.updateMany({
          where: { id: job.id, status: 'PENDING', updatedAt: job.updatedAt },
          data: {
            status: 'COMPLETED',
            resultAction: 'STALE',
            fallbackReason: 'Ticket changed or no longer qualifies for planning before worker claim.',
          },
        });
        continue;
      }
      const leaseToken = randomUUID();
      const lock = await fastify.prisma.crm.crmInboxPlanJob.updateMany({
        where: { id: job.id, status: 'PENDING', updatedAt: job.updatedAt },
        data: {
          status: 'LEASED',
          attemptCount: { increment: 1 },
          leaseToken,
          leasedBy: safeWorker,
          leaseExpiresAt: new Date(now.getTime() + LEASE),
        },
      });
      if (!lock.count) continue;
      const report = job.report;
      const reopen = safeReopenContext(job.eventContextJson);
      return {
        id: job.id,
        ticketId: report.id,
        ticketKey: formatBugReportKey(report.id, report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG'),
        eventKind: job.eventKind as InboxPlanEventKind,
        eventVersion: job.eventVersion,
        context: {
          requestType: report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG',
          title: clean(report.title, 180),
          description: clean(report.description, 2_000),
          status: report.status as 'NEW' | 'APPROVED',
          clarificationSummary: report.clarificationSummary ? clean(report.clarificationSummary, 1_200) : null,
          businessContext: report.businessContext ? clean(report.businessContext, 2_000) : null,
          sourcePath: clean(report.sourcePath, 500),
          reporterMessages: report.comments.map((comment) => clean(comment.body, 1_200)),
          reopen,
        },
        leaseToken,
        attemptCount: job.attemptCount + 1,
      };
    }
    return null;
  }

  static async complete(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    raw: unknown
  ): Promise<number | null> {
    const result = normalizeInboxPlanResult(raw);
    const job = await fastify.prisma.crm.crmInboxPlanJob.findFirst({
      where: { id, status: 'LEASED', leaseToken, leaseExpiresAt: { gt: new Date() } },
    });
    if (!job) throw new InboxPlanError('Lease đã hết hạn.', 409);
    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: job.reportId },
      include: { comments: { where: { authorType: 'STAFF' }, orderBy: { createdAt: 'desc' }, take: 8 } },
    });
    if (!report) throw new InboxPlanError('Ticket không còn tồn tại.', 404, 'BUG_NOT_FOUND');
    const completeAsStale = async () => {
      const stale = await fastify.prisma.crm.crmInboxPlanJob.updateMany({
        where: { id, status: 'LEASED', leaseToken, leaseExpiresAt: { gt: new Date() } },
        data: {
          status: 'COMPLETED',
          resultAction: 'STALE',
          fallbackReason: 'Ticket changed before the plan result was accepted.',
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
        },
      });
      if (!stale.count) throw new InboxPlanError('Lease đã hết hạn.', 409);
    };
    if (
      !isInboxPlanEligible(report) ||
      isInboxPlanStale(
        job.eventVersion,
        report,
        job.eventKind as InboxPlanEventKind,
        safeReopenContext(job.eventContextJson)
      )
    ) {
      await completeAsStale();
      return null;
    }

    const now = new Date();
    const sourceVersion =
      result.action === 'POST_PLAN' && result.plan ? inboxImplementationSourceVersion(report) : null;
    const planVersion =
      sourceVersion && result.plan ? inboxImplementationPlanVersion(sourceVersion, result.plan) : null;
    const body = visiblePlanBody(
      job.eventKind,
      result,
      sourceVersion && planVersion ? { sourceVersion, planVersion } : null,
      safeReopenContext(job.eventContextJson)
    );
    const auditAction =
      result.action === 'POST_PLAN'
        ? job.eventKind === 'REOPEN_REANALYZED'
          ? 'AGENT_REOPEN_PLAN_POSTED'
          : 'AGENT_PLAN_POSTED'
        : result.action === 'NO_OP'
          ? 'AGENT_PLAN_NO_OP'
          : 'AGENT_PLAN_INSUFFICIENT_INFORMATION';
    const outcome = await fastify.prisma.crm.$transaction(async (tx) => {
      // Lock the ticket row, then compare the content hash inside the same
      // transaction. Operational progress audits do not invalidate a plan,
      // whereas a reporter or clarity change does.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM crm_bug_reports WHERE id = ${report.id} FOR UPDATE`);
      const current = await tx.crmBugReport.findUnique({
        where: { id: report.id },
        include: { comments: { where: { authorType: 'STAFF' }, orderBy: { createdAt: 'desc' }, take: 8 } },
      });
      if (
        !current ||
        !isInboxPlanEligible(current) ||
        isInboxPlanStale(
          job.eventVersion,
          current,
          job.eventKind as InboxPlanEventKind,
          safeReopenContext(job.eventContextJson)
        )
      ) {
        const stale = await tx.crmInboxPlanJob.updateMany({
          where: { id, status: 'LEASED', leaseToken, leaseExpiresAt: { gt: now } },
          data: {
            status: 'COMPLETED',
            resultAction: 'STALE',
            fallbackReason: 'Ticket changed before the plan result was accepted.',
            leaseToken: null,
            leasedBy: null,
            leaseExpiresAt: null,
          },
        });
        return stale.count ? 'STALE' : 'LEASE_EXPIRED';
      }
      const completion = await tx.crmInboxPlanJob.updateMany({
        where: { id, status: 'LEASED', leaseToken, leaseExpiresAt: { gt: now } },
        data: {
          status: 'COMPLETED',
          resultAction: result.action,
          sourceVersion,
          planVersion,
          fallbackReason: null,
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
        },
      });
      if (!completion.count) return 'LEASE_EXPIRED';
      const updated = await tx.crmBugReport.update({ where: { id: current.id }, data: { updatedAt: now } });
      const comment = await tx.crmBugReportComment.create({
        data: { reportId: current.id, authorType: 'AGENT', kind: 'COMMENT', body },
      });
      if (result.action === 'POST_PLAN') {
        await tx.crmInboxPlanJob.update({ where: { id: job.id }, data: { reviewCommentId: comment.id } });
      }
      await tx.crmBugReportAudit.create({
        data: {
          reportId: current.id,
          action: auditAction,
          note: result.note,
          beforeJson: snapshot(current),
          afterJson: snapshot(updated),
        },
      });
      return { state: 'POSTED' as const, reportId: current.id };
    });
    if (outcome === 'STALE') return null;
    if (typeof outcome === 'object') return result.action === 'POST_PLAN' ? outcome.reportId : null;
    throw new InboxPlanError('Lease đã hết hạn.', 409);
  }

  static async fail(fastify: FastifyInstance, id: string, leaseToken: string): Promise<void> {
    const job = await fastify.prisma.crm.crmInboxPlanJob.findFirst({ where: { id, status: 'LEASED', leaseToken } });
    if (!job) return;
    await fastify.prisma.crm.crmInboxPlanJob.update({
      where: { id },
      data:
        job.attemptCount >= MAX
          ? {
              status: 'FAILED',
              fallbackReason: 'Worker unavailable; Inbox plan still needs manual review.',
              leaseToken: null,
              leasedBy: null,
              leaseExpiresAt: null,
            }
          : { status: 'PENDING', leaseToken: null, leasedBy: null, leaseExpiresAt: null },
    });
  }
}
