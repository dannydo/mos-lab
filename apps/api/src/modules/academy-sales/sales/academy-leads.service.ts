import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../../generated/crm-client/index.js';
import {
  type AcademyLead,
  type AcademyLeadActivity,
  type AcademyLeadDetail,
  type AcademyLeadStatus,
  type AcademyLeadSummary,
  type AcademyStaffOption,
  type CreateAcademyActivityRequest,
  type CreateAcademyLeadRequest,
  type ListAcademyLeadCalendarParams,
  type ListAcademyLeadsParams,
  type RecordAcademyNoShowRequest,
  type UpdateAcademyLeadRequest,
  removeVietnameseTones,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  HOT_WINDOW_HOURS,
  STATUS_TRANSITIONS,
  WARM_WINDOW_HOURS,
  asDate,
  assertAcademyAccess,
  buildAcademyLeadSearchText,
  clampPagination,
  getAcademyIctDayBounds,
  getAcademyIctMonthBounds,
  isManager,
  leadAccessWhere,
  normalizeAcademyPhone,
  parseAcademyIctDate,
  resolveAcademyStatusForSchedule,
  taskAccessWhere,
  visibleStaffIds,
  type AcademyActor,
} from './academy-sales-helpers.js';
import { buildLeadFieldAudit, toActivity, toCalendarEvent, toFollowUp, toLead } from './academy-sales-mappers.js';

/** Shared read scope for Academy modules that operate over a lead ledger. */
export async function getAcademyLeadAccessWhere(
  fastify: FastifyInstance,
  actor: AcademyActor
): Promise<Prisma.CrmAcademyLeadWhereInput> {
  assertAcademyAccess(actor);
  return leadAccessWhere(fastify, actor);
}

/**
 * Shared Academy lead scope guard for sibling native modules. Keeping it in
 * the Sales service prevents Tố Chất, campaigns and future Academy tools
 * from quietly diverging on owner/team visibility rules.
 */
export async function getAccessibleAcademyLead(fastify: FastifyInstance, actor: AcademyActor, leadId: number) {
  assertAcademyAccess(actor);
  const lead = await fastify.prisma.crm.crmAcademyLead.findFirst({
    where: { AND: [{ id: leadId }, await leadAccessWhere(fastify, actor)] },
    include: { owner: { select: { id: true, displayName: true, email: true } } },
  });
  if (!lead) throw new AcademySalesError('Không tìm thấy lead Academy hoặc bạn không có quyền truy cập.', 404);
  return lead;
}

export async function listAcademyStaffOptions(
  fastify: FastifyInstance,
  actor: AcademyActor
): Promise<AcademyStaffOption[]> {
  assertAcademyAccess(actor);
  const visibleIds = await visibleStaffIds(fastify, actor);
  const staff = await fastify.prisma.crm.crmStaff.findMany({
    where: {
      isActive: true,
      role: { in: ['admin', 'super_admin', 'manager', 'ls', 'telesales'] },
      ...(visibleIds ? { id: { in: visibleIds } } : {}),
    },
    orderBy: { displayName: 'asc' },
    select: { id: true, displayName: true, email: true, role: true },
  });
  return staff.map((item) => ({ ...item, email: item.email ?? null }));
}

