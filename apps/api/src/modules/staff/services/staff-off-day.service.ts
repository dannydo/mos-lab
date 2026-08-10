import { FastifyInstance } from 'fastify';
import { StaffOffDayResult } from '@mos-lab/shared';

// Type helper for raw SQL rows
type SafeAny = any;

/**
 * Service dùng chung (Single Source of Truth) quản lý và tra cứu ngày off tuần & ngày nghỉ được duyệt / chưa duyệt của nhân viên.
 */
export class StaffOffDayService {
  /**
   * Truy vấn ngày off tuần và danh sách ngày nghỉ duyệt / chờ duyệt / bị từ chối theo lô (batch)
   */
  public static async getBatchStaffOffDays(
    fastify: FastifyInstance,
    userIds?: number[],
    options?: { dateFrom?: string; dateTo?: string }
  ): Promise<Map<number, StaffOffDayResult>> {
    const resultMap = new Map<number, StaffOffDayResult>();

    let userFilterSql = '';
    if (userIds && userIds.length > 0) {
      const validIds = userIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
      if (validIds.length > 0) {
        userFilterSql = ` AND user_id IN (${validIds.join(',')})`;
      }
    }

    let fromUserFilterSql = '';
    if (userIds && userIds.length > 0) {
      const validIds = userIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
      if (validIds.length > 0) {
        fromUserFilterSql = ` AND from_user_id IN (${validIds.join(',')})`;
      }
    }

    // 1. Primary Source of Truth: Fixed weekly off schedule from staff_day_off_schedule
    const fixedWeekOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT user_id as userId, weekday
       FROM staff_day_off_schedule
       WHERE is_disabled = 0 AND user_id IS NOT NULL${userFilterSql}`
    );

    const fixedWeekOffsByUserId: Record<number, number[]> = {};
    for (const r of fixedWeekOffRows) {
      const uid = Number(r.userId);
      const wd = Number(r.weekday);
      if (!fixedWeekOffsByUserId[uid]) fixedWeekOffsByUserId[uid] = [];
      if (!fixedWeekOffsByUserId[uid].includes(wd)) {
        fixedWeekOffsByUserId[uid].push(wd);
      }
    }

    // 2. Secondary Source: Query approved week-off requests from staff_day_off (recurring day-off)
    const weekOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT from_user_id as userId, weekday, COUNT(*) as cnt
       FROM staff_day_off
       WHERE attribute_option_id = 110 AND request_state = 'Approved' AND from_user_id IS NOT NULL AND from_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)${fromUserFilterSql}
       GROUP BY from_user_id, weekday`
    );

    const weekOffsByUserId: Record<number, { weekday: number; cnt: number }[]> = {};
    for (const r of weekOffRows) {
      const uid = Number(r.userId);
      const wd = Number(r.weekday);
      const cnt = Number(r.cnt);
      if (!weekOffsByUserId[uid]) weekOffsByUserId[uid] = [];
      weekOffsByUserId[uid].push({ weekday: wd, cnt });
    }

