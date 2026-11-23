import { FastifyInstance } from 'fastify';
import {
  CreateAllocationBatchDto,
  CustomerAllocationBatch,
  DeclineAllocationBatchDto,
  RecallAllocationBatchDto,
} from '@mos-lab/shared';
import { Prisma } from '../../../generated/crm-client/index.js';
import { AllocationLedgerService } from '../allocation-ledger.service.js';
import { mapAllocationBatchToDto } from './allocation-helpers.js';

/**
 * Expire only unaccepted batches after their 24-hour verification window.
 * Accepted customer ownership is durable until an explicit manager recall.
 */
export async function checkAndExpireBatches(fastify: FastifyInstance): Promise<void> {
  const now = new Date();

  // 1. Expire 24h pending verification batches that timed out
  const overduePendingBatches = await fastify.prisma.crm.crmAllocationBatch.findMany({
    where: {
      status: 'PENDING_ACCEPT',
      expiresAt: { lte: now },
    },
    include: { items: true },
  });

  for (const batch of overduePendingBatches) {
    await fastify.prisma.crm.$transaction(async (tx) => {
      // Atomic updateMany: check status: 'PENDING_ACCEPT' first before creating history
      const updateRes = await tx.crmAllocationBatch.updateMany({
        where: {
          id: batch.id,
          status: 'PENDING_ACCEPT',
        },
        data: { status: 'EXPIRED' },
      });

      if (updateRes.count === 0) {
        // Already updated by another concurrent process, skip history
        return;
      }

      await tx.crmAllocationBatchItem.updateMany({
        where: { batchId: batch.id },
        data: { status: 'EXPIRED' },
      });

      // Record history log
      for (const item of batch.items) {
        await AllocationLedgerService.append(tx, {
          customerId: item.customerId,
          eventType: 'EXPIRED',
          actorStaffId: batch.assignerId,
          reason: 'Tự động hết hạn 24h chờ xác nhận (Auto Expired 24h)',
          sourceType: 'SYSTEM',
          actionContext: 'ALLOCATION_BATCH_EXPIRY',
          batchId: batch.batchCode,
          occurredAt: now,
        });
        await tx.crmAssignmentHistory.create({
          data: {
            batchId: batch.batchCode,
            legacyUserId: item.customerId,
            newStaffId: null,
            assignedBy: batch.assignerId,
            actionType: 'EXPIRE',
            reason: 'Tự động hết hạn 24h chờ xác nhận (Auto Expired 24h)',
          },
        });
      }
    });
  }
}

/**
 * Admin/Manager creates a new customer allocation batch targeting a Booker.
 * Batch is created in PENDING_ACCEPT status with 24h expiration countdown timer.
 */
