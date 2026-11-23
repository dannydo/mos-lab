import dayjs, { Dayjs } from 'dayjs';
import { CcLeaderboardEntry, calculateFractionToday, calculateWheelBonusCap } from '@mos-lab/shared';

export const fmtVnd = (v: number) => Math.round(v).toLocaleString('vi-VN');

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

export function computeElapsedRatioPercent(
  dateRange?: [Dayjs, Dayjs],
  comparisonMode: 'month' | 'week' | 'day' = 'month'
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

export function computeMaxBarValue(leaderboard: CcLeaderboardEntry[]): number {
  if (!leaderboard?.length) return 1;
  return Math.max(
    ...leaderboard.map((cc) => {
      const d = cc.monthlyDailyBonus || 0;
      const w = cc.monthlyWheelBonus || 0;
      const cap = calculateWheelBonusCap(d, w);
      return Math.max(cap.maxWheelBonusAllowed, cap.rawWheelBonus, cap.monthlyDailyBonus);
    }),
    1
  );
}

export function computeCapSummary(leaderboard: CcLeaderboardEntry[]): {
  hardcapped: number;
  warning: number;
  normal: number;
} {
  let hardcapped = 0;
  let warning = 0;
  let normal = 0;
  leaderboard.forEach((cc) => {
    const s = calculateWheelBonusCap(cc.monthlyDailyBonus || 0, cc.monthlyWheelBonus || 0).capStatus;
    if (s === 'HARDCAPPED') hardcapped++;
    else if (s === 'WARNING') warning++;
    else normal++;
  });
  return { hardcapped, warning, normal };
}
