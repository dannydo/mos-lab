export type CareerRole = 'CV' | 'CV_PLUS' | 'CV_PLUS_PLUS' | 'FM' | 'CHO' | 'BOSS' | 'MASTER_TECH' | 'CC';

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
  /** Số Chuối vàng tối thiểu cần có (> 0, mặc định: 1) */
  minBananaCount: number;
  /** Số biên bản vi phạm QA/QC tối đa cho phép (0 = nếu bị 1 biên bản là FAILED ngay) */
  maxDisciplinaryViolations: number;
  /** Tần suất tối thiểu mời QA/QC kiểm tra tác phong cá nhân & phòng nối mi (lần/tuần, mặc định: 1) */
  minWeeklyQaAudits: number;
  /** Bắt buộc tất cả bài kiểm tra QA/QC phải ĐẠT (nếu failed 1 bài thì KHÔNG được nâng cấp) */
  requireZeroFailedAudits: boolean;
  /** Thời hạn thử thách tự tư vấn (ngày) */
  trialDurationDays: number;
  /** Tỷ lệ chốt combo tự thân tối thiểu trên tệp khách của chính mình (0.25 = 25%) */
  minSelfComboRate: number;
  /** Bật/tắt ải trùm cuối tự tư vấn */
  allowSelfConsultTrial: boolean;
}

export type CvToCcRequirements = CvToCvPlusRequirements;

