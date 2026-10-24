/**
 * Khung Năng Lực Telesale / Booking (Wings Lashes)
 * Reference: MOS-FEAT-133
 */

export type TelesaleTier = 'FRESHER' | 'JUNIOR' | 'MID_LEVEL' | 'SENIOR';

export interface TelesaleTierConfigItem {
  tier: TelesaleTier;
  label: string;
  shortLabel: string;
  minTenureMonths: number;
  passingScore: number;
  consecutiveMonthsRequired: number; // N tháng liên tiếp đạt điểm chuẩn để thăng lên bậc kế tiếp
  demotionConsecutiveFailMonths: number; // Số tháng liên tiếp trượt để cảnh báo / giáng bậc (thường là 2)
  badgeColor: string;
  description: string;
  nextTier?: TelesaleTier;
}

export const TELESALE_TIER_CONFIG: Record<TelesaleTier, TelesaleTierConfigItem> = {
  FRESHER: {
    tier: 'FRESHER',
    label: 'Fresher Booker',
    shortLabel: 'Fresher (0m)',
    minTenureMonths: 0,
    passingScore: 70,
    consecutiveMonthsRequired: 2, // Fresher -> Junior cần 2 tháng liên tiếp
    demotionConsecutiveFailMonths: 2,
    badgeColor: 'blue',
    description: 'Tư vấn viên mới gia nhập, hoàn thành đào tạo ban đầu và nắm vững kịch bản gọi cơ bản.',
    nextTier: 'JUNIOR',
  },
  JUNIOR: {
    tier: 'JUNIOR',
    label: 'Junior Booker',
    shortLabel: 'Junior (2m+)',
    minTenureMonths: 2,
    passingScore: 75,
    consecutiveMonthsRequired: 3, // Junior -> Mid-level cần 3 tháng liên tiếp
    demotionConsecutiveFailMonths: 2,
    badgeColor: 'cyan',
    description: 'Tư vấn viên đạt độ ổn định về năng suất gọi, xử lý từ chối cơ bản và chốt lịch hẹn vững vàng.',
    nextTier: 'MID_LEVEL',
  },
  MID_LEVEL: {
    tier: 'MID_LEVEL',
    label: 'Mid-level Booker',
    shortLabel: 'Mid-level (6m+)',
    minTenureMonths: 6,
    passingScore: 80,
    consecutiveMonthsRequired: 3, // Mid-level -> Senior cần 3 tháng liên tiếp
    demotionConsecutiveFailMonths: 2,
    badgeColor: 'gold',
    description: 'Chuyên viên tư vấn xuất sắc, đọc vị khách hàng tinh tế, tỷ lệ Done/Book cao và chuyển đổi đều đặn.',
    nextTier: 'SENIOR',
  },
  SENIOR: {
    tier: 'SENIOR',
    label: 'Senior Booker',
    shortLabel: 'Senior (12m+)',
    minTenureMonths: 12,
    passingScore: 85,
    consecutiveMonthsRequired: 3,
    demotionConsecutiveFailMonths: 2,
    badgeColor: 'purple',
    description: 'Bậc thầy Telesale/Booking, dẫn dắt đội ngũ, xử lý các tình huống khó khăn và đạt hiệu suất cao.',
  },
};

export type TelesaleSkillKey =
  | 'KN01'
  | 'KN02'
  | 'KN03'
  | 'KN04'
  | 'KN05'
  | 'KN06'
  | 'KN07'
  | 'KN08'
  | 'KN09';

export interface TelesaleSkillDefinition {
  key: TelesaleSkillKey;
  code: string;
  name: string;
  category: string;
  description: string;
  evaluationCriteria: string;
  maxScore: number; // Mặc định 5 điểm
}

