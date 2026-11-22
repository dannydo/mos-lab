import type { FastifyInstance } from 'fastify';
import type {
  DeleteMosChatMessageRequest,
  EditMosChatMessageRequest,
  MosChatThreadReply,
  RestoreMosChatMessageRequest,
  SafeAny,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { chatRealtimeHub } from '../chat-realtime.hub.js';
import { isDannyOrSuperAdminUser, canUserEditChatMessage, canUserAccessConversation } from '../chat-access.service.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations } from '../chat-state-store.js';

export async function registerChatMessageEditDeleteRoutes(fastify: FastifyInstance) {
  // PUT /api/chat/messages/:messageId (Edit message with audit history)
  fastify.put(
    '/chat/messages/:messageId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { messageId } = request.params as { messageId: string };
      const body = request.body as EditMosChatMessageRequest;
      const conversationId = String(body?.conversationId || '').trim();
      const newText = String(body?.text || '').trim();
      const replyId = body?.replyId ? String(body.replyId).trim() : undefined;

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
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }

      // Check if target is thread reply or root message
      const targetItem = replyId ? msg.thread?.find((r) => r.id === replyId) : msg;
      if (!targetItem) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy câu trả lời trong luồng' });
      }

      if (targetItem.isDeleted) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Không thể chỉnh sửa tin nhắn đã bị xoá' });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true },
      });
      const editorName = staffRecord?.displayName || user.username || 'mOS User';

      const isOwner = canUserEditChatMessage(targetItem, user, staffRecord);

      if (!isOwner) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình.',
        });
      }

      if (!newText && (!targetItem.attachments || targetItem.attachments.length === 0)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nội dung tin nhắn không được để trống' });
      }

      const now = new Date();
      targetItem.editHistory = targetItem.editHistory || [];
      targetItem.editHistory.push({
        text: targetItem.text,
        editedAt: now.toISOString(),
        editedBy: user.id,
        editorName,
      });
      targetItem.text = newText;
      targetItem.editedAt = now.toISOString();
      targetItem.editedBy = user.id;

      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations, {
        touchedConversation: conv,
        touchedMessage: msg,
        touchedReply: replyId
          ? {
              conversationId: conv.id,
              parentMessageId: msg.id,
              reply: targetItem as MosChatThreadReply,
            }
          : undefined,
      });

      chatRealtimeHub.publish({
        type: 'MESSAGE_UPDATED',
        conversationId: conv.id,
        actorStaffId: user.id,
        payload: {
          conversationId: conv.id,
          messageId: msg.id,
          replyId,
          target: targetItem,
          message: msg,
        },
      });

      return { success: true, message: msg, target: targetItem };
    }
  );

  // DELETE /api/chat/messages/:messageId (Soft delete with full history preservation)
  fastify.delete(
    '/chat/messages/:messageId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { messageId } = request.params as { messageId: string };
      const body = ((request.body as SafeAny) || {}) as DeleteMosChatMessageRequest;
      const query = ((request.query as SafeAny) || {}) as DeleteMosChatMessageRequest;
      const conversationId = String(body.conversationId || query.conversationId || '').trim();
      const replyId = body.replyId || query.replyId ? String(body.replyId || query.replyId).trim() : undefined;

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
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }

      const targetItem = replyId ? msg.thread?.find((r) => r.id === replyId) : msg;
      if (!targetItem) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy câu trả lời trong luồng' });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true },
      });
      const deleterName = staffRecord?.displayName || user.username || 'mOS User';

      const isOwner =
        String(targetItem.senderId) === String(user.id) ||
        (user.id && String(targetItem.senderId) === 'me') ||
        (staffRecord?.displayName && targetItem.senderName === staffRecord.displayName);
      const isAdmin = isDannyOrSuperAdminUser(user);

      if (!isOwner && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn chỉ có thể xoá tin nhắn của chính mình.',
        });
      }

      const now = new Date();
      if (!targetItem.isDeleted) {
        targetItem.originalText = targetItem.originalText || targetItem.text;
        targetItem.editHistory = targetItem.editHistory || [];
        targetItem.isDeleted = true;
        targetItem.deletedAt = now.toISOString();
        targetItem.deletedBy = user.id;
        targetItem.deletedByName = deleterName;
      }

      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations, {
        touchedConversation: conv,
        touchedMessage: msg,
        touchedReply: replyId
          ? {
              conversationId: conv.id,
              parentMessageId: msg.id,
              reply: targetItem as MosChatThreadReply,
            }
          : undefined,
      });

      chatRealtimeHub.publish({
        type: 'MESSAGE_DELETED',
        conversationId: conv.id,
        actorStaffId: user.id,
        payload: {
          conversationId: conv.id,
          messageId: msg.id,
          replyId,
          target: targetItem,
          message: msg,
        },
      });

      return { success: true, message: msg, target: targetItem };
    }
  );

  // POST /api/chat/messages/:messageId/restore (Restore soft-deleted message)
  fastify.post(
    '/chat/messages/:messageId/restore',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { messageId } = request.params as { messageId: string };
      const body = ((request.body as SafeAny) || {}) as RestoreMosChatMessageRequest;
      const query = ((request.query as SafeAny) || {}) as RestoreMosChatMessageRequest;
      const conversationId = String(body.conversationId || query.conversationId || '').trim();
      const replyId = body.replyId || query.replyId ? String(body.replyId || query.replyId).trim() : undefined;

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
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }

      const targetItem = replyId ? msg.thread?.find((r) => r.id === replyId) : msg;
      if (!targetItem) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy câu trả lời trong luồng' });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true },
      });
      const restorerName = staffRecord?.displayName || user.username || 'mOS User';

      const isOwner =
        String(targetItem.senderId) === String(user.id) ||
        (user.id && String(targetItem.senderId) === 'me') ||
        (staffRecord?.displayName && targetItem.senderName === staffRecord.displayName);
      const isAdmin = isDannyOrSuperAdminUser(user);

      if (!isOwner && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn chỉ có thể khôi phục tin nhắn của chính mình.',
        });
      }

      const now = new Date();
      targetItem.isDeleted = false;
      targetItem.deletedAt = null;
      targetItem.deletedBy = null;
      targetItem.deletedByName = null;
      if (targetItem.originalText && (!targetItem.text || targetItem.text.trim() === '')) {
        targetItem.text = targetItem.originalText;
      }

      targetItem.editHistory = targetItem.editHistory || [];
      targetItem.editHistory.push({
        text: targetItem.text,
        editedAt: now.toISOString(),
        editedBy: user.id,
        editorName: `${restorerName} (Đã khôi phục tin nhắn)`,
      });

      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations, {
        touchedConversation: conv,
        touchedMessage: msg,
        touchedReply: replyId
          ? {
              conversationId: conv.id,
              parentMessageId: msg.id,
              reply: targetItem as MosChatThreadReply,
            }
          : undefined,
      });

      chatRealtimeHub.publish({
        type: 'MESSAGE_UPDATED',
        conversationId: conv.id,
        actorStaffId: user.id,
        payload: {
          conversationId: conv.id,
          messageId: msg.id,
          replyId,
          target: targetItem,
          message: msg,
          restored: true,
        },
      });

      return { success: true, message: msg, target: targetItem };
    }
  );
}
