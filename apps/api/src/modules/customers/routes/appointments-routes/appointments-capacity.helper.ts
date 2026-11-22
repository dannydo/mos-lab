import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { TeamService } from '../../../teams/team.service.js';
import { parseRequestedStoreIds } from './appointments-scope.helper.js';
import {
  DailyCapacityDto,
  DateOffInfo,
  LegacyQueryRows,
  OffStaffItemDto,
  StaffSpeedMetrics,
} from './appointments.types.js';

interface CvStaffMetadata {
  cvNameMap: Map<number, string>;
  cvAvatarMap: Map<number, string | null>;
  cvProfileStoreMap: Map<number, number>;
  dayOffStores: LegacyQueryRows;
  cvStoreMap: Map<number, { name: string; code: string }>;
  shiftsByCvId: Map<number, LegacyQueryRows>;
}

interface DailyCapacityActivityMaps {
  weeklyOffMap: Map<number, Set<number>>;
  dateOffMap: Map<string, Map<number, DateOffInfo>>;
  rangeBookedMap: Map<string, Map<number, number>>;
  rangeDoneMap: Map<string, Map<number, number>>;
  staffSpeedMap: Map<number, StaffSpeedMetrics>;
}

const WEEKDAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

async function loadCvStaffMetadata(fastify: FastifyInstance, cvStaffIds: number[]): Promise<CvStaffMetadata> {
  // Query fixed store & name for all active CV staff from DB master tables
  const cvProfiles = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(`
    SELECT user_id as id, full_name as name, client_store_id, avatar
    FROM user_profile
    WHERE user_id IN (${cvStaffIds.join(',')})
  `);
  const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
    where: { id: { in: cvStaffIds } },
    select: { id: true, displayName: true, avatarUrl: true },
  });

  const cvNameMap = new Map<number, string>();
  const cvProfileStoreMap = new Map<number, number>();
  const cvAvatarMap = new Map<number, string | null>();
  cvStaffIds.forEach((uid) => {
    const p = cvProfiles.find((lp: SafeAny) => Number(lp.id) === uid);
    const crmS = crmStaffList.find((cs) => Number(cs.id) === uid);
    const name = (p?.name ? String(p.name).trim() : null) || crmS?.displayName || `CV #${uid}`;
    const avatar = (p?.avatar ? String(p.avatar) : null) || crmS?.avatarUrl || null;
    cvNameMap.set(uid, name);
    if (p?.client_store_id) cvProfileStoreMap.set(uid, Number(p.client_store_id));
    cvAvatarMap.set(uid, avatar);
  });

  // Query fixed store from staff_day_off_schedule master
  const dayOffStores = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(`
    SELECT user_id, client_store_id
    FROM staff_day_off_schedule
    WHERE is_disabled = 0 AND user_id IN (${cvStaffIds.join(',')})
    GROUP BY user_id
  `);
  const effectiveStoreIds = Array.from(
    new Set(
      cvStaffIds.map((uid) => {
        const scheduleStore = dayOffStores.find((store) => Number(store.user_id) === uid)?.client_store_id;
        return scheduleStore ? Number(scheduleStore) : cvProfileStoreMap.get(uid) || 6;
      })
    )
  );
  const storeRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(`
    SELECT
      cs.id,
      UPPER(NULLIF(cs.client_store_key, '')) AS store_code,
      csl.client_store_name AS store_name
    FROM client_store cs
    LEFT JOIN client_store_language csl
      ON csl.client_store_id = cs.id AND csl.language_id = 1
    WHERE cs.id IN (${effectiveStoreIds.join(',')})
  `);
  const storeDetailsById = new Map<number, { name: string; code: string }>(
    storeRows.map((store: SafeAny) => [
      Number(store.id),
      {
        name: String(store.store_name || (Number(store.id) === 16 ? 'Estella Place' : 'Đề Thám')),
        code: String(store.store_code || (Number(store.id) === 16 ? 'EP' : 'DT')),
      },
    ])
  );
  const cvStoreMap = new Map<number, { name: string; code: string }>();
  cvStaffIds.forEach((uid) => {
    const schedStore = dayOffStores.find((s) => Number(s.user_id) === uid)?.client_store_id;
    const finalStoreId = schedStore ? Number(schedStore) : cvProfileStoreMap.get(uid) || 6;
    const store =
      storeDetailsById.get(finalStoreId) ||
      (finalStoreId === 16 ? { name: 'Estella Place', code: 'EP' } : { name: 'Đề Thám', code: 'DT' });
    cvStoreMap.set(uid, store);
  });

  // Query exact working shifts per staff from staff_working_shift_schedule
  const shiftRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(`
    SELECT user_id, start_time, end_time, type, type_value
    FROM staff_working_shift_schedule
    WHERE is_disabled = 0 AND user_id IN (${cvStaffIds.join(',')})
    ORDER BY user_id, type DESC
  `);
  const shiftsByCvId = new Map<number, LegacyQueryRows>();
  shiftRows.forEach((row) => {
    const userId = Number(row.user_id);
    const rows = shiftsByCvId.get(userId) || [];
    rows.push(row);
    shiftsByCvId.set(userId, rows);
  });

  return {
    cvNameMap,
    cvAvatarMap,
    cvProfileStoreMap,
    dayOffStores,
    cvStoreMap,
    shiftsByCvId,
  };
}

