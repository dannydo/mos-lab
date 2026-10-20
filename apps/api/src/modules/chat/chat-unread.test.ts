import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeUnreadCountForUser,
  computeConversationReadReceipts,
  computeThreadReadReceiptsForMessage,
  computeUnreadThreadReplyCountForUser,
  formatConversationForUser,
} from './routes.js';
import type { MosChatConversation, MosChatStaffMember, MosChatUserSidebarPrefs } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';

describe('computeUnreadCountForUser & formatConversationForUser', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 4, username: 'tam.nguyen@wingslashes.com', displayName: 'Tâm Nguyễn', role: 'admin', isOnline: true },
    { id: 6, username: 'khai.nguyen@wingslashes.com', displayName: 'Nguyễn Quang Khải', role: 'admin', isOnline: true },
    { id: 1, username: 'danny.do@wingslashes.com', displayName: 'Danny Do', role: 'super_admin', isOnline: true },
  ];

  const userKhai: JwtUserPayload = {
    id: 6,
    username: 'khai.nguyen@wingslashes.com',
    displayName: 'Nguyễn Quang Khải',
    role: 'admin',
  };
  const userTam: JwtUserPayload = {
    id: 4,
    username: 'tam.nguyen@wingslashes.com',
    displayName: 'Tâm Nguyễn',
    role: 'admin',
  };

  const dmConversation: MosChatConversation = {
    id: 'dm-pair-4-6',
    type: 'dm',
    name: 'Tâm Nguyễn',
    subtitle: 'Admin',
    roleTag: 'Admin',
    color: '#a855f7',
    avatar: 'TN',
    memberCount: 2,
    participantStaffId: 4,
    memberIds: [4, 6],
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-1',
        conversationId: 'dm-pair-4-6',
        senderId: 6,
        senderName: 'Nguyễn Quang Khải',
        senderRole: 'Admin',
        senderAvatar: 'KQ',
        roleColor: '#a855f7',
        text: 'Hello Tâm',
        timeLabel: '12:00',
        createdAt: new Date().toISOString(),
        reactions: {},
        thread: [],
      },
      {
        id: 'msg-2',
        conversationId: 'dm-pair-4-6',
        senderId: 4,
        senderName: 'Tâm Nguyễn',
        senderRole: 'Admin',
        senderAvatar: 'TN',
        roleColor: '#a855f7',
        text: 'hello chào buồi trưa',
        timeLabel: '13:01',
        createdAt: new Date().toISOString(),
        reactions: {},
        thread: [],
      },
    ],
  };

  it('correctly calculates unread count for recipient (Khải) when Tâm Nguyễn sends a message and Khải has not read it', () => {
    // Khải has readMessageCountByConv undefined (or 1, from before Tâm sent msg-2)
    const prefsKhaiUnread: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      readMessageCountByConv: { 'dm-pair-4-6': 1 },
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    };

    const unreadForKhai = computeUnreadCountForUser(dmConversation, userKhai, staffDirectory, prefsKhaiUnread);
    assert.equal(unreadForKhai, 1, 'Khải should have 1 unread message from Tâm Nguyễn');

    const formattedKhai = formatConversationForUser(dmConversation, userKhai, staffDirectory, prefsKhaiUnread);
    assert.equal(formattedKhai.unreadCount, 1, 'Formatted conversation for Khải should report unreadCount: 1');
  });

  it('does NOT count messages sent by the user themselves as unread (Tâm should have 0 unread)', () => {
    const prefsTam: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      readMessageCountByConv: { 'dm-pair-4-6': 1 },
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    };

    // Even if Tâm read up to message 1, message 2 was sent by Tâm herself, so it cannot be unread for Tâm
    const unreadForTam = computeUnreadCountForUser(dmConversation, userTam, staffDirectory, prefsTam);
    assert.equal(unreadForTam, 0, 'Tâm should have 0 unread messages because she sent msg-2');

    const formattedTam = formatConversationForUser(dmConversation, userTam, staffDirectory, prefsTam);
    assert.equal(formattedTam.unreadCount, 0, 'Formatted conversation for Tâm should report unreadCount: 0');
  });

  it('clears unread count when Khải reads the conversation up to latest message count', () => {
    const prefsKhaiRead: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      readMessageCountByConv: { 'dm-pair-4-6': 2 },
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    };

    const unreadForKhai = computeUnreadCountForUser(dmConversation, userKhai, staffDirectory, prefsKhaiRead);
    assert.equal(unreadForKhai, 0, 'Khải should have 0 unread messages once read up to latest message');

    const formattedKhai = formatConversationForUser(dmConversation, userKhai, staffDirectory, prefsKhaiRead);
    assert.equal(formattedKhai.unreadCount, 0, 'Formatted conversation for Khải should report unreadCount: 0');
  });

  it('preserves manual unread status if marked in manualUnreadIds', () => {
    const prefsKhaiManual: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: ['dm-pair-4-6'],
      readMessageCountByConv: { 'dm-pair-4-6': 2 },
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    };

    const unreadForKhai = computeUnreadCountForUser(dmConversation, userKhai, staffDirectory, prefsKhaiManual);
    assert.equal(unreadForKhai >= 1, true, 'Khải should have >= 1 unread when manually marked as unread');
  });

  it('infers unread count for DM when readMessageCountByConv is undefined based on trailing peer messages', () => {
    const prefsNoReadCount: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    };

    const unreadForKhai = computeUnreadCountForUser(dmConversation, userKhai, staffDirectory, prefsNoReadCount);
    assert.equal(unreadForKhai, 1, 'Inferred unread count for Khải should be 1');

    const unreadForTam = computeUnreadCountForUser(dmConversation, userTam, staffDirectory, prefsNoReadCount);
    assert.equal(unreadForTam, 0, 'Inferred unread count for Tâm should be 0 (she sent the last message)');
  });

  it('correctly handles pinning and unpinning conversations in user preferences', () => {
    const prefsInitial: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    };

    // Pin conversation
    const convId = 'dm-pair-4-6';
    const isAlreadyPinned = prefsInitial.pinnedIds.includes(convId);
    assert.equal(isAlreadyPinned, false);

    const pinnedPrefs: MosChatUserSidebarPrefs = {
      ...prefsInitial,
      pinnedIds: [convId, ...prefsInitial.pinnedIds],
    };
    assert.equal(pinnedPrefs.pinnedIds.includes(convId), true);

    // Unpin conversation
    const unpinnedPrefs: MosChatUserSidebarPrefs = {
      ...pinnedPrefs,
      pinnedIds: pinnedPrefs.pinnedIds.filter((id) => id !== convId),
    };
    assert.equal(unpinnedPrefs.pinnedIds.includes(convId), false);
  });

  it('marks conversation as unread by adding to manualUnreadIds and resetting readMessageCount', () => {
    const convId = 'dm-pair-4-6';
    const prefsRead: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      readMessageCountByConv: { [convId]: 2 },
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    };

    // Mark as unread
    const prefsMarkedUnread: MosChatUserSidebarPrefs = {
      ...prefsRead,
      manualUnreadIds: Array.from(new Set([...prefsRead.manualUnreadIds, convId])),
      readMessageCountByConv: {
        ...prefsRead.readMessageCountByConv,
        [convId]: Math.max(0, dmConversation.messages.length - 1),
      },
    };

    const unreadCount = computeUnreadCountForUser(dmConversation, userKhai, staffDirectory, prefsMarkedUnread);
    assert.equal(unreadCount >= 1, true, 'Marked unread conversation must have unreadCount >= 1');
    const formatted = formatConversationForUser(dmConversation, userKhai, staffDirectory, prefsMarkedUnread);
    assert.equal(formatted.unreadCount >= 1, true);
  });

  it('computes main chat readReceipts and sub-thread threadReadReceipts & unreadThreadReplyCount accurately', () => {
    const convWithThread: MosChatConversation = {
      ...dmConversation,
      messages: [
        {
          ...dmConversation.messages[0],
          thread: [
            {
              id: 'th-1',
              senderId: 4,
              senderName: 'Tâm Nguyễn',
              senderRole: 'Admin',
              senderAvatar: 'TN',
              text: 'Em đã nhận việc nhé anh Khải',
              timeLabel: '12:05',
              createdAt: '2026-10-19T05:05:00.000Z',
            },
            {
              id: 'th-2',
              senderId: 4,
              senderName: 'Tâm Nguyễn',
              senderRole: 'Admin',
              senderAvatar: 'TN',
              text: 'Báo cáo tiến độ bước 1',
              timeLabel: '12:10',
              createdAt: '2026-10-19T05:10:00.000Z',
            },
          ],
        },
        dmConversation.messages[1],
      ],
    };

    const allUserPrefs: Record<string, MosChatUserSidebarPrefs> = {
      '6': {
        pinnedIds: [],
        mutedIds: [],
        hiddenIds: [],
        manualUnreadIds: [],
        readMessageCountByConv: { 'dm-pair-4-6': 2 },
        readAtByConv: { 'dm-pair-4-6': '2026-10-19T06:02:00.000Z' },
        lastReadMessageIdByConv: { 'dm-pair-4-6': 'msg-2' },
        // Khải has only read 1 reply in msg-1's sub-thread so far
        readThreadReplyCountByMsg: { 'msg-1': 1 },
        readThreadAtByMsg: { 'msg-1': '2026-10-19T05:06:00.000Z' },
        collapsedSections: {},
        unreadOnlySections: {},
        sectionOrder: ['dm', 'spaces'],
        customSections: [],
        conversationOrder: {},
      },
      '4': {
        pinnedIds: [],
        mutedIds: [],
        hiddenIds: [],
        manualUnreadIds: [],
        readMessageCountByConv: { 'dm-pair-4-6': 2 },
        readThreadReplyCountByMsg: { 'msg-1': 2 },
        collapsedSections: {},
        unreadOnlySections: {},
        sectionOrder: ['dm', 'spaces'],
        customSections: [],
        conversationOrder: {},
      },
    };

    const convReceipts = computeConversationReadReceipts(convWithThread, staffDirectory, allUserPrefs);
    assert.equal(convReceipts.length, 2);
    const khaiReceipt = convReceipts.find((r) => r.staffId === 6);
    const tamReceipt = convReceipts.find((r) => r.staffId === 4);
    assert.equal(khaiReceipt?.readCount, 2);
    assert.equal(khaiReceipt?.lastReadMessageId, 'msg-2');
    assert.equal(tamReceipt?.readCount, 2);

    const threadReceipts = computeThreadReadReceiptsForMessage(
      convWithThread,
      convWithThread.messages[0],
      staffDirectory,
      allUserPrefs
    );
    const khaiThreadReceipt = threadReceipts.find((r) => r.staffId === 6);
    const tamThreadReceipt = threadReceipts.find((r) => r.staffId === 4);
    assert.equal(khaiThreadReceipt?.readReplyCount, 1);
    assert.equal(khaiThreadReceipt?.lastReadReplyId, 'th-1');
    assert.equal(tamThreadReceipt?.readReplyCount, 2);
    assert.equal(tamThreadReceipt?.lastReadReplyId, 'th-2');

    // Unread thread reply count for Khải should be 1 (th-2 from Tâm is unread)
    const unreadThreadForKhai = computeUnreadThreadReplyCountForUser(
      convWithThread,
      convWithThread.messages[0],
      userKhai.id,
      staffDirectory,
      allUserPrefs['6']
    );
    assert.equal(unreadThreadForKhai, 1);

    // Unread thread reply count for Tâm should be 0 (she authored both replies)
    const unreadThreadForTam = computeUnreadThreadReplyCountForUser(
      convWithThread,
      convWithThread.messages[0],
      userTam.id,
      staffDirectory,
      allUserPrefs['4']
    );
    assert.equal(unreadThreadForTam, 0);

    // Format full conversation for Khải
    const formattedForKhai = formatConversationForUser(
      convWithThread,
      userKhai,
      staffDirectory,
      allUserPrefs['6'],
      allUserPrefs
    );
    assert.equal(formattedForKhai.unreadThreadCount, 1);
    assert.equal(formattedForKhai.messages[0]?.unreadThreadReplyCount, 1);
    assert.equal(formattedForKhai.readReceipts?.length, 2);
    assert.equal(formattedForKhai.messages[0]?.threadReadReceipts?.length, 2);

    // When Khải marks the conversation as read, unreadThreadCount drops to 0
    const prefsKhaiFullyRead: MosChatUserSidebarPrefs = {
      ...allUserPrefs['6'],
      readMessageCountByConv: { 'dm-pair-4-6': 2 },
      readThreadReplyCountByMsg: {
        'msg-1': 2,
        'dm-pair-4-6::msg-1': 2,
      },
    };
    const formattedFullyRead = formatConversationForUser(
      convWithThread,
      userKhai,
      staffDirectory,
      prefsKhaiFullyRead,
      { ...allUserPrefs, '6': prefsKhaiFullyRead }
    );
    assert.equal(formattedFullyRead.unreadCount, 0, 'unreadCount should be 0');
    assert.equal(formattedFullyRead.unreadThreadCount, 0, 'unreadThreadCount should be 0');
    assert.equal(formattedFullyRead.messages[0]?.unreadThreadReplyCount, 0, 'thread reply unread count should be 0');
  });
});
