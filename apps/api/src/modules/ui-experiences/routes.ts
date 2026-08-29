import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  type CreateUiExperienceRequest,
  type ReviseUiExperienceRequest,
  type RollbackUiExperienceRequest,
  type SetUiExperienceLifecycleRequest,
  type UiExperienceEventRequest,
  type UiExperienceSurface,
} from '@mos-lab/shared';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { UiExperienceError, UiExperienceService } from './ui-experience.service.js';

const PREVIEW_TOKEN_TTL_SECONDS = 15 * 60;
const publicEventWindows = new Map<string, { count: number; resetAt: number }>();

function previewSecret(): string {
  return `ui-experience-preview:${process.env.JWT_SECRET || 'super_secret_mos_lab_jwt_key_development_only'}`;
}

export function createUiExperiencePreviewToken(activationId: number, expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ activationId, expiresAt }), 'utf8').toString('base64url');
  const signature = createHmac('sha256', previewSecret()).update(payload).digest('base64url');
  return `uix1.${payload}.${signature}`;
}

export function verifyUiExperiencePreviewToken(token: string): number {
  const [prefix, payload, signature] = token.split('.');
  if (prefix !== 'uix1' || !payload || !signature) throw new Error('Invalid preview token');
  const expected = createHmac('sha256', previewSecret()).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('Invalid preview signature');
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    activationId?: number;
    expiresAt?: number;
  };
  if (!Number.isInteger(decoded.activationId) || !decoded.expiresAt || decoded.expiresAt <= Date.now()) {
    throw new Error('Expired preview token');
  }
  return Number(decoded.activationId);
}

function actorFrom(request: FastifyRequest) {
  return { id: request.user.id };
}

function numericParam(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new UiExperienceError(`${label} không hợp lệ.`);
  return parsed;
}

function assertPublicEventRate(request: FastifyRequest) {
  const now = Date.now();
  const key = request.ip;
  const current = publicEventWindows.get(key);
  if (!current || current.resetAt <= now) {
    publicEventWindows.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }
  if (current.count >= 120) throw new UiExperienceError('Quá nhiều sự kiện, vui lòng thử lại sau.', 429);
  current.count += 1;
}

function sendError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof UiExperienceError) {
    return reply.status(error.statusCode).send({ error: error.name, message: error.message });
  }
  fastify.log.error(error, context);
  return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý UI Experience.' });
}

export async function uiExperienceRoutes(fastify: FastifyInstance) {
  fastify.get('/ui-experiences/resolve', async (request, reply) => {
    const query = request.query as { surface?: UiExperienceSurface; route?: string; previewToken?: string };
    try {
      let previewActivationId: number | undefined;
      if (query.previewToken) {
        try {
          previewActivationId = verifyUiExperiencePreviewToken(query.previewToken);
        } catch {
          throw new UiExperienceError('Preview token không hợp lệ hoặc đã hết hạn.', 403);
        }
      }
      return reply.send(
        await UiExperienceService.resolve(
          fastify,
          query.surface as UiExperienceSurface,
          String(query.route || ''),
          previewActivationId
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Resolve UI experience error');
    }
  });

  fastify.post('/ui-experiences/events', async (request, reply) => {
    try {
      assertPublicEventRate(request);
      await UiExperienceService.recordEvent(fastify, request.body as UiExperienceEventRequest);
      return reply.status(202).send({ accepted: true });
    } catch (error) {
      return sendError(fastify, reply, error, 'Record UI experience event error');
    }
  });

  const adminGuard = { preHandler: [requireAuth, requireRole('admin')] };

  fastify.get('/ui-experiences', adminGuard, async (_request, reply) => {
    try {
      return reply.send(await UiExperienceService.list(fastify));
    } catch (error) {
      return sendError(fastify, reply, error, 'List UI experiences error');
    }
  });

  fastify.post('/ui-experiences', adminGuard, async (request, reply) => {
    try {
      const data = await UiExperienceService.create(
        fastify,
        actorFrom(request),
        request.body as CreateUiExperienceRequest
      );
      return reply.status(201).send({ data });
    } catch (error) {
      return sendError(fastify, reply, error, 'Create UI experience error');
    }
  });

  fastify.put('/ui-experiences/:id/revisions', adminGuard, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Activation ID');
      const data = await UiExperienceService.revise(
        fastify,
        actorFrom(request),
        id,
        request.body as ReviseUiExperienceRequest
      );
      return reply.send({ data });
    } catch (error) {
      return sendError(fastify, reply, error, 'Revise UI experience error');
    }
  });

  fastify.post('/ui-experiences/:id/lifecycle', adminGuard, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Activation ID');
      const payload = request.body as SetUiExperienceLifecycleRequest;
      const data = await UiExperienceService.setLifecycle(fastify, actorFrom(request), id, payload.lifecycle);
      return reply.send({ data });
    } catch (error) {
      return sendError(fastify, reply, error, 'Set UI experience lifecycle error');
    }
  });

  fastify.post('/ui-experiences/:id/rollback', adminGuard, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Activation ID');
      const payload = request.body as RollbackUiExperienceRequest;
      const revisionId = numericParam(String(payload?.revisionId || ''), 'Revision ID');
      const data = await UiExperienceService.rollback(fastify, actorFrom(request), id, revisionId);
      return reply.send({ data });
    } catch (error) {
      return sendError(fastify, reply, error, 'Rollback UI experience error');
    }
  });

  fastify.post('/ui-experiences/:id/preview-token', adminGuard, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Activation ID');
      await UiExperienceService.getPreviewActivation(fastify, id);
      const expiresAt = Date.now() + PREVIEW_TOKEN_TTL_SECONDS * 1000;
      const token = createUiExperiencePreviewToken(id, expiresAt);
      return reply.send({
        token,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    } catch (error) {
      return sendError(fastify, reply, error, 'Create UI experience preview token error');
    }
  });
}
