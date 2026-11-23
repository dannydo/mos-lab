import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { resolveOrderCountsFilter, subtractExcludedUserIds } from '../helpers.js';
import { CustomerListQuery, EmptyCustomerListResponse, emptyCustomerListResponse } from './customer-list.types.js';

interface ResolveCustomerListScopeParams {
  fastify: FastifyInstance;
  adminUser: { id: number; role: string };
  query: CustomerListQuery;
  effectiveAssignedStaffId?: string;
  needSpentFilter: boolean;
  needVisits: boolean;
  pageNum: number;
  limitNum: number;
  resolveNewLocaUserIds: () => Promise<number[]>;
}

export type CustomerListScopeResolution =
  | { emptyResponse: EmptyCustomerListResponse }
  | {
      emptyResponse: null;
      allowedUserIds: number[] | null;
      excludedUserIds: number[] | null;
      notComboLiveExcludedInMemory: boolean;
    };

export async function resolveCustomerListScope({
  fastify,
  adminUser,
  query,
  effectiveAssignedStaffId,
  needSpentFilter,
  needVisits,
  pageNum,
  limitNum,
  resolveNewLocaUserIds,
}: ResolveCustomerListScopeParams): Promise<CustomerListScopeResolution> {
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
    hasFutureBooking,
  } = query;

  // Pre-compute allowedUserIds before constructing innerJoins to push down predicates
  let allowedUserIds: number[] | null = null;
  let excludedUserIds: number[] | null = null;
  let notComboLiveExcludedInMemory = false;

  const empty = () => ({ emptyResponse: emptyCustomerListResponse(pageNum, limitNum) });

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
      const filterUserIds = assignments.map((a) => a.legacyUserId);
      if (allowedUserIds !== null) {
        const filterSet = new Set(filterUserIds);
        allowedUserIds = allowedUserIds.filter((id) => filterSet.has(id));
      } else {
        allowedUserIds = filterUserIds;
      }
    }
  }

  if (retainedOnly === 'true') {
    const retainedAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
      where: { isRetained: true },
      select: { legacyUserId: true },
    });
    const retainedUserIds = retainedAssignments.map((a) => a.legacyUserId);
    if (allowedUserIds !== null) {
      const retSet = new Set(retainedUserIds);
      allowedUserIds = allowedUserIds.filter((id) => retSet.has(id));
    } else {
      allowedUserIds = retainedUserIds;
    }
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
      const batchUserIds = batchItems.map((i) => i.customerId);
      if (allowedUserIds !== null) {
        const bSet = new Set(batchUserIds);
        allowedUserIds = allowedUserIds.filter((id) => bSet.has(id));
      } else {
        allowedUserIds = batchUserIds;
      }
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
        if (allowedUserIds !== null) {
          const cSet = new Set(campUserIds);
          allowedUserIds = allowedUserIds.filter((id) => cSet.has(id));
        } else {
          allowedUserIds = campUserIds;
        }
      } else if (mode === 'NOT_IN') {
        if (campUserIds.length > 0) {
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
  }

  if (allowedUserIds !== null && allowedUserIds.length === 0) {
    return empty();
  }

  // Narrow by spend/visits before bucket resolution so bucket queries scan only matching IDs.
  if (needSpentFilter || needVisits) {
    const orderCountsRes = await resolveOrderCountsFilter(
      fastify,
      { totalSpentMin, totalSpentMax, totalVisitsMin, totalVisitsMax },
      allowedUserIds,
      excludedUserIds
    );
    if (orderCountsRes.isEmpty) {
      return empty();
    }
    allowedUserIds = subtractExcludedUserIds(orderCountsRes.allowedUserIds, orderCountsRes.excludedUserIds);
    excludedUserIds = orderCountsRes.excludedUserIds;
    if (allowedUserIds !== null && allowedUserIds.length === 0) {
      return empty();
    }
  }

  if (bucket === 'NEW_LOCA') {
    const newLocaUserIds = await resolveNewLocaUserIds();
    if (newLocaUserIds.length === 0) {
      return empty();
    }
    if (allowedUserIds !== null) {
      allowedUserIds = allowedUserIds.filter((id) => newLocaUserIds.includes(id));
      if (allowedUserIds.length === 0) {
        return empty();
      }
    } else {
      allowedUserIds = newLocaUserIds;
    }
  } else if (bucket === 'COMBO_LIVE') {
    const usbScopeFilter =
      allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : '';
    const comboLiveUserIds = (
      await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
        `SELECT DISTINCT user_id
         FROM user_service_balance
         WHERE (normal_count + retain_count) > 0
           AND (service_group IS NULL OR service_group != 'LashesUnder')
           AND (date_expired IS NULL OR date_expired > NOW())
           AND NOT EXISTS (
             SELECT 1 FROM mos_lab.crm_customer_elsa_reservations elsa_res
             WHERE elsa_res.legacy_user_id = user_service_balance.user_id
               AND elsa_res.status = 'ACTIVE'
               AND (elsa_res.end_date IS NULL OR elsa_res.end_date >= NOW())
           )
           ${usbScopeFilter}`
      )
    ).map((r) => Number(r.user_id));

    if (comboLiveUserIds.length === 0) {
      return empty();
    }
    if (allowedUserIds !== null) {
      const liveSet = new Set(comboLiveUserIds);
      allowedUserIds = allowedUserIds.filter((id) => liveSet.has(id));
      if (allowedUserIds.length === 0) {
        return empty();
      }
    } else {
      allowedUserIds = comboLiveUserIds;
    }
  } else if (bucket === 'COMBO_ELSA') {
    const elsaScopeFilter =
      allowedUserIds !== null && allowedUserIds.length > 0 ? `AND legacy_user_id IN (${allowedUserIds.join(',')})` : '';
    const elsaUserIds = (
      await fastify.prisma.crm.$queryRawUnsafe<{ legacy_user_id: number }[]>(
        `SELECT DISTINCT legacy_user_id
         FROM crm_customer_elsa_reservations
         WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date >= NOW())
           ${elsaScopeFilter}`
      )
    ).map((r) => Number(r.legacy_user_id));

    if (elsaUserIds.length === 0) {
      return empty();
    }
    if (allowedUserIds !== null) {
      const elsaSet = new Set(elsaUserIds);
      allowedUserIds = allowedUserIds.filter((id) => elsaSet.has(id));
      if (allowedUserIds.length === 0) {
        return empty();
      }
    } else {
      allowedUserIds = elsaUserIds;
    }
  } else if (bucket === 'NOT_COMBO_LIVE' && allowedUserIds !== null) {
    const scopedList = allowedUserIds.join(',');
    const [comboLiveRows, elsaRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
        `SELECT DISTINCT user_id
         FROM user_service_balance
         WHERE (normal_count > 0 OR retain_count > 0)
           AND (service_group IS NULL OR service_group != 'LashesUnder')
           AND (date_expired IS NULL OR date_expired > NOW())
           AND user_id IN (${scopedList})`
      ),
      fastify.prisma.crm.$queryRawUnsafe<{ legacy_user_id: number }[]>(
        `SELECT DISTINCT legacy_user_id
         FROM crm_customer_elsa_reservations
         WHERE status = 'ACTIVE'
           AND (end_date IS NULL OR end_date >= NOW())
           AND legacy_user_id IN (${scopedList})`
      ),
    ]);
    const excludedUserIdsSet = new Set([
      ...comboLiveRows.map((r) => Number(r.user_id)),
      ...elsaRows.map((r) => Number(r.legacy_user_id)),
    ]);

    allowedUserIds = allowedUserIds.filter((id) => !excludedUserIdsSet.has(id));
    notComboLiveExcludedInMemory = true;
    if (allowedUserIds.length === 0) {
      return empty();
    }
  }

  if (hsd30 === 'true') {
    const hsd30UserIds = (
      await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
        `SELECT DISTINCT user_id
         FROM user_service_balance
         WHERE (normal_count + retain_count) > 0
           AND (service_group IS NULL OR service_group != 'LashesUnder')
           AND date_expired IS NOT NULL
           AND date_expired > NOW()
           AND date_expired <= DATE_ADD(NOW(), INTERVAL 30 DAY)`
      )
    ).map((r) => Number(r.user_id));

    if (hsd30UserIds.length === 0) {
      return empty();
    }
    if (allowedUserIds !== null) {
      allowedUserIds = allowedUserIds.filter((id) => hsd30UserIds.includes(id));
    } else {
      allowedUserIds = hsd30UserIds;
    }
    if (allowedUserIds.length === 0) {
      return empty();
    }
  }

  if (lsd1 === 'true') {
    const lsd1UserIds = (
      await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
        `SELECT user_id
         FROM user_service_balance
         WHERE (normal_count + retain_count) > 0
           AND (service_group IS NULL OR service_group != 'LashesUnder')
           AND (date_expired IS NULL OR date_expired > NOW())
         GROUP BY user_id
         HAVING SUM(normal_count + retain_count) = 1`
      )
    ).map((r) => Number(r.user_id));

    if (lsd1UserIds.length === 0) {
      return empty();
    }
    if (allowedUserIds !== null) {
      allowedUserIds = allowedUserIds.filter((id) => lsd1UserIds.includes(id));
    } else {
      allowedUserIds = lsd1UserIds;
    }
    if (allowedUserIds.length === 0) {
      return empty();
    }
  }

  if (hasFutureBooking === 'true') {
    const bookedScopeFilter =
      allowedUserIds !== null && allowedUserIds.length > 0 ? ` AND user_id IN (${allowedUserIds.join(',')})` : '';
    const bookedUserIds = (
      await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
        `SELECT DISTINCT user_id
         FROM \`order\`
         WHERE booking_date_start > NOW() AND order_state IN ('New', 'Confirmed')${bookedScopeFilter}`
      )
    ).map((r) => Number(r.user_id));

    if (bookedUserIds.length === 0) {
      return empty();
    }
    if (allowedUserIds !== null) {
      const bookedSet = new Set(bookedUserIds);
      allowedUserIds = allowedUserIds.filter((id) => bookedSet.has(id));
    } else {
      allowedUserIds = bookedUserIds;
    }
    if (allowedUserIds.length === 0) {
      return empty();
    }
  } else if (hasFutureBooking === 'false' && allowedUserIds !== null && allowedUserIds.length > 0) {
    const bookedUserIds = (
      await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
        `SELECT DISTINCT user_id
         FROM \`order\`
         WHERE booking_date_start > NOW()
           AND order_state IN ('New', 'Confirmed')
           AND user_id IN (${allowedUserIds.join(',')})`
      )
    ).map((r) => Number(r.user_id));

    if (bookedUserIds.length > 0) {
      const bookedSet = new Set(bookedUserIds);
      allowedUserIds = allowedUserIds.filter((id) => !bookedSet.has(id));
      if (allowedUserIds.length === 0) {
        return empty();
      }
    }
  }

  return {
    emptyResponse: null,
    allowedUserIds,
    excludedUserIds,
    notComboLiveExcludedInMemory,
  };
}