// A future roster is a planned shift, not a real attendance event.
// A weekday-specific shift takes precedence over the recurring "Day / All" shift.
function getScheduledShift(shiftsByCvId: Map<number, LegacyQueryRows>, userId: number, weekday: number): string | null {
  const shifts = shiftsByCvId.get(userId) || [];
  const shift =
    shifts.find((row) => String(row.type) === 'Weekday' && Number(row.type_value) === weekday) ||
    shifts.find((row) => String(row.type) === 'Day' && String(row.type_value) === 'All');
  if (!shift) return null;

  const startHour = shift.start_time ? new Date(shift.start_time).getUTCHours() : 9;
  const endHour = shift.end_time ? new Date(shift.end_time).getUTCHours() : 20;
  if (startHour <= 9 && endHour <= 18) return 'Ca Sáng';
  if (startHour >= 11 && endHour >= 20) return 'Ca Chiều';
  return 'Ca Full';
}

async function loadDailyCapacityActivityMaps(
  fastify: FastifyInstance,
  activeCvStaffIds: number[],
  cleanDateFrom: string,
  cleanDateTo: string
): Promise<DailyCapacityActivityMaps> {
  const weeklyOffMap = new Map<number, Set<number>>();
  const dateOffMap = new Map<string, Map<number, DateOffInfo>>();
  const rangeBookedMap = new Map<string, Map<number, number>>();
  const rangeDoneMap = new Map<string, Map<number, number>>();
  const staffSpeedMap = new Map<number, StaffSpeedMetrics>();

  if (activeCvStaffIds.length === 0) {
    return { weeklyOffMap, dateOffMap, rangeBookedMap, rangeDoneMap, staffSpeedMap };
  }

  const activeIdsSql = activeCvStaffIds.join(',');

  // Batch query 1: Weekly Offs for active CV staff
  const weeklyOffs = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(`
    SELECT user_id, weekday
    FROM staff_day_off_schedule
    WHERE is_disabled = 0 AND user_id IN (${activeIdsSql})
  `);
  weeklyOffs.forEach((r) => {
    const uid = Number(r.user_id);
    if (!weeklyOffMap.has(uid)) weeklyOffMap.set(uid, new Set());
    weeklyOffMap.get(uid)!.add(Number(r.weekday));
  });

  // Batch query 2: Approved leave requests for date range
  const dateOffs = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(
    `
    SELECT 
      from_user_id as user_id, 
      DATE_FORMAT(from_date, '%Y-%m-%d') as date_str, 
      note,
      attribute_option_id as attributeOptionId,
      DATEDIFF(from_date, date_created) as daysAhead
    FROM staff_day_off
    WHERE request_state = 'Approved'
      AND from_date >= ? AND from_date <= ?
      AND from_user_id IN (${activeIdsSql})
  `,
    cleanDateFrom,
    cleanDateTo
  );
  dateOffs.forEach((r) => {
    const dStr = String(r.date_str);
    if (!dateOffMap.has(dStr)) dateOffMap.set(dStr, new Map());

    const attrOptId = Number(r.attributeOptionId || 0);
    const daysAhead = Number(r.daysAhead || 0);
    const noteText = String(r.note || '').trim();

    const isWeeklyOffRecord = attrOptId === 110 || /hàng tuần|off tuần/i.test(noteText);
    const isUrgent =
      !isWeeklyOffRecord &&
      (attrOptId === 113 || // Bị bệnh / get-sick
        (daysAhead <= 0 && noteText.length > 0) || // Đăng ký đột xuất có ghi chú trong ngày
        /gấp|đột xuất|bệnh|ốm|khẩn|cấp cứu/i.test(noteText));

    const offType: DateOffInfo['type'] = isWeeklyOffRecord ? 'weekly_off' : isUrgent ? 'urgent_off' : 'planned_off';

    const defaultReason = isWeeklyOffRecord
      ? 'Nghỉ hàng tuần (OFF Tuần)'
      : isUrgent
        ? 'Xin nghỉ phép đột xuất (Gấp)'
        : 'Xin nghỉ phép (Đã duyệt)';

    const reason = noteText ? noteText : defaultReason;

    dateOffMap.get(dStr)!.set(Number(r.user_id), {
      reason,
      type: offType,
      daysAhead,
    });
  });

  // Batch query 3: Booked orders grouped by date and assigned_staff_id (using indexed o.booking_date_start)
  const bookedRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(
    `
    SELECT DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') as date_str,
           o.assigned_staff_id as user_id, COUNT(DISTINCT o.id) as cnt
    FROM \`order\` o
    WHERE o.booking_date_start >= ?
      AND o.booking_date_start <= ?
      AND o.assigned_staff_id IN (${activeIdsSql})
    GROUP BY date_str, o.assigned_staff_id
  `,
    cleanDateFrom,
    cleanDateTo
  );
  bookedRows.forEach((r) => {
    const dStr = String(r.date_str);
    if (!rangeBookedMap.has(dStr)) rangeBookedMap.set(dStr, new Map());
    rangeBookedMap.get(dStr)!.set(Number(r.user_id), Number(r.cnt || 0));
  });

  // Batch query 4: Completed orders served by staff grouped by date and staff_id (using indexed o.booking_date_start)
  const doneRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(
    `
    SELECT date_str, staff_id, COUNT(DISTINCT order_id) as cnt
    FROM (
      SELECT DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') as date_str,
             sb.user_id as staff_id, sb.order_id
      FROM staff_bonus sb
      JOIN \`order\` o ON sb.order_id = o.id
      WHERE o.booking_date_start >= ?
        AND o.booking_date_start <= ?
        AND o.order_state = 'Completed'
        AND sb.user_id IN (${activeIdsSql})

      UNION

      SELECT DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') as date_str,
             o.assigned_staff_id as staff_id, o.id as order_id
      FROM \`order\` o
      WHERE o.booking_date_start >= ?
        AND o.booking_date_start <= ?
        AND o.order_state = 'Completed'
        AND o.assigned_staff_id IN (${activeIdsSql})
    ) combined
    GROUP BY date_str, staff_id
  `,
    cleanDateFrom,
    cleanDateTo,
    cleanDateFrom,
    cleanDateTo
  );
  doneRows.forEach((r) => {
    const dStr = String(r.date_str);
    if (!rangeDoneMap.has(dStr)) rangeDoneMap.set(dStr, new Map());
    rangeDoneMap.get(dStr)!.set(Number(r.staff_id), Number(r.cnt || 0));
  });

  // Batch query 5: Average ACTUAL lash extension speed (phút/bộ) per staff member (using indexed o.booking_date_start)
  const speedRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(`
    SELECT
      os.assigned_staff_id as staff_id,
      s.service_type,
      ROUND(AVG(
        COALESCE(ros.preparation_minute, 0) +
        COALESCE(ros.pre_servicing_minute, 0) +
        COALESCE(ros.cleaning_minute, 0) +
        COALESCE(ros.servicing_minute, 0)
      )) as avg_min
    FROM order_service os
    JOIN \`order\` o ON os.order_id = o.id
    JOIN service s ON os.service_id = s.id
    JOIN report_order_service ros ON os.id = ros.order_service_id
    WHERE o.order_state = 'Completed'
      AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
      AND os.assigned_staff_id IN (${activeIdsSql})
      AND (COALESCE(ros.preparation_minute, 0) +
           COALESCE(ros.pre_servicing_minute, 0) +
           COALESCE(ros.cleaning_minute, 0) +
           COALESCE(ros.servicing_minute, 0)) > 15
      AND (COALESCE(ros.preparation_minute, 0) +
           COALESCE(ros.pre_servicing_minute, 0) +
           COALESCE(ros.cleaning_minute, 0) +
           COALESCE(ros.servicing_minute, 0)) < 200
      AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY os.assigned_staff_id, s.service_type
  `);

  speedRows.forEach((r) => {
    const sid = Number(r.staff_id);
    const stype = String(r.service_type || '');
    const avgVal = Math.round(Number(r.avg_min || 0));

    if (!staffSpeedMap.has(sid)) staffSpeedMap.set(sid, {});
    const item = staffSpeedMap.get(sid)!;

    if (stype === 'Normal') item.normalAvg = avgVal;
    else if (stype === 'Retain') item.retainAvg = avgVal;
    else if (stype === 'Removal' || stype === 'Fix') item.removalAvg = avgVal;
  });

  return { weeklyOffMap, dateOffMap, rangeBookedMap, rangeDoneMap, staffSpeedMap };
}

