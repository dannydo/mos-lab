import type {
  BkMilestoneTier,
  BkMissedTier,
  BkRevenueTier,
  BkSalaryInputs,
  BkSalaryResult,
  SalaryBranchInfo,
} from '../contracts/salary-explainer.types';

export const BK_STANDARD_BASE_SALARY = 6_500_000;
export const BK_STANDARD_WORK_DAYS = 26;
export const BK_DEFAULT_AVG_SINGLE_CHECKIN = 21_428.57; // ~4.5tr cho 210 khách lẻ như paystub mẫu
export const BK_COMBO_LIVE_CHECKIN_BONUS = 1_000;
export const BK_TIP_SHARE_RATE = 0.07; // 7%

export const BK_MILESTONE_TIERS: BkMilestoneTier[] = [
  { minSingle: 0, bonus: 0, label: 'Chưa đạt mốc 100' },
  { minSingle: 100, bonus: 300_000, label: 'Mốc 100 (+300k)' },
  { minSingle: 150, bonus: 600_000, label: 'Mốc 150 (+600k)' },
  { minSingle: 200, bonus: 900_000, label: 'Mốc 200 (+900k)' },
  { minSingle: 250, bonus: 1_200_000, label: 'Mốc 250 (+1.2tr)' },
  { minSingle: 300, bonus: 1_500_000, label: 'Mốc 300 (+1.5tr)' },
  { minSingle: 350, bonus: 1_800_000, label: 'Mốc 350 (+1.8tr)' },
  { minSingle: 400, bonus: 2_100_000, label: 'Mốc 400 (+2.1tr)' },
  { minSingle: 450, bonus: 2_400_000, label: 'Mốc 450 (+2.4tr)' },
  { minSingle: 500, bonus: 2_700_000, label: 'Mốc 500 (+2.7tr)' },
];

export const BK_MISSED_TIERS: BkMissedTier[] = [
  { maxRate: 10, bonus: 1_000_000, label: 'Xuất sắc ≤ 10% (+1.000.000đ)', type: 'bonus' },
  { maxRate: 15, bonus: 500_000, label: 'Tốt ≤ 15% (+500.000đ)', type: 'bonus' },
  { maxRate: 20, bonus: 0, label: 'Đạt chuẩn 15.1% - 20% (0đ)', type: 'neutral' },
  { maxRate: 25, bonus: -500_000, label: 'Cần cải thiện 20.1% - 25% (-500.000đ)', type: 'penalty' },
  { maxRate: 100, bonus: -1_000_000, label: 'Báo động > 25% (-1.000.000đ)', type: 'penalty' },
];

export const BK_REVENUE_TIERS: BkRevenueTier[] = [
  { minRevenue: 300, rate: 0.012, label: '≥ 300 triệu (1.2%)' },
  { minRevenue: 250, rate: 0.011, label: '250 - 299 triệu (1.1%)' },
  { minRevenue: 200, rate: 0.01, label: '200 - 249 triệu (1.0%)' },
  { minRevenue: 150, rate: 0.009, label: '150 - 199 triệu (0.9%)' },
  { minRevenue: 100, rate: 0.008, label: '100 - 149 triệu (0.8%)' },
  { minRevenue: 50, rate: 0.007, label: '50 - 99 triệu (0.7%)' },
  { minRevenue: 0, rate: 0.0, label: '< 50 triệu (0%)' },
];

export const BK_SAMPLE_INPUTS: BkSalaryInputs = {
  workDays: 26,
  singleDone: 210,
  comboDone: 40,
  missedRate: 12,
  revenueMillion: 160,
  tipAmount: 200_000,
  avgSingleCheckinPrice: BK_DEFAULT_AVG_SINGLE_CHECKIN,
};

