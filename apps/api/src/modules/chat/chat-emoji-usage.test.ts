import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOS_CHAT_EMOJI_FRECENCY_HALF_LIFE_MS,
  MOS_CHAT_MAX_STORED_EMOJI_USAGE,
  buildQuickReactionEmojis,
  extractUniqueEmojisFromText,
  normalizeEmojiUsageMap,
  rankFrequentEmojis,
  recordEmojiUsageInMap,
  type MosChatConversation,
  type MosChatStaffMember,
} from '@mos-lab/shared';
import { bootstrapEmojiUsageFromConversations } from './chat-emoji-usage.js';

describe('Chat Smart Emoji Frecency & Auto-Seed', () => {
  it('ranks emojis by combined frequency and exponential time decay', () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const t0 = Date.UTC(2026, 10, 1, 8, 0, 0);
    let usage = recordEmojiUsageInMap({}, ['👍'], t0);
    usage = recordEmojiUsageInMap(usage, ['👍'], t0 + 1000);
    usage = recordEmojiUsageInMap(usage, ['👍'], t0 + 2000);
    // 15 days later (> 14-day half-life), ❤️ is used twice
    const tLater = t0 + 15 * dayMs;
    usage = recordEmojiUsageInMap(usage, ['❤️'], tLater);
    usage = recordEmojiUsageInMap(usage, ['❤️'], tLater + 1000);

    const ranked = rankFrequentEmojis(usage, 18, tLater + 2000);
    assert.deepEqual(ranked, ['❤️', '👍']);

    // Verify half-life math: score after exact half-life halves
    const single = recordEmojiUsageInMap({}, ['🔥'], t0);
    const afterOneHalfLife = recordEmojiUsageInMap(single, ['🔥'], t0 + MOS_CHAT_EMOJI_FRECENCY_HALF_LIFE_MS);
    assert.ok(Math.abs(afterOneHalfLife['🔥']!.score - 1.5) < 1e-6);
  });

  it('caps stored emojiUsage map at MOS_CHAT_MAX_STORED_EMOJI_USAGE (50)', () => {
    const baseCodePoint = 0x1f600;
    let usage = {};
    const now = Date.UTC(2026, 10, 20, 10, 0, 0);
    for (let i = 0; i < 60; i++) {
      const em = String.fromCodePoint(baseCodePoint + i);
      usage = recordEmojiUsageInMap(usage, [em], now + i * 1000);
    }
    const normalized = normalizeEmojiUsageMap(usage, now + 60_000);
    assert.equal(Object.keys(normalized).length, MOS_CHAT_MAX_STORED_EMOJI_USAGE);
  });

  it('extracts unique Unicode grapheme emojis cleanly, preserving ZWJ sequences and skipping stickers', () => {
    const extracted = extractUniqueEmojisFromText('Chốt đơn 😂😂😂 [sticker:wings-chot-don] ❤️‍🔥 💆‍♀️ 100% ok 👍');
    assert.deepEqual(extracted, ['😂', '❤️‍🔥', '💆‍♀️', '👍']);
  });

  it('fills quick reaction bar from ranked emojis plus unique defaults', () => {
    const now = Date.UTC(2026, 10, 20, 10, 0, 0);
    let usage = recordEmojiUsageInMap({}, ['🔥'], now);
    usage = recordEmojiUsageInMap(usage, ['❤️'], now + 1000);
    // Top 3 should be ❤️, 🔥 (or 🔥, ❤️ depending on recency) + 🪽 from defaults
    const quick3 = buildQuickReactionEmojis(usage, ['🪽', '💎', '❤️', '👍', '✅'], 3, now + 2000);
    assert.equal(quick3.length, 3);
    assert.equal(quick3[0], '❤️');
    assert.equal(quick3[1], '🔥');
    assert.equal(quick3[2], '🪽');

    const quick5 = buildQuickReactionEmojis(usage, ['🪽', '💎', '❤️', '👍', '✅'], 5, now + 2000);
    assert.deepEqual(quick5, ['❤️', '🔥', '🪽', '💎', '👍']);
  });

  it('bootstraps emoji usage from accessible conversations, ignoring other users, deleted items, and stickers', () => {
    const staffDirectory: MosChatStaffMember[] = [
      { id: 1, username: 'danny', displayName: 'Danny Do', role: 'super_admin' },
      { id: 2, username: 'mai', displayName: 'Mai', role: 'cvl' },
      { id: 3, username: 'lan', displayName: 'Lan', role: 'cvl' },
    ];
    const user = { id: 1, username: 'danny', role: 'super_admin' } as any;
    const now = Date.UTC(2026, 10, 25, 9, 0, 0);

    const conversations: MosChatConversation[] = [
      {
        id: 'space-1',
        type: 'space',
        name: 'General',
        color: '#10b981',
        updatedAt: new Date(now).toISOString(),
        memberIds: [1, 2],
        unreadCount: 0,
        messages: [
          {
            id: 'm1',
            conversationId: 'space-1',
            senderId: 1,
            senderName: 'Danny Do',
            senderRole: 'super_admin',
            text: 'Quá đỉnh 🔥🔥🔥 [sticker:wings-ok]',
            timeLabel: '09:00',
            createdAt: new Date(now - 3600_000).toISOString(),
            reactions: { '🎉': 2, '[sticker:wings-ok]': 1 },
            reactionUsers: { '🎉': ['1', '2'], '[sticker:wings-ok]': ['1'] },
            thread: [
              {
                id: 'r1',
                senderId: 1,
                senderName: 'Danny Do',
                senderRole: 'super_admin',
                text: 'Ok nhé 👍',
                timeLabel: '09:05',
                createdAt: new Date(now - 1800_000).toISOString(),
              },
              {
                id: 'r-deleted',
                senderId: 1,
                senderName: 'Danny Do',
                senderRole: 'super_admin',
                text: 'Deleted 😱',
                isDeleted: true,
                timeLabel: '09:06',
                createdAt: new Date(now - 1700_000).toISOString(),
              },
            ],
          },
          {
            id: 'm2',
            conversationId: 'space-1',
            senderId: 2,
            senderName: 'Mai',
            senderRole: 'cvl',
            text: 'Tin nhắn của người khác 😭😭😭',
            timeLabel: '09:10',
            createdAt: new Date(now - 900_000).toISOString(),
            reactions: { '❤️': 1 },
            reactionUsers: { '❤️': ['1'] },
          },
        ],
      },
      {
        id: 'dm-pair-2-3',
        type: 'dm',
        name: 'Private DM',
        color: '#1a73e8',
        updatedAt: new Date(now).toISOString(),
        memberIds: [2, 3],
        unreadCount: 0,
        messages: [
          {
            id: 'm-priv',
            conversationId: 'dm-pair-2-3',
            senderId: 1,
            senderName: 'Danny Do',
            senderRole: 'super_admin',
            text: 'Should not leak 💩',
            timeLabel: '09:15',
            createdAt: new Date(now).toISOString(),
          },
        ],
      },
    ];

    const seeded = bootstrapEmojiUsageFromConversations(conversations, user, staffDirectory, now);
    const ranked = rankFrequentEmojis(seeded, 18, now);
    assert.ok(ranked.includes('🔥'));
    assert.ok(ranked.includes('🎉'));
    assert.ok(ranked.includes('👍'));
    assert.ok(ranked.includes('❤️'));
    assert.ok(!ranked.includes('😭'));
    assert.ok(!ranked.includes('😱'));
    assert.ok(!ranked.includes('💩'));
    assert.equal(
      Object.keys(seeded).some((k) => k.startsWith('[sticker:')),
      false
    );
  });
});
