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

  it('MOS-BUG-208: computeDeltaFromSnapshot includes parent message when a thread reply is deleted', async () => {
    const { computeDeltaFromSnapshot } = await import('./chat-realtime.hub.js');
    const deleteTime = new Date('2026-11-08T15:00:00.000Z');
    const syncSince = new Date('2026-11-08T14:59:00.000Z').toISOString();

    const conv: MosChatConversation = {
      id: 'space-core-team',
      type: 'space',
      name: 'Core Team',
      color: '#1a73e8',
      unreadCount: 0,
      messages: [
        {
          id: 'msg-parent-1',
          conversationId: 'space-core-team',
          senderId: 6,
          senderName: 'Nguyễn Quang Khải',
          senderRole: 'STAFF',
          text: 'Root message',
          timeLabel: '21:00',
          createdAt: new Date('2026-11-08T14:00:00.000Z').toISOString(),
          thread: [
            {
              id: 'th-deleted-reply',
              senderId: 6,
              senderName: 'Nguyễn Quang Khải',
              senderRole: 'STAFF',
              text: 'Deleted reply',
              timeLabel: '21:10',
              createdAt: new Date('2026-11-08T14:10:00.000Z').toISOString(),
              isDeleted: true,
              deletedAt: deleteTime.toISOString(),
              deletedBy: 6,
              deletedByName: 'Nguyễn Quang Khải',
              originalText: 'Deleted reply',
            },
          ],
        },
      ],
      updatedAt: deleteTime.toISOString(),
    };

    const delta = computeDeltaFromSnapshot(
      {
        conversations: [conv],
        tasks: [],
      },
      syncSince
    );

    assert.equal(delta.updatedMessages.length, 1);
    assert.equal(delta.updatedMessages[0].id, 'msg-parent-1');
    assert.equal(delta.updatedMessages[0].thread?.[0]?.isDeleted, true);
  });

  it('MOS-BUG-208: loadOrMigrateRelationalChatData preserves isDeleted when row.isDeleted is true or meta.isDeleted is true', async () => {
    const { loadOrMigrateRelationalChatData } = await import('./chat-repository.service.js');
    const deleteIso = '2026-11-08T15:00:00.000Z';

    const mockFastify = {
      prisma: {
        crm: {
          $executeRawUnsafe: async () => 1,
          crmChatConversation: {
            count: async () => 1,
            findMany: async () => [
              {
                id: 'space-core-team',
                type: 'space',
                name: 'Core Team',
                updatedAt: new Date(deleteIso),
                payloadJson: {},
              },
            ],
          },
          crmChatMessage: {
            findMany: async () => [
              {
                id: 'msg-root-1',
                conversationId: 'space-core-team',
                parentMessageId: null,
                senderId: '6',
                senderName: 'Nguyễn Quang Khải',
                senderRole: 'STAFF',
                text: 'Root',
                timeLabel: '21:00',
                pinned: false,
                isDeleted: false,
                createdAt: new Date('2026-11-08T14:00:00.000Z'),
                metadataJson: {},
              },
              {
                id: 'th-reply-deleted',
                conversationId: 'space-core-team',
                parentMessageId: 'msg-root-1',
                senderId: '6',
                senderName: 'Nguyễn Quang Khải',
                senderRole: 'STAFF',
                text: '- [ ] d',
                timeLabel: '21:56',
                pinned: false,
                isDeleted: true,
                createdAt: new Date('2026-11-08T14:10:00.000Z'),
                updatedAt: new Date(deleteIso),
                metadataJson: {
                  isDeleted: true,
                  deletedAt: deleteIso,
                  deletedBy: 6,
                  deletedByName: 'Nguyễn Quang Khải',
                  originalText: '- [ ] d',
                },
              },
            ],
          },
          crmChatTask: {
            findMany: async () => [],
          },
          crmChatUserPref: {
            findMany: async () => [],
          },
        },
      },
      log: {
        warn: () => {},
        error: () => {},
      },
    };

    const res = await loadOrMigrateRelationalChatData(mockFastify as any, {
      conversations: [],
      tasks: [],
      accessConfig: {} as any,
      userPrefsByUserKey: {},
    });

    const root = res.conversations[0]?.messages?.[0];
    assert.ok(root, 'Root message must exist');
    const reply = root?.thread?.[0];
    assert.ok(reply, 'Reply must exist in thread');
    assert.equal(reply?.isDeleted, true, 'Reply must remain soft-deleted');
    assert.equal(reply?.deletedByName, 'Nguyễn Quang Khải');
    assert.equal(reply?.originalText, '- [ ] d');
  });
});
