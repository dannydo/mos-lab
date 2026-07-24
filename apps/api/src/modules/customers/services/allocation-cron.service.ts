import type { FastifyInstance } from 'fastify';

/**
 * Service to process expired customer assignments automatically.
 * Any assignment where expiresAt < NOW() and isRetained is false
 * will be revoked back to the pool with log 'Hết hạn phân bổ tự động'.
 */
export async function processExpiredAssignments(fastify: FastifyInstance): Promise<number> {
  const now = new Date();
  try {
    const expiredAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
        isRetained: false,
      },
    });

    if (expiredAssignments.length === 0) {
      return 0;
    }

    const batchId = `auto_expire_${now.getTime()}`;

    await fastify.prisma.crm.$transaction([
      fastify.prisma.crm.crmCustomerAssignment.deleteMany({
        where: {
          id: { in: expiredAssignments.map((a) => a.id) },
        },
      }),
      ...expiredAssignments.map((a) =>
        fastify.prisma.crm.crmAssignmentHistory.create({
          data: {
            batchId,
            legacyUserId: a.legacyUserId,
            prevStaffId: a.staffId,
            newStaffId: null,
            assignedBy: a.assignedBy || 1,
            assignedAt: now,
            actionType: 'EXPIRE',
            reason: 'Hết hạn phân bổ tự động (Auto Expired)',
          },
        })
      ),
    ]);

    fastify.log.info(`[AllocationCron] Revoked ${expiredAssignments.length} expired assignments to pool.`);
    return expiredAssignments.length;
  } catch (error) {
    fastify.log.error(error as Error, '[AllocationCron] Failed to process expired assignments');
    return 0;
  }
}

export function registerAllocationCron(fastify: FastifyInstance): void {
  // Run check every 30 minutes
  const INTERVAL_MS = 30 * 60 * 1000;
  setInterval(() => {
    processExpiredAssignments(fastify).catch((err) => {
      fastify.log.error(err, '[AllocationCron] Periodic check error');
    });
  }, INTERVAL_MS);

  // Initial check 10s after startup
  setTimeout(() => {
    processExpiredAssignments(fastify).catch((err) => {
      fastify.log.error(err, '[AllocationCron] Initial startup check error');
    });
  }, 10000);
}