export async function createAllocationBatch(
  fastify: FastifyInstance,
  assignerId: number,
  dto: CreateAllocationBatchDto,
  checkAndExpireBatchesFn: (f: FastifyInstance) => Promise<void> = checkAndExpireBatches
): Promise<CustomerAllocationBatch> {
  // Run maintenance check
  await checkAndExpireBatchesFn(fastify);

  const { bookerId, customerIds } = dto;

  if (!customerIds || customerIds.length === 0) {
    throw new Error('Danh sách khách hàng phân bổ không được rỗng');
  }

  // Verify target booker exists
  const booker = await fastify.prisma.crm.crmStaff.findUnique({
    where: { id: bookerId },
  });

  if (!booker) {
    throw new Error(`Nhân viên Booker (ID: ${bookerId}) không tồn tại`);
  }

  const uniqueCustomerIds = Array.from(new Set(customerIds));

  // Fetch customer details from legacy database for UI preview enrichment
  const [profiles, contacts] = await Promise.all([
    fastify.prisma.legacy.user_profile.findMany({
      where: { user_id: { in: uniqueCustomerIds } },
      select: { user_id: true, full_name: true },
    }),
    fastify.prisma.legacy.user_contact.findMany({
      where: { user_id: { in: uniqueCustomerIds }, is_disabled: false },
      select: { user_id: true, phone_number: true },
    }),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.user_id, p.full_name]));
  const phoneMap = new Map(contacts.map((c) => [c.user_id, c.phone_number]));

  const batchCode = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 Hours Countdown

  const createdBatch = await fastify.prisma.crm.$transaction(async (tx) => {
    // R2: Strict Deduplication & Pre-Batch Filtering INSIDE Prisma $transaction block with FOR UPDATE lock
    const pendingItemsRaw = await tx.$queryRaw<{ id: number; batch_id: number; customer_id: number }[]>`
      SELECT id, batch_id, customer_id FROM crm_allocation_batch_items 
      WHERE customer_id IN (${Prisma.join(uniqueCustomerIds)}) 
        AND status = 'PENDING_ACCEPT' 
      FOR UPDATE
    `;

    // If re-allocating customers currently in PENDING_ACCEPT status, recall old pending items so new allocation succeeds
    if (pendingItemsRaw.length > 0) {
      const pendingItemIds = pendingItemsRaw.map((i) => Number(i.id));
      await tx.crmAllocationBatchItem.updateMany({
        where: { id: { in: pendingItemIds } },
        data: { status: 'RECALLED' },
      });
      const affectedBatchIds = Array.from(new Set(pendingItemsRaw.map((i) => Number(i.batch_id))));
      const recalledBatches = await tx.crmAllocationBatch.findMany({
        where: { id: { in: affectedBatchIds } },
        select: { id: true, batchCode: true, bookerId: true, campaignId: true },
      });
      const recalledBatchById = new Map(recalledBatches.map((batch) => [batch.id, batch]));
      for (const item of pendingItemsRaw) {
        const recalledBatch = recalledBatchById.get(Number(item.batch_id));
        await AllocationLedgerService.append(tx, {
          customerId: Number(item.customer_id),
          eventType: 'RECALLED',
          previousStaffId: recalledBatch?.bookerId ?? null,
          nextStaffId: null,
          actorStaffId: assignerId,
          reason: 'Thu hồi đề nghị phân bổ đang chờ để tạo đề nghị mới',
          sourceType: 'MANUAL',
          actionContext: 'PENDING_BATCH_REPLACED',
          batchId: recalledBatch?.batchCode ?? String(item.batch_id),
          campaignId: recalledBatch?.campaignId ?? null,
          occurredAt: now,
        });
      }
      for (const pBatchId of affectedBatchIds) {
        const remainingPendingCount = await tx.crmAllocationBatchItem.count({
          where: { batchId: pBatchId, status: 'PENDING_ACCEPT' },
        });
        if (remainingPendingCount === 0) {
          await tx.crmAllocationBatch.update({
            where: { id: pBatchId },
            data: { status: 'RECALLED', recalledAt: now },
          });
        }
      }
    }

    const batch = await tx.crmAllocationBatch.create({
      data: {
        batchCode,
        campaignId: dto.campaignId || null,
        assignerId,
        bookerId,
        totalCount: uniqueCustomerIds.length,
        status: 'PENDING_ACCEPT',
        expiresAt,
        sourceFilterSummary: dto.sourceFilterSummary || null,
        sourceFilterJson: dto.sourceFilterJson || null,
      },
    });

    const itemData = uniqueCustomerIds.map((cId) => {
      const name = profileMap.get(cId) || `Khách hàng #${cId}`;
      const phone = phoneMap.get(cId) || null;
      return {
        batchId: batch.id,
        customerId: cId,
        customerName: name,
        customerPhone: phone,
        status: 'PENDING_ACCEPT',
      };
    });

    await tx.crmAllocationBatchItem.createMany({
      data: itemData,
    });

    const currentAssignments = await tx.crmCustomerAssignment.findMany({
      where: { legacyUserId: { in: uniqueCustomerIds } },
      select: { legacyUserId: true, staffId: true },
    });
    const currentOwnerByCustomer = new Map(
      currentAssignments.map((assignment) => [assignment.legacyUserId, assignment.staffId])
    );
    for (const customerId of uniqueCustomerIds) {
      await AllocationLedgerService.append(tx, {
        customerId,
        eventType: 'OFFERED',
        previousStaffId: currentOwnerByCustomer.get(customerId) ?? null,
        nextStaffId: bookerId,
        actorStaffId: assignerId,
        reason: dto.sourceFilterSummary || 'Quản lý tạo đề nghị phân bổ chờ Booker xác nhận',
        sourceType: dto.sourceType || 'MANUAL',
        actionContext: 'ALLOCATION_BATCH_CREATED',
        batchId: batch.batchCode,
        campaignId: dto.campaignId || null,
        correlationId: dto.parentBatchId || null,
        metadata: { expiresAt: expiresAt.toISOString() },
        occurredAt: now,
      });
    }

    // Write representative history records so batch appears in AssignmentHistoryDrawer
    const historyData = uniqueCustomerIds.map((cId) => ({
      batchId: String(batch.id),
      legacyUserId: cId,
      newStaffId: bookerId,
      assignedBy: assignerId,
      assignedAt: now,
      expiresAt,
      sourceType: dto.sourceType || 'MANUAL',
      sourceFilterSummary: dto.sourceFilterSummary || null,
      sourceFilterJson: dto.sourceFilterJson || null,
      actionType: dto.sourceType === 'RANDOM' ? 'RANDOM_SELECT' : 'ASSIGN',
    }));

    await tx.crmAssignmentHistory.createMany({
      data: historyData,
    });

    return tx.crmAllocationBatch.findUnique({
      where: { id: batch.id },
      include: {
        assigner: { select: { id: true, displayName: true, username: true } },
        booker: { select: { id: true, displayName: true, username: true } },
        campaign: { select: { id: true, name: true, slug: true } },
        items: true,
      },
    });
  });

  if (!createdBatch) {
    throw new Error('Tạo đợt phân bổ thất bại');
  }

  return mapAllocationBatchToDto(createdBatch);
}

