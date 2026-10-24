import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type { MosChatConversation, MosChatStaffMember, MosChatTaskItem, MosChatUserSidebarPrefs } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { isStaffMentionedInChatText } from '../chat/routes.js';
import { computeNotificationsFeed, invalidateNotificationsCache } from './routes.js';

describe('mOS Notification Center Privacy & Personal Message Detection (MOS-BUG-141)', () => {
  const staffKhai: MosChatStaffMember = {
    id: 6,
    username: 'khai.nguyen@wingslashes.com',
    displayName: 'Nguyễn Quang Khải',
    role: 'admin',
    isOnline: true,
  };

  it('matches 1-char Space nicknames (@K), short given names (@Khải, @Quang Khải), unaccented names, and email handles without false positives', () => {
    const nicknames = { '6': 'K', '1': 'Danny' };

    assert.equal(
      isStaffMentionedInChatText('@K em dùng iPhone xem thế nào nhé.', staffKhai, { nicknames }).isPersonalMention,
      true,
      'Should match 1-char Space nickname @K'
    );
    assert.equal(
      isStaffMentionedInChatText('Nhờ @Khải kiểm tra giúp anh nhé', staffKhai, { nicknames }).isPersonalMention,
      true,
      'Should match given name @Khải'
    );
    assert.equal(
      isStaffMentionedInChatText('Tag @Quang Khai xem luồng này', staffKhai, { nicknames }).isPersonalMention,
      true,
      'Should match unaccented 2-word name @Quang Khai'
    );
    assert.equal(
      isStaffMentionedInChatText('Ping @khai.nguyen hỗ trợ', staffKhai, { nicknames }).isPersonalMention,
      true,
      'Should match email local handle @khai.nguyen'
    );
    assert.equal(
      isStaffMentionedInChatText('@Kiên và @Nguyễn Văn An kiểm tra nhé', staffKhai, { nicknames }).isPersonalMention,
      false,
      'Must NOT false-match @Kiên or common surname @Nguyễn'
    );
    assert.equal(
      isStaffMentionedInChatText('@Danny Do duyệt giúp em', staffKhai, { nicknames }).isPersonalMention,
      false,
      'Must NOT match when another member is mentioned'
    );
  });

  it('strictly isolates notifications to the recipient and includes unread DMs, @K mentions, and thread replies for the user', async () => {
    invalidateNotificationsCache();

    const userKhai: JwtUserPayload = {
      id: 6,
      username: 'khai.nguyen@wingslashes.com',
      displayName: 'Nguyễn Quang Khải',
      role: 'admin',
    };

    const conversations: MosChatConversation[] = [
      // 1. Other people's 1-1 DM (Tâm #4 & Trúc Nhi #13) -> MUST NEVER leak to Khải (#6)
      {
        id: 'dm-pair-4-13',
        type: 'dm',
        name: 'Tâm Nguyễn',
        color: '#3b82f6',
        avatar: 'TN',
        memberIds: [4, 13],
        memberCount: 2,
        unreadCount: 3,
        updatedAt: '2026-10-24T08:00:00.000Z',
        messages: [
          {
            id: 'msg-foreign-dm-1',
            conversationId: 'dm-pair-4-13',
            senderId: 4,
            senderName: 'Tâm Nguyễn',
            senderRole: 'Admin',
            senderAvatar: 'T',
            roleColor: '#3b82f6',
            text: 'Tin nhắn riêng giữa Tâm và Trúc Nhi',
            timeLabel: '15:00',
            createdAt: '2026-10-24T08:00:00.000Z',
            reactions: {},
            thread: [],
          },
        ],
      },
      // 2. Restricted Space where Khải (#6) is NOT a member -> MUST NEVER leak @All to Khải
      {
        id: 'space-ae4ed25e',
        type: 'space',
        name: '4-cô-gái-hăng-hái',
        color: '#ec4899',
        avatar: '4C',
        memberIds: [22, 18, 4, 70, 71],
        memberCount: 5,
        unreadCount: 1,
        updatedAt: '2026-10-24T08:05:00.000Z',
        messages: [
          {
            id: 'msg-restricted-space-1',
            conversationId: 'space-ae4ed25e',
            senderId: 4,
            senderName: 'Tâm Nguyễn',
            senderRole: 'Admin',
            senderAvatar: 'T',
            roleColor: '#3b82f6',
            text: '@All cập nhật tiến độ nhóm',
            timeLabel: '15:05',
            createdAt: '2026-10-24T08:05:00.000Z',
            reactions: {},
            thread: [],
          },
        ],
      },
      // 3. Khải's 1-1 DM with Danny (#1 & #6) where root messages were read, but Danny replied in a thread!
      {
        id: 'dm-pair-1-6',
        type: 'dm',
        name: 'Nguyễn Quang Khải',
        color: '#10b981',
        avatar: 'K',
        memberIds: [1, 6],
        memberCount: 2,
        unreadCount: 0,
        updatedAt: '2026-10-24T08:10:00.000Z',
        messages: [
          {
            id: 'msg-dm-1-6-root',
            conversationId: 'dm-pair-1-6',
            senderId: 6,
            senderName: 'Nguyễn Quang Khải',
            senderRole: 'Admin',
            senderAvatar: 'K',
            roleColor: '#10b981',
            text: 'Anh Danny ơi em gửi báo cáo ạ',
            timeLabel: '15:08',
            createdAt: '2026-10-24T08:08:00.000Z',
            reactions: {},
            thread: [
              {
                id: 'reply-dm-1-6-thread',
                senderId: 1,
                senderName: 'Danny Do',
                senderRole: 'Super Admin',
                senderAvatar: 'D',
                roleColor: '#3b82f6',
                text: 'Anh đã xem rồi nhé Khải ơi!',
                timeLabel: '15:10',
                createdAt: '2026-10-24T08:10:00.000Z',
              },
            ],
          },
        ],
      },
      // 4. Core Team Space where Khải (#6) IS a member with nickname 'K' and gets tagged '@K'
      {
        id: 'space-core-team',
        type: 'space',
        name: 'core-team',
        color: '#3b82f6',
        avatar: 'CT',
        memberIds: [1, 4, 6],
        memberNicknames: { '6': 'K' },
        memberCount: 3,
        unreadCount: 1,
        updatedAt: '2026-10-24T08:15:00.000Z',
        messages: [
          {
            id: 'msg-core-mention-k',
            conversationId: 'space-core-team',
            senderId: 1,
            senderName: 'Danny Do',
            senderRole: 'Super Admin',
            senderAvatar: 'D',
            roleColor: '#3b82f6',
            text: '@K em dùng iPhone xem thế nào nhé.',
            timeLabel: '15:15',
            createdAt: '2026-10-24T08:15:00.000Z',
            reactions: {},
            thread: [],
          },
        ],
      },
    ];

    const userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs> = {
      staff_6: {
        pinnedIds: [],
        mutedIds: [],
        hiddenIds: [],
        manualUnreadIds: [],
        readMessageCountByConv: {
          'dm-pair-1-6': 1, // root message already read, but thread reply is unread!
          'space-core-team': 0,
        },
        readThreadReplyCountByMsg: {},
        collapsedSections: {},
        unreadOnlySections: {},
        sectionOrder: ['dm', 'spaces'],
        customSections: [],
        conversationOrder: {},
      },
    };

    const tasks: MosChatTaskItem[] = [
      {
        id: 'task-unassigned-other-dm',
        conversationId: 'dm-pair-4-13',
        conversationName: 'Tâm Nguyễn',
        title: 'Task không gán người phụ trách trong DM người khác',
        assigneeName: '',
        creatorName: 'Tâm Nguyễn',
        priority: 'HIGH',
        remindAt: '2026-10-24T09:00:00.000Z',
        done: false,
        createdAt: '2026-10-24T08:00:00.000Z',
      },
    ];

    const mockFastify = {
      log: { warn: () => {}, error: () => {} },
      prisma: {
        crm: {
          crmStaff: {
            findUnique: async () => ({
              id: 6,
              username: 'khai.nguyen@wingslashes.com',
              displayName: 'Nguyễn Quang Khải',
              email: 'khai.nguyen@wingslashes.com',
              role: 'admin',
              avatarUrl: null,
            }),
            findMany: async () => [
              {
                id: 1,
                username: 'danny',
                displayName: 'Danny Do',
                role: 'super_admin',
                avatarUrl: null,
                lastActiveAt: new Date(),
                legacyStaffId: 1,
              },
              {
                id: 4,
                username: 'tam.nguyen@wingslashes.com',
                displayName: 'Tâm Nguyễn',
                role: 'admin',
                avatarUrl: null,
                lastActiveAt: new Date(),
                legacyStaffId: 4,
              },
              {
                id: 6,
                username: 'khai.nguyen@wingslashes.com',
                displayName: 'Nguyễn Quang Khải',
                role: 'admin',
                avatarUrl: null,
                lastActiveAt: new Date(),
                legacyStaffId: 6,
              },
              {
                id: 13,
                username: 'nhi.truc@wingslashes.com',
                displayName: 'Trúc Nhi',
                role: 'telesales',
                avatarUrl: null,
                lastActiveAt: new Date(),
                legacyStaffId: 13,
              },
            ],
          },
          crmTeamMember: {
            findMany: async () => [],
          },
          crmBugReport: {
            findMany: async () => [],
          },
          crmBugReportNotification: {
            findMany: async () => [],
          },
          crmConfig: {
            findUnique: async ({ where }: { where: { key: string } }) => {
              if (where.key === 'mos_chat:conversations_v1') {
                return { key: where.key, value: JSON.stringify(conversations), updatedAt: new Date() };
              }
              if (where.key === 'mos_chat:user_prefs_v1') {
                return { key: where.key, value: JSON.stringify(userPrefsByUserKey), updatedAt: new Date() };
              }
              if (where.key === 'mos_chat:tasks_v1') {
                return { key: where.key, value: JSON.stringify(tasks), updatedAt: new Date() };
              }
              return null;
            },
            upsert: async () => ({}),
          },
        },
        legacy: {},
      },
    } as unknown as FastifyInstance;

    const feed = await computeNotificationsFeed(mockFastify, userKhai, 6, false);

    // Must NOT contain any notification from dm-pair-4-13 or space-ae4ed25e or unassigned task
    assert.equal(
      feed.items.some((i) => i.id.includes('dm-pair-4-13')),
      false,
      'Must never leak other users 1-1 DMs into Khải notifications'
    );
    assert.equal(
      feed.items.some((i) => i.id.includes('space-ae4ed25e')),
      false,
      'Must never leak restricted spaces where Khải is not a member'
    );
    assert.equal(
      feed.items.some((i) => i.id.includes('task-unassigned-other-dm')),
      false,
      'Must never leak unassigned tasks from other conversations'
    );

    // MUST contain the @K mention in space-core-team
    const mentionNotif = feed.items.find((i) => i.id === 'chat-mention-space-core-team-msg-core-mention-k');
    assert.ok(mentionNotif, 'Should generate notification when Khải is tagged via @K nickname in Core Team');
    assert.equal(mentionNotif?.action.payload.conversationId, 'space-core-team');
    assert.equal(mentionNotif?.action.payload.messageId, 'msg-core-mention-k');

    // MUST contain the unread thread reply in dm-pair-1-6
    const threadNotif = feed.items.find(
      (i) => i.id === 'chat-thread-dm-pair-1-6-msg-dm-1-6-root-reply-dm-1-6-thread'
    );
    assert.ok(threadNotif, 'Should generate notification when Danny replies to Khải in a thread');
    assert.equal(threadNotif?.action.payload.conversationId, 'dm-pair-1-6');
    assert.equal(threadNotif?.action.payload.messageId, 'reply-dm-1-6-thread');
  });
});
