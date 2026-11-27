import type {
  CareerProgressionConfig,
  CvPlusPlusToFmRequirements,
  CvPlusToCvPlusPlusRequirements,
  CvToCvPlusRequirements,
  FmFloorFarmConfig,
} from './career-requirements.types.js';

export const DEFAULT_COMBO_MIN_COLLECTED_AMOUNT = 500_000;

const DEFAULT_CV_TO_CV_PLUS: CvToCvPlusRequirements = {
  minOrders: 330, // 330 bộ mi trong 3 tháng liền (chuẩn 110 bộ/tháng)
  minConsecutiveMonths: 3,
  minTipRatioAboveShop: 0.05, // 5% cao hơn trung bình shop
  maxFixRate: 0.015, // Tỷ lệ lỗi Fix tối đa 1.5%
  minHappinessIndex: 0.7, // Hệ thống HI tối thiểu 70% từ check-in thả tim
  minBananaCount: 20, // Chuối yêu thương nhận từ thiên thần khác lúc check-in trong tháng gần nhất (chuẩn 20 chuối/tháng)
  maxDisciplinaryViolations: 0, // Bị 1 biên bản QA/QC là failed
  minWeeklyQaAudits: 1, // Tối thiểu 1 lần/tuần mời QA/QC kiểm tra tác phong & phòng mi
  minQaAudits: 4, // Tối thiểu 4 lần trong tháng gần nhất (1 lần/tuần * 4 tuần)
  requireZeroFailedAudits: true, // Nếu có bài kiểm tra failed -> KHÔNG được nâng cấp
  trialDurationDays: 30,
  minSelfComboRate: 0.21, // Tối thiểu 21% trên tệp khách tiềm năng chưa có gói combo
  allowSelfConsultTrial: true,
  expectedSerumsPerWeek: 1, // 1 cây dưỡng mi / tuần (+100.000đ/tuần ~ +400.000đ/tháng)
  expectedCombosPerMonth: 8, // 8 combo / tháng (+1.600.000đ/tháng theo bậc thang combo 4.5M -> 200k)
  serumOriginalPriceBonus: 100000, // 100K/cây giá gốc (1.1M)
  serumDiscountedPriceBonus: 50000, // 50K/cây giá khuyến mãi nhẹ (< 50%)
  serumDeepDiscountPriceBonus: 10000, // 10K/cây giá giảm sâu (>= 50%)
  serumFreePriceBonus: 1000, // 1K/cây tặng miễn phí (Free 0đ)
  comboUnder2mBonus: 50000, // < 2M = 50K (tối thiểu thực thu 500K)
  comboStepPerMillionBonus: 50000, // Mỗi 1M kế tiếp (từ 2M trở lên) = +50K
  comboMinCollectedAmount: DEFAULT_COMBO_MIN_COLLECTED_AMOUNT, // Tối thiểu thực thu 500K mới tính thưởng Combo & Thu nợ Combo
  comboDebtBonusMode: 'TIER_LADDER', // Thu nợ Combo mặc định dùng bậc thang thực thu như gói Combo
  comboDebtBonusRate: 0.015, // 1.5% nếu chọn chế độ PERCENTAGE
  hourlyWage: 27500, // 27.500đ/h (+2.000đ/h so với CV 25.500đ/h)
  tipShareRatio: 0.9, // 90% = 70% làm mi + 20% tư vấn
  enforceComboPenalty: true, // Chế tài nếu combo < 21%: khóa lương tăng thêm và thưởng bán hàng, chỉ giữ 20% tip tư vấn
};

