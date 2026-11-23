import { describe, it, expect } from 'vitest';
import { resolveMissionActionFlags } from '../shared/missions/mission-action-flags';
import type { MosChatMissionSummary } from '@mos-lab/shared';

const baseMission: MosChatMissionSummary = {
  reportId: 254,
  key: 'MOS-FEAT-254',
  missionKey: 'MOS-FEAT-254',
  missionCode: 'MSN-254',
  requestType: 'FEATURE',
  title: 'Sửa lỗi lưu ghi chú sau nối',
  status: 'FIXED',
  clarificationStatus: 'READY',
  stage: 'READY_FOR_REVIEW',
  stepIndex: 3,
  humanBadge: '🟢 Đã lên sóng · Mời kiểm tra',
  stageLabel: '🟢 Đã lên sóng · Mời kiểm tra',
  humanSummary: 'Đã cập nhật lên web.',
  humanStatusSummary: 'Đã cập nhật lên web.',
  canSuperAdminApproveCommit: false,
  canSuperAdminApproveDeploy: false,
  canReporterAccept: true,
  updatedAt: '2026-11-21T13:42:00.000Z',
  superAdminActions: {
    canApproveImplementation: false,
    canApproveCommit: false,
    canApproveDeploy: false,
    canConfirmClose: true,
    activeJobId: null,
    executionPhase: 'AWAITING_REPORTER_ACCEPTANCE',
    changedFilesCount: 1,
    diffStat: '1 file changed',
    agentSummary: null,
  },
  reporterActions: {
    canAcceptOrReopen: true,
  },
};

describe('resolveMissionActionFlags (MOS-BUG-260)', () => {
  it('allows reporter acceptance when mission is FIXED / READY_FOR_REVIEW', () => {
    const flags = resolveMissionActionFlags(baseMission);
    expect(flags.isTerminal).toBe(false);
    expect(flags.canReporterAccept).toBe(true);
    expect(flags.canRequestUpgradeOrRework).toBe(true);
  });

  it('never shows canReporterAccept when mission is CLOSED / COMPLETED even though reporterActions.canAcceptOrReopen is true', () => {
    const closedMission: MosChatMissionSummary = {
      ...baseMission,
      status: 'CLOSED',
      stage: 'COMPLETED',
      stepIndex: 4,
      humanBadge: '✅ Hoàn tất nhiệm vụ',
      stageLabel: '✅ Hoàn tất nhiệm vụ',
      canReporterAccept: false,
      superAdminActions: {
        ...baseMission.superAdminActions!,
        canConfirmClose: false,
      },
      reporterActions: {
        canAcceptOrReopen: true,
      },
    };

    const flags = resolveMissionActionFlags(closedMission);
    expect(flags.isTerminal).toBe(true);
    expect(flags.canReporterAccept).toBe(false);
    expect(flags.canRequestUpgradeOrRework).toBe(true);
  });

  it('blocks canReporterAccept defensively on terminal statuses even if canReporterAccept was stale', () => {
    const staleClosed = resolveMissionActionFlags({
      ...baseMission,
      status: 'CLOSED',
      stage: 'COMPLETED',
      canReporterAccept: true,
    });
    expect(staleClosed.canReporterAccept).toBe(false);

    const rejected = resolveMissionActionFlags({
      ...baseMission,
      status: 'REJECTED',
      stage: 'NOT_PROCEEDING',
      canReporterAccept: true,
    });
    expect(rejected.isTerminal).toBe(true);
    expect(rejected.canReporterAccept).toBe(false);
  });

  it('returns all false when mission is null or undefined', () => {
    expect(resolveMissionActionFlags(null)).toEqual({
      isTerminal: false,
      canApproveImplementation: false,
      canSuperAdminApproveCommit: false,
      canSuperAdminApproveDeploy: false,
      canReporterAccept: false,
      canRequestUpgradeOrRework: false,
    });
  });
});
