import {
  TelesaleTier,
  TELESALE_TIER_CONFIG,
  TelesaleSkillKey,
  TelesalePillarAMetrics,
  TelesalePillarBMetrics,
  TelesalePillarCMetrics,
  TelesalePillarDMetrics,
  TelesaleRuleEngineStatus,
  TelesaleCompetencyGlobalConfig,
  DEFAULT_TELESALE_COMPETENCY_CONFIG,
  TelesaleCompetencyConfigVersion,
} from '@mos-lab/shared';

export interface PillarARawInput {
  bookCount: number;
  bookTarget: number;
  doneCount: number;
  doneTarget: number;
  newCustomersDone: number;
  newCustomersTarget: number;
  actualRevenue: number;
  revenueTarget: number;
  totalCalls: number;
  connectedCalls: number;
  callsTarget?: number;
  connectedTarget?: number;
  actualWorkingDays?: number;
  standardWorkingDays?: number;
}

export interface PillarCInput {
  crmRecordErrorCount?: number;
  callProcedureViolations?: number;
  callAuditScore?: number;
  cancellationRate?: number;
  managerQualityScore?: number;
  notes?: string;
}

export interface PillarDInput {
  lateArrivalCount?: number;
  unexcusedAbsenceCount?: number;
  workplaceConductScore?: number;
  managerAttitudeScore?: number;
  mandatoryEvidenceUrl?: string;
  evidenceNotes?: string;
}

export interface HistoryEvaluationSummary {
  month: string;
  totalScore: number;
  isPassed: boolean;
}

export interface RuleEngineEvaluationResult {
  passingScore: number;
  isPassed: boolean;
  consecutivePassMonths: number;
  consecutiveFailMonths: number;
  ruleEngineStatus: TelesaleRuleEngineStatus;
  recommendedTier: TelesaleTier;
}

const NEXT_TIER_MAP: Record<TelesaleTier, TelesaleTier | undefined> = {
  FRESHER: 'JUNIOR',
  JUNIOR: 'MID_LEVEL',
  MID_LEVEL: 'SENIOR',
  SENIOR: undefined,
};

const SKILL_KEYS: TelesaleSkillKey[] = ['KN01', 'KN02', 'KN03', 'KN04', 'KN05', 'KN06', 'KN07', 'KN08', 'KN09'];

/**
 * Tính toán điểm Trụ cột A (Hiệu suất công việc 40% - Hệ thống tự động tính)
 */
