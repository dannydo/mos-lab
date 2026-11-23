import { FastifyInstance } from 'fastify';
import {
  TelesaleTier,
  TelesaleSkillKey,
  TelesalePillarAMetrics,
  TelesalePillarBMetrics,
  TelesalePillarCMetrics,
  TelesalePillarDMetrics,
  TelesaleCompetencyEvaluation,
  TelesaleCompetencyMatrixRow,
  TelesaleCompetencyGlobalConfig,
  TelesalePromotionHistoryItem,
  TelesaleCompetencyConfigVersion,
  TelesaleConfigValidationResult,
  TelesaleConfigPreviewResult,
} from '@mos-lab/shared';
import {
  listConfigVersions,
  getConfigVersion,
  getVersionForMonth,
  validateConfigVersion,
  createDraftVersion,
  updateDraftVersion,
  deleteDraftVersion,
  publishConfigVersion,
  getConfig,
  saveConfig,
} from './telesale-competency-service/config.js';
import {
  calculatePillarA,
  calculatePillarB,
  calculatePillarC,
  calculatePillarD,
  evaluateRuleEngine,
  type PillarARawInput,
  type PillarCInput,
  type PillarDInput,
  type HistoryEvaluationSummary,
  type RuleEngineEvaluationResult,
} from './telesale-competency-service/scoring.js';
import {
  getStaffTierAndTenure,
  getStaffAutoMetrics,
  getStaffHistoryEvaluations,
  getPromotionHistory,
  executePromotionAction,
  type StaffTierAndTenure,
  type PromotionActionType,
} from './telesale-competency-service/staff-metrics.js';
import {
  getEvaluation,
  saveEvaluation,
  listTeamMatrix,
  previewCalculation,
  type SaveEvaluationPayload,
} from './telesale-competency-service/evaluation.js';
import type { OperatorActor } from './telesale-competency-service/constants.js';

export type {
  OperatorActor,
  PillarARawInput,
  PillarCInput,
  PillarDInput,
  HistoryEvaluationSummary,
  RuleEngineEvaluationResult,
  StaffTierAndTenure,
  PromotionActionType,
  SaveEvaluationPayload,
};

export class TelesaleCompetencyService {
  static listConfigVersions(fastify?: FastifyInstance): Promise<TelesaleCompetencyConfigVersion[]> {
    return listConfigVersions(fastify);
  }

  static getConfigVersion(
    fastify: FastifyInstance | undefined,
    versionId: string
  ): Promise<TelesaleCompetencyConfigVersion | null> {
    return getConfigVersion(fastify, versionId);
  }

  static getVersionForMonth(
    fastify: FastifyInstance | undefined,
    month = '2026-10'
  ): Promise<TelesaleCompetencyConfigVersion> {
    return getVersionForMonth(fastify, month);
  }

  static validateConfigVersion(version: TelesaleCompetencyConfigVersion): TelesaleConfigValidationResult {
    return validateConfigVersion(version);
  }

  static createDraftVersion(
    fastify: FastifyInstance,
    payload: Partial<TelesaleCompetencyConfigVersion>,
    author: { id?: number; name?: string }
  ): Promise<TelesaleCompetencyConfigVersion> {
    return createDraftVersion(fastify, payload, author);
  }

  static updateDraftVersion(
    fastify: FastifyInstance,
    versionId: string,
    payload: Partial<TelesaleCompetencyConfigVersion>
  ): Promise<TelesaleCompetencyConfigVersion> {
    return updateDraftVersion(fastify, versionId, payload);
  }

  static deleteDraftVersion(fastify: FastifyInstance, versionId: string): Promise<boolean> {
    return deleteDraftVersion(fastify, versionId);
  }

  static publishConfigVersion(
    fastify: FastifyInstance,
    versionId: string,
    effectiveDate: string,
    publisher: { id?: number; name?: string }
  ): Promise<TelesaleCompetencyConfigVersion> {
    return publishConfigVersion(fastify, versionId, effectiveDate, publisher);
  }

