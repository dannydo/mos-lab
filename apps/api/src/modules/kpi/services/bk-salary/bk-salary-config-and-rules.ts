import { FastifyInstance } from 'fastify';
import { BkSalaryConfig, SafeAny } from '@mos-lab/shared';
import { TeamService } from '../../../teams/team.service.js';

export const DEFAULT_BK_CONFIG: BkSalaryConfig = {
  activeBkIds: [43554, 50670, 52316, 32268, 49126, 50585],
  baseSalary: 5500000,
  tipsPercent: 7,
  minDoneForMissedBonus: 100,
  clientBonusFullSet: {
    discount0: 35000,
    discount30: 12000,
    discount50: 6000,
    discountMore: 1000,
  },
  clientBonusRefill: {
    discount30: 9000,
    discount50: 6000,
    discountMore: 1000,
  },
  doneBonusTiers: [
    { minCount: 100, bonus: 300000 },
    { minCount: 150, bonus: 600000 },
    { minCount: 200, bonus: 900000 },
    { minCount: 250, bonus: 1200000 },
    { minCount: 300, bonus: 1500000 },
    { minCount: 350, bonus: 1800000 },
    { minCount: 400, bonus: 2100000 },
    { minCount: 450, bonus: 2400000 },
    { minCount: 500, bonus: 2700000 },
  ],
  missedBonusTiers: [
    { maxRate: 10, bonus: 1000000 },
    { maxRate: 15, bonus: 500000 },
    { maxRate: 20, bonus: 0 },
    { maxRate: 25, bonus: -500000 },
    { maxRate: 100, bonus: -1000000 },
  ],
  revBonusTiers: [
    { minRev: 50000000, rate: 0.7 },
    { minRev: 100000000, rate: 0.8 },
    { minRev: 150000000, rate: 0.9 },
    { minRev: 200000000, rate: 1.0 },
    { minRev: 250000000, rate: 1.1 },
    { minRev: 300000000, rate: 1.2 },
  ],
};

/** Fixed operational rule: a completed Combo Live service earns the Booker 1,000 VND. */
export const BK_COMBO_LIVE_DONE_BONUS = 1000;

export async function getActiveBkIds(fastify: FastifyInstance): Promise<number[]> {
  const ids = await TeamService.getActiveStaffIdsWithFallback(fastify, 'BK', 'ACTIVE_BK_STAFF_CONFIG');
  return ids.length > 0 ? ids : DEFAULT_BK_CONFIG.activeBkIds;
}

/**
 * BK Done is an operational Telesales leaderboard. Keep this scope tied to the
 * explicit BK_TELESALES team rather than the wider BK/CS/Control configuration.
 */
export async function getActiveBkTelesalesIds(fastify: FastifyInstance): Promise<number[]> {
  return TeamService.getActiveStaffIdsWithFallback(fastify, 'BK_TELESALES', 'ACTIVE_BK_TELESALES_STAFF_CONFIG');
}

/**
 * Keeps Booking detail requests within the active BK_TELESALES roster, including
 * when a caller supplies an explicit Booker ID.
 */
export function resolveBkTelesalesStaffScope(activeTelesalesIds: number[], requestedBookerId?: string): number[] {
  if (!requestedBookerId || requestedBookerId === 'ALL') {
    return activeTelesalesIds;
  }

  const bookerId = Number(requestedBookerId);
  return Number.isInteger(bookerId) && activeTelesalesIds.includes(bookerId) ? [bookerId] : [];
}

export async function getBkWorkDaysOverrides(fastify: FastifyInstance): Promise<Record<string, number>> {
  try {
    const cfg = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'BK_WORK_DAYS_OVERRIDE' },
    });
    if (cfg?.value) {
      return JSON.parse(cfg.value) as Record<string, number>;
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error reading BK_WORK_DAYS_OVERRIDE config');
  }
  return {};
}

export async function getBkSalaryConfig(fastify: FastifyInstance): Promise<BkSalaryConfig> {
  const workDaysOverrides = await getBkWorkDaysOverrides(fastify);
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'BK_SALARY_CONFIG' },
      select: { value: true },
    });
    if (configRecord && configRecord.value) {
      const parsed = JSON.parse(configRecord.value);
      return {
        ...DEFAULT_BK_CONFIG,
        ...parsed,
        workDaysOverrides,
        activeBkIds: await getActiveBkIds(fastify),
      };
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching BK_SALARY_CONFIG from DB');
  }
  return {
    ...DEFAULT_BK_CONFIG,
    workDaysOverrides,
    activeBkIds: await getActiveBkIds(fastify),
  };
}

export function getMilestoneBonus(doneCount: number, tiers?: Array<{ minCount: number; bonus: number }>): number {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.doneBonusTiers)].sort((a, b) => b.minCount - a.minCount);
  const found = sorted.find((t) => doneCount >= t.minCount);
  return found ? found.bonus : 0;
}