export async function listAcademyLeads(fastify: FastifyInstance, actor: AcademyActor, params: ListAcademyLeadsParams) {
  assertAcademyAccess(actor);
  const page = clampPagination(params.page, 1, 100000);
  const limit = clampPagination(params.limit, 20, 100);
  const leadAccess = await leadAccessWhere(fastify, actor);
  const taskAccess = await taskAccessWhere(fastify, actor);
  const clauses: Prisma.CrmAcademyLeadWhereInput[] = [leadAccess];
  const requestedStatus = params.status && params.status !== 'ALL' ? params.status : null;
  if (requestedStatus) clauses.push({ status: requestedStatus });
  if (params.ownerStaffId && params.ownerStaffId !== 'ALL') {
    if (params.ownerStaffId === 'UNASSIGNED') clauses.push({ ownerStaffId: null });
    else {
      const requestedOwnerId = Number(params.ownerStaffId);
      const visibleIds = await visibleStaffIds(fastify, actor);
      if (isManager(actor) || (visibleIds && visibleIds.includes(requestedOwnerId))) {
        clauses.push({ ownerStaffId: requestedOwnerId });
      }
    }
  }
  const search = String(params.search || '').trim();
  if (search) {
    const normalizedSearch = removeVietnameseTones(search);
    clauses.push({
      OR: [
        { searchText: { contains: normalizedSearch } },
        { name: { contains: search } },
        { phone: { contains: search } },
        { course: { contains: search } },
        { source: { contains: search } },
        { note: { contains: search } },
      ],
    });
  }

  const now = new Date();
  const hotStart = new Date(now.getTime() - HOT_WINDOW_HOURS * 60 * 60 * 1000);
  const warmStart = new Date(now.getTime() - WARM_WINDOW_HOURS * 60 * 60 * 1000);
  const today = getAcademyIctDayBounds(now);
  const wonTodayFilter: Prisma.CrmAcademyLeadWhereInput = {
    status: 'WON',
    activities: { some: { activityType: 'ENROLLMENT', occurredAt: { gte: today.start, lte: today.end } } },
  };
  if (params.hotView === 'PRIORITY') {
    clauses.push({
      OR: [
        { isHot: true, hotMarkedAt: { gte: hotStart } },
        { isHot: true, hotMarkedAt: { gte: warmStart, lt: hotStart } },
        wonTodayFilter,
      ],
    });
  }
  if (params.hotView === 'HOT') clauses.push({ isHot: true, hotMarkedAt: { gte: hotStart } });
  if (params.hotView === 'WARM') {
    clauses.push({ isHot: true, hotMarkedAt: { gte: warmStart, lt: hotStart } });
  }
  if (params.hotView === 'WON_TODAY') {
    clauses.push(wonTodayFilter);
  }

  const where: Prisma.CrmAcademyLeadWhereInput = { AND: clauses };
  const summaryWhere = leadAccess;
  const orderByKey = ['createdAt', 'updatedAt', 'hotMarkedAt', 'scheduledAt'].includes(params.sortBy || '')
    ? params.sortBy || 'updatedAt'
    : 'updatedAt';
  const orderBy = {
    [orderByKey]: params.sortOrder === 'asc' ? 'asc' : 'desc',
  } as Prisma.CrmAcademyLeadOrderByWithRelationInput;

  const [rows, total, statusGroups, wonRevenue, hotCount, warmHotCount, wonToday, pendingFollowUps, overdueFollowUps] =
    await Promise.all([
      fastify.prisma.crm.crmAcademyLead.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          owner: { select: { id: true, displayName: true, email: true } },
          // Select only the compact task projection needed by the grid. This
          // intentionally decouples Lead Manager from future task metadata.
          followUps: {
            where: { status: 'PENDING' },
            orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
            take: 1,
            select: {
              id: true,
              content: true,
              dueAt: true,
              assignee: { select: { id: true, displayName: true, email: true } },
            },
          },
          _count: { select: { followUps: { where: { status: 'PENDING' } } } },
        },
      }),
      fastify.prisma.crm.crmAcademyLead.count({ where }),
      fastify.prisma.crm.crmAcademyLead.groupBy({
        by: ['status'],
        where: summaryWhere,
        _count: { _all: true },
      }),
      fastify.prisma.crm.crmAcademyLead.aggregate({
        where: { AND: [summaryWhere, { status: 'WON' }] },
        _sum: { revenueVnd: true },
      }),
      fastify.prisma.crm.crmAcademyLead.count({
        where: { AND: [summaryWhere, { isHot: true, hotMarkedAt: { gte: hotStart } }] },
      }),
      fastify.prisma.crm.crmAcademyLead.count({
        where: { AND: [summaryWhere, { isHot: true, hotMarkedAt: { gte: warmStart, lt: hotStart } }] },
      }),
      fastify.prisma.crm.crmAcademyLead.count({
        where: {
          AND: [
            summaryWhere,
            {
              status: 'WON',
              activities: { some: { activityType: 'ENROLLMENT', occurredAt: { gte: today.start, lte: today.end } } },
            },
          ],
        },
      }),
      fastify.prisma.crm.crmAcademyFollowUpTask.count({
        where: { AND: [taskAccess, { status: 'PENDING' }] },
      }),
      fastify.prisma.crm.crmAcademyFollowUpTask.count({
        where: { AND: [taskAccess, { status: 'PENDING', dueAt: { lt: today.start } }] },
      }),
    ]);
  const countByStatus = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const summary: AcademyLeadSummary = {
    total: Array.from(countByStatus.values()).reduce((sum, count) => sum + count, 0),
    newCount: countByStatus.get('NEW') || 0,
    warmCount: countByStatus.get('WARM') || 0,
    scheduledCount: countByStatus.get('SCHEDULED') || 0,
    testedCount: countByStatus.get('TESTED') || 0,
    wonCount: countByStatus.get('WON') || 0,
    wonRevenueVnd: Math.round(Number(wonRevenue._sum.revenueVnd) || 0),
    lostCount: countByStatus.get('LOST') || 0,
    hotCount,
    warmHotCount,
    pendingFollowUps,
    overdueFollowUps,
    wonToday,
  };
  return { data: rows.map(toLead), total, page, limit, summary };
}

