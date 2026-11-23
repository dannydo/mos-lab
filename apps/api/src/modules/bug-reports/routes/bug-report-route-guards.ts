import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isAdminOrSuperAdminRole, isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../../middlewares/auth.js';
import { BugReportError, BugReportService } from '../bug-report.service.js';
import { InboxFollowUpError } from '../inbox-follow-up.service.js';
import { InboxImplementationError } from '../inbox-implementation.service.js';
import { InboxPlanError } from '../inbox-plan.service.js';
import { RequestClassificationError } from '../request-classification.service.js';
import { RequestClassifierWorkerHealthError } from '../request-classifier-worker-health.service.js';
import { RequestConversationError } from '../request-conversation.service.js';

const WORKER_RATE_LIMIT_WINDOW_MS = 60_000;
const WORKER_RATE_LIMIT_MAX_REQUESTS = 180;
const classifierWorkerRateBuckets = new Map<string, { startedAt: number; count: number }>();

export const BUG_REPORT_BODY_LIMIT = 60 * 1024 * 1024; // 60MB payload limit for up to 10 photos of 5MB in base64

export function numericParam(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new BugReportError(`${label} không hợp lệ.`);
  return parsed;
}

export async function requireDanny(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtUserPayload | undefined;
  if (!user) return reply.status(401).send({ error: 'Unauthorized', message: 'Vui lòng đăng nhập.' });
  if (!canManageBugInbox(user)) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ Danny được quyền quản lý Bug Inbox.' });
  }
}

export async function requireBugInboxRead(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtUserPayload | undefined;
  if (!user) return reply.status(401).send({ error: 'Unauthorized', message: 'Vui lòng đăng nhập.' });
  if (!canReadBugInbox(user)) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ Admin được xem mOS Inbox.' });
  }
}

function agentToken(): string {
  return String(process.env.MOS_BUG_AGENT_TOKEN || '').trim();
}

export function classifierWorkerToken(): string {
  return String(process.env.MOS_REQUEST_CLASSIFIER_WORKER_TOKEN || '').trim();
}

function ideReleaseCheckpointToken(): string {
  return String(process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN || '').trim();
}

function ideTaskBridgeToken(): string {
  return String(process.env.MOS_IDE_TASK_BRIDGE_TOKEN || '').trim();
}

