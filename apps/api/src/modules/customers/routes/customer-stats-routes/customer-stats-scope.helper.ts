import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { resolveOrderCountsFilter } from '../helpers.js';
import { CustomerStatsLiveUsbInfo, CustomerStatsQuery, CustomerStatsUser } from './customer-stats.types.js';

export type CustomerStatsScopeResult =
  | { isEmpty: true }
  | {
      isEmpty: false;
      allowedUserIds: number[] | null;
      excludedUserIds: number[] | null;
      elsaSet: Set<number>;
      liveUsbMap: Map<number, CustomerStatsLiveUsbInfo>;
      anyUsbSet: Set<number>;
    };

function intersectAllowedIds(allowedUserIds: number[] | null, candidateIds: number[]): number[] {
  if (allowedUserIds === null) {
    return candidateIds;
  }
  const candidateSet = new Set(candidateIds);
  return allowedUserIds.filter((id) => candidateSet.has(id));
}

export interface ResolveCustomerStatsScopeParams {
  fastify: FastifyInstance;
  adminUser: CustomerStatsUser;
  query: CustomerStatsQuery;
  effectiveAssignedStaffId?: string;
  needOrderCounts: boolean;
}

/**
 * Resolves CRM assignment/campaign/order pre-filters and fetches standalone
 * ELSA / user_service_balance snapshots so MariaDB 10.3 avoids heavy multi-table joins.
 */
