import type { FastifyInstance } from 'fastify';
import type {
  CreatePilotMaterialRequest,
  CreatePilotSessionRequest,
  PilotMaterial,
  PilotMetricsSummary,
  PilotSession,
  PilotSessionsListResponse,
  PilotSessionsQuery,
  SafeAny,
  UpdatePilotMaterialRequest,
  UpdatePilotSessionRequest,
} from '@mos-lab/shared';

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
      isActive: Boolean(raw.isActive),
      createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt),
    };
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
    }

    const records = await fastify.prisma.crm.crmPilotMaterial.findMany({
      where: { pilotCode: code, isActive: true },
      orderBy: { id: 'asc' },
    });

    return records.map((r: SafeAny) => this.formatMaterial(r));
  }

  static async createMaterial(
    fastify: FastifyInstance,
    data: CreatePilotMaterialRequest
  ): Promise<PilotMaterial> {
    if (!data.name || !data.name.trim()) {
      throw new PilotServiceError('Tên vật tư không được để trống.');
    }
    if (!data.unit || !data.unit.trim()) {
      throw new PilotServiceError('Đơn vị tính không được để trống.');
    }
    const purchasePrice = Math.max(0, data.purchasePrice ?? 0);
    const volume = Math.max(0.01, data.volume ?? 1);
    const costPerUnit =
      data.costPerUnit !== undefined && data.costPerUnit >= 0
        ? data.costPerUnit
        : Math.round(purchasePrice / volume);

    const record = await fastify.prisma.crm.crmPilotMaterial.create({
      data: {
        pilotCode: data.pilotCode || this.DEFAULT_PILOT_CODE,
        name: data.name.trim(),
        purchasePrice,
        volume,
        unit: data.unit.trim(),
        costPerUnit,
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

    return {
      id: raw.id,
      pilotCode: raw.pilotCode,
      branchCode: raw.branchCode,
      customerName: raw.customerName,
      customerPhone: raw.customerPhone,
      sessionDate: sessionDateStr,
      technicianName: raw.technicianName ?? null,
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
      createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt),
      materials,
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
      include: { materials: true },
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
          technicianName: data.technicianName?.trim() || null,
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
          csatScore: data.csatScore !== undefined ? data.csatScore : null,
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

    if (data.technicianName !== undefined) {
      updatePayload.technicianName = data.technicianName ? data.technicianName.trim() : null;
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

    return this.formatSession(updated);
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
}
