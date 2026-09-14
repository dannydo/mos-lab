import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { canManageCustomerAllocation, isAdminOrSuperAdminRole, SafeAny } from '@mos-lab/shared';
import { AllocationService } from '../../allocation/allocation.service.js';
import { TeamService } from '../../teams/team.service.js';
import { CustomerAccessService } from '../services/customer-access.service.js';
import { AllocationLedgerService } from '../../allocation/allocation-ledger.service.js';
import { createRouteHelpers } from './helpers.js';

export async function registerCustomerAllocationRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess } = createRouteHelpers(fastify);

  // POST /api/customers/assign
  // Assign multiple customers to a staff member with durable ownership and source tracking
  fastify.post('/customers/assign', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      customerIds,
      staffId,
      sourceType = 'MANUAL',
      sourceFilterSummary,
      sourceFilterJson,
      parentBatchId,
    } = request.body as {
      customerIds: number[];
      staffId: number;
      sourceType?: string;
      sourceFilterSummary?: string;
      sourceFilterJson?: string;
      parentBatchId?: string;
    };
    const adminUser = request.user as { id: number; role: string };

    if (!canManageCustomerAllocation(adminUser.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền phân bổ khách hàng.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0 || !staffId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds and staffId are required' });
    }

    try {
      const now = new Date();

      // 3. Generate a unique batch ID
      const batchId = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const summaryText = parentBatchId
        ? `${sourceFilterSummary || 'Phân bổ Booker'} (Nguồn: ${parentBatchId})`
        : sourceFilterSummary || null;

      // 4. Ownership and immutable evidence share one transaction.
      await fastify.prisma.crm.$transaction(async (tx) => {
        for (const cid of customerIds) {
          const previous = await tx.crmCustomerAssignment.findUnique({ where: { legacyUserId: cid } });
          const eventType = previous?.staffId && previous.staffId !== staffId ? 'TRANSFERRED' : 'ACCEPTED';
          const reason = parentBatchId
            ? `Nguồn ngẫu nhiên: ${parentBatchId}`
            : sourceFilterSummary || 'Quản lý phân bổ trực tiếp';
          await AllocationLedgerService.setOwner(tx, {
            customerId: cid,
            nextStaffId: staffId,
            actorStaffId: adminUser.id,
            eventType,
            previousStaffId: previous?.staffId ?? null,
            reason,
            sourceType: sourceType || 'MANUAL',
            actionContext: 'CUSTOMER_DIRECT_ASSIGN',
            batchId,
            correlationId: parentBatchId || null,
            occurredAt: now,
          });
          await tx.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: cid,
              prevStaffId: previous?.staffId ?? null,
              newStaffId: staffId,
              assignedBy: adminUser.id,
              assignedAt: now,
              expiresAt: null,
              sourceType: sourceType || 'MANUAL',
              sourceFilterSummary: summaryText,
              sourceFilterJson: sourceFilterJson || null,
              actionType: 'ASSIGN',
              reason,
            },
          });
        }
      });

      return { success: true, count: customerIds.length, batchId };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Assign customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to assign customers' });
    }
  });

  // POST /api/customers/revoke/preview
  // Preview breakdown of customers before revoking
  fastify.post('/customers/revoke/preview', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds } = request.body as { customerIds: number[] };
    const adminUser = request.user as { id: number; role: string };

    if (!canManageCustomerAllocation(adminUser.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền xem thông tin thu hồi.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    try {
      const activeAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: {
          legacyUserId: { in: customerIds },
          staffId: { not: null },
        },
        include: {
          staff: { select: { id: true, displayName: true } },
        },
      });

      const activeBatchItems = await fastify.prisma.crm.crmAllocationBatchItem.findMany({
        where: {
          customerId: { in: customerIds },
          status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] },
        },
        include: {
          batch: {
            include: {
              booker: { select: { id: true, displayName: true } },
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      const assignedMap = new Map<number, { staffId: number; staffName: string }>();

      for (const a of activeAssignments) {
        if (a.staffId) {
          assignedMap.set(a.legacyUserId, {
            staffId: a.staffId,
            staffName: a.staff?.displayName || `Booker #${a.staffId}`,
          });
        }
      }

      for (const bi of activeBatchItems) {
        if (bi.batch?.bookerId) {
          assignedMap.set(bi.customerId, {
            staffId: bi.batch.bookerId,
            staffName: bi.batch.booker?.displayName || `Booker #${bi.batch.bookerId}`,
          });
        }
      }

      const assignedCount = assignedMap.size;
      const unassignedCount = customerIds.length - assignedCount;

      const staffCountMap = new Map<number, { staffName: string; count: number }>();
      for (const info of assignedMap.values()) {
        const existing = staffCountMap.get(info.staffId);
        if (existing) {
          existing.count += 1;
        } else {
          staffCountMap.set(info.staffId, { staffName: info.staffName, count: 1 });
        }
      }

      const staffBreakdown = Array.from(staffCountMap.entries()).map(([staffId, info]) => ({
        staffId,
        staffName: info.staffName,
        count: info.count,
      }));

      return {
        totalCount: customerIds.length,
        unassignedCount,
        assignedCount,
        staffBreakdown,
      };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Revoke preview error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to generate revoke preview' });
    }
  });

  // POST /api/customers/revoke
  // Revoke assignments before expiration (to pool or re-assign to targetStaffId) with MANDATORY reason
  fastify.post('/customers/revoke', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      customerIds,
      targetStaffId,
      reason,
      batchId: requestedBatchId,
      parentBatchId,
    } = request.body as {
      customerIds: number[];
      targetStaffId?: number | null;
      reason: string;
      batchId?: string;
      parentBatchId?: string;
    };
    const adminUser = request.user as { id: number; role: string };

    if (!canManageCustomerAllocation(adminUser.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền thu hồi phân bổ.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Vui lòng cung cấp lý do thu hồi data.' });
    }

    const cleanReason = reason.trim();

    try {
      // 1. Fetch active assignments from crmCustomerAssignment
      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: {
          legacyUserId: { in: customerIds },
          staffId: { not: null },
        },
      });

      // 2. Fetch active items from crmAllocationBatchItem
      const currentBatchItems = await fastify.prisma.crm.crmAllocationBatchItem.findMany({
        where: {
          customerId: { in: customerIds },
          status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] },
        },
        include: {
          batch: true,
        },
        orderBy: { id: 'desc' },
      });

      const assignmentMap = new Map<number, number>();
      for (const a of currentAssignments) {
        if (a.staffId) {
          assignmentMap.set(a.legacyUserId, a.staffId);
        }
      }
      for (const bi of currentBatchItems) {
        if (bi.batch?.bookerId) {
          assignmentMap.set(bi.customerId, bi.batch.bookerId);
        }
      }

      const toRevokeUserIds = Array.from(assignmentMap.keys());
      const skippedUnassignedCount = customerIds.length - toRevokeUserIds.length;

      if (toRevokeUserIds.length === 0) {
        return {
          success: true,
          count: customerIds.length,
          revokedCount: 0,
          skippedUnassignedCount,
          batchId: null,
          message: 'Tất cả khách hàng đã chọn đều chưa được phân bổ.',
        };
      }

      const batchId = requestedBatchId || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();

      if (targetStaffId) {
        // A transfer remains pending until the new Booker accepts.
        await fastify.prisma.crm.$transaction(async (tx) => {
          await tx.crmAllocationBatchItem.updateMany({
            where: { customerId: { in: toRevokeUserIds }, status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] } },
            data: { status: 'RECALLED' },
          });
          for (const item of currentBatchItems) {
            if (!toRevokeUserIds.includes(item.customerId)) continue;
            await AllocationLedgerService.append(tx, {
              customerId: item.customerId,
              eventType: 'RECALLED',
              previousStaffId: item.batch.bookerId,
              nextStaffId: item.batch.bookerId,
              actorStaffId: adminUser.id,
              reason: cleanReason,
              sourceType: 'MANUAL',
              actionContext: 'CUSTOMER_TRANSFER_RECALL_SOURCE_BATCH',
              batchId: item.batch.batchCode,
              campaignId: item.batch.campaignId,
              correlationId: batchId,
              occurredAt: now,
            });
          }
        });
        await AllocationService.createBatch(fastify, adminUser.id, {
          bookerId: targetStaffId,
          customerIds: toRevokeUserIds,
          sourceType: 'MANUAL',
          sourceFilterSummary: `Chuyển giao cho Booker #${targetStaffId}: ${cleanReason}`,
          sourceFilterJson: JSON.stringify({ transferReason: cleanReason, parentBatchId }),
          parentBatchId: batchId,
        });
      } else {
        // Revoke back to pool
        await fastify.prisma.crm.$transaction(async (tx) => {
          for (const cid of toRevokeUserIds) {
            const existing = await tx.crmCustomerAssignment.findUnique({ where: { legacyUserId: cid } });
            await AllocationLedgerService.setOwner(tx, {
              customerId: cid,
              eventType: 'RETURNED_TO_POOL',
              previousStaffId: assignmentMap.get(cid) ?? existing?.staffId ?? null,
              nextStaffId: null,
              actorStaffId: adminUser.id,
              reason: parentBatchId ? `${cleanReason} (Nguồn: ${parentBatchId})` : cleanReason,
              sourceType: 'MANUAL',
              actionContext: 'CUSTOMER_REVOKE_TO_POOL',
              batchId,
              correlationId: parentBatchId || null,
              deleteWhenPool: true,
              occurredAt: now,
            });

            await tx.crmAssignmentHistory.create({
              data: {
                batchId,
                legacyUserId: cid,
                prevStaffId: assignmentMap.get(cid) ?? null,
                newStaffId: null,
                assignedBy: adminUser.id,
                assignedAt: now,
                actionType: 'REVOKE',
                reason: parentBatchId ? `${cleanReason} (Nguồn: ${parentBatchId})` : cleanReason,
              },
            });
          }

          // Historic compatibility rows are intentionally never altered.
        });
      }

      return {
        success: true,
        count: customerIds.length,
        revokedCount: toRevokeUserIds.length,
        skippedUnassignedCount,
        batchId,
      };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Revoke customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to revoke customers' });
    }
  });

  // POST /api/customers/unassign
  fastify.post('/customers/unassign', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds, reason = 'Hủy phân bổ thủ công' } = request.body as { customerIds: number[]; reason?: string };
    const adminUser = request.user as { id: number; role: string };

    if (!canManageCustomerAllocation(adminUser.role)) {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền hủy phân bổ khách hàng.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    try {
      const batchId = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();

      await fastify.prisma.crm.$transaction(async (tx) => {
        for (const cid of customerIds) {
          const existing = await tx.crmCustomerAssignment.findUnique({ where: { legacyUserId: cid } });
          await AllocationLedgerService.setOwner(tx, {
            customerId: cid,
            eventType: 'RETURNED_TO_POOL',
            previousStaffId: existing?.staffId ?? null,
            nextStaffId: null,
            actorStaffId: adminUser.id,
            reason,
            sourceType: 'MANUAL',
            actionContext: 'CUSTOMER_UNASSIGN',
            batchId,
            deleteWhenPool: true,
            occurredAt: now,
          });
          await tx.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: cid,
              prevStaffId: existing?.staffId ?? null,
              newStaffId: null,
              assignedBy: adminUser.id,
              assignedAt: now,
              actionType: 'REVOKE',
              reason,
            },
          });
        }
      });

      return { success: true, count: customerIds.length, batchId };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Unassign customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to unassign customers' });
    }
  });

  // POST /api/customers/retain
  // Booker toggles retained data within their quota limit
  fastify.post('/customers/retain', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds, isRetained = true } = request.body as { customerIds: number[]; isRetained?: boolean };
    const user = request.user as { id: number; role: string };

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    try {
      // Fetch staff quota configuration
      const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKER_RETAIN_QUOTA_CONFIG' },
      });

      let quotaLimit = 50; // Default limit per booker
      if (configRecord?.value) {
        try {
          const quotaMap = JSON.parse(configRecord.value);
          if (quotaMap[user.id] !== undefined) {
            quotaLimit = Number(quotaMap[user.id]);
          } else if (quotaMap.default !== undefined) {
            quotaLimit = Number(quotaMap.default);
          }
        } catch {
          // ignore parse error
        }
      }

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
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Retain customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi khi cập nhật giữ data' });
    }
  });

  // GET /api/customers/booker-retain-quota
  fastify.get('/customers/booker-retain-quota', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string };

    try {
      const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKER_RETAIN_QUOTA_CONFIG' },
      });

      let quotaLimit = 50;
      if (configRecord?.value) {
        try {
          const quotaMap = JSON.parse(configRecord.value);
          if (quotaMap[user.id] !== undefined) {
            quotaLimit = Number(quotaMap[user.id]);
          } else if (quotaMap.default !== undefined) {
            quotaLimit = Number(quotaMap.default);
          }
        } catch {
          // ignore
        }
      }

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
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Get retain quota error');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Lỗi khi lấy thông tin Quota giữ data' });
    }
  });

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