export async function listAcademyCalendarEvents(
  fastify: FastifyInstance,
  actor: AcademyActor,
  params: ListAcademyLeadCalendarParams
) {
  assertAcademyAccess(actor);
  const { month, start, end } = getAcademyIctMonthBounds(params.month);
  const clauses: Prisma.CrmAcademyLeadWhereInput[] = [await leadAccessWhere(fastify, actor)];
  if (params.ownerStaffId && params.ownerStaffId !== 'ALL') {
    if (params.ownerStaffId === 'UNASSIGNED') clauses.push({ ownerStaffId: null });
    else {
      const ownerStaffId = Number(params.ownerStaffId);
      const visibleIds = await visibleStaffIds(fastify, actor);
      if (isManager(actor) || (visibleIds && visibleIds.includes(ownerStaffId))) {
        clauses.push({ ownerStaffId });
      }
    }
  }
  const rows = await fastify.prisma.crm.crmAcademyLead.findMany({
    where: {
      AND: [
        ...clauses,
        {
          OR: [{ scheduledAt: { gte: start, lte: end } }, { flightDate: { gte: start, lte: end } }],
        },
      ],
    },
    orderBy: [{ scheduledAt: 'asc' }, { flightDate: 'asc' }],
    include: { owner: { select: { id: true, displayName: true, email: true } } },
  });
  return { month, data: rows.map(toCalendarEvent) };
}

export async function getAcademyLead(
  fastify: FastifyInstance,
  actor: AcademyActor,
  leadId: number
): Promise<AcademyLeadDetail> {
  await getAccessibleAcademyLead(fastify, actor, leadId);
  const lead = await fastify.prisma.crm.crmAcademyLead.findUniqueOrThrow({
    where: { id: leadId },
    include: {
      owner: { select: { id: true, displayName: true, email: true } },
      activities: {
        orderBy: { occurredAt: 'desc' },
        include: { actor: { select: { id: true, displayName: true, email: true } } },
      },
      followUps: {
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
        include: { assignee: { select: { id: true, displayName: true, email: true } } },
      },
    },
  });
  return {
    ...toLead(lead),
    activities: lead.activities.map(toActivity),
    followUpTasks: lead.followUps.map(toFollowUp),
  };
}

