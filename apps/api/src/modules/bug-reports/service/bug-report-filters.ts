import type { FastifyInstance } from 'fastify';
import type { CrmBugReport, Prisma } from '../../../generated/crm-client/index.js';
import {
  BUG_REPORT_CLARIFICATION_STATUSES,
  BUG_REPORT_EXPERT_IMPACT_LEVELS,
  BUG_REPORT_MAX_ATTACHMENTS,
  FEATURE_REQUEST_AUDIENCES,
  type BugPriority,
  type BugReportApiFailure,
  type BugReportClientError,
  type BugReportContext,
  type BugReportExpertDetails,
  type BugReportRequestType,
  type BugReportStatus,
  type CreateBugReportAttachmentRequest,
  type FeatureRequestContext,
} from '@mos-lab/shared';
import { BugReportStorage } from '../bug-report.storage.js';

export const AGENT_READABLE_STATUSES = new Set<BugReportStatus>(['NEW', 'APPROVED', 'IN_PROGRESS', 'FIXED']);
export const AGENT_FIX_STATUSES = new Set<BugReportStatus>(['APPROVED', 'IN_PROGRESS', 'FIXED']);
export const STATUS_SORT: Record<BugReportStatus, number> = {
  NEW: 0,
  APPROVED: 0,
  IN_PROGRESS: 0,
  FIXED: 0,
  CLOSED: 9,
  REJECTED: 9,
  DUPLICATE: 9,
  CANCELLED: 9,
};
export const PRIORITY_SORT: Record<BugPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
export const ALLOWED_TRANSITIONS: Record<BugReportStatus, ReadonlySet<BugReportStatus>> = {
  NEW: new Set(['NEW', 'APPROVED', 'REJECTED', 'DUPLICATE', 'CANCELLED']),
  APPROVED: new Set(['APPROVED', 'IN_PROGRESS', 'REJECTED', 'DUPLICATE', 'CANCELLED']),
  IN_PROGRESS: new Set(['IN_PROGRESS', 'APPROVED', 'FIXED', 'CANCELLED']),
  FIXED: new Set(['FIXED', 'IN_PROGRESS', 'CLOSED', 'CANCELLED']),
  CLOSED: new Set(['CLOSED', 'IN_PROGRESS']),
  REJECTED: new Set(['REJECTED', 'NEW']),
  DUPLICATE: new Set(['DUPLICATE', 'NEW']),
  CANCELLED: new Set(['CANCELLED', 'NEW']),
};
const SENSITIVE_QUERY_KEY = /token|secret|password|pass|authorization|api.?key|phone|email|search|query|name/i;

export function bugReportClarificationWhere(clarification: unknown): Prisma.CrmBugReportWhereInput {
  if (clarification === 'UNCLEAR') {
    return { clarificationStatus: { in: ['PENDING_AGENT', 'WAITING_REPORTER'] } };
  }
  if (
    typeof clarification === 'string' &&
    (BUG_REPORT_CLARIFICATION_STATUSES as readonly string[]).includes(clarification)
  ) {
    return { clarificationStatus: clarification };
  }
  return {};
}

export function bugReportNextActorWhere(nextActor: unknown): Prisma.CrmBugReportWhereInput {
  if (nextActor === 'REPORTER') {
    return {
      OR: [
        { status: 'FIXED' },
        {
          status: { in: ['NEW', 'APPROVED', 'IN_PROGRESS'] },
          clarificationStatus: 'WAITING_REPORTER',
        },
      ],
    };
  }
  if (nextActor === 'DANNY') return { status: 'NEW', clarificationStatus: 'READY' };
  if (nextActor === 'AGENT') {
    return {
      OR: [
        {
          status: { in: ['NEW', 'APPROVED', 'IN_PROGRESS'] },
          clarificationStatus: 'PENDING_AGENT',
        },
        {
          status: { in: ['APPROVED', 'IN_PROGRESS'] },
          clarificationStatus: 'READY',
          priority: { not: null },
        },
      ],
    };
  }
  if (nextActor === 'NONE') return { status: { in: ['CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED'] } };
  return {};
}

