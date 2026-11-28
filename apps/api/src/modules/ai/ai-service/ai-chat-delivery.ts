import { randomUUID } from 'node:crypto';
import type { SafeAny } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import {
  appendBotMessageToChatConversation,
  appendBotThreadReplyToChatConversation,
} from '../../chat/chat-repository.service.js';
import type { ParsedAiResponse } from './ai-prompt-and-parser.js';

export async function persistAssistantReplyAndMetadata(params: {
  crm: CrmPrismaClient;
  sessionId: string;
  sessionMetadata: Record<string, unknown>;
  parsedResponse: ParsedAiResponse;
  source: 'ag' | 'gemini' | 'fallback';
  agConversationId?: string;
  agModelId?: string;
  agDebugMode?: boolean;
}) {
  const { crm, sessionId, sessionMetadata, parsedResponse, source, agConversationId, agModelId, agDebugMode } = params;

  const assistantMessageRecord = await crm.crmAiChatMessage.create({
    data: {
      sessionId,
      role: 'assistant',
      content: parsedResponse.content,
      thinking: parsedResponse.thinking,
      suggestedActionJson: parsedResponse.suggestedAction ? JSON.stringify(parsedResponse.suggestedAction) : null,
    },
  });

  const updatedMetadata: Record<string, unknown> = {
    ...sessionMetadata,
    ...(agConversationId ? { agConversationId } : {}),
    ...(agModelId ? { agModelId } : {}),
    ...(typeof agDebugMode === 'boolean' ? { agDebugMode } : {}),
    lastEngine: source,
  };

  await crm.crmAiChatSession.update({
    where: { id: sessionId },
    data: {
      updatedAt: new Date(),
      metadataJson: JSON.stringify(updatedMetadata),
    },
  });

  return { assistantMessageRecord, updatedMetadata };
}

async function appendBotMessageFallbackToCrmConfig(
  crm: CrmPrismaClient,
  conversationId: string,
  message: {
    text: string;
    thinking?: string | null;
    suggestedAction?: SafeAny;
    suggestedActions?: SafeAny[];
    userName?: string;
  }
): Promise<void> {
  try {
    const config = await crm.crmConfig.findUnique({ where: { key: 'mos_chat:conversations_v1' } });
    if (!config) return;
    const convs = JSON.parse(config.value || '[]');
    let conv = convs.find((c: SafeAny) => c.id === conversationId);
    if (!conv) {
      if (conversationId.startsWith('space-')) {
        const slug = conversationId.replace(/^space-/, '');
        const isCore = slug.includes('core');
        conv = {
          id: conversationId,
          type: 'space',
          name: slug,
          subtitle: isCore ? 'Không gian phối hợp Ban Điều Hành & Đội Ngũ Cốt Lõi' : `Không gian trao đổi ${slug}`,
          roleTag: isCore ? 'Core Team' : 'Space',
          color: isCore ? '#722ed1' : '#10b981',
          memberCount: 5,
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
          messages: [],
        };
        convs.unshift(conv);
      } else {
        return;
      }
    }

    const now = new Date();
    const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    let cleanText = (message.text || '')
      .replace(/<action[\s\S]*?<\/action>/gi, '')
      .replace(/<\/?action[^>]*>/gi, '')
      .trim();

    if (message.userName && !cleanText.includes(`@${message.userName}`)) {
      cleanText = `Chào @${message.userName}, ${cleanText}`;
    }

    const recentBotMsg = conv.messages
      ?.slice(-5)
      .find(
        (m: SafeAny) =>
          m.isAiBot && m.text === cleanText && Math.abs(now.getTime() - new Date(m.createdAt).getTime()) < 30_000
      );
    if (recentBotMsg) return;

    const newMsg = {
      id: `msg-${randomUUID().slice(0, 8)}`,
      conversationId: conv.id,
      senderId: 'wings-ai-copilot',
      senderName: '🤖 MAI',
      senderRole: 'mOS AI',
      senderAvatar: 'MAI',
      roleColor: '#8b5cf6',
      text: cleanText,
      timeLabel,
      createdAt: now.toISOString(),
      reactions: {},
      customerCard: null,
      thread: [],
      isAiBot: true,
      aiThinking: message.thinking || null,
      aiAction: message.suggestedAction || null,
      aiActions: message.suggestedActions || (message.suggestedAction ? [message.suggestedAction] : null),
    };

    conv.messages.push(newMsg);
    conv.updatedAt = now.toISOString();

    await crm.crmConfig.update({
      where: { key: 'mos_chat:conversations_v1' },
      data: { value: JSON.stringify(convs) },
    });
  } catch {
    // Best-effort delivery
  }
}

export async function deliverBotReplyToChatScope(params: {
  crm: CrmPrismaClient;
  fastify?: FastifyInstance;
  targetChatConvId?: string;
  targetChatThreadId?: string;
  parsedResponse: ParsedAiResponse;
  userName?: string;
  debugMode?: boolean;
  modelLabel?: string;
}): Promise<void> {
  const { crm, fastify, targetChatConvId, targetChatThreadId, parsedResponse, userName, debugMode, modelLabel } =
    params;
  if (!targetChatConvId || !parsedResponse.content) return;

  const trimmedContent = parsedResponse.content.trim();
  const formattedText =
    debugMode && !trimmedContent.startsWith('🛠️ **AG Debug**')
      ? `🛠️ **AG Debug** · \`${modelLabel || 'Antigravity'}\`\n\n${trimmedContent}`
      : parsedResponse.content;

  if (targetChatThreadId) {
    if (fastify) {
      await appendBotThreadReplyToChatConversation(fastify, targetChatConvId, targetChatThreadId, {
        text: formattedText,
        thinking: parsedResponse.thinking,
        suggestedAction: parsedResponse.suggestedAction,
        suggestedActions: parsedResponse.suggestedActions,
        recipientName: userName,
      });
    }
    return;
  }

  if (fastify) {
    await appendBotMessageToChatConversation(fastify, targetChatConvId, {
      text: formattedText,
      thinking: parsedResponse.thinking,
      suggestedAction: parsedResponse.suggestedAction,
      suggestedActions: parsedResponse.suggestedActions,
      recipientName: userName,
    });
  } else {
    await appendBotMessageFallbackToCrmConfig(crm, targetChatConvId, {
      text: formattedText,
      thinking: parsedResponse.thinking,
      suggestedAction: parsedResponse.suggestedAction,
      suggestedActions: parsedResponse.suggestedActions,
      userName,
    });
  }
}
