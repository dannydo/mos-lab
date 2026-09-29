import { FastifyInstance } from 'fastify';
import {
  TelesaleTargetOverview,
  TelesaleTargetConfigDto,
  TelesalePipelineStageKey,
  TelesaleCustomerPoolResponse,
  TelesaleCustomerPoolItem,
  TelesaleStaffTarget,
  TelesalePipelineStage,
  SafeAny,
} from '@mos-lab/shared';
import { getBkCallMetricsByLegacyStaffIds } from './bk-salary.service.js';
import { buildComboLiveAtBookingSql } from '../../customers/services/combo-recognition.service.js';

export const DEFAULT_OCTOBER_CONFIG: TelesaleTargetConfigDto = {
  month: '2026-10',
  teamDoneTarget: 450,
  teamBookTarget: 650,
  dailyDoneTarget: 18,
  dailyBookTarget: 25,
  dailyCallPerStaff: 90,
  staffTargets: [
    { legacyStaffId: 52454, name: 'Phượng', doneTarget: 150 },
    { legacyStaffId: 52086, name: 'Kiều', doneTarget: 100 },
    { legacyStaffId: 32268, name: 'Điệp', doneTarget: 100 },
    { legacyStaffId: 52598, name: 'Vũ', doneTarget: 100 },
  ],
  stageTargets: {
    '0_30': 200,
    '31_60': 110,
    '61_120': 80,
    gt_120: 60,
  },
};

export class TelesaleTargetService {
  static getConfigKey(month: string): string {
    return `TELESALE_TARGET_CONFIG_${month}`;
  }

