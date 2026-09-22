import { describe, expect, it } from 'vitest';
import type { BugReportSummary } from '@mos-lab/shared';
import {
  bugReportWorkerActivity,
  effectiveBugReportAgentProgress,
  formatDurationSeconds,
  getBugReportWorkflowStage,
  needsReporterAttention,
} from './bug-report-presenters';
import { resolveFeatureUrl } from '../../../components/bug-reports/MyBugReportsPanel';

const baseReport = {
  status: 'IN_PROGRESS',
  clarification: { status: 'READY', summary: null, clarifiedAt: null },
  agentProgress: { stage: 'IMPLEMENTING', note: null, updatedAt: '2026-08-31T00:00:00.000Z' },
} satisfies Pick<BugReportSummary, 'status' | 'clarification' | 'agentProgress'>;

describe('needsReporterAttention', () => {
  it('flags clarification requests and completed work awaiting the reporter', () => {
    expect(
      needsReporterAttention({
        ...baseReport,
        clarification: { ...baseReport.clarification, status: 'WAITING_REPORTER' },
      })
    ).toBe(true);
    expect(
      needsReporterAttention({
        ...baseReport,
        agentProgress: { ...baseReport.agentProgress, stage: 'AWAITING_REPORTER_REVIEW' },
      })
    ).toBe(true);
    expect(needsReporterAttention({ ...baseReport, status: 'FIXED' })).toBe(true);
  });

  it('does not flag tickets that are still being processed', () => {
    expect(needsReporterAttention(baseReport)).toBe(false);
  });
});

describe('bugReportWorkerActivity', () => {
  it('shows durable worker phase, elapsed time, and latest evidence without inventing progress percent', () => {
    const running = bugReportWorkerActivity({
      ...baseReport,
      implementation: {
        status: 'RUNNING',
        phase: 'CODEX_EVENT',
        progressLabel: 'Worker có bằng chứng mới.',
        lastProgressAt: '2026-08-31T00:04:00.000Z',
        progressCount: 2,
        checkpointCount: 0,
        failureCode: null,
        retrySequence: 0,
        canRetryImplementation: true,
        canAuthorizeWorkerRecoveryRetry: false,
        canAuthorizeSchemaRecoveryRetry: false,
        canAuthorizeQualityGateRecoveryRetry: false,
        canAuthorizeBuildLockRecoveryRetry: false,
        failure: null,
        hasRetainedDraft: false,
        startedAt: '2026-08-31T00:00:00.000Z',
        completedAt: null,
        updatedAt: '2026-08-31T00:04:00.000Z',
      },
    });
    expect(running).toMatchObject({
      headline: 'Worker Mac đang code/test',
      elapsed: expect.stringMatching(/^Đã chạy /),
      active: true,
    });
    expect(running.evidence).toMatch(/Cập nhật|Vừa cập nhật/);
  });

  it('makes review and safe-stop states explicit in the table', () => {
    const reviewImplementation = {
      status: 'AWAITING_COMMIT_REVIEW' as const,
      phase: 'AWAITING_COMMIT_REVIEW',
      progressLabel: null,
      lastProgressAt: '2026-08-31T00:04:00.000Z',
      progressCount: 2,
      checkpointCount: 0,
      failureCode: null,
      retrySequence: 0,
      canRetryImplementation: true,
      canAuthorizeWorkerRecoveryRetry: false,
      canAuthorizeSchemaRecoveryRetry: false,
      canAuthorizeQualityGateRecoveryRetry: false,
      canAuthorizeBuildLockRecoveryRetry: false,
      failure: null,
      hasRetainedDraft: true,
      startedAt: '2026-08-31T00:00:00.000Z',
      completedAt: '2026-08-31T00:04:00.000Z',
      updatedAt: '2026-08-31T00:04:00.000Z',
    };
    const review = bugReportWorkerActivity({
      ...baseReport,
      implementation: reviewImplementation,
    });
    expect(review).toMatchObject({ headline: 'Code/test xong · chờ duyệt commit', active: false });

    const deployApproved = bugReportWorkerActivity({
      ...baseReport,
      implementation: {
        ...reviewImplementation,
        status: 'AWAITING_DEPLOY_REVIEW',
        phase: 'DEPLOY_APPROVED',
      },
    });
    expect(deployApproved).toMatchObject({ headline: 'Đã duyệt deploy · Đang triển khai', active: true });

    const failed = bugReportWorkerActivity({
      ...baseReport,
      agentProgress: { ...baseReport.agentProgress, note: 'Quality gate chưa đạt.' },
      implementation: {
        ...reviewImplementation,
        status: 'FAILED',
        phase: 'FAILED',
        failureCode: 'QUALITY_GATE_FAILED',
        failure: {
          command: 'pnpm build:web',
          code: 'TYPESCRIPT_ERROR',
          summary: 'TypeScript không khớp kiểu dữ liệu đầu vào.',
          occurredAt: '2026-08-31T00:04:00.000Z',
        },
      },
    });
    expect(failed).toMatchObject({ headline: 'Worker dừng an toàn · cần retry', evidence: 'Quality gate chưa đạt.' });
  });
});

