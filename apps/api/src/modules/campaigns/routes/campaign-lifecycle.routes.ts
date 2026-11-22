/* eslint-disable @typescript-eslint/no-explicit-any -- Fastify request boundaries are validated by the campaign service. */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { canManageCampaign, requireAuth, requireCampaignAdmin } from '../../../middlewares/auth.js';
import { CampaignService } from '../campaign.service.js';
import { CreateCampaignDto, ListCampaignsParams, UpdateCampaignDto } from '@mos-lab/shared';

export function registerCampaignLifecycleRoutes(fastify: FastifyInstance) {
  // 1. List Campaigns
  fastify.get('/campaigns', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = (request.query || {}) as ListCampaignsParams;
      const result = await CampaignService.listCampaigns(fastify, query, {
        includeArchived: canManageCampaign(request.user),
      });
      return reply.send(result);
    } catch (err: any) {
      request.log.error('Failed to list campaigns:', err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // 2. Create Campaign (Admin only)
  fastify.post(
    '/campaigns',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user;
        const dto = request.body as CreateCampaignDto;
        const campaign = await CampaignService.createCampaign(fastify, dto, user.id);
        return reply.status(201).send(campaign);
      } catch (err: any) {
        request.log.error('Failed to create campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 3. Get Campaign by ID
  fastify.get('/campaigns/:id', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
      }
      const campaign = await CampaignService.getCampaignById(fastify, id, {
        includeArchived: canManageCampaign(request.user),
      });
      return reply.send(campaign);
    } catch (err: any) {
      request.log.error('Failed to get campaign by ID:', err);
      return reply.status(404).send({ error: 'Not Found', message: err.message });
    }
  });

  // 4. Get Campaign by Slug
  fastify.get(
    '/campaigns/slug/:slug',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { slug: string };
        const campaign = await CampaignService.getCampaignBySlug(fastify, params.slug, {
          includeArchived: canManageCampaign(request.user),
        });
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to get campaign by slug:', err);
        return reply.status(404).send({ error: 'Not Found', message: err.message });
      }
    }
  );

  // 5. Update Campaign (Admin only)
  fastify.put(
    '/campaigns/:id',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const dto = request.body as UpdateCampaignDto;
        const campaign = await CampaignService.updateCampaign(fastify, id, dto);
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to update campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 6. Delete (Archive) Campaign (Admin only)
  fastify.delete(
    '/campaigns/:id',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const result = await CampaignService.deleteCampaign(fastify, id);
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to delete campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 7. End / Complete Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/end',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const campaign = await CampaignService.endCampaign(fastify, id);
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to end campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  fastify.post(
    '/campaigns/:id/complete',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const campaign = await CampaignService.completeCampaign(fastify, id);
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to complete campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 8. Pause Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/pause',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const campaign = await CampaignService.pauseCampaign(fastify, id);
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to pause campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 9. Resume Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/resume',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const campaign = await CampaignService.resumeCampaign(fastify, id);
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to resume campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 10. Archive Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/archive',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const campaign = await CampaignService.archiveCampaign(fastify, id);
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to archive campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 11. Unarchive Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/unarchive',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const campaign = await CampaignService.unarchiveCampaign(fastify, id);
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to unarchive campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 12. Reopen Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/reopen',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const dto = (request.body || {}) as { endDate?: string };
        const campaign = await CampaignService.reopenCampaign(fastify, id, dto);
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to reopen campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 12b. Restore Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/restore',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const campaign = await CampaignService.restoreCampaign(fastify, id);
        return reply.send(campaign);
      } catch (err: any) {
        request.log.error('Failed to restore campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 13. Clone Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/clone',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user;
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const dto = (request.body || {}) as any;
        const campaign = await CampaignService.cloneCampaign(fastify, id, dto, user.id);
        return reply.status(201).send(campaign);
      } catch (err: any) {
        request.log.error('Failed to clone campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );
}
