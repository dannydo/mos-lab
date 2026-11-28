import {
  CareerProgressionConfig,
  CcTrainingMentorshipBreakdown,
  CvOtherAllowanceItem,
  CvPaystubResponse,
  CvPaystubSocialSecurityBreakdown,
  CvPlusRewardSnapshot,
  CvlTrainingMentorshipPair,
  HolidayPayBreakdown,
  SafeAny,
  StaffOffDayResult,
} from '@mos-lab/shared';

export interface SeniorityBonusRule {
  minMonths: number;
  bonusPercent: number;
}

export const DEFAULT_SENIORITY_BONUS_RULES: SeniorityBonusRule[] = [
  { minMonths: 6, bonusPercent: 5 },
  { minMonths: 12, bonusPercent: 10 },
  { minMonths: 24, bonusPercent: 20 },
];

export interface MonthOffLeaveItem {
  date: string;
  workingDayCount: number;
  shiftHours: number;
  note: string | null;
}

export interface CvXoaySummary {
  bonus: number;
  serviceCount: number;
}

export interface CvTipSummary {
  totalTip: number;
  baseTechTip: number;
  consultDeltaTip: number;
}

export interface SocialSecurityInfo {
  rate: number;
  amount: number;
}

export interface CrmStaffSeniorityRow {
  legacyStaffId: number | null;
  joinedAt: Date | null;
  seniorityOffset: number | null;
}

export interface MosAllowanceRow {
  id: number;
  staffId: number;
  title: string;
  amount: number;
  note: string | null;
  createdAt: Date;
}

export interface CvPaystubRawSources {
  crmStaffs: CrmStaffSeniorityRow[];
  seniorityConfigRecord: { value: string } | null;
  contractRatesRows: SafeAny[];
  periodPayrollRows: SafeAny[];
  reportStaffRows: SafeAny[];
  cvXoayBonusRows: SafeAny[];
  cvTipBonusRows: SafeAny[];
  techPointsRows: SafeAny[];
  monthOffLeavesRows: SafeAny[];
  staffOffDayBatchMap: Map<number, StaffOffDayResult>;
  holidayBreakdownMap: Map<number, HolidayPayBreakdown>;
  holidayWorkedDateMap: Map<number, Set<string>>;
  extraSupportRows: SafeAny[];
  mosAllowances: MosAllowanceRow[];
  careerConfigRecord: { value: string } | null;
  cvPlusProgressions: SafeAny[];
  activeTrainingPairs: CvlTrainingMentorshipPair[];
  allTrainingPairs: CvlTrainingMentorshipPair[];
  transferredTrainingTipMap: Map<number, number>;
  mentorBreakdownsByStaff: Map<number, CcTrainingMentorshipBreakdown[]>;
}

export interface CvPaystubIndexedData {
  crmStaffMap: Map<number, { joinedAt: Date; seniorityOffset: number }>;
  sortedSeniorityBonusRules: SeniorityBonusRule[];
  extraSupportDetailsMap: Map<number, CvOtherAllowanceItem[]>;
  extraSupportMap: Map<number, number>;
  legacyOffWeekExtraMap: Map<number, number>;
  techPointsMap: Map<number, number>;
  hourlyRateMap: Map<number, number>;
  socialSecurityMap: Map<number, SocialSecurityInfo>;
  staffPayrollMap: Map<number, SafeAny>;
  userOffDayWorkDatesMap: Map<number, Set<string>>;
  cvXoayMap: Map<number, CvXoaySummary>;
  cvTipMap: Map<number, CvTipSummary>;
  monthOffLeavesMap: Map<number, MonthOffLeaveItem[]>;
  reportDaysByStaff: Map<number, SafeAny[]>;
  holidayBreakdownMap: Map<number, HolidayPayBreakdown>;
  holidayWorkedDateMap: Map<number, Set<string>>;
  cvToCvPlusConfig: CareerProgressionConfig['cvToCvPlus'];
  cvPlusRewardMap: Map<number, CvPlusRewardSnapshot>;
  officialCvlRoleMap: Map<number, string>;
  mentorBreakdownsByStaff: Map<number, CcTrainingMentorshipBreakdown[]>;
  allTrainingPairs: CvlTrainingMentorshipPair[];
}

export function parseDateRange(dateFrom?: string, dateTo?: string): { startPart: string; endPart: string } {
  const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
  const endStr = dateTo || new Date().toLocaleDateString('en-CA');

  const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
  const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

  return { startPart, endPart };
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

export function computeStaffOffDayWorkDates(dateStrings: Iterable<string>, offDaysConfig: Set<number>): Set<string> {
  const weekDaysMap = new Map<string, Set<string>>();
  for (const dateStr of dateStrings) {
    const d = getLocalDate(dateStr);
    const monStr = getMondayStr(d);
    let weekDates = weekDaysMap.get(monStr);
    if (!weekDates) {
      weekDates = new Set();
      weekDaysMap.set(monStr, weekDates);
    }
    weekDates.add(dateStr);
  }

  const offDayWorkDates = new Set<string>();
  for (const datesSet of weekDaysMap.values()) {
    if (datesSet.size === 7) {
      for (const dateStr of datesSet) {
        const d = getLocalDate(dateStr);
        const wd = getIsoWeekday(d);
        if (offDaysConfig.has(wd)) {
          offDayWorkDates.add(dateStr);
        }
      }
    }
  }
  return offDayWorkDates;
}

export function computeBatchOffDayWorkDates(
  reportStaffRows: SafeAny[],
  staffDayOffMap: Map<number, Set<number>>
): Map<number, Set<string>> {
  const datesByStaff = new Map<number, string[]>();
  for (const row of reportStaffRows) {
    const uid = Number(row.staff_id);
    const dateStr = String(row.dateStr);
    const list = datesByStaff.get(uid);
    if (list) {
      list.push(dateStr);
    } else {
      datesByStaff.set(uid, [dateStr]);
    }
  }

  const userOffDayWorkDatesMap = new Map<number, Set<string>>();
  for (const [uid, dateStrings] of datesByStaff.entries()) {
    const offDaysConfig = staffDayOffMap.get(uid) || new Set<number>();
    const offDayDates = computeStaffOffDayWorkDates(dateStrings, offDaysConfig);
    if (offDayDates.size > 0) {
      userOffDayWorkDatesMap.set(uid, offDayDates);
    }
  }
  return userOffDayWorkDatesMap;
}

export function calculateSeniorityMonths(joinedAt: Date | string, offset: number, endPart: string): number {
  const joinedDateStr =
    joinedAt instanceof Date ? joinedAt.toISOString().split('T')[0] : String(joinedAt).split('T')[0];
  const [sy, sm, sd] = joinedDateStr.split('-').map(Number);
  const [ey, em, ed] = endPart.split('-').map(Number);
  let rawMonths = (ey - sy) * 12 + (em - sm);
  if (ed < sd) {
    rawMonths -= 1;
  }
  return Math.max(0, rawMonths + offset);
}

export function resolveSeniorityBonusPercent(seniorityMonths: number, sortedRules: SeniorityBonusRule[]): number {
  for (const rule of sortedRules) {
    if (seniorityMonths >= rule.minMonths) {
      return rule.bonusPercent;
    }
  }
  return 0;
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

export function createEmptyCvPaystubResponse(includeTimeBonus: boolean): CvPaystubResponse {
  return {
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
      ...(includeTimeBonus ? { totalTimeBonus: 0 } : {}),
      grandTotalIncome: 0,
    },
  };
}
