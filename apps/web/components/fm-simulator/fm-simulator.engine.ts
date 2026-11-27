import { resolveBondingStarFromDinner } from '@mos-lab/shared';
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
  FM_BOUNTY_CVLL_PROMO_VND,
  FM_BOUNTY_CVL_PROMO_VND,
  FM_BOUNTY_FM2_MENTOR_VND,
  FM_BOUNTY_ROOKIE_PASS_VND,
  FM_COVER_SHIFT_BONUS_VND,
  FM_CVLL_KEYHOLDER_ALLOWANCE_VND,
  FM_DAILY_QUEST_CAP_VND,
  FM_DEFAULT_WEEKLY_QUEST_REWARD_VND,
  FM_FUN_FUND_PER_CONSULT_VND,
  FM_MIN_CEO_HR_MEETINGS_PER_WEEK,
  FM_PHASE2_OVERLOAD_REV_VND,
  FM_PHASE2_ROOKIE_RATIO_THRESHOLD,
  FM_ROOKIE_ESTIMATED_REV_VND,
  FM_SECOND_FM_MIN_MATURE_CVS,
  FM_SECOND_FM_MIN_REV_VND,
  FM_STANDARD_WORK_DAYS,
  type FmLevel,
  type FmStaffingMode,
  LASH_PROD_BONUS_RATE,
  PILLAR_SPECS,
  type PillarKey,
  type StarsByPillar,
} from './fm-simulator.constants';
import {
  DEFAULT_PILLAR_METRICS,
  type PillarMaxRewards,
  type PillarMetrics,
  type TeamSplitResult,
  resolveAutonomyStar,
  resolveMapsTargets,
  resolvePerFmRevRate,
  resolvePillarTierRewards,
  splitFloorTeam,
} from './fm-simulator.helpers';

export * from './fm-simulator.constants';
export * from './fm-simulator.helpers';

export interface SimulatorInput {
  readonly branch: BranchKey;
  readonly revVnd: number;
  readonly cvs: number;
  readonly fmLevel: FmLevel;
  readonly fmStaffingMode?: FmStaffingMode;
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
  readonly bondingDinnerOrganized: boolean;
  readonly bondingHasSocialCheckin: boolean;
  readonly bondingParticipationPct: number;
  readonly weeklyQuestsCompletedInMonth: number;
  readonly weeklyQuestRewardVnd: number;
  readonly rookieCvs: number;
  readonly bountyRookiePassCount: number;
  readonly bountyCvlPromoCount: number;
  readonly bountyCvllPromoCount: number;
  readonly bountyFm2MentorCount: number;
}

export const DEFAULT_SIMULATOR_INPUT: SimulatorInput = {
  branch: 'dt',
  revVnd: BRANCH_SPECS.dt.presetDefaultRev,
  cvs: BRANCH_SPECS.dt.presetDefaultCvs,
  fmLevel: 2,
  fmStaffingMode: 'auto',
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
    bonding: 2,
  },
  pillarMetrics: DEFAULT_PILLAR_METRICS,
  includeEmployerSs: true,
  choBonusEnabled: true,
  newCustomers: 45,
  bondingDinnerOrganized: true,
  bondingHasSocialCheckin: true,
  bondingParticipationPct: 80,
  weeklyQuestsCompletedInMonth: 8,
  weeklyQuestRewardVnd: FM_DEFAULT_WEEKLY_QUEST_REWARD_VND,
  rookieCvs: 0,
  bountyRookiePassCount: 0,
  bountyCvlPromoCount: 0,
  bountyCvllPromoCount: 0,
  bountyFm2MentorCount: 0,
};

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

export interface FmPhase2Signals {
  readonly overloadSignal: boolean;
  readonly rookieHeavySignal: boolean;
  readonly hubBenchSignal: boolean;
  readonly activeCount: number;
}

