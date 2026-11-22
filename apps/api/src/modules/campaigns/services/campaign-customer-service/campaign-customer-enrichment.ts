/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import { type CampaignBookingStatusFilter, removeVietnameseTones } from '@mos-lab/shared';
import { CustomerVisitProjectionService } from '../../../projections/customer-visit-projection.service.js';

export interface CampaignCustomerEnrichmentData {
  profileMap: Map<number, any>;
  phoneMap: Map<number, string | null>;
  assignmentMap: Map<number, any>;
  pendingBatchMap: Map<number, any>;
  orderStatsMap: Map<number, number>;
  lastVisitMap: Map<number, { lastVisitDate: string | null; daysSinceLastVisit: number | null }>;
  latestBookingMap: Map<number, { lastBookingDate: string | null; lastBookingState: string | null }>;
  campaignDoneUserIds: Set<number>;
  callLogMap: Map<number, any>;
}

export interface CampaignCustomerEnrichmentContext {
  campaign: {
    startDate: Date | null;
    operationMode: string;
    touchpoints: any[];
  };
  enrichment: CampaignCustomerEnrichmentData;
  now: Date;
  currentStaffId?: number;
  restrictToAssignedStaffId?: number;
}

export interface CampaignCustomerFilterOptions {
  campaign: {
    operationMode: string;
    touchpoints: any[];
  };
  campaignDoneUserIds: Set<number>;
  now: Date;
  bookerId?: number;
  assignedStaffId?: number;
  restrictToAssignedStaffId?: number;
  search?: string;
  touchpointKey?: string;
  bookingStatus: CampaignBookingStatusFilter;
}

