import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../generated/crm-client/index.js';
import {
  ACADEMY_CAMPAIGN_STATUSES,
  ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOMES,
  type AcademyCampaign,
  type AcademyCampaignActionResponse,
  type AcademyCampaignAudienceFilter,
  type AcademyCampaignLead,
  type AcademyCampaignLeadActionResponse,
  type AcademyCampaignStats,
  type AcademyCampaignStatus,
  type AcademyCampaignTouchpoint,
  type AcademyCampaignTouchpointLog,
  type AcademyCampaignTouchpointOutcome,
  type AcademyCampaignTouchpointLogActionResponse,
  type AddAcademyCampaignLeadsRequest,
  type CreateAcademyCampaignRequest,
  type CreateAcademyCampaignTouchpointRequest,
  type ListAcademyCampaignLeadsParams,
  type ListAcademyCampaignLeadsResponse,
  type ListAcademyCampaignsParams,
  type ListAcademyCampaignsResponse,
  type RemoveAcademyCampaignLeadRequest,
  type ToggleAcademyCampaignTouchpointLogRequest,
  type UpdateAcademyCampaignRequest,
  type AcademyLeadStatus,
  type SafeAny,
  isAdminOrSuperAdminRole,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { AcademySalesError, canAccessAcademySales, type AcademyActor } from './academy-sales.service.js';

const ICT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const MANAGER_ROLES = new Set(['admin', 'super_admin', 'manager']);
const TEAM_LEADER_ROLE = 'ls';
const ACADEMY_STAFF_ROLES = ['admin', 'super_admin', 'manager', 'ls', 'telesales'];

/** Default operational cadence copied as a starting point, not a hard-coded UI rule. */
export const DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS: readonly CreateAcademyCampaignTouchpointRequest[] = [
  { key: 'd1', label: 'Chạm D1', icon: 'Smile', daysMin: 1, daysMax: 1, color: '#34ff1a', sortOrder: 1 },
  { key: 'd3', label: 'Chạm D3', icon: 'Handshake', daysMin: 3, daysMax: 3, color: '#2e1ac7', sortOrder: 2 },
  { key: 'd7', label: 'Chạm D7', icon: 'MessageCircle', daysMin: 7, daysMax: 7, color: '#d5fb13', sortOrder: 3 },
  { key: 'd14', label: 'Chạm D14', icon: 'Heart', daysMin: 14, daysMax: 14, color: '#d17d2e', sortOrder: 4 },
  { key: 'd21', label: 'Chạm D21', icon: 'Calendar', daysMin: 21, daysMax: 21, color: '#ff4d4f', sortOrder: 5 },
];

type SafeRow = Record<string, SafeAny>;

function roleOf(actor: AcademyActor) {
  return String(actor.role || '')
    .trim()
    .toLowerCase();
}

function isManager(actor: AcademyActor) {
  return isAdminOrSuperAdminRole(roleOf(actor)) || MANAGER_ROLES.has(roleOf(actor));
}

function isTeamLeader(actor: AcademyActor) {
  return roleOf(actor) === TEAM_LEADER_ROLE;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toPositiveIntList(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(values.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))
  );
}

/**
 * A campaign stores this exact, de-duplicated lead set. It is intentionally
 * independent from its saved audience-filter audit metadata.
 */
export function normalizeAcademyCampaignSnapshotLeadIds(values: unknown): number[] {
  return toPositiveIntList(values);
}

function clampPage(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), maximum);
}

function slugify(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatIctDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ICT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function parseIctDateTime(value: unknown, label: string): Date | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const raw = String(value).trim();
  const ictLocal = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw) ? `${raw}+07:00` : raw;
  const parsed = new Date(ictLocal);
  if (!Number.isFinite(parsed.getTime())) throw new AcademySalesError(`${label} không hợp lệ.`);
  return parsed;
}

/**
 * Campaign start/end fields are MySQL DATE values, so they must preserve the
 * written calendar date rather than encode ICT midnight as the previous UTC
 * day. The returned UTC midnight still formats to the same ICT date.
 */
export function parseAcademyCampaignDate(value: unknown, label: string): Date | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new AcademySalesError(`${label} không hợp lệ.`);
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw new AcademySalesError(`${label} không hợp lệ.`);
  }
  return parsed;
}

