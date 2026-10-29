import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../generated/crm-client/index.js';
import type {
  CreatePilotMaterialRequest,
  CreatePilotSessionRequest,
  PilotMaterial,
  PilotMaterialItemType,
  StockInventoryItem,
  DarkLashesSessionStatus,
  PilotMetricsSummary,
  PilotSession,
  PilotSessionsListResponse,
  PilotSessionsQuery,
  SafeAny,
  UpdatePilotMaterialRequest,
  UpdatePilotSessionRequest,
  PilotSopStep,
  CreatePilotSopStepRequest,
  UpdatePilotSopStepRequest,
  ReorderPilotSopStepsRequest,
  PilotSessionStep,
  PilotSessionStepStatus,
  PilotAssessmentCriterion,
  CreatePilotAssessmentCriterionRequest,
  UpdatePilotAssessmentCriterionRequest,
  ReorderPilotAssessmentCriteriaRequest,
  PilotCriterionEvaluation,
  SavePilotAssessmentRequest,
  PilotAiAssessment,
  PilotAiAnalyzeRequest,
  PilotAiAssessmentResponse,
  PilotMaterialSopDocument,
  PilotSolutionNormItem,
  PilotGlueRodStandardItem,
  PilotSanitizationItem,
  SavePilotMaterialSopRequest,
  PilotSopEmpiricalStatsResponse,
  PilotSopStepEmpiricalStat,
  PilotStepSampleSession,
  SopPreparationCategory1Document,
  SopPrepCriterionData,
  SopPrepEvidenceFile,
  SopPrepFileType,
  SaveSopPrepCategory1Request,
  SaveSopPrepCriterionRequest,
  UploadSopPrepEvidenceRequest,
} from '@mos-lab/shared';
import { DEFAULT_DARK_LASH_SOP_STEPS, DEFAULT_SOP_PREPARATION_CATEGORY_1 } from '@mos-lab/shared';
import { PilotAiService } from './pilot-ai.service.js';

export function pilotMediaDir(): string {
  const configured = String(process.env.PILOT_MEDIA_DIR || '').trim();
  if (configured) return resolve(configured);
  if (process.env.NODE_ENV === 'production') return '/home/web/mos-data/pilot-media';
  return resolve(process.cwd(), 'scratch', 'pilot-media');
}

export class PilotServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'PILOT_SERVICE_ERROR'
  ) {
    super(message);
    this.name = 'PilotServiceError';
  }
}

export const DEFAULT_DARK_LASH_MATERIALS = [
  {
    name: 'Thuốc uốn số 1 (Perming Cream)',
    purchasePrice: 450000,
    volume: 15,
    unit: 'ml',
    costPerUnit: 30000,
  },
  {
    name: 'Thuốc định hình số 2 (Setting Cream)',
    purchasePrice: 450000,
    volume: 15,
    unit: 'ml',
    costPerUnit: 30000,
  },
  {
    name: 'Cây chải mi kim loại',
    purchasePrice: 35000,
    volume: 1,
    unit: 'cây',
    costPerUnit: 35000,
  },
  {
    name: 'Cây chải mi nhựa',
    purchasePrice: 3000,
    volume: 1,
    unit: 'cây',
    costPerUnit: 3000,
  },
  {
    name: 'Keratin dưỡng mi',
    purchasePrice: 380000,
    volume: 20,
    unit: 'ml',
    costPerUnit: 19000,
  },
  {
    name: 'Kềm PH (Kiểm tra độ pH)',
    purchasePrice: 50000,
    volume: 50,
    unit: 'lần',
    costPerUnit: 1000,
  },
  {
    name: 'Eye Pad (Miếng dán mi dưới)',
    purchasePrice: 6000,
    volume: 1,
    unit: 'cặp',
    costPerUnit: 6000,
  },
  {
    name: 'Giấy giữ mi con',
    purchasePrice: 20000,
    volume: 50,
    unit: 'miếng',
    costPerUnit: 400,
  },
  {
    name: 'Thuốc nhuộm mi (Lash Tint)',
    purchasePrice: 240000,
    volume: 15,
    unit: 'ml',
    costPerUnit: 16000,
  },
  {
    name: 'Dụng cụ vệ sinh mi',
    purchasePrice: 5000,
    volume: 1,
    unit: 'bộ',
    costPerUnit: 5000,
  },
  {
    name: 'Serum dưỡng bóng mi (Glossy Serum)',
    purchasePrice: 380000,
    volume: 20,
    unit: 'ml',
    costPerUnit: 19000,
  },
  {
    name: 'Miếng silicon nâng mi (Silicon Pads)',
    purchasePrice: 80000,
    volume: 5,
    unit: 'cặp',
    costPerUnit: 16000,
  },
  {
    name: 'Keo bắt mi không cồn (Lash Balm Glue)',
    purchasePrice: 240000,
    volume: 10,
    unit: 'g',
    costPerUnit: 24000,
  },
];

export class PilotService {
  static readonly DEFAULT_PILOT_CODE = 'DARK_LASHES';
  static readonly DEFAULT_BRANCH_CODE = 'detham';
  static readonly DEFAULT_PILOT_REVENUE = 990000;
  static readonly TARGET_SESSIONS = 30;
  static readonly MATERIAL_SOP_CONFIG_KEY = 'PILOT_DARK_LASHES_MATERIAL_SOP';

