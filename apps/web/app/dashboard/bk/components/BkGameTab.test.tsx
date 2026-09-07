import dayjs from 'dayjs';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BkGameTab from './BkGameTab';

const apiMocks = vi.hoisted(() => ({ getBookingLeaderboard: vi.fn() }));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    bk: {
      getBookingLeaderboard: apiMocks.getBookingLeaderboard,
    },
  },
}));

describe('BkGameTab', () => {
  beforeEach(() => {
    apiMocks.getBookingLeaderboard.mockResolvedValue({
      leaderboard: [],
      summary: {
        totalBookings: 0,
        doneBookings: 0,
        missedBookings: 0,
        conversionRate: 0,
        totalCalls: 0,
        totalPickups: 0,
      },
    });
  });

  it('renders the visible, accessible Game BK ranking selector on the direct route', async () => {
    render(<BkGameTab dateRange={[dayjs('2026-09-05'), dayjs('2026-09-05')]} comparisonMode="day" />);

    expect(screen.getByText('Game BK')).toBeInTheDocument();
    expect(screen.getByLabelText('Chỉ số xếp hạng Game BK')).toBeVisible();

    await waitFor(() =>
      expect(apiMocks.getBookingLeaderboard).toHaveBeenCalledWith({
        dateFrom: '2026-09-05',
        dateTo: '2026-09-05',
        storeId: 'ALL',
      })
    );
  });
});
