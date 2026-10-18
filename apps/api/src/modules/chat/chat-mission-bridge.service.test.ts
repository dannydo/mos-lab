import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildMissionSummaryFromReport, ChatMissionBridgeService } from './chat-mission-bridge.service.js';
import { deduplicateTasks } from './routes.js';

describe('ChatMissionBridgeService.buildMissionSummaryFromReport', () => {
  const baseReport = {
    id: 142,
    requestType: 'FEATURE',
    title: 'Bổ sung tệp khách hàng bảo lưu Combo Elsa',
    status: 'APPROVED',
    clarificationStatus: 'READY',
    clarificationSummary: 'Đã rõ yêu cầu từ luồng chat với Bảo Hân.',
    implementationApprovedAt: new Date('2026-10-17T10:00:00Z'),
    implementationActiveJobId: 'job-elsa-1',
    reporterStaffId: 13,
    reporter: { id: 13, displayName: 'Bảo Hân' },
    resolution: null,
    comments: [],
    updatedAt: new Date('2026-10-17T10:05:00Z'),
  };

  it('maps APPROVED report with active job to BUILDING stage in plain human language', () => {
    const summary = buildMissionSummaryFromReport(baseReport, {
      id: 'job-elsa-1',
      status: 'RUNNING',
      executionPhase: 'IMPLEMENTING',
      commitSha: null,
      changedFilesJson: JSON.stringify(['apps/web/components/mos-chat/MosGoogleChatPortal.tsx']),
      diffStat: '1 file changed, 24 insertions(+)',
      summary: null,
      progressLabel: 'Đang code',
      updatedAt: new Date('2026-10-17T10:06:00Z'),
    });

    assert.equal(summary.missionCode, 'MSN-142');
    assert.equal(summary.key, 'MOS-FEAT-142');
    assert.equal(summary.stage, 'BUILDING');
    assert.equal(summary.stepIndex, 2);
    assert.equal(summary.humanBadge.includes('Đang xây dựng tính năng'), true);
    assert.equal(summary.reporterName, 'Bảo Hân');
  });

  it('exposes Gate 2 (canApproveCommit) and Gate 3 (canApproveDeploy) inline actions for Super Admin', () => {
    const gate2Summary = buildMissionSummaryFromReport(baseReport, {
      id: 'job-elsa-1',
      status: 'AWAITING_COMMIT_REVIEW',
      executionPhase: 'AWAITING_COMMIT_REVIEW',
      commitSha: null,
      changedFilesJson: JSON.stringify(['a.ts', 'b.ts']),
      diffStat: '2 files changed',
      summary: 'Đã bổ sung tab Combo Elsa Bảo Lưu.',
      progressLabel: null,
      updatedAt: new Date('2026-10-17T10:15:00Z'),
    });

    assert.equal(gate2Summary.stage, 'AWAITING_RELEASE');
    assert.equal(gate2Summary.superAdminActions?.canApproveCommit, true);
    assert.equal(gate2Summary.superAdminActions?.canApproveDeploy, false);

    const gate3Summary = buildMissionSummaryFromReport(baseReport, {
      id: 'job-elsa-1',
      status: 'AWAITING_DEPLOY_REVIEW',
      executionPhase: 'AWAITING_DEPLOY_REVIEW',
      commitSha: 'abc1234',
      changedFilesJson: JSON.stringify(['a.ts', 'b.ts']),
      diffStat: '2 files changed',
      summary: 'Đã bổ sung tab Combo Elsa Bảo Lưu.',
      progressLabel: null,
      updatedAt: new Date('2026-10-17T10:20:00Z'),
    });

    assert.equal(gate3Summary.stage, 'AWAITING_RELEASE');
    assert.equal(gate3Summary.superAdminActions?.canApproveCommit, false);
    assert.equal(gate3Summary.superAdminActions?.canApproveDeploy, true);
  });

  it('maps FIXED and CLOSED reports to READY_FOR_REVIEW and COMPLETED stages', () => {
    const fixedSummary = buildMissionSummaryFromReport({
      ...baseReport,
      status: 'FIXED',
      resolution: {
        solutionSummary: 'Đã thêm bộ lọc khách hàng bảo lưu Combo Elsa vào danh sách.',
        verificationSummary: 'Đã kiểm thử tự động.',
        releaseUrl: 'https://lab.masteros.app/dashboard/customers',
      },
    });

    assert.equal(fixedSummary.stage, 'READY_FOR_REVIEW');
    assert.equal(fixedSummary.stepIndex, 3);
    assert.equal(fixedSummary.reporterActions?.canAcceptOrReopen, true);

    const closedSummary = buildMissionSummaryFromReport({
      ...baseReport,
      status: 'CLOSED',
      resolution: {
        solutionSummary: 'Đã thêm bộ lọc khách hàng bảo lưu Combo Elsa vào danh sách.',
        verificationSummary: 'Bảo Hân đã nghiệm thu.',
        releaseUrl: 'https://lab.masteros.app/dashboard/customers',
      },
    });

    assert.equal(closedSummary.stage, 'COMPLETED');
    assert.equal(closedSummary.stepIndex, 4);
    assert.equal(closedSummary.reporterActions?.canAcceptOrReopen, false);
  });

  it('rejects non-Danny users (staff or regular admin) when dispatching a mission from mOS Chat', async () => {
    await assert.rejects(
      () =>
        ChatMissionBridgeService.createMissionFromChat(
          {} as never,
          { id: 13, username: 'baohan', role: 'admin', displayName: 'Bảo Hân' },
          { conversationId: 'conv-1', messageId: 'msg-1' },
          [],
          [],
          [],
          '/tmp'
        ),
      (err: Error & { statusCode?: number }) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Chỉ Super Admin Danny/);
        return true;
      }
    );
  });

  it('deduplicates repeated tasks on the same sourceMessageId and merges mission metadata', () => {
    const tasks = [
      {
        id: 'task-87cc2a5c',
        conversationId: 'dm-13-1',
        conversationName: 'Bảo Hân',
        sourceMessageId: 'msg-9ad077de',
        sourceAuthorName: 'Danny Do',
        title: 'Khi đặt lịch cho CV, khung time matrix: Bổ sung nút lọc những khung giờ CV trống lịch',
        assigneeName: 'Danny Do',
        creatorName: 'Danny Do',
        priority: 'HIGH' as const,
        remindAt: '2026-10-18T15:39:10Z',
        done: false,
        fired: false,
        createdAt: '2026-10-18T01:39:10Z',
        missionId: 113,
        missionKey: 'MOS-FEAT-113',
      },
      {
        id: 'task-e0e0f83e',
        conversationId: 'dm-13-1',
        conversationName: 'Bảo Hân',
        sourceMessageId: 'msg-9ad077de',
        sourceAuthorName: 'Danny Do',
        title: 'Khi đặt lịch cho CV, khung time matrix: Bổ sung nút lọc những khung giờ CV trống lịch',
        assigneeName: 'Danny Do',
        creatorName: 'Danny Do',
        priority: 'HIGH' as const,
        remindAt: '2026-10-18T01:38:38Z',
        done: false,
        fired: true,
        createdAt: '2026-10-18T01:38:33Z',
      },
      {
        id: 'task-d6f551f3',
        conversationId: 'dm-13-1',
        conversationName: 'Bảo Hân',
        sourceMessageId: 'msg-9ad077de',
        sourceAuthorName: 'Danny Do',
        title: 'Khi đặt lịch cho CV, khung time matrix: Bổ sung nút lọc những khung giờ CV trống lịch',
        assigneeName: 'Hà My (CC)',
        creatorName: 'Danny Do',
        priority: 'HIGH' as const,
        remindAt: '2026-10-18T01:37:44Z',
        done: false,
        fired: true,
        createdAt: '2026-10-18T01:37:39Z',
      },
    ];

    const result = deduplicateTasks(tasks);
    assert.equal(result.changed, true);
    assert.equal(result.tasks.length, 1);
    assert.equal(result.tasks[0]?.id, 'task-87cc2a5c');
    assert.equal(result.tasks[0]?.missionId, 113);
    assert.equal(result.tasks[0]?.assigneeName, 'Danny Do');
  });
});