export function calculatePillarA(
  raw: PillarARawInput,
  config?: TelesaleCompetencyGlobalConfig | TelesaleCompetencyConfigVersion
): TelesalePillarAMetrics {
  const cfg = config || DEFAULT_TELESALE_COMPETENCY_CONFIG;
  const fallbackStdDays =
    'standardWorkingDays' in cfg
      ? cfg.standardWorkingDays
      : (cfg as TelesaleCompetencyGlobalConfig).defaultStandardWorkingDays;
  const stdDays =
    raw.standardWorkingDays && raw.standardWorkingDays > 0
      ? raw.standardWorkingDays
      : fallbackStdDays || DEFAULT_TELESALE_COMPETENCY_CONFIG.defaultStandardWorkingDays;
  const actDays = raw.actualWorkingDays !== undefined && raw.actualWorkingDays > 0 ? raw.actualWorkingDays : stdDays;
  const pacingFactor = Math.min(1.5, Math.max(0.2, actDays / stdDays));

  // Điều chỉnh target theo ngày làm việc thực tế (working days pacing)
  const adjustedBookTarget = Math.max(1, Math.round(raw.bookTarget * pacingFactor));
  const adjustedDoneTarget = Math.max(1, Math.round(raw.doneTarget * pacingFactor));
  const adjustedNewCustTarget = Math.max(1, Math.round(raw.newCustomersTarget * pacingFactor));
  const adjustedRevenueTarget = Math.max(1, Math.round(raw.revenueTarget * pacingFactor));
  const callsTarget = raw.callsTarget
    ? Math.max(1, Math.round(raw.callsTarget * pacingFactor))
    : Math.round(1500 * pacingFactor);
  const connectedTarget = raw.connectedTarget
    ? Math.max(1, Math.round(raw.connectedTarget * pacingFactor))
    : Math.round(500 * pacingFactor);

  // Tính tỷ lệ đạt (Achievement rates)
  const bookAchieve = adjustedBookTarget > 0 ? raw.bookCount / adjustedBookTarget : 1;
  const doneAchieve = adjustedDoneTarget > 0 ? raw.doneCount / adjustedDoneTarget : 1;
  const newCustAchieve = adjustedNewCustTarget > 0 ? raw.newCustomersDone / adjustedNewCustTarget : 1;
  const revAchieve = adjustedRevenueTarget > 0 ? raw.actualRevenue / adjustedRevenueTarget : 1;

  // Tỷ lệ chuyển đổi
  const conversionDoneBookRate = raw.bookCount > 0 ? raw.doneCount / raw.bookCount : 0;
  const conversionBookCallRate = raw.connectedCalls > 0 ? raw.bookCount / raw.connectedCalls : 0;
  // Chuẩn: Done/Book >= 70% (10đ), Book/ConnectedCall >= 15% (10đ)
  const doneBookScore = Math.min(10, (conversionDoneBookRate / 0.7) * 10);
  const bookCallScore = Math.min(10, (conversionBookCallRate / 0.15) * 10);
  const conversionScore = Number(((doneBookScore + bookCallScore) / 2).toFixed(2));

  // Năng suất gọi
  const callVolAchieve = callsTarget > 0 ? raw.totalCalls / callsTarget : 1;
  const connAchieve = connectedTarget > 0 ? raw.connectedCalls / connectedTarget : 1;
  const callProductivityScore = Number(Math.min(10, ((callVolAchieve + connAchieve) / 2) * 10).toFixed(2));

  // Tính điểm 5 chỉ số Trụ cột A
  const hasPillarAConfig = 'pillarAConfig' in cfg && cfg.pillarAConfig;
  const pAConfig = hasPillarAConfig ? (cfg as TelesaleCompetencyConfigVersion).pillarAConfig : null;
  const pillarAWeight =
    'pillarsWeight' in cfg && cfg.pillarsWeight
      ? (cfg as TelesaleCompetencyConfigVersion).pillarsWeight.pillarAWeight
      : 40;

  let bookDonePart = 0;
  let newCustPart = 0;
  let revPart = 0;
  let convPart = 0;
  let callPart = 0;

  if (pAConfig) {
    // 1. KPI Done: Điểm = MIN(Done thực tế / KPI Level, 1) × Điểm tối đa
    const doneMax = pAConfig.doneKpi.maxScore || 12;
    const baseDoneScore = Math.min(1, (bookAchieve + doneAchieve) / 2) * doneMax;
    const overflowMultiplier =
      pAConfig.doneKpi.allowOverflowBonus && (bookAchieve + doneAchieve) / 2 > 1
        ? Math.min(1.2, (bookAchieve + doneAchieve) / 2)
        : 1;
    bookDonePart = baseDoneScore * overflowMultiplier;

    // 2. Khách mới
    const newCustMax = pAConfig.newCustomersKpi.maxScore || 8;
    newCustPart = Math.min(1.2, newCustAchieve) * newCustMax;

    // 3. Doanh thu
    const revMax = pAConfig.revenueKpi.maxScore || 8;
    revPart = Math.min(1.2, revAchieve) * revMax;

    // 4. Chuyển đổi
    const convMax = pAConfig.conversionKpi.maxScore || 6;
    convPart = (conversionScore / 10) * convMax;

    // 5. Năng suất gọi
    const callMax = pAConfig.callProductivityKpi.maxScore || 6;
    callPart = (callProductivityScore / 10) * callMax;
  } else {
    const pWeights =
      (cfg as TelesaleCompetencyGlobalConfig).pillarAWeights || DEFAULT_TELESALE_COMPETENCY_CONFIG.pillarAWeights;
    bookDonePart = Math.min(1.5, (bookAchieve + doneAchieve) / 2) * (pillarAWeight * pWeights.bookDoneWeight);
    newCustPart = Math.min(1.5, newCustAchieve) * (pillarAWeight * pWeights.newCustomerWeight);
    revPart = Math.min(1.5, revAchieve) * (pillarAWeight * pWeights.revenueWeight);
    convPart = (conversionScore / 10) * (pillarAWeight * pWeights.conversionWeight);
    callPart = (callProductivityScore / 10) * (pillarAWeight * pWeights.callProductivityWeight);
  }

  let rawScore = bookDonePart + newCustPart + revPart + convPart + callPart;

  // Quy tắc an toàn: Không tự động cho 0 điểm nếu thiếu dữ liệu
  const hasAnyActivity = raw.bookCount > 0 || raw.doneCount > 0 || raw.totalCalls > 0 || raw.actualRevenue > 0;
  if (!hasAnyActivity) {
    rawScore = 20; // Điểm sàn bảo lưu an toàn 50%
  } else {
    rawScore = Math.max(15, rawScore);
  }

  // Thưởng vượt KPI có trần (tối đa maxOverflowBonusRate * pillarAWeight)
  const maxBonusRate = cfg.maxOverflowBonusRate || 1.2;
  const maxScore = pillarAWeight * maxBonusRate;
  const cappedScore = Number(Math.min(maxScore, rawScore).toFixed(2));

  return {
    bookCount: raw.bookCount,
    bookTarget: adjustedBookTarget,
    bookAchievementRate: Number(bookAchieve.toFixed(3)),
    doneCount: raw.doneCount,
    doneTarget: adjustedDoneTarget,
    doneAchievementRate: Number(doneAchieve.toFixed(3)),
    newCustomersDone: raw.newCustomersDone,
    newCustomersTarget: adjustedNewCustTarget,
    newCustomersAchievementRate: Number(newCustAchieve.toFixed(3)),
    actualRevenue: raw.actualRevenue,
    revenueTarget: adjustedRevenueTarget,
    revenueAchievementRate: Number(revAchieve.toFixed(3)),
    conversionDoneBookRate: Number(conversionDoneBookRate.toFixed(3)),
    conversionBookCallRate: Number(conversionBookCallRate.toFixed(3)),
    conversionScore,
    totalCalls: raw.totalCalls,
    connectedCalls: raw.connectedCalls,
    callsTarget,
    connectedTarget,
    callProductivityScore,
    actualWorkingDays: actDays,
    standardWorkingDays: stdDays,
    pacingFactor: Number(pacingFactor.toFixed(3)),
    rawScore: Number(rawScore.toFixed(2)),
    cappedScore,
    weightPercentage: 40,
  };
}

