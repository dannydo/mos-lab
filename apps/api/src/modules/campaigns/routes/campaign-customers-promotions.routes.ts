/* eslint-disable @typescript-eslint/no-explicit-any -- Fastify request boundaries are validated by the campaign service. */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireCampaignAdmin } from '../../../middlewares/auth.js';
import { CampaignService } from '../campaign.service.js';
import { CustomerAccessService } from '../../customers/services/customer-access.service.js';
import {
  AddCampaignCustomersDto,
  BatchRemoveCampaignCustomersDto,
  CampaignBookingStatusFilter,
  CreateCampaignPromotionDto,
  RemoveCampaignCustomerDto,
  ToggleCampaignTouchpointLogDto,
} from '@mos-lab/shared';

export function registerCampaignCustomersAndPromotionsRoutes(fastify: FastifyInstance) {
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
        const query = (request.query || {}) as { skipCache?: string | boolean };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const user = request.user;
        const stats = await CampaignService.getCampaignStats(
          fastify,
          id,
          CustomerAccessService.isTelesales(user) ? user.id : undefined,
          { skipCache: query.skipCache === 'true' || query.skipCache === true }
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
}
