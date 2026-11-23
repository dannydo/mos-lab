import type { MosChatMissionActionType, MosChatTaskItem } from '@mos-lab/shared';

export interface MosChatMobileTaskDetailSheetProps {
  task: MosChatTaskItem | null;
  open: boolean;
  onClose: () => void;
  onEditTask: (task: MosChatTaskItem) => void;
  onNegotiateDeadline: (task: MosChatTaskItem) => void;
  onDispatchMission: (task: MosChatTaskItem) => void;
  onGoToSourceMessage?: (task: MosChatTaskItem) => void;
}

export interface TaskDeadlineState {
  deadlineDate: string | null | undefined;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export interface TaskParticipants {
  creator: string;
  assigner: string;
  assignee: string;
}

export interface TaskMissionPermissions {
  canApproveImplementation: boolean;
  canSuperAdminApproveCommit: boolean;
  canSuperAdminApproveDeploy: boolean;
  canReporterAccept: boolean;
  canRequestUpgradeOrRework: boolean;
}

export type MissionActionHandler = (action: MosChatMissionActionType, feedback?: string) => Promise<void>;
