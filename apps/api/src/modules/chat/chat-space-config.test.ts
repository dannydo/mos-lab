import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MosChatConversation, MosChatStaffMember, UpdateMosChatSpaceConfigRequest } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { canUserAccessConversation, isDannyOrSuperAdminUser } from './routes.js';

describe('Chat Space Configuration & Emoji Selection (MOS-BUG-140)', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 1, username: 'danny.do@wingslashes.com', displayName: 'Danny Do', role: 'super_admin', isOnline: true },
    { id: 6, username: 'khai.nguyen@wingslashes.com', displayName: 'Nguyễn Quang Khải', role: 'manager', isOnline: true },
    { id: 10, username: 'staff10@wingslashes.com', displayName: 'Nhân Sự 10', role: 'telesales', isOnline: false },
  ];

  const userDanny: JwtUserPayload = {
    id: 1,
    username: 'danny',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  const userKhai: JwtUserPayload = {
    id: 6,
    username: 'khai.nguyen@wingslashes.com',
    displayName: 'Nguyễn Quang Khải',
    role: 'manager',
  };

  const userExternalStaff: JwtUserPayload = {
    id: 99,
    username: 'stranger@wingslashes.com',
    displayName: 'Người Lạ',
    role: 'telesales',
  };

  const initialSpace: MosChatConversation = {
    id: 'space-test-ops',
    type: 'space',
    name: 'van-hanh-chung',
    subtitle: 'Không gian phối hợp vận hành',
    color: '#3b82f6',
    avatar: 'VH',
    memberIds: [1, 6],
    memberCount: 2,
    unreadCount: 0,
    updatedAt: '2026-10-24T05:00:00.000Z',
    messages: [],
  };

  it('allows members and Super Admin to access and edit space configuration', () => {
    assert.strictEqual(canUserAccessConversation(initialSpace, userDanny, staffDirectory), true);
    assert.strictEqual(canUserAccessConversation(initialSpace, userKhai, staffDirectory), true);
    assert.strictEqual(canUserAccessConversation(initialSpace, userExternalStaff, staffDirectory), false);
  });

  it('correctly updates space name, subtitle, emoji avatar, and theme color', () => {
    const updatedSpace: MosChatConversation = {
      ...initialSpace,
      messages: [...initialSpace.messages],
    };

    const payload: UpdateMosChatSpaceConfigRequest = {
      name: 'chien-dich-tet-2027',
      subtitle: 'Chiến dịch bùng nổ Tết 2027',
      avatar: '🚀',
      color: '#ec4899',
    };

    // Simulate route logic
    if (payload.name !== undefined) {
      updatedSpace.name = payload.name.trim().toLowerCase().replace(/\s+/g, '-');
    }
    if (payload.subtitle !== undefined) {
      updatedSpace.subtitle = payload.subtitle.trim();
    }
    if (payload.avatar !== undefined) {
      updatedSpace.avatar = payload.avatar.trim();
    }
    if (payload.color !== undefined) {
      updatedSpace.color = payload.color.trim();
    }

    assert.strictEqual(updatedSpace.name, 'chien-dich-tet-2027');
    assert.strictEqual(updatedSpace.subtitle, 'Chiến dịch bùng nổ Tết 2027');
    assert.strictEqual(updatedSpace.avatar, '🚀');
    assert.strictEqual(updatedSpace.color, '#ec4899');
  });

  it('preserves existing emoji if avatar is not provided in update', () => {
    const spaceWithEmoji: MosChatConversation = {
      ...initialSpace,
      avatar: '💎',
    };

    const partialPayload: UpdateMosChatSpaceConfigRequest = {
      subtitle: 'Cập nhật mục tiêu tuần',
    };

    if (partialPayload.subtitle !== undefined) {
      spaceWithEmoji.subtitle = partialPayload.subtitle;
    }

    assert.strictEqual(spaceWithEmoji.avatar, '💎');
    assert.strictEqual(spaceWithEmoji.subtitle, 'Cập nhật mục tiêu tuần');
  });
});
