import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TelesaleTodayTvMonitorCard } from './TelesaleTodayTvMonitorCard';
import { TelesaleTvMonitorFullscreen } from './TelesaleTvMonitorFullscreen';
import { TelesaleTargetOverview } from '@mos-lab/shared';

const mockOverview: TelesaleTargetOverview = {
  month: '2026-10',
  updatedAt: '2026-10-06T12:00:00Z',
  teamMonth: {
    doneTarget: 468,
    doneActual: 120,
    comboLiveDoneActual: 15,
    bookTarget: 650,
    bookActual: 180,
    workDaysTotal: 26,
    workDaysElapsed: 6,
    workDaysRemaining: 20,
    periodStatus: 'IN_PROGRESS',
    pacingStatus: 'ON_TRACK',
    pacingStatusLabel: 'Đúng nhịp',
    expectedProgressRate: 0.23,
    expectedDone: 108,
    expectedBook: 150,
    gapDone: 12,
    gapBook: 30,
    remainingDone: 348,
    remainingBook: 470,
    dailyRequiredDone: 18,
    dailyRequiredBook: 24,
    pacingDaysElapsed: 6,
    pacingDaysTotal: 26,
    pacingRatio: 0.23,
    isPacingOnTrack: true,
  },
  teamDaily: {
    date: '2026-10-06',
    doneTarget: 18,
    doneActual: 14,
    comboLiveDoneActual: 2,
    bookTarget: 25,
    bookActual: 19,
  },
  staffTargets: [],
  dailyAction: {
    callTargetPerStaff: 40,
    bookTargetPerDay: 25,
    totalCallsToday: 120,
    totalBookingsToday: 19,
  },
  workSchedule: {
    morning: {
      timeRange: '08:00 - 12:00',
      title: 'Ca sáng',
      subTitle: 'Gọi khách hàng',
      isActive: true,
    },
    afternoon: {
      timeRange: '13:00 - 17:00',
      title: 'Ca chiều',
      subTitle: 'Chốt lịch',
      isActive: false,
    },
  },
  pipelineStages: [],
};

describe('TelesaleTodayTvMonitorCard', () => {
  it('renders TV Monitor header and high contrast metrics for Done and Book', () => {
    const handleOpenFullscreen = vi.fn();
    render(<TelesaleTodayTvMonitorCard overview={mockOverview} onOpenFullscreen={handleOpenFullscreen} />);

    expect(screen.getByText('TV MONITOR HÔM NAY')).toBeInTheDocument();
    expect(screen.getByText('DONE HÔM NAY')).toBeInTheDocument();
    expect(screen.getByText('BOOK HÔM NAY')).toBeInTheDocument();

    // Actual numbers
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('/ 18')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('/ 25')).toBeInTheDocument();

    // Open TV fullscreen button
    const openTvButton = screen.getByRole('button', { name: /Mở TV/i });
    expect(openTvButton).toBeInTheDocument();
    fireEvent.click(openTvButton);
    expect(handleOpenFullscreen).toHaveBeenCalledTimes(1);
  });
});

describe('TelesaleTvMonitorFullscreen', () => {
  it('renders full TV Monitor screen when open=true and triggers close on button click', () => {
    const handleClose = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <TelesaleTvMonitorFullscreen
        overview={mockOverview}
        open={true}
        onClose={handleClose}
        onRefresh={handleRefresh}
      />
    );

    expect(screen.getByText(/TELESALES TV MONITOR · WAR ROOM/i)).toBeInTheDocument();
    expect(screen.getByText(/DONE HÔM NAY/i)).toBeInTheDocument();
    expect(screen.getByText(/BOOK HÔM NAY · TẠO LỊCH/i)).toBeInTheDocument();

    // Close button
    const closeButton = screen.getByRole('button', { name: /Đóng TV/i });
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render anything when open=false', () => {
    const { container } = render(
      <TelesaleTvMonitorFullscreen overview={mockOverview} open={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
