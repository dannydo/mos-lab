import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import type { MosChatMissionActionType, MosChatMissionSummary, MosChatTaskItem, SafeAny } from '@mos-lab/shared';
import { isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import type { TaskDeadlineState, TaskMissionPermissions, TaskParticipants } from './taskDetailTypes';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export const MISSION_PROGRESS_STEPS = [
  { idx: 1, label: '1. Tiếp nhận' },
  { idx: 2, label: '2. Đang xử lý' },
  { idx: 3, label: '3. Nghiệm thu' },
  { idx: 4, label: '4. Hoàn tất' },
] as const;

/**
 * Format compact task code badge from raw task identifier.
 */
export function formatTaskCode(taskId: string): string {
  return `#TASK-${taskId
    .replace(/^task_/, '')
    .slice(-6)
    .toUpperCase()}`;
}

/**
 * Format human-readable Vietnamese countdown or overdue duration relative to now.
 */
export function formatTaskCountdown(dateStr: string): string {
  const diffHours = dayjs(dateStr).diff(dayjs(), 'hour');
  const diffDays = dayjs(dateStr).diff(dayjs(), 'day');
  if (dayjs(dateStr).isBefore(dayjs())) {
    const pastHours = Math.abs(diffHours);
    if (pastHours < 24) return `Quá hạn ${pastHours} giờ`;
    return `Quá hạn ${Math.abs(diffDays)} ngày`;
  }
  if (diffHours < 24) return `Còn ${diffHours} giờ`;
  return `Còn ${diffDays} ngày`;
}

/**
 * Resolve effective deadline date along with overdue / due-soon flags.
 */
export function resolveTaskDeadlineState(task: MosChatTaskItem): TaskDeadlineState {
  const deadlineDate = task.dueAt || task.deadline;
  const isOverdue = Boolean(deadlineDate && !task.done && dayjs(deadlineDate).isBefore(dayjs()));
  const isDueSoon = Boolean(
    deadlineDate && !task.done && !isOverdue && dayjs(deadlineDate).diff(dayjs(), 'hour') <= 24
  );
  return { deadlineDate, isOverdue, isDueSoon };
}

/**
 * Resolve creator, assigner, and assignee labels with system fallbacks.
 */
export function resolveTaskParticipants(task: MosChatTaskItem): TaskParticipants {
  return {
    creator: task.sourceAuthorName || task.creatorName || 'Hệ thống',
    assigner: task.assignerName || task.creatorName || task.sourceAuthorName || 'Hệ thống',
    assignee: task.assigneeName || 'Chính tôi',
  };
}

/**
 * Resolve display name for the currently signed-in staff user.
 */
export function resolveMyDisplayName(currentUser: SafeAny): string {
  return currentUser?.displayName || currentUser?.fullName || currentUser?.name || currentUser?.username || 'Danny Do';
}

/**
 * Check whether current user holds canonical Super Admin Danny privileges.
 */
export function isStrictSuperAdminUser(currentUser: SafeAny): boolean {
  return Boolean(
    (isSuperAdminRole(currentUser?.role) && isCanonicalSuperAdminIdentity(currentUser)) ||
    isCanonicalSuperAdminIdentity(currentUser) ||
    Number(currentUser?.id) === 1
  );
}

/**
 * Compute gate approval and reporter acceptance permissions from a linked mission summary.
 */
export function resolveMissionPermissions(mission: MosChatMissionSummary | null | undefined): TaskMissionPermissions {
  const canApproveImplementation = Boolean(
    mission &&
    (mission.superAdminActions?.canApproveImplementation ||
      mission.status === 'NEW' ||
      (mission.status === 'APPROVED' && !mission.superAdminActions?.activeJobId))
  );

  const canSuperAdminApproveCommit = Boolean(
    mission &&
    (mission.canSuperAdminApproveCommit ||
      mission.superAdminActions?.canApproveCommit ||
      mission.status === 'AWAITING_DANNY_COMMIT_REVIEW' ||
      mission.superAdminActions?.executionPhase === 'AWAITING_COMMIT_REVIEW')
  );

  const canSuperAdminApproveDeploy = Boolean(
    mission &&
    (mission.canSuperAdminApproveDeploy ||
      mission.superAdminActions?.canApproveDeploy ||
      mission.status === 'AWAITING_DANNY_DEPLOY_APPROVAL' ||
      mission.superAdminActions?.executionPhase === 'AWAITING_DEPLOY_REVIEW')
  );

  const canReporterAccept = Boolean(
    mission &&
    (mission.canReporterAccept ||
      mission.reporterActions?.canAcceptOrReopen ||
      mission.status === 'FIXED' ||
      mission.status === 'AWAITING_REPORTER_ACCEPTANCE')
  );

  const canRequestUpgradeOrRework = Boolean(
    mission && (canReporterAccept || mission.stage === 'COMPLETED' || mission.status === 'CLOSED')
  );

  return {
    canApproveImplementation,
    canSuperAdminApproveCommit,
    canSuperAdminApproveDeploy,
    canReporterAccept,
    canRequestUpgradeOrRework,
  };
}

/**
 * Map a completed mission gate action to its user-facing toast message.
 */
export function getMissionActionToastNotice(
  action: MosChatMissionActionType,
  missionKey: string
): { level: 'success' | 'info'; message: string; resetsReopenForm: boolean } | null {
  switch (action) {
    case 'APPROVE_COMMIT':
      return {
        level: 'success',
        message: `✅ Đã duyệt Commit (Cổng 2) cho #${missionKey}!`,
        resetsReopenForm: false,
      };
    case 'APPROVE_DEPLOY':
      return {
        level: 'success',
        message: `🚀 Đã duyệt Deploy lên Web (Cổng 3) cho #${missionKey}!`,
        resetsReopenForm: false,
      };
    case 'APPROVE_IMPLEMENTATION':
      return {
        level: 'success',
        message: `🚀 Đã duyệt Cổng 1 mOS Mission #${missionKey}!`,
        resetsReopenForm: false,
      };
    case 'REPORTER_ACCEPT':
      return {
        level: 'success',
        message: `🎉 Đã nghiệm thu hoàn tất #${missionKey}!`,
        resetsReopenForm: false,
      };
    case 'REPORTER_REOPEN':
      return {
        level: 'info',
        message: `🔄 Đã gửi yêu cầu chỉnh sửa tiếp cho #${missionKey}!`,
        resetsReopenForm: true,
      };
    default:
      return null;
  }
}
