import { FastifyInstance } from 'fastify';
import { Prisma } from '../../generated/crm-client/index.js';
import {
  CreateAllocationBatchDto,
  DeclineAllocationBatchDto,
  RecallAllocationBatchDto,
  AllocationHistoryQueryParams,
  AllocationAuditQueryParams,
  AllocationAuditStatsResponse,
  CustomerAllocationBatch,
  CustomerAllocationItem,
  AllocationBatchStatus,
  BookerAllocationBatchSummary,
} from '@mos-lab/shared';

export const ACCEPT_ACTION_TYPES = ['ACCEPT', 'ACCEPT_ALLOCATION'];

export function isAcceptActionType(actionType?: string | null): boolean {
  if (!actionType) return false;
  return ACCEPT_ACTION_TYPES.includes(actionType);
}

export function getHistoryAcceptWhereCondition() {
  return { actionType: { in: ACCEPT_ACTION_TYPES } };
}

export class AllocationService {
  /**
   * Automatic background check to expire 24h pending verification batches
   * and 30-day data retention expired batches.
   */
  static async checkAndExpireBatches(fastify: FastifyInstance): Promise<void> {
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

    // 2. Expire 30-day data retention for accepted batches that passed retentionExpiresAt
    const overdueRetentionBatches = await fastify.prisma.crm.crmAllocationBatch.findMany({
      where: {
        status: 'ACCEPTED',
        retentionExpiresAt: { lte: now, not: null },
      },
      include: { items: true },
    });

    for (const batch of overdueRetentionBatches) {
      await fastify.prisma.crm.$transaction(async (tx) => {
        const updateRes = await tx.crmAllocationBatch.updateMany({
          where: {
            id: batch.id,
            status: 'ACCEPTED',
          },
          data: { status: 'EXPIRED' },
        });

        if (updateRes.count === 0) {
          return;
        }

        await tx.crmAllocationBatchItem.updateMany({
          where: { batchId: batch.id },
          data: { status: 'EXPIRED' },
        });

        for (const item of batch.items) {
          // Remove from active assignments if not manually retained by Booker
          const existingAssignment = await tx.crmCustomerAssignment.findUnique({
            where: { legacyUserId: item.customerId },
          });

          if (existingAssignment && !existingAssignment.isRetained && existingAssignment.staffId === batch.bookerId) {
            await tx.crmCustomerAssignment.delete({
              where: { legacyUserId: item.customerId },
            });

            await tx.crmAssignmentHistory.create({
              data: {
                batchId: batch.batchCode,
                legacyUserId: item.customerId,
                prevStaffId: batch.bookerId,
                newStaffId: null,
                assignedBy: batch.assignerId,
                actionType: 'EXPIRE',
                reason: 'Hết hạn lưu giữ data 30 ngày (Auto Expired 30d)',
              },
            });
          }
        }
      });
    }
  }

  /**
   * Admin/Manager creates a new customer allocation batch targeting a Booker.
   * Batch is created in PENDING_ACCEPT status with 24h expiration countdown timer.
   */
  static async createBatch(
    fastify: FastifyInstance,
    assignerId: number,
    dto: CreateAllocationBatchDto
  ): Promise<CustomerAllocationBatch> {
    // Run maintenance check
    await this.checkAndExpireBatches(fastify);

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

    return this.mapBatchToDto(createdBatch);
  }

