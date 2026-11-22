'use client';

import React, { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  MosChatConversation,
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatMessage,
  MosChatQuotedMessage,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import { formatStickerToken, type MosChatStickerItem } from '../mos-chat-stickers';
import { convertAttachmentToDataUrl } from '../shared/utils/convertAttachmentToDataUrl';
import {
  buildOptimisticChatMessage,
  buildOptimisticThreadReply,
  buildThreadAiContextPayload,
  dispatchPrivateAiMessage,
  dispatchRoomOrThreadAiMention,
} from '../utils/portal-ai-message-helpers';

export interface UsePortalMessageSendingParams {
  currentUser?: SafeAny;
  isStrictDannySuperAdmin: boolean;
  canUseAiCopilot: boolean;
  activeConversation?: MosChatConversation;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  aiSessionId: string | null;
  setAiSessionId: (id: string | null) => void;
  setAiSessionOwnerId: (id: number | null) => void;
  aiSessionReadOnlyRef: React.MutableRefObject<boolean>;
  aiMessages: MosChatMessage[];
  setAiMessages: React.Dispatch<React.SetStateAction<MosChatMessage[]>>;
  setAiThinkingActive: (active: boolean) => void;
  composerTextRef: React.MutableRefObject<string>;
  updateComposerText: (val: string) => void;
  threadTextRef: React.MutableRefObject<string>;
  threadInputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  updateThreadInput: (val: string) => void;
  lastSentRef: React.MutableRefObject<{ text: string; time: number }>;
  stagedAttachments: MosChatImageAttachment[];
  setStagedAttachments: React.Dispatch<React.SetStateAction<MosChatImageAttachment[]>>;
  threadAttachments: MosChatImageAttachment[];
  setThreadAttachments: React.Dispatch<React.SetStateAction<MosChatImageAttachment[]>>;
  replyingToMessage: MosChatMessage | null;
  setReplyingToMessage: React.Dispatch<React.SetStateAction<MosChatMessage | null>>;
  activeThreadMsgId: string | null;
  setActiveThreadMsgId: (id: string | null) => void;
  activeThreadMessage: MosChatMessage | null;
  isUrgentSend: boolean;
  setIsUrgentSend: React.Dispatch<React.SetStateAction<boolean>>;
  closeMentionDropdown: () => void;
  dockedConvIds: string[];
  setInitialWorkflowCode: (code: string) => void;
  setTriggerWorkflowModalOpen: (open: boolean) => void;
  setSaveThreadWorkflowModalOpen: (open: boolean) => void;
  handleBuzzMessage: (msgId: string, replyId?: string) => Promise<void>;
  fetchBootstrap: (forceFull?: boolean) => Promise<void>;
  notifyLivePeers: () => void;
  scrollToChatBottom: (target?: 'main' | 'thread' | { dockConvId: string }, behavior?: ScrollBehavior) => void;
  cleanQuotedText: (txt?: string | null) => string;
  antdMessage: MessageInstance;
}

export function usePortalMessageSending({
  currentUser,
  isStrictDannySuperAdmin,
  canUseAiCopilot,
  activeConversation,
  setConversations,
  aiSessionId,
  setAiSessionId,
  setAiSessionOwnerId,
  aiSessionReadOnlyRef,
  aiMessages,
  setAiMessages,
  setAiThinkingActive,
  composerTextRef,
  updateComposerText,
  threadTextRef,
  threadInputRef,
  updateThreadInput,
  lastSentRef,
  stagedAttachments,
  setStagedAttachments,
  threadAttachments,
  setThreadAttachments,
  replyingToMessage,
  setReplyingToMessage,
  activeThreadMsgId,
  setActiveThreadMsgId,
  activeThreadMessage,
  isUrgentSend,
  setIsUrgentSend,
  closeMentionDropdown,
  dockedConvIds,
  setInitialWorkflowCode,
  setTriggerWorkflowModalOpen,
  setSaveThreadWorkflowModalOpen,
  handleBuzzMessage,
  fetchBootstrap,
  notifyLivePeers,
  scrollToChatBottom,
  cleanQuotedText,
  antdMessage,
}: UsePortalMessageSendingParams) {
  const [stagedCustomerCard, setStagedCustomerCard] = useState<MosChatCustomerCard | null>(null);
  const [threadStagedCustomerCard, setThreadStagedCustomerCard] = useState<MosChatCustomerCard | null>(null);
  const [isUrgentSendThread, setIsUrgentSendThread] = useState<boolean>(false);
  const [customerPickerTarget, setCustomerPickerTarget] = useState<'main' | 'thread'>('main');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [openStickerPopoverKey, setOpenStickerPopoverKey] = useState<string | null>(null);

  const handleOpenCustomerPicker = useCallback((scope: 'main' | 'thread' = 'main') => {
    setCustomerPickerTarget(scope);
    setCustomerPickerOpen(true);
  }, []);

  const handleSendMessage = async (
    targetConvId: string,
    rawText: string,
    customerCard?: MosChatCustomerCard | null,
    attachments?: MosChatImageAttachment[],
    replyToId?: string | null,
    replyTo?: MosChatQuotedMessage | null
  ) => {
    const text = rawText.trim();
    const cleanAttachments = attachments && attachments.length > 0 ? attachments : undefined;
    if (!text && !customerCard && !cleanAttachments) return;

    const now = Date.now();
    if (
      !customerCard &&
      !cleanAttachments &&
      now - lastSentRef.current.time < 1200 &&
      (lastSentRef.current.text === text || lastSentRef.current.text.endsWith(` ${text}`))
    ) {
      return;
    }
    lastSentRef.current = { text, time: now };

    const senderName = currentUser?.displayName || currentUser?.username || 'Danny Do';
    const optimisticMsg = buildOptimisticChatMessage({
      now,
      targetConvId,
      senderId: currentUser?.id || 'me',
      senderName,
      text,
      customerCard,
      attachments: cleanAttachments,
      replyToId,
      replyTo,
    });

    if (targetConvId === AI_COPILOT_CONV_ID) {
      if (aiSessionReadOnlyRef.current) {
        antdMessage.info(
          'Đây là phiên hội thoại của người khác (chỉ xem). Bấm "Làm mới hội thoại MAI" để bắt đầu phiên của bạn.'
        );
        return;
      }
      setAiMessages((prev) => [...prev, optimisticMsg]);
      setAiThinkingActive(true);
      scrollToChatBottom('main', 'smooth');
      try {
        const result = await dispatchPrivateAiMessage({
          text,
          customerCard,
          cleanAttachments,
          senderName,
          myRole: currentUser?.role || 'super_admin',
          aiSessionId,
        });
        if (result.sessionId) {
          setAiSessionId(result.sessionId);
          setAiSessionOwnerId(null);
        }
        setAiMessages((prev) => [...prev, result.message]);
      } finally {
        setAiThinkingActive(false);
      }
      return;
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === targetConvId ? { ...c, messages: [...c.messages, optimisticMsg] } : c))
    );
    if (activeConversation?.id === targetConvId) {
      scrollToChatBottom('main', 'smooth');
    }
    if (dockedConvIds.includes(targetConvId)) {
      scrollToChatBottom({ dockConvId: targetConvId }, 'smooth');
    }

    let sentMessage: MosChatMessage = optimisticMsg;
    try {
      const res = await apiClient.chat.sendMessage({
        conversationId: targetConvId,
        text: optimisticMsg.text,
        customerCard: customerCard || null,
        attachments: cleanAttachments,
        replyToId: replyToId || null,
        replyTo: replyTo || null,
      });
      if (res?.message) {
        sentMessage = res.message;
      }
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === targetConvId ? res.conversation : c)));
      }
      notifyLivePeers();
    } catch {
      // ignore
    }

    if (canUseAiCopilot && /(?:^|\s)@\s*mai\b/i.test(text)) {
      const cleanedPrompt = text.replace(/(?:^|\s)@\s*mai\b/gi, '').trim() || 'Hãy phân tích nội dung trên giúp nhóm.';
      setAiThinkingActive(true);
      try {
        await dispatchRoomOrThreadAiMention({
          message: cleanedPrompt,
          scope: `mos-chat-space:${targetConvId}`,
          senderName,
          myRole: currentUser?.role || 'super_admin',
          firstAttachment: cleanAttachments?.[0],
          aiSessionId,
          isReadOnly: aiSessionReadOnlyRef.current,
          setAiSessionId,
        });
        await fetchBootstrap(true);
        notifyLivePeers();
        scrollToChatBottom('main', 'smooth');
      } catch {
        // ignore space AI error
      } finally {
        setAiThinkingActive(false);
      }
    }
    return sentMessage;
  };

  const handleSendMain = async () => {
    if (!activeConversation) return;
    const text = composerTextRef.current;
    const attachmentsToSend = stagedAttachments;
    const cardToSend = stagedCustomerCard;
    if (!text.trim() && attachmentsToSend.length === 0 && !cardToSend) return;

    const trimmedCmd = text.trim().toLowerCase();
    if (isStrictDannySuperAdmin && attachmentsToSend.length === 0 && !cardToSend) {
      if (trimmedCmd === '/tam-ung' || trimmedCmd.startsWith('/tam-ung ')) {
        updateComposerText('');
        setInitialWorkflowCode('WF_CASH_ADVANCE');
        setTriggerWorkflowModalOpen(true);
        return;
      }
      if (trimmedCmd === '/kiem-kho' || trimmedCmd.startsWith('/kiem-kho ')) {
        updateComposerText('');
        setInitialWorkflowCode('WF_INVENTORY_AUDIT');
        setTriggerWorkflowModalOpen(true);
        return;
      }
      if (trimmedCmd === '/tao-quy-trinh' || trimmedCmd === '/workflow') {
        updateComposerText('');
        setSaveThreadWorkflowModalOpen(true);
        return;
      }
    }

    const wasUrgent = isUrgentSend;
    if (wasUrgent) {
      setIsUrgentSend(false);
    }

    const replyMeta = replyingToMessage
      ? {
          id: replyingToMessage.id,
          senderId: replyingToMessage.senderId,
          senderName: replyingToMessage.senderName,
          senderAvatar: replyingToMessage.senderAvatar,
          text: cleanQuotedText(replyingToMessage.text),
        }
      : null;
    const replyToId = replyingToMessage?.id || null;
    setReplyingToMessage(null);

    closeMentionDropdown();
    updateComposerText('');
    setStagedAttachments([]);
    setStagedCustomerCard(null);
    const sent = await handleSendMessage(
      activeConversation.id,
      text,
      cardToSend,
      attachmentsToSend,
      replyToId,
      replyMeta
    );
    if (wasUrgent && sent?.id) {
      void handleBuzzMessage(sent.id);
    }
  };

  const handleSendThreadReply = async (
    replyTextOverride?: string,
    cardOverride?: MosChatCustomerCard | null,
    targetMsgIdOverride?: string
  ) => {
    const text = (typeof replyTextOverride === 'string' ? replyTextOverride : threadTextRef.current).trim();
    const cardToSend = cardOverride !== undefined ? cardOverride : threadStagedCustomerCard;
    const attachmentsToSend = threadAttachments;
    const targetMsgId = targetMsgIdOverride || activeThreadMessage?.id || activeThreadMsgId;

    if ((!text && attachmentsToSend.length === 0 && !cardToSend) || !activeConversation || !targetMsgId) return;

    if (activeThreadMsgId !== targetMsgId) {
      setActiveThreadMsgId(targetMsgId);
    }

    const wasUrgent = isUrgentSendThread;
    if (wasUrgent) {
      setIsUrgentSendThread(false);
    }
    closeMentionDropdown();
    updateThreadInput('');
    setThreadAttachments([]);
    setThreadStagedCustomerCard(null);
    if (threadInputRef.current) {
      threadInputRef.current.value = '';
      threadInputRef.current.style.height = 'auto';
    }

    const senderName = currentUser?.displayName || currentUser?.username || 'Danny Do';
    const newReply = buildOptimisticThreadReply({
      senderId: currentUser?.id || 'me',
      senderName,
      text,
      attachments: attachmentsToSend,
      customerCard: cardToSend,
      wasUrgent,
    });

    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      if (aiSessionReadOnlyRef.current) {
        antdMessage.info(
          'Đây là phiên hội thoại của người khác (chỉ xem). Bấm "Làm mới hội thoại MAI" để bắt đầu phiên của bạn.'
        );
        return;
      }
      setAiMessages((prev) =>
        prev.map((m) =>
          m.id === targetMsgId ? { ...m, unreadThreadReplyCount: 0, thread: [...(m.thread || []), newReply] } : m
        )
      );
      scrollToChatBottom('thread', 'smooth');

      if (canUseAiCopilot) {
        setAiThinkingActive(true);
        try {
          const contextPayload = buildThreadAiContextPayload({
            headerLabel: '[Bối cảnh Luồng thảo luận (Thread) với mOS AI]:',
            rootMsg: aiMessages.find((m) => m.id === targetMsgId),
            senderName,
            queryText: text,
          });
          const imageDataUrl = await convertAttachmentToDataUrl(attachmentsToSend?.[0]);
          const aiRes = await apiClient.ai.sendMessage({
            sessionId: aiSessionId || undefined,
            message: contextPayload,
            scope: `mos-chat-private-thread:${targetMsgId}`,
            imageDataUrl,
            context: {
              page: `mos-chat-private-thread:${targetMsgId}`,
              userName: senderName,
              myRole: currentUser?.role || 'super_admin',
            },
          });
          if (aiRes?.session?.id) {
            setAiSessionId(aiRes.session.id);
          }
          const botReply: MosChatThreadReply = {
            id: aiRes?.message?.id || `th-ai-${Date.now()}`,
            senderId: 'wings-ai-copilot',
            senderName: '🤖 MAI',
            senderRole: 'mOS AI',
            senderAvatar: 'MAI',
            roleColor: '#8b5cf6',
            text: (aiRes?.message?.content || 'MAI đã ghi nhận phản hồi trong luồng của bạn.')
              .replace(/<action[\s\S]*?<\/action>/gi, '')
              .replace(/<\/?action[^>]*>/gi, '')
              .trim(),
            isAiBot: true,
            timeLabel: dayjs().format('HH:mm'),
            createdAt: new Date().toISOString(),
          };
          setAiMessages((prev) =>
            prev.map((m) => (m.id === targetMsgId ? { ...m, thread: [...(m.thread || []), botReply] } : m))
          );
          scrollToChatBottom('thread', 'smooth');
        } catch {
          // ignore private thread AI error
        } finally {
          setAiThinkingActive(false);
        }
      }
      return;
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === targetMsgId ? { ...m, unreadThreadReplyCount: 0, thread: [...(m.thread || []), newReply] } : m
          ),
        };
      })
    );
    scrollToChatBottom('thread', 'smooth');

    try {
      const res = await apiClient.chat.sendThreadReply({
        conversationId: activeConversation.id,
        messageId: targetMsgId,
        text: text || (cardToSend ? `Đính kèm thẻ khách hàng ${cardToSend.name}:` : ''),
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
        customerCard: cardToSend || undefined,
      });
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === activeConversation.id ? res.conversation! : c)));
      } else if (res?.reply) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversation.id) return c;
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== targetMsgId) return m;
                const existing = m.thread || [];
                const updatedThread = existing.map((r) => (r.id === newReply.id ? res.reply! : r));
                if (!updatedThread.some((r) => r.id === res.reply?.id)) {
                  updatedThread.push(res.reply!);
                }
                return { ...m, thread: updatedThread };
              }),
            };
          })
        );
      }
      if (wasUrgent && res?.reply?.id) {
        void handleBuzzMessage(targetMsgId, res.reply.id);
      }
      notifyLivePeers();
    } catch (err: SafeAny) {
      const mentionsMai = canUseAiCopilot && /(?:^|\s)@\s*mai\b/i.test(text);
      const responseTimedOut = !err?.response;
      if (mentionsMai && responseTimedOut) {
        antdMessage.warning('Máy chủ phản hồi chậm, tin nhắn có thể đã được gửi. Vẫn tiếp tục gọi MAI...');
      } else {
        antdMessage.error(err?.message || 'Không thể gửi câu trả lời vào luồng. Vui lòng thử lại!');
        updateThreadInput(text);
        if (threadInputRef.current) {
          threadInputRef.current.value = text;
        }
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversation.id) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === targetMsgId ? { ...m, thread: (m.thread || []).filter((r) => r.id !== newReply.id) } : m
              ),
            };
          })
        );
        return;
      }
    }

    if (canUseAiCopilot && /(?:^|\s)@\s*mai\b/i.test(text)) {
      const cleanedPrompt =
        text.replace(/(?:^|\s)@\s*mai\b/gi, '').trim() || 'Hãy phân tích nội dung luồng thảo luận trên giúp nhóm.';
      setAiThinkingActive(true);
      try {
        const contextPayload = buildThreadAiContextPayload({
          headerLabel: `[Bối cảnh Luồng thảo luận (Thread) trong không gian "${activeConversation.name}"]:`,
          rootMsg: activeConversation.messages.find((m) => m.id === targetMsgId),
          senderName,
          queryText: cleanedPrompt,
        });
        await dispatchRoomOrThreadAiMention({
          message: contextPayload,
          scope: `mos-chat-thread:${activeConversation.id}:${targetMsgId}`,
          senderName,
          myRole: currentUser?.role || 'super_admin',
          firstAttachment: attachmentsToSend?.[0],
          aiSessionId,
          isReadOnly: aiSessionReadOnlyRef.current,
          setAiSessionId,
        });
        await fetchBootstrap(true);
        notifyLivePeers();
        scrollToChatBottom('thread', 'smooth');
      } catch {
        // ignore thread AI error
      } finally {
        setAiThinkingActive(false);
      }
    }
  };

  const handleSelectCustomerCard = async (card: MosChatCustomerCard, sendImmediately = false) => {
    if (customerPickerTarget === 'thread') {
      if (sendImmediately && activeConversation && activeThreadMsgId) {
        await handleSendThreadReply(`Lưu ý hỗ trợ chu đáo khách hàng ${card.name}:`, card);
        antdMessage.success(`Đã gửi thẻ khách hàng ${card.name} vào luồng`);
      } else {
        setThreadStagedCustomerCard(card);
        antdMessage.success(`Đã đính kèm thẻ khách hàng ${card.name} vào phản hồi luồng`);
      }
      setCustomerPickerOpen(false);
      return;
    }
    if (sendImmediately && activeConversation) {
      await handleSendMessage(activeConversation.id, `Lưu ý hỗ trợ chu đáo khách hàng ${card.name}:`, card);
      antdMessage.success(`Đã gửi thẻ khách hàng ${card.name}`);
    } else {
      setStagedCustomerCard(card);
      antdMessage.success(`Đã đính kèm thẻ khách hàng ${card.name} vào ô soạn thảo`);
    }
    setCustomerPickerOpen(false);
  };

  const openCustomerDetail = (customerId: number | string) => {
    const num = typeof customerId === 'number' ? customerId : parseInt(String(customerId), 10);
    if (!isNaN(num) && num > 0) {
      setSelectedCustomerId(num);
      setCustomerDrawerOpen(true);
    }
  };

  const handleSendQuickCustomerCard = async () => {
    setCustomerPickerOpen(true);
  };

  const handleSendSticker = async (
    sticker: MosChatStickerItem,
    target: 'main' | 'thread' | { dockConvId: string } = 'main'
  ) => {
    setOpenStickerPopoverKey(null);
    const tokenText = formatStickerToken(sticker.id);
    if (target === 'main') {
      if (!activeConversation) return;
      scrollToChatBottom('main', 'smooth');
      await handleSendMessage(activeConversation.id, tokenText, null, []);
      scrollToChatBottom('main', 'smooth');
      return;
    }
    if (typeof target === 'object' && target.dockConvId) {
      scrollToChatBottom({ dockConvId: target.dockConvId }, 'smooth');
      await handleSendMessage(target.dockConvId, tokenText, null, []);
      scrollToChatBottom({ dockConvId: target.dockConvId }, 'smooth');
      return;
    }
    if (target === 'thread') {
      if (!activeConversation || !activeThreadMsgId) return;
      const senderName = currentUser?.displayName || 'Danny Do';
      const newReply = {
        id: `th-${Date.now()}`,
        senderId: currentUser?.id || 'me',
        senderName,
        senderRole: 'Super Admin',
        senderAvatar: 'DD',
        text: tokenText,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversation.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === activeThreadMsgId
                ? { ...m, unreadThreadReplyCount: 0, thread: [...(m.thread || []), newReply] }
                : m
            ),
          };
        })
      );
      scrollToChatBottom('thread', 'smooth');
      try {
        const res = await apiClient.chat.sendThreadReply({
          conversationId: activeConversation.id,
          messageId: activeThreadMsgId,
          text: tokenText,
        });
        if (res?.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === activeConversation.id ? res.conversation! : c)));
        }
        scrollToChatBottom('thread', 'smooth');
        notifyLivePeers();
      } catch {
        // ignore
      }
    }
  };

  return {
    stagedCustomerCard,
    setStagedCustomerCard,
    threadStagedCustomerCard,
    setThreadStagedCustomerCard,
    isUrgentSendThread,
    setIsUrgentSendThread,
    customerPickerOpen,
    setCustomerPickerOpen,
    handleOpenCustomerPicker,
    customerDrawerOpen,
    setCustomerDrawerOpen,
    selectedCustomerId,
    setSelectedCustomerId,
    openStickerPopoverKey,
    setOpenStickerPopoverKey,
    handleSendMessage,
    handleSendMain,
    handleSelectCustomerCard,
    openCustomerDetail,
    handleSendQuickCustomerCard,
    handleSendThreadReply,
    handleSendSticker,
  };
}
