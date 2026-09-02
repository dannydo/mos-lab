import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  formatBugReportKey,
  type BugReportClarificationStatus,
  type InboxFollowUpWorkerJob,
  type InboxFollowUpWorkerResult,
} from '@mos-lab/shared';
import { BugReportService } from './bug-report.service.js';

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
  if (!['PROGRESS_REVIEWED', 'ASK_REPORTER', 'NO_OP'].includes(action || ''))
    throw new InboxFollowUpError('Hành động follow-up không hợp lệ.', 422);
  if (action === 'ASK_REPORTER' && (!question || question.length < 3))
    throw new InboxFollowUpError('Cần đúng một câu hỏi ngắn.', 422);
  if (action !== 'ASK_REPORTER' && question) throw new InboxFollowUpError('Hành động này không được hỏi thêm.', 422);
  if (!note) throw new InboxFollowUpError('Thiếu ghi chú an toàn.', 422);
  return { action, note, question } as InboxFollowUpWorkerResult;
}

export function resolveInboxFollowUpCompletion(
  action: InboxFollowUpWorkerResult['action'],
  clarificationStatus: BugReportClarificationStatus
): { resultAction: InboxFollowUpWorkerResult['action']; confirmClarity: boolean } {
  if (action === 'ASK_REPORTER') return { resultAction: action, confirmClarity: false };
  if (clarificationStatus === 'PENDING_AGENT') {
    return { resultAction: 'PROGRESS_REVIEWED', confirmClarity: true };
  }
  return { resultAction: action, confirmClarity: false };
}

export class InboxFollowUpService {
  static async enqueue(
    fastify: FastifyInstance,
    reportId: number,
    eventKind: 'CREATED' | 'REPORTER_COMMENT' | 'REPORTER_REOPENED',
    eventVersion: string
  ) {
    const report = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: { audits: { where: { action: 'CONVERSATION_APPLIED' }, take: 1 } },
    });
    if (!report || ['CLOSED', 'REJECTED', 'DUPLICATE'].includes(report.status)) return false;
    if (eventKind === 'CREATED' && report.audits.length) return false; // READY guided summary needs no duplicate review.
    try {
      await fastify.prisma.crm.crmInboxFollowUpJob.create({
        data: {
          id: randomUUID(),
          reportId,
          eventKind,
          eventVersion: clean(eventVersion, 80),
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
  ): Promise<number | null> {
    const result = normalizeInboxFollowUpResult(raw);
    const job = await fastify.prisma.crm.crmInboxFollowUpJob.findFirst({
      where: { id, status: 'LEASED', leaseToken, leaseExpiresAt: { gt: new Date() } },
    });
    if (!job) throw new InboxFollowUpError('Lease đã hết hạn.', 409);
    const report = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id: job.reportId } });
    if (!report) throw new InboxFollowUpError('Ticket không còn tồn tại.', 404, 'BUG_NOT_FOUND');
    const completion = resolveInboxFollowUpCompletion(
      result.action,
      report.clarificationStatus as BugReportClarificationStatus
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
    return becameReady ? job.reportId : null;
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
