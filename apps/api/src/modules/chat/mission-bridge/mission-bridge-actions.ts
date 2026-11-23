import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  formatBugReportKey,
  type ActionMosChatMissionRequest,
  type BugPriority,
  type InboxPlanDraft,
  type MosChatConversation,
  type MosChatMessage,
  type MosChatMissionSummary,
  type MosChatTaskItem,
  type MosChatThreadReply,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../../middlewares/auth.js';
import { BugReportError, BugReportService, serialize, stateSnapshot } from '../../bug-reports/bug-report.service.js';
import { InboxFollowUpService } from '../../bug-reports/inbox-follow-up.service.js';
import { InboxImplementationService } from '../../bug-reports/inbox-implementation.service.js';
import {
  inboxImplementationPlanVersion,
  inboxImplementationSourceVersion,
} from '../../bug-reports/inbox-implementation-version.js';
import { InboxPlanService, inboxPlanEventVersion } from '../../bug-reports/inbox-plan.service.js';
import { RequestClassifierWorkerHub } from '../../bug-reports/request-classifier-worker-hub.js';
import {
  buildMissionSummaryFromReport,
  convertChatAttachmentsToBugAttachments,
  createMilestoneThreadReply,
  formatTimeLabel,
  isDannyUser,
} from './mission-bridge-summary.js';
import { syncLinkedMissionsIntoChatState } from './mission-bridge-sync.js';

/**
 * Two-way sync: When a user replies inside a Chat Thread that is linked to a mOS Mission,
 * automatically forward the comment (and any images) to CrmBugReportComment so AG reads it!
 */
export async function syncChatReplyToMission(
  fastify: FastifyInstance,
  user: JwtUserPayload,
  msg: MosChatMessage,
  replyItem: MosChatThreadReply,
  mosChatMediaRootPath: string
): Promise<void> {
  const missionId = msg.missionId ? Number(msg.missionId) : 0;
  if (!missionId || replyItem.isMissionMilestone) return;

  try {
    const bugAttachments = await convertChatAttachmentsToBugAttachments(
      replyItem.attachments || [],
      mosChatMediaRootPath
    );
    const commentBody =
      replyItem.text?.trim() ||
      (bugAttachments.length > 0 ? `[Đính kèm ${bugAttachments.length} hình ảnh từ mOS Chat]` : '');
    if (!commentBody) return;

    const added = await BugReportService.addComment(fastify, Number(user.id) || 1, missionId, true, {
      body: commentBody,
      attachments: bugAttachments.length > 0 ? bugAttachments : undefined,
    });

    msg.missionSyncedCommentIds = Array.isArray(msg.missionSyncedCommentIds) ? msg.missionSyncedCommentIds : [];
    const latestComment = added?.report?.comments?.slice(-1)[0];
    if (latestComment?.id && !msg.missionSyncedCommentIds.includes(latestComment.id)) {
      msg.missionSyncedCommentIds.push(latestComment.id);
    }

    if (added?.report?.clarification?.status === 'WAITING_REPORTER') {
      if (await InboxFollowUpService.enqueue(fastify, missionId, 'REPORTER_COMMENT', added.report.updatedAt)) {
        RequestClassifierWorkerHub.notify('inbox_follow_up_available');
      }
    }

    if (
      added?.report?.status === 'NEW' &&
      added?.report?.clarification?.status === 'READY' &&
      !added?.report?.approvedAt
    ) {
      if (await InboxPlanService.enqueue(fastify, missionId, 'REPORTER_COMMENT')) {
        RequestClassifierWorkerHub.notify('inbox_plan_available');
      }
    }
  } catch (err) {
    fastify.log.warn({ err, missionId }, 'Non-blocking syncChatReplyToMission warning');
  }
}

/**
 * Executes Super Admin (Approve Implementation / Commit / Deploy) or Reporter (Accept / Rework)
 * actions directly from the Live Mission Card inside the mOS Chat thread.
 */
