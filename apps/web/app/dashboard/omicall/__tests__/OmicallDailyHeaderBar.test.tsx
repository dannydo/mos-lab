import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';
import { OmicallDailyHeaderBar } from '../omicall-page-modules/OmicallDailyHeaderBar';

describe('OmicallDailyHeaderBar', () => {
  const baseProps = {
    isAdmin: true,
    canReviewQa: true,
    isMobile: false,
    dateMode: 'day' as const,
    selectedDate: dayjs(),
    dateRange: [dayjs().subtract(7, 'day'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs],
    summary: {
      totalCalls: 19,
      answeredCalls: 2,
      happyCallsApproved: 1,
      happyCallsPending: 0,
      complaintCalls: 1,
      aiDoneCalls: 2,
      staffSelfRatedCalls: 9,
      mismatchCalls: 3,
    },
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    onSearch: vi.fn(),
    branchFilter: 'ALL',
    onBranchFilterChange: vi.fn(),
    branches: [{ id: 1, name: 'CMT8' }],
    staffFilter: 'ALL',
    onStaffFilterChange: vi.fn(),
    staffList: [{ id: 4, displayName: 'Tâm Nguyễn' }],
    directionFilter: 'ALL',
    onDirectionFilterChange: vi.fn(),
    statusFilter: 'ALL',
    onStatusFilterChange: vi.fn(),
    happyFilter: 'ALL',
    onHappyFilterChange: vi.fn(),
    aiFilter: 'ALL',
    onAiFilterChange: vi.fn(),
    aiSatisfactionFilter: 'ALL',
    onAiSatisfactionFilterChange: vi.fn(),
    ratingSourceFilter: 'ANY',
    onRatingSourceFilterChange: vi.fn(),
    ratingLevelFilter: 'ALL',
    onRatingLevelFilterChange: vi.fn(),
    onlyWithRecording: false,
    onOnlyWithRecordingChange: vi.fn(),
    hasComplaintOnly: false,
    onHasComplaintOnlyChange: vi.fn(),
    activeChips: [],
    syncingLogs: false,
    onSync: vi.fn(),
    onReset: vi.fn(),
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

  it('renders minimalist Command Bar with Hero Happy Call pill, disables Next/Today on today, and fires quick filters', () => {
    render(<OmicallDailyHeaderBar {...baseProps} />);

    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('Happy Call')).toBeInTheDocument();
    expect(screen.getByText('(3!)')).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: 'Ngày trước' });
    const nextBtn = screen.getByRole('button', { name: 'Ngày sau' });
    const todayBtn = screen.getByRole('button', { name: /Hôm nay/ });

    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).toBeDisabled();
    expect(todayBtn).toBeDisabled();

    fireEvent.click(prevBtn);
    expect(baseProps.onPrevDay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Happy Call').closest('button')!);
    expect(baseProps.onQuickFilterHappyApproved).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('(3!)').closest('button')!);
    expect(baseProps.onQuickFilterMismatch).toHaveBeenCalledTimes(1);
  });

  it('enables Next Day & Today on earlier dates and renders removable active filter chips', () => {
    const onRemoveChip = vi.fn();
    render(
      <OmicallDailyHeaderBar
        {...baseProps}
        selectedDate={dayjs().subtract(1, 'day')}
        happyFilter="APPROVED"
        activeChips={[{ key: 'hc', label: 'HC: Đạt Happy Call', onRemove: onRemoveChip }]}
      />
    );

    expect(screen.getByRole('button', { name: 'Ngày sau' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Hôm nay/ })).not.toBeDisabled();

    const chip = screen.getByText('HC: Đạt Happy Call').closest('button')!;
    fireEvent.click(chip);
    expect(onRemoveChip).toHaveBeenCalledTimes(1);
  });
});
