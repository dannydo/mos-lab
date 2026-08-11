import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';

export interface UnifiedCvAttendanceItem {
  id: number;
  name: string;
  avatarUrl: string | null;
  branchName: string;
  storeId: number;
  shift: 'sáng' | 'chiều' | 'full' | 'off';
  attendance: 'none' | 'checked_in' | 'checked_out' | 'late';
  status: 'busy' | 'available';
  doing: string;
  bookedCount: number;
  doneCount: number;
  clients: number;
  isOff: boolean;
  offReason?: string;
  offType?: 'weekly_off' | 'urgent_off' | 'planned_off' | string;
}

export class CvAttendanceService {
  /**
   * Single Source of Truth for CV Attendance, Shift, OFF status, and Real-time Activity ("Đang làm gì?")
   * Shared between Dashboard Trang Chủ (/api/dashboard/today) and Lịch CV (/api/customers/cv-realtime-status).
   */
  public static async getDailyCvAttendance(
    fastify: FastifyInstance,
    targetDateStr: string
  ): Promise<UnifiedCvAttendanceItem[]> {
    const refTime = new Date();

    const dayOfWeek = new Date(targetDateStr).getDay();
    const legacyWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const weekdayNames = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

    const normalizeName = (name: string) => (name || '').trim().toLowerCase();

    // 1. Fetch active CV staff (user_group_id = 4)
    const activeCvs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT user_id as userId, full_name as fullName, avatar, client_store_id as storeId
      FROM \`user_profile\`
      WHERE provider = 'Staff' AND user_group_id = 4 AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0
    `);

    if (!activeCvs || activeCvs.length === 0) {
      return [];
    }

    const cvIds = activeCvs.map((c) => Number(c.userId)).filter((id) => !isNaN(id) && id > 0);

    // CRM Staff fallbacks for avatar & display name
    const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
      where: { id: { in: cvIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const crmStaffMap = new Map(crmStaffList.map((s: SafeAny) => [s.id, s]));

    // 2. Query fixed store & weekly off schedule from staff_day_off_schedule master
    const dayOffScheduleRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT user_id, weekday, client_store_id
      FROM staff_day_off_schedule
      WHERE is_disabled = 0 AND user_id IN (${cvIds.join(',')})
    `);

    const weeklyOffMap = new Map<number, Set<number>>();
    const schedStoreMap = new Map<number, number>();
    dayOffScheduleRows.forEach((r) => {
      const uid = Number(r.user_id);
      if (r.weekday !== null && r.weekday !== undefined) {
        if (!weeklyOffMap.has(uid)) weeklyOffMap.set(uid, new Set());
        weeklyOffMap.get(uid)!.add(Number(r.weekday));
      }
      if (r.client_store_id && !schedStoreMap.has(uid)) {
        schedStoreMap.set(uid, Number(r.client_store_id));
      }
    });

    // 3. Query working shift hours from staff_working_shift_schedule
    const allSchedules = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT user_id, type, type_value, start_time, end_time 
       FROM staff_working_shift_schedule 
       WHERE is_disabled = 0 AND user_id IN (${cvIds.join(',')})`
    );

    const schedulesByUserId: Record<number, SafeAny[]> = {};
    for (const s of allSchedules) {
      const uid = Number(s.user_id);
      const list = schedulesByUserId[uid] || [];
      list.push(s);
      schedulesByUserId[uid] = list;
    }

    // 4. Fetch approved & pending leave requests from staff_day_off
    const dayOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT sdo.from_user_id as userId, sdo.note, sdo.attribute_option_id as attributeOptionId,
             DATEDIFF(sdo.from_date, sdo.date_created) as daysAhead
      FROM staff_day_off sdo
      WHERE sdo.from_date <= '${targetDateStr}' AND COALESCE(sdo.to_date, sdo.from_date) >= '${targetDateStr}'
        AND sdo.request_state IN ('Approved', 'Submitted', 'Pending')
        AND sdo.from_user_id IN (${cvIds.join(',')})
    `);

    const dateOffMap = new Map<number, { reason: string; type: 'urgent_off' | 'planned_off' }>();
    dayOffRows.forEach((r) => {
      const uid = Number(r.userId);
      const attrOptId = Number(r.attributeOptionId || 0);
      const daysAhead = Number(r.daysAhead || 0);
      const noteText = String(r.note || r.reason || '').trim();

      const isWeeklyOffRecord = attrOptId === 110 || /hàng tuần|off tuần/i.test(noteText);
      const isUrgent = !isWeeklyOffRecord && (attrOptId === 113 || /gấp|đột xuất|bệnh|ốm|khẩn|cấp cứu/i.test(noteText));

      const offType: 'urgent_off' | 'planned_off' = isUrgent ? 'urgent_off' : 'planned_off';
      const labelPrefix = isWeeklyOffRecord ? 'OFF Tuần' : isUrgent ? 'OFF Gấp' : 'OFF Phép';
      const defaultReason = isWeeklyOffRecord
        ? 'Nghỉ hàng tuần (OFF Tuần)'
        : isUrgent
          ? 'Xin nghỉ phép đột xuất (Gấp)'
          : 'Xin nghỉ phép';
      const reasonLabel = noteText ? `${labelPrefix}: ${noteText}` : `${defaultReason}`;

      dateOffMap.set(uid, { reason: reasonLabel, type: offType });
    });

    // 5. Fetch working shift check-ins for targetDateStr
    const workingShifts = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT * FROM \`staff_working_shift\` WHERE \`date\` = ? AND user_id IN (${cvIds.join(',')})`,
      targetDateStr
    );
    const shiftMap = new Map<number, SafeAny>();
    workingShifts.forEach((ws) => {
      shiftMap.set(Number(ws.user_id), ws);
    });

