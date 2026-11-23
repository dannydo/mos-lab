import type { FastifyInstance } from 'fastify';
import type { AcademyWorkshopDetail, SafeAny } from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../../academy-sales/academy-sales.service.js';
import { toAcademyWorkshopAgendaTemplate } from '../academy-workshop-agenda-template.service.js';
import { toAcademyWorkshopDesignTemplate } from '../academy-workshop-design-template.service.js';
import { toAcademyWorkshopEquipmentTemplate } from '../academy-workshop-equipment-template.service.js';
import { toAcademyWorkshopMenuTemplate } from '../academy-workshop-menu-template.service.js';
import {
  assertVisible,
  assignedStaffIds,
  PARTICIPANT_INCLUDE,
  positiveId,
  resolveAcademyWorkshopPublicOrigin,
  slugify,
  WORKSHOP_INCLUDE,
} from './workshop-helpers.js';
import {
  designItem,
  equipmentPackage,
  menuItem,
  sortMenuItems,
  summarize,
  toAcademyWorkshopAgendaItem,
  toAcademyWorkshopQuiz,
  toParticipant,
} from './workshop-mappers.js';

export async function uniqueSlug(fastify: FastifyInstance, desired: string, excludeCampaignId?: number) {
  const base = (slugify(desired) || `academy-workshop-${Date.now()}`).slice(0, 140);
  for (let index = 0; index < 1000; index += 1) {
    const suffix = index ? `-${index}` : '';
    const candidate = `${base.slice(0, 150 - suffix.length)}${suffix}`;
    const row = await fastify.prisma.crm.crmAcademyCampaign.findFirst({
      where: { slug: candidate, ...(excludeCampaignId ? { NOT: { id: excludeCampaignId } } : {}) },
      select: { id: true },
    });
    if (!row) return candidate;
  }
  throw new AcademySalesError('Không thể tạo slug workshop duy nhất.', 409);
}

