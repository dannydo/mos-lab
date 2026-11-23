import {
  CcPaystubResponse,
  CcTrainingMentorshipBreakdown,
  CcXoayReportResponse,
  CvOtherAllowanceItem,
  CvPaystubSocialSecurityBreakdown,
  DailySalesBonusConsultantResponse,
  HolidayPayBreakdown,
  SafeAny,
  StaffOffDayResult,
} from '@mos-lab/shared';

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface CcMonthOffLeaveItem {
  date: string;
  workingDayCount: number;
  shiftHours: number;
  note: string | null;
}

export interface CcTipSummary {
  bonus: number;
  count: number;
}

export interface CcShiftHoursSummary {
  days: number;
  hours: number;
}

export interface CcDailyBonusTotal {
  bonus: number;
  comboQty: number;
  productQty: number;
}

export interface CcXoaySummary {
  count: number;
  bonus: number;
}

export interface CcMosAllowanceRow {
  id: number;
  staffId: number;
  title: string;
  amount: number;
  note: string | null;
  createdAt: Date;
}

export interface CcPaystubRawSources {
  contractRatesRows: SafeAny[];
  periodPayrollRows: SafeAny[];
  shiftsRows: SafeAny[];
  workDaysRows: SafeAny[];
  reportStaffRows: SafeAny[];
  monthOffLeavesRows: SafeAny[];
  staffOffDayBatchMap: Map<number, StaffOffDayResult>;
  holidayBreakdownMap: Map<number, HolidayPayBreakdown>;
  holidayWorkedDateMap: Map<number, Set<string>>;
  xoayReportResult: CcXoayReportResponse;
  dailySalesResult: DailySalesBonusConsultantResponse;
  ccTipRows: SafeAny[];
  extraSupportRows: SafeAny[];
  mosAllowances: CcMosAllowanceRow[];
  mentorBreakdownsByCc: Map<number, CcTrainingMentorshipBreakdown[]>;
}

export interface CcPaystubIndexedData {
  extraSupportDetailsMap: Map<number, CvOtherAllowanceItem[]>;
  extraSupportMap: Map<number, number>;
  legacyOffWeekExtraMap: Map<number, number>;
  ccTipMap: Map<number, CcTipSummary>;
  hourlyRatesMap: Map<number, number>;
  staffPayrollMap: Map<number, SafeAny>;
  shiftHoursMap: Map<number, CcShiftHoursSummary>;
  workDaysMap: Map<number, number>;
  userOffDayWorkDatesMap: Map<number, Set<string>>;
  monthOffLeavesMap: Map<number, CcMonthOffLeaveItem[]>;
  reportDaysByStaff: Map<number, SafeAny[]>;
  xoayMap: Map<number, CcXoaySummary>;
  staffDailyBonusTotals: Map<number, CcDailyBonusTotal>;
  holidayBreakdownMap: Map<number, HolidayPayBreakdown>;
  holidayWorkedDateMap: Map<number, Set<string>>;
  mentorBreakdownsByCc: Map<number, CcTrainingMentorshipBreakdown[]>;
}

export function normalizeDatePart(value: string | undefined, fallback: string): string {
  const datePart = value?.includes('T') ? value.split('T')[0] : value;
  return datePart && ISO_DATE_PATTERN.test(datePart) ? datePart : fallback;
}

export function parseDefaultDateRange(dateFrom?: string, dateTo?: string): { startPart: string; endPart: string } {
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
  const defaultEnd = new Date().toLocaleDateString('en-CA');

  return {
    startPart: normalizeDatePart(dateFrom, defaultStart),
    endPart: normalizeDatePart(dateTo, defaultEnd),
  };
}

export function getLocalDate(dStr: string): Date {
  const p = dStr.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

export function getMondayStr(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export function getIsoWeekday(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

export function getExtendedWeekBounds(
  startPart: string,
  endPart: string
): { extendedStartMonday: string; extendedEndStr: string } {
  const startDate = getLocalDate(startPart);
  const endDate = getLocalDate(endPart);

  const extendedStartMonday = getMondayStr(startDate);
  const endMonday = getLocalDate(getMondayStr(endDate));
  const extendedEndSunday = new Date(endMonday);
  extendedEndSunday.setDate(endMonday.getDate() + 6);
  const extendedEndStr = extendedEndSunday.toISOString().split('T')[0];

  return { extendedStartMonday, extendedEndStr };
}

export function buildActualCheckinOrdersCte(): string {
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

export function actualCheckinQueryParams(startPart: string, endPart: string): string[] {
  const start = startPart.includes(' ') ? startPart : `${startPart} 00:00:00`;
  const end = endPart.includes(' ') ? endPart : `${endPart} 23:59:59`;
  return [start, end, start, end];
}

export function computeBatchOffDayWorkDates(
  reportStaffRows: SafeAny[],
  staffDayOffMap: Map<number, Set<number>>
): Map<number, Set<string>> {
  // Group extended report by week Monday -> Set of date strings
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

  // Find off-day work dates
  const userOffDayWorkDatesMap = new Map<number, Set<string>>();
  for (const [uid, weekMap] of userWeekDays.entries()) {
    const offDayDates = new Set<string>();
    const offDaysConfig = staffDayOffMap.get(uid) || new Set<number>();

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

  return userOffDayWorkDatesMap;
}

export function parseTrackingData(rawTrackingKey: unknown): SafeAny {
  if (!rawTrackingKey) return {};
  try {
    return typeof rawTrackingKey === 'string' ? JSON.parse(rawTrackingKey) : rawTrackingKey;
  } catch {
    return {};
  }
}

export function buildSocialSecurityBreakdown(
  socialSecurityAmount: number,
  socialSecurityRate: number,
  trackingData: SafeAny
): CvPaystubSocialSecurityBreakdown | undefined {
  if (socialSecurityAmount <= 0) return undefined;

  const ssBase = Number(
    trackingData?.social_security?.social_insurance_rate ||
      (socialSecurityRate > 1000000 ? socialSecurityRate : 5400000)
  );
  const employerSS = trackingData?.social_security?.rate?.employer || {};
  const employeeSS = trackingData?.social_security?.rate?.employee || {};

  return {
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

export function createEmptyCcPaystubResponse(): CcPaystubResponse {
  return {
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
  };
}