export const TELESALE_SKILL_DEFINITIONS: Record<TelesaleSkillKey, TelesaleSkillDefinition> = {
  KN01: {
    key: 'KN01',
    code: 'KN01',
    name: 'Giao tiếp',
    category: 'Phong thái & Giọng nói',
    description: 'Tone giọng truyền cảm, nhịp điệu vừa phải, phát âm rõ ràng, phong thái chuyên nghiệp qua điện thoại.',
    evaluationCriteria: 'Nói năng lưu loát, lịch thiệp, không ậm ừ, kiểm soát âm lượng và giữ năng lượng tích cực.',
    maxScore: 5,
  },
  KN02: {
    key: 'KN02',
    code: 'KN02',
    name: 'Đọc vị KH',
    category: 'Thấu hiểu khách hàng',
    description: 'Nhận biết nhóm tính cách (DISC), nhu cầu làm đẹp ngầm, gu thẩm mỹ và rào cản tâm lý của từng khách.',
    evaluationCriteria: 'Bắt đúng tần số khách, đồng cảm chân thành và điều chỉnh phong cách tiếp cận phù hợp.',
    maxScore: 5,
  },
  KN03: {
    key: 'KN03',
    code: 'KN03',
    name: 'Khai thác thông tin',
    category: 'Kỹ năng đặt câu hỏi',
    description: 'Đặt câu hỏi mở tinh tế về lịch sử làm mi, thói quen sinh hoạt, dịp đặc biệt sắp tới để tư vấn đúng nhu cầu.',
    evaluationCriteria: 'Không tra khảo dồn dập, ghi chú hồ sơ CRM chi tiết, đầy đủ insight khách hàng.',
    maxScore: 5,
  },
  KN04: {
    key: 'KN04',
    code: 'KN04',
    name: 'Xử lý linh hoạt',
    category: 'Điều phối & Xoay xở',
    description: 'Khéo léo điều phối slot khi chi nhánh kín lịch, gợi ý khung giờ vàng hoặc chi nhánh thuận tiện khác.',
    evaluationCriteria: 'Chủ động đưa ra 2 giải pháp thay thế, giữ chân khách không để rớt lịch.',
    maxScore: 5,
  },
  KN05: {
    key: 'KN05',
    code: 'KN05',
    name: 'Chốt Sale / Booking',
    category: 'Kỹ thuật chốt lịch',
    description: 'Kỹ thuật chốt giả định, tạo sự khan hiếm chỗ đẹp, thúc đẩy khách xác nhận lịch và đặt cọc.',
    evaluationCriteria: 'Tự tin đưa ra lời đề nghị chốt hẹn rõ ràng, dứt khoát và ấn định thời gian cụ thể.',
    maxScore: 5,
  },
  KN06: {
    key: 'KN06',
    code: 'KN06',
    name: 'Xử lý từ chối',
    category: 'Vượt qua phản đối',
    description: 'Xử lý êm thắm các lý do từ chối: chê xa, bận, giá cao, sợ rụng mi thật, sợ đau, phân vân hỏi ý kiến người thân.',
    evaluationCriteria: 'Cô lập lý do từ chối, giải thích thấu đáo bằng giá trị vượt trội của Wings.',
    maxScore: 5,
  },
  KN07: {
    key: 'KN07',
    code: 'KN07',
    name: 'Cảm xúc tích cực',
    category: 'Kiên định & Năng lượng',
    description: 'Giữ vững sự ân cần, nhẫn nại, không nản lòng hay cáu gắt khi bị khách cúp máy hoặc từ chối phũ phàng.',
    evaluationCriteria: 'Luôn giữ tâm thế phục vụ biết ơn, hồi phục năng lượng nhanh chóng sau cuộc gọi khó.',
    maxScore: 5,
  },
  KN08: {
    key: 'KN08',
    code: 'KN08',
    name: 'Kế hoạch & Thời gian',
    category: 'Kỷ luật công việc',
    description: 'Quản lý data lead khoa học, follow-up đúng giờ đã hẹn, không bỏ sót khách tiềm năng.',
    evaluationCriteria: 'Phân loại tệp data thông minh, gọi đúng khung giờ vàng, hoàn thành chỉ tiêu cuộc gọi ngày.',
    maxScore: 5,
  },
  KN09: {
    key: 'KN09',
    code: 'KN09',
    name: 'Tự học & Đổi mới',
    category: 'Phát triển bản thân',
    description: 'Chủ động nghe lại cuộc gọi của mình và đồng đội xuất sắc, cập nhật dáng mi mới, kịch bản mới.',
    evaluationCriteria: 'Cầu thị lắng nghe phản hồi của Quản lý, tích cực áp dụng cải tiến vào thực chiến.',
    maxScore: 5,
  },
};

