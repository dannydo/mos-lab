import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

/**
 * Permanent links (permalinks) for mOS Chat sessions.
 *
 * An AI Copilot (MAI) session is stored server-side (CrmAiChatSession.id, a UUID), so a link that
 * carries its id re-opens exactly that session on any device:
 *   /chat?convId=dm-wings-ai-copilot&sessionId=<uuid>
 */
export const MOS_CHAT_PERMALINK_PATH = '/chat';

/** Query keys accepted when reading a session id (first one wins). `chatSessionId` is used by ticket context links. */
export const MOS_CHAT_SESSION_QUERY_KEYS = ['sessionId', 'chatSessionId', 'aiSessionId'] as const;

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidMosChatSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value.trim());
}

export function readMosChatSessionId(getParam: (key: string) => string | null | undefined): string | undefined {
  for (const key of MOS_CHAT_SESSION_QUERY_KEYS) {
    const raw = getParam(key);
    if (isValidMosChatSessionId(raw)) return raw.trim();
  }
  return undefined;
}

/** Relative permalink for an AI Copilot session, e.g. `/chat?convId=dm-wings-ai-copilot&sessionId=...`. */
export function buildMosChatAiSessionPath(sessionId: string): string {
  const params = new URLSearchParams();
  params.set('convId', AI_COPILOT_CONV_ID);
  params.set('sessionId', sessionId.trim());
  return `${MOS_CHAT_PERMALINK_PATH}?${params.toString()}`;
}

/** Absolute permalink (uses the current origin in the browser unless one is passed). */
export function buildMosChatAiSessionPermalink(sessionId: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}${buildMosChatAiSessionPath(sessionId)}`;
}

const CONVERSATION_ALIAS_KEYS = ['chatConvId', 'conversationId'] as const;
const MESSAGE_KEYS = ['msgId', 'chatMsgId', 'messageId', 'threadId', 'threadRootMessageId'] as const;

/**
 * Returns the URL (path + search + hash) that mirrors the active conversation (and AI session) in the
 * address bar, or `null` when nothing needs to change. Unrelated params (tab, taskId...) are kept; stale
 * message/thread params that belonged to the previous conversation are dropped, and a session id is only
 * kept for the AI Copilot conversation.
 */
export function syncConversationIntoUrl(
  currentHref: string,
  conversationId: string,
  aiSessionId?: string | null
): string | null {
  let url: URL;
  try {
    url = new URL(currentHref, 'http://localhost');
  } catch {
    return null;
  }
  const next = new URL(url.toString());
  next.searchParams.set('convId', conversationId);
  for (const key of CONVERSATION_ALIAS_KEYS) next.searchParams.delete(key);
  for (const key of MESSAGE_KEYS) next.searchParams.delete(key);
  for (const key of MOS_CHAT_SESSION_QUERY_KEYS) next.searchParams.delete(key);
  if (conversationId === AI_COPILOT_CONV_ID && aiSessionId && isValidMosChatSessionId(aiSessionId)) {
    next.searchParams.set('sessionId', aiSessionId);
  }
  const before = `${url.pathname}${url.search}${url.hash}`;
  const after = `${next.pathname}${next.search}${next.hash}`;
  return before === after ? null : after;
}

/** Mirrors the active AI Copilot session into the address bar (see `syncConversationIntoUrl`). */
export function syncAiSessionIntoUrl(currentHref: string, sessionId: string | null): string | null {
  return syncConversationIntoUrl(currentHref, AI_COPILOT_CONV_ID, sessionId);
}
