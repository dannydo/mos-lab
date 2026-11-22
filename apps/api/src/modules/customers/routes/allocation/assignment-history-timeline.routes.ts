import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../../middlewares/auth.js';
import { canManageCustomerAllocation, SafeAny } from '@mos-lab/shared';
import { AllocationLedgerService } from '../../../allocation/allocation-ledger.service.js';
import { createRouteHelpers } from '../helpers.js';

export function registerCustomerAssignmentHistoryRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess } = createRouteHelpers(fastify);

  // GET /api/customers/assignment-history
  // Get history of allocations grouped by batchId
  fastify.get('/customers/assignment-history', { preHandler: [requireAuth] }, async (request, reply) => {
    const adminUser = request.user as { id: number; role: string };
    if (!canManageCustomerAllocation(adminUser.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền xem lịch sử phân bổ.' });
    }

    const {
      page = '1',
      limit = '10',
      search,
      actionType,
    } = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      actionType?: string;
    };
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    try {
      // Build filter conditions for search and action type
      const whereConditions: SafeAny[] = [];

      if (actionType === 'ASSIGN') {
        whereConditions.push({ actionType: 'ASSIGN', isUndone: false });
      } else if (actionType === 'ACCEPT' || actionType === 'ACCEPT_ALLOCATION') {
        whereConditions.push({ actionType: { in: ['ACCEPT', 'ACCEPT_ALLOCATION'] } });
      } else if (actionType === 'REVOKE') {
        whereConditions.push({ actionType: 'REVOKE' });
      } else if (actionType === 'TRANSFER') {
        whereConditions.push({ actionType: 'TRANSFER' });
      } else if (actionType === 'RANDOM') {
        whereConditions.push({ actionType: 'RANDOM_SELECT' });
      } else if (actionType === 'UNDONE') {
        whereConditions.push({ isUndone: true });
      }

      if (search && search.trim()) {
        const q = search.trim();
        whereConditions.push({
          OR: [
            { newStaff: { displayName: { contains: q } } },
            { prevStaff: { displayName: { contains: q } } },
            { assigner: { displayName: { contains: q } } },
            { sourceFilterSummary: { contains: q } },
            { reason: { contains: q } },
          ],
        });
      }

      const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

      // 1. Fetch total count of distinct matching batches
      const totalGroups = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId'],
        where,
      });
      const total = totalGroups.length;

      if (total === 0) {
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

      // 2. Fetch distinct batch IDs for current page ordered by assignedAt desc
      const pageGroups = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId'],
        where,
        _max: {
          assignedAt: true,
          id: true,
        },
        orderBy: {
          _max: {
            assignedAt: 'desc',
          },
        },
        skip,
        take: limitNum,
      });
      const batchIds = pageGroups.map((g) => g.batchId);

      // 3. Fetch one representative history row for each batch ID in page
      const representativeRows = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        where: {
          batchId: { in: batchIds },
        },
        distinct: ['batchId'],
        include: {
          newStaff: { select: { displayName: true } },
          prevStaff: { select: { displayName: true } },
          assigner: { select: { displayName: true } },
        },
      });
      const repMap = new Map(representativeRows.map((r) => [r.batchId, r]));

      // 4. Fetch stats (customer count & isUndone) for each batch ID in page
      const batchStats = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId', 'isUndone'],
        where: { batchId: { in: batchIds } },
        _count: { id: true },
      });

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

      // 5. Map results preserving batchIds order
      const data = batchIds
        .map((bId) => {
          const h = repMap.get(bId);
          if (!h) return null;
          const stat = statsMap.get(bId) || { count: 0, isUndone: false };
          return {
            batchId: h.batchId,
            assignedAt: h.assignedAt,
            assignedBy: h.assigner?.displayName || 'Hệ thống',
            newStaffName: h.newStaff?.displayName || null,
            prevStaffName: h.prevStaff?.displayName || null,
            customerCount: stat.count,
            isUndone: !!h.isUndone || stat.isUndone,
            undoneAt: h.undoneAt,
            expiresAt: h.expiresAt,
            sourceType: h.sourceType,
            sourceFilterSummary: h.sourceFilterSummary,
            sourceFilterJson: h.sourceFilterJson,
            actionType: h.actionType,
            reason: h.reason,
          };
        })
        .filter(Boolean);

      return {
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Get assignment history error');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment history' });
    }
  });

  // GET /api/customers/assignment-history/:batchId/details
  fastify.get(
    '/customers/assignment-history/:batchId/details',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const adminUser = request.user as { id: number; role: string };
      if (!canManageCustomerAllocation(adminUser.role)) {
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
          include: {
            prevStaff: { select: { displayName: true } },
            newStaff: { select: { displayName: true } },
          },
          orderBy: { id: 'asc' },
        });

        if (historyRecords.length === 0) {
          const numericId = parseInt(batchId, 10);
          if (!isNaN(numericId) && numericId > 0) {
            const allocBatch = await fastify.prisma.crm.crmAllocationBatch.findUnique({
              where: { id: numericId },
              include: { booker: { select: { displayName: true } }, items: true },
            });
            if (allocBatch && allocBatch.items.length > 0) {
              const data = allocBatch.items.map((item) => ({
                id: item.id,
                legacyUserId: item.customerId,
                fullName: item.customerName || `Khách hàng #${item.customerId}`,
                phone: item.customerPhone || 'N/A',
                prevStaffName: 'Chưa phân bổ',
                newStaffName: allocBatch.booker?.displayName || 'Booker',
                isUndone: false,
                undoneAt: null,
                actionType: 'ASSIGN',
                reason: null,
                sourceFilterSummary: allocBatch.sourceFilterSummary,
              }));
              return { data };
            }
          }
          return { data: [] };
        }

        const customerIds = historyRecords.map((r) => r.legacyUserId);

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
            actionType: r.actionType,
            reason: r.reason,
            sourceFilterSummary: r.sourceFilterSummary,
          };
        });

        return { data };
      } catch (error: SafeAny) {
        fastify.log.error({ err: error }, 'Get assignment history details error');
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment history details' });
      }
    }
  );

  // POST /api/customers/assignment-history/undo
  // Undo a batch of assignments with MANDATORY reason (supports force option for old batches)
  fastify.post('/customers/assignment-history/undo', { preHandler: [requireAuth] }, async (request, reply) => {
    const adminUser = request.user as { id: number; role: string };
    if (!canManageCustomerAllocation(adminUser.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền hoàn tác phân bổ.' });
    }

    const { batchId, reason, force = true } = request.body as { batchId: string; reason?: string; force?: boolean };
    if (!batchId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'batchId is required' });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Vui lòng nhập lý do hoàn tác đợt phân bổ.' });
    }

    const cleanReason = reason.trim();

    try {
      const historyRecords = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        where: { batchId, isUndone: false },
      });

      if (historyRecords.length === 0) {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Đợt phân bổ này không tồn tại hoặc đã được hoàn tác trước đó.' });
      }

      const customerIds = historyRecords.map((r) => r.legacyUserId);
      const newStaffId = historyRecords[0].newStaffId;

      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: customerIds } },
      });
      const currentMap = new Map(currentAssignments.map((a) => [a.legacyUserId, a.staffId]));

      const assignmentsToRevert: typeof historyRecords = [];
      for (const record of historyRecords) {
        const currentStaffId = currentMap.get(record.legacyUserId);

        // In force mode (or if current staff still matches), revert the assignment
        const isCurrentMatch =
          force ||
          (newStaffId === null && currentStaffId === undefined) ||
          (newStaffId !== null && currentStaffId === newStaffId);

        if (isCurrentMatch) {
          assignmentsToRevert.push(record);
        }
      }

      await fastify.prisma.crm.$transaction(async (tx) => {
        for (const record of assignmentsToRevert) {
          const existing = await tx.crmCustomerAssignment.findUnique({
            where: { legacyUserId: record.legacyUserId },
          });

          await AllocationLedgerService.setOwner(tx, {
            customerId: record.legacyUserId,
            eventType: 'UNDO_REVERSED',
            previousStaffId: existing?.staffId ?? null,
            nextStaffId: record.prevStaffId,
            actorStaffId: adminUser.id,
            reason: cleanReason,
            sourceType: 'MANUAL',
            actionContext: 'ASSIGNMENT_HISTORY_UNDO',
            batchId,
            correlationId: String(record.id),
            deleteWhenPool: true,
          });
        }
        // Undo is an appended reversal event; historic rows must not be rewritten.
      });

      return {
        success: true,
        revertedCount: assignmentsToRevert.length,
        totalCount: historyRecords.length,
        skippedCount: historyRecords.length - assignmentsToRevert.length,
      };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Undo assignment error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to undo assignments' });
    }
  });

  // GET /api/customers/:id/assignment-timeline
  // Get complete allocation audit trail timeline for a single customer
  fastify.get('/customers/:id/assignment-timeline', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    try {
      const ledgerEvents = await fastify.prisma.crm.crmAllocationLedgerEvent.findMany({
        where: { legacyUserId: customerId },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      });
      const staffIds = Array.from(
        new Set(
          ledgerEvents
            .flatMap((event) => [event.previousStaffId, event.nextStaffId, event.actorStaffId])
            .filter((id): id is number => id !== null)
        )
      );
      const staff = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, displayName: true },
      });
      const staffNames = new Map(staff.map((member) => [member.id, member.displayName]));

      const data = ledgerEvents.map((event) => {
        let metadata: Record<string, unknown> | null = null;
        if (event.metadataJson) {
          try {
            metadata = JSON.parse(event.metadataJson) as Record<string, unknown>;
          } catch {
            metadata = { raw: event.metadataJson };
          }
        }
        return {
          id: event.id,
          batchId: event.batchId || '',
          assignedAt: event.occurredAt,
          actionType: event.eventType,
          staffId: event.nextStaffId,
          staffName:
            event.nextStaffLabel ||
            (event.nextStaffId ? staffNames.get(event.nextStaffId) || `Nhân sự #${event.nextStaffId}` : null),
          prevStaffId: event.previousStaffId,
          prevStaffName:
            event.previousStaffLabel ||
            (event.previousStaffId
              ? staffNames.get(event.previousStaffId) || `Nhân sự #${event.previousStaffId}`
              : null),
          assignedBy:
            event.actorLabel ||
            (event.actorStaffId ? staffNames.get(event.actorStaffId) || `Nhân sự #${event.actorStaffId}` : 'Hệ thống'),
          expiresAt: null,
          durationDays: null,
          isRetained: event.eventType === 'RETENTION_CHANGED' ? metadata?.isRetained === true : false,
          sourceType: event.sourceType,
          sourceFilterSummary: event.campaignId
            ? `Chiến dịch #${event.campaignId}${event.actionContext ? ` · ${event.actionContext}` : ''}`
            : event.actionContext,
          reason: event.reason,
          isUndone: metadata?.legacyIsUndone === true,
          actionContext: event.actionContext,
          campaignId: event.campaignId,
          correlationId: event.correlationId,
        };
      });

      return { data };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Get customer assignment timeline error');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment timeline' });
    }
  });
}
