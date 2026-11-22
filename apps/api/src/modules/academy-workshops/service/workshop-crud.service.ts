import type { FastifyInstance } from 'fastify';
import {
  removeVietnameseTones,
  type AcademyWorkshopListItem,
  type AcademyWorkshopZaloTemplate,
  type CreateAcademyWorkshopRequest,
  type ListAcademyWorkshopsParams,
  type SafeAny,
  type UpdateAcademyWorkshopRequest,
  type UpsertAcademyWorkshopAgendaItemRequest,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../../academy-sales/academy-sales.service.js';
import { AcademyWorkshopAgendaTemplateService } from '../academy-workshop-agenda-template.service.js';
import {
  ACADEMY_WORKSHOP_ZALO_TEMPLATES_KEY,
  DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES,
  WORKSHOP_INCLUDE,
  WORKSHOP_STATUSES,
  assertAgendaStructureEditable,
  assertVisible,
  assignedStaffIds,
  calculateAcademyWorkshopEndsAtFromAgenda,
  canManage,
  displayCode,
  normalizeAgenda,
  normalizeHeroImageUrl,
  parseDate,
  registrationCode,
  selectionDeadline,
} from './workshop-helpers.js';
import { summarize, toParticipant } from './workshop-mappers.js';
import {
  buildWorkshopDetail,
  getWorkshopById,
  getWorkshopRowById,
  uniqueSlug,
  validateStaffIds,
} from './workshop-core.service.js';
import { ensureWorkshopCompletionFollowUps } from './workshop-participant-ops.service.js';

export async function listWorkshops(
  fastify: FastifyInstance,
  actor: AcademyActor,
  params: ListAcademyWorkshopsParams = {}
) {
  const page = Math.max(1, Math.round(Number(params.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.round(Number(params.limit) || 20)));
  const rows: SafeAny[] = await fastify.prisma.crm.crmAcademyWorkshop.findMany({
    where: {
      campaign: { kind: 'WORKSHOP', deletedAt: null },
      ...(params.status && params.status !== 'ALL' ? { status: params.status } : {}),
      ...(params.seriesKey ? { seriesKey: params.seriesKey } : {}),
    },
    include: WORKSHOP_INCLUDE,
    orderBy: [{ startsAt: 'desc' }],
  });
  const search = removeVietnameseTones(String(params.search || ''));
  const visible = rows.filter((row) => {
    try {
      assertVisible(actor, row.campaign);
    } catch {
      return false;
    }
    return (
      !search || removeVietnameseTones(`${row.campaign.name} ${row.campaign.slug} ${row.location}`).includes(search)
    );
  });
  const mapped = await Promise.all(
    visible.map(async (row) => {
      const detail = await buildWorkshopDetail(fastify, row);
      const {
        summary: _summary,
        agenda: _agenda,
        activeQuiz: _activeQuiz,
        displayCode: _displayCode,
        showInSidebar: _show,
        ...item
      } = detail;
      return item as AcademyWorkshopListItem;
    })
  );
  const allParticipants = (
    await Promise.all(
      visible.map((row) => Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd))))
    )
  ).flat();
  return {
    data: mapped.slice((page - 1) * limit, page * limit),
    total: mapped.length,
    page,
    limit,
    summary: summarize(allParticipants),
  };
}

