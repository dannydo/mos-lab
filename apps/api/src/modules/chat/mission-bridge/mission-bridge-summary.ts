import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import {
  BUG_REPORT_MAX_ATTACHMENTS,
  formatBugReportKey,
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
  type BugReportRequestType,
  type CreateBugReportAttachmentRequest,
  type MosChatImageAttachment,
  type MosChatMissionArtifactPreview,
  type MosChatMissionExecutionTrack,
  type MosChatMissionStage,
  type MosChatMissionSummary,
  type MosChatThreadReply,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../../middlewares/auth.js';

export function formatTimeLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function isDannyUser(user?: JwtUserPayload | null): boolean {
  if (!user) return false;
  return (isSuperAdminRole(user.role) && isCanonicalSuperAdminIdentity(user)) || Number(user.id) === 1;
}

export function inferRequestTypeFromText(text: string, explicit?: 'BUG' | 'FEATURE'): BugReportRequestType {
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

  const rawReportUpdated = report.updatedAt ? new Date(report.updatedAt) : new Date();
  const rawJobUpdated = activeJob?.updatedAt ? new Date(activeJob.updatedAt) : null;
  const updatedAtDate = rawJobUpdated && rawJobUpdated > rawReportUpdated ? rawJobUpdated : rawReportUpdated;
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

export function createMilestoneThreadReply(
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

export async function convertChatAttachmentsToBugAttachments(
  attachments: MosChatImageAttachment[],
  mosChatMediaRootPath: string
): Promise<CreateBugReportAttachmentRequest[]> {
  const result: CreateBugReportAttachmentRequest[] = [];
  for (const att of attachments.slice(0, BUG_REPORT_MAX_ATTACHMENTS)) {
    if (!att?.url) continue;
    const match = att.url.trim().match(/^\/api\/chat\/media\/([a-f0-9-]{36}\.(?:jpg|png|webp|gif))$/i);
    if (!match) continue;
    const fileName = match[1];
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
