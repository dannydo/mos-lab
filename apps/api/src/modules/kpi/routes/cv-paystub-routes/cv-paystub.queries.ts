import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { TeamService } from '../../../teams/team.service.js';
import { StaffOffDayService } from '../../../staff/services/staff-off-day.service.js';
import { HolidayWorkService } from '../../../holiday-work/holiday-work.service.js';
import {
  createFastifyLegacyTipExecutor,
  CvlTrainingMentorshipService,
} from '../../services/cvl-training-mentorship.service.js';
import { CvPaystubRawSources, getExtendedWeekBounds } from './cv-paystub.helpers.js';

export async function fetchActiveCvStaffProfiles(
  fastify: FastifyInstance,
  storeId?: string
): Promise<{ activeCvIds: number[]; filteredStaffProfiles: SafeAny[] }> {
  // 1. Get active CV staff IDs from TeamService (Single Source of Truth)
  const activeCvIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');
  if (activeCvIds.length === 0) {
    return { activeCvIds, filteredStaffProfiles: [] };
  }

  const staffListStr = activeCvIds.join(',');

  // Fetch Staff Profiles & Store Info (Excluding CC / Non-CV Staff)
  const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT 
      up.user_id as userId,
      up.full_name as fullName,
      up.avatar as avatar,
      UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
      up.date_created
    FROM \`user_profile\` up
    LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
    LEFT JOIN \`user_group_language\` ugl ON up.user_group_id = ugl.user_group_id AND ugl.language_id = 1
    WHERE up.user_id IN (${staffListStr})
      AND NOT (
        ugl.user_group_name LIKE '%Client Consultant%'
        OR ugl.user_group_name LIKE '%Tư Vấn%'
        OR ugl.user_group_name LIKE '%Telesales%'
        OR ugl.user_group_name LIKE '%Online Consultant%'
        OR up.user_id IN (SELECT DISTINCT user_id FROM staff_payroll_client_consultant)
        OR up.full_name LIKE '% CC%'
        OR up.full_name LIKE '%(CC)%'
      )
  `);

  let filteredStaffProfiles = staffProfiles;
  if (storeId && storeId !== 'ALL') {
    filteredStaffProfiles = staffProfiles.filter((s) => s.store.toUpperCase() === storeId.toUpperCase());
  }

  return { activeCvIds, filteredStaffProfiles };
}

