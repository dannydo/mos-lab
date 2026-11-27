import {
  AUTONOMY_HARD_MAX_PCT,
  BRANCH_SPECS,
  FM_EFFICIENCY_BENCHMARK_REV_VND,
  FM_EFFICIENCY_MAX_MULTIPLIER,
  FM_EFFICIENCY_MIN_MULTIPLIER,
  FM_ROOKIE_ESTIMATED_REV_VND,
  PILLAR_SPECS,
  type PillarKey,
  type StarsByPillar,
} from './fm-simulator.constants';

export function createUniformStars(star: 0 | 1 | 2 | 3): StarsByPillar {
  return {
    maps: star,
    fal: star,
    autonomy: star,
    inventory: star,
    room: star,
    grooming: star,
    turn: star,
    bonding: star,
  };
}

export type PillarMaxRewards = Record<PillarKey, number>;

export type MetricPillarKey = 'maps' | 'fal' | 'inventory' | 'room' | 'turn';

export interface PillarMetrics {
  readonly mapsReviews5Star: number;
  readonly falRatePct: number;
  readonly inventoryVariancePct: number;
  readonly roomScore: number;
  readonly turnHiPct: number;
}

export function resolveMapsTargets(cvs: number): readonly [number, number, number, number] {
  const safeCvs = Math.max(1, Math.round(cvs));
  return [0, safeCvs * 2, safeCvs * 3, safeCvs * 4];
}

export const DEFAULT_PILLAR_METRICS: PillarMetrics = {
  mapsReviews5Star: BRANCH_SPECS.dt.presetDefaultCvs * 3,
  falRatePct: 1.0,
  inventoryVariancePct: 2.0,
  roomScore: 96,
  turnHiPct: 88,
};

export function resolveStarFromPillarMetric(
  key: MetricPillarKey,
  value: number,
  cvs = BRANCH_SPECS.dt.presetDefaultCvs
): 0 | 1 | 2 | 3 {
  if (key === 'maps') {
    const [, t1, t2, t3] = resolveMapsTargets(cvs);
    if (value >= t3) return 3;
    if (value >= t2) return 2;
    if (value >= t1) return 1;
    return 0;
  }
  if (key === 'fal') {
    if (value <= 0.5) return 3;
    if (value <= 1.0) return 2;
    if (value <= 1.5) return 1;
    return 0;
  }
  if (key === 'inventory') {
    if (value <= 1.0) return 3;
    if (value <= 2.0) return 2;
    if (value <= 3.0) return 1;
    return 0;
  }
  if (key === 'room') {
    if (value >= 98) return 3;
    if (value >= 95) return 2;
    if (value >= 90) return 1;
    return 0;
  }
  if (value >= 92) return 3;
  if (value >= 85) return 2;
  if (value >= 75) return 1;
  return 0;
}

export function resolveDefaultMetricForStar(
  key: MetricPillarKey,
  star: 0 | 1 | 2 | 3,
  cvs = BRANCH_SPECS.dt.presetDefaultCvs
): number {
  if (key === 'maps') {
    return resolveMapsTargets(cvs)[star];
  }
  const table: Record<Exclude<MetricPillarKey, 'maps'>, readonly [number, number, number, number]> = {
    fal: [2.0, 1.5, 1.0, 0.5],
    inventory: [4.0, 3.0, 2.0, 1.0],
    room: [85, 92, 96, 98],
    turn: [70, 78, 88, 95],
  };
  return table[key][star];
}

export function createMetricsForUniformStar(
  star: 0 | 1 | 2 | 3,
  cvs = BRANCH_SPECS.dt.presetDefaultCvs
): PillarMetrics {
  return {
    mapsReviews5Star: resolveDefaultMetricForStar('maps', star, cvs),
    falRatePct: resolveDefaultMetricForStar('fal', star, cvs),
    inventoryVariancePct: resolveDefaultMetricForStar('inventory', star, cvs),
    roomScore: resolveDefaultMetricForStar('room', star, cvs),
    turnHiPct: resolveDefaultMetricForStar('turn', star, cvs),
  };
}

export interface TeamSplitResult {
  readonly nCv: number;
  readonly nCvl: number;
  readonly nCvll: number;
  readonly effectiveAutonomyPct: number;
  readonly cvllActual: number;
}

