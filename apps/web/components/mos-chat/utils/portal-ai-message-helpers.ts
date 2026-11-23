import dayjs from 'dayjs';
import type {
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatMessage,
  MosChatQuotedMessage,
  MosChatThreadReply,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import { convertAttachmentToDataUrl } from '../shared/utils/convertAttachmentToDataUrl';

export function buildOptimisticChatMessage({
  now,
  targetConvId,
  senderId,
  senderName,
  text,
  customerCard,
  attachments,
  replyToId,
  replyTo,
}: {
  now: number;
  targetConvId: string;
  senderId: string | number;
  senderName: string;
  text: string;
  customerCard?: MosChatCustomerCard | null;
  attachments?: MosChatImageAttachment[];
  replyToId?: string | null;
  replyTo?: MosChatQuotedMessage | null;
}): MosChatMessage {
  return {
    id: `msg-${now}`,
    conversationId: targetConvId,
    senderId,
    senderName,
    senderRole: 'Super Admin',
    senderAvatar: senderName.slice(0, 2).toUpperCase(),
    roleColor: '#d4a84b',
    text: text || (customerCard ? `Hỗ trợ hồ sơ ${customerCard.name}` : ''),
    timeLabel: dayjs().format('HH:mm'),
    createdAt: new Date().toISOString(),
    customerCard: customerCard || null,
    attachments,
    reactions: {},
    thread: [],
    replyToId: replyToId || null,
    replyTo: replyTo || null,
  };
}

export function buildOptimisticThreadReply({
  senderId,
  senderName,
  text,
  attachments,
  customerCard,
  wasUrgent,
}: {
  senderId: string | number;
  senderName: string;
  text: string;
  attachments?: MosChatImageAttachment[];
  customerCard?: MosChatCustomerCard | null;
  wasUrgent: boolean;
}): MosChatThreadReply {
  return {
    id: `th-${Date.now()}`,
    senderId,
    senderName,
    senderRole: 'Super Admin',
    senderAvatar: senderName.slice(0, 2).toUpperCase(),
    text: text || (customerCard ? `Đính kèm thẻ khách hàng ${customerCard.name}:` : ''),
    attachments: attachments && attachments.length > 0 ? attachments : undefined,
    customerCard: customerCard || undefined,
    isBuzzed: wasUrgent || undefined,
    timeLabel: dayjs().format('HH:mm'),
    createdAt: new Date().toISOString(),
  };
}

export function buildRecoveredAiMessageFromContent({
  id,
  content,
  thinking,
  suggestedAction,
  suggestedActions,
  createdAt,
}: {
  id?: string;
  content: string;
  thinking?: string | null;
  suggestedAction?: MosChatMessage['aiAction'];
  suggestedActions?: MosChatMessage['aiActions'];
  createdAt?: string;
}): MosChatMessage {
  const actionMatches: NonNullable<MosChatMessage['aiAction']>[] = [];
  const regex = /<action(?:\s+type="([^"]*)")?(?:\s+label="([^"]*)")?>([\s\S]*?)<\/action>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    try {
      actionMatches.push({
        type: match[1]?.trim() || 'APPLY_FILTER',
        label: match[2]?.trim() || 'Áp dụng bộ lọc gợi ý',
        payload: JSON.parse(match[3]?.trim() || '{}'),
      });
    } catch {
      // ignore malformed action payload
    }
  }
  const cleanText = content
    .replace(/<action[\s\S]*?<\/action>/gi, '')
    .replace(/<\/?action[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const existingActions = suggestedActions || (suggestedAction ? [suggestedAction] : []);
  const allActions = [...existingActions, ...actionMatches].filter(
    (act, index, self) =>
      index ===
      self.findIndex((a) => a.label === act.label && JSON.stringify(a.payload) === JSON.stringify(act.payload))
  );

  return {
    id: id || `msg-ai-${Date.now()}`,
    conversationId: AI_COPILOT_CONV_ID,
    senderId: 'wings-ai-copilot',
    senderName: '🤖 MAI',
    senderRole: 'mOS AI',
    senderAvatar: 'MAI',
    roleColor: '#8b5cf6',
    isAiBot: true,
    text: cleanText,
    aiThinking: thinking || null,
    aiAction: allActions[0] || suggestedAction || null,
    aiActions: allActions.length > 0 ? allActions : null,
    timeLabel: dayjs(createdAt).format('HH:mm'),
    createdAt: createdAt || new Date().toISOString(),
    reactions: {},
    thread: [],
  };
}

export async function dispatchPrivateAiMessage({
  text,
  customerCard,
  cleanAttachments,
  senderName,
  myRole,
  aiSessionId,
}: {
  text: string;
  customerCard?: MosChatCustomerCard | null;
  cleanAttachments?: MosChatImageAttachment[];
  senderName: string;
  myRole: string;
  aiSessionId: string | null;
}): Promise<{
  sessionId?: string;
  message: MosChatMessage;
}> {
  const imageDataUrl = await convertAttachmentToDataUrl(cleanAttachments?.[0]);
  const promptForAi =
    text ||
    (customerCard
      ? `Phân tích hồ sơ khách hàng ${customerCard.name} (${customerCard.meta})`
      : 'Phân tích hình ảnh đính kèm này giúp tôi.');
  try {
    const aiRes = await apiClient.ai.sendMessage({
      sessionId: aiSessionId || undefined,
      message: promptForAi,
      scope: 'mos-chat-private',
      imageDataUrl,
      context: {
        page: 'mos-chat-private',
        userName: senderName,
        myRole,
      },
    });
    const botMsg: MosChatMessage = {
      id: aiRes?.message?.id || `msg-ai-${Date.now()}`,
      conversationId: AI_COPILOT_CONV_ID,
      senderId: 'wings-ai-copilot',
      senderName: '🤖 MAI',
      senderRole: 'mOS AI',
      senderAvatar: 'MAI',
      roleColor: '#8b5cf6',
      isAiBot: true,
      text: (aiRes?.message?.content || 'MAI đã xử lý xong yêu cầu của bạn.')
        .replace(/<action[\s\S]*?<\/action>/gi, '')
        .replace(/<\/?action[^>]*>/gi, '')
        .trim(),
      aiThinking: aiRes?.message?.thinking || null,
      aiAction: aiRes?.message?.suggestedAction || null,
      aiActions:
        aiRes?.message?.suggestedActions ||
        aiRes?.message?.suggestedAction?.actions ||
        (aiRes?.message?.suggestedAction ? [aiRes.message.suggestedAction] : null),
      timeLabel: dayjs().format('HH:mm'),
      createdAt: new Date().toISOString(),
      reactions: {},
      thread: [],
    };
    return {
      sessionId: aiRes?.session?.id,
      message: botMsg,
    };
  } catch (err: any) {
    if (aiSessionId) {
      for (let poll = 0; poll < 3; poll++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const sessRes = await apiClient.ai.getSession(aiSessionId);
          const lastAssistant = sessRes?.messages?.filter((m) => m.role === 'assistant')?.pop();
          if (lastAssistant && lastAssistant.content) {
            return {
              message: buildRecoveredAiMessageFromContent({
                id: lastAssistant.id,
                content: lastAssistant.content,
                thinking: lastAssistant.thinking,
                suggestedAction: lastAssistant.suggestedAction,
                suggestedActions: lastAssistant.suggestedActions,
                createdAt: lastAssistant.createdAt,
              }),
            };
          }
        } catch {
          // ignore poll error
        }
      }
    }
    return {
      message: {
        id: `msg-ai-err-${Date.now()}`,
        conversationId: AI_COPILOT_CONV_ID,
        senderId: 'wings-ai-copilot',
        senderName: '🤖 MAI',
        senderRole: 'mOS AI',
        senderAvatar: 'MAI',
        roleColor: '#8b5cf6',
        isAiBot: true,
        text: err?.response?.data?.message || 'Hiện kết nối MAI đang bận, bạn vui lòng thử lại sau giây lát nhé.',
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
        reactions: {},
        thread: [],
      },
    };
  }
}

export function buildThreadAiContextPayload({
  headerLabel,
  rootMsg,
  senderName,
  queryText,
}: {
  headerLabel: string;
  rootMsg?: MosChatMessage;
  senderName: string;
  queryText: string;
}): string {
  const rootContent = rootMsg ? `[Tin nhắn gốc từ ${rootMsg.senderName}]: ${rootMsg.text || ''}` : '';
  const threadReplies = (rootMsg?.thread || [])
    .slice(-10)
    .map((r) => `- ${r.senderName}: ${r.text || ''}`)
    .join('\n');
  return [
    headerLabel,
    rootContent,
    threadReplies ? `[Các phản hồi trước đó trong luồng]:\n${threadReplies}` : '',
    `[Câu hỏi từ ${senderName}]: ${queryText}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function dispatchRoomOrThreadAiMention({
  message,
  scope,
  senderName,
  myRole,
  firstAttachment,
  aiSessionId,
  isReadOnly,
  setAiSessionId,
}: {
  message: string;
  scope: string;
  senderName: string;
  myRole: string;
  firstAttachment?: MosChatImageAttachment;
  aiSessionId: string | null;
  isReadOnly: boolean;
  setAiSessionId: (id: string | null) => void;
}): Promise<void> {
  const imageDataUrl = await convertAttachmentToDataUrl(firstAttachment);
  const aiRes = await apiClient.ai.sendMessage({
    sessionId: isReadOnly ? undefined : aiSessionId || undefined,
    message,
    scope,
    imageDataUrl,
    context: {
      page: scope,
      userName: senderName,
      myRole,
    },
  });
  if (aiRes?.session?.id && !isReadOnly) {
    setAiSessionId(aiRes.session.id);
  }
}
