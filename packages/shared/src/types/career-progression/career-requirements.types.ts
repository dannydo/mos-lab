export type CareerRole = 'KTV' | 'CV' | 'CV_PLUS' | 'CV_PLUS_PLUS' | 'FM' | 'CHO' | 'BOSS' | 'MASTER_TECH' | 'CC';

export type CareerPeriod = 'last_30_days' | 'this_month' | 'last_month' | 'last_3_months';

export type CareerProgressionStatus = 'IN_PROGRESS' | 'TRIAL_GATE' | 'QUALIFIED' | 'PROMOTED' | 'SPECIALIST_PATH';

export interface CvToCvPlusRequirements {
  /** Số ca nối mi tối thiểu cần hoàn thành trong 3 tháng liên tiếp */
  minOrders: number;
  /** Số tháng liên tiếp yêu cầu (3 tháng liền) */
  minConsecutiveMonths: number;
  /** % Tip cao hơn trung bình chi nhánh (0.10 = cao hơn 10% so với TB shop) */
  minTipRatioAboveShop: number;
  /** Tỷ lệ lỗi bảo hành rụng mi Fix tối đa (0.02 = 2.0%) */
  maxFixRate: number;
  /** Chỉ số hài lòng khách hàng Happiness Index tối thiểu (0.70 = 70% qua hệ thống check-in thả tim) */
  minHappinessIndex: number;
  /** Số Chuối yêu thương nhận được từ thiên thần khác lúc check-in trong 90 ngày (15 * 3 = 45 chuối) */
  minBananaCount: number;
  /** Số biên bản vi phạm QA/QC tối đa cho phép (0 = nếu bị 1 biên bản là FAILED ngay) */
  maxDisciplinaryViolations: number;
  /** Tần suất tối thiểu mời QA/QC kiểm tra tác phong cá nhân & phòng nối mi (lần/tuần, mặc định: 1) */
  minWeeklyQaAudits: number;
  /** Số lần kiểm định QA/QC tối thiểu trong 3 tháng qua (mặc định: 12 lần) */
  minQaAudits?: number;
  /** Bắt buộc tất cả bài kiểm tra QA/QC phải ĐẠT (nếu failed 1 bài thì KHÔNG được nâng cấp) */
  requireZeroFailedAudits: boolean;
  /** Thời hạn thử thách tự tư vấn (ngày) */
  trialDurationDays: number;
  /** Tỷ lệ chốt combo tự thân tối thiểu trên tệp khách của chính mình (0.25 = 25%) */
  minSelfComboRate: number;
  /** Bật/tắt ải trùm cuối tự tư vấn */
  allowSelfConsultTrial: boolean;
  /** Số cây dưỡng mi dự kiến bán mỗi tuần (mặc định: 4 cây/tuần) */
  expectedSerumsPerWeek?: number;
  /** Số gói combo dự kiến bán mỗi tháng (mặc định: 6 combo/tháng) */
  expectedCombosPerMonth?: number;
  /** Thưởng tiền tươi dưỡng mi giá gốc (1.100.000đ -> 100.000đ/cây) */
  serumOriginalPriceBonus?: number;
  /** Thưởng tiền tươi dưỡng mi giá khuyến mãi nhẹ < 50% (50.000đ/cây) */
  serumDiscountedPriceBonus?: number;
  /** Thưởng dưỡng mi giá giảm sâu >= 50% (1.000đ/cây) */
  serumDeepDiscountPriceBonus?: number;
  /** Thưởng dưỡng mi tặng kèm Free (1.000đ/cây) */
  serumFreePriceBonus?: number;
  /** Thưởng mốc nền cho tổng gói Combo < 2 triệu (mặc định: 50.000đ) */
  comboUnder2mBonus?: number;
  /** @deprecated Đã đơn giản hóa công thức theo Điều răn CV-002 v2.8.0 (<2M = 50K, mỗi 1M kế tiếp = +50K) */
  comboUnder3mBonus?: number;
  /** @deprecated Đã đơn giản hóa công thức theo Điều răn CV-002 v2.8.0 (<2M = 50K, mỗi 1M kế tiếp = +50K) */
  comboUnder4mBonus?: number;
  /** Thưởng cộng thêm cho mỗi 1 triệu kế tiếp từ mốc 2 triệu trở lên (mặc định: 50.000đ/1M) */
  comboStepPerMillionBonus?: number;
  /** Lương theo giờ áp dụng khi lên CV+ (mặc định: 27.500đ/h, tăng +2.000đ/h) */
  hourlyWage?: number;
  /** Tỷ lệ hưởng tip khi tự tư vấn và làm mi (mặc định: 0.90 = 90%) */
  tipShareRatio?: number;
  /** Bật/tắt chế tài: nếu tỷ lệ combo < 20% thì không hưởng lương tăng thêm và thưởng bán hàng, chỉ giữ 20% tip tư vấn */
  enforceComboPenalty?: boolean;
}

