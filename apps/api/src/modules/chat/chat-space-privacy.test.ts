import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canUserAccessConversation,
  resolveConversationParticipantStaffIds,
  computeConversationReadReceipts,
  isDannyOrSuperAdminUser,
  filterTasksForUser,
} from './routes.js';
import type { MosChatConversation, MosChatStaffMember, MosChatTaskItem, MosChatUserSidebarPrefs } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';

describe('Chat Space Privacy & Read Receipts Isolation', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 1, username: 'danny.do@wingslashes.com', displayName: 'Danny Do', role: 'super_admin', isOnline: true },
    { id: 4, username: 'tam.nguyen@wingslashes.com', displayName: 'Tâm Nguyễn', role: 'admin', isOnline: true },
    { id: 14, username: 'nhan.vien.14@wingslashes.com', displayName: 'Nhân Viên 14', role: 'manager', isOnline: true },
    {
      id: 22,
      username: 'phuong.nguyen@wingslashes.com',
      displayName: 'Bích Phượng',
      role: 'telesales',
      isOnline: true,
    },
  ];

  const userDanny: JwtUserPayload = {
    id: 1,
    username: 'danny',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  const userTam: JwtUserPayload = {
    id: 4,
    username: 'tam.nguyen@wingslashes.com',
    displayName: 'Tâm Nguyễn',
    role: 'admin',
  };

  const userBichPhuong: JwtUserPayload = {
    id: 22,
    username: 'phuong.nguyen@wingslashes.com',
    displayName: 'Bích Phượng',
    role: 'telesales',
  };

  const coreTeamSpace: MosChatConversation = {
    id: 'space-core-team',
    type: 'space',
    name: 'core-team',
    subtitle: 'Nhóm nòng cốt phát triển hệ thống',
    roleTag: 'Core',
    color: '#3b82f6',
    avatar: 'CT',
    memberCount: 3,
    memberIds: [1, 4, 14],
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-welcome',
        conversationId: 'space-core-team',
        senderId: 1,
        senderName: 'Danny Do',
        senderRole: 'Super Admin',
        senderAvatar: 'D',
        roleColor: '#3b82f6',
        text: 'Chào mừng cả nhà đến với Core team!',
        timeLabel: '13:49',
        createdAt: '2026-10-20T06:49:00.000Z',
        reactions: {},
        thread: [],
      },
    ],
  };

  const publicGeneralSpace: MosChatConversation = {
    id: 'space-general',
    type: 'space',
    name: 'chung',
    subtitle: 'Kênh chung toàn bộ công ty',
    roleTag: 'All',
    color: '#10b981',
    avatar: 'CH',
    memberCount: 100,
    memberIds: [],
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  it('allows core team members to access core-team space', () => {
    assert.equal(canUserAccessConversation(coreTeamSpace, userDanny, staffDirectory), true);
    assert.equal(canUserAccessConversation(coreTeamSpace, userTam, staffDirectory), true);
  });

  it('strictly forbids non-members like Bích Phượng from accessing core-team space', () => {
    assert.equal(canUserAccessConversation(coreTeamSpace, userBichPhuong, staffDirectory), false);
  });

  it('allows all staff to access public spaces without memberIds restriction', () => {
    assert.equal(canUserAccessConversation(publicGeneralSpace, userDanny, staffDirectory), true);
    assert.equal(canUserAccessConversation(publicGeneralSpace, userTam, staffDirectory), true);
    assert.equal(canUserAccessConversation(publicGeneralSpace, userBichPhuong, staffDirectory), true);
  });

  it('excludes non-members from resolveConversationParticipantStaffIds even if they had read prefs', () => {
    const fakePrefs: Record<string, MosChatUserSidebarPrefs> = {
      staff_4: {
        pinnedIds: [],
        mutedIds: [],
        hiddenIds: [],
        manualUnreadIds: [],
        readMessageCountByConv: { 'space-core-team': 1 },
        collapsedSections: {},
        unreadOnlySections: {},
        sectionOrder: ['dm', 'spaces'],
        customSections: [],
        conversationOrder: {},
      },
      staff_22: {
        pinnedIds: [],
        mutedIds: [],
        hiddenIds: [],
        manualUnreadIds: [],
        readMessageCountByConv: { 'space-core-team': 1 },
        collapsedSections: {},
        unreadOnlySections: {},
        sectionOrder: ['dm', 'spaces'],
        customSections: [],
        conversationOrder: {},
      },
    };

    const participantIds = resolveConversationParticipantStaffIds(coreTeamSpace, staffDirectory, fakePrefs);
    assert.ok(participantIds.includes(1), 'Danny is member or sender');
    assert.ok(participantIds.includes(4), 'Tâm is member');
    assert.equal(
      participantIds.includes(22),
      false,
      'Bích Phượng (22) must NEVER be included in restricted space participants'
    );
  });

  it('never displays non-members in computeConversationReadReceipts for restricted spaces', () => {
    const fakePrefs: Record<string, MosChatUserSidebarPrefs> = {
      staff_4: {
        pinnedIds: [],
        mutedIds: [],
        hiddenIds: [],
        manualUnreadIds: [],
        readMessageCountByConv: { 'space-core-team': 1 },
        readAtByConv: { 'space-core-team': '2026-10-20T06:50:00.000Z' },
        collapsedSections: {},
        unreadOnlySections: {},
        sectionOrder: ['dm', 'spaces'],
        customSections: [],
        conversationOrder: {},
      },
      staff_22: {
        pinnedIds: [],
        mutedIds: [],
        hiddenIds: [],
        manualUnreadIds: [],
        readMessageCountByConv: { 'space-core-team': 1 },
        readAtByConv: { 'space-core-team': '2026-10-20T06:53:06.000Z' },
        collapsedSections: {},
        unreadOnlySections: {},
        sectionOrder: ['dm', 'spaces'],
        customSections: [],
        conversationOrder: {},
      },
    };

    const receipts = computeConversationReadReceipts(coreTeamSpace, staffDirectory, fakePrefs);
    const receiptStaffIds = receipts.map((r) => r.staffId);

    assert.ok(receiptStaffIds.includes(4), 'Tâm should have read receipt');
    assert.equal(receiptStaffIds.includes(22), false, 'Bích Phượng (22) must NOT appear in read receipts');
  });

  it('isolates tasks created in restricted spaces so non-members cannot see them (MOS-BUG-129)', () => {
    const tasks: MosChatTaskItem[] = [
      {
        id: 'task-core-1',
        conversationId: 'space-core-team',
        conversationName: 'core-team',
        title: 'Bảo mật kiến trúc mOS',
        assigneeName: 'Tâm Nguyễn',
        creatorName: 'Danny Do',
        priority: 'HIGH',
        remindAt: new Date().toISOString(),
        done: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-general-1',
        conversationId: 'space-general',
        conversationName: 'chung',
        title: 'Thông báo lịch nghỉ lễ toàn công ty',
        assigneeName: 'Bích Phượng',
        creatorName: 'Danny Do',
        priority: 'NORMAL',
        remindAt: new Date().toISOString(),
        done: false,
        createdAt: new Date().toISOString(),
      },
    ];

    const conversations = [coreTeamSpace, publicGeneralSpace];

    // Core team member (Tâm) sees both tasks
    const tamTasks = filterTasksForUser(tasks, conversations, userTam, staffDirectory);
    assert.equal(tamTasks.length, 2);
    assert.ok(tamTasks.some((t) => t.id === 'task-core-1'));
    assert.ok(tamTasks.some((t) => t.id === 'task-general-1'));

    // Non-member (Bích Phượng) ONLY sees public space tasks, NEVER core team tasks
    const phuongTasks = filterTasksForUser(tasks, conversations, userBichPhuong, staffDirectory);
    assert.equal(phuongTasks.length, 1);
    assert.equal(phuongTasks[0]?.id, 'task-general-1');
    assert.equal(phuongTasks.some((t) => t.id === 'task-core-1'), false);

    // Danny (Super Admin) sees all tasks
    const dannyTasks = filterTasksForUser(tasks, conversations, userDanny, staffDirectory);
    assert.equal(dannyTasks.length, 2);
  });
});
