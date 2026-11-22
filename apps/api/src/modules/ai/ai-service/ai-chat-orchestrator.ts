import type { AiAssistantChatResponse, AiChatContext } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import type { PrismaClient as LegacyPrismaClient } from '../../../generated/legacy-client/index.js';
import {
  loadLiveContextsForMessage,
  resolveOrCreateChatSession,
  resolveTargetChatScope,
  saveUserMessageAndLoadHistory,
} from './ai-chat-context.js';
import { deliverBotReplyToChatScope, persistAssistantReplyAndMetadata } from './ai-chat-delivery.js';
import { runAssistantEngines, type AgBridgeClient } from './ai-engine-runner.js';

export async function sendAiAssistantMessage(
  crm: CrmPrismaClient,
  staffId: number,
  params: {
    sessionId?: string;
    message: string;
    scope?: string;
    context?: AiChatContext;
  },
  agBridge: AgBridgeClient,
  legacyPrisma?: LegacyPrismaClient,
  fastify?: FastifyInstance
): Promise<AiAssistantChatResponse> {
  const { message, scope = 'customers', context } = params;
  const trimmedMessage = message.trim();

  // 1. Resolve or create session
  const { session, sessionMetadata, agConversationId } = await resolveOrCreateChatSession(crm, staffId, {
    sessionId: params.sessionId,
    trimmedMessage,
    scope,
    context,
  });

  // 2. Save user message and retrieve recent session history (up to last 10 messages)
  const recentMessages = await saveUserMessageAndLoadHistory(crm, session.id, trimmedMessage);

  // 3. Resolve chat scope & fetch live contexts
  const { targetChatConvId, targetChatThreadId } = resolveTargetChatScope(scope);
  const { liveCustomerText, liveStaffCareerText, liveGoogleWorkspaceText } = await loadLiveContextsForMessage({
    crm,
    staffId,
    trimmedMessage,
    recentMessages,
    context,
    targetChatConvId,
    legacyPrisma,
    fastify,
  });

  // 4. Execute Primary Engine (AG Bridge) with Gemini & Smart Domain Fallback
  const engineResult = await runAssistantEngines({
    sessionId: session.id,
    staffId,
    trimmedMessage,
    scope,
    context,
    recentMessages,
    liveCustomerText,
    liveStaffCareerText,
    liveGoogleWorkspaceText,
    agConversationId,
    targetChatConvId,
    targetChatThreadId,
    agBridge,
  });

  // 5. Persist assistant message and update session metadata
  const { assistantMessageRecord, updatedMetadata } = await persistAssistantReplyAndMetadata({
    crm,
    sessionId: session.id,
    sessionMetadata,
    parsedResponse: engineResult.parsedResponse,
    source: engineResult.source,
    agConversationId: engineResult.agConversationId,
  });

  // 6. Auto-deliver to chat space or thread if this message was triggered in a group chat
  await deliverBotReplyToChatScope({
    crm,
    fastify,
    targetChatConvId,
    targetChatThreadId,
    parsedResponse: engineResult.parsedResponse,
    userName: context?.userName,
  });

  return {
    sessionId: session.id,
    source: engineResult.source,
    engine: engineResult.source,
    session: {
      id: session.id,
      staffId: session.staffId,
      title: session.title,
      scope: session.scope,
      metadata: updatedMetadata,
      createdAt: session.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    },
    message: {
      id: assistantMessageRecord.id,
      sessionId: assistantMessageRecord.sessionId,
      role: 'assistant',
      content: assistantMessageRecord.content,
      thinking: assistantMessageRecord.thinking,
      suggestedAction: engineResult.parsedResponse.suggestedAction,
      suggestedActions: engineResult.parsedResponse.suggestedActions,
      source: engineResult.source,
      createdAt: assistantMessageRecord.createdAt.toISOString(),
    },
  };
}
