import { FastifyInstance } from 'fastify';
import {
  AllocationAuditQueryParams,
  AllocationAuditStatsResponse,
  AllocationBatchStatus,
  AllocationHistoryQueryParams,
  BookerAllocationBatchSummary,
  CustomerAllocationBatch,
  CustomerAllocationItem,
} from '@mos-lab/shared';
import { Prisma } from '../../../generated/crm-client/index.js';
import { checkAndExpireBatches } from './allocation-batch-lifecycle.service.js';
import { mapAllocationBatchToDto } from './allocation-helpers.js';

/**
 * Retrieves pending allocation batches for a specific Booker.
 */
export async function getPendingBatchesForBooker(
  fastify: FastifyInstance,
  bookerId: number,
  checkAndExpireBatchesFn: (f: FastifyInstance) => Promise<void> = checkAndExpireBatches
): Promise<CustomerAllocationBatch[]> {
  await checkAndExpireBatchesFn(fastify);

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

  return batches.map((b) => mapAllocationBatchToDto(b));
}

/**
 * Retrieves all accepted or active allocation batches for a specific Booker,
 * enriched with real-time called count.
 */
export async function getMyBatchesForBooker(
  fastify: FastifyInstance,
  bookerId: number,
  userRole?: string,
  checkAndExpireBatchesFn: (f: FastifyInstance) => Promise<void> = checkAndExpireBatches
): Promise<BookerAllocationBatchSummary[]> {
  await checkAndExpireBatchesFn(fastify);

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
      campaign: batch.campaign ? { id: batch.campaign.id, name: batch.campaign.name, slug: batch.campaign.slug } : null,
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
export async function getBatchDetails(
  fastify: FastifyInstance,
  batchId: number,
  user?: { id: number; role: string },
  checkAndExpireBatchesFn: (f: FastifyInstance) => Promise<void> = checkAndExpireBatches
): Promise<{ batch: CustomerAllocationBatch; items: CustomerAllocationItem[] }> {
  await checkAndExpireBatchesFn(fastify);

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

  const batchDto = mapAllocationBatchToDto(batch);
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

/** Retrieves allocation history for Booker and Admin/Manager. */
export async function get30DayHistory(
  fastify: FastifyInstance,
  params: AllocationHistoryQueryParams,
  user: { id: number; role: string },
  checkAndExpireBatchesFn: (f: FastifyInstance) => Promise<void> = checkAndExpireBatches
): Promise<{ items: CustomerAllocationBatch[]; total: number }> {
  await checkAndExpireBatchesFn(fastify);

  const { page = 1, limit = 20, status, bookerId, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.CrmAllocationBatchWhereInput = {};

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
    items: batches.map((b) => mapAllocationBatchToDto(b)),
    total,
  };
}

/**
 * Generates Allocation Audit Dashboard stats for Admin/Manager.
 */
export async function getAuditStats(
  fastify: FastifyInstance,
  params: AllocationAuditQueryParams,
  checkAndExpireBatchesFn: (f: FastifyInstance) => Promise<void> = checkAndExpireBatches
): Promise<AllocationAuditStatsResponse> {
  await checkAndExpireBatchesFn(fastify);

  const { dateFrom, dateTo, bookerId } = params;

  const where: Prisma.CrmAllocationBatchWhereInput = {};
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
