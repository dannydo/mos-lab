import {
  DEFAULT_MAI_CHAT_MODEL_ID,
  DEFAULT_MAI_DEBUG_MODEL_ID,
  findAgModelOption,
  type AiAssistantChatResponse,
  type AiChatContext,
} from '@mos-lab/shared';
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
import { loadRecentRoomContextForDebug } from './ai-debug-mode.js';
import { runAssistantEngines, type AgBridgeClient } from './ai-engine-runner.js';

export async function sendAiAssistantMessage(
  crm: CrmPrismaClient,
  staffId: number,
  params: {
    sessionId?: string;
    message: string;
    scope?: string;
    context?: AiChatContext;
    debugMode?: boolean;
    modelId?: string;
  },
  agBridge: AgBridgeClient,
  legacyPrisma?: LegacyPrismaClient,
  fastify?: FastifyInstance
): Promise<AiAssistantChatResponse> {
  const { message, scope = 'customers', context, debugMode = false, modelId } = params;
  const trimmedMessage = message.trim();

  // 1. Resolve or create session
  const { session, sessionMetadata, agConversationId, agModelId, agDebugMode } = await resolveOrCreateChatSession(
    crm,
    staffId,
    {
      sessionId: params.sessionId,
      trimmedMessage,
      scope,
      context,
    }
  );

  // 2. Save user message and retrieve recent session history (up to last 10 messages)
  const recentMessages = await saveUserMessageAndLoadHistory(crm, session.id, trimmedMessage);

  // 3. Resolve chat scope & fetch live contexts
  const { targetChatConvId, targetChatThreadId } = resolveTargetChatScope(scope);
  const [{ liveCustomerText, liveStaffCareerText, liveGoogleWorkspaceText }, liveRoomContextText] = await Promise.all([
    loadLiveContextsForMessage({
      crm,
      staffId,
      trimmedMessage,
      recentMessages,
      context,
      targetChatConvId,
      legacyPrisma,
      fastify,
    }),
    debugMode && targetChatConvId
      ? loadRecentRoomContextForDebug({ fastify, targetChatConvId, targetChatThreadId })
      : Promise.resolve(''),
  ]);

  const effectiveModelId = modelId || (debugMode ? DEFAULT_MAI_DEBUG_MODEL_ID : undefined);
  const effectiveModelLabel =
    findAgModelOption(effectiveModelId || DEFAULT_MAI_CHAT_MODEL_ID)?.label || effectiveModelId;

  const isModeChanged = Boolean(agConversationId) && Boolean(debugMode) !== Boolean(agDebugMode);
  const isModelChanged =
    Boolean(agConversationId) &&
    Boolean(effectiveModelId || agModelId) &&
    (effectiveModelId || DEFAULT_MAI_CHAT_MODEL_ID) !== (agModelId || DEFAULT_MAI_CHAT_MODEL_ID);
  const isModelOrModeSwitch = isModeChanged || isModelChanged;
  const activeAgConversationId = isModelOrModeSwitch ? undefined : agConversationId;

  // 4. Execute Primary Engine (AG Bridge) with Gemini & Smart Domain Fallback (disabled in Debug Mode)
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
    liveRoomContextText,
    agConversationId: activeAgConversationId,
    targetChatConvId,
    targetChatThreadId,
    debugMode,
    modelId: effectiveModelId,
    includeRecentHistory: isModelOrModeSwitch,
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
    agModelId: effectiveModelId || DEFAULT_MAI_CHAT_MODEL_ID,
    agDebugMode: Boolean(debugMode),
  });

  // 6. Auto-deliver to chat space or thread if this message was triggered in a group/DM chat
  await deliverBotReplyToChatScope({
    crm,
    fastify,
    targetChatConvId,
    targetChatThreadId,
    parsedResponse: engineResult.parsedResponse,
    userName: context?.userName,
    debugMode,
    modelLabel: effectiveModelLabel,
  });

  return {
    sessionId: session.id,
    source: engineResult.source,
    engine: engineResult.source,
    debugMode: Boolean(debugMode),
    modelId: effectiveModelId,
    modelLabel: effectiveModelLabel,
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
      debugMode: Boolean(debugMode),
      modelId: effectiveModelId,
      modelLabel: effectiveModelLabel,
      createdAt: assistantMessageRecord.createdAt.toISOString(),
    },
  };
}