/**
 * Trụ cột A: Hiệu suất công việc (Trọng số 40% - Hệ thống tự động tính)
 */
export interface TelesalePillarAMetrics {
  // 1. KPI Book & Done
  bookCount: number;
  bookTarget: number;
  bookAchievementRate: number; // 1.0 = 100%
  doneCount: number;
  doneTarget: number;
  doneAchievementRate: number;

  // 2. Phát triển khách hàng mới (Khách mới Done)
  newCustomersDone: number;
  newCustomersTarget: number;
  newCustomersAchievementRate: number;

  // 3. Doanh thu thực tế (từ khách Done)
  actualRevenue: number;
  revenueTarget: number;
  revenueAchievementRate: number;

  // 4. Tỷ lệ chuyển đổi
  conversionDoneBookRate: number; // Done / Book
  conversionBookCallRate: number; // Book / Connected Calls
  conversionScore: number; // Điểm quy đổi (0-10)

  // 5. Năng suất gọi
  totalCalls: number;
  connectedCalls: number;
  callsTarget: number;
  connectedTarget: number;
  callProductivityScore: number; // Điểm quy đổi (0-10)

  // Ngày làm việc thực tế & pacing
  actualWorkingDays: number;
  standardWorkingDays: number;
  pacingFactor: number; // actualWorkingDays / standardWorkingDays

  // Tổng điểm Trụ cột A (Thang 40 điểm, có thưởng vượt KPI trần tối đa 48đ)
  rawScore: number;
  cappedScore: number; // Max 48 điểm (120% của 40đ)
  weightPercentage: 40;
}

/**
 * Trụ cột B: Kỹ năng nghiệp vụ (Trọng số 25% - Quản lý chấm)
 */
export interface TelesaleSkillRatingItem {
  score: number; // 1 to 5
  notes?: string;
}

export interface TelesalePillarBMetrics {
  skills: Record<TelesaleSkillKey, TelesaleSkillRatingItem>;
  averageSkillScore: number; // 1.0 to 5.0
  totalScore: number; // (average / 5) * 25 (Thang 25 điểm)
  weightPercentage: 25;
}

/**
 * Trụ cột C: Chất lượng công việc (Trọng số 20% - Hệ thống + Quản lý)
 */
export interface TelesalePillarCMetrics {
  crmRecordErrorCount: number; // Số lỗi nhập liệu CRM
  callProcedureViolations: number; // Lỗi quy trình gọi / quên note
  callAuditScore: number; // Điểm kiểm toán cuộc gọi (0-10)
  cancellationRate: number; // Tỷ lệ huỷ hẹn
  managerQualityScore: number; // Quản lý chấm (0-20)
  totalScore: number; // Max 20 điểm
  notes?: string;
  weightPercentage: 20;
}

/**
 * Trụ cột D: Kỷ luật & Thái độ (Trọng số 15% - Hệ thống + Quản lý)
 */
export interface TelesalePillarDMetrics {
  lateArrivalCount: number; // Số lần đi trễ
  unexcusedAbsenceCount: number; // Số lần nghỉ không phép
  workplaceConductScore: number; // Tác phong nội quy (0-10)
  managerAttitudeScore: number; // Quản lý chấm (0-15)
  mandatoryEvidenceUrl?: string; // Bắt buộc có minh chứng
  evidenceNotes?: string; // Ghi chú minh chứng sự vụ
  totalScore: number; // Max 15 điểm
  weightPercentage: 15;
}

