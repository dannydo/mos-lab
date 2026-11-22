import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  formatBugReportKey,
  removeVietnameseTones,
  type FrontendIssueAgAnalysis,
  type FrontendIssueAgDispatchResponse,
  type InboxPlanDraft,
} from '@mos-lab/shared';
import { InboxImplementationService } from '../../bug-reports/inbox-implementation.service.js';
import {
  inboxImplementationPlanVersion,
  inboxImplementationSourceVersion,
} from '../../bug-reports/inbox-implementation-version.js';
import { inboxPlanEventVersion } from '../../bug-reports/inbox-plan.service.js';
import { generateAgAnalysis } from './telemetry-analysis.js';
import { mapDbRowToRecord } from './telemetry-store.js';

export async function convertToBugReport(
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

export async function agAnalyze(fastify: FastifyInstance, id: number): Promise<FrontendIssueAgAnalysis> {
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

export async function agDispatch(
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
