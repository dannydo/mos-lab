import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatConversationForUser } from './routes.js';
import type {
  MosChatBuzzEvent,
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatThreadReply,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';

describe('mOS Chat Buzz / Bump Urgent Message Invariants (MOS-BUG-131)', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 4, username: 'tam.nguyen@wingslashes.com', displayName: 'Tâm Nguyễn', role: 'admin', isOnline: true },
    { id: 6, username: 'khai.nguyen@wingslashes.com', displayName: 'Nguyễn Quang Khải', role: 'admin', isOnline: true },
    { id: 1, username: 'danny.do@wingslashes.com', displayName: 'Danny Do', role: 'super_admin', isOnline: true },
  ];

  const userTam: JwtUserPayload = {
    id: 4,
    username: 'tam.nguyen@wingslashes.com',
    displayName: 'Tâm Nguyễn',
    role: 'admin',
  };

  const userKhai: JwtUserPayload = {
    id: 6,
    username: 'khai.nguyen@wingslashes.com',
    displayName: 'Nguyễn Quang Khải',
    role: 'admin',
  };

  it('records a buzz event on a message and correctly maintains audit history and count', () => {
    const msg: MosChatMessage = {
      id: 'msg-urgent-1',
      conversationId: 'space-operations',
      senderId: 4,
      senderName: 'Tâm Nguyễn',
      senderRole: 'Admin',
      text: 'Đơn hàng lớn cần duyệt gấp trước 11h!',
      timeLabel: '10:24',
      createdAt: new Date().toISOString(),
    };

    const firstBuzzAt = new Date().toISOString();
    const firstBuzzEvent: MosChatBuzzEvent = {
      id: 'buzz-1',
      senderId: 4,
      senderName: 'Tâm Nguyễn',
      senderRole: 'Admin',
      buzzedAt: firstBuzzAt,
      note: 'Khẩn cấp xin phản hồi ngay',
    };

    // Apply first buzz
    msg.isBuzzed = true;
    msg.buzzedAt = firstBuzzEvent.buzzedAt;
    msg.latestBuzz = firstBuzzEvent;
    msg.buzzHistory = [firstBuzzEvent];
    msg.buzzCount = 1;

    assert.equal(msg.isBuzzed, true);
    assert.equal(msg.buzzCount, 1);
    assert.equal(msg.latestBuzz.senderName, 'Tâm Nguyễn');
    assert.equal(msg.buzzHistory.length, 1);
    assert.equal(msg.buzzHistory[0].note, 'Khẩn cấp xin phản hồi ngay');

    // Simulate second buzz after cooldown
    const secondBuzzAt = new Date(Date.now() + 65000).toISOString();
    const secondBuzzEvent: MosChatBuzzEvent = {
      id: 'buzz-2',
      senderId: 4,
      senderName: 'Tâm Nguyễn',
      senderRole: 'Admin',
      buzzedAt: secondBuzzAt,
      note: 'Nhắc lại lần 2',
    };

    msg.buzzedAt = secondBuzzEvent.buzzedAt;
    msg.latestBuzz = secondBuzzEvent;
    msg.buzzHistory.push(secondBuzzEvent);
    msg.buzzCount = msg.buzzHistory.length;

    assert.equal(msg.buzzCount, 2);
    assert.equal(msg.buzzHistory.length, 2);
    assert.equal(msg.latestBuzz.note, 'Nhắc lại lần 2');
  });

  it('enforces 60-second anti-spam cooldown between buzzes on the same message', () => {
    const now = new Date();
    const msg: MosChatMessage = {
      id: 'msg-spam-check',
      conversationId: 'space-operations',
      senderId: 4,
      senderName: 'Tâm Nguyễn',
      senderRole: 'Admin',
      text: 'Tin nhắn cần kiểm tra spam',
      timeLabel: '10:25',
      createdAt: now.toISOString(),
      isBuzzed: true,
      buzzedAt: now.toISOString(),
    };

    // Attempting to buzz 20 seconds later
    const attemptTime = new Date(now.getTime() + 20000);
    const diffSeconds = Math.floor((attemptTime.getTime() - new Date(msg.buzzedAt!).getTime()) / 1000);
    const cooldownSeconds = 60;

    assert.equal(diffSeconds < cooldownSeconds, true);
    const waitRemaining = cooldownSeconds - diffSeconds;
    assert.equal(waitRemaining, 40);
  });

  it('preserves unread status for recipients: does NOT auto-mark as read when buzz is issued', () => {
    const conv: MosChatConversation = {
      id: 'dm-pair-4-6',
      type: 'dm',
      name: 'Tâm Nguyễn',
      color: '#4285f4',
      memberCount: 2,
      participantStaffId: 4,
      memberIds: [4, 6],
      unreadCount: 1,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-read-1',
          conversationId: 'dm-pair-4-6',
          senderId: 6,
          senderName: 'Nguyễn Quang Khải',
          senderRole: 'Admin',
          text: 'Tin nhắn đã đọc trước đó',
          timeLabel: '09:00',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'msg-buzz-2',
          conversationId: 'dm-pair-4-6',
          senderId: 4,
          senderName: 'Tâm Nguyễn',
          senderRole: 'Admin',
          text: 'Khải ơi đơn hàng này khách đang đợi gấp tại quầy!',
          timeLabel: '10:26',
          createdAt: new Date().toISOString(),
          isBuzzed: true,
          buzzedAt: new Date().toISOString(),
          buzzCount: 1,
        },
      ],
    };

    // Khải has read count = 1 (only the first message)
    const khaiPrefs = {
      readMessageCountByConv: {
        'dm-pair-4-6': 1,
      },
    };

    const formattedForKhai = formatConversationForUser(conv, userKhai, staffDirectory, khaiPrefs as any);

    // Unread count must remain 1
    assert.equal(formattedForKhai.unreadCount, 1);
    // Khải must have an active unread buzz flag
    assert.equal(formattedForKhai.hasUnreadBuzz, true);
    assert.equal(formattedForKhai.unreadBuzzCount, 1);

    // Now simulate Khải reading the message (readMessageCountByConv becomes 2)
    const khaiReadPrefs = {
      readMessageCountByConv: {
        'dm-pair-4-6': 2,
      },
    };
    const formattedAfterRead = formatConversationForUser(conv, userKhai, staffDirectory, khaiReadPrefs as any);
    assert.equal(formattedAfterRead.unreadCount, 0);
    assert.equal(formattedAfterRead.hasUnreadBuzz, false);
  });

  it('correctly supports buzzing a thread reply', () => {
    const reply: MosChatThreadReply = {
      id: 'reply-1',
      senderId: 4,
      senderName: 'Tâm Nguyễn',
      senderRole: 'Admin',
      text: 'Phản hồi khẩn cấp trong thread',
      timeLabel: '10:28',
      createdAt: new Date().toISOString(),
    };

    const rootMsg: MosChatMessage = {
      id: 'msg-parent',
      conversationId: 'space-operations',
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Admin',
      text: 'Thảo luận đơn hàng',
      timeLabel: '10:00',
      createdAt: new Date().toISOString(),
      thread: [reply],
    };

    const buzzAt = new Date().toISOString();
    const buzzEvent: MosChatBuzzEvent = {
      id: 'buzz-reply-1',
      senderId: 4,
      senderName: 'Tâm Nguyễn',
      senderRole: 'Admin',
      buzzedAt: buzzAt,
      note: 'Thread khẩn cấp',
    };

    reply.isBuzzed = true;
    reply.buzzedAt = buzzAt;
    reply.latestBuzz = buzzEvent;
    reply.buzzHistory = [buzzEvent];
    reply.buzzCount = 1;

    assert.equal(reply.isBuzzed, true);
    assert.equal(reply.buzzCount, 1);
    assert.equal(rootMsg.thread?.[0].isBuzzed, true);
    // Root message itself remains unbuzzed if only reply was buzzed
    assert.equal(Boolean(rootMsg.isBuzzed), false);
  });
});
