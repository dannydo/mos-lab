import {
  ACADEMY_CAMPAIGN_STATUSES,
  ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOMES,
  type AcademyCampaign,
  type AcademyCampaignAudienceFilter,
  type AcademyCampaignLead,
  type AcademyCampaignStatus,
  type AcademyCampaignTouchpoint,
  type AcademyCampaignTouchpointLog,
  type AcademyCampaignTouchpointOutcome,
  type AcademyLeadStatus,
  type CreateAcademyCampaignTouchpointRequest,
  type SafeAny,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  canManageAcademySales,
  normalizeAcademyAvatarUrl,
  type AcademyActor,
} from '../academy-sales.service.js';

const ICT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const TEAM_LEADER_ROLE = 'ls';
export const ACADEMY_STAFF_ROLES = ['admin', 'super_admin', 'manager', 'ls', 'telesales'];

/** Default operational cadence copied as a starting point, not a hard-coded UI rule. */
export const DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS: readonly CreateAcademyCampaignTouchpointRequest[] = [
  { key: 'd1', label: 'Chạm D1', icon: 'Smile', daysMin: 1, daysMax: 1, color: '#34ff1a', sortOrder: 1 },
  { key: 'd3', label: 'Chạm D3', icon: 'Handshake', daysMin: 3, daysMax: 3, color: '#2e1ac7', sortOrder: 2 },
  { key: 'd7', label: 'Chạm D7', icon: 'MessageCircle', daysMin: 7, daysMax: 7, color: '#d5fb13', sortOrder: 3 },
  { key: 'd14', label: 'Chạm D14', icon: 'Heart', daysMin: 14, daysMax: 14, color: '#d17d2e', sortOrder: 4 },
  { key: 'd21', label: 'Chạm D21', icon: 'Calendar', daysMin: 21, daysMax: 21, color: '#ff4d4f', sortOrder: 5 },
];

export type SafeRow = Record<string, SafeAny>;

export function roleOf(actor: AcademyActor) {
  return String(actor.role || '')
    .trim()
    .toLowerCase();
}

export function isManager(actor: AcademyActor) {
  return canManageAcademySales(actor);
}

export function isTeamLeader(actor: AcademyActor) {
  return roleOf(actor) === TEAM_LEADER_ROLE;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toPositiveIntList(values: unknown): number[] {
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

export function clampPage(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), maximum);
}

export function slugify(value: string): string {
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

export function formatIctDate(value: Date | string | null | undefined): string | null {
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

export function parseIctDateTime(value: unknown, label: string): Date | null {
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

export function toStaff(row: SafeRow | null | undefined) {
  if (!row) return null;
  return {
    id: Number(row.id),
    displayName: String(row.displayName || row.username || `Nhân sự #${row.id}`),
    email: row.email ?? null,
  };
}

export function toCampaignTouchpoint(row: SafeRow): AcademyCampaignTouchpoint {
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

export function toCampaign(row: SafeRow): AcademyCampaign {
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

export function toTouchpointLog(row: SafeRow): AcademyCampaignTouchpointLog {
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

export function toCampaignLead(row: SafeRow): AcademyCampaignLead {
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
      avatarUrl: normalizeAcademyAvatarUrl(lead.avatarUrl),
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

export function isCampaignStatus(value: unknown): value is AcademyCampaignStatus {
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

export function normalizeAudienceFilter(value: unknown): AcademyCampaignAudienceFilter | null {
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

export function normalizeTouchpoints(
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

export function campaignAssignmentIds(row: SafeRow): number[] {
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
 * only Academy workspace managers receive every pinned campaign, while every other role must be
 * explicitly in the campaign roster.  This prevents a manager/leader from
 * discovering an unrelated Academy campaign through navigation.
 */
export function isAcademyCampaignSidebarVisible(
  campaign: { assignedStaffIds?: string | number[] | null },
  actor: AcademyActor
) {
  if (canManageAcademySales(actor)) return true;
  const assigned = Array.isArray(campaign.assignedStaffIds)
    ? toPositiveIntList(campaign.assignedStaffIds)
    : toPositiveIntList(parseJson<unknown>(campaign.assignedStaffIds, []));
  return assigned.includes(Number(actor.id));
}
