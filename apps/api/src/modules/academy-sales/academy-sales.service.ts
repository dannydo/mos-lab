import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../generated/crm-client/index.js';
import { TeamService } from '../teams/team.service.js';
import {
  type AcademyActivityType,
  type AcademyCourse,
  type AcademyLeadCalendarEvent,
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
  type ListAcademyLeadCalendarParams,
  type ListAcademyLeadsParams,
  type UpdateAcademyFollowUpRequest,
  type UpdateAcademyLeadRequest,
  type RecordAcademyNoShowRequest,
  type UpsertAcademyCourseRequest,
  type UpsertAcademyPlaybookRequest,
  isAdminOrSuperAdminRole,
  removeVietnameseTones,
  type SafeAny,
} from '@mos-lab/shared';

export type AcademyActor = { id: number; role: string; displayName?: string; email?: string; academyAccess?: boolean };

const MANAGER_ROLES = new Set(['admin', 'super_admin', 'manager']);
const TEAM_LEADER_ROLE = 'ls';
const ACADEMY_ROLES = new Set(['admin', 'super_admin', 'manager', 'ls', 'telesales']);
export const ACADEMY_TEAM_CODE = 'ACADEMY';
export const ACADEMY_DEPARTMENT_CODE = 'ACADEMY';
export const ACADEMY_TEAM_FALLBACK_CONFIG_KEY = 'ACTIVE_ACADEMY_STAFF_CONFIG';
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
  return isAdminOrSuperAdminRole(actor.role) || MANAGER_ROLES.has(actor.role);
}

function isTeamLeader(actor: AcademyActor) {
  return actor.role === TEAM_LEADER_ROLE;
}

export function canAccessAcademySales(actor: AcademyActor) {
  return actor.academyAccess === true || ACADEMY_ROLES.has(actor.role);
}

/**
 * Authoritative workspace gate. Role names only determine what an approved
 * Academy user can do inside the workspace; active membership in an Academy
 * Department team determines whether the workspace is visible or reachable.
 */
