import type { CareerPeriod, CareerProgressionStatus, CareerRole } from './career-requirements.types.js';

export interface StaffHourlyProductivity {
  /** Tổng lượt làm mi hoàn tất trong kỳ (Full set + Dặm Combo + Dặm lẻ) */
  totalCompletedServices: number;
  /** Số lượt Full set (service_type = 'Normal') */
  fullSetCount: number;
  /** Số lượt Dặm Combo (service_type = 'Retain' & user_service_type = 'combo') */
  comboRetainCount: number;
  /** Số lượt Dặm lẻ (service_type = 'Retain' & user_service_type != 'combo') */
  singleRetainCount: number;
  /** Tổng thời gian làm việc thực tế trong kỳ (giờ công ca) */
  actualWorkingHours: number;
  /** Chỉ số Hiệu suất Giờ (SPH - Services Per Hour) = totalCompletedServices / actualWorkingHours */
  servicesPerHour: number;
  /** Tổng doanh thu dịch vụ làm mi hoàn tất trong kỳ (VNĐ) */
  serviceRevenue: number;
  /** Doanh thu phục vụ trên mỗi giờ công (Revenue Per Hour, VNĐ/giờ) */
  revenuePerHour: number;
  /** Nguồn giờ công sử dụng ('SHIFT' | 'PAYROLL' | 'NONE') */
  workingHoursSource?: 'SHIFT' | 'PAYROLL' | 'NONE';
}

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
  bananaBalance?: number;
  isBananaPassed?: boolean;
  ccLevel?: number | null;
  monthlyPoints?: number | null;
  qaAuditPassed?: boolean;
  hasFailedQaAudit?: boolean;
  weeklyQaAuditRate?: number;
  qaAuditsCount?: number;
  storeId?: number;
  branchName?: string;
  branchCode?: string;
  branchTipRate?: number;
  branchAvgTip?: number;
  period?: CareerPeriod;
  targetOrders?: number;
  servicesPerHour?: number;
  revenuePerHour?: number;
  actualWorkingHours?: number;
  totalCompletedServices?: number;
  fullSetCount?: number;
  comboRetainCount?: number;
  singleRetainCount?: number;
  serviceRevenue?: number;
  productivity?: StaffHourlyProductivity;
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
  period?: CareerPeriod;
  targetOrders?: number;
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
    storeId?: number;
    branchName?: string;
    branchCode?: string;
    branchTipRate?: number;
    branchAvgTip?: number;
    period?: CareerPeriod;
    targetOrders?: number;
    periodOrders?: number;
    targetTipRate?: number;
    tippedOrdersCount?: number;
    happinessIndex: number;
    happyCount?: number;
    totalHi?: number;
    bananaCount?: number;
    bananaBalance?: number;
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
    servicesPerHour?: number;
    revenuePerHour?: number;
    actualWorkingHours?: number;
    totalCompletedServices?: number;
    serviceRevenue?: number;
    productivity?: StaffHourlyProductivity;
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
      wageGain?: number;
      tipGain?: number;
      comboGain?: number;
      monthlyEstimatedHours?: number;
      actualWorkingHours?: number;
      monthlyTipAvg?: number;
      actualTipReceived?: number;
      customerTotalTip?: number;
      monthlySelfComboRev?: number;
      predictedComboCount?: number;
      potentialComboCustomers?: number;
      avgComboPrice?: number;
      serumCommissionAmount?: number;
      minComboRequired?: number;
      expectedSerumsPerWeek?: number;
      expectedSerumsPerMonth?: number;
      serumCommissionPerItem?: number;
      monthlySerumIncome?: number;
      expectedCombosPerMonth?: number;
      crossConsultTipRate?: number;
      crossConsultTipAmount?: number;
      expectedCrossConsultOrdersPerMonth?: number;
      crossConsultCommissionRate?: number;
      crossConsultComboAmount?: number;
      expectedCrossConsultCombosPerMonth?: number;
      singleComboBonus?: number;
      serumOriginalPriceBonus?: number;
      serumDiscountedPriceBonus?: number;
      serumDeepDiscountPriceBonus?: number;
      serumFreePriceBonus?: number;
      crossConsultCvShareRate?: number;
      crossConsultCvSharedAmount?: number;
      currentGrossIncome?: number;
      currentNetIncome?: number;
      payrollBonusAmount?: number;
      socialSecurityAmount?: number;
      payrollWageAmount?: number;
      payrollTipAmount?: number;
      payrollAllowanceAmount?: number;
      payrollWorkingHours?: number;
      payrollHourlyRate?: number;
      payrollDate?: string | null;
      payrollMonthLabel?: string | null;
    };
  };
  lastSyncedAt?: string;
}

