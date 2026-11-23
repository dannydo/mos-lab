import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../../generated/crm-client/index.js';
import {
  type AcademyCampaignLeadActionResponse,
  type AcademyCampaignStats,
  type AcademyCampaignTouchpointLogActionResponse,
  type AddAcademyCampaignLeadsRequest,
  type ListAcademyCampaignLeadsParams,
  type ListAcademyCampaignLeadsResponse,
  type RemoveAcademyCampaignLeadRequest,
  type ToggleAcademyCampaignTouchpointLogRequest,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../academy-sales.service.js';
import {
  clampPage,
  isAcademyCampaignTouchpointOutcome,
  parseIctDateTime,
  toCampaignLead,
  toTouchpointLog,
} from './academy-campaign-helpers.js';
import {
  assertAcademyAccess,
  assertCampaignOperator,
  assertTouchpointWritable,
  ensureAccessibleLeads,
  fetchMembership,
  findCampaignRow,
  leadScopeWhere,
  resolveExistingStaffId,
} from './academy-campaign-access.js';

export async function listAcademyCampaignLeads(
  fastify: FastifyInstance,
  actor: AcademyActor,
  campaignId: number,
  params: ListAcademyCampaignLeadsParams = {}
): Promise<ListAcademyCampaignLeadsResponse> {
  await findCampaignRow(fastify, actor, campaignId);
  const page = clampPage(params.page, 1, 100000);
  const limit = clampPage(params.limit, 20, 100);
  const leadClauses: Prisma.CrmAcademyLeadWhereInput[] = [await leadScopeWhere(fastify, actor)];
  if (params.status && params.status !== 'ALL') leadClauses.push({ status: params.status });
  if (params.ownerStaffId && params.ownerStaffId !== 'ALL') {
    if (params.ownerStaffId === 'UNASSIGNED') leadClauses.push({ ownerStaffId: null });
    else leadClauses.push({ ownerStaffId: Number(params.ownerStaffId) });
  }
  const search = String(params.search || '').trim();
  if (search) {
    const normalized = removeVietnameseTones(search);
    leadClauses.push({
      OR: [
        { searchText: { contains: normalized } },
        { name: { contains: search } },
        { phone: { contains: search } },
        { course: { contains: search } },
        { source: { contains: search } },
      ],
    });
  }
  const where: Prisma.CrmAcademyCampaignLeadWhereInput = {
    campaignId,
    removedAt: null,
    lead: { AND: leadClauses },
  };
  const include = {
    addedBy: { select: { id: true, displayName: true, username: true, email: true } },
    removedBy: { select: { id: true, displayName: true, username: true, email: true } },
    lead: { include: { owner: { select: { id: true, displayName: true, username: true, email: true } } } },
    touchpointLogs: {
      orderBy: { completedAt: 'desc' as const },
      include: {
        completedBy: { select: { id: true, displayName: true, username: true, email: true } },
        followUpTask: { select: { id: true } },
      },
    },
  };
  const [rows, total] = await Promise.all([
    fastify.prisma.crm.crmAcademyCampaignLead.findMany({
      where,
      include,
      orderBy: { addedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    fastify.prisma.crm.crmAcademyCampaignLead.count({ where }),
  ]);
  return { data: rows.map((row) => toCampaignLead(row)), total, page, limit };
}

export async function addAcademyCampaignLeads(
  fastify: FastifyInstance,
  actor: AcademyActor,
  campaignId: number,
  input: AddAcademyCampaignLeadsRequest
): Promise<AcademyCampaignLeadActionResponse[]> {
  assertCampaignOperator(actor);
  const campaign = await findCampaignRow(fastify, actor, campaignId);
  if (campaign.status === 'COMPLETED' || campaign.status === 'ARCHIVED' || campaign.status === 'DELETED') {
    throw new AcademySalesError('Không thể thêm lead vào chiến dịch đã chốt hoặc lưu trữ.', 409);
  }
  const leadIds = await ensureAccessibleLeads(fastify, actor, input.leadIds);
  if (!leadIds.length) throw new AcademySalesError('Cần chọn ít nhất một lead Academy.');
  const actorStaffId = await resolveExistingStaffId(fastify, actor.id);
  await fastify.prisma.crm.$transaction(async (tx) => {
    for (const leadId of leadIds) {
      await tx.crmAcademyCampaignLead.upsert({
        where: { campaignId_leadId: { campaignId, leadId } },
        create: { campaignId, leadId, addedByStaffId: actorStaffId },
        update: {
          addedAt: new Date(),
          addedByStaffId: actorStaffId,
          removedAt: null,
          removedReason: null,
          removedByStaffId: null,
        },
      });
    }
  });
  const rows = await fastify.prisma.crm.crmAcademyCampaignLead.findMany({
    where: { campaignId, leadId: { in: leadIds } },
    include: {
      addedBy: { select: { id: true, displayName: true, username: true, email: true } },
      removedBy: { select: { id: true, displayName: true, username: true, email: true } },
      lead: { include: { owner: { select: { id: true, displayName: true, username: true, email: true } } } },
      touchpointLogs: {
        include: {
          completedBy: { select: { id: true, displayName: true, username: true, email: true } },
          followUpTask: { select: { id: true } },
        },
      },
    },
  });
  return rows.map((row) => ({
    success: true,
    data: toCampaignLead(row),
    message: 'Đã thêm lead vào tệp chiến dịch.',
  }));
}

export async function removeAcademyCampaignLead(
  fastify: FastifyInstance,
  actor: AcademyActor,
  campaignId: number,
  leadId: number,
  input: RemoveAcademyCampaignLeadRequest = {}
): Promise<AcademyCampaignLeadActionResponse> {
  assertCampaignOperator(actor);
  const membership = await fetchMembership(fastify, actor, campaignId, leadId);
  const actorStaffId = await resolveExistingStaffId(fastify, actor.id);
  const row = await fastify.prisma.crm.crmAcademyCampaignLead.update({
    where: { id: membership.id },
    data: {
      removedAt: new Date(),
      removedReason: String(input.reason || '').trim() || null,
      removedByStaffId: actorStaffId,
    },
    include: {
      addedBy: { select: { id: true, displayName: true, username: true, email: true } },
      removedBy: { select: { id: true, displayName: true, username: true, email: true } },
      lead: { include: { owner: { select: { id: true, displayName: true, username: true, email: true } } } },
      touchpointLogs: {
        include: {
          completedBy: { select: { id: true, displayName: true, username: true, email: true } },
          followUpTask: { select: { id: true } },
        },
      },
    },
  });
  return {
    success: true,
    data: toCampaignLead(row),
    message: 'Đã gỡ lead khỏi tệp chiến dịch; lịch sử vẫn được lưu.',
  };
}

export async function toggleAcademyCampaignTouchpointLog(
  fastify: FastifyInstance,
  actor: AcademyActor,
  campaignId: number,
  leadId: number,
  touchpointId: number,
  input: ToggleAcademyCampaignTouchpointLogRequest
): Promise<AcademyCampaignTouchpointLogActionResponse> {
  assertAcademyAccess(actor);
  const membership = await fetchMembership(fastify, actor, campaignId, leadId);
  assertTouchpointWritable(membership.campaign);
  const touchpoint = await fastify.prisma.crm.crmAcademyCampaignTouchpoint.findFirst({
    where: { id: touchpointId, campaignId },
  });
  if (!touchpoint) throw new AcademySalesError('Điểm chạm không thuộc chiến dịch này.', 404);
  if (input.status !== null && !isAcademyCampaignTouchpointOutcome(input.status)) {
    throw new AcademySalesError('Kết quả điểm chạm không hợp lệ.');
  }
  const status = input.status;
  const callbackDueAt = parseIctDateTime(input.callbackDueAt, 'Thời gian hẹn gọi lại');
  if (status === 'CALLBACK' && !callbackDueAt) {
    throw new AcademySalesError('Điểm chạm hẹn gọi lại cần thời gian thực hiện.');
  }
  if (status !== 'CALLBACK' && callbackDueAt) {
    throw new AcademySalesError('Chỉ kết quả hẹn gọi lại mới được đặt thời gian follow-up.');
  }
  const actorStaffId = await resolveExistingStaffId(fastify, actor.id);
  const now = new Date();
  const note = String(input.note || '').trim() || null;
  const log = await fastify.prisma.crm.$transaction(async (tx) => {
    const saved = await tx.crmAcademyCampaignTouchpointLog.upsert({
      where: { campaignLeadId_touchpointId: { campaignLeadId: membership.id, touchpointId } },
      create: {
        campaignLeadId: membership.id,
        touchpointId,
        isChecked: status !== null,
        status,
        completedAt: status === null ? null : now,
        completedByStaffId: status === null ? null : actorStaffId,
        completedByStaffName: status === null ? null : actor.displayName || `Nhân sự #${actor.id}`,
        note,
        callbackDueAt: status === 'CALLBACK' ? callbackDueAt : null,
      },
      update: {
        isChecked: status !== null,
        status,
        completedAt: status === null ? null : now,
        completedByStaffId: status === null ? null : actorStaffId,
        completedByStaffName: status === null ? null : actor.displayName || `Nhân sự #${actor.id}`,
        note,
        callbackDueAt: status === 'CALLBACK' ? callbackDueAt : null,
      },
      include: { followUpTask: true },
    });

    if (status === 'CALLBACK' && callbackDueAt) {
      const assigneeStaffId = membership.lead.ownerStaffId || actorStaffId;
      const content = `[${membership.campaign.name}] ${touchpoint.label}: ${note || 'Hẹn gọi lại khách hàng.'}`;
      if (saved.followUpTask) {
        await tx.crmAcademyFollowUpTask.update({
          where: { id: saved.followUpTask.id },
          data: {
            content,
            dueAt: callbackDueAt,
            status: 'PENDING',
            completedAt: null,
            assigneeStaffId,
            pancakeLink: membership.lead.facebookChatLink || null,
          },
        });
      } else {
        await tx.crmAcademyFollowUpTask.create({
          data: {
            leadId: membership.leadId,
            content,
            dueAt: callbackDueAt,
            status: 'PENDING',
            pancakeLink: membership.lead.facebookChatLink || null,
            assigneeStaffId,
            campaignTouchpointLogId: saved.id,
          },
        });
      }
    } else if (saved.followUpTask && saved.followUpTask.status === 'PENDING') {
      await tx.crmAcademyFollowUpTask.update({
        where: { id: saved.followUpTask.id },
        data: { status: 'DONE', completedAt: now },
      });
    }

    if (status !== null) {
      await tx.crmAcademyLeadActivity.create({
        data: {
          leadId: membership.leadId,
          activityType: 'NOTE',
          content: `Chiến dịch ${membership.campaign.name}: ${touchpoint.label} — ${status}${note ? ` · ${note}` : ''}`,
          metadata: JSON.stringify({ campaignId, touchpointId, campaignLeadId: membership.id, outcome: status }),
          actorStaffId,
          occurredAt: now,
        },
      });
    }

    return tx.crmAcademyCampaignTouchpointLog.findUniqueOrThrow({
      where: { id: saved.id },
      include: {
        completedBy: { select: { id: true, displayName: true, username: true, email: true } },
        followUpTask: { select: { id: true } },
      },
    });
  });
  return {
    success: true,
    data: toTouchpointLog(log),
    message:
      status === 'CALLBACK'
        ? 'Đã cập nhật điểm chạm và tạo/cập nhật follow-up Academy.'
        : status === null
          ? 'Đã xóa kết quả điểm chạm.'
          : 'Đã cập nhật kết quả điểm chạm.',
  };
}

export async function getAcademyCampaignStats(
  fastify: FastifyInstance,
  actor: AcademyActor,
  campaignId: number
): Promise<AcademyCampaignStats> {
  await findCampaignRow(fastify, actor, campaignId);
  const memberships = await fastify.prisma.crm.crmAcademyCampaignLead.findMany({
    where: {
      campaignId,
      removedAt: null,
      lead: await leadScopeWhere(fastify, actor),
    },
    select: {
      id: true,
      lead: { select: { status: true, revenueVnd: true } },
    },
  });
  if (!memberships.length) {
    return {
      totalLeads: 0,
      touchedLeadCount: 0,
      touchpointLogCount: 0,
      scheduledCount: 0,
      testedCount: 0,
      wonCount: 0,
      wonRate: 0,
      revenueVnd: 0,
    };
  }
  const membershipIds = memberships.map((membership) => membership.id);
  const logs = await fastify.prisma.crm.crmAcademyCampaignTouchpointLog.findMany({
    where: { campaignLeadId: { in: membershipIds }, isChecked: true },
    select: { campaignLeadId: true },
  });
  const totalLeads = memberships.length;
  const scheduledCount = memberships.filter((item) => item.lead.status === 'SCHEDULED').length;
  const testedCount = memberships.filter((item) => item.lead.status === 'TESTED').length;
  const won = memberships.filter((item) => item.lead.status === 'WON');
  return {
    totalLeads,
    touchedLeadCount: new Set(logs.map((log) => log.campaignLeadId)).size,
    touchpointLogCount: logs.length,
    scheduledCount,
    testedCount,
    wonCount: won.length,
    wonRate: totalLeads ? Number(((won.length / totalLeads) * 100).toFixed(1)) : 0,
    revenueVnd: Math.round(won.reduce((sum, item) => sum + (Number(item.lead.revenueVnd) || 0), 0)),
  };
}
