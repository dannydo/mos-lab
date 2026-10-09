import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../../middlewares/auth.js';
import {
  CvOtherAllowanceItem,
  CvPaystubRecord,
  CvPaystubResponse,
  CvWorkLogDetailRecord,
  CvWorkLogDetailResponse,
  SafeAny,
} from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';
import { StaffOffDayService } from '../../staff/services/staff-off-day.service.js';
import { HolidayWorkService } from '../../holiday-work/holiday-work.service.js';

const getLocalDate = (dStr: string) => {
  const p = dStr.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
};

const getMondayStr = (d: Date) => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

const getIsoWeekday = (d: Date) => {
  const day = d.getDay();
  return day === 0 ? 7 : day;
};

export async function registerCvPaystubRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cv-seniority-config
  fastify.get('/kpi/cv-seniority-config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CV_SENIORITY_BONUS_CONFIG' },
      });
      if (configRecord && configRecord.value) {
        return reply.send(JSON.parse(configRecord.value));
      }
      // Default fallback
      const defaultRules = [
        { minMonths: 6, bonusPercent: 5 },
        { minMonths: 12, bonusPercent: 10 },
        { minMonths: 24, bonusPercent: 20 },
      ];
      return reply.send(defaultRules);
    } catch (err) {
      fastify.log.error(err as Error, 'Error loading CV seniority config');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy cấu hình thâm niên.' });
    }
  });

  // POST /api/kpi/cv-seniority-config (Admin only)
  fastify.post(
    '/kpi/cv-seniority-config',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      const { rules } = request.body as { rules: { minMonths: number; bonusPercent: number }[] };
      if (!Array.isArray(rules)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'rules phải là một mảng.' });
      }
      try {
        const cleanRules = rules
          .map((r) => ({
            minMonths: Number(r.minMonths),
            bonusPercent: Number(r.bonusPercent),
          }))
          .filter((r) => !isNaN(r.minMonths) && !isNaN(r.bonusPercent));

        const jsonValue = JSON.stringify(cleanRules);
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'CV_SENIORITY_BONUS_CONFIG' },
          update: { value: jsonValue, updatedAt: new Date() },
          create: { key: 'CV_SENIORITY_BONUS_CONFIG', value: jsonValue },
        });
        return reply.send({ success: true, rules: cleanRules });
      } catch (err) {
        fastify.log.error(err as Error, 'Save CV seniority config error');
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lưu cấu hình thâm niên.' });
      }
    }
  );

  // GET /api/kpi/cv-paystub
  fastify.get('/kpi/cv-paystub', { preHandler: [requireAuth] }, async (request, reply) => {
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
      // 1. Get active CV staff IDs from TeamService (Single Source of Truth)
      const activeCvIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');

      if (activeCvIds.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: {
            totalHourlyWage: 0,
            totalCvXoayBonus: 0,
            totalCvTipBonus: 0,
            totalSeniorityBonus: 0,
            totalHolidayBasePay: 0,
            totalHolidayPremiumPay: 0,
            totalHolidayPayrollAddition: 0,
            grandTotalIncome: 0,
          },
        });
      }

      const staffListStr = activeCvIds.join(',');

      // Fetch Staff Profiles & Store Info (Excluding CC / Non-Technician Staff)
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

      if (filteredStaffProfiles.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: {
            totalHourlyWage: 0,
            totalCvXoayBonus: 0,
            totalCvTipBonus: 0,
            totalSeniorityBonus: 0,
            totalHolidayBasePay: 0,
            totalHolidayPremiumPay: 0,
            totalHolidayPayrollAddition: 0,
            grandTotalIncome: 0,
          },
        });
      }

      const validStaffIds = filteredStaffProfiles.map((s) => Number(s.userId));
      const validStaffListStr = validStaffIds.join(',');

      // Staff metadata and the seniority configuration are independent CRM reads.
      // Preserve the config fallback if its optional record cannot be loaded.
      const [crmStaffs, seniorityConfigRecord] = await Promise.all([
        fastify.prisma.crm.crmStaff.findMany({
          where: { legacyStaffId: { in: validStaffIds } },
          select: {
            legacyStaffId: true,
            joinedAt: true,
            seniorityOffset: true,
          },
        }),
        fastify.prisma.crm.crmConfig
          .findUnique({ where: { key: 'CV_SENIORITY_BONUS_CONFIG' } })
          .catch((error: unknown) => {
            fastify.log.warn(error, 'Could not load CV_SENIORITY_BONUS_CONFIG, using default list.');
            return null;
          }),
      ]);

      // Fetch crm_staff to get joinedAt and seniorityOffset
      const crmStaffMap = new Map<number, { joinedAt: Date; seniorityOffset: number }>();
      crmStaffs.forEach((s) => {
        if (s.legacyStaffId) {
          crmStaffMap.set(s.legacyStaffId, {
            joinedAt: s.joinedAt || new Date(),
            seniorityOffset: s.seniorityOffset || 0,
          });
        }
      });

      // Load Seniority Bonus Config
      let seniorityBonusConfig = [
        { minMonths: 6, bonusPercent: 5 },
        { minMonths: 12, bonusPercent: 10 },
        { minMonths: 24, bonusPercent: 20 },
      ];
      try {
        if (seniorityConfigRecord?.value) {
          const parsed = JSON.parse(seniorityConfigRecord.value);
          if (Array.isArray(parsed)) {
            seniorityBonusConfig = parsed;
          }
        }
      } catch {
        fastify.log.warn('Could not parse CV_SENIORITY_BONUS_CONFIG, using default list.');
      }

      // 2. Query Hourly Rates and Social Security from staff_payroll (Optimized with MAX(id) B-Tree scan)
      const hourlyRatesQuery = `
        SELECT sp.user_id, sp.working_hour_rate, sp.social_security_rate, sp.total_social_security_amount, sp.total_support_parking_amount,
               sp.total_wage_amount, sp.total_base_amount, sp.total_amount,
               sp.total_working_hour_expected, sp.total_working_day_expected,
               sp.total_day_off_week, sp.total_day_overtime_daytime_off_week, sp.total_overtime_daytime_off_week_amount,
               sp.total_day_off_month, sp.total_day_off_paid_leave, sp.total_off_month_amount, sp.total_off_paid_leave_amount,
               sp.total_day_off_public_holiday, sp.total_off_public_holiday_amount,
               sp.total_day_off_punish, sp.total_off_punish_amount,
               sp.total_day_off_program,
               sp.total_overtime_daytime_amount,
               sp.total_extra_support_amount, sp.total_extra_last_month_amount, sp.total_extra_punish_amount, sp.total_punish_credit_balance_amount,
               sp.total_welfare_fund_amount, sp.total_extra_advance_amount,
               sp.day_off_available, sp.tracking_key
        FROM \`staff_payroll\` sp
        JOIN (
          SELECT user_id, MAX(id) as max_id
          FROM \`staff_payroll\`
          WHERE user_id IN (${validStaffListStr}) AND working_hour_rate > 0
            AND date <= '${endPart}'
          GROUP BY user_id
        ) latest ON sp.id = latest.max_id
      `;
      // Calculate extended boundaries to query entire weeks
      const startDate = getLocalDate(startPart);
      const endDate = getLocalDate(endPart);

      const extendedStartMonday = getMondayStr(startDate);
      const endMonday = getLocalDate(getMondayStr(endDate));
      const extendedEndSunday = new Date(endMonday);
      extendedEndSunday.setDate(endMonday.getDate() + 6);
      const extendedEndStr = extendedEndSunday.toISOString().split('T')[0];

      // Query extended attendance for all users
      const reportStaffQuery = `
        SELECT 
          rs.user_id as staff_id,
          DATE_FORMAT(rs.date, '%Y-%m-%d') as dateStr,
          rs.working_minute
        FROM \`report_staff\` rs
        WHERE rs.user_id IN (${validStaffListStr})
          AND rs.date >= '${extendedStartMonday}'
          AND rs.date <= '${extendedEndStr}'
          AND rs.working_minute > 0
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

      // 5. Query CV Tip (st.tip_amount is already the 70% tip bonus)
      const cvTipBonusQuery = `
        SELECT 
          st.user_id as staff_id,
          COALESCE(SUM(st.tip_amount), 0) as total_cv_tip
        FROM \`staff_tip\` st
        JOIN \`order\` o ON st.order_id = o.id
        JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE st.user_id IN (${validStaffListStr})
          AND ro.date BETWEEN '${startPart}' AND '${endPart}'
          AND o.order_state = 'Completed'
        GROUP BY st.user_id
      `;

      // 6. Query Technician Points (for Level calculation)
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

      // 8. Query Other Allowances from staff_payroll_extra
      const extraSupportQuery = `
        SELECT user_id, amount, description
        FROM \`staff_payroll_extra\`
        WHERE user_id IN (${validStaffListStr})
          AND type = 'total_extra_support_amount'
          AND date BETWEEN '${startPart}' AND '${endPart}'
      `;

      const [
        hourlyRatesRows,
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
      ] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(hourlyRatesQuery),
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
      ]);

      const extraSupportDetailsMap = new Map<number, CvOtherAllowanceItem[]>();
      const extraSupportMap = new Map<number, number>();

      // 1. Phụ cấp linh hoạt do mOS quản lý (cho phép thêm bớt trực tiếp, có thể âm hoặc dương)
      mosAllowances.forEach((a) => {
        const uid = a.staffId;
        const list = extraSupportDetailsMap.get(uid) || [];
        list.push({
          id: a.id,
          description: a.title,
          amount: a.amount,
          note: a.note || null,
          source: 'mos',
          createdAt: a.createdAt.toISOString(),
        });
        extraSupportDetailsMap.set(uid, list);
        extraSupportMap.set(uid, (extraSupportMap.get(uid) || 0) + a.amount);
      });

      // 2. Phụ cấp lịch sử từ legacy staff_payroll_extra (nếu có)
      extraSupportRows.forEach((r: SafeAny) => {
        const uid = Number(r.user_id);
        const desc = String(r.description || '').trim();
        const amt = Math.round(Number(r.amount || 0));
        // Skip seniority bonus entries that are dynamically handled
        if (/thâm niên|seniority/i.test(desc)) return;
        extraSupportMap.set(uid, (extraSupportMap.get(uid) || 0) + amt);
        const list = extraSupportDetailsMap.get(uid) || [];
        list.push({
          id: `legacy-${uid}-${list.length}`,
          description: desc || 'Phụ cấp khác',
          amount: amt,
          source: 'legacy',
        });
        extraSupportDetailsMap.set(uid, list);
      });

      const techPointsMap = new Map<number, number>();
      techPointsRows.forEach((r: SafeAny) => {
        techPointsMap.set(Number(r.staff_id), Number(r.total_points || 0));
      });

      const hourlyRateMap = new Map<number, number>();
      const socialSecurityMap = new Map<number, { rate: number; amount: number }>();
      const parkingAllowanceMap = new Map<number, number>();
      const staffPayrollMap = new Map<number, SafeAny>();
      hourlyRatesRows.forEach((r: SafeAny) => {
        staffPayrollMap.set(Number(r.user_id), r);
        hourlyRateMap.set(Number(r.user_id), Number(r.working_hour_rate || 21500));
        socialSecurityMap.set(Number(r.user_id), {
          rate: Number(r.social_security_rate || 0),
          amount: Number(r.total_social_security_amount || 0),
        });
        parkingAllowanceMap.set(Number(r.user_id), Math.round(Number(r.total_support_parking_amount || 0)));
      });

      const staffDayOffMap = new Map<number, Set<number>>();
      staffOffDayBatchMap.forEach((info, uid) => {
        staffDayOffMap.set(uid, new Set(info.weeklyOffDays));
      });

      // Group by user -> week Monday -> Set of date strings
      const userWeekDays = new Map<number, Map<string, Set<string>>>();
      reportStaffRows.forEach((r: SafeAny) => {
        const uid = Number(r.staff_id);
        const dateStr = String(r.dateStr);
        const d = getLocalDate(dateStr);
        const monStr = getMondayStr(d);

        if (!userWeekDays.has(uid)) userWeekDays.set(uid, new Map());
        const weekMap = userWeekDays.get(uid)!;
        if (!weekMap.has(monStr)) weekMap.set(monStr, new Set());
        weekMap.get(monStr)!.add(dateStr);
      });

      // Map of user -> Set of off-day work dates
      const userOffDayWorkDatesMap = new Map<number, Set<string>>();
      for (const [uid, weekMap] of userWeekDays.entries()) {
        const offDayDates = new Set<string>();
        const offDaysConfig = staffDayOffMap.get(uid) || new Set();

        for (const [, datesSet] of weekMap.entries()) {
          if (datesSet.size === 7) {
            datesSet.forEach((dateStr) => {
              const d = getLocalDate(dateStr);
              const wd = getIsoWeekday(d);
              if (offDaysConfig.has(wd)) {
                offDayDates.add(dateStr);
              }
            });
          }
        }
        if (offDayDates.size > 0) {
          userOffDayWorkDatesMap.set(uid, offDayDates);
        }
      }

      const cvXoayMap = new Map<number, { bonus: number; serviceCount: number }>();
      cvXoayBonusRows.forEach((r: SafeAny) => {
        cvXoayMap.set(Number(r.staff_id), {
          bonus: Math.round(Number(r.total_bonus || 0)),
          serviceCount: Number(r.service_count || 0),
        });
      });

      const cvTipMap = new Map<number, number>();
      cvTipBonusRows.forEach((r: SafeAny) => {
        cvTipMap.set(Number(r.staff_id), Math.round(Number(r.total_cv_tip || 0)));
      });

      const monthOffLeavesMap = new Map<
        number,
        Array<{ date: string; workingDayCount: number; shiftHours: number; note: string | null }>
      >();
      monthOffLeavesRows.forEach((r: SafeAny) => {
        const uid = Number(r.staff_id);
        const list = monthOffLeavesMap.get(uid) || [];
        list.push({
          date: String(r.dateStr),
          workingDayCount: Number(r.working_day_count || 1),
          shiftHours: Number(r.shift_hours || 9),
          note: r.note ? String(r.note) : null,
        });
        monthOffLeavesMap.set(uid, list);
      });

      let grandTotalHourlyWage = 0;
      let grandTotalCvXoayBonus = 0;
      let grandTotalCvTipBonus = 0;
      let grandTotalSeniorityBonus = 0;
      let grandTotalHolidayBasePay = 0;
      let grandTotalHolidayPremiumPay = 0;
      let grandTotalHolidayPayrollAddition = 0;
      let grandTotalParkingAllowance = 0;
      let grandTotalOffMonthWage = 0;
      let grandTotalIncome = 0;
      let grandTotalSocialSecurityAmount = 0;
      let grandTotalNetIncome = 0;

      // reportStaffRows already contains the requested range plus the week boundaries used
      // for off-day detection. Group the requested rows once instead of scanning it per CV.
      const reportDaysByStaff = new Map<number, SafeAny[]>();
      reportStaffRows.forEach((row: SafeAny) => {
        if (row.dateStr >= startPart && row.dateStr <= endPart) {
          const staffId = Number(row.staff_id);
          const days = reportDaysByStaff.get(staffId) || [];
          days.push(row);
          reportDaysByStaff.set(staffId, days);
        }
      });
      const sortedSeniorityBonusRules = [...seniorityBonusConfig].sort((a, b) => b.minMonths - a.minMonths);

      const records: CvPaystubRecord[] = filteredStaffProfiles.map((staff) => {
        const staffId = Number(staff.userId);
        const hourlyRate = hourlyRateMap.get(staffId) || 21500;
        const userFilteredDays = reportDaysByStaff.get(staffId) || [];

        let totalWorkHours = 0;
        let regularHours = 0;
        let regularHourlyWage = 0;
        let offDaysWorkHours = 0;
        let offDaysWorked = 0;
        const activeDays = userFilteredDays.length;

        const userOffDayDates = userOffDayWorkDatesMap.get(staffId) || new Set();
        const holidayWorkedDates = holidayWorkedDateMap.get(staffId) || new Set();

        const sp = staffPayrollMap.get(staffId);
        let trackingData: SafeAny = {};
        if (sp?.tracking_key) {
          try {
            trackingData = typeof sp.tracking_key === 'string' ? JSON.parse(sp.tracking_key) : sp.tracking_key;
          } catch {
            trackingData = {};
          }
        }

        userFilteredDays.forEach((r) => {
          const dayHours = Number(r.working_minute || 0) / 60;
          totalWorkHours += dayHours;
          regularHours += dayHours;
          regularHourlyWage += Math.round(dayHours * hourlyRate);
          const isOffDayWork = userOffDayDates.has(r.dateStr) && !holidayWorkedDates.has(r.dateStr);
          if (isOffDayWork) {
            offDaysWorked += 1;
            offDaysWorkHours += dayHours;
          }
        });

        totalWorkHours = Math.round(totalWorkHours * 100) / 100;
        regularHours = Math.round(regularHours * 100) / 100;
        offDaysWorkHours = Math.round(offDaysWorkHours * 100) / 100;
        const offDaysWorkWage =
          sp?.total_overtime_daytime_off_week_amount != null && Number(sp.total_overtime_daytime_off_week_amount) > 0
            ? Math.round(Number(sp.total_overtime_daytime_off_week_amount))
            : Math.round(offDaysWorkHours * hourlyRate); // Thêm 1 lần đơn giá giờ (+1x)
        const hourlyWage =
          sp?.total_wage_amount != null
            ? Math.round(Number(sp.total_wage_amount))
            : Math.round(totalWorkHours * hourlyRate);

        const xoayData = cvXoayMap.get(staffId) || { bonus: 0, serviceCount: 0 };
        const cvXoayBonus = xoayData.bonus;
        const serviceCount = xoayData.serviceCount;

        const cvTipBonus = cvTipMap.get(staffId) || 0;

        // Calculate Seniority anchored to the end date of the payroll period (endPart)
        const legacyJoinedAt = staff.date_created ? new Date(staff.date_created) : new Date();
        const crmInfo = crmStaffMap.get(staffId);
        const joinedAt = crmInfo?.joinedAt || legacyJoinedAt;
        const offset = crmInfo?.seniorityOffset || 0;

        const joinedDateStr =
          joinedAt instanceof Date ? joinedAt.toISOString().split('T')[0] : String(joinedAt).split('T')[0];
        const [sy, sm, sd] = joinedDateStr.split('-').map(Number);
        const [ey, em, ed] = endPart.split('-').map(Number);
        let rawMonths = (ey - sy) * 12 + (em - sm);
        if (ed < sd) {
          rawMonths -= 1;
        }
        const seniorityMonths = Math.max(0, rawMonths + offset);

        // Apply Seniority Bonus percentage on CV Xoay Bonus
        let appliedBonusPercent = 0;
        for (const rule of sortedSeniorityBonusRules) {
          if (seniorityMonths >= rule.minMonths) {
            appliedBonusPercent = rule.bonusPercent;
            break;
          }
        }
        // Seniority Bonus is calculated directly from CV Xoay Bonus and applied percentage
        const seniorityBonus = Math.round((cvXoayBonus * appliedBonusPercent) / 100);

        const totalPoints = techPointsMap.get(staffId) || 0;
        const techLevel = Math.floor(totalPoints / 100) + 1;
        const holiday = holidayBreakdownMap.get(staffId)!;

        const parkingAllowance = Math.round(parkingAllowanceMap.get(staffId) || 0);
        // Month-off leave pay (honor approved staff_payroll amount or calculate by scheduled shift hours: 9h for regular shift, 11h for full shift)
        const monthOffList = monthOffLeavesMap.get(staffId) || [];
        const offMonthDays =
          sp?.total_day_off_month != null && Number(sp.total_day_off_month) > 0
            ? Number(sp.total_day_off_month)
            : monthOffList.reduce((sum, item) => sum + item.workingDayCount, 0);
        const offMonthWage =
          sp?.total_off_month_amount != null && Number(sp.total_off_month_amount) > 0
            ? Math.round(Number(sp.total_off_month_amount))
            : monthOffList.reduce((sum, item) => {
                const hours = item.shiftHours || 9;
                return sum + Math.round(item.workingDayCount * hours * hourlyRate);
              }, 0);

        // Other allowances (Phụ cấp khác) from mOS additions, staff_payroll_extra or legacy staff_payroll
        const extraDetails = extraSupportDetailsMap.get(staffId) || [];
        const extraFromDetails = extraSupportMap.get(staffId) || 0;
        const rawExtraFromSp = Math.round(Number(sp?.total_extra_support_amount || 0));
        const otherAllowances = extraDetails.length > 0 ? extraFromDetails : rawExtraFromSp;

        // Holiday paid leave pay (nghỉ lễ x1 - không đi làm vẫn có tiền)
        const holidayPaidLeavePay = holiday.holidayPaidLeavePay || Number(sp?.total_off_public_holiday_amount || 0);
        // Holiday work premium (phụ cấp đi làm lễ 2/9 x3) is separated per HR decision (đi riêng)
        const holidayPaystubAdjustment = holidayPaidLeavePay;
        const totalIncome = Math.round(
          hourlyWage +
            offDaysWorkWage +
            cvXoayBonus +
            cvTipBonus +
            seniorityBonus +
            otherAllowances +
            holidayPaystubAdjustment +
            parkingAllowance +
            offMonthWage
        );

        // Social Security deduction (10.5% for employee)
        const ssInfo = socialSecurityMap.get(staffId) || { rate: 0, amount: 0 };
        const socialSecurityRate = ssInfo.rate;
        const socialSecurityAmount = ssInfo.amount;
        const netIncome =
          sp?.total_amount != null
            ? Math.round(Number(sp.total_amount))
            : Math.round(totalIncome - socialSecurityAmount);

        grandTotalHourlyWage += hourlyWage;
        grandTotalCvXoayBonus += cvXoayBonus;
        grandTotalCvTipBonus += cvTipBonus;
        grandTotalSeniorityBonus += seniorityBonus;
        grandTotalHolidayBasePay += holiday.holidayBasePay;
        grandTotalHolidayPremiumPay += holiday.holidayPremiumPay;
        grandTotalHolidayPayrollAddition += holidayPaidLeavePay;
        grandTotalParkingAllowance += parkingAllowance;
        grandTotalOffMonthWage += offMonthWage;
        grandTotalIncome += totalIncome;
        grandTotalSocialSecurityAmount += socialSecurityAmount;
        grandTotalNetIncome += netIncome;

        const expectedWorkDays = Number(sp?.total_working_day_expected || 26);
        const expectedWorkHours = Number(sp?.total_working_hour_expected || expectedWorkDays * 9);
        const weeklyOffDays = Number(sp?.total_day_off_week || 4);
        const weeklyOffWorkedDays = offDaysWorked || 0;
        const weeklyOffPay = Number(sp?.total_off_week_amount || 0);
        const fullTimeWage = Number(sp?.total_overtime_daytime_amount || 0);
        const holidayOffDays = holiday.holidayPaidLeaveDays || Number(sp?.total_day_off_public_holiday || 0);
        const holidayPay = holidayPaidLeavePay;
        const overLeaveDays = Number(sp?.total_day_off_punish || 0);
        const overLeaveDeduction = Math.round(Number(sp?.total_off_punish_amount || 0));
        const unpaidLeaveDays =
          sp?.total_day_off_program != null && Number(sp.total_day_off_program) > 0
            ? Number(sp.total_day_off_program)
            : Math.max(0, expectedWorkDays - activeDays - offMonthDays - holidayOffDays);
        const totalBaseWage = Math.round(
          hourlyWage + fullTimeWage + weeklyOffPay + offMonthWage + holidayPay - overLeaveDeduction
        );
        const previousMonthAddition = Math.round(Number(sp?.total_extra_last_month_amount || 0));
        const penalties = Math.round(
          Number(sp?.total_extra_punish_amount || 0) + Number(sp?.total_punish_credit_balance_amount || 0)
        );
        const welfareFund = Math.round(Number(sp?.total_welfare_fund_amount || 0));
        const advancePayment = Math.round(Number(sp?.total_extra_advance_amount || 0));
        const dayOffAvailable = Number(sp?.day_off_available != null ? sp.day_off_available : 26);
        const congratulationMessage =
          sp?.staff_payroll_level?.message_congratulation ||
          'Chúc mừng bạn đã thành Đùi Gà ngon ngon. Tháng sau biến hình Thiên Thần nhé!';

        let ssBreakdown = undefined;
        if (socialSecurityAmount > 0) {
          const ssBase = Number(
            trackingData?.social_security?.social_insurance_rate ||
              (socialSecurityRate > 1000000 ? socialSecurityRate : 5400000)
          );
          const employerSS = trackingData?.social_security?.rate?.employer || {};
          const employeeSS = trackingData?.social_security?.rate?.employee || {};
          ssBreakdown = {
            baseAmount: ssBase,
            employer: {
              socialRate: Number(employerSS.social_insurance_rate || 17.5),
              socialAmount: Math.round(Number(employerSS.social_insurance_amount || ssBase * 0.175)),
              healthRate: Number(employerSS.health_insurance_rate || 3.0),
              healthAmount: Math.round(Number(employerSS.health_insurance_amount || ssBase * 0.03)),
              unemploymentRate: Number(employerSS.unemployment_insurance_rate || 1.0),
              unemploymentAmount: Math.round(Number(employerSS.unemployment_insurance_amount || ssBase * 0.01)),
              totalAmount: Math.round(Number(employerSS.total_social_security_amount || ssBase * 0.215)),
            },
            employee: {
              socialRate: Number(employeeSS.social_insurance_rate || 8.0),
              socialAmount: Math.round(Number(employeeSS.social_insurance_amount || ssBase * 0.08)),
              healthRate: Number(employeeSS.health_insurance_rate || 1.5),
              healthAmount: Math.round(Number(employeeSS.health_insurance_amount || ssBase * 0.015)),
              unemploymentRate: Number(employeeSS.unemployment_insurance_rate || 1.0),
              unemploymentAmount: Math.round(Number(employeeSS.unemployment_insurance_amount || ssBase * 0.01)),
              totalAmount: Math.round(socialSecurityAmount),
            },
          };
        }

        return {
          staffId,
          staffName: String(staff.fullName || ''),
          fullName: String(staff.fullName || ''),
          avatar: String(staff.avatar || '') || null,
          store: String(staff.store || 'PXL'),
          totalWorkHours,
          regularHours,
          regularHourlyWage,
          hourlyRate,
          hourlyWage,
          cvXoayBonus,
          cvTipBonus,
          totalIncome,
          serviceCount,
          seniorityMonths,
          seniorityBonus,
          seniorityBonusPercent: appliedBonusPercent,
          techLevel,
          activeDays,
          offDaysWorked,
          offDaysWorkHours,
          offDaysWorkWage,
          socialSecurityRate,
          socialSecurityAmount,
          parkingAllowance,
          netIncome,
          offMonthDays,
          offMonthWage,
          offMonthLeaveDetails: monthOffList,
          ...holiday,
          holidayPaystubAdjustment,
          expectedWorkHours,
          expectedWorkDays,
          fullTimeWage,
          weeklyOffDays,
          weeklyOffWorkedDays,
          weeklyOffPay,
          holidayOffDays,
          holidayPay,
          overLeaveDays,
          overLeaveDeduction,
          unpaidLeaveDays,
          totalBaseWage,
          parkingCalculation: `200.000đ / ${expectedWorkDays} * ${activeDays}`,
          otherAllowances,
          otherAllowancesDetails: extraDetails,
          previousMonthAddition,
          penalties,
          welfareFund,
          advancePayment,
          socialSecurityBreakdown: ssBreakdown,
          guaranteedIncome: 0,
          dayOffAvailable,
          congratulationMessage,
        };
      });

      // Sort by total income descending
      records.sort((a, b) => b.totalIncome - a.totalIncome);

      const response: CvPaystubResponse = {
        data: records,
        total: records.length,
        summary: {
          totalHourlyWage: grandTotalHourlyWage,
          totalCvXoayBonus: grandTotalCvXoayBonus,
          totalCvTipBonus: grandTotalCvTipBonus,
          totalSeniorityBonus: grandTotalSeniorityBonus,
          totalHolidayBasePay: grandTotalHolidayBasePay,
          totalHolidayPremiumPay: grandTotalHolidayPremiumPay,
          totalHolidayPayrollAddition: grandTotalHolidayPayrollAddition,
          totalParkingAllowance: grandTotalParkingAllowance,
          totalOffMonthWage: grandTotalOffMonthWage,
          grandTotalIncome,
          totalSocialSecurityAmount: grandTotalSocialSecurityAmount,
          grandTotalNetIncome,
        },
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV Paystub data');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu CV Live Paystub.' });
    }
  });

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
    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');

    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

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
      const startDate = getLocalDate(startPart);
      const endDate = getLocalDate(endPart);

      const extendedStartMonday = getMondayStr(startDate);
      const endMonday = getLocalDate(getMondayStr(endDate));
      const extendedEndSunday = new Date(endMonday);
      extendedEndSunday.setDate(endMonday.getDate() + 6);
      const extendedEndStr = extendedEndSunday.toISOString().split('T')[0];

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
            TIME_FORMAT(rs.check_in_date, '%H:%i:%s') as checkInTime,
            TIME_FORMAT(rs.check_out_date, '%H:%i:%s') as checkOutTime,
            ROUND(rs.working_minute / 60, 2) as workHours,
            UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
          FROM \`report_staff\` rs
          LEFT JOIN \`client_store\` cs ON cs.id = rs.client_store_id
          WHERE rs.user_id = ${numStaffId}
            AND rs.date >= '${startPart}'
            AND rs.date <= '${endPart}'
            AND rs.working_minute > 0
          ORDER BY rs.date DESC, rs.check_in_date ASC
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

      // Group extended report by week Monday -> Set of date strings
      const weekDaysMap = new Map<string, Set<string>>();
      reportStaffRows.forEach((r: SafeAny) => {
        const dateStr = String(r.dateStr);
        const d = getLocalDate(dateStr);
        const monStr = getMondayStr(d);
        if (!weekDaysMap.has(monStr)) weekDaysMap.set(monStr, new Set());
        weekDaysMap.get(monStr)!.add(dateStr);
      });

      // Find the off-day work dates
      const offDayWorkDates = new Set<string>();
      for (const [_monStr, datesSet] of weekDaysMap.entries()) {
        if (datesSet.size === 7) {
          datesSet.forEach((dateStr) => {
            const d = getLocalDate(dateStr);
            const wd = getIsoWeekday(d);
            if (offDaysConfig.has(wd)) {
              offDayWorkDates.add(dateStr);
            }
          });
        }
      }

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

  // POST /api/kpi/cv-allowances - Thêm phụ cấp khác (hỗ trợ âm / dương)
  fastify.post('/kpi/cv-allowances', { preHandler: [requireAuth] }, async (request, reply) => {
    const { staffId, month, title, amount, note } = request.body as {
      staffId: number;
      month: string;
      title: string;
      amount: number;
      note?: string;
    };

    if (!staffId || !month || !title?.trim() || amount == null || isNaN(Number(amount))) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Vui lòng nhập đầy đủ nhân sự, tháng, tên phụ cấp và số tiền hợp lệ.',
      });
    }

    try {
      const created = await fastify.prisma.crm.crmCvPayrollAllowance.create({
        data: {
          staffId: Number(staffId),
          month: String(month).trim(),
          title: String(title).trim(),
          amount: Math.round(Number(amount)),
          note: note ? String(note).trim() : null,
        },
      });

      return reply.send({
        success: true,
        data: {
          id: created.id,
          description: created.title,
          amount: created.amount,
          note: created.note,
          source: 'mos',
          createdAt: created.createdAt.toISOString(),
        },
        message: 'Thêm phụ cấp khác thành công.',
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error creating CV allowance');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể thêm phụ cấp khác.' });
    }
  });

  // DELETE /api/kpi/cv-allowances/:id - Xoá phụ cấp khác
  fastify.delete('/kpi/cv-allowances/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const allowanceId = Number(id);

    if (!allowanceId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID phụ cấp không hợp lệ.' });
    }

    try {
      await fastify.prisma.crm.crmCvPayrollAllowance.delete({
        where: { id: allowanceId },
      });

      return reply.send({
        success: true,
        message: 'Đã xoá phụ cấp khác thành công.',
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error deleting CV allowance');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xoá phụ cấp khác.' });
    }
  });

  // GET /api/kpi/cv-allowances - Lấy danh sách phụ cấp khác theo nhân sự & tháng
  fastify.get('/kpi/cv-allowances', { preHandler: [requireAuth] }, async (request, reply) => {
    const { staffId, month } = request.query as { staffId?: string; month?: string };

    try {
      const where: SafeAny = {};
      if (staffId) where.staffId = Number(staffId);
      if (month) where.month = String(month).trim();

      const list = await fastify.prisma.crm.crmCvPayrollAllowance.findMany({
        where,
        orderBy: { id: 'asc' },
      });

      return reply.send({
        success: true,
        data: list.map((a) => ({
          id: a.id,
          staffId: a.staffId,
          month: a.month,
          description: a.title,
          amount: a.amount,
          note: a.note,
          source: 'mos',
          createdAt: a.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error listing CV allowances');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy danh sách phụ cấp.' });
    }
  });
}