export type TelesaleRuleEngineStatus =
  | 'NORMAL' // Duy trì bình thường
  | 'PROMOTION_READY' // Đủ điều kiện thăng bậc (đủ thâm niên + đủ N tháng đạt chuẩn)
  | 'WARNING_M1' // Cảnh báo tháng 1 (không đạt điểm chuẩn)
  | 'DEMOTION_FLAGGED'; // Đề xuất giáng bậc (2 tháng liên tiếp không đạt)

export interface TelesalePromotionHistoryItem {
  id: string;
  action: 'PROMOTED' | 'DEMOTED' | 'RETAINED';
  fromTier: TelesaleTier;
  toTier: TelesaleTier;
  decidedByStaffId?: number;
  decidedByName: string;
  decidedAt: string;
  reason: string;
  effectiveMonth: string;
}

/**
 * Hồ sơ đánh giá khung năng lực đầy đủ của 1 Telesale trong 1 tháng
 */
export interface TelesaleCompetencyEvaluation {
  id: string;
  month: string; // YYYY-MM
  staffId: number;
  legacyStaffId?: number;
  staffName: string;
  avatarUrl?: string;

  currentTier: TelesaleTier;
  tenureMonths: number;
  startDate?: string;

  pillarA: TelesalePillarAMetrics;
  pillarB: TelesalePillarBMetrics;
  pillarC: TelesalePillarCMetrics;
  pillarD: TelesalePillarDMetrics;

  totalScore: number; // A + B + C + D (thang 100)
  passingScore: number; // Điểm chuẩn cấp bậc hiện tại
  isPassed: boolean;

  consecutivePassMonths: number; // Số tháng liên tiếp đạt chuẩn thăng cấp
  consecutiveFailMonths: number; // Số tháng liên tiếp trượt chuẩn giáng cấp
  ruleEngineStatus: TelesaleRuleEngineStatus;
  recommendedTier?: TelesaleTier;

  evaluatedByStaffId?: number;
  evaluatedByName?: string;
  evaluatedAt?: string;
  updatedAt?: string;

  promotionHistory?: TelesalePromotionHistoryItem[];
}

/**
 * Dòng tổng hợp trong Ma Trận Năng Lực Toàn Đội
 */
export interface TelesaleCompetencyMatrixRow {
  staffId: number;
  legacyStaffId?: number;
  staffName: string;
  avatarUrl?: string;
  currentTier: TelesaleTier;
  tenureMonths: number;
  month: string;

  scoreA: number; // 40%
  scoreB: number; // 25%
  scoreC: number; // 20%
  scoreD: number; // 15%
  totalScore: number; // 100%

  isPassed: boolean;
  consecutivePassMonths: number;
  consecutiveFailMonths: number;
  ruleEngineStatus: TelesaleRuleEngineStatus;
  hasEvaluated: boolean;
  evaluatedAt?: string;
}

/**
 * Cấu hình toàn cục cho Khung Năng Lực Telesale
 */
export interface TelesaleCompetencyGlobalConfig {
  tiers: Record<TelesaleTier, TelesaleTierConfigItem>;
  pillarAWeights: {
    bookDoneWeight: number; // ví dụ 0.30
    newCustomerWeight: number; // ví dụ 0.20
    revenueWeight: number; // ví dụ 0.20
    conversionWeight: number; // ví dụ 0.15
    callProductivityWeight: number; // ví dụ 0.15
  };
  maxOverflowBonusRate: number; // 1.20 = 120% (thưởng tối đa 48 điểm cho Trụ cột A)
  defaultStandardWorkingDays: number; // 26 ngày
}

