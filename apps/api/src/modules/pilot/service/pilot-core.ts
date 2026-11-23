import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type {
  DarkLashesSessionStatus,
  PilotAiAssessment,
  PilotAssessmentCriterion,
  PilotCriterionEvaluation,
  PilotMaterial,
  PilotMaterialItemType,
  PilotSession,
  PilotSessionStep,
  PilotSessionStepStatus,
  PilotSopStep,
  SafeAny,
} from '@mos-lab/shared';

export const DEFAULT_PILOT_CODE = 'DARK_LASHES';
export const DEFAULT_BRANCH_CODE = 'detham';
export const DEFAULT_PILOT_REVENUE = 990000;
export const TARGET_SESSIONS = 30;
export const MATERIAL_SOP_CONFIG_KEY = 'PILOT_DARK_LASHES_MATERIAL_SOP';
export const SOP_PREP_CAT1_CONFIG_KEY = 'PILOT_SOP_PREP_CATEGORY_1_DARK_LASHES';

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

export const DEFAULT_ASSESSMENT_CRITERIA = [
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

export async function isPilotFeatureEnabled(fastify: FastifyInstance): Promise<boolean> {
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

export function calculatePilotFinancials(input: {
  revenue?: number;
  materialCost?: number;
  technicianCost?: number;
  commissionAmount?: number;
  promoAmount?: number;
  refundAmount?: number;
}) {
  const revenue = Math.max(0, input.revenue ?? DEFAULT_PILOT_REVENUE);
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

export function formatPilotMaterial(raw: SafeAny): PilotMaterial {
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

export function formatPilotSopStep(raw: SafeAny): PilotSopStep {
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

export function formatPilotSessionStep(raw: SafeAny): PilotSessionStep {
  return {
    id: raw.id,
    sessionId: raw.sessionId,
    stepTemplateId: raw.stepTemplateId !== null && raw.stepTemplateId !== undefined ? Number(raw.stepTemplateId) : null,
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

export function formatPilotAssessmentCriterion(raw: SafeAny): PilotAssessmentCriterion {
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

export function formatPilotSession(raw: SafeAny): PilotSession {
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
      aiAssessment = typeof raw.aiAssessmentJson === 'string' ? JSON.parse(raw.aiAssessmentJson) : raw.aiAssessmentJson;
    } catch {
      aiAssessment = null;
    }
  }

  const steps = Array.isArray(raw.steps) ? raw.steps.map((s: SafeAny) => formatPilotSessionStep(s)) : [];

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
    feedbackRating: raw.feedbackRating !== null && raw.feedbackRating !== undefined ? Number(raw.feedbackRating) : null,
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
