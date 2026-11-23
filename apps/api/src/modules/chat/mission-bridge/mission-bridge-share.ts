import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  formatBugReportKey,
  isAdminOrSuperAdminRole,
  isCvRole,
  type MosChatConversation,
  type MosChatMessage,
  type MosChatMissionSummary,
  type MosChatStaffMember,
  type MosChatTaskItem,
  type ShareMosChatMissionRequest,
  type ShareMosChatMissionResultItem,
  type SharedMosChatMissionPreview,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../../middlewares/auth.js';
import { BugReportError } from '../../bug-reports/bug-report.service.js';
import { canUserAccessConversation, resolveUserStaffId } from '../chat-access.service.js';
import { getInitials, getRoleDisplayLabel } from '../chat-format.service.js';
import { ChatTargetResolutionError, resolveTargetChatConversations } from '../chat-target-resolver.js';
import { buildMissionSummaryFromReport, formatTimeLabel } from './mission-bridge-summary.js';

async function loadReportAndJob(fastify: FastifyInstance, reportId: number) {
  const report = await fastify.prisma.crm.crmBugReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      requestType: true,
      title: true,
      description: true,
      status: true,
      sourcePath: true,
      clarificationStatus: true,
      clarificationSummary: true,
      implementationApprovedAt: true,
      implementationActiveJobId: true,
      reporterStaffId: true,
      createdAt: true,
      updatedAt: true,
      reporter: { select: { id: true, displayName: true } },
      resolution: {
        select: { solutionSummary: true, verificationSummary: true, releaseUrl: true },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, authorType: true, kind: true, body: true, createdAt: true },
      },
    },
  });

  if (!report) {
    throw new BugReportError('Không tìm thấy yêu cầu cần chia sẻ.', 404);
  }

  let activeJob: {
    id: string;
    status: string;
    executionPhase: string | null;
    commitSha: string | null;
    changedFilesJson: string | null;
    diffStat: string | null;
    summary: string | null;
    progressLabel: string | null;
    updatedAt: Date;
  } | null = null;

  if (report.implementationActiveJobId && fastify.prisma.crm.crmInboxImplementationJob) {
    activeJob = await fastify.prisma.crm.crmInboxImplementationJob
      .findUnique({
        where: { id: report.implementationActiveJobId },
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
      .catch(() => null);
  }

  return { report, activeJob };
}

/**
 * Shares an existing Bug Report / Feature Request into one or more mOS Chat conversations
 * as a live mOS Mission card (Instagram-style multi-target share).
 */
export async function shareMissionToChat(
  fastify: FastifyInstance,
  user: JwtUserPayload,
  body: ShareMosChatMissionRequest,
  conversations: MosChatConversation[],
  staffDirectory: MosChatStaffMember[]
): Promise<{
  mission: MosChatMissionSummary;
  results: ShareMosChatMissionResultItem[];
  deliveries: Array<{ conv: MosChatConversation; message: MosChatMessage }>;
  cleanNote: string | null;
  senderName: string;
  nowIso: string;
}> {
  if (isCvRole(user.role)) {
    throw new BugReportError('Tài khoản Chuyên Viên không có quyền chia sẻ yêu cầu.', 403);
  }

  const reportId = Number(body?.reportId);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    throw new BugReportError('Mã yêu cầu không hợp lệ.', 400);
  }

  const rawTargetConversationIds = Array.isArray(body?.targetConversationIds)
    ? body.targetConversationIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  const rawTargetStaffIds = Array.isArray(body?.targetStaffIds)
    ? body.targetStaffIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  if (rawTargetConversationIds.length === 0 && rawTargetStaffIds.length === 0) {
    throw new BugReportError('Vui lòng chọn ít nhất một người nhận hoặc nhóm chat.', 400);
  }

  const { report, activeJob } = await loadReportAndJob(fastify, reportId);
  const myStaffId = resolveUserStaffId(user, staffDirectory);
  const isAdmin = isAdminOrSuperAdminRole(user.role);

  if (!isAdmin && report.reporterStaffId !== myStaffId) {
    throw new BugReportError('Bạn chỉ có thể chia sẻ yêu cầu của chính mình hoặc khi có quyền mOS Mission.', 403);
  }

  const now = new Date();
  const nowIso = now.toISOString();

  let resolvedTargets: Array<{ conv: MosChatConversation; createdNewConversation: boolean }>;
  try {
    resolvedTargets = resolveTargetChatConversations({
      conversations,
      user,
      staffDirectory,
      targetConversationIds: rawTargetConversationIds,
      targetStaffIds: rawTargetStaffIds,
      nowIso,
    });
  } catch (err) {
    if (err instanceof ChatTargetResolutionError) {
      throw new BugReportError(err.message, err.statusCode);
    }
    throw err;
  }

  const staffRecord = await fastify.prisma.crm.crmStaff
    .findUnique({
      where: { id: Number(user.id) || 0 },
      select: { displayName: true, username: true, role: true, avatarUrl: true },
    })
    .catch(() => null);

  const senderName = staffRecord?.displayName || user.username || 'mOS User';
  const roleInfo = getRoleDisplayLabel(staffRecord?.role || user.role);
  const senderAvatar = staffRecord?.avatarUrl || getInitials(senderName, user.username);
  const cleanNote = body.note ? String(body.note).trim().slice(0, 2000) : null;

  const baseSummary = buildMissionSummaryFromReport(report, activeJob);
  const results: ShareMosChatMissionResultItem[] = [];
  const deliveries: Array<{ conv: MosChatConversation; message: MosChatMessage }> = [];

  for (const target of resolvedTargets) {
    const msgId = `msg-share-${crypto.randomUUID().slice(0, 8)}`;
    const perMessageSummary: MosChatMissionSummary = {
      ...baseSummary,
      conversationId: target.conv.id,
      messageId: msgId,
      taskId: null,
    };

    const newMessage: MosChatMessage = {
      id: msgId,
      conversationId: target.conv.id,
      senderId: user.id,
      senderName,
      senderRole: roleInfo.label,
      senderAvatar,
      roleColor: roleInfo.color,
      text: cleanNote || '',
      timeLabel: formatTimeLabel(now),
      createdAt: nowIso,
      reactions: {},
      missionId: report.id,
      missionKey: perMessageSummary.key,
      mission: perMessageSummary,
      isSharedMission: true,
      thread: [],
    };

    target.conv.messages = target.conv.messages || [];
    target.conv.messages.push(newMessage);
    target.conv.updatedAt = nowIso;

    deliveries.push({ conv: target.conv, message: newMessage });
    results.push({
      conversationId: target.conv.id,
      conversationName: target.conv.name,
      conversationType: target.conv.type,
      message: newMessage,
      createdNewConversation: target.createdNewConversation,
    });
  }

  return {
    mission: baseSummary,
    results,
    deliveries,
    cleanNote,
    senderName,
    nowIso,
  };
}

