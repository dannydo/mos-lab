import type { FastifyInstance } from 'fastify';
import type { SafeAny, TelesaleTargetConfigDto } from '@mos-lab/shared';
import { ComboRecognitionService } from '../../../customers/services/combo-recognition.service.js';
import { BkLeaderboardService } from '../bk-leaderboard.service.js';

export type StaffCandidateSummary = {
  legacyStaffId: number;
  name: string;
  doneTarget: number;
  avatarUrl?: string | null;
};

export async function fetchOverviewBaseData(
  fastify: FastifyInstance,
  params: {
    startDateStr: string;
    endDateStr: string;
    startDateTimeStr: string;
    endDateTimeStr: string;
    todayStr: string;
    combinedStaffIds: number[];
    candidateIdsStr: string;
    options?: { skipCache?: boolean };
  }
) {
  const { startDateStr, endDateStr, startDateTimeStr, endDateTimeStr, todayStr, combinedStaffIds, candidateIdsStr } =
    params;

  // Phase 2 Optimization: UNION range seek on actual_booking_date_start / booking_date_start (19ms vs 123ms, 95% scan reduction)
  const monthOrdersSql = `
      SELECT 
        o.id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.date_created as dateCreated,
        o.booking_date_start as bookingDateStart,
        ro.actual_booking_date_start as actualBookingDateStart,
        o.user_id as customerId,
        COALESCE(o.total_price, 0) as totalPrice
        /* origin: prev_o.booking_date_start daysSinceLastVisit */
      FROM report_order ro
      JOIN \`order\` o ON o.id = ro.order_id
      WHERE ro.actual_booking_date_start >= '${startDateTimeStr}'
        AND ro.actual_booking_date_start <= '${endDateTimeStr}'
        AND o.created_staff_id IN (${candidateIdsStr})
        AND (o.order_state IN ('Completed', 'CheckOut') OR o.total_price > 0)
      UNION ALL
      SELECT 
        o.id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.date_created as dateCreated,
        o.booking_date_start as bookingDateStart,
        NULL as actualBookingDateStart,
        o.user_id as customerId,
        COALESCE(o.total_price, 0) as totalPrice
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE o.booking_date_start >= '${startDateTimeStr}'
        AND o.booking_date_start <= '${endDateTimeStr}'
        AND o.created_staff_id IN (${candidateIdsStr})
        AND ro.actual_booking_date_start IS NULL
        AND (o.order_state IN ('Completed', 'CheckOut') OR o.total_price > 0)
    `;

  // Phase 2 Optimization: Filter matched completed orders first, then STRAIGHT_JOIN with order_service_combo (17ms vs 170ms)
  const comboSoldSql = `
      SELECT 
        matched_orders.created_staff_id as bookerId,
        COALESCE(SUM(osc.quantity), 0) as comboSoldQty,
        COALESCE(SUM(osc.total_price), 0) as comboSoldRevenue
      FROM (
        SELECT ro.order_id, o.created_staff_id
        FROM report_order ro
        JOIN \`order\` o ON o.id = ro.order_id
        WHERE ro.actual_booking_date_start >= '${startDateTimeStr}'
          AND ro.actual_booking_date_start <= '${endDateTimeStr}'
          AND o.created_staff_id IN (${candidateIdsStr})
          AND o.order_state = 'Completed'
        UNION
        SELECT o.id as order_id, o.created_staff_id
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE (
          (o.booking_date_start >= '${startDateTimeStr}' AND o.booking_date_start <= '${endDateTimeStr}')
          OR (o.booking_date_start IS NULL AND o.date_created >= '${startDateTimeStr}' AND o.date_created <= '${endDateTimeStr}')
        )
          AND o.created_staff_id IN (${candidateIdsStr})
          AND o.order_state = 'Completed'
          AND ro.actual_booking_date_start IS NULL
      ) matched_orders
      JOIN \`order_service_combo\` osc ON osc.order_id = matched_orders.order_id
      GROUP BY matched_orders.created_staff_id
    `;

  const dailyBookGroupSql = `
      SELECT 
        DATE_FORMAT(o.date_created, '%Y-%m-%d') as bookDate,
        COUNT(DISTINCT o.id) as totalBookings
      FROM \`order\` o
      WHERE o.created_staff_id IN (${candidateIdsStr})
        AND o.date_created >= '${startDateTimeStr}'
        AND o.date_created <= '${endDateTimeStr}'
      GROUP BY DATE_FORMAT(o.date_created, '%Y-%m-%d')
    `;

  // 1. Fetch Month, Today metrics, and month orders in parallel (Single Source of Truth)
  const [
    _monthBookingRes,
    todayBookingRes,
    monthDoneRes,
    _todayDoneRes,
    monthRevenueRes,
    teamMonthIncomingActual,
    rawMonthOrders,
    rawComboSoldRows,
    rawDailyBookRows,
  ] = await Promise.all([
    BkLeaderboardService.getBookingLeaderboard(fastify, {
      dateFrom: startDateStr,
      dateTo: endDateStr,
      targetStaffIds: combinedStaffIds,
      skipCache: params.options?.skipCache,
    }),
    BkLeaderboardService.getBookingLeaderboard(fastify, {
      dateFrom: todayStr,
      dateTo: todayStr,
      targetStaffIds: combinedStaffIds,
      skipCache: params.options?.skipCache,
    }),
    BkLeaderboardService.getDoneLeaderboard(fastify, {
      dateFrom: startDateStr,
      dateTo: endDateStr,
      targetStaffIds: combinedStaffIds,
      skipCache: params.options?.skipCache,
    }),
    BkLeaderboardService.getDoneLeaderboard(fastify, {
      dateFrom: todayStr,
      dateTo: todayStr,
      targetStaffIds: combinedStaffIds,
      skipCache: params.options?.skipCache,
    }),
    BkLeaderboardService.getRevenueLeaderboard(fastify, {
      dateFrom: startDateStr,
      dateTo: endDateStr,
      targetStaffIds: combinedStaffIds,
      skipCache: params.options?.skipCache,
    }),
    BkLeaderboardService.getIncomingBookingsCount(fastify, {
      dateFrom: startDateStr,
      dateTo: endDateStr,
      targetStaffIds: combinedStaffIds,
    }),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(monthOrdersSql).catch(() => []),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboSoldSql).catch(() => []),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(dailyBookGroupSql).catch(() => []),
  ]);

  const dailyBookMap = new Map<string, number>();
  for (const r of rawDailyBookRows || []) {
    if (r && r.bookDate) {
      dailyBookMap.set(String(r.bookDate), Number(r.totalBookings || 0));
    }
  }

  const dailyCheckinMap = new Map<string, number>();
  // Primary: aggregate checkin dates directly from monthOrders in memory (0ms latency, zero DB scan)
  if (rawMonthOrders && rawMonthOrders.length > 0) {
    for (const o of rawMonthOrders) {
      const rawDate = o.actualBookingDateStart || o.bookingDateStart || o.dateCreated;
      if (rawDate) {
        const d = typeof rawDate === 'string' ? new Date(rawDate) : (rawDate as Date);
        if (!isNaN(d.getTime())) {
          const dStr = new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
          dailyCheckinMap.set(dStr, (dailyCheckinMap.get(dStr) || 0) + 1);
        }
      }
    }
  }

  const comboSoldMap = new Map<number, number>();
  const comboRevenueMap = new Map<number, number>();
  for (const r of rawComboSoldRows || []) {
    const bid = Number(r.bookerId);
    comboSoldMap.set(bid, Number(r.comboSoldQty || 0));
    comboRevenueMap.set(bid, Math.round(Number(r.comboSoldRevenue || 0)));
  }
  const teamMonthComboSoldActual = Array.from(comboSoldMap.values()).reduce((sum, v) => sum + v, 0);
  const teamMonthComboRevenueActual = Array.from(comboRevenueMap.values()).reduce((sum, v) => sum + v, 0);

  const monthOrders: SafeAny[] = rawMonthOrders || [];
  // Decoupled batch resolution for isComboLive with in-memory LRU cache
  const monthOrderIdsToResolve = monthOrders
    .filter((o) => o.isComboLive === undefined)
    .map((o) => Number(o.id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (monthOrderIdsToResolve.length > 0) {
    const monthComboLiveMap = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(
      fastify,
      monthOrderIdsToResolve
    );
    for (const o of monthOrders) {
      if (o.isComboLive === undefined) {
        o.isComboLive = monthComboLiveMap.get(Number(o.id)) ? 1 : 0;
      }
    }
  }
  const teamMonthComboLiveDoneActual = monthOrders.filter((o) => Number(o.isComboLive) === 1).length;
  const rawTotalMonthDone = monthDoneRes.summary.totalDone;
  // KPI is STRICTLY Single Done (Done Khách Lẻ). Combo Live is kept completely separate!
  const teamMonthSingleDoneActual = Math.max(0, rawTotalMonthDone - teamMonthComboLiveDoneActual);
  const teamMonthSingleToComboRate =
    teamMonthSingleDoneActual > 0
      ? Number(((teamMonthComboSoldActual / teamMonthSingleDoneActual) * 100).toFixed(1))
      : 0;
  const teamDailyBookActual = todayBookingRes.summary.totalBookings;

  return {
    todayBookingRes,
    monthDoneRes,
    monthRevenueRes,
    teamMonthIncomingActual,
    monthOrders,
    dailyBookMap,
    dailyCheckinMap,
    comboSoldMap,
    comboRevenueMap,
    teamMonthComboLiveDoneActual,
    teamMonthSingleDoneActual,
    teamMonthComboSoldActual,
    teamMonthComboRevenueActual,
    teamMonthSingleToComboRate,
    teamDailyBookActual,
  };
}

export async function fetchWorkingShiftsAndStaffDirectory(
  fastify: FastifyInstance,
  config: TelesaleTargetConfigDto,
  params: {
    todayStr: string;
    targetStaffIds: number[];
    monthDoneLeaderboard: SafeAny[];
    todayBookingLeaderboard: SafeAny[];
  }
) {
  const { todayStr, targetStaffIds, monthDoneLeaderboard, todayBookingLeaderboard } = params;

  // 2. Query today's working shift for target staff to evaluate isWorkingToday (MOS-BUG-77)
  const workingShiftMap = new Map<number, boolean>();
  const shiftDetailMap = new Map<number, { isWorking: boolean; shiftLabel: string }>();
  let shiftRows: SafeAny[] = [];
  try {
    const shiftStaffIds = targetStaffIds;
    if (shiftStaffIds.length > 0) {
      shiftRows = await fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id, working_day_count, TIME(start_time) as startTime, TIME(end_time) as endTime FROM staff_working_shift WHERE date = ? AND user_id IN (${shiftStaffIds.join(',')})`,
          todayStr
        )
        .catch(() => []);

      for (const r of shiftRows) {
        const uid = Number(r.user_id);
        const dayCount = Number(r.working_day_count ?? 1);
        const isWorking = dayCount > 0;
        workingShiftMap.set(uid, isWorking);

        let shiftLabel = '☀️ Trực ca';
        const startTime = r.startTime ? String(r.startTime) : '';
        const endTime = r.endTime ? String(r.endTime) : '';
        if (startTime && endTime) {
          const startHour = parseInt(startTime.split(':')[0], 10);
          const endHour = parseInt(endTime.split(':')[0], 10);
          if (startHour < 12 && endHour <= 13) {
            shiftLabel = '☀️ Sáng';
          } else if (startHour >= 12) {
            shiftLabel = '🌙 Chiều';
          } else {
            shiftLabel = '☀️ Trực ca';
          }
        }
        shiftDetailMap.set(uid, { isWorking, shiftLabel });
      }
    }
  } catch (err) {
    fastify.log.warn(`Failed to query staff_working_shift: ${err}`);
  }

  // 3. Dynamic Telesales Staff Resolution & Avatar Lookup (MOS-FEAT-83)
  const allStaffCandidates: StaffCandidateSummary[] = config.staffTargets.map((st) => ({
    legacyStaffId: Number(st.legacyStaffId),
    name: st.name,
    doneTarget: Number(st.doneTarget),
    avatarUrl: st.avatarUrl || null,
  }));

  const staffAvatarMap = new Map<number, string | null>();
  const staffNameMap = new Map<number, string>();

  // Seed maps with config names
  for (const st of config.staffTargets) {
    staffNameMap.set(st.legacyStaffId, st.name);
    if (st.avatarUrl) staffAvatarMap.set(st.legacyStaffId, st.avatarUrl);
  }

  // Seed maps with BK Leaderboard names & avatars
  for (const entry of monthDoneLeaderboard) {
    if (entry.displayName && !staffNameMap.get(entry.bookerId)) {
      staffNameMap.set(entry.bookerId, entry.displayName);
    }
    if (entry.avatar && !staffAvatarMap.get(entry.bookerId)) {
      staffAvatarMap.set(entry.bookerId, entry.avatar);
    }
  }
  for (const entry of todayBookingLeaderboard) {
    if (entry.displayName && !staffNameMap.get(entry.bookerId)) {
      staffNameMap.set(entry.bookerId, entry.displayName);
    }
    if (entry.avatar && !staffAvatarMap.get(entry.bookerId)) {
      staffAvatarMap.set(entry.bookerId, entry.avatar);
    }
  }

  try {
    if (targetStaffIds.length > 0) {
      const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          legacyStaffId: { in: targetStaffIds },
        },
        select: {
          legacyStaffId: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      for (const s of crmStaffList) {
        const legacyId = Number(s.legacyStaffId);
        if (legacyId && !isNaN(legacyId)) {
          if (s.avatarUrl) staffAvatarMap.set(legacyId, s.avatarUrl);
          if (s.displayName) staffNameMap.set(legacyId, s.displayName);
        }
      }
    }
  } catch (err) {
    fastify.log.warn(`Failed to resolve CRM staff avatars for telesale target: ${err}`);
  }

  // Query legacy user_profile for any missing avatars or names
  const allCandidateIds = allStaffCandidates.map((c) => c.legacyStaffId);
  if (allCandidateIds.length > 0) {
    try {
      const legacyProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id, full_name, COALESCE(NULLIF(avatar, ''), NULLIF(avatar_internal, '')) as avatarUrl 
           FROM \`user_profile\` 
           WHERE user_id IN (${allCandidateIds.join(',')})`
      );
      for (const p of legacyProfiles) {
        const uid = Number(p.user_id);
        if (!staffAvatarMap.get(uid) && p.avatarUrl) {
          staffAvatarMap.set(uid, p.avatarUrl);
        }
        if (!staffNameMap.get(uid) && p.full_name) {
          staffNameMap.set(uid, p.full_name);
        }
      }
    } catch (err) {
      fastify.log.warn(`Failed to query legacy user_profile: ${err}`);
    }
  }

  return {
    workingShiftMap,
    shiftDetailMap,
    shiftRows,
    allStaffCandidates,
    staffAvatarMap,
    staffNameMap,
  };
}

