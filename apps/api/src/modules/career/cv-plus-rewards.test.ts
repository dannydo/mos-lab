import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCcMentorTrainingBonus,
  calculateComboBonus,
  calculateComboDebtBonus,
  calculateDualComboTierBonus,
  formatComboTierBracketLabel,
  type CvlTrainingMentorshipPair,
} from '@mos-lab/shared';
import {
  calculateCvlSerumLineBonus,
  computeCashCollectedComboAmount,
  isLegacyPhantomDebtPayment,
} from './career-service/career-cvl-debt-rewards.helper.js';
import { computeCvlConsultShareFactor } from './career-service/career-helpers.js';

test('CVL calculateComboBonus simplified formula (min 500K, 500K-<2M = 50K, +50K per next 1M) & multi-combo aggregation', () => {
  // 0. Below 500K minimum collected limit -> 0đ
  assert.equal(calculateComboBonus(0), 0);
  assert.equal(calculateComboBonus(31_000), 0);
  assert.equal(calculateComboBonus(499_999), 0);
  assert.equal(calculateComboBonus(500_000), 50_000);

  // 1. 500K - <2M -> 50,000đ
  assert.equal(calculateComboBonus(1_200_000), 50_000);
  assert.equal(calculateComboBonus(1_990_000), 50_000);

  // 2. 2M - <3M -> 100,000đ
  assert.equal(calculateComboBonus(2_000_000), 100_000);
  assert.equal(calculateComboBonus(2_635_200), 100_000);
  assert.equal(calculateComboBonus(2_990_000), 100_000);

  // 3. 3M - <4M -> 150,000đ
  assert.equal(calculateComboBonus(3_000_000), 150_000);
  assert.equal(calculateComboBonus(3_801_600), 150_000);
  assert.equal(calculateComboBonus(3_990_000), 150_000);

  // 4. Every next 1M -> +50k
  assert.equal(calculateComboBonus(4_276_800), 200_000); // 4M - <5M -> 200k
  assert.equal(calculateComboBonus(5_100_000), 250_000); // 5M - <6M -> 250k
  assert.equal(calculateComboBonus(6_000_000), 300_000); // 6M - <7M -> 300k
  assert.equal(calculateComboBonus(7_484_400), 350_000); // 7M - <8M -> 350k
  assert.equal(calculateComboBonus(8_051_600), 400_000); // 8M - <9M -> 400k
  assert.equal(calculateComboBonus(10_886_400), 500_000); // 10M - <11M -> 500k
  assert.equal(calculateComboBonus(11_988_000), 550_000); // Thuỳ Dương: 11M - <12M -> 550k

  // 5. Real dual-combo same-order cases (Thảo Ly 11/2026)
  // Linh: 4.579.200 + 4.212.000 = 8.791.200đ -> 400.000đ (8M-<9M)
  assert.equal(calculateDualComboTierBonus(4_579_200, 4_212_000).totalBonus, 400_000);
  assert.equal(formatComboTierBracketLabel(8_791_200), '8M-<9M');

  // Đoan: 2.304.400 + 1.684.800 = 3.989.200đ -> 150.000đ (3M-<4M)
  assert.equal(calculateDualComboTierBonus(2_304_400, 1_684_800).totalBonus, 150_000);
  assert.equal(formatComboTierBracketLabel(3_989_200), '3M-<4M');
  assert.equal(formatComboTierBracketLabel(11_988_000), '11M-<12M');
  assert.equal(formatComboTierBracketLabel(1_684_800), '500K-<2M');
  assert.equal(formatComboTierBracketLabel(500_000), '500K-<2M');
  assert.equal(formatComboTierBracketLabel(499_999), '<500K');
  assert.equal(formatComboTierBracketLabel(31_000), '<500K');

  // 6. Custom Career Path config with comboMinCollectedAmount, comboUnder2mBonus & comboStepPerMillionBonus
  const customCfg = { comboMinCollectedAmount: 1_000_000, comboUnder2mBonus: 60_000, comboStepPerMillionBonus: 40_000 };
  assert.equal(calculateComboBonus(900_000, customCfg), 0);
  assert.equal(calculateComboBonus(1_000_000, customCfg), 60_000);
  assert.equal(calculateComboBonus(1_800_000, customCfg), 60_000);
  assert.equal(calculateComboBonus(2_000_000, customCfg), 100_000);
  assert.equal(calculateComboBonus(3_500_000, customCfg), 140_000);
  assert.equal(calculateComboBonus(4_500_000, customCfg), 180_000);
});

