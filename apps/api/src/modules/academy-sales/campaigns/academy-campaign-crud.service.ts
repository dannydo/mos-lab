import type { FastifyInstance } from 'fastify';
import {
  type AcademyCampaign,
  type AcademyCampaignActionResponse,
  type AcademyCampaignAudienceFilter,
  type AcademyCampaignStatus,
  type CreateAcademyCampaignRequest,
  type ListAcademyCampaignsParams,
  type ListAcademyCampaignsResponse,
  type UpdateAcademyCampaignRequest,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../academy-sales.service.js';
import {
  campaignAssignmentIds,
  clampPage,
  isAcademyCampaignSidebarVisible,
  isCampaignStatus,
  isCampaignVisibleToStaff,
  isManager,
  normalizeAudienceFilter,
  normalizeTouchpoints,
  parseAcademyCampaignDate,
  parseJson,
  toCampaign,
} from './academy-campaign-helpers.js';
import {
  assertAcademyAccess,
  assertCampaignManager,
  ensureAccessibleLeads,
  findCampaignRow,
  resolveExistingStaffId,
  uniqueSlug,
  validateAssignedStaffIds,
  validateCampaignDates,
  visibleStaffIds,
} from './academy-campaign-access.js';

export async function listAcademyCampaigns(
  fastify: FastifyInstance,
  actor: AcademyActor,
  params: ListAcademyCampaignsParams = {}
): Promise<ListAcademyCampaignsResponse> {
  assertAcademyAccess(actor);
  const page = clampPage(params.page, 1, 100000);
  const limit = clampPage(params.limit, 20, 100);
  const requestedStatus = params.status && params.status !== 'ALL' ? params.status : undefined;
  if (requestedStatus && !isCampaignStatus(requestedStatus)) {
    throw new AcademySalesError('Trạng thái chiến dịch không hợp lệ.');
  }
  const rows = await fastify.prisma.crm.crmAcademyCampaign.findMany({
    where:
      requestedStatus === 'DELETED' && isManager(actor) ? { kind: 'CAMPAIGN' } : { kind: 'CAMPAIGN', deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: {
      createdBy: { select: { id: true, displayName: true, username: true, email: true } },
      touchpoints: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { leads: { where: { removedAt: null } }, touchpoints: true } },
    },
  });
  const visibleIds = await visibleStaffIds(fastify, actor);
  const search = removeVietnameseTones(String(params.search || ''));
  const filtered = rows.filter((row) => {
    if (requestedStatus && row.status !== requestedStatus) return false;
    if (!isCampaignVisibleToStaff(row, actor, visibleIds)) return false;
    if (!search) return true;
    return [row.name, row.slug, row.description]
      .filter(Boolean)
      .some((value) => removeVietnameseTones(String(value)).includes(search));
  });
  const total = filtered.length;
  return {
    data: filtered.slice((page - 1) * limit, page * limit).map((row) => toCampaign(row)),
    total,
    page,
    limit,
  };
}

/**
 * Returns only server-authorized campaign links for the Academy
 * submenu.  It intentionally does not use the broader campaign list scope.
 */
export async function listSidebarAcademyCampaigns(
  fastify: FastifyInstance,
  actor: AcademyActor
): Promise<AcademyCampaign[]> {
  assertAcademyAccess(actor);
  const rows = await fastify.prisma.crm.crmAcademyCampaign.findMany({
    where: {
      kind: 'CAMPAIGN',
      deletedAt: null,
      showInSidebar: true,
      status: { in: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED'] },
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    include: {
      createdBy: { select: { id: true, displayName: true, username: true, email: true } },
      _count: { select: { leads: { where: { removedAt: null } }, touchpoints: true } },
    },
  });
  return rows.filter((row) => isAcademyCampaignSidebarVisible(row, actor)).map((row) => toCampaign(row));
}

export async function getAcademyCampaignById(
  fastify: FastifyInstance,
  actor: AcademyActor,
  campaignId: number
): Promise<AcademyCampaign> {
  return toCampaign(await findCampaignRow(fastify, actor, campaignId));
}

export async function getAcademyCampaignBySlug(
  fastify: FastifyInstance,
  actor: AcademyActor,
  slug: string
): Promise<AcademyCampaign> {
  assertAcademyAccess(actor);
  const campaign = await fastify.prisma.crm.crmAcademyCampaign.findUnique({
    where: { slug: String(slug || '').trim() },
    include: {
      createdBy: { select: { id: true, displayName: true, username: true, email: true } },
      touchpoints: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { leads: { where: { removedAt: null } }, touchpoints: true } },
    },
  });
  if (!campaign || campaign.kind !== 'CAMPAIGN') {
    throw new AcademySalesError('Không tìm thấy chiến dịch Academy.', 404);
  }
  return getAcademyCampaignById(fastify, actor, campaign.id);
}

export async function createAcademyCampaign(
  fastify: FastifyInstance,
  actor: AcademyActor,
  input: CreateAcademyCampaignRequest
): Promise<AcademyCampaignActionResponse> {
  assertCampaignManager(actor);
  const name = String(input.name || '').trim();
  if (!name || name.length > 150) throw new AcademySalesError('Tên chiến dịch là bắt buộc và tối đa 150 ký tự.');
  const status = input.status || 'DRAFT';
  if (!isCampaignStatus(status) || status === 'DELETED') {
    throw new AcademySalesError('Trạng thái chiến dịch không hợp lệ.');
  }
  const startDate = parseAcademyCampaignDate(input.startDate, 'Ngày bắt đầu');
  const endDate = parseAcademyCampaignDate(input.endDate, 'Ngày kết thúc');
  await validateCampaignDates(startDate, endDate);
  const [assignedStaffIds, leadIds] = await Promise.all([
    validateAssignedStaffIds(fastify, input.assignedStaffIds),
    ensureAccessibleLeads(fastify, actor, input.leadIds),
  ]);
  const touchpoints = normalizeTouchpoints(input.touchpoints, true);
  const slug = await uniqueSlug(fastify, input.slug || name);
  const createdByStaffId = await resolveExistingStaffId(fastify, actor.id);
  const audienceFilter = normalizeAudienceFilter(input.audienceFilter);
  const audienceSummary =
    String(input.audienceSummary || '')
      .trim()
      .slice(0, 2000) || null;
  const row = await fastify.prisma.crm.$transaction(async (tx) => {
    const campaign = await tx.crmAcademyCampaign.create({
      data: {
        kind: 'CAMPAIGN',
        name,
        slug,
        description: String(input.description || '').trim() || null,
        startDate,
        endDate,
        status,
        showInSidebar: Boolean(input.showInSidebar),
        assignedStaffIds: assignedStaffIds.length ? JSON.stringify(assignedStaffIds) : null,
        audienceFilterJson: audienceFilter ? JSON.stringify(audienceFilter) : null,
        audienceSummary,
        createdByStaffId,
        touchpoints: touchpoints.length
          ? {
              create: touchpoints.map((item, index) => ({
                key: item.key,
                label: item.label,
                icon: item.icon || null,
                daysMin: item.daysMin,
                daysMax: item.daysMax ?? null,
                color: item.color || null,
                sortOrder: item.sortOrder ?? index + 1,
              })),
            }
          : undefined,
        leads: leadIds.length
          ? {
              create: leadIds.map((leadId) => ({ leadId, addedByStaffId: createdByStaffId })),
            }
          : undefined,
      },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true, email: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { leads: { where: { removedAt: null } }, touchpoints: true } },
      },
    });
    return campaign;
  });
  return { success: true, data: toCampaign(row), message: 'Đã tạo chiến dịch Academy với tệp lead cố định.' };
}

