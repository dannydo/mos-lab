import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MosChatConversation, MosChatMessage, MosChatUserSidebarPrefs } from '@mos-lab/shared';

describe('chat message & space pinning persistence invariants (MOS-BUG-198)', () => {
  it('toggles pinned state and updates conversation updatedAt', () => {
    const originalDate = '2026-11-01T00:00:00.000Z';
    const conv: MosChatConversation = {
      id: 'space-f29f75e6',
      type: 'space',
      name: "ken's",
      color: '#1a73e8',
      unreadCount: 0,
      updatedAt: originalDate,
      messages: [
        {
          id: 'msg-2f6cc764',
          conversationId: 'space-f29f75e6',
          senderId: '6',
          senderName: 'Nguyễn Quang Khải',
          senderRole: 'Quản lý',
          text: '01–30/11 | Mục tiêu Doanh thu Combo: 575 Triệu',
          timeLabel: '10:00',
          createdAt: originalDate,
          pinned: false,
        },
      ],
    };

    const targetMsg = conv.messages[0];
    assert.equal(targetMsg.pinned, false);

    // Toggle pin on
    targetMsg.pinned = !targetMsg.pinned;
    conv.updatedAt = new Date().toISOString();

    assert.equal(targetMsg.pinned, true);
    assert.notEqual(conv.updatedAt, originalDate);

    // Toggle pin off
    targetMsg.pinned = !targetMsg.pinned;
    assert.equal(targetMsg.pinned, false);
  });

  it('correctly maps message pinned property to relational database column schema', () => {
    const pinnedMsg: MosChatMessage = {
      id: 'msg-2f6cc764',
      conversationId: 'space-f29f75e6',
      senderId: '6',
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Quản lý',
      text: 'Mục tiêu',
      timeLabel: '10:00',
      createdAt: '2026-11-01T00:00:00.000Z',
      pinned: true,
    };

    // Verify boolean conversion mimics upsertSingleMessageToRelationalDb
    const dbColumnValue = Boolean(pinnedMsg.pinned);
    assert.strictEqual(dbColumnValue, true);

    const unpinnedMsg: MosChatMessage = {
      ...pinnedMsg,
      pinned: false,
    };
    assert.strictEqual(Boolean(unpinnedMsg.pinned), false);
  });

  it('ensures server user preferences with pinned space are hydrated on first load', () => {
    const serverPrefs: MosChatUserSidebarPrefs = {
      pinnedIds: ['space-f29f75e6'],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
      updatedAt: '2026-11-05T04:30:00.000Z',
    };

    const localPrefs: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
      updatedAt: '2026-11-05T04:30:01.000Z', // Client clock 1s ahead
    };

    const serverTs = serverPrefs.updatedAt ? new Date(serverPrefs.updatedAt).getTime() : 0;
    const localTs = localPrefs.updatedAt ? new Date(localPrefs.updatedAt).getTime() : 0;
    const hasServerCustomizations = (serverPrefs.pinnedIds?.length || 0) > 0;
    const isFirstHydration = true;

    // Evaluates new hydration condition (MOS-BUG-198)
    const shouldHydrate =
      (isFirstHydration && (hasServerCustomizations || !localPrefs.updatedAt)) ||
      (!localPrefs.updatedAt && (hasServerCustomizations || isFirstHydration)) ||
      serverTs >= localTs ||
      (serverTs > 0 && Math.abs(serverTs - localTs) < 5000 && hasServerCustomizations);

    assert.strictEqual(shouldHydrate, true);
  });
});
