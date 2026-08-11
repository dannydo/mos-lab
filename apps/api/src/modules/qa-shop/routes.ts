import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { qaShopService } from './qa-shop.service.js';
import { QaShopBranchCode, QaImportSheetInput, QaSaveAuditInput } from '@mos-lab/shared';

export async function qaShopRoutes(fastify: FastifyInstance) {
  // 1. Get Templates List
  fastify.get(
    '/qa-shop/templates',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { branchCode } = request.query as { branchCode?: QaShopBranchCode };
        const list = qaShopService.getTemplates(branchCode);
        return reply.send(list);
      } catch (err: any) {
        request.log.error('Failed to fetch QA templates:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 2. Get Template Detail by ID or Code
  fastify.get(
    '/qa-shop/templates/:idOrCode',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { idOrCode } = request.params as { idOrCode: string };
        const template = qaShopService.getTemplateByIdOrCode(idOrCode);
        if (!template) {
          return reply.status(404).send({ error: 'Not Found', message: `Template ${idOrCode} not found` });
        }
        return reply.send(template);
      } catch (err: any) {
        request.log.error('Failed to fetch QA template detail:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 3. Import or Sync Template from Google Sheet
  fastify.post(
    '/qa-shop/templates/import-sheet',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = request.body as QaImportSheetInput;
        if (!input?.sheetUrlOrId) {
          return reply.status(400).send({ error: 'Bad Request', message: 'sheetUrlOrId is required' });
        }
        const updatedTemplate = qaShopService.importSheetTemplate(input);
        return reply.send(updatedTemplate);
      } catch (err: any) {
        request.log.error('Failed to import QA template from sheet:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 3c. Clone Template from Source Branch to Target Branch
  fastify.post(
    '/qa-shop/templates/clone',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { sourceBranchCode, targetBranchCode, overwrite } = request.body as {
          sourceBranchCode: string;
          targetBranchCode: string;
          overwrite?: boolean;
        };
        if (!sourceBranchCode || !targetBranchCode) {
          return reply
            .status(400)
            .send({ error: 'Bad Request', message: 'sourceBranchCode and targetBranchCode are required' });
        }
        const cloned = qaShopService.cloneTemplate({ sourceBranchCode, targetBranchCode, overwrite });
        return reply.send(cloned);
      } catch (err: any) {
        request.log.error('Failed to clone QA template:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 3b. Update Template Sections & Items (CRUD)
  fastify.put(
    '/qa-shop/templates/:branchCode',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { branchCode } = request.params as { branchCode: string };
        const { sections } = request.body as { sections: SafeAny[] };
        if (!sections || !Array.isArray(sections)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'sections array is required' });
        }
        const updated = qaShopService.updateTemplate(branchCode, sections);
        return reply.send(updated);
      } catch (err: any) {
        request.log.error('Failed to update QA template:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 4. Get List of Audits
  fastify.get(
    '/qa-shop/audits',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { branchCode, dateFrom, dateTo } = request.query as {
          branchCode?: string;
          dateFrom?: string;
          dateTo?: string;
        };
        const audits = qaShopService.getAudits({ branchCode, dateFrom, dateTo });
        return reply.send(audits);
      } catch (err: any) {
        request.log.error('Failed to fetch QA audits:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 5. Get Audit Detail by ID
  fastify.get(
    '/qa-shop/audits/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const audit = qaShopService.getAuditById(id);
        if (!audit) {
          return reply.status(404).send({ error: 'Not Found', message: `Audit ${id} not found` });
        }
        return reply.send(audit);
      } catch (err: any) {
        request.log.error('Failed to fetch QA audit detail:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 6. Save / Submit Audit Form
  fastify.post(
    '/qa-shop/audits',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = request.body as QaSaveAuditInput;
        const user = request.user;
        const audit = qaShopService.saveAudit({
          ...input,
          auditorId: user?.id ? String(user.id) : input.auditorId || 'usr-admin-01',
          auditorName: user?.displayName || user?.username || input.auditorName || 'Danny Do',
        });
        return reply.status(201).send(audit);
      } catch (err: any) {
        request.log.error('Failed to save QA audit:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 7. Get Action Tickets
  fastify.get(
    '/qa-shop/tickets',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { branchCode, status } = request.query as { branchCode?: string; status?: string };
        const tickets = qaShopService.getTickets({ branchCode, status });
        return reply.send(tickets);
      } catch (err: any) {
        request.log.error('Failed to fetch QA tickets:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 8. Patch / Update Action Ticket
  fastify.patch(
    '/qa-shop/tickets/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const updates = request.body as {
          status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED';
          resolutionNotes?: string;
          resolutionPhotoUrls?: string[];
          resolvedByStaffName?: string;
        };
        const user = request.user;
        const updated = qaShopService.updateTicket(id, {
          ...updates,
          resolvedByStaffName: user?.displayName || user?.username || updates.resolvedByStaffName,
        });
        return reply.send(updated);
      } catch (err: any) {
        request.log.error('Failed to update QA ticket:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 9. Get QA Analytics & Compliance Stats
  fastify.get(
    '/qa-shop/analytics',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = qaShopService.getAnalytics();
        return reply.send(stats);
      } catch (err: any) {
        request.log.error('Failed to fetch QA analytics:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );
}
