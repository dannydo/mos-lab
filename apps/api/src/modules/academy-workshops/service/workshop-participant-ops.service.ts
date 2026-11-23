import type { FastifyInstance } from 'fastify';
import {
  sortAcademyWorkshopTalentLeaderboard,
  type AcademyWorkshopParticipant,
  type AcademyWorkshopTalentLeaderboardEntry,
  type SafeAny,
  type UpdateAcademyWorkshopParticipantPricingRequest,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  canManageAcademySales,
  type AcademyActor,
} from '../../academy-sales/academy-sales.service.js';
import { AcademyWorkshopStorageService } from '../academy-workshop-storage.service.js';
import { parseDate } from './workshop-helpers.js';
import { toParticipant } from './workshop-mappers.js';
import { getParticipantRow, getWorkshopParticipant, getWorkshopRowById } from './workshop-core.service.js';

export async function createWorkshopPhotoUploadIntent(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  input: { fileName: string; mimeType: string; sizeBytes: number }
) {
  const participant = await getParticipantRow(fastify, actor, workshopId, participantId);
  if (!participant.photoConsentAt) throw new AcademySalesError('Cần ghi nhận consent trước khi tải ảnh.', 409);
  return AcademyWorkshopStorageService.createUploadIntent(
    workshopId,
    participantId,
    input.fileName,
    input.mimeType,
    input.sizeBytes
  );
}

export async function confirmWorkshopPhoto(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  input: { storagePath: string; mimeType: string; sizeBytes: number; caption?: string | null; capturedAt?: string }
) {
  const participant = await getParticipantRow(fastify, actor, workshopId, participantId);
  if (!participant.photoConsentAt) throw new AcademySalesError('Consent ảnh đã bị thu hồi.', 409);
  await AcademyWorkshopStorageService.verifyObject(
    workshopId,
    participantId,
    input.storagePath,
    input.mimeType,
    input.sizeBytes
  );
  const capturedAt = input.capturedAt ? parseDate(input.capturedAt, 'Thời điểm chụp')! : new Date();
  await fastify.prisma.crm.crmAcademyWorkshopPhoto.create({
    data: {
      participantId,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      caption: String(input.caption || '').trim() || null,
      capturedAt,
      capturedByStaffId: actor.id,
    },
  });
  return getWorkshopParticipant(fastify, actor, workshopId, participantId);
}

export async function assignWorkshopInstructor(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  instructorId: number | null
) {
  await getParticipantRow(fastify, actor, workshopId, participantId);
  if (instructorId !== null) {
    const exists = await fastify.prisma.crm.crmAcademyInstructor.count({
      where: { id: instructorId, isActive: true },
    });
    if (!exists) throw new AcademySalesError('Giáo viên chính không hợp lệ.');
  }
  await fastify.prisma.crm.crmAcademyWorkshopParticipant.update({
    where: { id: participantId },
    data: { primaryInstructorId: instructorId },
  });
  return getWorkshopParticipant(fastify, actor, workshopId, participantId);
}

export async function recordWorkshopFee(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  input: { amountVnd: number; method: string; reference?: string | null; note?: string | null; receivedAt?: string }
) {
  if (!canManageAcademySales(actor)) {
    throw new AcademySalesError('Bạn không có quyền ghi nhận học phí workshop.', 403);
  }
  await getParticipantRow(fastify, actor, workshopId, participantId);
  const amountVnd = Math.round(Number(input.amountVnd));
  if (!Number.isInteger(amountVnd) || amountVnd === 0) {
    throw new AcademySalesError('Số tiền phải là VND nguyên khác 0.');
  }
  if (!['BANK_TRANSFER', 'CASH', 'ADJUSTMENT'].includes(input.method)) {
    throw new AcademySalesError('Phương thức thu phí không hợp lệ.');
  }
  if (input.method !== 'ADJUSTMENT' && amountVnd < 0) throw new AcademySalesError('Số tiền thu không thể âm.');
  await fastify.prisma.crm.crmAcademyWorkshopFeePayment.create({
    data: {
      participantId,
      amountVnd,
      method: input.method,
      reference:
        String(input.reference || '')
          .trim()
          .slice(0, 160) || null,
      note: String(input.note || '').trim() || null,
      receivedAt: input.receivedAt ? parseDate(input.receivedAt, 'Thời điểm nhận tiền')! : new Date(),
      confirmedByStaffId: actor.id,
    },
  });
  return getWorkshopParticipant(fastify, actor, workshopId, participantId);
}

