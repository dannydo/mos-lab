import type { FastifyInstance } from 'fastify';
import type {
  CreatePilotAssessmentCriterionRequest,
  CreatePilotMaterialRequest,
  CreatePilotSessionRequest,
  CreatePilotSopStepRequest,
  PilotAiAnalyzeRequest,
  PilotAiAssessmentResponse,
  PilotAssessmentCriterion,
  PilotMaterial,
  PilotMaterialSopDocument,
  PilotSession,
  PilotSessionsListResponse,
  PilotSessionsQuery,
  PilotSessionStep,
  PilotSopEmpiricalStatsResponse,
  PilotSopStep,
  ReorderPilotAssessmentCriteriaRequest,
  ReorderPilotSopStepsRequest,
  SafeAny,
  SavePilotAssessmentRequest,
  SavePilotMaterialSopRequest,
  SaveSopPrepCategory1Request,
  SaveSopPrepCriterionRequest,
  SopPreparationCategory1Document,
  SopPrepEvidenceFile,
  StockInventoryItem,
  UpdatePilotAssessmentCriterionRequest,
  UpdatePilotMaterialRequest,
  UpdatePilotSessionRequest,
  UpdatePilotSopStepRequest,
  UploadSopPrepEvidenceRequest,
} from '@mos-lab/shared';
import {
  calculatePilotFinancials,
  DEFAULT_ASSESSMENT_CRITERIA,
  DEFAULT_BRANCH_CODE,
  DEFAULT_DARK_LASH_MATERIALS,
  DEFAULT_PILOT_CODE,
  DEFAULT_PILOT_REVENUE,
  formatPilotAssessmentCriterion,
  formatPilotMaterial,
  formatPilotSession,
  formatPilotSessionStep,
  formatPilotSopStep,
  isPilotFeatureEnabled,
  MATERIAL_SOP_CONFIG_KEY,
  pilotMediaDir,
  PilotServiceError,
  SOP_PREP_CAT1_CONFIG_KEY,
  TARGET_SESSIONS,
} from './service/pilot-core.js';
import {
  createPilotMaterial,
  deductPilotStockForSession,
  deletePilotMaterial,
  listPilotMaterials,
  listPilotStockInventory,
  seedDefaultPilotMaterials,
  updatePilotMaterial,
} from './service/pilot-materials.service.js';
import {
  createPilotSession,
  deletePilotSession,
  listPilotSessions,
  updatePilotSession,
} from './service/pilot-sessions.service.js';
import {
  checkInPilotSession,
  checkOutPilotSession,
  markPilotServiceDone,
  savePilotAfterPhoto,
  savePilotBeforePhoto,
  savePilotFeedback,
  uploadPilotPhoto,
} from './service/pilot-session-flow.service.js';
import {
  createPilotSopStep,
  deletePilotSopStep,
  ensurePilotSessionSteps,
  finishPilotSessionStep,
  getPilotSessionSteps,
  getPilotSopEmpiricalStats,
  listPilotSopSteps,
  reorderPilotSopSteps,
  resetPilotSessionStep,
  seedDefaultPilotSopSteps,
  startPilotSessionStep,
  updatePilotSessionStepNote,
  updatePilotSopStep,
} from './service/pilot-sop-steps.service.js';
import {
  aiAnalyzePilotSession,
  createPilotAssessmentCriterion,
  deletePilotAssessmentCriterion,
  listPilotAssessmentCriteria,
  reorderPilotAssessmentCriteria,
  savePilotAssessment,
  seedDefaultPilotAssessmentCriteria,
  updatePilotAssessmentCriterion,
} from './service/pilot-assessment.service.js';
import {
  getDefaultPilotMaterialSop,
  getPilotMaterialSop,
  reviewPilotMaterialSop,
  savePilotMaterialSop,
} from './service/pilot-material-sop.service.js';
import {
  deletePilotSopPrepEvidence,
  getPilotSopPreparationCategory1,
  savePilotSopPreparationCategory1,
  savePilotSopPrepCriterion,
  uploadPilotSopPrepEvidence,
} from './service/pilot-sop-prep.service.js';