export interface FmSimulationResult {
  readonly gate1Passed: boolean;
  readonly ceoHrGatePassed: boolean;
  readonly occupancyRatio: number;
  readonly minCvsGate: number;
  readonly fmCount: 1 | 2;
  readonly fmStaffingMode: FmStaffingMode;
  readonly matureCvs: number;
  readonly rookieCvs: number;
  readonly fmBaseOneVnd: number;
  readonly revPerCvVnd: number;
  readonly revPerMatureCvVnd: number;
  readonly effMultiplier: number;
  readonly revPoolRate: number;
  readonly branchRevPoolVnd: number;
  readonly revShareOneFmVnd: number;
  readonly coverBonusOneFmVnd: number;
  readonly graduationBountyOneFmVnd: number;
  readonly cvllKeyholderAllowanceVnd: number;
  readonly secondFmQuarterlyBenchCostVnd: number;
  readonly singleVsHubMonthlySavingsVnd: number;
  readonly phase2Signals: FmPhase2Signals;
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
  readonly weeklyQuestFundVnd: number;
  readonly shopFundMonthlyVnd: number;
  readonly bondingShieldPenaltyCount: 0 | 1;
  readonly effectiveShieldsLost: number;
  readonly dailyQuestClaimableVnd: number;
  readonly claimedWalletVnd: number;
  readonly holidayAutopilotUnlocked: boolean;
}

