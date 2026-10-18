import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeUnreadCountForUser, formatConversationForUser } from './routes.js';
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
});
