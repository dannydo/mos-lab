import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';

export async function registerAssignmentRoutes(fastify: FastifyInstance) {
  // POST /api/customers/assign
  // Assign multiple customers to a staff member
  fastify.post(
    '/customers/assign',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Customers'],
        summary: 'Assign customers to staff member (Admin only)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['customerIds', 'staffId'],
          properties: {
            customerIds: { type: 'array', items: { type: 'integer' } },
            staffId: { type: 'integer' },
          },
        },
      },
    },
    async (request, reply) => {
      const { customerIds, staffId } = request.body as { customerIds: number[]; staffId: number };
      const adminUser = request.user as { id: number; role: string };

      if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
        return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền phân bổ khách hàng.' });
      }

      if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0 || !staffId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'customerIds and staffId are required' });
      }

      try {
        // 1. Get current assignments for all selected customerIds to know prevStaffId
        const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: { legacyUserId: { in: customerIds } },
          select: { legacyUserId: true, staffId: true },
        });
        const assignmentMap = new Map(currentAssignments.map((a) => [a.legacyUserId, a.staffId]));

        // 2. Generate a unique batch ID
        const batchId = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // 3. Perform upserts and create history entries in a transaction
        await fastify.prisma.crm.$transaction([
          ...customerIds.map((cid) =>
            fastify.prisma.crm.crmCustomerAssignment.upsert({
              where: { legacyUserId: cid },
              update: { staffId, assignedBy: adminUser.id },
              create: { legacyUserId: cid, staffId, assignedBy: adminUser.id },
            })
          ),
          ...customerIds.map((cid) =>
            fastify.prisma.crm.crmAssignmentHistory.create({
              data: {
                batchId,
                legacyUserId: cid,
                prevStaffId: assignmentMap.get(cid) ?? null,
                newStaffId: staffId,
                assignedBy: adminUser.id,
              },
            })
          ),
        ]);

        return { success: true, count: customerIds.length, batchId };
      } catch (error) {
        fastify.log.error({ err: error }, 'Assign customers error');
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to assign customers' });
      }
    }
  );

  // POST /api/customers/unassign
  // Unassign multiple customers (remove their assignments)
  fastify.post('/customers/unassign', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds } = request.body as { customerIds: number[] };
    const adminUser = request.user as { id: number; role: string };

    if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền hủy phân bổ khách hàng.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    try {
      // 1. Get current assignments for all selected customerIds
      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: customerIds } },
        select: { legacyUserId: true, staffId: true },
      });
      const assignmentMap = new Map(currentAssignments.map((a) => [a.legacyUserId, a.staffId]));

      // 2. Generate a unique batch ID
      const batchId = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 3. Perform deletes and create history entries in a transaction
      await fastify.prisma.crm.$transaction([
        fastify.prisma.crm.crmCustomerAssignment.deleteMany({
          where: { legacyUserId: { in: customerIds } },
        }),
        ...customerIds.map((cid) =>
          fastify.prisma.crm.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: cid,
              prevStaffId: assignmentMap.get(cid) ?? null,
              newStaffId: null,
              assignedBy: adminUser.id,
            },
          })
        ),
      ]);

      return { success: true, count: customerIds.length, batchId };
    } catch (error) {
      fastify.log.error({ err: error }, 'Unassign customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to unassign customers' });
    }
  });

  // GET /api/customers/assignment-history
  // Get history of allocations grouped by batchId
  fastify.get('/customers/assignment-history', { preHandler: [requireAuth] }, async (request, reply) => {
    const adminUser = request.user as { id: number; role: string };
    if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền xem lịch sử phân bổ.' });
    }

    const { page = '1', limit = '10' } = request.query as { page?: string; limit?: string };
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    try {
      // 1. Get unique batchIds with pagination (ordered by assignedAt desc)
      const [distinctHistory, allBatches] = await Promise.all([
        fastify.prisma.crm.crmAssignmentHistory.findMany({
          distinct: ['batchId'],
          orderBy: { assignedAt: 'desc' },
          skip,
          take: limitNum,
          select: {
            batchId: true,
            assignedAt: true,
            isUndone: true,
            undoneAt: true,
            newStaff: { select: { displayName: true } },
            assigner: { select: { displayName: true } },
          },
        }),
        // Prisma does not support COUNT(DISTINCT ...) for this model, so grouping is
        // retained while it runs concurrently with the paged batch lookup.
        fastify.prisma.crm.crmAssignmentHistory.groupBy({ by: ['batchId'] }),
      ]);
      const total = allBatches.length;

      if (distinctHistory.length === 0) {
        return {
          data: [],
          pagination: {
            total: 0,
            page: pageNum,
            limit: limitNum,
            pages: 0,
          },
        };
      }

      // 3. For each distinct batch, fetch the total count of customers and if the batch is undone
      const batchIds = distinctHistory.map((h) => h.batchId);
      const batchStats = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId', 'isUndone'],
        where: { batchId: { in: batchIds } },
        _count: { id: true },
      });

      // Group stats by batchId
      const statsMap = new Map<string, { count: number; isUndone: boolean }>();
      batchStats.forEach((stat) => {
        const existing = statsMap.get(stat.batchId);
        if (existing) {
          existing.count += stat._count.id;
          if (stat.isUndone) existing.isUndone = true;
        } else {
          statsMap.set(stat.batchId, {
            count: stat._count.id,
            isUndone: !!stat.isUndone,
          });
        }
      });

      const data = distinctHistory.map((h) => {
        const stat = statsMap.get(h.batchId) || { count: 0, isUndone: false };
        return {
          batchId: h.batchId,
          assignedAt: h.assignedAt,
          assignedBy: h.assigner?.displayName || 'Hệ thống',
          newStaffName: h.newStaff?.displayName || null,
          customerCount: stat.count,
          isUndone: !!h.isUndone || stat.isUndone,
          undoneAt: h.undoneAt,
        };
      });

      return {
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Get assignment history error');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment history' });
    }
  });

  // GET /api/customers/assignment-history/:batchId/details
  // Get detailed list of customers assigned in a batch
  fastify.get(
    '/customers/assignment-history/:batchId/details',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const adminUser = request.user as { id: number; role: string };
      if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền xem chi tiết phân bổ.' });
      }

      const { batchId } = request.params as { batchId: string };
      if (!batchId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'batchId is required' });
      }

      try {
        const historyRecords = await fastify.prisma.crm.crmAssignmentHistory.findMany({
          where: { batchId },
          select: {
            id: true,
            legacyUserId: true,
            isUndone: true,
            undoneAt: true,
            prevStaff: { select: { displayName: true } },
            newStaff: { select: { displayName: true } },
          },
          orderBy: { id: 'asc' },
        });

        if (historyRecords.length === 0) {
          return { data: [] };
        }

        const customerIds = historyRecords.map((r) => r.legacyUserId);

        // Fetch customer names and phones from legacy database using queryRawUnsafe
        const legacyCustomers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          u.id,
          up.full_name as fullName,
          (
            SELECT uc.phone_number 
            FROM user_contact uc 
            WHERE uc.user_id = u.id AND uc.is_disabled = 0 
            LIMIT 1
          ) as phone
        FROM user u
        LEFT JOIN user_profile up ON u.id = up.user_id
        WHERE u.id IN (${customerIds.join(',')})
      `);

        const customerMap = new Map(legacyCustomers.map((c) => [Number(c.id), c]));

        const data = historyRecords.map((r) => {
          const legacyCust = customerMap.get(r.legacyUserId) || {
            fullName: `Khách hàng #${r.legacyUserId}`,
            phone: 'N/A',
          };
          return {
            id: r.id,
            legacyUserId: r.legacyUserId,
            fullName: legacyCust.fullName || `Khách hàng #${r.legacyUserId}`,
            phone: legacyCust.phone || 'N/A',
            prevStaffName: r.prevStaff?.displayName || 'Chưa phân bổ',
            newStaffName: r.newStaff?.displayName || 'Gỡ Booker',
            isUndone: r.isUndone === true || (r.isUndone as SafeAny) === 1,
            undoneAt: r.undoneAt,
          };
        });

        return { data };
      } catch (error) {
        fastify.log.error({ err: error }, 'Get assignment history details error');
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment history details' });
      }
    }
  );

  // POST /api/customers/assignment-history/undo
  // Undo a batch of assignments
  fastify.post('/customers/assignment-history/undo', { preHandler: [requireAuth] }, async (request, reply) => {
    const adminUser = request.user as { id: number; role: string };
    if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền hoàn tác phân bổ.' });
    }

    const { batchId } = request.body as { batchId: string };
    if (!batchId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'batchId is required' });
    }

    try {
      // 1. Find all history records for this batch that are not undone
      const historyRecords = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        where: { batchId, isUndone: false },
        select: { legacyUserId: true, prevStaffId: true, newStaffId: true },
      });

      if (historyRecords.length === 0) {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Đợt phân bổ này không tồn tại hoặc đã được hoàn tác trước đó.' });
      }

      const customerIds = historyRecords.map((r) => r.legacyUserId);
      const newStaffId = historyRecords[0].newStaffId;

      // 2. Fetch current assignments of these customers to check if they've changed
      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: customerIds } },
        select: { legacyUserId: true, staffId: true },
      });
      const currentMap = new Map(currentAssignments.map((a) => [a.legacyUserId, a.staffId]));

      // 3. Determine which assignments can be safely reverted (where current staff matches newStaffId of the batch)
      const assignmentsToRevert: typeof historyRecords = [];
      for (const record of historyRecords) {
        const currentStaffId = currentMap.get(record.legacyUserId);

        const isCurrentMatch =
          (newStaffId === null && currentStaffId === undefined) ||
          (newStaffId !== null && currentStaffId === newStaffId);

        if (isCurrentMatch) {
          assignmentsToRevert.push(record);
        }
      }

      // 4. Run the reversion in a transaction
      await fastify.prisma.crm.$transaction(async (tx) => {
        for (const record of assignmentsToRevert) {
          if (record.prevStaffId === null) {
            await tx.crmCustomerAssignment.deleteMany({
              where: { legacyUserId: record.legacyUserId },
            });
          } else {
            await tx.crmCustomerAssignment.upsert({
              where: { legacyUserId: record.legacyUserId },
              update: { staffId: record.prevStaffId, assignedBy: adminUser.id },
              create: { legacyUserId: record.legacyUserId, staffId: record.prevStaffId, assignedBy: adminUser.id },
            });
          }
        }

        // Mark the entire batch in history as undone
        await tx.crmAssignmentHistory.updateMany({
          where: { batchId },
          data: {
            isUndone: true,
            undoneAt: new Date(),
          },
        });
      });

      return {
        success: true,
        revertedCount: assignmentsToRevert.length,
        totalCount: historyRecords.length,
        skippedCount: historyRecords.length - assignmentsToRevert.length,
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Undo assignment error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to undo assignments' });
    }
  });
}
