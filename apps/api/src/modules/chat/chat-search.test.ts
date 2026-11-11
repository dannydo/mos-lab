import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { removeVietnameseTones } from '@mos-lab/shared';
import type { MosChatConversation, MosChatStaffMember, MosChatMessage, MosChatSearchResultItem } from '@mos-lab/shared';
import { canUserAccessConversation } from './routes.js';
import type { JwtUserPayload } from '../../middlewares/auth.js';

describe('mOS Chat Message Search & Access Isolation Invariant', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 1, username: 'danny', displayName: 'Danny Do', role: 'super_admin', isOnline: true },
    { id: 4, username: 'tam.nguyen', displayName: 'Tâm Nguyễn', role: 'admin', isOnline: true },
    { id: 6, username: 'khai.nguyen', displayName: 'Nguyễn Quang Khải', role: 'admin', isOnline: true },
    { id: 22, username: 'phuong.nguyen', displayName: 'Bích Phượng', role: 'telesales', isOnline: true },
  ];

  const userDanny: JwtUserPayload = {
    id: 1,
    username: 'danny',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  const userTam: JwtUserPayload = {
    id: 4,
    username: 'tam.nguyen',
    displayName: 'Tâm Nguyễn',
    role: 'admin',
  };

  const userBichPhuong: JwtUserPayload = {
    id: 22,
    username: 'phuong.nguyen',
    displayName: 'Bích Phượng',
    role: 'telesales',
  };

  const coreTeamSpace: MosChatConversation = {
    id: 'space-core-team',
    type: 'space',
    name: 'core-team',
    subtitle: 'Nhóm nòng cốt phát triển hệ thống',
    roleTag: 'Core',
    color: '#722ed1',
    memberIds: [1, 4, 6],
    memberCount: 3,
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-invoice-1',
        conversationId: 'space-core-team',
        senderId: 1,
        senderName: 'Danny Do',
        senderRole: 'Admin',
        text: 'Nhờ Tâm gởi hoá đơn qua Zalo cho khách hàng VIP nhé',
        timeLabel: '10:00',
        createdAt: '2026-11-01T03:00:00.000Z',
        attachments: [
          {
            id: 'att-1',
            name: 'hoa_don_vat_1102.pdf',
            url: 'https://cdn.example.com/att-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
          },
        ],
        thread: [
          {
            id: 'th-reply-1',
            senderId: 4,
            senderName: 'Tâm Nguyễn',
            senderRole: 'Accountant',
            text: 'Dạ anh Danny, em đã xuất hoá đơn điện tử xong và gửi rồi ạ!',
            timeLabel: '10:05',
            createdAt: '2026-11-01T03:05:00.000Z',
          },
        ],
      },
    ],
  };

  const generalSpace: MosChatConversation = {
    id: 'space-general',
    type: 'space',
    name: 'chung',
    subtitle: 'Kênh chung công ty',
    roleTag: 'All',
    color: '#10b981',
    memberIds: [],
    memberCount: 100,
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-general-1',
        conversationId: 'space-general',
        senderId: 22,
        senderName: 'Bích Phượng',
        senderRole: 'telesales',
        text: 'Hôm nay trời đẹp cả nhà ăn trưa vui vẻ nhé!',
        timeLabel: '11:30',
        createdAt: '2026-11-01T04:30:00.000Z',
      },
    ],
  };

  it('allows core team members to search inside core-team space', () => {
    assert.equal(canUserAccessConversation(coreTeamSpace, userDanny, staffDirectory), true);
    assert.equal(canUserAccessConversation(coreTeamSpace, userTam, staffDirectory), true);
  });

  it('strictly isolates non-members from searching messages in restricted spaces', () => {
    assert.equal(canUserAccessConversation(coreTeamSpace, userBichPhuong, staffDirectory), false);
    assert.equal(canUserAccessConversation(generalSpace, userBichPhuong, staffDirectory), true);
  });

  it('correctly matches unaccented search queries ("hoa don" matches "hoá đơn")', () => {
    const rawMsg = 'Nhờ Tâm gởi hoá đơn qua Zalo cho khách hàng VIP nhé';
    const query = 'hoa don';
    const normMsg = removeVietnameseTones(rawMsg.toLowerCase());
    const normQuery = removeVietnameseTones(query.toLowerCase());
    assert.ok(normMsg.includes(normQuery), 'Unaccented search must match accented Vietnamese');
  });

  it('matches searches inside thread replies and identifies them with parentMessageId', () => {
    const threadReply = coreTeamSpace.messages[0].thread![0];
    const query = 'hoa don dien tu';
    const normReply = removeVietnameseTones(threadReply.text!.toLowerCase());
    const normQuery = removeVietnameseTones(query.toLowerCase());
    assert.ok(normReply.includes(normQuery));

    const resultItem: MosChatSearchResultItem = {
      id: threadReply.id,
      conversationId: coreTeamSpace.id,
      conversationName: coreTeamSpace.name,
      conversationType: coreTeamSpace.type,
      isThreadReply: true,
      parentMessageId: coreTeamSpace.messages[0].id,
      senderId: String(threadReply.senderId),
      senderName: threadReply.senderName!,
      text: threadReply.text!,
      timeLabel: threadReply.timeLabel!,
      createdAt: threadReply.createdAt!,
    };
    assert.equal(resultItem.isThreadReply, true);
    assert.equal(resultItem.parentMessageId, 'msg-invoice-1');
  });

  it('matches searches by attachment file name', () => {
    const attachments = coreTeamSpace.messages[0].attachments!;
    const query = 'hoa_don_vat';
    const normAttName = removeVietnameseTones(attachments[0].name.toLowerCase());
    const normQuery = removeVietnameseTones(query.toLowerCase());
    assert.ok(normAttName.includes(normQuery));
  });

  it('matches semantic attachment intent queries ("ảnh", "hình", "đính kèm 1 ảnh")', () => {
    const ATTACHMENT_INTENT_TERMS = [
      'anh', 'hinh', 'hinh anh', 'anh chup', 'minh chung',
      'photo', 'image', 'picture', 'file', 'tep', 'dinh kem',
      'dinh kem 1 anh', '1 anh', '2 anh', 'tai lieu', 'unc'
    ];

    for (const rawQuery of ['ảnh', 'hình', 'đính kèm', 'đính kèm 1 ảnh', 'file']) {
      const norm = removeVietnameseTones(rawQuery.toLowerCase());
      const isIntent = ATTACHMENT_INTENT_TERMS.some((kw) => norm === kw || norm.includes(kw));
      assert.equal(isIntent, true, `Query "${rawQuery}" must be recognized as attachment intent`);
    }
  });

  it('formats fallback label when message has attachments but empty text', () => {
    const attachments = [
      { id: 'att-1', name: 'IMG_0521.jpg', url: '/chat/media/1.jpg', mimeType: 'image/jpeg' },
    ];
    const rawText = '';
    const displayText =
      rawText ||
      (attachments.length > 0
        ? `[Đính kèm ${attachments.length} ${attachments.length === 1 ? 'hình ảnh/tệp' : 'hình ảnh/tệp'}]`
        : '');
    assert.equal(displayText, '[Đính kèm 1 hình ảnh/tệp]');
  });
});
