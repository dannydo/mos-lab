import type { FastifyInstance } from 'fastify';
import type {
  AfterPhotoPilotSessionRequest,
  BeforePhotoPilotSessionRequest,
  CheckInPilotSessionRequest,
  CheckOutPilotSessionRequest,
  CreatePilotSessionRequest,
  FeedbackPilotSessionRequest,
  FinishSessionStepRequest,
  PilotAiAnalyzeRequest,
  PilotSessionsQuery,
  SavePilotAssessmentRequest,
  ServiceDonePilotSessionRequest,
  StartSessionStepRequest,
  UpdatePilotSessionRequest,
  UpdateSessionStepNoteRequest,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { PilotService } from '../pilot.service.js';
import { sendPilotError } from './pilot-route-helpers.js';

export function registerPilotSessionRoutes(fastify: FastifyInstance): void {
  // Save session assessment result (PASS / FAIL)
  fastify.post('/pilot/sessions/:id/assessment', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const body = request.body as SavePilotAssessmentRequest;
      const session = await PilotService.saveAssessment(fastify, id, body);
      return reply.send(session);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Save pilot session assessment error');
    }
  });

  // AI Analyze Lash Assessment (MOS-FEAT-66)
  fastify.post('/pilot/sessions/:id/ai-analyze', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const body = request.body as PilotAiAnalyzeRequest;
      const result = await PilotService.aiAnalyzeSession(fastify, id, body);
      return reply.send(result);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'AI analyze lash assessment error');
    }
  });

  // ═══════════════════════════════════════════
  // Pilot Session Technical Step Timer Endpoints
  // ═══════════════════════════════════════════

  // Get/initialize session steps
  fastify.get('/pilot/sessions/:id/steps', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const steps = await PilotService.getSessionSteps(fastify, id);
      return reply.send(steps);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Get pilot session steps error');
    }
  });

  // Start step timer
  fastify.post('/pilot/sessions/:id/steps/:stepId/start', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string; stepId: string };
      const id = parseInt(params.id, 10);
      const stepId = parseInt(params.stepId, 10);
      if (isNaN(id) || id <= 0 || isNaN(stepId) || stepId <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca hoặc ID bước không hợp lệ.' });
      }
      const body = (request.body || {}) as StartSessionStepRequest;
      const updated = await PilotService.startSessionStep(fastify, id, stepId, body.startedAt);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Start session step error');
    }
  });

  // Finish step timer
  fastify.post('/pilot/sessions/:id/steps/:stepId/finish', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string; stepId: string };
      const id = parseInt(params.id, 10);
      const stepId = parseInt(params.stepId, 10);
      if (isNaN(id) || id <= 0 || isNaN(stepId) || stepId <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca hoặc ID bước không hợp lệ.' });
      }
      const body = (request.body || {}) as FinishSessionStepRequest;
      const updated = await PilotService.finishSessionStep(fastify, id, stepId, body.finishedAt, body.note);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Finish session step error');
    }
  });

  // Update step note
  fastify.patch('/pilot/sessions/:id/steps/:stepId/note', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string; stepId: string };
      const id = parseInt(params.id, 10);
      const stepId = parseInt(params.stepId, 10);
      if (isNaN(id) || id <= 0 || isNaN(stepId) || stepId <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca hoặc ID bước không hợp lệ.' });
      }
      const body = request.body as UpdateSessionStepNoteRequest;
      const updated = await PilotService.updateSessionStepNote(fastify, id, stepId, body?.note || '');
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Update session step note error');
    }
  });

  // Reset step
  fastify.post('/pilot/sessions/:id/steps/:stepId/reset', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string; stepId: string };
      const id = parseInt(params.id, 10);
      const stepId = parseInt(params.stepId, 10);
      if (isNaN(id) || id <= 0 || isNaN(stepId) || stepId <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca hoặc ID bước không hợp lệ.' });
      }
      const updated = await PilotService.resetSessionStep(fastify, id, stepId);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Reset session step error');
    }
  });

  // Get pilot sessions list + summary metrics
  fastify.get('/pilot/sessions', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as PilotSessionsQuery;
      const data = await PilotService.listSessions(fastify, query);
      return reply.send(data);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'List pilot sessions error');
    }
  });

  // Get metrics only
  fastify.get('/pilot/metrics', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as PilotSessionsQuery;
      const data = await PilotService.listSessions(fastify, query);
      return reply.send(data.metrics);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Get pilot metrics error');
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
      return sendPilotError(fastify, reply, error, 'Create pilot session error');
    }
  });

  // Step 2: Check-in
  fastify.post('/pilot/sessions/:id/check-in', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const body = (request.body || {}) as CheckInPilotSessionRequest;
      const updated = await PilotService.checkIn(fastify, id, body.checkInAt);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Pilot check-in error');
    }
  });

  // Step 3: Before Photo
  fastify.post('/pilot/sessions/:id/before-photo', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const body = request.body as BeforePhotoPilotSessionRequest;
      const updated = await PilotService.saveBeforePhoto(fastify, id, body?.beforePhotoUrl);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Pilot before photo error');
    }
  });

  // Step 4: Service Done
  fastify.post('/pilot/sessions/:id/service-done', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const body = (request.body || {}) as ServiceDonePilotSessionRequest;
      const updated = await PilotService.markServiceDone(fastify, id, body.serviceDoneAt);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Pilot service done error');
    }
  });

  // Step 5: After Photo
  fastify.post('/pilot/sessions/:id/after-photo', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const body = request.body as AfterPhotoPilotSessionRequest;
      const updated = await PilotService.saveAfterPhoto(fastify, id, body?.afterPhotoUrl);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Pilot after photo error');
    }
  });

  // Step 6: Customer Feedback
  fastify.post('/pilot/sessions/:id/feedback', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const body = request.body as FeedbackPilotSessionRequest;
      const updated = await PilotService.saveFeedback(fastify, id, body?.feedbackRating, body?.feedbackNote);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Pilot feedback error');
    }
  });

  // Step 7: Check-out
  fastify.post('/pilot/sessions/:id/check-out', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const body = (request.body || {}) as CheckOutPilotSessionRequest;
      const updated = await PilotService.checkOut(fastify, id, body.checkOutAt);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Pilot check-out error');
    }
  });

  // Upload photo utility
  fastify.post('/pilot/upload-photo', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as { photoData: string; mimeType?: string; filename?: string };
      const result = await PilotService.uploadPhoto(fastify, body);
      return reply.send(result);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Upload pilot photo error');
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
      return sendPilotError(fastify, reply, error, 'Update pilot session error');
    }
  });

  // Manually or automatically deduct BOM materials from physical stock inventory
  fastify.post('/pilot/sessions/:id/deduct-stock', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID ca pilot không hợp lệ.' });
      }
      const result = await PilotService.deductStockForSession(fastify, id);
      return reply.send(result);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Deduct pilot session stock error');
    }
  });

  // Get physical stock inventory list
  fastify.get('/pilot/inventory', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as { warehouse?: string };
      const items = await PilotService.listStockInventory(fastify, query?.warehouse);
      return reply.send(items);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Get pilot inventory error');
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
      return sendPilotError(fastify, reply, error, 'Delete pilot session error');
    }
  });
}