const implementationJobSummarySelect = {
  id: true,
  status: true,
  executionOwner: true,
  ideTaskId: true,
  ideTaskBoundAt: true,
  executionPhase: true,
  sourceVersion: true,
  planVersion: true,
  progressLabel: true,
  lastProgressAt: true,
  progressCount: true,
  checkpointCount: true,
  failureCode: true,
  retrySequence: true,
  testsJson: true,
  changedFilesJson: true,
  retainUntil: true,
  startedAt: true,
  completedAt: true,
  updatedAt: true,
  createdAt: true,
  leaseExpiresAt: true,
  leaseHeartbeatAt: true,
} as const;

export const reportInclude = {
  inboxPlanJobs: { orderBy: { createdAt: 'desc' as const }, take: 12 },
  reporter: { select: { id: true, displayName: true, role: true, avatarUrl: true } },
  approver: { select: { id: true, displayName: true, role: true, avatarUrl: true } },
  duplicateOf: { select: { requestType: true } },
  resolution: true,
  attachments: { orderBy: { createdAt: 'asc' as const } },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: { select: { id: true, displayName: true, role: true, avatarUrl: true } },
      attachments: { orderBy: { createdAt: 'asc' as const } },
    },
  },
  audits: {
    orderBy: { createdAt: 'asc' as const },
    include: { actor: { select: { id: true, displayName: true, role: true, avatarUrl: true } } },
  },
  inboxImplementationJobs: {
    orderBy: { createdAt: 'desc' as const },
    take: 10,
    select: implementationJobSummarySelect,
  },
} satisfies Prisma.CrmBugReportInclude;

export const mineReportInclude = {
  inboxPlanJobs: { orderBy: { createdAt: 'desc' as const }, take: 2 },
  reporter: { select: { id: true, displayName: true, role: true, avatarUrl: true } },
  resolution: true,
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' as const },
  },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: { select: { id: true, displayName: true, role: true, avatarUrl: true } },
      attachments: { orderBy: { createdAt: 'asc' as const } },
    },
  },
  audits: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      action: true,
      note: true,
      afterJson: true,
      createdAt: true,
    },
  },
  inboxImplementationJobs: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: implementationJobSummarySelect,
  },
} satisfies Prisma.CrmBugReportInclude;

export const listReportInclude = {
  inboxPlanJobs: { orderBy: { createdAt: 'desc' as const }, take: 3 },
  reporter: { select: { id: true, displayName: true, role: true, avatarUrl: true } },
  resolution: true,
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' as const },
  },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      body: true,
      authorType: true,
      createdAt: true,
    },
  },
  audits: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      action: true,
      note: true,
      afterJson: true,
      createdAt: true,
    },
  },
  inboxImplementationJobs: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: implementationJobSummarySelect,
  },
} satisfies Prisma.CrmBugReportInclude;

export type ReportWithRelations = Prisma.CrmBugReportGetPayload<{ include: typeof reportInclude }>;
export type MyReportWithRelations = Prisma.CrmBugReportGetPayload<{ include: typeof mineReportInclude }>;
export type ListReportWithRelations = Prisma.CrmBugReportGetPayload<{ include: typeof listReportInclude }>;

export class BugReportError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'BUG_REPORT_ERROR'
  ) {
    super(message);
    this.name = 'BugReportError';
  }
}

export function clipped(value: unknown, maxLength: number): string {
  return Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31));
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function storedRequestType(value: unknown): BugReportRequestType {
  return value === 'FEATURE' ? 'FEATURE' : 'BUG';
}

export function normalizeFeatureRequestContext(value: unknown): FeatureRequestContext {
  const input = value && typeof value === 'object' ? (value as Partial<FeatureRequestContext>) : {};
  const reason = clipped(input.reason, 2000);
  const audience = input.audience;
  const desiredOutcome = clipped(input.desiredOutcome, 2000) || null;
  if (reason.length < 3) throw new BugReportError('Vui lòng cho biết vì sao bạn cần chức năng này.');
  if (!FEATURE_REQUEST_AUDIENCES.includes(audience as FeatureRequestContext['audience'])) {
    throw new BugReportError('Vui lòng chọn ai sẽ sử dụng chức năng này.');
  }
  return { reason, audience: audience as FeatureRequestContext['audience'], desiredOutcome };
}

