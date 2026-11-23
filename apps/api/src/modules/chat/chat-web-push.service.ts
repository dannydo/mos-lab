import type { FastifyInstance } from 'fastify';
import type {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatStaffMember,
  MosChatUserSidebarPrefs,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import {
  createVapidJwtToken,
  encryptWebPushAes128Gcm,
  generateVapidKeyPair,
  type StoredVapidKeyPair,
} from './web-push/web-push-crypto.js';
import {
  clearWebPushCacheForTests,
  getOrCreateVapidKeys,
  getStaffPushSubscriptionCount,
  registerStaffPushSubscription,
  sendWebPushToStaffIds,
  unregisterStaffPushSubscription,
  type StoredStaffPushSubscription,
} from './web-push/web-push-store.js';
import {
  buildChatPushBodyPreview,
  findDualAccountPeerIds,
  resolveDirectAndMentionPushTargets,
  type DirectAndMentionPushTargets,
} from './web-push/web-push-targeting.js';

export {
  buildChatPushBodyPreview,
  clearWebPushCacheForTests,
  createVapidJwtToken,
  encryptWebPushAes128Gcm,
  findDualAccountPeerIds,
  generateVapidKeyPair,
  getOrCreateVapidKeys,
  getStaffPushSubscriptionCount,
  registerStaffPushSubscription,
  resolveDirectAndMentionPushTargets,
  sendWebPushToStaffIds,
  unregisterStaffPushSubscription,
  type DirectAndMentionPushTargets,
  type StoredStaffPushSubscription,
  type StoredVapidKeyPair,
};

/**
 * Dispatches Native Web Push notifications (iOS PWA & Desktop) for incoming 1-1 Direct Messages and @Mentions.
 */
export async function dispatchChatMessageWebPush(
  fastify: FastifyInstance | undefined,
  params: {
    conv: MosChatConversation;
    senderUser?: JwtUserPayload;
    senderStaffId?: number;
    senderName: string;
    messageId: string;
    threadRootMessageId?: string;
    text?: string | null;
    customerCardName?: string | null;
    attachmentCount?: number;
    staffDirectory: MosChatStaffMember[];
    accessConfig?: MosChatAccessConfig;
    userPrefsByUserKey?: Record<string, Partial<MosChatUserSidebarPrefs>>;
    fetchImpl?: typeof fetch;
  }
): Promise<{ dmSent: number; mentionSent: number; failed: number }> {
  const targets = resolveDirectAndMentionPushTargets({
    conv: params.conv,
    senderUser: params.senderUser,
    senderStaffId: params.senderStaffId,
    text: params.text,
    staffDirectory: params.staffDirectory,
    accessConfig: params.accessConfig,
    userPrefsByUserKey: params.userPrefsByUserKey,
  });

  if (
    targets.dmRecipientIds.length === 0 &&
    targets.personalMentionRecipientIds.length === 0 &&
    targets.atAllMentionRecipientIds.length === 0
  ) {
    return { dmSent: 0, mentionSent: 0, failed: 0 };
  }

  const preview = buildChatPushBodyPreview({
    text: params.text,
    customerCardName: params.customerCardName,
    attachmentCount: params.attachmentCount,
  });

  const targetUrl = params.threadRootMessageId
    ? `/chat?convId=${encodeURIComponent(params.conv.id)}&msgId=${encodeURIComponent(params.messageId)}&threadId=${encodeURIComponent(params.threadRootMessageId)}`
    : `/chat?convId=${encodeURIComponent(params.conv.id)}&msgId=${encodeURIComponent(params.messageId)}`;

  const spaceLabel =
    String(params.conv.name || 'Nhóm')
      .replace(/^#+\s*/, '')
      .trim() || 'Nhóm';

  let dmSent = 0;
  let mentionSent = 0;
  let failed = 0;

  if (targets.dmRecipientIds.length > 0) {
    const res = await sendWebPushToStaffIds(
      fastify,
      targets.dmRecipientIds,
      {
        title: params.threadRootMessageId ? `💬 ${params.senderName} (phản hồi luồng)` : `💬 ${params.senderName}`,
        body: preview,
        icon: '/apple-touch-icon.png',
        badge: '/icon-192.png',
        tag: `mos-chat-dm-${params.messageId}`,
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: {
          type: 'CHAT_DM',
          conversationId: params.conv.id,
          messageId: params.messageId,
          ...(params.threadRootMessageId ? { threadRootMessageId: params.threadRootMessageId } : {}),
          url: targetUrl,
        },
      },
      { fetchImpl: params.fetchImpl }
    );
    dmSent += res.sent;
    failed += res.failed;
  }

  if (targets.personalMentionRecipientIds.length > 0) {
    const res = await sendWebPushToStaffIds(
      fastify,
      targets.personalMentionRecipientIds,
      {
        title: `📣 ${params.senderName} nhắc bạn trong #${spaceLabel}`,
        body: preview,
        icon: '/apple-touch-icon.png',
        badge: '/icon-192.png',
        tag: `mos-chat-mention-${params.messageId}`,
        renotify: true,
        requireInteraction: false,
        vibrate: [220, 100, 220],
        data: {
          type: 'CHAT_MENTION',
          conversationId: params.conv.id,
          messageId: params.messageId,
          ...(params.threadRootMessageId ? { threadRootMessageId: params.threadRootMessageId } : {}),
          url: targetUrl,
        },
      },
      { fetchImpl: params.fetchImpl }
    );
    mentionSent += res.sent;
    failed += res.failed;
  }

  if (targets.atAllMentionRecipientIds.length > 0) {
    const res = await sendWebPushToStaffIds(
      fastify,
      targets.atAllMentionRecipientIds,
      {
        title: `📣 ${params.senderName} nhắc cả nhóm #${spaceLabel}`,
        body: preview,
        icon: '/apple-touch-icon.png',
        badge: '/icon-192.png',
        tag: `mos-chat-mention-${params.messageId}`,
        renotify: true,
        requireInteraction: false,
        vibrate: [220, 100, 220],
        data: {
          type: 'CHAT_MENTION',
          conversationId: params.conv.id,
          messageId: params.messageId,
          ...(params.threadRootMessageId ? { threadRootMessageId: params.threadRootMessageId } : {}),
          url: targetUrl,
        },
      },
      { fetchImpl: params.fetchImpl }
    );
    mentionSent += res.sent;
    failed += res.failed;
  }

  return { dmSent, mentionSent, failed };
}
