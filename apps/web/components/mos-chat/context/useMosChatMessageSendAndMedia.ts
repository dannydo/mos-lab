'use client';

import { useCallback } from 'react';
import dayjs from 'dayjs';
import { message as antdMessage } from 'antd';
import type {
  ForwardMosChatMessageRequest,
  ForwardMosChatMessageResponse,
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
import { formatBackendAiMessage } from '../utils/chat-helpers';
import { convertAttachmentToDataUrl } from '../shared/utils/convertAttachmentToDataUrl';

export interface UseMosChatMessageSendAndMediaParams {
  currentUser: SafeAny;
  effectiveUser: SafeAny;
  activeConvId: string;
  activeConversation: MosChatConversation | null;
  activeThreadMsg: MosChatMessage | null;
  allMessagesByConv: Record<string, MosChatMessage[]>;
  aiSessionId: string | null;
  lastVersionRef: React.MutableRefObject<number | undefined>;
  setAiSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setAiMessages: React.Dispatch<React.SetStateAction<MosChatMessage[]>>;
  setIsAiThinking: React.Dispatch<React.SetStateAction<boolean>>;
  setAllMessagesByConv: React.Dispatch<React.SetStateAction<Record<string, MosChatMessage[]>>>;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setActiveThreadMsg: React.Dispatch<React.SetStateAction<MosChatMessage | null>>;
  setReplyingToMessage: React.Dispatch<React.SetStateAction<MosChatMessage | null>>;
  fetchBootstrap: () => Promise<void>;
}

/**
 * Handles Context-layer outbound message flows: AI/room sending, subthread replies, forwarding, edits, and buzz.
 */
export function useMosChatMessageSendAndMedia({
  currentUser,
  effectiveUser,
  activeConvId,
  activeConversation,
  activeThreadMsg,
  allMessagesByConv,
  aiSessionId,
  lastVersionRef,
  setAiSessionId,
  setAiMessages,
  setIsAiThinking,
  setAllMessagesByConv,
  setConversations,
  setActiveThreadMsg,
  setReplyingToMessage,
  fetchBootstrap,
}: UseMosChatMessageSendAndMediaParams) {
  const sendMessage = useCallback(
    async (
      text: string,
      options?: {
        attachments?: MosChatImageAttachment[];
        customerCard?: MosChatCustomerCard | null;
        targetConvId?: string;
        replyToId?: string;
        replyTo?: MosChatQuotedMessage | null;
      }
    ): Promise<boolean> => {
      const targetId = options?.targetConvId || activeConvId;
      const trimmed = text.trim();
      if (!trimmed && (!options?.attachments || options.attachments.length === 0) && !options?.customerCard)
        return false;

      if (targetId === AI_COPILOT_CONV_ID) {
        const userMsg: MosChatMessage = {
          id: `msg-user-${Date.now()}`,
          conversationId: AI_COPILOT_CONV_ID,
          senderId: currentUser?.id || 'me',
          senderName: currentUser?.fullName || currentUser?.displayName || currentUser?.name || 'Tôi',
          senderRole: currentUser?.role || 'user',
          senderAvatar: currentUser?.avatarUrl,
          text: trimmed,
          timeLabel: dayjs().format('HH:mm'),
          createdAt: new Date().toISOString(),
          attachments: options?.attachments,
          reactions: {},
        };
        setAiMessages((prev) => [...prev, userMsg]);
        setIsAiThinking(true);

        try {
          const imageDataUrl = await convertAttachmentToDataUrl(options?.attachments?.[0]);
          const senderName = currentUser?.fullName || currentUser?.displayName || currentUser?.name || 'Tôi';
          const aiRes = await apiClient.ai.sendMessage({
            sessionId: aiSessionId || undefined,
            message: trimmed,
            scope: 'mos-chat-private',
            imageDataUrl,
            context: {
              page: 'mos-chat-private',
              userName: senderName,
              myRole: currentUser?.role || 'super_admin',
            },
          });

          if (aiRes?.session?.id) {
            setAiSessionId(aiRes.session.id);
          }

          const botMsg: MosChatMessage = aiRes?.message
            ? formatBackendAiMessage(aiRes.message, effectiveUser)
            : {
                id: `msg-ai-${Date.now()}`,
                conversationId: AI_COPILOT_CONV_ID,
                senderId: 'wings-ai-copilot',
                senderName: '🤖 MAI',
                senderRole: 'mOS AI',
                senderAvatar: 'MAI',
                roleColor: '#8b5cf6',
                isAiBot: true,
                text: 'MAI đã xử lý xong yêu cầu của bạn.',
                timeLabel: dayjs().format('HH:mm'),
                createdAt: new Date().toISOString(),
                reactions: {},
              };
          setAiMessages((prev) => [...prev, botMsg]);
        } catch {
          const errorMsg: MosChatMessage = {
            id: `msg-ai-err-${Date.now()}`,
            conversationId: AI_COPILOT_CONV_ID,
            senderId: 'wings-ai-copilot',
            senderName: '🤖 MAI',
            senderRole: 'mOS AI',
            senderAvatar: 'MAI',
            roleColor: '#8b5cf6',
            isAiBot: true,
            text: 'Rất tiếc, đã có lỗi kết nối đến máy chủ AI. Bạn vui lòng thử lại sau giây lát nhé.',
            timeLabel: dayjs().format('HH:mm'),
            createdAt: new Date().toISOString(),
            reactions: {},
          };
          setAiMessages((prev) => [...prev, errorMsg]);
        } finally {
          setIsAiThinking(false);
        }
        return true;
      }

      const tempId = `temp_${Date.now()}`;
      const effectiveText =
        trimmed || (options?.customerCard?.name ? `Đính kèm thẻ khách hàng ${options.customerCard.name}` : '');

      let resolvedReplyTo = options?.replyTo || null;
      if (options?.replyToId && !resolvedReplyTo) {
        const found = (allMessagesByConv[targetId] || []).find((m) => m.id === options.replyToId);
        if (found) {
          resolvedReplyTo = {
            id: found.id,
            senderId: found.senderId,
            senderName: found.senderName,
            senderAvatar: found.senderAvatar,
            text: found.text,
          };
        }
      }

      const optimisticMsg: MosChatMessage = {
        id: tempId,
        conversationId: targetId,
        senderId: currentUser?.id || 'me',
        senderName: currentUser?.fullName || currentUser?.name || 'Tôi',
        senderRole: currentUser?.role || 'user',
        senderAvatar: currentUser?.avatarUrl,
        text: effectiveText,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
        replyToId: options?.replyToId,
        replyTo: resolvedReplyTo || undefined,
        customerCard: options?.customerCard || null,
        attachments: options?.attachments,
        reactions: {},
        pinned: false,
      };

      setAllMessagesByConv((prev) => ({
        ...prev,
        [targetId]: [...(prev[targetId] || []), optimisticMsg],
      }));

      try {
        const res = await apiClient.chat.sendMessage({
          conversationId: targetId,
          text: effectiveText,
          customerCard: options?.customerCard || null,
          attachments: options?.attachments,
          replyToId: options?.replyToId,
          replyTo: resolvedReplyTo || undefined,
        });
        if (res && res.message) {
          setAllMessagesByConv((prev) => ({
            ...prev,
            [targetId]: (prev[targetId] || []).map((m) => (m.id === tempId ? res.message : m)),
          }));
        }
        setReplyingToMessage(null);

        if (/(?:^|\s)@\s*mai\b/i.test(trimmed)) {
          const cleanedPrompt =
            trimmed.replace(/(?:^|\s)@\s*mai\b/gi, '').trim() || 'Hãy phân tích nội dung trên giúp nhóm.';
          setIsAiThinking(true);
          void (async () => {
            try {
              const imageDataUrl = await convertAttachmentToDataUrl(options?.attachments?.[0]);
              await apiClient.ai.sendMessage({
                message: cleanedPrompt,
                scope: `mos-chat-space:${targetId}`,
                imageDataUrl,
                context: {
                  page: `mos-chat-space:${targetId}`,
                  userName: currentUser?.fullName || currentUser?.name || 'Tôi',
                  myRole: currentUser?.role || 'super_admin',
                },
              });
              await fetchBootstrap();
            } catch {
              // ignore
            } finally {
              setIsAiThinking(false);
            }
          })();
        }

        return true;
      } catch {
        return false;
      }
    },
    [
      activeConvId,
      aiSessionId,
      allMessagesByConv,
      currentUser,
      effectiveUser,
      fetchBootstrap,
      setAiMessages,
      setAiSessionId,
      setAllMessagesByConv,
      setIsAiThinking,
      setReplyingToMessage,
    ]
  );

  const sendThreadReply = useCallback(
    async (
      text: string,
      options?: { attachments?: MosChatImageAttachment[]; customerCard?: MosChatCustomerCard | null }
    ): Promise<boolean> => {
      if (!activeThreadMsg) return false;
      const trimmed = text.trim();
      const customerCard = options?.customerCard || undefined;
      const sendText = trimmed || (customerCard?.name ? `Đính kèm thẻ khách hàng ${customerCard.name}` : '');
      if (!sendText && (!options?.attachments || options.attachments.length === 0) && !customerCard) return false;

      const currentThreadMsg = activeThreadMsg;
      const targetConv = activeConversation;

      const tempReply: MosChatThreadReply = {
        id: `reply_${Date.now()}`,
        senderId: currentUser?.id || 'me',
        senderName: currentUser?.fullName || currentUser?.name || 'Tôi',
        senderRole: currentUser?.role || 'user',
        senderAvatar: currentUser?.avatarUrl,
        text: sendText,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
        attachments: options?.attachments,
        customerCard: customerCard || null,
        reactions: {},
      };

      setActiveThreadMsg((prev) => {
        if (!prev) return null;
        return { ...prev, thread: [...(prev.thread || []), tempReply] };
      });

      try {
        const res = await apiClient.chat.sendThreadReply({
          conversationId: activeConvId,
          messageId: currentThreadMsg.id,
          text: sendText,
          attachments: options?.attachments,
          customerCard: customerCard || undefined,
        });
        if (res && res.reply) {
          setActiveThreadMsg((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              thread: (prev.thread || []).map((r) => (r.id === tempReply.id ? res.reply : r)),
            };
          });
        }

        if (/(?:^|\s)@\s*mai\b/i.test(trimmed)) {
          const cleanedPrompt =
            trimmed.replace(/(?:^|\s)@\s*mai\b/gi, '').trim() ||
            'Hãy phân tích nội dung luồng thảo luận trên giúp nhóm.';
          const rootContent = currentThreadMsg
            ? `[Tin nhắn gốc từ ${currentThreadMsg.senderName}]: ${currentThreadMsg.text || ''}`
            : '';
          const threadRepliesText = (currentThreadMsg?.thread || [])
            .slice(-10)
            .map((r) => `- ${r.senderName}: ${r.text || ''}`)
            .join('\n');
          const contextPayload = [
            `[Bối cảnh Luồng thảo luận (Thread) trong không gian "${targetConv?.name || activeConvId}"]:`,
            rootContent,
            threadRepliesText ? `[Các phản hồi trước đó trong luồng]:\n${threadRepliesText}` : '',
            `[Câu hỏi từ ${currentUser?.fullName || currentUser?.name || 'Tôi'}]: ${cleanedPrompt}`,
          ]
            .filter(Boolean)
            .join('\n\n');

          setIsAiThinking(true);
          void (async () => {
            try {
              const imageDataUrl = await convertAttachmentToDataUrl(options?.attachments?.[0]);
              await apiClient.ai.sendMessage({
                message: contextPayload,
                scope: `mos-chat-thread:${activeConvId}:${currentThreadMsg.id}`,
                imageDataUrl,
                context: {
                  page: `mos-chat-thread:${activeConvId}:${currentThreadMsg.id}`,
                  userName: currentUser?.fullName || currentUser?.name || 'Tôi',
                  myRole: currentUser?.role || 'super_admin',
                },
              });
              await fetchBootstrap();
            } catch {
              // ignore
            } finally {
              setIsAiThinking(false);
            }
          })();
        }

        return true;
      } catch {
        return false;
      }
    },
    [
      activeConvId,
      activeConversation,
      activeThreadMsg,
      currentUser,
      fetchBootstrap,
      setActiveThreadMsg,
      setIsAiThinking,
    ]
  );

  const forwardMessage = useCallback(
    async (payload: ForwardMosChatMessageRequest): Promise<ForwardMosChatMessageResponse | null> => {
      try {
        const res = await apiClient.chat.forwardMessage(payload);
        lastVersionRef.current = Date.now();
        if (Array.isArray(res?.updatedConversations) && res.updatedConversations.length > 0) {
          setConversations((prev) => {
            const byId = new Map(res.updatedConversations.map((c) => [c.id, c]));
            const updatedExisting = prev.map((c) => byId.get(c.id) || c);
            const existingIds = new Set(prev.map((c) => c.id));
            const newlyCreated = res.updatedConversations.filter((c) => !existingIds.has(c.id));
            return [...newlyCreated, ...updatedExisting];
          });
          setAllMessagesByConv((prev) => {
            const next = { ...prev };
            for (const updatedConv of res.updatedConversations) {
              if (Array.isArray(updatedConv.messages)) {
                next[updatedConv.id] = updatedConv.messages;
              }
            }
            return next;
          });
        }
        const destCount = res?.results?.length || 0;
        const threadCount = res?.results?.[0]?.forwardedThreadCount || 0;
        antdMessage.success(
          threadCount > 0
            ? `Đã chuyển tiếp tin nhắn (kèm ${threadCount} phản hồi trong luồng) tới ${destCount} nơi nhận!`
            : `Đã chuyển tiếp tin nhắn tới ${destCount} nơi nhận!`
        );
        return res;
      } catch (err: SafeAny) {
        antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể chuyển tiếp tin nhắn.');
        return null;
      }
    },
    [lastVersionRef, setAllMessagesByConv, setConversations]
  );

  const editMessage = useCallback(
    async (msgId: string, newText: string, options?: { replyId?: string }) => {
      const nowIso = new Date().toISOString();

      if (options?.replyId) {
        const replyId = options.replyId;
        setActiveThreadMsg((prev) => {
          if (!prev || prev.id !== msgId) return prev;
          return {
            ...prev,
            thread: (prev.thread || []).map((r) => (r.id === replyId ? { ...r, text: newText, editedAt: nowIso } : r)),
          };
        });
        setAllMessagesByConv((prev) => {
          const currentList = prev[activeConvId] || [];
          return {
            ...prev,
            [activeConvId]: currentList.map((m) => {
              if (m.id !== msgId) return m;
              return {
                ...m,
                thread: (m.thread || []).map((r) => (r.id === replyId ? { ...r, text: newText, editedAt: nowIso } : r)),
              };
            }),
          };
        });
      } else {
        setAllMessagesByConv((prev) => ({
          ...prev,
          [activeConvId]: (prev[activeConvId] || []).map((m) =>
            m.id === msgId ? { ...m, text: newText, editedAt: nowIso } : m
          ),
        }));
        setActiveThreadMsg((prev) => {
          if (!prev || prev.id !== msgId) return prev;
          return { ...prev, text: newText, editedAt: nowIso };
        });
      }

      try {
        await apiClient.chat.editMessage(msgId, {
          conversationId: activeConvId,
          text: newText,
          replyId: options?.replyId,
        });
      } catch {
        // ignore
      }
    },
    [activeConvId, setActiveThreadMsg, setAllMessagesByConv]
  );

  const buzzMessage = useCallback(
    async (msgId: string) => {
      try {
        await apiClient.chat.buzzMessage(msgId, { conversationId: activeConvId });
      } catch {
        // ignore
      }
    },
    [activeConvId]
  );

  return {
    sendMessage,
    sendThreadReply,
    forwardMessage,
    editMessage,
    buzzMessage,
  };
}
