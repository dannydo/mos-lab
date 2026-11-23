import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  AI_COPILOT_CONV_ID,
  formatBugReportKey,
  isAiCopilotConversationId,
  removeVietnameseTones,
  type BugPriority,
  type CreateMosChatMissionRequest,
  type InboxPlanDraft,
  type MosChatConversation,
  type MosChatImageAttachment,
  type MosChatMessage,
  type MosChatMissionSummary,
  type MosChatStaffMember,
  type MosChatTaskItem,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../../middlewares/auth.js';
import { parseSessionMetadata, withMissionLink } from '../../ai/ai-session-access.js';
import { BugReportError } from '../../bug-reports/bug-report.service.js';
import { BugReportStorage } from '../../bug-reports/bug-report.storage.js';
import { InboxImplementationService } from '../../bug-reports/inbox-implementation.service.js';
import {
  inboxImplementationPlanVersion,
  inboxImplementationSourceVersion,
} from '../../bug-reports/inbox-implementation-version.js';
import { inboxPlanEventVersion } from '../../bug-reports/inbox-plan.service.js';
import { RequestClassifierWorkerHub } from '../../bug-reports/request-classifier-worker-hub.js';
import { ChatGoogleWorkspaceService } from '../chat-google-workspace.service.js';
import {
  buildMissionSummaryFromReport,
  convertChatAttachmentsToBugAttachments,
  createMilestoneThreadReply,
  formatTimeLabel,
  inferRequestTypeFromText,
  isDannyUser,
} from './mission-bridge-summary.js';
import { syncLinkedMissionsIntoChatState } from './mission-bridge-sync.js';

/**
 * 1-Click Dispatch from mOS Chat Message / Thread / Task to mOS Mission.
 * Exclusively restricted to Super Admin Danny.
 * Bundles root message + all thread replies + all images, sets stakeholder reporter,
 * and automatically approves Gate 1 so AG can start immediately.
 */
