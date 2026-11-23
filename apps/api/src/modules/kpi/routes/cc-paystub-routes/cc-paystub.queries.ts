import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { TeamService } from '../../../teams/team.service.js';
import { StaffOffDayService } from '../../../staff/services/staff-off-day.service.js';
import { HolidayWorkService } from '../../../holiday-work/holiday-work.service.js';
import { CcKpiService } from '../../services/cc-kpi.service.js';
import {
  buildExcludeTrainingCvlOrderSql,
  createFastifyLegacyTipExecutor,
  CvlTrainingMentorshipService,
} from '../../services/cvl-training-mentorship.service.js';
import { CcMentorPayoutService } from '../../services/cc-mentor-payout.service.js';
import { CcPaystubRawSources, getExtendedWeekBounds } from './cc-paystub.helpers.js';

export async function fetchActiveCcStaffProfiles(
  fastify: FastifyInstance,
  storeId?: string
): Promise<{ activeCcIds: number[]; filteredStaffProfiles: SafeAny[] }> {
  // 1. Get active CC staff IDs from TeamService (Single Source of Truth)
  const activeCcIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CC', 'ACTIVE_CC_STAFF_CONFIG');
  if (activeCcIds.length === 0) {
    return { activeCcIds, filteredStaffProfiles: [] };
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

  return { activeCcIds, filteredStaffProfiles };
}

export async function fetchCcPaystubSources(
  fastify: FastifyInstance,
  validStaffIds: number[],
  startPart: string,
  endPart: string,
  storeId?: string
): Promise<CcPaystubRawSources> {
  const validStaffListStr = validStaffIds.join(',');

  let storeFilterClause = '';
  if (storeId && storeId !== 'ALL') {
    storeFilterClause = `AND o.client_store_id IN (SELECT id FROM \`client_store\` WHERE UPPER(client_store_key) = '${storeId.toUpperCase()}')`;
  }

  const staffExprOs = `COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id)`;

  // 2. Query Contract Rates (working_hour_rate, social_security_rate) from latest staff_payroll
  const contractRatesQuery = `
    SELECT sp.user_id, sp.working_hour_rate, sp.social_security_rate
    FROM \`staff_payroll\` sp
    JOIN (
      SELECT user_id, MAX(id) as max_id
      FROM \`staff_payroll\`
      WHERE user_id IN (${validStaffListStr}) AND working_hour_rate > 0
        AND date <= '${endPart}'
      GROUP BY user_id
    ) latest ON sp.id = latest.max_id
  `;

  // 3. Query Period-Specific Settled Payroll from staff_payroll (strictly within requested month)
  const periodPayrollQuery = `
    SELECT 
      sp.user_id, 
      sp.working_hour_rate, 
      sp.total_working_hour, 
      sp.total_wage_amount, 
      sp.total_working_day,
      sp.social_security_rate,
      sp.total_social_security_amount,
      sp.total_support_parking_amount,
      sp.total_working_day_expected,
      sp.total_working_hour_expected,
      sp.total_day_off_week,
      sp.total_off_week_amount,
      sp.total_overtime_daytime_off_week_amount,
      sp.total_day_off_month,
      sp.total_off_month_amount,
      sp.total_day_off_public_holiday,
      sp.total_off_public_holiday_amount,
      sp.total_day_off_punish,
      sp.total_off_punish_amount,
      sp.total_day_off_program,
      sp.total_extra_last_month_amount,
      sp.total_extra_punish_amount,
      sp.total_punish_credit_balance_amount,
      sp.total_welfare_fund_amount,
      sp.total_extra_advance_amount,
      sp.total_amount,
      sp.day_off_available,
      sp.tracking_key,
      DATE_FORMAT(sp.date, '%Y-%m-%d') as payroll_date,
      sp.date_completed
    FROM \`staff_payroll\` sp
    JOIN (
      SELECT user_id, MAX(id) as max_id
      FROM \`staff_payroll\`
      WHERE user_id IN (${validStaffListStr})
        AND date >= '${startPart}' AND date <= '${endPart}'
      GROUP BY user_id
    ) m ON sp.id = m.max_id
  `;

  // Calculate extended boundaries to query entire weeks for off-day work detection
  const { extendedStartMonday, extendedEndStr } = getExtendedWeekBounds(startPart, endPart);

  // Query extended attendance for all users (deduplicated by day)
  const reportStaffQuery = `
    SELECT 
      rs.user_id as staff_id,
      DATE_FORMAT(rs.date, '%Y-%m-%d') as dateStr,
      MAX(rs.working_minute) as working_minute
    FROM \`report_staff\` rs
    WHERE rs.user_id IN (${validStaffListStr})
      AND rs.date >= '${extendedStartMonday}'
      AND rs.date <= '${extendedEndStr}'
      AND rs.working_minute > 0
    GROUP BY rs.user_id, DATE(rs.date)
  `;

  // 3. Query Shift Hours from report_staff for the requested range (deduplicated by day)
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

  // 4. Query Approved Month-off Leaves (attribute_option_id = 111) with scheduled shift hours
  const monthOffLeavesQuery = `
    SELECT 
      sdo.from_user_id as staff_id,
      DATE_FORMAT(sdo.from_date, '%Y-%m-%d') as dateStr,
      COALESCE(sdo.working_day_count, 1) as working_day_count,
      sdo.note,
      COALESCE(TIMESTAMPDIFF(HOUR, sws.start_time, sws.end_time), 9) as shift_hours
    FROM \`staff_day_off\` sdo
    LEFT JOIN \`staff_working_shift\` sws 
      ON sws.user_id = sdo.from_user_id 
      AND sws.date = DATE(sdo.from_date)
    WHERE sdo.from_user_id IN (${validStaffListStr})
      AND sdo.attribute_option_id = 111
      AND sdo.request_state = 'Approved'
      AND sdo.from_date BETWEEN '${startPart}' AND '${endPart}'
  `;

  const activeTrainingPairs = await CvlTrainingMentorshipService.getActivePairsForRange(fastify, startPart, endPart);
  await CvlTrainingMentorshipService.reconcileTrainingCvlStaffTips(
    createFastifyLegacyTipExecutor(fastify),
    activeTrainingPairs
  );
  const excludeTrainingCcTipSql = buildExcludeTrainingCvlOrderSql(
    activeTrainingPairs,
    'st.order_id',
    'COALESCE(ro.date, DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start, st.date_created_only)))'
  );

  // 5. Query CC Tip Bonus (from staff_tip for the period, matching Legacy 100%, excluding training CVL orders per CC-006)
  const ccTipBonusQuery = `
    SELECT 
      st.user_id as staff_id,
      COALESCE(SUM(st.tip_amount), 0) as cc_tip_bonus,
      COUNT(DISTINCT CASE WHEN st.tip_amount >= 4000 THEN st.id ELSE NULL END) as tipped_visits_count
    FROM \`staff_tip\` st
    LEFT JOIN \`order\` o ON o.id = st.order_id
    LEFT JOIN \`report_order\` ro ON ro.order_id = o.id
    WHERE st.user_id IN (${validStaffListStr})
      AND st.date_created_only >= '${startPart}'
      AND st.date_created_only <= '${endPart}'
      AND st.is_academy = 0
      AND st.tip_currency_id IN (1, 2)
      ${excludeTrainingCcTipSql}
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
    contractRatesRows,
    periodPayrollRows,
    shiftsRows,
    workDaysRows,
    reportStaffRows,
    monthOffLeavesRows,
    staffOffDayBatchMap,
    holidayBreakdownMap,
    holidayWorkedDateMap,
    xoayReportResult,
    dailySalesResult,
    ccTipRows,
    extraSupportRows,
    mosAllowances,
    mentorBreakdownsByCc,
  ] = await Promise.all([
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(contractRatesQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(periodPayrollQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(shiftsQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(workDaysQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(reportStaffQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(monthOffLeavesQuery),
    StaffOffDayService.getBatchStaffOffDays(fastify, validStaffIds),
    HolidayWorkService.getPayBreakdownByLegacyStaffIds(fastify, validStaffIds, startPart, endPart),
    HolidayWorkService.getPublishedHolidayWorkedDateKeys(fastify, validStaffIds, startPart, endPart),
    CcKpiService.getCcXoayReport(fastify, { dateFrom: startPart, dateTo: endPart, storeId, limit: 999999 }),
    CcKpiService.getCcDailySalesBonus(fastify, { dateFrom: startPart, dateTo: endPart, storeId }),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(ccTipBonusQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(extraSupportQuery),
    fastify.prisma.crm.crmCvPayrollAllowance.findMany({
      where: {
        staffId: { in: validStaffIds },
        month: startPart.substring(0, 7),
      },
      orderBy: { id: 'asc' },
    }),
    CcMentorPayoutService.calculateMentorBreakdownsByCc(fastify, activeTrainingPairs, startPart, endPart),
  ]);

  return {
    contractRatesRows,
    periodPayrollRows,
    shiftsRows,
    workDaysRows,
    reportStaffRows,
    monthOffLeavesRows,
    staffOffDayBatchMap,
    holidayBreakdownMap,
    holidayWorkedDateMap,
    xoayReportResult,
    dailySalesResult,
    ccTipRows,
    extraSupportRows,
    mosAllowances,
    mentorBreakdownsByCc,
  };
}