export async function deleteWorkshopFeePayment(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  paymentId: number
) {
  if (!canManageAcademySales(actor)) {
    throw new AcademySalesError('Bạn không có quyền quản lý học phí workshop.', 403);
  }
  await getParticipantRow(fastify, actor, workshopId, participantId);
  const payment = await fastify.prisma.crm.crmAcademyWorkshopFeePayment.findFirst({
    where: { id: paymentId, participantId },
  });
  if (!payment) throw new AcademySalesError('Bút toán phí không tồn tại.', 404);
  await fastify.prisma.crm.crmAcademyWorkshopFeePayment.delete({
    where: { id: paymentId },
  });
  return getWorkshopParticipant(fastify, actor, workshopId, participantId);
}

export async function waiveWorkshopFee(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  waived: boolean,
  reason: string
) {
  if (!canManageAcademySales(actor)) {
    throw new AcademySalesError('Bạn không có quyền miễn học phí workshop.', 403);
  }
  await getParticipantRow(fastify, actor, workshopId, participantId);
  const cleanReason = String(reason || '').trim();
  if (waived && !cleanReason) throw new AcademySalesError('Cần nhập lý do miễn phí.');
  await fastify.prisma.crm.crmAcademyWorkshopParticipant.update({
    where: { id: participantId },
    data: {
      feeWaivedAt: waived ? new Date() : null,
      feeWaiverReason: waived ? cleanReason : null,
      feeWaivedByStaffId: waived ? actor.id : null,
    },
  });
  return getWorkshopParticipant(fastify, actor, workshopId, participantId);
}

export async function updateWorkshopParticipantPricing(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  input: UpdateAcademyWorkshopParticipantPricingRequest
) {
  if (!canManageAcademySales(actor)) {
    throw new AcademySalesError('Bạn không có quyền chỉnh sửa học phí áp dụng cho học viên.', 403);
  }
  const workshop = await getWorkshopRowById(fastify, actor, workshopId);
  await getParticipantRow(fastify, actor, workshopId, participantId);

  const appliedFeeVnd =
    input.appliedFeeVnd !== undefined && input.appliedFeeVnd !== null
      ? Math.max(0, Math.round(Number(input.appliedFeeVnd)))
      : null;
  const discountVnd = Math.max(0, Math.round(Number(input.discountVnd) || 0));
  const discountReason = input.discountReason ? String(input.discountReason).trim().slice(0, 255) : null;

  await fastify.prisma.crm.crmAcademyWorkshopParticipant.update({
    where: { id: participantId },
    data: {
      appliedFeeVnd,
      discountVnd,
      discountReason,
    },
  });

  return getWorkshopParticipant(fastify, actor, workshop.id, participantId);
}

export async function getWorkshopTalentLeaderboard(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  const participants = await Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd)));
  const ranked = sortAcademyWorkshopTalentLeaderboard(
    participants
      .filter(
        (item): item is AcademyWorkshopParticipant & { talent: NonNullable<AcademyWorkshopParticipant['talent']> } =>
          Boolean(item.talent)
      )
      .map((item) => ({
        participantId: item.id,
        name: item.lead.name,
        avatarUrl: item.lead.avatarUrl,
        qualified: item.talent.qualified,
        strands5Min: item.talent.strands5Min,
        totalErrors: item.talent.totalErrors,
        eyeScore: item.talent.eyeScore,
        handScore: item.talent.handScore,
        rankLabel: item.talent.rankLabel,
        rewardLabel: item.talent.rewardLabel,
        scholarshipPercent: item.talent.scholarshipPercent,
        sampleRewardPercent: item.talent.sampleRewardPercent,
        kitRewardPercent: item.talent.kitRewardPercent,
        completedAt: item.talent.completedAt,
      }))
  );
  return ranked.map((item, index) => ({ ...item, rank: index + 1 })) as AcademyWorkshopTalentLeaderboardEntry[];
}

export async function ensureWorkshopCompletionFollowUps(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  const participants = await Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd)));
  const dueAt = new Date(Math.max(Date.now(), new Date(row.endsAt).getTime()) + 24 * 60 * 60 * 1000);
  for (const participant of participants) {
    const reason = !participant.checkedInAt
      ? 'NO_SHOW'
      : participant.talent?.paymentStatus !== 'PAID'
        ? 'NOT_CONVERTED'
        : null;
    if (!reason) continue;
    const marker = `[WORKSHOP:${workshopId}:${reason}]`;
    const exists = await fastify.prisma.crm.crmAcademyFollowUpTask.findFirst({
      where: { leadId: participant.lead.id, content: { startsWith: marker } },
      select: { id: true },
    });
    if (exists) continue;
    await fastify.prisma.crm.crmAcademyFollowUpTask.create({
      data: {
        leadId: participant.lead.id,
        content: `${marker} ${reason === 'NO_SHOW' ? 'Chăm lại học viên vắng workshop' : 'Follow-up chốt khóa sau workshop'} ${row.campaign.name}.`,
        dueAt,
        status: 'PENDING',
        pancakeLink: participant.lead.facebookChatLink,
        assigneeStaffId: row.campaign.createdByStaffId || actor.id,
      },
    });
  }
}