export const DEFAULT_TELESALE_COMPETENCY_CONFIG: TelesaleCompetencyGlobalConfig = {
  tiers: TELESALE_TIER_CONFIG,
  pillarAWeights: {
    bookDoneWeight: 0.3,
    newCustomerWeight: 0.2,
    revenueWeight: 0.2,
    conversionWeight: 0.15,
    callProductivityWeight: 0.15,
  },
  maxOverflowBonusRate: 1.2,
  defaultStandardWorkingDays: 26,
};

/**
 * ------------------------------------------------------------------
 * Cấu hình Khung Năng Lực Nâng Cao & Quản Lý Phiên Bản (MOS-FEAT-142)
 * ------------------------------------------------------------------
 */

export type TelesaleLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface TelesalePillarsWeightConfig {
  pillarAWeight: number; // Mặc định 40 (Hiệu suất công việc)
  pillarBWeight: number; // Mặc định 25 (Kỹ năng nghiệp vụ)
  pillarCWeight: number; // Mặc định 20 (Chất lượng công việc)
  pillarDWeight: number; // Mặc định 15 (Kỷ luật & Thái độ)
  totalWeight: number; // Luôn bắt buộc = 100
}

export interface TelesaleLevelKpiConfig {
  level: number; // 1 -> 9
  title: string; // "Level 1" -> "Level 9"
  tier: TelesaleTier; // 'FRESHER' | 'JUNIOR' | 'MID_LEVEL' | 'SENIOR'
  doneTarget: number; // Level 1-9: 100, 150, 200, 250, 300, 350, 400, 450, 500 Done/tháng
  newCustomersTarget: number; // Khách mới Done (ví dụ: 35, 50, 70, ...)
  revenueTarget: number; // Doanh thu Done (đ)
  callsTarget: number; // Tổng cuộc gọi
  connectedCallsTarget: number; // Cuộc gọi kết nối
}

export interface TelesalePillarAKpiConfig {
  doneKpi: {
    name: string;
    maxScore: number; // Mặc định 12 điểm
    formulaDescription: string; // "MIN(Done thực tế / KPI theo Level, 1) × Điểm tối đa"
    allowOverflowBonus: boolean;
  };
  newCustomersKpi: {
    name: string;
    maxScore: number; // Mặc định 8 điểm
    formulaDescription: string;
  };
  revenueKpi: {
    name: string;
    maxScore: number; // Mặc định 8 điểm
    formulaDescription: string;
  };
  conversionKpi: {
    name: string;
    maxScore: number; // Mặc định 6 điểm
    targetDoneBookRate: number; // 0.7 (70%)
    targetBookCallRate: number; // 0.15 (15%)
    formulaDescription: string;
  };
  callProductivityKpi: {
    name: string;
    maxScore: number; // Mặc định 6 điểm
    formulaDescription: string;
  };
  totalPillarAScore: number; // 40
}

export interface TelesaleTierPromotionRule {
  tier: TelesaleTier;
  label: string;
  levelRange: [number, number]; // [minLevel, maxLevel]
  minTenureMonths: number;
  passingScore: number;
  consecutiveMonthsRequired: number; // N tháng liên tiếp đạt điểm chuẩn để thăng bậc
  demotionConsecutiveFailMonths: number; // N tháng liên tiếp trượt để cảnh báo / giáng bậc
  fresherGracePeriodMonths: number; // Quy tắc Fresher: số tháng bảo lưu / học việc
  badgeColor: string;
  description: string;
}

export type TelesaleConfigStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface TelesaleCompetencyConfigVersion {
  versionId: string;
  versionNumber: number;
  name: string;
  status: TelesaleConfigStatus;
  effectiveDate: string; // YYYY-MM
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedByStaffId?: number;
  publishedByName?: string;
  authorStaffId?: number;
  authorName?: string;
  changelog?: string;

  // Cấu trúc danh mục cấu hình
  pillarsWeight: TelesalePillarsWeightConfig;
  pillarAConfig: TelesalePillarAKpiConfig;
  levelTargets: TelesaleLevelKpiConfig[];
  tierRules: Record<TelesaleTier, TelesaleTierPromotionRule>;
  standardWorkingDays: number;
  maxOverflowBonusRate: number;
}