export async function createWorkshop(
  fastify: FastifyInstance,
  actor: AcademyActor,
  input: CreateAcademyWorkshopRequest
) {
  if (!canManage(actor))
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Marketing & Sales được tạo workshop.', 403);
  const name = String(input.name || '').trim();
  const location = String(input.location || '').trim();
  if (!name || name.length > 150) throw new AcademySalesError('Tên workshop là bắt buộc và tối đa 150 ký tự.');
  if (!location || location.length > 255) throw new AcademySalesError('Địa điểm workshop là bắt buộc.');
  const startsAt = parseDate(input.startsAt, 'Thời gian bắt đầu')!;
  const capacity = Math.min(100, Math.max(1, Math.round(Number(input.capacity) || 10)));
  const feeVnd = Math.max(0, Math.round(Number(input.feeVnd) || 0));
  const feeDueAt = parseDate(input.feeDueAt, 'Hạn đóng phí', true);
  const menuSelectionDeadline = selectionDeadline(input.menuSelectionDeadline, 'Hạn chốt thực đơn', startsAt);
  const equipmentSelectionDeadline = selectionDeadline(
    input.equipmentSelectionDeadline,
    'Hạn chốt bộ dụng cụ',
    startsAt
  );
  const designSelectionDeadline = selectionDeadline(
    input.designSelectionDeadline,
    'Hạn chốt mẫu thiết kế mi',
    startsAt
  );
  const heroImageUrl = normalizeHeroImageUrl(input.heroImageUrl);
  const staffIds = await validateStaffIds(fastify, input.assignedStaffIds || []);
  if (!staffIds.includes(actor.id)) staffIds.push(actor.id);
  const slug = await uniqueSlug(fastify, input.slug || name);
  const agendaTemplate = await AcademyWorkshopAgendaTemplateService.getRequired(fastify, input.agendaTemplateId);
  const agenda = input.agenda?.length
    ? normalizeAgenda(input.agenda)
    : normalizeAgenda(agendaTemplate.items as UpsertAcademyWorkshopAgendaItemRequest[]);
  const endsAt = calculateAcademyWorkshopEndsAtFromAgenda(startsAt, agenda);

  const created = await fastify.prisma.crm.$transaction(async (tx) => {
    const campaign = await tx.crmAcademyCampaign.create({
      data: {
        kind: 'WORKSHOP',
        name,
        slug,
        description: String(input.description || '').trim() || null,
        startDate: startsAt,
        endDate: endsAt,
        status: 'SCHEDULED',
        showInSidebar: Boolean(input.showInSidebar),
        assignedStaffIds: JSON.stringify(staffIds),
        createdByStaffId: actor.id,
      },
    });
    return tx.crmAcademyWorkshop.create({
      data: {
        campaignId: campaign.id,
        startsAt,
        endsAt,
        location,
        capacity,
        feeVnd,
        feeDueAt,
        menuSelectionDeadline,
        equipmentSelectionDeadline,
        designSelectionDeadline,
        heroImageUrl,
        status: 'SCHEDULED',
        agendaTemplateId: agendaTemplate.id,
        registrationCode: registrationCode(),
        displayCode: displayCode(),
        seriesKey: campaign.slug,
        agendaItems: agenda.length ? { create: agenda } : undefined,
      },
    });
  });
  return getWorkshopById(fastify, actor, created.id);
}

