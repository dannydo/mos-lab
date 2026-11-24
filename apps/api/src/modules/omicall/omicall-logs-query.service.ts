import type { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole, type UserRole } from '@mos-lab/shared';
import { Prisma } from '../../generated/crm-client/index.js';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { resolveCallStoreIds, resolveStoreFilterCriteria } from './omicall-branch.service.js';
import { redactLogForViewer } from './omicall-coaching.service.js';

const QA_REVIEWER_ROLES = new Set<string>(['admin', 'super_admin', 'manager', 'qa', 'qc', 'qa_qc']);

export interface OmicallViewerScope {
  isAdmin: boolean;
  isQaReviewer: boolean;
  allowedStaffIds: number[];
  hasExtension: boolean;
}

export interface ListOmicallLogsQuery {
  page?: string;
  limit?: string;
  staffId?: string;
  storeId?: string;
  legacyUserId?: string;
  status?: string;
  happyCallStatus?: string;
  analysisStatus?: string;
  direction?: string;
  aiSatisfaction?: string;
  ratingSource?: string;
  ratingLevel?: string;
  hasComplaint?: string;
  search?: string;
  hasRecording?: string;
  startDate?: string;
  endDate?: string;
}

export interface OmicallLogsSummary {
  totalCalls: number;
  answeredCalls: number;
  happyCallsApproved: number;
  happyCallsPending: number;
  complaintCalls: number;
  aiDoneCalls: number;
  staffSelfRatedCalls: number;
  mismatchCalls: number;
}

export function safeJsonParseArray(raw: string | null | undefined): SafeAny[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function safeJsonParseObject(raw: string | null | undefined): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function mapStatusToDisposition(
  status: string | null | undefined
): 'ANSWERED' | 'BUSY' | 'FAILED' | 'NO_ANSWER' {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ANSWER' || normalized === 'ANSWERED') return 'ANSWERED';
  if (normalized === 'BUSY') return 'BUSY';
  if (normalized === 'CANCEL' || normalized === 'FAILED') return 'FAILED';
  return 'NO_ANSWER';
}

export function deriveCallMetaFromTags(tags: string[]): {
  callType: 'CSKH' | 'TELESALES' | null;
  hasComplaint: boolean;
} {
  const lowerTags = new Set(tags.map((t) => String(t).trim().toLowerCase()));
  const callType = lowerTags.has('cskh') ? 'CSKH' : lowerTags.has('telesales') ? 'TELESALES' : null;
  const hasComplaint = lowerTags.has('khiếu nại') || lowerTags.has('khieu nai');
  return { callType, hasComplaint };
}

export function parseFilterDateBoundary(rawDate: string, bound: 'start' | 'end'): Date {
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const suffix = bound === 'start' ? 'T00:00:00.000+07:00' : 'T23:59:59.999+07:00';
    return new Date(`${trimmed}${suffix}`);
  }
  return new Date(trimmed);
}

function buildScoreFilterCondition(level: string): number | Prisma.IntNullableFilter | null | undefined {
  const norm = level.trim().toUpperCase();
  if (!norm || norm === 'ALL') return undefined;
  if (norm === 'SATISFIED') return { gte: 4 };
  if (norm === 'NEUTRAL') return 3;
  if (norm === 'UNSATISFIED') return { lte: 2, gte: 1 };
  if (norm === 'RATED') return { not: null };
  if (norm === 'UNRATED') return null;
  const exact = Number.parseInt(norm, 10);
  if (Number.isSafeInteger(exact) && exact >= 1 && exact <= 5) {
    return exact;
  }
  return undefined;
}

/**
 * Pure helper generating Prisma `AND` filter clauses for AI CSAT and 3-source
 * human satisfaction ratings (Admin, Manager/QA, Staff self-assessment).
 */
