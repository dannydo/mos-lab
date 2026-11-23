import type { FastifyInstance } from 'fastify';
import type { MosChatConversation, MosChatTaskItem, MosChatUserSidebarPrefs, SafeAny } from '@mos-lab/shared';
import {
  deduplicateMovedMessagesInConversation,
  ensureChatRelationalTables,
  parseSafeDate,
} from './repo-schema-and-lock.js';

/**
 * Direct O(1) Row Delete for moved/removed chat messages or thread replies.
 */
export async function deleteChatMessagesFromRelationalDb(
  fastify: FastifyInstance,
  messageIds: string[]
): Promise<void> {
  const uniqueIds = Array.from(new Set((messageIds || []).filter(Boolean)));
  if (uniqueIds.length === 0) return;
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatMessage) return;

  try {
    await crm.crmChatMessage.deleteMany({
      where: { id: { in: uniqueIds } },
    });
  } catch (err) {
    fastify.log?.warn?.({ err }, 'deleteChatMessagesFromRelationalDb warning');
  }
}

/**
 * Syncs an array of conversations (including root messages & thread replies) to relational Prisma tables.
 */
export async function syncConversationsToRelationalDb(
  fastify: FastifyInstance,
  conversations: MosChatConversation[]
): Promise<void> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatConversation) return;

  try {
    const removedIdsToDelete: string[] = [];
    for (const conv of conversations) {
      const dedup = deduplicateMovedMessagesInConversation(conv);
      if (dedup.removedMessageIds.length > 0) {
        removedIdsToDelete.push(...dedup.removedMessageIds);
      }
      const { messages, ...convHeader } = conv;
      const safeSubtitle = conv.subtitle ? String(conv.subtitle).slice(0, 255) : null;
      const safeName = String(conv.name || conv.id).slice(0, 255);
      const safeRoleTag = conv.roleTag ? String(conv.roleTag).slice(0, 60) : null;
      const safeColor = String(conv.color || '#1a73e8').slice(0, 30);
      const safeAvatar = conv.avatar ? String(conv.avatar).slice(0, 512) : null;
      const safeType = String(conv.type || 'space').slice(0, 20);

      await crm.crmChatConversation.upsert({
        where: { id: conv.id },
        create: {
          id: conv.id,
          type: safeType,
          name: safeName,
          subtitle: safeSubtitle,
          roleTag: safeRoleTag,
          color: safeColor,
          avatar: safeAvatar,
          participantStaffId: conv.participantStaffId ?? null,
          isSelf: Boolean(conv.isSelf),
          memberIdsJson: conv.memberIds ?? [],
          memberNicknamesJson: conv.memberNicknames ?? {},
          payloadJson: convHeader as SafeAny,
          updatedAt: parseSafeDate(conv.updatedAt),
        },
        update: {
          type: safeType,
          name: safeName,
          subtitle: safeSubtitle,
          roleTag: safeRoleTag,
          color: safeColor,
          avatar: safeAvatar,
          participantStaffId: conv.participantStaffId ?? null,
          isSelf: Boolean(conv.isSelf),
          memberIdsJson: conv.memberIds ?? [],
          memberNicknamesJson: conv.memberNicknames ?? {},
          payloadJson: convHeader as SafeAny,
          updatedAt: parseSafeDate(conv.updatedAt),
        },
      });

      for (const msg of messages || []) {
        const { thread, ...msgMeta } = msg;
        await crm.crmChatMessage.upsert({
          where: { id: msg.id },
          create: {
            id: msg.id,
            conversationId: conv.id,
            parentMessageId: null,
            senderId: String(msg.senderId),
            senderName: msg.senderName || 'Nhân sự',
            senderRole: msg.senderRole || 'STAFF',
            senderAvatar: msg.senderAvatar ?? null,
            roleColor: msg.roleColor ?? null,
            text: msg.text || '',
            timeLabel: msg.timeLabel || '',
            pinned: Boolean(msg.pinned),
            isDeleted: Boolean(msg.isDeleted),
            taskId: msg.taskId ?? null,
            missionId: msg.missionId ?? null,
            missionKey: msg.missionKey ?? null,
            workflowInstanceId: msg.workflowInstanceId ?? null,
            entityType: msg.entityContext?.entityType ?? null,
            entityId: msg.entityContext?.entityId != null ? String(msg.entityContext.entityId) : null,
            metadataJson: msgMeta as SafeAny,
            createdAt: parseSafeDate(msg.createdAt),
          },
          update: {
            conversationId: conv.id,
            parentMessageId: null,
            text: msg.text || '',
            pinned: Boolean(msg.pinned),
            isDeleted: Boolean(msg.isDeleted),
            taskId: msg.taskId ?? null,
            missionId: msg.missionId ?? null,
            missionKey: msg.missionKey ?? null,
            workflowInstanceId: msg.workflowInstanceId ?? null,
            entityType: msg.entityContext?.entityType ?? null,
            entityId: msg.entityContext?.entityId != null ? String(msg.entityContext.entityId) : null,
            metadataJson: msgMeta as SafeAny,
          },
        });

        for (const reply of thread || []) {
          await crm.crmChatMessage.upsert({
            where: { id: reply.id },
            create: {
              id: reply.id,
              conversationId: conv.id,
              parentMessageId: msg.id,
              senderId: String(reply.senderId),
              senderName: reply.senderName || 'Nhân sự',
              senderRole: reply.senderRole || 'STAFF',
              senderAvatar: reply.senderAvatar ?? null,
              roleColor: reply.roleColor ?? null,
              text: reply.text || '',
              timeLabel: reply.timeLabel || '',
              pinned: false,
              isDeleted: Boolean(reply.isDeleted),
              missionId: reply.missionId ?? null,
              metadataJson: reply as SafeAny,
              createdAt: parseSafeDate(reply.createdAt),
            },
            update: {
              conversationId: conv.id,
              parentMessageId: msg.id,
              text: reply.text || '',
              isDeleted: Boolean(reply.isDeleted),
              missionId: reply.missionId ?? null,
              metadataJson: reply as SafeAny,
            },
          });
        }
      }
    }
    if (removedIdsToDelete.length > 0) {
      await deleteChatMessagesFromRelationalDb(fastify, removedIdsToDelete);
    }
  } catch (err) {
    fastify.log?.warn?.({ err }, 'syncConversationsToRelationalDb warning');
  }
}

