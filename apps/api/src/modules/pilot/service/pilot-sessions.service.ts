import type { FastifyInstance } from 'fastify';
import type {
  CreatePilotSessionRequest,
  PilotMetricsSummary,
  PilotSession,
  PilotSessionsListResponse,
  PilotSessionsQuery,
  SafeAny,
  UpdatePilotSessionRequest,
} from '@mos-lab/shared';
import {
  calculatePilotFinancials,
  DEFAULT_BRANCH_CODE,
  DEFAULT_PILOT_CODE,
  formatPilotSession,
  PilotServiceError,
  TARGET_SESSIONS,
} from './pilot-core.js';
import { deductPilotStockForSession } from './pilot-materials.service.js';

export async function listPilotSessions(
  fastify: FastifyInstance,
  query: PilotSessionsQuery
): Promise<PilotSessionsListResponse> {
  const pilotCode = query.pilotCode || DEFAULT_PILOT_CODE;
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

  const sessions = records.map((r: SafeAny) => formatPilotSession(r));

  // Compute metrics
  const completedSessions = sessions.length;
  const targetSessions = TARGET_SESSIONS;
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
  const avgContributionMarginPct = totalRevenue > 0 ? Number(((totalContribution / totalRevenue) * 100).toFixed(1)) : 0;
  const avgCsat = ratedSessionsCount > 0 ? Number((totalCsat / ratedSessionsCount).toFixed(1)) : 0;
  const avgConsumablesCostPerSession = completedSessions > 0 ? Math.round(totalConsumablesCost / completedSessions) : 0;

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

export async function createPilotSession(
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

  const financials = calculatePilotFinancials({
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
        pilotCode: data.pilotCode || DEFAULT_PILOT_CODE,
        branchCode: data.branchCode || DEFAULT_BRANCH_CODE,
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
      await deductPilotStockForSession(fastify, record.id);
    } catch {
      // non-blocking stock deduction
    }
  }

  return formatPilotSession(record);
}

export async function updatePilotSession(
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

  const financials = calculatePilotFinancials({
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
      await deductPilotStockForSession(fastify, id);
    } catch {
      // non-blocking stock deduction
    }
  }

  return formatPilotSession(updated);
}

export async function deletePilotSession(fastify: FastifyInstance, id: number): Promise<{ success: boolean }> {
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