export async function loadCampaignCustomerEnrichmentData(
  fastify: FastifyInstance,
  campaign: { startDate: Date | null; createdAt: Date; endDate: Date | null },
  legacyUserIds: number[],
  bookingStatus: CampaignBookingStatusFilter
): Promise<CampaignCustomerEnrichmentData> {
  const idListStr = legacyUserIds.join(',');

  // A customer is "Done" for a campaign only after completing a service inside
  // that campaign's operating window. `actual_booking_date_start` is the source
  // of truth for the real service date; the scheduled booking date is a legacy
  // fallback when the actual check-in record is unavailable.
  const campaignStartDate = (campaign.startDate || campaign.createdAt).toISOString().slice(0, 10);
  const campaignEndDate = campaign.endDate ? campaign.endDate.toISOString().slice(0, 10) : null;
  const campaignDoneRowsPromise: Promise<Array<{ userId: number }>> =
    bookingStatus === 'DONE'
      ? fastify.prisma.legacy.$queryRawUnsafe<Array<{ userId: number }>>(
          `
            SELECT DISTINCT o.user_id AS userId
            FROM \`order\` o
            LEFT JOIN report_order ro ON ro.order_id = o.id
            WHERE o.user_id IN (${idListStr})
              AND o.order_state = 'Completed'
              AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) IS NOT NULL
              AND DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) >= ?
              ${campaignEndDate ? 'AND DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) <= ?' : ''}
          `,
          ...(campaignEndDate ? [campaignStartDate, campaignEndDate] : [campaignStartDate])
        )
      : Promise.resolve([]);

  // Fetch customer profiles, contacts, assignments, pending allocation batch items, recent call logs, order stats, and visit dates
  const [
    profiles,
    contacts,
    assignments,
    pendingBatchItems,
    callLogs,
    orderStatsRows,
    lastVisitRows,
    latestBookingRows,
    campaignDoneRows,
  ] = await Promise.all([
    fastify.prisma.legacy.user_profile.findMany({
      where: { user_id: { in: legacyUserIds } },
      select: { user_id: true, full_name: true, avatar: true, last_order_booking: true },
    }),
    fastify.prisma.legacy.user_contact.findMany({
      where: { user_id: { in: legacyUserIds }, is_disabled: false },
      select: { user_id: true, phone_number: true },
    }),
    fastify.prisma.crm.crmCustomerAssignment.findMany({
      where: { legacyUserId: { in: legacyUserIds } },
      include: { staff: { select: { id: true, displayName: true, username: true } } },
    }),
    fastify.prisma.crm.crmAllocationBatchItem.findMany({
      where: {
        customerId: { in: legacyUserIds },
        status: 'PENDING_ACCEPT',
        batch: { status: 'PENDING_ACCEPT' },
      },
      include: {
        batch: {
          include: {
            booker: { select: { id: true, displayName: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Phase 3 Perf: Only fetch latest call log per user (not ALL historical logs)
    fastify.prisma.crm.$queryRawUnsafe<any[]>(`
      SELECT cl.*
      FROM crm_call_logs cl
      INNER JOIN (
        SELECT MAX(id) as max_id
        FROM crm_call_logs
        WHERE legacy_user_id IN (${idListStr})
        GROUP BY legacy_user_id
      ) latest ON cl.id = latest.max_id
    `),
    fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        user_id as userId,
        COALESCE(SUM(total_price), 0) as totalSpent,
        COUNT(id) as totalVisits
      FROM \`order\`
      WHERE user_id IN (${idListStr}) AND order_state = 'Completed'
      GROUP BY user_id
    `),
    process.env.CUSTOMER_VISIT_PROJECTION_READ_ENABLED === 'true'
      ? CustomerVisitProjectionService.readForCustomers(fastify, legacyUserIds)
      : CustomerVisitProjectionService.readCanonicalForCustomers(fastify, legacyUserIds),
    fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        o.user_id as userId,
        o.booking_date_start as lastBookingDate,
        o.order_state as lastBookingState
      FROM \`order\` o
      INNER JOIN (
        SELECT user_id, MAX(id) as max_id
        FROM \`order\`
        WHERE user_id IN (${idListStr})
        GROUP BY user_id
      ) latest ON o.id = latest.max_id
    `),
    campaignDoneRowsPromise,
  ]);

  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
  const phoneMap = new Map(contacts.map((c) => [c.user_id, c.phone_number]));
  const assignmentMap = new Map(assignments.map((a) => [a.legacyUserId, a]));
  const pendingBatchMap = new Map(pendingBatchItems.map((item) => [item.customerId, item]));

  const orderStatsMap = new Map(orderStatsRows.map((r) => [Number(r.userId), Math.round(Number(r.totalSpent || 0))]));
  const lastVisitMap = new Map(
    lastVisitRows.map((r) => [
      r.legacyUserId,
      {
        lastVisitDate: r.lastVisitAt,
        daysSinceLastVisit: r.daysSinceLastVisit,
      },
    ])
  );
  const latestBookingMap = new Map(
    latestBookingRows.map((r) => [
      Number(r.userId),
      {
        lastBookingDate: r.lastBookingDate ? new Date(r.lastBookingDate).toISOString().replace('Z', '+07:00') : null,
        lastBookingState: r.lastBookingState,
      },
    ])
  );
  const campaignDoneUserIds = new Set(campaignDoneRows.map((row) => Number(row.userId)));

  const callLogMap = new Map<number, any>();
  for (const log of callLogs) {
    // Raw SQL returns snake_case: legacy_user_id, created_at, etc.
    const userId = log.legacyUserId ?? log.legacy_user_id;
    if (userId && !callLogMap.has(userId)) {
      callLogMap.set(userId, {
        ...log,
        legacyUserId: userId,
        createdAt: log.createdAt ?? log.created_at,
        callResult: log.callResult ?? log.call_result,
        callDuration: log.callDuration ?? log.call_duration,
        callbackDate: log.callbackDate ?? log.callback_date,
        note: log.note,
      });
    }
  }

  return {
    profileMap,
    phoneMap,
    assignmentMap,
    pendingBatchMap,
    orderStatsMap,
    lastVisitMap,
    latestBookingMap,
    campaignDoneUserIds,
    callLogMap,
  };
}

export function enrichCampaignCustomerItem(cc: any, context: CampaignCustomerEnrichmentContext): any {
  const { campaign, enrichment, now, currentStaffId, restrictToAssignedStaffId } = context;
  const prof = enrichment.profileMap.get(cc.legacyUserId);
  const phone = enrichment.phoneMap.get(cc.legacyUserId) || null;
  const assignment = enrichment.assignmentMap.get(cc.legacyUserId) || null;
  const pendingItem = enrichment.pendingBatchMap.get(cc.legacyUserId) || null;
  const lastCall = enrichment.callLogMap.get(cc.legacyUserId) || null;

  const orderSpent = enrichment.orderStatsMap.get(cc.legacyUserId) || 0;
  const visitData = enrichment.lastVisitMap.get(cc.legacyUserId);
  const bookingData = enrichment.latestBookingMap.get(cc.legacyUserId);

  let daysSinceLastVisit = visitData?.daysSinceLastVisit ?? null;
  let lastVisit = visitData?.lastVisitDate ?? null;
  if (daysSinceLastVisit === null && prof?.last_order_booking) {
    const lastB = new Date(prof.last_order_booking);
    const diffMs = now.getTime() - lastB.getTime();
    daysSinceLastVisit = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    lastVisit = lastB.toISOString();
  }

  const callbackDate = (lastCall as any)?.callbackDate ? new Date((lastCall as any).callbackDate).toISOString() : null;

  const staff = assignment?.staff || pendingItem?.batch?.booker || null;
  const isPendingAccept = !assignment && !!pendingItem;

  const baseDate = campaign.startDate ? new Date(campaign.startDate) : new Date(cc.addedAt);
  const diffMs = now.getTime() - baseDate.getTime();
  const daysInCampaign = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // Active touchpoints matching daysInCampaign
  const matchedTouchpoint = campaign.touchpoints.find((tp) => {
    if (tp.daysMax !== null && tp.daysMax !== undefined) {
      return daysInCampaign >= tp.daysMin && daysInCampaign <= tp.daysMax;
    }
    return daysInCampaign >= tp.daysMin;
  });

  const assignedAtIso = assignment?.assignedAt
    ? new Date(assignment.assignedAt).toISOString()
    : pendingItem?.createdAt
      ? new Date(pendingItem.createdAt).toISOString()
      : null;
  const assignedBookerName = staff
    ? (staff.displayName || staff.username || null) + (isPendingAccept ? ' (Chờ 24h)' : '')
    : null;

  const lastCallAt = lastCall ? lastCall.createdAt.toISOString() : null;
  const lastCallDuration = lastCall ? lastCall.durationSec || (lastCall as any).duration_sec || 0 : null;
  const lastCallResult = lastCall
    ? lastCall.callResult || (lastCall as any).call_result || (lastCall as any).status || null
    : null;
  const lastCallNote = lastCall ? lastCall.note || (lastCall as any).description || '' : null;

  const isRecycleEnded =
    (cc.poolStatus === 'RECYCLING' || cc.poolStatus === 'RECYCLE') && Boolean(cc.availableAt && cc.availableAt <= now);
  const effectivePoolStatus = isRecycleEnded ? 'AVAILABLE' : cc.poolStatus;
  const effectiveCooldownUntil = isRecycleEnded ? null : cc.cooldownUntil;

  return {
    id: cc.id,
    campaignId: cc.campaignId,
    legacyUserId: cc.legacyUserId,
    customerName: prof?.full_name || `Khách hàng #${cc.legacyUserId}`,
    customerPhone: phone,
    avatar: prof?.avatar || null,
    totalSpent: orderSpent,
    daysSinceLastVisit,
    lastVisit,
    lastBookingDate: bookingData?.lastBookingDate || null,
    lastBookingState: bookingData?.lastBookingState || null,
    callbackDate,
    addedAt: cc.addedAt.toISOString(),
    addedBy: cc.addedBy,
    daysInCampaign,
    currentTouchpointKey: matchedTouchpoint ? matchedTouchpoint.key : 'all',
    assignedBooker: staff ? { id: staff.id, name: staff.displayName || staff.username } : null,
    assignedBookerName,
    assignedAt: assignedAtIso,
    isPendingAccept,
    assignedStaff: staff
      ? {
          id: staff.id,
          displayName: staff.displayName || staff.username,
          assignedAt: assignedAtIso,
        }
      : null,
    lastCallAt: cc.lastCallAt ? cc.lastCallAt.toISOString() : lastCallAt,
    lastCallDuration,
    lastCallStaffId: cc.lastCallStaffId || null,
    lastCallStaffName: cc.lastCallStaffName || null,
    lastCallResult: cc.lastCallResult || lastCallResult,
    lastCallNote: cc.lastCallNote || lastCallNote,
    lastCall: lastCall
      ? {
          createdAt: lastCallAt,
          durationSec: lastCallDuration,
          callResult: lastCallResult,
          note: lastCallNote,
        }
      : null,
    batchNumber: cc.batchNumber,
    poolStatus: effectivePoolStatus,
    claimedByStaffId: isRecycleEnded ? null : cc.claimedByStaffId,
    claimedByStaffName: isRecycleEnded ? null : cc.claimedByStaffName,
    claimedAt: isRecycleEnded ? null : cc.claimedAt?.toISOString() || null,
    claimExpiresAt: isRecycleEnded ? null : cc.claimExpiresAt?.toISOString() || null,
    cooldownUntil: effectiveCooldownUntil?.toISOString() || null,
    availableAt: isRecycleEnded ? null : cc.availableAt?.toISOString() || null,
    bookedByStaffId: cc.bookedByStaffId,
    bookedByStaffName: cc.bookedByStaffName,
    bookedAt: cc.bookedAt?.toISOString() || null,
    callCount: cc.callCount,
    isClaimedByMe:
      !isRecycleEnded &&
      (currentStaffId
        ? cc.claimedByStaffId === currentStaffId
        : restrictToAssignedStaffId
          ? cc.claimedByStaffId === restrictToAssignedStaffId
          : false),
    canClaim: effectivePoolStatus === 'AVAILABLE' && (!effectiveCooldownUntil || effectiveCooldownUntil <= now),
    canCall:
      campaign.operationMode === 'SHARED_POOL'
        ? effectivePoolStatus !== 'EXCLUDED' &&
          effectivePoolStatus !== 'BOOKED' &&
          ((effectivePoolStatus === 'CLAIMED' &&
            (currentStaffId
              ? cc.claimedByStaffId === currentStaffId
              : restrictToAssignedStaffId
                ? cc.claimedByStaffId === restrictToAssignedStaffId
                : true)) ||
            (effectivePoolStatus === 'AVAILABLE' && (!effectiveCooldownUntil || effectiveCooldownUntil <= now)))
        : restrictToAssignedStaffId
          ? cc.claimedByStaffId === restrictToAssignedStaffId
          : true,
    claimRemainingSeconds:
      cc.claimExpiresAt && cc.claimExpiresAt > now
        ? Math.round((cc.claimExpiresAt.getTime() - now.getTime()) / 1000)
        : 0,
    cooldownRemainingSeconds:
      cc.cooldownUntil && cc.cooldownUntil > now ? Math.round((cc.cooldownUntil.getTime() - now.getTime()) / 1000) : 0,
    touchpointLogs: cc.touchpointLogs.map((log: any) => ({
      id: log.id,
      touchpointId: log.touchpointId,
      touchpointKey: log.touchpoint?.key,
      touchpointLabel: log.touchpoint?.label,
      isChecked: log.isChecked,
      status: (log as any).status || (log.isChecked ? 'SUCCESS' : null),
      completedAt: log.completedAt ? log.completedAt.toISOString() : null,
      completedByStaffId: log.completedByStaffId,
      completedByStaffName: log.completedByStaffName,
      note: log.note,
    })),
  };
}

export async function filterEnrichedCampaignCustomers(
  fastify: FastifyInstance,
  enrichedItems: any[],
  options: CampaignCustomerFilterOptions
): Promise<any[]> {
  const {
    campaign,
    campaignDoneUserIds,
    now,
    bookerId,
    assignedStaffId,
    restrictToAssignedStaffId,
    search,
    touchpointKey,
    bookingStatus,
  } = options;

  let enriched = enrichedItems;

  // Security scope: a telesales user only sees customers durably assigned to
  // their own CRM staff account. Pending allocation batches are not enough.
  // In SHARED_POOL mode, all verified members of the campaign share the active pool.
  if (restrictToAssignedStaffId && campaign.operationMode !== 'SHARED_POOL') {
    const activeAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
      where: {
        staffId: restrictToAssignedStaffId,
        legacyUserId: { in: enriched.map((customer) => customer.legacyUserId) },
      },
      select: { legacyUserId: true },
    });
    const allowedCustomerIds = new Set(activeAssignments.map((assignment) => assignment.legacyUserId));
    enriched = enriched.filter((customer) => allowedCustomerIds.has(customer.legacyUserId));
  }

  // Apply Booker filtering (supports both bookerId and assignedStaffId)
  const filterBookerId = bookerId || assignedStaffId;
  if (filterBookerId && String(filterBookerId) !== 'ALL') {
    const bId = Number(filterBookerId);
    enriched = enriched.filter((c) => {
      const staffId = c.assignedStaff?.id || c.assignedBooker?.id;
      return staffId === bId;
    });
  }

  // Apply search filter (name or phone)
  if (search && search.trim() !== '') {
    const searchLower = removeVietnameseTones(search);
    enriched = enriched.filter(
      (c) =>
        (c.customerName && removeVietnameseTones(c.customerName).includes(searchLower)) ||
        (c.customerPhone && c.customerPhone.includes(searchLower)) ||
        String(c.legacyUserId).includes(searchLower)
    );
  }

  // Apply touchpointKey filter
  if (touchpointKey && touchpointKey.toLowerCase() !== 'all') {
    const touchpoint = campaign.touchpoints.find((item) => item.key.toLowerCase() === touchpointKey.toLowerCase());
    enriched = touchpoint
      ? enriched.filter((customer) => {
          const days = customer.daysInCampaign ?? 0;
          return touchpoint.daysMax === null || touchpoint.daysMax === undefined
            ? days >= touchpoint.daysMin
            : days >= touchpoint.daysMin && days <= touchpoint.daysMax;
        })
      : [];
  }

  // Quick booking filters use the customer's latest booking. "Booked" is a
  // future, actionable appointment; "Done" is a completed service during the
  // campaign window; and "Missed" is a past appointment that never reached a
  // service state.
  if (bookingStatus === 'BOOKED') {
    enriched = enriched.filter((customer) => {
      if (!customer.lastBookingDate) return false;
      const isFutureAppointment = new Date(customer.lastBookingDate).getTime() > now.getTime();
      return isFutureAppointment && ['New', 'Confirmed'].includes(customer.lastBookingState);
    });
  } else if (bookingStatus === 'DONE') {
    enriched = enriched.filter((customer) => campaignDoneUserIds.has(customer.legacyUserId));
  } else if (bookingStatus === 'MISSED') {
    const completedStates = new Set(['Completed', 'ServiceCompleted', 'CheckIn', 'CheckOut', 'ServiceStart']);
    enriched = enriched.filter((customer) => {
      if (!customer.lastBookingDate || !customer.lastBookingState) return false;
      const isPastAppointment = new Date(customer.lastBookingDate).getTime() < now.getTime();
      return isPastAppointment && !completedStates.has(customer.lastBookingState);
    });
  }

  return enriched;
}