/**
 * Booker accepts an allocation batch ("Chấp nhận toàn bộ").
 * Updates batch & items to ACCEPTED and creates durable assignments,
 * and atomically assigns exact +N customers to Booker via Prisma $transaction.
 */
export async function acceptAllocationBatch(
  fastify: FastifyInstance,
  batchId: number,
  bookerId: number
): Promise<{ success: boolean; message: string; count: number }> {
  // Check batch status and expiration outside transaction first
  const batchInfo = await fastify.prisma.crm.crmAllocationBatch.findUnique({
    where: { id: batchId },
  });

  if (!batchInfo) {
    throw new Error('Đợt phân bổ không tồn tại');
  }

  if (batchInfo.bookerId !== bookerId) {
    throw new Error('Bạn không có quyền chấp nhận đợt phân bổ của người khác');
  }

  if (batchInfo.status !== 'PENDING_ACCEPT') {
    throw new Error(`Đợt phân bổ đã ở trạng thái ${batchInfo.status}, không thể chấp nhận`);
  }

  const now = new Date();
  if (now > batchInfo.expiresAt) {
    await fastify.prisma.crm.$transaction(async (tx) => {
      const expiringBatch = await tx.crmAllocationBatch.findUnique({
        where: { id: batchId },
        include: { items: true },
      });
      if (!expiringBatch || expiringBatch.status !== 'PENDING_ACCEPT') return;
      await tx.crmAllocationBatch.update({ where: { id: batchId }, data: { status: 'EXPIRED' } });
      await tx.crmAllocationBatchItem.updateMany({ where: { batchId }, data: { status: 'EXPIRED' } });
      for (const item of expiringBatch.items) {
        await AllocationLedgerService.append(tx, {
          customerId: item.customerId,
          eventType: 'EXPIRED',
          actorKind: 'SYSTEM',
          reason: 'Tự động hết hạn 24h chờ xác nhận (Auto Expired 24h)',
          sourceType: 'SYSTEM',
          actionContext: 'ALLOCATION_BATCH_ACCEPT_AFTER_EXPIRY',
          batchId: expiringBatch.batchCode,
          campaignId: expiringBatch.campaignId,
          occurredAt: now,
        });
      }
    });
    throw new Error('Đợt phân bổ đã vượt quá 24h xác nhận');
  }

  return fastify.prisma.crm.$transaction(async (tx) => {
    const batch = await tx.crmAllocationBatch.findUnique({
      where: { id: batchId },
      include: { items: true },
    });

    if (!batch) {
      throw new Error('Đợt phân bổ không tồn tại');
    }

    if (batch.bookerId !== bookerId) {
      throw new Error('Bạn không có quyền chấp nhận đợt phân bổ của người khác');
    }

    if (batch.status !== 'PENDING_ACCEPT') {
      throw new Error(`Đợt phân bổ đã ở trạng thái ${batch.status}, không thể chấp nhận`);
    }

    const txNow = new Date();
    if (txNow > batch.expiresAt) {
      throw new Error('Đợt phân bổ đã vượt quá 24h xác nhận');
    }

    // Update Batch Status
    await tx.crmAllocationBatch.update({
      where: { id: batchId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: txNow,
        retentionExpiresAt: null,
      },
    });

    await tx.crmAllocationBatchItem.updateMany({
      where: { batchId },
      data: { status: 'ACCEPTED' },
    });

    // R2: Exact +N Customer assignment & Audit logging
    for (const item of batch.items) {
      const existingAssignment = await tx.crmCustomerAssignment.findUnique({
        where: { legacyUserId: item.customerId },
      });
      await AllocationLedgerService.setOwner(tx, {
        customerId: item.customerId,
        eventType: existingAssignment?.staffId && existingAssignment.staffId !== bookerId ? 'TRANSFERRED' : 'ACCEPTED',
        previousStaffId: existingAssignment?.staffId ?? null,
        nextStaffId: bookerId,
        actorStaffId: bookerId,
        reason: batch.sourceFilterSummary || 'Booker đã chấp nhận đợt phân bổ data',
        sourceType: 'ALLOCATION',
        actionContext: 'ALLOCATION_BATCH_ACCEPTED',
        batchId: batch.batchCode,
        campaignId: batch.campaignId,
        occurredAt: txNow,
      });

      await tx.crmAssignmentHistory.create({
        data: {
          batchId: batch.batchCode,
          legacyUserId: item.customerId,
          newStaffId: bookerId,
          assignedBy: batch.assignerId,
          assignedAt: txNow,
          expiresAt: null,
          actionType: 'ACCEPT_ALLOCATION',
          reason: 'Booker đã chấp nhận đợt phân bổ data',
        },
      });
    }

    return {
      success: true,
      message: `Đã chấp nhận thành công ${batch.totalCount} khách hàng vào danh sách quản lý`,
      count: batch.totalCount,
    };
  });
}

