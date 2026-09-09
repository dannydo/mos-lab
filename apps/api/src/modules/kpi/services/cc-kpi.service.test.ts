import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateWheelBonusCap } from '@mos-lab/shared';
import {
  buildGreenVisitEligibilitySql,
  buildCashTipCurrencyPredicate,
  buildCcLeaderboard,
  summarizeCcLedgerXoayForPaystub,
  CASH_TIP_CURRENCY_ID,
  FAL_RULE_VALUES,
  FAL_RULE_VALUES_SQL,
  FAL_TRACKING_KEY_SQL_CASES,
  filterActiveCcTargets,
  resolveCcDailyBonusTierRate,
  resolveCcCashBonus,
  resolveCcLedgerCashBonus,
  resolveFalRule,
  splitCcShares,
} from './cc-kpi.service.js';

const expectedRules = ['Fix', 'Adjust', 'Log', 'Replace'] as const;

test('uses the immutable Legacy combo-sale snapshot for Vòng Xanh eligibility', () => {
  assert.equal(buildGreenVisitEligibilitySql(), 'COALESCE(o.combo_sale_required, 0) <> 0');
  assert.equal(buildGreenVisitEligibilitySql('booking'), 'COALESCE(booking.combo_sale_required, 0) <> 0');
  assert.throws(() => buildGreenVisitEligibilitySql('o; DROP TABLE order'), /Invalid SQL alias/);
});

test('recognizes every FAL rule from service_type', () => {
  for (const rule of expectedRules) {
    assert.equal(resolveFalRule({ serviceType: rule }), rule);
  }
});

test('recognizes every FAL rule from staff bonus rule values', () => {
  for (const rule of expectedRules) {
    assert.equal(resolveFalRule({ ruleValue: rule }), rule);
  }
});

test('recognizes every FAL rule from tracking keys', () => {
  for (const rule of expectedRules) {
    assert.equal(resolveFalRule({ trackingKey: JSON.stringify({ next_service_type: rule }) }), rule);
  }
});

test('keeps next Fix and Adjust references as the highest-precedence signals', () => {
  assert.equal(resolveFalRule({ nextFixOrderServiceId: 1, serviceType: 'Replace' }), 'Fix');
  assert.equal(resolveFalRule({ nextAdjustOrderServiceId: 1, serviceType: 'Replace' }), 'Adjust');
});

test('keeps the SQL classifier fragments aligned with the pure classifier', () => {
  assert.deepEqual(FAL_RULE_VALUES, expectedRules);
  for (const rule of expectedRules) {
    assert.match(FAL_RULE_VALUES_SQL, new RegExp(`'${rule}'`));
    assert.match(FAL_TRACKING_KEY_SQL_CASES, new RegExp(`next_service_type.*${rule}`));
  }
});

test('keeps only configured active CC targets', () => {
  assert.deepEqual(
    filterActiveCcTargets(
      [
        { staffId: 10, staffName: 'Active' },
        { staffId: 20, staffName: 'Inactive' },
      ],
      [10]
    ),
    [{ staffId: 10, staffName: 'Active' }]
  );
});

test('preserves a 50/50 CC split without inflating counts', () => {
  assert.deepEqual(splitCcShares(10, 20, [10, 20]), [
    { staffId: 10, share: 0.5 },
    { staffId: 20, share: 0.5 },
  ]);
  assert.deepEqual(splitCcShares(10, 10, [10, 20]), [{ staffId: 10, share: 1 }]);
  assert.deepEqual(splitCcShares(10, 20, [10]), [{ staffId: 10, share: 0.5 }]);
});

test('uses only the Cash ledger and never infers a bonus when the row is missing', () => {
  assert.equal(resolveCcCashBonus({ dbCashBonus: 0, cashBonusRows: 1 }), 0);
  assert.equal(resolveCcCashBonus({ dbCashBonus: -130, cashBonusRows: 1 }), -130);
  assert.equal(resolveCcCashBonus({ dbCashBonus: 130.5, cashBonusRows: 1 }), 130.5);
  assert.equal(resolveCcCashBonus({ dbCashBonus: 130, cashBonusRows: 0 }), 0);
});

test('caps CC Xoay payroll income at 150% of the same-month Daily Bonus', () => {
  const result = calculateWheelBonusCap(1_344_979, 3_235_960);

  assert.deepEqual(result, {
    monthlyDailyBonus: 1_344_979,
    rawWheelBonus: 3_235_960,
    maxWheelBonusAllowed: 2_017_469,
    effectiveWheelBonus: 2_017_469,
    wheelCapPercent: 241,
    capStatus: 'HARDCAPPED',
  });
});

