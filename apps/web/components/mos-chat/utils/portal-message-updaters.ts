import type {
  MosChatBuzzEvent,
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
} from '@mos-lab/shared';

export function hasUserReactedInMessage(
  m: { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> } | undefined,
  emoji: string,
  currentUserReactionKey: string
): boolean {
  if (!m) return false;
  const count = m.reactions?.[emoji] || 0;
  if (count <= 0) return false;
  const users = m.reactionUsers?.[emoji];
  if (!Array.isArray(users)) {
    return true;
  }
  return users.map(String).includes(currentUserReactionKey);
}

export function applyReactionToggleToMessage<
  T extends { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> },
>(m: T, emoji: string, currentUserReactionKey: string): T {
  const nextReactions = { ...(m.reactions || {}) };
  const nextReactionUsers = { ...(m.reactionUsers || {}) };
  const existingUsers = nextReactionUsers[emoji];
  const currentCount = nextReactions[emoji] || 0;

  if (Array.isArray(existingUsers)) {
    const normalized = existingUsers.map(String);
    if (normalized.includes(currentUserReactionKey)) {
      const remaining = normalized.filter((u) => u !== currentUserReactionKey);
      if (remaining.length === 0) {
        delete nextReactions[emoji];
        delete nextReactionUsers[emoji];
      } else {
        nextReactionUsers[emoji] = remaining;
        nextReactions[emoji] = remaining.length;
      }
    } else {
      const updated = [...normalized, currentUserReactionKey];
      nextReactionUsers[emoji] = updated;
      nextReactions[emoji] = updated.length;
    }
  } else if (currentCount > 0) {
    delete nextReactions[emoji];
    delete nextReactionUsers[emoji];
  } else {
    nextReactionUsers[emoji] = [currentUserReactionKey];
    nextReactions[emoji] = 1;
  }

  return {
    ...m,
    reactions: nextReactions,
    reactionUsers: nextReactionUsers,
  };
}

export function mapConversationMessage(
  conversations: MosChatConversation[],
  convId: string,
  msgId: string,
  transform: (msg: MosChatMessage) => MosChatMessage,
  updatedAt?: string
): MosChatConversation[] {
  return conversations.map((c) => {
    if (c.id !== convId) return c;
    return {
      ...c,
      ...(updatedAt ? { updatedAt } : {}),
      messages: c.messages.map((m) => (m.id === msgId ? transform(m) : m)),
    };
  });
}

export function mapThreadReplyInMessage(
  msg: MosChatMessage,
  replyId: string,
  transform: (reply: MosChatThreadReply) => MosChatThreadReply
): MosChatMessage {
  return {
    ...msg,
    thread: (msg.thread || []).map((r) => (r.id === replyId ? transform(r) : r)),
  };
}

export function applyEditToMessageItem<
  T extends {
    text: string;
    editHistory?: MosChatMessage['editHistory'];
    editedAt?: string | null;
    editedBy?: string | number | null;
  },
>(item: T, trimmed: string, myId: string | number, myName: string, nowIso: string): T {
  const oldHistory = item.editHistory || [];
  return {
    ...item,
    editHistory: [...oldHistory, { text: item.text, editedAt: nowIso, editedBy: myId, editorName: myName }],
    text: trimmed,
    editedAt: nowIso,
    editedBy: myId,
  };
}

export function applyDeleteToMessageItem<
  T extends {
    text: string;
    originalText?: string | null;
    isDeleted?: boolean;
    deletedAt?: string | null;
    deletedBy?: string | number | null;
    deletedByName?: string | null;
  },
>(item: T, myId: string | number, myName: string, nowIso: string): T {
  return {
    ...item,
    originalText: item.originalText || item.text,
    isDeleted: true,
    deletedAt: nowIso,
    deletedBy: myId,
    deletedByName: myName,
  };
}

export function applyRestoreToMessageItem<
  T extends {
    text: string;
    originalText?: string | null;
    isDeleted?: boolean;
    deletedAt?: string | null;
    deletedBy?: string | number | null;
    deletedByName?: string | null;
  },
>(item: T): T {
  return {
    ...item,
    text: item.text || item.originalText || '',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletedByName: null,
  };
}

export function applyBuzzToMessageItem<
  T extends {
    isBuzzed?: boolean;
    buzzedAt?: string | null;
    buzzCount?: number;
    latestBuzz?: MosChatBuzzEvent | null;
    buzzHistory?: MosChatBuzzEvent[];
  },
>(item: T, buzzEvent: MosChatBuzzEvent): T {
  return {
    ...item,
    isBuzzed: true,
    buzzedAt: buzzEvent.buzzedAt,
    buzzCount: (item.buzzCount || 0) + 1,
    latestBuzz: buzzEvent,
    buzzHistory: [...(item.buzzHistory || []), buzzEvent],
  };
}

export function formatMoveTargetSnippetFromTasks(msg: MosChatMessage, uniqueTasks: MosChatTaskItem[]): string {
  const raw = String(msg.text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (raw) {
    return raw.length > 72 ? `${raw.slice(0, 72)}…` : raw;
  }
  const linkedTask = uniqueTasks.find((t) => t.sourceMessageId === msg.id || (msg.taskId && t.id === msg.taskId));
  if (linkedTask?.title) {
    const taskText = `📌 ${linkedTask.title.replace(/\s+/g, ' ').trim()}`;
    return taskText.length > 72 ? `${taskText.slice(0, 72)}…` : taskText;
  }
  if (msg.attachments && msg.attachments.length > 0) {
    return `[Đính kèm ${msg.attachments.length} hình ảnh]`;
  }
  return '[Tin nhắn]';
}
