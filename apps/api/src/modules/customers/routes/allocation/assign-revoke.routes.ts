import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../../middlewares/auth.js';
import { canManageCustomerAllocation } from '@mos-lab/shared';
import { AllocationService } from '../../../allocation/allocation.service.js';
import { AllocationLedgerService } from '../../../allocation/allocation-ledger.service.js';

export function registerCustomerAssignRevokeRoutes(fastify: FastifyInstance) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      fastify.log.error({ err: error }, 'Unassign customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to unassign customers' });
    }
  });
}
