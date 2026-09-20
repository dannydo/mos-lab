import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BugReportSummary } from '@mos-lab/shared';
import { BugReportWorkflowProgress } from './BugReportWorkflowProgress';

describe('BugReportWorkflowProgress', () => {
  it('renders standard workflow stage correctly without throwing', () => {
    const report: Pick<BugReportSummary, 'key' | 'status' | 'clarification' | 'agentProgress'> = {
      key: 'MOS-BUG-28',
      status: 'APPROVED',
      clarification: { status: 'READY', summary: null, clarifiedAt: null },
      agentProgress: {
        stage: 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL',
        note: null,
        updatedAt: '2026-09-20T12:00:00.000Z',
      },
    };

    render(<BugReportWorkflowProgress report={report} />);
    expect(screen.getByRole('img', { name: /MOS-BUG-28/ })).toBeInTheDocument();
    expect(screen.getByText('Chặng 2/5')).toBeInTheDocument();
    expect(screen.getByText('Plan sẵn sàng · chờ Danny duyệt code/test')).toBeInTheDocument();
  });

  it('safely handles missing or undefined workflow fields without crashing on reading tone', () => {
    const corruptedReport = {
      key: 'MOS-BUG-28',
      status: 'NEW',
      clarification: { status: 'READY', summary: null, clarifiedAt: null },
      agentProgress: null,
    } as unknown as Pick<BugReportSummary, 'key' | 'status' | 'clarification' | 'agentProgress'>;

    expect(() => {
      render(<BugReportWorkflowProgress report={corruptedReport} />);
    }).not.toThrow();

    expect(screen.getByRole('img', { name: /MOS-BUG-28: Chặng 1\/5, Đang xử lý/ })).toBeInTheDocument();
  });

  it('renders compact mode with position and label', () => {
    const report: Pick<BugReportSummary, 'key' | 'status' | 'clarification' | 'agentProgress'> = {
      key: 'MOS-FEAT-10',
      status: 'NEW',
      clarification: { status: 'PENDING_AGENT', summary: null, clarifiedAt: null },
      agentProgress: {
        stage: 'ANALYZING',
        note: null,
        updatedAt: '2026-09-20T12:00:00.000Z',
      },
    };

    render(<BugReportWorkflowProgress report={report} compact />);
    expect(screen.getByText(/Chặng 1\/5/)).toBeInTheDocument();
    expect(screen.getByText('Đang phân tích')).toBeInTheDocument();
  });

  it('renders stopped state properly when rejected or stopped', () => {
    const report: Pick<BugReportSummary, 'key' | 'status' | 'clarification' | 'agentProgress'> = {
      key: 'MOS-BUG-99',
      status: 'REJECTED',
      clarification: { status: 'READY', summary: null, clarifiedAt: null },
      agentProgress: {
        stage: 'STOPPED',
        note: 'Từ chối triển khai',
        updatedAt: '2026-09-20T12:00:00.000Z',
      },
    };

    render(<BugReportWorkflowProgress report={report} />);
    expect(screen.getByRole('img', { name: /Dừng/ })).toBeInTheDocument();
    expect(screen.getByText('Từ chối')).toBeInTheDocument();
  });
});