const DEFAULT_CV_PLUS_TO_CV_PLUS_PLUS: CvPlusToCvPlusPlusRequirements = {
  minMonthsInCvPlus: 2, // 2 tháng ở vị trí CVL
  minOrders: 330, // Bằng chuẩn CVL: 330 ca / 3 tháng liền (live-adjustable)
  maxFixRate: 0.015, // Tỷ lệ lỗi Fix <= 1.5%
  minTipRatioAboveShop: 0.05, // Tip cao hơn 5% so với trung bình shop (bằng chuẩn CVL)
  minBananaCount: 20, // Chuối yêu thương nhận trong tháng gần nhất (chuẩn 20 chuối/tháng)
  minHappinessIndex: 0.7, // Đồng đội tin yêu HI >= 70% (bằng chuẩn CVL)
  crossConsultCommissionRate: 0.025, // Legacy field preserved for backward compat
  crossConsultTipRate: 0.2, // Tip giữ như CVL (70% làm mi + 10% Check-in + 10% Check-out)
  expectedCrossConsultOrdersPerMonth: 24, // Dự kiến 24 ca tư vấn chéo / tháng (CV thường + CVL)
  expectedCrossConsultCombosPerMonth: 8, // Dự kiến chốt 8 combo chéo / tháng
  maxDisciplinaryViolations: 0,
  minWeeklyQaAudits: 1,
  minQaAudits: 4,
  requireZeroFailedAudits: true,
  trialDurationDays: 30,
  allowSelfConsultTrial: true,
  promotionMinComboRate: 0.3, // Đạt tối thiểu 30% tỷ lệ bán Combo...
  promotionConsecutiveMonths: 2, // ...trong 2 tháng liên tiếp mới được lên CVLL
  minSelfComboRate: 0.21, // Ngưỡng duy trì hàng tháng sau khi lên CVLL (bằng CVL, live-adjustable)
  consecutiveFailedMonthsToDemote: 2, // Trượt 2 tháng liên tiếp giáng về CVL
  enforceComboPenalty: true, // Trượt 1 tháng khóa lương tăng thêm & thưởng bán hàng cá nhân
  expectedSerumsPerWeek: 4, // 4 cây dưỡng mi / tuần
  expectedCombosPerMonth: 10, // 10 combo / tháng
  serumOriginalPriceBonus: 100000, // 100K/cây giá gốc (1.1M)
  serumDiscountedPriceBonus: 50000, // 50K/cây giá khuyến mãi nhẹ (< 50%)
  serumDeepDiscountPriceBonus: 10000, // 10K/cây giá giảm sâu (>= 50%)
  serumFreePriceBonus: 1000, // 1K/cây tặng miễn phí (Free 0đ)
  comboUnder2mBonus: 50000, // < 2M = 50K (tối thiểu thực thu 500K)
  comboStepPerMillionBonus: 50000, // Mỗi 1M kế tiếp (từ 2M trở lên) = +50K
  comboMinCollectedAmount: DEFAULT_COMBO_MIN_COLLECTED_AMOUNT, // Tối thiểu thực thu 500K mới tính thưởng Combo & Thu nợ Combo
  comboDebtBonusMode: 'TIER_LADDER', // Thu nợ Combo mặc định dùng bậc thang thực thu như gói Combo
  comboDebtBonusRate: 0.015, // 1.5% nếu chọn chế độ PERCENTAGE
  crossConsultCvShareRate: 0, // Mô hình 100/0: CVLL nhận 100% Combo & Sản phẩm, CV/CVL nhận 0đ
  exemptCvlDenominatorOnCrossConsult: true, // Miễn trừ mẫu số Not Combo Live cho CVL khi nhờ CVLL chốt hộ
  enforceMandatoryOwnQueue: true, // Bắt buộc đi tua khách mình; bỏ tua bị phạt theo quy định
  hourlyWage: 29500, // 29.500đ/h (+2.000đ/h so với CVL 27.500đ/h)
  tipShareRatio: 0.9, // 90% trên khách của mình (70% + 20%)
};

const DEFAULT_CV_PLUS_PLUS_TO_FM: CvPlusPlusToFmRequirements = {
  minMonthsInRole: 3, // 3 tháng
  minMonthlyGoogleReviews: 30, // Tối thiểu 30 Google Review/tháng
  maxDisciplinaryViolations: 0, // Không bị biên bản HR hoặc QA/QC
  weeklyAuditRequired: true, // Kiểm tra kho & CSVC hàng tuần
  minShopComboRate: 0.25,
  minAvgLevel: 10,
};

