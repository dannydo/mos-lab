import type { FastifyInstance, FastifyReply } from 'fastify';
import type { CreatePilotSessionRequest, PilotSessionsQuery, UpdatePilotSessionRequest } from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../middlewares/auth.js';
import { PilotService, PilotServiceError } from './pilot.service.js';

function sendError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, action: string) {
  if (error instanceof PilotServiceError) {
    return reply.status(error.statusCode).send({ error: error.code, message: error.message });
  }
  fastify.log.error(error as Error, action);
  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Đã có lỗi xảy ra trong quá trình xử lý ca pilot.',
  });
}

export async function pilotRoutes(fastify: FastifyInstance) {
  // Check feature flag
  fastify.get('/pilot/feature-flag', async (_request, reply) => {
    try {
      const enabled = await PilotService.isFeatureEnabled(fastify);
      return reply.send({ enabled, pilotCode: PilotService.DEFAULT_PILOT_CODE });
    } catch (error) {
      return sendError(fastify, reply, error, 'Check pilot feature flag error');
    }
  });

  // Get pilot sessions list + summary metrics
  fastify.get('/pilot/sessions', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as PilotSessionsQuery;
      const data = await PilotService.listSessions(fastify, query);
      return reply.send(data);
    } catch (error) {
      return sendError(fastify, reply, error, 'List pilot sessions error');
    }
  });

  // Get metrics only
  fastify.get('/pilot/metrics', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as PilotSessionsQuery;
      const data = await PilotService.listSessions(fastify, query);
      return reply.send(data.metrics);
    } catch (error) {
      return sendError(fastify, reply, error, 'Get pilot metrics error');
    }
  });

  // Create new session
  fastify.post('/pilot/sessions', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const user = request.user as JwtUserPayload;
      const body = request.body as CreatePilotSessionRequest;
      const created = await PilotService.createSession(fastify, body, user?.id);
      return reply.status(201).send(created);
    } catch (error) {
      return sendError(fastify, reply, error, 'Create pilot session error');
    }
  });

  // Update existing session
  fastify.patch('/pilot/sessions/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const body = request.body as UpdatePilotSessionRequest;
      const updated = await PilotService.updateSession(fastify, id, body);
      return reply.send(updated);
    } catch (error) {
      return sendError(fastify, reply, error, 'Update pilot session error');
    }
  });

  // Delete session
  fastify.delete('/pilot/sessions/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const result = await PilotService.deleteSession(fastify, id);
      return reply.send(result);
    } catch (error) {
      return sendError(fastify, reply, error, 'Delete pilot session error');
    }
  });
}
