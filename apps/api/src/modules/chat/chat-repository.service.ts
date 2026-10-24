import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';

let tablesEnsured = false;
let initialMigrationDone = false;
let chatMutationLock: Promise<SafeAny> = Promise.resolve();

export function withChatMutationLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = chatMutationLock.then(fn, fn);
  chatMutationLock = next.then(
    () => {},
    () => {}
  );
  return next;
}

/**
 * Ensures the 7 relational mOS Chat tables exist in MySQL CRM database.
 * Safe no-op if running against a mocked Prisma client in unit tests.
 */
export async function ensureChatRelationalTables(fastify: FastifyInstance): Promise<boolean> {
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!crm || typeof crm.$executeRawUnsafe !== 'function') {
    return false;
  }
  if (tablesEnsured) {
    return true;
  }

  try {
    await crm.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`crm_chat_conversations\` (
        \`id\` VARCHAR(120) NOT NULL,
        \`type\` VARCHAR(20) NOT NULL DEFAULT 'space',
        \`name\` VARCHAR(255) NOT NULL,
        \`subtitle\` VARCHAR(255) NULL,
        \`role_tag\` VARCHAR(60) NULL,
        \`color\` VARCHAR(30) NOT NULL DEFAULT '#1a73e8',
        \`avatar\` VARCHAR(512) NULL,
        \`participant_staff_id\` INT NULL,
        \`is_self\` TINYINT(1) NOT NULL DEFAULT 0,
        \`context_type\` VARCHAR(50) NULL,
        \`context_id\` VARCHAR(120) NULL,
        \`member_ids_json\` JSON NULL,
        \`member_nicknames_json\` JSON NULL,
        \`payload_json\` JSON NULL,
        \`created_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`chat_conv_type_updated_idx\` (\`type\`, \`updated_at\`),
        INDEX \`chat_conv_context_idx\` (\`context_type\`, \`context_id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await crm.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`crm_chat_participants\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`conversation_id\` VARCHAR(120) NOT NULL,
        \`staff_id\` INT NOT NULL,
        \`nickname\` VARCHAR(120) NULL,
        \`role\` VARCHAR(50) NULL,
        \`last_read_message_id\` VARCHAR(120) NULL,
        \`read_count\` INT NOT NULL DEFAULT 0,
        \`last_read_at\` DATETIME(0) NULL,
        \`updated_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`chat_part_conv_staff_uniq\` (\`conversation_id\`, \`staff_id\`),
        INDEX \`chat_part_staff_idx\` (\`staff_id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await crm.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`crm_chat_messages\` (
        \`id\` VARCHAR(120) NOT NULL,
        \`conversation_id\` VARCHAR(120) NOT NULL,
        \`parent_message_id\` VARCHAR(120) NULL,
        \`sender_id\` VARCHAR(80) NOT NULL,
        \`sender_name\` VARCHAR(150) NOT NULL,
        \`sender_role\` VARCHAR(80) NOT NULL,
        \`sender_avatar\` VARCHAR(512) NULL,
        \`role_color\` VARCHAR(40) NULL,
        \`text\` LONGTEXT NOT NULL,
        \`time_label\` VARCHAR(60) NOT NULL,
        \`pinned\` TINYINT(1) NOT NULL DEFAULT 0,
        \`is_deleted\` TINYINT(1) NOT NULL DEFAULT 0,
        \`task_id\` VARCHAR(120) NULL,
        \`mission_id\` INT NULL,
        \`mission_key\` VARCHAR(80) NULL,
        \`workflow_instance_id\` VARCHAR(120) NULL,
        \`entity_type\` VARCHAR(50) NULL,
        \`entity_id\` VARCHAR(120) NULL,
        \`metadata_json\` JSON NULL,
        \`created_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`chat_msg_conv_parent_created_idx\` (\`conversation_id\`, \`parent_message_id\`, \`created_at\`),
        INDEX \`chat_msg_workflow_idx\` (\`workflow_instance_id\`),
        INDEX \`chat_msg_entity_idx\` (\`entity_type\`, \`entity_id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await crm.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`crm_chat_tasks\` (
        \`id\` VARCHAR(120) NOT NULL,
        \`conversation_id\` VARCHAR(120) NOT NULL,
        \`conversation_name\` VARCHAR(255) NOT NULL,
        \`source_message_id\` VARCHAR(120) NULL,
        \`workflow_instance_id\` VARCHAR(120) NULL,
        \`title\` VARCHAR(500) NOT NULL,
        \`assignee_id\` VARCHAR(80) NULL,
        \`assignee_name\` VARCHAR(150) NOT NULL,
        \`creator_name\` VARCHAR(150) NOT NULL,
        \`priority\` VARCHAR(20) NOT NULL DEFAULT 'HIGH',
        \`remind_at\` DATETIME(0) NOT NULL,
        \`due_at\` DATETIME(0) NULL,
        \`deadline\` DATETIME(0) NULL,
        \`done\` TINYINT(1) NOT NULL DEFAULT 0,
        \`archived\` TINYINT(1) NOT NULL DEFAULT 0,
        \`mission_id\` INT NULL,
        \`payload_json\` JSON NULL,
        \`created_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`chat_task_conv_status_idx\` (\`conversation_id\`, \`done\`, \`archived\`),
        INDEX \`chat_task_assignee_idx\` (\`assignee_id\`, \`done\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await crm.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`crm_chat_user_prefs\` (
        \`user_key\` VARCHAR(120) NOT NULL,
        \`prefs_json\` JSON NOT NULL,
        \`updated_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`user_key\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await crm.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`crm_chat_workflow_templates\` (
        \`id\` VARCHAR(120) NOT NULL,
        \`code\` VARCHAR(80) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`category\` VARCHAR(50) NOT NULL DEFAULT 'OPERATIONS',
        \`target_system_hook\` VARCHAR(50) NOT NULL DEFAULT 'NONE',
        \`steps_json\` JSON NOT NULL,
        \`version\` INT NOT NULL DEFAULT 1,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`source_conversation_id\` VARCHAR(120) NULL,
        \`source_message_id\` VARCHAR(120) NULL,
        \`created_by\` VARCHAR(150) NULL,
        \`created_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`crm_chat_workflow_templates_code_key\` (\`code\`),
        INDEX \`chat_wf_tpl_cat_active_idx\` (\`category\`, \`is_active\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await crm.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`crm_chat_workflow_instances\` (
        \`id\` VARCHAR(120) NOT NULL,
        \`template_id\` VARCHAR(120) NOT NULL,
        \`template_code\` VARCHAR(80) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`conversation_id\` VARCHAR(120) NOT NULL,
        \`message_id\` VARCHAR(120) NOT NULL,
        \`status\` VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
        \`current_step_index\` INT NOT NULL DEFAULT 0,
        \`initiator_staff_id\` INT NULL,
        \`initiator_name\` VARCHAR(150) NOT NULL,
        \`steps_json\` JSON NOT NULL,
        \`step_logs_json\` JSON NOT NULL,
        \`form_data_json\` JSON NOT NULL,
        \`synced_record_type\` VARCHAR(50) NULL,
        \`synced_record_id\` INT NULL,
        \`created_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`chat_wf_inst_conv_status_idx\` (\`conversation_id\`, \`status\`),
        INDEX \`chat_wf_inst_code_status_idx\` (\`template_code\`, \`status\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    tablesEnsured = true;
    return true;
  } catch (err) {
    fastify.log?.warn?.({ err }, 'ensureChatRelationalTables fallback to crmConfig mode');
    return false;
  }
}

function parseSafeDate(iso?: string | null): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
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
    for (const conv of conversations) {
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

/**
 * Loads conversations, tasks, and userPrefs from relational Prisma tables if populated,
 * or performs automatic one-time migration from `crm_config` JSON blobs.
 */
export async function loadOrMigrateRelationalChatData(
  fastify: FastifyInstance,
  legacyData: {
    conversations: MosChatConversation[];
    tasks: MosChatTaskItem[];
    accessConfig: MosChatAccessConfig;
    userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs>;
  }
): Promise<{
  conversations: MosChatConversation[];
  tasks: MosChatTaskItem[];
  userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs>;
}> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatConversation) {
    return {
      conversations: legacyData.conversations,
      tasks: legacyData.tasks,
      userPrefsByUserKey: legacyData.userPrefsByUserKey,
    };
  }

  try {
    const convCount = await crm.crmChatConversation.count();
    if (convCount === 0 && !initialMigrationDone) {
      initialMigrationDone = true;
      await syncConversationsToRelationalDb(fastify, legacyData.conversations);
      await syncTasksToRelationalDb(fastify, legacyData.tasks);
      for (const [userKey, prefs] of Object.entries(legacyData.userPrefsByUserKey)) {
        await syncUserPrefsToRelationalDb(fastify, userKey, prefs);
      }
      return {
        conversations: legacyData.conversations,
        tasks: legacyData.tasks,
        userPrefsByUserKey: legacyData.userPrefsByUserKey,
      };
    }

    // Load from relational tables and merge with in-memory / legacy state so no data is ever lost
    const [dbConvs, dbMessages, dbTasks, dbPrefs] = await Promise.all([
      crm.crmChatConversation.findMany({ orderBy: { updatedAt: 'desc' } }),
      crm.crmChatMessage.findMany({ orderBy: { createdAt: 'asc' } }),
      crm.crmChatTask.findMany({ orderBy: { createdAt: 'desc' } }),
      crm.crmChatUserPref.findMany(),
    ]);

    if (dbConvs.length === 0) {
      return {
        conversations: legacyData.conversations,
        tasks: legacyData.tasks,
        userPrefsByUserKey: legacyData.userPrefsByUserKey,
      };
    }

    const repliesByParentId = new Map<string, MosChatThreadReply[]>();
    const rootMessagesByConvId = new Map<string, MosChatMessage[]>();

    for (const row of dbMessages) {
      const meta = (row.metadataJson || {}) as SafeAny;
      if (row.parentMessageId) {
        const reply: MosChatThreadReply = {
          ...meta,
          id: row.id,
          senderId: meta.senderId ?? row.senderId,
          senderName: row.senderName,
          senderRole: row.senderRole,
          senderAvatar: row.senderAvatar,
          roleColor: row.roleColor ?? meta.roleColor,
          text: row.text,
          timeLabel: row.timeLabel,
          createdAt: meta.createdAt || row.createdAt.toISOString(),
          isDeleted: Boolean(row.isDeleted),
          missionId: row.missionId ?? meta.missionId ?? null,
        };
        const list = repliesByParentId.get(row.parentMessageId) || [];
        list.push(reply);
        repliesByParentId.set(row.parentMessageId, list);
      } else {
        const msg: MosChatMessage = {
          ...meta,
          id: row.id,
          conversationId: row.conversationId,
          senderId: meta.senderId ?? row.senderId,
          senderName: row.senderName,
          senderRole: row.senderRole,
          senderAvatar: row.senderAvatar,
          roleColor: row.roleColor ?? meta.roleColor,
          text: row.text,
          timeLabel: row.timeLabel,
          createdAt: meta.createdAt || row.createdAt.toISOString(),
          pinned: Boolean(row.pinned),
          isDeleted: Boolean(row.isDeleted),
          taskId: row.taskId ?? meta.taskId ?? null,
          missionId: row.missionId ?? meta.missionId ?? null,
          missionKey: row.missionKey ?? meta.missionKey ?? null,
          workflowInstanceId: row.workflowInstanceId ?? meta.workflowInstanceId ?? null,
          thread: [],
        };
        const list = rootMessagesByConvId.get(row.conversationId) || [];
        list.push(msg);
        rootMessagesByConvId.set(row.conversationId, list);
      }
    }

    const reconstructedConvs: MosChatConversation[] = dbConvs.map((row: SafeAny) => {
      const payload = (row.payloadJson || {}) as SafeAny;
      const rootMsgs = (rootMessagesByConvId.get(row.id) || []).map((m) => ({
        ...m,
        thread: repliesByParentId.get(m.id) || m.thread || [],
      }));
      return {
        ...payload,
        id: row.id,
        type: (row.type as 'dm' | 'space') || 'space',
        name: row.name,
        subtitle: row.subtitle ?? payload.subtitle,
        roleTag: row.roleTag ?? payload.roleTag,
        color: row.color || payload.color || '#1a73e8',
        avatar: row.avatar ?? payload.avatar,
        participantStaffId: row.participantStaffId ?? payload.participantStaffId,
        isSelf: Boolean(row.isSelf ?? payload.isSelf),
        memberIds: Array.isArray(row.memberIdsJson) ? row.memberIdsJson : payload.memberIds,
        memberNicknames: (row.memberNicknamesJson as Record<string, string>) || payload.memberNicknames || {},
        unreadCount: payload.unreadCount || 0,
        messages: rootMsgs,
        updatedAt: payload.updatedAt || row.updatedAt.toISOString(),
      };
    });

    // Ensure any new conversations in legacyData not yet in DB are preserved
    const dbConvIds = new Set(reconstructedConvs.map((c) => c.id));
    for (const legacyConv of legacyData.conversations) {
      if (!dbConvIds.has(legacyConv.id)) {
        reconstructedConvs.push(legacyConv);
      }
    }

    const reconstructedTasks: MosChatTaskItem[] =
      dbTasks.length > 0
        ? dbTasks.map((row: SafeAny) => {
            const payload = (row.payloadJson || {}) as SafeAny;
            return {
              ...payload,
              id: row.id,
              conversationId: row.conversationId,
              conversationName: row.conversationName,
              sourceMessageId: row.sourceMessageId ?? payload.sourceMessageId ?? null,
              title: row.title,
              assigneeId: payload.assigneeId ?? row.assigneeId,
              assigneeName: row.assigneeName,
              creatorName: row.creatorName,
              priority: row.priority || 'HIGH',
              remindAt: payload.remindAt || row.remindAt.toISOString(),
              dueAt: payload.dueAt ?? (row.dueAt ? row.dueAt.toISOString() : null),
              deadline: payload.deadline ?? (row.deadline ? row.deadline.toISOString() : null),
              done: Boolean(row.done),
              archived: Boolean(row.archived),
              missionId: row.missionId ?? payload.missionId ?? null,
              createdAt: payload.createdAt || row.createdAt.toISOString(),
            };
          })
        : legacyData.tasks;

    const mergedPrefs: Record<string, MosChatUserSidebarPrefs> = {
      ...legacyData.userPrefsByUserKey,
    };
    for (const prefRow of dbPrefs) {
      if (prefRow.prefsJson && typeof prefRow.prefsJson === 'object') {
        mergedPrefs[prefRow.userKey] = prefRow.prefsJson as MosChatUserSidebarPrefs;
      }
    }

    return {
      conversations: reconstructedConvs,
      tasks: reconstructedTasks,
      userPrefsByUserKey: mergedPrefs,
    };
  } catch (err) {
    fastify.log?.warn?.({ err }, 'loadOrMigrateRelationalChatData fallback');
    return {
      conversations: legacyData.conversations,
      tasks: legacyData.tasks,
      userPrefsByUserKey: legacyData.userPrefsByUserKey,
    };
  }
}

/**
 * Append an AI bot message directly into a chat conversation in both JSON state and relational DB.
 */
export async function appendBotMessageToChatConversation(
  fastify: FastifyInstance,
  conversationId: string,
  message: {
    text: string;
    thinking?: string | null;
    suggestedAction?: SafeAny;
    suggestedActions?: SafeAny[];
    senderName?: string;
    recipientName?: string;
  }
): Promise<MosChatMessage | null> {
  return withChatMutationLock(async () => {
    const crm = (fastify as SafeAny)?.prisma?.crm;
    if (!crm) return null;

    try {
      const config = await crm.crmConfig.findUnique({ where: { key: 'mos_chat:conversations_v1' } });
      if (!config) return null;
      const convs: MosChatConversation[] = JSON.parse(config.value || '[]');
      let conv = convs.find((c) => c.id === conversationId);
      if (!conv) {
        if (conversationId.startsWith('space-')) {
          const slug = conversationId.replace(/^space-/, '');
          const isCore = slug.includes('core');
          conv = {
            id: conversationId,
            type: 'space',
            name: slug,
            subtitle: isCore ? 'Không gian phối hợp Ban Điều Hành & Đội Ngũ Cốt Lõi' : `Không gian trao đổi ${slug}`,
            roleTag: isCore ? 'Core Team' : 'Space',
            color: isCore ? '#722ed1' : '#10b981',
            memberCount: 5,
            unreadCount: 0,
            updatedAt: new Date().toISOString(),
            messages: [],
          };
          convs.unshift(conv);
        } else {
          return null;
        }
      }

      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      let cleanText = (message.text || '')
        .replace(/<action[\s\S]*?<\/action>/gi, '')
        .replace(/<\/?action[^>]*>/gi, '')
        .trim();

      if (message.recipientName && !cleanText.includes(`@${message.recipientName}`)) {
        cleanText = `Chào @${message.recipientName}, ${cleanText}`;
      }

      // Deduplication check: Avoid appending duplicate bot reply to this conversation within 120 seconds
      const existingPrematureBotMsg = conv.messages.find(
        (m) =>
          m.isAiBot &&
          (m.text.includes('Người dùng hiện tại') ||
            m.text.includes('Hiện kết nối MAI đang bận') ||
            (m.text.length < 100 && Math.abs(now.getTime() - new Date(m.createdAt).getTime()) < 120_000))
      );
      if (existingPrematureBotMsg) {
        existingPrematureBotMsg.text = cleanText;
        existingPrematureBotMsg.aiThinking = message.thinking || existingPrematureBotMsg.aiThinking || null;
        existingPrematureBotMsg.aiAction = message.suggestedAction || existingPrematureBotMsg.aiAction || null;
        existingPrematureBotMsg.aiActions =
          message.suggestedActions ||
          (message.suggestedAction ? [message.suggestedAction] : existingPrematureBotMsg.aiActions || null);
        await crm.crmConfig.update({
          where: { key: 'mos_chat:conversations_v1' },
          data: { value: JSON.stringify(convs) },
        });
        try {
          await syncConversationsToRelationalDb(fastify, convs);
        } catch (_) {}
        return existingPrematureBotMsg;
      }

      const recentBotMsg = conv.messages
        .slice(-15)
        .find(
          (m) =>
            m.isAiBot &&
            (m.text === cleanText ||
              m.text.trim() === cleanText.trim() ||
              m.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') === cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
            Math.abs(now.getTime() - new Date(m.createdAt).getTime()) < 120_000
        );
      if (recentBotMsg) {
        return recentBotMsg;
      }

      // Relational table secondary check
      try {
        const recentRelational = await crm.crmChatMessage?.findFirst({
          where: {
            conversationId: conv.id,
            parentMessageId: null,
            senderName: { contains: 'MAI' },
            createdAt: { gte: new Date(now.getTime() - 120_000) },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, text: true },
        });
        if (recentRelational) {
          const relTrim = recentRelational.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '');
          const curTrim = cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '');
          if (relTrim === curTrim || relTrim.slice(0, 100) === curTrim.slice(0, 100)) {
            const foundInConv = conv.messages.find((m) => m.id === recentRelational.id);
            if (foundInConv) return foundInConv;
          }
        }
      } catch (_) {}

      const newMsg: MosChatMessage = {
        id: `msg-${randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: 'wings-ai-copilot',
        senderName: message.senderName || '🤖 MAI',
        senderRole: 'mOS AI',
        senderAvatar: 'MAI',
        roleColor: '#8b5cf6',
        text: cleanText,
        timeLabel,
        createdAt: now.toISOString(),
        reactions: {},
        customerCard: null,
        thread: [],
        isAiBot: true,
        aiThinking: message.thinking || null,
        aiAction: message.suggestedAction || null,
        aiActions: message.suggestedActions || (message.suggestedAction ? [message.suggestedAction] : null),
      };

      conv.messages.push(newMsg);
      conv.updatedAt = now.toISOString();

      await crm.crmConfig.update({
        where: { key: 'mos_chat:conversations_v1' },
        data: { value: JSON.stringify(convs) },
      });

      // Also sync to relational DB if available
      try {
        await syncConversationsToRelationalDb(fastify, convs);
      } catch (_) {}

      return newMsg;
    } catch (err) {
      fastify.log?.warn?.({ err }, 'Failed to append bot message to chat conversation');
      return null;
    }
  });
}

