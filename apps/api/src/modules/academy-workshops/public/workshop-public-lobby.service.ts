import type { FastifyInstance } from 'fastify';
import type {
  AcademyWorkshopSharedJoinInfo,
  JoinAcademyWorkshopWithGoogleRequest,
  SelectAcademyWorkshopParticipantRequest,
} from '@mos-lab/shared';
import type { GoogleIdentity } from '../../auth/google-identity.service.js';
import { AcademySalesError, buildAcademyLeadSearchText } from '../../academy-sales/academy-sales.service.js';
import {
  assertAcademyWorkshopLobbyOpen,
  CLOSED_WORKSHOP_STATUSES,
  displayCode,
  googleLeadExternalKey,
  normalizeAcademyWorkshopPhone,
  publicWorkshop,
  workshopQrTokenHash,
} from './workshop-public-helpers.js';

async function selfCheckIn<T extends { id: number; workshopId: number; checkedInAt?: Date | null }>(
  fastify: FastifyInstance,
  participant: T,
  method: 'ROSTER_SELECTION' | 'GOOGLE'
): Promise<T> {
  if (participant.checkedInAt) return participant;
  const now = new Date();
  const checkedIn = await fastify.prisma.crm.$transaction(async (tx) => {
    const claimed = await tx.crmAcademyWorkshopParticipant.updateMany({
      where: { id: participant.id, checkedInAt: null },
      data: { checkedInAt: now, checkedInByStaffId: null },
    });
    if (claimed.count) {
      await tx.crmAcademyWorkshopParticipantEvent.create({
        data: {
          workshopId: participant.workshopId,
          participantId: participant.id,
          eventType: 'SELF_CHECKED_IN',
          metadataJson: JSON.stringify({ method }),
          occurredAt: now,
        },
      });
    }
    return Boolean(claimed.count);
  });
  return checkedIn ? ({ ...participant, checkedInAt: now } as T) : participant;
}