export interface CvPlusToCvPlusPlusRequirements {
  /** Số tháng tối thiểu ở vị trí CV+ (2 tháng) */
  minMonthsInCvPlus: number;
  /** Tỷ lệ chốt combo tự thân trên khách của mình duy trì (0.30 = 30%) */
  minSelfComboRate: number;
  /** Chỉ số hạnh phúc nội bộ HI (0.80 = 80% được đồng đội tin yêu, thả tim check-in) */
  minHappinessIndex: number;
  /** Tỷ lệ hoa hồng khi tư vấn giùm cho khách của CV khác khi FM vắng mặt (0.025 = 2.5%) */
  crossConsultCommissionRate: number;
  /** Số biên bản vi phạm của HR hoặc QA/QC tối đa cho phép (0 = không được ăn biên bản) */
  maxDisciplinaryViolations: number;
  /** Tần suất tối thiểu mời QA/QC kiểm tra tác phong & phòng nối mi (lần/tuần, mặc định: 1) */
  minWeeklyQaAudits: number;
  /** Bắt buộc không có bài kiểm tra QA/QC failed nào */
  requireZeroFailedAudits: boolean;
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
      minQualifiedCount: number; // Số lượng thợ đạt CV+/CV++
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

const DEFAULT_CV_TO_CV_PLUS: CvToCvPlusRequirements = {
  minOrders: 300,
  minConsecutiveMonths: 3,
  minTipRatioAboveShop: 0.1, // 10% cao hơn trung bình shop
  maxFixRate: 0.02,
  minHappinessIndex: 0.7, // Hệ thống HI tối thiểu 70% từ check-in thả tim
  minBananaCount: 1, // Chuối vàng > 0
  maxDisciplinaryViolations: 0, // Bị 1 biên bản QA/QC là failed
  minWeeklyQaAudits: 1, // Tối thiểu 1 lần/tuần mời QA/QC kiểm tra tác phong & phòng mi
  requireZeroFailedAudits: true, // Nếu có bài kiểm tra failed -> KHÔNG được nâng cấp
  trialDurationDays: 30,
  minSelfComboRate: 0.25, // CV tự tư vấn khách của mình tối thiểu 25%
  allowSelfConsultTrial: true,
};

const DEFAULT_CV_PLUS_TO_CV_PLUS_PLUS: CvPlusToCvPlusPlusRequirements = {
  minMonthsInCvPlus: 2, // 2 tháng ở vị trí CV+
  minSelfComboRate: 0.3, // Tự chốt combo khách mình >= 30%
  minHappinessIndex: 0.8, // Đồng đội tin yêu HI >= 80%
  crossConsultCommissionRate: 0.025, // 2.5% hoa hồng tư vấn giùm khách của CV khác khi FM vắng
  maxDisciplinaryViolations: 0,
  minWeeklyQaAudits: 1,
  requireZeroFailedAudits: true,
};

const DEFAULT_CV_PLUS_PLUS_TO_FM: CvPlusPlusToFmRequirements = {
  minMonthsInRole: 3, // 3 tháng
  minMonthlyGoogleReviews: 30, // Tối thiểu 30 Google Review/tháng
  maxDisciplinaryViolations: 0, // Không bị biên bản HR hoặc QA/QC
  weeklyAuditRequired: true, // Kiểm tra kho & CSVC hàng tuần
  minShopComboRate: 0.25,
  minAvgLevel: 10,
};

export const DEFAULT_CAREER_PROGRESSION_CONFIG: CareerProgressionConfig = {
  version: '2026.4',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Update',
  cvToCvPlus: DEFAULT_CV_TO_CV_PLUS,
  cvPlusToCvPlusPlus: DEFAULT_CV_PLUS_TO_CV_PLUS_PLUS,
  cvPlusPlusToFm: DEFAULT_CV_PLUS_PLUS_TO_FM,
  cvToCc: DEFAULT_CV_TO_CV_PLUS,
  ccToFm: DEFAULT_CV_PLUS_PLUS_TO_FM,
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
      minSelfComboRate: 0.25, // Duy trì tự chốt combo >= 25%
      minHappinessIndex: 0.75, // HI đồng đội tin yêu >= 75%
      consecutiveFailedMonthsToDemote: 2, // 2 tháng liên tiếp không đạt -> tụt về CV+
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

export interface CareerStaffSummary {
  id: number;
  displayName: string;
  username: string;
  role: string;
  careerRole: CareerRole;
  avatarUrl?: string | null;
  legacyStaffId?: number | null;
  ordersCount: number;
  fixRate: number;
  totalTip: number;
  tipRatioAboveShop: number;
  staffTipRate?: number;
  shopTipRate?: number;
  selfComboRate: number;
  happinessIndex: number;
  bananaCount?: number;
  isBananaPassed?: boolean;
  ccLevel?: number | null;
  monthlyPoints?: number | null;
  qaAuditPassed?: boolean;
  hasFailedQaAudit?: boolean;
  weeklyQaAuditRate?: number;
}

export interface StaffCareerStatus {
  staffId: number;
  staffName: string;
  avatarUrl?: string | null;
  currentRole: CareerRole;
  targetRole: CareerRole;
  status: CareerProgressionStatus;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  metrics: {
    ordersCount: number;
    fixCount?: number;
    fixRate: number;
    totalTip?: number;
    tipRatioAboveShop: number;
    shopAvgTip?: number;
    staffAvgTip?: number;
    staffTipRate?: number;
    shopTipRate?: number;
    targetTipRate?: number;
    tippedOrdersCount?: number;
    happinessIndex: number;
    bananaCount?: number;
    isBananaPassed?: boolean;
    selfComboCount?: number;
    selfComboRate?: number | null;
    monthsInRole: number;
    avgCcLevel?: number | null;
    monthlyPoints?: number | null;
    ccBonusCash?: number | null;
    ccTipShare?: number | null;
    totalVisits?: number | null;
    facilityScore?: number | null;
    inventoryLossRate?: number | null;
    googleReviewsCount?: number | null;
    qaAudit?: {
      totalAudits: number;
      requiredAudits: number;
      passedAudits: number;
      failedAudits: number;
      weeklyAuditRate: number;
      hasFailedAudit: boolean;
      lastAuditDate?: string | null;
      isPassed: boolean;
      latestResult?: 'PASSED' | 'FAILED' | 'PENDING';
      details?: {
        groomingPassed: boolean;
        lashRoomPassed: boolean;
      };
    };
  };
  qualifiedQuests: {
    foundationCompleted: boolean;
    bossTrialCompleted: boolean;
    qaAuditCompleted: boolean;
    allPassed: boolean;
  };
  recommendedAction: 'CONTINUE_TRAINING' | 'START_TRIAL' | 'PROMOTE' | 'MASTER_TECH_PATH';
  earningsSimulation?: {
    currentEstimatedIncome: number;
    nextTierEstimatedIncome: number;
    incomeGain: number;
    details: {
      hourlyWageCurrent: number;
      hourlyWageNext: number;
      tipShareCurrent: number;
      tipShareNext: number;
      comboCommissionCurrent: number;
      comboCommissionNext: number;
    };
  };
  lastSyncedAt?: string;
}
