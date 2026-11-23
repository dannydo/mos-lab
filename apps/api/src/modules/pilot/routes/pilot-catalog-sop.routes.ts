import { basename, join, extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import type {
  CreatePilotAssessmentCriterionRequest,
  CreatePilotMaterialRequest,
  CreatePilotSopStepRequest,
  ReorderPilotAssessmentCriteriaRequest,
  ReorderPilotSopStepsRequest,
  SaveSopPrepCategory1Request,
  SaveSopPrepCriterionRequest,
  UpdatePilotAssessmentCriterionRequest,
  UpdatePilotMaterialRequest,
  UpdatePilotSopStepRequest,
  UploadSopPrepEvidenceRequest,
} from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { PilotService, pilotMediaDir } from '../pilot.service.js';
import { sendPilotError } from './pilot-route-helpers.js';

export function registerPilotCatalogSopRoutes(fastify: FastifyInstance): void {
  // Public media access for pilot photos, videos and evidence documents
  fastify.get('/pilot/media/:filename', async (request, reply) => {
    try {
      const { filename } = request.params as { filename: string };
      const safeName = basename(filename);
      const dir = pilotMediaDir();
      const filePath = join(dir, safeName);
      const content = await readFile(filePath);
      let mimeType = 'image/jpeg';
      const ext = extname(safeName).toLowerCase();
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.webm') mimeType = 'video/webm';
      else if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.doc') mimeType = 'application/msword';
      else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      return reply.type(mimeType).send(content);
    } catch {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Không tìm thấy hình ảnh hoặc tệp tin.' });
    }
  });

  // Check feature flag
  fastify.get('/pilot/feature-flag', async (_request, reply) => {
    try {
      const enabled = await PilotService.isFeatureEnabled(fastify);
      return reply.send({ enabled, pilotCode: PilotService.DEFAULT_PILOT_CODE });
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Check pilot feature flag error');
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
      return sendPilotError(fastify, reply, error, 'List pilot materials error');
    }
  });

  // Create material
  fastify.post('/pilot/materials', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as CreatePilotMaterialRequest;
      const created = await PilotService.createMaterial(fastify, body);
      return reply.status(201).send(created);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Create pilot material error');
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
      return sendPilotError(fastify, reply, error, 'Update pilot material error');
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
      return sendPilotError(fastify, reply, error, 'Delete pilot material error');
    }
  });

  // Seed default materials
  fastify.post('/pilot/materials/seed-defaults', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as { pilotCode?: string };
      const materials = await PilotService.seedDefaultMaterials(fastify, body?.pilotCode);
      return reply.send(materials);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Seed default pilot materials error');
    }
  });

  // ═══════════════════════════════════════════
  // Hạng mục 3 – Định mức & Kiểm soát vật tư tiêu hao (MOS-FEAT-164)
  // ═══════════════════════════════════════════

  fastify.get('/pilot/material-sop', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as { pilotCode?: string };
      const doc = await PilotService.getMaterialSop(fastify, query?.pilotCode);
      return reply.send(doc);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Get pilot material SOP error');
    }
  });

  fastify.post('/pilot/material-sop', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as SafeAny;
      const doc = await PilotService.saveMaterialSop(fastify, body);
      return reply.send(doc);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Save pilot material SOP error');
    }
  });

  fastify.post('/pilot/material-sop/review', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as {
        reviewerName?: string;
        decision: 'EXPERT_ENDORSE' | 'APPROVE_SCALE';
        note?: string;
      };
      const doc = await PilotService.reviewMaterialSop(fastify, body);
      return reply.send(doc);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Review pilot material SOP error');
    }
  });

  // ═══════════════════════════════════════════
  // Pilot SOP Preparation - Category 1 Endpoints (MOS-FEAT-176)
  // ═══════════════════════════════════════════

  fastify.get('/pilot/sop-preparation/category-1', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as { pilotCode?: string };
      const doc = await PilotService.getSopPreparationCategory1(fastify, query?.pilotCode);
      return reply.send(doc);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Get pilot SOP Preparation Category 1 error');
    }
  });

  fastify.post('/pilot/sop-preparation/category-1', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as SaveSopPrepCategory1Request;
      const doc = await PilotService.saveSopPreparationCategory1(fastify, body);
      return reply.send(doc);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Save pilot SOP Preparation Category 1 error');
    }
  });

  fastify.post(
    '/pilot/sop-preparation/category-1/criterion/:criterionId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const params = request.params as { criterionId: string };
        const criterionId = parseInt(params.criterionId, 10);
        if (isNaN(criterionId) || criterionId < 1 || criterionId > 5) {
          return reply.status(400).send({ error: 'INVALID_CRITERION_ID', message: 'Mã tiêu chí phải từ 1 đến 5.' });
        }
        const body = request.body as SaveSopPrepCriterionRequest;
        const doc = await PilotService.saveSopPrepCriterion(fastify, criterionId, body);
        return reply.send(doc);
      } catch (error) {
        return sendPilotError(fastify, reply, error, 'Save pilot SOP Preparation criterion error');
      }
    }
  );

  fastify.post('/pilot/sop-preparation/upload-evidence', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as UploadSopPrepEvidenceRequest;
      const file = await PilotService.uploadSopPrepEvidence(fastify, body);
      return reply.send(file);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Upload pilot SOP evidence error');
    }
  });

  fastify.delete(
    '/pilot/sop-preparation/category-1/criterion/:criterionId/evidence/:fileId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const params = request.params as { criterionId: string; fileId: string };
        const criterionId = parseInt(params.criterionId, 10);
        if (isNaN(criterionId) || criterionId < 1 || criterionId > 5) {
          return reply.status(400).send({ error: 'INVALID_CRITERION_ID', message: 'Mã tiêu chí phải từ 1 đến 5.' });
        }
        if (!params.fileId) {
          return reply.status(400).send({ error: 'INVALID_FILE_ID', message: 'Mã tệp minh chứng không hợp lệ.' });
        }
        const doc = await PilotService.deleteSopPrepEvidence(fastify, criterionId, params.fileId);
        return reply.send(doc);
      } catch (error) {
        return sendPilotError(fastify, reply, error, 'Delete pilot SOP evidence error');
      }
    }
  );

  // ═══════════════════════════════════════════
  // Pilot SOP Technical Steps Endpoints
  // ═══════════════════════════════════════════

  fastify.get('/pilot/sop-steps', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as { pilotCode?: string };
      const steps = await PilotService.listSopSteps(fastify, query?.pilotCode);
      return reply.send(steps);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'List pilot SOP steps error');
    }
  });

  fastify.post('/pilot/sop-steps', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as CreatePilotSopStepRequest;
      const created = await PilotService.createSopStep(fastify, body);
      return reply.status(201).send(created);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Create pilot SOP step error');
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
      return sendPilotError(fastify, reply, error, 'Update pilot SOP step error');
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
      return sendPilotError(fastify, reply, error, 'Delete pilot SOP step error');
    }
  });

  fastify.post('/pilot/sop-steps/reorder', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as ReorderPilotSopStepsRequest;
      const updatedSteps = await PilotService.reorderSopSteps(fastify, body);
      return reply.send(updatedSteps);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Reorder pilot SOP steps error');
    }
  });

  fastify.post('/pilot/sop-steps/seed-defaults', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as { pilotCode?: string };
      const steps = await PilotService.seedDefaultSopSteps(fastify, body?.pilotCode);
      return reply.send(steps);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Seed default pilot SOP steps error');
    }
  });

  fastify.get('/pilot/sop-steps/empirical-stats', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as { pilotCode?: string };
      const stats = await PilotService.getSopEmpiricalStats(fastify, query?.pilotCode);
      return reply.send(stats);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Get pilot SOP empirical stats error');
    }
  });

  // ═══════════════════════════════════════════
  // Pilot Lash Assessment Criteria Endpoints
  // ═══════════════════════════════════════════

  fastify.get('/pilot/assessment-criteria', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as { pilotCode?: string };
      const criteria = await PilotService.listAssessmentCriteria(fastify, query?.pilotCode);
      return reply.send(criteria);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'List pilot assessment criteria error');
    }
  });

  fastify.post('/pilot/assessment-criteria', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as CreatePilotAssessmentCriterionRequest;
      const created = await PilotService.createAssessmentCriterion(fastify, body);
      return reply.status(201).send(created);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Create pilot assessment criterion error');
    }
  });

  fastify.patch('/pilot/assessment-criteria/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID tiêu chí không hợp lệ.' });
      }
      const body = request.body as UpdatePilotAssessmentCriterionRequest;
      const updated = await PilotService.updateAssessmentCriterion(fastify, id, body);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Update pilot assessment criterion error');
    }
  });

  fastify.delete('/pilot/assessment-criteria/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.status(400).send({ error: 'INVALID_ID', message: 'ID tiêu chí không hợp lệ.' });
      }
      const result = await PilotService.deleteAssessmentCriterion(fastify, id);
      return reply.send(result);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Delete pilot assessment criterion error');
    }
  });

  fastify.post('/pilot/assessment-criteria/reorder', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as ReorderPilotAssessmentCriteriaRequest;
      const updated = await PilotService.reorderAssessmentCriteria(fastify, body);
      return reply.send(updated);
    } catch (error) {
      return sendPilotError(fastify, reply, error, 'Reorder pilot assessment criteria error');
    }
  });
}
