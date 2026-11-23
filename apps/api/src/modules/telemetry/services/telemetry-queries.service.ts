import type { FastifyInstance } from 'fastify';
import type { Prisma } from '../../../generated/crm-client/index.js';
import {
  FRONTEND_ISSUE_CLUSTER_KEYS,
  FRONTEND_ISSUE_STATUSES,
  FRONTEND_ISSUE_TYPES,
  formatBugReportKey,
  type FrontendIssueClusterKey,
  type FrontendIssueListQuery,
  type FrontendIssueListResponse,
  type FrontendIssueMetrics,
  type FrontendIssuePayload,
  type FrontendIssueRecord,
  type FrontendIssueStatus,
  type FrontendIssueSyncResponse,
  type FrontendIssueType,
} from '@mos-lab/shared';
import { classifyIssueIntoCluster } from './telemetry-clusters.js';
import {
  buildMemoryFallbackMetrics,
  getMemoryIssueRecords,
  mapDbRowToRecord,
  recordIssueInMemory,
} from './telemetry-store.js';

const METRICS_AUTO_SYNC_COOLDOWN_MS = 60_000;
const metricsSyncStateByFastify = new WeakMap<
  FastifyInstance,
  { lastSyncAt: number; inFlight?: Promise<FrontendIssueSyncResponse> }
>();

export async function recordIssue(
  payload: FrontendIssuePayload,
  fastify?: FastifyInstance
): Promise<{ success: boolean; issueId: string }> {
  if (!payload || !payload.issueType || !payload.fingerprint) {
    return { success: false, issueId: '' };
  }

  // 1. Maintain in-memory ring buffer (fast & safe fallback)
  const { message } = recordIssueInMemory(payload);

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

export async function listIssues(
  fastify: FastifyInstance,
  query: FrontendIssueListQuery = {}
): Promise<FrontendIssueListResponse> {
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 25)));

  // Fallback if DB is not available
  if (!fastify.prisma?.crm) {
    const memoryItems = getMemoryIssueRecords();

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

  if (query.status && query.status !== 'ALL' && FRONTEND_ISSUE_STATUSES.includes(query.status as FrontendIssueStatus)) {
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

  if (query.userName && query.userName !== 'ALL') {
    where.lastUserName = query.userName;
  }

  let orderBy: Prisma.CrmFrontendIssueOrderByWithRelationInput[] = [{ lastSeenAt: 'desc' }];
  if (query.sortBy === 'occurrences') {
    orderBy = [{ occurrenceCount: 'desc' }, { lastSeenAt: 'desc' }];
  } else if (query.sortBy === 'id') {
    orderBy = [{ id: 'desc' }];
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
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    getMetrics(fastify),
  ]);

  return {
    data: rows.map(mapDbRowToRecord),
    metrics,
    total,
    page,
    limit,
  };
}