export function normalizeBugReportExpertDetails(value: unknown): BugReportExpertDetails | null {
  const input = value && typeof value === 'object' ? (value as Partial<BugReportExpertDetails>) : {};
  const impact = BUG_REPORT_EXPERT_IMPACT_LEVELS.includes(
    input.impact as (typeof BUG_REPORT_EXPERT_IMPACT_LEVELS)[number]
  )
    ? (input.impact as (typeof BUG_REPORT_EXPERT_IMPACT_LEVELS)[number])
    : null;
  const details: BugReportExpertDetails = {
    reproductionSteps: clipped(input.reproductionSteps, 1_200) || null,
    expectedResult: clipped(input.expectedResult, 1_200) || null,
    actualResult: clipped(input.actualResult, 1_200) || null,
    impact,
    environment: clipped(input.environment, 500) || null,
    workaround: clipped(input.workaround, 1_200) || null,
    relatedTicket: clipped(input.relatedTicket, 120) || null,
  };
  return Object.values(details).some(Boolean) ? details : null;
}

export function expertDetailsDto(row: Pick<CrmBugReport, 'requestMetadataJson'>): BugReportExpertDetails | null {
  const value = safeJsonParse<{ expertDetails?: unknown }>(row.requestMetadataJson, {});
  return normalizeBugReportExpertDetails(value.expertDetails);
}

export function featureRequestDto(
  row: Pick<CrmBugReport, 'requestType' | 'requestMetadataJson'>
): FeatureRequestContext | null {
  if (storedRequestType(row.requestType) !== 'FEATURE') return null;
  const value = safeJsonParse<Partial<FeatureRequestContext>>(row.requestMetadataJson, {});
  const audience = FEATURE_REQUEST_AUDIENCES.includes(value.audience as FeatureRequestContext['audience'])
    ? (value.audience as FeatureRequestContext['audience'])
    : 'ALL_STAFF';
  return {
    reason: clipped(value.reason, 2000),
    audience,
    desiredOutcome: clipped(value.desiredOutcome, 2000) || null,
  };
}

function sanitizeQuery(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.entries(input as Record<string, unknown>)
    .slice(0, 30)
    .reduce<Record<string, string>>((result, [rawKey, rawValue]) => {
      const key = clipped(rawKey, 80);
      if (!key) return result;
      result[key] = SENSITIVE_QUERY_KEY.test(key) ? '[REDACTED]' : clipped(rawValue, 200);
      return result;
    }, {});
}

function sanitizeDiagnosticUrl(value: unknown): string {
  const raw = clipped(value, 800);
  if (!raw) return '';
  try {
    const url = new URL(raw, 'https://m.local');
    const query = sanitizeQuery(Object.fromEntries(url.searchParams.entries()));
    const params = new URLSearchParams(query);
    return `${url.pathname}${params.size ? `?${params.toString()}` : ''}`.slice(0, 800);
  } catch {
    return raw.split('?')[0].slice(0, 800);
  }
}

function redactDiagnosticText(value: unknown, maxLength: number): string {
  return clipped(value, maxLength)
    .replace(/bearer\s+[a-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}(?:\.[a-z0-9_-]*)?\b/gi, '[REDACTED_TOKEN]')
    .replace(
      /(token|secret|password|pass|authorization|api.?key|phone|email|search|query|name)\s*["']?\s*[:=]\s*["']?([^"'&,\s}\]]+)/gi,
      '$1=[REDACTED]'
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/(?:\+?84|0)(?:[\s.-]?\d){8,10}\b/g, '[REDACTED_PHONE]');
}

function sanitizeApiFailure(value: unknown): BugReportApiFailure | null {
  if (!value || typeof value !== 'object') return null;
  const failure = value as Partial<BugReportApiFailure>;
  return {
    occurredAt: clipped(failure.occurredAt, 40),
    method: clipped(failure.method, 12).toUpperCase(),
    url: sanitizeDiagnosticUrl(failure.url),
    status: Number.isInteger(failure.status) ? Number(failure.status) : null,
    code: failure.code ? clipped(failure.code, 80) : null,
    message: redactDiagnosticText(failure.message, 500),
  };
}

