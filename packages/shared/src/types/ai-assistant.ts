export interface AiChatAction {
  type: 'APPLY_FILTER' | 'EXTRACT_LIST' | 'EXPLAIN_SCHEMA';
  label: string;
  payload: Record<string, unknown>;
  description?: string;
}

export interface AiChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string | null;
  suggestedAction?: AiChatAction | null;
  createdAt: string;
}

export interface AiChatSession {
  id: string;
  staffId: number;
  title: string;
  scope: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  messages?: AiChatMessage[];
  lastMessage?: string;
  messageCount?: number;
}

export interface AiChatContext {
  page?: string;
  pathname?: string;
  currentFilter?: Record<string, unknown>;
  selectedCustomerCount?: number;
  myStaffId?: number;
  myRole?: string;
  userName?: string;
}

export interface AiAssistantChatRequest {
  sessionId?: string;
  message: string;
  scope?: string;
  context?: AiChatContext;
}

export interface AiAssistantChatResponse {
  sessionId: string;
  message: AiChatMessage;
  session: AiChatSession;
  source: 'gemini' | 'fallback';
}

export interface CreateAiSessionRequest {
  title?: string;
  scope?: string;
  metadata?: Record<string, unknown>;
}

export interface ListAiSessionsResponse {
  sessions: AiChatSession[];
}

export interface GetAiSessionResponse {
  session: AiChatSession;
  messages: AiChatMessage[];
}