export function buildSatisfactionWhereClauses(params: {
  aiSatisfaction?: string;
  ratingSource?: string;
  ratingLevel?: string;
  canViewAiScore?: boolean;
}): Prisma.CrmOmicallLogWhereInput[] {
  const clauses: Prisma.CrmOmicallLogWhereInput[] = [];
  const canViewAi = params.canViewAiScore !== false;

  const aiCond = params.aiSatisfaction ? buildScoreFilterCondition(params.aiSatisfaction) : undefined;
  if (aiCond !== undefined) {
    if (!canViewAi) {
      // Prevent regular staff from inferring locked AI scores via search filters
      clauses.push({ staffSelfSatisfactionScore: { not: null } });
    }
    clauses.push({ customerSatisfactionScore: aiCond });
  }

  const normLevel = String(params.ratingLevel || 'ALL')
    .trim()
    .toUpperCase();
  const normSource = String(params.ratingSource || 'ANY')
    .trim()
    .toUpperCase();

  if (normLevel === 'AI_MISMATCH') {
    clauses.push({ customerSatisfactionScore: { not: null } });
    if (normSource === 'ADMIN') clauses.push({ adminSatisfactionScore: { not: null } });
    else if (normSource === 'MANAGER') clauses.push({ managerSatisfactionScore: { not: null } });
    else if (normSource === 'STAFF') clauses.push({ staffSelfSatisfactionScore: { not: null } });
    else {
      clauses.push({
        OR: [
          { adminSatisfactionScore: { not: null } },
          { managerSatisfactionScore: { not: null } },
          { staffSelfSatisfactionScore: { not: null } },
        ],
      });
    }
    return clauses;
  }

  const levelCond = normLevel !== 'ALL' ? buildScoreFilterCondition(normLevel) : undefined;
  if (levelCond !== undefined) {
    if (normSource === 'ADMIN') {
      clauses.push({ adminSatisfactionScore: levelCond });
    } else if (normSource === 'MANAGER') {
      clauses.push({ managerSatisfactionScore: levelCond });
    } else if (normSource === 'STAFF') {
      clauses.push({ staffSelfSatisfactionScore: levelCond });
    } else if (normLevel === 'UNRATED') {
      clauses.push({
        AND: [
          { adminSatisfactionScore: null },
          { managerSatisfactionScore: null },
          { staffSelfSatisfactionScore: null },
        ],
      });
    } else {
      clauses.push({
        OR: [
          { adminSatisfactionScore: levelCond },
          { managerSatisfactionScore: levelCond },
          { staffSelfSatisfactionScore: levelCond },
        ],
      });
    }
  } else if (normSource !== 'ANY' && normSource) {
    // Source selected without explicit level -> default to records rated by that source
    if (normSource === 'ADMIN') clauses.push({ adminSatisfactionScore: { not: null } });
    else if (normSource === 'MANAGER') clauses.push({ managerSatisfactionScore: { not: null } });
    else if (normSource === 'STAFF') clauses.push({ staffSelfSatisfactionScore: { not: null } });
  }

  return clauses;
}

export function doesRowHaveAiMismatch(
  row: {
    customerSatisfactionScore: number | null;
    adminSatisfactionScore: number | null;
    managerSatisfactionScore: number | null;
    staffSelfSatisfactionScore: number | null;
  },
  ratingSource = 'ANY'
): boolean {
  const ai = row.customerSatisfactionScore;
  if (ai === null || ai === undefined) return false;
  const source = ratingSource.trim().toUpperCase();

  if (source === 'ADMIN') {
    return row.adminSatisfactionScore !== null && Math.abs(ai - row.adminSatisfactionScore) >= 2;
  }
  if (source === 'MANAGER') {
    return row.managerSatisfactionScore !== null && Math.abs(ai - row.managerSatisfactionScore) >= 2;
  }
  if (source === 'STAFF') {
    return row.staffSelfSatisfactionScore !== null && Math.abs(ai - row.staffSelfSatisfactionScore) >= 2;
  }

  return [row.adminSatisfactionScore, row.managerSatisfactionScore, row.staffSelfSatisfactionScore].some(
    (s) => s !== null && Math.abs(ai - s) >= 2
  );
}

/**
 * Resolves caller's OmiCall visibility scope including shared SIP extension peers.
 */