/**
 * Tính toán điểm Trụ cột B: 9 Kỹ năng nghiệp vụ (Trọng số 25% - Quản lý chấm)
 */
export function calculatePillarB(
  skillsInput?: Partial<Record<TelesaleSkillKey, { score: number; notes?: string }>>
): TelesalePillarBMetrics {
  const filledSkills = {} as Record<TelesaleSkillKey, { score: number; notes?: string }>;
  let sumScore = 0;

  for (const k of SKILL_KEYS) {
    const item = skillsInput?.[k];
    const validScore = item && typeof item.score === 'number' && item.score >= 1 && item.score <= 5 ? item.score : 3.5; // Mặc định 3.5/5
    filledSkills[k] = {
      score: validScore,
      notes: item?.notes || '',
    };
    sumScore += validScore;
  }

  const averageSkillScore = Number((sumScore / SKILL_KEYS.length).toFixed(2));
  const totalScore = Number(((averageSkillScore / 5) * 25).toFixed(2));

  return {
    skills: filledSkills,
    averageSkillScore,
    totalScore,
    weightPercentage: 25,
  };
}

/**
 * Tính toán điểm Trụ cột C: Chất lượng công việc (Trọng số 20% - Hệ thống + Quản lý)
 */
export function calculatePillarC(input?: PillarCInput): TelesalePillarCMetrics {
  const errorCount = input?.crmRecordErrorCount || 0;
  const procedureViolations = input?.callProcedureViolations || 0;
  const auditScore = input?.callAuditScore !== undefined ? input.callAuditScore : 8; // 0-10
  const cancelRate = input?.cancellationRate || 0.05;

  // Điểm tính tự động: Gốc 20 điểm trừ theo số lỗi
  // Mỗi lỗi nhập liệu CRM trừ 1đ, lỗi quy trình trừ 2đ
  const penalty = errorCount * 1.0 + procedureViolations * 2.0;
  const autoScore = Math.max(5, 20 - penalty);

  // Nếu Quản lý chủ động chấm managerQualityScore (0-20), ưu tiên dùng kết hợp 50/50
  let totalScore = autoScore;
  if (input?.managerQualityScore !== undefined && input.managerQualityScore >= 0 && input.managerQualityScore <= 20) {
    totalScore = Number((autoScore * 0.4 + input.managerQualityScore * 0.6).toFixed(2));
  }

  return {
    crmRecordErrorCount: errorCount,
    callProcedureViolations: procedureViolations,
    callAuditScore: auditScore,
    cancellationRate: cancelRate,
    managerQualityScore: input?.managerQualityScore !== undefined ? input.managerQualityScore : 16,
    totalScore: Number(Math.min(20, Math.max(0, totalScore)).toFixed(2)),
    notes: input?.notes || '',
    weightPercentage: 20,
  };
}

