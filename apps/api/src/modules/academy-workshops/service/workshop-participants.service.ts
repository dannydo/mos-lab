import type { FastifyInstance } from 'fastify';
import {
  removeVietnameseTones,
  type CreateAcademyWorkshopWalkInRequest,
  type ListAcademyWorkshopParticipantsParams,
  type SafeAny,
  type UpdateAcademyWorkshopParticipantSelectionsRequest,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  AcademySalesService,
  buildAcademyLeadSearchText,
  normalizeAcademyPhone,
  type AcademyActor,
} from '../../academy-sales/academy-sales.service.js';
import { hashQr, issueQrToken } from './workshop-helpers.js';
import { summarize, toParticipant } from './workshop-mappers.js';
import { getParticipantRow, getWorkshopParticipant, getWorkshopRowById } from './workshop-core.service.js';
import { assignWorkshopInstructor } from './workshop-participant-ops.service.js';

async function addLeadIds(fastify: FastifyInstance, actor: AcademyActor, row: SafeAny, leadIds: number[]) {
  const ids = Array.from(new Set(leadIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  if (!ids.length) throw new AcademySalesError('Chọn ít nhất một học viên.');
  if (row.participants.length + ids.length > row.capacity) {
    throw new AcademySalesError('Workshop vượt quá sức chứa.', 409);
  }
  for (const leadId of ids) await AcademySalesService.getAccessibleLead(fastify, actor, leadId);
  const issued: Array<{ participantId: number; token: string }> = [];
  await fastify.prisma.crm.$transaction(async (tx) => {
    for (const leadId of ids) {
      const membership = await tx.crmAcademyCampaignLead.upsert({
        where: { campaignId_leadId: { campaignId: row.campaignId, leadId } },
        create: { campaignId: row.campaignId, leadId, addedByStaffId: actor.id },
        update: { removedAt: null, removedReason: null, removedByStaffId: null },
      });
      const existing = await tx.crmAcademyWorkshopParticipant.findUnique({
        where: { campaignLeadId: membership.id },
      });
      if (existing) continue;
      const token = issueQrToken();
      const participant = await tx.crmAcademyWorkshopParticipant.create({
        data: { workshopId: row.id, campaignLeadId: membership.id, qrTokenHash: hashQr(token) },
      });
      issued.push({ participantId: participant.id, token });
      await tx.crmAcademyWorkshopParticipantEvent.create({
        data: { workshopId: row.id, participantId: participant.id, eventType: 'ADDED', actorStaffId: actor.id },
      });
    }
  });
  return Promise.all(
    issued.map(async ({ participantId, token }) => {
      const participant = await getParticipantRow(fastify, actor, row.id, participantId);
      return toParticipant(participant, row.feeVnd, token);
    })
  );
}

export async function addWorkshopParticipants(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  leadIds: number[]
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  return addLeadIds(fastify, actor, row, leadIds);
}

export async function addWorkshopWalkIn(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopWalkInRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  const name = String(input.name || '').trim();
  if (!name) throw new AcademySalesError('Tên học viên walk-in là bắt buộc.');
  const phoneNormalized = normalizeAcademyPhone(input.phone);
  let lead = phoneNormalized
    ? await fastify.prisma.crm.crmAcademyLead.findFirst({
        where: { phoneNormalized },
        orderBy: { updatedAt: 'desc' },
      })
    : null;
  if (!lead) {
    lead = await fastify.prisma.crm.crmAcademyLead.create({
      data: {
        name,
        phone: String(input.phone || '').trim() || null,
        phoneNormalized,
        email: String(input.email || '').trim() || null,
        source: String(input.source || 'Workshop walk-in').trim(),
        sourceSystem: 'MANUAL',
        searchText: buildAcademyLeadSearchText({
          name,
          phone: input.phone,
          email: input.email,
          source: input.source,
        }),
        status: 'SCHEDULED',
        ownerStaffId: actor.id,
        createdByStaffId: actor.id,
      },
    });
  }
  const [participant] = await addLeadIds(fastify, actor, row, [lead.id]);
  if (!participant) throw new AcademySalesError('Học viên đã có trong workshop.', 409);
  if (input.primaryInstructorId) {
    await assignWorkshopInstructor(fastify, actor, row.id, participant.id, input.primaryInstructorId);
  }
  return getWorkshopParticipant(fastify, actor, row.id, participant.id, participant.qrToken);
}

export async function listWorkshopParticipants(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  params: ListAcademyWorkshopParticipantsParams = {}
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  const participants = await Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd)));
  const search = removeVietnameseTones(String(params.search || ''));
  const filtered = participants.filter((participant) => {
    if (
      search &&
      !removeVietnameseTones(
        `${participant.lead.name} ${participant.lead.phone || ''} ${participant.lead.email || ''}`
      ).includes(search)
    )
      return false;
    if (
      params.attendanceStatus &&
      params.attendanceStatus !== 'ALL' &&
      participant.attendanceStatus !== params.attendanceStatus
    )
      return false;
    if (params.feeStatus && params.feeStatus !== 'ALL' && participant.feeStatus !== params.feeStatus) return false;
    if (
      params.checkedIn !== undefined &&
      params.checkedIn !== 'ALL' &&
      Boolean(participant.checkedInAt) !== Boolean(params.checkedIn)
    )
      return false;
    return true;
  });
  const page = Math.max(1, Math.round(Number(params.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.round(Number(params.limit) || 20)));
  return {
    data: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length,
    page,
    limit,
    summary: summarize(participants),
  };
}

