import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../../middlewares/auth.js';
import { CvPaystubRecord, CvPaystubResponse, CvWorkLogDetailRecord, CvWorkLogDetailResponse } from '@mos-lab/shared';

type SafeAny = any;

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
      // 1. Get active CV staff IDs from crmConfig
      let activeCvIds: number[] = [47510, 48026, 46092, 37790, 34295];
      try {
        const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: 'ACTIVE_CV_STAFF_CONFIG' },
        });

        if (configRecord && configRecord.value) {
          const parsed = JSON.parse(configRecord.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            activeCvIds = parsed.map((id: SafeAny) => Number(id)).filter((id: number) => !isNaN(id));
          }
        }
      } catch (err) {
        fastify.log.warn('Could not load ACTIVE_CV_STAFF_CONFIG, using default list.');
      }

      if (activeCvIds.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: { totalHourlyWage: 0, totalCvXoayBonus: 0, totalCvTipBonus: 0, grandTotalIncome: 0 },
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
            grandTotalIncome: 0,
          },
        });
      }

      const validStaffIds = filteredStaffProfiles.map((s) => Number(s.userId));
      const validStaffListStr = validStaffIds.join(',');

      // Fetch crm_staff to get joinedAt and seniorityOffset
      const crmStaffMap = new Map<number, { joinedAt: Date; seniorityOffset: number }>();
      const crmStaffs = await fastify.prisma.crm.crmStaff.findMany({
        where: { legacyStaffId: { in: validStaffIds } },
        select: {
          legacyStaffId: true,
          joinedAt: true,
          seniorityOffset: true,
        },
      });
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
        const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: 'CV_SENIORITY_BONUS_CONFIG' },
        });
        if (configRecord && configRecord.value) {
          const parsed = JSON.parse(configRecord.value);
          if (Array.isArray(parsed)) {
            seniorityBonusConfig = parsed;
          }
        }
      } catch (err) {
        fastify.log.warn('Could not load CV_SENIORITY_BONUS_CONFIG, using default list.');
      }

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

      // Query day-off schedules for all users
      const dayOffsQuery = `
        SELECT user_id as staff_id, weekday 
        FROM \`staff_day_off_schedule\` 
        WHERE is_disabled = 0 AND user_id IN (${validStaffListStr})
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

      const [hourlyRatesRows, reportStaffRows, dayOffsRows, cvXoayBonusRows, cvTipBonusRows, techPointsRows] =
        await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(hourlyRatesQuery),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(reportStaffQuery),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(dayOffsQuery),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(cvXoayBonusQuery),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(cvTipBonusQuery),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(techPointsQuery),
        ]);

      const techPointsMap = new Map<number, number>();
      techPointsRows.forEach((r: SafeAny) => {
        techPointsMap.set(Number(r.staff_id), Number(r.total_points || 0));
      });

      const hourlyRateMap = new Map<number, number>();
      hourlyRatesRows.forEach((r: SafeAny) => {
        hourlyRateMap.set(Number(r.user_id), Number(r.working_hour_rate || 21500));
      });

      const staffDayOffMap = new Map<number, Set<number>>();
      dayOffsRows.forEach((r: SafeAny) => {
        const uid = Number(r.staff_id);
        const wd = Number(r.weekday);
        if (!staffDayOffMap.has(uid)) staffDayOffMap.set(uid, new Set());
        staffDayOffMap.get(uid)!.add(wd);
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

      // 3. Query Shift Hours from report_staff
      const shiftsQuery = `
        SELECT 
          rs.user_id as staff_id,
          COUNT(DISTINCT rs.date) as active_days,
          SUM(rs.working_minute) / 60 as total_work_hours
        FROM \`report_staff\` rs
        WHERE rs.user_id IN (${validStaffListStr})
          AND rs.date >= '${startPart}'
          AND rs.date <= '${endPart}'
          AND rs.working_minute > 0
        GROUP BY rs.user_id
      `;

      const shiftsRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(shiftsQuery);

      const shiftDataMap = new Map<number, { hours: number; activeDays: number }>();
      shiftsRows.forEach((r: SafeAny) => {
        shiftDataMap.set(Number(r.staff_id), {
          hours: Number(r.total_work_hours || 0),
          activeDays: Number(r.active_days || 0),
        });
      });

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

      let grandTotalHourlyWage = 0;
      let grandTotalCvXoayBonus = 0;
      let grandTotalCvTipBonus = 0;
      let grandTotalSeniorityBonus = 0;
      let grandTotalIncome = 0;

      const records: CvPaystubRecord[] = filteredStaffProfiles.map((staff) => {
        const staffId = Number(staff.userId);
        const hourlyRate = hourlyRateMap.get(staffId) || 21500;
        const userFilteredDays = reportStaffRows.filter(
          (r) => Number(r.staff_id) === staffId && r.dateStr >= startPart && r.dateStr <= endPart
        );

        let totalWorkHours = 0;
        let regularHours = 0;
        let regularHourlyWage = 0;
        let offDaysWorkHours = 0;
        let offDaysWorkWage = 0;
        let offDaysWorked = 0;
        const activeDays = userFilteredDays.length;

        const userOffDayDates = userOffDayWorkDatesMap.get(staffId) || new Set();

        userFilteredDays.forEach((r) => {
          const dayHours = Number(r.working_minute || 0) / 60;
          totalWorkHours += dayHours;
          const isOffDayWork = userOffDayDates.has(r.dateStr);
          if (isOffDayWork) {
            offDaysWorked += 1;
            offDaysWorkHours += dayHours;
            offDaysWorkWage += Math.round(dayHours * hourlyRate * 2);
          } else {
            regularHours += dayHours;
            regularHourlyWage += Math.round(dayHours * hourlyRate);
          }
        });

        totalWorkHours = Math.round(totalWorkHours * 100) / 100;
        regularHours = Math.round(regularHours * 100) / 100;
        offDaysWorkHours = Math.round(offDaysWorkHours * 100) / 100;
        const hourlyWage = regularHourlyWage + offDaysWorkWage;

        const xoayData = cvXoayMap.get(staffId) || { bonus: 0, serviceCount: 0 };
        const cvXoayBonus = xoayData.bonus;
        const serviceCount = xoayData.serviceCount;

        const cvTipBonus = cvTipMap.get(staffId) || 0;

        // Calculate Seniority
        const legacyJoinedAt = staff.date_created ? new Date(staff.date_created) : new Date();
        const crmInfo = crmStaffMap.get(staffId);
        const joinedAt = crmInfo?.joinedAt || legacyJoinedAt;
        const offset = crmInfo?.seniorityOffset || 0;

        const start = new Date(joinedAt);
        const now = new Date();
        const diffYears = now.getFullYear() - start.getFullYear();
        const diffMonths = now.getMonth() - start.getMonth();
        const seniorityMonths = Math.max(0, diffYears * 12 + diffMonths + offset);

        // Apply Seniority Bonus percentage on CV Xoay Bonus
        let appliedBonusPercent = 0;
        const sortedRules = [...seniorityBonusConfig].sort((a, b) => b.minMonths - a.minMonths);
        for (const rule of sortedRules) {
          if (seniorityMonths >= rule.minMonths) {
            appliedBonusPercent = rule.bonusPercent;
            break;
          }
        }
        const seniorityBonus = Math.round((cvXoayBonus * appliedBonusPercent) / 100);

        const totalPoints = techPointsMap.get(staffId) || 0;
        const techLevel = Math.floor(totalPoints / 100) + 1;

        const totalIncome = hourlyWage + cvXoayBonus + cvTipBonus + seniorityBonus;

        grandTotalHourlyWage += hourlyWage;
        grandTotalCvXoayBonus += cvXoayBonus;
        grandTotalCvTipBonus += cvTipBonus;
        grandTotalSeniorityBonus += seniorityBonus;
        grandTotalIncome += totalIncome;

        return {
          staffId,
          staffName: String(staff.fullName || ''),
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
          grandTotalIncome,
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
      // 1. Get Hourly Rate for staff
      const rateRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT working_hour_rate 
        FROM \`staff_payroll\`
        WHERE user_id = ${numStaffId} AND working_hour_rate > 0
        ORDER BY id DESC
        LIMIT 1
      `);
      const hourlyRate = rateRows.length > 0 ? Number(rateRows[0].working_hour_rate) : 21500;

      // Calculate extended boundaries to query entire weeks
      const startDate = getLocalDate(startPart);
      const endDate = getLocalDate(endPart);

      const extendedStartMonday = getMondayStr(startDate);
      const endMonday = getLocalDate(getMondayStr(endDate));
      const extendedEndSunday = new Date(endMonday);
      extendedEndSunday.setDate(endMonday.getDate() + 6);
      const extendedEndStr = extendedEndSunday.toISOString().split('T')[0];

      // 2. Query Shifts from report_staff for the requested range, and also pull extended attendance for week sizing
      const [shiftsRaw, reportStaffRows, dayOffsRows] = await Promise.all([
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
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT weekday 
          FROM \`staff_day_off_schedule\` 
          WHERE is_disabled = 0 AND user_id = ${numStaffId}
        `),
      ]);

      const offDaysConfig = new Set<number>();
      dayOffsRows.forEach((r) => offDaysConfig.add(Number(r.weekday)));

      // Group extended report by week Monday -> Set of date strings
      const weekDaysMap = new Map<string, Set<string>>();
      reportStaffRows.forEach((r) => {
        const dateStr = String(r.dateStr);
        const d = getLocalDate(dateStr);
        const monStr = getMondayStr(d);
        if (!weekDaysMap.has(monStr)) weekDaysMap.set(monStr, new Set());
        weekDaysMap.get(monStr)!.add(dateStr);
      });

      // Find the off-day work dates
      const offDayWorkDates = new Set<string>();
      for (const [monStr, datesSet] of weekDaysMap.entries()) {
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
      const logs: CvWorkLogDetailRecord[] = shiftsRaw.map((s) => {
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
