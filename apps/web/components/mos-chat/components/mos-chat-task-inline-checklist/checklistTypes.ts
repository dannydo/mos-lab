import type { MosChatStaffMember, MosChatTaskItem, UpdateMosChatTaskRequest } from '@mos-lab/shared';

export interface MosChatTaskInlineChecklistProps {
  task: MosChatTaskItem;
  onUpdateTask: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<unknown> | unknown;
  isDark: boolean;
  token?: any;
  staffList?: MosChatStaffMember[];
  onScrollToReply?: (replyId: string) => void;
}

export interface ChecklistStaffOption {
  id: number | string;
  displayName: string;
  role?: string;
  avatarUrl?: string | null;
}

export interface ChecklistDeadlineMeta {
  label: string;
  fullLabel: string;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export interface ChecklistQuickDeadlineOption {
  label: string;
  value: string;
}