export async function createAcademyLead(
  fastify: FastifyInstance,
  actor: AcademyActor,
  input: CreateAcademyLeadRequest
): Promise<AcademyLead> {
  assertAcademyAccess(actor);
  const name = String(input.name || '').trim();
  if (!name) throw new AcademySalesError('Tên lead là bắt buộc.');
  const visibleIds = await visibleStaffIds(fastify, actor);
  const ownerStaffId = input.ownerStaffId ?? actor.id;
  if (visibleIds && !visibleIds.includes(ownerStaffId)) {
    throw new AcademySalesError('Bạn chỉ có thể tạo lead cho thành viên trong phạm vi phụ trách.', 403);
  }
  const lead = await fastify.prisma.crm.crmAcademyLead.create({
    data: {
      name,
      phone: input.phone?.trim() || null,
      phoneNormalized: normalizeAcademyPhone(input.phone),
      searchText: buildAcademyLeadSearchText(input),
      email: input.email?.trim() || null,
      source: input.source?.trim() || 'Manual',
      sourceSystem: 'MANUAL',
      course: input.course?.trim() || null,
      goal: input.goal?.trim() || null,
      flightDate: parseAcademyIctDate(input.flightDate),
      scheduledAt: asDate(input.scheduledAt),
      note: input.note?.trim() || null,
      ownerStaffId: ownerStaffId || null,
      status: asDate(input.scheduledAt) ? 'SCHEDULED' : 'NEW',
      createdByStaffId: actor.id,
      activities: {
        create: {
          activityType: 'NOTE',
          content: 'Tạo lead mới trong mOS.',
          actorStaffId: actor.id,
          occurredAt: new Date(),
        },
      },
    },
    include: { owner: { select: { id: true, displayName: true, email: true } } },
  });
  return toLead(lead);
}

export async function updateAcademyLead(
  fastify: FastifyInstance,
  actor: AcademyActor,
  leadId: number,
  input: UpdateAcademyLeadRequest
): Promise<AcademyLead> {
  const existing = await getAccessibleAcademyLead(fastify, actor, leadId);
  if (input.ownerStaffId !== undefined) {
    const visibleIds = await visibleStaffIds(fastify, actor);
    if (visibleIds && input.ownerStaffId !== null && !visibleIds.includes(input.ownerStaffId)) {
      throw new AcademySalesError('Bạn chỉ có thể giao lead cho thành viên trong phạm vi phụ trách.', 403);
    }
  }
  const nextStatus = resolveAcademyStatusForSchedule(
    existing.status as AcademyLeadStatus,
    input.status,
    input.scheduledAt
  );
  if (nextStatus && nextStatus !== existing.status) {
    const allowed = STATUS_TRANSITIONS[existing.status as AcademyLeadStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new AcademySalesError(`Không thể chuyển từ ${existing.status} sang ${nextStatus}.`);
    }
  }
  const data: Prisma.CrmAcademyLeadUpdateInput = {};
  if (input.name !== undefined) {
    const name = String(input.name || '').trim();
    if (!name) throw new AcademySalesError('Tên lead là bắt buộc.');
    data.name = name;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone?.trim() || null;
    data.phoneNormalized = normalizeAcademyPhone(input.phone);
  }
  if (input.email !== undefined) data.email = input.email?.trim() || null;
  if (input.source !== undefined) data.source = input.source?.trim() || 'Manual';
  if (input.course !== undefined) data.course = input.course?.trim() || null;
  if (input.goal !== undefined) data.goal = input.goal?.trim() || null;
  if (input.note !== undefined) data.note = input.note?.trim() || null;
  if (input.flightDate !== undefined) data.flightDate = parseAcademyIctDate(input.flightDate);
  if (input.scheduledAt !== undefined) data.scheduledAt = asDate(input.scheduledAt);
  if (input.ownerStaffId !== undefined)
    data.owner = input.ownerStaffId ? { connect: { id: input.ownerStaffId } } : { disconnect: true };
  if (nextStatus !== undefined) {
    data.status = nextStatus;
    if (nextStatus === 'WON') {
      data.isHot = false;
      data.hotMarkedAt = null;
    }
  }
  if (input.revenueVnd !== undefined) data.revenueVnd = Math.max(0, Math.round(Number(input.revenueVnd) || 0));
  if (input.isHot !== undefined) {
    data.isHot = input.isHot;
    data.hotMarkedAt = input.isHot ? existing.hotMarkedAt || new Date() : null;
  }
  if (['name', 'phone', 'email', 'source', 'course', 'goal', 'note'].some((key) => key in input)) {
    data.searchText = buildAcademyLeadSearchText({
      name: input.name ?? existing.name,
      phone: input.phone ?? existing.phone,
      email: input.email ?? existing.email,
      source: input.source ?? existing.source,
      course: input.course ?? existing.course,
      goal: input.goal ?? existing.goal,
      note: input.note ?? existing.note,
    });
  }

  const updated = await fastify.prisma.crm.$transaction(async (tx) => {
    const lead = await tx.crmAcademyLead.update({
      where: { id: leadId },
      data,
      include: { owner: { select: { id: true, displayName: true, email: true } } },
    });
    const fieldAudit = buildLeadFieldAudit(existing, lead, input);
    if (fieldAudit.length) {
      await tx.crmAcademyLeadActivity.create({
        data: {
          leadId,
          activityType: 'FIELD_UPDATE',
          content: `Cập nhật thông tin: ${fieldAudit.map((item) => item.label).join(', ')}.`,
          metadata: JSON.stringify({ fields: fieldAudit }),
          actorStaffId: actor.id,
          occurredAt: new Date(),
        },
      });
    }
    if (nextStatus && nextStatus !== existing.status) {
      await tx.crmAcademyLeadActivity.create({
        data: {
          leadId,
          activityType: nextStatus === 'WON' ? 'ENROLLMENT' : 'STATUS_CHANGE',
          content: `Chuyển trạng thái ${existing.status} → ${nextStatus}`,
          metadata: JSON.stringify({
            previousStatus: existing.status,
            status: nextStatus,
            revenueVnd: lead.revenueVnd,
          }),
          actorStaffId: actor.id,
          occurredAt: new Date(),
        },
      });
    }
    if (input.scheduledAt !== undefined && input.scheduledAt !== existing.scheduledAt?.toISOString()) {
      await tx.crmAcademyLeadActivity.create({
        data: {
          leadId,
          activityType: 'SCHEDULED',
          content: lead.scheduledAt ? `Cập nhật lịch test: ${lead.scheduledAt.toISOString()}` : 'Xóa lịch test.',
          actorStaffId: actor.id,
          occurredAt: new Date(),
        },
      });
    }
    return lead;
  });
  return toLead(updated);
}