export async function updateAcademyCampaign(
  fastify: FastifyInstance,
  actor: AcademyActor,
  campaignId: number,
  input: UpdateAcademyCampaignRequest
): Promise<AcademyCampaignActionResponse> {
  assertCampaignManager(actor);
  const existing = await findCampaignRow(fastify, actor, campaignId);
  const nextName = input.name === undefined ? existing.name : String(input.name || '').trim();
  if (!nextName || nextName.length > 150) {
    throw new AcademySalesError('Tên chiến dịch là bắt buộc và tối đa 150 ký tự.');
  }
  const nextStatus = input.status === undefined ? (existing.status as AcademyCampaignStatus) : input.status;
  if (!isCampaignStatus(nextStatus) || nextStatus === 'DELETED') {
    throw new AcademySalesError('Trạng thái chiến dịch không hợp lệ.');
  }
  const startDate =
    input.startDate === undefined ? existing.startDate : parseAcademyCampaignDate(input.startDate, 'Ngày bắt đầu');
  const endDate =
    input.endDate === undefined ? existing.endDate : parseAcademyCampaignDate(input.endDate, 'Ngày kết thúc');
  await validateCampaignDates(startDate, endDate);
  const assignedStaffIds =
    input.assignedStaffIds === undefined
      ? campaignAssignmentIds(existing)
      : await validateAssignedStaffIds(fastify, input.assignedStaffIds);
  const showInSidebar =
    input.showInSidebar === undefined ? Boolean(existing.showInSidebar) : Boolean(input.showInSidebar);
  const audienceFilter =
    input.audienceFilter === undefined
      ? parseJson<AcademyCampaignAudienceFilter | null>(existing.audienceFilterJson, null)
      : normalizeAudienceFilter(input.audienceFilter);
  const audienceSummary =
    input.audienceSummary === undefined
      ? existing.audienceSummary
      : String(input.audienceSummary || '')
          .trim()
          .slice(0, 2000) || null;
  const touchpoints = input.touchpoints === undefined ? undefined : normalizeTouchpoints(input.touchpoints, false);
  const slug =
    input.slug !== undefined || input.name !== undefined
      ? await uniqueSlug(fastify, input.slug || nextName, campaignId)
      : existing.slug;

  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyCampaign.update({
      where: { id: campaignId },
      data: {
        name: nextName,
        slug,
        description:
          input.description === undefined ? existing.description : String(input.description || '').trim() || null,
        startDate,
        endDate,
        status: nextStatus,
        showInSidebar,
        assignedStaffIds: assignedStaffIds.length ? JSON.stringify(assignedStaffIds) : null,
        audienceFilterJson: audienceFilter ? JSON.stringify(audienceFilter) : null,
        audienceSummary,
      },
    });

    if (touchpoints !== undefined) {
      const keys = touchpoints.map((item) => item.key);
      for (const [index, item] of touchpoints.entries()) {
        await tx.crmAcademyCampaignTouchpoint.upsert({
          where: { campaignId_key: { campaignId, key: item.key } },
          create: {
            campaignId,
            key: item.key,
            label: item.label,
            icon: item.icon || null,
            daysMin: item.daysMin,
            daysMax: item.daysMax ?? null,
            color: item.color || null,
            sortOrder: item.sortOrder ?? index + 1,
          },
          update: {
            label: item.label,
            icon: item.icon || null,
            daysMin: item.daysMin,
            daysMax: item.daysMax ?? null,
            color: item.color || null,
            sortOrder: item.sortOrder ?? index + 1,
          },
        });
      }
      const stale = await tx.crmAcademyCampaignTouchpoint.findMany({
        where: { campaignId, key: { notIn: keys } },
        include: { _count: { select: { logs: true } } },
      });
      for (const touchpoint of stale) {
        if (touchpoint._count.logs > 0) {
          throw new AcademySalesError(
            `Không thể xóa điểm chạm ${touchpoint.label} vì đã có lịch sử thực hiện; hãy giữ lại hoặc đổi nhãn.`
          );
        }
        await tx.crmAcademyCampaignTouchpoint.delete({ where: { id: touchpoint.id } });
      }
    }
  });
  const updated = await findCampaignRow(fastify, actor, campaignId);
  return { success: true, data: toCampaign(updated), message: 'Đã cập nhật cấu hình chiến dịch Academy.' };
}

