import { FastifyInstance } from 'fastify';
/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import {
  AddCampaignCustomersResponse,
  CampaignBookingStatusFilter,
  CampaignPoolStatus,
  CampaignTouchpointLog,
  ToggleCampaignTouchpointLogDto,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { AllocationLedgerService } from '../../allocation/allocation-ledger.service.js';
import { CustomerVisitProjectionService } from '../../projections/customer-visit-projection.service.js';
import { CampaignSharedPoolService } from './campaign-shared-pool.service.js';

export class CampaignCustomerService {
  /**
   * Fetch campaign customers with Booker filtering, search, pagination,
   * and touchpoint classification based on DATEDIFF(NOW(), cc.added_at).
   */
  static async getCampaignCustomers(
    fastify: FastifyInstance,
    campaignId: number,
    params: {
      bookerId?: number;
      assignedStaffId?: number;
      currentStaffId?: number;
      restrictToAssignedStaffId?: number;
      search?: string;
      touchpointKey?: string;
      bookingStatus?: CampaignBookingStatusFilter;
      batchNumber?: number | 'ALL';
      poolStatus?: CampaignPoolStatus | 'ALL' | 'REMAINING' | 'RECYCLE';
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  }> {
    const {
      bookerId,
      assignedStaffId,
      currentStaffId,
      restrictToAssignedStaffId,
      search,
      touchpointKey,
      bookingStatus = 'ALL',
      batchNumber,
      poolStatus,
      page = 1,
      pageSize = 20,
    } = params;
    const pageNum = Math.max(1, Math.floor(Number(page) || 1));
    const limitNum = Math.min(1000, Math.max(1, Math.floor(Number(pageSize) || 20)));
    const skip = (pageNum - 1) * limitNum;

    // Verify campaign exists
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      include: { touchpoints: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);
    }

    const where: any = {
      campaignId,
      removedAt: null,
    };

    if (campaign.operationMode === 'SHARED_POOL') {
      await CampaignSharedPoolService.maintainSharedPool(fastify, campaign.id);

      // Telesales membership check
      if (restrictToAssignedStaffId) {
        let allowedStaffIds: number[] = [];
        try {
          if (campaign.assignedStaffIds) {
            allowedStaffIds = JSON.parse(campaign.assignedStaffIds);
          }
        } catch {}
        if (
          Array.isArray(allowedStaffIds) &&
          allowedStaffIds.length > 0 &&
          !allowedStaffIds.includes(restrictToAssignedStaffId)
        ) {
          return { items: [], total: 0, page: pageNum, pageSize: limitNum, pages: 0 };
        }
      }

      if (batchNumber !== undefined && batchNumber !== 'ALL') {
        where.batchNumber = Number(batchNumber);
      } else if (batchNumber === undefined && poolStatus !== 'REMAINING') {
        where.batchNumber = campaign.currentBatchNumber || 1;
      }

      if (poolStatus === 'REMAINING') {
        where.poolStatus = { in: ['AVAILABLE', 'CLAIMED', 'RECYCLING', 'RECYCLE'] };
      } else if (poolStatus === 'RECYCLE') {
        where.poolStatus = { in: ['RECYCLING', 'RECYCLE'] };
      } else if (poolStatus && poolStatus !== 'ALL') {
        where.poolStatus = poolStatus;
      }
    }

    // Booker, text and touchpoint filters depend on data from other sources, so
    // they still require enrichment before filtering. The common unfiltered
    // table path can page at the database boundary, avoiding every legacy query
    // and response field for records outside the visible page.
    const hasPostEnrichmentFilters = Boolean(
      bookerId ||
      assignedStaffId ||
      (restrictToAssignedStaffId && campaign.operationMode !== 'SHARED_POOL') ||
      search?.trim() ||
      touchpointKey?.trim() ||
      bookingStatus !== 'ALL'
    );
    const customerQuery = {
      where,
      include: {
        touchpointLogs: {
          include: { touchpoint: true as const },
        },
      },
      orderBy: { addedAt: 'desc' as const },
    };
    const campaignCustomersPromise = hasPostEnrichmentFilters
      ? fastify.prisma.crm.crmCampaignCustomer.findMany(customerQuery)
      : fastify.prisma.crm.crmCampaignCustomer.findMany({ ...customerQuery, skip, take: limitNum });
    const totalPromise: Promise<number | undefined> = hasPostEnrichmentFilters
      ? Promise.resolve(undefined)
      : fastify.prisma.crm.crmCampaignCustomer.count({ where });
    const [campaignCustomers, unfilteredTotal] = await Promise.all([campaignCustomersPromise, totalPromise]);

    if (campaignCustomers.length === 0) {
      const total = unfilteredTotal ?? 0;
      return { items: [], total, page: pageNum, pageSize: limitNum, pages: Math.ceil(total / limitNum) || 0 };
    }

    const legacyUserIds = Array.from(
      new Set(campaignCustomers.map((cc) => Number(cc.legacyUserId)).filter((id) => !isNaN(id) && id > 0))
    );

    if (legacyUserIds.length === 0) {
      const total = unfilteredTotal ?? 0;
      return { items: [], total, page: pageNum, pageSize: limitNum, pages: Math.ceil(total / limitNum) || 0 };
    }

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

    const now = new Date();

    // Enrich and filter customers
    let enriched = campaignCustomers.map((cc) => {
      const prof = profileMap.get(cc.legacyUserId);
      const phone = phoneMap.get(cc.legacyUserId) || null;
      const assignment = assignmentMap.get(cc.legacyUserId) || null;
      const pendingItem = pendingBatchMap.get(cc.legacyUserId) || null;
      const lastCall = callLogMap.get(cc.legacyUserId) || null;

      const orderSpent = orderStatsMap.get(cc.legacyUserId) || 0;
      const visitData = lastVisitMap.get(cc.legacyUserId);
      const bookingData = latestBookingMap.get(cc.legacyUserId);

      let daysSinceLastVisit = visitData?.daysSinceLastVisit ?? null;
      let lastVisit = visitData?.lastVisitDate ?? null;
      if (daysSinceLastVisit === null && prof?.last_order_booking) {
        const lastB = new Date(prof.last_order_booking);
        const diffMs = now.getTime() - lastB.getTime();
        daysSinceLastVisit = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        lastVisit = lastB.toISOString();
      }

      const callbackDate = (lastCall as any)?.callbackDate
        ? new Date((lastCall as any).callbackDate).toISOString()
        : null;

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
        (cc.poolStatus === 'RECYCLING' || cc.poolStatus === 'RECYCLE') &&
        Boolean(cc.availableAt && cc.availableAt <= now);
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
          cc.cooldownUntil && cc.cooldownUntil > now
            ? Math.round((cc.cooldownUntil.getTime() - now.getTime()) / 1000)
            : 0,
        touchpointLogs: cc.touchpointLogs.map((log) => ({
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
    });

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

    const total = unfilteredTotal ?? enriched.length;
    const paginated = hasPostEnrichmentFilters ? enriched.slice(skip, skip + limitNum) : enriched;

    return {
      items: paginated,
      total,
      page: pageNum,
      pageSize: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Exclusively add customers from NYC pool to campaign
   * (verifying customer is not already in another active campaign).
   */
  static async addCustomersToCampaign(
    fastify: FastifyInstance,
    campaignId: number,
    customerIds: number[],
    staffId: number
  ): Promise<AddCampaignCustomersResponse> {
    if (!customerIds || customerIds.length === 0) {
      throw new Error('Danh sách ID khách hàng không được để trống');
    }

    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || ['COMPLETED', 'ENDED', 'ARCHIVED', 'DELETED'].includes(campaign.status)) {
      throw new Error('Chiến dịch không tồn tại hoặc đã bị chốt/lưu trữ/xóa');
    }

    const uniqueCustomerIds = Array.from(
      new Set(customerIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0))
    );

    // Fetch customer profiles, contacts, and existing active campaign assignments
    const [profiles, contacts, activeAssignments] = await Promise.all([
      fastify.prisma.legacy.user_profile.findMany({
        where: { user_id: { in: uniqueCustomerIds } },
        select: { user_id: true, full_name: true },
      }),
      fastify.prisma.legacy.user_contact.findMany({
        where: { user_id: { in: uniqueCustomerIds }, is_disabled: false },
        select: { user_id: true, phone_number: true },
      }),
      fastify.prisma.crm.crmCampaignCustomer.findMany({
        where: {
          legacyUserId: { in: uniqueCustomerIds },
          removedAt: null,
          campaign: { status: { in: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED'] } },
        },
        include: {
          campaign: { select: { id: true, name: true } },
        },
      }),
    ]);

    const profileMap = new Map(profiles.map((p) => [p.user_id, p.full_name]));
    const phoneMap = new Map(contacts.map((c) => [c.user_id, c.phone_number]));
    const activeAssignmentMap = new Map(activeAssignments.map((a) => [a.legacyUserId, a.campaign]));

    const details: any[] = [];
    const validCustomerIds: number[] = [];

    uniqueCustomerIds.forEach((cId) => {
      const name = profileMap.get(cId) || `Khách hàng #${cId}`;
      const phone = phoneMap.get(cId) || null;
      const currentCamp = activeAssignmentMap.get(cId);

      if (currentCamp) {
        const isSame = currentCamp.id === campaignId;
        details.push({
          legacyUserId: cId,
          customerName: name,
          customerPhone: phone,
          status: 'SKIPPED',
          reason: isSame ? 'Đã có sẵn trong chiến dịch này' : `Đã thuộc chiến dịch "${currentCamp.name}"`,
          currentCampaignId: currentCamp.id,
          currentCampaignName: currentCamp.name,
        });
      } else {
        validCustomerIds.push(cId);
        details.push({
          legacyUserId: cId,
          customerName: name,
          customerPhone: phone,
          status: 'ADDED',
        });
      }
    });

    const skippedCount = details.filter((d) => d.status === 'SKIPPED').length;

    if (validCustomerIds.length > 0) {
      const now = new Date();
      let insertData: any[] = [];
      if (campaign.operationMode === 'SHARED_POOL') {
        let batchSize = 100;
        try {
          if (campaign.sharedPoolConfig) {
            const conf =
              typeof campaign.sharedPoolConfig === 'string'
                ? JSON.parse(campaign.sharedPoolConfig)
                : campaign.sharedPoolConfig;
            if (conf?.batchSize && conf.batchSize > 0) batchSize = Number(conf.batchSize);
          }
        } catch {}

        let currentBatch = 1;
        let countInCurrentBatch = 0;
        const highestCust = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
          where: { campaignId, removedAt: null },
          orderBy: { batchNumber: 'desc' },
          select: { batchNumber: true },
        });
        if (highestCust && highestCust.batchNumber > 0) {
          currentBatch = highestCust.batchNumber;
          countInCurrentBatch = await fastify.prisma.crm.crmCampaignCustomer.count({
            where: { campaignId, batchNumber: currentBatch, removedAt: null },
          });
        }

        insertData = validCustomerIds.map((cId) => {
          if (countInCurrentBatch >= batchSize) {
            currentBatch++;
            countInCurrentBatch = 0;
          }
          countInCurrentBatch++;
          return {
            campaignId,
            legacyUserId: cId,
            batchNumber: currentBatch,
            poolStatus: 'AVAILABLE',
            addedAt: now,
            addedBy: staffId,
          };
        });
      } else {
        insertData = validCustomerIds.map((cId) => ({
          campaignId,
          legacyUserId: cId,
          addedAt: now,
          addedBy: staffId,
        }));
      }

      await fastify.prisma.crm.crmCampaignCustomer.createMany({
        data: insertData,
      });
    }

    return {
      success: validCustomerIds.length > 0,
      message:
        validCustomerIds.length > 0
          ? `Đã thêm thành công ${validCustomerIds.length} khách hàng vào chiến dịch${
              skippedCount > 0 ? ` (bỏ qua ${skippedCount} KH trùng)` : ''
            }`
          : `Tất cả ${uniqueCustomerIds.length} khách hàng được chọn đã thuộc chiến dịch khác đang hoạt động (hoặc đã có trong chiến dịch này)`,
      addedCount: validCustomerIds.length,
      skippedCount,
      details,
    };
  }

  /**
   * Force transfer customers from their old active campaign to a new campaign.
   * Sets removedAt on old campaign customer record, clears old assignment, and adds to new campaign.
   */
  static async transferCustomersToCampaign(
    fastify: FastifyInstance,
    campaignId: number,
    customerIds: number[],
    reason: string | undefined,
    staffId: number
  ): Promise<{ success: boolean; message: string; transferredCount: number }> {
    if (!customerIds || customerIds.length === 0) {
      throw new Error('Danh sách ID khách hàng không được để trống');
    }

    const targetCampaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!targetCampaign || ['COMPLETED', 'ENDED', 'ARCHIVED', 'DELETED'].includes(targetCampaign.status)) {
      throw new Error('Chiến dịch đích không tồn tại hoặc đã bị chốt/lưu trữ/xóa');
    }

    const uniqueCustomerIds = Array.from(
      new Set(customerIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0))
    );
    const now = new Date();

    await fastify.prisma.crm.$transaction(async (tx) => {
      // 1. Soft remove from old active campaigns
      await tx.crmCampaignCustomer.updateMany({
        where: {
          legacyUserId: { in: uniqueCustomerIds },
          removedAt: null,
        },
        data: {
          removedAt: now,
          removedReason: reason || `Quản lý chuyển sang chiến dịch "${targetCampaign.name}"`,
          removedBy: staffId,
        },
      });

      // 2. Return current owners to pool with immutable campaign evidence.
      const assignments = await tx.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: uniqueCustomerIds } },
      });
      for (const assignment of assignments) {
        await AllocationLedgerService.setOwner(tx, {
          customerId: assignment.legacyUserId,
          eventType: 'CAMPAIGN_RETURNED_TO_POOL',
          previousStaffId: assignment.staffId,
          nextStaffId: null,
          actorStaffId: staffId,
          reason: reason || `Quản lý chuyển sang chiến dịch "${targetCampaign.name}"`,
          sourceType: 'CAMPAIGN',
          actionContext: 'CAMPAIGN_TRANSFER',
          campaignId,
          correlationId: `campaign-transfer-${campaignId}`,
          deleteWhenPool: true,
          occurredAt: now,
        });
      }

      // 3. Add to target campaign
      let insertData: any[] = [];
      if (targetCampaign.operationMode === 'SHARED_POOL') {
        let batchSize = 100;
        try {
          if (targetCampaign.sharedPoolConfig) {
            const conf =
              typeof targetCampaign.sharedPoolConfig === 'string'
                ? JSON.parse(targetCampaign.sharedPoolConfig)
                : targetCampaign.sharedPoolConfig;
            if (conf?.batchSize && conf.batchSize > 0) batchSize = Number(conf.batchSize);
          }
        } catch {}

        let currentBatch = 1;
        let countInCurrentBatch = 0;
        const highestCust = await tx.crmCampaignCustomer.findFirst({
          where: { campaignId, removedAt: null },
          orderBy: { batchNumber: 'desc' },
          select: { batchNumber: true },
        });
        if (highestCust && highestCust.batchNumber > 0) {
          currentBatch = highestCust.batchNumber;
          countInCurrentBatch = await tx.crmCampaignCustomer.count({
            where: { campaignId, batchNumber: currentBatch, removedAt: null },
          });
        }

        insertData = uniqueCustomerIds.map((cId) => {
          if (countInCurrentBatch >= batchSize) {
            currentBatch++;
            countInCurrentBatch = 0;
          }
          countInCurrentBatch++;
          return {
            campaignId,
            legacyUserId: cId,
            batchNumber: currentBatch,
            poolStatus: 'AVAILABLE',
            addedAt: now,
            addedBy: staffId,
          };
        });
      } else {
        insertData = uniqueCustomerIds.map((cId) => ({
          campaignId,
          legacyUserId: cId,
          addedAt: now,
          addedBy: staffId,
        }));
      }

      await tx.crmCampaignCustomer.createMany({
        data: insertData,
      });
    });

    return {
      success: true,
      message: `Đã chuyển thành công ${uniqueCustomerIds.length} khách hàng sang chiến dịch "${targetCampaign.name}"`,
      transferredCount: uniqueCustomerIds.length,
    };
  }

  /**
   * Remove customer from campaign (set removedAt = NOW(), returning customer to NYC main pool).
   */
  static async removeCustomerFromCampaign(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    reason: string | undefined,
    staffId: number
  ): Promise<{ success: boolean; message: string }> {
    const record = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ legacyUserId: customerId }, { id: customerId }],
        removedAt: null,
      },
    });

    if (!record) {
      throw new Error('Khách hàng không ở trong chiến dịch này hoặc đã bị gỡ');
    }

    const now = new Date();
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmCampaignCustomer.update({
        where: { id: record.id },
        data: {
          removedAt: now,
          removedReason: reason || 'Quản lý gỡ khỏi chiến dịch',
          removedBy: staffId,
        },
      });

      const assignment = await tx.crmCustomerAssignment.findUnique({
        where: { legacyUserId: record.legacyUserId },
      });
      if (assignment) {
        await AllocationLedgerService.setOwner(tx, {
          customerId: record.legacyUserId,
          eventType: 'CAMPAIGN_RETURNED_TO_POOL',
          previousStaffId: assignment.staffId,
          nextStaffId: null,
          actorStaffId: staffId,
          reason: reason || 'Quản lý gỡ khỏi chiến dịch',
          sourceType: 'CAMPAIGN',
          actionContext: 'CAMPAIGN_REMOVE',
          campaignId,
          correlationId: `campaign-remove-${record.id}`,
          deleteWhenPool: true,
          occurredAt: now,
        });
      }
    });

    return {
      success: true,
      message: 'Đã gỡ khách hàng khỏi chiến dịch và trả về pool NYC',
    };
  }

  /**
   * Batch remove customers from campaign (set removedAt = NOW() and unassign Booker).
   */
  static async removeCustomersFromCampaignBatch(
    fastify: FastifyInstance,
    campaignId: number,
    customerIds: number[],
    reason: string | undefined,
    staffId: number
  ): Promise<{ success: boolean; removedCount: number; message: string }> {
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      throw new Error('Danh sách ID khách hàng không được để trống');
    }

    const records = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        campaignId,
        OR: [{ legacyUserId: { in: customerIds } }, { id: { in: customerIds } }],
        removedAt: null,
      },
    });

    if (records.length === 0) {
      return {
        success: true,
        removedCount: 0,
        message: 'Không tìm thấy khách hàng hợp lệ để gỡ khỏi chiến dịch',
      };
    }

    const recordIds = records.map((r) => r.id);
    const legacyUserIds = Array.from(new Set(records.map((r) => r.legacyUserId)));
    const now = new Date();

    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmCampaignCustomer.updateMany({
        where: { id: { in: recordIds } },
        data: {
          removedAt: now,
          removedReason: reason || 'Quản lý gỡ hàng loạt khỏi chiến dịch',
          removedBy: staffId,
        },
      });

      // Clear Booker assignments so customers return to the NYC pool, with one append-only event per affected customer.
      if (legacyUserIds.length > 0) {
        const assignments = await tx.crmCustomerAssignment.findMany({
          where: { legacyUserId: { in: legacyUserIds } },
        });
        for (const assignment of assignments) {
          await AllocationLedgerService.setOwner(tx, {
            customerId: assignment.legacyUserId,
            eventType: 'CAMPAIGN_RETURNED_TO_POOL',
            previousStaffId: assignment.staffId,
            nextStaffId: null,
            actorStaffId: staffId,
            reason: reason || 'Quản lý gỡ hàng loạt khỏi chiến dịch',
            sourceType: 'CAMPAIGN',
            actionContext: 'CAMPAIGN_BULK_REMOVE',
            campaignId,
            correlationId: `campaign-bulk-remove-${campaignId}`,
            deleteWhenPool: true,
            occurredAt: now,
          });
        }
      }
    });

    return {
      success: true,
      removedCount: recordIds.length,
      message: `Đã gỡ ${recordIds.length} khách hàng khỏi chiến dịch và trả về pool NYC`,
    };
  }

  /**
   * Upsert CrmCampaignTouchpointLog when a Booker or Admin toggles a touchpoint check mark.
   */
  static async toggleTouchpointLog(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    touchpointId: number,
    dto: ToggleCampaignTouchpointLogDto,
    staffId: number,
    staffName: string,
    restrictToAssignedStaffId?: number
  ): Promise<CampaignTouchpointLog> {
    const campaignCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ legacyUserId: customerId }, { id: customerId }],
        removedAt: null,
      },
      include: {
        campaign: {
          select: { operationMode: true },
        },
      },
    });

    if (!campaignCustomer) {
      throw new Error('Khách hàng không ở trong chiến dịch này');
    }

    if (restrictToAssignedStaffId) {
      if (campaignCustomer.campaign?.operationMode === 'SHARED_POOL') {
        const now = new Date();
        const isClaimedByMe =
          campaignCustomer.poolStatus === 'CLAIMED' &&
          campaignCustomer.claimedByStaffId === restrictToAssignedStaffId &&
          Boolean(campaignCustomer.claimExpiresAt && campaignCustomer.claimExpiresAt > now);
        if (!isClaimedByMe) {
          const error = new Error('Bạn cần nhận (Claim) khách hàng này trong Shared Pool trước khi thao tác.');
          (error as any).statusCode = 403;
          throw error;
        }
      } else {
        const assignment = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
          where: {
            legacyUserId: campaignCustomer.legacyUserId,
            staffId: restrictToAssignedStaffId,
          },
          select: { id: true },
        });
        if (!assignment) {
          const error = new Error('Telesales chỉ được thao tác trên khách hàng đã được phân bổ cho mình.');
          (error as any).statusCode = 403;
          throw error;
        }
      }
    }

    const now = new Date();

    const finalStatus =
      dto.status === null || (dto.status as any) === '' ? null : dto.status || (dto.isChecked ? 'SUCCESS' : null);
    const finalIsChecked = finalStatus !== null || dto.isChecked;

    const log = await fastify.prisma.crm.crmCampaignTouchpointLog.upsert({
      where: {
        campaignCustomerId_touchpointId: {
          campaignCustomerId: campaignCustomer.id,
          touchpointId,
        },
      },
      update: {
        isChecked: finalIsChecked,
        status: finalStatus,
        completedAt: now,
        completedByStaffId: staffId,
        completedByStaffName: staffName,
        note: dto.note || null,
      },
      create: {
        campaignCustomerId: campaignCustomer.id,
        touchpointId,
        isChecked: finalIsChecked,
        status: finalStatus,
        completedAt: now,
        completedByStaffId: staffId,
        completedByStaffName: staffName,
        note: dto.note || null,
      },
    });

    if (dto.callbackDate && !isNaN(new Date(dto.callbackDate).getTime())) {
      const cbDate = new Date(dto.callbackDate);
      try {
        await fastify.prisma.crm.crmDailyPlan.upsert({
          where: {
            legacyUserId_plannedDate: {
              legacyUserId: campaignCustomer.legacyUserId,
              plannedDate: cbDate,
            },
          },
          create: {
            legacyUserId: campaignCustomer.legacyUserId,
            staffId,
            plannedDate: cbDate,
            bucket: 'CAMPAIGN_CALLBACK',
            priority: 1,
            status: 'PLANNED',
          },
          update: {
            staffId,
            status: 'PLANNED',
          },
        });
      } catch (e) {
        fastify.log.error(e, 'Failed to upsert daily plan for campaign touchpoint callback');
      }
    }

    return {
      id: log.id,
      campaignCustomerId: log.campaignCustomerId,
      touchpointId: log.touchpointId,
      isChecked: log.isChecked,
      status: (log.status as any) || (log.isChecked ? 'SUCCESS' : null),
      completedAt: log.completedAt ? log.completedAt.toISOString() : null,
      completedByStaffId: log.completedByStaffId,
      completedByStaffName: log.completedByStaffName,
      note: log.note,
    };
  }
}