/**
 * Append or update an AI bot thread reply directly into a chat conversation's thread.
 */
export async function appendBotThreadReplyToChatConversation(
  fastify: FastifyInstance,
  conversationId: string,
  parentMessageId: string,
  message: {
    text: string;
    thinking?: string | null;
    suggestedAction?: SafeAny;
    suggestedActions?: SafeAny[];
    senderName?: string;
    recipientName?: string;
  }
): Promise<MosChatThreadReply | null> {
  return withChatMutationLock(async () => {
    const crm = (fastify as SafeAny)?.prisma?.crm;
    if (!crm) return null;

    try {
      const config = await crm.crmConfig.findUnique({ where: { key: 'mos_chat:conversations_v1' } });
      if (!config) return null;
      const convs: MosChatConversation[] = JSON.parse(config.value || '[]');
      const conv = convs.find((c) => c.id === conversationId);
      if (!conv) return null;
      const msg = conv.messages.find((m) => m.id === parentMessageId);
      if (!msg) return null;

      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      let cleanText = (message.text || '')
        .replace(/<action[\s\S]*?<\/action>/gi, '')
        .replace(/<\/?action[^>]*>/gi, '')
        .trim();

      if (message.recipientName && !cleanText.includes(`@${message.recipientName}`)) {
        cleanText = `Chào @${message.recipientName}, ${cleanText}`;
      }

      msg.thread = msg.thread || [];

      // Check if premature/short bot message already exists in this thread within 2 minutes
      const prematureReply = msg.thread.find(
        (r) =>
          r.isAiBot &&
          (r.text.includes('Người dùng hiện tại') ||
            r.text.includes('Hiện kết nối MAI đang bận') ||
            (r.text.length < 100 && Math.abs(now.getTime() - new Date(r.createdAt).getTime()) < 120_000))
      );

      if (prematureReply) {
        prematureReply.text = cleanText;
        prematureReply.aiThinking = message.thinking || prematureReply.aiThinking || null;
        prematureReply.aiAction = message.suggestedAction || prematureReply.aiAction || null;
        prematureReply.aiActions =
          message.suggestedActions ||
          (message.suggestedAction ? [message.suggestedAction] : prematureReply.aiActions || null);
      } else {
        // Deduplication check: Avoid duplicate thread reply within 120 seconds
        const duplicate = msg.thread.find(
          (r) =>
            r.isAiBot &&
            (r.text === cleanText ||
              r.text.trim() === cleanText.trim() ||
              r.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') === cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
            Math.abs(now.getTime() - new Date(r.createdAt).getTime()) < 120_000
        );
        if (duplicate) return duplicate;

        // Relational DB secondary check
        try {
          const recentRelational = await crm.crmChatMessage?.findFirst({
            where: {
              parentMessageId,
              senderName: { contains: 'MAI' },
              createdAt: { gte: new Date(now.getTime() - 120_000) },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true, text: true },
          });
          if (recentRelational) {
            const relTrim = recentRelational.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '');
            const curTrim = cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '');
            if (relTrim === curTrim || relTrim.slice(0, 100) === curTrim.slice(0, 100)) {
              const foundInThread = msg.thread.find((r) => r.id === recentRelational.id);
              if (foundInThread) return foundInThread;
            }
          }
        } catch (_) {}

        const newReply: MosChatThreadReply = {
          id: `th-${randomUUID().slice(0, 8)}`,
          senderId: 'wings-ai-copilot',
          senderName: message.senderName || '🤖 MAI',
          senderRole: 'mOS AI',
          senderAvatar: 'MAI',
          roleColor: '#8b5cf6',
          text: cleanText,
          timeLabel,
          createdAt: now.toISOString(),
          isAiBot: true,
          aiThinking: message.thinking || null,
          aiAction: message.suggestedAction || null,
          aiActions: message.suggestedActions || (message.suggestedAction ? [message.suggestedAction] : null),
        };
        msg.thread.push(newReply);
      }

      conv.updatedAt = now.toISOString();

      await crm.crmConfig.update({
        where: { key: 'mos_chat:conversations_v1' },
        data: { value: JSON.stringify(convs) },
      });

      try {
        await syncConversationsToRelationalDb(fastify, convs);
      } catch (_) {}

      return msg.thread[msg.thread.length - 1];
    } catch (err) {
      fastify.log?.warn?.({ err }, 'Failed to append bot thread reply to chat conversation');
      return null;
    }
  });
}

