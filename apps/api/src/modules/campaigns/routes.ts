// Campaign Routes
/* eslint-disable @typescript-eslint/no-explicit-any -- Fastify request boundaries are validated by the campaign service. */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { canManageCampaign, requireAuth, requireCampaignAdmin } from '../../middlewares/auth.js';
import { CampaignService } from './campaign.service.js';
import { SharedPoolBroadcaster } from './campaign-shared-pool-broadcaster.js';
import { CustomerAccessService } from '../customers/services/customer-access.service.js';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  AddCampaignCustomersDto,
  RemoveCampaignCustomerDto,
  BatchRemoveCampaignCustomersDto,
  ToggleCampaignTouchpointLogDto,
  CreateCampaignPromotionDto,
  CampaignBookingStatusFilter,
  ListCampaignsParams,
  ClaimSharedCustomerDto,
  ReleaseSharedCustomerDto,
  UpdateSharedPoolStatusDto,
  AdvanceSharedPoolBatchDto,
  ToggleSharedPoolPauseDto,
  ManagerPoolActionDto,
  BatchManagerPoolActionDto,
  SharedPoolHistoryQueryParams,
  SharedPoolRecoveryDto,
  SyncSharedPoolCallDto,
} from '@mos-lab/shared';

export async function campaignRoutes(fastify: FastifyInstance) {
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
        const user = request.user;
        const isTelesales = CustomerAccessService.isTelesales(user);
        const rawBooker = isTelesales ? undefined : query.bookerId || query.assignedStaffId;
        let bookerId: number | undefined = undefined;
        if (rawBooker && rawBooker !== 'ALL') {
          const parsed = parseInt(rawBooker, 10);
          if (!isNaN(parsed) && parsed > 0) {
            bookerId = parsed;
          }
        }

        const bookingStatus: CampaignBookingStatusFilter =
          query.bookingStatus === 'BOOKED' || query.bookingStatus === 'DONE' || query.bookingStatus === 'MISSED'
            ? query.bookingStatus
            : 'ALL';

        const batchNumber =
          query.batchNumber !== undefined && query.batchNumber !== ''
            ? query.batchNumber === 'ALL'
              ? 'ALL'
              : parseInt(query.batchNumber, 10)
            : undefined;

        const result = await CampaignService.getCampaignCustomers(fastify, id, {
          bookerId,
          restrictToAssignedStaffId: isTelesales ? user.id : undefined,
          currentStaffId: user.id,
          search: query.search,
          touchpointKey: query.touchpointKey,
          bookingStatus,
          batchNumber: !isNaN(batchNumber as any) ? batchNumber : undefined,
          poolStatus: query.poolStatus || undefined,
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
          user.displayName || user.username || `Staff #${user.id}`,
          CustomerAccessService.isTelesales(user) ? user.id : undefined
        );
        return reply.send(log);
      } catch (err: any) {
        request.log.error('Failed to toggle touchpoint log:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
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
        const user = request.user;
        const stats = await CampaignService.getCampaignStats(
          fastify,
          id,
          CustomerAccessService.isTelesales(user) ? user.id : undefined
        );
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
        const isAllowed = await CustomerAccessService.canTelesalesAccessCustomer(fastify, request.user, customerId);
        if (!isAllowed) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Telesales chỉ được xem khách hàng đã được phân bổ cho mình.',
          });
        }
        const promotions = await CampaignService.getCustomerActivePromotions(fastify, customerId);
        return reply.send(promotions);
      } catch (err: any) {
        request.log.error('Failed to fetch active customer campaign promotions:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 17. Shared Pool: Get Overview & Burn Rate Stats
  fastify.get(
    '/campaigns/:id/shared-pool/overview',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const query = (request.query || {}) as { batchNumber?: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const overview = await CampaignService.getSharedPoolOverview(fastify, id, query.batchNumber);
        return reply.send(overview);
      } catch (err: any) {
        request.log.error('Failed to get shared pool overview:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 17b. Team Performance: Get Staff Performance in Campaign Teamwork (MOS-BUG-81)
  const handleStaffPerformance = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as { id: string };
      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
      }
      const performance = await CampaignService.getCampaignStaffPerformance(fastify, id);
      return reply.send(performance);
    } catch (err: any) {
      request.log.error('Failed to get campaign staff performance:', err);
      return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
    }
  };

  fastify.get('/campaigns/:id/staff-performance', { preHandler: [requireAuth] }, handleStaffPerformance);
  fastify.get('/campaigns/:id/shared-pool/staff-performance', { preHandler: [requireAuth] }, handleStaffPerformance);

  // 18. Shared Pool: Claim / Lock Customer
  fastify.post(
    '/campaigns/:id/shared-pool/claim',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as ClaimSharedCustomerDto;
        if (!dto.customerId) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không được để trống' });
        }
        const result = await CampaignService.claimCustomer(fastify, id, dto.customerId, user.id);
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to claim shared pool customer:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 19. Shared Pool: Release Claim Lock
  fastify.post(
    '/campaigns/:id/shared-pool/release',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as ReleaseSharedCustomerDto;
        if (!dto.customerId) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không được để trống' });
        }
        const isManager = canManageCampaign(user);
        const result = await CampaignService.releaseClaim(fastify, id, dto.customerId, user.id, isManager);
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to release shared pool claim:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 20. Shared Pool: Record Call & Pool Status
  fastify.post(
    '/campaigns/:id/shared-pool/status',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as UpdateSharedPoolStatusDto;
        if (!dto.customerId || !dto.callResult) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu ID khách hàng hoặc kết quả cuộc gọi' });
        }
        const result = await CampaignService.recordSharedPoolStatus(fastify, id, dto.customerId, user.id, dto);
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to record shared pool status:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 20b. Shared Pool: Sync with latest standard mOS call log (MOS-BUG-99)
  fastify.post(
    '/campaigns/:id/shared-pool/sync-call',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = (request.body || {}) as SyncSharedPoolCallDto;
        if (!dto.customerId) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu ID khách hàng' });
        }
        const result = await CampaignService.syncSharedPoolFromLatestCall(fastify, id, dto.customerId, user.id);
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to sync shared pool call:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 21. Shared Pool: Advance Batch (Manager / Admin)
  fastify.post(
    '/campaigns/:id/shared-pool/advance-batch',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = (request.body || {}) as AdvanceSharedPoolBatchDto;
        const result = await CampaignService.advanceBatch(fastify, id, user.id, dto.targetBatchNumber);
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to advance shared pool batch:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 22. Shared Pool: Toggle Pause / Resume (Manager / Admin)
  fastify.post(
    '/campaigns/:id/shared-pool/toggle-pause',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as ToggleSharedPoolPauseDto;
        if (typeof dto.isPaused !== 'boolean') {
          return reply.status(400).send({ error: 'Bad Request', message: 'Trạng thái isPaused không hợp lệ' });
        }
        const result = await CampaignService.togglePause(fastify, id, user.id, dto.isPaused);
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to toggle shared pool pause:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 23. Shared Pool: Manager Action on Customer (Manager / Admin)
  fastify.post(
    '/campaigns/:id/shared-pool/manager-action',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as ManagerPoolActionDto;
        if (!dto.customerId || !dto.action) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu thông tin khách hàng hoặc hành động' });
        }
        const result = await CampaignService.managerPoolAction(
          fastify,
          id,
          dto.customerId,
          user.id,
          dto.action,
          dto.reason
        );
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to execute manager pool action:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 23b. Shared Pool: Batch Manager Action on Customers (Manager / Admin)
  fastify.post(
    '/campaigns/:id/shared-pool/batch-manager-action',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as BatchManagerPoolActionDto;
        if (!dto.customerIds || !Array.isArray(dto.customerIds) || dto.customerIds.length === 0 || !dto.action) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu thông tin danh sách khách hàng hoặc hành động',
          });
        }
        const result = await CampaignService.batchManagerPoolAction(
          fastify,
          id,
          user.id,
          dto.action,
          dto.customerIds,
          dto.reason
        );
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to execute batch manager pool action:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 24. Shared Pool: Get Customer Interaction & Audit Logs (Chống tranh công)
  fastify.get(
    '/campaigns/:id/shared-pool/customers/:customerId/logs',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string; customerId: string };
        const id = parseInt(params.id, 10);
        const customerId = parseInt(params.customerId, 10);
        if (isNaN(id) || isNaN(customerId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ' });
        }
        const logs = await CampaignService.getSharedPoolLogs(fastify, id, customerId);
        return reply.send(logs);
      } catch (err: any) {
        request.log.error('Failed to get customer shared pool logs:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 25. Shared Pool: Get Detailed Real-time History (Manager & Telesales)
  fastify.get(
    '/campaigns/:id/shared-pool/history',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const query = (request.query || {}) as SharedPoolHistoryQueryParams;
        const history = await CampaignService.getCampaignSharedPoolHistory(fastify, id, query);
        return reply.send(history);
      } catch (err: any) {
        request.log.error('Failed to get campaign shared pool history:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 26. Shared Pool: Manager / Admin Safe Recovery & Rollback
  fastify.post(
    '/campaigns/:id/shared-pool/recovery',
    { preHandler: [requireAuth, requireCampaignAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const dto = request.body as SharedPoolRecoveryDto;
        if (!dto || !dto.customerId || !dto.action) {
          return reply
            .status(400)
            .send({ error: 'Bad Request', message: 'Thiếu thông tin khách hàng hoặc hành động khôi phục' });
        }
        if (!dto.reason || !dto.reason.trim()) {
          return reply
            .status(400)
            .send({ error: 'Bad Request', message: 'Bắt buộc nhập lý do khi thực hiện khôi phục' });
        }
        const result = await CampaignService.recoverCustomerState(fastify, id, user.id, dto);
        return reply.send(result);
      } catch (err: any) {
        request.log.error('Failed to recover customer state in shared pool:', err);
        return reply.status(err.statusCode || 400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 27. Shared Pool: Realtime WebSocket Stream
  fastify.get('/campaigns/:id/shared-pool/stream', { websocket: true }, (socket, request) => {
    const params = request.params as { id: string };
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      socket.close(1008, 'Invalid Campaign ID');
      return;
    }
    SharedPoolBroadcaster.register(id, socket);
    socket.send(JSON.stringify({ type: 'CONNECTED', campaignId: id }));
    socket.on('close', () => SharedPoolBroadcaster.unregister(id, socket));
    socket.on('error', () => SharedPoolBroadcaster.unregister(id, socket));
  });
}
