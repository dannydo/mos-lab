import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  formatBugReportKey,
  type BugReportOriginalEvidenceRef,
  type BugReportReopenContext,
  type BugReportClarificationStatus,
  type InboxFollowUpWorkerJob,
  type InboxFollowUpWorkerResult,
} from '@mos-lab/shared';
import { BugReportService } from './bug-report.service.js';
import { BugReportStorage } from './bug-report.storage.js';

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

function originalEvidenceFromAttachments(
  attachments: Array<{
    id: number;
    commentId: number | null;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    deletedAt: Date | null;
  }>
): BugReportOriginalEvidenceRef[] {
  return attachments
    .filter((attachment) => attachment.commentId === null && !attachment.deletedAt)
    .map((attachment) => ({
      id: attachment.id,
      fileName: clean(attachment.originalName, 255),
      mimeType: clean(attachment.mimeType, 50),
      sizeBytes: attachment.sizeBytes,
    }))
    .filter((attachment) => attachment.fileName && attachment.mimeType && attachment.sizeBytes > 0)
    .slice(0, 3);
}

function safeReopenContext(value: unknown): BugReportReopenContext | null {
  try {
    const candidate = JSON.parse(String(value || '{}'))?.reopen as Partial<BugReportReopenContext> | undefined;
    const auditId = Number(candidate?.auditId);
    const reason = clean(candidate?.reason, 2_000);
    const reopenedAt = new Date(String(candidate?.reopenedAt || '')).toISOString();
    return Number.isInteger(auditId) && auditId > 0 && reason
      ? { auditId, reason, reopenedAt, originalEvidence: safeOriginalEvidence(candidate?.originalEvidence) }
      : null;
  } catch {
    return null;
  }
}

type FollowUpCompletion = {
  reportId: number;
  eventKind: InboxFollowUpWorkerJob['eventKind'];
  reopen: BugReportReopenContext | null;
};
export class InboxFollowUpError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'INBOX_FOLLOW_UP_ERROR'
  ) {
    super(message);
  }
}
export function normalizeInboxFollowUpResult(value: unknown): InboxFollowUpWorkerResult {
  const input = value && typeof value === 'object' ? (value as Partial<InboxFollowUpWorkerResult>) : {};
  const action = input.action;
  const note = clean(input.note, 500);
  const question = clean(input.question, 500) || null;
  if (!['PROGRESS_REVIEWED', 'REANALYSIS_CONFIRMED', 'ASK_REPORTER', 'NO_OP'].includes(action || ''))
    throw new InboxFollowUpError('Hành động follow-up không hợp lệ.', 422);
  if (action === 'ASK_REPORTER' && (!question || question.length < 3))
    throw new InboxFollowUpError('Cần đúng một câu hỏi ngắn.', 422);
  if (action !== 'ASK_REPORTER' && question) throw new InboxFollowUpError('Hành động này không được hỏi thêm.', 422);
  if (!note) throw new InboxFollowUpError('Thiếu ghi chú an toàn.', 422);
  return { action, note, question } as InboxFollowUpWorkerResult;
}

export function resolveInboxFollowUpCompletion(
  action: InboxFollowUpWorkerResult['action'],
  clarificationStatus: BugReportClarificationStatus,
  eventKind: InboxFollowUpWorkerJob['eventKind']
): { resultAction: InboxFollowUpWorkerResult['action']; confirmClarity: boolean } {
  if (action === 'ASK_REPORTER') return { resultAction: action, confirmClarity: false };
  if (eventKind === 'REPORTER_REOPENED') {
    if (action !== 'REANALYSIS_CONFIRMED') {
      throw new InboxFollowUpError(
        'Reopen phải được Agent xác nhận re-analysis hoặc hỏi lại người báo; không được NO_OP.',
        422,
        'REOPEN_REANALYSIS_REQUIRED'
      );
    }
    return { resultAction: action, confirmClarity: clarificationStatus === 'PENDING_AGENT' };
  }
  if (action === 'PROGRESS_REVIEWED' && clarificationStatus === 'PENDING_AGENT') {
    return { resultAction: 'PROGRESS_REVIEWED', confirmClarity: true };
  }
  return { resultAction: action, confirmClarity: false };
}

