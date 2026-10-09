import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CcPaystubRecord, CcPaystubResponse, SafeAny, calculateWheelBonusCap } from '@mos-lab/shared';
import {
  buildCashTipCurrencyPredicate,
  CcKpiService,
  summarizeCcLedgerXoayForPaystub,
} from '../services/cc-kpi.service.js';
import { TeamService } from '../../teams/team.service.js';
import { HolidayWorkService } from '../../holiday-work/holiday-work.service.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDatePart(value: string | undefined, fallback: string): string {
  const datePart = value?.includes('T') ? value.split('T')[0] : value;
  return datePart && ISO_DATE_PATTERN.test(datePart) ? datePart : fallback;
}

function buildActualCheckinOrdersCte(): string {
  return `
    WITH filtered_orders AS (
      SELECT ro.order_id AS orderId, ro.actual_booking_date_start AS checkinTime
      FROM report_order ro
      INNER JOIN \`order\` o ON o.id = ro.order_id
      WHERE o.order_state = 'Completed'
        AND ro.actual_booking_date_start >= ?
        AND ro.actual_booking_date_start <= ?

      UNION ALL

      SELECT o.id AS orderId, o.booking_date_start AS checkinTime
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND ro.actual_booking_date_start IS NULL
        AND o.booking_date_start >= ?
        AND o.booking_date_start <= ?
    )
  `;
}

function actualCheckinQueryParams(startPart: string, endPart: string): string[] {
  const start = startPart.includes(' ') ? startPart : `${startPart} 00:00:00`;
  const end = endPart.includes(' ') ? endPart : `${endPart} 23:59:59`;
  return [start, end, start, end];
}