export function getMilestoneBonusInfo(
  doneCount: number,
  tiers?: Array<{ minCount: number; bonus: number }>
): { bonus: number; doneLevelCount: number } {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.doneBonusTiers)].sort((a, b) => b.minCount - a.minCount);
  const found = sorted.find((t) => doneCount >= t.minCount);
  return found ? { bonus: found.bonus, doneLevelCount: found.minCount } : { bonus: 0, doneLevelCount: 0 };
}

export function getMissedRateBonus(
  missedRatePercent: number,
  tiers?: Array<{ maxRate: number; bonus: number }>,
  doneCount?: number,
  minDoneCount?: number
): number {
  const threshold = minDoneCount ?? DEFAULT_BK_CONFIG.minDoneForMissedBonus ?? 100;
  if (doneCount !== undefined && doneCount < threshold) {
    return 0;
  }
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.missedBonusTiers)].sort((a, b) => a.maxRate - b.maxRate);
  const found = sorted.find((t) => missedRatePercent <= t.maxRate);
  return found ? found.bonus : 0;
}

export function getMissedRateBonusInfo(
  missedRatePercent: number,
  tiers?: Array<{ maxRate: number; bonus: number }>,
  doneCount?: number,
  minDoneCount?: number
): { bonus: number; missedLevelRate: number } {
  const threshold = minDoneCount ?? DEFAULT_BK_CONFIG.minDoneForMissedBonus ?? 100;
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.missedBonusTiers)].sort((a, b) => a.maxRate - b.maxRate);
  const found = sorted.find((t) => missedRatePercent <= t.maxRate);
  if (doneCount !== undefined && doneCount < threshold) {
    return { bonus: 0, missedLevelRate: found ? found.maxRate : 0 };
  }
  return found ? { bonus: found.bonus, missedLevelRate: found.maxRate } : { bonus: 0, missedLevelRate: 0 };
}

export function getRevCommissionRate(totalRevenue: number, tiers?: Array<{ minRev: number; rate: number }>): number {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.revBonusTiers)].sort((a, b) => b.minRev - a.minRev);
  const found = sorted.find((t) => totalRevenue >= t.minRev);
  return found ? found.rate : 0;
}

export function getRevCommissionRateInfo(
  totalRevenue: number,
  tiers?: Array<{ minRev: number; rate: number }>
): { rate: number; revLevelMin: number } {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.revBonusTiers)].sort((a, b) => b.minRev - a.minRev);
  const found = sorted.find((t) => totalRevenue >= t.minRev);
  return found ? { rate: found.rate, revLevelMin: found.minRev } : { rate: 0, revLevelMin: 0 };
}

export function calculateCheckinBonus(
  serviceType: string,
  serviceName: string,
  servicePrice: number,
  discountAmount: number,
  config: BkSalaryConfig
): { bonus: number; checkinCategory: string; discountRate: number } {
  const isRefill = serviceType === 'Retain' || /refill|dặm/i.test(serviceName);
  const discountRate = servicePrice > 0 ? (discountAmount / servicePrice) * 100 : 0;

  if (isRefill) {
    if (discountRate <= 30) {
      return { bonus: config.clientBonusRefill?.discount30 ?? 9000, checkinCategory: 'Dặm Mi (<=30%)', discountRate };
    } else if (discountRate <= 50) {
      return { bonus: config.clientBonusRefill?.discount50 ?? 6000, checkinCategory: 'Dặm Mi (<=50%)', discountRate };
    } else {
      return { bonus: config.clientBonusRefill?.discountMore ?? 1000, checkinCategory: 'Dặm Mi (>50%)', discountRate };
    }
  } else {
    if (discountRate <= 0) {
      return { bonus: config.clientBonusFullSet?.discount0 ?? 35000, checkinCategory: 'Nối Mới (0%)', discountRate };
    } else if (discountRate <= 30) {
      return {
        bonus: config.clientBonusFullSet?.discount30 ?? 12000,
        checkinCategory: 'Nối Mới (<=30%)',
        discountRate,
      };
    } else if (discountRate <= 50) {
      return { bonus: config.clientBonusFullSet?.discount50 ?? 6000, checkinCategory: 'Nối Mới (<=50%)', discountRate };
    } else {
      return {
        bonus: config.clientBonusFullSet?.discountMore ?? 1000,
        checkinCategory: 'Nối Mới (>50%)',
        discountRate,
      };
    }
  }
}

export function calculateStandardWorkDays(startDateStr: string, endDateStr: string): number {
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

  const cur = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  let standardDays = 0;
  while (cur <= end) {
    const dayOfWeek = cur.getUTCDay(); // 0 is Sunday
    if (dayOfWeek !== 0) {
      standardDays++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return standardDays;
}