describe('getBugReportWorkflowStage', () => {
  it('condenses the API workflow into the current visual handoff, not an estimated percentage', () => {
    expect(
      getBugReportWorkflowStage({
        ...baseReport,
        status: 'NEW',
        agentProgress: { ...baseReport.agentProgress, stage: 'WAITING_REPORTER' },
        reporter: { displayName: 'Nguyễn Quang Khải' },
      })
    ).toMatchObject({ position: 1, label: 'Chờ Quang Khải làm rõ' });
    expect(
      getBugReportWorkflowStage({
        ...baseReport,
        status: 'NEW',
        agentProgress: { ...baseReport.agentProgress, stage: 'READY_FOR_TRIAGE' },
      })
    ).toMatchObject({ position: 2, label: 'Đủ rõ · chờ Danny duyệt' });
    expect(
      getBugReportWorkflowStage({
        ...baseReport,
        status: 'APPROVED',
        clarification: { status: 'READY', summary: 'Plan reopen đã sẵn sàng.', clarifiedAt: null },
        agentProgress: { ...baseReport.agentProgress, stage: 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL' },
      })
    ).toMatchObject({ position: 2, label: 'Plan sẵn sàng · chờ Danny duyệt code/test' });
    expect(getBugReportWorkflowStage(baseReport)).toMatchObject({ position: 3, label: 'Đang xử lý' });
    expect(
      getBugReportWorkflowStage({
        ...baseReport,
        status: 'FIXED',
        agentProgress: { ...baseReport.agentProgress, stage: 'AWAITING_REPORTER_REVIEW' },
        reporter: { displayName: 'Nguyễn Quang Khải' },
      })
    ).toMatchObject({ position: 4, label: 'Chờ Quang Khải nghiệm thu' });
    expect(
      getBugReportWorkflowStage({
        ...baseReport,
        status: 'FIXED',
        agentProgress: { ...baseReport.agentProgress, stage: 'AWAITING_REPORTER_ACCEPTANCE' },
      })
    ).toMatchObject({ position: 4, label: 'Chờ người báo nghiệm thu' });
    expect(
      getBugReportWorkflowStage({
        ...baseReport,
        status: 'CLOSED',
        agentProgress: { ...baseReport.agentProgress, stage: 'COMPLETED' },
      })
    ).toMatchObject({ position: 5, label: 'Hoàn tất' });
  });

  it('shows rejected and duplicate tickets as stopped instead of complete', () => {
    expect(getBugReportWorkflowStage({ ...baseReport, status: 'REJECTED' })).toMatchObject({
      position: null,
      label: 'Từ chối',
    });
    expect(
      getBugReportWorkflowStage({
        ...baseReport,
        status: 'REJECTED',
        triageNote: '[Tạm hoãn] Chưa có kế hoạch triển khai trong vài tháng tới',
      })
    ).toMatchObject({
      position: null,
      label: 'Tạm hoãn',
      tone: 'warning',
    });
    expect(getBugReportWorkflowStage({ ...baseReport, status: 'DUPLICATE' })).toMatchObject({
      position: null,
      label: 'Trùng lặp',
    });
  });

  it('renders the exact server workflow snapshot without a client-side transition', () => {
    const serverSnapshot = {
      ...baseReport,
      status: 'NEW' as const,
      clarification: { status: 'PENDING_AGENT' as const, summary: null, clarifiedAt: null },
      agentProgress: { ...baseReport.agentProgress, stage: 'REOPENED_BY_REPORTER' as const },
    };
    expect(effectiveBugReportAgentProgress(serverSnapshot)).toBe(serverSnapshot.agentProgress);
    expect(getBugReportWorkflowStage(serverSnapshot)).toMatchObject({
      position: 1,
      label: 'Agent tái phân tích reopen',
    });
  });

  it('keeps a reopened NEW ticket in Agent-owned re-analysis, never a later fix step', () => {
    expect(
      getBugReportWorkflowStage({
        ...baseReport,
        status: 'NEW',
        clarification: { status: 'PENDING_AGENT', summary: null, clarifiedAt: null },
        agentProgress: { ...baseReport.agentProgress, stage: 'REOPENED_BY_REPORTER' },
      })
    ).toMatchObject({ position: 1, label: 'Agent tái phân tích reopen' });
  });
});

describe('formatDurationSeconds', () => {
  it('formats seconds, minutes, hours, and days cleanly', () => {
    expect(formatDurationSeconds(0)).toBe('0s');
    expect(formatDurationSeconds(45)).toBe('45s');
    expect(formatDurationSeconds(60)).toBe('1m');
    expect(formatDurationSeconds(125)).toBe('2m 5s');
    expect(formatDurationSeconds(3600)).toBe('1h');
    expect(formatDurationSeconds(7320)).toBe('2h 2m');
    expect(formatDurationSeconds(86400)).toBe('1d');
    expect(formatDurationSeconds(90000)).toBe('1d 1h');
  });
});

describe('resolveFeatureUrl', () => {
  it('extracts feature route from title like Ticket 30 even when DB has bug-reports releaseUrl', () => {
    const result = resolveFeatureUrl({
      id: 30,
      key: 'MOS-FEAT-30',
      title:
        'Bỏ mục sidebar trái ‘Game BK’, giữ mục ‘Báo Cáo BK’. Giữ nguyên tab Game BK bên trong BK Leaderboard và URL /dashboard/bk?tab=game.',
      sourcePath: '/dashboard/bug-reports',
      resolution: {
        releaseUrl: 'https://lab.masteros.app/dashboard/bug-reports',
        changedFiles: ['apps/web/config/sidebar.config.tsx'],
      },
    });
    expect(result).toBe('/dashboard/bk?tab=game');
  });

  it('uses sourcePath when valid feature page and ignores bug-reports releaseUrl', () => {
    const result = resolveFeatureUrl({
      id: 34,
      key: 'MOS-BUG-34',
      title: 'em không đổi lịch đặt sẵn được ở trên này',
      sourcePath: '/dashboard/loca',
      resolution: {
        releaseUrl: 'https://lab.masteros.app/dashboard/bug-reports',
      },
    });
    expect(result).toBe('/dashboard/loca');
  });

  it('respects real feature releaseUrl when valid', () => {
    const result = resolveFeatureUrl({
      id: 8,
      key: 'MOS-BUG-8',
      title: 'Báo lỗi',
      sourcePath: '/dashboard/customers',
      resolution: {
        releaseUrl: 'https://lab.masteros.app/dashboard/customers?assignedStaffId=all',
      },
    });
    expect(result).toBe('https://lab.masteros.app/dashboard/customers?assignedStaffId=all');
  });

  it('infers route from changedFiles if available', () => {
    const result = resolveFeatureUrl({
      id: 26,
      key: 'MOS-FEAT-26',
      title: 'Hồ sơ nhân sự',
      sourcePath: '/dashboard/bug-reports',
      resolution: {
        releaseUrl: 'https://lab.masteros.app/dashboard/bug-reports',
        changedFiles: ['apps/web/app/dashboard/staff/page.tsx'],
      },
    });
    expect(result).toBe('/dashboard/staff');
  });

  it('returns null for pure backend fixes without UI route', () => {
    const result = resolveFeatureUrl({
      id: 24,
      key: 'MOS-FEAT-24',
      title: 'Tách luồng deploy theo phạm vi thay đổi',
      sourcePath: '/dashboard/bug-reports',
      resolution: {
        releaseUrl: 'https://lab.masteros.app/dashboard/bug-reports',
        changedFiles: ['packages/shared/src/types/deploy-lane.ts'],
      },
    });
    expect(result).toBeNull();
  });
});
