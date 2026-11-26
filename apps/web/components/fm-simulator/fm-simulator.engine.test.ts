import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIMULATOR_INPUT,
  createMetricsForUniformStar,
  createUniformStars,
  resolveMapsTargets,
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

  it('calculates exact 7★ totals (1★=1.55M, 2★=3.10M, 3★=4.60M)', () => {
    const baseInput = {
      ...DEFAULT_SIMULATOR_INPUT,
      worms: 0,
      butterflies: 0,
      late24To48Count: 0,
      lateOver48Count: 0,
      shieldsLost: 0,
    };

    const allOne = simulateFm({
      ...baseInput,
      autonomyPct: 40,
      cvllKeyholders: 1,
      stars: {
        maps: 1,
        fal: 1,
        autonomy: 1,
        inventory: 1,
        room: 1,
        grooming: 1,
        turn: 1,
      },
    });
    expect(allOne.netStarPoolOneFmVnd).toBe(1_550_000);

    const allTwo = simulateFm({
      ...baseInput,
      autonomyPct: 50,
      cvllKeyholders: 1,
      stars: {
        maps: 2,
        fal: 2,
        autonomy: 2,
        inventory: 2,
        room: 2,
        grooming: 2,
        turn: 2,
      },
    });
    expect(allTwo.netStarPoolOneFmVnd).toBe(3_100_000);

    const allThree = simulateFm({
      ...baseInput,
      autonomyPct: 60,
      cvllKeyholders: 2,
      stars: {
        maps: 3,
        fal: 3,
        autonomy: 3,
        inventory: 3,
        room: 3,
        grooming: 3,
        turn: 3,
      },
    });
    expect(allThree.netStarPoolOneFmVnd).toBe(4_600_000);
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

  it('computes all-in P&L reconciling Floor fixed + 4.2% lash + 3.28% combo/SP + BHXH + FM + CHO', () => {
    const fm = simulateFm(DEFAULT_SIMULATOR_INPUT);
    const pnl = simulateBranchPnl(DEFAULT_SIMULATOR_INPUT, fm);
    expect(pnl.floorLashBonusVnd).toBe(Math.round(680_000_000 * 0.042));
    expect(pnl.floorComboBonusVnd).toBe(Math.round(680_000_000 * 0.0328));
    expect(pnl.totalPeopleCostVnd).toBe(
      pnl.floorTotalCashVnd + pnl.fmTotalCashVnd + pnl.choTotalCashVnd + pnl.employerSsVnd
    );
    expect(pnl.netResidualVnd).toBe(680_000_000 - pnl.totalPeopleCostVnd);
    expect(pnl.isProfitable).toBe(true);
  });

  it('builds 3★ ceiling via createUniformStars(3) reaching exact 4.60M star pool', () => {
    const res = simulateFm({
      ...DEFAULT_SIMULATOR_INPUT,
      worms: 0,
      butterflies: 0,
      late24To48Count: 0,
      lateOver48Count: 0,
      shieldsLost: 0,
      autonomyPct: 60,
      cvllKeyholders: 2,
      stars: createUniformStars(3),
    });
    expect(res.totalEffectiveStars).toBe(21);
    expect(res.netStarPoolOneFmVnd).toBe(4_600_000);
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
    expect(res.sum3StarBudgetVnd).toBe(5_200_000);
    expect(res.netStarPoolOneFmVnd).toBe(5_200_000);
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
});