export async function addAcademyLeadActivity(
  fastify: FastifyInstance,
  actor: AcademyActor,
  leadId: number,
  input: CreateAcademyActivityRequest
): Promise<AcademyLeadActivity> {
  await getAccessibleAcademyLead(fastify, actor, leadId);
  const content = String(input.content || '').trim();
  if (!content) throw new AcademySalesError('Nội dung hoạt động là bắt buộc.');
  if (!['NOTE', 'CALL', 'ZALO', 'NO_SHOW'].includes(input.type)) {
    throw new AcademySalesError('Loại hoạt động không hợp lệ.');
  }
  const occurredAt = asDate(input.occurredAt) || new Date();
  const activity = await fastify.prisma.crm.$transaction(async (tx) => {
    const created = await tx.crmAcademyLeadActivity.create({
      data: { leadId, activityType: input.type, content, actorStaffId: actor.id, occurredAt },
      include: { actor: { select: { id: true, displayName: true, email: true } } },
    });
    if (input.type === 'CALL' || input.type === 'ZALO') {
      await tx.crmAcademyLead.update({
        where: { id: leadId },
        data: {
          lastContactAt: occurredAt,
          hotMarkedAt: (await tx.crmAcademyLead.findUniqueOrThrow({ where: { id: leadId } })).isHot
            ? occurredAt
            : undefined,
        },
      });
    }
    return created;
  });
  return toActivity(activity);
}

export async function recordAcademyLeadNoShow(
  fastify: FastifyInstance,
  actor: AcademyActor,
  leadId: number,
  input: RecordAcademyNoShowRequest
): Promise<AcademyLead> {
  const existing = await getAccessibleAcademyLead(fastify, actor, leadId);
  if (!existing.scheduledAt) throw new AcademySalesError('Khách hàng này chưa có lịch test để ghi nhận không đến.');
  const occurredAt = asDate(input.occurredAt) || new Date();
  const scheduledAt = existing.scheduledAt.toISOString();
  const content = String(input.content || '').trim() || `Không đến lịch test ${scheduledAt}.`;
  const lead = await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyLeadActivity.create({
      data: { leadId, activityType: 'NO_SHOW', content, actorStaffId: actor.id, occurredAt },
    });
    return tx.crmAcademyLead.update({
      where: { id: leadId },
      data: { scheduledAt: null },
      include: { owner: { select: { id: true, displayName: true, email: true } } },
    });
  });
  return toLead(lead);
}
