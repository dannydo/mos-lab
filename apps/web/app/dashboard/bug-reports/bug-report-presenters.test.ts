import { describe, expect, it } from 'vitest';
import type { BugReportSummary } from '@mos-lab/shared';
import {
  effectiveBugReportAgentProgress,
  getBugReportWorkflowStage,
  needsReporterAttention,
} from './bug-report-presenters';

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
    expect(getBugReportWorkflowStage({ ...baseReport, status: 'DUPLICATE' })).toMatchObject({
      position: null,
      label: 'Trùng lặp',
    });
  });

  it('never paints a NEW Agent-clarification ticket as implementation from stale progress', () => {
    const staleImplementation = {
      ...baseReport,
      status: 'NEW' as const,
      clarification: { status: 'PENDING_AGENT' as const, summary: null, clarifiedAt: null },
      agentProgress: { ...baseReport.agentProgress, stage: 'IMPLEMENTING' as const },
    };
    expect(effectiveBugReportAgentProgress(staleImplementation)).toMatchObject({ stage: 'ANALYZING' });
    expect(getBugReportWorkflowStage(staleImplementation)).toMatchObject({
      position: 1,
      label: 'Đang phân tích',
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
