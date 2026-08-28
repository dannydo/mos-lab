import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CcPaystubRecord, CcPaystubResponse, SafeAny, calculateWheelBonusCap } from '@mos-lab/shared';
import { CcKpiService } from '../services/cc-kpi.service.js';
import { TeamService } from '../../teams/team.service.js';
import { HolidayWorkService } from '../../holiday-work/holiday-work.service.js';

export async function registerCcPaystubRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cc-paystub
  fastify.get('/kpi/cc-paystub', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');

    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      // 1. Get active CC staff IDs from TeamService (Single Source of Truth)
      const activeCcIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CC', 'ACTIVE_CC_STAFF_CONFIG');

      if (activeCcIds.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: {
            totalHourlyWage: 0,
            totalCcXoayBonus: 0,
            totalComboProductBonus: 0,
            totalMinigameBonus: 0,
            totalCcTipBonus: 0,
            totalHolidayBasePay: 0,
            totalHolidayPremiumPay: 0,
            totalHolidayPayrollAddition: 0,
            grandTotalIncome: 0,
          },
        });
      }

      const staffListStr = activeCcIds.join(',');

      // Fetch Staff Profiles & Store Info
      const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          up.user_id as userId,
          up.full_name as fullName,
          up.avatar as avatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        WHERE up.user_id IN (${staffListStr})
      `);

      let filteredStaffProfiles = staffProfiles;
      if (storeId && storeId !== 'ALL') {
        filteredStaffProfiles = staffProfiles.filter((s) => s.store.toUpperCase() === storeId.toUpperCase());
      }

      if (filteredStaffProfiles.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: {
            totalHourlyWage: 0,
            totalCcXoayBonus: 0,
            totalComboProductBonus: 0,
            totalMinigameBonus: 0,
            totalCcTipBonus: 0,
            totalHolidayBasePay: 0,
            totalHolidayPremiumPay: 0,
            totalHolidayPayrollAddition: 0,
            grandTotalIncome: 0,
          },
        });
      }

      const validStaffIds = filteredStaffProfiles.map((s) => Number(s.userId));
      const validStaffListStr = validStaffIds.join(',');

      let storeFilterClause = '';
      if (storeId && storeId !== 'ALL') {
        storeFilterClause = `AND o.client_store_id IN (SELECT id FROM \`client_store\` WHERE UPPER(client_store_key) = '${storeId.toUpperCase()}')`;
      }

      const staffExprOs = `COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id)`;

      // 2. Query Hourly Rates from staff_payroll
      const hourlyRatesQuery = `
        SELECT user_id, working_hour_rate 
        FROM (
          SELECT user_id, working_hour_rate,
            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id DESC) as rn
          FROM \`staff_payroll\`
          WHERE user_id IN (${validStaffListStr}) AND working_hour_rate > 0
        ) t
        WHERE rn = 1
      `;

      // 3. Query Shift Hours from report_staff (real attendance data)
      const shiftsQuery = `
        SELECT 
          rs.user_id as staff_id,
          COUNT(DISTINCT DATE(rs.date)) as active_days,
          ROUND(SUM(rs.working_minute) / 60, 2) as total_work_hours
        FROM \`report_staff\` rs
        WHERE rs.user_id IN (${validStaffListStr})
          AND rs.date >= '${startPart}'
          AND rs.date <= '${endPart}'
          AND rs.working_minute > 0
        GROUP BY rs.user_id
      `;

      // Fallback: Active Work Days from orders
      const workDaysQuery = `
        SELECT 
          ${staffExprOs} as staff_id,
          COUNT(DISTINCT DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))) as active_days
        FROM \`order\` o
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        JOIN \`order_service\` os ON os.order_id = o.id
        WHERE o.order_state = 'Completed'
          AND (
            (ro.actual_booking_date_start >= '${startPart} 00:00:00' AND ro.actual_booking_date_start <= '${endPart} 23:59:59')
            OR (
              ro.actual_booking_date_start IS NULL
              AND o.booking_date_start >= '${startPart} 00:00:00' AND o.booking_date_start <= '${endPart} 23:59:59'
            )
          )
          AND ${staffExprOs} IN (${validStaffListStr})
          ${storeFilterClause}
        GROUP BY staff_id
      `;

      // 5. Query CC Tip Bonus (20% share from staff_tip for completed orders)
      const ccTipBonusQuery = `
        SELECT 
          st.user_id as staff_id,
          COALESCE(SUM(st.tip_amount), 0) as cc_tip_bonus,
          COUNT(DISTINCT st.id) as tipped_visits_count
        FROM \`staff_tip\` st
        JOIN \`order\` o ON o.id = st.order_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND (
            (ro.actual_booking_date_start >= '${startPart} 00:00:00' AND ro.actual_booking_date_start <= '${endPart} 23:59:59')
            OR (
              ro.actual_booking_date_start IS NULL
              AND o.booking_date_start >= '${startPart} 00:00:00' AND o.booking_date_start <= '${endPart} 23:59:59'
            )
          )
          AND st.user_id IN (${validStaffListStr})
        GROUP BY st.user_id
      `;

      const [
        hourlyRatesRows,
        shiftsRows,
        workDaysRows,
        xoayReportResult,
        dailySalesResult,
        ccTipRows,
        holidayBreakdownMap,
      ] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(hourlyRatesQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(shiftsQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(workDaysQuery),
        CcKpiService.getCcXoayReport(fastify, { dateFrom: startPart, dateTo: endPart, storeId, limit: 999999 }),
        CcKpiService.getCcDailySalesBonus(fastify, { dateFrom: startPart, dateTo: endPart, storeId }),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(ccTipBonusQuery),
        HolidayWorkService.getPayBreakdownByLegacyStaffIds(fastify, validStaffIds, startPart, endPart),
      ]);

      const ccTipMap = new Map<number, { bonus: number; count: number }>();
      ccTipRows.forEach((r) =>
        ccTipMap.set(Number(r.staff_id), {
          bonus: Math.round(Number(r.cc_tip_bonus || 0)),
          count: Number(r.tipped_visits_count || 0),
        })
      );

      const hourlyRatesMap = new Map<number, number>();
      hourlyRatesRows.forEach((r) => hourlyRatesMap.set(Number(r.user_id), Number(r.working_hour_rate || 25000)));

      const shiftHoursMap = new Map<number, { days: number; hours: number }>();
      shiftsRows.forEach((r) =>
        shiftHoursMap.set(Number(r.staff_id), {
          days: Number(r.active_days || 0),
          hours: Number(r.total_work_hours || 0),
        })
      );

      const workDaysMap = new Map<number, number>();
      workDaysRows.forEach((r) => workDaysMap.set(Number(r.staff_id), Number(r.active_days || 0)));

      const xoayMap = new Map<number, { count: number; bonus: number }>();
      if (xoayReportResult && Array.isArray(xoayReportResult.data)) {
        xoayReportResult.data.forEach((r: SafeAny) => {
          const uid = Number(r.consultantId || r.check_in_staff_id || r.check_out_staff_id);
          if (uid > 0) {
            if (!xoayMap.has(uid)) {
              xoayMap.set(uid, { count: 0, bonus: 0 });
            }
            const stat = xoayMap.get(uid)!;
            stat.count += 1;
            stat.bonus += Math.round(Number(r.consultantBonus || 0));
          }
        });
      }

      // Compute Daily Sales Bonus per staff from CcKpiService (Single Source of Truth)
      const staffDailyBonusTotals = new Map<number, { bonus: number; comboQty: number; productQty: number }>();
      validStaffIds.forEach((id) => staffDailyBonusTotals.set(id, { bonus: 0, comboQty: 0, productQty: 0 }));

      if (dailySalesResult && Array.isArray(dailySalesResult.data)) {
        dailySalesResult.data.forEach((r: SafeAny) => {
          const uid = Number(r.user_id);
          if (staffDailyBonusTotals.has(uid)) {
            const item = staffDailyBonusTotals.get(uid)!;
            item.bonus += Math.round(Number(r.daily_bonus || 0));
            item.comboQty += Number(r.combo_count || 0);
            item.productQty += Number(r.product_count || 0);
          }
        });
      }

      // Minigame bonus scaling map
      // Minigame chưa có — set 0 cho tất cả CC
      const _minigameBaseMap = new Map<number, number>();

      let summaryHourly = 0;
      let summaryXoay = 0;
      let summaryComboProd = 0;
      let summaryMinigame = 0;
      let summaryCcTip = 0;
      let summaryHolidayBase = 0;
      let summaryHolidayPremium = 0;
      let summaryHolidayAddition = 0;
      let summaryHolidayAdjustment = 0;

      const records: CcPaystubRecord[] = filteredStaffProfiles.map((s) => {
        const uid = Number(s.userId);

        // Exact rate from DB staff_payroll or default 25k
        const rate = hourlyRatesMap.get(uid) || 25000;

        // Exact work hours from staff_working_shift
        let totalWorkHours: number;
        const shiftData = shiftHoursMap.get(uid);
        if (shiftData && shiftData.hours > 0) {
          totalWorkHours = Math.round(shiftData.hours * 100) / 100;
        } else {
          const days = workDaysMap.get(uid) || 0;
          totalWorkHours = days * 8;
        }

        const hourlyWage = Math.round(totalWorkHours * rate);

        const xoayInfo = xoayMap.get(uid) || { count: 0, bonus: 0 };
        const dailyBonusInfo = staffDailyBonusTotals.get(uid) || { bonus: 0, comboQty: 0, productQty: 0 };

        // Calculate 1.5x Wheel / Minigame Bonus Cap per CC
        const rawMinigameBonus = _minigameBaseMap.get(uid) || 0;
        const capResult = calculateWheelBonusCap(dailyBonusInfo.bonus, rawMinigameBonus);
        const minigameBonus = capResult.effectiveWheelBonus;

        const ccTipInfo = ccTipMap.get(uid) || { bonus: 0, count: 0 };
        const ccTipBonus = ccTipInfo.bonus;
        const holiday = holidayBreakdownMap.get(uid)!;

        const totalIncome = Math.round(
          hourlyWage +
            xoayInfo.bonus +
            dailyBonusInfo.bonus +
            minigameBonus +
            ccTipBonus +
            holiday.holidayPaystubAdjustment
        );

        summaryHourly += hourlyWage;
        summaryXoay += xoayInfo.bonus;
        summaryComboProd += dailyBonusInfo.bonus;
        summaryMinigame += minigameBonus;
        summaryCcTip += ccTipBonus;
        summaryHolidayBase += holiday.holidayBasePay;
        summaryHolidayPremium += holiday.holidayPremiumPay;
        summaryHolidayAddition += holiday.holidayPayrollAddition;
        summaryHolidayAdjustment += holiday.holidayPaystubAdjustment;

        return {
          consultantId: uid,
          displayName: s.fullName,
          avatar: String(s.avatar || '') || null,
          store: s.store,
          hourlyWage,
          totalWorkHours,
          hourlyRate: rate,
          ccXoayBonus: xoayInfo.bonus,
          checkinCount: xoayInfo.count,
          comboProductBonus: dailyBonusInfo.bonus,
          comboCount: dailyBonusInfo.comboQty,
          productCount: dailyBonusInfo.productQty,
          minigameBonus,
          rawMinigameBonus: capResult.rawWheelBonus,
          monthlyDailyBonus: capResult.monthlyDailyBonus,
          maxWheelBonusAllowed: capResult.maxWheelBonusAllowed,
          wheelCapPercent: capResult.wheelCapPercent,
          capStatus: capResult.capStatus,
          ccTipBonus,
          tippedVisitsCount: ccTipInfo.count,
          ...holiday,
          totalIncome,
        };
      });

      // Sort by total income descending
      records.sort((a, b) => b.totalIncome - a.totalIncome);

      const grandTotalIncome =
        summaryHourly + summaryXoay + summaryComboProd + summaryMinigame + summaryCcTip + summaryHolidayAdjustment;

      const response: CcPaystubResponse = {
        data: records,
        total: records.length,
        summary: {
          totalHourlyWage: summaryHourly,
          totalCcXoayBonus: summaryXoay,
          totalComboProductBonus: summaryComboProd,
          totalMinigameBonus: summaryMinigame,
          totalCcTipBonus: summaryCcTip,
          totalHolidayBasePay: summaryHolidayBase,
          totalHolidayPremiumPay: summaryHolidayPremium,
          totalHolidayPayrollAddition: summaryHolidayAddition,
          grandTotalIncome,
        },
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Get CC Paystub error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải báo cáo thu nhập CC.' });
    }
  });

  // GET /api/kpi/cc-work-logs
  fastify.get('/kpi/cc-work-logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const { consultantId, dateFrom, dateTo } = request.query as {
      consultantId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    if (!consultantId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tham số consultantId.' });
    }

    const uid = Number(consultantId);
    if (isNaN(uid)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'consultantId không hợp lệ.' });
    }

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');

    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      // 1. Fetch Staff Profile & Hourly Rate from DB
      const [staffProfiles, rateRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            up.user_id as userId,
            up.full_name as fullName,
            UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
          FROM \`user_profile\` up
          LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
          WHERE up.user_id = ${uid}
          LIMIT 1
        `),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT working_hour_rate 
          FROM \`staff_payroll\`
          WHERE user_id = ${uid} AND working_hour_rate > 0
          ORDER BY id DESC LIMIT 1
        `),
      ]);

      const sInfo =
        staffProfiles && staffProfiles.length > 0 ? staffProfiles[0] : { fullName: `Staff #${uid}`, store: 'PXL' };
      const hourlyRate = rateRows && rateRows.length > 0 ? Number(rateRows[0].working_hour_rate || 25000) : 25000;

      const staffExprOs = `COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id)`;

      // 2. Query daily shift work logs from report_staff (real check-in/out & exact working minutes)
      const shiftWorkLogsQuery = `
        SELECT 
          DATE_FORMAT(rs.date, '%Y-%m-%d') as work_date,
          TIME_FORMAT(rs.check_in_date, '%H:%i:%s') as first_in,
          TIME_FORMAT(rs.check_out_date, '%H:%i:%s') as last_out,
          ROUND(rs.working_minute / 60, 2) as total_hours,
          COALESCE(srv.service_count, 0) as service_count
        FROM \`report_staff\` rs
        LEFT JOIN (
          SELECT 
            DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) as work_date,
            COUNT(os.id) as service_count
          FROM \`order\` o
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          JOIN \`order_service\` os ON os.order_id = o.id
          WHERE o.order_state = 'Completed'
            AND ${staffExprOs} = ${uid}
          GROUP BY work_date
        ) srv ON srv.work_date = rs.date
        WHERE rs.user_id = ${uid}
          AND rs.date >= '${startPart}'
          AND rs.date <= '${endPart}'
          AND rs.working_minute > 0
        ORDER BY rs.date DESC
      `;

      let rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(shiftWorkLogsQuery);

      // Fallback to order check-in timestamps if staff_working_shift is empty
      if (!rows || rows.length === 0) {
        const fallbackQuery = `
          SELECT 
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as work_date,
            MIN(DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s')) as first_in,
            MAX(DATE_FORMAT(COALESCE(o.booking_date_end, COALESCE(ro.actual_booking_date_start, o.booking_date_start)), '%H:%i:%s')) as last_out,
            8.00 as total_hours,
            COUNT(os.id) as service_count
          FROM \`order\` o
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          JOIN \`order_service\` os ON os.order_id = o.id
          WHERE o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
            AND ${staffExprOs} = ${uid}
          GROUP BY work_date
          ORDER BY work_date DESC
        `;
        rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(fallbackQuery);
      }

      let totalWorkHours = 0;
      let totalWage = 0;

      const data = rows.map((r) => {
        const hours = Number(r.total_hours || 0);
        const dailyWage = Math.round(hours * hourlyRate);
        totalWorkHours += hours;
        totalWage += dailyWage;

        return {
          work_date: r.work_date,
          first_in: r.first_in || '09:00:00',
          last_out: r.last_out || '18:00:00',
          total_hours: hours,
          service_count: Number(r.service_count || 0),
          hourly_rate: hourlyRate,
          daily_wage: dailyWage,
        };
      });

      totalWorkHours = Math.round(totalWorkHours * 100) / 100;

      return reply.send({
        consultantId: uid,
        consultantName: sInfo.fullName,
        store: sInfo.store,
        data,
        summary: {
          totalWorkDays: data.length,
          totalWorkHours,
          hourlyRate,
          totalWage,
        },
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Get CC work logs error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải báo cáo ca làm việc.' });
    }
  });
}