export type CvToCcRequirements = CvToCvPlusRequirements;

export interface CvPlusToCvPlusPlusRequirements {
  /** Số tháng tối thiểu ở vị trí CV+ (2 tháng) */
  minMonthsInCvPlus: number;
  /** Số ca làm tối thiểu trong 3 tháng liên tiếp (mặc định: 350 ca) */
  minOrders?: number;
  /** Tỷ lệ lỗi bảo hành rụng mi Fix tối đa (0.015 = 1.5%) */
  maxFixRate?: number;
  /** % Tip cao hơn trung bình chi nhánh (0.15 = cao hơn 15% so với TB shop) */
  minTipRatioAboveShop?: number;
  /** Số Chuối yêu thương nhận được từ thiên thần khác lúc check-in trong 90 ngày (20 * 3 = 60 chuối) */
  minBananaCount?: number;
  /** Tỷ lệ chốt combo tự thân trên khách của mình duy trì (0.30 = 30%) */
  minSelfComboRate: number;
  /** Chỉ số hạnh phúc nội bộ HI (0.80 = 80% được đồng đội tin yêu, thả tim check-in) */
  minHappinessIndex: number;
  /** Tỷ lệ hoa hồng khi tư vấn giùm cho khách của CV khác khi FM vắng mặt (0.025 = 2.5%) */
  crossConsultCommissionRate: number;
  /** Tỷ lệ tip nhận được khi tư vấn giùm cho khách của CV khác (0.20 = 20% tip) */
  crossConsultTipRate?: number;
  /** Số ca tư vấn chéo dự kiến mỗi tháng cho CV khác (mặc định: 20 ca/tháng) */
  expectedCrossConsultOrdersPerMonth?: number;
  /** Số gói combo tư vấn chéo dự kiến chốt được cho khách của CV khác mỗi tháng (mặc định: 4 combo/tháng) */
  expectedCrossConsultCombosPerMonth?: number;
  /** Số biên bản vi phạm của HR hoặc QA/QC tối đa cho phép (0 = không được ăn biên bản) */
  maxDisciplinaryViolations: number;
  /** Tần suất tối thiểu mời QA/QC kiểm tra tác phong & phòng nối mi (lần/tuần, mặc định: 1) */
  minWeeklyQaAudits: number;
  /** Số lần kiểm định QA/QC tối thiểu trong 3 tháng qua (mặc định: 12 lần) */
  minQaAudits?: number;
  /** Bắt buộc không có bài kiểm tra QA/QC failed nào */
  requireZeroFailedAudits: boolean;
  /** Thời hạn thử thách tự tư vấn & dẫn dắt (ngày, mặc định: 30 ngày) */
  trialDurationDays?: number;
  /** Bật/tắt ải trùm cuối tự tư vấn duy trì */
  allowSelfConsultTrial?: boolean;
  /** Số cây dưỡng mi dự kiến bán mỗi tuần (mặc định: 4 cây/tuần) */
  expectedSerumsPerWeek?: number;
  /** Số gói combo dự kiến bán mỗi tháng (mặc định: 10 combo/tháng) */
  expectedCombosPerMonth?: number;
  /** Thưởng tiền tươi dưỡng mi giá gốc (1.100.000đ -> 100.000đ/cây) */
  serumOriginalPriceBonus?: number;
  /** Thưởng tiền tươi dưỡng mi giá khuyến mãi nhẹ < 50% (50.000đ/cây) */
  serumDiscountedPriceBonus?: number;
  /** Thưởng dưỡng mi giá giảm sâu >= 50% (1.000đ/cây) */
  serumDeepDiscountPriceBonus?: number;
  /** Thưởng dưỡng mi tặng kèm Free (1.000đ/cây) */
  serumFreePriceBonus?: number;
  /** Thưởng mốc nền cho tổng gói Combo < 2 triệu (mặc định: 50.000đ) */
  comboUnder2mBonus?: number;
  /** @deprecated Đã đơn giản hóa công thức theo Điều răn CV-002 v2.8.0 (<2M = 50K, mỗi 1M kế tiếp = +50K) */
  comboUnder3mBonus?: number;
  /** @deprecated Đã đơn giản hóa công thức theo Điều răn CV-002 v2.8.0 (<2M = 50K, mỗi 1M kế tiếp = +50K) */
  comboUnder4mBonus?: number;
  /** Thưởng cộng thêm cho mỗi 1 triệu kế tiếp từ mốc 2 triệu trở lên (mặc định: 50.000đ/1M) */
  comboStepPerMillionBonus?: number;
  /** Tỷ lệ chia hoa hồng cho CV làm mi khi CV++ chốt hộ (0.20 = 20%) */
  crossConsultCvShareRate?: number;
  /** Lương theo giờ áp dụng cho CV++ (mặc định: 29.500đ/h, tăng +4.000đ/h so với CV) */
  hourlyWage?: number;
  /** Tỷ lệ hưởng tip trên khách của mình (mặc định: 0.90 = 90%) */
  tipShareRatio?: number;
  /** Bật/tắt chế tài: nếu tỷ lệ combo < 20% thì không hưởng lương tăng thêm và thưởng bán hàng, chỉ giữ 20% tip tư vấn */
  enforceComboPenalty?: boolean;
}

