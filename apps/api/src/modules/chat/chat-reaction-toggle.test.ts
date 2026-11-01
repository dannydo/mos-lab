import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';

describe('chat message reaction toggle & cancel invariants (MOS-BUG-186)', () => {
  function applyReactionToggle(
    targetMsg: MosChatMessage | MosChatThreadReply,
    emoji: string,
    userKey: string
  ) {
    targetMsg.reactions = targetMsg.reactions || {};
    targetMsg.reactionUsers = targetMsg.reactionUsers || {};

    const existingUsers = targetMsg.reactionUsers[emoji];
    const currentCount = targetMsg.reactions[emoji] || 0;

    if (Array.isArray(existingUsers)) {
      const normalized = existingUsers.map(String);
      if (normalized.includes(userKey)) {
        const remaining = normalized.filter((u) => u !== userKey);
        if (remaining.length === 0) {
          delete targetMsg.reactions[emoji];
          delete targetMsg.reactionUsers[emoji];
        } else {
          targetMsg.reactionUsers[emoji] = remaining;
          targetMsg.reactions[emoji] = remaining.length;
        }
      } else {
        const updated = [...normalized, userKey];
        targetMsg.reactionUsers[emoji] = updated;
        targetMsg.reactions[emoji] = updated.length;
      }
    } else if (currentCount > 0) {
      // Legacy reaction without per-user tracking: clicking undoes/clears it
      delete targetMsg.reactions[emoji];
      delete targetMsg.reactionUsers[emoji];
    } else {
      targetMsg.reactionUsers[emoji] = [userKey];
      targetMsg.reactions[emoji] = 1;
    }
  }

  it('adds reaction and records userKey in reactionUsers', () => {
    const msg: MosChatMessage = {
      id: 'm1',
      conversationId: 'c1',
      senderId: '1',
      senderName: 'Danny',
      senderRole: 'Admin',
      text: 'Test message',
      timeLabel: '10:00',
      createdAt: new Date().toISOString(),
    };

    applyReactionToggle(msg, '❤️', '1');
    assert.equal(msg.reactions?.['❤️'], 1);
    assert.deepEqual(msg.reactionUsers?.['❤️'], ['1']);

    // Second user reacts
    applyReactionToggle(msg, '❤️', '2');
    assert.equal(msg.reactions?.['❤️'], 2);
    assert.deepEqual(msg.reactionUsers?.['❤️'], ['1', '2']);
  });

  it('cancels reaction (huỷ react) when user reacts with the same emoji', () => {
    const msg: MosChatMessage = {
      id: 'm1',
      conversationId: 'c1',
      senderId: '1',
      senderName: 'Danny',
      senderRole: 'Admin',
      text: 'Test message',
      timeLabel: '10:00',
      createdAt: new Date().toISOString(),
      reactions: { '❤️': 2 },
      reactionUsers: { '❤️': ['1', '2'] },
    };

    // User 1 cancels reaction
    applyReactionToggle(msg, '❤️', '1');
    assert.equal(msg.reactions?.['❤️'], 1);
    assert.deepEqual(msg.reactionUsers?.['❤️'], ['2']);

    // User 2 cancels reaction -> emoji deleted completely
    applyReactionToggle(msg, '❤️', '2');
    assert.equal(msg.reactions?.['❤️'], undefined);
    assert.equal(msg.reactionUsers?.['❤️'], undefined);
  });

  it('correctly toggles reactions on thread reply', () => {
    const reply: MosChatThreadReply = {
      id: 'r1',
      senderId: '2',
      senderName: 'Mai CV',
      senderRole: 'CV',
      text: 'Reply message',
      timeLabel: '10:01',
      createdAt: new Date().toISOString(),
    };

    applyReactionToggle(reply, '🔥', '1');
    assert.equal(reply.reactions?.['🔥'], 1);
    assert.deepEqual(reply.reactionUsers?.['🔥'], ['1']);

    applyReactionToggle(reply, '🔥', '1');
    assert.equal(reply.reactions?.['🔥'], undefined);
  });
});
