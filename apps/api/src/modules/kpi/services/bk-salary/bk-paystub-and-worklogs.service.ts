import { FastifyInstance } from 'fastify';
import {
  BkPaystubRecord,
  BkWorkLogRecord,
  BkWorkLogResponse,
  SafeAny,
  TELESALES_ATTENDANCE_EXCEPTION_OPTIONS,
  TelesalesAttendanceExceptionItem,
} from '@mos-lab/shared';
import { HolidayWorkService } from '../../../holiday-work/holiday-work.service.js';
import {
  canUserManageTelesalesAttendance,
  fetchBkAttendanceMap,
  fetchBkExceptionAdjustedAttendanceMap,
  fetchTelesalesAttendanceAuditLogs,
  fetchTelesalesAttendanceExceptions,
  isStaffTelesalesExecutive,
} from './bk-attendance.service.js';
import { computeBkOrderCheckins } from './bk-order-checkins.service.js';
import {
  calculateStandardWorkDays,
  getBkSalaryConfig,
  getBkWorkDaysOverrides,
  getMilestoneBonusInfo,
  getMissedRateBonusInfo,
  getRevCommissionRateInfo,
} from './bk-salary-config-and-rules.js';

export interface BkPaystubDetail {
  staffId: number;
  staffName: string;
  avatar: string | null;
  store: string;
  monthlyBaseSalary: number;
  standardWorkDays: number;
  actualWorkDays: number;
  actualCheckInDays?: number;
  workDaysAdjustment?: number;
  calculatedBaseSalary: number;
  basicCheckinBonus: number;
  milestoneBonus: number;
  penaltyBonus: number;
  doneBonus: number;
  doneCount: number;
  missedCount: number;
  totalCount: number;
  missedRatePercent: number;
  doneLevelCount: number;
  missedLevelRate: number;
  totalCustomerTip: number;
  tipBonus: number;
  totalRevenue: number;
  revCommissionRate: number;
  revenueBonus: number;
  revLevelMin: number;
  totalIncome: number;
}

export interface BkPaystubResult {
  data: BkPaystubRecord[];
  total: number;
  summary: {
    totalBaseSalary: number;
    totalDoneBonus: number;
    totalTipBonus: number;
    totalRevenueBonus: number;
    totalHolidayBasePay: number;
    totalHolidayPremiumPay: number;
    totalHolidayPayrollAddition: number;
    grandTotalIncome: number;
    totalBasicCheckinBonus: number;
    totalMilestoneBonus: number;
    totalPenaltyBonus: number;
    totalCustomerTip: number;
    totalRevenue: number;
  };
  detailsMap: Map<number, BkPaystubDetail>;
  orderCheckinMap: Map<
    number,
    {
      bonus: number;
      checkinCategory: string;
      discountRate: number;
      isCombo: boolean;
      serviceName?: string;
      servicePrice?: number;
      discountPercent?: number;
    }
  >;
}