/**
 * Tính toán điểm Trụ cột D: Kỷ luật & Thái độ (Trọng số 15% - Hệ thống + Quản lý)
 */
export function calculatePillarD(input?: PillarDInput): TelesalePillarDMetrics {
  const lateCount = input?.lateArrivalCount || 0;
  const absenceCount = input?.unexcusedAbsenceCount || 0;
  const conductScore = input?.workplaceConductScore !== undefined ? input.workplaceConductScore : 9; // 0-10

  // Điểm tự động: gốc 15 điểm, đi trễ -1đ/lần, vắng không phép -5đ/lần
  const penalty = lateCount * 1.0 + absenceCount * 5.0;
  const autoScore = Math.max(3, 15 - penalty);

  let totalScore = autoScore;
  if (
    input?.managerAttitudeScore !== undefined &&
    input.managerAttitudeScore >= 0 &&
    input.managerAttitudeScore <= 15
  ) {
    totalScore = Number((autoScore * 0.4 + input.managerAttitudeScore * 0.6).toFixed(2));
  }

  return {
    lateArrivalCount: lateCount,
    unexcusedAbsenceCount: absenceCount,
    workplaceConductScore: conductScore,
    managerAttitudeScore: input?.managerAttitudeScore !== undefined ? input.managerAttitudeScore : 12,
    mandatoryEvidenceUrl: input?.mandatoryEvidenceUrl || '',
    evidenceNotes: input?.evidenceNotes || '',
    totalScore: Number(Math.min(15, Math.max(0, totalScore)).toFixed(2)),
    weightPercentage: 15,
  };
}

/**
 * Phân tích Rule Engine đánh giá Thăng / Giáng bậc tự động & Quy tắc Fresher
 */
