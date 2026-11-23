import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import {
  type CreateMosChatThreadReplyRequest,
  type MosChatUserSidebarPrefs,
  type MoveMosChatThreadItemRequest,
  resolveBestSourceMessageForTaskChecklist,
  sortChecklistItemsByDeadline,
  summarizeAndExtractChecklistFromText,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { ChatMissionBridgeService } from '../chat-mission-bridge.service.js';
import { chatRealtimeHub } from '../chat-realtime.hub.js';
import { dispatchChatMessageWebPush } from '../chat-web-push.service.js';
import { mosChatMediaRoot, sanitizeChatAttachments } from '../chat-file.service.js';
import {
  isDannyOrSuperAdminUser,
  canUserAccessConversation,
  matchesStaffGroupBackend,
  resolveUserPrefKey,
} from '../chat-access.service.js';
import {
  formatTimeLabel,
  getRoleDisplayLabel,
  getInitials,
  formatConversationForUser,
} from '../chat-format.service.js';
import { buildDefaultUserSidebarPrefs } from '../chat-state-defaults.js';
import { moveChatThreadItemInMemory } from '../chat-thread-task-helpers.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveUserSidebarPrefs, saveConversations, saveTasks } from '../chat-state-store.js';

export async function registerChatThreadRoutes(fastify: FastifyInstance) {
  // POST /api/chat/threads
  fastify.post(
    '/chat/threads',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as CreateMosChatThreadReplyRequest;
      const text = String(body?.text || '').trim();
      const customerCard = body?.customerCard || undefined;
      const sendText = text || (customerCard?.name ? `Đính kèm thẻ khách hàng ${customerCard.name}` : '');
      const attachments = sanitizeChatAttachments(body?.attachments);
      if (!body?.conversationId || !body?.messageId || (!sendText && attachments.length === 0 && !customerCard)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu nội dung phản hồi luồng' });
      }

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === body.conversationId);
      const msg = conv?.messages.find((m) => m.id === body.messageId);
      if (!conv || !msg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn gốc' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true, avatarUrl: true },
      });
      const senderName = staffRecord?.displayName || user.username || 'mOS User';
      const roleInfo = getRoleDisplayLabel(staffRecord?.role || user.role);
      const now = new Date();

      const isAiBot = Boolean(body.isAiBot);
      msg.thread = msg.thread || [];

      if (isAiBot) {
        const cleanText = text.trim();
        const existingReply = msg.thread.find(
          (r) =>
            (r.isAiBot || r.senderId === 'wings-ai-copilot') &&
            (r.text.trim() === cleanText ||
              r.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') === cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
            Math.abs(now.getTime() - new Date(r.createdAt).getTime()) < 60_000
        );
        if (existingReply) {
          if (body.aiThinking && !existingReply.aiThinking) {
            existingReply.aiThinking = String(body.aiThinking).slice(0, 4000);
          }
          if (body.aiAction && !existingReply.aiAction) {
            existingReply.aiAction = body.aiAction;
          }
          if (body.aiActions && !existingReply.aiActions) {
            existingReply.aiActions = body.aiActions;
          }
          await saveConversations(fastify, conversations, {
            touchedConversation: conv,
            touchedReply: {
              conversationId: conv.id,
              parentMessageId: msg.id,
              reply: existingReply,
            },
          });
          return {
            success: true,
            reply: existingReply,
            conversation: formatConversationForUser(conv, user, staffDirectory),
          };
        }
      }
      const replyItem = {
        id: `th-${crypto.randomUUID().slice(0, 8)}`,
        senderId: isAiBot ? 'wings-ai-copilot' : user.id,
        senderName: isAiBot ? '🤖 MAI' : senderName,
        senderRole: isAiBot ? 'mOS AI' : roleInfo.label,
        senderAvatar: isAiBot ? 'MAI' : staffRecord?.avatarUrl || getInitials(senderName, user.username),
        roleColor: isAiBot ? '#8b5cf6' : roleInfo.color,
        text: sendText,
        attachments: attachments.length > 0 ? attachments : undefined,
        customerCard: customerCard || undefined,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        isAiBot: isAiBot || undefined,
        aiThinking: body.aiThinking ? String(body.aiThinking).slice(0, 4000) : null,
        aiAction: body.aiAction || null,
        aiActions: body.aiActions || null,
      };
      msg.thread.push(replyItem);
      conv.updatedAt = now.toISOString();

      if (msg.missionId) {
        await ChatMissionBridgeService.syncChatReplyToMission(fastify, user, msg, replyItem, mosChatMediaRoot());
      }

      await saveConversations(fastify, conversations, {
        touchedConversation: conv,
        touchedReply: {
          conversationId: conv.id,
          parentMessageId: msg.id,
          reply: replyItem,
        },
      });

      chatRealtimeHub.publish({
        type: 'THREAD_REPLY_CREATED',
        conversationId: conv.id,
        actorStaffId: user.id,
        payload: {
          conversationId: conv.id,
          messageId: msg.id,
          reply: replyItem,
        },
      });

      // Advance sender's read count for this sub-thread in userPrefs
      const userPrefKey = resolveUserPrefKey(user, staffDirectory);
      const { userPrefsByUserKey, accessConfig } = await loadChatState(fastify);
      const currentSenderPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
      const threadKey = `${conv.id}::${msg.id}`;
      const updatedSenderPrefs: MosChatUserSidebarPrefs = {
        ...currentSenderPrefs,
        readThreadReplyCountByMsg: {
          ...(currentSenderPrefs.readThreadReplyCountByMsg || {}),
          [threadKey]: msg.thread.length,
        },
        readThreadAtByMsg: {
          ...(currentSenderPrefs.readThreadAtByMsg || {}),
          [threadKey]: now.toISOString(),
        },
        lastReadThreadReplyIdByMsg: {
          ...(currentSenderPrefs.lastReadThreadReplyIdByMsg || {}),
          [threadKey]: replyItem.id,
        },
      };
      await saveUserSidebarPrefs(fastify, userPrefKey, updatedSenderPrefs);

      void dispatchChatMessageWebPush(fastify, {
        conv,
        senderUser: user,
        senderName: replyItem.senderName || senderName,
        messageId: replyItem.id,
        threadRootMessageId: msg.id,
        text: replyItem.text,
        customerCardName: replyItem.customerCard?.name || null,
        attachmentCount: replyItem.attachments?.length || 0,
        staffDirectory,
        accessConfig,
        userPrefsByUserKey,
      });

      return { success: true, reply: replyItem, message: msg };
    }
  );

  // POST /api/chat/threads/:messageId/extract-checklist
  fastify.post(
    '/chat/threads/:messageId/extract-checklist',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { messageId } = request.params as { messageId: string };
      const body = (request.body || {}) as { conversationId?: string; taskId?: string };
      const user = request.user as JwtUserPayload;

      const [{ conversations, tasks }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);

      const linkedTask = body.taskId ? tasks.find((t) => t.id === body.taskId) : null;
      let targetConv = conversations.find((c) => c.messages.some((m) => m.id === messageId));
      if (!targetConv && body.conversationId) {
        targetConv = conversations.find((c) => c.id === body.conversationId);
      }
      if (!targetConv && linkedTask?.conversationId) {
        targetConv = conversations.find((c) => c.id === linkedTask.conversationId);
      }
      if (!targetConv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }
      if (!canUserAccessConversation(targetConv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập hội thoại này' });
      }

      const targetMsg = resolveBestSourceMessageForTaskChecklist(targetConv, {
        task: linkedTask,
        messageId: messageId && messageId !== 'auto' ? messageId : linkedTask?.sourceMessageId || null,
      });
      if (!targetMsg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn gốc' });
      }

      const { summary, suggestions } = summarizeAndExtractChecklistFromText({
        rootText: targetMsg.text,
        rootSenderName: targetMsg.senderName,
        rootSenderId: targetMsg.senderId,
        referenceDate: targetMsg.createdAt || new Date(),
        replies: targetMsg.thread || [],
      });

      return {
        success: true,
        summary,
        suggestions: sortChecklistItemsByDeadline(suggestions),
      };
    }
  );

  // POST /api/chat/threads/move (Merge root message into subthread, promote reply to root, or move reply between threads)
  fastify.post(
    '/chat/threads/move',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as MoveMosChatThreadItemRequest;
      const conversationId = String(body?.conversationId || '').trim();
      const sourceMessageId = String(body?.sourceMessageId || '').trim();
      const mode = body?.mode;
      const replyId = body?.replyId ? String(body.replyId).trim() : null;
      const targetMessageId = body?.targetMessageId ? String(body.targetMessageId).trim() : null;

      if (!conversationId || !sourceMessageId || !mode) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Thiếu thông tin luồng cần di chuyển (conversationId, sourceMessageId, mode).',
        });
      }

      const [{ conversations, tasks, userPrefsByUserKey }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === conversationId);
      const sourceMsg = conv?.messages.find((m) => m.id === sourceMessageId);
      if (!conv || !sourceMsg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn nguồn.' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn không có quyền truy cập cuộc trò chuyện này.',
        });
      }

      const itemToMove = replyId ? sourceMsg.thread?.find((r) => r.id === replyId) : sourceMsg;
      if (!itemToMove) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nội dung cần di chuyển.' });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true },
      });
      const effectiveRole = String(staffRecord?.role || user.role || '').toLowerCase();
      const normUserId = String(user.id || '')
        .replace(/^staff-/, '')
        .trim();
      const normItemSenderId = String(itemToMove.senderId || '')
        .replace(/^staff-/, '')
        .trim();
      const normSourceSenderId = String(sourceMsg.senderId || '')
        .replace(/^staff-/, '')
        .trim();
      const isOwner =
        Boolean(normUserId && normItemSenderId === normUserId) ||
        Boolean(normUserId && normSourceSenderId === normUserId) ||
        (Boolean(user.id) && String(itemToMove.senderId) === 'me') ||
        Boolean(
          staffRecord?.displayName &&
          (itemToMove.senderName === staffRecord.displayName || sourceMsg.senderName === staffRecord.displayName)
        );

      const staffMemberInDir = staffDirectory.find(
        (s) => Number(s.id) === Number(user.id) || (normUserId && String(s.id) === normUserId)
      );
      const isAdminOrManager =
        isDannyOrSuperAdminUser(user) ||
        ['admin', 'manager', 'super_admin', 'oc'].includes(effectiveRole) ||
        Boolean(staffMemberInDir && matchesStaffGroupBackend(staffMemberInDir, 'TEAM_ADMIN_MANAGER'));

      if (!isOwner && !isAdminOrManager) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ người gửi tin nhắn, Quản lý/Admin hoặc Super Admin mới có thể gộp/tách luồng.',
        });
      }

      let moveResult: ReturnType<typeof moveChatThreadItemInMemory>;
      try {
        moveResult = moveChatThreadItemInMemory(conv, tasks, {
          mode,
          sourceMessageId,
          replyId,
          targetMessageId,
        });
      } catch (err: SafeAny) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: err?.message || 'Không thể thực hiện di chuyển luồng.',
        });
      }

      if (moveResult.targetMessage?.missionId && moveResult.movedReplies.length > 0) {
        for (const movedReply of moveResult.movedReplies) {
          await ChatMissionBridgeService.syncChatReplyToMission(
            fastify,
            user,
            moveResult.targetMessage,
            movedReply,
            mosChatMediaRoot()
          );
        }
        await ChatMissionBridgeService.syncLinkedMissionsIntoChatState(fastify, conversations, tasks);
      }

      await saveConversations(fastify, conversations, {
        deletedMessageIds: moveResult.deletedMessageIds,
      });
      if (moveResult.tasksChanged || moveResult.targetMessage?.missionId) {
        await saveTasks(fastify, tasks);
      }

      const userPrefKey = resolveUserPrefKey(user, staffDirectory);
      const currentSenderPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
      if (moveResult.targetMessage) {
        const threadKey = `${conv.id}::${moveResult.targetMessage.id}`;
        const targetThread = moveResult.targetMessage.thread || [];
        const lastReply = targetThread[targetThread.length - 1];
        const updatedSenderPrefs: MosChatUserSidebarPrefs = {
          ...currentSenderPrefs,
          readThreadReplyCountByMsg: {
            ...(currentSenderPrefs.readThreadReplyCountByMsg || {}),
            [threadKey]: targetThread.length,
          },
          readThreadAtByMsg: {
            ...(currentSenderPrefs.readThreadAtByMsg || {}),
            [threadKey]: new Date().toISOString(),
          },
          lastReadThreadReplyIdByMsg: lastReply
            ? {
                ...(currentSenderPrefs.lastReadThreadReplyIdByMsg || {}),
                [threadKey]: lastReply.id,
              }
            : currentSenderPrefs.lastReadThreadReplyIdByMsg,
        };
        userPrefsByUserKey[userPrefKey] = updatedSenderPrefs;
        await saveUserSidebarPrefs(fastify, userPrefKey, updatedSenderPrefs);
      }

      return {
        success: true,
        mode,
        conversation: formatConversationForUser(
          conv,
          user,
          staffDirectory,
          userPrefsByUserKey[userPrefKey] || currentSenderPrefs,
          userPrefsByUserKey
        ),
        targetMessage: moveResult.targetMessage,
        promotedMessage: moveResult.promotedMessage,
        tasks,
      };
    }
  );
}