/**
 * Booker declines an allocation batch ("Từ chối toàn bộ").
 * Requires mandatory decline reason category & optional note.
 * Customers remain unassigned / returned to pool.
 */
export async function declineAllocationBatch(
  fastify: FastifyInstance,
  batchId: number,
  bookerId: number,
  dto: DeclineAllocationBatchDto
): Promise<{ success: boolean; message: string }> {
  const rawCategory =
    typeof dto?.reasonCategory === 'string'
      ? dto.reasonCategory
      : dto?.reasonCategory != null
        ? String(dto.reasonCategory)
        : '';

  if (typeof dto?.reasonCategory !== 'string') {
    throw new Error('Vui lòng chọn lý do từ chối phân bổ hợp lệ');
  }

  if (!rawCategory || rawCategory.trim() === '') {
    throw new Error('Vui lòng chọn lý do từ chối phân bổ');
  }

  const reasonCategory = rawCategory.trim();
  const reasonNote = dto.reasonNote;

  return fastify.prisma.crm.$transaction(async (tx) => {
    const batch = await tx.crmAllocationBatch.findUnique({
      where: { id: batchId },
      include: { items: true },
    });

    if (!batch) {
      throw new Error('Đợt phân bổ không tồn tại');
    }

    if (batch.bookerId !== bookerId) {
      throw new Error('Bạn không có quyền từ chối đợt phân bổ của người khác');
    }

    if (batch.status !== 'PENDING_ACCEPT') {
      throw new Error(`Đợt phân bổ đã ở trạng thái ${batch.status}, không thể từ chối`);
    }

    const now = new Date();
    const fullReason = reasonNote ? `${reasonCategory}: ${reasonNote}` : reasonCategory;

    await tx.crmAllocationBatch.update({
      where: { id: batchId },
      data: {
        status: 'DECLINED',
        declinedAt: now,
        declineCategory: reasonCategory,
        declineNote: reasonNote || null,
        declineReason: fullReason,
      },
    });

    await tx.crmAllocationBatchItem.updateMany({
      where: { batchId },
      data: { status: 'DECLINED' },
    });

    // Audit history records
    for (const item of batch.items) {
      await AllocationLedgerService.append(tx, {
        customerId: item.customerId,
        eventType: 'DECLINED',
        previousStaffId: null,
        nextStaffId: null,
        actorStaffId: bookerId,
        reason: `Booker từ chối: ${fullReason}`,
        sourceType: 'ALLOCATION',
        actionContext: 'ALLOCATION_BATCH_DECLINED',
        batchId: batch.batchCode,
        campaignId: batch.campaignId,
        occurredAt: now,
      });
      await tx.crmAssignmentHistory.create({
        data: {
          batchId: batch.batchCode,
          legacyUserId: item.customerId,
          newStaffId: null,
          assignedBy: batch.assignerId,
          assignedAt: now,
          actionType: 'DECLINE_ALLOCATION',
          reason: `Booker từ chối: ${fullReason}`,
        },
      });
    }

    return {
      success: true,
      message: 'Đã từ chối đợt phân bổ và hoàn trả data về pool chung',
    };
  });
}

