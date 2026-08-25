import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type {
  AcademyWorkshopSharedJoinInfo,
  JoinAcademyWorkshopWithGoogleRequest,
  SelectAcademyWorkshopParticipantRequest,
} from '@mos-lab/shared';
import type { GoogleIdentity } from '../auth/google-identity.service.js';
import { AcademySalesError, buildAcademyLeadSearchText } from '../academy-sales/academy-sales.service.js';

const CLOSED_WORKSHOP_STATUSES = new Set(['CANCELLED', 'ARCHIVED']);

export function normalizeAcademyWorkshopPhone(value: unknown): string {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0084')) digits = digits.slice(2);
  if (digits.startsWith('84') && digits.length >= 10) digits = `0${digits.slice(2)}`;
  return digits;
}

function displayCode(value: unknown): string {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(code)) throw new AcademySalesError('Mã workshop không hợp lệ.', 404);
  return code;
}

function googleLeadExternalKey(subject: string): string {
  return `GOOGLE:${subject}`.slice(0, 191);
}

function workshopQrTokenHash(): string {
  return createHash('sha256').update(randomBytes(32).toString('base64url')).digest('hex');
}

function publicWorkshop(workshop: {
  id: number;
  campaign: { name: string; slug: string };
  startsAt: Date;
  endsAt: Date;
  location: string;
  status: string;
}): AcademyWorkshopSharedJoinInfo['workshop'] {
  return {
    id: workshop.id,
    name: workshop.campaign.name,
    slug: workshop.campaign.slug,
    startsAt: workshop.startsAt.toISOString(),
    endsAt: workshop.endsAt.toISOString(),
    location: workshop.location,
    status: workshop.status as AcademyWorkshopSharedJoinInfo['workshop']['status'],
  };
}

export class AcademyWorkshopPublicJoinService {
  private static async selfCheckIn<T extends { id: number; workshopId: number; checkedInAt?: Date | null }>(
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

  static async sharedJoinInfo(
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

  static async selectParticipant(fastify: FastifyInstance, input: SelectAcademyWorkshopParticipantRequest) {
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
    const expectedPhone = normalizeAcademyWorkshopPhone(participant.campaignLead.lead.phone);
    if (expectedPhone) {
      const suppliedPhone = normalizeAcademyWorkshopPhone(input.phone);
      if (!suppliedPhone || suppliedPhone !== expectedPhone) {
        throw new AcademySalesError('Số điện thoại chưa khớp với hồ sơ học viên.', 403);
      }
    }
    return this.selfCheckIn(fastify, participant, 'ROSTER_SELECTION');
  }

  static async joinWithGoogle(
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

      const participant = await tx.crmAcademyWorkshopParticipant.create({
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
          participantId: participant.id,
          eventType: 'SELF_REGISTERED_GOOGLE',
          metadataJson: JSON.stringify({ provider: 'GOOGLE', leadId: lead.id }),
          occurredAt: now,
        },
      });
      return { ...participant, workshop };
    });
    return this.selfCheckIn(fastify, participant, 'GOOGLE');
  }
}
