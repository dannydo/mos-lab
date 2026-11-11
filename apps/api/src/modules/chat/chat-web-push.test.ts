import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it, beforeEach, afterEach } from 'node:test';
import type { MosChatConversation, MosChatStaffMember, MosChatUserSidebarPrefs } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import {
  buildChatPushBodyPreview,
  clearWebPushCacheForTests,
  dispatchChatMessageWebPush,
  registerStaffPushSubscription,
  resolveDirectAndMentionPushTargets,
  getStaffPushSubscriptionCount,
} from './chat-web-push.service.js';

function createFakeApplePushDevice(deviceLabel: string) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const p256dh = ecdh.getPublicKey().toString('base64url');
  const auth = crypto.randomBytes(16).toString('base64url');
  return {
    endpoint: `https://web.push.apple.com/apns-${deviceLabel}`,
    expirationTime: null,
    keys: { p256dh, auth },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
  };
}

describe('mOS Chat Native iOS / Desktop Web Push — Direct Messages & @Mentions', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 1, username: 'danny.do@wingslashes.com', displayName: 'Danny Do', role: 'super_admin' },
    { id: 4, username: 'tam.nguyen@wingslashes.com', displayName: 'Tâm Nguyễn', role: 'admin' },
    {
      id: 6,
      username: 'khai.nguyen@wingslashes.com',
      displayName: 'Nguyễn Quang Khải',
      role: 'admin',
      legacyStaffId: 45103,
    },
    {
      id: 43,
      username: 'user45103@wingslashes.com',
      displayName: 'Nguyễn Quang Khải',
      role: 'admin',
      legacyStaffId: 45103,
    },
    { id: 88, username: 'minhtam@wingslashes.com', displayName: 'Lê Minh Tâm', role: 'cc' },
    { id: 105, username: 'ha.telesale@wingslashes.com', displayName: 'Hà Booker', role: 'telesales' },
  ];

  const userDanny: JwtUserPayload = {
    id: 1,
    username: 'danny.do@wingslashes.com',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  beforeEach(() => {
    clearWebPushCacheForTests();
  });

  afterEach(() => {
    clearWebPushCacheForTests();
  });

  it('dispatches encrypted Web Push to iOS APNs for 1-1 Direct Messages (including dual-account resolution & thread deep-link)', async () => {
    // Khải registered his iPhone PWA under Google Workspace account id=6, while DM is paired with Legacy id=43
    const iphoneSub = createFakeApplePushDevice('iphone-khai-6');
    await registerStaffPushSubscription(undefined, '6', iphoneSub);
    // Sender Danny also has a device registered — must NEVER receive self-push
    await registerStaffPushSubscription(undefined, '1', createFakeApplePushDevice('iphone-danny-1'));

    const deliveredEndpoints: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      deliveredEndpoints.push(String(input));
      return new Response('', { status: 201 });
    };

    const nowIso = new Date().toISOString();
    const dmConv: MosChatConversation = {
      id: 'dm-pair-1-43',
      type: 'dm',
      name: 'Nguyễn Quang Khải',
      color: '#4285f4',
      participantStaffId: 43,
      memberIds: [1, 43],
      unreadCount: 1,
      updatedAt: nowIso,
      messages: [],
    };

    // Even if Khải has global mode NOTHING, 1-1 DMs always pass through (DM Invariant)
    const userPrefsByUserKey: Record<string, Partial<MosChatUserSidebarPrefs>> = {
      staff_6: {
        pinnedIds: [],
        mutedIds: [],
        manualUnreadIds: [],
        notificationMode: 'NOTHING',
      },
    };

    const rootRes = await dispatchChatMessageWebPush(undefined, {
      conv: dmConv,
      senderUser: userDanny,
      senderName: 'Danny Do',
      messageId: 'msg-dm-101',
      text: '**Khải ơi** kiểm tra đơn [KH-99](https://lab.masteros.app) giúp anh nhé!',
      staffDirectory,
      userPrefsByUserKey,
      fetchImpl: fakeFetch,
    });

    assert.equal(rootRes.dmSent, 1);
    assert.equal(rootRes.mentionSent, 0);
    assert.equal(rootRes.failed, 0);
    assert.deepEqual(deliveredEndpoints, [iphoneSub.endpoint]);

    // Thread reply inside DM also triggers CHAT_DM push
    deliveredEndpoints.length = 0;
    const threadRes = await dispatchChatMessageWebPush(undefined, {
      conv: dmConv,
      senderUser: userDanny,
      senderName: 'Danny Do',
      messageId: 'th-dm-202',
      threadRootMessageId: 'msg-dm-101',
      text: 'Anh gửi thêm ảnh chụp màn hình nhé',
      attachmentCount: 1,
      staffDirectory,
      userPrefsByUserKey,
      fetchImpl: fakeFetch,
    });

    assert.equal(threadRes.dmSent, 1);
    assert.deepEqual(deliveredEndpoints, [iphoneSub.endpoint]);
  });

  it('never sends Web Push for self-chat (dm-self) or muted conversations', () => {
    const nowIso = new Date().toISOString();
    const selfConv: MosChatConversation = {
      id: 'dm-self-1',
      type: 'dm',
      isSelf: true,
      name: 'Ghi chú cá nhân',
      color: '#6366f1',
      participantStaffId: 1,
      memberIds: [1],
      unreadCount: 0,
      updatedAt: nowIso,
      messages: [],
    };

    const selfTargets = resolveDirectAndMentionPushTargets({
      conv: selfConv,
      senderUser: userDanny,
      text: 'Ghi chú riêng',
      staffDirectory,
    });
    assert.deepEqual(selfTargets.dmRecipientIds, []);

    const mutedDm: MosChatConversation = {
      id: 'dm-pair-1-4',
      type: 'dm',
      name: 'Tâm Nguyễn',
      color: '#10b981',
      memberIds: [1, 4],
      unreadCount: 1,
      updatedAt: nowIso,
      messages: [],
    };
    const mutedTargets = resolveDirectAndMentionPushTargets({
      conv: mutedDm,
      senderUser: userDanny,
      text: 'Alo Tâm',
      staffDirectory,
      userPrefsByUserKey: {
        staff_4: {
          pinnedIds: [],
          mutedIds: ['dm-pair-1-4'],
          manualUnreadIds: [],
        },
      },
    });
    assert.deepEqual(mutedTargets.dmRecipientIds, []);
  });

  it('disambiguates @Tâm Nguyễn vs Lê Minh Tâm, supports 1-char Space nickname @K, and enforces Zero-Trust private Space membership', () => {
    const privateSpace: MosChatConversation = {
      id: 'space-core-team',
      type: 'space',
      name: '#Core Team',
      color: '#f59e0b',
      // Only Danny (1), Tâm Nguyễn (4), Khải (43), and Lê Minh Tâm (88) are in this private Space; Hà Booker (105) is NOT!
      memberIds: [1, 4, 43, 88],
      memberNicknames: {
        '43': 'K',
      },
      unreadCount: 1,
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    // 1. '@Tâm Nguyễn' must ONLY notify Tâm Nguyễn (4), NOT Lê Minh Tâm (88); '@K' notifies Khải (both dual accounts 6 & 43);
    //    '@Hà Booker' must be blocked because 105 is NOT a member of this private Space!
    const targets = resolveDirectAndMentionPushTargets({
      conv: privateSpace,
      senderUser: userDanny,
      text: 'Nhờ @Tâm Nguyễn và @K phối hợp đơn này nhé (cc @Hà Booker)',
      staffDirectory,
    });

    assert.equal(targets.dmRecipientIds.length, 0);
    assert.equal(targets.personalMentionRecipientIds.includes('4'), true, 'Tâm Nguyễn must receive push');
    assert.equal(
      targets.personalMentionRecipientIds.includes('88'),
      false,
      'Lê Minh Tâm must NOT falsely match @Tâm Nguyễn'
    );
    assert.equal(
      targets.personalMentionRecipientIds.includes('6'),
      true,
      'Khải Workspace account must receive @K push'
    );
    assert.equal(targets.personalMentionRecipientIds.includes('43'), true, 'Khải Legacy account must receive @K push');
    assert.equal(
      targets.personalMentionRecipientIds.includes('105'),
      false,
      'Non-member Hà Booker must NOT receive private Space push'
    );
    assert.equal(targets.personalMentionRecipientIds.includes('1'), false, 'Sender Danny must NOT self-notify');
  });

  it('supports @all in Space while respecting channel MUTED override and avoiding duplicate personal+@all pushes', () => {
    const spaceConv: MosChatConversation = {
      id: 'space-ops',
      type: 'space',
      name: 'Vận Hành Sảnh',
      color: '#3b82f6',
      memberIds: [1, 4, 43, 88],
      unreadCount: 1,
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    const targets = resolveDirectAndMentionPushTargets({
      conv: spaceConv,
      senderUser: userDanny,
      text: '@all họp gấp 5 phút nhé, riêng @Tâm Nguyễn chuẩn bị số liệu!',
      staffDirectory,
      userPrefsByUserKey: {
        staff_88: {
          pinnedIds: [],
          mutedIds: [],
          manualUnreadIds: [],
          channelNotificationOverrides: {
            'space-ops': 'MUTED',
          },
        },
      },
    });

    // Tâm Nguyễn (4) is in personalMentionRecipientIds, NOT duplicated in atAllMentionRecipientIds
    assert.deepEqual(targets.personalMentionRecipientIds, ['4']);
    // Khải (6 & 43) receives @all; Lê Minh Tâm (88) muted space-ops so excluded from @all; Hà Booker (105) is non-member
    assert.equal(targets.atAllMentionRecipientIds.includes('6'), true);
    assert.equal(targets.atAllMentionRecipientIds.includes('43'), true);
    assert.equal(targets.atAllMentionRecipientIds.includes('4'), false);
    assert.equal(targets.atAllMentionRecipientIds.includes('88'), false);
    assert.equal(targets.atAllMentionRecipientIds.includes('105'), false);
  });

  it('deduplicates shared device endpoints and auto-removes expired 410 APNs subscriptions', async () => {
    const sharedIphoneSub = createFakeApplePushDevice('shared-iphone-khai');
    await registerStaffPushSubscription(undefined, '6', sharedIphoneSub);
    await registerStaffPushSubscription(undefined, '43', sharedIphoneSub);

    const expiredSub = createFakeApplePushDevice('expired-ipad-tam');
    await registerStaffPushSubscription(undefined, '4', expiredSub);

    let callCount = 0;
    const fakeFetch: typeof fetch = async (input) => {
      callCount++;
      if (String(input).includes('expired-ipad-tam')) {
        return new Response('Gone', { status: 410 });
      }
      return new Response('', { status: 201 });
    };

    const spaceConv: MosChatConversation = {
      id: 'space-core',
      type: 'space',
      name: 'Core',
      color: '#10b981',
      memberIds: [1, 4, 6, 43],
      unreadCount: 1,
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    const res = await dispatchChatMessageWebPush(undefined, {
      conv: spaceConv,
      senderUser: userDanny,
      senderName: 'Danny Do',
      messageId: 'msg-dedup-1',
      text: 'Ping @Nguyễn Quang Khải và @Tâm Nguyễn',
      staffDirectory,
      fetchImpl: fakeFetch,
    });

    // Even though both '6' and '43' matched Khải, sharedIphoneSub is only called ONCE (+ 1 call for Tâm's expired iPad = 2 total)
    assert.equal(callCount, 2);
    assert.equal(res.mentionSent, 1);
    assert.equal(res.failed, 1);
    assert.equal(await getStaffPushSubscriptionCount(undefined, '4'), 0, '410 Gone subscription must be pruned');
  });

  it('formats clean lock-screen preview text for markdown, customer cards, and image attachments', () => {
    assert.equal(
      buildChatPushBodyPreview({
        text: '**Khẩn:** Mở hồ sơ [Chị Lan](https://lab.masteros.app/c/1) lúc `14:30`',
      }),
      'Khẩn: Mở hồ sơ Chị Lan lúc 14:30'
    );

    assert.equal(
      buildChatPushBodyPreview({ text: '', customerCardName: 'Nguyễn Thị Lan' }),
      '📋 Đính kèm hồ sơ khách hàng Nguyễn Thị Lan'
    );

    assert.equal(buildChatPushBodyPreview({ text: '', attachmentCount: 3 }), '📎 Đã gửi 3 tệp / hình ảnh đính kèm');
  });
});
