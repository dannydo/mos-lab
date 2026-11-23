import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../../generated/crm-client/index.js';
import { TeamService } from '../../teams/team.service.js';
import { type AcademyLeadStatus, isAdminOrSuperAdminRole, removeVietnameseTones } from '@mos-lab/shared';

export type AcademyActor = {
  id: number;
  role: string;
  displayName?: string;
  email?: string;
  academyAccess?: boolean;
  academyCrudAccess?: boolean;
};

const MANAGER_ROLES = new Set(['admin', 'super_admin', 'manager']);
const TEAM_LEADER_ROLE = 'ls';
const ACADEMY_ROLES = new Set(['admin', 'super_admin', 'manager', 'ls', 'telesales']);
export const ACADEMY_TEAM_CODE = 'ACADEMY';
export const ACADEMY_DEPARTMENT_CODE = 'ACADEMY';
export const ACADEMY_TEAM_FALLBACK_CONFIG_KEY = 'ACTIVE_ACADEMY_STAFF_CONFIG';
const ICT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const HOT_WINDOW_HOURS = 72;
export const WARM_WINDOW_HOURS = 168;

export const STATUS_TRANSITIONS: Record<AcademyLeadStatus, AcademyLeadStatus[]> = {
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

export function isManager(actor: AcademyActor) {
  return canManageAcademySales(actor);
}

export function isTeamLeader(actor: AcademyActor) {
  return actor.role === TEAM_LEADER_ROLE;
}

export function canAccessAcademySales(actor: AcademyActor) {
  return actor.academyAccess === true || ACADEMY_ROLES.has(actor.role);
}

/** The workspace gate stamps this permission for active Academy members. */
export function canManageAcademySales(actor: AcademyActor) {
  const role = String(actor.role || '')
    .trim()
    .toLowerCase();
  return isAdminOrSuperAdminRole(role) || MANAGER_ROLES.has(role) || actor.academyCrudAccess === true;
}

/** Tuition and instructor configuration remain exclusively controlled by Admins. */
export function canManageAcademyRestricted(actor: AcademyActor) {
  return isAdminOrSuperAdminRole(
    String(actor.role || '')
      .trim()
      .toLowerCase()
  );
}

/**
 * Authoritative workspace gate. Role names only determine what an approved
 * Academy user can do inside the workspace; active membership in an Academy
 * Department team determines whether the workspace is visible or reachable.
 */
export async function getAcademyWorkspaceAccess(fastify: FastifyInstance, actor: AcademyActor) {
  if (isAdminOrSuperAdminRole(actor.role)) {
    return { canAccess: true, canManage: true, canManageRestricted: true, scope: 'ADMIN' as const };
  }

  const isAcademyTeamMember =
    (await TeamService.isActiveCrmStaffMemberInDepartment(fastify, ACADEMY_DEPARTMENT_CODE, actor.id)) ||
    (await TeamService.isActiveCrmStaffMember(fastify, ACADEMY_TEAM_CODE, actor.id, ACADEMY_TEAM_FALLBACK_CONFIG_KEY));
  return {
    canAccess: isAcademyTeamMember,
    canManage: isAcademyTeamMember,
    canManageRestricted: false,
    scope: isAcademyTeamMember ? ('ACADEMY_TEAM' as const) : null,
  };
}

export function assertAcademyAccess(actor: AcademyActor) {
  if (!canAccessAcademySales(actor)) {
    throw new AcademySalesError('Bạn không có quyền truy cập Sales Academy.', 403);
  }
}

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

export async function leadAccessWhere(
  fastify: FastifyInstance,
  actor: AcademyActor
): Promise<Prisma.CrmAcademyLeadWhereInput> {
  const ids = await visibleStaffIds(fastify, actor);
  return ids ? { ownerStaffId: { in: ids } } : {};
}

export async function taskAccessWhere(
  fastify: FastifyInstance,
  actor: AcademyActor
): Promise<Prisma.CrmAcademyFollowUpTaskWhereInput> {
  const ids = await visibleStaffIds(fastify, actor);
  if (!ids) return {};
  return {
    OR: [{ assigneeStaffId: { in: ids } }, { lead: { ownerStaffId: { in: ids } } }],
  };
}

export function normalizeAcademyPhone(value: string | null | undefined): string | null {
  const raw = String(value || '').replace(/\D/g, '');
  if (!raw) return null;
  if (raw.startsWith('84') && raw.length >= 10) return `0${raw.slice(2)}`;
  return raw;
}

/**
 * Legacy imports sometimes put a Facebook profile page in `avatar_url`.
 * A profile page is HTML, not an image, so browsers render it as a broken img.
 * Keep direct/CDN image URLs and let the UI fall back for known social pages.
 */
export function normalizeAcademyAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const avatarUrl = value.trim();
  if (!avatarUrl) return null;
  try {
    const parsed = new URL(avatarUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(parsed.hostname.toLowerCase())) return null;
    return avatarUrl;
  } catch {
    return null;
  }
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

export function asDate(value: string | Date | null | undefined): Date | null {
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

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
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

export function clampPagination(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}
