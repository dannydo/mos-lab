import type { MosChatMessage, MosChatStaffMember, MosChatTaskItem, UpdateMosChatTaskRequest } from '@mos-lab/shared';

export interface MosChatThreadChecklistProps {
  task: MosChatTaskItem;
  activeThreadMessage: MosChatMessage;
  onToggleChecklistItem: (checklistItemId: string) => Promise<void> | void;
  onAddChecklistItem: (title: string, sourceReplyId?: string | null) => Promise<void> | void;
  onDeleteChecklistItem: (checklistItemId: string) => Promise<unknown> | unknown;
  onUpdateTask?: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<unknown> | unknown;
  onScrollToReply?: (replyId: string) => void;
  staffList?: MosChatStaffMember[];
  isDark: boolean;
  token?: any;
  isMobile?: boolean;
}

export interface ThreadChecklistAiSuggestion {
  title: string;
  deadline?: string | null;
  assigneeName?: string;
  sourceReplyId?: string;
  selected: boolean;
}
