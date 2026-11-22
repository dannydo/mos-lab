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
  resolveUserStaffId,
  resolveDmParticipantIds,
  canUserAccessConversation,
  resolveUserPrefKey,
} from '../chat-access.service.js';
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

        const myStaffId = resolveUserStaffId(user, staffDirectory);
        const now = new Date();
        const nowIso = now.toISOString();

        const resolvedTargetsMap = new Map<string, { conv: MosChatConversation; createdNewConversation: boolean }>();

        for (const targetConvId of rawTargetConversationIds) {
          if (resolvedTargetsMap.has(targetConvId)) continue;
          const targetConv = conversations.find((c) => c.id === targetConvId);
          if (!targetConv) {
            return reply.status(404).send({
              error: 'Not Found',
              message: `Không tìm thấy cuộc hội thoại đích (${targetConvId}).`,
            });
          }
          if (!canUserAccessConversation(targetConv, user, staffDirectory)) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: `Bạn không có quyền gửi tin nhắn vào "${targetConv.name}".`,
            });
          }
          resolvedTargetsMap.set(targetConv.id, { conv: targetConv, createdNewConversation: false });
        }

        for (const targetStaffId of rawTargetStaffIds) {
          const staffTarget = staffDirectory.find((s) => Number(s.id) === targetStaffId);
          if (!staffTarget) {
            return reply.status(404).send({
              error: 'Not Found',
              message: `Không tìm thấy nhân sự đích (#${targetStaffId}).`,
            });
          }
          if (myStaffId <= 0) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'Không xác định được tài khoản người gửi để tạo cuộc trò chuyện 1-1.',
            });
          }

          if (targetStaffId === myStaffId) {
            const selfId = `dm-self-${myStaffId}`;
            let selfConv = conversations.find(
              (c) => c.id === selfId || (c.type === 'dm' && c.isSelf && Number(c.participantStaffId) === myStaffId)
            );
            let createdNew = false;
            if (!selfConv) {
              const displayName = staffTarget.displayName || user.username || 'Tôi';
              selfConv = {
                id: selfId,
                type: 'dm',
                name: `${displayName} (Ghi chú cho tôi)`,
                subtitle: 'Không gian lưu trữ ghi chú, hình ảnh & task cá nhân',
                roleTag: 'Cá nhân',
                color: '#6366f1',
                avatar: 'ME',
                isSelf: true,
                participantStaffId: myStaffId,
                memberIds: [myStaffId],
                memberCount: 1,
                unreadCount: 0,
                updatedAt: nowIso,
                messages: [],
              };
              conversations.unshift(selfConv);
              createdNew = true;
            }
            if (!resolvedTargetsMap.has(selfConv.id)) {
              resolvedTargetsMap.set(selfConv.id, { conv: selfConv, createdNewConversation: createdNew });
            }
            continue;
          }

          const pairIds = [Math.min(myStaffId, targetStaffId), Math.max(myStaffId, targetStaffId)];
          let existingDm = conversations.find((c) => {
            if (c.type !== 'dm' || c.isSelf) return false;
            const cIds = resolveDmParticipantIds(c, staffDirectory);
            return cIds.length === 2 && cIds.includes(myStaffId) && cIds.includes(targetStaffId);
          });
          let createdNew = false;
          if (!existingDm) {
            const peerRole = getRoleDisplayLabel(staffTarget.role);
            existingDm = {
              id: `dm-pair-${pairIds[0]}-${pairIds[1]}`,
              type: 'dm',
              name: staffTarget.displayName || staffTarget.username || `Nhân sự #${targetStaffId}`,
              subtitle: peerRole.label || 'Trò chuyện trực tiếp 1-1',
              roleTag: peerRole.label || '1-1',
              color: peerRole.color || '#10b981',
              avatar: staffTarget.avatarUrl || getInitials(staffTarget.displayName, staffTarget.username),
              memberCount: 2,
              participantStaffId: targetStaffId,
              memberIds: pairIds,
              unreadCount: 0,
              updatedAt: nowIso,
              messages: [],
            };
            conversations.unshift(existingDm);
            createdNew = true;
          }
          if (!resolvedTargetsMap.has(existingDm.id)) {
            resolvedTargetsMap.set(existingDm.id, { conv: existingDm, createdNewConversation: createdNew });
          }
        }

        const resolvedTargets = Array.from(resolvedTargetsMap.values());
        if (resolvedTargets.length === 0) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Không có phòng đích hợp lệ để chuyển tiếp.',
          });
        }
        if (resolvedTargets.length > 20) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Chỉ có thể chuyển tiếp tối đa 20 nơi nhận trong một lần.',
          });
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

        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        let updatedSenderPrefs: MosChatUserSidebarPrefs = {
          ...(userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs()),
        };
        const nextReadCountByConv = { ...(updatedSenderPrefs.readMessageCountByConv || {}) };
        const nextReadAtByConv = { ...(updatedSenderPrefs.readAtByConv || {}) };
        const nextLastReadMsgByConv = { ...(updatedSenderPrefs.lastReadMessageIdByConv || {}) };
        const nextReadThreadCountByMsg = { ...(updatedSenderPrefs.readThreadReplyCountByMsg || {}) };
        const nextReadThreadAtByMsg = { ...(updatedSenderPrefs.readThreadAtByMsg || {}) };
        const nextLastReadThreadReplyByMsg = { ...(updatedSenderPrefs.lastReadThreadReplyIdByMsg || {}) };
        const targetConvIdSet = new Set(resolvedTargets.map((t) => t.conv.id));

        for (let i = 0; i < resolvedTargets.length; i++) {
          const targetConv = resolvedTargets[i].conv;
          const forwardedMsg = results[i].message;
          nextReadCountByConv[targetConv.id] = targetConv.messages.length;
          nextReadAtByConv[targetConv.id] = nowIso;
          nextLastReadMsgByConv[targetConv.id] = forwardedMsg.id;

          if (forwardedMsg.thread && forwardedMsg.thread.length > 0) {
            const threadKey = `${targetConv.id}::${forwardedMsg.id}`;
            const lastReply = forwardedMsg.thread[forwardedMsg.thread.length - 1];
            nextReadThreadCountByMsg[threadKey] = forwardedMsg.thread.length;
            nextReadThreadCountByMsg[forwardedMsg.id] = forwardedMsg.thread.length;
            nextReadThreadAtByMsg[threadKey] = nowIso;
            nextReadThreadAtByMsg[forwardedMsg.id] = nowIso;
            if (lastReply?.id) {
              nextLastReadThreadReplyByMsg[threadKey] = lastReply.id;
              nextLastReadThreadReplyByMsg[forwardedMsg.id] = lastReply.id;
            }
          }
        }

        updatedSenderPrefs = {
          ...updatedSenderPrefs,
          manualUnreadIds: (updatedSenderPrefs.manualUnreadIds || []).filter((id) => !targetConvIdSet.has(id)),
          readMessageCountByConv: nextReadCountByConv,
          readAtByConv: nextReadAtByConv,
          lastReadMessageIdByConv: nextLastReadMsgByConv,
          readThreadReplyCountByMsg: nextReadThreadCountByMsg,
          readThreadAtByMsg: nextReadThreadAtByMsg,
          lastReadThreadReplyIdByMsg: nextLastReadThreadReplyByMsg,
        };
        userPrefsByUserKey[userPrefKey] = updatedSenderPrefs;
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
