import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import type { UpdateMosChatNicknameRequest, UpdateMosChatSpaceConfigRequest } from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { isDannyOrSuperAdminUser, resolveUserStaffId, canUserAccessConversation } from '../chat-access.service.js';
import { formatTimeLabel } from '../chat-format.service.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations } from '../chat-state-store.js';

export async function registerChatConversationMemberConfigRoutes(fastify: FastifyInstance) {
  // POST /api/chat/conversations/:id/members (Add member or bulk department/team members to space)
  fastify.post(
    '/chat/conversations/:id/members',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { id } = request.params as { id: string };
      const body = request.body as { staffId?: number; staffIds?: number[] };
      const candidateIds = Array.isArray(body?.staffIds)
        ? body.staffIds.map((n) => Number(n)).filter((n) => n > 0)
        : body?.staffId
          ? [Number(body.staffId)]
          : [];

      if (candidateIds.length === 0) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu ID nhân sự' });
      }

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập không gian này.' });
      }

      if (conv.type !== 'space') {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Chỉ có thể thêm thành viên vào Không gian (Space)' });
      }

      conv.memberIds = conv.memberIds || [];
      conv.members = conv.members || [];
      const newIds = candidateIds.filter((sid) => !conv.memberIds!.includes(sid));
      if (newIds.length === 0) {
        return { success: true, conversation: conv, message: 'Các nhân sự này đã có trong nhóm' };
      }

      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: newIds } },
        select: { id: true, username: true, displayName: true, role: true, avatarUrl: true, lastActiveAt: true },
      });

      if (staffList.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân sự' });
      }

      const nowMs = Date.now();
      for (const staff of staffList) {
        if (!conv.memberIds.includes(staff.id)) {
          conv.memberIds.push(staff.id);
        }
        if (!conv.members.some((m) => m.id === staff.id)) {
          conv.members.push({
            id: staff.id,
            username: staff.username,
            displayName: staff.displayName || staff.username,
            role: staff.role,
            avatarUrl: staff.avatarUrl,
            isOnline: Boolean(staff.lastActiveAt && nowMs - new Date(staff.lastActiveAt).getTime() < 5 * 60 * 1000),
          });
        }
      }
      conv.memberCount = conv.memberIds.length;
      conv.roleTag = String(conv.memberCount);

      const now = new Date();
      const inviterName = user.username || 'Quản trị viên';
      const addedLabel =
        staffList.length === 1
          ? staffList[0].displayName || staffList[0].username
          : `${staffList.length} thành viên (${staffList
              .slice(0, 3)
              .map((s) => s.displayName || s.username)
              .join(', ')}${staffList.length > 3 ? '...' : ''})`;

      conv.messages.push({
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: 'system',
        senderName: 'Hệ thống mOS',
        senderRole: 'Hệ thống',
        senderAvatar: '👥',
        roleColor: '#3b82f6',
        text: `${inviterName} đã thêm ${addedLabel} vào không gian.`,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        reactions: {},
        thread: [],
        isSystemReminder: true,
      });
      conv.updatedAt = now.toISOString();

      await saveConversations(fastify, conversations);
      return { success: true, conversation: conv };
    }
  );

  // DELETE /api/chat/conversations/:id/members/:staffId (Remove member from space)
  fastify.delete(
    '/chat/conversations/:id/members/:staffId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { id, staffId: rawStaffId } = request.params as { id: string; staffId: string };
      const staffId = Number(rawStaffId);

      if (!staffId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID nhân sự không hợp lệ' });
      }

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập không gian này.' });
      }

      if (conv.type !== 'space') {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Chỉ có thể xóa thành viên khỏi Không gian (Space)' });
      }

      conv.memberIds = conv.memberIds || [];
      const staff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: staffId },
        select: { id: true, username: true, displayName: true, role: true },
      });

      conv.memberIds = conv.memberIds.filter((mid) => mid !== staffId);
      if (Array.isArray(conv.members)) {
        conv.members = conv.members.filter((m) => m.id !== staffId);
      }
      conv.memberCount = conv.memberIds.length;
      conv.roleTag = String(conv.memberCount);

      const now = new Date();
      const operatorName = user.username || 'Quản trị viên';
      const removedName = staff?.displayName || staff?.username || `ID ${staffId}`;

      conv.messages.push({
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: 'system',
        senderName: 'Hệ thống mOS',
        senderRole: 'Hệ thống',
        senderAvatar: '🚪',
        roleColor: '#ef4444',
        text: `${operatorName} đã xóa ${removedName} khỏi không gian.`,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        reactions: {},
        thread: [],
        isSystemReminder: true,
      });
      conv.updatedAt = now.toISOString();

      await saveConversations(fastify, conversations);
      return { success: true, conversation: conv };
    }
  );

  // PUT /api/chat/conversations/:id/nickname (Change member's nickname in a group/space)
  // - Any user can change their own nickname in any space they belong to.
  // - Danny / Super Admin / Admin can change anyone's nickname in the space.
  fastify.put(
    '/chat/conversations/:id/nickname',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { id } = request.params as { id: string };
      const body = (request.body || {}) as UpdateMosChatNicknameRequest;

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập không gian này.' });
      }

      const myStaffId = resolveUserStaffId(user, staffDirectory);
      const targetStaffId = body.targetStaffId ? Number(body.targetStaffId) : myStaffId;

      if (!targetStaffId) {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Không xác định được nhân sự cần đổi biệt danh' });
      }

      const isSelf = targetStaffId === myStaffId;
      const isAdmin = isDannyOrSuperAdminUser(user);

      if (!isSelf && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message:
            'Bạn chỉ có thể đổi biệt danh của chính mình. Chỉ Quản trị viên mới được đổi biệt danh cho người khác.',
        });
      }

      const targetStaff = staffDirectory.find((s) => s.id === targetStaffId);
      const targetName = targetStaff?.displayName || targetStaff?.username || `ID #${targetStaffId}`;
      const operatorStaff = staffDirectory.find((s) => s.id === myStaffId);
      const operatorName = operatorStaff?.displayName || user.displayName || user.username || 'Thành viên';

      conv.memberNicknames = conv.memberNicknames || {};
      const rawNick = typeof body.nickname === 'string' ? body.nickname.trim() : '';

      const now = new Date();
      if (!rawNick) {
        // Gỡ bỏ biệt danh
        delete conv.memberNicknames[String(targetStaffId)];
        conv.messages.push({
          id: `msg-${crypto.randomUUID().slice(0, 8)}`,
          conversationId: conv.id,
          senderId: 'system',
          senderName: 'Hệ thống mOS',
          senderRole: 'Hệ thống',
          senderAvatar: '🏷️',
          roleColor: '#3b82f6',
          text: isSelf
            ? `${operatorName} đã gỡ biệt danh của mình trong nhóm.`
            : `${operatorName} đã gỡ biệt danh của ${targetName} trong nhóm.`,
          timeLabel: formatTimeLabel(now),
          createdAt: now.toISOString(),
          reactions: {},
          thread: [],
          isSystemReminder: true,
        });
      } else {
        // Đặt biệt danh mới (tối đa 40 ký tự)
        const sanitizedNick = rawNick.slice(0, 40);
        conv.memberNicknames[String(targetStaffId)] = sanitizedNick;
        conv.messages.push({
          id: `msg-${crypto.randomUUID().slice(0, 8)}`,
          conversationId: conv.id,
          senderId: 'system',
          senderName: 'Hệ thống mOS',
          senderRole: 'Hệ thống',
          senderAvatar: '🏷️',
          roleColor: '#3b82f6',
          text: isSelf
            ? `${operatorName} đã đổi biệt danh của mình thành "${sanitizedNick}".`
            : `${operatorName} đã đặt biệt danh cho ${targetName} là "${sanitizedNick}".`,
          timeLabel: formatTimeLabel(now),
          createdAt: now.toISOString(),
          reactions: {},
          thread: [],
          isSystemReminder: true,
        });
      }
      conv.updatedAt = now.toISOString();

      await saveConversations(fastify, conversations);
      return {
        success: true,
        conversation: conv,
        memberNicknames: conv.memberNicknames,
      };
    }
  );

  // PATCH /api/chat/conversations/:id (Cấu hình Không gian Space: Tên, Mô tả, Emoji đại diện, Màu chủ đạo)
  fastify.patch(
    '/chat/conversations/:id',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { id } = request.params as { id: string };
      const body = (request.body || {}) as UpdateMosChatSpaceConfigRequest;

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (conv.type !== 'space') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Chỉ hỗ trợ chỉnh sửa cấu hình cho Không gian làm việc (Space).',
        });
      }

      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập không gian này.' });
      }

      const myStaffId = resolveUserStaffId(user, staffDirectory);
      const isMember = conv.memberIds ? conv.memberIds.includes(myStaffId) : true;
      const isAdmin = isDannyOrSuperAdminUser(user);

      if (!isMember && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ thành viên của Không gian hoặc Quản trị viên mới được chỉnh sửa cấu hình.',
        });
      }

      const changes: string[] = [];

      // 1. Tên Không gian
      if (body.name !== undefined) {
        const cleanName = String(body.name).trim().toLowerCase().replace(/\s+/g, '-');
        if (!cleanName) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Tên Không gian không được để trống.' });
        }
        if (conv.name !== cleanName) {
          changes.push(`tên thành "#${cleanName}"`);
          conv.name = cleanName;
        }
      }

      // 2. Mục đích hoạt động
      if (body.subtitle !== undefined) {
        const cleanSubtitle = String(body.subtitle).trim() || undefined;
        if (conv.subtitle !== cleanSubtitle) {
          conv.subtitle = cleanSubtitle;
          changes.push('mô tả hoạt động');
        }
      }

      // 3. Emoji đại diện cho Space
      if (body.avatar !== undefined) {
        const cleanEmoji = String(body.avatar).trim();
        if (conv.avatar !== cleanEmoji) {
          conv.avatar = cleanEmoji || undefined;
          changes.push(`biểu tượng Emoji thành ${cleanEmoji || '(mặc định)'}`);
        }
      }

      // 4. Màu chủ đạo
      if (body.color !== undefined) {
        const cleanColor = String(body.color).trim();
        if (cleanColor && conv.color !== cleanColor) {
          conv.color = cleanColor;
          changes.push('màu chủ đạo');
        }
      }

      const now = new Date();
      conv.updatedAt = now.toISOString();

      // Nếu có thay đổi, ghi system message vào luồng chat của Space
      if (changes.length > 0) {
        const operatorStaff = staffDirectory.find((s) => s.id === myStaffId);
        const operatorName = operatorStaff?.displayName || user.displayName || user.username || 'Thành viên';
        conv.messages.push({
          id: `msg-${crypto.randomUUID().slice(0, 8)}`,
          conversationId: conv.id,
          senderId: 'system',
          senderName: 'Hệ thống mOS',
          senderRole: 'Cấu hình Space',
          senderAvatar: conv.avatar || '⚙️',
          roleColor: conv.color || '#3b82f6',
          text: `${operatorName} đã cập nhật cấu hình Không gian: đổi ${changes.join(', ')}.`,
          timeLabel: formatTimeLabel(now),
          createdAt: now.toISOString(),
          reactions: {},
          thread: [],
          isSystemReminder: true,
        });
      }

      await saveConversations(fastify, conversations);
      return {
        success: true,
        conversation: conv,
      };
    }
  );
}
