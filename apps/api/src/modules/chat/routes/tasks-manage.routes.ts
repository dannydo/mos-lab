import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import {
  type MosChatTaskChecklistItem,
  type MosChatTaskActivityAction,
  type UpdateMosChatTaskRequest,
  normalizeAndEnrichTaskChecklist,
  resolveBestSourceMessageForTaskChecklist,
  sortChecklistItemsByDeadline,
  summarizeAndExtractChecklistFromText,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { canUserAccessConversation } from '../chat-access.service.js';
import { formatTimeLabel } from '../chat-format.service.js';
import { withTaskMutationLock } from '../chat-thread-task-helpers.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations, saveTasks } from '../chat-state-store.js';

export async function registerChatTaskManageRoutes(fastify: FastifyInstance) {
  // PATCH /api/chat/tasks/:taskId
  fastify.patch(
    '/chat/tasks/:taskId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) =>
      withTaskMutationLock(async () => {
        const { taskId } = request.params as { taskId: string };
        const body = request.body as UpdateMosChatTaskRequest;
        const user = request.user as JwtUserPayload;

        const [{ tasks, conversations }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);
        const task = tasks.find((t) => t.id === taskId);
        if (!task) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy công việc' });
        }
        const conv = conversations.find((c) => c.id === task.conversationId);
        if (conv && !canUserAccessConversation(conv, user, staffDirectory)) {
          return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền chỉnh sửa công việc này' });
        }

        const now = new Date();
        if (typeof body.title === 'string' && body.title.trim()) {
          task.title = body.title.trim();
        }
        if (body.summary !== undefined) {
          task.summary = typeof body.summary === 'string' ? body.summary.trim() || null : null;
        }
        if (body.assigneeId !== undefined) {
          task.assigneeId = body.assigneeId;
        }
        if (typeof body.assigneeName === 'string' && body.assigneeName.trim()) {
          task.assigneeName = body.assigneeName.trim();
        }
        if (body.priority && ['URGENT', 'HIGH', 'NORMAL'].includes(body.priority)) {
          task.priority = body.priority;
        }
        if (typeof body.archived === 'boolean') {
          task.archived = body.archived;
          task.archivedAt = body.archived ? now.toISOString() : null;
        }

        // Checklist management & smart 2-way sync
        if (!Array.isArray(task.checklist)) {
          task.checklist = [];
        }
        if (!Array.isArray(task.activityLog)) {
          task.activityLog = [];
        }

        const actorName = user.displayName || user.username || 'Thành viên';
        const actorId = user.id;
        let activityDescription: string | null = null;
        let activityAction: MosChatTaskActivityAction | null = null;

        if (body.checklistAction === 'auto_summarize') {
          const targetMsg = resolveBestSourceMessageForTaskChecklist(conv, { task });
          const assigneeStaff = staffDirectory.find(
            (s) =>
              (task.assigneeId && Number(s.id) === Number(task.assigneeId)) ||
              (task.assigneeName && s.displayName?.trim().toLowerCase() === task.assigneeName.trim().toLowerCase())
          );
          const defaultAvatar = assigneeStaff?.avatarUrl || null;

          // First clean out any conversational chatter items and enrich existing items
          task.checklist = normalizeAndEnrichTaskChecklist(task.checklist, {
            defaultAssigneeId: task.assigneeId ?? assigneeStaff?.id ?? null,
            defaultAssigneeName: task.assigneeName || assigneeStaff?.displayName || null,
            defaultAssigneeAvatar: defaultAvatar,
            referenceDate: targetMsg?.createdAt || task.createdAt || now,
          });

          if (targetMsg) {
            const { summary, suggestions } = summarizeAndExtractChecklistFromText({
              rootText: targetMsg.text,
              rootSenderName: targetMsg.senderName,
              rootSenderId: targetMsg.senderId,
              referenceDate: targetMsg.createdAt || task.createdAt || now,
              replies: targetMsg.thread || [],
            });
            if (summary) {
              task.summary = summary;
            }
            if (!task.sourceMessageId && targetMsg.id) {
              task.sourceMessageId = targetMsg.id;
            }
            let addedCount = 0;
            for (const sug of suggestions) {
              const exists = task.checklist.some(
                (c) => c.title.trim().toLowerCase() === sug.title.trim().toLowerCase()
              );
              if (!exists) {
                task.checklist.push({
                  id: `chk-${crypto.randomUUID().slice(0, 8)}`,
                  title: sug.title,
                  done: false,
                  deadline: sug.deadline || null,
                  assigneeId: sug.assigneeId ?? task.assigneeId ?? assigneeStaff?.id ?? null,
                  assigneeName: sug.assigneeName ?? task.assigneeName ?? assigneeStaff?.displayName ?? null,
                  assigneeAvatar: defaultAvatar,
                  sourceReplyId: sug.sourceReplyId ?? null,
                  createdBy: actorName,
                  createdAt: now.toISOString(),
                });
                addedCount++;
              }
            }
            task.checklist = sortChecklistItemsByDeadline(task.checklist);
            activityAction = 'SUMMARIZE_CHECKLIST';
            activityDescription =
              addedCount > 0
                ? `Tự động tóm tắt & chuẩn hóa ${task.checklist.length} đầu việc từ ${targetMsg.senderName || task.assigneeName}`
                : `Làm sạch, gán hạn chót & chuẩn hóa checklist công việc của ${targetMsg.senderName || task.assigneeName}`;
          }
        } else if (body.checklistAction === 'add' && body.checklistItem?.title?.trim()) {
          const cleanAddTitle = body.checklistItem.title.trim();
          const duplicateRecent = task.checklist.find(
            (c) =>
              c.title.trim().toLowerCase() === cleanAddTitle.toLowerCase() &&
              (!c.createdAt || now.getTime() - new Date(c.createdAt).getTime() < 15_000)
          );
          if (!duplicateRecent) {
            const assigneeStaff = staffDirectory.find(
              (s) =>
                (body.checklistItem?.assigneeId && Number(s.id) === Number(body.checklistItem.assigneeId)) ||
                (task.assigneeId && Number(s.id) === Number(task.assigneeId))
            );
            const newItem: MosChatTaskChecklistItem = {
              id: `chk-${crypto.randomUUID().slice(0, 8)}`,
              title: cleanAddTitle,
              done: Boolean(body.checklistItem.done),
              deadline: body.checklistItem.deadline || null,
              assigneeId: body.checklistItem.assigneeId ?? task.assigneeId ?? null,
              assigneeName: body.checklistItem.assigneeName ?? task.assigneeName ?? null,
              assigneeAvatar: body.checklistItem.assigneeAvatar ?? assigneeStaff?.avatarUrl ?? null,
              sourceReplyId: body.checklistItem.sourceReplyId ?? null,
              createdBy: actorName,
              createdAt: now.toISOString(),
            };
            task.checklist.push(newItem);
            activityAction = 'ADD_ITEM';
            activityDescription = `Thêm mục việc: "${newItem.title}"`;
          }
        } else if (body.checklistAction === 'toggle' && body.checklistItemId) {
          const item = task.checklist.find((c) => c.id === body.checklistItemId);
          if (item) {
            item.done = !item.done;
            item.completedAt = item.done ? now.toISOString() : null;
            item.completedByName = item.done ? actorName : null;
            activityAction = 'TOGGLE_ITEM';
            activityDescription = `${item.done ? 'Hoàn thành' : 'Mở lại'} mục việc: "${item.title}"`;
          }
        } else if (body.checklistAction === 'edit' && body.checklistItemId && body.checklistItem) {
          const item = task.checklist.find((c) => c.id === body.checklistItemId);
          if (item) {
            if (typeof body.checklistItem.title === 'string' && body.checklistItem.title.trim()) {
              item.title = body.checklistItem.title.trim();
            }
            if (body.checklistItem.deadline !== undefined) {
              item.deadline = body.checklistItem.deadline || null;
            }
            if (body.checklistItem.assigneeId !== undefined) {
              item.assigneeId = body.checklistItem.assigneeId;
            }
            if (body.checklistItem.assigneeName !== undefined) {
              item.assigneeName = body.checklistItem.assigneeName;
            }
            if (body.checklistItem.assigneeAvatar !== undefined) {
              item.assigneeAvatar = body.checklistItem.assigneeAvatar;
            }
            activityAction = 'EDIT_ITEM';
            activityDescription = `Chỉnh sửa mục việc: "${item.title}"`;
          }
        } else if (body.checklistAction === 'delete' && body.checklistItemId) {
          const idx = task.checklist.findIndex((c) => c.id === body.checklistItemId);
          if (idx >= 0) {
            const removed = task.checklist.splice(idx, 1)[0];
            activityAction = 'DELETE_ITEM';
            activityDescription = `Xóa mục việc: "${removed?.title || ''}"`;
          }
        } else if (Array.isArray(body.checklist)) {
          task.checklist = body.checklist;
        }

        // Smart 2-Way Sync between Checklist & Main Task
        if (typeof body.done === 'boolean') {
          task.done = body.done;
          if (body.done && task.checklist.length > 0) {
            for (const item of task.checklist) {
              if (!item.done) {
                item.done = true;
                item.completedAt = now.toISOString();
                item.completedByName = actorName;
              }
            }
          }
          activityAction = body.done ? 'COMPLETE_TASK' : 'REOPEN_TASK';
          activityDescription = body.done ? 'Đánh dấu hoàn thành toàn bộ công việc' : 'Mở lại công việc';
        } else if (task.checklist.length > 0) {
          const allDone = task.checklist.every((c) => c.done);
          if (allDone && !task.done) {
            task.done = true;
            activityAction = 'COMPLETE_TASK';
            activityDescription = 'Tự động hoàn thành công việc vì 100% mục checklist đã xong';
          } else if (!allDone && task.done) {
            task.done = false;
            activityAction = 'REOPEN_TASK';
            activityDescription = 'Mở lại công việc vì có mục checklist chưa hoàn thành';
          }
        }

        if (activityAction && activityDescription) {
          task.activityLog.push({
            id: `act-${crypto.randomUUID().slice(0, 8)}`,
            action: activityAction,
            actorId,
            actorName,
            description: activityDescription,
            timestamp: now.toISOString(),
          });

          // Send a system message to the subthread if linked (deduplicating rapid identical logs)
          if (conv && task.sourceMessageId) {
            const sourceMsg = conv.messages.find((m) => m.id === task.sourceMessageId);
            if (sourceMsg && sourceMsg.thread) {
              // Also collapse any existing consecutive duplicate [Checklist] system replies
              sourceMsg.thread = sourceMsg.thread.filter((reply, idx, arr) => {
                if (idx === 0) return true;
                const prev = arr[idx - 1];
                if (
                  reply.senderId === 'mOS Checklist System' &&
                  prev?.senderId === 'mOS Checklist System' &&
                  reply.text === prev.text
                ) {
                  return false;
                }
                return true;
              });

              const logText = `[Checklist] ${actorName}: ${activityDescription}`;
              const lastReply = sourceMsg.thread[sourceMsg.thread.length - 1];
              const isDuplicateLog =
                lastReply &&
                lastReply.text === logText &&
                (!lastReply.createdAt || now.getTime() - new Date(lastReply.createdAt).getTime() < 15_000);
              if (!isDuplicateLog) {
                sourceMsg.thread.push({
                  id: `reply-chk-${crypto.randomUUID().slice(0, 8)}`,
                  senderId: 'mOS Checklist System',
                  senderName: '📋 mOS Task Assistant',
                  senderRole: 'Hệ thống',
                  senderAvatar: '📋',
                  roleColor: '#10b981',
                  text: logText,
                  timeLabel: formatTimeLabel(now),
                  createdAt: now.toISOString(),
                });
              }
              conv.updatedAt = now.toISOString();
              const addedReply = sourceMsg.thread[sourceMsg.thread.length - 1];
              await saveConversations(fastify, conversations, {
                touchedConversation: conv,
                touchedReply: {
                  conversationId: conv.id,
                  parentMessageId: sourceMsg.id,
                  reply: addedReply,
                },
              });
            }
          }
        }
        if (typeof body.snoozeSeconds === 'number' && body.snoozeSeconds > 0) {
          task.remindAt = new Date(now.getTime() + body.snoozeSeconds * 1000).toISOString();
          task.fired = false;
          task.done = false;
        } else if (typeof body.remindInSeconds === 'number') {
          if (body.remindInSeconds > 0) {
            task.remindAt = new Date(now.getTime() + body.remindInSeconds * 1000).toISOString();
            task.fired = false;
          } else {
            task.remindAt = now.toISOString();
            task.fired = true;
          }
        } else if (body.remindAt) {
          const parsed = new Date(body.remindAt);
          if (!isNaN(parsed.getTime())) {
            task.remindAt = parsed.toISOString();
            task.fired = parsed.getTime() <= now.getTime();
          }
        }
        if (body.triggerReminderNow && !task.fired) {
          task.fired = true;
          task.remindAt = now.toISOString();
        }
        if (body.deadline !== undefined || body.dueAt !== undefined) {
          const rawDeadline = body.deadline !== undefined ? body.deadline : body.dueAt;
          if (!rawDeadline) {
            task.deadline = null;
            task.dueAt = null;
          } else {
            const parsed = new Date(rawDeadline);
            if (!isNaN(parsed.getTime())) {
              task.deadline = parsed.toISOString();
              task.dueAt = parsed.toISOString();
            }
          }
        }
        if (body.negotiatedDeadline !== undefined) {
          if (!body.negotiatedDeadline) {
            task.negotiatedDeadline = null;
          } else {
            const parsed = new Date(body.negotiatedDeadline);
            if (!isNaN(parsed.getTime())) {
              task.negotiatedDeadline = parsed.toISOString();
            }
          }
        }
        if (body.negotiationNote !== undefined) {
          task.negotiationNote = body.negotiationNote ? String(body.negotiationNote).trim() : null;
        }
        if (body.negotiatedBy !== undefined) {
          task.negotiatedBy = body.negotiatedBy ? String(body.negotiatedBy).trim() : null;
        }
        if (body.negotiatedAt !== undefined) {
          task.negotiatedAt = body.negotiatedAt ? String(body.negotiatedAt) : null;
        }
        if (body.acceptNegotiatedDeadline && task.negotiatedDeadline) {
          task.deadline = task.negotiatedDeadline;
          task.dueAt = task.negotiatedDeadline;
          task.negotiatedDeadline = null;
          task.negotiationNote = null;
          task.negotiatedBy = null;
          task.negotiatedAt = null;
        } else if (body.rejectNegotiatedDeadline) {
          task.negotiatedDeadline = null;
          task.negotiationNote = null;
          task.negotiatedBy = null;
          task.negotiatedAt = null;
        }
        task.updatedAt = now.toISOString();

        await saveTasks(fastify, tasks, { touchedTask: task });
        return { success: true, task };
      })
  );

  // DELETE /api/chat/tasks/:taskId
  fastify.delete(
    '/chat/tasks/:taskId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { taskId } = request.params as { taskId: string };
      const user = request.user as JwtUserPayload;
      const [{ tasks, conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const taskIndex = tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy công việc' });
      }

      const deletedTask = tasks[taskIndex];
      const conv = conversations.find((c) => c.id === deletedTask.conversationId);
      if (conv && !canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền xoá công việc này' });
      }
      tasks.splice(taskIndex, 1);

      // Clean up taskId link in conversations messages if present
      let convChanged = false;
      if (deletedTask.sourceMessageId || deletedTask.conversationId) {
        for (const c of conversations) {
          if (c.id === deletedTask.conversationId) {
            for (const m of c.messages) {
              if (m.taskId === taskId) {
                delete m.taskId;
                convChanged = true;
              }
            }
          }
        }
      }

      await Promise.all([
        saveTasks(fastify, tasks, { deletedTaskId: taskId }),
        convChanged
          ? saveConversations(fastify, conversations, conv ? { touchedConversation: conv } : undefined)
          : Promise.resolve(),
      ]);

      return { success: true, taskId, message: 'Đã xoá công việc thành công' };
    }
  );
}
