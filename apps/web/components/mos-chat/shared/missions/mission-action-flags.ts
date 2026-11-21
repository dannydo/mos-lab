import type { MosChatMissionSummary } from '@mos-lab/shared';

export interface MosChatMissionActionFlags {
  isTerminal: boolean;
  canApproveImplementation: boolean;
  canSuperAdminApproveCommit: boolean;
  canSuperAdminApproveDeploy: boolean;
  canReporterAccept: boolean;
  canRequestUpgradeOrRework: boolean;
}

/**
 * Derive mission action flags consistently across mOS Chat UI components.
 * Note: `reporterActions.canAcceptOrReopen` stays `true` on CLOSED missions so reporters
 * can request post-completion upgrades/rework, so `canReporterAccept` must never rely on it.
 */
export function resolveMissionActionFlags(
  mission: MosChatMissionSummary | null | undefined
): MosChatMissionActionFlags {
  if (!mission) {
    return {
      isTerminal: false,
      canApproveImplementation: false,
      canSuperAdminApproveCommit: false,
      canSuperAdminApproveDeploy: false,
      canReporterAccept: false,
      canRequestUpgradeOrRework: false,
    };
  }

  const isTerminal =
    mission.stage === 'COMPLETED' ||
    mission.stage === 'NOT_PROCEEDING' ||
    mission.status === 'CLOSED' ||
    mission.status === 'REJECTED' ||
    mission.status === 'DUPLICATE';

  const canApproveImplementation = Boolean(
    mission.superAdminActions?.canApproveImplementation ||
      mission.status === 'NEW' ||
      (mission.status === 'APPROVED' && !mission.superAdminActions?.activeJobId)
  );

  const canSuperAdminApproveCommit = Boolean(
    mission.canSuperAdminApproveCommit ||
      mission.superAdminActions?.canApproveCommit ||
      mission.status === 'AWAITING_DANNY_COMMIT_REVIEW' ||
      mission.superAdminActions?.executionPhase === 'AWAITING_COMMIT_REVIEW'
  );

  const canSuperAdminApproveDeploy = Boolean(
    mission.canSuperAdminApproveDeploy ||
      mission.superAdminActions?.canApproveDeploy ||
      mission.status === 'AWAITING_DANNY_DEPLOY_APPROVAL' ||
      mission.superAdminActions?.executionPhase === 'AWAITING_DEPLOY_REVIEW'
  );

  const canReporterAccept = Boolean(
    !isTerminal &&
      (typeof mission.canReporterAccept === 'boolean'
        ? mission.canReporterAccept
        : mission.stage === 'READY_FOR_REVIEW' ||
          mission.status === 'FIXED' ||
          mission.status === 'AWAITING_REPORTER_ACCEPTANCE')
  );

  const canRequestUpgradeOrRework = Boolean(
    canReporterAccept ||
      mission.reporterActions?.canAcceptOrReopen ||
      mission.stage === 'COMPLETED' ||
      mission.status === 'CLOSED'
  );

  return {
    isTerminal,
    canApproveImplementation,
    canSuperAdminApproveCommit,
    canSuperAdminApproveDeploy,
    canReporterAccept,
    canRequestUpgradeOrRework,
  };
}