export async function createMissionFromChat(
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

  const isAiConv = isAiCopilotConversationId(body.conversationId);
  let conv = conversations.find((c) => c.id === body.conversationId);
  if (!conv && isAiConv) {
    conv = {
      id: body.conversationId,
      name: '🤖 MAI',
      type: 'dm',
      roleTag: 'mOS AI',
      color: '#8b5cf6',
      unreadCount: 0,
      messages: body.sourceMessage ? [body.sourceMessage] : [],
      updatedAt: new Date().toISOString(),
    };
  }
  if (!conv) {
    throw new BugReportError('Không tìm thấy cuộc trò chuyện trong mOS Chat.', 404);
  }

  let linkedTask: MosChatTaskItem | null = body.taskId ? tasks.find((t) => t.id === body.taskId) || null : null;

  let targetMsg: MosChatMessage | undefined = body.messageId
    ? conv.messages.find((m) => m.id === body.messageId)
    : linkedTask?.sourceMessageId
      ? conv.messages.find((m) => m.id === linkedTask?.sourceMessageId)
      : undefined;

  if (!targetMsg && body.sourceMessage) {
    targetMsg = body.sourceMessage;
    if (!conv.messages.some((m) => m.id === targetMsg!.id)) {
      conv.messages.push(targetMsg);
    }
  }

  if (!targetMsg && isAiConv && body.messageId && fastify?.prisma?.crm?.crmAiChatMessage) {
    const aiRecord = await fastify.prisma.crm.crmAiChatMessage
      .findFirst({
        where: { id: body.messageId },
      })
      .catch(() => null);
    if (aiRecord) {
      targetMsg = {
        id: aiRecord.id,
        conversationId: conv.id,
        senderId: aiRecord.role === 'assistant' ? 'wings-ai-copilot' : String(user.id),
        senderName: aiRecord.role === 'assistant' ? '🤖 MAI' : user.displayName || user.username || 'Danny Do',
        senderRole: aiRecord.role === 'assistant' ? 'mOS AI' : 'Super Admin',
        text: aiRecord.content,
        timeLabel: formatTimeLabel(aiRecord.createdAt),
        createdAt: aiRecord.createdAt.toISOString(),
        reactions: {},
        thread: [],
      };
      conv.messages.push(targetMsg);
    }
  }

  if (!targetMsg && linkedTask) {
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

  if (!targetMsg && isAiConv) {
    const now = new Date();
    targetMsg = {
      id: body.messageId || `msg-ai-${randomUUID().slice(0, 8)}`,
      conversationId: conv.id,
      senderId: 'wings-ai-copilot',
      senderName: '🤖 MAI',
      senderRole: 'mOS AI',
      text: (body.title || body.note || 'Nhiệm vụ từ 🤖 MAI').trim(),
      timeLabel: formatTimeLabel(now),
      createdAt: now.toISOString(),
      reactions: {},
      thread: [],
    };
    conv.messages.push(targetMsg);
  }

  if (!targetMsg) {
    throw new BugReportError('Không tìm thấy tin nhắn hoặc công việc cần chuyển sang mOS Mission.', 404);
  }

  if (!linkedTask && targetMsg.taskId) {
    linkedTask = tasks.find((t) => t.id === targetMsg!.taskId) || null;
  }

  const existingMissionId = targetMsg.missionId || linkedTask?.missionId;
  if (existingMissionId) {
    await syncLinkedMissionsIntoChatState(fastify, conversations, tasks);
    if (targetMsg.mission) {
      return {
        mission: targetMsg.mission,
        message: targetMsg,
        task: linkedTask,
      };
    }
  }

  const actorStaffId = Number(user.id) || 1;
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

  let aiSessionId: string | undefined;
  if (isAiConv) {
    const hinted = typeof body.aiSessionId === 'string' ? body.aiSessionId.trim() : '';
    if (/^[A-Za-z0-9_-]{8,64}$/.test(hinted)) aiSessionId = hinted;
    if (fastify?.prisma?.crm?.crmAiChatMessage) {
      const aiMsgRecord = await fastify.prisma.crm.crmAiChatMessage
        .findFirst({ where: { id: targetMsg.id }, select: { sessionId: true } })
        .catch(() => null);
      if (aiMsgRecord?.sessionId) aiSessionId = aiMsgRecord.sessionId;
    }
  }

  const descriptionSections: string[] = [
    `### 💬 Nguồn yêu cầu từ mOS Chat (${isAiConv ? 'Trò chuyện với 🤖 MAI' : conv.type === 'dm' ? `Trò chuyện với ${conv.name}` : `#${conv.name}`})`,
    `**Người khởi tạo / Phối hợp:** ${verifiedReporter?.displayName || targetMsg.senderName}`,
    `**Nội dung gốc ([${targetMsg.timeLabel}] ${targetMsg.senderName}):**\n${rawRootText}`,
  ];

  if (aiSessionId) {
    descriptionSections.push(
      `**🔗 Phiên hội thoại MAI (perm link):** /chat?convId=${AI_COPILOT_CONV_ID}&sessionId=${aiSessionId}`
    );
  }

  if (threadTranscriptLines.length > 0) {
    descriptionSections.push(
      `### 🧵 Chi tiết thảo luận trong Thread (${threadTranscriptLines.length} phản hồi)\n${threadTranscriptLines.join('\n')}`
    );
  }

  if (requestedNote) {
    descriptionSections.push(`### 👑 Chỉ đạo của Super Admin Danny\n${requestedNote}`);
  }

  try {
    const workspaceSnapshot = await ChatGoogleWorkspaceService.buildMissionSnapshotMarkdown({
      text: combinedForInference,
      viewer: {
        id: user.id,
        role: user.role,
        username: user.username,
        displayName: user.displayName,
      },
      sender: {
        id: targetMsg.senderId,
        role: targetMsg.senderRole,
        displayName: targetMsg.senderName,
      },
    });
    if (workspaceSnapshot) {
      descriptionSections.push(workspaceSnapshot);
    }
  } catch {
    // non-blocking
  }

  const description = descriptionSections.join('\n\n---\n\n').slice(0, 8000);
  const searchNormalized = removeVietnameseTones(`${title} ${description} /dashboard/chat`);

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
          query: {
            chatConvId: conv.id,
            chatMsgId: targetMsg.id,
            ...(aiSessionId ? { chatSessionId: aiSessionId } : {}),
          },
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
          ...(aiSessionId ? { chatSessionId: aiSessionId } : {}),
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

  if (aiSessionId && fastify?.prisma?.crm?.crmAiChatSession) {
    try {
      const sessionRow = await fastify.prisma.crm.crmAiChatSession.findFirst({ where: { id: aiSessionId } });
      if (sessionRow) {
        await fastify.prisma.crm.crmAiChatSession.update({
          where: { id: sessionRow.id },
          data: {
            metadataJson: JSON.stringify(
              withMissionLink(parseSessionMetadata(sessionRow.metadataJson), createdReport.id)
            ),
          },
        });
      }
    } catch (err) {
      fastify.log?.warn?.({ err, aiSessionId }, 'Could not link MAI session to mission (non-blocking)');
    }
  }

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

  await syncLinkedMissionsIntoChatState(fastify, conversations, tasks);

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
