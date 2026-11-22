import type { MosChatGoogleWorkspaceKind, ParsedGoogleWorkspaceRange } from '../../utils/google-workspace-link.js';
import type {
  MosChatVoiceCallSession,
  MosChatVoiceCallSignalEnvelope,
  MosChatVoiceCallSignalType,
} from './core-entities.types.js';
import type { MosChatMessage } from './messages-and-tasks.types.js';

// ================= VOICE CALL API DTOs =================

export interface StartMosChatVoiceCallRequest {
  conversationId: string;
}

export interface StartMosChatVoiceCallResponse {
  success: boolean;
  call: MosChatVoiceCallSession;
  joinedExisting?: boolean;
  livekitToken?: string | null;
}

export interface RespondMosChatVoiceCallRequest {
  action: 'ACCEPT' | 'DECLINE';
}

export interface RespondMosChatVoiceCallResponse {
  success: boolean;
  call: MosChatVoiceCallSession;
  livekitToken?: string | null;
  systemMessage?: MosChatMessage | null;
}

export interface SignalMosChatVoiceCallRequest {
  targetStaffId: string;
  signalType: MosChatVoiceCallSignalType;
  sdp?: unknown;
  candidate?: unknown;
}

export interface MuteMosChatVoiceCallRequest {
  isMuted: boolean;
}

export interface EndMosChatVoiceCallResponse {
  success: boolean;
  call: MosChatVoiceCallSession;
  systemMessage?: MosChatMessage | null;
}

export interface ListActiveMosChatVoiceCallsResponse {
  success: boolean;
  activeCalls: MosChatVoiceCallSession[];
  pendingSignals?: MosChatVoiceCallSignalEnvelope[];
}

// ================= WEB PUSH NOTIFICATIONS (iOS PWA & DESKTOP LOCK-SCREEN) =================

export interface MosChatPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface MosChatPushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: MosChatPushSubscriptionKeys;
  userAgent?: string;
  deviceLabel?: string;
}

export interface MosChatPushConfigResponse {
  success: boolean;
  vapidPublicKey: string;
  subscribedCount: number;
}

export interface SubscribeMosChatPushRequest {
  subscription: MosChatPushSubscriptionPayload;
}

export interface SubscribeMosChatPushResponse {
  success: boolean;
  subscribedCount: number;
}

export interface UnsubscribeMosChatPushRequest {
  endpoint: string;
}

export interface UnsubscribeMosChatPushResponse {
  success: boolean;
  subscribedCount: number;
}

export interface MosChatWebPushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  vibrate?: number[];
  data?: {
    type: 'VOICE_CALL_INCOMING' | 'VOICE_CALL_MISSED' | 'CHAT_BUZZ' | 'CHAT_DM' | 'CHAT_MENTION' | 'CHAT_TEST';
    callId?: string;
    conversationId?: string;
    messageId?: string;
    threadRootMessageId?: string;
    url?: string;
  };
}

// ================= GOOGLE WORKSPACE (SHEETS & DOCS) IN-CHAT READER =================

export type MosChatGoogleWorkspaceAccessStatus =
  'PUBLIC_LINK' | 'SERVICE_ACCOUNT' | 'NEEDS_SHARE' | 'RESTRICTED_ROLE' | 'NOT_FOUND' | 'ERROR';

export interface MosChatGoogleSheetTabSummary {
  sheetId: number;
  gid: string;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface MosChatGoogleSheetActiveTabData {
  gid: string;
  title: string;
  totalRows: number;
  totalCols: number;
  rows: string[][];
  truncated?: boolean;
  /** 1-based row numbers matching rows[] */
  snippetRowStart?: number;
  /** Preview rows around range / top of sheet for inline chat card */
  snippetRows?: Array<{
    rowNumber: number;
    cells: string[];
  }>;
  snippetColStart?: number;
  snippetColHeaders?: string[];
}

export interface MosChatGoogleDocHeading {
  id: string;
  level: 1 | 2 | 3 | 4;
  text: string;
}

export interface MosChatGoogleDocSection {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'table';
  level?: 1 | 2 | 3 | 4;
  text?: string;
  items?: string[];
  rows?: string[][];
}

export interface MosChatGoogleWorkspacePreviewQuery {
  url: string;
  gid?: string;
  range?: string;
  conversationId?: string;
  messageId?: string;
  refresh?: boolean;
}

export interface MosChatGoogleWorkspacePreviewResponse {
  success: boolean;
  kind: MosChatGoogleWorkspaceKind;
  fileId: string;
  canonicalUrl: string;
  embedUrl: string;
  title: string;
  accessStatus: MosChatGoogleWorkspaceAccessStatus;
  serviceAccountEmail: string;
  statusMessage?: string | null;
  modifiedTime?: string | null;
  requestedGid?: string | null;
  requestedRange?: string | null;
  parsedRange?: ParsedGoogleWorkspaceRange | null;
  /** Google Sheets specific */
  tabs?: MosChatGoogleSheetTabSummary[];
  activeTab?: MosChatGoogleSheetActiveTabData | null;
  /** Google Docs & Canva extracted structure */
  headings?: MosChatGoogleDocHeading[];
  sections?: MosChatGoogleDocSection[];
  excerpt?: string | null;
  plainText?: string | null;
  /** Canva specific metadata */
  authorName?: string | null;
  designType?: string | null;
  embedWidth?: number | null;
  embedHeight?: number | null;
  cached?: boolean;
  fetchedAt: string;
}