function toStaff(row: SafeRow | null | undefined) {
  if (!row) return null;
  return {
    id: Number(row.id),
    displayName: String(row.displayName || row.username || `Nhân sự #${row.id}`),
    email: row.email ?? null,
  };
}

function toCampaignTouchpoint(row: SafeRow): AcademyCampaignTouchpoint {
  return {
    id: Number(row.id),
    campaignId: Number(row.campaignId),
    key: String(row.key),
    label: String(row.label),
    icon: row.icon ?? null,
    daysMin: Number(row.daysMin) || 0,
    daysMax: row.daysMax === null || row.daysMax === undefined ? null : Number(row.daysMax),
    color: row.color ?? null,
    sortOrder: Number(row.sortOrder) || 0,
  };
}

function toCampaign(row: SafeRow): AcademyCampaign {
  const assignedStaffIds = toPositiveIntList(parseJson<unknown>(row.assignedStaffIds, []));
  return {
    id: Number(row.id),
    kind: row.kind === 'WORKSHOP' ? 'WORKSHOP' : 'CAMPAIGN',
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ?? null,
    startDate: formatIctDate(row.startDate),
    endDate: formatIctDate(row.endDate),
    status: row.status as AcademyCampaignStatus,
    showInSidebar: Boolean(row.showInSidebar),
    assignedStaffIds,
    audienceFilter: parseJson<AcademyCampaignAudienceFilter | null>(row.audienceFilterJson, null),
    audienceSummary: row.audienceSummary ?? null,
    createdBy: toStaff(row.createdBy),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    touchpoints: Array.isArray(row.touchpoints)
      ? row.touchpoints.map((touchpoint: SafeRow) => toCampaignTouchpoint(touchpoint))
      : undefined,
    _count: row._count
      ? {
          leads: Number(row._count.leads) || 0,
          touchpoints: Number(row._count.touchpoints) || 0,
        }
      : undefined,
  };
}

function toTouchpointLog(row: SafeRow): AcademyCampaignTouchpointLog {
  return {
    id: Number(row.id),
    campaignLeadId: Number(row.campaignLeadId),
    touchpointId: Number(row.touchpointId),
    isChecked: Boolean(row.isChecked),
    status: (row.status as AcademyCampaignTouchpointOutcome | null) ?? null,
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
    completedBy: toStaff(row.completedBy),
    note: row.note ?? null,
    callbackDueAt: row.callbackDueAt ? new Date(row.callbackDueAt).toISOString() : null,
    followUpTaskId: row.followUpTask?.id ? Number(row.followUpTask.id) : null,
  };
}

function toCampaignLead(row: SafeRow): AcademyCampaignLead {
  const lead = row.lead || {};
  return {
    id: Number(row.id),
    campaignId: Number(row.campaignId),
    leadId: Number(row.leadId),
    addedAt: new Date(row.addedAt).toISOString(),
    addedBy: toStaff(row.addedBy),
    removedAt: row.removedAt ? new Date(row.removedAt).toISOString() : null,
    removedReason: row.removedReason ?? null,
    removedBy: toStaff(row.removedBy),
    lead: {
      id: Number(lead.id),
      name: String(lead.name),
      phone: lead.phone ?? null,
      avatarUrl: lead.avatarUrl ?? null,
      status: lead.status as AcademyLeadStatus,
      course: lead.course ?? null,
      source: String(lead.source || 'Manual'),
      scheduledAt: lead.scheduledAt ? new Date(lead.scheduledAt).toISOString() : null,
      revenueVnd: Math.round(Number(lead.revenueVnd) || 0),
      isHot: Boolean(lead.isHot),
      owner: toStaff(lead.owner),
    },
    touchpointLogs: Array.isArray(row.touchpointLogs)
      ? row.touchpointLogs.map((log: SafeRow) => toTouchpointLog(log))
      : [],
  };
}

function isCampaignStatus(value: unknown): value is AcademyCampaignStatus {
  return ACADEMY_CAMPAIGN_STATUSES.includes(value as AcademyCampaignStatus);
}