export async function resolveViewerExtensionScope(
  fastify: FastifyInstance,
  user: JwtUserPayload
): Promise<OmicallViewerScope> {
  const roleStr = String(user.role || '').toLowerCase();
  const isAdmin = isAdminOrSuperAdminRole(user.role as UserRole);
  const isQaReviewer = isAdmin || QA_REVIEWER_ROLES.has(roleStr);

  const callerConfig = await fastify.prisma.crm.crmOmicallConfig.findFirst({
    where: { staffId: user.id },
    select: { extension: true },
  });

  let allowedStaffIds = [user.id];
  if (callerConfig?.extension) {
    const sharedConfigs = await fastify.prisma.crm.crmOmicallConfig.findMany({
      where: { extension: callerConfig.extension },
      select: { staffId: true },
    });
    const ids = sharedConfigs.map((c) => c.staffId);
    if (ids.length > 0) {
      allowedStaffIds = Array.from(new Set([user.id, ...ids]));
    }
  }

  return {
    isAdmin,
    isQaReviewer,
    allowedStaffIds,
    hasExtension: Boolean(callerConfig?.extension),
  };
}

/**
 * Queries paginated OmiCall logs with date bounds, branch/staff/satisfaction
 * filters, daily KPI summary, and blind self-assessment redaction.
 */
