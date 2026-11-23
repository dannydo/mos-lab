import { describe, it, expect } from 'vitest';
import type { MosChatConversation, MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';
import {
  mergeThreadReplies,
  mergeDeltaConversations,
  mergeWindowedBootstrapConversations,
  prependOlderConversationMessages,
  applyRealtimeEventToConversations,
} from '../store/useChatRealtimeSync';

describe('useChatRealtimeSync - MOS-BUG-208 thread reply deletion persistence', () => {
  it('mergeThreadReplies preserves soft-deleted status of local reply when incoming delta reply is not restored', () => {
    const existingReplies: MosChatThreadReply[] = [
      {
        id: 'th-d1173d23',
        senderId: 6,
        senderName: 'Nguyễn Quang Khải',
        senderRole: 'STAFF',
        text: '- [ ] d',
        timeLabel: '21:56',
        createdAt: '2026-11-08T14:56:00.000Z',
        isDeleted: true,
        deletedAt: '2026-11-08T14:56:30.000Z',
        deletedBy: 6,
        deletedByName: 'Nguyễn Quang Khải',
        originalText: '- [ ] d',
      },
    ];

    const incomingStaleReplies: MosChatThreadReply[] = [
      {
        id: 'th-d1173d23',
        senderId: 6,
        senderName: 'Nguyễn Quang Khải',
        senderRole: 'STAFF',
        text: '- [ ] d',
        timeLabel: '21:56',
        createdAt: '2026-11-08T14:56:00.000Z',
        isDeleted: false,
      },
    ];

    const merged = mergeThreadReplies(existingReplies, incomingStaleReplies);
    expect(merged.length).toBe(1);
    expect(merged[0].id).toBe('th-d1173d23');
    expect(merged[0].isDeleted).toBe(true);
    expect(merged[0].deletedByName).toBe('Nguyễn Quang Khải');
  });

  it('mergeDeltaConversations does not reopen deleted thread replies when new messages arrive', () => {
    const prevConvs: MosChatConversation[] = [
      {
        id: 'space-core-team',
        type: 'space',
        name: 'Core Team',
        color: '#1a73e8',
        unreadCount: 0,
        updatedAt: '2026-11-08T15:00:00.000Z',
        messages: [
          {
            id: 'msg-task-1',
            conversationId: 'space-core-team',
            senderId: 6,
            senderName: 'Nguyễn Quang Khải',
            senderRole: 'STAFF',
            text: 'Bàn giao task',
            timeLabel: '21:00',
            createdAt: '2026-11-08T14:00:00.000Z',
            thread: [
              {
                id: 'th-d1173d23',
                senderId: 6,
                senderName: 'Nguyễn Quang Khải',
                senderRole: 'STAFF',
                text: '- [ ] d',
                timeLabel: '21:56',
                createdAt: '2026-11-08T14:56:00.000Z',
                isDeleted: true,
                deletedAt: '2026-11-08T14:56:30.000Z',
                deletedBy: 6,
                deletedByName: 'Nguyễn Quang Khải',
                originalText: '- [ ] d',
              },
            ],
          },
        ],
      },
    ];

    const incomingNewMessage: MosChatMessage = {
      id: 'msg-new-2',
      conversationId: 'space-core-team',
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'STAFF',
      text: 'Tin nhắn tiếp theo',
      timeLabel: '22:00',
      createdAt: '2026-11-08T15:00:00.000Z',
    };

    const deltaConvs: MosChatConversation[] = [
      {
        id: 'space-core-team',
        type: 'space',
        name: 'Core Team',
        color: '#1a73e8',
        unreadCount: 0,
        updatedAt: '2026-11-08T15:00:00.000Z',
        messages: [
          {
            id: 'msg-task-1',
            conversationId: 'space-core-team',
            senderId: 6,
            senderName: 'Nguyễn Quang Khải',
            senderRole: 'STAFF',
            text: 'Bàn giao task',
            timeLabel: '21:00',
            createdAt: '2026-11-08T14:00:00.000Z',
            thread: [
              {
                id: 'th-d1173d23',
                senderId: 6,
                senderName: 'Nguyễn Quang Khải',
                senderRole: 'STAFF',
                text: '- [ ] d',
                timeLabel: '21:56',
                createdAt: '2026-11-08T14:56:00.000Z',
                isDeleted: false,
              },
            ],
          },
          incomingNewMessage,
        ],
      },
    ];

    const merged = mergeDeltaConversations(prevConvs, deltaConvs, [incomingNewMessage], []);
    const coreTeam = merged.find((c) => c.id === 'space-core-team');
    expect(coreTeam).toBeDefined();
    expect(coreTeam?.messages.length).toBe(2);

    const taskMsg = coreTeam?.messages.find((m) => m.id === 'msg-task-1');
    expect(taskMsg?.thread?.[0]?.isDeleted).toBe(true);
    expect(taskMsg?.thread?.[0]?.deletedByName).toBe('Nguyễn Quang Khải');
  });

  it('applyRealtimeEventToConversations soft-deletes thread reply on MESSAGE_DELETED', () => {
    const prevConvs: MosChatConversation[] = [
      {
        id: 'space-core-team',
        type: 'space',
        name: 'Core Team',
        color: '#1a73e8',
        unreadCount: 0,
        updatedAt: '2026-11-08T15:00:00.000Z',
        messages: [
          {
            id: 'msg-parent',
            conversationId: 'space-core-team',
            senderId: 6,
            senderName: 'Nguyễn Quang Khải',
            senderRole: 'STAFF',
            text: 'Parent',
            timeLabel: '21:00',
            createdAt: '2026-11-08T14:00:00.000Z',
            thread: [
              {
                id: 'th-1',
                senderId: 6,
                senderName: 'Nguyễn Quang Khải',
                senderRole: 'STAFF',
                text: 'Reply content',
                timeLabel: '21:10',
                createdAt: '2026-11-08T14:10:00.000Z',
                isDeleted: false,
              },
            ],
          },
        ],
      },
    ];

    const res = applyRealtimeEventToConversations(prevConvs, {
      id: 'evt-del-1',
      type: 'MESSAGE_DELETED',
      conversationId: 'space-core-team',
      timestamp: '2026-11-08T14:20:00.000Z',
      actorStaffId: 6,
      payload: {
        conversationId: 'space-core-team',
        messageId: 'msg-parent',
        replyId: 'th-1',
        target: {
          id: 'th-1',
          timeLabel: '21:10',
          isDeleted: true,
          deletedAt: '2026-11-08T14:20:00.000Z',
          deletedBy: 6,
          deletedByName: 'Nguyễn Quang Khải',
          originalText: 'Reply content',
        },
      },
    });

    const reply = res[0].messages[0].thread?.[0];
    expect(reply?.isDeleted).toBe(true);
    expect(reply?.deletedByName).toBe('Nguyễn Quang Khải');
  });

  it('mergeWindowedBootstrapConversations preserves prepended older history when newer tail window arrives', () => {
    const mkMsg = (n: number): MosChatMessage => ({
      id: `msg-${n}`,
      conversationId: 'space-core-team',
      senderId: 1,
      senderName: 'Danny',
      senderRole: 'Super Admin',
      text: `M${n}`,
      timeLabel: '10:00',
      createdAt: `2026-11-20T01:${String(n).padStart(2, '0')}:00.000Z`,
    });

    const initial: MosChatConversation[] = [
      {
        id: 'space-core-team',
        type: 'space',
        name: 'Core Team',
        color: '#1a73e8',
        unreadCount: 0,
        updatedAt: '2026-11-20T01:40:00.000Z',
        totalMessageCount: 40,
        hasMoreMessages: true,
        oldestLoadedMessageId: 'msg-11',
        messages: Array.from({ length: 30 }, (_, i) => mkMsg(i + 11)),
      },
    ];

    const afterLoadOlder = prependOlderConversationMessages(initial, 'space-core-team', {
      messages: Array.from({ length: 10 }, (_, i) => mkMsg(i + 1)),
      hasMore: false,
      nextCursor: null,
    });
    expect(afterLoadOlder[0].messages.map((m) => m.id)).toHaveLength(40);
    expect(afterLoadOlder[0].hasMoreMessages).toBe(false);

    const incomingNewWindow: MosChatConversation[] = [
      {
        id: 'space-core-team',
        type: 'space',
        name: 'Core Team',
        color: '#1a73e8',
        unreadCount: 0,
        updatedAt: '2026-11-20T01:41:00.000Z',
        totalMessageCount: 41,
        hasMoreMessages: true,
        oldestLoadedMessageId: 'msg-12',
        messages: Array.from({ length: 30 }, (_, i) => mkMsg(i + 12)),
      },
    ];

    const merged = mergeWindowedBootstrapConversations(afterLoadOlder, incomingNewWindow);
    expect(merged[0].messages).toHaveLength(41);
    expect(merged[0].messages[0].id).toBe('msg-1');
    expect(merged[0].messages[40].id).toBe('msg-41');
    expect(merged[0].hasMoreMessages).toBe(false);
    expect(merged[0].oldestLoadedMessageId).toBe('msg-1');
  });
});