test('CVL Penalty Rule & Opportunity Threshold Simulation', () => {
  // Case A: Đạt chuẩn >= 20% (Huyền Nguyễn)
  const notComboLiveA = 37;
  const comboSoldA = 9;
  const rateA = comboSoldA / notComboLiveA;
  const isTargetHitA = rateA >= 0.2;
  assert.equal(isTargetHitA, true);

  // Wage with +2k and combo bonus unlocked
  const hoursA = 200;
  const baseWageCvA = hoursA * 25_000;
  const baseWageCvPlusA = isTargetHitA ? hoursA * 27_000 : baseWageCvA;
  assert.equal(baseWageCvPlusA, 5_400_000);

  // Case B: Chế tài khi < 20% (Phương Nhi)
  const notComboLiveB = 50;
  const comboSoldB = 5;
  const rateB = comboSoldB / notComboLiveB; // 10% < 20%
  const isTargetHitB = rateB >= 0.2;
  assert.equal(isTargetHitB, false);

  // Under penalty: Base wage remains 25k/h, combo bonus is 0
  const hoursB = 168;
  const baseWageCvB = hoursB * 25_000;
  const baseWageCvPlusB = isTargetHitB ? hoursB * 27_000 : baseWageCvB;
  const comboBonusTotalB = isTargetHitB ? 1_050_000 : 0;
  assert.equal(baseWageCvPlusB, 4_200_000);
  assert.equal(comboBonusTotalB, 0);

  // Tip share is still kept (70% CV vs 90% CVL)
  const rawTipB = 2_030_840;
  const tipCvB = rawTipB;
  const tipCvPlusB = Math.round(rawTipB * (9 / 7));
  assert.equal(tipCvPlusB > tipCvB, true);
});

test('CVL calculateComboDebtBonus enforces 500K minimum limit and supports TIER_LADDER / PERCENTAGE modes', () => {
  // Default TIER_LADDER (Khanh Cao Nov 2026 cases + <500K exclusions)
  assert.equal(calculateComboDebtBonus(31_000), 0); // 06/11 Trang phantom 31K -> 0đ
  assert.equal(calculateComboDebtBonus(499_999), 0);
  assert.equal(calculateComboDebtBonus(500_000), 50_000);
  assert.equal(calculateComboDebtBonus(1_527_500), 50_000); // 27/11 Thoa: 500K-<2M -> 50k
  assert.equal(calculateComboDebtBonus(4_158_000), 200_000); // 23/11 Hai: 4M-<5M -> 200k
  assert.equal(calculateComboDebtBonus(0), 0);
  assert.equal(calculateComboDebtBonus(-500_000), 0);

  // PERCENTAGE mode also enforces minimum collected limit
  assert.equal(calculateComboDebtBonus(300_000, { comboDebtBonusMode: 'PERCENTAGE', comboDebtBonusRate: 0.015 }), 0);
  assert.equal(
    calculateComboDebtBonus(1_527_500, { comboDebtBonusMode: 'PERCENTAGE', comboDebtBonusRate: 0.015 }),
    22_913
  );
  assert.equal(
    calculateComboDebtBonus(4_158_000, { comboDebtBonusMode: 'PERCENTAGE', comboDebtBonusRate: 0.02 }),
    83_160
  );
});