export interface TelesaleConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TelesaleConfigPreviewRow {
  staffId: number;
  staffName: string;
  currentTier: TelesaleTier;
  currentScore: number;
  previewScore: number;
  scoreDiff: number;
  currentStatus: TelesaleRuleEngineStatus;
  previewStatus: TelesaleRuleEngineStatus;
  pillarAScoreDiff: number;
}

export interface TelesaleConfigPreviewResult {
  versionId: string;
  month: string;
  staffCount: number;
  rows: TelesaleConfigPreviewRow[];
  averageScoreDiff: number;
}

export const DEFAULT_LEVEL_TARGETS: TelesaleLevelKpiConfig[] = [
  { level: 1, title: 'Level 1', tier: 'FRESHER', doneTarget: 100, newCustomersTarget: 35, revenueTarget: 35000000, callsTarget: 1200, connectedCallsTarget: 400 },
  { level: 2, title: 'Level 2', tier: 'FRESHER', doneTarget: 150, newCustomersTarget: 50, revenueTarget: 52500000, callsTarget: 1300, connectedCallsTarget: 450 },
  { level: 3, title: 'Level 3', tier: 'JUNIOR', doneTarget: 200, newCustomersTarget: 70, revenueTarget: 70000000, callsTarget: 1400, connectedCallsTarget: 500 },
  { level: 4, title: 'Level 4', tier: 'JUNIOR', doneTarget: 250, newCustomersTarget: 85, revenueTarget: 87500000, callsTarget: 1500, connectedCallsTarget: 550 },
  { level: 5, title: 'Level 5', tier: 'MID_LEVEL', doneTarget: 300, newCustomersTarget: 100, revenueTarget: 105000000, callsTarget: 1600, connectedCallsTarget: 600 },
  { level: 6, title: 'Level 6', tier: 'MID_LEVEL', doneTarget: 350, newCustomersTarget: 120, revenueTarget: 122500000, callsTarget: 1700, connectedCallsTarget: 650 },
  { level: 7, title: 'Level 7', tier: 'SENIOR', doneTarget: 400, newCustomersTarget: 140, revenueTarget: 140000000, callsTarget: 1800, connectedCallsTarget: 700 },
  { level: 8, title: 'Level 8', tier: 'SENIOR', doneTarget: 450, newCustomersTarget: 155, revenueTarget: 157500000, callsTarget: 1900, connectedCallsTarget: 750 },
  { level: 9, title: 'Level 9', tier: 'SENIOR', doneTarget: 500, newCustomersTarget: 175, revenueTarget: 175000000, callsTarget: 2000, connectedCallsTarget: 800 },
];

export const DEFAULT_PILLAR_A_CONFIG: TelesalePillarAKpiConfig = {
  doneKpi: {
    name: 'KPI Done',
    maxScore: 12,
    formulaDescription: 'MIN(Done thực tế / KPI theo Level, 1) × Điểm tối đa (12đ)',
    allowOverflowBonus: true,
  },
  newCustomersKpi: {
    name: 'Done Khách Mới',
    maxScore: 8,
    formulaDescription: 'MIN(Khách mới thực tế / Target theo Level, 1) × Điểm tối đa (8đ)',
  },
  revenueKpi: {
    name: 'Doanh Thu',
    maxScore: 8,
    formulaDescription: 'MIN(Doanh thu thực tế / Target theo Level, 1) × Điểm tối đa (8đ)',
  },
  conversionKpi: {
    name: 'Tỷ Lệ Chuyển Đổi',
    maxScore: 6,
    targetDoneBookRate: 0.7,
    targetBookCallRate: 0.15,
    formulaDescription: 'Đánh giá tỷ lệ Done/Book (chuẩn 70%) và Book/Connected Calls (chuẩn 15%)',
  },
  callProductivityKpi: {
    name: 'Năng Suất Cuộc Gọi',
    maxScore: 6,
    formulaDescription: 'Đánh giá sản lượng tổng cuộc gọi và cuộc gọi kết nối thành công',
  },
  totalPillarAScore: 40,
};