export { DEFAULT_DARK_LASH_MATERIALS, pilotMediaDir, PilotServiceError };

export class PilotService {
  static readonly DEFAULT_PILOT_CODE = DEFAULT_PILOT_CODE;
  static readonly DEFAULT_BRANCH_CODE = DEFAULT_BRANCH_CODE;
  static readonly DEFAULT_PILOT_REVENUE = DEFAULT_PILOT_REVENUE;
  static readonly TARGET_SESSIONS = TARGET_SESSIONS;
  static readonly MATERIAL_SOP_CONFIG_KEY = MATERIAL_SOP_CONFIG_KEY;
  static readonly DEFAULT_ASSESSMENT_CRITERIA = DEFAULT_ASSESSMENT_CRITERIA;
  static readonly SOP_PREP_CAT1_CONFIG_KEY = SOP_PREP_CAT1_CONFIG_KEY;

  static isFeatureEnabled(fastify: FastifyInstance): Promise<boolean> {
    return isPilotFeatureEnabled(fastify);
  }

  static calculateFinancials(input: {
    revenue?: number;
    materialCost?: number;
    technicianCost?: number;
    commissionAmount?: number;
    promoAmount?: number;
    refundAmount?: number;
  }) {
    return calculatePilotFinancials(input);
  }

  static formatMaterial(raw: SafeAny): PilotMaterial {
    return formatPilotMaterial(raw);
  }

  static formatSopStep(raw: SafeAny): PilotSopStep {
    return formatPilotSopStep(raw);
  }

  static formatSessionStep(raw: SafeAny): PilotSessionStep {
    return formatPilotSessionStep(raw);
  }

  static formatAssessmentCriterion(raw: SafeAny): PilotAssessmentCriterion {
    return formatPilotAssessmentCriterion(raw);
  }

  static seedDefaultMaterials(fastify: FastifyInstance, pilotCode?: string): Promise<PilotMaterial[]> {
    return seedDefaultPilotMaterials(fastify, pilotCode);
  }

  static listMaterials(fastify: FastifyInstance, pilotCode?: string): Promise<PilotMaterial[]> {
    return listPilotMaterials(fastify, pilotCode);
  }

  static createMaterial(fastify: FastifyInstance, data: CreatePilotMaterialRequest): Promise<PilotMaterial> {
    return createPilotMaterial(fastify, data);
  }

  static updateMaterial(
    fastify: FastifyInstance,
    id: number,
    data: UpdatePilotMaterialRequest
  ): Promise<PilotMaterial> {
    return updatePilotMaterial(fastify, id, data);
  }

  static deleteMaterial(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
    return deletePilotMaterial(fastify, id);
  }

  static formatSession(raw: SafeAny): PilotSession {
    return formatPilotSession(raw);
  }

  static listSessions(fastify: FastifyInstance, query: PilotSessionsQuery): Promise<PilotSessionsListResponse> {
    return listPilotSessions(fastify, query);
  }

  static createSession(
    fastify: FastifyInstance,
    data: CreatePilotSessionRequest,
    actorStaffId?: number
  ): Promise<PilotSession> {
    return createPilotSession(fastify, data, actorStaffId);
  }

  static updateSession(fastify: FastifyInstance, id: number, data: UpdatePilotSessionRequest): Promise<PilotSession> {
    return updatePilotSession(fastify, id, data);
  }

  static checkIn(fastify: FastifyInstance, id: number, checkInAtStr?: string): Promise<PilotSession> {
    return checkInPilotSession(fastify, id, checkInAtStr);
  }

  static saveBeforePhoto(fastify: FastifyInstance, id: number, beforePhotoUrl: string): Promise<PilotSession> {
    return savePilotBeforePhoto(fastify, id, beforePhotoUrl);
  }

  static markServiceDone(fastify: FastifyInstance, id: number, serviceDoneAtStr?: string): Promise<PilotSession> {
    return markPilotServiceDone(fastify, id, serviceDoneAtStr);
  }