export function isAcademyCampaignTouchpointOutcome(value: unknown): value is AcademyCampaignTouchpointOutcome {
  return ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOMES.includes(value as AcademyCampaignTouchpointOutcome);
}

/**
 * Academy follows the Custom Campaign workflow: a configured DRAFT/SCHEDULED
 * campaign can already record real calls and notes. Paused or closed campaigns
 * remain read-only so their audit trail cannot be changed accidentally.
 */
export function isAcademyCampaignTouchpointWritable(campaign: { status?: unknown; deletedAt?: unknown }) {
  return !campaign.deletedAt && ['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(String(campaign.status || '').toUpperCase());
}

function uniqueStrings(values: unknown, maximumLength: number): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim())
        .filter((value) => value.length > 0 && value.length <= maximumLength)
    )
  );
}

function normalizeAudienceFilter(value: unknown): AcademyCampaignAudienceFilter | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const statuses = uniqueStrings(input.statuses, 20).filter((status) =>
    ['NEW', 'WARM', 'SCHEDULED', 'TESTED', 'WON', 'LOST'].includes(status)
  ) as AcademyLeadStatus[];
  const ownerStaffIds = toPositiveIntList(input.ownerStaffIds);
  const courses = uniqueStrings(input.courses, 150);
  const sources = uniqueStrings(input.sources, 100);
  const sourceSystems = uniqueStrings(input.sourceSystems, 30);
  const isHot = typeof input.isHot === 'boolean' ? input.isHot : undefined;
  const scheduledFrom = formatIctDate(parseAcademyCampaignDate(input.scheduledFrom, 'Ngày lịch test')) ?? undefined;
  const scheduledTo = formatIctDate(parseAcademyCampaignDate(input.scheduledTo, 'Ngày lịch test')) ?? undefined;
  const flightFrom = formatIctDate(parseAcademyCampaignDate(input.flightFrom, 'Ngày bay')) ?? undefined;
  const flightTo = formatIctDate(parseAcademyCampaignDate(input.flightTo, 'Ngày bay')) ?? undefined;
  const normalized: AcademyCampaignAudienceFilter = {
    ...(statuses.length ? { statuses } : {}),
    ...(ownerStaffIds.length ? { ownerStaffIds } : {}),
    ...(courses.length ? { courses } : {}),
    ...(sources.length ? { sources } : {}),
    ...(sourceSystems.length ? { sourceSystems } : {}),
    ...(isHot !== undefined ? { isHot } : {}),
    ...(scheduledFrom ? { scheduledFrom } : {}),
    ...(scheduledTo ? { scheduledTo } : {}),
    ...(flightFrom ? { flightFrom } : {}),
    ...(flightTo ? { flightTo } : {}),
  };
  if (scheduledFrom && scheduledTo && scheduledFrom > scheduledTo) {
    throw new AcademySalesError('Khoảng lịch test của tệp chiến dịch không hợp lệ.');
  }
  if (flightFrom && flightTo && flightFrom > flightTo) {
    throw new AcademySalesError('Khoảng ngày bay của tệp chiến dịch không hợp lệ.');
  }
  return Object.keys(normalized).length ? normalized : null;
}

