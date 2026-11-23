import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import type {
  CreateMosChatConversationRequest,
  MosChatConversation,
  MosChatStaffMember,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import {
  resolveUserStaffId,
  resolveDmParticipantIds,
  computeUnreadCountForUser,
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

export async function registerChatConversationReadPinRoutes(fastify: FastifyInstance) {
  // POST /api/chat/conversations
  fastify.post(
    '/chat/conversations',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as CreateMosChatConversationRequest;
      const rawName = String(body?.name || '').trim();
      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const myStaffId = resolveUserStaffId(user, staffDirectory);
      const now = new Date();

      // 1. Self Chat ("Chat với chính tôi" / Ghi chú cá nhân)
      if (body.isSelf || (body.type === 'dm' && Number(body.participantStaffId) === myStaffId && myStaffId > 0)) {
        const selfOwnerId = myStaffId || Number(user.id) || 0;
        const selfId = `dm-self-${selfOwnerId}`;
        const existingSelf = conversations.find(
          (c) => c.id === selfId || (c.type === 'dm' && c.isSelf && Number(c.participantStaffId) === selfOwnerId)
        );
        if (existingSelf) {
          return {
            success: true,
            conversation: formatConversationForUser(existingSelf, user, staffDirectory),
          };
        }
        const selfStaff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: selfOwnerId },
          select: { id: true, displayName: true, username: true, role: true, avatarUrl: true },
        });
        const displayName = selfStaff?.displayName || user.username || 'Tôi';
        const selfConv: MosChatConversation = {
          id: selfId,
          type: 'dm',
          name: `${displayName} (Ghi chú cho tôi)`,
          subtitle: 'Không gian lưu trữ ghi chú, hình ảnh & task cá nhân',
          roleTag: 'Cá nhân',
          color: '#6366f1',
          avatar: 'ME',
          isSelf: true,
          participantStaffId: selfOwnerId,
          memberIds: selfOwnerId > 0 ? [selfOwnerId] : [],
          memberCount: 1,
          unreadCount: 0,
          updatedAt: now.toISOString(),
          messages: [
            {
              id: `msg-${crypto.randomUUID().slice(0, 8)}`,
              conversationId: selfId,
              senderId: user.id,
              senderName: 'Hệ thống mOS',
              senderRole: 'Trợ lý cá nhân',
              senderAvatar: '📌',
              roleColor: '#6366f1',
              text: 'Chào mừng bạn đến với không gian cá nhân! Bạn có thể lưu trữ ghi chú, dán hình ảnh, gửi tài liệu và tạo task nhắc hẹn cho chính mình tại đây.',
              timeLabel: formatTimeLabel(now),
              createdAt: now.toISOString(),
              reactions: {},
              thread: [],
              isSystemReminder: true,
            },
          ],
        };
        conversations.unshift(selfConv);
        await saveConversations(fastify, conversations);
        return {
          success: true,
          conversation: formatConversationForUser(selfConv, user, staffDirectory),
        };
      }

      if (!rawName) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tên cuộc trò chuyện' });
      }

      // 2. Direct 1-1 Chat between strictly 2 participants: [myStaffId, peerStaffId]
      if (body.type === 'dm') {
        let peerStaffId = Number(body.participantStaffId) || 0;
        if (peerStaffId <= 0 && rawName) {
          const matchedPeer = staffDirectory.find(
            (s) =>
              String(s.displayName || '')
                .toLowerCase()
                .trim() === rawName.toLowerCase() ||
              String(s.username || '')
                .toLowerCase()
                .trim() === rawName.toLowerCase()
          );
          if (matchedPeer) peerStaffId = matchedPeer.id;
        }
        if (myStaffId <= 0 || peerStaffId <= 0) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Cần xác định rõ 2 thành viên tham gia cuộc trò chuyện trực tiếp 1-1.',
          });
        }
        const pairIds = [Math.min(myStaffId, peerStaffId), Math.max(myStaffId, peerStaffId)];
        const existingDm = conversations.find((c) => {
          if (c.type !== 'dm' || c.isSelf) return false;
          const cIds = resolveDmParticipantIds(c, staffDirectory);
          return cIds.length === 2 && cIds.includes(myStaffId) && cIds.includes(peerStaffId);
        });
        if (existingDm) {
          existingDm.memberIds = pairIds;
          existingDm.memberCount = 2;
          await saveConversations(fastify, conversations, {
            touchedConversation: existingDm,
          });
          return {
            success: true,
            conversation: formatConversationForUser(existingDm, user, staffDirectory),
          };
        }

        const peerStaff = staffDirectory.find((s) => s.id === peerStaffId);
        const peerRole = peerStaff ? getRoleDisplayLabel(peerStaff.role) : { label: '1-1', color: '#10b981' };
        const dmConv: MosChatConversation = {
          id: `dm-pair-${pairIds[0]}-${pairIds[1]}`,
          type: 'dm',
          name: peerStaff?.displayName || rawName,
          subtitle: body.subtitle || peerRole.label || 'Trò chuyện trực tiếp 1-1',
          roleTag: peerRole.label || '1-1',
          color: peerRole.color || '#10b981',
          avatar: peerStaff?.avatarUrl || getInitials(peerStaff?.displayName || rawName, peerStaff?.username),
          memberCount: 2,
          participantStaffId: peerStaffId,
          memberIds: pairIds,
          unreadCount: 0,
          updatedAt: now.toISOString(),
          messages: [],
        };

        conversations.unshift(dmConv);
        await saveConversations(fastify, conversations);
        return {
          success: true,
          conversation: formatConversationForUser(dmConv, user, staffDirectory),
        };
      }

      const id = `space-${crypto.randomUUID().slice(0, 8)}`;
      const normalizedName = rawName.toLowerCase().replace(/\s+/g, '-');

      // Collect initial member IDs for Space
      let initialMembers: MosChatStaffMember[] = [];
      const set = new Set<number>();
      if (myStaffId > 0) set.add(myStaffId);
      if (Array.isArray(body.memberIds)) {
        body.memberIds.forEach((mId) => {
          const num = Number(mId);
          if (num > 0) set.add(num);
        });
      }
      const initialMemberIds = Array.from(set);
      if (initialMemberIds.length > 0) {
        const staffRows = await fastify.prisma.crm.crmStaff.findMany({
          where: { id: { in: initialMemberIds } },
          select: { id: true, username: true, displayName: true, role: true, avatarUrl: true, lastActiveAt: true },
        });
        const nowMs = Date.now();
        initialMembers = staffRows.map((s) => ({
          id: s.id,
          username: s.username,
          displayName: s.displayName || s.username,
          role: s.role,
          avatarUrl: s.avatarUrl,
          isOnline: Boolean(s.lastActiveAt && nowMs - new Date(s.lastActiveAt).getTime() < 5 * 60 * 1000),
        }));
      }

      const newConv: MosChatConversation = {
        id,
        type: 'space',
        name: normalizedName,
        subtitle: body.subtitle || 'Không gian phối hợp trên mOS',
        roleTag: String(initialMemberIds.length || 1),
        color: body.color?.trim() || '#3b82f6',
        avatar: body.avatar?.trim() || getInitials(rawName, user.username),
        memberCount: Math.max(1, initialMemberIds.length),
        memberIds: initialMemberIds,
        members: initialMembers,
        unreadCount: 0,
        updatedAt: now.toISOString(),
        messages: [],
      };

      conversations.unshift(newConv);
      await saveConversations(fastify, conversations);
      return { success: true, conversation: newConv };
    }
  );

  // POST /api/chat/conversations/:id/read (Explicitly mark conversation as read)
  fastify.post(
    '/chat/conversations/:id/read',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const convId = (request.params as { id: string }).id;
        const state = await loadChatState(fastify);
        const { conversations, userPrefsByUserKey } = state;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const targetConv = conversations.find((c) => c.id === convId);
        if (!targetConv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc trò chuyện' });
        }
        const nowIso = new Date().toISOString();
        const msgs = targetConv.messages || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();

        const threadRepliesUpdates: Record<string, number> = {};
        const threadAtUpdates: Record<string, string> = {};
        const threadLastReplyUpdates: Record<string, string> = {};
        for (const m of msgs) {
          if (m.thread && m.thread.length > 0) {
            const threadKey = `${convId}::${m.id}`;
            const repCount = m.thread.length;
            threadRepliesUpdates[m.id] = repCount;
            threadRepliesUpdates[threadKey] = repCount;
            threadAtUpdates[m.id] = nowIso;
            threadAtUpdates[threadKey] = nowIso;
            const lastRep = m.thread[m.thread.length - 1];
            if (lastRep?.id) {
              threadLastReplyUpdates[m.id] = lastRep.id;
              threadLastReplyUpdates[threadKey] = lastRep.id;
            }
          }
        }

        const updatedPrefs: MosChatUserSidebarPrefs = {
          ...currentPrefs,
          manualUnreadIds: (currentPrefs.manualUnreadIds || []).filter((id) => id !== convId),
          readMessageCountByConv: {
            ...(currentPrefs.readMessageCountByConv || {}),
            [convId]: msgs.length,
          },
          readAtByConv: {
            ...(currentPrefs.readAtByConv || {}),
            [convId]: nowIso,
          },
          lastReadMessageIdByConv: {
            ...(currentPrefs.lastReadMessageIdByConv || {}),
            ...(lastMsg?.id ? { [convId]: lastMsg.id } : {}),
          },
          readThreadReplyCountByMsg: {
            ...(currentPrefs.readThreadReplyCountByMsg || {}),
            ...threadRepliesUpdates,
          },
          readThreadAtByMsg: {
            ...(currentPrefs.readThreadAtByMsg || {}),
            ...threadAtUpdates,
          },
          lastReadThreadReplyIdByMsg: {
            ...(currentPrefs.lastReadThreadReplyIdByMsg || {}),
            ...threadLastReplyUpdates,
          },
        };
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, updatedPrefs);
        return {
          success: true,
          unreadCount: 0,
          userPrefs: saved,
          conversation: formatConversationForUser(targetConv, user, staffDirectory, saved, state.userPrefsByUserKey),
        };
      } catch (err: SafeAny) {
        fastify.log.error('Mark conversation as read error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể đánh dấu đã đọc' });
      }
    }
  );

  // POST /api/chat/conversations/:id/threads/:messageId/read (Explicitly mark a sub-thread as read)
  fastify.post(
    '/chat/conversations/:id/threads/:messageId/read',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { id: convId, messageId } = request.params as { id: string; messageId: string };
        const state = await loadChatState(fastify);
        const { conversations, userPrefsByUserKey } = state;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const targetConv = conversations.find((c) => c.id === convId);
        if (!targetConv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc trò chuyện' });
        }
        const targetMsg = targetConv.messages?.find((m) => m.id === messageId);
        if (!targetMsg) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn gốc của luồng' });
        }
        const nowIso = new Date().toISOString();
        const replies = targetMsg.thread || [];
        const lastReply = replies.length > 0 ? replies[replies.length - 1] : null;
        const threadKey = `${convId}::${messageId}`;
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
        const updatedPrefs: MosChatUserSidebarPrefs = {
          ...currentPrefs,
          readThreadReplyCountByMsg: {
            ...(currentPrefs.readThreadReplyCountByMsg || {}),
            [messageId]: replies.length,
            [threadKey]: replies.length,
          },
          readThreadAtByMsg: {
            ...(currentPrefs.readThreadAtByMsg || {}),
            [messageId]: nowIso,
            [threadKey]: nowIso,
          },
          lastReadThreadReplyIdByMsg: {
            ...(currentPrefs.lastReadThreadReplyIdByMsg || {}),
            ...(lastReply?.id ? { [messageId]: lastReply.id, [threadKey]: lastReply.id } : {}),
          },
        };
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, updatedPrefs);
        return {
          success: true,
          unreadThreadReplyCount: 0,
          userPrefs: saved,
          conversation: formatConversationForUser(targetConv, user, staffDirectory, saved, state.userPrefsByUserKey),
        };
      } catch (err: SafeAny) {
        fastify.log.error('Mark thread as read error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể đánh dấu đã đọc luồng trả lời' });
      }
    }
  );

  // POST /api/chat/conversations/:id/unread (Explicitly mark conversation as unread)
  fastify.post(
    '/chat/conversations/:id/unread',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const convId = (request.params as { id: string }).id;
        const state = await loadChatState(fastify);
        const { conversations, userPrefsByUserKey } = state;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const targetConv = conversations.find((c) => c.id === convId);
        if (!targetConv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc trò chuyện' });
        }
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
        const currentManual = currentPrefs.manualUnreadIds || [];
        const nextManual = currentManual.includes(convId) ? currentManual : [...currentManual, convId];
        const updatedPrefs = {
          ...currentPrefs,
          manualUnreadIds: nextManual,
          readMessageCountByConv: {
            ...(currentPrefs.readMessageCountByConv || {}),
            [convId]: Math.max(0, (targetConv.messages?.length || 1) - 1),
          },
          updatedAt: new Date().toISOString(),
        };
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, updatedPrefs);
        const unreadCount = computeUnreadCountForUser(targetConv, user, staffDirectory, saved);
        return {
          success: true,
          unreadCount: Math.max(1, unreadCount),
          userPrefs: saved,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Mark conversation as unread error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể đánh dấu chưa đọc' });
      }
    }
  );

  // POST /api/chat/conversations/:id/pin (Toggle or explicitly set pin status of conversation in user's sidebar)
  fastify.post(
    '/chat/conversations/:id/pin',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const convId = String((request.params as { id: string }).id || '').trim();
        const body = (request.body || {}) as { pinned?: boolean };
        const state = await loadChatState(fastify);
        const { conversations, userPrefsByUserKey } = state;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        let targetConv = conversations.find((c) => c.id === convId);
        if (!targetConv && (fastify as SafeAny)?.prisma?.crm?.crmChatConversation) {
          try {
            const dbConv = await (fastify as SafeAny).prisma.crm.crmChatConversation.findUnique({
              where: { id: convId },
            });
            if (dbConv) {
              targetConv = {
                id: dbConv.id,
                type: dbConv.type as SafeAny,
                name: dbConv.name,
                color: dbConv.color,
                subtitle: dbConv.subtitle || undefined,
                unreadCount: 0,
                updatedAt: dbConv.updatedAt ? new Date(dbConv.updatedAt).toISOString() : new Date().toISOString(),
                messages: [],
              };
            }
          } catch {
            // ignore DB lookup failure
          }
        }
        const isSpecialPersonalConv =
          convId === 'ai-copilot-mos' ||
          convId.startsWith('dm-self-') ||
          convId.startsWith('space-') ||
          convId.startsWith('dm-');
        if (!targetConv && !isSpecialPersonalConv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc trò chuyện' });
        }
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
        const exists = (currentPrefs.pinnedIds || []).includes(convId);
        const shouldPin = typeof body.pinned === 'boolean' ? body.pinned : !exists;
        const filteredPinned = (currentPrefs.pinnedIds || []).filter((id) => id !== convId);
        const nextPinned = shouldPin ? [convId, ...filteredPinned] : filteredPinned;
        // Pinned Trumps Hidden Invariant (MOS-BUG-216): Bỏ khỏi hiddenIds khi ghim
        const nextHidden = shouldPin
          ? (currentPrefs.hiddenIds || []).filter((id) => id !== convId)
          : currentPrefs.hiddenIds || [];

        const isSpace = targetConv?.type === 'space' || convId.startsWith('space-');
        const secKey = isSpace ? 'spaces' : 'dm';
        const nextConvOrder: Record<string, string[]> = { ...(currentPrefs.conversationOrder || {}) };
        if (shouldPin) {
          const curArr = nextConvOrder[secKey] || [];
          nextConvOrder[secKey] = [convId, ...curArr.filter((id) => id !== convId)];
        }

        const updatedPrefs = {
          ...currentPrefs,
          pinnedIds: nextPinned,
          hiddenIds: nextHidden,
          conversationOrder: nextConvOrder,
          updatedAt: new Date().toISOString(),
        };
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, updatedPrefs);
        return {
          success: true,
          pinned: shouldPin,
          userPrefs: saved,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Toggle conversation pin error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể thay đổi trạng thái ghim' });
      }
    }
  );
}