  static saveAfterPhoto(fastify: FastifyInstance, id: number, afterPhotoUrl: string): Promise<PilotSession> {
    return savePilotAfterPhoto(fastify, id, afterPhotoUrl);
  }

  static saveFeedback(
    fastify: FastifyInstance,
    id: number,
    feedbackRating: number,
    feedbackNote?: string | null
  ): Promise<PilotSession> {
    return savePilotFeedback(fastify, id, feedbackRating, feedbackNote);
  }

  static checkOut(fastify: FastifyInstance, id: number, checkOutAtStr?: string): Promise<PilotSession> {
    return checkOutPilotSession(fastify, id, checkOutAtStr);
  }

  static uploadPhoto(
    fastify: FastifyInstance,
    input: { photoData: string; mimeType?: string; filename?: string }
  ): Promise<{ photoUrl: string }> {
    return uploadPilotPhoto(fastify, input);
  }

  static seedDefaultSopSteps(fastify: FastifyInstance, pilotCode?: string): Promise<PilotSopStep[]> {
    return seedDefaultPilotSopSteps(fastify, pilotCode);
  }

  static listSopSteps(fastify: FastifyInstance, pilotCode?: string): Promise<PilotSopStep[]> {
    return listPilotSopSteps(fastify, pilotCode);
  }

  static createSopStep(fastify: FastifyInstance, data: CreatePilotSopStepRequest): Promise<PilotSopStep> {
    return createPilotSopStep(fastify, data);
  }

  static updateSopStep(fastify: FastifyInstance, id: number, data: UpdatePilotSopStepRequest): Promise<PilotSopStep> {
    return updatePilotSopStep(fastify, id, data);
  }

  static deleteSopStep(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
    return deletePilotSopStep(fastify, id);
  }

  static reorderSopSteps(fastify: FastifyInstance, data: ReorderPilotSopStepsRequest): Promise<PilotSopStep[]> {
    return reorderPilotSopSteps(fastify, data);
  }

  static getSopEmpiricalStats(fastify: FastifyInstance, pilotCode?: string): Promise<PilotSopEmpiricalStatsResponse> {
    return getPilotSopEmpiricalStats(fastify, pilotCode);
  }

  static seedDefaultAssessmentCriteria(
    fastify: FastifyInstance,
    pilotCode?: string
  ): Promise<PilotAssessmentCriterion[]> {
    return seedDefaultPilotAssessmentCriteria(fastify, pilotCode);
  }

  static listAssessmentCriteria(fastify: FastifyInstance, pilotCode?: string): Promise<PilotAssessmentCriterion[]> {
    return listPilotAssessmentCriteria(fastify, pilotCode);
  }

  static createAssessmentCriterion(
    fastify: FastifyInstance,
    data: CreatePilotAssessmentCriterionRequest
  ): Promise<PilotAssessmentCriterion> {
    return createPilotAssessmentCriterion(fastify, data);
  }

  static updateAssessmentCriterion(
    fastify: FastifyInstance,
    id: number,
    data: UpdatePilotAssessmentCriterionRequest
  ): Promise<PilotAssessmentCriterion> {
    return updatePilotAssessmentCriterion(fastify, id, data);
  }

  static deleteAssessmentCriterion(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
    return deletePilotAssessmentCriterion(fastify, id);
  }

  static reorderAssessmentCriteria(
    fastify: FastifyInstance,
    data: ReorderPilotAssessmentCriteriaRequest
  ): Promise<PilotAssessmentCriterion[]> {
    return reorderPilotAssessmentCriteria(fastify, data);
  }

  static saveAssessment(fastify: FastifyInstance, id: number, data: SavePilotAssessmentRequest): Promise<PilotSession> {
    return savePilotAssessment(fastify, id, data);
  }

  static aiAnalyzeSession(
    fastify: FastifyInstance,
    sessionId: number,
    data: PilotAiAnalyzeRequest
  ): Promise<PilotAiAssessmentResponse> {
    return aiAnalyzePilotSession(fastify, sessionId, data);
  }