export async function setAcademyCampaignStatus(
  fastify: FastifyInstance,
  actor: AcademyActor,
  campaignId: number,
  status: AcademyCampaignStatus
): Promise<AcademyCampaignActionResponse> {
  return updateAcademyCampaign(fastify, actor, campaignId, { status });
}

export async function archiveAcademyCampaign(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
  return setAcademyCampaignStatus(fastify, actor, campaignId, 'ARCHIVED');
}

export async function deleteAcademyCampaign(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
  assertCampaignManager(actor);
  await findCampaignRow(fastify, actor, campaignId);
  await fastify.prisma.crm.crmAcademyCampaign.update({
    where: { id: campaignId },
    data: { status: 'DELETED', deletedAt: new Date() },
  });
  return {
    success: true as const,
    message: 'Đã lưu trữ mềm chiến dịch Academy; lịch sử và tệp lead vẫn được giữ lại.',
  };
}

export async function restoreAcademyCampaign(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
  assertCampaignManager(actor);
  const campaign = await fastify.prisma.crm.crmAcademyCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AcademySalesError('Không tìm thấy chiến dịch Academy.', 404);
  await fastify.prisma.crm.crmAcademyCampaign.update({
    where: { id: campaignId },
    data: { status: 'DRAFT', deletedAt: null },
  });
  const restored = await findCampaignRow(fastify, actor, campaignId);
  return {
    success: true as const,
    data: toCampaign(restored),
    message: 'Đã khôi phục chiến dịch về trạng thái nháp.',
  };
}

export async function cloneAcademyCampaign(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
  assertCampaignManager(actor);
  const original = await findCampaignRow(fastify, actor, campaignId);
  const createdByStaffId = await resolveExistingStaffId(fastify, actor.id);
  const slug = await uniqueSlug(fastify, `[ban sao] ${original.name}`);
  const cloned = await fastify.prisma.crm.crmAcademyCampaign.create({
    data: {
      name: `[Bản sao] ${original.name}`.slice(0, 150),
      slug,
      description: original.description,
      startDate: original.startDate,
      endDate: original.endDate,
      status: 'DRAFT',
      assignedStaffIds: original.assignedStaffIds,
      audienceFilterJson: original.audienceFilterJson,
      audienceSummary: original.audienceSummary,
      createdByStaffId,
      touchpoints: {
        create: original.touchpoints.map((touchpoint) => ({
          key: touchpoint.key,
          label: touchpoint.label,
          icon: touchpoint.icon,
          daysMin: touchpoint.daysMin,
          daysMax: touchpoint.daysMax,
          color: touchpoint.color,
          sortOrder: touchpoint.sortOrder,
        })),
      },
    },
    include: {
      createdBy: { select: { id: true, displayName: true, username: true, email: true } },
      touchpoints: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { leads: { where: { removedAt: null } }, touchpoints: true } },
    },
  });
  return {
    success: true as const,
    data: toCampaign(cloned),
    message: 'Đã nhân bản cấu hình chiến dịch ở trạng thái nháp. Tệp lead không được sao chép.',
  };
}