export function splitFloorTeam(cvs: number, autonomyPctInput: number, cvllKeyholders: number): TeamSplitResult {
  const safeCvs = Math.max(0, Math.round(cvs));
  const clampedAutonomy = Math.max(0, Math.min(AUTONOMY_HARD_MAX_PCT, autonomyPctInput));
  const maxAutonomous = Math.floor(safeCvs * (AUTONOMY_HARD_MAX_PCT / 100));
  const rawAutonomous = Math.round((safeCvs * clampedAutonomy) / 100);
  const totalAutonomous = Math.min(maxAutonomous, rawAutonomous);
  const nCvll = Math.min(totalAutonomous, Math.max(0, Math.round(cvllKeyholders)));
  const nCvl = Math.max(0, totalAutonomous - nCvll);
  const nCv = Math.max(0, safeCvs - nCvl - nCvll);
  const effectiveAutonomyPct = safeCvs > 0 ? Math.round((totalAutonomous / safeCvs) * 100) : 0;
  return {
    nCv,
    nCvl,
    nCvll,
    effectiveAutonomyPct,
    cvllActual: nCvll,
  };
}

export function resolveAutonomyStar(autonomyPct: number, cvllKeyholders: number): 0 | 1 | 2 | 3 {
  const pct = Math.min(AUTONOMY_HARD_MAX_PCT, Math.max(0, autonomyPct));
  if (pct >= 60 && cvllKeyholders >= 2) return 3;
  if (pct >= 50 && cvllKeyholders >= 1) return 2;
  if (pct >= 40 && cvllKeyholders >= 1) return 1;
  return 0;
}

export function resolveAutonomyBoundsForStar(star: 0 | 1 | 2 | 3): {
  autonomyPct: number;
  cvllKeyholders: number;
} {
  if (star === 3) return { autonomyPct: 60, cvllKeyholders: 2 };
  if (star === 2) return { autonomyPct: 50, cvllKeyholders: 1 };
  if (star === 1) return { autonomyPct: 40, cvllKeyholders: 1 };
  return { autonomyPct: 25, cvllKeyholders: 0 };
}

export function resolveSmoothEfficiencyMultiplier(
  revPerMatureCvVnd: number,
  benchmarkRevVnd = FM_EFFICIENCY_BENCHMARK_REV_VND
): number {
  const safeBenchmark = Math.max(1_000_000, benchmarkRevVnd);
  const raw = revPerMatureCvVnd / safeBenchmark;
  return Math.max(FM_EFFICIENCY_MIN_MULTIPLIER, Math.min(FM_EFFICIENCY_MAX_MULTIPLIER, raw));
}

export function resolveBaseOccupancyRate(cvs: number, beds: number): number {
  const occ = Math.max(0.5, Math.min(1.0, cvs / Math.max(1, beds)));
  return 0.01 + ((occ - 0.5) / 0.5) * 0.004;
}

export function resolvePerFmRevRate(
  cvs: number,
  revPerMatureCvVnd: number,
  beds: number
): {
  readonly ratePerFm: number;
  readonly effMultiplier: number;
} {
  const baseRatePerFm = resolveBaseOccupancyRate(cvs, beds);
  const effMultiplier = resolveSmoothEfficiencyMultiplier(revPerMatureCvVnd);
  return { ratePerFm: baseRatePerFm * effMultiplier, effMultiplier };
}

export function resolveRevPoolRate(revPerCvVnd: number): number {
  return 0.0115 * resolveSmoothEfficiencyMultiplier(revPerCvVnd);
}

export function computeLockedRevVnd(cvs: number, rookieCvs: number, revPerMatureCvM: number): number {
  const safeCvs = Math.max(1, Math.round(cvs));
  const safeRookies = Math.max(0, Math.min(safeCvs - 1, Math.round(rookieCvs)));
  const matureCvs = Math.max(1, safeCvs - safeRookies);
  const safeRevPerCvM = Math.max(20, Math.min(80, Number(revPerMatureCvM) || 48));
  return Math.round(matureCvs * safeRevPerCvM * 1_000_000 + safeRookies * FM_ROOKIE_ESTIMATED_REV_VND);
}

export function resolvePillarTierRewards(
  key: PillarKey,
  max3StarVnd?: number
): readonly [number, number, number, number] {
  const spec = PILLAR_SPECS.find((p) => p.key === key);
  if (!spec) return [0, 0, 0, 0];
  if (max3StarVnd === undefined || max3StarVnd === spec.rewards[3]) {
    return spec.rewards;
  }
  const r3 = Math.max(0, Math.round(max3StarVnd / 50_000) * 50_000);
  if (r3 === 0) return [0, 0, 0, 0];
  const r1 = Math.round(r3 / 3 / 50_000) * 50_000;
  const r2 = Math.min(r3, Math.max(r1, Math.round((r3 * 2) / 3 / 50_000) * 50_000));
  return [0, r1, r2, r3];
}

export function formatM(vnd: number, decimals = 1): string {
  const millions = vnd / 1_000_000;
  const sign = millions < 0 ? '-' : '';
  const abs = Math.abs(millions);
  return `${sign}${abs.toFixed(decimals)}M`;
}

export function formatK(vnd: number): string {
  return `${Math.round(vnd / 1_000).toLocaleString('en-US')}K`;
}
