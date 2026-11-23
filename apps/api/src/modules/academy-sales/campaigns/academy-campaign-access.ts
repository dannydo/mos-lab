import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../../generated/crm-client/index.js';
import { AcademySalesError, canAccessAcademySales, type AcademyActor } from '../academy-sales.service.js';
import {
  ACADEMY_STAFF_ROLES,
  isAcademyCampaignTouchpointWritable,
  isCampaignVisibleToStaff,
  isManager,
  isTeamLeader,
  normalizeAcademyCampaignSnapshotLeadIds,
  roleOf,
  slugify,
  toPositiveIntList,
  type SafeRow,
} from './academy-campaign-helpers.js';

export function assertAcademyAccess(actor: AcademyActor) {
  if (!canAccessAcademySales({ ...actor, role: roleOf(actor) })) {
    throw new AcademySalesError('Bạn không có quyền truy cập chiến dịch Academy.', 403);
  }
}

export function assertCampaignManager(actor: AcademyActor) {
  assertAcademyAccess(actor);
  if (!isManager(actor)) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Marketing & Sales được thiết lập chiến dịch Academy.', 403);
  }
}

export function assertCampaignOperator(actor: AcademyActor) {
  assertAcademyAccess(actor);
  if (!isManager(actor) && !isTeamLeader(actor)) {
    throw new AcademySalesError(
      'Chỉ Admin, Quản lý, Marketing & Sales hoặc Leader Sales được thay đổi tệp khách chiến dịch.',
      403
    );
  }
}

/** Mirrors the Academy lead ownership scope without coupling this new service to the legacy campaign module. */
export async function visibleStaffIds(fastify: FastifyInstance, actor: AcademyActor): Promise<number[] | null> {
  if (isManager(actor)) return null;
  if (!isTeamLeader(actor)) return [actor.id];

  const leaderMemberships = await fastify.prisma.crm.crmTeamMember.findMany({
    where: { crmStaffId: actor.id, role: 'leader', isActive: true, team: { isActive: true } },
    select: { teamId: true },
  });
  if (!leaderMemberships.length) return [actor.id];
  const members = await fastify.prisma.crm.crmTeamMember.findMany({
    where: { teamId: { in: leaderMemberships.map((item) => item.teamId) }, isActive: true },
    select: { crmStaffId: true, legacyStaffId: true },
  });
  const legacyIds = members.map((item) => item.legacyStaffId).filter((id): id is number => Boolean(id));
  const linkedStaff = legacyIds.length
    ? await fastify.prisma.crm.crmStaff.findMany({
        where: { legacyStaffId: { in: legacyIds }, isActive: true },
        select: { id: true },
      })
    : [];
  return Array.from(
    new Set([
      actor.id,
      ...members.map((item) => item.crmStaffId).filter((id): id is number => Boolean(id)),
      ...linkedStaff.map((item) => item.id),
    ])
  );
}

export async function leadScopeWhere(
  fastify: FastifyInstance,
  actor: AcademyActor
): Promise<Prisma.CrmAcademyLeadWhereInput> {
  const ids = await visibleStaffIds(fastify, actor);
  return ids ? { ownerStaffId: { in: ids } } : {};
}

export async function resolveExistingStaffId(fastify: FastifyInstance, staffId: number) {
  const staff = await fastify.prisma.crm.crmStaff.findUnique({ where: { id: staffId }, select: { id: true } });
  return staff?.id ?? null;
}

export async function validateAssignedStaffIds(fastify: FastifyInstance, values: unknown) {
  const ids = toPositiveIntList(values);
  if (!ids.length) return [];
  const staff = await fastify.prisma.crm.crmStaff.findMany({
    where: { id: { in: ids }, isActive: true, role: { in: ACADEMY_STAFF_ROLES } },
    select: { id: true },
  });
  if (staff.length !== ids.length) {
    throw new AcademySalesError('Danh sách nhân sự chiến dịch có người không hợp lệ hoặc không thuộc Academy.');
  }
  return ids;
}

export async function ensureAccessibleLeads(fastify: FastifyInstance, actor: AcademyActor, leadIds: unknown) {
  const ids = normalizeAcademyCampaignSnapshotLeadIds(leadIds);
  if (!ids.length) return [];
  const rows = await fastify.prisma.crm.crmAcademyLead.findMany({
    where: { AND: [{ id: { in: ids } }, await leadScopeWhere(fastify, actor)] },
    select: { id: true },
  });
  if (rows.length !== ids.length) {
    throw new AcademySalesError('Tệp lead chứa khách hàng Academy ngoài phạm vi phụ trách hoặc không tồn tại.', 403);
  }
  return ids;
}

export async function findCampaignRow(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
  assertAcademyAccess(actor);
  const campaign = await fastify.prisma.crm.crmAcademyCampaign.findUnique({
    where: { id: campaignId },
    include: {
      createdBy: { select: { id: true, displayName: true, username: true, email: true } },
      touchpoints: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { leads: { where: { removedAt: null } }, touchpoints: true } },
    },
  });
  if (!campaign || campaign.kind !== 'CAMPAIGN') {
    throw new AcademySalesError('Không tìm thấy chiến dịch Academy.', 404);
  }
  if (campaign.deletedAt && !isManager(actor)) throw new AcademySalesError('Không tìm thấy chiến dịch Academy.', 404);
  const visibleIds = await visibleStaffIds(fastify, actor);
  if (!isCampaignVisibleToStaff(campaign, actor, visibleIds)) {
    throw new AcademySalesError('Bạn không có quyền xem chiến dịch này.', 403);
  }
  return campaign;
}

export async function validateCampaignDates(startDate: Date | null, endDate: Date | null) {
  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    throw new AcademySalesError('Ngày kết thúc chiến dịch phải sau hoặc bằng ngày bắt đầu.');
  }
}

export async function uniqueSlug(fastify: FastifyInstance, desired: string, excludeId?: number) {
  const base = slugify(desired) || `academy-campaign-${Date.now()}`;
  let candidate = base.slice(0, 145);
  let counter = 1;
  while (
    await fastify.prisma.crm.crmAcademyCampaign.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    const suffix = `-${counter++}`;
    candidate = `${base.slice(0, Math.max(1, 150 - suffix.length))}${suffix}`;
  }
  return candidate;
}

export function assertTouchpointWritable(campaign: SafeRow) {
  if (!isAcademyCampaignTouchpointWritable(campaign)) {
    throw new AcademySalesError(
      'Điểm chạm chỉ có thể được ghi nhận khi chiến dịch không bị tạm dừng hoặc đã kết thúc.',
      409
    );
  }
}

export async function fetchMembership(
  fastify: FastifyInstance,
  actor: AcademyActor,
  campaignId: number,
  leadId: number
) {
  await findCampaignRow(fastify, actor, campaignId);
  const membership = await fastify.prisma.crm.crmAcademyCampaignLead.findFirst({
    where: {
      campaignId,
      leadId,
      removedAt: null,
      lead: await leadScopeWhere(fastify, actor),
    },
    include: {
      campaign: true,
      lead: { include: { owner: { select: { id: true, displayName: true, username: true, email: true } } } },
      touchpointLogs: {
        include: {
          completedBy: { select: { id: true, displayName: true, username: true, email: true } },
          followUpTask: { select: { id: true } },
        },
      },
    },
  });
  if (!membership) {
    throw new AcademySalesError('Lead không thuộc chiến dịch hoặc nằm ngoài phạm vi phụ trách.', 404);
  }
  return membership;
}
