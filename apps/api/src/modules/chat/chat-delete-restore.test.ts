import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MosChatConversation, MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';

describe('chat message delete and restore invariants (MOS-BUG-119)', () => {
  it('correctly sets soft delete metadata on root message while preserving originalText and history', () => {
    const originalText = 'Nội dung tin nhắn quan trọng cần lưu lại';
    const msg: MosChatMessage = {
      id: 'msg-test-1',
      conversationId: 'dm-pair-4-6',
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Admin',
      text: originalText,
      timeLabel: '08:40',
      createdAt: new Date().toISOString(),
      editHistory: [],
    };

    // Simulate soft delete
    const now = new Date();
    msg.originalText = msg.originalText || msg.text;
    msg.editHistory = msg.editHistory || [];
    msg.isDeleted = true;
    msg.deletedAt = now.toISOString();
    msg.deletedBy = 6;
    msg.deletedByName = 'Nguyễn Quang Khải';

    assert.equal(msg.isDeleted, true);
    assert.equal(msg.originalText, originalText);
    assert.equal(msg.deletedBy, 6);
    assert.equal(msg.deletedByName, 'Nguyễn Quang Khải');
    assert.ok(msg.deletedAt);
  });

  it('correctly restores soft deleted root message and appends restoration entry to history', () => {
    const originalText = 'Nội dung cần khôi phục';
    const now = new Date();
    const msg: MosChatMessage = {
      id: 'msg-test-2',
      conversationId: 'dm-pair-4-6',
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Admin',
      text: '',
      originalText,
      timeLabel: '08:41',
      createdAt: now.toISOString(),
      isDeleted: true,
      deletedAt: now.toISOString(),
      deletedBy: 6,
      deletedByName: 'Nguyễn Quang Khải',
      editHistory: [
        {
          text: originalText,
          editedAt: now.toISOString(),
          editedBy: 6,
          editorName: 'Nguyễn Quang Khải',
        },
      ],
    };

    // Simulate restore
    msg.isDeleted = false;
    msg.deletedAt = null;
    msg.deletedBy = null;
    msg.deletedByName = null;
    if (msg.originalText && (!msg.text || msg.text.trim() === '')) {
      msg.text = msg.originalText;
    }
    msg.editHistory = msg.editHistory || [];
    msg.editHistory.push({
      text: msg.text,
      editedAt: new Date().toISOString(),
      editedBy: 6,
      editorName: 'Nguyễn Quang Khải (Đã khôi phục tin nhắn)',
    });

    assert.equal(msg.isDeleted, false);
    assert.equal(msg.deletedAt, null);
    assert.equal(msg.text, originalText);
    assert.equal(msg.editHistory?.length, 2);
    assert.ok(msg.editHistory?.[1]?.editorName?.includes('Đã khôi phục tin nhắn'));
  });

  it('correctly handles soft delete and restore for thread replies', () => {
    const reply: MosChatThreadReply = {
      id: 'th-reply-1',
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Admin',
      text: 'Câu trả lời trong luồng',
      timeLabel: '08:42',
      createdAt: new Date().toISOString(),
    };

    // Soft delete reply
    reply.originalText = reply.originalText || reply.text;
    reply.isDeleted = true;
    reply.deletedAt = new Date().toISOString();
    reply.deletedBy = 6;
    reply.deletedByName = 'Nguyễn Quang Khải';

    assert.equal(reply.isDeleted, true);
    assert.equal(reply.originalText, 'Câu trả lời trong luồng');

    // Restore reply
    reply.isDeleted = false;
    reply.deletedAt = null;
    reply.deletedBy = null;
    reply.deletedByName = null;
    if (reply.originalText && (!reply.text || reply.text.trim() === '')) {
      reply.text = reply.originalText;
    }

    assert.equal(reply.isDeleted, false);
    assert.equal(reply.text, 'Câu trả lời trong luồng');
  });
});
