import type {
  ForwardMosChatMessageRequest,
  ForwardMosChatMessageResponse,
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';

export const MAX_FORWARD_TARGETS = 20;

export interface MosChatForwardModalProps {
  open: boolean;
  onClose: () => void;
  sourceConversation?: MosChatConversation | null;
  sourceMessage: MosChatMessage | null;
  sourceReply?: MosChatThreadReply | null;
  conversations: MosChatConversation[];
  staffDirectory: MosChatStaffMember[];
  currentUser?: SafeAny;
  pinnedIds?: string[];
  isDark: boolean;
  onSubmit: (payload: ForwardMosChatMessageRequest) => Promise<ForwardMosChatMessageResponse | null>;
  onNavigateToConversation?: (conversationId: string) => void;
}

export type ForwardTargetKind = 'conv' | 'staff';

export type ForwardTargetType = 'self' | 'space' | 'dm' | 'new_dm';

export interface ForwardTargetOption {
  key: string;
  kind: ForwardTargetKind;
  conversationId?: string;
  staffId?: number;
  label: string;
  subtitle?: string;
  type: ForwardTargetType;
  avatar?: string | null;
  color?: string;
  badgeBgClass?: string;
  isPinned?: boolean;
  updatedAtMs: number;
  searchHaystack: string;
}

export type ForwardTargetGroupId = 'self' | 'pinned' | 'spaces' | 'dms';

export interface ForwardTargetGroup {
  id: ForwardTargetGroupId;
  title: string;
  items: ForwardTargetOption[];
}

export interface ThreadForwardSummary {
  activeReplies: MosChatThreadReply[];
  threadParticipantsSummary: string;
  threadAttachmentsCount: number;
}
