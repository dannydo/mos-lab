import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { MosChatConversation, MosChatMessage, MosChatThreadReply, SafeAny } from '@mos-lab/shared';
import { withChatMutationLock } from './repo-schema-and-lock.js';
import { syncConversationsToRelationalDb } from './repo-bulk-sync.js';

/**
 * Append an AI bot message directly into a chat conversation in both JSON state and relational DB.
 */
export async function appendBotMessageToChatConversation(
  fastify: FastifyInstance,
  conversationId: string,
  message: {
    text: string;
    thinking?: string | null;
    suggestedAction?: SafeAny;
    suggestedActions?: SafeAny[];
    senderName?: string;
    recipientName?: string;
  }
): Promise<MosChatMessage | null> {
  return withChatMutationLock(async () => {
    const crm = (fastify as SafeAny)?.prisma?.crm;
    if (!crm) return null;

    try {
      const config = await crm.crmConfig.findUnique({ where: { key: 'mos_chat:conversations_v1' } });
      if (!config) return null;
      const convs: MosChatConversation[] = JSON.parse(config.value || '[]');
      let conv = convs.find((c) => c.id === conversationId);
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
          return null;
        }
      }

      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      let cleanText = (message.text || '')
        .replace(/<action[\s\S]*?<\/action>/gi, '')
        .replace(/<\/?action[^>]*>/gi, '')
        .trim();

      if (message.recipientName && !cleanText.includes(`@${message.recipientName}`)) {
        cleanText = `Chào @${message.recipientName}, ${cleanText}`;
      }

      // Deduplication check: Avoid appending duplicate bot reply to this conversation within 120 seconds
      const existingPrematureBotMsg = conv.messages.find(
        (m) =>
          m.isAiBot &&
          (m.text.includes('Người dùng hiện tại') ||
            m.text.includes('Hiện kết nối MAI đang bận') ||
            (m.text.length < 100 && Math.abs(now.getTime() - new Date(m.createdAt).getTime()) < 120_000))
      );
      if (existingPrematureBotMsg) {
        existingPrematureBotMsg.text = cleanText;
        existingPrematureBotMsg.aiThinking = message.thinking || existingPrematureBotMsg.aiThinking || null;
        existingPrematureBotMsg.aiAction = message.suggestedAction || existingPrematureBotMsg.aiAction || null;
        existingPrematureBotMsg.aiActions =
          message.suggestedActions ||
          (message.suggestedAction ? [message.suggestedAction] : existingPrematureBotMsg.aiActions || null);
        await crm.crmConfig.update({
          where: { key: 'mos_chat:conversations_v1' },
          data: { value: JSON.stringify(convs) },
        });
        try {
          await syncConversationsToRelationalDb(fastify, convs);
        } catch {
          // non-blocking relational sync
        }
        return existingPrematureBotMsg;
      }

      const recentBotMsg = conv.messages
        .slice(-15)
        .find(
          (m) =>
            m.isAiBot &&
            (m.text === cleanText ||
              m.text.trim() === cleanText.trim() ||
              m.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') === cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
            Math.abs(now.getTime() - new Date(m.createdAt).getTime()) < 120_000
        );
      if (recentBotMsg) {
        return recentBotMsg;
      }

      // Relational table secondary check
      try {
        const recentRelational = await crm.crmChatMessage?.findFirst({
          where: {
            conversationId: conv.id,
            parentMessageId: null,
            senderName: { contains: 'MAI' },
            createdAt: { gte: new Date(now.getTime() - 120_000) },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, text: true },
        });
        if (recentRelational) {
          const relTrim = recentRelational.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '');
          const curTrim = cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '');
          if (relTrim === curTrim || relTrim.slice(0, 100) === curTrim.slice(0, 100)) {
            const foundInConv = conv.messages.find((m) => m.id === recentRelational.id);
            if (foundInConv) return foundInConv;
          }
        }
      } catch {
        // non-blocking relational sync
      }

      const newMsg: MosChatMessage = {
        id: `msg-${randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: 'wings-ai-copilot',
        senderName: message.senderName || '🤖 MAI',
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

      // Also sync to relational DB if available
      try {
        await syncConversationsToRelationalDb(fastify, convs);
      } catch {
        // non-blocking relational sync
      }

      return newMsg;
    } catch (err) {
      fastify.log?.warn?.({ err }, 'Failed to append bot message to chat conversation');
      return null;
    }
  });
}

/**
 * Append or update an AI bot thread reply directly into a chat conversation's thread.
 */
export async function appendBotThreadReplyToChatConversation(
  fastify: FastifyInstance,
  conversationId: string,
  parentMessageId: string,
  message: {
    text: string;
    thinking?: string | null;
    suggestedAction?: SafeAny;
    suggestedActions?: SafeAny[];
    senderName?: string;
    recipientName?: string;
  }
): Promise<MosChatThreadReply | null> {
  return withChatMutationLock(async () => {
    const crm = (fastify as SafeAny)?.prisma?.crm;
    if (!crm) return null;

    try {
      const config = await crm.crmConfig.findUnique({ where: { key: 'mos_chat:conversations_v1' } });
      if (!config) return null;
      const convs: MosChatConversation[] = JSON.parse(config.value || '[]');
      const conv = convs.find((c) => c.id === conversationId);
      if (!conv) return null;
      const msg = conv.messages.find((m) => m.id === parentMessageId);
      if (!msg) return null;

      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      let cleanText = (message.text || '')
        .replace(/<action[\s\S]*?<\/action>/gi, '')
        .replace(/<\/?action[^>]*>/gi, '')
        .trim();

      if (message.recipientName && !cleanText.includes(`@${message.recipientName}`)) {
        cleanText = `Chào @${message.recipientName}, ${cleanText}`;
      }

      msg.thread = msg.thread || [];

      // Check if premature/short bot message already exists in this thread within 2 minutes
      const prematureReply = msg.thread.find(
        (r) =>
          r.isAiBot &&
          (r.text.includes('Người dùng hiện tại') ||
            r.text.includes('Hiện kết nối MAI đang bận') ||
            (r.text.length < 100 && Math.abs(now.getTime() - new Date(r.createdAt).getTime()) < 120_000))
      );

      if (prematureReply) {
        prematureReply.text = cleanText;
        prematureReply.aiThinking = message.thinking || prematureReply.aiThinking || null;
        prematureReply.aiAction = message.suggestedAction || prematureReply.aiAction || null;
        prematureReply.aiActions =
          message.suggestedActions ||
          (message.suggestedAction ? [message.suggestedAction] : prematureReply.aiActions || null);
      } else {
        // Deduplication check: Avoid duplicate thread reply within 120 seconds
        const duplicate = msg.thread.find(
          (r) =>
            r.isAiBot &&
            (r.text === cleanText ||
              r.text.trim() === cleanText.trim() ||
              r.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') === cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
            Math.abs(now.getTime() - new Date(r.createdAt).getTime()) < 120_000
        );
        if (duplicate) return duplicate;

        // Relational DB secondary check
        try {
          const recentRelational = await crm.crmChatMessage?.findFirst({
            where: {
              parentMessageId,
              senderName: { contains: 'MAI' },
              createdAt: { gte: new Date(now.getTime() - 120_000) },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true, text: true },
          });
          if (recentRelational) {
            const relTrim = recentRelational.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '');
            const curTrim = cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '');
            if (relTrim === curTrim || relTrim.slice(0, 100) === curTrim.slice(0, 100)) {
              const foundInThread = msg.thread.find((r) => r.id === recentRelational.id);
              if (foundInThread) return foundInThread;
            }
          }
        } catch {
          // non-blocking relational sync
        }

        const newReply: MosChatThreadReply = {
          id: `th-${randomUUID().slice(0, 8)}`,
          senderId: 'wings-ai-copilot',
          senderName: message.senderName || '🤖 MAI',
          senderRole: 'mOS AI',
          senderAvatar: 'MAI',
          roleColor: '#8b5cf6',
          text: cleanText,
          timeLabel,
          createdAt: now.toISOString(),
          isAiBot: true,
          aiThinking: message.thinking || null,
          aiAction: message.suggestedAction || null,
          aiActions: message.suggestedActions || (message.suggestedAction ? [message.suggestedAction] : null),
        };
        msg.thread.push(newReply);
      }

      conv.updatedAt = now.toISOString();

      await crm.crmConfig.update({
        where: { key: 'mos_chat:conversations_v1' },
        data: { value: JSON.stringify(convs) },
      });

      try {
        await syncConversationsToRelationalDb(fastify, convs);
      } catch {
        // non-blocking relational sync
      }

      return msg.thread[msg.thread.length - 1];
    } catch (err) {
      fastify.log?.warn?.({ err }, 'Failed to append bot thread reply to chat conversation');
      return null;
    }
  });
}

/**
 * Deduplicate AI bot messages within conversations and threads created within 120s.
 * Merges reactions and deletes redundant records.
 */
export async function deduplicateBotMessages(
  fastify: FastifyInstance
): Promise<{ removedCount: number; removedIds: string[] }> {
  return withChatMutationLock(async () => {
    const crm = (fastify as SafeAny)?.prisma?.crm;
    if (!crm) return { removedCount: 0, removedIds: [] };

    try {
      const config = await crm.crmConfig.findUnique({ where: { key: 'mos_chat:conversations_v1' } });
      if (!config) return { removedCount: 0, removedIds: [] };
      const convs: MosChatConversation[] = JSON.parse(config.value || '[]');

      const removedIds: string[] = [];

      for (const conv of convs) {
        // 1. Deduplicate main messages
        const newMessages: MosChatMessage[] = [];
        for (const m of conv.messages) {
          if (m.isAiBot) {
            const prev = newMessages[newMessages.length - 1];
            if (
              prev &&
              prev.isAiBot &&
              (prev.text === m.text ||
                prev.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') ===
                  m.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
              Math.abs(new Date(prev.createdAt).getTime() - new Date(m.createdAt).getTime()) < 120_000
            ) {
              // Merge reactions
              if (m.reactions) {
                prev.reactions = prev.reactions || {};
                for (const [emoji, count] of Object.entries(m.reactions)) {
                  prev.reactions[emoji] = Math.max(prev.reactions[emoji] || 0, typeof count === 'number' ? count : 1);
                }
              }
              removedIds.push(m.id);
              continue;
            }
          }

          // 2. Deduplicate thread
          if (Array.isArray(m.thread) && m.thread.length > 1) {
            const newThread: MosChatThreadReply[] = [];
            for (const r of m.thread) {
              if (r.isAiBot) {
                const prev = newThread[newThread.length - 1];
                if (
                  prev &&
                  prev.isAiBot &&
                  (prev.text === r.text ||
                    prev.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') ===
                      r.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
                  Math.abs(new Date(prev.createdAt).getTime() - new Date(r.createdAt).getTime()) < 120_000
                ) {
                  // Merge reactions
                  if ((r as SafeAny).reactions) {
                    (prev as SafeAny).reactions = (prev as SafeAny).reactions || {};
                    for (const [emoji, count] of Object.entries((r as SafeAny).reactions)) {
                      (prev as SafeAny).reactions[emoji] = Math.max(
                        (prev as SafeAny).reactions[emoji] || 0,
                        typeof count === 'number' ? count : 1
                      );
                    }
                  }
                  removedIds.push(r.id);
                  continue;
                }
              }
              newThread.push(r);
            }
            m.thread = newThread;
          }

          newMessages.push(m);
        }
        conv.messages = newMessages;
      }

      if (removedIds.length > 0) {
        await crm.crmConfig.update({
          where: { key: 'mos_chat:conversations_v1' },
          data: { value: JSON.stringify(convs) },
        });

        try {
          await crm.crmChatMessage.deleteMany({
            where: { id: { in: removedIds } },
          });
        } catch {
          // non-blocking relational sync
        }

        try {
          await syncConversationsToRelationalDb(fastify, convs);
        } catch {
          // non-blocking relational sync
        }
      }

      return { removedCount: removedIds.length, removedIds };
    } catch (err) {
      fastify.log?.warn?.({ err }, 'Failed to deduplicate bot messages');
      return { removedCount: 0, removedIds: [] };
    }
  });
}
