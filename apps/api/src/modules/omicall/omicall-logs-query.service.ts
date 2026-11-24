import type { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole, type UserRole } from '@mos-lab/shared';
import { Prisma } from '../../generated/crm-client/index.js';
import type { JwtUserPayload } from '../../middlewares/auth.js';

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
  legacyUserId?: string;
  status?: string;
  happyCallStatus?: string;
  analysisStatus?: string;
  direction?: string;
  search?: string;
  hasRecording?: string;
  startDate?: string;
  endDate?: string;
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
 * Queries paginated OmiCall logs with date bounds, phone search, and customer-profile filtering.
 */
export async function listOmicallLogsForViewer(
  fastify: FastifyInstance,
  scope: OmicallViewerScope,
  query: ListOmicallLogsQuery,
  pagination: { page: number; take: number }
): Promise<{ logs: SafeAny[]; total: number; page: number; limit: number }> {
  const { page, take } = pagination;
  const skip = (page - 1) * take;
  const where: Prisma.CrmOmicallLogWhereInput = {};
  const andConditions: Prisma.CrmOmicallLogWhereInput[] = [];

  if (scope.isQaReviewer) {
    if (query.staffId) where.staffId = parseInt(query.staffId, 10);
  } else {
    where.staffId = { in: scope.allowedStaffIds };
  }

  if (query.status) where.status = query.status;
  if (query.happyCallStatus) where.happyCallStatus = query.happyCallStatus;
  if (query.analysisStatus) where.analysisStatus = query.analysisStatus;
  if (query.direction && query.direction !== 'ALL') where.direction = query.direction;
  if (query.hasRecording === 'true') where.recordingUrl = { not: null };

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = parseFilterDateBoundary(query.startDate, 'start');
    if (query.endDate) where.createdAt.lte = parseFilterDateBoundary(query.endDate, 'end');
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
    andConditions.push({ OR: customerOrConditions });
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
    andConditions.push({ OR: searchConditions });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const [logs, total] = await Promise.all([
    fastify.prisma.crm.crmOmicallLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    fastify.prisma.crm.crmOmicallLog.count({ where }),
  ]);

  const foundStaffIds = Array.from(new Set(logs.map((l) => l.staffId).filter((id): id is number => id !== null)));
  const foundUserIds = Array.from(new Set(logs.map((l) => l.legacyUserId).filter((id): id is number => id !== null)));

  const [staffList, customerList] = await Promise.all([
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
    return {
      ...log,
      laughTimestamps: safeJsonParseArray(log.laughTimestamps),
      qaTags,
      qaChecklist: safeJsonParseObject(log.qaChecklist),
      callType,
      hasComplaint,
      staffName: log.staffId ? staffMap.get(log.staffId) || null : null,
      customerName: log.legacyUserId ? customerMap.get(log.legacyUserId) || null : null,
    };
  });

  return {
    logs: formattedLogs,
    total,
    page,
    limit: take,
  };
}