  static ensureSessionSteps(fastify: FastifyInstance, sessionId: number): Promise<PilotSessionStep[]> {
    return ensurePilotSessionSteps(fastify, sessionId);
  }

  static getSessionSteps(fastify: FastifyInstance, sessionId: number): Promise<PilotSessionStep[]> {
    return getPilotSessionSteps(fastify, sessionId);
  }

  static startSessionStep(
    fastify: FastifyInstance,
    sessionId: number,
    stepId: number,
    startedAtClient?: string
  ): Promise<PilotSessionStep> {
    return startPilotSessionStep(fastify, sessionId, stepId, startedAtClient);
  }

  static finishSessionStep(
    fastify: FastifyInstance,
    sessionId: number,
    stepId: number,
    finishedAtClient?: string,
    note?: string
  ): Promise<PilotSessionStep> {
    return finishPilotSessionStep(fastify, sessionId, stepId, finishedAtClient, note);
  }

  static updateSessionStepNote(fastify: FastifyInstance, sessionId: number, stepId: number, note: string) {
    return updatePilotSessionStepNote(fastify, sessionId, stepId, note);
  }

  static resetSessionStep(fastify: FastifyInstance, sessionId: number, stepId: number): Promise<PilotSessionStep> {
    return resetPilotSessionStep(fastify, sessionId, stepId);
  }

  static deductStockForSession(
    fastify: FastifyInstance,
    sessionId: number
  ): Promise<{ success: boolean; deductedCount: number; isAlreadyDeducted?: boolean }> {
    return deductPilotStockForSession(fastify, sessionId);
  }

  static listStockInventory(fastify: FastifyInstance, warehouse?: string): Promise<StockInventoryItem[]> {
    return listPilotStockInventory(fastify, warehouse);
  }

  static deleteSession(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
    return deletePilotSession(fastify, id);
  }

  static getDefaultMaterialSop(materials: PilotMaterial[] = []): PilotMaterialSopDocument {
    return getDefaultPilotMaterialSop(materials);
  }

  static getMaterialSop(fastify: FastifyInstance, pilotCode = 'DARK_LASHES'): Promise<PilotMaterialSopDocument> {
    return getPilotMaterialSop(fastify, pilotCode);
  }

  static saveMaterialSop(
    fastify: FastifyInstance,
    input: SavePilotMaterialSopRequest
  ): Promise<PilotMaterialSopDocument> {
    return savePilotMaterialSop(fastify, input);
  }

  static reviewMaterialSop(
    fastify: FastifyInstance,
    input: {
      reviewerName?: string;
      decision: 'EXPERT_ENDORSE' | 'APPROVE_SCALE';
      note?: string;
    }
  ): Promise<PilotMaterialSopDocument> {
    return reviewPilotMaterialSop(fastify, input);
  }

  static getSopPreparationCategory1(
    fastify: FastifyInstance,
    pilotCode = 'DARK_LASHES'
  ): Promise<SopPreparationCategory1Document> {
    return getPilotSopPreparationCategory1(fastify, pilotCode);
  }

  static saveSopPreparationCategory1(
    fastify: FastifyInstance,
    input: SaveSopPrepCategory1Request
  ): Promise<SopPreparationCategory1Document> {
    return savePilotSopPreparationCategory1(fastify, input);
  }

  static saveSopPrepCriterion(
    fastify: FastifyInstance,
    criterionId: number,
    input: SaveSopPrepCriterionRequest
  ): Promise<SopPreparationCategory1Document> {
    return savePilotSopPrepCriterion(fastify, criterionId, input);
  }

  static uploadSopPrepEvidence(
    fastify: FastifyInstance,
    input: UploadSopPrepEvidenceRequest
  ): Promise<SopPrepEvidenceFile> {
    return uploadPilotSopPrepEvidence(fastify, input);
  }

  static deleteSopPrepEvidence(
    fastify: FastifyInstance,
    criterionId: number,
    fileId: string
  ): Promise<SopPreparationCategory1Document> {
    return deletePilotSopPrepEvidence(fastify, criterionId, fileId);
  }
}
