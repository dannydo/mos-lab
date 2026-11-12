import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateComboBonus, calculateDualComboTierBonus, formatComboTierBracketLabel } from '@mos-lab/shared';

test('CVL calculateComboBonus simplified formula (<2M = 50K, +50K per next 1M) & multi-combo aggregation', () => {
  // 1. Under 2M -> 50,000đ
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
  assert.equal(formatComboTierBracketLabel(1_684_800), '<2M');

  // 6. Custom Career Path config with only 2 parameters (comboUnder2mBonus & comboStepPerMillionBonus)
  const customCfg = { comboUnder2mBonus: 60_000, comboStepPerMillionBonus: 40_000 };
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
