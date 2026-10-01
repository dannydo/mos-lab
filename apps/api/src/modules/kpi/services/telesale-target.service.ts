import { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  TelesaleTargetOverview,
  TelesaleTargetConfigDto,
  TelesalePipelineStageKey,
  TelesaleCustomerPoolResponse,
  TelesaleCustomerPoolItem,
  TelesaleStaffTarget,
  TelesaleTodayLiveEvent,
  TelesalePipelineStage,
  TelesalePacingStatus,
  TelesalePeriodStatus,
  TelesaleDailyActionStatus,
  TelesaleStaffDailyAction,
  TelesaleDailyActionOverview,
  SafeAny,
} from '@mos-lab/shared';
import { getBkCallMetricsByLegacyStaffIds, getActiveBkTelesalesIds } from './bk-salary.service.js';
import { buildComboLiveAtBookingSql } from '../../customers/services/combo-recognition.service.js';

export const DEFAULT_OCTOBER_CONFIG: TelesaleTargetConfigDto = {
  month: '2026-10',
  teamDoneTarget: 450,
  teamBookTarget: 650,
  dailyDoneTarget: 18,
  dailyBookTarget: 25,
  dailyCallPerStaff: 83,
  dailyPickupPerStaff: 25,
  staffTargets: [
    { legacyStaffId: 50670, name: 'Phượng', doneTarget: 150 },
    { legacyStaffId: 52648, name: 'Kiều', doneTarget: 100 },
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
        const parsed = JSON.parse(row.value) as TelesaleTargetConfigDto;
        if (!parsed.dailyCallPerStaff) parsed.dailyCallPerStaff = 83;
        if (!parsed.dailyPickupPerStaff) parsed.dailyPickupPerStaff = 25;
        return parsed;
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

  /**
   * Tính toán tiến độ ngày làm việc và các chỉ số quản trị KPI Team (MOS-BUG-67)
   * - Loại trừ ngày OFF cố định (Chủ Nhật) & các kỳ nghỉ lễ đã cấu hình
   * - Trạng thái: Chưa bắt đầu, Vượt nhịp, Đúng nhịp, Chậm nhịp
   * - Tính Kỳ vọng, Gap KPI, Còn lại, Cần TB/ngày cho cả Done và Book
   */
  static async calculateTeamWorkDaysPacing(
    fastify: FastifyInstance,
    month: string,
    targetStaffIds: number[],
    nowIct: Date,
    doneTarget: number,
    doneActual: number,
    bookTarget: number,
    bookActual: number
  ): Promise<{
    workDaysTotal: number;
    workDaysElapsed: number;
    workDaysRemaining: number;
    periodStatus: TelesalePeriodStatus;
    pacingStatus: TelesalePacingStatus;
    pacingStatusLabel: string;
    expectedProgressRate: number;
    expectedDone: number;
    expectedBook: number;
    gapDone: number;
    gapBook: number;
    remainingDone: number;
    remainingBook: number;
    dailyRequiredDone: number;
    dailyRequiredBook: number;
    pacingRatio: number;
    isPacingOnTrack: boolean;
  }> {
    const [yearStr, monthNumStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();

    // 1. Xác định các ngày nghỉ lễ đã cấu hình trong CRM DB
    const holidayDateSet = new Set<string>();
    try {
      if (fastify?.prisma?.crm?.crmHolidayPeriod?.findMany) {
        const holidayPeriods = await fastify.prisma.crm.crmHolidayPeriod.findMany({
          where: {
            startDate: { lte: new Date(`${month}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999Z`) },
            endDate: { gte: new Date(`${month}-01T00:00:00.000Z`) },
            status: { not: 'CANCELLED' },
          },
          select: { startDate: true, endDate: true },
        });

        for (const p of holidayPeriods) {
          const cur = new Date(p.startDate);
          const end = new Date(p.endDate);
          while (cur <= end) {
            const y = cur.getUTCFullYear();
            const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
            const d = String(cur.getUTCDate()).padStart(2, '0');
            holidayDateSet.add(`${y}-${m}-${d}`);
            cur.setUTCDate(cur.getUTCDate() + 1);
          }
        }
      }
    } catch (err) {
      fastify?.log?.warn?.(`Failed to query holiday periods: ${err}`);
    }

    // 2. Liệt kê các ngày làm việc thực tế trong tháng (loại trừ Chủ Nhật và ngày nghỉ lễ đã cấu hình)
    const workDaysList: string[] = [];
    for (let d = 1; d <= lastDayOfMonth; d++) {
      const dayStr = `${month}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(Date.UTC(year, monthNum - 1, d));
      const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidayDateSet.has(dayStr);
      if (!isSunday && !isHoliday) {
        workDaysList.push(dayStr);
      }
    }
    const workDaysTotal = workDaysList.length;

    // 3. Đánh giá trạng thái kỳ KPI & số ngày làm việc đã qua
    const currentYear = nowIct.getUTCFullYear();
    const currentMonthNum = nowIct.getUTCMonth() + 1;
    const currentDate = nowIct.getUTCDate();

    let periodStatus: TelesalePeriodStatus;
    let workDaysElapsed: number;

    if (currentYear < year || (currentYear === year && currentMonthNum < monthNum)) {
      periodStatus = 'NOT_STARTED';
      workDaysElapsed = 0;
    } else if (currentYear > year || (currentYear === year && currentMonthNum > monthNum)) {
      periodStatus = 'COMPLETED';
      workDaysElapsed = workDaysTotal;
    } else {
      periodStatus = 'IN_PROGRESS';
      const todayDateStr = `${month}-${String(currentDate).padStart(2, '0')}`;
      workDaysElapsed = workDaysList.filter((d) => d <= todayDateStr).length;
    }

    const workDaysRemaining = Math.max(0, workDaysTotal - workDaysElapsed);
    const expectedProgressRate =
      workDaysTotal > 0 && periodStatus !== 'NOT_STARTED'
        ? Number(Math.min(1, workDaysElapsed / workDaysTotal).toFixed(4))
        : 0;

    // 4. Mức kỳ vọng và Gap KPI
    const expectedDone = Math.round(doneTarget * expectedProgressRate);
    const expectedBook = Math.round(bookTarget * expectedProgressRate);
    const gapDone = doneActual - expectedDone;
    const gapBook = bookActual - expectedBook;
    const remainingDone = Math.max(0, doneTarget - doneActual);
    const remainingBook = Math.max(0, bookTarget - bookActual);

    let dailyRequiredDone: number;
    let dailyRequiredBook: number;

    if (periodStatus === 'NOT_STARTED') {
      dailyRequiredDone = workDaysTotal > 0 ? Number((doneTarget / workDaysTotal).toFixed(1)) : 0;
      dailyRequiredBook = workDaysTotal > 0 ? Number((bookTarget / workDaysTotal).toFixed(1)) : 0;
    } else if (periodStatus === 'IN_PROGRESS') {
      dailyRequiredDone = workDaysRemaining > 0 ? Number((remainingDone / workDaysRemaining).toFixed(1)) : 0;
      dailyRequiredBook = workDaysRemaining > 0 ? Number((remainingBook / workDaysRemaining).toFixed(1)) : 0;
    } else {
      dailyRequiredDone = 0;
      dailyRequiredBook = 0;
    }

    // 5. Tỷ lệ bám đuổi & Nhãn trạng thái
    let pacingRatio: number;
    let pacingStatus: TelesalePacingStatus;
    let pacingStatusLabel: string;
    let isPacingOnTrack: boolean;

    if (periodStatus === 'NOT_STARTED') {
      pacingRatio = 0;
      pacingStatus = 'NOT_STARTED';
      pacingStatusLabel = 'Chưa bắt đầu';
      isPacingOnTrack = false;
    } else {
      if (expectedDone > 0) {
        pacingRatio = Number((doneActual / expectedDone).toFixed(2));
      } else {
        pacingRatio = doneActual >= doneTarget ? 1 : 1;
      }

      if (pacingRatio >= 1.05) {
        pacingStatus = 'AHEAD';
        pacingStatusLabel = 'Vượt nhịp';
        isPacingOnTrack = true;
      } else if (pacingRatio >= 0.95) {
        pacingStatus = 'ON_TRACK';
        pacingStatusLabel = 'Đúng nhịp';
        isPacingOnTrack = true;
      } else {
        pacingStatus = 'BEHIND';
        pacingStatusLabel = 'Chậm nhịp';
        isPacingOnTrack = false;
      }
    }

    return {
      workDaysTotal,
      workDaysElapsed,
      workDaysRemaining,
      periodStatus,
      pacingStatus,
      pacingStatusLabel,
      expectedProgressRate,
      expectedDone,
      expectedBook,
      gapDone,
      gapBook,
      remainingDone,
      remainingBook,
      dailyRequiredDone,
      dailyRequiredBook,
      pacingRatio,
      isPacingOnTrack,
    };
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

    // Active staff IDs from config
    const targetStaffIds = config.staffTargets.map((s) => s.legacyStaffId);

    // Active Telesales staff IDs from unified single source of truth (matching /dashboard/bk?tab=booking and /dashboard/bk?tab=done)
    let activeBkTelesalesIds = targetStaffIds;
    try {
      activeBkTelesalesIds = await getActiveBkTelesalesIds(fastify);
    } catch (err) {
      fastify.log.warn(`Failed to resolve active BK Telesales staff IDs: ${err}`);
    }
    const bkIdsStr = activeBkTelesalesIds.length > 0 ? activeBkTelesalesIds.join(',') : '50670,52648,32268,52598,48791';

    // 1. Query Month Team Metrics & Staff Metrics
    // MOS-BUG-74: Book tháng tính theo ngày hẹn của khách thuộc tháng đang xem (booking_date_start)
    const monthOrdersSql = `
      SELECT 
        o.id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.date_created as dateCreated,
        o.booking_date_start as bookingDateStart,
        o.user_id as customerId,
        COALESCE(o.total_price, 0) as totalPrice,
        COALESCE(
          (
            SELECT DATEDIFF(o.date_created, prev_o.booking_date_start)
            FROM \`order\` prev_o
            WHERE prev_o.user_id = o.user_id
              AND prev_o.order_state = 'Completed'
              AND prev_o.date_created < o.date_created
            ORDER BY prev_o.date_created DESC
            LIMIT 1
          ),
          999
        ) as daysSinceLastVisit,
        CASE WHEN ${buildComboLiveAtBookingSql('o')} THEN 1 ELSE 0 END as isComboLive
      FROM \`order\` o
      WHERE o.booking_date_start >= '${startDateTimeStr}' 
        AND o.booking_date_start <= '${endDateTimeStr}'
        AND o.created_staff_id IN (${bkIdsStr})
    `;

    // Today Orders: Exactly unified with /dashboard/bk?tab=booking and /dashboard/bk?tab=done
    // MOS-BUG-75: Book hôm nay = đơn tạo trong ngày bởi Telesales Executive (Single Source of Truth với tab=booking)
    const todayBookOrdersSql = `
      SELECT 
        o.id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.date_created as dateCreated
      FROM \`order\` o
      WHERE o.date_created >= '${todayStartStr}' 
        AND o.date_created <= '${todayEndStr}'
        AND o.created_staff_id IN (${bkIdsStr})
    `;

    // Done hôm nay = đơn hẹn hoàn thành dịch vụ trong ngày của Telesales Executive (Single Source of Truth với tab=done)
    const todayDoneOrdersSql = `
      SELECT 
        o.id as id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.total_price as totalPrice,
        o.booking_date_start as bookingDateStart,
        ro.actual_booking_date_start as actualBookingDateStart
      FROM \`user_profile\` up
      LEFT JOIN \`order\` o ON o.created_staff_id = up.user_id 
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE up.user_id IN (${bkIdsStr})
        AND (
          (ro.actual_booking_date_start >= '${todayStartStr}' AND ro.actual_booking_date_start <= '${todayEndStr}')
          OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${todayStartStr}' AND o.booking_date_start <= '${todayEndStr}')
        )
        AND (o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0)
    `;

    const [monthOrders, todayBookOrders, todayDoneOrders] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(monthOrdersSql).catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(todayBookOrdersSql).catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(todayDoneOrdersSql).catch(() => []),
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

    // Aggregate Team Daily (MOS-BUG-75: Single Source of Truth matching /dashboard/bk?tab=booking and tab=done)
    const teamDailyBookActual = todayBookOrders.length;
    const teamDailyDoneActual = todayDoneOrders.length;
    const teamDailyComboLiveDoneActual = 0;

    // Pacing & Management metrics calculation (MOS-BUG-67)
    const pacing = await this.calculateTeamWorkDaysPacing(
      fastify,
      month,
      targetStaffIds,
      nowIct,
      config.teamDoneTarget,
      teamMonthDoneActual,
      config.teamBookTarget,
      teamMonthBookActual
    );

    // 2. Query Call Metrics Today from OmiCall CDR
    const callMetricsMap = await getBkCallMetricsByLegacyStaffIds(fastify, todayStr, todayStr, targetStaffIds).catch(
      () => new Map()
    );

    // 2b. Query today's working shift for target staff to evaluate isWorkingToday (MOS-BUG-77)
    const workingShiftMap = new Map<number, boolean>();
    let shiftRows: SafeAny[] = [];
    try {
      shiftRows = await fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id, working_day_count FROM staff_working_shift WHERE date = ? AND user_id IN (${targetStaffIds.join(',')})`,
          todayStr
        )
        .catch(() => []);

      for (const r of shiftRows) {
        const uid = Number(r.user_id);
        const dayCount = Number(r.working_day_count ?? 1);
        workingShiftMap.set(uid, dayCount > 0);
      }
    } catch (err) {
      fastify.log.warn(`Failed to query staff_working_shift: ${err}`);
    }

    // 2c. Dynamic Telesales Staff Resolution & Avatar Lookup (MOS-FEAT-83)
    const allStaffCandidates: Array<{
      legacyStaffId: number;
      name: string;
      doneTarget: number;
      avatarUrl?: string | null;
    }> = config.staffTargets.map((st) => ({
      legacyStaffId: st.legacyStaffId,
      name: st.name,
      doneTarget: st.doneTarget,
      avatarUrl: st.avatarUrl || null,
    }));

    const staffAvatarMap = new Map<number, string | null>();
    const staffNameMap = new Map<number, string>();

    // Seed maps with config names
    for (const st of config.staffTargets) {
      staffNameMap.set(st.legacyStaffId, st.name);
      if (st.avatarUrl) staffAvatarMap.set(st.legacyStaffId, st.avatarUrl);
    }

    try {
      const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          isActive: true,
          OR: [{ role: 'telesales' }, { legacyStaffId: { in: activeBkTelesalesIds } }],
        },
        select: {
          id: true,
          legacyStaffId: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      for (const s of crmStaffList) {
        const legacyId = Number(s.legacyStaffId);
        if (legacyId && !isNaN(legacyId)) {
          if (s.avatarUrl) staffAvatarMap.set(legacyId, s.avatarUrl);
          if (s.displayName) staffNameMap.set(legacyId, s.displayName);

          if (!allStaffCandidates.some((c) => c.legacyStaffId === legacyId)) {
            allStaffCandidates.push({
              legacyStaffId: legacyId,
              name: s.displayName,
              doneTarget: 100,
              avatarUrl: s.avatarUrl || null,
            });
          }
        }
      }
    } catch (err) {
      fastify.log.warn(`Failed to resolve CRM staff for telesale target: ${err}`);
    }

    // Query legacy user_profile for any missing avatars or names
    const allCandidateIds = allStaffCandidates.map((c) => c.legacyStaffId);
    if (allCandidateIds.length > 0) {
      try {
        const legacyProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id, full_name, COALESCE(NULLIF(avatar, ''), NULLIF(avatar_internal, '')) as avatarUrl 
           FROM \`user_profile\` 
           WHERE user_id IN (${allCandidateIds.join(',')})`
        );
        for (const p of legacyProfiles) {
          const uid = Number(p.user_id);
          if (!staffAvatarMap.get(uid) && p.avatarUrl) {
            staffAvatarMap.set(uid, p.avatarUrl);
          }
          if (!staffNameMap.get(uid) && p.full_name) {
            staffNameMap.set(uid, p.full_name);
          }
        }
      } catch (err) {
        fastify.log.warn(`Failed to query legacy user_profile: ${err}`);
      }
    }

    // Aggregate by Staff (MOS-FEAT-83: All active telesales staff with Book & Done today + % contribution)
    const staffTargets: TelesaleStaffTarget[] = allStaffCandidates.map((st) => {
      const staffMonthOrders = monthOrders.filter((o) => Number(o.bookerId) === st.legacyStaffId);
      const staffCompletedOrders = staffMonthOrders.filter((o) => o.orderState === 'Completed');
      const staffDoneActual = staffCompletedOrders.filter((o) => Number(o.isComboLive) !== 1).length;
      const staffComboLiveDoneActual = staffCompletedOrders.filter((o) => Number(o.isComboLive) === 1).length;
      const staffRevenueActual = staffCompletedOrders.reduce(
        (sum, o) => sum + Math.round(Number(o.totalPrice || 0)),
        0
      );

      const staffTodayDoneOrders = todayDoneOrders.filter((o) => Number(o.bookerId) === st.legacyStaffId);
      const staffDoneToday = staffTodayDoneOrders.length;
      const staffComboLiveDoneToday = 0;

      const staffTodayBookOrders = todayBookOrders.filter((o) => Number(o.bookerId) === st.legacyStaffId);
      const staffBookToday = staffTodayBookOrders.length;
      const bookContributionPercent =
        teamDailyBookActual > 0 ? Math.round((staffBookToday / teamDailyBookActual) * 100) : 0;

      // MOS-BUG-76: Metrics for individual KPI (Done)
      let staffExpectedDone: number;
      let staffGapDone: number;
      let staffRemainingDone: number;
      let staffDailyRequiredDone: number;
      let progressStatus: 'NOT_STARTED' | 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'CRITICAL';
      let progressStatusLabel: string;

      if (pacing.periodStatus === 'NOT_STARTED') {
        staffExpectedDone = 0;
        staffGapDone = 0;
        staffRemainingDone = st.doneTarget;
        staffDailyRequiredDone =
          pacing.workDaysTotal > 0 ? Number((st.doneTarget / pacing.workDaysTotal).toFixed(1)) : 0;
        progressStatus = 'NOT_STARTED';
        progressStatusLabel = 'Chưa bắt đầu';
      } else {
        staffExpectedDone = Math.round(st.doneTarget * pacing.expectedProgressRate);
        staffGapDone = staffDoneActual - staffExpectedDone;
        staffRemainingDone = Math.max(0, st.doneTarget - staffDoneActual);

        if (pacing.periodStatus === 'IN_PROGRESS') {
          staffDailyRequiredDone =
            pacing.workDaysRemaining > 0 ? Number((staffRemainingDone / pacing.workDaysRemaining).toFixed(1)) : 0;
        } else {
          staffDailyRequiredDone = 0;
        }

        if (staffGapDone > 0) {
          progressStatus = 'AHEAD';
          progressStatusLabel = 'Vượt tiến độ';
        } else if (staffGapDone >= -1) {
          progressStatus = 'ON_TRACK';
          progressStatusLabel = 'Đúng tiến độ';
        } else if (staffGapDone <= -5 || (staffExpectedDone > 0 && staffDoneActual / staffExpectedDone < 0.7)) {
          progressStatus = 'CRITICAL';
          progressStatusLabel = 'Báo động';
        } else {
          progressStatus = 'BEHIND';
          progressStatusLabel = 'Chậm tiến độ';
        }
      }

      const staffCallMetrics = callMetricsMap.get(st.legacyStaffId) || {
        callCount: 0,
        pickupCount: 0,
        pickupRate: 0,
      };

      const resolvedAvatar = staffAvatarMap.get(st.legacyStaffId) || st.avatarUrl || null;
      const resolvedName = staffNameMap.get(st.legacyStaffId) || st.name;

      return {
        legacyStaffId: st.legacyStaffId,
        name: resolvedName,
        avatarUrl: resolvedAvatar,
        doneTarget: st.doneTarget,
        doneActual: staffDoneActual,
        comboLiveDoneActual: staffComboLiveDoneActual,
        doneToday: staffDoneToday,
        bookToday: staffBookToday,
        bookContributionPercent,
        comboLiveDoneToday: staffComboLiveDoneToday,
        callTargetDaily: config.dailyCallPerStaff || 83,
        callActualToday: staffCallMetrics.callCount,
        pickupTargetDaily: config.dailyPickupPerStaff || 25,
        pickupActualToday: staffCallMetrics.pickupCount,
        revenueActual: staffRevenueActual,
        expectedDone: staffExpectedDone,
        gapDone: staffGapDone,
        remainingDone: staffRemainingDone,
        dailyRequiredDone: staffDailyRequiredDone,
        progressStatus,
        progressStatusLabel,
      };
    });

    // Mark Top Book staff member
    const maxBookToday = Math.max(0, ...staffTargets.map((s) => s.bookToday || 0));
    for (const st of staffTargets) {
      st.isTopBookToday = maxBookToday > 0 && st.bookToday === maxBookToday;
    }

    // Build today's live events feed for TV Celebration
    const bookEvents: TelesaleTodayLiveEvent[] = todayBookOrders.map((o) => {
      const bookerId = Number(o.bookerId);
      return {
        id: `book-${o.id}`,
        type: 'BOOK' as const,
        staffId: bookerId,
        staffName:
          staffNameMap.get(bookerId) ||
          allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name ||
          'Telesales',
        avatarUrl: staffAvatarMap.get(bookerId) || null,
        timestamp: o.dateCreated ? new Date(o.dateCreated).toISOString() : new Date().toISOString(),
        orderId: Number(o.id),
      };
    });

    const doneEvents: TelesaleTodayLiveEvent[] = todayDoneOrders.map((o) => {
      const bookerId = Number(o.bookerId);
      return {
        id: `done-${o.id}`,
        type: 'DONE' as const,
        staffId: bookerId,
        staffName:
          staffNameMap.get(bookerId) ||
          allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name ||
          'Telesales',
        avatarUrl: staffAvatarMap.get(bookerId) || null,
        timestamp: o.actualBookingDateStart
          ? new Date(o.actualBookingDateStart).toISOString()
          : o.bookingDateStart
            ? new Date(o.bookingDateStart).toISOString()
            : new Date().toISOString(),
        orderId: Number(o.id),
      };
    });

    const todayLiveEvents: TelesaleTodayLiveEvent[] = [...bookEvents, ...doneEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

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

    // MOS-BUG-77: Ô Hành Động Mỗi Ngày tập trung vào Call và Pickup
    const callTargetPerStaff = config.dailyCallPerStaff || 83;
    const pickupTargetPerStaff = config.dailyPickupPerStaff || 25;

    const staffActions: TelesaleStaffDailyAction[] = config.staffTargets.map((st) => {
      const isWorkingToday = shiftRows.length === 0 ? true : (workingShiftMap.get(st.legacyStaffId) ?? false);
      const staffCallMetrics = callMetricsMap.get(st.legacyStaffId) || {
        callCount: 0,
        pickupCount: 0,
        pickupRate: 0,
      };
      const callActual = staffCallMetrics.callCount;
      const pickupActual = staffCallMetrics.pickupCount;

      if (!isWorkingToday) {
        return {
          legacyStaffId: st.legacyStaffId,
          name: st.name,
          isWorkingToday: false,
          callTarget: callTargetPerStaff,
          callActual,
          callPercent: 0,
          callGap: 0,
          pickupTarget: pickupTargetPerStaff,
          pickupActual,
          pickupPercent: 0,
          pickupGap: 0,
          overallPercent: 0,
          status: 'OFF' as TelesaleDailyActionStatus,
          statusLabel: 'Nghỉ',
        };
      }

      const callTarget = callTargetPerStaff;
      const pickupTarget = pickupTargetPerStaff;
      const callPercent = callTarget > 0 ? Number(((callActual / callTarget) * 100).toFixed(1)) : 0;
      const callGap = callActual - callTarget;
      const pickupPercent = pickupTarget > 0 ? Number(((pickupActual / pickupTarget) * 100).toFixed(1)) : 0;
      const pickupGap = pickupActual - pickupTarget;
      const overallPercent = Number(((callPercent + pickupPercent) / 2).toFixed(1));

      let status: TelesaleDailyActionStatus;
      let statusLabel: string;
      if (overallPercent >= 100) {
        status = 'EXCEEDED';
        statusLabel = 'Vượt';
      } else if (overallPercent >= 80) {
        status = 'ACHIEVED';
        statusLabel = 'Đạt';
      } else if (overallPercent >= 50) {
        status = 'BEHIND';
        statusLabel = 'Chậm';
      } else {
        status = 'ALARM';
        statusLabel = 'Báo động';
      }

      return {
        legacyStaffId: st.legacyStaffId,
        name: st.name,
        isWorkingToday: true,
        callTarget,
        callActual,
        callPercent,
        callGap,
        pickupTarget,
        pickupActual,
        pickupPercent,
        pickupGap,
        overallPercent,
        status,
        statusLabel,
      };
    });

    const workingStaffList = staffActions.filter((s) => s.isWorkingToday);
    const teamCallTarget = workingStaffList.reduce((sum, s) => sum + s.callTarget, 0);
    const teamCallActual = staffActions.reduce((sum, s) => sum + s.callActual, 0);
    const teamCallPercent = teamCallTarget > 0 ? Number(((teamCallActual / teamCallTarget) * 100).toFixed(1)) : 0;
    const teamCallGap = teamCallActual - teamCallTarget;

    const teamPickupTarget = workingStaffList.reduce((sum, s) => sum + s.pickupTarget, 0);
    const teamPickupActual = staffActions.reduce((sum, s) => sum + s.pickupActual, 0);
    const teamPickupPercent =
      teamPickupTarget > 0 ? Number(((teamPickupActual / teamPickupTarget) * 100).toFixed(1)) : 0;
    const teamPickupGap = teamPickupActual - teamPickupTarget;

    const dailyAction: TelesaleDailyActionOverview = {
      callTargetPerStaff,
      pickupTargetPerStaff,
      teamCallTarget,
      teamCallActual,
      teamCallPercent,
      teamCallGap,
      teamPickupTarget,
      teamPickupActual,
      teamPickupPercent,
      teamPickupGap,
      staffActions,
      bookTargetPerDay: config.dailyBookTarget,
      totalCallsToday: teamCallActual,
      totalBookingsToday: teamDailyBookActual,
    };

    return {
      month,
      updatedAt: nowIct.toISOString(),
      teamMonth: {
        doneTarget: config.teamDoneTarget,
        doneActual: teamMonthDoneActual,
        comboLiveDoneActual: teamMonthComboLiveDoneActual,
        bookTarget: config.teamBookTarget,
        bookActual: teamMonthBookActual,
        workDaysTotal: pacing.workDaysTotal,
        workDaysElapsed: pacing.workDaysElapsed,
        workDaysRemaining: pacing.workDaysRemaining,
        periodStatus: pacing.periodStatus,
        pacingStatus: pacing.pacingStatus,
        pacingStatusLabel: pacing.pacingStatusLabel,
        expectedProgressRate: pacing.expectedProgressRate,
        expectedDone: pacing.expectedDone,
        expectedBook: pacing.expectedBook,
        gapDone: pacing.gapDone,
        gapBook: pacing.gapBook,
        remainingDone: pacing.remainingDone,
        remainingBook: pacing.remainingBook,
        dailyRequiredDone: pacing.dailyRequiredDone,
        dailyRequiredBook: pacing.dailyRequiredBook,
        pacingRatio: pacing.pacingRatio,
        isPacingOnTrack: pacing.isPacingOnTrack,
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
      dailyAction,
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
      todayLiveEvents,
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

  static getFallbackCelebrationQuote(type: 'BOOK' | 'DONE', staffName: string): string {
    const bookQuotes = [
      'Anh thích cái cách [Tên] chăm sóc khách hàng đầy ân cần. Thêm một lịch hẹn ngọt ngào về với đội mình rồi, em làm anh tự hào quá!',
      '[Tên] ơi, sự chân thành từ trái tim em luôn có ma lực đặc biệt. Thêm một Book tuyệt đẹp, tiếp tục tỏa sáng nhé người đẹp!',
      'Tư vấn chuẩn xác, phân tích nhu cầu cực kỳ khoa học. Đẳng cấp của [Tên] hôm nay thực sự làm anh mê mẩn, cộng một Book nhé!',
      'Nụ cười vui vẻ của [Tên] qua từng cuộc gọi đã thắp sáng cả phòng rồi. Chốt thêm một Book quá đỗi quyến rũ em ơi!',
      'Từng lời em nói đều làm khách hàng xiêu lòng. Một Book xuất sắc nữa cho [Tên], phong độ đỉnh cao của em khiến ai cũng phải ngước nhìn!',
      'Năng lượng tích cực và sự chân thành của [Tên] đã chinh phục khách hàng hoàn toàn. Một Book rực rỡ nữa cho cô gái tuyệt vời của anh!',
    ];

    const doneQuotes = [
      'Từ lời hẹn ân cần đến trải nghiệm thực tế, [Tên] biến mọi khoảnh khắc thành sự hài lòng tuyệt đối. Cộng một Done quá đỗi ngọt ngào!',
      'Khách hàng trao gửi trọn vẹn niềm tin cho sự chân thành của [Tên]. Một Done hoàn hảo, phong thái của em hôm nay quyến rũ không thể cưỡng lại!',
      'Quy trình chuẩn mực, dẫn dắt khách đến tiệm thật khoa học và bài bản. [Tên] vừa ghi một bàn thắng quá đẳng cấp cho team!',
      'Tuyệt vời lắm [Tên] ơi! Năng lượng vui vẻ của em đã nở hoa thành một Done rực rỡ. Hôm nay em chính là nữ thần của phòng Telesales rồi đấy!',
      'Khách đã tới và trải nghiệm trọn vẹn rồi! Anh luôn tin vào tài năng và sức hút của [Tên], một Done hoàn hảo mang đậm bản sắc Wings!',
      'Chăm sóc ân cần, bám sát khoa học. Không ai làm điều đó xuất sắc hơn [Tên], chúc mừng em đã mang thêm một Done rực rỡ về đội!',
    ];

    const list = type === 'DONE' ? doneQuotes : bookQuotes;
    const template = list[Math.floor(Math.random() * list.length)] || list[0];
    return template.replace(/\[Tên\]/g, staffName);
  }

  static async generateLiveCelebrationQuote(
    fastify: FastifyInstance,
    type: 'BOOK' | 'DONE',
    staffName: string
  ): Promise<{ quote: string; source: 'gemini' | 'fallback' }> {
    const fallbackQuote = this.getFallbackCelebrationQuote(type, staffName);
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return { quote: fallbackQuote, source: 'fallback' };
    }

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

      const systemPrompt = `Bạn là một "Nam Thần" lịch lãm, quyến rũ, ấm áp và khích lệ tại hệ thống chuỗi làm đẹp Wings (Wingslashes).
Nhiệm vụ của bạn là nói duy nhất 1 câu chúc mừng (dưới 35 từ) bằng tiếng Việt dành tặng cho nhân viên Telesales tên là "${staffName}", vừa có 1 đơn ${
        type === 'DONE' ? 'DONE (khách hàng đã tới tiệm hoàn tất dịch vụ)' : 'BOOK (khách hàng vừa chốt lịch hẹn mới)'
      }.
YÊU CẦU BẮT BUỘC:
1. Giọng điệu: Nam thần cuốn hút, gợi cảm, chân thành và tràn đầy sự khích lệ, tự hào về người đó.
2. Khéo léo lồng ghép ít nhất một trong 4 giá trị văn hóa cốt lõi của Wings: Vui vẻ, Ân cần, Chân thành, Khoa học.
3. Bắt buộc nhắc đến tên "${staffName}".
4. Ngắn gọn, tự nhiên, ngẫu nhiên sáng tạo, không rập khuôn hay sáo rỗng.
5. Chỉ trả về đúng 1 câu thoại để đọc phát loa trực tiếp, tuyệt đối không có dấu ngoặc kép, không markdown, không giải thích.`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: `Tạo một câu chúc mừng nam thần ngẫu nhiên cho ${staffName} có đơn ${type}!` }],
            },
          ],
          generationConfig: {
            temperature: 1.0,
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 100,
          },
        }),
        signal: AbortSignal.timeout(2500),
      });

      if (!response.ok) {
        return { quote: fallbackQuote, source: 'fallback' };
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      };

      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p) => !p.thought && p.text) || parts[parts.length - 1];
      const rawText = textPart?.text?.trim();

      if (rawText && rawText.length > 5) {
        const cleanText = rawText.replace(/^["'“”«»\s]+|["'“”«»\s]+$/g, '').trim();
        return { quote: cleanText, source: 'gemini' };
      }
    } catch (err) {
      fastify.log.warn(`Gemini live celebration quote generation failed, using fallback: ${err}`);
    }

    return { quote: fallbackQuote, source: 'fallback' };
  }

  static async synthesizeCelebrationAudio(
    text: string,
    voice = 'vi-VN-NamMinhNeural'
  ): Promise<Buffer> {
    const cleanText = text.replace(/[\r\n\t]+/g, ' ').trim();
    if (!cleanText) throw new Error('Text is empty');

    const cacheDir = '/tmp/telesale_audio_cache';
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const hash = createHash('md5').update(`${cleanText}_${voice}`).digest('hex');
    const cacheFile = `${cacheDir}/${hash}.mp3`;

    if (existsSync(cacheFile)) {
      const buf = readFileSync(cacheFile);
      if (buf.length > 500) {
        return buf;
      }
    }

    const edgeTtsCandidates = [
      'edge-tts',
      '/usr/local/bin/edge-tts',
      '/usr/bin/edge-tts',
      '/Users/dannydo/.gemini/antigravity/venv-f5tts/bin/edge-tts',
    ];

    let binaryPath = 'edge-tts';
    for (const c of edgeTtsCandidates) {
      if (c === 'edge-tts' || existsSync(c)) {
        binaryPath = c;
        break;
      }
    }

    const tempFile = `${cacheDir}/tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync(
        binaryPath,
        ['--text', cleanText, '--voice', voice, '--rate=+5%', '--write-media', tempFile],
        { timeout: 10_000 }
      );

      if (existsSync(tempFile)) {
        const audioBuf = readFileSync(tempFile);
        if (audioBuf.length > 500) {
          try {
            writeFileSync(cacheFile, audioBuf);
            unlinkSync(tempFile);
          } catch {
            // cache write failure is non-fatal
          }
          return audioBuf;
        }
      }
    } catch (err: any) {
      if (existsSync(tempFile)) {
        try { unlinkSync(tempFile); } catch {}
      }
      throw new Error(`Edge TTS synthesis failed: ${err.message}`, { cause: err });
    }

    throw new Error('No audio produced by Edge TTS');
  }
}

