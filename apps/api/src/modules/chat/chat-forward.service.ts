import crypto from 'node:crypto';
import type {
  MosChatConversation,
  MosChatCustomerCard,
  MosChatForwardedMetadata,
  MosChatImageAttachment,
  MosChatMessage,
  MosChatThreadReply,
} from '@mos-lab/shared';
import { formatTimeLabel } from './chat-format.service.js';

export interface ChatForwardActorInfo {
  id: number | string;
  name: string;
  roleLabel: string;
  roleColor: string;
  avatar: string;
}

export function resolveForwardedSourceLabel(sourceConv: MosChatConversation): string {
  if (sourceConv.type === 'space') {
    const rawName = String(sourceConv.name || sourceConv.id || 'space').trim();
    return rawName.startsWith('#') ? rawName : `#${rawName}`;
  }
  const convIdStr = String(sourceConv.id || '');
  if (sourceConv.isSelf || convIdStr.startsWith('dm-self-')) {
    return 'Ghi chú cá nhân';
  }
  return 'Tin nhắn riêng (DM)';
}

export function cloneChatAttachmentsForForward(
  attachments?: MosChatImageAttachment[]
): MosChatImageAttachment[] | undefined {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return undefined;
  }
  return attachments.map((att) => ({
    ...att,
    id: `att-fwd-${crypto.randomUUID().slice(0, 8)}`,
  }));
}

export function cloneCustomerCardForForward(card?: MosChatCustomerCard | null): MosChatCustomerCard | null {
  if (!card) return null;
  return { ...card };
}

