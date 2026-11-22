import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  CcXoayRecord,
  CcXoayReportResponse,
  calculateFractionToday,
  calculateWheelBonusCap,
  removeVietnameseTones,
} from '@mos-lab/shared';

dayjs.extend(isoWeek);

export type CcXoayComparisonMode = 'month' | 'week' | 'day';

export interface CcXoayTabProps {
  data: CcXoayRecord[];
  loading?: boolean;
  total?: number;
  summary?: CcXoayReportResponse['summary'];
  onRefresh?: () => void;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  comparisonMode?: CcXoayComparisonMode;
}

export interface ConsultantAggregate {
  checkins: number;
  bonus: number;
  dailyBonus: number;
}

export interface StaffCapInfo {
  capStatus: 'NORMAL' | 'WARNING' | 'HARDCAPPED';
  wheelCapPercent: number;
  maxWheelBonusAllowed: number;
  effectiveWheelBonus: number;
}

export interface CapSummary {
  cappedCount: number;
  warningCount: number;
  cappedNames: string[];
  warningNames: string[];
}

export function calculateProjectedCcXoay(
  checkinCount: number,
  currentBonus: number,
  ratio: number,
  monthlyDailyBonus?: number
): number {
  if (ratio <= 0) return currentBonus;
  const safeRatio = Math.max(0.001, Math.min(1.0, ratio));
  if (checkinCount <= 0 && currentBonus <= 0) return 0;

  const nHat = checkinCount > 0 ? Math.round(checkinCount / safeRatio) : 0;
  if (nHat <= 0) return currentBonus;

  let c = 3.65;
  if (checkinCount >= 4 && currentBonus > 0) {
    const rawC = (currentBonus - 45 * checkinCount) / (checkinCount * (checkinCount - 1));
    if (!isNaN(rawC) && rawC >= 1.5 && rawC <= 8.0) {
      c = rawC;
    }
  }

  const rawProjected = Math.max(currentBonus, Math.round(c * nHat * (nHat - 1) + 45 * nHat));

  if (monthlyDailyBonus && monthlyDailyBonus > 0) {
    const projectedDailyBonus = Math.round(monthlyDailyBonus / safeRatio);
    const maxAllowed = Math.round(projectedDailyBonus * 1.5);
    return Math.min(rawProjected, maxAllowed);
  }

  return rawProjected;
}

export function computeCcXoayElapsedRatioPercent(
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs],
  comparisonMode: CcXoayComparisonMode = 'month'
): number {
  const now = dayjs();
  const currentHour = now.hour();
  const fractionToday = calculateFractionToday(currentHour);

  const start = dateRange?.[0] ? dayjs(dateRange[0]) : dayjs().startOf(comparisonMode === 'week' ? 'isoWeek' : 'month');
  const end = dateRange?.[1] ? dayjs(dateRange[1]) : dayjs().endOf(comparisonMode === 'week' ? 'isoWeek' : 'month');

  if (now.isBefore(start, 'day')) return 0.1;
  if (now.isAfter(end, 'day')) return 100;

  const totalDays = end.diff(start, 'day') + 1;
  const daysPassed = now.diff(start, 'day');
  const elapsedDays = daysPassed + fractionToday;
  const r = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
  return Math.round(r * 1000) / 10;
}

export function aggregateConsultants(data: CcXoayRecord[]): ConsultantAggregate[] {
  const map = new Map<string, ConsultantAggregate>();
  data.forEach((item) => {
    const name = item.consultantName || 'Unknown';
    const existing = map.get(name) || { checkins: 0, bonus: 0, dailyBonus: item.monthlyDailyBonus || 0 };
    existing.checkins += 1;
    existing.bonus += item.consultantBonus || 0;
    if (item.monthlyDailyBonus && item.monthlyDailyBonus > existing.dailyBonus) {
      existing.dailyBonus = item.monthlyDailyBonus;
    }
    map.set(name, existing);
  });
  return Array.from(map.values());
}

export function computeProjectedBonus(
  isMonthMode: boolean,
  consultantAggregates: ConsultantAggregate[],
  ratio: number,
  summaryTotalBonus?: number
): number {
  if (!isMonthMode) return 0;
  if (consultantAggregates.length > 0) {
    return consultantAggregates.reduce(
      (acc, r) => acc + calculateProjectedCcXoay(r.checkins, r.bonus, ratio, r.dailyBonus),
      0
    );
  }
  return Math.round((summaryTotalBonus || 0) / (ratio || 1));
}

export function buildStaffCapMap(data: CcXoayRecord[]): Map<string, StaffCapInfo> {
  const map = new Map<string, { dailyBonus: number; wheelBonus: number }>();
  data.forEach((item) => {
    const name = item.consultantName || 'Unknown';
    if (!map.has(name)) {
      map.set(name, { dailyBonus: item.monthlyDailyBonus || 0, wheelBonus: item.monthlyWheelBonus || 0 });
    } else {
      const cur = map.get(name)!;
      if (item.monthlyDailyBonus && item.monthlyDailyBonus > cur.dailyBonus) {
        cur.dailyBonus = item.monthlyDailyBonus;
      }
      if (item.monthlyWheelBonus && item.monthlyWheelBonus > cur.wheelBonus) {
        cur.wheelBonus = item.monthlyWheelBonus;
      }
    }
  });

  const resultMap = new Map<string, StaffCapInfo>();

  map.forEach((val, name) => {
    // Fallback demo values if backend data not fully populated
    const dBonus = val.dailyBonus || 1000000;
    const wBonus = val.wheelBonus || 0;
    const res = calculateWheelBonusCap(dBonus, wBonus);
    resultMap.set(name, {
      capStatus: res.capStatus,
      wheelCapPercent: res.wheelCapPercent,
      maxWheelBonusAllowed: res.maxWheelBonusAllowed,
      effectiveWheelBonus: res.effectiveWheelBonus,
    });
  });

  return resultMap;
}

export function computeCapSummary(staffCapMap: Map<string, StaffCapInfo>): CapSummary {
  let cappedCount = 0;
  let warningCount = 0;
  const cappedNames: string[] = [];
  const warningNames: string[] = [];

  staffCapMap.forEach((val, name) => {
    if (val.capStatus === 'HARDCAPPED') {
      cappedCount++;
      cappedNames.push(name);
    } else if (val.capStatus === 'WARNING') {
      warningCount++;
      warningNames.push(name);
    }
  });

  return { cappedCount, warningCount, cappedNames, warningNames };
}

export function filterCcXoayData(data: CcXoayRecord[], searchText: string): CcXoayRecord[] {
  if (!searchText) return data;
  const q = removeVietnameseTones(searchText);
  return data.filter((item) => {
    return (
      (item.clientName && removeVietnameseTones(item.clientName).includes(q)) ||
      (item.serviceName && removeVietnameseTones(item.serviceName).includes(q)) ||
      (item.consultantName && removeVietnameseTones(item.consultantName).includes(q)) ||
      (item.store && removeVietnameseTones(item.store).includes(q))
    );
  });
}

export function getCcXoayRowKey(record: CcXoayRecord): string {
  return `${record.serviceId}-${record.consultantId || ''}-${record.checkin}`;
}
