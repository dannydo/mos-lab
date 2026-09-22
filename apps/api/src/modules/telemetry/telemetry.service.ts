import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Prisma } from '../../generated/crm-client/index.js';
import {
  FRONTEND_ISSUE_CLUSTER_KEYS,
  FRONTEND_ISSUE_STATUSES,
  FRONTEND_ISSUE_TYPES,
  formatBugReportKey,
  removeVietnameseTones,
  type FrontendIssueAgAnalysis,
  type FrontendIssueAgDispatchResponse,
  type FrontendIssueCluster,
  type FrontendIssueClusterDispatchResponse,
  type FrontendIssueClusterKey,
  type FrontendIssueClusterListResponse,
  type FrontendIssueListQuery,
  type FrontendIssueListResponse,
  type FrontendIssueMetrics,
  type FrontendIssuePayload,
  type FrontendIssueRecord,
  type FrontendIssueStatus,
  type FrontendIssueSummary,
  type FrontendIssueSyncResponse,
  type FrontendIssueType,
  type InboxPlanDraft,
} from '@mos-lab/shared';
import { InboxImplementationService } from '../bug-reports/inbox-implementation.service.js';
import {
  inboxImplementationPlanVersion,
  inboxImplementationSourceVersion,
} from '../bug-reports/inbox-implementation-version.js';
import { inboxPlanEventVersion } from '../bug-reports/inbox-plan.service.js';

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

interface ClusterMetadata {
  clusterKey: FrontendIssueClusterKey;
  title: string;
  severity: 'P0' | 'P1' | 'P2';
  description: string;
  rootCause: string;
  affectedFiles: string[];
  proposedFixSteps: string[];
}

export const CLUSTER_METADATA: Record<FrontendIssueClusterKey, ClusterMetadata> = {
  POLLING_SLOW_API: {
    clusterKey: 'POLLING_SLOW_API',
    title: 'Tối ưu hóa Database Indexing & Cache SWR cho các API Polling ngốn tài nguyên',
    severity: 'P0',
    description:
      'Các endpoint polling định kỳ (/bug-reports/mine, /calls/daily, /staff, /allocation, /cv-realtime-status) phản hồi chậm 3000ms - 9000ms, chiếm hơn 58% tổng số lượt nghẽn mạng và làm chậm toàn bộ hệ thống.',
    rootCause:
      'Thiếu composite index trên crmBugReport & order_service, payload trả về quá lớn, các component con gọi lặp đi lặp lại không có SWR cache 30s-60s.',
    affectedFiles: [
      'apps/api/src/modules/bug-report/bug-report.service.ts',
      'apps/api/src/modules/call/call.service.ts',
      'apps/api/src/modules/staff/staff.service.ts',
      'apps/web/lib/api-client.ts',
    ],
    proposedFixSteps: [
      'Thêm composite index (reporterStaffId, status, createdAt) trong schema Prisma CRM.',
      'Prune các trường relations include không cần thiết trong API GET /bug-reports/mine và GET /calls/daily.',
      'Tích hợp SWR / React Query cache 30s phía Web Client cho danh mục /staff và realtime polling.',
    ],
  },
  RAGE_CLICK_CALL_LOG: {
    clusterKey: 'RAGE_CLICK_CALL_LOG',
    title: 'Thiết kế nút Lưu Nhanh & Chống Click Liên Tục tại Modal Nhật Ký Cuộc Gọi Telesales',
    severity: 'P0',
    description:
      'Nhân viên telesales (Tâm Nguyễn, Thanh Vũ) bấm liên tiếp vào ô ghi chú "Gọi nhỡ - Không trả lời" trong CallLogModal do textarea không phản hồi tức thì.',
    rootCause:
      'Textarea trong CallLogModal không có phím tắt nhanh, nhân viên phải click nhiều lần để chọn focus hoặc submit khi mạng chậm.',
    affectedFiles: [
      'apps/web/app/dashboard/telesales/components/CallLogModal.tsx',
      'apps/web/app/dashboard/telesales/components/CallHistoryDrawer.tsx',
    ],
    proposedFixSteps: [
      'Bổ sung nút Quick Tag 1-click "Ghi nhanh: Gọi nhỡ" tự động điền và lưu ngay.',
      'Tự động auto-focus vào textarea khi mở modal.',
      'Bổ sung hiệu ứng loading spinner và debounce submit nút Lưu để chống double click.',
    ],
  },
  WEBRTC_SDK_CRASH: {
    clusterKey: 'WEBRTC_SDK_CRASH',
    title: 'Khắc phục Lỗi Khởi Tạo SDK OmiCall (core.min.js) & Import Vòng cleanupOmiCallMediaBridge',
    severity: 'P0',
    description:
      'Tổng đài OmiCall ném ngoại lệ Uncaught Error: SDK not initialized trong core.min.js và TypeError: cleanupOmiCallMediaBridge is not a function.',
    rootCause:
      'Component gọi hàm WebRTC trước khi StringeeClient hoàn tất connect, kèm theo circular re-export giữa mediaBridge.ts và useSipConnection.ts.',
    affectedFiles: [
      'apps/web/context/omicall/OmiCallProvider.tsx',
      'apps/web/context/omicall/useSipConnection.ts',
      'apps/web/context/omicall/mediaBridge.ts',
    ],
    proposedFixSteps: [
      'Bổ sung cờ isSdkReady và hàng đợi cuộc gọi trước khi StringeeClient sẵn sàng.',
      'Import trực tiếp cleanupOmiCallMediaBridge từ mediaBridge.ts, loại bỏ import vòng.',
      'Bổ sung defensive check typeof cleanupOmiCallMediaBridge === "function".',
    ],
  },
  OTHER_SLOW_INTERACTION: {
    clusterKey: 'OTHER_SLOW_INTERACTION',
    title: 'Giải Phóng Nghẽn Pool Kết Nối & Tối Ưu Hóa Phản Hồi Cho Các Trang Thứ Cấp',
    severity: 'P1',
    description:
      'Các tương tác và truy vấn thứ cấp bị trễ do hàng đợi kết nối HTTP của trình duyệt bị chiếm dụng bởi các API polling nặng.',
    rootCause:
      'Trình duyệt chỉ mở tối đa 6 kết nối HTTP đồng thời tới cùng một domain. Khi các API polling chiếm hết 6 slot, các thao tác khác của người dùng bị xếp hàng chờ (head-of-line blocking).',
    affectedFiles: ['apps/web/lib/api-client.ts', 'apps/api/src/modules/customer/customer.service.ts'],
    proposedFixSteps: [
      'Phân luồng ưu tiên cho các request tương tác người dùng so với polling ngầm.',
      'Tăng timeout hợp lý và hủy bỏ (AbortController) các request polling cũ khi có request mới.',
      'Nâng cấp HTTP/2 trên Nginx VPS để hỗ trợ multiplexing không giới hạn kết nối.',
    ],
  },
  OTHER_UI_RAGE_CLICK: {
    clusterKey: 'OTHER_UI_RAGE_CLICK',
    title: 'Tự Động Tải Lại Khi Đổi Chunk Bản Mới (ChunkLoadError) & Cải Thiện Độ Nhạy Nút Bấm UI',
    severity: 'P2',
    description:
      'Ghi nhận các lần click dồn dập rải rác và lỗi ChunkLoadError khi người dùng thao tác trong thời điểm VPS vừa deploy bản build mới.',
    rootCause:
      'Hash chunk JS cũ trên trình duyệt không còn tồn tại trên server sau khi build mới, gây sập component nếu không tự reload.',
    affectedFiles: ['apps/web/app/layout.tsx', 'apps/web/components/telemetry/FrontendTelemetryProvider.tsx'],
    proposedFixSteps: [
      'Bắt sự kiện ChunkLoadError ở window error handler và tự động reload trang 1 lần.',
      'Bổ sung active feedback (nhấp nháy / active scale) cho các nút bấm hành động.',
      'Cấu hình cache-control phù hợp cho static chunks.',
    ],
  },
};

