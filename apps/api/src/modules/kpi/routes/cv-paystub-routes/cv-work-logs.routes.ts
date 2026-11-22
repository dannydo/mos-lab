import { FastifyInstance } from 'fastify';
import { CvWorkLogDetailRecord, CvWorkLogDetailResponse, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { StaffOffDayService } from '../../../staff/services/staff-off-day.service.js';
import { computeStaffOffDayWorkDates, getExtendedWeekBounds, parseDateRange } from './cv-paystub.helpers.js';

export function registerCvWorkLogsRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cv-paystub/work-logs
  fastify.get('/kpi/cv-paystub/work-logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const { staffId, dateFrom, dateTo } = request.query as {
      staffId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    if (!staffId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'staffId là bắt buộc.' });
    }

    const numStaffId = Number(staffId);
    const { startPart, endPart } = parseDateRange(dateFrom, dateTo);

    try {
      // The rate lookup is independent from attendance and off-day reads below.
      const rateRowsPromise = fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT working_hour_rate 
        FROM \`staff_payroll\`
        WHERE user_id = ${numStaffId} AND working_hour_rate > 0
        ORDER BY id DESC
        LIMIT 1
      `);

      // Calculate extended boundaries to query entire weeks
      const { extendedStartMonday, extendedEndStr } = getExtendedWeekBounds(startPart, endPart);

      // 2. Query Shifts from report_staff for the requested range, pull extended attendance for week sizing, and approved month-off leaves
      const monthOffLeavesPromise = fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          DATE_FORMAT(sdo.from_date, '%Y-%m-%d') as date,
          COALESCE(sdo.working_day_count, 1) as workingDayCount,
          sdo.note,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COALESCE(TIMESTAMPDIFF(HOUR, sws.start_time, sws.end_time), 9) as shiftHours
        FROM \`staff_day_off\` sdo
        LEFT JOIN \`client_store\` cs ON cs.id = sdo.client_store_id
        LEFT JOIN \`staff_working_shift\` sws 
          ON sws.user_id = sdo.from_user_id 
          AND sws.date = DATE(sdo.from_date)
        WHERE sdo.from_user_id = ${numStaffId}
          AND sdo.attribute_option_id = 111
          AND sdo.request_state = 'Approved'
          AND sdo.from_date >= '${startPart}'
          AND sdo.from_date <= '${endPart}'
      `);

      const [rateRows, shiftsRaw, reportStaffRows, staffOffDayInfo, monthOffLeaves] = await Promise.all([
        rateRowsPromise,
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            DATE_FORMAT(rs.date, '%Y-%m-%d') as date,
            MIN(TIME_FORMAT(rs.check_in_date, '%H:%i:%s')) as checkInTime,
            MAX(TIME_FORMAT(rs.check_out_date, '%H:%i:%s')) as checkOutTime,
            ROUND(MAX(rs.working_minute) / 60, 2) as workHours,
            UPPER(COALESCE(MAX(cs.client_store_key), 'PXL')) as store
          FROM \`report_staff\` rs
          LEFT JOIN \`client_store\` cs ON cs.id = rs.client_store_id
          WHERE rs.user_id = ${numStaffId}
            AND rs.date >= '${startPart}'
            AND rs.date <= '${endPart}'
            AND rs.working_minute > 0
          GROUP BY DATE(rs.date)
          ORDER BY date DESC
        `),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            DATE_FORMAT(date, '%Y-%m-%d') as dateStr,
            working_minute
          FROM \`report_staff\`
          WHERE user_id = ${numStaffId}
            AND date >= '${extendedStartMonday}'
            AND date <= '${extendedEndStr}'
            AND working_minute > 0
        `),
        StaffOffDayService.getStaffOffDays(fastify, numStaffId),
        monthOffLeavesPromise,
      ]);
      const hourlyRate = rateRows.length > 0 ? Number(rateRows[0].working_hour_rate) : 21500;

      const offDaysConfig = new Set<number>(staffOffDayInfo.weeklyOffDays);
      const offDayWorkDates = computeStaffOffDayWorkDates(
        reportStaffRows.map((r: SafeAny) => String(r.dateStr)),
        offDaysConfig
      );

      let totalWorkHours = 0;
      let totalWage = 0;
      const logs: CvWorkLogDetailRecord[] = shiftsRaw.map((s: SafeAny) => {
        const hours = Number(s.workHours || 0);
        totalWorkHours += hours;
        const isOffDayWork = offDayWorkDates.has(s.date);
        const multiplier = isOffDayWork ? 2 : 1;
        const dailyWage = Math.round(hours * hourlyRate * multiplier);
        totalWage += dailyWage;

        return {
          date: String(s.date || ''),
          checkInTime: String(s.checkInTime || '09:00:00'),
          checkOutTime: String(s.checkOutTime || '18:00:00'),
          workHours: hours,
          hourlyRate,
          dailyWage,
          store: String(s.store || 'PXL'),
          notes: isOffDayWork ? 'Đi làm ngày nghỉ (x2)' : '',
        };
      });

      // Add approved month-off leaves into work logs with scheduled shift hours (9h regular / 11h full)
      monthOffLeaves.forEach((leave: SafeAny) => {
        const leaveDays = Number(leave.workingDayCount || 1);
        const hoursPerDay = Number(leave.shiftHours || 9);
        const leaveHours = leaveDays * hoursPerDay;
        const leaveWage = Math.round(leaveHours * hourlyRate);
        totalWorkHours += leaveHours;
        totalWage += leaveWage;
        logs.push({
          date: String(leave.date),
          checkInTime: '-',
          checkOutTime: '-',
          workHours: leaveHours,
          hourlyRate,
          dailyWage: leaveWage,
          store: String(leave.store || 'PXL'),
          notes:
            `Nghỉ phép tháng (${leaveDays} ngày x ${hoursPerDay}h hưởng 100% lương)` +
            (leave.note ? ` - ${leave.note}` : ''),
        });
      });

      // Sort logs descending by date
      logs.sort((a, b) => b.date.localeCompare(a.date));

      const response: CvWorkLogDetailResponse = {
        data: logs,
        summary: {
          totalWorkDays: logs.length,
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
          hourlyRate,
          totalWage,
        },
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV Work Logs');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy nhật ký ca làm CV.' });
    }
  });
}
