import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';
import { OmicallDailyHeaderBar } from '../omicall-page-modules/OmicallDailyHeaderBar';

describe('OmicallDailyHeaderBar', () => {
  const baseProps = {
    dateMode: 'day' as const,
    selectedDate: dayjs(),
    dateRange: [dayjs().subtract(7, 'day'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs],
    summary: {
      totalCalls: 42,
      answeredCalls: 28,
      happyCallsApproved: 6,
      happyCallsPending: 2,
      complaintCalls: 1,
      aiDoneCalls: 25,
      staffSelfRatedCalls: 19,
      mismatchCalls: 3,
    },
    canReviewQa: true,
    onDateModeChange: vi.fn(),
    onSelectDate: vi.fn(),
    onPrevDay: vi.fn(),
    onNextDay: vi.fn(),
    onToday: vi.fn(),
    onDateRangeChange: vi.fn(),
    onQuickFilterAll: vi.fn(),
    onQuickFilterAnswered: vi.fn(),
    onQuickFilterHappyApproved: vi.fn(),
    onQuickFilterHappyPending: vi.fn(),
    onQuickFilterComplaints: vi.fn(),
    onQuickFilterMismatch: vi.fn(),
  };

  it('disables next-day and Hôm nay buttons when viewing today, and triggers day step + KPI clicks', () => {
    render(<OmicallDailyHeaderBar {...baseProps} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('(3 lệch ≥2★)')).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: 'Ngày trước' });
    const nextBtn = screen.getByRole('button', { name: 'Ngày sau' });
    const todayBtn = screen.getByRole('button', { name: 'Hôm nay' });

    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).toBeDisabled();
    expect(todayBtn).toBeDisabled();

    fireEvent.click(prevBtn);
    expect(baseProps.onPrevDay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Đạt Happy Call').closest('button')!);
    expect(baseProps.onQuickFilterHappyApproved).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Khiếu nại (AI)').closest('button')!);
    expect(baseProps.onQuickFilterComplaints).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('NV tự chấm / Lệch AI').closest('button')!);
    expect(baseProps.onQuickFilterMismatch).toHaveBeenCalledTimes(1);
  });

  it('enables next-day and Hôm nay buttons when viewing an earlier date', () => {
    render(<OmicallDailyHeaderBar {...baseProps} selectedDate={dayjs().subtract(2, 'day')} />);

    expect(screen.getByRole('button', { name: 'Ngày sau' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hôm nay' })).not.toBeDisabled();
  });
});
