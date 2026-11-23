import dayjs from 'dayjs';
import { message as antdMessage } from 'antd';
import type {
  AiChatMessage,
  MosChatConversation,
  MosChatMessage,
  MosChatReadReceiptEntry,
  MosChatStaffMember,
  MosChatThreadReadReceiptEntry,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import { parseStickerReactionKey } from '../../mos-chat-stickers';

export function isUserMessageOwner(
  message:
    | {
        senderId?: number | string | null;
        senderName?: string | null;
        isAiBot?: boolean;
        isSystemReminder?: boolean;
      }
    | null
    | undefined,
  currentUser: SafeAny
): boolean {
  if (!message || message.isAiBot || message.isSystemReminder || message.senderId === 'system-reminder') {
    return false;
  }
  if (message.senderId === 'me') return true;
  if (currentUser?.id && message.senderId && String(message.senderId) === String(currentUser.id)) {
    return true;
  }
  const senderClean = String(message.senderName || '')
    .trim()
    .toLowerCase();
  const myNameClean = String(currentUser?.displayName || currentUser?.name || currentUser?.fullName || '')
    .trim()
    .toLowerCase();
  const myUserClean = String(currentUser?.username || '')
    .trim()
    .toLowerCase();
  if (senderClean && ((myNameClean && senderClean === myNameClean) || (myUserClean && senderClean === myUserClean))) {
    return true;
  }
  if (!currentUser?.id && senderClean === 'danny do') {
    return true;
  }
  return false;
}

/**
 * Chuẩn hóa tin nhắn AI từ backend sang định dạng MosChatMessage hiển thị trên cả desktop và mobile (MOS-BUG-170).
 */
export function formatBackendAiMessage(
  bm: AiChatMessage,
  currentUser?: { id?: number | string; displayName?: string; username?: string; role?: string } | null
): MosChatMessage {
  const isBot = bm.role === 'assistant';
  const rawContent = bm.content || '';
  const actionMatches: NonNullable<MosChatMessage['aiAction']>[] = [];
  const regex = /<action(?:\s+type="([^"]*)")?(?:\s+label="([^"]*)")?>([\s\S]*?)<\/action>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawContent)) !== null) {
    try {
      actionMatches.push({
        type: match[1]?.trim() || 'APPLY_FILTER',
        label: match[2]?.trim() || 'Áp dụng bộ lọc gợi ý',
        payload: JSON.parse(match[3]?.trim() || '{}'),
      });
    } catch {
      // ignore
    }
  }
  const cleanText = rawContent
    .replace(/<action[\s\S]*?<\/action>/gi, '')
    .replace(/<\/?action[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const existingActions = bm.suggestedActions || (bm.suggestedAction ? [bm.suggestedAction] : []);
  const allActions = [...existingActions, ...actionMatches].filter(
    (act, index, self) =>
      index ===
      self.findIndex((a) => a.label === act.label && JSON.stringify(a.payload) === JSON.stringify(act.payload))
  );

  return {
    id: bm.id,
    conversationId: AI_COPILOT_CONV_ID,
    senderId: isBot ? 'wings-ai-copilot' : String(currentUser?.id || 'me'),
    senderName: isBot ? '🤖 MAI' : currentUser?.displayName || currentUser?.username || 'Bạn',
    senderRole: isBot ? 'mOS AI' : currentUser?.role || 'Staff',
    senderAvatar: isBot ? 'MAI' : 'U',
    roleColor: isBot ? '#8b5cf6' : '#2563eb',
    isAiBot: isBot,
    text: cleanText,
    aiThinking: bm.thinking || null,
    aiAction: allActions[0] || bm.suggestedAction || null,
    aiActions: allActions.length > 0 ? allActions : null,
    timeLabel: dayjs(bm.createdAt).format('HH:mm'),
    createdAt: bm.createdAt,
    reactions: {},
    thread: [],
  };
}

/**
 * Toggles a reaction on a message or reply object.
 * If userKey already reacted with emoji, removes it. Otherwise, adds it.
 */
export function toggleReactionState<
  T extends { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> },
>(target: T, emoji: string, userKey: string): T {
  const nextReactions = { ...(target.reactions || {}) };
  const nextReactionUsers = { ...(target.reactionUsers || {}) };
  const existingUsers = nextReactionUsers[emoji];
  const currentCount = nextReactions[emoji] || 0;

  if (Array.isArray(existingUsers)) {
    const normalized = existingUsers.map(String);
    if (normalized.includes(userKey)) {
      const remaining = normalized.filter((u) => u !== userKey);
      if (remaining.length === 0) {
        delete nextReactions[emoji];
        delete nextReactionUsers[emoji];
      } else {
        nextReactionUsers[emoji] = remaining;
        nextReactions[emoji] = remaining.length;
      }
    } else {
      const updated = [...normalized, userKey];
      nextReactionUsers[emoji] = updated;
      nextReactions[emoji] = updated.length;
    }
  } else if (currentCount > 0) {
    // Legacy reaction without per-user tracking: clicking undoes/clears it
    delete nextReactions[emoji];
    delete nextReactionUsers[emoji];
  } else {
    nextReactionUsers[emoji] = [userKey];
    nextReactions[emoji] = 1;
  }

  return {
    ...target,
    reactions: nextReactions,
    reactionUsers: nextReactionUsers,
  };
}

/**
 * Checks if a specific userKey has reacted to the message or reply with given emoji.
 */
export function hasUserReacted(
  target:
    { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> } | undefined | null,
  emoji: string,
  userKey: string
): boolean {
  if (!target) return false;
  const count = target.reactions?.[emoji] || 0;
  if (count <= 0) return false;
  const users = target.reactionUsers?.[emoji];
  if (!Array.isArray(users)) {
    return false;
  }
  return users.map(String).includes(userKey);
}

/**
 * Kiểm tra xem người dùng hiện tại đã thả cảm xúc (emoji/sticker) vào tin nhắn này hay chưa.
 */
export function hasUserReactedToMessage(
  m: { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> } | undefined | null,
  emoji: string,
  currentUser: { id?: number | string; username?: string } | undefined | null
): boolean {
  if (!m) return false;
  const count = m.reactions?.[emoji] || 0;
  if (count <= 0) return false;
  const users = m.reactionUsers?.[emoji];
  if (!Array.isArray(users)) {
    // Legacy reaction trước khi có per-user tracking — mặc định coi như đã thả
    return true;
  }
  const userKey = String(currentUser?.id ?? currentUser?.username ?? '');
  if (!userKey) return false;
  return users.map(String).includes(userKey);
}

/**
 * Sao chép nội dung tin nhắn hoặc link đính kèm vào clipboard (MOS-FEAT-205).
 * Hỗ trợ fallback document.execCommand nếu navigator.clipboard không khả dụng.
 */
export async function copyMessageToClipboard(
  text?: string | null,
  attachments?: Array<{ url?: string; name?: string }> | null,
  options?: { customSuccessMsg?: string }
): Promise<boolean> {
  const content = (text || '').trim();
  let textToCopy = content;

  if (!textToCopy && attachments && attachments.length > 0) {
    const urls = attachments.map((a) => a.url).filter(Boolean);
    if (urls.length > 0) {
      textToCopy = urls.join('\n');
    }
  }

  if (!textToCopy) {
    antdMessage.warning('Tin nhắn không có nội dung để sao chép');
    return false;
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(textToCopy);
    } else if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    antdMessage.success(options?.customSuccessMsg || 'Đã sao chép nội dung tin nhắn');
    return true;
  } catch {
    antdMessage.error('Không thể sao chép vào bộ nhớ tạm');
    return false;
  }
}