  static previewCalculation(
    fastify: FastifyInstance,
    versionId: string,
    month = '2026-10'
  ): Promise<TelesaleConfigPreviewResult> {
    return previewCalculation(fastify, versionId, month);
  }

  static getConfig(fastify?: FastifyInstance): Promise<TelesaleCompetencyGlobalConfig> {
    return getConfig(fastify);
  }

  static saveConfig(
    fastify: FastifyInstance,
    config: Partial<TelesaleCompetencyGlobalConfig>
  ): Promise<TelesaleCompetencyGlobalConfig> {
    return saveConfig(fastify, config);
  }

  static calculatePillarA(
    raw: PillarARawInput,
    config?: TelesaleCompetencyGlobalConfig | TelesaleCompetencyConfigVersion
  ): TelesalePillarAMetrics {
    return calculatePillarA(raw, config);
  }

  static calculatePillarB(
    skillsInput?: Partial<Record<TelesaleSkillKey, { score: number; notes?: string }>>
  ): TelesalePillarBMetrics {
    return calculatePillarB(skillsInput);
  }

  static calculatePillarC(input?: PillarCInput): TelesalePillarCMetrics {
    return calculatePillarC(input);
  }

  static calculatePillarD(input?: PillarDInput): TelesalePillarDMetrics {
    return calculatePillarD(input);
  }

  static evaluateRuleEngine(
    currentTier: TelesaleTier,
    tenureMonths: number,
    currentMonthTotalScore: number,
    historyEvaluations: Array<{ month: string; totalScore: number; isPassed: boolean }> = [],
    config?: TelesaleCompetencyGlobalConfig | TelesaleCompetencyConfigVersion
  ): RuleEngineEvaluationResult {
    return evaluateRuleEngine(currentTier, tenureMonths, currentMonthTotalScore, historyEvaluations, config);
  }

  static getStaffTierAndTenure(
    fastify: FastifyInstance,
    staffId: number
  ): Promise<{ tier: TelesaleTier; tenureMonths: number; startDate?: string }> {
    return getStaffTierAndTenure(fastify, staffId);
  }

  static getStaffAutoMetrics(
    fastify: FastifyInstance,
    legacyStaffId: number,
    month = '2026-10',
    config?: TelesaleCompetencyGlobalConfig | TelesaleCompetencyConfigVersion,
    staffTier?: TelesaleTier
  ): Promise<TelesalePillarAMetrics> {
    return getStaffAutoMetrics(fastify, legacyStaffId, month, config, staffTier);
  }

  static getStaffHistoryEvaluations(
    fastify: FastifyInstance,
    staffId: number,
    currentMonth: string
  ): Promise<Array<{ month: string; totalScore: number; isPassed: boolean }>> {
    return getStaffHistoryEvaluations(fastify, staffId, currentMonth);
  }

  static getEvaluation(
    fastify: FastifyInstance,
    staffId: number,
    month = '2026-10'
  ): Promise<TelesaleCompetencyEvaluation> {
    return getEvaluation(fastify, staffId, month);
  }

  static saveEvaluation(
    fastify: FastifyInstance,
    payload: SaveEvaluationPayload
  ): Promise<TelesaleCompetencyEvaluation> {
    return saveEvaluation(fastify, payload);
  }

  static listTeamMatrix(fastify: FastifyInstance, month = '2026-10'): Promise<TelesaleCompetencyMatrixRow[]> {
    return listTeamMatrix(fastify, month);
  }

  static executePromotionAction(
    fastify: FastifyInstance,
    staffId: number,
    action: 'PROMOTED' | 'DEMOTED' | 'RETAINED',
    toTier: TelesaleTier,
    operator: { id?: number; name?: string },
    reason?: string,
    effectiveMonth = '2026-10'
  ): Promise<{ success: boolean; newTier: TelesaleTier; message: string }> {
    return executePromotionAction(fastify, staffId, action, toTier, operator, reason, effectiveMonth);
  }

  static getPromotionHistory(fastify: FastifyInstance, staffId: number): Promise<TelesalePromotionHistoryItem[]> {
    return getPromotionHistory(fastify, staffId);
  }
}
