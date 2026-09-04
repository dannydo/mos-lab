import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Prisma } from '../../generated/crm-client/index.js';
import {
  EXPERIENCE_JOURNAL_CATEGORIES,
  EXPERIENCE_JOURNAL_SEVERITIES,
  EXPERIENCE_JOURNAL_TRIAGE_STATUSES,
  type ExperienceJournalEvent,
  type ExperienceJournalFingerprint,
  type ExperienceJournalListQuery,
  type ExperienceJournalListResponse,
  type RecordExperienceJournalEventRequest,
  type TriageExperienceJournalFingerprintRequest,
} from '@mos-lab/shared';

const RETENTION_DAYS = 90;
const MAX_PAGE_SIZE = 100;

export class ExperienceJournalError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'ExperienceJournalError';
  }
}

type SafeMetadata = Record<string, string | number | boolean | null>;
type CrmClient = FastifyInstance['prisma']['crm'];

function clean(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function redactJournalText(value: unknown, maxLength: number): string {
  return clean(value, maxLength)
    .replace(/\b(token|secret|password|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\b(?:Bearer\s+)?[A-Za-z0-9_-]{32,}\b/g, '[redacted]')
    .replace(/\/(?:Users|home)\/[^\s:]+/g, '[internal-path]');
}

export function normalizeExperienceJournalMetadata(value: unknown): SafeMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value)
    .slice(0, 12)
    .reduce<SafeMetadata>((metadata, [key, item]) => {
      const safeKey = clean(key, 40).replace(/[^a-zA-Z0-9_.-]/g, '_');
      if (!safeKey || (!['string', 'number', 'boolean'].includes(typeof item) && item !== null)) return metadata;
      metadata[safeKey] = typeof item === 'string' ? redactJournalText(item, 160) : item;
      return metadata;
    }, {});
}

function assertAllowed<T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  if (!allowed.includes(value as T[number])) throw new ExperienceJournalError(`${label} không hợp lệ.`);
  return value as T[number];
}

function optionalId(value: unknown, label: string): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new ExperienceJournalError(`${label} không hợp lệ.`);
  return parsed;
}

function optionalText(value: unknown, maxLength: number, label: string): string | null {
  if (value == null || value === '') return null;
  const normalized = redactJournalText(value, maxLength);
  if (!normalized) throw new ExperienceJournalError(`${label} không hợp lệ.`);
  return normalized;
}

function optionalUuid(value: unknown, label: string): string | null {
  if (value == null || value === '') return null;
  const normalized = clean(value, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new ExperienceJournalError(`${label} không hợp lệ.`);
  }
  return normalized;
}

function optionalCommit(value: unknown): string | null {
  if (value == null || value === '') return null;
  const normalized = clean(value, 64).toLowerCase();
  if (!/^[a-f0-9]{7,64}$/.test(normalized)) throw new ExperienceJournalError('Release commit không hợp lệ.');
  return normalized;
}

export function normalizeExperienceJournalEvent(payload: RecordExperienceJournalEventRequest) {
  const category = assertAllowed(payload?.category, EXPERIENCE_JOURNAL_CATEGORIES, 'Nhóm sự kiện');
  const severity = assertAllowed(payload?.severity, EXPERIENCE_JOURNAL_SEVERITIES, 'Mức độ');
  const component = clean(payload?.component, 80).toUpperCase();
  const code = clean(payload?.code, 100)
    .toUpperCase()
    .replace(/[^A-Z0-9_.-]/g, '_');
  const summary = redactJournalText(payload?.summary, 420);
  if (!component || !code || !summary) throw new ExperienceJournalError('Component, mã lỗi và tóm tắt là bắt buộc.');
  const fingerprint = createHash('sha256').update(`${category}|${component}|${code}|${summary}`).digest('hex');
  return {
    fingerprint,
    category,
    severity,
    component,
    code,
    summary,
    reportId: optionalId(payload?.reportId, 'Ticket ID'),
    jobId: optionalUuid(payload?.jobId, 'Job ID'),
    releaseCommit: optionalCommit(payload?.releaseCommit),
    metadata: normalizeExperienceJournalMetadata(payload?.metadata),
  };
}

function toEvent(row: {
  id: number;
  fingerprint: string;
  category: string;
  severity: string;
  component: string;
  code: string;
  summary: string;
  reportId: number | null;
  jobId: string | null;
  releaseCommit: string | null;
  metadataJson: string | null;
  retentionExpiresAt: Date;
  occurredAt: Date;
}): ExperienceJournalEvent {
  let metadata: SafeMetadata = {};
  try {
    metadata = normalizeExperienceJournalMetadata(JSON.parse(row.metadataJson || '{}'));
  } catch {
    /* keep safe empty metadata */
  }
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    category: row.category as ExperienceJournalEvent['category'],
    severity: row.severity as ExperienceJournalEvent['severity'],
    component: row.component,
    code: row.code,
    summary: row.summary,
    reportId: row.reportId,
    jobId: row.jobId,
    releaseCommit: row.releaseCommit,
    metadata,
    retentionExpiresAt: row.retentionExpiresAt.toISOString(),
    occurredAt: row.occurredAt.toISOString(),
  };
}