export async function getBkPaystubData(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  targetBkIds?: number[],
  storeFilter: string = ''
): Promise<BkPaystubResult> {
  const config = await getBkSalaryConfig(fastify);
  const activeBkIds = targetBkIds && targetBkIds.length > 0 ? targetBkIds : config.activeBkIds;

  if (activeBkIds.length === 0) {
    return {
      data: [],
      total: 0,
      summary: {
        totalBaseSalary: 0,
        totalDoneBonus: 0,
        totalTipBonus: 0,
        totalRevenueBonus: 0,
        totalHolidayBasePay: 0,
        totalHolidayPremiumPay: 0,
        totalHolidayPayrollAddition: 0,
        grandTotalIncome: 0,
        totalBasicCheckinBonus: 0,
        totalMilestoneBonus: 0,
        totalPenaltyBonus: 0,
        totalCustomerTip: 0,
        totalRevenue: 0,
      },
      detailsMap: new Map(),
      orderCheckinMap: new Map(),
    };
  }

  const bkIdsStr = activeBkIds.join(',');

  const [
    { clientBonusMap, orderCheckinMap, singleDoneMap, comboLiveDoneMap },
    holidayBreakdownMap,
    attendanceMap,
    workDaysOverrides,
  ] = await Promise.all([
    computeBkOrderCheckins(fastify, startPart, endPart, activeBkIds, storeFilter),
    HolidayWorkService.getPayBreakdownByLegacyStaffIds(fastify, activeBkIds, startPart, endPart),
    fetchBkAttendanceMap(fastify, startPart, endPart, activeBkIds),
    getBkWorkDaysOverrides(fastify),
  ]);

  const effectiveAttendanceMap = await fetchBkExceptionAdjustedAttendanceMap(
    fastify,
    startPart,
    endPart,
    activeBkIds,
    attendanceMap
  );

  const sql = `
    SELECT 
      up.user_id as staffId,
      up.full_name as staffName,
      up.avatar as avatar,
      UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
      COUNT(DISTINCT CASE WHEN (o.order_state IN ('Completed', 'CheckOut') OR o.actual_booking_date_start IS NOT NULL OR o.total_price > 0) THEN o.id END) as doneCount,
      COUNT(DISTINCT CASE WHEN (o.booking_date_start <= NOW() OR COALESCE(o.actual_booking_date_start, o.booking_date_start) <= NOW()) AND o.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut') THEN o.id END) as missedCount,
      COUNT(DISTINCT o.id) as totalCount,
      COALESCE(SUM(CASE WHEN o.order_state IN ('Completed', 'CheckOut') THEN o.total_price ELSE 0 END), 0) as totalRevenue,
      COALESCE(SUM(st.customer_tip_100), 0) as totalCustomerTip
    FROM \`user_profile\` up
    LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
    LEFT JOIN (
      SELECT o.id, o.created_staff_id, o.order_state, o.total_price, o.booking_date_start, ro.actual_booking_date_start
      FROM \`order\` o
      JOIN report_order ro ON ro.order_id = o.id
      WHERE ro.actual_booking_date_start >= '${startPart} 00:00:00' AND ro.actual_booking_date_start <= '${endPart} 23:59:59'
      UNION ALL
      SELECT o.id, o.created_staff_id, o.order_state, o.total_price, o.booking_date_start, NULL as actual_booking_date_start
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE ro.actual_booking_date_start IS NULL
        AND o.booking_date_start >= '${startPart} 00:00:00' AND o.booking_date_start <= '${endPart} 23:59:59'
    ) o ON o.created_staff_id = up.user_id ${storeFilter}
    LEFT JOIN (
      SELECT 
        order_id, 
        MAX(CASE WHEN tip_percentage > 0 THEN tip_amount / (tip_percentage / 100) ELSE tip_amount END) as customer_tip_100
      FROM staff_tip
      GROUP BY order_id
    ) st ON st.order_id = o.id
    WHERE up.user_id IN (${bkIdsStr})
    GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
    ORDER BY up.full_name ASC
  `;

  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

  let grandTotalBaseSalary = 0;
  let grandTotalDoneBonus = 0;
  let grandTotalTipBonus = 0;
  let grandTotalRevenueBonus = 0;
  let grandTotalHolidayBasePay = 0;
  let grandTotalHolidayPremiumPay = 0;
  let grandTotalHolidayPayrollAddition = 0;
  let grandTotalIncome = 0;

  let grandTotalBasicCheckinBonus = 0;
  let grandTotalMilestoneBonus = 0;
  let grandTotalPenaltyBonus = 0;
  let grandTotalCustomerTip = 0;
  let grandTotalRevenue = 0;

  const detailsMap = new Map<number, BkPaystubDetail>();

  const data: BkPaystubRecord[] = rows.map((r) => {
    const staffId = Number(r.staffId);
    const doneCount = Number(r.doneCount || 0);
    const missedCount = Number(r.missedCount || 0);
    const totalCount = Number(r.totalCount || 0);
    const missedRatePercent = totalCount > 0 ? Number(((missedCount / totalCount) * 100).toFixed(1)) : 0;
    const totalRevenue = Number(r.totalRevenue || 0);
    const totalCustomerTip = Number(r.totalCustomerTip || 0);

    const actualCheckInDays = attendanceMap.get(staffId) || 0;
    const exceptionAdjustedDays = effectiveAttendanceMap.get(staffId) ?? actualCheckInDays;
    const monthKey = startPart.slice(0, 7);
    const overrideKeyWithMonth = `${staffId}_${monthKey}`;
    const overrideVal = workDaysOverrides[overrideKeyWithMonth] ?? workDaysOverrides[String(staffId)];
    const actualWorkDays = typeof overrideVal === 'number' ? overrideVal : exceptionAdjustedDays;
    const workDaysAdjustment = Number((actualWorkDays - actualCheckInDays).toFixed(1));

    const monthlyBaseSalary = config.baseSalary;
    const standardWorkDays = calculateStandardWorkDays(startPart, endPart);
    const calculatedBaseSalary =
      standardWorkDays > 0 ? Math.round((monthlyBaseSalary / standardWorkDays) * actualWorkDays) : 0;

    const singleDoneCount = singleDoneMap?.get(staffId) || 0;
    const comboLiveDoneCount = comboLiveDoneMap?.get(staffId) || 0;
    const totalDoneCount = singleDoneCount + comboLiveDoneCount;
    const effectiveDone = totalDoneCount > 0 ? totalDoneCount : doneCount;
    const minDone = config.minDoneForMissedBonus ?? 100;

    const basicCheckinBonus = clientBonusMap.get(staffId) || 0;
    const { bonus: milestoneBonus, doneLevelCount } = getMilestoneBonusInfo(effectiveDone, config.doneBonusTiers);
    const { bonus: penaltyBonus, missedLevelRate } = getMissedRateBonusInfo(
      missedRatePercent,
      config.missedBonusTiers,
      effectiveDone,
      minDone
    );

    const doneBonus = basicCheckinBonus + milestoneBonus + penaltyBonus;
    const tipBonus = Math.round((totalCustomerTip * (config.tipsPercent || 7)) / 100);
    const { rate: revCommissionRate, revLevelMin } = getRevCommissionRateInfo(totalRevenue, config.revBonusTiers);
    const revenueBonus = Math.round((totalRevenue * revCommissionRate) / 100);
    const holiday = holidayBreakdownMap.get(staffId)!;

    const totalIncome = calculatedBaseSalary + doneBonus + tipBonus + revenueBonus + holiday.holidayPaystubAdjustment;

    grandTotalBaseSalary += calculatedBaseSalary;
    grandTotalDoneBonus += doneBonus;
    grandTotalTipBonus += tipBonus;
    grandTotalRevenueBonus += revenueBonus;
    grandTotalHolidayBasePay += holiday.holidayBasePay;
    grandTotalHolidayPremiumPay += holiday.holidayPremiumPay;
    grandTotalHolidayPayrollAddition += holiday.holidayPayrollAddition;
    grandTotalIncome += totalIncome;

    grandTotalBasicCheckinBonus += basicCheckinBonus;
    grandTotalMilestoneBonus += milestoneBonus;
    grandTotalPenaltyBonus += penaltyBonus;
    grandTotalCustomerTip += totalCustomerTip;
    grandTotalRevenue += totalRevenue;

    const detail: BkPaystubDetail = {
      staffId,
      staffName: String(r.staffName || `BK #${staffId}`),
      avatar: r.avatar ? String(r.avatar) : null,
      store: String(r.store || 'PXL'),
      monthlyBaseSalary,
      standardWorkDays,
      actualWorkDays,
      actualCheckInDays,
      workDaysAdjustment,
      calculatedBaseSalary,
      basicCheckinBonus,
      milestoneBonus,
      penaltyBonus,
      doneBonus,
      doneCount,
      missedCount,
      totalCount,
      missedRatePercent,
      doneLevelCount,
      missedLevelRate,
      totalCustomerTip,
      tipBonus,
      totalRevenue,
      revCommissionRate,
      revenueBonus,
      revLevelMin,
      totalIncome,
    };

    detailsMap.set(staffId, detail);

    return {
      staffId,
      staffName: detail.staffName,
      avatar: detail.avatar,
      store: detail.store,
      monthlyBaseSalary,
      standardWorkDays,
      actualWorkDays,
      actualCheckInDays,
      workDaysAdjustment,
      calculatedBaseSalary,
      doneBonus,
      tipBonus,
      revenueBonus,
      totalRevenue: detail.totalRevenue,
      revCommissionRate: detail.revCommissionRate,
      ...holiday,
      totalIncome,
    };
  });

  return {
    data,
    total: data.length,
    summary: {
      totalBaseSalary: grandTotalBaseSalary,
      totalDoneBonus: grandTotalDoneBonus,
      totalTipBonus: grandTotalTipBonus,
      totalRevenueBonus: grandTotalRevenueBonus,
      totalHolidayBasePay: grandTotalHolidayBasePay,
      totalHolidayPremiumPay: grandTotalHolidayPremiumPay,
      totalHolidayPayrollAddition: grandTotalHolidayPayrollAddition,
      grandTotalIncome,
      totalBasicCheckinBonus: grandTotalBasicCheckinBonus,
      totalMilestoneBonus: grandTotalMilestoneBonus,
      totalPenaltyBonus: grandTotalPenaltyBonus,
      totalCustomerTip: grandTotalCustomerTip,
      totalRevenue: grandTotalRevenue,
    },
    detailsMap,
    orderCheckinMap,
  };
}

