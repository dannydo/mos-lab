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
  staffTargets: [
    {
      legacyStaffId: 50670,
      name: 'Bích Phượng',
      avatarUrl: 'https://avatar/phuong.jpg',
      doneTarget: 150,
      doneActual: 45,
      doneToday: 4,
      bookToday: 6,
      bookContributionPercent: 32,
      isTopBookToday: true,
      callTargetDaily: 83,
      callActualToday: 75,
      pickupActualToday: 24,
    },
    {
      legacyStaffId: 52648,
      name: 'Thuý Kiều',
      avatarUrl: null,
      doneTarget: 100,
      doneActual: 30,
      doneToday: 2,
      bookToday: 3,
      bookContributionPercent: 16,
      isTopBookToday: false,
      callTargetDaily: 83,
      callActualToday: 60,
      pickupActualToday: 18,
    },
  ],
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
  it('renders full TV Monitor screen with individual staff contribution section and sound settings (MOS-FEAT-83)', () => {
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
    expect(screen.getByText('DONE HÔM NAY')).toBeInTheDocument();
    expect(screen.getByText(/BOOK HÔM NAY · TẠO LỊCH/i)).toBeInTheDocument();

    // Individual Staff Contribution section
    expect(screen.getByText(/ĐÓNG GÓP CÁ NHÂN HÔM NAY · TELESALES EXECUTIVES/i)).toBeInTheDocument();
    expect(screen.getByText('Bích Phượng')).toBeInTheDocument();
    expect(screen.getByText('Thuý Kiều')).toBeInTheDocument();
    expect(screen.getByText('TOP BOOK')).toBeInTheDocument();
    expect(screen.getByText('32% Team')).toBeInTheDocument();
    expect(screen.getByText('16% Team')).toBeInTheDocument();

    // Sound settings button
    const soundButton = screen.getByTestId('tv-sound-settings-button');
    expect(soundButton).toBeInTheDocument();

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

