import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { AllocationService } from './allocation.service.js';
import {
  CreateAllocationBatchDto,
  DeclineAllocationBatchDto,
  RecallAllocationBatchDto,
  AllocationHistoryQueryParams,
  AllocationAuditQueryParams,
} from '@mos-lab/shared';

export async function allocationRoutes(fastify: FastifyInstance) {
  // 1. Create Allocation Batch (Admin/Manager/LS/OC)
  fastify.post(
    '/allocation/batch',
    { preHandler: [requireAuth, requireRole(['admin', 'manager', 'ls', 'oc'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user;
        const dto = request.body as CreateAllocationBatchDto;
        const batch = await AllocationService.createBatch(fastify, user.id, dto);
        return reply.status(201).send(batch);
      } catch (err: SafeAny) {
        request.log.error('Failed to create allocation batch:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 2. Get Pending Batches for logged-in Booker
  fastify.get(
    '/allocation/pending',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user;
        const batches = await AllocationService.getPendingBatchesForBooker(fastify, user.id);
        return reply.send(batches);
      } catch (err: SafeAny) {
        request.log.error('Failed to fetch pending allocation batches:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 2b. Get My Active/Accepted Batches for logged-in Booker
  fastify.get(
    '/allocation/my-batches',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user;
        const batches = await AllocationService.getMyBatchesForBooker(fastify, user.id, user.role);
        return reply.send(batches);
      } catch (err: SafeAny) {
        request.log.error('Failed to fetch my allocation batches:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 3. Get Single Batch Details
  fastify.get(
    '/allocation/batches/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const batchId = parseInt(params.id, 10);
        if (isNaN(batchId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID đợt phân bổ không hợp lệ' });
        }
        const user = request.user;
        const data = await AllocationService.getBatchDetails(fastify, batchId, { id: user.id, role: user.role });
        return reply.send(data);
      } catch (err: SafeAny) {
        request.log.error('Failed to fetch batch details:', err);
        if (err.message && err.message.includes('không có quyền')) {
          return reply.status(403).send({ error: 'Forbidden', message: err.message });
        }
        return reply.status(404).send({ error: 'Not Found', message: err.message });
      }
    }
  );

  // 4. Accept Allocation Batch ("Chấp nhận toàn bộ")
  fastify.post(
    '/allocation/batches/:id/accept',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const batchId = parseInt(params.id, 10);
        if (isNaN(batchId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID đợt phân bổ không hợp lệ' });
        }
        const user = request.user;
        const result = await AllocationService.acceptBatch(fastify, batchId, user.id);
        return reply.send(result);
      } catch (err: SafeAny) {
        request.log.error('Failed to accept allocation batch:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 5. Decline Allocation Batch ("Từ chối toàn bộ")
  fastify.post(
    '/allocation/batches/:id/decline',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const batchId = parseInt(params.id, 10);
        if (isNaN(batchId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID đợt phân bổ không hợp lệ' });
        }
        const user = request.user;
        const dto = (request.body || {}) as DeclineAllocationBatchDto;
        const result = await AllocationService.declineBatch(fastify, batchId, user.id, dto);
        return reply.send(result);
      } catch (err: SafeAny) {
        request.log.error('Failed to decline allocation batch:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 6. Recall Allocation Batch ("Recall Batch")
  fastify.post(
    '/allocation/batches/:id/recall',
    { preHandler: [requireAuth, requireRole(['admin', 'manager', 'ls'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { id: string };
        const batchId = parseInt(params.id, 10);
        if (isNaN(batchId)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'ID đợt phân bổ không hợp lệ' });
        }
        const user = request.user;
        const dto = (request.body || {}) as RecallAllocationBatchDto;
        const result = await AllocationService.recallBatch(fastify, batchId, user.id, dto);
        return reply.send(result);
      } catch (err: SafeAny) {
        request.log.error('Failed to recall allocation batch:', err);
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
    }
  );

  // 7. Trigger Manual Check for Expired Batches
  fastify.post(
    '/allocation/check-expired',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await AllocationService.checkAndExpireBatches(fastify);
        return reply.send({ success: true, message: 'Đã kiểm tra và cập nhật các đợt phân bổ hết hạn' });
      } catch (err: SafeAny) {
        request.log.error('Failed to run allocation check-expired:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 8. 30-Day Allocation History
  fastify.get(
    '/allocation/history',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user;
        const query = (request.query || {}) as AllocationHistoryQueryParams;
        const params: AllocationHistoryQueryParams = {
          page: query.page ? Number(query.page) : 1,
          limit: query.limit ? Number(query.limit) : 20,
          status: query.status,
          bookerId: query.bookerId ? Number(query.bookerId) : undefined,
          search: query.search,
        };
        const result = await AllocationService.get30DayHistory(fastify, params, { id: user.id, role: user.role });
        return reply.send(result);
      } catch (err: SafeAny) {
        request.log.error('Failed to fetch 30d allocation history:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );

  // 9. Allocation Audit Stats Dashboard
  fastify.get(
    '/allocation/audit-stats',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = (request.query || {}) as AllocationAuditQueryParams;
        const params: AllocationAuditQueryParams = {
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          bookerId: query.bookerId ? Number(query.bookerId) : undefined,
        };
        const stats = await AllocationService.getAuditStats(fastify, params);
        return reply.send(stats);
      } catch (err: SafeAny) {
        request.log.error('Failed to fetch allocation audit stats:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
      }
    }
  );
}
