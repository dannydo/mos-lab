import { FastifyInstance } from 'fastify';
import { SafeAny, SlotBookingInfo, SlotMatrixMap } from '@mos-lab/shared';
import { TeamService } from '../../../teams/team.service.js';

export interface RosterEntry {
  userId: number;
  staff_name: string;
  shift_start: string;
  shift_end: string;
}

export interface SlotOrderRow {
  id: number | string;
  user_id: number | string;
  total_price?: number | string | null;
  booking_note?: string | null;
  order_state: string;
  start_str?: string | null;
  duration?: number | string | null;
  assigned_staff_id?: number | string | null;
}

export const resolveBookingSlotsStoreId = (queryStoreId?: string | number, storeName?: string): number => {
  if (queryStoreId) {
    return Number(queryStoreId);
  }
  const storeLower = String(storeName || '')
    .trim()
    .toLowerCase();
  if (storeLower.includes('estella') || storeLower === 'ep') {
    return 16;
  }
  if (storeLower.includes('phan xích long') || storeLower.includes('pxl')) {
    return 2;
  }
  return 6;
};

export const fetchCvRosterForDate = async (
  fastify: FastifyInstance,
  params: { date: string; storeId: number; technicianId?: string }
): Promise<RosterEntry[] | null> => {
  const { date, storeId, technicianId } = params;

  // 1. Fetch active CV pool from TeamService / ACTIVE_CV_STAFF_CONFIG
  const cvStaffIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');
  if (cvStaffIds.length === 0) {
    return null;
  }

  // 2. Fetch CV profiles and store mappings
  const cvProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT user_id as id, full_name as name, client_store_id
     FROM user_profile
     WHERE user_id IN (${cvStaffIds.join(',')}) AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0`
  );

  const dayOffStores = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT user_id, client_store_id
     FROM staff_day_off_schedule
     WHERE is_disabled = 0 AND user_id IN (${cvStaffIds.join(',')})
     GROUP BY user_id`
  );

  const cvProfileStoreMap = new Map<number, number>();
  cvProfiles.forEach((p) => {
    if (p.client_store_id) cvProfileStoreMap.set(Number(p.id), Number(p.client_store_id));
  });

  // Filter active CVs belonging to this store
  let activeStoreCvIds = cvStaffIds.filter((uid) => {
    const schedStore = dayOffStores.find((s) => Number(s.user_id) === uid)?.client_store_id;
    const finalStoreId = schedStore ? Number(schedStore) : cvProfileStoreMap.get(uid) || 6;
    return finalStoreId === storeId;
  });

  if (technicianId) {
    const techIdNum = parseInt(technicianId, 10);
    activeStoreCvIds = activeStoreCvIds.filter((uid) => uid === techIdNum);
  }

  // 3. Weekly Offs & Date Leave Requests
  const dayOfWeek = new Date(date).getDay();
  const weekday = dayOfWeek === 0 ? 7 : dayOfWeek;

  // Check weekly recurring day-offs from staff_day_off_schedule
  const weeklyOffs =
    activeStoreCvIds.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id FROM staff_day_off_schedule
         WHERE is_disabled = 0 AND weekday = ? AND user_id IN (${activeStoreCvIds.join(',')})`,
          weekday
        )
      : [];
  const weeklyOffUserIds = new Set(weeklyOffs.map((w) => Number(w.user_id)));

  // Check date-specific approved leave from staff_day_off
  const dateOffs =
    activeStoreCvIds.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT from_user_id FROM staff_day_off
         WHERE from_date <= ? AND ? <= COALESCE(to_date, from_date)
           AND request_state = 'Approved'
           AND from_user_id IN (${activeStoreCvIds.join(',')})`,
          date,
          date
        )
      : [];
  const leaveOffUserIds = new Set(dateOffs.map((l) => Number(l.from_user_id)));

  const workingCvIds = activeStoreCvIds.filter((uid) => !weeklyOffUserIds.has(uid) && !leaveOffUserIds.has(uid));

  // 4. Instantiated Shifts vs Schedule Templates
  const instantiatedShifts =
    workingCvIds.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id, CAST(start_time AS CHAR) as start_time_str, CAST(end_time AS CHAR) as end_time_str
         FROM staff_working_shift
         WHERE date = ? AND user_id IN (${workingCvIds.join(',')})`,
          date
        )
      : [];

  const shiftScheduleRows =
    workingCvIds.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id, type, type_value, CAST(start_time AS CHAR) as start_time_str, CAST(end_time AS CHAR) as end_time_str
         FROM staff_working_shift_schedule
         WHERE is_disabled = 0 AND user_id IN (${workingCvIds.join(',')})
         ORDER BY user_id, type DESC`
        )
      : [];

  return workingCvIds.map((uid) => {
    const p = cvProfiles.find((cp) => Number(cp.id) === uid);
    const inst = instantiatedShifts.find((s) => Number(s.user_id) === uid);

    let shiftStart = '09:00';
    let shiftEnd = '20:00';

    if (inst?.start_time_str && inst?.end_time_str) {
      shiftStart = inst.start_time_str.split(' ')[1]?.slice(0, 5) || inst.start_time_str.slice(0, 5);
      shiftEnd = inst.end_time_str.split(' ')[1]?.slice(0, 5) || inst.end_time_str.slice(0, 5);
    } else {
      const userSchedules = shiftScheduleRows.filter((r) => Number(r.user_id) === uid);
      const matched =
        userSchedules.find((r) => String(r.type) === 'Weekday' && String(r.type_value) === String(weekday)) ||
        userSchedules.find((r) => String(r.type) === 'Day' && String(r.type_value) === 'All');

      if (matched?.start_time_str && matched?.end_time_str) {
        shiftStart = matched.start_time_str.split(' ')[1]?.slice(0, 5) || matched.start_time_str.slice(0, 5);
        shiftEnd = matched.end_time_str.split(' ')[1]?.slice(0, 5) || matched.end_time_str.slice(0, 5);
      }
    }

    return {
      userId: uid,
      staff_name: p?.name || `CV #${uid}`,
      shift_start: shiftStart,
      shift_end: shiftEnd,
    };
  });
};