  static async getConfig(fastify: FastifyInstance, month = '2026-10'): Promise<TelesaleTargetConfigDto> {
    try {
      const row = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: this.getConfigKey(month) },
      });
      if (row?.value) {
        return JSON.parse(row.value) as TelesaleTargetConfigDto;
      }
    } catch (err) {
      fastify.log.warn(`Failed to read telesale config for ${month}, using default: ${err}`);
    }
    return { ...DEFAULT_OCTOBER_CONFIG, month };
  }

  static async saveConfig(fastify: FastifyInstance, config: TelesaleTargetConfigDto): Promise<TelesaleTargetConfigDto> {
    const sumStages =
      Number(config.stageTargets['0_30'] || 0) +
      Number(config.stageTargets['31_60'] || 0) +
      Number(config.stageTargets['61_120'] || 0) +
      Number(config.stageTargets.gt_120 || 0);

    if (sumStages !== Number(config.teamDoneTarget)) {
      throw new Error(
        `Tổng mục tiêu Done của 4 nhóm khách hàng (${sumStages}) phải khớp chính xác với KPI Done của Team (${config.teamDoneTarget})!`
      );
    }

    const key = this.getConfigKey(config.month);
    const value = JSON.stringify(config);

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });

    return config;
  }

  static async cloneConfig(
    fastify: FastifyInstance,
    sourceMonth: string,
    targetMonth: string,
    overwrite = false
  ): Promise<TelesaleTargetConfigDto> {
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(sourceMonth) || !monthRegex.test(targetMonth)) {
      throw new Error('Định dạng tháng không hợp lệ (cần định dạng YYYY-MM, ví dụ: 2026-11)');
    }
    if (sourceMonth === targetMonth) {
      throw new Error('Tháng đích phải khác tháng nguồn');
    }

    const targetKey = this.getConfigKey(targetMonth);
    const existing = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: targetKey },
    });

    if (existing?.value && !overwrite) {
      throw new Error(`Kế hoạch tháng ${targetMonth} đã tồn tại! Vui lòng chọn ghi đè nếu bạn muốn thay thế.`);
    }

    const sourceConfig = await this.getConfig(fastify, sourceMonth);
    const clonedConfig: TelesaleTargetConfigDto = {
      ...sourceConfig,
      month: targetMonth,
    };

    return await this.saveConfig(fastify, clonedConfig);
  }

  static async listConfiguredMonths(fastify: FastifyInstance): Promise<string[]> {
    try {
      const rows = await fastify.prisma.crm.crmConfig.findMany({
        where: {
          key: {
            startsWith: 'TELESALE_TARGET_CONFIG_',
          },
        },
        select: { key: true },
      });
      const months = rows
        .map((r) => r.key.replace('TELESALE_TARGET_CONFIG_', ''))
        .filter((m) => /^\d{4}-\d{2}$/.test(m));

      if (!months.includes('2026-10')) {
        months.push('2026-10');
      }

      return Array.from(new Set(months)).sort();
    } catch (err) {
      fastify.log.warn(`Failed to list configured telesale months: ${err}`);
      return ['2026-10'];
    }
  }

  static async getOverview(
    fastify: FastifyInstance,
    month = '2026-10',
    currentStaffId?: number
  ): Promise<TelesaleTargetOverview> {
    const config = await this.getConfig(fastify, month);
    const [yearStr, monthNumStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);

    const startDateTimeStr = `${month}-01 00:00:00`;
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const endDateTimeStr = `${month}-${String(lastDayOfMonth).padStart(2, '0')} 23:59:59`;

    // Today in ICT (UTC+7)
    const nowUtc = new Date();
    const ictOffsetMs = 7 * 60 * 60 * 1000;
    const nowIct = new Date(nowUtc.getTime() + ictOffsetMs);
    const todayStr = nowIct.toISOString().slice(0, 10);
    const todayStartStr = `${todayStr} 00:00:00`;
    const todayEndStr = `${todayStr} 23:59:59`;

    // Pacing calculation
    const currentYear = nowIct.getUTCFullYear();
    const currentMonthNum = nowIct.getUTCMonth() + 1;
    let daysElapsed = lastDayOfMonth;
    if (currentYear === year && currentMonthNum === monthNum) {
      daysElapsed = Math.min(nowIct.getUTCDate(), lastDayOfMonth);
    } else if (currentYear < year || (currentYear === year && currentMonthNum < monthNum)) {
      daysElapsed = 1; // Future month
    }
    const daysTotal = lastDayOfMonth;

    // Active staff IDs from config
    const targetStaffIds = config.staffTargets.map((s) => s.legacyStaffId);
    const bkIdsStr = targetStaffIds.length > 0 ? targetStaffIds.join(',') : '52454,52086,32268,52598';

    // 1. Query Month Team Metrics & Staff Metrics
    // Booking count: Rule 10 strictly requires order.date_created in period
    const monthOrdersSql = `
      SELECT 
        o.id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.date_created as dateCreated,
        o.user_id as customerId,
        COALESCE(DATEDIFF(o.date_created, up.last_order_booking), 999) as daysSinceLastVisit,
        CASE WHEN ${buildComboLiveAtBookingSql('o')} THEN 1 ELSE 0 END as isComboLive
      FROM \`order\` o
      LEFT JOIN \`user_profile\` up ON up.user_id = o.user_id
      WHERE o.date_created >= '${startDateTimeStr}' 
        AND o.date_created <= '${endDateTimeStr}'
        AND o.created_staff_id IN (${bkIdsStr})
    `;

    // Today Orders
    const todayOrdersSql = `
      SELECT 
        o.id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.date_created as dateCreated,
        CASE WHEN ${buildComboLiveAtBookingSql('o')} THEN 1 ELSE 0 END as isComboLive
      FROM \`order\` o
      WHERE o.date_created >= '${todayStartStr}' 
        AND o.date_created <= '${todayEndStr}'
        AND o.created_staff_id IN (${bkIdsStr})
    `;

    const [monthOrders, todayOrders] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(monthOrdersSql).catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(todayOrdersSql).catch(() => []),
    ]);

    // Aggregate Team Month
    // Not Combo Live counts towards official Done KPI target
    // Combo Live is tracked for operational progress
    const teamMonthBookActual = monthOrders.length;
    const teamMonthDoneActual = monthOrders.filter(
      (o) => o.orderState === 'Completed' && Number(o.isComboLive) !== 1
    ).length;
    const teamMonthComboLiveDoneActual = monthOrders.filter(
      (o) => o.orderState === 'Completed' && Number(o.isComboLive) === 1
    ).length;

    // Aggregate Team Daily
    const teamDailyBookActual = todayOrders.length;
    const teamDailyDoneActual = todayOrders.filter(
      (o) => o.orderState === 'Completed' && Number(o.isComboLive) !== 1
    ).length;
    const teamDailyComboLiveDoneActual = todayOrders.filter(
      (o) => o.orderState === 'Completed' && Number(o.isComboLive) === 1
    ).length;

    // Expected done by pacing (measured against Not Combo Live target)
    const expectedDoneToDate = config.teamDoneTarget * (daysElapsed / daysTotal);
    const pacingRatio = expectedDoneToDate > 0 ? Number((teamMonthDoneActual / expectedDoneToDate).toFixed(2)) : 1;
    const isPacingOnTrack = pacingRatio >= 0.95;

    // 2. Query Call Metrics Today from OmiCall CDR
    const callMetricsMap = await getBkCallMetricsByLegacyStaffIds(fastify, todayStr, todayStr, targetStaffIds).catch(
      () => new Map()
    );

    // Aggregate by Staff
    const staffTargets: TelesaleStaffTarget[] = config.staffTargets.map((st) => {
      const staffMonthOrders = monthOrders.filter((o) => Number(o.bookerId) === st.legacyStaffId);
      const staffDoneActual = staffMonthOrders.filter(
        (o) => o.orderState === 'Completed' && Number(o.isComboLive) !== 1
      ).length;
      const staffComboLiveDoneActual = staffMonthOrders.filter(
        (o) => o.orderState === 'Completed' && Number(o.isComboLive) === 1
      ).length;

      const staffTodayOrders = todayOrders.filter((o) => Number(o.bookerId) === st.legacyStaffId);
      const staffDoneToday = staffTodayOrders.filter(
        (o) => o.orderState === 'Completed' && Number(o.isComboLive) !== 1
      ).length;
      const staffComboLiveDoneToday = staffTodayOrders.filter(
        (o) => o.orderState === 'Completed' && Number(o.isComboLive) === 1
      ).length;

      const staffCallMetrics = callMetricsMap.get(st.legacyStaffId) || {
        callCount: 0,
        pickupCount: 0,
        pickupRate: 0,
      };

      return {
        legacyStaffId: st.legacyStaffId,
        name: st.name,
        doneTarget: st.doneTarget,
        doneActual: staffDoneActual,
        comboLiveDoneActual: staffComboLiveDoneActual,
        doneToday: staffDoneToday,
        comboLiveDoneToday: staffComboLiveDoneToday,
        callTargetDaily: config.dailyCallPerStaff,
        callActualToday: staffCallMetrics.callCount,
        pickupActualToday: staffCallMetrics.pickupCount,
      };
    });

    // 3. Aggregate 4 Pipeline Stages (Done in Month per stage)
    const stageCounts: Record<
      TelesalePipelineStageKey,
      { done: number; comboLiveDone: number; totalAssigned: number }
    > = {
      '0_30': { done: 0, comboLiveDone: 0, totalAssigned: 0 },
      '31_60': { done: 0, comboLiveDone: 0, totalAssigned: 0 },
      '61_120': { done: 0, comboLiveDone: 0, totalAssigned: 0 },
      gt_120: { done: 0, comboLiveDone: 0, totalAssigned: 0 },
    };

    // Classify completed month orders by daysSinceLastVisit and combo status
    for (const ord of monthOrders) {
      if (ord.orderState === 'Completed') {
        const days = Number(ord.daysSinceLastVisit);
        const isCombo = Number(ord.isComboLive) === 1;
        let targetKey: TelesalePipelineStageKey;
        if (days <= 30) {
          targetKey = '0_30';
        } else if (days <= 60) {
          targetKey = '31_60';
        } else if (days <= 120) {
          targetKey = '61_120';
        } else {
          targetKey = 'gt_120';
        }

        if (isCombo) {
          stageCounts[targetKey].comboLiveDone++;
        } else {
          stageCounts[targetKey].done++;
        }
      }
    }

    // Query customer pool counts for the 4 stages
    try {
      const poolCountsSql = `
        SELECT 
          CASE 
            WHEN DATEDIFF(CURDATE(), up.last_order_booking) <= 30 THEN '0_30'
            WHEN DATEDIFF(CURDATE(), up.last_order_booking) <= 60 THEN '31_60'
            WHEN DATEDIFF(CURDATE(), up.last_order_booking) <= 120 THEN '61_120'
            ELSE 'gt_120'
          END as stageKey,
          COUNT(DISTINCT u.id) as totalCount
        FROM \`user\` u
        JOIN \`user_profile\` up ON u.id = up.user_id
        WHERE u.user_type = 1 
          AND up.last_order_booking IS NOT NULL
        GROUP BY stageKey
      `;
      const poolRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(poolCountsSql).catch(() => []);
      for (const r of poolRows) {
        const key = r.stageKey as TelesalePipelineStageKey;
        if (stageCounts[key]) {
          stageCounts[key].totalAssigned = Number(r.totalCount || 0);
        }
      }
    } catch (e) {
      fastify.log.warn(`Could not compute pool counts: ${e}`);
    }

    const pipelineStages: TelesalePipelineStage[] = [
      {
        key: '0_30',
        label: '0D – 30D',
        subLabel: 'CHĂM SÓC CHU KỲ',
        stageName: 'Chăm sóc chu kỳ',
        description: 'Bảo hành kiểu Úc (1-3 ngày), Chạm 14, 19, 21 nhắc chu kỳ dặm mi',
        doneTarget: config.stageTargets['0_30'] || 200,
        doneActual: stageCounts['0_30'].done,
        comboLiveDoneActual: stageCounts['0_30'].comboLiveDone,
        totalAssignedCount: stageCounts['0_30'].totalAssigned,
        calledCount: Math.min(stageCounts['0_30'].done * 3, stageCounts['0_30'].totalAssigned),
        conversionRate:
          stageCounts['0_30'].totalAssigned > 0
            ? Number(((stageCounts['0_30'].done / stageCounts['0_30'].totalAssigned) * 100).toFixed(1))
            : 0,
        actionNote: 'Data được chia đều cho từng nhân sự (cá nhân hoá khách hàng)',
        itemsSummary: [
          'Bảo hành kiểu ÚC (1 - 3 ngày)',
          'Chạm 14 (hỏi thăm, quan tâm)',
          'Chạm 19 (nhắc chu kỳ dặm mi)',
          'Chạm 21 (nhắc chu kỳ dặm mi)',
        ],
      },
      {
        key: '31_60',
        label: '31D – 60D',
        subLabel: 'MISS YOU',
        stageName: 'Miss You',
        description: 'Khơi gợi nhu cầu booking làm mới (không ưu đãi)',
        doneTarget: config.stageTargets['31_60'] || 110,
        doneActual: stageCounts['31_60'].done,
        comboLiveDoneActual: stageCounts['31_60'].comboLiveDone,
        totalAssignedCount: stageCounts['31_60'].totalAssigned,
        calledCount: Math.min(stageCounts['31_60'].done * 4, stageCounts['31_60'].totalAssigned),
        conversionRate:
          stageCounts['31_60'].totalAssigned > 0
            ? Number(((stageCounts['31_60'].done / stageCounts['31_60'].totalAssigned) * 100).toFixed(1))
            : 0,
        actionNote: 'Data được chia đều cho từng nhân sự (cá nhân hoá khách hàng)',
        itemsSummary: ['Khơi gợi nhu cầu booking làm mới', 'Kịch bản tự nhiên, không giảm giá tràn lan'],
      },
      {
        key: '61_120',
        label: '61D – 120D',
        subLabel: 'COMEBACK',
        stageName: 'Comeback (30%)',
        description: '30% Mời khách hàng quay lại',
        doneTarget: config.stageTargets['61_120'] || 80,
        doneActual: stageCounts['61_120'].done,
        comboLiveDoneActual: stageCounts['61_120'].comboLiveDone,
        totalAssignedCount: stageCounts['61_120'].totalAssigned,
        calledCount: Math.min(stageCounts['61_120'].done * 5, stageCounts['61_120'].totalAssigned),
        conversionRate:
          stageCounts['61_120'].totalAssigned > 0
            ? Number(((stageCounts['61_120'].done / stageCounts['61_120'].totalAssigned) * 100).toFixed(1))
            : 0,
        actionNote: 'Data được chia đều cho từng nhân sự (cá nhân hoá khách hàng)',
        badge: '30% Ưu Đãi',
        itemsSummary: ['30% Mời khách hàng quay lại', 'Khảo sát lý do gián đoạn dịch vụ'],
      },
      {
        key: 'gt_120',
        label: '> 120D',
        subLabel: 'WAKE UP',
        stageName: 'Cua Lại Vợ Bầu (50%)',
        description: 'Chiến dịch Cua lại vợ bầu · Teamwork cùng khai thác chung',
        doneTarget: config.stageTargets.gt_120 || 60,
        doneActual: stageCounts.gt_120.done,
        comboLiveDoneActual: stageCounts.gt_120.comboLiveDone,
        totalAssignedCount: stageCounts.gt_120.totalAssigned,
        calledCount: Math.min(stageCounts.gt_120.done * 6, stageCounts.gt_120.totalAssigned),
        conversionRate:
          stageCounts.gt_120.totalAssigned > 0
            ? Number(((stageCounts.gt_120.done / stageCounts.gt_120.totalAssigned) * 100).toFixed(1))
            : 0,
        actionNote: 'Tạo chức năng mới Teamwork tất cả mọi người vào khai thác chung 1 chỗ',
        badge: '50% Ưu Đãi',
        itemsSummary: [
          '50% Mời khách hàng quay lại',
          'Chiến dịch Cua lại vợ bầu',
          'Teamwork tất cả mọi người khai thác chung',
        ],
      },
    ];

    // Work schedule active detection based on ICT hour
    const currentIctHour = nowIct.getUTCHours();
    const isMorningActive = currentIctHour >= 8 && currentIctHour < 12;
    const isAfternoonActive = currentIctHour >= 13 && currentIctHour < 17;

    const totalCallsToday = staffTargets.reduce((acc, st) => acc + st.callActualToday, 0);

    return {
      month,
      updatedAt: nowIct.toISOString(),
      teamMonth: {
        doneTarget: config.teamDoneTarget,
        doneActual: teamMonthDoneActual,
        comboLiveDoneActual: teamMonthComboLiveDoneActual,
        bookTarget: config.teamBookTarget,
        bookActual: teamMonthBookActual,
        pacingDaysElapsed: daysElapsed,
        pacingDaysTotal: daysTotal,
        pacingRatio,
        isPacingOnTrack,
      },
      teamDaily: {
        date: todayStr,
        doneTarget: config.dailyDoneTarget,
        doneActual: teamDailyDoneActual,
        comboLiveDoneActual: teamDailyComboLiveDoneActual,
        bookTarget: config.dailyBookTarget,
        bookActual: teamDailyBookActual,
      },
      staffTargets,
      dailyAction: {
        callTargetPerStaff: config.dailyCallPerStaff,
        bookTargetPerDay: config.dailyBookTarget,
        totalCallsToday,
        totalBookingsToday: teamDailyBookActual,
      },
      workSchedule: {
        morning: {
          timeRange: '08:00 – 12:00',
          title: 'Chăm sóc data chu kỳ',
          subTitle: 'Chu kỳ từ 0D đến 120D',
          isActive: isMorningActive,
        },
        afternoon: {
          timeRange: '13:00 – 17:00',
          title: 'Khai thác data chu kỳ > 120D',
          subTitle: 'Chiến dịch Cua lại vợ bầu',
          isActive: isAfternoonActive,
        },
      },
      pipelineStages,
    };
  }

  static async getCustomerPool(
    fastify: FastifyInstance,
    stageKey: TelesalePipelineStageKey,
    bookerId?: number,
    limit = 50,
    offset = 0
  ): Promise<TelesaleCustomerPoolResponse> {
    let dayMin = 0;
    let dayMax = 30;
    if (stageKey === '0_30') {
      dayMin = 0;
      dayMax = 30;
    } else if (stageKey === '31_60') {
      dayMin = 31;
      dayMax = 60;
    } else if (stageKey === '61_120') {
      dayMin = 61;
      dayMax = 120;
    } else {
      dayMin = 121;
      dayMax = 99999;
    }

    const whereDays =
      stageKey === 'gt_120'
        ? `(DATEDIFF(CURDATE(), up.last_order_booking) > 120 OR up.last_order_booking IS NULL)`
        : `DATEDIFF(CURDATE(), up.last_order_booking) >= ${dayMin} AND DATEDIFF(CURDATE(), up.last_order_booking) <= ${dayMax}`;

    const bookerFilter = bookerId && bookerId > 0 ? `AND (u.id % 4 = ${bookerId % 4})` : '';

    const listSql = `
      SELECT 
        u.id as customerId,
        COALESCE(up.full_name, CONCAT(u.first_name, ' ', u.last_name), 'Khách hàng') as customerName,
        COALESCE(u.mobile, up.phone, '') as phone,
        COALESCE(cs.client_store_key, 'PXL') as store,
        DATE_FORMAT(up.last_order_booking, '%Y-%m-%d') as lastVisitDate,
        COALESCE(DATEDIFF(CURDATE(), up.last_order_booking), 999) as daysSinceLastVisit,
        COALESCE(oc.totalSpent, 0) as totalSpent
      FROM \`user\` u
      JOIN \`user_profile\` up ON u.id = up.user_id
      LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
      LEFT JOIN (
        SELECT user_id, SUM(total_amount) as totalSpent
        FROM \`order\`
        WHERE order_state = 'Completed'
        GROUP BY user_id
      ) oc ON oc.user_id = u.id
      WHERE u.user_type = 1 
        AND ${whereDays}
        ${bookerFilter}
      ORDER BY up.last_order_booking DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const countSql = `
      SELECT COUNT(DISTINCT u.id) as totalCount
      FROM \`user\` u
      JOIN \`user_profile\` up ON u.id = up.user_id
      WHERE u.user_type = 1 
        AND ${whereDays}
        ${bookerFilter}
    `;

    const [rows, countRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(listSql).catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countSql).catch(() => [{ totalCount: 0 }]),
    ]);

    const total = Number(countRows[0]?.totalCount || 0);

    const activeStaffNames: Record<number, string> = {
      52454: 'Phượng',
      52086: 'Kiều',
      32268: 'Điệp',
      52598: 'Vũ',
    };
    const activeStaffIds = [52454, 52086, 32268, 52598];

    const items: TelesaleCustomerPoolItem[] = rows.map((r, idx) => {
      const assignedId = bookerId && bookerId > 0 ? bookerId : activeStaffIds[Number(r.customerId) % 4];
      return {
        id: idx + 1,
        customerId: Number(r.customerId),
        customerName: String(r.customerName),
        phone: String(r.phone),
        store: String(r.store),
        lastVisitDate: r.lastVisitDate ? String(r.lastVisitDate) : null,
        daysSinceLastVisit: Number(r.daysSinceLastVisit),
        assignedStaffId: assignedId,
        assignedStaffName: activeStaffNames[assignedId] || 'Telesales',
        stageKey,
        callStatus: 'NOT_CALLED',
        totalCallsInMonth: 0,
        totalSpent: Number(r.totalSpent || 0),
      };
    });

    return {
      stageKey,
      total,
      calledTodayCount: 0,
      bookedCount: 0,
      items,
    };
  }
}
