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

vi.mock('./BkAvatar', () => ({
  default: ({ name, src }: { name: string; src?: string | null }) => (
    <span data-testid="booker-avatar" data-src={src || ''}>
      {name}
    </span>
  ),
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

  it('shows each ranked Telesales avatar without changing the displayed ranking data', async () => {
    apiMocks.getBookingLeaderboard.mockResolvedValue({
      leaderboard: [
        {
          rank: 1,
          bookerId: 42,
          displayName: 'Ngọc Điệp',
          avatar: 'avatars/ngoc-diep.jpg',
          store: 'ALL',
          totalCreatedBookings: 8,
          doneBookings: 4,
          missedBookings: 0,
          conversionRate: 50,
          callCount: 12,
          pickupCount: 6,
          pickupRate: 50,
        },
      ],
      summary: {
        totalBookings: 8,
        doneBookings: 4,
        missedBookings: 0,
        conversionRate: 50,
        totalCalls: 12,
        totalPickups: 6,
      },
    });

    render(<BkGameTab dateRange={[dayjs('2026-09-05'), dayjs('2026-09-05')]} comparisonMode="day" />);

    expect(await screen.findByTestId('booker-avatar')).toHaveTextContent('Ngọc Điệp');
    expect(screen.getByTestId('booker-avatar')).toHaveAttribute('data-src', 'avatars/ngoc-diep.jpg');
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });
});