export function calculateBkSalary(inputs: BkSalaryInputs): BkSalaryResult {
  const {
    workDays,
    singleDone,
    comboDone,
    missedRate,
    revenueMillion,
    tipAmount,
    avgSingleCheckinPrice = BK_DEFAULT_AVG_SINGLE_CHECKIN,
  } = inputs;

  // 1. Lương ca cơ bản (6.5tr/26 công)
  const baseSalary = Math.round((Math.max(0, workDays) / BK_STANDARD_WORK_DAYS) * BK_STANDARD_BASE_SALARY);

  // 2. Thưởng Check-in đơn (Khách lẻ theo đơn giá + Khách combo live 1k)
  const singleCheckinTotal = Math.round(Math.max(0, singleDone) * avgSingleCheckinPrice);
  const comboCheckinTotal = Math.round(Math.max(0, comboDone) * BK_COMBO_LIVE_CHECKIN_BONUS);
  const checkinBonus = singleCheckinTotal + comboCheckinTotal;

  // 3. Thưởng Mốc bậc thang Khách Lẻ Done (BK-005)
  let currentMilestone = BK_MILESTONE_TIERS[0];
  let nextMilestone: BkMilestoneTier | null = BK_MILESTONE_TIERS[1];

  for (let i = BK_MILESTONE_TIERS.length - 1; i >= 0; i--) {
    if (singleDone >= BK_MILESTONE_TIERS[i].minSingle) {
      currentMilestone = BK_MILESTONE_TIERS[i];
      nextMilestone = i < BK_MILESTONE_TIERS.length - 1 ? BK_MILESTONE_TIERS[i + 1] : null;
      break;
    }
  }

  const milestoneBonus = currentMilestone.bonus;
  const singleNeededForNext = nextMilestone ? Math.max(0, nextMilestone.minSingle - singleDone) : 0;

  // 4. Thưởng/Phạt Tỷ lệ Missed (Chỉ tính khi đạt mốc tối thiểu 100 khách Done)
  let currentMissedTier = BK_MISSED_TIERS[BK_MISSED_TIERS.length - 1];
  for (const tier of BK_MISSED_TIERS) {
    if (missedRate <= tier.maxRate) {
      currentMissedTier = tier;
      break;
    }
  }
  const effectiveDone = singleDone > 0 ? singleDone : singleDone + comboDone;
  const isMissedEligible = effectiveDone >= 100;
  const missedBonus = isMissedEligible ? currentMissedTier.bonus : 0;

  // 5. Hoa hồng Doanh thu Net & Tip
  let matchedRevenueTier = BK_REVENUE_TIERS[BK_REVENUE_TIERS.length - 1];
  for (const tier of BK_REVENUE_TIERS) {
    if (revenueMillion >= tier.minRevenue) {
      matchedRevenueTier = tier;
      break;
    }
  }
  const revenueBonus = Math.round(revenueMillion * 1_000_000 * matchedRevenueTier.rate);
  const tipBonus = Math.round(Math.max(0, tipAmount) * BK_TIP_SHARE_RATE);

  // Tổng thu nhập
  const totalIncome = baseSalary + checkinBonus + milestoneBonus + missedBonus + revenueBonus + tipBonus;

  // Sơ đồ 5 nhánh dòng tiền
  const branches: SalaryBranchInfo[] = [
    {
      key: 'base',
      name: 'Lương ca cơ bản',
      shortLabel: 'Lương ca',
      amount: baseSalary,
      formula: `${workDays}/${BK_STANDARD_WORK_DAYS} công × 6.500.000đ`,
      highlightNote: `${workDays} ngày công thực tế`,
      accent: 'blue',
    },
    {
      key: 'checkin',
      name: 'Thưởng Check-in đơn',
      shortLabel: 'Check-in',
      amount: checkinBonus,
      formula: `${singleDone} Khách Lẻ (${singleCheckinTotal.toLocaleString('vi-VN')}đ) + ${comboDone} Combo Live (${comboCheckinTotal.toLocaleString('vi-VN')}đ)`,
      highlightNote: `${singleDone} đơn lẻ + ${comboDone} combo`,
      accent: 'emerald',
    },
    {
      key: 'milestone',
      name: 'Mốc bậc thang Done (BK-005)',
      shortLabel: 'Mốc Done',
      amount: milestoneBonus,
      formula: currentMilestone.bonus > 0 ? `Đạt mốc ${currentMilestone.minSingle} khách lẻ` : 'Chưa đạt mốc 100 khách',
      highlightNote: currentMilestone.label,
      accent: 'purple',
    },
    {
      key: 'missed',
      name: 'Thưởng/Phạt Tỷ lệ Missed',
      shortLabel: 'Tỷ lệ Missed',
      amount: missedBonus,
      formula: isMissedEligible
        ? `Tỷ lệ ${missedRate.toFixed(1)}% (${currentMissedTier.type === 'bonus' ? 'Thưởng' : currentMissedTier.type === 'penalty' ? 'Phạt' : 'Chuẩn'})`
        : `Chưa đạt mốc tối thiểu 100 khách Done (Tỷ lệ: ${missedRate.toFixed(1)}% - Không tính thưởng/phạt)`,
      highlightNote: isMissedEligible ? currentMissedTier.label : 'Chưa đạt tối thiểu 100 khách Done (0đ)',
      accent: isMissedEligible
        ? currentMissedTier.type === 'penalty'
          ? 'rose'
          : currentMissedTier.type === 'bonus'
            ? 'amber'
            : 'cyan'
        : 'cyan',
    },
    {
      key: 'revenue_tip',
      name: 'Hoa hồng Doanh thu & Tip',
      shortLabel: 'Doanh thu & Tip',
      amount: revenueBonus + tipBonus,
      formula: `${revenueMillion}tr × ${(matchedRevenueTier.rate * 100).toFixed(1)}% (${revenueBonus.toLocaleString('vi-VN')}đ) + Tip 7% (${tipBonus.toLocaleString('vi-VN')}đ)`,
      highlightNote: `${matchedRevenueTier.label} + ${tipBonus.toLocaleString('vi-VN')}đ tip`,
      accent: 'cyan',
    },
  ];

  return {
    baseSalary,
    checkinBonus,
    milestoneBonus,
    currentMilestone,
    nextMilestone,
    singleNeededForNext,
    missedBonus,
    currentMissedTier,
    revenueBonus,
    revenueCommissionRate: matchedRevenueTier.rate,
    tipBonus,
    totalIncome,
    branches,
  };
}
