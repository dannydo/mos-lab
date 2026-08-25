import type { FastifyInstance } from 'fastify';
import type { AcademyWorkshopSharedJoinInfo, SelectAcademyWorkshopParticipantRequest } from '@mos-lab/shared';
import { AcademySalesError } from '../academy-sales/academy-sales.service.js';

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
    return participant;
  }
}