export async function validateStaffIds(fastify: FastifyInstance, values: unknown) {
  if (!Array.isArray(values)) return [];
  const ids = Array.from(new Set(values.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  const count = await fastify.prisma.crm.crmStaff.count({ where: { id: { in: ids }, isActive: true } });
  if (count !== ids.length) throw new AcademySalesError('Danh sách nhân sự workshop có người không hợp lệ.');
  return ids;
}

export async function getWorkshopRowById(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number
): Promise<SafeAny> {
  const row: SafeAny = await fastify.prisma.crm.crmAcademyWorkshop.findUnique({
    where: { id: positiveId(workshopId, 'Workshop ID') },
    include: WORKSHOP_INCLUDE,
  });
  if (!row || row.campaign.kind !== 'WORKSHOP' || row.campaign.deletedAt) {
    throw new AcademySalesError('Không tìm thấy workshop.', 404);
  }
  assertVisible(actor, row.campaign);
  return row;
}

export async function getWorkshopRowBySlug(
  fastify: FastifyInstance,
  actor: AcademyActor,
  slug: string
): Promise<SafeAny> {
  const row: SafeAny = await fastify.prisma.crm.crmAcademyWorkshop.findFirst({
    where: { campaign: { slug: String(slug || '').trim(), kind: 'WORKSHOP', deletedAt: null } },
    include: WORKSHOP_INCLUDE,
  });
  if (!row) throw new AcademySalesError('Không tìm thấy workshop.', 404);
  assertVisible(actor, row.campaign);
  return row;
}

export async function buildWorkshopDetail(fastify: FastifyInstance, row: SafeAny): Promise<AcademyWorkshopDetail> {
  if (row.status === 'DRAFT' && row.scheduledPublishAt && new Date(row.scheduledPublishAt).getTime() <= Date.now()) {
    row.status = 'SCHEDULED';
    row.publishedAt = row.scheduledPublishAt;
    row.scheduledPublishAt = null;
    void fastify.prisma.crm.crmAcademyWorkshop
      .update({
        where: { id: row.id },
        data: {
          status: 'SCHEDULED',
          publishedAt: row.publishedAt,
          scheduledPublishAt: null,
        },
      })
      .catch(() => undefined);
  }
  const participants = await Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd)));
  return {
    id: Number(row.id),
    campaignId: Number(row.campaignId),
    name: String(row.campaign.name),
    slug: String(row.campaign.slug),
    description: row.campaign.description ?? null,
    heroImageUrl: row.heroImageUrl ?? null,
    startsAt: new Date(row.startsAt).toISOString(),
    endsAt: new Date(row.endsAt).toISOString(),
    menuSelectionDeadline: row.menuSelectionDeadline ? new Date(row.menuSelectionDeadline).toISOString() : null,
    equipmentSelectionDeadline: row.equipmentSelectionDeadline
      ? new Date(row.equipmentSelectionDeadline).toISOString()
      : null,
    designSelectionDeadline: row.designSelectionDeadline ? new Date(row.designSelectionDeadline).toISOString() : null,
    location: String(row.location),
    capacity: Number(row.capacity),
    feeVnd: Math.max(0, Math.round(Number(row.feeVnd) || 0)),
    feeDueAt: row.feeDueAt ? new Date(row.feeDueAt).toISOString() : null,
    status: row.status,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    scheduledPublishAt: row.scheduledPublishAt ? new Date(row.scheduledPublishAt).toISOString() : null,
    agendaTemplate: row.agendaTemplate ? toAcademyWorkshopAgendaTemplate(row.agendaTemplate) : null,
    menuTemplate: row.menuTemplate ? toAcademyWorkshopMenuTemplate(row.menuTemplate) : null,
    menuAgendaItemId: row.menuAgendaItemId == null ? null : Number(row.menuAgendaItemId),
    equipmentAgendaItemId: row.equipmentAgendaItemId == null ? null : Number(row.equipmentAgendaItemId),
    designAgendaItemId: row.designAgendaItemId == null ? null : Number(row.designAgendaItemId),
    equipmentTemplate: row.equipmentTemplate ? toAcademyWorkshopEquipmentTemplate(row.equipmentTemplate) : null,
    designTemplate: row.designTemplate ? toAcademyWorkshopDesignTemplate(row.designTemplate) : null,
    assignedStaffIds: assignedStaffIds(row.campaign.assignedStaffIds),
    participantCount: participants.length,
    checkedInCount: participants.filter((item) => item.checkedInAt).length,
    liveAgendaItemId: row.liveAgendaItemId == null ? null : Number(row.liveAgendaItemId),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    showInSidebar: Boolean(row.campaign.showInSidebar),
    registrationCode: row.registrationCode ?? null,
    registrationOpen: Boolean(row.registrationOpen),
    registrationUrl: row.registrationCode
      ? `${resolveAcademyWorkshopPublicOrigin()}/academy/workshops/register/${encodeURIComponent(String(row.registrationCode))}`
      : null,
    displayCode: String(row.displayCode),
    sharedJoinUrl: `${resolveAcademyWorkshopPublicOrigin()}/academy/workshops/lobby/${encodeURIComponent(String(row.displayCode))}`,
    summary: summarize(participants),
    agenda: row.agendaItems.map((item: SafeAny) => toAcademyWorkshopAgendaItem(item)),
    menuItems: sortMenuItems((row.menuItems || []).map(menuItem)),
    equipmentPackages: (row.equipmentPackages || []).map(equipmentPackage),
    designs: (row.designs || []).map(designItem),
    activeQuiz: toAcademyWorkshopQuiz(row.quizzes?.[0], true),
    parentWorkshopId: row.parentWorkshopId ? Number(row.parentWorkshopId) : null,
    seriesKey: row.seriesKey ?? null,
    parentWorkshop: row.parentWorkshop
      ? {
          id: Number(row.parentWorkshop.id),
          name: String(row.parentWorkshop.campaign?.name || ''),
          slug: String(row.parentWorkshop.campaign?.slug || ''),
        }
      : null,
  };
}

export async function getWorkshopById(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
  return buildWorkshopDetail(fastify, await getWorkshopRowById(fastify, actor, workshopId));
}

export async function getWorkshopBySlug(fastify: FastifyInstance, actor: AcademyActor, slug: string) {
  return buildWorkshopDetail(fastify, await getWorkshopRowBySlug(fastify, actor, slug));
}

export async function getParticipantRow(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number
) {
  const workshop = await getWorkshopRowById(fastify, actor, workshopId);
  const row: SafeAny = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findFirst({
    where: { id: positiveId(participantId, 'Participant ID'), workshopId: workshop.id },
    include: PARTICIPANT_INCLUDE,
  });
  if (!row) throw new AcademySalesError('Không tìm thấy học viên trong workshop.', 404);
  return row;
}

export async function getWorkshopParticipant(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  participantId: number,
  qrToken?: string
) {
  const workshop = await getWorkshopRowById(fastify, actor, workshopId);
  const row = await getParticipantRow(fastify, actor, workshop.id, participantId);
  return toParticipant(row, workshop.feeVnd, qrToken);
}