export async function resolveCustomerStatsScope({
  fastify,
  adminUser,
  query,
  effectiveAssignedStaffId,
  needOrderCounts,
}: ResolveCustomerStatsScopeParams): Promise<CustomerStatsScopeResult> {
  const {
    bucket,
    ids,
    assignedDaysMin,
    assignedDaysMax,
    retainedOnly,
    allocationBatchId,
    campaignId,
    campaignFilterMode,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    hsd30,
    lsd1,
  } = query;

  let allowedUserIds: number[] | null = null;
  let excludedUserIds: number[] | null = null;

  if (ids && ids.trim() !== '') {
    allowedUserIds = ids
      .split(',')
      .map(Number)
      .filter((n) => !isNaN(n));
  }

  if (
    (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') ||
    (assignedDaysMin !== undefined && assignedDaysMin !== '') ||
    (assignedDaysMax !== undefined && assignedDaysMax !== '')
  ) {
    if (effectiveAssignedStaffId === 'unassigned') {
      const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        select: { legacyUserId: true },
      });
      excludedUserIds = allAssignments.map((a) => a.legacyUserId);
      if (allowedUserIds !== null && excludedUserIds.length > 0) {
        const exSet = new Set(excludedUserIds);
        allowedUserIds = allowedUserIds.filter((id) => !exSet.has(id));
      }
    } else {
      const assignedWhere: SafeAny = {};
      if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') {
        let targetStaffId = adminUser.id;
        if (effectiveAssignedStaffId !== 'me') {
          targetStaffId = parseInt(effectiveAssignedStaffId, 10);
        }
        if (!isNaN(targetStaffId)) {
          assignedWhere.staffId = targetStaffId;
        }
      } else {
        assignedWhere.staffId = { not: null };
      }
      if (assignedDaysMin !== undefined && assignedDaysMin !== '') {
        const minDays = parseInt(assignedDaysMin, 10);
        if (!isNaN(minDays)) {
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() - minDays);
          maxDate.setHours(23, 59, 59, 999);
          if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
          assignedWhere.assignedAt.lte = maxDate;
        }
      }
      if (assignedDaysMax !== undefined && assignedDaysMax !== '') {
        const maxDays = parseInt(assignedDaysMax, 10);
        if (!isNaN(maxDays)) {
          const minDate = new Date();
          minDate.setDate(minDate.getDate() - maxDays);
          minDate.setHours(0, 0, 0, 0);
          if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
          assignedWhere.assignedAt.gte = minDate;
        }
      }

      const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: assignedWhere,
        select: { legacyUserId: true },
      });
      allowedUserIds = intersectAllowedIds(
        allowedUserIds,
        assignments.map((a) => a.legacyUserId)
      );
    }
  }

  if (retainedOnly === 'true') {
    const retainedAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
      where: { isRetained: true },
      select: { legacyUserId: true },
    });
    allowedUserIds = intersectAllowedIds(
      allowedUserIds,
      retainedAssignments.map((a) => a.legacyUserId)
    );
  }

  if (allocationBatchId && allocationBatchId.trim() !== '') {
    const bId = parseInt(allocationBatchId, 10);
    if (!isNaN(bId)) {
      const batchItems = await fastify.prisma.crm.crmAllocationBatchItem.findMany({
        where: {
          batchId: bId,
          status: { not: 'RECALLED' },
        },
        select: { customerId: true },
      });
      allowedUserIds = intersectAllowedIds(
        allowedUserIds,
        batchItems.map((i) => i.customerId)
      );
    }
  }

  if (campaignId && campaignId.trim() !== '') {
    const cId = parseInt(campaignId, 10);
    const mode = (campaignFilterMode || 'IN').toUpperCase();
    if (!isNaN(cId) && cId > 0 && mode !== 'ALL') {
      const campaignCustomers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
        where: { campaignId: cId },
        select: { legacyUserId: true },
      });
      const campUserIds = Array.from(
        new Set(campaignCustomers.map((c) => Number(c.legacyUserId)).filter((id) => Number.isInteger(id) && id > 0))
      );

      if (mode === 'IN') {
        allowedUserIds = intersectAllowedIds(allowedUserIds, campUserIds);
      } else if (mode === 'NOT_IN' && campUserIds.length > 0) {
        if (excludedUserIds === null) {
          excludedUserIds = campUserIds;
        } else {
          excludedUserIds = Array.from(new Set([...excludedUserIds, ...campUserIds]));
        }
        if (allowedUserIds !== null) {
          const cSet = new Set(campUserIds);
          allowedUserIds = allowedUserIds.filter((id) => !cSet.has(id));
        }
      }
    }
  }

  if (needOrderCounts) {
    const orderCountsRes = await resolveOrderCountsFilter(
      fastify,
      { totalSpentMin, totalSpentMax, totalVisitsMin, totalVisitsMax },
      allowedUserIds,
      excludedUserIds
    );
    if (orderCountsRes.isEmpty) {
      return { isEmpty: true };
    }
    allowedUserIds = orderCountsRes.allowedUserIds;
    excludedUserIds = orderCountsRes.excludedUserIds;
  }

  if (allowedUserIds !== null && excludedUserIds !== null && excludedUserIds.length > 0) {
    const exSet = new Set(excludedUserIds);
    allowedUserIds = allowedUserIds.filter((id) => !exSet.has(id));
    if (allowedUserIds.length === 0) {
      return { isEmpty: true };
    }
  }

  if (allowedUserIds !== null && allowedUserIds.length === 0) {
    return { isEmpty: true };
  }

  const bStrStats = bucket as string;
  const needAnyUsb = bStrStats !== 'COMBO_ELSA' && bStrStats !== 'COMBO_LIVE' && hsd30 !== 'true' && lsd1 !== 'true';
  const scopedUsbFilter =
    allowedUserIds !== null && allowedUserIds.length > 0 && allowedUserIds.length <= 5000
      ? `user_id IN (${allowedUserIds.join(',')})`
      : '';

  // Fetch active ELSA reservations, live combos, and historical combo holders standalone
  // so MariaDB 10.3 never joins multiple derived GROUP BY/DISTINCT tables across 40k+ users.
  const [elsaRows, liveUsbRows, anyUsbRows] = await Promise.all([
    fastify.prisma.crm.$queryRawUnsafe<{ legacy_user_id: number | bigint }[]>(
      `SELECT DISTINCT legacy_user_id
       FROM crm_customer_elsa_reservations
       WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date >= NOW())`
    ),
    fastify.prisma.legacy.$queryRawUnsafe<
      {
        user_id: number | bigint;
        normalCount: SafeAny;
        retainCount: SafeAny;
        expiryDaysDiff: number | bigint | null;
      }[]
    >(
      `SELECT
         user_id,
         SUM(normal_count) as normalCount,
         SUM(retain_count) as retainCount,
         CASE
           WHEN MAX(date_expired) IS NULL THEN NULL
           ELSE DATEDIFF(MAX(date_expired), NOW())
         END as expiryDaysDiff
       FROM user_service_balance
       WHERE (normal_count > 0 OR retain_count > 0)
         AND (service_group IS NULL OR service_group != 'LashesUnder')
         AND (date_expired IS NULL OR date_expired > NOW())
         ${scopedUsbFilter ? `AND ${scopedUsbFilter}` : ''}
       GROUP BY user_id`
    ),
    needAnyUsb
      ? fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number | bigint }[]>(
          `SELECT DISTINCT user_id
           FROM user_service_balance
           ${scopedUsbFilter ? `WHERE ${scopedUsbFilter}` : ''}`
        )
      : Promise.resolve([]),
  ]);

  const elsaSet = new Set<number>(elsaRows.map((r) => Number(r.legacy_user_id)));
  const liveUsbMap = new Map<number, CustomerStatsLiveUsbInfo>();
  for (const r of liveUsbRows) {
    const uid = Number(r.user_id);
    const normalTotal = Number(r.normalCount || 0) + Number(r.retainCount || 0);
    const expiryDaysDiff =
      r.expiryDaysDiff !== null && r.expiryDaysDiff !== undefined ? Number(r.expiryDaysDiff) : null;
    liveUsbMap.set(uid, { normalTotal, expiryDaysDiff });
  }
  const anyUsbSet = new Set<number>(anyUsbRows.map((r) => Number(r.user_id)));

  // Narrow allowedUserIds upfront when bucket / hsd30 / lsd1 restricts to a tiny positive set
  let preNarrowIds: number[] | null = null;
  if (hsd30 === 'true' || lsd1 === 'true') {
    if (bStrStats === 'SINGLE' || bStrStats === 'COMBO_DEAD' || bStrStats === 'NOT_COMBO_LIVE') {
      return { isEmpty: true };
    }
    preNarrowIds = [];
    for (const [uid, info] of liveUsbMap.entries()) {
      if (bStrStats === 'COMBO_ELSA' && !elsaSet.has(uid)) continue;
      if (bStrStats === 'COMBO_LIVE' && elsaSet.has(uid)) continue;
      if (hsd30 === 'true' && (info.expiryDaysDiff === null || info.expiryDaysDiff < 0 || info.expiryDaysDiff > 30)) {
        continue;
      }
      if (lsd1 === 'true' && info.normalTotal !== 1) continue;
      preNarrowIds.push(uid);
    }
  } else if (bStrStats === 'COMBO_ELSA') {
    preNarrowIds = Array.from(elsaSet);
  } else if (bStrStats === 'COMBO_LIVE') {
    preNarrowIds = Array.from(liveUsbMap.keys()).filter((uid) => !elsaSet.has(uid));
  }

  if (preNarrowIds !== null) {
    if (preNarrowIds.length === 0) {
      return { isEmpty: true };
    }
    allowedUserIds = intersectAllowedIds(allowedUserIds, preNarrowIds);
    if (allowedUserIds.length === 0) {
      return { isEmpty: true };
    }
  }

  return {
    isEmpty: false,
    allowedUserIds,
    excludedUserIds,
    elsaSet,
    liveUsbMap,
    anyUsbSet,
  };
}
