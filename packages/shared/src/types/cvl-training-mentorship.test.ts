import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateCcMentorTrainingBonus,
  DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG,
  intersectDateRanges,
  isDateRangeOverlapping,
  resolveCvlTrainingLifecycleStatus,
  validateStrictOneToOneMentorshipPairs,
} from './cvl-training-mentorship.js';
import { resolveMenuKeysForApiPath } from './menu-access.js';

describe('CVL Training Mentorship Shared Rules & Zero-Trust Access', () => {
  const defaultPair = DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs[0];

  it('unlocks 1M + 50% of all 4 CVL additional income items when combo conversion rate is >= 20.0%', () => {
    const breakdown = calculateCcMentorTrainingBonus({
      pair: defaultPair,
      combosSoldCount: 2,
      notComboLiveOrders: 10, // exact 20.0% boundary
      comboLiveOrders: 5,
      menteeDeltaHourlyWage: 400_000,
      menteeDeltaTipBonus: 600_000,
      menteeComboBonusTotal: 1_500_000,
      menteeSerumBonusTotal: 300_000,
    });

    assert.equal(breakdown.isUnlocked, true);
    assert.equal(breakdown.actualComboRate, 0.2);
    assert.equal(breakdown.menteeTotalAdditionalIncome, 2_800_000);
    assert.equal(breakdown.mentorFixedEarned, 1_000_000);
    assert.equal(breakdown.mentorShareEarned, 1_400_000);
    assert.equal(breakdown.mentorTotalBonus, 2_400_000);
  });

  it('forfeits both 1M fixed allowance and 50% bonus (returns 0 VND) when mentee combo conversion is < 20.0%', () => {
    const breakdown = calculateCcMentorTrainingBonus({
      pair: defaultPair,
      combosSoldCount: 3,
      notComboLiveOrders: 16, // 18.75% < 20.0%
      comboLiveOrders: 4,
      menteeDeltaHourlyWage: 400_000,
      menteeDeltaTipBonus: 500_000,
      menteeComboBonusTotal: 800_000,
      menteeSerumBonusTotal: 100_000,
    });

    assert.equal(breakdown.isUnlocked, false);
    assert.equal(breakdown.mentorFixedEarned, 0);
    assert.equal(breakdown.mentorShareEarned, 0);
    assert.equal(breakdown.mentorTotalBonus, 0);
  });

  it('computes date range overlap and intersection accurately', () => {
    assert.equal(isDateRangeOverlapping('2026-11-01', '2026-11-30', '2026-11-10', '2026-12-05'), true);
    assert.equal(isDateRangeOverlapping('2026-11-01', '2026-11-30', '2026-10-01', '2026-10-31'), false);
    assert.deepEqual(intersectDateRanges('2026-11-01', '2026-11-30', '2026-11-08', '2026-12-02'), {
      startDate: '2026-11-08',
      endDate: '2026-11-30',
    });
  });

  it('locks /api/kpi/cvl-training-mentorship and /api/cvl-training-mentorship strictly to __ADMIN_ONLY_DEFAULT__', () => {
    assert.deepEqual(resolveMenuKeysForApiPath('/api/kpi/cvl-training-mentorship/config'), ['__ADMIN_ONLY_DEFAULT__']);
    assert.deepEqual(resolveMenuKeysForApiPath('/api/cvl-training-mentorship/config'), ['__ADMIN_ONLY_DEFAULT__']);
  });

  it('enforces strict 1-on-1 pairing per overlapping period while preserving non-overlapping history', () => {
    const validPairs = [
      {
        ...defaultPair,
        id: 'nov-pair',
        mentorLegacyStaffId: 37790,
        menteeLegacyStaffId: 46272,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      },
      {
        ...defaultPair,
        id: 'dec-pair',
        mentorLegacyStaffId: 37790,
        menteeLegacyStaffId: 50001,
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      },
    ];
    assert.equal(validateStrictOneToOneMentorshipPairs(validPairs).valid, true);

    const sameMentorOverlap = [
      {
        ...defaultPair,
        id: 'p1',
        mentorLegacyStaffId: 13783,
        menteeLegacyStaffId: 50001,
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      },
      {
        ...defaultPair,
        id: 'p2',
        mentorLegacyStaffId: 13783,
        menteeLegacyStaffId: 50002,
        startDate: '2026-12-10',
        endDate: '2026-12-31',
      },
    ];
    const mentorConflict = validateStrictOneToOneMentorshipPairs(sameMentorOverlap);
    assert.equal(mentorConflict.valid, false);
    assert.equal(mentorConflict.errors.length, 1);

    const sameMenteeOverlap = [
      {
        ...defaultPair,
        id: 'p1',
        mentorLegacyStaffId: 13783,
        menteeLegacyStaffId: 50001,
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      },
      {
        ...defaultPair,
        id: 'p2',
        mentorLegacyStaffId: 46272,
        menteeLegacyStaffId: 50001,
        startDate: '2026-12-05',
        endDate: '2026-12-20',
      },
    ];
    assert.equal(validateStrictOneToOneMentorshipPairs(sameMenteeOverlap).valid, false);
  });

  it('resolves CVL training lifecycle status accurately', () => {
    const novPair = { ...defaultPair, menteeLegacyStaffId: 13783, startDate: '2026-11-01', endDate: '2026-11-30' };
    assert.equal(
      resolveCvlTrainingLifecycleStatus({
        legacyStaffId: 13783,
        currentRole: 'CV',
        pairs: [novPair],
        todayYmd: '2026-11-15',
      }).status,
      'TRAINING'
    );
    assert.equal(
      resolveCvlTrainingLifecycleStatus({
        legacyStaffId: 13783,
        currentRole: 'CV',
        pairs: [novPair],
        todayYmd: '2026-12-01',
      }).status,
      'PENDING_GRADUATION'
    );
    assert.equal(
      resolveCvlTrainingLifecycleStatus({
        legacyStaffId: 13783,
        currentRole: 'CV_PLUS',
        pairs: [{ ...novPair, outcome: 'GRADUATED' }],
        todayYmd: '2026-12-01',
      }).status,
      'OFFICIAL'
    );
  });
});