function secureTokenEqual(actual: string, expected: string): boolean {
  const actualHash = createHash('sha256').update(actual).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

export function canManageBugInbox(user: Pick<JwtUserPayload, 'role' | 'username' | 'email'>): boolean {
  return isSuperAdminRole(user.role) && isCanonicalSuperAdminIdentity(user);
}

export function canReadBugInbox(user: Pick<JwtUserPayload, 'role'>): boolean {
  return isAdminOrSuperAdminRole(user.role);
}

export function isValidAgentAuthorization(header: string, expected: string): boolean {
  if (expected.trim().length < 32) return false;
  const actual =
    String(header || '')
      .match(/^Bearer\s+(.+)$/i)?.[1]
      ?.trim() || '';
  return Boolean(actual && secureTokenEqual(actual, expected.trim()));
}

/** A small process-local guard for the single outbound worker bridge. */
export function consumeClassifierWorkerRateLimit(clientKey: string, now = Date.now()): boolean {
  const key = clippedRateLimitKey(clientKey);
  const current = classifierWorkerRateBuckets.get(key);
  if (!current || now - current.startedAt >= WORKER_RATE_LIMIT_WINDOW_MS) {
    classifierWorkerRateBuckets.set(key, { startedAt: now, count: 1 });
    if (classifierWorkerRateBuckets.size > 500) {
      for (const [candidate, bucket] of classifierWorkerRateBuckets) {
        if (now - bucket.startedAt >= WORKER_RATE_LIMIT_WINDOW_MS) classifierWorkerRateBuckets.delete(candidate);
      }
    }
    return true;
  }
  if (current.count >= WORKER_RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function clippedRateLimitKey(value: unknown): string {
  return (
    String(value || 'unknown')
      .trim()
      .slice(0, 160) || 'unknown'
  );
}

export function workerClientKey(request: FastifyRequest): string {
  return `${request.ip || 'unknown'}:${String(request.headers['x-worker-id'] || 'worker').slice(0, 100)}`;
}

export async function requireAgent(request: FastifyRequest, reply: FastifyReply) {
  const expected = agentToken();
  if (expected.length < 32) {
    request.log.error('MOS_BUG_AGENT_TOKEN is missing or shorter than 32 characters');
    return reply.status(503).send({ error: 'Agent Bridge Unavailable', message: 'Agent Bridge chưa được cấu hình.' });
  }
  const header = String(request.headers.authorization || '');
  if (!isValidAgentAuthorization(header, expected)) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Agent token không hợp lệ.' });
  }
}

export async function requireClassifierWorker(request: FastifyRequest, reply: FastifyReply) {
  const expected = classifierWorkerToken();
  const bridgeToken = ideTaskBridgeToken();
  if (expected.length < 32 && bridgeToken.length < 32) {
    request.log.error('MOS_REQUEST_CLASSIFIER_WORKER_TOKEN and MOS_IDE_TASK_BRIDGE_TOKEN are missing or too short');
    return reply
      .status(503)
      .send({ error: 'Classifier Worker Unavailable', message: 'Worker phân loại chưa được cấu hình.' });
  }
  const auth = String(request.headers.authorization || '');
  const isClassifierValid = expected.length >= 32 && isValidAgentAuthorization(auth, expected);
  const isBridgeValid = bridgeToken.length >= 32 && isValidAgentAuthorization(auth, bridgeToken);
  if (!isClassifierValid && !isBridgeValid) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Worker token không hợp lệ.' });
  }
  if (!consumeClassifierWorkerRateLimit(workerClientKey(request))) {
    return reply.status(429).send({ error: 'Too Many Requests', message: 'Worker bridge đang gửi quá nhiều yêu cầu.' });
  }
}

export async function requireIdeReleasePublisher(request: FastifyRequest, reply: FastifyReply) {
  const expected = ideReleaseCheckpointToken();
  if (expected.length < 32) {
    request.log.error('MOS_IDE_RELEASE_CHECKPOINT_TOKEN is missing or shorter than 32 characters');
    return reply
      .status(503)
      .send({ error: 'IDE Release Publisher Unavailable', message: 'IDE release publisher chưa được cấu hình.' });
  }
  if (!isValidAgentAuthorization(String(request.headers.authorization || ''), expected))
    return reply.status(401).send({ error: 'Unauthorized', message: 'IDE release publisher token không hợp lệ.' });
}

export async function requireIdeTaskBridge(request: FastifyRequest, reply: FastifyReply) {
  const expected = ideTaskBridgeToken();
  if (expected.length < 32)
    return reply
      .status(503)
      .send({ error: 'IDE Task Bridge Unavailable', message: 'IDE task bridge chưa được cấu hình.' });
  if (!isValidAgentAuthorization(String(request.headers.authorization || ''), expected))
    return reply.status(401).send({ error: 'Unauthorized', message: 'IDE task bridge token không hợp lệ.' });
}

export function sendError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, context: string) {
  if (
    error instanceof BugReportError ||
    error instanceof RequestClassificationError ||
    error instanceof RequestConversationError ||
    error instanceof InboxFollowUpError ||
    error instanceof InboxPlanError ||
    error instanceof InboxImplementationError ||
    error instanceof RequestClassifierWorkerHealthError
  ) {
    return reply.status(error.statusCode).send({ error: error.code, message: error.message, code: error.code });
  }
  fastify.log.error(error, context);
  return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý Bug Inbox.' });
}

export function sendAttachment(reply: FastifyReply, value: Awaited<ReturnType<typeof BugReportService.attachment>>) {
  const safeName = encodeURIComponent(value.attachment.originalName || `attachment-${value.attachment.id}`);
  return reply
    .header('Content-Type', value.attachment.mimeType)
    .header('Content-Length', String(value.buffer.length))
    .header('Cache-Control', 'private, max-age=86400, immutable')
    .header('Content-Disposition', `inline; filename*=UTF-8''${safeName}`)
    .send(value.buffer);
}
