export type MosChatPresenceStatus = 'active' | 'dnd' | 'away';

export type MosChatTaskPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export type MosChatImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export interface MosChatImageAttachment {
  id: string;
  url: string;
  name: string;
  mimeType: MosChatImageMimeType;
  sizeBytes: number;
  width?: number;
  height?: number;
  source?: 'clipboard' | 'drive' | 'upload';
}

export interface MosChatCustomerCard {
  customerId?: number;
  name: string;
  meta: string;
  cvName?: string;
  phone?: string;
}

export interface MosChatThreadReply {
  id: string;
  senderId: number | string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string | null;
  text: string;
  timeLabel: string;
  createdAt: string;
  attachments?: MosChatImageAttachment[];
}

export interface MosChatMessage {
  id: string;
  conversationId: string;
  senderId: number | string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string | null;
  roleColor?: string;
  text: string;
  timeLabel: string;
  createdAt: string;
  pinned?: boolean;
  reactions?: Record<string, number>;
  reactionUsers?: Record<string, Array<number | string>>;
  customerCard?: MosChatCustomerCard | null;
  attachments?: MosChatImageAttachment[];
  taskId?: string | null;
  thread?: MosChatThreadReply[];
  isSystemReminder?: boolean;
  isAiBot?: boolean;
  aiThinking?: string | null;
  aiAction?: {
    type: string;
    label: string;
    payload: Record<string, unknown>;
  } | null;
}

export interface MosChatTaskItem {
  id: string;
  conversationId: string;
  conversationName: string;
  sourceMessageId?: string | null;
  sourceAuthorName?: string;
  title: string;
  assigneeId?: number | string;
  assigneeName: string;
  creatorName: string;
  priority: MosChatTaskPriority;
  remindAt: string;
  done: boolean;
  fired?: boolean;
  createdAt: string;
}

export interface MosChatConversation {
  id: string;
  type: 'dm' | 'space';
  name: string;
  subtitle?: string;
  roleTag?: string;
  color: string;
  avatar?: string;
  memberCount?: number;
  participantStaffId?: number;
  isSelf?: boolean;
  memberIds?: number[];
  members?: MosChatStaffMember[];
  unreadCount: number;
  messages: MosChatMessage[];
  updatedAt: string;
}

export interface MosChatStaffMember {
  id: number;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  departmentCodes?: string[];
  teamCodes?: string[];
}

export interface MosChatAccessConfig {
  allowAllStaff: boolean;
  allowedGroupKeys: string[];
  allowedStaffIds: number[];
  aiCopilotAllowedGroupKeys?: string[];
  aiCopilotAllowedStaffIds?: number[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface UpdateMosChatAccessConfigRequest {
  allowAllStaff?: boolean;
  allowedGroupKeys?: string[];
  allowedStaffIds?: number[];
  aiCopilotAllowedGroupKeys?: string[];
  aiCopilotAllowedStaffIds?: number[];
}

export interface MosChatCustomSection {
  id: string;
  name: string;
  conversationIds: string[];
  collapsed?: boolean;
  unreadOnly?: boolean;
}

export interface MosChatUserSidebarPrefs {
  pinnedIds: string[];
  mutedIds: string[];
  hiddenIds: string[];
  manualUnreadIds: string[];
  readMessageCountByConv?: Record<string, number>;
  collapsedSections: Record<string, boolean>;
  unreadOnlySections: Record<string, boolean>;
  sectionOrder: string[];
  customSections: MosChatCustomSection[];
  conversationOrder: Record<string, string[]>;
  updatedAt?: string;
}

export interface MosChatBootstrapResponse {
  version?: number;
  unchanged?: boolean;
  conversations: MosChatConversation[];
  tasks: MosChatTaskItem[];
  staffDirectory: MosChatStaffMember[];
  accessConfig?: MosChatAccessConfig;
  canAccessChat?: boolean;
  userPrefs?: MosChatUserSidebarPrefs;
}

export interface CreateMosChatMessageRequest {
  conversationId: string;
  text: string;
  customerCard?: MosChatCustomerCard | null;
  attachments?: MosChatImageAttachment[];
  isAiBot?: boolean;
  aiThinking?: string | null;
  aiAction?: {
    type: string;
    label: string;
    payload: Record<string, unknown>;
  } | null;
}

export interface CreateMosChatThreadReplyRequest {
  conversationId: string;
  messageId: string;
  text: string;
  attachments?: MosChatImageAttachment[];
}

export interface UploadMosChatImageRequest {
  dataBase64: string;
  mimeType: MosChatImageMimeType;
  fileName?: string;
  width?: number;
  height?: number;
  source?: 'clipboard' | 'drive' | 'upload';
}

export interface UploadMosChatImageResponse {
  success: boolean;
  attachment: MosChatImageAttachment;
}

export interface CreateMosChatTaskRequest {
  conversationId: string;
  sourceMessageId?: string | null;
  title: string;
  assigneeId?: number | string;
  assigneeName: string;
  priority: MosChatTaskPriority;
  remindInSeconds: number;
}

export interface CreateMosChatConversationRequest {
  type: 'dm' | 'space';
  name: string;
  participantStaffId?: number;
  memberIds?: number[];
  isSelf?: boolean;
  subtitle?: string;
}

export interface AddMosChatMemberRequest {
  conversationId: string;
  staffId?: number;
  staffIds?: number[];
}

export interface RemoveMosChatMemberRequest {
  conversationId: string;
  staffId: number;
}
