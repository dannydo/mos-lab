export type CareerRole = 'CV' | 'CC' | 'FM' | 'CHO' | 'BOSS' | 'MASTER_TECH';

export type CareerProgressionStatus = 'IN_PROGRESS' | 'TRIAL_GATE' | 'QUALIFIED' | 'PROMOTED' | 'SPECIALIST_PATH';

export interface CvToCcRequirements {
  /** Số ca nối mi tối thiểu cần hoàn thành */
  minOrders: number;
  /** % Tip so với trung bình chi nhánh (0.0 = bằng hoặc cao hơn TB) */
  minTipRatioAboveShop: number;
  /** Tỷ lệ lỗi bảo hành rụng mi Fix tối đa (0.02 = 2.0%) */
  maxFixRate: number;
  /** Chỉ số hài lòng khách hàng Happiness Index tối thiểu (0.70 = 70%) */
  minHappinessIndex: number;
  /** Thời hạn thử thách tự tư vấn (ngày) */
  trialDurationDays: number;
  /** Tỷ lệ chốt combo tự thân tối thiểu trên tệp combo not live (0.20 = 20%) */
  minSelfComboRate: number;
  /** Bật/tắt ải trùm cuối tự tư vấn */
  allowSelfConsultTrial: boolean;
}

export interface CcToFmRequirements {
  /** Số tháng tối thiểu ở vị trí CC */
  minMonthsInRole: number;
  /** Level CC trung bình tối thiểu trong 3 tháng gần nhất */
  minAvgLevel: number;
  /** Tỷ lệ bán combo toàn shop tối thiểu (0.25 = 25%) */
  minShopComboRate: number;
  /** Điểm bài thi trắc nghiệm Quy trình Vận hành & Sàn (thang điểm 100) */
  minOpsExamScore: number;
  /** Điểm kiểm toán kiểm kê kho (thang điểm 100) */
  minInventoryAuditScore: number;
}

export interface FmToChoRequirements {
  /** Số tháng liên tiếp chi nhánh đạt chỉ tiêu doanh thu */
  minTargetHitMonths: number;
  /** Tỷ lệ thất thoát/hư hỏng kho tối đa (0.005 = 0.5%) */
  maxInventoryLossRate: number;
  /** Điểm kiểm toán CSVC 5 giác quan (thang điểm 100) */
  minFacilityScore: number;
  /** Điểm đánh giá văn hóa & lãnh đạo eNPS từ nhân viên */
  minStaffEnpsScore: number;
  /** Số lượng CHO tối đa cho phép trên mỗi chi nhánh */
  maxChoPerShop: number;
}

export interface ChoToBossRequirements {
  /** Số tháng liên tiếp chi nhánh có lợi nhuận P&L dương */
  minProfitableMonths: number;
  /** Biên lợi nhuận ròng tối thiểu (0.15 = 15%) */
  minNetProfitMargin: number;
  /** Chỉ số hài lòng khách hàng NPS tối thiểu */
  minCustomerNps: number;
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
  /** Tỷ lệ chia tiền tip cho Chuyên viên Kỹ thuật (0.80 = 80%) */
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
  version: '2026.1',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Init',
  cvToCc: {
    minOrders: 300,
    minTipRatioAboveShop: 0.0,
    maxFixRate: 0.02,
    minHappinessIndex: 0.7,
    trialDurationDays: 30,
    minSelfComboRate: 0.2,
    allowSelfConsultTrial: true,
  },
  ccToFm: {
    minMonthsInRole: 6,
    minAvgLevel: 10,
    minShopComboRate: 0.25,
    minOpsExamScore: 90,
    minInventoryAuditScore: 95,
  },
  fmToCho: {
    minTargetHitMonths: 3,
    maxInventoryLossRate: 0.005,
    minFacilityScore: 95,
    minStaffEnpsScore: 80,
    maxChoPerShop: 1,
  },
  choToBoss: {
    minProfitableMonths: 12,
    minNetProfitMargin: 0.15,
    minCustomerNps: 85,
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
    tipShareCvRatio: 0.8,
    tipShareCcRatio: 0.2,
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
