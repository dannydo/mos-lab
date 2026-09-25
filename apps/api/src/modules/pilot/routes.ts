import { basename, join } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type {
  AfterPhotoPilotSessionRequest,
  BeforePhotoPilotSessionRequest,
  CheckInPilotSessionRequest,
  CheckOutPilotSessionRequest,
  CreatePilotMaterialRequest,
  CreatePilotSessionRequest,
  CreatePilotSopStepRequest,
  FeedbackPilotSessionRequest,
  FinishSessionStepRequest,
  PilotSessionsQuery,
  ReorderPilotSopStepsRequest,
  ServiceDonePilotSessionRequest,
  StartSessionStepRequest,
  UpdatePilotMaterialRequest,
  UpdatePilotSessionRequest,
  UpdatePilotSopStepRequest,
  UpdateSessionStepNoteRequest,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../middlewares/auth.js';
import { PilotService, PilotServiceError, pilotMediaDir } from './pilot.service.js';

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
  // Public media access for pilot photos
  fastify.get('/pilot/media/:filename', async (request, reply) => {
    try {
      const { filename } = request.params as { filename: string };
      const safeName = basename(filename);
      const dir = pilotMediaDir();
      const filePath = join(dir, safeName);
      const content = await readFile(filePath);
      let mimeType = 'image/jpeg';
      if (safeName.endsWith('.png')) mimeType = 'image/png';
      else if (safeName.endsWith('.webp')) mimeType = 'image/webp';
      return reply.type(mimeType).send(content);
    } catch {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Không tìm thấy hình ảnh.' });
    }
  });

  // Check feature flag
  fastify.get('/pilot/feature-flag', async (_request, reply) => {
    try {
      const enabled = await PilotService.isFeatureEnabled(fastify);
      return reply.send({ enabled, pilotCode: PilotService.DEFAULT_PILOT_CODE });
    } catch (error) {
      return sendError(fastify, reply, error, 'Check pilot feature flag error');
    }
  });

  // ═══════════════════════════════════════════
  // Pilot Materials Catalog Endpoints
  // ═══════════════════════════════════════════

  // Get materials catalog
  fastify.get('/pilot/materials', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as { pilotCode?: string };
      const materials = await PilotService.listMaterials(fastify, query?.pilotCode);
      return reply.send(materials);
    } catch (error) {
      return sendError(fastify, reply, error, 'List pilot materials error');
    }
  });

  // Create material
  fastify.post('/pilot/materials', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as CreatePilotMaterialRequest;
      const created = await PilotService.createMaterial(fastify, body);
      return reply.status(201).send(created);
    } catch (error) {
      return sendError(fastify, reply, error, 'Create pilot material error');
    }
  });

  // Update material
  fastify.patch('/pilot/materials/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID vật tư không hợp lệ.' });
      }
      const body = request.body as UpdatePilotMaterialRequest;
      const updated = await PilotService.updateMaterial(fastify, id, body);
      return reply.send(updated);
    } catch (error) {
      return sendError(fastify, reply, error, 'Update pilot material error');
    }
  });

  // Delete material (soft-delete / deactivate)
  fastify.delete('/pilot/materials/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID vật tư không hợp lệ.' });
      }
      const result = await PilotService.deleteMaterial(fastify, id);
      return reply.send(result);
    } catch (error) {
      return sendError(fastify, reply, error, 'Delete pilot material error');
    }
  });

  // Seed default materials
  fastify.post('/pilot/materials/seed-defaults', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as { pilotCode?: string };
      const materials = await PilotService.seedDefaultMaterials(fastify, body?.pilotCode);
      return reply.send(materials);
    } catch (error) {
      return sendError(fastify, reply, error, 'Seed default pilot materials error');
    }
  });

  // ═══════════════════════════════════════════
  // Pilot SOP Technical Steps Endpoints
  // ═══════════════════════════════════════════

  fastify.get('/pilot/sop-steps', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as { pilotCode?: string };
      const steps = await PilotService.listSopSteps(fastify, query?.pilotCode);
      return reply.send(steps);
    } catch (error) {
      return sendError(fastify, reply, error, 'List pilot SOP steps error');
    }
  });

  fastify.post('/pilot/sop-steps', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as CreatePilotSopStepRequest;
      const created = await PilotService.createSopStep(fastify, body);
      return reply.status(201).send(created);
    } catch (error) {
      return sendError(fastify, reply, error, 'Create pilot SOP step error');
    }
  });

  fastify.patch('/pilot/sop-steps/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID bước kỹ thuật không hợp lệ.' });
      }
      const body = request.body as UpdatePilotSopStepRequest;
      const updated = await PilotService.updateSopStep(fastify, id, body);
      return reply.send(updated);
    } catch (error) {
      return sendError(fastify, reply, error, 'Update pilot SOP step error');
    }
  });

  fastify.delete('/pilot/sop-steps/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID bước kỹ thuật không hợp lệ.' });
      }
      const result = await PilotService.deleteSopStep(fastify, id);
      return reply.send(result);
    } catch (error) {
      return sendError(fastify, reply, error, 'Delete pilot SOP step error');
    }
  });

  fastify.post('/pilot/sop-steps/reorder', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as ReorderPilotSopStepsRequest;
      const updatedSteps = await PilotService.reorderSopSteps(fastify, body);
      return reply.send(updatedSteps);
    } catch (error) {
      return sendError(fastify, reply, error, 'Reorder pilot SOP steps error');
    }
  });

  fastify.post('/pilot/sop-steps/seed-defaults', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as { pilotCode?: string };
      const steps = await PilotService.seedDefaultSopSteps(fastify, body?.pilotCode);
      return reply.send(steps);
    } catch (error) {
      return sendError(fastify, reply, error, 'Seed default pilot SOP steps error');
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
      return sendError(fastify, reply, error, 'Get pilot session steps error');
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
      return sendError(fastify, reply, error, 'Start session step error');
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
      return sendError(fastify, reply, error, 'Finish session step error');
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
      return sendError(fastify, reply, error, 'Update session step note error');
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
      return sendError(fastify, reply, error, 'Reset session step error');
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
      return sendError(fastify, reply, error, 'Pilot check-in error');
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
      return sendError(fastify, reply, error, 'Pilot before photo error');
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
      return sendError(fastify, reply, error, 'Pilot service done error');
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
      return sendError(fastify, reply, error, 'Pilot after photo error');
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
      return sendError(fastify, reply, error, 'Pilot feedback error');
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
      return sendError(fastify, reply, error, 'Pilot check-out error');
    }
  });

  // Upload photo utility
  fastify.post('/pilot/upload-photo', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as { photoData: string; mimeType?: string; filename?: string };
      const result = await PilotService.uploadPhoto(fastify, body);
      return reply.send(result);
    } catch (error) {
      return sendError(fastify, reply, error, 'Upload pilot photo error');
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