export async function fetchCvPaystubSources(
  fastify: FastifyInstance,
  validStaffIds: number[],
  startPart: string,
  endPart: string
): Promise<CvPaystubRawSources> {
  const validStaffListStr = validStaffIds.join(',');

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
    SELECT sp.user_id, sp.working_hour_rate, sp.social_security_rate, sp.total_social_security_amount, sp.total_support_parking_amount,
           sp.total_wage_amount, sp.total_base_amount, sp.total_amount,
           sp.total_working_hour,
           sp.total_working_hour_expected, sp.total_working_day_expected,
           sp.total_day_off_week, sp.total_day_overtime_daytime_off_week, sp.total_overtime_daytime_off_week_amount,
           sp.total_day_off_month, sp.total_day_off_paid_leave, sp.total_off_month_amount, sp.total_off_paid_leave_amount,
           sp.total_day_off_public_holiday, sp.total_off_public_holiday_amount,
           sp.total_day_off_punish, sp.total_off_punish_amount,
           sp.total_day_off_program,
           sp.total_overtime_daytime_amount,
           sp.total_extra_support_amount, sp.total_extra_last_month_amount, sp.total_extra_punish_amount, sp.total_punish_credit_balance_amount,
           sp.total_welfare_fund_amount, sp.total_extra_advance_amount,
           sp.day_off_available, sp.tracking_key,
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

  // Calculate extended boundaries to query entire weeks
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

  // 4. Query CV Xoay Cash Bonus
  const cvXoayBonusQuery = `
    SELECT 
      os.assigned_staff_id as staff_id,
      COUNT(DISTINCT os.id) as service_count,
      COALESCE(SUM(CASE WHEN sb.bonus_type = 'Cash' AND sb.user_id = os.assigned_staff_id THEN sb.bonus_amount ELSE 0 END), 0) as total_bonus
    FROM \`order_service\` os
    JOIN \`order\` o ON os.order_id = o.id
    JOIN \`report_order\` ro ON o.id = ro.order_id
    LEFT JOIN \`staff_bonus\` sb ON os.id = sb.order_service_id
    WHERE os.assigned_staff_id IN (${validStaffListStr})
      AND ro.date BETWEEN '${startPart}' AND '${endPart}'
      AND o.order_state = 'Completed'
    GROUP BY os.assigned_staff_id
  `;

  // 5. Query CV Tip (StaffTipRunner đã ghi thẳng 90%/80%/70%/20%/10% vào st.tip_amount & st.tip_percentage)
  const cvTipBonusQuery = `
    SELECT 
      st.user_id as staff_id,
      COALESCE(SUM(st.tip_amount), 0) as total_cv_tip,
      COALESCE(SUM(
        CASE
          WHEN COALESCE(st.tip_percentage, 70) >= 70
            THEN ROUND(st.tip_amount * 70 / COALESCE(NULLIF(st.tip_percentage, 0), 70))
          ELSE 0
        END
      ), 0) as base_tech_tip
    FROM \`staff_tip\` st
    JOIN \`order\` o ON st.order_id = o.id
    LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
    WHERE st.user_id IN (${validStaffListStr})
      AND COALESCE(ro.date, DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))) BETWEEN '${startPart}' AND '${endPart}'
      AND o.order_state = 'Completed'
    GROUP BY st.user_id
  `;

  // 6. Query CV Points (for Level calculation)
  const techPointsQuery = `
    SELECT 
      sb.user_id as staff_id,
      COALESCE(SUM(sb.bonus_amount), 0) as total_points
    FROM \`staff_bonus\` sb
    JOIN \`order_service\` os ON sb.order_service_id = os.id
    JOIN \`order\` o ON os.order_id = o.id
    JOIN \`report_order\` ro ON o.id = ro.order_id
    WHERE sb.user_id IN (${validStaffListStr})
      AND sb.bonus_type = 'BonusPoint'
      AND ro.date BETWEEN '${startPart}' AND '${endPart}'
      AND o.order_state = 'Completed'
    GROUP BY sb.user_id
  `;

  // 7. Query Approved Month-off Leaves (attribute_option_id = 111) with scheduled shift hours
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

  // 8. Query Other Allowances from staff_payroll_extra (Only approved)
  const extraSupportQuery = `
    SELECT user_id, amount, description
    FROM \`staff_payroll_extra\`
    WHERE user_id IN (${validStaffListStr})
      AND type = 'total_extra_support_amount'
      AND date BETWEEN '${startPart}' AND '${endPart}'
      AND date_approved IS NOT NULL
  `;

  // Staff metadata and the seniority configuration are independent CRM reads.
  // Preserve the config fallback if its optional record cannot be loaded.
  const [
    crmStaffs,
    seniorityConfigRecord,
    contractRatesRows,
    periodPayrollRows,
    reportStaffRows,
    cvXoayBonusRows,
    cvTipBonusRows,
    techPointsRows,
    monthOffLeavesRows,
    staffOffDayBatchMap,
    holidayBreakdownMap,
    holidayWorkedDateMap,
    extraSupportRows,
    mosAllowances,
    careerConfigRecord,
    cvPlusProgressions,
    activeTrainingPairs,
  ] = await Promise.all([
    fastify.prisma.crm.crmStaff.findMany({
      where: { legacyStaffId: { in: validStaffIds } },
      select: {
        legacyStaffId: true,
        joinedAt: true,
        seniorityOffset: true,
      },
    }),
    fastify.prisma.crm.crmConfig.findUnique({ where: { key: 'CV_SENIORITY_BONUS_CONFIG' } }).catch((error: unknown) => {
      fastify.log.warn(error, 'Could not load CV_SENIORITY_BONUS_CONFIG, using default list.');
      return null;
    }),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(contractRatesQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(periodPayrollQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(reportStaffQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(cvXoayBonusQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(cvTipBonusQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(techPointsQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(monthOffLeavesQuery),
    StaffOffDayService.getBatchStaffOffDays(fastify, validStaffIds),
    HolidayWorkService.getPayBreakdownByLegacyStaffIds(fastify, validStaffIds, startPart, endPart),
    HolidayWorkService.getPublishedHolidayWorkedDateKeys(fastify, validStaffIds, startPart, endPart),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(extraSupportQuery),
    fastify.prisma.crm.crmCvPayrollAllowance.findMany({
      where: {
        staffId: { in: validStaffIds },
        month: startPart.substring(0, 7),
      },
      orderBy: { id: 'asc' },
    }),
    fastify.prisma.crm.crmConfig.findUnique({ where: { key: 'CAREER_PROGRESSION_RULES' } }).catch(() => null),
    fastify.prisma.crm.crmCareerProgression.findMany({
      where: {
        staff: { legacyStaffId: { in: validStaffIds } },
        OR: [{ targetRole: 'CV_PLUS', status: 'PROMOTED' }, { currentRole: { in: ['CV_PLUS', 'CV_PLUS_PLUS'] } }],
        promotedAt: { not: null },
      },
      include: { staff: true },
    }),
    CvlTrainingMentorshipService.getActivePairsForRange(fastify, startPart, endPart),
  ]);

  await CvlTrainingMentorshipService.reconcileTrainingCvlStaffTips(
    createFastifyLegacyTipExecutor(fastify),
    activeTrainingPairs
  );

  const transferredTrainingTipMap = await CvlTrainingMentorshipService.queryTransferredCcTipsByMentee(
    fastify,
    activeTrainingPairs,
    startPart,
    endPart
  );

  return {
    crmStaffs,
    seniorityConfigRecord,
    contractRatesRows,
    periodPayrollRows,
    reportStaffRows,
    cvXoayBonusRows,
    cvTipBonusRows,
    techPointsRows,
    monthOffLeavesRows,
    staffOffDayBatchMap,
    holidayBreakdownMap,
    holidayWorkedDateMap,
    extraSupportRows,
    mosAllowances,
    careerConfigRecord,
    cvPlusProgressions,
    activeTrainingPairs,
    transferredTrainingTipMap,
  };
}
