import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateComboBonus } from '@mos-lab/shared';

test('CV+ calculateComboBonus tests per mOS Bible COMBO-REWARD-001', () => {
  // 1. Under 2M -> 50,000đ
  assert.equal(calculateComboBonus(1_200_000), 50_000);
  assert.equal(calculateComboBonus(1_990_000), 50_000);

  // 2. Under 3M -> 100,000đ
  assert.equal(calculateComboBonus(2_000_000), 100_000);
  assert.equal(calculateComboBonus(2_635_200), 100_000);
  assert.equal(calculateComboBonus(2_990_000), 100_000);

  // 3. Under 4M -> 150,000đ
  assert.equal(calculateComboBonus(3_000_000), 150_000);
  assert.equal(calculateComboBonus(3_801_600), 150_000);
  assert.equal(calculateComboBonus(3_990_000), 150_000);

  // 4. From 4M+: 150k + 50k per 1M (4M -> 200k, 5M -> 250k, 6M -> 300k, 8M -> 400k)
  assert.equal(calculateComboBonus(4_276_800), 200_000); // 4M - <5M -> 200k
  assert.equal(calculateComboBonus(5_100_000), 250_000); // 5M - <6M -> 250k
  assert.equal(calculateComboBonus(6_000_000), 300_000); // 6M - <7M -> 300k
  assert.equal(calculateComboBonus(7_484_400), 350_000); // 7M - <8M -> 350k
  assert.equal(calculateComboBonus(8_051_600), 400_000); // 8M - <9M -> 400k
  assert.equal(calculateComboBonus(10_886_400), 500_000); // 10M - <11M -> 500k
});

test('CV+ Penalty Rule & Opportunity Threshold Simulation', () => {
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

  // Tip share is still kept (70% CV vs 90% CV+)
  const rawTipB = 2_030_840;
  const tipCvB = rawTipB;
  const tipCvPlusB = Math.round(rawTipB * (9 / 7));
  assert.equal(tipCvPlusB > tipCvB, true);
});