    // 6. Fetch appointments for targetDateStr
    const comingOrders = await fastify.prisma.legacy.order.findMany({
      where: {
        booking_date_start: {
          gte: new Date(`${targetDateStr}T00:00:00.000Z`),
          lte: new Date(`${targetDateStr}T23:59:59.999Z`),
        },
        order_state: { not: 'Cancelled' },
      },
      orderBy: { booking_date_start: 'asc' },
    });

    const comingOrderIds = comingOrders.map((o) => o.id);
    const comingServices =
      comingOrderIds.length > 0
        ? await fastify.prisma.legacy.order_service.findMany({
            where: { order_id: { in: comingOrderIds } },
          })
        : [];

    const comingServiceIds = Array.from(new Set(comingServices.map((cs) => cs.service_id)));
    const serviceLangs =
      comingServiceIds.length > 0
        ? await fastify.prisma.legacy.service_language.findMany({
            where: { service_id: { in: comingServiceIds } },
          })
        : [];
    const serviceLangMap = new Map(serviceLangs.map((sl) => [sl.service_id, sl.service_name]));

    const userIds = Array.from(new Set(comingOrders.map((o) => o.user_id))).filter(
      (id): id is number => id !== null && id !== undefined && Number(id) > 0
    );
    const userProfiles =
      userIds.length > 0
        ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT up.user_id as userId, up.full_name as fullName
      FROM \`user_profile\` up
      WHERE up.user_id IN (${userIds.join(',')})
    `)
        : [];
    const customerProfileMap = new Map<number, string>();
    userProfiles.forEach((up) => {
      customerProfileMap.set(Number(up.userId), up.fullName ? String(up.fullName).trim() : 'Khách hàng');
    });

    const staffMap = new Map<number, string>();
    activeCvs.forEach((c) => {
      staffMap.set(Number(c.userId), c.fullName ? String(c.fullName).trim() : `CV #${c.userId}`);
    });

    const getShiftType = (startTime: SafeAny, endTime: SafeAny): 'sáng' | 'chiều' | 'full' => {
      if (!startTime) return 'full';
      let startStr = '';
      if (typeof startTime === 'string') startStr = startTime;
      else if (startTime instanceof Date) startStr = startTime.toISOString().substr(11, 8);
      else if (startTime && typeof startTime === 'object' && (startTime as SafeAny).toISOString) {
        startStr = (startTime as SafeAny).toISOString().substr(11, 8);
      }

      let endStr = '';
      if (typeof endTime === 'string') endStr = endTime;
      else if (endTime instanceof Date) endStr = endTime.toISOString().substr(11, 8);
      else if (endTime && typeof endTime === 'object' && (endTime as SafeAny).toISOString) {
        endStr = (endTime as SafeAny).toISOString().substr(11, 8);
      }

      if (startStr.startsWith('09:00') || startStr.startsWith('08:30')) {
        if (endStr.startsWith('18:00') || endStr.startsWith('17:00')) {
          return 'sáng';
        }
        return 'full';
      } else if (startStr >= '10:30') {
        return 'chiều';
      }
      return 'full';
    };

    const toActualDate = (dbDate: Date | null | undefined) => {
      if (!dbDate) return new Date(0);
      return new Date(
        Date.UTC(
          dbDate.getUTCFullYear(),
          dbDate.getUTCMonth(),
          dbDate.getUTCDate(),
          dbDate.getUTCHours(),
          dbDate.getUTCMinutes(),
          dbDate.getUTCSeconds()
        ) -
          7 * 3600 * 1000
      );
    };

    const formatDbTime = (dbDate: Date | null | undefined) => {
      if (!dbDate) return '00:00';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(dbDate.getUTCHours())}:${pad(dbDate.getUTCMinutes())}`;
    };

    const result: UnifiedCvAttendanceItem[] = [];

    activeCvs.forEach((cv) => {
      const cvId = Number(cv.userId);
      const storeId = schedStoreMap.get(cvId) || Number(cv.storeId || 6);
      let branchName = 'Estella Place';
      if (storeId === 6 || storeId === 1) branchName = 'Đề Thám';
      else if (storeId === 2) branchName = 'PXL';

      const normName = normalizeName(cv.fullName);
      const crmS = crmStaffMap.get(cvId);
      const fullName = (cv.fullName ? String(cv.fullName).trim() : '') || crmS?.displayName || `CV #${cvId}`;
      const avatarUrl = cv.avatar ? String(cv.avatar) : crmS?.avatarUrl || null;

      // Determine weekly off from staff_day_off_schedule
      const userWeeklyOffSet = weeklyOffMap.get(cvId);
      const isWeeklyOff = userWeeklyOffSet ? userWeeklyOffSet.has(legacyWeekday) : false;

      // Determine date-specific leave from staff_day_off
      const dateOffInfo = dateOffMap.get(cvId);
      const isOff = isWeeklyOff || Boolean(dateOffInfo);

      let offReason: string | undefined = undefined;
      let offType: string | undefined = undefined;

      if (dateOffInfo) {
        offReason = dateOffInfo.reason;
        offType = dateOffInfo.type;
      } else if (isWeeklyOff) {
        offReason = `Nghỉ phép tuần (${weekdayNames[legacyWeekday] || ''})`;
        offType = 'weekly_off';
      }

      // Check shift schedule
      let shift: 'sáng' | 'chiều' | 'full' | 'off' = 'full';
      if (isOff) {
        shift = 'off';
      } else {
        const list = schedulesByUserId[cvId] || [];
        const todaySchedule =
          list.find((s) => s.type === 'Weekday' && String(s.type_value) === String(legacyWeekday)) ||
          list.find((s) => s.type === 'Day' && s.type_value === 'All');
        if (todaySchedule) {
          shift = getShiftType(todaySchedule.start_time, todaySchedule.end_time);
        }
      }

      // Check attendance from staff_working_shift
      const wsRecord = shiftMap.get(cvId);
      let attendance: 'none' | 'checked_in' | 'checked_out' | 'late' = 'none';

      if (wsRecord) {
        if (!isOff || wsRecord.check_in_staff_task_id !== null) {
          shift = getShiftType(wsRecord.start_time, wsRecord.end_time);
        }
        if (wsRecord.check_out_staff_task_id !== null) {
          attendance = 'checked_out';
        } else if (wsRecord.check_in_staff_task_id !== null) {
          attendance = 'checked_in';
        }
      }

      // Filter assigned orders
      const staffOrders = comingOrders.filter((o) => {
        if (o.assigned_staff_id === cvId) return true;
        const assignedName = staffMap.get(Number(o.assigned_staff_id));
        if (assignedName && normalizeName(assignedName) === normName) return true;
        const orderSvs = comingServices.filter((cs) => cs.order_id === o.id);
        for (const cs of orderSvs) {
          if (cs.assigned_staff_id === cvId) return true;
          const csAssignedName = staffMap.get(Number(cs.assigned_staff_id));
          if (csAssignedName && normalizeName(csAssignedName) === normName) return true;
        }
        return false;
      });

      const bookedCount = staffOrders.length;
      const doneCount = staffOrders.filter((o) => o.order_state === 'Completed').length;

      let status: 'busy' | 'available' = 'available';
      let doing = 'Chưa check-in';

      if (isOff) {
        doing = offReason || 'Nghỉ phép';
      } else if (attendance === 'checked_out') {
        doing = 'Đã về';
      } else if (attendance === 'checked_in') {
        // Active serving order right now
        const activeOrder = staffOrders.find((o) => {
          if (o.order_state === 'Cancelled' || o.order_state === 'Completed') return false;
          if (!o.booking_date_start || !o.booking_date_end) return false;
          const start = toActualDate(o.booking_date_start);
          const end = toActualDate(o.booking_date_end);
          return refTime >= start && refTime <= end;
        });

        if (activeOrder) {
          const custName = customerProfileMap.get(activeOrder.user_id) || 'Khách hàng';
          const parts = custName.split(' ');
          const shortCustName = parts.length > 2 ? parts.slice(-2).join(' ') : custName;

          const orderSvs = comingServices.filter((cs) => cs.order_id === activeOrder.id);
          const svName = orderSvs.length > 0 ? serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ' : 'Dịch vụ';

          const start = toActualDate(activeOrder.booking_date_start);
          const end = toActualDate(activeOrder.booking_date_end);
          const totalMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
          const elapsedMin = Math.max(0, Math.min(totalMin, Math.round((refTime.getTime() - start.getTime()) / 60000)));

          doing = `[${elapsedMin}/${totalMin}] ${shortCustName}: ${svName}`;
          status = 'busy';
        } else {
          // Upcoming order
          const upcoming = staffOrders
            .filter((o) => {
              if (o.order_state === 'Cancelled' || o.order_state === 'Completed') return false;
              if (!o.booking_date_start) return false;
              return toActualDate(o.booking_date_start) > refTime;
            })
            .sort(
              (a, b) => toActualDate(a.booking_date_start).getTime() - toActualDate(b.booking_date_start).getTime()
            );

          if (upcoming.length > 0) {
            const nextOrder = upcoming[0];
            const timeStr = formatDbTime(nextOrder.booking_date_start);
            const orderSvs = comingServices.filter((cs) => cs.order_id === nextOrder.id);
            const svName = orderSvs.length > 0 ? serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ' : 'Dịch vụ';
            doing = `Chờ khách: ${svName} (${timeStr})`;
          } else {
            doing = 'Đang rảnh';
          }
        }
      }

      result.push({
        id: cvId,
        name: fullName,
        avatarUrl,
        branchName,
        storeId,
        shift,
        attendance,
        status,
        doing,
        bookedCount,
        doneCount,
        clients: doneCount,
        isOff,
        offReason,
        offType,
      });
    });

    // Rule #2: Sort CVs - Working CVs on top (by bookedCount desc, doneCount desc, name asc), OFF & Checked-out CVs at the bottom
    result.sort((a, b) => {
      const aIsWorking = !a.isOff && a.attendance !== 'checked_out';
      const bIsWorking = !b.isOff && b.attendance !== 'checked_out';

      if (aIsWorking && !bIsWorking) return -1;
      if (!aIsWorking && bIsWorking) return 1;

      return b.bookedCount - a.bookedCount || b.doneCount - a.doneCount || a.name.localeCompare(b.name);
    });

    return result;
  }
}