/**
 * Phân loại nguồn giao dịch Chuối
 */
export type BananaTransactionCategory =
  'ALL' | 'CHECKIN' | 'GIVE_AWAY_RECEIVED' | 'GIVE_AWAY_SENT' | 'SHIFT' | 'REWARD' | 'OTHER';

/**
 * Chi tiết một giao dịch Chuối
 */
export interface BananaTransactionItem {
  id: string | number;
  dateCreated: string;
  amount: number;
  balance: number;
  type: string;
  category: BananaTransactionCategory;
  title: string;
  description?: string | null;
  giveAway?: {
    id: number;
    direction: 'RECEIVED' | 'SENT';
    otherUserId: number;
    otherStaffName: string;
    otherAvatarUrl?: string;
    message?: string | null;
    isCheckin?: boolean;
    ruleType?: string;
  } | null;
}

/**
 * Dữ liệu trả về cho lịch sử sao kê Chuối của nhân sự
 */
export interface BananaTransactionResponse {
  currentBalance: number;
  totalReceivedGiveAway: number;
  totalSentGiveAway: number;
  countReceivedGiveAway: number;
  countSentGiveAway: number;
  countCheckin?: number;
  totalCheckinAmount?: number;
  transactions: BananaTransactionItem[];
}

/**
 * Chi tiết đơn chốt gói Combo của Chuyên Viên (tự động gộp tổng tiền khi khách mua 2 gói cùng lúc trong 1 đơn order_id)
 */
export interface CvPlusComboDetail {
  orderId: number;
  orderCode?: string;
  orderDate: string;
  customerName?: string;
  comboName?: string;
  price: number;
  bonus: number;
  comboCount?: number;
  comboItems?: Array<{ comboName: string; price: number }>;
}

/**
 * Snapshot kết quả tính toán chi tiết quyền lợi CV+ (lương giờ tăng, 90% tip, thưởng combo bậc thang)
 */
export interface CvPlusRewardSnapshot {
  staffId: number;
  staffName?: string;
  staffPhone?: string;
  branchId?: number;
  branchName?: string;
  month: string; // YYYY-MM
  totalOrders: number;
  workingDays: number;
  workingHours: number;
  comboLiveOrders: number;
  notComboLiveOrders: number;
  comboSoldCount: number;
  selfComboRate: number; // 0.209 = 20.9%
  isTargetHit: boolean; // selfComboRate >= 0.20
  isPenalized: boolean; // !isTargetHit
  baseWageCv: number;
  baseWageCvPlus: number;
  tipCv: number;
  tipCvPlus: number;
  comboBonusTotal: number;
  productBonusTotal: number;
  totalCvIncome: number;
  totalCvPlusIncome: number;
  deltaGain: number;
  deltaPercentage: number;
  comboDetails: CvPlusComboDetail[];
}

/**
 * Dữ liệu trả về cho bản tóm tắt mô phỏng toàn bộ Chuyên Viên trong tháng
 */
export interface CvPlusSimulationSummaryResponse {
  month: string;
  totalStaffCount: number;
  qualifiedCount: number;
  penalizedCount: number;
  totalAdditionalPayout: number;
  items: CvPlusRewardSnapshot[];
}