export async function getAcademyWorkspaceAccess(fastify: FastifyInstance, actor: AcademyActor) {
  if (isAdminOrSuperAdminRole(actor.role)) {
    return { canAccess: true, scope: 'ADMIN' as const };
  }

  const isAcademyTeamMember =
    (await TeamService.isActiveCrmStaffMemberInDepartment(fastify, ACADEMY_DEPARTMENT_CODE, actor.id)) ||
    (await TeamService.isActiveCrmStaffMember(fastify, ACADEMY_TEAM_CODE, actor.id, ACADEMY_TEAM_FALLBACK_CONFIG_KEY));
  return { canAccess: isAcademyTeamMember, scope: isAcademyTeamMember ? ('ACADEMY_TEAM' as const) : null };
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

export function resolveAcademyStatusForSchedule(
  currentStatus: AcademyLeadStatus,
  requestedStatus: AcademyLeadStatus | undefined,
  scheduledAt: string | null | undefined
): AcademyLeadStatus | undefined {
  if (requestedStatus) return requestedStatus;
  if (scheduledAt !== undefined && asDate(scheduledAt) && ['NEW', 'WARM'].includes(currentStatus)) {
    return 'SCHEDULED';
  }
  return undefined;
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

export function getAcademyIctMonthBounds(value?: string, now = new Date()) {
  const currentMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: ICT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  const month = value || `${currentMonth.year}-${currentMonth.month}`;
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new AcademySalesError('Tháng lịch test phải có định dạng YYYY-MM.');
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  if (monthIndex < 1 || monthIndex > 12) throw new AcademySalesError('Tháng lịch test không hợp lệ.');
  const nextYear = monthIndex === 12 ? year + 1 : year;
  const nextMonth = monthIndex === 12 ? 1 : monthIndex + 1;
  const next = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  return {
    month,
    start: new Date(`${month}-01T00:00:00.000+07:00`),
    end: new Date(new Date(`${next}-01T00:00:00.000+07:00`).getTime() - 1),
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

const ACADEMY_RICH_TEXT_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h3',
  'h4',
  'blockquote',
]);

/**
 * The course editor intentionally supports a compact formatting subset. It
 * strips attributes and unapproved elements before content reaches storage,
 * so rich text remains safe to render in future course views.
 */
export function sanitizeAcademyCourseRichText(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const withoutUnsafeBlocks = raw.replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const sanitized = withoutUnsafeBlocks.replace(/<[^>]*>/g, (tag) => {
    const match = /^<\s*(\/?)\s*([a-z0-9]+)(?:\s+[^>]*)?\s*\/?\s*>$/i.exec(tag);
    if (!match || !ACADEMY_RICH_TEXT_TAGS.has(match[2].toLowerCase())) return '';
    return `<${match[1]}${match[2].toLowerCase()}>`;
  });
  return sanitized.trim() || null;
}

function toOwner(staff: SafeAny): AcademyLead['owner'] {
  if (!staff) return null;
  return { id: staff.id, displayName: staff.displayName, email: staff.email ?? null };
}

function toLead(row: SafeAny): AcademyLead {
  const nextFollowUp = Array.isArray(row.followUps) ? row.followUps[0] : null;
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
    nextFollowUp: nextFollowUp
      ? {
          id: nextFollowUp.id,
          content: nextFollowUp.content,
          dueAt: nextFollowUp.dueAt?.toISOString() ?? null,
          assignee: toOwner(nextFollowUp.assignee),
        }
      : null,
    pendingFollowUpCount: Math.max(0, Number(row._count?.followUps) || 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type AcademyLeadFieldAudit = {
  field: string;
  label: string;
  previous: string | number | boolean | null;
  next: string | number | boolean | null;
};

function auditComparable(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

function buildLeadFieldAudit(
  existing: SafeAny,
  updated: SafeAny,
  input: UpdateAcademyLeadRequest
): AcademyLeadFieldAudit[] {
  const audit: AcademyLeadFieldAudit[] = [];
  const add = (field: keyof UpdateAcademyLeadRequest, label: string, previous: unknown, next: unknown) => {
    if (input[field] === undefined) return;
    const before = auditComparable(previous);
    const after = auditComparable(next);
    if (before !== after) audit.push({ field, label, previous: before, next: after });
  };

  add('name', 'Tên khách hàng', existing.name, updated.name);
  add('phone', 'Số điện thoại', existing.phone, updated.phone);
  add('email', 'Email', existing.email, updated.email);
  add('source', 'Nguồn lead', existing.source, updated.source);
  add('course', 'Khóa học', existing.course, updated.course);
  add('goal', 'Mục tiêu học', existing.goal, updated.goal);
  add('flightDate', 'Ngày bay', existing.flightDate, updated.flightDate);
  add('ownerStaffId', 'Người phụ trách', existing.ownerStaffId, updated.owner?.id ?? null);
  add('revenueVnd', 'Doanh thu đã chốt', existing.revenueVnd, updated.revenueVnd);
  add('isHot', 'Ưu tiên Hot', existing.isHot, updated.isHot);
  add('note', 'Ghi chú nội bộ', existing.note, updated.note);
  return audit;
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

function toCalendarEvent(row: SafeAny): AcademyLeadCalendarEvent {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    avatarUrl: row.avatarUrl ?? null,
    status: row.status as AcademyLeadStatus,
    course: row.course ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    flightDate: row.flightDate?.toISOString() ?? null,
    owner: toOwner(row.owner),
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
    nameEn: row.nameEn ?? null,
    tag: row.tag ?? null,
    description: row.description ?? null,
    market: row.market === 'OVERSEAS' ? 'OVERSEAS' : 'DOMESTIC',
    coverImageUrl: row.coverImageUrl ?? null,
    listPriceVnd: Math.round(Number(row.listPriceVnd) || 0),
    promoPriceVnd: Math.round(Number(row.promoPriceVnd) || 0),
    teacherBonusVnd: Math.max(0, Math.round(Number(row.teacherBonusVnd) || 0)),
    kitName: row.kitName ?? null,
    kitUrl: row.kitUrl ?? null,
    kitPriceVnd: Math.max(0, Math.round(Number(row.kitPriceVnd) || 0)),
    samplePriceVnd: Math.max(0, Math.round(Number(row.samplePriceVnd) || 0)),
    lessonCount: Math.max(0, Math.round(Number(row.lessonCount) || 0)),
    lashModelCount: Math.max(0, Math.round(Number(row.lashModelCount) || 0)),
    syllabusHtml: row.syllabusHtml ?? null,
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

  /** Shared read scope for Academy modules that operate over a lead ledger. */
  static async getLeadAccessWhere(
    fastify: FastifyInstance,
    actor: AcademyActor
  ): Promise<Prisma.CrmAcademyLeadWhereInput> {
    this.assertAcademyAccess(actor);
    return this.leadAccessWhere(fastify, actor);
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

  /**
   * Shared Academy lead scope guard for sibling native modules. Keeping it in
   * the Sales service prevents Tố Chất, campaigns and future Academy tools
   * from quietly diverging on owner/team visibility rules.
   */
  static async getAccessibleLead(fastify: FastifyInstance, actor: AcademyActor, leadId: number) {
    this.assertAcademyAccess(actor);
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
        role: { in: ['admin', 'super_admin', 'manager', 'ls', 'telesales'] },
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

    const [
      rows,
      total,
      statusGroups,
      wonRevenue,
      hotCount,
      warmHotCount,
      wonToday,
      pendingFollowUps,
      overdueFollowUps,
    ] = await Promise.all([
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

  static async listCalendarEvents(
    fastify: FastifyInstance,
    actor: AcademyActor,
    params: ListAcademyLeadCalendarParams
  ) {
    this.assertAcademyAccess(actor);
    const { month, start, end } = getAcademyIctMonthBounds(params.month);
    const clauses: Prisma.CrmAcademyLeadWhereInput[] = [await this.leadAccessWhere(fastify, actor)];
    if (params.ownerStaffId && params.ownerStaffId !== 'ALL') {
      if (params.ownerStaffId === 'UNASSIGNED') clauses.push({ ownerStaffId: null });
      else {
        const ownerStaffId = Number(params.ownerStaffId);
        const visibleIds = await this.visibleStaffIds(fastify, actor);
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

  static async recordNoShow(
    fastify: FastifyInstance,
    actor: AcademyActor,
    leadId: number,
    input: RecordAcademyNoShowRequest
  ): Promise<AcademyLead> {
    const existing = await this.getAccessibleLead(fastify, actor, leadId);
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
    const nameEn = input.nameEn === undefined ? undefined : input.nameEn?.trim() || null;
    if (nameEn && nameEn.length > 255) throw new AcademySalesError('Tên tiếng Anh không được vượt quá 255 ký tự.');
    const lessonCount = input.lessonCount === undefined ? undefined : Math.round(Number(input.lessonCount));
    if (lessonCount !== undefined && (!Number.isFinite(lessonCount) || lessonCount < 1)) {
      throw new AcademySalesError('Số buổi học phải là số nguyên lớn hơn 0.');
    }
    const lashModelCount = input.lashModelCount === undefined ? undefined : Math.round(Number(input.lashModelCount));
    if (lashModelCount !== undefined && (!Number.isFinite(lashModelCount) || lashModelCount < 0)) {
      throw new AcademySalesError('Số mẫu nối mi cần phải là số nguyên từ 0 trở lên.');
    }
    const market = input.market === undefined ? undefined : String(input.market).trim().toUpperCase();
    if (market !== undefined && market !== 'DOMESTIC' && market !== 'OVERSEAS') {
      throw new AcademySalesError('Nhóm học viên của khóa học không hợp lệ.');
    }
    const data = {
      code,
      name,
      ...(nameEn !== undefined ? { nameEn } : {}),
      tag: input.tag?.trim() || null,
      description: input.description?.trim() || null,
      ...(market !== undefined ? { market } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl?.trim() || null } : {}),
      listPriceVnd: Math.max(0, Math.round(Number(input.listPriceVnd) || 0)),
      promoPriceVnd: Math.max(0, Math.round(Number(input.promoPriceVnd) || 0)),
      teacherBonusVnd: Math.max(0, Math.round(Number(input.teacherBonusVnd) || 0)),
      kitName: input.kitName?.trim() || null,
      kitUrl: input.kitUrl?.trim() || null,
      kitPriceVnd: Math.max(0, Math.round(Number(input.kitPriceVnd) || 0)),
      samplePriceVnd: Math.max(0, Math.round(Number(input.samplePriceVnd) || 0)),
      ...(lessonCount !== undefined ? { lessonCount } : {}),
      ...(lashModelCount !== undefined ? { lashModelCount } : {}),
      ...(input.syllabusHtml !== undefined ? { syllabusHtml: sanitizeAcademyCourseRichText(input.syllabusHtml) } : {}),
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