export function simulateFm(input: SimulatorInput): FmSimulationResult {
  const spec = BRANCH_SPECS[input.branch];
  const cvs = Math.max(1, Math.round(input.cvs));
  const rookieCvs = Math.max(0, Math.min(cvs - 1, Math.round(input.rookieCvs ?? 0)));
  const matureCvs = Math.max(1, cvs - rookieCvs);
  const fmStaffingMode: FmStaffingMode = input.fmStaffingMode ?? 'auto';
  const autoTwoFm = matureCvs >= FM_SECOND_FM_MIN_MATURE_CVS && input.revVnd >= FM_SECOND_FM_MIN_REV_VND;
  const fmCount: 1 | 2 = fmStaffingMode === 'single' ? 1 : fmStaffingMode === 'hub' ? 2 : autoTwoFm ? 2 : 1;
  const gate1Passed = cvs >= spec.minCvsGate;
  const occupancyRatio = Math.min(1.5, cvs / spec.beds);

  const baseFull = FM_BASE_SALARY_BY_LEVEL[input.fmLevel];
  const workRatio = Math.max(0, Math.min(FM_STANDARD_WORK_DAYS, input.workDays)) / FM_STANDARD_WORK_DAYS;
  const fmBaseOneVnd = Math.round(baseFull * workRatio);

  const revPerCvVnd = input.revVnd / cvs;
  const estimatedRookieRevVnd = Math.min(input.revVnd * 0.4, rookieCvs * FM_ROOKIE_ESTIMATED_REV_VND);
  const revPerMatureCvVnd =
    rookieCvs > 0 ? Math.max(revPerCvVnd, (input.revVnd - estimatedRookieRevVnd) / matureCvs) : revPerCvVnd;
  const rateEval = resolvePerFmRevRate(cvs, revPerMatureCvVnd, spec.beds);
  const revPoolRate = gate1Passed ? rateEval.ratePerFm : 0;
  const revShareOneFmVnd = gate1Passed ? Math.round(input.revVnd * revPoolRate) : 0;
  const branchRevPoolVnd = revShareOneFmVnd * fmCount;
  const coverBonusOneFmVnd = fmCount === 2 ? Math.max(0, Math.round(input.coverShifts)) * FM_COVER_SHIFT_BONUS_VND : 0;
  const graduationBountyOneFmVnd = gate1Passed
    ? Math.max(0, Math.round(input.bountyRookiePassCount ?? 0)) * FM_BOUNTY_ROOKIE_PASS_VND +
      Math.max(0, Math.round(input.bountyCvlPromoCount ?? 0)) * FM_BOUNTY_CVL_PROMO_VND +
      Math.max(0, Math.round(input.bountyCvllPromoCount ?? 0)) * FM_BOUNTY_CVLL_PROMO_VND +
      Math.max(0, Math.round(input.bountyFm2MentorCount ?? 0)) * FM_BOUNTY_FM2_MENTOR_VND
    : 0;

  const netWorms = Math.max(0, Math.round(input.worms) - Math.round(input.butterflies));
  const mapsCapFromWorms: 0 | 1 | 2 | 3 = netWorms === 0 ? 3 : netWorms === 1 ? 2 : netWorms === 2 ? 1 : 0;
  const autonomyStar = resolveAutonomyStar(input.autonomyPct, input.cvllKeyholders);
  const ceoHrMeetings = Math.max(0, Math.round(input.ceoHrMeetingsPerWeek));
  const ceoHrGatePassed = ceoHrMeetings >= FM_MIN_CEO_HR_MEETINGS_PER_WEEK;
  const mapsTargets = resolveMapsTargets(matureCvs);
  const bondingEval = resolveBondingStarFromDinner({
    organized: input.bondingDinnerOrganized,
    hasSocialCheckin: input.bondingHasSocialCheckin,
    attendancePct: input.bondingParticipationPct,
  });

  const pillarBreakdowns: FmPillarBreakdown[] = PILLAR_SPECS.map((pillar) => {
    const tierRewards = resolvePillarTierRewards(pillar.key, input.pillarMaxRewards?.[pillar.key]);
    const requested =
      pillar.key === 'autonomy' ? autonomyStar : pillar.key === 'bonding' ? bondingEval.star : input.stars[pillar.key];
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
    } else if (pillar.key === 'bonding') {
      const pct = Math.max(0, Math.min(100, Math.round(input.bondingParticipationPct)));
      if (!input.bondingDinnerOrganized) {
        note = 'Chưa tổ chức đi ăn (mất 1 Khiên Tuần)';
      } else if (!input.bondingHasSocialCheckin) {
        note = 'Thiếu ảnh check-in MXH (mất 1 Khiên Tuần)';
      } else if (bondingEval.star === 0) {
        note = `${pct}% tham gia (cần ≥70% đạt 1★)`;
      } else {
        note = `${pct}% tham gia · Đủ check-in MXH`;
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
  const bondingShieldPenaltyCount: 0 | 1 = bondingEval.missingDinnerShieldPenalty;
  const effectiveShieldsLost = Math.max(0, Math.min(4, Math.round(input.shieldsLost) + bondingShieldPenaltyCount));
  const shieldLossVnd = Math.round(rawStarPoolVnd * (effectiveShieldsLost * 0.25));
  const afterShield = Math.max(0, rawStarPoolVnd - shieldLossVnd);
  const latePenaltyVnd = Math.min(afterShield, latePenaltyRaw);
  const netStarPoolOneFmVnd = Math.max(0, afterShield - latePenaltyVnd);

  const fmIncomeOneVnd =
    fmBaseOneVnd + revShareOneFmVnd + coverBonusOneFmVnd + graduationBountyOneFmVnd + netStarPoolOneFmVnd;
  const fmIncomeAllVnd =
    (fmBaseOneVnd + revShareOneFmVnd + coverBonusOneFmVnd + netStarPoolOneFmVnd) * fmCount + graduationBountyOneFmVnd;

  const funFundVnd = Math.max(0, Math.round(input.consultShifts)) * FM_FUN_FUND_PER_CONSULT_VND;
  const weeklyQuestFundVnd =
    Math.max(0, Math.round(input.weeklyQuestsCompletedInMonth)) * Math.max(0, Math.round(input.weeklyQuestRewardVnd));
  const shopFundMonthlyVnd = funFundVnd * fmCount + weeklyQuestFundVnd;
  const dailyQuestClaimableVnd = gate1Passed ? Math.min(netStarPoolOneFmVnd, FM_DAILY_QUEST_CAP_VND * 26) : 0;
  const claimedWalletVnd = dailyQuestClaimableVnd + funFundVnd;

  const cvllKeyholderAllowanceVnd =
    fmCount === 1 && cvs >= FM_SECOND_FM_MIN_MATURE_CVS
      ? Math.min(2, Math.max(0, Math.round(input.cvllKeyholders))) * FM_CVLL_KEYHOLDER_ALLOWANCE_VND
      : 0;
  const secondFmMonthlyTotalCostVnd =
    fmBaseOneVnd +
    revShareOneFmVnd +
    netStarPoolOneFmVnd +
    (input.includeEmployerSs ? EMPLOYER_SS_MGMT_VND : 0) +
    funFundVnd;
  const secondFmQuarterlyBenchCostVnd = secondFmMonthlyTotalCostVnd * 3;
  const singleVsHubMonthlySavingsVnd = Math.max(0, secondFmMonthlyTotalCostVnd - cvllKeyholderAllowanceVnd);

  const falMetric = input.pillarMetrics?.falRatePct ?? DEFAULT_PILLAR_METRICS.falRatePct;
  const mapsEffective = pillarBreakdowns.find((p) => p.key === 'maps')?.effectiveStar ?? 0;
  const overloadSignal = input.revVnd >= FM_PHASE2_OVERLOAD_REV_VND && (falMetric > 1.0 || mapsEffective < 2);
  const rookieHeavySignal = rookieCvs / cvs > FM_PHASE2_ROOKIE_RATIO_THRESHOLD;
  const hubBenchSignal = fmStaffingMode === 'hub' || autoTwoFm;
  const phase2Signals: FmPhase2Signals = {
    overloadSignal,
    rookieHeavySignal,
    hubBenchSignal,
    activeCount: Number(overloadSignal) + Number(rookieHeavySignal) + Number(hubBenchSignal),
  };

  return {
    gate1Passed,
    ceoHrGatePassed,
    occupancyRatio,
    minCvsGate: spec.minCvsGate,
    fmCount,
    fmStaffingMode,
    matureCvs,
    rookieCvs,
    fmBaseOneVnd,
    revPerCvVnd,
    revPerMatureCvVnd,
    effMultiplier: rateEval.effMultiplier,
    revPoolRate,
    branchRevPoolVnd,
    revShareOneFmVnd,
    coverBonusOneFmVnd,
    graduationBountyOneFmVnd,
    cvllKeyholderAllowanceVnd,
    secondFmQuarterlyBenchCostVnd,
    singleVsHubMonthlySavingsVnd,
    phase2Signals,
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
    weeklyQuestFundVnd,
    shopFundMonthlyVnd,
    bondingShieldPenaltyCount,
    effectiveShieldsLost,
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
  readonly keyholderAllowanceVnd: number;
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
  readonly shopCultureFundVnd: number;
  readonly shopCulturePctOfRev: number;
  readonly peoplePctOfRev: number;
  readonly netResidualVnd: number;
  readonly netResidualPct: number;
  readonly isProfitable: boolean;
}

export function simulateBranchPnl(input: SimulatorInput, fmResult?: FmSimulationResult): PnlSimulationResult {
  const fm = fmResult ?? simulateFm(input);
  const spec = BRANCH_SPECS[input.branch];
  const revVnd = Math.max(0, input.revVnd);
  const matureTeam = splitFloorTeam(fm.matureCvs, input.autonomyPct, input.cvllKeyholders);
  const team: TeamSplitResult = {
    ...matureTeam,
    nCv: matureTeam.nCv + fm.rookieCvs,
  };

  const floorFixedVnd =
    team.nCv * CV_FIXED_COST_VND + team.nCvl * CVL_FIXED_COST_VND + team.nCvll * CVLL_FIXED_COST_VND;
  const keyholderAllowanceVnd = fm.cvllKeyholderAllowanceVnd;

  const floorLashBonusVnd = Math.round(revVnd * LASH_PROD_BONUS_RATE);
  const floorComboBonusVnd = Math.round(revVnd * COMBO_PROD_BONUS_RATE);
  const floorTotalCashVnd = floorFixedVnd + keyholderAllowanceVnd + floorLashBonusVnd + floorComboBonusVnd;

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
      fm.revPerMatureCvVnd >= 52_000_000
        ? 4_500_000
        : fm.revPerMatureCvVnd >= 48_000_000
          ? 3_500_000
          : fm.revPerMatureCvVnd >= 44_000_000
            ? 2_500_000
            : 1_500_000;
    choBonusVnd = beMilestone + revOverBeBonus + newCustBonus + angelTier;
  }
  const choTotalCashVnd = CHO_BASE_SALARY_VND + choBonusVnd;

  const mgmtCount = fm.fmCount + 1;
  const employerSsVnd = input.includeEmployerSs
    ? totalFloorHeadcount * EMPLOYER_SS_FLOOR_VND + mgmtCount * EMPLOYER_SS_MGMT_VND
    : 0;

  const totalPeopleCostVnd = floorTotalCashVnd + fmTotalCashVnd + choTotalCashVnd + employerSsVnd;
  const shopCultureFundVnd = fm.shopFundMonthlyVnd;
  const shopCulturePctOfRev = revVnd > 0 ? (shopCultureFundVnd / revVnd) * 100 : 0;
  const peoplePctOfRev = revVnd > 0 ? (totalPeopleCostVnd / revVnd) * 100 : 0;
  const netResidualVnd = revVnd - totalPeopleCostVnd - shopCultureFundVnd;
  const netResidualPct = revVnd > 0 ? (netResidualVnd / revVnd) * 100 : 0;

  return {
    team,
    revVnd,
    breakevenVnd: spec.breakevenVnd,
    floorFixedVnd,
    keyholderAllowanceVnd,
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
    shopCultureFundVnd,
    shopCulturePctOfRev,
    peoplePctOfRev,
    netResidualVnd,
    netResidualPct,
    isProfitable: netResidualVnd >= 0,
  };
}
