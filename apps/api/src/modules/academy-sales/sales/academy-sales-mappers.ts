import type {
  AcademyActivityType,
  AcademyCourse,
  AcademyFollowUpTask,
  AcademyLead,
  AcademyLeadActivity,
  AcademyLeadCalendarEvent,
  AcademyLeadStatus,
  AcademyPlaybook,
  SafeAny,
  UpdateAcademyLeadRequest,
} from '@mos-lab/shared';
import { normalizeAcademyAvatarUrl, parseJson } from './academy-sales-helpers.js';

export type AcademyLeadFieldAudit = {
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

export function buildLeadFieldAudit(
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

export function toOwner(staff: SafeAny): AcademyLead['owner'] {
  if (!staff) return null;
  return { id: staff.id, displayName: staff.displayName, email: staff.email ?? null };
}

export function toLead(row: SafeAny): AcademyLead {
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
    avatarUrl: normalizeAcademyAvatarUrl(row.avatarUrl),
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

export function toActivity(row: SafeAny): AcademyLeadActivity {
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

export function toFollowUp(row: SafeAny): AcademyFollowUpTask {
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

export function toCalendarEvent(row: SafeAny): AcademyLeadCalendarEvent {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    avatarUrl: normalizeAcademyAvatarUrl(row.avatarUrl),
    status: row.status as AcademyLeadStatus,
    course: row.course ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    flightDate: row.flightDate?.toISOString() ?? null,
    owner: toOwner(row.owner),
  };
}

export function toPlaybook(row: SafeAny): AcademyPlaybook {
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

export function toCourse(row: SafeAny): AcademyCourse {
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
