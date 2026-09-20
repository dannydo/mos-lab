import type { FastifyInstance } from 'fastify';
import type { Prisma } from '../../generated/crm-client/index.js';
import {
  FRONTEND_ISSUE_STATUSES,
  FRONTEND_ISSUE_TYPES,
  formatBugReportKey,
  removeVietnameseTones,
  type FrontendIssueListQuery,
  type FrontendIssueListResponse,
  type FrontendIssueMetrics,
  type FrontendIssuePayload,
  type FrontendIssueRecord,
  type FrontendIssueStatus,
  type FrontendIssueSummary,
  type FrontendIssueType,
} from '@mos-lab/shared';

const MAX_STORED_ISSUES = 200;
const inMemoryIssuesList: FrontendIssuePayload[] = [];
const inMemoryIssuesByFingerprint = new Map<string, FrontendIssueSummary>();

function mapDbRowToRecord(row: {
  id: number;
  fingerprint: string;
  issueType: string;
  path: string;
  target: string | null;
  message: string;
  occurrenceCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastUserId: number | null;
  lastUserName: string | null;
  status: string;
  resolvedAt: Date | null;
  resolvedByStaffId: number | null;
  resolutionNotes: string | null;
  latestPayloadJson: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedByStaff?: { displayName: string } | null;
}): FrontendIssueRecord {
  let latestPayload: FrontendIssuePayload | null = null;
  if (row.latestPayloadJson) {
    try {
      latestPayload = JSON.parse(row.latestPayloadJson);
    } catch {
      latestPayload = null;
    }
  }

  return {
    id: row.id,
    fingerprint: row.fingerprint,
    issueType: row.issueType as FrontendIssueType,
    path: row.path,
    target: row.target,
    message: row.message,
    occurrenceCount: row.occurrenceCount,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    lastUserId: row.lastUserId,
    lastUserName: row.lastUserName,
    status: row.status as FrontendIssueStatus,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    resolvedByStaffId: row.resolvedByStaffId,
    resolvedByName: row.resolvedByStaff?.displayName || null,
    resolutionNotes: row.resolutionNotes,
    latestPayload,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class FrontendTelemetryService {
  public static async recordIssue(
    payload: FrontendIssuePayload,
    fastify?: FastifyInstance
  ): Promise<{ success: boolean; issueId: string }> {
    if (!payload || !payload.issueType || !payload.fingerprint) {
      return { success: false, issueId: '' };
    }

    // 1. Maintain in-memory ring buffer (fast & safe fallback)
    inMemoryIssuesList.unshift(payload);
    if (inMemoryIssuesList.length > MAX_STORED_ISSUES) {
      inMemoryIssuesList.pop();
    }

    const message = payload.error?.message || payload.error?.name || payload.issueType;
    const existingMemory = inMemoryIssuesByFingerprint.get(payload.fingerprint);

    if (existingMemory) {
      existingMemory.occurrenceCount += 1;
      existingMemory.lastSeenAt = payload.occurredAt;
      existingMemory.lastUserId = payload.userId ?? existingMemory.lastUserId;
      existingMemory.lastUserName = payload.userName ?? existingMemory.lastUserName;
      existingMemory.latestIssue = payload;
    } else {
      inMemoryIssuesByFingerprint.set(payload.fingerprint, {
        fingerprint: payload.fingerprint,
        issueType: payload.issueType,
        path: payload.path,
        message,
        occurrenceCount: 1,
        firstSeenAt: payload.occurredAt,
        lastSeenAt: payload.occurredAt,
        lastUserId: payload.userId ?? null,
        lastUserName: payload.userName ?? null,
        latestIssue: payload,
      });
    }

    if (inMemoryIssuesByFingerprint.size > 500) {
      const oldestKey = inMemoryIssuesByFingerprint.keys().next().value;
      if (oldestKey) inMemoryIssuesByFingerprint.delete(oldestKey);
    }

    // 2. Persist to Database if fastify instance with Prisma CRM is available
    if (fastify?.prisma?.crm) {
      try {
        const occurredAtDate = new Date(payload.occurredAt);
        const target =
          (payload.metadata?.target as string) || payload.breadcrumbs?.[payload.breadcrumbs.length - 1]?.target || null;

        const existingDb = await fastify.prisma.crm.crmFrontendIssue.findUnique({
          where: { fingerprint: payload.fingerprint },
        });

        if (existingDb) {
          // If the issue was previously marked RESOLVED, reopen it automatically
          const nextStatus = existingDb.status === 'RESOLVED' ? 'REOPENED' : existingDb.status;

          await fastify.prisma.crm.crmFrontendIssue.update({
            where: { id: existingDb.id },
            data: {
              occurrenceCount: { increment: 1 },
              lastSeenAt: occurredAtDate,
              lastUserId: payload.userId ?? existingDb.lastUserId,
              lastUserName: payload.userName ?? existingDb.lastUserName,
              status: nextStatus,
              target: target ?? existingDb.target,
              message: message || existingDb.message,
              latestPayloadJson: JSON.stringify(payload),
            },
          });
        } else {
          await fastify.prisma.crm.crmFrontendIssue.create({
            data: {
              fingerprint: payload.fingerprint,
              issueType: payload.issueType,
              path: payload.path,
              target,
              message,
              occurrenceCount: 1,
              firstSeenAt: occurredAtDate,
              lastSeenAt: occurredAtDate,
              lastUserId: payload.userId ?? null,
              lastUserName: payload.userName ?? null,
              status: 'NEW',
              latestPayloadJson: JSON.stringify(payload),
            },
          });
        }
      } catch (dbError) {
        fastify.log.warn({ err: dbError }, 'Không thể lưu telemetry issue vào database');
      }
    }

    return { success: true, issueId: payload.issueId };
  }

  public static async list(
    fastify: FastifyInstance,
    query: FrontendIssueListQuery = {}
  ): Promise<FrontendIssueListResponse> {
    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 25)));

    // Fallback if DB is not available
    if (!fastify.prisma?.crm) {
      const memoryItems = Array.from(inMemoryIssuesByFingerprint.values()).map((item, idx) => ({
        id: idx + 1,
        fingerprint: item.fingerprint,
        issueType: item.issueType,
        path: item.path,
        target: null,
        message: item.message,
        occurrenceCount: item.occurrenceCount,
        firstSeenAt: item.firstSeenAt,
        lastSeenAt: item.lastSeenAt,
        lastUserId: item.lastUserId ?? null,
        lastUserName: item.lastUserName ?? null,
        status: 'NEW' as FrontendIssueStatus,
        resolvedAt: null,
        resolvedByStaffId: null,
        resolvedByName: null,
        resolutionNotes: null,
        latestPayload: item.latestIssue,
        createdAt: item.firstSeenAt,
        updatedAt: item.lastSeenAt,
      }));

      const metrics: FrontendIssueMetrics = {
        totalCount: memoryItems.length,
        newCount: memoryItems.length,
        investigatingCount: 0,
        resolvedCount: 0,
        reopenedCount: 0,
        ignoredCount: 0,
        resolutionRate: 0,
      };

      return {
        data: memoryItems.slice((page - 1) * limit, page * limit),
        metrics,
        total: memoryItems.length,
        page,
        limit,
      };
    }

    const where: Prisma.CrmFrontendIssueWhereInput = {};

    if (
      query.status &&
      query.status !== 'ALL' &&
      FRONTEND_ISSUE_STATUSES.includes(query.status as FrontendIssueStatus)
    ) {
      where.status = query.status;
    }

    if (
      query.issueType &&
      query.issueType !== 'ALL' &&
      FRONTEND_ISSUE_TYPES.includes(query.issueType as FrontendIssueType)
    ) {
      where.issueType = query.issueType;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { path: { contains: search } },
        { target: { contains: search } },
        { message: { contains: search } },
        { fingerprint: { contains: search } },
      ];
    }

    const [total, rows, metrics] = await Promise.all([
      fastify.prisma.crm.crmFrontendIssue.count({ where }),
      fastify.prisma.crm.crmFrontendIssue.findMany({
        where,
        include: {
          resolvedByStaff: {
            select: { displayName: true },
          },
        },
        orderBy: [{ lastSeenAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.getMetrics(fastify),
    ]);

    return {
      data: rows.map(mapDbRowToRecord),
      metrics,
      total,
      page,
      limit,
    };
  }

  public static async getMetrics(fastify: FastifyInstance): Promise<FrontendIssueMetrics> {
    if (!fastify.prisma?.crm) {
      return {
        totalCount: inMemoryIssuesByFingerprint.size,
        newCount: inMemoryIssuesByFingerprint.size,
        investigatingCount: 0,
        resolvedCount: 0,
        reopenedCount: 0,
        ignoredCount: 0,
        resolutionRate: 0,
      };
    }

    const counts = await fastify.prisma.crm.crmFrontendIssue.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {};
    let totalCount = 0;

    for (const group of counts) {
      statusCounts[group.status] = group._count.id;
      totalCount += group._count.id;
    }

    const newCount = statusCounts['NEW'] || 0;
    const investigatingCount = statusCounts['INVESTIGATING'] || 0;
    const resolvedCount = statusCounts['RESOLVED'] || 0;
    const reopenedCount = statusCounts['REOPENED'] || 0;
    const ignoredCount = statusCounts['IGNORED'] || 0;
    const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

    return {
      totalCount,
      newCount,
      investigatingCount,
      resolvedCount,
      reopenedCount,
      ignoredCount,
      resolutionRate,
    };
  }

  public static async updateStatus(
    fastify: FastifyInstance,
    id: number,
    status: FrontendIssueStatus,
    resolutionNotes?: string,
    actorStaffId?: number
  ): Promise<FrontendIssueRecord> {
    if (!fastify.prisma?.crm) {
      throw new Error('Database không khả dụng');
    }

    const existing = await fastify.prisma.crm.crmFrontendIssue.findUnique({
      where: { id },
    });

    if (!existing) {
      const notFoundError = new Error('Không tìm thấy sự cố.');
      (notFoundError as unknown as { statusCode: number }).statusCode = 404;
      throw notFoundError;
    }

    const isResolving = status === 'RESOLVED';
    const updated = await fastify.prisma.crm.crmFrontendIssue.update({
      where: { id },
      data: {
        status,
        resolutionNotes: resolutionNotes !== undefined ? resolutionNotes : existing.resolutionNotes,
        resolvedAt: isResolving ? new Date() : status === 'NEW' || status === 'REOPENED' ? null : existing.resolvedAt,
        resolvedByStaffId: isResolving ? (actorStaffId ?? existing.resolvedByStaffId) : existing.resolvedByStaffId,
      },
      include: {
        resolvedByStaff: {
          select: { displayName: true },
        },
      },
    });

    return mapDbRowToRecord(updated);
  }

  public static async convertToBugReport(
    fastify: FastifyInstance,
    id: number,
    actorStaffId: number
  ): Promise<{ bugReportId: number; key: string }> {
    if (!fastify.prisma?.crm) {
      throw new Error('Database không khả dụng');
    }

    const issue = await fastify.prisma.crm.crmFrontendIssue.findUnique({
      where: { id },
    });

    if (!issue) {
      const notFoundError = new Error('Không tìm thấy sự cố.');
      (notFoundError as unknown as { statusCode: number }).statusCode = 404;
      throw notFoundError;
    }

    const title = `[Hộp đen Frontend] ${issue.issueType}: ${issue.path}`.slice(0, 180);
    const description = `Sự cố phát hiện tự động bởi hệ thống Telemetry.
- Loại sự cố: ${issue.issueType}
- Vị trí: ${issue.path}
- Nút bấm / Vùng: ${issue.target || 'N/A'}
- Thông điệp: ${issue.message}
- Số lần lặp lại: ${issue.occurrenceCount} lần
- Lần đầu xuất hiện: ${issue.firstSeenAt.toISOString()}
- Lần gần nhất: ${issue.lastSeenAt.toISOString()}`;

    const searchNormalized = removeVietnameseTones(`${title} ${description} ${issue.path}`);

    const bugReport = await fastify.prisma.crm.$transaction(async (tx) => {
      const createdReport = await tx.crmBugReport.create({
        data: {
          reporterStaffId: actorStaffId,
          requestType: 'BUG',
          title,
          description,
          searchNormalized,
          status: 'NEW',
          priority: issue.issueType === 'REACT_CRASH' ? 'P0' : issue.issueType === 'API_FAILURE' ? 'P1' : 'P2',
          sourcePath: issue.path,
          contextJson: issue.latestPayloadJson || '{}',
        },
      });

      // Update issue status to INVESTIGATING
      await tx.crmFrontendIssue.update({
        where: { id },
        data: {
          status: 'INVESTIGATING',
          resolutionNotes: `Đã chuyển sang mOS Inbox (${formatBugReportKey(createdReport.id)})`,
        },
      });

      return createdReport;
    });

    return {
      bugReportId: bugReport.id,
      key: formatBugReportKey(bugReport.id),
    };
  }

  public static getSummaries(limit = 50): FrontendIssueSummary[] {
    const items = Array.from(inMemoryIssuesByFingerprint.values());
    items.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
    return items.slice(0, limit);
  }

  public static getRawIssues(limit = 50): FrontendIssuePayload[] {
    return inMemoryIssuesList.slice(0, limit);
  }

  public static clear(): void {
    inMemoryIssuesList.length = 0;
    inMemoryIssuesByFingerprint.clear();
  }
}
