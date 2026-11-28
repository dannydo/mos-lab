import type { MosChatEmojiUsageEntry } from '../types/mos-chat/core-entities.types.js';

export const MOS_CHAT_EMOJI_FRECENCY_HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;
export const MOS_CHAT_MAX_STORED_EMOJI_USAGE = 50;
export const MOS_CHAT_MAX_FREQUENT_EMOJIS = 18;

const STICKER_TOKEN_PATTERN = /\[sticker:[^\]]+\]/gi;
const EXTENDED_PICTOGRAPHIC_REGEX = /\p{Extended_Pictographic}/u;
const REGIONAL_INDICATOR_PAIR_REGEX = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;
const KEYCAP_EMOJI_REGEX = /^[#*0-9]\uFE0F?\u20E3$/u;
const FALLBACK_EMOJI_SEGMENT_REGEX =
  /(?:[\u{1F1E6}-\u{1F1FF}]{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;

let cachedGraphemeSegmenter: Intl.Segmenter | null | undefined;

function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (cachedGraphemeSegmenter !== undefined) return cachedGraphemeSegmenter;
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      cachedGraphemeSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    } else {
      cachedGraphemeSegmenter = null;
    }
  } catch {
    cachedGraphemeSegmenter = null;
  }
  return cachedGraphemeSegmenter;
}

/**
 * Checks whether a string is a single trackable Unicode emoji grapheme
 * (rejecting sticker tokens, plain ASCII letters/digits, and oversized strings).
 */
export function isTrackableChatEmoji(raw: string): boolean {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 24) return false;
  if (trimmed.startsWith('[sticker:')) return false;
  if (/[a-zA-Z]/.test(trimmed)) return false;

  if (KEYCAP_EMOJI_REGEX.test(trimmed)) return true;
  if (REGIONAL_INDICATOR_PAIR_REGEX.test(trimmed)) return true;
  if (!EXTENDED_PICTOGRAPHIC_REGEX.test(trimmed)) return false;

  const segmenter = getGraphemeSegmenter();
  if (segmenter) {
    let count = 0;
    for (const _seg of segmenter.segment(trimmed)) {
      count += 1;
      if (count > 1) return false;
    }
    return count === 1;
  }
  return true;
}

/**
 * Extracts unique Unicode emojis from message text using grapheme segmentation,
 * ignoring `[sticker:...]` tokens and counting each unique emoji at most once per message.
 */
export function extractUniqueEmojisFromText(text: string): string[] {
  if (typeof text !== 'string' || !text) return [];
  const cleaned = text.replace(STICKER_TOKEN_PATTERN, ' ');
  if (!cleaned.trim()) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  const segmenter = getGraphemeSegmenter();
  if (segmenter) {
    for (const { segment } of segmenter.segment(cleaned)) {
      const candidate = segment.trim();
      if (candidate && !seen.has(candidate) && isTrackableChatEmoji(candidate)) {
        seen.add(candidate);
        result.push(candidate);
      }
    }
    return result;
  }

  const matches = cleaned.match(FALLBACK_EMOJI_SEGMENT_REGEX) || [];
  for (const m of matches) {
    const candidate = m.trim();
    if (candidate && !seen.has(candidate) && isTrackableChatEmoji(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  }
  return result;
}

/**
 * Computes the exponentially decayed frecency score of an emoji usage entry at `nowMs`.
 */
export function computeDecayedEmojiScore(entry: MosChatEmojiUsageEntry, nowMs: number = Date.now()): number {
  if (!entry || typeof entry.score !== 'number' || !Number.isFinite(entry.score) || entry.score <= 0) {
    return 0;
  }
  const lastMs = Date.parse(entry.lastUsedAt);
  if (!Number.isFinite(lastMs)) {
    return entry.score;
  }
  const elapsed = Math.max(0, nowMs - lastMs);
  return entry.score * Math.pow(0.5, elapsed / MOS_CHAT_EMOJI_FRECENCY_HALF_LIFE_MS);
}

/**
 * Sanitizes and caps a persisted emojiUsage map to top `MOS_CHAT_MAX_STORED_EMOJI_USAGE` entries.
 */
export function normalizeEmojiUsageMap(
  raw: unknown,
  nowMs: number = Date.now()
): Record<string, MosChatEmojiUsageEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const candidates: Array<{ emoji: string; entry: MosChatEmojiUsageEntry; decayed: number; lastMs: number }> = [];
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const emoji = key.trim();
    if (!isTrackableChatEmoji(emoji)) continue;
    if (!val || typeof val !== 'object') continue;
    const rawEntry = val as Partial<MosChatEmojiUsageEntry>;
    const score = Number(rawEntry.score);
    if (!Number.isFinite(score) || score <= 0) continue;
    const parsedMs = typeof rawEntry.lastUsedAt === 'string' ? Date.parse(rawEntry.lastUsedAt) : NaN;
    const lastMs = Number.isFinite(parsedMs) ? parsedMs : nowMs;
    const entry: MosChatEmojiUsageEntry = {
      score,
      lastUsedAt: new Date(lastMs).toISOString(),
    };
    candidates.push({
      emoji,
      entry,
      decayed: computeDecayedEmojiScore(entry, nowMs),
      lastMs,
    });
  }

  candidates.sort((a, b) => {
    if (b.decayed !== a.decayed) return b.decayed - a.decayed;
    if (b.lastMs !== a.lastMs) return b.lastMs - a.lastMs;
    return a.emoji.localeCompare(b.emoji);
  });

  const out: Record<string, MosChatEmojiUsageEntry> = {};
  for (const item of candidates.slice(0, MOS_CHAT_MAX_STORED_EMOJI_USAGE)) {
    out[item.emoji] = item.entry;
  }
  return out;
}