export function buildForwardedChatMessage(params: {
  sourceConv: MosChatConversation;
  sourceMsg: MosChatMessage;
  sourceReply?: MosChatThreadReply | null;
  includeThread: boolean;
  targetConversationId: string;
  forwarder: ChatForwardActorInfo;
  note?: string | null;
  now?: Date;
}): {
  message: MosChatMessage;
  forwardedThreadCount: number;
} {
  const { sourceConv, sourceMsg, sourceReply, includeThread, targetConversationId, forwarder, note } = params;
  const now = params.now || new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const trimmedNote = note ? String(note).trim() : '';

  const sourceLabel = resolveForwardedSourceLabel(sourceConv);
  const newRootId = `msg-fwd-${crypto.randomUUID().slice(0, 8)}`;

  // Case A: Forward a single reply inside a subthread -> standalone root message in target
  if (sourceReply) {
    const clonedAttachments = cloneChatAttachmentsForForward(sourceReply.attachments);
    const clonedCustomerCard = cloneCustomerCardForForward(sourceReply.customerCard);
    const forwardedFrom: MosChatForwardedMetadata = {
      sourceConversationId: sourceConv.id,
      sourceConversationName: sourceLabel,
      sourceConversationType: sourceConv.type,
      sourceMessageId: sourceMsg.id,
      sourceReplyId: sourceReply.id,
      originalSenderId: sourceReply.senderId,
      originalSenderName: sourceReply.senderName,
      originalSenderRole: sourceReply.senderRole,
      originalSenderAvatar: sourceReply.senderAvatar ?? null,
      originalCreatedAt: sourceReply.createdAt,
      originalTimeLabel: sourceReply.timeLabel,
      forwardedByStaffId: forwarder.id,
      forwardedByName: forwarder.name,
      forwardedAt: nowIso,
      forwardedThreadCount: 0,
      note: trimmedNote || null,
    };

    const fallbackText =
      sourceReply.text ||
      (clonedCustomerCard?.name
        ? `Đính kèm hồ sơ ${clonedCustomerCard.name}`
        : clonedAttachments && clonedAttachments.length > 0
          ? ''
          : '');

    const forwardedMessage: MosChatMessage = {
      id: newRootId,
      conversationId: targetConversationId,
      senderId: forwarder.id,
      senderName: forwarder.name,
      senderRole: forwarder.roleLabel,
      senderAvatar: forwarder.avatar,
      roleColor: forwarder.roleColor,
      text: fallbackText,
      timeLabel: formatTimeLabel(now),
      createdAt: nowIso,
      reactions: {},
      reactionUsers: {},
      pinned: false,
      customerCard: clonedCustomerCard,
      attachments: clonedAttachments,
      thread: [],
      taskId: null,
      missionId: null,
      missionKey: null,
      mission: null,
      workflowInstanceId: null,
      workflow: null,
      isBuzzed: false,
      buzzCount: 0,
      buzzHistory: [],
      isAiBot: sourceReply.isAiBot || undefined,
      aiThinking: sourceReply.aiThinking ?? null,
      forwardedFrom,
    };

    return {
      message: forwardedMessage,
      forwardedThreadCount: 0,
    };
  }

  // Case B: Forward a root message (with optional full subthread)
  const clonedRootAttachments = cloneChatAttachmentsForForward(sourceMsg.attachments);
  const clonedRootCustomerCard = cloneCustomerCardForForward(sourceMsg.customerCard);

  const activeReplies = includeThread
    ? [...(sourceMsg.thread || [])]
        .filter((r) => !r.isDeleted)
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    : [];

  const clonedThread: MosChatThreadReply[] = activeReplies.map((r, idx) => {
    const rawCreatedMs = new Date(r.createdAt || 0).getTime();
    const safeCreatedAt =
      Number.isFinite(rawCreatedMs) && rawCreatedMs <= nowMs
        ? r.createdAt
        : new Date(nowMs - Math.max(1, activeReplies.length - idx)).toISOString();

    const replyMeta: MosChatForwardedMetadata = {
      sourceConversationId: sourceConv.id,
      sourceConversationName: sourceLabel,
      sourceConversationType: sourceConv.type,
      sourceMessageId: sourceMsg.id,
      sourceReplyId: r.id,
      originalSenderId: r.senderId,
      originalSenderName: r.senderName,
      originalSenderRole: r.senderRole,
      originalSenderAvatar: r.senderAvatar ?? null,
      originalCreatedAt: r.createdAt,
      originalTimeLabel: r.timeLabel,
      forwardedByStaffId: forwarder.id,
      forwardedByName: forwarder.name,
      forwardedAt: nowIso,
    };

    return {
      id: `th-fwd-${crypto.randomUUID().slice(0, 8)}`,
      senderId: r.senderId,
      senderName: r.senderName,
      senderRole: r.senderRole,
      senderAvatar: r.senderAvatar ?? null,
      roleColor: r.roleColor,
      text: r.text || '',
      timeLabel: r.timeLabel,
      createdAt: safeCreatedAt,
      attachments: cloneChatAttachmentsForForward(r.attachments),
      customerCard: cloneCustomerCardForForward(r.customerCard),
      isAiBot: r.isAiBot || undefined,
      aiThinking: r.aiThinking ?? null,
      reactions: {},
      reactionUsers: {},
      isBuzzed: false,
      buzzCount: 0,
      buzzHistory: [],
      missionId: null,
      isMissionMilestone: false,
      syncedCommentId: null,
      editHistory: undefined,
      forwardedFrom: replyMeta,
    };
  });

  const rootForwardedFrom: MosChatForwardedMetadata = {
    sourceConversationId: sourceConv.id,
    sourceConversationName: sourceLabel,
    sourceConversationType: sourceConv.type,
    sourceMessageId: sourceMsg.id,
    sourceReplyId: null,
    originalSenderId: sourceMsg.senderId,
    originalSenderName: sourceMsg.senderName,
    originalSenderRole: sourceMsg.senderRole,
    originalSenderAvatar: sourceMsg.senderAvatar ?? null,
    originalCreatedAt: sourceMsg.createdAt,
    originalTimeLabel: sourceMsg.timeLabel,
    forwardedByStaffId: forwarder.id,
    forwardedByName: forwarder.name,
    forwardedAt: nowIso,
    forwardedThreadCount: clonedThread.length,
    note: trimmedNote || null,
  };

  const rootFallbackText =
    sourceMsg.text ||
    (clonedRootCustomerCard?.name
      ? `Đính kèm hồ sơ ${clonedRootCustomerCard.name}`
      : clonedRootAttachments && clonedRootAttachments.length > 0
        ? ''
        : '');

  const forwardedMessage: MosChatMessage = {
    id: newRootId,
    conversationId: targetConversationId,
    senderId: forwarder.id,
    senderName: forwarder.name,
    senderRole: forwarder.roleLabel,
    senderAvatar: forwarder.avatar,
    roleColor: forwarder.roleColor,
    text: rootFallbackText,
    timeLabel: formatTimeLabel(now),
    createdAt: nowIso,
    reactions: {},
    reactionUsers: {},
    pinned: false,
    customerCard: clonedRootCustomerCard,
    attachments: clonedRootAttachments,
    thread: clonedThread,
    taskId: null,
    missionId: null,
    missionKey: null,
    mission: null,
    workflowInstanceId: null,
    workflow: null,
    isBuzzed: false,
    buzzCount: 0,
    buzzHistory: [],
    isAiBot: sourceMsg.isAiBot || undefined,
    aiThinking: sourceMsg.aiThinking ?? null,
    forwardedFrom: rootForwardedFrom,
  };

  return {
    message: forwardedMessage,
    forwardedThreadCount: clonedThread.length,
  };
}