export interface CvPlusPlusToFmRequirements {
  /** Số tháng tối thiểu ở vị trí CV++ (3 tháng) */
  minMonthsInRole: number;
  /** Số lượng Google Review 5 sao tối thiểu cần đạt trong 1 tháng (30 reviews/tháng) */
  minMonthlyGoogleReviews: number;
  /** Số biên bản vi phạm của HR hoặc QA/QC tối đa cho phép (0 = không được ăn biên bản) */
  maxDisciplinaryViolations: number;
  /** Yêu cầu kiểm tra kho, CSVC hàng tuần đảm bảo hoạt động ổn định */
  weeklyAuditRequired: boolean;
  /** Tỷ lệ bán combo toàn shop tối thiểu (0.25 = 25%) */
  minShopComboRate: number;
  /** Level năng suất trung bình tối thiểu */
  minAvgLevel?: number;
}

export type CcToFmRequirements = CvPlusPlusToFmRequirements;

export interface FmToChoRequirements {
  /** Số tháng liên tiếp chi nhánh đạt chỉ tiêu doanh thu */
  minTargetHitMonths: number;
  /** Nhiệm vụ dẫn dắt: giúp đỡ những nhân sự có chỉ số HI thấp trở nên cao hơn */
  helpLowHiStaffImprove: boolean;
  /** Tỷ lệ thất thoát/hư hỏng kho tối đa (0.005 = 0.5%) */
  maxInventoryLossRate: number;
  /** Điểm kiểm toán CSVC 5 giác quan (thang điểm 100) */
  minFacilityScore: number;
  /** Số lượng CHO tối đa cho phép trên mỗi chi nhánh (duy nhất 1 người/shop) */
  maxChoPerShop: number;
  /** Tỷ lệ chi phí vật tư tiêu hao tối đa cho phép trên doanh thu (0.05 = 5%) */
  maxConsumablesRate?: number;
  /** Hạn mức chi phí đón tiếp tối đa cho mỗi khách mới (20.000đ/khách) */
  maxWelcomeBudgetPerNewCustomer?: number;
  /** Biên lợi nhuận ròng tối thiểu của shop để mở khóa toàn bộ tiền thưởng quản lý (0.12 = 12%) */
  minShopNetMarginForBonus?: number;
  /** Tỷ lệ thưởng chia sẻ số tiền tiết kiệm chi phí vận hành cho FM & CHO (0.20 = 20%) */
  gainSharingRatio?: number;
  /** Điểm hòa vốn chi nhánh Đề Thám (DT: 450 triệu) */
  breakEvenRevenueDT?: number;
  /** Điểm hòa vốn chi nhánh Estella Place (EP: 350 triệu) */
  breakEvenRevenueEP?: number;
  /** Tỷ lệ thưởng trên phần doanh thu vượt mốc hòa vốn cho FM (0.02 = 2%) */
  fmIncrementalBonusRate?: number;
  /** Tiền thưởng mốc khi chi nhánh chạm điểm hòa vốn cho FM (2.000.000đ) */
  fmBreakEvenMilestoneBonus?: number;
  /** Tỷ lệ thưởng trên phần doanh thu vượt mốc hòa vốn cho CHO (0.03 = 3%) */
  choIncrementalBonusRate?: number;
  /** Tiền thưởng mốc khi chi nhánh chạm điểm hòa vốn cho CHO (3.000.000đ) */
  choBreakEvenMilestoneBonus?: number;
  /** Tiền thưởng chất lượng sàn và đánh giá CSVC 5 giác quan / Google Review 5★ (1.000.000đ) */
  fmFloorQualityBonus?: number;
}

