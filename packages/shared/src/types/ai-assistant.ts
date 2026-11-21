export interface AiChatAction {
  type: 'APPLY_FILTER' | 'EXTRACT_LIST' | 'EXPLAIN_SCHEMA';
  label: string;
  payload: Record<string, unknown>;
  description?: string;
  actions?: AiChatAction[];
}

export interface AiChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string | null;
  suggestedAction?: AiChatAction | null;
  suggestedActions?: AiChatAction[] | null;
  source?: 'ag' | 'gemini' | 'fallback';
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
  imageDataUrl?: string;
  context?: AiChatContext;
}

export interface AiAssistantChatResponse {
  sessionId: string;
  message: AiChatMessage;
  session: AiChatSession;
  source: 'ag' | 'gemini' | 'fallback';
  engine?: 'ag' | 'gemini' | 'fallback';
}

export interface CreateAiSessionRequest {
  title?: string;
  scope?: string;
  metadata?: Record<string, unknown>;
}

export interface ListAiSessionsResponse {
  sessions: AiChatSession[];
}

/** How a viewer got access to a session (see Kinh Thánh mOS UI-012). Everything except `owner` is read-only. */
export type AiSessionAccessMode = 'owner' | 'shared' | 'mission' | 'audit';

export interface AiSessionAccessLogEntry {
  at: string;
  viewerStaffId: number;
  viewerName: string;
  viewerRole: string;
  mode: AiSessionAccessMode;
  reason?: string;
  missionReportIds?: number[];
}

export interface AiSessionAccessInfo {
  mode: AiSessionAccessMode;
  readOnly: boolean;
  /** Owner only: whether the session link is currently shared with signed-in staff. */
  sharingEnabled?: boolean;
  /** Owner only: Super Admin / Admin views of this session (mission or security audit) so the owner can see them. */
  accessLog?: AiSessionAccessLogEntry[];
  /** True when the session is linked to at least one mOS Mission. */
  missionLinked?: boolean;
}

export interface GetAiSessionResponse {
  session: AiChatSession;
  messages: AiChatMessage[];
  access?: AiSessionAccessInfo;
}

export interface StaffCareerLiveSnapshot {
  staffId: number;
  staffName: string;
  currentLevel: string;
  rawRole: string;
  targetLevel?: string;
  status: string;
  levelPromotedDate: string | null;
  promotedBy: string | null;
  careerMilestones?: Array<{ title: string; date: string; notes: string }>;
  performanceMetrics: {
    locaRate: number;
    requestRate?: number;
    avgCsat: number;
    totalDoneVisits: number;
    periodVisits?: number;
    selfComboCount?: number;
    fixRate: number;
    fixCount?: number;
    tipRate: number;
    totalTip?: number;
    branchName?: string;
  };
  specialCertifications?: string[];
}
