import assert from 'node:assert/strict';
import test from 'node:test';
import type { MosChatConversation, MosChatMessage, MosChatStaffMember, MosChatUserSidebarPrefs } from '@mos-lab/shared';
import { formatConversationForUser } from './chat-format.service.js';
import { buildDefaultUserSidebarPrefs } from './chat-state-defaults.js';

const staffDirectory: MosChatStaffMember[] = [
  { id: 1, username: 'danny', displayName: 'Danny Do', role: 'super_admin' },
  { id: 6, username: 'khai', displayName: 'Quang Khai', role: 'admin' },
];

function buildMessages(count: number): MosChatMessage[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `msg-${idx + 1}`,
    conversationId: 'space-core-team',
    senderId: idx % 2 === 0 ? 1 : 6,
    senderName: idx % 2 === 0 ? 'Danny Do' : 'Quang Khai',
    senderRole: idx % 2 === 0 ? 'Super Admin' : 'Admin',
    text: `Message ${idx + 1}`,
    timeLabel: '10:00',
    createdAt: new Date(Date.UTC(2026, 10, 20, 1, idx, 0)).toISOString(),
    thread:
      idx === 2
        ? [
            {
              id: 'th-old-unread',
              senderId: 6,
              senderName: 'Quang Khai',
              senderRole: 'Admin',
              text: '@Danny Do check thread',
              timeLabel: '10:02',
              createdAt: '2026-11-20T01:02:30.000Z',
            },
          ]
        : [],
  }));
}

test('formatConversationForUser slices tail messages when messageLimit > 0 while preserving full unread and receipt counts', () => {
  const conv: MosChatConversation = {
    id: 'space-core-team',
    type: 'space',
    name: 'Core Team',
    color: '#1a73e8',
    memberIds: [1, 6],
    unreadCount: 0,
    updatedAt: '2026-11-20T02:00:00.000Z',
    messages: buildMessages(45),
  };

  const userPrefs: MosChatUserSidebarPrefs = {
    ...buildDefaultUserSidebarPrefs(),
    readMessageCountByConv: { 'space-core-team': 40 },
    updatedAt: '2026-11-20T01:50:00.000Z',
  };

  const windowed = formatConversationForUser(
    conv,
    { id: 1, username: 'danny', role: 'super_admin' } as never,
    staffDirectory,
    userPrefs,
    { staff_1: userPrefs },
    { messageLimit: 30 }
  );

  assert.equal(windowed.messages.length, 30);
  assert.equal(windowed.totalMessageCount, 45);
  assert.equal(windowed.hasMoreMessages, true);
  assert.equal(windowed.oldestLoadedMessageId, 'msg-16');
  assert.equal(windowed.messages[0].id, 'msg-16');
  assert.equal(windowed.messages[29].id, 'msg-45');
  assert.equal(windowed.unreadCount, 2); // msg-42 and msg-44 from Khai after readCount=40
  assert.equal(windowed.unreadThreadCount, 1); // preserved from skipped msg-3 thread
  const dannyReceipt = windowed.readReceipts?.find((r) => r.staffId === 1);
  assert.equal(dannyReceipt?.readCount, 45); // Danny authored msg-45

  const full = formatConversationForUser(
    conv,
    { id: 1, username: 'danny', role: 'super_admin' } as never,
    staffDirectory,
    userPrefs,
    { staff_1: userPrefs },
    { messageLimit: 0 }
  );
  assert.equal(full.messages.length, 45);
  assert.equal(full.hasMoreMessages, false);
  assert.equal(full.totalMessageCount, 45);
  assert.equal(full.oldestLoadedMessageId, 'msg-1');
});