export async function syncResolvedClusters(
  fastify: FastifyInstance,
  skipMetricsFetch = false
): Promise<FrontendIssueSyncResponse> {
  if (!fastify.prisma?.crm) {
    return {
      syncedIssuesCount: 0,
      resolvedClustersCount: 0,
      message: 'Database CRM không khả dụng',
      metrics: buildMemoryFallbackMetrics(),
    };
  }

  // 1. Find all closed/resolved bug reports that correspond to clusters
  const clusterSourcePaths = FRONTEND_ISSUE_CLUSTER_KEYS.map((k) => `cluster:${k}`);
  const resolvedClusterReports = await fastify.prisma.crm.crmBugReport.findMany({
    where: {
      sourcePath: { in: clusterSourcePaths },
      status: { in: ['CLOSED', 'RESOLVED', 'AWAITING_REPORTER_ACCEPTANCE'] },
    },
    select: {
      id: true,
      sourcePath: true,
      status: true,
    },
    orderBy: { id: 'desc' },
  });

  const resolvedClusterKeys = new Set<FrontendIssueClusterKey>();
  const clusterReportKeyMap = new Map<FrontendIssueClusterKey, string>();
  for (const report of resolvedClusterReports) {
    const key = report.sourcePath.replace('cluster:', '') as FrontendIssueClusterKey;
    if (FRONTEND_ISSUE_CLUSTER_KEYS.includes(key) && !resolvedClusterKeys.has(key)) {
      resolvedClusterKeys.add(key);
      clusterReportKeyMap.set(key, formatBugReportKey(report.id));
    }
  }

  // 2. Query all frontend issues not yet RESOLVED
  const unresolvedIssues = await fastify.prisma.crm.crmFrontendIssue.findMany({
    where: {
      status: { not: 'RESOLVED' },
    },
    select: {
      id: true,
      issueType: true,
      path: true,
      target: true,
      message: true,
      resolutionNotes: true,
    },
  });

  const issueIdsToResolve: number[] = [];
  const issueMapNotes: { id: number; note: string }[] = [];
  const now = new Date();

  for (const issue of unresolvedIssues) {
    const clusterKey = classifyIssueIntoCluster(issue);
    if (resolvedClusterKeys.has(clusterKey)) {
      const ticketKey = clusterReportKeyMap.get(clusterKey) || 'MOS-BUG';
      issueIdsToResolve.push(issue.id);
      issueMapNotes.push({
        id: issue.id,
        note: `Đã dập tắt theo Ticket Cụm ${ticketKey} (${clusterKey})`,
      });
    }
  }

  // Check standalone issues referencing closed tickets (e.g. MOS-BUG-12)
  const standaloneIssues = unresolvedIssues.filter(
    (i) => !issueIdsToResolve.includes(i.id) && i.resolutionNotes?.includes('MOS-BUG-')
  );

  if (standaloneIssues.length > 0) {
    const ticketMap = new Map<number, number>();
    for (const issue of standaloneIssues) {
      const match = issue.resolutionNotes?.match(/MOS-BUG-(\d+)/);
      if (match && match[1]) {
        ticketMap.set(issue.id, parseInt(match[1], 10));
      }
    }

    if (ticketMap.size > 0) {
      const reportIds = Array.from(new Set(ticketMap.values()));
      const closedReports = await fastify.prisma.crm.crmBugReport.findMany({
        where: {
          id: { in: reportIds },
          status: { in: ['CLOSED', 'RESOLVED', 'AWAITING_REPORTER_ACCEPTANCE'] },
        },
        select: { id: true },
      });
      const closedSet = new Set(closedReports.map((r) => r.id));
      for (const [issueId, reportId] of ticketMap.entries()) {
        if (closedSet.has(reportId)) {
          issueIdsToResolve.push(issueId);
          issueMapNotes.push({
            id: issueId,
            note: `Đã dập tắt theo Ticket đơn lẻ ${formatBugReportKey(reportId)}`,
          });
        }
      }
    }
  }

  if (issueIdsToResolve.length > 0) {
    const noteById = new Map<number, string>();
    for (const item of issueMapNotes) {
      noteById.set(item.id, item.note);
    }

    const groupsByNote = new Map<string, number[]>();
    const idsWithoutNote: number[] = [];
    for (const id of issueIdsToResolve) {
      const note = noteById.get(id);
      if (note !== undefined) {
        const list = groupsByNote.get(note) ?? [];
        list.push(id);
        groupsByNote.set(note, list);
      } else {
        idsWithoutNote.push(id);
      }
    }

    const CHUNK_SIZE = 100;
    const updateBatches: Array<Promise<unknown>> = [];
    for (const [note, ids] of groupsByNote.entries()) {
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        updateBatches.push(
          fastify.prisma.crm.crmFrontendIssue.updateMany({
            where: { id: { in: chunk } },
            data: {
              status: 'RESOLVED',
              resolvedAt: now,
              resolutionNotes: note,
            },
          })
        );
      }
    }
    for (let i = 0; i < idsWithoutNote.length; i += CHUNK_SIZE) {
      const chunk = idsWithoutNote.slice(i, i + CHUNK_SIZE);
      updateBatches.push(
        fastify.prisma.crm.crmFrontendIssue.updateMany({
          where: { id: { in: chunk } },
          data: {
            status: 'RESOLVED',
            resolvedAt: now,
          },
        })
      );
    }

    await Promise.all(updateBatches);
  }

  const metrics = skipMetricsFetch ? ({} as FrontendIssueMetrics) : await getMetrics(fastify, true);
  const syncedIssuesCount = issueIdsToResolve.length;
  const resolvedClustersCount = resolvedClusterKeys.size;

  return {
    syncedIssuesCount,
    resolvedClustersCount,
    message: `Đã đồng bộ thành công ${syncedIssuesCount} sự cố con thuộc ${resolvedClustersCount} cụm đã giải quyết.`,
    metrics,
  };
}