export const DEFAULT_FM_FLOOR_FARM_CONFIG: FmFloorFarmConfig = {
  // 3 Tiers & Daily Base Claim & Cover Shift
  fm1BaseSalary: 8_000_000,
  fm2BaseSalary: 9_000_000,
  fm3BaseSalary: 10_000_000,
  workingDaysPerMonth: 26,
  coverShiftBonus: 400_000,
  fm2PromotionMonths: 3,
  fm2MinStars: 8,
  fm3PromotionMonths: 3,
  fm3MinStars: 10,
  demoteConsecutiveMonths: 2,
  requireActiveClaimWallet: true,

  // Capacity & Stepped 2% DT Pool & 60/40 Split
  cvsPerFm: 8,
  minCvsForSecondFm: 13,
  targetBedCapacityRatio: 0.67,
  revPerCvTarget: 40_000_000,
  visitsPerCvTarget: 100,
  dtRateBelowTarget: 0.01,
  dtRateAtTarget: 0.02,
  dtRateAccelerator: 0.022,
  dtAcceleratorCapacityRatio: 0.8,
  dtBranchSharedWeight: 0.6,
  dtGroupOwnedWeight: 0.4,

  // Pillar 1: Google Maps (5★ only; 4★ = 0đ; 1–3★ = Sâu)
  gmaps1StarReviewsPerCv: 3,
  gmaps2StarReviewsPerCv: 4,
  gmaps3StarReviewsPerCv: 5,
  gmaps1StarBonus: 400_000,
  gmaps2StarBonus: 800_000,
  gmaps3StarBonus: 1_200_000,
  gmapsMaxNegativeWormsPerMonth: 1,
  gmapsTwoWormsMaxStar: 1,
  gmapsZeroBonusWormsThreshold: 3,
  gmapsAllowButterflyRedemption: true,

  // Pillar 2: Kho & Vật Tư
  inv1StarBonus: 300_000,
  inv2StarBonus: 600_000,
  inv3StarBonus: 750_000,
  invMaxLossRate1Star: 0.03,
  invMaxLossRate2Star: 0.02,
  invMaxLossRate3Star: 0.01,

  // Pillar 3: CSVC · Giường 3 Sạch · Phong Thái/Son
  fac1StarBonus: 300_000,
  fac2StarBonus: 600_000,
  fac3StarBonus: 750_000,
  facMinScore1Star: 90,
  facMinScore2Star: 95,
  facMinScore3Star: 98,

  // Pillar 4: Tua · Giờ Công · FAL & Tư Vấn
  ops1StarBonus: 300_000,
  ops2StarBonus: 600_000,
  ops3StarBonus: 800_000,
  falMaxRate1Star: 0.015,
  falMaxRate2Star: 0.01,
  falMaxRate3Star: 0.005,
  minFairnessHi1Star: 0.75,
  minFairnessHi2Star: 0.85,
  minFairnessHi3Star: 0.92,

  // Keep-Sharp Consult, FAL Gate & Fun Fund
  weeklyRegularConsultTarget: 6,
  weeklyNewCustomerConsultMin: 2,
  consultMinComboRate: 0.25,
  consultExcellentComboRate: 0.3,
  consultTipToFunFund: true,
  requireAllFalThroughFm: true,
  falSlaHours: 24,

  // Daily Quests, Shield, Worm Penalties, Wheel & Holiday Autopilot
  dailyQuestBonusTotal: 110_000,
  minShieldHpForChest: 80,
  missedQuestHpPenalty: 10,
  mapsWormLate24hPenalty: 200_000,
  falWormLate24hPenalty: 100_000,
  falWormLate48hPenalty: 300_000,
  wheelMinPrize: 500_000,
  wheelMaxPrize: 1_500_000,
  holidayAutopilotMinCvlRatio: 0.5,
};

