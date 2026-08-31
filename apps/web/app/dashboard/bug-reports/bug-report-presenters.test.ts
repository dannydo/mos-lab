import { describe, expect, it } from 'vitest';
import type { BugReportSummary } from '@mos-lab/shared';
import { needsReporterAttention } from './bug-report-presenters';

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
