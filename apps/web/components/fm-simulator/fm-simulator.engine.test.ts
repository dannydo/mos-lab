import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIMULATOR_INPUT,
  FM_ROOKIE_BOUNTY_PROBATION_DAYS,
  FM_ROOKIE_GRACE_DAYS,
  computeLockedRevVnd,
  createMetricsForUniformStar,
  createUniformStars,
  resolveBaseOccupancyRate,
  resolveMapsTargets,
  resolvePerFmRevRate,
  resolveSmoothEfficiencyMultiplier,
  resolveStarFromPillarMetric,
  simulateBranchPnl,
  simulateFm,
  splitFloorTeam,
  resolveAutonomyStar,
} from './fm-simulator.engine';

describe('fm-simulator.engine', () => {
  it('enforces hard 60% cap on CVL + CVLL in splitFloorTeam', () => {
    const split = splitFloorTeam(14, 95, 4);
    expect(split.nCvl + split.nCvll).toBe(Math.floor(14 * 0.6)); // 8
    expect(split.nCv).toBe(6);
    expect(split.nCv + split.nCvl + split.nCvll).toBe(14);
    expect(split.effectiveAutonomyPct).toBeLessThanOrEqual(60);
  });

  it('requires CVLL keyholders to unlock 1★/2★/3★ autonomy stars', () => {
    expect(resolveAutonomyStar(60, 0)).toBe(0);
    expect(resolveAutonomyStar(45, 1)).toBe(1);
    expect(resolveAutonomyStar(55, 1)).toBe(2);
    expect(resolveAutonomyStar(60, 2)).toBe(3);
  });

  it('calculates exact 8★ totals (1★=1.70M, 2★=3.40M, 3★=5.05M)', () => {
    const baseInput = {
      ...DEFAULT_SIMULATOR_INPUT,
      worms: 0,
      butterflies: 0,
      late24To48Count: 0,
      lateOver48Count: 0,
      shieldsLost: 0,
      bondingDinnerOrganized: true,
      bondingHasSocialCheckin: true,
    };

    const allOne = simulateFm({
      ...baseInput,
      autonomyPct: 40,
      cvllKeyholders: 1,
      bondingParticipationPct: 70,
      stars: createUniformStars(1),
    });
    expect(allOne.netStarPoolOneFmVnd).toBe(1_700_000);

    const allTwo = simulateFm({
      ...baseInput,
      autonomyPct: 50,
      cvllKeyholders: 1,
      bondingParticipationPct: 80,
      stars: createUniformStars(2),
    });
    expect(allTwo.netStarPoolOneFmVnd).toBe(3_400_000);

    const allThree = simulateFm({
      ...baseInput,
      autonomyPct: 60,
      cvllKeyholders: 2,
      bondingParticipationPct: 90,
      stars: createUniformStars(3),
    });
    expect(allThree.netStarPoolOneFmVnd).toBe(5_050_000);
  });

  it('zeros DT bonuses below 50% bed occupancy (< 9 CV) and keeps base salary intact', () => {
    const res = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      branch: 'dt',
      cvs: 8,
    });
    expect(res.gate1Passed).toBe(false);
    expect(res.branchRevPoolVnd).toBe(0);
    expect(res.netStarPoolOneFmVnd).toBe(0);
    expect(res.fmIncomeOneVnd).toBe(9_000_000); // FM 2 base stays untouched
  });

  it('splits into 2 FM when cvs >= 13 and caps Maps star via net worms', () => {
    const res = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      cvs: 14,
      worms: 2,
      butterflies: 0,
      stars: {
        ...DEFAULT_SIMULATOR_INPUT.stars,
        maps: 3,
      },
    });
    expect(res.fmCount).toBe(2);
    expect(res.mapsCapFromWorms).toBe(1);
    const mapsPillar = res.pillarBreakdowns.find((p) => p.key === 'maps');
    expect(mapsPillar?.effectiveStar).toBe(1);
    expect(res.claimedWalletVnd).toBe(res.dailyQuestClaimableVnd + res.funFundVnd);
  });

  it('computes all-in P&L reconciling Floor fixed + 4.2% lash + 3.28% combo/SP + BHXH + FM + CHO + Shop Fund', () => {
    const fm = simulateFm(DEFAULT_SIMULATOR_INPUT);
    const pnl = simulateBranchPnl(DEFAULT_SIMULATOR_INPUT, fm);
    expect(pnl.floorLashBonusVnd).toBe(Math.round(680_000_000 * 0.042));
    expect(pnl.floorComboBonusVnd).toBe(Math.round(680_000_000 * 0.0328));
    expect(pnl.totalPeopleCostVnd).toBe(
      pnl.floorTotalCashVnd + pnl.fmTotalCashVnd + pnl.choTotalCashVnd + pnl.employerSsVnd
    );
    expect(pnl.shopCultureFundVnd).toBe(fm.shopFundMonthlyVnd);
    expect(pnl.netResidualVnd).toBe(680_000_000 - pnl.totalPeopleCostVnd - pnl.shopCultureFundVnd);
    expect(pnl.isProfitable).toBe(true);
  });

  it('builds 3★ ceiling via createUniformStars(3) reaching exact 5.05M star pool', () => {
    const res = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      worms: 0,
      butterflies: 0,
      late24To48Count: 0,
      lateOver48Count: 0,
      shieldsLost: 0,
      autonomyPct: 60,
      cvllKeyholders: 2,
      bondingDinnerOrganized: true,
      bondingHasSocialCheckin: true,
      bondingParticipationPct: 90,
      stars: createUniformStars(3),
    });
    expect(res.totalEffectiveStars).toBe(24);
    expect(res.netStarPoolOneFmVnd).toBe(5_050_000);
  });

  it('enforces Pillar #8 Bonding 70/80/90%, social check-in shield loss, and Shop Fund rollover', () => {
    const noDinner = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      shieldsLost: 0,
      bondingDinnerOrganized: false,
      bondingHasSocialCheckin: false,
      bondingParticipationPct: 95,
    });
    const noDinnerBonding = noDinner.pillarBreakdowns.find((p) => p.key === 'bonding');
    expect(noDinnerBonding?.effectiveStar).toBe(0);
    expect(noDinner.bondingShieldPenaltyCount).toBe(1);
    expect(noDinner.effectiveShieldsLost).toBe(1);
    expect(noDinner.shieldLossVnd).toBe(Math.round(noDinner.rawStarPoolVnd * 0.25));

    const below70WithCheckin = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      shieldsLost: 0,
      bondingDinnerOrganized: true,
      bondingHasSocialCheckin: true,
      bondingParticipationPct: 65,
    });
    expect(below70WithCheckin.pillarBreakdowns.find((p) => p.key === 'bonding')?.effectiveStar).toBe(0);
    expect(below70WithCheckin.bondingShieldPenaltyCount).toBe(0);
    expect(below70WithCheckin.effectiveShieldsLost).toBe(0);

    const baseIncome = below70WithCheckin.fmIncomeOneVnd;
    const withExtraQuests = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      shieldsLost: 0,
      bondingDinnerOrganized: true,
      bondingHasSocialCheckin: true,
      bondingParticipationPct: 65,
      weeklyQuestsCompletedInMonth: 12,
      weeklyQuestRewardVnd: 500_000,
    });
    expect(withExtraQuests.weeklyQuestFundVnd).toBe(6_000_000);
    expect(withExtraQuests.shopFundMonthlyVnd).toBe(withExtraQuests.funFundVnd * withExtraQuests.fmCount + 6_000_000);
    expect(withExtraQuests.fmIncomeOneVnd).toBe(baseIncome);
  });

  it('recomputes tier rewards and star budgets when custom pillarMaxRewards sliders are adjusted', () => {
    const res = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      worms: 0,
      butterflies: 0,
      late24To48Count: 0,
      lateOver48Count: 0,
      shieldsLost: 0,
      autonomyPct: 60,
      cvllKeyholders: 2,
      bondingDinnerOrganized: true,
      bondingHasSocialCheckin: true,
      bondingParticipationPct: 90,
      stars: createUniformStars(3),
      pillarMaxRewards: {
        maps: 1_500_000,
        autonomy: 900_000,
      },
    });
    const maps = res.pillarBreakdowns.find((p) => p.key === 'maps');
    const autonomy = res.pillarBreakdowns.find((p) => p.key === 'autonomy');
    expect(maps?.tierRewards).toEqual([0, 500_000, 1_000_000, 1_500_000]);
    expect(autonomy?.tierRewards).toEqual([0, 300_000, 600_000, 900_000]);
    expect(res.sum3StarBudgetVnd).toBe(5_650_000);
    expect(res.netStarPoolOneFmVnd).toBe(5_650_000);
  });

  it('maps real KPI pillar metrics directly to expected stars and CV-scaled 2%/3%/4% Maps', () => {
    expect(resolveMapsTargets(10)).toEqual([0, 20, 30, 40]);
    expect(resolveMapsTargets(14)).toEqual([0, 28, 42, 56]);
    expect(resolveMapsTargets(18)).toEqual([0, 36, 54, 72]);
    expect(resolveStarFromPillarMetric('maps', 56, 14)).toBe(3);
    expect(resolveStarFromPillarMetric('maps', 30, 14)).toBe(1);
    expect(resolveStarFromPillarMetric('maps', 20, 14)).toBe(0);
    expect(resolveStarFromPillarMetric('fal', 0.5)).toBe(3);
    expect(resolveStarFromPillarMetric('fal', 1.2)).toBe(1);
    expect(resolveStarFromPillarMetric('inventory', 2.0)).toBe(2);
    expect(resolveStarFromPillarMetric('room', 98)).toBe(3);
    expect(resolveStarFromPillarMetric('turn', 85)).toBe(2);

    const metrics3 = createMetricsForUniformStar(3, 14);
    expect(metrics3.mapsReviews5Star).toBe(56);
    expect(metrics3.falRatePct).toBeLessThanOrEqual(0.5);
    expect(metrics3.inventoryVariancePct).toBeLessThanOrEqual(1.0);
    expect(metrics3.roomScore).toBeGreaterThanOrEqual(98);
    expect(metrics3.turnHiPct).toBeGreaterThanOrEqual(92);
  });

  it('requires >= 3 CEO & HR career meetings/week and >= 2 CVLL for Autonomy 3★', () => {
    const missingMeetings = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      autonomyPct: 60,
      cvllKeyholders: 2,
      ceoHrMeetingsPerWeek: 2,
    });
    const missingAutonomy = missingMeetings.pillarBreakdowns.find((p) => p.key === 'autonomy');
    expect(missingMeetings.ceoHrGatePassed).toBe(false);
    expect(missingAutonomy?.effectiveStar).toBe(0);
    expect(missingAutonomy?.grossVnd).toBe(0);
    expect(missingMeetings.holidayAutopilotUnlocked).toBe(false);

    const oneCvll = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      autonomyPct: 60,
      cvllKeyholders: 1,
      ceoHrMeetingsPerWeek: 3,
    });
    const oneCvllAutonomy = oneCvll.pillarBreakdowns.find((p) => p.key === 'autonomy');
    expect(oneCvllAutonomy?.effectiveStar).toBe(2);
    expect(oneCvllAutonomy?.note).toContain('cần ≥2 CVLL');

    const fullAutonomy = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      autonomyPct: 60,
      cvllKeyholders: 2,
      ceoHrMeetingsPerWeek: 3,
    });
    const fullPillar = fullAutonomy.pillarBreakdowns.find((p) => p.key === 'autonomy');
    expect(fullAutonomy.ceoHrGatePassed).toBe(true);
    expect(fullPillar?.effectiveStar).toBe(3);
    expect(fullPillar?.grossVnd).toBe(600_000);
    expect(fullAutonomy.holidayAutopilotUnlocked).toBe(true);
  });

  it('guarantees strict monotonicity: adding CVs or crossing 12->13 grows BOTH FM pay and Branch P&L', () => {
    const headcounts = [9, 10, 11, 12, 13, 14, 16, 18];
    let prevFmIncome = 0;
    let prevNetPnl = 0;
    for (const cvs of headcounts) {
      const simInput = {
        ...DEFAULT_SIMULATOR_INPUT,
        branch: 'dt' as const,
        cvs,
        revVnd: cvs * 50_000_000,
        fmLevel: 2 as const,
        stars: createUniformStars(2),
      };
      const fm = simulateFm(simInput);
      const pnl = simulateBranchPnl(simInput, fm);
      if (cvs >= 13) expect(fm.fmCount).toBe(2);
      else expect(fm.fmCount).toBe(1);
      expect(fm.fmIncomeOneVnd).toBeGreaterThan(prevFmIncome);
      expect(pnl.netResidualVnd).toBeGreaterThan(prevNetPnl);
      prevFmIncome = fm.fmIncomeOneVnd;
      prevNetPnl = pnl.netResidualVnd;
    }
  });

  it('protects FM income and Branch P&L when recruiting 25M rookie CVs (45-day grace period)', () => {
    expect(FM_ROOKIE_GRACE_DAYS).toBe(45);
    expect(FM_ROOKIE_BOUNTY_PROBATION_DAYS).toBe(60);
    const base10 = {
      ...DEFAULT_SIMULATOR_INPUT,
      branch: 'dt' as const,
      cvs: 10,
      rookieCvs: 0,
      revVnd: 485_000_000,
    };
    const plus1RookieAt10 = {
      ...base10,
      cvs: 11,
      rookieCvs: 1,
      revVnd: 510_000_000,
    };
    const fmBase10 = simulateFm(base10);
    const pnlBase10 = simulateBranchPnl(base10, fmBase10);
    const fmPlus10 = simulateFm(plus1RookieAt10);
    const pnlPlus10 = simulateBranchPnl(plus1RookieAt10, fmPlus10);
    expect(fmPlus10.fmIncomeOneVnd).toBeGreaterThan(fmBase10.fmIncomeOneVnd);
    expect(pnlPlus10.netResidualVnd).toBeGreaterThan(pnlBase10.netResidualVnd);

    // At 12 mature + 1 rookie (625M < 650M), dual-gate keeps 1 FM so P&L rises sharply too
    const base12 = { ...DEFAULT_SIMULATOR_INPUT, branch: 'dt' as const, cvs: 12, rookieCvs: 0, revVnd: 600_000_000 };
    const plus1RookieAt12 = { ...base12, cvs: 13, rookieCvs: 1, revVnd: 625_000_000 };
    const fm12 = simulateFm(base12);
    const pnl12 = simulateBranchPnl(base12, fm12);
    const fm12Plus = simulateFm(plus1RookieAt12);
    const pnl12Plus = simulateBranchPnl(plus1RookieAt12, fm12Plus);
    expect(fm12Plus.fmCount).toBe(1);
    expect(fm12Plus.fmIncomeOneVnd).toBeGreaterThan(fm12.fmIncomeOneVnd);
    expect(pnl12Plus.netResidualVnd).toBeGreaterThan(pnl12.netResidualVnd);
  });

  it('maintains FM3 (3★) < CHO pay hierarchy and adds graduation bounties once to P&L', () => {
    for (const cvs of [12, 18]) {
      const simInput = {
        ...DEFAULT_SIMULATOR_INPUT,
        branch: 'dt' as const,
        cvs,
        revVnd: cvs * 52_000_000,
        fmLevel: 3 as const,
        autonomyPct: 60,
        cvllKeyholders: 2,
        bondingParticipationPct: 90,
        stars: createUniformStars(3),
      };
      const fm = simulateFm(simInput);
      const pnl = simulateBranchPnl(simInput, fm);
      expect(fm.fmIncomeOneVnd).toBeLessThan(pnl.choTotalCashVnd);
    }

    const noBountyInput = {
      ...DEFAULT_SIMULATOR_INPUT,
      branch: 'dt' as const,
      cvs: 14,
      revVnd: 700_000_000,
    };
    const withBountyInput = {
      ...noBountyInput,
      bountyRookiePassCount: 1,
      bountyCvlPromoCount: 1,
      bountyCvllPromoCount: 1,
      bountyFm2MentorCount: 1,
    };
    const fmNo = simulateFm(noBountyInput);
    const fmYes = simulateFm(withBountyInput);
    expect(fmYes.graduationBountyOneFmVnd).toBe(6_500_000);
    expect(fmYes.fmIncomeOneVnd - fmNo.fmIncomeOneVnd).toBe(6_500_000);
    expect(fmYes.fmIncomeAllVnd - fmNo.fmIncomeAllVnd).toBe(6_500_000);
  });

  it('scales total branch revenue automatically via computeLockedRevVnd when locking REV/CV', () => {
    expect(computeLockedRevVnd(12, 0, 50)).toBe(600_000_000);
    expect(computeLockedRevVnd(13, 0, 50)).toBe(650_000_000);
    expect(computeLockedRevVnd(18, 0, 50)).toBe(900_000_000);
    expect(computeLockedRevVnd(11, 1, 48.5)).toBe(510_000_000);
  });

  it('supports 1 FM Vệ tinh vs 2 FM Lò Đúc modes and Phase-2 trigger signals for 100-store scaling', () => {
    const dt18Base = {
      ...DEFAULT_SIMULATOR_INPUT,
      branch: 'dt' as const,
      cvs: 18,
      revVnd: 900_000_000,
      cvllKeyholders: 2,
      pillarMetrics: {
        ...DEFAULT_SIMULATOR_INPUT.pillarMetrics!,
        falRatePct: 1.3,
      },
    };
    const singleFm = simulateFm({ ...dt18Base, fmStaffingMode: 'single' });
    const hubFm = simulateFm({ ...dt18Base, fmStaffingMode: 'hub' });
    const pnlSingle = simulateBranchPnl({ ...dt18Base, fmStaffingMode: 'single' }, singleFm);
    const pnlHub = simulateBranchPnl({ ...dt18Base, fmStaffingMode: 'hub' }, hubFm);

    expect(singleFm.fmCount).toBe(1);
    expect(singleFm.cvllKeyholderAllowanceVnd).toBe(2_000_000);
    expect(singleFm.phase2Signals.overloadSignal).toBe(true);
    expect(hubFm.fmCount).toBe(2);
    expect(hubFm.cvllKeyholderAllowanceVnd).toBe(0);
    expect(hubFm.secondFmQuarterlyBenchCostVnd).toBeGreaterThan(60_000_000);
    expect(pnlSingle.netResidualVnd - pnlHub.netResidualVnd).toBeGreaterThan(20_000_000);
  });

  it('uses clean Option B occupancy curve (1.00% at 50%, 1.20% at 75%, 1.40% at 100%)', () => {
    expect(resolveBaseOccupancyRate(9, 18)).toBeCloseTo(0.01, 6);
    expect(resolveBaseOccupancyRate(6, 12)).toBeCloseTo(0.01, 6);
    expect(resolveBaseOccupancyRate(9, 12)).toBeCloseTo(0.012, 6);
    expect(resolveBaseOccupancyRate(18, 18)).toBeCloseTo(0.014, 6);
    expect(resolveBaseOccupancyRate(12, 12)).toBeCloseTo(0.014, 6);
    expect(resolvePerFmRevRate(9, 48_000_000, 18).ratePerFm).toBeCloseTo(0.01, 6);
    expect(resolvePerFmRevRate(18, 48_000_000, 18).ratePerFm).toBeCloseTo(0.014, 6);
  });

  it('computes efficiency multiplier via clamp(REV/CV ÷ benchmark, 0.70, 1.15)', () => {
    expect(resolveSmoothEfficiencyMultiplier(48_000_000)).toBe(1);
    expect(resolveSmoothEfficiencyMultiplier(50_000_000)).toBeCloseTo(50 / 48, 6);
    expect(resolveSmoothEfficiencyMultiplier(45_000_000)).toBeCloseTo(45 / 48, 6);
    expect(resolveSmoothEfficiencyMultiplier(30_000_000)).toBe(0.7);
    expect(resolveSmoothEfficiencyMultiplier(60_000_000)).toBe(1.15);
    expect(resolveSmoothEfficiencyMultiplier(50_000_000, 50_000_000)).toBe(1);
  });
});
