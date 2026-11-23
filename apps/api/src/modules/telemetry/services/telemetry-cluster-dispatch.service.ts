import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  FRONTEND_ISSUE_CLUSTER_KEYS,
  formatBugReportKey,
  removeVietnameseTones,
  type FrontendIssueCluster,
  type FrontendIssueClusterDispatchResponse,
  type FrontendIssueClusterKey,
  type FrontendIssueClusterListResponse,
  type InboxPlanDraft,
} from '@mos-lab/shared';
import { InboxImplementationService } from '../../bug-reports/inbox-implementation.service.js';
import {
  inboxImplementationPlanVersion,
  inboxImplementationSourceVersion,
} from '../../bug-reports/inbox-implementation-version.js';
import { inboxPlanEventVersion } from '../../bug-reports/inbox-plan.service.js';
import { CLUSTER_METADATA, classifyIssueIntoCluster } from './telemetry-clusters.js';
import { getMemoryClusterIssues } from './telemetry-store.js';

export async function getClusters(fastify: FastifyInstance): Promise<FrontendIssueClusterListResponse> {
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
    issues = getMemoryClusterIssues();
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
  const extinguishmentRate = totalOccurrences > 0 ? Math.round((extinguishedOccurrences / totalOccurrences) * 100) : 0;

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

export async function dispatchCluster(
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

export async function batchDispatchPriorityClusters(
  fastify: FastifyInstance,
  actorStaffId: number
): Promise<FrontendIssueClusterDispatchResponse[]> {
  const priorityClusters: FrontendIssueClusterKey[] = ['POLLING_SLOW_API', 'RAGE_CLICK_CALL_LOG', 'WEBRTC_SDK_CRASH'];

  const results: FrontendIssueClusterDispatchResponse[] = [];
  for (const key of priorityClusters) {
    const res = await dispatchCluster(fastify, key, actorStaffId);
    results.push(res);
  }
  return results;
}
