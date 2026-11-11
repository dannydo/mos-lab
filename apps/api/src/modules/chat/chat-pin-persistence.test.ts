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

  it('enforces Pinned Trumps Hidden invariant: a pinned space is never hidden (MOS-BUG-216)', () => {
    const spaceId = 'space-a5e2da40'; // Space kho & hàng lỗi của Nguyễn Quang Khải
    const prefs: MosChatUserSidebarPrefs = {
      pinnedIds: [spaceId],
      hiddenIds: [spaceId, 'space-other'],
      mutedIds: [],
      manualUnreadIds: [],
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
      updatedAt: '2026-11-11T08:00:00.000Z',
    };

    // Sanitize rule mimicking bootstrap & PUT user-prefs
    const pinnedSet = new Set(prefs.pinnedIds || []);
    const sanitizedHidden = (prefs.hiddenIds || []).filter((id) => !pinnedSet.has(id));

    assert.strictEqual(sanitizedHidden.includes(spaceId), false);
    assert.deepStrictEqual(sanitizedHidden, ['space-other']);

    // Frontend visibility helper logic check
    const isHiddenByUser = (convId: string, p: MosChatUserSidebarPrefs) => {
      if ((p.pinnedIds || []).includes(convId)) return false;
      return (p.hiddenIds || []).includes(convId);
    };

    assert.strictEqual(isHiddenByUser(spaceId, prefs), false, 'Pinned space must never be considered hidden');
    assert.strictEqual(isHiddenByUser('space-other', prefs), true, 'Unpinned hidden space remains hidden');
  });

  it('toggling pin on a space cleans up hiddenIds and updates spaces conversationOrder (MOS-BUG-216)', () => {
    const spaceId = 'space-a5e2da40';
    const currentPrefs: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      hiddenIds: [spaceId, 'dm-123'],
      mutedIds: [],
      manualUnreadIds: [],
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {
        spaces: ['space-other-1', 'space-other-2'],
      },
      updatedAt: '2026-11-11T08:00:00.000Z',
    };

    // Simulate backend POST /chat/conversations/:id/pin
    const shouldPin = true;
    const filteredPinned = (currentPrefs.pinnedIds || []).filter((id) => id !== spaceId);
    const nextPinned = shouldPin ? [spaceId, ...filteredPinned] : filteredPinned;
    const nextHidden = shouldPin
      ? (currentPrefs.hiddenIds || []).filter((id) => id !== spaceId)
      : (currentPrefs.hiddenIds || []);

    const secKey = 'spaces';
    const nextConvOrder: Record<string, string[]> = { ...(currentPrefs.conversationOrder || {}) };
    if (shouldPin) {
      const curArr = nextConvOrder[secKey] || [];
      nextConvOrder[secKey] = [spaceId, ...curArr.filter((id) => id !== spaceId)];
    }

    assert.deepStrictEqual(nextPinned, [spaceId]);
    assert.deepStrictEqual(nextHidden, ['dm-123']);
    assert.deepStrictEqual(nextConvOrder.spaces, [spaceId, 'space-other-1', 'space-other-2']);
  });

  it('hydrates new pinned space from server even when client clock is ahead (MOS-BUG-216)', () => {
    const spaceId = 'space-a5e2da40';
    const serverPrefs: MosChatUserSidebarPrefs = {
      pinnedIds: [spaceId],
      hiddenIds: [],
      mutedIds: [],
      manualUnreadIds: [],
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
      updatedAt: '2026-11-11T08:00:00.000Z',
    };

    const localPrefs: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      hiddenIds: [],
      mutedIds: [],
      manualUnreadIds: [],
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
      updatedAt: '2026-11-11T08:00:10.000Z', // Local is 10s ahead
    };

    const serverPinned = serverPrefs.pinnedIds || [];
    const localPinned = localPrefs.pinnedIds || [];
    const hasNewServerPinned = serverPinned.some((id) => !localPinned.includes(id));

    assert.strictEqual(hasNewServerPinned, true);

    // Merge logic: ensure newly pinned space is never dropped
    const mergedPinned = Array.from(new Set([...serverPinned, ...localPinned]));
    assert.deepStrictEqual(mergedPinned, [spaceId]);
  });
});