export async function updateWorkshopParticipantCare(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  input: { infoSent?: boolean; attendanceStatus?: 'PENDING' | 'CONFIRMED' | 'DECLINED'; note?: string | null }
) {
  const participant = await getParticipantRow(fastify, actor, workshopId, participantId);
  const now = new Date();
  const attendanceChanged =
    input.attendanceStatus !== undefined && input.attendanceStatus !== participant.attendanceStatus;
  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyWorkshopParticipant.update({
      where: { id: participant.id },
      data: {
        ...(input.infoSent !== undefined
          ? { infoSentAt: input.infoSent ? now : null, infoSentByStaffId: input.infoSent ? actor.id : null }
          : {}),
        ...(input.attendanceStatus !== undefined
          ? {
              attendanceStatus: input.attendanceStatus,
              attendanceConfirmedAt: attendanceChanged ? now : participant.attendanceConfirmedAt,
              attendanceConfirmedByStaffId: attendanceChanged ? actor.id : participant.attendanceConfirmedByStaffId,
            }
          : {}),
      },
    });
    await tx.crmAcademyWorkshopParticipantEvent.create({
      data: {
        workshopId,
        participantId,
        eventType: 'PRE_CARE_UPDATED',
        metadataJson: JSON.stringify({ ...input, channelOpenedOnly: true }),
        actorStaffId: actor.id,
      },
    });
  });
  return getWorkshopParticipant(fastify, actor, workshopId, participantId);
}

export async function updateWorkshopParticipantSelections(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  input: UpdateAcademyWorkshopParticipantSelectionsRequest
) {
  const participant = await getParticipantRow(fastify, actor, workshopId, participantId);
  const workshop = await getWorkshopRowById(fastify, actor, workshopId);

  await fastify.prisma.crm.$transaction(async (tx) => {
    // 1. Equipment package update
    if (input.equipmentPackageId !== undefined) {
      if (input.equipmentPackageId === null || Number(input.equipmentPackageId) <= 0) {
        await tx.crmAcademyWorkshopParticipantEquipmentSelection.deleteMany({
          where: { participantId: participant.id },
        });
      } else {
        const pkgId = Number(input.equipmentPackageId);
        const pkg = await tx.crmAcademyWorkshopEquipmentPackage.findFirst({
          where: { id: pkgId, workshopId: workshop.id },
        });
        if (!pkg) {
          throw new AcademySalesError('Bộ dụng cụ không tồn tại trong workshop này.', 404);
        }
        await tx.crmAcademyWorkshopParticipantEquipmentSelection.upsert({
          where: { participantId: participant.id },
          create: {
            participantId: participant.id,
            equipmentPackageId: pkg.id,
            packageName: pkg.name,
            packageContentsJson: pkg.includedItemsJson,
            priceVnd: pkg.priceVnd,
          },
          update: {
            equipmentPackageId: pkg.id,
            packageName: pkg.name,
            packageContentsJson: pkg.includedItemsJson,
            priceVnd: pkg.priceVnd,
            selectedAt: new Date(),
          },
        });
      }
    }

    // 2. Menu selections update
    let resolvedItemIds: number[] | null = null;
    if (Array.isArray(input.menuItemIds)) {
      resolvedItemIds = input.menuItemIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    } else if (Array.isArray(input.menuSelections)) {
      resolvedItemIds = input.menuSelections
        .map((s) => Number(s.menuItemId))
        .filter((id) => Number.isInteger(id) && id > 0);
    }

    if (resolvedItemIds !== null) {
      await tx.crmAcademyWorkshopParticipantMenuSelection.deleteMany({
        where: { participantId: participant.id },
      });

      if (resolvedItemIds.length > 0) {
        const items = await tx.crmAcademyWorkshopMenuItem.findMany({
          where: { id: { in: resolvedItemIds }, workshopId: workshop.id },
        });

        const seenCategories = new Set<string>();
        const itemsToInsert: typeof items = [];
        for (const item of items) {
          if (!seenCategories.has(item.category)) {
            seenCategories.add(item.category);
            itemsToInsert.push(item);
          }
        }

        if (itemsToInsert.length > 0) {
          await tx.crmAcademyWorkshopParticipantMenuSelection.createMany({
            data: itemsToInsert.map((item) => ({
              participantId: participant.id,
              menuItemId: item.id,
              category: item.category,
              itemName: item.name,
            })),
          });
        }
      }
    }

    // 3. Design item update
    if (input.designItemId !== undefined) {
      if (input.designItemId === null || Number(input.designItemId) <= 0) {
        await tx.crmAcademyWorkshopParticipantDesignSelection.deleteMany({
          where: { participantId: participant.id },
        });
      } else {
        const desId = Number(input.designItemId);
        const design = await tx.crmAcademyWorkshopDesignItem.findFirst({
          where: { id: desId, workshopId: workshop.id },
        });
        if (!design) {
          throw new AcademySalesError('Mẫu thiết kế mi không tồn tại trong workshop này.', 404);
        }
        await tx.crmAcademyWorkshopParticipantDesignSelection.upsert({
          where: { participantId: participant.id },
          create: {
            participantId: participant.id,
            designItemId: design.id,
            designName: design.name,
            difficultyLevel: design.difficultyLevel,
            priceVnd: design.priceVnd,
          },
          update: {
            designItemId: design.id,
            designName: design.name,
            difficultyLevel: design.difficultyLevel,
            priceVnd: design.priceVnd,
            selectedAt: new Date(),
          },
        });
      }
    }

    // 4. Event audit trail
    await tx.crmAcademyWorkshopParticipantEvent.create({
      data: {
        workshopId: workshop.id,
        participantId: participant.id,
        eventType: 'SELECTIONS_UPDATED',
        metadataJson: JSON.stringify(input),
        actorStaffId: actor.id,
      },
    });
  });

  return getWorkshopParticipant(fastify, actor, workshopId, participantId);
}