export const DEFAULT_TIER_RULES: Record<TelesaleTier, TelesaleTierPromotionRule> = {
  FRESHER: {
    tier: 'FRESHER',
    label: 'Fresher Booker',
    levelRange: [1, 2],
    minTenureMonths: 0,
    passingScore: 70,
    consecutiveMonthsRequired: 2,
    demotionConsecutiveFailMonths: 2,
    fresherGracePeriodMonths: 2,
    badgeColor: 'blue',
    description: 'Tư vấn viên mới gia nhập, áp dụng quy tắc đặc xá 2 tháng đầu học việc, không giáng bậc trong thời gian bảo lưu.',
  },
  JUNIOR: {
    tier: 'JUNIOR',
    label: 'Junior Booker',
    levelRange: [3, 4],
    minTenureMonths: 2,
    passingScore: 75,
    consecutiveMonthsRequired: 3,
    demotionConsecutiveFailMonths: 2,
    fresherGracePeriodMonths: 0,
    badgeColor: 'cyan',
    description: 'Tư vấn viên đạt độ ổn định về năng suất gọi, xử lý từ chối cơ bản và chốt lịch hẹn vững vàng.',
  },
  MID_LEVEL: {
    tier: 'MID_LEVEL',
    label: 'Mid-level Booker',
    levelRange: [5, 6],
    minTenureMonths: 6,
    passingScore: 80,
    consecutiveMonthsRequired: 3,
    demotionConsecutiveFailMonths: 2,
    fresherGracePeriodMonths: 0,
    badgeColor: 'gold',
    description: 'Chuyên viên tư vấn xuất sắc, đọc vị khách hàng tinh tế, tỷ lệ Done/Book cao và chuyển đổi đều đặn.',
  },
  SENIOR: {
    tier: 'SENIOR',
    label: 'Senior Booker',
    levelRange: [7, 9],
    minTenureMonths: 12,
    passingScore: 85,
    consecutiveMonthsRequired: 3,
    demotionConsecutiveFailMonths: 2,
    fresherGracePeriodMonths: 0,
    badgeColor: 'purple',
    description: 'Bậc thầy Telesale/Booking, dẫn dắt đội ngũ, xử lý các tình huống khó khăn và đạt hiệu suất cao.',
  },
};

export const DEFAULT_TELESALE_CONFIG_VERSION: TelesaleCompetencyConfigVersion = {
  versionId: 'cfg-v1-init',
  versionNumber: 1,
  name: 'Khung Năng Lực Telesale Tiêu Chuẩn 2026',
  status: 'PUBLISHED',
  effectiveDate: '2026-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2026-01-01T00:00:00.000Z',
  publishedByName: 'Ban Quản Trị Wings Lashes',
  changelog: 'Phiên bản ban hành tiêu chuẩn ban đầu với 4 trụ cột A (40%), B (25%), C (20%), D (15%) và thang 9 Level KPI Done.',
  pillarsWeight: {
    pillarAWeight: 40,
    pillarBWeight: 25,
    pillarCWeight: 20,
    pillarDWeight: 15,
    totalWeight: 100,
  },
  pillarAConfig: DEFAULT_PILLAR_A_CONFIG,
  levelTargets: DEFAULT_LEVEL_TARGETS,
  tierRules: DEFAULT_TIER_RULES,
  standardWorkingDays: 26,
  maxOverflowBonusRate: 1.2,
};
