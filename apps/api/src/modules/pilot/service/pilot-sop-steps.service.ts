import type { FastifyInstance } from 'fastify';
import {
  DEFAULT_DARK_LASH_SOP_STEPS,
  type CreatePilotSopStepRequest,
  type PilotSessionStep,
  type PilotSopEmpiricalStatsResponse,
  type PilotSopStep,
  type PilotSopStepEmpiricalStat,
  type PilotStepSampleSession,
  type ReorderPilotSopStepsRequest,
  type SafeAny,
  type UpdatePilotSopStepRequest,
} from '@mos-lab/shared';
import { DEFAULT_PILOT_CODE, formatPilotSessionStep, formatPilotSopStep, PilotServiceError } from './pilot-core.js';

// ═══════════════════════════════════════════
// Pilot SOP Technical Steps Catalog
// ═══════════════════════════════════════════

export async function seedDefaultPilotSopSteps(fastify: FastifyInstance, pilotCode?: string): Promise<PilotSopStep[]> {
  const code = pilotCode || DEFAULT_PILOT_CODE;
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
  return all.map((r: SafeAny) => formatPilotSopStep(r));
}

export async function listPilotSopSteps(fastify: FastifyInstance, pilotCode?: string): Promise<PilotSopStep[]> {
  const code = pilotCode || DEFAULT_PILOT_CODE;
  const count = await fastify.prisma.crm.crmPilotSopStep.count({
    where: { pilotCode: code },
  });

  if (count === 0) {
    return seedDefaultPilotSopSteps(fastify, code);
  }

  const records = await fastify.prisma.crm.crmPilotSopStep.findMany({
    where: { pilotCode: code, isActive: true },
    orderBy: [{ stepOrder: 'asc' }, { id: 'asc' }],
  });

  return records.map((r: SafeAny) => formatPilotSopStep(r));
}

export async function createPilotSopStep(
  fastify: FastifyInstance,
  data: CreatePilotSopStepRequest
): Promise<PilotSopStep> {
  if (!data.name || !data.name.trim()) {
    throw new PilotServiceError('Tên bước kỹ thuật không được để trống.');
  }
  const code = data.pilotCode || DEFAULT_PILOT_CODE;

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

  return formatPilotSopStep(created);
}

export async function updatePilotSopStep(
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

  return formatPilotSopStep(updated);
}

export async function deletePilotSopStep(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
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

export async function reorderPilotSopSteps(
  fastify: FastifyInstance,
  data: ReorderPilotSopStepsRequest
): Promise<PilotSopStep[]> {
  const code = data.pilotCode || DEFAULT_PILOT_CODE;
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

  return listPilotSopSteps(fastify, code);
}

export async function getPilotSopEmpiricalStats(
  fastify: FastifyInstance,
  pilotCode?: string
): Promise<PilotSopEmpiricalStatsResponse> {
  const code = pilotCode || DEFAULT_PILOT_CODE;

  // 1. Fetch template steps (or seed defaults if empty)
  const templateSteps = await listPilotSopSteps(fastify, code);

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
      (s: SafeAny) =>
        s.stepOrder === tpl.stepOrder || s.stepName?.trim().toLowerCase() === tpl.name?.trim().toLowerCase()
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
// Pilot Session Step Timer Management
// ═══════════════════════════════════════════

export async function ensurePilotSessionSteps(
  fastify: FastifyInstance,
  sessionId: number
): Promise<PilotSessionStep[]> {
  const session = await fastify.prisma.crm.crmPilotSession.findUnique({
    where: { id: sessionId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
  if (!session) {
    throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
  }

  if (session.steps && session.steps.length > 0) {
    return session.steps.map((s: SafeAny) => formatPilotSessionStep(s));
  }

  const sopSteps = await listPilotSopSteps(fastify, session.pilotCode);
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

  return createdSteps.map((s: SafeAny) => formatPilotSessionStep(s));
}

export async function getPilotSessionSteps(fastify: FastifyInstance, sessionId: number): Promise<PilotSessionStep[]> {
  return ensurePilotSessionSteps(fastify, sessionId);
}

export async function startPilotSessionStep(
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

  return formatPilotSessionStep(updated);
}

export async function finishPilotSessionStep(
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

  return formatPilotSessionStep(updated);
}

export async function updatePilotSessionStepNote(
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

  return formatPilotSessionStep(updated);
}

export async function resetPilotSessionStep(
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

  return formatPilotSessionStep(updated);
}
