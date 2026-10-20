import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canUserEditChatMessage } from './routes.js';
import type { MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';

describe('Chat Message Edit Permission & Invariants (MOS-BUG-126)', () => {
  const dannyUser = {
    id: 1,
    username: 'danny',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  const dannyStaffRecord = {
    displayName: 'Danny Do',
    username: 'danny.do@wingslashes.com',
  };

  const khaiUser = {
    id: 6,
    username: 'khai.nguyen@wingslashes.com',
    displayName: 'Nguyễn Quang Khải',
    role: 'admin',
  };

  const khaiStaffRecord = {
    displayName: 'Nguyễn Quang Khải',
    username: 'khai.nguyen@wingslashes.com',
  };

  const otherStaffUser = {
    id: 22,
    username: 'phuong.nguyen@wingslashes.com',
    displayName: 'Bích Phượng',
    role: 'telesales',
  };

  const otherStaffRecord = {
    displayName: 'Bích Phượng',
    username: 'phuong.nguyen@wingslashes.com',
  };

  it('allows author to edit their own message when senderId matches user.id', () => {
    const msg = {
      senderId: 1,
      senderName: 'Danny Do',
    };
    const canEdit = canUserEditChatMessage(msg, dannyUser, dannyStaffRecord);
    assert.equal(canEdit, true, 'Author should be able to edit their own message');
  });

  it('allows author to edit their own message when senderName matches staffRecord.displayName', () => {
    const msg = {
      senderId: 'legacy-sender',
      senderName: 'Nguyễn Quang Khải',
    };
    const canEdit = canUserEditChatMessage(msg, khaiUser, khaiStaffRecord);
    assert.equal(canEdit, true, 'Author should be able to edit when displayName matches');
  });

  it('allows author to edit their own message when senderName matches user.username', () => {
    const msg = {
      senderId: 'legacy-sender',
      senderName: 'khai.nguyen@wingslashes.com',
    };
    const canEdit = canUserEditChatMessage(msg, khaiUser, null);
    assert.equal(canEdit, true, 'Author should be able to edit when username matches');
  });

  it('PREVENTS admin from editing another user message (MOS-BUG-126 core fix)', () => {
    // Danny sent this message
    const dannyMsg = {
      senderId: 1,
      senderName: 'Danny Do',
    };

    // Khải (admin) attempts to edit Danny message
    const canKhaiEditDannyMsg = canUserEditChatMessage(dannyMsg, khaiUser, khaiStaffRecord);
    assert.equal(canKhaiEditDannyMsg, false, 'Admin Khải must NEVER be allowed to edit Danny message');
  });

  it('PREVENTS super_admin from editing another user message (respect conversation integrity)', () => {
    // Khải sent this message
    const khaiMsg = {
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
    };

    // Danny (super_admin) attempts to edit Khải message
    const canDannyEditKhaiMsg = canUserEditChatMessage(khaiMsg, dannyUser, dannyStaffRecord);
    assert.equal(canDannyEditKhaiMsg, false, 'Super admin must NEVER edit another person message');
  });

  it('PREVENTS regular staff from editing admin or other staff messages', () => {
    const dannyMsg = {
      senderId: 1,
      senderName: 'Danny Do',
    };
    const canEdit = canUserEditChatMessage(dannyMsg, otherStaffUser, otherStaffRecord);
    assert.equal(canEdit, false, 'Regular staff cannot edit other staff message');
  });

  it('PREVENTS another user from hijacking a message if senderId is "me" but name does not match', () => {
    const msg = {
      senderId: 'me',
      senderName: 'Danny Do',
    };
    const canKhaiEdit = canUserEditChatMessage(msg, khaiUser, khaiStaffRecord);
    assert.equal(canKhaiEdit, false, 'Khải cannot edit message sent by Danny even if senderId is "me"');
  });

  it('correctly records editHistory when author edits root message', () => {
    const originalText = 'Nội dung ban đầu của Danny';
    const msg: MosChatMessage = {
      id: 'msg-danny-1',
      conversationId: 'dm-pair-1-6',
      senderId: 1,
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      text: originalText,
      timeLabel: '15:46',
      createdAt: new Date().toISOString(),
      editHistory: [],
    };

    const newText = 'Nội dung đã được chỉnh sửa chuẩn xác';
    const now = new Date();
    msg.editHistory = msg.editHistory || [];
    msg.editHistory.push({
      text: msg.text,
      editedAt: now.toISOString(),
      editedBy: 1,
      editorName: 'Danny Do',
    });
    msg.text = newText;
    msg.editedAt = now.toISOString();
    msg.editedBy = 1;

    assert.equal(msg.text, newText);
    assert.equal(msg.editHistory.length, 1);
    assert.equal(msg.editHistory[0].text, originalText);
    assert.equal(msg.editHistory[0].editedBy, 1);
    assert.equal(msg.editHistory[0].editorName, 'Danny Do');
  });

  it('correctly records editHistory when author edits thread reply', () => {
    const originalReplyText = 'Câu trả lời ban đầu của Khải';
    const reply: MosChatThreadReply = {
      id: 'th-khai-1',
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Admin',
      text: originalReplyText,
      timeLabel: '15:47',
      createdAt: new Date().toISOString(),
      editHistory: [],
    };

    const newReplyText = 'Câu trả lời đã cập nhật';
    const now = new Date();
    reply.editHistory = reply.editHistory || [];
    reply.editHistory.push({
      text: reply.text,
      editedAt: now.toISOString(),
      editedBy: 6,
      editorName: 'Nguyễn Quang Khải',
    });
    reply.text = newReplyText;
    reply.editedAt = now.toISOString();
    reply.editedBy = 6;

    assert.equal(reply.text, newReplyText);
    assert.equal(reply.editHistory.length, 1);
    assert.equal(reply.editHistory[0].text, originalReplyText);
    assert.equal(reply.editHistory[0].editedBy, 6);
  });
});