export async function executeMissionActionFromChat(
  fastify: FastifyInstance,
  user: JwtUserPayload,
  reportId: number,
  body: ActionMosChatMissionRequest,
  conversations: MosChatConversation[],
  tasks: MosChatTaskItem[]
): Promise<{
  mission: MosChatMissionSummary;
  message?: MosChatMessage | null;
  statusMessage: string;
  task?: MosChatTaskItem | null;
  systemReply?: MosChatThreadReply | null;
}> {
  const actorStaffId = Number(user.id) || 1;
  const isSuperAdmin = isDannyUser(user);
  const rawAction = body.action;
  const action =
    rawAction === 'REPORTER_ACCEPT' ? 'ACCEPT_RESULT' : rawAction === 'REPORTER_REOPEN' ? 'REQUEST_REWORK' : rawAction;
  const noteTextInput = (body.feedback || body.note || '').trim();

  const report = await fastify.prisma.crm.crmBugReport.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { id: true, displayName: true } },
      resolution: true,
    },
  });
  if (!report) {
    throw new BugReportError('Không tìm thấy nhiệm vụ trong mOS Mission.', 404);
  }

  let responseMessage = 'Đã cập nhật nhiệm vụ.';
  let systemReply: MosChatThreadReply | null = null;
  const now = new Date();

  if (action === 'APPROVE_IMPLEMENTATION') {
    if (!isSuperAdmin) {
      throw new BugReportError('Chỉ Super Admin Danny mới có quyền duyệt triển khai.', 403);
    }
    const expectedPlan = await fastify.prisma.crm.$transaction(async (tx) => {
      if (noteTextInput) {
        await tx.crmBugReportComment.create({
          data: {
            reportId,
            authorStaffId: actorStaffId,
            authorType: 'STAFF',
            kind: 'COMMENT',
            body: noteTextInput,
          },
        });
      }

      const effectivePriority: BugPriority = (report.priority as BugPriority) || 'P1';
      const updated = await tx.crmBugReport.update({
        where: { id: reportId },
        data: {
          status: 'APPROVED',
          statusSort: 0,
          priority: effectivePriority,
          prioritySort:
            effectivePriority === 'P0' ? 0 : effectivePriority === 'P1' ? 1 : effectivePriority === 'P2' ? 2 : 3,
          clarificationStatus: 'READY',
          clarificationSummary:
            report.clarificationSummary ||
            `Nhiệm vụ #MSN-${reportId} đã được Super Admin Danny duyệt nâng cấp / triển khai tiếp trực tiếp từ subthread mOS Chat.`,
          clarifiedAt: now,
          businessContext:
            noteTextInput ||
            report.businessContext ||
            'Super Admin Danny duyệt nâng cấp / triển khai tiếp trực tiếp từ subthread mOS Chat.',
          approvedByStaffId: actorStaffId,
          approvedAt: now,
          implementationApprovedByStaffId: null,
          implementationApprovedAt: null,
          implementationApprovalSourceVersion: null,
          implementationActiveJobId: null,
          closedAt: null,
        },
        include: {
          comments: {
            where: { authorType: 'STAFF' },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { id: true, body: true },
          },
        },
      });

      await tx.crmInboxImplementationJob.updateMany({
        where: { reportId, status: 'CHANGES_REQUESTED' },
        data: { status: 'SUPERSEDED' },
      });

      const planJobId = randomUUID();
      const eventKind = 'IMPLEMENTATION_APPROVAL';
      const eventVersion = inboxPlanEventVersion(updated, eventKind);
      const sourceVersion = inboxImplementationSourceVersion(updated);
      const latestCommentText =
        updated.comments
          .slice(0, 3)
          .reverse()
          .map((c) => c.body)
          .join('\n')
          .slice(0, 800) || updated.title;
      const planDraft: InboxPlanDraft = {
        evidence: `Yêu cầu nâng cấp / điều chỉnh bổ sung trong luồng mOS Chat (#MSN-${reportId}): ${latestCommentText}`,
        expectedOutcome: updated.title,
        scope: 'apps/web, apps/api, packages/shared',
        steps: [
          'Đọc toàn bộ lịch sử thảo luận và yêu cầu nâng cấp mới nhất trong subthread mOS Chat.',
          'Kế thừa mã nguồn đã triển khai của nhiệm vụ này (1 ticket = 1 session) để nâng cấp / điều chỉnh.',
          'Chạy kiểm thử tự động (pnpm verify:quick, pnpm check:ui-contract) và xác minh giao diện.',
        ],
        verification: 'pnpm verify:quick && pnpm check:ui-contract',
        risksAndRollback: 'Thay đổi cô lập trong worktree riêng; có thể rollback commit an toàn nếu cần.',
        approvalRequest: `Super Admin Danny đã duyệt Cổng 1 trực tiếp từ subthread mOS Chat để mOS Mission nâng cấp tiếp (${now.toISOString()}).`,
      };
      const planVersion = inboxImplementationPlanVersion(sourceVersion, planDraft);

      await tx.crmInboxPlanJob.updateMany({
        where: {
          reportId,
          NOT: { eventVersion },
          OR: [{ status: { in: ['PENDING', 'LEASED'] } }, { status: 'COMPLETED', sourceVersion }],
        },
        data: {
          status: 'SUPERSEDED',
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
          updatedAt: now,
        },
      });

      const savedPlanJob = await tx.crmInboxPlanJob.upsert({
        where: {
          reportId_eventVersion: {
            reportId,
            eventVersion,
          },
        },
        create: {
          id: planJobId,
          reportId,
          eventKind,
          eventVersion,
          status: 'COMPLETED',
          resultAction: 'POST_PLAN',
          sourceVersion,
          planVersion,
          expiresAt: new Date(now.getTime() + 24 * 3600 * 1000),
        },
        update: {
          eventKind,
          status: 'COMPLETED',
          resultAction: 'POST_PLAN',
          sourceVersion,
          planVersion,
          leaseToken: null,
          leasedBy: null,
          leaseExpiresAt: null,
          expiresAt: new Date(now.getTime() + 24 * 3600 * 1000),
          updatedAt: now,
        },
      });

      return { planJobId: savedPlanJob.id, sourceVersion, planVersion };
    });

    await InboxImplementationService.approve(fastify, reportId, actorStaffId, expectedPlan, 'AUTO');
    RequestClassifierWorkerHub.notify('inbox_implementation_available');

    const conv = conversations.find((c) => c.id === body.conversationId);
    const msg = conv?.messages.find((m) => m.id === body.messageId || m.missionId === reportId);
    if (conv && msg) {
      const key = formatBugReportKey(reportId, report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG');
      msg.thread = msg.thread || [];
      systemReply = createMilestoneThreadReply(
        reportId,
        'BUILDING',
        `🚀 **Đã duyệt nâng cấp / chỉnh sửa tiếp #MSN-${reportId} (${key})**\nAnh Danny đã duyệt yêu cầu bổ sung trong luồng chat. Nhiệm vụ trên **mOS Mission** đã được kích hoạt Cổng 1 để thực hiện nâng cấp!`,
        now
      );
      msg.thread.push(systemReply);
      msg.missionSyncedStage = 'BUILDING';
      conv.updatedAt = now.toISOString();
    }
    for (const task of tasks) {
      if (task.missionId === reportId) {
        task.done = false;
      }
    }
    responseMessage = 'Đã duyệt Cổng 1 để mOS Mission bắt đầu nâng cấp / lập trình tiếp!';
  } else if (action === 'APPROVE_COMMIT') {
    if (!isSuperAdmin) {
      throw new BugReportError('Chỉ Super Admin Danny mới có quyền duyệt Commit.', 403);
    }
    const queued = await InboxImplementationService.approveCommit(fastify, reportId, actorStaffId);
    if (queued) RequestClassifierWorkerHub.notify('inbox_implementation_available');
    responseMessage = 'Đã duyệt Commit ngay từ mOS Chat! mOS Mission đang tự động tạo commit.';
  } else if (action === 'APPROVE_DEPLOY') {
    if (!isSuperAdmin) {
      throw new BugReportError('Chỉ Super Admin Danny mới có quyền duyệt Deploy.', 403);
    }
    const queued = await InboxImplementationService.approveDeploy(fastify, reportId, actorStaffId);
    if (queued) RequestClassifierWorkerHub.notify('inbox_implementation_available');
    responseMessage = 'Đã duyệt Deploy! Hệ thống đang tự động đưa tính năng lên web chính thức.';
  } else if (action === 'ACCEPT_RESULT') {
    const noteText = noteTextInput || 'Đã kiểm tra trực tiếp từ mOS Chat và xác nhận tính năng hoạt động đúng ý.';
    if (report.status === 'FIXED') {
      if (actorStaffId === report.reporterStaffId) {
        try {
          await InboxImplementationService.reviewReporterAcceptance(fastify, reportId, actorStaffId, {
            decision: 'APPROVE',
            note: noteText,
          });
        } catch {
          await BugReportService.review(fastify, actorStaffId, reportId, {
            decision: 'APPROVE',
            note: noteText,
          });
        }
      } else if (isSuperAdmin) {
        await BugReportService.confirmClose(fastify, actorStaffId, reportId, {
          note: noteText,
        });
      } else {
        await BugReportService.review(fastify, report.reporterStaffId, reportId, {
          decision: 'APPROVE',
          note: `${noteText} (Xác nhận bởi ${user.username || 'nhân sự'} trong mOS Chat)`,
        });
      }
    }
    responseMessage = 'Đã xác nhận hoàn tất nhiệm vụ và đánh dấu hoàn thành công việc trong mOS Chat!';
  } else if (action === 'REQUEST_REWORK') {
    const reworkReason =
      noteTextInput.length >= 10
        ? noteTextInput
        : `${noteTextInput || 'Cần nâng cấp / điều chỉnh thêm'} (Phản hồi trực tiếp từ luồng mOS Chat)`;

    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmBugReportComment.create({
        data: {
          reportId,
          authorStaffId: actorStaffId,
          authorType: 'STAFF',
          kind: 'COMMENT',
          body: reworkReason,
        },
      });

      await tx.crmInboxImplementationJob.updateMany({
        where: {
          reportId,
          status: 'RELEASED',
          executionPhase: 'AWAITING_REPORTER_ACCEPTANCE',
        },
        data: { executionPhase: 'REOPENED_BY_REPORTER' },
      });

      const updated = await tx.crmBugReport.update({
        where: { id: reportId },
        data: {
          status: 'NEW',
          statusSort: 0,
          clarificationStatus: 'READY',
          priority: null,
          prioritySort: 4,
          approvedAt: null,
          approvedByStaffId: null,
          implementationApprovedByStaffId: null,
          implementationApprovedAt: null,
          implementationApprovalSourceVersion: null,
          implementationActiveJobId: null,
          closedAt: null,
          updatedAt: now,
        },
      });

      await tx.crmBugReportAudit.create({
        data: {
          reportId,
          actorStaffId,
          action: 'REPORTER_REOPENED',
          note: reworkReason,
          beforeJson: serialize(stateSnapshot(report as never)),
          afterJson: serialize({
            ...stateSnapshot(updated as never),
            reopenIntent: 'DETAILS',
          }),
        },
      });

      await tx.crmBugReportNotification.updateMany({
        where: { reportId, recipientStaffId: actorStaffId, readAt: null },
        data: { readAt: now },
      });

      if (report.reporterStaffId && report.reporterStaffId !== actorStaffId) {
        await tx.crmBugReportNotification
          .create({
            data: {
              reportId,
              recipientStaffId: report.reporterStaffId,
              type: 'REPORTER_REOPENED',
              title: `Đề xuất nâng cấp #${reportId}`,
              message: `${user.username || 'Nhân sự'} đã gửi đề xuất nâng cấp / chỉnh thêm: ${reworkReason}`,
              actionUrl: `/dashboard/inbox?reportId=${reportId}`,
            },
          })
          .catch(() => {});
      }
    });

    const conv = conversations.find((c) => c.id === body.conversationId);
    const msg = conv?.messages.find((m) => m.id === body.messageId || m.missionId === reportId);
    if (conv && msg) {
      msg.thread = msg.thread || [];
      systemReply = {
        id: `th-rw-${randomUUID().slice(0, 8)}`,
        senderId: user.id,
        senderName: user.username || 'Nhân sự',
        senderRole: isSuperAdmin ? 'Super Admin' : 'Admin',
        text: `🔄 **Yêu cầu nâng cấp / chỉnh thêm (#MSN-${reportId}):** ${reworkReason}`,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
      };
      msg.thread.push(systemReply);
      msg.missionSyncedStage = 'RECEIVED';
      conv.updatedAt = now.toISOString();
    }
    for (const task of tasks) {
      if (task.missionId === reportId) {
        task.done = false;
      }
    }
    if (await InboxFollowUpService.enqueue(fastify, reportId, 'REPORTER_REOPENED', now.toISOString())) {
      RequestClassifierWorkerHub.notify('inbox_follow_up_available');
    }
    if (await InboxPlanService.enqueue(fastify, reportId, 'REPORTER_COMMENT')) {
      RequestClassifierWorkerHub.notify('inbox_plan_available');
    }
    responseMessage =
      'Đã ghi nhận yêu cầu nâng cấp / chỉnh thêm trong luồng chat (chờ anh Danny duyệt Cổng 1 mOS Mission)!';
  }

  await syncLinkedMissionsIntoChatState(fastify, conversations, tasks);

  const updatedReport = await fastify.prisma.crm.crmBugReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      requestType: true,
      title: true,
      status: true,
      clarificationStatus: true,
      clarificationSummary: true,
      implementationApprovedAt: true,
      implementationActiveJobId: true,
      reporterStaffId: true,
      reporter: { select: { id: true, displayName: true } },
      resolution: { select: { solutionSummary: true, verificationSummary: true, releaseUrl: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, authorType: true, kind: true, body: true, createdAt: true },
      },
      updatedAt: true,
    },
  });

  const activeJob =
    updatedReport?.implementationActiveJobId && fastify.prisma.crm.crmInboxImplementationJob
      ? await fastify.prisma.crm.crmInboxImplementationJob.findUnique({
          where: { id: updatedReport.implementationActiveJobId },
          select: {
            id: true,
            status: true,
            executionPhase: true,
            commitSha: true,
            changedFilesJson: true,
            diffStat: true,
            summary: true,
            progressLabel: true,
            updatedAt: true,
          },
        })
      : null;

  let matchedMessage: MosChatMessage | null = null;
  for (const conv of conversations) {
    for (const msg of conv.messages || []) {
      if ((body.messageId && msg.id === body.messageId) || msg.missionId === reportId) {
        matchedMessage = msg;
        break;
      }
    }
    if (matchedMessage) break;
  }

  const matchedTask = tasks.find((t) => (body.taskId && t.id === body.taskId) || t.missionId === reportId) || null;

  const contextInfo = {
    conversationId: body.conversationId || matchedMessage?.conversationId || matchedTask?.conversationId,
    messageId: body.messageId || matchedMessage?.id || matchedTask?.sourceMessageId || undefined,
    taskId: body.taskId || matchedTask?.id || matchedMessage?.taskId || null,
  };

  const summary = updatedReport
    ? buildMissionSummaryFromReport(updatedReport, activeJob, contextInfo)
    : buildMissionSummaryFromReport(
        {
          ...report,
          comments: [],
        },
        null,
        contextInfo
      );

  return {
    mission: summary,
    message: matchedMessage,
    statusMessage: responseMessage,
    task: matchedTask,
    systemReply,
  };
}