export async function updateWorkshop(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: UpdateAcademyWorkshopRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  if (!canManage(actor) && actor.academyAccess !== true) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa workshop.', 403);
  }
  const name = input.name === undefined ? row.campaign.name : String(input.name).trim();
  const location = input.location === undefined ? row.location : String(input.location).trim();
  const startsAt = input.startsAt === undefined ? row.startsAt : parseDate(input.startsAt, 'Thời gian bắt đầu')!;
  if (!name || !location) throw new AcademySalesError('Thông tin thời gian/địa điểm workshop không hợp lệ.');
  const menuSelectionDeadline = selectionDeadline(
    input.menuSelectionDeadline === undefined ? row.menuSelectionDeadline : input.menuSelectionDeadline,
    'Hạn chốt thực đơn',
    startsAt
  );
  const equipmentSelectionDeadline = selectionDeadline(
    input.equipmentSelectionDeadline === undefined ? row.equipmentSelectionDeadline : input.equipmentSelectionDeadline,
    'Hạn chốt bộ dụng cụ',
    startsAt
  );
  const designSelectionDeadline = selectionDeadline(
    input.designSelectionDeadline === undefined ? row.designSelectionDeadline : input.designSelectionDeadline,
    'Hạn chốt mẫu thiết kế mi',
    startsAt
  );
  if (input.status && !WORKSHOP_STATUSES.has(input.status)) {
    throw new AcademySalesError('Trạng thái workshop không hợp lệ.');
  }
  const nextStaffIds =
    input.assignedStaffIds === undefined
      ? assignedStaffIds(row.campaign.assignedStaffIds)
      : await validateStaffIds(fastify, input.assignedStaffIds);
  const slug =
    input.slug === undefined ? row.campaign.slug : await uniqueSlug(fastify, input.slug || name, row.campaignId);
  const agendaTemplate =
    input.agendaTemplateId === undefined
      ? row.agendaTemplate
      : await AcademyWorkshopAgendaTemplateService.getRequired(fastify, input.agendaTemplateId);
  const replacingAgenda = input.agenda !== undefined || input.agendaTemplateId !== undefined;
  if (replacingAgenda) assertAgendaStructureEditable(row);
  const nextAgenda = replacingAgenda
    ? input.agenda !== undefined
      ? normalizeAgenda(input.agenda)
      : normalizeAgenda((agendaTemplate?.items || []) as UpsertAcademyWorkshopAgendaItemRequest[])
    : row.agendaItems;
  const endsAt = calculateAcademyWorkshopEndsAtFromAgenda(startsAt, nextAgenda);
  if (endsAt <= startsAt) throw new AcademySalesError('Agenda workshop cần có ít nhất một mục có thời lượng.');
  const heroImageUrl = input.heroImageUrl === undefined ? row.heroImageUrl : normalizeHeroImageUrl(input.heroImageUrl);
  let publishedAt: Date | null = row.publishedAt ? new Date(row.publishedAt) : null;
  let scheduledPublishAt: Date | null = row.scheduledPublishAt ? new Date(row.scheduledPublishAt) : null;

  if (input.scheduledPublishAt !== undefined) {
    scheduledPublishAt = input.scheduledPublishAt
      ? parseDate(input.scheduledPublishAt, 'Hạn hẹn giờ công bố', true)
      : null;
  }

  if (input.publishedAt !== undefined) {
    publishedAt = input.publishedAt ? parseDate(input.publishedAt, 'Thời gian công bố', true) : null;
  }

  if (input.status === 'SCHEDULED' && row.status !== 'SCHEDULED') {
    if (!publishedAt) publishedAt = new Date();
    scheduledPublishAt = null;
  } else if (input.status === 'DRAFT' && row.status !== 'DRAFT') {
    if (input.publishedAt === undefined) publishedAt = null;
  }

  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyCampaign.update({
      where: { id: row.campaignId },
      data: {
        name,
        slug,
        description:
          input.description === undefined ? row.campaign.description : String(input.description || '').trim() || null,
        startDate: startsAt,
        endDate: endsAt,
        showInSidebar: input.showInSidebar === undefined ? row.campaign.showInSidebar : Boolean(input.showInSidebar),
        assignedStaffIds: JSON.stringify(nextStaffIds),
        status: input.status || row.campaign.status,
      },
    });
    await tx.crmAcademyWorkshop.update({
      where: { id: row.id },
      data: {
        startsAt,
        endsAt,
        location,
        capacity: input.capacity === undefined ? row.capacity : Math.min(100, Math.max(1, Math.round(input.capacity))),
        feeVnd: input.feeVnd === undefined ? row.feeVnd : Math.max(0, Math.round(input.feeVnd)),
        feeDueAt: input.feeDueAt === undefined ? row.feeDueAt : parseDate(input.feeDueAt, 'Hạn đóng phí', true),
        menuSelectionDeadline,
        equipmentSelectionDeadline,
        designSelectionDeadline,
        heroImageUrl,
        status: input.status || row.status,
        publishedAt,
        scheduledPublishAt,
        registrationOpen: input.registrationOpen === undefined ? row.registrationOpen : Boolean(input.registrationOpen),
        agendaTemplateId: agendaTemplate?.id ?? null,
      },
    });
    if (replacingAgenda) {
      await tx.crmAcademyWorkshopAgendaItem.deleteMany({ where: { workshopId: row.id } });
      if (nextAgenda.length) {
        await tx.crmAcademyWorkshopAgendaItem.createMany({
          data: nextAgenda.map((item: SafeAny) => ({ ...item, workshopId: row.id })),
        });
      }
    }
  });
  if (input.status === 'COMPLETED') await ensureWorkshopCompletionFollowUps(fastify, actor, row.id);
  return getWorkshopById(fastify, actor, row.id);
}

export async function getWorkshopZaloTemplates(fastify: FastifyInstance): Promise<AcademyWorkshopZaloTemplate[]> {
  const record = await fastify.prisma.crm.crmConfig.findUnique({
    where: { key: ACADEMY_WORKSHOP_ZALO_TEMPLATES_KEY },
  });
  if (!record?.value) {
    return DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES;
  }
  try {
    const parsed = JSON.parse(record.value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as AcademyWorkshopZaloTemplate[];
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES;
}

export async function saveWorkshopZaloTemplates(
  fastify: FastifyInstance,
  _actor: AcademyActor,
  templates: AcademyWorkshopZaloTemplate[]
): Promise<AcademyWorkshopZaloTemplate[]> {
  if (!Array.isArray(templates) || templates.length === 0) {
    throw new AcademySalesError('Danh sách mẫu kịch bản không hợp lệ.', 400);
  }
  const sanitized: AcademyWorkshopZaloTemplate[] = templates.map((t, idx) => ({
    id: String(t.id || `template_${Date.now()}_${idx}`).trim(),
    title: String(t.title || `Mẫu ${idx + 1}`).trim(),
    content: String(t.content || '').trim(),
    isDefault: Boolean(t.isDefault),
  }));

  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: ACADEMY_WORKSHOP_ZALO_TEMPLATES_KEY },
    create: {
      key: ACADEMY_WORKSHOP_ZALO_TEMPLATES_KEY,
      value: JSON.stringify(sanitized),
    },
    update: {
      value: JSON.stringify(sanitized),
    },
  });

  return sanitized;
}