export const DEFAULT_CAREER_PROGRESSION_CONFIG: CareerProgressionConfig = {
  version: '2026.5',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Update',
  cvToCvPlus: DEFAULT_CV_TO_CV_PLUS,
  cvPlusToCvPlusPlus: DEFAULT_CV_PLUS_TO_CV_PLUS_PLUS,
  cvPlusPlusToFm: DEFAULT_CV_PLUS_PLUS_TO_FM,
  cvToCc: DEFAULT_CV_TO_CV_PLUS,
  ccToFm: DEFAULT_CV_PLUS_PLUS_TO_FM,
  fmFloorFarm: DEFAULT_FM_FLOOR_FARM_CONFIG,
  fmToCho: {
    minTargetHitMonths: 3,
    helpLowHiStaffImprove: true, // Giúp đỡ người có HI thấp lên cao hơn
    maxInventoryLossRate: 0.005, // Hao hụt kho tối đa 0.5%
    minFacilityScore: 95,
    maxChoPerShop: 1,
    maxConsumablesRate: 0.05, // Vật tư tối đa 5% doanh thu (Danny chốt 5%)
    maxWelcomeBudgetPerNewCustomer: 20000, // Định mức đón khách mới max 20K/khách
    minShopNetMarginForBonus: 0.12, // Lãi tiệm >= 12% mới mở khóa thưởng quản lý
    gainSharingRatio: 0.2, // Thưởng 20% chi phí tiết kiệm được (chia đôi 10% FM & 10% CHO)
    breakEvenRevenueDT: 450_000_000, // Điểm hòa vốn Đề Thám: 450M
    breakEvenRevenueEP: 350_000_000, // Điểm hòa vốn Estella: 350M
    fmIncrementalBonusRate: 0.02, // Thưởng 2% phần vượt hòa vốn cho FM
    fmBreakEvenMilestoneBonus: 2_000_000, // Thưởng 2M khi cán mốc hòa vốn cho FM
    choIncrementalBonusRate: 0.03, // Thưởng 3% phần vượt hòa vốn cho CHO (cao hơn FM)
    choBreakEvenMilestoneBonus: 3_000_000, // Thưởng 3M khi cán mốc hòa vốn cho CHO
    fmFloorQualityBonus: 1_000_000, // Thưởng 1M khi CSVC >= 95đ & 30 review 5★
  },
  choToBoss: {
    minProfitableMonths: 6, // 6 tháng liên tiếp có lãi P&L dương
    minNetProfitMargin: 0.15,
    minMonthlyNewCustomers: 60, // Tối thiểu 60 khách mới đến shop mỗi tháng
    minStaffEnps: 80,
    requiredSuccessors: {
      fmCount: 1,
      choCount: 1,
    },
  },
  rewardRates: {
    bananaPerFALShort: 15,
    bananaPerFALCcShort: 5,
    ccBonusRatePerLevel: 65,
    tipShareCvRatio: 0.7, // 70% chuẩn theo bảng lương và TIP-001
    tipShareCcRatio: 0.2, // 20% chuẩn CC
    tipShareCvPlusSelfRatio: 0.9, // 90% = 70% tip nối mi (CV) + 20% tư vấn (CC) khi tự phục vụ khách mình
    tipShareCrossConsultCcRatio: 0.2, // 20% tip tư vấn khi CV++ tư vấn hộ cho CV khác
    fmMonthlyBananaGrant: 500,
  },
  maintenanceRules: {
    cvPlus: {
      minSelfComboRate: 0.2, // Duy trì tự chốt combo >= 20%
      maxFixRate: 0.03, // Tỷ lệ fix <= 3%
      minHappinessIndex: 0.65, // HI thả tim check-in >= 65%
      consecutiveFailedMonthsToDemote: 2, // 2 tháng liên tiếp không đạt -> tụt về CV
    },
    cvPlusPlus: {
      minSelfComboRate: 0.21, // Duy trì tự chốt combo >= 21% (như CVL, live-adjustable)
      minHappinessIndex: 0.7, // HI đồng đội tin yêu >= 70%
      consecutiveFailedMonthsToDemote: 2, // 2 tháng liên tiếp không đạt -> tụt về CVL
    },
  },
  compensation: {
    hourlyWages: {
      cv: 25_500,
      cvPlus: 27_500,
      cvPlusPlus: 29_500,
    },
    fmPackage: {
      baseSalary: 6_500_000,
      floorAllowance: 1_500_000,
      breakEvenMilestoneBonus: 2_000_000,
      excessRevenueRate: 0.02,
      floorQualityBonus: 1_000_000,
      gainSharingRatio: 0.1,
    },
    choPackage: {
      baseSalary: 11_000_000,
      breakEvenMilestoneBonus: 3_000_000,
      excessRevenueRate: 0.03,
      newCustomerBonus: 3_500_000,
      newCustomerTarget: 60,
      gainSharingRatio: 0.1,
      angelGrowthTiers: [
        { minQualifiedCount: 3, bonus: 1_500_000 },
        { minQualifiedCount: 5, bonus: 2_500_000 },
        { minQualifiedCount: 8, bonus: 3_500_000 },
        { minQualifiedCount: 11, bonus: 4_500_000 },
      ],
    },
  },
};

function resolveComboMinCollectedAmount(minCollected?: number | null): number {
  if (minCollected !== undefined && minCollected !== null && Number.isFinite(minCollected)) {
    return Math.max(0, Math.round(Number(minCollected)));
  }
  return DEFAULT_COMBO_MIN_COLLECTED_AMOUNT;
}

function formatCompactMinThresholdLabel(minCollected: number): string {
  if (minCollected < 1_000_000) {
    return `${Math.round(minCollected / 1000)}K`;
  }
  const millions = minCollected / 1_000_000;
  return `${Number.isInteger(millions) ? millions.toFixed(0) : Number(millions.toFixed(1))}M`;
}

