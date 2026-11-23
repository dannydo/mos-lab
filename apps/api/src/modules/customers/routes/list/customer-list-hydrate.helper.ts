import { FastifyInstance } from 'fastify';
import { BucketType, SafeAny, maskPhoneNumber, shouldMaskCustomerPhone } from '@mos-lab/shared';
import { CustomerAccessService } from '../../services/customer-access.service.js';
import { resolveIsForeign } from '../../services/foreign-customer.service.js';
import { daysSinceVisit } from '../../../projections/customer-visit-projection.service.js';
import { fetchNewLocaComboMap } from './customer-list-new-loca.helper.js';

interface HydrateCustomerListRowsParams {
  fastify: FastifyInstance;
  pageIds: number[];
  total: number;
  pageNum: number;
  limitNum: number;
  bucket?: string;
  dateFrom?: string;
  dateTo?: string;
  userRole?: string;
}

export async function hydrateCustomerListRows({
  fastify,
  pageIds,
  total,
  pageNum,
  limitNum,
  bucket,
  dateFrom,
  dateTo,
  userRole,
}: HydrateCustomerListRowsParams) {
  const dataResult =
    pageIds.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT
            u.id,
            COALESCE(up.full_name, 'No Name') as name,
            up.avatar as avatar,
            up.is_foreign as isForeign,
            up.is_foreign_overridden as isForeignOverridden,
            (
              SELECT COALESCE(MAX(uc.phone_number), '')
              FROM user_contact uc
              WHERE uc.user_id = u.id AND uc.is_disabled = 0
            ) as phone,
            u.email,
            u.gender,
            u.date_of_birth as dob,
            TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) as age,
            up.last_order_booking as lastVisit,
            DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
            0 as totalSpent,
            0 as totalVisits,
            0 as totalPromotionsUsed,
            0 as totalReferrals,
            'SINGLE' as bucket,
            0 as normalCount,
            0 as retainCount,
            NULL as expiryDate
          FROM user u
          LEFT JOIN user_profile up ON u.id = up.user_id
          WHERE u.id IN (${pageIds.join(',')})`
        )
      : [];

  if (dataResult.length > 1) {
    const pageOrderIndex = new Map(pageIds.map((id, idx) => [id, idx]));
    dataResult.sort(
      (a: SafeAny, b: SafeAny) => (pageOrderIndex.get(Number(a.id)) ?? 0) - (pageOrderIndex.get(Number(b.id)) ?? 0)
    );
  }

  const customerIds = dataResult.map((row: SafeAny) => Number(row.id));
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

  // All enrichments depend only on the page IDs, so run them together
  // instead of adding a full database round trip for each section.
  const [
    assignments,
    assignmentHistories,
    activeBatchItems,
    latestBookings,
    latestCallbacks,
    latestDailyPlans,
    latestCalls,
    pageOrderMetrics,
    pageReferralMetrics,
    pageBalanceMetrics,
    elsaReservations,
  ] = await Promise.all([
    customerIds.length > 0
      ? fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: { legacyUserId: { in: customerIds } },
          select: {
            legacyUserId: true,
            assignedAt: true,
            staff: { select: { id: true, displayName: true, username: true } },
          },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.crm.crmAssignmentHistory.findMany({
          where: {
            legacyUserId: { in: customerIds },
            isUndone: false,
            newStaffId: { not: null },
          },
          select: {
            legacyUserId: true,
            assignedAt: true,
            newStaff: { select: { displayName: true } },
          },
          orderBy: { assignedAt: 'desc' },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.crm.crmAllocationBatchItem.findMany({
          where: {
            customerId: { in: customerIds },
            status: 'PENDING_ACCEPT',
            batch: { status: 'PENDING_ACCEPT' },
          },
          select: {
            customerId: true,
            status: true,
            createdAt: true,
            batch: {
              select: {
                status: true,
                booker: { select: { id: true, displayName: true, username: true } },
              },
            },
          },
          orderBy: { id: 'desc' },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT o.user_id as userId, o.booking_date_start as bookingDate, o.order_state as orderState
           FROM \`order\` o
           WHERE o.id IN (
             SELECT MAX(id)
             FROM \`order\`
             WHERE user_id IN (${customerIds.join(',')})
             GROUP BY user_id
           )`
        )
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.crm.crmCallLog.findMany({
          where: {
            legacyUserId: { in: customerIds },
            callbackDate: { not: null },
          },
          select: { legacyUserId: true, callbackDate: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.crm.crmDailyPlan.findMany({
          where: {
            legacyUserId: { in: customerIds },
            plannedDate: { gte: startOfToday },
          },
          select: { legacyUserId: true, plannedDate: true },
          orderBy: { plannedDate: 'asc' },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.crm.crmCallLog.findMany({
          where: { legacyUserId: { in: customerIds } },
          select: {
            legacyUserId: true,
            createdAt: true,
            durationSec: true,
            callResult: true,
            note: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT
             o.user_id as userId,
             COALESCE(SUM(o.total_price), 0) as totalSpent,
             COUNT(*) as totalVisits,
             SUM(CASE WHEN o.promotion_id IS NOT NULL OR o.selected_promotion_id IS NOT NULL THEN 1 ELSE 0 END) as totalPromotionsUsed,
             COALESCE(MAX(ro.actual_booking_date_start), MAX(o.booking_date_start)) as lastVisitAt,
             DATEDIFF(CURDATE(), COALESCE(MAX(ro.actual_booking_date_start), MAX(o.booking_date_start))) as daysSinceLastVisit
           FROM \`order\` o
           LEFT JOIN report_order ro ON o.id = ro.order_id
           WHERE o.order_state = 'Completed' AND o.user_id IN (${customerIds.join(',')})
           GROUP BY o.user_id`
        )
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT referrer_user_id as userId, COUNT(*) as totalReferrals
           FROM user_profile
           WHERE referrer_user_id IN (${customerIds.join(',')})
           GROUP BY referrer_user_id`
        )
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT
             user_id as userId,
             SUM(CASE
               WHEN (normal_count + retain_count) > 0 AND (service_group IS NULL OR service_group != 'LashesUnder') AND (date_expired IS NULL OR date_expired > NOW()) THEN 1
               ELSE 0
             END) as live_count,
             SUM(normal_count) as normalCount,
             SUM(retain_count) as retainCount,
             MAX(date_expired) as expiryDate
           FROM user_service_balance
           WHERE user_id IN (${customerIds.join(',')})
           GROUP BY user_id`
        )
      : Promise.resolve([]),
    customerIds.length > 0
      ? fastify.prisma.crm.crmCustomerElsaReservation.findMany({
          where: {
            legacyUserId: { in: customerIds },
            status: 'ACTIVE',
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          orderBy: { id: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const orderMetricMap = new Map(pageOrderMetrics.map((metric) => [Number(metric.userId), metric]));
  const referralMetricMap = new Map(pageReferralMetrics.map((metric) => [Number(metric.userId), metric]));
  const balanceMetricMap = new Map(pageBalanceMetrics.map((metric) => [Number(metric.userId), metric]));
  const elsaReservationMap = new Map<number, SafeAny>();
  elsaReservations.forEach((er) => {
    if (!elsaReservationMap.has(er.legacyUserId)) {
      elsaReservationMap.set(er.legacyUserId, er);
    }
  });

  // Keep the response's numeric and bucket semantics identical to the former
  // outer joins while limiting metric aggregation to this response page.
  dataResult.forEach((row: SafeAny) => {
    const customerId = Number(row.id);
    const orderMetric = orderMetricMap.get(customerId);
    const referralMetric = referralMetricMap.get(customerId);
    const balanceMetric = balanceMetricMap.get(customerId);
    const elsaRes = elsaReservationMap.get(customerId);

    row.totalSpent = orderMetric?.totalSpent || 0;
    row.totalVisits = orderMetric?.totalVisits || 0;
    row.totalPromotionsUsed = orderMetric?.totalPromotionsUsed || 0;
    row.totalReferrals = referralMetric?.totalReferrals || 0;
    if (orderMetric && Number(orderMetric.totalVisits) > 0 && orderMetric.lastVisitAt) {
      row.lastVisit = orderMetric.lastVisitAt;
      row.daysSinceLastVisit =
        orderMetric.daysSinceLastVisit !== null && orderMetric.daysSinceLastVisit !== undefined
          ? Number(orderMetric.daysSinceLastVisit)
          : daysSinceVisit(orderMetric.lastVisitAt);
    } else if (orderMetric && Number(orderMetric.totalVisits) === 0) {
      row.lastVisit = null;
      row.daysSinceLastVisit = null;
    } else if (!orderMetric) {
      row.lastVisit = null;
      row.daysSinceLastVisit = null;
    }

    if (elsaRes) {
      row.bucket = 'COMBO_ELSA';
      row.elsaReservation = {
        id: elsaRes.id,
        legacyUserId: elsaRes.legacyUserId,
        status: elsaRes.status,
        reservationType: elsaRes.reservationType,
        reason: elsaRes.reason,
        startDate: elsaRes.startDate ? new Date(elsaRes.startDate).toISOString() : null,
        endDate: elsaRes.endDate ? new Date(elsaRes.endDate).toISOString() : null,
        reminderDate: elsaRes.reminderDate ? new Date(elsaRes.reminderDate).toISOString() : null,
        reminderNote: elsaRes.reminderNote,
        isReminderDismissed: elsaRes.isReminderDismissed,
        createdByStaffId: elsaRes.createdByStaffId,
        createdByStaffName: elsaRes.createdByStaffName,
        releasedAt: elsaRes.releasedAt ? new Date(elsaRes.releasedAt).toISOString() : null,
        releasedByStaffId: elsaRes.releasedByStaffId,
        releasedByStaffName: elsaRes.releasedByStaffName,
        releaseNote: elsaRes.releaseNote,
        createdAt: new Date(elsaRes.createdAt).toISOString(),
        updatedAt: new Date(elsaRes.updatedAt).toISOString(),
      };
    } else {
      row.elsaReservation = null;
      row.bucket = !balanceMetric ? 'SINGLE' : Number(balanceMetric.live_count || 0) > 0 ? 'COMBO_LIVE' : 'COMBO_DEAD';
    }
    row.normalCount = balanceMetric?.normalCount || 0;
    row.retainCount = balanceMetric?.retainCount || 0;
    row.expiryDate = balanceMetric?.expiryDate || null;
  });

  const historyMap = new Map<number, { assignedAt: Date; staffName: string | null }>();
  assignmentHistories.forEach((h) => {
    if (!historyMap.has(h.legacyUserId)) {
      historyMap.set(h.legacyUserId, {
        assignedAt: h.assignedAt,
        staffName: h.newStaff ? h.newStaff.displayName : null,
      });
    }
  });

  const assignmentMap = new Map();
  assignments.forEach((a) => {
    const historyInfo = historyMap.get(a.legacyUserId);
    const assignedAtDate = historyInfo ? historyInfo.assignedAt : a.assignedAt || null;
    if (a.staff) {
      assignmentMap.set(a.legacyUserId, {
        id: a.staff.id,
        displayName: a.staff.displayName,
        username: a.staff.username,
        assignedAt: assignedAtDate ? assignedAtDate.toISOString() : null,
      });
    }
  });

  activeBatchItems.forEach((bi) => {
    if (CustomerAccessService.isPendingAllocationOwner(bi) && bi.batch?.booker) {
      assignmentMap.set(bi.customerId, {
        id: bi.batch.booker.id,
        displayName: `${bi.batch.booker.displayName} (Chờ xác nhận)`,
        username: bi.batch.booker.username,
        assignedAt: bi.createdAt ? bi.createdAt.toISOString() : null,
        status: bi.status,
      });
    }
  });

  const bookingMap = new Map();
  latestBookings.forEach((b) => {
    bookingMap.set(Number(b.userId), {
      bookingDate: b.bookingDate,
      orderState: b.orderState,
    });
  });

  const callbackMap = new Map();
  latestCallbacks.forEach((c) => {
    if (!callbackMap.has(c.legacyUserId)) {
      callbackMap.set(c.legacyUserId, c.callbackDate);
    }
  });
  latestDailyPlans.forEach((p) => {
    if (!callbackMap.has(p.legacyUserId)) {
      callbackMap.set(p.legacyUserId, p.plannedDate);
    }
  });

  const latestCallMap = new Map();
  latestCalls.forEach((c) => {
    if (!latestCallMap.has(c.legacyUserId)) {
      latestCallMap.set(c.legacyUserId, {
        createdAt: c.createdAt.toISOString(),
        durationSec: c.durationSec,
        callResult: c.callResult,
        note: c.note,
      });
    }
  });

  const newComboMap =
    customerIds.length > 0 && bucket === 'NEW_LOCA'
      ? await fetchNewLocaComboMap(fastify, customerIds, dateFrom, dateTo)
      : new Map<number, SafeAny>();

  // Fetch latest touchpoints for the returned customers
  const touchpointsList =
    customerIds.length > 0
      ? await fastify.prisma.crm.crmLocaTouchpoint.findMany({
          where: { legacyUserId: { in: customerIds } },
          orderBy: { updatedAt: 'desc' },
        })
      : [];

  const touchpointsMap = new Map<number, Record<string, SafeAny>>();
  touchpointsList.forEach((tp) => {
    const uid = tp.legacyUserId;
    if (!touchpointsMap.has(uid)) {
      touchpointsMap.set(uid, {});
    }
    const userTps = touchpointsMap.get(uid)!;
    if (!userTps[tp.touchpointKey]) {
      userTps[tp.touchpointKey] = {
        isChecked: tp.isChecked,
        status: tp.status || (tp.isChecked ? 'SUCCESS' : null),
        checkedAt: tp.checkedAt ? tp.checkedAt.toISOString() : null,
        checkedByStaffId: tp.checkedByStaffId,
        checkedByStaffName: tp.checkedByStaffName,
        note: tp.note,
      };
    }
  });

  // Map raw SQL outputs to clean Customer interface types
  const customers = dataResult.map((row: SafeAny) => {
    const assigned = assignmentMap.get(Number(row.id)) || null;
    const booking = bookingMap.get(Number(row.id)) || null;
    const callbackDateVal = callbackMap.get(Number(row.id)) || null;
    const lastCallVal = latestCallMap.get(Number(row.id)) || null;
    const newComboDetails = newComboMap.get(Number(row.id)) || null;
    const userTouchpoints = touchpointsMap.get(Number(row.id)) || {};

    const historyInfo = historyMap.get(Number(row.id)) || null;
    const lastAllocation = historyInfo
      ? {
          assignedAt: historyInfo.assignedAt.toISOString(),
          staffName: historyInfo.staffName,
        }
      : assigned
        ? {
            assignedAt: assigned.assignedAt,
            staffName: assigned.displayName,
          }
        : null;

    const isForeignVal = resolveIsForeign(row.isForeign, row.isForeignOverridden, row.phone);

    return {
      id: Number(row.id),
      name: row.name,
      phone: shouldMaskCustomerPhone(userRole) ? maskPhoneNumber(row.phone) : row.phone,
      email: row.email,
      gender: row.gender,
      dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
      age: row.age !== null && row.age !== undefined ? Number(row.age) : null,
      lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
      daysSinceLastVisit:
        row.daysSinceLastVisit !== null && row.daysSinceLastVisit !== undefined ? Number(row.daysSinceLastVisit) : null,
      totalSpent: Math.round(Number(row.totalSpent || 0)),
      totalVisits: Number(row.totalVisits || 0),
      totalPromotionsUsed: Number(row.totalPromotionsUsed || 0),
      totalReferrals: Number(row.totalReferrals || 0),
      isForeign: isForeignVal,
      isForeignOverridden: Boolean(row.isForeignOverridden),
      bucket: row.bucket as BucketType,
      comboBalance:
        row.bucket !== 'SINGLE'
          ? {
              normalCount: Number(row.normalCount || 0),
              retainCount: Number(row.retainCount || 0),
              expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null,
            }
          : null,
      elsaReservation: row.elsaReservation || null,
      assignedStaff: assigned,
      // `assignedAt` is a current-owner field. Historical allocation evidence stays
      // isolated in `lastAllocation`, so an unassigned customer never looks owned.
      assignedAt: assigned?.assignedAt || null,
      lastAllocation,
      avatar: row.avatar,
      lastBookingState: booking ? booking.orderState : null,
      lastBookingDate:
        booking && booking.bookingDate ? new Date(booking.bookingDate).toISOString().replace('Z', '+07:00') : null,
      callbackDate: callbackDateVal ? new Date(callbackDateVal).toISOString().split('T')[0] : null,
      lastCall: lastCallVal,
      touchpoints: userTouchpoints,
      newComboDetails,
    };
  });

  return {
    data: customers,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  };
}