export async function getBkWorkLogs(
  fastify: FastifyInstance,
  staffId: number,
  startPart: string,
  endPart: string,
  currentUser?: { id: number; role: string; displayName?: string }
): Promise<BkWorkLogResponse | null> {
  const config = await getBkSalaryConfig(fastify);
  const workDaysOverrides = await getBkWorkDaysOverrides(fastify);

  // Fetch staff profile
  const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT 
      up.user_id as staffId,
      up.full_name as staffName,
      up.avatar as avatar,
      UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
    FROM \`user_profile\` up
    LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
    WHERE up.user_id = ${staffId}
    LIMIT 1
  `);

  if (profiles.length === 0) return null;
  const profile = profiles[0];

  const isTelesalesExecutive = await isStaffTelesalesExecutive(fastify, staffId);
  const canManageExceptions = currentUser
    ? await canUserManageTelesalesAttendance(fastify, currentUser, staffId)
    : false;

  const exceptionMap = isTelesalesExecutive
    ? await fetchTelesalesAttendanceExceptions(fastify, staffId, startPart, endPart)
    : new Map<string, TelesalesAttendanceExceptionItem>();

  const auditLogs = isTelesalesExecutive
    ? await fetchTelesalesAttendanceAuditLogs(fastify, staffId, startPart, endPart)
    : [];

  // Fetch daily attendance from report_staff
  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT 
      DATE_FORMAT(rs.date, '%Y-%m-%d') as workDate,
      DAYNAME(rs.date) as dayName,
      TIME_FORMAT(rs.working_shift_start_time, '%H:%i') as scheduledStart,
      TIME_FORMAT(rs.working_shift_end_time, '%H:%i') as scheduledEnd,
      TIME_FORMAT(rs.check_in_date, '%H:%i:%s') as firstIn,
      TIME_FORMAT(rs.check_out_date, '%H:%i:%s') as lastOut,
      rs.working_minute as workingMinute
    FROM \`report_staff\` rs
    WHERE rs.user_id = ${staffId}
      AND rs.date >= '${startPart}' AND rs.date <= '${endPart}'
    ORDER BY rs.date ASC
  `);

  const standardWorkDays = calculateStandardWorkDays(startPart, endPart);
  const monthlyBaseSalary = config.baseSalary;
  const dailySalaryRate = standardWorkDays > 0 ? Math.round(monthlyBaseSalary / standardWorkDays) : 0;

  const monthKey = startPart.slice(0, 7);
  const overrideKeyWithMonth = `${staffId}_${monthKey}`;
  const overrideVal = workDaysOverrides[overrideKeyWithMonth] ?? workDaysOverrides[String(staffId)];

  let totalCheckInDays = 0;
  let totalWorkingMinutes = 0;
  let totalEffectiveCreditDays = 0;
  let totalExceptionDays = 0;
  const rowDateSet = new Set<string>();

  const dayOfWeekMap: Record<string, string> = {
    Monday: 'Thứ Hai',
    Tuesday: 'Thứ Ba',
    Wednesday: 'Thứ Tư',
    Thursday: 'Thứ Năm',
    Friday: 'Thứ Sáu',
    Saturday: 'Thứ Bảy',
    Sunday: 'Chủ Nhật',
  };

  const logs: BkWorkLogRecord[] = rows.map((r) => {
    const isCheckIn = !!(r.firstIn || Number(r.workingMinute || 0) > 0);
    const minute = Number(r.workingMinute || 0);
    const workDate = String(r.workDate);
    rowDateSet.add(workDate);

    if (isCheckIn) {
      totalCheckInDays++;
      totalWorkingMinutes += minute;
    }

    const ex = exceptionMap.get(workDate) || null;
    let effectiveWorkCredit = isCheckIn ? 1.0 : 0.0;
    let dailySalary = isCheckIn ? dailySalaryRate : 0;
    let status: 'VALID' | 'OFF' | 'ADJUSTED' = isCheckIn ? 'VALID' : 'OFF';
    let exceptionBadge: BkWorkLogRecord['exceptionBadge'] = null;

    if (ex) {
      totalExceptionDays++;
      effectiveWorkCredit = ex.workCredit;
      dailySalary = Math.round(effectiveWorkCredit * dailySalaryRate);
      status = 'ADJUSTED';
      const opt = TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[ex.exceptionType];
      if (opt) {
        exceptionBadge = {
          text: opt.badgeText,
          color: opt.badgeColor,
          type: ex.exceptionType,
        };
      }
    }

    totalEffectiveCreditDays += effectiveWorkCredit;

    return {
      workDate,
      dayOfWeek: dayOfWeekMap[String(r.dayName)] || String(r.dayName),
      scheduledStart: r.scheduledStart ? String(r.scheduledStart) : null,
      scheduledEnd: r.scheduledEnd ? String(r.scheduledEnd) : null,
      firstIn: r.firstIn ? String(r.firstIn) : null,
      lastOut: r.lastOut ? String(r.lastOut) : null,
      manualInTime: ex?.manualInTime || null,
      manualOutTime: ex?.manualOutTime || null,
      workingMinute: minute,
      totalHours: Number((minute / 60).toFixed(2)),
      isCheckIn,
      status,
      dailySalary,
      exception: ex,
      effectiveWorkCredit,
      exceptionBadge,
    };
  });

  // If there are exceptions for dates that don't have a report_staff row in `rows` (e.g. Sunday overtime):
  for (const [exDate, ex] of exceptionMap.entries()) {
    if (!rowDateSet.has(exDate)) {
      totalExceptionDays++;
      const effectiveWorkCredit = ex.workCredit;
      totalEffectiveCreditDays += effectiveWorkCredit;
      const opt = TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[ex.exceptionType];
      const dt = new Date(exDate);
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayOfWeek = dayNames[dt.getUTCDay()] || '';

      logs.push({
        workDate: exDate,
        dayOfWeek,
        scheduledStart: null,
        scheduledEnd: null,
        firstIn: null,
        lastOut: null,
        manualInTime: ex?.manualInTime || null,
        manualOutTime: ex?.manualOutTime || null,
        workingMinute: 0,
        totalHours: 0,
        isCheckIn: false,
        status: 'ADJUSTED',
        dailySalary: Math.round(effectiveWorkCredit * dailySalaryRate),
        exception: ex,
        effectiveWorkCredit,
        exceptionBadge: opt
          ? {
              text: opt.badgeText,
              color: opt.badgeColor,
              type: ex.exceptionType,
            }
          : null,
      });
    }
  }

  // Sort logs by workDate ASC
  logs.sort((a, b) => a.workDate.localeCompare(b.workDate));

  const actualCheckInDays = totalCheckInDays;
  let actualWorkDays: number;
  if (typeof overrideVal === 'number') {
    actualWorkDays = overrideVal;
  } else if (isTelesalesExecutive && exceptionMap.size > 0) {
    actualWorkDays = Number(totalEffectiveCreditDays.toFixed(1));
  } else {
    actualWorkDays = actualCheckInDays;
  }

  const workDaysAdjustment = Number((actualWorkDays - actualCheckInDays).toFixed(1));
  const calculatedBaseSalary =
    standardWorkDays > 0 ? Math.round((monthlyBaseSalary / standardWorkDays) * actualWorkDays) : 0;

  return {
    staffId,
    staffName: String(profile.staffName || `BK #${staffId}`),
    avatar: profile.avatar ? String(profile.avatar) : null,
    store: String(profile.store || 'PXL'),
    isTelesalesExecutive,
    canManageExceptions,
    monthlyBaseSalary,
    standardWorkDays,
    actualWorkDays,
    actualCheckInDays,
    workDaysAdjustment,
    calculatedBaseSalary,
    summary: {
      totalDaysInRange: logs.length,
      totalCheckInDays,
      totalWorkingMinutes,
      totalWorkingHours: Number((totalWorkingMinutes / 60).toFixed(2)),
      totalDailySalary: calculatedBaseSalary,
      totalExceptionDays,
    },
    data: logs,
    auditLogs,
  };
}
