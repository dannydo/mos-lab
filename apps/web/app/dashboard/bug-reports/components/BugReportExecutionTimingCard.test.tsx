import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { InboxTicketExecutionTiming } from '@mos-lab/shared';
import { BugReportExecutionTimingCard } from './BugReportExecutionTimingCard';

const mockTiming: InboxTicketExecutionTiming = {
  reportId: 23,
  reportKey: 'MOS-FEAT-23',
  requestType: 'FEATURE',
  title: 'Đo thời gian Agent thực hiện mỗi ticket Inbox',
  status: 'APPROVED',
  reportedAt: '2026-09-01T10:00:00.000Z',
  resolvedAt: null,
  totalAiActiveSeconds: 1200, // 20m
  totalUserDannyWaitSeconds: 7200, // 2h
  totalSystemWaitSeconds: 300, // 5m
  endToEndSeconds: 8700,
  hasIncompleteData: false,
  aiActiveByPhase: {
    CODE_TEST: 1200,
  },
  intervals: [
    {
      id: 'int-1',
      bucket: 'SYSTEM_WAIT',
      phase: 'SYSTEM_QUEUE',
      label: 'Hàng đợi hệ thống',
      startedAt: '2026-09-01T10:00:00.000Z',
      endedAt: '2026-09-01T10:05:00.000Z',
      durationSeconds: 300,
      outcome: 'COMPLETED',
      source: 'JOB',
      isEstimated: false,
      isOngoing: false,
    },
    {
      id: 'int-2',
      bucket: 'AI_ACTIVE',
      phase: 'CODE_TEST',
      label: 'Code & Test',
      startedAt: '2026-09-01T10:05:00.000Z',
      endedAt: '2026-09-01T10:25:00.000Z',
      durationSeconds: 1200,
      outcome: 'COMPLETED',
      source: 'JOB',
      isEstimated: false,
      isOngoing: false,
    },
  ],
};

describe('BugReportExecutionTimingCard', () => {
  it('renders nothing when timing is undefined or null', () => {
    const { container } = render(<BugReportExecutionTimingCard timing={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the 4 KPI summary cards with correct durations', () => {
    render(<BugReportExecutionTimingCard timing={mockTiming} />);

    expect(screen.getByText('Agent thực hiện')).toBeInTheDocument();
    expect(screen.getAllByText('20m').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Chờ con người')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();

    expect(screen.getAllByText('Hàng đợi hệ thống').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('5m').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Tổng End-to-End')).toBeInTheDocument();
    expect(screen.getByText('2h 25m')).toBeInTheDocument();
  });

  it('shows estimated tag when hasIncompleteData is true', () => {
    render(
      <BugReportExecutionTimingCard
        timing={{
          ...mockTiming,
          hasIncompleteData: true,
        }}
      />
    );

    expect(screen.getByText('Dữ liệu ước tính')).toBeInTheDocument();
  });

  it('renders individual intervals with phase labels', () => {
    render(<BugReportExecutionTimingCard timing={mockTiming} />);

    expect(screen.getByText('Code & Test')).toBeInTheDocument();
    expect(screen.getAllByText('Hàng đợi hệ thống').length).toBeGreaterThanOrEqual(2);
  });
});
