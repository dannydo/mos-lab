import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  BUG_REPORT_REQUEST_TYPES,
  REQUEST_CONVERSATION_STATUSES,
  type BugReportRequestType,
  type CreateRequestConversationRequest,
  type RequestConversation,
  type RequestConversationMessage,
  type RequestConversationSummary,
  type RequestConversationWorkerJob,
  type RequestConversationWorkerResult,
} from '@mos-lab/shared';

const TTL_MS = 30 * 60 * 1000;
const LEASE_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const SUMMARY_FIELDS = [
  'whereItHappened',
  'userAction',
  'observedResult',
  'expectedResult',
  'impact',
  'userOrAudience',
  'problem',
  'desiredOutcome',
  'currentWorkaround',
  'priorityOrImpact',
  'constraints',
] as const;

export class RequestConversationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'REQUEST_CONVERSATION_ERROR'
  ) {
    super(message);
  }
}

function clipped(value: unknown, max: number): string {
  return Array.from(String(value ?? ''))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31));
    })
    .join('')
    .trim()
    .slice(0, max);
}
function json<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function emptyConversationSummary(requestType: BugReportRequestType = 'BUG'): RequestConversationSummary {
  return {
    requestType,
    whereItHappened: null,
    userAction: null,
    observedResult: null,
    expectedResult: null,
    impact: null,
    userOrAudience: null,
    problem: null,
    desiredOutcome: null,
    currentWorkaround: null,
    priorityOrImpact: null,
    constraints: null,
  };
}
export function normalizeConversationResult(value: unknown): RequestConversationWorkerResult {
  const input = value && typeof value === 'object' ? (value as Partial<RequestConversationWorkerResult>) : {};
  const requestType = input.requestType;
  if (!BUG_REPORT_REQUEST_TYPES.includes(requestType as BugReportRequestType))
    throw new RequestConversationError('Kết quả hội thoại có loại yêu cầu không hợp lệ.', 422);
  const source =
    input.summary && typeof input.summary === 'object' ? (input.summary as Partial<RequestConversationSummary>) : {};
  const summary = emptyConversationSummary(requestType as BugReportRequestType);
  for (const field of SUMMARY_FIELDS) summary[field] = clipped(source[field], 800) || null;
  const nextQuestion = clipped(input.nextQuestion, 500) || null;
  const readyToSubmit = input.readyToSubmit === true;
  if (!readyToSubmit && !nextQuestion) throw new RequestConversationError('Mỗi lượt cần đúng một câu hỏi ngắn.', 422);
  if (readyToSubmit && nextQuestion) throw new RequestConversationError('Tóm tắt sẵn sàng không được hỏi thêm.', 422);
  return { requestType: requestType as BugReportRequestType, summary, nextQuestion, readyToSubmit };
}
function dto(row: {
  id: string;
  status: string;
  summaryJson: string;
  messagesJson: string;
  nextQuestion: string | null;
  fallbackReason: string | null;
  expiresAt: Date;
  updatedAt: Date;
}): RequestConversation {
  const summary = json<RequestConversationSummary>(row.summaryJson, emptyConversationSummary());
  const messages = json<RequestConversationMessage[]>(row.messagesJson, []).slice(-20);
  return {
    id: row.id,
    status: REQUEST_CONVERSATION_STATUSES.includes(row.status as RequestConversation['status'])
      ? (row.status as RequestConversation['status'])
      : 'FAILED',
    summary,
    messages,
    nextQuestion: row.nextQuestion,
    fallbackReason: row.fallbackReason,
    expiresAt: row.expiresAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
function context(input: CreateRequestConversationRequest['context']) {
  return { path: clipped(input?.path, 500) || '/', pageTitle: clipped(input?.pageTitle, 300) };
}

export class RequestConversationService {
  static async create(
    fastify: FastifyInstance,
    reporterStaffId: number,
    input: CreateRequestConversationRequest
  ): Promise<RequestConversation> {
    const description = clipped(input?.description, 2000);
    if (description.length < 3) throw new RequestConversationError('Cần ít nhất 3 ký tự để bắt đầu làm rõ.');
    const preferredRequestType =
      input?.preferredRequestType && BUG_REPORT_REQUEST_TYPES.includes(input.preferredRequestType)
        ? input.preferredRequestType
        : null;
    const id = randomUUID();
    const now = new Date();
    const messages: RequestConversationMessage[] = [
      { id: randomUUID(), role: 'REPORTER', body: description, createdAt: now.toISOString() },
    ];
    const attachmentCount = Math.min(3, Math.max(0, Math.trunc(Number(input.attachmentCount) || 0)));
    const created = await fastify.prisma.crm.crmRequestConversation.create({
      data: {
        id,
        reporterStaffId,
        preferredRequestType,
        description,
        contextJson: JSON.stringify(context(input.context)),
        attachmentCount,
        summaryJson: JSON.stringify(emptyConversationSummary(preferredRequestType || 'BUG')),
        messagesJson: JSON.stringify(messages),
        expiresAt: new Date(now.getTime() + TTL_MS),
        audits: {
          create: { action: 'CREATED', metadataJson: JSON.stringify({ preferredRequestType, attachmentCount }) },
        },
      },
    });
    return dto(created);
  }
  static async status(fastify: FastifyInstance, reporterStaffId: number, id: string): Promise<RequestConversation> {
    const row = await fastify.prisma.crm.crmRequestConversation.findFirst({ where: { id, reporterStaffId } });
    if (!row) throw new RequestConversationError('Không tìm thấy phiên làm rõ.', 404);
    if (row.status !== 'EXPIRED' && row.expiresAt <= new Date())
      return dto(
        await fastify.prisma.crm.crmRequestConversation.update({
          where: { id },
          data: { status: 'EXPIRED', fallbackReason: 'Phiên AI đã hết hạn; bạn vẫn có thể tự nhập theo gợi ý.' },
        })
      );
    return dto(row);
  }
  static async reply(
    fastify: FastifyInstance,
    reporterStaffId: number,
    id: string,
    value: unknown
  ): Promise<RequestConversation> {
    const row = await fastify.prisma.crm.crmRequestConversation.findFirst({ where: { id, reporterStaffId } });
    if (!row) throw new RequestConversationError('Không tìm thấy phiên làm rõ.', 404);
    if (row.status !== 'WAITING_REPORTER' || row.expiresAt <= new Date())
      throw new RequestConversationError('Phiên này không còn chờ phản hồi.', 409);
    const body = clipped((value as { message?: unknown })?.message, 1200);
    if (body.length < 1) throw new RequestConversationError('Vui lòng trả lời ngắn hoặc chọn Bỏ qua.');
    const messages = json<RequestConversationMessage[]>(row.messagesJson, []);
    messages.push({ id: randomUUID(), role: 'REPORTER', body, createdAt: new Date().toISOString() });
    const updated = await fastify.prisma.crm.crmRequestConversation.update({
      where: { id },
      data: {
        messagesJson: JSON.stringify(messages.slice(-20)),
        status: 'PENDING',
        nextQuestion: null,
        fallbackReason: null,
        audits: {
          create: {
            action: 'REPORTER_REPLIED',
            metadataJson: JSON.stringify({ length: body.length, skipped: /^bỏ qua/i.test(body) }),
          },
        },
      },
    });
    return dto(updated);
  }
  static async claim(fastify: FastifyInstance, workerId: string): Promise<RequestConversationWorkerJob | null> {
    const now = new Date();
    const safeWorker = clipped(workerId, 100);
    if (!safeWorker) throw new RequestConversationError('Worker ID không hợp lệ.');
    await fastify.prisma.crm.crmRequestConversation.updateMany({
      where: { status: 'LEASED', leaseExpiresAt: { lte: now }, expiresAt: { gt: now } },
      data: { status: 'PENDING', leaseToken: null, leasedBy: null, leasedAt: null, leaseExpiresAt: null },
    });
    for (let index = 0; index < 3; index += 1) {
      const row = await fastify.prisma.crm.crmRequestConversation.findFirst({
        where: { status: 'PENDING', expiresAt: { gt: now }, attemptCount: { lt: MAX_ATTEMPTS } },
        orderBy: { createdAt: 'asc' },
      });
      if (!row) return null;
      const leaseToken = randomUUID();
      const updated = await fastify.prisma.crm.crmRequestConversation.updateMany({
        where: { id: row.id, status: 'PENDING', updatedAt: row.updatedAt },
        data: {
          status: 'LEASED',
          attemptCount: { increment: 1 },
          leaseToken,
          leasedBy: safeWorker,
          leasedAt: now,
          leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        },
      });
      if (!updated.count) continue;
      return {
        id: row.id,
        description: row.description,
        preferredRequestType: row.preferredRequestType as BugReportRequestType | null,
        context: json(row.contextJson, { path: '/', pageTitle: '' }),
        attachmentCount: row.attachmentCount,
        summary: json(row.summaryJson, emptyConversationSummary()),
        messages: json(row.messagesJson, []),
        leaseToken,
        attemptCount: row.attemptCount + 1,
      };
    }
    return null;
  }
  static async complete(
    fastify: FastifyInstance,
    id: string,
    leaseToken: string,
    value: unknown
  ): Promise<RequestConversation> {
    const result = normalizeConversationResult(value);
    const now = new Date();
    const row = await fastify.prisma.crm.crmRequestConversation.findFirst({
      where: { id, status: 'LEASED', leaseToken, leaseExpiresAt: { gt: now } },
    });
    if (!row) throw new RequestConversationError('Lease hội thoại đã hết hạn.', 409);
    const messages = json<RequestConversationMessage[]>(row.messagesJson, []);
    if (result.nextQuestion)
      messages.push({ id: randomUUID(), role: 'ASSISTANT', body: result.nextQuestion, createdAt: now.toISOString() });
    const updated = await fastify.prisma.crm.crmRequestConversation.update({
      where: { id },
      data: {
        status: result.readyToSubmit ? 'READY' : 'WAITING_REPORTER',
        summaryJson: JSON.stringify(result.summary),
        messagesJson: JSON.stringify(messages.slice(-20)),
        nextQuestion: result.nextQuestion,
        readyAt: result.readyToSubmit ? now : null,
        leaseToken: null,
        leasedAt: null,
        leasedBy: null,
        leaseExpiresAt: null,
        audits: {
          create: {
            action: result.readyToSubmit ? 'SUMMARY_READY' : 'QUESTION_ASKED',
            metadataJson: JSON.stringify({
              requestType: result.requestType,
              summaryFieldCount: SUMMARY_FIELDS.filter((field) => Boolean(result.summary[field])).length,
            }),
          },
        },
      },
    });
    return dto(updated);
  }
  static async fail(fastify: FastifyInstance, id: string, leaseToken: string, reason: unknown): Promise<void> {
    const row = await fastify.prisma.crm.crmRequestConversation.findFirst({
      where: { id, status: 'LEASED', leaseToken },
    });
    if (!row) return;
    const fallbackReason = clipped(reason, 400) || 'AI đang chậm; bạn vẫn có thể tự điền theo gợi ý.';
    const retryData =
      row.attemptCount >= MAX_ATTEMPTS || row.expiresAt <= new Date()
        ? { status: 'FAILED', fallbackReason, leaseToken: null, leaseExpiresAt: null }
        : { status: 'PENDING', fallbackReason, leaseToken: null, leasedAt: null, leasedBy: null, leaseExpiresAt: null };
    await fastify.prisma.crm.crmRequestConversation.update({
      where: { id },
      data: {
        ...retryData,
        audits: { create: { action: 'WORKER_RETRY', metadataJson: JSON.stringify({ attempt: row.attemptCount }) } },
      },
    });
  }
  static async cleanupExpired(fastify: FastifyInstance, now = new Date()): Promise<number> {
    const result = await fastify.prisma.crm.crmRequestConversation.updateMany({
      where: { expiresAt: { lte: now }, status: { not: 'EXPIRED' } },
      data: { status: 'EXPIRED', fallbackReason: 'Phiên AI đã hết hạn; bạn vẫn có thể tự nhập theo gợi ý.' },
    });
    return result.count;
  }
}
