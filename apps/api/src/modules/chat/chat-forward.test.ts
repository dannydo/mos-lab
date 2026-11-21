import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildForwardedChatMessage, resolveForwardedSourceLabel } from './chat-forward.service.js';
import {
  deduplicateMovedMessagesInConversation,
  upsertMessageWithThreadToRelationalDb,
} from './chat-repository.service.js';
import type { MosChatConversation, MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';

describe('mOS Chat Message & Full-Subthread Forward Service', () => {
  const forwarder = {
    id: 1,
    name: 'Danny Do',
    roleLabel: 'Super Admin',
    roleColor: '#d4a84b',
    avatar: 'DD',
  };

  it('forwards a single DM message to a Space, masks 1-1 DM label, clones attachments, and resets source bindings', () => {
    const dmConv: MosChatConversation = {
      id: 'dm-pair-1-5',
      type: 'dm',
      name: 'Bảo Hân',
      color: '#10b981',
      unreadCount: 0,
      memberIds: [1, 5],
      updatedAt: '2026-11-21T10:00:00.000Z',
      messages: [],
    };

    const sourceMsg: MosChatMessage = {
      id: 'msg-dm-1',
      conversationId: dmConv.id,
      senderId: 5,
      senderName: 'Bảo Hân',
      senderRole: 'HR',
      senderAvatar: 'BH',
      text: 'Chị Vân tip 100k, hưởng 90%, app nhảy 80K',
      timeLabel: '10:00',
      createdAt: '2026-11-21T10:00:00.000Z',
      pinned: true,
      reactions: { '👍': 3, '❤️': 1 },
      reactionUsers: { '👍': [1, 5, 6] },
      taskId: 'task-999',
      missionId: 42,
      missionKey: 'MOS-BUG-42',
      workflowInstanceId: 'wf-123',
      isBuzzed: true,
      buzzCount: 2,
      customerCard: {
        customerId: 88,
        name: 'Chị Lan Anh',
        meta: 'Classic · Estella',
        cvName: 'Ngọc Vy (CV🪶)',
      },
      attachments: [
        {
          id: 'att-orig-1',
          url: '/api/chat/media/12345678-1234-1234-1234-123456789012.png',
          name: 'bill.png',
          mimeType: 'image/png',
          sizeBytes: 20480,
          width: 1080,
          height: 1920,
        },
      ],
      thread: [],
    };

    const now = new Date('2026-11-21T13:30:00.000Z');
    const result = buildForwardedChatMessage({
      sourceConv: dmConv,
      sourceMsg,
      includeThread: true,
      targetConversationId: 'space-core-team',
      forwarder,
      note: 'Nhờ @Kha kiểm tra giúp anh ca này nhé',
      now,
    });

    assert.strictEqual(result.forwardedThreadCount, 0);
    const fwd = result.message;

    // New ID prefix must not collide with msg-pr- or th-mv-
    assert.ok(fwd.id.startsWith('msg-fwd-'));
    assert.strictEqual(fwd.conversationId, 'space-core-team');
    assert.strictEqual(fwd.senderId, 1);
    assert.strictEqual(fwd.senderName, 'Danny Do');
    assert.strictEqual(fwd.text, 'Chị Vân tip 100k, hưởng 90%, app nhảy 80K');

    // Attachments & customerCard cloned cleanly with fresh attachment IDs
    assert.strictEqual(fwd.attachments?.length, 1);
    assert.notStrictEqual(fwd.attachments?.[0]?.id, 'att-orig-1');
    assert.strictEqual(fwd.attachments?.[0]?.url, sourceMsg.attachments?.[0]?.url);
    assert.deepStrictEqual(fwd.customerCard, sourceMsg.customerCard);
    assert.notStrictEqual(fwd.customerCard, sourceMsg.customerCard);

    // Operational links & source state must be isolated/reset
    assert.strictEqual(fwd.pinned, false);
    assert.deepStrictEqual(fwd.reactions, {});
    assert.deepStrictEqual(fwd.reactionUsers, {});
    assert.strictEqual(fwd.taskId, null);
    assert.strictEqual(fwd.missionId, null);
    assert.strictEqual(fwd.missionKey, null);
    assert.strictEqual(fwd.mission, null);
    assert.strictEqual(fwd.workflowInstanceId, null);
    assert.strictEqual(fwd.workflow, null);
    assert.strictEqual(fwd.isBuzzed, false);
    assert.strictEqual(fwd.buzzCount, 0);

    // DM 1-1 label must never expose the peer name
    assert.strictEqual(resolveForwardedSourceLabel(dmConv), 'Tin nhắn riêng (DM)');
    assert.strictEqual(fwd.forwardedFrom?.sourceConversationName, 'Tin nhắn riêng (DM)');
    assert.strictEqual(fwd.forwardedFrom?.sourceConversationType, 'dm');
    assert.strictEqual(fwd.forwardedFrom?.originalSenderName, 'Bảo Hân');
    assert.strictEqual(fwd.forwardedFrom?.note, 'Nhờ @Kha kiểm tra giúp anh ca này nhé');
  });

  it('forwards a Space message WITH its full subthread, skips deleted replies, preserves original reply authors, and clamps future reply timestamps', () => {
    const spaceConv: MosChatConversation = {
      id: 'space-estella',
      type: 'space',
      name: 'estella-store',
      color: '#f59e0b',
      unreadCount: 0,
      updatedAt: '2026-11-21T12:00:00.000Z',
      messages: [],
    };

    const replies: MosChatThreadReply[] = [
      {
        id: 'th-2',
        senderId: 6,
        senderName: 'Nguyễn Quang Khải',
        senderRole: 'Admin',
        senderAvatar: 'NK',
        text: 'Anh kiểm tra log rồi, app tính thiếu tip 20K.',
        timeLabel: '10:15',
        createdAt: '2026-11-21T10:15:00.000Z',
        attachments: [
          {
            id: 'att-reply-2',
            url: '/api/chat/media/22345678-1234-1234-1234-123456789012.png',
            name: 'log.png',
            mimeType: 'image/png',
            sizeBytes: 5120,
          },
        ],
        reactions: { '🔥': 2 },
      },
      {
        id: 'th-deleted',
        senderId: 8,
        senderName: 'Someone',
        senderRole: 'Staff',
        text: 'Tin đã xóa không được chuyển qua',
        timeLabel: '10:10',
        createdAt: '2026-11-21T10:10:00.000Z',
        isDeleted: true,
      },
      {
        id: 'th-1',
        senderId: 9,
        senderName: 'Lệ Quyên',
        senderRole: 'Tư Vấn (CC)',
        senderAvatar: 'LQ',
        text: 'Em gửi kèm ảnh bill lúc khách thanh toán ạ.',
        timeLabel: '10:05',
        createdAt: '2026-11-21T10:05:00.000Z',
      },
      {
        id: 'th-future-skew',
        senderId: 12,
        senderName: 'Ngọc Mai',
        senderRole: 'CS',
        text: 'Phản hồi có đồng hồ bị lệch tương lai',
        timeLabel: '23:59',
        createdAt: '2026-11-25T10:00:00.000Z',
      },
    ];

    const sourceMsg: MosChatMessage = {
      id: 'msg-space-10',
      conversationId: spaceConv.id,
      senderId: 9,
      senderName: 'Lệ Quyên',
      senderRole: 'Tư Vấn (CC)',
      text: 'Xong rồi tại sao vẫn còn báo lỗi?',
      timeLabel: '10:00',
      createdAt: '2026-11-21T10:00:00.000Z',
      thread: replies,
    };

    const now = new Date('2026-11-21T14:00:00.000Z');
    const result = buildForwardedChatMessage({
      sourceConv: spaceConv,
      sourceMsg,
      includeThread: true,
      targetConversationId: 'space-core-team',
      forwarder,
      now,
    });

    assert.strictEqual(result.forwardedThreadCount, 3);
    assert.strictEqual(result.message.forwardedFrom?.sourceConversationName, '#estella-store');
    assert.strictEqual(result.message.forwardedFrom?.forwardedThreadCount, 3);

    const thread = result.message.thread || [];
    assert.strictEqual(thread.length, 3);

    // Must be sorted chronologically (th-1 -> th-2 -> th-future-skew), deleted skipped
    assert.strictEqual(thread[0]?.text, 'Em gửi kèm ảnh bill lúc khách thanh toán ạ.');
    assert.strictEqual(thread[0]?.senderName, 'Lệ Quyên');
    assert.strictEqual(thread[0]?.senderId, 9);
    assert.strictEqual(thread[0]?.timeLabel, '10:05');

    assert.strictEqual(thread[1]?.text, 'Anh kiểm tra log rồi, app tính thiếu tip 20K.');
    assert.strictEqual(thread[1]?.senderName, 'Nguyễn Quang Khải');
    assert.strictEqual(thread[1]?.attachments?.length, 1);
    assert.notStrictEqual(thread[1]?.attachments?.[0]?.id, 'att-reply-2');
    assert.deepStrictEqual(thread[1]?.reactions, {});

    // Clamped future timestamp must be <= now
    assert.ok(new Date(thread[2]!.createdAt).getTime() <= now.getTime());

    // New th-fwd-* IDs must never be stripped by deduplicateMovedMessagesInConversation
    for (const r of thread) {
      assert.ok(r.id.startsWith('th-fwd-'));
    }

    const dedup = deduplicateMovedMessagesInConversation({
      id: 'space-core-team',
      type: 'space',
      name: 'core-team',
      color: '#10b981',
      unreadCount: 0,
      updatedAt: now.toISOString(),
      messages: [result.message],
    });
    assert.strictEqual(dedup.changed, false);
    assert.strictEqual(dedup.removedMessageIds.length, 0);

    // Source message and source thread remain intact (non-destructive)
    assert.strictEqual(sourceMsg.thread?.length, 4);
  });

  it('respects includeThread: false by forwarding only the root message', () => {
    const spaceConv: MosChatConversation = {
      id: 'space-cs',
      type: 'space',
      name: 'cs-team',
      color: '#3b82f6',
      unreadCount: 0,
      updatedAt: '2026-11-21T12:00:00.000Z',
      messages: [],
    };
    const sourceMsg: MosChatMessage = {
      id: 'msg-cs-1',
      conversationId: spaceConv.id,
      senderId: 4,
      senderName: 'Bảo Hân',
      senderRole: 'CS',
      text: 'Tin gốc cần chuyển',
      timeLabel: '11:00',
      createdAt: '2026-11-21T11:00:00.000Z',
      thread: [
        {
          id: 'th-cs-1',
          senderId: 5,
          senderName: 'Khải',
          senderRole: 'Admin',
          text: 'Phản hồi nội bộ',
          timeLabel: '11:05',
          createdAt: '2026-11-21T11:05:00.000Z',
        },
      ],
    };

    const result = buildForwardedChatMessage({
      sourceConv: spaceConv,
      sourceMsg,
      includeThread: false,
      targetConversationId: 'dm-pair-1-2',
      forwarder,
    });

    assert.strictEqual(result.forwardedThreadCount, 0);
    assert.strictEqual(result.message.thread?.length, 0);
    assert.strictEqual(result.message.forwardedFrom?.forwardedThreadCount, 0);
  });

  it('forwards a single reply from inside a subthread as a standalone root message', () => {
    const selfConv: MosChatConversation = {
      id: 'dm-self-1',
      type: 'dm',
      name: 'Danny Do (Ghi chú cho tôi)',
      isSelf: true,
      color: '#6366f1',
      unreadCount: 0,
      updatedAt: '2026-11-21T12:00:00.000Z',
      messages: [],
    };
    const sourceReply: MosChatThreadReply = {
      id: 'th-single-9',
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Admin',
      text: 'Số liệu chốt: 297,000,000 đ',
      timeLabel: '09:30',
      createdAt: '2026-11-21T09:30:00.000Z',
    };
    const sourceMsg: MosChatMessage = {
      id: 'msg-parent-9',
      conversationId: selfConv.id,
      senderId: 1,
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      text: 'Tổng hợp báo cáo',
      timeLabel: '09:00',
      createdAt: '2026-11-21T09:00:00.000Z',
      thread: [sourceReply],
    };

    const result = buildForwardedChatMessage({
      sourceConv: selfConv,
      sourceMsg,
      sourceReply,
      includeThread: false,
      targetConversationId: 'space-core-team',
      forwarder,
    });

    assert.strictEqual(result.forwardedThreadCount, 0);
    assert.strictEqual(result.message.text, 'Số liệu chốt: 297,000,000 đ');
    assert.strictEqual(result.message.forwardedFrom?.sourceConversationName, 'Ghi chú cá nhân');
    assert.strictEqual(result.message.forwardedFrom?.sourceReplyId, 'th-single-9');
    assert.strictEqual(result.message.forwardedFrom?.originalSenderName, 'Nguyễn Quang Khải');
  });

  it('persists both root message and all forwarded subthread replies via upsertMessageWithThreadToRelationalDb', async () => {
    const upsertedCalls: Array<{ id: string; parentMessageId: string | null }> = [];
    const mockFastify = {
      prisma: {
        crm: {
          $executeRawUnsafe: async () => 1,
          crmChatMessage: {
            upsert: async (args: { create: { id: string; parentMessageId: string | null } }) => {
              upsertedCalls.push({
                id: args.create.id,
                parentMessageId: args.create.parentMessageId,
              });
            },
          },
        },
      },
      log: { warn: () => {} },
    } as any;

    const msgWithThread: MosChatMessage = {
      id: 'msg-fwd-root1',
      conversationId: 'space-target',
      senderId: 1,
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      text: 'Tin gốc chuyển tiếp',
      timeLabel: '14:00',
      createdAt: '2026-11-21T14:00:00.000Z',
      thread: [
        {
          id: 'th-fwd-r1',
          senderId: 6,
          senderName: 'Khải',
          senderRole: 'Admin',
          text: 'Phản hồi 1',
          timeLabel: '10:00',
          createdAt: '2026-11-21T10:00:00.000Z',
        },
        {
          id: 'th-fwd-r2',
          senderId: 7,
          senderName: 'Vy',
          senderRole: 'CC',
          text: 'Phản hồi 2',
          timeLabel: '10:05',
          createdAt: '2026-11-21T10:05:00.000Z',
        },
      ],
    };

    await upsertMessageWithThreadToRelationalDb(mockFastify, 'space-target', msgWithThread);

    assert.strictEqual(upsertedCalls.length, 3);
    assert.deepStrictEqual(upsertedCalls[0], { id: 'msg-fwd-root1', parentMessageId: null });
    assert.deepStrictEqual(upsertedCalls[1], { id: 'th-fwd-r1', parentMessageId: 'msg-fwd-root1' });
    assert.deepStrictEqual(upsertedCalls[2], { id: 'th-fwd-r2', parentMessageId: 'msg-fwd-root1' });
  });
});