export async function checkInWorkshopParticipant(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  checkedIn = true
) {
  await getParticipantRow(fastify, actor, workshopId, participantId);
  const now = new Date();
  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyWorkshopParticipant.update({
      where: { id: participantId },
      data: { checkedInAt: checkedIn ? now : null, checkedInByStaffId: checkedIn ? actor.id : null },
    });
    await tx.crmAcademyWorkshopParticipantEvent.create({
      data: {
        workshopId,
        participantId,
        eventType: checkedIn ? 'CHECKED_IN' : 'CHECKIN_REVERTED',
        actorStaffId: actor.id,
      },
    });
  });
  return getWorkshopParticipant(fastify, actor, workshopId, participantId);
}

export async function checkInWorkshopParticipantByQr(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  qrToken: string
) {
  await getWorkshopRowById(fastify, actor, workshopId);
  const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findFirst({
    where: { workshopId, qrTokenHash: hashQr(String(qrToken || '')) },
    select: { id: true },
  });
  if (!participant) throw new AcademySalesError('QR không hợp lệ hoặc đã được cấp lại.', 404);
  return checkInWorkshopParticipant(fastify, actor, workshopId, participant.id, true);
}

export async function reissueWorkshopParticipantQr(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number
) {
  await getParticipantRow(fastify, actor, workshopId, participantId);
  const token = issueQrToken();
  await fastify.prisma.crm.crmAcademyWorkshopParticipant.update({
    where: { id: participantId },
    data: { qrTokenHash: hashQr(token), qrRedeemedAt: null, tokenVersion: { increment: 1 } },
  });
  return getWorkshopParticipant(fastify, actor, workshopId, participantId, token);
}

export async function setWorkshopParticipantConsent(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  consent: boolean,
  policyVersion = 'academy-photo-v1'
) {
  await getParticipantRow(fastify, actor, workshopId, participantId);
  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyWorkshopParticipant.update({
      where: { id: participantId },
      data: {
        photoConsentAt: consent ? new Date() : null,
        photoConsentVersion: consent ? policyVersion.slice(0, 40) : null,
      },
    });
    await tx.crmAcademyWorkshopParticipantEvent.create({
      data: {
        workshopId,
        participantId,
        eventType: consent ? 'PHOTO_CONSENTED' : 'PHOTO_CONSENT_REVOKED',
        actorStaffId: actor.id,
      },
    });
  });
  return getWorkshopParticipant(fastify, actor, workshopId, participantId);
}