function toFingerprint(row: {
  fingerprint: string;
  category: string;
  severity: string;
  component: string;
  code: string;
  summary: string;
  occurrenceCount: number;
  firstOccurredAt: Date;
  lastOccurredAt: Date;
  triageStatus: string;
  triageNote: string | null;
  triagedByStaffId: number | null;
  triagedAt: Date | null;
}): ExperienceJournalFingerprint {
  return {
    fingerprint: row.fingerprint,
    category: row.category as ExperienceJournalFingerprint['category'],
    severity: row.severity as ExperienceJournalFingerprint['severity'],
    component: row.component,
    code: row.code,
    summary: row.summary,
    occurrenceCount: row.occurrenceCount,
    firstOccurredAt: row.firstOccurredAt.toISOString(),
    lastOccurredAt: row.lastOccurredAt.toISOString(),
    triageStatus: row.triageStatus as ExperienceJournalFingerprint['triageStatus'],
    triageNote: row.triageNote,
    triagedByStaffId: row.triagedByStaffId,
    triagedAt: row.triagedAt?.toISOString() ?? null,
  };
}

export class ExperienceJournalService {
  static async record(
    fastify: FastifyInstance,
    payload: RecordExperienceJournalEventRequest
  ): Promise<ExperienceJournalEvent> {
    const input = normalizeExperienceJournalEvent(payload);
    const occurredAt = new Date();
    const retentionExpiresAt = new Date(occurredAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { metadata, ...eventData } = input;
    const event = await fastify.prisma.crm.$transaction(async (tx) => {
      const row = await tx.crmExperienceJournalEvent.create({
        data: { ...eventData, metadataJson: JSON.stringify(metadata), retentionExpiresAt, occurredAt },
      });
      await tx.crmExperienceJournalFingerprint.upsert({
        where: { fingerprint: input.fingerprint },
        create: {
          fingerprint: input.fingerprint,
          category: input.category,
          severity: input.severity,
          component: input.component,
          code: input.code,
          summary: input.summary,
          occurrenceCount: 1,
          firstOccurredAt: occurredAt,
          lastOccurredAt: occurredAt,
        },
        update: {
          severity: input.severity,
          summary: input.summary,
          occurrenceCount: { increment: 1 },
          lastOccurredAt: occurredAt,
        },
      });
      return row;
    });
    return toEvent(event);
  }

  static async list(
    fastify: FastifyInstance,
    query: ExperienceJournalListQuery = {}
  ): Promise<ExperienceJournalListResponse> {
    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(query.limit) || 25)));
    const where: Prisma.CrmExperienceJournalFingerprintWhereInput = {
      ...(query.category
        ? { category: assertAllowed(query.category, EXPERIENCE_JOURNAL_CATEGORIES, 'Nhóm sự kiện') }
        : {}),
      ...(query.severity ? { severity: assertAllowed(query.severity, EXPERIENCE_JOURNAL_SEVERITIES, 'Mức độ') } : {}),
      ...(query.triageStatus
        ? { triageStatus: assertAllowed(query.triageStatus, EXPERIENCE_JOURNAL_TRIAGE_STATUSES, 'Trạng thái triage') }
        : {}),
      ...(query.component ? { component: { contains: clean(query.component, 80) } } : {}),
    };
    const [total, fingerprints, recentEvents] = await Promise.all([
      fastify.prisma.crm.crmExperienceJournalFingerprint.count({ where }),
      fastify.prisma.crm.crmExperienceJournalFingerprint.findMany({
        where,
        orderBy: [{ triageStatus: 'asc' }, { lastOccurredAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      fastify.prisma.crm.crmExperienceJournalEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: 20 }),
    ]);
    return { data: fingerprints.map(toFingerprint), recentEvents: recentEvents.map(toEvent), total, page, limit };
  }

  static async triage(
    fastify: FastifyInstance,
    actorStaffId: number,
    fingerprint: string,
    payload: TriageExperienceJournalFingerprintRequest
  ): Promise<ExperienceJournalFingerprint> {
    if (!/^[a-f0-9]{64}$/i.test(fingerprint)) throw new ExperienceJournalError('Fingerprint không hợp lệ.');
    const triageStatus = assertAllowed(payload?.triageStatus, EXPERIENCE_JOURNAL_TRIAGE_STATUSES, 'Trạng thái triage');
    const triageNote = optionalText(payload?.note, 600, 'Ghi chú triage');
    const row = await fastify.prisma.crm.crmExperienceJournalFingerprint
      .update({
        where: { fingerprint },
        data: { triageStatus, triageNote, triagedByStaffId: actorStaffId, triagedAt: new Date() },
      })
      .catch(() => {
        throw new ExperienceJournalError('Không tìm thấy nhóm sự kiện.', 404);
      });
    return toFingerprint(row);
  }

  static async cleanupExpired(fastify: FastifyInstance, now = new Date()): Promise<number> {
    const result = await fastify.prisma.crm.crmExperienceJournalEvent.deleteMany({
      where: { retentionExpiresAt: { lte: now } },
    });
    return result.count;
  }
}