export class InboxFollowUpService {
  /**
   * Before the reopen contract existed, a worker could complete a reopen with
   * NO_OP and leave the report at PENDING_AGENT forever. Recover one such
   * legacy event per claim cycle. The new job has a distinct immutable version,
   * so concurrent workers can create it at most once and must use the strict
   * re-analysis completion rules.
   */
  private static async recoverOneLegacyReopen(fastify: FastifyInstance): Promise<void> {
    const legacy = await fastify.prisma.crm.crmInboxFollowUpJob.findFirst({
      where: {
        eventKind: 'REPORTER_REOPENED',
        status: 'COMPLETED',
        resultAction: 'NO_OP',
        report: {
          is: {
            clarificationStatus: 'PENDING_AGENT',
            status: { notIn: ['CLOSED', 'REJECTED', 'DUPLICATE'] },
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
      select: { reportId: true },
    });
    if (!legacy) return;

    const requeued = await this.enqueue(fastify, legacy.reportId, 'REPORTER_REOPENED', 'legacy', {
      reopenEventPrefix: 'reopen-reanalysis',
    });
    if (!requeued) return;

    await fastify.prisma.crm.crmBugReportAudit.create({
      data: {
        reportId: legacy.reportId,
        action: 'SYSTEM_REOPEN_REANALYSIS_REQUEUED',
        note: 'Đã tự động phát lại re-analysis cho reopen cũ từng bị kết thúc NO_OP.',
      },
    });
  }

  static async enqueue(
    fastify: FastifyInstance,
    reportId: number,
    eventKind: 'CREATED' | 'REPORTER_COMMENT' | 'REPORTER_REOPENED',
    eventVersion: string,
    options: { reopenEventPrefix?: string } = {}
  ) {
    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: {
        audits: { where: { action: 'CONVERSATION_APPLIED' }, take: 1 },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!report || ['CLOSED', 'REJECTED', 'DUPLICATE'].includes(report.status)) return false;
    if (eventKind === 'CREATED' && report.audits.length) return false; // READY guided summary needs no duplicate review.
    const reopenAudit =
      eventKind === 'REPORTER_REOPENED'
        ? await fastify.prisma.crm.crmBugReportAudit.findFirst({
            where: { reportId, action: 'REPORTER_REOPENED' },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          })
        : null;
    if (eventKind === 'REPORTER_REOPENED' && (!reopenAudit?.note || !reopenAudit.note.trim())) return false;
    const reopen: BugReportReopenContext | null = reopenAudit
      ? {
          auditId: reopenAudit.id,
          reason: clean(reopenAudit.note, 2_000),
          reopenedAt: reopenAudit.createdAt.toISOString(),
          originalEvidence: originalEvidenceFromAttachments(report.attachments),
        }
      : null;
    try {
      await fastify.prisma.crm.crmInboxFollowUpJob.create({
        data: {
          id: randomUUID(),
          reportId,
          eventKind,
          // The immutable audit identity, not report.updatedAt, makes retries and rapid comments unambiguous.
          eventVersion: reopen
            ? `${clean(options.reopenEventPrefix || 'reopen', 64)}:${reopen.auditId}`
            : clean(eventVersion, 80),
          eventContextJson: reopen ? JSON.stringify({ reopen }) : null,
          expiresAt: new Date(Date.now() + TTL),
        },
      });
      return true;
    } catch {
      return false;
    } // unique event key makes retries idempotent.
  }
  static async claim(fastify: FastifyInstance, workerId: string): Promise<InboxFollowUpWorkerJob | null> {
    const now = new Date();
    const safeWorker = clean(workerId, 100);
    if (!safeWorker) throw new InboxFollowUpError('Worker ID không hợp lệ.');
    await this.recoverOneLegacyReopen(fastify).catch(() => undefined);
    await fastify.prisma.crm.crmInboxFollowUpJob.updateMany({
      where: { status: 'LEASED', leaseExpiresAt: { lte: now }, expiresAt: { gt: now } },
      data: { status: 'PENDING', leaseToken: null, leasedBy: null, leaseExpiresAt: null },
    });
    const job = await fastify.prisma.crm.crmInboxFollowUpJob.findFirst({
      where: { status: 'PENDING', expiresAt: { gt: now }, attemptCount: { lt: MAX } },
      include: {
        report: { include: { comments: { where: { authorType: 'STAFF' }, orderBy: { createdAt: 'desc' }, take: 3 } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return null;
    const leaseToken = randomUUID();
    const lock = await fastify.prisma.crm.crmInboxFollowUpJob.updateMany({
      where: { id: job.id, status: 'PENDING', updatedAt: job.updatedAt },
      data: {
        status: 'LEASED',
        attemptCount: { increment: 1 },
        leaseToken,
        leasedBy: safeWorker,
        leaseExpiresAt: new Date(now.getTime() + LEASE),
      },
    });
    if (!lock.count) return null;
    const r = job.report;
    const eventContext = safeReopenContext(job.eventContextJson);
    return {
      id: job.id,
      ticketId: r.id,
      ticketKey: formatBugReportKey(r.id, r.requestType as 'BUG' | 'FEATURE'),
      eventKind: job.eventKind as InboxFollowUpWorkerJob['eventKind'],
      context: {
        requestType: r.requestType as 'BUG' | 'FEATURE',
        title: r.title,
        description: r.description,
        status: r.status as InboxFollowUpWorkerJob['context']['status'],
        clarificationStatus: r.clarificationStatus as InboxFollowUpWorkerJob['context']['clarificationStatus'],
        clarificationSummary: r.clarificationSummary,
        sourcePath: r.sourcePath,
        reporterMessages: r.comments.map((item) => clean(item.body, 1200)),
        reopen: eventContext,
      },
      leaseToken,
      attemptCount: job.attemptCount + 1,
    };
  }
  static async complete(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    raw: unknown
  ): Promise<FollowUpCompletion | null> {
    const result = normalizeInboxFollowUpResult(raw);
    const job = await fastify.prisma.crm.crmInboxFollowUpJob.findFirst({
      where: { id, status: 'LEASED', leaseToken, leaseExpiresAt: { gt: new Date() } },
    });
    if (!job) throw new InboxFollowUpError('Lease đã hết hạn.', 409);
    const report = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id: job.reportId } });
    if (!report) throw new InboxFollowUpError('Ticket không còn tồn tại.', 404, 'BUG_NOT_FOUND');
    const completion = resolveInboxFollowUpCompletion(
      result.action,
      report.clarificationStatus as BugReportClarificationStatus,
      job.eventKind as InboxFollowUpWorkerJob['eventKind']
    );
    const becameReady = completion.confirmClarity
      ? await BugReportService.markInboxFollowUpReviewed(fastify, formatBugReportKey(job.reportId), result.note)
      : false;
    if (!completion.confirmClarity && result.action === 'PROGRESS_REVIEWED') {
      await BugReportService.updateAgentProgress(
        fastify,
        formatBugReportKey(job.reportId),
        { stage: 'CHECKING_BUSINESS_LOGIC', note: result.note },
        { dedupeSameStage: true }
      );
    }
    if (result.action === 'ASK_REPORTER')
      await BugReportService.reviewClarificationByAgent(fastify, formatBugReportKey(job.reportId), {
        decision: 'ASK_REPORTER',
        message: result.question!,
      });
    await fastify.prisma.crm.crmInboxFollowUpJob.update({
      where: { id },
      data: { status: 'COMPLETED', resultAction: completion.resultAction, leaseToken: null, leaseExpiresAt: null },
    });
    return becameReady
      ? {
          reportId: job.reportId,
          eventKind: job.eventKind as InboxFollowUpWorkerJob['eventKind'],
          reopen: safeReopenContext(job.eventContextJson),
        }
      : null;
  }

  /**
   * Original ticket evidence is readable only through the currently leased
   * reopen job. This keeps storage paths and public URLs out of worker jobs.
   */
  static async originalEvidenceAttachment(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    attachmentId: number
  ) {
    const job = await fastify.prisma.crm.crmInboxFollowUpJob.findFirst({
      where: {
        id,
        eventKind: 'REPORTER_REOPENED',
        status: 'LEASED',
        leaseToken,
        leaseExpiresAt: { gt: new Date() },
      },
      select: { reportId: true, eventContextJson: true },
    });
    const evidence = safeReopenContext(job?.eventContextJson)?.originalEvidence ?? [];
    if (!job || !evidence.some((item) => item.id === attachmentId)) {
      throw new InboxFollowUpError(
        'Ảnh gốc reopen không còn khả dụng cho lease này.',
        404,
        'REOPEN_EVIDENCE_NOT_FOUND'
      );
    }
    const attachment = await fastify.prisma.crm.crmBugReportAttachment.findFirst({
      where: { id: attachmentId, reportId: job.reportId, commentId: null, deletedAt: null },
    });
    if (!attachment)
      throw new InboxFollowUpError('Ảnh gốc reopen không còn khả dụng.', 404, 'REOPEN_EVIDENCE_UNAVAILABLE');
    try {
      return { attachment, buffer: await BugReportStorage.read(attachment.storagePath) };
    } catch {
      throw new InboxFollowUpError('Ảnh gốc reopen không còn khả dụng.', 404, 'REOPEN_EVIDENCE_UNAVAILABLE');
    }
  }
  static async fail(fastify: FastifyInstance, id: string, leaseToken: string) {
    const job = await fastify.prisma.crm.crmInboxFollowUpJob.findFirst({ where: { id, status: 'LEASED', leaseToken } });
    if (!job) return;
    await fastify.prisma.crm.crmInboxFollowUpJob.update({
      where: { id },
      data:
        job.attemptCount >= MAX
          ? {
              status: 'FAILED',
              fallbackReason: 'Worker unavailable; Inbox vẫn chờ xử lý thủ công.',
              leaseToken: null,
              leaseExpiresAt: null,
            }
          : { status: 'PENDING', leaseToken: null, leasedBy: null, leaseExpiresAt: null },
    });
  }
}
