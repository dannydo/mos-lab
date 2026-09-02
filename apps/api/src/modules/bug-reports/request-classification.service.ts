import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  BUG_REPORT_REQUEST_TYPES,
  REQUEST_CLASSIFICATION_JOB_STATUSES,
  type CreateRequestClassificationJobRequest,
  type RequestClassificationJob,
  type RequestClassificationRecommendation,
  type RequestClassificationWorkerJob,
  type RequestClassificationWorkerResult,
} from '@mos-lab/shared';
import { BugReportStorage } from './bug-report.storage.js';

const JOB_TTL_MS = 30 * 60 * 1000;
const LEASE_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const MAX_ATTACHMENTS = 3;

export class RequestClassificationError extends Error {
  constructor(message: string, readonly statusCode = 400, readonly code = 'REQUEST_CLASSIFICATION_ERROR') {
    super(message);
  }
}

function clipped(value: unknown, maxLength: number): string {
  return Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31));
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}

function safeJson<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function sanitizeContext(input: CreateRequestClassificationJobRequest['context']) {
  return {
    path: clipped(input?.path, 500) || '/',
    pageTitle: clipped(input?.pageTitle, 300),
  };
}

function normalizeAttachments(input: unknown) {
  const values = Array.isArray(input) ? input : [];
  if (values.length > MAX_ATTACHMENTS) throw new RequestClassificationError('Mỗi lần phân loại chỉ nhận tối đa 3 ảnh.');
  return values.slice(0, MAX_ATTACHMENTS);
}

export function normalizeClassificationResult(value: unknown): RequestClassificationRecommendation {
  const input = value && typeof value === 'object' ? (value as Partial<RequestClassificationWorkerResult>) : {};
  const requestType = input.requestType;
  const confidence = Number(input.confidence);
  const rationale = clipped(input.rationale, 1200);
  const clarificationQuestion = clipped(input.clarificationQuestion, 600) || null;
  if (!BUG_REPORT_REQUEST_TYPES.includes(requestType as 'BUG' | 'FEATURE')) {
    throw new RequestClassificationError('Kết quả phân loại có loại yêu cầu không hợp lệ.', 422);
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new RequestClassificationError('Độ tin cậy phân loại phải nằm trong khoảng 0–1.', 422);
  }
  if (rationale.length < 3) throw new RequestClassificationError('Kết quả phân loại thiếu lý do.', 422);
  if (confidence < 0.7 && !clarificationQuestion) {
    throw new RequestClassificationError('Kết quả chưa chắc chắn phải kèm một câu hỏi làm rõ.', 422);
  }
  return { requestType: requestType as 'BUG' | 'FEATURE', confidence, rationale, clarificationQuestion };
}