/**
 * Returns a read-only preview of a shared ticket for mOS Chat participants
 * who may not have full `/dashboard/bug-reports` admin permissions.
 */
export async function getSharedMissionPreview(
  fastify: FastifyInstance,
  user: JwtUserPayload,
  reportId: number,
  conversations: MosChatConversation[],
  tasks: MosChatTaskItem[],
  staffDirectory: MosChatStaffMember[]
): Promise<SharedMosChatMissionPreview> {
  if (isCvRole(user.role)) {
    throw new BugReportError('Tài khoản Chuyên Viên không có quyền xem chi tiết yêu cầu.', 403);
  }
  if (!Number.isInteger(reportId) || reportId <= 0) {
    throw new BugReportError('Mã yêu cầu không hợp lệ.', 400);
  }

  const { report, activeJob } = await loadReportAndJob(fastify, reportId);
  const myStaffId = resolveUserStaffId(user, staffDirectory);
  const isAdmin = isAdminOrSuperAdminRole(user.role);
  const isReporter = report.reporterStaffId === myStaffId;

  const isVisibleInAccessibleChat =
    conversations.some(
      (conv) =>
        canUserAccessConversation(conv, user, staffDirectory) &&
        (conv.messages || []).some((m) => !m.isDeleted && Number(m.missionId) === reportId)
    ) ||
    tasks.some((t) => {
      if (Number(t.missionId) !== reportId) return false;
      const conv = conversations.find((c) => c.id === t.conversationId);
      return conv ? canUserAccessConversation(conv, user, staffDirectory) : false;
    });

  if (!isAdmin && !isReporter && !isVisibleInAccessibleChat) {
    throw new BugReportError('Bạn không có quyền xem yêu cầu này.', 403);
  }

  const requestType: 'BUG' | 'FEATURE' = report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG';
  const summary = buildMissionSummaryFromReport(report, activeJob);

  return {
    reportId: report.id,
    key: formatBugReportKey(report.id, requestType),
    missionCode: summary.missionCode,
    requestType,
    title: report.title,
    description: report.description || '',
    status: report.status,
    sourcePath: report.sourcePath || '',
    reporterStaffId: report.reporterStaffId,
    reporterName: report.reporter?.displayName || null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    resolutionSummary: report.resolution?.solutionSummary || null,
    releaseUrl: report.resolution?.releaseUrl || null,
    mission: summary,
  };
}