test('includes only Cash tips in CC income queries', () => {
  assert.equal(CASH_TIP_CURRENCY_ID, 2);
  assert.equal(buildCashTipCurrencyPredicate(), 'st.tip_currency_id = 2');
  assert.equal(buildCashTipCurrencyPredicate('tip'), 'tip.tip_currency_id = 2');
  assert.throws(() => buildCashTipCurrencyPredicate('st; DROP TABLE staff_tip'), /Invalid SQL table alias/);
});

test('keeps CC Xoay on the posted Cash ledger and never recreates a missing Cash row', () => {
  assert.equal(resolveCcLedgerCashBonus({ dbCashBonus: 1_000, cashBonusRows: 1 }), 1_000);
  assert.equal(resolveCcLedgerCashBonus({ dbCashBonus: 1_000.5, cashBonusRows: 1 }), 1_000.5);
  assert.equal(resolveCcLedgerCashBonus({ dbCashBonus: 0, cashBonusRows: 1 }), 0);
  assert.equal(resolveCcLedgerCashBonus({ dbCashBonus: 0, cashBonusRows: 0 }), 0);
});

test('uses the exact daily CC bonus tier thresholds after CC sales allocation', () => {
  assert.equal(resolveCcDailyBonusTierRate(4_999_999), 0.5);
  assert.equal(resolveCcDailyBonusTierRate(5_000_000), 1.0);
  assert.equal(resolveCcDailyBonusTierRate(10_000_000), 1.5);
  assert.equal(resolveCcDailyBonusTierRate(15_000_000), 2.0);
  assert.equal(resolveCcDailyBonusTierRate(20_000_000), 2.5);
});

test('builds leaderboard totals from the same CC Xoay detail records', () => {
  const older = {
    consultantId: 10,
    consultantName: 'CC A',
    avatar: null,
    orderId: 100,
    serviceId: 1001,
    checkin: '2026-08-10 10:00:00',
    store: 'DT',
    consultantBonus: 100,
    pointsAccu: 80,
  };
  const newer = {
    ...older,
    serviceId: 1002,
    checkin: '2026-08-10 11:00:00',
    consultantBonus: 50,
    pointsAccu: 120,
  };

  const leaderboard = buildCcLeaderboard({
    selectedRecords: [newer, older],
    monthlyRecords: [newer, older],
    selectedDailySales: [{ user_id: 10, combo_sales: 1_000_000, combo_count: 1 }],
    monthlyDailySales: [{ user_id: 10, daily_bonus: 75_000 }],
  });

  assert.equal(leaderboard.length, 1);
  assert.deepEqual(
    {
      rank: leaderboard[0].rank,
      totalCheckins: leaderboard[0].totalCheckins,
      totalServices: leaderboard[0].totalServices,
      totalPointsAccu: leaderboard[0].totalPointsAccu,
      level: leaderboard[0].level,
      totalConsultantBonus: leaderboard[0].totalConsultantBonus,
      comboRevenue: leaderboard[0].comboRevenue,
      comboCount: leaderboard[0].comboCount,
      monthlyDailyBonus: leaderboard[0].monthlyDailyBonus,
      monthlyWheelBonus: leaderboard[0].monthlyWheelBonus,
    },
    {
      rank: 1,
      totalCheckins: 1,
      totalServices: 2,
      totalPointsAccu: 120,
      level: 2,
      totalConsultantBonus: 150,
      comboRevenue: 1_000_000,
      comboCount: 1,
      monthlyDailyBonus: 75_000,
      monthlyWheelBonus: 150,
    }
  );
});

test('rounds CC Xoay once after summing posted half-đồng ledger rows', () => {
  const firstHalf = {
    consultantId: 10,
    consultantName: 'CC A',
    avatar: null,
    orderId: 100,
    serviceId: 1001,
    checkin: '2026-08-10 10:00:00',
    store: 'DT',
    consultantBonus: 0.5,
    pointsAccu: 80,
  };
  const secondHalf = {
    ...firstHalf,
    serviceId: 1002,
    checkin: '2026-08-10 11:00:00',
  };

  const leaderboard = buildCcLeaderboard({
    selectedRecords: [firstHalf, secondHalf],
    monthlyRecords: [firstHalf, secondHalf],
    selectedDailySales: [],
    monthlyDailySales: [],
  });

  assert.equal(leaderboard[0].totalConsultantBonus, 1);
  assert.equal(leaderboard[0].monthlyWheelBonus, 1);
});

test('keeps the income/paystub Xoay total and count on posted Cash ledger rows', () => {
  const totals = summarizeCcLedgerXoayForPaystub([
    { consultantId: 10, consultantBonus: 0.5, cashBonusRows: 1 },
    { consultantId: 10, consultantBonus: 0.5, cashBonusRows: 1 },
    { consultantId: 10, consultantBonus: 0, cashBonusRows: 0 },
    { consultantId: 10, consultantBonus: 36, cashBonusRows: 0 },
  ]);

  assert.deepEqual(totals.get(10), { count: 2, bonus: 1 });
});