export function classifyIssueIntoCluster(issue: {
  id?: number;
  issueType: string;
  path: string;
  target?: string | null;
  message: string;
}): FrontendIssueClusterKey {
  const target = (issue.target || '').toLowerCase();
  const message = (issue.message || '').toLowerCase();
  const path = (issue.path || '').toLowerCase();

  // 1. WebRTC & SDK Crash (P0)
  if (
    message.includes('sdk not initialized') ||
    message.includes('cleanupomicallmediabridge') ||
    message.includes('stringee') ||
    (issue.issueType === 'UNCAUGHT_EXCEPTION' && (target.includes('omicall') || message.includes('omicall')))
  ) {
    return 'WEBRTC_SDK_CRASH';
  }

  // 2. Call Log Rage Click (P0)
  if (
    issue.issueType === 'RAGE_CLICK' &&
    (target.includes('textarea') ||
      target.includes('gọi nhỡ') ||
      target.includes('call') ||
      path.includes('/telesales') ||
      path.includes('/calls'))
  ) {
    return 'RAGE_CLICK_CALL_LOG';
  }

  // 3. Polling Heavy Slow API (P0)
  if (
    target.includes('/bug-reports/mine') ||
    target.includes('/calls/daily') ||
    target.includes('/staff') ||
    target.includes('/cv-realtime-status') ||
    target.includes('/allocation') ||
    message.includes('/bug-reports/mine') ||
    message.includes('/calls/daily') ||
    message.includes('/staff') ||
    message.includes('/cv-realtime-status') ||
    message.includes('/allocation')
  ) {
    return 'POLLING_SLOW_API';
  }

  // 4. Other Slow Interaction (P1)
  if (issue.issueType === 'SLOW_INTERACTION' || issue.issueType === 'API_FAILURE') {
    return 'OTHER_SLOW_INTERACTION';
  }

  // 5. Remaining UI rage clicks, React crashes, blocked submits (P2)
  return 'OTHER_UI_RAGE_CLICK';
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

  public static async syncResolvedClusters(
    fastify: FastifyInstance,
    skipMetricsFetch = false
  ): Promise<FrontendIssueSyncResponse> {
    if (!fastify.prisma?.crm) {
      const fallbackMetrics: FrontendIssueMetrics = {
        totalCount: inMemoryIssuesByFingerprint.size,
        newCount: inMemoryIssuesByFingerprint.size,
        investigatingCount: 0,
        resolvedCount: 0,
        reopenedCount: 0,
        ignoredCount: 0,
        resolutionRate: 0,
        totalClusters: FRONTEND_ISSUE_CLUSTER_KEYS.length,
        resolvedClusters: 0,
        dispatchedClusters: 0,
        openClusters: FRONTEND_ISSUE_CLUSTER_KEYS.length,
        clusterResolutionRate: 0,
        totalOccurrences: 0,
        extinguishedOccurrences: 0,
        trafficExtinguishmentRate: 0,
        userStats: [],
      };
      return {
        syncedIssuesCount: 0,
        resolvedClustersCount: 0,
        message: 'Database CRM không khả dụng',
        metrics: fallbackMetrics,
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
      const CHUNK_SIZE = 100;
      for (let i = 0; i < issueIdsToResolve.length; i += CHUNK_SIZE) {
        const chunk = issueIdsToResolve.slice(i, i + CHUNK_SIZE);
        await fastify.prisma.crm.crmFrontendIssue.updateMany({
          where: { id: { in: chunk } },
          data: {
            status: 'RESOLVED',
            resolvedAt: now,
          },
        });
      }

      for (const item of issueMapNotes) {
        await fastify.prisma.crm.crmFrontendIssue
          .update({
            where: { id: item.id },
            data: { resolutionNotes: item.note },
          })
          .catch(() => {});
      }
    }

    const metrics = skipMetricsFetch ? ({} as FrontendIssueMetrics) : await this.getMetrics(fastify, true);
    const syncedIssuesCount = issueIdsToResolve.length;
    const resolvedClustersCount = resolvedClusterKeys.size;

    return {
      syncedIssuesCount,
      resolvedClustersCount,
      message: `Đã đồng bộ thành công ${syncedIssuesCount} sự cố con thuộc ${resolvedClustersCount} cụm đã giải quyết.`,
      metrics,
    };
  }

  public static async getMetrics(fastify: FastifyInstance, skipAutoSync = false): Promise<FrontendIssueMetrics> {
    if (!fastify.prisma?.crm) {
      return {
        totalCount: inMemoryIssuesByFingerprint.size,
        newCount: inMemoryIssuesByFingerprint.size,
        investigatingCount: 0,
        resolvedCount: 0,
        reopenedCount: 0,
        ignoredCount: 0,
        resolutionRate: 0,
        totalClusters: FRONTEND_ISSUE_CLUSTER_KEYS.length,
        resolvedClusters: 0,
        dispatchedClusters: 0,
        openClusters: FRONTEND_ISSUE_CLUSTER_KEYS.length,
        clusterResolutionRate: 0,
        totalOccurrences: 0,
        extinguishedOccurrences: 0,
        trafficExtinguishmentRate: 0,
        userStats: [],
      };
    }

    // Auto-sync resolved clusters on metrics retrieval to ensure 100% data freshness
    if (!skipAutoSync) {
      try {
        await this.syncResolvedClusters(fastify, true);
      } catch (err) {
        fastify.log.warn({ err }, 'Auto-syncing resolved clusters in getMetrics failed non-fatally');
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

  public static async agAnalyze(fastify: FastifyInstance, id: number): Promise<FrontendIssueAgAnalysis> {
    if (!fastify.prisma?.crm) {
      throw new Error('Database không khả dụng');
    }

    const issue = await fastify.prisma.crm.crmFrontendIssue.findUnique({
      where: { id },
    });

    if (!issue) {
      const notFoundError = new Error('Không tìm thấy sự cố telemetry.');
      (notFoundError as unknown as { statusCode: number }).statusCode = 404;
      throw notFoundError;
    }

    const record = mapDbRowToRecord(issue);
    return generateAgAnalysis(record);
  }

  public static async agDispatch(
    fastify: FastifyInstance,
    id: number,
    actorStaffId: number
  ): Promise<FrontendIssueAgDispatchResponse> {
    if (!fastify.prisma?.crm) {
      throw new Error('Database không khả dụng');
    }

    const issue = await fastify.prisma.crm.crmFrontendIssue.findUnique({
      where: { id },
    });

    if (!issue) {
      const notFoundError = new Error('Không tìm thấy sự cố telemetry.');
      (notFoundError as unknown as { statusCode: number }).statusCode = 404;
      throw notFoundError;
    }

    // 1. Generate full AG analysis
    const record = mapDbRowToRecord(issue);
    const analysis = generateAgAnalysis(record);

    // 2. Format bug report fields
    const title = `[AG Telemetry] ${analysis.title}`.slice(0, 180);
    const description = `### 🤖 Antigravity AI Telemetry Incident Triage

**Định danh sự cố (Fingerprint):** \`${issue.fingerprint}\`
**Thể loại sự cố:** \`${issue.issueType}\`
**Vị trí phát sinh:** \`${issue.path}\` ${issue.target ? `↳ \`${issue.target}\`` : ''}
**Số lần lặp lại:** **${issue.occurrenceCount} lần** (Lần đầu: ${issue.firstSeenAt.toISOString()}, Gần nhất: ${issue.lastSeenAt.toISOString()})
**Người dùng gần nhất:** ${issue.lastUserName || 'N/A'}

---

### 🧠 Nguyên nhân cốt lõi (Root Cause)
${analysis.rootCause}

---

### 📁 Tệp mã nguồn liên quan (Affected Code Files)
${analysis.affectedFiles.map((f) => `- \`${f}\``).join('\n')}

---

### 🛠️ Kế hoạch Khắc phục Kỹ thuật (Action Plan)
${analysis.proposedFix.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

---

### ⚠️ Đánh giá Rủi ro & Thời gian Ước tính
- **Mức độ ưu tiên:** \`${analysis.severity}\`
- **Đánh giá rủi ro:** ${analysis.riskAssessment}
- **Thời gian ước tính:** ${analysis.estimatedEffort}
`;

    const searchNormalized = removeVietnameseTones(`${title} ${description} ${issue.path}`);

    // 3. Create bug report and register initial plan in transaction
    const bugReport = await fastify.prisma.crm.$transaction(async (tx) => {
      const createdReport = await tx.crmBugReport.create({
        data: {
          reporterStaffId: actorStaffId,
          requestType: 'BUG',
          title,
          description,
          searchNormalized,
          status: 'APPROVED',
          priority: analysis.severity,
          clarificationStatus: 'READY',
          clarificationSummary: `AG Tự động Phân tích từ Telemetry: ${analysis.rootCause}`.slice(0, 1200),
          approvedByStaffId: actorStaffId,
          approvedAt: new Date(),
          sourcePath: issue.path,
          contextJson: issue.latestPayloadJson || '{}',
        },
      });

      // Register initial native plan job so InboxImplementationService can immediately approve
      const planJobId = randomUUID();
      const eventKind = 'IMPLEMENTATION_APPROVAL';
      const eventVersion = inboxPlanEventVersion(
        {
          ...createdReport,
          comments: [],
        },
        eventKind
      );
      const sourceVersion = inboxImplementationSourceVersion({
        ...createdReport,
        comments: [],
      });
      const planDraft: InboxPlanDraft = {
        evidence: `Sự cố phát hiện qua Hộp đen Telemetry: ${issue.fingerprint} trên ${issue.path}`,
        expectedOutcome: analysis.title,
        scope: analysis.affectedFiles.join(', '),
        steps: analysis.proposedFix,
        verification: 'pnpm verify:quick && pnpm check:ui-contract',
        risksAndRollback: analysis.riskAssessment,
        approvalRequest: 'Danny phê duyệt tự động từ Telemetry Drawer để AG triển khai bản vá.',
      };
      const planVersion = inboxImplementationPlanVersion(sourceVersion, planDraft);

      await tx.crmInboxPlanJob.create({
        data: {
          id: planJobId,
          reportId: createdReport.id,
          eventKind,
          eventVersion,
          status: 'COMPLETED',
          resultAction: 'POST_PLAN',
          sourceVersion,
          planVersion,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });

      // Update telemetry issue status to INVESTIGATING
      await tx.crmFrontendIssue.update({
        where: { id },
        data: {
          status: 'INVESTIGATING',
          resolutionNotes: `Đã duyệt & giao AG xử lý tự động (${formatBugReportKey(createdReport.id)})`,
        },
      });

      return createdReport;
    });

    // 4. Authorize AG implementation handoff
    await InboxImplementationService.approve(fastify, bugReport.id, actorStaffId, undefined, 'AG');

    // Retrieve updated report for handoff reference
    const updatedReport = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: bugReport.id },
      select: { status: true, implementationActiveJobId: true },
    });

    const key = formatBugReportKey(bugReport.id);
    const handoffReference = updatedReport?.implementationActiveJobId || null;

    return {
      bugReportId: bugReport.id,
      key,
      status: updatedReport?.status || 'APPROVED',
      progressStage: 'AWAITING_IDE_HANDOFF',
      handoffReference,
      message: `Đã duyệt và giao cho Antigravity (AG)! Ticket ${key} đang sẵn sàng chờ AG nhận handoff và triển khai bản vá.`,
    };
  }

  public static async getClusters(fastify: FastifyInstance): Promise<FrontendIssueClusterListResponse> {
    // 1. Retrieve all issues
    let issues: Array<{
      id: number;
      issueType: string;
      path: string;
      target: string | null;
      message: string;
      occurrenceCount: number;
      status: string;
    }>;

    if (fastify.prisma?.crm) {
      issues = await fastify.prisma.crm.crmFrontendIssue.findMany({
        select: {
          id: true,
          issueType: true,
          path: true,
          target: true,
          message: true,
          occurrenceCount: true,
          status: true,
        },
        orderBy: { occurrenceCount: 'desc' },
      });
    } else {
      issues = Array.from(inMemoryIssuesByFingerprint.values()).map((item, idx) => ({
        id: idx + 1,
        issueType: item.issueType,
        path: item.path,
        target: null,
        message: item.message,
        occurrenceCount: item.occurrenceCount,
        status: 'NEW',
      }));
    }

    // 2. Map existing active bug reports for clusters
    const dispatchedReportsByClusterKey = new Map<string, { id: number; key: string; status: string }>();

    if (fastify.prisma?.crm) {
      const clusterSourcePaths = FRONTEND_ISSUE_CLUSTER_KEYS.map((k) => `cluster:${k}`);
      const bugReports = await fastify.prisma.crm.crmBugReport.findMany({
        where: {
          sourcePath: { in: clusterSourcePaths },
          status: { not: 'REJECTED' },
        },
        select: {
          id: true,
          sourcePath: true,
          status: true,
        },
        orderBy: { id: 'desc' },
      });

      for (const br of bugReports) {
        const clusterKey = br.sourcePath.replace('cluster:', '');
        if (!dispatchedReportsByClusterKey.has(clusterKey)) {
          dispatchedReportsByClusterKey.set(clusterKey, {
            id: br.id,
            key: formatBugReportKey(br.id),
            status: br.status,
          });
        }
      }
    }

    // 3. Partition issues by cluster
    const clusterBuckets = new Map<FrontendIssueClusterKey, typeof issues>();
    for (const key of FRONTEND_ISSUE_CLUSTER_KEYS) {
      clusterBuckets.set(key, []);
    }

    for (const issue of issues) {
      const clusterKey = classifyIssueIntoCluster(issue);
      clusterBuckets.get(clusterKey)?.push(issue);
    }

    // 4. Build cluster models
    const clusters: FrontendIssueCluster[] = FRONTEND_ISSUE_CLUSTER_KEYS.map((key) => {
      const meta = CLUSTER_METADATA[key];
      const clusterIssues = clusterBuckets.get(key) || [];
      const totalOccurrences = clusterIssues.reduce((sum, item) => sum + item.occurrenceCount, 0);
      const issueIds = clusterIssues.map((item) => item.id);
      const sampleIssues = clusterIssues.slice(0, 5).map((item) => ({
        id: item.id,
        message: item.message,
        path: item.path,
        target: item.target,
        occurrenceCount: item.occurrenceCount,
      }));

      const dispatchedBugReport = dispatchedReportsByClusterKey.get(key) || null;
      const isResolved = dispatchedBugReport
        ? ['CLOSED', 'RESOLVED', 'AWAITING_REPORTER_ACCEPTANCE'].includes(dispatchedBugReport.status)
        : false;
      const resolvedIssueCount = clusterIssues.filter((item) => item.status === 'RESOLVED').length;
      const resolvedOccurrences = clusterIssues
        .filter((item) => item.status === 'RESOLVED')
        .reduce((sum, item) => sum + item.occurrenceCount, 0);

      return {
        clusterKey: key,
        title: meta.title,
        severity: meta.severity,
        description: meta.description,
        rootCause: meta.rootCause,
        affectedFiles: meta.affectedFiles,
        proposedFixSteps: meta.proposedFixSteps,
        issueCount: clusterIssues.length,
        totalOccurrences,
        issueIds,
        sampleIssues,
        dispatchedBugReport,
        isResolved,
        resolvedIssueCount,
        resolvedOccurrences,
      };
    });

    const totalIssuesClustered = issues.length;
    const totalOccurrences = clusters.reduce((sum, c) => sum + c.totalOccurrences, 0);
    const dispatchedClusters = clusters.filter((c) => c.dispatchedBugReport !== null).length;
    const resolvedClusters = clusters.filter((c) => c.isResolved).length;
    const extinguishedOccurrences = clusters.reduce((sum, c) => sum + (c.resolvedOccurrences || 0), 0);
    const extinguishmentRate =
      totalOccurrences > 0 ? Math.round((extinguishedOccurrences / totalOccurrences) * 100) : 0;

    return {
      clusters,
      summary: {
        totalClusters: clusters.length,
        totalIssuesClustered,
        totalOccurrences,
        dispatchedClusters,
        resolvedClusters,
        extinguishedOccurrences,
        extinguishmentRate,
      },
    };
  }

  public static async dispatchCluster(
    fastify: FastifyInstance,
    clusterKey: FrontendIssueClusterKey,
    actorStaffId: number
  ): Promise<FrontendIssueClusterDispatchResponse> {
    if (!FRONTEND_ISSUE_CLUSTER_KEYS.includes(clusterKey)) {
      throw new Error(`Mã cụm không hợp lệ: ${clusterKey}`);
    }

    if (!fastify.prisma?.crm) {
      throw new Error('Database CRM không khả dụng để gom cụm và giao AG');
    }

    const meta = CLUSTER_METADATA[clusterKey];

    // Check if cluster is already dispatched to an active ticket
    const existingBugReport = await fastify.prisma.crm.crmBugReport.findFirst({
      where: {
        sourcePath: `cluster:${clusterKey}`,
        status: { notIn: ['REJECTED', 'CLOSED'] },
      },
      orderBy: { id: 'desc' },
    });

    if (existingBugReport) {
      const key = formatBugReportKey(existingBugReport.id);
      return {
        clusterKey,
        bugReportId: existingBugReport.id,
        key,
        status: existingBugReport.status,
        progressStage: 'AWAITING_IDE_HANDOFF',
        dispatchedIssueCount: 0,
        message: `Cụm ${clusterKey} đã được phê duyệt trước đó và đang trong tiến trình xử lý (${key}).`,
      };
    }

    // Get all issues in this cluster
    const allIssues = await fastify.prisma.crm.crmFrontendIssue.findMany({
      select: {
        id: true,
        issueType: true,
        path: true,
        target: true,
        message: true,
        occurrenceCount: true,
      },
      orderBy: { occurrenceCount: 'desc' },
    });

    const clusterIssues = allIssues.filter((i) => classifyIssueIntoCluster(i) === clusterKey);
    const clusterIssueIds = clusterIssues.map((i) => i.id);
    const totalHits = clusterIssues.reduce((sum, i) => sum + i.occurrenceCount, 0);
    const sampleIssues = clusterIssues.slice(0, 5);

    const title = `[AG Cụm ${meta.severity}] ${meta.title}`.slice(0, 180);
    const description = `## 🗂️ Báo Cáo Gom Cụm Sự Cố Telemetry: ${meta.title}
- **Mã Cụm:** \`${clusterKey}\`
- **Mức độ Ưu tiên:** \`${meta.severity}\`
- **Quy mô Sự cố:** ${clusterIssues.length} sự cố telemetry (${totalHits.toLocaleString('vi-VN')} lượt gặp phải trong vận hành)
- **Thời điểm duyệt:** ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
- **Người phê duyệt:** Staff #${actorStaffId}

---

### 🔍 Nguyên Nhân Gốc Rễ (Root Cause)
${meta.rootCause}

---

### 📁 Tệp Tin Phạm Vi Xử Lý (Scope)
${meta.affectedFiles.map((f) => `- \`${f}\``).join('\n')}

---

### 🛠️ Kế Hoạch Khắc Phục Kỹ Thuật (Action Plan)
${meta.proposedFixSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

---

### 📋 Mẫu Các Sự Cố Tiêu Biểu Trong Cụm (${sampleIssues.length}/${clusterIssues.length})
${sampleIssues.map((s) => `- **Sự cố #${s.id}** (${s.occurrenceCount} lượt) tại \`${s.path}\`: ${s.message}`).join('\n')}
`;

    const searchNormalized = removeVietnameseTones(`${title} ${meta.rootCause} ${clusterKey}`);

    // Create single bug report and native plan in transaction
    const bugReport = await fastify.prisma.crm.$transaction(async (tx) => {
      const createdReport = await tx.crmBugReport.create({
        data: {
          reporterStaffId: actorStaffId,
          requestType: 'BUG',
          title,
          description,
          searchNormalized,
          status: 'APPROVED',
          priority: meta.severity,
          clarificationStatus: 'READY',
          clarificationSummary: `AG Gom Cụm Telemetry [${clusterKey}]: ${meta.rootCause}`.slice(0, 1200),
          approvedByStaffId: actorStaffId,
          approvedAt: new Date(),
          sourcePath: `cluster:${clusterKey}`,
          contextJson: JSON.stringify({
            clusterKey,
            issueCount: clusterIssues.length,
            totalHits,
            issueIds: clusterIssueIds.slice(0, 50),
          }),
        },
      });

      // Register initial native plan job
      const planJobId = randomUUID();
      const eventKind = 'IMPLEMENTATION_APPROVAL';
      const eventVersion = inboxPlanEventVersion(
        {
          ...createdReport,
          comments: [],
        },
        eventKind
      );
      const sourceVersion = inboxImplementationSourceVersion({
        ...createdReport,
        comments: [],
      });
      const planDraft: InboxPlanDraft = {
        evidence: `Gom cụm tự động 5 Cụm Telemetry: ${clusterKey} gồm ${clusterIssues.length} sự cố (${totalHits} hits).`,
        expectedOutcome: meta.title,
        scope: meta.affectedFiles.join(', '),
        steps: meta.proposedFixSteps,
        verification: 'pnpm verify:quick && pnpm check:ui-contract',
        risksAndRollback: 'Khắc phục tận gốc không gây regression.',
        approvalRequest: 'Danny phê duyệt gom cụm từ Telemetry Drawer để AG xử lý tập trung.',
      };
      const planVersion = inboxImplementationPlanVersion(sourceVersion, planDraft);

      await tx.crmInboxPlanJob.create({
        data: {
          id: planJobId,
          reportId: createdReport.id,
          eventKind,
          eventVersion,
          status: 'COMPLETED',
          resultAction: 'POST_PLAN',
          sourceVersion,
          planVersion,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });

      // Batch update all child telemetry issues to INVESTIGATING
      if (clusterIssueIds.length > 0) {
        const key = formatBugReportKey(createdReport.id);
        await tx.crmFrontendIssue.updateMany({
          where: { id: { in: clusterIssueIds } },
          data: {
            status: 'INVESTIGATING',
            resolutionNotes: `Đã gom cụm & giao AG xử lý tự động (${key})`,
          },
        });
      }

      return createdReport;
    });

    // Authorize implementation handoff to AG
    await InboxImplementationService.approve(fastify, bugReport.id, actorStaffId, undefined, 'AG');

    const key = formatBugReportKey(bugReport.id);

    return {
      clusterKey,
      bugReportId: bugReport.id,
      key,
      status: 'APPROVED',
      progressStage: 'AWAITING_IDE_HANDOFF',
      dispatchedIssueCount: clusterIssueIds.length,
      message: `Đã gom ${clusterIssueIds.length} sự cố thành 1 ticket duy nhất (${key}) và giao AG tự động xử lý!`,
    };
  }

  public static async batchDispatchPriorityClusters(
    fastify: FastifyInstance,
    actorStaffId: number
  ): Promise<FrontendIssueClusterDispatchResponse[]> {
    const priorityClusters: FrontendIssueClusterKey[] = ['POLLING_SLOW_API', 'RAGE_CLICK_CALL_LOG', 'WEBRTC_SDK_CRASH'];

    const results: FrontendIssueClusterDispatchResponse[] = [];
    for (const key of priorityClusters) {
      const res = await FrontendTelemetryService.dispatchCluster(fastify, key, actorStaffId);
      results.push(res);
    }
    return results;
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

export function generateAgAnalysis(issue: FrontendIssueRecord): FrontendIssueAgAnalysis {
  const target = (issue.target || '').toLowerCase();
  const path = issue.path || '';
  const message = issue.message || '';
  const errorName = issue.latestPayload?.error?.name || '';

  // 1. Check RAGE_CLICK
  if (issue.issueType === 'RAGE_CLICK') {
    if (
      target.includes('gọi nhỡ') ||
      target.includes('textarea') ||
      path.includes('/nyc') ||
      path.includes('/customers')
    ) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Trải nghiệm Booker / Call Wrapup UX',
        title: 'Tối ưu trải nghiệm lưu nhanh cuộc gọi nhỡ và triệt tiêu Rage Click textarea',
        rootCause: `Booker thao tác kết thúc cuộc gọi nhỡ và thấy modal tự động điền "Gọi nhỡ - Không trả lời" vào ô ghi chú. Do thiếu nút bấm xác nhận 1-click hoặc phản hồi trực quan tức thì, người dùng click dồn dập vào textarea (${issue.occurrenceCount} lần) để cố gắng lưu hoặc sao chép nội dung.`,
        affectedComponents: ['CallLogModal', 'CallLogForm', 'Antd.TextArea'],
        affectedFiles: ['apps/web/components/CallLogModal.tsx', 'apps/web/context/omicall/OmiCallProvider.tsx'],
        proposedFix: [
          'Bổ sung nút bấm to rõ "⚡ Lưu Nhanh Gọi Nhỡ (1-Click)" trong CallLogModal.tsx để tự động lưu và đóng modal ngay mà không cần chạm vào ô ghi chú.',
          'Thêm tooltip thông báo và hiệu ứng highlight/lock focus nhẹ trên textarea để nhân viên không click vô thức.',
          'Tối ưu hóa thời gian hiển thị thông báo lưu thành công (<100ms) để phản hồi tức thì cho người dùng.',
        ],
        riskAssessment: 'Thấp. Chỉ tác động giao diện CallLogModal, không ảnh hưởng cấu trúc dữ liệu cuộc gọi.',
        estimatedEffort: '15 - 30 phút',
        confidenceScore: 0.98,
      };
    }

    if (target.includes('sao chép') || target.includes('copy')) {
      return {
        issueId: issue.id,
        severity: 'P2',
        category: 'Tương tác Clipboard / UI Feedback',
        title: 'Bổ sung phản hồi xúc giác (Toast / Animation) khi sao chép tin nhắn',
        rootCause: `Thao tác click sao chép tin nhắn không có thông báo toast phản hồi tức thì hoặc bị trễ do luồng render chính bận, khiến người dùng bấm liên tục ${issue.occurrenceCount} lần.`,
        affectedComponents: ['CopyButton', 'CustomerMessageList'],
        affectedFiles: ['apps/web/app/dashboard/customers/page.tsx', 'apps/web/components/ui/StatusTag.tsx'],
        proposedFix: [
          'Bổ sung toast phản hồi tức thì "Đã sao chép vào bộ nhớ tạm" trong vòng <50ms.',
          'Thêm trạng thái nút chuyển sang icon Check xanh lá trong 1.5s.',
          'Debounce click trong 800ms để ngăn chặn việc gửi nhiều sự kiện trùng lặp.',
        ],
        riskAssessment: 'Rất thấp. Hoàn toàn là cải thiện UI/UX.',
        estimatedEffort: '15 phút',
        confidenceScore: 0.95,
      };
    }

    return {
      issueId: issue.id,
      severity: 'P2',
      category: 'Giao diện / Độ trễ Phản hồi (UI Latency)',
      title: `Khắc phục hiện tượng lag và bổ sung phản hồi khi click vào ${issue.target || 'phần tử UI'}`,
      rootCause: `Thao tác click vào ${issue.target || 'phần tử giao diện'} không phản hồi lập tức do các API nền đang tải hoặc thiếu trạng thái loading indicator, khiến người dùng click dồn dập ${issue.occurrenceCount} lần.`,
      affectedComponents: ['InteractiveList', 'CardItem'],
      affectedFiles: [
        path.includes('/nyc') ? 'apps/web/app/dashboard/nyc/page.tsx' : 'apps/web/app/dashboard/customers/page.tsx',
      ],
      proposedFix: [
        'Thêm hiệu ứng hover active, spinner loading nhẹ khi người dùng tương tác.',
        'Bổ sung debounce click chống spam thao tác liên tục.',
        'Kiểm tra và ngăn chặn re-render thừa của component cha khi click.',
      ],
      riskAssessment: 'Thấp.',
      estimatedEffort: '20 phút',
      confidenceScore: 0.92,
    };
  }

  // 2. Check SLOW_INTERACTION
  if (issue.issueType === 'SLOW_INTERACTION') {
    if (target.includes('/bug-reports/mine') || message.includes('/bug-reports/mine')) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Hiệu năng API / Truy vấn Nặng',
        title: 'Tối ưu hóa endpoint GET /bug-reports/mine và tinh gọn quan hệ nạp sâu',
        rootCause: `Endpoint GET /bug-reports/mine thực hiện transaction gồm 4 query lớn kèm include sâu 10 bảng quan hệ (audits, comments, attachments, jobs...) với take: 100, phản hồi chậm ${message} trên mỗi lần đổi route hoặc poll thông báo.`,
        affectedComponents: ['BugReportService.mine', 'NotificationPolling'],
        affectedFiles: [
          'apps/api/src/modules/bug-reports/bug-report.service.ts',
          'apps/api/src/modules/bug-reports/routes.ts',
        ],
        proposedFix: [
          'Rút gọn DTO cho /bug-reports/mine: chỉ select các trường cơ bản cần hiển thị trên Header/Badge, bỏ include toàn bộ audits và jobs sâu.',
          'Bổ sung composite index trên crm_bug_reports(reporter_staff_id, created_at) và crm_bug_report_notifications(recipient_staff_id, read_at).',
          'Giảm take từ 100 xuống 20 và bổ sung client-side caching 30 giây.',
        ],
        riskAssessment: 'Trung bình. Cần xác nhận các component đọc thông báo ở Header không bị thiếu trường.',
        estimatedEffort: '30 - 45 phút',
        confidenceScore: 0.98,
      };
    }

    if (target.includes('/calls/daily') || message.includes('/calls/daily')) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Hiệu năng Báo cáo / OmiCall Aggregation',
        title: 'Tối ưu truy vấn báo cáo cuộc gọi ngày GET /calls/daily',
        rootCause: `Truy vấn thống kê cuộc gọi ngày quét qua toàn bộ bảng crm_call_logs chưa có composite index theo (staff_id, call_date), dẫn đến thời gian phản hồi kéo dài ${message}.`,
        affectedComponents: ['CallService.dailyStats', 'CallReportQuery'],
        affectedFiles: ['apps/api/src/modules/calls/call.service.ts', 'apps/api/prisma/crm.prisma'],
        proposedFix: [
          'Bổ sung composite index trên bảng crm_call_logs(staff_id, created_at) và crm_call_logs(call_date).',
          'Áp dụng in-memory / redis cache 30 giây cho thống kê tổng hợp của Booker/Telesales.',
          'Phân vùng query để không quét các bản ghi cũ hơn 30 ngày.',
        ],
        riskAssessment: 'Thấp.',
        estimatedEffort: '30 phút',
        confidenceScore: 0.96,
      };
    }

    if (target.includes('/staff') || message.includes('/staff')) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Client Caching / Danh mục Nhân sự',
        title: 'Bổ sung client caching và ETag cho endpoint danh mục GET /staff',
        rootCause: `Endpoint GET /staff được gọi lặp đi lặp lại ở nhiều component con khi chuyển trang hoặc re-render, gây nghẽn băng thông và phản hồi chậm ${message}.`,
        affectedComponents: ['StaffService', 'useStaffList'],
        affectedFiles: ['apps/web/lib/api-client.ts', 'apps/api/src/modules/staff/routes.ts'],
        proposedFix: [
          'Bổ sung SWR / React Query cache 60s cho danh mục nhân sự phía web client.',
          'Phía backend Fastify trả về header Cache-Control: private, max-age=60 và hỗ trợ If-None-Match ETag.',
          'Ngăn chặn các component con gọi API trùng lặp trong cùng 1 view render.',
        ],
        riskAssessment: 'Rất thấp.',
        estimatedEffort: '20 phút',
        confidenceScore: 0.95,
      };
    }

    if (target.includes('/cv-realtime-status') || target.includes('/allocation')) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Điều phối Ca / Realtime Status Query',
        title: `Tối ưu truy vấn điều phối và trạng thái thời gian thực ${issue.target || ''}`,
        rootCause: `Truy vấn trạng thái CV và đơn chờ quét qua nhiều bảng liên kết lớn đồng thời, phản hồi chậm ${message}.`,
        affectedComponents: ['CustomerService', 'AllocationService'],
        affectedFiles: ['apps/api/src/modules/customer/customer.service.ts'],
        proposedFix: [
          'Tối ưu câu lệnh Prisma raw SQL, chỉ lấy các ca làm việc trong ngày.',
          'Thêm composite index cho order_service theo trạng thái và thời gian bắt đầu.',
          'Tối ưu polling interval từ 3s lên 10s kèm debounce.',
        ],
        riskAssessment: 'Trung bình.',
        estimatedEffort: '35 phút',
        confidenceScore: 0.94,
      };
    }

    return {
      issueId: issue.id,
      severity: 'P1',
      category: 'Hiệu năng Tải Dữ liệu / Slow API',
      title: `Tối ưu hóa endpoint API ${issue.target || issue.path}`,
      rootCause: `API ${issue.target || issue.path} phản hồi chậm (${issue.message}), vượt ngưỡng 3000ms gây nghẽn luồng xử lý của trình duyệt và ức chế cho nhân sự vận hành.`,
      affectedComponents: ['ApiHandler', 'DatabaseQuery'],
      affectedFiles: ['apps/api/src/modules/telemetry/telemetry.service.ts'],
      proposedFix: [
        'Kiểm tra EXPLAIN ANALYZE các câu query database tương ứng.',
        'Bổ sung index thích hợp cho các trường trong mệnh đề WHERE/ORDER BY.',
        'Bổ sung HTTP caching hoặc phân trang pagination hợp lý.',
      ],
      riskAssessment: 'Thấp.',
      estimatedEffort: '30 phút',
      confidenceScore: 0.9,
    };
  }

  // 3. Check UNCAUGHT_EXCEPTION
  if (issue.issueType === 'UNCAUGHT_EXCEPTION') {
    if (message.includes('SDK not initialized') || errorName.includes('SDK not initialized')) {
      return {
        issueId: issue.id,
        severity: 'P0',
        category: 'OmiCall WebRTC Web SDK / Lifecycle Error',
        title: 'Khắc phục lỗi Uncaught Error: SDK not initialized trong core.min.js',
        rootCause: `File public/core.min.js ném ngoại lệ khi các component gọi phương thức gọi thoại/âm thanh trước khi StringeeClient.connect() hoàn tất bắt tay, lặp lại ${issue.occurrenceCount} lần.`,
        affectedComponents: ['OmiCallProvider', 'useSipConnection', 'WebRTC Bridge'],
        affectedFiles: ['apps/web/context/omicall/OmiCallProvider.tsx', 'apps/web/context/omicall/useSipConnection.ts'],
        proposedFix: [
          'Bổ sung cờ isSdkReady và bọc kiểm tra an toàn (defensive check) trước mọi cuộc gọi SDK trong OmiCallProvider.tsx.',
          'Xếp hàng (queue) các lệnh gọi thoại nếu SDK đang trong trạng thái CONNECTING thay vì gọi trực tiếp.',
          'Thêm try-catch bao bọc các sự kiện unmount dọn dẹp WebRTC.',
        ],
        riskAssessment: 'Thấp. Tăng tính ổn định cho tổng đài OmiCall.',
        estimatedEffort: '20 phút',
        confidenceScore: 0.99,
      };
    }

    if (message.includes('cleanupOmiCallMediaBridge')) {
      return {
        issueId: issue.id,
        severity: 'P0',
        category: 'Media Bridge / Re-export Error',
        title: 'Khắc phục lỗi TypeError: cleanupOmiCallMediaBridge is not a function',
        rootCause: `Hàm cleanupOmiCallMediaBridge bị undefined lúc unmount do import vòng hoặc tree-shaking sai giữa mediaBridge.ts và useSipConnection.ts.`,
        affectedComponents: ['OmiCallMediaBridge', 'OmiCallProvider'],
        affectedFiles: [
          'apps/web/context/omicall/mediaBridge.ts',
          'apps/web/context/omicall/useSipConnection.ts',
          'apps/web/context/omicall/OmiCallProvider.tsx',
        ],
        proposedFix: [
          'Import trực tiếp cleanupOmiCallMediaBridge từ ./mediaBridge.js, loại bỏ circular re-export trong useSipConnection.ts.',
          'Thêm defensive guard typeof cleanupOmiCallMediaBridge === "function" trước khi thực thi.',
        ],
        riskAssessment: 'Rất thấp.',
        estimatedEffort: '10 phút',
        confidenceScore: 0.99,
      };
    }

    return {
      issueId: issue.id,
      severity: 'P1',
      category: 'JavaScript Runtime / Ngoại lệ Chưa bắt',
      title: `Khắc phục ngoại lệ JavaScript: ${issue.message.slice(0, 80)}`,
      rootCause: `Ngoại lệ runtime ${issue.message} phát sinh tại trang ${issue.path} không được bao bọc try-catch hoặc ErrorBoundary.`,
      affectedComponents: ['RuntimeHandler', 'PageContainer'],
      affectedFiles: ['apps/web/app/layout.tsx'],
      proposedFix: [
        'Bổ sung try-catch defensive bao quanh logic phát sinh lỗi.',
        'Bổ sung fallback UI an toàn tránh sập toàn bộ trang.',
      ],
      riskAssessment: 'Thấp.',
      estimatedEffort: '20 phút',
      confidenceScore: 0.88,
    };
  }

  // 4. Check REACT_CRASH
  if (issue.issueType === 'REACT_CRASH') {
    return {
      issueId: issue.id,
      severity: 'P0',
      category: 'Next.js Dynamic Chunk / Deploy Cache Mismatch',
      title: 'Tự động phục hồi khi gặp ChunkLoadError sau khi Deploy bản mới',
      rootCause: `Người dùng chuyển trang trong khi phiên bản build mới vừa được deploy lên VPS làm thay đổi hash của chunk JS (${issue.message}).`,
      affectedComponents: ['GlobalErrorBoundary', 'RootLayout'],
      affectedFiles: ['apps/web/app/layout.tsx', 'apps/web/components/telemetry/FrontendTelemetryProvider.tsx'],
      proposedFix: [
        'Bổ sung window.addEventListener("error") bắt lỗi ChunkLoadError và tự động gọi window.location.reload() để tải bundle mới nhất.',
        'Lưu cờ sessionStorage để chống reload loop nếu mạng thực sự mất kết nối.',
      ],
      riskAssessment: 'Thấp.',
      estimatedEffort: '15 phút',
      confidenceScore: 0.97,
    };
  }

  // Default Fallback
  return {
    issueId: issue.id,
    severity: issue.issueType === 'API_FAILURE' ? 'P1' : 'P2',
    category: 'Mạng & Hạ tầng / Giao tiếp API',
    title: `Xử lý sự cố ${issue.issueType} tại ${issue.path}`,
    rootCause: `Sự cố ${issue.issueType} (${issue.message}) ghi nhận tại đường dẫn ${issue.path}.`,
    affectedComponents: ['FrontendView', 'ApiClient'],
    affectedFiles: ['apps/web/lib/api-client.ts'],
    proposedFix: [
      'Kiểm tra kết nối mạng và tính sẵn sàng của backend service.',
      'Thêm cơ chế tự động thử lại (exponential backoff retry) cho các request thất bại.',
    ],
    riskAssessment: 'Thấp.',
    estimatedEffort: '20 phút',
    confidenceScore: 0.85,
  };
}
