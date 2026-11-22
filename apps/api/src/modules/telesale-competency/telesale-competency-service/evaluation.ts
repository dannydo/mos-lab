import { FastifyInstance } from 'fastify';
import {
  TelesalePillarBMetrics,
  TelesalePillarCMetrics,
  TelesalePillarDMetrics,
  TelesaleCompetencyEvaluation,
  TelesaleCompetencyMatrixRow,
  TelesaleConfigPreviewResult,
  TelesaleConfigPreviewRow,
} from '@mos-lab/shared';
import { TelesaleTargetService } from '../../kpi/services/telesale-target.service.js';
import { EVAL_KEY_PREFIX, readCrmConfigJsonSafe, upsertCrmConfigJson } from './constants.js';
import { getConfig, getConfigVersion, getVersionForMonth } from './config.js';
import { calculatePillarB, calculatePillarC, calculatePillarD, evaluateRuleEngine } from './scoring.js';
import {
  getPromotionHistory,
  getStaffAutoMetrics,
  getStaffHistoryEvaluations,
  getStaffTierAndTenure,
} from './staff-metrics.js';

export interface SaveEvaluationPayload {
  staffId: number;
  month: string;
  pillarB: TelesalePillarBMetrics;
  pillarC: TelesalePillarCMetrics;
  pillarD: TelesalePillarDMetrics;
  evaluatedByStaffId?: number;
  evaluatedByName?: string;
}

/**
 * Lấy chi tiết đánh giá khung năng lực cho 1 nhân viên trong tháng
 */
