import type { FastifyInstance, FastifyReply } from 'fastify';
import type {
  ExperienceJournalListQuery,
  RecordExperienceJournalEventRequest,
  TriageExperienceJournalFingerprintRequest,
} from '@mos-lab/shared';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { ExperienceJournalError, ExperienceJournalService } from './experience-journal.service.js';

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof ExperienceJournalError)
    return reply.status(error.statusCode).send({ error: error.name, message: error.message });
  return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý nhật ký vận hành.' });
}

export async function experienceJournalRoutes(fastify: FastifyInstance) {
  const adminGuard = { preHandler: [requireAuth, requireRole(['admin'])] };
  fastify.get('/experience-journal', adminGuard, async (request, reply) => {
    try {
      return reply.send(await ExperienceJournalService.list(fastify, request.query as ExperienceJournalListQuery));
    } catch (error) {
      return sendError(reply, error);
    }
  });
  fastify.post('/experience-journal/events', adminGuard, async (request, reply) => {
    try {
      return reply.status(201).send({
        data: await ExperienceJournalService.record(fastify, request.body as RecordExperienceJournalEventRequest),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });
  fastify.patch('/experience-journal/:fingerprint', adminGuard, async (request, reply) => {
    try {
      return reply.send({
        data: await ExperienceJournalService.triage(
          fastify,
          request.user.id,
          (request.params as { fingerprint: string }).fingerprint,
          request.body as TriageExperienceJournalFingerprintRequest
        ),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
