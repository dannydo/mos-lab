import { FastifyInstance } from 'fastify';
import {
  TelesaleTier,
  TELESALE_TIER_CONFIG,
  TelesaleSkillKey,
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
  TelesaleCompetencyConfigVersion,
  TelesaleConfigValidationResult,
  TelesaleConfigPreviewResult,
  TelesaleConfigPreviewRow,
  DEFAULT_TELESALE_CONFIG_VERSION,
} from '@mos-lab/shared';
import { TelesaleTargetService } from '../kpi/services/telesale-target.service.js';

const CONFIG_KEY = 'telesale_competency:global_config_v1';
const VERSIONS_KEY = 'telesale_competency:versions_v2';
const EVAL_KEY_PREFIX = 'telesale_competency:eval_v1:';
const HISTORY_KEY_PREFIX = 'telesale_competency:history_v1:';
const STAFF_TIER_KEY_PREFIX = 'telesale_competency:staff_tier_v1:';

export class TelesaleCompetencyService {
  /**
   * ---------------------------------------------------------
   * Quản Lý Phiên Bản Cấu Hình Khung Năng Lực (MOS-FEAT-142)
   * ---------------------------------------------------------
   */

  /**
   * Lấy danh sách tất cả các phiên bản cấu hình (Draft, Published, Archived)
   */
  static async listConfigVersions(fastify?: FastifyInstance): Promise<TelesaleCompetencyConfigVersion[]> {
    try {
      if (fastify?.prisma?.crm?.crmConfig) {
        const record = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: VERSIONS_KEY },
        });
        if (record?.value) {
          const list: TelesaleCompetencyConfigVersion[] = JSON.parse(record.value);
          if (Array.isArray(list) && list.length > 0) {
            return list.sort((a, b) => b.versionNumber - a.versionNumber);
          }
        }
      }
    } catch {
      // ignore
    }

    // Khởi tạo mặc định nếu chưa có
    const initialList = [DEFAULT_TELESALE_CONFIG_VERSION];
    if (fastify?.prisma?.crm?.crmConfig) {
      try {
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: VERSIONS_KEY },
          create: {
            key: VERSIONS_KEY,
            value: JSON.stringify(initialList),
          },
          update: {
            value: JSON.stringify(initialList),
            updatedAt: new Date(),
          },
        });
      } catch {
        // non-blocking
      }
    }
    return initialList;
  }

  /**
   * Lấy chi tiết một phiên bản cấu hình theo ID
   */
  static async getConfigVersion(
    fastify: FastifyInstance | undefined,
    versionId: string
  ): Promise<TelesaleCompetencyConfigVersion | null> {
    const list = await this.listConfigVersions(fastify);
    return list.find((v) => v.versionId === versionId) || null;
  }

  /**
   * Lấy phiên bản cấu hình có hiệu lực cho một tháng cụ thể (Không hồi tố kỳ cũ)
   */
  static async getVersionForMonth(
    fastify: FastifyInstance | undefined,
    month = '2026-10'
  ): Promise<TelesaleCompetencyConfigVersion> {
    const list = await this.listConfigVersions(fastify);
    // Lọc các bản đã ban hành có effectiveDate <= month
    const published = list
      .filter((v) => v.status === 'PUBLISHED' && v.effectiveDate <= month)
      .sort((a, b) => {
        if (a.effectiveDate !== b.effectiveDate) {
          return b.effectiveDate.localeCompare(a.effectiveDate);
        }
        return b.versionNumber - a.versionNumber;
      });

    if (published.length > 0) {
      return published[0];
    }

    // Fallback: Bản ban hành mới nhất hoặc mặc định
    const anyPublished = list.find((v) => v.status === 'PUBLISHED');
    return anyPublished || DEFAULT_TELESALE_CONFIG_VERSION;
  }

  /**
   * Kiểm tra tính hợp lệ của phiên bản cấu hình trước khi ban hành
   */
  static validateConfigVersion(version: TelesaleCompetencyConfigVersion): TelesaleConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Kiểm tra 4 trụ cột A, B, C, D
    const pw = version.pillarsWeight;
    if (!pw) {
      errors.push('Thiếu cấu hình trọng số 4 trụ cột');
    } else {
      const sum = Number(pw.pillarAWeight || 0) + Number(pw.pillarBWeight || 0) + Number(pw.pillarCWeight || 0) + Number(pw.pillarDWeight || 0);
      if (Math.abs(sum - 100) > 0.01) {
        errors.push(`Tổng trọng số 4 trụ cột (A: ${pw.pillarAWeight} + B: ${pw.pillarBWeight} + C: ${pw.pillarCWeight} + D: ${pw.pillarDWeight} = ${sum}%) phải bằng đúng 100%`);
      }
    }

    // 2. Kiểm tra ngày hiệu lực
    if (!version.effectiveDate || !/^\d{4}-\d{2}$/.test(version.effectiveDate)) {
      errors.push('Ngày bắt đầu hiệu lực không hợp lệ (định dạng chuẩn YYYY-MM, ví dụ: 2026-11)');
    }

    // 3. Kiểm tra Trụ cột A & 5 chỉ số KPI
    const pA = version.pillarAConfig;
    if (!pA) {
      errors.push('Thiếu cấu hình chi tiết Trụ cột A');
    } else {
      const kpis = [pA.doneKpi, pA.newCustomersKpi, pA.revenueKpi, pA.conversionKpi, pA.callProductivityKpi];
      for (const kpi of kpis) {
        if (!kpi || typeof kpi.maxScore !== 'number' || kpi.maxScore <= 0) {
          errors.push(`Điểm tối đa của chỉ số ${kpi?.name || 'KPI'} phải lớn hơn 0`);
        }
      }
      const kpiSum = kpis.reduce((acc, k) => acc + (k?.maxScore || 0), 0);
      const expectedA = pw?.pillarAWeight || 40;
      if (Math.abs(kpiSum - expectedA) > 0.01) {
        warnings.push(`Tổng điểm tối đa 5 chỉ số Trụ cột A (${kpiSum}đ) chưa khớp với trọng số Trụ cột A (${expectedA}đ). Hệ thống sẽ chuẩn hóa tự động khi tính điểm.`);
      }
    }

    // 4. Kiểm tra danh mục 9 Level
    if (!Array.isArray(version.levelTargets) || version.levelTargets.length !== 9) {
      errors.push('Cần cấu hình đầy đủ đúng 9 Level (Level 1 đến Level 9)');
    } else {
      for (let i = 0; i < version.levelTargets.length; i++) {
        const item = version.levelTargets[i];
        if (item.doneTarget <= 0) {
          errors.push(`Level ${item.level}: KPI Done phải lớn hơn 0`);
        }
        if (i > 0 && item.doneTarget < version.levelTargets[i - 1].doneTarget) {
          errors.push(`Level ${item.level} (${item.doneTarget} Done) không được thấp hơn Level ${item.level - 1} (${version.levelTargets[i - 1].doneTarget} Done)`);
        }
      }
    }

    // 5. Kiểm tra quy tắc các bậc Tier & Fresher
    const tiers: TelesaleTier[] = ['FRESHER', 'JUNIOR', 'MID_LEVEL', 'SENIOR'];
    for (const t of tiers) {
      const rule = version.tierRules?.[t];
      if (!rule) {
        errors.push(`Thiếu cấu hình điều kiện cho chức danh ${t}`);
      } else {
        if (rule.passingScore < 50 || rule.passingScore > 100) {
          errors.push(`Chức danh ${rule.label}: Điểm chuẩn phải nằm trong khoảng 50 - 100 điểm`);
        }
        if (rule.consecutiveMonthsRequired < 1) {
          errors.push(`Chức danh ${rule.label}: Số tháng liên tiếp đạt chuẩn phải >= 1`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Tạo một bản nháp cấu hình mới
   */
  static async createDraftVersion(
    fastify: FastifyInstance,
    payload: Partial<TelesaleCompetencyConfigVersion>,
    author: { id?: number; name?: string }
  ): Promise<TelesaleCompetencyConfigVersion> {
    const list = await this.listConfigVersions(fastify);
    const nextVersionNumber = Math.max(...list.map((v) => v.versionNumber), 0) + 1;
    const baseVersion = list.find((v) => v.versionId === payload.versionId) || list[0] || DEFAULT_TELESALE_CONFIG_VERSION;

    const draft: TelesaleCompetencyConfigVersion = {
      ...baseVersion,
      versionId: `cfg-v${nextVersionNumber}-${Date.now().toString(36)}`,
      versionNumber: nextVersionNumber,
      name: payload.name || `Bản Nháp Khung Năng Lực v${nextVersionNumber}`,
      status: 'DRAFT',
      effectiveDate: payload.effectiveDate || new Date().toISOString().slice(0, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: undefined,
      publishedByStaffId: undefined,
      publishedByName: undefined,
      authorStaffId: author.id,
      authorName: author.name || 'Admin',
      changelog: payload.changelog || 'Khởi tạo bản nháp mới',
      pillarsWeight: payload.pillarsWeight || baseVersion.pillarsWeight,
      pillarAConfig: payload.pillarAConfig || baseVersion.pillarAConfig,
      levelTargets: payload.levelTargets || baseVersion.levelTargets,
      tierRules: payload.tierRules || baseVersion.tierRules,
      standardWorkingDays: payload.standardWorkingDays || baseVersion.standardWorkingDays,
      maxOverflowBonusRate: payload.maxOverflowBonusRate || baseVersion.maxOverflowBonusRate,
    };

    list.unshift(draft);
    if (fastify?.prisma?.crm?.crmConfig) {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: VERSIONS_KEY },
        create: { key: VERSIONS_KEY, value: JSON.stringify(list) },
        update: { value: JSON.stringify(list), updatedAt: new Date() },
      });
    }

    return draft;
  }

  /**
   * Cập nhật bản nháp cấu hình
   */
  static async updateDraftVersion(
    fastify: FastifyInstance,
    versionId: string,
    payload: Partial<TelesaleCompetencyConfigVersion>
  ): Promise<TelesaleCompetencyConfigVersion> {
    const list = await this.listConfigVersions(fastify);
    const index = list.findIndex((v) => v.versionId === versionId);
    if (index === -1) {
      throw new Error(`Không tìm thấy phiên bản cấu hình ID: ${versionId}`);
    }

    const current = list[index];
    if (current.status !== 'DRAFT') {
      throw new Error('Không thể chỉnh sửa trực tiếp phiên bản đã ban hành hoặc đã lưu trữ. Vui lòng tạo bản nháp mới.');
    }

    const updated: TelesaleCompetencyConfigVersion = {
      ...current,
      name: payload.name !== undefined ? payload.name : current.name,
      effectiveDate: payload.effectiveDate !== undefined ? payload.effectiveDate : current.effectiveDate,
      changelog: payload.changelog !== undefined ? payload.changelog : current.changelog,
      pillarsWeight: payload.pillarsWeight ? { ...current.pillarsWeight, ...payload.pillarsWeight } : current.pillarsWeight,
      pillarAConfig: payload.pillarAConfig ? { ...current.pillarAConfig, ...payload.pillarAConfig } : current.pillarAConfig,
      levelTargets: payload.levelTargets ? payload.levelTargets : current.levelTargets,
      tierRules: payload.tierRules ? { ...current.tierRules, ...payload.tierRules } : current.tierRules,
      standardWorkingDays: payload.standardWorkingDays !== undefined ? payload.standardWorkingDays : current.standardWorkingDays,
      maxOverflowBonusRate: payload.maxOverflowBonusRate !== undefined ? payload.maxOverflowBonusRate : current.maxOverflowBonusRate,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    if (fastify?.prisma?.crm?.crmConfig) {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: VERSIONS_KEY },
        create: { key: VERSIONS_KEY, value: JSON.stringify(list) },
        update: { value: JSON.stringify(list), updatedAt: new Date() },
      });
    }

    return updated;
  }

  /**
   * Xóa bản nháp cấu hình
   */
  static async deleteDraftVersion(fastify: FastifyInstance, versionId: string): Promise<boolean> {
    const list = await this.listConfigVersions(fastify);
    const target = list.find((v) => v.versionId === versionId);
    if (!target) {
      throw new Error(`Không tìm thấy phiên bản cấu hình ID: ${versionId}`);
    }
    if (target.status !== 'DRAFT') {
      throw new Error('Chỉ được phép xóa bản nháp (DRAFT). Không thể xóa phiên bản đã ban hành.');
    }

    const nextList = list.filter((v) => v.versionId !== versionId);
    if (fastify?.prisma?.crm?.crmConfig) {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: VERSIONS_KEY },
        create: { key: VERSIONS_KEY, value: JSON.stringify(nextList) },
        update: { value: JSON.stringify(nextList), updatedAt: new Date() },
      });
    }
    return true;
  }

  /**
   * Ban hành chính thức phiên bản cấu hình (PUBLISH)
   */
  static async publishConfigVersion(
    fastify: FastifyInstance,
    versionId: string,
    effectiveDate: string,
    publisher: { id?: number; name?: string }
  ): Promise<TelesaleCompetencyConfigVersion> {
    const list = await this.listConfigVersions(fastify);
    const index = list.findIndex((v) => v.versionId === versionId);
    if (index === -1) {
      throw new Error(`Không tìm thấy phiên bản cấu hình ID: ${versionId}`);
    }

    const target = list[index];
    const validation = this.validateConfigVersion({
      ...target,
      effectiveDate: effectiveDate || target.effectiveDate,
    });
    if (!validation.valid) {
      throw new Error(`Cấu hình chưa hợp lệ: ${validation.errors.join('; ')}`);
    }

    // Ban hành target
    const published: TelesaleCompetencyConfigVersion = {
      ...target,
      status: 'PUBLISHED',
      effectiveDate: effectiveDate || target.effectiveDate,
      publishedAt: new Date().toISOString(),
      publishedByStaffId: publisher.id,
      publishedByName: publisher.name || 'Admin',
      updatedAt: new Date().toISOString(),
    };

    // Chuyển bản trước đó cùng effectiveDate sang ARCHIVED
    for (let i = 0; i < list.length; i++) {
      if (i !== index && list[i].status === 'PUBLISHED' && list[i].effectiveDate === published.effectiveDate) {
        list[i].status = 'ARCHIVED';
        list[i].updatedAt = new Date().toISOString();
      }
    }

    list[index] = published;
    if (fastify?.prisma?.crm?.crmConfig) {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: VERSIONS_KEY },
        create: { key: VERSIONS_KEY, value: JSON.stringify(list) },
        update: { value: JSON.stringify(list), updatedAt: new Date() },
      });
    }

    return published;
  }

  /**
   * Xem trước kết quả tính điểm khi áp dụng cấu hình này cho đội ngũ Telesale
   */
  static async previewCalculation(
    fastify: FastifyInstance,
    versionId: string,
    month = '2026-10'
  ): Promise<TelesaleConfigPreviewResult> {
    const targetVersion = await this.getConfigVersion(fastify, versionId);
    if (!targetVersion) {
      throw new Error(`Không tìm thấy cấu hình với ID: ${versionId}`);
    }

    const currentActiveVersion = await this.getVersionForMonth(fastify, month);
    const staffList = await TelesaleTargetService.getActiveTelesalesStaffFromHr(fastify);

    const rows: TelesaleConfigPreviewRow[] = [];
    let totalDiff = 0;

    for (const staff of staffList) {
      const id = staff.crmStaffId || staff.legacyStaffId;
      const { tier, tenureMonths } = await this.getStaffTierAndTenure(fastify, id);

      // Điểm theo cấu hình hiện tại
      const currentEval = await this.getEvaluation(fastify, id, month);

      // Tính điểm Trụ cột A theo phiên bản xem trước
      const autoMetricsRaw = await this.getStaffAutoMetrics(fastify, staff.legacyStaffId || id, month, targetVersion);
      const pillarB = currentEval.pillarB;
      const pillarC = currentEval.pillarC;
      const pillarD = currentEval.pillarD;

      const previewTotalScore = Number((autoMetricsRaw.cappedScore + pillarB.totalScore + pillarC.totalScore + pillarD.totalScore).toFixed(2));
      const previewHistory = await this.getStaffHistoryEvaluations(fastify, id, month);
      const previewRule = this.evaluateRuleEngine(tier, tenureMonths, previewTotalScore, previewHistory, targetVersion);

      const diff = Number((previewTotalScore - currentEval.totalScore).toFixed(2));
      totalDiff += diff;

      rows.push({
        staffId: id,
        staffName: currentEval.staffName,
        currentTier: tier,
        currentScore: currentEval.totalScore,
        previewScore: previewTotalScore,
        scoreDiff: diff,
        currentStatus: currentEval.ruleEngineStatus,
        previewStatus: previewRule.ruleEngineStatus,
        pillarAScoreDiff: Number((autoMetricsRaw.cappedScore - currentEval.pillarA.cappedScore).toFixed(2)),
      });
    }

    return {
      versionId,
      month,
      staffCount: rows.length,
      rows,
      averageScoreDiff: rows.length > 0 ? Number((totalDiff / rows.length).toFixed(2)) : 0,
    };
  }

  /**
   * ---------------------------------------------------------
   * Cấu hình toàn cục Legacy Fallback (Backward Compatibility)
   * ---------------------------------------------------------
   */

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
    config?: TelesaleCompetencyGlobalConfig | TelesaleCompetencyConfigVersion
  ): TelesalePillarAMetrics {
    const cfg = config || DEFAULT_TELESALE_COMPETENCY_CONFIG;
    const fallbackStdDays = 'standardWorkingDays' in cfg ? cfg.standardWorkingDays : (cfg as TelesaleCompetencyGlobalConfig).defaultStandardWorkingDays;
    const stdDays = raw.standardWorkingDays && raw.standardWorkingDays > 0 ? raw.standardWorkingDays : (fallbackStdDays || DEFAULT_TELESALE_COMPETENCY_CONFIG.defaultStandardWorkingDays);
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

    // Tính điểm 5 chỉ số Trụ cột A
    const hasPillarAConfig = 'pillarAConfig' in cfg && cfg.pillarAConfig;
    const pAConfig = hasPillarAConfig ? (cfg as TelesaleCompetencyConfigVersion).pillarAConfig : null;
    const pillarAWeight = 'pillarsWeight' in cfg && cfg.pillarsWeight ? (cfg as TelesaleCompetencyConfigVersion).pillarsWeight.pillarAWeight : 40;

    let bookDonePart = 0;
    let newCustPart = 0;
    let revPart = 0;
    let convPart = 0;
    let callPart = 0;

    if (pAConfig) {
      // 1. KPI Done: Điểm = MIN(Done thực tế / KPI Level, 1) × Điểm tối đa
      const doneMax = pAConfig.doneKpi.maxScore || 12;
      const baseDoneScore = Math.min(1, (bookAchieve + doneAchieve) / 2) * doneMax;
      const overflowMultiplier = (pAConfig.doneKpi.allowOverflowBonus && (bookAchieve + doneAchieve) / 2 > 1)
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
      const pWeights = (cfg as TelesaleCompetencyGlobalConfig).pillarAWeights || DEFAULT_TELESALE_COMPETENCY_CONFIG.pillarAWeights;
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
   * Phân tích Rule Engine đánh giá Thăng / Giáng bậc tự động & Quy tắc Fresher
   */
  static evaluateRuleEngine(
    currentTier: TelesaleTier,
    tenureMonths: number,
    currentMonthTotalScore: number,
    historyEvaluations: Array<{ month: string; totalScore: number; isPassed: boolean }> = [],
    config?: TelesaleCompetencyGlobalConfig | TelesaleCompetencyConfigVersion
  ): {
    passingScore: number;
    isPassed: boolean;
    consecutivePassMonths: number;
    consecutiveFailMonths: number;
    ruleEngineStatus: TelesaleRuleEngineStatus;
    recommendedTier: TelesaleTier;
  } {
    const cfg = config || DEFAULT_TELESALE_COMPETENCY_CONFIG;
    const hasTierRules = 'tierRules' in cfg && cfg.tierRules;
    const tierRule = hasTierRules ? (cfg as TelesaleCompetencyConfigVersion).tierRules[currentTier] : null;
    const legacyTierConfig = ('tiers' in cfg && cfg.tiers ? cfg.tiers[currentTier] : null) || TELESALE_TIER_CONFIG[currentTier];

    const passingScore = tierRule ? tierRule.passingScore : legacyTierConfig.passingScore;
    const isPassed = currentMonthTotalScore >= passingScore;
    const consecutiveMonthsRequired = tierRule ? tierRule.consecutiveMonthsRequired : legacyTierConfig.consecutiveMonthsRequired;
    const demotionConsecutiveFailMonths = tierRule ? tierRule.demotionConsecutiveFailMonths : legacyTierConfig.demotionConsecutiveFailMonths;

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
    const nextTierMap: Record<TelesaleTier, TelesaleTier | undefined> = {
      FRESHER: 'JUNIOR',
      JUNIOR: 'MID_LEVEL',
      MID_LEVEL: 'SENIOR',
      SENIOR: undefined,
    };
    const nextTier = nextTierMap[currentTier];
    if (nextTier) {
      const nextTierRule = hasTierRules ? (cfg as TelesaleCompetencyConfigVersion).tierRules[nextTier] : null;
      const nextLegacyConfig = ('tiers' in cfg && cfg.tiers ? cfg.tiers[nextTier] : null) || TELESALE_TIER_CONFIG[nextTier];
      const minTenure = nextTierRule ? nextTierRule.minTenureMonths : (nextLegacyConfig ? nextLegacyConfig.minTenureMonths : 0);
      const nextPassing = nextTierRule ? nextTierRule.passingScore : (nextLegacyConfig ? nextLegacyConfig.passingScore : 80);

      const meetsTenure = tenureMonths >= minTenure;
      const meetsConsecutiveScores = consecutivePass >= consecutiveMonthsRequired && currentMonthTotalScore >= nextPassing;

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
    month = '2026-10',
    config?: TelesaleCompetencyGlobalConfig | TelesaleCompetencyConfigVersion,
    staffTier?: TelesaleTier
  ): Promise<TelesalePillarAMetrics> {
    const cfg = config || (await this.getVersionForMonth(fastify, month));

    let levelDoneTarget: number | undefined;
    let levelNewCustTarget: number | undefined;
    let levelRevenueTarget: number | undefined;
    let levelCallsTarget: number | undefined;
    let levelConnectedCallsTarget: number | undefined;

    if ('levelTargets' in cfg && Array.isArray(cfg.levelTargets) && staffTier) {
      const match = cfg.levelTargets.find((l) => l.tier === staffTier);
      if (match) {
        levelDoneTarget = match.doneTarget;
        levelNewCustTarget = match.newCustomersTarget;
        levelRevenueTarget = match.revenueTarget;
        levelCallsTarget = match.callsTarget;
        levelConnectedCallsTarget = match.connectedCallsTarget;
      }
    }

    try {
      const overview = await TelesaleTargetService.getOverview(fastify, month, legacyStaffId, { skipCache: true });
      const staffTarget = overview.staffTargets.find((s) => s.legacyStaffId === legacyStaffId);

      const doneCount = staffTarget?.doneActual || 0;
      const doneTarget = levelDoneTarget || staffTarget?.doneTarget || 40;
      const bookCount = Math.round(doneCount * 1.35) || (staffTarget?.bookToday ? staffTarget.bookToday * 10 : 30);
      const bookTarget = Math.round(doneTarget * 1.4);
      const newCustomersDone = Math.round(doneCount * 0.4);
      const newCustomersTarget = levelNewCustTarget || Math.round(doneTarget * 0.35);
      const actualRevenue = staffTarget?.revenueActual || doneCount * 350000;
      const revenueTarget = levelRevenueTarget || doneTarget * 350000;

      const totalCalls = staffTarget?.callActualToday ? staffTarget.callActualToday * 20 : (levelCallsTarget || 1200);
      const connectedCalls = staffTarget?.pickupActualToday ? staffTarget.pickupActualToday * 20 : (levelConnectedCallsTarget || 400);

      const actualWorkingDays = overview.teamMonth?.workDaysElapsed || 20;
      const standardWorkingDays = overview.teamMonth?.workDaysTotal || 26;

      return this.calculatePillarA(
        {
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
        },
        cfg
      );
    } catch {
      // Fallback nếu không có database legacy
      return this.calculatePillarA(
        {
          bookCount: 55,
          bookTarget: 60,
          doneCount: 42,
          doneTarget: levelDoneTarget || 40,
          newCustomersDone: 18,
          newCustomersTarget: levelNewCustTarget || 15,
          actualRevenue: 15400000,
          revenueTarget: levelRevenueTarget || 14000000,
          totalCalls: levelCallsTarget || 1350,
          connectedCalls: levelConnectedCallsTarget || 450,
          actualWorkingDays: 20,
          standardWorkingDays: 26,
        },
        cfg
      );
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
    const configVersion = await this.getVersionForMonth(fastify, month);
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

    // Luôn cập nhật lại Trụ cột A từ dữ liệu hệ thống mới nhất theo phiên bản cấu hình có hiệu lực của tháng đó
    const pillarA = await this.getStaffAutoMetrics(fastify, legacyStaffId, month, configVersion, tier);
    const pillarB = savedEval?.pillarB || this.calculatePillarB();
    const pillarC = savedEval?.pillarC || this.calculatePillarC();
    const pillarD = savedEval?.pillarD || this.calculatePillarD();

    const totalScore = Number((pillarA.cappedScore + pillarB.totalScore + pillarC.totalScore + pillarD.totalScore).toFixed(2));

    // Lịch sử tháng trước
    const history = await this.getStaffHistoryEvaluations(fastify, staffId, month);
    const ruleEngine = this.evaluateRuleEngine(tier, tenureMonths, totalScore, history, configVersion);

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
