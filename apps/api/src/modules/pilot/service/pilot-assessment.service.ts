import type { FastifyInstance } from 'fastify';
import type {
  CreatePilotAssessmentCriterionRequest,
  DarkLashesSessionStatus,
  PilotAiAnalyzeRequest,
  PilotAiAssessmentResponse,
  PilotAssessmentCriterion,
  PilotSession,
  ReorderPilotAssessmentCriteriaRequest,
  SafeAny,
  SavePilotAssessmentRequest,
  UpdatePilotAssessmentCriterionRequest,
} from '@mos-lab/shared';
import { PilotAiService } from '../pilot-ai.service.js';
import {
  DEFAULT_ASSESSMENT_CRITERIA,
  DEFAULT_PILOT_CODE,
  formatPilotAssessmentCriterion,
  formatPilotSession,
  PilotServiceError,
} from './pilot-core.js';

export async function seedDefaultPilotAssessmentCriteria(
  fastify: FastifyInstance,
  pilotCode?: string
): Promise<PilotAssessmentCriterion[]> {
  const code = pilotCode || DEFAULT_PILOT_CODE;
  const existing = await fastify.prisma.crm.crmPilotAssessmentCriterion.findMany({
    where: { pilotCode: code },
    select: { name: true },
  });

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
  const existingNorms = new Set(existing.map((e: { name: string }) => normalize(e.name)));

  const missing = DEFAULT_ASSESSMENT_CRITERIA.filter((d) => !existingNorms.has(normalize(d.name)));

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
  return all.map((r: SafeAny) => formatPilotAssessmentCriterion(r));
}

export async function listPilotAssessmentCriteria(
  fastify: FastifyInstance,
  pilotCode?: string
): Promise<PilotAssessmentCriterion[]> {
  const code = pilotCode || DEFAULT_PILOT_CODE;
  const count = await fastify.prisma.crm.crmPilotAssessmentCriterion.count({
    where: { pilotCode: code },
  });

  if (count === 0) {
    return seedDefaultPilotAssessmentCriteria(fastify, code);
  }

  const records = await fastify.prisma.crm.crmPilotAssessmentCriterion.findMany({
    where: { pilotCode: code, isActive: true },
    orderBy: { stepOrder: 'asc' },
  });
  return records.map((r: SafeAny) => formatPilotAssessmentCriterion(r));
}

export async function createPilotAssessmentCriterion(
  fastify: FastifyInstance,
  data: CreatePilotAssessmentCriterionRequest
): Promise<PilotAssessmentCriterion> {
  const code = data.pilotCode || DEFAULT_PILOT_CODE;
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

  return formatPilotAssessmentCriterion(created);
}

export async function updatePilotAssessmentCriterion(
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

  return formatPilotAssessmentCriterion(updated);
}

export async function deletePilotAssessmentCriterion(
  fastify: FastifyInstance,
  id: number
): Promise<{ success: boolean }> {
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

export async function reorderPilotAssessmentCriteria(
  fastify: FastifyInstance,
  data: ReorderPilotAssessmentCriteriaRequest
): Promise<PilotAssessmentCriterion[]> {
  const code = data.pilotCode || DEFAULT_PILOT_CODE;
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

  return listPilotAssessmentCriteria(fastify, code);
}

export async function savePilotAssessment(
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

  return formatPilotSession(updated);
}

export async function aiAnalyzePilotSession(
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
    session: formatPilotSession(updated),
  };
}