  static async isFeatureEnabled(fastify: FastifyInstance): Promise<boolean> {
    if (process.env.ENABLE_PILOT_DARK_LASHES === 'false') {
      return false;
    }
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'ENABLE_PILOT_DARK_LASHES' },
      });
      if (!config) return true;
      if (typeof config.value === 'boolean') return config.value;
      if (typeof config.value === 'string') {
        const trimmed = config.value.trim().toLowerCase();
        return trimmed !== 'false' && trimmed !== '0' && trimmed !== 'off';
      }
      return true;
    } catch {
      return true;
    }
  }

  static calculateFinancials(input: {
    revenue?: number;
    materialCost?: number;
    technicianCost?: number;
    commissionAmount?: number;
    promoAmount?: number;
    refundAmount?: number;
  }) {
    const revenue = Math.max(0, input.revenue ?? this.DEFAULT_PILOT_REVENUE);
    const materialCost = Math.max(0, input.materialCost ?? 0);
    const technicianCost = Math.max(0, input.technicianCost ?? 0);
    const commissionAmount = Math.max(0, input.commissionAmount ?? 0);
    const promoAmount = Math.max(0, input.promoAmount ?? 0);
    const refundAmount = Math.max(0, input.refundAmount ?? 0);

    const totalDirectCost = materialCost + technicianCost + commissionAmount + promoAmount + refundAmount;
    const contributionMargin = revenue - totalDirectCost;

    return {
      revenue,
      materialCost,
      technicianCost,
      commissionAmount,
      promoAmount,
      refundAmount,
      totalDirectCost,
      contributionMargin,
    };
  }

  static formatMaterial(raw: SafeAny): PilotMaterial {
    return {
      id: raw.id,
      pilotCode: raw.pilotCode,
      name: raw.name,
      purchasePrice: Number(raw.purchasePrice),
      volume: Number(raw.volume),
      unit: raw.unit,
      costPerUnit: Number(raw.costPerUnit),
      imageUrl: raw.imageUrl ?? null,
      itemType: (raw.itemType as PilotMaterialItemType) || 'CONSUMABLE',
      isActive: Boolean(raw.isActive),
      createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt),
    };
  }

  static formatSopStep(raw: SafeAny): PilotSopStep {
    return {
      id: raw.id,
      pilotCode: raw.pilotCode,
      name: raw.name,
      description: raw.description ?? null,
      stepOrder: Number(raw.stepOrder ?? 0),
      targetMinutes: raw.targetMinutes !== null && raw.targetMinutes !== undefined ? Number(raw.targetMinutes) : null,
      isActive: Boolean(raw.isActive),
      createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt || ''),
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt || ''),
    };
  }

  static formatSessionStep(raw: SafeAny): PilotSessionStep {
    return {
      id: raw.id,
      sessionId: raw.sessionId,
      stepTemplateId:
        raw.stepTemplateId !== null && raw.stepTemplateId !== undefined ? Number(raw.stepTemplateId) : null,
      stepName: raw.stepName,
      stepOrder: Number(raw.stepOrder ?? 0),
      status: (raw.status as PilotSessionStepStatus) || 'PENDING',
      startedAt:
        raw.startedAt instanceof Date ? raw.startedAt.toISOString() : raw.startedAt ? String(raw.startedAt) : null,
      finishedAt:
        raw.finishedAt instanceof Date ? raw.finishedAt.toISOString() : raw.finishedAt ? String(raw.finishedAt) : null,
      durationSeconds:
        raw.durationSeconds !== null && raw.durationSeconds !== undefined ? Number(raw.durationSeconds) : null,
      note: raw.note ?? null,
      createdAt:
        raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt ? String(raw.createdAt) : undefined,
      updatedAt:
        raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt ? String(raw.updatedAt) : undefined,
    };
  }

  static formatAssessmentCriterion(raw: SafeAny): PilotAssessmentCriterion {
    return {
      id: raw.id,
      pilotCode: raw.pilotCode,
      name: raw.name,
      description: raw.description ?? null,
      stepOrder: Number(raw.stepOrder ?? 0),
      isActive: Boolean(raw.isActive),
      createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt || ''),
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt || ''),
    };
  }

  static async seedDefaultMaterials(fastify: FastifyInstance, pilotCode?: string): Promise<PilotMaterial[]> {
    const code = pilotCode || this.DEFAULT_PILOT_CODE;
    const existing = await fastify.prisma.crm.crmPilotMaterial.findMany({
      where: { pilotCode: code },
      select: { name: true },
    });

    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
    const existingNorms = new Set(existing.map((m: { name: string }) => normalize(m.name)));

    const missing = DEFAULT_DARK_LASH_MATERIALS.filter((m) => !existingNorms.has(normalize(m.name)));

    if (missing.length > 0) {
      await fastify.prisma.crm.crmPilotMaterial.createMany({
        data: missing.map((m) => ({
          pilotCode: code,
          name: m.name,
          purchasePrice: m.purchasePrice,
          volume: m.volume,
          unit: m.unit,
          costPerUnit: m.costPerUnit,
          isActive: true,
        })),
      });
    }

    const all = await fastify.prisma.crm.crmPilotMaterial.findMany({
      where: { pilotCode: code, isActive: true },
      orderBy: { id: 'asc' },
    });
    return all.map((r: SafeAny) => this.formatMaterial(r));
  }

  static async listMaterials(fastify: FastifyInstance, pilotCode?: string): Promise<PilotMaterial[]> {
    const code = pilotCode || this.DEFAULT_PILOT_CODE;
    const count = await fastify.prisma.crm.crmPilotMaterial.count({
      where: { pilotCode: code },
    });

    if (count === 0) {
      await fastify.prisma.crm.crmPilotMaterial.createMany({
        data: DEFAULT_DARK_LASH_MATERIALS.map((m) => ({
          pilotCode: code,
          name: m.name,
          purchasePrice: m.purchasePrice,
          volume: m.volume,
          unit: m.unit,
          costPerUnit: m.costPerUnit,
          isActive: true,
        })),
      });
    } else {
      try {
        await this.seedDefaultMaterials(fastify, code);
      } catch {
        // Safe fallback if partial mock in test environment
      }
    }

    const records = await fastify.prisma.crm.crmPilotMaterial.findMany({
      where: { pilotCode: code, isActive: true },
      orderBy: { id: 'asc' },
    });

    return records.map((r: SafeAny) => this.formatMaterial(r));
  }

  static async createMaterial(fastify: FastifyInstance, data: CreatePilotMaterialRequest): Promise<PilotMaterial> {
    if (!data.name || !data.name.trim()) {
      throw new PilotServiceError('Tên vật tư không được để trống.');
    }
    if (!data.unit || !data.unit.trim()) {
      throw new PilotServiceError('Đơn vị tính không được để trống.');
    }
    const purchasePrice = Math.max(0, data.purchasePrice ?? 0);
    const volume = Math.max(0.01, data.volume ?? 1);
    const costPerUnit =
      data.costPerUnit !== undefined && data.costPerUnit >= 0 ? data.costPerUnit : Math.round(purchasePrice / volume);

    const record = await fastify.prisma.crm.crmPilotMaterial.create({
      data: {
        pilotCode: data.pilotCode || this.DEFAULT_PILOT_CODE,
        name: data.name.trim(),
        purchasePrice,
        volume,
        unit: data.unit.trim(),
        costPerUnit,
        imageUrl: data.imageUrl ? data.imageUrl.trim() : null,
        itemType: data.itemType || 'CONSUMABLE',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return this.formatMaterial(record);
  }

  static async updateMaterial(
    fastify: FastifyInstance,
    id: number,
    data: UpdatePilotMaterialRequest
  ): Promise<PilotMaterial> {
    const existing = await fastify.prisma.crm.crmPilotMaterial.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy vật tư tương ứng.', 404);
    }

    const updatePayload: Record<string, SafeAny> = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new PilotServiceError('Tên vật tư không được để trống.');
      updatePayload.name = data.name.trim();
    }
    if (data.unit !== undefined) {
      if (!data.unit.trim()) throw new PilotServiceError('Đơn vị tính không được để trống.');
      updatePayload.unit = data.unit.trim();
    }
    if (data.purchasePrice !== undefined) {
      updatePayload.purchasePrice = Math.max(0, data.purchasePrice);
    }
    if (data.volume !== undefined) {
      updatePayload.volume = Math.max(0.01, data.volume);
    }
    if (data.costPerUnit !== undefined) {
      updatePayload.costPerUnit = Math.max(0, data.costPerUnit);
    } else if (data.purchasePrice !== undefined || data.volume !== undefined) {
      const price = data.purchasePrice !== undefined ? data.purchasePrice : Number(existing.purchasePrice);
      const vol = data.volume !== undefined ? data.volume : Number(existing.volume);
      updatePayload.costPerUnit = vol > 0 ? Math.round(price / vol) : price;
    }
    if (data.imageUrl !== undefined) {
      updatePayload.imageUrl = data.imageUrl ? data.imageUrl.trim() : null;
    }
    if (data.itemType !== undefined) {
      updatePayload.itemType = data.itemType;
    }
    if (data.isActive !== undefined) {
      updatePayload.isActive = data.isActive;
    }

    const updated = await fastify.prisma.crm.crmPilotMaterial.update({
      where: { id },
      data: updatePayload,
    });

    return this.formatMaterial(updated);
  }

  static async deleteMaterial(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
    const existing = await fastify.prisma.crm.crmPilotMaterial.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy vật tư tương ứng.', 404);
    }

    await fastify.prisma.crm.crmPilotMaterial.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  static formatSession(raw: SafeAny): PilotSession {
    const sessionDateStr =
      raw.sessionDate instanceof Date
        ? raw.sessionDate.toISOString().split('T')[0]
        : String(raw.sessionDate || '').slice(0, 10);

    const materials = Array.isArray(raw.materials)
      ? raw.materials.map((m: SafeAny) => ({
          id: m.id,
          sessionId: m.sessionId,
          materialId: m.materialId,
          materialName: m.materialName || m.material?.name || '',
          unit: m.unit || m.material?.unit || '',
          usageAmount: Number(m.usageAmount),
          costPerUnit: Number(m.costPerUnit),
          calculatedCost: Number(m.calculatedCost),
        }))
      : [];

    const checkInAtStr =
      raw.checkInAt instanceof Date ? raw.checkInAt.toISOString() : raw.checkInAt ? String(raw.checkInAt) : null;

    const serviceDoneAtStr =
      raw.serviceDoneAt instanceof Date
        ? raw.serviceDoneAt.toISOString()
        : raw.serviceDoneAt
          ? String(raw.serviceDoneAt)
          : null;

    const checkOutAtStr =
      raw.checkOutAt instanceof Date ? raw.checkOutAt.toISOString() : raw.checkOutAt ? String(raw.checkOutAt) : null;

    const assessedAtStr =
      raw.assessedAt instanceof Date ? raw.assessedAt.toISOString() : raw.assessedAt ? String(raw.assessedAt) : null;

    let assessmentCriteria: PilotCriterionEvaluation[] | null = null;
    if (raw.assessmentCriteriaJson) {
      try {
        assessmentCriteria =
          typeof raw.assessmentCriteriaJson === 'string'
            ? JSON.parse(raw.assessmentCriteriaJson)
            : raw.assessmentCriteriaJson;
      } catch {
        assessmentCriteria = null;
      }
    }

    let aiAssessment: PilotAiAssessment | null = null;
    if (raw.aiAssessmentJson) {
      try {
        aiAssessment =
          typeof raw.aiAssessmentJson === 'string' ? JSON.parse(raw.aiAssessmentJson) : raw.aiAssessmentJson;
      } catch {
        aiAssessment = null;
      }
    }

    const steps = Array.isArray(raw.steps) ? raw.steps.map((s: SafeAny) => this.formatSessionStep(s)) : [];

    let totalTechnicalDurationSeconds = 0;
    for (const step of steps) {
      if (step.durationSeconds && step.durationSeconds > 0) {
        totalTechnicalDurationSeconds += step.durationSeconds;
      }
    }

    return {
      id: raw.id,
      pilotCode: raw.pilotCode,
      branchCode: raw.branchCode,
      customerName: raw.customerName,
      customerPhone: raw.customerPhone,
      sessionDate: sessionDateStr,
      bookingTime: raw.bookingTime ?? null,
      bookingNote: raw.bookingNote ?? null,
      technicianName: raw.technicianName ?? null,
      status: (raw.status || 'BOOKED') as DarkLashesSessionStatus,
      checkInAt: checkInAtStr,
      assessmentStatus: (raw.assessmentStatus as 'PASS' | 'FAIL' | null) ?? null,
      assessmentReason: raw.assessmentReason ?? null,
      assessmentNotes: raw.assessmentNotes ?? null,
      assessmentCriteria,
      assessedAt: assessedAtStr,
      aiAssessment,
      beforePhotoUrl: raw.beforePhotoUrl ?? null,
      serviceDoneAt: serviceDoneAtStr,
      afterPhotoUrl: raw.afterPhotoUrl ?? null,
      feedbackRating:
        raw.feedbackRating !== null && raw.feedbackRating !== undefined ? Number(raw.feedbackRating) : null,
      feedbackNote: raw.feedbackNote ?? null,
      checkOutAt: checkOutAtStr,
      totalDurationMinutes:
        raw.totalDurationMinutes !== null && raw.totalDurationMinutes !== undefined
          ? Number(raw.totalDurationMinutes)
          : null,
      revenue: Number(raw.revenue),
      materialCost: Number(raw.materialCost),
      technicianCost: Number(raw.technicianCost),
      commissionAmount: Number(raw.commissionAmount),
      promoAmount: Number(raw.promoAmount),
      refundAmount: Number(raw.refundAmount),
      totalDirectCost: Number(raw.totalDirectCost),
      contributionMargin: Number(raw.contributionMargin),
      followUp24hStatus: raw.followUp24hStatus as PilotSession['followUp24hStatus'],
      followUp72hStatus: raw.followUp72hStatus as PilotSession['followUp72hStatus'],
      csatScore: raw.csatScore !== null && raw.csatScore !== undefined ? Number(raw.csatScore) : null,
      issues: raw.issues ?? null,
      notes: raw.notes ?? null,
      source: raw.source ?? null,
      createdByStaffId: raw.createdByStaffId ?? null,
      isStockDeducted: Boolean(raw.isStockDeducted),
      createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt),
      materials,
      steps,
      totalTechnicalDurationSeconds: totalTechnicalDurationSeconds > 0 ? totalTechnicalDurationSeconds : null,
    };
  }

  static async listSessions(fastify: FastifyInstance, query: PilotSessionsQuery): Promise<PilotSessionsListResponse> {
    const pilotCode = query.pilotCode || this.DEFAULT_PILOT_CODE;
    const where: Record<string, SafeAny> = { pilotCode };

    if (query.branchCode) {
      where.branchCode = query.branchCode;
    }

    if (query.dateFrom || query.dateTo) {
      where.sessionDate = {};
      if (query.dateFrom) {
        where.sessionDate.gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
      }
      if (query.dateTo) {
        where.sessionDate.lte = new Date(`${query.dateTo}T23:59:59.999Z`);
      }
    }

    const records = await fastify.prisma.crm.crmPilotSession.findMany({
      where,
      include: {
        materials: true,
        steps: { orderBy: { stepOrder: 'asc' } },
      },
      orderBy: [{ sessionDate: 'desc' }, { id: 'desc' }],
    });

    const sessions = records.map((r: SafeAny) => this.formatSession(r));

    // Compute metrics
    const completedSessions = sessions.length;
    const targetSessions = this.TARGET_SESSIONS;
    const progressPercent = Math.min(100, Math.round((completedSessions / targetSessions) * 100));

    let totalRevenue = 0;
    let totalDirectCost = 0;
    let totalConsumablesCost = 0;
    let totalContribution = 0;
    let totalCsat = 0;
    let ratedSessionsCount = 0;
    let pendingFollowUp24hCount = 0;
    let pendingFollowUp72hCount = 0;

    for (const s of sessions) {
      totalRevenue += s.revenue;
      totalDirectCost += s.totalDirectCost;
      totalConsumablesCost += s.materialCost;
      totalContribution += s.contributionMargin;

      if (s.csatScore !== null && s.csatScore > 0) {
        totalCsat += s.csatScore;
        ratedSessionsCount++;
      }

      if (s.followUp24hStatus === 'PENDING') {
        pendingFollowUp24hCount++;
      }
      if (s.followUp72hStatus === 'PENDING') {
        pendingFollowUp72hCount++;
      }
    }

    const avgContributionPerSession = completedSessions > 0 ? Math.round(totalContribution / completedSessions) : 0;
    const avgContributionMarginPct =
      totalRevenue > 0 ? Number(((totalContribution / totalRevenue) * 100).toFixed(1)) : 0;
    const avgCsat = ratedSessionsCount > 0 ? Number((totalCsat / ratedSessionsCount).toFixed(1)) : 0;
    const avgConsumablesCostPerSession =
      completedSessions > 0 ? Math.round(totalConsumablesCost / completedSessions) : 0;

    const totalPendingFollowUpCount = sessions.filter(
      (s) => s.followUp24hStatus === 'PENDING' || s.followUp72hStatus === 'PENDING'
    ).length;

    const metrics: PilotMetricsSummary = {
      pilotCode,
      targetSessions,
      completedSessions,
      progressPercent,
      totalRevenue,
      totalDirectCost,
      totalConsumablesCost,
      avgConsumablesCostPerSession,
      totalContribution,
      avgContributionPerSession,
      avgContributionMarginPct,
      avgCsat,
      ratedSessionsCount,
      pendingFollowUp24hCount,
      pendingFollowUp72hCount,
      totalPendingFollowUpCount,
    };

    return { sessions, metrics };
  }

  static async createSession(
    fastify: FastifyInstance,
    data: CreatePilotSessionRequest,
    actorStaffId?: number
  ): Promise<PilotSession> {
    if (!data.customerName || !data.customerName.trim()) {
      throw new PilotServiceError('Tên khách hàng không được để trống.');
    }
    if (!data.customerPhone || !data.customerPhone.trim()) {
      throw new PilotServiceError('Số điện thoại khách hàng không được để trống.');
    }
    if (!data.sessionDate) {
      throw new PilotServiceError('Ngày thực hiện không được để trống.');
    }

    let computedMaterialCost = data.materialCost ?? 0;
    const sessionMaterialsToCreate: Array<{
      materialId: number;
      materialName: string;
      unit: string;
      usageAmount: number;
      costPerUnit: number;
      calculatedCost: number;
    }> = [];

    if (data.materials && data.materials.length > 0) {
      computedMaterialCost = 0;
      for (const item of data.materials) {
        if (!item.materialId || item.usageAmount <= 0) continue;
        const mat = await fastify.prisma.crm.crmPilotMaterial.findUnique({
          where: { id: item.materialId },
        });
        if (!mat) continue;
        const costPerUnit = Number(mat.costPerUnit);
        const calculatedCost = Math.round(costPerUnit * item.usageAmount);
        computedMaterialCost += calculatedCost;
        sessionMaterialsToCreate.push({
          materialId: mat.id,
          materialName: mat.name,
          unit: mat.unit,
          usageAmount: item.usageAmount,
          costPerUnit,
          calculatedCost,
        });
      }
    }

    const financials = this.calculateFinancials({
      ...data,
      materialCost: computedMaterialCost,
    });

    const txRunner =
      typeof fastify.prisma.crm?.$transaction === 'function'
        ? (cb: SafeAny) => fastify.prisma.crm.$transaction(cb)
        : async (cb: SafeAny) => cb(fastify.prisma.crm);

    const record = await txRunner(async (tx: SafeAny) => {
      const sess = await tx.crmPilotSession.create({
        data: {
          pilotCode: data.pilotCode || this.DEFAULT_PILOT_CODE,
          branchCode: data.branchCode || this.DEFAULT_BRANCH_CODE,
          customerName: data.customerName.trim(),
          customerPhone: data.customerPhone.trim(),
          sessionDate: new Date(`${data.sessionDate.slice(0, 10)}T00:00:00.000Z`),
          bookingTime: data.bookingTime ? data.bookingTime.trim() : null,
          bookingNote: data.bookingNote ? data.bookingNote.trim() : null,
          technicianName: data.technicianName?.trim() || null,
          status: data.status || 'BOOKED',
          checkInAt: data.checkInAt ? new Date(data.checkInAt) : null,
          beforePhotoUrl: data.beforePhotoUrl || null,
          serviceDoneAt: data.serviceDoneAt ? new Date(data.serviceDoneAt) : null,
          afterPhotoUrl: data.afterPhotoUrl || null,
          feedbackRating: data.feedbackRating !== undefined ? data.feedbackRating : null,
          feedbackNote: data.feedbackNote ? data.feedbackNote.trim() : null,
          checkOutAt: data.checkOutAt ? new Date(data.checkOutAt) : null,
          totalDurationMinutes: data.totalDurationMinutes !== undefined ? data.totalDurationMinutes : null,
          revenue: financials.revenue,
          materialCost: financials.materialCost,
          technicianCost: financials.technicianCost,
          commissionAmount: financials.commissionAmount,
          promoAmount: financials.promoAmount,
          refundAmount: financials.refundAmount,
          totalDirectCost: financials.totalDirectCost,
          contributionMargin: financials.contributionMargin,
          followUp24hStatus: data.followUp24hStatus || 'PENDING',
          followUp72hStatus: data.followUp72hStatus || 'PENDING',
          csatScore:
            data.csatScore !== undefined
              ? data.csatScore
              : data.feedbackRating !== undefined
                ? data.feedbackRating
                : null,
          issues: data.issues?.trim() || null,
          notes: data.notes?.trim() || null,
          source: data.source?.trim() || null,
          createdByStaffId: actorStaffId || null,
        },
      });

      if (sessionMaterialsToCreate.length > 0 && tx.crmPilotSessionMaterial?.createMany) {
        await tx.crmPilotSessionMaterial.createMany({
          data: sessionMaterialsToCreate.map((sm) => ({
            sessionId: sess.id,
            materialId: sm.materialId,
            materialName: sm.materialName,
            unit: sm.unit,
            usageAmount: sm.usageAmount,
            costPerUnit: sm.costPerUnit,
            calculatedCost: sm.calculatedCost,
          })),
        });
      }

      if (typeof tx.crmPilotSession?.findUnique === 'function') {
        const found = await tx.crmPilotSession.findUnique({
          where: { id: sess.id },
          include: { materials: true },
        });
        if (found) return found;
      }

      return sess;
    });

    if (data.status === 'SERVICE_DONE' || data.status === 'CHECKED_OUT') {
      try {
        await this.deductStockForSession(fastify, record.id);
      } catch {
        // non-blocking stock deduction
      }
    }

    return this.formatSession(record);
  }

  static async updateSession(
    fastify: FastifyInstance,
    id: number,
    data: UpdatePilotSessionRequest
  ): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }

    let newMaterialCost = data.materialCost !== undefined ? data.materialCost : Number(existing.materialCost);
    let sessionMaterialsToCreate: Array<{
      materialId: number;
      materialName: string;
      unit: string;
      usageAmount: number;
      costPerUnit: number;
      calculatedCost: number;
    }> | null = null;

    if (data.materials !== undefined) {
      sessionMaterialsToCreate = [];
      newMaterialCost = 0;
      for (const item of data.materials) {
        if (!item.materialId || item.usageAmount <= 0) continue;
        const mat = await fastify.prisma.crm.crmPilotMaterial.findUnique({
          where: { id: item.materialId },
        });
        if (!mat) continue;
        const costPerUnit = Number(mat.costPerUnit);
        const calculatedCost = Math.round(costPerUnit * item.usageAmount);
        newMaterialCost += calculatedCost;
        sessionMaterialsToCreate.push({
          materialId: mat.id,
          materialName: mat.name,
          unit: mat.unit,
          usageAmount: item.usageAmount,
          costPerUnit,
          calculatedCost,
        });
      }
    }

    const financials = this.calculateFinancials({
      revenue: data.revenue !== undefined ? data.revenue : Number(existing.revenue),
      materialCost: newMaterialCost,
      technicianCost: data.technicianCost !== undefined ? data.technicianCost : Number(existing.technicianCost),
      commissionAmount: data.commissionAmount !== undefined ? data.commissionAmount : Number(existing.commissionAmount),
      promoAmount: data.promoAmount !== undefined ? data.promoAmount : Number(existing.promoAmount),
      refundAmount: data.refundAmount !== undefined ? data.refundAmount : Number(existing.refundAmount),
    });

    const updatePayload: Record<string, SafeAny> = {
      revenue: financials.revenue,
      materialCost: financials.materialCost,
      technicianCost: financials.technicianCost,
      commissionAmount: financials.commissionAmount,
      promoAmount: financials.promoAmount,
      refundAmount: financials.refundAmount,
      totalDirectCost: financials.totalDirectCost,
      contributionMargin: financials.contributionMargin,
    };

    if (data.customerName !== undefined) {
      if (!data.customerName.trim()) {
        throw new PilotServiceError('Tên khách hàng không được để trống.');
      }
      updatePayload.customerName = data.customerName.trim();
    }

    if (data.customerPhone !== undefined) {
      if (!data.customerPhone.trim()) {
        throw new PilotServiceError('Số điện thoại không được để trống.');
      }
      updatePayload.customerPhone = data.customerPhone.trim();
    }

    if (data.sessionDate !== undefined) {
      updatePayload.sessionDate = new Date(`${data.sessionDate.slice(0, 10)}T00:00:00.000Z`);
    }

    if (data.bookingTime !== undefined) {
      updatePayload.bookingTime = data.bookingTime ? data.bookingTime.trim() : null;
    }

    if (data.bookingNote !== undefined) {
      updatePayload.bookingNote = data.bookingNote ? data.bookingNote.trim() : null;
    }

    if (data.technicianName !== undefined) {
      updatePayload.technicianName = data.technicianName ? data.technicianName.trim() : null;
    }

    if (data.status !== undefined) {
      updatePayload.status = data.status;
    }

    if (data.checkInAt !== undefined) {
      updatePayload.checkInAt = data.checkInAt ? new Date(data.checkInAt) : null;
    }

    if (data.beforePhotoUrl !== undefined) {
      updatePayload.beforePhotoUrl = data.beforePhotoUrl || null;
    }

    if (data.serviceDoneAt !== undefined) {
      updatePayload.serviceDoneAt = data.serviceDoneAt ? new Date(data.serviceDoneAt) : null;
    }

    if (data.afterPhotoUrl !== undefined) {
      updatePayload.afterPhotoUrl = data.afterPhotoUrl || null;
    }

    if (data.feedbackRating !== undefined) {
      updatePayload.feedbackRating = data.feedbackRating;
      if (data.feedbackRating !== null) {
        updatePayload.csatScore = data.feedbackRating;
      }
    }

    if (data.feedbackNote !== undefined) {
      updatePayload.feedbackNote = data.feedbackNote ? data.feedbackNote.trim() : null;
    }

    if (data.checkOutAt !== undefined) {
      updatePayload.checkOutAt = data.checkOutAt ? new Date(data.checkOutAt) : null;
    }

    if (data.totalDurationMinutes !== undefined) {
      updatePayload.totalDurationMinutes = data.totalDurationMinutes;
    }

    if (data.followUp24hStatus !== undefined) {
      updatePayload.followUp24hStatus = data.followUp24hStatus;
    }

    if (data.followUp72hStatus !== undefined) {
      updatePayload.followUp72hStatus = data.followUp72hStatus;
    }

    if (data.csatScore !== undefined) {
      updatePayload.csatScore = data.csatScore;
    }

    if (data.issues !== undefined) {
      updatePayload.issues = data.issues ? data.issues.trim() : null;
    }

    if (data.notes !== undefined) {
      updatePayload.notes = data.notes ? data.notes.trim() : null;
    }

    if (data.source !== undefined) {
      updatePayload.source = data.source ? data.source.trim() : null;
    }

    const txRunner =
      typeof fastify.prisma.crm?.$transaction === 'function'
        ? (cb: SafeAny) => fastify.prisma.crm.$transaction(cb)
        : async (cb: SafeAny) => cb(fastify.prisma.crm);

    const updated = await txRunner(async (tx: SafeAny) => {
      if (sessionMaterialsToCreate !== null && tx.crmPilotSessionMaterial?.deleteMany) {
        await tx.crmPilotSessionMaterial.deleteMany({
          where: { sessionId: id },
        });
        if (sessionMaterialsToCreate.length > 0 && tx.crmPilotSessionMaterial?.createMany) {
          await tx.crmPilotSessionMaterial.createMany({
            data: sessionMaterialsToCreate.map((sm) => ({
              sessionId: id,
              materialId: sm.materialId,
              materialName: sm.materialName,
              unit: sm.unit,
              usageAmount: sm.usageAmount,
              costPerUnit: sm.costPerUnit,
              calculatedCost: sm.calculatedCost,
            })),
          });
        }
      }

      const res = await tx.crmPilotSession.update({
        where: { id },
        data: updatePayload,
      });

      if (typeof tx.crmPilotSession?.findUnique === 'function') {
        const found = await tx.crmPilotSession.findUnique({
          where: { id },
          include: { materials: true },
        });
        if (found) return { ...found, ...res };
      }

      return res;
    });

    if (data.status === 'SERVICE_DONE' || data.status === 'CHECKED_OUT') {
      try {
        await this.deductStockForSession(fastify, id);
      } catch {
        // non-blocking stock deduction
      }
    }

    return this.formatSession(updated);
  }

  static async checkIn(fastify: FastifyInstance, id: number, checkInAtStr?: string): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }

    const checkInDate = checkInAtStr ? new Date(checkInAtStr) : new Date();

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: {
        checkInAt: checkInDate,
        status: 'CHECKED_IN',
      },
    });

    return this.formatSession(updated);
  }

  static async saveBeforePhoto(fastify: FastifyInstance, id: number, beforePhotoUrl: string): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }
    if (!beforePhotoUrl || !beforePhotoUrl.trim()) {
      throw new PilotServiceError('Ảnh trước khi làm (Before Photo) không được để trống.', 400);
    }

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: {
        beforePhotoUrl: beforePhotoUrl.trim(),
        status: 'BEFORE_PHOTO',
      },
    });

    return this.formatSession(updated);
  }

  static async markServiceDone(fastify: FastifyInstance, id: number, serviceDoneAtStr?: string): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }
    if (!existing.beforePhotoUrl) {
      throw new PilotServiceError(
        'Bắt buộc phải chụp/upload ảnh Trước khi làm (Before Photo) trước khi hoàn tất dịch vụ.',
        400
      );
    }

    const serviceDoneDate = serviceDoneAtStr ? new Date(serviceDoneAtStr) : new Date();

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: {
        serviceDoneAt: serviceDoneDate,
        status: 'SERVICE_DONE',
      },
    });

    try {
      await this.deductStockForSession(fastify, id);
    } catch {
      // non-blocking stock deduction
    }

    return this.formatSession(updated);
  }

  static async saveAfterPhoto(fastify: FastifyInstance, id: number, afterPhotoUrl: string): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }
    if (!afterPhotoUrl || !afterPhotoUrl.trim()) {
      throw new PilotServiceError('Ảnh sau khi làm (After Photo) không được để trống.', 400);
    }

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: {
        afterPhotoUrl: afterPhotoUrl.trim(),
        status: 'AFTER_PHOTO',
      },
    });

    return this.formatSession(updated);
  }

  static async saveFeedback(
    fastify: FastifyInstance,
    id: number,
    feedbackRating: number,
    feedbackNote?: string | null
  ): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }
    const rating = Number(feedbackRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new PilotServiceError('Đánh giá của khách hàng phải là số từ 1 đến 5 sao.', 400);
    }

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: {
        feedbackRating: rating,
        feedbackNote: feedbackNote ? feedbackNote.trim() : null,
        csatScore: rating,
        status: 'FEEDBACK_DONE',
      },
    });

    return this.formatSession(updated);
  }

  static async checkOut(fastify: FastifyInstance, id: number, checkOutAtStr?: string): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }
    const isIneligible = existing.status === 'INELIGIBLE' || existing.assessmentStatus === 'FAIL';
    if (!isIneligible) {
      if (!existing.afterPhotoUrl) {
        throw new PilotServiceError('Chưa có ảnh sau khi làm (After Photo). Bắt buộc upload trước khi Check-out.', 400);
      }
      if (!existing.feedbackRating && !existing.csatScore) {
        throw new PilotServiceError(
          'Chưa có đánh giá Feedback tại chỗ của khách. Bắt buộc hoàn tất trước khi Check-out.',
          400
        );
      }
    }

    const checkOutDate = checkOutAtStr ? new Date(checkOutAtStr) : new Date();
    const checkInDate = existing.checkInAt
      ? new Date(existing.checkInAt)
      : existing.createdAt
        ? new Date(existing.createdAt)
        : new Date();

    const diffMinutes = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000));

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: {
        checkOutAt: checkOutDate,
        totalDurationMinutes: diffMinutes,
        status: isIneligible ? 'INELIGIBLE' : 'CHECKED_OUT',
      },
    });

    return this.formatSession(updated);
  }

  static async uploadPhoto(
    _fastify: FastifyInstance,
    input: { photoData: string; mimeType?: string; filename?: string }
  ): Promise<{ photoUrl: string }> {
    if (!input.photoData || !input.photoData.trim()) {
      throw new PilotServiceError('Dữ liệu ảnh không được để trống.', 400);
    }

    const trimmed = input.photoData.trim();
    let mime = input.mimeType || 'image/jpeg';
    let base64Data: string;

    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      mime = match[1];
      base64Data = match[2];
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return { photoUrl: trimmed };
    } else {
      base64Data = trimmed.replace(/\s/g, '');
    }

    const buffer = Buffer.from(base64Data, 'base64');

    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';

    const dir = pilotMediaDir();
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    const filePath = join(dir, filename);
    await writeFile(filePath, buffer);

    return { photoUrl: `/api/pilot/media/${filename}` };
  }

  // ═══════════════════════════════════════════
  // Pilot SOP Technical Steps Catalog
  // ═══════════════════════════════════════════

  static async seedDefaultSopSteps(fastify: FastifyInstance, pilotCode?: string): Promise<PilotSopStep[]> {
    const code = pilotCode || this.DEFAULT_PILOT_CODE;
    const existing = await fastify.prisma.crm.crmPilotSopStep.findMany({
      where: { pilotCode: code },
      select: { name: true },
    });

    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
    const existingNorms = new Set(existing.map((s: { name: string }) => normalize(s.name)));

    const missing = DEFAULT_DARK_LASH_SOP_STEPS.filter((s) => !existingNorms.has(normalize(s.name)));

    if (missing.length > 0 && fastify.prisma.crm.crmPilotSopStep?.createMany) {
      await fastify.prisma.crm.crmPilotSopStep.createMany({
        data: missing.map((s) => ({
          pilotCode: code,
          name: s.name,
          description: s.description,
          stepOrder: s.stepOrder,
          targetMinutes: s.targetMinutes,
          isActive: true,
        })),
      });
    }

    const all = await fastify.prisma.crm.crmPilotSopStep.findMany({
      where: { pilotCode: code, isActive: true },
      orderBy: [{ stepOrder: 'asc' }, { id: 'asc' }],
    });
    return all.map((r: SafeAny) => this.formatSopStep(r));
  }

  static async listSopSteps(fastify: FastifyInstance, pilotCode?: string): Promise<PilotSopStep[]> {
    const code = pilotCode || this.DEFAULT_PILOT_CODE;
    const count = await fastify.prisma.crm.crmPilotSopStep.count({
      where: { pilotCode: code },
    });

    if (count === 0) {
      return this.seedDefaultSopSteps(fastify, code);
    }

    const records = await fastify.prisma.crm.crmPilotSopStep.findMany({
      where: { pilotCode: code, isActive: true },
      orderBy: [{ stepOrder: 'asc' }, { id: 'asc' }],
    });

    return records.map((r: SafeAny) => this.formatSopStep(r));
  }

  static async createSopStep(fastify: FastifyInstance, data: CreatePilotSopStepRequest): Promise<PilotSopStep> {
    if (!data.name || !data.name.trim()) {
      throw new PilotServiceError('Tên bước kỹ thuật không được để trống.');
    }
    const code = data.pilotCode || this.DEFAULT_PILOT_CODE;

    let stepOrder = data.stepOrder;
    if (stepOrder === undefined || stepOrder <= 0) {
      const maxOrderRecord = await fastify.prisma.crm.crmPilotSopStep.findFirst({
        where: { pilotCode: code },
        orderBy: { stepOrder: 'desc' },
      });
      stepOrder = (maxOrderRecord?.stepOrder ?? 0) + 1;
    }

    const created = await fastify.prisma.crm.crmPilotSopStep.create({
      data: {
        pilotCode: code,
        name: data.name.trim(),
        description: data.description ? data.description.trim() : null,
        stepOrder,
        targetMinutes:
          data.targetMinutes !== undefined && data.targetMinutes !== null ? Math.max(1, data.targetMinutes) : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return this.formatSopStep(created);
  }

  static async updateSopStep(
    fastify: FastifyInstance,
    id: number,
    data: UpdatePilotSopStepRequest
  ): Promise<PilotSopStep> {
    const existing = await fastify.prisma.crm.crmPilotSopStep.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy bước kỹ thuật tương ứng.', 404);
    }

    const updatePayload: Record<string, SafeAny> = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new PilotServiceError('Tên bước kỹ thuật không được để trống.');
      updatePayload.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updatePayload.description = data.description ? data.description.trim() : null;
    }
    if (data.stepOrder !== undefined) {
      updatePayload.stepOrder = Math.max(1, data.stepOrder);
    }
    if (data.targetMinutes !== undefined) {
      updatePayload.targetMinutes = data.targetMinutes !== null ? Math.max(1, data.targetMinutes) : null;
    }
    if (data.isActive !== undefined) {
      updatePayload.isActive = data.isActive;
    }

    const updated = await fastify.prisma.crm.crmPilotSopStep.update({
      where: { id },
      data: updatePayload,
    });

    return this.formatSopStep(updated);
  }

  static async deleteSopStep(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
    const existing = await fastify.prisma.crm.crmPilotSopStep.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy bước kỹ thuật tương ứng.', 404);
    }

    await fastify.prisma.crm.crmPilotSopStep.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  static async reorderSopSteps(fastify: FastifyInstance, data: ReorderPilotSopStepsRequest): Promise<PilotSopStep[]> {
    const code = data.pilotCode || this.DEFAULT_PILOT_CODE;
    if (!Array.isArray(data.stepIds) || data.stepIds.length === 0) {
      throw new PilotServiceError('Danh sách thứ tự bước không hợp lệ.');
    }

    const txRunner =
      typeof fastify.prisma.crm?.$transaction === 'function'
        ? (cb: SafeAny) => fastify.prisma.crm.$transaction(cb)
        : async (cb: SafeAny) => cb(fastify.prisma.crm);

    await txRunner(async (tx: SafeAny) => {
      for (let idx = 0; idx < data.stepIds.length; idx++) {
        const stepId = data.stepIds[idx];
        await tx.crmPilotSopStep.update({
          where: { id: stepId },
          data: { stepOrder: idx + 1 },
        });
      }
    });

    return this.listSopSteps(fastify, code);
  }

  static async getSopEmpiricalStats(
    fastify: FastifyInstance,
    pilotCode?: string
  ): Promise<PilotSopEmpiricalStatsResponse> {
    const code = pilotCode || this.DEFAULT_PILOT_CODE;

    // 1. Fetch template steps (or seed defaults if empty)
    const templateSteps = await this.listSopSteps(fastify, code);

    // 2. Count total sessions in this pilot
    const totalSessionsCount = await fastify.prisma.crm.crmPilotSession.count({
      where: { pilotCode: code },
    });

    // 3. Fetch all session steps with their session info
    const sessionSteps = await fastify.prisma.crm.crmPilotSessionStep.findMany({
      where: {
        session: {
          pilotCode: code,
        },
      },
      include: {
        session: {
          select: {
            id: true,
            customerName: true,
            technicianName: true,
            sessionDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    // 4. Group session steps by stepOrder or stepName
    const stats: PilotSopStepEmpiricalStat[] = templateSteps.map((tpl) => {
      const matchingSteps = sessionSteps.filter(
        (s: SafeAny) => s.stepOrder === tpl.stepOrder || s.stepName?.trim().toLowerCase() === tpl.name?.trim().toLowerCase()
      );

      const totalRecorded = matchingSteps.length;
      const completedSteps = matchingSteps.filter(
        (s: SafeAny) => s.status === 'COMPLETED' && typeof s.durationSeconds === 'number' && s.durationSeconds > 0
      );
      const completedCount = completedSteps.length;

      let avgDurationSeconds = 0;
      let minDurationSeconds = 0;
      let maxDurationSeconds = 0;

      if (completedCount > 0) {
        const durations = completedSteps.map((s: SafeAny) => s.durationSeconds as number);
        const sum = durations.reduce((acc: number, val: number) => acc + val, 0);
        avgDurationSeconds = Math.round(sum / completedCount);
        minDurationSeconds = Math.min(...durations);
        maxDurationSeconds = Math.max(...durations);
      }

      const sampleSessions: PilotStepSampleSession[] = completedSteps.slice(0, 5).map((s: SafeAny) => ({
        sessionId: s.sessionId,
        customerName: s.session?.customerName || 'Khách hàng',
        technicianName: s.session?.technicianName || 'Chuyên Viên Kỹ Thuật',
        sessionDate: s.session?.sessionDate ? new Date(s.session.sessionDate).toISOString().split('T')[0] : '',
        durationSeconds: s.durationSeconds || 0,
        status: s.status,
        note: s.note || null,
      }));

      return {
        stepOrder: tpl.stepOrder,
        stepName: tpl.name,
        targetMinutes: tpl.targetMinutes || 10,
        totalRecorded,
        completedCount,
        avgDurationSeconds,
        minDurationSeconds,
        maxDurationSeconds,
        sampleSessions,
      };
    });

    return {
      pilotCode: code,
      totalSessionsCount,
      stats,
    };
  }

  // ═══════════════════════════════════════════
  // Pilot Lash Assessment Criteria & Results
  // ═══════════════════════════════════════════

  static readonly DEFAULT_ASSESSMENT_CRITERIA = [
    {
      name: 'Độ dài mi',
      description: 'Đánh giá độ dài của sợi mi tự nhiên có phù hợp để uốn/tạo độ cong không.',
      stepOrder: 1,
    },
    {
      name: 'Độ dày sợi mi',
      description: 'Kiểm tra độ mảnh/dày và sức chịu tải của sợi mi đối với thuốc uốn/dưỡng.',
      stepOrder: 2,
    },
    {
      name: 'Mật độ mi',
      description: 'Mật độ phân bổ hàng mi (dày, vừa, thưa, có khoảng trống/rụng mi không).',
      stepOrder: 3,
    },
    {
      name: 'Tình trạng sợi mi',
      description: 'Tình trạng mi: mi khỏe, mi hư tổn, mi từng uốn/nối hay bị cháy ngọn.',
      stepOrder: 4,
    },
    {
      name: 'Khả năng tạo form',
      description: 'Đánh giá dáng mi và khả năng định hình form cong theo yêu cầu.',
      stepOrder: 5,
    },
  ];

  static async seedDefaultAssessmentCriteria(
    fastify: FastifyInstance,
    pilotCode?: string
  ): Promise<PilotAssessmentCriterion[]> {
    const code = pilotCode || this.DEFAULT_PILOT_CODE;
    const existing = await fastify.prisma.crm.crmPilotAssessmentCriterion.findMany({
      where: { pilotCode: code },
      select: { name: true },
    });

    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
    const existingNorms = new Set(existing.map((e: { name: string }) => normalize(e.name)));

    const missing = this.DEFAULT_ASSESSMENT_CRITERIA.filter((d) => !existingNorms.has(normalize(d.name)));

    if (missing.length > 0 && fastify.prisma.crm.crmPilotAssessmentCriterion?.createMany) {
      await fastify.prisma.crm.crmPilotAssessmentCriterion.createMany({
        data: missing.map((d) => ({
          pilotCode: code,
          name: d.name,
          description: d.description,
          stepOrder: d.stepOrder,
          isActive: true,
        })),
      });
    }

    const all = await fastify.prisma.crm.crmPilotAssessmentCriterion.findMany({
      where: { pilotCode: code, isActive: true },
      orderBy: { stepOrder: 'asc' },
    });
    return all.map((r: SafeAny) => this.formatAssessmentCriterion(r));
  }

  static async listAssessmentCriteria(
    fastify: FastifyInstance,
    pilotCode?: string
  ): Promise<PilotAssessmentCriterion[]> {
    const code = pilotCode || this.DEFAULT_PILOT_CODE;
    const count = await fastify.prisma.crm.crmPilotAssessmentCriterion.count({
      where: { pilotCode: code },
    });

    if (count === 0) {
      return this.seedDefaultAssessmentCriteria(fastify, code);
    }

    const records = await fastify.prisma.crm.crmPilotAssessmentCriterion.findMany({
      where: { pilotCode: code, isActive: true },
      orderBy: { stepOrder: 'asc' },
    });
    return records.map((r: SafeAny) => this.formatAssessmentCriterion(r));
  }

  static async createAssessmentCriterion(
    fastify: FastifyInstance,
    data: CreatePilotAssessmentCriterionRequest
  ): Promise<PilotAssessmentCriterion> {
    const code = data.pilotCode || this.DEFAULT_PILOT_CODE;
    if (!data.name || !data.name.trim()) {
      throw new PilotServiceError('Tên tiêu chí đánh giá không được để trống.', 400);
    }

    let order = data.stepOrder;
    if (order === undefined || order === null) {
      const maxOrderRecord = await fastify.prisma.crm.crmPilotAssessmentCriterion.findFirst({
        where: { pilotCode: code },
        orderBy: { stepOrder: 'desc' },
        select: { stepOrder: true },
      });
      order = (maxOrderRecord?.stepOrder ?? 0) + 1;
    }

    const created = await fastify.prisma.crm.crmPilotAssessmentCriterion.create({
      data: {
        pilotCode: code,
        name: data.name.trim(),
        description: data.description ? data.description.trim() : null,
        stepOrder: order,
        isActive: true,
      },
    });

    return this.formatAssessmentCriterion(created);
  }

  static async updateAssessmentCriterion(
    fastify: FastifyInstance,
    id: number,
    data: UpdatePilotAssessmentCriterionRequest
  ): Promise<PilotAssessmentCriterion> {
    const existing = await fastify.prisma.crm.crmPilotAssessmentCriterion.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy tiêu chí đánh giá.', 404);
    }

    const updatePayload: SafeAny = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new PilotServiceError('Tên tiêu chí không được để trống.', 400);
      }
      updatePayload.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updatePayload.description = data.description ? data.description.trim() : null;
    }
    if (data.stepOrder !== undefined) {
      updatePayload.stepOrder = Number(data.stepOrder);
    }
    if (data.isActive !== undefined) {
      updatePayload.isActive = Boolean(data.isActive);
    }

    const updated = await fastify.prisma.crm.crmPilotAssessmentCriterion.update({
      where: { id },
      data: updatePayload,
    });

    return this.formatAssessmentCriterion(updated);
  }

  static async deleteAssessmentCriterion(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
    const existing = await fastify.prisma.crm.crmPilotAssessmentCriterion.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy tiêu chí đánh giá.', 404);
    }

    await fastify.prisma.crm.crmPilotAssessmentCriterion.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  static async reorderAssessmentCriteria(
    fastify: FastifyInstance,
    data: ReorderPilotAssessmentCriteriaRequest
  ): Promise<PilotAssessmentCriterion[]> {
    const code = data.pilotCode || this.DEFAULT_PILOT_CODE;
    if (!Array.isArray(data.criteriaIds) || data.criteriaIds.length === 0) {
      throw new PilotServiceError('Danh sách criteriaIds không hợp lệ.', 400);
    }

    const txRunner =
      typeof fastify.prisma.crm?.$transaction === 'function'
        ? (cb: SafeAny) => fastify.prisma.crm.$transaction(cb)
        : async (cb: SafeAny) => cb(fastify.prisma.crm);

    await txRunner(async (tx: SafeAny) => {
      for (let idx = 0; idx < data.criteriaIds.length; idx++) {
        const critId = data.criteriaIds[idx];
        await tx.crmPilotAssessmentCriterion.update({
          where: { id: critId },
          data: { stepOrder: idx + 1 },
        });
      }
    });

    return this.listAssessmentCriteria(fastify, code);
  }

  static async saveAssessment(
    fastify: FastifyInstance,
    id: number,
    data: SavePilotAssessmentRequest
  ): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
      include: {
        materials: true,
        steps: true,
      },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }
    if (!['PASS', 'FAIL'].includes(data.result)) {
      throw new PilotServiceError('Kết luận đánh giá phải là Đủ điều kiện (PASS) hoặc Không đủ điều kiện (FAIL).', 400);
    }
    if (data.result === 'FAIL') {
      if (!data.reason || !data.reason.trim()) {
        throw new PilotServiceError('Bắt buộc phải nhập Lý do không đủ điều kiện khi đánh giá FAIL.', 400);
      }
    }

    let nextStatus: DarkLashesSessionStatus;
    if (data.result === 'PASS') {
      if (['BEFORE_PHOTO', 'SERVICE_DONE', 'AFTER_PHOTO', 'FEEDBACK_DONE', 'CHECKED_OUT'].includes(existing.status)) {
        nextStatus = existing.status as DarkLashesSessionStatus;
      } else {
        nextStatus = 'ASSESSED';
      }
    } else {
      nextStatus = 'INELIGIBLE';
    }

    const criteriaJson = data.criteriaSnapshot ? JSON.stringify(data.criteriaSnapshot) : null;
    const aiAssessmentJson =
      data.aiAssessment !== undefined ? (data.aiAssessment ? JSON.stringify(data.aiAssessment) : null) : undefined;
    const now = new Date();

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: {
        assessmentStatus: data.result,
        assessmentReason: data.result === 'FAIL' ? data.reason?.trim() : null,
        assessmentNotes: data.notes?.trim() || null,
        assessmentCriteriaJson: criteriaJson,
        ...(aiAssessmentJson !== undefined ? { aiAssessmentJson } : {}),
        assessedAt: now,
        status: nextStatus,
      },
      include: {
        materials: true,
        steps: true,
      },
    });

    return this.formatSession(updated);
  }

  static async aiAnalyzeSession(
    fastify: FastifyInstance,
    sessionId: number,
    data: PilotAiAnalyzeRequest
  ): Promise<PilotAiAssessmentResponse> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id: sessionId },
      include: {
        materials: true,
        steps: true,
      },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }

    const aiAssessment = await PilotAiService.analyzeLash(fastify, {
      ...data,
      photoUrl: data.photoUrl || existing.beforePhotoUrl || undefined,
    });

    const updateData: Record<string, SafeAny> = {
      aiAssessmentJson: JSON.stringify(aiAssessment),
    };

    // If session doesn't have a beforePhotoUrl yet, but one was provided in the analysis
    if (!existing.beforePhotoUrl && (data.photoUrl || aiAssessment.photoUrl)) {
      updateData.beforePhotoUrl = data.photoUrl || aiAssessment.photoUrl;
    }

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        materials: true,
        steps: true,
      },
    });

    return {
      aiAssessment,
      session: this.formatSession(updated),
    };
  }

  // ═══════════════════════════════════════════
  // Pilot Session Step Timer Management
  // ═══════════════════════════════════════════

  static async ensureSessionSteps(fastify: FastifyInstance, sessionId: number): Promise<PilotSessionStep[]> {
    const session = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id: sessionId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!session) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }

    if (session.steps && session.steps.length > 0) {
      return session.steps.map((s: SafeAny) => this.formatSessionStep(s));
    }

    const sopSteps = await this.listSopSteps(fastify, session.pilotCode);
    if (sopSteps.length === 0) return [];

    if (fastify.prisma.crm.crmPilotSessionStep?.createMany) {
      await fastify.prisma.crm.crmPilotSessionStep.createMany({
        data: sopSteps.map((step) => ({
          sessionId,
          stepTemplateId: step.id,
          stepName: step.name,
          stepOrder: step.stepOrder,
          status: 'PENDING',
        })),
      });
    }

    const createdSteps = await fastify.prisma.crm.crmPilotSessionStep.findMany({
      where: { sessionId },
      orderBy: { stepOrder: 'asc' },
    });

    return createdSteps.map((s: SafeAny) => this.formatSessionStep(s));
  }

  static async getSessionSteps(fastify: FastifyInstance, sessionId: number): Promise<PilotSessionStep[]> {
    return this.ensureSessionSteps(fastify, sessionId);
  }

  static async startSessionStep(
    fastify: FastifyInstance,
    sessionId: number,
    stepId: number,
    startedAtClient?: string
  ): Promise<PilotSessionStep> {
    const step = await fastify.prisma.crm.crmPilotSessionStep.findFirst({
      where: { id: stepId, sessionId },
    });
    if (!step) {
      throw new PilotServiceError('Không tìm thấy bước kỹ thuật của ca này.', 404);
    }

    const startDate = startedAtClient ? new Date(startedAtClient) : new Date();

    const updated = await fastify.prisma.crm.crmPilotSessionStep.update({
      where: { id: stepId },
      data: {
        status: 'RUNNING',
        startedAt: startDate,
        finishedAt: null,
        durationSeconds: null,
      },
    });

    return this.formatSessionStep(updated);
  }

  static async finishSessionStep(
    fastify: FastifyInstance,
    sessionId: number,
    stepId: number,
    finishedAtClient?: string,
    note?: string
  ): Promise<PilotSessionStep> {
    const step = await fastify.prisma.crm.crmPilotSessionStep.findFirst({
      where: { id: stepId, sessionId },
    });
    if (!step) {
      throw new PilotServiceError('Không tìm thấy bước kỹ thuật của ca này.', 404);
    }

    const finishDate = finishedAtClient ? new Date(finishedAtClient) : new Date();
    const startDate = step.startedAt ? new Date(step.startedAt) : finishDate;
    const durationSeconds = Math.max(0, Math.round((finishDate.getTime() - startDate.getTime()) / 1000));

    const updated = await fastify.prisma.crm.crmPilotSessionStep.update({
      where: { id: stepId },
      data: {
        status: 'COMPLETED',
        startedAt: step.startedAt || startDate,
        finishedAt: finishDate,
        durationSeconds,
        ...(note !== undefined ? { note: note.trim() } : {}),
      },
    });

    return this.formatSessionStep(updated);
  }

  static async updateSessionStepNote(
    fastify: FastifyInstance,
    sessionId: number,
    stepId: number,
    note: string
  ): Promise<PilotSessionStep> {
    const step = await fastify.prisma.crm.crmPilotSessionStep.findFirst({
      where: { id: stepId, sessionId },
    });
    if (!step) {
      throw new PilotServiceError('Không tìm thấy bước kỹ thuật của ca này.', 404);
    }

    const updated = await fastify.prisma.crm.crmPilotSessionStep.update({
      where: { id: stepId },
      data: { note: (note || '').trim() },
    });

    return this.formatSessionStep(updated);
  }

  static async resetSessionStep(
    fastify: FastifyInstance,
    sessionId: number,
    stepId: number
  ): Promise<PilotSessionStep> {
    const step = await fastify.prisma.crm.crmPilotSessionStep.findFirst({
      where: { id: stepId, sessionId },
    });
    if (!step) {
      throw new PilotServiceError('Không tìm thấy bước kỹ thuật của ca này.', 404);
    }

    const updated = await fastify.prisma.crm.crmPilotSessionStep.update({
      where: { id: stepId },
      data: {
        status: 'PENDING',
        startedAt: null,
        finishedAt: null,
        durationSeconds: null,
      },
    });

    return this.formatSessionStep(updated);
  }

  static async deductStockForSession(
    fastify: FastifyInstance,
    sessionId: number
  ): Promise<{ success: boolean; deductedCount: number; isAlreadyDeducted?: boolean }> {
    const session = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id: sessionId },
      include: {
        materials: true,
      },
    });
    if (!session) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }
    if (session.isStockDeducted) {
      return { success: true, deductedCount: 0, isAlreadyDeducted: true };
    }

    const warehouse = session.branchCode || this.DEFAULT_BRANCH_CODE;
    let materialsToDeduct = session.materials;

    // If session has no materials recorded yet, load standard active BOM
    if (!materialsToDeduct || materialsToDeduct.length === 0) {
      const activeMaterials = await fastify.prisma.crm.crmPilotMaterial.findMany({
        where: { pilotCode: session.pilotCode || this.DEFAULT_PILOT_CODE, isActive: true },
      });
      if (activeMaterials.length > 0) {
        materialsToDeduct = activeMaterials.map((m: SafeAny) => ({
          id: 0,
          sessionId: session.id,
          materialId: m.id,
          materialName: m.name,
          unit: m.unit,
          usageAmount: new Prisma.Decimal(1),
          costPerUnit: m.costPerUnit,
          calculatedCost: m.costPerUnit,
        })) as SafeAny;
      }
    }

    let deductedCount = 0;
    if (materialsToDeduct && materialsToDeduct.length > 0) {
      for (const mat of materialsToDeduct) {
        const usage = Number(mat.usageAmount || 1);
        if (mat.materialId) {
          await fastify.prisma.crm.crmStockInventory.upsert({
            where: {
              materialId_warehouse: {
                materialId: mat.materialId,
                warehouse,
              },
            },
            create: {
              materialId: mat.materialId,
              materialName: mat.materialName || 'Vật tư',
              unit: mat.unit || 'đv',
              quantity: -usage,
              warehouse,
            },
            update: {
              quantity: {
                decrement: usage,
              },
            },
          });
          deductedCount++;
        }
      }
    }

    await fastify.prisma.crm.crmPilotSession.update({
      where: { id: sessionId },
      data: { isStockDeducted: true },
    });

    return { success: true, deductedCount };
  }

  static async listStockInventory(fastify: FastifyInstance, warehouse?: string): Promise<StockInventoryItem[]> {
    const where: Record<string, SafeAny> = {};
    if (warehouse) {
      where.warehouse = warehouse;
    }
    const list = await fastify.prisma.crm.crmStockInventory.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { material: true },
    });
    return list.map((item: SafeAny) => ({
      id: item.id,
      materialId: item.materialId,
      materialName: item.materialName || item.material?.name || '',
      unit: item.unit,
      quantity: Number(item.quantity),
      minQuantity: Number(item.minQuantity),
      warehouse: item.warehouse,
      updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : String(item.updatedAt),
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
    }));
  }

  static async deleteSession(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }

    await fastify.prisma.crm.crmPilotSession.delete({
      where: { id },
    });

    return { success: true };
  }

  // ═══════════════════════════════════════════
  // Hạng mục 3 – Định mức & Kiểm soát vật tư tiêu hao (MOS-FEAT-164)
  // ═══════════════════════════════════════════

  static getDefaultMaterialSop(materials: PilotMaterial[] = []): PilotMaterialSopDocument {
    const findMaterialCost = (
      nameSub: string,
      fallbackCost: number
    ): { materialId?: number; costPerUnit: number; unit: string } => {
      const found = materials.find((m) => m.name.toLowerCase().includes(nameSub.toLowerCase()));
      if (found) {
        return { materialId: found.id, costPerUnit: found.costPerUnit, unit: found.unit };
      }
      return { costPerUnit: fallbackCost, unit: 'ml' };
    };

    const s1 = findMaterialCost('Thuốc số 1', 30000);
    const s2 = findMaterialCost('Thuốc số 2', 30000);
    const keratin = findMaterialCost('Keratin', 19000);
    const tint = findMaterialCost('nhuộm mi', 16000);

    const solutionNorms: PilotSolutionNormItem[] = [
      {
        id: 'norm-solution-1',
        materialId: s1.materialId || null,
        materialName: 'Thuốc số 1 (Perming Cream - Làm mềm sợi mi)',
        unit: s1.unit,
        costPerUnit: s1.costPerUnit,
        standardDosagePerSession: 0.8,
        costPerSession: Math.round(0.8 * s1.costPerUnit),
        usageInstructions: 'Ủ mềm nang mi, canh theo chất mi 10-15 phút. Tuyệt đối không để dính da mi mắt.',
        technicalNotes: 'Kiểm tra độ giãn nở của sợi mi sau 8 phút.',
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
      {
        id: 'norm-solution-2',
        materialId: s2.materialId || null,
        materialName: 'Thuốc số 2 (Setting Cream - Định hình nếp uốn)',
        unit: s2.unit,
        costPerUnit: s2.costPerUnit,
        standardDosagePerSession: 0.8,
        costPerSession: Math.round(0.8 * s2.costPerUnit),
        usageInstructions: 'Định hình nếp uốn sau khi lau sạch thuốc số 1. Thời gian ủ 10-12 phút.',
        technicalNotes: 'Chải thẳng hướng sợi mi lên form trục silicon trước khi chấm thuốc.',
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
      {
        id: 'norm-keratin',
        materialId: keratin.materialId || null,
        materialName: 'Keratin dưỡng mi chuyên sâu',
        unit: keratin.unit,
        costPerUnit: keratin.costPerUnit,
        standardDosagePerSession: 0.5,
        costPerSession: Math.round(0.5 * keratin.costPerUnit),
        usageInstructions: 'Thoa đều từ gốc đến ngọn mi sau khi rửa sạch thuốc 2, giữ ẩm 5 phút.',
        technicalNotes: 'Tạo màng phủ bóng nano bảo vệ lớp biểu bì keratin nguyên bản.',
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
      {
        id: 'norm-lash-tint',
        materialId: tint.materialId || null,
        materialName: 'Thuốc nhuộm đen mi (Lash Tint phủ bóng tối)',
        unit: tint.unit,
        costPerUnit: tint.costPerUnit,
        standardDosagePerSession: 0.5,
        costPerSession: Math.round(0.5 * tint.costPerUnit),
        usageInstructions: 'Nhuộm đen bóng sợi mi sau bước uốn, ủ 5 phút.',
        technicalNotes: 'Lau sạch bằng bông ẩm, tránh lem vào giác mạc.',
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
    ];

    const glueRodStandards: PilotGlueRodStandardItem[] = [
      {
        id: 'std-rod-form-c',
        category: 'SILICON_ROD',
        title: 'Trục Silicon Form C (Uốn cong tự nhiên)',
        materialRef: 'Trục silicon uốn mi Form C',
        selectionCriteria: 'Phù hợp mắt tròn, mi dài trung bình (8-10mm), khách thích độ cong tròn tự nhiên.',
        standardOperation: 'Đặt trục cách chân mi 0.5mm, căn chỉnh đối xứng hai mắt, vuốt mi ôm đều thân trục.',
        technicalNotes: 'Vệ sinh vô trùng trục trước khi đặt lên mí mắt khách.',
        commonMistakesToAvoid: 'Tránh đặt trục đè lên bờ mi gây cộm khó chịu cho khách.',
        illustrationImageUrl: null,
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
      {
        id: 'std-rod-form-u',
        category: 'SILICON_ROD',
        title: 'Trục Silicon Form U (Uốn cong vút mở tròng)',
        materialRef: 'Trục silicon uốn mi Form U',
        selectionCriteria: 'Phù hợp mi dài (>10mm), mí sụp nhẹ cần mở tròng to, tạo điểm nhấn sâu cho mắt.',
        standardOperation: 'Cố định trục sát mí trên, vuốt căng mi từ gốc lên đỉnh trục theo góc 90 độ.',
        technicalNotes: 'Giữ lực căng vừa phải, không làm gập gãy nang mi.',
        commonMistakesToAvoid: 'Tránh kéo căng quá mức làm bật gốc mi hoặc tạo bóng khí dưới trục.',
        illustrationImageUrl: null,
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
      {
        id: 'std-glue-gentle',
        category: 'GLUE',
        title: 'Sáp & Keo định hình không cay niêm mạc',
        materialRef: 'Keo định hình uốn mi gốc nước / Sáp uốn',
        selectionCriteria: 'Dùng sáp uốn không mùi hoặc keo gốc nước an toàn cho giác mạc và da nhạy cảm.',
        standardOperation: 'Bôi một lớp mỏng đều lên trục silicon, gạt từng tép mi dính đều vào trục trong 30 giây.',
        technicalNotes: 'Chờ 5 giây cho keo se bề mặt trước khi vuốt gạt mi.',
        commonMistakesToAvoid: 'Tránh dùng quá nhiều keo tạo màng chắn dày làm thuốc số 1 không ngấm được vào sợi mi.',
        illustrationImageUrl: null,
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
    ];

    const sanitizationProcedures: PilotSanitizationItem[] = [
      {
        id: 'sanit-silicon-rod',
        toolName: 'Trục silicon y tế',
        classification: 'REUSABLE',
        procedure:
          '1. Rửa sạch cặn thuốc và keo dưới vòi nước bằng xà phòng y tế trung tính.\n2. Ngâm ngập trong cồn 70 độ hoặc dung dịch tiệt trùng tối thiểu 15 phút.\n3. Rửa lại nước cất, để ráo và cho vào tủ tiệt trùng tia UV 20 phút.\n4. Đóng gói vào túi vô trùng bảo quản kín riêng từng ca.',
        criticalSafetyPoint: 'Kiểm tra bề mặt trục không bị rách, ố vàng hoặc còn đọng keo cũ trước khi sử dụng.',
        checklistSteps: [
          'Rửa sạch keo và hóa chất cũ',
          'Ngâm cồn 70° tối thiểu 15 phút',
          'Sấy khô và tiệt trùng UV 20 phút',
          'Bảo quản trong hộp/túi vô trùng kín',
        ],
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
      {
        id: 'sanit-tweezers-tools',
        toolName: 'Nhíp uốn mi & Cây chải mi kim loại',
        classification: 'REUSABLE',
        procedure:
          'Lau sạch đầu dụng cụ bằng gạc tẩm cồn y tế 70 độ, ngâm dung dịch khử khuẩn và tiệt trùng bằng tủ UV trước mỗi ca làm.',
        criticalSafetyPoint: 'Đầu nhíp không bị biến dạng, không có gờ sắc nhọn gây trầy xước niêm mạc mắt khách.',
        checklistSteps: [
          'Lau sạch gạc cồn 70°',
          'Tiệt trùng tia cực tím UV',
          'Kiểm tra độ khít và êm của đầu nhíp',
        ],
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
      {
        id: 'sanit-eyepad',
        toolName: 'Miếng dán mi dưới (Eye Pad) & Giấy giữ mi con',
        classification: 'DISPOSABLE',
        procedure:
          'Vật tư dùng một lần: Lấy mới từ bao bì vô trùng nguyên seal, dán chặn mi dưới cách bờ mi 1mm. Tháo bỏ vào thùng rác y tế ngay sau ca làm.',
        criticalSafetyPoint: 'Chỉ sử dụng 1 lần duy nhất cho 1 khách hàng. Tuyệt đối cấm tái sử dụng.',
        checklistSteps: [
          'Kiểm tra bao bì nguyên seal và hạn dùng',
          'Dán chuẩn vị trí cách bờ mi 1mm',
          'Thải bỏ ngay vào thùng rác sau khi hoàn tất',
        ],
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
      {
        id: 'sanit-microbrush',
        toolName: 'Tăm bông vi điểm (Microbrush) & Chổi chải mi nhựa',
        classification: 'DISPOSABLE',
        procedure:
          'Dùng lấy thuốc và định hình tép mi. Thải bỏ ngay sau khi sử dụng cho từng bước.',
        criticalSafetyPoint: 'Không chấm ngược đầu tăm đã chạm mắt vào lọ thuốc dùng chung.',
        checklistSteps: [
          'Dùng 1 đầu tăm cho 1 lần lấy hóa chất',
          'Không nhúng lại đầu đã tiếp xúc',
          'Hủy bỏ ngay sau bước kỹ thuật',
        ],
        status: 'PENDING_REVIEW',
        verifiedBy: null,
        verifiedAt: null,
      },
    ];

    const totalNormCostPerSession = solutionNorms.reduce((sum, item) => sum + item.costPerSession, 0);

    return {
      pilotCode: 'DARK_LASHES',
      overallStatus: 'DRAFT',
      isPublished: false,
      expertReviewer: 'Cô Giang Đàm',
      projectOwner: 'Danny Do',
      approvalNote:
        'Bản dự thảo SOP Hạng mục 3 chờ Cô Giang Đàm thẩm định chuyên môn trước khi trình CEO phê duyệt Scale.',
      reviewedAt: null,
      approvedAt: null,
      updatedAt: new Date().toISOString(),
      solutionNorms,
      glueRodStandards,
      sanitizationProcedures,
      summary: {
        totalNormCostPerSession,
        totalItemsCount: solutionNorms.length + glueRodStandards.length + sanitizationProcedures.length,
        pendingReviewCount: solutionNorms.length + glueRodStandards.length + sanitizationProcedures.length,
        verifiedCount: 0,
      },
    };
  }

  static async getMaterialSop(
    fastify: FastifyInstance,
    pilotCode = 'DARK_LASHES'
  ): Promise<PilotMaterialSopDocument> {
    const materials = await this.listMaterials(fastify, pilotCode);
    const config = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: this.MATERIAL_SOP_CONFIG_KEY },
    });

    if (!config || !config.value) {
      const defaultDoc = this.getDefaultMaterialSop(materials);
      if (fastify.prisma.crm.crmConfig?.upsert) {
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: this.MATERIAL_SOP_CONFIG_KEY },
          create: {
            key: this.MATERIAL_SOP_CONFIG_KEY,
            value: JSON.stringify(defaultDoc),
          },
          update: {
            value: JSON.stringify(defaultDoc),
          },
        });
      }
      return defaultDoc;
    }

    try {
      const doc = JSON.parse(config.value) as PilotMaterialSopDocument;
      // Re-link costs from live materials if available
      const matMap = new Map<number, PilotMaterial>();
      materials.forEach((m) => matMap.set(m.id, m));

      let totalCost = 0;
      let pendingCount = 0;
      let verifiedCount = 0;

      const solutionNorms = (doc.solutionNorms || []).map((norm) => {
        let costPerUnit = norm.costPerUnit;
        if (norm.materialId && matMap.has(norm.materialId)) {
          costPerUnit = matMap.get(norm.materialId)!.costPerUnit;
        }
        const costPerSession = Math.round(Number(norm.standardDosagePerSession || 0) * costPerUnit);
        totalCost += costPerSession;
        if (norm.status === 'VERIFIED') verifiedCount++;
        else pendingCount++;
        return {
          ...norm,
          costPerUnit,
          costPerSession,
        };
      });

      (doc.glueRodStandards || []).forEach((g) => {
        if (g.status === 'VERIFIED') verifiedCount++;
        else pendingCount++;
      });

      (doc.sanitizationProcedures || []).forEach((s) => {
        if (s.status === 'VERIFIED') verifiedCount++;
        else pendingCount++;
      });

      doc.solutionNorms = solutionNorms;
      doc.summary = {
        totalNormCostPerSession: totalCost,
        totalItemsCount: solutionNorms.length + (doc.glueRodStandards?.length || 0) + (doc.sanitizationProcedures?.length || 0),
        pendingReviewCount: pendingCount,
        verifiedCount,
      };

      return doc;
    } catch {
      return this.getDefaultMaterialSop(materials);
    }
  }

  static async saveMaterialSop(
    fastify: FastifyInstance,
    input: SavePilotMaterialSopRequest
  ): Promise<PilotMaterialSopDocument> {
    const existing = await this.getMaterialSop(fastify, input.pilotCode || 'DARK_LASHES');

    const solutionNorms: PilotSolutionNormItem[] = (input.solutionNorms || existing.solutionNorms).map((s) => ({
      ...s,
      costPerSession: Math.round(Number(s.standardDosagePerSession || 0) * Number(s.costPerUnit || 0)),
    }));

    const glueRodStandards: PilotGlueRodStandardItem[] = input.glueRodStandards || existing.glueRodStandards;
    const sanitizationProcedures: PilotSanitizationItem[] =
      input.sanitizationProcedures || existing.sanitizationProcedures;

    let totalCost = 0;
    let pendingCount = 0;
    let verifiedCount = 0;

    solutionNorms.forEach((item) => {
      totalCost += item.costPerSession;
      if (item.status === 'VERIFIED') verifiedCount++;
      else pendingCount++;
    });

    glueRodStandards.forEach((item) => {
      if (item.status === 'VERIFIED') verifiedCount++;
      else pendingCount++;
    });

    sanitizationProcedures.forEach((item) => {
      if (item.status === 'VERIFIED') verifiedCount++;
      else pendingCount++;
    });

    // Invariant: Cannot publish without APPROVED_SCALE status
    const overallStatus = input.overallStatus || existing.overallStatus;
    const isPublished = overallStatus === 'APPROVED_SCALE' ? Boolean(input.isPublished ?? existing.isPublished) : false;

    const updatedDoc: PilotMaterialSopDocument = {
      ...existing,
      pilotCode: input.pilotCode || existing.pilotCode || 'DARK_LASHES',
      overallStatus,
      isPublished,
      expertReviewer: input.expertReviewer || existing.expertReviewer || 'Cô Giang Đàm',
      projectOwner: input.projectOwner || existing.projectOwner || 'Danny Do',
      approvalNote: input.approvalNote ?? existing.approvalNote,
      updatedAt: new Date().toISOString(),
      solutionNorms,
      glueRodStandards,
      sanitizationProcedures,
      summary: {
        totalNormCostPerSession: totalCost,
        totalItemsCount: solutionNorms.length + glueRodStandards.length + sanitizationProcedures.length,
        pendingReviewCount: pendingCount,
        verifiedCount,
      },
    };

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: this.MATERIAL_SOP_CONFIG_KEY },
      create: {
        key: this.MATERIAL_SOP_CONFIG_KEY,
        value: JSON.stringify(updatedDoc),
      },
      update: {
        value: JSON.stringify(updatedDoc),
      },
    });

    return updatedDoc;
  }

  static async reviewMaterialSop(
    fastify: FastifyInstance,
    input: {
      reviewerName?: string;
      decision: 'EXPERT_ENDORSE' | 'APPROVE_SCALE';
      note?: string;
    }
  ): Promise<PilotMaterialSopDocument> {
    const existing = await this.getMaterialSop(fastify, 'DARK_LASHES');
    const now = new Date().toISOString();

    if (input.decision === 'EXPERT_ENDORSE') {
      const expertName = input.reviewerName || 'Cô Giang Đàm';
      const solutionNorms = existing.solutionNorms.map((s) => ({
        ...s,
        status: 'VERIFIED' as const,
        verifiedBy: expertName,
        verifiedAt: now,
      }));
      const glueRodStandards = existing.glueRodStandards.map((g) => ({
        ...g,
        status: 'VERIFIED' as const,
        verifiedBy: expertName,
        verifiedAt: now,
      }));
      const sanitizationProcedures = existing.sanitizationProcedures.map((p) => ({
        ...p,
        status: 'VERIFIED' as const,
        verifiedBy: expertName,
        verifiedAt: now,
      }));

      return this.saveMaterialSop(fastify, {
        overallStatus: 'REVIEWED_BY_EXPERT',
        expertReviewer: expertName,
        approvalNote: input.note || `Cô Giang Đàm đã thẩm định và xác nhận toàn bộ định mức & quy chuẩn vật tư ngày ${new Date().toLocaleDateString('vi-VN')}.`,
        solutionNorms,
        glueRodStandards,
        sanitizationProcedures,
      });
    }

    if (input.decision === 'APPROVE_SCALE') {
      return this.saveMaterialSop(fastify, {
        overallStatus: 'APPROVED_SCALE',
        isPublished: true,
        approvalNote: input.note || 'CEO phê duyệt chính thức Scale dịch vụ Uốn Mi Bóng Tối trên toàn chuỗi.',
      });
    }

    throw new PilotServiceError('Quyết định thẩm định không hợp lệ.', 400);
  }

  // ═══════════════════════════════════════════
  // SOP Preparation - Category 1: Clinical Data Collection & 5 Criteria Evidence (MOS-FEAT-176)
  // ═══════════════════════════════════════════
  static readonly SOP_PREP_CAT1_CONFIG_KEY = 'PILOT_SOP_PREP_CATEGORY_1_DARK_LASHES';

  static async getSopPreparationCategory1(
    fastify: FastifyInstance,
    _pilotCode = 'DARK_LASHES'
  ): Promise<SopPreparationCategory1Document> {
    const config = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: this.SOP_PREP_CAT1_CONFIG_KEY },
    });

    if (!config || !config.value) {
      const defaultDoc = DEFAULT_SOP_PREPARATION_CATEGORY_1;
      if (fastify.prisma.crm.crmConfig?.upsert) {
        try {
          await fastify.prisma.crm.crmConfig.upsert({
            where: { key: this.SOP_PREP_CAT1_CONFIG_KEY },
            create: {
              key: this.SOP_PREP_CAT1_CONFIG_KEY,
              value: JSON.stringify(defaultDoc),
            },
            update: {
              value: JSON.stringify(defaultDoc),
            },
          });
        } catch {
          // ignore cache upsert error in test or mock environment
        }
      }
      return defaultDoc;
    }

    try {
      return JSON.parse(config.value) as SopPreparationCategory1Document;
    } catch {
      return DEFAULT_SOP_PREPARATION_CATEGORY_1;
    }
  }

  static async saveSopPreparationCategory1(
    fastify: FastifyInstance,
    input: SaveSopPrepCategory1Request
  ): Promise<SopPreparationCategory1Document> {
    const existing = await this.getSopPreparationCategory1(fastify, input.pilotCode || 'DARK_LASHES');
    const now = new Date().toISOString();

    const updatedDoc: SopPreparationCategory1Document = {
      ...existing,
      status: input.status || existing.status,
      statusLabel:
        input.statusLabel ||
        (input.status === 'DRAFT_COMPLETED'
          ? 'Bản nháp – Đã hoàn thành thu thập'
          : 'Bản nháp – Chưa kiểm chứng'),
      lastUpdatedBy: input.lastUpdatedBy || existing.lastUpdatedBy || 'Cô Giang Phạm',
      lastUpdatedAt: now,
      criteria: input.criteria || existing.criteria,
    };

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: this.SOP_PREP_CAT1_CONFIG_KEY },
      create: {
        key: this.SOP_PREP_CAT1_CONFIG_KEY,
        value: JSON.stringify(updatedDoc),
      },
      update: {
        value: JSON.stringify(updatedDoc),
      },
    });

    return updatedDoc;
  }

  static async saveSopPrepCriterion(
    fastify: FastifyInstance,
    criterionId: number,
    input: SaveSopPrepCriterionRequest
  ): Promise<SopPreparationCategory1Document> {
    const existing = await this.getSopPreparationCategory1(fastify, input.pilotCode || 'DARK_LASHES');
    const now = new Date().toISOString();

    const updatedCriteria = existing.criteria.map((crit) => {
      if (crit.id === criterionId) {
        return {
          ...crit,
          expertiseKnowledge: input.expertiseKnowledge ?? crit.expertiseKnowledge,
          practicalMethod: input.practicalMethod ?? crit.practicalMethod,
          evaluationGrounds: input.evaluationGrounds ?? crit.evaluationGrounds,
          status: input.status ?? crit.status,
          statusLabel: input.status === 'VERIFIED' ? 'Đã kiểm chứng thực tế' : 'Bản nháp – Chưa kiểm chứng',
          updatedBy: input.updatedBy ?? crit.updatedBy ?? 'Cô Giang Phạm',
          updatedAt: now,
          evidenceFiles: input.evidenceFiles ?? crit.evidenceFiles,
        };
      }
      return crit;
    });

    const updatedDoc: SopPreparationCategory1Document = {
      ...existing,
      lastUpdatedBy: input.updatedBy || 'Cô Giang Phạm',
      lastUpdatedAt: now,
      criteria: updatedCriteria,
    };

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: this.SOP_PREP_CAT1_CONFIG_KEY },
      create: {
        key: this.SOP_PREP_CAT1_CONFIG_KEY,
        value: JSON.stringify(updatedDoc),
      },
      update: {
        value: JSON.stringify(updatedDoc),
      },
    });

    return updatedDoc;
  }

  static async uploadSopPrepEvidence(
    fastify: FastifyInstance,
    input: UploadSopPrepEvidenceRequest
  ): Promise<SopPrepEvidenceFile> {
    if (!input.fileData || !input.fileData.trim()) {
      throw new PilotServiceError('Dữ liệu tệp đính kèm không được để trống.', 400);
    }
    if (!input.fileName || !input.fileName.trim()) {
      throw new PilotServiceError('Tên tệp không được để trống.', 400);
    }
    if (!input.criterionId || input.criterionId < 1 || input.criterionId > 5) {
      throw new PilotServiceError('Tiêu chí liên kết không hợp lệ (phải từ 1 đến 5).', 400);
    }

    const trimmed = input.fileData.trim();
    let mime = (input.mimeType || '').toLowerCase();
    let base64Data: string;

    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      mime = match[1].toLowerCase();
      base64Data = match[2];
    } else {
      base64Data = trimmed.replace(/\s/g, '');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    let ext = 'bin';
    if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('mp4')) ext = 'mp4';
    else if (mime.includes('webm')) ext = 'webm';
    else if (mime.includes('pdf')) ext = 'pdf';
    else if (mime.includes('msword')) ext = 'doc';
    else if (mime.includes('officedocument') || mime.includes('word')) ext = 'docx';
    else {
      const dotIndex = input.fileName.lastIndexOf('.');
      if (dotIndex !== -1) {
        ext = input.fileName.slice(dotIndex + 1).toLowerCase();
      }
    }

    let fileType: SopPrepFileType = 'other';
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      fileType = 'image';
    } else if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
      fileType = 'video';
    } else if (
      mime.includes('pdf') ||
      mime.includes('msword') ||
      mime.includes('document') ||
      ['pdf', 'doc', 'docx', 'txt'].includes(ext)
    ) {
      fileType = 'document';
    }

    const dir = pilotMediaDir();
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    const filePath = join(dir, filename);
    await writeFile(filePath, buffer);

    const now = new Date().toISOString();
    const evidenceFile: SopPrepEvidenceFile = {
      id: `ev-${randomUUID().slice(0, 8)}`,
      name: input.fileName,
      url: `/api/pilot/media/${filename}`,
      fileType,
      mimeType: mime || 'application/octet-stream',
      sizeBytes: buffer.length,
      description: input.description?.trim() || '',
      sourceOrigin: input.sourceOrigin?.trim() || 'Ca Pilot thực tế',
      pilotSessionCode: input.pilotSessionCode?.trim() || undefined,
      uploadedBy: input.uploadedBy?.trim() || 'Cô Giang Phạm',
      uploadedAt: now,
    };

    // Automatically append to the corresponding criterion in the document
    try {
      const existing = await this.getSopPreparationCategory1(fastify, 'DARK_LASHES');
      const updatedCriteria = existing.criteria.map((crit) => {
        if (crit.id === input.criterionId) {
          return {
            ...crit,
            updatedAt: now,
            evidenceFiles: [...crit.evidenceFiles, evidenceFile],
          };
        }
        return crit;
      });

      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: this.SOP_PREP_CAT1_CONFIG_KEY },
        create: {
          key: this.SOP_PREP_CAT1_CONFIG_KEY,
          value: JSON.stringify({
            ...existing,
            lastUpdatedAt: now,
            criteria: updatedCriteria,
          }),
        },
        update: {
          value: JSON.stringify({
            ...existing,
            lastUpdatedAt: now,
            criteria: updatedCriteria,
          }),
        },
      });
    } catch {
      // Non-blocking in mock environments
    }

    return evidenceFile;
  }

  static async deleteSopPrepEvidence(
    fastify: FastifyInstance,
    criterionId: number,
    fileId: string
  ): Promise<SopPreparationCategory1Document> {
    const existing = await this.getSopPreparationCategory1(fastify, 'DARK_LASHES');
    const now = new Date().toISOString();

    const updatedCriteria = existing.criteria.map((crit) => {
      if (crit.id === criterionId) {
        return {
          ...crit,
          updatedAt: now,
          evidenceFiles: crit.evidenceFiles.filter((f) => f.id !== fileId),
        };
      }
      return crit;
    });

    const updatedDoc: SopPreparationCategory1Document = {
      ...existing,
      lastUpdatedAt: now,
      criteria: updatedCriteria,
    };

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: this.SOP_PREP_CAT1_CONFIG_KEY },
      create: {
        key: this.SOP_PREP_CAT1_CONFIG_KEY,
        value: JSON.stringify(updatedDoc),
      },
      update: {
        value: JSON.stringify(updatedDoc),
      },
    });

    return updatedDoc;
  }
}
