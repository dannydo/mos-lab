import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import type {
  CreateMosChatMessageRequest,
  ForwardMosChatMessageRequest,
  ForwardMosChatMessageResultItem,
  MosChatConversation,
  MosChatMessage,
  MosChatQuotedMessage,
  MosChatThreadReply,
  MosChatUserSidebarPrefs,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { chatRealtimeHub } from '../chat-realtime.hub.js';
import { dispatchChatMessageWebPush } from '../chat-web-push.service.js';
import { withChatMutationLock } from '../chat-repository.service.js';
import { buildForwardedChatMessage } from '../chat-forward.service.js';
import { sanitizeChatAttachments } from '../chat-file.service.js';
import {
  canUserAccessConversation,
  resolveUserPrefKey,
} from '../chat-access.service.js';
import {
  advanceSenderReadPrefsForTargets,
  ChatTargetResolutionError,
  resolveTargetChatConversations,
} from '../chat-target-resolver.js';
import {
  formatTimeLabel,
  getRoleDisplayLabel,
  getInitials,
  formatConversationForUser,
} from '../chat-format.service.js';
import { buildDefaultUserSidebarPrefs } from '../chat-state-defaults.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveUserSidebarPrefs, saveConversations } from '../chat-state-store.js';

export async function registerChatMessageSendForwardRoutes(fastify: FastifyInstance) {
  // POST /api/chat/messages
  fastify.post(
    '/chat/messages',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as CreateMosChatMessageRequest;
      const text = String(body?.text || '').trim();
      const attachments = sanitizeChatAttachments(body?.attachments);
      if (!body?.conversationId || (!text && !body?.customerCard && attachments.length === 0)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu nội dung tin nhắn hoặc hình ảnh' });
      }

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === body.conversationId);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
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

      const fallbackText =
        text ||
        (body.customerCard?.name ? `Đính kèm hồ sơ ${body.customerCard.name}` : attachments.length > 0 ? '' : '');

      const isAiBot = Boolean(body.isAiBot);
      if (isAiBot) {
        const cleanText = fallbackText.trim();
        const existingMsg = conv.messages
          .slice(-10)
          .find(
            (m) =>
              (m.isAiBot || m.senderId === 'wings-ai-copilot') &&
              (m.text.trim() === cleanText ||
                m.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') === cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
              Math.abs(now.getTime() - new Date(m.createdAt).getTime()) < 60_000
          );
        if (existingMsg) {
          if (body.aiThinking && !existingMsg.aiThinking) {
            existingMsg.aiThinking = String(body.aiThinking).slice(0, 4000);
          }
          if (body.aiAction && !existingMsg.aiAction) {
            existingMsg.aiAction = body.aiAction;
          }
          await saveConversations(fastify, conversations, {
            touchedConversation: conv,
            touchedMessage: existingMsg,
          });
          return {
            success: true,
            message: existingMsg,
            conversation: formatConversationForUser(conv, user, staffDirectory),
          };
        }
      }
      const replyToId = body.replyToId ? String(body.replyToId).trim() : null;
      let replyToData: MosChatQuotedMessage | null = body.replyTo || null;
      if (replyToId && !replyToData) {
        const found = conv.messages.find((m) => m.id === replyToId);
        if (found) {
          replyToData = {
            id: found.id,
            senderId: found.senderId,
            senderName: found.senderName,
            senderAvatar: found.senderAvatar,
            text: found.text,
          };
        }
      }

      const newMessage = {
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: isAiBot ? 'wings-ai-copilot' : user.id,
        senderName: isAiBot ? '🤖 MAI' : senderName,
        senderRole: isAiBot ? 'mOS AI' : roleInfo.label,
        senderAvatar: isAiBot ? 'MAI' : staffRecord?.avatarUrl || getInitials(senderName, user.username),
        roleColor: isAiBot ? '#8b5cf6' : roleInfo.color,
        text: fallbackText,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        replyToId: replyToId || undefined,
        replyTo: replyToData || undefined,
        reactions: {},
        customerCard: body.customerCard || null,
        attachments: attachments.length > 0 ? attachments : undefined,
        thread: [],
        isAiBot: isAiBot || undefined,
        aiThinking: body.aiThinking ? String(body.aiThinking).slice(0, 4000) : null,
        aiAction: body.aiAction || null,
      };

      conv.messages.push(newMessage);
      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations, {
        touchedConversation: conv,
        touchedMessage: newMessage,
      });

      chatRealtimeHub.publish({
        type: 'MESSAGE_CREATED',
        conversationId: conv.id,
        actorStaffId: user.id,
        payload: {
          conversationId: conv.id,
          message: newMessage,
        },
      });

      // Advance sender's read count for this conversation in userPrefs
      const userPrefKey = resolveUserPrefKey(user, staffDirectory);
      const { userPrefsByUserKey, accessConfig } = await loadChatState(fastify);
      const currentSenderPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
      const updatedSenderPrefs: MosChatUserSidebarPrefs = {
        ...currentSenderPrefs,
        manualUnreadIds: (currentSenderPrefs.manualUnreadIds || []).filter((id) => id !== conv.id),
        readMessageCountByConv: {
          ...(currentSenderPrefs.readMessageCountByConv || {}),
          [conv.id]: conv.messages.length,
        },
        readAtByConv: {
          ...(currentSenderPrefs.readAtByConv || {}),
          [conv.id]: now.toISOString(),
        },
        lastReadMessageIdByConv: {
          ...(currentSenderPrefs.lastReadMessageIdByConv || {}),
          [conv.id]: newMessage.id,
        },
      };
      const savedPrefs = await saveUserSidebarPrefs(fastify, userPrefKey, updatedSenderPrefs);

      void dispatchChatMessageWebPush(fastify, {
        conv,
        senderUser: user,
        senderName: newMessage.senderName || senderName,
        messageId: newMessage.id,
        text: newMessage.text,
        customerCardName: newMessage.customerCard?.name || null,
        attachmentCount: newMessage.attachments?.length || 0,
        staffDirectory,
        accessConfig,
        userPrefsByUserKey,
      });

      return {
        success: true,
        message: newMessage,
        conversation: formatConversationForUser(conv, user, staffDirectory, savedPrefs, userPrefsByUserKey),
      };
    }
  );

  // POST /api/chat/messages/forward
  fastify.post(
    '/chat/messages/forward',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = (request.body || {}) as ForwardMosChatMessageRequest;
      const sourceConversationId = String(body?.sourceConversationId || '').trim();
      const sourceMessageId = String(body?.sourceMessageId || '').trim();
      const sourceReplyId = body?.sourceReplyId ? String(body.sourceReplyId).trim() : null;
      const rawTargetConversationIds = Array.isArray(body?.targetConversationIds)
        ? body.targetConversationIds.map((id) => String(id || '').trim()).filter(Boolean)
        : [];
      const rawTargetStaffIds = Array.isArray(body?.targetStaffIds)
        ? body.targetStaffIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0)
        : [];

      if (!sourceConversationId || !sourceMessageId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Thiếu thông tin tin nhắn nguồn cần chuyển tiếp (sourceConversationId, sourceMessageId).',
        });
      }
      if (rawTargetConversationIds.length === 0 && rawTargetStaffIds.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Vui lòng chọn ít nhất một nơi nhận tin nhắn chuyển tiếp.',
        });
      }

      return withChatMutationLock(async () => {
        const [{ conversations, userPrefsByUserKey, accessConfig }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);

        const sourceConv = conversations.find((c) => c.id === sourceConversationId);
        if (!sourceConv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại nguồn.' });
        }
        if (!canUserAccessConversation(sourceConv, user, staffDirectory)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Bạn không có quyền truy cập cuộc hội thoại nguồn này.',
          });
        }

        const sourceMsg = (sourceConv.messages || []).find((m) => m.id === sourceMessageId);
        if (!sourceMsg) {
          return reply
            .status(404)
            .send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn nguồn cần chuyển tiếp.' });
        }
        if (sourceMsg.isDeleted) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Không thể chuyển tiếp tin nhắn đã bị xóa.' });
        }

        let sourceReply: MosChatThreadReply | null = null;
        if (sourceReplyId) {
          sourceReply = (sourceMsg.thread || []).find((r) => r.id === sourceReplyId) || null;
          if (!sourceReply) {
            return reply.status(404).send({
              error: 'Not Found',
              message: 'Không tìm thấy phản hồi trong luồng cần chuyển tiếp.',
            });
          }
          if (sourceReply.isDeleted) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'Không thể chuyển tiếp phản hồi đã bị xóa.',
            });
          }
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
            return reply.status(err.statusCode).send({
              error: err.statusCode === 403 ? 'Forbidden' : err.statusCode === 404 ? 'Not Found' : 'Bad Request',
              message: err.message,
            });
          }
          throw err;
        }

        const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: Number(user.id) || 0 },
          select: { displayName: true, username: true, role: true, avatarUrl: true },
        });
        const senderName = staffRecord?.displayName || user.username || 'mOS User';
        const roleInfo = getRoleDisplayLabel(staffRecord?.role || user.role);
        const forwarderAvatar = staffRecord?.avatarUrl || getInitials(senderName, user.username);

        const includeThread = sourceReply ? false : body.includeThread !== false;
        const cleanNote = body.note ? String(body.note).trim().slice(0, 2000) : null;

        const results: ForwardMosChatMessageResultItem[] = [];
        const touchedMessagesWithThreads: Array<{
          conversation: MosChatConversation;
          message: MosChatMessage;
        }> = [];

        for (const target of resolvedTargets) {
          const built = buildForwardedChatMessage({
            sourceConv,
            sourceMsg,
            sourceReply,
            includeThread,
            targetConversationId: target.conv.id,
            forwarder: {
              id: user.id,
              name: senderName,
              roleLabel: roleInfo.label,
              roleColor: roleInfo.color,
              avatar: forwarderAvatar,
            },
            note: cleanNote,
            now,
          });

          target.conv.messages = target.conv.messages || [];
          target.conv.messages.push(built.message);
          target.conv.updatedAt = nowIso;

          touchedMessagesWithThreads.push({
            conversation: target.conv,
            message: built.message,
          });

          results.push({
            conversationId: target.conv.id,
            conversationName: target.conv.name,
            conversationType: target.conv.type,
            message: built.message,
            forwardedThreadCount: built.forwardedThreadCount,
            createdNewConversation: target.createdNewConversation,
          });
        }

        await saveConversations(fastify, conversations, {
          touchedMessagesWithThreads,
        });

        const { userPrefKey, updatedSenderPrefs } = advanceSenderReadPrefsForTargets({
          user,
          staffDirectory,
          userPrefsByUserKey,
          deliveries: resolvedTargets.map((t, i) => ({ conv: t.conv, message: results[i].message })),
          nowIso,
        });
        const savedPrefs = await saveUserSidebarPrefs(fastify, userPrefKey, updatedSenderPrefs);

        for (let i = 0; i < resolvedTargets.length; i++) {
          const targetConv = resolvedTargets[i].conv;
          const forwardedMsg = results[i].message;
          const threadCount = results[i].forwardedThreadCount;

          chatRealtimeHub.publish({
            type: 'MESSAGE_CREATED',
            conversationId: targetConv.id,
            actorStaffId: user.id,
            payload: {
              conversationId: targetConv.id,
              message: forwardedMsg,
            },
          });

          const pushPieces: string[] = [];
          if (cleanNote) pushPieces.push(cleanNote);
          pushPieces.push(
            threadCount > 0
              ? `↪ Đã chuyển tiếp tin nhắn (kèm ${threadCount} phản hồi trong luồng):`
              : '↪ Đã chuyển tiếp tin nhắn:'
          );
          if (forwardedMsg.text) pushPieces.push(forwardedMsg.text);

          void dispatchChatMessageWebPush(fastify, {
            conv: targetConv,
            senderUser: user,
            senderName: forwardedMsg.senderName || senderName,
            messageId: forwardedMsg.id,
            text: pushPieces.join(' ').trim(),
            customerCardName: forwardedMsg.customerCard?.name || null,
            attachmentCount: forwardedMsg.attachments?.length || 0,
            staffDirectory,
            accessConfig,
            userPrefsByUserKey,
          });
        }

        return {
          success: true,
          results,
          updatedConversations: resolvedTargets.map((t) =>
            formatConversationForUser(t.conv, user, staffDirectory, savedPrefs, userPrefsByUserKey)
          ),
          userPrefs: savedPrefs,
        };
      });
    }
  );
}
