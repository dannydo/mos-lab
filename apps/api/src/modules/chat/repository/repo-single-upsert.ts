import type { FastifyInstance } from 'fastify';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { ensureChatRelationalTables, parseSafeDate } from './repo-schema-and-lock.js';

/**
 * Direct O(1) Row Upsert for a single conversation header (~1-2ms).
 * Eliminates the O(N) full-history loop when a single room changes.
 */
export async function upsertSingleConversationHeaderToRelationalDb(
  fastify: FastifyInstance,
  conv: MosChatConversation
): Promise<void> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatConversation) return;

  try {
    const { messages: _messages, ...convHeader } = conv;
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
  } catch (err) {
    fastify.log?.warn?.({ err }, 'upsertSingleConversationHeaderToRelationalDb warning');
  }
}

/**
 * Direct O(1) Row Upsert for a single root message (~1-2ms).
 */
export async function upsertSingleMessageToRelationalDb(
  fastify: FastifyInstance,
  conversationId: string,
  msg: MosChatMessage
): Promise<void> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatMessage) return;

  try {
    const { thread: _thread, ...msgMeta } = msg;
    await crm.crmChatMessage.upsert({
      where: { id: msg.id },
      create: {
        id: msg.id,
        conversationId,
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
        missionId: msg.missionId ?? msg.mission?.reportId ?? null,
        missionKey: msg.missionKey ?? msg.mission?.missionKey ?? null,
        workflowInstanceId: msg.workflowInstanceId ?? null,
        entityType: msg.entityContext?.entityType ?? null,
        entityId: msg.entityContext?.entityId != null ? String(msg.entityContext.entityId) : null,
        metadataJson: msgMeta as SafeAny,
        createdAt: parseSafeDate(msg.createdAt),
      },
      update: {
        conversationId,
        parentMessageId: null,
        text: msg.text || '',
        pinned: Boolean(msg.pinned),
        isDeleted: Boolean(msg.isDeleted),
        taskId: msg.taskId ?? null,
        missionId: msg.missionId ?? msg.mission?.reportId ?? null,
        missionKey: msg.missionKey ?? msg.mission?.missionKey ?? null,
        workflowInstanceId: msg.workflowInstanceId ?? null,
        entityType: msg.entityContext?.entityType ?? null,
        entityId: msg.entityContext?.entityId != null ? String(msg.entityContext.entityId) : null,
        metadataJson: msgMeta as SafeAny,
      },
    });
  } catch (err) {
    fastify.log?.warn?.({ err }, 'upsertSingleMessageToRelationalDb warning');
  }
}

/**
 * Direct O(1) Row Upsert for a single thread reply (~1-2ms).
 */
export async function upsertSingleThreadReplyToRelationalDb(
  fastify: FastifyInstance,
  conversationId: string,
  parentMessageId: string,
  reply: MosChatThreadReply
): Promise<void> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatMessage) return;

  try {
    await crm.crmChatMessage.upsert({
      where: { id: reply.id },
      create: {
        id: reply.id,
        conversationId,
        parentMessageId,
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
        conversationId,
        parentMessageId,
        text: reply.text || '',
        isDeleted: Boolean(reply.isDeleted),
        missionId: reply.missionId ?? null,
        metadataJson: reply as SafeAny,
      },
    });
  } catch (err) {
    fastify.log?.warn?.({ err }, 'upsertSingleThreadReplyToRelationalDb warning');
  }
}

/**
 * Direct O(1+K) Row Upsert for a root message AND all of its subthread replies.
 * Used when forwarding a thread so cloned replies persist immediately to MySQL.
 */
export async function upsertMessageWithThreadToRelationalDb(
  fastify: FastifyInstance,
  conversationId: string,
  msg: MosChatMessage
): Promise<void> {
  await upsertSingleMessageToRelationalDb(fastify, conversationId, msg);
  const replies = Array.isArray(msg.thread) ? msg.thread : [];
  if (replies.length === 0) return;

  const CHUNK_SIZE = 15;
  for (let i = 0; i < replies.length; i += CHUNK_SIZE) {
    const chunk = replies.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((reply) => upsertSingleThreadReplyToRelationalDb(fastify, conversationId, msg.id, reply))
    );
  }
}

/**
 * Direct O(1) Row Upsert for a single task (~1-2ms).
 */
export async function upsertSingleTaskToRelationalDb(fastify: FastifyInstance, task: MosChatTaskItem): Promise<void> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatTask) return;

  try {
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
        missionId: task.missionId ?? task.mission?.reportId ?? null,
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
        missionId: task.missionId ?? task.mission?.reportId ?? null,
        payloadJson: task as SafeAny,
      },
    });
  } catch (err) {
    fastify.log?.warn?.({ err }, 'upsertSingleTaskToRelationalDb warning');
  }
}

/**
 * Direct O(1) Row Delete for a single task.
 */
export async function deleteSingleTaskFromRelationalDb(fastify: FastifyInstance, taskId: string): Promise<void> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatTask) return;

  try {
    await crm.crmChatTask.deleteMany({
      where: { id: taskId },
    });
  } catch (err) {
    fastify.log?.warn?.({ err }, 'deleteSingleTaskFromRelationalDb warning');
  }
}