export async function listOmicallLogsForViewer(
  fastify: FastifyInstance,
  scope: OmicallViewerScope,
  query: ListOmicallLogsQuery,
  pagination: { page: number; take: number }
): Promise<{
  logs: SafeAny[];
  branches: Array<{ id: number; name: string }>;
  summary: OmicallLogsSummary;
  total: number;
  page: number;
  limit: number;
}> {
  const { page, take } = pagination;
  const skip = (page - 1) * take;
  const baseWhere: Prisma.CrmOmicallLogWhereInput = {};
  const baseAndConditions: Prisma.CrmOmicallLogWhereInput[] = [];

  if (scope.isQaReviewer) {
    if (query.staffId) baseWhere.staffId = parseInt(query.staffId, 10);
  } else {
    baseWhere.staffId = { in: scope.allowedStaffIds };
  }

  if (query.direction && query.direction !== 'ALL') baseWhere.direction = query.direction;

  if (query.startDate || query.endDate) {
    baseWhere.createdAt = {};
    if (query.startDate) baseWhere.createdAt.gte = parseFilterDateBoundary(query.startDate, 'start');
    if (query.endDate) baseWhere.createdAt.lte = parseFilterDateBoundary(query.endDate, 'end');
  }

  const parsedStoreId = query.storeId && query.storeId !== 'ALL' ? Number.parseInt(query.storeId, 10) : NaN;
  if (Number.isSafeInteger(parsedStoreId) && parsedStoreId > 0) {
    const storeCriteria = await resolveStoreFilterCriteria(fastify, parsedStoreId);
    const storeOrConditions: Prisma.CrmOmicallLogWhereInput[] = [{ storeId: parsedStoreId }];
    if (storeCriteria.legacyUserIds.length > 0) {
      storeOrConditions.push({ storeId: null, legacyUserId: { in: storeCriteria.legacyUserIds } });
    }
    if (storeCriteria.staffIds.length > 0) {
      storeOrConditions.push({ storeId: null, legacyUserId: null, staffId: { in: storeCriteria.staffIds } });
    }
    baseAndConditions.push({ OR: storeOrConditions });
  }

  const parsedLegacyUserId = query.legacyUserId ? Number.parseInt(query.legacyUserId, 10) : NaN;
  if (Number.isSafeInteger(parsedLegacyUserId) && parsedLegacyUserId > 0) {
    const contacts = await fastify.prisma.legacy.user_contact.findMany({
      where: { user_id: parsedLegacyUserId },
      select: { phone_number: true },
    });
    const suffixes = Array.from(
      new Set(
        contacts
          .map((c) => String(c.phone_number || '').replace(/\D/g, ''))
          .map((digits) => (digits.length > 9 ? digits.slice(-9) : digits))
          .filter((s) => s.length >= 7)
      )
    );
    const customerOrConditions: Prisma.CrmOmicallLogWhereInput[] = [{ legacyUserId: parsedLegacyUserId }];
    for (const suffix of suffixes) {
      customerOrConditions.push({ destinationNumber: { contains: suffix } }, { sourceNumber: { contains: suffix } });
    }
    baseAndConditions.push({ OR: customerOrConditions });
  }

  const trimmedSearch = query.search?.trim() || '';
  if (trimmedSearch) {
    const cleanDigits = trimmedSearch.replace(/\D/g, '');
    const phoneSuffix = cleanDigits.length > 9 ? cleanDigits.slice(-9) : cleanDigits;
    const searchConditions: Prisma.CrmOmicallLogWhereInput[] = [
      { destinationNumber: { contains: trimmedSearch } },
      { sourceNumber: { contains: trimmedSearch } },
      { callUuid: { contains: trimmedSearch } },
    ];
    if (phoneSuffix && phoneSuffix !== trimmedSearch) {
      searchConditions.push(
        { destinationNumber: { contains: phoneSuffix } },
        { sourceNumber: { contains: phoneSuffix } }
      );
    }
    baseAndConditions.push({ OR: searchConditions });
  }

  if (baseAndConditions.length > 0) {
    baseWhere.AND = baseAndConditions;
  }

  const summaryRows = await fastify.prisma.crm.crmOmicallLog.findMany({
    where: baseWhere,
    select: {
      status: true,
      happyCallStatus: true,
      analysisStatus: true,
      qaTags: true,
      customerSatisfactionScore: true,
      staffSelfSatisfactionScore: true,
    },
  });

  const summary: OmicallLogsSummary = {
    totalCalls: summaryRows.length,
    answeredCalls: 0,
    happyCallsApproved: 0,
    happyCallsPending: 0,
    complaintCalls: 0,
    aiDoneCalls: 0,
    staffSelfRatedCalls: 0,
    mismatchCalls: 0,
  };

  for (const r of summaryRows) {
    if (r.status === 'ANSWER') summary.answeredCalls++;
    if (r.staffSelfSatisfactionScore !== null) summary.staffSelfRatedCalls++;

    const unlocked = scope.isQaReviewer || r.staffSelfSatisfactionScore !== null;
    if (!unlocked) continue;

    if (r.analysisStatus === 'DONE') summary.aiDoneCalls++;
    if (r.happyCallStatus === 'APPROVED') summary.happyCallsApproved++;
    if (r.happyCallStatus === 'PENDING_APPROVAL') summary.happyCallsPending++;
    const tags = safeJsonParseArray(r.qaTags).map(String);
    if (deriveCallMetaFromTags(tags).hasComplaint) summary.complaintCalls++;
    if (
      r.customerSatisfactionScore !== null &&
      r.staffSelfSatisfactionScore !== null &&
      Math.abs(r.customerSatisfactionScore - r.staffSelfSatisfactionScore) >= 2
    ) {
      summary.mismatchCalls++;
    }
  }

  // Apply granular sub-filters for the table query
  const tableWhere: Prisma.CrmOmicallLogWhereInput = { ...baseWhere };
  const tableAndConditions: Prisma.CrmOmicallLogWhereInput[] = [...baseAndConditions];

  if (query.status && query.status !== 'ALL') tableWhere.status = query.status;
  if (query.happyCallStatus && query.happyCallStatus !== 'ALL') {
    if (!scope.isQaReviewer) tableAndConditions.push({ staffSelfSatisfactionScore: { not: null } });
    tableWhere.happyCallStatus = query.happyCallStatus;
  }
  if (query.analysisStatus && query.analysisStatus !== 'ALL') tableWhere.analysisStatus = query.analysisStatus;
  if (query.hasRecording === 'true') tableWhere.recordingUrl = { not: null };
  if (query.hasComplaint === 'true') {
    if (!scope.isQaReviewer) tableAndConditions.push({ staffSelfSatisfactionScore: { not: null } });
    tableAndConditions.push({
      OR: [{ qaTags: { contains: 'Khiếu nại' } }, { qaTags: { contains: 'khiếu nại' } }],
    });
  }

  const satisfactionClauses = buildSatisfactionWhereClauses({
    aiSatisfaction: query.aiSatisfaction,
    ratingSource: query.ratingSource,
    ratingLevel: query.ratingLevel,
    canViewAiScore: scope.isQaReviewer,
  });
  tableAndConditions.push(...satisfactionClauses);

  if (tableAndConditions.length > 0) {
    tableWhere.AND = tableAndConditions;
  }

  if (
    String(query.ratingLevel || '')
      .trim()
      .toUpperCase() === 'AI_MISMATCH'
  ) {
    const candidates = await fastify.prisma.crm.crmOmicallLog.findMany({
      where: tableWhere,
      select: {
        id: true,
        customerSatisfactionScore: true,
        adminSatisfactionScore: true,
        managerSatisfactionScore: true,
        staffSelfSatisfactionScore: true,
      },
    });
    const matchedIds = candidates
      .filter((row) =>
        scope.isQaReviewer || row.staffSelfSatisfactionScore !== null
          ? doesRowHaveAiMismatch(row, query.ratingSource || 'ANY')
          : false
      )
      .map((row) => row.id);
    tableAndConditions.push({ id: { in: matchedIds.length > 0 ? matchedIds : [-1] } });
    tableWhere.AND = tableAndConditions;
  }

  const [logs, total] = await Promise.all([
    fastify.prisma.crm.crmOmicallLog.findMany({
      where: tableWhere,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    fastify.prisma.crm.crmOmicallLog.count({ where: tableWhere }),
  ]);

  const foundStaffIds = Array.from(
    new Set(
      logs
        .flatMap((l) => [l.staffId, l.managerReviewedBy, l.adminReviewedBy])
        .filter((id): id is number => id !== null && id !== undefined)
    )
  );
  const foundUserIds = Array.from(new Set(logs.map((l) => l.legacyUserId).filter((id): id is number => id !== null)));

  const [staffList, customerList, branchResolution] = await Promise.all([
    foundStaffIds.length > 0
      ? fastify.prisma.crm.crmStaff.findMany({
          where: { id: { in: foundStaffIds } },
          select: { id: true, displayName: true },
        })
      : Promise.resolve([]),
    foundUserIds.length > 0
      ? fastify.prisma.legacy.user_profile.findMany({
          where: { user_id: { in: foundUserIds } },
          select: { user_id: true, full_name: true, first_name: true, last_name: true },
        })
      : Promise.resolve([]),
    resolveCallStoreIds(fastify, logs),
  ]);

  const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));
  const customerMap = new Map(
    customerList.map((c) => [
      c.user_id,
      c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Khách hàng',
    ])
  );

  const formattedLogs = logs.map((log) => {
    const qaTags = safeJsonParseArray(log.qaTags).map(String);
    const { callType, hasComplaint } = deriveCallMetaFromTags(qaTags);
    const resolvedStoreId = branchResolution.storeIdByLogId.get(log.id) ?? log.storeId ?? null;
    const resolvedStoreName = resolvedStoreId ? (branchResolution.storeNameById.get(resolvedStoreId) ?? null) : null;

    const baseRow = {
      ...log,
      storeId: resolvedStoreId,
      storeName: resolvedStoreName,
      laughTimestamps: safeJsonParseArray(log.laughTimestamps),
      qaTags,
      qaChecklist: safeJsonParseObject(log.qaChecklist),
      callType,
      hasComplaint,
      staffName: log.staffId ? staffMap.get(log.staffId) || null : null,
      managerReviewedByName: log.managerReviewedBy ? staffMap.get(log.managerReviewedBy) || null : null,
      adminReviewedByName: log.adminReviewedBy ? staffMap.get(log.adminReviewedBy) || null : null,
      customerName: log.legacyUserId ? customerMap.get(log.legacyUserId) || null : null,
    };

    return redactLogForViewer(baseRow, scope);
  });

  return {
    logs: formattedLogs,
    branches: branchResolution.branches,
    summary,
    total,
    page,
    limit: take,
  };
}