export async function fetchTodayOrdersWithComboState(
  fastify: FastifyInstance,
  params: {
    todayStartStr: string;
    todayEndStr: string;
    candidateIdsStr: string;
  }
) {
  const { todayStartStr, todayEndStr, candidateIdsStr } = params;

  // Query today's completed, booked, and checked-in orders with isComboLive recognition
  const [todayBookOrders, todayDoneOrders, todayCheckinOrders] = await Promise.all([
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
        SELECT 
          o.id,
          o.created_staff_id as bookerId,
          o.user_id as customerId,
          o.order_state as orderState,
          DATE_FORMAT(o.date_created, '%Y-%m-%dT%H:%i:%s+07:00') as dateCreated,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as bookingDateStart,
          o.booking_note as bookingNote,
          o.promotion_id as promotionId,
          o.is_new as isNew
          /* origin: buildComboLiveAtBookingSql */
        FROM \`order\` o
        WHERE o.date_created >= '${todayStartStr}' 
          AND o.date_created <= '${todayEndStr}'
          AND o.created_staff_id IN (${candidateIdsStr})
      `
      )
      .catch(() => []),
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
        SELECT 
          o.id as id,
          o.created_staff_id as bookerId,
          o.total_price as totalPrice,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as bookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_end, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateEnd,
          DATE_FORMAT(o.date_updated, '%Y-%m-%dT%H:%i:%s+07:00') as dateUpdated,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_end, o.date_updated, ro.actual_booking_date_start, o.date_created), '%Y-%m-%dT%H:%i:%s+07:00') as doneDate
          /* origin: buildComboLiveAtBookingSql */
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE o.created_staff_id IN (${candidateIdsStr})
          AND (
            (ro.actual_booking_date_start >= '${todayStartStr}' AND ro.actual_booking_date_start <= '${todayEndStr}')
            OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${todayStartStr}' AND o.booking_date_start <= '${todayEndStr}')
          )
          AND o.order_state = 'Completed'
      `
      )
      .catch(() => []),
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
        SELECT 
          o.id as id,
          o.created_staff_id as bookerId,
          o.user_id as customerId,
          o.order_state as orderState,
          o.total_price as totalPrice,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as bookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_end, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateEnd,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created), '%Y-%m-%dT%H:%i:%s+07:00') as checkinDate
          /* origin: buildComboLiveAtBookingSql */
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE o.created_staff_id IN (${candidateIdsStr})
          AND (
            (ro.actual_booking_date_start >= '${todayStartStr}' AND ro.actual_booking_date_start <= '${todayEndStr}')
            OR (
              ro.actual_booking_date_start IS NULL 
              AND (
                o.order_state NOT IN ('New', 'Confirmed', 'Missed', 'Cancelled')
                OR EXISTS (SELECT 1 FROM order_service os WHERE os.order_id = o.id AND os.check_in_staff_id IS NOT NULL)
              )
              AND (
                (o.booking_date_start >= '${todayStartStr}' AND o.booking_date_start <= '${todayEndStr}')
                OR (o.booking_date_start IS NULL AND o.date_created >= '${todayStartStr}' AND o.date_created <= '${todayEndStr}')
              )
            )
          )
          AND o.order_state NOT IN ('Cancelled', 'Missed')
      `
      )
      .catch(() => []),
  ]);

  // Batch resolve isComboLive for today's orders with in-memory LRU caching
  const todayOrderIdsToResolve = [
    ...todayBookOrders.filter((o) => o.isComboLive === undefined).map((o) => Number(o.id)),
    ...todayDoneOrders.filter((o) => o.isComboLive === undefined).map((o) => Number(o.id)),
    ...todayCheckinOrders.filter((o) => o.isComboLive === undefined).map((o) => Number(o.id)),
  ].filter((id) => Number.isInteger(id) && id > 0);

  if (todayOrderIdsToResolve.length > 0) {
    const todayComboLiveMap = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(
      fastify,
      todayOrderIdsToResolve
    );
    for (const o of todayBookOrders) {
      if (o.isComboLive === undefined) {
        o.isComboLive = todayComboLiveMap.get(Number(o.id)) ? 1 : 0;
      }
    }
    for (const o of todayDoneOrders) {
      if (o.isComboLive === undefined) {
        o.isComboLive = todayComboLiveMap.get(Number(o.id)) ? 1 : 0;
      }
    }
    for (const o of todayCheckinOrders) {
      if (o.isComboLive === undefined) {
        o.isComboLive = todayComboLiveMap.get(Number(o.id)) ? 1 : 0;
      }
    }
  }

  const teamDailyComboLiveDoneActual = todayDoneOrders.filter((o) => Number(o.isComboLive || 0) === 1).length;
  const teamDailySingleDoneActual = todayDoneOrders.filter((o) => Number(o.isComboLive || 0) === 0).length;
  const teamDailyComboLiveCheckinActual = todayCheckinOrders.filter((o) => Number(o.isComboLive || 0) === 1).length;
  const teamDailySingleCheckinActual = todayCheckinOrders.filter((o) => Number(o.isComboLive || 0) === 0).length;
  const teamDailyComboLiveBookActual = todayBookOrders.filter((o) => Number(o.isComboLive || 0) === 1).length;

  return {
    todayBookOrders,
    todayDoneOrders,
    todayCheckinOrders,
    teamDailyComboLiveDoneActual,
    teamDailySingleDoneActual,
    teamDailyComboLiveCheckinActual,
    teamDailySingleCheckinActual,
    teamDailyComboLiveBookActual,
  };
}