/**
 * Định dạng nội dung tooltip hiển thị danh sách người đã thả cảm xúc cho desktop (MOS-BUG-217).
 */
export function formatReactionUsersTooltip(
  target:
    { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> } | undefined | null,
  emoji: string,
  staffDirectory: MosChatStaffMember[] = [],
  currentUser?: { id?: number | string; username?: string; name?: string; displayName?: string } | null
): string {
  if (!target) return '';
  const stickerReaction = parseStickerReactionKey(emoji);
  const label = stickerReaction ? stickerReaction.caption || stickerReaction.title : emoji;
  const count = target.reactions?.[emoji] || 0;
  if (count <= 0) return '';

  const myId = String(currentUser?.id ?? '');
  const myUsername = String(currentUser?.username ?? '').toLowerCase();
  const userKeys = target.reactionUsers?.[emoji];
  const isMe = (uStr: string) =>
    (myId && uStr === myId) ||
    (myUsername && uStr.toLowerCase() === myUsername) ||
    uStr === 'me' ||
    (myId === '' && uStr === '1');

  const reactedByMe = Array.isArray(userKeys) ? userKeys.some((u) => isMe(String(u))) : false;

  let names: string[] = [];
  if (Array.isArray(userKeys) && userKeys.length > 0) {
    names = userKeys.map((u) => {
      const uStr = String(u);
      if (isMe(uStr)) return 'Bạn';
      const staff = staffDirectory.find(
        (s) => String(s.id) === uStr || String(s.username || '').toLowerCase() === uStr.toLowerCase()
      );
      return staff?.displayName || (staff as SafeAny)?.name || `Thành viên #${uStr}`;
    });
  }

  const actionHint = reactedByMe ? 'Nhấn để gỡ' : 'Nhấn để thả cùng';

  if (names.length === 0) {
    return reactedByMe
      ? `Bạn đã thả ${label} · ${actionHint} (Undo)`
      : `${count} người đã thả ${label} · ${actionHint}`;
  }

  const prefix =
    names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} và ${names.length - 3} người khác`;

  return `${prefix} đã thả ${label} · ${actionHint}`;
}

/**
 * Kiểm tra xem biên nhận đọc (read receipt) có khớp với tác giả của tin nhắn/phản hồi hay không.
 */
export function doesReceiptMatchAuthor(
  receiptStaffId: number,
  receiptName: string,
  senderId?: string | number,
  senderName?: string
): boolean {
  if (senderId !== undefined && senderId !== null && String(senderId) === String(receiptStaffId)) return true;
  if (receiptName && senderName && receiptName.trim().toLowerCase() === senderName.trim().toLowerCase()) {
    return true;
  }
  return false;
}

/**
 * Định dạng nhãn thời gian đã xem (Read At).
 */
export function formatReadAtLabel(iso?: string | null): string {
  if (!iso) return 'Đã xem';
  const d = dayjs(iso);
  if (!d.isValid()) return 'Đã xem';
  if (d.isSame(dayjs(), 'day')) {
    return `Lúc ${d.format('HH:mm')}`;
  }
  return `${d.format('HH:mm')} · ${d.format('DD/MM')}`;
}

/**
 * Phân tích danh sách người đã xem (seenBy) và chưa xem (unseenBy) cho một tin nhắn chính.
 */
export function getMessageReadBreakdown(
  conv: MosChatConversation | null | undefined,
  msg: MosChatMessage,
  currentUserId?: string | number
): { seenBy: MosChatReadReceiptEntry[]; unseenBy: MosChatReadReceiptEntry[] } {
  if (!conv || !conv.readReceipts || conv.readReceipts.length === 0 || conv.isSelf) {
    return { seenBy: [], unseenBy: [] };
  }
  const rawMessages = conv.messages || [];
  const hiddenOlderCount = Math.max(0, (conv.totalMessageCount ?? rawMessages.length) - rawMessages.length);
  const visibleMessages = rawMessages.filter((m) => !m.deletedAt && !m.isDeleted);
  const msgIdx = visibleMessages.findIndex((m) => m.id === msg.id);
  if (msgIdx < 0) {
    return { seenBy: [], unseenBy: [] };
  }
  const absoluteOrder = hiddenOlderCount + msgIdx + 1;
  const myStaffId = Number(currentUserId || 0);
  const rawReceipts = conv.readReceipts.filter(
    (r) => r.staffId !== myStaffId && !doesReceiptMatchAuthor(r.staffId, r.displayName, msg.senderId, msg.senderName)
  );
  // Dedup by staffId — keep the entry with the highest readCount
  const receiptMap = new Map<number, MosChatReadReceiptEntry>();
  for (const r of rawReceipts) {
    const existing = receiptMap.get(r.staffId);
    if (!existing || r.readCount > existing.readCount) {
      receiptMap.set(r.staffId, r);
    }
  }
  const otherReceipts = Array.from(receiptMap.values());
  const seenBy = otherReceipts.filter((r) => r.readCount >= absoluteOrder);
  const unseenBy = otherReceipts.filter((r) => r.readCount < absoluteOrder);
  return { seenBy, unseenBy };
}

/**
 * Phân tích danh sách người đã xem (seenBy) và chưa xem (unseenBy) cho một phản hồi trong thread.
 */
export function getThreadReplyReadBreakdown(
  conv: MosChatConversation | null | undefined,
  parentMsg: MosChatMessage,
  reply: MosChatThreadReply,
  currentUserId?: string | number
): { seenBy: MosChatThreadReadReceiptEntry[]; unseenBy: MosChatThreadReadReceiptEntry[] } {
  const receipts = parentMsg.threadReadReceipts || [];
  if (receipts.length === 0 || conv?.isSelf) {
    return { seenBy: [], unseenBy: [] };
  }
  const visibleReplies = (parentMsg.thread || []).filter((r) => !r.deletedAt && !r.isDeleted);
  const replyIdx = visibleReplies.findIndex((r) => r.id === reply.id);
  if (replyIdx < 0) {
    return { seenBy: [], unseenBy: [] };
  }
  const myStaffId = Number(currentUserId || 0);
  const rawThreadReceipts = receipts.filter(
    (r) =>
      r.staffId !== myStaffId && !doesReceiptMatchAuthor(r.staffId, r.displayName, reply.senderId, reply.senderName)
  );
  const threadReceiptMap = new Map<number, MosChatThreadReadReceiptEntry>();
  for (const r of rawThreadReceipts) {
    const existing = threadReceiptMap.get(r.staffId);
    if (!existing || r.readReplyCount > existing.readReplyCount) {
      threadReceiptMap.set(r.staffId, r);
    }
  }
  const otherReceipts = Array.from(threadReceiptMap.values());
  const seenBy = otherReceipts.filter((r) => r.readReplyCount >= replyIdx + 1);
  const unseenBy = otherReceipts.filter((r) => r.readReplyCount < replyIdx + 1);
  return { seenBy, unseenBy };
}

/**
 * Gom nhóm người đọc dừng lại ở mỗi tin nhắn (stopped readers).
 */
export function calculateStoppedReadersByMsgId(
  conv: MosChatConversation | null | undefined,
  currentUserId?: string | number
): Record<string, MosChatReadReceiptEntry[]> {
  const out: Record<string, MosChatReadReceiptEntry[]> = {};
  if (!conv || !conv.readReceipts || conv.readReceipts.length === 0 || conv.isSelf) {
    return out;
  }
  const rawMessages = conv.messages || [];
  const hiddenOlderCount = Math.max(0, (conv.totalMessageCount ?? rawMessages.length) - rawMessages.length);
  const visibleMessages = rawMessages.filter((m) => !m.deletedAt && !m.isDeleted);
  if (visibleMessages.length === 0) return out;
  const myStaffId = Number(currentUserId || 0);
  for (const r of conv.readReceipts) {
    if (r.staffId === myStaffId || r.readCount <= 0) continue;
    const localMaxIdx = Math.min(r.readCount - hiddenOlderCount, visibleMessages.length) - 1;
    if (localMaxIdx < 0) continue;
    for (let i = localMaxIdx; i >= 0; i--) {
      const candidate = visibleMessages[i];
      if (!candidate) continue;
      if (!doesReceiptMatchAuthor(r.staffId, r.displayName, candidate.senderId, candidate.senderName)) {
        if (!out[candidate.id]) out[candidate.id] = [];
        out[candidate.id].push(r);
        break;
      }
    }
  }
  return out;
}

/**
 * Gom nhóm người đọc dừng lại ở mỗi reply trong thread (stopped readers for replies).
 */
export function calculateStoppedReadersByReplyId(
  parentMsg: MosChatMessage | null | undefined,
  currentUserId?: string | number,
  isSelf?: boolean
): Record<string, MosChatThreadReadReceiptEntry[]> {
  const out: Record<string, MosChatThreadReadReceiptEntry[]> = {};
  if (!parentMsg || !parentMsg.threadReadReceipts || parentMsg.threadReadReceipts.length === 0 || isSelf) {
    return out;
  }
  const visibleReplies = (parentMsg.thread || []).filter((r) => !r.deletedAt && !r.isDeleted);
  if (visibleReplies.length === 0) return out;
  const myStaffId = Number(currentUserId || 0);
  for (const r of parentMsg.threadReadReceipts) {
    if (r.staffId === myStaffId || r.readReplyCount <= 0) continue;
    const maxIdx = Math.min(r.readReplyCount, visibleReplies.length) - 1;
    for (let i = maxIdx; i >= 0; i--) {
      const candidate = visibleReplies[i];
      if (!candidate) continue;
      if (!doesReceiptMatchAuthor(r.staffId, r.displayName, candidate.senderId, candidate.senderName)) {
        if (!out[candidate.id]) out[candidate.id] = [];
        out[candidate.id].push(r);
        break;
      }
    }
  }
  return out;
}