test('isLegacyPhantomDebtPayment filters legacy VAT/voucher false debt entries without blocking genuine debt collections', () => {
  // 06/11 Trang (#338929): 31K VAT on 390K birthday voucher while debt remained 1.9M
  assert.equal(
    isLegacyPhantomDebtPayment({
      isCompleted: 0,
      paidAmount: 31_000,
      originalDebtAmount: 1_900_000,
      orderPaymentDebtAmount: 1_900_000,
      orderPaymentDiscountAmount: 390_000,
    }),
    true
  );

  // 27/10 Vân Anh (#338417): 297K non-debt payment while debt remained 245K
  assert.equal(
    isLegacyPhantomDebtPayment({
      isCompleted: 0,
      paidAmount: 297_000,
      originalDebtAmount: 245_000,
      orderPaymentDebtAmount: 245_000,
      orderPaymentDiscountAmount: 550_000,
    }),
    true
  );

  // 27/11 Thoa (#340364): genuine partial debt payment 1.5275M (op.debt_amount = 0)
  assert.equal(
    isLegacyPhantomDebtPayment({
      isCompleted: 0,
      paidAmount: 1_527_500,
      originalDebtAmount: 15_532_400,
      orderPaymentDebtAmount: 0,
      orderPaymentDiscountAmount: 0,
    }),
    false
  );

  // 23/11 Hải (#340064): genuine full debt payment 4.158M
  assert.equal(
    isLegacyPhantomDebtPayment({
      isCompleted: 1,
      paidAmount: 4_158_000,
      originalDebtAmount: 4_158_000,
      orderPaymentDebtAmount: 0,
      orderPaymentDiscountAmount: 0,
    }),
    false
  );

  // #334279: completed full payment where legacy kept op.debt_amount = ud.debt_amount
  assert.equal(
    isLegacyPhantomDebtPayment({
      isCompleted: 1,
      paidAmount: 1_809_100,
      originalDebtAmount: 1_809_100,
      orderPaymentDebtAmount: 1_809_100,
      orderPaymentDiscountAmount: 390_000,
    }),
    false
  );
});

test('computeCashCollectedComboAmount prevents double-rewarding unpaid combo debt & clamps legacy anomalies', () => {
  // #338981: Combo 2,376,000đ with 1,188,000đ debt -> 1,188,000đ actual collected (<2M -> 50K)
  const case1 = computeCashCollectedComboAmount(2_376_000, 1_188_000);
  assert.equal(case1.actualCollected, 1_188_000);
  assert.equal(case1.deductedDebt, 1_188_000);
  assert.equal(calculateComboBonus(case1.actualCollected), 50_000);

  // Legacy anomaly where user_debt.debt_amount > gross combo price -> clamp actualCollected to 0
  const case2 = computeCashCollectedComboAmount(3_250_800, 15_532_400);
  assert.equal(case2.actualCollected, 0);
  assert.equal(case2.deductedDebt, 3_250_800);
  assert.equal(calculateComboBonus(case2.actualCollected), 0);
});

test('calculateCcMentorTrainingBonus includes menteeDebtCollectionBonusTotal when unlocked and zeroes when locked', () => {
  const pair: CvlTrainingMentorshipPair = {
    id: 'dt-2026-11-khanh-cao',
    menteeLegacyStaffId: 13783,
    menteeDisplayName: 'Khanh Cao',
    mentorLegacyStaffId: 34295,
    mentorDisplayName: 'Thục Nghi',
    storeCode: 'DT',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    fixedAllowanceVnd: 1_000_000,
    menteeBonusShareRate: 0.5,
    minComboRateThreshold: 0.2,
    isActive: true,
  };

  const unlocked = calculateCcMentorTrainingBonus({
    pair,
    combosSoldCount: 4,
    notComboLiveOrders: 20, // 20.0%
    comboLiveOrders: 10,
    menteeDeltaHourlyWage: 400_000,
    menteeDeltaTipBonus: 200_000,
    menteeComboBonusTotal: 300_000,
    menteeDebtCollectionBonusTotal: 250_000,
    menteeSerumBonusTotal: 100_000,
  });

  assert.equal(unlocked.isUnlocked, true);
  assert.equal(unlocked.menteeDebtCollectionBonusTotal, 250_000);
  assert.equal(unlocked.menteeTotalAdditionalIncome, 1_250_000);
  assert.equal(unlocked.mentorShareEarned, 625_000);
  assert.equal(unlocked.mentorTotalBonus, 1_625_000);

  const locked = calculateCcMentorTrainingBonus({
    pair,
    combosSoldCount: 2,
    notComboLiveOrders: 20, // 10.0% < 20%
    comboLiveOrders: 10,
    menteeDeltaHourlyWage: 400_000,
    menteeDeltaTipBonus: 200_000,
    menteeComboBonusTotal: 300_000,
    menteeDebtCollectionBonusTotal: 250_000,
    menteeSerumBonusTotal: 100_000,
  });

  assert.equal(locked.isUnlocked, false);
  assert.equal(locked.menteeDebtCollectionBonusTotal, 0);
  assert.equal(locked.menteeTotalAdditionalIncome, 200_000);
  assert.equal(locked.mentorTotalBonus, 0);
});

