import type {
  AiAssistantChatResponse,
  AiChatContext,
  AiChatMessage,
  AiChatSession,
  AiSessionAccessInfo,
} from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient as CrmPrismaClient } from '../../generated/crm-client/index.js';
import type { PrismaClient as LegacyPrismaClient } from '../../generated/legacy-client/index.js';
import { AgChatBridgeService } from './ag-chat-bridge.service.js';
import type { AiSessionViewer } from './ai-session-access.js';
import { sendAiAssistantMessage } from './ai-service/ai-chat-orchestrator.js';
import { generateAssistantFallback } from './ai-service/ai-fallback.js';
import {
  extractThinkingAndAction,
  SYSTEM_PROMPT_ASSISTANT,
  type ParsedAiResponse,
} from './ai-service/ai-prompt-and-parser.js';
import {
  createAiSession,
  deleteAiSession,
  getAiSession,
  getAiSessionForViewer,
  linkAiSessionToMission,
  listAiSessions,
  setAiSessionSharing,
} from './ai-service/ai-sessions.js';

export { extractThinkingAndAction, generateAssistantFallback, SYSTEM_PROMPT_ASSISTANT, type ParsedAiResponse };

export class AiAssistantService {
  /**
   * List sessions for a staff member (strictly isolated by staffId)
   */
  static listSessions(crm: CrmPrismaClient, staffId: number, scope: string = 'customers'): Promise<AiChatSession[]> {
    return listAiSessions(crm, staffId, scope);
  }

  /**
   * Get single session with its messages, strictly owner-scoped (Private Workspace isolation).
   * Permalink viewers other than the owner go through `getSessionForViewer`.
   */
  static getSession(
    crm: CrmPrismaClient,
    sessionId: string,
    staffId: number
  ): Promise<{
    session: AiChatSession;
    messages: AiChatMessage[];
  } | null> {
    return getAiSession(crm, sessionId, staffId);
  }

  /**
   * Permalink access (Kinh Thánh mOS UI-012): owner, shared link, Super Admin for mission-linked sessions,
   * or Admin/Super Admin with a written security-audit reason. Non-owner views are read-only; mission/audit
   * views are recorded in the session's access log so the owner can see them. Metadata of someone else's
   * session is never returned.
   */
  static getSessionForViewer(
    crm: CrmPrismaClient,
    sessionId: string,
    viewer: AiSessionViewer,
    options: { auditRequested?: boolean; auditReason?: unknown } = {}
  ): Promise<
    | { status: 'not_found' }
    | { status: 'forbidden'; auditAvailable: boolean; invalidAuditReason?: boolean }
    | { status: 'ok'; result: { session: AiChatSession; messages: AiChatMessage[]; access: AiSessionAccessInfo } }
  > {
    return getAiSessionForViewer(crm, sessionId, viewer, options);
  }

  /** Owner-only: switch link sharing on/off for one session. Returns null when the staff member does not own it. */
  static setSessionSharing(
    crm: CrmPrismaClient,
    sessionId: string,
    staffId: number,
    enabled: boolean
  ): Promise<{ sharingEnabled: boolean } | null> {
    return setAiSessionSharing(crm, sessionId, staffId, enabled);
  }

  /** Remember that a session produced a mOS Mission, so the Super Admin can reopen it from the ticket. */
  static linkSessionToMission(crm: CrmPrismaClient, sessionId: string, reportId: number): Promise<boolean> {
    return linkAiSessionToMission(crm, sessionId, reportId);
  }

  /**
   * Create a new session for a staff member
   */
  static createSession(
    crm: CrmPrismaClient,
    staffId: number,
    data: { title?: string; scope?: string; metadata?: Record<string, unknown> }
  ): Promise<AiChatSession> {
    return createAiSession(crm, staffId, data);
  }

  /**
   * Delete session (strictly verifies staffId)
   */
  static deleteSession(crm: CrmPrismaClient, sessionId: string, staffId: number): Promise<boolean> {
    return deleteAiSession(crm, sessionId, staffId);
  }

  /**
   * Process a chat message:
   * 1. Ensure/resolve session owned by staffId
   * 2. Store user message
   * 3. Call LLM (AG Bridge / Gemini with system prompt) or Smart Fallback
   * 4. Parse thinking & suggested actions
   * 5. Store assistant message
   * 6. Return response
   */
  static sendMessage(
    crm: CrmPrismaClient,
    staffId: number,
    params: {
      sessionId?: string;
      message: string;
      scope?: string;
      context?: AiChatContext;
    },
    legacyPrisma?: LegacyPrismaClient,
    fastify?: FastifyInstance
  ): Promise<AiAssistantChatResponse> {
    return sendAiAssistantMessage(crm, staffId, params, AgChatBridgeService, legacyPrisma, fastify);
  }
}
