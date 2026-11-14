import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeCvSelfChallengePlan,
  isSelfChallengeSlowerThanAverage,
  normalizeBookingTargetLashSet,
  normalizeHistoricalOrderRowToSample,
  validateSelfChallengeSlowerReason,
  IosCvHistoricalCaseSample,
} from '@mos-lab/shared';
import { buildCompactSpeedProfileFromSamples } from '../services/ios-cv-self-speed.service.js';

describe('ios-cv-self-speed & Vượt lên chính mình', () => {
  it('computes 4 tiers from 3 strict historical matches (+10%, 3 lần TB vừa rồi, -5%, -10%)', () => {
    const samples: IosCvHistoricalCaseSample[] = [
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 58 },
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 60 },
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 62 },
      // Old 4th case should be ignored because newest 3 are picked
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 95 },
    ];

    const plan = computeCvSelfChallengePlan({
      booking: {
        serviceName: 'HyperLight 770',
        serviceType: 'Normal',
        attributes: {
          material: 'HyperLight',
          volume: '4X',
          count: '70 fan',
        },
      },
      historyProfile: {
        staffId: 51154,
        samples,
        overallSpeedRatio: 1.0,
      },
      fallbackSuggestedMinutes: 75,
    });

    assert.equal(plan.source, 'exact_3');
    assert.equal(plan.sampleCount, 3);
    assert.equal(plan.baselineMinutes, 60);
    assert.deepEqual(plan.recentSampleDurations, [58, 60, 62]);
    assert.equal(plan.options[0].key, 'SLOWER_10');
    assert.equal(plan.options[0].minutes, 66);
    assert.equal(plan.options[1].key, 'AVG_RECENT');
    assert.equal(plan.options[1].label, '3 lần TB vừa rồi');
    assert.equal(plan.options[1].minutes, 60);
    assert.equal(plan.options[2].key, 'FASTER_5');
    assert.equal(plan.options[2].minutes, 57);
    assert.equal(plan.options[3].key, 'FASTER_10');
    assert.equal(plan.options[3].minutes, 54);
  });

  it('uses relaxed Fan fallback when strict matches are fewer than 3', () => {
    const samples: IosCvHistoricalCaseSample[] = [
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 60 },
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 3, countPerEye: 70, durationMinutes: 66 },
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 2, countPerEye: 70, durationMinutes: 69 },
    ];

    const plan = computeCvSelfChallengePlan({
      booking: {
        serviceName: 'HyperLight 770',
        serviceType: 'Normal',
        attributes: {
          material: 'HyperLight',
          volume: '4X',
          count: '70',
        },
      },
      historyProfile: {
        staffId: 51154,
        samples,
        overallSpeedRatio: 1.0,
      },
      fallbackSuggestedMinutes: 75,
    });

    assert.equal(plan.source, 'exact_3');
    assert.equal(plan.sampleCount, 3);
    assert.deepEqual(plan.recentSampleDurations, [60, 66, 69]);
    assert.equal(plan.baselineMinutes, 65);
  });

  it('handles 2-case, 1-case, and 0-case (overallSpeedRatio) fallbacks accurately', () => {
    const booking = {
      serviceName: 'UltraLight 550',
      serviceType: 'Normal',
      attributes: {
        material: 'UltraLight',
        volume: '3D',
        count: '60 fan',
      },
    };

    const plan2 = computeCvSelfChallengePlan({
      booking,
      historyProfile: {
        staffId: 101,
        samples: [
          { materialKey: 'ultralight', mode: 'Normal', fanNum: 3, countPerEye: 60, durationMinutes: 70 },
          { materialKey: 'ultralight', mode: 'Normal', fanNum: 3, countPerEye: 60, durationMinutes: 74 },
        ],
        overallSpeedRatio: 1.0,
      },
      fallbackSuggestedMinutes: 60,
    });
    assert.equal(plan2.source, 'partial_recent');
    assert.equal(plan2.sampleCount, 2);
    assert.equal(plan2.baselineMinutes, 72);
    assert.equal(plan2.options[1].label, '2 lần TB vừa rồi');

    const plan1 = computeCvSelfChallengePlan({
      booking,
      historyProfile: {
        staffId: 101,
        samples: [{ materialKey: 'ultralight', mode: 'Normal', fanNum: 3, countPerEye: 60, durationMinutes: 80 }],
        overallSpeedRatio: 1.0,
      },
      fallbackSuggestedMinutes: 60,
    });
    assert.equal(plan1.source, 'partial_recent');
    assert.equal(plan1.sampleCount, 1);
    assert.equal(plan1.baselineMinutes, 80);
    assert.equal(plan1.options[1].label, 'Lần gần nhất');

    const plan0 = computeCvSelfChallengePlan({
      booking,
      historyProfile: {
        staffId: 101,
        samples: [],
        overallSpeedRatio: 0.85,
      },
      fallbackSuggestedMinutes: 60,
    });
    assert.equal(plan0.source, 'personal_model_fallback');
    assert.equal(plan0.sampleCount, 0);
    assert.equal(plan0.baselineMinutes, 51); // Math.round(60 * 0.85)
    assert.equal(plan0.options[1].label, 'Mốc chuẩn cá nhân');

    const clampedPlan = computeCvSelfChallengePlan({
      booking,
      historyProfile: {
        staffId: 101,
        samples: [],
        overallSpeedRatio: 0.4, // Must clamp to 0.75 minimum
      },
      fallbackSuggestedMinutes: 60,
    });
    assert.equal(clampedPlan.baselineMinutes, 45);
  });

  it('resolves generic attrs.material like "Nối mi" cleanly from serviceName', () => {
    const target = normalizeBookingTargetLashSet({
      serviceName: 'HyperLight 770',
      serviceType: 'Normal',
      attributes: {
        material: 'Nối mi',
        volume: '4𝒙',
        count: '70',
      },
    });

    assert.equal(target.materialKey, 'hyperlight');
    assert.equal(target.fanNum, 4);
    assert.equal(target.countPerEye, 70);
    assert.equal(target.mode, 'Normal');
  });

  it('classifies new-flawless.mink-390 as undermink and adds CV undermink history when hasUnderMink is true', () => {
    const underSample = normalizeHistoricalOrderRowToSample({
      serviceKey: 'new-flawless.mink-390',
      serviceName: 'Flawless Under Mink 390',
      serviceType: 'Normal',
      preparationMinute: 5,
      preServicingMinute: 3,
      cleaningMinute: 2,
      servicingMinute: 15,
      isTemporary: 0,
    });

    assert.ok(underSample);
    assert.equal(underSample.materialKey, 'undermink');
    assert.equal(underSample.durationMinutes, 25);

    const planWithUnder = computeCvSelfChallengePlan({
      booking: {
        serviceName: 'Classic 440',
        serviceType: 'Normal',
        attributes: {
          material: 'Classic',
          volume: '1D',
          count: '70',
          hasUnderMink: true,
          underMinkServiceType: 'Normal',
        },
      },
      historyProfile: {
        staffId: 202,
        samples: [
          { materialKey: 'classic', mode: 'Normal', fanNum: 1, countPerEye: 70, durationMinutes: 50 },
          underSample,
        ],
      },
      fallbackSuggestedMinutes: 85,
    });

    assert.equal(planWithUnder.baselineMinutes, 75); // 50 + 25
    assert.match(planWithUnder.matchedSetLabel, /\+ Mi Dưới$/);

    const planWithFallbackUnder = computeCvSelfChallengePlan({
      booking: {
        serviceName: 'Classic 440',
        serviceType: 'Retain',
        attributes: {
          material: 'Classic',
          volume: '1D',
          count: '70',
          hasUnderMink: true,
          underMinkServiceType: 'Retain',
        },
      },
      historyProfile: {
        staffId: 202,
        samples: [{ materialKey: 'classic', mode: 'Retain', fanNum: 1, countPerEye: 70, durationMinutes: 40 }],
      },
      fallbackSuggestedMinutes: 65,
    });

    assert.equal(planWithFallbackUnder.baselineMinutes, 60); // 40 + 20 (Retain under fallback)
  });

  it('produces strictly distinct integer minutes even on short 25p sets', () => {
    const plan = computeCvSelfChallengePlan({
      booking: {
        serviceName: 'Flawless Under Mink 390',
        serviceType: 'Normal',
      },
      historyProfile: {
        staffId: 303,
        samples: [{ materialKey: 'undermink', mode: 'Normal', fanNum: 1, countPerEye: 30, durationMinutes: 25 }],
      },
      fallbackSuggestedMinutes: 25,
    });

    const mins = plan.options.map((o) => o.minutes);
    assert.ok(mins.every((m) => Number.isInteger(m)));
    assert.ok(mins[0] > mins[1] && mins[1] > mins[2] && mins[2] > mins[3], `Expected strictly descending: ${mins}`);
    assert.deepEqual(mins, [28, 25, 24, 23]);
  });

  it('builds compact speed profile with bounded overallSpeedRatio', () => {
    const profile = buildCompactSpeedProfileFromSamples(777, [
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 35 },
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 36 },
    ]);
    assert.equal(profile.staffId, 777);
    assert.equal(profile.samples.length, 2);
    assert.ok(profile.overallSpeedRatio !== undefined);
    assert.ok(profile.overallSpeedRatio >= 0.75 && profile.overallSpeedRatio <= 1.25);
  });

  it('detects slower-than-average commits and validates reasonable Vietnamese reasons strictly', () => {
    assert.equal(isSelfChallengeSlowerThanAverage(66, 60), true);
    assert.equal(isSelfChallengeSlowerThanAverage(65, 60), true);
    assert.equal(isSelfChallengeSlowerThanAverage(60, 60), false);
    assert.equal(isSelfChallengeSlowerThanAverage(54, 60), false);

    assert.equal(validateSelfChallengeSlowerReason('').valid, false);
    assert.equal(validateSelfChallengeSlowerReason('mi yếu').valid, false);
    assert.equal(validateSelfChallengeSlowerReason('aaaa bbbb cccc').valid, false);
    assert.equal(validateSelfChallengeSlowerReason('không biết nữa').valid, false);
    assert.equal(validateSelfChallengeSlowerReason('ok ok ok luôn').valid, false);
    assert.equal(validateSelfChallengeSlowerReason('bình thường thôi').valid, false);
    assert.equal(validateSelfChallengeSlowerReason('asdf qwer zxcv').valid, false);

    const valid1 = validateSelfChallengeSlowerReason('Mi cũ tiệm ngoài keo dày cần tháo kỹ');
    assert.equal(valid1.valid, true);
    assert.equal(valid1.normalized, 'Mi cũ tiệm ngoài keo dày cần tháo kỹ');

    assert.equal(validateSelfChallengeSlowerReason('Mắt khách nhạy cảm dễ chảy nước mắt').valid, true);
    assert.equal(validateSelfChallengeSlowerReason('Mi thật yếu khó tách sợi').valid, true);
  });
});