  /**
   * Retrieves pending allocation batches for a specific Booker.
   */
  static async getPendingBatchesForBooker(
    fastify: FastifyInstance,
    bookerId: number
  ): Promise<CustomerAllocationBatch[]> {
    await this.checkAndExpireBatches(fastify);

    const now = new Date();
    const batches = await fastify.prisma.crm.crmAllocationBatch.findMany({
      where: {
        bookerId,
        status: 'PENDING_ACCEPT',
        expiresAt: { gt: now },
      },
      include: {
        assigner: { select: { id: true, displayName: true, username: true } },
        booker: { select: { id: true, displayName: true, username: true } },
        campaign: { select: { id: true, name: true, slug: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return batches.map((b) => this.mapBatchToDto(b));
  }

  /**
   * Retrieves all accepted or active allocation batches for a specific Booker,
   * enriched with real-time called count.
   */
  static async getMyBatchesForBooker(
    fastify: FastifyInstance,
    bookerId: number,
    userRole?: string
  ): Promise<BookerAllocationBatchSummary[]> {
    await this.checkAndExpireBatches(fastify);

    const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';
    const batches = await fastify.prisma.crm.crmAllocationBatch.findMany({
      where: isManagerOrAdmin
        ? { status: { in: ['ACCEPTED', 'PENDING_ACCEPT'] } }
        : { bookerId, status: { in: ['ACCEPTED', 'PENDING_ACCEPT'] } },
      include: {
        assigner: { select: { id: true, displayName: true, username: true } },
        booker: { select: { id: true, displayName: true, username: true } },
        campaign: { select: { id: true, name: true, slug: true } },
        items: { select: { customerId: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (batches.length === 0) return [];

    const batchSummaries: BookerAllocationBatchSummary[] = [];

    for (const batch of batches) {
      // Strictly filter to active (non-recalled) batch items
      const activeItems = batch.items.filter((i) => i.status !== 'RECALLED');
      if (activeItems.length === 0) {
        // Skip batches where all items were revoked, recalled, or undone
        continue;
      }

      const rawCustomerIds = activeItems.map((i) => i.customerId);
      const existingUsers = await fastify.prisma.legacy.user.findMany({
        where: { id: { in: rawCustomerIds } },
        select: { id: true },
      });
      const existingUserSet = new Set(existingUsers.map((u) => u.id));
      const validActiveItems = activeItems.filter((i) => existingUserSet.has(i.customerId));

      if (validActiveItems.length === 0) {
        continue;
      }

      const customerIds = validActiveItems.map((i) => i.customerId);
      let calledCount = 0;

      if (customerIds.length > 0) {
        const calledRaw = await fastify.prisma.crm.crmCallLog.findMany({
          where: {
            legacyUserId: { in: customerIds },
            createdAt: { gte: batch.acceptedAt || batch.createdAt },
          },
          select: { legacyUserId: true },
          distinct: ['legacyUserId'],
        });
        calledCount = calledRaw.length;
      }

      batchSummaries.push({
        id: batch.id,
        batchCode: batch.batchCode,
        campaignId: batch.campaignId || null,
        campaign: batch.campaign
          ? { id: batch.campaign.id, name: batch.campaign.name, slug: batch.campaign.slug }
          : null,
        assignerId: batch.assignerId,
        assignerName: batch.assigner?.displayName || batch.assigner?.username || `Admin #${batch.assignerId}`,
        bookerId: batch.bookerId,
        bookerName: batch.booker?.displayName || batch.booker?.username || `Staff #${batch.bookerId}`,
        totalCount: validActiveItems.length,
        calledCount,
        status: batch.status as AllocationBatchStatus,
        createdAt: batch.createdAt.toISOString(),
        acceptedAt: batch.acceptedAt ? batch.acceptedAt.toISOString() : null,
        expiresAt: batch.expiresAt.toISOString(),
        retentionExpiresAt: batch.retentionExpiresAt ? batch.retentionExpiresAt.toISOString() : null,
      });
    }

    return batchSummaries;
  }

  /**
   * Fetch single allocation batch details.
   */
  static async getBatchDetails(
    fastify: FastifyInstance,
    batchId: number,
    user?: { id: number; role: string }
  ): Promise<{ batch: CustomerAllocationBatch; items: CustomerAllocationItem[] }> {
    await this.checkAndExpireBatches(fastify);

    const batch = await fastify.prisma.crm.crmAllocationBatch.findUnique({
      where: { id: batchId },
      include: {
        assigner: { select: { id: true, displayName: true, username: true } },
        booker: { select: { id: true, displayName: true, username: true } },
        items: true,
      },
    });

    if (!batch) {
      throw new Error(`Đợt phân bổ ID ${batchId} không tồn tại`);
    }

    if (user) {
      const allowedRoles = ['admin', 'manager', 'ls', 'oc'];
      const isOwnerOrAssigner = user.id === batch.assignerId || user.id === batch.bookerId;
      const isPrivilegedRole = allowedRoles.includes(user.role?.toLowerCase());

      if (!isOwnerOrAssigner && !isPrivilegedRole) {
        throw new Error('Bạn không có quyền xem thông tin đợt phân bổ này');
      }
    }

    const batchDto = this.mapBatchToDto(batch);
    const itemsDto: CustomerAllocationItem[] = (batch.items || []).map((item) => ({
      id: item.id,
      batchId: item.batchId,
      customerId: item.customerId,
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      status: item.status as AllocationBatchStatus,
      createdAt: item.createdAt.toISOString(),
      bucket: item.bucket,
      daysSinceLastVisit: item.daysSinceLastVisit,
      totalSpent: item.totalSpent,
    }));

    return { batch: batchDto, items: itemsDto };
  }

  /**
   * Booker accepts an allocation batch ("Chấp nhận toàn bộ").
   * Updates batch & items to ACCEPTED, sets 30-day retention countdown,
   * and atomically assigns exact +N customers to Booker via Prisma $transaction.
   */
  static async acceptBatch(
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
      // Dedicated update outside failing transaction so EXPIRED status persists in DB
      await fastify.prisma.crm.crmAllocationBatch.update({
        where: { id: batchId },
        data: { status: 'EXPIRED' },
      });
      await fastify.prisma.crm.crmAllocationBatchItem.updateMany({
        where: { batchId },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Đợt phân bổ đã vượt quá 24h xác nhận');
    }

    return fastify.prisma.crm.$transaction(async (tx) => {
      const batch = await tx.crmAllocationBatch.findUnique({
        where: { id: batchId },
        include: { items: true, campaign: true },
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

      let retentionExpiresAt = new Date(txNow.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-Day Retention Countdown
      if (batch.campaignId && batch.campaign && batch.campaign.endDate) {
        const campaignEnd = new Date(batch.campaign.endDate);
        if (campaignEnd < retentionExpiresAt) {
          retentionExpiresAt = campaignEnd;
        }
      }

      // Update Batch Status
      await tx.crmAllocationBatch.update({
        where: { id: batchId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: txNow,
          retentionExpiresAt,
        },
      });

      await tx.crmAllocationBatchItem.updateMany({
        where: { batchId },
        data: { status: 'ACCEPTED' },
      });

      // R2: Exact +N Customer assignment & Audit logging
      for (const item of batch.items) {
        await tx.crmCustomerAssignment.upsert({
          where: { legacyUserId: item.customerId },
          update: {
            staffId: bookerId,
            assignedBy: batch.assignerId,
            assignedAt: txNow,
            expiresAt: retentionExpiresAt,
            isRetained: false,
          },
          create: {
            legacyUserId: item.customerId,
            staffId: bookerId,
            assignedBy: batch.assignerId,
            assignedAt: txNow,
            expiresAt: retentionExpiresAt,
            isRetained: false,
          },
        });

        await tx.crmAssignmentHistory.create({
          data: {
            batchId: batch.batchCode,
            legacyUserId: item.customerId,
            newStaffId: bookerId,
            assignedBy: batch.assignerId,
            assignedAt: txNow,
            expiresAt: retentionExpiresAt,
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
  static async declineBatch(
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
  static async recallBatch(
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
            await tx.crmCustomerAssignment.delete({
              where: { legacyUserId: item.customerId },
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

  /**
   * Retrieves 30-Day Allocation History with countdown badges for Booker & Admin/Manager.
   */
  static async get30DayHistory(
    fastify: FastifyInstance,
    params: AllocationHistoryQueryParams,
    user: { id: number; role: string }
  ): Promise<{ items: CustomerAllocationBatch[]; total: number }> {
    await this.checkAndExpireBatches(fastify);

    const { page = 1, limit = 20, status, bookerId, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by role: Telesales/Booker can only view their own allocation history
    if (user.role === 'telesales') {
      where.bookerId = user.id;
    } else if (bookerId) {
      where.bookerId = bookerId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim() !== '') {
      const trimmed = search.trim();
      where.OR = [
        { batchCode: { contains: trimmed } },
        { booker: { displayName: { contains: trimmed } } },
        { booker: { username: { contains: trimmed } } },
      ];
    }

    const [total, batches] = await Promise.all([
      fastify.prisma.crm.crmAllocationBatch.count({ where }),
      fastify.prisma.crm.crmAllocationBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assigner: { select: { id: true, displayName: true, username: true } },
          booker: { select: { id: true, displayName: true, username: true } },
          campaign: { select: { id: true, name: true, slug: true } },
          items: true,
        },
      }),
    ]);

    return {
      items: batches.map((b) => this.mapBatchToDto(b)),
      total,
    };
  }

  /**
   * Generates Allocation Audit Dashboard stats for Admin/Manager.
   */
  static async getAuditStats(
    fastify: FastifyInstance,
    params: AllocationAuditQueryParams
  ): Promise<AllocationAuditStatsResponse> {
    await this.checkAndExpireBatches(fastify);

    const { dateFrom, dateTo, bookerId } = params;

    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (bookerId) {
      where.bookerId = bookerId;
    }

    const batches = await fastify.prisma.crm.crmAllocationBatch.findMany({
      where,
      include: {
        booker: { select: { id: true, displayName: true, username: true } },
      },
    });

    const totalBatches = batches.length;
    let totalCustomers = 0;
    let pendingCount = 0;
    let acceptedCount = 0;
    let declinedCount = 0;
    let expiredCount = 0;
    let recalledCount = 0;

    const bookerStatsMap = new Map<
      number,
      {
        bookerId: number;
        bookerName: string;
        username: string;
        totalBatches: number;
        totalCustomers: number;
        acceptedCount: number;
        declinedCount: number;
        expiredCount: number;
        pendingCount: number;
        responseTimesMinutes: number[];
      }
    >();

    const declineReasonMap = new Map<string, number>();

    for (const b of batches) {
      totalCustomers += b.totalCount;

      if (b.status === 'PENDING_ACCEPT') pendingCount++;
      else if (b.status === 'ACCEPTED') acceptedCount++;
      else if (b.status === 'DECLINED') declinedCount++;
      else if (b.status === 'EXPIRED') expiredCount++;
      else if (b.status === 'RECALLED') recalledCount++;

      // Booker breakdown aggregation
      let bStat = bookerStatsMap.get(b.bookerId);
      if (!bStat) {
        bStat = {
          bookerId: b.bookerId,
          bookerName: b.booker?.displayName || `Booker #${b.bookerId}`,
          username: b.booker?.username || '',
          totalBatches: 0,
          totalCustomers: 0,
          acceptedCount: 0,
          declinedCount: 0,
          expiredCount: 0,
          pendingCount: 0,
          responseTimesMinutes: [],
        };
        bookerStatsMap.set(b.bookerId, bStat);
      }

      bStat.totalBatches++;
      bStat.totalCustomers += b.totalCount;
      if (b.status === 'PENDING_ACCEPT') bStat.pendingCount++;
      else if (b.status === 'ACCEPTED') bStat.acceptedCount++;
      else if (b.status === 'DECLINED') bStat.declinedCount++;
      else if (b.status === 'EXPIRED') bStat.expiredCount++;

      // Calculate response time
      const resTime = b.acceptedAt || b.declinedAt;
      if (resTime) {
        const diffMs = new Date(resTime).getTime() - new Date(b.createdAt).getTime();
        bStat.responseTimesMinutes.push(Math.max(0, Math.round(diffMs / 60000)));
      }

      // Decline reason breakdown
      if (b.status === 'DECLINED' && b.declineCategory) {
        const cat = b.declineCategory;
        declineReasonMap.set(cat, (declineReasonMap.get(cat) || 0) + 1);
      }
    }

    const acceptedRate = totalBatches > 0 ? Number(((acceptedCount / totalBatches) * 100).toFixed(1)) : 0;
    const declinedRate = totalBatches > 0 ? Number(((declinedCount / totalBatches) * 100).toFixed(1)) : 0;
    const expiredRate = totalBatches > 0 ? Number(((expiredCount / totalBatches) * 100).toFixed(1)) : 0;

    const bookerBreakdown = Array.from(bookerStatsMap.values()).map((st) => {
      const acceptanceRate = st.totalBatches > 0 ? Number(((st.acceptedCount / st.totalBatches) * 100).toFixed(1)) : 0;
      const avgResponseMinutes =
        st.responseTimesMinutes.length > 0
          ? Math.round(st.responseTimesMinutes.reduce((a, b) => a + b, 0) / st.responseTimesMinutes.length)
          : 0;

      return {
        bookerId: st.bookerId,
        bookerName: st.bookerName,
        username: st.username,
        totalBatches: st.totalBatches,
        totalCustomers: st.totalCustomers,
        acceptedCount: st.acceptedCount,
        declinedCount: st.declinedCount,
        expiredCount: st.expiredCount,
        pendingCount: st.pendingCount,
        acceptanceRate,
        avgResponseMinutes,
      };
    });

    const totalDeclines = Array.from(declineReasonMap.values()).reduce((a, b) => a + b, 0);
    const declineReasonBreakdown = Array.from(declineReasonMap.entries()).map(([category, count]) => ({
      category,
      count,
      percentage: totalDeclines > 0 ? Number(((count / totalDeclines) * 100).toFixed(1)) : 0,
    }));

    return {
      summary: {
        totalBatches,
        totalCustomers,
        pendingCount,
        acceptedCount,
        acceptedRate,
        declinedCount,
        declinedRate,
        expiredCount,
        expiredRate,
        recalledCount,
      },
      bookerBreakdown,
      declineReasonBreakdown,
    };
  }

  private static mapBatchToDto(batch: any): CustomerAllocationBatch {
    return {
      id: batch.id,
      batchCode: batch.batchCode,
      campaignId: batch.campaignId || null,
      campaign: batch.campaign ? { id: batch.campaign.id, name: batch.campaign.name, slug: batch.campaign.slug } : null,
      assignerId: batch.assignerId,
      assignerName: batch.assigner?.displayName || `Manager #${batch.assignerId}`,
      bookerId: batch.bookerId,
      bookerName: batch.booker?.displayName || `Booker #${batch.bookerId}`,
      totalCount: batch.totalCount,
      status: batch.status as AllocationBatchStatus,
      declineReason: batch.declineReason || null,
      declineCategory: batch.declineCategory || null,
      declineNote: batch.declineNote || null,
      expiresAt: batch.expiresAt ? new Date(batch.expiresAt).toISOString() : '',
      acceptedAt: batch.acceptedAt ? new Date(batch.acceptedAt).toISOString() : null,
      declinedAt: batch.declinedAt ? new Date(batch.declinedAt).toISOString() : null,
      recalledAt: batch.recalledAt ? new Date(batch.recalledAt).toISOString() : null,
      retentionExpiresAt: batch.retentionExpiresAt ? new Date(batch.retentionExpiresAt).toISOString() : null,
      sourceFilterSummary: batch.sourceFilterSummary || null,
      sourceFilterJson: batch.sourceFilterJson || null,
      createdAt: new Date(batch.createdAt).toISOString(),
      updatedAt: new Date(batch.updatedAt).toISOString(),
      items: (batch.items || []).map((i: any) => ({
        id: i.id,
        batchId: i.batchId,
        customerId: i.customerId,
        customerName: i.customerName,
        customerPhone: i.customerPhone,
        status: i.status as AllocationBatchStatus,
        createdAt: new Date(i.createdAt).toISOString(),
        bucket: i.bucket,
        daysSinceLastVisit: i.daysSinceLastVisit,
        totalSpent: i.totalSpent,
      })),
    };
  }
}