export function evaluateRuleEngine(
  currentTier: TelesaleTier,
  tenureMonths: number,
  currentMonthTotalScore: number,
  historyEvaluations: HistoryEvaluationSummary[] = [],
  config?: TelesaleCompetencyGlobalConfig | TelesaleCompetencyConfigVersion
): RuleEngineEvaluationResult {
  const cfg = config || DEFAULT_TELESALE_COMPETENCY_CONFIG;
  const hasTierRules = 'tierRules' in cfg && cfg.tierRules;
  const tierRule = hasTierRules ? (cfg as TelesaleCompetencyConfigVersion).tierRules[currentTier] : null;
  const legacyTierConfig =
    ('tiers' in cfg && cfg.tiers ? cfg.tiers[currentTier] : null) || TELESALE_TIER_CONFIG[currentTier];

  const passingScore = tierRule ? tierRule.passingScore : legacyTierConfig.passingScore;
  const isPassed = currentMonthTotalScore >= passingScore;
  const consecutiveMonthsRequired = tierRule
    ? tierRule.consecutiveMonthsRequired
    : legacyTierConfig.consecutiveMonthsRequired;
  const demotionConsecutiveFailMonths = tierRule
    ? tierRule.demotionConsecutiveFailMonths
    : legacyTierConfig.demotionConsecutiveFailMonths;

  // Chuỗi tháng liên tiếp trong lịch sử (tính cả tháng hiện tại)
  let consecutivePass = isPassed ? 1 : 0;
  let consecutiveFail = !isPassed ? 1 : 0;

  // Duyệt từ tháng gần nhất trở về trước
  for (let i = historyEvaluations.length - 1; i >= 0; i--) {
    const prev = historyEvaluations[i];
    if (isPassed) {
      if (prev.isPassed) {
        consecutivePass++;
      } else {
        break;
      }
    } else {
      if (!prev.isPassed) {
        consecutiveFail++;
      } else {
        break;
      }
    }
  }

  let ruleEngineStatus: TelesaleRuleEngineStatus = 'NORMAL';
  let recommendedTier: TelesaleTier = currentTier;

  // 1. Kiểm tra điều kiện Thăng bậc:
  const nextTier = NEXT_TIER_MAP[currentTier];
  if (nextTier) {
    const nextTierRule = hasTierRules ? (cfg as TelesaleCompetencyConfigVersion).tierRules[nextTier] : null;
    const nextLegacyConfig =
      ('tiers' in cfg && cfg.tiers ? cfg.tiers[nextTier] : null) || TELESALE_TIER_CONFIG[nextTier];
    const minTenure = nextTierRule
      ? nextTierRule.minTenureMonths
      : nextLegacyConfig
        ? nextLegacyConfig.minTenureMonths
        : 0;
    const nextPassing = nextTierRule
      ? nextTierRule.passingScore
      : nextLegacyConfig
        ? nextLegacyConfig.passingScore
        : 80;

    const meetsTenure = tenureMonths >= minTenure;
    const meetsConsecutiveScores =
      consecutivePass >= consecutiveMonthsRequired && currentMonthTotalScore >= nextPassing;

    if (meetsTenure && meetsConsecutiveScores) {
      ruleEngineStatus = 'PROMOTION_READY';
      recommendedTier = nextTier;
    }
  }

  // 2. Kiểm tra điều kiện Giáng bậc & Quy tắc Fresher
  if (!isPassed) {
    const fresherGraceMonths =
      tierRule && tierRule.fresherGracePeriodMonths !== undefined
        ? tierRule.fresherGracePeriodMonths
        : currentTier === 'FRESHER'
          ? 2
          : 0;
    const isFresherInGrace = currentTier === 'FRESHER' && tenureMonths < fresherGraceMonths;

    if (!isFresherInGrace) {
      if (consecutiveFail >= demotionConsecutiveFailMonths) {
        ruleEngineStatus = 'DEMOTION_FLAGGED';
        // Đề xuất lùi về bậc trước nếu có
        if (currentTier === 'SENIOR') recommendedTier = 'MID_LEVEL';
        else if (currentTier === 'MID_LEVEL') recommendedTier = 'JUNIOR';
        else if (currentTier === 'JUNIOR') recommendedTier = 'FRESHER';
      } else if (consecutiveFail === 1) {
        ruleEngineStatus = 'WARNING_M1';
      }
    } else {
      ruleEngineStatus = consecutiveFail > 0 ? 'WARNING_M1' : 'NORMAL';
    }
  }

  return {
    passingScore,
    isPassed,
    consecutivePassMonths: consecutivePass,
    consecutiveFailMonths: consecutiveFail,
    ruleEngineStatus,
    recommendedTier,
  };
}
