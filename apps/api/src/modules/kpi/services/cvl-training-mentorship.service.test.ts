import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG,
  calculateActorTipBreakdown,
  calculateCcMentorTrainingBonus,
  resolveMenuKeysForApiPath,
} from '@mos-lab/shared';
import {
  CvlTrainingMentorshipService,
  buildCvTipStaffMatchSql,
  buildExcludeOtherMenteeTrainingOrderSql,
  buildExcludeTrainingCvlOrderSql,
  buildIsMenteeTrainingWindowSql,
  normalizeCvlTrainingMentorshipConfig,
  sanitizeCvlTrainingMentorshipPair,
} from './cvl-training-mentorship.service.js';

test('DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG contains Nov 2026 DT pairs for Thảo Ly & Khanh Cao', () => {
  const normalized = normalizeCvlTrainingMentorshipConfig(null);
  assert.equal(normalized.pairs.length, 2);
  assert.equal(normalized.pairs[0]?.menteeLegacyStaffId, 46272);
  assert.equal(normalized.pairs[0]?.mentorLegacyStaffId, 37790);
  assert.equal(normalized.pairs[1]?.menteeLegacyStaffId, 13783);
  assert.equal(normalized.pairs[1]?.mentorLegacyStaffId, 34295);
});

test('sanitizeCvlTrainingMentorshipPair rejects invalid dates and normalizes valid pairs', () => {
  assert.equal(
    sanitizeCvlTrainingMentorshipPair(
      {
        menteeLegacyStaffId: 46272,
        mentorLegacyStaffId: 37790,
        startDate: '2026-11-30',
        endDate: '2026-11-01',
      },
      0
    ),
    null
  );

  const valid = sanitizeCvlTrainingMentorshipPair(
    {
      menteeLegacyStaffId: 46272,
      menteeDisplayName: 'Thảo Ly',
      mentorLegacyStaffId: 37790,
      mentorDisplayName: 'Diễm Hương',
      storeCode: 'Estella',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    },
    0
  );
  assert.ok(valid);
  assert.equal(valid.storeCode, 'EP');
  assert.equal(valid.fixedAllowanceVnd, 1_000_000);
  assert.equal(valid.menteeBonusShareRate, 0.5);
  assert.equal(valid.minComboRateThreshold, 0.2);
});

test('SQL builders exclude training CVL orders from CC reports and transfer CC <=20% tips to Mentee CVL', () => {
  const pairs = DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs;

  const excludeCcSql = buildExcludeTrainingCvlOrderSql(pairs, 'o.id', 'o.booking_date_start');
  assert.match(excludeCcSql, /NOT EXISTS/);
  assert.match(excludeCcSql, /46272/);
  assert.match(excludeCcSql, /13783/);

  const menteeWinSql = buildIsMenteeTrainingWindowSql([pairs[0]!], 'o.booking_date_start');
  assert.match(menteeWinSql, /2026-11-01/);
  assert.match(menteeWinSql, /2026-11-30/);

  const excludeOthersForThaoLy = buildExcludeOtherMenteeTrainingOrderSql(pairs, 46272, 'o.id', 'o.booking_date_start');
  assert.doesNotMatch(excludeOthersForThaoLy, /46272/);
  assert.match(excludeOthersForThaoLy, /13783/);

  const tipMatchSql = buildCvTipStaffMatchSql(pairs, 'st_raw', 'os.assigned_staff_id', 'fo.checkinTime');
  assert.match(tipMatchSql, /tip_percentage.*<= 20/);
  assert.match(tipMatchSql, /46272/);
});

test('findMatchingTrainingPairForOrder matches exact inclusive date boundaries and respects isActive', () => {
  const pairs = DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs;
  assert.equal(
    CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(pairs, 46272, '2026-11-01')?.mentorLegacyStaffId,
    37790
  );
  assert.equal(
    CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(pairs, 13783, '2026-11-30')?.mentorLegacyStaffId,
    34295
  );
  assert.equal(CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(pairs, 46272, '2026-12-01'), null);
  assert.equal(
    CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(
      [{ ...pairs[0]!, isActive: false }],
      46272,
      '2026-11-12'
    ),
    null
  );
});

test('calculateActorTipBreakdown awards 90% tip to Mentee CVL and 0% to CC on training CVL orders', () => {
  const booking = {
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    checkInStaffId: 37790,
    checkInStaffName: 'Diễm Hương',
    checkOutStaffId: 37790,
    checkOutStaffName: 'Diễm Hương',
    isTrainingCvlOrder: true,
  };

  const ccView = calculateActorTipBreakdown(booking, { staffId: 37790, name: 'Diễm Hương' }, 100_000);
  assert.equal(ccView.actorEarnedPercent, 0);
  assert.equal(ccView.actorEarnedAmount, 0);

  const menteeView = calculateActorTipBreakdown(booking, { staffId: 46272, name: 'Thảo Ly' }, 100_000);
  assert.equal(menteeView.actorEarnedPercent, 90);
  assert.equal(menteeView.actorEarnedAmount, 90_000);
});

test('calculateCcMentorTrainingBonus enforces >= 20.0% combo rate threshold for 1M + 50% payout', () => {
  const pair = DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs[0]!;

  const unlocked = calculateCcMentorTrainingBonus({
    pair,
    combosSoldCount: 2,
    notComboLiveOrders: 10, // exact 20.0%
    comboLiveOrders: 5,
    menteeDeltaHourlyWage: 300_000,
    menteeDeltaTipBonus: 200_000,
    menteeComboBonusTotal: 400_000,
    menteeSerumBonusTotal: 100_000,
  });
  assert.equal(unlocked.isUnlocked, true);
  assert.equal(unlocked.menteeTotalAdditionalIncome, 1_000_000);
  assert.equal(unlocked.mentorFixedEarned, 1_000_000);
  assert.equal(unlocked.mentorShareEarned, 500_000);
  assert.equal(unlocked.mentorTotalBonus, 1_500_000);

  const locked = calculateCcMentorTrainingBonus({
    pair,
    combosSoldCount: 1,
    notComboLiveOrders: 10, // 10.0% < 20.0%
    comboLiveOrders: 5,
    menteeDeltaHourlyWage: 300_000,
    menteeDeltaTipBonus: 200_000,
    menteeComboBonusTotal: 400_000,
    menteeSerumBonusTotal: 100_000,
  });
  assert.equal(locked.isUnlocked, false);
  assert.equal(locked.mentorFixedEarned, 0);
  assert.equal(locked.mentorShareEarned, 0);
  assert.equal(locked.mentorTotalBonus, 0);
});

test('Zero-Trust API guard locks /api/kpi/cvl-training-mentorship/* to __ADMIN_ONLY_DEFAULT__', () => {
  assert.deepEqual(resolveMenuKeysForApiPath('/api/kpi/cvl-training-mentorship/config'), ['__ADMIN_ONLY_DEFAULT__']);
});