export async function computeDailyCapacities({
  fastify,
  cleanDateFrom,
  cleanDateTo,
  storeId,
}: {
  fastify: FastifyInstance;
  cleanDateFrom: string;
  cleanDateTo: string;
  storeId?: string;
}): Promise<Record<string, DailyCapacityDto>> {
  // Calculate accurate working CV capacities per day (excluding weekly OFFs and approved requested OFFs)
  const dailyCapacities: Record<string, DailyCapacityDto> = {};

  try {
    const cvStaffIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');
    if (cvStaffIds.length === 0) {
      return dailyCapacities;
    }

    const startDateObj = new Date(cleanDateFrom.split(' ')[0]);
    const endDateObj = new Date(cleanDateTo.split(' ')[0]);
    const cur = new Date(startDateObj);

    const { cvNameMap, cvAvatarMap, cvProfileStoreMap, dayOffStores, cvStoreMap, shiftsByCvId } =
      await loadCvStaffMetadata(fastify, cvStaffIds);

    // Filter CV staff pool by storeId if store filter is active
    let activeCvStaffIds = cvStaffIds;
    const requestedStoreIds = parseRequestedStoreIds(storeId);
    if (requestedStoreIds.length > 0) {
      activeCvStaffIds = cvStaffIds.filter((uid) => {
        const schedStore = dayOffStores.find((s) => Number(s.user_id) === uid)?.client_store_id;
        const finalStoreId = schedStore ? Number(schedStore) : cvProfileStoreMap.get(uid) || 6;
        return requestedStoreIds.includes(finalStoreId);
      });
    }

    const { weeklyOffMap, dateOffMap, rangeBookedMap, rangeDoneMap, staffSpeedMap } =
      await loadDailyCapacityActivityMaps(fastify, activeCvStaffIds, cleanDateFrom, cleanDateTo);

    // In-memory daily capacities assembly
    while (cur <= endDateObj) {
      const dateStr = cur.toISOString().split('T')[0];
      const jsDay = cur.getDay();
      const legacyWeekday = jsDay === 0 ? 7 : jsDay;

      if (activeCvStaffIds.length === 0) {
        dailyCapacities[dateStr] = {
          workingKtvCount: 0,
          maxCapacity: 0,
          workingStaffList: [],
          offStaffList: [],
        };
        cur.setDate(cur.getDate() + 1);
        continue;
      }

      const dayDateOffMap = dateOffMap.get(dateStr) || new Map<number, DateOffInfo>();
      const dayBookedMap = rangeBookedMap.get(dateStr) || new Map<number, number>();
      const dayDoneMap = rangeDoneMap.get(dateStr) || new Map<number, number>();
      const scheduledShiftByCvId = new Map(
        activeCvStaffIds.map((id) => [id, getScheduledShift(shiftsByCvId, id, legacyWeekday)])
      );

      const workingCvIds = activeCvStaffIds.filter((id) => {
        const userWeeklyOffs = weeklyOffMap.get(id);
        const isWeeklyOff = userWeeklyOffs ? userWeeklyOffs.has(legacyWeekday) : false;
        const isDateOff = dayDateOffMap.has(id);
        return !!scheduledShiftByCvId.get(id) && !isWeeklyOff && !isDateOff;
      });

      const workingStaffList = workingCvIds.map((id) => {
        const store = cvStoreMap.get(id) || { name: 'Đề Thám', code: 'DT' };
        return {
          id,
          name: cvNameMap.get(id) || `CV #${id}`,
          avatarUrl: cvAvatarMap.get(id) || null,
          branchName: store.name,
          branchCode: store.code,
          shift: scheduledShiftByCvId.get(id) || 'Ca Full',
          bookedCount: dayBookedMap.get(id) || 0,
          doneCount: dayDoneMap.get(id) || 0,
          avgDurationMinutes: staffSpeedMap.get(id),
        };
      });

      const offStaffList: OffStaffItemDto[] = [];
      activeCvStaffIds.forEach((id) => {
        const userWeeklyOffs = weeklyOffMap.get(id);
        const isWeeklyOff = userWeeklyOffs ? userWeeklyOffs.has(legacyWeekday) : false;
        if (dayDateOffMap.has(id)) {
          const offInfo = dayDateOffMap.get(id)!;
          const finalType =
            (isWeeklyOff || offInfo.type === 'weekly_off') && offInfo.type !== 'urgent_off'
              ? 'weekly_off'
              : offInfo.type;
          const finalReason =
            isWeeklyOff && offInfo.reason.includes('Gấp')
              ? `Nghỉ hàng tuần (${WEEKDAY_NAMES[legacyWeekday] || ''})`
              : offInfo.reason;

          offStaffList.push({
            id,
            name: cvNameMap.get(id) || `CV #${id}`,
            avatarUrl: cvAvatarMap.get(id) || null,
            branchName: cvStoreMap.get(id)?.name || 'Đề Thám',
            branchCode: cvStoreMap.get(id)?.code || 'DT',
            reason: finalReason,
            type: finalType,
          });
        } else if (isWeeklyOff) {
          offStaffList.push({
            id,
            name: cvNameMap.get(id) || `CV #${id}`,
            avatarUrl: cvAvatarMap.get(id) || null,
            branchName: cvStoreMap.get(id)?.name || 'Đề Thám',
            branchCode: cvStoreMap.get(id)?.code || 'DT',
            reason: `Nghỉ hàng tuần (${WEEKDAY_NAMES[legacyWeekday] || ''})`,
            type: 'weekly_off',
          });
        }
      });

      dailyCapacities[dateStr] = {
        workingKtvCount: workingCvIds.length,
        maxCapacity: workingCvIds.length * 5,
        workingStaffList,
        offStaffList,
      };

      cur.setDate(cur.getDate() + 1);
    }
  } catch (capErr) {
    fastify.log.error(capErr, 'Failed to compute daily KTV capacities');
  }

  return dailyCapacities;
}