/**
 * Deduplicate AI bot messages within conversations and threads created within 120s.
 * Merges reactions and deletes redundant records.
 */
export async function deduplicateBotMessages(
  fastify: FastifyInstance
): Promise<{ removedCount: number; removedIds: string[] }> {
  return withChatMutationLock(async () => {
    const crm = (fastify as SafeAny)?.prisma?.crm;
    if (!crm) return { removedCount: 0, removedIds: [] };

    try {
      const config = await crm.crmConfig.findUnique({ where: { key: 'mos_chat:conversations_v1' } });
      if (!config) return { removedCount: 0, removedIds: [] };
      const convs: MosChatConversation[] = JSON.parse(config.value || '[]');

      const removedIds: string[] = [];

      for (const conv of convs) {
        // 1. Deduplicate main messages
        const newMessages: MosChatMessage[] = [];
        for (const m of conv.messages) {
          if (m.isAiBot) {
            const prev = newMessages[newMessages.length - 1];
            if (
              prev &&
              prev.isAiBot &&
              (prev.text === m.text ||
                prev.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') ===
                  m.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
              Math.abs(new Date(prev.createdAt).getTime() - new Date(m.createdAt).getTime()) < 120_000
            ) {
              // Merge reactions
              if (m.reactions) {
                prev.reactions = prev.reactions || {};
                for (const [emoji, count] of Object.entries(m.reactions)) {
                  prev.reactions[emoji] = Math.max(prev.reactions[emoji] || 0, typeof count === 'number' ? count : 1);
                }
              }
              removedIds.push(m.id);
              continue;
            }
          }

          // 2. Deduplicate thread
          if (Array.isArray(m.thread) && m.thread.length > 1) {
            const newThread: MosChatThreadReply[] = [];
            for (const r of m.thread) {
              if (r.isAiBot) {
                const prev = newThread[newThread.length - 1];
                if (
                  prev &&
                  prev.isAiBot &&
                  (prev.text === r.text ||
                    prev.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') ===
                      r.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
                  Math.abs(new Date(prev.createdAt).getTime() - new Date(r.createdAt).getTime()) < 120_000
                ) {
                  // Merge reactions
                  if ((r as SafeAny).reactions) {
                    (prev as SafeAny).reactions = (prev as SafeAny).reactions || {};
                    for (const [emoji, count] of Object.entries((r as SafeAny).reactions)) {
                      (prev as SafeAny).reactions[emoji] = Math.max(
                        (prev as SafeAny).reactions[emoji] || 0,
                        typeof count === 'number' ? count : 1
                      );
                    }
                  }
                  removedIds.push(r.id);
                  continue;
                }
              }
              newThread.push(r);
            }
            m.thread = newThread;
          }

          newMessages.push(m);
        }
        conv.messages = newMessages;
      }

      if (removedIds.length > 0) {
        await crm.crmConfig.update({
          where: { key: 'mos_chat:conversations_v1' },
          data: { value: JSON.stringify(convs) },
        });

        try {
          await crm.crmChatMessage.deleteMany({
            where: { id: { in: removedIds } },
          });
        } catch (_) {}

        try {
          await syncConversationsToRelationalDb(fastify, convs);
        } catch (_) {}
      }

      return { removedCount: removedIds.length, removedIds };
    } catch (err) {
      fastify.log?.warn?.({ err }, 'Failed to deduplicate bot messages');
      return { removedCount: 0, removedIds: [] };
    }
  });
}