export async function getEvaluation(
  fastify: FastifyInstance,
  staffId: number,
  month = '2026-10'
): Promise<TelesaleCompetencyEvaluation> {
  const configVersion = await getVersionForMonth(fastify, month);
  const { tier, tenureMonths, startDate } = await getStaffTierAndTenure(fastify, staffId);

  // Tìm thông tin tên & legacyStaffId từ danh sách Telesales HR
  const telesalesStaff = await TelesaleTargetService.getActiveTelesalesStaffFromHr(fastify);
  const staffMeta = telesalesStaff.find((s) => s.crmStaffId === staffId || s.legacyStaffId === staffId);
  const staffName = staffMeta?.name || `Telesales #${staffId}`;
  const legacyStaffId = staffMeta?.legacyStaffId || staffId;
  const avatarUrl = staffMeta?.avatarUrl || undefined;

  // Đọc đánh giá đã lưu nếu có
  const evalKey = `${EVAL_KEY_PREFIX}${staffId}:${month}`;
  const savedEval = await readCrmConfigJsonSafe<TelesaleCompetencyEvaluation>(fastify, evalKey);

  // Luôn cập nhật lại Trụ cột A từ dữ liệu hệ thống mới nhất theo phiên bản cấu hình có hiệu lực của tháng đó
  const pillarA = await getStaffAutoMetrics(fastify, legacyStaffId, month, configVersion, tier);
  const pillarB = savedEval?.pillarB || calculatePillarB();
  const pillarC = savedEval?.pillarC || calculatePillarC();
  const pillarD = savedEval?.pillarD || calculatePillarD();

  const totalScore = Number(
    (pillarA.cappedScore + pillarB.totalScore + pillarC.totalScore + pillarD.totalScore).toFixed(2)
  );

  // Lịch sử tháng trước
  const history = await getStaffHistoryEvaluations(fastify, staffId, month);
  const ruleEngine = evaluateRuleEngine(tier, tenureMonths, totalScore, history, configVersion);

  // Lịch sử thăng/giáng bậc
  const promotionHistory = await getPromotionHistory(fastify, staffId);

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
export async function saveEvaluation(
  fastify: FastifyInstance,
  payload: SaveEvaluationPayload
): Promise<TelesaleCompetencyEvaluation> {
  const { staffId, month } = payload;
  if (!staffId || !month) {
    throw new Error('Thiếu staffId hoặc month để lưu đánh giá');
  }

  // Bắt buộc minh chứng cho Trụ cột D nếu có trừ điểm hoặc đánh giá dưới 13 điểm
  if (payload.pillarD.totalScore < 14 && !payload.pillarD.mandatoryEvidenceUrl && !payload.pillarD.evidenceNotes) {
    throw new Error(
      'Quy chuẩn Trụ cột D bắt buộc đính kèm minh chứng (Link ảnh hoặc Ghi chú sự vụ cụ thể) khi đánh giá'
    );
  }

  // Lấy lại Trụ cột A tươi mới nhất
  const telesalesStaff = await TelesaleTargetService.getActiveTelesalesStaffFromHr(fastify);
  const staffMeta = telesalesStaff.find((s) => s.crmStaffId === staffId || s.legacyStaffId === staffId);
  const legacyStaffId = staffMeta?.legacyStaffId || staffId;

  const pillarA = await getStaffAutoMetrics(fastify, legacyStaffId, month);
  const pillarB = calculatePillarB(payload.pillarB?.skills);
  const pillarC = calculatePillarC(payload.pillarC);
  const pillarD = calculatePillarD(payload.pillarD);

  const totalScore = Number(
    (pillarA.cappedScore + pillarB.totalScore + pillarC.totalScore + pillarD.totalScore).toFixed(2)
  );

  const config = await getConfig(fastify);
  const { tier, tenureMonths, startDate } = await getStaffTierAndTenure(fastify, staffId);
  const history = await getStaffHistoryEvaluations(fastify, staffId, month);
  const ruleEngine = evaluateRuleEngine(tier, tenureMonths, totalScore, history, config);

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

  const key = `${EVAL_KEY_PREFIX}${staffId}:${month}`;
  await upsertCrmConfigJson(fastify, key, evaluation);

  return evaluation;
}

/**
 * Lấy Ma Trận Năng Lực Toàn Đội Telesale
 */
export async function listTeamMatrix(
  fastify: FastifyInstance,
  month = '2026-10'
): Promise<TelesaleCompetencyMatrixRow[]> {
  const staffList = await TelesaleTargetService.getActiveTelesalesStaffFromHr(fastify);
  const matrix: TelesaleCompetencyMatrixRow[] = [];

  for (const staff of staffList) {
    const id = staff.crmStaffId || staff.legacyStaffId;
    const evaluation = await getEvaluation(fastify, id, month);

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
 * Xem trước kết quả tính điểm khi áp dụng cấu hình này cho đội ngũ Telesale
 */
export async function previewCalculation(
  fastify: FastifyInstance,
  versionId: string,
  month = '2026-10'
): Promise<TelesaleConfigPreviewResult> {
  const targetVersion = await getConfigVersion(fastify, versionId);
  if (!targetVersion) {
    throw new Error(`Không tìm thấy cấu hình với ID: ${versionId}`);
  }

  await getVersionForMonth(fastify, month);
  const staffList = await TelesaleTargetService.getActiveTelesalesStaffFromHr(fastify);

  const rows: TelesaleConfigPreviewRow[] = [];
  let totalDiff = 0;

  for (const staff of staffList) {
    const id = staff.crmStaffId || staff.legacyStaffId;
    const { tier, tenureMonths } = await getStaffTierAndTenure(fastify, id);

    // Điểm theo cấu hình hiện tại
    const currentEval = await getEvaluation(fastify, id, month);

    // Tính điểm Trụ cột A theo phiên bản xem trước
    const autoMetricsRaw = await getStaffAutoMetrics(fastify, staff.legacyStaffId || id, month, targetVersion);
    const pillarB = currentEval.pillarB;
    const pillarC = currentEval.pillarC;
    const pillarD = currentEval.pillarD;

    const previewTotalScore = Number(
      (autoMetricsRaw.cappedScore + pillarB.totalScore + pillarC.totalScore + pillarD.totalScore).toFixed(2)
    );
    const previewHistory = await getStaffHistoryEvaluations(fastify, id, month);
    const previewRule = evaluateRuleEngine(tier, tenureMonths, previewTotalScore, previewHistory, targetVersion);

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
