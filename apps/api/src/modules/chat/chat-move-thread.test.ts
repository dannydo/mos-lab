import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { moveChatThreadItemInMemory } from './routes.js';
import type { MosChatConversation, MosChatMessage, MosChatTaskItem } from '@mos-lab/shared';

describe('mOS Chat Thread Move & Separation (MOS-BUG-188)', () => {
  it('promotes a thread reply to a standalone root message (PROMOTE_REPLY_TO_ROOT)', () => {
    const rootMsg: MosChatMessage = {
      id: 'msg-root-1',
      conversationId: 'space-core-team',
      senderId: 'staff-6',
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Admin',
      text: 'Tin nhắn thảo luận doanh thu',
      timeLabel: '09:00',
      createdAt: '2026-11-02T02:00:00.000Z',
      thread: [
        {
          id: 'th-reply-1',
          senderId: 'staff-6',
          senderName: 'Nguyễn Quang Khải',
          senderRole: 'Admin',
          text: '$REV 🟠: 550*540 = 297,000,000 đ',
          timeLabel: '09:05',
          createdAt: '2026-11-02T02:05:00.000Z',
          reactions: { '👍': 2 },
          attachments: [
            {
              id: 'att-1',
              url: 'https://cdn.example.com/chart.png',
              name: 'chart.png',
              mimeType: 'image/png',
              sizeBytes: 1024,
              width: 800,
              height: 600,
            },
          ],
        },
        {
          id: 'th-reply-2',
          senderId: 'staff-1',
          senderName: 'Danny Do',
          senderRole: 'Super Admin',
          text: 'Đồng ý với số liệu này',
          timeLabel: '09:10',
          createdAt: '2026-11-02T02:10:00.000Z',
        },
      ],
    };

    const conv: MosChatConversation = {
      id: 'space-core-team',
      name: 'Core Team',
      type: 'space',
      color: '#10b981',
      unreadCount: 0,
      messages: [rootMsg],
      updatedAt: '2026-11-02T02:00:00.000Z',
    };

    const tasks: MosChatTaskItem[] = [];

    const result = moveChatThreadItemInMemory(conv, tasks, {
      mode: 'PROMOTE_REPLY_TO_ROOT',
      sourceMessageId: 'msg-root-1',
      replyId: 'th-reply-1',
    });

    // 1. Reply th-reply-1 must be removed from rootMsg.thread
    assert.strictEqual(rootMsg.thread?.length, 1);
    assert.strictEqual(rootMsg.thread?.[0]?.id, 'th-reply-2');

    // 2. A new standalone root message must be created
    assert.ok(result.promotedMessage);
    assert.strictEqual(result.promotedMessage.id, 'msg-pr-reply-1');
    assert.strictEqual(result.promotedMessage.text, '$REV 🟠: 550*540 = 297,000,000 đ');
    assert.strictEqual(result.promotedMessage.senderName, 'Nguyễn Quang Khải');
    assert.strictEqual(result.promotedMessage.senderId, 'staff-6');
    assert.deepStrictEqual(result.promotedMessage.reactions, { '👍': 2 });
    assert.strictEqual(result.promotedMessage.attachments?.length, 1);

    // 3. Conversation messages must now contain 2 root messages
    assert.strictEqual(conv.messages.length, 2);
    assert.strictEqual(conv.messages[0]?.id, 'msg-root-1');
    assert.strictEqual(conv.messages[1]?.id, 'msg-pr-reply-1');

    // 4. deletedMessageIds must contain the original replyId so relational sync cleans it up
    assert.deepStrictEqual(result.deletedMessageIds, ['th-reply-1']);
  });

  it('throws error when replyId is missing or not found', () => {
    const rootMsg: MosChatMessage = {
      id: 'msg-root-2',
      conversationId: 'space-core-team',
      senderId: 'staff-6',
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Admin',
      text: 'Root message',
      timeLabel: '09:00',
      createdAt: '2026-11-02T02:00:00.000Z',
      thread: [],
    };
    const conv: MosChatConversation = {
      id: 'space-core-team',
      name: 'Core Team',
      type: 'space',
      color: '#10b981',
      unreadCount: 0,
      messages: [rootMsg],
      updatedAt: '2026-11-02T02:00:00.000Z',
    };
    const tasks: MosChatTaskItem[] = [];

    assert.throws(
      () => {
        moveChatThreadItemInMemory(conv, tasks, {
          mode: 'PROMOTE_REPLY_TO_ROOT',
          sourceMessageId: 'msg-root-2',
        });
      },
      { message: 'Thiếu mã phản hồi (replyId) cần tách ra luồng chính.' }
    );

    assert.throws(
      () => {
        moveChatThreadItemInMemory(conv, tasks, {
          mode: 'PROMOTE_REPLY_TO_ROOT',
          sourceMessageId: 'msg-root-2',
          replyId: 'non-existent-reply',
        });
      },
      { message: 'Không tìm thấy câu trả lời cần tách trong luồng.' }
    );
  });
});
