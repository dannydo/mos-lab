import type { FastifyInstance } from 'fastify';
import type { MosChatConversation, MosChatMissionSummary, MosChatTaskItem } from '@mos-lab/shared';
import { buildMissionSummaryFromReport, createMilestoneThreadReply } from './mission-bridge-summary.js';

/**
 * Synchronizes all linked mOS Missions into mOS Chat messages & tasks.
 * Appends human-friendly milestone messages into the Chat thread at the 4 key milestones
 * and marks linked Chat Tasks as Done when the Mission is Completed.
 */
export async function syncLinkedMissionsIntoChatState(
  fastify: FastifyInstance,
  conversations: MosChatConversation[],
  tasks: MosChatTaskItem[]
): Promise<boolean> {
  if (!fastify.prisma?.crm?.crmBugReport) return false;

  const missionIds = new Set<number>();
  for (const conv of conversations) {
    for (const msg of conv.messages || []) {
      if (msg.missionId && Number(msg.missionId) > 0) {
        missionIds.add(Number(msg.missionId));
      }
    }
  }
  for (const task of tasks) {
    if (task.missionId && Number(task.missionId) > 0) {
      missionIds.add(Number(task.missionId));
    }
  }

  if (missionIds.size === 0) return false;

  let reports: Array<{
    id: number;
    requestType: string;
    title: string;
    status: string;
    clarificationStatus: string;
    clarificationSummary: string | null;
    implementationApprovedAt: Date | null;
    implementationActiveJobId: string | null;
    reporterStaffId: number;
    reporter: { id: number; displayName: string | null } | null;
    resolution: {
      solutionSummary: string;
      verificationSummary: string | null;
      releaseUrl: string | null;
    } | null;
    comments: Array<{ id: number; authorType: string; kind: string; body: string; createdAt: Date }>;
    updatedAt: Date;
  }>;

  try {
    reports = await fastify.prisma.crm.crmBugReport.findMany({
      where: { id: { in: Array.from(missionIds) } },
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
        resolution: {
          select: { solutionSummary: true, verificationSummary: true, releaseUrl: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, authorType: true, kind: true, body: true, createdAt: true },
        },
        updatedAt: true,
      },
    });
  } catch {
    return false;
  }

  if (reports.length === 0) return false;

  const activeJobIds = reports.map((r) => r.implementationActiveJobId).filter((id): id is string => Boolean(id));

  const activeJobsMap = new Map<
    string,
    {
      id: string;
      status: string;
      executionPhase: string | null;
      commitSha: string | null;
      changedFilesJson: string | null;
      diffStat: string | null;
      summary: string | null;
      progressLabel: string | null;
      updatedAt: Date;
    }
  >();

  if (activeJobIds.length > 0 && fastify.prisma.crm.crmInboxImplementationJob) {
    try {
      const jobs = await fastify.prisma.crm.crmInboxImplementationJob.findMany({
        where: { id: { in: activeJobIds } },
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
      });
      for (const j of jobs) {
        activeJobsMap.set(j.id, j);
      }
    } catch {
      // Ignore in lightweight test mocks
    }
  }

  const summaryByReportId = new Map<number, MosChatMissionSummary>();
  const reportById = new Map<number, (typeof reports)[number]>();
  for (const r of reports) {
    const job = r.implementationActiveJobId ? activeJobsMap.get(r.implementationActiveJobId) || null : null;
    summaryByReportId.set(r.id, buildMissionSummaryFromReport(r, job));
    reportById.set(r.id, r);
  }

  let stateMutated = false;
  const now = new Date();

  for (const conv of conversations) {
    for (const msg of conv.messages || []) {
      const mId = msg.missionId ? Number(msg.missionId) : 0;
      if (!mId) continue;
      const summary = summaryByReportId.get(mId);
      const report = reportById.get(mId);
      if (!summary || !report) continue;

      const prevUpdatedAt = msg.mission?.updatedAt;
      const prevStage = msg.mission?.stage;
      msg.mission = {
        ...summary,
        conversationId: conv.id,
        messageId: msg.id,
        taskId: msg.taskId ?? null,
      };
      msg.missionKey = summary.key;

      if (prevUpdatedAt !== summary.updatedAt || prevStage !== summary.stage) {
        stateMutated = true;
      }

      if (msg.isSharedMission) {
        continue;
      }

      msg.thread = msg.thread || [];
      msg.missionSyncedCommentIds = Array.isArray(msg.missionSyncedCommentIds) ? msg.missionSyncedCommentIds : [];

      for (const comment of report.comments || []) {
        if (msg.missionSyncedCommentIds.includes(comment.id)) continue;
        if (comment.authorType === 'AGENT' && comment.kind === 'CLARIFICATION_QUESTION') {
          const replyText =
            `🟠 **Cần bạn bổ sung thêm chi tiết (#${summary.missionCode})**\n` +
            `${comment.body}\n\n` +
            `👉 *Bạn chỉ cần nhắn trả lời trực tiếp ngay trong luồng chat này nhé!*`;
          msg.thread.push(
            createMilestoneThreadReply(mId, 'NEEDS_INFO', replyText, comment.createdAt || now, comment.id)
          );
          msg.missionSyncedCommentIds.push(comment.id);
          conv.updatedAt = now.toISOString();
          stateMutated = true;
        }
      }

      const lastSyncedStage = msg.missionSyncedStage;
      if (lastSyncedStage && lastSyncedStage !== summary.stage) {
        if (summary.stage === 'AWAITING_RELEASE') {
          const detailLine = summary.superAdminActions?.agentSummary
            ? `\n• Kết quả: ${summary.superAdminActions.agentSummary}`
            : '';
          const replyText =
            `⚡ **Đã xây dựng xong bản thử nghiệm (#${summary.missionCode})**${detailLine}\n` +
            `Hệ thống đã lập trình và vượt qua kiểm thử tự động. Đang chờ anh Danny bấm duyệt đưa lên hệ thống chính thức.`;
          msg.thread.push(createMilestoneThreadReply(mId, 'AWAITING_RELEASE', replyText, now));
          conv.updatedAt = now.toISOString();
          stateMutated = true;
        } else if (summary.stage === 'READY_FOR_REVIEW') {
          const targetReviewer = summary.reporterName ? `**${summary.reporterName}**` : 'bạn';
          const replyText =
            `🎉 **Đã cập nhật lên hệ thống chính thức (#${summary.missionCode})!**\n` +
            `${summary.humanSummary}\n` +
            `👉 Mời ${targetReviewer} kiểm tra thử kết quả rồi bấm **[✅ Đã đúng ý]** hoặc **[🔄 Cần chỉnh thêm]** ngay trên thẻ nhiệm vụ đầu luồng chat nhé!`;
          msg.thread.push(createMilestoneThreadReply(mId, 'READY_FOR_REVIEW', replyText, now));
          conv.updatedAt = now.toISOString();
          stateMutated = true;
        } else if (summary.stage === 'COMPLETED') {
          const replyText =
            `✅ **Hoàn tất nhiệm vụ #${summary.missionCode}!**\n` +
            `Cảm ơn bạn đã kiểm tra và xác nhận kết quả. Công việc trong mOS Chat đã được tự động đánh dấu hoàn thành.`;
          msg.thread.push(createMilestoneThreadReply(mId, 'COMPLETED', replyText, now));
          conv.updatedAt = now.toISOString();
          stateMutated = true;
        } else if (
          summary.stage === 'RECEIVED' &&
          (lastSyncedStage === 'READY_FOR_REVIEW' || lastSyncedStage === 'COMPLETED')
        ) {
          const hasExistingReopenReply = msg.thread.some((r) => r.isMissionMilestone && r.missionStage === 'RECEIVED');
          if (!hasExistingReopenReply) {
            const latestStaffComment = (report.comments || [])
              .filter((c) => c.authorType === 'STAFF')
              .slice(-1)[0]?.body;
            const reworkReason = latestStaffComment ? `\n• **Yêu cầu phản hồi**: *"${latestStaffComment}"*` : '';
            const replyText =
              `🔄 **Ghi nhận yêu cầu nâng cấp / chỉnh sửa bổ sung (#${summary.missionCode})**${reworkReason}\n` +
              `Đang chờ anh Danny bấm **[🚀 Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)]** để triển khai.`;
            msg.thread.push(createMilestoneThreadReply(mId, 'RECEIVED', replyText, now));
            conv.updatedAt = now.toISOString();
            stateMutated = true;
          }
        }
        msg.missionSyncedStage = summary.stage;
      } else if (!lastSyncedStage) {
        msg.missionSyncedStage = summary.stage;
      }
    }
  }

  for (const task of tasks) {
    const mId = task.missionId ? Number(task.missionId) : 0;
    if (!mId) continue;
    const summary = summaryByReportId.get(mId);
    if (!summary) continue;
    if (task.mission?.updatedAt !== summary.updatedAt || task.mission?.stage !== summary.stage) {
      stateMutated = true;
    }
    task.mission = {
      ...summary,
      conversationId: task.conversationId,
      messageId: task.sourceMessageId || undefined,
      taskId: task.id,
    };
    task.missionKey = summary.key;
    if (summary.stage === 'COMPLETED' && !task.done) {
      task.done = true;
      stateMutated = true;
    }
  }

  return stateMutated;
}
