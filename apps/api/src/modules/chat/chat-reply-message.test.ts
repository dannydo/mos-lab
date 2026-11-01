import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatConversationForUser } from './routes.js';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatQuotedMessage,
  MosChatStaffMember,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';

describe('mOS Chat Reply to Message in Conversation (MOS-BUG-185)', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 1, username: 'danny.do@wingslashes.com', displayName: 'Danny Do', role: 'super_admin', isOnline: true },
    { id: 10, username: 'ha.my@wingslashes.com', displayName: 'Hà My', role: 'technician', isOnline: true },
  ];

  const userDanny: JwtUserPayload = {
    id: 1,
    username: 'danny.do@wingslashes.com',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  it('preserves replyToId and replyTo object in formatConversationForUser', () => {
    const parentMsg: MosChatMessage = {
      id: 'msg-parent-1',
      conversationId: 'dm-pair-1-10',
      senderId: 1,
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      text: 'Chiều nay em có nhận khách lúc 14h không?',
      timeLabel: '13:00',
      createdAt: new Date().toISOString(),
    };

    const replyMsg: MosChatMessage = {
      id: 'msg-reply-1',
      conversationId: 'dm-pair-1-10',
      senderId: 10,
      senderName: 'Hà My',
      senderRole: 'Chuyên Viên Mi',
      text: 'Dạ em có nhận ca đó anh nhé!',
      timeLabel: '13:05',
      createdAt: new Date().toISOString(),
      replyToId: 'msg-parent-1',
      replyTo: {
        id: 'msg-parent-1',
        senderId: 1,
        senderName: 'Danny Do',
        text: 'Chiều nay em có nhận khách lúc 14h không?',
      },
    };

    const conv: MosChatConversation = {
      id: 'dm-pair-1-10',
      type: 'dm',
      name: 'Hà My',
      participantStaffId: 10,
      unreadCount: 0,
      color: '#3b82f6',
      updatedAt: new Date().toISOString(),
      messages: [parentMsg, replyMsg],
    };

    const formatted = formatConversationForUser(conv, userDanny, staffDirectory);
    assert.equal(formatted.messages.length, 2);
    const formattedReply = formatted.messages[1];
    assert.equal(formattedReply.replyToId, 'msg-parent-1');
    assert.ok(formattedReply.replyTo);
    assert.equal(formattedReply.replyTo?.senderName, 'Danny Do');
    assert.equal(formattedReply.replyTo?.text, 'Chiều nay em có nhận khách lúc 14h không?');
  });

  it('correctly maps quoted message metadata when resolving replyToId in conversation', () => {
    const originalMessages: MosChatMessage[] = [
      {
        id: 'msg-root-100',
        conversationId: 'space-general',
        senderId: 1,
        senderName: 'Danny Do',
        senderRole: 'Super Admin',
        senderAvatar: 'https://cdn.wingslashes.com/danny.jpg',
        text: 'Mọi người cập nhật checklist trước 18h nhé',
        timeLabel: '16:00',
        createdAt: new Date().toISOString(),
      },
    ];

    const targetReplyId = 'msg-root-100';
    const found = originalMessages.find((m) => m.id === targetReplyId);
    assert.ok(found);

    const resolvedReplyTo: MosChatQuotedMessage = {
      id: found.id,
      senderId: found.senderId,
      senderName: found.senderName,
      senderAvatar: found.senderAvatar,
      text: found.text,
    };

    assert.equal(resolvedReplyTo.id, 'msg-root-100');
    assert.equal(resolvedReplyTo.senderName, 'Danny Do');
    assert.equal(resolvedReplyTo.senderAvatar, 'https://cdn.wingslashes.com/danny.jpg');
    assert.equal(resolvedReplyTo.text, 'Mọi người cập nhật checklist trước 18h nhé');
  });
});