/**
 * Admin/Manager recalls an allocation batch ("Recall Batch").
 * Recalls PENDING_ACCEPT or ACCEPTED batches, revoking assignments back to pool.
 */
export async function recallAllocationBatch(
  fastify: FastifyInstance,
  batchId: number,
  adminId: number,
  dto: RecallAllocationBatchDto
): Promise<{ success: boolean; message: string; count: number }> {
  const { reason } = dto;
  if (!reason || reason.trim() === '') {
    throw new Error('Vui lòng nhập lý do thu hồi đợt phân bổ');
  }

  return fastify.prisma.crm.$transaction(async (tx) => {
    const batch = await tx.crmAllocationBatch.findUnique({
      where: { id: batchId },
      include: { items: true },
    });

    if (!batch) {
      throw new Error('Đợt phân bổ không tồn tại');
    }

    if (batch.status !== 'PENDING_ACCEPT' && batch.status !== 'ACCEPTED') {
      throw new Error(`Không thể thu hồi đợt phân bổ ở trạng thái ${batch.status}`);
    }

    const now = new Date();

    // If accepted, revoke assignments
    if (batch.status === 'ACCEPTED') {
      for (const item of batch.items) {
        const assignment = await tx.crmCustomerAssignment.findUnique({
          where: { legacyUserId: item.customerId },
        });

        if (assignment && assignment.staffId === batch.bookerId) {
          await AllocationLedgerService.setOwner(tx, {
            customerId: item.customerId,
            eventType: 'RECALLED',
            previousStaffId: batch.bookerId,
            nextStaffId: null,
            actorStaffId: adminId,
            reason: `Quản lý thu hồi đợt phân bổ: ${reason}`,
            sourceType: 'ALLOCATION',
            actionContext: 'ALLOCATION_BATCH_RECALLED',
            batchId: batch.batchCode,
            campaignId: batch.campaignId,
            deleteWhenPool: true,
            occurredAt: now,
          });

          await tx.crmAssignmentHistory.create({
            data: {
              batchId: batch.batchCode,
              legacyUserId: item.customerId,
              prevStaffId: batch.bookerId,
              newStaffId: null,
              assignedBy: adminId,
              assignedAt: now,
              actionType: 'RECALL_ALLOCATION',
              reason: `Quản lý thu hồi đợt phân bổ: ${reason}`,
            },
          });
        }
      }
    }

    await tx.crmAllocationBatch.update({
      where: { id: batchId },
      data: {
        status: 'RECALLED',
        recalledAt: now,
        declineReason: `Thu hồi bởi Quản lý: ${reason}`,
      },
    });

    await tx.crmAllocationBatchItem.updateMany({
      where: { batchId },
      data: { status: 'RECALLED' },
    });

    return {
      success: true,
      message: `Đã thu hồi thành công đợt phân bổ ${batch.batchCode} (${batch.totalCount} KH)`,
      count: batch.totalCount,
    };
  });
}