/**
 * Tính tiền thưởng hoa hồng Combo bậc thang theo tổng giá trị thực thu trong đơn (Kinh Thánh mOS Điều răn CV-002 v2.11.0):
 * - Nếu khách mua 2 (hoặc nhiều) gói Combo cùng lúc trong 1 đơn hàng (cùng order_id), cộng gộp tổng tiền các gói lại trước rồi thưởng theo công thức.
 * - Tối thiểu thực thu comboMinCollectedAmount (mặc định 500.000đ): dưới ngưỡng = 0đ.
 * - Từ ngưỡng tối thiểu đến dưới 2M (500K - < 2.000.000đ): comboUnder2mBonus (mặc định 50.000đ)
 * - Mỗi 1M kế tiếp từ mốc 2M trở lên: +comboStepPerMillionBonus (mặc định +50.000đ/1M)
 *   => 2M-<3M: 100K | 3M-<4M: 150K | 4M-<5M: 200K | 8M-<9M: 400K | 11M-<12M: 550K...
 */
export function calculateComboBonus(
  price: number,
  config?: {
    comboUnder2mBonus?: number;
    comboStepPerMillionBonus?: number;
    comboMinCollectedAmount?: number;
    comboUnder3mBonus?: number;
    comboUnder4mBonus?: number;
  } | null
): number {
  const minCollected = resolveComboMinCollectedAmount(config?.comboMinCollectedAmount);
  if (!price || price <= 0 || price < minCollected) return 0;
  const under2m = config?.comboUnder2mBonus ?? 50_000;
  const step = config?.comboStepPerMillionBonus ?? 50_000;

  if (price < 2_000_000) return under2m;
  const extraMillionsFrom2M = Math.floor((price - 2_000_000) / 1_000_000) + 1;
  return under2m + extraMillionsFrom2M * step;
}

/**
 * Định dạng nhãn bậc thang Combo theo ngưỡng tối thiểu và bước nhảy 1M từ mốc 2M
 * (<500K, 500K-<2M, 2M-<3M, 3M-<4M, ..., 8M-<9M, 11M-<12M)
 */
export function formatComboTierBracketLabel(price: number, minCollected = DEFAULT_COMBO_MIN_COLLECTED_AMOUNT): string {
  const safeMin = resolveComboMinCollectedAmount(minCollected);
  const minLabel = formatCompactMinThresholdLabel(safeMin);
  if (!price || price <= 0 || (safeMin > 0 && price < safeMin)) {
    return safeMin > 0 ? `<${minLabel}` : '<2M';
  }
  if (price < 2_000_000) {
    return safeMin > 0 ? `${minLabel}-<2M` : '<2M';
  }
  const floorM = Math.floor(price / 1_000_000);
  return `${floorM}M-<${floorM + 1}M`;
}

/**
 * Tính thưởng thu nợ Combo cho CVL/CVLL theo cấu hình CAREER_PROGRESSION_RULES:
 * - Bắt buộc thực thu >= comboMinCollectedAmount (mặc định 500.000đ); dưới ngưỡng = 0đ.
 * - Mặc định TIER_LADDER: áp dụng đúng bậc thang CVL trên số tiền thực thu (500K-<2M = 50K, mỗi +1M = +50K).
 * - Tùy chọn PERCENTAGE: Math.round(collectedAmount * comboDebtBonusRate) (mặc định 1.5%).
 */
export function calculateComboDebtBonus(
  collectedAmount: number,
  config?: {
    comboDebtBonusMode?: 'TIER_LADDER' | 'PERCENTAGE';
    comboDebtBonusRate?: number;
    comboUnder2mBonus?: number;
    comboStepPerMillionBonus?: number;
    comboMinCollectedAmount?: number;
  } | null
): number {
  const minCollected = resolveComboMinCollectedAmount(config?.comboMinCollectedAmount);
  if (!collectedAmount || collectedAmount <= 0 || collectedAmount < minCollected) return 0;
  if (config?.comboDebtBonusMode === 'PERCENTAGE') {
    const rate = Number.isFinite(config.comboDebtBonusRate) ? Math.max(0, Number(config.comboDebtBonusRate)) : 0.015;
    return Math.round(collectedAmount * rate);
  }
  return calculateComboBonus(collectedAmount, config);
}