function sanitizeClientError(value: unknown): BugReportClientError | null {
  if (!value || typeof value !== 'object') return null;
  const error = value as Partial<BugReportClientError>;
  return {
    occurredAt: clipped(error.occurredAt, 40),
    name: clipped(error.name, 100) || 'Error',
    message: redactDiagnosticText(error.message, 1000),
    stack: error.stack ? redactDiagnosticText(error.stack, 4000) : null,
  };
}

export function sanitizeBugReportContext(value: unknown): BugReportContext {
  const context = value && typeof value === 'object' ? (value as Partial<BugReportContext>) : {};
  const viewport =
    context.viewport && typeof context.viewport === 'object'
      ? context.viewport
      : { width: 0, height: 0, devicePixelRatio: 1 };
  const path = clipped(context.path, 500).split('?')[0];
  return {
    capturedAt: clipped(context.capturedAt, 40) || new Date().toISOString(),
    path: path.startsWith('/') ? path : '/',
    query: sanitizeQuery(context.query),
    pageTitle: clipped(context.pageTitle, 200),
    overlays: Array.isArray(context.overlays)
      ? context.overlays
          .slice(0, 10)
          .map((item) => clipped(item, 180))
          .filter(Boolean)
      : [],
    themeMode: context.themeMode === 'light' || context.themeMode === 'dark' ? context.themeMode : 'unknown',
    viewport: {
      width: Math.max(0, Math.min(20_000, Math.round(Number(viewport.width) || 0))),
      height: Math.max(0, Math.min(20_000, Math.round(Number(viewport.height) || 0))),
      devicePixelRatio: Math.max(0.5, Math.min(10, Number(viewport.devicePixelRatio) || 1)),
    },
    userAgent: clipped(context.userAgent, 500),
    online: context.online !== false,
    timeZone: clipped(context.timeZone, 100) || 'Asia/Ho_Chi_Minh',
    webCommit: context.webCommit ? clipped(context.webCommit, 64) : null,
    apiCommit: context.apiCommit ? clipped(context.apiCommit, 64) : null,
    apiDeployedAt: context.apiDeployedAt ? clipped(context.apiDeployedAt, 40) : null,
    recentApiFailures: Array.isArray(context.recentApiFailures)
      ? context.recentApiFailures
          .slice(-10)
          .map(sanitizeApiFailure)
          .filter((item): item is BugReportApiFailure => Boolean(item))
      : [],
    recentClientErrors: Array.isArray(context.recentClientErrors)
      ? context.recentClientErrors
          .slice(-10)
          .map(sanitizeClientError)
          .filter((item): item is BugReportClientError => Boolean(item))
      : [],
    errorBoundary: sanitizeClientError(context.errorBoundary) ?? null,
  };
}

export function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? Number(item) : item));
}

export async function saveAttachments(
  fastify: FastifyInstance,
  reportId: number,
  attachments: CreateBugReportAttachmentRequest[],
  commentId?: number
): Promise<string[]> {
  const warnings: string[] = [];
  for (const [index, attachment] of attachments.entries()) {
    let storagePath: string | null = null;
    try {
      const saved = await BugReportStorage.save(reportId, attachment);
      storagePath = saved.storagePath;
      await fastify.prisma.crm.crmBugReportAttachment.create({
        data: {
          reportId,
          commentId,
          originalName: clipped(attachment.fileName, 255) || `anh-loi-${index + 1}`,
          storagePath: saved.storagePath,
          mimeType: attachment.mimeType,
          sizeBytes: saved.sizeBytes,
        },
      });
    } catch (error) {
      if (storagePath) await BugReportStorage.remove(storagePath).catch(() => undefined);
      fastify.log.warn({ error, reportId, commentId, attachmentIndex: index }, 'Bug report attachment save failed');
      warnings.push(`Ảnh ${index + 1} không tải được; nội dung chữ vẫn đã lưu.`);
    }
  }
  return warnings;
}

export function normalizedAttachments(input: unknown): CreateBugReportAttachmentRequest[] {
  const raw = Array.isArray(input) ? input : [];
  const maxAttachments = BUG_REPORT_MAX_ATTACHMENTS ?? 10;
  if (raw.length > maxAttachments) {
    throw new BugReportError(`Mỗi nội dung chỉ nhận tối đa ${maxAttachments} ảnh.`);
  }
  return raw.slice(0, maxAttachments) as CreateBugReportAttachmentRequest[];
}