function normalizeTouchpoints(
  input: unknown,
  useDefaultsWhenMissing: boolean
): CreateAcademyCampaignTouchpointRequest[] {
  if (input === undefined && useDefaultsWhenMissing) {
    return DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS.map((item) => ({ ...item }));
  }
  if (!Array.isArray(input)) {
    if (input === undefined) return [];
    throw new AcademySalesError('Danh sách điểm chạm không hợp lệ.');
  }
  const seenKeys = new Set<string>();
  return input.map((raw, index) => {
    const item = (raw || {}) as Record<string, unknown>;
    const key = slugify(String(item.key || item.label || ''));
    const label = String(item.label || '').trim();
    const daysMin = Number(item.daysMin);
    const daysMax =
      item.daysMax === undefined || item.daysMax === null || item.daysMax === '' ? null : Number(item.daysMax);
    if (!key || key.length > 50) throw new AcademySalesError(`Điểm chạm #${index + 1} cần mã hợp lệ.`);
    if (!label || label.length > 100) throw new AcademySalesError(`Điểm chạm #${index + 1} cần nhãn hợp lệ.`);
    if (!Number.isInteger(daysMin) || daysMin < 0) {
      throw new AcademySalesError(`Ngày bắt đầu của điểm chạm ${label} không hợp lệ.`);
    }
    if (daysMax !== null && (!Number.isInteger(daysMax) || daysMax < daysMin)) {
      throw new AcademySalesError(`Ngày kết thúc của điểm chạm ${label} không hợp lệ.`);
    }
    if (seenKeys.has(key)) throw new AcademySalesError(`Mã điểm chạm ${key} đang bị trùng.`);
    seenKeys.add(key);
    const icon = String(item.icon || '').trim();
    const color = String(item.color || '').trim();
    return {
      key,
      label,
      icon: icon ? icon.slice(0, 80) : null,
      daysMin,
      daysMax,
      color: color ? color.slice(0, 30) : null,
      sortOrder: Number.isInteger(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    };
  });
}

function campaignAssignmentIds(row: SafeRow): number[] {
  return toPositiveIntList(parseJson<unknown>(row.assignedStaffIds, []));
}

/** Pure helper intentionally exported for authorization unit coverage. */
export function isCampaignVisibleToStaff(
  campaign: { assignedStaffIds?: string | number[] | null; createdByStaffId?: number | null },
  actor: AcademyActor,
  visibleStaffIds: number[] | null
) {
  if (isManager(actor)) return true;
  if (Number(campaign.createdByStaffId) === Number(actor.id)) return true;
  const assigned = Array.isArray(campaign.assignedStaffIds)
    ? toPositiveIntList(campaign.assignedStaffIds)
    : toPositiveIntList(parseJson<unknown>(campaign.assignedStaffIds, []));
  // An unassigned campaign remains a manager/creator work item. It must not
  // become visible to every telesales account merely because its roster is
  // empty.
  if (!assigned.length) return false;
  const accessible = new Set(visibleStaffIds || [actor.id]);
  return assigned.some((id) => accessible.has(id));
}

/**
 * Sidebar links are deliberately stricter than campaign management access:
 * only admins receive every pinned campaign, while every other role must be
 * explicitly in the campaign roster.  This prevents a manager/leader from
 * discovering an unrelated Academy campaign through navigation.
 */
export function isAcademyCampaignSidebarVisible(
  campaign: { assignedStaffIds?: string | number[] | null },
  actor: AcademyActor
) {
  if (isAdminOrSuperAdminRole(roleOf(actor))) return true;
  const assigned = Array.isArray(campaign.assignedStaffIds)
    ? toPositiveIntList(campaign.assignedStaffIds)
    : toPositiveIntList(parseJson<unknown>(campaign.assignedStaffIds, []));
  return assigned.includes(Number(actor.id));
}

export class AcademyCampaignService {
  private static assertAcademyAccess(actor: AcademyActor) {
    if (!canAccessAcademySales({ ...actor, role: roleOf(actor) })) {
      throw new AcademySalesError('Bạn không có quyền truy cập chiến dịch Academy.', 403);
    }
  }

  private static assertCampaignManager(actor: AcademyActor) {
    this.assertAcademyAccess(actor);
    if (!isManager(actor)) {
      throw new AcademySalesError('Chỉ Admin hoặc Quản lý được thiết lập chiến dịch Academy.', 403);
    }
  }

  private static assertCampaignOperator(actor: AcademyActor) {
    this.assertAcademyAccess(actor);
    if (!isManager(actor) && !isTeamLeader(actor)) {
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Leader Sales được thay đổi tệp khách chiến dịch.', 403);
    }
  }

  /** Mirrors the Academy lead ownership scope without coupling this new service to the legacy campaign module. */
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

  private static async leadScopeWhere(
    fastify: FastifyInstance,
    actor: AcademyActor
  ): Promise<Prisma.CrmAcademyLeadWhereInput> {
    const ids = await this.visibleStaffIds(fastify, actor);
    return ids ? { ownerStaffId: { in: ids } } : {};
  }

  private static async resolveExistingStaffId(fastify: FastifyInstance, staffId: number) {
    const staff = await fastify.prisma.crm.crmStaff.findUnique({ where: { id: staffId }, select: { id: true } });
    return staff?.id ?? null;
  }

  private static async validateAssignedStaffIds(fastify: FastifyInstance, values: unknown) {
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

  private static async ensureAccessibleLeads(fastify: FastifyInstance, actor: AcademyActor, leadIds: unknown) {
    const ids = normalizeAcademyCampaignSnapshotLeadIds(leadIds);
    if (!ids.length) return [];
    const rows = await fastify.prisma.crm.crmAcademyLead.findMany({
      where: { AND: [{ id: { in: ids } }, await this.leadScopeWhere(fastify, actor)] },
      select: { id: true },
    });
    if (rows.length !== ids.length) {
      throw new AcademySalesError('Tệp lead chứa khách hàng Academy ngoài phạm vi phụ trách hoặc không tồn tại.', 403);
    }
    return ids;
  }

  private static async findCampaignRow(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
    this.assertAcademyAccess(actor);
    const campaign = await fastify.prisma.crm.crmAcademyCampaign.findUnique({
      where: { id: campaignId },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true, email: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { leads: { where: { removedAt: null } }, touchpoints: true } },
      },
    });
    if (!campaign || campaign.kind !== 'CAMPAIGN')
      throw new AcademySalesError('Không tìm thấy chiến dịch Academy.', 404);
    if (campaign.deletedAt && !isManager(actor)) throw new AcademySalesError('Không tìm thấy chiến dịch Academy.', 404);
    const visibleIds = await this.visibleStaffIds(fastify, actor);
    if (!isCampaignVisibleToStaff(campaign, actor, visibleIds)) {
      throw new AcademySalesError('Bạn không có quyền xem chiến dịch này.', 403);
    }
    return campaign;
  }

  private static async validateCampaignDates(startDate: Date | null, endDate: Date | null) {
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      throw new AcademySalesError('Ngày kết thúc chiến dịch phải sau hoặc bằng ngày bắt đầu.');
    }
  }

  private static async uniqueSlug(fastify: FastifyInstance, desired: string, excludeId?: number) {
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

  private static assertTouchpointWritable(campaign: SafeRow) {
    if (!isAcademyCampaignTouchpointWritable(campaign)) {
      throw new AcademySalesError(
        'Điểm chạm chỉ có thể được ghi nhận khi chiến dịch không bị tạm dừng hoặc đã kết thúc.',
        409
      );
    }
  }

  private static async fetchMembership(
    fastify: FastifyInstance,
    actor: AcademyActor,
    campaignId: number,
    leadId: number
  ) {
    await this.findCampaignRow(fastify, actor, campaignId);
    const membership = await fastify.prisma.crm.crmAcademyCampaignLead.findFirst({
      where: {
        campaignId,
        leadId,
        removedAt: null,
        lead: await this.leadScopeWhere(fastify, actor),
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

  static async listCampaigns(
    fastify: FastifyInstance,
    actor: AcademyActor,
    params: ListAcademyCampaignsParams = {}
  ): Promise<ListAcademyCampaignsResponse> {
    this.assertAcademyAccess(actor);
    const page = clampPage(params.page, 1, 100000);
    const limit = clampPage(params.limit, 20, 100);
    const requestedStatus = params.status && params.status !== 'ALL' ? params.status : undefined;
    if (requestedStatus && !isCampaignStatus(requestedStatus))
      throw new AcademySalesError('Trạng thái chiến dịch không hợp lệ.');
    const rows = await fastify.prisma.crm.crmAcademyCampaign.findMany({
      where:
        requestedStatus === 'DELETED' && isManager(actor)
          ? { kind: 'CAMPAIGN' }
          : { kind: 'CAMPAIGN', deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true, email: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { leads: { where: { removedAt: null } }, touchpoints: true } },
      },
    });
    const visibleIds = await this.visibleStaffIds(fastify, actor);
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
  static async listSidebarCampaigns(fastify: FastifyInstance, actor: AcademyActor): Promise<AcademyCampaign[]> {
    this.assertAcademyAccess(actor);
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

  static async getCampaignById(
    fastify: FastifyInstance,
    actor: AcademyActor,
    campaignId: number
  ): Promise<AcademyCampaign> {
    return toCampaign(await this.findCampaignRow(fastify, actor, campaignId));
  }

  static async getCampaignBySlug(
    fastify: FastifyInstance,
    actor: AcademyActor,
    slug: string
  ): Promise<AcademyCampaign> {
    this.assertAcademyAccess(actor);
    const campaign = await fastify.prisma.crm.crmAcademyCampaign.findUnique({
      where: { slug: String(slug || '').trim() },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true, email: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { leads: { where: { removedAt: null } }, touchpoints: true } },
      },
    });
    if (!campaign || campaign.kind !== 'CAMPAIGN')
      throw new AcademySalesError('Không tìm thấy chiến dịch Academy.', 404);
    return this.getCampaignById(fastify, actor, campaign.id);
  }

  static async createCampaign(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: CreateAcademyCampaignRequest
  ): Promise<AcademyCampaignActionResponse> {
    this.assertCampaignManager(actor);
    const name = String(input.name || '').trim();
    if (!name || name.length > 150) throw new AcademySalesError('Tên chiến dịch là bắt buộc và tối đa 150 ký tự.');
    const status = input.status || 'DRAFT';
    if (!isCampaignStatus(status) || status === 'DELETED')
      throw new AcademySalesError('Trạng thái chiến dịch không hợp lệ.');
    const startDate = parseAcademyCampaignDate(input.startDate, 'Ngày bắt đầu');
    const endDate = parseAcademyCampaignDate(input.endDate, 'Ngày kết thúc');
    await this.validateCampaignDates(startDate, endDate);
    const [assignedStaffIds, leadIds] = await Promise.all([
      this.validateAssignedStaffIds(fastify, input.assignedStaffIds),
      this.ensureAccessibleLeads(fastify, actor, input.leadIds),
    ]);
    const touchpoints = normalizeTouchpoints(input.touchpoints, true);
    const slug = await this.uniqueSlug(fastify, input.slug || name);
    const createdByStaffId = await this.resolveExistingStaffId(fastify, actor.id);
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

  static async updateCampaign(
    fastify: FastifyInstance,
    actor: AcademyActor,
    campaignId: number,
    input: UpdateAcademyCampaignRequest
  ): Promise<AcademyCampaignActionResponse> {
    this.assertCampaignManager(actor);
    const existing = await this.findCampaignRow(fastify, actor, campaignId);
    const nextName = input.name === undefined ? existing.name : String(input.name || '').trim();
    if (!nextName || nextName.length > 150)
      throw new AcademySalesError('Tên chiến dịch là bắt buộc và tối đa 150 ký tự.');
    const nextStatus = input.status === undefined ? (existing.status as AcademyCampaignStatus) : input.status;
    if (!isCampaignStatus(nextStatus) || nextStatus === 'DELETED') {
      throw new AcademySalesError('Trạng thái chiến dịch không hợp lệ.');
    }
    const startDate =
      input.startDate === undefined ? existing.startDate : parseAcademyCampaignDate(input.startDate, 'Ngày bắt đầu');
    const endDate =
      input.endDate === undefined ? existing.endDate : parseAcademyCampaignDate(input.endDate, 'Ngày kết thúc');
    await this.validateCampaignDates(startDate, endDate);
    const assignedStaffIds =
      input.assignedStaffIds === undefined
        ? campaignAssignmentIds(existing)
        : await this.validateAssignedStaffIds(fastify, input.assignedStaffIds);
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
        ? await this.uniqueSlug(fastify, input.slug || nextName, campaignId)
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
    const updated = await this.findCampaignRow(fastify, actor, campaignId);
    return { success: true, data: toCampaign(updated), message: 'Đã cập nhật cấu hình chiến dịch Academy.' };
  }

  static async setCampaignStatus(
    fastify: FastifyInstance,
    actor: AcademyActor,
    campaignId: number,
    status: AcademyCampaignStatus
  ): Promise<AcademyCampaignActionResponse> {
    return this.updateCampaign(fastify, actor, campaignId, { status });
  }

  static async archiveCampaign(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
    return this.setCampaignStatus(fastify, actor, campaignId, 'ARCHIVED');
  }

  static async deleteCampaign(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
    this.assertCampaignManager(actor);
    await this.findCampaignRow(fastify, actor, campaignId);
    await fastify.prisma.crm.crmAcademyCampaign.update({
      where: { id: campaignId },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
    return {
      success: true as const,
      message: 'Đã lưu trữ mềm chiến dịch Academy; lịch sử và tệp lead vẫn được giữ lại.',
    };
  }

  static async restoreCampaign(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
    this.assertCampaignManager(actor);
    const campaign = await fastify.prisma.crm.crmAcademyCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new AcademySalesError('Không tìm thấy chiến dịch Academy.', 404);
    await fastify.prisma.crm.crmAcademyCampaign.update({
      where: { id: campaignId },
      data: { status: 'DRAFT', deletedAt: null },
    });
    const restored = await this.findCampaignRow(fastify, actor, campaignId);
    return {
      success: true as const,
      data: toCampaign(restored),
      message: 'Đã khôi phục chiến dịch về trạng thái nháp.',
    };
  }

  static async cloneCampaign(fastify: FastifyInstance, actor: AcademyActor, campaignId: number) {
    this.assertCampaignManager(actor);
    const original = await this.findCampaignRow(fastify, actor, campaignId);
    const createdByStaffId = await this.resolveExistingStaffId(fastify, actor.id);
    const slug = await this.uniqueSlug(fastify, `[ban sao] ${original.name}`);
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

  static async listCampaignLeads(
    fastify: FastifyInstance,
    actor: AcademyActor,
    campaignId: number,
    params: ListAcademyCampaignLeadsParams = {}
  ): Promise<ListAcademyCampaignLeadsResponse> {
    await this.findCampaignRow(fastify, actor, campaignId);
    const page = clampPage(params.page, 1, 100000);
    const limit = clampPage(params.limit, 20, 100);
    const leadClauses: Prisma.CrmAcademyLeadWhereInput[] = [await this.leadScopeWhere(fastify, actor)];
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

  static async addLeads(
    fastify: FastifyInstance,
    actor: AcademyActor,
    campaignId: number,
    input: AddAcademyCampaignLeadsRequest
  ): Promise<AcademyCampaignLeadActionResponse[]> {
    this.assertCampaignOperator(actor);
    const campaign = await this.findCampaignRow(fastify, actor, campaignId);
    if (campaign.status === 'COMPLETED' || campaign.status === 'ARCHIVED' || campaign.status === 'DELETED') {
      throw new AcademySalesError('Không thể thêm lead vào chiến dịch đã chốt hoặc lưu trữ.', 409);
    }
    const leadIds = await this.ensureAccessibleLeads(fastify, actor, input.leadIds);
    if (!leadIds.length) throw new AcademySalesError('Cần chọn ít nhất một lead Academy.');
    const actorStaffId = await this.resolveExistingStaffId(fastify, actor.id);
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

  static async removeLead(
    fastify: FastifyInstance,
    actor: AcademyActor,
    campaignId: number,
    leadId: number,
    input: RemoveAcademyCampaignLeadRequest = {}
  ): Promise<AcademyCampaignLeadActionResponse> {
    this.assertCampaignOperator(actor);
    const membership = await this.fetchMembership(fastify, actor, campaignId, leadId);
    const actorStaffId = await this.resolveExistingStaffId(fastify, actor.id);
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

  static async toggleTouchpointLog(
    fastify: FastifyInstance,
    actor: AcademyActor,
    campaignId: number,
    leadId: number,
    touchpointId: number,
    input: ToggleAcademyCampaignTouchpointLogRequest
  ): Promise<AcademyCampaignTouchpointLogActionResponse> {
    this.assertAcademyAccess(actor);
    const membership = await this.fetchMembership(fastify, actor, campaignId, leadId);
    this.assertTouchpointWritable(membership.campaign);
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
    const actorStaffId = await this.resolveExistingStaffId(fastify, actor.id);
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

  static async getStats(
    fastify: FastifyInstance,
    actor: AcademyActor,
    campaignId: number
  ): Promise<AcademyCampaignStats> {
    await this.findCampaignRow(fastify, actor, campaignId);
    const memberships = await fastify.prisma.crm.crmAcademyCampaignLead.findMany({
      where: {
        campaignId,
        removedAt: null,
        lead: await this.leadScopeWhere(fastify, actor),
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
}