/**
 * Records usage of one or more emojis at `nowMs`, applying exponential decay
 * and keeping the top `MOS_CHAT_MAX_STORED_EMOJI_USAGE` entries.
 */
export function recordEmojiUsageInMap(
  current: Record<string, MosChatEmojiUsageEntry> | undefined,
  emojis: readonly string[],
  nowMs: number = Date.now()
): Record<string, MosChatEmojiUsageEntry> {
  const next = normalizeEmojiUsageMap(current, nowMs);
  const uniqueValid: string[] = [];
  const seen = new Set<string>();
  for (const raw of emojis) {
    if (typeof raw !== 'string') continue;
    const em = raw.trim();
    if (!seen.has(em) && isTrackableChatEmoji(em)) {
      seen.add(em);
      uniqueValid.push(em);
    }
  }
  if (uniqueValid.length === 0) return next;

  const eventTs = Number.isFinite(nowMs) ? nowMs : Date.now();
  for (const em of uniqueValid) {
    const prev = next[em];
    if (!prev) {
      next[em] = {
        score: 1,
        lastUsedAt: new Date(eventTs).toISOString(),
      };
      continue;
    }

    const prevMs = Date.parse(prev.lastUsedAt);
    if (!Number.isFinite(prevMs) || eventTs >= prevMs) {
      const decayedPrev = computeDecayedEmojiScore(prev, eventTs);
      next[em] = {
        score: decayedPrev + 1,
        lastUsedAt: new Date(eventTs).toISOString(),
      };
    } else {
      // Historical event older than current lastUsedAt: add its decayed contribution at prevMs
      const ageAtPrev = prevMs - eventTs;
      const eventWeight = Math.pow(0.5, ageAtPrev / MOS_CHAT_EMOJI_FRECENCY_HALF_LIFE_MS);
      next[em] = {
        score: prev.score + eventWeight,
        lastUsedAt: prev.lastUsedAt,
      };
    }
  }

  return normalizeEmojiUsageMap(next, eventTs);
}

/**
 * Returns emojis ranked from highest frecency score to lowest.
 */
export function rankFrequentEmojis(
  usage: Record<string, MosChatEmojiUsageEntry> | undefined,
  limit: number = MOS_CHAT_MAX_FREQUENT_EMOJIS,
  nowMs: number = Date.now()
): string[] {
  if (!usage || limit <= 0) return [];
  const entries: Array<{ emoji: string; decayed: number; lastMs: number }> = [];
  for (const [key, entry] of Object.entries(usage)) {
    const emoji = key.trim();
    if (!isTrackableChatEmoji(emoji)) continue;
    const decayed = computeDecayedEmojiScore(entry, nowMs);
    if (decayed <= 0) continue;
    const lastMs = Date.parse(entry.lastUsedAt);
    entries.push({
      emoji,
      decayed,
      lastMs: Number.isFinite(lastMs) ? lastMs : 0,
    });
  }

  entries.sort((a, b) => {
    if (b.decayed !== a.decayed) return b.decayed - a.decayed;
    if (b.lastMs !== a.lastMs) return b.lastMs - a.lastMs;
    return a.emoji.localeCompare(b.emoji);
  });

  return entries.slice(0, limit).map((e) => e.emoji);
}

/**
 * Builds the quick reaction bar emojis: top frecency emojis filled with unique defaults up to `count`.
 */
export function buildQuickReactionEmojis(
  usage: Record<string, MosChatEmojiUsageEntry> | undefined,
  fallbackDefaults: readonly string[],
  count: number,
  nowMs: number = Date.now()
): string[] {
  if (count <= 0) return [];
  const ranked = rankFrequentEmojis(usage, count, nowMs);
  const out: string[] = [...ranked];
  const seen = new Set(out);

  for (const def of fallbackDefaults) {
    if (out.length >= count) break;
    if (!seen.has(def)) {
      seen.add(def);
      out.push(def);
    }
  }
  return out.slice(0, count);
}
