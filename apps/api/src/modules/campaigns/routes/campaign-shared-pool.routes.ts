/* eslint-disable @typescript-eslint/no-explicit-any -- Fastify request boundaries are validated by the campaign service. */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { canManageCampaign, requireAuth, requireCampaignAdmin } from '../../../middlewares/auth.js';
import { CampaignService } from '../campaign.service.js';
import { SharedPoolBroadcaster } from '../campaign-shared-pool-broadcaster.js';
import {
  AdvanceSharedPoolBatchDto,
  BatchManagerPoolActionDto,
  ClaimSharedCustomerDto,
  ManagerPoolActionDto,
  ReleaseSharedCustomerDto,
  SharedPoolHistoryQueryParams,
  SharedPoolRecoveryDto,
  SyncSharedPoolCallDto,
  ToggleSharedPoolPauseDto,
  UpdateSharedPoolStatusDto,
} from '@mos-lab/shared';

export function registerCampaignSharedPoolRoutes(fastify: FastifyInstance) {
  // 17. Shared Pool: Get Overview & Burn Rate Stats
  fastify.get(
    '/campaigns/:id/shared-pool/overview',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const query = (request.query || {}) as { batchNumber?: string; skipCache?: string | boolean };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID chiến dịch không hợp lệ' });
        }
        const overview = await CampaignService.getSharedPoolOverview(fastify, id, query.batchNumber, {
          skipCache: query.skipCache === 'true' || query.skipCache === true,
        });
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
