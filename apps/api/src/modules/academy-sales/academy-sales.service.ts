import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../generated/crm-client/index.js';
import {
  type AcademyActivityType,
  type AcademyCourse,
  type AcademyFollowUpTask,
  type AcademyLead,
  type AcademyLeadActivity,
  type AcademyLeadDetail,
  type AcademyLeadStatus,
  type AcademyLeadSummary,
  type AcademyPlaybook,
  type AcademyStaffOption,
  type CreateAcademyActivityRequest,
  type CreateAcademyFollowUpRequest,
  type CreateAcademyLeadRequest,
  type ListAcademyFollowUpsParams,
  type ListAcademyLeadsParams,
  type UpdateAcademyFollowUpRequest,
  type UpdateAcademyLeadRequest,
  type UpsertAcademyCourseRequest,
  type UpsertAcademyPlaybookRequest,
  removeVietnameseTones,
  type SafeAny,
} from '@mos-lab/shared';

export type AcademyActor = { id: number; role: string; displayName?: string; email?: string };

const MANAGER_ROLES = new Set(['admin', 'manager']);
const TEAM_LEADER_ROLE = 'ls';
const ACADEMY_ROLES = new Set(['admin', 'manager', 'ls', 'telesales']);
const ICT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const HOT_WINDOW_HOURS = 72;
const WARM_WINDOW_HOURS = 168;

const STATUS_TRANSITIONS: Record<AcademyLeadStatus, AcademyLeadStatus[]> = {
  NEW: ['WARM', 'SCHEDULED', 'LOST'],
  WARM: ['SCHEDULED', 'LOST'],
  SCHEDULED: ['WARM', 'TESTED', 'LOST'],
  TESTED: ['WARM', 'WON', 'LOST'],
  WON: [],
  LOST: [],
};

export class AcademySalesError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = 'AcademySalesError';
  }
}

function isManager(actor: AcademyActor) {
  return MANAGER_ROLES.has(actor.role);
}

function isTeamLeader(actor: AcademyActor) {
  return actor.role === TEAM_LEADER_ROLE;
}

export function canAccessAcademySales(actor: AcademyActor) {
  return ACADEMY_ROLES.has(actor.role);
}

export function normalizeAcademyPhone(value: string | null | undefined): string | null {
  const raw = String(value || '').replace(/\D/g, '');
  if (!raw) return null;
  if (raw.startsWith('84') && raw.length >= 10) return `0${raw.slice(2)}`;
  return raw;
}

export function buildAcademyLeadSearchText(values: {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  source?: unknown;
  course?: unknown;
  goal?: unknown;
  note?: unknown;
}) {
  return removeVietnameseTones(
    [values.name, values.phone, values.email, values.source, values.course, values.goal, values.note]
      .filter((value) => value !== null && value !== undefined)
      .join(' ')
  ).slice(0, 1000);
}

