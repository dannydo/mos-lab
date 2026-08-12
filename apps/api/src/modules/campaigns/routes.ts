// Campaign Routes
/* eslint-disable @typescript-eslint/no-explicit-any -- Fastify request boundaries are validated by the campaign service. */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireCampaignAdmin } from '../../middlewares/auth.js';
import { CampaignService } from './campaign.service.js';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  AddCampaignCustomersDto,
  RemoveCampaignCustomerDto,
  BatchRemoveCampaignCustomersDto,
  ToggleCampaignTouchpointLogDto,
  CreateCampaignPromotionDto,
  ListCampaignsParams,
} from '@mos-lab/shared';

export async function campaignRoutes(fastify: FastifyInstance) {
  // 1. List Campaigns
  fastify.get('/campaigns', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = (request.query || {}) as ListCampaignsParams;
      const result = await CampaignService.listCampaigns(fastify, query);
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
      const campaign = await CampaignService.getCampaignById(fastify, id);
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
        const campaign = await CampaignService.getCampaignBySlug(fastify, params.slug);
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

  // 8. Get Campaign Customers
  fastify.get(
    '/campaigns/:id/customers',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const query = request.query as any;
        const rawBooker = query.bookerId || query.assignedStaffId;
        let bookerId: number | undefined = undefined;
        if (rawBooker && rawBooker !== 'ALL') {
          const parsed = parseInt(rawBooker, 10);
          if (!isNaN(parsed) && parsed > 0) {
            bookerId = parsed;
          }
        }

        const result = await CampaignService.getCampaignCustomers(fastify, id, {
          bookerId,
          search: query.search,
          touchpointKey: query.touchpointKey,
          page: query.page ? parseInt(query.page, 10) : 1,
          pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
        });
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to fetch campaign customers:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 9. Add Customers to Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/customers',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as AddCampaignCustomersDto;
        const result = await CampaignService.addCustomersToCampaign(fastify, id, dto.customerIds || [], user.id);
        return reply.status(201).send(result);
      } catch (err: any) {
        request.log.error('Failed to add customers to campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 9b. Transfer Customers to Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/transfer-customers',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = (request.body || {}) as { customerIds: number[]; reason?: string };
        const result = await CampaignService.transferCustomersToCampaign(
          fastify,
          id,
          dto.customerIds || [],
          dto.reason,
          user.id
        );
        return reply.status(200).send(result);
      } catch (err: any) {
        request.log.error('Failed to transfer customers to campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 10. Remove Customer from Campaign (Admin only)
  fastify.delete(
    '/campaigns/:id/customers/:customerId',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string; customerId: string };
        const campaignId = parseInt(params.id, 10);
        const customerId = parseInt(params.customerId, 10);
        if (isNaN(campaignId) || isNaN(customerId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ' });
        }
        const user = request.user;
        const dto = (request.body || request.query || {}) as RemoveCampaignCustomerDto;
        const result = await CampaignService.removeCustomerFromCampaign(
          fastify,
          campaignId,
          customerId,
          dto.reason,
          user.id
        );
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to remove customer from campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 10b. Batch Remove Customers from Campaign (Admin only)
  fastify.post(
    '/campaigns/:id/customers/batch-remove',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const campaignId = parseInt(params.id, 10);
        if (isNaN(campaignId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Campaign ID không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as BatchRemoveCampaignCustomersDto;
        const result = await CampaignService.removeCustomersFromCampaignBatch(
          fastify,
          campaignId,
          dto.customerIds || [],
          dto.reason,
          user.id
        );
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to batch remove customers from campaign:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 11. Toggle Touchpoint Log
  fastify.post(
    '/campaigns/:id/customers/:customerId/touchpoints/:touchpointId',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string; customerId: string; touchpointId: string };
        const campaignId = parseInt(params.id, 10);
        const customerId = parseInt(params.customerId, 10);
        const touchpointId = parseInt(params.touchpointId, 10);
        if (isNaN(campaignId) || isNaN(customerId) || isNaN(touchpointId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as ToggleCampaignTouchpointLogDto;
        const log = await CampaignService.toggleTouchpointLog(
          fastify,
          campaignId,
          customerId,
          touchpointId,
          dto,
          user.id,
          user.displayName || user.username || `Staff #${user.id}`
        );
        return reply.send(log);
      } catch (err: any) {
        request.log.error('Failed to toggle touchpoint log:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 12. Get Campaign Promotions
  fastify.get(
    '/campaigns/:id/promotions',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const promotions = await CampaignService.getCampaignPromotions(fastify, id);
        return reply.send(promotions);
      } catch (err: any) {
        request.log.error('Failed to fetch campaign promotions:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 13. Create Promotion (Admin only)
  fastify.post(
    '/campaigns/:id/promotions',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const dto = request.body as CreateCampaignPromotionDto;
        const promotion = await CampaignService.createPromotion(fastify, id, dto);
        return reply.status(201).send(promotion);
      } catch (err: any) {
        request.log.error('Failed to create campaign promotion:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 14. Delete Promotion (Admin only)
  fastify.delete(
    '/campaigns/:id/promotions/:promotionId',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string; promotionId: string };
        const campaignId = parseInt(params.id, 10);
        const promotionId = parseInt(params.promotionId, 10);
        if (isNaN(campaignId) || isNaN(promotionId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ' });
        }
        const result = await CampaignService.deletePromotion(fastify, campaignId, promotionId);
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to delete campaign promotion:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 15. Get Campaign Header Stats
  fastify.get(
    '/campaigns/:id/stats',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const stats = await CampaignService.getCampaignStats(fastify, id);
        return reply.send(stats);
      } catch (err: any) {
        request.log.error('Failed to fetch campaign stats:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 16. Get Active Customer Campaign Promotions
  fastify.get(
    '/campaigns/customer/:customerId/active-promotions',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { customerId: string };
        const customerId = parseInt(params.customerId, 10);
        if (isNaN(customerId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không hợp lệ' });
        }
        const promotions = await CampaignService.getCustomerActivePromotions(fastify, customerId);
        return reply.send(promotions);
      } catch (err: any) {
        request.log.error('Failed to fetch active customer campaign promotions:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );
}
