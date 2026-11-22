import type { FastifyInstance } from 'fastify';
import type {
  BuzzMosChatMessageRequest,
  MosChatBuzzEvent,
  MosChatMessage,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { chatRealtimeHub } from '../chat-realtime.hub.js';
import { sendWebPushToStaffIds } from '../chat-web-push.service.js';
import { isDannyOrSuperAdminUser, resolveUserStaffId, canUserAccessConversation } from '../chat-access.service.js';
import { formatConversationForUser } from '../chat-format.service.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations } from '../chat-state-store.js';

export async function registerChatMessageEngagementRoutes(fastify: FastifyInstance) {
  // POST /api/chat/messages/:messageId/reaction
  fastify.post(
    '/chat/messages/:messageId/reaction',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as SafeAny).user as JwtUserPayload | undefined;
      const userKey = String(user?.id ?? 'me');
      const { messageId } = request.params as { messageId: string };
      const { conversationId, emoji, replyId } = request.body as {
        conversationId: string;
        emoji: string;
        replyId?: string;
      };
      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc trò chuyện' });
      }

      // Find target message: root message or thread reply
      let targetMsg: MosChatMessage | MosChatThreadReply | undefined;
      let targetParentMsg: MosChatMessage | undefined;
      const rootMsg = conv.messages.find((m) => m.id === messageId);
      if (rootMsg) {
        if (replyId) {
          targetMsg = (rootMsg.thread || []).find((r) => r.id === replyId);
          targetParentMsg = rootMsg;
        } else {
          targetMsg = rootMsg;
        }
      } else {
        // Fallback: check if messageId is directly a reply ID
        for (const m of conv.messages) {
          const replyItem = (m.thread || []).find((r) => r.id === messageId);
          if (replyItem) {
            targetMsg = replyItem;
            targetParentMsg = m;
            break;
          }
        }
      }

      if (!targetMsg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }
      targetMsg.reactions = targetMsg.reactions || {};
      targetMsg.reactionUsers = targetMsg.reactionUsers || {};

      const existingUsers = targetMsg.reactionUsers[emoji];
      const currentCount = targetMsg.reactions[emoji] || 0;

      if (Array.isArray(existingUsers)) {
        const normalized = existingUsers.map(String);
        if (normalized.includes(userKey)) {
          const remaining = normalized.filter((u) => u !== userKey);
          if (remaining.length === 0) {
            delete targetMsg.reactions[emoji];
            delete targetMsg.reactionUsers[emoji];
          } else {
            targetMsg.reactionUsers[emoji] = remaining;
            targetMsg.reactions[emoji] = remaining.length;
          }
        } else {
          const updated = [...normalized, userKey];
          targetMsg.reactionUsers[emoji] = updated;
          targetMsg.reactions[emoji] = updated.length;
        }
      } else if (currentCount > 0) {
        // Legacy reaction without per-user tracking (e.g. inflated count): clicking undoes/clears it
        delete targetMsg.reactions[emoji];
        delete targetMsg.reactionUsers[emoji];
      } else {
        targetMsg.reactionUsers[emoji] = [userKey];
        targetMsg.reactions[emoji] = 1;
      }

      conv.updatedAt = new Date().toISOString();
      await saveConversations(
        fastify,
        conversations,
        targetParentMsg
          ? {
              touchedConversation: conv,
              touchedReply: {
                conversationId: conv.id,
                parentMessageId: targetParentMsg.id,
                reply: targetMsg as MosChatThreadReply,
              },
            }
          : {
              touchedConversation: conv,
              touchedMessage: targetMsg as MosChatMessage,
            }
      );
      return { success: true, reactions: targetMsg.reactions, reactionUsers: targetMsg.reactionUsers };
    }
  );

  // POST /api/chat/messages/:messageId/pin
  fastify.post(
    '/chat/messages/:messageId/pin',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as SafeAny).user as JwtUserPayload | undefined;
      const { messageId } = request.params as { messageId: string };
      const { conversationId } = request.body as { conversationId: string };
      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === conversationId);
      const msg = conv?.messages.find((m) => m.id === messageId);
      if (!conv || !msg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }
      msg.pinned = !msg.pinned;
      conv.updatedAt = new Date().toISOString();
      await saveConversations(fastify, conversations, {
        touchedConversation: conv,
        touchedMessage: msg,
      });

      chatRealtimeHub.publish({
        type: 'MESSAGE_UPDATED',
        conversationId: conv.id,
        actorStaffId: user?.id,
        payload: {
          conversationId: conv.id,
          messageId: msg.id,
          pinned: msg.pinned,
          message: msg,
        },
      });

      return { success: true, pinned: msg.pinned, message: msg };
    }
  );

  // POST /api/chat/messages/:messageId/buzz (Buzz / Bump urgent message)
  fastify.post(
    '/chat/messages/:messageId/buzz',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { messageId } = request.params as { messageId: string };
      const body = ((request.body as SafeAny) || {}) as BuzzMosChatMessageRequest;
      const conversationId = String(body.conversationId || '').trim();
      const replyId = body.replyId ? String(body.replyId).trim() : undefined;
      const note = body.note ? String(body.note).trim() : undefined;

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      let conv = conversationId ? conversations.find((c) => c.id === conversationId) : undefined;
      if (!conv) {
        conv = conversations.find(
          (c) => c.messages.some((m) => m.id === messageId) && canUserAccessConversation(c, user, staffDirectory)
        );
      }
      const msg = conv?.messages.find((m) => m.id === messageId);
      if (!conv || !msg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn.' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn không có quyền truy cập cuộc hội thoại này.',
        });
      }

      const targetItem = replyId ? msg.thread?.find((r) => r.id === replyId) : msg;
      if (!targetItem) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy câu trả lời trong luồng.' });
      }

      const myStaffId = resolveUserStaffId(user, staffDirectory);
      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: myStaffId || Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true, avatarUrl: true },
      });
      const senderName = staffRecord?.displayName || user.displayName || user.username || 'Nhân sự';
      const senderRole = staffRecord?.role || user.role || 'Staff';

      const isSender =
        Number(targetItem.senderId) === myStaffId ||
        String(targetItem.senderId) === String(user.id) ||
        (user.id && String(targetItem.senderId) === 'me') ||
        Boolean(
          staffRecord?.displayName &&
          targetItem.senderName?.trim().toLowerCase() === staffRecord.displayName.trim().toLowerCase()
        );
      const isAdmin = isDannyOrSuperAdminUser(user) || user.role === 'admin';

      if (!isSender && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ người gửi tin nhắn hoặc Quản trị viên mới có thể Buzz / Bump tin nhắn này.',
        });
      }

      // Anti-spam Cooldown: 60 seconds between buzzes on the same message
      const now = new Date();
      if (targetItem.buzzedAt) {
        const lastBuzzTime = new Date(targetItem.buzzedAt).getTime();
        const diffSeconds = Math.floor((now.getTime() - lastBuzzTime) / 1000);
        const cooldownSeconds = 60;
        if (diffSeconds < cooldownSeconds) {
          const waitLeft = cooldownSeconds - diffSeconds;
          return reply.status(429).send({
            error: 'Too Many Requests',
            message: `Tin nhắn vừa được Buzz cách đây ${diffSeconds}s. Vui lòng chờ thêm ${waitLeft}s trước khi Buzz lại để tránh làm phiền đồng nghiệp.`,
            waitRemainingSeconds: waitLeft,
          });
        }
      }

      const buzzEvent: MosChatBuzzEvent = {
        id: `buzz-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        senderId: myStaffId || user.id || 'unknown',
        senderName,
        senderRole,
        senderAvatar: staffRecord?.avatarUrl || null,
        buzzedAt: now.toISOString(),
        note: note || null,
      };

      targetItem.isBuzzed = true;
      targetItem.buzzedAt = buzzEvent.buzzedAt;
      targetItem.latestBuzz = buzzEvent;
      targetItem.buzzHistory = [...(targetItem.buzzHistory || []), buzzEvent];
      targetItem.buzzCount = targetItem.buzzHistory.length;

      conv.updatedAt = now.toISOString();
      await saveConversations(
        fastify,
        conversations,
        replyId
          ? {
              touchedConversation: conv,
              touchedReply: {
                conversationId: conv.id,
                parentMessageId: msg.id,
                reply: targetItem as MosChatThreadReply,
              },
            }
          : {
              touchedConversation: conv,
              touchedMessage: msg,
            }
      );

      const buzzTargets = new Set<string>();
      if (conv.participantStaffId != null) buzzTargets.add(String(conv.participantStaffId));
      for (const mId of conv.memberIds || []) buzzTargets.add(String(mId));
      buzzTargets.delete(String(myStaffId || user.id || ''));
      if (buzzTargets.size > 0) {
        const preview = String(targetItem.text || 'Tin nhắn khẩn cấp').slice(0, 90);
        void sendWebPushToStaffIds(fastify, Array.from(buzzTargets), {
          title: `⚡ BUZZ khẩn từ ${senderName}`,
          body: note ? `${note} — "${preview}"` : preview,
          icon: '/apple-touch-icon.png',
          badge: '/icon-192.png',
          tag: `mos-chat-buzz-${messageId}`,
          renotify: true,
          requireInteraction: true,
          vibrate: [250, 120, 250, 120, 350],
          data: {
            type: 'CHAT_BUZZ',
            conversationId: conv.id,
            url: `/chat?convId=${encodeURIComponent(conv.id)}&msgId=${encodeURIComponent(messageId)}`,
          },
        });
      }

      const formattedConv = formatConversationForUser(conv, user, staffDirectory);
      const formattedMsg = formattedConv.messages.find((m) => m.id === messageId) || msg;

      return {
        success: true,
        message: formattedMsg,
        buzzEvent,
        conversation: formattedConv,
      };
    }
  );
}