export function normalizeLegacyAcademyStatus(value: string | null | undefined): AcademyLeadStatus {
  const raw = String(value || '')
    .trim()
    .toUpperCase();
  if (['WON', 'CONVERTED', 'DEPOSITED', 'REGISTERED', 'STUDIED'].includes(raw)) return 'WON';
  if (['LOST', 'UNQUALIFIED', 'SPAM'].includes(raw)) return 'LOST';
  if (['TESTED', 'VISITED'].includes(raw)) return 'TESTED';
  if (['SCHEDULED'].includes(raw)) return 'SCHEDULED';
  if (['WARM', 'CONTACTED', 'CONSULTED'].includes(raw)) return 'WARM';
  return 'NEW';
}

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function parseAcademyIctDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}T00:00:00+07:00`);
  return asDate(trimmed);
}

export function getAcademyIctDayBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ICT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  const date = `${year}-${month}-${day}`;
  return {
    start: new Date(`${date}T00:00:00+07:00`),
    end: new Date(`${date}T23:59:59.999+07:00`),
  };
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toOwner(staff: SafeAny): AcademyLead['owner'] {
  if (!staff) return null;
  return { id: staff.id, displayName: staff.displayName, email: staff.email ?? null };
}

function toLead(row: SafeAny): AcademyLead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    phoneNormalized: row.phoneNormalized ?? null,
    email: row.email ?? null,
    source: row.source,
    sourceSystem: row.sourceSystem,
    pancakeId: row.pancakeId ?? null,
    facebookPsid: row.facebookPsid ?? null,
    pageId: row.pageId ?? null,
    facebookChatLink: row.facebookChatLink ?? null,
    avatarUrl: row.avatarUrl ?? null,
    status: row.status as AcademyLeadStatus,
    course: row.course ?? null,
    goal: row.goal ?? null,
    flightDate: row.flightDate?.toISOString() ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    revenueVnd: Math.round(Number(row.revenueVnd) || 0),
    isHot: Boolean(row.isHot),
    hotMarkedAt: row.hotMarkedAt?.toISOString() ?? null,
    lastContactAt: row.lastContactAt?.toISOString() ?? null,
    owner: toOwner(row.owner),
    legacyOwnerEmail: row.legacyOwnerEmail ?? null,
    note: row.note ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toActivity(row: SafeAny): AcademyLeadActivity {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.activityType as AcademyActivityType,
    content: row.content ?? null,
    metadata: parseJson<Record<string, unknown> | null>(row.metadata, null),
    actor: toOwner(row.actor),
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function toFollowUp(row: SafeAny): AcademyFollowUpTask {
  return {
    id: row.id,
    leadId: row.leadId,
    leadName: row.lead?.name,
    content: row.content,
    dueAt: row.dueAt?.toISOString() ?? null,
    status: row.status === 'DONE' ? 'DONE' : 'PENDING',
    pancakeLink: row.pancakeLink ?? null,
    assignee: toOwner(row.assignee),
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPlaybook(row: SafeAny): AcademyPlaybook {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description ?? null,
    content: row.content,
    sortOrder: row.sortOrder,
    isActive: Boolean(row.isActive),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCourse(row: SafeAny): AcademyCourse {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    tag: row.tag ?? null,
    description: row.description ?? null,
    listPriceVnd: Math.round(Number(row.listPriceVnd) || 0),
    promoPriceVnd: Math.round(Number(row.promoPriceVnd) || 0),
    kitName: row.kitName ?? null,
    kitUrl: row.kitUrl ?? null,
    syllabus: parseJson<Array<{ num: number; title: string; description: string }>>(row.syllabus, []),
    sortOrder: row.sortOrder,
    isActive: Boolean(row.isActive),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function clampPagination(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export class AcademySalesService {
  private static assertAcademyAccess(actor: AcademyActor) {
    if (!canAccessAcademySales(actor)) {
      throw new AcademySalesError('Bạn không có quyền truy cập Sales Academy.', 403);
    }
  }

  private static async visibleStaffIds(fastify: FastifyInstance, actor: AcademyActor): Promise<number[] | null> {
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

  private static async leadAccessWhere(
    fastify: FastifyInstance,
    actor: AcademyActor
  ): Promise<Prisma.CrmAcademyLeadWhereInput> {
    const ids = await this.visibleStaffIds(fastify, actor);
    return ids ? { ownerStaffId: { in: ids } } : {};
  }

  private static async taskAccessWhere(
    fastify: FastifyInstance,
    actor: AcademyActor
  ): Promise<Prisma.CrmAcademyFollowUpTaskWhereInput> {
    const ids = await this.visibleStaffIds(fastify, actor);
    if (!ids) return {};
    return {
      OR: [{ assigneeStaffId: { in: ids } }, { lead: { ownerStaffId: { in: ids } } }],
    };
  }

  private static async getAccessibleLead(fastify: FastifyInstance, actor: AcademyActor, leadId: number) {
    const lead = await fastify.prisma.crm.crmAcademyLead.findFirst({
      where: { AND: [{ id: leadId }, await this.leadAccessWhere(fastify, actor)] },
      include: { owner: { select: { id: true, displayName: true, email: true } } },
    });
    if (!lead) throw new AcademySalesError('Không tìm thấy lead Academy hoặc bạn không có quyền truy cập.', 404);
    return lead;
  }

  static async listStaffOptions(fastify: FastifyInstance, actor: AcademyActor): Promise<AcademyStaffOption[]> {
    this.assertAcademyAccess(actor);
    const visibleIds = await this.visibleStaffIds(fastify, actor);
    const staff = await fastify.prisma.crm.crmStaff.findMany({
      where: {
        isActive: true,
        role: { in: ['admin', 'manager', 'ls', 'telesales'] },
        ...(visibleIds ? { id: { in: visibleIds } } : {}),
      },
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true, email: true, role: true },
    });
    return staff.map((item) => ({ ...item, email: item.email ?? null }));
  }

  static async listLeads(fastify: FastifyInstance, actor: AcademyActor, params: ListAcademyLeadsParams) {
    this.assertAcademyAccess(actor);
    const page = clampPagination(params.page, 1, 100000);
    const limit = clampPagination(params.limit, 20, 100);
    const leadAccess = await this.leadAccessWhere(fastify, actor);
    const taskAccess = await this.taskAccessWhere(fastify, actor);
    const clauses: Prisma.CrmAcademyLeadWhereInput[] = [leadAccess];
    const requestedStatus = params.status && params.status !== 'ALL' ? params.status : null;
    if (requestedStatus) clauses.push({ status: requestedStatus });
    if (params.ownerStaffId && params.ownerStaffId !== 'ALL') {
      if (params.ownerStaffId === 'UNASSIGNED') clauses.push({ ownerStaffId: null });
      else {
        const requestedOwnerId = Number(params.ownerStaffId);
        const visibleIds = await this.visibleStaffIds(fastify, actor);
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

    const [rows, total, statusGroups, hotCount, warmHotCount, wonToday, pendingFollowUps, overdueFollowUps] =
      await Promise.all([
        fastify.prisma.crm.crmAcademyLead.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          include: { owner: { select: { id: true, displayName: true, email: true } } },
        }),
        fastify.prisma.crm.crmAcademyLead.count({ where }),
        fastify.prisma.crm.crmAcademyLead.groupBy({
          by: ['status'],
          where: summaryWhere,
          _count: { _all: true },
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
      lostCount: countByStatus.get('LOST') || 0,
      hotCount,
      warmHotCount,
      pendingFollowUps,
      overdueFollowUps,
      wonToday,
    };
    return { data: rows.map(toLead), total, page, limit, summary };
  }

  static async getLead(fastify: FastifyInstance, actor: AcademyActor, leadId: number): Promise<AcademyLeadDetail> {
    await this.getAccessibleLead(fastify, actor, leadId);
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

  static async createLead(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: CreateAcademyLeadRequest
  ): Promise<AcademyLead> {
    this.assertAcademyAccess(actor);
    const name = String(input.name || '').trim();
    if (!name) throw new AcademySalesError('Tên lead là bắt buộc.');
    const visibleIds = await this.visibleStaffIds(fastify, actor);
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

  static async updateLead(
    fastify: FastifyInstance,
    actor: AcademyActor,
    leadId: number,
    input: UpdateAcademyLeadRequest
  ): Promise<AcademyLead> {
    const existing = await this.getAccessibleLead(fastify, actor, leadId);
    if (input.ownerStaffId !== undefined) {
      const visibleIds = await this.visibleStaffIds(fastify, actor);
      if (visibleIds && input.ownerStaffId !== null && !visibleIds.includes(input.ownerStaffId)) {
        throw new AcademySalesError('Bạn chỉ có thể giao lead cho thành viên trong phạm vi phụ trách.', 403);
      }
    }
    if (input.status && input.status !== existing.status) {
      const allowed = STATUS_TRANSITIONS[existing.status as AcademyLeadStatus] || [];
      if (!allowed.includes(input.status)) {
        throw new AcademySalesError(`Không thể chuyển từ ${existing.status} sang ${input.status}.`);
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
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'WON') {
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
      if (input.status && input.status !== existing.status) {
        await tx.crmAcademyLeadActivity.create({
          data: {
            leadId,
            activityType: input.status === 'WON' ? 'ENROLLMENT' : 'STATUS_CHANGE',
            content: `Chuyển trạng thái ${existing.status} → ${input.status}`,
            metadata: JSON.stringify({
              previousStatus: existing.status,
              status: input.status,
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

  static async addActivity(
    fastify: FastifyInstance,
    actor: AcademyActor,
    leadId: number,
    input: CreateAcademyActivityRequest
  ): Promise<AcademyLeadActivity> {
    await this.getAccessibleLead(fastify, actor, leadId);
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

  static async listFollowUps(fastify: FastifyInstance, actor: AcademyActor, params: ListAcademyFollowUpsParams) {
    this.assertAcademyAccess(actor);
    const page = clampPagination(params.page, 1, 100000);
    const limit = clampPagination(params.limit, 20, 100);
    const clauses: Prisma.CrmAcademyFollowUpTaskWhereInput[] = [await this.taskAccessWhere(fastify, actor)];
    if (params.status && params.status !== 'ALL') clauses.push({ status: params.status });
    const now = new Date();
    const today = getAcademyIctDayBounds(now);
    if (params.bucket === 'OVERDUE') clauses.push({ status: 'PENDING', dueAt: { lt: today.start } });
    if (params.bucket === 'TODAY') clauses.push({ status: 'PENDING', dueAt: { gte: today.start, lte: today.end } });
    if (params.bucket === 'UPCOMING') clauses.push({ status: 'PENDING', dueAt: { gt: today.end } });
    if (params.bucket === 'UNDATED') clauses.push({ status: 'PENDING', dueAt: null });
    const search = String(params.search || '').trim();
    if (search) clauses.push({ OR: [{ content: { contains: search } }, { lead: { name: { contains: search } } }] });
    const where: Prisma.CrmAcademyFollowUpTaskWhereInput = { AND: clauses };
    const [rows, total] = await Promise.all([
      fastify.prisma.crm.crmAcademyFollowUpTask.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
        include: {
          lead: { select: { name: true } },
          assignee: { select: { id: true, displayName: true, email: true } },
        },
      }),
      fastify.prisma.crm.crmAcademyFollowUpTask.count({ where }),
    ]);
    return { data: rows.map(toFollowUp), total, page, limit };
  }

  static async createFollowUp(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: CreateAcademyFollowUpRequest
  ): Promise<AcademyFollowUpTask> {
    await this.getAccessibleLead(fastify, actor, input.leadId);
    const content = String(input.content || '').trim();
    if (!content) throw new AcademySalesError('Nội dung follow-up là bắt buộc.');
    if (input.assigneeStaffId) {
      const visibleIds = await this.visibleStaffIds(fastify, actor);
      if (visibleIds && !visibleIds.includes(input.assigneeStaffId)) {
        throw new AcademySalesError('Bạn chỉ có thể giao task cho thành viên trong phạm vi phụ trách.', 403);
      }
    }
    const task = await fastify.prisma.crm.crmAcademyFollowUpTask.create({
      data: {
        leadId: input.leadId,
        content,
        dueAt: asDate(input.dueAt),
        pancakeLink: input.pancakeLink?.trim() || null,
        assigneeStaffId: input.assigneeStaffId === undefined ? actor.id : input.assigneeStaffId,
      },
      include: { lead: { select: { name: true } }, assignee: { select: { id: true, displayName: true, email: true } } },
    });
    return toFollowUp(task);
  }

  static async updateFollowUp(
    fastify: FastifyInstance,
    actor: AcademyActor,
    taskId: number,
    input: UpdateAcademyFollowUpRequest
  ): Promise<AcademyFollowUpTask> {
    this.assertAcademyAccess(actor);
    const existing = await fastify.prisma.crm.crmAcademyFollowUpTask.findUnique({ where: { id: taskId } });
    if (!existing) throw new AcademySalesError('Không tìm thấy follow-up task.', 404);
    const taskScope = await this.taskAccessWhere(fastify, actor);
    const permitted = await fastify.prisma.crm.crmAcademyFollowUpTask.findFirst({
      where: { AND: [{ id: taskId }, taskScope] },
      select: { id: true },
    });
    if (!permitted) throw new AcademySalesError('Bạn không có quyền sửa follow-up task.', 403);
    if (input.assigneeStaffId !== undefined && input.assigneeStaffId !== null) {
      const visibleIds = await this.visibleStaffIds(fastify, actor);
      if (visibleIds && !visibleIds.includes(input.assigneeStaffId)) {
        throw new AcademySalesError('Bạn chỉ có thể giao task cho thành viên trong phạm vi phụ trách.', 403);
      }
    }
    const data: Prisma.CrmAcademyFollowUpTaskUpdateInput = {};
    if (input.content !== undefined) {
      const content = String(input.content || '').trim();
      if (!content) throw new AcademySalesError('Nội dung follow-up là bắt buộc.');
      data.content = content;
    }
    if (input.dueAt !== undefined) data.dueAt = asDate(input.dueAt);
    if (input.pancakeLink !== undefined) data.pancakeLink = input.pancakeLink?.trim() || null;
    if (input.assigneeStaffId !== undefined)
      data.assignee = input.assigneeStaffId ? { connect: { id: input.assigneeStaffId } } : { disconnect: true };
    if (input.status !== undefined) {
      data.status = input.status;
      data.completedAt = input.status === 'DONE' ? new Date() : null;
    }
    const task = await fastify.prisma.crm.crmAcademyFollowUpTask.update({
      where: { id: taskId },
      data,
      include: { lead: { select: { name: true } }, assignee: { select: { id: true, displayName: true, email: true } } },
    });
    return toFollowUp(task);
  }

  static async listPlaybooks(fastify: FastifyInstance, actor: AcademyActor): Promise<AcademyPlaybook[]> {
    this.assertAcademyAccess(actor);
    const records = await fastify.prisma.crm.crmAcademyPlaybook.findMany({
      where: isManager(actor) ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    return records.map(toPlaybook);
  }

  static async upsertPlaybook(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: UpsertAcademyPlaybookRequest,
    id?: number
  ): Promise<AcademyPlaybook> {
    if (!isManager(actor)) throw new AcademySalesError('Chỉ Admin hoặc Quản lý được sửa playbook.', 403);
    const title = String(input.title || '').trim();
    const category = String(input.category || '').trim();
    const content = String(input.content || '').trim();
    if (!title || !category || !content)
      throw new AcademySalesError('Tiêu đề, danh mục và nội dung playbook là bắt buộc.');
    const data = {
      title,
      category,
      content,
      description: input.description?.trim() || null,
      sortOrder: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
      isActive: input.isActive ?? true,
    };
    const record = id
      ? await fastify.prisma.crm.crmAcademyPlaybook.update({ where: { id }, data })
      : await fastify.prisma.crm.crmAcademyPlaybook.create({ data });
    return toPlaybook(record);
  }

  static async listCourses(fastify: FastifyInstance, actor: AcademyActor): Promise<AcademyCourse[]> {
    this.assertAcademyAccess(actor);
    const records = await fastify.prisma.crm.crmAcademyCourse.findMany({
      where: isManager(actor) ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return records.map(toCourse);
  }

  static async upsertCourse(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: UpsertAcademyCourseRequest,
    id?: number
  ): Promise<AcademyCourse> {
    if (!isManager(actor)) throw new AcademySalesError('Chỉ Admin hoặc Quản lý được sửa khóa học.', 403);
    const code = String(input.code || '')
      .trim()
      .toLowerCase();
    const name = String(input.name || '').trim();
    if (!code || !name) throw new AcademySalesError('Mã và tên khóa học là bắt buộc.');
    const data = {
      code,
      name,
      tag: input.tag?.trim() || null,
      description: input.description?.trim() || null,
      listPriceVnd: Math.max(0, Math.round(Number(input.listPriceVnd) || 0)),
      promoPriceVnd: Math.max(0, Math.round(Number(input.promoPriceVnd) || 0)),
      kitName: input.kitName?.trim() || null,
      kitUrl: input.kitUrl?.trim() || null,
      syllabus: JSON.stringify(input.syllabus || []),
      sortOrder: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
      isActive: input.isActive ?? true,
    };
    const record = id
      ? await fastify.prisma.crm.crmAcademyCourse.update({ where: { id }, data })
      : await fastify.prisma.crm.crmAcademyCourse.create({ data });
    return toCourse(record);
  }
}
