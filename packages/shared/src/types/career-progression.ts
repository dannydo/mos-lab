export type CareerRole = 'CV' | 'CC' | 'FM' | 'CHO' | 'BOSS' | 'MASTER_TECH';

export type CareerProgressionStatus = 'IN_PROGRESS' | 'TRIAL_GATE' | 'QUALIFIED' | 'PROMOTED' | 'SPECIALIST_PATH';

export interface CvToCcRequirements {
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
  /** Số biên bản vi phạm QA/QC tối đa cho phép (0 = nếu bị 1 biên bản là FAILED ngay) */
  maxDisciplinaryViolations: number;
  /** Thời hạn thử thách tự tư vấn (ngày) */
  trialDurationDays: number;
  /** Tỷ lệ chốt combo tự thân tối thiểu trên tệp khách của chính mình (0.25 = 25%) */
  minSelfComboRate: number;
  /** Bật/tắt ải trùm cuối tự tư vấn */
  allowSelfConsultTrial: boolean;
}

export interface CcToFmRequirements {
  /** Số tháng tối thiểu ở vị trí CC (3 tháng) */
  minMonthsInRole: number;
  /** Số lượng Google Review 5 sao tối thiểu cần đạt trong 1 tháng (30 reviews/tháng) */
  minMonthlyGoogleReviews: number;
  /** Số biên bản vi phạm của HR hoặc QA/QC tối đa cho phép (0 = không được ăn biên bản) */
  maxDisciplinaryViolations: number;
  /** Yêu cầu kiểm tra kho, CSVC hàng tuần đảm bảo hoạt động ổn định */
  weeklyAuditRequired: boolean;
  /** Tỷ lệ bán combo toàn shop tối thiểu (0.25 = 25%) */
  minShopComboRate: number;
  /** Level CC trung bình tối thiểu (tùy chọn theo dõi năng suất) */
  minAvgLevel?: number;
}

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
  /** Số chuối vàng cấp hàng tháng cho FM để thưởng nóng nhân viên */
  fmMonthlyBananaGrant: number;
}

export interface CareerProgressionConfig {
  version: string;
  updatedAt: string;
  updatedBy: string;
  cvToCc: CvToCcRequirements;
  ccToFm: CcToFmRequirements;
  fmToCho: FmToChoRequirements;
  choToBoss: ChoToBossRequirements;
  rewardRates: CareerRewardRates;
}

export const DEFAULT_CAREER_PROGRESSION_CONFIG: CareerProgressionConfig = {
  version: '2026.2',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Update',
  cvToCc: {
    minOrders: 300,
    minConsecutiveMonths: 3,
    minTipRatioAboveShop: 0.1, // 10% cao hơn trung bình shop
    maxFixRate: 0.02,
    minHappinessIndex: 0.7, // Hệ thống HI tối thiểu 70% từ check-in thả tim
    maxDisciplinaryViolations: 0, // Bị 1 biên bản QA/QC là failed
    trialDurationDays: 30,
    minSelfComboRate: 0.25, // CV tự tư vấn khách của mình tối thiểu 25%
    allowSelfConsultTrial: true,
  },
  ccToFm: {
    minMonthsInRole: 3, // 3 tháng
    minMonthlyGoogleReviews: 30, // Tối thiểu 30 Google Review/tháng
    maxDisciplinaryViolations: 0, // Không bị biên bản HR hoặc QA/QC
    weeklyAuditRequired: true, // Kiểm tra kho & CSVC hàng tuần
    minShopComboRate: 0.25,
    minAvgLevel: 10,
  },
  fmToCho: {
    minTargetHitMonths: 3,
    helpLowHiStaffImprove: true, // Giúp đỡ người có HI thấp lên cao hơn
    maxInventoryLossRate: 0.005, // Hao hụt kho tối đa 0.5%
    minFacilityScore: 95,
    maxChoPerShop: 1,
    maxConsumablesRate: 0.05, // Vật tư tối đa 5% doanh thu (Danny chốt 5%)
    maxWelcomeBudgetPerNewCustomer: 20000, // Định mức đón khách mới max 20K/khách
    minShopNetMarginForBonus: 0.12, // Lãi tiệm >= 12% mới mở khóa thưởng quản lý
    gainSharingRatio: 0.2, // Thưởng 20% chi phí tiết kiệm được
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
    fmMonthlyBananaGrant: 500,
  },
};

export interface StaffCareerStatus {
  staffId: number;
  staffName: string;
  currentRole: CareerRole;
  targetRole: CareerRole;
  status: CareerProgressionStatus;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  metrics: {
    ordersCount: number;
    tipRatioAboveShop: number;
    fixRate: number;
    happinessIndex: number;
    selfComboRate?: number | null;
    monthsInRole: number;
    avgCcLevel?: number | null;
  };
  qualifiedQuests: {
    foundationCompleted: boolean;
    bossTrialCompleted: boolean;
    allPassed: boolean;
  };
  recommendedAction: 'CONTINUE_TRAINING' | 'START_TRIAL' | 'PROMOTE' | 'MASTER_TECH_PATH';
}