export async function getWorkshopSharedJoinInfo(
  fastify: FastifyInstance,
  rawDisplayCode: unknown
): Promise<AcademyWorkshopSharedJoinInfo> {
  const workshop = await fastify.prisma.crm.crmAcademyWorkshop.findUnique({
    where: { displayCode: displayCode(rawDisplayCode) },
    include: {
      campaign: { select: { name: true, slug: true } },
      participants: {
        include: {
          campaignLead: {
            include: { lead: { select: { name: true, phone: true, avatarUrl: true } } },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
  });
  if (!workshop || CLOSED_WORKSHOP_STATUSES.has(workshop.status)) {
    throw new AcademySalesError('Workshop không tồn tại hoặc đã đóng.', 404);
  }
  assertAcademyWorkshopLobbyOpen(workshop);
  return {
    workshop: publicWorkshop(workshop),
    participants: workshop.participants.map((participant) => ({
      id: participant.id,
      name: participant.campaignLead.lead.name,
      avatarUrl: participant.campaignLead.lead.avatarUrl,
      requiresPhone: Boolean(normalizeAcademyWorkshopPhone(participant.campaignLead.lead.phone)),
    })),
  };
}

export async function selectWorkshopParticipant(
  fastify: FastifyInstance,
  input: SelectAcademyWorkshopParticipantRequest
) {
  const code = displayCode(input.displayCode);
  const participantId = Math.round(Number(input.participantId));
  if (!Number.isInteger(participantId) || participantId <= 0) {
    throw new AcademySalesError('Học viên không hợp lệ.');
  }
  const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findFirst({
    where: { id: participantId, workshop: { displayCode: code } },
    include: {
      workshop: { include: { campaign: { select: { name: true, slug: true } } } },
      campaignLead: { include: { lead: { select: { phone: true } } } },
    },
  });
  if (!participant || CLOSED_WORKSHOP_STATUSES.has(participant.workshop.status)) {
    throw new AcademySalesError('Không tìm thấy học viên trong workshop.', 404);
  }
  assertAcademyWorkshopLobbyOpen(participant.workshop);
  const expectedPhone = normalizeAcademyWorkshopPhone(participant.campaignLead.lead.phone);
  if (expectedPhone) {
    const suppliedPhone = normalizeAcademyWorkshopPhone(input.phone);
    if (!suppliedPhone || suppliedPhone !== expectedPhone) {
      throw new AcademySalesError('Số điện thoại chưa khớp với hồ sơ học viên.', 403);
    }
  }
  return selfCheckIn(fastify, participant, 'ROSTER_SELECTION');
}

export async function joinWorkshopWithGoogle(
  fastify: FastifyInstance,
  input: JoinAcademyWorkshopWithGoogleRequest,
  identity: GoogleIdentity
) {
  const code = displayCode(input.displayCode);
  const email = identity.email.slice(0, 150);
  const name = identity.name.slice(0, 150) || email.split('@')[0] || 'Học viên Google';
  const avatarUrl = identity.avatarUrl || null;
  const externalKey = googleLeadExternalKey(identity.subject);
  const now = new Date();

  const participant = await fastify.prisma.crm.$transaction(async (tx) => {
    const workshop = await tx.crmAcademyWorkshop.findUnique({
      where: { displayCode: code },
      include: { campaign: { select: { id: true, name: true, slug: true } } },
    });
    if (!workshop || CLOSED_WORKSHOP_STATUSES.has(workshop.status)) {
      throw new AcademySalesError('Workshop không tồn tại hoặc đã đóng.', 404);
    }
    assertAcademyWorkshopLobbyOpen(workshop);

    let lead = await tx.crmAcademyLead.findUnique({ where: { externalKey } });
    if (!lead) {
      lead = await tx.crmAcademyLead.findFirst({
        where: { email },
        orderBy: { updatedAt: 'desc' },
      });
    }

    const searchText = buildAcademyLeadSearchText({
      name,
      email,
      source: lead?.source || 'Google Workshop',
      course: lead?.course,
      goal: lead?.goal,
      note: lead?.note,
    });

    if (lead) {
      lead = await tx.crmAcademyLead.update({
        where: { id: lead.id },
        data: {
          ...(!lead.externalKey ? { externalKey } : {}),
          name,
          email,
          ...(avatarUrl ? { avatarUrl } : {}),
          searchText,
        },
      });
    } else {
      lead = await tx.crmAcademyLead.upsert({
        where: { externalKey },
        create: {
          externalKey,
          sourceSystem: 'GOOGLE',
          source: 'Google Workshop',
          avatarUrl,
          name,
          email,
          searchText,
          status: 'SCHEDULED',
        },
        update: {
          name,
          email,
          ...(avatarUrl ? { avatarUrl } : {}),
          searchText,
        },
      });
    }

    const membership = await tx.crmAcademyCampaignLead.upsert({
      where: { campaignId_leadId: { campaignId: workshop.campaignId, leadId: lead.id } },
      create: { campaignId: workshop.campaignId, leadId: lead.id },
      update: { removedAt: null, removedReason: null, removedByStaffId: null },
    });
    const existing = await tx.crmAcademyWorkshopParticipant.findUnique({
      where: { campaignLeadId: membership.id },
    });
    if (existing) return { ...existing, workshop };

    const participantCount = await tx.crmAcademyWorkshopParticipant.count({
      where: { workshopId: workshop.id },
    });
    if (participantCount >= workshop.capacity) {
      throw new AcademySalesError('Workshop đã đủ sức chứa.', 409);
    }

    const created = await tx.crmAcademyWorkshopParticipant.create({
      data: {
        workshopId: workshop.id,
        campaignLeadId: membership.id,
        qrTokenHash: workshopQrTokenHash(),
        attendanceStatus: 'CONFIRMED',
        attendanceConfirmedAt: now,
      },
    });
    await tx.crmAcademyWorkshopParticipantEvent.create({
      data: {
        workshopId: workshop.id,
        participantId: created.id,
        eventType: 'SELF_REGISTERED_GOOGLE',
        metadataJson: JSON.stringify({ provider: 'GOOGLE', leadId: lead.id }),
        occurredAt: now,
      },
    });
    return { ...created, workshop };
  });
  return selfCheckIn(fastify, participant, 'GOOGLE');
}