/**
 * Syncs tasks to relational `crm_chat_tasks` table.
 */
export async function syncTasksToRelationalDb(fastify: FastifyInstance, tasks: MosChatTaskItem[]): Promise<void> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatTask) return;

  try {
    const activeIds = tasks.map((t) => t.id);
    if (activeIds.length > 0) {
      await crm.crmChatTask.deleteMany({
        where: { id: { notIn: activeIds } },
      });
    }
    for (const task of tasks) {
      await crm.crmChatTask.upsert({
        where: { id: task.id },
        create: {
          id: task.id,
          conversationId: task.conversationId,
          conversationName: task.conversationName || task.conversationId,
          sourceMessageId: task.sourceMessageId ?? null,
          title: task.title,
          assigneeId: task.assigneeId != null ? String(task.assigneeId) : null,
          assigneeName: task.assigneeName || 'Nhân sự',
          creatorName: task.creatorName || 'Hệ thống',
          priority: task.priority || 'HIGH',
          remindAt: parseSafeDate(task.remindAt),
          dueAt: task.dueAt ? parseSafeDate(task.dueAt) : null,
          deadline: task.deadline ? parseSafeDate(task.deadline) : null,
          done: Boolean(task.done),
          archived: Boolean(task.archived),
          missionId: task.missionId ?? null,
          payloadJson: task as SafeAny,
          createdAt: parseSafeDate(task.createdAt),
        },
        update: {
          conversationId: task.conversationId,
          conversationName: task.conversationName || task.conversationId,
          sourceMessageId: task.sourceMessageId ?? null,
          title: task.title,
          assigneeId: task.assigneeId != null ? String(task.assigneeId) : null,
          assigneeName: task.assigneeName || 'Nhân sự',
          priority: task.priority || 'HIGH',
          remindAt: parseSafeDate(task.remindAt),
          dueAt: task.dueAt ? parseSafeDate(task.dueAt) : null,
          deadline: task.deadline ? parseSafeDate(task.deadline) : null,
          done: Boolean(task.done),
          archived: Boolean(task.archived),
          missionId: task.missionId ?? null,
          payloadJson: task as SafeAny,
        },
      });
    }
  } catch (err) {
    fastify.log?.warn?.({ err }, 'syncTasksToRelationalDb warning');
  }
}

/**
 * Syncs a user's sidebar preferences to relational `crm_chat_user_prefs` table.
 */
export async function syncUserPrefsToRelationalDb(
  fastify: FastifyInstance,
  userKey: string,
  prefs: MosChatUserSidebarPrefs
): Promise<void> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatUserPref) return;

  try {
    await crm.crmChatUserPref.upsert({
      where: { userKey },
      create: {
        userKey,
        prefsJson: prefs as SafeAny,
      },
      update: {
        prefsJson: prefs as SafeAny,
      },
    });
  } catch (err) {
    fastify.log?.warn?.({ err }, 'syncUserPrefsToRelationalDb warning');
  }
}