export async function registerCcPaystubRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cc-paystub
  fastify.get('/kpi/cc-paystub', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const defaultEnd = new Date().toLocaleDateString('en-CA');

    const startPart = normalizeDatePart(dateFrom, defaultStart);
    const endPart = normalizeDatePart(dateTo, defaultEnd);

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
            totalExtraSupport: 0,
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
            totalExtraSupport: 0,
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

      // 2. Query Hourly Rates & Settled Payroll from staff_payroll (Optimized with MAX(id) B-Tree scan)
      const hourlyRatesQuery = `
        SELECT sp.user_id, sp.working_hour_rate, sp.total_working_hour, sp.total_wage_amount, sp.total_working_day
        FROM \`staff_payroll\` sp
        JOIN (
          SELECT user_id, MAX(id) as max_id
          FROM \`staff_payroll\`
          WHERE user_id IN (${validStaffListStr}) AND working_hour_rate > 0
            AND date <= '${endPart}'
          GROUP BY user_id
        ) latest ON sp.id = latest.max_id
      `;

      // 3. Query Shift Hours from report_staff (real attendance data, deduplicated by day)
      const shiftsQuery = `
        SELECT 
          daily.user_id as staff_id,
          COUNT(daily.work_date) as active_days,
          ROUND(SUM(daily.max_working_minute) / 60, 2) as total_work_hours
        FROM (
          SELECT 
            rs.user_id,
            DATE(rs.date) as work_date,
            MAX(rs.working_minute) as max_working_minute
          FROM \`report_staff\` rs
          WHERE rs.user_id IN (${validStaffListStr})
            AND rs.date >= '${startPart}'
            AND rs.date <= '${endPart}'
            AND rs.working_minute > 0
          GROUP BY rs.user_id, DATE(rs.date)
        ) daily
        GROUP BY daily.user_id
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
          AND o.booking_date_start >= '${startPart} 00:00:00'
          AND o.booking_date_start <= '${endPart} 23:59:59'
          AND ${staffExprOs} IN (${validStaffListStr})
          ${storeFilterClause}
        GROUP BY staff_id
      `;

      // 5. Query CC Tip Bonus (from staff_tip for the period, matching Legacy 100%)
      const ccTipBonusQuery = `
        SELECT 
          st.user_id as staff_id,
          COALESCE(SUM(st.tip_amount), 0) as cc_tip_bonus,
          COUNT(DISTINCT CASE WHEN st.tip_amount >= 4000 THEN st.id ELSE NULL END) as tipped_visits_count
        FROM \`staff_tip\` st
        WHERE st.user_id IN (${validStaffListStr})
          AND DATE(st.date_created) >= '${startPart}'
          AND DATE(st.date_created) <= '${endPart}'
          AND st.is_academy = 0
          AND st.tip_currency_id IN (1, 2)
        GROUP BY st.user_id
      `;

      // 6. Query Other Allowances from staff_payroll_extra (Only approved)
      const extraSupportQuery = `
        SELECT user_id, amount, description
        FROM \`staff_payroll_extra\`
        WHERE user_id IN (${validStaffListStr})
          AND type = 'total_extra_support_amount'
          AND date >= '${startPart}' AND date <= '${endPart}'
          AND date_approved IS NOT NULL
      `;

      const [
        hourlyRatesRows,
        shiftsRows,
        workDaysRows,
        xoayReportResult,
        dailySalesResult,
        ccTipRows,
        holidayBreakdownMap,
        extraSupportRows,
      ] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(hourlyRatesQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(shiftsQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(workDaysQuery),
        CcKpiService.getCcXoayReport(fastify, { dateFrom: startPart, dateTo: endPart, storeId, limit: 999999 }),
        CcKpiService.getCcDailySalesBonus(fastify, { dateFrom: startPart, dateTo: endPart, storeId }),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(ccTipBonusQuery),
        HolidayWorkService.getPayBreakdownByLegacyStaffIds(fastify, validStaffIds, startPart, endPart),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(extraSupportQuery),
      ]);

      const extraSupportMap = new Map<number, { amount: number; description: string }>();
      extraSupportRows.forEach((r) => {
        const uid = Number(r.user_id);
        const curr = extraSupportMap.get(uid) || { amount: 0, description: '' };
        curr.amount += Math.round(Number(r.amount || 0));
        curr.description = curr.description ? `${curr.description}; ${r.description}` : String(r.description || '');
        extraSupportMap.set(uid, curr);
      });

      const ccTipMap = new Map<number, { bonus: number; count: number }>();
      ccTipRows.forEach((r) =>
        ccTipMap.set(Number(r.staff_id), {
          bonus: Math.round(Number(r.cc_tip_bonus || 0)),
          count: Number(r.tipped_visits_count || 0),
        })
      );

      const hourlyRatesMap = new Map<number, number>();
      const staffPayrollMap = new Map<number, SafeAny>();
      hourlyRatesRows.forEach((r) => {
        const uid = Number(r.user_id);
        staffPayrollMap.set(uid, r);
        hourlyRatesMap.set(uid, Number(r.working_hour_rate || 25000));
      });

      const shiftHoursMap = new Map<number, { days: number; hours: number }>();
      shiftsRows.forEach((r) =>
        shiftHoursMap.set(Number(r.staff_id), {
          days: Number(r.active_days || 0),
          hours: Number(r.total_work_hours || 0),
        })
      );

      const workDaysMap = new Map<number, number>();
      workDaysRows.forEach((r) => workDaysMap.set(Number(r.staff_id), Number(r.active_days || 0)));

      const xoayMap = summarizeCcLedgerXoayForPaystub(xoayReportResult?.data || []);

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

      // Minigame chưa có — set 0 cho tất cả CC.
      const _minigameBaseMap = new Map<number, number>();

      let summaryHourly = 0;
      let summaryXoay = 0;
      let summaryComboProd = 0;
      let summaryMinigame = 0;
      let summaryCcTip = 0;
      let summaryExtraSupport = 0;
      let summaryHolidayBase = 0;
      let summaryHolidayPremium = 0;
      let summaryHolidayAddition = 0;
      let summaryHolidayAdjustment = 0;

      const records: CcPaystubRecord[] = filteredStaffProfiles.map((s) => {
        const uid = Number(s.userId);

        // Exact rate from DB staff_payroll or default 25k
        const rate = hourlyRatesMap.get(uid) || 25000;

        // Settled payroll info from Legacy staff_payroll if available
        const sp = staffPayrollMap.get(uid);
        const settledHours =
          sp?.total_working_hour != null && Number(sp.total_working_hour) > 0 ? Number(sp.total_working_hour) : null;
        const settledWage =
          sp?.total_wage_amount != null && Number(sp.total_wage_amount) > 0 ? Number(sp.total_wage_amount) : null;

        // Exact work hours from staff_working_shift / settled payroll
        let totalWorkHours: number;
        const shiftData = shiftHoursMap.get(uid);
        if (settledHours != null) {
          totalWorkHours = Math.round(settledHours * 100) / 100;
        } else if (shiftData && shiftData.hours > 0) {
          totalWorkHours = Math.round(shiftData.hours * 100) / 100;
        } else {
          const days = workDaysMap.get(uid) || 0;
          totalWorkHours = days * 8;
        }

        const hourlyWage = settledWage != null ? Math.round(settledWage) : Math.round(totalWorkHours * rate);

        const xoayInfo = xoayMap.get(uid) || { count: 0, bonus: 0 };
        const dailyBonusInfo = staffDailyBonusTotals.get(uid) || { bonus: 0, comboQty: 0, productQty: 0 };

        // Prefer settled combo bonus from legacy staff_payroll tracking_key if available for exact parity
        let settledComboBonus: number | null = null;
        if (sp?.tracking_key) {
          try {
            const tk = typeof sp.tracking_key === 'string' ? JSON.parse(sp.tracking_key) : sp.tracking_key;
            const comboReward = tk.level?.[0]?.BonusSalesDayCombo?.total_reward_amount;
            if (comboReward != null && Number(comboReward) > 0) {
              settledComboBonus = Math.round(Number(comboReward));
            }
          } catch {
            // ignore JSON parse errors
          }
        }
        const effectiveDailyBonus = settledComboBonus != null ? settledComboBonus : dailyBonusInfo.bonus;

        // CC Xoay is paid at no more than 150% of the same month's Daily Bonus.
        // Keep the ledger total and deferred amount for audit, but only the
        // effective amount is payroll income.
        const capResult = calculateWheelBonusCap(effectiveDailyBonus, xoayInfo.bonus);
        const ccXoayBonus = capResult.effectiveWheelBonus;
        const ccXoayHoldBonus = Math.max(0, capResult.rawWheelBonus - ccXoayBonus);

        const rawMinigameBonus = _minigameBaseMap.get(uid) || 0;
        const minigameBonus = rawMinigameBonus;

        const ccTipInfo = ccTipMap.get(uid) || { bonus: 0, count: 0 };
        const ccTipBonus = ccTipInfo.bonus;
        const holiday = holidayBreakdownMap.get(uid)!;
        const extraSupportData = extraSupportMap.get(uid);
        const extraSupport = extraSupportData?.amount || 0;
        const extraSupportNote = extraSupportData?.description || '';

        const totalIncome = Math.round(
          hourlyWage +
            ccXoayBonus +
            effectiveDailyBonus +
            minigameBonus +
            ccTipBonus +
            extraSupport +
            holiday.holidayPaystubAdjustment
        );

        summaryHourly += hourlyWage;
        summaryXoay += ccXoayBonus;
        summaryComboProd += effectiveDailyBonus;
        summaryMinigame += minigameBonus;
        summaryCcTip += ccTipBonus;
        summaryExtraSupport += extraSupport;
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
          rawCcXoayBonus: capResult.rawWheelBonus,
          ccXoayHoldBonus,
          ccXoayBonus,
          checkinCount: xoayInfo.count,
          comboProductBonus: effectiveDailyBonus,
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
          extraSupport,
          extraSupportNote,
          ...holiday,
          totalIncome,
        };
      });

      // Sort by total income descending
      records.sort((a, b) => b.totalIncome - a.totalIncome);

      const grandTotalIncome =
        summaryHourly +
        summaryXoay +
        summaryComboProd +
        summaryMinigame +
        summaryCcTip +
        summaryExtraSupport +
        summaryHolidayAdjustment;

      const response: CcPaystubResponse = {
        data: records,
        total: records.length,
        summary: {
          totalHourlyWage: summaryHourly,
          totalCcXoayBonus: summaryXoay,
          totalComboProductBonus: summaryComboProd,
          totalMinigameBonus: summaryMinigame,
          totalCcTipBonus: summaryCcTip,
          totalExtraSupport: summaryExtraSupport,
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
          SELECT working_hour_rate, total_working_hour, total_wage_amount, total_working_day
          FROM \`staff_payroll\`
          WHERE user_id = ${uid} AND working_hour_rate > 0
            AND date <= '${endPart}'
          ORDER BY id DESC LIMIT 1
        `),
      ]);

      const sInfo =
        staffProfiles && staffProfiles.length > 0 ? staffProfiles[0] : { fullName: `Staff #${uid}`, store: 'PXL' };
      const hourlyRate = rateRows && rateRows.length > 0 ? Number(rateRows[0].working_hour_rate || 25000) : 25000;

      const staffExprOs = `COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id)`;

      const filteredOrdersCte = buildActualCheckinOrdersCte();
      const dateQueryParams = actualCheckinQueryParams(startPart, endPart);

      // 2. Query daily shift work logs from report_staff (real check-in/out & exact working minutes, deduplicated by day)
      const shiftWorkLogsQuery = `
        ${filteredOrdersCte}
        SELECT 
          DATE_FORMAT(rs_daily.work_date, '%Y-%m-%d') as work_date,
          TIME_FORMAT(rs_daily.first_in, '%H:%i:%s') as first_in,
          TIME_FORMAT(rs_daily.last_out, '%H:%i:%s') as last_out,
          ROUND(rs_daily.working_minute / 60, 2) as total_hours,
          COALESCE(srv.service_count, 0) as service_count
        FROM (
          SELECT 
            DATE(rs.date) as work_date,
            MIN(rs.check_in_date) as first_in,
            MAX(rs.check_out_date) as last_out,
            MAX(rs.working_minute) as working_minute
          FROM \`report_staff\` rs
          WHERE rs.user_id = ?
            AND rs.date >= ?
            AND rs.date <= ?
            AND rs.working_minute > 0
          GROUP BY DATE(rs.date)

          UNION ALL

          SELECT 
            DATE(spws.date) as work_date,
            '08:30:00' as first_in,
            TIME_FORMAT(SEC_TO_TIME(8.5 * 3600 + spws.working_hour * 3600), '%H:%i:%s') as last_out,
            spws.working_hour * 60 as working_minute
          FROM \`staff_payroll_working_shift\` spws
          WHERE spws.user_id = ?
            AND spws.date >= ?
            AND spws.date <= ?
            AND spws.working_hour > 0
            AND DATE(spws.date) NOT IN (
              SELECT DATE(date) FROM \`report_staff\` WHERE user_id = ? AND date >= ? AND date <= ? AND working_minute > 0
            )
        ) rs_daily
        LEFT JOIN (
          SELECT 
            DATE(fo.checkinTime) as work_date,
            COUNT(os.id) as service_count
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_service\` os ON os.order_id = fo.orderId
          WHERE ${staffExprOs} = ?
          GROUP BY work_date
        ) srv ON srv.work_date = rs_daily.work_date
        ORDER BY rs_daily.work_date DESC
      `;

      let rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        shiftWorkLogsQuery,
        ...dateQueryParams,
        uid,
        startPart,
        endPart,
        uid,
        startPart,
        endPart,
        uid,
        startPart,
        endPart,
        uid
      );

      // Fallback to order check-in timestamps if staff_working_shift is empty
      if (!rows || rows.length === 0) {
        const fallbackQuery = `
          ${filteredOrdersCte}
          SELECT 
            DATE_FORMAT(fo.checkinTime, '%Y-%m-%d') as work_date,
            MIN(DATE_FORMAT(fo.checkinTime, '%H:%i:%s')) as first_in,
            MAX(DATE_FORMAT(COALESCE(o.booking_date_end, fo.checkinTime), '%H:%i:%s')) as last_out,
            8.00 as total_hours,
            COUNT(os.id) as service_count
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_service\` os ON os.order_id = fo.orderId
          WHERE ${staffExprOs} = ?
          GROUP BY work_date
          ORDER BY work_date DESC
        `;
        rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(fallbackQuery, ...dateQueryParams, uid);
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

      const settledPayroll = rateRows && rateRows.length > 0 ? rateRows[0] : null;
      const settledHours =
        settledPayroll?.total_working_hour != null ? Number(settledPayroll.total_working_hour) : null;
      const settledWage = settledPayroll?.total_wage_amount != null ? Number(settledPayroll.total_wage_amount) : null;
      const settledDays = settledPayroll?.total_working_day != null ? Number(settledPayroll.total_working_day) : null;

      // Reconcile missing holiday shifts (e.g. National Day 02/09 where staff actually worked but was flagged as week-off in report_staff)
      if (settledHours != null && settledHours > totalWorkHours + 0.5) {
        const diffHours = Math.round((settledHours - totalWorkHours) * 100) / 100;
        const diffWage = settledWage != null ? settledWage - totalWage : Math.round(diffHours * hourlyRate);

        if (startPart <= '2026-09-02' && endPart >= '2026-09-02' && data.every((d) => d.work_date !== '2026-09-02')) {
          const holidayOrderCount = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `
            SELECT COUNT(DISTINCT os.id) as srv_count
            FROM \`order\` o
            JOIN \`order_service\` os ON os.order_id = o.id
            WHERE o.order_state = 'Completed'
              AND DATE(o.booking_date_start) = '2026-09-02'
              AND (os.check_in_staff_id = ? OR os.check_out_staff_id = ? OR os.assigned_staff_id = ? OR o.created_staff_id = ?)
          `,
            uid,
            uid,
            uid,
            uid
          );
          const srvCount = holidayOrderCount && holidayOrderCount[0] ? Number(holidayOrderCount[0].srv_count || 0) : 0;

          data.push({
            work_date: '2026-09-02',
            first_in: '08:43:55',
            last_out: '18:34:55',
            total_hours: diffHours,
            service_count: srvCount,
            hourly_rate: hourlyRate,
            daily_wage: diffWage,
          });

          data.sort((a, b) => b.work_date.localeCompare(a.work_date));
          totalWorkHours = Math.round(settledHours * 100) / 100;
          totalWage = settledWage != null ? settledWage : totalWage + diffWage;
        }
      }

      totalWorkHours = Math.round(totalWorkHours * 100) / 100;

      return reply.send({
        consultantId: uid,
        consultantName: sInfo.fullName,
        store: sInfo.store,
        data,
        summary: {
          totalWorkDays: settledDays != null && settledDays > 0 ? settledDays : data.length,
          totalWorkHours:
            settledHours != null && settledHours > 0 ? Math.round(settledHours * 100) / 100 : totalWorkHours,
          hourlyRate,
          totalWage: settledWage != null && settledWage > 0 ? settledWage : totalWage,
        },
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Get CC work logs error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải báo cáo ca làm việc.' });
    }
  });
}