function jobDto(row: {
  id: string;
  status: string;
  recommendationJson: string | null;
  fallbackReason: string | null;
  expiresAt: Date;
  updatedAt: Date;
}): RequestClassificationJob {
  const recommendation = safeJson<RequestClassificationRecommendation | null>(row.recommendationJson, null);
  return {
    id: row.id,
    status: REQUEST_CLASSIFICATION_JOB_STATUSES.includes(row.status as RequestClassificationJob['status'])
      ? (row.status as RequestClassificationJob['status'])
      : 'FAILED',
    recommendation,
    fallbackReason: row.fallbackReason,
    expiresAt: row.expiresAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class RequestClassificationService {
  static async create(
    fastify: FastifyInstance,
    reporterStaffId: number,
    input: CreateRequestClassificationJobRequest
  ): Promise<RequestClassificationJob> {
    const description = clipped(input?.description, 2000);
    if (description.length < 3) throw new RequestClassificationError('Cần ít nhất 3 ký tự để AI đề xuất loại yêu cầu.');
    const attachments = normalizeAttachments(input?.attachments);
    const now = new Date();
    const id = randomUUID();
    const created = await fastify.prisma.crm.crmRequestClassificationJob.create({
      data: {
        id,
        reporterStaffId,
        description,
        contextJson: JSON.stringify(sanitizeContext(input.context)),
        expiresAt: new Date(now.getTime() + JOB_TTL_MS),
      },
    });

    for (const [index, attachment] of attachments.entries()) {
      let savedPath: string | null = null;
      try {
        const saved = await BugReportStorage.saveClassificationAttachment(id, attachment);
        savedPath = saved.storagePath;
        await fastify.prisma.crm.crmRequestClassificationJobAttachment.create({
          data: {
            jobId: id,
            originalName: clipped(attachment.fileName, 255) || `intake-${index + 1}`,
            storagePath: saved.storagePath,
            mimeType: attachment.mimeType,
            sizeBytes: saved.sizeBytes,
          },
        });
      } catch {
        if (savedPath) await BugReportStorage.remove(savedPath).catch(() => undefined);
        fastify.log.warn({ jobId: id, attachmentIndex: index }, 'Request classification attachment rejected');
      }
    }
    return jobDto(created);
  }

  static async status(fastify: FastifyInstance, reporterStaffId: number, id: string): Promise<RequestClassificationJob> {
    const row = await fastify.prisma.crm.crmRequestClassificationJob.findFirst({ where: { id, reporterStaffId } });
    if (!row) throw new RequestClassificationError('Không tìm thấy yêu cầu phân loại.', 404);
    if (row.status !== 'EXPIRED' && row.expiresAt <= new Date()) {
      const expired = await fastify.prisma.crm.crmRequestClassificationJob.update({
        where: { id },
        data: { status: 'EXPIRED', fallbackReason: 'Đề xuất AI đã hết hạn; bạn vẫn có thể tự chọn loại yêu cầu.' },
      });
      return jobDto(expired);
    }
    return jobDto(row);
  }

  static async heartbeat(fastify: FastifyInstance, workerId: string): Promise<void> {
    const safeWorkerId = clipped(workerId, 100);
    if (!safeWorkerId) throw new RequestClassificationError('Worker ID không hợp lệ.');
    await fastify.prisma.crm.crmRequestClassificationWorkerHeartbeat.upsert({
      where: { workerId: safeWorkerId },
      create: { workerId: safeWorkerId, lastSeenAt: new Date() },
      update: { lastSeenAt: new Date() },
    });
  }

  static async claim(fastify: FastifyInstance, workerId: string): Promise<RequestClassificationWorkerJob | null> {
    const now = new Date();
    await fastify.prisma.crm.crmRequestClassificationJob.updateMany({
      where: { status: 'LEASED', leaseExpiresAt: { lte: now }, expiresAt: { gt: now } },
      data: { status: 'PENDING', leaseToken: null, leasedBy: null, leasedAt: null, leaseExpiresAt: null },
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const row = await fastify.prisma.crm.crmRequestClassificationJob.findFirst({
        where: { status: 'PENDING', expiresAt: { gt: now }, attemptCount: { lt: MAX_ATTEMPTS } },
        orderBy: { createdAt: 'asc' },
      });
      if (!row) return null;
      const leaseToken = randomUUID();
      const update = await fastify.prisma.crm.crmRequestClassificationJob.updateMany({
        where: { id: row.id, status: 'PENDING', updatedAt: row.updatedAt },
        data: {
          status: 'LEASED',
          attemptCount: { increment: 1 },
          leaseToken,
          leasedBy: clipped(workerId, 100),
          leasedAt: now,
          leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        },
      });
      if (update.count !== 1) continue;
      const attachments = await fastify.prisma.crm.crmRequestClassificationJobAttachment.findMany({
        where: { jobId: row.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      const context = safeJson<{ path: string; pageTitle: string }>(row.contextJson, { path: '/', pageTitle: '' });
      return {
        id: row.id,
        description: row.description,
        context,
        attachments: attachments.map((item) => ({ id: item.id, fileName: item.originalName, mimeType: item.mimeType, sizeBytes: item.sizeBytes })),
        attemptCount: row.attemptCount + 1,
        leaseToken,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS).toISOString(),
      };
    }
    return null;
  }

  static async attachment(fastify: FastifyInstance, id: string, attachmentId: number, leaseToken: string): Promise<{ mimeType: string; buffer: Buffer }> {
    const attachment = await fastify.prisma.crm.crmRequestClassificationJobAttachment.findFirst({
      where: { id: attachmentId, jobId: id, deletedAt: null, job: { status: 'LEASED', leaseToken, leaseExpiresAt: { gt: new Date() } } },
    });
    if (!attachment) throw new RequestClassificationError('Ảnh intake không còn khả dụng.', 404);
    return { mimeType: attachment.mimeType, buffer: await BugReportStorage.read(attachment.storagePath) };
  }

  static async complete(fastify: FastifyInstance, id: string, leaseToken: string, result: unknown): Promise<RequestClassificationJob> {
    const recommendation = normalizeClassificationResult(result);
    const update = await fastify.prisma.crm.crmRequestClassificationJob.updateMany({
      where: { id, status: 'LEASED', leaseToken, leaseExpiresAt: { gt: new Date() } },
      data: { status: 'COMPLETED', recommendationJson: JSON.stringify(recommendation), leaseToken: null, leaseExpiresAt: null },
    });
    if (update.count !== 1) throw new RequestClassificationError('Lease phân loại đã hết hạn.', 409);
    return this.statusInternal(fastify, id);
  }

  static async fail(fastify: FastifyInstance, id: string, leaseToken: string, reason: unknown): Promise<void> {
    const fallbackReason = clipped(reason, 400) || 'AI chưa phản hồi; bạn vẫn có thể tự chọn loại yêu cầu.';
    const row = await fastify.prisma.crm.crmRequestClassificationJob.findFirst({ where: { id, status: 'LEASED', leaseToken } });
    if (!row) return;
    await fastify.prisma.crm.crmRequestClassificationJob.update({
      where: { id },
      data:
        row.attemptCount >= MAX_ATTEMPTS || row.expiresAt <= new Date()
          ? { status: 'FAILED', fallbackReason, leaseToken: null, leaseExpiresAt: null }
          : { status: 'PENDING', fallbackReason, leaseToken: null, leasedAt: null, leasedBy: null, leaseExpiresAt: null },
    });
  }

  static async cleanupExpired(fastify: FastifyInstance, now = new Date()): Promise<number> {
    const jobs = await fastify.prisma.crm.crmRequestClassificationJob.findMany({
      where: { expiresAt: { lte: now }, status: { not: 'EXPIRED' } },
      include: { attachments: { where: { deletedAt: null } } },
      take: 500,
    });
    for (const job of jobs) {
      for (const attachment of job.attachments) {
        await BugReportStorage.remove(attachment.storagePath).catch(() => undefined);
      }
      await fastify.prisma.crm.$transaction([
        fastify.prisma.crm.crmRequestClassificationJobAttachment.updateMany({ where: { jobId: job.id, deletedAt: null }, data: { deletedAt: now } }),
        fastify.prisma.crm.crmRequestClassificationJob.update({ where: { id: job.id }, data: { status: 'EXPIRED', fallbackReason: 'Đề xuất AI đã hết hạn; bạn vẫn có thể tự chọn loại yêu cầu.' } }),
      ]);
    }
    return jobs.length;
  }

  private static async statusInternal(fastify: FastifyInstance, id: string): Promise<RequestClassificationJob> {
    const row = await fastify.prisma.crm.crmRequestClassificationJob.findUnique({ where: { id } });
    if (!row) throw new RequestClassificationError('Không tìm thấy yêu cầu phân loại.', 404);
    return jobDto(row);
  }
}
