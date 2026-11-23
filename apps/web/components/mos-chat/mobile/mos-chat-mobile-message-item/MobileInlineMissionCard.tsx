'use client';

import React, { useMemo, useState } from 'react';
import {
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
  type MosChatMissionActionType,
  type MosChatMissionSummary,
  type SafeAny,
} from '@mos-lab/shared';
import { resolveMissionActionFlags } from '../../shared/missions/mission-action-flags';
import { MosChatMobileMissionCard } from '../MosChatMobileMissionCard';

export interface MobileInlineMissionCardProps {
  mission: MosChatMissionSummary;
  isDark: boolean;
  currentUser?: SafeAny;
  executeMissionAction?: (
    mission: MosChatMissionSummary,
    action: MosChatMissionActionType,
    feedback?: string
  ) => Promise<SafeAny>;
}

export const MobileInlineMissionCard: React.FC<MobileInlineMissionCardProps> = ({
  mission,
  isDark,
  currentUser,
  executeMissionAction,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenFeedback, setReopenFeedback] = useState('');

  const isStrictDannySuperAdmin = useMemo(() => {
    const isCanon = isCanonicalSuperAdminIdentity({ username: currentUser?.username, email: currentUser?.email });
    const roleLower = String(currentUser?.role || '')
      .toLowerCase()
      .trim();
    return (roleLower === 'super_admin' && isCanon) || isCanon || Number(currentUser?.id) === 1;
  }, [currentUser?.id, currentUser?.username, currentUser?.email, currentUser?.role]);

  const flags = useMemo(() => resolveMissionActionFlags(mission), [mission]);
  const showSuperAdminControls =
    isStrictDannySuperAdmin &&
    (isSuperAdminRole(currentUser?.role) ||
      isCanonicalSuperAdminIdentity({ username: currentUser?.username, email: currentUser?.email }) ||
      Number(currentUser?.id) === 1);

  const handleExecuteMissionAction = async (action: MosChatMissionActionType, feedback?: string) => {
    if (!executeMissionAction || actionLoading) return;
    setActionLoading(action);
    try {
      await executeMissionAction(mission, action, feedback);
      if (action === 'REPORTER_REOPEN') {
        setIsReopenOpen(false);
        setReopenFeedback('');
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <MosChatMobileMissionCard
        mission={mission}
        isDark={isDark}
        isStrictDannySuperAdmin={showSuperAdminControls}
        canApproveImplementation={flags.canApproveImplementation}
        canSuperAdminApproveCommit={flags.canSuperAdminApproveCommit}
        canSuperAdminApproveDeploy={flags.canSuperAdminApproveDeploy}
        canReporterAccept={flags.canReporterAccept}
        canRequestUpgradeOrRework={flags.canRequestUpgradeOrRework}
        actionLoading={actionLoading}
        isReopenOpen={isReopenOpen}
        setIsReopenOpen={setIsReopenOpen}
        reopenFeedback={reopenFeedback}
        setReopenFeedback={setReopenFeedback}
        handleExecuteMissionAction={handleExecuteMissionAction}
      />
    </div>
  );
};
