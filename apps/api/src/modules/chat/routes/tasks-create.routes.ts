import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import {
  type CreateMosChatTaskRequest,
  type MosChatTaskItem,
  type MosChatTaskChecklistItem,
  type MosChatTaskActivityLogItem,
  type SafeAny,
  sortChecklistItemsByDeadline,
  summarizeAndExtractChecklistFromText,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { resolveUserStaffId, canUserAccessConversation } from '../chat-access.service.js';
import {
  formatTimeLabel,
  getRoleDisplayLabel,
  getInitials,
  formatConversationForUser,
} from '../chat-format.service.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations, saveTasks } from '../chat-state-store.js';
import { normalizeTaskTitleKey } from '../chat-thread-task-helpers.js';

export async function registerChatTaskCreateRoutes(fastify: FastifyInstance) {
  // POST /api/chat/tasks (Message to Task -> Reminder)
  fastify.post(
    '/chat/tasks',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as CreateMosChatTaskRequest;
      const title = String(body?.title || '').trim();
      if (!body?.conversationId || !title) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tiêu đề công việc' });
      }

      const [{ conversations, tasks }, staffDirectory] = await Promise.all([
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

      const rawAssigneeName = String(body.assigneeName || '').trim();
      const rawAssigneeId = Number(body.assigneeId) || 0;
      const normAssignee = rawAssigneeName.toLowerCase();
      const isGenericAssignee =
        !normAssignee || ['staff', 'thành viên', 'chính tôi', 'tôi', 'me'].includes(normAssignee);

      let matchedAssignee = staffDirectory.find(
        (s) =>
          (rawAssigneeId > 0 && s.id === rawAssigneeId) ||
          (!isGenericAssignee &&
            (String(s.displayName || '')
              .trim()
              .toLowerCase() === normAssignee ||
              String(s.username || '')
                .trim()
                .toLowerCase() === normAssignee))
      );

      // Self-assign fallback: if unassigned, generic label, or assignee not found, fallback to creator
      if (!matchedAssignee) {
        const myStaffId = resolveUserStaffId(user, staffDirectory);
        if (myStaffId > 0) {
          matchedAssignee = staffDirectory.find((s) => s.id === myStaffId);
        } else if (Number(user.id) > 0) {
          matchedAssignee = staffDirectory.find((s) => s.id === Number(user.id));
        }
      }

      if (!matchedAssignee) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Vui lòng chọn Người phụ trách từ danh sách nhân sự đang hoạt động.',
        });
      }

      const canonicalAssigneeId = matchedAssignee.id;
      const canonicalAssigneeName = matchedAssignee.displayName || matchedAssignee.username;

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true },
      });
      const creatorName = staffRecord?.displayName || user.username || 'Danny Do';
      const roleInfo = getRoleDisplayLabel(staffRecord?.role || user.role);
      const now = new Date();

      const hasExplicitRemindAt = Boolean(body.remindAt && !isNaN(new Date(body.remindAt).getTime()));
      const remindSecNum = body.remindInSeconds !== undefined ? Number(body.remindInSeconds) : 0;
      const isNoReminder = !hasExplicitRemindAt && remindSecNum <= 0;

      let remindAtDate: Date;
      if (hasExplicitRemindAt) {
        remindAtDate = new Date(body.remindAt!);
      } else if (remindSecNum > 0) {
        remindAtDate = new Date(now.getTime() + Math.max(60, remindSecNum) * 1000);
      } else {
        remindAtDate = now;
      }

      const normTitle = normalizeTaskTitleKey(title);
      const existingTaskIdx = tasks.findIndex(
        (t) =>
          t.conversationId === conv.id &&
          ((body.sourceMessageId && t.sourceMessageId === body.sourceMessageId) ||
            (normTitle && normalizeTaskTitleKey(t.title) === normTitle))
      );

      if (existingTaskIdx >= 0) {
        const existingTask = tasks[existingTaskIdx];
        existingTask.title = title;
        existingTask.assigneeId = canonicalAssigneeId;
        existingTask.assigneeName = canonicalAssigneeName;
        existingTask.priority = body.priority || existingTask.priority || 'HIGH';
        existingTask.remindAt = remindAtDate.toISOString();
        existingTask.done = false;
        existingTask.fired = isNoReminder;

        if (body.sourceMessageId) {
          existingTask.sourceMessageId = body.sourceMessageId;
        }
        if (existingTask.sourceMessageId) {
          const sourceMsg = conv.messages.find((m) => m.id === existingTask.sourceMessageId);
          if (sourceMsg) {
            sourceMsg.taskId = existingTask.id;
            existingTask.sourceAuthorName = sourceMsg.senderName;
          }
        }

        tasks.splice(existingTaskIdx, 1);
        tasks.unshift(existingTask);
        await Promise.all([saveConversations(fastify, conversations), saveTasks(fastify, tasks)]);

        return {
          success: true,
          task: existingTask,
          conversation: formatConversationForUser(conv, user, staffDirectory),
        };
      }

      const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
      let targetMsgId = body.sourceMessageId || null;
      let sourceAuthorName = creatorName;

      if (targetMsgId) {
        const sourceMsg = conv.messages.find((m) => m.id === targetMsgId);
        if (sourceMsg) {
          sourceMsg.taskId = taskId;
          sourceAuthorName = sourceMsg.senderName;
        }
      } else {
        targetMsgId = `msg-task-${crypto.randomUUID().slice(0, 8)}`;
        conv.messages.push({
          id: targetMsgId,
          conversationId: conv.id,
          senderId: user.id,
          senderName: creatorName,
          senderRole: roleInfo.label,
          senderAvatar: getInitials(creatorName, user.username),
          roleColor: roleInfo.color,
          text:
            canonicalAssigneeId === Number(user.id) || canonicalAssigneeId === resolveUserStaffId(user, staffDirectory)
              ? 'Tự tạo việc cho chính mình:'
              : `Giao việc cho ${canonicalAssigneeName}:`,
          timeLabel: formatTimeLabel(now),
          createdAt: now.toISOString(),
          taskId,
          reactions: {},
          thread: [],
        });
      }

      let deadlineIso: string | null = null;
      const rawDeadline = body.deadline !== undefined ? body.deadline : body.dueAt;
      if (rawDeadline) {
        const parsedDeadline = new Date(rawDeadline);
        if (!isNaN(parsedDeadline.getTime())) {
          deadlineIso = parsedDeadline.toISOString();
        }
      }

      const initialChecklist: MosChatTaskChecklistItem[] = [];
      let initialSummary: string | null = typeof body.summary === 'string' ? body.summary.trim() || null : null;

      if (Array.isArray(body.checklist) && body.checklist.length > 0) {
        for (const item of body.checklist) {
          if (item && typeof item.title === 'string' && item.title.trim()) {
            initialChecklist.push({
              id: `chk-${crypto.randomUUID().slice(0, 8)}`,
              title: item.title.trim(),
              done: Boolean(item.done),
              deadline: item.deadline || null,
              assigneeId: item.assigneeId ?? canonicalAssigneeId ?? null,
              assigneeName: item.assigneeName ?? canonicalAssigneeName ?? null,
              assigneeAvatar: item.assigneeAvatar ?? matchedAssignee?.avatarUrl ?? null,
              sourceReplyId: item.sourceReplyId ?? null,
              createdBy: creatorName,
              createdAt: now.toISOString(),
            });
          }
        }
      } else if (body.importRepliesAsChecklist && targetMsgId) {
        const sourceMsg = conv.messages.find((m) => m.id === targetMsgId);
        if (sourceMsg?.thread) {
          for (const reply of sourceMsg.thread) {
            if (!reply.isDeleted && reply.text?.trim() && !reply.isAiBot) {
              initialChecklist.push({
                id: `chk-${crypto.randomUUID().slice(0, 8)}`,
                title: reply.text.trim().slice(0, 150),
                done: false,
                assigneeId: reply.senderId,
                assigneeName: reply.senderName,
                sourceReplyId: reply.id,
                createdBy: creatorName,
                createdAt: now.toISOString(),
              });
            }
          }
        }
      } else if (body.autoSummarizeChecklist !== false && targetMsgId) {
        const sourceMsg = conv.messages.find((m) => m.id === targetMsgId);
        if (sourceMsg && !sourceMsg.isDeleted && !sourceMsg.isAiBot) {
          const extracted = summarizeAndExtractChecklistFromText({
            rootText: sourceMsg.text,
            rootSenderName: sourceMsg.senderName,
            rootSenderId: sourceMsg.senderId,
            referenceDate: sourceMsg.createdAt || now,
            replies: sourceMsg.thread || [],
          });
          if (
            extracted.suggestions.length >= 2 ||
            (body.autoSummarizeChecklist === true && extracted.suggestions.length >= 1)
          ) {
            if (!initialSummary && extracted.summary) {
              initialSummary = extracted.summary;
            }
            for (const sug of sortChecklistItemsByDeadline(extracted.suggestions)) {
              initialChecklist.push({
                id: `chk-${crypto.randomUUID().slice(0, 8)}`,
                title: sug.title,
                done: false,
                deadline: sug.deadline || null,
                assigneeId: sug.assigneeId ?? canonicalAssigneeId ?? null,
                assigneeName: sug.assigneeName ?? canonicalAssigneeName ?? null,
                assigneeAvatar: matchedAssignee?.avatarUrl || null,
                sourceReplyId: sug.sourceReplyId ?? null,
                createdBy: creatorName,
                createdAt: now.toISOString(),
              });
            }
          }
        }
      }

      const initialActivityLog: MosChatTaskActivityLogItem[] = [
        {
          id: `act-${crypto.randomUUID().slice(0, 8)}`,
          action: 'CREATE_TASK',
          actorId: user.id,
          actorName: creatorName,
          description: `Tạo công việc "${title}"`,
          timestamp: now.toISOString(),
        },
      ];
      if (initialChecklist.length > 0) {
        initialActivityLog.push({
          id: `act-${crypto.randomUUID().slice(0, 8)}`,
          action: 'SUMMARIZE_CHECKLIST',
          actorId: user.id,
          actorName: creatorName,
          description: `Tự động tóm tắt & khởi tạo ${initialChecklist.length} mục checklist`,
          timestamp: now.toISOString(),
        });
      }

      const newTask: MosChatTaskItem = {
        id: taskId,
        conversationId: conv.id,
        conversationName: conv.name,
        sourceMessageId: targetMsgId,
        sourceAuthorName,
        title,
        summary: initialSummary,
        assigneeId: canonicalAssigneeId,
        assigneeName: canonicalAssigneeName,
        creatorName,
        assignerName: (body as SafeAny).assignerName || creatorName,
        priority: body.priority || 'HIGH',
        remindAt: remindAtDate.toISOString(),
        dueAt: deadlineIso,
        deadline: deadlineIso,
        negotiationNote: body.negotiationNote ? String(body.negotiationNote).trim() : null,
        done: false,
        fired: isNoReminder,
        createdAt: now.toISOString(),
        checklist: initialChecklist,
        activityLog: initialActivityLog,
      };

      tasks.unshift(newTask);
      await Promise.all([saveConversations(fastify, conversations), saveTasks(fastify, tasks)]);

      return {
        success: true,
        task: newTask,
        conversation: formatConversationForUser(conv, user, staffDirectory),
      };
    }
  );
}
