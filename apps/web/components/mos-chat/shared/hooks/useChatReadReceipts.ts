'use client';

import { useCallback, useMemo } from 'react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatReadReceiptEntry,
  MosChatThreadReadReceiptEntry,
  MosChatThreadReply,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import {
  calculateStoppedReadersByMsgId,
  calculateStoppedReadersByReplyId,
  doesReceiptMatchAuthor,
  formatReadAtLabel,
  getMessageReadBreakdown as getMessageReadBreakdownHelper,
  getThreadReplyReadBreakdown as getThreadReplyReadBreakdownHelper,
} from '../../utils/chat-helpers';

export interface UseChatReadReceiptsParams {
  activeConversation: MosChatConversation | null | undefined;
  activeThreadMessage: MosChatMessage | null | undefined;
  currentUserId?: string | number | null;
}

export interface UseChatReadReceiptsReturn {
  formatReadAtLabel: typeof formatReadAtLabel;
  doesReceiptMatchAuthor: typeof doesReceiptMatchAuthor;
  getMessageReadBreakdown: (
    conv: MosChatConversation | null | undefined,
    msg: MosChatMessage
  ) => {
    seenBy: MosChatReadReceiptEntry[];
    unseenBy: MosChatReadReceiptEntry[];
  };
  getThreadReplyReadBreakdown: (
    parentMsg: MosChatMessage,
    reply: MosChatThreadReply
  ) => {
    seenBy: MosChatThreadReadReceiptEntry[];
    unseenBy: MosChatThreadReadReceiptEntry[];
  };
  getConversationThreadReplyReadBreakdown: (
    conv: MosChatConversation | null | undefined,
    parentMsg: MosChatMessage,
    reply: MosChatThreadReply
  ) => {
    seenBy: MosChatThreadReadReceiptEntry[];
    unseenBy: MosChatThreadReadReceiptEntry[];
  };
  stoppedReadersByMsgId: Record<string, MosChatReadReceiptEntry[]>;
  stoppedReadersByReplyId: Record<string, MosChatThreadReadReceiptEntry[]>;
}

/**
 * Shared headless hook for Desktop & Mobile read receipts (`✓` / `✓✓`, mini avatars, breakdown).
 * Delegates calculation logic to canonical helpers in `chat-helpers.ts`.
 */
export function useChatReadReceipts({
  activeConversation,
  activeThreadMessage,
  currentUserId,
}: UseChatReadReceiptsParams): UseChatReadReceiptsReturn {
  const normalizedUserId = currentUserId ?? undefined;

  const getMessageReadBreakdown = useCallback(
    (conv: MosChatConversation | null | undefined, msg: MosChatMessage) => {
      if (!conv || conv.id === AI_COPILOT_CONV_ID || conv.isSelf) {
        return { seenBy: [] as MosChatReadReceiptEntry[], unseenBy: [] as MosChatReadReceiptEntry[] };
      }
      return getMessageReadBreakdownHelper(conv, msg, normalizedUserId);
    },
    [normalizedUserId]
  );

  const getConversationThreadReplyReadBreakdown = useCallback(
    (conv: MosChatConversation | null | undefined, parentMsg: MosChatMessage, reply: MosChatThreadReply) => {
      if (!conv || conv.id === AI_COPILOT_CONV_ID || conv.isSelf) {
        return {
          seenBy: [] as MosChatThreadReadReceiptEntry[],
          unseenBy: [] as MosChatThreadReadReceiptEntry[],
        };
      }
      return getThreadReplyReadBreakdownHelper(conv, parentMsg, reply, normalizedUserId);
    },
    [normalizedUserId]
  );

  const getThreadReplyReadBreakdown = useCallback(
    (parentMsg: MosChatMessage, reply: MosChatThreadReply) => {
      return getConversationThreadReplyReadBreakdown(activeConversation, parentMsg, reply);
    },
    [activeConversation, getConversationThreadReplyReadBreakdown]
  );

  const stoppedReadersByMsgId = useMemo(() => {
    if (!activeConversation || activeConversation.id === AI_COPILOT_CONV_ID || activeConversation.isSelf) {
      return {} as Record<string, MosChatReadReceiptEntry[]>;
    }
    return calculateStoppedReadersByMsgId(activeConversation, normalizedUserId);
  }, [activeConversation, normalizedUserId]);

  const stoppedReadersByReplyId = useMemo(() => {
    if (
      !activeConversation ||
      activeConversation.id === AI_COPILOT_CONV_ID ||
      activeConversation.isSelf ||
      !activeThreadMessage
    ) {
      return {} as Record<string, MosChatThreadReadReceiptEntry[]>;
    }
    return calculateStoppedReadersByReplyId(activeThreadMessage, normalizedUserId, activeConversation.isSelf);
  }, [activeConversation, activeThreadMessage, normalizedUserId]);

  return {
    formatReadAtLabel,
    doesReceiptMatchAuthor,
    getMessageReadBreakdown,
    getThreadReplyReadBreakdown,
    getConversationThreadReplyReadBreakdown,
    stoppedReadersByMsgId,
    stoppedReadersByReplyId,
  };
}
