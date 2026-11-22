import type { FastifyInstance } from 'fastify';
import type { MosChatConversation, MosChatMessage, MosChatThreadReply, SafeAny } from '@mos-lab/shared';

let tablesEnsured = false;
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

export function parseSafeDate(iso?: string | null): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Removes zombie root messages (`msg-<suffix>`) that were already merged into a thread (`th-mv-<suffix>`)
 * and zombie thread replies (`th-<suffix>`) that were already promoted to root (`msg-pr-<suffix>`).
 */
export function deduplicateMovedMessagesInConversation(conv: MosChatConversation): {
  removedMessageIds: string[];
  changed: boolean;
} {
  const removedMessageIds: string[] = [];
  if (!conv || !Array.isArray(conv.messages)) {
    return { removedMessageIds, changed: false };
  }

  const movedRootCandidateIds = new Set<string>();
  const promotedReplyCandidateIds = new Set<string>();

  for (const msg of conv.messages) {
    if (msg.id.startsWith('msg-pr-') && !msg.isDeleted) {
      const suffix = msg.id.slice('msg-pr-'.length);
      if (suffix) {
        promotedReplyCandidateIds.add(`th-${suffix}`);
        promotedReplyCandidateIds.add(suffix);
      }
    }
    for (const reply of msg.thread || []) {
      if (reply.id.startsWith('th-mv-') && !reply.isDeleted) {
        const suffix = reply.id.slice('th-mv-'.length);
        if (suffix) {
          movedRootCandidateIds.add(`msg-${suffix}`);
          movedRootCandidateIds.add(suffix);
        }
      }
    }
  }

  if (movedRootCandidateIds.size === 0 && promotedReplyCandidateIds.size === 0) {
    return { removedMessageIds, changed: false };
  }

  let changed = false;
  const nextMessages: MosChatMessage[] = [];
  for (const msg of conv.messages) {
    const hasOwnActiveThread = Array.isArray(msg.thread) && msg.thread.some((r) => !r.isDeleted);
    const hasOwnTask = Boolean(msg.taskId);
    if (movedRootCandidateIds.has(msg.id) && !hasOwnActiveThread && !hasOwnTask) {
      removedMessageIds.push(msg.id);
      changed = true;
      continue;
    }

    if (promotedReplyCandidateIds.size > 0 && Array.isArray(msg.thread) && msg.thread.length > 0) {
      const nextThread: MosChatThreadReply[] = [];
      for (const reply of msg.thread) {
        if (promotedReplyCandidateIds.has(reply.id)) {
          removedMessageIds.push(reply.id);
          changed = true;
        } else {
          nextThread.push(reply);
        }
      }
      if (nextThread.length !== msg.thread.length) {
        msg.thread = nextThread;
      }
    }
    nextMessages.push(msg);
  }

  if (changed) {
    conv.messages = nextMessages;
  }

  return { removedMessageIds, changed };
}
