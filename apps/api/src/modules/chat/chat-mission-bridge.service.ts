import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';
import {
  BUG_REPORT_MAX_ATTACHMENTS,
  formatBugReportKey,
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
  removeVietnameseTones,
  type ActionMosChatMissionRequest,
  type BugPriority,
  type BugReportRequestType,
  type CreateBugReportAttachmentRequest,
  type CreateMosChatMissionRequest,
  type InboxPlanDraft,
  type MosChatConversation,
  type MosChatImageAttachment,
  type MosChatMessage,
  type MosChatMissionArtifactPreview,
  type MosChatMissionExecutionTrack,
  type MosChatMissionStage,
  type MosChatMissionSummary,
  type MosChatStaffMember,
  type MosChatTaskItem,
  type MosChatThreadReply,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { BugReportError, BugReportService, serialize, stateSnapshot } from '../bug-reports/bug-report.service.js';
import { BugReportStorage } from '../bug-reports/bug-report.storage.js';
import { InboxFollowUpService } from '../bug-reports/inbox-follow-up.service.js';
import { InboxImplementationService } from '../bug-reports/inbox-implementation.service.js';
import {
  inboxImplementationPlanVersion,
  inboxImplementationSourceVersion,
} from '../bug-reports/inbox-implementation-version.js';
import { InboxPlanService, inboxPlanEventVersion } from '../bug-reports/inbox-plan.service.js';
import { RequestClassifierWorkerHub } from '../bug-reports/request-classifier-worker-hub.js';

function formatTimeLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function isDannyUser(user?: JwtUserPayload | null): boolean {
  if (!user) return false;
  return (isSuperAdminRole(user.role) && isCanonicalSuperAdminIdentity(user)) || Number(user.id) === 1;
}

function inferRequestTypeFromText(text: string, explicit?: 'BUG' | 'FEATURE'): BugReportRequestType {
  if (explicit === 'BUG' || explicit === 'FEATURE') return explicit;
  const normalized = text.toLowerCase();
  const hasBugKeywords =
    /\b(lỗi|bug|không thể|bị mất|không thao tác|sai|hỏng|crash|treo|không hiện|bị văng|error)\b/i.test(normalized);
  const startsWithFeatureIntent = /^(bổ sung|thêm|add|tạo|nâng cấp|cập nhật|khi đặt lịch|cần có)/i.test(
    normalized.trim()
  );
  if (hasBugKeywords && !startsWithFeatureIntent) {
    return 'BUG';
  }
  return 'FEATURE';
}

export function inferMissionExecutionTrack(
  text: string,
  explicit?: MosChatMissionExecutionTrack
): MosChatMissionExecutionTrack {
  if (explicit === 'CODE_ENGINEERING' || explicit === 'PROCESS_CANON' || explicit === 'DATA_DECISION') {
    return explicit;
  }

  const normalized = (text || '').toLowerCase();
  const hasProcessKeywords =
    /\b(kinh thánh|điều răn|quy trình|chính sách|workflow|kịch bản|nội quy|khung năng lực|biểu mẫu)\b/i.test(
      normalized
    );
  const hasDataDecisionKeywords =
    /\b(đối soát|sổ cái|ledger|cộng thêm|điều chỉnh lương|điều chỉnh tip|phân bổ lại|chuyển tệp|dữ liệu khách|gộp trùng)\b/i.test(
      normalized
    ) || /\b0\d{9}\s+cho\s+(anh|chị|em)\b/i.test(normalized);

  if (hasDataDecisionKeywords) {
    return 'DATA_DECISION';
  }
  if (hasProcessKeywords) {
    return 'PROCESS_CANON';
  }
  return 'CODE_ENGINEERING';
}

export function buildMissionArtifactPreview(
  track: MosChatMissionExecutionTrack,
  options?: {
    changedFilesCount?: number;
    diffStat?: string | null;
    summary?: string | null;
    title?: string | null;
  }
): MosChatMissionArtifactPreview {
  if (track === 'PROCESS_CANON') {
    return {
      track: 'PROCESS_CANON',
      trackLabel: 'Quy trình & Kinh Thánh mOS',
      gate1Label: 'Cổng 1: Duyệt Phương Án Quy Trình',
      gate2Label: 'Cổng 2: Duyệt Bản Thảo Điều Răn',
      gate3Label: 'Cổng 3: Áp Dụng Quy Trình Mới',
      processDiff: {
        canonRuleCode: null,
        workflowCode: null,
        beforeSummary: 'Quy chuẩn vận hành hiện hành',
        afterSummary: options?.summary || options?.title || 'Cập nhật quy trình / điều răn mới',
      },
    };
  }

  if (track === 'DATA_DECISION') {
    return {
      track: 'DATA_DECISION',
      trackLabel: 'Xử lý Dữ liệu & Ra Quyết Định',
      gate1Label: 'Cổng 1: Duyệt Phương Án Dữ Liệu',
      gate2Label: 'Cổng 2: Duyệt Kết Quả Dry-Run',
      gate3Label: 'Cổng 3: Thực Thi Thay Đổi Dữ Liệu',
      dataDryRun: {
        targetTable: 'crm / legacy',
        affectedRows: options?.changedFilesCount || 1,
        impactSummary: options?.summary || options?.title || 'Mô phỏng tác động dữ liệu an toàn',
        rollbackReady: true,
      },
    };
  }

  return {
    track: 'CODE_ENGINEERING',
    trackLabel: 'Kỹ thuật & Mã nguồn',
    gate1Label: 'Cổng 1: Duyệt Phương Án Kỹ Thuật',
    gate2Label: 'Cổng 2: Duyệt Commit & Test',
    gate3Label: 'Cổng 3: Duyệt Deploy Production',
    codeReceipt: {
      changedFilesCount: options?.changedFilesCount ?? 0,
      diffStat: options?.diffStat ?? null,
      testsSummary: options?.summary ?? null,
    },
  };
}

function parseSafeStringList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function buildMissionSummaryFromReport(
  report: {
    id: number;
    requestType: string;
    title: string;
    status: string;
    clarificationStatus: string;
    clarificationSummary?: string | null;
    implementationApprovedAt?: Date | null;
    implementationActiveJobId?: string | null;
    reporterStaffId: number;
    reporter?: { id: number; displayName: string | null } | null;
    resolution?: {
      solutionSummary: string;
      verificationSummary?: string | null;
      releaseUrl?: string | null;
    } | null;
    comments?: Array<{ id: number; authorType: string; kind: string; body: string; createdAt: Date }>;
    updatedAt: Date;
  },
  activeJob?: {
    id: string;
    status: string;
    executionPhase: string | null;
    commitSha: string | null;
    changedFilesJson: string | null;
    diffStat: string | null;
    summary: string | null;
    progressLabel: string | null;
    updatedAt: Date;
  } | null,
  context?: {
    conversationId?: string;
    messageId?: string;
    taskId?: string | null;
    executionTrack?: MosChatMissionExecutionTrack;
  }
): MosChatMissionSummary {
  const requestType: 'BUG' | 'FEATURE' = report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG';
  const executionTrack = inferMissionExecutionTrack(report.title || '', context?.executionTrack);
  const key = formatBugReportKey(report.id, requestType);
  const missionCode = `MSN-${report.id}`;
  const reporterName = report.reporter?.displayName || null;

  const latestClarificationQuestion =
    report.comments?.filter((c) => c.authorType === 'AGENT' && c.kind === 'CLARIFICATION_QUESTION').slice(-1)[0]
      ?.body || null;

  const isJobActivelyRunning = Boolean(
    activeJob &&
    ['PENDING', 'LEASED', 'RUNNING', 'AWAITING_COMMIT_REVIEW', 'AWAITING_DEPLOY_REVIEW'].includes(activeJob.status)
  );
  const hasUpgradeOrReworkContext = Boolean(
    report.resolution ||
    (activeJob && activeJob.status === 'RELEASED') ||
    report.comments?.some((c) => c.authorType === 'STAFF')
  );

  let stage: MosChatMissionStage = 'RECEIVED';
  let stepIndex: 1 | 2 | 3 | 4 = 1;
  let humanBadge = hasUpgradeOrReworkContext
    ? '🟣 Có yêu cầu nâng cấp · Chờ anh Danny duyệt'
    : '🟣 Đã tiếp nhận nhiệm vụ';
  let humanSummary = hasUpgradeOrReworkContext
    ? 'Đã ghi nhận yêu cầu nâng cấp / chỉnh sửa bổ sung trong luồng chat. Đang chờ anh Danny bấm [🚀 Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)] để triển khai.'
    : 'Đã ghi nhận vào mOS Mission. Hệ thống đang đọc nội dung và hình ảnh đính kèm.';

  if (report.status === 'CLOSED') {
    stage = 'COMPLETED';
    stepIndex = 4;
    humanBadge = '✅ Hoàn tất nhiệm vụ';
    humanSummary =
      report.resolution?.solutionSummary || 'Nhiệm vụ đã được kiểm tra và xác nhận hoạt động tốt trên hệ thống.';
  } else if (report.status === 'REJECTED' || report.status === 'DUPLICATE') {
    stage = 'NOT_PROCEEDING';
    stepIndex = 1;
    humanBadge = '⚪ Tạm dừng thực hiện';
    humanSummary =
      report.status === 'DUPLICATE'
        ? 'Nhiệm vụ này đã được gộp chung với một nhiệm vụ tương tự.'
        : 'Nhiệm vụ này hiện tạm dừng chưa triển khai.';
  } else if (report.status === 'FIXED') {
    stage = 'READY_FOR_REVIEW';
    stepIndex = 3;
    humanBadge = '🟢 Đã lên sóng · Mời kiểm tra';
    humanSummary = report.resolution?.solutionSummary
      ? `🎉 Đã cập nhật lên web: ${report.resolution.solutionSummary}`
      : '🎉 Tính năng / bản sửa đã được đưa lên hệ thống chính thức! Mời bạn kiểm tra thử và bấm xác nhận bên dưới nhé.';
  } else if (report.clarificationStatus === 'WAITING_REPORTER') {
    stage = 'NEEDS_INFO';
    stepIndex = 2;
    humanBadge = '🟠 Cần bổ sung thông tin';
    humanSummary =
      latestClarificationQuestion ||
      'Hệ thống cần hỏi rõ thêm một chi tiết nhỏ trước khi lập trình. Bạn nhắn trả lời ngay trong luồng chat này nhé!';
  } else if (
    activeJob &&
    (activeJob.status === 'AWAITING_COMMIT_REVIEW' ||
      activeJob.status === 'AWAITING_DEPLOY_REVIEW' ||
      activeJob.executionPhase === 'IDE_COMMIT_HANDOFF' ||
      activeJob.executionPhase === 'DEPLOY_APPROVED' ||
      activeJob.executionPhase === 'DEPLOYING')
  ) {
    stage = 'AWAITING_RELEASE';
    stepIndex = 2;
    if (activeJob.executionPhase === 'DEPLOY_APPROVED' || activeJob.executionPhase === 'DEPLOYING') {
      humanBadge = '🚀 Đang đưa lên web chính thức';
      humanSummary =
        'Anh Danny đã duyệt xuất bản! Hệ thống đang cập nhật tính năng lên máy chủ chính thức (khoảng 1–2 phút)...';
    } else if (activeJob.status === 'AWAITING_DEPLOY_REVIEW' || activeJob.executionPhase === 'IDE_COMMIT_HANDOFF') {
      humanBadge = '🟡 Đã làm xong · Chờ duyệt lên sóng';
      humanSummary = activeJob.summary
        ? `Đã hoàn tất mã nguồn: ${activeJob.summary} — Đang chờ anh Danny bấm [Duyệt Deploy] để lên sóng.`
        : 'Đã hoàn tất mã nguồn và kiểm thử! Đang chờ anh Danny bấm [Duyệt Deploy] để đưa lên web.';
    } else {
      humanBadge = '🟡 Đã làm xong · Chờ anh Danny duyệt';
      humanSummary = activeJob.summary
        ? `Đã xây dựng xong bản thử nghiệm: ${activeJob.summary} — Chờ anh Danny kiểm tra và duyệt.`
        : 'Đã xây dựng và kiểm thử xong trên bản thử nghiệm! Đang chờ anh Danny duyệt.';
    }
  } else if (report.status === 'IN_PROGRESS' || (report.status === 'APPROVED' && isJobActivelyRunning)) {
    stage = 'BUILDING';
    stepIndex = 2;
    humanBadge = '⚡ Đang xây dựng tính năng';
    humanSummary =
      'Anh Danny đã duyệt Cổng 1 trên mOS Mission! Hệ thống đang lập trình và chạy kiểm thử tự động trong worktree riêng.';
  }

  const changedFiles = parseSafeStringList(activeJob?.changedFilesJson);
  const canApproveImplementation = report.status === 'NEW' || (report.status === 'APPROVED' && !isJobActivelyRunning);
  const canApproveCommit = Boolean(
    activeJob &&
    activeJob.status === 'AWAITING_COMMIT_REVIEW' &&
    activeJob.executionPhase === 'AWAITING_COMMIT_REVIEW' &&
    !activeJob.commitSha
  );
  const canApproveDeploy = Boolean(
    activeJob &&
    activeJob.status === 'AWAITING_DEPLOY_REVIEW' &&
    activeJob.executionPhase === 'AWAITING_DEPLOY_REVIEW' &&
    Boolean(activeJob.commitSha)
  );
  const canConfirmClose = report.status === 'FIXED';

  const updatedAtDate = activeJob && activeJob.updatedAt > report.updatedAt ? activeJob.updatedAt : report.updatedAt;
  const agentSummary = activeJob?.summary || report.resolution?.solutionSummary || null;
  const artifactPreview = buildMissionArtifactPreview(executionTrack, {
    changedFilesCount: changedFiles.length,
    diffStat: activeJob?.diffStat || null,
    summary: agentSummary,
    title: report.title,
  });

  return {
    reportId: report.id,
    key,
    missionKey: key,
    missionCode,
    requestType,
    executionTrack,
    artifactPreview,
    title: report.title,
    status: report.status,
    clarificationStatus: report.clarificationStatus,
    stage,
    stepIndex,
    humanBadge,
    stageLabel: humanBadge,
    humanSummary,
    humanStatusSummary: humanSummary,
    clarificationQuestion: latestClarificationQuestion,
    releaseUrl: report.resolution?.releaseUrl || null,
    reporterName,
    reporterStaffId: report.reporterStaffId,
    conversationId: context?.conversationId,
    messageId: context?.messageId,
    taskId: context?.taskId ?? null,
    updatedAt: updatedAtDate.toISOString(),
    canSuperAdminApproveCommit: canApproveCommit,
    canSuperAdminApproveDeploy: canApproveDeploy,
    canReporterAccept: report.status === 'FIXED',
    superAdminActions: {
      canApproveImplementation,
      canApproveCommit,
      canApproveDeploy,
      canConfirmClose,
      activeJobId: activeJob?.id || null,
      executionPhase: activeJob?.executionPhase || null,
      changedFilesCount: changedFiles.length,
      diffStat: activeJob?.diffStat || null,
      agentSummary: activeJob?.summary || report.resolution?.solutionSummary || null,
    },
    reporterActions: {
      canAcceptOrReopen: report.status === 'FIXED' || report.status === 'CLOSED',
    },
  };
}

function createMilestoneThreadReply(
  missionId: number,
  stage: MosChatMissionStage,
  text: string,
  now: Date = new Date(),
  syncedCommentId?: number
): MosChatThreadReply {
  return {
    id: `th-msn-${randomUUID().slice(0, 8)}`,
    senderId: 'mos-mission-bot',
    senderName: '🚀 mOS Mission',
    senderRole: 'Trợ lý Kỹ thuật',
    senderAvatar: '🚀',
    text,
    timeLabel: formatTimeLabel(now),
    createdAt: now.toISOString(),
    isMissionMilestone: true,
    missionStage: stage,
    missionId,
    syncedCommentId: syncedCommentId ?? null,
  };
}

async function convertChatAttachmentsToBugAttachments(
  attachments: MosChatImageAttachment[],
  mosChatMediaRootPath: string
): Promise<CreateBugReportAttachmentRequest[]> {
  const result: CreateBugReportAttachmentRequest[] = [];
  for (const att of attachments.slice(0, BUG_REPORT_MAX_ATTACHMENTS)) {
    if (!att?.url) continue;
    const match = att.url.trim().match(/^\/api\/chat\/media\/([a-f0-9-]{36}\.(?:jpg|png|webp|gif))$/i);
    if (!match) continue;
    const fileName = match[1];
    // BugReportStorage supports image/jpeg, image/png, image/webp
    const supportedMime =
      att.mimeType === 'image/jpeg' || att.mimeType === 'image/png' || att.mimeType === 'image/webp'
        ? att.mimeType
        : 'image/png';
    try {
      const targetPath = resolve(mosChatMediaRootPath, fileName);
      if (!targetPath.startsWith(`${mosChatMediaRootPath}${sep}`)) continue;
      const buffer = await readFile(targetPath);
      if (buffer.length <= 0 || buffer.length > 5 * 1024 * 1024) continue;
      result.push({
        fileName: att.name || fileName,
        mimeType: supportedMime,
        sizeBytes: buffer.length,
        dataBase64: buffer.toString('base64'),
      });
    } catch {
      // Ignore missing local media file
    }
  }
  return result;
}

export class ChatMissionBridgeService {
  /**
   * Synchronizes all linked mOS Missions into mOS Chat messages & tasks.
   * Appends human-friendly milestone messages into the Chat thread at the 4 key milestones
   * and marks linked Chat Tasks as Done when the Mission is Completed.
   */
  static async syncLinkedMissionsIntoChatState(
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

        msg.thread = msg.thread || [];
        msg.missionSyncedCommentIds = Array.isArray(msg.missionSyncedCommentIds) ? msg.missionSyncedCommentIds : [];

        // 1. Sync any new AGENT clarification question into the thread in plain human language
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

        // 2. Sync the 4 key human milestones into the thread when stage transitions
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
            const hasExistingReopenReply = msg.thread.some(
              (r) => r.isMissionMilestone && r.missionStage === 'RECEIVED'
            );
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

  /**
   * 1-Click Dispatch from mOS Chat Message / Thread / Task to mOS Mission.
   * Exclusively restricted to Super Admin Danny.
   * Bundles root message + all thread replies + all images, sets stakeholder reporter,
   * and automatically approves Gate 1 so AG can start immediately.
   */
  static async createMissionFromChat(
    fastify: FastifyInstance,
    user: JwtUserPayload,
    body: CreateMosChatMissionRequest,
    conversations: MosChatConversation[],
    tasks: MosChatTaskItem[],
    staffDirectory: MosChatStaffMember[],
    mosChatMediaRootPath: string
  ): Promise<{
    mission: MosChatMissionSummary;
    message: MosChatMessage;
    task: MosChatTaskItem | null;
  }> {
    if (!isDannyUser(user)) {
      throw new BugReportError('Chỉ Super Admin Danny mới có quyền gửi công việc vào mOS Mission.', 403);
    }

    const conv = conversations.find((c) => c.id === body.conversationId);
    if (!conv) {
      throw new BugReportError('Không tìm thấy cuộc trò chuyện trong mOS Chat.', 404);
    }

    let linkedTask: MosChatTaskItem | null = body.taskId ? tasks.find((t) => t.id === body.taskId) || null : null;

    let targetMsg: MosChatMessage | undefined = body.messageId
      ? conv.messages.find((m) => m.id === body.messageId)
      : linkedTask?.sourceMessageId
        ? conv.messages.find((m) => m.id === linkedTask?.sourceMessageId)
        : undefined;

    if (!targetMsg && linkedTask) {
      // Create a root message for orphan task if needed
      const now = new Date();
      targetMsg = {
        id: linkedTask.sourceMessageId || `msg-task-${randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: user.id,
        senderName: linkedTask.sourceAuthorName || linkedTask.creatorName || 'Danny Do',
        senderRole: 'Admin',
        text: linkedTask.title,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        taskId: linkedTask.id,
        reactions: {},
        thread: [],
      };
      conv.messages.push(targetMsg);
      linkedTask.sourceMessageId = targetMsg.id;
    }

    if (!targetMsg) {
      throw new BugReportError('Không tìm thấy tin nhắn hoặc công việc cần chuyển sang mOS Mission.', 404);
    }

    if (!linkedTask && targetMsg.taskId) {
      linkedTask = tasks.find((t) => t.id === targetMsg!.taskId) || null;
    }

    // Idempotent check: if already linked to a Mission, sync and return it
    const existingMissionId = targetMsg.missionId || linkedTask?.missionId;
    if (existingMissionId) {
      await this.syncLinkedMissionsIntoChatState(fastify, conversations, tasks);
      if (targetMsg.mission) {
        return {
          mission: targetMsg.mission,
          message: targetMsg,
          task: linkedTask,
        };
      }
    }

    const actorStaffId = Number(user.id) || 1;
    // Resolve stakeholder reporter (e.g., Bảo Hân in dm-pair-1-13)
    let reporterStaffId = actorStaffId;
    const msgSenderStaffId = Number(targetMsg.senderId);
    if (
      Number.isInteger(msgSenderStaffId) &&
      msgSenderStaffId > 0 &&
      staffDirectory.some((s) => s.id === msgSenderStaffId)
    ) {
      reporterStaffId = msgSenderStaffId;
    } else if (conv.type === 'dm' && !conv.isSelf) {
      const peerId =
        conv.participantStaffId && conv.participantStaffId !== actorStaffId
          ? conv.participantStaffId
          : (conv.memberIds || []).find((id) => id !== actorStaffId);
      if (peerId && staffDirectory.some((s) => s.id === Number(peerId))) {
        reporterStaffId = Number(peerId);
      }
    }

    // Verify reporterStaffId exists in DB, fallback to actorStaffId
    const verifiedReporter = await fastify.prisma.crm.crmStaff
      .findUnique({
        where: { id: reporterStaffId },
        select: { id: true, displayName: true },
      })
      .catch(() => null);
    if (!verifiedReporter) {
      reporterStaffId = actorStaffId;
    }

    const threadReplies = (targetMsg.thread || []).filter(
      (th) => !th.isDeleted && !th.isMissionMilestone && th.text?.trim()
    );

    // Combine all text from root message + thread replies + task title
    const rawRootText = (targetMsg.text || linkedTask?.title || '').trim();
    const threadTranscriptLines = threadReplies.map(
      (th) => `- **[${th.timeLabel}] ${th.senderName}:** ${th.text.trim()}`
    );

    const requestedTitle = (body.titleOverride || body.title || '').trim();
    const requestedNote = (body.dannyNote || body.note || '').trim();
    const requestedType = body.requestType || body.type;

    const combinedForInference = [requestedTitle, rawRootText, ...threadReplies.map((th) => th.text), requestedNote]
      .filter(Boolean)
      .join('\n');

    const requestType = inferRequestTypeFromText(combinedForInference, requestedType);
    const priority: BugPriority =
      body.priority || (linkedTask?.priority === 'URGENT' ? 'P0' : linkedTask?.priority === 'NORMAL' ? 'P2' : 'P1');

    const rawTitleSource = (requestedTitle || linkedTask?.title || rawRootText || 'Nhiệm vụ từ mOS Chat')
      .split('\n')[0]
      .trim();
    const title = rawTitleSource.slice(0, 180);

    const descriptionSections: string[] = [
      `### 💬 Nguồn yêu cầu từ mOS Chat (${conv.type === 'dm' ? `Trò chuyện với ${conv.name}` : `#${conv.name}`})`,
      `**Người khởi tạo / Phối hợp:** ${verifiedReporter?.displayName || targetMsg.senderName}`,
      `**Nội dung gốc ([${targetMsg.timeLabel}] ${targetMsg.senderName}):**\n${rawRootText}`,
    ];

    if (threadTranscriptLines.length > 0) {
      descriptionSections.push(
        `### 🧵 Chi tiết thảo luận trong Thread (${threadTranscriptLines.length} phản hồi)\n${threadTranscriptLines.join('\n')}`
      );
    }

    if (requestedNote) {
      descriptionSections.push(`### 👑 Chỉ đạo của Super Admin Danny\n${requestedNote}`);
    }

    const description = descriptionSections.join('\n\n---\n\n').slice(0, 2000);
    const searchNormalized = removeVietnameseTones(`${title} ${description} /dashboard/chat`);

    // Gather all attachments from root message + thread replies
    const chatAttachments: MosChatImageAttachment[] = [
      ...(targetMsg.attachments || []),
      ...threadReplies.flatMap((th) => th.attachments || []),
    ];
    const bugAttachments = await convertChatAttachmentsToBugAttachments(chatAttachments, mosChatMediaRootPath);

    const now = new Date();
    const createdReport = await fastify.prisma.crm.$transaction(async (tx) => {
      const report = await tx.crmBugReport.create({
        data: {
          reporterStaffId,
          requestType,
          title,
          description,
          searchNormalized,
          status: 'APPROVED',
          priority,
          statusSort: 0,
          prioritySort: priority === 'P0' ? 0 : priority === 'P1' ? 1 : priority === 'P2' ? 2 : 3,
          clarificationStatus: 'READY',
          clarificationSummary:
            `Nhiệm vụ được Super Admin Danny chọn trực tiếp từ mOS Chat (${conv.name}) với đầy đủ ngữ cảnh Thread.`.slice(
              0,
              1200
            ),
          clarifiedAt: now,
          businessContext: requestedNote || `Giao trực tiếp từ mOS Chat (${conv.name}).`,
          approvedByStaffId: actorStaffId,
          approvedAt: now,
          sourcePath: '/dashboard',
          contextJson: JSON.stringify({
            capturedAt: now.toISOString(),
            path: '/dashboard',
            query: { chatConvId: conv.id, chatMsgId: targetMsg.id },
            pageTitle: `mOS Chat · ${conv.name}`,
            overlays: ['mOS Chat'],
            themeMode: 'light',
            viewport: { width: 1920, height: 1080, devicePixelRatio: 2 },
            userAgent: 'mOS-Chat-Mission-Bridge/1.0',
            online: true,
            timeZone: 'Asia/Ho_Chi_Minh',
            webCommit: null,
            apiCommit: null,
            apiDeployedAt: null,
            recentApiFailures: [],
            recentClientErrors: [],
          }),
        },
      });

      await tx.crmBugReportAudit.create({
        data: {
          reportId: report.id,
          actorStaffId,
          action: 'CREATED',
          note: `Tạo nhiệm vụ mOS Mission trực tiếp từ mOS Chat (${conv.name}) và tự động duyệt Cổng 1.`,
          afterJson: JSON.stringify({
            status: report.status,
            priority: report.priority,
            clarificationStatus: report.clarificationStatus,
            chatConversationId: conv.id,
            chatMessageId: targetMsg.id,
          }),
        },
      });

      const planJobId = randomUUID();
      const eventKind = 'IMPLEMENTATION_APPROVAL';
      const eventVersion = inboxPlanEventVersion({ ...report, comments: [] }, eventKind);
      const sourceVersion = inboxImplementationSourceVersion({ ...report, comments: [] });
      const planDraft: InboxPlanDraft = {
        evidence: `Yêu cầu từ cuộc trò chuyện mOS Chat (${conv.name}) do ${verifiedReporter?.displayName || targetMsg.senderName} đề xuất và anh Danny chốt.`,
        expectedOutcome: title,
        scope: 'apps/web, apps/api, packages/shared',
        steps: [
          'Phân tích chi tiết yêu cầu và các ví dụ/hình ảnh đính kèm trong luồng mOS Chat.',
          'Triển khai logic backend/frontend và đồng bộ types trong @mos-lab/shared.',
          'Chạy kiểm thử tự động (pnpm verify:quick, pnpm check:ui-contract) và kiểm tra giao diện.',
        ],
        verification: 'pnpm verify:quick && pnpm check:ui-contract',
        risksAndRollback: 'Thay đổi cô lập trong worktree riêng; có thể rollback commit an toàn nếu cần.',
        approvalRequest:
          'Super Admin Danny đã duyệt Cổng 1 trực tiếp từ mOS Chat để chuyển vào hàng đợi thực thi của mOS Mission.',
      };
      const planVersion = inboxImplementationPlanVersion(sourceVersion, planDraft);

      await tx.crmInboxPlanJob.upsert({
        where: {
          reportId_eventVersion: {
            reportId: report.id,
            eventVersion,
          },
        },
        create: {
          id: planJobId,
          reportId: report.id,
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

      return report;
    });

    // Save image attachments if any
    for (const [index, att] of bugAttachments.entries()) {
      try {
        const stored = await BugReportStorage.save(createdReport.id, att);
        await fastify.prisma.crm.crmBugReportAttachment.create({
          data: {
            reportId: createdReport.id,
            originalName: (att.fileName || `anh-chat-${index + 1}`).slice(0, 255),
            mimeType: att.mimeType,
            sizeBytes: stored.sizeBytes,
            storagePath: stored.storagePath,
          },
        });
      } catch {
        // Ignore individual attachment failure so mission creation still succeeds
      }
    }

    // Automatically authorize Gate 1 in mOS Mission (AUTO mode routes to the configured mission worker)
    await InboxImplementationService.approve(fastify, createdReport.id, actorStaffId, undefined, 'AUTO');
    RequestClassifierWorkerHub.notify('inbox_implementation_available');

    const key = formatBugReportKey(createdReport.id, requestType);
    targetMsg.missionId = createdReport.id;
    targetMsg.missionKey = key;
    targetMsg.missionSyncedStage = 'BUILDING';
    targetMsg.missionSyncedCommentIds = [];
    targetMsg.thread = targetMsg.thread || [];

    const milestone1Text =
      `🚀 **Đã chuyển vào mOS Mission #MSN-${createdReport.id} (${key})**\n` +
      `Anh Danny đã chuyển yêu cầu này sang **mOS Mission** (đã gom trọn ${threadReplies.length} phản hồi trong luồng` +
      `${bugAttachments.length > 0 ? ` và ${bugAttachments.length} ảnh chụp màn hình` : ''}).\n` +
      `⚡ Đã duyệt Cổng 1 — Nhiệm vụ đang được xử lý tự động trên mOS Mission!`;

    targetMsg.thread.push(createMilestoneThreadReply(createdReport.id, 'BUILDING', milestone1Text, now));
    conv.updatedAt = now.toISOString();

    if (linkedTask) {
      linkedTask.missionId = createdReport.id;
      linkedTask.missionKey = key;
    }

    await this.syncLinkedMissionsIntoChatState(fastify, conversations, tasks);

    const missionSummary =
      targetMsg.mission ||
      buildMissionSummaryFromReport(
        {
          ...createdReport,
          reporter: verifiedReporter || { id: reporterStaffId, displayName: targetMsg.senderName },
          resolution: null,
          comments: [],
        },
        null,
        {
          conversationId: conv.id,
          messageId: targetMsg.id,
          taskId: linkedTask?.id ?? null,
        }
      );

    return {
      mission: missionSummary,
      message: targetMsg,
      task: linkedTask,
    };
  }

  /**
   * Two-way sync: When a user replies inside a Chat Thread that is linked to a mOS Mission,
   * automatically forward the comment (and any images) to CrmBugReportComment so AG reads it!
   */
  static async syncChatReplyToMission(
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

      // INVARIANT: Ordinary chat messages (e.g. "@Bảo Hân em kiểm tra xem...", "ok em", "cảm ơn anh")
      // must NEVER silently reopen or reset tickets to NEW, must NEVER wipe approvals,
      // and must NEVER automatically draft new plans or create new tasks!
      // Reopening is ONLY performed via explicit user action: executeMissionActionFromChat('REQUEST_REWORK')
      // (when user explicitly clicks "Chưa đạt / Yêu cầu làm lại" on the Live Mission Card).

      // Only enqueue follow-up clarification if the ticket was actively waiting for reporter clarification
      if (added?.report?.clarification?.status === 'WAITING_REPORTER') {
        if (await InboxFollowUpService.enqueue(fastify, missionId, 'REPORTER_COMMENT', added.report.updatedAt)) {
          RequestClassifierWorkerHub.notify('inbox_follow_up_available');
        }
      }

      // Only enqueue initial planning if the ticket is still in NEW (unapproved) state and READY
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
  static async executeMissionActionFromChat(
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
      rawAction === 'REPORTER_ACCEPT'
        ? 'ACCEPT_RESULT'
        : rawAction === 'REPORTER_REOPEN'
          ? 'REQUEST_REWORK'
          : rawAction;
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
          // Chat thread peer (e.g. Bảo Hân in DM where Danny authored the message)
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

      // Also append user's rework/upgrade note to the chat thread so everyone sees what needs adjusting
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

    await this.syncLinkedMissionsIntoChatState(fastify, conversations, tasks);

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
}
