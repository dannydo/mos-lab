import {
  extractUniqueEmojisFromText,
  isTrackableChatEmoji,
  normalizeEmojiUsageMap,
  recordEmojiUsageInMap,
  type MosChatConversation,
  type MosChatEmojiUsageEntry,
  type MosChatStaffMember,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { canUserAccessConversation, resolveUserStaffId } from './chat-access.service.js';

interface HistoricalEmojiEvent {
  ts: number;
  emojis: string[];
}

function collectItemEvents(
  item: {
    senderId?: number | string | null;
    text?: string | null;
    createdAt?: string | null;
    isDeleted?: boolean;
    reactionUsers?: Record<string, Array<number | string>>;
  },
  matchesUserKey: (candidate: unknown) => boolean,
  fallbackNowMs: number,
  out: HistoricalEmojiEvent[]
): void {
  if (!item || item.isDeleted) return;
  const parsedTs = item.createdAt ? Date.parse(item.createdAt) : NaN;
  const ts = Number.isFinite(parsedTs) ? parsedTs : fallbackNowMs;

  if (matchesUserKey(item.senderId) && typeof item.text === 'string' && item.text.trim()) {
    const textEmojis = extractUniqueEmojisFromText(item.text);
    if (textEmojis.length > 0) {
      out.push({ ts, emojis: textEmojis });
    }
  }

  if (item.reactionUsers && typeof item.reactionUsers === 'object') {
    const reactedEmojis: string[] = [];
    for (const [emoji, users] of Object.entries(item.reactionUsers)) {
      if (!isTrackableChatEmoji(emoji) || !Array.isArray(users)) continue;
      if (users.some(matchesUserKey)) {
        reactedEmojis.push(emoji.trim());
      }
    }
    if (reactedEmojis.length > 0) {
      out.push({ ts, emojis: reactedEmojis });
    }
  }
}

/**
 * One-time historical bootstrap: scans accessible conversations for the user's own
 * recent messages, thread replies, and reactions to seed their initial smart emoji frecency map.
 */
export function bootstrapEmojiUsageFromConversations(
  conversations: readonly MosChatConversation[],
  user: JwtUserPayload | undefined,
  staffDirectory: readonly MosChatStaffMember[],
  nowMs: number = Date.now()
): Record<string, MosChatEmojiUsageEntry> {
  if (!user) return {};

  const userKeys = new Set<string>();
  if (user.id !== undefined && user.id !== null && String(user.id).trim()) {
    userKeys.add(String(user.id).trim());
  }
  const staffId = resolveUserStaffId(user, staffDirectory as MosChatStaffMember[]);
  if (staffId > 0) {
    userKeys.add(String(staffId));
  }
  if (userKeys.size === 0) return {};

  const matchesUserKey = (candidate: unknown): boolean => {
    if (candidate === undefined || candidate === null) return false;
    const s = String(candidate).trim();
    return Boolean(s && userKeys.has(s));
  };

  const events: HistoricalEmojiEvent[] = [];
  for (const conv of conversations) {
    if (!canUserAccessConversation(conv, user, staffDirectory as MosChatStaffMember[])) continue;
    for (const msg of conv.messages || []) {
      collectItemEvents(msg, matchesUserKey, nowMs, events);
      for (const reply of msg.thread || []) {
        collectItemEvents(reply, matchesUserKey, nowMs, events);
      }
    }
  }

  if (events.length === 0) return {};

  events.sort((a, b) => a.ts - b.ts);
  let usage: Record<string, MosChatEmojiUsageEntry> = {};
  for (const ev of events) {
    usage = recordEmojiUsageInMap(usage, ev.emojis, ev.ts);
  }
  return normalizeEmojiUsageMap(usage, nowMs);
}
