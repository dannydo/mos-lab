import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadMoveMode,
  MosChatThreadReply,
} from '@mos-lab/shared';
import { MAX_TASKS_RETENTION } from './chat-state-defaults.js';

let taskMutationQueue: Promise<unknown> = Promise.resolve();

export async function withTaskMutationLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = taskMutationQueue.then(fn, fn);
  taskMutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function normalizeTaskTitleKey(rawTitle: string | undefined | null): string {
  return String(rawTitle || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function deduplicateTasks(
  tasks: MosChatTaskItem[],
  conversations?: MosChatConversation[]
): {
  tasks: MosChatTaskItem[];
  changed: boolean;
  convChanged: boolean;
} {
  const deduped: MosChatTaskItem[] = [];
  const byId = new Map<string, MosChatTaskItem>();
  const byMsgKey = new Map<string, MosChatTaskItem>();
  const byTitleKey = new Map<string, MosChatTaskItem>();
  const byMissionKey = new Map<string, MosChatTaskItem>();
  let changed = false;

  for (const raw of tasks) {
    if (!raw || !raw.id || !String(raw.title || '').trim()) {
      changed = true;
      continue;
    }
    const rawId = String(raw.id).trim();
    const rawAssignee = String(raw.assigneeName || '').trim();
    const rawAuthor = String(raw.sourceAuthorName || '').trim();
    const missionIdNum = raw.missionId && Number(raw.missionId) > 0 ? Number(raw.missionId) : 0;

    // Remove legacy seed tasks and any standalone tasks referencing resigned/mock staff Hà My
    if (
      rawId.startsWith('task-seed-') ||
      raw.sourceMessageId === 'msg-seed-2' ||
      raw.sourceMessageId === 'msg-seed-cv-1' ||
      ((rawAssignee.includes('Hà My') || rawAuthor.includes('Hà My')) && missionIdNum <= 0)
    ) {
      changed = true;
      continue;
    }

    const convId = String(raw.conversationId || '').trim();
    const msgId = raw.sourceMessageId ? String(raw.sourceMessageId).trim() : '';
    const normTitle = normalizeTaskTitleKey(raw.title);

    const msgKey = convId && msgId ? `${convId}::msg::${msgId}` : '';
    const titleKey = convId && normTitle ? `${convId}::title::${normTitle}` : '';
    const mKey = missionIdNum > 0 ? `mission::${missionIdNum}` : '';

    const existing =
      byId.get(rawId) ||
      (msgKey ? byMsgKey.get(msgKey) : undefined) ||
      (mKey ? byMissionKey.get(mKey) : undefined) ||
      (titleKey ? byTitleKey.get(titleKey) : undefined);

    if (existing) {
      changed = true;
      if (!existing.missionId && missionIdNum > 0) {
        existing.missionId = missionIdNum;
        existing.missionKey = raw.missionKey || existing.missionKey;
        existing.mission = raw.mission || existing.mission;
        if (mKey) byMissionKey.set(mKey, existing);
      } else if (!existing.mission && raw.mission) {
        existing.mission = raw.mission;
      }
      if (!existing.sourceMessageId && msgId) {
        existing.sourceMessageId = msgId;
        if (msgKey) byMsgKey.set(msgKey, existing);
      }
      if (existing.assigneeName.includes('Hà My') && rawAssignee && !rawAssignee.includes('Hà My')) {
        existing.assigneeName = rawAssignee;
        existing.assigneeId = raw.assigneeId ?? existing.assigneeId;
      }
      continue;
    }

    const sanitizedAssignee = rawAssignee.includes('Hà My')
      ? raw.creatorName && !raw.creatorName.includes('Hà My')
        ? raw.creatorName
        : 'Danny Do'
      : rawAssignee;
    if (sanitizedAssignee !== raw.assigneeName) {
      changed = true;
    }

    const cloned: MosChatTaskItem = {
      ...raw,
      assigneeName: sanitizedAssignee,
    };
    deduped.push(cloned);
    byId.set(cloned.id, cloned);
    if (msgKey) byMsgKey.set(msgKey, cloned);
    if (titleKey) byTitleKey.set(titleKey, cloned);
    if (mKey) byMissionKey.set(mKey, cloned);
  }

  let convChanged = false;
  if (Array.isArray(conversations) && conversations.length > 0) {
    for (const c of conversations) {
      if (!Array.isArray(c.messages)) continue;
      const beforeLen = c.messages.length;
      c.messages = c.messages.filter((m) => {
        if (!m) return false;
        const text = String(m.text || '').trim();
        // Strip automated mOS Reminder spam messages and mock Hà My messages
        if (
          m.senderId === 'system-reminder' ||
          m.senderName === 'mOS Reminder' ||
          text.startsWith('Đến giờ nhắc việc:') ||
          m.id === 'msg-seed-2' ||
          m.senderId === 'staff-hm' ||
          m.senderName === 'Hà My' ||
          text.includes('Giao việc cho Hà My')
        ) {
          return false;
        }
        if (Array.isArray(m.thread) && m.thread.length > 0) {
          const origThreadLen = m.thread.length;
          m.thread = m.thread.filter(
            (th) => th.id !== 'th-seed-1' && th.senderId !== 'staff-hm' && th.senderName !== 'Hà My'
          );
          if (m.thread.length !== origThreadLen) {
            convChanged = true;
          }
        }
        return true;
      });
      if (c.messages.length !== beforeLen) {
        convChanged = true;
      }

      for (const m of c.messages) {
        const msgKey = `${c.id}::msg::${m.id}`;
        const canonicalTask = byMsgKey.get(msgKey);
        if (canonicalTask && m.taskId !== canonicalTask.id) {
          m.taskId = canonicalTask.id;
          convChanged = true;
        } else if (!canonicalTask && m.taskId && !byId.has(m.taskId)) {
          delete m.taskId;
          convChanged = true;
        }
      }
    }
  }

  return {
    tasks: deduped.slice(0, MAX_TASKS_RETENTION),
    changed,
    convChanged,
  };
}

export function trimTasksRetention(tasks: MosChatTaskItem[], conversations?: MosChatConversation[]): MosChatTaskItem[] {
  return deduplicateTasks(tasks, conversations).tasks;
}

export function sortRepliesChronologically(replies: MosChatThreadReply[]): MosChatThreadReply[] {
  return [...replies].sort((a, b) => {
    const tA = a.createdAt ? Date.parse(a.createdAt) : NaN;
    const tB = b.createdAt ? Date.parse(b.createdAt) : NaN;
    if (Number.isFinite(tA) && Number.isFinite(tB) && tA !== tB) {
      return tA - tB;
    }
    return 0;
  });
}

export function moveChatThreadItemInMemory(
  conv: MosChatConversation,
  tasks: MosChatTaskItem[],
  params: {
    mode: MosChatThreadMoveMode;
    sourceMessageId: string;
    replyId?: string | null;
    targetMessageId?: string | null;
  }
): {
  targetMessage: MosChatMessage | null;
  promotedMessage: MosChatMessage | null;
  movedReplies: MosChatThreadReply[];
  tasksChanged: boolean;
  deletedMessageIds: string[];
} {
  const { mode, sourceMessageId, replyId, targetMessageId } = params;
  const sourceIdx = conv.messages.findIndex((m) => m.id === sourceMessageId);
  if (sourceIdx < 0) {
    throw new Error('Không tìm thấy tin nhắn nguồn.');
  }
  const sourceMsg = conv.messages[sourceIdx];

  if (mode === 'MERGE_ROOT_TO_THREAD') {
    if (!targetMessageId || targetMessageId === sourceMessageId) {
      throw new Error('Vui lòng chọn một luồng đích hợp lệ để gộp tin nhắn.');
    }
    const targetMsg = conv.messages.find((m) => m.id === targetMessageId);
    if (!targetMsg) {
      throw new Error('Không tìm thấy tin nhắn luồng đích.');
    }

    const linkedTask = tasks.find(
      (t) => t.sourceMessageId === sourceMsg.id || (sourceMsg.taskId && t.id === sourceMsg.taskId)
    );
    const resolvedText = (sourceMsg.text || '').trim() || (linkedTask?.title ? `📌 ${linkedTask.title}` : '');

    const convertedReply: MosChatThreadReply = {
      id: `th-mv-${sourceMsg.id.replace(/^msg-/, '')}`,
      senderId: sourceMsg.senderId,
      senderName: sourceMsg.senderName,
      senderRole: sourceMsg.senderRole,
      senderAvatar: sourceMsg.senderAvatar,
      text: resolvedText,
      attachments: sourceMsg.attachments && sourceMsg.attachments.length > 0 ? sourceMsg.attachments : undefined,
      customerCard: sourceMsg.customerCard || undefined,
      timeLabel: sourceMsg.timeLabel,
      createdAt: sourceMsg.createdAt || new Date().toISOString(),
      editHistory: sourceMsg.editHistory,
      editedAt: sourceMsg.editedAt,
      editedBy: sourceMsg.editedBy,
      isDeleted: sourceMsg.isDeleted,
      deletedAt: sourceMsg.deletedAt,
      deletedBy: sourceMsg.deletedBy,
      deletedByName: sourceMsg.deletedByName,
      originalText: sourceMsg.originalText,
    };

    const childReplies = Array.isArray(sourceMsg.thread) ? sourceMsg.thread : [];
    const existingTargetThread = Array.isArray(targetMsg.thread) ? targetMsg.thread : [];
    const existingIds = new Set(existingTargetThread.map((r) => r.id));

    const toAppend: MosChatThreadReply[] = [];
    if (
      !existingIds.has(convertedReply.id) &&
      (convertedReply.text.trim() || convertedReply.attachments?.length || convertedReply.customerCard)
    ) {
      toAppend.push(convertedReply);
      existingIds.add(convertedReply.id);
    }
    for (const child of childReplies) {
      if (!existingIds.has(child.id)) {
        toAppend.push(child);
        existingIds.add(child.id);
      }
    }

    targetMsg.thread = sortRepliesChronologically([...existingTargetThread, ...toAppend]);

    // Transfer Mission ownership if sourceMsg had a mission and targetMsg did not
    if (sourceMsg.missionId && !targetMsg.missionId) {
      targetMsg.missionId = sourceMsg.missionId;
      targetMsg.missionKey = sourceMsg.missionKey;
      targetMsg.mission = sourceMsg.mission;
      targetMsg.missionSyncedStage = sourceMsg.missionSyncedStage;
      targetMsg.missionSyncedCommentIds = sourceMsg.missionSyncedCommentIds;
    }

    // Re-link any tasks pointing to sourceMsg over to targetMsg
    let tasksChanged = false;
    for (const t of tasks) {
      if (t.sourceMessageId === sourceMsg.id || (sourceMsg.taskId && t.id === sourceMsg.taskId)) {
        t.sourceMessageId = targetMsg.id;
        if (!targetMsg.taskId) {
          targetMsg.taskId = t.id;
        }
        tasksChanged = true;
      }
    }

    // Remove sourceMsg from root messages
    conv.messages = conv.messages.filter((m) => m.id !== sourceMsg.id);
    conv.updatedAt = new Date().toISOString();

    return {
      targetMessage: targetMsg,
      promotedMessage: null,
      movedReplies: toAppend.filter((r) => !r.isMissionMilestone),
      tasksChanged,
      deletedMessageIds: [sourceMsg.id],
    };
  }

  if (mode === 'PROMOTE_REPLY_TO_ROOT') {
    if (!replyId) {
      throw new Error('Thiếu mã phản hồi (replyId) cần tách ra luồng chính.');
    }
    const sourceThread = Array.isArray(sourceMsg.thread) ? sourceMsg.thread : [];
    const replyItem = sourceThread.find((r) => r.id === replyId);
    if (!replyItem) {
      throw new Error('Không tìm thấy câu trả lời cần tách trong luồng.');
    }

    sourceMsg.thread = sourceThread.filter((r) => r.id !== replyId);

    const promotedMsg: MosChatMessage = {
      id: `msg-pr-${replyItem.id.replace(/^th-/, '')}`,
      conversationId: conv.id,
      senderId: replyItem.senderId,
      senderName: replyItem.senderName,
      senderRole: replyItem.senderRole,
      senderAvatar: replyItem.senderAvatar,
      roleColor: '#38bdf8',
      text: replyItem.text || '',
      attachments: replyItem.attachments && replyItem.attachments.length > 0 ? replyItem.attachments : undefined,
      timeLabel: replyItem.timeLabel,
      createdAt: replyItem.createdAt || new Date().toISOString(),
      reactions: replyItem.reactions || {},
      reactionUsers: replyItem.reactionUsers,
      customerCard: replyItem.customerCard || null,
      thread: [],
      aiThinking: replyItem.aiThinking || null,
      aiAction: replyItem.aiAction || null,
      aiActions: replyItem.aiActions,
      editHistory: replyItem.editHistory,
      editedAt: replyItem.editedAt,
      editedBy: replyItem.editedBy,
      isAiBot: replyItem.isAiBot,
    };

    const nextMessages = [...conv.messages];
    const promotedTime = promotedMsg.createdAt ? Date.parse(promotedMsg.createdAt) : NaN;
    let inserted = false;
    if (Number.isFinite(promotedTime)) {
      for (let i = sourceIdx + 1; i < nextMessages.length; i++) {
        const msgTime = nextMessages[i]?.createdAt ? Date.parse(nextMessages[i].createdAt!) : NaN;
        if (Number.isFinite(msgTime) && msgTime > promotedTime) {
          nextMessages.splice(i, 0, promotedMsg);
          inserted = true;
          break;
        }
      }
    }
    if (!inserted) {
      nextMessages.push(promotedMsg);
    }
    conv.messages = nextMessages;
    conv.updatedAt = new Date().toISOString();

    return {
      targetMessage: sourceMsg,
      promotedMessage: promotedMsg,
      movedReplies: [],
      tasksChanged: false,
      deletedMessageIds: [replyId],
    };
  }

  if (mode === 'MOVE_REPLY_TO_THREAD') {
    if (!replyId || !targetMessageId || targetMessageId === sourceMessageId) {
      throw new Error('Vui lòng chọn phản hồi và luồng đích hợp lệ để di chuyển.');
    }
    const targetMsg = conv.messages.find((m) => m.id === targetMessageId);
    if (!targetMsg) {
      throw new Error('Không tìm thấy tin nhắn luồng đích.');
    }
    const sourceThread = Array.isArray(sourceMsg.thread) ? sourceMsg.thread : [];
    const replyItem = sourceThread.find((r) => r.id === replyId);
    if (!replyItem) {
      throw new Error('Không tìm thấy câu trả lời cần di chuyển.');
    }

    sourceMsg.thread = sourceThread.filter((r) => r.id !== replyId);
    const existingTargetThread = Array.isArray(targetMsg.thread) ? targetMsg.thread : [];
    targetMsg.thread = sortRepliesChronologically([...existingTargetThread, replyItem]);
    conv.updatedAt = new Date().toISOString();

    return {
      targetMessage: targetMsg,
      promotedMessage: null,
      movedReplies: replyItem.isMissionMilestone ? [] : [replyItem],
      tasksChanged: false,
      deletedMessageIds: [],
    };
  }

  throw new Error('Chế độ di chuyển luồng không hợp lệ.');
}