export async function getMetrics(fastify: FastifyInstance, skipAutoSync = false): Promise<FrontendIssueMetrics> {
  if (!fastify.prisma?.crm) {
    return buildMemoryFallbackMetrics();
  }

  // Throttle auto-sync on the read path to avoid full unresolved scans/writes per request.
  if (!skipAutoSync) {
    const syncState = metricsSyncStateByFastify.get(fastify) ?? { lastSyncAt: 0 };
    const nowMs = Date.now();
    if (syncState.inFlight) {
      await syncState.inFlight.catch(() => undefined);
    } else if (nowMs - syncState.lastSyncAt >= METRICS_AUTO_SYNC_COOLDOWN_MS) {
      const syncPromise = syncResolvedClusters(fastify, true).finally(() => {
        const current = metricsSyncStateByFastify.get(fastify);
        if (current?.inFlight === syncPromise) {
          current.inFlight = undefined;
        }
      });
      syncState.lastSyncAt = nowMs;
      syncState.inFlight = syncPromise;
      metricsSyncStateByFastify.set(fastify, syncState);
      try {
        await syncPromise;
      } catch (err) {
        fastify.log.warn({ err }, 'Auto-syncing resolved clusters in getMetrics failed non-fatally');
      }
    }
  }

  const [counts, aggregateHits, resolvedHits, clusterBugReports, userGroups] = await Promise.all([
    fastify.prisma.crm.crmFrontendIssue.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    fastify.prisma.crm.crmFrontendIssue.aggregate({
      _sum: { occurrenceCount: true },
    }),
    fastify.prisma.crm.crmFrontendIssue.aggregate({
      where: { status: 'RESOLVED' },
      _sum: { occurrenceCount: true },
    }),
    fastify.prisma.crm.crmBugReport.findMany({
      where: {
        sourcePath: { in: FRONTEND_ISSUE_CLUSTER_KEYS.map((k) => `cluster:${k}`) },
        status: { not: 'REJECTED' },
      },
      select: {
        sourcePath: true,
        status: true,
      },
      orderBy: { id: 'desc' },
    }),
    fastify.prisma.crm.crmFrontendIssue.groupBy({
      by: ['lastUserName'],
      _count: { id: true },
      _sum: { occurrenceCount: true },
      orderBy: { _sum: { occurrenceCount: 'desc' } },
    }),
  ]);

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

  // Cluster resolution calculation
  const clusterStatusMap = new Map<string, string>();
  for (const br of clusterBugReports) {
    const clusterKey = br.sourcePath.replace('cluster:', '');
    if (!clusterStatusMap.has(clusterKey)) {
      clusterStatusMap.set(clusterKey, br.status);
    }
  }

  const totalClusters = FRONTEND_ISSUE_CLUSTER_KEYS.length;
  let resolvedClusters = 0;
  let dispatchedClusters = 0;

  for (const key of FRONTEND_ISSUE_CLUSTER_KEYS) {
    const status = clusterStatusMap.get(key);
    if (status) {
      dispatchedClusters++;
      if (['CLOSED', 'RESOLVED', 'AWAITING_REPORTER_ACCEPTANCE'].includes(status)) {
        resolvedClusters++;
      }
    }
  }

  const openClusters = totalClusters - resolvedClusters;
  const clusterResolutionRate = totalClusters > 0 ? Math.round((resolvedClusters / totalClusters) * 100) : 0;

  const totalOccurrences = aggregateHits._sum.occurrenceCount || 0;
  const extinguishedOccurrences = resolvedHits._sum.occurrenceCount || 0;
  const trafficExtinguishmentRate =
    totalOccurrences > 0 ? Math.round((extinguishedOccurrences / totalOccurrences) * 100) : 0;

  const userStats = userGroups
    .filter((g) => g.lastUserName)
    .map((g) => ({
      userName: g.lastUserName!,
      issueCount: g._count.id,
      occurrenceCount: g._sum.occurrenceCount || 0,
    }));

  return {
    totalCount,
    newCount,
    investigatingCount,
    resolvedCount,
    reopenedCount,
    ignoredCount,
    resolutionRate,
    totalClusters,
    resolvedClusters,
    dispatchedClusters,
    openClusters,
    clusterResolutionRate,
    totalOccurrences,
    extinguishedOccurrences,
    trafficExtinguishmentRate,
    userStats,
  };
}

export async function updateIssueStatus(
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
