import {
  AUTONOMY_HARD_MAX_PCT,
  BRANCH_SPECS,
  type BranchKey,
  CHO_BASE_SALARY_VND,
  COMBO_PROD_BONUS_RATE,
  CVLL_FIXED_COST_VND,
  CVL_FIXED_COST_VND,
  CV_FIXED_COST_VND,
  EMPLOYER_SS_FLOOR_VND,
  EMPLOYER_SS_MGMT_VND,
  FM_BASE_SALARY_BY_LEVEL,
  FM_COVER_SHIFT_BONUS_VND,
  FM_DAILY_QUEST_CAP_VND,
  FM_FUN_FUND_PER_CONSULT_VND,
  FM_MIN_CEO_HR_MEETINGS_PER_WEEK,
  FM_STANDARD_WORK_DAYS,
  type FmLevel,
  LASH_PROD_BONUS_RATE,
  PILLAR_SPECS,
  type PillarKey,
  type StarsByPillar,
} from './fm-simulator.constants';

export * from './fm-simulator.constants';

export function createUniformStars(star: 0 | 1 | 2 | 3): StarsByPillar {
  return {
    maps: star,
    fal: star,
    autonomy: star,
    inventory: star,
    room: star,
    grooming: star,
    turn: star,
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

export interface SimulatorInput {
  readonly branch: BranchKey;
  readonly revVnd: number;
  readonly cvs: number;
  readonly fmLevel: FmLevel;
  readonly workDays: number;
  readonly coverShifts: number;
  readonly worms: number;
  readonly butterflies: number;
  readonly late24To48Count: number;
  readonly lateOver48Count: number;
  readonly shieldsLost: number;
  readonly consultShifts: number;
  readonly autonomyPct: number;
  readonly cvllKeyholders: number;
  readonly ceoHrMeetingsPerWeek: number;
  readonly stars: StarsByPillar;
  readonly pillarMetrics?: PillarMetrics;
  readonly pillarMaxRewards?: Partial<PillarMaxRewards>;
  readonly includeEmployerSs: boolean;
  readonly choBonusEnabled: boolean;
  readonly newCustomers: number;
}

export const DEFAULT_SIMULATOR_INPUT: SimulatorInput = {
  branch: 'dt',
  revVnd: BRANCH_SPECS.dt.presetDefaultRev,
  cvs: BRANCH_SPECS.dt.presetDefaultCvs,
  fmLevel: 2,
  workDays: 26,
  coverShifts: 0,
  worms: 0,
  butterflies: 0,
  late24To48Count: 0,
  lateOver48Count: 0,
  shieldsLost: 0,
  consultShifts: 6,
  autonomyPct: 50,
  cvllKeyholders: 1,
  ceoHrMeetingsPerWeek: FM_MIN_CEO_HR_MEETINGS_PER_WEEK,
  stars: {
    maps: 2,
    fal: 2,
    autonomy: 2,
    inventory: 2,
    room: 2,
    grooming: 2,
    turn: 2,
  },
  pillarMetrics: DEFAULT_PILLAR_METRICS,
  includeEmployerSs: true,
  choBonusEnabled: true,
  newCustomers: 45,
};

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

export function resolveRevPoolRate(revPerCvVnd: number): number {
  if (revPerCvVnd >= 52_000_000) return 0.022;
  if (revPerCvVnd >= 48_000_000) return 0.02;
  if (revPerCvVnd >= 44_000_000) return 0.015;
  if (revPerCvVnd >= 40_000_000) return 0.01;
  return 0.005;
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

export interface FmPillarBreakdown {
  readonly key: PillarKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly requestedStar: 0 | 1 | 2 | 3;
  readonly effectiveStar: 0 | 1 | 2 | 3;
  readonly max3StarVnd: number;
  readonly tierRewards: readonly [number, number, number, number];
  readonly grossVnd: number;
  readonly note: string | null;
}

export interface FmSimulationResult {
  readonly gate1Passed: boolean;
  readonly ceoHrGatePassed: boolean;
  readonly occupancyRatio: number;
  readonly minCvsGate: number;
  readonly fmCount: 1 | 2;
  readonly fmBaseOneVnd: number;
  readonly revPerCvVnd: number;
  readonly revPoolRate: number;
  readonly branchRevPoolVnd: number;
  readonly revShareOneFmVnd: number;
  readonly coverBonusOneFmVnd: number;
  readonly mapsCapFromWorms: 0 | 1 | 2 | 3;
  readonly netWorms: number;
  readonly pillarBreakdowns: readonly FmPillarBreakdown[];
  readonly totalEffectiveStars: number;
  readonly sum1StarBudgetVnd: number;
  readonly sum2StarBudgetVnd: number;
  readonly sum3StarBudgetVnd: number;
  readonly rawStarPoolVnd: number;
  readonly latePenaltyVnd: number;
  readonly shieldLossVnd: number;
  readonly netStarPoolOneFmVnd: number;
  readonly fmIncomeOneVnd: number;
  readonly fmIncomeAllVnd: number;
  readonly funFundVnd: number;
  readonly dailyQuestClaimableVnd: number;
  readonly claimedWalletVnd: number;
  readonly holidayAutopilotUnlocked: boolean;
}

export function simulateFm(input: SimulatorInput): FmSimulationResult {
  const spec = BRANCH_SPECS[input.branch];
  const cvs = Math.max(1, Math.round(input.cvs));
  const fmCount: 1 | 2 = cvs >= 13 ? 2 : 1;
  const gate1Passed = cvs >= spec.minCvsGate;
  const occupancyRatio = Math.min(1.5, cvs / spec.beds);

  const baseFull = FM_BASE_SALARY_BY_LEVEL[input.fmLevel];
  const workRatio = Math.max(0, Math.min(FM_STANDARD_WORK_DAYS, input.workDays)) / FM_STANDARD_WORK_DAYS;
  const fmBaseOneVnd = Math.round(baseFull * workRatio);

  const revPerCvVnd = input.revVnd / cvs;
  const revPoolRate = gate1Passed ? resolveRevPoolRate(revPerCvVnd) : 0;
  const branchRevPoolVnd = gate1Passed ? Math.round(input.revVnd * revPoolRate) : 0;

  // Gate 3: 1 FM = 100%; 2 FM = 30% each (60% fixed) + 40% team pool = 50% each on parity
  const revShareOneFmVnd = fmCount === 1 ? branchRevPoolVnd : Math.round(branchRevPoolVnd * 0.5);
  const coverBonusOneFmVnd = fmCount === 2 ? Math.max(0, Math.round(input.coverShifts)) * FM_COVER_SHIFT_BONUS_VND : 0;

  const netWorms = Math.max(0, Math.round(input.worms) - Math.round(input.butterflies));
  const mapsCapFromWorms: 0 | 1 | 2 | 3 = netWorms === 0 ? 3 : netWorms === 1 ? 2 : netWorms === 2 ? 1 : 0;
  const autonomyStar = resolveAutonomyStar(input.autonomyPct, input.cvllKeyholders);
  const ceoHrMeetings = Math.max(0, Math.round(input.ceoHrMeetingsPerWeek));
  const ceoHrGatePassed = ceoHrMeetings >= FM_MIN_CEO_HR_MEETINGS_PER_WEEK;
  const mapsTargets = resolveMapsTargets(cvs);

  const pillarBreakdowns: FmPillarBreakdown[] = PILLAR_SPECS.map((pillar) => {
    const tierRewards = resolvePillarTierRewards(pillar.key, input.pillarMaxRewards?.[pillar.key]);
    const requested = pillar.key === 'autonomy' ? autonomyStar : input.stars[pillar.key];
    let effective = requested;
    let note: string | null = null;

    if (pillar.key === 'maps') {
      const withButterfly = Math.min(3, requested + (input.butterflies > 0 && input.worms === 0 ? 1 : 0)) as
        0 | 1 | 2 | 3;
      effective = Math.min(withButterfly, mapsCapFromWorms) as 0 | 1 | 2 | 3;
      note =
        effective < requested
          ? `Giới hạn ${mapsCapFromWorms}★ do ${netWorms} sâu`
          : `Mốc ${mapsTargets[1]}/${mapsTargets[2]}/${mapsTargets[3]} rv (2–4%)`;
    } else if (pillar.key === 'autonomy') {
      const pct = Math.min(AUTONOMY_HARD_MAX_PCT, Math.round(input.autonomyPct));
      if (!ceoHrGatePassed) {
        effective = 0;
        note = `Thiếu CEO & HR (${ceoHrMeetings}/${FM_MIN_CEO_HR_MEETINGS_PER_WEEK} buổi/tuần)`;
      } else if (pct >= 60 && input.cvllKeyholders < 2) {
        note = `${pct}% · ${input.cvllKeyholders} CVLL (cần ≥2 CVLL lên 3★)`;
      } else if (pct >= 40 && input.cvllKeyholders < 1) {
        note = `${pct}% · 0 CVLL (cần ≥1 CVLL)`;
      } else {
        note = `${pct}% · ${input.cvllKeyholders} CVLL`;
      }
    }

    if (!gate1Passed) {
      effective = 0;
      note = `Chưa đạt ≥ ${spec.minCvsGate} CV`;
    }

    return {
      key: pillar.key,
      label: pillar.label,
      shortLabel: pillar.shortLabel,
      requestedStar: requested,
      effectiveStar: effective,
      max3StarVnd: tierRewards[3],
      tierRewards,
      grossVnd: tierRewards[effective],
      note,
    };
  });

  const totalEffectiveStars = pillarBreakdowns.reduce((acc, p) => acc + p.effectiveStar, 0);
  const sum1StarBudgetVnd = pillarBreakdowns.reduce((acc, p) => acc + p.tierRewards[1], 0);
  const sum2StarBudgetVnd = pillarBreakdowns.reduce((acc, p) => acc + p.tierRewards[2], 0);
  const sum3StarBudgetVnd = pillarBreakdowns.reduce((acc, p) => acc + p.tierRewards[3], 0);
  const rawStarPoolVnd = pillarBreakdowns.reduce((acc, p) => acc + p.grossVnd, 0);

  const latePenaltyRaw =
    Math.max(0, Math.round(input.late24To48Count)) * 200_000 + Math.max(0, Math.round(input.lateOver48Count)) * 300_000;
  const clampedShields = Math.max(0, Math.min(4, Math.round(input.shieldsLost)));
  const shieldLossVnd = Math.round(rawStarPoolVnd * (clampedShields * 0.25));
  const afterShield = Math.max(0, rawStarPoolVnd - shieldLossVnd);
  const latePenaltyVnd = Math.min(afterShield, latePenaltyRaw);
  const netStarPoolOneFmVnd = Math.max(0, afterShield - latePenaltyVnd);

  const fmIncomeOneVnd = fmBaseOneVnd + revShareOneFmVnd + coverBonusOneFmVnd + netStarPoolOneFmVnd;
  const fmIncomeAllVnd = fmIncomeOneVnd * fmCount;

  const funFundVnd = Math.max(0, Math.round(input.consultShifts)) * FM_FUN_FUND_PER_CONSULT_VND;
  const dailyQuestClaimableVnd = gate1Passed ? Math.min(netStarPoolOneFmVnd, FM_DAILY_QUEST_CAP_VND * 26) : 0;
  const claimedWalletVnd = dailyQuestClaimableVnd + funFundVnd;

  return {
    gate1Passed,
    ceoHrGatePassed,
    occupancyRatio,
    minCvsGate: spec.minCvsGate,
    fmCount,
    fmBaseOneVnd,
    revPerCvVnd,
    revPoolRate,
    branchRevPoolVnd,
    revShareOneFmVnd,
    coverBonusOneFmVnd,
    mapsCapFromWorms,
    netWorms,
    pillarBreakdowns,
    totalEffectiveStars,
    sum1StarBudgetVnd,
    sum2StarBudgetVnd,
    sum3StarBudgetVnd,
    rawStarPoolVnd,
    latePenaltyVnd,
    shieldLossVnd,
    netStarPoolOneFmVnd,
    fmIncomeOneVnd,
    fmIncomeAllVnd,
    funFundVnd,
    dailyQuestClaimableVnd,
    claimedWalletVnd,
    holidayAutopilotUnlocked: autonomyStar >= 2 && gate1Passed && ceoHrGatePassed,
  };
}

export interface PnlSimulationResult {
  readonly team: TeamSplitResult;
  readonly revVnd: number;
  readonly breakevenVnd: number;
  readonly floorFixedVnd: number;
  readonly floorLashBonusVnd: number;
  readonly floorComboBonusVnd: number;
  readonly floorTotalCashVnd: number;
  readonly avgFloorIncomeVnd: number;
  readonly avgCvTakeHomeVnd: number;
  readonly avgCvlTakeHomeVnd: number;
  readonly avgCvllTakeHomeVnd: number;
  readonly fmTotalCashVnd: number;
  readonly choBaseVnd: number;
  readonly choBonusVnd: number;
  readonly choTotalCashVnd: number;
  readonly employerSsVnd: number;
  readonly totalPeopleCostVnd: number;
  readonly peoplePctOfRev: number;
  readonly netResidualVnd: number;
  readonly netResidualPct: number;
  readonly isProfitable: boolean;
}

export function simulateBranchPnl(input: SimulatorInput, fmResult?: FmSimulationResult): PnlSimulationResult {
  const fm = fmResult ?? simulateFm(input);
  const spec = BRANCH_SPECS[input.branch];
  const revVnd = Math.max(0, input.revVnd);
  const team = splitFloorTeam(input.cvs, input.autonomyPct, input.cvllKeyholders);

  const floorFixedVnd =
    team.nCv * CV_FIXED_COST_VND + team.nCvl * CVL_FIXED_COST_VND + team.nCvll * CVLL_FIXED_COST_VND;

  const floorLashBonusVnd = Math.round(revVnd * LASH_PROD_BONUS_RATE);
  const floorComboBonusVnd = Math.round(revVnd * COMBO_PROD_BONUS_RATE);
  const floorTotalCashVnd = floorFixedVnd + floorLashBonusVnd + floorComboBonusVnd;

  const totalFloorHeadcount = Math.max(1, team.nCv + team.nCvl + team.nCvll);
  const variablePerFloorVnd = Math.round((floorLashBonusVnd + floorComboBonusVnd) / totalFloorHeadcount);
  const avgCvTakeHomeVnd = CV_FIXED_COST_VND + variablePerFloorVnd;
  const avgCvlTakeHomeVnd = CVL_FIXED_COST_VND + variablePerFloorVnd;
  const avgCvllTakeHomeVnd = CVLL_FIXED_COST_VND + variablePerFloorVnd;
  const avgFloorIncomeVnd = Math.round(floorTotalCashVnd / totalFloorHeadcount);

  const fmTotalCashVnd = fm.fmIncomeAllVnd;

  let choBonusVnd = 0;
  if (input.choBonusEnabled && revVnd >= spec.breakevenVnd) {
    const beMilestone = 3_000_000;
    const revOverBeBonus = Math.round((revVnd - spec.breakevenVnd) * 0.03);
    const newCustBonus = input.newCustomers >= 40 ? 3_500_000 : Math.round(input.newCustomers * 50_000);
    const angelTier =
      fm.revPerCvVnd >= 52_000_000
        ? 4_500_000
        : fm.revPerCvVnd >= 48_000_000
          ? 3_500_000
          : fm.revPerCvVnd >= 44_000_000
            ? 2_500_000
            : 1_500_000;
    choBonusVnd = beMilestone + revOverBeBonus + newCustBonus + angelTier;
  }
  const choTotalCashVnd = CHO_BASE_SALARY_VND + choBonusVnd;

  const mgmtCount = fm.fmCount + 1; // FM(s) + 1 CHO
  const employerSsVnd = input.includeEmployerSs
    ? totalFloorHeadcount * EMPLOYER_SS_FLOOR_VND + mgmtCount * EMPLOYER_SS_MGMT_VND
    : 0;

  const totalPeopleCostVnd = floorTotalCashVnd + fmTotalCashVnd + choTotalCashVnd + employerSsVnd;
  const peoplePctOfRev = revVnd > 0 ? (totalPeopleCostVnd / revVnd) * 100 : 0;
  const netResidualVnd = revVnd - totalPeopleCostVnd;
  const netResidualPct = revVnd > 0 ? (netResidualVnd / revVnd) * 100 : 0;

  return {
    team,
    revVnd,
    breakevenVnd: spec.breakevenVnd,
    floorFixedVnd,
    floorLashBonusVnd,
    floorComboBonusVnd,
    floorTotalCashVnd,
    avgFloorIncomeVnd,
    avgCvTakeHomeVnd,
    avgCvlTakeHomeVnd,
    avgCvllTakeHomeVnd,
    fmTotalCashVnd,
    choBaseVnd: CHO_BASE_SALARY_VND,
    choBonusVnd,
    choTotalCashVnd,
    employerSsVnd,
    totalPeopleCostVnd,
    peoplePctOfRev,
    netResidualVnd,
    netResidualPct,
    isProfitable: netResidualVnd >= 0,
  };
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