    // 3. Fallback Source: Query staff schedules (staff_working_shift_schedule)
    const allSchedules = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT user_id, type, type_value
       FROM staff_working_shift_schedule
       WHERE is_disabled = 0 AND user_id IS NOT NULL${userFilterSql}`
    );

    const schedulesByUserId: Record<number, SafeAny[]> = {};
    for (const s of allSchedules) {
      const uid = Number(s.user_id);
      if (!schedulesByUserId[uid]) schedulesByUserId[uid] = [];
      schedulesByUserId[uid].push(s);
    }

    // 4. Query specific approved day-off dates from staff_day_off
    let dateRangeClause = 'from_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    if (options?.dateFrom) {
      dateRangeClause = `COALESCE(to_date, from_date) >= '${options.dateFrom}'`;
      if (options?.dateTo) {
        dateRangeClause += ` AND from_date <= '${options.dateTo}'`;
      }
    }

    const approvedOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT from_user_id as userId, 
              DATE_FORMAT(from_date, '%Y-%m-%d') as fromDate, 
              DATE_FORMAT(COALESCE(to_date, from_date), '%Y-%m-%d') as toDate
       FROM staff_day_off
       WHERE request_state = 'Approved' AND from_user_id IS NOT NULL AND ${dateRangeClause}${fromUserFilterSql}`
    );

    const approvedOffDatesByUserId: Record<number, string[]> = {};
    for (const r of approvedOffRows) {
      const uid = Number(r.userId);
      if (!approvedOffDatesByUserId[uid]) approvedOffDatesByUserId[uid] = [];
      const start = new Date(r.fromDate);
      const end = new Date(r.toDate);
      const cur = new Date(start);
      while (cur <= end) {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (!approvedOffDatesByUserId[uid].includes(dateStr)) {
          approvedOffDatesByUserId[uid].push(dateStr);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // 5. Query pending day-off dates (request_state = 'New') -> Cảnh báo chưa duyệt
    const pendingOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT from_user_id as userId, 
              DATE_FORMAT(from_date, '%Y-%m-%d') as fromDate, 
              DATE_FORMAT(COALESCE(to_date, from_date), '%Y-%m-%d') as toDate
       FROM staff_day_off
       WHERE request_state = 'New' AND from_user_id IS NOT NULL AND ${dateRangeClause}${fromUserFilterSql}`
    );

    const pendingOffDatesByUserId: Record<number, string[]> = {};
    for (const r of pendingOffRows) {
      const uid = Number(r.userId);
      if (!pendingOffDatesByUserId[uid]) pendingOffDatesByUserId[uid] = [];
      const start = new Date(r.fromDate);
      const end = new Date(r.toDate);
      const cur = new Date(start);
      while (cur <= end) {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (!pendingOffDatesByUserId[uid].includes(dateStr)) {
          pendingOffDatesByUserId[uid].push(dateStr);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // 6. Query rejected day-off dates (request_state = 'Rejected') -> Cảnh báo bị từ chối / không duyệt
    const rejectedOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT from_user_id as userId, 
              DATE_FORMAT(from_date, '%Y-%m-%d') as fromDate, 
              DATE_FORMAT(COALESCE(to_date, from_date), '%Y-%m-%d') as toDate
       FROM staff_day_off
       WHERE request_state = 'Rejected' AND from_user_id IS NOT NULL AND ${dateRangeClause}${fromUserFilterSql}`
    );

    const rejectedOffDatesByUserId: Record<number, string[]> = {};
    for (const r of rejectedOffRows) {
      const uid = Number(r.userId);
      if (!rejectedOffDatesByUserId[uid]) rejectedOffDatesByUserId[uid] = [];
      const start = new Date(r.fromDate);
      const end = new Date(r.toDate);
      const cur = new Date(start);
      while (cur <= end) {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (!rejectedOffDatesByUserId[uid].includes(dateStr)) {
          rejectedOffDatesByUserId[uid].push(dateStr);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Collect all distinct user IDs found across sources
    const allUserIds = new Set<number>([
      ...Object.keys(fixedWeekOffsByUserId).map(Number),
      ...Object.keys(weekOffsByUserId).map(Number),
      ...Object.keys(schedulesByUserId).map(Number),
      ...Object.keys(approvedOffDatesByUserId).map(Number),
      ...Object.keys(pendingOffDatesByUserId).map(Number),
      ...Object.keys(rejectedOffDatesByUserId).map(Number),
      ...(userIds || []),
    ]);

    for (const uid of allUserIds) {
      if (isNaN(uid) || uid <= 0) continue;

      let weeklyOffDays: number[] = [];
      let source: StaffOffDayResult['source'] = 'none';

      // Priority 1: Fixed weekly off schedule
      if (fixedWeekOffsByUserId[uid] && fixedWeekOffsByUserId[uid].length > 0) {
        weeklyOffDays = fixedWeekOffsByUserId[uid];
        source = 'fixed_schedule';
      }
      // Priority 2: Approved recurring requests
      else if (weekOffsByUserId[uid] && weekOffsByUserId[uid].length > 0) {
        const sorted = [...weekOffsByUserId[uid]].sort((a, b) => b.cnt - a.cnt);
        weeklyOffDays = [sorted[0].weekday];
        source = 'approved_request';
      }
      // Priority 3: Schedule inversion
      else {
        const list = schedulesByUserId[uid] || [];
        const worksAll = list.some((s) => s.type === 'Day' && s.type_value === 'All');
        if (!worksAll) {
          const workingWeekdays = list.filter((s) => s.type === 'Weekday').map((s) => Number(s.type_value));
          if (workingWeekdays.length > 0) {
            const allWeekdays = [1, 2, 3, 4, 5, 6, 7];
            weeklyOffDays = allWeekdays.filter((w) => !workingWeekdays.includes(w));
            source = 'inverted_schedule';
          }
        }
      }

      const approvedOffDates = approvedOffDatesByUserId[uid] || [];
      const pendingOffDates = pendingOffDatesByUserId[uid] || [];
      const rejectedOffDates = rejectedOffDatesByUserId[uid] || [];

      resultMap.set(uid, {
        userId: uid,
        weeklyOffDays,
        approvedOffDates,
        pendingOffDates,
        rejectedOffDates,
        source,
      });
    }

    return resultMap;
  }

  /**
   * Truy vấn thông tin ngày off cho 1 nhân viên cụ thể
   */
  public static async getStaffOffDays(
    fastify: FastifyInstance,
    userId: number,
    options?: { dateFrom?: string; dateTo?: string }
  ): Promise<StaffOffDayResult> {
    const batchMap = await this.getBatchStaffOffDays(fastify, [userId], options);
    return (
      batchMap.get(userId) || {
        userId,
        weeklyOffDays: [],
        approvedOffDates: [],
        pendingOffDates: [],
        rejectedOffDates: [],
        source: 'none',
      }
    );
  }

  /**
   * Kiểm tra xem 1 ngày cụ thể (hoặc YYYY-MM-DD) có phải là ngày off của nhân viên hay không
   */
  public static async isOffDay(fastify: FastifyInstance, userId: number, date: string | Date): Promise<boolean> {
    const d = typeof date === 'string' ? new Date(date) : date;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Get ISO weekday: 1 (Mon) .. 7 (Sun)
    let isoWd = d.getDay();
    if (isoWd === 0) isoWd = 7;

    const result = await this.getStaffOffDays(fastify, userId, { dateFrom: dateStr, dateTo: dateStr });

    // Check specific approved date off first
    if (result.approvedOffDates.includes(dateStr)) {
      return true;
    }

    // Check weekly off day
    return result.weeklyOffDays.includes(isoWd);
  }
}