test('calculateCvlSerumLineBonus rounds legacy floats (550000.0000016 -> 10K) and sums serumsSoldCount', () => {
  const halfOff = calculateCvlSerumLineBonus(550000.0000016, 1);
  assert.equal(halfOff.qty, 1);
  assert.equal(halfOff.pricePerUnit, 550_000);
  assert.equal(halfOff.lineBonus, 10_000);

  const discounted = calculateCvlSerumLineBonus(710000.0000016, 1);
  assert.equal(discounted.qty, 1);
  assert.equal(discounted.pricePerUnit, 710_000);
  assert.equal(discounted.lineBonus, 50_000);

  const fullPrice = calculateCvlSerumLineBonus(1100000.0000016, 1);
  assert.equal(fullPrice.qty, 1);
  assert.equal(fullPrice.pricePerUnit, 1_100_000);
  assert.equal(fullPrice.lineBonus, 100_000);

  const multiFree = calculateCvlSerumLineBonus(0, 2);
  assert.equal(multiFree.qty, 2);
  assert.equal(multiFree.lineBonus, 2_000);
});

test('computeCvlConsultShareFactor applies 50/50 IN/OUT split for Official CVL and 100% during Training', () => {
  // 1. Official CVL (not in training): self IN & OUT -> 100%
  assert.deepEqual(
    computeCvlConsultShareFactor({
      staffId: 13783,
      assignedStaffId: 13783,
      checkInStaffId: 13783,
      checkOutStaffId: 13783,
      isInMenteeTrainingWindow: false,
      mode: 'ACTUAL_PAYROLL',
    }),
    { shareFactor: 1, consultRole: 'BOTH' }
  );

  // 2. Official CVL: CC IN, CVL OUT -> 50% (OUT) -> 200K * 0.5 = 100K, numerator 0.5
  assert.deepEqual(
    computeCvlConsultShareFactor({
      staffId: 13783,
      assignedStaffId: 13783,
      checkInStaffId: 37790,
      checkOutStaffId: 13783,
      isInMenteeTrainingWindow: false,
      mode: 'ACTUAL_PAYROLL',
    }),
    { shareFactor: 0.5, consultRole: 'OUT' }
  );

  // 3. Official CVL: CVL IN, CC OUT -> 50% (IN)
  assert.deepEqual(
    computeCvlConsultShareFactor({
      staffId: 13783,
      assignedStaffId: 13783,
      checkInStaffId: 13783,
      checkOutStaffId: 34295,
      isInMenteeTrainingWindow: false,
      mode: 'ACTUAL_PAYROLL',
    }),
    { shareFactor: 0.5, consultRole: 'IN' }
  );

  // 4. Official CVL: CC IN & CC OUT on CVL's lash order -> 0%
  assert.deepEqual(
    computeCvlConsultShareFactor({
      staffId: 13783,
      assignedStaffId: 13783,
      checkInStaffId: 34295,
      checkOutStaffId: 34295,
      isInMenteeTrainingWindow: false,
      mode: 'ACTUAL_PAYROLL',
    }),
    { shareFactor: 0, consultRole: 'BOTH' }
  );

  // 5. Official CVL cross-supporting another CV's order (IN only) -> 50%
  assert.deepEqual(
    computeCvlConsultShareFactor({
      staffId: 13783,
      assignedStaffId: 47510,
      checkInStaffId: 13783,
      checkOutStaffId: 34295,
      isInMenteeTrainingWindow: false,
      mode: 'ACTUAL_PAYROLL',
    }),
    { shareFactor: 0.5, consultRole: 'IN' }
  );

  // 6. Mentee CVL inside Training CC-006 window: always 100% even if CC did IN & OUT
  assert.deepEqual(
    computeCvlConsultShareFactor({
      staffId: 13783,
      assignedStaffId: 13783,
      checkInStaffId: 34295,
      checkOutStaffId: 34295,
      isInMenteeTrainingWindow: true,
      mode: 'ACTUAL_PAYROLL',
    }),
    { shareFactor: 1, consultRole: 'TRAINING' }
  );
});
