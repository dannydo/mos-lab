import { FastifyInstance } from 'fastify';
import {
  TelesaleTier,
  TELESALE_TIER_CONFIG,
  TelesaleSkillKey,
  TELESALE_SKILL_DEFINITIONS,
  TelesalePillarAMetrics,
  TelesalePillarBMetrics,
  TelesalePillarCMetrics,
  TelesalePillarDMetrics,
  TelesaleRuleEngineStatus,
  TelesaleCompetencyEvaluation,
  TelesaleCompetencyMatrixRow,
  TelesaleCompetencyGlobalConfig,
  DEFAULT_TELESALE_COMPETENCY_CONFIG,
  TelesalePromotionHistoryItem,
} from '@mos-lab/shared';
import { TelesaleTargetService } from '../kpi/services/telesale-target.service.js';

const CONFIG_KEY = 'telesale_competency:global_config_v1';
const EVAL_KEY_PREFIX = 'telesale_competency:eval_v1:';
const HISTORY_KEY_PREFIX = 'telesale_competency:history_v1:';
const STAFF_TIER_KEY_PREFIX = 'telesale_competency:staff_tier_v1:';

export class TelesaleCompetencyService {
  /**
   * Lấy cấu hình toàn cục
   */
  static async getConfig(fastify?: FastifyInstance): Promise<TelesaleCompetencyGlobalConfig> {
    try {
      if (fastify?.prisma?.crm?.crmConfig) {
        const record = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: CONFIG_KEY },
        });
        if (record?.value) {
          return {
            ...DEFAULT_TELESALE_COMPETENCY_CONFIG,
            ...JSON.parse(record.value),
          };
        }
      }
    } catch {
      // Fallback default config
    }
    return DEFAULT_TELESALE_COMPETENCY_CONFIG;
  }

  /**
   * Cập nhật cấu hình toàn cục
   */
  static async saveConfig(
    fastify: FastifyInstance,
    config: Partial<TelesaleCompetencyGlobalConfig>
  ): Promise<TelesaleCompetencyGlobalConfig> {
    const current = await this.getConfig(fastify);
    const updated: TelesaleCompetencyGlobalConfig = {
      ...current,
      ...config,
      tiers: {
        ...current.tiers,
        ...(config.tiers || {}),
      },
      pillarAWeights: {
        ...current.pillarAWeights,
        ...(config.pillarAWeights || {}),
      },
    };

    if (fastify?.prisma?.crm?.crmConfig) {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CONFIG_KEY },
        create: {
          key: CONFIG_KEY,
          value: JSON.stringify(updated),
        },
        update: {
          value: JSON.stringify(updated),
          updatedAt: new Date(),
        },
      });
    }

    return updated;
  }

  /**
   * Tính toán điểm Trụ cột A (Hiệu suất công việc 40% - Hệ thống tự động tính)
   */
  static calculatePillarA(
    raw: {
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
    },
    config?: TelesaleCompetencyGlobalConfig
  ): TelesalePillarAMetrics {
    const cfg = config || DEFAULT_TELESALE_COMPETENCY_CONFIG;
    const stdDays = raw.standardWorkingDays && raw.standardWorkingDays > 0 ? raw.standardWorkingDays : cfg.defaultStandardWorkingDays;
    const actDays = raw.actualWorkingDays !== undefined && raw.actualWorkingDays > 0 ? raw.actualWorkingDays : stdDays;
    const pacingFactor = Math.min(1.5, Math.max(0.2, actDays / stdDays));

    // Điều chỉnh target theo ngày làm việc thực tế (working days pacing)
    const adjustedBookTarget = Math.max(1, Math.round(raw.bookTarget * pacingFactor));
    const adjustedDoneTarget = Math.max(1, Math.round(raw.doneTarget * pacingFactor));
    const adjustedNewCustTarget = Math.max(1, Math.round(raw.newCustomersTarget * pacingFactor));
    const adjustedRevenueTarget = Math.max(1, Math.round(raw.revenueTarget * pacingFactor));
    const callsTarget = raw.callsTarget ? Math.max(1, Math.round(raw.callsTarget * pacingFactor)) : Math.round(1500 * pacingFactor);
    const connectedTarget = raw.connectedTarget ? Math.max(1, Math.round(raw.connectedTarget * pacingFactor)) : Math.round(500 * pacingFactor);

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
    const callProductivityScore = Number((Math.min(10, ((callVolAchieve + connAchieve) / 2) * 10)).toFixed(2));

    // Trọng số thành phần của Trụ cột A (Tổng 40 điểm)
    // 1. Book & Done: 30% -> 12đ (chia 6đ cho Book, 6đ cho Done)
    const bookDonePart = Math.min(1.5, (bookAchieve + doneAchieve) / 2) * (40 * cfg.pillarAWeights.bookDoneWeight);
    // 2. Khách mới: 20% -> 8đ
    const newCustPart = Math.min(1.5, newCustAchieve) * (40 * cfg.pillarAWeights.newCustomerWeight);
    // 3. Doanh thu: 20% -> 8đ
    const revPart = Math.min(1.5, revAchieve) * (40 * cfg.pillarAWeights.revenueWeight);
    // 4. Tỷ lệ chuyển đổi: 15% -> 6đ (quy đổi từ conversionScore 0-10)
    const convPart = (conversionScore / 10) * (40 * cfg.pillarAWeights.conversionWeight);
    // 5. Năng suất gọi: 15% -> 6đ (quy đổi từ callProductivityScore 0-10)
    const callPart = (callProductivityScore / 10) * (40 * cfg.pillarAWeights.callProductivityWeight);

    let rawScore = bookDonePart + newCustPart + revPart + convPart + callPart;

    // Quy tắc an toàn: Không tự động cho 0 điểm nếu thiếu dữ liệu
    const hasAnyActivity = raw.bookCount > 0 || raw.doneCount > 0 || raw.totalCalls > 0 || raw.actualRevenue > 0;
    if (!hasAnyActivity) {
      rawScore = 20; // Điểm sàn bảo lưu an toàn 50%
    } else {
      rawScore = Math.max(15, rawScore);
    }

    // Thưởng vượt KPI có trần (tối đa maxOverflowBonusRate * 40 = 48 điểm)
    const maxScore = 40 * cfg.maxOverflowBonusRate;
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
  static calculatePillarB(
    skillsInput?: Partial<Record<TelesaleSkillKey, { score: number; notes?: string }>>
  ): TelesalePillarBMetrics {
    const keys: TelesaleSkillKey[] = [
      'KN01',
      'KN02',
      'KN03',
      'KN04',
      'KN05',
      'KN06',
      'KN07',
      'KN08',
      'KN09',
    ];

    const filledSkills: Record<TelesaleSkillKey, { score: number; notes?: string }> = {} as any;
    let sumScore = 0;

    for (const k of keys) {
      const item = skillsInput?.[k];
      const validScore = item && typeof item.score === 'number' && item.score >= 1 && item.score <= 5 ? item.score : 3.5; // Mặc định 3.5/5
      filledSkills[k] = {
        score: validScore,
        notes: item?.notes || '',
      };
      sumScore += validScore;
    }

    const averageSkillScore = Number((sumScore / keys.length).toFixed(2));
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
  static calculatePillarC(input?: {
    crmRecordErrorCount?: number;
    callProcedureViolations?: number;
    callAuditScore?: number;
    cancellationRate?: number;
    managerQualityScore?: number;
    notes?: string;
  }): TelesalePillarCMetrics {
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
      totalScore = Number(((autoScore * 0.4 + input.managerQualityScore * 0.6)).toFixed(2));
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
  static calculatePillarD(input?: {
    lateArrivalCount?: number;
    unexcusedAbsenceCount?: number;
    workplaceConductScore?: number;
    managerAttitudeScore?: number;
    mandatoryEvidenceUrl?: string;
    evidenceNotes?: string;
  }): TelesalePillarDMetrics {
    const lateCount = input?.lateArrivalCount || 0;
    const absenceCount = input?.unexcusedAbsenceCount || 0;
    const conductScore = input?.workplaceConductScore !== undefined ? input.workplaceConductScore : 9; // 0-10

    // Điểm tự động: gốc 15 điểm, đi trễ -1đ/lần, vắng không phép -5đ/lần
    const penalty = lateCount * 1.0 + absenceCount * 5.0;
    const autoScore = Math.max(3, 15 - penalty);

    let totalScore = autoScore;
    if (input?.managerAttitudeScore !== undefined && input.managerAttitudeScore >= 0 && input.managerAttitudeScore <= 15) {
      totalScore = Number(((autoScore * 0.4 + input.managerAttitudeScore * 0.6)).toFixed(2));
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
   * Phân tích Rule Engine đánh giá Thăng / Giáng bậc tự động
   */
  static evaluateRuleEngine(
    currentTier: TelesaleTier,
    tenureMonths: number,
    currentMonthTotalScore: number,
    historyEvaluations: Array<{ month: string; totalScore: number; isPassed: boolean }> = [],
    config?: TelesaleCompetencyGlobalConfig
  ): {
    passingScore: number;
    isPassed: boolean;
    consecutivePassMonths: number;
    consecutiveFailMonths: number;
    ruleEngineStatus: TelesaleRuleEngineStatus;
    recommendedTier: TelesaleTier;
  } {
    const cfg = config || DEFAULT_TELESALE_COMPETENCY_CONFIG;
    const tierConfig = cfg.tiers[currentTier] || TELESALE_TIER_CONFIG[currentTier];
    const passingScore = tierConfig.passingScore;
    const isPassed = currentMonthTotalScore >= passingScore;

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
    // Đủ thâm niên + Đạt điểm chuẩn N tháng liên tiếp
    const nextTier = tierConfig.nextTier;
    if (nextTier) {
      const nextTierConfig = cfg.tiers[nextTier];
      const requiredMonths = tierConfig.consecutiveMonthsRequired;
      const meetsTenure = tenureMonths >= nextTierConfig.minTenureMonths;
      const meetsConsecutiveScores = consecutivePass >= requiredMonths && currentMonthTotalScore >= nextTierConfig.passingScore;

      if (meetsTenure && meetsConsecutiveScores) {
        ruleEngineStatus = 'PROMOTION_READY';
        recommendedTier = nextTier;
      }
    }

    // 2. Kiểm tra điều kiện Giáng bậc:
    // Không đạt điểm chuẩn cấp bậc hiện tại trong 2 tháng liên tiếp
    if (!isPassed) {
      if (consecutiveFail >= tierConfig.demotionConsecutiveFailMonths) {
        ruleEngineStatus = 'DEMOTION_FLAGGED';
        // Đề xuất lùi về bậc trước nếu có
        if (currentTier === 'SENIOR') recommendedTier = 'MID_LEVEL';
        else if (currentTier === 'MID_LEVEL') recommendedTier = 'JUNIOR';
        else if (currentTier === 'JUNIOR') recommendedTier = 'FRESHER';
      } else if (consecutiveFail === 1) {
        ruleEngineStatus = 'WARNING_M1';
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

  /**
   * Lấy thâm niên và cấp bậc lưu trữ của nhân sự
   */
  static async getStaffTierAndTenure(
    fastify: FastifyInstance,
    staffId: number
  ): Promise<{ tier: TelesaleTier; tenureMonths: number; startDate?: string }> {
    try {
      if (fastify?.prisma?.crm?.crmConfig) {
        const key = `${STAFF_TIER_KEY_PREFIX}${staffId}`;
        const record = await fastify.prisma.crm.crmConfig.findUnique({ where: { key } });
        if (record?.value) {
          const parsed = JSON.parse(record.value);
          return {
            tier: parsed.tier || 'JUNIOR',
            tenureMonths: parsed.tenureMonths !== undefined ? parsed.tenureMonths : 4,
            startDate: parsed.startDate,
          };
        }
      }
    } catch {
      // ignore
    }
    // Mặc định cho staff
    return {
      tier: 'JUNIOR',
      tenureMonths: 4,
      startDate: '2026-06-01',
    };
  }

  /**
   * Lấy dữ liệu tự động cho Trụ cột A từ TelesaleTargetService
   */
  static async getStaffAutoMetrics(
    fastify: FastifyInstance,
    legacyStaffId: number,
    month = '2026-10'
  ): Promise<TelesalePillarAMetrics> {
    try {
      const overview = await TelesaleTargetService.getOverview(fastify, month, legacyStaffId, { skipCache: true });
      const staffTarget = overview.staffTargets.find((s) => s.legacyStaffId === legacyStaffId);

      const doneCount = staffTarget?.doneActual || 0;
      const doneTarget = staffTarget?.doneTarget || 40;
      const bookCount = Math.round(doneCount * 1.35) || (staffTarget?.bookToday ? staffTarget.bookToday * 10 : 30);
      const bookTarget = Math.round(doneTarget * 1.4);
      const newCustomersDone = Math.round(doneCount * 0.4);
      const newCustomersTarget = Math.round(doneTarget * 0.35);
      const actualRevenue = staffTarget?.revenueActual || doneCount * 350000;
      const revenueTarget = doneTarget * 350000;

      const totalCalls = staffTarget?.callActualToday ? staffTarget.callActualToday * 20 : 1200;
      const connectedCalls = staffTarget?.pickupActualToday ? staffTarget.pickupActualToday * 20 : 400;

      const actualWorkingDays = overview.teamMonth?.workDaysElapsed || 20;
      const standardWorkingDays = overview.teamMonth?.workDaysTotal || 26;

      return this.calculatePillarA({
        bookCount,
        bookTarget,
        doneCount,
        doneTarget,
        newCustomersDone,
        newCustomersTarget,
        actualRevenue,
        revenueTarget,
        totalCalls,
        connectedCalls,
        actualWorkingDays,
        standardWorkingDays,
      });
    } catch {
      // Fallback nếu không có database legacy
      return this.calculatePillarA({
        bookCount: 55,
        bookTarget: 60,
        doneCount: 42,
        doneTarget: 40,
        newCustomersDone: 18,
        newCustomersTarget: 15,
        actualRevenue: 15400000,
        revenueTarget: 14000000,
        totalCalls: 1350,
        connectedCalls: 450,
        actualWorkingDays: 20,
        standardWorkingDays: 26,
      });
    }
  }

  /**
   * Lấy lịch sử đánh giá các tháng trước của nhân sự
   */
  static async getStaffHistoryEvaluations(
    fastify: FastifyInstance,
    staffId: number,
    currentMonth: string
  ): Promise<Array<{ month: string; totalScore: number; isPassed: boolean }>> {
    const history: Array<{ month: string; totalScore: number; isPassed: boolean }> = [];
    try {
      if (fastify?.prisma?.crm?.crmConfig) {
        // Lấy 3 tháng trước đó
        const [yearStr, monthStr] = currentMonth.split('-');
        let y = parseInt(yearStr, 10);
        let m = parseInt(monthStr, 10);

        for (let i = 1; i <= 3; i++) {
          m--;
          if (m <= 0) {
            m = 12;
            y--;
          }
          const prevMonthStr = `${y}-${String(m).padStart(2, '0')}`;
          const key = `${EVAL_KEY_PREFIX}${staffId}:${prevMonthStr}`;
          const row = await fastify.prisma.crm.crmConfig.findUnique({ where: { key } });
          if (row?.value) {
            const data = JSON.parse(row.value);
            history.unshift({
              month: prevMonthStr,
              totalScore: data.totalScore,
              isPassed: data.isPassed,
            });
          }
        }
      }
    } catch {
      // ignore
    }
    return history;
  }

  /**
   * Lấy chi tiết đánh giá khung năng lực cho 1 nhân viên trong tháng
   */
  static async getEvaluation(
    fastify: FastifyInstance,
    staffId: number,
    month = '2026-10'
  ): Promise<TelesaleCompetencyEvaluation> {
    const config = await this.getConfig(fastify);
    const { tier, tenureMonths, startDate } = await this.getStaffTierAndTenure(fastify, staffId);

    // Tìm thông tin tên & legacyStaffId từ danh sách Telesales HR
    const telesalesStaff = await TelesaleTargetService.getActiveTelesalesStaffFromHr(fastify);
    const staffMeta = telesalesStaff.find((s) => s.crmStaffId === staffId || s.legacyStaffId === staffId);
    const staffName = staffMeta?.name || `Telesales #${staffId}`;
    const legacyStaffId = staffMeta?.legacyStaffId || staffId;
    const avatarUrl = staffMeta?.avatarUrl || undefined;

    // Đọc đánh giá đã lưu nếu có
    let savedEval: TelesaleCompetencyEvaluation | null = null;
    try {
      if (fastify?.prisma?.crm?.crmConfig) {
        const key = `${EVAL_KEY_PREFIX}${staffId}:${month}`;
        const row = await fastify.prisma.crm.crmConfig.findUnique({ where: { key } });
        if (row?.value) {
          savedEval = JSON.parse(row.value);
        }
      }
    } catch {
      // ignore
    }

    // Luôn cập nhật lại Trụ cột A từ dữ liệu hệ thống mới nhất
    const pillarA = await this.getStaffAutoMetrics(fastify, legacyStaffId, month);
    const pillarB = savedEval?.pillarB || this.calculatePillarB();
    const pillarC = savedEval?.pillarC || this.calculatePillarC();
    const pillarD = savedEval?.pillarD || this.calculatePillarD();

    const totalScore = Number((pillarA.cappedScore + pillarB.totalScore + pillarC.totalScore + pillarD.totalScore).toFixed(2));

    // Lịch sử tháng trước
    const history = await this.getStaffHistoryEvaluations(fastify, staffId, month);
    const ruleEngine = this.evaluateRuleEngine(tier, tenureMonths, totalScore, history, config);

    // Lịch sử thăng/giáng bậc
    const promotionHistory = await this.getPromotionHistory(fastify, staffId);

    return {
      id: `${staffId}-${month}`,
      month,
      staffId,
      legacyStaffId,
      staffName,
      avatarUrl,
      currentTier: tier,
      tenureMonths,
      startDate,
      pillarA,
      pillarB,
      pillarC,
      pillarD,
      totalScore,
      passingScore: ruleEngine.passingScore,
      isPassed: ruleEngine.isPassed,
      consecutivePassMonths: ruleEngine.consecutivePassMonths,
      consecutiveFailMonths: ruleEngine.consecutiveFailMonths,
      ruleEngineStatus: ruleEngine.ruleEngineStatus,
      recommendedTier: ruleEngine.recommendedTier,
      evaluatedByStaffId: savedEval?.evaluatedByStaffId,
      evaluatedByName: savedEval?.evaluatedByName,
      evaluatedAt: savedEval?.evaluatedAt,
      promotionHistory,
    };
  }

  /**
   * Lưu kết quả đánh giá năng lực của Quản lý
   */
  static async saveEvaluation(
    fastify: FastifyInstance,
    payload: {
      staffId: number;
      month: string;
      pillarB: TelesalePillarBMetrics;
      pillarC: TelesalePillarCMetrics;
      pillarD: TelesalePillarDMetrics;
      evaluatedByStaffId?: number;
      evaluatedByName?: string;
    }
  ): Promise<TelesaleCompetencyEvaluation> {
    const { staffId, month } = payload;
    if (!staffId || !month) {
      throw new Error('Thiếu staffId hoặc month để lưu đánh giá');
    }

    // Bắt buộc minh chứng cho Trụ cột D nếu có trừ điểm hoặc đánh giá dưới 13 điểm
    if (payload.pillarD.totalScore < 14 && !payload.pillarD.mandatoryEvidenceUrl && !payload.pillarD.evidenceNotes) {
      throw new Error('Quy chuẩn Trụ cột D bắt buộc đính kèm minh chứng (Link ảnh hoặc Ghi chú sự vụ cụ thể) khi đánh giá');
    }

    // Lấy lại Trụ cột A tươi mới nhất
    const telesalesStaff = await TelesaleTargetService.getActiveTelesalesStaffFromHr(fastify);
    const staffMeta = telesalesStaff.find((s) => s.crmStaffId === staffId || s.legacyStaffId === staffId);
    const legacyStaffId = staffMeta?.legacyStaffId || staffId;

    const pillarA = await this.getStaffAutoMetrics(fastify, legacyStaffId, month);
    const pillarB = this.calculatePillarB(payload.pillarB?.skills);
    const pillarC = this.calculatePillarC(payload.pillarC);
    const pillarD = this.calculatePillarD(payload.pillarD);

    const totalScore = Number((pillarA.cappedScore + pillarB.totalScore + pillarC.totalScore + pillarD.totalScore).toFixed(2));

    const config = await this.getConfig(fastify);
    const { tier, tenureMonths, startDate } = await this.getStaffTierAndTenure(fastify, staffId);
    const history = await this.getStaffHistoryEvaluations(fastify, staffId, month);
    const ruleEngine = this.evaluateRuleEngine(tier, tenureMonths, totalScore, history, config);

    const evaluation: TelesaleCompetencyEvaluation = {
      id: `${staffId}-${month}`,
      month,
      staffId,
      legacyStaffId,
      staffName: staffMeta?.name || `Telesales #${staffId}`,
      avatarUrl: staffMeta?.avatarUrl || undefined,
      currentTier: tier,
      tenureMonths,
      startDate,
      pillarA,
      pillarB,
      pillarC,
      pillarD,
      totalScore,
      passingScore: ruleEngine.passingScore,
      isPassed: ruleEngine.isPassed,
      consecutivePassMonths: ruleEngine.consecutivePassMonths,
      consecutiveFailMonths: ruleEngine.consecutiveFailMonths,
      ruleEngineStatus: ruleEngine.ruleEngineStatus,
      recommendedTier: ruleEngine.recommendedTier,
      evaluatedByStaffId: payload.evaluatedByStaffId,
      evaluatedByName: payload.evaluatedByName || 'Manager',
      evaluatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (fastify?.prisma?.crm?.crmConfig) {
      const key = `${EVAL_KEY_PREFIX}${staffId}:${month}`;
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key },
        create: {
          key,
          value: JSON.stringify(evaluation),
        },
        update: {
          value: JSON.stringify(evaluation),
          updatedAt: new Date(),
        },
      });
    }

    return evaluation;
  }

  /**
   * Lấy Ma Trận Năng Lực Toàn Đội Telesale
   */
  static async listTeamMatrix(
    fastify: FastifyInstance,
    month = '2026-10'
  ): Promise<TelesaleCompetencyMatrixRow[]> {
    const staffList = await TelesaleTargetService.getActiveTelesalesStaffFromHr(fastify);
    const matrix: TelesaleCompetencyMatrixRow[] = [];

    for (const staff of staffList) {
      const id = staff.crmStaffId || staff.legacyStaffId;
      const evaluation = await this.getEvaluation(fastify, id, month);

      matrix.push({
        staffId: evaluation.staffId,
        legacyStaffId: evaluation.legacyStaffId,
        staffName: evaluation.staffName,
        avatarUrl: evaluation.avatarUrl,
        currentTier: evaluation.currentTier,
        tenureMonths: evaluation.tenureMonths,
        month,
        scoreA: evaluation.pillarA.cappedScore,
        scoreB: evaluation.pillarB.totalScore,
        scoreC: evaluation.pillarC.totalScore,
        scoreD: evaluation.pillarD.totalScore,
        totalScore: evaluation.totalScore,
        isPassed: evaluation.isPassed,
        consecutivePassMonths: evaluation.consecutivePassMonths,
        consecutiveFailMonths: evaluation.consecutiveFailMonths,
        ruleEngineStatus: evaluation.ruleEngineStatus,
        hasEvaluated: !!evaluation.evaluatedAt,
        evaluatedAt: evaluation.evaluatedAt,
      });
    }

    // Sắp xếp theo tổng điểm giảm dần
    matrix.sort((a, b) => b.totalScore - a.totalScore);
    return matrix;
  }

  /**
   * Thực hiện hành động Thăng Bậc / Giáng Bậc chính thức
   */
  static async executePromotionAction(
    fastify: FastifyInstance,
    staffId: number,
    action: 'PROMOTED' | 'DEMOTED' | 'RETAINED',
    toTier: TelesaleTier,
    operator: { id?: number; name?: string },
    reason?: string,
    effectiveMonth = '2026-10'
  ): Promise<{ success: boolean; newTier: TelesaleTier; message: string }> {
    const { tier: fromTier, tenureMonths, startDate } = await this.getStaffTierAndTenure(fastify, staffId);

    // Cập nhật bậc mới
    if (fastify?.prisma?.crm?.crmConfig) {
      const staffKey = `${STAFF_TIER_KEY_PREFIX}${staffId}`;
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: staffKey },
        create: {
          key: staffKey,
          value: JSON.stringify({
            tier: toTier,
            tenureMonths,
            startDate,
            updatedAt: new Date().toISOString(),
          }),
        },
        update: {
          value: JSON.stringify({
            tier: toTier,
            tenureMonths,
            startDate,
            updatedAt: new Date().toISOString(),
          }),
          updatedAt: new Date(),
        },
      });

      // Ghi lịch sử
      const historyItem: TelesalePromotionHistoryItem = {
        id: `promo-${staffId}-${Date.now()}`,
        action,
        fromTier,
        toTier,
        decidedByStaffId: operator.id,
        decidedByName: operator.name || 'Danny Do',
        decidedAt: new Date().toISOString(),
        reason: reason || (action === 'PROMOTED' ? 'Đủ thâm niên và đạt điểm chuẩn liên tiếp' : 'Không đạt điểm chuẩn 2 tháng liên tiếp'),
        effectiveMonth,
      };

      const historyKey = `${HISTORY_KEY_PREFIX}${staffId}`;
      const existing = await fastify.prisma.crm.crmConfig.findUnique({ where: { key: historyKey } });
      const list: TelesalePromotionHistoryItem[] = existing?.value ? JSON.parse(existing.value) : [];
      list.unshift(historyItem);

      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: historyKey },
        create: {
          key: historyKey,
          value: JSON.stringify(list),
        },
        update: {
          value: JSON.stringify(list),
          updatedAt: new Date(),
        },
      });
    }

    const actionText = action === 'PROMOTED' ? 'thăng cấp lên' : action === 'DEMOTED' ? 'giáng cấp về' : 'duy trì';
    return {
      success: true,
      newTier: toTier,
      message: `Đã phê duyệt ${actionText} ${toTier} cho nhân viên thành công!`,
    };
  }

  /**
   * Lấy lịch sử thăng / giáng bậc
   */
  static async getPromotionHistory(
    fastify: FastifyInstance,
    staffId: number
  ): Promise<TelesalePromotionHistoryItem[]> {
    try {
      if (fastify?.prisma?.crm?.crmConfig) {
        const key = `${HISTORY_KEY_PREFIX}${staffId}`;
        const record = await fastify.prisma.crm.crmConfig.findUnique({ where: { key } });
        if (record?.value) {
          return JSON.parse(record.value);
        }
      }
    } catch {
      // ignore
    }
    return [];
  }
}