export const fetchActiveOrdersForDate = async (
  fastify: FastifyInstance,
  params: { date: string; storeId: number; technicianId?: string }
): Promise<SlotOrderRow[]> => {
  const { date, storeId, technicianId } = params;

  let orderQuery = `
    SELECT 
      o.id,
      o.user_id,
      o.total_price,
      o.booking_note,
      o.order_state,
      CAST(o.booking_date_start AS CHAR) as start_str,
      COALESCE(o.booking_duration_minute, 90) as duration,
      COALESCE(
        (
          SELECT obdc.assigned_staff_id 
          FROM order_booking_date_change obdc 
          WHERE obdc.order_id = o.id AND obdc.assigned_staff_id IS NOT NULL
          ORDER BY obdc.id DESC 
          LIMIT 1
        ),
        (
          SELECT os.assigned_staff_id
          FROM order_service os
          WHERE os.order_id = o.id AND os.assigned_staff_id IS NOT NULL
          LIMIT 1
        )
      ) as assigned_staff_id
    FROM \`order\` o
    WHERE o.client_store_id = ?
      AND o.booking_date_start >= ?
      AND o.booking_date_start <= ?
      AND o.order_state != 'Cancelled'
  `;
  const orderParams: SafeAny[] = [storeId, `${date} 00:00:00`, `${date} 23:59:59`];

  if (technicianId) {
    orderQuery = `
      SELECT * FROM (${orderQuery}) active_orders
      WHERE active_orders.assigned_staff_id = ?
    `;
    orderParams.push(parseInt(technicianId, 10));
  }

  return fastify.prisma.legacy.$queryRawUnsafe<SlotOrderRow[]>(orderQuery, ...orderParams);
};

export const buildBookingSlotMatrix = (
  roster: RosterEntry[],
  orders: SlotOrderRow[],
  customerBookingInfoMap: Map<number, SlotBookingInfo>
): SlotMatrixMap => {
  // Generate 15-minute slot matrix (09:00 to 20:00)
  const matrix: SlotMatrixMap = {};
  let currentMin = 9 * 60; // 09:00
  const endMin = 20 * 60 + 15; // 20:15

  while (currentMin < endMin) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // Active roster count at this slot
    const activeRoster = roster.filter((r) => {
      const [sh, sm] = r.shift_start.split(':').map(Number);
      const [eh, em] = r.shift_end.split(':').map(Number);
      const rStart = (sh || 9) * 60 + (sm || 0);
      const rEnd = (eh || 20) * 60 + (em || 0);
      return rStart <= currentMin && currentMin < rEnd;
    });

    // Active appointments overlapping this slot
    const activeOrders = orders.filter((o) => {
      const timePart = o.start_str ? o.start_str.split(' ')[1] : '09:00';
      const [oh, om] = (timePart || '09:00').split(':').map(Number);
      const oStart = (oh || 0) * 60 + (om || 0);
      const dur = Number(o.duration || 90);
      const oEnd = oStart + dur;
      return oStart <= currentMin && currentMin < oEnd;
    });

    const rosterCount = activeRoster.length;
    const bookedCount = activeOrders.length;
    const available = rosterCount - bookedCount;

    const slotBookings = activeOrders
      .map((o) => customerBookingInfoMap.get(Number(o.id)))
      .filter(Boolean) as SlotBookingInfo[];

    matrix[timeStr] = {
      available,
      roster: rosterCount,
      booked: bookedCount,
      ...(slotBookings.length > 0 ? { bookings: slotBookings } : {}),
    };

    currentMin += 15;
  }

  return matrix;
};
