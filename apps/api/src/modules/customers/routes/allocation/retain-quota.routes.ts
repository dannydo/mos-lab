import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../../middlewares/auth.js';
import { AllocationLedgerService } from '../../../allocation/allocation-ledger.service.js';

async function resolveBookerRetainQuotaLimit(fastify: FastifyInstance, userId: number): Promise<number> {
  const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
    where: { key: 'BOOKER_RETAIN_QUOTA_CONFIG' },
  });

  let quotaLimit = 50; // Default limit per booker
  if (configRecord?.value) {
    try {
      const quotaMap = JSON.parse(configRecord.value);
      if (quotaMap[userId] !== undefined) {
        quotaLimit = Number(quotaMap[userId]);
      } else if (quotaMap.default !== undefined) {
        quotaLimit = Number(quotaMap.default);
      }
    } catch {
      // ignore parse error
    }
  }
  return quotaLimit;
}

export function registerCustomerRetainQuotaRoutes(fastify: FastifyInstance) {
  // POST /api/customers/retain
  // Booker toggles retained data within their quota limit
  fastify.post('/customers/retain', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds, isRetained = true } = request.body as { customerIds: number[]; isRetained?: boolean };
    const user = request.user as { id: number; role: string };

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    try {
      const quotaLimit = await resolveBookerRetainQuotaLimit(fastify, user.id);

      if (isRetained) {
        // Count existing retained customers for this staff (excluding ones being toggled)
        const currentRetainedCount = await fastify.prisma.crm.crmCustomerAssignment.count({
          where: {
            staffId: user.id,
            isRetained: true,
            legacyUserId: { notIn: customerIds },
          },
        });

        if (currentRetainedCount + customerIds.length > quotaLimit) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Vượt quá hạn ngạch giữ data! Bạn đang giữ ${currentRetainedCount}/${quotaLimit} data. Không thể chọn giữ thêm ${customerIds.length} data nữa.`,
          });
        }
      }

      const now = new Date();
      await fastify.prisma.crm.$transaction(async (tx) => {
        const assignments = await tx.crmCustomerAssignment.findMany({
          where: { legacyUserId: { in: customerIds }, ...(user.role !== 'admin' ? { staffId: user.id } : {}) },
        });
        for (const assignment of assignments) {
          await AllocationLedgerService.changeRetention(tx, {
            customerId: assignment.legacyUserId,
            actorStaffId: user.id,
            reason: isRetained ? 'Booker đánh dấu giữ data' : 'Booker bỏ trạng thái giữ data',
            sourceType: 'MANUAL',
            actionContext: 'CUSTOMER_RETENTION_TOGGLED',
            occurredAt: now,
            isRetained,
          });
        }
      });

      return reply.send({
        success: true,
        message: isRetained
          ? `Đã lưu ${customerIds.length} khách hàng vào danh sách giữ lại.`
          : `Đã bỏ giữ ${customerIds.length} khách hàng.`,
      });
    } catch (error: unknown) {
      fastify.log.error({ err: error }, 'Retain customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi khi cập nhật giữ data' });
    }
  });

  // GET /api/customers/booker-retain-quota
  fastify.get('/customers/booker-retain-quota', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string };

    try {
      const quotaLimit = await resolveBookerRetainQuotaLimit(fastify, user.id);

      const retainedCount = await fastify.prisma.crm.crmCustomerAssignment.count({
        where: {
          staffId: user.id,
          isRetained: true,
        },
      });

      return {
        retainedCount,
        quotaLimit,
        remainingQuota: Math.max(0, quotaLimit - retainedCount),
      };
    } catch (error: unknown) {
      fastify.log.error({ err: error }, 'Get retain quota error');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Lỗi khi lấy thông tin Quota giữ data' });
    }
  });
}
