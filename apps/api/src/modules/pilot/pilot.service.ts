import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type {
  CreatePilotSessionRequest,
  DarkLashesSessionStatus,
  PilotMetricsSummary,
  PilotSession,
  PilotSessionsListResponse,
  PilotSessionsQuery,
  SafeAny,
  UpdatePilotSessionRequest,
} from '@mos-lab/shared';

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

  static formatSession(raw: SafeAny): PilotSession {
    const sessionDateStr =
      raw.sessionDate instanceof Date
        ? raw.sessionDate.toISOString().split('T')[0]
        : String(raw.sessionDate || '').slice(0, 10);

    const checkInAtStr =
      raw.checkInAt instanceof Date
        ? raw.checkInAt.toISOString()
        : raw.checkInAt
        ? String(raw.checkInAt)
        : null;

    const serviceDoneAtStr =
      raw.serviceDoneAt instanceof Date
        ? raw.serviceDoneAt.toISOString()
        : raw.serviceDoneAt
        ? String(raw.serviceDoneAt)
        : null;

    const checkOutAtStr =
      raw.checkOutAt instanceof Date
        ? raw.checkOutAt.toISOString()
        : raw.checkOutAt
        ? String(raw.checkOutAt)
        : null;

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
      beforePhotoUrl: raw.beforePhotoUrl ?? null,
      serviceDoneAt: serviceDoneAtStr,
      afterPhotoUrl: raw.afterPhotoUrl ?? null,
      feedbackRating: raw.feedbackRating !== null && raw.feedbackRating !== undefined ? Number(raw.feedbackRating) : null,
      feedbackNote: raw.feedbackNote ?? null,
      checkOutAt: checkOutAtStr,
      totalDurationMinutes: raw.totalDurationMinutes !== null && raw.totalDurationMinutes !== undefined ? Number(raw.totalDurationMinutes) : null,
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
      orderBy: [{ sessionDate: 'desc' }, { id: 'desc' }],
    });

    const sessions = records.map((r: SafeAny) => this.formatSession(r));

    // Compute metrics
    const completedSessions = sessions.length;
    const targetSessions = this.TARGET_SESSIONS;
    const progressPercent = Math.min(100, Math.round((completedSessions / targetSessions) * 100));

    let totalRevenue = 0;
    let totalDirectCost = 0;
    let totalContribution = 0;
    let totalCsat = 0;
    let ratedSessionsCount = 0;
    let pendingFollowUp24hCount = 0;
    let pendingFollowUp72hCount = 0;

    for (const s of sessions) {
      totalRevenue += s.revenue;
      totalDirectCost += s.totalDirectCost;
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

    const financials = this.calculateFinancials(data);

    const record = await fastify.prisma.crm.crmPilotSession.create({
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
        csatScore: data.csatScore !== undefined ? data.csatScore : (data.feedbackRating !== undefined ? data.feedbackRating : null),
        issues: data.issues?.trim() || null,
        notes: data.notes?.trim() || null,
        source: data.source?.trim() || null,
        createdByStaffId: actorStaffId || null,
      },
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

    const financials = this.calculateFinancials({
      revenue: data.revenue !== undefined ? data.revenue : Number(existing.revenue),
      materialCost: data.materialCost !== undefined ? data.materialCost : Number(existing.materialCost),
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

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: updatePayload,
    });

    return this.formatSession(updated);
  }

  static async checkIn(
    fastify: FastifyInstance,
    id: number,
    checkInAtStr?: string
  ): Promise<PilotSession> {
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

  static async saveBeforePhoto(
    fastify: FastifyInstance,
    id: number,
    beforePhotoUrl: string
  ): Promise<PilotSession> {
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

  static async markServiceDone(
    fastify: FastifyInstance,
    id: number,
    serviceDoneAtStr?: string
  ): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }
    if (!existing.beforePhotoUrl) {
      throw new PilotServiceError('Bắt buộc phải chụp/upload ảnh Trước khi làm (Before Photo) trước khi hoàn tất dịch vụ.', 400);
    }

    const serviceDoneDate = serviceDoneAtStr ? new Date(serviceDoneAtStr) : new Date();

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: {
        serviceDoneAt: serviceDoneDate,
        status: 'SERVICE_DONE',
      },
    });

    return this.formatSession(updated);
  }

  static async saveAfterPhoto(
    fastify: FastifyInstance,
    id: number,
    afterPhotoUrl: string
  ): Promise<PilotSession> {
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

  static async checkOut(
    fastify: FastifyInstance,
    id: number,
    checkOutAtStr?: string
  ): Promise<PilotSession> {
    const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
    }
    if (!existing.afterPhotoUrl) {
      throw new PilotServiceError('Chưa có ảnh sau khi làm (After Photo). Bắt buộc upload trước khi Check-out.', 400);
    }
    if (!existing.feedbackRating && !existing.csatScore) {
      throw new PilotServiceError('Chưa có đánh giá Feedback tại chỗ của khách. Bắt buộc hoàn tất trước khi Check-out.', 400);
    }

    const checkOutDate = checkOutAtStr ? new Date(checkOutAtStr) : new Date();
    const checkInDate = existing.checkInAt
      ? new Date(existing.checkInAt)
      : (existing.createdAt ? new Date(existing.createdAt) : new Date());

    const diffMinutes = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000));

    const updated = await fastify.prisma.crm.crmPilotSession.update({
      where: { id },
      data: {
        checkOutAt: checkOutDate,
        totalDurationMinutes: diffMinutes,
        status: 'CHECKED_OUT',
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
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
        return { photoUrl: trimmed };
      }
      throw new PilotServiceError('Định dạng ảnh không hợp lệ.', 400);
    }

    const mime = match[1] || input.mimeType || 'image/jpeg';
    const base64Data = match[2];
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