export interface MaintenanceAndDemotionRules {
  cvPlus: {
    minSelfComboRate: number; // 0.20
    maxFixRate: number; // 0.03
    minHappinessIndex: number; // 0.65
    consecutiveFailedMonthsToDemote: number; // 2 tháng liên tiếp
  };
  cvPlusPlus: {
    minSelfComboRate: number; // 0.25
    minHappinessIndex: number; // 0.75
    consecutiveFailedMonthsToDemote: number; // 2 tháng liên tiếp
  };
}

export interface CompensationPackageConfig {
  hourlyWages: {
    cv: number; // 25.500đ/h
    cvPlus: number; // 27.500đ/h (+2K)
    cvPlusPlus: number; // 29.500đ - 30.000đ/h (+4K)
  };
  fmPackage: {
    baseSalary: number; // 6.500.000đ
    floorAllowance: number; // 1.500.000đ (Cố định 8M)
    breakEvenMilestoneBonus: number; // 2.000.000đ
    excessRevenueRate: number; // 0.02 (2%)
    floorQualityBonus: number; // 1.000.000đ
    gainSharingRatio: number; // 0.10 (10%)
  };
  choPackage: {
    baseSalary: number; // 11.000.000đ (Executive)
    breakEvenMilestoneBonus: number; // 3.000.000đ
    excessRevenueRate: number; // 0.03 (3%)
    newCustomerBonus: number; // 3.500.000đ
    newCustomerTarget: number; // 60
    gainSharingRatio: number; // 0.10 (10%)
    angelGrowthTiers: Array<{
      minQualifiedCount: number; // Số lượng Chuyên Viên đạt CV+/CV++
      bonus: number;
    }>;
  };
}

export interface ChoToBossRequirements {
  /** Số tháng liên tiếp chi nhánh có lợi nhuận P&L dương (6 tháng liền) */
  minProfitableMonths: number;
  /** Biên lợi nhuận ròng tối thiểu (0.15 = 15%) */
  minNetProfitMargin: number;
  /** Số lượng khách mới tối thiểu đến shop mỗi tháng (thực tế đo được thay cho NPS cảm tính) */
  minMonthlyNewCustomers: number;
  /** Chỉ số gắn kết nhân viên eNPS tối thiểu */
  minStaffEnps: number;
  /** Yêu cầu bắt buộc đào tạo nhân sự kế cận */
  requiredSuccessors: {
    fmCount: number;
    choCount: number;
  };
}

export interface CareerRewardRates {
  /** Số chuối vàng thưởng cho CV hỗ trợ ca Adjust ngắn <= 25p */
  bananaPerFALShort: number;
  /** Số chuối vàng thưởng cho CC hỗ trợ ca Adjust ngắn <= 25p */
  bananaPerFALCcShort: number;
  /** Mức tiền thưởng mỗi Level CC (đồng/level) */
  ccBonusRatePerLevel: number;
  /** Tỷ lệ chia tiền tip cho Chuyên viên Kỹ thuật (0.70 = 70%) */
  tipShareCvRatio: number;
  /** Tỷ lệ chia tiền tip cho Tư vấn viên (0.20 = 20%) */
  tipShareCcRatio: number;
  /** Tỷ lệ hưởng trọn tiền tip khi CV+/CV++ tự tư vấn và làm mi: 70% tip nối mi (CV) + 20% tip tư vấn (CC) = 90% */
  tipShareCvPlusSelfRatio?: number;
  /** Tỷ lệ tip tư vấn khi CV++ tư vấn chéo hộ cho CV khác (20%) */
  tipShareCrossConsultCcRatio?: number;
  /** Số chuối vàng cấp hàng tháng cho FM để thưởng nóng nhân viên */
  fmMonthlyBananaGrant: number;
}

export interface CareerProgressionConfig {
  version: string;
  updatedAt: string;
  updatedBy: string;
  cvToCvPlus: CvToCvPlusRequirements;
  cvPlusToCvPlusPlus: CvPlusToCvPlusPlusRequirements;
  cvPlusPlusToFm: CvPlusPlusToFmRequirements;
  fmToCho: FmToChoRequirements;
  choToBoss: ChoToBossRequirements;
  rewardRates: CareerRewardRates;
  compensation?: CompensationPackageConfig;
  maintenanceRules?: MaintenanceAndDemotionRules;
  // Aliases for backward compatibility:
  cvToCc: CvToCvPlusRequirements;
  ccToFm: CvPlusPlusToFmRequirements;
}
